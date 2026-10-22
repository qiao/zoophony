/**
 * Finds the gap of each bone of the bear conductor to its stand (the post, the desk, and the
 * score above the podium top) in the lift, the bow, and the lowering of the arms of a demo, as the
 * stand check of `src/pose/test-conductor-clearance.ts` measures it, and prints the bones within
 * 4 cm, with the wall time of the nearest sample. A hold change goes in with `--set <changes>`.
 *
 *     node docs/research/2026-10-22-mesh-bear/stand-probe.ts [--set <changes>] [<demo file>]
 */
import { Box3, Triangle, Vector3 } from 'three';

import { conductorOn } from '../../../src/models/layout-scene.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { buildPodium } from '../../../src/models/stage.ts';
import { partDistance } from '../../../src/pose/test-clearance.ts';
import type { PosedPart } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { CONDUCTOR_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';

const LIMIT = 0.04;
const args = process.argv.slice(2);
const at = args.indexOf('--set');
if (at >= 0) {
  setHolds(args[at + 1] ?? '');
  args.splice(at, 2);
}
const file = args[0] ?? 'mendelssohn-op61.mid';
const place = conductorOn([0, 0, 0]);
const from = new Vector3(...place.position);
const mesh = buildPodium();
const stand: PosedPart = { triangles: [], box: new Box3() };
for (let v = 0; v < mesh.positions.length / 3; v += 3) {
  const [a, b, c] = [0, 1, 2].map((k) =>
    new Vector3().fromArray(mesh.positions, (v + k) * 3).sub(from),
  );
  if (!a || !b || !c || Math.max(a.y, b.y, c.y) < 0.05) {
    continue;
  }
  stand.triangles.push(new Triangle(a, b, c));
  stand.box.expandByPoint(a).expandByPoint(b).expandByPoint(c);
}
const demo = (await probeDemos()).find((d) => d.file === file);
if (!demo) {
  throw new Error(`No demo ${file}.`);
}
const scene = sceneOf(demo.bytes);
const [player] = CONDUCTOR_SWEEP.players(scene);
const arms = CONDUCTOR_SWEEP.sampleSets(scene).find((s) => s.name === 'arms');
if (!player || !arms) {
  throw new Error('No conductor.');
}
const nearest = new Map<string, { gap: number; wall: number; song: number }>();
for (const sample of arms.samples) {
  const posed = poseSkeleton(player.model, player.poseAt(sample));
  const parts = new Map<number, PosedPart>();
  const { bones } = posed.model.mesh;
  for (let v = 0; v < bones.length; v += 3) {
    const bone = bones[v] ?? 0;
    const part = parts.get(bone) ?? { triangles: [], box: new Box3() };
    const [a, b, c] = [0, 1, 2].map((k) => new Vector3(...posedCorner(posed, v + k)));
    if (!a || !b || !c) {
      continue;
    }
    part.triangles.push(new Triangle(a, b, c));
    part.box.expandByPoint(a).expandByPoint(b).expandByPoint(c);
    parts.set(bone, part);
  }
  for (const [bone, part] of parts) {
    const gap = partDistance(part, stand, LIMIT);
    const name = BONE_NAMES[bone] ?? String(bone);
    if (gap < (nearest.get(name)?.gap ?? LIMIT)) {
      nearest.set(name, { gap, wall: sample[1], song: sample[0] });
    }
  }
}
console.log(`Demo ${file}: the bones within ${LIMIT * 100} cm of the stand in the arms samples.`);
for (const [name, n] of [...nearest].sort((a, b) => a[1].gap - b[1].gap)) {
  console.log(
    `  ${name}: ${(n.gap * 100).toFixed(2)} cm at song ${n.song.toFixed(2)} s, wall ${n.wall.toFixed(2)} s`,
  );
}
