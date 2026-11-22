/* ==========================================================================
   WIRE UP — rotate wire tiles until the battery powers every part.
   Each board starts as a real, working circuit (a random spanning tree)
   that gets scrambled, so every puzzle is guaranteed to be solvable.
   ========================================================================== */
(() => {
  "use strict";
  const { Game, Sound, COLORS: C, roundRect, clamp, store, Settings } = window.Arcade;
  const W = 760, H = 760;
  const N = 1, E = 2, S = 4, Wd = 8, DIRS = [[N, 0, -1, S], [E, 1, 0, Wd], [S, 0, 1, N], [Wd, -1, 0, E]];
  const rot = (m) => ((m << 1) | (m >> 3)) & 15;
  // One board size per difficulty level (shared with the arcade-wide setting)
  const DIFF = {
    superEasy: { size: 4, wrap: false, label: "Super Easy" }, easy: { size: 5, wrap: false, label: "Easy" }, medium: { size: 7, wrap: false, label: "Medium" },
    hard: { size: 9, wrap: true, label: "Hard" }, extreme: { size: 11, wrap: true, label: "Extreme" },
  };

  const game = new Game({ id: "wireup", width: W, height: H, pausable: false });
  game.puzzle = true;
  game.difficultyNote = "Sets the board size, from 4×4 on Super Easy to 11×11 on Extreme. On Hard and Extreme, wires can wrap around the edges.";
  const prog = store.get("ss-wireup", { solved: 0, byDiff: {} });
  prog.diff = Settings.difficulty in DIFF ? Settings.difficulty : "medium";
  /** Picking a board size here also changes the arcade-wide difficulty. */
  function setDiff(key) { Settings.difficulty = key; store.set("ss-arcade-settings", Settings); game._syncBadge?.(); }
  game.onDifficulty = () => { if (b) newBoard(Settings.difficulty); else { prog.diff = Settings.difficulty; renderDiff(); } };
  let b; // board

  function generate(diffKey) {
    const d = DIFF[diffKey], n = d.size, cells = Array(n * n).fill(0), seen = Array(n * n).fill(false);
    const at = (x, y) => y * n + x, center = at(n >> 1, n >> 1);
    const wrapXY = (x, y) => (d.wrap ? [(x + n) % n, (y + n) % n] : [x, y]);
    // Randomized Prim's: grows a spanning tree from the battery.
    const frontier = [];
    const addFrontier = (i) => { const x = i % n, y = (i / n) | 0; for (const [bit, dx, dy, opp] of DIRS) { const [nx, ny] = wrapXY(x + dx, y + dy); if (nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[at(nx, ny)]) frontier.push([i, at(nx, ny), bit, opp]); } };
    seen[center] = true; addFrontier(center);
    while (frontier.length) {
      const [from, to, bit, opp] = frontier.splice((Math.random() * frontier.length) | 0, 1)[0];
      if (seen[to]) continue;
      // Avoid 4-way crosses on small boards so pieces stay readable.
      const deg = (m) => [N, E, S, Wd].filter((q) => m & q).length;
      if (deg(cells[from]) >= 3 && Math.random() < 0.7 && frontier.some(([f, t]) => !seen[t] && f !== from)) { frontier.push([from, to, bit, opp]); continue; }
      seen[to] = true; cells[from] |= bit; cells[to] |= opp; addFrontier(to);
    }
    const solution = cells.slice();
    // Scramble every tile; make sure the start isn't already solved.
    let tiles;
    do { tiles = solution.map((m) => { let r = m; const k = (Math.random() * 4) | 0; for (let i = 0; i < k; i++) r = rot(r); return r; }); } while (isSolved(tiles, n, d.wrap, center));
    const par = solution.reduce((a, m, i) => { let r = tiles[i], k = 0; while (r !== m && k < 4) { r = rot(r); k++; } const opts = [k, (4 - k) % 4]; if (m === (N | S) || m === (E | Wd)) opts.push(k % 2); if (m === 15) opts.push(0); return a + Math.min(...opts); }, 0);
    return { n, wrap: d.wrap, diff: diffKey, tiles, center, angle: tiles.map(() => 0), moves: 0, par, done: false, powered: [], leaves: solution.map((m) => [N, E, S, Wd].filter((q) => m & q).length === 1) };
  }

  function powerMap(tiles, n, wrap, center) {
    const on = Array(n * n).fill(false), q = [center]; on[center] = true;
    while (q.length) {
      const i = q.pop(), x = i % n, y = (i / n) | 0;
      for (const [bit, dx, dy, opp] of DIRS) {
        if (!(tiles[i] & bit)) continue;
        let nx = x + dx, ny = y + dy; if (wrap) { nx = (nx + n) % n; ny = (ny + n) % n; }
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        const j = ny * n + nx; if (!on[j] && tiles[j] & opp) { on[j] = true; q.push(j); }
      }
    }
    return on;
  }
  function isSolved(tiles, n, wrap, center) { return powerMap(tiles, n, wrap, center).every(Boolean); }

  function newBoard(diffKey = prog.diff) {
    prog.diff = diffKey; store.set("ss-wireup", prog);
    b = generate(diffKey); b.powered = powerMap(b.tiles, b.n, b.wrap, b.center);
    game.setHud("moves", "0"); game.setHud("size", DIFF[diffKey].label); game.setHud("solved", String(prog.solved));
    game.setMessage(`${DIFF[diffKey].label} circuit${b.wrap ? " · wires can wrap around the edges" : ""} · power every motor. Fewest possible turns: ${b.par}.`);
    renderDiff(); game.start();
  }

  function rotateAt(i, dir = 1) {
    if (!b || b.done || i === undefined) return;
    for (let k = 0; k < (dir > 0 ? 1 : 3); k++) b.tiles[i] = rot(b.tiles[i]);
    b.angle[i] = -dir * Math.PI / 2; b.moves++;
    const before = b.powered.filter(Boolean).length;
    b.powered = powerMap(b.tiles, b.n, b.wrap, b.center);
    const after = b.powered.filter(Boolean).length;
    Sound.tone({ f: after > before ? 700 : 420, dur: 0.05, type: "triangle", vol: 0.07 });
    game.setHud("moves", String(b.moves));
    if (b.powered.every(Boolean)) solved();
  }

  function solved() {
    b.done = true; prog.solved++; prog.byDiff[b.diff] = (prog.byDiff[b.diff] || 0) + 1; store.set("ss-wireup", prog);
    store.set("ss-arcade-wireup", { value: prog.solved, label: `${prog.solved} solved` });
    game.setHud("solved", String(prog.solved)); game.setHudBest(`${prog.solved}`);
    game.trophy("wu-first"); if (b.moves <= b.par) game.trophy("wu-par"); if (prog.solved >= 10) game.trophy("wu-10"); if (b.diff === "hard" || b.diff === "extreme") game.trophy("wu-hard"); if (b.diff === "extreme") game.trophy("wu-extreme");
    Sound.win(); game.shake(3);
    const g = geo();
    b.leaves.forEach((leaf, i) => { if (leaf) { const [cx, cy] = cellXY(g, i); game.particles.burst(cx, cy, { n: 10, color: C.surge, speed: 160, life: 0.6, gravity: 0 }); } });
    setTimeout(() => {
      game.showOverlay(`<span class="kicker">Circuit complete</span><h2>It's alive!</h2><p>${b.moves} turns${b.moves <= b.par ? " · as few as possible!" : ` · fewest possible was ${b.par}`}</p><p>${prog.solved} circuit${prog.solved === 1 ? "" : "s"} powered so far.</p>
        <div class="overlay-actions"><button class="btn primary" data-primary>Next circuit</button></div>`, { onPrimary: () => newBoard(prog.diff) });
    }, 900);
  }

  /* ---------------- Rendering ---------------- */
  function geo() { const pad = 30, tile = Math.floor((W - pad * 2) / b.n); return { tile, x: (W - tile * b.n) / 2, y: (H - tile * b.n) / 2 }; }
  const cellXY = (g, i) => [g.x + ((i % b.n) + 0.5) * g.tile, g.y + (((i / b.n) | 0) + 0.5) * g.tile];

  game.update = (dt) => { if (b) b.angle = b.angle.map((a) => (Math.abs(a) < 0.01 ? 0 : a * Math.pow(0.0005, dt))); };

  game.render = (ctx) => {
    ctx.fillStyle = C.bg; ctx.fillRect(-20, -20, W + 40, H + 40);
    if (!b) return;
    const g = geo(), t = game.time;
    ctx.fillStyle = "#0b1117"; roundRect(ctx, g.x - 12, g.y - 12, g.tile * b.n + 24, g.tile * b.n + 24, 16); ctx.fill(); ctx.strokeStyle = b.wrap ? "rgba(255,181,71,0.45)" : C.line; ctx.lineWidth = 2; if (b.wrap) ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < b.n * b.n; i++) {
      const [cx, cy] = cellXY(g, i), s = g.tile, on = b.powered[i], m = b.tiles[i];
      ctx.fillStyle = on ? "#10202e" : "#0f1720"; roundRect(ctx, cx - s / 2 + 2, cy - s / 2 + 2, s - 4, s - 4, 8); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(b.angle[i]);
      const col = on ? C.surge : "#3a4859";
      ctx.strokeStyle = col; ctx.lineWidth = s * 0.14; ctx.lineCap = "round"; if (on) { ctx.shadowColor = C.surge; ctx.shadowBlur = 10; }
      for (const [bit, dx, dy] of DIRS) if (m & bit) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dx * s / 2, dy * s / 2); ctx.stroke(); }
      ctx.shadowBlur = 0;
      if (i === b.center) { // battery
        ctx.fillStyle = C.ok; roundRect(ctx, -s * 0.26, -s * 0.2, s * 0.52, s * 0.4, 6); ctx.fill(); ctx.fillStyle = "#04121f"; ctx.font = `700 ${s * 0.26}px "JetBrains Mono", monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("+", 0, 1); ctx.textBaseline = "alphabetic";
      } else if (b.leaves[i]) { // motor
        ctx.fillStyle = "#1b2633"; ctx.strokeStyle = on ? C.surge : "#4a5b70"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.rotate(on ? t * 8 : 0); ctx.strokeStyle = on ? C.surge2 : "#4a5b70"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-s * 0.12, 0); ctx.lineTo(s * 0.12, 0); ctx.moveTo(0, -s * 0.12); ctx.lineTo(0, s * 0.12); ctx.stroke();
      } else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, s * 0.09, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    game.particles.draw(ctx);
  };

  /* ---------------- Input ---------------- */
  function cellFromEvent(e) {
    const r = game.stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H, g = geo();
    const cx = Math.floor((x - g.x) / g.tile), cy = Math.floor((y - g.y) / g.tile);
    return cx >= 0 && cy >= 0 && cx < b.n && cy < b.n ? cy * b.n + cx : undefined;
  }
  game.stage.addEventListener("pointerdown", (e) => { if (e.target.closest(".overlay") || game.overlayOpen() || !b) return; e.preventDefault(); Sound.ensure(); rotateAt(cellFromEvent(e), e.button === 2 ? -1 : 1); });
  game.stage.addEventListener("contextmenu", (e) => e.preventDefault());
  game.onKey = (e) => { if ((e.key === "n" || e.key === "N") && !game.overlayOpen()) newBoard(prog.diff); };
  document.querySelector("[data-act=restart]")?.addEventListener("click", () => { Sound.select(); newBoard(prog.diff); });
  const pick = document.getElementById("diff-pick");
  function renderDiff() {
    pick.innerHTML = Object.entries(DIFF).map(([k, d]) => `<button type="button" class="chip" data-diff="${k}" aria-pressed="${prog.diff === k}">${d.label} · ${d.size}×${d.size}<span class="count">${prog.byDiff[k] || 0} solved</span></button>`).join("");
    pick.querySelectorAll("[data-diff]").forEach((btn) => btn.addEventListener("click", () => { Sound.select(); game.hideOverlay(); setDiff(btn.dataset.diff); newBoard(btn.dataset.diff); }));
  }
  renderDiff();

  game.setHudBest(prog.solved ? String(prog.solved) : "—"); game.setHud("solved", String(prog.solved));
  game.showOverlay(`<span class="kicker">Steel Surge Arcade</span><h2>Wire Up</h2>
    <p>Every robot needs good wiring. Tap tiles to rotate them until the battery powers every motor on the board. Every circuit has a solution.</p>
    <div class="overlay-actions"><button class="btn primary" data-primary>Start wiring</button></div>`, { onPrimary: () => newBoard(prog.diff) });
})();
