// Builds content/teams.json: every FTC team that has competed since 2019, with a
// "fame" score used by the Kilovolt trivia game to decide how rare an answer is.
// Data comes from FTCScout (https://ftcscout.org), which mirrors FIRST's official data.
//
//   node tools/fetch-teams.mjs
//
// Run automatically once a week by .github/workflows/refresh-data.yml.
// Needs Node 18+ (built-in fetch). No packages or keys required.
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const API = "https://api.ftcscout.org/graphql";
const now = new Date();
const CURRENT = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
const SEASONS = []; for (let y = 2019; y <= CURRENT; y++) SEASONS.push(y);

async function gql(query, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "steel-surge-site-data" }, body: JSON.stringify({ query }) });
      const j = await r.json();
      if (j.errors) throw new Error(j.errors[0].message);
      return j.data;
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
}

// Every region FTCScout knows, minus the "everything" groupings (teams are de-duplicated anyway)
const enumData = await gql(`{ __type(name: "RegionOption") { enumValues { name } } }`);
const regions = enumData.__type.enumValues.map((v) => v.name).filter((n) => !["All", "UnitedStates", "International"].includes(n));

const eventsAliases = SEASONS.map((y) => `e${y}: events(season: ${y}) { eventCode }`).join(" ");
const teams = new Map();
let done = 0;
async function fetchRegion(region) {
  const d = await gql(`{ teamsSearch(region: ${region}, limit: 20000) { number name rookieYear activeSeasons location { city state country } awards { type placement eventCode } ${eventsAliases} } }`);
  for (const t of d.teamsSearch) if (!teams.has(t.number)) teams.set(t.number, t);
  done++;
  if (done % 20 === 0) console.log(`  ${done}/${regions.length} regions, ${teams.size} teams`);
}
// A few requests at a time, to be polite to FTCScout
const queue = regions.slice();
await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) { const r = queue.shift(); try { await fetchRegion(r); } catch (e) { console.warn(`  region ${r} failed: ${e.message}`); } } }));
console.log(`Fetched ${teams.size} teams from ${regions.length} regions.`);
if (teams.size < 3000) { console.error("Too few teams; keeping the existing file."); process.exit(1); }

// ---------- Fame: how well known a team is ----------
// Awards (Inspire and championship awards count most), seasons played, events attended, and age.
const AWARD_WEIGHT = { Inspire: 5, Think: 2, Connect: 2, Innovate: 2, Control: 2, Design: 2, Motivate: 2, Reach: 2, Sustain: 2, Winner: 2, Finalist: 1.2 };
function fame(t) {
  let award = 0;
  for (const a of t.awards || []) {
    let w = AWARD_WEIGHT[a.type] ?? 1;
    if (a.placement === 1) w *= 1.5;
    if (/^FTCCMP|CMP/.test(a.eventCode || "")) w *= 3; // FIRST Championship and state/regional championships
    award += w;
  }
  const seasons = new Set(t.activeSeasons || []).size;
  const events = SEASONS.reduce((n, y) => n + (t[`e${y}`]?.length || 0), 0);
  const age = Math.max(0, CURRENT - (t.rookieYear || CURRENT));
  return Math.log1p(award) * 2.2 + seasons * 0.45 + Math.min(events, 50) * 0.06 + Math.min(age, 18) * 0.05;
}
const rows = [...teams.values()].filter((t) => t.name && (t.activeSeasons?.length || 0) > 0).map((t) => ({ t, f: fame(t) }));
rows.sort((a, b) => b.f - a.f);
// Store fame as a 0–1000 rank score (1000 = most famous) so the game can compare within any group
const n = rows.length;
const out = rows.map(({ t }, i) => [
  t.number, t.name.trim(), t.rookieYear || 0, (t.location?.city || "").trim(), (t.location?.state || "").trim(), (t.location?.country || "").trim(),
  Math.round(1000 * (1 - i / n)), new Set(t.activeSeasons || []).size,
]).sort((a, b) => a[0] - b[0]);

const data = { updatedAt: now.toISOString(), source: "FTCScout (ftcscout.org)", season: CURRENT, fields: ["number", "name", "rookieYear", "city", "state", "country", "fame", "seasons"], teams: out };
const file = new URL("content/teams.json", root);
let old = null; try { old = JSON.parse(await readFile(file, "utf8")); } catch {}
if (old && JSON.stringify(old.teams) === JSON.stringify(out)) console.log("content/teams.json: no change");
else { await writeFile(file, JSON.stringify(data) + "\n"); console.log(`content/teams.json: updated (${out.length} teams)`); }
