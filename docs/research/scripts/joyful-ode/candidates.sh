#!/bin/zsh
# Cuts the candidate excerpts of docs/research/2026-10-06-joyful-ode.md out of the full finale.
# Usage: zsh candidates.sh <full.mid> <out dir>
# <full.mid> is the result of remap_midi.py for the full finale (demos/README.md).
set -eu
HERE=${0:A:h}
CUT=$HERE/../../../../tools/musescore/cut_midi.py
FULL=$1
OUT=$2
mkdir -p $OUT
cut() { python3 -I $HERE/run.py $CUT $FULL $OUT/$1.mid ${@:2} | tail -1; }
# A: the demo until 2026-10-06, printed bars 216 to 330.
cut A-current 364800 575520
# B: printed bars 543 to 590 (the choir with the theme, to the D major chord after it) and 851
# to 940 (the Prestissimo coda). Bars 591 to 594 turn to G major for the Andante maestoso.
cut B-choir-coda 880800 949920 1610880 1781760
# C: printed bars 763 to 940 (Allegro ma non tanto and the coda), one range.
cut C-allegro-coda 1441920 1781760
# D: printed bars 241 to 296 (baritone, choir, quartet, choir), 543 to 594, and 851 to 940.
cut D-solo-choir-coda 402720 508320 880800 955680 1610880 1781760
# E: printed bars 92 to 207 (the theme in the orchestra, no voices).
cut E-orchestra 130560 353280
# F: printed bars 237 to 330 (A with no recitative).
cut F-no-recitative 395040 575520
# G: printed bars 543 to 594 alone.
cut G-choir-only 880800 955680
