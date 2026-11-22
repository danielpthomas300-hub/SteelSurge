"""Builds the site's HTML page shells (header, head tags, page sections).

Content is NOT here; it lives in content/content.json and is filled in by
assets/js/site.js. Re-run this after changing page layout, adding a page or game,
or editing CSS/JS (it stamps a version on asset links so browsers refresh):

    python tools/build_pages.py
"""
import glob
import hashlib
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SITE = "https://steelsurge1.github.io/SteelSurge/"

_h = hashlib.sha1()
for f in sorted(glob.glob(os.path.join(OUT, "assets", "**", "*.*"), recursive=True)):
    if f.endswith((".css", ".js")):
        _h.update(open(f, "rb").read())
V = _h.hexdigest()[:8]

I = lambda d, extra="": f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {extra}>{d}</svg>'
A = I('<path d="M5 12h14M13 6l6 6-6 6"/>')
ICO_CHECK = I('<path d="M20 6 9 17l-5-5"/>')
T = " · Steel Surge FTC 27254"


def head(title, desc, page, root=".", noindex=False, path="", css=(), js=(), jsonld="", extra_head=""):
    r = root
    robots = '\n  <meta name="robots" content="noindex">' if noindex else ""
    canon = "" if noindex else f'\n  <link rel="canonical" href="{SITE}{path}">\n  <meta property="og:url" content="{SITE}{path}">'
    extra_css = "".join(f'\n  <link rel="stylesheet" href="{r}/assets/css/{c}?v={V}">' for c in css)
    extra_js = "".join(f'\n  <script src="{r}/assets/js/{j}?v={V}" defer></script>' for j in js)
    ld = f'\n  <script type="application/ld+json">{jsonld}</script>' if jsonld else ""
    return f'''<!doctype html>
<html lang="en" data-root="{r}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#090c11">{robots}{canon}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Steel Surge FTC 27254">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="{SITE}assets/img/og-image.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="{r}/assets/img/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="{r}/assets/img/icon-180.png">
  <link rel="manifest" href="{r}/manifest.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@500;600&amp;family=Space+Grotesk:wght@500;600;700&amp;display=swap">
  <link rel="stylesheet" href="{r}/assets/css/site.css?v={V}">{extra_css}
  <script>try{{var t=JSON.parse(localStorage.getItem("ss-theme"));document.documentElement.dataset.theme=t==="light"?"light":"dark"}}catch(e){{document.documentElement.dataset.theme="dark"}}</script>
  <script src="{r}/assets/js/site.js?v={V}" defer></script>
  <script src="{r}/assets/js/trophies.js?v={V}" defer></script>{extra_js}{ld}{extra_head}
</head>
<body data-page="{page}">
  <noscript><div class="noscript">This site needs JavaScript for live stats and games. You can still reach us at <a href="mailto:surgesteel1@gmail.com">surgesteel1@gmail.com</a>.</div></noscript>
'''


def shell(title, desc, page, body, **kw):
    return head(title, desc, page, **kw) + f'''  <a class="skip-link" href="#main">Skip to content</a>
  <header id="site-header"></header>
  <main id="main">
{body}  </main>
  <footer id="site-footer"></footer>
</body>
</html>
'''


def page_hero(eyebrow, h1, lead, lead_id=""):
    lid = f' id="{lead_id}"' if lead_id else ""
    return f'''    <section class="page-hero">
      <div class="wrap">
        <span class="eyebrow">{eyebrow}</span>
        <h1>{h1}</h1>
        <p class="lead"{lid}>{lead}</p>
      </div>
    </section>
'''


def section(inner, cls="section", attrs=""):
    return f'''    <section class="{cls}"{attrs}>
      <div class="wrap">
{inner}
      </div>
    </section>
'''


def head_block(eyebrow, h2, p="", link=""):
    pp = f"<p>{p}</p>" if p else ""
    return f'        <div class="section-head"><div><span class="eyebrow">{eyebrow}</span><h2>{h2}</h2>{pp}</div>{link}</div>'


pages = {}
JSONLD = '{"@context":"https://schema.org","@type":"SportsTeam","name":"Steel Surge","alternateName":"FTC Team 27254","sport":"Robotics","url":"' + SITE + '","logo":"' + SITE + 'assets/img/icon-512.png","email":"surgesteel1@gmail.com","location":{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Kennett Square","addressRegion":"PA","addressCountry":"US"}},"memberOf":{"@type":"SportsOrganization","name":"FIRST Tech Challenge"}}'

