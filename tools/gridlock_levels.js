// Generates Gridlock levels (prints JSON). Paste the compact rows into RAW in assets/js/arcade/gridlock.js.
//   node tools/gridlock_levels.js > levels.json
// Generates Gridlock levels. Each level's par is the exact BFS-optimal solution length.
// Rules (must match the game): all robots slide simultaneously until blocked by a wall,
// the edge, or another robot. Win when every robot rests on the pad of its own color.
const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function move(level, pos, d) {
  const [dx, dy] = DIRS[d];
  const p = pos.map((q) => q.slice());
  const blocked = (x, y, self) => x < 0 || y < 0 || x >= level.w || y >= level.h || level.walls[y][x] === "#" || p.some((q, j) => j !== self && q[0] === x && q[1] === y);
  let moved = true;
  while (moved) {
    moved = false;
    for (let i = 0; i < p.length; i++) {
      const nx = p[i][0] + dx, ny = p[i][1] + dy;
      if (!blocked(nx, ny, i)) { p[i][0] = nx; p[i][1] = ny; moved = true; }
    }
  }
  return p;
}
const key = (p) => p.map((q) => q.join(",")).join("|");

function bfs(level, start, maxDepth = 40) {
  const seen = new Map([[key(start), { depth: 0, prev: null, dir: null, pos: start }]]);
  let frontier = [start];
  for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
    const next = [];
    for (const s of frontier) for (const d of "UDLR") {
      const n = move(level, s, d), k = key(n);
      if (!seen.has(k)) { seen.set(k, { depth, prev: key(s), dir: d, pos: n }); next.push(n); }
    }
    frontier = next;
  }
  return seen;
}
function pathTo(seen, k) { const out = []; while (seen.get(k).prev) { out.unshift(seen.get(k).dir); k = seen.get(k).prev; } return out.join(""); }

function makeLevel(rng, w, h, k, dMin, dMax, density) {
  for (let attempt = 0; attempt < 4000; attempt++) {
    const walls = Array.from({ length: h }, () => Array.from({ length: w }, () => (rng() < density ? "#" : ".")));
    const level = { w, h, walls: walls.map((r) => r.join("")) };
    const floor = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (level.walls[y][x] === ".") floor.push([x, y]);
    if (floor.length < w * h * 0.6) continue;
    const start = [];
    while (start.length < k) { const c = floor[(rng() * floor.length) | 0]; if (!start.some((q) => q[0] === c[0] && q[1] === c[1])) start.push(c.slice()); }
    const seen = bfs(level, start, dMax);
    const candidates = [];
    for (const [kk, v] of seen) {
      if (v.depth < dMin || v.depth > dMax) continue;
      if (v.pos.some((q, i) => q[0] === start[i][0] && q[1] === start[i][1])) continue; // every robot must move
      const sol = pathTo(seen, kk);
      if (v.depth >= 4 && new Set(sol).size < 3) continue;
      if (/(.)\1/.test(sol)) continue; // optimal paths never repeat a move; keep anyway as sanity
      candidates.push({ v, sol });
    }
    if (!candidates.length) continue;
    candidates.sort((a, b) => b.v.depth - a.v.depth);
    const top = candidates.filter((c) => c.v.depth === candidates[0].v.depth);
    const pick = top[(rng() * top.length) | 0];
    return { w, h, walls: level.walls, robots: start, pads: pick.v.pos, par: pick.v.depth, solution: pick.sol };
  }
  throw new Error(`could not make level ${w}x${h} k=${k} d=${dMin}-${dMax}`);
}

const plan = [
  // [w, h, robots, minDepth, maxDepth, wallDensity]
  [5, 5, 1, 2, 2, 0.12], [5, 5, 1, 3, 3, 0.14], [6, 6, 1, 4, 4, 0.16],
  [6, 6, 2, 2, 3, 0.12], [6, 6, 2, 3, 4, 0.14], [6, 6, 2, 4, 4, 0.16], [6, 6, 2, 4, 5, 0.16], [6, 6, 2, 5, 5, 0.18],
  [7, 7, 2, 5, 6, 0.16], [7, 7, 2, 6, 6, 0.16], [7, 7, 2, 6, 7, 0.18], [7, 7, 2, 7, 7, 0.18], [7, 7, 2, 7, 8, 0.18], [7, 7, 2, 8, 8, 0.2], [7, 7, 2, 8, 9, 0.2],
  [7, 7, 3, 5, 6, 0.14], [7, 7, 3, 6, 7, 0.16], [7, 7, 3, 7, 7, 0.16], [7, 7, 3, 7, 8, 0.18], [7, 7, 3, 8, 8, 0.18], [7, 7, 3, 8, 9, 0.18], [7, 7, 3, 9, 9, 0.2],
  [8, 8, 3, 8, 9, 0.16], [8, 8, 3, 9, 10, 0.16], [8, 8, 3, 10, 10, 0.18], [8, 8, 3, 10, 11, 0.18], [8, 8, 3, 11, 11, 0.18], [8, 8, 3, 11, 12, 0.2], [8, 8, 3, 12, 13, 0.2], [8, 8, 3, 13, 14, 0.2],
];

const rng = mulberry32(27254);
const levels = plan.map((p, i) => { const L = makeLevel(rng, ...p); process.stderr.write(`L${i + 1}: ${p[0]}x${p[1]} robots=${p[2]} par=${L.par} sol=${L.solution}\n`); return L; });

// Self-check: replay each solution and confirm it wins in exactly par moves.
for (const [i, L] of levels.entries()) {
  let pos = L.robots;
  for (const d of L.solution) pos = move(L, pos, d);
  if (key(pos) !== key(L.pads) || L.solution.length !== L.par) throw new Error(`level ${i + 1} failed self-check`);
}
console.log(JSON.stringify(levels.map(({ solution, ...rest }) => rest)));
