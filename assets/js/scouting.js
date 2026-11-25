/* ==========================================================================
   Steel Surge — Event scouting (Match tools page, "Event scouting" tab)
   Live team stats from FTCScout for any FTC event, notes saved on this
   phone, match schedule with predicted scores, and an alliance pick list.
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
  const S = Object.assign({ last: null, notes: {}, picks: {}, weights: { auto: 1, dc: 1, notes: 1 }, view: "teams", onlyOurs: true, sort: ["opr", -1] }, load());
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
  const tabs = $$(".mt-tab"), panels = { calc: $("#mt-calc"), scout: $("#mt-scout") };
  let started = false;
  function setTab(t, push = true) {
    if (!panels[t]) t = "calc";
    tabs.forEach((b) => { const on = b.dataset.mt === t; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    for (const [k, p] of Object.entries(panels)) if (p) p.hidden = k !== t;
    if (push) history.replaceState(null, "", t === "scout" ? "#scout" : location.pathname + location.search);
    if (t === "scout" && !started) { started = true; start(); }
  }
  tabs.forEach((b) => b.addEventListener("click", () => setTab(b.dataset.mt)));
  $(".mt-tabs")?.addEventListener("keydown", (e) => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; const i = tabs.findIndex((b) => b.getAttribute("aria-selected") === "true"); const n = tabs[(i + 1) % tabs.length]; n.focus(); setTab(n.dataset.mt); });
  document.addEventListener("ss:ready", (e) => {
    const c = e.detail; if (!c) return;
    if (window.SS?.controls?.(c).scouting === false) { $(".mt-tabs")?.remove(); panels.scout?.remove(); delete panels.scout; setTab("calc", false); }
  });
  if (/^#scout/.test(location.hash)) setTab("scout", false);

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
    const stats = `... on TeamEventStats${season} { rank wins losses ties qualMatchesPlayed opr { totalPointsNp autoPoints dcPoints } avg { totalPointsNp } max { totalPointsNp } }`;
    const d = await gql(`{ eventByCode(season:${season}, code:"${code.toUpperCase()}") { name code start end location { venue city state } teams { teamNumber team { name } stats { ${stats} } }
      matches { matchNum tournamentLevel series scheduledStartTime teams { teamNumber alliance } scores { ... on MatchScores${season} { red { totalPoints } blue { totalPoints } } } } } }`);
    const ev = d?.eventByCode;
    if (!ev) throw new Error(`FTCScout has no event ${code.toUpperCase()} in the ${seasonLabel(season)} season. Check the code on ftcscout.org.`);
    const teams = ev.teams.map((t) => ({
      n: t.teamNumber, name: t.team?.name || "", rank: t.stats?.rank ?? null, w: t.stats?.wins ?? null, l: t.stats?.losses ?? null, t: t.stats?.ties ?? null, played: t.stats?.qualMatchesPlayed ?? 0,
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
      <div class="sc-views" role="tablist" aria-label="Scouting views">${[["teams", "Teams"], ["matches", ours ? "Our matches" : "Matches"], ["picks", "Pick list"], ["share", "Share notes"]].map(([k, l]) => `<button type="button" role="tab" aria-selected="${S.view === k}" data-view="${k}">${l}</button>`).join("")}</div>
      <div class="sc-body" data-body></div>
      <dialog class="sc-dialog" data-dialog></dialog>`;
    $("[data-refresh]", host).addEventListener("click", () => refresh());
    $("[data-change]", host).addEventListener("click", () => { S.last = null; save(); picker(); });
    $$("[data-view]", host).forEach((b) => b.addEventListener("click", () => { S.view = b.dataset.view; save(); draw(); }));
    ({ teams: viewTeams, matches: viewMatches, picks: viewPicks, share: viewShare }[S.view] || viewTeams)();
  }

  /* ---- Teams ---- */
  const COLS = [["n", "Team"], ["rank", "Rank"], ["rec", "W-L-T"], ["opr", "OPR"], ["auto", "Auto"], ["dc", "TeleOp"], ["avg", "Avg"], ["max", "Best"]];
  function viewTeams() {
    const body = $("[data-body]", host);
    body.innerHTML = `
      <div class="sc-tools"><input class="input" type="search" placeholder="Search team number or name" data-q aria-label="Search teams"><label class="sc-check"><input type="checkbox" data-noted> Only teams I've noted</label></div>
      <div class="sc-table-wrap"><table class="sc-table"><thead><tr>${COLS.map(([k, l]) => `<th scope="col"><button type="button" data-sort="${k}" class="${S.sort[0] === k ? "on" : ""}">${l}${S.sort[0] === k ? (S.sort[1] > 0 ? " ▲" : " ▼") : ""}</button></th>`).join("")}<th scope="col"><span class="sr-only">Notes</span></th></tr></thead><tbody data-rows></tbody></table></div>
      <p class="fine">OPR estimates how many points a team adds to its alliance per match (penalties left out). Tap a team to add notes.</p>`;
    const rows = () => {
      const q = $("[data-q]", body).value.trim().toLowerCase(), noted = $("[data-noted]", body).checked, [k, dir] = S.sort;
      const val = (t) => (k === "n" ? t.n : k === "rank" ? (t.rank ?? 9999) : k === "rec" ? (t.w ?? -1) * 100 - (t.l ?? 0) : t[k] ?? -9999);
      const list = ev.teams.filter((t) => (!q || String(t.n).includes(q) || t.name.toLowerCase().includes(q)) && (!noted || hasNotes(t.n)))
        .sort((a, b) => (val(a) - val(b)) * dir || a.n - b.n);
      $("[data-rows]", body).innerHTML = list.map((t) => {
        const nt = S.notes[evKey()]?.[t.n] || {}, ps = pickState(t.n);
        return `<tr class="${t.n === team ? "us" : ""} ${ps}" data-team="${t.n}" tabindex="0">
          <th scope="row"><b>${t.n}</b><small>${esc(t.name)}</small></th>
          <td>${t.rank ?? "—"}</td><td>${t.w != null ? `${t.w}-${t.l}-${t.t}` : "—"}</td>
          <td class="num strong">${fmt1(t.opr)}${t.src === "season" && ev.teams.some((x) => x.src === "event") ? '<i title="Season numbers">·</i>' : ""}</td><td class="num">${fmt1(t.auto)}</td><td class="num">${fmt1(t.dc)}</td><td class="num">${fmt1(t.avg)}</td><td class="num">${t.max ?? "—"}</td>
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
        </div>
        <p class="fine">“My notes” adds your reliability stars and ★ partners and drops teams marked Avoid. Cross teams off as they're picked during selection.</p>
      </div>
      <ol class="sc-picks">${list.map(({ t, s }, i) => `<li class="${ps[t.n] || ""}"><span class="sc-rankno">${i + 1}</span><button type="button" class="sc-pname" data-team="${t.n}"><b>${t.n}</b><small>${esc(t.name)}</small></button>
        <span class="sc-pstat">Auto ${fmt1(t.auto)} · TeleOp ${fmt1(t.dc)}${S.notes[evKey()]?.[t.n]?.rel ? ` · ${"★".repeat(S.notes[evKey()][t.n].rel)}` : ""}</span><b class="sc-pscore">${fmt1(s)}</b>
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
