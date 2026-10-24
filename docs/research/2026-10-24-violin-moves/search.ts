/**
 * Searches hold variants of the lift and the lowering of one violin role in one process. For each
 * variant (one line "label|changes" of a file), it poses the player at the shares 0 to 1 of the
 * lift and of the lowering, as the gallery does (`moveTransport()`), and prints: the range of each
 * elbow, the largest angle of the left upper arm from the vertical, the largest paw swing of each
 * arm in the studio rig, the largest change of the paw twist in one step of 0.02 (a pass through
 * 180° is a jump of more than 90°), and the deepest instrument in the body and arms in the
 * instrument at the shares 0.1 to 0.9.
 *
 * Usage: node docs/research/2026-10-24-violin-moves/search.ts <rabbit|cat|fox-red> <file> [--no-depth]
 */
import { readFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { moveTransport } from '../../../src/gallery/items.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  studioOffsets,
  twistAngle,
} from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { sweepDepths } from '../../../src/pose/test-sweep.ts';
import type { SweepSample } from '../../../src/pose/test-sweep.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const [speciesArg = 'rabbit', file = ''] = process.argv.slice(2);
const depths = !process.argv.includes('--no-depth');
const want = speciesArg as SpeciesId;
const role = want === 'cat' ? 'violist' : 'violinist';
const bytes = (
  await patchedDemo(
    process.env['DEMO'] ? `${process.env['DEMO']}.mid` : want === 'cat' ? 'mozart-k525.mid' : 'beethoven-8.mid',
  )
).bytes;
const lines = readFileSync(file, 'utf8')
  .split('\n')
  .filter((l) => l.trim() !== '' && !l.startsWith('#'));

const angle = (a: Vector3, b: Vector3): number =>
  (Math.acos(Math.max(-1, Math.min(1, a.dot(b) / a.length() / b.length()))) * 180) / Math.PI;
const wrap = (d: number): number => ((((d + 180) % 360) + 360) % 360) - 180;
const SHORT: Record<string, string> = {
  'instrument body': 'inst',
  'forearms violin': 'arms',
  'forearms viola': 'arms',
  'upper arms violin': 'arms',
  'upper arms viola': 'arms',
  'forearms body': 'body',
  'upper arms body': 'body',
  'paws violin': 'paw',
  'paws viola': 'paw',
};

