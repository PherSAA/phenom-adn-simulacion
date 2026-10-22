const test = require('node:test');
const assert = require('node:assert/strict');
const { Simulation, STEP, CELL_COUNT, GROUP_COUNT, CELLS_PER_GROUP } = require('../engine.js');
const tickFor = (sim, seconds) => { for (let i = 0; i < Math.round(seconds / STEP); i++) sim.tick(); };
const clean = () => { const sim = new Simulation(); sim.autoTraffic = false; return sim; };
function conserved(sim) {
  const m = sim.metrics();
  assert.ok(Math.abs(m.totalEnergy - sim.initialEnergy) < 1e-7, 'energy is conserved including escrow');
  for (const c of [...sim.cells, sim.reserve]) {
    assert.ok(c.energy >= -1e-8 && c.energy <= (c.id === 'E' ? 400 : 100) + 1e-8, 'energy within capacity');
  }
  let queued = 0, running = 0;
  for (const job of sim.jobs.values()) for (const part of job.parts) {
    if (!part.done) part.cellId === null ? queued++ : running++;
  }
  assert.equal(m.queued, queued); assert.equal(m.running, running);
  assert.equal(m.created, m.completed + sim.jobs.size, 'no lost or duplicated tasks');
  assert.equal(sim.cells.length, CELL_COUNT, 'cells are never destroyed');
}

test('pause freezes time, packets, job progress and recovery', () => {
  const sim = clean(); sim.addTasks(20); sim.transfer(1, 2); tickFor(sim, 0.5); sim.fail(3);
  const before = JSON.stringify({ time: sim.time, jobs: [...sim.jobs], packets: sim.packets, cells: sim.cells });
  for (let i = 0; i < 1000; i++) sim.advance(0.1);
  assert.equal(JSON.stringify({ time: sim.time, jobs: [...sim.jobs], packets: sim.packets, cells: sim.cells }), before);
  sim.step(); assert.ok(Math.abs(sim.time - 0.6) < 1e-8); assert.equal(sim.paused, true);
});

test('fixed time produces equal state at 30, 60 and 120 frames per second', () => {
  const states = [30, 60, 120].map(fps => {
    const sim = new Simulation(11); sim.addTasks(100); sim.paused = false;
    for (let i = 0; i < fps * 12; i++) sim.advance(1 / fps);
    conserved(sim); return { metrics: sim.metrics(), events: sim.events };
  });
  assert.deepEqual(states[0], states[1]); assert.deepEqual(states[1], states[2]);
});

test('speed controls change simulated time without changing results at equal time', () => {
  const states = [0.25, 1, 2, 5, 20].map(speed => {
    const sim = new Simulation(42); sim.addTasks(100); sim.paused = false; sim.setSpeed(speed);
    for (let i = 0; i < 2400 / speed; i++) sim.advance(1 / 60);
    assert.equal(sim.time, 40); conserved(sim); return sim.metrics();
  });
  for (const state of states) assert.deepEqual(state, states[0]);
});

test('a delivered packet is removed and counted exactly once; failure events do not count', () => {
  const sim = clean(); sim.transfer(1, 2, 'data', 'Hola'); tickFor(sim, 1.2);
  assert.equal(sim.stats.transfers, 1); assert.equal(sim.packets.length, 0);
  tickFor(sim, 10); sim.fail(1); sim.recover(1);
  assert.equal(sim.stats.transfers, 1);
  assert.equal(sim.events.filter(e => e.type === 'transfer').length, 1);
});

test('permissions and channels block incompatible sends and release in-flight energy', () => {
  const sim = clean(); const energy = sim.cell(1).energy;
  assert.ok(sim.transfer(1, 2, 'energy', '', 10)); conserved(sim);
  sim.setKey(2, 'data', 1); assert.equal(sim.packets.length, 0); assert.equal(sim.cell(1).energy, energy);
  assert.equal(sim.transfer(1, 2, 'energy'), false);
  assert.equal(sim.transfer(1, 2, 'data'), true);
  sim.setKey(2, 'both', 2); assert.equal(sim.packets.length, 0);
  assert.equal(sim.transfer(1, 2, 'data'), false);
  sim.syncKeys(2); assert.equal(sim.transfer(1, 2, 'data'), true); conserved(sim);
});

test('energy refunds reserve room when a sender receives another packet', () => {
  const sim = clean(); sim.cell(1).energy = 90; sim.cell(2).energy = 5;
  sim.initialEnergy = sim.metrics().totalEnergy;
  sim.transfer(1, 2, 'energy', '', 60);
  sim.transfer('E', 1, 'energy', '', 100);
  assert.equal(sim.packets[1].amount, 10);
  sim.fail(2); conserved(sim); tickFor(sim, 1.3); conserved(sim);
  assert.equal(sim.cell(1).energy, 100);
});

test('E support conserves energy and respects selected key', () => {
  const sim = clean(); const initial = sim.cell(1).energy;
  assert.ok(sim.support(1)); assert.equal(sim.reserve.energy, 385); conserved(sim);
  tickFor(sim, 1.2); assert.equal(sim.cell(1).energy, initial + 15); conserved(sim);
  sim.setKey(1, 'closed', 1); assert.equal(sim.support(1), false);
});

for (const parts of [1, 2, 4]) test('Split Run recombines ' + parts + ' parts into the verified result', () => {
  const sim = clean(); sim.addTasks(100, { parts }); tickFor(sim, 60);
  assert.equal(sim.stats.completed, 100); assert.equal(sim.jobs.size, 0);
  assert.equal(sim.stats.partsCompleted, 100 * parts);
  assert.ok(sim.recentResults.every(r => r.verified && r.result === 338350)); conserved(sim);
});

