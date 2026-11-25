"""Builds one link-preview image per main page (assets/img/og/<page>.jpg), in the
same style as the site-wide share card. Pages without their own image use
assets/img/og-image.jpg. Needs Pillow:

    python tools/make_og.py
"""
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "img")
OUT = os.path.join(ROOT, "og")
os.makedirs(OUT, exist_ok=True)
W, H = 1200, 630
BG = (9, 12, 17)
SURGE = (59, 168, 255)

PAGES = {
    "team": ("Meet the crew", "The students who design, build, code, and promote our robot."),
    "ftc": ("What is FTC?", "How FIRST Tech Challenge works, and every recent game in 3D."),
    "calculator": ("Match tools", "Score any FTC match, and scout events with live stats."),
    "codelab": ("Code Lab", "Free FTC programming practice: debug, write, and drive a robot."),
    "media": ("Videos & updates", "Builds, matches, and moments from the build room."),
    "arcade": ("The Arcade", "Thirteen original robot games you can play in your browser."),
    "sponsors": ("Power the surge", "Sponsor a student robotics team in Kennett Square, PA."),
    "contact": ("Get in touch", "Sponsorship, joining the team, demos, or just a question."),
    "trophies": ("Trophy case", "Earn trophies by exploring the site and playing the arcade."),
}


def font(names, size):
    for n in names:
        for d in (r"C:\Windows\Fonts", "/usr/share/fonts/truetype/dejavu", "/Library/Fonts"):
            p = os.path.join(d, n)
            if os.path.exists(p):
                f = ImageFont.truetype(p, size)
                if hasattr(f, "set_variation_by_name"):
                    try:
                        f.set_variation_by_name("Bold")
                    except Exception:
                        pass
                return f
    return ImageFont.load_default()


def radial_alpha(size, inner, outer):
    m = Image.new("L", (size, size))
    px = m.load()
    c = size / 2
    for y in range(size):
        for x in range(size):
            r = math.hypot(x - c, y - c) / c
            px[x, y] = int(255 * max(0.0, min(1.0, (outer - r) / (outer - inner))))
    return m


def wrap(draw, text, f, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


logo = Image.open(os.path.join(ROOT, "brand", "logo-source.png")).convert("RGB")
emblem = logo.convert("RGBA").resize((470, 470), Image.LANCZOS)
emblem.putalpha(radial_alpha(470, 0.78, 1.08))
title_f = font(["bahnschrift.ttf", "segoeuib.ttf", "DejaVuSans-Bold.ttf"], 86)
sub_f = font(["segoeui.ttf", "bahnschrift.ttf", "DejaVuSans.ttf"], 34)
kick_f = font(["consolab.ttf", "DejaVuSansMono-Bold.ttf"], 24)

for page, (title, sub) in PAGES.items():
    card = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(card)
    for x in range(0, W, 48):
        d.line([(x, 0), (x, H)], fill=(18, 24, 32))
    for y in range(0, H, 48):
        d.line([(0, y), (W, y)], fill=(18, 24, 32))
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse([700, 60, 1180, 580], fill=(20, 90, 160))
    card = ImageChops.add(card, glow.filter(ImageFilter.GaussianBlur(100)))
    card.paste(emblem, (W - 470 - 40, 80), emblem)
    d = ImageDraw.Draw(card)
    d.rectangle([72, 150, 118, 154], fill=SURGE)
    d.text((132, 138), "STEEL SURGE · FTC 27254", font=kick_f, fill=SURGE)
    y = 196
    for line in wrap(d, title, title_f, 660):
        d.text((72, y), line, font=title_f, fill=(233, 238, 244))
        y += 96
    y += 10
    for line in wrap(d, sub, sub_f, 600):
        d.text((74, y), line, font=sub_f, fill=(151, 164, 180))
        y += 46
    d.rectangle([0, H - 8, W, H], fill=SURGE)
    card.save(os.path.join(OUT, f"{page}.jpg"), quality=86, optimize=True, progressive=True)
    print("wrote", page)
