// Every-two-weeks website check-in. Writes a short Markdown report with a ✅ / ⚠️ line per item.
//
//   node tools/checkin.mjs report.md [runs.json] [links.md]
//
// runs.json  (optional) latest result of each GitHub Action, written by the workflow with `gh run list`
// links.md   (optional) output of tools/check_external.mjs (empty file = no broken links)
//
// Run by .github/workflows/checkin.yml, which posts the report as a GitHub issue.
// Needs Node 18+; no packages.
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8").catch(() => "");
const json = async (p) => { try { return JSON.parse(await read(p)); } catch { return null; } };
const [out = "checkin.md", runsFile, linksFile] = process.argv.slice(2);
const readArg = (p) => readFile(p, "utf8").catch(() => ""); // files named on the command line (relative to where you run it)

const SITES = { "GitHub Pages": "https://danielpthomas300-hub.github.io/SteelSurge/", Netlify: "https://steelsurge-27254.netlify.app/" };
const now = new Date(), today = now.toISOString().slice(0, 10);
const season = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
const seasonLabel = `${season}–${String(season + 1).slice(2)}`;
const daysSince = (d) => Math.floor((now - new Date(d)) / 864e5);
const ok = [], warn = [], info = [];
const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// ---------- 1. Both live sites are up and running the latest code ----------
const localVer = (await read("index.html")).match(/site\.js\?v=([a-z0-9]+)/)?.[1];
const live = {};
for (const [name, url] of Object.entries(SITES)) {
  try {
    const r = await fetch(`${url}?checkin=${Date.now()}`, { signal: AbortSignal.timeout(20000), headers: { "Cache-Control": "no-cache" } });
    const v = (await r.text()).match(/site\.js\?v=([a-z0-9]+)/)?.[1];
    live[name] = v;
    if (!r.ok) warn.push(`**${name} is down** (HTTP ${r.status}): ${url}`);
    else if (v && localVer && v !== localVer) warn.push(`**${name} is running an older version** of the site (${v}, latest is ${localVer}).${name === "Netlify" ? " Netlify isn't connected to GitHub, so it needs a manual redeploy (or connect it in Netlify → Site configuration → Build & deploy)." : " The GitHub Pages build may have failed; check the Actions tab."}`);
    else ok.push(`${name} is up and on the latest version.`);
  } catch (e) { warn.push(`**${name} didn't respond** (${e.cause?.code || e.name}): ${url}`); }
}

// ---------- 2. Automatic jobs are succeeding ----------
let runs = null; if (runsFile) { try { runs = JSON.parse(await readArg(runsFile)); } catch {} }
if (runs) {
  for (const [wf, r] of Object.entries(runs)) {
    if (!r) {
      if (wf === "Refresh site data") warn.push(`**${wf} has never run**, so new videos and the backup FTC stats aren't being saved. Open the Actions tab → "${wf}" → Run workflow, and make sure Settings → Actions → General → Workflow permissions is set to "Read and write".`);
      else info.push(`${wf}: hasn't run yet.`);
      continue;
    }
    const when = `${fmt(r.createdAt)}, ${daysSince(r.createdAt)} days ago`;
    if (r.conclusion && r.conclusion !== "success") warn.push(`**${wf} failed** on its last run (${when}). Open the Actions tab on GitHub to see why.`);
    else if (wf === "Refresh site data" && daysSince(r.createdAt) > 3) warn.push(`**${wf} hasn't run in ${daysSince(r.createdAt)} days.** GitHub pauses scheduled jobs after 60 days without commits; re-enable it from the Actions tab.`);
    else ok.push(`${wf}: last run passed (${when}).`);
  }
}

// ---------- 3. Outside links and videos ----------
if (linksFile) {
  const rep = (await readArg(linksFile)).trim();
  if (rep) warn.push(`**Broken outside links or videos.** ${rep.split("\n")[0].replace(/^The weekly link check found /, "Found ")} See the "Broken outside links on the website" issue.`);
  else ok.push("Every outside link and team video works.");
}

