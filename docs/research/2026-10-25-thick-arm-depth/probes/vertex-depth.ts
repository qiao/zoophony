// Sweeps a role and gives the deepest depth in the body of each studio vertex of the upper arms,
// with its place in the source (the corners file of `pnpm rig-mesh --check --keep`).
// Usage: node docs/research/2026-10-25-thick-arm-depth/probes/vertex-depth.ts <role> <corners.json> <every> [<out.json>] [<holds>]
import { readFileSync, writeFileSync } from 'node:fs';

import { Vector3 } from 'three';

import { setHolds } from '../../../../tools/hold-sets.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import { closedDepth } from '../../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../../src/pose/test-skin.ts';
import { SWEEP_ROLES } from '../../../../src/pose/test-sweep-roles.ts';

const [roleName = 'timpanist', cornersFile = '', everyText = '8', out = '', holds = ''] =
  process.argv.slice(2);
setHolds(holds);
const every = Number(everyText);
const role = (SWEEP_ROLES as Record<string, (typeof SWEEP_ROLES)[keyof typeof SWEEP_ROLES]>)[
  roleName
];
if (!role) throw new Error(`no role ${roleName}`);
const sources = cornersFile
  ? (JSON.parse(readFileSync(cornersFile, 'utf8')) as ({ s: number[][] } | null | 'eye')[])
  : [];

interface Deep {
  depth: number;
  at: string;
}
const deepest = new Map<number, Deep>();
let firstMesh: { corners: Uint32Array; positions: Float32Array } | null = null;
for (const demo of await probeDemos()) {
  const scene = sceneOf(demo.bytes);
  if (!role.hasRole(scene.score)) continue;
  const [player] = role.players(scene);
  if (!player?.model.studio) continue;
  const mesh = player.model.studio.mesh;
  firstMesh ??= mesh;
  const { positions, bones } = player.model.mesh;
  const corners: number[] = [];
  const seen = new Set<string>();
  const wanted = new Set([boneIndex('upperArmL'), boneIndex('upperArmR')]);
  for (let c = 0; c < bones.length && c < mesh.corners.length; c++) {
    const key = `${positions[3 * c]} ${positions[3 * c + 1]} ${positions[3 * c + 2]}`;
    if (wanted.has(bones[c] ?? -1) && !seen.has(key)) {
      seen.add(key);
      corners.push(c);
    }
  }
  const body = role.obstacles.find((o) => o.name === 'body');
  if (!body) throw new Error('no body');
  for (const set of role.sampleSets(scene)) {
    let k = 0;
    for (const sample of set.samples) {
      if (set.name === 'play' && k++ % every !== 0) continue;
      const posed = poseSkeleton(player.model, player.poseAt(sample));
      const surface = body.surface(posed);
      for (const c of corners) {
        const depth = closedDepth([new Vector3(...posedCorner(posed, c))], surface).depth;
        const v = mesh.corners[c] ?? 0;
        if (depth > (deepest.get(v)?.depth ?? 0)) {
          deepest.set(v, { depth, at: `${demo.file} ${set.name} ${sample[0].toFixed(2)}` });
        }
      }
    }
  }
  console.log(`${demo.file}: done`);
}

// The source place of each studio vertex: the corner of a face that holds it.
function sourceOf(v: number): number[] | null {
  if (!firstMesh) return null;
  for (let f = 0; f * 3 < firstMesh.corners.length; f++) {
    for (let k = 0; k < 3; k++) {
      if (firstMesh.corners[f * 3 + k] === v) {
        const face = sources[f];
        if (face && face !== 'eye') return face.s[k] ?? null;
      }
    }
  }
  return null;
}

const rows = [...deepest.entries()]
  .toSorted((a, b) => b[1].depth - a[1].depth)
  .map(([v, d]) => ({
    vertex: v,
    depth: Math.round(d.depth * 10000) / 10000,
    at: d.at,
    bind: [0, 1, 2].map((k) => Math.round((firstMesh?.positions[v * 3 + k] ?? 0) * 1e4) / 1e4),
    source: sourceOf(v),
  }));
for (const r of rows.slice(0, 30)) {
  console.log(
    `vertex ${r.vertex} ${(r.depth * 100).toFixed(1)} cm (${r.at}) bind [${r.bind.join(', ')}] source [${r.source?.join(', ')}]`,
  );
}
if (out) writeFileSync(out, JSON.stringify(rows, null, 1));
