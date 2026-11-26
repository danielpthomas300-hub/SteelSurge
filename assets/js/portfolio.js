/* ==========================================================================
   Steel Surge — Engineering portfolio check (Match tools page, "Portfolio" tab)
   Reads a portfolio PDF in the browser (nothing is uploaded), checks the basics
   (page count, team number on every page), and looks for evidence of what
   judges look for in each award area. It finds gaps; it can't judge quality.
   PDF text extraction: pdf.js, loaded from cdnjs only when a file is chosen. Text inside
   pictures (optional): Tesseract, loaded from jsDelivr only when that option is used.
   ========================================================================== */
(() => {
  "use strict";
  const host = document.getElementById("portfolio");
  if (!host) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  const OPTS_KEY = "ss-portfolio";
  const opts = (() => { try { return { limit: 15, team: "", ocr: false, ...JSON.parse(localStorage.getItem(OPTS_KEY)) }; } catch { return { limit: 15, team: "", ocr: false }; } })();
  const saveOpts = () => { try { localStorage.setItem(OPTS_KEY, JSON.stringify(opts)); } catch {} };

  const { AREAS, scoreArea, words } = window.PortfolioRules; // portfolio-rules.js


  /* ---------------- UI ---------------- */
  host.innerHTML = `
    <div class="pf-card pf-intro">
      <div class="pf-intro-text">
        <span class="eyebrow">Engineering portfolio check</span>
        <h2>Is your portfolio ready for judging?</h2>
        <p class="muted">Drop in your portfolio as a PDF. It's read <b>on this device only</b> and never uploaded. You'll get format checks and, for each area judges score, what we found, what's missing, and questions to practice.</p>
      </div>
      <label class="pf-drop" data-drop>
        <input type="file" accept="application/pdf,.pdf" data-file hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 18v-6M9 15l3-3 3 3"/></svg>
        <b>Choose a PDF</b><span>or drop it here</span>
      </label>
      <div class="pf-opts">
        <label class="field"><span>Team number</span><input class="input" data-team inputmode="numeric" maxlength="6" placeholder="27254" value="${esc(opts.team)}"></label>
        <label class="field"><span>Page limit</span><input class="input" data-limit type="number" min="1" max="60" value="${esc(opts.limit)}"></label>
        <p class="fine">Set the page limit from this season's Competition Manual. Using Google Docs or Word? Download it as a PDF first.</p>
        <label class="pf-ocr-opt"><input type="checkbox" data-ocr${opts.ocr ? " checked" : ""}><span><b>Also read text inside pictures</b><small>Slower (a few seconds per page). The first time, it downloads a 7 MB text reader. Everything still stays on this device.</small></span></label>
      </div>
    </div>
    <div data-out aria-live="polite"></div>`;
  window.SS?.loadContent?.().then((c) => { if (!opts.team && c?.team?.number) { $("[data-team]", host).value = c.team.number; } }).catch(() => {});
  $("[data-team]", host).addEventListener("input", (e) => { opts.team = e.target.value.replace(/\D/g, ""); saveOpts(); });
  $("[data-limit]", host).addEventListener("input", (e) => { opts.limit = Math.max(1, Number(e.target.value) || 15); saveOpts(); if (last) render(last); });
  $("[data-ocr]", host).addEventListener("change", (e) => { opts.ocr = e.target.checked; saveOpts(); });
  const drop = $("[data-drop]", host), file = $("[data-file]", host);
  file.addEventListener("change", () => file.files[0] && analyze(file.files[0]));
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) analyze(f); });

  /* ---------------- Reading the PDF ---------------- */
  let pdfjsP = null, last = null, runId = 0;
  const loadScript = (src) => new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.crossOrigin = "anonymous"; s.onload = ok; s.onerror = fail; document.head.append(s); });
  const loadPdfjs = () => (pdfjsP ||= loadScript(PDFJS + "pdf.min.js").then(() => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js"; return window.pdfjsLib; })
    .catch(() => { pdfjsP = null; throw new Error("Couldn't load the PDF reader. Check your connection and try again."); }));
  async function analyze(f) {
    const out = $("[data-out]", host), id = ++runId;
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") { out.innerHTML = `<div class="pf-card pf-err">That's not a PDF. Export your portfolio as a PDF and try again.</div>`; return; }
    if (f.size > 60 * 1024 * 1024) { out.innerHTML = `<div class="pf-card pf-err">That file is over 60 MB. Try a compressed copy (most PDF tools have a "reduce size" option).</div>`; return; }
    out.innerHTML = `<div class="pf-card pf-loading"><span class="sc-spin"></span> Reading ${esc(f.name)}…</div>`;
    try {
      const lib = await loadPdfjs();
      const doc = await lib.getDocument({ data: await f.arrayBuffer(), isEvalSupported: false }).promise;
      const pages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const tc = await (await doc.getPage(i)).getTextContent();
        pages.push(tc.items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join("").replace(/[ \t]+/g, " ").trim());
      }
      last = { name: f.name, pages, ocr: pages.map(() => ""), ocrDone: false, doc, saved: false };
      if (opts.ocr) await readPictures(last, id); else render(last);
    } catch (e) { if (id === runId) out.innerHTML = `<div class="pf-card pf-err">${esc(e.message || "Couldn't read that PDF.")}</div>`; }
  }

  /* ---------------- Text inside pictures (Tesseract, loaded only when asked) ----------------
     Each page is drawn to a canvas and read. Only lines that aren't already in the page's
     real text are kept, so normal text isn't counted twice. */
  const TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/";
  let tessP = null;
  const loadTess = () => (tessP ||= loadScript(TESS + "tesseract.min.js").then(() => window.Tesseract).catch(() => { tessP = null; throw new Error("Couldn't load the picture reader. Check your connection and try again."); }));
  const wordSet = (t) => new Set((t.toLowerCase().match(/[a-z0-9][a-z0-9'’-]{2,}/g) || []));
  function newLines(ocrText, pageText) {
    const known = wordSet(pageText), keep = [];
    for (const line of ocrText.split("\n")) {
      const w = line.toLowerCase().match(/[a-z0-9][a-z0-9'’-]{2,}/g) || [];
      if (w.length < 2) continue;
      const letters = (line.match(/[A-Za-z]/g) || []).length;
      if (letters / Math.max(1, line.replace(/\s/g, "").length) < 0.6) continue; // mostly symbols: probably a misread drawing
      if (w.filter((x) => known.has(x)).length / w.length < 0.5) keep.push(line.trim());
    }
    return keep.join("\n");
  }
  async function readPictures(data, id = runId) {
    const out = $("[data-out]", host);
    let cancelled = false, worker = null;
    const status = (html) => { if (id === runId) out.innerHTML = `<div class="pf-card pf-loading pf-ocr-prog">${html}<button type="button" class="btn sm ghost" data-skip>Skip</button></div>`; out.querySelector("[data-skip]")?.addEventListener("click", () => { cancelled = true; }); };
    try {
      status(`<span class="sc-spin"></span> Getting the picture reader ready (first time only, about 7 MB)…`);
      const T = await loadTess();
      worker = await T.createWorker("eng", 1, { workerPath: TESS + "worker.min.js", corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1", langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int" });
      const n = data.doc.numPages, t0 = performance.now();
      for (let i = 1; i <= n && !cancelled && id === runId; i++) {
        const left = i > 1 ? Math.round(((performance.now() - t0) / (i - 1)) * (n - i + 1) / 1000) : null;
        status(`<span class="sc-spin"></span><span>Reading pictures: page ${i} of ${n}${left ? ` · about ${left}s left` : ""}</span><span class="pf-prog"><i style="width:${Math.round(((i - 1) / n) * 100)}%"></i></span>`);
        const page = await data.doc.getPage(i), vp0 = page.getViewport({ scale: 1 }), scale = Math.min(2.2, 1800 / vp0.width), vp = page.getViewport({ scale });
        const cv = document.createElement("canvas"); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
        await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
        const { data: r } = await worker.recognize(cv);
        data.ocr[i - 1] = newLines(r.text || "", data.pages[i - 1]);
        cv.width = cv.height = 0;
      }
      data.ocrDone = !cancelled;
    } catch (e) { data.ocrError = e.message; }
    finally { try { await worker?.terminate(); } catch {} }
    if (id === runId) render(data);
  }

  /* ---------------- History (this device only) ---------------- */
  const HIST_KEY = "ss-portfolio-history";
  const history = () => { try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch { return []; } };
  const saveHistory = (h) => { try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(-30))); } catch {} };
  const shortDay = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  function render(data) {
    const { name, pages, ocr } = data;
    const out = $("[data-out]", host), team = (opts.team || $("[data-team]", host).value || "").trim(), limit = opts.limit;
    const all = pages.map((t, i) => (ocr[i] ? `${t}\n${ocr[i]}` : t)); // real text + text read from pictures
    const wc = pages.map(words), ocrWc = ocr.map(words), totalWords = wc.reduce((a, b) => a + b, 0), picWords = ocrWc.reduce((a, b) => a + b, 0);
    if (totalWords + picWords < 40) {
      out.innerHTML = `<div class="pf-card pf-err"><b>We couldn't find any text in this PDF.</b> It may be scanned pages or images of text. ${data.ocrDone ? "Even reading the pictures found almost nothing. Try exporting" : "Read the text inside its pictures instead, or export"} it again from Google Docs, Word, or Canva as a PDF with real text (not "flattened" or "print as image").
        ${!data.ocrDone && data.doc ? `<div class="pf-sum-actions"><button type="button" class="btn sm primary" data-readpics>Read text in pictures</button></div>` : ""}</div>`;
      $("[data-readpics]", out)?.addEventListener("click", () => readPictures(data));
      return;
    }
    // Format checks
    const checks = [];
    checks.push(pages.length <= limit ? ["ok", `${pages.length} pages, within your ${limit}-page limit.`] : ["bad", `${pages.length} pages, over your ${limit}-page limit by ${pages.length - limit}. Check whether the cover counts in this season's manual.`]);
    if (team) {
      const re = new RegExp(`(^|\\D)${team}(\\D|$)`), miss = all.map((t, i) => (re.test(t) ? 0 : i + 1)).filter(Boolean);
      checks.push(!miss.length ? ["ok", `Team number ${team} appears on every page.`] : miss.length === pages.length ? ["bad", `Team number ${team} doesn't appear anywhere we can read. Put it on the cover and in a header or footer on every page.`] : ["warn", `Team number ${team} is missing on page${miss.length === 1 ? "" : "s"} ${miss.join(", ")}. A header or footer with it on every page is safest.`]);
    } else checks.push(["warn", "Enter your team number above to check it appears on every page."]);
    const dense = wc.map((n, i) => (n + ocrWc[i] > 650 ? i + 1 : 0)).filter(Boolean), empty = wc.map((n, i) => (n + ocrWc[i] < 15 ? i + 1 : 0)).filter(Boolean);
    if (dense.length) checks.push(["warn", `Page${dense.length === 1 ? "" : "s"} ${dense.join(", ")} ${dense.length === 1 ? "is" : "are"} very text-heavy (over 650 words). Judges skim: trade some text for a labeled picture or a table.`]);
    const picPages = ocrWc.map((n, i) => (n >= 8 ? i + 1 : 0)).filter(Boolean);
    if (data.ocrDone || picWords) checks.push(["info", picPages.length ? `Read about ${picWords.toLocaleString()} words from pictures on page${picPages.length === 1 ? "" : "s"} ${picPages.join(", ")}. Quotes from pictures are marked; check them, since picture reading can misread words.` : "Read the pictures on every page: no extra text found in them."]);
    else if (empty.length) checks.push(["info", `Page${empty.length === 1 ? "" : "s"} ${empty.join(", ")} ${empty.length === 1 ? "has" : "have"} almost no readable text. That's fine for full-page pictures, but if they contain text, use <b>Read text in pictures</b> above.`]);
    if (data.ocrError) checks.push(["warn", `Pictures couldn't be read: ${data.ocrError}`]);
    checks.push(["info", `About ${totalWords.toLocaleString()} words of text, averaging ${Math.round(totalWords / pages.length)} per page.`]);
    // Areas
    const areas = AREAS.map((a) => scoreArea(a, all, pages));
    const formatPenalty = checks.filter(([k]) => k === "bad").length * 8 + checks.filter(([k]) => k === "warn").length * 3;
    const overall = Math.max(0, Math.round(areas.reduce((s, a) => s + a.score * (a.id === "story" ? 0.5 : 1), 0) / (areas.length - 0.5) - formatPenalty));
    const mood = overall >= 80 ? "Looks judge-ready" : overall >= 60 ? "A solid start" : overall >= 40 ? "Some big gaps" : "Early draft";
    const icon = { ok: "✓", warn: "!", bad: "✕", info: "i" };
    const weakest = [...areas].filter((a) => a.id !== "story").sort((a, b) => a.score - b.score)[0];
    // Progress since the last check on this device (saved once per check, not when the page limit changes)
    let hist = history(); const prev = hist[hist.length - 1];
    const entry = { at: Date.now(), name, overall, pages: pages.length, pics: !!data.ocrDone, areas: Object.fromEntries(areas.map((a) => [a.id, a.score])) };
    if (!data.saved) { hist.push(entry); saveHistory(hist); data.saved = true; data.prev = prev || null; }
    hist = history();
    const before = data.prev, delta = before ? overall - before.overall : 0;
    const moves = before ? areas.map((a) => [a, a.score - (before.areas?.[a.id] ?? a.score)]).filter(([, d]) => d).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 3) : [];
    const spark = (() => { const pts = hist.slice(-10).map((h) => h.overall); if (pts.length < 2) return ""; const W = 140, H = 34; return `<svg class="pf-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Readiness over your last ${pts.length} checks: ${pts.join(", ")}"><polyline points="${pts.map((v, i) => `${(i * (W - 6)) / (pts.length - 1) + 3},${H - 3 - (v / 100) * (H - 6)}`).join(" ")}"/></svg>`; })();
    // Page map: which award areas each page gives evidence for
    const map = pages.map((_, i) => areas.filter((a) => a.id !== "story").map((a) => a.perPage[i].length));
    const idle = map.map((r, i) => (r.every((x) => !x) ? i + 1 : 0)).filter(Boolean);
    const thin = areas.filter((a) => a.id !== "story").map((a) => [a, a.perPage.filter((x) => x.length).length]).filter(([, n]) => n === 1);
    out.innerHTML = `
      <div class="pf-card pf-summary">
        <div class="pf-ring" role="img" aria-label="Readiness ${overall} out of 100"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="50"/><circle class="val" cx="60" cy="60" r="50" pathLength="100" style="stroke-dasharray:${overall} 100"/></svg><div><b>${overall}</b><span>Readiness</span></div></div>
        <div class="pf-sum-text"><span class="eyebrow">${esc(name)}${data.ocrDone ? " · pictures read" : ""}</span><h3>${mood}</h3>
          <p class="muted">Start with <b>${esc(weakest.name)}</b>: it has the least evidence. ${weakest.missing[0] ? esc(weakest.missing[0].tip) : ""}</p>
          <div class="pf-sum-actions"><button type="button" class="btn sm" data-copy>Copy report</button><button type="button" class="btn sm ghost" data-print>Print</button>${!data.ocrDone && data.doc ? `<button type="button" class="btn sm ghost" data-readpics>Read text in pictures</button>` : ""}<label class="btn sm ghost">Check another PDF<input type="file" accept="application/pdf,.pdf" data-file2 hidden></label></div></div>
        <ul class="pf-bars">${areas.map((a) => `<li><a href="#pf-${a.id}"><span>${esc(a.name)}</span><i style="--v:${a.score}%"></i><b>${a.score}</b></a></li>`).join("")}</ul>
      </div>
      <div class="pf-card pf-progress">
        <div><h3 class="pf-h">Your progress</h3>
          ${before ? `<p><b class="pf-delta ${delta > 0 ? "up" : delta < 0 ? "down" : ""}">${delta > 0 ? "+" : ""}${delta}</b> since your last check on ${shortDay(before.at)} (${esc(before.name)}): ${before.overall} → ${overall}.</p>
            ${moves.length ? `<ul class="pf-moves">${moves.map(([a, d]) => `<li class="${d > 0 ? "up" : "down"}">${esc(a.name)} <b>${d > 0 ? "+" : ""}${d}</b></li>`).join("")}</ul>` : `<p class="muted">No change in any area.</p>`}`
          : `<p class="muted">This is your first check on this device. Check again after you revise and you'll see what improved.</p>`}
        </div>
        <div class="pf-hist">${spark}${hist.length > 1 ? `<small>${hist.length} checks saved on this device</small><button type="button" class="pf-link" data-clearhist>Clear history</button>` : ""}</div>
      </div>
      <div class="pf-card pf-mapcard">
        <h3 class="pf-h">Page map</h3>
        <p class="muted">Which award areas each page gives evidence for. Darker means more.</p>
        <div class="pf-map-wrap"><table class="pf-map"><thead><tr><th scope="col">Page</th>${areas.filter((a) => a.id !== "story").map((a) => `<th scope="col" title="${esc(a.name)}">${esc({ eng: "Engineering", design: "Design", control: "Control", outreach: "Outreach", team: "Team & plan" }[a.id] || a.name)}</th>`).join("")}</tr></thead>
          <tbody>${map.map((r, i) => `<tr><th scope="row">${i + 1}</th>${r.map((n, k) => { const a = areas.filter((x) => x.id !== "story")[k]; return `<td style="--a:${Math.min(1, n / 3)}" title="Page ${i + 1} · ${esc(a.name)}: ${n ? esc(a.perPage[i].join(", ")) : "nothing"}">${n ? `<span>${n}</span>` : ""}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
        ${idle.length || thin.length ? `<ul class="pf-map-notes">${idle.length ? `<li>Page${idle.length === 1 ? "" : "s"} ${idle.join(", ")} ${idle.length === 1 ? "doesn't" : "don't"} show evidence for any award area. If ${idle.length === 1 ? "it's" : "they're"} mostly pictures, add captions that explain them.</li>` : ""}${thin.map(([a]) => `<li><b>${esc(a.name)}</b> appears on only one page. Judges notice depth: connect it to other sections.</li>`).join("")}</ul>` : ""}
      </div>
      <div class="pf-card"><h3 class="pf-h">Format checks</h3><ul class="pf-checks">${checks.map(([k, t]) => `<li class="${k}"><i aria-hidden="true">${icon[k]}</i><span>${t.replace(/<(?!\/?b>)/g, "&lt;")}</span></li>`).join("")}</ul></div>
      ${areas.map((a) => `
      <section class="pf-card pf-area" id="pf-${a.id}">
        <header><div><h3 class="pf-h">${esc(a.name)}</h3><small>${esc(a.award)}</small></div><b class="pf-score ${a.score >= 70 ? "ok" : a.score >= 45 ? "mid" : "low"}">${a.score}</b></header>
        <p class="muted">${esc(a.blurb)}</p>
        <div class="pf-cols">
          <div><h4>What we found</h4>${a.found.length ? `<ul class="pf-found">${a.found.map((x) => `<li><b>${esc(x.label)}</b> <small>p. ${x.pages.slice(0, 6).join(", ")}${x.pages.length > 6 ? "…" : ""}</small>${x.quote ? `<q>${esc(x.quote)}</q>${x.fromPic || x.pages.length > 1 ? `<small class="pf-qp">${x.fromPic ? "read from a picture, " : ""}${x.pages.length > 1 || x.fromPic ? `page ${x.qp}` : ""}</small>` : ""}` : ""}</li>`).join("")}</ul>` : `<p class="muted">Nothing yet. This is the biggest gap.</p>`}</div>
          <div><h4>To strengthen</h4>${a.missing.length ? `<ul class="pf-missing">${a.missing.map((x) => `<li><b>${esc(x.label)}</b><span>${esc(x.tip)}</span></li>`).join("")}</ul>` : `<p class="muted">Every signal we look for is here. Make sure it's backed by pictures and numbers.</p>`}
            <h4>Judges may ask</h4><ul class="pf-ask">${a.ask.map((q) => `<li>${esc(q)}</li>`).join("")}</ul></div>
        </div>
      </section>`).join("")}
      <p class="fine">This check looks for evidence in your portfolio's text${data.ocrDone ? " and the text in its pictures" : ""}. It can't judge quality or replace real feedback. Have a mentor or another team read it too. Award names and portfolio rules change: always check this season's Competition Manual.</p>`;
    $("[data-file2]", out).addEventListener("change", (e) => e.target.files[0] && analyze(e.target.files[0]));
    $("[data-print]", out).addEventListener("click", () => print());
    $("[data-readpics]", out)?.addEventListener("click", () => { data.saved = false; readPictures(data); });
    $("[data-clearhist]", out)?.addEventListener("click", () => { if (!confirm("Clear the saved check history on this device?")) return; saveHistory([]); data.prev = null; render(data); });
    $("[data-copy]", out).addEventListener("click", async (e) => {
      const txt = [`Portfolio check: ${name}`, `Readiness ${overall}/100 (${mood})${before ? ` · ${delta >= 0 ? "+" : ""}${delta} since ${shortDay(before.at)}` : ""}`, "", ...checks.map(([k, t]) => `[${k}] ${t.replace(/<\/?b>/g, "")}`), "", ...areas.flatMap((a) => [`${a.name}: ${a.score}/100`, ...a.found.map((x) => `  + ${x.label} (p. ${x.pages.join(", ")})`), ...a.missing.map((x) => `  - ${x.label}: ${x.tip}`), ""])].join("\n");
      try { await navigator.clipboard.writeText(txt); e.target.textContent = "Copied!"; } catch { e.target.textContent = "Couldn't copy"; }
    });
    out.querySelector(".pf-summary").scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
