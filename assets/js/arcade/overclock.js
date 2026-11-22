/* ==========================================================================
   OVERCLOCK — hold to boost, release to cool. Time your speed through
   crushers and laser gates without overheating.
   ========================================================================== */
(() => {
  "use strict";
  const { Game, Sound, COLORS: C, drawBot, roundRect, clamp, lerp, rand, ease } = window.Arcade;
  const W = 960, H = 540, GROUND = 432, BOT = 50, CAM_X = 250, PX_PER_M = 40;

  const game = new Game({ id: "overclock", width: W, height: H });
  let s; // run state
  let holding = false;

  function newRun() {
    s = {
      D: window.Arcade.diff(), x: 0, v: 0, heat: 0, stall: 0, dead: false, deadT: 0, score: 0, bonus: 0, t: 0, wheel: 0,
      hazards: [], zones: [], nextX: 700, warnT: 0, tutorial: !game.best(), hints: [], lastSlamSound: 0,
    };
    // Gentle, hand-placed opening so the first seconds teach the rules.
    addZone("vent", 380, 160);
    addHazard({ type: "crusher", x: 900, w: 76, P: 2.6, D: 0.34, phase: 1.2 });
    addHazard({ type: "laser", x: 1500, w: 16, P: 2.2, D: 0.45, phase: 0.2 });
    addZone("vent", 1800, 180);
    s.nextX = 2250;
    if (s.tutorial) {
      s.hints.push({ x: 200, text: "Hold to overclock →" }, { x: 380, text: "Vents cool you down" }, { x: 820, text: "Wait for the crusher to lift" }, { x: 1420, text: "Slip through while the laser is off" });
    }
  }

  function addHazard(h) { s.hazards.push({ ...h, awarded: false, exitT: -1 }); }
  function addZone(type, x, w) { s.zones.push({ type, x, w }); }

  function difficulty() { return clamp(s.x * s.D / 9000, 0, 1); }

  function generate() {
    while (s.nextX < s.x + W * 1.6) {
      const d = difficulty();
      const r = Math.random();
      let x = s.nextX;
      if (r < 0.42) {
        addHazard({ type: "crusher", x, w: 76, P: lerp(2.4, 1.55, d) + rand(-0.15, 0.2), D: lerp(0.32, 0.4, d), phase: rand(0, 3) });
        x += 76;
      } else if (r < 0.7) {
        addHazard({ type: "laser", x, w: 16, P: lerp(2.1, 1.35, d) + rand(-0.1, 0.2), D: lerp(0.42, 0.55, d), phase: rand(0, 3) });
        x += 16;
      } else if (r < 0.84 && d > 0.2) {
        // Twin crushers, offset — find the rhythm.
        const P = lerp(2.4, 1.7, d), ph = rand(0, 3);
        addHazard({ type: "crusher", x, w: 76, P, D: 0.32, phase: ph });
        addHazard({ type: "crusher", x: x + 150, w: 76, P, D: 0.32, phase: ph + P * 0.45 });
        x += 226;
      } else if (d > 0.1) {
        // Furnace: heats you up even while cruising. Push through it.
        const w = lerp(220, 340, d);
        addZone("furnace", x, w); x += w;
      } else {
        addHazard({ type: "laser", x, w: 16, P: 2.2, D: 0.42, phase: rand(0, 3) }); x += 16;
      }
      if (Math.random() < lerp(0.35, 0.22, d)) { const gx = x + 120; addZone("vent", gx, 150); x = gx + 150; }
      s.nextX = x + lerp(430, 270, d) + rand(0, 170);
    }
    s.hazards = s.hazards.filter((h) => h.x + h.w > s.x - CAM_X - 100);
    s.zones = s.zones.filter((z) => z.x + z.w > s.x - CAM_X - 100);
  }

  /** Crusher extension 0..1 (1 = slammed down) and warning flag. */
  function crusher(h, t) {
    const u = (((t + h.phase) % h.P) + h.P) % h.P / h.P;
    if (u < 0.05) return { e: ease.outCubic(u / 0.05), warn: false, u };
    if (u < h.D - 0.09) return { e: 1, warn: false, u };
    if (u < h.D) return { e: 1 - ease.inOut((u - (h.D - 0.09)) / 0.09) * 0.9, warn: false, u };
    const warn = u > 0.8;
    return { e: 0.1 - (warn ? 0.06 * Math.sin(((u - 0.8) / 0.2) * Math.PI) : 0), warn, u };
  }
  function laser(h, t) {
    const u = (((t + h.phase) % h.P) + h.P) % h.P / h.P;
    return { on: u < h.D, warn: u > 0.84, u };
  }
  const deadly = (h, t) => (h.type === "crusher" ? crusher(h, t).e > 0.55 : laser(h, t).on);

  function inZone(type) { return s.zones.some((z) => z.type === type && s.x + BOT * 0.4 > z.x && s.x - BOT * 0.4 < z.x + z.w); }

  game.update = (dt) => {
    if (!s || s.dead) { if (s?.dead) s.deadT += dt; return; }
    s.t += dt;
    const d = difficulty();
    const boosting = holding && s.stall <= 0;
    const target = s.stall > 0 ? 0 : boosting ? lerp(360, 440, d) : lerp(115, 150, d);
    s.v += (target - s.v) * Math.min(1, dt * (s.stall > 0 ? 9 : 6));
    s.x += s.v * dt;
    s.wheel += s.v * dt / 9;

    // Heat
    const vent = inZone("vent"), furnace = inZone("furnace");
    if (s.stall > 0) { s.stall -= dt; s.heat = Math.max(0.5, s.heat - dt * 0.35); if (s.stall <= 0) { s.heat = 0.5; Sound.tone({ f: 300, f2: 600, dur: 0.15, type: "triangle", vol: 0.1 }); } }
    else {
      s.heat += (boosting ? 0.36 * s.D : -0.3 / s.D) * dt + (furnace ? 0.42 * s.D * dt : 0) - (vent ? 0.75 * dt : 0);
      s.heat = clamp(s.heat, 0, 1);
      if (s.heat >= 1) overheat();
    }
    if (vent && Math.random() < dt * 30) game.particles.burst(W * 0 + CAM_X + rand(-20, 20), GROUND - 4, { n: 1, color: C.surge2, speed: 60, angle: -Math.PI / 2, spread: 0.6, gravity: -40, life: 0.5, size: 2 });
    if (s.heat > 0.8 && s.stall <= 0) { s.warnT -= dt; if (s.warnT <= 0) { Sound.warn(); s.warnT = lerp(0.35, 0.1, (s.heat - 0.8) / 0.2); } }

    // Sparks when boosting
    if (boosting && s.v > 300 && Math.random() < dt * 40) game.particles.burst(CAM_X - BOT * 0.4, GROUND - 2, { n: 1, color: C.amber, speed: 160, angle: Math.PI + 0.3, spread: 0.5, gravity: 500, life: 0.35, size: 2 });

    // Hazards
    const left = s.x - BOT * 0.42, right = s.x + BOT * 0.42;
    for (const h of s.hazards) {
      const overlap = right > h.x && left < h.x + h.w;
      if (overlap && deadly(h, s.t)) return die(h);
      if (!overlap && left >= h.x + h.w && h.exitT < 0) h.exitT = s.t;
      if (h.exitT > 0 && !h.awarded && s.t - h.exitT < 0.22 && deadly(h, s.t)) {
        h.awarded = true; s.bonus += 25; game.trophy("oc-close"); game.floaters.add("CLOSE CALL +25", CAM_X + 10, GROUND - 90, C.amber, 18); Sound.pickup();
      }
      if (h.type === "crusher") {
        const c = crusher(h, s.t), sx = h.x - s.x + CAM_X;
        if (c.u < 0.02 && s.t - s.lastSlamSound > 0.1 && sx > -100 && sx < W + 50) {
          s.lastSlamSound = s.t; const near = 1 - clamp(Math.abs(sx - CAM_X) / 700, 0, 1);
          if (near > 0.1) { Sound.noise({ dur: 0.14, vol: 0.12 * near, f: 380 }); game.shake(4 * near); game.particles.burst(sx + h.w / 2, GROUND - 2, { n: 8, color: C.steelHi, speed: 120, angle: -Math.PI / 2, spread: 2.4, gravity: 600, life: 0.4, size: 2, glow: false }); }
        }
      }
    }
    s.score = Math.floor(s.x / PX_PER_M) + s.bonus;
    if (s.score >= 1000) game.trophy("oc-1000");
    if (s.D > 1.2 && s.score >= 750) game.trophy("oc-hard");
    const m = Math.floor(s.x / PX_PER_M / 100);
    if (m > (s.milestone || 0)) { s.milestone = m; game.floaters.add(`${m * 100} m!`, CAM_X + 40, GROUND - 120, C.surge2, 22); Sound.tone({ f: 880, f2: 1320, dur: 0.12, type: "triangle", vol: 0.08 }); }
    game.setHud("score", s.score.toLocaleString());
    game.setHud("dist", `${Math.floor(s.x / PX_PER_M)} m`);
    generate();
  };

  function overheat() {
    s.stall = 1.5; s.heat = 1;
    Sound.noise({ dur: 0.8, vol: 0.25, f: 5000, type: "highpass" }); Sound.tone({ f: 400, f2: 80, dur: 0.6, type: "sawtooth", vol: 0.12 });
    game.floaters.add("OVERHEAT!", CAM_X, GROUND - 100, C.danger, 24); game.shake(5);
    for (let i = 0; i < 3; i++) game.particles.burst(CAM_X, GROUND - BOT, { n: 10, color: "#cfd8e3", speed: 90, angle: -Math.PI / 2, spread: 1.2, gravity: -80, life: 1.2, size: 5, glow: false, drag: 0.94 });
  }

  function die(h) {
    s.dead = true; s.deadT = 0; holding = false;
    Sound.boom(); game.shake(16);
    game.particles.burst(CAM_X, GROUND - BOT / 2, { n: 46, color: C.surge, speed: 420, life: 1.1, size: 5 });
    game.particles.burst(CAM_X, GROUND - BOT / 2, { n: 26, color: C.amber, speed: 300, life: 0.9, size: 4 });
    game.particles.burst(CAM_X, GROUND - BOT / 2, { n: 12, color: C.steelHi, speed: 260, life: 1.4, size: 8, glow: false, gravity: 900 });
    const meters = Math.floor(s.x / PX_PER_M);
    game.trophy("oc-first");
    const isRecord = game.submitBest(s.score, `${s.score.toLocaleString()} pts`);
    if (isRecord) { const b = game.best(); window.Arcade.store.set("ss-arcade-overclock", { ...b, dist: meters }); }
    const reason = h.type === "crusher" ? "Flattened by a crusher." : "Zapped by a laser gate.";
    setTimeout(() => {
      game.stop();
      game.showOverlay(`
        <span class="kicker">Run over</span>
        <h2>${reason}</h2>
        <div class="big-score">${s.score.toLocaleString()}</div>
        <p>${meters} m traveled${s.bonus ? ` · ${s.bonus} bonus from close calls` : ""}</p>
        ${isRecord ? '<span class="record">New personal best</span>' : `<p>Best: ${game.best()?.label ?? "—"}</p>`}
        <div class="overlay-actions"><button class="btn primary" data-primary>Run again</button><a class="btn" href="../arcade.html">More games</a></div>
        <p class="overlay-hint">Space or Enter to restart</p>`, { onPrimary: begin });
    }, 900);
  }

  /* ---------------- Rendering ---------------- */
  const factory = Array.from({ length: 24 }, (_, i) => ({ x: i * 180 + rand(-30, 30), w: rand(70, 150), h: rand(90, 230), stack: Math.random() < 0.4 }));
  const girders = Array.from({ length: 16 }, (_, i) => ({ x: i * 260 + rand(-40, 40), y: rand(70, 160) }));

  game.render = (ctx) => {
    const cam = (s ? s.x : 0) - CAM_X, t = s ? s.t : game.time;
    // Sky / back wall
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0b1119"); g.addColorStop(1, "#06090d");
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    // Far factory (parallax 0.15)
    ctx.fillStyle = "#0e1620";
    for (const b of factory) {
      const x = ((b.x - cam * 0.15) % 4320 + 4320) % 4320 - 200;
      ctx.fillRect(x, GROUND - 60 - b.h, b.w, b.h + 60);
      if (b.stack) ctx.fillRect(x + b.w * 0.6, GROUND - 60 - b.h - 60, 16, 60);
      ctx.fillStyle = "#132030"; for (let wy = GROUND - 40 - b.h; wy < GROUND - 70; wy += 26) ctx.fillRect(x + 10, wy, b.w - 20, 6); ctx.fillStyle = "#0e1620";
    }
    // Grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    const off = -((cam * 0.5) % 48);
    for (let x = off; x < W; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, GROUND); }
    for (let y = 24; y < GROUND; y += 48) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // Girders (parallax 0.5)
    ctx.strokeStyle = "#17222e"; ctx.lineWidth = 6;
    for (const gd of girders) { const x = ((gd.x - cam * 0.5) % 4160 + 4160) % 4160 - 200; ctx.beginPath(); ctx.moveTo(x, gd.y); ctx.lineTo(x + 200, gd.y); ctx.stroke(); }
    // Ceiling rail
    ctx.fillStyle = "#121b25"; ctx.fillRect(0, 0, W, 54); ctx.fillStyle = C.line; ctx.fillRect(0, 54, W, 2);

    if (s) {
      // Zones
      for (const z of s.zones) {
        const x = z.x - cam; if (x > W || x + z.w < 0) continue;
        if (z.type === "vent") {
          ctx.fillStyle = "rgba(59,168,255,0.08)"; ctx.fillRect(x, 60, z.w, GROUND - 60);
          const gr = ctx.createLinearGradient(0, GROUND - 120, 0, GROUND); gr.addColorStop(0, "rgba(59,168,255,0)"); gr.addColorStop(1, "rgba(59,168,255,0.22)");
          ctx.fillStyle = gr; ctx.fillRect(x, GROUND - 120, z.w, 120);
          ctx.fillStyle = C.surge; for (let i = 8; i < z.w - 6; i += 14) ctx.fillRect(x + i, GROUND - 3, 8, 3);
          label(ctx, "COOLANT", x + z.w / 2, GROUND - 130, C.surge2);
        } else {
          const pulse = 0.5 + 0.5 * Math.sin(t * 6);
          const gr = ctx.createLinearGradient(0, GROUND - 160, 0, GROUND); gr.addColorStop(0, "rgba(255,93,93,0)"); gr.addColorStop(1, `rgba(255,120,60,${0.22 + pulse * 0.1})`);
          ctx.fillStyle = gr; ctx.fillRect(x, GROUND - 160, z.w, 160);
          ctx.strokeStyle = "rgba(255,150,80,0.25)"; ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) { ctx.beginPath(); const yy = GROUND - 20 - i * 30 - ((t * 60) % 30); ctx.moveTo(x, yy); for (let xx = 0; xx <= z.w; xx += 20) ctx.lineTo(x + xx, yy + Math.sin((xx + t * 200) / 30) * 4); ctx.stroke(); }
          label(ctx, "FURNACE", x + z.w / 2, GROUND - 170, "#ff9a6b");
        }
      }
    }
    // Floor
    ctx.fillStyle = C.floor; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = C.steel; ctx.fillRect(0, GROUND, W, 3);
    ctx.fillStyle = "#121b25"; const so = -((cam) % 40);
    for (let x = so; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, GROUND + 10); ctx.lineTo(x + 20, GROUND + 10); ctx.lineTo(x + 10, GROUND + 30); ctx.lineTo(x - 10, GROUND + 30); ctx.fill(); }
    ctx.fillStyle = "#0a1017"; ctx.fillRect(0, GROUND + 44, W, H);

    if (s) {
      // Hazards
      for (const h of s.hazards) {
        const x = h.x - cam; if (x > W + 40 || x + h.w < -40) continue;
        if (h.type === "crusher") drawCrusher(ctx, x, h, crusher(h, s.t), t);
        else drawLaser(ctx, x, h, laser(h, s.t), t);
      }
      // Personal-best marker
      const best = game.best();
      if (best?.dist) { const bx = best.dist * PX_PER_M - cam; if (bx > -20 && bx < W + 20) { ctx.strokeStyle = "rgba(255,181,71,0.6)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, 70); ctx.lineTo(bx, GROUND); ctx.stroke(); ctx.setLineDash([]); label(ctx, `BEST ${best.dist} m`, bx, 90, C.amber); } }
      // Tutorial hints
      for (const hn of s.hints) { const x = hn.x - cam; if (x > -200 && x < W + 200) label(ctx, hn.text, x, 120, C.muted, 15, true); }
      // Robot
      if (!s.dead) drawRunner(ctx);
      // Speed lines
      if (s.v > 300 && !s.dead) {
        ctx.strokeStyle = "rgba(132,205,255,0.18)"; ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) { const y = 80 + ((i * 97 + s.t * 900) % 330); const x = (W - ((s.t * 1600 + i * 233) % (W + 300))); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 90 * (s.v / 440), y); ctx.stroke(); }
      }
    } else {
      drawBot(ctx, CAM_X, GROUND - BOT * 0.5 - 8 + Math.sin(game.time * 3) * 2, BOT, { look: 1 });
    }
    game.particles.draw(ctx); game.floaters.draw(ctx);
    if (s) drawHeat(ctx);
  };

  function drawRunner(ctx) {
    const y = GROUND - BOT * 0.5 - 10, boosting = holding && s.stall <= 0;
    const tilt = s.stall > 0 ? Math.sin(s.t * 40) * 0.03 : clamp((s.v - 120) / 2000, 0, 0.12);
    // wheels
    for (const wx of [-15, 15]) {
      ctx.save(); ctx.translate(CAM_X + wx, GROUND - 9); ctx.rotate(s.wheel);
      ctx.fillStyle = "#0b1016"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.steelHi; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke(); ctx.restore();
    }
    // exhaust glow
    if (boosting) { const gr = ctx.createRadialGradient(CAM_X - 34, y + 4, 2, CAM_X - 34, y + 4, 30); gr.addColorStop(0, "rgba(132,205,255,0.8)"); gr.addColorStop(1, "rgba(59,168,255,0)"); ctx.fillStyle = gr; ctx.fillRect(CAM_X - 70, y - 26, 60, 60); }
    const col = s.heat > 0.8 ? C.danger : s.heat > 0.55 ? C.amber : C.surge;
    drawBot(ctx, CAM_X, y, BOT, { color: col, look: 1, tilt, hot: s.stall > 0 ? 0.6 : clamp((s.heat - 0.5) * 1.6, 0, 0.8), glow: boosting ? 18 : 10 });
  }

  function drawCrusher(ctx, x, h, c, t) {
    const top = 56, maxLen = GROUND - top - 6, len = 24 + (maxLen - 24) * c.e;
    // shaft
    ctx.fillStyle = "#1a2531"; ctx.fillRect(x + h.w / 2 - 10, top, 20, len - 30);
    ctx.fillStyle = C.steelHi; ctx.fillRect(x + h.w / 2 - 3, top, 6, len - 30);
    // head
    const hy = top + len - 34;
    const gr = ctx.createLinearGradient(0, hy, 0, hy + 34); gr.addColorStop(0, "#4a5b70"); gr.addColorStop(1, "#253241");
    ctx.fillStyle = gr; roundRect(ctx, x, hy, h.w, 34, 4); ctx.fill();
    // hazard stripes
    ctx.save(); roundRect(ctx, x, hy + 24, h.w, 10, 2); ctx.clip();
    for (let i = -10; i < h.w + 10; i += 14) { ctx.fillStyle = C.amber; ctx.beginPath(); ctx.moveTo(x + i, hy + 34); ctx.lineTo(x + i + 7, hy + 24); ctx.lineTo(x + i + 14, hy + 24); ctx.lineTo(x + i + 7, hy + 34); ctx.fill(); }
    ctx.restore();
    // warning light
    const lit = c.warn ? Math.sin(t * 40) > 0 : c.e > 0.55;
    ctx.fillStyle = lit ? C.danger : "#3a1b1f"; if (lit) { ctx.shadowColor = C.danger; ctx.shadowBlur = 14; }
    ctx.beginPath(); ctx.arc(x + h.w / 2, top + 12, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    // floor plate
    ctx.fillStyle = c.e > 0.55 ? "rgba(255,93,93,0.18)" : c.warn ? "rgba(255,181,71,0.14)" : "rgba(255,255,255,0.03)";
    ctx.fillRect(x, GROUND - 3, h.w, 3);
  }

  function drawLaser(ctx, x, h, l, t) {
    const cx = x + h.w / 2;
    // emitters
    ctx.fillStyle = "#253241"; roundRect(ctx, cx - 14, 56, 28, 18, 4); ctx.fill(); roundRect(ctx, cx - 14, GROUND - 18, 28, 18, 4); ctx.fill();
    ctx.fillStyle = l.on ? C.danger : l.warn ? C.amber : "#3a1b1f"; ctx.fillRect(cx - 6, 70, 12, 4); ctx.fillRect(cx - 6, GROUND - 18, 12, 4);
    if (l.on) {
      const flick = 0.85 + Math.random() * 0.15;
      ctx.save(); ctx.globalAlpha = flick; ctx.shadowColor = C.danger; ctx.shadowBlur = 24;
      ctx.fillStyle = "rgba(255,93,93,0.35)"; ctx.fillRect(cx - 7, 74, 14, GROUND - 92);
      ctx.fillStyle = "#ffd0d0"; ctx.fillRect(cx - 2, 74, 4, GROUND - 92); ctx.restore();
    } else if (l.warn) {
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 50); ctx.fillStyle = C.amber;
      for (let y = 78; y < GROUND - 20; y += 14) ctx.fillRect(cx - 1, y, 2, 7);
      ctx.globalAlpha = 1;
    }
  }

  function drawHeat(ctx) {
    const x = 24, y = 18, w = 220, hgt = 14;
    ctx.fillStyle = "rgba(7,10,14,0.7)"; roundRect(ctx, x - 10, y - 8, w + 120, 32, 10); ctx.fill();
    ctx.fillStyle = "#16202b"; roundRect(ctx, x, y, w, hgt, 7); ctx.fill();
    const gr = ctx.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, C.surge); gr.addColorStop(0.6, C.amber); gr.addColorStop(1, C.danger);
    ctx.save(); roundRect(ctx, x, y, Math.max(hgt, w * s.heat), hgt, 7); ctx.clip(); ctx.fillStyle = gr; ctx.fillRect(x, y, w, hgt); ctx.restore();
    if (s.heat > 0.8 || s.stall > 0) { ctx.strokeStyle = `rgba(255,93,93,${0.5 + 0.5 * Math.sin(s.t * 20)})`; ctx.lineWidth = 2; roundRect(ctx, x - 1, y - 1, w + 2, hgt + 2, 8); ctx.stroke(); }
    ctx.font = '600 12px "JetBrains Mono", monospace'; ctx.textAlign = "left"; ctx.fillStyle = s.stall > 0 ? C.danger : C.muted;
    ctx.fillText(s.stall > 0 ? "STALLED" : `HEAT ${Math.round(s.heat * 100)}%`, x + w + 12, y + 12);
  }

  function label(ctx, text, x, y, color, size = 11, plain = false) {
    ctx.font = `600 ${size}px ${plain ? '"Inter", system-ui' : '"JetBrains Mono", monospace'}`; ctx.textAlign = "center"; ctx.fillStyle = color; ctx.globalAlpha = 0.9;
    ctx.fillText(text, x, y); ctx.globalAlpha = 1;
  }

  /* ---------------- Input & flow ---------------- */
  const HOLD_KEYS = [" ", "ArrowUp", "ArrowRight", "w", "W", "d", "D"];
  game.onKey = (e) => {
    if (HOLD_KEYS.includes(e.key) && game.running && !game.paused) holding = true;
  };
  game.onKeyUp = (e) => { if (HOLD_KEYS.includes(e.key)) holding = HOLD_KEYS.some((k) => game.keys.has(k)); };
  game.stage.addEventListener("pointerdown", (e) => { if (e.target.closest(".overlay")) return; if (game.running && !game.paused) { holding = true; game.stage.setPointerCapture?.(e.pointerId); } });
  const release = () => { holding = HOLD_KEYS.some((k) => game.keys.has(k)); };
  game.stage.addEventListener("pointerup", release); game.stage.addEventListener("pointercancel", release);
  game.onPause = () => { holding = false; };

  function begin() { newRun(); holding = false; game.start(); }

  s = null;
  const best = game.best(); game.setHudBest(best?.label ?? "—");
  game.showOverlay(`
    <span class="kicker">Steel Surge Arcade</span>
    <h2>Overclock</h2>
    <p>Hold to boost. Let go to cool down. Time your speed to slip past crushers and laser gates — but push too hard and your robot overheats and stalls.</p>
    <div class="keys"><span class="kbd">Space</span><span class="kbd">↑</span><span class="kbd">→</span><span style="color:#67768a;font-size:13px;align-self:center">or tap &amp; hold</span></div>
    <div class="overlay-actions"><button class="btn primary" data-primary>Start run</button></div>`, { onPrimary: begin });
})();
