/**
 * Prints the hold under the chin in the play of the rabbit, the red fox, and the cat, for each
 * variant of `--set`: the turn of the middle line of the body from the tail end to the scroll to the
 * left of the front of the chest (the +x axis of the violin model), with the turn of the strings
 * and of the line between the two farthest ends, as the chin probe measured it, the slope of the
 * middle line above the level, the gap and the depth of the head to the instrument,
 * the depth of the instrument in the body, and the reached part of the fingerboard (`stopRange`)
 * and of the hair (`bowRange`), the turn of the left upper arm from the vertical toward the middle
 * of the body, and the move of the left shoulder joint to the front of its bind place on the chest. It is the chin probe of `2026-10-24-violin-arms/` with the reach
 * and more variants. Each `--set` is one variant, and the first row has no change.
 *
 * Usage: node docs/research/2026-10-25-string-angle/angle-probe.ts [--species <id>]...
 *   [--every <n>] [--set <changes>]...
 */
import { Quaternion, Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { HEAD_PART, gapPairs, gapSweep, sweepDepths } from '../../../src/pose/test-sweep.ts';
import type { SweepSample } from '../../../src/pose/test-sweep.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const args = process.argv.slice(2);
const all = (flag: string): string[] =>
  args.flatMap((a, i) => (a === flag && args[i + 1] !== undefined ? [args[i + 1] ?? ''] : []));
const every = Number(all('--every')[0] ?? '10');
const variants = ['', ...all('--set')];
const wanted = all('--species');

const cases: [SpeciesId, 'violinist' | 'violist', 'violin' | 'viola', string][] = [
  ['rabbit', 'violinist', 'violin', 'beethoven-8'],
  ['fox-red', 'violinist', 'violin', 'beethoven-8'],
  ['cat', 'violist', 'viola', 'mozart-k525'],
];
const q = (values: number[], share: number): number => {
  const s = values.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(share * (s.length - 1)))] ?? Number.NaN;
};

