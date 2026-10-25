// Finds the cause of the depth of the upper arm corners in the body at one play sample.
// For each of the deepest corners, it prints the studio vertex, its four bones and weights, and
// its depth with the weights of the rig and with probe weights of the corners of the upper arm:
//   helper: the weight of the elbow helper moves to the upper arm segment with the most weight.
//   trunk:  the weight of the clavicle and the trunk bones moves to that segment.
//   rigid:  all weight moves to that segment.
// Only the corners of the upper arm change, so the body surface stays the same.
// Usage: node docs/research/2026-10-25-thick-arm-depth/probes/depth-cause.ts <role> <side L|R> <demo>:<song|rest> [<count>] [<holds>]
import { Triangle, Vector3 } from 'three';

import { setHolds } from '../../../../tools/hold-sets.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';
import { closeSurface, closedDepth } from '../../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../../src/pose/test-skin.ts';
import { SWEEP_ROLES, playSample } from '../../../../src/pose/test-sweep-roles.ts';

const [roleName = 'timpanist', side = 'R', at = 'beethoven-8-4:565.34', countText = '8', holds = ''] =
  process.argv.slice(2);
setHolds(holds);
const [demoId = '', songText = '0'] = at.split(':');
const song = Number(songText);
const role = (SWEEP_ROLES as Record<string, (typeof SWEEP_ROLES)[keyof typeof SWEEP_ROLES]>)[
  roleName
];
if (!role) throw new Error(`no role ${roleName}`);
const demo = (await probeDemos()).find((d) => d.file.replace(/\.mid$/, '') === demoId);
if (!demo) throw new Error(`no demo ${demoId}`);
const scene = sceneOf(demo.bytes);
const [player] = role.players(scene);
if (!player) throw new Error('no player');
const studio = player.model.studio;
if (!studio) throw new Error('no studio body');
const mesh = studio.mesh;
const weights = mesh.weights as Float32Array;
const joints = mesh.joints as Uint8Array;
const original = weights.slice();
const originalJoints = joints.slice();
const sample =
  songText === 'rest'
    ? [...(role.sampleSets(scene).find((set) => set.name === 'rest')?.samples ?? [])][0]!
    : playSample(scene, song);
const pose = player.poseAt(sample);

const wanted = boneIndex(`upperArm${side}` as 'upperArmR');
const { positions, bones } = player.model.mesh;
const corners: number[] = [];
const seen = new Set<string>();
for (let c = 0; c < bones.length && c < mesh.corners.length; c++) {
  const key = `${positions[3 * c]} ${positions[3 * c + 1]} ${positions[3 * c + 2]}`;
  if (bones[c] === wanted && !seen.has(key)) {
    seen.add(key);
    corners.push(c);
  }
}
const vertices = new Set(corners.map((c) => mesh.corners[c] ?? 0));
const body = role.obstacles.find((o) => o.name === 'body');
if (!body) throw new Error('no body obstacle');

// The depth of each corner in the bind pose of the studio: the body triangles and the corners
// at their bind places.
const BODY = new Set(
  ['hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR', 'tail1',
    'tail2', 'shoulderL', 'shoulderR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'].map(
    (b) => boneIndex(b as 'hips'),
  ),
);
const at3 = (v: number): Vector3 => new Vector3().fromArray(mesh.positions, v * 3);
const bodyTriangles: Triangle[] = [];
for (let t = 0; t * 3 < mesh.corners.length; t++) {
  if (BODY.has(bones[t * 3] ?? -1)) {
    const [a, b, c] = [0, 1, 2].map((k) => at3(mesh.corners[t * 3 + k] ?? 0));
    bodyTriangles.push(new Triangle(a, b, c));
  }
}
const LOOPS: Record<string, number> = { timpanist: 3, tubist: 12 };
const bindSurface = closeSurface(bodyTriangles, LOOPS[roleName] ?? 2);
const bindDepth = new Map(
  corners.map((c) => [c, closedDepth([at3(mesh.corners[c] ?? 0)], bindSurface).depth] as const),
);
console.log(
  `bind pose: deepest upper arm corner ${(Math.max(...bindDepth.values()) * 100).toFixed(1)} cm`,
);

