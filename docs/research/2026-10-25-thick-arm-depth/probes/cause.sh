#!/bin/zsh
# Proves the cause of the upper arm depths on a tree: the weights of the deepest corners, and
# their depth with the elbow helper weight, the trunk weight, or all weight moved to the upper arm
# segment with the most weight, and in the bind pose. Run it from the root of a tree.
P=docs/research/2026-10-25-thick-arm-depth/probes/depth-cause.ts
node $P timpanist R beethoven-8-4:565.34 12
node $P timpanist R beethoven-8-4:rest 4
node $P timpanist L beethoven-8-4:565.34 6
node $P tubist R brahms-2:340.38 6
node $P tubist R brahms-2:rest 6
