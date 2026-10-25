#!/bin/zsh
# Runs the grip tool, the palm probe (play and rest), and the elbow probe of the three roles on
# the working tree. Usage: probes.sh <name>, which writes grip-<name>.txt, palm-<name>.txt,
# palm-rest-<name>.txt, and elbow-<name>.txt.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
pnpm -s wind-grip oboist trombonist bassoonist > $out/grip-$1.txt 2>&1
node $out/palm-probe.ts '' oboist,trombonist,bassoonist > $out/palm-$1.txt 2>&1
node $out/palm-probe.ts '' oboist,trombonist,bassoonist rest > $out/palm-rest-$1.txt 2>&1
node $out/elbow-probe.ts '' > $out/elbow-$1.txt 2>&1
echo "exit $?"