pages["index.html"] = shell("Steel Surge — FTC Robotics Team 27254", "Steel Surge is FIRST Tech Challenge team 27254 from Kennett Square, PA. Meet the team, follow our season live, and play our robot arcade.", "home", f'''    <section class="hero">
      <canvas class="hero-canvas" aria-hidden="true"></canvas>
      <div class="wrap">
        <div class="hero-emblem" aria-hidden="true"><img class="logo-dark" src="assets/img/logo-hero.webp" alt="" width="560" height="560" fetchpriority="high"><img class="logo-light" src="assets/img/logo-tile.webp" alt="" width="560" height="560"></div>
        <span class="hero-badge" id="hero-badge"><b>FTC #27254</b> Kennett Square, PA</span>
        <h1>Steel<br><span class="surge-text">Surge</span></h1>
        <p class="lead" id="hero-lead"></p>
        <div class="hero-actions">
          <a class="btn primary" href="team.html">Meet the team {A}</a>
          <a class="btn" href="ftc.html">What is FTC?</a>
          <a class="btn ghost" href="arcade.html">Play the arcade</a>
        </div>
        <dl class="hero-meta" id="hero-meta"></dl>
      </div>
    </section>
''' + section(head_block("Our journey so far", "By the numbers", "Updated automatically from FTCScout after every event.", f'<a class="link-arrow" href="achievements.html">See our competition history {A}</a>') + '\n        <div id="home-stats"></div>')
  + section(head_block("What we do", "Three crews, one robot") + '\n        <div class="grid cols-3" id="pillars"></div>')
  + section(head_block("How we build", "From kickoff to competition", "Every season starts from scratch. Here's how a new robot comes together.") + '\n        <ol class="steps" id="build-steps"></ol>', cls="section alt")
  + section(head_block("Watch", "Latest from our channel", "Builds, matches, and moments from the build room. New videos appear here as soon as we post them.", f'<a class="link-arrow" href="media.html">All videos {A}</a>') + '\n        <div class="latest-videos" id="latest-videos"></div>')
  + section(head_block("Steel Surge Arcade", "Games built by a robotics team", "Thirteen original games you can play in your browser, on a computer or phone. Here are three to start, and every game has trophies to earn.", f'<a class="link-arrow" href="arcade.html">Open the arcade {A}</a>') + '\n        <div class="grid cols-3" id="home-games"></div>')
  + section(f'''        <div id="home-sponsors" style="margin-bottom:40px"></div>
        <div class="cta-band reveal">
          <div><h2>Power the surge</h2><p>Sponsors keep our robot running and our outreach growing. Every tier comes with real visibility for your business.</p></div>
          <div class="actions"><a class="btn primary" href="sponsors.html">See sponsor tiers {A}</a><a class="btn" href="contact.html">Get in touch</a></div>
        </div>'''), jsonld=JSONLD)

pages["team.html"] = shell("Team" + T, "Meet the students behind Steel Surge, FTC team 27254: mechanical, programming, and outreach.", "team",
  page_hero("The team", "Meet the crew", "Students who design, build, code, and promote our robot every season.", "team-lead")
  + section('        <div class="filter-bar" id="team-filter" role="group" aria-label="Filter by department"></div>\n        <div class="team-grid" id="team-grid"></div>')
  + section(head_block("How we work", "What Steel Surge stands for") + '\n        <div class="values-grid" id="values-grid"></div>', attrs=' id="values" hidden')
  + section(head_block("Made by Steel Surge", "From our CAD to the 3D printer", "Beyond the robot, we design and print our own team gear and shop tools.") + '\n        <div class="projects-grid" id="projects-grid"></div>', attrs=' id="projects" hidden')
  + section(head_block("Mentors", "The people who guide us") + '\n        <div class="grid cols-3" id="mentor-grid"></div>', attrs=' id="mentors" hidden')
  + section(f'''        <div class="cta-band reveal">
          <div><h2>Want to join Steel Surge?</h2><p>Builders, coders, designers, and storytellers welcome. No experience needed, just curiosity and commitment.</p></div>
          <div class="actions"><a class="btn primary" id="join-link" href="#" target="_blank" rel="noopener">Fill out the interest form {A}</a></div>
        </div>'''), path="team.html")

pages["achievements.html"] = shell("Competition" + T, "Steel Surge's competition history: events, awards, and milestones, updated automatically from FTCScout.", "achievements",
  page_hero("Competition", "Our competition journey", "Every event we've played, every award we've earned, and the milestones along the way. Event data updates automatically from FTCScout.")
  + section('        <div id="ach-next"></div>\n        <div id="ach-stats"></div>\n        <div id="ach-source"></div>')
  + section(head_block("Awards", "Trophy shelf") + '\n        <div class="trophy-shelf" id="trophy-shelf"></div>')
  + section('''        <div class="section-head">
          <div><span class="eyebrow">Events</span><h2>Where we've competed</h2></div>
          <div class="season-tabs" id="season-tabs" role="tablist" aria-label="Season"></div>
        </div>
        <div class="events" id="season-results" role="tabpanel"></div>''')
  + section(head_block("Milestones", "The story so far") + '\n        <div class="timeline" id="timeline"></div>'), path="achievements.html")

pages["media.html"] = shell("Media" + T, "Videos, highlights, and social media from Steel Surge, FTC team 27254.", "media",
  page_hero("Media", "Videos &amp; updates", "Our YouTube channel, team favorites, and where to follow along. New videos appear here automatically.")
  + section(f'''        <div id="media-video" class="reveal"></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px">
          <a class="btn primary" id="yt-link" href="#" target="_blank" rel="noopener">Subscribe on YouTube {A}</a>
          <span id="ig-link"></span>
        </div>''')
  + section(head_block("Latest uploads", "Recent videos", "Updated automatically every day from our channel.") + '\n        <div class="video-grid" id="video-grid"></div>')
  + section(head_block("Team favorites", "Our picks", "Hand-picked videos from the team.") + '\n        <div class="video-grid" id="fav-grid"></div>', attrs=' id="favorites" hidden')
  + section(head_block("Build log", "Team updates") + '\n        <div class="grid cols-2" id="updates"></div>')
  + section(head_block("Follow along", "Find us online") + '\n        <div class="grid cols-3" id="socials"></div>'), path="media.html")

pages["arcade.html"] = shell("Arcade" + T, "Thirteen original browser games from Steel Surge, FTC team 27254, each with trophies to earn.", "arcade",
  page_hero("Steel Surge Arcade", "Play something we built", 'Thirteen original robot games starring Surge, our mascot. They run in your browser on a computer or phone, remember your best scores on this device, and award <a href="trophies.html">trophies</a> as you play.')
  + section('        <div id="arcade-progress"></div>\n        <div class="grid cols-3" id="arcade-games"></div>'), path="arcade.html")

