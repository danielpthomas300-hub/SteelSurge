// Refreshes auto-updating data files. Run by GitHub Actions every day (see
// .github/workflows/refresh-data.yml), or locally with:  node tools/refresh-data.mjs
//
//  content/videos.json  newest uploads from the team YouTube channel
//  content/ftc.json     backup copy of FTCScout stats (used only if FTCScout is down)
//
// Needs Node 18+ (built-in fetch). No packages required.
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const content = JSON.parse(await readFile(new URL("content/content.json", root), "utf8"));
const { youtubeChannelId: channel, number: team, rookieYear } = content.team;

async function writeIfChanged(path, data, compareKey) {
  const file = new URL(path, root);
  let old = null;
  try { old = JSON.parse(await readFile(file, "utf8")); } catch {}
  if (old && JSON.stringify(old[compareKey]) === JSON.stringify(data[compareKey])) { console.log(`${path}: no change`); return; }
  await writeFile(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`${path}: updated`);
}

// ---------- YouTube ----------
try {
  const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`)).text();
  const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: e.match(/<yt:videoId>([^<]+)/)?.[1],
    title: decode(e.match(/<title>([^<]*)/)?.[1] || ""),
    published: e.match(/<published>([^<]+)/)?.[1],
  })).filter((v) => v.id).slice(0, 12);
  // Vertical Shorts get a portrait thumbnail on the site. youtube.com/shorts/<id> answers 200 for a Short and redirects otherwise.
  await Promise.all(videos.map(async (v) => {
    try { if ((await fetch(`https://www.youtube.com/shorts/${v.id}`, { method: "HEAD", redirect: "manual" })).status === 200) v.short = true; } catch {}
  }));
  if (videos.length) await writeIfChanged("content/videos.json", { updatedAt: new Date().toISOString(), videos }, "videos");
} catch (e) { console.warn("YouTube refresh failed:", e.message); }

// ---------- FTCScout snapshot (same shape the site builds live) ----------
try {
  const now = new Date(), current = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const years = []; for (let y = current; y >= Math.max(2019, rookieYear || current); y--) years.push(y);
  const api = "https://api.ftcscout.org";
  const aliases = years.map((y) => `s${y}: events(season:${y}){ eventCode event{ name start end type location{ venue city state } } }`).join(" ");
  const g = await (await fetch(`${api}/graphql`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: `{ teamByNumber(number:${team}){ awards{ season type placement eventCode } ${aliases} } }` }) })).json();
  const t = g?.data?.teamByNumber; if (!t) throw new Error("team not found");
  const slim = (e) => ({ eventCode: e.eventCode, stats: e.stats ? { rank: e.stats.rank, wins: e.stats.wins, losses: e.stats.losses, ties: e.stats.ties, qualMatchesPlayed: e.stats.qualMatchesPlayed } : null });
  const rest = await Promise.all(years.map((y) => fetch(`${api}/rest/v1/teams/${team}/events/${y}`).then((r) => r.json()).then((a) => a.map(slim)).catch(() => [])));
  const quick = await Promise.all(years.map((y) => fetch(`${api}/rest/v1/teams/${team}/quick-stats?season=${y}`).then((r) => (r.ok ? r.json() : null)).then((q) => (q?.tot ? { tot: q.tot, count: q.count } : null)).catch(() => null)));
  await writeIfChanged("content/ftc.json", { updatedAt: now.toISOString(), raw: { years, gql: t, rest, quick } }, "raw");
} catch (e) { console.warn("FTCScout snapshot failed:", e.message); }
