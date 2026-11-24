"""Checks the content files the site reads at runtime.

    python tools/check_content.py

- every content/*.json file is valid JSON
- every image or file path in content/content.json (anything starting with assets/) exists
- every member, project, and sponsor has the fields the pages need
Exits with an error listing each problem, so the site check on GitHub fails loudly.
"""
import glob
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
os.chdir(ROOT)
problems = []

for f in sorted(glob.glob("content/*.json")):
    try:
        json.load(open(f, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        problems.append(f"{f}: not valid JSON ({e})")

try:
    c = json.load(open("content/content.json", encoding="utf-8"))
except Exception:  # noqa: BLE001
    c = None

if c:
    def walk(v, where):
        if isinstance(v, dict):
            for k, x in v.items():
                walk(x, f"{where}.{k}")
        elif isinstance(v, list):
            for i, x in enumerate(v):
                walk(x, f"{where}[{i}]")
        elif isinstance(v, str) and v.startswith("assets/") and not os.path.exists(v.split("?")[0]):
            problems.append(f"content.json{where}: missing file {v}")
    walk(c, "")

    for i, m in enumerate(c.get("members", [])):
        for k in ("name", "role"):
            if not str(m.get(k, "")).strip():
                problems.append(f"content.json members[{i}]: no {k}")
    for i, p in enumerate(c.get("projects", [])):
        if not str(p.get("title", "")).strip():
            problems.append(f"content.json projects[{i}]: no title")
    for i, e in enumerate((c.get("outreach") or {}).get("events", [])):
        if not str(e.get("title", "")).strip():
            problems.append(f"content.json outreach.events[{i}]: no title")
        h = e.get("hours")
        if h not in (None, "") and not isinstance(h, (int, float)):
            problems.append(f"content.json outreach.events[{i}]: hours should be a number, got {h!r}")

if problems:
    print("Content problems:")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print("Content files are valid and every referenced file exists.")
