#!/bin/zsh
# Renders the image set of the variant in the working tree against main: the stage from the left,
# the back, and the angle of image 53 of the user (from the left, 15° to the front), in the play
# and at rest, the gallery view of the role from 35° at the chord and at rest, and the default
# view of the stage in the play and at rest. Each image has main beside or above the tree.
# Run from the root of the tree: <this file> <out dir>
set -uo pipefail
O=$1
AIM=(--at polar-bear --azimuth -90 --azimuth 180 --azimuth -75 --elevation 8 --zoom 1 --size 434x726 --time 30 --base main)
pnpm close-views play $O/play $AIM > $O-play.log 2>&1 || { echo "play failed"; exit 1; }
pnpm close-views play $O/rest $AIM --pause > $O-rest.log 2>&1 || { echo "rest failed"; exit 1; }
pnpm close-views pianist $O/role --views 35,left --moments chord,rest --base main --sheet > $O-role.log 2>&1 || { echo "role failed"; exit 1; }
pnpm close-views play $O/default --time 30 --base main > $O-default.log 2>&1 || { echo "default failed"; exit 1; }
pnpm close-views play $O/default-rest --time 30 --pause --base main > $O-default-rest.log 2>&1 || { echo "default rest failed"; exit 1; }
echo done
