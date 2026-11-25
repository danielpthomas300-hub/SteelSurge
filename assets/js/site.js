/* ==========================================================================
   Steel Surge — site core
   - Builds the shared header/footer
   - Loads content/content.json (or a dev-mode draft when previewing)
   - Pulls live team data from FTCScout (cached, with graceful fallback)
   - Renders whichever page is open (body[data-page])
   You should never need to edit this file to change site *content*:
   edit content/content.json, or use editor.html.
   ========================================================================== */
(() => {
  "use strict";

  const ROOT = document.documentElement.dataset.root || ".";
  const PAGE = document.body.dataset.page || "";
  // This script's ?v= stamp, reused for modules it loads later so they update together
  const ASSET_V = ((document.currentScript && document.currentScript.src.match(/\?v=\w+/)) || [""])[0];
  const url = (p) => `${ROOT}/${p}`.replace(/^\.\/\.\//, "./");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Icons ---------------- */
  const P = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  const ICON = {
    arrow: P('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    ext: P('<path d="M7 17 17 7M8 7h9v9"/>'),
    menu: P('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    close: P('<path d="M6 6l12 12M18 6 6 18"/>'),
    moon: P('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', 'class="i-moon"'),
    sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 'class="i-sun"'),
    bolt: P('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    gear: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    code: P('<path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 4l-4 16"/>'),
    users: P('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
    trophy: P('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    flag: P('<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>'),
    star: P('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'),
    mail: P('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>'),
    copy: P('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    check: P('<path d="M20 6 9 17l-5-5"/>'),
    alert: P('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.1V8.9l5.8 3.1z"/></svg>',
    chart: P('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>'),
    heart: P('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>'),
    pin: P('<path d="M12 22s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'),
    pencil: P('<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>'),
    instagram: P('<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r=".6" fill="currentColor"/>'),
    gamepad: P('<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><rect x="2" y="6" width="20" height="12" rx="6"/>'),
  };
  // Team logo (built from assets/img/brand/logo-source.png by tools/make_images.py).
  const LOGO = `<img class="brand-mark" src="${url("assets/img/logo-mark.png")}" alt="" width="34" height="34">`;

  /* ---------------- Theme ---------------- */
  const theme = {
    get: () => document.documentElement.dataset.theme || "dark",
    set(t) {
      document.documentElement.dataset.theme = t;
      store.set("ss-theme", t);
      window.dispatchEvent(new CustomEvent("ss:theme", { detail: t }));
    },
    toggle() { theme.set(theme.get() === "dark" ? "light" : "dark"); },
  };

  /* ---------------- Toast ---------------- */
  function toast(msg, icon = "check") {
    let host = $(".toast-host");
    if (!host) { host = document.createElement("div"); host.className = "toast-host"; host.setAttribute("role", "status"); document.body.append(host); }
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `${ICON[icon] || ""}<span>${esc(msg)}</span>`;
    host.append(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 260); }, 2600);
  }

  /* ---------------- Dates ---------------- */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parseDate = (s) => { if (!s) return null; const [y, m = 1, d = 1] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
  const fmtDate = (s, withDay = true) => { const d = parseDate(s); if (!d) return ""; const hasDay = String(s).split("-").length > 2; return withDay && hasDay ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const ago = (t) => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); if (s < 60) return "just now"; const m = Math.round(s / 60); if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`; return `${Math.round(h / 24)} days ago`; };
  /** FTC seasons start in September and are named by their starting year. */
  const currentSeason = () => { const n = new Date(); return n.getMonth() >= 8 ? n.getFullYear() : n.getFullYear() - 1; };
  const seasonLabel = (y) => `${y}–${String(y + 1).slice(2)}`;

  /* ---------------- Content ---------------- */
  const PREVIEW_KEY = "ss-preview";
  const DRAFT_KEY = "ss-draft";
  const params = new URLSearchParams(location.search);
  if (params.get("preview") === "1") { try { sessionStorage.setItem(PREVIEW_KEY, "1"); } catch {} }
  if (params.get("preview") === "0") { try { sessionStorage.removeItem(PREVIEW_KEY); } catch {} }
  const isPreview = () => { try { return sessionStorage.getItem(PREVIEW_KEY) === "1" && !!store.get(DRAFT_KEY); } catch { return false; } };

  /* ---------------- Master controls (set in the Team editor) ---------------- */
  const CONTROL_DEFAULTS = {
    maintenance: false, maintenanceTitle: "We'll be right back", maintenanceMessage: "Our website is getting a tune-up. Check back soon, or email the team if you need us.", maintenanceUntil: "",
    banner: false, bannerText: "", bannerLink: "", bannerTone: "info", bannerUntil: "",
    arcade: true, calculator: true, codelab: true, scouting: true, weekly: true, media: true, trophies: true, steelAI: true, contactForm: true, searchEngines: true,
  };
  const controls = (c) => ({ ...CONTROL_DEFAULTS, ...(c?.controls || {}) });

  /* ---------------- Appearance (Team editor → Site → Appearance) ---------------- */
  const LOOK_DEFAULTS = { accent: "blue", accentCustom: "", defaultTheme: "dark", heroAnimation: true, animations: true };
  /** Accent palettes: [dark accent, dark light-variant, light-theme accent, light-theme deep] */
  const ACCENTS = {
    blue: null,
    violet: ["#a78bfa", "#c4b5fd", "#7c3aed", "#6d28d9"], green: ["#34d399", "#6ee7b7", "#059669", "#047857"],
    orange: ["#fb923c", "#fdba74", "#ea580c", "#c2410c"], red: ["#f87171", "#fca5a5", "#dc2626", "#b91c1c"],
    gold: ["#fbbf24", "#fcd34d", "#b45309", "#92400e"], teal: ["#2dd4bf", "#5eead4", "#0d9488", "#0f766e"], pink: ["#f472b6", "#f9a8d4", "#db2777", "#be185d"],
  };
  const look = (c) => ({ ...LOOK_DEFAULTS, ...(c?.appearance || {}) });
  const hexRgb = (h) => { const m = /^#?([\da-f]{6})$/i.exec(h || ""); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (rgb, to, t) => "#" + rgb.map((v, i) => Math.round(v + (to[i] - v) * t).toString(16).padStart(2, "0")).join("");
  function accentCss(a) {
    let pal = ACCENTS[a.accent];
    if (a.accent === "custom") { const rgb = hexRgb(a.accentCustom); if (rgb) pal = [mix(rgb, [255, 255, 255], 0.1), mix(rgb, [255, 255, 255], 0.45), mix(rgb, [0, 0, 0], 0.25), mix(rgb, [0, 0, 0], 0.4)]; }
    if (!pal) return "";
    const rgba = (h, o) => { const [r, g, b] = hexRgb(h); return `rgba(${r}, ${g}, ${b}, ${o})`; };
    const lum = (h) => { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
    const dark = `--surge:${pal[0]};--surge-2:${pal[1]};--surge-soft:${rgba(pal[0], 0.12)};--surge-glow:${rgba(pal[0], 0.38)};--surge-ink:${lum(pal[0]) > 0.55 ? "#04121f" : "#ffffff"};`;
    const light = `--surge:${pal[2]};--surge-2:${pal[3]};--surge-soft:${rgba(pal[2], 0.09)};--surge-glow:${rgba(pal[2], 0.25)};--surge-ink:#ffffff;`;
    return `:root,:root[data-theme="dark"]{${dark}}:root[data-theme="light"]{${light}}`;
  }
  /** Applies the team's chosen look and remembers it, so the next page load starts with it. */
  function applyLook(c, persist = !isPreview()) {
    const a = look(c), css = accentCss(a);
    let el = document.getElementById("ss-look");
    if (css) { if (!el) { el = document.createElement("style"); el.id = "ss-look"; document.head.append(el); } el.textContent = css; } else el?.remove();
    document.documentElement.classList.toggle("no-motion", a.animations === false);
    if (!persist) return;
    try {
      css ? localStorage.setItem("ss-look-css", css) : localStorage.removeItem("ss-look-css");
      localStorage.setItem("ss-no-motion", a.animations === false ? "1" : "0");
      localStorage.setItem("ss-theme-default", a.defaultTheme);
      if (!localStorage.getItem("ss-theme")) {
        const t = a.defaultTheme === "light" || (a.defaultTheme === "system" && matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
        document.documentElement.dataset.theme = t;
      }
    } catch {}
  }
  const HOME_DEFAULTS = { stats: true, crews: true, build: true, videos: true, arcade: true, codelab: true, sponsors: true, cta: true };
  /** Someone who uses the Team editor on this device (they get a "view the site anyway" button). */
  const isTeamDevice = (c) => { if (isPreview() || store.get(DRAFT_KEY)) return true; try { return !!c?.dev?.passcodeHash && sessionStorage.getItem("ss-editor-unlocked") === c.dev.passcodeHash; } catch { return false; } };
  const mxBypassed = () => { try { return sessionStorage.getItem("ss-mx-bypass") === "1"; } catch { return false; } };
  const maintenanceOn = (c) => controls(c).maintenance && PAGE !== "editor" && !mxBypassed();
  /** True when a feature is switched off, or the whole site is in maintenance mode. */
  const siteOff = (c, key) => maintenanceOn(c) || (!!key && controls(c)[key] === false);
  const PAGE_SWITCH = { arcade: "arcade", calculator: "calculator", codelab: "codelab", media: "media", trophies: "trophies" };
  const pageSwitch = () => (PAGE.startsWith("game") ? "arcade" : PAGE_SWITCH[PAGE]);
  const navFor = (c) => { const k = controls(c); return NAV.filter(([, , id]) => !(id in PAGE_SWITCH) || k[id]); };

  let contentPromise;
  function loadContent() {
    if (contentPromise) return contentPromise;
    contentPromise = (async () => {
      if (isPreview()) return store.get(DRAFT_KEY).content;
      // Retry a couple of times so a dropped connection doesn't leave the page empty.
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(url("content/content.json"), { cache: attempt ? "reload" : "no-cache" });
          if (!res.ok) throw new Error(`content.json: HTTP ${res.status}`);
          return await res.json();
        } catch (err) { lastErr = err; await new Promise((r) => setTimeout(r, 500 * (attempt + 1))); }
      }
      throw lastErr;
    })();
    return contentPromise;
  }

  /* ---------------- FTCScout (live data) ---------------- */
  const FTC_TTL = 3 * 60 * 60 * 1000; // 3 hours
  const API = "https://api.ftcscout.org";
  async function ftcFetch(path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(API + path, body
        ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal }
        : { signal: ctrl.signal });
      if (!res.ok) throw new Error(`FTCScout ${res.status}`);
      return await res.json();
    } finally { clearTimeout(timer); }
  }

  /** Turns raw FTCScout responses into the shape every page uses. Shared by live data and the daily snapshot. */
  function buildFTC({ years, gql: t, rest, quick }) {
    const today = new Date().toISOString().slice(0, 10);
    const meta = {};
    const seasons = years.map((y, i) => {
      const stats = {}; (rest[i] || []).forEach((e) => (stats[e.eventCode] = e.stats));
      const all = (t[`s${y}`] || []).map((e) => {
        const m = e.event || {}, st = stats[e.eventCode];
        meta[`${y}:${e.eventCode}`] = m;
        return {
          season: y, code: e.eventCode, name: m.name || e.eventCode, start: m.start, end: m.end, type: m.type,
          venue: m.location?.venue, city: m.location?.city, state: m.location?.state,
          rank: st?.rank ?? null, wins: st?.wins ?? 0, losses: st?.losses ?? 0, ties: st?.ties ?? 0,
          played: st?.qualMatchesPlayed ?? 0, hasStats: !!st,
        };
      }).sort((a, b) => String(a.start).localeCompare(String(b.start)));
      const q = quick[i];
      return {
        season: y,
        events: all.filter((e) => e.hasStats || (e.end || e.start) < today),
        upcoming: all.filter((e) => !e.hasStats && (e.end || e.start) >= today),
        quick: q && q.tot ? { opr: q.tot.value, rank: q.tot.rank, of: q.count } : null,
      };
    });
    const awards = (t.awards || []).map((a) => ({ ...a, eventName: meta[`${a.season}:${a.eventCode}`]?.name || a.eventCode, eventStart: meta[`${a.season}:${a.eventCode}`]?.start }));
    return { seasons, awards, upcoming: seasons.flatMap((s) => s.upcoming).sort((a, b) => String(a.start).localeCompare(String(b.start))) };
  }

  /**
   * Returns { fetchedAt, stale, seasons: [{ season, events, upcoming, quick }], awards, upcoming }.
   * Order of preference: fresh browser cache → live FTCScout → stale cache → daily snapshot (content/ftc.json).
   */
  async function loadFTC(teamNumber, rookieYear) {
    const key = `ss-ftc2-${teamNumber}`;
    const cached = store.get(key);
    if (cached && Date.now() - cached.fetchedAt < FTC_TTL) return { ...cached, stale: false };
    try {
      const first = Math.max(2019, rookieYear || currentSeason());
      const years = []; for (let y = currentSeason(); y >= first; y--) years.push(y);
      const aliases = years.map((y) => `s${y}: events(season:${y}){ eventCode event{ name start end type location{ venue city state } } }`).join(" ");
      const gql = ftcFetch("/graphql", { query: `{ teamByNumber(number:${teamNumber}){ awards{ season type placement eventCode } ${aliases} } }` });
      const rest = years.map((y) => ftcFetch(`/rest/v1/teams/${teamNumber}/events/${y}`).catch(() => []));
      const quick = years.map((y) => ftcFetch(`/rest/v1/teams/${teamNumber}/quick-stats?season=${y}`).catch(() => null));
      const [g, ...rs] = await Promise.all([gql, ...rest, ...quick]);
      const t = g?.data?.teamByNumber;
      if (!t) throw new Error("FTCScout: team not found");
      const data = { fetchedAt: Date.now(), ...buildFTC({ years, gql: t, rest: rs.slice(0, years.length), quick: rs.slice(years.length) }) };
      store.set(key, data);
      return { ...data, stale: false };
    } catch (err) {
      console.warn("[Steel Surge] Live data unavailable:", err);
      if (cached) return { ...cached, stale: true };
      try {
        const snap = await (await fetch(url("content/ftc.json"), { cache: "no-cache" })).json();
        return { fetchedAt: Date.parse(snap.updatedAt), ...buildFTC(snap.raw), stale: true };
      } catch { return null; }
    }
  }

  /** Summaries used by several pages. */
  function summarize(ftc) {
    if (!ftc) return null;
    const withEvents = ftc.seasons.filter((s) => s.events.length);
    const current = ftc.seasons[0];
    const active = current.events.length ? current : withEvents[0] || current;
    const tally = (evs) => evs.reduce((a, e) => ({ w: a.w + e.wins, l: a.l + e.losses, t: a.t + e.ties }), { w: 0, l: 0, t: 0 });
    const all = ftc.seasons.flatMap((s) => s.events);
    const ranked = all.filter((e) => e.rank);
    const best = ranked.reduce((b, e) => (!b || e.rank < b.rank ? e : b), null);
    return {
      active, isCurrent: active === current && current.events.length > 0,
      activeRecord: tally(active.events), totalRecord: tally(all),
      totalEvents: all.length, seasonsCompeted: withEvents.length, best, next: (ftc.upcoming || [])[0] || null,
      totalMatches: all.reduce((n, e) => n + (e.played || e.wins + e.losses + e.ties), 0),
    };
  }

  const AWARD_NAMES = {
    Inspire: "Inspire Award", Think: "Think Award", Connect: "Connect Award", Innovate: "Innovate Award", Control: "Control Award",
    Motivate: "Motivate Award", Design: "Design Award", Promote: "Promote Award", Compass: "Compass Award", JudgesChoice: "Judges' Choice Award",
    Winner: "Winning Alliance", Finalist: "Finalist Alliance", TopRanked: "Top Ranked Team", DeansListFinalist: "Dean's List Finalist",
    DeansListSemiFinalist: "Dean's List Semi-Finalist", DeansListWinner: "Dean's List Winner", Sustain: "Sustain Award", Reach: "Reach Award",
  };
  const awardName = (a) => {
    const base = AWARD_NAMES[a.type] || a.type.replace(/([a-z])([A-Z])/g, "$1 $2") + (/(Award|Alliance)$/.test(a.type) ? "" : " Award");
    const place = a.placement > 1 && !/Alliance|Dean/.test(base) ? ` · ${a.placement === 2 ? "2nd" : a.placement === 3 ? "3rd" : a.placement + "th"} place` : "";
    return base + place;
  };

  /* ---------------- Layout: header / footer ---------------- */
  const NAV = [
    ["index.html", "Home", "home"], ["team.html", "Team", "team"],
    ["ftc.html", "FTC", "ftc"], ["calculator.html", "Match Tools", "calculator"], ["codelab.html", "Code Lab", "codelab"], ["media.html", "Media", "media"], ["arcade.html", "Arcade", "arcade"], ["sponsors.html", "Sponsors", "sponsors"], ["contact.html", "Contact", "contact"],
  ];
  const navSection = () => (PAGE.startsWith("game") ? "arcade" : PAGE);

  function renderHeader(c) {
    const host = $("#site-header");
    if (!host) return;
    const cur = navSection(), nav = navFor(c), trophiesOn = controls(c).trophies;
    const links = nav.map(([href, label, id]) => `<a href="${url(href)}"${id === cur ? ' aria-current="page"' : ""}>${label}</a>`).join("");
    host.className = "site-header";
    host.innerHTML = `
      <div class="wrap">
        <a class="brand" href="${url("index.html")}" aria-label="${esc(c.team.name)} home">${LOGO}<span>${esc(c.team.name)}<small>FTC #${esc(c.team.number)}</small></span></a>
        <nav class="nav" aria-label="Main">${links}</nav>
        <div class="header-actions">
          ${trophiesOn ? `<a class="icon-btn trophy-btn" href="${url("trophies.html")}" aria-label="Your trophies" title="Your trophies">${ICON.trophy}<span class="trophy-count" data-trophy-count hidden></span></a>` : ""}
          <button class="icon-btn theme-btn" type="button" aria-label="Switch light or dark theme">${ICON.moon}${ICON.sun}</button>
          <a class="btn primary sm header-cta" href="${url("sponsors.html")}">Sponsor us</a>
          <button class="icon-btn menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">${ICON.menu}</button>
        </div>
      </div>`;
    const mobile = document.createElement("nav");
    mobile.id = "mobile-nav"; mobile.className = "mobile-nav"; mobile.setAttribute("aria-label", "Mobile");
    mobile.innerHTML = nav.map(([href, label, id]) => `<a href="${url(href)}"${id === cur ? ' aria-current="page"' : ""}>${label}${ICON.arrow.replace("<svg", '<svg width="20" height="20"')}</a>`).join("")
      + (trophiesOn ? `<a href="${url("trophies.html")}">Trophies${ICON.arrow.replace("<svg", '<svg width="20" height="20"')}</a>` : "") + `<a class="btn primary" href="${url("sponsors.html")}">Sponsor us</a>`;
    host.after(mobile);

    $(".theme-btn", host).addEventListener("click", theme.toggle);
    const menuBtn = $(".menu-btn", host);
    const setMenu = (open) => {
      mobile.classList.toggle("open", open); document.body.classList.toggle("nav-open", open);
      menuBtn.setAttribute("aria-expanded", String(open)); menuBtn.innerHTML = open ? ICON.close : ICON.menu;
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    menuBtn.addEventListener("click", () => setMenu(!mobile.classList.contains("open")));
    addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
    matchMedia("(min-width: 961px)").addEventListener("change", (e) => e.matches && setMenu(false));
    const onScroll = () => host.classList.toggle("scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  function renderFooter(c) {
    const host = $("#site-footer");
    if (!host) return;
    host.className = "site-footer";
    const socials = (c.team.socials || []).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join("");
    host.innerHTML = `
      <div class="wrap">
        <div class="footer-grid">
          <div class="footer-about">
            <a class="brand" href="${url("index.html")}">${LOGO}<span>${esc(c.team.name)}<small>FTC #${esc(c.team.number)}</small></span></a>
            <p>${esc(c.team.program)} team from ${esc(c.team.location)}.</p>
          </div>
          <div><h2>Explore</h2><ul>${navFor(c).slice(1).filter(([, , id]) => id !== "sponsors" && id !== "contact").slice(0, 5).map(([h, l]) => `<li><a href="${url(h)}">${l}</a></li>`).join("")}${controls(c).trophies ? `<li><a href="${url("trophies.html")}">Trophy case</a></li>` : ""}</ul></div>
          <div><h2>Get involved</h2><ul>
            <li><a href="${url("sponsors.html")}">Become a sponsor</a></li>
            <li><a href="${esc(c.team.joinFormUrl)}" target="_blank" rel="noopener">Join the team</a></li>
            <li><a href="${url("contact.html")}">Contact us</a></li>
          </ul></div>
          <div><h2>Follow</h2><ul>${c.team.instagram ? `<li><a href="https://www.instagram.com/${esc(String(c.team.instagram).replace(/^@/, ""))}/" target="_blank" rel="noopener">Instagram</a></li>` : ""}${socials}<li><a href="https://www.firstinspires.org/robotics/ftc" target="_blank" rel="noopener">About FIRST Tech Challenge</a></li></ul></div>
        </div>
        <div class="footer-partners">
          <span>A proud team in</span>
          <a href="https://www.firstinspires.org/programs/ftc" target="_blank" rel="noopener" aria-label="FIRST Tech Challenge"><img class="logo-dark" src="${url("assets/img/brands/ftc-logo-reverse.png")}" alt="FIRST Tech Challenge" width="158" height="40" loading="lazy"><img class="logo-light" src="${url("assets/img/brands/ftc-logo.png")}" alt="FIRST Tech Challenge" width="158" height="40" loading="lazy"></a>
          <a class="scout" href="https://ftcscout.org/teams/${esc(c.team.number)}" target="_blank" rel="noopener"><img src="${url("assets/img/brands/ftcscout.svg")}" alt="" width="26" height="26" loading="lazy">Stats by FTCScout</a>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} ${esc(c.team.name)} · FTC Team ${esc(c.team.number)}</span>
          <span class="footer-egg" title="Psst: try ↑↑↓↓←→←→BA">${esc(c.team.footerTagline || "Built by the students of Steel Surge ⚡")}</span>
          <span>Live stats from <a href="https://ftcscout.org/teams/${esc(c.team.number)}" target="_blank" rel="noopener">FTCScout</a> · <a href="${url("editor.html")}" title="Developer mode (Ctrl+Shift+E)">Team editor</a></span>
        </div>
      </div>`;
  }

  function renderPreviewPill() {
    if (!isPreview()) return;
    const pill = document.createElement("div");
    pill.className = "preview-pill";
    pill.innerHTML = `<span>Previewing your draft</span><a href="${url("editor.html")}">Back to editor</a><button type="button">Exit</button>`;
    $("button", pill).addEventListener("click", () => { try { sessionStorage.removeItem(PREVIEW_KEY); } catch {} location.href = location.pathname; });
    document.body.append(pill);
  }

  function renderBanner(c) {
    const k = controls(c), text = String(k.bannerText || "").trim();
    if (!k.banner || !text || PAGE === "editor") return;
    if (k.bannerUntil && new Date().toISOString().slice(0, 10) > k.bannerUntil) return; // its end date has passed
    const id = text + "|" + k.bannerLink;
    if (store.get("ss-banner-hidden") === id) return;
    const tone = ["info", "warning", "celebrate"].includes(k.bannerTone) ? k.bannerTone : "info";
    const ico = { info: ICON.flag, warning: ICON.alert, celebrate: ICON.star }[tone] || "";
    const ext = /^https?:/i.test(k.bannerLink || "");
    const el = document.createElement("div");
    el.className = `site-banner tone-${tone}`; el.setAttribute("role", "region"); el.setAttribute("aria-label", "Announcement");
    el.innerHTML = `<div class="wrap"><span class="site-banner-ico" aria-hidden="true">${ico}</span><p>${esc(text)}${k.bannerLink ? ` <a href="${esc(ext ? k.bannerLink : url(k.bannerLink))}"${ext ? ' target="_blank" rel="noopener"' : ""}>Learn more</a>` : ""}</p><button class="icon-btn" type="button" aria-label="Hide this announcement">${ICON.close}</button></div>`;
    $("button", el).addEventListener("click", () => { store.set("ss-banner-hidden", id); el.remove(); });
    const header = $("#site-header"); if (header) header.before(el); else document.body.prepend(el);
  }

  function renderMaintenance(c) {
    const k = controls(c), T = c.team || {};
    [...document.body.children].forEach((el) => { if (el.tagName !== "SCRIPT") el.hidden = true; });
    document.body.classList.add("mx-on");
    const team = isTeamDevice(c);
    const socials = socialLinks(c).map((s) => `<a class="social-pill" href="${esc(s.url)}" target="_blank" rel="noopener">${s.icon}<span>${esc(s.label)}</span></a>`).join("");
    const main = document.createElement("main"); main.id = "main"; main.className = "mx";
    main.innerHTML = `<div class="mx-card">
        <div class="brand mx-brand">${LOGO}<span>${esc(T.name)}<small>FTC #${esc(T.number)}</small></span></div>
        <span class="eyebrow">Maintenance</span>
        <h1>${esc(k.maintenanceTitle || CONTROL_DEFAULTS.maintenanceTitle)}</h1>
        <p class="mx-msg">${esc(k.maintenanceMessage || CONTROL_DEFAULTS.maintenanceMessage)}</p>
        ${k.maintenanceUntil ? `<p class="mx-until">${ICON.flag}<span>Expected back: <b>${esc(k.maintenanceUntil)}</b></span></p>` : ""}
        <div class="mx-actions">${T.email ? `<a class="btn primary" href="mailto:${esc(T.email)}">${ICON.mail} Email the team</a>` : ""}${socials}</div>
        ${team ? `<div class="mx-team"><p><b>Team member?</b> Visitors see this page. You can still look around in this tab, or turn maintenance mode off in the editor.</p><div><button class="btn sm" type="button" data-mx-bypass>View the site anyway</button><a class="btn sm" href="${url("editor.html")}">Open the Team editor</a></div></div>` : ""}
      </div>`;
    document.body.append(main);
    $("[data-mx-bypass]", main)?.addEventListener("click", () => { try { sessionStorage.setItem("ss-mx-bypass", "1"); } catch {} location.reload(); });
    document.title = `${k.maintenanceTitle || CONTROL_DEFAULTS.maintenanceTitle} · ${T.name || "Steel Surge"}`;
  }

  /** Small pill so a team member who skipped the maintenance page remembers it's on. */
  function renderMaintenancePill(c) {
    if (!controls(c).maintenance || !mxBypassed() || PAGE === "editor") return;
    const pill = document.createElement("div"); pill.className = "preview-pill mx-pill";
    pill.innerHTML = `<span>Maintenance mode is on. Visitors see the maintenance page.</span><button type="button">Show it</button>`;
    $("button", pill).addEventListener("click", () => { try { sessionStorage.removeItem("ss-mx-bypass"); } catch {} location.reload(); });
    document.body.append(pill);
  }

  const CLOSED_NAMES = { arcade: "The Arcade", calculator: "Match tools", codelab: "The Code Lab", media: "The Media page", trophies: "The trophy case" };
  function renderClosed(key) {
    const main = $("main"); if (!main) return;
    main.innerHTML = `<section class="section"><div class="wrap"><div class="closed-card reveal">${ICON.alert}<h1>${CLOSED_NAMES[key]} is taking a break</h1><p>The team has switched this part of the site off for now. Check back soon!</p><a class="btn primary" href="${url("index.html")}">Back to the home page</a></div></div></section>`;
    document.title = `${CLOSED_NAMES[key]} is taking a break · Steel Surge`;
  }

  /** Outreach hours: this season's logged hours if the log has any, else the number typed in the editor, else all logged hours. */
  function outreachStat(c) {
    const o = c.outreach || {}, ev = (o.events || []).filter((e) => e && Number(e.hours) > 0);
    const start = `${currentSeason()}-09-01`, now = ev.filter((e) => String(e.date || "") >= start);
    const sum = (l) => String(Math.round(l.reduce((t, e) => t + Number(e.hours), 0) * 10) / 10);
    if (now.length) return { hours: sum(now), label: `outreach hours in ${seasonLabel(currentSeason())}` };
    if (o.hours) return { hours: String(o.hours), label: o.label || "Community outreach" };
    if (ev.length) return { hours: sum(ev), label: "outreach hours logged" };
    return null;
  }

  /** "Back to top" button on long pages. It appears after scrolling down a couple of screens. */
  function initToTop() {
    if (PAGE === "editor" || PAGE.startsWith("game-")) return;
    const btn = document.createElement("button");
    btn.className = "to-top"; btn.type = "button"; btn.setAttribute("aria-label", "Back to top"); btn.title = "Back to top";
    btn.innerHTML = ICON.arrow.replace("<svg", '<svg width="20" height="20" style="transform:rotate(-90deg)"');
    btn.addEventListener("click", () => { scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); $("#main")?.focus?.({ preventScroll: true }); });
    document.body.append(btn);
    let on = false;
    const check = () => { const want = scrollY > innerHeight * 1.5; if (want !== on) { on = want; btn.classList.toggle("show", on); } };
    addEventListener("scroll", check, { passive: true }); check();
  }

  /** Hide links and sections that point at switched-off features. */
  function applySwitches(c) {
    const k = controls(c), hide = (el) => el && (el.hidden = true);
    if (!k.arcade) { hide($("#home-games")?.closest("section")); $$('main a[href*="arcade"]').forEach(hide); }
    if (!k.media) { hide($("#latest-videos")?.closest("section")); $$('main a[href*="media.html"]').forEach(hide); }
    if (!k.calculator) $$('main a[href*="calculator.html"]').forEach(hide);
    if (!k.codelab) { $$('main a[href*="codelab.html"]').forEach(hide); $$(".codelab-band").forEach((b) => { const sec = b.closest("section"); if (sec) sec.hidden = true; }); }
    if (!k.trophies) $$('a[href*="trophies.html"]').forEach(hide);
    if (!k.steelAI) $$("[data-ai-ask]").forEach(hide);
    if (!k.contactForm && PAGE === "contact") {
      const form = $("#contact-form");
      if (form) {
        form.hidden = true;
        form.insertAdjacentHTML("beforebegin", `<div class="card form form-off">${ICON.mail}<div><h2>Email us instead</h2><p class="muted">Our contact form is switched off for now. Email the team at <a href="mailto:${esc(c.team.email)}">${esc(c.team.email)}</a> and we'll get back to you.</p></div></div>`);
      }
    }
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal(scope = document) {
    const els = $$(".reveal:not(.in)", scope);
    if (reducedMotion || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach((e, i) => { e.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`; io.observe(e); });
  }

  /* ---------------- Count-up numbers ---------------- */
  function countUp(el, to, { decimals = 0, dur = 1100 } = {}) {
    if (reducedMotion || !isFinite(to)) { el.textContent = Number(to).toFixed(decimals); return; }
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * e).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- Shared fragments ---------------- */
  const sourceLine = (ftc) => ftc
    ? `<div class="data-source"><span class="live-dot${ftc.stale ? " stale" : ""}"></span>${ftc.stale ? "Showing saved data — FTCScout is unreachable right now" : `Live from FTCScout · updated ${ago(ftc.fetchedAt)}`}</div>`
    : `<div class="data-source"><span class="live-dot stale"></span>Live stats are temporarily unavailable.</div>`;

  /** Team-journey numbers, all automatic: seasons, events, matches, members (and awards on the Competition page). */
  function journeyStats(c, ftc, withAwards = false) {
    const s = summarize(ftc);
    const seasons = s ? s.seasonsCompeted : 0, events = s ? s.totalEvents : 0, matches = s ? s.totalMatches : 0;
    const awards = (ftc?.awards || []).length + (c.achievements || []).filter((a) => a.icon === "award").length;
    const tile = (label, value, note) => `<div class="stat"><dt>${label}</dt><dd data-count="${value}">0</dd><div class="stat-note">${note}</div></div>`;
    return `<dl class="stats">
        ${tile("Seasons", seasons, `Competing since ${esc(c.team.rookieYear)}`)}
        ${tile("Events", events, "Scrimmages, qualifiers, and more")}
        ${tile("Matches played", matches, "Qualification matches")}
        ${withAwards ? tile("Awards", awards, awards ? "Judged and match awards" : "Our first is on the way") : outreachStat(c) ? `<div class="stat"><dt>Outreach</dt><dd>${esc(outreachStat(c).hours)}<small>hrs</small></dd><div class="stat-note">${esc(outreachStat(c).label)}</div></div>` : tile("Team members", c.members.length, "Middle and high school students")}
      </dl>${sourceLine(ftc)}`;
  }

  function runCounts(scope) {
    $$("[data-count]", scope).forEach((el) => {
      const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { countUp(el, parseFloat(el.dataset.count), { decimals: +el.dataset.dec || 0 }); io.disconnect(); } });
      io.observe(el);
    });
  }

  function eventRow(e, showRecords = false) {
    const d = parseDate(e.start);
    const place = [e.venue, [e.city, e.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
    const KINDS = { Scrimmage: "Scrimmage", LeagueMeet: "League meet", Qualifier: "Qualifier", LeagueTournament: "League tournament", SuperQualifier: "Super qualifier", Championship: "Championship", FIRSTChampionship: "FIRST Championship", OffSeason: "Off-season", NonAdvancement: "Scrimmage" };
    const kind = KINDS[e.type] || "";
    const link = `<a class="link-arrow" href="https://ftcscout.org/events/${esc(e.season)}/${esc(e.code)}" target="_blank" rel="noopener" aria-label="View ${esc(e.name)} on FTCScout">Results ${ICON.ext}</a>`;
    return `
      <article class="event reveal">
        <div class="event-date">${d ? `<b>${d.getDate()}</b><span>${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}</span>` : "<b>—</b>"}</div>
        <div><h3>${esc(e.name)}</h3><p>${esc(place)}${kind ? ` · ${esc(kind)}` : ""}</p></div>
        <div class="event-result">
          ${showRecords ? `<div><b>${e.rank ? "#" + e.rank : "—"}</b><span>Rank</span></div><div><b>${e.wins}-${e.losses}-${e.ties}</b><span>W-L-T</span></div>` : `<div><b>${e.played || e.wins + e.losses + e.ties}</b><span>Matches</span></div>`}
          <div>${link}</div>
        </div>
      </article>`;
  }

  /* ---------------- Video cards + lightbox ---------------- */
  let videosPromise;
  /** Newest uploads (auto-refreshed daily into content/videos.json by a GitHub Action). */
  function loadVideos() {
    videosPromise ||= fetch(url("content/videos.json"), { cache: "no-cache" }).then((r) => (r.ok ? r.json() : { videos: [] })).then((j) => j.videos || []).catch(() => []);
    return videosPromise;
  }
  const cleanTitle = (t) => String(t || "").replace(/\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+/gu, "").trim().replace(/steel ?surge/gi, "Steel Surge").replace(/^./, (ch) => ch.toUpperCase());
  /** Accepts a bare video ID or any YouTube link (watch?v=, youtu.be/, shorts/, embed/). */
  const ytId = (s) => { s = String(s || "").trim(); const m = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/); return m ? m[1] : s; };
  function videoCard(v, big = false) {
    const id = ytId(v.id), short = !!v.short || /shorts\//.test(String(v.id));
    const src = `https://i.ytimg.com/vi/${esc(id)}/${big && !short ? "maxresdefault" : "hqdefault"}.jpg`;
    const img = `<img src="${src}" onerror="if(!this.dataset.f){this.dataset.f=1;this.src='https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg'}" alt="" loading="lazy" decoding="async">`;
    // Shorts are vertical: show the real frame sharp in the middle over a soft, blurred copy instead of black or stretched bars
    const thumb = short ? `<span class="video-thumb is-short"><span class="thumb-bg" style="background-image:url('${src}')"></span><span class="thumb-fg">${img}</span><span class="badge-short">Short</span>` : `<span class="video-thumb">${img}`;
    return `
      <button class="video-card reveal${big ? " big" : ""}" type="button" data-video="${esc(id)}" data-title="${esc(cleanTitle(v.title))}"${short ? " data-short" : ""}>
        ${thumb}<span class="play">${ICON.play}</span></span>
        <span class="video-meta"><b>${esc(cleanTitle(v.title))}</b>${v.published ? `<span>${fmtDate(String(v.published).slice(0, 10))}</span>` : ""}</span>
      </button>`;
  }
  function wireVideoCards(scope = document) {
    $$("[data-video]", scope).forEach((b) => b.addEventListener("click", () => openLightbox(b.dataset.video, b.dataset.title, b.hasAttribute("data-short"))));
  }
  function openLightbox(id, title, short = false) {
    window.SS?.track?.("video", id);
    let dlg = $("#lightbox");
    if (!dlg) {
      dlg = document.createElement("dialog"); dlg.id = "lightbox"; dlg.className = "lightbox";
      dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener("close", () => { dlg.innerHTML = ""; });
      document.body.append(dlg);
    }
    dlg.classList.toggle("is-short", short);
    dlg.innerHTML = `<div class="lightbox-inner"><div class="lightbox-head"><b>${esc(title)}</b><button class="icon-btn" type="button" aria-label="Close video">${ICON.close}</button></div>
      <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div></div>`;
    $("button", dlg).addEventListener("click", () => dlg.close());
    dlg.showModal();
  }
  const updateCard = (u) => `<article class="update reveal">${u.date ? `<time datetime="${esc(u.date)}">${fmtDate(u.date)}</time>` : '<span class="tag">Build log</span>'}<h3>${esc(u.title)}</h3><p>${esc(u.body)}</p></article>`;
  const sortUpdates = (list) => [...(list || [])].map((u, i) => ({ u, i })).sort((a, b) => String(b.u.date || "").localeCompare(String(a.u.date || "")) || a.i - b.i).map((x) => x.u);

  /* ---------------- Video embed (click to load, privacy-friendly) ---------------- */
  function videoEmbed(channelId, title = "Latest from our channel") {
    const list = channelId ? "UU" + channelId.slice(2) : "";
    return `
      <div class="video-frame">
        <button class="video-poster" type="button" data-list="${esc(list)}" aria-label="Play our latest videos">
          <span class="play">${ICON.play}</span>
          <span class="caption"><b>${esc(title)}</b><span>Plays our newest uploads automatically</span></span>
        </button>
      </div>`;
  }
  function wireVideos(scope = document) {
    $$(".video-poster", scope).forEach((btn) => btn.addEventListener("click", () => {
      window.SS?.track?.("video", btn.dataset.list);
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(btn.dataset.list)}&autoplay=1&rel=0`;
      f.title = "Steel Surge on YouTube"; f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true;
      btn.replaceWith(f);
    }));
  }

  /* ---------------- Hero canvas: current running through a circuit grid ---------------- */
  function heroCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr, cell, sparks = [], raf, visible = true, colors;
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      colors = { line: cs.getPropertyValue("--line").trim(), surge: cs.getPropertyValue("--surge").trim(), amber: cs.getPropertyValue("--amber").trim() };
    };
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = w < 700 ? 36 : 48;
    };
    const spawn = (x, y) => {
      const gx = Math.round((x ?? Math.random() * w) / cell) * cell, gy = Math.round((y ?? Math.random() * h) / cell) * cell;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const [dx, dy] = dirs[(Math.random() * 4) | 0];
      sparks.push({ x: gx, y: gy, dx, dy, trail: [[gx, gy]], life: 1, speed: 2.2 + Math.random() * 2.4, amber: Math.random() < 0.12, turns: 0 });
    };
    const drawGrid = () => {
      ctx.strokeStyle = colors.line; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x <= w; x += cell) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      for (let y = 0; y <= h; y += cell) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = colors.line;
      for (let x = 0; x <= w; x += cell * 2) for (let y = 0; y <= h; y += cell * 2) ctx.fillRect(x - 1, y - 1, 3, 3);
    };
    const frame = () => {
      ctx.clearRect(0, 0, w, h); drawGrid();
      const od = document.documentElement.classList.contains("overdrive");
      if (sparks.length < (w < 700 ? 7 : 14) * (od ? 3 : 1) && Math.random() < (od ? 0.4 : 0.08)) spawn();
      for (const s of sparks) {
        s.x += s.dx * s.speed; s.y += s.dy * s.speed;
        if (Math.abs(s.x % cell) < s.speed && Math.abs(s.y % cell) < s.speed && Math.random() < 0.18) {
          s.x = Math.round(s.x / cell) * cell; s.y = Math.round(s.y / cell) * cell; s.trail.push([s.x, s.y]);
          if (s.dx) { s.dy = Math.random() < 0.5 ? 1 : -1; s.dx = 0; } else { s.dx = Math.random() < 0.5 ? 1 : -1; s.dy = 0; }
          s.turns++;
        }
        if (s.turns > 5 || s.x < -cell || s.x > w + cell || s.y < -cell || s.y > h + cell) s.life -= 0.03;
        const pts = [...s.trail, [s.x, s.y]].slice(-6);
        const col = s.amber ? colors.amber : colors.surge;
        ctx.save(); ctx.globalAlpha = Math.max(0, s.life) * 0.85; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      sparks = sparks.filter((s) => s.life > 0);
      if (visible) raf = requestAnimationFrame(frame);
    };
    readColors(); resize();
    addEventListener("resize", resize);
    addEventListener("ss:theme", () => requestAnimationFrame(readColors));
    if (reducedMotion) { drawGrid(); return; }
    let lastSpawn = 0;
    canvas.parentElement.addEventListener("pointermove", (e) => {
      const now = performance.now(); if (now - lastSpawn < 140 || sparks.length > 22) return; lastSpawn = now;
      const r = canvas.getBoundingClientRect(); spawn(e.clientX - r.left, e.clientY - r.top);
    });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } }).observe(canvas);
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } });
    for (let i = 0; i < 6; i++) spawn();
    raf = requestAnimationFrame(frame);
  }

  /* ---------------- Arcade metadata (shared with arcade + home) ---------------- */
  const GAMES = [
    { id: "overclock", title: "Overclock", genre: "Action · Reflex", blurb: "Hold to boost through the factory, but every second at full power builds heat. Push too hard and you'll stall out.", controls: "Hold Space / tap & hold" },
    { id: "gridlock", title: "Gridlock", genre: "Puzzle · 40 levels", blurb: "Every robot moves at once. Slide them all onto their charging pads with as few moves as you can.", controls: "Arrow keys / swipe" },
    { id: "echo", title: "Echo", genre: "Puzzle · Time loop", blurb: "Your last run comes back as a ghost robot. Team up with your past self to hold down plates and open doors.", controls: "Arrows / on-screen pad" },
    { id: "pitcrew", title: "Pit Crew", genre: "Arcade · Reflex", blurb: "Robots roll into the pit between matches with broken parts. Grab the right tool fast, because the line never stops.", controls: "Keys 1–4 / tap tools" },
    { id: "autonomous", title: "Autonomous", genre: "Puzzle · 18 levels", blurb: "Program a 30-second autonomous routine with command blocks, then watch your robot run it. Score every sample.", controls: "Click blocks / tap" },
    { id: "signal", title: "Signal Lost", genre: "Stealth · Endless", blurb: "Lost in a dark factory. Ping to see the walls, but every ping wakes the security drones.", controls: "Arrows + Space / touch" },
    { id: "flywheel", title: "Flywheel", genre: "Arcade · Aim", blurb: "Tune the hood angle and flywheel speed, then launch pollen into a moving hive. Mind the wind.", controls: "Arrows + Space / sliders" },
    { id: "mecanum", title: "Mecanum Rush", genre: "Racing · 8 courses", blurb: "Drive, strafe, and spin a mecanum robot through the gates. Race your own ghost for gold.", controls: "WASD + arrows / touch" },
    { id: "wireup", title: "Wire Up", genre: "Puzzle · Endless", blurb: "Rotate wire tiles until the battery powers every motor. Endless circuits, from 4×4 to 11×11.", controls: "Click / tap tiles" },
    { id: "stackup", title: "Stack Up", genre: "Timing · Endless", blurb: "Drop game pieces from a sweeping linear slide. Overhangs get trimmed, so every drop counts. How high can you build?", controls: "Space / tap" },
    { id: "balance", title: "Balance", genre: "Physics · Survival", blurb: "Keep a balancing platform level while game pieces rain down. Collect them before they slide off the ends.", controls: "Arrows / drag" },
    { id: "odometry", title: "Odometry", genre: "Memory · Endless", blurb: "Watch the robot drive a route, then drive it from memory. Every route you finish gets one step longer.", controls: "Arrows / swipe" },
    { id: "kilovolt", title: "Kilovolt", genre: "Trivia · Daily", blurb: "Name real FTC teams that fit each prompt. Famous answers are a Spark; deep cuts are a Full Surge. New prompts every day.", controls: "Type answers" },
  ];
  const bestFor = (id) => store.get(`ss-arcade-${id}`, null);

  function gameArt(id) {
    // Lightweight SVG thumbnails — no images to load.
    const bg = `<rect width="320" height="200" fill="#070a0e"/><g stroke="#16202b" stroke-width="1">${Array.from({ length: 21 }, (_, i) => `<path d="M${i * 16} 0V200"/>`).join("")}${Array.from({ length: 13 }, (_, i) => `<path d="M0 ${i * 16}H320"/>`).join("")}</g>`;
    const bot = (x, y, c = "#3ba8ff", s = 1, o = 1) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}"><rect x="-13" y="-13" width="26" height="26" rx="7" fill="#1b2633" stroke="${c}" stroke-width="2.5"/><rect x="-7" y="-4" width="14" height="6" rx="3" fill="${c}"/></g>`;
    if (id === "overclock") return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}
      <rect x="0" y="150" width="320" height="50" fill="#0e151d"/><path d="M0 150H320" stroke="#2d3b4c" stroke-width="2"/>
      <g fill="#2d3b4c"><rect x="190" y="112" width="18" height="38" rx="3"/><rect x="262" y="80" width="18" height="70" rx="3"/></g>
      <g stroke="#3ba8ff" stroke-width="3" stroke-linecap="round" opacity=".7"><path d="M40 128H90"/><path d="M30 138H82" opacity=".5"/><path d="M50 118H86" opacity=".4"/></g>
      ${bot(112, 132, "#3ba8ff", 1.2)}
      <rect x="20" y="18" width="120" height="10" rx="5" fill="#16202b"/><rect x="20" y="18" width="88" height="10" rx="5" fill="url(#heat)"/>
      <defs><linearGradient id="heat"><stop offset="0" stop-color="#3ba8ff"/><stop offset=".7" stop-color="#ffb547"/><stop offset="1" stop-color="#ff6b6b"/></linearGradient></defs>
      <text x="20" y="46" fill="#67768a" font-family="JetBrains Mono, monospace" font-size="10">HEAT 73%</text></svg>`;
    if (id === "gridlock") {
      const walls = [[2, 1], [3, 1], [6, 3], [6, 4], [1, 4], [8, 2]].map(([x, y]) => `<rect x="${40 + x * 26}" y="${22 + y * 26}" width="26" height="26" fill="#2d3b4c" rx="3"/>`).join("");
      const pads = [[5, 1], [2, 5], [8, 5]].map(([x, y]) => `<rect x="${44 + x * 26}" y="${26 + y * 26}" width="18" height="18" rx="5" fill="none" stroke="#3ddc97" stroke-width="2" stroke-dasharray="4 3"/>`).join("");
      return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}<rect x="40" y="22" width="234" height="156" rx="6" fill="#0d1219" stroke="#212c39"/>${walls}${pads}
        ${bot(40 + 3 * 26 + 13, 22 + 3 * 26 + 13, "#3ba8ff", .75)}${bot(40 + 1 * 26 + 13, 22 + 2 * 26 + 13, "#ffb547", .75)}${bot(40 + 7 * 26 + 13, 22 + 4 * 26 + 13, "#c38bff", .75)}
        <g stroke="#3ba8ff" stroke-width="2" opacity=".5" stroke-dasharray="3 4"><path d="M131 100H170"/><path d="M79 87H118"/><path d="M235 126H262"/></g></svg>`;
    }
    if (id === "pitcrew") return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}
      <rect x="40" y="130" width="240" height="14" rx="4" fill="#1a2431"/><rect x="60" y="144" width="10" height="40" fill="#1a2431"/><rect x="250" y="144" width="10" height="40" fill="#1a2431"/>
      ${bot(160, 104, "#3ba8ff", 1.9)}
      <circle cx="196" cy="88" r="11" fill="#ff5d5d"/><path d="M196 82v7M196 93v.5" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="122" cy="122" r="11" fill="#ffb547"/><path d="M118 122h8" stroke="#1d1300" stroke-width="2.5" stroke-linecap="round"/>
      <g transform="translate(36 24)">${[0, 1, 2, 3].map((i) => `<rect x="${i * 64}" y="0" width="52" height="34" rx="8" fill="#121922" stroke="${i === 1 ? "#3ba8ff" : "#2d3b4c"}"/><text x="${i * 64 + 26}" y="22" text-anchor="middle" fill="#97a4b4" font-family="JetBrains Mono, monospace" font-size="11">${i + 1}</text>`).join("")}</g>
      <rect x="40" y="186" width="240" height="6" rx="3" fill="#16202b"/><rect x="40" y="186" width="150" height="6" rx="3" fill="#3ddc97"/></svg>`;
    if (id === "autonomous") return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}
      <rect x="20" y="20" width="150" height="150" rx="6" fill="#0d1219" stroke="#212c39"/>
      <g stroke="#16202b">${[1, 2, 3, 4].map((i) => `<path d="M${20 + i * 30} 20V170M20 ${20 + i * 30}H170"/>`).join("")}</g>
      <rect x="140" y="20" width="30" height="30" fill="rgba(61,220,151,.15)" stroke="#3ddc97" stroke-width="2"/>
      <circle cx="95" cy="65" r="8" fill="#ffb547"/><circle cx="125" cy="125" r="8" fill="#ffb547"/>
      <path d="M35 155V95H95" stroke="#3ba8ff" stroke-width="2" fill="none" stroke-dasharray="4 4" opacity=".7"/>
      ${bot(35, 155, "#3ba8ff", .7)}
      ${["FORWARD ×3", "TURN RIGHT", "FORWARD ×2", "GRAB", "TURN LEFT"].map((t, i) => `<rect x="190" y="${24 + i * 30}" width="112" height="24" rx="6" fill="${i === 3 ? "#2a2010" : "#121b26"}" stroke="${i === 3 ? "#ffb547" : "#2d3b4c"}"/><text x="200" y="${40 + i * 30}" fill="${i === 3 ? "#ffb547" : "#97a4b4"}" font-family="JetBrains Mono, monospace" font-size="10">${t}</text>`).join("")}</svg>`;
    if (id === "flywheel") return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}
      <path d="M0 170H320" stroke="#2d3b4c" stroke-width="2"/>
      <path d="M70 140 Q160 10 250 92" stroke="#ffb547" stroke-width="2" fill="none" stroke-dasharray="5 6" opacity=".8"/>
      <circle cx="205" cy="54" r="8" fill="#ffb547"/>
      <g transform="translate(262 100)"><path d="M-26 -20h52l-8 44h-36z" fill="#2a2010" stroke="#ffb547" stroke-width="2.5"/><path d="M-20 -8h40M-18 4h36" stroke="#ffb547" stroke-width="1.5" opacity=".6"/></g>
      ${bot(62, 150, "#3ba8ff", 1)}<g transform="translate(76 134) rotate(-40)"><rect x="0" y="-5" width="30" height="10" rx="3" fill="#4a5b70"/></g>
      <text x="20" y="34" fill="#67768a" font-family="JetBrains Mono, monospace" font-size="10">HOOD 52°  ·  4800 RPM</text></svg>`;
    if (id === "mecanum") return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}
      <path d="M40 170 C 80 40, 160 180, 210 70 S 290 60, 290 30" stroke="#2d3b4c" stroke-width="34" fill="none" stroke-linecap="round" opacity=".6"/>
      <g stroke="#3ba8ff" stroke-width="3"><path d="M120 92v28"/><path d="M182 104h26" opacity=".4"/></g>
      ${[[96, 84], [144, 132], [196, 46], [236, 104], [262, 70]].map(([x, y]) => `<path d="M${x} ${y - 7}l6 12h-12z" fill="#ff8a3d"/>`).join("")}
      <g transform="translate(90 132) rotate(-35)"><rect x="-16" y="-14" width="32" height="28" rx="6" fill="#1b2633" stroke="#3ba8ff" stroke-width="2.5"/>${[[-20, -12], [12, -12], [-20, 4], [12, 4]].map(([x, y]) => `<rect x="${x}" y="${y}" width="8" height="10" rx="2" fill="#4a5b70"/>`).join("")}</g>
      <g transform="translate(70 152) rotate(-35)" opacity=".3"><rect x="-16" y="-14" width="32" height="28" rx="6" fill="none" stroke="#84cdff" stroke-width="2"/></g></svg>`;
    if (id === "wireup") return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}
      <g transform="translate(70 20)">${Array.from({ length: 20 }, (_, i) => `<rect x="${(i % 5) * 36}" y="${Math.floor(i / 5) * 36}" width="34" height="34" rx="6" fill="#0f1720" stroke="#1c2733"/>`).join("")}
        <path d="M17 17H89V53H125V89H161" stroke="#3ba8ff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M53 17V125M89 89V125" stroke="#2d3b4c" stroke-width="5" fill="none" stroke-linecap="round"/>
        <rect x="6" y="6" width="22" height="22" rx="5" fill="#3ddc97"/><text x="17" y="21" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#04121f">+</text>
        <circle cx="161" cy="89" r="11" fill="#1b2633" stroke="#3ba8ff" stroke-width="3"/><circle cx="53" cy="125" r="11" fill="#1b2633" stroke="#4a5b70" stroke-width="3"/><circle cx="89" cy="125" r="11" fill="#1b2633" stroke="#4a5b70" stroke-width="3"/></g></svg>`;
    if (id === "stackup") {
      const rows = [[110, 100], [104, 96], [104, 96], [98, 90], [100, 84], [96, 80], [98, 72]];
      const cols = ["#3ba8ff", "#ffb547", "#c38bff", "#3ddc97", "#ff8a3d", "#3ba8ff", "#ffb547"];
      return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}
      <path d="M0 176H320" stroke="#2d3b4c" stroke-width="2"/>${bot(160, 186, "#3ba8ff", 1.3)}
      ${rows.map(([x, w], i) => `<g><rect x="${x}" y="${158 - i * 16}" width="${w}" height="14" rx="4" fill="#2a3a4e"/><rect x="${x}" y="${158 - i * 16}" width="${w}" height="4" rx="2" fill="${cols[i]}"/></g>`).join("")}
      <rect x="40" y="22" width="240" height="8" rx="4" fill="#1b2633" stroke="#2d3b4c"/><rect x="186" y="18" width="30" height="16" rx="5" fill="#3ba8ff"/>
      <path d="M192 34l-4 18M210 34l4 18" stroke="#4a5b70" stroke-width="2.5"/><rect x="170" y="52" width="72" height="14" rx="4" fill="#2a3a4e"/><rect x="170" y="52" width="72" height="4" rx="2" fill="#c38bff"/>
      <rect x="160" y="66" width="10" height="14" rx="3" fill="#c38bff" opacity=".5" transform="rotate(18 165 73)"/></svg>`;
    }
    if (id === "balance") return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}
      <path d="M160 128 128 180H192Z" fill="#1b2633" stroke="#4a5b70" stroke-width="2"/><path d="M0 180H320" stroke="#2d3b4c" stroke-width="2"/>
      <g transform="rotate(-8 160 128)"><rect x="56" y="122" width="208" height="10" rx="4" fill="#2a3a4e" stroke="#4a5b70" stroke-width="1.5"/><rect x="56" y="122" width="6" height="10" fill="#ff5d5d"/><rect x="258" y="122" width="6" height="10" fill="#3ba8ff"/>
      ${bot(120, 108, "#3ba8ff", .9)}<circle cx="214" cy="114" r="8" fill="#ffb547"/><rect x="232" y="104" width="18" height="18" rx="4" fill="#ff5d5d"/></g>
      <circle cx="96" cy="46" r="7" fill="#ffb547"/><path d="M96 24l-5-7h10z" fill="#ffb547" opacity=".6"/><circle cx="190" cy="66" r="9" fill="#3ba8ff"/>
      <path d="M130 30a40 40 0 0 1 60 0" stroke="#1d2a39" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M160 32l-8-14" stroke="#ffb547" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    if (id === "odometry") {
      const T = 26, ox = 82, oy = 22, c = (x, y) => [ox + x * T + T / 2, oy + y * T + T / 2];
      const route = [[0, 5], [1, 5], [2, 5], [2, 4], [2, 3], [3, 3], [4, 3], [4, 2], [4, 1], [5, 1]];
      return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}
      ${Array.from({ length: 36 }, (_, i) => `<rect x="${ox + (i % 6) * T + 1}" y="${oy + Math.floor(i / 6) * T + 1}" width="${T - 2}" height="${T - 2}" rx="4" fill="${(i + Math.floor(i / 6)) % 2 ? "#141c26" : "#111821"}"/>`).join("")}
      <path d="M${route.slice(0, 7).map(([x, y]) => c(x, y).join(" ")).join(" L")}" stroke="#ffb547" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
      <path d="M${route.slice(6).map(([x, y]) => c(x, y).join(" ")).join(" L")}" stroke="#ffb547" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".25" stroke-dasharray="4 6"/>
      <rect x="${ox + 3}" y="${oy + 5 * T + 3}" width="${T - 6}" height="${T - 6}" rx="5" fill="none" stroke="#3ddc97" stroke-width="2" stroke-dasharray="4 3"/>
      ${bot(...c(4, 3), "#ffb547", .7)}
      <text x="250" y="40" fill="#67768a" font-family="JetBrains Mono, monospace" font-size="10">ROUTE</text><text x="250" y="62" fill="#e9eef4" font-family="Space Grotesk, sans-serif" font-size="22" font-weight="700">9</text></svg>`;
    }
    if (id === "kilovolt") return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}
      <rect x="22" y="24" width="214" height="152" rx="12" fill="#0d141c" stroke="#2d3b4c"/>
      <text x="38" y="52" fill="#3ba8ff" font-family="JetBrains Mono, monospace" font-size="9" letter-spacing="1.5">DAILY CHARGE · 3 / 7</text>
      <text x="38" y="80" fill="#e9eef4" font-family="Space Grotesk, sans-serif" font-size="15" font-weight="700">Name an FTC team</text>
      <text x="38" y="98" fill="#e9eef4" font-family="Space Grotesk, sans-serif" font-size="15" font-weight="700">from Pennsylvania.</text>
      <rect x="38" y="114" width="182" height="26" rx="7" fill="#070a0e" stroke="#3ba8ff"/><text x="48" y="131" fill="#e9eef4" font-family="Inter, sans-serif" font-size="11">Steel Hornets|</text>
      <rect x="38" y="148" width="84" height="18" rx="6" fill="rgba(195,139,255,.15)" stroke="#c38bff"/><text x="46" y="161" fill="#c38bff" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700">OVERLOAD +850 V</text>
      <rect x="262" y="30" width="30" height="146" rx="15" fill="#0d141c" stroke="#2d3b4c"/><rect x="262" y="88" width="30" height="88" rx="15" fill="url(#kvg)"/>
      <defs><linearGradient id="kvg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1e6fe0"/><stop offset=".6" stop-color="#3ba8ff"/><stop offset="1" stop-color="#ffd166"/></linearGradient></defs>
      <path d="M281 52l-9 14h7l-3 12 10-15h-7z" fill="#ffd166"/></svg>`;
    if (id === "signal") return `<svg viewBox="0 0 320 200" aria-hidden="true"><rect width="320" height="200" fill="#04060a"/>
      <g fill="none" stroke="#3ba8ff" stroke-width="2"><circle cx="150" cy="110" r="46" opacity=".55"/><circle cx="150" cy="110" r="80" opacity=".2"/></g>
      <g stroke="#3a5672" stroke-width="5" stroke-linecap="square" opacity=".9"><path d="M110 70H200M110 70V150M200 70V110M150 110H200M110 150H170"/></g>
      ${bot(150, 128, "#3ba8ff", .7)}
      <g transform="translate(250 60)"><circle r="10" fill="#1a0f12" stroke="#ff5d5d" stroke-width="2"/><circle r="3" fill="#ff5d5d"/></g>
      <g transform="translate(60 160)" opacity=".5"><circle r="10" fill="#1a0f12" stroke="#ff5d5d" stroke-width="2"/><circle r="3" fill="#ff5d5d"/></g>
      <path d="M262 168l8-8 8 8-8 8z" fill="#ffb547"/></svg>`;
    return `<svg viewBox="0 0 320 200" aria-hidden="true">${bg}
      <path d="M30 160H290" stroke="#2d3b4c" stroke-width="2"/><rect x="200" y="60" width="14" height="100" fill="#2d3b4c" rx="3"/>
      <rect x="196" y="58" width="22" height="104" rx="4" fill="none" stroke="#ffb547" stroke-width="1.5" stroke-dasharray="5 4" opacity=".8"/>
      <rect x="120" y="154" width="36" height="6" rx="3" fill="#ffb547"/>
      <path d="M70 140 Q100 110 138 140" stroke="#84cdff" stroke-width="2" fill="none" stroke-dasharray="4 5" opacity=".6"/>
      ${bot(138, 140, "#84cdff", 1, .45)}${bot(250, 140, "#3ba8ff", 1)}
      <circle cx="275" cy="80" r="11" fill="none" stroke="#3ddc97" stroke-width="2.5"/><circle cx="275" cy="80" r="4" fill="#3ddc97"/>
      <text x="22" y="34" fill="#67768a" font-family="JetBrains Mono, monospace" font-size="10">LOOP 2 · ECHO ×1</text></svg>`;
  }

  function gameCards(limit, pick) {
    const chosen = (pick || []).map((id) => GAMES.find((g) => g.id === id)).filter(Boolean);
    const list = chosen.length ? [...new Set([...chosen, ...GAMES])].slice(0, limit) : GAMES.slice(0, limit || GAMES.length);
    return list.map((g) => {
      const b = bestFor(g.id);
      return `
        <a class="game-card reveal" href="${url(`arcade/${g.id}.html`)}">
          <div class="game-art">${gameArt(g.id)}</div>
          <div class="game-body">
            <span class="tag">${esc(g.genre)}</span>
            <h3>${esc(g.title)}</h3>
            <p>${esc(g.blurb)}</p>
            <div class="game-meta"><span>${b ? `Your best: <b>${esc(b.label)}</b>` : esc(g.controls)}</span><span class="play-pill">Play ${ICON.arrow.replace("<svg", '<svg width="16" height="16"')}</span></div>
          </div>
        </a>`;
    }).join("");
  }

  /* ======================================================================
     Pages
     ====================================================================== */
  const pages = {};

  const daysUntil = (d) => Math.round((parseDate(d) - new Date(new Date().toDateString())) / 86400000);
  const nextLabel = (e) => { const n = daysUntil(e.start); return n <= 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`; };
  function nextEventCard(e) {
    if (!e) return "";
    const place = [e.venue, [e.city, e.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
    return `<div class="next-event reveal"><span class="tag ok">Up next · ${esc(nextLabel(e))}</span><h3>${esc(e.name)}</h3><p>${fmtDate(e.start)}${place ? ` · ${esc(place)}` : ""}</p><a class="link-arrow" href="https://ftcscout.org/events/${esc(e.season)}/${esc(e.code)}" target="_blank" rel="noopener">Follow it live on FTCScout ${ICON.arrow}</a></div>`;
  }
  const HOME_CREWS = [
    ["gear", "Engineer", "We design every subsystem in CAD, build it, and keep improving it until it holds up in real matches.", "Mechanical"],
    ["code", "Program", "From autonomous routines to driver controls, our code turns a pile of motors into a competitor.", "Programming"],
    ["heart", "Inspire", "We run outreach, partner with local businesses, and help other students get into STEM.", "Outreach"],
  ];
  const BUILD_STEPS = [
    ["flag", "Strategy", "When FIRST reveals the new game in September, we study the rules and decide what our robot needs to do well."],
    ["pencil", "Design", "We sketch ideas, build quick prototypes, and model every part in CAD before we cut or print anything."],
    ["gear", "Build", "Our mechanical crew assembles the drivetrain and mechanisms, then rebuilds whatever breaks during testing."],
    ["code", "Program", "Our programmers write the autonomous routines and driver controls, and tune them with real practice runs."],
    ["trophy", "Compete", "We take the robot to events, learn from every match and from other teams, and come back stronger."],
  ];

  pages.home = async (c) => {
    $("#hero-lead").textContent = c.team.intro;
    const badge = $("#hero-badge");
    badge.innerHTML = `<b>FTC #${esc(c.team.number)}</b> ${seasonLabel(currentSeason())} season · ${esc(c.team.location)}`;
    $("#hero-meta").innerHTML = `
      <div><dt>Based in</dt><dd>${esc(c.team.location)}</dd></div>
      <div><dt>Founded</dt><dd>${esc(c.team.rookieYear)}</dd></div>
      <div><dt>Members</dt><dd>${c.members.filter((m) => !m.alumni).length}</dd></div>
      ${outreachStat(c) ? `<div><dt>Outreach</dt><dd>${esc(outreachStat(c).hours)} hrs</dd></div>` : ""}`;
    if (look(c).heroAnimation !== false && look(c).animations !== false) heroCanvas($(".hero-canvas")); else $(".hero-canvas")?.remove();

    const H = { ...HOME_DEFAULTS, ...(c.home?.sections || {}) };
    let pillars = HOME_CREWS;
    if (c.home?.crews?.length) pillars = c.home.crews.filter((x) => x.title).map((x, i) => [x.icon || ["gear", "code", "heart", "star"][i % 4], x.title, x.text || "", x.dept || ""]);
    $("#pillars").innerHTML = pillars.map(([i, t, d, dept]) => `
      <a class="card reveal" href="${url("team.html")}${dept ? "#" + esc(dept.toLowerCase()) : ""}"><div class="card-icon">${ICON[i] || ICON.star}</div><h3>${esc(t)}</h3><p>${esc(d)}</p><span class="link-arrow">${dept ? `Meet the ${esc(dept.toLowerCase())} crew` : "Meet the team"} ${ICON.arrow}</span></a>`).join("");
    const steps = c.home?.steps?.length ? c.home.steps.filter((x) => x.title).map((x, k) => [["flag", "pencil", "gear", "code", "trophy", "star"][k % 6], esc(x.title), esc(x.text || "")]) : BUILD_STEPS;
    $("#build-steps").innerHTML = steps.map(([i, t, d], k) => `<li class="step reveal"><span class="step-num">${String(k + 1).padStart(2, "0")}</span><div class="card-icon">${ICON[i] || ICON.star}</div><h3>${t}</h3><p>${d}</p></li>`).join("");

    // Latest videos: the newest upload is featured; the next few are listed. All automatic.
    const vids = (await loadVideos()).slice(0, 5);
    const list = vids.length ? vids : (c.featuredVideos || []);
    const host = $("#latest-videos");
    if (!list.length) { host.closest("section").hidden = true; }
    else {
      const [first, ...rest] = list;
      host.innerHTML = `<div class="latest-main">${videoCard(first, true)}</div><div class="latest-list">${rest.slice(0, 4).map((v) => videoCard(v)).join("")}</div>`;
      wireVideoCards(host);
    }

    $("#home-games").innerHTML = gameCards(3, c.home?.games);
    const names = (c.sponsors || []).map((s) => `<span>${esc(s.name)}</span>`).join("");
    $("#home-sponsors").innerHTML = names ? `<p class="marquee-label">Supported by</p><div class="marquee" aria-label="Our sponsors and partners"><div class="marquee-track">${names}${names}${names}${names}</div></div>` : "";

    // Sections the team switched off in the editor (Home page)
    const hideSec = (el) => { const s = el?.closest("section"); if (s) s.hidden = true; };
    if (!H.stats) hideSec($("#home-stats")); if (!H.crews) hideSec($("#pillars")); if (!H.build) hideSec($("#build-steps"));
    if (!H.videos) hideSec($("#latest-videos")); if (!H.arcade) hideSec($("#home-games")); if (!H.codelab) hideSec($(".codelab-band"));
    if (!H.sponsors) $("#home-sponsors")?.remove(); if (!H.cta) $("#home-cta")?.remove();
    if (!H.sponsors && !H.cta) hideSec($("#home-sponsors") || $("#home-cta"));
    if (!H.stats) return;
    const ftcHost = $("#home-stats");
    ftcHost.innerHTML = `<dl class="stats">${'<div class="stat"><dt class="skeleton">Loading</dt><dd class="skeleton">00</dd></div>'.repeat(4)}</dl>`;
    const ftc = await loadFTC(c.team.number, c.team.rookieYear);
    ftcHost.innerHTML = journeyStats(c, ftc);
    const s = summarize(ftc);
    if (s?.next) { badge.innerHTML = `<b>Up next</b> ${esc(s.next.name)} · ${fmtDate(s.next.start)}`; ftcHost.insertAdjacentHTML("afterbegin", nextEventCard(s.next)); }
    runCounts(ftcHost); initReveal(ftcHost);
  };

  pages.team = async (c) => {
    renderTimeline(c);
    if (c.team.school) $("#team-lead").textContent = `Students from ${c.team.school} who design, build, code, and promote our robot every season.`;
    const team = c.members.filter((m) => !m.alumni), alumni = c.members.filter((m) => m.alumni);
    const depts = [...new Set(team.map((m) => m.dept).filter(Boolean))];
    const bar = $("#team-filter");
    bar.innerHTML = [["all", "Everyone", team.length], ...depts.map((d) => [d.toLowerCase(), d, team.filter((m) => m.dept === d).length])]
      .map(([id, label, n]) => `<button class="chip" type="button" data-filter="${esc(id)}" aria-pressed="false">${esc(label)}<span class="count">${n}</span></button>`).join("");
    const initials = (n) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    $("#team-alumni")?.remove();
    if (alumni.length) $("#team-grid").insertAdjacentHTML("afterend", `<div class="alumni reveal" id="team-alumni"><h3>Alumni</h3><p>Past Steel Surge members. Thank you for building the team!</p><ul>${alumni
      .sort((a, b) => (Number(b.gradYear) || 0) - (Number(a.gradYear) || 0)).map((m) => `<li>${m.photo ? `<img src="${url(m.photo)}" alt="" loading="lazy" width="40" height="40" onerror="this.remove()">` : `<span class="ini">${esc((m.name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join(""))}</span>`}<span><b>${esc(m.name)}</b><small>${esc([m.role, m.gradYear ? `Class of ${m.gradYear}` : ""].filter(Boolean).join(" · "))}</small></span></li>`).join("")}</ul></div>`);
    $("#team-grid").innerHTML = team.map((m) => `
      <article class="member reveal" data-dept="${esc((m.dept || "").toLowerCase())}">
        <div class="member-photo">
          <span class="initials" aria-hidden="true">${esc(initials(m.name))}</span>
          ${m.photo ? `<img src="${url(m.photo)}" alt="${esc(m.name)}" loading="lazy" decoding="async" width="640" height="640" onerror="this.remove()">` : ""}
          ${m.dept ? `<span class="tag">${esc(m.dept)}</span>` : ""}
        </div>
        <div class="member-body"><h3>${esc(m.name)}</h3><div class="member-role">${esc(m.role)}</div><p>${esc(m.bio)}</p>${m.funFact ? `<p class="fun-fact"><b>Fun fact</b> ${esc(m.funFact)}</p>` : ""}</div>
      </article>`).join("");
    const apply = (id) => {
      $$(".chip", bar).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === id)));
      $$(".member").forEach((el) => el.classList.toggle("hidden", id !== "all" && el.dataset.dept !== id));
    };
    bar.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; apply(b.dataset.filter); if (b.dataset.filter !== "all") window.SS?.trophy?.("dept"); history.replaceState(null, "", b.dataset.filter === "all" ? location.pathname : `#${b.dataset.filter}`); });
    const fromHash = location.hash.slice(1).toLowerCase();
    apply(depts.some((d) => d.toLowerCase() === fromHash) ? fromHash : "all");

    const values = c.values || [];
    $("#values").hidden = !values.length;
    $("#values-grid").innerHTML = values.map((v, i) => `<div class="value-card reveal"><span class="value-num">0${i + 1}</span><h3>${esc(v.title)}</h3><p>${esc(v.body)}</p></div>`).join("");
    const evs = [...(c.outreach?.events || [])].filter((e) => e?.title).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    $("#outreach").hidden = !evs.length;
    if (evs.length) {
      const hrs = Math.round(evs.reduce((t, e) => t + (Number(e.hours) || 0), 0) * 10) / 10, ppl = evs.reduce((t, e) => t + (Number(e.people) || 0), 0);
      $("#outreach-summary").innerHTML = [[evs.length, evs.length === 1 ? "event" : "events"], hrs ? [hrs, "hours"] : null, ppl ? [ppl.toLocaleString(), "people reached"] : null]
        .filter(Boolean).map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("");
      $("#outreach-list").innerHTML = evs.map((e) => `
        <article class="outreach-item reveal">
          <time${e.date ? ` datetime="${esc(e.date)}"` : ""}>${e.date ? fmtDate(e.date) : ""}</time>
          <div class="oi-main"><h3>${esc(e.title)}</h3>${e.place ? `<div class="oi-place">${esc(e.place)}</div>` : ""}${e.detail ? `<p>${esc(e.detail)}</p>` : ""}</div>
          <div class="oi-meta">${Number(e.hours) ? `<span><b>${esc(e.hours)}</b> hrs</span>` : ""}${Number(e.people) ? `<span><b>${Number(e.people).toLocaleString()}</b> people</span>` : ""}</div>
        </article>`).join("");
    }
    const projects = c.projects || [];
    $("#projects").hidden = !projects.length;
    $("#projects-grid").innerHTML = projects.map((p) => `
      <article class="project-card reveal">
        ${p.image ? `<div class="project-img"><img src="${url(p.image)}" alt="${esc(p.title)}" loading="lazy" decoding="async"></div>` : ""}
        <div class="project-body"><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>
      </article>`).join("");
    $("#join-link").href = c.team.joinFormUrl;
    const mentors = c.mentors || [];
    if (mentors.length) {
      $("#mentors").hidden = false;
      $("#mentor-grid").innerHTML = mentors.map((m) => `<div class="card reveal"><div class="card-icon">${ICON.star}</div><h3>${esc(m.name)}</h3><p>${esc(m.role || "")}</p></div>`).join("");
    }
  };

  /** Team page: milestones from the editor plus official awards from FTCScout, newest first. */
  async function renderTimeline(c) {
    const tl = $("#timeline"); if (!tl) return;
    $("#results-link")?.setAttribute("href", `https://ftcscout.org/teams/${c.team.number}`);
    const draw = (awards) => {
      const items = [
        ...(c.achievements || []).map((a) => ({ date: a.date, title: a.title, detail: a.detail, kind: a.icon === "award" ? "award" : "milestone" })),
        ...awards.map((a) => ({ date: a.eventStart, title: awardName(a), detail: `Earned at ${a.eventName}.`, kind: "award" })),
      ].sort((x, y) => String(y.date).localeCompare(String(x.date)));
      $("#milestones").hidden = !items.length;
      tl.innerHTML = items.map((i) => `
        <article class="tl-item reveal ${i.kind}">
          <div class="tl-meta"><span>${fmtDate(i.date, false)}</span>${i.kind === "award" ? '<span class="tag amber">Award</span>' : ""}</div>
          <h3>${esc(i.title)}</h3>${i.detail ? `<p>${esc(i.detail)}</p>` : ""}
        </article>`).join("");
      initReveal(tl);
    };
    draw([]);
    const ftc = await loadFTC(c.team.number, c.team.rookieYear).catch(() => null);
    if (ftc?.awards?.length) draw(ftc.awards);
    // Links to #milestones (including the old Competition page) land here once it has content
    if (location.hash === "#milestones") $("#milestones").scrollIntoView({ block: "start" });
  }

  pages.media = async (c) => {
    $("#media-video").innerHTML = videoEmbed(c.team.youtubeChannelId, "Steel Surge on YouTube");
    wireVideos($("#media-video"));
    // Use the newest wide video's thumbnail as the player's backdrop
    loadVideos().then((vids) => {
      const v = vids.find((x) => !x.short) || vids[0], poster = $("#media-video .video-poster"); if (!v || !poster) return;
      const img = new Image(), id = ytId(v.id);
      img.onload = () => { if (img.naturalWidth > 200) poster.style.setProperty("--poster", `url("${img.src}")`); poster.classList.add("has-art"); };
      img.src = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${v.short ? "hqdefault" : "maxresdefault"}.jpg`;
    });
    $("#yt-link").href = `https://www.youtube.com/channel/${c.team.youtubeChannelId}?sub_confirmation=1`;
    const ig = c.team.instagram ? String(c.team.instagram).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") : "";
    if (ig) $("#ig-link").outerHTML = `<a class="btn" href="https://www.instagram.com/${esc(ig)}/" target="_blank" rel="noopener">${ICON.instagram} Follow @${esc(ig)} on Instagram</a>`;
    else $("#ig-link")?.remove();
    const ups = sortUpdates(c.updates);
    $("#updates").innerHTML = ups.length ? ups.map(updateCard).join("") : `<div class="empty-state">No updates yet. Check our YouTube channel for the latest.</div>`;
    $("#updates").closest("section").hidden = !ups.length;
    $("#socials").innerHTML = socialLinks(c).map((s) => `<a class="contact-method reveal" href="${esc(s.url)}" target="_blank" rel="noopener"><div class="card-icon">${s.icon}</div><div><b>${esc(s.label)}</b><span>${esc(s.sub)}</span></div></a>`).join("");
    const grid = $("#video-grid");
    grid.innerHTML = `<div class="video-card skeleton" style="height:220px"></div>`.repeat(3);
    let vids = await loadVideos();
    if (!vids.length) vids = c.featuredVideos || [];
    grid.innerHTML = vids.length ? vids.map((v) => videoCard(v)).join("") : `<div class="empty-state">Videos are on their way.</div>`;
    wireVideoCards(grid); initReveal(grid);
    const fav = c.featuredVideos || [];
    $("#favorites").hidden = !fav.length;
    // Fill in YouTube's own title and Short flag when we know the video, so a picks list can't show the wrong title
    const known = new Map((await loadVideos()).map((v) => [v.id, v]));
    $("#fav-grid").innerHTML = fav.map((v) => { const k = known.get(ytId(v.id)); return videoCard({ ...v, title: k?.title || v.title, short: v.short || !!k?.short }); }).join(""); wireVideoCards($("#fav-grid"));
  };

  /* ---------------- Weekly arcade challenge ----------------
     One score target a week, the same for every visitor. It changes every Monday
     (00:00 UTC) and cycles through these games. Targets scale with difficulty. */
  const WEEKLY = [
    { id: "overclock", base: 600, unit: "points", verb: "Score" },
    { id: "stackup", base: 20, unit: "pieces high", verb: "Stack" },
    { id: "pitcrew", base: 1500, unit: "points", verb: "Score" },
    { id: "flywheel", base: 300, unit: "points", verb: "Score" },
    { id: "signal", base: 2000, unit: "points", verb: "Score" },
    { id: "balance", base: 300, unit: "points", verb: "Score" },
    { id: "odometry", base: 8, unit: "steps", verb: "Remember a route of" },
  ];
  const WEEK_MS = 7 * 864e5, WEEK0 = Date.UTC(2024, 0, 1); // a Monday
  const LEVEL_SCALE = [0.5, 0.75, 1, 1.3, 1.6], LEVEL_NAMES = ["Super Easy", "Easy", "Medium", "Hard", "Extreme"];
  function weekly(now = Date.now()) {
    if (window.SS?.content && controls(window.SS.content).weekly === false) return null;
    const week = Math.floor((now - WEEK0) / WEEK_MS), w = WEEKLY[((week * 5) % WEEKLY.length + WEEKLY.length) % WEEKLY.length];
    const round = (v) => (v >= 100 ? Math.round(v / 50) * 50 : Math.max(1, Math.round(v)));
    const target = (lv = 2) => round(w.base * LEVEL_SCALE[lv] ?? 1);
    return { ...w, week, title: GAMES.find((g) => g.id === w.id)?.title || w.id, endsAt: WEEK0 + (week + 1) * WEEK_MS, target,
      text: (lv) => `${w.verb} ${target(lv).toLocaleString()} ${w.unit}`, done: store.get("ss-weekly", {})[week] || null };
  }
  /** Called by the arcade kit after every run. Returns true the first time this week's target is reached. */
  function weeklySubmit(gameId, value, lv) {
    const w = weekly(); if (!w || gameId !== w.id || w.done || !(value >= w.target(lv))) return false;
    const log = store.get("ss-weekly", {}); log[w.week] = { value, level: LEVEL_NAMES[lv], at: Date.now() }; store.set("ss-weekly", log);
    window.SS?.trophy?.("weekly");
    setTimeout(() => toast(`Weekly challenge complete: ${w.title}!`), 900);
    return true;
  }
  const savedLevel = () => { const i = LEVEL_NAMES.map((n) => n.replace(/ (.)/, (_, ch) => ch).replace(/^./, (ch) => ch.toLowerCase())).indexOf(store.get("ss-arcade-settings", {})?.difficulty); return i < 0 ? 2 : i; };
  function weeklyCard() {
    const w = weekly(); if (!w) return "";
    const lv = savedLevel(), left = Math.max(0, w.endsAt - Date.now());
    const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24;
    const ladder = LEVEL_NAMES.map((n, i) => `<li${i === lv ? ' class="on"' : ""}><span>${n}</span><b>${w.target(i).toLocaleString()}</b></li>`).join("");
    return `<section class="weekly reveal${w.done ? " done" : ""}" aria-labelledby="weekly-h">
      <a class="weekly-art" href="${url(`arcade/${w.id}.html`)}" tabindex="-1" aria-hidden="true">${gameArt(w.id)}</a>
      <div class="weekly-body">
        <span class="eyebrow">Weekly challenge · new one in ${d ? `${d}d ` : ""}${h}h</span>
        <h2 id="weekly-h">${esc(w.text(lv))} in ${esc(w.title)}</h2>
        <p>${w.done ? `${ICON.check.replace("<svg", '<svg width="18" height="18"')} Done! You reached ${Number(w.done.value).toLocaleString()} on ${esc(w.done.level)}. A new challenge starts Monday.` : `Hit the target in one run to earn the <b>Weekly Winner</b> trophy. Easier levels have lower targets.`}</p>
        <ul class="weekly-ladder" aria-label="Target by difficulty">${ladder}</ul>
        <a class="btn ${w.done ? "" : "primary"}" href="${url(`arcade/${w.id}.html`)}">${w.done ? "Play again" : "Take the challenge"} ${ICON.arrow}</a>
      </div>
    </section>`;
  }

  pages.arcade = async () => {
    $("#weekly-challenge").innerHTML = weeklyCard();
    $("#arcade-games").innerHTML = gameCards();
    const played = GAMES.filter((g) => bestFor(g.id)).length;
    $("#arcade-progress").innerHTML = `<div class="arcade-pass"><div><b>${played}/${GAMES.length}</b> games played on this device</div><div class="pass-bar"><span style="width:${(played / GAMES.length) * 100}%"></span></div><a class="link-arrow" href="${url("trophies.html")}">Your trophies ${ICON.arrow}</a></div>`;
  };

  pages.sponsors = async (c) => {
    $("#pitch").textContent = c.sponsorPitch;
    const packet = c.sponsorPacketUrl ? `<a class="btn" href="${esc(c.sponsorPacketUrl)}" target="_blank" rel="noopener">${ICON.ext} Sponsor packet</a>` : "";
    $("#sponsor-cta").innerHTML = `<a class="btn primary" href="${url("contact.html")}?reason=Sponsorship">Become a sponsor ${ICON.arrow}</a>${packet}`;
    $("#tiers").innerHTML = (c.sponsorTiers || []).map((t) => `
      <div class="tier reveal${t.featured ? " featured" : ""}">
        ${t.featured ? '<span class="tag">Top tier</span>' : ""}
        <h3>${esc(t.name)}</h3>
        <div class="tier-price">$${Number(t.amount).toLocaleString()}<small> / season</small></div>
        <ul>${(t.perks || []).map((p) => `<li>${ICON.check}<span>${esc(p)}</span></li>`).join("")}</ul>
        <a class="btn ${t.featured ? "primary" : ""}" href="${url("contact.html")}?reason=Sponsorship&tier=${encodeURIComponent(t.name)}">Choose ${esc(t.name)}</a>
      </div>`).join("") + `
      <div class="tier tier-custom reveal">
        <div><h3>In-kind or custom</h3><div class="tier-price" style="font-size:26px">Any amount</div></div>
        <ul><li>${ICON.check}<span>Donate parts, tools, or machining time</span></li><li>${ICON.check}<span>Offer mentoring or a place to build</span></li><li>${ICON.check}<span>Recognition that fits your contribution</span></li></ul>
        <a class="btn" href="${url("contact.html")}?reason=Sponsorship&tier=In-kind">Talk to us</a>
      </div>`;
    const sp = c.sponsors || [];
    $("#sponsor-wall").innerHTML = sp.length
      ? sp.map((s) => { const inner = s.logo ? `<div><img src="${url(s.logo)}" alt="${esc(s.name)}" loading="lazy"><small>${esc(s.tier || "")}</small></div>` : `<div>${esc(s.name)}<small>${esc(s.tier || "")}</small></div>`;
        return s.url ? `<a class="sponsor reveal" href="${esc(s.url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="sponsor reveal">${inner}</div>`; }).join("")
      : `<div class="empty-state">Be the first sponsor on our wall.</div>`;
    const ftc = await loadFTC(c.team.number, c.team.rookieYear);
    $("#impact").innerHTML = journeyStats(c, ftc);
    runCounts($("#impact"));
  };

  /** Social links shown on Media, Contact, and the footer. Instagram appears automatically once it's set in the editor. */
  function socialLinks(c) {
    const out = [{ label: "YouTube", sub: "Videos from the build room and competitions", url: `https://www.youtube.com/channel/${c.team.youtubeChannelId}`, icon: ICON.youtube }];
    const ig = c.team.instagram ? String(c.team.instagram).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") : "";
    if (ig) out.push({ label: "Instagram", sub: `@${ig}`, url: `https://www.instagram.com/${ig}/`, icon: ICON.instagram });
    out.push({ label: "FTCScout", sub: `Live stats for team ${c.team.number}`, url: `https://ftcscout.org/teams/${c.team.number}`, icon: `<img src="${url("assets/img/brands/ftcscout.svg")}" alt="" width="22" height="22">` });
    for (const s of c.team.socials || []) if (!/youtube|ftcscout|instagram/i.test(s.label)) out.push({ label: s.label, sub: s.url.replace(/^https?:\/\/(www\.)?/, ""), url: s.url, icon: ICON.ext });
    return out;
  }

  pages.contact = async (c) => {
    if (c.contact?.replyNote && $("#reply-note")) $("#reply-note").textContent = c.contact.replyNote;
    const reasons = c.contact?.reasons || [];
    const pre = params.get("reason");
    $("#reason-chips").innerHTML = reasons.map((r, i) => `<input type="radio" name="reason" id="r${i}" value="${esc(r)}"${(pre ? r === pre : i === 0) ? " checked" : ""}><label for="r${i}">${esc(r)}</label>`).join("");
    const tier = params.get("tier");
    if (tier) $("#message").value = tier === "In-kind" ? "Hi Steel Surge! We'd like to support the team with an in-kind or custom sponsorship.\n\n" : `Hi Steel Surge! We're interested in the ${tier} sponsorship tier.\n\n`;
    $("#email-text").textContent = c.team.email;
    $("#email-link").href = `mailto:${c.team.email}`;
    $("#join-contact").href = c.team.joinFormUrl;
    $("#contact-social").innerHTML = socialLinks(c).map((s) => `<a class="social-pill" href="${esc(s.url)}" target="_blank" rel="noopener">${s.icon}<span>${esc(s.label)}</span></a>`).join("");
    $("#copy-email").addEventListener("click", async (e) => {
      e.preventDefault();
      try { await navigator.clipboard.writeText(c.team.email); toast("Email address copied"); } catch { toast(`Our email is ${c.team.email}`, "mail"); }
    });
    // Quick-start cards preselect a topic and jump to the form
    $$("[data-topic]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      const r = a.dataset.topic, input = $$("#reason-chips input").find((i) => i.value === r);
      if (input) input.checked = true;
      if (a.dataset.prefill && !$("#message").value.trim()) { $("#message").value = a.dataset.prefill; $("#message").dispatchEvent(new Event("input")); }
      $("#contact-form").scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(() => $("#name").focus({ preventScroll: true }), 400);
    }));
    const msg = $("#message"), counter = $("#msg-count");
    const count = () => { counter.textContent = `${msg.value.length} / 2000`; };
    msg.addEventListener("input", count); count();

    const form = $("#contact-form"), status = $("#form-status"), btn = $("#send-btn");
    const showStatus = (ok, html) => { status.className = `form-status show ${ok ? "ok" : "err"}`; status.innerHTML = `${ok ? ICON.check : ICON.alert}<div>${html}</div>`; status.focus(); };
    const validate = () => {
      let ok = true;
      [["name", (v) => v.trim().length > 1, "Please tell us your name."], ["email", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "Please enter a valid email address."], ["message", (v) => v.trim().length > 9, "Please write a little more (at least 10 characters)."]]
        .forEach(([id, test, m]) => { const el = $("#" + id), err = $(`#${id}-err`); const bad = !test(el.value); el.setAttribute("aria-invalid", String(bad)); err.textContent = bad ? m : ""; if (bad && ok) { el.focus(); ok = false; } });
      return ok;
    };
    form.addEventListener("input", (e) => { if (e.target.getAttribute("aria-invalid") === "true") { e.target.setAttribute("aria-invalid", "false"); const err = $(`#${e.target.id}-err`); if (err) err.textContent = ""; } });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validate()) return;
      const data = Object.fromEntries(new FormData(form));
      if (data._honey) return; // bot trap
      const reason = data.reason || "General";
      const payload = { name: data.name, email: data.email, organization: data.org || "", reason, heard_about_us: data.heard || "", message: data.message, _subject: `[Website] ${reason} from ${data.name}`, _template: "table", _captcha: "false" };
      btn.disabled = true; btn.innerHTML = "Sending…";
      try {
        const res = await fetch(c.contact.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.success === "false" || j.success === false) throw new Error(j.message || res.status);
        form.reset(); count(); $$("#reason-chips input")[0] && ($$("#reason-chips input")[0].checked = true);
        showStatus(true, `<b>Message sent!</b> Thanks, ${esc(data.name.split(" ")[0])}. ${esc(c.contact?.replyNote || "We usually reply within a few days.")}`);
        window.SS?.trophy?.("say-hello");
      } catch (err) {
        console.warn(err);
        const mail = `mailto:${c.team.email}?subject=${encodeURIComponent(payload._subject)}&body=${encodeURIComponent(data.message + "\n\n— " + data.name + (data.org ? ", " + data.org : ""))}`;
        showStatus(false, `<b>That didn't go through.</b> You can <a href="${esc(mail)}">send it from your email app instead</a>. Your message is already filled in.`);
      } finally { btn.disabled = false; btn.innerHTML = `Send message ${ICON.arrow}`; }
    });
  };

  /** Full screen, with a fallback that fills the window where real full screen isn't allowed (iPhone, embedded browsers). */
  function toggleFull(el) {
    if (document.fullscreenElement) return document.exitFullscreen();
    if (el.classList.contains("pseudo-full")) return exitPseudo(el);
    const req = el.requestFullscreen?.();
    if (!req) return enterPseudo(el);
    req.catch(() => enterPseudo(el));
    // Some embedded browsers neither grant nor refuse; fall back if nothing happened
    setTimeout(() => { if (!document.fullscreenElement && !el.classList.contains("pseudo-full")) enterPseudo(el); }, 600);
  }
  document.addEventListener("fullscreenchange", () => { if (document.fullscreenElement) document.querySelectorAll(".pseudo-full").forEach(exitPseudo); });
  function enterPseudo(el) {
    el.classList.add("pseudo-full"); document.documentElement.classList.add("no-scroll");
    const onKey = (e) => { if (e.key === "Escape") { exitPseudo(el); removeEventListener("keydown", onKey, true); } };
    addEventListener("keydown", onKey, true);
    dispatchEvent(new Event("resize"));
  }
  function exitPseudo(el) { el.classList.remove("pseudo-full"); document.documentElement.classList.remove("no-scroll"); dispatchEvent(new Event("resize")); }

  /* ---------------- FTC page: season explorer with 3D fields ---------------- */
  pages.ftc = async (c) => {
    let data;
    for (let attempt = 0; attempt < 3 && !data; attempt++) {
      try { data = await (await fetch(url("content/seasons.json"), { cache: attempt ? "reload" : "no-cache" })).json(); }
      catch { await new Promise((r) => setTimeout(r, 600 * (attempt + 1))); }
    }
    if (!data) { $("#season-panel").innerHTML = `<div class="empty-state">${ICON.alert}<p>The game library couldn't load. Please refresh the page to try again.</p></div>`; return; }
    const seasons = data.seasons.slice().sort((a, b) => b.year - a.year);
    const cur = currentSeason();
    const curSeason = seasons.find((s) => s.year === cur) || seasons[0];
    // "This season" card stays current automatically
    // If a new season has started but isn't in seasons.json yet, say so instead of calling an old game current
    const behind = curSeason.year !== cur;
    $("#this-season").innerHTML = `<span class="tag ${behind ? "" : "ok"}">${behind ? `Most recent game in our library · ${seasonLabel(curSeason.year)}` : `This season · ${seasonLabel(curSeason.year)}`}</span><h3>${esc(curSeason.name)}${curSeason.presenter ? ` <small>${esc(curSeason.presenter)}</small>` : ""}</h3><p>${esc(curSeason.summary)}</p><a class="link-arrow" href="#games">Explore this season's game and 3D field ${ICON.arrow}</a>`;
    // Which seasons did Steel Surge compete in? (from FTCScout, automatic)
    const ftc = await loadFTC(c.team.number, c.team.rookieYear).catch(() => null);
    const competed = new Set((ftc?.seasons || []).filter((s) => s.events.length || s.upcoming?.length).map((s) => s.season));

    const picker = $("#season-picker"), select = $("#season-select"), panel = $("#season-panel"), viewerEl = $("#field3d");
    const fromUrl = +params.get("season");
    let year = seasons.some((s) => s.year === fromUrl) ? fromUrl : curSeason.year;
    picker.innerHTML = seasons.map((s) => `<button type="button" role="tab" data-year="${s.year}" aria-selected="false"><b>${esc(s.name)}</b><span>${seasonLabel(s.year)}${s.year === cur ? " · Current" : ""}</span></button>`).join("");
    select.innerHTML = seasons.map((s) => `<option value="${s.year}">${seasonLabel(s.year)} · ${esc(s.name)}${s.year === cur ? " (current)" : ""}</option>`).join("");

    let viewer = null, three = null, loading = null, ticket = 0;
    const seen = new Set(get3dSeen());
    function get3dSeen() { try { return JSON.parse(localStorage.getItem("ss-fields-seen") || "[]"); } catch { return []; } }
    async function show3d(y) {
      const status = $(".field3d-status", viewerEl);
      const mine = ++ticket; // ignore results from an older request if the visitor switched again
      viewer?.dispose(); viewer = null;
      status.hidden = false; status.textContent = "Loading the 3D field…";
      try {
        three ||= await (loading ||= import(new URL(url("assets/js/fields3d.js") + ASSET_V, location.href).href));
        if (mine !== ticket) return;
        if (!three.AVAILABLE_SEASONS.includes(y)) { status.textContent = "A 3D model for this season is coming soon."; return; }
        const v = await three.mountField(viewerEl, y);
        if (mine !== ticket) { v.dispose(); return; }
        viewer = v;
        status.hidden = true;
        seen.add(y); try { localStorage.setItem("ss-fields-seen", JSON.stringify([...seen])); } catch {}
        if (seen.size >= 5) window.SS?.trophy?.("field-trip");
        if (seen.size >= three.AVAILABLE_SEASONS.length) window.SS?.trophy?.("historian");
      } catch (err) {
        console.warn(err);
        status.innerHTML = "Your browser couldn't display the 3D field. Try a different browser, or turn on hardware acceleration.";
      }
    }
    function render(y, push = true) {
      year = y;
      const s = seasons.find((x) => x.year === y);
      $$("button", picker).forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.year === y)));
      $(`button[data-year="${y}"]`, picker)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      select.value = String(y);
      const badges = [y === cur ? '<span class="tag ok">Current season</span>' : "", competed.has(y) ? '<span class="tag">Steel Surge competed</span>' : ""].join("");
      const periods = [["auto", "Autonomous", "0:30"], ["teleop", "Driver-controlled", "2:00"], ["endgame", "End Game", "Final 0:30"]];
      panel.innerHTML = `
        <header class="season-head">
          <div><span class="eyebrow">${seasonLabel(s.year)} season${s.theme ? ` · ${esc(s.theme)}` : ""}</span>
          <h2>${esc(s.name)}${s.presenter ? ` <small>${esc(s.presenter)}</small>` : ""}</h2>
          <p class="lead">${esc(s.tagline)}</p><div class="season-badges">${badges}</div></div>
        </header>
        <div class="season-grid">
          <div class="season-text">
            <p>${esc(s.summary)}</p>
            <div class="objective"><b>Objective</b><p>${esc(s.objective)}</p></div>
            <div class="periods">${periods.map(([k, t, tm]) => `<div class="period ${k}"><div class="period-head"><b>${t}</b><span>${tm}</span></div><p>${esc(s.periods[k])}</p></div>`).join("")}</div>
          </div>
          <aside class="season-side">
            <h3>Key field elements</h3>
            <dl class="element-list">${s.elements.map((e) => `<div><dt>${esc(e.name)}</dt><dd>${esc(e.detail)}</dd></div>`).join("")}</dl>
          </aside>
        </div>
        <div class="season-grid two">
          <div><h3>How scoring works</h3><table class="score-table"><tbody>${s.scoring.map(([a, p]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(p)}</td></tr>`).join("")}</tbody></table><p class="fine">Highlights from the official manual. See the Competition Manual for every rule and penalty.</p><a class="btn sm calc-link" href="${url(`calculator.html?season=${s.year}`)}">${ICON.chart || ""} Open the ${esc(s.name)} score calculator</a></div>
          <div class="unique"><h3>What made it special</h3><p>${esc(s.unique)}</p>${competed.has(y) ? `<a class="link-arrow" href="https://ftcscout.org/teams/${esc(c.team.number)}?season=${y}" target="_blank" rel="noopener">See how Steel Surge did ${ICON.arrow}</a>` : ""}</div>
        </div>`;
      $("#field-title").textContent = `${s.name} field · ${seasonLabel(s.year)}`;
      if (push) history.replaceState(null, "", `${location.pathname}?season=${y}#games`);
      if (viewerEl.dataset.ready) show3d(y);
      window.SS?.trackSeason?.(y);
    }
    picker.addEventListener("click", (e) => { const b = e.target.closest("[data-year]"); if (b) render(+b.dataset.year); });
    picker.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return; e.preventDefault();
      const i = seasons.findIndex((s) => s.year === year), j = Math.max(0, Math.min(seasons.length - 1, i + (e.key === "ArrowRight" ? 1 : -1)));
      render(seasons[j].year); $(`button[data-year="${seasons[j].year}"]`, picker)?.focus();
    });
    select.addEventListener("change", () => render(+select.value));
    $("#season-prev").addEventListener("click", () => { const i = seasons.findIndex((s) => s.year === year); if (i < seasons.length - 1) render(seasons[i + 1].year); });
    $("#season-next").addEventListener("click", () => { const i = seasons.findIndex((s) => s.year === year); if (i > 0) render(seasons[i - 1].year); });
    // 3D viewer controls
    const views = $$("[data-view]", viewerEl);
    const markView = (v) => views.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.view === v)));
    markView("angle");
    views.forEach((b) => b.addEventListener("click", () => { viewer?.setView(b.dataset.view); markView(b.dataset.view); }));
    $("[data-spin]", viewerEl).addEventListener("click", (e) => { const on = viewer?.toggleSpin(); e.currentTarget.setAttribute("aria-pressed", String(!!on)); });
    $("[data-full]", viewerEl).addEventListener("click", () => toggleFull(viewerEl));
    render(year, false);
    // Load three.js only when the viewer scrolls near the screen
    new IntersectionObserver(([en], io) => { if (en.isIntersecting) { io.disconnect(); viewerEl.dataset.ready = "1"; show3d(year); } }, { rootMargin: "300px" }).observe(viewerEl);
    if (location.hash === "#games") setTimeout(() => $("#games").scrollIntoView(), 50);
  };

  pages.trophies = async () => {};

  pages["404"] = async () => {};

  /* ---------------- Easter egg: ↑↑↓↓←→←→BA = Overdrive mode ---------------- */
  function initOverdrive() {
    const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let i = 0;
    const set = (on) => { document.documentElement.classList.toggle("overdrive", on); try { on ? sessionStorage.setItem("ss-overdrive", "1") : sessionStorage.removeItem("ss-overdrive"); } catch {} window.dispatchEvent(new CustomEvent("ss:theme")); };
    try { if (sessionStorage.getItem("ss-overdrive")) set(true); } catch {}
    addEventListener("keydown", (e) => {
      if (PAGE.startsWith("game") || e.target.closest?.("input, textarea")) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = k === code[i] ? i + 1 : k === code[0] ? 1 : 0;
      if (i === code.length) {
        i = 0; const on = !document.documentElement.classList.contains("overdrive"); set(on);
        toast(on ? "⚡ Overdrive mode! Surge approves." : "Back to normal power.", "bolt");
        if (on) window.SS?.trophy?.("overdrive");
      }
    });
  }

  /* ---------------- Developer mode shortcut ---------------- */
  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "E" || e.key === "e") && PAGE !== "editor") { e.preventDefault(); location.href = url("editor.html"); }
  });

  /* ---------------- Boot ---------------- */
  async function boot() {
    let c;
    try { c = await loadContent(); }
    catch (err) {
      console.error(err);
      const m = $("main");
      if (m) m.insertAdjacentHTML("afterbegin", `<div class="wrap" style="padding:40px 0"><div class="empty-state">${ICON.alert}<p>Content couldn't load. If you opened this file directly, run it from a web server (see README).</p></div></div>`);
      return;
    }
    window.SS.content = c;
    applyLook(c);
    if (!controls(c).searchEngines) document.head.insertAdjacentHTML("beforeend", '<meta name="robots" content="noindex, nofollow">');
    if (maintenanceOn(c)) { renderMaintenance(c); renderPreviewPill(); document.dispatchEvent(new CustomEvent("ss:ready", { detail: c })); return; }
    renderHeader(c); renderFooter(c); renderBanner(c); renderPreviewPill(); renderMaintenancePill(c); initOverdrive();
    const sw = pageSwitch();
    if (sw && !controls(c)[sw]) { renderClosed(sw); initReveal(); document.dispatchEvent(new CustomEvent("ss:ready", { detail: c })); return; }
    $$("[data-team-name]").forEach((el) => (el.textContent = c.team.name));
    try { await pages[PAGE]?.(c); }
    catch (err) {
      console.error(`[Steel Surge] ${PAGE} page error`, err);
      // Right after a deploy the browser may pair a cached old page with the new script.
      // Reload once with a fresh copy of the page (guarded so it can never loop).
      let tried = false; try { tried = sessionStorage.getItem("ss-fresh") === location.pathname; sessionStorage.setItem("ss-fresh", location.pathname); } catch {}
      if (!tried && err instanceof TypeError) { location.replace(`${location.pathname}?fresh=${Date.now()}${location.hash}`); return; }
    }
    try { if (sessionStorage.getItem("ss-fresh") === location.pathname && !params.has("fresh")) sessionStorage.removeItem("ss-fresh"); } catch {}
    applySwitches(c);
    initReveal();
    initToTop();
    document.dispatchEvent(new CustomEvent("ss:ready", { detail: c }));
  }

  window.SS = Object.assign(window.SS || {}, { ICON, LOGO, esc, store, toast, url, loadContent, loadFTC, theme, GAMES, gameArt, seasonLabel, currentSeason, DRAFT_KEY, PREVIEW_KEY, CONTROL_DEFAULTS, controls, siteOff, weekly, weeklySubmit, outreachStat, LOOK_DEFAULTS, ACCENTS, applyLook, HOME_DEFAULTS, HOME_CREWS, BUILD_STEPS });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
