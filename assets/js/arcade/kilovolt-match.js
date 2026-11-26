/* ==========================================================================
   KILOVOLT — answer matching (used by kilovolt.js, tested by tools/test_features.js)
   Capitals, spaces, punctuation, "the", and plurals never matter. Beyond that,
   answers under 4 letters must be exact, 4–12 letters may have one typo, and
   13+ may have two. Two swapped letters count as one typo. The first letter
   must match, and a typo equally close to two different answers isn't guessed.
   ========================================================================== */
(function (root) {
  "use strict";
  const norm = (s) => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  // Team names: words that don't help tell teams apart
  const DROP = new Set(["the", "team", "robotics", "robotic", "ftc", "frc", "club", "inc"]);
  const key1 = (s) => norm(s).replace(/ /g, "");
  const key2 = (s) => norm(s).split(" ").filter((w) => !DROP.has(w)).join("");
  const words = (s) => new Set(norm(s).split(" "));
  // Knowledge answers: also ignore "a", "an", and plural endings
  const sing = (w) => (w.length > 3 && /(ch|sh|x)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && /[^s]s$/.test(w) ? w.slice(0, -1) : w);
  const fkey = (s) => norm(String(s).replace(/['’]/g, "")).split(" ").filter((w) => w && !["the", "a", "an"].includes(w)).map(sing).join("");
  /** Keys an answer is accepted by. "Tank" counts for "Tank drive", "Inspire" for "Inspire Award", "Color" for "Color sensor". */
  const SHORTEN = / (award|drive|wheels?|zones?|sensor)$/i;
  function answerKeys(name) {
    const short = SHORTEN.test(name) ? fkey(name.replace(SHORTEN, "")) : "";
    return [...new Set([fkey(name), short.length >= 3 ? short : ""])].filter(Boolean);
  }
  /** Typo distance: one wrong, missing, or extra letter is 1, and so is two letters swapped ("cnoe" → "cone"). */
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let pp = null, prev = Array.from({ length: b.length + 1 }, (_, j) => j), prevBest = 0;
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let best = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (pp && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], pp[j - 2] + 1);
        best = Math.min(best, cur[j]);
      }
      if (best > max && prevBest > max) return max + 1;
      pp = prev; prev = cur; prevBest = best;
    }
    return prev[b.length];
  }
  const slack = (n) => (n < 4 ? 0 : n < 13 ? 1 : 2);
  /** The closest keys within the allowed typos (all of them if tied), or null. */
  function nearest(k, keys) {
    const max = slack(k.length); if (!max) return null;
    let best = max + 1, hits = [];
    for (const x of keys) {
      if (x[0] !== k[0] || Math.abs(x.length - k.length) > max) continue;
      const d = lev(x, k, max);
      if (d < best) { best = d; hits = [x]; } else if (d === best && d <= max) hits.push(x);
    }
    return best <= max ? hits : null;
  }
  /** Matches an answer against a list of { keys } items: { item, fuzzy } | { ambiguous: true } | null. */
  function matchList(items, raw) {
    const k = fkey(raw); if (!k) return null;
    const exact = items.find((it) => it.keys.includes(k));
    if (exact) return { item: exact, fuzzy: false };
    const hits = nearest(k, items.flatMap((it) => it.keys));
    if (!hits) return null;
    const found = [...new Set(hits.map((h) => items.find((it) => it.keys.includes(h))))];
    return found.length > 1 ? { ambiguous: true } : { item: found[0], fuzzy: true };
  }
  const KilovoltMatch = { norm, key1, key2, words, sing, fkey, answerKeys, lev, slack, nearest, matchList };
  if (typeof module === "object" && module.exports) module.exports = KilovoltMatch; else root.KilovoltMatch = KilovoltMatch;
})(typeof window !== "undefined" ? window : globalThis);
