// Writes a camera file for `close-views play`: two cameras below the chin of the seated cat of a
// demo at a song time, one in front and one at the left, both looking up at the chin.
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf, allAudible, PLAYING } from '../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import { posedCorner } from '../src/pose/test-skin.ts';
import { boneIndex } from '../src/models/rig.ts';
const [demoName, time, out] = process.argv.slice(2);
const demo = (await probeDemos()).find((d) => d.file.startsWith(demoName!))!;
const scene = sceneOf(demo.bytes);
const index = scene.layout.players.findIndex((p) => p.cast.species === 'cat' && p.cast.support === 'chair');
const place = scene.layout.players[index]!;
const model = scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
const song = Number(time);
const pose = poseAt(scene.plan, song, 10 + song, PLAYING, allAudible(scene.score), createScenePose(scene.plan)).players[index]!;
const posed = poseSkeleton(model, pose);
const head = boneIndex('head');
const pts: Vector3[] = [];
for (let c = 0; c < model.mesh.bones.length; c++) if (model.mesh.bones[c] === head) pts.push(new Vector3(...posedCorner(posed, c)));
const hp = posed.frames[head]!.position;
const mid = pts.filter((p) => Math.abs(p.x - hp.x) < 0.03);
const nose = mid.reduce((a, b) => (Math.hypot(b.x - hp.x, b.z - hp.z) > Math.hypot(a.x - hp.x, a.z - hp.z) ? b : a));
const fwd = new Vector3(nose.x - hp.x, 0, nose.z - hp.z).normalize().multiplyScalar(Number(process.env.FLIP ?? "1"));
const chin = mid.filter((p) => p.clone().sub(hp).dot(fwd) > 0.03).reduce((a, b) => (b.y < a.y ? b : a));
const left = new Vector3(0, 1, 0).cross(fwd).normalize();
const world = (p: Vector3): number[] => {
  const cos = Math.cos(place.facing), sin = Math.sin(place.facing);
  return [place.position[0] + p.x * cos + p.z * sin, place.position[1] + p.y, place.position[2] - p.x * sin + p.z * cos].map((v) => Number(v.toFixed(4)));
};
const target = chin.clone().addScaledVector(fwd, -0.03);
const cams = {
  'jaw-below-front': { position: world(target.clone().addScaledVector(fwd, 0.35).add(new Vector3(0, -0.3, 0))), target: world(target), fov: 30 },
  'jaw-below-left': { position: world(target.clone().addScaledVector(left, 0.35).add(new Vector3(0, -0.3, 0))), target: world(target), fov: 30 },
};
writeFileSync(out!, JSON.stringify(cams, null, 2));
console.log(JSON.stringify(cams));
