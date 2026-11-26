/* ==========================================================================
   Steel Surge — Site sweep (Team editor → Site → Site sweep)
   Checks the live site from the browser: every page loads, every internal
   link, image, script, and stylesheet works, the published content is
   complete and current, the automatic data refreshes are running, and the
   site's switches make sense. Outside websites can't be tested from a
   browser, so those stay with the weekly GitHub link check.
   Each result: { group, level: "bad" | "warn" | "info" | "ok", text, fix? }
   fix is { sec, field? } (a part of the editor) or { href, label } (a link).
   ========================================================================== */
(() => {
  "use strict";
  const BASE = new URL(".", location.href);
  const today = () => new Date().toISOString().slice(0, 10);
  const currentSeason = () => { const n = new Date(); return n.getMonth() >= 8 ? n.getFullYear() : n.getFullYear() - 1; };
  const seasonLabel = (y) => `${y}–${String(y + 1).slice(2)}`;
  const daysSince = (iso) => Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  const rel = (u) => decodeURI(u.pathname.slice(BASE.pathname.length) || "index.html");
  async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } })); }
  async function status(url) {
    try { let r = await fetch(url, { method: "HEAD", cache: "no-store" }); if (r.status === 405 || r.status === 501) r = await fetch(url, { cache: "no-store" }); return r.status; }
    catch { return 0; }
  }
  const getJSON = async (path) => { const r = await fetch(new URL(path, BASE), { cache: "no-store" }); if (!r.ok) throw new Error(`${path} answered ${r.status}`); return r.json(); };

  async function run({ onProgress = () => {}, content, repo = "danielpthomas300-hub/SteelSurge" } = {}) {
    const results = [], add = (group, level, text, fix) => results.push({ group, level, text, fix });
    const gh = (path, label) => ({ href: `https://github.com/${repo}${path}`, label });

    /* ---------- 1. Pages and internal links ---------- */
    onProgress("Finding every page…", 0.02);
    let pages = [];
    try {
      const xml = await (await fetch(new URL("sitemap.xml", BASE), { cache: "no-store" })).text();
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => new URL(loc).pathname);
      const root = locs.reduce((a, b) => (b.length < a.length ? b : a), locs[0] || "/").replace(/[^/]*$/, ""); // the home page's folder
      pages = locs.map((p) => p.slice(root.length) || "index.html");
    } catch {}
    if (!pages.length) { add("Pages and links", "bad", "The sitemap couldn't be read, so pages couldn't be listed. Rebuild the pages (tools/build_pages.py) and publish."); pages = ["index.html"]; }
    pages = [...new Set([...pages, "404.html"])];
    const refs = new Map(); // url -> Set of pages that use it
    let pageOk = 0, outside = 0;
    await pool(pages, 5, async (p, k) => {
      onProgress(`Loading pages (${k + 1} of ${pages.length})…`, 0.05 + (k / pages.length) * 0.35);
      const url = new URL(p, BASE);
      let res; try { res = await fetch(url, { cache: "no-store" }); } catch { res = null; }
      if (!res || !res.ok) { add("Pages and links", "bad", `The page ${p} doesn't load (${res ? res.status : "no response"}).`); return; }
      pageOk++;
      const doc = new DOMParser().parseFromString(await res.text(), "text/html");
      if (!doc.title.trim()) add("Pages and links", "warn", `${p} has no page title (the text in the browser tab and search results).`);
      if (p !== "404.html" && !doc.querySelector('meta[name="description"]')?.content) add("Pages and links", "warn", `${p} has no search description.`);
      for (const el of doc.querySelectorAll("a[href], link[href], script[src], img[src], source[src], video[src]")) {
        const raw = el.getAttribute("href") ?? el.getAttribute("src");
        if (!raw || /^(#|mailto:|tel:|javascript:|data:)/i.test(raw) || raw.includes("${")) continue;
        let u; try { u = new URL(raw, url); } catch { continue; }
        if (u.origin !== location.origin) { outside++; continue; }
        if (!u.pathname.startsWith(BASE.pathname)) continue;
        u.hash = ""; const key = u.href;
        if (!refs.has(key)) refs.set(key, new Set()); refs.get(key).add(p);
      }
    });
    const urls = [...refs.keys()]; let broken = 0;
    await pool(urls, 8, async (u, k) => {
      if (k % 10 === 0) onProgress(`Checking links and files (${k + 1} of ${urls.length})…`, 0.4 + (k / urls.length) * 0.3);
      const s = await status(u);
      if (s >= 400 || s === 0) { broken++; const on = [...refs.get(u)]; add("Pages and links", "bad", `${rel(new URL(u))} is missing (${s || "no response"}). Used on ${on.slice(0, 3).join(", ")}${on.length > 3 ? ` and ${on.length - 3} more` : ""}.`); }
    });
    add("Pages and links", pageOk === pages.length && !broken ? "ok" : "info", `${pageOk} of ${pages.length} pages load, and ${urls.length - broken} of ${urls.length} internal links and files work.`);
    add("Pages and links", "info", `${outside} links go to other websites. Browsers can't test those, so the weekly GitHub link check does.`, gh("/issues?q=is%3Aissue+broken+links", "See link-check issues"));

    /* ---------- 2. Published content ---------- */
    onProgress("Checking the published content…", 0.72);
    let c = content;
    try { c = c || (await getJSON("content/content.json")); } catch (e) { add("Content", "bad", `The content file couldn't load: ${e.message}`); }
    if (c) {
      const T = c.team || {}, ctl = c.controls || {}, se = currentSeason();
      if (!T.name || !T.number) add("Content", "bad", "The team name or number is empty.", { sec: "team" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(T.email || "")) add("Content", "bad", "The team email is missing or doesn't look right, so the contact page can't show it.", { sec: "team", field: "email" });
      const fe = c.contact?.formEndpoint || "";
      if (!fe) add("Content", "bad", "The contact form has no delivery address, so messages can't be sent.", { sec: "contact", field: "formEndpoint" });
      else if (T.email && !fe.toLowerCase().includes(T.email.toLowerCase())) add("Content", "warn", `The contact form sends to a different address than the team email (${T.email}). Check it's still right.`, { sec: "contact", field: "formEndpoint" });
      if (!T.joinFormUrl) add("Content", "warn", "There's no join-the-team form link, so the Join buttons go nowhere.", { sec: "team", field: "joinFormUrl" });
      if (T.youtubeChannelId && !/^UC[\w-]{22}$/.test(T.youtubeChannelId)) add("Content", "warn", "The YouTube channel ID doesn't look right (it should start with UC and be 24 characters). Videos won't update.", { sec: "team", field: "youtubeChannelId" });
      // Pictures named in the content
      const pics = [];
      (c.members || []).forEach((m) => m.photo && pics.push([m.photo, `${m.name || "A member"}'s photo`, "members"]));
      (c.sponsors || []).forEach((s) => s.logo && pics.push([s.logo, `${s.name || "A sponsor"}'s logo`, "sponsors"]));
      (c.projects || []).forEach((p) => p.image && pics.push([p.image, `The picture for “${p.title || "a project"}”`, "projects"]));
      await pool(pics, 6, async ([path, what, sec]) => { if (/^https?:/.test(path)) return; const s = await status(new URL(path, BASE)); if (s >= 400 || s === 0) add("Content", "bad", `${what} (${path}) isn't uploaded.`, { sec }); });
      const active = (c.members || []).filter((m) => !m.alumni);
      const noPhoto = active.filter((m) => !m.photo).length, noBio = active.filter((m) => !String(m.bio || "").trim()).length;
      if (noPhoto) add("Content", "info", `${noPhoto} team member${noPhoto === 1 ? " has" : "s have"} no photo.`, { sec: "members" });
      if (noBio) add("Content", "info", `${noBio} team member${noBio === 1 ? " has" : "s have"} no bio.`, { sec: "members" });
      const noLogo = (c.sponsors || []).filter((s) => !s.logo).length;
      if (noLogo) add("Content", "info", `${noLogo} sponsor${noLogo === 1 ? " has" : "s have"} no logo, so the name is shown instead.`, { sec: "sponsors" });
      // Is it current?
      const evs = (c.outreach?.events || []).filter((e) => String(e.date || "") >= `${se}-09-01`);
      const m = /(\d{4})\s*[–-]\s*(\d{2})/.exec(c.outreach?.label || "");
      if (!evs.length && m && Number(m[1]) !== se) add("Content", "warn", `The home page says “${c.outreach.hours} ${c.outreach.label}”, which is from an older season. Log this season's outreach, or update the caption.`, { sec: "outreach", field: "label" });
      const last = (c.updates || []).map((u) => u.date).filter(Boolean).sort().pop();
      if (!last) add("Content", "info", "No dated team updates yet.", { sec: "updates" });
      else if (daysSince(last) > 60) add("Content", "warn", `The newest team update is ${daysSince(last)} days old. A quick build-log post shows the team is active.`, { sec: "updates" });
      const future = (c.calendar || []).filter((e) => (e.end || e.date) >= today()).length;
      add("Content", "info", future ? `${future} upcoming team event${future === 1 ? "" : "s"} on the calendar (competitions are added from FTCScout).` : "No upcoming team events on the calendar. Competitions are added from FTCScout once you register.", { sec: "calendar" });
      // Switches
      if (ctl.maintenance) add("Site switches", "warn", "Maintenance mode is on: visitors only see the “We'll be right back” page.", { sec: "controls", field: "maintenance" });
      if (ctl.searchEngines === false) add("Site switches", "warn", "Search engines are asked not to list the site.", { sec: "controls", field: "searchEngines" });
      if (ctl.banner && !String(ctl.bannerText || "").trim()) add("Site switches", "warn", "The announcement banner is on but has no text.", { sec: "controls", field: "bannerText" });
      if (ctl.banner && ctl.bannerUntil && ctl.bannerUntil < today()) add("Site switches", "info", "The announcement banner's end date has passed, so it's hidden.", { sec: "controls", field: "bannerUntil" });
      if (ctl.banner && ctl.bannerLink && /^https?:/.test(ctl.bannerLink) === false) { const s = await status(new URL(ctl.bannerLink, BASE)); if (s >= 400 || s === 0) add("Site switches", "bad", `The banner links to ${ctl.bannerLink}, which doesn't exist.`, { sec: "controls", field: "bannerLink" }); }
      const off = ["arcade", "calculator", "codelab", "scouting", "weekly", "media", "trophies", "steelAI", "contactForm"].filter((k) => ctl[k] === false);
      if (off.length) add("Site switches", "info", `Switched off: ${off.join(", ")}.`, { sec: "controls" });
      if (!results.some((r) => r.group === "Site switches" && r.level !== "info")) add("Site switches", "ok", "Maintenance mode is off, and the banner and features are set up correctly.");
      if (!results.some((r) => r.group === "Content" && (r.level === "bad" || r.level === "warn"))) add("Content", "ok", "Required details are filled in, every picture is uploaded, and nothing looks out of date.");
    }

    /* ---------- 3. Automatic data ---------- */
    onProgress("Checking the automatic data refreshes…", 0.85);
    const se = currentSeason(), actions = gh("/actions", "Open GitHub Actions");
    try { const f = await getJSON("content/ftc.json"); const d = daysSince(f.updatedAt); add("Automatic data", d > 3 ? "warn" : "ok", d > 3 ? `The daily data refresh last ran ${d} days ago. Check the “Refresh site data” job on GitHub.` : `The daily data refresh is running (last ran ${d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`}).`, d > 3 ? actions : undefined); }
    catch { add("Automatic data", "bad", "The saved FTC stats (content/ftc.json) couldn't load.", actions); }
    try { const t = await getJSON("content/teams.json"); const d = daysSince(t.updatedAt); add("Automatic data", d > 10 ? "warn" : "ok", d > 10 ? `The FTC team list for Kilovolt hasn't updated in ${d} days (it should every Monday).` : `Kilovolt's team list is current (${(t.teams || []).length.toLocaleString()} teams, updated ${d} day${d === 1 ? "" : "s"} ago).`, d > 10 ? actions : undefined); }
    catch { add("Automatic data", "bad", "Kilovolt's team list (content/teams.json) couldn't load.", actions); }
    try { const v = await getJSON("content/videos.json"); add("Automatic data", (v.videos || []).length ? "ok" : "warn", (v.videos || []).length ? `${v.videos.length} videos are listed from YouTube.` : "No videos are listed. Check the YouTube channel ID.", (v.videos || []).length ? undefined : { sec: "team", field: "youtubeChannelId" }); }
    catch { add("Automatic data", "warn", "The video list (content/videos.json) couldn't load.", actions); }
    try {
      const s = await getJSON("content/seasons.json"), top = Number(s.seasons?.[0]?.year);
      add("Automatic data", top >= se ? "ok" : "warn", top >= se ? `This season's game (${s.seasons[0].name}) is on the FTC page and score calculator.` : `The ${seasonLabel(se)} game isn't added yet. After kickoff, add it to content/seasons.json and the calculator (see the README).`);
      const man = await status(new URL(`content/manuals/${top}.json`, BASE));
      add("Automatic data", man === 200 ? "ok" : "info", man === 200 ? "Steel AI has this season's game manual." : `Steel AI doesn't have the ${s.seasons?.[0]?.name || "current"} game manual yet, so rules questions use older seasons. See “Steel AI rules” in the README.`);
    } catch { add("Automatic data", "bad", "The game library (content/seasons.json) couldn't load."); }
    try {
      const n = Number(c?.team?.number) || 27254;
      const r = await fetch("https://api.ftcscout.org/graphql", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: `{ teamByNumber(number:${n}) { name } }` }) });
      const j = await r.json();
      add("Automatic data", j?.data?.teamByNumber ? "ok" : "warn", j?.data?.teamByNumber ? "FTCScout is reachable, so live stats, events, and scouting work." : `FTCScout doesn't know team ${n}. Check the team number.`, j?.data?.teamByNumber ? undefined : { sec: "team", field: "number" });
    } catch { add("Automatic data", "warn", "FTCScout didn't answer. Live stats fall back to the daily saved copy, so visitors still see numbers."); }

    onProgress("Done", 1);
    const counts = { bad: 0, warn: 0, info: 0, ok: 0 }; results.forEach((r) => counts[r.level]++);
    return { at: Date.now(), counts, results, pages: pages.length, files: urls.length };
  }
  window.SiteSweep = { run };
})();
