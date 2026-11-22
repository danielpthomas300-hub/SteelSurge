/* ==========================================================================
   ODOMETRY — real robots track where they've driven with odometry pods.
   Here, you're the odometry: watch the robot drive a route, then drive the
   exact same route from memory. Every route you finish is one step longer.
   ========================================================================== */
(() => {
  "use strict";
  const { Game, Sound, COLORS: C, drawBot, roundRect, clamp, lerp, rand, pick, level, onSwipe, ease } = window.Arcade;
  const W = 960, H = 600, N = 6, TILE = 76, GX = (W - N * TILE) / 2, GY = 70;
  const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  const ARROW = { U: "↑", D: "↓", L: "←", R: "→" };

  const game = new Game({ id: "odometry", width: W, height: H, pausable: false });
  game.difficultyNote = "Higher levels play the route faster, start with longer routes, and give fewer strikes and replays. Super Easy leaves faint markers on the route while you drive.";
  let s;

  function newRun() {
    s = {
      len: pick([2, 3, 3, 4, 5]), strikes: 0, maxStrikes: pick([5, 4, 3, 2, 1]), replays: 0, maxReplays: pick([Infinity, 2, 1, 0, 0]),
      stepT: pick([0.8, 0.62, 0.48, 0.38, 0.3]), score: 0, best: 0, round: 0, phase: "idle", path: [], start: [0, 0], at: [0, 0], i: 0, t: 0,
      bot: { x: 0, y: 0, fx: 0, fy: 0, k: 1, dir: "R" }, trail: [], wrongAt: null, wrongT: 0, banner: "", bannerT: 0, over: false,
    };
    nextRound(false);
  }

  /** A self-avoiding random route of `len` moves that stays on the 6×6 field. */
  function makeRoute(len) {
    for (let tries = 0; tries < 400; tries++) {
      const start = [(Math.random() * N) | 0, (Math.random() * N) | 0], seen = new Set([start.join()]), path = [];
      let [x, y] = start, ok = true;
      for (let i = 0; i < len; i++) {
        const opts = Object.keys(DIRS).filter((d) => { const nx = x + DIRS[d][0], ny = y + DIRS[d][1]; return nx >= 0 && ny >= 0 && nx < N && ny < N && !seen.has(`${nx},${ny}`); });
        if (!opts.length) { ok = false; break; }
        // Prefer turns now and then so routes aren't just long straight lines
        const prev = path[path.length - 1], turny = opts.filter((d) => d !== prev);
        const pool = turny.length && Math.random() < 0.55 ? turny : opts, d = pool[(Math.random() * pool.length) | 0];
        x += DIRS[d][0]; y += DIRS[d][1]; seen.add(`${x},${y}`); path.push(d);
      }
      if (ok) return { start, path };
    }
    return makeRoute(Math.max(2, len - 1));
  }

  function place(x, y) { s.bot.x = s.bot.fx = x; s.bot.y = s.bot.fy = y; s.bot.k = 1; }
  function moveBot(x, y, d) { s.bot.fx = s.bot.x; s.bot.fy = s.bot.y; s.bot.x = x; s.bot.y = y; s.bot.k = 0; s.bot.dir = d; }

  function nextRound(grow = true) {
    if (grow) s.len++;
    s.round++; const r = makeRoute(Math.min(s.len, 24));
    s.path = r.path; s.start = r.start; s.at = r.start.slice(); s.i = 0; s.t = -0.6; s.trail = [r.start.slice()]; s.replays = 0;
    place(...r.start); s.phase = "show";
    game.setHud("route", String(s.path.length)); game.setHud("strikes", `${s.strikes}/${s.maxStrikes}`); game.setHud("score", String(s.score));
    game.setMessage(`Watch carefully: a ${s.path.length}-step route.`);
    Sound.select();
  }
  function replay() {
    if (s?.phase !== "input" || s.over) return;
    if (s.replays >= s.maxReplays) { game.setMessage(s.maxReplays ? "No replays left for this route." : `Replays are off on ${window.Arcade.levelName()}.`); return; }
    s.replays++; s.at = s.start.slice(); s.i = 0; s.t = -0.3; s.trail = [s.start.slice()]; place(...s.start); s.phase = "show";
    game.setMessage("Watch again…");
  }

  function input(d) {
    if (!s || s.over || s.phase !== "input" || !game.running) return;
    const want = s.path[s.i];
    if (d === want) {
      const [dx, dy] = DIRS[d]; s.at = [s.at[0] + dx, s.at[1] + dy]; s.i++; s.trail.push(s.at.slice());
      moveBot(s.at[0], s.at[1], d); Sound.tone({ f: 440 + s.i * 30, f2: 560 + s.i * 30, dur: 0.07, type: "triangle", vol: 0.08 });
      s.score += 1; game.setHud("score", String(s.score));
      if (s.i >= s.path.length) return routeDone();
    } else {
      s.strikes++; s.wrongAt = [s.at[0] + DIRS[d][0], s.at[1] + DIRS[d][1]]; s.wrongT = 0.6;
      Sound.tone({ f: 200, f2: 90, dur: 0.25, type: "sawtooth", vol: 0.1 }); game.shake(6);
      game.setHud("strikes", `${s.strikes}/${s.maxStrikes}`);
      if (s.strikes >= s.maxStrikes) return endRun();
      game.setMessage(`Wrong way. Strike ${s.strikes} of ${s.maxStrikes}. Watch the route again.`);
      s.phase = "wait"; setTimeout(() => { if (s && !s.over) { s.at = s.start.slice(); s.i = 0; s.t = -0.3; s.trail = [s.start.slice()]; place(...s.start); s.phase = "show"; } }, 700);
    }
  }

  function routeDone() {
    const len = s.path.length; s.best = Math.max(s.best, len); s.phase = "wait";
    s.banner = `${len}-STEP ROUTE`; s.bannerT = 1.2;
    const [cx, cy] = center(...s.at);
    game.particles.burst(cx, cy, { n: 30, color: C.ok, speed: 260, life: 0.7, gravity: 0 }); Sound.win();
    if (len >= 5) game.trophy("od-5"); if (len >= 10) game.trophy("od-10"); if (len >= 15) game.trophy("od-15"); if (level() === 4 && len >= 8) game.trophy("od-extreme");
    game.setMessage("Route complete! The next one is a step longer.");
    setTimeout(() => { if (s && !s.over) nextRound(true); }, 1100);
  }

  function endRun() {
    s.over = true; s.phase = "over"; game.stop();
    const rec = game.submitBest(s.best, `${s.best} steps`);
    setTimeout(() => game.showOverlay(`<span class="kicker">Out of strikes</span><h2>${s.best >= 12 ? "Perfect recall!" : s.best >= 8 ? "Sharp memory" : "Keep practicing"}</h2>
      <div class="big-score">${s.best}</div><p>longest route remembered · ${s.score} correct steps · ${window.Arcade.levelName()}</p>
      ${rec ? '<span class="record">New personal best</span>' : `<p>Best: ${game.best()?.label ?? "—"}</p>`}
      <div class="overlay-actions"><button class="btn primary" data-primary>Play again</button><a class="btn" href="../arcade.html">More games</a></div>`, { onPrimary: begin }), 700);
  }

  const center = (x, y) => [GX + x * TILE + TILE / 2, GY + y * TILE + TILE / 2];

  game.update = (dt) => {
    if (!s) return;
    s.bot.k = Math.min(1, s.bot.k + dt / 0.16);
    s.wrongT = Math.max(0, s.wrongT - dt); s.bannerT = Math.max(0, s.bannerT - dt);
    if (s.phase === "show") {
      s.t += dt;
      if (s.t >= s.stepT) {
        s.t -= s.stepT;
        if (s.i < s.path.length) {
          const d = s.path[s.i], [dx, dy] = DIRS[d]; s.at = [s.at[0] + dx, s.at[1] + dy]; s.i++; s.trail.push(s.at.slice());
          moveBot(s.at[0], s.at[1], d); Sound.tone({ f: 620, dur: 0.05, type: "sine", vol: 0.06 });
        } else {
          // Route shown: send the robot back to the start, then it's your turn
          s.phase = "input"; s.at = s.start.slice(); s.i = 0; s.trail = [s.start.slice()]; place(...s.start);
          game.setMessage(`Your turn: drive the ${s.path.length}-step route.${s.maxReplays > 0 ? " Press Q to watch it again." : ""}`);
          Sound.tone({ f: 880, dur: 0.08, type: "triangle", vol: 0.08, delay: 0.02 });
        }
      }
    }
  };

  /* ---------------- Rendering ---------------- */
  game.render = (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a111c"); g.addColorStop(1, "#06090d");
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    // field tiles
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#141c26" : "#111821"; roundRect(ctx, GX + x * TILE + 2, GY + y * TILE + 2, TILE - 4, TILE - 4, 8); ctx.fill();
    }
    ctx.strokeStyle = "#2d3b4c"; ctx.lineWidth = 3; roundRect(ctx, GX - 6, GY - 6, N * TILE + 12, N * TILE + 12, 14); ctx.stroke();
    if (!s) return;
    // start pad
    const [sx, sy] = center(...s.start);
    ctx.strokeStyle = C.ok; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); roundRect(ctx, sx - TILE / 2 + 8, sy - TILE / 2 + 8, TILE - 16, TILE - 16, 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '600 10px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = C.ok; ctx.fillText("START", sx, sy + TILE / 2 - 12);
    // Super Easy: faint markers along the whole route while you drive
    if (level() === 0 && s.phase === "input") {
      let [x, y] = s.start; ctx.fillStyle = "rgba(132,205,255,0.16)";
      for (const d of s.path) { x += DIRS[d][0]; y += DIRS[d][1]; const [cx, cy] = center(x, y); ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill(); }
    }
    // trail (route being shown, or what you've driven so far)
    const showing = s.phase === "show";
    ctx.strokeStyle = showing ? C.amber : C.surge; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = 0.7;
    ctx.beginPath(); s.trail.forEach(([x, y], i) => { const [cx, cy] = center(x, y); i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); }); ctx.stroke(); ctx.globalAlpha = 1;
    s.trail.forEach(([x, y], i) => { if (!i) return; const [cx, cy] = center(x, y); ctx.fillStyle = showing ? C.amber : C.surge; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill(); });
    // wrong move flash
    if (s.wrongT > 0 && s.wrongAt) {
      const [wx, wy] = s.wrongAt, inside = wx >= 0 && wy >= 0 && wx < N && wy < N;
      const [cx, cy] = inside ? center(wx, wy) : center(...s.at);
      ctx.globalAlpha = s.wrongT / 0.6; ctx.strokeStyle = C.danger; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(cx - 16, cy - 16); ctx.lineTo(cx + 16, cy + 16); ctx.moveTo(cx + 16, cy - 16); ctx.lineTo(cx - 16, cy + 16); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // robot (drawn with mecanum-style wheels and odometry pods)
    const k = ease.outCubic(s.bot.k), bx = lerp(center(s.bot.fx, 0)[0], center(s.bot.x, 0)[0], k), by = lerp(center(0, s.bot.fy)[1], center(0, s.bot.y)[1], k);
    ctx.fillStyle = "#4a5b70"; for (const [ox, oy] of [[-24, -20], [16, -20], [-24, 10], [16, 10]]) { roundRect(ctx, bx + ox, by + oy, 8, 12, 2); ctx.fill(); }
    drawBot(ctx, bx, by, 44, { color: showing ? C.amber : C.surge, glow: 14, look: s.bot.dir === "L" ? -1 : s.bot.dir === "R" ? 1 : 0 });
    // status
    ctx.font = '600 12px "JetBrains Mono", monospace'; ctx.textAlign = "center";
    ctx.fillStyle = showing ? C.amber : s.phase === "input" ? C.surge2 : C.dim;
    ctx.fillText(showing ? `WATCH · STEP ${s.i}/${s.path.length}` : s.phase === "input" ? `YOUR TURN · STEP ${s.i}/${s.path.length}` : "", W / 2, GY - 24);
    if (s.phase === "input" && Number.isFinite(s.maxReplays) && s.maxReplays > 0) { ctx.textAlign = "right"; ctx.fillStyle = C.dim; ctx.fillText(`REPLAYS ${s.maxReplays - s.replays}`, GX + N * TILE, GY + N * TILE + 30); }
    if (s.bannerT > 0) {
      ctx.globalAlpha = Math.min(1, s.bannerT * 3); ctx.fillStyle = "rgba(7,10,14,.85)"; roundRect(ctx, W / 2 - 170, H / 2 - 34, 340, 68, 14); ctx.fill();
      ctx.font = '700 26px "Space Grotesk", sans-serif'; ctx.textAlign = "center"; ctx.fillStyle = C.ok; ctx.fillText(s.banner, W / 2, H / 2 + 9); ctx.globalAlpha = 1;
    }
    game.particles.draw(ctx); game.floaters.draw(ctx);
  };

  /* ---------------- Input ---------------- */
  game.onKey = (e) => {
    if (game.overlayOpen()) return;
    const map = { ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R", w: "U", s: "D", a: "L", d: "R", W: "U", S: "D", A: "L", D: "R" };
    if (map[e.key]) { e.preventDefault(); input(map[e.key]); }
    else if (e.key === "q" || e.key === "Q") replay();
  };
  onSwipe(game.stage, (d) => { if (!game.overlayOpen()) input(d); });
  document.querySelectorAll(".dpad [data-dir]").forEach((b) => b.addEventListener("click", () => { if (!game.overlayOpen()) input(b.dataset.dir); }));
  document.querySelector("[data-act=replay]")?.addEventListener("click", () => { Sound.ensure(); replay(); });

  function begin() { newRun(); game.start(); }
  game.setHudBest(game.best()?.label ?? "—");
  game.setMessage("Watch the route, then drive it from memory.");
  game.showOverlay(`<span class="kicker">Steel Surge Arcade</span><h2>Odometry</h2>
    <p>Real robots use odometry pods to track exactly where they've driven. This time, your memory is the odometry. Watch the robot drive a route, then drive the same route yourself. Each route you finish is one step longer.</p>
    <div class="keys"><span class="kbd">←</span><span class="kbd">↑</span><span class="kbd">↓</span><span class="kbd">→</span><span style="color:#67768a;font-size:13px;align-self:center">drive (or swipe)</span><span class="kbd">Q</span><span style="color:#67768a;font-size:13px;align-self:center">replay</span></div>
    <div class="overlay-actions"><button class="btn primary" data-primary>Start</button></div>`, { onPrimary: begin });
})();
