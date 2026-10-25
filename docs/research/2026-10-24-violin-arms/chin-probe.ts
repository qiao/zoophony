/**
 * Prints the hold of the instrument under the chin in the play of the rabbit, the cat, and the red
 * fox, at each n-th play sample of one demo: the slope of the axis from the tail end to the scroll
 * (degrees above the level), its turn to the left of the front of the chest, the gap from the head
 * mesh to the instrument (cm, 0 when they touch), and the depth of the head in the instrument.
 *
 * Usage: node docs/research/2026-10-24-violin-arms/chin-probe.ts [--set <changes>] [--every <n>]
 */
import { Quaternion, Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { HEAD_PART, gapPairs, gapSweep, sweepDepths } from '../../../src/pose/test-sweep.ts';
import type { SweepSample } from '../../../src/pose/test-sweep.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const args = process.argv.slice(2);
const pick = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const changes = pick('--set');
if (changes) {
  setHolds(changes);
}
const every = Number(pick('--every') ?? '40');

const cases: [SpeciesId, 'violinist' | 'violist', string][] = [
  ['rabbit', 'violinist', 'beethoven-8'],
  ['cat', 'violist', 'mozart-k525'],
  ['fox-red', 'violinist', 'beethoven-8'],
];
const q = (values: number[], share: number): number => {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(share * (s.length - 1)))] ?? Number.NaN;
};
for (const [want, roleName, demo] of cases) {
  const role = SWEEP_ROLES[roleName];
  const scene = sceneOf((await patchedDemo(`${demo}.mid`)).bytes);
  const player = role.players(scene).find((p) => {
    const index = Number(/(\d+)/.exec(p.name)?.[1] ?? -1);
    return scene.layout.players[index]?.cast.species === want && !p.name.includes('soloist');
  });
  if (!player) {
    console.log(`no ${want}`);
    continue;
  }
  const play = role.sampleSets(scene).find((set) => set.name === 'play');
  const samples: SweepSample[] = [...(play?.samples ?? [])].filter((_, i) => i % every === 0);
  const slopes: number[] = [];
  const yaws: number[] = [];
  // The bind ends of the instrument: the vertices of the instrument bone farthest apart along the
  // longest extent of the bind instrument.
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
  let a = pts[0]!;
  let b = pts[0]!;
  let far = 0;
  for (const p of pts) {
    for (const r of [pts[0]!, pts[Math.floor(pts.length / 2)]!]) {
      const d = p.distanceTo(r);
      if (d > far) {
        far = d;
        a = r;
        b = p;
      }
    }
  }
  for (const p of pts) {
    if (p.distanceTo(a) > a.distanceTo(b)) b = p;
  }
  for (const p of pts) {
    if (p.distanceTo(b) > b.distanceTo(a)) a = p;
  }
  // The lower end in the bind (the tail end of an instrument that stands) is a.
  if (a.y > b.y) [a, b] = [b, a];
  const bindHead = new Vector3(...(player.model.skeleton.positions[instBone] ?? [0, 0, 0]));
  for (const sample of samples) {
    const posed = poseSkeleton(player.model, player.poseAt(sample));
    const inst = posed.frames[instBone]!;
    const chest = posed.frames[boneIndex('chest')]!;
    const at = (p: Vector3): Vector3 =>
      p.clone().sub(bindHead).applyQuaternion(inst.rotation).add(inst.position);
    // The tail end is the end nearer to the head in the play.
    const head = posed.frames[boneIndex('head')]!.position;
    const [tail, scroll] =
      at(a).distanceTo(head) < at(b).distanceTo(head) ? [at(a), at(b)] : [at(b), at(a)];
    if (slopes.length === 0) {
      const root = posed.frames[boneIndex('root')]!.position;
      const f = (v: Vector3): string =>
        v
          .clone()
          .sub(root)
          .toArray()
          .map((x) => x.toFixed(3))
          .join(', ');
      console.log(
        `${want} tail (${f(tail)}) scroll (${f(scroll)}) head (${f(head)}) length ${tail.distanceTo(scroll).toFixed(3)} m`,
      );
    }
    const axis = scroll
      .clone()
      .sub(tail)
      .normalize()
      .applyQuaternion(chest.rotation.clone().invert());
    slopes.push((Math.asin(Math.max(-1, Math.min(1, axis.y))) * 180) / Math.PI);
    // The front of the chest is -z, and the left of the animal is -x in the player axes.
    yaws.push((Math.atan2(axis.x, axis.z) * 180) / Math.PI);
  }
  const gapsCm: number[] = [];
  const depthsCm: number[] = [];
  const bodyCm: number[] = [];
  for (const sample of samples) {
    const gaps = gapSweep(gapPairs(role).filter((pair) => pair.part.name === 'head'));
    const withHead = {
      ...role,
      parts: [...role.parts, { ...HEAD_PART, into: ['violin', 'viola'] }],
    };
    const pairs = sweepDepths(withHead, player, [sample], gaps.visit);
    gapsCm.push(Math.min(...gaps.gaps().map((g) => g.gap)) * 100);
    const head = pairs.filter((d) => d.part === 'head');
    depthsCm.push(Math.max(0, ...head.map((d) => d.depth)) * 100);
    const inst = pairs.filter((d) => d.part === 'instrument' && d.into === 'body');
    bodyCm.push(Math.max(0, ...inst.map((d) => d.depth)) * 100);
  }
  console.log(
    `${want.padEnd(8)} ${samples.length} samples | slope ${q(slopes, 0.5).toFixed(0)}° (${q(slopes, 0.05).toFixed(0)}..${q(slopes, 0.95).toFixed(0)}) | left of front ${(180 + q(yaws, 0.5)).toFixed(0)}° | head gap p50 ${q(gapsCm, 0.5).toFixed(1)} max ${q(gapsCm, 1).toFixed(1)} cm | head depth max ${q(depthsCm, 1).toFixed(1)} cm | instrument in body max ${q(bodyCm, 1).toFixed(1)} cm`,
  );
}
