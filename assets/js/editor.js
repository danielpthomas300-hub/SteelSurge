/* ==========================================================================
   Steel Surge — Team editor (developer mode)
   Edit content.json with friendly forms, preview the real site with your
   draft, then publish by pasting into GitHub. Nothing here can change the
   live site on its own — publishing always happens on GitHub.
   ========================================================================== */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DRAFT_KEY = "ss-draft", UNLOCK_KEY = "ss-editor-unlocked";
  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sha256 = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const icon = (n) => window.SS?.ICON?.[n] || "";

  /* ---------------- Sidebar groups and "view on site" links ---------------- */
  const GROUPS = [
    ["Site", ["controls"]],
    ["Team", ["team", "members", "values", "projects", "mentors"]],
    ["Season", ["achievements", "outreach"]],
    ["Media", ["featuredVideos", "updates"]],
    ["Sponsors & contact", ["sponsors", "tiers", "contact"]],
    ["Settings", ["settings"]],
  ];
  const PAGE_FOR = { team: "index.html", members: "team.html", values: "team.html", projects: "team.html", mentors: "team.html", outreach: "index.html", achievements: "team.html", featuredVideos: "media.html", updates: "media.html", sponsors: "sponsors.html", tiers: "sponsors.html", contact: "contact.html" };
  const eye = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const lockIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const undoIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';

  /* ---------------- Schema: what can be edited, in plain words ---------------- */
  const DEPTS = ["Mechanical", "Programming", "Outreach", "Leadership", "Other"];
  const SECTIONS = [
    { id: "controls", title: "Master controls", icon: "gear", desc: "Switches for the whole site: maintenance mode, a site-wide announcement, and which features are turned on. Like every change here, they go live when you publish.",
      get: (c) => ({ ...(window.SS?.CONTROL_DEFAULTS || {}), ...(c.controls || {}) }), set: (c, v) => (c.controls = v),
      fields: [
        { k: "_mx", label: "Maintenance mode", type: "heading", hint: "Shows a 'we'll be right back' page on every page of the site. The Team editor keeps working, and on this device you can still view the site." },
        { k: "maintenance", label: "Turn on maintenance mode", type: "bool" },
        { k: "maintenanceTitle", label: "Headline", type: "text", hint: "e.g. We'll be right back" },
        { k: "maintenanceMessage", label: "Message", type: "textarea" },
        { k: "maintenanceUntil", label: "Expected back (optional)", type: "text", hint: "e.g. Sunday evening. Leave empty to hide." },
        { k: "_banner", label: "Announcement banner", type: "heading", hint: "A strip across the top of every page. Visitors can hide it; it comes back for them when you change the text." },
        { k: "banner", label: "Show the announcement banner", type: "bool" },
        { k: "bannerText", label: "Announcement", type: "text", hint: "e.g. We're competing at the Chester County Qualifier this Saturday!" },
        { k: "bannerLink", label: "Link (optional)", type: "text", hint: "A full web address, or a page on this site like ftc.html. Adds a 'Learn more' link." },
        { k: "bannerTone", label: "Style", type: "select", options: [["info", "Info (steel blue)"], ["celebrate", "Celebrate (gold)"], ["warning", "Heads up (orange)"]] },
        { k: "_features", label: "Features", type: "heading", hint: "Switch parts of the site off. Their links disappear, and their pages say they're taking a break." },
        { k: "arcade", label: "Arcade games", type: "bool" },
        { k: "calculator", label: "Score Calculator", type: "bool" },
        { k: "media", label: "Media page", type: "bool" },
        { k: "trophies", label: "Trophies and trophy case", type: "bool" },
        { k: "steelAI", label: "Steel AI assistant", type: "bool" },
        { k: "contactForm", label: "Contact form", type: "bool", hint: "When off, the Contact page shows the team email instead." },
        { k: "searchEngines", label: "Let search engines list the site", type: "bool", hint: "Turn off to ask Google and others not to show the site in search results." },
      ] },
    { id: "team", title: "Team info", icon: "flag", desc: "Your name, intro, location, and links used across the whole site.",
      get: (c) => c.team, set: (c, v) => (c.team = v),
      fields: [
        { k: "name", label: "Team name", type: "text", required: true },
        { k: "number", label: "FTC team number", type: "number", required: true, hint: "Live stats and awards are pulled from FTCScout using this number." },
        { k: "motto", label: "Team motto", type: "text", hint: "e.g. Surge Ahead" },
        { k: "intro", label: "Intro paragraph", type: "textarea", hint: "Shown on the home page under the big title." },
        { k: "location", label: "Location", type: "text" },
        { k: "school", label: "Schools", type: "text" },
        { k: "rookieYear", label: "Rookie year", type: "number" },
        { k: "email", label: "Team email", type: "email", required: true, hint: "Public. Contact-form messages are delivered here." },
        { k: "joinFormUrl", label: "Join-the-team form link", type: "url" },
        { k: "instagram", label: "Instagram handle", type: "text", hint: "e.g. @steelsurge27254. Leave empty to hide. When set, Instagram appears on the Media and Contact pages and in the footer." },
        { k: "youtubeChannelId", label: "YouTube channel ID", type: "text", hint: "Starts with UC… — find it in your channel's URL. Videos update automatically." },
        { k: "socials", label: "Social links", type: "list", itemLabel: "link", summary: (i) => i.label || "New link", fields: [{ k: "label", label: "Label", type: "text" }, { k: "url", label: "Link", type: "url" }] },
      ] },
    { id: "members", title: "Team members", icon: "users", desc: "Everyone on the team page. Use the arrows to change the order. No personal phone numbers or emails, please.",
      get: (c) => c.members, set: (c, v) => (c.members = v), list: true, itemLabel: "member", summary: (m) => m.name || "New member", sub: (m) => m.role,
      fields: [
        { k: "name", label: "Full name", type: "text", required: true },
        { k: "role", label: "Role", type: "text", hint: "e.g. Programming Lead" },
        { k: "dept", label: "Department", type: "select", options: DEPTS, hint: "Used for the filter buttons on the team page." },
        { k: "photo", label: "Photo", type: "image", folder: "assets/img/team" },
        { k: "bio", label: "Short bio", type: "textarea", hint: "2–3 sentences. Avoid grade levels so it doesn't go out of date." },
        { k: "funFact", label: "Fun fact (optional)", type: "text", hint: "Shown under the bio. e.g. 'Undefeated ping pong champion of the build room.'" },
      ] },
    { id: "values", title: "Team values", icon: "heart", desc: "The 'What Steel Surge stands for' cards on the team page.",
      get: (c) => c.values || [], set: (c, v) => (c.values = v), list: true, itemLabel: "value", summary: (v) => v.title || "New value",
      fields: [{ k: "title", label: "Title", type: "text", required: true }, { k: "body", label: "Description", type: "textarea" }] },
    { id: "projects", title: "Team projects", icon: "gear", desc: "The 'Made by Steel Surge' gallery on the team page: things you've designed and built besides the robot.",
      get: (c) => c.projects || [], set: (c, v) => (c.projects = v), list: true, itemLabel: "project", summary: (p) => p.title || "New project",
      fields: [{ k: "title", label: "Title", type: "text", required: true }, { k: "body", label: "Description", type: "textarea" }, { k: "image", label: "Image", type: "image", folder: "assets/img/projects", square: false }] },
    { id: "outreach", title: "Outreach", icon: "users", desc: "Log each outreach event. The home and sponsor pages add up this season's hours automatically, and the Team page lists every event.",
      get: (c) => c.outreach || {}, set: (c, v) => (c.outreach = v),
      fields: [
        { k: "events", label: "Outreach log", type: "list", itemLabel: "event", summary: (e) => `${e.title || "New event"}${e.date ? " · " + e.date : ""}${e.hours ? " · " + e.hours + " hrs" : ""}`, fields: [
          { k: "date", label: "Date", type: "date" },
          { k: "title", label: "Event", type: "text", hint: "e.g. Robot demo at Kennett Library" },
          { k: "place", label: "Where (optional)", type: "text" },
          { k: "hours", label: "Team hours", type: "number", hint: "Total hours across everyone who helped, e.g. 4 people × 3 hours = 12" },
          { k: "people", label: "People reached (optional)", type: "number" },
          { k: "detail", label: "What we did (optional)", type: "textarea" },
        ] },
        { k: "hours", label: "Hours to show when nothing is logged this season", type: "text", hint: "e.g. 40+. Once you log an event this season, the log's total is shown instead." },
        { k: "label", label: "Caption for that number", type: "text", hint: "e.g. outreach hours in 2025–26" },
      ] },
    { id: "mentors", title: "Mentors", icon: "star", desc: "Shown on the team page only when at least one mentor is listed.",
      get: (c) => c.mentors || [], set: (c, v) => (c.mentors = v), list: true, itemLabel: "mentor", summary: (m) => m.name || "New mentor", sub: (m) => m.role,
      fields: [{ k: "name", label: "Name", type: "text", required: true }, { k: "role", label: "What they help with", type: "text" }] },
    { id: "achievements", title: "Milestones & awards", icon: "trophy", desc: "The milestones timeline on the Team page. Official FTC awards are added there automatically from FTCScout; add anything else worth celebrating here.",
      get: (c) => c.achievements, set: (c, v) => (c.achievements = v), list: true, itemLabel: "milestone", summary: (a) => a.title || "New milestone", sub: (a) => a.date,
      fields: [
        { k: "date", label: "Month", type: "month", required: true },
        { k: "title", label: "Title", type: "text", required: true },
        { k: "detail", label: "Details", type: "textarea" },
        { k: "icon", label: "Type", type: "select", options: [["milestone", "Milestone (timeline only)"], ["award", "Award (also on the trophy shelf)"]] },
      ] },
    { id: "featuredVideos", title: "Featured videos", icon: "play", desc: "Your team's favorite videos, pinned on the Media page. The rest of the Media page's video list updates by itself every day.",
      get: (c) => c.featuredVideos || [], set: (c, v) => (c.featuredVideos = v), list: true, itemLabel: "video", summary: (v) => v.title || "New video",
      fields: [{ k: "id", label: "YouTube link or video ID", type: "text", required: true, hint: "Paste the video's link, e.g. https://youtu.be/IZyD3Pkvvr4" }, { k: "title", label: "Title", type: "text" }] },
    { id: "updates", title: "Team updates", icon: "pencil", desc: "Short build-log posts on the Media page. Dated posts are shown newest first.",
      get: (c) => c.updates, set: (c, v) => (c.updates = v), list: true, itemLabel: "update", summary: (u) => u.title || "New update", sub: (u) => u.date,
      fields: [{ k: "date", label: "Date", type: "date", hint: "Optional. Dated posts are shown newest first." }, { k: "title", label: "Title", type: "text", required: true }, { k: "body", label: "Text", type: "textarea" }] },
    { id: "sponsors", title: "Sponsors", icon: "heart", desc: "The sponsor wall and the scrolling sponsor strip on the home page.",
      get: (c) => c.sponsors, set: (c, v) => (c.sponsors = v), list: true, itemLabel: "sponsor", summary: (s) => s.name || "New sponsor", sub: (s) => s.tier,
      fields: [
        { k: "name", label: "Name", type: "text", required: true },
        { k: "tier", label: "Tier or label", type: "text", hint: "e.g. Gold, Partner, In-kind" },
        { k: "url", label: "Website", type: "url" },
        { k: "logo", label: "Logo", type: "image", folder: "assets/img/sponsors", square: false },
      ] },
    { id: "tiers", title: "Sponsor tiers", icon: "chart", desc: "The pitch and pricing on the Sponsors page.",
      get: (c) => ({ sponsorPitch: c.sponsorPitch, sponsorPacketUrl: c.sponsorPacketUrl || "", sponsorTiers: c.sponsorTiers }), set: (c, v) => { c.sponsorPitch = v.sponsorPitch; c.sponsorPacketUrl = v.sponsorPacketUrl; c.sponsorTiers = v.sponsorTiers; },
      fields: [
        { k: "sponsorPitch", label: "Sponsor pitch", type: "textarea" },
        { k: "sponsorPacketUrl", label: "Sponsor packet link (optional)", type: "url", hint: "A Google Drive or PDF link. Adds a 'Download our sponsor packet' button." },
        { k: "sponsorTiers", label: "Tiers", type: "list", itemLabel: "tier", summary: (t) => `${t.name || "New tier"}${t.amount ? " · $" + Number(t.amount).toLocaleString() : ""}`, fields: [
          { k: "name", label: "Tier name", type: "text", required: true }, { k: "amount", label: "Amount ($ per season)", type: "number" },
          { k: "featured", label: "Highlight as top tier", type: "bool" }, { k: "perks", label: "Perks", type: "strings", itemLabel: "perk" },
        ] },
      ] },
    { id: "contact", title: "Contact form", icon: "mail", desc: "Topics people can pick on the contact page.",
      get: (c) => c.contact, set: (c, v) => (c.contact = v),
      fields: [
        { k: "reasons", label: "Topics", type: "strings", itemLabel: "topic" },
        { k: "formEndpoint", label: "Form delivery address", type: "url", hint: "Advanced. FormSubmit endpoint that emails messages to the team. Leave as is unless the team email changes." },
      ] },
    { id: "settings", title: "Editor settings", icon: "gear", desc: "Change the editor passcode. The new passcode works once you publish.",
      get: (c) => c.dev, set: (c, v) => (c.dev = v), custom: true },
  ];

  function settingsPanel(host) {
    host.innerHTML = `
      <div class="ed-fields">
        <div class="field"><label for="np1">New passcode</label><input class="input" id="np1" type="password" autocomplete="new-password" minlength="6"></div>
        <div class="field"><label for="np2">Type it again</label><input class="input" id="np2" type="password" autocomplete="new-password"></div>
        <p class="field-error" id="np-err" aria-live="polite"></p>
        <div><button class="btn primary sm" type="button" id="np-save">Set new passcode</button></div>
        <p class="hint">Only a scrambled fingerprint of the passcode is stored in the site files — never the passcode itself. Share it only with team members who update the site.</p>
      </div>`;
    $("#np-save", host).addEventListener("click", async () => {
      const a = $("#np1", host).value.trim(), b = $("#np2", host).value.trim(), err = $("#np-err", host);
      if (a.length < 6) { err.textContent = "Use at least 6 characters."; return; }
      if (a !== b) { err.textContent = "Those don't match."; return; }
      draft.dev = { ...draft.dev, passcodeHash: await sha256(a) }; err.textContent = "";
      $("#np1", host).value = $("#np2", host).value = ""; changed(); window.SS?.toast("Passcode updated in your draft — publish to make it live");
    });
  }

  /* ---------------- State ---------------- */
  let published, draft, savedAt, current = "team";

  async function init() {
    try { published = await (await fetch("content/content.json", { cache: "no-cache" })).json(); }
    catch { $("#app").innerHTML = `<div class="ed-lock"><div class="card"><h1>Can't load content</h1><p class="muted">Open the editor from the website (not by double-clicking the file).</p></div></div>`; return; }
    let unlocked = false; try { unlocked = sessionStorage.getItem(UNLOCK_KEY) === published.dev?.passcodeHash; } catch {}
    unlocked ? openEditor() : lockScreen();
  }

  function lockScreen() {
    $("#app").innerHTML = `
      <div class="ed-lock">
        <form class="ed-lock-card" id="lock-form">
          <div class="ed-lock-art"><img src="assets/img/logo-hero.webp" alt="Steel Surge logo" width="220" height="220"></div>
          <div class="ed-lock-body">
            <span class="ed-kicker">Steel Surge · FTC 27254</span>
            <h1>Team editor</h1>
            <p class="muted">Update the website without touching code. Enter the team passcode to continue.</p>
            <div class="field"><label for="pass">Passcode</label>
              <div class="ed-pass"><input class="input" id="pass" type="password" autocomplete="current-password" autofocus>
                <button type="button" class="ed-pass-toggle" aria-label="Show passcode" aria-pressed="false">${eye}</button></div></div>
            <p class="field-error" id="lock-err" aria-live="polite"></p>
            <button class="btn primary ed-unlock" type="submit">Unlock editor ${icon("arrow")}</button>
            <p class="ed-fine">${lockIco} The passcode keeps visitors out of this page. Changes only go live when a team member publishes them on GitHub.</p>
            <a class="ed-back" href="index.html">← Back to the website</a>
          </div>
        </form>
      </div>`;
    $(".ed-pass-toggle").addEventListener("click", (e) => {
      const inp = $("#pass"), show = inp.type === "password"; inp.type = show ? "text" : "password";
      e.currentTarget.setAttribute("aria-pressed", String(show)); e.currentTarget.setAttribute("aria-label", show ? "Hide passcode" : "Show passcode"); inp.focus();
    });
    $("#lock-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const h = await sha256($("#pass").value.trim());
      if (h === published.dev?.passcodeHash) { try { sessionStorage.setItem(UNLOCK_KEY, h); } catch {} openEditor(); }
      else { $("#lock-err").textContent = "That passcode isn't right."; $("#pass").select(); const card = $(".ed-lock-card"); card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake"); }
    });
  }

  function openEditor() {
    const d = store.get(DRAFT_KEY);
    draft = d?.content ? d.content : clone(published);
    savedAt = d?.savedAt || null;
    for (const k of ["mentors", "achievements", "updates", "sponsors", "sponsorTiers", "members", "values", "featuredVideos", "projects"]) if (!Array.isArray(draft[k])) draft[k] = [];
    current = (location.hash.slice(1) && SECTIONS.some((s) => s.id === location.hash.slice(1))) ? location.hash.slice(1) : "team";
    $("#app").innerHTML = `
      <div class="ed">
        <header class="ed-bar">
          <a class="brand" href="index.html" title="Back to the website">${window.SS?.LOGO || ""}<span>Steel Surge<small>TEAM EDITOR</small></span></a>
          <div class="ed-status" id="status" aria-live="polite"></div>
          <div class="ed-actions">
            <button class="btn ghost sm" id="discard" type="button">${undoIco} Discard draft</button>
            <a class="btn sm" id="preview" href="index.html?preview=1" target="_blank" rel="noopener">${eye} Preview site</a>
            <button class="btn primary sm" id="publish" type="button">Publish<span class="ed-count" id="pub-count"></span></button>
          </div>
        </header>
        <div class="ed-body">
          <aside class="ed-side">
            <nav class="ed-nav" id="nav" aria-label="Sections"></nav>
            <div class="ed-side-foot"><button type="button" class="btn ghost sm" id="lock">${lockIco} Lock editor</button></div>
          </aside>
          <main class="ed-main" id="panel"></main>
        </div>
      </div>
      <dialog class="ed-dialog" id="publish-dialog"></dialog>`;
    $("#discard").addEventListener("click", discard);
    $("#lock").addEventListener("click", () => { save(true); try { sessionStorage.removeItem(UNLOCK_KEY); } catch {} lockScreen(); window.SS?.toast("Editor locked. Your draft is saved on this device."); });
    $("#publish").addEventListener("click", openPublish);
    $("#preview").addEventListener("click", () => save(true));
    renderNav(); renderPanel(); updateStatus();
  }

  /* ---------------- Saving ---------------- */
  let saveTimer;
  function changed() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { save(); refreshHead(); }, 350); updateStatus(true); }
  /** Updates the section header's "Changed" badge and item count without rebuilding the form. */
  function refreshHead() {
    const sec = SECTIONS.find((x) => x.id === current); if (!sec || sec.custom) return;
    const head = $(".ed-head"); if (!head) return;
    const dirty = JSON.stringify(sec.get(draft)) !== JSON.stringify(sec.get(published));
    const had = !!$(".ed-badge", head), hadUndo = !!$("#undo-sec", head);
    const pill = $(".ed-pill", head); if (pill && sec.list) { const n = (sec.get(draft) || []).length; pill.textContent = `${n} ${sec.itemLabel}${n === 1 ? "" : "s"}`; }
    if (dirty !== had || dirty !== hadUndo) renderPanelHeadOnly(sec, dirty);
  }
  function renderPanelHeadOnly(sec, dirty) {
    const h1 = $(".ed-head h1"); if (!h1) return;
    $(".ed-badge", h1)?.remove(); if (dirty) h1.insertAdjacentHTML("beforeend", '<span class="ed-badge">Changed</span>');
    const tools = $(".ed-head-tools"); $("#undo-sec", tools)?.remove();
    if (dirty) {
      tools.insertAdjacentHTML("afterbegin", `<button type="button" class="btn ghost sm" id="undo-sec">${undoIco} Undo changes</button>`);
      $("#undo-sec", tools).addEventListener("click", () => {
        if (!confirm(`Undo your unpublished changes to “${sec.title}”?`)) return;
        sec.set(draft, clone(sec.get(published))); save(); renderNav(); renderPanel(); window.SS?.toast(`${sec.title} restored`);
      });
    }
  }
  function save(now = false) {
    clearTimeout(saveTimer);
    const dirty = JSON.stringify(draft) !== JSON.stringify(published);
    if (dirty) { savedAt = Date.now(); store.set(DRAFT_KEY, { content: draft, savedAt }); }
    else { store.del(DRAFT_KEY); savedAt = null; }
    updateStatus(); renderNav();
    return now;
  }
  const dirtySections = () => SECTIONS.filter((s) => JSON.stringify(s.get(draft)) !== JSON.stringify(s.get(published)));
  function updateStatus(saving = false) {
    const el = $("#status"); if (!el) return;
    const n = dirtySections().length;
    el.className = `ed-status ${saving ? "is-saving" : n ? "is-draft" : "is-live"}`;
    el.innerHTML = saving ? `<span class="dot saving"></span>Saving…` : n ? `<span class="dot draft"></span>Draft saved on this device · ${n} section${n === 1 ? "" : "s"} changed` : `<span class="dot ok"></span>Everything matches the live site`;
    $("#publish").disabled = !n; $("#discard").disabled = !n;
    const c = $("#pub-count"); if (c) { c.textContent = n || ""; c.hidden = !n; }
  }
  function discard() {
    if (!confirm("Throw away all unpublished changes on this device?")) return;
    store.del(DRAFT_KEY); draft = clone(published); renderNav(); renderPanel(); updateStatus(); window.SS?.toast("Draft discarded");
  }

  /* ---------------- Nav & panel ---------------- */
  function renderNav() {
    const dirty = new Set(dirtySections().map((s) => s.id));
    const item = (s) => `<button type="button" class="ed-nav-item${s.id === current ? " active" : ""}" data-sec="${s.id}"${s.id === current ? ' aria-current="page"' : ""}><i class="ed-nav-ico">${icon(s.icon)}</i><span>${s.title}</span>${dirty.has(s.id) ? '<i class="ed-dirty" title="Changed"></i>' : ""}</button>`;
    const byId = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
    const grouped = new Set(GROUPS.flatMap(([, ids]) => ids));
    $("#nav").innerHTML = GROUPS.map(([label, ids]) => `<div class="ed-nav-group"><span class="ed-nav-label">${label}</span>${ids.filter((id) => byId[id]).map((id) => item(byId[id])).join("")}</div>`).join("")
      + SECTIONS.filter((s) => !grouped.has(s.id)).map(item).join("");
    $$("[data-sec]", $("#nav")).forEach((b) => b.addEventListener("click", () => { current = b.dataset.sec; history.replaceState(null, "", "#" + current); renderNav(); renderPanel(); $("#panel").scrollTo?.(0, 0); scrollTo(0, 0); }));
  }

  function renderPanel() {
    const sec = SECTIONS.find((s) => s.id === current);
    const panel = $("#panel");
    const isDirty = !sec.custom && JSON.stringify(sec.get(draft)) !== JSON.stringify(sec.get(published));
    const count = sec.list ? (sec.get(draft) || []).length : null;
    panel.innerHTML = `<div class="ed-head">
        <div class="ed-head-ico">${icon(sec.icon)}</div>
        <div class="ed-head-text"><h1>${sec.title}${isDirty ? '<span class="ed-badge">Changed</span>' : ""}</h1><p class="muted">${sec.desc}</p></div>
        <div class="ed-head-tools">
          ${count != null ? `<span class="ed-pill">${count} ${sec.itemLabel}${count === 1 ? "" : "s"}</span>` : ""}
          ${isDirty ? `<button type="button" class="btn ghost sm" id="undo-sec">${undoIco} Undo changes</button>` : ""}
          ${PAGE_FOR[sec.id] ? `<a class="btn sm" href="${PAGE_FOR[sec.id]}?preview=1" target="_blank" rel="noopener">${eye} View on site</a>` : ""}
        </div></div><div id="form" class="${sec.list ? "" : "ed-card"}"></div>`;
    $("#undo-sec", panel)?.addEventListener("click", () => {
      if (!confirm(`Undo your unpublished changes to “${sec.title}”?`)) return;
      sec.set(draft, clone(sec.get(published))); save(); renderNav(); renderPanel(); window.SS?.toast(`${sec.title} restored`);
    });
    const host = $("#form", panel);
    if (sec.custom) {
      settingsPanel(host);
    } else if (sec.list) {
      host.append(listEditor(sec.get(draft), sec, (v) => { sec.set(draft, v); changed(); }));
    } else {
      const obj = sec.get(draft);
      host.append(fieldsEditor(sec.fields, obj, (v) => { sec.set(draft, v); changed(); }));
    }
  }

  /* ---------------- Form builders ---------------- */
  let uid = 0;
  function fieldsEditor(fields, obj, onChange) {
    const wrap = document.createElement("div"); wrap.className = "ed-fields";
    const value = { ...obj };
    for (const f of fields) {
      const id = `f${++uid}`, row = document.createElement("div");
      row.className = `field ed-field ed-${f.type}`;
      const label = `<label for="${id}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ""}</label>`;
      const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : "";
      const set = (v) => { value[f.k] = v; onChange({ ...value }); };
      const v = value[f.k];
      if (f.type === "heading") {
        row.className = "ed-group-head";
        row.innerHTML = `<h3>${esc(f.label)}</h3>${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ""}`;
      } else if (f.type === "textarea") {
        row.innerHTML = `${label}<textarea class="textarea" id="${id}" rows="4">${esc(v)}</textarea>${hint}`;
        $("textarea", row).addEventListener("input", (e) => set(e.target.value));
      } else if (f.type === "select") {
        const opts = f.options.map((o) => (Array.isArray(o) ? o : [o, o]));
        if (v && !opts.some(([val]) => val === v)) opts.push([v, v]);
        row.innerHTML = `${label}<select class="select input" id="${id}">${opts.map(([val, lab]) => `<option value="${esc(val)}"${val === v ? " selected" : ""}>${esc(lab)}</option>`).join("")}</select>${hint}`;
        $("select", row).addEventListener("change", (e) => set(e.target.value));
      } else if (f.type === "bool") {
        row.innerHTML = `<label class="ed-switch"><input type="checkbox" id="${id}"${v ? " checked" : ""}><span></span>${esc(f.label)}</label>${hint}`;
        $("input", row).addEventListener("change", (e) => set(e.target.checked));
      } else if (f.type === "list") {
        row.innerHTML = `<span class="ed-label">${esc(f.label)}</span>${hint}`;
        row.append(listEditor(Array.isArray(v) ? v : [], f, (nv) => set(nv)));
      } else if (f.type === "strings") {
        row.innerHTML = `<span class="ed-label">${esc(f.label)}</span>${hint}`;
        row.append(stringsEditor(Array.isArray(v) ? v : [], f, (nv) => set(nv)));
      } else if (f.type === "image") {
        row.innerHTML = `${label}<div class="ed-image"><div class="ed-thumb${f.square === false ? " wide" : ""}"></div><div class="ed-image-side">
            <input class="input" id="${id}" type="text" placeholder="${esc(f.folder)}/photo.jpg" value="${esc(v)}">
            <div class="ed-image-actions"><label class="btn sm">${icon("pencil")} Prepare a new image<input type="file" accept="image/*" hidden></label></div>
            <span class="hint">Pick an image and we'll ${f.square === false ? "shrink" : "crop and shrink"} it and download it for you. Then upload it to <b>${esc(f.folder)}</b> on GitHub (the Publish dialog has a link).</span>
          </div></div>`;
        const input = $("input[type=text]", row), thumb = $(".ed-thumb", row);
        const showThumb = (src) => { thumb.innerHTML = src ? `<img src="${esc(src)}" alt="" onerror="this.parentNode.classList.add('missing');this.remove()">` : ""; thumb.classList.toggle("missing", !src); };
        showThumb(v);
        input.addEventListener("input", (e) => { set(e.target.value.trim()); showThumb(e.target.value.trim()); });
        $("input[type=file]", row).addEventListener("change", async (e) => {
          const file = e.target.files[0]; if (!file) return;
          const base = (value.name || file.name.replace(/\.[^.]+$/, "")).toLowerCase().replace(/[^a-z0-9]+/g, "");
          const { blob, dataUrl } = await prepareImage(file, f.square !== false);
          const path = `${f.folder}/${base || "image"}.jpg`;
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = path.split("/").pop(); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          input.value = path; set(path); thumb.innerHTML = `<img src="${dataUrl}" alt="">`; thumb.classList.remove("missing");
          window.SS?.toast(`Saved ${a.download} — upload it to ${f.folder} on GitHub`);
          e.target.value = "";
        });
      } else {
        const type = { number: "number", email: "email", url: "url", month: "month", date: "date" }[f.type] || "text";
        row.innerHTML = `${label}<input class="input" id="${id}" type="${type}" value="${esc(v)}">${hint}<span class="field-error"></span>`;
        const input = $("input", row);
        input.addEventListener("input", (e) => {
          const val = type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value;
          set(val);
          const bad = (f.required && e.target.value.trim() === "") || !e.target.checkValidity();
          input.setAttribute("aria-invalid", String(bad)); $(".field-error", row).textContent = bad ? (f.required && !e.target.value.trim() ? "Required" : "That doesn't look right") : "";
        });
      }
      wrap.append(row);
    }
    return wrap;
  }

  function listEditor(arr, spec, onChange) {
    const items = arr.map((x) => ({ ...x }));
    const box = document.createElement("div"); box.className = "ed-list";
    const open = new Set();
    const emit = () => onChange(items.map((x) => ({ ...x })));
    const draw = () => {
      box.innerHTML = "";
      if (!items.length) box.insertAdjacentHTML("beforeend", `<div class="empty-state">No ${spec.itemLabel}s yet.</div>`);
      items.forEach((it, i) => {
        const card = document.createElement("div"); card.className = `ed-item${open.has(i) ? " open" : ""}`;
        const sub = spec.sub?.(it);
        const imgField = (spec.fields || []).find((f) => f.type === "image"), img = imgField ? it[imgField.k] : "";
        const thumb = imgField ? `<span class="ed-item-thumb${imgField.square === false ? " wide" : ""}">${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}<i>${esc((spec.summary(it) || "?").trim()[0] || "?")}</i></span>` : "";
        card.innerHTML = `
          <div class="ed-item-head">
            <button type="button" class="ed-item-toggle" aria-expanded="${open.has(i)}">${thumb}<span class="ed-item-text"><b>${esc(spec.summary(it))}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</span></button>
            <div class="ed-item-tools">
              <button type="button" class="icon-btn" data-a="up" aria-label="Move up" ${i === 0 ? "disabled" : ""}>${upIcon}</button>
              <button type="button" class="icon-btn" data-a="down" aria-label="Move down" ${i === items.length - 1 ? "disabled" : ""}>${downIcon}</button>
              <button type="button" class="icon-btn danger" data-a="del" aria-label="Delete">${trashIcon}</button>
            </div>
          </div>`;
        if (open.has(i)) {
          const body = document.createElement("div"); body.className = "ed-item-body";
          body.append(fieldsEditor(spec.fields, it, (nv) => {
            items[i] = nv; emit();
            $(".ed-item-text b", card).textContent = spec.summary(nv);
            const s = $(".ed-item-text span", card); if (s) s.textContent = spec.sub?.(nv) || "";
          }));
          card.append(body);
        }
        $(".ed-item-toggle", card).addEventListener("click", () => { open.has(i) ? open.delete(i) : open.add(i); draw(); });
        $$("[data-a]", card).forEach((b) => b.addEventListener("click", () => {
          const a = b.dataset.a;
          if (a === "del") { if (!confirm(`Delete "${spec.summary(it)}"?`)) return; items.splice(i, 1); open.clear(); }
          else { const j = a === "up" ? i - 1 : i + 1; [items[i], items[j]] = [items[j], items[i]]; const oi = open.has(i), oj = open.has(j); open.delete(i); open.delete(j); if (oi) open.add(j); if (oj) open.add(i); }
          emit(); draw();
        }));
        box.append(card);
      });
      const add = document.createElement("button"); add.type = "button"; add.className = "btn ed-add";
      add.innerHTML = `+ Add ${spec.itemLabel}`;
      add.addEventListener("click", () => {
        const blank = {}; spec.fields.forEach((f) => (blank[f.k] = f.type === "list" || f.type === "strings" ? [] : f.type === "bool" ? false : f.type === "select" ? (Array.isArray(f.options[0]) ? f.options[0][0] : f.options[0]) : ""));
        items.push(blank); open.add(items.length - 1); emit(); draw();
        const cards = $$(".ed-item", box); cards[cards.length - 1]?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => $(".ed-item.open:last-of-type input, .ed-item.open:last-of-type textarea", box)?.focus(), 250);
      });
      box.append(add);
    };
    draw();
    return box;
  }

  function stringsEditor(arr, spec, onChange) {
    const items = arr.slice();
    const box = document.createElement("div"); box.className = "ed-strings";
    const draw = () => {
      box.innerHTML = "";
      items.forEach((s, i) => {
        const row = document.createElement("div"); row.className = "ed-string";
        row.innerHTML = `<input class="input" type="text" value="${esc(s)}" aria-label="${esc(spec.itemLabel)} ${i + 1}"><button type="button" class="icon-btn danger" aria-label="Remove">${trashIcon}</button>`;
        $("input", row).addEventListener("input", (e) => { items[i] = e.target.value; onChange(items.slice()); });
        $("button", row).addEventListener("click", () => { items.splice(i, 1); onChange(items.slice()); draw(); });
        box.append(row);
      });
      const add = document.createElement("button"); add.type = "button"; add.className = "btn sm ed-add"; add.textContent = `+ Add ${spec.itemLabel}`;
      add.addEventListener("click", () => { items.push(""); onChange(items.slice()); draw(); $$("input", box).pop()?.focus(); });
      box.append(add);
    };
    draw();
    return box;
  }

  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const upIcon = svg('<path d="m6 15 6-6 6 6"/>'), downIcon = svg('<path d="m6 9 6 6 6-6"/>'), trashIcon = svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>');

  /** Crop to square (optional) and resize to 640px, returning a JPG. */
  function prepareImage(file, square) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (square) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = sh > sw ? (sh - s) * 0.2 : 0; sw = sh = s; }
        const scale = Math.min(1, 640 / Math.max(sw, sh)), cw = Math.round(sw * scale), ch = Math.round(sh * scale);
        const c = document.createElement("canvas"); c.width = cw; c.height = ch;
        const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        const dataUrl = c.toDataURL("image/jpeg", 0.84);
        c.toBlob((blob) => resolve({ blob, dataUrl }), "image/jpeg", 0.84);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject; img.src = URL.createObjectURL(file);
    });
  }

  /* ---------------- Publish ---------------- */
  function openPublish() {
    save();
    const repo = draft.dev?.repo || "danielpthomas300-hub/SteelSurge", branch = draft.dev?.branch || "main";
    const json = JSON.stringify(draft, null, 2) + "\n";
    const changedList = dirtySections().map((s) => `<li>${esc(s.title)}</li>`).join("");
    const dlg = $("#publish-dialog");
    dlg.innerHTML = `
      <form method="dialog" class="ed-dialog-inner">
        <div class="ed-dialog-head"><h2>Publish your changes</h2><button class="icon-btn" value="close" aria-label="Close">${icon("close")}</button></div>
        <p class="muted">Changed: </p><ul class="ed-changed">${changedList}</ul>
        <ol class="ed-steps">
          <li><b>Copy your updated content</b><div class="ed-step-actions"><button type="button" class="btn primary sm" id="copy-json">${icon("copy")} Copy content</button><button type="button" class="btn sm" id="dl-json">Download file instead</button></div></li>
          <li><b>Open the content file on GitHub</b> (sign in with the team account)<div class="ed-step-actions"><a class="btn sm" href="https://github.com/${esc(repo)}/edit/${esc(branch)}/content/content.json" target="_blank" rel="noopener">${icon("ext")} Open content.json on GitHub</a></div></li>
          <li><b>Replace everything and save</b> — click in the editor, press <span class="kbd">Ctrl</span> <span class="kbd">A</span>, then <span class="kbd">Ctrl</span> <span class="kbd">V</span>, then <b>Commit changes</b>.</li>
          <li><b>Wait about a minute.</b> The live site updates by itself.</li>
        </ol>
        <details class="ed-details"><summary>Added new photos or logos?</summary>
          <p class="muted">Upload the downloaded image files before publishing:</p>
          <div class="ed-step-actions"><a class="btn sm" href="https://github.com/${esc(repo)}/upload/${esc(branch)}/assets/img/team" target="_blank" rel="noopener">Upload team photos</a><a class="btn sm" href="https://github.com/${esc(repo)}/upload/${esc(branch)}/assets/img/sponsors" target="_blank" rel="noopener">Upload sponsor logos</a></div>
        </details>
        <div class="ed-dialog-foot"><button type="button" class="btn ghost sm" id="published-done">I've published — clear my draft</button></div>
      </form>`;
    dlg.showModal();
    $("#copy-json", dlg).addEventListener("click", async (e) => {
      try { await navigator.clipboard.writeText(json); e.currentTarget.innerHTML = `${icon("check")} Copied!`; }
      catch { download(json); }
    });
    $("#dl-json", dlg).addEventListener("click", () => download(json));
    $("#published-done", dlg).addEventListener("click", () => {
      if (!confirm("Only do this after GitHub shows your commit. Clear the local draft?")) return;
      published = clone(draft); store.del(DRAFT_KEY); dlg.close(); renderNav(); updateStatus(); window.SS?.toast("Draft cleared. Nice work!");
    });
  }
  function download(text) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = "content.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // Wait for site.js (icons, toast) when present, then start.
  if (window.SS) init(); else addEventListener("DOMContentLoaded", () => setTimeout(init, 0));
})();
