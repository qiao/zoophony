#!/bin/zsh
# Renders the image set of the variant in the working tree against main: the stage from the left,
# the back, and the angle of image 47 (play and rest), the gallery views of the role from 35 and
# the left, and from the front with a low camera over the desk (chord and rest), and the default
# view (play and rest). The case and the lid hide the body from the front at -35.
# Run from the root of the tree: <this file> <out dir>
set -uo pipefail
O=$1
AIM=(--at polar-bear --azimuth -90 --azimuth 180 --azimuth -80 --elevation 8 --zoom 1 --size 434x726 --time 30 --base main)
pnpm close-views play $O/play $AIM > $O-play.log 2>&1 || { echo "play failed"; exit 1; }
pnpm close-views play $O/rest $AIM --pause > $O-rest.log 2>&1 || { echo "rest failed"; exit 1; }
pnpm close-views pianist $O/role --views 35,left --moments chord,rest --base main --sheet > $O-role.log 2>&1 || { echo "role failed"; exit 1; }
pnpm close-views pianist $O/role-front --views front --elevation 12 --moments chord,rest --base main --sheet > $O-role-front.log 2>&1 || { echo "role front failed"; exit 1; }
pnpm close-views play $O/default --time 30 --base main > $O-default.log 2>&1 || { echo "default failed"; exit 1; }
pnpm close-views play $O/default-rest --time 30 --pause --base main > $O-default-rest.log 2>&1 || { echo "default rest failed"; exit 1; }
echo done
