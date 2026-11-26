/* ==========================================================================
   Steel Surge — FTC page
   Split from site.js: only pages that need it load it. Shared helpers come
   from site.js through window.SS._.
   ========================================================================== */
(() => {
  "use strict";
  const { $, $$, ASSET_V, EVENT_KINDS, ICON, controls, currentSeason, esc, ftcFetch, loadFTC, pages, params, parseDate, seasonLabel, url } = window.SS._;

  /* ---------------- FTC around the world (FTC page) ----------------
     Live from FTCScout: teams and matches this season, and the events happening today
     (or the next day that has events). Loads when the section scrolls into view. */
  function ftcLive(c) {
    const host = $("#ftc-live"); if (!host) return;
    let started = false; const go = () => { if (started) return; started = true; io.disconnect(); load(); };
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) go(); }, { rootMargin: "300px" });
    io.observe(host.closest("section") || host.parentElement); // the strip itself is hidden until it has data
    setTimeout(go, 6000); // in case the browser never reports it on screen (background tabs, some old browsers)
    const pad = (n) => String(n).padStart(2, "0"), dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const home = (String(c.team.location || "").match(/,\s*([A-Z]{2})\b/) || [])[1] || "";
    async function load() {
      const season = currentSeason(), days = Array.from({ length: 8 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });
      const cacheKey = `ss-ftc-live-${dayKey(days[0])}`;
      let data = null;
      try { const c0 = JSON.parse(sessionStorage.getItem(cacheKey)); if (c0 && Date.now() - c0.at < 600000) data = c0; } catch {}
      if (!data) {
        const fields = "season code name type start end location { city state country }";
        const q = `{ teams: activeTeamsCount(season:${season}) matches: matchesPlayedCount(season:${season}) ${days.map((d, i) => `d${i}: eventsOnDate(date:"${dayKey(d)}T12:00:00Z") { ${fields} }`).join(" ")} }`;
        try {
          const j = await ftcFetch("/graphql", { query: q });
          if (!j?.data) throw new Error("no data");
          data = { at: Date.now(), teams: j.data.teams, matches: j.data.matches, days: days.map((d, i) => ({ day: dayKey(d), events: (j.data[`d${i}`] || []).filter((e) => e.type !== "Practice") })) };
          try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
        } catch { return; }
      }
      draw(data, season);
    }
    function draw(d, season) {
      const today = d.days[0], next = d.days.slice(1).find((x) => x.events.length), show = today.events.length ? today : next;
      const label = (k) => { const x = parseDate(k); return x.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }); };
      const where = (e) => [e.location?.city, e.location?.country === "USA" ? e.location?.state : [e.location?.state, e.location?.country].filter(Boolean).join(", ")].filter(Boolean).join(", ");
      const rankOf = (e) => (home && e.location?.state === home && e.location?.country === "USA" ? 0 : e.location?.country === "USA" ? 1 : 2);
      const list = show ? [...show.events].sort((a, b) => rankOf(a) - rankOf(b) || a.name.localeCompare(b.name)) : [];
      const countries = {}; for (const e of list) { const k = e.location?.country || "Other"; countries[k] = (countries[k] || 0) + 1; }
      const top = Object.entries(countries).sort((a, b) => b[1] - a[1]);
      const dayOf = (e) => (e.end && e.end !== e.start ? ` · Day ${Math.round((parseDate(show.day) - parseDate(String(e.start).slice(0, 10))) / 864e5) + 1} of ${Math.round((parseDate(String(e.end).slice(0, 10)) - parseDate(String(e.start).slice(0, 10))) / 864e5) + 1}` : "");
      const tile = (v, l) => `<div class="ftc-live-stat"><b>${Number(v).toLocaleString()}</b><span>${l}</span></div>`;
      const busiest = d.days.slice(1).reduce((b, x) => (x.events.length > (b?.events.length || 0) ? x : b), null);
      host.innerHTML = `
        <div class="ftc-live-head"><span class="ftc-live-dot" aria-hidden="true"></span><h3>FTC around the world</h3><small>Live from <a href="https://ftcscout.org" target="_blank" rel="noopener">FTCScout</a> · updated ${new Date(d.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></div>
        <div class="ftc-live-stats">${tile(d.teams || 0, `teams competing in ${seasonLabel(season)}`)}${tile(d.matches || 0, "matches played so far this season")}${tile(today.events.length, today.events.length === 1 ? "event happening today" : "events happening today")}</div>
        ${show ? `<div class="ftc-live-today">
          <div class="ftc-live-sub"><b>${show === today ? "Happening today" : `Next up: ${esc(label(show.day))}`}</b><span>${list.length} event${list.length === 1 ? "" : "s"}${top.length > 1 ? ` in ${top.length} countries` : ""}: ${top.slice(0, 5).map(([k, n]) => `${esc(k === "USA" ? "United States" : k)} ${n}`).join(" · ")}</span></div>
          <ul class="ftc-live-list">${list.slice(0, 8).map((e) => `<li><a href="https://ftcscout.org/events/${esc(e.season)}/${esc(e.code)}" target="_blank" rel="noopener"><b>${esc(e.name)}</b><span>${esc(where(e))} · ${esc(EVENT_KINDS[e.type] || e.type || "Event")}${show === today ? esc(dayOf(e)) : ""}</span></a>${home && rankOf(e) === 0 ? `<i class="tag ok">Near us</i>` : ""}</li>`).join("")}</ul>
          <div class="ftc-live-foot">${busiest && busiest !== show && busiest.events.length > list.length ? `<span>Busiest day this week: <b>${esc(label(busiest.day))}</b>, ${busiest.events.length} events</span>` : ""}
          ${list.length > 8 ? `<a class="link-arrow" href="https://ftcscout.org/events/${season}" target="_blank" rel="noopener">See all ${list.length} on FTCScout ${ICON.arrow}</a>` : ""}</div>
        </div>` : `<p class="muted ftc-live-quiet">No FTC events in the next week. Most events run on Saturdays from November to March.</p>`}`;
      host.hidden = false;
    }
  }

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
    ftcLive(c);
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
})();
