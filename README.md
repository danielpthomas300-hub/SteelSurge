# Steel Surge — FTC Team 27254 website

**Live:** https://danielpthomas300-hub.github.io/SteelSurge/ (GitHub Pages) · https://steelsurge-27254.netlify.app (Netlify)

A static site: plain HTML, CSS, and JavaScript. No server, no database, no monthly cost. This file is for whoever maintains it.

---

## Updating the site (no code)

1. Open **/editor.html** (or press **Ctrl + Shift + E** on any page) and enter the team passcode.
2. Make changes. Drafts save on your device as you type. **Live preview** shows the real page beside the form.
3. Click **Publish** → review the list of changes and any warnings → copy → open `content.json` on GitHub → paste → **Commit changes**. GitHub Pages updates in about a minute.

**Handy editor features:** the **Overview** page shows what needs attention and has quick actions (log outreach, post an update, add a member or sponsor). **Ctrl + K** searches everything. **Ctrl + Z** undoes any change, even a deleted item. Back up or restore a draft under **Editor settings**. **Site sweep** (Site → Site sweep, or the Overview's quick actions) checks every page, internal link, picture, and data refresh on the live site in seconds, with a Fix button for each problem. Run it after publishing and before turning maintenance mode off (the editor offers to).

**Photos and logos:** use **Prepare a new image** on the photo field. It crops, shrinks, and downloads the file; then upload it to `assets/img/team/`, `projects/`, or `sponsors/` on GitHub (the Publish dialog links there).

**Master controls** (Site → Master controls) switch things for the whole site:
- **Maintenance mode:** a "We'll be right back" page for visitors. It hides the site but isn't real security.
- **Announcement banner:** a strip on every page, with an optional link and an end date so it hides itself.
- **Features:** turn off the Arcade, Match tools, scouting, Code Lab, weekly challenge, Media page, trophies, Steel AI, or the contact form. Their links disappear everywhere.
- **Search engines:** off asks Google not to list the site.

**More site options** (also under Site):
- **Appearance:** the accent color (presets or any custom color), the theme first-time visitors see, and animations on or off.
- **Home page:** show or hide each home section, rewrite the "what we do" cards and season steps, and pick the three featured arcade games.
- **Steel AI answers:** write your own question-and-answer pairs (meeting times, how to join). Steel AI gives these first.
- The Overview's **Systems** switches flip features on or off in one click, and its health score drops as to-dos pile up.

**Good to know:**
- **Outreach log** (Season → Outreach): log team hours per event (4 people × 3 hours = 12). The home and sponsor pages add up this season's hours (seasons start September 1).
- **Alumni:** tick "Alumni" on a member to move them to a small Alumni list on the Team page.
- Everything editable lives in `content/content.json`, if you'd rather edit it directly.

---

## What runs by itself

| Thing | Source |
|---|---|
| Events, matches, awards, "Up next" countdown | [FTCScout](https://ftcscout.org/teams/27254), live in visitors' browsers |
| Latest videos, backup FTC stats | Daily GitHub Action → `content/videos.json`, `content/ftc.json` |
| Every FTC team (for Kilovolt) | Same Action, Mondays → `content/teams.json` |
| Outreach hours, season label, team size | Calculated from the content |
| Weekly arcade challenge | Rotates every Monday 00:00 UTC |

**GitHub Actions** (the repo's Actions tab, where you can also run each by hand):
- **Refresh site data:** daily. Needs **Settings → Actions → General → Workflow permissions → Read and write** (already set).
- **Site check:** every push. Checks scripts, content, links, puzzle levels, and the Code Lab, and emails whoever pushed if something breaks.
- **Weekly link check:** Mondays. Opens an issue listing broken outside links or deleted videos, and closes it once they work again.
- **Website check-in:** every other Monday. Posts an issue summarizing site health and stale content (both sites up to date, jobs passing, outreach logged, recent updates).

**Two things that aren't automatic:**
- **Netlify** isn't connected to GitHub, so it only changes when someone redeploys it. To make it automatic, link the GitHub repo in Netlify (Site configuration → Build & deploy), or treat GitHub Pages as the official site. The check-in warns when Netlify falls behind.
- **Contact form:** messages go to the team email through [FormSubmit](https://formsubmit.co). The first message ever sent triggers an "Activate Form" email (check spam); messages arrive only after someone clicks it. If sending fails, visitors get a pre-filled email instead.

---

## What's on the site, and where it lives

| Feature | Page | Change it in |
|---|---|---|
| **Code Lab**: coding, CAD, and outreach lessons; debug questions; drills; robot challenges with a simulated field (autonomous + TeleOp) | `codelab.html` | `assets/js/codelab-data.js`, then run `node tools/test_codelab.js` |
| **Match tools**: score calculator for every game since 2017–18, plus event scouting (FTCScout stats, notes, pick list) | `calculator.html` | Point values: `assets/js/calc-data.js`. Scouting: `assets/js/scouting.js` |
| **Arcade**: 13 games with 5 difficulty levels, trophies, and a weekly challenge | `arcade.html`, `arcade/` | `assets/js/arcade/` (shared engine: `kit.js`) |
| **FTC page**: every game since 2017–18 with a 3D field | `ftc.html` | `content/seasons.json`, `assets/js/fields3d.js`, `tools/ftc_page.html` |
| **Steel AI**: answers questions from the site's content and the official game manuals | every page | `assets/js/steel-ai.js` (`BASICS` list), `content/manuals/` |
| **Trophies**: 98 trophies, saved per browser | `trophies.html` | `assets/js/trophies.js` |

How the Code Lab works: `minijava.js` runs a simplified Java in the browser with real Java rules and beginner-friendly errors; `codelab-sim.js` is the field and robot. Its test suite checks every answer and drives every challenge to prove it can be finished.

---

## Once a year, after kickoff

1. **FTC page:** add the new game at the top of `content/seasons.json`, and a 3D field builder in `assets/js/fields3d.js` (copy a similar season).
2. **Score calculator:** add the season at the top of `assets/js/calc-data.js`.
3. **Steel AI rules:** add the manual PDF to `SOURCES` in `tools/build_manuals.py` and run `python tools/build_manuals.py <folder with PDFs>`. Rerun when FIRST posts a team update.
4. **Outreach:** update the "hours to show" caption in the editor if you aren't logging events yet.

---

## Developer notes

```
*.html, arcade/*.html     Generated pages. Edit tools/build_pages.py, not these.
content/                  content.json (editable) + auto-refreshed data
assets/js/site.js         Header, footer, content loading, FTCScout, page logic
assets/js/editor.js       Team editor
assets/css/               site.css (design tokens at the top) + page styles
tools/                    Page builder, checks, tests, image generators, data refresh
.github/workflows/        Data refresh, site check, link check, check-in
```

| Task | Command |
|---|---|
| Run locally | `python tools/serve.py`, then open http://localhost:5173 |
| Rebuild pages after changing HTML, CSS, or JS | `python tools/build_pages.py` (stamps a new version so visitors get updates) |
| Run every check | `python tools/check_content.py`, `python tools/check_links.py`, `node tools/check_levels.js`, `node tools/test_codelab.js` |
| Check outside links | `node tools/check_external.mjs` |
| New logo or icons | Replace `assets/img/brand/logo-source.png`, then `python tools/make_images.py`, `python tools/make_og.py` (link previews), and `python tools/make_merch.py` (needs `pip install pillow`) |
| Publish code changes | Commit and push to `main`; GitHub Pages updates itself. Redeploy Netlify separately (see above). |

- **Editor passcode:** only a SHA-256 hash is stored. It keeps visitors out of the editor, but publishing always needs the team's GitHub login.
- **Privacy:** members show names, roles, and photos only. All contact goes through the team email.
- **Custom domain later:** add a `CNAME` file and change `SITE` in `tools/build_pages.py`.
- **Easter egg:** ↑ ↑ ↓ ↓ ← → ← → B A on any page.
