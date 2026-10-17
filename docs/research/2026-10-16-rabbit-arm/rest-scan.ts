/**
 * Scans variants of the rest hold of the seated rabbit violinist in one rest sample of the
 * Bach demo `bach-bwv1050` (player 0, before the first play). For each variant, it rebuilds only
 * the bowed rig of the rabbit, and prints one row: the folded faces of the studio skin by side
 * (`foldedFaces()` of `tools/fold-probe.ts`), the right elbow (`armRest()` of
 * `tools/lap-rest.ts`), the depth of the corners of the right upper arm, forearm, and paw in the
 * body (the obstacle `body` of the violinist sweep), the bow (`lapRest()`), the directions of the
 * right upper arm (U) and forearm (F), the place of the right `hand` bone (W, cm), the height of
 * the lowest corner of the bow (frogY, cm), and its distance to the skin of the right thigh, shin,
 * foot, and the hips (legGap, cm). The last column lists each folded face with its main bone and
 * its fold angle.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-16-rabbit-arm/rest-scan.ts [--wall <s>[,<s>]...] [--file <list>] [<variant>]...
 *
 * A variant is the text of `--set` of `pnpm hold-fit`, such as
 * `violin@rabbit.restPoleR=0.3,-1,1;violin@rabbit.restBow.lap.along=1`. An empty variant is the
 * hold of the source. `--file` reads one variant from each line of a file (`variants.py` writes
 * them). The default wall time is 21.1 s, one of `REST_WALLS` of `tools/lap-rest.ts`.
 */
import { readFileSync } from 'node:fs';

import { Vector3 } from 'three';

import { boneIndex } from '../../../src/models/rig.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../../../src/models/studio-rig.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { closedDepth, posedPart } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { VIOLINIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { FOLD_ROLES, foldAngle, foldedFaces, mainBone, roleBodies } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { armRest, lapRest } from '../../../tools/lap-rest.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
let walls = [21.1];
const variants: string[] = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i] ?? '';
  if (arg === '--wall') {
    walls = (args[++i] ?? '').split(',').map(Number);
  } else if (arg === '--file') {
    variants.push(...readFileSync(args[++i] ?? '', 'utf8').split('\n').filter((line) => line));
  } else {
    variants.push(arg);
  }
}
if (variants.length === 0) {
  variants.push('');
}

const demo = (await patchedDemos()).find((d) => d.file === 'bach-bwv1050.mid');
const role = FOLD_ROLES.get('violinist');
const body = VIOLINIST_SWEEP.obstacles.find((o) => o.name === 'body');
if (!demo || !role || !body) {
  throw new Error('The demo, the role, or the obstacle "body" is missing.');
}
const scene = sceneOf(demo.bytes);
const seated = roleBodies(role, scene).find(
  (b) => b.index !== null && scene.layout.players[b.index]?.cast.support !== 'stand',
);
if (!seated || seated.index === null) {
  throw new Error('The demo has no seated rabbit violinist.');
}
const { index, model } = seated;
const species = scene.layout.players[index]?.cast.species ?? 'rabbit';
const rig = model.studio;
if (!rig) {
  throw new Error('The rabbit has no studio body.');
}
// SAFETY: a probe swaps the note layer of one player of the plan for each variant.
const plan = scene.plan.players[index] as unknown as { note: object };
const original = plan.note;
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const cm = (v: number): string => (v * 100).toFixed(1);
const dir = (v: Vector3): string => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;

console.log(
  '| Variant | Wall s | Folds R/L/other | Elbow rise cm | Elbow back cm | Elbow out cm | Upper arm ° | Upper arm in body cm | Forearm in body cm | Paw in body cm | Bow tilt ° | Frog gap cm | Bow in body cm | Bow in arms cm | Arm | Folded faces |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const variant of variants) {
  const undo = variant ? setHolds(variant).undo : (): void => {};
  try {
    plan.note = { ...original, rig: bowedRig(model, 'violin', holdOf(species, 'violin')) };
    for (const wall of walls) {
      const pose = poseAt(
        scene.plan,
        start,
        wall,
        NOT_STARTED,
        allAudible(scene.score),
        createScenePose(scene.plan),
      ).players[index];
      if (!pose) {
        continue;
      }
      const studio = poseStudioBones(
        rig,
        model.skeleton,
        pose.rotations,
        studioOffsets(pose),
        1,
        createStudioPose(),
      );
      const skinned = skinStudioMesh(rig.mesh, studio);
      const folded = foldedFaces(rig.mesh, studio.matrices, skinned);
      const bones = folded.map((face) => mainBone(rig.mesh, face));
      const right = bones.filter((b) => b.endsWith('_R')).length;
      const left = bones.filter((b) => b.endsWith('_L')).length;
      const faces = folded.map(
        (face, k) =>
          `${face}:${bones[k]}:${foldAngle(rig.mesh, studio.matrices, skinned, face).toFixed(0)}`,
      );

      const posed = poseSkeleton(model, pose);
      const arm = armRest(posed);
      const surface = body.surface(posed);
      const depth = (bone: 'upperArmR' | 'forearmR' | 'handR'): number =>
        closedDepth(
          posedPart(posed, [bone]).triangles.flatMap((t) => [t.a, t.b, t.c]),
          surface,
        ).depth;
      const bow = lapRest(posed, surface)?.bow;

      const at = (bone: 'upperArmR' | 'forearmR' | 'handR'): Vector3 =>
        posed.frames[boneIndex(bone)]?.position ?? new Vector3();
      const [shoulder, elbow, wrist] = [at('upperArmR'), at('forearmR'), at('handR')];
      const upper = elbow.clone().sub(shoulder).normalize();
      const fore = wrist.clone().sub(elbow).normalize();
      const corners = posedPart(posed, ['bow']).triangles.flatMap((t) => [t.a, t.b, t.c]);
      const low = corners.reduce((a, b) => (b.y < a.y ? b : a));
      const near = new Vector3();
      let legGap = Infinity;
      for (const t of posedPart(posed, ['thighR', 'shinR', 'footR', 'hips']).triangles) {
        legGap = Math.min(legGap, t.closestPointToPoint(low, near).distanceTo(low));
      }
      const armText = `U ${dir(upper)} F ${dir(fore)} W ${cm(wrist.x)},${cm(wrist.y)},${cm(wrist.z)} frogY ${cm(low.y)} legGap ${cm(legGap)}`;

      console.log(
        `| ${variant || 'source'} | ${wall} | ${right}/${left}/${bones.length - right - left} | ${cm(arm.rise)} | ${cm(arm.back)} | ${cm(arm.out)} | ${arm.upperArm.toFixed(0)} | ${cm(depth('upperArmR'))} | ${cm(depth('forearmR'))} | ${cm(depth('handR'))} | ${bow ? bow.tilt.toFixed(0) : '-'} | ${bow ? cm(bow.frogGap) : '-'} | ${bow ? cm(bow.bodyDepth) : '-'} | ${bow ? cm(bow.armDepth) : '-'} | ${armText} | ${faces.join(' ')} |`,
      );
    }
  } finally {
    undo();
  }
}
