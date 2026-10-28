/**
 * Writes cameras for `pnpm close-views play --camera-file` that look at each wrist of the polar
 * bear pianist at one song time of a demo, from several directions.
 *
 * Each camera looks at the posed wrist joint (the head of the hand bone) from `--dist` m, with a
 * field of 30 degrees. The directions are in the axes of the bear: +x its right side, -z its
 * front, y up. A direction is `<azimuth>,<elevation>` in degrees: azimuth 0 looks from the front of
 * the bear, 90 from its right side. `--rest` takes the rest pose (the pose before the start).
 *
 * Usage: node scratch/wristcam.ts <demo file> <song s> [--rest] [--dist <m>] [--dirs <az,el;...>]
 *   [--sides L,R]
 */
import { Matrix4, Vector3 } from 'three';

import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets } from '../src/models/studio-rig.ts';
import { countInAt } from '../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { NOT_STARTED, PLAYING, allAudible, demoSceneOf } from '../src/pose/test-scene.ts';
import { roleBodies } from '../tools/fold-probe.ts';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string =>
  args.includes(name) ? args[args.indexOf(name) + 1]! : fallback;
const demo = args[0]!;
const song = Number(args[1]);
const rest = args.includes('--rest');
const dist = Number(opt('--dist', '0.45'));
const dirs = opt('--dirs', '0,60;90,60;180,60;-90,60;0,20;90,20;180,20;-90,20;45,40;-45,40;135,40;-135,40;0,85')
  .split(';')
  .map((d) => d.split(',').map(Number) as [number, number]);
const sides = opt('--sides', 'L,R').split(',');

const scene = await demoSceneOf(demo);
const [body] = roleBodies({ kind: 'player', instrument: 'piano', species: ['polar-bear'] }, scene);
if (!body || body.index === null) throw new Error('no pianist');
const place = scene.layout.players[body.index]!;
const audible = allAudible(scene.score);
const buffer = createScenePose(scene.plan);
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const frame = rest
  ? poseAt(scene.plan, start, 10, NOT_STARTED, audible, buffer)
  : poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer);
const pose = frame.players[body.index]!;
const rig = body.model.studio!;
const studio = poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
const heads = rig.body.heads as unknown as Record<string, readonly [number, number, number]>;
const m4 = new Matrix4();
const joint = (bone: string): Vector3 => {
  m4.fromArray(studio.matrices, STUDIO_BONES.indexOf(bone as never) * 16);
  return new Vector3(...heads[bone]!).applyMatrix4(m4);
};
const [px, , pz] = place.position;
const f = place.facing;
const c = Math.cos(f);
const s = Math.sin(f);
const world = (m: Vector3): number[] => [px + m.x * c + m.z * s, m.y + (place.position[1] ?? 0), pz - m.x * s + m.z * c];
const cams: Record<string, unknown> = {};
for (const side of sides) {
  const w = joint(`hand_${side}`);
  for (const [az, el] of dirs) {
    const a = (az * Math.PI) / 180;
    const e = (el * Math.PI) / 180;
    // Azimuth 0 looks from the front (-z), 90 from the right side (+x).
    const off = new Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)).multiplyScalar(dist);
    cams[`${side}-az${az}-e${el}`] = { position: world(w.clone().add(off)), target: world(w), fov: 30 };
  }
}
console.log(JSON.stringify(cams, null, 1));
console.error(`player ${body.index}, place ${JSON.stringify(place.position)}, facing ${f.toFixed(3)}, wrists L ${joint('hand_L').toArray().map((x) => x.toFixed(3))} R ${joint('hand_R').toArray().map((x) => x.toFixed(3))}`);
