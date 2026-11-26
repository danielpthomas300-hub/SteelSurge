/* ==========================================================================
   Steel Surge — Contact page
   Split from site.js: only pages that need it load it. Shared helpers come
   from site.js through window.SS._.
   ========================================================================== */
(() => {
  "use strict";
  const { $, $$, ICON, esc, pages, params, socialLinks, toast } = window.SS._;

  pages.contact = async (c) => {
    if (c.contact?.replyNote && $("#reply-note")) $("#reply-note").textContent = c.contact.replyNote;
    const reasons = c.contact?.reasons || [];
    const pre = params.get("reason");
    $("#reason-chips").innerHTML = reasons.map((r, i) => `<input type="radio" name="reason" id="r${i}" value="${esc(r)}"${(pre ? r === pre : i === 0) ? " checked" : ""}><label for="r${i}">${esc(r)}</label>`).join("");
    const tier = params.get("tier");
    if (tier) $("#message").value = tier === "In-kind" ? "Hi Steel Surge! We'd like to support the team with an in-kind or custom sponsorship.\n\n" : `Hi Steel Surge! We're interested in the ${tier} sponsorship tier.\n\n`;
    $("#email-text").textContent = c.team.email;
    $("#email-link").href = `mailto:${c.team.email}`;
    $("#join-contact").href = c.team.joinFormUrl;
    $("#contact-social").innerHTML = socialLinks(c).map((s) => `<a class="social-pill" href="${esc(s.url)}" target="_blank" rel="noopener">${s.icon}<span>${esc(s.label)}</span></a>`).join("");
    $("#copy-email").addEventListener("click", async (e) => {
      e.preventDefault();
      try { await navigator.clipboard.writeText(c.team.email); toast("Email address copied"); } catch { toast(`Our email is ${c.team.email}`, "mail"); }
    });
    // Quick-start cards preselect a topic and jump to the form
    $$("[data-topic]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      const r = a.dataset.topic, input = $$("#reason-chips input").find((i) => i.value === r);
      if (input) input.checked = true;
      if (a.dataset.prefill && !$("#message").value.trim()) { $("#message").value = a.dataset.prefill; $("#message").dispatchEvent(new Event("input")); }
      $("#contact-form").scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(() => $("#name").focus({ preventScroll: true }), 400);
    }));
    const msg = $("#message"), counter = $("#msg-count");
    const count = () => { counter.textContent = `${msg.value.length} / 2000`; };
    msg.addEventListener("input", count); count();

    const form = $("#contact-form"), status = $("#form-status"), btn = $("#send-btn");
    const showStatus = (ok, html) => { status.className = `form-status show ${ok ? "ok" : "err"}`; status.innerHTML = `${ok ? ICON.check : ICON.alert}<div>${html}</div>`; status.focus(); };
    const validate = () => {
      let ok = true;
      [["name", (v) => v.trim().length > 1, "Please tell us your name."], ["email", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "Please enter a valid email address."], ["message", (v) => v.trim().length > 9, "Please write a little more (at least 10 characters)."]]
        .forEach(([id, test, m]) => { const el = $("#" + id), err = $(`#${id}-err`); const bad = !test(el.value); el.setAttribute("aria-invalid", String(bad)); err.textContent = bad ? m : ""; if (bad && ok) { el.focus(); ok = false; } });
      return ok;
    };
    form.addEventListener("input", (e) => { if (e.target.getAttribute("aria-invalid") === "true") { e.target.setAttribute("aria-invalid", "false"); const err = $(`#${e.target.id}-err`); if (err) err.textContent = ""; } });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validate()) return;
      const data = Object.fromEntries(new FormData(form));
      if (data._honey) return; // bot trap
      const reason = data.reason || "General";
      const payload = { name: data.name, email: data.email, organization: data.org || "", reason, heard_about_us: data.heard || "", message: data.message, _subject: `[Website] ${reason} from ${data.name}`, _template: "table", _captcha: "false" };
      btn.disabled = true; btn.innerHTML = "Sending…";
      try {
        const res = await fetch(c.contact.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.success === "false" || j.success === false) throw new Error(j.message || res.status);
        form.reset(); count(); $$("#reason-chips input")[0] && ($$("#reason-chips input")[0].checked = true);
        showStatus(true, `<b>Message sent!</b> Thanks, ${esc(data.name.split(" ")[0])}. ${esc(c.contact?.replyNote || "We usually reply within a few days.")}`);
        window.SS?.trophy?.("say-hello");
      } catch (err) {
        console.warn(err);
        const mail = `mailto:${c.team.email}?subject=${encodeURIComponent(payload._subject)}&body=${encodeURIComponent(data.message + "\n\n— " + data.name + (data.org ? ", " + data.org : ""))}`;
        showStatus(false, `<b>That didn't go through.</b> You can <a href="${esc(mail)}">send it from your email app instead</a>. Your message is already filled in.`);
      } finally { btn.disabled = false; btn.innerHTML = `Send message ${ICON.arrow}`; }
    });
  };

  /** Full screen, with a fallback that fills the window where real full screen isn't allowed (iPhone, embedded browsers). */
})();