for (const line of lines) {
  const bar = line.indexOf('|');
  const label = line.slice(0, bar);
  const changes = line.slice(bar + 1);
  const undo = changes === '-' ? null : setHolds(changes);
  try {
    const scene = sceneOf(bytes);
    const sweep = SWEEP_ROLES[role];
    const player = sweep.players(scene).find((p) => {
      const index = Number(/(\d+)/.exec(p.name)?.[1] ?? -1);
      return scene.layout.players[index]?.cast.species === want && !p.name.includes('soloist');
    });
    if (!player) {
      throw new Error(`no ${want}`);
    }
    const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
    const plan = scene.plan.players[index]!;
    const model = player.model;
    const rig = model.studio!;
    const h = rig.body.heads;
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const studio = createStudioPose();
    const turnOf = (bone: number): Quaternion =>
      new Quaternion().setFromRotationMatrix(
        new Matrix4().fromArray(
          Array.from({ length: 16 }, (...[, k]) => studio.matrices[bone * 16 + k] ?? 0),
        ),
      );
    const most = {
      elbL: [180, 0],
      elbR: [180, 0],
      upL: 0,
      swingL: 0,
      swingR: 0,
      jumpL: 0,
      jumpR: 0,
      inst: 0,
      arms: 0,
      body: 0,
      paw: 0,
      rotL: 0,
      rotR: 0,
      twistL: [999, -999],
      rest: '',
    };
    for (const kind of ['lift', 'lower'] as const) {
      const last: Record<string, number | null> = { L: null, R: null };
      const lastQ: Record<string, Quaternion | null> = { L: null, R: null };
      for (let k = 0; k <= 50; k++) {
        const share = k / 50;
        const transport = moveTransport({ kind, share }, plan.motion, 10);
        const song = kind === 'lift' ? start : scene.score.durationSec;
        const sample: SweepSample = [song, 10, transport];
        const pose = player.poseAt(sample);
        const posed = poseSkeleton(model, pose);
        const at = (b: BoneName): Vector3 => posed.frames[boneIndex(b)]!.position.clone();
        const elbow = (side: 'L' | 'R'): number =>
          angle(
            at(`upperArm${side}`).sub(at(`forearm${side}`)),
            at(`hand${side}`).sub(at(`forearm${side}`)),
          );
        poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
        const inner = share > 0.05 && share < 0.95;
        for (const side of ['L', 'R'] as const) {
          const fore = turnOf(STUDIO_BONES.indexOf(`forearm_${side}`));
          const hand = turnOf(STUDIO_BONES.indexOf(`hand_${side}`));
          const foreBind = new Vector3(...h[`hand_${side}`])
            .sub(new Vector3(...h[`forearm_${side}`]))
            .normalize();
          const paw = fore.clone().invert().multiply(hand);
          const tw = (twistAngle(paw, foreBind) * 180) / Math.PI;
          const swingQ = paw
            .clone()
            .multiply(new Quaternion().setFromAxisAngle(foreBind, (-tw * Math.PI) / 180));
          const swing = (2 * Math.acos(Math.min(1, Math.abs(swingQ.w))) * 180) / Math.PI;
          const before = last[side];
          if (before !== null && before !== undefined) {
            const jump = Math.abs(wrap(tw - before));
            if (side === 'L') {
              most.jumpL = Math.max(most.jumpL, jump);
            } else {
              most.jumpR = Math.max(most.jumpR, jump);
            }
            // A pass through 180° shows as a raw change of more than 180°.
            if (Math.abs(tw - before) > 180) {
              if (side === 'L') {
                most.jumpL = Math.max(most.jumpL, 999);
              } else {
                most.jumpR = Math.max(most.jumpR, 999);
              }
            }
          }
          last[side] = tw;
          const beforeQ = lastQ[side];
          if (beforeQ) {
            const step = (2 * Math.acos(Math.min(1, Math.abs(beforeQ.dot(paw)))) * 180) / Math.PI;
            if (side === 'L') {
              most.rotL = Math.max(most.rotL, step);
            } else {
              most.rotR = Math.max(most.rotR, step);
            }
          }
          lastQ[side] = paw.clone();
          if (k === 0 && kind === 'lift' && side === 'L') {
            most.rest = `rest L twist ${tw.toFixed(0)} swing ${swing.toFixed(0)} elbow ${elbow('L').toFixed(0)}`;
          }
          if (inner) {
            if (side === 'L') {
              most.swingL = Math.max(most.swingL, swing);
              most.twistL = [Math.min(most.twistL[0]!, tw), Math.max(most.twistL[1]!, tw)];
            } else {
              most.swingR = Math.max(most.swingR, swing);
            }
          }
        }
        if (inner) {
          for (const side of ['L', 'R'] as const) {
            const e = elbow(side);
            const range = side === 'L' ? most.elbL : most.elbR;
            range[0] = Math.min(range[0]!, e);
            range[1] = Math.max(range[1]!, e);
          }
          most.upL = Math.max(most.upL, angle(at('forearmL').sub(at('upperArmL')), new Vector3(0, -1, 0)));
          if (depths && k % 5 === 0) {
            for (const pair of sweepDepths(sweep, player, [sample])) {
              const key = SHORT[`${pair.part} ${pair.into}`];
              if (key === 'inst') most.inst = Math.max(most.inst, pair.depth * 100);
              if (key === 'arms') most.arms = Math.max(most.arms, pair.depth * 100);
              if (key === 'body') most.body = Math.max(most.body, pair.depth * 100);
              if (key === 'paw') most.paw = Math.max(most.paw, pair.depth * 100);
            }
          }
        }
      }
    }
    const f = (v: number): string => v.toFixed(0);
    console.log(
      `${label} :: elbL ${f(most.elbL[0]!)}..${f(most.elbL[1]!)} elbR ${f(most.elbR[0]!)}..${f(most.elbR[1]!)} upL ${f(most.upL)} | swing L ${f(most.swingL)} R ${f(most.swingR)} | jump L ${f(most.jumpL)} R ${f(most.jumpR)} rot L ${f(most.rotL)} R ${f(most.rotR)} | twistL ${f(most.twistL[0]!)}..${f(most.twistL[1]!)} | inst ${most.inst.toFixed(1)} arms ${most.arms.toFixed(1)} body ${most.body.toFixed(1)} paw ${most.paw.toFixed(1)} | ${most.rest}`,
    );
  } catch (error) {
    console.log(`${label} :: error ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    undo?.undo();
  }
}
