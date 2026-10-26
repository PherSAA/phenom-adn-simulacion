var SR = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../tmp/sr-src/entry.ts
  var entry_exports = {};
  __export(entry_exports, {
    PHASE_MS: () => PHASE_MS,
    SEQUENCE: () => SEQUENCE,
    STEPS: () => STEPS,
    SUCCESS_FIDELITY: () => SUCCESS_FIDELITY,
    assess: () => assess,
    createVisual: () => createVisual,
    destCohesion: () => destCohesion,
    draw: () => draw,
    formatFid: () => formatFid,
    formatRisk: () => formatRisk,
    glitchAmount: () => glitchAmount,
    isEntangled: () => isEntangled,
    logLine: () => logLine,
    originCohesion: () => originCohesion,
    packetT: () => packetT,
    phaseAnnouncement: () => phaseAnnouncement,
    reconstructionLabel: () => reconstructionLabel,
    stabilizerLabel: () => stabilizerLabel,
    stepIndex: () => stepIndex,
    syncLabel: () => syncLabel
  });

  // ../tmp/sr-src/model.ts
  var SEQUENCE = ["scan", "convert", "transmit", "propagate", "rematerialize"];
  var PHASE_MS = {
    scan: 2600,
    convert: 2400,
    transmit: 2100,
    propagate: 2600,
    rematerialize: 2800
  };
  var SUCCESS_FIDELITY = 97;
  var STEPS = [
    { id: "scan", n: "01", title: "Escaneo cu\xE1ntico y desmaterializaci\xF3n" },
    { id: "convert", n: "02", title: "Conversi\xF3n a datos cu\xE1nticos v\xEDa merkaba" },
    { id: "transmit", n: "03", title: "Transmisi\xF3n por rayo entrelazado" },
    { id: "propagate", n: "04", title: "Propagaci\xF3n en t\xFAnel Einstein-Rosen" },
    { id: "rematerialize", n: "05", title: "Rematerializaci\xF3n en portal destino" }
  ];
  function createVisual() {
    const rated = assess(4.2, 9.8);
    return {
      phase: "idle",
      mode: "idle",
      progress: 0,
      phaseStarted: 0,
      energy: 4.2,
      field: 9.8,
      fidelity: rated.fidelity,
      risk: rated.risk,
      frozen: false,
      frozenFidelity: rated.fidelity,
      frozenRisk: rated.risk,
      spin: 1,
      rate: 1,
      subject: "QX-01"
    };
  }
  function assess(energy, field) {
    const e = (energy - 4.2) / 2.6;
    const f = (field - 9.8) / 6.5;
    const stress = e * e + f * f;
    const risk = Math.min(42, 1e-3 + stress * 16);
    const fidelity = Math.max(58, 99.999 - (risk - 1e-3) * 1.15);
    return { fidelity, risk };
  }
  function formatFid(n) {
    return `${n >= 99 ? n.toFixed(3) : n.toFixed(2)}%`;
  }
  function formatRisk(n) {
    return `${n < 0.01 ? n.toFixed(3) : n.toFixed(2)}%`;
  }
  function stepIndex(phase) {
    return SEQUENCE.indexOf(phase);
  }
  function isEntangled(phase) {
    return phase === "transmit" || phase === "propagate" || phase === "rematerialize" || phase === "locked";
  }
  function originCohesion(phase, progress) {
    switch (phase) {
      case "idle":
        return 1;
      case "scan":
        return 1 - 0.22 * progress;
      case "convert":
        return 0.78 - 0.7 * progress;
      case "transmit":
        return Math.max(0.02, 0.08 * (1 - progress));
      default:
        return 0.03;
    }
  }
  function destCohesion(phase, progress, fidelity) {
    const cap = Math.min(1, Math.max(0.34, (fidelity - 55) / 45));
    switch (phase) {
      case "idle":
      case "scan":
      case "convert":
        return 0.4;
      case "transmit":
        return 0.4 + 0.12 * progress;
      case "propagate":
        return 0.52 + 0.2 * progress;
      case "rematerialize":
        return 0.72 + (cap - 0.72) * progress;
      case "locked":
        return cap;
      case "decohered":
        return Math.min(cap, 0.58);
      default:
        return 0.4;
    }
  }
  function packetT(phase, progress) {
    switch (phase) {
      case "transmit":
        return progress * 0.42;
      case "propagate":
        return 0.42 + progress * 0.36;
      case "rematerialize":
        return progress < 0.65 ? 0.78 + progress / 0.65 * 0.22 : -1;
      default:
        return -1;
    }
  }
  function glitchAmount(phase, fidelity) {
    if (phase === "decohered") return 1;
    if (phase === "rematerialize" && fidelity < SUCCESS_FIDELITY) return (SUCCESS_FIDELITY - fidelity) / 40;
    return 0;
  }
  function syncLabel(phase) {
    switch (phase) {
      case "transmit":
      case "propagate":
        return "Enlazando";
      case "rematerialize":
        return "Abierta";
      case "locked":
        return "Activa";
      case "decohered":
        return "Perdida";
      default:
        return "Bloqueada";
    }
  }
  function stabilizerLabel(risk) {
    if (risk < 0.8) return "Activo";
    if (risk < 8) return "Marginal";
    return "Inestable";
  }
  function reconstructionLabel(phase) {
    if (phase === "rematerialize" || phase === "locked") return "Activo";
    if (phase === "decohered") return "Colapsado";
    if (phase === "propagate" || phase === "transmit") return "Armando";
    return "En espera";
  }
  function logLine(phase, subject, fidelity) {
    switch (phase) {
      case "idle":
        return "CANAL EN ESPERA \xB7 PORTALES EN REPOSO";
      case "scan":
        return `ESC\xC1NER \xB7 SUJETO ${subject} \xB7 DESMATERIALIZACI\xD3N`;
      case "convert":
        return "MERKABA \xB7 MATERIA \u2192 DATOS CU\xC1NTICOS";
      case "transmit":
        return "RAYO ENTRELAZADO \xB7 CANAL FOT\xD3NICO ABIERTO";
      case "propagate":
        return "T\xDANEL EINSTEIN-ROSEN \xB7 PROPAGACI\xD3N NO-LOCAL";
      case "rematerialize":
        return "CAMPO DE RECONSTRUCCI\xD3N \xB7 REMATERIALIZANDO";
      case "locked":
        return `TRANSFERENCIA COMPLETA \xB7 FIDELIDAD ${formatFid(fidelity)}`;
      case "decohered":
        return `DECOHERENCIA \xB7 RECONSTRUCCI\xD3N INCOMPLETA \xB7 ${formatFid(fidelity)}`;
    }
  }
  function phaseAnnouncement(phase) {
    switch (phase) {
      case "idle":
        return "Sistema en espera. Portales alineados.";
      case "scan":
        return "Paso 1. Escaneo cu\xE1ntico y desmaterializaci\xF3n.";
      case "convert":
        return "Paso 2. Conversi\xF3n a datos cu\xE1nticos v\xEDa merkaba.";
      case "transmit":
        return "Paso 3. Transmisi\xF3n por rayo entrelazado.";
      case "propagate":
        return "Paso 4. Propagaci\xF3n en el t\xFAnel Einstein-Rosen.";
      case "rematerialize":
        return "Paso 5. Rematerializaci\xF3n en el portal destino.";
      case "locked":
        return "Transferencia completa. Sincronizaci\xF3n activa.";
      case "decohered":
        return "Decoherencia. Reconstrucci\xF3n incompleta.";
    }
  }

  // ../tmp/sr-src/schematic.tsx
  var NAVY = "#061018";
  var CYAN = "#7fd4ea";
  var CYAN_DIM = "#3d7d93";
  var GOLD = "#e0b15a";
  var INK = "#d7e8ef";
  var JOINTS = {
    head: [0.5, 0.02],
    neck: [0.5, 0.16],
    ls: [0.28, 0.2],
    rs: [0.72, 0.2],
    le: [0.18, 0.38],
    re: [0.82, 0.38],
    lh: [0.14, 0.52],
    rh: [0.86, 0.52],
    chest: [0.5, 0.32],
    hip: [0.5, 0.5],
    lk: [0.38, 0.72],
    rk: [0.62, 0.72],
    lf: [0.34, 0.98],
    rf: [0.66, 0.98]
  };
  var BONES = [
    ["neck", "ls"],
    ["neck", "rs"],
    ["ls", "le"],
    ["le", "lh"],
    ["rs", "re"],
    ["re", "rh"],
    ["neck", "chest"],
    ["chest", "hip"],
    ["hip", "lk"],
    ["lk", "lf"],
    ["hip", "rk"],
    ["rk", "rf"],
    ["ls", "rs"]
  ];
  function hash(i) {
    const n = Math.sin(i * 127.1 + 3.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function layoutOf(w, h) {
    const pad = 10;
    if (w < 760) {
      const gap2 = 6;
      const block = (h - pad * 2 - gap2 * 2) / 3;
      return {
        mode: "stack",
        origin: { x: pad, y: pad, w: w - pad * 2, h: block },
        tunnel: { x: pad, y: pad + block + gap2, w: w - pad * 2, h: block },
        dest: { x: pad, y: pad + (block + gap2) * 2, w: w - pad * 2, h: block }
      };
    }
    const gap = 12;
    const inner = w - pad * 2 - gap * 2;
    const side = inner * 0.3;
    const mid = inner - side * 2;
    return {
      mode: "row",
      origin: { x: pad, y: pad, w: side, h: h - pad * 2 },
      tunnel: { x: pad + side + gap, y: pad, w: mid, h: h - pad * 2 },
      dest: { x: pad + side + gap + mid + gap, y: pad, w: side, h: h - pad * 2 }
    };
  }
  function brackets(ctx, box, color) {
    const s = Math.min(14, box.w * 0.08, box.h * 0.08);
    const { x, y, w, h } = box;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(x, y + s);
    ctx.lineTo(x, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x + w - s, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + s);
    ctx.moveTo(x, y + h - s);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + s, y + h);
    ctx.moveTo(x + w - s, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - s);
    ctx.stroke();
  }
  function text(ctx, value, x, y, color, font, align = "center") {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(value, x, y);
  }
  function tri(ctx, r, rotation) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = rotation + i * Math.PI * 2 / 3 - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  function drawMerkaba(ctx, x, y, r, time, spin) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.95;
    const rot = spin ? time * 6e-4 : 0.4;
    tri(ctx, r, rot);
    tri(ctx, r * 0.92, -rot * 1.35 + Math.PI);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function drawRings(ctx, x, y, rx, ry, time, spin) {
    const speed = spin ? time * 0.02 : 8;
    const rings = [
      [0.42, speed, CYAN],
      [-0.42, -speed, GOLD]
    ];
    for (const [tilt, dash, color] of rings) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.setLineDash([9, 7]);
      ctx.lineDashOffset = dash;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.15;
      ctx.stroke();
      ctx.setLineDash([]);
      const ang = spin ? time * 12e-4 * Math.sign(dash || 1) : tilt;
      const ax = Math.cos(ang) * rx;
      const ay = Math.sin(ang) * ry * 0.35;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 5, ay - 3);
      ctx.lineTo(ax - 4, ay + 3);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
  }
  function figureFrame(box) {
    const top = box.y + Math.min(34, box.h * 0.16);
    const bottom = box.y + box.h - Math.min(20, box.h * 0.1);
    const avail = Math.max(20, bottom - top);
    const figH = avail * 0.86;
    const figW = Math.min(box.w * 0.42, figH * 0.46);
    const cx = box.x + box.w / 2;
    const fy = top + (avail - figH) * 0.72;
    return { cx, fy, figW, figH, top };
  }
  function drawFigure(ctx, box, cohesion, style, glitch, time, spin, scan) {
    const color = style === "origin" ? GOLD : CYAN;
    const frame = figureFrame(box);
    const scatter = cohesion < 0.46;
    const at = (nx, ny, seed) => {
      let x = frame.cx + (nx - 0.5) * frame.figW * 2.15;
      let y = frame.fy + ny * frame.figH;
      if (scatter) {
        const amp = (0.46 - cohesion) * frame.figW * 1.6;
        const ang = seed * Math.PI * 2;
        x += Math.cos(ang) * amp;
        y += Math.sin(ang) * amp * 0.55;
      }
      if (style === "dest" && glitch > 0) {
        x += (hash(Math.floor(y / 8) + 2) - 0.5) * 20 * glitch;
      }
      return { x, y };
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x + 4, box.y + 24, box.w - 8, box.h - 42);
    ctx.clip();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.15, frame.figW * 0.045);
    ctx.globalAlpha = Math.max(0.16, Math.min(1, 0.12 + cohesion * 0.92));
    for (let i = 0; i < BONES.length; i++) {
      const [a, b] = BONES[i];
      const pa = at(JOINTS[a][0], JOINTS[a][1], hash(i + 2));
      const pb = at(JOINTS[b][0], JOINTS[b][1], hash(i + 19));
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    const head = at(JOINTS.head[0], JOINTS.head[1], hash(3));
    const neck = at(JOINTS.neck[0], JOINTS.neck[1], hash(4));
    const headR = Math.max(5, frame.figW * 0.2);
    ctx.beginPath();
    ctx.arc(head.x, head.y + headR * 0.35, headR, 0, Math.PI * 2);
    ctx.stroke();
    const names = Object.keys(JOINTS);
    for (let i = 0; i < names.length; i++) {
      const p = at(JOINTS[names[i]][0], JOINTS[names[i]][1], hash(i + 8));
      ctx.beginPath();
      ctx.arc(p.x, p.y, scatter ? 2.2 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (style === "origin" && cohesion < 0.5) {
      ctx.globalAlpha = (0.5 - cohesion) * 1.4;
      for (let i = 0; i < 8; i++) {
        const seed = hash(80 + i);
        const x = frame.cx + (seed - 0.5) * frame.figW * 1.1;
        const y = frame.fy + frame.figH * (0.62 + hash(90 + i) * 0.2) + (0.5 - cohesion) * frame.figH * 0.45 * seed;
        const s = 3 + hash(100 + i) * 3;
        ctx.strokeRect(x, y, s, s);
      }
    }
    const merkR = Math.max(9, Math.min(frame.figW * 0.32, 20));
    drawMerkaba(ctx, head.x, head.y - merkR * 0.55, merkR, time + (style === "dest" ? 500 : 0), spin);
    drawRings(
      ctx,
      neck.x,
      frame.fy + frame.figH * 0.46,
      Math.min(frame.figW * 1.05, (box.w - 28) / 2),
      frame.figH * 0.3,
      time,
      spin
    );
    if (scan !== null) {
      const y = frame.fy + frame.figH * scan;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(box.x + 14, y);
      ctx.lineTo(box.x + box.w - 14, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function chrome(ctx, box, title, foot) {
    ctx.save();
    ctx.fillStyle = NAVY;
    ctx.globalAlpha = 1;
    ctx.fillRect(box.x + 1, box.y + 1, box.w - 2, 22);
    ctx.fillRect(box.x + 1, box.y + box.h - 18, box.w - 2, 17);
    ctx.globalAlpha = 1;
    const size = Math.max(10, Math.min(13, box.w / 24));
    text(ctx, title, box.x + box.w / 2, box.y + 12, GOLD, `600 ${size}px Barlow Condensed, sans-serif`);
    text(ctx, foot, box.x + box.w / 2, box.y + box.h - 8, CYAN, `400 ${Math.max(8, size - 2)}px Share Tech Mono, monospace`);
    ctx.restore();
  }
  function drawWormhole(ctx, box, time, active) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h * 0.56;
    const hw = box.w * 0.44;
    const hh = Math.min(box.h * 0.28, box.w * 0.18);
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x + 2, box.y + 24, box.w - 4, Math.max(20, box.h - 46));
    ctx.clip();
    ctx.lineWidth = 1;
    ctx.strokeStyle = CYAN;
    ctx.globalAlpha = 0.28 + active * 0.4;
    const cols = 16;
    const rows = 10;
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      for (let j = 0; j <= rows; j++) {
        const u = i / cols;
        const v = j / rows;
        const pinch = Math.sin(u * Math.PI);
        const radius = hh * (1 - pinch * 0.64);
        const x = cx + (u - 0.5) * 2 * hw;
        const y = cy + (v - 0.5) * 2 * radius;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      ctx.beginPath();
      for (let i = 0; i <= cols; i++) {
        const u = i / cols;
        const v = j / rows;
        const pinch = Math.sin(u * Math.PI);
        const radius = hh * (1 - pinch * 0.64);
        const x = cx + (u - 0.5) * 2 * hw;
        const y = cy + (v - 0.5) * 2 * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, hh);
    glow.addColorStop(0, `rgba(127, 212, 234, ${0.16 + active * 0.38})`);
    glow.addColorStop(1, "rgba(127, 212, 234, 0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(8, hw * 0.16), hh * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx - hw * 0.92, cy, Math.max(3, hw * 0.05), hh * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + hw * 0.92, cy, Math.max(3, hw * 0.05), hh * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    const qubits = [0.36, 0.64];
    const qpos = qubits.map((u) => {
      const bob = Math.sin(time * 16e-4 + u * 8) * (2 + active * 2);
      return { x: cx + (u - 0.5) * hw * 1.15, y: cy + bob };
    });
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = 0.45 + active * 0.5;
    ctx.beginPath();
    ctx.moveTo(qpos[0].x, qpos[0].y);
    const wave = Math.sin(time * 3e-3) * 8;
    ctx.quadraticCurveTo((qpos[0].x + qpos[1].x) / 2, cy - wave, qpos[1].x, qpos[1].y);
    ctx.stroke();
    for (const q of qpos) {
      ctx.fillStyle = INK;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 5.5 + active, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }
  function anchor(box, yBias) {
    const frame = figureFrame(box);
    return { x: frame.cx, y: frame.fy + frame.figH * yBias };
  }
  function tunnelPoint(box) {
    return { x: box.x + box.w / 2, y: box.y + box.h * 0.56 };
  }
  function pointOnPath(layout, t) {
    const a = anchor(layout.origin, 0.4);
    const b = tunnelPoint(layout.tunnel);
    const c = anchor(layout.dest, 0.4);
    const clamped = Math.max(0, Math.min(1, t));
    if (clamped < 0.5) {
      const u2 = clamped / 0.5;
      return { x: a.x + (b.x - a.x) * u2, y: a.y + (b.y - a.y) * u2 };
    }
    const u = (clamped - 0.5) / 0.5;
    return { x: b.x + (c.x - b.x) * u, y: b.y + (c.y - b.y) * u };
  }
  function drawConduit(ctx, layout, packet, active) {
    ctx.save();
    ctx.strokeStyle = CYAN;
    ctx.globalAlpha = 0.18 + active * 0.45;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const p = pointOnPath(layout, i / steps);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (packet >= 0) {
      for (let i = 0; i < 10; i++) {
        const t = packet - i * 0.028;
        if (t <= 0.02 || t >= 0.98) continue;
        const p = pointOnPath(layout, t);
        ctx.globalAlpha = 0.95 - i * 0.08;
        ctx.fillStyle = i % 2 === 0 ? GOLD : CYAN;
        const s = i === 0 ? 5 : 3;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    ctx.restore();
  }
  function draw(ctx, w, h, visual, time) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#123044";
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    const gap = 36;
    for (let x = 0; x <= w; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const layout = layoutOf(w, h);
    const oc = originCohesion(visual.phase, visual.progress);
    const dc = destCohesion(visual.phase, visual.progress, visual.fidelity);
    const packet = packetT(visual.phase, visual.progress);
    const active = isEntangled(visual.phase) ? 1 : visual.phase === "convert" ? 0.45 : 0.2;
    const glitch = glitchAmount(visual.phase, visual.fidelity);
    for (const box of [layout.origin, layout.tunnel, layout.dest]) {
      brackets(ctx, box, CYAN_DIM);
    }
    drawWormhole(ctx, layout.tunnel, time, active);
    drawFigure(ctx, layout.origin, oc, "origin", 0, time, visual.spin, visual.phase === "scan" ? visual.progress : null);
    drawFigure(ctx, layout.dest, dc, "dest", glitch, time + 900, visual.spin, null);
    drawConduit(ctx, layout, packet, active);
    const originFoot = visual.phase === "idle" ? "LISTO" : visual.phase === "locked" || visual.phase === "decohered" ? "VAC\xCDO" : "DESMATERIALIZA";
    const destFoot = visual.phase === "locked" ? "COMPLETO" : visual.phase === "decohered" ? "DECOHERENCIA" : visual.phase === "idle" ? "ARMADO" : "REMATERIALIZA";
    const tunnelFoot = isEntangled(visual.phase) ? "PAR ENTRELAZADO" : "PUENTE DE WORMHOLE";
    chrome(ctx, layout.origin, "PORTAL ORIGEN", originFoot);
    chrome(ctx, layout.tunnel, "T\xDANEL EINSTEIN-ROSEN", tunnelFoot);
    chrome(ctx, layout.dest, "PORTAL DESTINO", destFoot);
  }
  return __toCommonJS(entry_exports);
})();
