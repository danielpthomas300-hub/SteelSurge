/* ==========================================================================
   Steel Surge — Arcade page
   Split from site.js: only pages that need it load it. Shared helpers come
   from site.js through window.SS._.
   ========================================================================== */
(() => {
  "use strict";
  const { $, GAMES, ICON, LEVEL_NAMES, bestFor, esc, gameArt, gameCards, pages, savedLevel, url, weekly } = window.SS._;

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
})();