// ---------- 4. Content that goes out of date ----------
const c = await json("content/content.json");
const seasons = await json("content/seasons.json");
const videos = await json("content/videos.json");
const ftc = await json("content/ftc.json");
if (c) {
  const ctl = c.controls || {};
  if (ctl.maintenance) warn.push("**Maintenance mode is ON.** Visitors only see the \"We'll be right back\" screen. Turn it off in the editor under Site → Master controls when you're done.");
  const off = ["arcade", "calculator", "media", "trophies", "steelAI", "contactForm"].filter((k) => ctl[k] === false);
  if (off.length) info.push(`Switched off in Master controls: ${off.join(", ")}.`);
  if (ctl.searchEngines === false) warn.push("**Search engines are switched off**, so Google won't list the site. Turn it back on under Site → Master controls if that wasn't intended.");
  if (ctl.banner && ctl.bannerText) info.push(`The announcement banner is showing: "${ctl.bannerText}". Remove it once it's out of date.`);

  const ev = (c.outreach?.events || []).filter((e) => String(e.date || "") >= `${season}-09-01`);
  const hrs = ev.reduce((t, e) => t + (Number(e.hours) || 0), 0);
  if (ev.length) ok.push(`Outreach log: ${ev.length} event${ev.length === 1 ? "" : "s"} and ${hrs} hours logged for ${seasonLabel}.`);
  else warn.push(`**No outreach logged for ${seasonLabel} yet.** Add events in the editor under Season → Outreach. The home page is still showing "${c.outreach?.hours || "nothing"}".`);

  const dated = (c.updates || []).map((u) => u.date).filter(Boolean).sort();
  const last = dated[dated.length - 1];
  if (!last) info.push("Team updates (Media page) have no dates. Adding a date to each one shows visitors the build log is current.");
  else if (daysSince(last) > 45) warn.push(`**The last team update was ${daysSince(last)} days ago** (${fmt(last)}). Post a quick build-log update in the editor under Media → Team updates.`);
  else ok.push(`Latest team update: ${fmt(last)}.`);

  if (!(c.sponsors || []).length) info.push("No sponsors are listed yet.");
  else ok.push(`${c.sponsors.length} sponsor${c.sponsors.length === 1 ? "" : "s"} listed.`);
  if (!c.team?.instagram) info.push("No Instagram handle is set (Site → Team info). Social links appear on their own once it's added.");
}
if (seasons) {
  const has = (seasons.seasons || []).some((s) => Number(s.year) === season);
  if (has) ok.push(`The FTC page has the ${seasonLabel} game.`);
  else warn.push(`**The FTC page doesn't have the ${seasonLabel} game yet.** Add it to content/seasons.json (see the README).`);
}
if (videos?.videos?.length) {
  const newest = videos.videos.map((v) => v.published).sort().pop();
  const d = daysSince(newest);
  if (d > 60) info.push(`The newest YouTube video is from ${fmt(newest)} (${d} days ago). New uploads appear on the site automatically.`);
  else ok.push(`Newest YouTube video: ${fmt(newest)}.`);
}
if (ftc?.raw?.gql) {
  const events = ftc.raw.gql[`s${season}`] || [];
  const upcoming = events.filter((e) => String(e.event?.start || "") >= today).sort((a, b) => String(a.event.start).localeCompare(String(b.event.start)));
  if (upcoming.length) ok.push(`Next event on FTCScout: ${upcoming[0].event.name} (${fmt(upcoming[0].event.start)}). The home page countdown is automatic.`);
  else if (now.getUTCMonth() >= 8 || now.getUTCMonth() <= 2) info.push(`No upcoming ${seasonLabel} events on FTCScout yet. The home page countdown appears once the team registers for one.`);
}

// ---------- Report ----------
const lines = [
  `Automatic website check-in for **${fmt(now)}**. ${warn.length ? `**${warn.length} thing${warn.length === 1 ? "" : "s"} need${warn.length === 1 ? "s" : ""} attention.**` : "Everything looks good."}`,
  "",
  ...(warn.length ? ["### Needs attention", ...warn.map((w) => `- ⚠️ ${w}`), ""] : []),
  ...(info.length ? ["### Good to know", ...info.map((w) => `- ℹ️ ${w}`), ""] : []),
  ...(ok.length ? ["### Working", ...ok.map((w) => `- ✅ ${w}`), ""] : []),
  "---",
  "Posted by `.github/workflows/checkin.yml` every other Monday. The previous check-in is closed when a new one is posted. Run it any time from the Actions tab (\"Website check-in\" → Run workflow).",
];
await writeFile(out, lines.join("\n"));
console.log(lines.join("\n"));