for (const [want, roleName, instrument, demo] of cases) {
  if (wanted.length > 0 && !wanted.includes(want)) {
    continue;
  }
  for (const variant of variants) {
    const changes = setHolds(variant);
    const role = SWEEP_ROLES[roleName];
    const scene = sceneOf((await patchedDemo(`${demo}.mid`)).bytes);
    const player = role.players(scene).find((p) => {
      const index = Number(/(\d+)/.exec(p.name)?.[1] ?? -1);
      return scene.layout.players[index]?.cast.species === want && !p.name.includes('soloist');
    });
    if (!player) {
      console.log(`no ${want}`);
      changes.undo();
      continue;
    }
    const rig = bowedRig(player.model, instrument, holdOf(want, instrument));
    const play = role.sampleSets(scene).find((set) => set.name === 'play');
    const samples: SweepSample[] = [...(play?.samples ?? [])].filter((_, i) => i % every === 0);
    // The bind ends of the instrument: the two vertices of the instrument bone farthest apart.
    const mesh = player.model.mesh;
    const instBone = boneIndex('instrument');
    const pts: Vector3[] = [];
    for (let c = 0; c < mesh.bones.length; c++) {
      if (mesh.bones[c] === instBone) {
        pts.push(
          new Vector3(
            mesh.positions[c * 3] ?? 0,
            mesh.positions[c * 3 + 1] ?? 0,
            mesh.positions[c * 3 + 2] ?? 0,
          ),
        );
      }
    }
    let a = pts[0] ?? new Vector3();
    let b = a;
    for (const p of pts) {
      if (p.distanceTo(a) > b.distanceTo(a)) {
        b = p;
      }
    }
    for (const p of pts) {
      if (p.distanceTo(b) > a.distanceTo(b)) {
        a = p;
      }
    }
    const bindHead = new Vector3(...(player.model.skeleton.positions[instBone] ?? [0, 0, 0]));
    const slopes: number[] = [];
    const yaws: number[] = [];
    const endYaws: number[] = [];
    const stringYaws: number[] = [];
    const piece = player.model.pieces.find((p) => p.piece.bone === 'instrument');
    const bodyLine = new Vector3(1, 0, 0).applyQuaternion(
      new Quaternion(...(piece?.at.rotation ?? [0, 0, 0, 1])),
    );
    const gapsCm: number[] = [];
    const depthsCm: number[] = [];
    const bodyCm: number[] = [];
    const adductions: number[] = [];
    const forwards: number[] = [];
    for (const sample of samples) {
      const posed = poseSkeleton(player.model, player.poseAt(sample));
      const inst = posed.frames[instBone];
      const chest = posed.frames[boneIndex('chest')];
      const head = posed.frames[boneIndex('head')];
      if (!inst || !chest || !head) {
        continue;
      }
      const at = (p: Vector3): Vector3 =>
        p.clone().sub(bindHead).applyQuaternion(inst.rotation).add(inst.position);
      // The tail end is the end nearer to the head in the play.
      const [tail, scroll] =
        at(a).distanceTo(head.position) < at(b).distanceTo(head.position)
          ? [at(a), at(b)]
          : [at(b), at(a)];
      const toChest = chest.rotation.clone().invert();
      const ends = scroll.clone().sub(tail).normalize().applyQuaternion(toChest);
      endYaws.push(180 + (Math.atan2(ends.x, ends.z) * 180) / Math.PI);
      // The strings run along the neck, from the tail end to the scroll (`BowedRig.axis`).
      const strings = new Vector3(...rig.axis)
        .applyQuaternion(inst.rotation)
        .applyQuaternion(toChest);
      stringYaws.push(180 + (Math.atan2(strings.x, strings.z) * 180) / Math.PI);
      const axis = bodyLine.clone().applyQuaternion(inst.rotation).applyQuaternion(toChest);
      slopes.push((Math.asin(Math.max(-1, Math.min(1, axis.y))) * 180) / Math.PI);
      // The left upper arm in the axes of the chest: its turn from the vertical toward the middle of
      // the body in the front plane (adduction), and the move of the shoulder joint to the front.
      const shoulderAt = posed.frames[boneIndex('upperArmL')]?.position ?? new Vector3();
      const elbowAt = posed.frames[boneIndex('forearmL')]?.position ?? new Vector3();
      const upper = elbowAt.clone().sub(shoulderAt).applyQuaternion(toChest);
      adductions.push((Math.atan2(upper.x, -upper.y) * 180) / Math.PI);
      const bindShoulder = new Vector3(
        ...(player.model.skeleton.positions[boneIndex('upperArmL')] ?? [0, 0, 0]),
      );
      const chestBind = new Vector3(
        ...(player.model.skeleton.positions[boneIndex('chest')] ?? [0, 0, 0]),
      );
      const fromChest = shoulderAt.clone().sub(chest.position).applyQuaternion(toChest);
      forwards.push((bindShoulder.z - chestBind.z - fromChest.z) * 100);
      // The front of the chest is -z, and the left of the animal is -x in the player axes.
      yaws.push(180 + (Math.atan2(axis.x, axis.z) * 180) / Math.PI);

      const gaps = gapSweep(gapPairs(role).filter((pair) => pair.part.name === 'head'));
      const withHead = {
        ...role,
        parts: [...role.parts, { ...HEAD_PART, into: ['violin', 'viola'] }],
      };
      const pairs = sweepDepths(withHead, player, [sample], gaps.visit);
      gapsCm.push(Math.min(...gaps.gaps().map((g) => g.gap)) * 100);
      const inHead = pairs.filter((d) => d.part === 'head');
      depthsCm.push(Math.max(0, ...inHead.map((d) => d.depth)) * 100);
      const inBody = pairs.filter((d) => d.part === 'instrument' && d.into === 'body');
      bodyCm.push(Math.max(0, ...inBody.map((d) => d.depth)) * 100);
    }
    const [low, high] = rig.stopRange;
    const [bowLow, bowHigh] = rig.bowRange;
    console.log(
      `${want.padEnd(8)} | ${variant || 'base'} | ${samples.length} samples | left of front ${q(yaws, 0.5).toFixed(0)}° (strings ${q(stringYaws, 0.5).toFixed(0)}°, ends ${q(endYaws, 0.5).toFixed(0)}°) | slope ${q(slopes, 0.5).toFixed(0)}° | head gap p50 ${q(gapsCm, 0.5).toFixed(1)} max ${q(gapsCm, 1).toFixed(1)} cm | head depth ${q(depthsCm, 1).toFixed(1)} cm | in body ${q(bodyCm, 1).toFixed(1)} cm | upper arm in ${q(adductions, 0.5).toFixed(0)}° | shoulder forward ${q(forwards, 0.5).toFixed(1)} cm | stop ${low.toFixed(2)}..${high.toFixed(2)} | hair ${bowLow.toFixed(3)}..${bowHigh.toFixed(3)} m`,
    );
    changes.undo();
  }
}
