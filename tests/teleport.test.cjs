const assert = require("node:assert/strict");
const test = require("node:test");
const model = require("../teletransporte/model.cjs");

test("ventana nominal 4.2 PW y 9.8 T", () => {
  const rated = model.assess(4.2, 9.8);
  assert.ok(Math.abs(rated.fidelity - 99.999) < 1e-9);
  assert.ok(Math.abs(rated.risk - 0.001) < 1e-9);
  assert.ok(rated.fidelity >= model.SUCCESS_FIDELITY);
});

test("forzar límite decohere por debajo del umbral", () => {
  const rated = model.assess(7.6, 1.2);
  assert.equal(rated.fidelity, 58);
  assert.equal(rated.risk, 42);
  assert.ok(rated.fidelity < model.SUCCESS_FIDELITY);
});

test("la corrida nace en espera con el sujeto QX-01", () => {
  const visual = model.createVisual();
  assert.equal(visual.phase, "idle");
  assert.equal(visual.subject, "QX-01");
  assert.equal(model.STEPS.length, 5);
  assert.equal(model.formatFid(99.999), "99.999%");
  assert.equal(model.formatRisk(0.001), "0.001%");
});
