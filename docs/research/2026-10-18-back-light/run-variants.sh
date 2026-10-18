#!/bin/zsh
# Renders each variant of a JSON file (name -> overrides of look-override.patch) with
# pnpm look-lab --url on a dev server at port $PORT (default 5287), then prints metrics.py for
# each. The frames go to scratch/bl/runs/<name>/.
# Usage: run-variants.sh <variants.json> [name...]
set -u
ROOT=/Users/xueqiaoxu/proj/zoophony
S=$ROOT/scratch/bl/runs
R=$ROOT/docs/research/2026-10-18-back-light
PORT=${PORT:-5287}
cd $ROOT
names=(${@:2})
if (( ${#names} == 0 )); then
  names=($(python3 -c "import json,sys; print(' '.join(json.load(open('$1')).keys()))"))
fi
for name in $names; do
  q=$(python3 -c "import json,sys,urllib.parse; v=json.load(open('$1'))['$name']; print(urllib.parse.quote(json.dumps(v)))")
  pnpm look-lab $S/$name --url "http://localhost:$PORT/?look=$q" > $S/$name.log 2>&1 || echo "FAIL $name"
done
uv run --no-project --with pillow python -I $R/metrics.py $(for n in $names; do print -n "$S/$n "; done)
