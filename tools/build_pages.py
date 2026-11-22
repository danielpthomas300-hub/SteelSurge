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
T = " · Steel Surge FTC 27254"


def head(title, desc, page, root=".", noindex=False, path="", css=(), js=(), jsonld=""):
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
  <meta property="og:image" content="{SITE}assets/img/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="{r}/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="{r}/assets/img/icon-180.png">
  <link rel="manifest" href="{r}/manifest.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@500;600&amp;family=Space+Grotesk:wght@500;600;700&amp;display=swap">
  <link rel="stylesheet" href="{r}/assets/css/site.css?v={V}">{extra_css}
  <script>try{{var t=JSON.parse(localStorage.getItem("ss-theme"));document.documentElement.dataset.theme=t==="light"?"light":"dark"}}catch(e){{document.documentElement.dataset.theme="dark"}}</script>
  <script src="{r}/assets/js/site.js?v={V}" defer></script>{extra_js}{ld}
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
        <span class="hero-badge" id="hero-badge"><b>FTC #27254</b> Kennett Square, PA</span>
        <h1>Steel<br><span class="surge-text">Surge</span></h1>
        <p class="lead" id="hero-lead"></p>
        <div class="hero-actions">
          <a class="btn primary" href="team.html">Meet the team {A}</a>
          <a class="btn" href="arcade.html">Play the arcade</a>
        </div>
        <dl class="hero-meta" id="hero-meta"></dl>
      </div>
    </section>
''' + section(head_block("Season at a glance", "Numbers that update themselves", link=f'<a class="link-arrow" href="achievements.html">All results &amp; awards {A}</a>') + '\n        <div id="home-stats"></div>')
  + section(head_block("What we do", "Three crews, one robot") + '\n        <div class="grid cols-3" id="pillars"></div>')
  + section('        <div id="home-robot"></div>', attrs=" hidden")
  + f'''    <section class="section alt">
      <div class="wrap split">
        <div class="reveal">
          <span class="eyebrow">Watch</span>
          <h2 style="font-size:clamp(30px,4.4vw,46px);margin:14px 0 16px">From the pit to the field</h2>
          <p class="lead">Builds, matches, and behind-the-scenes moments. Our newest uploads play right here.</p>
          <div id="home-updates" class="grid" style="margin-top:28px"></div>
          <a class="link-arrow" href="media.html" style="margin-top:22px">More media {A}</a>
        </div>
        <div id="home-video" class="reveal"></div>
      </div>
    </section>
