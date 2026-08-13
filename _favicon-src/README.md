Favicon source
==============

The favicon set is an "LM" monogram typeset in Computer Modern — the same
face the site uses — so the mark matches the body text. This `_favicon-src/`
directory is ignored by Jekyll (leading underscore), so nothing here is
published; only the generated files at the repo root are served.

Regenerate:

```sh
cd _favicon-src
latex -interaction=nonstopmode monogram.tex          # CM 'LM' -> DVI
dvisvgm --no-fonts --exact --output=mono.svg monogram.dvi  # -> outlined SVG
python3 build_favicons.py ..                          # -> favicon.* at repo root
```

`build_favicons.py` centers the outlines on a 512 canvas, emits the rounded
tab tile (favicon.svg) and full-bleed square (app icons), rasterises every
size with rsvg-convert, and packs favicon.ico by hand (no ImageMagick/PIL).
Palette is pinned to the light theme: ribbon #b31b1b tile, paper #f5f3f0
letters. Edit those constants — or the FILL_W / RADIUS — to restyle.