WHY = [
    ("Reach local families", "Your name travels with us to events, outreach demos, and our online channels all season."),
    ("Build tomorrow's workforce", "You help students learn engineering, programming, and teamwork through hands-on experience."),
    ("Show community spirit", "Sponsoring a student robotics team shows you invest in your community and in STEM education."),
]
USES = [
    ("Robot parts", "Motors, sensors, structural kits, and replacement parts for every new game."),
    ("Competition fees", "Season registration and entry fees for qualifiers and championships."),
    ("Tools and 3D printing", "Filament, hand tools, and shop equipment for building and prototyping."),
    ("Outreach and travel", "Demos, STEM events in our community, and getting the team to competitions."),
]
pages["sponsors.html"] = shell("Sponsors" + T, "Sponsor Steel Surge, FTC team 27254. See sponsorship tiers, what your support funds, and the partners who power our season.", "sponsors",
  f'''    <section class="page-hero sponsor-hero">
      <div class="wrap">
        <span class="eyebrow">Sponsorship</span>
        <h1>Power the surge</h1>
        <p class="lead" id="pitch"></p>
        <div class="hero-actions" id="sponsor-cta"></div>
      </div>
    </section>
''' + section(head_block("Why sponsor", "Good for students, good for your business") + '\n        <div class="grid cols-3">' + "".join(f'<div class="card reveal"><div class="card-icon">{ICO_CHECK}</div><h3>{t}</h3><p>{d}</p></div>' for t, d in WHY) + '</div>')
  + section(head_block("Your impact", "What your support builds") + '\n        <div id="impact"></div>')
  + section(head_block("Where it goes", "How we use sponsorships", "Every dollar goes straight into the program.") + '\n        <div class="grid cols-4">' + "".join(f'<div class="use-card reveal"><b>{t}</b><p>{d}</p></div>' for t, d in USES) + '</div>', cls="section alt")
  + section(head_block("Tiers", "Sponsorship levels", "Pick a tier, or talk to us about an in-kind or custom sponsorship. Parts, tools, and machining time help just as much.") + '\n        <div class="tiers" id="tiers"></div>')
  + section(head_block("Thank you", "Our sponsors &amp; partners") + '\n        <div class="sponsor-wall" id="sponsor-wall"></div>')
  + section(head_block("Questions", "Sponsor FAQ") + '''
        <div class="faq">
          <details><summary>How do I become a sponsor?</summary><p>Send us a message through the contact page or email the team. We'll answer your questions, share details, and handle the paperwork with our school and mentors.</p></details>
          <details><summary>Can I donate parts, tools, or services instead of money?</summary><p>Yes. In-kind support like parts, tools, machining, printing, or a place to build is incredibly helpful. We'll recognize it just like a financial sponsorship.</p></details>
          <details><summary>How will my business be recognized?</summary><p>Each tier lists its benefits, such as recognition on social media, logo placement on team shirts, and features on this website. We're happy to talk about what works best for you.</p></details>
          <details><summary>Does a sponsorship last all season?</summary><p>Yes. Sponsorships cover a full FTC season, from the September kickoff through our last event in the spring.</p></details>
        </div>''')
  + section(f'''        <div class="cta-band reveal">
          <div><h2>Let's talk</h2><p>Questions about sponsoring, or want our sponsor packet? Send us a note and we'll get back to you.</p></div>
          <div class="actions"><a class="btn primary" href="contact.html?reason=Sponsorship">Contact us about sponsoring {A}</a></div>
        </div>'''), path="sponsors.html")

