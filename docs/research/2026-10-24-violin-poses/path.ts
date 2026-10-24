/**
 * Prints the path of the lift (or the lowering) of the violin roles: at each sample, the axis and
 * the top of the instrument in the root axes, the tail end, the wrists, and the elbow angles, in
 * head heights from the root.
 *
 * Usage: node docs/research/2026-10-24-violin-poses/path.ts [rabbit|cat|fox-red ...] [--lower] [--set <changes>]...
 */
import { Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import type { TestScene } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const args = process.argv.slice(2);
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const changes = pick('--set');
if (changes.length > 0) {
  setHolds(changes.join(';'));
}
const lower = args.includes('--lower');
const summary = args.includes('--summary');
const wanted = args.filter(
  (a, i) => !a.startsWith('--') && args[i - 1] !== '--set',
) as SpeciesId[];
const species = wanted.length > 0 ? wanted : (['rabbit', 'cat', 'fox-red'] as SpeciesId[]);

const scenes: Record<string, TestScene> = {
  violinist: sceneOf((await patchedDemo('beethoven-8.mid')).bytes),
  violist: sceneOf((await patchedDemo('mozart-k525.mid')).bytes),
};
const f = (v: Vector3, d = 2): string =>
  v
    .toArray()
    .map((x) => x.toFixed(d).padStart(d + 4))
    .join('');
const angle = (a: Vector3, b: Vector3): number =>
  (Math.acos(Math.max(-1, Math.min(1, a.dot(b) / a.length() / b.length()))) * 180) / Math.PI;

for (const want of species) {
  const role = want === 'cat' ? 'violist' : 'violinist';
  const scene = scenes[role]!;
  const sweep = SWEEP_ROLES[role];
  const player = sweep.players(scene).find((p) => {
    const index = Number(/(\d+)/.exec(p.name)?.[1] ?? -1);
    return scene.layout.players[index]?.cast.species === want && !p.name.includes('soloist');
  });
  if (!player) {
    console.log(`no ${want}`);
    continue;
  }
  const model = player.model;
  const instrument = role === 'violist' ? 'viola' : 'violin';
  const rig = bowedRig(model, instrument, holdOf(want, instrument));
  const h = model.body.headHeight;
  const root = new Vector3(...model.skeleton.positions[boneIndex('root')]!);
  const sets = sweep.sampleSets(scene);
  const set = sets.find((s) => s.name === (lower ? 'lower' : 'lift'))!;
  const rest = sets.find((s) => s.name === 'rest')!;
  const samples = [...rest.samples, ...set.samples];
  console.log(`\n== ${want} H=${h.toFixed(4)} ${lower ? 'lower' : 'lift'}`);
  console.log(
    ' wall   axis(root)          top(root)           tail(H)              wristL(H)            wristR(H)          elbL elbR  upL upR',
  );
  let k = 0;
  let maxL = 0;
  let maxR = 0;
  let minL = 180;
  let maxUpL = 0;
  let maxWristY = -9;
  let restElbows = [0, 0, 0, 0];
  let restWrist = '';
  for (const sample of samples) {
    if (k++ > 0 && (lower ? sample[1] < 10 || k % 2 === 0 : sample[1] > 11.6)) {
      continue;
    }
    const posed = poseSkeleton(model, player.poseAt(sample));
    const fr = (b: Parameters<typeof boneIndex>[0]): Vector3 =>
      posed.frames[boneIndex(b)]!.position.clone();
    const inst = posed.frames[boneIndex('instrument')]!;
    const axis = new Vector3(...rig.axis).applyQuaternion(inst.rotation);
    const top = new Vector3(...rig.top).applyQuaternion(inst.rotation);
    const rel = (v: Vector3): Vector3 => v.sub(root).divideScalar(h);
    const elbow = (side: 'L' | 'R'): number =>
      angle(
        fr(`upperArm${side}`).sub(fr(`forearm${side}`)),
        fr(`hand${side}`).sub(fr(`forearm${side}`)),
      );
    const upper = (side: 'L' | 'R'): number =>
      angle(fr(`forearm${side}`).sub(fr(`upperArm${side}`)), new Vector3(0, -1, 0));
    if (k === 1) {
      restElbows = [elbow('L'), elbow('R'), upper('L'), upper('R')];
      restWrist = f(rel(fr('handL')));
    }
    if (sample[1] > 10.25 && sample[1] < 10.95) {
      maxL = Math.max(maxL, elbow('L'));
      maxR = Math.max(maxR, elbow('R'));
      minL = Math.min(minL, elbow('L'));
      maxUpL = Math.max(maxUpL, upper('L'));
      maxWristY = Math.max(maxWristY, rel(fr('handL')).y);
    }
    if (summary) {
      continue;
    }
    console.log(
      `${sample[1].toFixed(2).padStart(5)} ${f(axis)} ${f(top)} ${f(rel(inst.position.clone()))} ${f(rel(fr('handL')))} ${f(rel(fr('handR')))}  ${elbow('L').toFixed(0).padStart(4)} ${elbow('R').toFixed(0).padStart(4)} ${upper('L').toFixed(0).padStart(4)} ${upper('R').toFixed(0).padStart(4)}`,
    );
  }
  console.log(
    `rest elbows: L ${restElbows[0].toFixed(0)} R ${restElbows[1].toFixed(0)} | upper L ${restElbows[2].toFixed(0)} R ${restElbows[3].toFixed(0)} | wrist L ${restWrist}`,
  );
  console.log(
    `move elbows: L ${minL.toFixed(0)}..${maxL.toFixed(0)} R max ${maxR.toFixed(0)} | upper L max ${maxUpL.toFixed(0)} | wrist L top ${maxWristY.toFixed(2)} H`,
  );
}
