/* ==========================================================================
   Steel Surge — Media page
   Split from site.js: only pages that need it load it. Shared helpers come
   from site.js through window.SS._.
   ========================================================================== */
(() => {
  "use strict";
  const { $, ICON, esc, initReveal, loadVideos, pages, socialLinks, sortUpdates, updateCard, url, videoCard, videoEmbed, wireVideoCards, wireVideos, ytId } = window.SS._;

  pages.media = async (c) => {
    $("#media-video").innerHTML = videoEmbed(c.team.youtubeChannelId, "Steel Surge on YouTube");
    wireVideos($("#media-video"));
    // Use the newest wide video's thumbnail as the player's backdrop
    loadVideos().then((vids) => {
      const v = vids.find((x) => !x.short) || vids[0], poster = $("#media-video .video-poster"); if (!v || !poster) return;
      const img = new Image(), id = ytId(v.id);
      img.onload = () => { if (img.naturalWidth > 200) poster.style.setProperty("--poster", `url("${img.src}")`); poster.classList.add("has-art"); };
      img.src = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${v.short ? "hqdefault" : "maxresdefault"}.jpg`;
    });
    $("#yt-link").href = `https://www.youtube.com/channel/${c.team.youtubeChannelId}?sub_confirmation=1`;
    const ig = c.team.instagram ? String(c.team.instagram).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") : "";
    if (ig) $("#ig-link").outerHTML = `<a class="btn" href="https://www.instagram.com/${esc(ig)}/" target="_blank" rel="noopener">${ICON.instagram} Follow @${esc(ig)} on Instagram</a>`;
    else $("#ig-link")?.remove();
    const ups = sortUpdates(c.updates);
    $("#updates").innerHTML = ups.length ? ups.map(updateCard).join("") : `<div class="empty-state">No updates yet. Check our YouTube channel for the latest.</div>`;
    $("#updates").closest("section").hidden = !ups.length;
    $("#socials").innerHTML = socialLinks(c).map((s) => `<a class="contact-method reveal" href="${esc(s.url)}" target="_blank" rel="noopener"><div class="card-icon">${s.icon}</div><div><b>${esc(s.label)}</b><span>${esc(s.sub)}</span></div></a>`).join("");
    const grid = $("#video-grid");
    grid.innerHTML = `<div class="video-card skeleton" style="height:220px"></div>`.repeat(3);
    let vids = await loadVideos();
    if (!vids.length) vids = c.featuredVideos || [];
    grid.innerHTML = vids.length ? vids.map((v) => videoCard(v)).join("") : `<div class="empty-state">Videos are on their way.</div>`;
    wireVideoCards(grid); initReveal(grid);
    const fav = c.featuredVideos || [];
    $("#favorites").hidden = !fav.length;
    // Fill in YouTube's own title and Short flag when we know the video, so a picks list can't show the wrong title
    const known = new Map((await loadVideos()).map((v) => [v.id, v]));
    $("#fav-grid").innerHTML = fav.map((v) => { const k = known.get(ytId(v.id)); return videoCard({ ...v, title: k?.title || v.title, short: v.short || !!k?.short }); }).join(""); wireVideoCards($("#fav-grid"));
  };
})();