''' + section(head_block("Behind the scenes", "Life on Steel Surge", "Theme songs, ping pong rivalries, and the occasional robot. This is what our meetings actually look like.", f'<a class="link-arrow" href="media.html">All videos {A}</a>') + '\n        <div class="video-grid" id="home-bts"></div>')
  + section(head_block("Steel Surge Arcade", "Games built by a robotics team", "Six original games you can play in your browser, on a laptop or your phone. Here are three to start.", f'<a class="link-arrow" href="arcade.html">Open the arcade {A}</a>') + '\n        <div class="grid cols-3" id="home-games"></div>')
  + section(f'''        <div id="home-sponsors" style="margin-bottom:40px"></div>
        <div class="cta-band reveal">
          <div><h2>Power the surge</h2><p>Sponsors keep our robot running and our outreach growing. Every tier comes with real visibility for your business.</p></div>
          <div class="actions"><a class="btn primary" href="sponsors.html">See sponsor tiers {A}</a><a class="btn" href="contact.html">Get in touch</a></div>
        </div>'''), jsonld=JSONLD)

pages["team.html"] = shell("Team" + T, "Meet the students behind Steel Surge, FTC team 27254: mechanical, programming, and outreach.", "team",
  page_hero("The team", "Meet the crew", "Students who design, build, code, and promote our robot every season.", "team-lead")
  + section('        <div class="filter-bar" id="team-filter" role="group" aria-label="Filter by department"></div>\n        <div class="team-grid" id="team-grid"></div>')
  + section(head_block("How we work", "What Steel Surge stands for") + '\n        <div class="values-grid" id="values-grid"></div>', attrs=' id="values" hidden')
  + section(head_block("Mentors", "The people who guide us") + '\n        <div class="grid cols-3" id="mentor-grid"></div>', attrs=' id="mentors" hidden')
  + section(f'''        <div class="cta-band reveal">
          <div><h2>Want to join Steel Surge?</h2><p>Builders, coders, designers, and storytellers welcome. No experience needed, just curiosity and commitment.</p></div>
          <div class="actions"><a class="btn primary" id="join-link" href="#" target="_blank" rel="noopener">Fill out the interest form {A}</a></div>
        </div>'''), path="team.html")

pages["achievements.html"] = shell("Achievements" + T, "Awards, competition results, and milestones for Steel Surge, FTC team 27254, updated live from FTCScout.", "achievements",
  page_hero("Achievements", "Our record", "Official awards and match results update automatically from FTCScout after every event. No one has to remember to post them.")
  + section('        <div id="ach-next"></div>\n        <div id="ach-stats"></div>\n        <div id="ach-source"></div>')
  + section(head_block("Trophy shelf", "Awards") + '\n        <div class="trophy-shelf" id="trophy-shelf"></div>')
  + section('''        <div class="section-head">
          <div><span class="eyebrow">Competition</span><h2>Season results</h2></div>
          <div class="season-tabs" id="season-tabs" role="tablist" aria-label="Season"></div>
        </div>
        <div class="events" id="season-results" role="tabpanel"></div>''')
  + section(head_block("Milestones", "The story so far") + '\n        <div class="timeline" id="timeline"></div>'), path="achievements.html")

pages["media.html"] = shell("Media" + T, "Videos and team updates from Steel Surge, FTC team 27254.", "media",
  page_hero("Media", "Videos &amp; updates", "Our YouTube channel, build-season notes, and where to follow along. New videos appear here automatically.")
  + section(f'''        <div id="media-video" class="reveal"></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px">
          <a class="btn primary" id="yt-link" href="#" target="_blank" rel="noopener">Subscribe on YouTube {A}</a>
        </div>''')
  + section(head_block("Latest uploads", "Recent videos", "Updated automatically every day from our channel.") + '\n        <div class="video-grid" id="video-grid"></div>')
  + section(head_block("Build log", "Team updates") + '\n        <div class="grid cols-2" id="updates"></div>')
  + section(head_block("Follow along", "Find us online") + '\n        <div class="grid cols-3" id="socials"></div>'), path="media.html")

pages["arcade.html"] = shell("Arcade" + T, "Six original browser games from Steel Surge, FTC team 27254: Overclock, Gridlock, Echo, Pit Crew, Autonomous, and Signal Lost.", "arcade",
  page_hero("Steel Surge Arcade", "Play something we built", "Six original robot games starring Surge, our mascot. They run in your browser on desktop or phone and remember your best scores on this device.")
  + section('        <div id="arcade-progress"></div>\n        <div class="grid cols-3" id="arcade-games"></div>'), path="arcade.html")

pages["sponsors.html"] = shell("Sponsors" + T, "Sponsor Steel Surge, FTC team 27254. See sponsorship tiers and the partners who power our season.", "sponsors",
  page_hero("Sponsorship", "Power the surge", '<span id="pitch"></span>')
  + section(head_block("Your impact", "What your support builds") + '\n        <div id="impact"></div>')
  + section(head_block("Tiers", "Sponsorship levels", "Pick a tier, or talk to us about a custom or in-kind sponsorship. Parts, tools, and machining time help just as much.", '<div id="packet"></div>') + '\n        <div class="tiers" id="tiers"></div>')
  + section(head_block("Thank you", "Our sponsors &amp; partners") + '\n        <div class="sponsor-wall" id="sponsor-wall"></div>')
  + section(f'''        <div class="cta-band reveal">
          <div><h2>Let's talk</h2><p>Questions about sponsoring, or want our sponsor packet? Send us a note and we'll get back to you.</p></div>
          <div class="actions"><a class="btn primary" href="contact.html?reason=Sponsorship">Contact us about sponsoring {A}</a></div>
        </div>'''), path="sponsors.html")

MAIL = I('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>')
USERS = I('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>')
COPY = I('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>')
pages["contact.html"] = shell("Contact" + T, "Contact Steel Surge, FTC team 27254, about sponsorship, joining, outreach events, or mentoring.", "contact",
  page_hero("Contact", "Get in touch", "Sponsorship, joining the team, a demo at your event, or just a question. It all comes to our team inbox.")
  + f'''    <section class="section">
      <div class="wrap contact-layout">
        <form class="card form" id="contact-form" novalidate>
          <div class="field">
            <span id="reason-label" style="font-weight:600;font-size:14px">What's this about?</span>
            <div class="reason-chips" id="reason-chips" role="radiogroup" aria-labelledby="reason-label"></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="name">Your name</label><input class="input" id="name" name="name" autocomplete="name" required><span class="field-error" id="name-err" aria-live="polite"></span></div>
            <div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="email" required><span class="field-error" id="email-err" aria-live="polite"></span></div>
          </div>
          <div class="field"><label for="org">Company or school <span class="hint">(optional)</span></label><input class="input" id="org" name="org" autocomplete="organization"></div>
          <div class="field"><label for="message">Message</label><textarea class="textarea" id="message" name="message" required></textarea><span class="field-error" id="message-err" aria-live="polite"></span></div>
          <input type="text" name="_honey" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
          <div class="form-status" id="form-status" tabindex="-1" role="status"></div>
          <div><button class="btn primary" id="send-btn" type="submit">Send message {A}</button></div>
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
            <h3 style="font-size:17px">Good to know</h3>
            <p style="font-size:14.5px">We're a student team, so replies come from team leads with mentor oversight. We'll never share your details.</p>
          </div>
        </aside>
      </div>
    </section>
