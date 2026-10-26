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
var model_exports = {};
__export(model_exports, {
  PHASE_MS: () => PHASE_MS,
  SEQUENCE: () => SEQUENCE,
  STEPS: () => STEPS,
  SUCCESS_FIDELITY: () => SUCCESS_FIDELITY,
  assess: () => assess,
  createVisual: () => createVisual,
  destCohesion: () => destCohesion,
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
module.exports = __toCommonJS(model_exports);
const SEQUENCE = ["scan", "convert", "transmit", "propagate", "rematerialize"];
const PHASE_MS = {
  scan: 2600,
  convert: 2400,
  transmit: 2100,
  propagate: 2600,
  rematerialize: 2800
};
const SUCCESS_FIDELITY = 97;
const STEPS = [
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
