/* ==========================================================================
   PIT CREW — robots roll into the pit between matches with broken parts.
   Pick the right tool for each fault before the match timer runs out.
   ========================================================================== */
(() => {
  "use strict";
  const { Game, Sound, COLORS: C, drawBot, roundRect, clamp, lerp, rand, ease } = window.Arcade;
  const W = 960, H = 540, STAND_X = 480, STAND_Y = 330, BOT = 150;

  const TOOLS = [
    { id: "wrench", name: "Wrench", key: "1", color: C.amber, fault: "Loose bolt" },
    { id: "battery", name: "Battery", key: "2", color: C.ok, fault: "Dead battery" },
    { id: "wire", name: "Wire", key: "3", color: C.danger, fault: "Cut wire" },
    { id: "laptop", name: "Laptop", key: "4", color: C.violet, fault: "Code bug" },
  ];
  // Where faults appear on the robot (relative to its center, in robot-size units)
  const SPOTS = [[-0.42, 0.32], [0.42, 0.32], [0.0, -0.62], [-0.28, -0.05], [0.28, -0.05], [0.0, 0.3]];

  const game = new Game({ id: "pitcrew", width: W, height: H });
  let s;

  function newRun() {
    s = { score: 0, fixed: 0, combo: 1, bestCombo: 1, strikes: 0, t: 0, bot: null, queue: [], over: false, flash: 0, toolHit: -1, toolHitT: 0 };
    s.queue = [makeBot(), makeBot(), makeBot()];
    nextBot();
    updateHud();
  }

  function makeBot() {
    const n = s ? s.fixed : 0;
    const faults = clamp(1 + Math.floor(n / 4) + (Math.random() < 0.3 ? 1 : 0), 1, 5);
    const spots = SPOTS.map((p, i) => i).sort(() => Math.random() - 0.5).slice(0, faults);
    const color = [C.surge, C.amber, C.violet, C.ok, "#ff8fb1"][(Math.random() * 5) | 0];
    return {
      faults: spots.map((sp) => ({ spot: sp, tool: (Math.random() * 4) | 0, fixed: false, fixT: 0 })),
      time: lerp(7.5, 3.2, clamp(n / 40, 0, 1)) + faults * lerp(1.1, 0.55, clamp(n / 40, 0, 1)),
      golden: n > 3 && Math.random() < 0.1,
      color,
    };
  }

  function nextBot() {
    const b = s.queue.shift(); s.queue.push(makeBot());
    b.max = b.time; b.x = -200; b.state = "in"; b.stateT = 0; b.bob = 0;
    s.bot = b;
    Sound.tone({ f: 220, f2: 330, dur: 0.18, type: "triangle", vol: 0.06 });
  }

  function useTool(i) {
    if (!game.running || game.paused || !s || s.over) return;
    s.toolHit = i; s.toolHitT = 0.18;
    const btn = document.querySelector(`[data-tool="${i}"]`); if (btn) { btn.classList.add("hit"); setTimeout(() => btn.classList.remove("hit"), 140); }
    const b = s.bot; if (!b || b.state !== "fix") return;
    const f = b.faults.find((x) => !x.fixed && x.tool === i);
    const [px, py] = spotXY(b, f ? f.spot : 5);
    if (f) {
      f.fixed = true; f.fixT = 0;
      const pts = 10 * s.combo * (b.golden ? 2 : 1);
      s.score += pts; s.combo = Math.min(8, s.combo + 1); s.bestCombo = Math.max(s.bestCombo, s.combo);
      Sound.tone({ f: 520 + s.combo * 60, f2: 900 + s.combo * 60, dur: 0.09, type: "triangle", vol: 0.1 });
      game.particles.burst(px, py, { n: 16, color: TOOLS[i].color, speed: 240, life: 0.5, gravity: 400, size: 3 });
      game.floaters.add(`+${pts}`, px, py - 10, TOOLS[i].color, 20);
      if (b.faults.every((x) => x.fixed)) finishBot();
    } else {
      b.time = Math.max(0, b.time - 1.2); s.combo = 1; s.flash = 0.25;
      Sound.tone({ f: 140, dur: 0.16, type: "square", vol: 0.1 }); game.shake(6);
      game.floaters.add("Wrong tool −1.2s", STAND_X, STAND_Y - 150, C.danger, 18);
    }
    updateHud();
  }

  function finishBot() {
    const b = s.bot; b.state = "out"; b.stateT = 0;
    const bonus = Math.round(b.time * 10) * (b.golden ? 2 : 1);
    s.score += bonus; s.fixed++;
    Sound.win();
    game.floaters.add(`Back on the field! +${bonus}`, STAND_X, STAND_Y - 170, C.ok, 22);
    updateHud();
  }

  function strike() {
    const b = s.bot; b.state = "tow"; b.stateT = 0; s.strikes++; s.combo = 1;
    Sound.tone({ f: 300, f2: 90, dur: 0.5, type: "sawtooth", vol: 0.12 }); game.shake(10);
    game.floaters.add("Missed the match!", STAND_X, STAND_Y - 170, C.danger, 24);
    updateHud();
    if (s.strikes >= 3) setTimeout(gameOver, 700);
  }

  function gameOver() {
    s.over = true; game.stop();
    const isRecord = game.submitBest(s.score, `${s.score.toLocaleString()} pts`);
    game.showOverlay(`
      <span class="kicker">Pit closed</span>
      <h2>${s.fixed >= 25 ? "Legendary pit crew" : s.fixed >= 12 ? "Solid shift" : "Rough day in the pit"}</h2>
      <div class="big-score">${s.score.toLocaleString()}</div>
      <p>${s.fixed} robot${s.fixed === 1 ? "" : "s"} sent back out · best combo ×${s.bestCombo}</p>
      ${isRecord ? '<span class="record">New personal best</span>' : `<p>Best: ${game.best()?.label ?? "—"}</p>`}
      <div class="overlay-actions"><button class="btn primary" data-primary>Open the pit again</button><a class="btn" href="../arcade.html">More games</a></div>`, { onPrimary: begin });
  }

  function updateHud() { game.setHud("score", s.score.toLocaleString()); game.setHud("fixed", String(s.fixed)); game.setHud("combo", `×${s.combo}`); }

  function spotXY(b, i) { const [sx, sy] = SPOTS[i]; return [b.x + sx * BOT, STAND_Y - BOT * 0.55 + sy * BOT]; }

  game.update = (dt) => {
    if (!s || s.over) return;
    s.t += dt; s.flash = Math.max(0, s.flash - dt); s.toolHitT = Math.max(0, s.toolHitT - dt);
    const b = s.bot; b.stateT += dt; b.bob += dt;
    b.faults.forEach((f) => (f.fixT += dt));
    if (b.state === "in") { b.x = lerp(-200, STAND_X, ease.outCubic(clamp(b.stateT / 0.45, 0, 1))); if (b.stateT >= 0.45) { b.state = "fix"; b.stateT = 0; } }
    else if (b.state === "fix") {
      b.time -= dt;
      if (b.time <= b.max * 0.25 && Math.floor(b.time * 4) !== Math.floor((b.time + dt) * 4)) Sound.warn();
      if (b.time <= 0) strike();
    } else if (b.state === "out" || b.state === "tow") {
      b.x = lerp(STAND_X, W + 220, ease.inOut(clamp(b.stateT / 0.5, 0, 1)));
      if (b.stateT >= 0.5 && s.strikes < 3) nextBot();
    }
  };

  /* ---------------- Rendering ---------------- */
  function drawTool(ctx, id, x, y, r, color) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = r * 0.16; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (id === "wrench") {
      ctx.rotate(-Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r * 0.7); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -r * 0.42, r * 0.3, Math.PI * 0.25, Math.PI * 1.75, true); ctx.stroke();
    } else if (id === "battery") {
      ctx.strokeRect(-r * 0.38, -r * 0.55, r * 0.76, r * 1.1); ctx.fillRect(-r * 0.16, -r * 0.7, r * 0.32, r * 0.15);
      ctx.beginPath(); ctx.moveTo(r * 0.06, -r * 0.35); ctx.lineTo(-r * 0.14, r * 0.04); ctx.lineTo(r * 0.12, r * 0.04); ctx.lineTo(-r * 0.06, r * 0.38); ctx.stroke();
    } else if (id === "wire") {
      ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.3); ctx.bezierCurveTo(-r * 0.3, -r * 0.6, r * 0.1, r * 0.6, r * 0.25, -r * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.4, -r * 0.35); ctx.lineTo(r * 0.7, -r * 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 0.33, -r * 0.22, r * 0.08, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeRect(-r * 0.5, -r * 0.45, r * 1.0, r * 0.65); ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.38); ctx.lineTo(r * 0.7, r * 0.38); ctx.stroke();
      ctx.font = `700 ${r * 0.42}px "JetBrains Mono", monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("</>", 0, -r * 0.12);
    }
    ctx.restore();
  }

  game.render = (ctx) => {
    // Pit background
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0c121a"); g.addColorStop(1, "#06090d");
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.strokeStyle = "#111a23"; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x < W; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = 0; y < H; y += 48) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
    // Pit banner + pegboard
    ctx.fillStyle = "#0f1720"; roundRect(ctx, 40, 30, W - 80, 64, 14); ctx.fill(); ctx.strokeStyle = C.line; ctx.stroke();
    ctx.font = '700 22px "Space Grotesk", system-ui'; ctx.textAlign = "left"; ctx.fillStyle = C.text; ctx.fillText("STEEL SURGE PIT", 64, 70);
    ctx.font = '600 12px "JetBrains Mono", monospace'; ctx.fillStyle = C.dim; ctx.fillText("TEAM 27254", 260, 70);
    // Strikes
    for (let i = 0; i < 3; i++) { const on = s && i < s.strikes; ctx.fillStyle = on ? C.danger : "#1a2431"; if (on) { ctx.shadowColor = C.danger; ctx.shadowBlur = 12; } ctx.beginPath(); ctx.arc(W - 150 + i * 34, 62, 11, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    ctx.textAlign = "right"; ctx.fillStyle = C.dim; ctx.fillText("STRIKES", W - 180, 67);
    // Queue (waiting robots)
    if (s) s.queue.slice(0, 2).forEach((q, i) => {
      const x = 90 + i * 70, y = STAND_Y + 40;
      drawBot(ctx, x, y + Math.sin(game.time * 2 + i) * 2, 46, { color: q.golden ? "#ffd36b" : q.color, alpha: 0.5, glow: 0 });
      ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = C.dim; ctx.fillText(`${q.faults.length} fix${q.faults.length > 1 ? "es" : ""}`, x, y + 44);
    });
    if (s) { ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = "left"; ctx.fillStyle = C.dim; ctx.fillText("UP NEXT", 66, STAND_Y - 16); }
    // Floor + stand
    ctx.fillStyle = "#0d141c"; ctx.fillRect(0, STAND_Y + 90, W, H); ctx.fillStyle = C.steel; ctx.fillRect(0, STAND_Y + 90, W, 3);
    ctx.fillStyle = "#1a2431"; roundRect(ctx, STAND_X - 150, STAND_Y + 16, 300, 22, 6); ctx.fill();
    ctx.fillRect(STAND_X - 120, STAND_Y + 38, 14, 52); ctx.fillRect(STAND_X + 106, STAND_Y + 38, 14, 52);
    ctx.fillStyle = C.amber; for (let i = 0; i < 10; i++) ctx.fillRect(STAND_X - 146 + i * 30, STAND_Y + 30, 14, 4);

    if (s?.bot) {
      const b = s.bot, y = STAND_Y - BOT * 0.55 + Math.sin(b.bob * 3) * 2;
      const col = b.golden ? "#ffd36b" : b.color;
      if (b.golden) { ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(game.time * 6); ctx.fillStyle = "#ffd36b"; ctx.beginPath(); ctx.arc(b.x, y, BOT * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      drawBot(ctx, b.x, y, BOT, { color: b.state === "tow" ? C.danger : col, glow: 16, look: b.state === "in" ? 1 : b.state === "fix" ? 0 : 1, hot: b.state === "tow" ? 0.4 : 0 });
      // Faults
      b.faults.forEach((f) => {
        const [fx, fy] = spotXY(b, f.spot), tool = TOOLS[f.tool];
        if (f.fixed) { if (f.fixT < 0.5) { ctx.globalAlpha = 1 - f.fixT / 0.5; ctx.strokeStyle = C.ok; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(fx, fy, 18 + f.fixT * 40, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; } return; }
        const p = 1 + 0.08 * Math.sin(game.time * 8 + f.spot);
        ctx.save(); ctx.translate(fx, fy); ctx.scale(p, p);
        ctx.fillStyle = "#0a0f15"; ctx.strokeStyle = tool.color; ctx.lineWidth = 3; ctx.shadowColor = tool.color; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();
        drawTool(ctx, tool.id, fx, fy, 15 * p, tool.color);
        // sparks from broken part
        if (Math.random() < 0.04) game.particles.burst(fx, fy, { n: 2, color: tool.color, speed: 120, life: 0.3, size: 2, gravity: 300 });
      });
      // Match timer
      if (b.state === "fix" || b.state === "in") {
        const k = clamp(b.time / b.max, 0, 1), bx = STAND_X - 160, by = STAND_Y + 60;
        ctx.fillStyle = "#16202b"; roundRect(ctx, bx, by, 320, 12, 6); ctx.fill();
        ctx.fillStyle = k < 0.25 ? C.danger : k < 0.5 ? C.amber : C.ok; roundRect(ctx, bx, by, Math.max(12, 320 * k), 12, 6); ctx.fill();
        ctx.font = '600 12px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = C.muted;
        ctx.fillText(`MATCH IN ${Math.max(0, b.time).toFixed(1)}s${b.golden ? "  ·  GOLDEN ×2" : ""}`, STAND_X, by + 32);
      }
    }
    game.particles.draw(ctx); game.floaters.draw(ctx);
    if (s?.flash > 0) { ctx.fillStyle = `rgba(255,93,93,${s.flash * 0.6})`; ctx.fillRect(0, 0, W, H); }
  };

  /* ---------------- Input ---------------- */
  const tray = document.getElementById("tool-tray");
  tray.innerHTML = TOOLS.map((t, i) => `<button type="button" class="tool-btn" data-tool="${i}" style="--tool:${t.color}" aria-label="${t.name} (key ${t.key})"><canvas width="64" height="64" aria-hidden="true"></canvas><span>${t.name}</span><kbd>${t.key}</kbd></button>`).join("");
  tray.querySelectorAll("canvas").forEach((cv, i) => { const x = cv.getContext("2d"); drawTool(x, TOOLS[i].id, 32, 32, 24, TOOLS[i].color); });
  tray.querySelectorAll("[data-tool]").forEach((b) => b.addEventListener("pointerdown", (e) => { e.preventDefault(); Sound.ensure(); useTool(+b.dataset.tool); }));
  game.onKey = (e) => { const i = ["1", "2", "3", "4"].indexOf(e.key); if (i >= 0) useTool(i); };

  function begin() { newRun(); game.start(); }

  game.setHudBest(game.best()?.label ?? "—");
  game.setMessage("Match each glowing fault to its tool: 1 wrench · 2 battery · 3 wire · 4 laptop.");
  game.showOverlay(`
    <span class="kicker">Steel Surge Arcade</span>
    <h2>Pit Crew</h2>
    <p>Robots roll into the pit between matches with broken parts. Grab the right tool for every glowing fault before the match timer runs out. Three missed matches and the pit closes.</p>
    <div class="keys"><span class="kbd">1</span><span class="kbd">2</span><span class="kbd">3</span><span class="kbd">4</span><span style="color:#67768a;font-size:13px;align-self:center">or tap the tools</span></div>
    <div class="overlay-actions"><button class="btn primary" data-primary>Open the pit</button></div>`, { onPrimary: begin });
})();
