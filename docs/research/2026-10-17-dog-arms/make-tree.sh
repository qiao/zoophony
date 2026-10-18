#!/bin/zsh
# Makes the variant tree of the first phase of the round dog-arms (2026-10-17) from the tree of
# 037606d8: docs/research/2026-10-17-dog-arms/make-tree.sh <tree> <modules-dir>
#
# The tree is a clone copy of the working tree with a link to node_modules. Its dog body comes from
# the query `dogv` of the page or the variable DOGV of Node, and its cello scale from the query `cs`
# or the variable CS. <modules-dir> holds dog-<name>.ts for each variant, which mod.ts writes from a
# rig of scratch/cfg/<name>.json (rig.sh of docs/research/2026-10-17-dog-mesh/). Its close views
# read CV_VIEWS (name:azimuth:elevation,...), CV_MOMENTS (names), CV_DISTANCE (m), and CV_EXTRA (a
# query for each page). The tree of 037606d8 has no cello scale, so the patch of catalog.ts and
# strings.ts gives it. Since 6e9150f1, the app has the same rule (endPinLength()).
set -euo pipefail
root=$(git rev-parse --show-toplevel)
tree=$1
mods=$2
mkdir -p $tree
for e in .oxfmtrc.json .oxlintrc.json assets demos e2e gallery.html index.html package.json \
  playwright.config.ts pnpm-lock.yaml public spike.html src tools tsconfig.json views.html vite.config.ts; do
  cp -cR $root/$e $tree/
done
ln -s $root/node_modules $tree/node_modules
cd $tree
names=()
for f in $mods/dog-*.ts; do
  n=$(basename $f .ts); n=${n#dog-}
  cp $f src/models/studio/dog-$n.ts
  names+=$n
done
cat > src/models/studio/variant-pick.ts <<'EOF'
function read(name: string, env: string): string | null {
  const g = globalThis as { location?: { search: string }; process?: { env: Record<string, string | undefined> } };
  if (g.location) {
    return new URLSearchParams(g.location.search).get(name);
  }
  return g.process?.env[env] ?? null;
}
export const VARIANT = { dog: read('dogv', 'DOGV') ?? 'a175', cello: Number(read('cs', 'CS') ?? '1') };
EOF
{
  echo "import type { StudioBody } from '../studio-format.ts';"
  for n in $names; do echo "import { STUDIO_DOG as v_$n } from './dog-$n.ts';"; done
  echo "import { VARIANT } from './variant-pick.ts';"
  echo "const BODIES: Record<string, StudioBody> = { $(for n in $names; do printf '%s: v_%s, ' $n $n; done) };"
  echo "export const STUDIO_DOG = BODIES[VARIANT.dog] ?? v_a175;"
} > src/models/studio/dog.ts
perl -0pi -e "s/    case 'viola':\n    case 'cello':\n    case 'contrabass':\n      return buildBowedString\(id, 1, bowGrip\);/    case 'cello':\n      return buildBowedString(id, VARIANT.cello, bowGrip);\n    case 'viola':\n    case 'contrabass':\n      return buildBowedString(id, 1, bowGrip);/" src/models/instruments/catalog.ts
perl -0pi -e "s/^(import )/import { VARIANT } from '..\/studio\/variant-pick.ts';\n\$1/m" src/models/instruments/catalog.ts
perl -0pi -e 's/const pin = upright \? \(CELLO_END_PIN \* s\) \/ STRING_SCALES.cello : 0;/const pin = !upright ? 0 : id === "cello" ? CELLO_END_PIN + VIOLIN.bodyLength * STRING_SCALES.cello * (1 - scale) : (CELLO_END_PIN * s) \/ STRING_SCALES.cello;/' src/models/instruments/strings.ts
perl -0pi -e "s/(    body: 'studio-dog',\n)/\$1    ...(['t1', 't2', 't1b', 't2b'].includes(VARIANT.dog) ? { seatedTail: 'curl' as const } : {}),\n/" src/models/species.ts
perl -0pi -e "s/^(import )/import { VARIANT } from '.\/studio\/variant-pick.ts';\n\$1/m" src/models/species.ts
perl -0pi -e 's|(    query.set\(moment.move.kind, String\(moment.move.share\)\);\n  \}\n)(  return `/gallery.html\?\$\{query.toString\(\)\}`;)|$1  if (process.env["CV_DISTANCE"]) { query.set("distance", process.env["CV_DISTANCE"]); }\n  for (const [k, v] of new URLSearchParams(process.env["CV_EXTRA"] ?? "")) { query.set(k, v); }\n$2|' tools/close-views.ts
perl -0pi -e 's|  const path = `/#demo=\$\{args.demo\}`;|  const path = `/?\${process.env["CV_EXTRA"] ?? ""}#demo=\${args.demo}`;|' tools/close-views.ts
perl -0pi -e 's|(\n/\*\*\n \* The first port of the servers of the tool.)|\nif (process.env["CV_VIEWS"]) { for (const r of Object.values(ROLE_VIEWS) as any[]) { r.views = process.env["CV_VIEWS"].split(",").map((s: string) => { const [name, az, el] = s.split(":"); return el ? { name, azimuth: Number(az), elevation: Number(el) } : { name, azimuth: Number(az) }; }); } }\nif (process.env["CV_MOMENTS"]) { const keep = process.env["CV_MOMENTS"].split(","); for (const r of Object.values(ROLE_VIEWS) as any[]) { r.moments = r.moments.filter((m: any) => keep.includes(m.name)); } }\n$1|' tools/close-views.ts
echo "variant tree $tree: $names"
