/**
 * Measures the right side and the back of the trunk of the seated rabbit at the height of its
 * right elbow in one rest sample (`bach-bwv1050` player 0, wall 21.1 s): with the posed skin of
 * the hips, the spine, and the chest, and with each triangle of these bones moved by its main
 * bone alone (`armRest()` of `tools/lap-rest.ts`). It also prints the bind direction and the
 * direction of the pose of the sheet of each upper arm of the studio rig, in the axes of the
 * chest (`StudioArm.upper` and `StudioArm.sheet`), with the angle of the sheet arm from the
 * vertical, and the top of the right knee (`lapPoint()` of `pose/lap.ts` at the knee).
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-16-rabbit-arm/trunk-side.ts [<variant>]
 *
 * The variant is the text of `--set` of `pnpm hold-fit`. The rest of `main` before the round is
 * `violin@rabbit.restPoleR=1,-0.5,0;violin@rabbit.restBow.lap.along=0.65;violin@rabbit.restBow.lap.offset=0.15,0,0`.
 */
import { Triangle, Vector3 } from 'three';

import { BONE_NAMES, boneIndex } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { lapPoint } from '../../../src/pose/lap.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { posedPart } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton, posedPoint } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { armRest } from '../../../tools/lap-rest.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const variant = process.argv[2] ?? '';
if (variant) {
  setHolds(variant);
}
const demo = (await patchedDemos()).find((d) => d.file === 'bach-bwv1050.mid');
const role = FOLD_ROLES.get('violinist');
if (!demo || !role) {
  throw new Error('The demo or the role is missing.');
}
const scene = sceneOf(demo.bytes);
const seated = roleBodies(role, scene).find(
  (b) => b.index !== null && scene.layout.players[b.index]?.cast.support !== 'stand',
);
if (!seated || seated.index === null) {
  throw new Error('The demo has no seated rabbit violinist.');
}
const { index, model } = seated;
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const pose = poseAt(scene.plan, start, 21.1, NOT_STARTED, allAudible(scene.score), createScenePose(scene.plan)).players[index];
if (!pose) {
  throw new Error('The player has no pose.');
}
const posed = poseSkeleton(model, pose);
const cm = (v: number): string => (v * 100).toFixed(1);
const at = (bone: 'upperArmR' | 'forearmR' | 'handR'): Vector3 =>
  posed.frames[boneIndex(bone)]?.position ?? new Vector3();
const [shoulder, elbow, wrist] = [at('upperArmR'), at('forearmR'), at('handR')];
console.log(`Variant: ${variant || 'the source'}`);
console.log(`Right shoulder joint (cm): ${cm(shoulder.x)}, ${cm(shoulder.y)}, ${cm(shoulder.z)}`);
console.log(`Right elbow joint (cm): ${cm(elbow.x)}, ${cm(elbow.y)}, ${cm(elbow.z)}`);
console.log(`Right hand bone (cm): ${cm(wrist.x)}, ${cm(wrist.y)}, ${cm(wrist.z)}`);
console.log(`Shoulder joint to hand bone: ${cm(shoulder.distanceTo(wrist))} cm; upper arm ${cm(shoulder.distanceTo(elbow))} cm, forearm ${cm(elbow.distanceTo(wrist))} cm`);
console.log(`armRest(): ${JSON.stringify(armRest(posed), (_, v: unknown) => (typeof v === 'number' ? Number(v.toFixed(4)) : v))}`);

/** Gives the extent of the cut of some triangles at a height, in cm. */
function cut(triangles: readonly Triangle[], height: number): string {
  const points: Vector3[] = [];
  for (const t of triangles) {
    const c = [t.a, t.b, t.c];
    for (let k = 0; k < 3; k++) {
      const a = c[k];
      const b = c[(k + 1) % 3];
      if (!a || !b || a.y === b.y || (a.y - height) * (b.y - height) > 0) {
        continue;
      }
      points.push(new Vector3().lerpVectors(a, b, (height - a.y) / (b.y - a.y)));
    }
  }
  if (points.length === 0) {
    return 'no cut';
  }
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  return `x ${cm(Math.min(...xs))} to ${cm(Math.max(...xs))}, z ${cm(Math.min(...zs))} to ${cm(Math.max(...zs))}`;
}

const trunk = ['hips', 'spine', 'chest'] as const;
const skin = posedPart(posed, [...trunk]).triangles;
const own: Triangle[] = [];
const { positions, bones } = model.mesh;
for (let c = 0; c + 2 < bones.length; c += 3) {
  const name = BONE_NAMES[bones[c] ?? -1];
  if (!name || !(trunk as readonly string[]).includes(name)) {
    continue;
  }
  const [a, b, d] = [0, 1, 2].map(
    (k) =>
      new Vector3(
        ...posedPoint(posed, name, [
          positions[(c + k) * 3] ?? 0,
          positions[(c + k) * 3 + 1] ?? 0,
          positions[(c + k) * 3 + 2] ?? 0,
        ]),
      ),
  );
  if (a && b && d) {
    own.push(new Triangle(a, b, d));
  }
}
for (const height of [elbow.y, 0.48, 0.4]) {
  console.log(`Cut at ${cm(height)} cm: posed skin ${cut(skin, height)}; moved by the main bones ${cut(own, height)}`);
}

const rig = model.studio;
if (rig) {
  for (const side of ['L', 'R'] as const) {
    const arm = rig.arms[side];
    const angle = (Math.acos(-(arm.sheet[1] ?? 0)) * 180) / Math.PI;
    console.log(`Studio arm ${side}: bind ${arm.upper.map((v) => v.toFixed(3)).join(', ')}; sheet ${arm.sheet.map((v) => v.toFixed(3)).join(', ')}, ${angle.toFixed(1)}° from the vertical`);
  }
}

const knee = lapPoint(model, 'R', { along: 1, offset: [0, 0, 0] });
console.log(`Top of the right knee (cm): ${knee.map((v) => cm(v)).join(', ')}`);