MAIL = I('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>')
USERS = I('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>')
COPY = I('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>')
TOPICS = [
    ("Sponsorship", "Sponsor the team", "Support our season with funding, parts, or services.", "heart", ""),
    ("Joining the team", "Join Steel Surge", "Students in grades 7–12 who want to build, code, or design.", "users", ""),
    ("Outreach event / demo", "Book a demo", "Invite our robot to your school, library, or community event.", "bolt", "Hi Steel Surge! We'd love to have your team at our event. Here are the details:\n\nEvent:\nDate:\nLocation:\n"),
    ("Mentoring", "Become a mentor", "Engineers, programmers, and makers who want to share their skills.", "star", ""),
]
TI = {"heart": I('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>'), "users": USERS, "bolt": I('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'), "star": I('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>')}
pages["contact.html"] = shell("Contact" + T, "Contact Steel Surge, FTC team 27254, about sponsorship, joining the team, outreach events, or mentoring.", "contact",
  page_hero("Contact", "Get in touch", "Sponsorship, joining the team, a demo at your event, or just a question. Every message goes straight to our team inbox.")
  + section('        <div class="topic-grid">' + "".join(f'<a class="topic-card reveal" href="#contact-form" data-topic="{r}" data-prefill="{pre}"><div class="card-icon">{TI[ic]}</div><b>{t}</b><span>{d}</span></a>' for r, t, d, ic, pre in TOPICS) + '</div>')
  + f'''    <section class="section">
      <div class="wrap contact-layout">
        <form class="card form" id="contact-form" novalidate>
          <div class="form-head"><h2>Send us a message</h2><p class="muted">Fields marked * are required. We usually reply within a few days.</p></div>
          <div class="field">
            <span id="reason-label" style="font-weight:600;font-size:14px">What's this about?</span>
            <div class="reason-chips" id="reason-chips" role="radiogroup" aria-labelledby="reason-label"></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="name">Your name *</label><input class="input" id="name" name="name" autocomplete="name" required maxlength="100"><span class="field-error" id="name-err" aria-live="polite"></span></div>
            <div class="field"><label for="email">Email *</label><input class="input" id="email" name="email" type="email" autocomplete="email" required maxlength="160"><span class="field-error" id="email-err" aria-live="polite"></span></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="org">Company or school <span class="hint">(optional)</span></label><input class="input" id="org" name="org" autocomplete="organization" maxlength="120"></div>
            <div class="field"><label for="heard">How did you hear about us? <span class="hint">(optional)</span></label><select class="select input" id="heard" name="heard"><option value="">Choose one</option><option>At a competition</option><option>At an outreach event</option><option>School or a friend</option><option>YouTube or social media</option><option>Search engine</option><option>Other</option></select></div>
          </div>
          <div class="field"><label for="message">Message *</label><textarea class="textarea" id="message" name="message" required maxlength="2000"></textarea><div class="field-foot"><span class="field-error" id="message-err" aria-live="polite"></span><span class="hint" id="msg-count">0 / 2000</span></div></div>
          <input type="text" name="_honey" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true" aria-label="Leave this field empty">
          <div class="form-status" id="form-status" tabindex="-1" role="status"></div>
          <div class="form-actions"><button class="btn primary" id="send-btn" type="submit">Send message {A}</button><span class="hint">We never share your information.</span></div>
        </form>
        <aside class="contact-aside">
          <div class="contact-method">
            <div class="card-icon">{MAIL}</div>
            <div><b>Email the team</b><a id="email-link" href="#"><span id="email-text"></span></a></div>
            <button class="icon-btn copy-btn" id="copy-email" type="button" aria-label="Copy email address">{COPY}</button>
          </div>
          <a class="contact-method" id="join-contact" href="#" target="_blank" rel="noopener">
            <div class="card-icon">{USERS}</div>
            <div><b>Want to join?</b><span>Fill out our student interest form.</span></div>
          </a>
          <div class="card" style="padding:22px">
            <h3 style="font-size:17px">Where we're based</h3>
            <p style="font-size:14.5px">Kennett Square, Pennsylvania, with students from Unionville High School and Charles F. Patton Middle School.</p>
          </div>
          <div class="card" style="padding:22px">
            <h3 style="font-size:17px">Follow us</h3>
            <div class="social-pills" id="contact-social"></div>
          </div>
        </aside>
      </div>
    </section>
''' + section(head_block("FAQ", "Before you write") + '''
        <div class="faq">
          <details><summary>How quickly will you reply?</summary><p>We're a student team, so replies usually come within a few days, a little longer during busy competition weekends. Team leads answer with mentor oversight.</p></details>
          <details><summary>Can our robot visit my school or event?</summary><p>We love doing demos. Choose "Book a demo" above and tell us the date, location, and what kind of event it is.</p></details>
          <details><summary>Who can join Steel Surge?</summary><p>Students in grades 7–12 in our area. No experience is needed. Fill out the interest form or send us a message.</p></details>
          <details><summary>What is FTC?</summary><p>FIRST Tech Challenge is a robotics program for grades 7–12. Our <a href="ftc.html">About FTC page</a> explains everything, including every recent game.</p></details>
        </div>'''), path="contact.html")

pages["ftc.html"] = shell("About FTC" + T, "New to FIRST Tech Challenge? How FTC seasons and matches work, judged awards, a glossary, and how to get involved.", "ftc",
  open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "ftc_page.html"), encoding="utf-8").read(), path="ftc.html",
  extra_head='\n  <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>\n  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>')

pages["calculator.html"] = shell("Score calculator" + T, "Free FTC score calculator for every FIRST Tech Challenge game since 2017–18, including BIOBUZZ and DECODE. Tap what your alliance scored to see the total, breakdown, and ranking points.", "calculator",
  page_hero("Score calculator", "FTC score calculator", "Tap what your alliance scored and watch the total, the breakdown, and ranking points add up. Every FTC game since 2017–18, with point values from the official manuals.")
  + section(f"""        <div class="calc">
          <div class="calc-pick">
            <label class="calc-pick-label" for="calc-select">Season</label>
            <select id="calc-select" class="input calc-select"></select>
            <div class="calc-chips" id="calc-chips" aria-label="Seasons"></div>
          </div>
          <div class="calc-layout">
            <div id="calc-periods" class="calc-periods"><p class="muted">Loading the calculator…</p></div>
            <aside class="calc-summary" id="calc-summary" aria-label="Score summary">
              <div class="calc-card">
                <span class="calc-season" id="calc-season-name"></span>
                <div class="calc-total" aria-live="polite"><b id="calc-total">0</b><span>points</span></div>
                <div class="calc-bar" id="calc-bar" aria-hidden="true"></div>
                <ul class="calc-breakdown" id="calc-breakdown"></ul>
                <div class="calc-rp" id="calc-rp" hidden>
                  <div class="calc-rp-head"><h3>Ranking points</h3><b id="calc-rp-total">0 RP</b></div>
                  <ul class="calc-rp-list" id="calc-rp-list"></ul>
                  <label class="calc-opp"><span>Other alliance's score</span><input id="calc-opp" class="input" type="number" min="0" inputmode="numeric" placeholder="Optional"></label>
                  <p class="fine" id="calc-rp-note"></p>
                </div>
                <div class="calc-actions"><button class="btn primary" type="button" id="calc-share">Share this score</button><button class="btn ghost" type="button" id="calc-reset">Reset</button></div>
                <p class="fine">Point values come from each season's official game manual. Referees always have the final say. <a id="calc-learn" href="ftc.html#games">How this game works {A}</a></p>
              </div>
            </aside>
          </div>
        </div>
        <div class="calc-mobile-bar"><span>Total</span><b id="calc-bar-total">0</b><button class="btn sm" type="button" id="calc-jump">Breakdown</button></div>"""), path="calculator.html", js=("calc-data.js", "calculator.js"))

