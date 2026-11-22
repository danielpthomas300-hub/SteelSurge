"""Builds content/manuals/<year>.json, the game-manual search index Steel AI uses.

Usage:  python tools/build_manuals.py <folder with the PDFs>

The folder holds the official FIRST Tech Challenge manuals, named by season start year:
  2024.pdf, 2025.pdf, 2026.pdf           Competition Manual (2024-25 onward)
  2017-gm1.pdf, 2017-gm2.pdf, ...         Game Manual Part 1 and Part 2 (2017-18 to 2023-24)
Needs `pdftotext` (poppler; it ships with Git for Windows).

Each manual is split into rules (G301, <GS4>, ...) and plain sections, with the page
each one starts on, so answers can quote a rule and link straight to that page.
To add a new season: drop its manual into the folder, add it to SOURCES below, and rerun.
"""
import json, os, re, subprocess, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "content", "manuals")
FR = "https://ftc-resources.firstinspires.org"
GH = "https://media.githubusercontent.com/media/abidingabi/ftc-history/main/assets/seasons"

# year: (game name, [(file, label, public url)])
SOURCES = {
    2026: ("BIOBUZZ", [("2026", "Competition Manual", f"{FR}/ftc/game/manual")]),
    2025: ("DECODE", [("2025", "Competition Manual", f"{FR}/ftc/archive/2026/game/manual")]),
    2024: ("INTO THE DEEP", [("2024", "Competition Manual", f"{FR}/ftc/archive/2025/game/manual")]),
    2023: ("CENTERSTAGE", [("2023-gm2", "Game Manual Part 2", f"{FR}/ftc/archive/2024/game/gm2"), ("2023-gm1", "Game Manual Part 1", f"{FR}/ftc/archive/2024/game/gm1")]),
    2022: ("POWERPLAY", [("2022-gm2", "Game Manual Part 2", f"{FR}/ftc/archive/2023/game/gm2"), ("2022-gm1", "Game Manual Part 1", f"{FR}/ftc/archive/2023/game/gm1")]),
    2021: ("FREIGHT FRENZY", [("2021-gm2", "Game Manual Part 2", f"{FR}/ftc/archive/2022/game/gm2"), ("2021-gm1", "Game Manual Part 1", f"{FR}/ftc/archive/2022/game/gm1")]),
    2020: ("ULTIMATE GOAL", [("2020-gm2", "Game Manual Part 2", f"{GH}/2020-2021/game-manual-part-2-traditional-events.pdf"), ("2020-gm1", "Game Manual Part 1", f"{GH}/2020-2021/game-manual-part-1-traditional-events.pdf")]),
    2019: ("SKYSTONE", [("2019-gm2", "Game Manual Part 2", f"{GH}/2019-2020/game-manual-part-2.pdf"), ("2019-gm1", "Game Manual Part 1", f"{GH}/2019-2020/game-manual-part-1.pdf")]),
    2018: ("ROVER RUCKUS", [("2018-gm2", "Game Manual Part 2", f"{GH}/2018-2019/game-manual-part-2.pdf"), ("2018-gm1", "Game Manual Part 1", f"{GH}/2018-2019/game-manual-part-1.pdf")]),
    2017: ("RELIC RECOVERY", [("2017-gm2", "Game Manual Part 2", f"{GH}/2017-2018/game-manual-part-2.pdf"), ("2017-gm1", "Game Manual Part 1", f"{GH}/2017-2018/game-manual-part-1.pdf")]),
}

NEW_RULE = re.compile(r"^([A-Z]{1,2}\d{3}[A-Z]?)(?:\s+\*?\s*([A-Z0-9\"'(].*))?$")          # G301 *Don't delay MATCHES. ...
OLD_RULE = re.compile(r"^<([A-Z]{1,3}\d{1,3}[a-z]?)>\s*(.*)$")                           # <G29> Title – text
# Old manuals often run several rules into one line: start a new line at each "<ID> Title – "
OLD_SPLIT = re.compile(r"\s(?=<[A-Z]{1,3}\d{1,3}[a-z]?>\s[^<]{2,110}?\s[–-]\s)")
HEADING = re.compile(r"^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+([A-Z][^.]{2,80})$")             # 5.6 ROBOT Carts
DOTS = re.compile(r"\.{4,}|…{2,}|(\. ){4,}")


