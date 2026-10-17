/**
 * Prints the rest of the free left paw of the seated tan fox flutist for each variant of `--set`:
 * the first seated tan fox of each demo of `FIT_DEMOS` with flutes, at each wall time of
 * `REST_WALLS`. For each variant, it gives the worst value over the samples of each measure:
 *
 * - `palm`: the height of the middle of the left palm above the top of the left leg under it (the
 *   skin of the thighs, the shins, the hips, and the spine), in cm. Negative: into the skin.
 *   `Infinity`: no skin of the leg under the palm. Goal -1 to 2 cm.
 * - `paw gap`: the smallest gap of the skin of the left paw to the closed body, in cm, and the depth
 *   of its deepest corner in the body.
 * - `rise`: the height of the left elbow joint above the left shoulder joint, in cm. Goal below 0.
 * - `fwd`: the left elbow joint in front of the left shoulder joint, in cm, the smallest over the
 *   samples.
 * - `out`: the left elbow joint out from the left side of the trunk at its height, seen from the
 *   front, in cm (the trunk moved by its main bones, as `armRest()` of `tools/lap-rest.ts`). Goal at
 *   most 8 cm.
 * - `upper`: the angle of the left upper arm from the vertical, in degrees. Goal at most 35°.
 * - `bend`: the angle at the left elbow joint between the upper arm and the forearm, in degrees:
 *   180 for a straight arm.
 * - `share`: the reach share of the rest place on the chair (`freeRestReach()` of
 *   `pnpm hold-reach`), above 1 out of reach.
 * - `L arm in body`: the deepest corner of the left upper arm and of the left forearm in the body.
 * - `end`: the gap of the lower end of the flute to the skin of the thighs and the hips
 *   (`lapRest()`), in cm. Goal at most 2 cm.
 * - `R spare`: the reach of the right arm to its grip on the resting flute less the distance
 *   from the shoulder joint to the grip (`pnpm hold-reach fox-tan --instrument flute`), in cm.
 * - `folds`: the folded faces of the studio skin by side, the largest over the samples.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-tan-rest/left-rest.ts [--set '<changes>']... [--walls <s>,<s>]
 */
import { MathUtils, Ray, Triangle, Vector3 } from 'three';

import { FOLD_ROLES } from '../../../tools/fold-probe.ts';
import { FIT_DEMOS } from '../../../tools/hold-fit.ts';
import { fluteReach, freeRestReach } from '../../../tools/hold-reach.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { REST_WALLS, lapRest, rebuiltRig, scanSamples, studioFolds } from '../../../tools/lap-rest.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { BONE_NAMES, boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { poseAt } from '../../../src/pose/pose-at.ts';
import { closedDepth, surfaceGap } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton, posedPoint } from '../../../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { FLUTIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';

const args = process.argv.slice(2);
const variants = [''];
let walls: readonly number[] = REST_WALLS;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--set') {
    variants.push(args[++i] ?? '');
  } else if (args[i] === '--walls') {
    walls = (args[++i] ?? '').split(',').map(Number);
  } else {
    throw new Error(`Unknown option ${args[i]}`);
  }
}

const role = FOLD_ROLES.get('flutist');
if (!role) {
  throw new Error('No flutist role.');
}
const demos = (await patchedDemos()).filter((d) => FIT_DEMOS.includes(d.file.replace(/\.mid$/, '')));
const samples = scanSamples(role, demos, walls);
const bodyObstacle = FLUTIST_SWEEP.obstacles.find((o) => o.name === 'body');
if (!bodyObstacle) {
  throw new Error('No body obstacle.');
}

const TOP: readonly BoneName[] = ['thighL', 'thighR', 'shinL', 'shinR', 'hips', 'spine'];
const TRUNK: readonly BoneName[] = ['hips', 'spine', 'chest'];

/** Gives the posed triangles of the skin whose first corner has one of the bones. */
function skin(posed: PosedSkeleton, names: readonly BoneName[]): Triangle[] {
  const wanted = new Set(names.map(boneIndex));
  const { bones } = posed.model.mesh;
  const out: Triangle[] = [];
  for (let c = 0; c + 2 < bones.length; c += 3) {
    if (wanted.has(bones[c] ?? -1)) {
      const [a, b, d] = [0, 1, 2].map((k) => new Vector3(...posedCorner(posed, c + k)));
      if (a && b && d) {
        out.push(new Triangle(a, b, d));
      }
    }
  }
  return out;
}

/** Gives the triangles of the trunk moved by their main bone alone (`trunkTriangles()`). */
function trunk(posed: PosedSkeleton): Triangle[] {
  const { positions, bones } = posed.model.mesh;
  const wanted = new Set(TRUNK.map(boneIndex));
  const out: Triangle[] = [];
  for (let c = 0; c + 2 < bones.length; c += 3) {
    const bone = BONE_NAMES[bones[c] ?? -1];
    if (!bone || !wanted.has(bones[c] ?? -1)) {
      continue;
    }
    const [a, b, d] = [0, 1, 2].map(
      (k) =>
        new Vector3(
          ...posedPoint(posed, bone, [
            positions[(c + k) * 3] ?? 0,
            positions[(c + k) * 3 + 1] ?? 0,
            positions[(c + k) * 3 + 2] ?? 0,
          ]),
        ),
    );
    if (a && b && d) {
      out.push(new Triangle(a, b, d));
    }
  }
  return out;
}

