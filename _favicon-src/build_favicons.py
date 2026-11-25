#!/usr/bin/env python3
"""Build the favicon set from Computer Modern Bold 'LM' outlines.

Input : mono.svg  (dvisvgm output — 'LM' in cmbx10 as vector paths, no font deps)
Output: favicon.svg, favicon.ico, apple-touch-icon.png,
        icon-192.png, icon-512.png, site.webmanifest

Legibility at tab sizes rests on three choices, all pinned here:

* cmbx10 — the bold text optical size of Computer Modern. The first build set
  the monogram at 100 pt, which made LaTeX pick cmr17, the display cut: its
  hairlines fall below one device pixel at 16 px and the mark turned to mush.
* Fill: tab icons (favicon.svg, favicon.ico) span 84 % of the tile; app icons
  keep to 72 % so the letters sit inside the 80 % safe circle Android applies
  to "maskable" icons (iOS masks more generously; one template serves both).
* Outline: half a device pixel of same-colour stroke on the 16/32 px rasters
  and on favicon.svg, which tabs rasterise anywhere from 16 px (1x) to 32 px
  (2x) — its stroke is sized for the 24 px midpoint. The outline keeps
  hairlines from rounding away without changing the letterforms at large
  sizes, where no stroke is applied.

Palette is the site's Turquí theme (_sass/typewriter.scss): paper letters on
a ribbon tile. favicon.svg carries both schemes and swaps on
prefers-color-scheme; the PNG/ICO fallbacks are the light scheme.
"""
import os, re, struct, subprocess, sys, tempfile

LIGHT = {"tile": "#1e356f", "letters": "#fafaf6"}  # --ribbon / --paper
DARK = {"tile": "#86a2ec", "letters": "#252831"}   # dark-palette mixin

CANVAS = 512
RADIUS = 102        # ~20% corner rounding for the browser-tab tile
TAB_FILL = 0.84     # monogram width / tile width, tab icons
APP_FILL = 0.72     # app icons: stays inside the maskable safe circle
OUTLINE_PX = 0.5    # device pixels of outline on the small rasters

OUT = sys.argv[1] if len(sys.argv) > 1 else "."


def read_glyphs(fn):
    s = open(fn).read()
    x0, y0, w, h = (float(v) for v in
                    re.search(r"viewBox='([^']+)'", s).group(1).split())
    defs = re.findall(r"<path id='([^']+)' d='([^']+)'/>", s)
    uses = re.findall(r"<use x='([^']+)' y='([^']+)' xlink:href='#([^']+)'/>", s)
    return (x0, y0, w, h), defs, uses


def svg(vb, defs, uses, *, fill, radius, outline=0.0, dark=None):
    """Compose the tile.

    outline is in canvas units (of 512); it is drawn as a same-colour stroke
    centred on the glyph edge, so the letters thicken by outline/2 per side.
    dark, if given, embeds a prefers-color-scheme rule that swaps the palette.
    """
    x0, y0, w, h = vb
    s = CANVAS * fill / w
    tx = (CANVAS - w * s) / 2
    ty = (CANVAS - h * s) / 2
    d = "".join(f"<path id='{i}' d='{p}'/>" for i, p in defs)
    u = "".join(f"<use x='{x}' y='{y}' xlink:href='#{i}'/>" for x, y, i in uses)
    stroke = (f"stroke-width:{outline / s:.4f};stroke-linejoin:round;"
              if outline else "")
    style = (f".t{{fill:{LIGHT['tile']}}}"
             f".g{{fill:{LIGHT['letters']};stroke:{LIGHT['letters']};{stroke}}}")
    if dark:
        style += (f"@media(prefers-color-scheme:dark){{"
                  f".t{{fill:{dark['tile']}}}"
                  f".g{{fill:{dark['letters']};stroke:{dark['letters']}}}}}")
    return (
        f"<svg xmlns='http://www.w3.org/2000/svg' "
        f"xmlns:xlink='http://www.w3.org/1999/xlink' "
        f"viewBox='0 0 {CANVAS} {CANVAS}'>"
        f"<style>{style}</style>"
        f"<defs>{d}</defs>"
        f"<rect class='t' width='{CANVAS}' height='{CANVAS}' rx='{radius}'/>"
        f"<g class='g' transform='translate({tx:.4f},{ty:.4f}) "
        f"scale({s:.6f}) translate({-x0:.6f},{-y0:.6f})'>{u}</g>"
        f"</svg>"
    )


def rasterize(svg_path, png_path, size):
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size),
                    svg_path, "-o", png_path], check=True)


def png_dims(blob):
    return struct.unpack(">II", blob[16:24])  # width, height from IHDR


def write_ico(png_files, ico_path):
    """Pack PNG images into an ICO (Vista+ PNG-in-ICO container)."""
    blobs = [open(p, "rb").read() for p in png_files]
    n = len(blobs)
    header = struct.pack("<HHH", 0, 1, n)          # reserved, type=icon, count
    offset = 6 + 16 * n
    entries, data = b"", b""
    for blob in blobs:
        w, h = png_dims(blob)
        entries += struct.pack("<BBBBHHII",
                               w & 0xFF, h & 0xFF,  # 0 encodes 256
                               0, 0, 1, 32, len(blob), offset)
        data += blob
        offset += len(blob)
    open(ico_path, "wb").write(header + entries + data)


def out(name):
    return os.path.join(OUT, name)


vb, defs, uses = read_glyphs("mono.svg")

with tempfile.TemporaryDirectory() as tmp:
    def t(name):
        return os.path.join(tmp, name)

    # 1. Scalable tab favicon — rounded tile, both colour schemes, outline
    #    sized for 24 px (between 1x and 2x tab rendering).
    open(out("favicon.svg"), "w").write(svg(
        vb, defs, uses, fill=TAB_FILL, radius=RADIUS,
        outline=OUTLINE_PX * CANVAS / 24, dark=DARK))

    # 2. favicon.ico bundling 16/32/48 — light scheme; outline scaled per
    #    size so it is always half a device pixel, none at 48.
    icos = []
    for sz in (16, 32, 48):
        ol = OUTLINE_PX * CANVAS / sz if sz <= 32 else 0
        open(t(f"r{sz}.svg"), "w").write(svg(
            vb, defs, uses, fill=TAB_FILL, radius=RADIUS, outline=ol))
        rasterize(t(f"r{sz}.svg"), t(f"r{sz}.png"), sz)
        icos.append(t(f"r{sz}.png"))
    write_ico(icos, out("favicon.ico"))

    # 3. Full-bleed square app icons — iOS/Android apply their own mask.
    open(t("square.svg"), "w").write(svg(
        vb, defs, uses, fill=APP_FILL, radius=0))
    rasterize(t("square.svg"), out("apple-touch-icon.png"), 180)
    rasterize(t("square.svg"), out("icon-192.png"), 192)
    rasterize(t("square.svg"), out("icon-512.png"), 512)

# 4. Web app manifest.
manifest = f"""{{
  "name": "Luis Martí",
  "short_name": "L. Martí",
  "icons": [
    {{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" }},
    {{ "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }}
  ],
  "theme_color": "{LIGHT['tile']}",
  "background_color": "{LIGHT['letters']}",
  "display": "browser"
}}
"""
open(out("site.webmanifest"), "w").write(manifest)

print("built into", os.path.abspath(OUT))
for f in ("favicon.svg", "favicon.ico",
          "apple-touch-icon.png", "icon-192.png", "icon-512.png",
          "site.webmanifest"):
    p = out(f)
    print(f"  {f:22} {os.path.getsize(p):6} bytes")
