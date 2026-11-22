"""Checks that every internal link and asset referenced by the site exists.

    python tools/check_links.py

Scans the built HTML pages plus the url("...") references inside the site scripts.
"""
import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
os.chdir(ROOT)
missing = []


def check(ref, base, where):
    ref = ref.split("#")[0].split("?")[0]
    if not ref or re.match(r"^(https?:|mailto:|tel:|data:|javascript:|//)", ref) or "${" in ref or "'" in ref or "(" in ref:
        return
    path = os.path.normpath(os.path.join(base, ref))
    if not os.path.exists(path):
        missing.append(f"{where}: {ref}")


pages = glob.glob("*.html") + glob.glob("arcade/*.html")
for page in pages:
    html = open(page, encoding="utf-8").read()
    base = os.path.dirname(page) or "."
    if "<base href" in html or 'document.write(\'<base' in html:
        base = "."
    for ref in re.findall(r'(?:href|src)="([^"]+)"', html):
        check(ref, base, page)

for js in glob.glob("assets/js/**/*.js", recursive=True):
    src = open(js, encoding="utf-8").read()
    for ref in re.findall(r'url\("([^"]+)"\)', src):
        check(ref, ".", js)

ids = {"index", "team", "achievements", "ftc", "media", "arcade", "sponsors", "contact", "trophies", "editor"}
for page in ids:
    if not os.path.exists(f"{page}.html"):
        missing.append(f"page missing: {page}.html")

if missing:
    print("Missing references:")
    print("\n".join(sorted(set(missing))))
    sys.exit(1)
print(f"All internal links and assets resolve ({len(pages)} pages checked).")
