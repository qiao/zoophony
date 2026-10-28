#!/bin/zsh
# tv.sh <label> <raise json>: tw.sh, then the app renders of the play at 30 s (az -72, -110) and
# of the rest (az -72, -90) into $OUT/<label>/img and img-rest.
OUT=${OUT:?set OUT}
scratch/tw.sh $1 $2 || exit 1
d=$OUT/$1
pnpm close-views play $d/img --demo boulanger-matin --at cat --time 30 --azimuth -72 --azimuth -110 --elevation 28 --zoom 3.5 > $d/img.log 2>&1 || echo render failed
pnpm close-views play $d/img-rest --demo boulanger-matin --at cat --time 30 --pause --azimuth -72 --azimuth -90 --elevation 28 --zoom 3.5 > $d/img-rest.log 2>&1 || echo render failed