''', path="contact.html")

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
    "ping": I('<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>'),
    "U": I('<path d="m6 15 6-6 6 6"/>'), "D": I('<path d="m6 9 6 6 6-6"/>'), "L": I('<path d="m15 6-6 6 6 6"/>'), "R": I('<path d="m9 6 6 6-6 6"/>'),
}
ALL_GAMES = [("overclock", "Overclock"), ("gridlock", "Gridlock"), ("echo", "Echo"), ("pitcrew", "Pit Crew"), ("autonomous", "Autonomous"), ("signal", "Signal Lost")]


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
    "gridlock", "Gridlock", "Puzzle · 30 levels", "Gridlock: a sliding robot puzzle from Steel Surge, FTC team 27254. Every robot moves at once.",
    [("level", "Level", "1/30"), ("moves", "Moves", "0"), ("par", "Par", "—")],
    [("undo", "undo", "Undo (Z)"), ("restart", "restart", "Restart level (R)"), ("levels", "grid", "Levels (L)")],
    ["Every robot moves in the same direction at the same time.", "Robots slide until they hit a wall, the edge, or another robot. Use each other as stoppers.", "Get every robot onto the pad that matches its color.", "Finish in <b>par</b> moves for 3 stars. Par is the true minimum; a computer checked every level."],
    [("Move", ["←", "↑", "↓", "→"]), ("Move on touch", ["Swipe"]), ("Undo", ["Z"]), ("Restart", ["R"]), ("Level select", ["L"])],
    f'<div class="touch-pad">{dpad()}</div>', "Gridlock puzzle board with sliding robots and charging pads")

pages["arcade/echo.html"] = game_page(
    "echo", "Echo", "Puzzle · Time loop", "Echo: a time-loop puzzle from Steel Surge, FTC team 27254. Team up with recordings of yourself.",
    [("level", "Level", "1/7"), ("loop", "Loop", "1"), ("echoes", "Echoes", "0/1")],
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
    [("level", "Level", "1/12"), ("blocks", "Blocks", "0"), ("par", "Par", "—")],
    [("restart", "restart", "Clear program (R)"), ("levels", "grid", "Levels (L)")],
    ["In FTC, the first 30 seconds of a match are <b>autonomous</b>: the robot runs code with no driver.", "Build a program from command blocks, then press <b>Run</b> to watch your robot follow it exactly.", "Drive onto a yellow sample and <b>Grab</b> it. Carry it to the green basket and <b>Score</b>. The robot holds one sample at a time.", "Score every sample to clear the level. Use as few blocks as par for 3 stars.", "Later levels add a <b>Repeat</b> block: it runs the block after it 2 or 3 times."],
    [("Add a block", ["Click", "Tap"]), ("Remove a block", ["Click it in the program"]), ("Run / stop", ["Enter"]), ("Undo last block", ["Backspace"])],
    '<div class="code-ui" id="code-ui"></div>', "Autonomous field grid with a robot, samples, and a scoring basket", extra_js=("arcade/autonomous-levels.js",))

pages["arcade/signal.html"] = game_page(
    "signal", "Signal Lost", "Stealth · Endless", "Signal Lost: a stealth maze game from Steel Surge, FTC team 27254. Ping to see, but drones are listening.",
    [("floor", "Floor", "1"), ("cores", "Cores", "0/3"), ("score", "Score", "0")], [("pause", "pause", "Pause (Esc)")],
    ["You're lost in a dark factory. Your robot can only see right around itself.", "Press <b>Ping</b> to send out a pulse that briefly lights up the walls around you.", "Every ping can be heard: security drones nearby turn and hunt the spot you pinged from.", "Collect all the data cores, then reach the glowing exit to go down a floor.", "Mazes get bigger and drones get faster. Getting caught ends the run."],
    [("Move", ["←", "↑", "↓", "→"]), ("Ping", ["Space"]), ("Move on touch", ["Drag on the game"]), ("Ping on touch", ["Ping button"]), ("Pause", ["Esc"])],
    f'<div class="touch-pad"><button class="pad-btn" type="button" data-act="ping">{ICO["ping"]}Ping</button></div>', "Signal Lost: a dark maze with drones and data cores")

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
