/* ==========================================================================
   SIGNAL LOST — a dark factory maze. Ping to reveal the walls, but every
   ping draws the security drones toward where you were.
   ========================================================================== */
(() => {
  "use strict";
  const { Game, Sound, COLORS: C, drawBot, roundRect, clamp, lerp, rand } = window.Arcade;
  const W = 960, H = 540, TS = 46, LIGHT = 1.9, PING_MAX = 7.5, PING_SPEED = 15, PING_COOLDOWN = 1.1, REVEAL_TIME = 3.2;

  const game = new Game({ id: "signal", width: W, height: H });
  game.difficultyNote = "Higher levels add more drones, and they move faster.";
  let s, joy = null;

  /* ---------------- Maze ---------------- */
  function makeMaze(cw, ch) {
    const tw = cw * 2 + 1, th = ch * 2 + 1;
    const g = Array.from({ length: th }, () => Array(tw).fill(1));
    const seen = Array.from({ length: ch }, () => Array(cw).fill(false));
    const stack = [[0, 0]]; seen[0][0] = true; g[1][1] = 0;
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy, dx, dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < cw && y < ch && !seen[y][x]);
      if (!n.length) { stack.pop(); continue; }
      const [nx, ny, dx, dy] = n[(Math.random() * n.length) | 0];
      seen[ny][nx] = true; g[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = 0; g[ny * 2 + 1][nx * 2 + 1] = 0; stack.push([nx, ny]);
    }
    // Knock out some extra walls so there are loops (escape routes).
    for (let i = 0; i < cw * ch * 0.14; i++) {
      const x = 1 + ((Math.random() * (tw - 2)) | 0), y = 1 + ((Math.random() * (th - 2)) | 0);
      if (g[y][x] === 1 && ((x % 2 === 0 && y % 2 === 1) || (x % 2 === 1 && y % 2 === 0))) g[y][x] = 0;
    }
    return { g, tw, th };
  }
  function bfs(m, sx, sy) {
    const d = Array.from({ length: m.th }, () => Array(m.tw).fill(-1)); d[sy][sx] = 0; const q = [[sx, sy]];
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (m.g[ny]?.[nx] === 0 && d[ny][nx] < 0) { d[ny][nx] = d[y][x] + 1; q.push([nx, ny]); } } }
    return d;
  }
  function pathTo(m, sx, sy, tx, ty) {
    const d = bfs(m, tx, ty); if (d[sy]?.[sx] < 0) return [];
    const out = []; let x = sx, y = sy;
    while (!(x === tx && y === ty)) { let best = null; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = d[y + dy]?.[x + dx]; if (v >= 0 && v < d[y][x] && (!best || v < best[2])) best = [x + dx, y + dy, v]; } if (!best) break; x = best[0]; y = best[1]; out.push([x, y]); }
    return out;
  }

  function newFloor() {
    const f = s.floor, cw = Math.min(8 + f * 2, 20), ch = Math.min(5 + f, 12);
    const m = makeMaze(cw, ch);
    const dist = bfs(m, 1, 1);
    const cells = []; for (let y = 1; y < m.th; y += 2) for (let x = 1; x < m.tw; x += 2) cells.push([x, y, dist[y][x]]);
    const isDead = ([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => m.g[y + dy][x + dx] === 0).length === 1;
    const far = cells.slice().sort((a, b) => b[2] - a[2]);
    const exit = far[0];
    const candidates = cells.filter((c) => c !== exit && c[2] > 6).sort((a, b) => (isDead(b) - isDead(a)) || b[2] - a[2]);
    const cores = [];
    for (const c of candidates) { if (cores.length >= 3) break; if (cores.every((k) => Math.abs(k[0] - c[0]) + Math.abs(k[1] - c[1]) > 6)) cores.push(c); }
    while (cores.length < 3) cores.push(candidates[cores.length * 3] || far[1 + cores.length]);
    const D = window.Arcade.diff(), droneCount = Math.max(1, Math.min(1 + f + window.Arcade.pick([-2, -1, 0, 1, 2]), 9));
    const spots = cells.filter((c) => c[2] > 10).sort(() => Math.random() - 0.5).slice(0, droneCount);
    s.maze = m; s.reveal = Array.from({ length: m.th }, () => Array(m.tw).fill(-99)); s.seen = Array.from({ length: m.th }, () => Array(m.tw).fill(false));
    s.px = 1.5; s.py = 1.5; s.exit = exit; s.cores = cores.map(([x, y]) => ({ x, y, got: false })); s.got = 0;
    s.drones = spots.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5, path: [], mode: "patrol", prev: null, revealT: -99, searchT: 0, speedK: (1 + f * 0.06) * D }));
    s.ping = null; s.cool = 0; s.floorT = 0; s.decoys = 2; s.decoy = null; s.pings = 0; game.setHud("decoys", "2");
    game.setHud("floor", String(f)); updateCores();
    game.setMessage(f === 1 ? "Press Space (or Ping) to light up the walls. Find 3 data cores, then the exit." : `Floor ${f}: ${droneCount} drone${droneCount > 1 ? "s" : ""} on patrol.`);
  }
  const updateCores = () => game.setHud("cores", `${s.got}/3`);

  function newRun() { s = { floor: 1, score: 0, t: 0, dead: false }; newFloor(); game.setHud("score", "0"); }

  /* ---------------- Update ---------------- */
  const wall = (x, y) => s.maze.g[Math.floor(y)]?.[Math.floor(x)] !== 0;
  function moveCircle(x, y, dx, dy, r) {
    let nx = x + dx;
    if (wall(nx + Math.sign(dx) * r, y - r * 0.9) || wall(nx + Math.sign(dx) * r, y + r * 0.9)) nx = dx > 0 ? Math.floor(nx + r) - r - 0.001 : Math.floor(nx - r) + 1 + r + 0.001;
    let ny = y + dy;
    if (wall(nx - r * 0.9, ny + Math.sign(dy) * r) || wall(nx + r * 0.9, ny + Math.sign(dy) * r)) ny = dy > 0 ? Math.floor(ny + r) - r - 0.001 : Math.floor(ny - r) + 1 + r + 0.001;
    return [dx ? nx : x, dy ? ny : y];
  }

  function ping() {
    if (!game.running || game.paused || !s || s.dead || s.cool > 0) return;
    s.ping = { x: s.px, y: s.py, t: 0, hit: new Set() }; s.cool = PING_COOLDOWN; s.pings = (s.pings || 0) + 1; game.trophy("sl-ping");
    Sound.tone({ f: 1400, f2: 700, dur: 0.5, type: "sine", vol: 0.14 }); Sound.tone({ f: 700, f2: 350, dur: 0.6, type: "sine", vol: 0.06, delay: 0.08 });
    // Drones within earshot come to investigate.
    const tx = Math.floor(s.px), ty = Math.floor(s.py);
    s.drones.forEach((d) => {
      const dist = Math.hypot(d.x - s.px, d.y - s.py);
      if (dist < 9 + s.floor * 0.4) {
        d.mode = "hunt"; d.path = pathTo(s.maze, Math.floor(d.x), Math.floor(d.y), tx, ty);
        Sound.tone({ f: 200, f2: 420, dur: 0.25, type: "square", vol: 0.05, delay: 0.15 + dist * 0.02 });
      }
    });
  }

  game.update = (dt) => {
    if (!s || s.dead) return;
    s.t += dt; s.floorT += dt; s.cool = Math.max(0, s.cool - dt);
    // input
    let ix = 0, iy = 0; const k = game.keys;
    if (k.has("ArrowLeft") || k.has("a") || k.has("A")) ix--; if (k.has("ArrowRight") || k.has("d") || k.has("D")) ix++;
    if (k.has("ArrowUp") || k.has("w") || k.has("W")) iy--; if (k.has("ArrowDown") || k.has("s") || k.has("S")) iy++;
    if (joy && joy.active) { ix = joy.vx; iy = joy.vy; }
    const len = Math.hypot(ix, iy);
    if (len > 0.05) { const sp = 3.4 * dt / Math.max(1, len); [s.px, s.py] = moveCircle(s.px, s.py, ix * sp, 0, 0.28); [s.px, s.py] = moveCircle(s.px, s.py, 0, iy * sp, 0.28); s.face = Math.atan2(iy, ix); }
    // ambient light marks tiles as seen
    const cx = Math.floor(s.px), cy = Math.floor(s.py);
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) if (s.seen[y]?.[x] !== undefined && Math.hypot(x + 0.5 - s.px, y + 0.5 - s.py) < LIGHT) s.seen[y][x] = true;
    // ping ring reveals as it passes
    if (s.ping) {
      s.ping.t += dt; const r = s.ping.t * PING_SPEED;
      const x0 = Math.floor(s.ping.x - r - 1), x1 = Math.ceil(s.ping.x + r + 1), y0 = Math.floor(s.ping.y - r - 1), y1 = Math.ceil(s.ping.y + r + 1);
      for (let y = Math.max(0, y0); y < Math.min(s.maze.th, y1); y++) for (let x = Math.max(0, x0); x < Math.min(s.maze.tw, x1); x++) {
        const d = Math.hypot(x + 0.5 - s.ping.x, y + 0.5 - s.ping.y);
        if (d <= r && d <= PING_MAX && s.reveal[y][x] < s.t - 0.05 && !s.ping.hit.has(y * 999 + x)) { s.ping.hit.add(y * 999 + x); s.reveal[y][x] = s.t; s.seen[y][x] = true; }
      }
      s.drones.forEach((dr) => { if (Math.hypot(dr.x - s.ping.x, dr.y - s.ping.y) <= Math.min(r, PING_MAX)) dr.revealT = Math.max(dr.revealT, s.t); });
      if (r > PING_MAX + 1) s.ping = null;
    }
    // drones
    for (const d of s.drones) {
      if (!d.path.length) {
        if (d.mode === "hunt") { d.mode = "search"; d.searchT = 2.2; }
        const tx = Math.floor(d.x), ty = Math.floor(d.y);
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [tx + dx, ty + dy]).filter(([x, y]) => s.maze.g[y][x] === 0);
        const fwd = opts.filter(([x, y]) => !(d.prev && d.prev[0] === x && d.prev[1] === y));
        const next = (fwd.length ? fwd : opts)[(Math.random() * (fwd.length || opts.length)) | 0];
        if (next) { d.prev = [tx, ty]; d.path = [next]; }
      }
      if (d.mode === "search") { d.searchT -= dt; if (d.searchT <= 0) d.mode = "patrol"; }
      const speed = (d.mode === "hunt" ? 3.0 : d.mode === "search" ? 2.0 : 1.5) * d.speedK;
      const [tx, ty] = d.path[0], gx = tx + 0.5, gy = ty + 0.5, dx = gx - d.x, dy = gy - d.y, dl = Math.hypot(dx, dy);
      if (dl < speed * dt) { d.x = gx; d.y = gy; d.prev = d.mode === "hunt" ? null : d.prev; d.path.shift(); }
      else { d.x += dx / dl * speed * dt; d.y += dy / dl * speed * dt; }
      const pd = Math.hypot(d.x - s.px, d.y - s.py);
      if (pd < 0.55) return caught(d);
      if (pd < 4) { d.beep = (d.beep || 0) - dt; if (d.beep <= 0) { Sound.tone({ f: 880, dur: 0.04, type: "square", vol: 0.03 + (4 - pd) * 0.012 }); d.beep = 0.15 + pd * 0.18; } }
    }
    // cores + exit
    for (const c of s.cores) if (!c.got && Math.hypot(c.x + 0.5 - s.px, c.y + 0.5 - s.py) < 0.6) {
      c.got = true; s.got++; s.score += 100; Sound.pickup(); updateCores();
      const [sx, sy] = toScreen(c.x + 0.5, c.y + 0.5); game.particles.burst(sx, sy, { n: 24, color: C.amber, speed: 220, life: 0.7, gravity: 0 }); game.floaters.add("+100 CORE", sx, sy - 16, C.amber, 18);
      if (s.got === 3) { game.setMessage("All cores collected. The exit is unlocked. Get out!"); Sound.tone({ f: 523, f2: 1046, dur: 0.4, type: "triangle", vol: 0.12 }); }
    }
    if (s.got === 3 && Math.hypot(s.exit[0] + 0.5 - s.px, s.exit[1] + 0.5 - s.py) < 0.6) {
      const bonus = 300 + s.floor * 50 + Math.max(0, Math.round(120 - s.floorT) * 2);
      s.score += bonus; Sound.win(); game.floaters.add(`FLOOR CLEAR +${bonus}`, W / 2, H / 2 - 40, C.ok, 26); game.shake(4);
      if ((s.pings || 0) <= 3) game.trophy("sl-quiet");
      s.floor++; game.trophy("sl-floor"); if (s.floor >= 5) game.trophy("sl-5"); if (s.floor >= 3 && window.Arcade.level() === 4) game.trophy("sl-extreme"); newFloor();
    }
    game.setHud("score", s.score.toLocaleString());
  };

  function caught(d) {
    s.dead = true; Sound.boom(); game.shake(14);
    const [sx, sy] = toScreen(s.px, s.py);
    game.particles.burst(sx, sy, { n: 40, color: C.surge, speed: 360, life: 1, size: 4 }); game.particles.burst(sx, sy, { n: 20, color: C.danger, speed: 260, life: 0.8 });
    const isRecord = game.submitBest(s.score, `${s.score.toLocaleString()} pts`);
    setTimeout(() => Sound.gameOver(), 800);
    setTimeout(() => {
      game.stop();
      game.showOverlay(`<span class="kicker">Signal lost</span><h2>A drone found you</h2><div class="big-score">${s.score.toLocaleString()}</div>
        <p>Reached floor ${s.floor} · ${s.got}/3 cores on this floor</p>
        ${isRecord ? '<span class="record">New personal best</span>' : `<p>Best: ${game.best()?.label ?? "—"}</p>`}
        <div class="overlay-actions"><button class="btn primary" data-primary>Reboot and try again</button><a class="btn" href="../arcade.html">More games</a></div>`, { onPrimary: begin });
    }, 800);
  }

  /* ---------------- Rendering ---------------- */
  let cam = { x: 0, y: 0 };
  const toScreen = (x, y) => [(x - cam.x) * TS + W / 2, (y - cam.y) * TS + H / 2];

  game.render = (ctx) => {
    ctx.fillStyle = "#030508"; ctx.fillRect(-20, -20, W + 40, H + 40);
    if (!s) { drawBot(ctx, W / 2, H / 2, 60, { color: C.surge, glow: 30 }); return; }
    const m = s.maze;
    cam.x = clamp(s.px, W / 2 / TS, m.tw - W / 2 / TS); cam.y = clamp(s.py, H / 2 / TS, m.th - H / 2 / TS);
    if (m.tw * TS < W) cam.x = m.tw / 2; if (m.th * TS < H) cam.y = m.th / 2;
    const x0 = Math.max(0, Math.floor(cam.x - W / 2 / TS) - 1), x1 = Math.min(m.tw, Math.ceil(cam.x + W / 2 / TS) + 1);
    const y0 = Math.max(0, Math.floor(cam.y - H / 2 / TS) - 1), y1 = Math.min(m.th, Math.ceil(cam.y + H / 2 / TS) + 1);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const dl = Math.hypot(x + 0.5 - s.px, y + 0.5 - s.py);
      const light = clamp((LIGHT + 0.6 - dl) / 1.1, 0, 1);
      const rv = clamp(1 - (s.t - s.reveal[y][x]) / REVEAL_TIME, 0, 1);
      const a = Math.max(light, rv, s.seen[y][x] ? 0.07 : 0);
      if (a <= 0.01) continue;
      const [sx, sy] = toScreen(x, y);
      if (m.g[y][x] === 1) {
        ctx.globalAlpha = a; const tint = rv > light ? "#2a4d6e" : "#2b3745";
        ctx.fillStyle = tint; ctx.fillRect(sx + 1, sy + 1, TS - 2, TS - 2);
        ctx.fillStyle = rv > light ? "rgba(132,205,255,0.5)" : "rgba(255,255,255,0.08)"; ctx.fillRect(sx + 1, sy + 1, TS - 2, 3);
      } else {
        ctx.globalAlpha = a * 0.6; ctx.strokeStyle = "#16212c"; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, TS - 1, TS - 1);
      }
    }
    ctx.globalAlpha = 1;
    // beacons: cores and exit glow faintly through the dark
    const beacon = (x, y, col, r, pulse) => { const [sx, sy] = toScreen(x + 0.5, y + 0.5); const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); ctx.globalAlpha = 0.35 + 0.25 * pulse; ctx.fillStyle = gr; ctx.fillRect(sx - r * 3, sy - r * 3, r * 6, r * 6); ctx.globalAlpha = 1; return [sx, sy]; };
    for (const c of s.cores) {
      if (c.got) continue;
      const [sx, sy] = beacon(c.x, c.y, "rgba(255,181,71,0.9)", 9, Math.sin(game.time * 3 + c.x));
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(game.time * 1.5); ctx.fillStyle = C.amber; ctx.shadowColor = C.amber; ctx.shadowBlur = 12; ctx.fillRect(-6, -6, 12, 12); ctx.restore();
    }
    { const open = s.got === 3, [sx, sy] = beacon(s.exit[0], s.exit[1], open ? "rgba(61,220,151,0.9)" : "rgba(103,118,138,0.5)", 12, open ? Math.sin(game.time * 5) : 0);
      ctx.strokeStyle = open ? C.ok : C.dim; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, 13 + (open ? Math.sin(game.time * 4) * 2 : 0), 0, Math.PI * 2); ctx.stroke();
      if (!open) { ctx.font = '600 10px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = C.dim; ctx.fillText("LOCKED", sx, sy + 30); } }
    // decoy
    if (s.decoy) { s.decoy.t += 1 / 60; const [dx, dy] = toScreen(s.decoy.x, s.decoy.y), on = Math.sin(game.time * 14) > 0; ctx.fillStyle = on ? C.amber : "#6b4a14"; ctx.beginPath(); ctx.arc(dx, dy, 7, 0, Math.PI * 2); ctx.fill(); if (on) { ctx.strokeStyle = "rgba(255,181,71,0.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dx, dy, 14 + (game.time * 30) % 20, 0, Math.PI * 2); ctx.stroke(); } }
    // ping ring
    if (s.ping) { const r = Math.min(s.ping.t * PING_SPEED, PING_MAX), [sx, sy] = toScreen(s.ping.x, s.ping.y); ctx.strokeStyle = `rgba(132,205,255,${clamp(1 - r / PING_MAX, 0, 1) * 0.8})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, r * TS, 0, Math.PI * 2); ctx.stroke(); }
    // drones
    for (const d of s.drones) {
      const dl = Math.hypot(d.x - s.px, d.y - s.py), light = clamp((LIGHT + 0.6 - dl) / 1.1, 0, 1), rv = clamp(1 - (s.t - d.revealT) / 1.6, 0, 1), near = clamp((4.2 - dl) / 4.2, 0, 1) * 0.5;
      const a = Math.max(light, rv, near); if (a < 0.02) continue;
      const [sx, sy] = toScreen(d.x, d.y), hunting = d.mode === "hunt";
      ctx.globalAlpha = a;
      ctx.fillStyle = "#1a0f12"; ctx.strokeStyle = hunting ? C.danger : "#c24a4a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.danger; ctx.shadowColor = C.danger; ctx.shadowBlur = hunting ? 20 : 10; ctx.beginPath(); ctx.arc(sx, sy, hunting ? 6 : 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      for (let i = 0; i < 4; i++) { const an = game.time * 9 + i * Math.PI / 2; ctx.strokeStyle = "rgba(255,93,93,0.4)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + Math.cos(an) * 17, sy + Math.sin(an) * 17); ctx.lineTo(sx + Math.cos(an) * 22, sy + Math.sin(an) * 22); ctx.stroke(); }
      if (hunting) { ctx.font = '700 14px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = C.danger; ctx.fillText("!", sx, sy - 24); }
      ctx.globalAlpha = 1;
    }
    // player light + robot
    { const [sx, sy] = toScreen(s.px, s.py), gr = ctx.createRadialGradient(sx, sy, 4, sx, sy, LIGHT * TS); gr.addColorStop(0, "rgba(59,168,255,0.14)"); gr.addColorStop(1, "rgba(59,168,255,0)");
      ctx.fillStyle = gr; ctx.fillRect(sx - LIGHT * TS, sy - LIGHT * TS, LIGHT * TS * 2, LIGHT * TS * 2);
      if (!s.dead) {
        drawBot(ctx, sx, sy, 26, { color: C.surge, glow: 14, look: Math.cos(s.face || 0) > 0.3 ? 1 : Math.cos(s.face || 0) < -0.3 ? -1 : 0 });
        // ping cooldown ring
        if (s.cool > 0) { ctx.strokeStyle = "rgba(132,205,255,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - s.cool / PING_COOLDOWN)); ctx.stroke(); }
      }
    }
    // joystick indicator
    if (joy?.active) { ctx.globalAlpha = 0.35; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 40, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(joy.ox + joy.vx * 30, joy.oy + joy.vy * 30, 14, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.globalAlpha = 1; }
    game.particles.draw(ctx); game.floaters.draw(ctx);
    // vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.6)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  };

  /* ---------------- Input ---------------- */
  /** Decoy: drop a beeping lure. Nearby drones go investigate it instead of you. */
  function decoy() {
    if (!game.running || game.paused || !s || s.dead || s.decoys <= 0) return;
    s.decoys--; game.setHud("decoys", String(s.decoys));
    s.decoy = { x: s.px, y: s.py, t: 0 };
    const tx = Math.floor(s.px), ty = Math.floor(s.py);
    Sound.tone({ f: 600, f2: 900, dur: 0.2, type: "square", vol: 0.07 });
    setTimeout(() => {
      if (!s?.decoy) return;
      Sound.tone({ f: 1200, f2: 600, dur: 0.4, type: "square", vol: 0.08 });
      s.drones.forEach((d) => { if (Math.hypot(d.x - s.decoy.x, d.y - s.decoy.y) < 11) { d.mode = "hunt"; d.path = pathTo(s.maze, Math.floor(d.x), Math.floor(d.y), tx, ty); } });
    }, 1200);
  }
  game.onKey = (e) => { if (e.key === " " || e.key === "Shift") { e.preventDefault(); ping(); } else if (e.key === "e" || e.key === "E" || e.key === "x" || e.key === "X") decoy(); };
  document.querySelectorAll("[data-act=decoy]").forEach((b) => b.addEventListener("pointerdown", (e) => { e.preventDefault(); Sound.ensure(); decoy(); }));
  document.querySelectorAll("[data-act=ping]").forEach((b) => b.addEventListener("pointerdown", (e) => { e.preventDefault(); Sound.ensure(); ping(); }));
  const stage = game.stage;
  const toLocal = (e) => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".overlay") || !game.running) return;
    const [x, y] = toLocal(e); joy = { id: e.pointerId, ox: x, oy: y, vx: 0, vy: 0, active: true, t: performance.now() }; stage.setPointerCapture?.(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!joy || e.pointerId !== joy.id) return;
    const [x, y] = toLocal(e), dx = x - joy.ox, dy = y - joy.oy, l = Math.hypot(dx, dy);
    const k = l < 8 ? 0 : Math.min(1, l / 50); joy.vx = l ? (dx / l) * k : 0; joy.vy = l ? (dy / l) * k : 0;
  });
  const endJoy = (e) => { if (!joy || e.pointerId !== joy.id) return; if (performance.now() - joy.t < 180 && Math.hypot(joy.vx, joy.vy) < 0.2) ping(); joy = null; };
  stage.addEventListener("pointerup", endJoy); stage.addEventListener("pointercancel", endJoy);
  game.onPause = () => { joy = null; };

  function begin() { newRun(); game.start(); }

  game.setHudBest(game.best()?.label ?? "—");
  game.showOverlay(`
    <span class="kicker">Steel Surge Arcade</span>
    <h2>Signal Lost</h2>
    <p>Surge is lost in a dark factory. Ping to light up the walls around you, but every ping can be heard, and the security drones will come looking. Grab 3 data cores, then find the exit.</p>
    <div class="keys"><span class="kbd">←↑↓→</span><span style="color:#67768a;font-size:13px;align-self:center">move</span><span class="kbd">Space</span><span style="color:#67768a;font-size:13px;align-self:center">ping</span><span style="color:#67768a;font-size:13px;align-self:center">· touch: drag to move, tap to ping</span></div>
    <div class="overlay-actions"><button class="btn primary" data-primary>Enter the factory</button></div>`, { onPrimary: begin });
})();
