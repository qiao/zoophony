#!/bin/zsh
# Renders the frames of the round into <dir>: brahms-2 at the user frame and the gate frames.
set -o pipefail
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/rabbit-armpit
pnpm close-views play $1 --demo brahms-2 --time 678.63 --time 608.88 --time 376.23 --time 252.5 --at rabbit --azimuth 120 --azimuth 90 --azimuth 60 --azimuth -60 --azimuth -120 > $1.log 2>&1
