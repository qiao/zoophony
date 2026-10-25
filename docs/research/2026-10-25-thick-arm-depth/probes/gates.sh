#!/bin/zsh
# Runs the gates of the round against main and writes each output into the folder of the report.
# Run it from the root of the tree with a clean tree.
R=docs/research/2026-10-25-thick-arm-depth
pnpm arm-check timpanist tubist --base main > $R/gate.txt 2>&1
pnpm pose-depth timpanist --base main > $R/pose-depth-timpanist.txt 2>&1
pnpm pose-depth tubist --base main > $R/pose-depth-tubist.txt 2>&1
pnpm body-probe --base main > $R/body-probe.txt 2>&1
pnpm build > /dev/null 2>&1 && pnpm size --base main > $R/size.txt 2>&1
echo gates done
