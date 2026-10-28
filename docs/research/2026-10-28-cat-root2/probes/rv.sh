#!/bin/zsh
# rv.sh <label>: renders the user angle (play 30 s at -72, -45, -110, and rest at -72, -35) of this
# tree into $OUT/<label>/img, and a pair with main (left) of the root at -72.
OUT=${OUT:?set OUT}
SP=${SP:?set SP to a scratch folder}
d=$OUT/$1/img
pnpm close-views play $d --demo boulanger-matin --at cat --time 30 --azimuth -72 --azimuth -45 --azimuth -110 --elevation 28 --zoom 3.5 > $d.log 2>&1 || echo render failed
uv run --no-project --with pillow python -I $SP/pair.py $SP/main/img/play-at-cat-az-72.png $d/play-at-cat-az-72.png $OUT/$1/z72.png 600,80,1000,440 1.4
