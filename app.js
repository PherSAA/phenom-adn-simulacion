/* UI for the Phenom simulation. All dynamics live in engine.js. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const number = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
  const decimal = value => value.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  let simulation = new Phenom.Simulation();
  let selected = 1, view = 'adn', lastEventId = -1, toastTimer, lastUi = 0;
  const canvas = $('view'), ctx = canvas.getContext('2d');
  const W = 720, H = 540, ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * ratio; canvas.height = H * ratio;
  if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  let positions = [];
  const colors = { accent: '#80e9c7', cyan: '#68c9ed', gold: '#f3c574', red: '#ff9c9c', muted: '#70899b' };
  const label = id => id === 'E' ? 'E' : 'C' + id;
  function announce(message) {
    clearTimeout(toastTimer);
    $('announcement').textContent = message;
    $('announcement').classList.add('visible');
    toastTimer = setTimeout(() => $('announcement').classList.remove('visible'), 4500);
  }
  function clock(seconds) {
    const minutes = Math.floor(seconds / 60);
    return String(minutes).padStart(2, '0') + ':' + (seconds % 60).toFixed(1).padStart(4, '0').replace('.', ',');
  }
  const cellButtons = simulation.cells.map(cell => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label(cell.id);
    button.addEventListener('click', () => selectCell(cell.id));
    $('cell-selector').appendChild(button);
    const option = document.createElement('option');
    option.value = cell.id; option.textContent = 'Célula ' + label(cell.id);
    $('destination').appendChild(option);
    return button;
  });
  function selectCell(id) {
    selected = id;
    const cell = simulation.cell(id);
    $('key-mode').value = cell.key.mode;
    $('key-channel').value = String(cell.key.channel);
    for (const option of $('destination').options) option.disabled = Number(option.value) === id;
    if (Number($('destination').value) === id) $('destination').value = String(id === 1 ? 2 : 1);
    update(); draw();
  }
  function update() {
    const m = simulation.metrics(), cell = simulation.cell(selected);
    $('active').textContent = m.activeCells;
    $('cell-total').textContent = simulation.cells.length;
    $('fail-half').textContent = 'Fallar hasta ' + Math.ceil(simulation.cells.length / 2);
    $('transfers').textContent = number.format(m.transfers);
    $('transfer-detail').textContent = number.format(m.dataTransfers) + ' datos · ' + number.format(m.energyTransfers) + ' energía';
    $('completed').textContent = number.format(m.completed);
    $('task-detail').textContent = number.format(m.queued) + ' fragmentos en cola';
    $('rate').textContent = decimal(m.rate);
    $('running').textContent = m.running;
    $('queued').textContent = number.format(m.queued);
    $('reassigned').textContent = number.format(m.reassigned);
    $('latency').textContent = decimal(m.meanLatency) + ' s';
    $('clock').textContent = clock(m.simulatedSeconds) + ' sim.';
    $('play').textContent = simulation.paused ? (simulation.time ? '▶ Reanudar' : '▶ Iniciar') : 'Ⅱ Pausar';
    $('status').textContent = simulation.paused ? 'En pausa' : 'En marcha · ' + String(simulation.speed).replace('.', ',') + '×';
    $('status').classList.toggle('running', !simulation.paused);
    $('step').disabled = !simulation.paused;
    $('traffic').checked = simulation.autoTraffic;
    $('auto-recovery').checked = simulation.autoRecovery;
    $('capacity').value = String(simulation.capacity);
    document.querySelectorAll('[data-speed]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === simulation.speed)));
    $('selected-name').textContent = label(selected);
    $('cell-state').textContent = !cell.alive ? 'En fallo' : cell.key.mode === 'closed' ? 'Llave cerrada' : cell.running.length ? 'Procesando' : 'Disponible';
    $('cell-state').classList.toggle('failed', !cell.alive);
    $('cell-energy').textContent = decimal(cell.energy) + ' / 100 u.';
    $('energy-bar').value = cell.energy;
    $('reserve').textContent = decimal(m.reserveEnergy) + ' u.';
    $('total-energy').textContent = decimal(m.totalEnergy) + ' u.';
    $('packet-count').textContent = simulation.packets.length + ' envíos en tránsito';
    $('fail-selected').textContent = (cell.alive ? 'Fallar ' : 'Recuperar ') + label(selected);
    $('fail-half').disabled = m.activeCells === 0;
    $('recover').disabled = m.activeCells === simulation.cells.length;
    $('support').disabled = !cell.alive || !['both', 'energy'].includes(cell.key.mode);
    cellButtons.forEach((button, index) => {
      const c = simulation.cells[index];
      button.setAttribute('aria-pressed', String(c.id === selected));
      button.dataset.state = !c.alive ? 'failed' : c.key.mode === 'closed' ? 'closed' : 'active';
      button.setAttribute('aria-label', 'Seleccionar célula ' + c.id + ', grupo ' + c.group + (!c.alive ? ', en fallo' : ', activa'));
    });
    const stalled = simulation.queues.some((queue, index) => (queue.normal.length + queue.urgent.length) > 0
      && !simulation.cells.some(c => c.alive && ['both', 'data'].includes(c.key.mode) && c.key.channel === index + 1));
    $('queue-note').hidden = !stalled;
    $('queue-note').textContent = 'Hay tareas esperando una célula activa que permita datos en su canal. Recupera células o ajusta sus llaves.';
    const latest = simulation.recentResults[0];
    $('result').textContent = latest ? 'Tarea #' + latest.id + ': ' + number.format(latest.result) + (latest.verified ? ' · resultado verificado' : ' · revisar resultado') : 'Añade tareas para probar el reparto.';
    if (lastEventId !== simulation.eventId) {
      lastEventId = simulation.eventId;
      const fragment = document.createDocumentFragment();
      simulation.events.slice(0, 20).forEach(event => {
        const li = document.createElement('li'); li.dataset.type = event.type;
        const time = document.createElement('time'); time.textContent = clock(event.simulatedSeconds);
        const dot = document.createElement('span'); dot.className = 'event-dot'; dot.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span'); text.textContent = event.message;
        li.append(time, dot, text); fragment.appendChild(li);
      });
      $('events').replaceChildren(fragment);
    }
  }
  function path(points, color, width = 1) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
  }
  function circle(x, y, radius, fill, stroke = null, width = 1) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  // The key stays fixed in orientation and is drawn inside every cell.
  function keyGlyph(x, y, scale, color, axes = false) {
    ctx.strokeStyle = color; ctx.lineWidth = axes ? 1.4 : 1.2;
    ctx.strokeRect(x - 1.5 * scale, y - 1.5 * scale, 3 * scale, 3 * scale);
    if (axes) {
      path([{ x: x - 3.6 * scale, y }, { x: x + 3.6 * scale, y }], '#284452');
      path([{ x, y: y - 3.6 * scale }, { x, y: y + 3.6 * scale }], '#284452');
    }
    path([{ x: x - 3 * scale, y }, { x, y: y - 3 * scale },
      { x: x + 1.5 * scale, y: y + 1.5 * scale }, { x: x - 3 * scale, y }], color, axes ? 1.8 : 1.3);
  }
  function getPositions() {
    const anchors = [[-3, 0], [0, 3], [1.5, -1.5], [3, 0], [3, 3], [0, -3], [-3, -3], [-3, 3]];
    return simulation.cells.map((cell, index) => {
      const group = cell.group - 1, side = [-1, 1, 0][cell.slot];
      const phase = cell.slot * Math.PI * 2 / Phenom.CELLS_PER_GROUP;
      const angle = simulation.time * 0.8 + group * 0.8 + phase;
      const center = view === 'adn'
        ? { x: 360 + side * (105 + Math.sin(simulation.time * 0.45 + group * 0.75) * 65), y: 87 + group * 55 }
        : { x: 360 + anchors[group][0] * 57, y: 290 - anchors[group][1] * 57 };
      const orbit = view === 'adn' ? 10 : 25;
      // A failed cell holds its own phase; the other cells keep orbiting.
      const a = !cell.alive ? cell.failedAt * 0.8 + group * 0.8 + phase : angle;
      return { id: cell.id, x: center.x + Math.cos(a) * orbit, y: center.y + Math.sin(a) * orbit, center, orbit };
    });
  }
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0a1721'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#294252';
    for (let x = 24; x < W; x += 28) for (let y = 22; y < H; y += 28) ctx.fillRect(x, y, 1, 1);
    positions = getPositions();
    const e = view === 'adn' ? { x: 610, y: 110 } : { x: 360, y: 290 };
    if (view === 'key') {
      keyGlyph(360, 290, 57, '#537e70', true);
      ctx.fillStyle = '#91b3bc'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('(0, 3)', 360, 71); ctx.fillText('(−3, 0)', 123, 285);
      ctx.fillText('(1,5; −1,5)', 464, 412);
    } else {
      for (let group = 1; group <= Phenom.GROUP_COUNT; group++) {
        const members = positions.filter(p => simulation.cell(p.id).group === group).sort((a, b) => a.x - b.x);
        path(members, '#2a414f');
      }
      for (let slot = 0; slot < Phenom.CELLS_PER_GROUP; slot++)
        path(positions.filter(p => simulation.cell(p.id).slot === slot), '#426d72', 1.8);
      ctx.fillStyle = '#90acb9'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('ESTRUCTURA ADN · VISTA CONCEPTUAL', 360, 519);
    }
    for (const packet of simulation.packets) {
      const from = packet.from === 'E' ? e : positions[packet.from - 1];
      const to = packet.to === 'E' ? e : positions[packet.to - 1];
      const fraction = Math.min(1, packet.elapsed / packet.duration);
      const color = packet.type === 'energy' ? colors.gold : colors.cyan;
      path([from, to], packet.type === 'energy' ? '#65553e' : '#2d5c70', 1);
      const x = from.x + (to.x - from.x) * fraction, y = from.y + (to.y - from.y) * fraction;
      circle(x, y, 8, color + '20'); circle(x, y, 3.6, color);
    }
    circle(e.x, e.y, 28, '#efc77410', '#5a5139');
    circle(e.x, e.y, 19, '#d7ac56', '#f4d89b');
    ctx.textAlign = 'center'; ctx.fillStyle = '#1b241e'; ctx.font = '700 17px system-ui'; ctx.fillText('E', e.x, e.y + 6);
    ctx.font = '10px system-ui'; ctx.fillStyle = colors.gold; ctx.fillText('RESERVA', e.x, e.y + 45);
    positions.forEach((p, index) => {
      const c = simulation.cells[index], isSelected = selected === c.id;
      const color = !c.alive ? colors.red : c.key.mode === 'closed' ? colors.muted : c.running.length ? colors.accent : colors.cyan;
      if (view === 'key') { circle(p.center.x, p.center.y, p.orbit, null, '#304553'); circle(p.center.x, p.center.y, 2, '#547c7d'); }
      if (isSelected) circle(p.x, p.y, 24, '#86e6c50a', colors.accent, 1.3);
      circle(p.x, p.y, 17, !c.alive ? '#442c37' : '#12313a', color, 1.5);
      keyGlyph(p.x, p.y, 3.1, color);
      if (c.running.length) {
        const progress = c.running.reduce((sum, part) => sum + part.progress / part.work, 0) / c.running.length;
        ctx.beginPath(); ctx.arc(p.x, p.y, 21, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
        ctx.strokeStyle = colors.accent; ctx.lineWidth = 3; ctx.stroke();
      }
      if (!c.alive) { path([{ x: p.x - 6, y: p.y - 6 }, { x: p.x + 6, y: p.y + 6 }], '#ffe1dc', 2); path([{ x: p.x + 6, y: p.y - 6 }, { x: p.x - 6, y: p.y + 6 }], '#ffe1dc', 2); }
      ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = isSelected ? '#d3ffed' : '#9fbdca';
      const top = view === 'key' && p.y < p.center.y;
      ctx.fillText(label(c.id), p.x, p.y + (top ? -29 : 37));
    });
  }
  $('play').addEventListener('click', () => { simulation.paused = !simulation.paused; update(); });
  $('step').addEventListener('click', () => { simulation.step(); update(); draw(); });
  document.querySelectorAll('[data-speed]').forEach(button => button.addEventListener('click', () => {
    simulation.setSpeed(Number(button.dataset.speed)); update();
  }));
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    view = button.dataset.view;
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('view-caption').textContent = view === 'adn'
      ? 'Cada célula lleva su llave y orbita su posición. Toca una célula para inspeccionarla.'
      : 'La llave fija define las posiciones; las células orbitan con desfase. E permanece en el centro.';
    draw();
  }));
  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * W, y = (event.clientY - rect.top) / rect.height * H;
    const nearest = positions.map(p => ({ id: p.id, distance: Math.hypot(p.x - x, p.y - y) })).sort((a, b) => a.distance - b.distance)[0];
    if (nearest && nearest.distance < 33) selectCell(nearest.id);
  });
  const setKey = () => {
    simulation.setKey(selected, $('key-mode').value, Number($('key-channel').value));
    update(); draw(); announce('Llave de ' + label(selected) + ' actualizada.');
  };
  $('key-mode').addEventListener('change', setKey); $('key-channel').addEventListener('change', setKey);
  $('sync').addEventListener('click', () => {
    simulation.syncKeys(selected); update(); draw(); announce('Todas las llaves usan los permisos y el canal de ' + label(selected) + '.');
  });
  $('support').addEventListener('click', () => {
    const sent = simulation.support(selected); update(); draw();
    announce(sent ? 'Energía enviada desde E. Avanza la simulación para entregarla.' : simulation.events[0].message);
  });
  $('send').addEventListener('click', () => {
    const payload = $('payload').value.trim();
    if (!payload) { announce('Escribe un mensaje antes de enviarlo.'); return; }
    const sent = simulation.transfer(selected, Number($('destination').value), 'data', payload);
    update(); draw(); announce(sent ? 'Mensaje en tránsito. Avanza la simulación para entregarlo.' : simulation.events[0].message);
  });
  function add(count, urgent = false) {
    const added = simulation.addTasks(count, { parts: Number($('parts').value), urgent, channel: simulation.cell(selected).key.channel });
    update(); draw();
    announce(added ? number.format(added) + ' tareas añadidas.' + (simulation.paused ? ' Pulsa Iniciar o Reanudar.' : '') : simulation.events[0].message);
  }
  $('add-small').addEventListener('click', () => add(100));
  $('add-large').addEventListener('click', () => add(1000));
  $('add-urgent').addEventListener('click', () => add(1, true));
  $('capacity').addEventListener('change', event => { simulation.setCapacity(Number(event.target.value)); update(); });
  $('traffic').addEventListener('change', event => { simulation.autoTraffic = event.target.checked; update(); });
  $('auto-recovery').addEventListener('change', event => { simulation.setAutoRecovery(event.target.checked); update(); });
  $('fail-selected').addEventListener('click', () => {
    if (simulation.cell(selected).alive) simulation.fail(selected); else simulation.recover(selected);
    update(); draw(); announce(simulation.events[0].message);
  });
  $('fail-half').addEventListener('click', () => {
    const count = Math.ceil(simulation.cells.length / 2);
    simulation.failRandom(count); update(); draw(); announce('Fallo aplicado a hasta ' + count + ' células activas. Los fragmentos quedan en cola para las disponibles.');
  });
  $('recover').addEventListener('click', () => { simulation.recoverAll(); update(); draw(); announce('Todas las células están recuperadas.'); });
  $('reset').addEventListener('click', () => $('reset-dialog').showModal());
  $('reset-dialog').addEventListener('close', () => {
    if ($('reset-dialog').returnValue !== 'reset') return;
    simulation = new Phenom.Simulation(); lastEventId = -1;
    $('parts').value = '4'; selectCell(1); update(); draw(); announce('Sesión reiniciada.');
  });
  $('export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(simulation.report(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'phenom-adn-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Informe JSON preparado con métricas, llaves y eventos.');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !simulation.paused) {
      simulation.paused = true; update(); announce('Simulación pausada al salir de la pestaña. Pulsa Reanudar para seguir.');
    }
  });
  let lastFrame = performance.now();
  function frame(now) {
    const dt = (now - lastFrame) / 1000; lastFrame = now;
    simulation.advance(dt);
    // Render movement at up to 60 fps; DOM metrics at 10 fps.
    draw();
    if (now - lastUi > 100) { update(); lastUi = now; }
    requestAnimationFrame(frame);
  }
  $('destination').value = '2'; selectCell(1); update(); draw();
  requestAnimationFrame(frame);
})();