pages["trophies.html"] = shell("Trophies" + T, "Your Steel Surge trophy case: earn bronze, silver, gold, and platinum trophies by exploring the site and playing the arcade.", "trophies",
  page_hero("Trophy case", "Your trophies", "Earn bronze, silver, gold, and platinum trophies by exploring the site and playing the arcade. Collect every one to unlock the platinum trophy.")
  + section('        <div id="trophy-case"></div>'), path="trophies.html")

# 404 is served at any path by GitHub Pages, so it sets a <base> pointing at the site root
# (works at steelsurge1.github.io/SteelSurge/ and on a custom domain).
BASE = '<script>document.write(\'<base href="\'+(/^\\/SteelSurge(\\/|$)/i.test(location.pathname)?"/SteelSurge/":"/")+\'">\')</script>\n  <meta charset="utf-8">'
SURGE = '''<svg class="lost-bot" viewBox="0 0 120 120" aria-hidden="true"><g transform="rotate(-12 60 60)"><rect x="22" y="30" width="76" height="62" rx="18" fill="#1b2633" stroke="#3ba8ff" stroke-width="5"/><rect x="36" y="48" width="48" height="22" rx="11" fill="#0a0f15"/><path d="M46 55l6 6m0-6-6 6M68 55l6 6m0-6-6 6" stroke="#3ba8ff" stroke-width="3" stroke-linecap="round"/><path d="M60 30V16" stroke="#4a5b70" stroke-width="4"/><circle cx="60" cy="13" r="5" fill="#ffb547"/></g></svg>'''
pages["404.html"] = shell("Page not found" + T, "This page doesn't exist.", "404", f'''    <section class="wrap notfound">
      <div>
        {SURGE}
        <span class="eyebrow">Error 404</span>
        <h1>Lost<span style="color:var(--surge)">.</span></h1>
        <p>Surge drove off the field. The page you're looking for doesn't exist or has moved.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn primary" href="index.html">Back to home {A}</a><a class="btn" href="arcade/signal.html">Play Signal Lost instead</a></div>
      </div>
    </section>
''', noindex=True).replace('<meta charset="utf-8">', BASE, 1)

