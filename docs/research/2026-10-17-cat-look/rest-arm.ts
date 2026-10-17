/**
 * Measures both arms of the seated cat violist in the rest before the first play, for variants of
 * its hold: the elbow angle, the angle of the upper arm from the vertical, the elbow out from the
 * side of the trunk (each triangle of the trunk moved by its main bone, as `armRest()`), the
 * direction of the forearm, and the place of each wrist against its thigh (the share along the
 * thigh from the hip joint to the knee, and the distance out from and above the thigh axis).
 *
 * Usage: node scratch/rest-arm.ts [--demo <id>] [--wall <s>] [<changes>]...
 * Each <changes> is one variant, as `pnpm hold-fit --set`. The first row is the base.
 */
import { Triangle, Vector3 } from 'three';

import { FOLD_ROLES } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { rebuiltRig, scanSamples, studioFolds } from '../../../tools/lap-rest.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { BONE_NAMES, boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPoint } from '../../../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED } from '../../../src/pose/test-scene.ts';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
const demoId = opt('--demo', 'bach-bwv1050');
const wall = Number(opt('--wall', '21.1'));
const variants = [
  '',
  ...args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] ?? '').startsWith('--')),
];

const role = FOLD_ROLES.get('violist');
if (!role) {
  throw new Error('no violist');
}
const demos = (await patchedDemos()).filter((d) => d.file === `${demoId}.mid`);
const [sample] = scanSamples(role, demos, [wall]);
if (!sample) {
  throw new Error('no sample');
}

const TRUNK = ['hips', 'spine', 'chest'];

function trunkTriangles(posed: PosedSkeleton): Triangle[] {
  const { positions, bones } = posed.model.mesh;
  const trunk = new Set(
    BONE_NAMES.filter((b) => TRUNK.some((t) => b === t || b.startsWith('spine'))).map(boneIndex),
  );
  const out: Triangle[] = [];
  for (let c = 0; c + 2 < bones.length; c += 3) {
    const bone = BONE_NAMES[bones[c] ?? -1];
    if (!bone || !trunk.has(bones[c] ?? -1)) {
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

function section(triangles: readonly Triangle[], height: number): Vector3[] {
  const points: Vector3[] = [];
  for (const t of triangles) {
    const c = [t.a, t.b, t.c];
    for (let k = 0; k < 3; k++) {
      const a = c[k] as Vector3;
      const b = c[(k + 1) % 3] as Vector3;
      if (a.y === b.y || (a.y - height) * (b.y - height) > 0) {
        continue;
      }
      points.push(new Vector3().lerpVectors(a, b, (height - a.y) / (b.y - a.y)));
    }
  }
  return points;
}

const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(0);
const cm = (m: number): string => (m * 100).toFixed(1);
console.log(`Rest sample: ${sample.sample}`);
console.log(
  '| Variant | Folds L/R | R elbow angle | R upper from vertical | R elbow out of side cm | R elbow below shoulder cm | R forearm (out, up, fwd) | R wrist along thigh | R wrist out of thigh axis cm | R wrist above thigh axis cm | L elbow angle | L upper from vertical | L elbow out of side cm | L wrist (out, up, fwd) from L shoulder cm |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const variant of variants) {
  const changes = variant ? setHolds(variant) : null;
  try {
    const { scene, index, model, species } = sample;
    const plan = rebuiltRig(scene.plan, index, model, species);
    const start = -countInAt(plan.beats, 0).lengthSec;
    const pose = poseAt(plan, start, wall, NOT_STARTED, sample.audible, sample.buffer).players[
      index
    ];
    if (!pose) {
      throw new Error('no pose');
    }
    const posed = poseSkeleton(model, pose);
    const at = (b: BoneName): Vector3 => (posed.frames[boneIndex(b)]?.position as Vector3).clone();
    const tris = trunkTriangles(posed);
    const arm = (side: 'L' | 'R'): string[] => {
      const s = at(`upperArm${side}`);
      const e = at(`forearm${side}`);
      const w = at(`hand${side}`);
      const sign = side === 'R' ? 1 : -1;
      const cut = section(tris, e.y);
      const sideX = cut.length ? Math.max(...cut.map((p) => sign * p.x)) : NaN;
      const up = e.clone().sub(s);
      const fore = w.clone().sub(e).normalize();
      return [
        deg(up.clone().negate().angleTo(w.clone().sub(e))),
        deg(up.angleTo(new Vector3(0, -1, 0))),
        cm(sign * e.x - sideX),
        cm(s.y - e.y),
        `${(sign * fore.x).toFixed(2)}, ${fore.y.toFixed(2)}, ${(-fore.z).toFixed(2)}`,
      ];
    };
    const thigh = (side: 'L' | 'R'): string[] => {
      const hip = at(`thigh${side}`);
      const knee = at(`shin${side}`);
      const w = at(`hand${side}`);
      const axis = knee.clone().sub(hip);
      const len = axis.length();
      axis.normalize();
      const rel = w.clone().sub(hip);
      const along = rel.dot(axis);
      const across = rel.clone().addScaledVector(axis, -along);
      const sign = side === 'R' ? 1 : -1;
      return [(along / len).toFixed(2), cm(sign * across.x), cm(across.y)];
    };
    const r = arm('R');
    const l = arm('L');
    const ls = at('upperArmL');
    const lw = at('handL').sub(ls);
    const folds = studioFolds(model, pose);
    console.log(
      `| ${variant || 'base'} | ${folds.L}/${folds.R} | ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} | ${thigh('R').join(' | ')} | ${l[0]} | ${l[1]} | ${l[2]} | ${cm(-lw.x)}, ${cm(lw.y)}, ${cm(-lw.z)} |`,
    );
  } finally {
    changes?.undo();
  }
}
