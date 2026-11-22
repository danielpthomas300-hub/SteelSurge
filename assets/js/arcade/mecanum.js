/* ==========================================================================
   MECANUM RUSH — a top-down time trial. Mecanum wheels let the robot
   drive in any direction, so strafe and spin through every gate.
   ========================================================================== */
(() => {
  "use strict";
  const { Game, Sound, COLORS: C, roundRect, clamp, lerp, store } = window.Arcade;
  const W = 960, H = 600, ROBOT = 34, MAX_SPEED = 300, ACCEL = 1300, TURN = 3.4, CONE_R = 9;

  // Gates: [x, y, angle in degrees (direction of the gate line), width]. Cones: [x, y].
  const COURSES = [
    { name: "Warm-up", start: [90, 300, 0], gates: [[260, 300, 90, 110], [460, 180, 90, 110], [660, 300, 90, 110], [860, 300, 90, 120]], cones: [[360, 240], [360, 360], [560, 240], [560, 120], [760, 240], [760, 360]] },
    { name: "Strafe Alley", start: [90, 520, 0], gates: [[260, 520, 90, 90], [260, 300, 0, 90], [480, 120, 90, 90], [700, 300, 0, 90], [870, 520, 90, 100]],
      cones: [[200, 420], [320, 420], [200, 200], [320, 200], [400, 60], [400, 180], [560, 60], [560, 180], [640, 400], [760, 400], [640, 200], [760, 200]] },
    { name: "Figure Eight", start: [480, 300, -90], gates: [[480, 150, 0, 100], [270, 300, 90, 100], [480, 450, 0, 100], [690, 300, 90, 100], [480, 150, 0, 100], [480, 300, 0, 120]],
      cones: [[370, 300], [590, 300], [480, 230], [480, 370], [200, 160], [760, 160], [200, 440], [760, 440]] },
    { name: "Zigzag", start: [80, 80, 0], gates: [[220, 220, 45, 90], [360, 400, -45, 90], [500, 220, 45, 90], [640, 400, -45, 90], [780, 220, 45, 90], [890, 520, 0, 110]],
      cones: [[290, 300], [430, 310], [570, 300], [710, 310], [150, 300], [850, 340], [290, 120], [570, 120], [430, 500], [710, 500]] },
    { name: "The Hive", start: [80, 300, 0], gates: [[300, 300, 90, 70], [480, 140, 0, 70], [660, 300, 90, 70], [480, 460, 0, 70], [300, 300, 90, 70], [880, 300, 90, 110]],
      cones: [[480, 300], [430, 250], [530, 250], [430, 350], [530, 350], [380, 300], [580, 300], [300, 200], [300, 400], [660, 200], [660, 400], [780, 230], [780, 370]] },
    { name: "Gauntlet", start: [80, 540, -45], gates: [[200, 400, 90, 70], [360, 300, 0, 70], [200, 160, 90, 70], [440, 70, 90, 70], [620, 200, 0, 70], [760, 380, 90, 70], [620, 520, 90, 70], [890, 520, 90, 90]],
      cones: [[280, 350], [280, 230], [120, 280], [330, 110], [540, 110], [540, 300], [700, 290], [700, 470], [820, 460], [460, 470], [380, 470], [860, 240]] },
    { name: "Pinwheel", start: [480, 530, 0], gates: [[480, 410, 0, 110], [700, 300, 90, 100], [480, 160, 0, 110], [260, 300, 90, 100], [480, 410, 0, 110], [480, 525, 0, 140]],
      cones: [[480, 300], [410, 250], [550, 250], [410, 350], [550, 350], [630, 190], [330, 190], [630, 410], [330, 410], [780, 300], [180, 300]] },
    { name: "Grand Prix", start: [90, 300, 0], gates: [[220, 140, 0, 90], [420, 90, 90, 80], [610, 190, 45, 90], [820, 120, 0, 90], [860, 320, 0, 90], [700, 470, 90, 90], [480, 520, 90, 80], [270, 450, -45, 90], [120, 300, 0, 130]],
      cones: [[320, 150], [520, 150], [720, 190], [760, 300], [600, 410], [380, 480], [200, 370], [480, 300], [330, 290], [650, 300], [890, 470], [70, 140]] },
  ];
  COURSES.forEach((c) => {
    let len = 0, [px, py] = c.start;
    c.gates.forEach(([x, y]) => { len += Math.hypot(x - px, y - py); px = x; py = y; });
    const est = len / MAX_SPEED;
    c.medals = { gold: +(est * 1.45 + 0.8).toFixed(1), silver: +(est * 1.8 + 1.5).toFixed(1), bronze: +(est * 2.4 + 2.5).toFixed(1) };
  });

  const game = new Game({ id: "mecanum", width: W, height: H });
  game.difficultyNote = "Sets the cone penalty: none on Super Easy, up to 3 seconds per touch on Extreme.";
  const prog = store.get("ss-mecanum", { best: {}, last: 0, mode: "field" });
  let s, ci = prog.last || 0, joy = null, turnBtn = 0;

  function load(i) {
    ci = clamp(i, 0, COURSES.length - 1); prog.last = ci; store.set("ss-mecanum", prog);
    const c = COURSES[ci];
    s = { x: c.start[0], y: c.start[1], h: Math.atan2(c.gates[0][0] - c.start[0], -(c.gates[0][1] - c.start[1])), vx: 0, vy: 0, t: 0, started: false, done: false, gate: 0, penalty: 0, touched: 0, rec: [], hit: new Map(), cones: c.cones.map(([x, y]) => ({ x, y, ox: x, oy: y })) };
    s.ghost = prog.best[ci]?.rec || null;
    game.setHud("course", `${ci + 1}/${COURSES.length}`); game.setHud("time", "0.00"); game.setHud("gates", `0/${c.gates.length}`);
    game.setHudBest(prog.best[ci] ? `${prog.best[ci].time.toFixed(2)}s` : "—");
    game.setMessage(`${c.name} · Gold ${c.medals.gold}s · Silver ${c.medals.silver}s · Bronze ${c.medals.bronze}s · Drive mode: ${prog.mode === "field" ? "field-centric (W is always up)" : "robot-centric (W is the robot's front)"}. Press V to switch.`);
    game.start();
  }

  function medalFor(t, c) { return t <= c.medals.gold ? "gold" : t <= c.medals.silver ? "silver" : t <= c.medals.bronze ? "bronze" : null; }
  function crossed(ax, ay, bx, by, g) {
    const [gx, gy, ang, gw] = g, a = ang * Math.PI / 180, ux = Math.cos(a) * gw / 2, uy = Math.sin(a) * gw / 2;
    const x1 = gx - ux, y1 = gy - uy, x2 = gx + ux, y2 = gy + uy;
    const d = (bx - ax) * (y2 - y1) - (by - ay) * (x2 - x1); if (Math.abs(d) < 1e-9) return false;
    const t = ((x1 - ax) * (y2 - y1) - (y1 - ay) * (x2 - x1)) / d, u = ((x1 - ax) * (by - ay) - (y1 - ay) * (bx - ax)) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  function finish() {
    s.done = true; const c = COURSES[ci], time = s.t + s.penalty, medal = medalFor(time, c);
    const prev = prog.best[ci], isBest = !prev || time < prev.time;
    if (isBest) prog.best[ci] = { time, medal, rec: s.rec };
    else if (medal && (!prev.medal || ["bronze", "silver", "gold"].indexOf(medal) > ["bronze", "silver", "gold"].indexOf(prev.medal))) prev.medal = medal;
    store.set("ss-mecanum", prog);
    const golds = COURSES.filter((_, i) => prog.best[i]?.medal === "gold").length;
    store.set("ss-arcade-mecanum", { value: golds, label: `${Object.keys(prog.best).length}/${COURSES.length} · ${golds} gold` });
    game.trophy("mr-first"); if (!s.touched) game.trophy("mr-clean"); if (window.Arcade.level() === 4 && medal === "gold") game.trophy("mr-extreme"); if (prog.mode === "robot") game.trophy("mr-robot"); if (golds === COURSES.length) game.trophy("mr-gold");
    medal ? Sound.win() : Sound.pickup();
    game.particles.burst(s.x, s.y, { n: 40, color: medal === "gold" ? "#f2c443" : C.surge, speed: 300, life: 0.9, gravity: 0 });
    const last = ci === COURSES.length - 1;
    setTimeout(() => {
      game.stop();
      const colors = { gold: "#f2c443", silver: "#c3ccd6", bronze: "#d08a4e" };
      game.showOverlay(`<span class="kicker">${c.name} · finished</span><h2>${medal ? `${medal[0].toUpperCase() + medal.slice(1)} medal!` : "Course complete"}</h2>
        <div class="big-score" style="color:${medal ? colors[medal] : "#e9eef4"}">${time.toFixed(2)}s</div>
        <p>${s.t.toFixed(2)}s driving${s.penalty ? ` + ${s.penalty}s cone penalty` : " · clean run!"} · Gold time ${c.medals.gold}s</p>
        ${isBest && prev ? '<span class="record">New personal best</span>' : ""}
        <div class="overlay-actions"><button class="btn primary" data-primary>${last ? "Course select" : "Next course"}</button><button class="btn" data-retry>Race your ghost</button></div>`,
      { onPrimary: () => (last ? showCourses() : load(ci + 1)) });
      game.overlay.querySelector("[data-retry]").addEventListener("click", () => { Sound.select(); load(ci); });
    }, 500);
  }

  function showCourses() {
    const btns = COURSES.map((c, i) => { const b = prog.best[i]; return `<button class="level-btn${b ? " done" : ""}${i === ci ? " current" : ""}" data-course="${i}" style="aspect-ratio:auto;padding:12px 6px" aria-label="${c.name}">${i + 1}<small>${b ? (b.medal ? b.medal.toUpperCase() : `${b.time.toFixed(1)}s`) : c.name}</small></button>`; }).join("");
    game.stop();
    game.showOverlay(`<span class="kicker">Mecanum Rush</span><h2>Choose a course</h2><div class="level-grid" style="grid-template-columns:repeat(3,1fr)">${btns}</div>
      <div class="overlay-actions"><button class="btn primary" data-primary>Drive course ${ci + 1}</button><button class="btn" data-mode>Mode: ${prog.mode === "field" ? "Field-centric" : "Robot-centric"}</button></div>`, { onPrimary: () => load(ci) });
    game.overlay.querySelectorAll("[data-course]").forEach((b) => b.addEventListener("click", () => { Sound.select(); load(+b.dataset.course); }));
    game.overlay.querySelector("[data-mode]").addEventListener("click", (e) => { toggleMode(); e.currentTarget.textContent = `Mode: ${prog.mode === "field" ? "Field-centric" : "Robot-centric"}`; });
  }
  function toggleMode() { prog.mode = prog.mode === "field" ? "robot" : "field"; store.set("ss-mecanum", prog); Sound.select(); if (s) game.setMessage(`Drive mode: ${prog.mode === "field" ? "field-centric (W is always up)" : "robot-centric (W is the robot's front)"}.`); }

  game.update = (dt) => {
    if (!s || s.done) return;
    const k = game.keys;
    let ix = (k.has("d") || k.has("D") ? 1 : 0) - (k.has("a") || k.has("A") ? 1 : 0);
    let iy = (k.has("s") || k.has("S") ? 1 : 0) - (k.has("w") || k.has("W") ? 1 : 0);
    let turn = (k.has("ArrowRight") || k.has("e") || k.has("E") ? 1 : 0) - (k.has("ArrowLeft") || k.has("q") || k.has("Q") ? 1 : 0) + turnBtn;
    if (k.has("ArrowUp")) iy -= 1; if (k.has("ArrowDown")) iy += 1;
    if (joy?.active) { ix = joy.vx; iy = joy.vy; }
    const mag = Math.hypot(ix, iy); if (mag > 1) { ix /= mag; iy /= mag; }
    // robot-centric: rotate the input by the heading (W = robot's front)
    if (prog.mode === "robot") { const c = Math.cos(s.h), sn = Math.sin(s.h); [ix, iy] = [ix * c - iy * sn, ix * sn + iy * c]; }
    if (!s.started && (mag > 0.05 || turn)) s.started = true;
    if (s.started) s.t += dt;
    const tx = ix * MAX_SPEED, ty = iy * MAX_SPEED;
    const ax = clamp(tx - s.vx, -ACCEL * dt, ACCEL * dt), ay = clamp(ty - s.vy, -ACCEL * dt, ACCEL * dt);
    s.vx += ax; s.vy += ay; s.h += clamp(turn, -1, 1) * TURN * dt;
    const px = s.x, py = s.y;
    s.x = clamp(s.x + s.vx * dt, 40 + ROBOT / 2, W - 40 - ROBOT / 2); s.y = clamp(s.y + s.vy * dt, 40 + ROBOT / 2, H - 40 - ROBOT / 2);
    if (s.x === 40 + ROBOT / 2 || s.x === W - 40 - ROBOT / 2) s.vx *= -0.3;
    if (s.y === 40 + ROBOT / 2 || s.y === H - 40 - ROBOT / 2) s.vy *= -0.3;
    // cones
    for (const cn of s.cones) {
      const dx = s.x - cn.x, dy = s.y - cn.y, d = Math.hypot(dx, dy), min = ROBOT * 0.55 + CONE_R;
      if (d < min && d > 0) {
        cn.x -= dx / d * 4; cn.y -= dy / d * 4;
        s.x = cn.x + dx / d * min; s.y = cn.y + dy / d * min;
        const last = s.hit.get(cn) || -9;
        const pen = window.Arcade.pick([0, 0.5, 1, 2, 3]);
        if (s.t - last > 0.8) { s.penalty += pen; s.touched++; s.hit.set(cn, s.t); Sound.tone({ f: 180, dur: 0.1, type: "square", vol: 0.08 }); game.shake(4); game.floaters.add(pen ? `+${pen}s` : "Bump!", cn.x, cn.y - 16, pen ? C.danger : C.amber, 18); }
      }
      cn.x += (cn.ox - cn.x) * dt * 0.6; cn.y += (cn.oy - cn.y) * dt * 0.6;
    }
    // gates
    const c = COURSES[ci], g = c.gates[s.gate];
    if (g && crossed(px, py, s.x, s.y, g)) {
      s.gate++; game.setHud("gates", `${s.gate}/${c.gates.length}`);
      Sound.tone({ f: 500 + s.gate * 60, f2: 800 + s.gate * 60, dur: 0.1, type: "triangle", vol: 0.09 });
      game.particles.burst(g[0], g[1], { n: 14, color: C.ok, speed: 180, life: 0.5, gravity: 0 });
      if (s.gate === c.gates.length) return finish();
    }
    if (s.started && (s.rec.length === 0 || s.t - s.rec[s.rec.length - 1][0] >= 1 / 30)) s.rec.push([+s.t.toFixed(3), Math.round(s.x), Math.round(s.y), +s.h.toFixed(2)]);
    game.setHud("time", (s.t + s.penalty).toFixed(2));
  };

  /* ---------------- Rendering ---------------- */
  function drawRobot(ctx, x, y, h, alpha = 1, color = C.surge) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(h); ctx.globalAlpha = alpha;
    const r = ROBOT / 2;
    ctx.fillStyle = "#0b1016"; for (const [wx, wy] of [[-r - 4, -r + 2], [r - 4, -r + 2], [-r - 4, r - 12], [r - 4, r - 12]]) { roundRect(ctx, wx, wy, 8, 10, 2); ctx.fill(); }
    ctx.strokeStyle = "#4a5b70"; ctx.lineWidth = 1; for (const [wx, wy] of [[-r - 4, -r + 2], [r - 4, -r + 2], [-r - 4, r - 12], [r - 4, r - 12]]) { for (let i = 2; i < 10; i += 3) { ctx.beginPath(); ctx.moveTo(wx, wy + i); ctx.lineTo(wx + 8, wy + i + 3); ctx.stroke(); } }
    ctx.fillStyle = "#1b2633"; ctx.strokeStyle = color; ctx.lineWidth = 2.5; if (alpha === 1) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
    roundRect(ctx, -r + 3, -r, ROBOT - 6, ROBOT, 7); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-6, -r + 4); ctx.lineTo(6, -r + 4); ctx.lineTo(0, -r - 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  game.render = (ctx) => {
    ctx.fillStyle = "#0a0f14"; ctx.fillRect(-20, -20, W + 40, H + 40);
    // field tiles
    ctx.fillStyle = "#121a23"; ctx.fillRect(40, 40, W - 80, H - 80);
    ctx.strokeStyle = "#1a2531"; ctx.lineWidth = 1;
    for (let x = 40; x <= W - 40; x += 88) { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, H - 40); ctx.stroke(); }
    for (let y = 40; y <= H - 40; y += 88) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke(); }
    ctx.strokeStyle = C.steel; ctx.lineWidth = 4; ctx.strokeRect(38, 38, W - 76, H - 76);
    if (!s) return;
    const c = COURSES[ci];
    // gates
    c.gates.forEach((g, i) => {
      const [gx, gy, ang, gw] = g, a = ang * Math.PI / 180, ux = Math.cos(a) * gw / 2, uy = Math.sin(a) * gw / 2;
      const done = i < s.gate, next = i === s.gate, isFinish = i === c.gates.length - 1;
      ctx.save(); ctx.lineCap = "round";
      ctx.strokeStyle = done ? "rgba(61,220,151,0.25)" : next ? (isFinish ? "#f2c443" : C.ok) : "rgba(132,205,255,0.18)";
      ctx.lineWidth = next ? 5 : 3; if (next) { ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 16 + Math.sin(game.time * 6) * 6; }
      ctx.setLineDash(next ? [] : [6, 6]); ctx.beginPath(); ctx.moveTo(gx - ux, gy - uy); ctx.lineTo(gx + ux, gy + uy); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(gx - ux, gy - uy, 5, 0, Math.PI * 2); ctx.arc(gx + ux, gy + uy, 5, 0, Math.PI * 2); ctx.fill();
      if (next || isFinish) { ctx.font = '700 11px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = isFinish ? "#f2c443" : C.ok; ctx.fillText(isFinish ? "FINISH" : String(i + 1), gx + uy * 0.0, gy - 12 - Math.abs(uy) * 0); }
      ctx.restore();
    });
    // cones
    for (const cn of s.cones) { ctx.fillStyle = "#ff8a3d"; ctx.beginPath(); ctx.moveTo(cn.x, cn.y - CONE_R - 2); ctx.lineTo(cn.x + CONE_R, cn.y + CONE_R - 2); ctx.lineTo(cn.x - CONE_R, cn.y + CONE_R - 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(cn.x - 4, cn.y, 8, 2.5); }
    // ghost
    if (s.ghost && s.started) { const g = s.ghost; let i = 0; while (i < g.length - 1 && g[i + 1][0] < s.t) i++; const p = g[i]; if (p) drawRobot(ctx, p[1], p[2], p[3], 0.3, C.surge2); }
    drawRobot(ctx, s.x, s.y, s.h);
    // HUD in canvas
    ctx.font = '600 12px "JetBrains Mono", monospace'; ctx.textAlign = "left"; ctx.fillStyle = C.muted;
    ctx.fillText(`${c.name.toUpperCase()}  ·  ${prog.mode === "field" ? "FIELD" : "ROBOT"}-CENTRIC`, 48, 28);
    if (!s.started) { ctx.textAlign = "center"; ctx.font = '600 15px "Inter", system-ui'; ctx.fillStyle = C.text; ctx.fillText("Start driving to begin the timer", W / 2, H - 14); }
    if (joy?.active) { ctx.globalAlpha = 0.35; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 42, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(joy.ox + joy.vx * 32, joy.oy + joy.vy * 32, 15, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    game.particles.draw(ctx); game.floaters.draw(ctx);
  };

  /* ---------------- Input ---------------- */
  game.onKey = (e) => {
    if (game.overlayOpen()) return;
    if (e.key === "r" || e.key === "R") { Sound.select(); load(ci); }
    else if (e.key === "v" || e.key === "V") toggleMode();
    else if (e.key === "l" || e.key === "L") showCourses();
  };
  document.querySelector("[data-act=restart]")?.addEventListener("click", () => { Sound.select(); load(ci); });
  document.querySelectorAll("[data-turn]").forEach((b) => {
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); turnBtn = +b.dataset.turn; });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => (turnBtn = 0)));
  });
  const stage = game.stage, toLocal = (e) => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  stage.addEventListener("pointerdown", (e) => { if (e.target.closest(".overlay") || !game.running) return; const [x, y] = toLocal(e); joy = { id: e.pointerId, ox: x, oy: y, vx: 0, vy: 0, active: true }; stage.setPointerCapture?.(e.pointerId); });
  stage.addEventListener("pointermove", (e) => { if (!joy || e.pointerId !== joy.id) return; const [x, y] = toLocal(e), dx = x - joy.ox, dy = y - joy.oy, l = Math.hypot(dx, dy), k = l < 6 ? 0 : Math.min(1, l / 50); joy.vx = l ? dx / l * k : 0; joy.vy = l ? dy / l * k : 0; });
  const end = (e) => { if (joy && e.pointerId === joy.id) joy = null; };
  stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
  game.onPause = () => { joy = null; turnBtn = 0; };

  const any = Object.keys(prog.best).length;
  game.setHudBest("—");
  game.showOverlay(`<span class="kicker">Steel Surge Arcade</span><h2>Mecanum Rush</h2>
    <p>Our robot drives on mecanum wheels, which can roll in any direction, including sideways. Drive through every gate in order as fast as you can. Cones cost you a second, and your best run comes back as a ghost to race.</p>
    <div class="keys"><span class="kbd">W A S D</span><span style="color:#67768a;font-size:13px;align-self:center">drive</span><span class="kbd">← →</span><span style="color:#67768a;font-size:13px;align-self:center">turn</span><span class="kbd">V</span><span style="color:#67768a;font-size:13px;align-self:center">drive mode</span></div>
    <div class="overlay-actions"><button class="btn primary" data-primary>${any ? `Drive course ${ci + 1}` : "Start course 1"}</button><button class="btn" data-courses>Courses</button></div>`, { onPrimary: () => load(ci) });
  game.overlay.querySelector("[data-courses]").addEventListener("click", () => { Sound.select(); showCourses(); });
})();