const segs = [0, 1, 2, 3].map((k) => STUDIO_BONES.indexOf(`upper_arm_seg${k}_${side}` as never));
const helper = STUDIO_BONES.indexOf(`elbow_${side}` as never);
const trunk = new Set(
  ['clavicle', 'chest', 'spine1', 'spine', 'hips', 'neck'].map((b) =>
    STUDIO_BONES.indexOf((b === 'clavicle' ? `clavicle_${side}` : b) as never),
  ),
);

type Variant = 'rig' | 'helper' | 'trunk' | 'rigid';
function setVariant(variant: Variant): void {
  weights.set(original);
  joints.set(originalJoints);
  if (variant === 'rig') return;
  for (const v of vertices) {
    let best = -1;
    let bestW = -1;
    for (let k = 0; k < 4; k++) {
      const j = joints[v * 4 + k] ?? 0;
      const w = weights[v * 4 + k] ?? 0;
      if (segs.includes(j) && w > bestW) {
        best = k;
        bestW = w;
      }
    }
    if (best < 0) continue;
    for (let k = 0; k < 4; k++) {
      if (k === best) continue;
      const j = joints[v * 4 + k] ?? 0;
      const w = weights[v * 4 + k] ?? 0;
      const move =
        variant === 'rigid' ||
        (variant === 'helper' && j === helper) ||
        (variant === 'trunk' && trunk.has(j));
      if (move && w > 0) {
        weights[v * 4 + best] = (weights[v * 4 + best] ?? 0) + w;
        weights[v * 4 + k] = 0;
      }
    }
  }
}

function depths(variant: Variant): Map<number, { depth: number; p: Vector3 }> {
  setVariant(variant);
  const posed = poseSkeleton(player!.model, pose);
  const surface = body!.surface(posed);
  const out = new Map<number, { depth: number; p: Vector3 }>();
  for (const c of corners) {
    const p = new Vector3(...posedCorner(posed, c));
    out.set(c, { depth: closedDepth([p], surface).depth, p });
  }
  return out;
}

const variants: Variant[] = ['rig', 'helper', 'trunk', 'rigid'];
const results = new Map(variants.map((v) => [v, depths(v)] as const));
setVariant('rig');
const base = results.get('rig')!;
const order = corners.toSorted((a, b) => (base.get(b)?.depth ?? 0) - (base.get(a)?.depth ?? 0));
const max = (v: Variant): number => Math.max(...[...results.get(v)!.values()].map((r) => r.depth));
console.log(
  `${roleName} upperArm${side} at ${at}: ${corners.length} corners; deepest cm: ${variants
    .map((v) => `${v} ${(max(v) * 100).toFixed(2)}`)
    .join(', ')}`,
);
for (const c of order.slice(0, Number(countText))) {
  const v = mesh.corners[c] ?? 0;
  const parts: string[] = [];
  for (let k = 0; k < 4; k++) {
    const w = original[v * 4 + k] ?? 0;
    if (w > 0) parts.push(`${STUDIO_BONES[originalJoints[v * 4 + k] ?? 0]} ${w.toFixed(2)}`);
  }
  const bind = [0, 1, 2].map((k) => (mesh.positions[v * 3 + k] ?? 0).toFixed(3)).join(', ');
  console.log(
    `  vertex ${v} bind [${bind}] ${variants
      .map((x) => `${x} ${((results.get(x)!.get(c)?.depth ?? 0) * 100).toFixed(1)}`)
      .join(' ')} bind ${((bindDepth.get(c) ?? 0) * 100).toFixed(1)} | ${parts.join(', ')}`,
  );
}
