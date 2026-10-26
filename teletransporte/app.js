(() => {
  const SR = window.SR;
  const visual = SR.createVisual();
  const log = [
    "SPLIT RUN v02.7 · CANAL EN ESPERA",
    "ESTABILIZADOR DE CUÁNTICOS · LISTO",
    "SINCRONIZACIÓN DESTINO · BLOQUEADA",
  ];

  const $ = (id) => document.getElementById(id);
  const canvas = $("plano");
  const ctx = canvas.getContext("2d");
  const bars = document.querySelectorAll("#segments i");
  const steps = document.querySelectorAll("#steps li");
  const macros = document.querySelectorAll("[data-macro]");
  const rateButtons = document.querySelectorAll("[data-rate]");

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const applyMotion = () => {
    visual.spin = mq.matches ? 0 : 1;
  };
  applyMotion();
  mq.addEventListener("change", applyMotion);

  function macroIndex(phase) {
    if (phase === "scan" || phase === "convert") return 0;
    if (phase === "transmit" || phase === "propagate") return 1;
    if (phase === "rematerialize" || phase === "locked" || phase === "decohered") return 2;
    return -1;
  }

  function pushLog(line) {
    log.push(line);
    if (log.length > 7) log.shift();
  }

  function enter(next, nextMode, now = performance.now()) {
    if (visual.phase === next && visual.mode === nextMode) return;
    visual.phase = next;
    visual.mode = nextMode;
    visual.phaseStarted = now;
    visual.progress = next === "locked" || next === "decohered" ? 1 : 0;
    if (next === "locked" || next === "decohered") {
      visual.frozen = true;
      visual.frozenFidelity = visual.fidelity;
      visual.frozenRisk = visual.risk;
    }
    const shown = visual.frozen ? visual.frozenFidelity : visual.fidelity;
    pushLog(SR.logLine(next, visual.subject, shown));
    paintUi(true);
  }

  function ejecutar() {
    if (visual.mode === "auto" || visual.mode === "step") return;
    visual.frozen = false;
    visual.subject = $("subject").value || "QX-01";
    const rated = SR.assess(visual.energy, visual.field);
    visual.fidelity = rated.fidelity;
    visual.risk = rated.risk;
    log.length = 0;
    log.push(`SPLIT RUN v02.7 · SUJETO ${visual.subject}`);
    enter("scan", "auto");
  }

  function paso() {
    if (visual.mode === "auto" || visual.mode === "step") return;
    if (visual.phase === "locked" || visual.phase === "decohered") return;
    if (visual.phase === "idle") {
      visual.frozen = false;
      visual.subject = $("subject").value || "QX-01";
      log.length = 0;
      log.push(`SPLIT RUN v02.7 · PASO A PASO · ${visual.subject}`);
      enter("scan", "step");
      return;
    }
    const index = SR.stepIndex(visual.phase);
    if (index < 0 || visual.progress < 1) return;
    if (index < SR.SEQUENCE.length - 1) enter(SR.SEQUENCE[index + 1], "step");
    else enter(visual.fidelity >= SR.SUCCESS_FIDELITY ? "locked" : "decohered", "hold");
  }

  function abortar() {
    if (visual.phase === "idle" && visual.mode === "idle") return;
    visual.frozen = false;
    visual.progress = 0;
    const rated = SR.assess(visual.energy, visual.field);
    visual.fidelity = rated.fidelity;
    visual.risk = rated.risk;
    pushLog("CORRIDA ABORTADA · PORTALES EN REPOSO");
    enter("idle", "idle");
  }

  function setEnergy(value) {
    visual.energy = value;
    $("energy").value = String(value);
    $("energy-out").textContent = `${value.toFixed(1)} PW`;
    $("m-energy").textContent = `${value.toFixed(1)} PW`;
    $("d-energy").textContent = `${value.toFixed(1)} PW`;
  }

  function setField(value) {
    visual.field = value;
    $("field").value = String(value);
    $("field-out").textContent = `${value.toFixed(1)} T`;
    $("m-field").textContent = `${value.toFixed(1)} Tesla`;
  }

  function paintUi(force) {
    const terminal = visual.phase === "locked" || visual.phase === "decohered";
    const running = visual.mode === "auto" || visual.mode === "step";
    const displayFid = terminal && visual.frozen ? visual.frozenFidelity : visual.fidelity;
    const displayRisk = terminal && visual.frozen ? visual.frozenRisk : visual.risk;
    const entangled = SR.isEntangled(visual.phase);
    const current = SR.stepIndex(visual.phase);
    const macro = macroIndex(visual.phase);
    const preview = SR.assess(visual.energy, visual.field);

    document.querySelector(".app").dataset.phase = visual.phase;
    $("run").disabled = running;
    $("run").textContent = running ? "En curso" : terminal ? "Nueva corrida" : "Ejecutar Split Run";
    $("step").disabled = running || terminal;
    $("abort").disabled = visual.phase === "idle" && visual.mode === "idle";

    macros.forEach((node, index) => {
      node.classList.toggle("on", macro === index);
    });

    const announcement = SR.phaseAnnouncement(visual.phase);
    $("phase").textContent = visual.phase === "idle" ? "En espera" : announcement.replace(/\.$/, "");
    if (force) $("live").textContent = announcement;

    bars.forEach((bar, index) => {
      const fill = terminal ? 100 : index < current ? 100 : index === current ? Math.round(visual.progress * 100) : 0;
      bar.style.width = `${fill}%`;
    });

    steps.forEach((item, index) => {
      const done = terminal || index < current;
      const on = index === current;
      item.classList.toggle("on", on);
      item.classList.toggle("done", done && !on);
    });

    $("log").replaceChildren(
      ...log.map((line) => {
        const li = document.createElement("li");
        li.textContent = line;
        return li;
      }),
    );

    $("state-title").textContent = entangled ? "Estado entrelazado" : "Estado separable";
    $("formula").textContent = entangled ? "|ψ⟩ = 1/√2 (|00⟩ + |11⟩)" : "|ψ⟩ = |0⟩ ⊗ |0⟩";
    $("bell").classList.toggle("live", entangled);
    $("fidelity").classList.toggle("warn", displayFid < SR.SUCCESS_FIDELITY);
    $("fidelity").querySelector("strong").textContent = SR.formatFid(displayFid);
    $("spec-fid").textContent = SR.formatFid(displayFid);
    $("spec-risk").textContent = SR.formatRisk(displayRisk);
    $("m-stab").textContent = SR.stabilizerLabel(displayRisk);
    const degA = visual.spin ? Math.round((performance.now() / 28) % 360) : 0;
    const degB = (360 - degA) % 360;
    $("m-a").textContent = `12.5 THz · ${degA}°`;
    $("m-b").textContent = `12.5 THz · ${degB}°`;
    $("d-recon").textContent = SR.reconstructionLabel(visual.phase);
    $("d-sync").textContent = SR.syncLabel(visual.phase);
    const qubits =
      visual.phase === "transmit" || visual.phase === "propagate"
        ? Math.round(8 + visual.progress * 16)
        : entangled
          ? 2
          : 0;
    $("d-qubits").textContent = String(qubits);
    const subject = $("subject").value || "QX-01";
    $("spec-subject").textContent = `Sujeto ${subject} · canal fotónico ${entangled ? "abierto" : "en reposo"}`;
    $("hint").textContent = terminal
      ? `Próxima corrida · fidelidad ${SR.formatFid(preview.fidelity)} · riesgo ${SR.formatRisk(preview.risk)}`
      : "Ventana nominal 4.2 PW · 9.8 T. Fuera de ella sube la decoherencia.";

    const ok = $("banner-ok");
    const bad = $("banner-bad");
    ok.hidden = visual.phase !== "locked";
    bad.hidden = visual.phase !== "decohered";
    if (visual.phase === "locked") ok.textContent = `Transferencia completa · fidelidad ${SR.formatFid(visual.frozenFidelity)}`;
    if (visual.phase === "decohered") {
      bad.textContent = `Decoherencia · reconstrucción incompleta · ${SR.formatFid(visual.frozenFidelity)}`;
    }
  }

  $("run").addEventListener("click", ejecutar);
  $("step").addEventListener("click", paso);
  $("abort").addEventListener("click", abortar);
  $("nominal").addEventListener("click", () => {
    setEnergy(4.2);
    setField(9.8);
  });
  $("limit").addEventListener("click", () => {
    setEnergy(7.6);
    setField(1.2);
  });
  $("energy").addEventListener("input", (event) => setEnergy(Number(event.target.value)));
  $("field").addEventListener("input", (event) => setField(Number(event.target.value)));
  $("subject").addEventListener("input", (event) => {
    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10);
    event.target.value = value;
    visual.subject = value || "QX-01";
  });
  rateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      visual.rate = Number(button.dataset.rate);
      rateButtons.forEach((other) => other.setAttribute("aria-pressed", other === button ? "true" : "false"));
    });
  });

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      ejecutar();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      paso();
    } else if (event.key === "Escape") abortar();
  });

  let lastUi = 0;
  const tick = (now) => {
    if (!visual.frozen) {
      const rated = SR.assess(visual.energy, visual.field);
      visual.fidelity = rated.fidelity;
      visual.risk = rated.risk;
    }
    if ((visual.mode === "auto" || visual.mode === "step") && SR.SEQUENCE.includes(visual.phase)) {
      const dur = SR.PHASE_MS[visual.phase] / Math.max(0.25, visual.rate);
      const p = Math.min(1, (now - visual.phaseStarted) / dur);
      visual.progress = p;
      if (p >= 1) {
        if (visual.mode === "step") {
          visual.mode = "hold";
          visual.progress = 1;
        } else {
          const index = SR.stepIndex(visual.phase);
          if (index < SR.SEQUENCE.length - 1) enter(SR.SEQUENCE[index + 1], "auto", now);
          else enter(visual.fidelity >= SR.SUCCESS_FIDELITY ? "locked" : "decohered", "hold", now);
        }
      }
    }
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (ctx && cssW > 2 && cssH > 2) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = Math.floor(cssW * dpr);
      const nextH = Math.floor(cssH * dpr);
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      SR.draw(ctx, cssW, cssH, visual, now);
    }
    if (now - lastUi > 120) {
      lastUi = now;
      paintUi(false);
    }
    requestAnimationFrame(tick);
  };
  paintUi(true);
  requestAnimationFrame(tick);
})();
