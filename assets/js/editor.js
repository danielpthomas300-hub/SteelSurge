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
    ["Site", ["overview", "controls", "sweep", "appearance", "home", "faq", "kvprompts"]],
    ["Team", ["team", "members", "values", "projects", "mentors"]],
    ["Season", ["calendar", "achievements", "outreach"]],
    ["Media", ["featuredVideos", "updates"]],
    ["Sponsors & contact", ["sponsors", "tiers", "contact"]],
    ["Settings", ["settings"]],
  ];
  const PAGE_FOR = { calendar: "team.html", kvprompts: "arcade/kilovolt.html", overview: "index.html", controls: "index.html", appearance: "index.html", home: "index.html", faq: "index.html", team: "index.html", members: "team.html", values: "team.html", projects: "team.html", mentors: "team.html", outreach: "index.html", achievements: "team.html", featuredVideos: "media.html", updates: "media.html", sponsors: "sponsors.html", tiers: "sponsors.html", contact: "contact.html" };
  const eye = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const lockIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const searchIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const redoIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>';
  const themeIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg>';
  const extIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
  const trashIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
  const undoIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';

  /* ---------------- Schema: what can be edited, in plain words ---------------- */
  const DEPTS = ["Mechanical", "Programming", "Outreach", "Leadership", "Other"];
  const SECTIONS = [
    { id: "overview", title: "Overview", icon: "chart", desc: "Everything at a glance: what's on the site, what needs attention, and quick ways to post something new.", get: () => null, set: () => {}, custom: true },
    { id: "controls", title: "Master controls", icon: "gear", desc: "Switches for the whole site: maintenance mode, a site-wide announcement, and which features are turned on. Like every change here, they go live when you publish.",
      get: (c) => ({ ...(window.SS?.CONTROL_DEFAULTS || {}), ...(c.controls || {}) }), set: (c, v) => { const was = !!c.controls?.maintenance; c.controls = v; if (was && !v.maintenance) suggestSweep(); },
      fields: [
        { k: "_mx", label: "Maintenance mode", type: "heading", hint: "Shows a 'we'll be right back' page on every page of the site. The Team editor keeps working, and on this device you can still view the site." },
        { k: "maintenance", label: "Turn on maintenance mode", type: "bool" },
        { k: "maintenanceTitle", label: "Headline", type: "text", hint: "e.g. We'll be right back" },
        { k: "maintenanceMessage", label: "Message", type: "textarea", max: 240 },
        { k: "maintenanceUntil", label: "Expected back (optional)", type: "text", hint: "e.g. Sunday evening. Leave empty to hide." },
        { k: "_banner", label: "Announcement banner", type: "heading", hint: "A strip across the top of every page. Visitors can hide it; it comes back for them when you change the text." },
        { k: "banner", label: "Show the announcement banner", type: "bool" },
        { k: "bannerText", label: "Announcement", type: "text", hint: "e.g. We're competing at the Chester County Qualifier this Saturday!" },
        { k: "bannerLink", label: "Link (optional)", type: "text", hint: "A full web address, or a page on this site like ftc.html. Adds a 'Learn more' link." },
        { k: "bannerTone", label: "Style", type: "select", options: [["info", "Info (steel blue)"], ["celebrate", "Celebrate (gold)"], ["warning", "Heads up (orange)"]] },
        { k: "bannerUntil", label: "Hide it after (optional)", type: "date", hint: "The banner stops showing after this day, so an event reminder never goes stale." },
        { k: "_features", label: "Features", type: "heading", hint: "Switch parts of the site off. Their links disappear, and their pages say they're taking a break." },
        { k: "arcade", label: "Arcade games", type: "bool" },
        { k: "calculator", label: "Match tools page (score calculator and scouting)", type: "bool" },
        { k: "codelab", label: "Code Lab (programming practice)", type: "bool" },
        { k: "scouting", label: "Scouting tool (on the Match tools page)", type: "bool" },
        { k: "weekly", label: "Weekly arcade challenge", type: "bool" },
        { k: "media", label: "Media page", type: "bool" },
        { k: "trophies", label: "Trophies and trophy case", type: "bool" },
        { k: "steelAI", label: "Steel AI assistant", type: "bool" },
        { k: "contactForm", label: "Contact form", type: "bool", hint: "When off, the Contact page shows the team email instead." },
        { k: "searchEngines", label: "Let search engines list the site", type: "bool", hint: "Turn off to ask Google and others not to show the site in search results." },
      ] },
    { id: "appearance", title: "Appearance", icon: "bolt", desc: "The site's accent color, the theme new visitors see first, and how much it moves. The editor shows your pick right away.",
      get: (c) => ({ ...(window.SS?.LOOK_DEFAULTS || {}), ...(c.appearance || {}) }), set: (c, v) => { c.appearance = v; window.SS?.applyLook?.(c, false); },
      fields: [
        { k: "_acc", label: "Accent color", type: "heading", hint: "Used for buttons, links, glows, and highlights on every page, in both dark and light mode." },
        { k: "accent", label: "Accent", type: "swatch" },
        { k: "_th", label: "Theme", type: "heading", hint: "Visitors can still switch with the moon button, and their choice is remembered." },
        { k: "defaultTheme", label: "Theme for first-time visitors", type: "segmented", options: [["dark", "Dark"], ["light", "Light"], ["system", "Match their device"]] },
        { k: "_mo", label: "Motion", type: "heading", hint: "Visitors who ask their device for less motion never get animations, whatever you choose here." },
        { k: "heroAnimation", label: "Animated circuit background on the home page", type: "bool" },
        { k: "animations", label: "Scroll-in and hover animations", type: "bool", hint: "Off makes everything appear instantly." },
      ] },
    { id: "home", title: "Home page", icon: "flag", desc: "Choose which sections the home page shows, rewrite the 'what we do' cards and build steps, and pick the featured arcade games.",
      get: (c) => {
        const S = window.SS || {}, h = c.home || {}, secs = { ...(S.HOME_DEFAULTS || {}), ...(h.sections || {}) };
        return {
          ...Object.fromEntries(Object.entries(secs).map(([k, v]) => ["s_" + k, v !== false])),
          crews: h.crews?.length ? h.crews : (S.HOME_CREWS || []).map(([ic, title, text, dept]) => ({ title, text, dept, icon: ic })),
          steps: h.steps?.length ? h.steps : (S.BUILD_STEPS || []).map(([, title, text]) => ({ title, text })),
          games: h.games || [],
        };
      },
      set: (c, v) => { c.home = { sections: Object.fromEntries(Object.keys(window.SS?.HOME_DEFAULTS || {}).map((k) => [k, v["s_" + k] !== false])), crews: v.crews, steps: v.steps, games: v.games }; },
      fields: [
        { k: "_secs", label: "Sections", type: "heading", hint: "Switch a section off to hide it from the home page. The hero at the top always shows." },
        { k: "s_season", label: "This season's game (banner under the top section)", type: "bool" },
        { k: "s_stats", label: "Live FTC stats and next event", type: "bool" },
        { k: "s_crews", label: "“What we do” cards", type: "bool" },
        { k: "s_build", label: "How a season works (build steps)", type: "bool" },
        { k: "s_videos", label: "Latest videos", type: "bool" },
        { k: "s_arcade", label: "Arcade games", type: "bool" },
        { k: "s_codelab", label: "Code Lab band", type: "bool" },
        { k: "s_sponsors", label: "Scrolling sponsor names", type: "bool" },
        { k: "s_cta", label: "“Power the surge” sponsor box", type: "bool" },
        { k: "_cards", label: "“What we do” cards", type: "heading", hint: "Each card links to that department on the Team page." },
        { k: "crews", label: "Cards", type: "list", itemLabel: "card", summary: (x) => x.title || "New card", fields: [
          { k: "title", label: "Title", type: "text", required: true }, { k: "icon", label: "Icon", type: "select", options: [["gear", "Gear"], ["code", "Code"], ["heart", "Heart"], ["star", "Star"], ["trophy", "Trophy"], ["users", "People"], ["bolt", "Bolt"], ["flag", "Flag"], ["pencil", "Pencil"]] },
          { k: "text", label: "Text", type: "textarea", max: 160 }, { k: "dept", label: "Links to", type: "select", options: [["Mechanical", "Mechanical crew"], ["Programming", "Programming crew"], ["Outreach", "Outreach crew"], ["Leadership", "Leadership"], ["", "The Team page"]] },
        ] },
        { k: "_steps", label: "How a season works", type: "heading", hint: "The numbered steps. Keep them short: one or two sentences each." },
        { k: "steps", label: "Steps", type: "list", itemLabel: "step", summary: (x) => x.title || "New step", fields: [{ k: "title", label: "Title", type: "text", required: true }, { k: "text", label: "Text", type: "textarea", max: 160 }] },
        { k: "_games", label: "Featured arcade games", type: "heading", hint: "Pick up to three, in order. Empty shows the first three." },
        { k: "games", label: "Games", type: "picks", max: 3, options: () => (window.SS?.GAMES || []).map((g) => [g.id, g.title]) },
      ] },
    { id: "kvprompts", title: "Kilovolt prompts", icon: "gamepad", desc: "Write your own trivia for the Kilovolt arcade game, like “Name a sponsor of Steel Surge.” They show up in Unlimited and Practice rounds under “Steel Surge trivia” (the Daily Charge stays the same for everyone).",
      get: (c) => c.kilovolt || [], set: (c, v) => (c.kilovolt = v), list: true, itemLabel: "prompt", summary: (p) => p.prompt || "New prompt", sub: (p) => `${(p.answers || []).filter(Boolean).length} answers`,
      fields: [
        { k: "prompt", label: "Prompt", type: "text", required: true, hint: "Start with “Name…”, e.g. Name a part on our 2025–26 robot." },
        { k: "answers", label: "Answers, most obvious first", type: "strings", itemLabel: "answer", hint: "Answers lower on the list are rarer, so they're worth more charge. Players' capitals, plurals, and small typos are accepted. Three or more works best." },
      ] },
    { id: "faq", title: "Steel AI answers", icon: "chart", desc: "Teach Steel AI, the site's helper, your own answers. When a visitor asks something close to one of these, your answer comes first.",
      get: (c) => c.faq || [], set: (c, v) => (c.faq = v), list: true, itemLabel: "answer", summary: (f) => f.q || "New answer", sub: (f) => f.keywords || "",
      fields: [
        { k: "q", label: "Question", type: "text", required: true, hint: "e.g. When are team meetings?" },
        { k: "a", label: "Answer", type: "textarea", max: 500, required: true },
        { k: "link", label: "Link (optional)", type: "text", hint: "A page to point to, like contact.html or team.html" },
        { k: "keywords", label: "Other words people might use (optional)", type: "text", hint: "e.g. practice schedule time when meet" },
      ] },
    { id: "team", title: "Team info", icon: "flag", desc: "Your name, intro, location, and links used across the whole site.",
      get: (c) => ({ ...c.team, _showRecords: !!c.showRecords }), set: (c, v) => { const { _showRecords, ...t } = v; c.team = t; c.showRecords = !!_showRecords; },
      fields: [
        { k: "name", label: "Team name", type: "text", required: true },
        { k: "number", label: "FTC team number", type: "number", required: true, hint: "Live stats and awards are pulled from FTCScout using this number." },
        { k: "motto", label: "Team motto", type: "text", hint: "e.g. Surge Ahead" },
        { k: "footerTagline", label: "Footer tagline", type: "text", hint: "The small line at the bottom of every page. Empty uses “Built by the students of Steel Surge ⚡”." },
        { k: "intro", label: "Intro paragraph", type: "textarea", max: 320, hint: "Shown on the home page under the big title." },
        { k: "location", label: "Location", type: "text" },
        { k: "school", label: "Schools", type: "text" },
        { k: "rookieYear", label: "Rookie year", type: "number" },
        { k: "email", label: "Team email", type: "email", required: true, hint: "Public. Contact-form messages are delivered here." },
        { k: "joinFormUrl", label: "Join-the-team form link", type: "url" },
        { k: "instagram", label: "Instagram handle", type: "text", hint: "e.g. @steelsurge27254. Leave empty to hide. When set, Instagram appears on the Media and Contact pages and in the footer." },
        { k: "youtubeChannelId", label: "YouTube channel ID", type: "text", hint: "Starts with UC… — find it in your channel's URL. Videos update automatically." },
        { k: "socials", label: "Social links", type: "list", itemLabel: "link", summary: (i) => i.label || "New link", fields: [{ k: "label", label: "Label", type: "text" }, { k: "url", label: "Link", type: "url" }] },
        { k: "_showRecords", label: "Show win-loss records from FTCScout", type: "bool", hint: "Adds each event's rank and W-L-T. Off shows matches played instead." },
      ] },
    { id: "members", title: "Team members", icon: "users", desc: "Everyone on the team page. Use the arrows to change the order. No personal phone numbers or emails, please.",
      get: (c) => c.members, set: (c, v) => (c.members = v), list: true, itemLabel: "member", summary: (m) => m.name || "New member", sub: (m) => (m.alumni ? `Alumni${m.gradYear ? " · Class of " + m.gradYear : ""}` : m.role),
      fields: [
        { k: "name", label: "Full name", type: "text", required: true },
        { k: "role", label: "Role", type: "text", hint: "e.g. Programming Lead" },
        { k: "dept", label: "Department", type: "select", options: DEPTS, hint: "Used for the filter buttons on the team page." },
        { k: "photo", label: "Photo", type: "image", folder: "assets/img/team" },
        { k: "bio", label: "Short bio", type: "textarea", max: 400, hint: "2–3 sentences. Avoid grade levels so it doesn't go out of date." },
        { k: "funFact", label: "Fun fact (optional)", type: "text", hint: "Shown under the bio. e.g. 'Undefeated ping pong champion of the build room.'" },
        { k: "alumni", label: "Alumni (graduated or moved on)", type: "bool", hint: "Moves them to a small Alumni list at the bottom of the Team page instead of the main grid." },
        { k: "gradYear", label: "Class of (optional)", type: "number", hint: "e.g. 2027. Shown next to alumni names." },
      ] },
    { id: "values", title: "Team values", icon: "heart", desc: "The 'What Steel Surge stands for' cards on the team page.",
      get: (c) => c.values || [], set: (c, v) => (c.values = v), list: true, itemLabel: "value", summary: (v) => v.title || "New value",
      fields: [{ k: "title", label: "Title", type: "text", required: true }, { k: "body", label: "Description", type: "textarea", max: 220 }] },
    { id: "projects", title: "Team projects", icon: "gear", desc: "The 'Made by Steel Surge' gallery on the team page: things you've designed and built besides the robot.",
      get: (c) => c.projects || [], set: (c, v) => (c.projects = v), list: true, itemLabel: "project", summary: (p) => p.title || "New project",
      fields: [{ k: "title", label: "Title", type: "text", required: true }, { k: "body", label: "Description", type: "textarea", max: 260 }, { k: "image", label: "Image", type: "image", folder: "assets/img/projects", square: false }] },
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
    { id: "calendar", title: "Season calendar", icon: "flag", desc: "Events on the Team page's calendar. Competitions are added automatically from FTCScout once you register, so list everything else here: demos, kickoff, open houses, fundraisers. Past events drop off by themselves.",
      get: (c) => c.calendar || [], set: (c, v) => (c.calendar = v), list: true, itemLabel: "event", summary: (e) => e.title || "New event", sub: (e) => [e.date, e.time].filter(Boolean).join(" · "),
      fields: [
        { k: "title", label: "Event", type: "text", required: true, hint: "e.g. Robot demo at Kennett Library" },
        { k: "date", label: "Date", type: "date", required: true },
        { k: "end", label: "Last day (optional)", type: "date", hint: "Only for events longer than one day." },
        { k: "time", label: "Starts at (optional)", type: "time" },
        { k: "endTime", label: "Ends at (optional)", type: "time" },
        { k: "kind", label: "Type", type: "select", options: [["Team event", "Team event"], ["Outreach", "Outreach"], ["Demo", "Robot demo"], ["Meeting", "Open meeting"], ["Fundraiser", "Fundraiser"], ["Kickoff", "Kickoff"], ["Competition", "Competition (not on FTCScout)"]] },
        { k: "place", label: "Where (optional)", type: "text", hint: "A public place, like a library or school. Never a home address." },
        { k: "link", label: "Link (optional)", type: "url" },
        { k: "detail", label: "Details (optional)", type: "textarea", max: 280 },
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
      fields: [{ k: "date", label: "Date", type: "date", hint: "Optional. Dated posts are shown newest first." }, { k: "title", label: "Title", type: "text", required: true }, { k: "body", label: "Text", type: "textarea", max: 700 }] },
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
        { k: "sponsorPitch", label: "Sponsor pitch", type: "textarea", max: 600 },
        { k: "sponsorPacketUrl", label: "Sponsor packet link (optional)", type: "url", hint: "A Google Drive or PDF link. Adds a 'Download our sponsor packet' button." },
        { k: "sponsorTiers", label: "Tiers", type: "list", itemLabel: "tier", summary: (t) => `${t.name || "New tier"}${t.amount ? " · $" + Number(t.amount).toLocaleString() : ""}`, fields: [
          { k: "name", label: "Tier name", type: "text", required: true }, { k: "amount", label: "Amount ($ per season)", type: "number" },
          { k: "featured", label: "Highlight as top tier", type: "bool" }, { k: "perks", label: "Perks", type: "strings", itemLabel: "perk" },
        ] },
      ] },
    { id: "contact", title: "Contact form", icon: "mail", desc: "Topics people can pick on the contact page, and what it promises about replies.",
      get: (c) => c.contact, set: (c, v) => (c.contact = v),
      fields: [
        { k: "reasons", label: "Topics", type: "strings", itemLabel: "topic" },
        { k: "replyNote", label: "How fast you reply", type: "text", hint: "Shown on the form and after sending. Empty uses “We usually reply within a few days.”" },
        { k: "formEndpoint", label: "Form delivery address", type: "url", hint: "Advanced. FormSubmit endpoint that emails messages to the team. Leave as is unless the team email changes." },
      ] },
    { id: "sweep", title: "Site sweep", icon: "check", desc: "Check the whole live site in about 20 seconds: every page and internal link, the published content, the automatic data refreshes, and the site switches. Run it after publishing, and before turning maintenance mode off.",
      get: () => null, set: () => {}, custom: true },
    { id: "settings", title: "Editor settings", icon: "gear", desc: "Change the editor passcode, and back up or restore your draft.",
      get: (c) => c.dev, set: (c, v) => (c.dev = v), custom: true },
  ];

  function settingsPanel(host) {
    host.innerHTML = `
      <div class="ed-fields">
        <div class="field"><label for="np1">New passcode</label><input class="input" id="np1" type="password" autocomplete="new-password" minlength="6"></div>
        <div class="field"><label for="np2">Type it again</label><input class="input" id="np2" type="password" autocomplete="new-password"></div>
        <p class="field-error" id="np-err" aria-live="polite"></p>
        <div><button class="btn primary sm" type="button" id="np-save">Set new passcode</button></div>
        <p class="hint">Only a scrambled fingerprint of the passcode is stored in the site files — never the passcode itself. Share it only with team members who update the site. The new passcode works once you publish.</p>
      </div>
      <div class="ed-group-head ed-settings-gap"><h3>Back up and restore</h3><p class="hint">Drafts are saved in this browser only. Download a backup to move a draft to another computer, or to keep a copy before big changes.</p></div>
      <div class="ed-backup">
        <button class="btn sm" type="button" id="bk-save">${icon("copy")} Download a backup of my draft</button>
        <label class="btn sm ghost">${undoIco} Restore from a backup<input type="file" accept="application/json,.json" id="bk-load" hidden></label>
      </div>
      <p class="field-error" id="bk-err" aria-live="polite"></p>`;
    $("#bk-save", host).addEventListener("click", () => {
      const day = new Date().toISOString().slice(0, 10);
      download(JSON.stringify(draft, null, 2) + "\n", `steel-surge-draft-${day}.json`);
      window.SS?.toast("Backup downloaded");
    });
    $("#bk-load", host).addEventListener("change", async (e) => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      const err = $("#bk-err", host);
      try {
        const data = JSON.parse(await f.text());
        if (!data || typeof data !== "object" || !data.team || !Array.isArray(data.members)) throw new Error("That file isn't a Steel Surge content backup.");
        if (!confirm("Replace your current draft with this backup? (You can undo this with Ctrl+Z.)")) return;
        draft = data; changed(); record(true); renderNav(); renderPanel(); err.textContent = ""; window.SS?.toast("Backup restored into your draft");
      } catch (x) { err.textContent = x.message || "Couldn't read that file."; }
    });
    $("#np-save", host).addEventListener("click", async () => {
      const a = $("#np1", host).value.trim(), b = $("#np2", host).value.trim(), err = $("#np-err", host);
      if (a.length < 6) { err.textContent = "Use at least 6 characters."; return; }
      if (a !== b) { err.textContent = "Those don't match."; return; }
      draft.dev = { ...draft.dev, passcodeHash: await sha256(a) }; err.textContent = "";
      $("#np1", host).value = $("#np2", host).value = ""; changed(); window.SS?.toast("Passcode updated in your draft — publish to make it live");
    });
  }

  /* ---------------- Site sweep (sweep.js does the checking) ---------------- */
  const SWEEP_KEY = "ss-sweep-last";
  let sweepAsked = false;
  /** Turning maintenance mode off is the moment to check everything before visitors come back. */
  function suggestSweep() {
    if (sweepAsked) return; sweepAsked = true;
    setTimeout(() => {
      if (!confirm("Maintenance mode is off in your draft. Run a site sweep now to check the live site before visitors come back?")) return;
      const sec = SECTIONS.find((x) => x.id === "sweep"); sec.__autorun = true; jumpTo({ sec: "sweep" });
    }, 350);
  }
  function sweepPanel(host, autorun) {
    const GROUP_ORDER = ["Pages and links", "Content", "Site switches", "Automatic data"], RANK = { bad: 0, warn: 1, info: 2, ok: 3 };
    const ICONS = { bad: "✕", warn: "!", info: "i", ok: "✓" };
    const dirty = dirtySections().filter((s) => !s.custom).length;
    host.innerHTML = `<div class="ed-sweep">
      <div class="ed-card ed-sweep-head">
        <div><p>Checks what visitors see right now on the <b>live site</b>. Outside websites (like tutorial links) can't be tested from a browser; the weekly GitHub link check covers those.</p>
          ${dirty ? `<p class="hint">You have ${dirty} unpublished change${dirty === 1 ? "" : "s"}. The sweep checks the published site, not your draft.</p>` : ""}</div>
        <button type="button" class="btn primary" id="sweep-run">${icon("check")} Run sweep</button>
      </div>
      <div class="ed-card ed-sweep-prog" id="sweep-prog" hidden><div class="ed-sweep-bar"><i></i></div><span aria-live="polite"></span></div>
      <div id="sweep-out"></div></div>`;
    const out = $("#sweep-out", host), btn = $("#sweep-run", host), prog = $("#sweep-prog", host);
    const draw = (res) => {
      const when = new Date(res.at), mins = Math.round((Date.now() - res.at) / 60000);
      const ago = mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : when.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const { bad, warn } = res.counts, mood = bad ? `${bad} problem${bad === 1 ? "" : "s"} to fix` : warn ? `No problems, ${warn} thing${warn === 1 ? "" : "s"} to check` : "Everything checks out";
      const groups = GROUP_ORDER.map((g) => [g, res.results.filter((r) => r.group === g).sort((a, b) => RANK[a.level] - RANK[b.level])]).filter(([, l]) => l.length);
      const fixBtn = (f) => !f ? "" : f.href ? `<a class="btn ghost sm" href="${esc(f.href)}" target="_blank" rel="noopener">${esc(f.label || "Open")} ${extIco}</a>` : `<button type="button" class="btn ghost sm" data-fix-sec="${esc(f.sec)}"${f.field ? ` data-fix-field="${esc(f.field)}"` : ""}>Fix</button>`;
      out.innerHTML = `
        <div class="ed-card ed-sweep-sum ${bad ? "is-bad" : warn ? "is-warn" : "is-ok"}">
          <div class="ed-sweep-mood"><i aria-hidden="true">${bad ? "✕" : warn ? "!" : "✓"}</i><div><h2>${mood}</h2><p class="muted">Ran ${ago} · ${res.pages} pages and ${res.files} files checked</p></div></div>
          <div class="ed-sweep-counts">${[["bad", "Problems"], ["warn", "To check"], ["ok", "Passed"], ["info", "Notes"]].map(([k, l]) => `<span class="${k}"><b>${res.counts[k]}</b>${l}</span>`).join("")}</div>
        </div>
        ${groups.map(([g, list]) => `<section class="ed-card ed-sweep-group"><h3>${esc(g)}</h3><ul>${list.map((r) => `<li class="${r.level}"><i aria-hidden="true">${ICONS[r.level]}</i><p>${esc(r.text)}</p>${fixBtn(r.fix)}</li>`).join("")}</ul></section>`).join("")}`;
      $$("[data-fix-sec]", out).forEach((b) => b.addEventListener("click", () => jumpTo({ sec: b.dataset.fixSec, field: b.dataset.fixField })));
    };
    const go = async () => {
      if (!window.SiteSweep) { out.innerHTML = `<div class="ed-card"><p>The sweep couldn't start. Reload the editor and try again.</p></div>`; return; }
      btn.disabled = true; prog.hidden = false; out.innerHTML = "";
      try {
        const res = await window.SiteSweep.run({ repo: draft.dev?.repo || "danielpthomas300-hub/SteelSurge", onProgress: (t, p) => { $("span", prog).textContent = t; $("i", prog).style.width = `${Math.round(p * 100)}%`; } });
        store.set(SWEEP_KEY, res); draw(res);
        window.SS?.toast(res.counts.bad ? `Sweep found ${res.counts.bad} problem${res.counts.bad === 1 ? "" : "s"}` : "Sweep finished: no problems");
      } catch (e) { out.innerHTML = `<div class="ed-card"><p>The sweep stopped: ${esc(e.message || "something went wrong")}. Check your connection and try again.</p></div>`; }
      btn.disabled = false; prog.hidden = true;
    };
    btn.addEventListener("click", go);
    const lastRun = store.get(SWEEP_KEY);
    if (autorun) go(); else if (lastRun) draw(lastRun);
    else out.innerHTML = `<div class="ed-card ed-sweep-empty"><p class="muted">No sweep has been run on this device yet. Press <b>Run sweep</b> to check the site.</p></div>`;
  }

  /* ---------------- Overview dashboard ---------------- */
  const today = () => new Date().toISOString().slice(0, 10);
  const seasonStart = () => { const n = new Date(), y = n.getMonth() >= 8 ? n.getFullYear() : n.getFullYear() - 1; return { y, start: `${y}-09-01`, label: `${y}–${String(y + 1).slice(2)}` }; };
  const daysAgo = (d) => Math.floor((Date.now() - new Date(d)) / 864e5);
  const fmtDay = (d) => new Date(d + (d.length === 7 ? "-01" : "") + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: d.length === 7 ? undefined : "numeric", year: "numeric" });
  /** Things worth fixing, newest problems first: [level, text, section] */
  function attention(c) {
    const out = [], ctl = { ...(window.SS?.CONTROL_DEFAULTS || {}), ...(c.controls || {}) }, se = seasonStart();
    if (ctl.maintenance) out.push(["warn", "Maintenance mode is on. Visitors only see the “We'll be right back” page.", "controls"]);
    if (ctl.searchEngines === false) out.push(["warn", "Search engines are switched off, so Google won't list the site.", "controls"]);
    if (ctl.banner && ctl.bannerUntil && ctl.bannerUntil < today()) out.push(["info", "The announcement banner's end date has passed, so it's hidden. Turn it off or pick a new date.", "controls"]);
    if (ctl.banner && !String(ctl.bannerText || "").trim()) out.push(["warn", "The announcement banner is on but has no text.", "controls"]);
    const evs = (c.outreach?.events || []).filter((e) => String(e.date || "") >= se.start);
    if (!evs.length) out.push(["warn", `No outreach logged for ${se.label} yet. The home page shows “${c.outreach?.hours || "nothing"}” until you do.`, "outreach"]);
    const last = (c.updates || []).map((u) => u.date).filter(Boolean).sort().pop();
    if (!last) out.push(["info", "No dated team updates yet. Dates show visitors the build log is current.", "updates"]);
    else if (daysAgo(last) > 45) out.push(["warn", `The last team update was ${daysAgo(last)} days ago. Post a quick build-log update.`, "updates"]);
    const active = (c.members || []).filter((m) => !m.alumni);
    const noPhoto = active.filter((m) => !m.photo).map((m) => m.name || "a member"), noBio = active.filter((m) => !String(m.bio || "").trim()).map((m) => m.name || "a member");
    if (noPhoto.length) out.push(["info", `No photo yet for ${noPhoto.slice(0, 3).join(", ")}${noPhoto.length > 3 ? ` and ${noPhoto.length - 3} more` : ""}.`, "members"]);
    if (noBio.length) out.push(["info", `No bio yet for ${noBio.slice(0, 3).join(", ")}${noBio.length > 3 ? ` and ${noBio.length - 3} more` : ""}.`, "members"]);
    const sp = c.sponsors || [];
    if (!sp.length) out.push(["info", "No sponsors are listed yet. The sponsor wall shows a “become our first sponsor” message.", "sponsors"]);
    else { const noLogo = sp.filter((x) => !x.logo).length; if (noLogo) out.push(["info", `${noLogo} sponsor${noLogo === 1 ? " has" : "s have"} no logo (their name is shown instead).`, "sponsors"]); }
    if (!c.team?.instagram) out.push(["info", "No Instagram handle set. Social links appear across the site once it's added.", "team"]);
    const sw = store.get(SWEEP_KEY), swDays = sw ? Math.floor((Date.now() - sw.at) / 864e5) : null;
    if (!sw) out.push(["info", "No site sweep has been run on this device yet. It checks every page, link, and data refresh in about 20 seconds.", "sweep"]);
    else if (sw.counts?.bad) out.push(["warn", `The last site sweep (${swDays ? `${swDays} day${swDays === 1 ? "" : "s"} ago` : "today"}) found ${sw.counts.bad} problem${sw.counts.bad === 1 ? "" : "s"}.`, "sweep"]);
    else if (swDays > 14) out.push(["info", `The last site sweep was ${swDays} days ago.`, "sweep"]);
    return out;
  }
  const QUICK = [
    ["calendar", null, "Add a calendar event", "flag", () => ({ title: "", date: today(), end: "", time: "", endTime: "", kind: "Team event", place: "", link: "", detail: "" }), "start"],
    ["outreach", "events", "Log an outreach event", "users", () => ({ date: today(), title: "", place: "", hours: "", people: "", detail: "" }), "start"],
    ["updates", null, "Post a team update", "pencil", () => ({ date: today(), title: "", body: "" }), "start"],
    ["achievements", null, "Add a milestone or award", "trophy", () => ({ date: today().slice(0, 7), title: "", detail: "", icon: "milestone" }), "start"],
    ["members", null, "Add a team member", "users", () => ({ name: "", role: "", dept: DEPTS[0], photo: "", bio: "", funFact: "" }), "end"],
    ["sponsors", null, "Add a sponsor", "heart", () => ({ name: "", tier: "", url: "", logo: "" }), "end"],
    ["controls", null, "Post an announcement", "flag", null, "field:banner"],
    ["sweep", null, "Run a site sweep", "check", null, "run"],
  ];
  function quickAdd([secId, nested, , , blank, where]) {
    const sec = SECTIONS.find((x) => x.id === secId);
    if (secId === "sweep") { sec.__autorun = true; jumpTo({ sec: "sweep" }); return; }
    if (!blank) { jumpTo({ sec: secId, field: where.split(":")[1] }); return; }
    if (nested) {
      const obj = { ...(sec.get(draft) || {}) }, list = [...(obj[nested] || [])];
      where === "start" ? list.unshift(blank()) : list.push(blank()); obj[nested] = list; sec.set(draft, obj);
      sec.fields.find((f) => f.k === nested).__openIndex = where === "start" ? 0 : list.length - 1;
    } else {
      const list = [...(sec.get(draft) || [])]; where === "start" ? list.unshift(blank()) : list.push(blank()); sec.set(draft, list);
      sec.__openIndex = where === "start" ? 0 : list.length - 1;
    }
    changed(); record(true);
    current = secId; history.replaceState(null, "", "#" + current); renderNav(); renderPanel(); scrollTo(0, 0);
    setTimeout(() => { const el = $("#panel .ed-item.open"); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("ed-flash"); setTimeout(() => el.classList.remove("ed-flash"), 1600); $("input:not([type=date]):not([type=month]), textarea", el)?.focus({ preventScroll: true }); } }, 60);
  }
  function overviewPanel(host) {
    const c = draft, se = seasonStart();
    const evs = (c.outreach?.events || []).filter((e) => String(e.date || "") >= se.start), hrs = Math.round(evs.reduce((t, e) => t + (Number(e.hours) || 0), 0) * 10) / 10;
    const active = (c.members || []).filter((m) => !m.alumni), alumni = (c.members || []).length - active.length;
    const last = (c.updates || []).map((u) => u.date).filter(Boolean).sort().pop();
    const issues = attention(c), dirty = dirtySections().filter((x) => x.id !== "overview");
    const tile = (n, label, sub, sec) => `<button type="button" class="ed-stat" data-go="${sec}"><b>${n}</b><span>${label}</span><small>${sub}</small></button>`;
    const ctl = { ...(window.SS?.CONTROL_DEFAULTS || {}), ...(c.controls || {}) };
    const health = Math.max(0, Math.min(100, 100 - issues.reduce((t, [lv]) => t + (lv === "warn" ? 12 : 4), 0)));
    const mood = ctl.maintenance ? ["Maintenance mode is on", "Visitors see the “We'll be right back” page until you switch it off and publish."]
      : health >= 90 ? ["All systems go", "Nothing needs fixing. A fresh update or outreach entry keeps it that way."]
      : health >= 65 ? ["Running smoothly", `${issues.length} small thing${issues.length === 1 ? "" : "s"} could be better. They're listed below.`]
      : ["Needs some attention", "A few things are out of date. Start with the orange items below."];
    const SYS = [["maintenance", "Maintenance"], ["banner", "Banner"], ["arcade", "Arcade"], ["calculator", "Match tools"], ["scouting", "Scouting"], ["codelab", "Code Lab"], ["weekly", "Weekly challenge"], ["media", "Media"], ["trophies", "Trophies"], ["steelAI", "Steel AI"], ["contactForm", "Contact form"]];
    host.innerHTML = `
      <div class="ed-ov">
        <section class="ed-hud${ctl.maintenance ? " is-alert" : ""}">
          <div class="ed-gauge" role="img" aria-label="Site health ${health} out of 100"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="50"/><circle class="val" cx="60" cy="60" r="50" pathLength="100" style="stroke-dasharray:${health} 100"/></svg><div><b>${health}</b><span>Health</span></div></div>
          <div class="ed-hud-text"><span class="ed-kicker">// System status</span><h2>${mood[0]}</h2><p class="muted">${mood[1]}</p></div>
          <div class="ed-systems"><span class="ed-kicker">// Systems <small>switch here, live when you publish</small></span>
            <div class="ed-sys-grid">${SYS.map(([k, lab]) => `<label class="ed-sys${k === "maintenance" ? " danger" : ""}"><input type="checkbox" data-sys="${k}"${ctl[k] ? " checked" : ""}><i></i><span>${lab}</span></label>`).join("")}</div>
          </div>
        </section>
        <div class="ed-stats">
          ${tile(active.length, "Team members", alumni ? `+ ${alumni} alumni` : "on the Team page", "members")}
          ${tile(hrs || 0, "Outreach hours", `${evs.length} event${evs.length === 1 ? "" : "s"} in ${se.label}`, "outreach")}
          ${tile((c.sponsors || []).length, "Sponsors", `${(c.sponsorTiers || []).length} tiers`, "sponsors")}
          ${tile(last ? fmtDay(last) : "—", "Latest update", last ? `${daysAgo(last)} days ago` : "none dated yet", "updates")}
        </div>
        <div class="ed-ov-grid">
          <section class="ed-ov-card"><h2>Quick actions</h2><div class="ed-quick">${QUICK.map((q, i) => `<button type="button" class="ed-quick-btn" data-q="${i}"><i>${icon(q[3])}</i><span>${q[2]}</span></button>`).join("")}</div></section>
          <section class="ed-ov-card"><h2>Needs attention ${issues.length ? `<span class="ed-pill">${issues.length}</span>` : ""}</h2>
            ${issues.length ? `<ul class="ed-issues">${issues.map(([lv, t, sec]) => `<li class="${lv}"><span class="ed-issue-dot"></span><p>${esc(t)}</p><button type="button" class="btn ghost sm" data-go="${sec}">Fix</button></li>`).join("")}</ul>`
              : `<p class="ed-allgood">${icon("check")} Everything looks good.</p>`}</section>
          <section class="ed-ov-card"><h2>Your draft</h2>
            ${dirty.length ? `<p class="muted">Changed on this device and not live yet:</p><ul class="ed-dirty-list">${dirty.map((d) => `<li><button type="button" data-go="${d.id}">${icon(d.icon)} ${esc(d.title)}</button></li>`).join("")}</ul>
              <div class="ed-ov-actions"><button type="button" class="btn primary sm" id="ov-publish">Review and publish</button><a class="btn sm" href="index.html?preview=1" target="_blank" rel="noopener">${extIco} Preview</a></div>`
              : `<p class="muted">No unpublished changes. Everything here matches the live site.</p>`}</section>
          <section class="ed-ov-card ed-ov-tips"><h2>Tips</h2><ul>
            <li><kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">K</kbd> searches every section, field, member, and sponsor.</li>
            <li><b>Live preview</b> shows the real page next to the form as you type.</li>
            <li><kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">Z</kbd> undoes any change, even a deleted item.</li>
            <li>Back up your draft under <button type="button" class="ed-link" data-go="settings">Editor settings</button> before big changes.</li></ul></section>
        </div>
      </div>`;
    $$("[data-go]", host).forEach((b) => b.addEventListener("click", () => jumpTo({ sec: b.dataset.go })));
    $$("[data-q]", host).forEach((b) => b.addEventListener("click", () => quickAdd(QUICK[+b.dataset.q])));
    $$("[data-sys]", host).forEach((b) => b.addEventListener("change", () => {
      const k = b.dataset.sys;
      if (k === "maintenance" && b.checked && !confirm("Turn on maintenance mode? After you publish, visitors only see a “We'll be right back” page.")) { b.checked = false; return; }
      if (k === "banner" && b.checked && !String(ctl.bannerText || "").trim()) { b.checked = false; jumpTo({ sec: "controls", field: "bannerText" }); window.SS?.toast("Write the announcement first, then switch the banner on"); return; }
      draft.controls = { ...ctl, [k]: b.checked }; changed(); save(); renderPanel();
      if (k === "maintenance" && !b.checked && ctl.maintenance) suggestSweep();
    }));
    $("#ov-publish", host)?.addEventListener("click", openPublish);
  }

  /* ---------------- Reviewing changes before publishing ---------------- */
  const short = (v, f = {}) => {
    if (f.type === "bool" || typeof v === "boolean") return v ? "on" : "off";
    if (v === "" || v == null) return "(empty)";
    if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? "" : "s"}`;
    const t = String(v); return `“${t.length > 60 ? t.slice(0, 58) + "…" : t}”`;
  };
  function fieldDiff(fields, a = {}, b = {}) {
    const out = [];
    for (const f of fields || []) {
      if (f.type === "heading") continue;
      const x = a?.[f.k], y = b?.[f.k]; if (JSON.stringify(x ?? "") === JSON.stringify(y ?? "")) continue;
      if (f.type === "list" && f.summary) {
        const xs = (x || []).map((i) => f.summary(i)), ys = (y || []).map((i) => f.summary(i));
        ys.filter((n) => !xs.includes(n)).forEach((n) => out.push(["add", `${f.label}: added “${n}”`]));
        xs.filter((n) => !ys.includes(n)).forEach((n) => out.push(["del", `${f.label}: removed “${n}”`]));
        if (out.length === 0) out.push(["chg", `${f.label}: edited`]);
      } else out.push(["chg", `${f.label.replace(/ \(optional\)$/, "")}: ${short(x, f)} → ${short(y, f)}`]);
    }
    return out;
  }
  function diffSection(sec) {
    if (sec.custom) return sec.id === "settings" ? [["chg", "Passcode changed"]] : [];
    const a = sec.get(published), b = sec.get(draft);
    if (!sec.list) return fieldDiff(sec.fields, a, b);
    const out = [], name = (x) => sec.summary(x || {}), A = a || [], B = b || [], an = A.map(name), bn = B.map(name);
    B.forEach((it) => { const j = an.indexOf(name(it)); if (j < 0) out.push(["add", `Added ${sec.itemLabel} “${name(it)}”`]); else fieldDiff(sec.fields, A[j], it).forEach(([k, t]) => out.push([k, `${name(it)} › ${t}`])); });
    A.forEach((it) => { if (!bn.includes(name(it))) out.push(["del", `Removed ${sec.itemLabel} “${name(it)}”`]); });
    if (!out.length) out.push(["chg", "Changed the order"]);
    return out;
  }
  /** Problems worth fixing before publishing. Image files are checked on the live site. */
  async function validate() {
    const out = [], images = [];
    const urlOk = (u) => !u || /^https?:\/\/[^\s]+\.[^\s]+/.test(u) || /^(?!https?:)[\w./#?=-]+$/.test(u);
    const check = (fields, obj, where) => {
      for (const f of fields || []) {
        const v = obj?.[f.k];
        if (f.required && (v === "" || v == null)) out.push(`${where}: “${f.label}” is empty.`);
        if (f.type === "url" && v && !urlOk(v)) out.push(`${where}: “${f.label}” doesn't look like a web address (${String(v).slice(0, 40)}).`);
        if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) out.push(`${where}: “${f.label}” doesn't look like an email address.`);
        if (f.type === "image" && v) images.push([v, where]);
        if (f.type === "list" && Array.isArray(v)) v.forEach((it, i) => check(f.fields, it, `${where} › ${f.summary ? f.summary(it) : `${f.itemLabel} ${i + 1}`}`));
      }
    };
    for (const sec of SECTIONS) {
      if (sec.custom) continue;
      const v = sec.get(draft);
      if (sec.list) (v || []).forEach((it, i) => check(sec.fields, it, `${sec.title} › ${sec.summary(it) || `#${i + 1}`}`));
      else check(sec.fields, v, sec.title);
    }
    const seen = new Set(); for (const m of draft.members || []) { const n = (m.name || "").trim().toLowerCase(); if (n && seen.has(n)) out.push(`Team members: “${m.name}” is listed twice.`); seen.add(n); }
    await Promise.all(images.map(async ([path, where]) => {
      if (/^https?:/.test(path)) return;
      try { const r = await fetch(path, { method: "HEAD", cache: "no-cache" }); if (!r.ok) out.push(`${where}: the image ${path} isn't uploaded yet. Upload it to GitHub before or right after publishing.`); } catch {}
    }));
    return out;
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
    draft = d?.content ? d.content : clone(published); window.SS?.applyLook?.(draft, false);
    savedAt = d?.savedAt || null;
    for (const k of ["mentors", "achievements", "updates", "sponsors", "sponsorTiers", "members", "values", "featuredVideos", "projects"]) if (!Array.isArray(draft[k])) draft[k] = [];
    current = (location.hash.slice(1) && SECTIONS.some((s) => s.id === location.hash.slice(1))) ? location.hash.slice(1) : "overview";
    hist.past = []; hist.future = []; hist.last = JSON.stringify(draft);
    $("#app").innerHTML = `
      <div class="ed">
        <header class="ed-bar">
          <a class="brand" href="index.html" title="Back to the website">${window.SS?.LOGO || ""}<span>Steel Surge<small>TEAM EDITOR</small></span></a>
          <div class="ed-status" id="status" aria-live="polite"></div>
          <div class="ed-tools" role="group" aria-label="Editor tools">
            <button class="icon-btn" id="search-btn" type="button" title="Search (Ctrl+K)" aria-label="Search the editor">${searchIco}</button>
            <button class="icon-btn" id="undo" type="button" title="Undo (Ctrl+Z)" aria-label="Undo" disabled>${undoIco}</button>
            <button class="icon-btn" id="redo" type="button" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled>${redoIco}</button>
            <button class="icon-btn" id="theme-btn" type="button" title="Light or dark" aria-label="Switch light or dark mode">${themeIco}</button>
            <button class="icon-btn" id="help-btn" type="button" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">?</button>
          </div>
          <div class="ed-actions">
            <button class="btn ghost sm" id="discard" type="button" title="Throw away all unpublished changes">${trashIco} Discard</button>
            <button class="btn sm" id="live" type="button" aria-pressed="false" title="Show the page next to the form and refresh it as you type">${eye} Live preview</button>
            <a class="btn sm" id="preview" href="index.html?preview=1" target="_blank" rel="noopener" title="Open the whole site with your draft in a new tab">${extIco} Preview</a>
            <button class="btn primary sm" id="publish" type="button">Publish<span class="ed-count" id="pub-count"></span></button>
          </div>
        </header>
        <div class="ed-body">
          <aside class="ed-side">
            <nav class="ed-nav" id="nav" aria-label="Sections"></nav>
            <div class="ed-side-foot"><button type="button" class="btn ghost sm" id="lock">${lockIco} Lock editor</button></div>
          </aside>
          <main class="ed-main" id="panel"></main>
          <aside class="ed-live" id="live-pane" hidden>
            <div class="ed-live-bar"><b id="live-title">Preview</b><span class="ed-live-note">Updates as you type</span>
              <button class="btn ghost sm" type="button" id="live-phone" aria-pressed="false">Phone size</button></div>
            <div class="ed-live-frame"><iframe id="live-frame" title="Live preview of the site with your draft"></iframe></div>
          </aside>
        </div>
      </div>
      <dialog class="ed-dialog" id="publish-dialog"></dialog>
      <dialog class="ed-dialog ed-search" id="search-dialog"></dialog>
      <dialog class="ed-dialog" id="help-dialog"></dialog>`;
    $("#discard").addEventListener("click", discard);
    $("#lock").addEventListener("click", () => { save(true); try { sessionStorage.removeItem(UNLOCK_KEY); } catch {} lockScreen(); window.SS?.toast("Editor locked. Your draft is saved on this device."); });
    $("#publish").addEventListener("click", openPublish);
    $("#preview").addEventListener("click", () => save(true));
    $("#undo").addEventListener("click", undo); $("#redo").addEventListener("click", redo);
    $("#search-btn").addEventListener("click", openSearch);
    $("#help-btn").addEventListener("click", openHelp);
    $("#theme-btn").addEventListener("click", () => { const t = window.SS?.theme; if (t) t.set(t.get() === "light" ? "dark" : "light"); });
    $("#live").addEventListener("click", () => setLive(!liveOn));
    $("#live-phone").addEventListener("click", (e) => { const on = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", String(on)); $("#live-pane").classList.toggle("phone", on); });
    if (!keysWired) { keysWired = true; addEventListener("keydown", onKey); }
    renderNav(); renderPanel(); updateStatus(); updateUndo();
    if (store.get("ss-editor-live") && innerWidth >= 1280) setLive(true);
  }

  /* ---------------- Undo / redo (whole draft) ---------------- */
  const hist = { past: [], future: [], last: null, timer: 0 };
  /** Saves a history step. Typing is grouped: a step is recorded after a short pause. */
  function record(now = false) {
    clearTimeout(hist.timer);
    const commit = () => {
      const cur = JSON.stringify(draft);
      if (hist.last !== null && cur !== hist.last) { hist.past.push(hist.last); if (hist.past.length > 100) hist.past.shift(); hist.future = []; }
      hist.last = cur; updateUndo();
    };
    if (now) commit(); else hist.timer = setTimeout(commit, 600);
  }
  function restore(json, msg) { draft = JSON.parse(json); hist.last = json; window.SS?.applyLook?.(draft, false); save(); renderNav(); renderPanel(); updateUndo(); reloadLive(); window.SS?.toast(msg); }
  function undo() { record(true); if (!hist.past.length) return; hist.future.push(hist.last); restore(hist.past.pop(), "Undone"); }
  function redo() { if (!hist.future.length) return; hist.past.push(hist.last); restore(hist.future.pop(), "Redone"); }
  function updateUndo() { const u = $("#undo"), rd = $("#redo"); if (u) u.disabled = !hist.past.length && JSON.stringify(draft) === hist.last; if (rd) rd.disabled = !hist.future.length; }

  /* ---------------- Keyboard shortcuts ---------------- */
  let keysWired = false;
  function onKey(e) {
    if (!$(".ed")) return;
    const typing = e.target.closest?.("input, textarea, select, [contenteditable]"), mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); return; }
    if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); save(); record(true); window.SS?.toast("Draft saved on this device"); return; }
    if (mod && !typing && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && !typing && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
    if (!typing && !mod && e.key === "?") { e.preventDefault(); openHelp(); }
  }
  function openHelp() {
    const dlg = $("#help-dialog");
    const row = (k, t) => `<div class="ed-key"><span>${k.split("+").map((x) => `<kbd class="kbd">${x}</kbd>`).join(" + ")}</span><span>${t}</span></div>`;
    dlg.innerHTML = `<form method="dialog" class="ed-dialog-inner"><div class="ed-dialog-head"><h2>Keyboard shortcuts</h2><button class="icon-btn" value="close" aria-label="Close">${icon("close")}</button></div>
      <div class="ed-keys">${row("Ctrl+K", "Search sections, fields, members, sponsors…")}${row("Ctrl+Z", "Undo (when you're not typing in a box)")}${row("Ctrl+Shift+Z", "Redo")}${row("Ctrl+S", "Save the draft now")}${row("?", "Show this list")}</div>
      <p class="hint">On a Mac, use ⌘ instead of Ctrl. Inside a text box, Ctrl+Z undoes your typing in that box.</p></form>`;
    dlg.showModal();
  }

  /* ---------------- Search (Ctrl+K) ---------------- */
  function searchIndex() {
    const out = [];
    for (const sec of SECTIONS) {
      out.push({ label: sec.title, sub: "Section", sec: sec.id, kind: "section" });
      for (const f of sec.fields || []) if (f.type !== "heading" && !f.k.startsWith("_")) out.push({ label: f.label, sub: sec.title, sec: sec.id, field: f.k, kind: "field" });
      if (sec.list) (sec.get(draft) || []).forEach((it, i) => out.push({ label: sec.summary(it), sub: sec.title, sec: sec.id, item: i, kind: "item" }));
    }
    (draft.outreach?.events || []).forEach((e, i) => out.push({ label: e.title || "Outreach event", sub: `Outreach log${e.date ? " · " + e.date : ""}`, sec: "outreach", nested: "events", item: i, kind: "item" }));
    return out;
  }
  function openSearch() {
    const dlg = $("#search-dialog"); if (!dlg || dlg.open) return;
    dlg.innerHTML = `<div class="ed-search-box">${searchIco}<input class="input" type="search" placeholder="Search sections, fields, members, sponsors…" aria-label="Search the editor" autocomplete="off"><kbd class="kbd">Esc</kbd></div><div class="ed-search-results" role="listbox"></div>`;
    const input = $("input", dlg), list = $(".ed-search-results", dlg), all = searchIndex();
    let hits = [], sel = 0;
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      hits = (q ? all.filter((h) => `${h.label} ${h.sub}`.toLowerCase().includes(q)) : all.filter((h) => h.kind === "section")).slice(0, 40);
      sel = Math.min(sel, Math.max(0, hits.length - 1));
      list.innerHTML = hits.length ? hits.map((h, i) => `<button type="button" role="option" class="ed-hit${i === sel ? " on" : ""}" data-i="${i}" aria-selected="${i === sel}"><span class="ed-hit-kind k-${h.kind}">${h.kind === "section" ? "Section" : h.kind === "field" ? "Field" : "Item"}</span><b>${esc(h.label)}</b><small>${esc(h.sub)}</small></button>`).join("") : `<p class="ed-hit-none">Nothing matches “${esc(input.value)}”.</p>`;
      $(".ed-hit.on", list)?.scrollIntoView({ block: "nearest" });
    };
    const go = (h) => { dlg.close(); jumpTo(h); };
    input.addEventListener("input", () => { sel = 0; draw(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % Math.max(1, hits.length); draw(); }
      else if (e.key === "Enter" && hits[sel]) { e.preventDefault(); go(hits[sel]); }
    });
    list.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) go(hits[+b.dataset.i]); });
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    draw(); dlg.showModal(); input.focus();
  }
  /** Opens a section, optionally a list item or a field, and highlights it. */
  function jumpTo(h) {
    const sec = SECTIONS.find((x) => x.id === h.sec); if (!sec) return;
    if (h.item != null) { const spec = h.nested ? sec.fields.find((f) => f.k === h.nested) : sec; spec.__openIndex = h.item; }
    current = sec.id; history.replaceState(null, "", "#" + current); renderNav(); renderPanel(); scrollTo(0, 0);
    setTimeout(() => {
      let el = null;
      if (h.field) el = $(`#panel [data-k="${h.field}"]`);
      else if (h.item != null) el = $$("#panel .ed-item.open")[0];
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" }); el.classList.add("ed-flash"); setTimeout(() => el.classList.remove("ed-flash"), 1600);
      $("input, textarea, select", el)?.focus({ preventScroll: true });
    }, 60);
  }

  /* ---------------- Live preview pane ---------------- */
  let liveOn = false, liveTimer = 0;
  function setLive(on) {
    if (on && innerWidth < 1100) { window.open(`${PAGE_FOR[current] || "index.html"}?preview=1`, "_blank", "noopener"); return; }
    liveOn = on; store.set("ss-editor-live", on);
    $("#live").setAttribute("aria-pressed", String(on)); $("#live-pane").hidden = !on; $(".ed-body").classList.toggle("with-live", on);
    if (on) { save(true); loadLive(true); }
  }
  function loadLive(force) {
    if (!liveOn) return;
    const frame = $("#live-frame"), page = PAGE_FOR[current] || "index.html", src = `${page}?preview=1`;
    $("#live-title").textContent = { "index.html": "Home page", "team.html": "Team page", "media.html": "Media page", "sponsors.html": "Sponsors page", "contact.html": "Contact page" }[page] || page;
    if (force || !frame.src.endsWith(src)) { frame.src = src; return; }
    let y = 0; try { y = frame.contentWindow.scrollY; } catch {}
    frame.addEventListener("load", function back() { frame.removeEventListener("load", back); try { frame.contentWindow.scrollTo(0, y); } catch {} });
    try { frame.contentWindow.location.reload(); } catch { frame.src = src; }
  }
  function reloadLive() { if (!liveOn) return; clearTimeout(liveTimer); liveTimer = setTimeout(() => loadLive(false), 700); }

  /* ---------------- Saving ---------------- */
  let saveTimer;
  function changed() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { save(); refreshHead(); reloadLive(); }, 350); updateStatus(true); record(); }
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
        sec.set(draft, clone(sec.get(published))); save(); record(true); renderNav(); renderPanel(); reloadLive(); window.SS?.toast(`${sec.title} restored`);
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
    el.innerHTML = saving ? `<span class="dot saving"></span>Saving…` : n ? `<span class="dot draft"></span>Draft saved · ${n} section${n === 1 ? "" : "s"} changed` : `<span class="dot ok"></span>Matches the live site`;
    $("#publish").disabled = !n; $("#discard").disabled = !n;
    const c = $("#pub-count"); if (c) { c.textContent = n || ""; c.hidden = !n; }
  }
  function discard() {
    if (!confirm("Throw away all unpublished changes on this device?")) return;
    store.del(DRAFT_KEY); draft = clone(published); window.SS?.applyLook?.(draft, false); record(true); renderNav(); renderPanel(); updateStatus(); reloadLive(); window.SS?.toast("Draft discarded. Ctrl+Z brings it back.");
  }

  /* ---------------- Nav & panel ---------------- */
  function renderNav() {
    const dirty = new Set(dirtySections().map((s) => s.id));
    const item = (s) => `<button type="button" class="ed-nav-item${s.id === current ? " active" : ""}" data-sec="${s.id}"${s.id === current ? ' aria-current="page"' : ""}><i class="ed-nav-ico">${icon(s.icon)}</i><span>${s.title}</span>${dirty.has(s.id) ? '<i class="ed-dirty" title="Changed"></i>' : ""}</button>`;
    const byId = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
    const grouped = new Set(GROUPS.flatMap(([, ids]) => ids));
    $("#nav").innerHTML = GROUPS.map(([label, ids]) => `<div class="ed-nav-group"><span class="ed-nav-label">${label}</span>${ids.filter((id) => byId[id]).map((id) => item(byId[id])).join("")}</div>`).join("")
      + SECTIONS.filter((s) => !grouped.has(s.id)).map(item).join("");
    $$("[data-sec]", $("#nav")).forEach((b) => b.addEventListener("click", () => { current = b.dataset.sec; history.replaceState(null, "", "#" + current); renderNav(); renderPanel(); $("#panel").scrollTo?.(0, 0); scrollTo(0, 0); if (liveOn) loadLive(false); }));
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
      sec.set(draft, clone(sec.get(published))); save(); record(true); renderNav(); renderPanel(); reloadLive(); window.SS?.toast(`${sec.title} restored`);
    });
    const host = $("#form", panel);
    if (sec.id === "overview") {
      host.className = ""; overviewPanel(host);
    } else if (sec.id === "sweep") {
      host.className = ""; sweepPanel(host, sec.__autorun); sec.__autorun = false;
    } else if (sec.custom) {
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
      row.className = `field ed-field ed-${f.type}`; row.dataset.k = f.k;
      const label = `<label for="${id}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ""}</label>`;
      const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : "";
      const set = (v) => { value[f.k] = v; onChange({ ...value }); };
      const v = value[f.k];
      if (f.type === "heading") {
        row.className = "ed-group-head";
        row.innerHTML = `<h3>${esc(f.label)}</h3>${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ""}`;
      } else if (f.type === "textarea") {
        const counter = f.max ? `<span class="ed-chars" aria-live="off"></span>` : "";
        row.innerHTML = `${label}<textarea class="textarea" id="${id}" rows="4">${esc(v)}</textarea><div class="ed-under">${hint}${counter}</div>`;
        const ta = $("textarea", row), cnt = $(".ed-chars", row);
        const count = () => { if (!cnt) return; const n = ta.value.length; cnt.textContent = `${n} / ${f.max}`; cnt.classList.toggle("over", n > f.max); cnt.title = n > f.max ? "A bit long. Shorter reads better on phones." : "Suggested length"; };
        const grow = () => { ta.style.height = "auto"; ta.style.height = `${Math.min(520, ta.scrollHeight + 2)}px`; };
        ta.addEventListener("input", (e) => { set(e.target.value); count(); grow(); });
        count(); requestAnimationFrame(grow);
      } else if (f.type === "select") {
        const opts = f.options.map((o) => (Array.isArray(o) ? o : [o, o]));
        if (v && !opts.some(([val]) => val === v)) opts.push([v, v]);
        row.innerHTML = `${label}<select class="select input" id="${id}">${opts.map(([val, lab]) => `<option value="${esc(val)}"${val === v ? " selected" : ""}>${esc(lab)}</option>`).join("")}</select>${hint}`;
        $("select", row).addEventListener("change", (e) => set(e.target.value));
      } else if (f.type === "bool") {
        row.innerHTML = `<label class="ed-switch"><input type="checkbox" id="${id}"${v ? " checked" : ""}><span></span>${esc(f.label)}</label>${hint}`;
        $("input", row).addEventListener("change", (e) => set(e.target.checked));
      } else if (f.type === "swatch") {
        const A = window.SS?.ACCENTS || { blue: null }, base = getComputedStyle(document.documentElement).getPropertyValue("--surge").trim() || "#3ba8ff";
        const col = (n) => (A[n] ? A[n][0] : "#3ba8ff"), cust = value.accentCustom || base;
        row.innerHTML = `<span class="ed-label">${esc(f.label)}</span><div class="ed-swatches" role="radiogroup" aria-label="${esc(f.label)}">${Object.keys(A).map((n) => `<button type="button" role="radio" class="ed-sw" data-v="${n}" style="--sw:${col(n)}"><i></i><span>${n[0].toUpperCase() + n.slice(1)}</span></button>`).join("")}
          <label class="ed-sw ed-sw-custom" data-v="custom" style="--sw:${esc(cust)}"><i></i><span>Custom</span><input type="color" value="${esc(/^#[\da-f]{6}$/i.test(cust) ? cust : "#3ba8ff")}" aria-label="Pick a custom accent color"></label></div>${hint}`;
        const mark = (n) => $$(".ed-sw", row).forEach((b) => { b.classList.toggle("on", b.dataset.v === n); b.setAttribute("aria-checked", String(b.dataset.v === n)); });
        mark(v || "blue");
        $$("button.ed-sw", row).forEach((b) => b.addEventListener("click", () => { mark(b.dataset.v); set(b.dataset.v); }));
        const ci = $("input[type=color]", row);
        ci.addEventListener("input", (e) => { value.accentCustom = e.target.value; ci.parentNode.style.setProperty("--sw", e.target.value); mark("custom"); set("custom"); });
      } else if (f.type === "segmented") {
        row.innerHTML = `<span class="ed-label">${esc(f.label)}</span><div class="ed-seg" role="radiogroup" aria-label="${esc(f.label)}">${f.options.map(([val, lab]) => `<button type="button" role="radio" data-v="${esc(val)}" class="${val === v ? "on" : ""}" aria-checked="${val === v}">${esc(lab)}</button>`).join("")}</div>${hint}`;
        $$("button", row).forEach((b) => b.addEventListener("click", () => { $$("button", row).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); }); set(b.dataset.v); }));
      } else if (f.type === "picks") {
        const opts = typeof f.options === "function" ? f.options() : f.options, cur = Array.isArray(v) ? v.slice() : [];
        row.innerHTML = `<span class="ed-label">${esc(f.label)} <small class="ed-picks-n"></small></span><div class="ed-picks"></div>${hint}`;
        const box = $(".ed-picks", row);
        const draw = () => {
          box.innerHTML = opts.map(([val, lab]) => { const i = cur.indexOf(val); return `<button type="button" class="ed-pick${i >= 0 ? " on" : ""}" data-v="${esc(val)}" aria-pressed="${i >= 0}">${i >= 0 ? `<b>${i + 1}</b>` : ""}${esc(lab)}</button>`; }).join("");
          $(".ed-picks-n", row).textContent = `${cur.length} of ${f.max}`;
        };
        box.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (!b) return; const i = cur.indexOf(b.dataset.v); if (i >= 0) cur.splice(i, 1); else { if (cur.length >= f.max) cur.shift(); cur.push(b.dataset.v); } set(cur.slice()); draw(); });
        draw();
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
        const type = { number: "number", email: "email", url: "url", month: "month", date: "date", time: "time" }[f.type] || "text";
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
    if (spec.__openIndex != null) { if (spec.__openIndex < items.length) open.add(spec.__openIndex); delete spec.__openIndex; }
    let filter = "", dragFrom = null;
    const emit = () => onChange(items.map((x) => ({ ...x })));
    const draw = () => {
      box.innerHTML = "";
      if (items.length > 1) {
        const bar = document.createElement("div"); bar.className = "ed-list-bar";
        bar.innerHTML = `${items.length > 5 ? `<input class="input ed-list-filter" type="search" placeholder="Filter ${esc(spec.itemLabel)}s…" value="${esc(filter)}" aria-label="Filter ${esc(spec.itemLabel)}s">` : "<span></span>"}
          <div class="ed-list-bar-btns"><button type="button" class="btn ghost sm" data-all="open">Expand all</button><button type="button" class="btn ghost sm" data-all="close">Collapse all</button></div>`;
        $(".ed-list-filter", bar)?.addEventListener("input", (e) => { filter = e.target.value.toLowerCase(); const pos = e.target.selectionStart; draw(); const nf = $(".ed-list-filter", box); nf.focus(); nf.setSelectionRange(pos, pos); });
        $$("[data-all]", bar).forEach((b) => b.addEventListener("click", () => { open.clear(); if (b.dataset.all === "open") items.forEach((_, i) => open.add(i)); draw(); }));
        box.append(bar);
      }
      if (!items.length) box.insertAdjacentHTML("beforeend", `<div class="ed-empty">${icon("plus") || "+"}<b>No ${esc(spec.itemLabel)}s yet</b><span>Add the first one below.</span></div>`);
      items.forEach((it, i) => {
        if (filter && !JSON.stringify(it).toLowerCase().includes(filter)) return;
        const card = document.createElement("div"); card.className = `ed-item${open.has(i) ? " open" : ""}`; card.dataset.i = i;
        const sub = spec.sub?.(it);
        const imgField = (spec.fields || []).find((f) => f.type === "image"), img = imgField ? it[imgField.k] : "";
        const thumb = imgField ? `<span class="ed-item-thumb${imgField.square === false ? " wide" : ""}">${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}<i>${esc((spec.summary(it) || "?").trim()[0] || "?")}</i></span>` : "";
        card.innerHTML = `
          <div class="ed-item-head">
            <button type="button" class="ed-item-toggle" aria-expanded="${open.has(i)}">${thumb}<span class="ed-item-text"><b>${esc(spec.summary(it))}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</span></button>
            <div class="ed-item-tools">
              <span class="ed-drag" title="Drag to reorder" aria-hidden="true">${dragIcon}</span>
              <button type="button" class="icon-btn" data-a="dup" aria-label="Duplicate" title="Duplicate">${dupIcon}</button>
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
        // drag to reorder (by the handle)
        const handle = $(".ed-drag", card);
        handle.addEventListener("pointerdown", () => { card.draggable = true; });
        card.addEventListener("dragstart", (e) => { dragFrom = i; card.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", String(i)); } catch {} });
        card.addEventListener("dragend", () => { card.draggable = false; card.classList.remove("dragging"); $$(".ed-item", box).forEach((c) => c.classList.remove("drop-before", "drop-after")); });
        card.addEventListener("dragover", (e) => { if (dragFrom == null) return; e.preventDefault(); const r = card.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2; card.classList.toggle("drop-after", after); card.classList.toggle("drop-before", !after); });
        card.addEventListener("dragleave", () => card.classList.remove("drop-before", "drop-after"));
        card.addEventListener("drop", (e) => {
          e.preventDefault(); if (dragFrom == null) return;
          const r = card.getBoundingClientRect(); let to = i + (e.clientY > r.top + r.height / 2 ? 1 : 0);
          const [moved] = items.splice(dragFrom, 1); if (dragFrom < to) to--; items.splice(to, 0, moved);
          open.clear(); dragFrom = null; emit(); draw();
        });
        $$("[data-a]", card).forEach((b) => b.addEventListener("click", () => {
          const a = b.dataset.a;
          if (a === "dup") { const copy = JSON.parse(JSON.stringify(it)); const nameKey = (spec.fields || []).find((f) => f.required && f.type === "text")?.k; if (nameKey && copy[nameKey]) copy[nameKey] += " (copy)"; items.splice(i + 1, 0, copy); open.clear(); open.add(i + 1); emit(); draw(); return; }
          if (a === "del") { if (!confirm(`Delete "${spec.summary(it)}"? (Ctrl+Z can bring it back.)`)) return; items.splice(i, 1); open.clear(); }
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
  const dupIcon = svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>');
  const dragIcon = svg('<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>');

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

    const dlg = $("#publish-dialog");
    dlg.innerHTML = `
      <form method="dialog" class="ed-dialog-inner">
        <div class="ed-dialog-head"><h2>Publish your changes</h2><button class="icon-btn" value="close" aria-label="Close">${icon("close")}</button></div>
        <div class="ed-review">${dirtySections().map((sec) => { const ch = diffSection(sec); return `<details class="ed-review-sec"${ch.length <= 6 ? " open" : ""}><summary>${icon(sec.icon)} <b>${esc(sec.title)}</b><span class="ed-pill">${ch.length} change${ch.length === 1 ? "" : "s"}</span></summary><ul>${ch.slice(0, 30).map(([k, t]) => `<li class="${k}">${esc(t)}</li>`).join("")}${ch.length > 30 ? `<li class="chg">…and ${ch.length - 30} more</li>` : ""}</ul></details>`; }).join("")}</div>
        <div class="ed-checks" id="pub-checks"><p class="muted">${icon("search") || ""} Checking for problems…</p></div>
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
    validate().then((probs) => {
      const box = $("#pub-checks", dlg); if (!box) return;
      box.className = `ed-checks ${probs.length ? "warn" : "ok"}`;
      box.innerHTML = probs.length ? `<b>${probs.length} thing${probs.length === 1 ? "" : "s"} to check first</b><ul>${probs.slice(0, 12).map((p) => `<li>${esc(p)}</li>`).join("")}</ul><p class="hint">You can still publish. These are only warnings.</p>` : `<b>${icon("check")} No problems found.</b>`;
    });
    $("#copy-json", dlg).addEventListener("click", async (e) => {
      try { await navigator.clipboard.writeText(json); e.currentTarget.innerHTML = `${icon("check")} Copied!`; }
      catch { download(json); }
    });
    $("#dl-json", dlg).addEventListener("click", () => download(json));
    $("#published-done", dlg).addEventListener("click", () => {
      if (!confirm("Only do this after GitHub shows your commit. Clear the local draft?")) return;
      published = clone(draft); store.del(DRAFT_KEY); dlg.close(); renderNav(); renderPanel(); updateStatus(); window.SS?.toast("Draft cleared. Nice work!");
    });
  }
  function download(text, name = "content.json") {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // Wait for site.js (icons, toast) when present, then start.
  if (window.SS) init(); else addEventListener("DOMContentLoaded", () => setTimeout(init, 0));
})();
