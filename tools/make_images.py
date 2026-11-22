"""Generates the app icons and the social share image. Needs Pillow:
    pip install pillow
    python tools/make_images.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "img")
BG, STEEL_HI, STEEL_LO, LINE, SURGE, SURGE2, INK = (9, 12, 17), (58, 71, 87), (21, 28, 37), (90, 106, 125), (59, 168, 255), (154, 214, 255), (4, 18, 32)


def font(names, size):
    for n in names:
        for d in (r"C:\Windows\Fonts", "/usr/share/fonts/truetype/dejavu", "/Library/Fonts"):
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def mark(draw, cx, cy, s):
    """Hex nut + lightning bolt, matching logo.svg (s = size of the 40-unit viewBox)."""
    k = s / 40
    P = lambda pts: [(cx + (x - 20) * k, cy + (y - 20) * k) for x, y in pts]
    hexp = P([(20, 1.8), (36.2, 11), (36.2, 29), (20, 38.2), (3.8, 29), (3.8, 11)])
    draw.polygon(hexp, fill=STEEL_LO, outline=LINE, width=max(1, int(1.4 * k)))
    inner = P([(20, 4.5), (33.8, 12.4), (33.8, 18), (20, 10), (6.2, 18), (6.2, 12.4)])
    draw.polygon(inner, fill=STEEL_HI)
    bolt = P([(23.2, 7.5), (12.4, 22.2), (19.3, 22.2), (16.8, 32.6), (27.6, 17.6), (20.6, 17.6)])
    draw.polygon(bolt, fill=SURGE, outline=INK, width=max(1, int(0.8 * k)))


def icon(size, maskable=False):
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    mark(d, size / 2, size / 2, size * (0.62 if maskable else 0.78))
    return img


for s in (180, 192, 512):
    icon(s, maskable=s != 180).save(os.path.join(OUT, f"icon-{s}.png"), optimize=True)

# Social share card 1200x630
W, H = 1200, 630
img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
for x in range(0, W, 48):
    d.line([(x, 0), (x, H)], fill=(19, 27, 37))
for y in range(0, H, 48):
    d.line([(0, y), (W, y)], fill=(19, 27, 37))
for i, (x0, y0, pts) in enumerate([(0, 0, [(0, 560), (240, 560), (288, 600), (640, 600)]), (0, 0, [(1104, 96), (960, 96), (960, 240)])]):
    d.line(pts, fill=SURGE if i == 0 else (255, 181, 71), width=4)
mark(d, 170, 240, 200)
big = font(["segoeuib.ttf", "DejaVuSans-Bold.ttf"], 120)
mid = font(["segoeui.ttf", "DejaVuSans.ttf"], 40)
mono = font(["consolab.ttf", "DejaVuSansMono-Bold.ttf"], 26)
d.text((300, 150), "Steel", font=big, fill=(233, 238, 244))
d.text((300, 270), "Surge", font=big, fill=SURGE)
d.text((306, 420), "FIRST Tech Challenge Team 27254", font=mid, fill=(151, 164, 180))
d.text((306, 476), "KENNETT SQUARE, PA  ·  LIVE STATS  ·  ARCADE", font=mono, fill=SURGE2)
img.save(os.path.join(OUT, "og-image.png"), optimize=True)
print("icons + og-image written")
