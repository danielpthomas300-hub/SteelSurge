/* ==========================================================================
   ECHO — a time-loop puzzle. Each loop you record becomes a ghost robot
   that replays exactly what you did. Ghosts hold plates; plates open doors
   (and close barriers). Cooperate with your past selves to reach the exit.
   ========================================================================== */
(() => {
  "use strict";

  /* ---------------- Core rules (also loaded by the level checker in Node) ----------------
     Map legend:  #  wall      .  floor     S  start     E  exit
                  a b c  plates            A B C  doors: open while the matching plate is pressed
                  x y z  barriers: CLOSED while plate a / b / c is pressed
     A door or barrier also stays open while anything stands in it (no crushing).
     Each tick: door states come from where everyone stands at the start of the tick,
     ghosts replay their recorded positions, then the player moves (or waits).        */
  const LEVELS = [
    { name: "First Echo", T: 12, echoes: 1, hint: "Stand on the plate, then press R to rewind. Your echo will hold it for you.",
      map: ["#########", "#S..a####", "#.#######", "#.#######", "#...A..E#", "#########"], solution: "RRR|DDDRRRRRR" },
    { name: "Two Hands", T: 12, echoes: 2, hint: "Two doors, two plates. Space waits a tick — timing matters.",
      map: ["###########", "#a.......b#", "#.#######.#", "#....S....#", "#####A#####", "#####B#####", "#####E#####", "###########"], solution: "LLLLUU|RRRRUU|WWWWWWDDD" },
    { name: "Let Go", T: 10, echoes: 1, hint: "Red barriers close while their plate is pressed. Your echo has to step off.",
      map: ["###########", "#S..A..x.E#", "#.#########", "#a#########", "###########"], solution: "DDWU|RRRRRRRR" },
    { name: "Window", T: 12, echoes: 1, hint: "Get past the barrier before your echo lands on the plate.",
      map: ["############", "#S....x.A.E#", "#.##########", "#.##########", "#.##########", "#a##########", "############"], solution: "WDDDD|RRRRRRRRR" },
    { name: "Relay", T: 18, echoes: 3, hint: "Some plates are locked away. Echoes can open the path for other echoes.",
      map: ["#############", "#a....S....b#", "######A######", "######B######", "#c.....######", "######C######", "######E######", "#############"], solution: "LLLLL|RRRRR|WWWWWDDDLLLLL|WWWWWDDDWWWWWDD" },
    { name: "One Take", T: 16, echoes: 1, hint: "Only one echo this time. Make every step count.",
      map: ["###############", "#S..A..x..B..E#", "#.#############", "#.#############", "#a....b########", "###############"], solution: "DDDRRRRR|RRWRRRRRRRRRR" },
    { name: "Echo Chamber", T: 18, echoes: 2, hint: "Everything you've learned. Watch the barrier.",
      map: ["###############", "#S....y....B.E#", "#.#.###########", "#.#.A.....b####", "#a#############", "###############"], solution: "DDD|RRDDRRRRRRR|RRRRRRRRRWWRRR" },
  ];
  const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };

  function parse(def) {
    const L = { ...def, h: def.map.length, w: def.map[0].length, plates: [], doors: [] };
    def.map.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === "S") L.start = [x, y];
      else if (ch === "E") L.exit = [x, y];
      else if ("abc".includes(ch)) L.plates.push({ x, y, k: ch });
      else if ("ABC".includes(ch)) L.doors.push({ x, y, k: ch.toLowerCase(), inv: false });
      else if ("xyz".includes(ch)) L.doors.push({ x, y, k: "abc"["xyz".indexOf(ch)], inv: true });
    }));
    return L;
  }
  const same = (p, x, y) => p[0] === x && p[1] === y;
  const pressed = (L, k, robots) => L.plates.some((p) => p.k === k && robots.some((r) => same(r, p.x, p.y)));
  const doorOpen = (L, d, robots) => robots.some((r) => same(r, d.x, d.y)) || (d.inv ? !pressed(L, d.k, robots) : pressed(L, d.k, robots));
  const ghostAt = (g, t) => g[Math.min(t, g.length - 1)];
  function canEnter(L, x, y, robots) {
    if (x < 0 || y < 0 || x >= L.w || y >= L.h || L.map[y][x] === "#") return false;
    const d = L.doors.find((dd) => dd.x === x && dd.y === y);
    return !d || doorOpen(L, d, robots);
  }
  /** One tick for the player. Returns the new player position. */
  function step(L, ghosts, t, pos, act) {
    const robots = [...ghosts.map((g) => ghostAt(g, t)), pos];
    const [dx, dy] = DIRS[act];
    const nx = pos[0] + dx, ny = pos[1] + dy;
    return act !== "W" && canEnter(L, nx, ny, robots) ? [nx, ny] : pos;
  }
  /** Replays "loop|loop|..." and returns true if the final loop reaches the exit. */
  function verify(def, sol) {
    const L = parse(def), loops = sol.split("|");
    let ghosts = [];
    for (let i = 0; i < loops.length; i++) {
      let pos = L.start, trail = [pos];
      for (let t = 0; t < loops[i].length; t++) {
        if (t >= L.T) return false;
        pos = step(L, ghosts, t, pos, loops[i][t]); trail.push(pos);
        if (same(pos, ...L.exit)) return i === loops.length - 1;
      }
      ghosts.push(trail); if (ghosts.length > L.echoes) ghosts.shift();
    }
    return false;
  }
  /** True if the level can be beaten with NO echoes (it shouldn't be). */
  function solvableAlone(def) {
    const L = parse(def), seen = new Set(); let frontier = [L.start];
    for (let t = 0; t < L.T; t++) {
      const next = [];
      for (const p of frontier) for (const a of "UDLRW") {
        const n = step(L, [], t, p, a); if (same(n, ...L.exit)) return true;
        const k = `${n}`; if (!seen.has(k + t)) { seen.add(k + t); next.push(n); }
      }
      frontier = next;
    }
    return false;
  }
  const core = { LEVELS, parse, step, verify, solvableAlone, ghostAt, doorOpen, pressed };
  if (typeof window === "undefined") { module.exports = core; return; }

  /* ======================================================================
     Game
     ====================================================================== */
  const { Game, Sound, COLORS: C, drawBot, roundRect, clamp, ease, store, onSwipe } = window.Arcade;
  const W = 960, H = 620, TICK = 0.13;
  const KEY_COLORS = { a: C.surge, b: C.amber, c: C.violet };
  const game = new Game({ id: "echo", width: W, height: H, pausable: false });
  const prog = store.get("ss-echo-progress", { done: {}, last: 0 });
  const saveProg = () => {
    store.set("ss-echo-progress", prog);
    const n = Object.keys(prog.done).length;
    if (n) store.set("ss-arcade-echo", { value: n, label: `${n}/${LEVELS.length} levels` });
    game.setHudBest(n ? `${n}/${LEVELS.length}` : "—");
  };

  let L, li, ghosts, t, pos, trail, actions, anim, queue, won, loopCount, flashT;

  function load(i) {
    li = clamp(i, 0, LEVELS.length - 1); L = parse(LEVELS[li]);
    ghosts = []; loopCount = 1; won = false; prog.last = li; saveProg();
    resetLoop(); game.setMessage(L.hint);
    game.setHud("level", `${li + 1}/${LEVELS.length}`);
    game.start();
  }
  function resetLoop() { t = 0; pos = L.start.slice(); trail = [pos]; actions = ""; anim = null; queue = []; updateHud(); }
  function updateHud() { game.setHud("echoes", `${ghosts.length}/${L.echoes}`); game.setHud("loop", String(loopCount)); }

  function robotsAt(tt, p) { return [...ghosts.map((g) => ghostAt(g, tt)), p]; }

  function act(a) {
    if (won || !L) return;
    if (anim) { if (queue.length < 2) queue.push(a); return; }
    const prevGhosts = ghosts.map((g) => ghostAt(g, t)), prevPos = pos;
    const prevOpen = L.doors.map((d) => doorOpen(L, d, robotsAt(t, pos)));
    const np = step(L, ghosts, t, pos, a);
    const bumped = a !== "W" && np === pos;
    t++; pos = np; trail.push(pos); actions += a;
    const nextOpen = L.doors.map((d) => doorOpen(L, d, robotsAt(t, pos)));
    anim = { t: 0, from: prevGhosts, to: ghosts.map((g) => ghostAt(g, t)), pfrom: prevPos, pto: pos, dir: a, bumped };
    // feedback
    if (bumped) Sound.tone({ f: 140, dur: 0.06, type: "square", vol: 0.05 });
    else if (a === "W") Sound.tone({ f: 420, dur: 0.04, type: "sine", vol: 0.05 });
    else Sound.tone({ f: 520, f2: 620, dur: 0.05, type: "triangle", vol: 0.06 });
    nextOpen.forEach((o, i) => { if (o !== prevOpen[i]) { Sound.tone({ f: o ? 700 : 260, f2: o ? 1000 : 180, dur: 0.12, type: "square", vol: 0.06 }); } });
  }

  function afterTick() {
    if (pos[0] === L.exit[0] && pos[1] === L.exit[1]) return win();
    if (t >= L.T) { rewind(true); return; }
    if (queue.length) act(queue.shift());
  }

  function rewind(auto = false) {
    if (won || !L) return;
    if (!auto && t === 0) { game.setMessage("Move first — an echo copies what you do."); return; }
    anim = null; queue = [];
    ghosts.push(trail);
    let dropped = false;
    if (ghosts.length > L.echoes) { ghosts.shift(); dropped = true; }
    loopCount++;
    game.setMessage(auto ? "Battery drained — loop recorded as an echo." : dropped ? "Oldest echo replaced by your newest." : "Echo recorded. It will replay everything you just did.");
    Sound.rewind(); game.shake(3); flashT = 0.35;
    resetLoop();
  }
  function undoStep() {
    if (won || !actions.length || !L) return;
    const replay = actions.slice(0, -1);
    resetLoop(); for (const a of replay) { pos = step(L, ghosts, t, pos, a); t++; trail.push(pos); actions += a; }
    Sound.tone({ f: 500, f2: 300, dur: 0.08, type: "triangle", vol: 0.06 });
  }
  function restartLevel() { if (!L) return; Sound.select(); load(li); }

  function win() {
    won = true; Sound.win(); game.shake(4);
    const g = geo(); const [cx, cy] = cell(g, ...L.exit);
    game.particles.burst(cx, cy, { n: 50, color: C.ok, speed: 340, life: 1, size: 4, gravity: 0 });
    const prev = prog.done[li]; const used = ghosts.length;
    if (prev == null || used < prev) prog.done[li] = used;
    saveProg();
    const last = li === LEVELS.length - 1;
    setTimeout(() => {
      game.showOverlay(`
        <span class="kicker">Level ${li + 1} · ${L.name}</span>
        <h2>${last ? "Loop closed." : "You made it out"}</h2>
        <p>Escaped on loop ${loopCount} with ${used} echo${used === 1 ? "" : "es"} in ${t} ticks.</p>
        ${last ? "<p><b>You've beaten every level of Echo.</b></p>" : ""}
        <div class="overlay-actions">${last ? '<button class="btn primary" data-primary>Level select</button>' : '<button class="btn primary" data-primary>Next level</button>'}<button class="btn" data-retry>Replay</button></div>
        <p class="overlay-hint">Enter to continue</p>`, { onPrimary: () => (last ? showLevels() : load(li + 1)) });
      game.overlay.querySelector("[data-retry]").addEventListener("click", () => { Sound.select(); load(li); });
    }, 700);
  }

  function showLevels() {
    let top = 0; while (prog.done[top] != null && top < LEVELS.length - 1) top++;
    const btns = LEVELS.map((lv, i) => `<button class="level-btn${prog.done[i] != null ? " done" : ""}${i === li ? " current" : ""}" data-level="${i}" ${i > top ? "disabled" : ""} aria-label="Level ${i + 1}: ${lv.name}">${i + 1}<small>${prog.done[i] != null ? "✓" : ""}</small></button>`).join("");
    game.showOverlay(`<span class="kicker">Echo</span><h2>Choose a level</h2><div class="level-grid" style="grid-template-columns:repeat(7,1fr)">${btns}</div>
      <div class="overlay-actions"><button class="btn primary" data-primary>Play level ${top + 1}</button></div>`, { onPrimary: () => load(top) });
    game.overlay.querySelectorAll("[data-level]").forEach((b) => b.addEventListener("click", () => { Sound.select(); load(+b.dataset.level); }));
  }

  /* ---------------- Rendering ---------------- */
  function geo() {
    const top = 92, pad = 30;
    const tile = Math.floor(Math.min((W - pad * 2) / L.w, (H - top - pad) / L.h, 76));
    const bw = tile * L.w, bh = tile * L.h;
    return { tile, x: (W - bw) / 2, y: top + (H - top - pad - bh) / 2, bw, bh };
  }
  const cell = (g, x, y) => [g.x + (x + 0.5) * g.tile, g.y + (y + 0.5) * g.tile];

  game.update = (dt) => {
    if (flashT > 0) flashT -= dt;
    if (anim) { anim.t += dt; if (anim.t >= TICK) { anim = null; afterTick(); } }
  };

  game.render = (ctx) => {
    ctx.fillStyle = C.bg; ctx.fillRect(-20, -20, W + 40, H + 40);
    if (!L) return;
    const g = geo(), time = game.time, k = anim ? ease.outCubic(clamp(anim.t / TICK, 0, 1)) : 1;
    const curRobots = robotsAt(t, pos);

    // Header: level name + battery timeline
    ctx.textAlign = "left"; ctx.fillStyle = C.text; ctx.font = '700 26px "Space Grotesk", system-ui';
    ctx.fillText(L.name, 40, 46);
    ctx.font = '500 12px "JetBrains Mono", monospace'; ctx.fillStyle = C.dim;
    ctx.fillText(`LOOP ${loopCount}  ·  ECHOES ${ghosts.length}/${L.echoes}`, 40, 68);
    // battery
    const bx = W - 40 - 360, by = 30, bw = 360, bh = 22, seg = bw / L.T;
    ctx.fillStyle = "#0e151d"; roundRect(ctx, bx, by, bw, bh, 6); ctx.fill();
    for (let i = 0; i < L.T; i++) {
      const used = i < t, low = L.T - t <= 3;
      ctx.fillStyle = used ? "#1a2430" : low ? C.danger : C.ok; ctx.globalAlpha = used ? 1 : 0.85;
      roundRect(ctx, bx + i * seg + 2, by + 3, seg - 4, bh - 6, 3); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ghosts.forEach((gh) => { const end = Math.min(gh.length - 1, L.T); ctx.fillStyle = C.surge2; ctx.fillRect(bx + end * seg - 1, by - 5, 2, bh + 10); });
    ctx.textAlign = "right"; ctx.fillStyle = C.dim; ctx.fillText(`BATTERY ${L.T - t}`, bx + bw, by + bh + 18);

    // Hint / message

    // Board base
    ctx.fillStyle = "#0b1117"; roundRect(ctx, g.x - 10, g.y - 10, g.bw + 20, g.bh + 20, 16); ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const ch = L.map[y][x], px = g.x + x * g.tile, py = g.y + y * g.tile;
      if (ch === "#") continue;
      ctx.fillStyle = (x + y) % 2 ? "#152029" : "#121c25"; ctx.fillRect(px, py, g.tile, g.tile); ctx.strokeStyle = "rgba(132,205,255,0.05)"; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, g.tile - 1, g.tile - 1);
    }
    // Ghost paths (where your echoes will go)
    ghosts.forEach((gh, gi) => {
      ctx.save(); ctx.strokeStyle = C.surge2; ctx.globalAlpha = 0.18 + 0.06 * gi; ctx.lineWidth = 3; ctx.setLineDash([4, 6]); ctx.lineCap = "round";
      ctx.beginPath(); gh.forEach((p, i) => { const [cx, cy] = cell(g, p[0], p[1]); i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); }); ctx.stroke(); ctx.restore();
      const end = gh[gh.length - 1], [ex, ey] = cell(g, end[0], end[1]);
      ctx.strokeStyle = C.surge2; ctx.globalAlpha = 0.35; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, g.tile * 0.12, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    });
    // Plates
    for (const p of L.plates) {
      const [cx, cy] = cell(g, p.x, p.y), col = KEY_COLORS[p.k], on = curRobots.some((r) => r[0] === p.x && r[1] === p.y), s = g.tile * 0.7;
      ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = on ? 0.35 : 0.12; if (on) { ctx.shadowColor = col; ctx.shadowBlur = 20; }
      roundRect(ctx, cx - s / 2, cy - s / 2, s, s, 8); ctx.fill(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; roundRect(ctx, cx - s / 2, cy - s / 2 + (on ? 2 : 0), s, s - (on ? 2 : 0), 8); ctx.stroke();
      ctx.font = `700 ${g.tile * 0.28}px "JetBrains Mono", monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = col; ctx.fillText(p.k.toUpperCase(), cx, cy + 1); ctx.textBaseline = "alphabetic";
      ctx.restore();
    }
    // Exit
    { const [cx, cy] = cell(g, ...L.exit), r = g.tile * 0.34; ctx.save(); ctx.strokeStyle = C.ok; ctx.shadowColor = C.ok; ctx.shadowBlur = 16; ctx.lineWidth = 3;
      for (let i = 0; i < 2; i++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 3 + i * 2); ctx.beginPath(); ctx.arc(cx, cy, r * (0.6 + i * 0.4) + Math.sin(time * 2 + i) * 2, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.fillStyle = C.ok; ctx.beginPath(); ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    // Walls
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.map[y][x] !== "#") continue;
      const nb = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < L.w && yy < L.h && L.map[yy][xx] !== "#"; };
      if (![[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => nb(dx, dy))) continue; // hide solid interior
      const px = g.x + x * g.tile + 1, py = g.y + y * g.tile + 1, s = g.tile - 2;
      ctx.fillStyle = "#05080b"; roundRect(ctx, px, py + 3, s, s - 1, 6); ctx.fill();
      const gr = ctx.createLinearGradient(0, py, 0, py + s); gr.addColorStop(0, "#26313e"); gr.addColorStop(1, "#19222c");
      ctx.fillStyle = gr; roundRect(ctx, px, py, s, s - 3, 6); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1; ctx.stroke();
    }
    // Doors / barriers
    for (const d of L.doors) {
      const px = g.x + d.x * g.tile, py = g.y + d.y * g.tile, s = g.tile, col = KEY_COLORS[d.k];
      const open = doorOpen(L, d, curRobots);
      const horiz = L.map[d.y][d.x - 1] === "#" || L.map[d.y][d.x + 1] === "#" ? false : true; // passage direction
      ctx.save();
      if (open) {
        ctx.strokeStyle = d.inv ? C.danger : col; ctx.globalAlpha = 0.45; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
        roundRect(ctx, px + 4, py + 4, s - 8, s - 8, 6); ctx.stroke();
      } else {
        ctx.shadowColor = d.inv ? C.danger : col; ctx.shadowBlur = 14;
        ctx.fillStyle = "#1a2431"; roundRect(ctx, px + 3, py + 3, s - 6, s - 6, 6); ctx.fill(); ctx.shadowBlur = 0;
        if (d.inv) { // red hazard stripes
          ctx.save(); roundRect(ctx, px + 3, py + 3, s - 6, s - 6, 6); ctx.clip(); ctx.fillStyle = C.danger; ctx.globalAlpha = 0.75;
          for (let i = -s; i < s * 2; i += 14) { ctx.beginPath(); ctx.moveTo(px + i, py); ctx.lineTo(px + i + 7, py); ctx.lineTo(px + i + 7 - s, py + s); ctx.lineTo(px + i - s, py + s); ctx.fill(); }
          ctx.restore();
        } else {
          ctx.fillStyle = col; ctx.globalAlpha = 0.9;
          for (let i = 0; i < 3; i++) { if (horiz) ctx.fillRect(px + 8, py + s * (0.28 + i * 0.22) - 2, s - 16, 4); else ctx.fillRect(px + s * (0.28 + i * 0.22) - 2, py + 8, 4, s - 16); }
        }
      }
      // linked-plate badge
      ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px + s - 9, py + 9, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Ghosts
    ghosts.forEach((gh, gi) => {
      const a = anim ? anim.from[gi] : ghostAt(gh, t), b = anim ? anim.to[gi] : a;
      const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k, [cx, cy] = cell(g, x, y);
      const look = b[0] > a[0] ? 1 : b[0] < a[0] ? -1 : 0;
      drawBot(ctx, cx, cy, g.tile * 0.58, { color: C.surge2, body: "#13202c", alpha: 0.42 + 0.08 * Math.sin(time * 4 + gi), look, glow: 14 });
    });
    // Player
    {
      const a = anim ? anim.pfrom : pos, b = anim ? anim.pto : pos;
      let x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k;
      if (anim?.bumped) { const n = Math.sin(clamp(anim.t / TICK, 0, 1) * Math.PI) * 0.12; x += DIRS[anim.dir][0] * n; y += DIRS[anim.dir][1] * n; }
      const [cx, cy] = cell(g, x, y), look = anim ? (anim.dir === "L" ? -1 : anim.dir === "R" ? 1 : 0) : 0;
      drawBot(ctx, cx, cy - Math.sin(time * 3) * 1.2, g.tile * 0.62, { color: C.surge, look, glow: 16 });
    }
    game.particles.draw(ctx);
    if (flashT > 0) { ctx.fillStyle = `rgba(132,205,255,${flashT * 0.5})`; ctx.fillRect(0, 0, W, H); }
  };

  /* ---------------- Input ---------------- */
  const KEYMAP = { ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R", w: "U", s: "D", a: "L", d: "R", W: "U", S: "D", A: "L", D: "R", " ": "W", ".": "W" };
  game.onKey = (e) => {
    if (game.overlayOpen()) return;
    if (KEYMAP[e.key]) { e.preventDefault(); act(KEYMAP[e.key]); }
    else if ((e.key === "r" || e.key === "R") && !e.shiftKey) rewind();
    else if (e.key === "R" && e.shiftKey) restartLevel();
    else if (e.key === "z" || e.key === "Z" || e.key === "Backspace") { e.preventDefault(); undoStep(); }
    else if (e.key === "l" || e.key === "L") showLevels();
  };
  onSwipe(game.stage, (d) => { if (!game.overlayOpen()) act(d); });
  document.querySelectorAll(".dpad [data-dir]").forEach((b) => b.addEventListener("click", () => { if (!game.overlayOpen()) act(b.dataset.dir); }));
  document.querySelectorAll("[data-act=rewind]").forEach((b) => b.addEventListener("click", () => rewind()));
  document.querySelectorAll("[data-act=undo]").forEach((b) => b.addEventListener("click", undoStep));
  document.querySelector("[data-act=restart]")?.addEventListener("click", restartLevel);
  document.querySelector("[data-act=levels]")?.addEventListener("click", () => { Sound.select(); showLevels(); });

  saveProg();
  li = prog.last || 0; L = parse(LEVELS[li]); ghosts = []; loopCount = 1; resetLoop();
  game.setHud("level", `${li + 1}/${LEVELS.length}`);
  const isNew = !Object.keys(prog.done).length;
  game.showOverlay(`
    <span class="kicker">Steel Surge Arcade</span>
    <h2>Echo</h2>
    <p>Every time you rewind, your last loop becomes an <b>echo</b> — a ghost robot that repeats exactly what you did. Use echoes to hold plates and open doors, then escape.</p>
    <div class="keys"><span class="kbd">←↑↓→</span><span style="color:#67768a;font-size:13px;align-self:center">move</span><span class="kbd">Space</span><span style="color:#67768a;font-size:13px;align-self:center">wait</span><span class="kbd">R</span><span style="color:#67768a;font-size:13px;align-self:center">rewind</span><span class="kbd">Z</span><span style="color:#67768a;font-size:13px;align-self:center">undo</span></div>
    <div class="overlay-actions"><button class="btn primary" data-primary>${isNew ? "Start" : `Continue · level ${li + 1}`}</button>${isNew ? "" : '<button class="btn" data-lv>Levels</button>'}</div>`, { onPrimary: () => load(li) });
  game.overlay.querySelector("[data-lv]")?.addEventListener("click", () => { Sound.select(); showLevels(); });
})();
