#!/bin/bash
# Renders the close shot of each subject for each look variant on a dev server of its own, then
# measures the light fur of each frame with clip.py.
# Usage, from the root of a tree:
#   bash docs/research/2026-10-27-key-look/shot-variants.sh <variants.json> <out> <subject,...> [port]
# A variant is an object of look paths and values, as for pnpm look-variants. Each frame is
# <out>/<variant>/<subject>/play-shot-<subject>.png. TREE=<dir> renders another tree, such as
# a worktree of the key light from behind. The script stops its dev server by its PID.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
W=$(pwd)
TREE=${TREE:-$W}
file=$1
out=$2
subjects=$3
port=${4:-5321}
case "$out" in /*) ;; *) out="$W/$out" ;; esac
case "$file" in /*) ;; *) file="$W/$file" ;; esac
cd "$TREE" || exit 2
mkdir -p "$out"
for t in split-soundfont.ts patch-demos.ts write-perf-60.ts; do
  node "tools/$t" > /dev/null 2>&1
done
node_modules/.bin/vite --host 127.0.0.1 --port "$port" --strictPort > "$out/dev.log" 2>&1 &
pid=$!
echo "dev server PID $pid on port $port"
trap 'kill "$pid" 2>/dev/null; echo "dev server stopped (PID $pid)"' EXIT
curl --retry 60 --retry-connrefused --retry-delay 1 -s -o /dev/null "http://127.0.0.1:$port/"
node -e 'const v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));for(const [k,x] of Object.entries(v)){console.log(k+"\t"+encodeURIComponent(JSON.stringify(x)))}' "$file" > "$out/variants.tsv"
while IFS=$'\t' read -r name query; do
  for s in ${subjects//,/ }; do
    mkdir -p "$out/$name"
    node tools/close-views.ts play "$out/$name/$s" --demo boulanger-matin --shot "$s" \
      --url "http://127.0.0.1:$port/?look=$query" > "$out/$name/$s.log" 2>&1 < /dev/null
    echo "$name $s: exit $?"
  done
done < "$out/variants.tsv"
uv run --no-project --with pillow --with numpy python -I "$HERE/clip.py" "$out"/*/*/play-shot-*.png