/** Gives the points where the edges of the triangles cross a level plane. */
function section(triangles: readonly Triangle[], height: number): Vector3[] {
  const points: Vector3[] = [];
  for (const t of triangles) {
    const corners = [t.a, t.b, t.c];
    for (let k = 0; k < 3; k++) {
      const a = corners[k];
      const b = corners[(k + 1) % 3];
      if (!a || !b || a.y === b.y || (a.y - height) * (b.y - height) > 0) {
        continue;
      }
      points.push(new Vector3().lerpVectors(a, b, (height - a.y) / (b.y - a.y)));
    }
  }
  return points;
}

/** Gives the height of the palm above the highest skin of the top of the leg under it. */
function aboveTop(palm: Vector3, top: readonly Triangle[]): number {
  const ray = new Ray(new Vector3(palm.x, palm.y + 1, palm.z), new Vector3(0, -1, 0));
  const hit = new Vector3();
  let best = -Infinity;
  for (const t of top) {
    if (ray.intersectTriangle(t.a, t.b, t.c, false, hit)) {
      best = Math.max(best, hit.y);
    }
  }
  return best === -Infinity ? Infinity : palm.y - best;
}

/** Gives the posed corners of the triangles of the bones. */
function corners(posed: PosedSkeleton, names: readonly BoneName[]): Vector3[] {
  return skin(posed, names).flatMap((t) => [t.a, t.b, t.c]);
}

interface Row {
  palm: number;
  pawGap: number;
  pawDepth: number;
  rise: number;
  forward: number;
  out: number;
  upper: number;
  bend: number;
  upperDepth: number;
  foreDepth: number;
  end: number;
  folds: string;
  foldCount: number;
}

const cm = (v: number): string => (Number.isFinite(v) ? (v * 100).toFixed(1) : String(v));
console.log(`Samples: ${samples.map((s) => s.sample).join('; ')}`);
console.log(
  '| Variant | palm cm (worst low / high) | paw gap cm (depth) | rise cm | fwd cm | out cm | upper ° | bend ° | share | L upper arm / forearm in body cm | end cm | R spare cm | folds (L/R/other) |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const variant of variants) {
  const { undo, text } = setHolds(variant);
  try {
    const rows: Row[] = [];
    for (const sample of samples) {
      const { scene, index, model, species, wall } = sample;
      const plan = rebuiltRig(scene.plan, index, model, species);
      const start = -countInAt(plan.beats, 0).lengthSec;
      const pose = poseAt(plan, start, wall, NOT_STARTED, sample.audible, sample.buffer).players[
        index
      ];
      if (!pose) {
        throw new Error('No pose.');
      }
      const posed = poseSkeleton(model, pose);
      const body = bodyObstacle.surface(posed);
      const palm = new Vector3(...posedPoint(posed, 'handL', model.body.palmL));
      const at = (bone: BoneName): Vector3 => {
        const frame = posed.frames[boneIndex(bone)];
        if (!frame) {
          throw new Error(`No frame of ${bone}.`);
        }
        return frame.position.clone();
      };
      const shoulder = at('upperArmL');
      const elbow = at('forearmL');
      const wrist = at('handL');
      const cut = section(trunk(posed), elbow.y);
      const paw = skin(posed, ['handL', 'fingersL']);
      const fold = studioFolds(model, pose);
      rows.push({
        palm: aboveTop(palm, skin(posed, TOP)),
        pawGap: surfaceGap(paw, body, 0.3).gap,
        pawDepth: closedDepth(
          paw.flatMap((t) => [t.a, t.b, t.c]),
          body,
        ).depth,
        rise: elbow.y - shoulder.y,
        forward: shoulder.z - elbow.z,
        out: cut.length > 0 ? Math.min(...cut.map((p) => p.x)) - elbow.x : Infinity,
        upper: MathUtils.radToDeg(elbow.clone().sub(shoulder).angleTo(new Vector3(0, -1, 0))),
        bend: MathUtils.radToDeg(
          shoulder.clone().sub(elbow).angleTo(wrist.clone().sub(elbow)),
        ),
        upperDepth: closedDepth(corners(posed, ['upperArmL']), body).depth,
        foreDepth: closedDepth(corners(posed, ['forearmL']), body).depth,
        end: lapRest(posed, body)?.endGap ?? NaN,
        folds: `${fold.L}/${fold.R}/${fold.other}`,
        foldCount: fold.L + fold.R + fold.other,
      });
    }
    const max = (f: (r: Row) => number): number => Math.max(...rows.map(f));
    const min = (f: (r: Row) => number): number => Math.min(...rows.map(f));
    const share = freeRestReach('fox-tan', 'flute', 'chair')[0];
    const shareText =
      share && share.distance !== null ? (share.distance / share.arm).toFixed(3) : '-';
    const right = fluteReach('fox-tan', 'chair').R;
    const worstFold = rows.reduce((a, b) => (b.foldCount > a.foldCount ? b : a));
    console.log(
      `| ${text || 'base'} | ${cm(min((r) => r.palm))} / ${cm(max((r) => r.palm))} | ${cm(max((r) => r.pawGap))} (${cm(max((r) => r.pawDepth))}) | ${cm(max((r) => r.rise))} | ${cm(min((r) => r.forward))} | ${cm(max((r) => r.out))} | ${max((r) => r.upper).toFixed(1)} | ${max((r) => r.bend).toFixed(1)} | ${shareText} | ${cm(max((r) => r.upperDepth))} / ${cm(max((r) => r.foreDepth))} | ${cm(max((r) => r.end))} | ${cm(right.arm - right.rest)} | ${worstFold.folds} |`,
    );
  } finally {
    undo();
  }
}
