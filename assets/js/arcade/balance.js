/* ==========================================================================
   BALANCE — keep the balancing platform level while game pieces rain down.
   Drive the robot along the beam to collect pieces and shift the weight.
   Tip too far, or let 3 pieces slide off the ends, and the run is over.
   ========================================================================== */
(() => {
  "use strict";
  const { Game, Sound, COLORS: C, drawBot, roundRect, clamp, lerp, rand, pick, level, diff } = window.Arcade;
  const W = 960, H = 540, PX = W / 2, PY = 360, HALF = 300, BOT_MASS = 4, MAX_TILT = 0.42;
  const KINDS = [
    { mass: 1, color: C.amber, r: 11, label: "Pollen", pts: 10 },
    { mass: 2, color: C.surge, r: 14, label: "Nectar", pts: 25 },
    { mass: 3, color: C.danger, r: 16, label: "Heavy", pts: 50 },
  ];

  const game = new Game({ id: "balance", width: W, height: H });
  game.difficultyNote = "Higher levels drop pieces faster, make heavy pieces more common, and make the platform more sensitive.";
  let s, dirHeld = 0;

  function newRun() {
    const D = diff();
    s = {
      D, t: 0, score: 0, collected: 0, lost: 0, combo: 0, over: false, overT: 0,
      th: 0, om: 0, u: 0, carryT: 0, pieces: [], spawnT: 1.2, dangerT: 0, levelT: 0,
      K: 0.00018 * D, slip: lerp(25, 110, (D - 0.55) / 1.05), every: pick([2.6, 2.0, 1.6, 1.25, 0.95]), heavy: pick([0.04, 0.08, 0.12, 0.18, 0.25]),
    };
    updateHud();
  }
  // Point on the beam's top surface at distance u from the pivot (the surface is 12 px above the beam's center line)
  const beamY = (u) => PY + Math.sin(s.th) * u - 12 * Math.cos(s.th);
  const beamX = (u) => PX + Math.cos(s.th) * u + 12 * Math.sin(s.th);

  function spawn() {
    const r = Math.random(), k = r < s.heavy ? 2 : r < s.heavy + 0.3 ? 1 : 0;
    const u = rand(-HALF + 30, HALF - 30) * (Math.random() < 0.6 ? 1 : 0.55);
    s.pieces.push({ ...KINDS[k], kind: k, u, x: PX + u, y: -30, vy: 0, landed: false, v: 0, warn: 0.6 });
  }

  function updateHud() {
    game.setHud("score", s.score.toLocaleString());
    game.setHud("time", `${Math.floor(s.t)}s`);
    game.setHud("lost", `${s.lost}/3`);
  }

  function endRun(why) {
    if (s.over) return; s.over = true; s.overT = 0; game.stop();
    const secs = Math.floor(s.t), rec = game.submitBest(s.score, `${s.score.toLocaleString()} pts`);
    setTimeout(() => game.showOverlay(`<span class="kicker">${why}</span><h2>${secs >= 90 ? "Steady hands!" : secs >= 45 ? "Well balanced" : "Keep it level"}</h2>
      <div class="big-score">${s.score.toLocaleString()}</div><p>${s.collected} pieces collected · ${secs} seconds · ${window.Arcade.levelName()}</p>
      ${rec ? '<span class="record">New personal best</span>' : `<p>Best: ${game.best()?.label ?? "—"}</p>`}
      <div class="overlay-actions"><button class="btn primary" data-primary>Try again</button><a class="btn" href="../arcade.html">More games</a></div>`, { onPrimary: begin }), 700);
  }

  game.update = (dt) => {
    if (!s || s.over) return;
    s.t += dt;
    // Spawning speeds up over time
    s.spawnT -= dt;
    if (s.spawnT <= 0) { spawn(); s.spawnT = Math.max(0.45, s.every * (1 - Math.min(0.5, s.t / 240))) * rand(0.75, 1.25); }
    // Robot: driver input plus a push downhill
    const k = game.keys, input = (k.has("ArrowLeft") || k.has("a") || k.has("A") ? -1 : 0) + (k.has("ArrowRight") || k.has("d") || k.has("D") ? 1 : 0) + dirHeld;
    s.u = clamp(s.u + (clamp(input, -1, 1) * 300 + Math.sin(s.th) * s.slip * 6) * dt, -HALF + 24, HALF - 24);
    // Platform physics: torque from every mass tips it; a weighted keel pulls it back
    let torque = BOT_MASS * s.u;
    for (const p of s.pieces) if (p.landed) torque += p.mass * p.u;
    const acc = torque * s.K * 9 - 3.2 * s.om - 6 * s.th;
    s.om += acc * dt; s.th += s.om * dt;
    // Landed pieces slide when the tilt is steep
    for (const p of s.pieces) {
      if (!p.landed) {
        p.warn = Math.max(0, p.warn - dt); if (p.warn > 0) continue;
        p.vy += 900 * dt; p.y += p.vy * dt; p.x = beamX(p.u);
        if (p.y + p.r >= beamY(p.u) && Math.abs(p.u) <= HALF) {
          p.landed = true; p.y = beamY(p.u) - p.r; Sound.thud(); game.shake(2 + p.mass);
          game.particles.burst(p.x, p.y + p.r, { n: 8, color: p.color, speed: 120, life: 0.4, gravity: 300, spread: Math.PI, angle: -Math.PI / 2, glow: false });
        }
      } else {
        if (Math.abs(s.th) > 0.07) p.v += Math.sin(s.th) * 520 * dt; p.v *= 1 - 2.2 * dt; p.u += p.v * dt;
        p.x = beamX(p.u); p.y = beamY(p.u) - p.r;
        if (Math.abs(p.u) > HALF + 4) { p.gone = true; s.lost++; s.combo = 0; Sound.tone({ f: 300, f2: 90, dur: 0.35, type: "sawtooth", vol: 0.08 }); game.floaters.add("Dropped!", clamp(p.x, 60, W - 60), PY - 60, C.danger, 18); updateHud(); if (s.lost >= 3) endRun("3 pieces dropped"); }
        else if (Math.abs(p.u - s.u) < 30 + p.r) { // collect
          p.gone = true; s.collected++; s.combo++;
          const pts = p.pts * (1 + Math.min(4, Math.floor(s.combo / 5)));
          s.score += pts; Sound.pickup(); game.floaters.add(`+${pts}`, p.x, p.y - 26, p.color, 18);
          game.particles.burst(p.x, p.y, { n: 14, color: p.color, speed: 180, life: 0.5, gravity: 0 });
          if (s.collected >= 10) game.trophy("ba-10");
        }
      }
    }
    s.pieces = s.pieces.filter((p) => !p.gone);
    // Balance bonus: points every second the platform is nearly level
    s.levelT += Math.abs(s.th) < 0.05 ? dt : 0;
    if (s.levelT >= 1) { s.levelT -= 1; s.score += 5; }
    // Tipping
    if (Math.abs(s.th) > MAX_TILT) { s.dangerT += dt; if (s.dangerT > 0.55) { Sound.boom(); game.shake(14); endRun("Tipped over"); } }
    else s.dangerT = Math.max(0, s.dangerT - dt * 2);
    if (s.t >= 60) game.trophy("ba-60"); if (s.score >= 500) game.trophy("ba-500"); if (level() === 4 && s.t >= 45) game.trophy("ba-extreme");
    if (Math.floor(s.t * 4) !== Math.floor((s.t - dt) * 4)) updateHud();
  };

  /* ---------------- Rendering ---------------- */
  game.render = (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0b1220"); g.addColorStop(1, "#06090d");
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.strokeStyle = "#111a25"; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = "#0e151d"; ctx.fillRect(0, 470, W, 80); ctx.fillStyle = C.steel; ctx.fillRect(0, 470, W, 3);
    // fulcrum
    ctx.fillStyle = "#1b2633"; ctx.strokeStyle = C.steelHi; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PX, PY - 6); ctx.lineTo(PX - 60, 470); ctx.lineTo(PX + 60, 470); ctx.closePath(); ctx.fill(); ctx.stroke();
    const th = s ? s.th : 0;
    // tilt gauge
    ctx.save(); ctx.translate(W / 2, 64);
    ctx.strokeStyle = "#1d2a39"; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(0, 40, 70, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    ctx.strokeStyle = C.ok; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 40, 70, Math.PI * 1.5 - 0.06, Math.PI * 1.5 + 0.06); ctx.stroke();
    const danger = Math.abs(th) / MAX_TILT;
    ctx.strokeStyle = danger > 1 ? C.danger : danger > 0.7 ? C.amber : C.surge2; ctx.lineWidth = 3;
    const ga = Math.PI * 1.5 + clamp(th / MAX_TILT, -1.15, 1.15) * Math.PI * 0.3;
    ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(Math.cos(ga) * 76, 40 + Math.sin(ga) * 76); ctx.stroke();
    ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = C.dim; ctx.fillText(`TILT ${(th * 180 / Math.PI).toFixed(0)}°`, 0, 56);
    ctx.restore();
    // beam
    ctx.save(); ctx.translate(PX, PY); ctx.rotate(th);
    const flash = s && s.dangerT > 0 ? 0.5 + 0.5 * Math.sin(game.time * 30) : 0;
    ctx.fillStyle = flash ? `rgba(255,93,93,${0.4 + flash * 0.4})` : "#2a3a4e"; roundRect(ctx, -HALF, -12, HALF * 2, 18, 6); ctx.fill();
    ctx.strokeStyle = C.steelHi; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.danger; ctx.fillRect(-HALF, -12, 8, 18); ctx.fillStyle = C.surge; ctx.fillRect(HALF - 8, -12, 8, 18);
    ctx.fillStyle = C.steelHi; ctx.beginPath(); ctx.arc(0, -3, 7, 0, Math.PI * 2); ctx.fill();
    if (s) drawBot(ctx, s.u, -12 - 24, 52, { glow: 12, look: dirHeld || (game.keys.has("ArrowLeft") ? -1 : game.keys.has("ArrowRight") ? 1 : 0.4) });
    ctx.restore();
    if (s) {
      for (const p of s.pieces) {
        if (!p.landed && p.warn > 0) { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(game.time * 20); ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(p.x, 24); ctx.lineTo(p.x - 8, 10); ctx.lineTo(p.x + 8, 10); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; continue; }
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        if (p.kind === 2) { roundRect(ctx, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2, 4); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
        ctx.shadowBlur = 0;
        if (p.mass > 1) { ctx.fillStyle = "#06090d"; ctx.font = '700 11px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.fillText(`×${p.mass}`, p.x, p.y + 4); }
      }
      // dropped-piece indicators
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < s.lost ? C.danger : "#1a2431"; ctx.beginPath(); ctx.arc(W - 40 - i * 22, 500, 7, 0, Math.PI * 2); ctx.fill(); }
      ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = "right"; ctx.fillStyle = C.dim; ctx.fillText("DROPPED", W - 100, 504);
    }
    game.particles.draw(ctx); game.floaters.draw(ctx);
  };

  /* ---------------- Input ---------------- */
  const tray = document.getElementById("bal-pad");
  if (tray) {
    tray.innerHTML = '<button class="pad-btn" type="button" data-dir="-1" aria-label="Drive left">◀ Left</button><button class="pad-btn" type="button" data-dir="1" aria-label="Drive right">Right ▶</button>';
    tray.querySelectorAll("[data-dir]").forEach((b) => {
      const d = +b.dataset.dir;
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); dirHeld = d; Sound.ensure(); });
      for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, () => { if (dirHeld === d) dirHeld = 0; });
    });
  }
  // Drag on the game to steer: robot heads toward your finger
  let dragId = null;
  const steer = (e) => { const r = game.stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W; if (!s) return; const target = (x - PX) / Math.cos(s.th); dirHeld = Math.abs(target - s.u) < 10 ? 0 : Math.sign(target - s.u); };
  game.stage.addEventListener("pointerdown", (e) => { if (e.target.closest(".overlay") || game.overlayOpen()) return; dragId = e.pointerId; steer(e); });
  game.stage.addEventListener("pointermove", (e) => { if (e.pointerId === dragId) steer(e); });
  for (const ev of ["pointerup", "pointercancel"]) game.stage.addEventListener(ev, (e) => { if (e.pointerId === dragId) { dragId = null; dirHeld = 0; } });
  game.onPause = () => { dirHeld = 0; };

  function begin() { newRun(); game.start(); game.setMessage("Drive with ← → to collect pieces and keep the platform level."); }
  game.setHudBest(game.best()?.label ?? "—");
  game.setMessage("Keep the platform level. Collect pieces before they slide off the ends.");
  game.showOverlay(`<span class="kicker">Steel Surge Arcade</span><h2>Balance</h2>
    <p>Your robot is parked on a balancing platform, and game pieces are falling onto it. Every piece adds weight. Drive over pieces to collect them, and use your robot's weight to keep the platform level. Tip too far, or let 3 pieces slide off, and it's over.</p>
    <div class="keys"><span class="kbd">←</span><span class="kbd">→</span><span style="color:#67768a;font-size:13px;align-self:center">drive (or drag)</span></div>
    <div class="overlay-actions"><button class="btn primary" data-primary>Start balancing</button></div>`, { onPrimary: begin });
})();
