# Steel Surge — FTC Team 27254 website

Live site: https://danielpthomas300-hub.github.io/SteelSurge/

A fast, static website (plain HTML, CSS, and JavaScript, with no build step needed to run it) hosted free on GitHub Pages.

## What updates by itself

| What | How |
|---|---|
| Seasons, events, and matches played (home page) | [FTCScout](https://ftcscout.org/teams/27254), live in the browser (cached for 3 hours). Full results link out to FTCScout |
| Official FTC awards (Team page timeline) | FTCScout, as soon as FIRST posts them |
| "Up next" event countdown | FTCScout: appears automatically once the team registers for an event |
| Latest videos (Home and Media pages) | A GitHub Action refreshes `content/videos.json` from YouTube every day |
| "Steel Surge competed" notes on the FTC page | FTCScout: each season the team played is marked automatically |
| Instagram links (Media, Contact, footer) | Appear automatically once an Instagram handle is entered in the editor |
| Backup stats if FTCScout is down | The same Action saves `content/ftc.json` daily |
| Season label, copyright year, team size, events and matches played | Calculated |

**One-time setup for the daily refresh:** in the GitHub repo, go to **Settings → Actions → General → Workflow permissions** and choose **Read and write permissions**. You can run it by hand from the **Actions** tab ("Refresh site data" → Run workflow).

## How to update content (no code)

### Option 1: the team editor (developer mode, easiest)
1. Go to **/editor.html**. You can also click **Team editor** in the footer, or press **Ctrl + Shift + E** (Cmd + Shift + E on a Mac) on any page.
2. Enter the team passcode (change it under *Editor settings*).
3. Edit members (and their fun facts), the motto, the Instagram handle, team values, team projects, outreach hours, milestones, featured videos, updates, sponsors, tiers, the sponsor packet link, and contact topics.
4. Click **Preview site** to see the real site with your draft.
5. Click **Publish…** and follow the 4 steps (copy, open GitHub, paste, commit). The live site updates in about a minute.

#### Master controls (Site → Master controls in the editor)
Switches for the whole site, saved in the `controls` block of `content/content.json`. Like every editor change, they go live when you publish.
- **Maintenance mode:** every page shows a "We'll be right back" screen with your headline, message, optional "expected back" time, the team email, and social links. The editor keeps working. On a device where someone has used the editor, the maintenance screen has a **View the site anyway** button, and a reminder pill stays on screen while maintenance is on. This hides the site from visitors, but a static site can't truly lock anyone out, so don't rely on it to hide private information.
- **Announcement banner:** a strip above the header on every page, with optional "Learn more" link and three styles (info, celebrate, heads up). Visitors can close it; it comes back for them when you change the text.
- **Features:** turn the Arcade, Score Calculator, Media page, trophies, Steel AI, or the contact form off. Their menu, footer, and in-page links disappear, their pages say "taking a break", and the Contact page shows the team email when the form is off.
- **Search engines:** turn off to add a `noindex` tag so Google and others stop listing the site.

New photos: use **Prepare a new image** in the editor. It crops and shrinks the photo and downloads it. Then upload it to `assets/img/team/` (or `projects/`, `sponsors/`) on GitHub. The Publish dialog has links.

### Option 2: edit `content/content.json` directly
Everything editable lives in that one file.

## Trophies

Visitors earn 86 PlayStation-style trophies (bronze, silver, gold, and a platinum for collecting them all) for exploring the site and playing the arcade. Earned trophies pop up in the corner and are listed on **/trophies.html**. Trophy definitions live in `assets/js/trophies.js`; pages and games award them with `SS.trophy("id")`. Progress is saved per browser.

### Steel AI (site assistant)

Every page except the editor and the arcade games has an **Ask Steel AI** button in the bottom-right corner. It runs entirely in the visitor's browser: no server, no API key, no cost. Code is in `assets/js/steel-ai.js`.

- **Where answers come from:** `content/content.json` (team, members, sponsors, milestones), `content/seasons.json` (every game since 2017–18), `assets/js/calc-data.js` (point values, fouls, ranking points), the official game manuals (`content/manuals/`), live FTCScout results, the arcade list, trophies, and a short list of FTC basics written into the file.
- **Game manuals:** every season since 2017–18 is split into its individual rules and sections in `content/manuals/<year>.json`. Rule questions ("how many motors can a robot have?", "what is G417 in DECODE?") get the rule quoted with its number, page, and a link that opens the official PDF at that page. With no season named, it searches the current season's manual. A visitor's browser only downloads a season's manual (about 300 KB) when they ask about it.
- **Adding a new season's manual:** download the PDF from FIRST, add a line to `SOURCES` in `tools/build_manuals.py`, and run `python tools/build_manuals.py <folder with the PDFs>`. If FIRST releases a team update, rerun it with the new PDF so the rules stay current. Manuals from 2021–22 onward link to FIRST's site; older ones link to an archived copy because FIRST no longer hosts them.
- **How it answers:** exact questions (points, fouls, ranking points, people, results, joining, sponsoring) get exact answers. Everything else is matched with a small search engine over the same data. It remembers the last season you asked about, so "what about INTO THE DEEP?" works.
- **Updating it:** edit the content files as usual and Steel AI picks up the changes. To teach it something new, add a line to `BASICS` in `steel-ai.js`.
- **Limits:** it isn't a full chatbot. It finds and quotes the closest rule, so an oddly worded question can land on a nearby rule; the "Open the manual" link and the FTC Q&A forum have the final word.
- **Small helpers:** it fixes small typos in long words and shows how it read the question ("motrs" → motors). Rule answers offer the same question for the previous season. Pressing the up arrow in the empty box brings back your last question. Any link or button with `data-ai-ask="question"` opens Steel AI and asks it, like the card on the FTC page.
- Open it with a question already asked: `index.html?ask=How many points is a HIVE TIP?`

## The arcade

Thirteen original games share one engine (`assets/js/arcade/kit.js`): sound, particles, overlays, pause, fullscreen, touch controls, and best scores saved per device.

Sound effects are made in code, so there are no audio files to download. `Arcade.Sound` has named effects for every game to share: `select`, `pickup`, `combo(n)`, `hit`, `thud`, `boom`, `miss`, `fail`, `error`, `win`, `star(i)`, `record`, `gameOver`, `go`, `warn`, `zap`, `steam`, `whoosh`, and `rewind`. It also has `Sound.loop()` for held sounds such as the motor hum in Overclock and Mecanum Rush. The engine plays a start sound, a pause and resume sound, a chime for each star on a level-complete card, and a fanfare for a new personal best (which replaces the game-over sound).

Every game has five difficulty levels: **Super Easy, Easy, Medium, Hard, and Extreme**. The badge in each game's toolbar shows the current level; click it (or the gear button) to open **Settings**, which also has sound effects and volume, screen shake, particles, glow effects, high contrast, and larger text. The engine adds a soft neon glow and vignette to every game; it turns the glow off by itself on devices that can't keep a smooth frame rate. Settings are shared by all games and saved per browser.

- Action games get faster and less forgiving at higher levels.
- Puzzles change their rules: easier levels add hints (Gridlock's Super Easy shows the next best move after every move), while Hard and Extreme add move, block, or loop limits and turn off hints (and undo on Extreme). Every level stays solvable on every difficulty.
- Most games have an Extreme-only trophy, and earning 3 of them unlocks **Daredevil**.

| Game | Type | Notes |
|---|---|---|
| Overclock | One-button runner | Heat management, crushers, lasers, vents, furnaces |
| Gridlock | Sliding puzzle, 40 levels | Generated by a solver; par = true minimum (`tools/gridlock_levels.js`); in-game hints |
| Echo | Time-loop puzzle, 9 levels | Each level's intended solution is replayed by `tools/check_levels.js` |
| Pit Crew | Reflex arcade | Match faults to tools; combos, golden robots, strikes |
| Autonomous | Coding puzzle, 18 levels | Generated by a shortest-path solver; par = fewest blocks (`tools/autonomous_levels.js`); hints reveal an optimal program |
| Signal Lost | Stealth maze | Procedural mazes; pings reveal walls and alert drones; decoys |
| Flywheel | Aim and launch | Hood angle and flywheel speed, like our real shooter; wind and moving hive |
| Mecanum Rush | Time trial, 8 courses | Field- or robot-centric driving, cone penalties, ghost of your best run |
| Wire Up | Rotation puzzle, endless | Boards are random spanning trees, so every circuit is solvable; board size follows the difficulty (4×4 to 11×11) |
| Stack Up | Timing, endless | Drop pieces from a sweeping linear slide; overhangs are trimmed |
| Balance | Physics, survival | Keep a tilting platform level while collecting falling game pieces |
| Odometry | Memory, endless | Watch a route, then drive it from memory; routes grow by one step |
| Kilovolt | Trivia, daily | Name real FTC teams that fit each prompt; rarer answers score more (see below) |

### Kilovolt (team-name trivia)

Seven prompts a day, like "Name an FTC team from Ohio." Any real team that fits scores, but less famous answers are worth more: **Spark** (100 V), **Static**, **Current**, **Voltage**, **Overload**, and **Full Surge** (1,000 V), up to 7,000 V a day. Steel Surge always counts as a Full Surge when it fits.

- **Data:** `content/teams.json` lists every FTC team that has competed since 2019–20 (about 15,000), built by `node tools/fetch-teams.mjs` from FTCScout. "Fame" comes from each team's awards, seasons, events, and age. The daily GitHub Action refreshes it every Monday.
- **Prompts** are generated from the data (states, provinces, countries, big cities, rookie seasons, name keywords, and themes like animals or food), so new teams and places appear automatically.
- **Daily Charge** is the same for everyone each day; **Unlimited** plays random rounds. The difficulty setting changes the answer timer.
- **FRC** isn't included yet: the free FRC data sources were down or need an API key. The game is built so another program's team list can be added later.

Easter egg: type ↑ ↑ ↓ ↓ ← → ← → B A anywhere on the site.

## Score calculator

**/calculator.html** scores any FTC game since 2017–18. Pick a season, tap what your alliance scored, and see the total, a breakdown by period, fouls, and ranking points (with win or loss if you enter the other alliance's score). Results can be shared as a link, and the last inputs for each season are saved on the device. Each season on the FTC page links to its calculator, and the calculator is in the main menu.

- **Data:** `assets/js/calc-data.js` holds every season's point values, taken from the official manuals.
- **Checked against real matches:** for every season since 2019–20, recorded FTCScout match results were run through these point values; about 1,700 alliance scores matched exactly. (Earlier seasons aren't in FTCScout, so they're checked against the manuals only.)
- **Adding a season:** add an entry at the top of `calc-data.js` with its items (`count`, `robots`, `slots`, or `toggle`), foul values, and any bonus ranking points.

## FTC page: seasons and 3D fields

The FTC page (`ftc.html`) has a season explorer covering every game from 2017–18 (RELIC RECOVERY) to the current season. The newest season shows by default; visitors pick others from the menu, and links like `ftc.html?season=2024` open a specific one. Each season has a detailed game description and an interactive 3D field (drag to orbit, scroll to zoom, hover parts for labels).

**Adding a new season (once a year, after kickoff):**
1. Add an entry at the top of `content/seasons.json` (same fields as the others: name, summary, periods, elements, scoring table).
2. Add a field builder for that year in `assets/js/fields3d.js` (copy a similar season and adjust the pieces from the game manual).

If a season has no 3D builder yet, the page still shows its description.

## Developer notes

```
*.html, arcade/*.html     Page shells, generated by tools/build_pages.py
tools/ftc_page.html       Content of the FTC page
content/content.json      All editable content
content/videos.json       Auto-refreshed YouTube list (don't edit)
content/ftc.json          Auto-refreshed FTCScout backup (don't edit)
assets/css/               site.css (design tokens at top), game.css, editor.css
assets/js/site.js         Header/footer, content, FTCScout, page renderers, easter egg
assets/js/editor.js       Team editor (developer mode)
assets/js/trophies.js     Trophy list, pop-ups, and the trophy case
content/seasons.json      FTC season descriptions for the FTC page
assets/js/calc-data.js    Score calculator point values for every season
assets/js/calculator.js   Score calculator page
assets/js/fields3d.js     3D field models (three.js, loaded only when needed)
assets/img/projects/      Team project photos
assets/img/brands/        FIRST Tech Challenge and FTCScout logos
assets/js/arcade/         Game engine + thirteen games
content/teams.json        Every FTC team since 2019 for Kilovolt (auto-refreshed weekly)
tools/                    Page builder, level generators, image generator, data refresh
.github/workflows/        Daily data refresh
```

- **Run locally:** `python tools/serve.py`, then open http://localhost:5173. Opening the files directly won't work. (It's like `python -m http.server`, but handles many connections at once and never caches.)
- **Check links:** `python tools/check_links.py` confirms every internal link, image, and script exists.
- **After changing layout, CSS, or JS:** run `python tools/build_pages.py`. It rebuilds the pages and stamps a new version on asset links so visitors get the update right away.
- **Logo and icons:** the official logo lives at `assets/img/brand/logo-source.png`. To change it, replace that file and run `python tools/make_images.py` (needs `pip install pillow`). It rebuilds the homepage logo, header icon, browser-tab icon, app icons, and the social share card.
- **Merch picture:** `assets/img/projects/team-merch.jpg` (the team shirt and stickers on the Team page) is drawn by `python tools/make_merch.py` from the same logo. Rerun it after a logo change. When you have a real photo of the shirts, upload it in the editor under Team → Projects instead.
- **Levels:** `node tools/check_levels.js` checks Echo; the generators check Gridlock and Autonomous.
- **Editor passcode:** only a SHA-256 hash is stored. It keeps the editor out of sight; it isn't real security and can't change the live site. Publishing always needs the team's GitHub login.
- **Contact form:** sends through [FormSubmit](https://formsubmit.co) to the team email. The **first** message triggers a one-time activation email; click its link. If sending fails, visitors get a pre-filled email instead.
- **After a deploy:** if a browser pairs a cached old page with the new script, the site reloads that page once automatically.
- **Custom domain later?** Add a `CNAME` file and update `SITE` in `tools/build_pages.py` (used for share links and the sitemap).
