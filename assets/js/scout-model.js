/* ==========================================================================
   Steel Surge — Scouting math (used by scouting.js, tested by tools/test_features.js)
   No page code here: just numbers in, numbers out.
     consistency(): how much each team's matches swing
     alliance(), winChance(): a match prediction
     project(): plays the rest of the qualification matches many times
   Teams:   { n, name, opr, rp, tb1, tb2, played, w, l, t, rank }
   Matches: { n, level, red: [team numbers], blue: [...], rs, bs }  (rs/bs null = not played)
   ========================================================================== */
(function (root) {
  "use strict";
  const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /** FTCScout only has alliance scores, so a team's share of each match is estimated as their
      alliance's score minus their partners' OPR. "score" (0–100, needs 3 matches) is high when
      those shares stay close to the team's average. */
  function consistency(teams, matches, oprOf) {
    const map = new Map();
    for (const t of teams) {
      const list = [];
      for (const m of matches) {
        if (m.rs == null || m.bs == null) continue;
        const side = m.red.includes(t.n) ? ["red", m.rs] : m.blue.includes(t.n) ? ["blue", m.bs] : null; if (!side) continue;
        list.push({ m, v: side[1] - m[side[0]].filter((x) => x !== t.n).reduce((s, x) => s + oprOf(x), 0) });
      }
      if (!list.length) continue;
      const vals = list.map((x) => x.v), mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, vals.length - 1));
      map.set(t.n, { list, n: vals.length, mean, sd, low: Math.min(...vals), high: Math.max(...vals), score: vals.length >= 3 ? Math.round(100 * Math.exp(-sd / Math.max(Math.abs(mean), 15))) : null });
    }
    return map;
  }
  /** How much a team's score usually swings from match to match. */
  const swing = (c, opr) => (c?.n >= 3 ? Math.min(60, Math.max(5, c.sd)) : 6 + 0.3 * Math.max(opr || 0, 0));
  /** An alliance's expected score and its spread. */
  const alliance = (side, oprOf, cons) => ({ mean: side.reduce((s, n) => s + Math.max(oprOf(n), 0), 0), sd: Math.sqrt(side.reduce((s, n) => s + swing(cons?.get(n), oprOf(n)) ** 2, 0)) });
  // Normal distribution: chance a random alliance score difference comes out above zero
  const erf = (x) => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); };
  const winChance = (a, b) => { const sd = Math.sqrt(a.sd ** 2 + b.sd ** 2) || 1; return 0.5 * (1 + erf((a.mean - b.mean) / (sd * Math.SQRT2))); };

  /** Starts from FTC's official standings (ranking score and tiebreakers from FTCScout), then
      plays the remaining qualification matches `runs` times. Ranking points for a future match =
      what a win has been worth at this event × win + the team's usual bonus ranking points.
      Both are measured from the event's results, so it follows each season's rules. */
  function project({ teams: T, matches, team, K = 4, seed = 1, runs = 2000, oprOf, cons }) {
    const quals = matches.filter((m) => m.level === "Quals");
    const played = quals.filter((m) => m.rs != null && m.bs != null), left = quals.filter((m) => m.rs == null || m.bs == null);
    const N = T.length, idx = new Map(T.map((t, i) => [t.n, i]));
    const official = T.some((t) => t.rp != null && t.played > 0);
    const sched = T.map(() => ({ w: 0, l: 0, t: 0, g: 0 }));
    for (const m of played) for (const [side, mine, theirs] of [[m.red, m.rs, m.bs], [m.blue, m.bs, m.rs]]) for (const n of side) { const b = sched[idx.get(n)]; if (!b) continue; b.g++; mine > theirs ? b.w++ : mine < theirs ? b.l++ : b.t++; }
    const now = T.map((t, i) => {
      if (official && t.played > 0 && t.rp != null) return { g: t.played, rs: t.rp * t.played, w: t.w ?? 0, l: t.l ?? 0, t: t.t ?? 0, tb1: t.tb1 ?? 0, tb2: t.tb2 ?? 0, rank: t.rank };
      const c = sched[i]; return { g: c.g, rs: 2 * c.w + c.t, w: c.w, l: c.l, t: c.t, tb1: 0, tb2: 0, rank: null };
    });
    let winRP = 2, bonus = T.map(() => 0);
    const pts = now.map((x, i) => (x.g ? { i, x: (x.w + 0.5 * x.t) / x.g, y: x.rs / x.g } : null)).filter(Boolean);
    if (official && pts.length >= 4) {
      const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length, my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const vx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
      if (vx > 1e-6) winRP = Math.min(4, Math.max(1, pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / vx));
      const res = new Map(pts.map((p) => [p.i, p.y - winRP * p.x])), avgRes = [...res.values()].reduce((a, b) => a + b, 0) / res.size;
      bonus = T.map((_, i) => Math.max(0, res.get(i) ?? avgRes));
    }
    const plan = left.map((m) => ({ m, r: alliance(m.red, oprOf, cons), b: alliance(m.blue, oprOf, cons), ours: m.red.includes(team) || m.blue.includes(team) }));
    const RUNS = left.length ? runs : 1, rand = rng(seed);
    const gauss = () => { let u = 0; while (!u) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand()); };
    const rankHist = T.map(() => new Array(N).fill(0)), top = new Array(N).fill(0), key = plan.map(() => ({ wins: 0, topIfWin: 0, topIfLoss: 0 })), us = idx.get(team);
    const byRank = (st) => T.map((_, i) => i).sort((a, b) => (st[b].g ? st[b].rs / st[b].g : 0) - (st[a].g ? st[a].rs / st[a].g : 0) || st[b].tb1 - st[a].tb1 || st[b].tb2 - st[a].tb2);
    const finalOrder = !left.length && official && T.every((t) => t.rank != null || !t.played) ? T.map((_, i) => i).sort((a, b) => (T[a].rank ?? 999) - (T[b].rank ?? 999)) : null;
    for (let run = 0; run < RUNS; run++) {
      const st = now.map((x) => ({ ...x })), wonOurs = [];
      for (const p of plan) {
        const rs = p.r.mean + gauss() * p.r.sd, bs = p.b.mean + gauss() * p.b.sd;
        for (const [side, mine, theirs] of [[p.m.red, rs, bs], [p.m.blue, bs, rs]]) for (const n of side) { const i = idx.get(n); if (i == null) continue; st[i].g++; st[i].rs += (mine > theirs ? winRP : 0) + bonus[i]; }
        wonOurs.push(p.ours ? (p.m.red.includes(team) ? rs > bs : bs > rs) : null);
      }
      const order = finalOrder || byRank(st); // once qualifications are over, FTC's own ranking is the answer
      order.forEach((i, r) => { rankHist[i][r]++; if (r < K) top[i]++; });
      if (us != null) { const usTop = order.indexOf(us) < K; plan.forEach((p, j) => { if (wonOurs[j] == null) return; if (wonOurs[j]) { key[j].wins++; if (usTop) key[j].topIfWin++; } else if (usTop) key[j].topIfLoss++; }); }
    }
    const pct = (h, q) => { let c = 0; for (let r = 0; r < h.length; r++) { c += h[r]; if (c >= q * RUNS) return r + 1; } return h.length; };
    const rows = T.map((t, i) => ({ n: t.n, name: t.name, cur: now[i], mid: pct(rankHist[i], 0.5), lo: pct(rankHist[i], 0.1), hi: pct(rankHist[i], 0.9), avgRank: rankHist[i].reduce((s, c, r) => s + c * (r + 1), 0) / RUNS, top: top[i] / RUNS }))
      .sort((a, b) => a.avgRank - b.avgRank);
    const keys = plan.map((p, j) => ({ p, ...key[j] })).filter((k) => k.p.ours).map((k) => ({ m: k.p.m, pWin: k.wins / RUNS, ifWin: k.wins ? k.topIfWin / k.wins : null, ifLoss: RUNS - k.wins ? k.topIfLoss / (RUNS - k.wins) : null }))
      .map((k) => ({ ...k, swing: (k.ifWin ?? 0) - (k.ifLoss ?? 0) })).sort((a, b) => b.swing - a.swing);
    return { rows, keys, left: left.length, played: played.length, total: quals.length, official, winRP };
  }

  /** Alliance selection, simplified: the top K teams are captains, in order. Each round every captain
      picks once (round 2 goes in reverse, for 3-team alliances). A captain takes the most valuable team
      still available, unless `forced` names its pick. Teams in `taken` can't be picked.
      (Real captains can also pick other captains and can decline; this doesn't model that.) */
  function draft({ order, K = 4, size = 2, value, forced = {}, taken = new Set() }) {
    const used = new Set(taken), alliances = [];
    for (const n of order) { if (alliances.length >= K) break; if (!used.has(n)) { alliances.push([n]); used.add(n); } }
    for (let r = 0; r < size - 1; r++) {
      const seq = alliances.map((_, i) => (r % 2 ? alliances.length - 1 - i : i));
      for (const i of seq) {
        let pick = forced[alliances[i][0]]?.[r];
        if (pick == null || used.has(pick)) pick = order.filter((n) => !used.has(n)).sort((a, b) => value(b) - value(a))[0];
        if (pick == null) continue;
        alliances[i].push(pick); used.add(pick);
      }
    }
    return alliances;
  }
  /** For a captain `us`: every first pick still available, ranked by our average chance to beat the
      other alliances that would form if we chose them. */
  function firstPicks({ order, K = 4, size = 2, us, oprOf, cons, taken = new Set(), value = oprOf }) {
    const caps = draft({ order, K, size: 1, value, taken }).map((a) => a[0]);
    if (!caps.includes(us)) return null;
    const pool = order.filter((n) => n !== us && !taken.has(n) && !caps.includes(n));
    return pool.map((x) => {
      const al = draft({ order, K, size, value, taken, forced: { [us]: [x] } }), ours = al.find((a) => a[0] === us);
      const A = alliance(ours, oprOf, cons);
      const vs = al.filter((a) => a !== ours).map((teams) => ({ teams, p: winChance(A, alliance(teams, oprOf, cons)) }));
      const avg = vs.length ? vs.reduce((t, v) => t + v.p, 0) / vs.length : 1, worst = vs.reduce((m, v) => (!m || v.p < m.p ? v : m), null);
      return { n: x, ours, mean: A.mean, avg, worst, vs, alliances: al };
    }).sort((a, b) => Math.round(b.avg * 100) - Math.round(a.avg * 100) || b.mean - a.mean); // within a percent counts as a tie: then the stronger alliance
  }

  const ScoutModel = { rng, consistency, swing, alliance, winChance, project, draft, firstPicks };
  if (typeof module === "object" && module.exports) module.exports = ScoutModel; else root.ScoutModel = ScoutModel;
})(typeof window !== "undefined" ? window : globalThis);
