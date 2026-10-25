/**
 * Measures the bow at the tip in the play of the rabbit, the cat, and the red fox: in the play
 * samples where the right paw is farthest from the strings (the top 10%), the slope of the bow
 * from the frog up to the tip (degrees), its slope in the front view of the gallery (the view
 * along the front axis of the player), the angle between the bow and the strings, the turn of the
 * violin axis to the left of the front, the roll of the across line of the body, and the angle of
 * the bow out of the plane of the top plate (the turn of the string plane of the string).
 *
 * Usage: node docs/research/2026-10-24-violin-arms/bow-tip.ts [--set <changes>]
 */
import { Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { bowPoints } from '../../../tools/lap-rest.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--set');
if (at >= 0) {
  setHolds(args[at + 1]!);
}
const cases: [SpeciesId, 'violinist' | 'violist', string][] = [
  ['rabbit', 'violinist', 'beethoven-8'],
  ['cat', 'violist', 'mozart-k525'],
  ['fox-red', 'violinist', 'beethoven-8'],
];
const deg = (r: number): number => (r * 180) / Math.PI;
const q = (values: number[], share: number): number => {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(share * (s.length - 1)))] ?? Number.NaN;
};
/** The two points of a set that are farthest apart, by two passes from a start point. */
const ends = (pts: Vector3[]): [Vector3, Vector3] => {
  let a = pts[0]!;
  let b = a;
  for (const p of pts) if (p.distanceTo(a) > b.distanceTo(a)) b = p;
  for (const p of pts) if (p.distanceTo(b) > a.distanceTo(b)) a = p;
  return [a, b];
};
for (const [want, roleName, demo] of cases) {
  const role = SWEEP_ROLES[roleName];
  const scene = sceneOf((await patchedDemo(`${demo}.mid`)).bytes);
  const player = role.players(scene).find((p) => {
    const index = Number(/(\d+)/.exec(p.name)?.[1] ?? -1);
    return scene.layout.players[index]?.cast.species === want && !p.name.includes('soloist');
  });
  if (!player) continue;
  const play = role.sampleSets(scene).find((set) => set.name === 'play');
  const samples = [...(play?.samples ?? [])].filter((_, i) => i % 4 === 0);
  const mesh = player.model.mesh;
  const instBone = boneIndex('instrument');
  const bind: Vector3[] = [];
  for (let c = 0; c < mesh.bones.length; c++) {
    if (mesh.bones[c] === instBone) {
      bind.push(
        new Vector3(
          mesh.positions[c * 3] ?? 0,
          mesh.positions[c * 3 + 1] ?? 0,
          mesh.positions[c * 3 + 2] ?? 0,
        ),
      );
    }
  }
  const [ia, ib] = ends(bind);
  // The width of the body: the farthest pair of the points with the axis part taken out.
  const bindAxis = ib.clone().sub(ia).normalize();
  const flat = bind.map((v) => v.clone().sub(bindAxis.clone().multiplyScalar(v.dot(bindAxis))));
  const [wa, wb] = ends(flat);
  const bindWidth = wb.clone().sub(wa).normalize();
  const bindHead = new Vector3(...(player.model.skeleton.positions[instBone] ?? [0, 0, 0]));
  const rows: {
    far: number;
    slope: number;
    front: number;
    cross: number;
    yaw: number;
    roll: number;
    plate: number;
  }[] = [];
  for (const sample of samples) {
    const posed = poseSkeleton(player.model, player.poseAt(sample));
    const inst = posed.frames[instBone]!;
    const place = (p: Vector3): Vector3 =>
      p.clone().sub(bindHead).applyQuaternion(inst.rotation).add(inst.position);
    const strings = place(ib).sub(place(ia)).normalize();
    const [ba, bb] = ends(bowPoints(posed));
    const paw = posed.frames[boneIndex('handR')]!.position;
    // The frog end is the end nearer to the right paw.
    const [frog, tip] = ba.distanceTo(paw) < bb.distanceTo(paw) ? [ba, bb] : [bb, ba];
    const bow = tip.clone().sub(frog).normalize();
    // The front of the player is -z of the root frame.
    const root = posed.frames[boneIndex('root')]!.rotation;
    const local = bow.clone().applyQuaternion(root.clone().invert());
    const axis = strings.clone().applyQuaternion(root.clone().invert());
    if (axis.x > 0) axis.negate();
    // The distance from the paw to the middle of the violin axis, as the place along the bow.
    const mid = place(ia).add(place(ib)).multiplyScalar(0.5);
    const across = bindWidth
      .clone()
      .applyQuaternion(inst.rotation)
      .applyQuaternion(root.clone().invert());
    const normal = new Vector3().crossVectors(axis, across).normalize();
    const plate = deg(Math.asin(Math.min(1, Math.abs(local.dot(normal)))));
    rows.push({
      roll: deg(Math.asin(Math.min(1, Math.abs(across.y)))),
      plate,
      far: paw.distanceTo(mid),
      slope: deg(Math.asin(Math.max(-1, Math.min(1, local.y)))),
      front: deg(Math.atan2(local.y, Math.abs(local.x))),
      cross: deg(Math.acos(Math.abs(bow.dot(strings)))),
      yaw: deg(Math.atan2(-axis.x, -axis.z)),
    });
  }
  rows.sort((a, b) => b.far - a.far);
  const top = rows.slice(0, Math.max(1, Math.floor(rows.length / 10)));
  const col = (k: keyof (typeof rows)[number]): number[] => top.map((r) => r[k]);
  console.log(
    `${want.padEnd(8)} tip samples ${top.length} | bow slope p50 ${q(col('slope'), 0.5).toFixed(0)}° (${q(col('slope'), 0.1).toFixed(0)}..${q(col('slope'), 0.9).toFixed(0)}) | front view ${q(col('front'), 0.5).toFixed(0)}° | bow to strings ${q(col('cross'), 0.5).toFixed(0)}° | violin ${q(col('yaw'), 0.5).toFixed(0)}° left | top plate roll ${q(col('roll'), 0.5).toFixed(0)}° | bow out of the top plate ${q(col('plate'), 0.5).toFixed(0)}° (${q(col('plate'), 0.1).toFixed(0)}..${q(col('plate'), 0.9).toFixed(0)})`,
  );
}
