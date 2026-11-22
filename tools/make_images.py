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


BOLT = [(34.76, 9.00), (43.73, 9.00), (35.45, 28.17), (44.42, 28.17), (25.45, 55.00), (33.03, 33.53), (24.07, 33.53)]


def mark(draw, cx, cy, s, box=True):
    """The Steel Surge bolt (same points as assets/img/logo.svg, 64-unit box) centered at (cx, cy), s px wide."""
    k = s / 64
    P = [(cx + (x - 32) * k, cy + (y - 32) * k) for x, y in BOLT]
    if box:
        draw.rounded_rectangle([cx - 30.5 * k, cy - 30.5 * k, cx + 30.5 * k, cy + 30.5 * k], radius=14 * k, fill=(20, 25, 31), outline=(58, 71, 87), width=max(1, int(2 * k)))
    draw.line(P + [P[0]], fill=(30, 111, 224), width=max(2, int(5 * k)), joint="curve")
    draw.polygon(P, fill=SURGE)


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
mark(d, 170, 250, 230, box=False)
big = font(["bahnschrift.ttf", "segoeuib.ttf", "DejaVuSans-Bold.ttf"], 124)
if hasattr(big, "set_variation_by_name"):
    try: big.set_variation_by_name("Bold")
    except Exception: pass
mid = font(["bahnschrift.ttf", "segoeui.ttf", "DejaVuSans.ttf"], 40)
mono = font(["consolab.ttf", "DejaVuSansMono-Bold.ttf"], 26)
d.text((300, 150), "STEEL", font=mid, fill=(185, 195, 207))
d.text((294, 196), "SURGE", font=big, fill=(233, 238, 244))
d.text((306, 340), "FIRST Tech Challenge Team 27254", font=mid, fill=(151, 164, 180))
d.text((306, 396), "SURGE AHEAD  ·  KENNETT SQUARE, PA", font=mono, fill=SURGE2)
img.save(os.path.join(OUT, "og-image.png"), optimize=True)
print("icons + og-image written")
