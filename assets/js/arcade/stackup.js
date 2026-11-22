/* ==========================================================================
   STACK UP — the robot's linear slide sweeps a game piece back and forth.
   Drop it on the stack: whatever hangs over the edge gets trimmed off.
   Land it dead-center for a perfect drop and keep the tower wide.
   ========================================================================== */
(() => {
  "use strict";
  const { Game, Sound, COLORS: C, drawBot, roundRect, clamp, lerp, rand, pick, level } = window.Arcade;
  const W = 960, H = 540, BH = 24, BASE_Y = 448, BW0 = 250, MIN_X = 170, MAX_X = W - 170;
  const PIECE_COLORS = [C.surge, C.amber, C.violet, C.ok, "#ff8a3d"];

  const game = new Game({ id: "stackup", width: W, height: H });
  game.difficultyNote = "Higher levels sweep faster, speed up sooner, and need more precise drops to count as perfect. Super Easy and Easy also widen the stack again after perfect drops.";
  let s;

  function newRun() {
    s = {
      blocks: [{ x: W / 2 - BW0 / 2, w: BW0, color: C.steelHi, flash: 0 }],
      moving: null, falling: [], score: 0, combo: 0, bestCombo: 0, perfects: 0, camY: 0, over: false, t: 0, dropT: 0,
      tol: pick([12, 8, 6, 4.5, 3.5]), base: pick([150, 195, 240, 285, 330]), ramp: pick([2.2, 3, 4, 5, 6.5]), regrow: pick([14, 8, 0, 0, 0]),
    };
    spawn(); updateHud();
  }
  const topBlock = () => s.blocks[s.blocks.length - 1];
  const rowY = (i) => BASE_Y - (i + 1) * BH; // top edge of block i (block 0 is the base)

  function spawn() {
    const top = topBlock(), n = s.blocks.length, fromLeft = n % 2 === 1;
    const speed = Math.min(720, s.base + (n - 1) * s.ramp * 10);
    s.moving = { x: fromLeft ? MIN_X - top.w * 0.4 : MAX_X - top.w * 0.6, w: top.w, dir: fromLeft ? 1 : -1, speed, color: PIECE_COLORS[n % PIECE_COLORS.length] };
  }

  function drop() {
    if (!game.running || game.paused || !s || s.over || !s.moving || s.dropT > 0) return;
    const m = s.moving, prev = topBlock();
    const left = Math.max(m.x, prev.x), right = Math.min(m.x + m.w, prev.x + prev.w), overlap = right - left;
    const y = rowY(s.blocks.length);
    s.dropT = 0.08;
    if (overlap <= 0) { // missed completely
      s.falling.push({ x: m.x, y, w: m.w, vx: m.dir * 60, vy: 0, rot: 0, vr: m.dir * 2.5, color: m.color });
      s.moving = null; Sound.boom(); game.shake(10);
      return setTimeout(endRun, 800);
    }
    const perfect = Math.abs(m.x - prev.x) <= s.tol;
    let x = left, w = overlap;
    if (perfect) {
      x = prev.x; w = prev.w; s.combo++; s.perfects++; s.bestCombo = Math.max(s.bestCombo, s.combo);
      if (s.combo >= 3 && s.regrow) { const grow = Math.min(s.regrow, BW0 - w); x -= grow / 2; w += grow; }
      Sound.tone({ f: 520 + Math.min(s.combo, 8) * 70, f2: 900 + Math.min(s.combo, 8) * 90, dur: 0.12, type: "triangle", vol: 0.12 });
      game.particles.burst(x + w / 2, y + BH / 2, { n: 18 + s.combo * 2, color: m.color, speed: 220, life: 0.6, gravity: 200, spread: Math.PI, angle: -Math.PI / 2 });
      game.floaters.add(s.combo > 1 ? `PERFECT ×${s.combo}` : "PERFECT", x + w / 2, y - 18, C.ok, 20);
    } else {
      s.combo = 0;
      // trimmed piece falls away
      const cut = m.x < prev.x ? { x: m.x, w: prev.x - m.x } : { x: prev.x + prev.w, w: m.x + m.w - (prev.x + prev.w) };
      if (cut.w > 0.5) s.falling.push({ x: cut.x, y, w: cut.w, vx: (m.x < prev.x ? -1 : 1) * 80, vy: -40, rot: 0, vr: (m.x < prev.x ? -1 : 1) * rand(2, 4), color: m.color });
      Sound.thud(); game.shake(3);
    }
    s.blocks.push({ x, w, color: m.color, flash: perfect ? 1 : 0.4 });
    s.score = s.blocks.length - 1;
    const h = s.score;
    if (h >= 10) game.trophy("su-10"); if (h >= 25) game.trophy("su-25"); if (h >= 50) game.trophy("su-50");
    if (s.combo >= 5) game.trophy("su-perfect");
    if (level() === 4 && h >= 20) game.trophy("su-extreme");
    if (h % 10 === 0) { game.floaters.add(`${h} HIGH`, W / 2, rowY(s.blocks.length - 1) - 30, C.amber, 24); Sound.win(); }
    s.moving = null; updateHud();
    setTimeout(() => { if (!s.over) spawn(); }, 120);
  }

  function endRun() {
    if (s.over) return; s.over = true; game.stop();
    const h = s.score, rec = game.submitBest(h, `${h} high`);
    game.showOverlay(`<span class="kicker">Tower down</span><h2>${h >= 40 ? "Sky-high!" : h >= 20 ? "Great stack" : h >= 10 ? "Nice build" : "Keep stacking"}</h2>
      <div class="big-score">${h}</div><p>pieces stacked · ${s.perfects} perfect drop${s.perfects === 1 ? "" : "s"} · best combo ${s.bestCombo} · ${window.Arcade.levelName()}</p>
      ${rec ? '<span class="record">New personal best</span>' : `<p>Best: ${game.best()?.label ?? "—"}</p>`}
      <div class="overlay-actions"><button class="btn primary" data-primary>Stack again</button><a class="btn" href="../arcade.html">More games</a></div>`, { onPrimary: begin });
  }
  function updateHud() { game.setHud("height", String(s.score)); game.setHud("combo", s.combo ? `×${s.combo}` : "0"); game.setHud("width", `${Math.round(topBlock().w / BW0 * 100)}%`); }

  game.update = (dt) => {
    if (!s) return;
    s.t += dt; s.dropT = Math.max(0, s.dropT - dt);
    const m = s.moving;
    if (m && !s.over) {
      m.x += m.dir * m.speed * dt;
      if (m.x + m.w > MAX_X + m.w * 0.5) { m.x = MAX_X - m.w * 0.5; m.dir = -1; }
      if (m.x < MIN_X - m.w * 0.5) { m.x = MIN_X - m.w * 0.5; m.dir = 1; }
    }
    for (const f of s.falling) { f.vy += 1400 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; }
    s.falling = s.falling.filter((f) => f.y < H + 600 + s.camY);
    for (const b of s.blocks) b.flash = Math.max(0, b.flash - dt * 2.2);
    const target = Math.max(0, (s.blocks.length - 9) * BH);
    s.camY = lerp(s.camY, target, 1 - Math.pow(0.002, dt));
  };

  /* ---------------- Rendering ---------------- */
  function piece(ctx, x, y, w, color, flash = 0) {
    const g = ctx.createLinearGradient(0, y, 0, y + BH); g.addColorStop(0, "#3a4a5e"); g.addColorStop(1, "#1b2633");
    ctx.fillStyle = g; roundRect(ctx, x, y + 1, w, BH - 2, 5); ctx.fill();
    ctx.fillStyle = color; roundRect(ctx, x, y + 1, w, 6, 4); ctx.fill();
    if (w > 30) { ctx.globalAlpha = 0.25; ctx.fillStyle = "#fff"; for (let k = x + 12; k < x + w - 8; k += 24) { ctx.beginPath(); ctx.arc(k, y + BH / 2 + 3, 2.5, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
    if (flash > 0) { ctx.globalAlpha = flash * 0.7; ctx.fillStyle = "#fff"; roundRect(ctx, x, y + 1, w, BH - 2, 5); ctx.fill(); ctx.globalAlpha = 1; }
  }

  game.render = (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a111c"); g.addColorStop(1, "#06090d");
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    const cam = s ? s.camY : 0;
    // height markers on the back wall
    ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = "left";
    for (let i = 0; i < 400; i += 5) {
      const y = rowY(i) + cam; if (y < -30 || y > H) continue;
      ctx.strokeStyle = i % 10 === 0 ? "#1d2a39" : "#121b26"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      if (i % 10 === 0 && i) { ctx.fillStyle = "#3a4a5e"; ctx.fillText(`${i}`, 18, y - 4); }
    }
    ctx.save(); ctx.translate(0, cam);
    // ground + robot base
    ctx.fillStyle = "#0e151d"; ctx.fillRect(-20, BASE_Y, W + 40, 400); ctx.fillStyle = C.steel; ctx.fillRect(-20, BASE_Y, W + 40, 3);
    drawBot(ctx, W / 2, BASE_Y + 48, 120, { glow: 14 });
    if (s) {
      s.blocks.forEach((b, i) => piece(ctx, b.x, rowY(i), b.w, i ? b.color : C.steelHi, b.flash));
      for (const f of s.falling) { ctx.save(); ctx.translate(f.x + f.w / 2, f.y + BH / 2); ctx.rotate(f.rot); piece(ctx, -f.w / 2, -BH / 2, f.w, f.color); ctx.restore(); }
      const m = s.moving;
      if (m) {
        const y = rowY(s.blocks.length), railY = Math.min(y - 70, rowY(s.blocks.length) - 70);
        // linear slide rail and carriage
        ctx.fillStyle = "#1b2633"; roundRect(ctx, MIN_X - 40, railY - 6, MAX_X - MIN_X + 80, 12, 6); ctx.fill();
        ctx.strokeStyle = "#2d3b4c"; ctx.lineWidth = 2; ctx.stroke();
        const cx = m.x + m.w / 2;
        ctx.strokeStyle = C.steelHi; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 14, railY + 6); ctx.lineTo(cx - 10, y); ctx.moveTo(cx + 14, railY + 6); ctx.lineTo(cx + 10, y); ctx.stroke();
        ctx.fillStyle = C.surge; roundRect(ctx, cx - 22, railY - 9, 44, 18, 6); ctx.fill();
        // drop guide
        if (level() <= 1) { ctx.globalAlpha = 0.18; ctx.fillStyle = m.color; const p = topBlock(); ctx.fillRect(p.x, y, p.w, BH); ctx.globalAlpha = 1; }
        piece(ctx, m.x, y, m.w, m.color);
      }
    }
    game.particles.draw(ctx); game.floaters.draw(ctx);
    ctx.restore();
  };

  /* ---------------- Input ---------------- */
  game.onKey = (e) => { if ((e.key === " " || e.key === "Enter" || e.key === "ArrowDown") && !game.overlayOpen()) { e.preventDefault(); drop(); } };
  game.stage.addEventListener("pointerdown", (e) => { if (e.target.closest(".overlay") || game.overlayOpen()) return; e.preventDefault(); Sound.ensure(); drop(); });

  function begin() { newRun(); game.start(); game.setMessage("Press Space or tap to drop. Land it dead-center for a perfect drop."); }
  game.setHudBest(game.best()?.label ?? "—");
  game.setMessage("Stack game pieces as high as you can. Overhangs get trimmed off.");
  game.showOverlay(`<span class="kicker">Steel Surge Arcade</span><h2>Stack Up</h2>
    <p>Our robot's linear slide sweeps a game piece back and forth above the stack. Drop it at the right moment: anything hanging over the edge gets trimmed off, so the tower narrows. Land it dead-center for a perfect drop.</p>
    <div class="keys"><span class="kbd">Space</span><span style="color:#67768a;font-size:13px;align-self:center">or tap to drop</span></div>
    <div class="overlay-actions"><button class="btn primary" data-primary>Start stacking</button></div>`, { onPrimary: begin });
})();
