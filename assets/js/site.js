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
    gamepad: P('<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><rect x="2" y="6" width="20" height="12" rx="6"/>'),
  };
  const LOGO = `<svg class="brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true"><defs><linearGradient id="lg-st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4757"/><stop offset="1" stop-color="#151c25"/></linearGradient><linearGradient id="lg-bl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ad6ff"/><stop offset="1" stop-color="#3ba8ff"/></linearGradient></defs><path d="M20 1.8 36.2 11v18L20 38.2 3.8 29V11z" fill="url(#lg-st)" stroke="#5a6a7d" stroke-width="1.4" stroke-linejoin="round"/><path d="M23.2 7.5 12.4 22.2h6.9L16.8 32.6 27.6 17.6h-7z" fill="url(#lg-bl)" stroke="#041220" stroke-width=".8" stroke-linejoin="round"/></svg>`;

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

  let contentPromise;
  function loadContent() {
    if (contentPromise) return contentPromise;
    contentPromise = (async () => {
      if (isPreview()) return store.get(DRAFT_KEY).content;
      const res = await fetch(url("content/content.json"), { cache: "no-cache" });
      if (!res.ok) throw new Error(`content.json: HTTP ${res.status}`);
      return res.json();
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
    ["index.html", "Home", "home"], ["team.html", "Team", "team"], ["achievements.html", "Achievements", "achievements"],
    ["media.html", "Media", "media"], ["arcade.html", "Arcade", "arcade"], ["sponsors.html", "Sponsors", "sponsors"], ["contact.html", "Contact", "contact"],
  ];
  const navSection = () => (PAGE.startsWith("game") ? "arcade" : PAGE);

  function renderHeader(c) {
    const host = $("#site-header");
    if (!host) return;
    const cur = navSection();
    const links = NAV.map(([href, label, id]) => `<a href="${url(href)}"${id === cur ? ' aria-current="page"' : ""}>${label}</a>`).join("");
    host.className = "site-header";
    host.innerHTML = `
      <div class="wrap">
        <a class="brand" href="${url("index.html")}" aria-label="${esc(c.team.name)} home">${LOGO}<span>${esc(c.team.name)}<small>FTC #${esc(c.team.number)}</small></span></a>
        <nav class="nav" aria-label="Main">${links}</nav>
        <div class="header-actions">
          <button class="icon-btn theme-btn" type="button" aria-label="Switch light or dark theme">${ICON.moon}${ICON.sun}</button>
          <a class="btn primary sm header-cta" href="${url("sponsors.html")}">Sponsor us</a>
          <button class="icon-btn menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">${ICON.menu}</button>
        </div>
      </div>`;
    const mobile = document.createElement("nav");
    mobile.id = "mobile-nav"; mobile.className = "mobile-nav"; mobile.setAttribute("aria-label", "Mobile");
    mobile.innerHTML = NAV.map(([href, label, id]) => `<a href="${url(href)}"${id === cur ? ' aria-current="page"' : ""}>${label}${ICON.arrow.replace("<svg", '<svg width="20" height="20"')}</a>`).join("")
      + `<a class="btn primary" href="${url("sponsors.html")}">Sponsor us</a>`;
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
          <div><h4>Explore</h4><ul>${NAV.slice(1, 5).map(([h, l]) => `<li><a href="${url(h)}">${l}</a></li>`).join("")}</ul></div>
          <div><h4>Get involved</h4><ul>
            <li><a href="${url("sponsors.html")}">Become a sponsor</a></li>
            <li><a href="${esc(c.team.joinFormUrl)}" target="_blank" rel="noopener">Join the team</a></li>
            <li><a href="${url("contact.html")}">Contact us</a></li>
          </ul></div>
          <div><h4>Follow</h4><ul>${socials}<li><a href="https://www.firstinspires.org/robotics/ftc" target="_blank" rel="noopener">About FIRST Tech Challenge</a></li></ul></div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} ${esc(c.team.name)} · FTC Team ${esc(c.team.number)}</span>
          <span class="footer-egg" title="Psst: try ↑↑↓↓←→←→BA">Built by the students of Steel Surge ⚡</span>
          <span>Live stats from <a href="https://ftcscout.org/teams/${esc(c.team.number)}" target="_blank" rel="noopener">FTCScout</a> · <a href="${url("editor.html")}">Team editor</a></span>
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

  function statsBlock(c, ftc) {
    const s = summarize(ftc);
    if (!s) {
      return `<dl class="stats"><div class="stat"><dt>Rookie year</dt><dd>${esc(c.team.rookieYear)}</dd></div><div class="stat"><dt>Team members</dt><dd>${c.members.length}</dd></div><div class="stat"><dt>Program</dt><dd style="font-size:28px">FTC</dd></div><div class="stat"><dt>Team number</dt><dd>${esc(c.team.number)}</dd></div></dl>${sourceLine(ftc)}`;
    }
    const r = s.activeRecord;
    const label = s.isCurrent ? `${seasonLabel(s.active.season)} season` : `Last season (${seasonLabel(s.active.season)})`;
    const bestRank = s.active.events.filter((e) => e.rank).reduce((b, e) => Math.min(b, e.rank), Infinity);
    const q = s.active.quick;
    return `
      <dl class="stats">
        <div class="stat"><dt>Events · ${label}</dt><dd data-count="${s.active.events.length}">0</dd><div class="stat-note">${s.totalEvents} all-time</div></div>
        <div class="stat"><dt>Qual record</dt><dd>${r.w}<small>W</small> ${r.l}<small>L</small>${r.t ? ` ${r.t}<small>T</small>` : ""}</dd><div class="stat-note">${s.totalRecord.w}–${s.totalRecord.l}–${s.totalRecord.t} all-time</div></div>
        <div class="stat"><dt>Best finish</dt><dd>${isFinite(bestRank) ? `<small>#</small><span data-count="${bestRank}">0</span>` : "—"}</dd><div class="stat-note">${s.best ? `All-time best #${s.best.rank}` : "Rank in qualifications"}</div></div>
        <div class="stat"><dt>OPR</dt><dd>${q ? `<span data-count="${q.opr.toFixed(1)}" data-dec="1">0</span>` : "—"}</dd><div class="stat-note">${q ? `World rank ${q.rank.toLocaleString()} of ${q.of.toLocaleString()}` : "Offensive power rating"}</div></div>
      </dl>${sourceLine(ftc)}`;
  }

  function runCounts(scope) {
    $$("[data-count]", scope).forEach((el) => {
      const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { countUp(el, parseFloat(el.dataset.count), { decimals: +el.dataset.dec || 0 }); io.disconnect(); } });
      io.observe(el);
    });
  }

  function eventRow(e) {
    const d = parseDate(e.start);
    const place = [e.venue, [e.city, e.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
    const KINDS = { Scrimmage: "Scrimmage", LeagueMeet: "League meet", Qualifier: "Qualifier", LeagueTournament: "League tournament", SuperQualifier: "Super qualifier", Championship: "Championship", FIRSTChampionship: "FIRST Championship", OffSeason: "Off-season" };
    const kind = KINDS[e.type] || "";
    return `
      <article class="event reveal">
        <div class="event-date">${d ? `<b>${d.getDate()}</b><span>${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}</span>` : "<b>—</b>"}</div>
        <div><h3>${esc(e.name)}</h3><p>${esc(place)}${kind ? ` · ${esc(kind)}` : ""}</p></div>
        <div class="event-result">
          <div><b>${e.rank ? "#" + e.rank : "—"}</b><span>Rank</span></div>
          <div><b>${e.wins}-${e.losses}-${e.ties}</b><span>W-L-T</span></div>
          <div><a class="link-arrow" href="https://ftcscout.org/events/${esc(e.season)}/${esc(e.code)}" target="_blank" rel="noopener" aria-label="View ${esc(e.name)} on FTCScout">${ICON.ext}</a></div>
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
  const cleanTitle = (t) => String(t || "").replace(/\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+/gu, "").trim();
  /** Accepts a bare video ID or any YouTube link (watch?v=, youtu.be/, shorts/, embed/). */
  const ytId = (s) => { s = String(s || "").trim(); const m = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/); return m ? m[1] : s; };
  function videoCard(v) {
    const id = ytId(v.id);
    return `
      <button class="video-card reveal" type="button" data-video="${esc(id)}" data-title="${esc(cleanTitle(v.title))}">
        <span class="video-thumb"><img src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" loading="lazy" decoding="async"><span class="play">${ICON.play}</span></span>
        <span class="video-meta"><b>${esc(cleanTitle(v.title))}</b>${v.published ? `<span>${fmtDate(String(v.published).slice(0, 10))}</span>` : ""}</span>
      </button>`;
  }
  function wireVideoCards(scope = document) {
    $$("[data-video]", scope).forEach((b) => b.addEventListener("click", () => openLightbox(b.dataset.video, b.dataset.title)));
  }
  function openLightbox(id, title) {
    let dlg = $("#lightbox");
    if (!dlg) {
      dlg = document.createElement("dialog"); dlg.id = "lightbox"; dlg.className = "lightbox";
      dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener("close", () => { dlg.innerHTML = ""; });
      document.body.append(dlg);
    }
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
    { id: "overclock", title: "Overclock", genre: "Action · Reflex", blurb: "Hold to boost through the factory — but every second at full power builds heat. Push it too far and you stall out.", controls: "Hold Space / tap & hold" },
    { id: "gridlock", title: "Gridlock", genre: "Puzzle · 30 levels", blurb: "Every robot moves at once. Slide them all onto their charging pads with as few moves as you can.", controls: "Arrow keys / swipe" },
    { id: "echo", title: "Echo", genre: "Puzzle · Time loop", blurb: "Your last run comes back as a ghost robot. Team up with your past self to hold switches and open the way.", controls: "Arrows / on-screen pad" },
    { id: "pitcrew", title: "Pit Crew", genre: "Arcade · Reflex", blurb: "Robots roll into the pit between matches with broken parts. Grab the right tool fast — the queue never stops.", controls: "Keys 1–4 / tap tools" },
    { id: "autonomous", title: "Autonomous", genre: "Puzzle · Coding", blurb: "Program a 30-second autonomous routine with command blocks, then watch your robot run it. Score every sample.", controls: "Click blocks / tap" },
    { id: "signal", title: "Signal Lost", genre: "Stealth · Endless", blurb: "Lost in a dark factory. Ping to see the walls — but every ping wakes the security drones.", controls: "Arrows + Space / touch" },
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

  function gameCards(limit) {
    return GAMES.slice(0, limit || GAMES.length).map((g) => {
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
    return `<div class="next-event reveal"><span class="tag ok">Up next · ${esc(nextLabel(e))}</span><h3>${esc(e.name)}</h3><p>${fmtDate(e.start)}${place ? ` · ${esc(place)}` : ""}</p><a class="link-arrow" href="https://ftcscout.org/events/${esc(e.season)}/${esc(e.code)}" target="_blank" rel="noopener">Follow live on FTCScout ${ICON.arrow}</a></div>`;
  }
  function robotSection(c) {
    const r = c.robot || {};
    if (!r.name) return "";
    return `
      <div class="robot-card reveal">
        ${r.photo ? `<div class="robot-photo"><img src="${url(r.photo)}" alt="${esc(r.name)}" loading="lazy"></div>` : `<div class="robot-photo robot-photo-empty">${LOGO}</div>`}
        <div class="robot-body">
          <span class="eyebrow">${esc(r.season ? `${r.season} robot` : "Our robot")}</span>
          <h2>${esc(r.name)}</h2>
          ${r.summary ? `<p class="lead">${esc(r.summary)}</p>` : ""}
          ${(r.specs || []).length ? `<dl class="spec-list">${r.specs.map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join("")}</dl>` : ""}
        </div>
      </div>`;
  }

  pages.home = async (c) => {
    $("#hero-lead").textContent = c.team.intro;
    const badge = $("#hero-badge");
    badge.innerHTML = `<b>FTC #${esc(c.team.number)}</b> ${seasonLabel(currentSeason())} season · ${esc(c.team.location)}`;
    $("#hero-meta").innerHTML = `
      <div><dt>Based in</dt><dd>${esc(c.team.location)}</dd></div>
      <div><dt>Founded</dt><dd>${esc(c.team.rookieYear)}</dd></div>
      <div><dt>Members</dt><dd>${c.members.length}</dd></div>
      ${c.outreach?.hours ? `<div><dt>Outreach</dt><dd>${esc(c.outreach.hours)} hrs</dd></div>` : ""}`;
    heroCanvas($(".hero-canvas"));

    const pillars = [
      ["gear", "Engineer", "We design in CAD, machine and assemble every subsystem, and iterate until it survives match play.", "Mechanical"],
      ["code", "Program", "From autonomous routines to driver controls, our code turns a pile of motors into a competitor.", "Programming"],
      ["heart", "Inspire", "We run outreach, partner with local businesses, and help other students get into STEM.", "Outreach"],
    ];
    $("#pillars").innerHTML = pillars.map(([i, t, d, dept]) => `
      <a class="card reveal" href="${url("team.html")}#${dept.toLowerCase()}"><div class="card-icon">${ICON[i]}</div><h3>${t}</h3><p>${d}</p><span class="link-arrow">Meet the ${dept.toLowerCase()} crew ${ICON.arrow}</span></a>`).join("");
    $("#home-robot").innerHTML = robotSection(c);
    $("#home-robot").closest("section").hidden = !c.robot?.name;

    $("#home-video").innerHTML = videoEmbed(c.team.youtubeChannelId);
    wireVideos($("#home-video"));
    $("#home-updates").innerHTML = sortUpdates(c.updates).slice(0, 2).map(updateCard).join("");

    const featured = (c.featuredVideos || []).slice(0, 4);
    $("#home-bts").innerHTML = featured.map(videoCard).join("");
    wireVideoCards($("#home-bts"));
    $("#home-bts").closest("section").hidden = !featured.length;

    $("#home-games").innerHTML = gameCards(3);

    const names = (c.sponsors || []).map((s) => `<span>${esc(s.name)}</span>`).join("");
    $("#home-sponsors").innerHTML = names ? `<div class="marquee" aria-label="Our sponsors and partners"><div class="marquee-track">${names}${names}${names}${names}</div></div>` : "";

    const ftcHost = $("#home-stats");
    ftcHost.innerHTML = `<dl class="stats">${'<div class="stat"><dt class="skeleton">Loading</dt><dd class="skeleton">00</dd></div>'.repeat(4)}</dl>`;
    const ftc = await loadFTC(c.team.number, c.team.rookieYear);
    ftcHost.innerHTML = statsBlock(c, ftc);
    const s = summarize(ftc);
    if (s?.next) {
      badge.innerHTML = `<b>Up next</b> ${esc(s.next.name)} · ${fmtDate(s.next.start)}`;
      ftcHost.insertAdjacentHTML("afterbegin", nextEventCard(s.next));
    }
    runCounts(ftcHost); initReveal(ftcHost);
  };

  pages.team = async (c) => {
    if (c.team.school) $("#team-lead").textContent = `Students from ${c.team.school} who design, build, code, and promote our robot every season.`;
    const depts = [...new Set(c.members.map((m) => m.dept).filter(Boolean))];
    const bar = $("#team-filter");
    bar.innerHTML = [["all", "Everyone", c.members.length], ...depts.map((d) => [d.toLowerCase(), d, c.members.filter((m) => m.dept === d).length])]
      .map(([id, label, n]) => `<button class="chip" type="button" data-filter="${esc(id)}" aria-pressed="false">${esc(label)}<span class="count">${n}</span></button>`).join("");
    const initials = (n) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    $("#team-grid").innerHTML = c.members.map((m) => `
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
    bar.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; apply(b.dataset.filter); history.replaceState(null, "", b.dataset.filter === "all" ? location.pathname : `#${b.dataset.filter}`); });
    const fromHash = location.hash.slice(1).toLowerCase();
    apply(depts.some((d) => d.toLowerCase() === fromHash) ? fromHash : "all");

    const values = c.values || [];
    $("#values").hidden = !values.length;
    $("#values-grid").innerHTML = values.map((v, i) => `<div class="value-card reveal"><span class="value-num">0${i + 1}</span><h3>${esc(v.title)}</h3><p>${esc(v.body)}</p></div>`).join("");

    $("#join-link").href = c.team.joinFormUrl;
    const mentors = c.mentors || [];
    if (mentors.length) {
      $("#mentors").hidden = false;
      $("#mentor-grid").innerHTML = mentors.map((m) => `<div class="card reveal"><div class="card-icon">${ICON.star}</div><h3>${esc(m.name)}</h3><p>${esc(m.role || "")}</p></div>`).join("");
    }
  };

  pages.achievements = async (c) => {
    const shelf = $("#trophy-shelf"), seasonsHost = $("#season-results"), tabs = $("#season-tabs"), tl = $("#timeline");
    shelf.innerHTML = `<div class="trophy skeleton" style="height:150px"></div>`.repeat(3);
    seasonsHost.innerHTML = `<div class="event skeleton" style="height:86px"></div>`.repeat(3);

    const ftc = await loadFTC(c.team.number, c.team.rookieYear);
    $("#ach-source").innerHTML = sourceLine(ftc);
    const sum = summarize(ftc);
    if (sum?.next) $("#ach-next").innerHTML = nextEventCard(sum.next);

    const awards = (ftc?.awards || []).slice().sort((a, b) => String(b.eventStart).localeCompare(String(a.eventStart)));
    const manualTrophies = (c.achievements || []).filter((a) => a.icon === "award");
    const trophies = [
      ...awards.map((a) => ({ title: awardName(a), sub: `${a.eventName} · ${seasonLabel(a.season)}` })),
      ...manualTrophies.map((a) => ({ title: a.title, sub: `${a.detail || ""}${a.date ? " · " + fmtDate(a.date, false) : ""}` })),
    ];
    shelf.innerHTML = trophies.length
      ? trophies.map((t) => `<div class="trophy reveal">${ICON.trophy}<h3>${esc(t.title)}</h3><p>${esc(t.sub)}</p></div>`).join("")
      : `<div class="empty-state" style="grid-column:1/-1">${ICON.trophy}<p><b>Our first trophy is on the way.</b><br>Awards appear here automatically the moment FIRST posts them.</p></div>`;

    const seasons = (ftc?.seasons || []).filter((s) => s.events.length);
    if (!seasons.length) {
      tabs.hidden = true;
      seasonsHost.innerHTML = `<div class="empty-state">${ICON.chart}<p>Competition results will show up here after our next event.</p></div>`;
    } else {
      tabs.innerHTML = seasons.map((s, i) => `<button role="tab" type="button" id="tab-${s.season}" aria-controls="season-results" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-season="${s.season}">${seasonLabel(s.season)}</button>`).join("");
      const show = (y, focus = false) => {
        const s = seasons.find((x) => x.season === +y);
        $$("button", tabs).forEach((b) => { const on = +b.dataset.season === +y; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
        seasonsHost.setAttribute("aria-labelledby", `tab-${y}`);
        const r = s.events.reduce((a, e) => ({ w: a.w + e.wins, l: a.l + e.losses, t: a.t + e.ties }), { w: 0, l: 0, t: 0 });
        seasonsHost.innerHTML = `<p class="muted" style="margin-bottom:14px">${s.events.length} event${s.events.length === 1 ? "" : "s"} · ${r.w}–${r.l}–${r.t} in qualification matches${s.quick ? ` · OPR ${s.quick.opr.toFixed(1)}` : ""}</p>` + s.events.slice().reverse().map(eventRow).join("");
        initReveal(seasonsHost);
      };
      tabs.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.season); });
      tabs.addEventListener("keydown", (e) => {
        const list = $$("button", tabs), i = list.indexOf(document.activeElement);
        if (i < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const j = e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length;
        show(list[j].dataset.season, true);
      });
      show(seasons[0].season);
    }

    const items = [
      ...(c.achievements || []).map((a) => ({ date: a.date, title: a.title, detail: a.detail, kind: a.icon === "award" ? "award" : "milestone" })),
      ...awards.map((a) => ({ date: a.eventStart, title: awardName(a), detail: `Earned at ${a.eventName}.`, kind: "award" })),
    ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    tl.innerHTML = items.map((i) => `
      <article class="tl-item reveal ${i.kind}">
        <div class="tl-meta"><span>${fmtDate(i.date, false)}</span>${i.kind === "award" ? '<span class="tag amber">Award</span>' : ""}</div>
        <h3>${esc(i.title)}</h3>${i.detail ? `<p>${esc(i.detail)}</p>` : ""}
      </article>`).join("");

    const sumHost = $("#ach-stats");
    sumHost.innerHTML = statsBlock(c, ftc).replace(/<div class="data-source">[\s\S]*$/, "");
    runCounts(sumHost);
  };

  pages.media = async (c) => {
    $("#media-video").innerHTML = videoEmbed(c.team.youtubeChannelId, "Steel Surge on YouTube");
    wireVideos($("#media-video"));
    $("#yt-link").href = `https://www.youtube.com/channel/${c.team.youtubeChannelId}?sub_confirmation=1`;
    const ups = sortUpdates(c.updates);
    $("#updates").innerHTML = ups.length ? ups.map(updateCard).join("") : `<div class="empty-state">No updates yet — check our YouTube for the latest.</div>`;
    $("#socials").innerHTML = (c.team.socials || []).map((s) => `<a class="contact-method reveal" href="${esc(s.url)}" target="_blank" rel="noopener"><div class="card-icon">${/youtube/i.test(s.label) ? ICON.youtube : ICON.ext}</div><div><b>${esc(s.label)}</b><span>${esc(s.url.replace(/^https?:\/\/(www\.)?/, ""))}</span></div></a>`).join("");
    const grid = $("#video-grid");
    grid.innerHTML = `<div class="video-card skeleton" style="height:220px"></div>`.repeat(3);
    let vids = await loadVideos();
    if (!vids.length) vids = c.featuredVideos || [];
    grid.innerHTML = vids.length ? vids.map(videoCard).join("") : `<div class="empty-state">Videos are on their way.</div>`;
    wireVideoCards(grid); initReveal(grid);
  };

  pages.arcade = async () => {
    $("#arcade-games").innerHTML = gameCards();
    const played = GAMES.filter((g) => bestFor(g.id)).length;
    $("#arcade-progress").innerHTML = `<div class="arcade-pass"><div><b>${played}/${GAMES.length}</b> games played on this device</div><div class="pass-bar"><span style="width:${(played / GAMES.length) * 100}%"></span></div></div>`;
  };

  pages.sponsors = async (c) => {
    $("#pitch").textContent = c.sponsorPitch;
    if (c.sponsorPacketUrl) $("#packet").innerHTML = `<a class="btn" href="${esc(c.sponsorPacketUrl)}" target="_blank" rel="noopener">${ICON.ext} Download our sponsor packet</a>`;
    $("#tiers").innerHTML = (c.sponsorTiers || []).map((t) => `
      <div class="tier reveal${t.featured ? " featured" : ""}">
        ${t.featured ? '<span class="tag">Top tier</span>' : ""}
        <h3>${esc(t.name)}</h3>
        <div class="tier-price">$${Number(t.amount).toLocaleString()}<small> / season</small></div>
        <ul>${(t.perks || []).map((p) => `<li>${ICON.check}<span>${esc(p)}</span></li>`).join("")}</ul>
        <a class="btn ${t.featured ? "primary" : ""}" href="${url("contact.html")}?reason=Sponsorship&tier=${encodeURIComponent(t.name)}">Choose ${esc(t.name)}</a>
      </div>`).join("");
    const sp = c.sponsors || [];
    $("#sponsor-wall").innerHTML = sp.length
      ? sp.map((s) => { const inner = s.logo ? `<div><img src="${url(s.logo)}" alt="${esc(s.name)}" loading="lazy"><small>${esc(s.tier || "")}</small></div>` : `<div>${esc(s.name)}<small>${esc(s.tier || "")}</small></div>`;
        return s.url ? `<a class="sponsor reveal" href="${esc(s.url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="sponsor reveal">${inner}</div>`; }).join("")
      : `<div class="empty-state">Be the first sponsor on our wall.</div>`;

    const ftc = await loadFTC(c.team.number, c.team.rookieYear);
    const s = summarize(ftc);
    $("#impact").innerHTML = `
      <dl class="stats">
        <div class="stat"><dt>Students</dt><dd data-count="${c.members.length}">0</dd><div class="stat-note">Middle & high school</div></div>
        <div class="stat"><dt>Events competed</dt><dd data-count="${s ? s.totalEvents : 0}">0</dd><div class="stat-note">Since ${esc(c.team.rookieYear)}</div></div>
        <div class="stat"><dt>Matches played</dt><dd data-count="${s ? s.totalMatches : 0}">0</dd><div class="stat-note">Qualification matches</div></div>
        ${c.outreach?.hours ? `<div class="stat"><dt>Outreach</dt><dd>${esc(c.outreach.hours)}<small>hrs</small></dd><div class="stat-note">${esc(c.outreach.label || "Community outreach")}</div></div>` : `<div class="stat"><dt>Every dollar</dt><dd style="font-size:clamp(24px,3vw,32px)">→ STEM</dd><div class="stat-note">Parts, fees, travel & outreach</div></div>`}
      </dl>`;
    runCounts($("#impact"));
  };

  pages.contact = async (c) => {
    const reasons = c.contact?.reasons || [];
    const pre = params.get("reason");
    $("#reason-chips").innerHTML = reasons.map((r, i) => `<input type="radio" name="reason" id="r${i}" value="${esc(r)}"${(pre ? r === pre : i === 0) ? " checked" : ""}><label for="r${i}">${esc(r)}</label>`).join("");
    const tier = params.get("tier");
    if (tier) $("#message").value = `Hi Steel Surge! We're interested in the ${tier} sponsorship tier.\n\n`;
    $("#email-text").textContent = c.team.email;
    $("#email-link").href = `mailto:${c.team.email}`;
    $("#join-contact").href = c.team.joinFormUrl;
    $("#copy-email").addEventListener("click", async (e) => {
      e.preventDefault();
      try { await navigator.clipboard.writeText(c.team.email); toast("Email address copied"); } catch { location.href = `mailto:${c.team.email}`; }
    });

    const form = $("#contact-form"), status = $("#form-status"), btn = $("#send-btn");
    const showStatus = (ok, html) => { status.className = `form-status show ${ok ? "ok" : "err"}`; status.innerHTML = `${ok ? ICON.check : ICON.alert}<div>${html}</div>`; status.focus(); };
    const validate = () => {
      let ok = true;
      [["name", (v) => v.trim().length > 1, "Please tell us your name."], ["email", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "That email doesn't look right."], ["message", (v) => v.trim().length > 9, "A few more words, please (10+ characters)."]]
        .forEach(([id, test, msg]) => { const el = $("#" + id), err = $(`#${id}-err`); const bad = !test(el.value); el.setAttribute("aria-invalid", String(bad)); err.textContent = bad ? msg : ""; if (bad && ok) { el.focus(); ok = false; } });
      return ok;
    };
    form.addEventListener("input", (e) => { if (e.target.getAttribute("aria-invalid") === "true") { e.target.setAttribute("aria-invalid", "false"); const err = $(`#${e.target.id}-err`); if (err) err.textContent = ""; } });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validate()) return;
      const data = Object.fromEntries(new FormData(form));
      if (data._honey) return; // bot
      const reason = data.reason || "General";
      const payload = { name: data.name, email: data.email, organization: data.org || "", reason, message: data.message, _subject: `[Website] ${reason} — ${data.name}`, _template: "table", _captcha: "false" };
      btn.disabled = true; btn.innerHTML = "Sending…";
      try {
        const res = await fetch(c.contact.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.success === "false" || j.success === false) throw new Error(j.message || res.status);
        form.reset(); $$("#reason-chips input")[0] && ($$("#reason-chips input")[0].checked = true);
        showStatus(true, `<b>Message sent!</b> Thanks, ${esc(data.name.split(" ")[0])} — we usually reply within a few days.`);
      } catch (err) {
        console.warn(err);
        const mail = `mailto:${c.team.email}?subject=${encodeURIComponent(payload._subject)}&body=${encodeURIComponent(data.message + "\n\n— " + data.name + (data.org ? ", " + data.org : ""))}`;
        showStatus(false, `<b>That didn't go through.</b> You can <a href="${esc(mail)}">send it from your email app instead</a> — your message is already filled in.`);
      } finally { btn.disabled = false; btn.innerHTML = `Send message ${ICON.arrow}`; }
    });
  };

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
      }
    });
  }

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
    renderHeader(c); renderFooter(c); renderPreviewPill(); initOverdrive();
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
    initReveal();
    document.dispatchEvent(new CustomEvent("ss:ready", { detail: c }));
  }

  window.SS = { ICON, LOGO, esc, store, toast, url, loadContent, loadFTC, theme, GAMES, seasonLabel, currentSeason, DRAFT_KEY, PREVIEW_KEY };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
