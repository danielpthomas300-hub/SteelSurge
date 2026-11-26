/* ==========================================================================
   Steel Surge — Sponsors page
   Split from site.js: only pages that need it load it. Shared helpers come
   from site.js through window.SS._.
   ========================================================================== */
(() => {
  "use strict";
  const { $, $$, ICON, esc, journeyStats, loadFTC, pages, runCounts, url } = window.SS._;

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
})();
