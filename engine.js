/* PHENOM · deterministic browser simulation. No network or physical claims. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Phenom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STEP = 1 / 60;
  const SPEEDS = [0.25, 1, 2, 5, 20];
  const MODES = ['both', 'data', 'energy', 'closed'];
  const MAX_TASKS = 10000;
  const allows = (cell, type) => cell.alive && (cell.key.mode === 'both' || cell.key.mode === type);
  class Queue {
    constructor() { this.items = []; this.head = 0; }
    get length() { return this.items.length - this.head; }
    push(value) { this.items.push(value); }
    take() {
      if (!this.length) return null;
      const value = this.items[this.head++];
      if (this.head > 1024 && this.head * 2 > this.items.length) {
        this.items = this.items.slice(this.head); this.head = 0;
      }
      return value;
    }
  }
  class Simulation {
    constructor(seed = 20261022) {
      this.seed = seed >>> 0; this.randomState = this.seed;
      this.ticks = 0; this.accumulator = 0; this.speed = 1; this.paused = true;
      this.autoTraffic = true; this.autoRecovery = true; this.recoveryDelay = 6;
      this.capacity = 1; this.nextJob = 1; this.nextPacket = 1; this.eventId = 0;
      this.cells = Array.from({ length: 16 }, (_, i) => ({
        id: i + 1, alive: true, energy: 40 + (i * 7 % 45),
        key: { mode: 'both', channel: 1 }, running: [], completed: 0,
        failedAt: null, recoverAt: null
      }));
      this.reserve = { id: 'E', alive: true, energy: 400, key: { mode: 'both', channel: 0 } };
      this.initialEnergy = this.cells.reduce((sum, c) => sum + c.energy, this.reserve.energy);
      this.jobs = new Map(); this.packets = []; this.events = []; this.recentResults = [];
      this.queues = Array.from({ length: 4 }, () => ({ urgent: new Queue(), normal: new Queue() }));
      this.recentCompletions = []; this.nextTrafficAt = 1;
      this.stats = { created: 0, completed: 0, partsCompleted: 0, reassigned: 0,
        transfers: 0, dataTransfers: 0, energyTransfers: 0, energyMoved: 0,
        blocked: 0, cancelled: 0, faults: 0, recoveries: 0,
        recoverySeconds: 0, taskLatencySeconds: 0 };
      this.log('ready', 'Laboratorio preparado. Datos y energía de demostración.');
    }
    get time() { return this.ticks * STEP; }
    random() {
      this.randomState = (Math.imul(1664525, this.randomState) + 1013904223) >>> 0;
      return this.randomState / 4294967296;
    }
    log(type, message) {
      this.events.unshift({ id: ++this.eventId, simulatedSeconds: this.time, type, message });
      if (this.events.length > 100) this.events.length = 100;
    }
    cell(id) { return id === 'E' ? this.reserve : this.cells.find(c => c.id === id); }
    setSpeed(value) {
      if (!SPEEDS.includes(value)) throw new RangeError('Velocidad no admitida');
      this.speed = value;
    }
    setCapacity(value) {
      if (![1, 2, 4].includes(value)) throw new RangeError('Capacidad no admitida');
      this.capacity = value;
      this.log('config', 'Capacidad: ' + value + ' fragmentos simultáneos por célula.');
    }
    setAutoRecovery(value) {
      this.autoRecovery = Boolean(value);
      this.cells.filter(c => !c.alive).forEach(c => {
        c.recoverAt = this.autoRecovery ? this.time + this.recoveryDelay : null;
      });
    }
    enqueue(part) {
      const job = this.jobs.get(part.jobId);
      part.cellId = null;
      this.queues[job.channel - 1][job.urgent ? 'urgent' : 'normal'].push(part);
    }
    addTasks(count, { parts = 4, urgent = false, channel = 1 } = {}) {
      if (!Number.isInteger(count) || count < 1 || count > MAX_TASKS || ![1, 2, 4].includes(parts)
          || !Number.isInteger(channel) || channel < 1 || channel > 4) throw new RangeError('Tarea inválida');
      if (this.jobs.size + count > MAX_TASKS) {
        this.log('limit', 'Límite de 10.000 tareas pendientes. Espera a que termine el lote.');
        return 0;
      }
      for (let i = 0; i < count; i++) {
        const job = { id: this.nextJob++, createdAt: this.time, channel, urgent: Boolean(urgent), parts: [], result: 0 };
        this.jobs.set(job.id, job);
        // Each task computes the same verifiable sum, split over disjoint ranges.
        const totalWork = 3 + this.random() * 2;
        for (let index = 0; index < parts; index++) {
          const part = { jobId: job.id, index, start: Math.floor(index * 100 / parts) + 1,
            end: Math.floor((index + 1) * 100 / parts), progress: 0, checkpoint: 0,
            work: totalWork / parts, done: false, cellId: null };
          job.parts.push(part); this.enqueue(part);
        }
      }
      this.stats.created += count;
      this.log('task', '+' + count.toLocaleString('es') + (urgent ? ' tareas urgentes' : ' tareas') + ' · ' + parts + ' fragmentos · canal ' + channel);
      return count;
    }
    releaseWork(cell) {
      for (const part of cell.running) {
        part.progress = part.checkpoint;
        this.enqueue(part); this.stats.reassigned++;
      }
      cell.running = [];
    }
    setKey(id, mode, channel) {
      const cell = this.cell(id);
      if (!cell || id === 'E' || !MODES.includes(mode) || !Number.isInteger(channel) || channel < 1 || channel > 4)
        throw new RangeError('Llave inválida');
      if (cell.key.mode === mode && cell.key.channel === channel) return;
      this.releaseWork(cell);
      cell.key = { mode, channel };
      this.revalidatePackets();
      this.log('key', 'Llave C' + id + ': ' + ({ both: 'datos + energía', data: 'datos', energy: 'energía', closed: 'cerrada' }[mode]) + ' · canal ' + channel);
    }
    syncKeys(id) {
      const source = this.cell(id);
      if (!source || id === 'E') return;
      const { mode, channel } = source.key;
      for (const cell of this.cells) this.setKey(cell.id, mode, channel);
      this.log('key', 'Llaves sincronizadas con C' + id + '.');
    }
    compatible(from, to, type) {
      return from && to && from.id !== to.id && allows(from, type) && allows(to, type)
        && (from.id === 'E' || to.id === 'E' || from.key.channel === to.key.channel);
    }
    incomingEnergy(id) { return this.packets.reduce((sum, p) => sum + (p.to === id && p.type === 'energy' ? p.amount : 0), 0); }
    outgoingEnergy(id) { return this.packets.reduce((sum, p) => sum + (p.from === id && p.type === 'energy' ? p.amount : 0), 0); }
    transfer(fromId, toId, type = 'data', payload = 'Mensaje de prueba', amount = 5) {
      if (!['data', 'energy'].includes(type)) throw new RangeError('Tipo de transferencia inválido');
      const from = this.cell(fromId), to = this.cell(toId);
      if (!this.compatible(from, to, type)) {
        this.stats.blocked++; this.log('blocked', 'Transferencia bloqueada: revisa las llaves, los canales y el estado de las células.');
        return false;
      }
      if (this.packets.length >= 128) { this.log('limit', 'Hay 128 transferencias en tránsito. Espera un momento.'); return false; }
      let units = 0;
      if (type === 'energy') {
        if (!Number.isFinite(amount) || amount <= 0) throw new RangeError('Energía inválida');
        // Reserve room for a possible refund of outgoing energy as well.
        units = Math.min(amount, from.energy, (to.id === 'E' ? 400 : 100) - to.energy - this.incomingEnergy(to.id) - this.outgoingEnergy(to.id));
        if (units < 0.001) { this.log('blocked', 'No hay energía disponible o el destino está lleno.'); return false; }
        from.energy -= units; // Held in transit until delivery or refund.
      }
      const packet = { id: this.nextPacket++, from: fromId, to: toId, type,
        payload: String(payload).slice(0, 160), amount: units, elapsed: 0, duration: 1.2,
        createdAt: this.time };
      this.packets.push(packet);
      return true;
    }
    cancelPacket(packet) {
      if (packet.type === 'energy') this.cell(packet.from).energy += packet.amount;
      this.stats.cancelled++;
      this.log('cancel', 'Envío #' + packet.id + ' cancelado por fallo o cambio de llave' + (packet.type === 'energy' ? '; energía devuelta al origen.' : '.'));
    }
    revalidatePackets() {
      this.packets = this.packets.filter(p => {
        if (this.compatible(this.cell(p.from), this.cell(p.to), p.type)) return true;
        this.cancelPacket(p); return false;
      });
    }
    fail(id) {
      const cell = this.cell(id);
      if (!cell || id === 'E' || !cell.alive) return false;
      cell.alive = false; cell.failedAt = this.time;
      cell.recoverAt = this.autoRecovery ? this.time + this.recoveryDelay : null;
      const rescued = cell.running.length;
      this.releaseWork(cell); this.revalidatePackets(); this.stats.faults++;
      this.log('fault', 'C' + id + ' falló · ' + rescued + ' fragmentos vuelven a la cola desde su último punto de guardado.');
      return true;
    }
    failRandom(count = 1) {
      if (!Number.isInteger(count) || count < 1 || count > 16) throw new RangeError('Cantidad de fallos inválida');
      const alive = this.cells.filter(c => c.alive);
      for (let i = 0; i < Math.min(count, alive.length); i++) {
        const index = i + Math.floor(this.random() * (alive.length - i));
        [alive[i], alive[index]] = [alive[index], alive[i]];
        this.fail(alive[i].id);
      }
    }
    recover(id) {
      const cell = this.cell(id);
      if (!cell || id === 'E' || cell.alive) return false;
      cell.alive = true; this.stats.recoveries++;
      this.stats.recoverySeconds += this.time - cell.failedAt;
      cell.failedAt = null; cell.recoverAt = null;
      this.log('recover', 'C' + id + ' recuperada; disponible con su misma llave.');
      return true;
    }
    recoverAll() { this.cells.forEach(c => this.recover(c.id)); }
    support(id) { return this.transfer('E', id, 'energy', 'Respaldo central E', 15); }
    advance(realSeconds) {
      if (this.paused || !Number.isFinite(realSeconds) || realSeconds <= 0) return;
      // Long background gaps are discarded; the UI also pauses on visibilitychange.
      this.accumulator += Math.min(realSeconds, 0.1) * this.speed;
      while (this.accumulator + 1e-10 >= STEP) { this.tick(); this.accumulator -= STEP; }
      if (this.accumulator < 0) this.accumulator = 0;
    }
    step() { if (this.paused) for (let i = 0; i < 6; i++) this.tick(); }
    tick() {
      this.ticks++;
      for (const cell of this.cells) {
        if (!cell.alive && cell.recoverAt !== null && this.time + 1e-9 >= cell.recoverAt) this.recover(cell.id);
        if (!allows(cell, 'data')) continue;
        const queue = this.queues[cell.key.channel - 1];
        while (cell.running.length < this.capacity) {
          const part = queue.urgent.take() || queue.normal.take();
          if (!part) break;
          part.cellId = cell.id; cell.running.push(part);
        }
        cell.running = cell.running.filter(part => {
          part.progress = Math.min(part.work, part.progress + STEP);
          part.checkpoint = Math.floor((part.progress + 1e-9) / 0.25) * 0.25;
          if (part.progress + 1e-9 < part.work) return true;
          part.done = true; part.cellId = null; cell.completed++; this.stats.partsCompleted++;
          const job = this.jobs.get(part.jobId);
          let sum = 0;
          for (let n = part.start; n <= part.end; n++) sum += n * n;
          job.result += sum;
          if (job.parts.every(p => p.done)) {
            this.stats.completed++; this.stats.taskLatencySeconds += this.time - job.createdAt;
            this.recentCompletions.push(this.time);
            const result = { id: job.id, result: job.result, verified: job.result === 338350, completedAt: this.time };
            this.recentResults.unshift(result); if (this.recentResults.length > 20) this.recentResults.length = 20;
            this.jobs.delete(job.id);
            if (this.stats.completed <= 10 || this.stats.completed % 100 === 0)
              this.log('complete', 'Tarea #' + job.id + ' reunida: ' + job.result + ' · ' + (result.verified ? 'verificada' : 'revisar resultado'));
          }
          return false;
        });
      }
      this.packets = this.packets.filter(p => {
        p.elapsed += STEP;
        if (p.elapsed + 1e-9 < p.duration) return true;
        this.stats.transfers++;
        if (p.type === 'energy') {
          this.cell(p.to).energy += p.amount; this.stats.energyTransfers++; this.stats.energyMoved += p.amount;
        } else this.stats.dataTransfers++;
        this.log('transfer', (p.from === 'E' ? 'E' : 'C' + p.from) + ' → C' + p.to + ' · ' +
          (p.type === 'energy' ? p.amount.toFixed(1) + ' u. de energía simulada' : p.payload));
        return false;
      });
      this.recentCompletions = this.recentCompletions.filter(t => t > this.time - 5);
      if (this.time + 1e-9 >= this.nextTrafficAt) {
        this.nextTrafficAt += 1;
        if (this.autoTraffic) this.generateTraffic();
      }
    }
    generateTraffic() {
      const candidates = this.cells.filter(c => allows(c, 'data'));
      if (candidates.length >= 2) {
        const from = candidates[Math.floor(this.random() * candidates.length)];
        const destinations = candidates.filter(c => c.id !== from.id && c.key.channel === from.key.channel);
        if (destinations.length) {
          const to = destinations[Math.floor(this.random() * destinations.length)];
          const samples = ['Demo · temperatura 24 °C', 'Demo · humedad 62 %', 'Demo · avance 75 %', 'Demo · material 12 m²'];
          this.transfer(from.id, to.id, 'data', samples[Math.floor(this.random() * samples.length)]);
        }
      }
      const energy = this.cells.filter(c => allows(c, 'energy')).sort((a, b) => b.energy - a.energy);
      for (const from of energy) {
        const to = [...energy].reverse().find(c => c.id !== from.id && c.key.channel === from.key.channel
          && from.energy - c.energy - this.incomingEnergy(c.id) > 8);
        if (to) { this.transfer(from.id, to.id, 'energy', 'Equilibrio simulado', 4); break; }
      }
    }
    metrics() {
      const queued = this.queues.reduce((sum, q) => sum + q.urgent.length + q.normal.length, 0);
      const running = this.cells.reduce((sum, c) => sum + c.running.length, 0);
      const inTransit = this.packets.reduce((sum, p) => sum + p.amount, 0);
      return { simulatedSeconds: this.time, activeCells: this.cells.filter(c => c.alive).length,
        queued, running, outstandingTasks: this.jobs.size, ...this.stats,
        rate: this.time > 0 ? this.recentCompletions.length / Math.min(5, this.time) : 0,
        meanRecovery: this.stats.recoveries ? this.stats.recoverySeconds / this.stats.recoveries : 0,
        meanLatency: this.stats.completed ? this.stats.taskLatencySeconds / this.stats.completed : 0,
        reserveEnergy: this.reserve.energy, energyInTransit: inTransit,
        totalEnergy: this.cells.reduce((sum, c) => sum + c.energy, this.reserve.energy + inTransit) };
    }
    report() {
      return { schemaVersion: 1, mode: 'browser_simulation', dataSource: 'synthetic_demo',
        exportedAt: new Date().toISOString(), seed: this.seed,
        settings: { speed: this.speed, capacity: this.capacity, autoTraffic: this.autoTraffic,
          autoRecovery: this.autoRecovery, recoverySeconds: this.recoveryDelay },
        metrics: this.metrics(), cells: this.cells.map(c => ({ id: c.id, alive: c.alive,
          energy: c.energy, key: { ...c.key }, runningParts: c.running.length, completedParts: c.completed })),
        recentResults: this.recentResults.map(r => ({ ...r })), events: this.events.map(e => ({ ...e })),
        note: 'Métricas de este modelo en JavaScript. Sin ADN biológico, pagos, energía física ni procesos distribuidos reales. El informe no es una copia restaurable de la sesión.' };
    }
  }
  return { Simulation, STEP, SPEEDS, MAX_TASKS };
});
