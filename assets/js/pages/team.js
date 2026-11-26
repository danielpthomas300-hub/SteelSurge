/* ==========================================================================
   Steel Surge — Team page
   Split from site.js: only pages that need it load it. Shared helpers come
   from site.js through window.SS._ (the calendar adds its own).
   ========================================================================== */
(() => {
  "use strict";
  const { $, $$, ICON, awardName, esc, fmtDate, initReveal, loadFTC, pages, url } = window.SS._;
  const { renderCalendar } = window.SS._; // pages/calendar.js

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
    renderCalendar(c, null);
    const ftc = await loadFTC(c.team.number, c.team.rookieYear).catch(() => null);
    if (ftc?.awards?.length) draw(ftc.awards);
    renderCalendar(c, ftc);
    if (location.hash === "#calendar") $("#calendar")?.scrollIntoView({ block: "start" });
    // Links to #milestones (including the old Competition page) land here once it has content
    if (location.hash === "#milestones") $("#milestones").scrollIntoView({ block: "start" });
  }
})();
