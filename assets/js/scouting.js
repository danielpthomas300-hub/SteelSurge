/* ==========================================================================
   Steel Surge — Event scouting (Match tools page, "Event scouting" tab)
   Live team stats from FTCScout for any FTC event, notes saved on this
   phone, match schedule with predicted scores, how consistent each team is,
   a projection of the final rankings, and an alliance pick list.
   Notes never leave the device unless someone shares them with a link.
   ========================================================================== */
(() => {
  "use strict";
  const host = document.getElementById("scout");
  if (!host) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const API = "https://api.ftcscout.org";
  const KEY = "ss-scout";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const S = Object.assign({ last: null, notes: {}, picks: {}, weights: { auto: 1, dc: 1, notes: 1, cons: 0.5 }, view: "teams", onlyOurs: true, sort: ["opr", -1], captains: 4 }, load());
  S.weights.cons ??= 0.5; S.captains ??= 4;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const now = new Date(), CUR = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const seasonLabel = (y) => `${y}–${String(y + 1).slice(2)}`;
  const toast = (m) => window.SS?.toast?.(m);
  const fmt1 = (v) => (v == null || Number.isNaN(v) ? "—" : (Math.round(v * 10) / 10).toFixed(1));
  const day = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");
  const ICO = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    star: ICO('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
    refresh: ICO('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
    note: ICO('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
    link: ICO('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    ext: ICO('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    x: ICO('<path d="M18 6 6 18M6 6l12 12"/>'),
    check: ICO('<path d="M20 6 9 17l-5-5"/>'),
    up: ICO('<path d="m6 15 6-6 6 6"/>'), down: ICO('<path d="m6 9 6 6 6-6"/>'),
  };

  /* ---------------- Tabs on the Match tools page ---------------- */
  let tabs = $$(".mt-tab"); const panels = { calc: $("#mt-calc"), scout: $("#mt-scout"), port: $("#mt-port") };
  let started = false;
  function setTab(t, push = true) {
    if (!panels[t]) t = "calc";
    tabs.forEach((b) => { const on = b.dataset.mt === t; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    for (const [k, p] of Object.entries(panels)) if (p) p.hidden = k !== t;
    if (push) history.replaceState(null, "", t === "scout" ? "#scout" : t === "port" ? "#portfolio" : location.pathname + location.search);
    if (t === "scout" && !started) { started = true; start(); }
  }
  tabs.forEach((b) => b.addEventListener("click", () => setTab(b.dataset.mt)));
  $(".mt-tabs")?.addEventListener("keydown", (e) => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; const i = tabs.findIndex((b) => b.getAttribute("aria-selected") === "true"); const n = tabs[(i + 1) % tabs.length]; n.focus(); setTab(n.dataset.mt); });
  document.addEventListener("ss:ready", (e) => {
    const c = e.detail; if (!c) return;
    if (window.SS?.controls?.(c).scouting === false) {
      $("#mt-tab-scout")?.remove(); panels.scout?.remove(); delete panels.scout; tabs = $$(".mt-tabs .mt-tab");
      if (!/^#portfolio/.test(location.hash)) setTab("calc", false);
    }
  });
  if (/^#scout/.test(location.hash)) setTab("scout", false);
  if (/^#portfolio/.test(location.hash)) setTab("port", false);

  /* ---------------- Data from FTCScout ---------------- */
  async function gql(query) {
    const r = await fetch(`${API}/graphql`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
    if (!r.ok) throw new Error(`FTCScout answered ${r.status}`);
    const j = await r.json(); if (j.errors?.length) throw new Error(j.errors[0].message);
    return j.data;
  }
  let team = 27254;
  async function ourEvents() {
    const d = await gql(`{ teamByNumber(number:${team}) { a: events(season:${CUR}) { eventCode event { name start end } } b: events(season:${CUR - 1}) { eventCode event { name start end } } } }`);
    const t = d?.teamByNumber; if (!t) return [];
    return [...(t.a || []).map((e) => ({ ...e, season: CUR })), ...(t.b || []).map((e) => ({ ...e, season: CUR - 1 }))].sort((x, y) => String(y.event.start).localeCompare(String(x.event.start)));
  }
  async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]).catch(() => null); } })); return out; }
  async function loadEvent(season, code) {
    if (!/^[A-Za-z0-9]{2,20}$/.test(code)) throw new Error("Event codes are letters and numbers, like USPACOQ1.");
    const stats = `... on TeamEventStats${season} { rank rp tb1 tb2 wins losses ties qualMatchesPlayed opr { totalPointsNp autoPoints dcPoints } avg { totalPointsNp } max { totalPointsNp } }`;
    const d = await gql(`{ eventByCode(season:${season}, code:"${code.toUpperCase()}") { name code start end location { venue city state } teams { teamNumber team { name } stats { ${stats} } }
      matches { matchNum tournamentLevel series scheduledStartTime teams { teamNumber alliance } scores { ... on MatchScores${season} { red { totalPoints } blue { totalPoints } } } } } }`);
    const ev = d?.eventByCode;
    if (!ev) throw new Error(`FTCScout has no event ${code.toUpperCase()} in the ${seasonLabel(season)} season. Check the code on ftcscout.org.`);
    const teams = ev.teams.map((t) => ({
      n: t.teamNumber, name: t.team?.name || "", rank: t.stats?.rank ?? null, rp: t.stats?.rp ?? null, tb1: t.stats?.tb1 ?? null, tb2: t.stats?.tb2 ?? null, w: t.stats?.wins ?? null, l: t.stats?.losses ?? null, t: t.stats?.ties ?? null, played: t.stats?.qualMatchesPlayed ?? 0,
      opr: t.stats?.opr?.totalPointsNp ?? null, auto: t.stats?.opr?.autoPoints ?? null, dc: t.stats?.opr?.dcPoints ?? null, avg: t.stats?.avg?.totalPointsNp ?? null, max: t.stats?.max?.totalPointsNp ?? null, src: t.stats ? "event" : null,
    }));
    // Teams without results here yet: use their best numbers from the season so far
    const missing = teams.filter((t) => t.opr == null);
    await pool(missing, 8, async (t) => {
      const q = await (await fetch(`${API}/rest/v1/teams/${t.n}/quick-stats?season=${season}`)).json();
      if (q?.tot) { t.opr = q.tot.value; t.auto = q.auto?.value ?? null; t.dc = (q.dc?.value ?? 0) + (q.eg?.value ?? 0); t.src = "season"; }
    });
    const matches = (ev.matches || []).map((m) => ({
      n: m.matchNum, level: m.tournamentLevel, series: m.series, time: m.scheduledStartTime,
      red: m.teams.filter((x) => x.alliance === "Red").map((x) => x.teamNumber), blue: m.teams.filter((x) => x.alliance === "Blue").map((x) => x.teamNumber),
      rs: m.scores?.red?.totalPoints ?? null, bs: m.scores?.blue?.totalPoints ?? null,
    })).sort((a, b) => (a.level === b.level ? a.n - b.n : a.level === "Quals" ? -1 : 1));
    return { season, code: ev.code, name: ev.name, start: ev.start, end: ev.end, where: [ev.location?.venue, ev.location?.city, ev.location?.state].filter(Boolean).join(", "), teams, matches, fetched: Date.now() };
  }

  /* ---------------- Notes on this device ---------------- */
  let ev = null, refreshTimer = 0;
  const evKey = () => `${ev.season}:${ev.code}`;
  const notesFor = (n) => ((S.notes[evKey()] ||= {})[n] ||= {});
  const hasNotes = (n) => { const x = S.notes[evKey()]?.[n]; return !!x && Object.values(x).some((v) => (Array.isArray(v) ? v.length : v)); };
  const pickState = (n) => (S.picks[evKey()] || {})[n] || "";

  /* ---------------- Rendering ---------------- */
  async function start() {
    try { const c = await window.SS?.loadContent?.(); if (c?.team?.number) team = Number(c.team.number); } catch {}
    const shared = location.hash.match(/^#scout-notes=([\w-]+)$/);
    if (shared) await importNotes(shared[1]);
    if (S.last) open(S.last.season, S.last.code, true); else picker();
  }
  async function picker(err = "") {
    clearInterval(refreshTimer);
    host.innerHTML = `
      <div class="sc-card sc-pick">
        <h2>Pick an event</h2>
        <p class="muted">Scout any FTC event: every team's stats from FTCScout, your own notes, the match schedule, and a pick list for alliance selection.</p>
        <div class="sc-ours" data-ours><span class="muted">Loading Steel Surge's events…</span></div>
        <form class="sc-code" data-form>
          <label class="field"><span>Event code</span><input class="input" name="code" placeholder="e.g. USPACOQ1" autocapitalize="characters" autocomplete="off" required></label>
          <label class="field"><span>Season</span><select class="input select" name="season">${[CUR, CUR - 1].map((y) => `<option value="${y}">${seasonLabel(y)}</option>`).join("")}</select></label>
          <button class="btn primary" type="submit">Load event</button>
        </form>
        <p class="sc-err" aria-live="polite">${esc(err)}</p>
        <p class="fine">Find codes on <a href="https://ftcscout.org/events" target="_blank" rel="noopener">ftcscout.org/events</a>. Stats come from FTCScout; notes are saved on this device only.</p>
      </div>`;
    $("[data-form]", host).addEventListener("submit", (e) => { e.preventDefault(); const f = new FormData(e.target); open(Number(f.get("season")), String(f.get("code")).trim()); });
    try {
      const list = await ourEvents(), box = $("[data-ours]", host); if (!box) return;
      box.innerHTML = list.length ? `<span class="sc-label">Steel Surge's events</span><div class="sc-chips">${list.map((e) => `<button type="button" class="chip" data-ev="${e.season}:${esc(e.eventCode)}"><b>${esc(e.event.name)}</b><small>${day(e.event.start)} · ${seasonLabel(e.season)}</small></button>`).join("")}</div>` : `<span class="muted">No Steel Surge events on FTCScout yet. Type any event code below.</span>`;
      $$("[data-ev]", box).forEach((b) => b.addEventListener("click", () => { const [y, c] = b.dataset.ev.split(":"); open(Number(y), c); }));
    } catch { const box = $("[data-ours]", host); if (box) box.innerHTML = `<span class="muted">Couldn't reach FTCScout for the team's events. You can still type a code.</span>`; }
  }
  async function open(season, code, quiet = false) {
    host.innerHTML = `<div class="sc-card sc-loading"><span class="sc-spin"></span> Loading ${esc(code.toUpperCase())} from FTCScout…</div>`;
    const cacheKey = `ss-scout-cache:${season}:${code.toUpperCase()}`;
    try {
      ev = await loadEvent(season, code);
      try { localStorage.setItem(cacheKey, JSON.stringify(ev)); } catch {}
    } catch (e) {
      let cached = null; try { cached = JSON.parse(localStorage.getItem(cacheKey)); } catch {}
      if (cached) { ev = cached; ev.offline = true; }
      else { if (quiet) S.last = null; save(); return picker(e.message || "Couldn't load that event."); }
    }
    S.last = { season: ev.season, code: ev.code }; save();
    draw();
    clearInterval(refreshTimer);
    const today = new Date().toISOString().slice(0, 10);
    if (ev.start && ev.start <= today && today <= (ev.end || ev.start)) refreshTimer = setInterval(() => { if (!document.hidden) refresh(true); }, 180000);
  }
  async function refresh(quiet = false) {
    try { const fresh = await loadEvent(ev.season, ev.code); ev = fresh; try { localStorage.setItem(`ss-scout-cache:${ev.season}:${ev.code}`, JSON.stringify(ev)); } catch {} draw(); if (!quiet) toast("Updated from FTCScout"); }
    catch { if (!quiet) toast("Couldn't reach FTCScout. Showing the saved copy."); }
  }

  function draw() {
    const ours = ev.teams.some((t) => t.n === team), seasonSrc = ev.teams.some((t) => t.src === "season"), anyEvent = ev.teams.some((t) => t.src === "event");
    host.innerHTML = `
      <div class="sc-card sc-head">
        <div><span class="eyebrow">${seasonLabel(ev.season)} · ${esc(ev.code)}</span><h2>${esc(ev.name)}</h2>
          <p class="muted">${[ev.start ? `${day(ev.start)}${ev.end && ev.end !== ev.start ? `–${day(ev.end)}` : ""}` : "", ev.where, `${ev.teams.length} teams`].filter(Boolean).map(esc).join(" · ")}</p></div>
        <div class="sc-head-actions">
          <button type="button" class="btn sm" data-refresh>${I.refresh} Refresh</button>
          <button type="button" class="btn ghost sm" data-change>Change event</button>
        </div>
        <p class="sc-src">${ev.offline ? `<b>Offline:</b> showing the copy saved ${new Date(ev.fetched).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. ` : ""}${anyEvent ? "Stats are from matches at this event" : "No matches played here yet, so stats are each team's best from the season so far"}${anyEvent && seasonSrc ? " (teams marked · haven't played here yet, so their season numbers are shown)" : ""}. Data from <a href="https://ftcscout.org/events/${ev.season}/${esc(ev.code)}" target="_blank" rel="noopener">FTCScout</a>.</p>
      </div>
      <div class="sc-views" role="tablist" aria-label="Scouting views">${[["teams", "Teams"], ["matches", ours ? "Our matches" : "Matches"], ["proj", "Projection"], ["picks", "Pick list"], ["share", "Share notes"]].map(([k, l]) => `<button type="button" role="tab" aria-selected="${S.view === k}" data-view="${k}">${l}</button>`).join("")}</div>
      <div class="sc-body" data-body></div>
      <dialog class="sc-dialog" data-dialog></dialog>`;
    $("[data-refresh]", host).addEventListener("click", () => refresh());
    $("[data-change]", host).addEventListener("click", () => { S.last = null; save(); picker(); });
    $$("[data-view]", host).forEach((b) => b.addEventListener("click", () => { S.view = b.dataset.view; save(); draw(); }));
    ({ teams: viewTeams, matches: viewMatches, proj: viewProjection, picks: viewPicks, share: viewShare }[S.view] || viewTeams)();
  }

  /* ---- Teams ---- */
  const COLS = [["n", "Team"], ["rank", "Rank"], ["rec", "W-L-T"], ["opr", "OPR"], ["auto", "Auto"], ["dc", "TeleOp"], ["low", "Low"], ["cons", "Steady"], ["max", "Best"]];
  function viewTeams() {
    const body = $("[data-body]", host);
    body.innerHTML = `
      <div class="sc-tools"><input class="input" type="search" placeholder="Search team number or name" data-q aria-label="Search teams"><label class="sc-check"><input type="checkbox" data-noted> Only teams I've noted</label></div>
      <div class="sc-table-wrap"><table class="sc-table"><thead><tr>${COLS.map(([k, l]) => `<th scope="col"><button type="button" data-sort="${k}" class="${S.sort[0] === k ? "on" : ""}">${l}${S.sort[0] === k ? (S.sort[1] > 0 ? " ▲" : " ▼") : ""}</button></th>`).join("")}<th scope="col"><span class="sr-only">Notes</span></th></tr></thead><tbody data-rows></tbody></table></div>
      <p class="fine">OPR estimates how many points a team adds to its alliance per match (penalties left out). <b>Low</b> and <b>Steady</b> show how much a team's matches swing: each match is estimated as their alliance's score minus their partners' OPR. Tap a team to add notes.</p>`;
    const rows = () => {
      const q = $("[data-q]", body).value.trim().toLowerCase(), noted = $("[data-noted]", body).checked, [k, dir] = S.sort;
      const val = (t) => (k === "n" ? t.n : k === "rank" ? (t.rank ?? 9999) : k === "rec" ? (t.w ?? -1) * 100 - (t.l ?? 0) : k === "low" ? (consOf(t.n)?.low ?? -9999) : k === "cons" ? (consOf(t.n)?.score ?? -9999) : t[k] ?? -9999);
      const list = ev.teams.filter((t) => (!q || String(t.n).includes(q) || t.name.toLowerCase().includes(q)) && (!noted || hasNotes(t.n)))
        .sort((a, b) => (val(a) - val(b)) * dir || a.n - b.n);
      $("[data-rows]", body).innerHTML = list.map((t) => {
        const nt = S.notes[evKey()]?.[t.n] || {}, ps = pickState(t.n);
        return `<tr class="${t.n === team ? "us" : ""} ${ps}" data-team="${t.n}" tabindex="0">
          <th scope="row"><b>${t.n}</b><small>${esc(t.name)}</small></th>
          <td>${t.rank ?? "—"}</td><td>${t.w != null ? `${t.w}-${t.l}-${t.t}` : "—"}</td>
          <td class="num strong">${fmt1(t.opr)}${t.src === "season" && ev.teams.some((x) => x.src === "event") ? '<i title="Season numbers">·</i>' : ""}</td><td class="num">${fmt1(t.auto)}</td><td class="num">${fmt1(t.dc)}</td>${consCells(t.n)}<td class="num">${t.max ?? "—"}</td>
          <td class="sc-flags">${nt.want ? `<span class="want" title="Want as a partner">${I.star}</span>` : ""}${hasNotes(t.n) ? `<span title="Has notes">${I.note}</span>` : ""}</td></tr>`; }).join("") || `<tr><td colspan="9" class="sc-empty">No teams match.</td></tr>`;
      $$("[data-team]", body).forEach((tr) => { const go = () => teamDialog(Number(tr.dataset.team)); tr.addEventListener("click", go); tr.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); }); });
    };
    $("[data-q]", body).addEventListener("input", rows); $("[data-noted]", body).addEventListener("change", rows);
    $$("[data-sort]", body).forEach((b) => b.addEventListener("click", () => { const k = b.dataset.sort; S.sort = [k, S.sort[0] === k ? -S.sort[1] : k === "n" || k === "rank" ? 1 : -1]; save(); viewTeams(); }));
    rows();
  }

  /* ---- One team: stats + notes ---- */
  function teamDialog(n) {
    const t = ev.teams.find((x) => x.n === n); if (!t) return;
    const dlg = $("[data-dialog]", host), nt = notesFor(n);
    const opt = (k, list) => list.map((o) => `<option${nt[k] === o ? " selected" : ""}>${esc(o)}</option>`).join("");
    const STR = ["Autonomous", "TeleOp scoring", "Endgame", "Driving", "Defense", "Consistency"];
    const mine = ev.matches.filter((m) => m.red.includes(n) || m.blue.includes(n));
    dlg.innerHTML = `<form method="dialog" class="sc-dlg">
      <header><div><b class="sc-num">${n}</b><h3>${esc(t.name) || "Team " + n}</h3></div><button class="icon-btn" value="close" aria-label="Close">${I.x}</button></header>
      <div class="sc-stats">${[["Rank", t.rank ?? "—"], ["Record", t.w != null ? `${t.w}-${t.l}-${t.t}` : "—"], ["OPR", fmt1(t.opr)], ["Auto", fmt1(t.auto)], ["TeleOp", fmt1(t.dc)], ["Best", t.max ?? "—"]].map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join("")}</div>
      ${(() => { const c = consOf(n); return c ? `<div class="sc-cons"><div class="sc-cons-head"><span class="sc-label">Match by match (estimated)</span>${c.score != null ? `<span class="sc-steady ${steadyTone(c.score)}">${steadyLabel(c.score)} · ${c.score}</span>` : `<span class="muted">Needs 3 matches for a rating</span>`}</div>${sparkline(c)}<p class="fine">Low ${fmt1(c.low)} · Average ${fmt1(c.mean)} · High ${fmt1(c.high)} over ${c.n} match${c.n === 1 ? "" : "es"}. Each point is their alliance's score minus their partners' OPR.</p></div>` : ""; })()}
      <p class="fine">${t.src === "season" ? "Season numbers (no matches here yet). " : ""}<a href="https://ftcscout.org/teams/${n}" target="_blank" rel="noopener">${I.ext} Full history on FTCScout</a></p>
      <div class="sc-flags-row">
        <button type="button" class="sc-toggle want ${nt.want ? "on" : ""}" data-flag="want" aria-pressed="${!!nt.want}">${I.star} Want as a partner</button>
        <button type="button" class="sc-toggle avoid ${nt.avoid ? "on" : ""}" data-flag="avoid" aria-pressed="${!!nt.avoid}">${I.x} Avoid</button>
      </div>
      <div class="sc-grid">
        <label class="field"><span>Drivetrain</span><select class="input select" data-k="drive"><option value="">—</option>${opt("drive", ["Mecanum", "Tank", "Swerve", "Other"])}</select></label>
        <label class="field"><span>Autonomous</span><select class="input select" data-k="auton"><option value="">—</option>${opt("auton", ["None", "Parks only", "Scores some", "Scores a lot"])}</select></label>
      </div>
      <div class="field"><span>Strong at</span><div class="sc-chips">${STR.map((x) => `<button type="button" class="chip ${(nt.strong || []).includes(x) ? "on" : ""}" data-strong="${x}" aria-pressed="${(nt.strong || []).includes(x)}">${x}</button>`).join("")}</div></div>
      <div class="field"><span>Reliability</span><div class="sc-rate" role="group" aria-label="Reliability from 1 to 5">${[1, 2, 3, 4, 5].map((r) => `<button type="button" data-rate="${r}" class="${(nt.rel || 0) >= r ? "on" : ""}" aria-label="${r} of 5">${I.star}</button>`).join("")}</div></div>
      <label class="field"><span>Pit notes</span><textarea class="textarea" rows="3" data-k="text" placeholder="Mechanisms, what they told you, anything to remember">${esc(nt.text || "")}</textarea></label>
      <div class="field"><span>Match notes</span><ul class="sc-mnotes">${(nt.matches || []).map((m, i) => `<li><b>${esc(m.m ? "Q" + m.m : "Note")}</b> ${esc(m.text)} <button type="button" class="icon-btn" data-del-m="${i}" aria-label="Delete note">${I.x}</button></li>`).join("")}</ul>
        <div class="sc-addm"><input class="input" type="number" min="1" placeholder="Match" data-mnum aria-label="Match number" value="${mine.find((m) => m.rs == null)?.n || ""}"><input class="input" placeholder="What did they do?" data-mtext aria-label="Match note"><button type="button" class="btn sm" data-addm>Add</button></div></div>
      ${mine.length ? `<details class="sc-their"><summary>${mine.length} match${mine.length === 1 ? "" : "es"} at this event</summary><div>${mine.map(matchRow).join("")}</div></details>` : ""}
    </form>`;
    const upd = () => { save(); if (S.view === "teams") viewTeams(); };
    $$("[data-k]", dlg).forEach((el) => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => { nt[el.dataset.k] = el.value; upd(); }));
    $$("[data-flag]", dlg).forEach((b) => b.addEventListener("click", () => { const k = b.dataset.flag; nt[k] = !nt[k]; if (nt[k]) nt[k === "want" ? "avoid" : "want"] = false; save(); teamDialog(n); upd(); }));
    $$("[data-strong]", dlg).forEach((b) => b.addEventListener("click", () => { const x = b.dataset.strong; nt.strong = (nt.strong || []).includes(x) ? nt.strong.filter((y) => y !== x) : [...(nt.strong || []), x]; b.classList.toggle("on"); b.setAttribute("aria-pressed", String(b.classList.contains("on"))); upd(); }));
    $$("[data-rate]", dlg).forEach((b) => b.addEventListener("click", () => { const r = Number(b.dataset.rate); nt.rel = nt.rel === r ? 0 : r; $$("[data-rate]", dlg).forEach((x) => x.classList.toggle("on", Number(x.dataset.rate) <= nt.rel)); upd(); }));
    const addM = () => { const text = $("[data-mtext]", dlg).value.trim(); if (!text) return; (nt.matches ||= []).push({ m: Number($("[data-mnum]", dlg).value) || null, text, at: Date.now() }); save(); teamDialog(n); upd(); setTimeout(() => $("[data-mtext]", $("[data-dialog]", host))?.focus(), 30); };
    $("[data-addm]", dlg).addEventListener("click", addM);
    $("[data-mtext]", dlg).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addM(); } });
    $$("[data-del-m]", dlg).forEach((b) => b.addEventListener("click", () => { nt.matches.splice(Number(b.dataset.delM), 1); save(); teamDialog(n); upd(); }));
    $$(".sc-their [data-team]", dlg).forEach((b) => b.addEventListener("click", () => teamDialog(Number(b.dataset.team))));
    dlg.onclick = (e) => { if (e.target === dlg) dlg.close(); };
    if (!dlg.open) dlg.showModal();
  }

  /* ---- Matches ---- */
  const oprOf = (n) => ev.teams.find((t) => t.n === n)?.opr ?? 0;

  /* ---------------- Consistency ----------------
     FTCScout only has alliance scores, so a team's share of each match is estimated as
     their alliance's score minus their partners' OPR. Steady (0–100) is high when those
     shares stay close to the team's average. */
  let consCache = null;
  function consAll() {
    if (consCache?.ev === ev) return consCache.map;
    const map = new Map();
    for (const t of ev.teams) {
      const list = [];
      for (const m of ev.matches) {
        if (m.rs == null || m.bs == null) continue;
        const side = m.red.includes(t.n) ? ["red", m.rs] : m.blue.includes(t.n) ? ["blue", m.bs] : null; if (!side) continue;
        const partners = m[side[0]].filter((x) => x !== t.n);
        list.push({ m, v: side[1] - partners.reduce((s, x) => s + oprOf(x), 0) });
      }
      if (!list.length) continue;
      const vals = list.map((x) => x.v), mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, vals.length - 1));
      const enough = vals.length >= 3;
      map.set(t.n, { list, n: vals.length, mean, sd, low: Math.min(...vals), high: Math.max(...vals), score: enough ? Math.round(100 * Math.exp(-sd / Math.max(Math.abs(mean), 15))) : null });
    }
    consCache = { ev, map };
    return map;
  }
  const consOf = (n) => consAll().get(n) || null;
  const steadyLabel = (v) => (v == null ? "" : v >= 75 ? "Steady" : v >= 50 ? "Some swings" : "Up and down");
  const steadyTone = (v) => (v == null ? "" : v >= 75 ? "ok" : v >= 50 ? "mid" : "low");
  const consCells = (n) => { const c = consOf(n); return `<td class="num">${c ? fmt1(c.low) : "—"}</td><td class="num">${c?.score != null ? `<span class="sc-steady ${steadyTone(c.score)}" title="${steadyLabel(c.score)} (${c.n} matches)">${c.score}</span>` : `<span class="muted" title="${c ? "Needs 3 matches" : "No matches yet"}">—</span>`}</td>`; };
  /** Small chart of a team's estimated score in each match, with its average as a dashed line. */
  function sparkline(c) {
    const W = 260, H = 56, P = 6, vals = c.list.map((x) => x.v), lo = Math.min(0, ...vals), hi = Math.max(...vals, lo + 1);
    const x = (i) => P + (vals.length === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (vals.length - 1)), y = (v) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
    const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const label = (q) => (q.m.level === "Quals" ? `Q${q.m.n}` : `Playoff ${q.m.series || q.m.n}`);
    return `<svg class="sc-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Estimated score in each match: ${c.list.map((q) => `${label(q)} ${Math.round(q.v)}`).join(", ")}">
      <line x1="${P}" x2="${W - P}" y1="${y(c.mean).toFixed(1)}" y2="${y(c.mean).toFixed(1)}" class="avg"/><polyline points="${pts}"/>${vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3"><title>${label(c.list[i])}: about ${Math.round(v)}</title></circle>`).join("")}</svg>`;
  }

  /* ---------------- Rank projection ----------------
     Starts from FTC's official standings (ranking score and tiebreakers from FTCScout),
     then plays the rest of the qualification matches 2,000 times. Each alliance scores its
     OPR total plus a random swing sized by how much its teams usually vary. Ranking points
     for a future match = what a win is worth at this event × win + the team's usual bonus
     ranking points per match. Both are measured from this event's results, so it follows
     each season's ranking rules without hard-coding them. */
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let projCache = null;
  function project(K) {
    if (projCache?.ev === ev && projCache.K === K) return projCache.res;
    const quals = ev.matches.filter((m) => m.level === "Quals");
    const played = quals.filter((m) => m.rs != null && m.bs != null), left = quals.filter((m) => m.rs == null || m.bs == null);
    const T = ev.teams, N = T.length, idx = new Map(T.map((t, i) => [t.n, i]));
    // Standings now: official when FTCScout has them, otherwise counted from the schedule (2 points a win, 1 a tie)
    const official = T.some((t) => t.rp != null && t.played > 0);
    const sched = T.map(() => ({ w: 0, l: 0, t: 0, g: 0 }));
    for (const m of played) for (const [side, mine, theirs] of [[m.red, m.rs, m.bs], [m.blue, m.bs, m.rs]]) for (const n of side) { const b = sched[idx.get(n)]; if (!b) continue; b.g++; mine > theirs ? b.w++ : mine < theirs ? b.l++ : b.t++; }
    const now = T.map((t, i) => {
      if (official && t.played > 0 && t.rp != null) return { g: t.played, rs: t.rp * t.played, w: t.w ?? 0, l: t.l ?? 0, t: t.t ?? 0, tb1: t.tb1 ?? 0, tb2: t.tb2 ?? 0, rank: t.rank };
      const c = sched[i]; return { g: c.g, rs: 2 * c.w + c.t, w: c.w, l: c.l, t: c.t, tb1: 0, tb2: 0, rank: null };
    });
    // What a win is worth here, and each team's usual bonus ranking points, from a line fit of ranking score vs win rate
    let winRP = 2, bonus = T.map(() => 0);
    const pts = now.map((x, i) => (x.g ? { i, x: (x.w + 0.5 * x.t) / x.g, y: x.rs / x.g } : null)).filter(Boolean);
    if (official && pts.length >= 4) {
      const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length, my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const vx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
      if (vx > 1e-6) winRP = Math.min(4, Math.max(1, pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / vx));
      const res = new Map(pts.map((p) => [p.i, p.y - winRP * p.x])), avgRes = [...res.values()].reduce((a, b) => a + b, 0) / res.size;
      bonus = T.map((_, i) => Math.max(0, res.get(i) ?? avgRes));
    }
    const swing = (n) => { const c = consOf(n); const o = Math.max(oprOf(n), 0); return c?.n >= 3 ? Math.min(60, Math.max(5, c.sd)) : 6 + 0.3 * o; };
    const alliance = (side) => ({ mean: side.reduce((s, n) => s + Math.max(oprOf(n), 0), 0), sd: Math.sqrt(side.reduce((s, n) => s + swing(n) ** 2, 0)) });
    const plan = left.map((m) => ({ m, r: alliance(m.red), b: alliance(m.blue), ours: m.red.includes(team) || m.blue.includes(team) }));
    const RUNS = left.length ? 2000 : 1, rand = rng(ev.fetched || 1);
    const gauss = () => { let u = 0; while (!u) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand()); };
    const rankHist = T.map(() => new Array(N).fill(0)), top = new Array(N).fill(0), key = plan.map(() => ({ wins: 0, topIfWin: 0, topIfLoss: 0 })), us = idx.get(team);
    const byRank = (st) => T.map((_, i) => i).sort((a, b) => (st[b].g ? st[b].rs / st[b].g : 0) - (st[a].g ? st[a].rs / st[a].g : 0) || st[b].tb1 - st[a].tb1 || st[b].tb2 - st[a].tb2);
    for (let run = 0; run < RUNS; run++) {
      const st = now.map((x) => ({ ...x })), wonOurs = [];
      for (const p of plan) {
        const rs = p.r.mean + gauss() * p.r.sd, bs = p.b.mean + gauss() * p.b.sd;
        for (const [side, mine, theirs] of [[p.m.red, rs, bs], [p.m.blue, bs, rs]]) for (const n of side) { const i = idx.get(n); if (i == null) continue; st[i].g++; st[i].rs += (mine > theirs ? winRP : 0) + bonus[i]; }
        wonOurs.push(p.ours ? (p.m.red.includes(team) ? rs > bs : bs > rs) : null);
      }
      // Once qualifications are over, FTC's own ranking is the answer
      const order = !left.length && official && T.every((t) => t.rank != null || !t.played) ? T.map((_, i) => i).sort((a, b) => (T[a].rank ?? 999) - (T[b].rank ?? 999)) : byRank(st);
      order.forEach((i, r) => { rankHist[i][r]++; if (r < K) top[i]++; });
      if (us != null) { const usTop = order.indexOf(us) < K; plan.forEach((p, j) => { if (wonOurs[j] == null) return; if (wonOurs[j]) { key[j].wins++; if (usTop) key[j].topIfWin++; } else if (usTop) key[j].topIfLoss++; }); }
    }
    const pct = (h, q) => { let c = 0; for (let r = 0; r < h.length; r++) { c += h[r]; if (c >= q * RUNS) return r + 1; } return h.length; };
    const rows = T.map((t, i) => ({ n: t.n, name: t.name, cur: now[i], mid: pct(rankHist[i], 0.5), lo: pct(rankHist[i], 0.1), hi: pct(rankHist[i], 0.9), avgRank: rankHist[i].reduce((s, c, r) => s + c * (r + 1), 0) / RUNS, top: top[i] / RUNS }))
      .sort((a, b) => a.avgRank - b.avgRank);
    const keys = plan.map((p, j) => ({ p, ...key[j] })).filter((k) => k.p.ours).map((k) => ({ m: k.p.m, pWin: k.wins / RUNS, ifWin: k.wins ? k.topIfWin / k.wins : null, ifLoss: RUNS - k.wins ? k.topIfLoss / (RUNS - k.wins) : null }))
      .map((k) => ({ ...k, swing: (k.ifWin ?? 0) - (k.ifLoss ?? 0) })).sort((a, b) => b.swing - a.swing);
    const res = { rows, keys, left: left.length, played: played.length, total: quals.length, official, winRP };
    projCache = { ev, K, res };
    return res;
  }

  function viewProjection() {
    const body = $("[data-body]", host), K = S.captains, ours = ev.teams.some((t) => t.n === team);
    const quals = ev.matches.filter((m) => m.level === "Quals");
    if (!quals.length) { body.innerHTML = `<div class="sc-card sc-empty">The qualification schedule isn't posted yet, so there's nothing to project. It usually appears on FTCScout the morning of the event. Press Refresh then.</div>`; return; }
    const P = project(K), me = P.rows.find((r) => r.n === team), pc = (v) => `${Math.round(v * 100)}%`;
    const lab = (m) => `Q${m.n}`, list = (a) => a.map((n) => `<b class="${n === team ? "us" : ""}">${n}</b>`).join(" + ");
    const done = !P.left;
    body.innerHTML = `
      <div class="sc-card sc-proj-head">
        <div class="sc-proj-top">
          <div><span class="sc-label">${done ? "Qualifications are finished" : `${P.played} of ${P.total} qualification matches played`}</span>
            <h3>${ours && me ? (done ? `Steel Surge finished #${me.mid}` : `Steel Surge projects to finish about #${me.mid}`) : "Projected final rankings"}</h3>
            ${ours && me && !done ? `<p class="muted">Likely between #${me.lo} and #${me.hi}. Chance to be in the top ${K} (an alliance captain): <b>${pc(me.top)}</b>.</p>` : ""}</div>
          <label class="sc-captains"><span>Alliance captains</span><select class="input select" data-k>${[4, 6, 8].map((k) => `<option value="${k}"${k === K ? " selected" : ""}>Top ${k}</option>`).join("")}</select></label>
        </div>
        ${!done && ours && P.keys.length ? `<div class="sc-keys"><span class="sc-label">Our matches that matter most</span>${P.keys.map((k) => `
          <div class="sc-key"><b class="sc-key-m">${lab(k.m)}</b><div><p>${list(k.m.red.includes(team) ? k.m.red : k.m.blue)} <span class="muted">vs</span> ${list(k.m.red.includes(team) ? k.m.blue : k.m.red)}</p>
            <small>Win chance <b>${pc(k.pWin)}</b>${k.ifWin != null && k.ifLoss != null ? ` · Top ${K} chance: ${pc(k.ifWin)} if we win, ${pc(k.ifLoss)} if we lose` : ""}</small></div>
            <span class="sc-swing" title="How much this match moves our captain chance">${k.swing > 0.005 ? `±${Math.round(k.swing * 100)}` : "—"}</span></div>`).join("")}</div>` : ""}
      </div>
      <div class="sc-table-wrap"><table class="sc-table sc-proj"><thead><tr><th scope="col"><span>Team</span></th><th scope="col"><span>Now</span></th><th scope="col"><span>${done ? "Final" : "Projected"}</span></th><th scope="col"><span>Likely range</span></th><th scope="col"><span>Top ${K}</span></th></tr></thead>
        <tbody>${P.rows.map((r) => `<tr class="${r.n === team ? "us" : ""}" data-team="${r.n}" tabindex="0"><th scope="row"><b>${r.n}</b><small>${esc(r.name)}</small></th>
          <td>${r.cur.g ? `${r.cur.w}-${r.cur.l}-${r.cur.t}${r.cur.rank ? ` <small>#${r.cur.rank}</small>` : ""}` : "—"}</td>${!P.left && !r.cur.g ? `<td class="num muted">Didn't play</td><td class="num">—</td>` : `<td class="num strong">#${r.mid}</td><td class="num">${r.lo === r.hi ? `#${r.lo}` : `#${r.lo}–${r.hi}`}</td>`}
          <td><div class="sc-bar" role="img" aria-label="${pc(r.top)}"><i style="width:${Math.round(r.top * 100)}%"></i><span>${pc(r.top)}</span></div></td></tr>`).join("")}</tbody></table></div>
      <p class="fine">An estimate, not a promise. ${done ? "" : `It plays the remaining ${P.left} matches 2,000 times using each team's OPR and how much their scores usually swing. `}${P.official ? `It starts from FTC's official ranking score and tiebreakers. At this event, winning a match has been worth about ${P.winRP.toFixed(1)} more ranking points than losing (the win plus the bonuses winners tend to earn), and each team keeps earning its usual extra ranking points.` : "No official rankings yet, so it counts 2 points for a win and 1 for a tie."} Robot breakdowns and surrogate matches aren't modeled.</p>`;
    $("[data-k]", body).addEventListener("change", (e) => { S.captains = Number(e.target.value); save(); viewProjection(); });
    $$("[data-team]", body).forEach((r) => { r.addEventListener("click", () => teamDialog(Number(r.dataset.team))); r.addEventListener("keydown", (e) => { if (e.key === "Enter") teamDialog(Number(r.dataset.team)); }); });
  }
  function matchRow(m) {
    const side = (list, score, color) => `<div class="sc-al ${color}">${list.map((n) => `<button type="button" class="sc-tm${n === team ? " us" : ""}" data-team="${n}"><b>${n}</b><small>${fmt1(oprOf(n))}</small></button>`).join("")}<span class="sc-score">${score ?? `~${Math.round(list.reduce((s, n) => s + oprOf(n), 0))}`}</span></div>`;
    const done = m.rs != null, rWin = done && m.rs > m.bs, bWin = done && m.bs > m.rs;
    const label = m.level === "Quals" ? `Q${m.n}` : `${m.level === "DoubleElim" || m.level === "Playoffs" ? "Playoff" : m.level} ${m.series || m.n}`;
    const time = m.time ? new Date(m.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
    return `<div class="sc-match ${done ? "done" : ""}"><div class="sc-mlabel"><b>${label}</b><small>${done ? "Final" : time || "Scheduled"}</small></div>${side(m.red, m.rs, `red${rWin ? " win" : ""}`)}${side(m.blue, m.bs, `blue${bWin ? " win" : ""}`)}</div>`;
  }
  function viewMatches() {
    const body = $("[data-body]", host), ours = ev.teams.some((t) => t.n === team);
    const list = ev.matches.filter((m) => !S.onlyOurs || !ours || m.red.includes(team) || m.blue.includes(team));
    body.innerHTML = `
      <div class="sc-tools">${ours ? `<label class="sc-check"><input type="checkbox" data-only ${S.onlyOurs ? "checked" : ""}> Only Steel Surge's matches</label>` : `<span class="muted">Steel Surge isn't at this event.</span>`}<span class="sc-legend">Numbers under teams are OPR. Before a match, “~” is the predicted score (the alliance's OPRs added up).</span></div>
      ${list.length ? `<div class="sc-matches">${list.map(matchRow).join("")}</div>` : `<div class="sc-card sc-empty">The match schedule isn't posted yet. It usually appears on FTCScout the morning of the event. Press Refresh then.</div>`}`;
    $("[data-only]", body)?.addEventListener("change", (e) => { S.onlyOurs = e.target.checked; save(); viewMatches(); });
    $$("[data-team]", body).forEach((b) => b.addEventListener("click", () => teamDialog(Number(b.dataset.team))));
  }

  /* ---- Pick list ---- */
  function viewPicks() {
    const body = $("[data-body]", host), W = S.weights;
    const score = (t) => {
      const nt = S.notes[evKey()]?.[t.n] || {};
      let s = W.auto * (t.auto ?? 0) + W.dc * (t.dc ?? 0);
      if (W.notes) { if (nt.rel) s += (nt.rel - 3) * 3 * W.notes; if (nt.want) s += 6 * W.notes; if (nt.avoid) s -= 1000; }
      const cs = consOf(t.n)?.score; if (W.cons && cs != null) s += (cs - 50) * 0.3 * W.cons;
      return s;
    };
    const list = ev.teams.filter((t) => t.n !== team).map((t) => ({ t, s: score(t) })).sort((a, b) => b.s - a.s);
    const ps = S.picks[evKey()] ||= {};
    body.innerHTML = `
      <div class="sc-card sc-weights">
        <p>Rank partners by what <b>your</b> robot needs. If you're strong in TeleOp, weigh autonomous more.</p>
        <div class="sc-sliders">
          <label><span>Autonomous</span><input type="range" min="0" max="2" step="0.25" value="${W.auto}" data-w="auto"><b>${W.auto}×</b></label>
          <label><span>TeleOp</span><input type="range" min="0" max="2" step="0.25" value="${W.dc}" data-w="dc"><b>${W.dc}×</b></label>
          <label><span>My notes</span><input type="range" min="0" max="2" step="0.5" value="${W.notes}" data-w="notes"><b>${W.notes}×</b></label>
          <label><span>Consistency</span><input type="range" min="0" max="2" step="0.25" value="${W.cons}" data-w="cons"><b>${W.cons}×</b></label>
        </div>
        <p class="fine">“My notes” adds your reliability stars and ★ partners and drops teams marked Avoid. “Consistency” favors teams whose matches don't swing much. Cross teams off as they're picked during selection.</p>
      </div>
      <ol class="sc-picks">${list.map(({ t, s }, i) => `<li class="${ps[t.n] || ""}"><span class="sc-rankno">${i + 1}</span><button type="button" class="sc-pname" data-team="${t.n}"><b>${t.n}</b><small>${esc(t.name)}</small></button>
        <span class="sc-pstat">Auto ${fmt1(t.auto)} · TeleOp ${fmt1(t.dc)}${consOf(t.n)?.score != null ? ` · ${steadyLabel(consOf(t.n).score)}` : ""}${S.notes[evKey()]?.[t.n]?.rel ? ` · ${"★".repeat(S.notes[evKey()][t.n].rel)}` : ""}</span><b class="sc-pscore">${fmt1(s)}</b>
        <span class="sc-pbtns"><button type="button" class="btn sm ghost" data-pick="${t.n}" data-st="picked" title="Picked by someone">${ps[t.n] === "picked" ? "Undo" : "Taken"}</button></span></li>`).join("")}</ol>
      <div class="sc-foot"><button type="button" class="btn ghost sm" data-clearpicks>Clear crossed-off teams</button></div>`;
    $$("[data-w]", body).forEach((r) => r.addEventListener("input", () => { S.weights[r.dataset.w] = Number(r.value); save(); viewPicks(); $(`[data-w="${r.dataset.w}"]`, host)?.focus(); }));
    $$("[data-pick]", body).forEach((b) => b.addEventListener("click", () => { const n = b.dataset.pick; ps[n] = ps[n] === "picked" ? "" : "picked"; save(); viewPicks(); }));
    $$("[data-team]", body).forEach((b) => b.addEventListener("click", () => teamDialog(Number(b.dataset.team))));
    $("[data-clearpicks]", body).addEventListener("click", () => { S.picks[evKey()] = {}; save(); viewPicks(); });
  }

  /* ---- Sharing notes between scouts (no server: the notes ride in the link) ---- */
  const b64u = { enc: (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), dec: (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)) };
  async function pack(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) { try { return "z" + b64u.enc(new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer())); } catch {} }
    return "p" + b64u.enc(bytes);
  }
  async function unpack(t) { const bytes = b64u.dec(t.slice(1)); const raw = t[0] === "z" ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer() : bytes; return JSON.parse(new TextDecoder().decode(raw)); }
  function merge(key, incoming) {
    const mine = S.notes[key] ||= {}; let n = 0;
    for (const [team, x] of Object.entries(incoming || {})) {
      const m = mine[team] ||= {};
      for (const k of ["drive", "auton"]) if (!m[k] && x[k]) m[k] = x[k];
      if (x.text && !(m.text || "").includes(x.text)) m.text = m.text ? `${m.text}\n${x.text}` : x.text;
      m.strong = [...new Set([...(m.strong || []), ...(x.strong || [])])];
      if (x.rel && !m.rel) m.rel = x.rel;
      if (x.want) m.want = true; if (x.avoid && !m.want) m.avoid = true;
      const seen = new Set((m.matches || []).map((q) => `${q.m}|${q.text}`));
      for (const q of x.matches || []) if (!seen.has(`${q.m}|${q.text}`)) (m.matches ||= []).push(q);
      n++;
    }
    return n;
  }
  async function importNotes(packed) {
    try {
      const data = await unpack(packed);
      if (!data?.key || !data.notes) throw new Error();
      const n = merge(data.key, data.notes); const [y, c] = data.key.split(":");
      S.last = { season: Number(y), code: c }; save();
      history.replaceState(null, "", "#scout");
      toast(`Added notes on ${n} team${n === 1 ? "" : "s"} from ${data.from || "another scout"}.`);
    } catch { toast("That notes link looks broken."); }
  }
  function viewShare() {
    const body = $("[data-body]", host), notes = S.notes[evKey()] || {}, count = Object.keys(notes).filter((n) => hasNotes(Number(n))).length;
    body.innerHTML = `<div class="sc-card sc-share">
      <h3>Share notes with your other scouts</h3>
      <p class="muted">There's no server, so notes stay on each phone. To combine them, send a link: when a teammate opens it, your notes are <b>added</b> to theirs (nothing is overwritten).</p>
      <p><b>${count}</b> team${count === 1 ? "" : "s"} with notes on this phone for ${esc(ev.name)}.</p>
      <label class="field"><span>Your name (shows when they import)</span><input class="input" data-from maxlength="30" value="${esc(S.from || "")}" placeholder="e.g. Nathan"></label>
      <div class="sc-share-btns"><button type="button" class="btn primary" data-sharelink ${count ? "" : "disabled"}>${I.link} Copy notes link</button><button type="button" class="btn" data-dl ${count ? "" : "disabled"}>Download a backup</button><label class="btn ghost">Import a backup<input type="file" accept=".json,application/json" hidden data-ul></label></div>
      <p class="fine">Links include only scouting notes for this event, never anything else on your phone.</p></div>`;
    $("[data-from]", body).addEventListener("input", (e) => { S.from = e.target.value.trim(); save(); });
    $("[data-sharelink]", body).addEventListener("click", async () => {
      const url = `${location.origin}${location.pathname}#scout-notes=${await pack({ key: evKey(), from: S.from || "", notes })}`;
      try { await navigator.clipboard.writeText(url); toast("Notes link copied. Send it to your scouts."); } catch { prompt("Copy this link:", url); }
    });
    $("[data-dl]", body).addEventListener("click", () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ key: evKey(), from: S.from || "", notes }, null, 2)], { type: "application/json" })); a.download = `scouting-${ev.code}.json`; document.body.append(a); a.click(); a.remove(); });
    $("[data-ul]", body).addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { const d = JSON.parse(await f.text()); if (!d.key || !d.notes) throw 0; const n = merge(d.key, d.notes); save(); toast(`Added notes on ${n} teams.`); draw(); } catch { toast("That file isn't a scouting backup."); }
    });
  }
})();
