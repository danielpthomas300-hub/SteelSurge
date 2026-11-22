/* ==========================================================================
   FLYWHEEL — tune the hood angle and flywheel speed, then launch pollen
   into the hive. Inspired by the shooter on our 2026–27 robot.
   ========================================================================== */
(() => {
  "use strict";
  const { Game, Sound, COLORS: C, drawBot, roundRect, clamp, lerp, rand } = window.Arcade;
  const W = 960, H = 540, GROUND = 470, G = 900, BALL_R = 9;
  const LAUNCH = { x: 132, y: GROUND - 74 };

  const game = new Game({ id: "flywheel", width: W, height: H });
  let s;
  const aim = { angle: 48, power: 0.7 };

  function newRound() {
    s = { D: window.Arcade.diff(), perfects: 0, score: 0, streak: 0, bestStreak: 0, balls: 10, ball: null, reload: 0, wind: 0, hive: null, t: 0, over: false, trail: [], made: 0 };
    newHive(); newWind(); updateHud();
  }
  function newHive() {
    const lvl = s ? s.score : 0;
    s.hive = { x: rand(560, 840), y: rand(250, 420), w: 96, moveX: lvl > 250 ? rand(30, 70) : 0, moveY: lvl > 120 ? rand(20, 70) : 0, ph: rand(0, 6), sp: rand(0.6, 1.2) };
  }
  function newWind() { const max = clamp((15 + s.score / 6) * s.D, 10, 170); s.wind = Math.round(rand(-max, max)); }
  function hivePos() { const h = s.hive; return { x: h.x + Math.sin(s.t * h.sp + h.ph) * h.moveX, y: h.y + Math.cos(s.t * h.sp * 0.8 + h.ph) * h.moveY }; }
  function updateHud() { game.setHud("score", s.score.toLocaleString()); game.setHud("streak", s.streak ? `×${1 + Math.min(4, s.streak)}` : "0"); game.setHud("balls", String(s.balls)); syncUi(); }

  function velocity() { const v = lerp(420, 980, aim.power), a = aim.angle * Math.PI / 180; return [Math.cos(a) * v, -Math.sin(a) * v]; }
  function muzzle() { const a = aim.angle * Math.PI / 180; return [LAUNCH.x + Math.cos(a) * 34, LAUNCH.y - Math.sin(a) * 34]; }

  function fire() {
    if (!game.running || game.paused || !s || s.over || s.ball || s.reload > 0 || s.balls <= 0) return;
    const [x, y] = muzzle(), [vx, vy] = velocity();
    s.ball = { x, y, vx, vy, scored: false, bounces: 0, t: 0, prevY: y };
    s.balls--; s.reload = 0.6; s.trail = [];
    Sound.noise({ dur: 0.18, vol: 0.2, f: 900 }); Sound.tone({ f: 220, f2: 90, dur: 0.18, type: "sawtooth", vol: 0.08 });
    game.shake(3); game.particles.burst(x, y, { n: 10, color: "#cfd8e3", speed: 160, angle: -aim.angle * Math.PI / 180, spread: 0.8, gravity: 0, life: 0.35, size: 3, glow: false });
    updateHud();
  }

  function resolve(made, perfect) {
    const b = s.ball; s.ball = null;
    if (made) {
      const mult = 1 + Math.min(4, s.streak), pts = (10 + (perfect ? 15 : 0)) * mult;
      s.score += pts; s.streak++; s.made++; s.bestStreak = Math.max(s.bestStreak, s.streak);
      const hp = hivePos();
      game.floaters.add(perfect ? `PERFECT +${pts}` : `+${pts}`, hp.x, hp.y - 50, perfect ? C.ok : C.amber, perfect ? 24 : 20);
      game.particles.burst(hp.x, hp.y - 10, { n: perfect ? 40 : 22, color: C.amber, speed: 260, life: 0.8, gravity: 300 });
      perfect ? Sound.win() : Sound.pickup();
      game.trophy("fw-first"); if (s.streak >= 5) game.trophy("fw-streak");
      if (perfect && ++s.perfects >= 3) game.trophy("fw-bull");
      if (s.score >= 500) game.trophy("fw-gold");
      newHive();
    } else { if (s.streak) game.floaters.add("Streak lost", b.x, Math.min(b.y, GROUND - 30), C.danger, 16); s.streak = 0; Sound.tone({ f: 260, f2: 160, dur: 0.2, type: "triangle", vol: 0.07 }); }
    newWind(); updateHud();
    if (s.balls <= 0) setTimeout(endRound, 700);
  }

  function endRound() {
    if (s.over) return; s.over = true; game.stop();
    const isRecord = game.submitBest(s.score, `${s.score.toLocaleString()} pts`);
    game.showOverlay(`<span class="kicker">Round over</span><h2>${s.made >= 8 ? "Sharpshooter!" : s.made >= 5 ? "Nice shooting" : "Keep tuning"}</h2>
      <div class="big-score">${s.score.toLocaleString()}</div><p>${s.made}/10 shots scored · best streak ${s.bestStreak}</p>
      ${isRecord ? '<span class="record">New personal best</span>' : `<p>Best: ${game.best()?.label ?? "—"}</p>`}
      <div class="overlay-actions"><button class="btn primary" data-primary>Another round</button><a class="btn" href="../arcade.html">More games</a></div>`, { onPrimary: begin });
  }

  game.update = (dt) => {
    if (!s || s.over) return;
    s.t += dt; s.reload = Math.max(0, s.reload - dt);
    // held keys adjust aim smoothly
    const k = game.keys;
    if (k.has("ArrowUp") || k.has("w") || k.has("W")) aim.angle = clamp(aim.angle + 30 * dt, 15, 75);
    if (k.has("ArrowDown") || k.has("s") || k.has("S")) aim.angle = clamp(aim.angle - 30 * dt, 15, 75);
    if (k.has("ArrowRight") || k.has("d") || k.has("D")) aim.power = clamp(aim.power + 0.4 * dt, 0.2, 1);
    if (k.has("ArrowLeft") || k.has("a") || k.has("A")) aim.power = clamp(aim.power - 0.4 * dt, 0.2, 1);
    if (k.size) syncUi();
    const b = s.ball; if (!b) return;
    b.t += dt; b.prevY = b.y;
    b.vx += s.wind * dt * 0.9; b.vy += G * dt; b.vx *= 1 - 0.05 * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    s.trail.push([b.x, b.y]); if (s.trail.length > 24) s.trail.shift();
    const hp = hivePos(), left = hp.x - s.hive.w / 2, right = hp.x + s.hive.w / 2;
    // rims
    for (const rx of [left, right]) {
      const dx = b.x - rx, dy = b.y - hp.y, d = Math.hypot(dx, dy);
      if (d < BALL_R + 5) { const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny; if (dot < 0) { b.vx -= 1.6 * dot * nx; b.vy -= 1.6 * dot * ny; b.x = rx + nx * (BALL_R + 5.5); b.y = hp.y + ny * (BALL_R + 5.5); Sound.tone({ f: 600, dur: 0.04, type: "square", vol: 0.05 }); } }
    }
    // through the opening, falling down
    if (!b.scored && b.vy > 0 && b.prevY < hp.y && b.y >= hp.y && b.x > left + 6 && b.x < right - 6) { b.scored = true; return resolve(true, Math.abs(b.x - hp.x) < 15); }
    // ground
    if (b.y > GROUND - BALL_R) { b.y = GROUND - BALL_R; b.vy *= -0.45; b.vx *= 0.7; b.bounces++; if (b.bounces > 2 || Math.abs(b.vy) < 60) return resolve(false); }
    if (b.x > W + 40 || b.x < -40 || b.t > 6) return resolve(false);
  };

  /* ---------------- Rendering ---------------- */
  game.render = (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0b1220"); g.addColorStop(1, "#070a0e");
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    // field backdrop: flowers and grass (BIOBUZZ theme)
    for (let i = 0; i < 14; i++) { const x = (i * 73 + 40) % W, h = 30 + (i * 37) % 50; ctx.strokeStyle = "#1a3a2a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.quadraticCurveTo(x + 6, GROUND - h / 2, x, GROUND - h); ctx.stroke(); ctx.fillStyle = ["#3a2a52", "#4a2a3a", "#2a3a52"][i % 3]; ctx.beginPath(); ctx.arc(x, GROUND - h, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#0e151d"; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = C.steel; ctx.fillRect(0, GROUND, W, 3);
    if (!s) return;
    // wind meter
    ctx.fillStyle = "rgba(7,10,14,0.7)"; roundRect(ctx, W / 2 - 110, 18, 220, 40, 10); ctx.fill();
    ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = C.dim; ctx.fillText("WIND", W / 2, 34);
    const wl = clamp(s.wind / 150, -1, 1) * 80;
    ctx.strokeStyle = Math.abs(s.wind) > 80 ? C.amber : C.surge2; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(W / 2, 46); ctx.lineTo(W / 2 + wl, 46); ctx.stroke();
    if (Math.abs(wl) > 4) { ctx.beginPath(); ctx.moveTo(W / 2 + wl, 46); ctx.lineTo(W / 2 + wl - Math.sign(wl) * 8, 40); ctx.moveTo(W / 2 + wl, 46); ctx.lineTo(W / 2 + wl - Math.sign(wl) * 8, 52); ctx.stroke(); }
    // hive
    const hp = hivePos(), hw = s.hive.w;
    ctx.save(); ctx.translate(hp.x, hp.y);
    ctx.fillStyle = "#2a1f0c"; ctx.strokeStyle = C.amber; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-hw / 2, 0); ctx.lineTo(hw / 2, 0); ctx.lineTo(hw / 2 - 14, 70); ctx.lineTo(-hw / 2 + 14, 70); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5;
    for (let y = 16; y < 70; y += 16) { ctx.beginPath(); ctx.moveTo(-hw / 2 + y * 0.2 + 4, y); ctx.lineTo(hw / 2 - y * 0.2 - 4, y); ctx.stroke(); }
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(game.time * 5); ctx.fillStyle = C.ok; ctx.fillRect(-15, -3, 30, 6); ctx.globalAlpha = 1;
    ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(-hw / 2, 0, 5, 0, Math.PI * 2); ctx.arc(hw / 2, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = '700 11px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = C.amber; ctx.fillText("HIVE", 0, 44);
    ctx.restore();
    // aim preview (first part of the arc)
    if (!s.ball && s.balls > 0) {
      let [x, y] = muzzle(), [vx, vy] = velocity();
      ctx.fillStyle = "rgba(132,205,255,0.7)";
      const dots = s.D < 0.9 ? 30 : s.D > 1.2 ? 10 : 18;
      for (let i = 0; i < dots; i++) { const dt = 0.02; for (let k = 0; k < 2; k++) { vx += s.wind * dt * 0.9; vy += G * dt; x += vx * dt; y += vy * dt; } if (i % 2 === 0) { ctx.globalAlpha = 1 - i / dots; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); } }
      ctx.globalAlpha = 1;
    }
    // robot + shooter
    const a = aim.angle * Math.PI / 180;
    ctx.save(); ctx.translate(LAUNCH.x, LAUNCH.y); ctx.rotate(-a);
    ctx.fillStyle = "#4a5b70"; roundRect(ctx, -6, -9, 44, 18, 6); ctx.fill(); ctx.fillStyle = C.surge; ctx.fillRect(30, -9, 6, 18);
    ctx.restore();
    ctx.save(); ctx.translate(LAUNCH.x, LAUNCH.y); ctx.rotate(game.time * (8 + aim.power * 30));
    ctx.strokeStyle = C.surge2; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 1.5); ctx.stroke(); ctx.restore();
    drawBot(ctx, LAUNCH.x - 10, GROUND - 32, 64, { look: 1, glow: 12 });
    // reload bar
    if (s.reload > 0) { ctx.fillStyle = "#16202b"; roundRect(ctx, LAUNCH.x - 40, GROUND + 14, 80, 6, 3); ctx.fill(); ctx.fillStyle = C.surge; roundRect(ctx, LAUNCH.x - 40, GROUND + 14, 80 * (1 - s.reload / 0.6), 6, 3); ctx.fill(); }
    // pollen left
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i < s.balls ? C.amber : "#1a2431"; ctx.beginPath(); ctx.arc(30 + i * 20, GROUND + 40, 6, 0, Math.PI * 2); ctx.fill(); }
    // ball + trail
    s.trail.forEach(([x, y], i) => { ctx.globalAlpha = i / s.trail.length * 0.4; ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(x, y, BALL_R * 0.6, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    if (s.ball) { ctx.fillStyle = C.amber; ctx.shadowColor = C.amber; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    // readout
    ctx.font = '600 12px "JetBrains Mono", monospace'; ctx.textAlign = "left"; ctx.fillStyle = C.muted;
    ctx.fillText(`HOOD ${Math.round(aim.angle)}°   FLYWHEEL ${Math.round(lerp(1800, 6000, aim.power))} RPM`, 24, 36);
    game.particles.draw(ctx); game.floaters.draw(ctx);
  };

  /* ---------------- Controls (keys + sliders) ---------------- */
  const ui = document.getElementById("aim-ui");
  ui.innerHTML = `
    <label class="aim-slider"><span>Hood angle <b data-v="angle"></b></span><input type="range" min="15" max="75" step="1" data-k="angle"></label>
    <label class="aim-slider"><span>Flywheel speed <b data-v="power"></b></span><input type="range" min="20" max="100" step="1" data-k="power"></label>
    <button class="btn primary aim-fire" type="button" data-fire>Launch</button>`;
  function syncUi() {
    ui.querySelector('[data-k="angle"]').value = Math.round(aim.angle); ui.querySelector('[data-k="power"]').value = Math.round(aim.power * 100);
    ui.querySelector('[data-v="angle"]').textContent = `${Math.round(aim.angle)}°`; ui.querySelector('[data-v="power"]').textContent = `${Math.round(lerp(1800, 6000, aim.power))} RPM`;
  }
  ui.querySelector('[data-k="angle"]').addEventListener("input", (e) => { aim.angle = +e.target.value; syncUi(); });
  ui.querySelector('[data-k="power"]').addEventListener("input", (e) => { aim.power = +e.target.value / 100; syncUi(); });
  ui.querySelector("[data-fire]").addEventListener("click", () => { Sound.ensure(); fire(); });
  game.onKey = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); fire(); } };
  syncUi();

  function begin() { newRound(); game.start(); }
  game.setHudBest(game.best()?.label ?? "—");
  game.setMessage("Aim with ↑ ↓ (hood) and ← → (flywheel speed), then press Space to launch.");
  game.showOverlay(`<span class="kicker">Steel Surge Arcade</span><h2>Flywheel</h2>
    <p>Our robot scores by launching balls with a spinning flywheel and an adjustable hood. Now it's your turn: tune the angle and speed, read the wind, and land pollen in the hive. You get 10 shots per round.</p>
    <div class="keys"><span class="kbd">↑↓</span><span style="color:#67768a;font-size:13px;align-self:center">hood</span><span class="kbd">←→</span><span style="color:#67768a;font-size:13px;align-self:center">speed</span><span class="kbd">Space</span><span style="color:#67768a;font-size:13px;align-self:center">launch</span></div>
    <div class="overlay-actions"><button class="btn primary" data-primary>Start round</button></div>`, { onPrimary: begin });
})();