test('failed work resumes from checkpoints without duplicate completion', () => {
  const sim = clean(); sim.addTasks(100); tickFor(sim, 0.6);
  const part = sim.cell(1).running[0]; assert.ok(part.checkpoint > 0);
  sim.setAutoRecovery(false); sim.failRandom(8); assert.equal(sim.metrics().activeCells, CELL_COUNT - 8);
  assert.ok(sim.stats.reassigned > 0); conserved(sim); tickFor(sim, 90);
  assert.equal(sim.stats.completed, 100); assert.equal(sim.stats.partsCompleted, 400); conserved(sim);
});

test('all failures preserve the queue, and manual recovery drains it', () => {
  const sim = clean(); sim.setAutoRecovery(false); sim.addTasks(25); tickFor(sim, 0.3);
  sim.failRandom(CELL_COUNT); const before = sim.metrics().queued; tickFor(sim, 8);
  assert.equal(sim.metrics().queued, before); assert.equal(sim.metrics().activeCells, 0); conserved(sim);
  sim.recoverAll(); tickFor(sim, 30); assert.equal(sim.stats.completed, 25); conserved(sim);
});

test('automatic recovery uses simulated seconds and disabling it cancels deadlines', () => {
  const sim = clean(); sim.fail(1); tickFor(sim, 5.9); assert.equal(sim.cell(1).alive, false);
  tickFor(sim, 0.1); assert.equal(sim.cell(1).alive, true); assert.equal(sim.metrics().meanRecovery, 6);
  sim.fail(1); sim.setAutoRecovery(false); tickFor(sim, 20); assert.equal(sim.cell(1).alive, false);
  sim.setAutoRecovery(true); tickFor(sim, 6); assert.equal(sim.cell(1).alive, true);
});

test('closing a busy key returns tasks to the queue and channel restrictions hold', () => {
  const sim = clean(); sim.setKey(1, 'both', 2); sim.addTasks(2, { channel: 2 }); tickFor(sim, 0.5);
  assert.ok(sim.cell(1).running.length > 0); sim.setKey(1, 'closed', 2); conserved(sim);
  tickFor(sim, 10); assert.equal(sim.stats.completed, 0);
  sim.setKey(2, 'both', 2); tickFor(sim, 15); assert.equal(sim.stats.completed, 2); conserved(sim);
});

test('urgent work takes the next free slot without cancelling active work', () => {
  const sim = clean(); sim.cells.slice(1).forEach(c => sim.setKey(c.id, 'closed', 1));
  sim.addTasks(5, { parts: 1 }); tickFor(sim, 0.3); const first = sim.cell(1).running[0].jobId;
  sim.addTasks(1, { parts: 1, urgent: true }); const urgent = sim.nextJob - 1;
  assert.equal(sim.cell(1).running[0].jobId, first);
  while (sim.stats.completed < 1) sim.tick(); sim.tick();
  assert.equal(sim.cell(1).running[0].jobId, urgent); conserved(sim);
});

test('capacity changes do not drop active work; task and event buffers stay bounded', () => {
  const sim = new Simulation(); sim.setCapacity(4); sim.addTasks(1000); tickFor(sim, 0.3);
  assert.equal(sim.metrics().running, CELL_COUNT * 4); sim.setCapacity(1); conserved(sim);
  tickFor(sim, 300); assert.equal(sim.stats.completed, 1000); conserved(sim);
  assert.ok(sim.events.length <= 100); assert.ok(sim.recentResults.length <= 20);
  assert.equal(sim.addTasks(10000), 10000); assert.equal(sim.addTasks(1), 0); conserved(sim);
});

test('report accurately labels synthetic data and can be parsed as JSON', () => {
  const sim = clean(); sim.addTasks(10); tickFor(sim, 20);
  const report = JSON.parse(JSON.stringify(sim.report()));
  assert.equal(report.mode, 'browser_simulation'); assert.equal(report.dataSource, 'synthetic_demo');
  assert.equal(report.metrics.completed, 10); assert.equal(report.cells.length, CELL_COUNT);
  assert.ok(report.recentResults.every(r => r.verified));
});


test('each original group gains one cell, preserving C1–C16 identities', () => {
  const sim = clean();
  assert.equal(sim.cells.length, 24);
  assert.equal(GROUP_COUNT, 8); assert.equal(CELLS_PER_GROUP, 3);
  for (let group = 1; group <= 8; group++) {
    const members = sim.cells.filter(c => c.group === group);
    assert.deepEqual(members.map(c => c.id), [group * 2 - 1, group * 2, 16 + group]);
    assert.deepEqual(members.map(c => c.slot), [0, 1, 2]);
    assert.ok(members.every(c => c.key.mode === 'both' && c.key.channel === 1));
  }
  conserved(sim);
});

test('the eight added cells process tasks, transfer and recover independently', () => {
  const sim = clean();
  for (let id = 1; id <= 16; id++) sim.setKey(id, 'closed', 1);
  sim.addTasks(8, { parts: 1 }); tickFor(sim, 0.1);
  assert.ok(sim.cells.slice(16).every(c => c.running.length === 1));
  assert.ok(sim.transfer(17, 24, 'data', 'Tercera célula activa'));
  tickFor(sim, 10);
  assert.equal(sim.stats.completed, 8); assert.equal(sim.stats.transfers, 1);
  sim.fail(24); assert.equal(sim.cell(24).alive, false);
  tickFor(sim, 6); assert.equal(sim.cell(24).alive, true); conserved(sim);
  assert.equal(sim.report().settings.cellsPerGroup, 3);
  assert.equal(sim.report().cells[23].group, 8);
});
