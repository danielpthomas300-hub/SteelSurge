"""Builds every logo and icon file from the team logo. Needs Pillow:
    pip install pillow
    python tools/make_images.py

Source: assets/img/brand/logo-source.png (the official Steel Surge logo, square).
To change the logo, replace that file and run this script again.

Writes (in assets/img/):
  logo-hero.webp   homepage logo (dark theme), edges faded so it blends into the page
  logo-tile.webp   homepage logo (light theme), as a rounded tile
  logo-mark.png    small rounded logo for the header and footer
  favicon.png      browser-tab icon
  icon-180/192/512.png  phone home-screen and app icons
  og-image.jpg     the preview card shown when a link is shared
"""
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "img")
SRC = os.path.join(ROOT, "brand", "logo-source.png")
BG = (11, 14, 19)

logo = Image.open(SRC).convert("RGB")
if logo.width != logo.height:
    side = min(logo.size)
    logo = logo.crop(((logo.width - side) // 2, (logo.height - side) // 2, (logo.width + side) // 2, (logo.height + side) // 2))
N = logo.width


def radial_alpha(size, inner, outer):
    """Opaque in the middle, fading to transparent between `inner` and `outer` (fractions of half the size)."""
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    steps = 60
    for i in range(steps, -1, -1):
        t = i / steps
        r = (inner + (outer - inner) * t) * size / 2
        d.ellipse([size / 2 - r, size / 2 - r, size / 2 + r, size / 2 + r], fill=int(255 * (1 - t)))
    return m.filter(ImageFilter.GaussianBlur(size / 80))


def rounded(img, radius):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius=radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(m)
    return out


# Homepage logo: soft-edged so the square background melts into the page
hero = logo.convert("RGBA")
hero.putalpha(radial_alpha(N, 0.78, 1.06))
hero.resize((560, 560), Image.LANCZOS).save(os.path.join(ROOT, "logo-hero.webp"), quality=90, method=6)
# Light theme: a clean rounded tile reads better than faded edges on a white page
rounded(logo.resize((560, 560), Image.LANCZOS), 64).save(os.path.join(ROOT, "logo-tile.webp"), quality=90, method=6)

# Header/footer mark: crop in on the badge so it reads at small sizes
c = int(N * 0.06)
badge = logo.crop((c, c, N - c, N - c))
rounded(badge.resize((96, 96), Image.LANCZOS), 20).save(os.path.join(ROOT, "logo-mark.png"), optimize=True)
rounded(badge.resize((64, 64), Image.LANCZOS), 12).save(os.path.join(ROOT, "favicon.png"), optimize=True)

# App icons (full square; phones round the corners themselves)
for s in (180, 192, 512):
    logo.resize((s, s), Image.LANCZOS).save(os.path.join(ROOT, f"icon-{s}.png"), optimize=True)


# Social share card, 1200 x 630
def font(names, size):
    for n in names:
        for d in (r"C:\Windows\Fonts", "/usr/share/fonts/truetype/dejavu", "/Library/Fonts"):
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


W, H = 1200, 630
card = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(card)
for x in range(0, W, 48):
    d.line([(x, 0), (x, H)], fill=(18, 24, 32))
for y in range(0, H, 48):
    d.line([(0, y), (W, y)], fill=(18, 24, 32))
glow = Image.new("RGB", (W, H), (0, 0, 0))
ImageDraw.Draw(glow).ellipse([40, 40, 560, 590], fill=(20, 90, 160))
card = ImageChops.add(card, glow.filter(ImageFilter.GaussianBlur(90)))
emblem = logo.convert("RGBA").resize((540, 540), Image.LANCZOS)
emblem.putalpha(radial_alpha(540, 0.78, 1.08))
card.paste(emblem, (30, 45), emblem)
d = ImageDraw.Draw(card)
big = font(["bahnschrift.ttf", "segoeuib.ttf", "DejaVuSans-Bold.ttf"], 96)
if hasattr(big, "set_variation_by_name"):
    try:
        big.set_variation_by_name("Bold")
    except Exception:
        pass
mid = font(["bahnschrift.ttf", "segoeui.ttf", "DejaVuSans.ttf"], 36)
small = font(["consolab.ttf", "DejaVuSansMono-Bold.ttf"], 24)
d.text((600, 196), "Steel Surge", font=big, fill=(233, 238, 244))
d.text((604, 318), "FIRST Tech Challenge Team 27254", font=mid, fill=(170, 182, 197))
d.text((606, 380), "KENNETT SQUARE, PENNSYLVANIA", font=small, fill=(110, 190, 255))
card.save(os.path.join(ROOT, "og-image.jpg"), quality=88, optimize=True, progressive=True)
print("logo-hero.webp, logo-mark.png, favicon.png, icons, and og-image.jpg written")
