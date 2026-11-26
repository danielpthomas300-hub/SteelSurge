/* ==========================================================================
   Steel Surge — calendar files and links (used by site.js on the home and Team
   pages, tested by tools/test_features.js)
   Event: { id, title, start: "YYYY-MM-DD", end?, time?: "HH:MM", endTime?, place?, detail?, link? }
   ========================================================================== */
(function (root) {
  "use strict";
  const ymd = (d) => String(d).replace(/-/g, "");
  const nextDay = (d) => { const [y, m, day] = String(d).split("-").map(Number); const x = new Date(y, m - 1, day + 1); return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`; };
  const hm = (t) => String(t).replace(":", "").padEnd(4, "0") + "00";
  // Calendar text escapes commas, semicolons, backslashes, and line breaks
  const icsText = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
  /** One .ics file for any number of events (works with Google, Apple, and Outlook calendars).
      All-day events end the day after their last day, as the calendar format requires. */
  function icsFile(events, now = new Date()) {
    const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const fold = (line) => (line.length <= 74 ? line : line.match(/.{1,73}/g).join("\r\n "));
    const body = events.flatMap((e) => {
      const when = e.time ? [`DTSTART:${ymd(e.start)}T${hm(e.time)}`, `DTEND:${ymd(e.end || e.start)}T${hm(e.endTime || e.time)}`] : [`DTSTART;VALUE=DATE:${ymd(e.start)}`, `DTEND;VALUE=DATE:${nextDay(e.end || e.start)}`];
      return ["BEGIN:VEVENT", `UID:${e.id}@steelsurge-27254`, `DTSTAMP:${stamp}`, ...when, `SUMMARY:${icsText(e.title)}`, e.place && `LOCATION:${icsText(e.place)}`, `DESCRIPTION:${icsText([e.detail, e.link].filter(Boolean).join("\n"))}`, e.link && `URL:${e.link}`, "END:VEVENT"].filter(Boolean);
    });
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Steel Surge FTC 27254//Season calendar//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Steel Surge events", ...body, "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";
  }
  /** A Google Calendar "add event" link. */
  function googleCal(e) {
    const dates = e.time ? `${ymd(e.start)}T${hm(e.time)}/${ymd(e.end || e.start)}T${hm(e.endTime || e.time)}` : `${ymd(e.start)}/${nextDay(e.end || e.start)}`;
    const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, details: [e.detail, e.link].filter(Boolean).join("\n\n"), location: e.place || "" });
    return `https://calendar.google.com/calendar/render?${q}`;
  }
  const SSCalendar = { icsFile, googleCal, icsText, nextDay };
  if (typeof module === "object" && module.exports) module.exports = SSCalendar; else root.SSCalendar = SSCalendar;
})(typeof window !== "undefined" ? window : globalThis);
