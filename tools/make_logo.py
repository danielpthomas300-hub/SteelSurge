"""Builds the Steel Surge logo files from the same geometry as the team's pit sign.

The bolt uses the exact outline from the pit sign CAD script (pitsign.py, `bolt()`),
and the lettering is Bahnschrift, the typeface used on the sign and keychains.
Text is converted to vector paths, so the logos look identical everywhere.

    pip install fonttools
    python tools/make_logo.py

Writes assets/img/logo.svg (mark), logo-lockup.svg (full sign-style logo),
logo-lockup-light.svg (for light backgrounds), and favicon.svg.
"""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "img")
FONT = r"C:\Windows\Fonts\bahnschrift.ttf"
BLUE, BLUE_HI, STEEL, CHARCOAL = "#1e6fe0", "#5fb0ff", "#b9c3cf", "#14191f"

# Bolt outline from pitsign.py (y up), scaled like bolt(h, sx=0.9)
BOLT = [(0.8, 6.0), (3.4, 6.0), (1.0, 1.0), (3.6, 1.0), (-1.9, -6.0), (0.3, -0.4), (-2.3, -0.4)]


def bolt_path(h, cx, cy, sx=0.9):
    s = h / 12.0
    pts = [(cx + x * s * sx, cy - y * s) for x, y in BOLT]  # flip y for SVG
    return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in pts) + " Z"


def font(wght, wdth=100):
    f = TTFont(FONT)
    return instancer.instantiateVariableFont(f, {"wght": wght, "wdth": wdth})


def text_path(f, text, x, baseline, size, track=0.0):
    """Returns (svg path d, advance width) for text set at `size` px with extra tracking (px)."""
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
    upm = f["head"].unitsPerEm
    k = size / upm
    out, pen_x = [], x
    for ch in text:
        g = cmap.get(ord(ch))
        if g is None:
            continue
        p = SVGPathPen(gs)
        gs[g].draw(TransformPen(p, (k, 0, 0, -k, pen_x, baseline)))
        out.append(p.getCommands())
        pen_x += hmtx[g][0] * k + track
    return " ".join(out), pen_x - x - track


def write(name, svg):
    with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(svg)
    print("wrote", name)


def mark_svg(size=64, bg=True):
    # Bolt with the sign's double contour: outline ring + solid bolt
    d = bolt_path(46, 32, 32)
    rect = f'<rect x="1.5" y="1.5" width="61" height="61" rx="14" fill="{CHARCOAL}" stroke="#3a4757" stroke-width="2"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}">'
            f'<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{BLUE_HI}"/><stop offset="1" stop-color="{BLUE}"/></linearGradient></defs>'
            f'{rect}<path d="{d}" fill="none" stroke="{BLUE}" stroke-width="5" stroke-linejoin="miter"/>'
            f'<path d="{d}" fill="none" stroke="{CHARCOAL}" stroke-width="2.4" stroke-linejoin="miter"/>'
            f'<path d="{d}" fill="url(#b)"/></svg>')


def lockup_svg(text_color, sub_color, rule_color):
    light, bold, semi = font(300, 100), font(700, 100), font(600, 100)
    W, H = 620, 236
    bolt = bolt_path(206, 92, 116)
    steel, w1 = text_path(light, "STEEL", 0, 0, 1, 0)  # measure later
    # Lay out the right-hand column like the pit sign
    col_x, col_w = 196, 400
    _, surge_w = text_path(bold, "SURGE", col_x, 150, 100, 0)
    surge_size = min(100 * col_w / surge_w, 128)
    _, surge_w = text_path(bold, "SURGE", 0, 0, surge_size, 0)
    surge_d, _ = text_path(bold, "SURGE", col_x + (col_w - surge_w) / 2, 152, surge_size, 0)
    steel_size = 40
    _, sw = text_path(semi, "STEEL", 0, 0, steel_size, 0)
    track = (col_w - sw) / 4
    steel_d, _ = text_path(semi, "STEEL", col_x, 42, steel_size, track)
    motto_size = 22
    _, mw = text_path(semi, "SURGE AHEAD", 0, 0, motto_size, 3)
    mx = col_x + (col_w - mw) / 2
    motto_d, _ = text_path(semi, "SURGE AHEAD", mx, 184, motto_size, 3)
    num_d, nw = text_path(bold, "FTC 27254", 0, 0, 40, 6)
    num_d, _ = text_path(bold, "FTC 27254", col_x + (col_w - nw) / 2, 228, 38, 6)
    rules = (f'<rect x="{col_x}" y="175" width="{mx - col_x - 12:.1f}" height="3" fill="{rule_color}"/>'
             f'<rect x="{mx + mw + 12:.1f}" y="175" width="{col_x + col_w - (mx + mw + 12):.1f}" height="3" fill="{rule_color}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Steel Surge, FTC 27254: Surge Ahead">'
            f'<defs><linearGradient id="lb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{BLUE_HI}"/><stop offset="1" stop-color="{BLUE}"/></linearGradient></defs>'
            f'<path d="{bolt}" fill="none" stroke="{BLUE}" stroke-width="9" stroke-linejoin="miter"/>'
            f'<path d="{bolt}" fill="none" stroke="{CHARCOAL if text_color != "#14191f" else "#ffffff"}" stroke-width="4.5" stroke-linejoin="miter"/>'
            f'<path d="{bolt}" fill="url(#lb)"/>'
            f'<path d="{steel_d}" fill="{sub_color}"/><path d="{surge_d}" fill="{text_color}"/>'
            f'{rules}<path d="{motto_d}" fill="{sub_color}"/><path d="{num_d}" fill="{text_color}"/></svg>')


if __name__ == "__main__":
    write("logo.svg", mark_svg())
    write("favicon.svg", mark_svg())
    write("logo-mark.svg", mark_svg(bg=False))
    write("logo-lockup.svg", lockup_svg("#e9eef4", STEEL, "#3a4757"))
    write("logo-lockup-light.svg", lockup_svg("#14191f", "#4c5a6b", "#c9d2dd"))
