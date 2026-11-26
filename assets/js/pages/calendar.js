/* ==========================================================================
   Steel Surge — Season calendar (home and Team pages)
   Split from site.js: only pages that need it load it. Shared helpers come
   from site.js through window.SS._.
   ========================================================================== */
(() => {
  "use strict";
  const { $, EVENT_KINDS, ICON, MONTHS, esc, fmtDate, initReveal, pages, parseDate, toast } = window.SS._;

  /* ---------------- Season calendar ----------------
     Competitions come from FTCScout as soon as the team registers; the team adds
     everything else (demos, kickoff parties, open houses) in the editor. */
  const dayOnly = (d) => String(d || "").slice(0, 10);
  function calendarEvents(c, ftc) {
    const today = new Date().toISOString().slice(0, 10), place = (...p) => p.filter(Boolean).join(" · ");
    const comps = (ftc?.upcoming || []).map((e) => ({ id: `ftc-${e.season}-${e.code}`, title: e.name, start: dayOnly(e.start), end: dayOnly(e.end || e.start), place: place(e.venue, [e.city, e.state].filter(Boolean).join(", ")),
      kind: EVENT_KINDS[e.type] || "Competition", comp: true, link: `https://ftcscout.org/events/${e.season}/${e.code}`, detail: `FTC team ${c.team.number} (${c.team.name}) is competing. Follow it live on FTCScout.` }));
    const own = (c.calendar || []).filter((e) => e.date && e.title).map((e, i) => ({ id: `ss-${e.date}-${i}`, title: e.title, start: dayOnly(e.date), end: dayOnly(e.end || e.date), time: e.time || "", endTime: e.endTime || "", place: e.place || "",
      kind: e.kind || "Team event", comp: false, link: e.link || "", detail: e.detail || "" }));
    return [...comps, ...own].filter((e) => e.start && (e.end || e.start) >= today).sort((a, b) => (a.start + (a.time || "")).localeCompare(b.start + (b.time || "")));
  }
  // Calendar files and Google links live in ics.js (loaded on the home and Team pages)
  const icsFile = (events) => window.SSCalendar.icsFile(events);
  function downloadIcs(events, name) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([icsFile(events)], { type: "text/calendar" })); a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("Calendar file downloaded. Open it to add the event.");
  }
  const googleCal = (e) => window.SSCalendar.googleCal(e);
  const fmtTime = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
  const whenText = (e) => { const multi = e.end && e.end !== e.start; return `${fmtDate(e.start)}${multi ? ` – ${fmtDate(e.end)}` : ""}${e.time ? ` · ${fmtTime(e.time)}${e.endTime ? `–${fmtTime(e.endTime)}` : ""}` : ""}`; };
  /** "Add to calendar" buttons for one event. */
  const calButtons = (e) => !window.SSCalendar ? "" : `<div class="cal-add"><a class="btn sm" href="${esc(googleCal(e))}" target="_blank" rel="noopener">${ICON.plus || "+"} Google Calendar</a><button class="btn sm ghost" type="button" data-ics="${esc(e.id)}">Apple / Outlook (.ics)</button></div>`;
  function wireCalButtons(host, events) {
    host.querySelectorAll("[data-ics]").forEach((b) => b.addEventListener("click", () => { const e = events.find((x) => x.id === b.dataset.ics); if (e) downloadIcs([e], `${e.title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "event"}.ics`); }));
  }
  function renderCalendar(c, ftc) {
    const host = $("#calendar-list"); if (!host) return;
    // ics.js loads just after this script: draw again once it's there, so the add-to-calendar buttons appear
    if (!window.SSCalendar && document.readyState !== "complete") addEventListener("load", () => renderCalendar(c, ftc), { once: true });
    const evs = calendarEvents(c, ftc);
    host.innerHTML = evs.length ? evs.map((e) => { const d = parseDate(e.start); return `
      <article class="event cal-event reveal${e.comp ? " is-comp" : ""}">
        <div class="event-date"><b>${d.getDate()}</b><span>${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}</span></div>
        <div class="cal-info"><span class="tag${e.comp ? " ok" : ""}">${esc(e.kind)} · ${esc(nextLabel(e))}</span><h3>${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.title)}</a>` : esc(e.title)}</h3>
          <p>${esc(whenText(e))}${e.place ? ` · ${esc(e.place)}` : ""}</p>${!e.comp && e.detail ? `<p class="cal-detail">${esc(e.detail)}</p>` : ""}</div>
        ${calButtons(e)}
      </article>`; }).join("")
      : `<div class="empty-state">${ICON.flag}<p>Nothing on the calendar yet. Competitions show up here as soon as we register for them.</p></div>`;
    const all = $("#calendar-all");
    if (all) { all.hidden = evs.length < 2; all.onclick = () => downloadIcs(evs, "steel-surge-events.ics"); }
    wireCalButtons(host, evs); initReveal(host);
  }

  const daysUntil = (d) => Math.round((parseDate(d) - new Date(new Date().toDateString())) / 86400000);
  const nextLabel = (e) => { const n = daysUntil(e.start); return n < 0 ? "Happening now" : n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`; };
  Object.assign(window.SS._, { calendarEvents, calButtons, wireCalButtons, renderCalendar, nextLabel, daysUntil });
})();
