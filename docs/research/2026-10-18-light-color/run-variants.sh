#!/bin/zsh
# Renders each variant of a JSON file (name -> overrides of look-override.patch) with
# pnpm look-lab --url on a dev server at port 5199, then prints metrics.py for each.
# Usage: run-variants.sh <variants.json>
set -u
S=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/499ecc0b-b4e6-4cf0-bd7f-d4a4793a5c35/scratchpad
cd /Users/xueqiaoxu/proj/zoophony
for name in $(python3 -c "import json,sys; print(' '.join(json.load(open('$1')).keys()))"); do
  q=$(python3 -c "import json,sys,urllib.parse; v=json.load(open('$1'))['$name']; print(urllib.parse.quote(json.dumps(v)))")
  pnpm look-lab $S/$name --url "http://localhost:5199/?look=$q" > $S/$name.log 2>&1 || echo "FAIL $name"
done
python3 $S/metrics.py $(python3 -c "import json; print(' '.join('$S/'+k for k in json.load(open('$1')).keys()))")
