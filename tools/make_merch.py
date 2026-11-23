"""Draws the team merch image (assets/img/projects/team-merch.jpg): a black team
T-shirt with the logo on the chest and two die-cut stickers, on a light studio
background to match the other project photos. Needs Pillow:

    python tools/make_merch.py
"""
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "..", "assets", "img")
S = 2  # draw at 2x, then scale down for smooth edges
W, H = 1200 * S, 857 * S
SURGE = (59, 168, 255)


def font(names, size):
    for n in names:
        for d in (r"C:\Windows\Fonts", "/usr/share/fonts/truetype/dejavu", "/Library/Fonts"):
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
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


def shadow(mask, blur, offset, strength):
    sh = Image.new("L", (W, H))
    sh.paste(mask, offset)
    return sh.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * strength))


# ---------- background: soft light studio sweep ----------
bg = Image.new("RGB", (W, H))
d = ImageDraw.Draw(bg)
for y in range(H):
    t = y / H
    v = int(246 - 22 * t)
    d.line([(0, y), (W, y)], fill=(v, v + 1, v + 3))
vign = Image.new("L", (W, H), 0)
ImageDraw.Draw(vign).ellipse([-W * 0.2, -H * 0.3, W * 1.2, H * 1.25], fill=255)
vign = vign.filter(ImageFilter.GaussianBlur(220))
bg = Image.composite(bg, ImageChops.multiply(bg, Image.new("RGB", (W, H), (214, 218, 224))), vign)


# ---------- T-shirt ----------
def shirt_points(cx, top, w, h):
    """Outline of a flat-lay T-shirt."""
    sw = w / 2          # half shoulder width
    bw = w * 0.42       # half body width
    neck = w * 0.17
    p = []
    # neckline (front scoop)
    for i in range(21):
        a = math.pi * i / 20
        p.append((cx - neck * math.cos(a), top + h * 0.065 * math.sin(a)))
    p.reverse()
    pts = [(cx - neck, top)]
    pts += [(cx - sw, top + h * 0.05), (cx - sw - w * 0.30, top + h * 0.28), (cx - sw - w * 0.18, top + h * 0.38),
            (cx - bw, top + h * 0.27), (cx - bw, top + h), (cx + bw, top + h), (cx + bw, top + h * 0.27),
            (cx + sw + w * 0.18, top + h * 0.38), (cx + sw + w * 0.30, top + h * 0.28), (cx + sw, top + h * 0.05), (cx + neck, top)]
    # replace straight neck with the scoop
    scoop = [(cx + neck * math.cos(math.pi * i / 20), top + h * 0.065 * math.sin(math.pi * i / 20)) for i in range(21)]
    return pts + scoop


cx, top, sw_, sh_ = int(W * 0.37), int(H * 0.13), int(W * 0.36), int(H * 0.72)
mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask).polygon(shirt_points(cx, top, sw_, sh_), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(2))

bg.paste((0, 0, 0), (0, 0), shadow(mask, 40, (14, 30), 0.35))