def clean(s):
    s = s.replace("­", "").replace("�", "–").replace("–", "–").replace("", "•")
    s = re.sub(r"[‘’]", "'", s)
    s = re.sub(r"[“”]", '"', s)
    return re.sub(r"\s+", " ", s).strip()


def pages_of(pdf):
    txt = subprocess.run(["pdftotext", "-enc", "UTF-8", pdf, "-"], capture_output=True, check=True).stdout.decode("utf-8", "replace")
    pages = [[clean(l) for l in p.split("\n")] for p in txt.split("\f")]
    # Running headers/footers repeat on many pages: drop any line (digits ignored) seen on a quarter of them
    norm = lambda l: re.sub(r"\d+", "#", l)
    seen = Counter(n for p in pages for n in {norm(l) for l in p if l})
    common = {n for n, k in seen.items() if k >= max(4, len(pages) // 4)}
    return [[l for l in p if l and norm(l) not in common and not re.fullmatch(r"(Page )?\d+( of \d+)?", l)] for p in pages]


def parse(pdf, src):
    pages = pages_of(pdf)
    docs, cur, section = [], None, ""

    def flush():
        nonlocal cur
        if cur and len(" ".join(cur["lines"]).split()) >= 6:
            text = clean(" ".join(cur["lines"])).lstrip("* ")
            if cur["rule"] and not cur["title"]:
                if cur["old"]:
                    t = re.split(r"\s+[–-]\s+", text, maxsplit=1)[0]
                else:
                    t = (re.match(r"(.{3,110}?[.!?])(\s|$)", text) or [None, ""])[1]
                cur["title"] = t if len(t) < 110 else ""
            if cur["rule"]:
                docs.append({"r": cur["rule"], "t": cur["title"], "x": text, "p": cur["page"], "s": section, "m": src})
            else:  # long sections become several ~140-word chunks
                w = text.split()
                for i in range(0, len(w), 140):
                    part = " ".join(w[i:i + 160])
                    if len(part.split()) >= 12:
                        docs.append({"r": "", "t": cur["title"], "x": part, "p": cur["page"], "s": section, "m": src})
        cur = None

    for pno, lines in enumerate(pages, 1):
        if sum(bool(DOTS.search(l)) for l in lines) >= 3:  # table of contents page
            continue
        for l in [x for line in lines for x in OLD_SPLIT.split(line)]:
            if DOTS.search(l):
                continue
            m_new, m_old, m_h = NEW_RULE.match(l), OLD_RULE.match(l), HEADING.match(l)
            if m_new or m_old:
                flush()
                rid, rest = (m_new or m_old).groups()
                cur = {"rule": rid, "title": "", "old": bool(m_old), "lines": [rest or ""], "page": pno}
            elif m_h and not l.endswith((",", ";")) and len(l.split()) <= 12:
                flush()
                section = clean(f"{m_h.group(1)} {m_h.group(2)}")
                cur = {"rule": "", "title": section, "old": False, "lines": [], "page": pno}
            else:
                if cur is None:
                    cur = {"rule": "", "title": section, "old": False, "lines": [], "page": pno}
                cur["lines"].append(l)
    flush()
    # A rule ID can show up twice (e.g., a summary table): keep the longest copy
    best = {}
    for i, d in enumerate(docs):
        if d["r"]:
            k = d["r"]
            if k not in best or len(d["x"]) > len(docs[best[k]]["x"]):
                best[k] = i
    return [d for i, d in enumerate(docs) if not d["r"] or best[d["r"]] == i]


def main(folder):
    os.makedirs(OUT, exist_ok=True)
    index = []
    for year, (name, files) in SOURCES.items():
        docs, srcs = [], []
        for n, (f, label, url) in enumerate(files):
            pdf = os.path.join(folder, f + ".pdf")
            if not os.path.exists(pdf):
                print(f"  skip {f}.pdf (missing)"); continue
            srcs.append({"label": label, "url": url})
            docs += parse(pdf, len(srcs) - 1)
        if not docs:
            continue
        data = {"year": year, "name": name, "sources": srcs, "docs": docs}
        with open(os.path.join(OUT, f"{year}.json"), "w", encoding="utf-8", newline="\n") as fh:
            json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
        rules = sum(1 for d in docs if d["r"])
        index.append({"year": year, "name": name, "rules": rules, "sections": len(docs) - rules, "sources": srcs})
        print(f"{year} {name}: {rules} rules, {len(docs) - rules} sections, {os.path.getsize(os.path.join(OUT, f'{year}.json')) // 1024} KB")
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(index, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "manuals")
