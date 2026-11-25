Favicon source
==============

The favicon set is an "LM" monogram typeset in Computer Modern — the same
face the site uses — so the mark matches the body text. This `_favicon-src/`
directory is ignored by Jekyll (leading underscore), so nothing here is
published; only the generated files at the repo root are served.

Regenerate:

```sh
cd _favicon-src
latex -interaction=nonstopmode monogram.tex          # cmbx10 'LM' -> DVI
dvisvgm --no-fonts --exact --output=mono.svg monogram.dvi  # -> outlined SVG
python3 build_favicons.py ..                          # -> favicon.* at repo root
```

`build_favicons.py` centers the outlines on a 512 canvas, emits the rounded
tab tile (favicon.svg, with a `prefers-color-scheme` swap to the dark
palette) and full-bleed square (app icons), rasterises every size with
rsvg-convert, and packs favicon.ico by hand (no ImageMagick/PIL).

Legibility at 16 px comes from the font cut, not the renderer: the monogram
is set in **cmbx10** (bold, text optical size) rather than the 100 pt
display cut (cmr17) whose hairlines vanish below one device pixel. The tab
icons fill 84 % of the tile and carry half a device pixel of same-colour
outline (sized per raster at 16/32 px, for 24 px in the SVG); app icons fill 72 % to stay inside the maskable safe
zone. Palette follows `_sass/typewriter.scss`: ribbon #1e356f tile, paper
#fafaf6 letters (dark: #86a2ec / #252831). Edit the constants at the top of
the script to restyle.