shirt = Image.new("RGB", (W, H), (24, 27, 32))
# fabric shading: light from the top left, folds near the sleeves
shade = Image.new("L", (W, H), 0)
sd = ImageDraw.Draw(shade)
sd.ellipse([cx - sw_ * 0.6, top - sh_ * 0.1, cx + sw_ * 0.5, top + sh_ * 0.7], fill=60)
sd.line([(cx - sw_ * 0.42, top + sh_ * 0.3), (cx - sw_ * 0.36, top + sh_ * 0.95)], fill=30, width=40)
sd.line([(cx + sw_ * 0.40, top + sh_ * 0.35), (cx + sw_ * 0.33, top + sh_ * 0.9)], fill=26, width=50)
shade = shade.filter(ImageFilter.GaussianBlur(90))
shirt = Image.composite(Image.new("RGB", (W, H), (58, 63, 72)), shirt, shade)
# fabric grain
noise = Image.effect_noise((W, H), 18).point(lambda v: v // 10)
shirt = ImageChops.add(shirt, Image.merge("RGB", (noise, noise, noise)))
# collar band
collar = Image.new("L", (W, H), 0)
neck = sw_ * 0.17
ImageDraw.Draw(collar).arc([cx - neck, top - sh_ * 0.065, cx + neck, top + sh_ * 0.065], 0, 180, fill=255, width=22)
shirt.paste((14, 16, 19), (0, 0), collar.filter(ImageFilter.GaussianBlur(2)))
# sleeve hem stitches
st = ImageDraw.Draw(shirt)
for side in (-1, 1):
    x1, y1 = cx + side * (sw_ / 2 + sw_ * 0.30), top + sh_ * 0.28
    x2, y2 = cx + side * (sw_ / 2 + sw_ * 0.18), top + sh_ * 0.38
    for k in range(18):
        t = k / 18
        x, y = x1 + (x2 - x1) * t - side * 16, y1 + (y2 - y1) * t - 10
        st.line([(x, y), (x + (x2 - x1) / 40, y + (y2 - y1) / 40)], fill=(70, 75, 84), width=3)

# bottom hem stitching
for k in range(60):
    x = cx - sw_ * 0.42 + 10 + k * (sw_ * 0.84 - 20) / 60
    st.line([(x, top + sh_ - 26), (x + 9, top + sh_ - 26)], fill=(66, 71, 80), width=3)

# chest print: the logo, faded into the fabric so the dark square disappears
logo = Image.open(os.path.join(IMG, "brand", "logo-source.png")).convert("RGB")
ps = int(sw_ * 0.62)
print_img = logo.resize((ps, ps), Image.LANCZOS)
print_alpha = radial_alpha(ps, 0.62, 0.98)
# screen-printed look: a touch flatter and lighter than the original artwork
print_img = Image.blend(print_img, Image.new("RGB", (ps, ps), (40, 44, 50)), 0.08)
shirt.paste(print_img, (cx - ps // 2, int(top + sh_ * 0.16)), print_alpha)
# team number across the back hem area
fd = ImageDraw.Draw(shirt)
num_font = font(["bahnschrift.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"], int(sw_ * 0.058))
label = "FTC  27254"
tw = fd.textlength(label, font=num_font)
fd.text((cx - tw / 2, top + sh_ * 0.16 + ps * 0.95), label, font=num_font, fill=(196, 204, 214))

bg.paste(shirt, (0, 0), mask)


# ---------- stickers ----------
def sticker(img_rgba, border, angle):
    """Adds a white die-cut border and returns (sticker, mask) rotated by `angle`."""
    a = img_rgba.split()[3]
    grown = a.filter(ImageFilter.MaxFilter(border * 2 + 1)).point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.GaussianBlur(1.5))
    out = Image.new("RGBA", img_rgba.size, (255, 255, 255, 0))
    out.paste((250, 251, 252, 255), (0, 0), grown)
    out.alpha_composite(img_rgba)
    out = out.rotate(angle, resample=Image.BICUBIC, expand=True)
    return out


def place(st_img, x, y):
    global bg
    m = st_img.split()[3]
    full = Image.new("L", (W, H))
    full.paste(m, (x, y))
    bg.paste((0, 0, 0), (0, 0), full.filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.28)).transform((W, H), Image.AFFINE, (1, 0, -8, 0, 1, -14)))
    bg.paste(st_img.convert("RGB"), (x, y), m)
    # gloss
    gl = Image.new("L", st_img.size, 0)
    ImageDraw.Draw(gl).polygon([(0, 0), (st_img.width * 0.7, 0), (0, st_img.height * 0.6)], fill=38)
    gl = ImageChops.multiply(gl.filter(ImageFilter.GaussianBlur(30)), m)
    bg.paste((255, 255, 255), (x, y), gl)


# round logo sticker
R = 420
circ = Image.new("RGBA", (R + 60, R + 60), (0, 0, 0, 0))
cm = Image.new("L", (R + 60, R + 60), 0)
ImageDraw.Draw(cm).ellipse([30, 30, 30 + R, 30 + R], fill=255)
inner = logo.resize((int(R * 1.18), int(R * 1.18)), Image.LANCZOS).crop((int(R * 0.09), int(R * 0.07), int(R * 0.09) + R, int(R * 0.07) + R))
disc = Image.new("RGBA", (R + 60, R + 60), (0, 0, 0, 0))
disc.paste(inner, (30, 30))
disc.putalpha(cm)
ring = ImageDraw.Draw(disc)
ring.ellipse([34, 34, 26 + R, 26 + R], outline=SURGE + (255,), width=10)
place(sticker(disc, 26, -12), int(W * 0.66), int(H * 0.10))

# team number sticker
TW, TH = 640, 230
tag = Image.new("RGBA", (TW + 40, TH + 40), (0, 0, 0, 0))
td = ImageDraw.Draw(tag)
td.rounded_rectangle([20, 20, 20 + TW, 20 + TH], radius=56, fill=(12, 16, 22, 255), outline=SURGE + (255,), width=10)
bolt = [(0.0, 0.0), (0.62, 0.0), (0.38, 0.42), (0.78, 0.42), (0.1, 1.0), (0.3, 0.55), (-0.05, 0.55)]
bx, by, bs = 72, 52, 166
td.polygon([(bx + px * bs * 0.75, by + py * bs) for px, py in bolt], fill=SURGE + (255,))
f1 = font(["bahnschrift.ttf", "arialbd.ttf"], 96)
f2 = font(["bahnschrift.ttf", "arialbd.ttf"], 46)
td.text((248, 52), "STEEL SURGE", font=f2, fill=(160, 172, 188, 255))
td.text((244, 104), "27254", font=f1, fill=(240, 244, 248, 255))
td.text((560, 196), "", font=f2)
place(sticker(tag, 22, 8), int(W * 0.62), int(H * 0.60))

# lightning-bolt sticker
BS = 300
bimg = Image.new("RGBA", (BS, BS), (0, 0, 0, 0))
bd = ImageDraw.Draw(bimg)
bd.polygon([(40 + px * 200, 20 + py * 260) for px, py in bolt], fill=(255, 196, 40, 255), outline=(30, 30, 30, 255))
place(sticker(bimg, 20, 18), int(W * 0.86), int(H * 0.40))

out = bg.resize((W // S, H // S), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1, percent=40, threshold=2))
path = os.path.join(IMG, "projects", "team-merch.jpg")
out.save(path, quality=86, optimize=True, progressive=True)
print("wrote", path)
