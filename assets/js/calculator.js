/* ==========================================================================
   Steel Surge — FTC score calculator
   Renders a calculator for any season in calc-data.js: tap what your alliance
   scored, see the live total, breakdown, and ranking points. State is saved
   per season on this device and can be shared as a link.
   ========================================================================== */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SEASONS = window.CALC_SEASONS || [];
  const seasonLabel = (y) => `${y}–${String(y + 1).slice(2)}`;
  const now = new Date(), CURRENT = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const PERIOD_COLORS = { auto: "#3ba8ff", teleop: "#3ddc97", end: "#ffb547", fouls: "#c38bff" };

  let season, state;
  const blank = (sn) => {
    const v = {};
    for (const p of sn.periods) for (const it of p.items) v[it.id] = it.type === "count" ? 0 : it.type === "toggle" ? false : it.type === "robots" ? [false, false] : it.slots.map(() => 0);
    return { v, fouls: { oppMinor: 0, oppMajor: 0, ownMinor: 0, ownMajor: 0 }, opp: "" };
  };
  const allItems = (sn) => sn.periods.flatMap((p) => p.items.map((it) => ({ ...it, period: p.id })));
  function itemPoints(it, val) {
    if (it.type === "count") return (+val || 0) * it.pts;
    if (it.type === "toggle") return val ? it.pts : 0;
    if (it.type === "robots") return val.filter(Boolean).length * it.pts;
    return val.reduce((a, idx) => a + (it.options[idx]?.[1] || 0), 0);
  }
  function compute() {
    const items = allItems(season), by = { auto: 0, teleop: 0, end: 0 }, pointsOf = {};
    for (const it of items) { const p = itemPoints(it, state.v[it.id]); pointsOf[it.id] = p; by[it.period] += p; }
    const bonuses = season.bonus ? season.bonus(state.v) : [];
    for (const b of bonuses) by[b.period] += b.pts;
    const f = season.fouls, F = state.fouls;
    const credit = f.mode === "credit" ? F.oppMinor * f.minor + F.oppMajor * f.major : 0;
    const deduct = f.mode === "deduct" ? F.ownMinor * f.minor + F.ownMajor * f.major : 0;
    const given = f.mode === "credit" ? F.ownMinor * f.minor + F.ownMajor * f.major : 0;
    // In the seasons where fouls came off your own score, official scores never went below zero
    const total = Math.max(0, by.auto + by.teleop + by.end + credit - deduct);
    const s = (id) => pointsOf[id] || 0;
    const rps = (season.rp || []).map((r) => ({ ...r, met: !!r.ok(state.v, s) }));
    return { by, bonuses, credit, deduct, given, total, rps };
  }

  /* ---------------- Rendering ---------------- */
  const minus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>';
  const plus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';
  const info = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>';

  function counter(id, val, max, label) {
    return `<div class="calc-step" data-step="${id}"><button type="button" class="calc-btn" data-d="-1" aria-label="Fewer ${esc(label)}" ${val <= 0 ? "disabled" : ""}>${minus}</button>
      <input type="number" inputmode="numeric" min="0" max="${max}" value="${val}" aria-label="${esc(label)}">
      <button type="button" class="calc-btn" data-d="1" aria-label="More ${esc(label)}" ${val >= max ? "disabled" : ""}>${plus}</button></div>`;
  }
  function itemHtml(it) {
    const val = state.v[it.id], pts = itemPoints(it, val);
    const help = it.help ? `<button type="button" class="calc-help" aria-label="About ${esc(it.label)}" aria-expanded="false">${info}</button>` : "";
    let control = "";
    if (it.type === "count") control = counter(it.id, val, it.max, it.label);
    else if (it.type === "toggle") control = `<button type="button" class="calc-toggle${val ? " on" : ""}" data-toggle="${it.id}" aria-pressed="${val}">${val ? check + " Yes" : "No"}</button>`;
    else if (it.type === "robots") control = `<div class="calc-robots">${val.map((on, i) => `<button type="button" class="calc-robot${on ? " on" : ""}" data-robot="${it.id}" data-i="${i}" aria-pressed="${on}">${on ? check : ""}Robot ${i + 1}</button>`).join("")}</div>`;
    else control = `<div class="calc-slots">${it.slots.map((slot, si) => `<div class="calc-slot" role="radiogroup" aria-label="${esc(it.label)}: ${esc(slot)}"><span>${esc(slot)}</span><div class="calc-opts">${it.options.map(([lab, p], oi) => `<button type="button" role="radio" aria-checked="${val[si] === oi}" data-slot="${it.id}" data-s="${si}" data-o="${oi}">${esc(lab)}${p ? `<small>${p}</small>` : ""}</button>`).join("")}</div></div>`).join("")}</div>`;
    const each = it.type === "slots" ? "" : `<span class="calc-each">${it.pts} pt${it.pts === 1 ? "" : "s"}${it.type === "count" ? " each" : it.type === "robots" ? " per robot" : ""}</span>`;
    return `<div class="calc-item${pts ? " scored" : ""}" data-item="${it.id}">
      <div class="calc-item-head"><div class="calc-item-label"><b>${esc(it.label)}</b>${each}${help}</div><span class="calc-item-pts">${pts ? `+${pts}` : "0"}</span></div>
      ${it.help ? `<p class="calc-help-text" hidden>${esc(it.help)}</p>` : ""}
      ${control}</div>`;
  }

  function renderSeason() {
    const sel = $("#calc-select");
    sel.innerHTML = SEASONS.map((s) => `<option value="${s.year}"${s.year === season.year ? " selected" : ""}>${seasonLabel(s.year)} · ${esc(s.name)}${s.year === CURRENT ? " (current)" : ""}</option>`).join("");
    $("#calc-chips").innerHTML = SEASONS.map((s) => `<button type="button" class="calc-chip" data-year="${s.year}" aria-pressed="${s.year === season.year}"><b>${esc(s.name)}</b><span>${seasonLabel(s.year)}${s.year === CURRENT ? " · Current" : ""}</span></button>`).join("");
    $("#calc-periods").innerHTML = season.periods.map((p) => `
      <section class="calc-period" data-period="${p.id}" style="--pc:${PERIOD_COLORS[p.id]}">
        <header><div><h2>${esc(p.label)}</h2><p>${esc(p.sub || "")}</p></div><span class="calc-period-pts" data-ppts="${p.id}">0</span></header>
        <div class="calc-items">${p.items.map(itemHtml).join("")}</div>
        <div class="calc-bonus" data-bonus="${p.id}"></div>
      </section>`).join("") + foulsHtml();
    $(".calc-chip[aria-pressed=true]")?.scrollIntoView({ block: "nearest", inline: "center" });
    $("#calc-season-name").textContent = `${season.name} · ${seasonLabel(season.year)}`;
    $("#calc-learn").href = `ftc.html?season=${season.year}#games`;
    update();
  }
  function foulsHtml() {
    const f = season.fouls, F = state.fouls;
    const credit = f.mode === "credit";
    return `<section class="calc-period calc-fouls" style="--pc:${PERIOD_COLORS.fouls}">
      <header><div><h2>Fouls</h2><p>${credit ? `Fouls give points to the other alliance: minor ${f.minor}, major ${f.major}.` : `This season, fouls were subtracted from the offending alliance's own score: minor ${f.minor}, major ${f.major}.`}</p></div><span class="calc-period-pts" data-ppts="fouls">0</span></header>
      <div class="calc-items">
        ${credit ? `
          <div class="calc-item"><div class="calc-item-head"><div class="calc-item-label"><b>Minor fouls by the other alliance</b><span class="calc-each">+${f.minor} to you</span></div></div>${counter("oppMinor", F.oppMinor, 30, "minor fouls by the other alliance")}</div>
          <div class="calc-item"><div class="calc-item-head"><div class="calc-item-label"><b>Major fouls by the other alliance</b><span class="calc-each">+${f.major} to you</span></div></div>${counter("oppMajor", F.oppMajor, 20, "major fouls by the other alliance")}</div>
          <div class="calc-item"><div class="calc-item-head"><div class="calc-item-label"><b>Fouls by your alliance</b><span class="calc-each">These go to the other alliance</span></div></div>
            <div class="calc-fouls-own">${counter("ownMinor", F.ownMinor, 30, "minor fouls by your alliance")}<span>minor</span>${counter("ownMajor", F.ownMajor, 20, "major fouls by your alliance")}<span>major</span></div></div>`
        : `
          <div class="calc-item"><div class="calc-item-head"><div class="calc-item-label"><b>Minor fouls by your alliance</b><span class="calc-each">−${f.minor} each</span></div></div>${counter("ownMinor", F.ownMinor, 30, "minor fouls by your alliance")}</div>
          <div class="calc-item"><div class="calc-item-head"><div class="calc-item-label"><b>Major fouls by your alliance</b><span class="calc-each">−${f.major} each</span></div></div>${counter("ownMajor", F.ownMajor, 20, "major fouls by your alliance")}</div>`}
      </div></section>`;
  }

  function update() {
    const r = compute();
    // per-item points and states
    for (const it of allItems(season)) {
      const el = $(`[data-item="${it.id}"]`); if (!el) continue;
      const pts = itemPoints(it, state.v[it.id]);
      $(".calc-item-pts", el).textContent = pts ? `+${pts}` : "0"; el.classList.toggle("scored", !!pts);
    }
    for (const p of ["auto", "teleop", "end"]) { const el = $(`[data-ppts="${p}"]`); if (el) el.textContent = r.by[p]; }
    const fp = $('[data-ppts="fouls"]'); if (fp) fp.textContent = season.fouls.mode === "credit" ? `+${r.credit}` : r.deduct ? `−${r.deduct}` : "0";
    for (const p of season.periods) $(`[data-bonus="${p.id}"]`).innerHTML = r.bonuses.filter((b) => b.period === p.id).map((b) => `<div class="calc-bonus-row">${check}<span>${esc(b.label)}</span><b>+${b.pts}</b></div>`).join("");
    // summary
    $("#calc-total").textContent = r.total.toLocaleString();
    $("#calc-bar-total").textContent = r.total.toLocaleString();
    const parts = [["auto", "Autonomous", r.by.auto], ["teleop", "TeleOp", r.by.teleop], ["end", season.periods.find((p) => p.id === "end")?.label || "End", r.by.end]];
    if (season.fouls.mode === "credit") parts.push(["fouls", "Fouls by the other alliance", r.credit]);
    const pos = Math.max(1, parts.reduce((a, [, , v]) => a + v, 0));
    $("#calc-bar").innerHTML = parts.map(([k, , v]) => (v ? `<i style="width:${(v / pos) * 100}%;background:${PERIOD_COLORS[k]}"></i>` : "")).join("");
    $("#calc-breakdown").innerHTML = parts.map(([k, lab, v]) => `<li><span class="dot" style="background:${PERIOD_COLORS[k]}"></span>${esc(lab)}<b>${v}</b></li>`).join("")
      + (r.deduct ? `<li><span class="dot" style="background:${PERIOD_COLORS.fouls}"></span>Your fouls<b>−${r.deduct}</b></li>` : "")
      + (r.given ? `<li class="muted-row">Your fouls give the other alliance<b>+${r.given}</b></li>` : "");
    // ranking points
    const box = $("#calc-rp");
    if (season.winRP || season.rp) {
      box.hidden = false;
      const opp = state.opp === "" ? null : +state.opp;
      const result = opp == null ? null : r.total > opp ? "win" : r.total === opp ? "tie" : "loss";
      const winPts = result === "win" ? season.winRP.win : result === "tie" ? season.winRP.tie : 0;
      const bonusRP = r.rps.filter((x) => x.met).length;
      $("#calc-rp-list").innerHTML = r.rps.map((x) => `<li class="${x.met ? "met" : ""}">${x.met ? check : '<span class="ring"></span>'}<div><b>${esc(x.label)}</b><small>${esc(x.need)}</small></div></li>`).join("")
        + `<li class="${result === "win" || result === "tie" ? "met" : ""}">${result === "win" || result === "tie" ? check : '<span class="ring"></span>'}<div><b>${result === "win" ? `Win: ${season.winRP.win} RP` : result === "tie" ? `Tie: ${season.winRP.tie} RP` : result === "loss" ? "Loss: 0 RP" : "Win or tie"}</b><small>${result ? `Your ${r.total} vs. their ${opp}` : `Enter the other alliance's score below. A win is ${season.winRP.win} RP, a tie is ${season.winRP.tie}.`}</small></div></li>`;
      $("#calc-rp-total").textContent = `${bonusRP + winPts} RP`;
      $("#calc-rp-note").textContent = [season.rp ? "Bonus RP use the thresholds for regular events. Championships can set higher ones." : "", season.rpNote || ""].filter(Boolean).join(" ");
    } else box.hidden = true;
    save();
  }

  /* ---------------- Events ---------------- */
  function setCount(id, val) {
    const it = allItems(season).find((x) => x.id === id);
    const max = it ? it.max : id.endsWith("Major") ? 20 : 30;
    const n = Math.max(0, Math.min(max, Math.round(+val || 0)));
    if (it) state.v[id] = n; else state.fouls[id] = n;
    const wrap = $(`[data-step="${id}"]`);
    if (wrap) { const inp = $("input", wrap); if (+inp.value !== n) inp.value = n; $('[data-d="-1"]', wrap).disabled = n <= 0; $('[data-d="1"]', wrap).disabled = n >= max; }
    update();
  }
  function wire() {
    const root = $("#calc-periods");
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.d) { const w = b.closest("[data-step]"), id = w.dataset.step; setCount(id, (+$("input", w).value || 0) + +b.dataset.d); return; }
      if (b.dataset.toggle) { const id = b.dataset.toggle; state.v[id] = !state.v[id]; b.outerHTML = `<button type="button" class="calc-toggle${state.v[id] ? " on" : ""}" data-toggle="${id}" aria-pressed="${state.v[id]}">${state.v[id] ? check + " Yes" : "No"}</button>`; update(); return; }
      if (b.dataset.robot) { const id = b.dataset.robot, i = +b.dataset.i; state.v[id][i] = !state.v[id][i]; b.classList.toggle("on", state.v[id][i]); b.setAttribute("aria-pressed", state.v[id][i]); b.innerHTML = `${state.v[id][i] ? check : ""}Robot ${i + 1}`; update(); return; }
      if (b.dataset.slot) { const id = b.dataset.slot, si = +b.dataset.s, oi = +b.dataset.o; state.v[id][si] = oi; $$(`[data-slot="${id}"][data-s="${si}"]`).forEach((x) => x.setAttribute("aria-checked", String(+x.dataset.o === oi))); update(); return; }
      if (b.classList.contains("calc-help")) { const t = $(".calc-help-text", b.closest(".calc-item")); t.hidden = !t.hidden; b.setAttribute("aria-expanded", String(!t.hidden)); }
    });
    root.addEventListener("input", (e) => { const w = e.target.closest("[data-step]"); if (w && e.target.value !== "") setCount(w.dataset.step, e.target.value); });
    root.addEventListener("change", (e) => { const w = e.target.closest("[data-step]"); if (w) setCount(w.dataset.step, e.target.value); });
    $("#calc-select").addEventListener("change", (e) => pick(+e.target.value));
    $("#calc-chips").addEventListener("click", (e) => { const b = e.target.closest("[data-year]"); if (b) pick(+b.dataset.year); });
    $("#calc-opp").addEventListener("input", (e) => { state.opp = e.target.value === "" ? "" : Math.max(0, +e.target.value || 0); update(); });
    $("#calc-reset").addEventListener("click", () => { state = blank(season); $("#calc-opp").value = ""; renderSeason(); window.SS?.toast?.("Calculator cleared"); });
    $("#calc-share").addEventListener("click", async () => {
      const link = shareLink();
      try { await navigator.clipboard.writeText(link); window.SS?.toast?.("Link copied: anyone can open this exact score"); }
      catch { prompt("Copy this link:", link); }
    });
    $("#calc-jump").addEventListener("click", () => $("#calc-summary").scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function pick(year) {
    season = SEASONS.find((s) => s.year === year) || SEASONS[0];
    state = load(season);
    $("#calc-opp").value = state.opp;
    const u = new URL(location.href); u.searchParams.set("season", season.year); u.hash = ""; history.replaceState(null, "", u);
    renderSeason();
  }

  /* ---------------- Saving and sharing ---------------- */
  const KEY = (y) => `ss-calc-${y}`;
  function save() { store.set(KEY(season.year), state); }
  function load(sn) {
    const b = blank(sn), saved = store.get(KEY(sn.year), null);
    if (!saved) return b;
    for (const k of Object.keys(b.v)) if (saved.v && JSON.stringify(typeof saved.v[k]) === JSON.stringify(typeof b.v[k]) && (!Array.isArray(b.v[k]) || saved.v[k].length === b.v[k].length)) b.v[k] = saved.v[k];
    Object.assign(b.fouls, saved.fouls || {}); b.opp = saved.opp ?? "";
    return b;
  }
  function shareLink() {
    const u = new URL(location.href); u.search = ""; u.searchParams.set("season", season.year);
    u.hash = "s=" + btoa(JSON.stringify(state)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return u.href;
  }
  function fromHash() {
    const m = location.hash.match(/s=([\w-]+)/); if (!m) return null;
    try { return JSON.parse(atob(m[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return null; }
  }

  /* ---------------- Start ---------------- */
  function init() {
    if (!SEASONS.length || !$("#calc-periods")) return;
    const want = +new URLSearchParams(location.search).get("season");
    season = SEASONS.find((s) => s.year === want) || SEASONS.find((s) => s.year === CURRENT) || SEASONS[0];
    const shared = fromHash();
    if (shared) { store.set(KEY(season.year), shared); }
    state = load(season);
    $("#calc-opp").value = state.opp;
    wire(); renderSeason();
    if (shared) { history.replaceState(null, "", location.pathname + location.search); setTimeout(() => window.SS?.toast?.("Showing a shared score"), 300); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
