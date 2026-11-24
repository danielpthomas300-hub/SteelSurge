// Checks every outside link on the site (sponsors, FIRST, YouTube, social media...).
//
//   node tools/check_external.mjs            prints a report
//   node tools/check_external.mjs out.md     also writes the broken links to out.md
//
// Collects https:// links from the built pages, content/content.json, and the site
// scripts. A link counts as broken only when the site answers 404/410 or can't be
// reached at all (twice). Sites that block robots (403, 429...) are listed as
// "couldn't check" instead, so they don't raise false alarms.
// Run weekly by .github/workflows/link-check.yml. Needs Node 18+; no packages.
import { readFile, writeFile, readdir } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8").catch(() => "");
const found = new Map(); // url -> Set(where)
const add = (u, where) => {
  u = u.replace(/&amp;/g, "&").replace(/[),.;'"\]]+$/, "");
  if (!/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(u) || u.includes("${")) return;
  // Skip endpoints that aren't pages (APIs, fonts, image CDNs, the site itself)
  if (/fonts\.(googleapis|gstatic)|api\.ftcscout|i\.ytimg|youtube-nocookie\.com\/embed|schema\.org|w3\.org|cdnjs|jsdelivr|unpkg|danielpthomas300-hub\.github\.io|formsubmit|web3forms/i.test(u)) return;
  if (!found.has(u)) found.set(u, new Set());
  found.get(u).add(where);
};
const scan = (text, where) => { for (const m of text.matchAll(/https:\/\/[^\s"'<>`)]+/g)) add(m[0], where); };

const pages = [...(await readdir(root)).filter((f) => f.endsWith(".html")), ...(await readdir(new URL("arcade/", root))).filter((f) => f.endsWith(".html")).map((f) => `arcade/${f}`)];
for (const p of pages) scan(await read(p), p);
scan(await read("content/content.json"), "content.json");
for (const f of ["site.js", "steel-ai.js"]) scan(await read(`assets/js/${f}`), f);
// Team videos: a deleted or private video leaves a blank card, so check each one through YouTube's oEmbed
const ytIds = new Map();
try { for (const v of JSON.parse(await read("content/content.json")).featuredVideos || []) ytIds.set(String(v.id).match(/[\w-]{11}$/)?.[0], "Media → Our picks"); } catch {}
try { for (const v of JSON.parse(await read("content/videos.json")).videos || []) if (!ytIds.has(v.id)) ytIds.set(v.id, "Recent videos"); } catch {}
for (const [id, where] of ytIds) if (id) { const u = `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`; found.set(u, new Set([`${where} (video ${id})`])); }

async function probe(u) {
  const opts = { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; SteelSurgeLinkCheck/1.0)", Accept: "text/html,*/*" }, signal: AbortSignal.timeout(20000) };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let r = await fetch(u, { ...opts, method: "HEAD" });
      if (r.status === 405 || r.status === 403 || r.status === 400 || r.status === 404) r = await fetch(u, { ...opts, method: "GET" });
      return r.status;
    } catch (e) {
      if (attempt) return `error: ${e.cause?.code || e.name}`;
      await new Promise((ok) => setTimeout(ok, 3000));
    }
  }
}

const urls = [...found.keys()].sort();
const broken = [], unsure = [];
let i = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < urls.length) {
    const u = urls[i++], s = await probe(u), where = [...found.get(u)].slice(0, 3).join(", ");
    if (s === 404 || s === 410 || ((s === 400 || s === 401 || s === 403) && u.includes("/oembed")) || String(s).startsWith("error")) broken.push({ u, s, where });
    else if (typeof s === "number" && s >= 400) unsure.push({ u, s, where });
  }
}));

console.log(`Checked ${urls.length} outside links: ${broken.length} broken, ${unsure.length} couldn't be checked.`);
for (const b of broken) console.log(`BROKEN  ${b.s}  ${b.u}  (${b.where})`);
for (const b of unsure) console.log(`UNSURE  ${b.s}  ${b.u}  (${b.where})`);

const out = process.argv[2];
if (out) {
  const lines = broken.length
    ? [
        `The weekly link check found **${broken.length} broken outside link${broken.length === 1 ? "" : "s"}** on the Steel Surge site.`,
        "",
        "| Link | Result | Found in |", "| --- | --- | --- |",
        ...broken.map((b) => `| ${b.u} | ${b.s} | ${b.where} |`),
        "",
        "Fix them in the editor (most links live in Site → Team info, Sponsors, or Contact) or in the page templates, then this issue closes itself on the next clean check.",
      ]
    : [];
  await writeFile(out, lines.join("\n"));
}
