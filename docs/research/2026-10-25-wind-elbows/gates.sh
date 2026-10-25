#!/bin/zsh
# Runs the whole arm gate and the clip probe of the branch against main into this folder.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
pnpm -s arm-check --all --base main --jobs 4 > $out/gate.txt 2>&1
echo "gate exit $?"
pnpm -s clip-probe --base main --jobs 4 > $out/clip.txt 2>&1
echo "clip exit $?"
