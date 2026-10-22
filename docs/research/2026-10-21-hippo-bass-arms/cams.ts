// Prints cameras in JSON around a joint of the first hippo bassist at a song time: the front, the
// back, the left, and the right of the hippo, for `pnpm close-views play --camera`.
// Usage: node docs/research/2026-10-21-hippo-bass-arms/cams.ts <demo> <song> <joint> [--distance <m>] [--set <changes>] [--lift <s>]
import { Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { poseSkeleton, posedPoint } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { BASSIST_SWEEP, playSample } from '../../../src/pose/test-sweep-roles.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] ?? d) : d; };
const [demoId, songText, joint] = args as [string, string, BoneName];
const set = opt('--set', '');
if (set) setHolds(set);
const distance = Number(opt('--distance', '0.7'));
const demo = (await patchedDemos()).find((d) => d.file.startsWith(demoId))!;
const scene = sceneOf(demo.bytes);
const [player] = BASSIST_SWEEP.players(scene);
const index = Number(player!.name.match(/\d+/)?.[0]);
const place = scene.layout.players[index]!;
const posed = poseSkeleton(player!.model, player!.poseAt(playSample(scene, Number(songText))));
const p = new Vector3(...posedPoint(posed, joint, player!.model.skeleton.positions[boneIndex(joint)] as [number, number, number]));
const world = (v: Vector3): Vector3 => {
  const c = Math.cos(place.facing), s = Math.sin(place.facing);
  return new Vector3(v.x * c + v.z * s + place.position[0], v.y + place.position[1], -v.x * s + v.z * c + place.position[2]);
};
const target = world(p);
for (const [name, dir] of [['front', [0, 0, -1]], ['back', [0, 0, 1]], ['left', [-1, 0, 0]], ['right', [1, 0, 0]]] as const) {
  const eye = world(p.clone().add(new Vector3(dir[0] * distance, Number(opt("--lift", "0.1")), dir[2] * distance)));
  const r = (v: Vector3): number[] => v.toArray().map((x) => Math.round(x * 1000) / 1000);
  console.log(`${name} ${JSON.stringify({ position: r(eye), target: r(target), fov: Number(opt("--fov", "35")) })}`);
}