# ---------------- Game pages ----------------
ICO = {
    "pause": I('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>', 'class="i-pause"') + I('<path d="M7 4.5v15l12.5-7.5z"/>', 'class="i-play"'),
    "sound": I('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>', 'class="i-on"') + I('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>', 'class="i-off"'),
    "full": I('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
    "undo": I('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/>'),
    "restart": I('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
    "grid": I('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
    "rewind": I('<path d="M11 19 2 12l9-7z"/><path d="M22 19l-9-7 9-7z"/>'),
    "hint": I('<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>'),
    "decoy": I('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
    "ping": I('<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>'),
    "U": I('<path d="m6 15 6-6 6 6"/>'), "D": I('<path d="m6 9 6 6 6-6"/>'), "L": I('<path d="m15 6-6 6 6 6"/>'), "R": I('<path d="m9 6 6 6-6 6"/>'),
}
ALL_GAMES = [("overclock", "Overclock"), ("gridlock", "Gridlock"), ("echo", "Echo"), ("pitcrew", "Pit Crew"), ("autonomous", "Autonomous"), ("signal", "Signal Lost"), ("flywheel", "Flywheel"), ("mecanum", "Mecanum Rush"), ("wireup", "Wire Up"), ("stackup", "Stack Up"), ("balance", "Balance"), ("odometry", "Odometry"), ("kilovolt", "Kilovolt")]


def game_page(gid, title, genre, desc, stats, buttons, howto, controls, touch, aria, extra_js=()):
    hud = "".join(f'<div class="hud-stat"><span>{lab}</span><b data-hud="{key}">{val}</b></div>' for key, lab, val in stats)
    btns = "".join(f'<button class="icon-btn" type="button" data-act="{act}" aria-label="{lab}" title="{lab}">{ICO[ic]}</button>' for act, ic, lab in buttons)
    how = "".join(f"<li>{h}</li>" for h in howto)
    ctr = "".join(f'<li><span>{a}</span><span>{"".join(f"<span class=kbd>{k}</span> " for k in ks)}</span></li>' for a, ks in controls)
    others = "".join(f'<a class="btn sm" href="{g}.html">{n}</a>' for g, n in ALL_GAMES if g != gid)
    body = f'''    <div class="wrap game-page">
      <div class="game-top">
        <div class="game-title"><h1>{title}</h1><span>{genre}</span></div>
        <a class="back" href="../arcade.html">{A} All games</a>
      </div>
      <div id="game">
        <div class="hud">
          {hud}
          <div class="hud-stat"><span>Best</span><b data-hud="best">—</b></div>
          <div class="hud-spacer"></div>
          {btns}
          <button class="icon-btn" type="button" data-act="mute" aria-label="Mute sound" title="Sound (M)">{ICO["sound"]}</button>
          <button class="icon-btn" type="button" data-act="fullscreen" aria-label="Fullscreen" title="Fullscreen">{ICO["full"]}</button>
        </div>
        <p class="game-msg" data-msg aria-live="polite"></p>
        <div class="stage"><canvas role="img" aria-label="{aria}"></canvas><div class="overlay" hidden></div></div>
        {touch}
      </div>
      <div class="game-info">
        <div class="card"><h2>How to play</h2><ul>{how}</ul></div>
        <div class="card"><h2>Controls</h2><ul class="controls-list">{ctr}</ul><h2 style="margin-top:22px;font-size:16px">More games</h2><div class="more-games">{others}</div></div>
      </div>
    </div>
'''
    return shell(f"{title} · Steel Surge Arcade", desc, f"game-{gid}", body, root="..", path=f"arcade/{gid}.html", css=("game.css",), js=("arcade/kit.js", *extra_js, f"arcade/{gid}.js"))


def dpad(center=False):
    c = '<button type="button" data-dir="W" aria-label="Wait">WAIT</button>' if center else ""
    return '<div class="dpad">' + "".join(f'<button type="button" data-dir="{d}" aria-label="{n}">{ICO[d]}</button>' for d, n in [("U", "Up"), ("L", "Left"), ("R", "Right"), ("D", "Down")]) + c + "</div>"


pages["arcade/overclock.html"] = game_page(
    "overclock", "Overclock", "Action · Endless", "Overclock: a one-button robot runner from Steel Surge, FTC team 27254. Boost through crushers and lasers without overheating.",
    [("score", "Score", "0"), ("dist", "Distance", "0 m")], [("pause", "pause", "Pause (Esc)")],
    ["Hold to overclock: your robot speeds up, but heat builds fast.", "Let go to cruise slowly and cool down. At 100% heat you stall for a moment.", "Crushers slam on a rhythm; lasers blink on and off. Time your speed to slip through.", "Blue coolant vents cool you quickly. Orange furnaces heat you up, so push through them.", "Pass a hazard just before it fires for a <b>close call</b> bonus."],
    [("Boost (hold)", ["Space", "↑", "→"]), ("Boost on touch", ["Tap &amp; hold"]), ("Pause", ["Esc", "P"]), ("Mute", ["M"])],
    "", "Overclock game: a robot drives through a factory past crushers and lasers")

pages["arcade/gridlock.html"] = game_page(
    "gridlock", "Gridlock", "Puzzle · 40 levels", "Gridlock: a sliding robot puzzle from Steel Surge, FTC team 27254. Every robot moves at once.",
    [("level", "Level", "1/40"), ("moves", "Moves", "0"), ("par", "Par", "—")],
    [("hint", "hint", "Hint (H)"), ("undo", "undo", "Undo (Z)"), ("restart", "restart", "Restart level (R)"), ("levels", "grid", "Levels (L)")],
    ["Every robot moves in the same direction at the same time.", "Robots slide until they hit a wall, the edge, or another robot. Use each other as stoppers.", "Get every robot onto the pad that matches its color.", "Finish in <b>par</b> moves for 3 stars. Par is the true minimum; a computer checked every level."],
    [("Move", ["←", "↑", "↓", "→"]), ("Move on touch", ["Swipe"]), ("Undo", ["Z"]), ("Restart", ["R"]), ("Hint", ["H"]), ("Level select", ["L"])],
    f'<div class="touch-pad">{dpad()}</div>', "Gridlock puzzle board with sliding robots and charging pads")

pages["arcade/echo.html"] = game_page(
    "echo", "Echo", "Puzzle · Time loop", "Echo: a time-loop puzzle from Steel Surge, FTC team 27254. Team up with recordings of yourself.",
    [("level", "Level", "1/9"), ("loop", "Loop", "1"), ("echoes", "Echoes", "0/1")],
    [("undo", "undo", "Undo step (Z)"), ("rewind", "rewind", "Rewind and record echo (R)"), ("restart", "restart", "Restart level (Shift+R)"), ("levels", "grid", "Levels (L)")],
    ["Each loop has a battery: a limited number of ticks. Every move or wait uses one.", "Press <b>Rewind</b> and your loop becomes an <b>echo</b>, a ghost that replays exactly what you did, step for step.", "Plates open doors of the same color while anyone (you or an echo) stands on them.", "Red striped barriers do the opposite: they <b>close</b> while their plate is pressed.", "Reach the green exit. Each level limits how many echoes you can keep."],
    [("Move", ["←", "↑", "↓", "→"]), ("Wait one tick", ["Space"]), ("Rewind (record echo)", ["R"]), ("Undo a step", ["Z"]), ("Restart level", ["Shift", "R"])],
    f'<div class="touch-pad">{dpad(True)}<div class="pad-col"><button class="pad-btn" type="button" data-act="rewind">{ICO["rewind"]}Rewind</button><button class="pad-btn" type="button" data-act="undo">{ICO["undo"]}Undo</button></div></div>',
    "Echo puzzle grid with plates, doors, and ghost robots")

pages["arcade/pitcrew.html"] = game_page(
    "pitcrew", "Pit Crew", "Arcade · Reflex", "Pit Crew: a fast repair game from Steel Surge, FTC team 27254. Fix robots between matches before the queue runs out.",
    [("score", "Score", "0"), ("fixed", "Robots", "0"), ("combo", "Combo", "×1")], [("pause", "pause", "Pause (Esc)")],
    ["Robots roll into the pit with broken parts. Each fault shows the tool it needs.", "Pick the right tool to fix the glowing fault. Fix everything to send the robot back out.", "Wrong tool? You lose time. Fix faults back to back for a combo multiplier.", "If a robot's match timer runs out, you get a strike. Three strikes and the pit closes.", "Robots come faster as you go. Watch for golden robots: double points."],
    [("Wrench", ["1"]), ("Battery", ["2"]), ("Wire", ["3"]), ("Laptop", ["4"]), ("Tools on touch", ["Tap"]), ("Pause", ["Esc"])],
    '<div class="tool-tray" id="tool-tray"></div>', "Pit Crew: a robot on a repair stand with faults to fix")

pages["arcade/autonomous.html"] = game_page(
    "autonomous", "Autonomous", "Puzzle · Coding", "Autonomous: a coding puzzle from Steel Surge, FTC team 27254. Program a robot with command blocks to score every sample.",
    [("level", "Level", "1/18"), ("blocks", "Blocks", "0"), ("par", "Par", "—")],
    [("hint", "hint", "Hint (H)"), ("restart", "restart", "Clear program (R)"), ("levels", "grid", "Levels (L)")],
    ["In FTC, the first 30 seconds of a match are <b>autonomous</b>: the robot runs code with no driver.", "Build a program from command blocks, then press <b>Run</b> to watch your robot follow it exactly.", "Drive onto a yellow sample and <b>Grab</b> it. Carry it to the green basket and <b>Score</b>. The robot holds one sample at a time.", "Score every sample to clear the level. Use as few blocks as par for 3 stars.", "Later levels add a <b>Repeat</b> block: it runs the block after it 2 or 3 times."],
    [("Add a block", ["Click", "Tap"]), ("Remove a block", ["Click it in the program"]), ("Run / stop", ["Enter"]), ("Undo last block", ["Backspace"]), ("Hint", ["H"])],
    '<div class="code-ui" id="code-ui"></div>', "Autonomous field grid with a robot, samples, and a scoring basket", extra_js=("arcade/autonomous-levels.js",))

pages["arcade/signal.html"] = game_page(
    "signal", "Signal Lost", "Stealth · Endless", "Signal Lost: a stealth maze game from Steel Surge, FTC team 27254. Ping to see, but drones are listening.",
    [("floor", "Floor", "1"), ("cores", "Cores", "0/3"), ("decoys", "Decoys", "2"), ("score", "Score", "0")], [("pause", "pause", "Pause (Esc)")],
    ["You're lost in a dark factory. Your robot can only see right around itself.", "Press <b>Ping</b> to send out a pulse that briefly lights up the walls around you.", "Every ping can be heard: security drones nearby turn and hunt the spot you pinged from.", "Collect all the data cores, then reach the glowing exit to go down a floor.", "In a tight spot? Drop a <b>decoy</b>. It beeps after a moment and pulls nearby drones toward it. You get 2 per floor.", "Mazes get bigger and drones get faster. Getting caught ends the run."],
    [("Move", ["←", "↑", "↓", "→"]), ("Ping", ["Space"]), ("Move on touch", ["Drag on the game"]), ("Ping on touch", ["Tap"]), ("Drop a decoy", ["E"]), ("Pause", ["Esc"])],
    f'<div class="touch-pad"><button class="pad-btn" type="button" data-act="ping">{ICO["ping"]}Ping</button><button class="pad-btn" type="button" data-act="decoy">{ICO["decoy"]}Decoy</button></div>', "Signal Lost: a dark maze with drones and data cores")

pages["arcade/flywheel.html"] = game_page(
    "flywheel", "Flywheel", "Arcade · Aim", "Flywheel: a shooting game from Steel Surge, FTC team 27254. Tune your hood angle and flywheel speed to score pollen.",
    [("score", "Score", "0"), ("streak", "Streak", "0"), ("balls", "Pollen", "10")], [("pause", "pause", "Pause (Esc)")],
    ["Just like our real robot, you launch balls with a spinning flywheel and an adjustable hood.", "Set the <b>hood angle</b> and <b>flywheel speed</b>, then fire. Watch the wind meter: wind pushes your shot.", "Land pollen in the hive to score. The glowing center ring is worth more.", "Score shots in a row to build a streak multiplier. Each round gives you 10 pollen.", "Targets start moving and the wind gets stronger as your score climbs."],
    [("Hood angle", ["↑", "↓"]), ("Flywheel speed", ["←", "→"]), ("Fire", ["Space"]), ("Aim on touch", ["Sliders"]), ("Pause", ["Esc"])],
    '<div class="aim-ui" id="aim-ui"></div>', "Flywheel: a robot launching pollen balls at a hive target")

pages["arcade/mecanum.html"] = game_page(
    "mecanum", "Mecanum Rush", "Racing · Time trial", "Mecanum Rush: a top-down time trial from Steel Surge, FTC team 27254. Drive, strafe, and spin through the gates.",
    [("course", "Course", "1/8"), ("time", "Time", "0.00"), ("gates", "Gates", "0/0")], [("pause", "pause", "Pause (Esc)"), ("restart", "restart", "Restart course (R)")],
    ["Mecanum wheels let a robot drive in any direction, including sideways, without turning.", "Drive through every gate in order, then cross the finish line. The next gate glows.", "Touching a cone adds a 1-second penalty.", "Beat the gold time for a gold medal. Your best run races alongside you as a ghost."],
    [("Drive", ["W", "A", "S", "D"]), ("Turn", ["←", "→"]), ("Switch drive mode", ["V"]), ("Restart", ["R"]), ("Drive on touch", ["Drag"]), ("Turn on touch", ["Buttons"])],
    '<div class="touch-pad"><div class="pad-col" style="grid-auto-flow:column"><button class="pad-btn" type="button" data-turn="-1" aria-label="Turn left">⟲ Turn</button><button class="pad-btn" type="button" data-turn="1" aria-label="Turn right">Turn ⟳</button></div></div>',
    "Mecanum Rush: a top-down course with gates and cones")

pages["arcade/wireup.html"] = game_page(
    "wireup", "Wire Up", "Puzzle · Endless", "Wire Up: a wiring puzzle from Steel Surge, FTC team 27254. Rotate the tiles to power every motor.",
    [("solved", "Solved", "0"), ("moves", "Moves", "0"), ("size", "Board", "Easy")], [("restart", "restart", "New circuit (N)")],
    ["Every robot needs wiring. Connect the battery to every motor and sensor on the board.", "Click or tap a tile to rotate it. Powered wires light up blue.", "The puzzle is solved when every part has power. Every circuit is guaranteed to have a solution.", "The difficulty setting picks the board size, from 4×4 on Super Easy to 11×11 on Extreme. On Hard and Extreme, wires can wrap around the edges."],
    [("Rotate a tile", ["Click", "Tap"]), ("Rotate backward", ["Right-click"]), ("New circuit", ["N"])],
    '<div class="diff-pick" id="diff-pick"></div>', "Wire Up: a grid of wire tiles connecting a battery to motors")

pages["arcade/stackup.html"] = game_page(
    "stackup", "Stack Up", "Timing · Endless", "Stack Up: a timing game from Steel Surge, FTC team 27254. Drop game pieces from a linear slide and build the tallest tower.",
    [("height", "Height", "0"), ("combo", "Perfect", "0"), ("width", "Width", "100%")], [("pause", "pause", "Pause (Esc)")],
    ["Your robot's linear slide sweeps a game piece back and forth above the stack.", "Drop it at the right moment. Anything hanging over the edge of the piece below gets trimmed off, so the tower gets narrower.", "Line it up almost exactly for a <b>perfect drop</b>: nothing is trimmed, and perfect drops in a row build a combo.", "The slide speeds up as the tower grows. Miss the stack completely and the run is over."],
    [("Drop", ["Space", "↓"]), ("Drop on touch", ["Tap"]), ("Pause", ["Esc", "P"]), ("Mute", ["M"])],
    "", "Stack Up: a tower of game pieces built on top of a robot")

pages["arcade/balance.html"] = game_page(
    "balance", "Balance", "Physics · Survival", "Balance: a physics game from Steel Surge, FTC team 27254. Keep the balancing platform level while game pieces rain down.",
    [("score", "Score", "0"), ("time", "Time", "0s"), ("lost", "Dropped", "0/3")], [("pause", "pause", "Pause (Esc)")],
    ["Your robot sits on a balancing platform that tips toward whichever side is heavier.", "Game pieces fall onto the platform. A warning arrow shows where each one will land.", "Drive over pieces to collect them. Heavier pieces (marked ×2 and ×3) tip the platform more but score more.", "Use your robot's own weight to keep the platform level. You earn bonus points every second it stays level.", "Tip too far for too long, or let 3 pieces slide off the ends, and the run is over."],
    [("Drive", ["←", "→"]), ("Drive on touch", ["Drag", "Buttons"]), ("Pause", ["Esc", "P"]), ("Mute", ["M"])],
    '<div class="touch-pad"><div class="pad-col" id="bal-pad" style="grid-auto-flow:column"></div></div>', "Balance: a robot on a tilting platform collecting falling game pieces")

pages["arcade/odometry.html"] = game_page(
    "odometry", "Odometry", "Memory · Endless", "Odometry: a memory game from Steel Surge, FTC team 27254. Watch the robot's route, then drive it from memory.",
    [("route", "Route", "0"), ("score", "Steps", "0"), ("strikes", "Strikes", "0/3")], [("replay", "rewind", "Watch again (Q)")],
    ["Real robots use <b>odometry pods</b>, small tracking wheels, to know exactly where they've driven.", "Watch the robot drive a route across the field. The route is drawn in orange.", "Then it's your turn: drive the same route from the start pad, one tile at a time.", "A wrong turn is a strike, and the route plays again. Run out of strikes and the game ends.", "Each route you finish is one step longer. How long a route can you remember?"],
    [("Drive", ["←", "↑", "↓", "→"]), ("Drive on touch", ["Swipe", "Pad"]), ("Watch again", ["Q"])],
    f'<div class="touch-pad">{dpad()}<div class="pad-col"><button class="pad-btn" type="button" data-act="replay">{ICO["rewind"]}Replay</button></div></div>', "Odometry: a robot on a 6 by 6 field following a route")

pages["arcade/kilovolt.html"] = game_page(
    "kilovolt", "Kilovolt", "Trivia · Daily", "Kilovolt: a daily FTC team-name trivia game from Steel Surge, FTC team 27254. Name real teams; the rarer the answer, the bigger the charge.",
    [("round", "Prompt", "1/7"), ("charge", "Charge", "0 V"), ("streak", "Streak", "0")], [],
    ["Each round has 7 prompts, like “Name an FTC team from Ohio” or “Name an FTC team with an animal in its name.”", "Type the <b>name</b> of a real FTC team that fits. Small typos are OK. You get one answer per prompt, and the clock is running.", "Any correct answer charges you up, but the less famous the team, the more it's worth: <b>Spark</b> (100 V), Static, Current, Voltage, Overload, and <b>Full Surge</b> (1,000 V).", "Fame is based on each team's awards, seasons, and events, using official data from FTCScout. Answers cover every FTC team that has competed since 2019–20.", "Everyone gets the same <b>Daily Charge</b>, once a day. Want more? Play <b>Unlimited</b> rounds as often as you like."],
    [("Submit an answer", ["Enter"]), ("Next prompt", ["Enter"]), ("Skip", ["Click Skip"])],
    "", "Kilovolt: a team-name trivia game")

pages["editor.html"] = head("Team editor · Steel Surge", "Team-only content editor.", "editor", noindex=True, css=("editor.css",), js=("editor.js",)) + '''  <div id="app"><div class="ed-lock"><p class="muted">Loading editor…</p></div></div>
</body>
</html>
'''

for name, html in pages.items():
    os.makedirs(os.path.dirname(os.path.join(OUT, name)) or OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as f:
        f.write(html)

# Sitemap + robots
urls = [n for n in pages if n not in ("404.html", "editor.html")]
with open(os.path.join(OUT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    for n in urls:
        f.write(f"  <url><loc>{SITE}{'' if n == 'index.html' else n}</loc></url>\n")
    f.write("</urlset>\n")
with open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8", newline="\n") as f:
    f.write(f"User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n")
print(f"Built {len(pages)} pages (asset version {V}).")
