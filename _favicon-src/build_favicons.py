#!/usr/bin/env python3
"""Build the favicon set from Computer Modern 'LM' outlines.

Input : mono.svg  (dvisvgm output — 'LM' as vector paths, no font deps)
Output: favicon.svg, favicon.ico, apple-touch-icon.png,
        icon-192.png, icon-512.png, favicon-32.png, site.webmanifest
"""
import re, struct, subprocess, sys, os

PAPER = "#f5f3f0"   # --paper (light) — the letters
RIBBON = "#b31b1b"  # --ribbon (light) — the tile
CANVAS = 512
RADIUS = 102        # ~20% corner rounding for the browser-tab tile
FILL_W = 340.0      # monogram target width on the 512 canvas (centered)

OUT = sys.argv[1] if len(sys.argv) > 1 else "."


def read_glyphs(fn):
    s = open(fn).read()
    x0, y0, w, h = (float(v) for v in
                    re.search(r"viewBox='([^']+)'", s).group(1).split())
    defs = re.findall(r"<path id='([^']+)' d='([^']+)'/>", s)
    uses = re.findall(r"<use x='([^']+)' y='([^']+)' xlink:href='#([^']+)'/>", s)
    return (x0, y0, w, h), defs, uses


def svg(vb, defs, uses, radius):
    x0, y0, w, h = vb
    s = FILL_W / w
    ht = h * s
    tx = (CANVAS - FILL_W) / 2
    ty = (CANVAS - ht) / 2
    d = "".join(f"<path id='{i}' d='{p}'/>" for i, p in defs)
    u = "".join(f"<use x='{x}' y='{y}' xlink:href='#{i}'/>" for x, y, i in uses)
    return (
        f"<svg xmlns='http://www.w3.org/2000/svg' "
        f"xmlns:xlink='http://www.w3.org/1999/xlink' "
        f"viewBox='0 0 {CANVAS} {CANVAS}'>"
        f"<defs>{d}</defs>"
        f"<rect width='{CANVAS}' height='{CANVAS}' rx='{radius}' fill='{RIBBON}'/>"
        f"<g fill='{PAPER}' transform='translate({tx:.4f},{ty:.4f}) "
        f"scale({s:.6f}) translate({-x0:.6f},{-y0:.6f})'>{u}</g>"
        f"</svg>"
    )


def rasterize(svg_path, png_path, size):
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size),
                    svg_path, "-o", png_path], check=True)


def png_dims(fn):
    with open(fn, "rb") as f:
        f.read(16)
        return struct.unpack(">II", f.read(8))  # width, height from IHDR


def write_ico(png_files, ico_path):
    """Pack PNG images into an ICO (Vista+ PNG-in-ICO container)."""
    blobs = [open(p, "rb").read() for p in png_files]
    n = len(blobs)
    header = struct.pack("<HHH", 0, 1, n)          # reserved, type=icon, count
    offset = 6 + 16 * n
    entries, data = b"", b""
    for blob in blobs:
        w, h = png_dims_bytes(blob)
        entries += struct.pack("<BBBBHHII",
                               w & 0xFF, h & 0xFF,  # 0 encodes 256
                               0, 0, 1, 32, len(blob), offset)
        data += blob
        offset += len(blob)
    open(ico_path, "wb").write(header + entries + data)


def png_dims_bytes(blob):
    return struct.unpack(">II", blob[16:24])


def out(name):
    return os.path.join(OUT, name)


vb, defs, uses = read_glyphs("mono.svg")

# 1. Scalable tab favicon — rounded tile.
rounded = svg(vb, defs, uses, RADIUS)
open(out("favicon.svg"), "w").write(rounded)
open("_rounded.svg", "w").write(rounded)

# 2. Full-bleed square — for OS masks (iOS/Android round it themselves).
open("_square.svg", "w").write(svg(vb, defs, uses, 0))

# 3. Rasters.
for sz in (16, 32, 48):
    rasterize("_rounded.svg", f"_r{sz}.png", sz)
rasterize("_square.svg", out("apple-touch-icon.png"), 180)
rasterize("_square.svg", out("icon-192.png"), 192)
rasterize("_square.svg", out("icon-512.png"), 512)

# 4. favicon.ico bundling 16/32/48.
write_ico(["_r16.png", "_r32.png", "_r48.png"], out("favicon.ico"))

# 5. Web app manifest.
manifest = """{
  "name": "Luis Martí",
  "short_name": "L. Martí",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "theme_color": "#b31b1b",
  "background_color": "#f5f3f0",
  "display": "browser"
}
"""
open(out("site.webmanifest"), "w").write(manifest)

print("built into", os.path.abspath(OUT))
for f in ("favicon.svg", "favicon.ico",
          "apple-touch-icon.png", "icon-192.png", "icon-512.png",
          "site.webmanifest"):
    p = out(f)
    print(f"  {f:22} {os.path.getsize(p):6} bytes")
