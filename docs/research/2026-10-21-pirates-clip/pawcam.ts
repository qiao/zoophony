// Cameras at the paws of a player: node docs/research/2026-10-21-pirates-clip/pawcam.ts <midi> <player> <t> <az,...> <el> <dist>
import { readFile } from 'node:fs/promises';
import { Matrix4, Vector3 } from 'three';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedPart } from '../../../src/pose/test-clearance.ts';
const [file = '', who = '1', tt = '7', az = '0', el = '60', dist = '1.2', name = 'paws'] = process.argv.slice(2);
const s = sceneOf(new Uint8Array(await readFile(file)));
const index = Number(who);
const pl = s.layout.players[index]!;
const model = s.models.get(pl.cast.species, pl.cast.instrument, pl.cast.kettles, pl.cast.support);
const t = Number(tt);
const pose = poseAt(s.plan, t, 10 + t, PLAYING, allAudible(s.score), createScenePose(s.plan)).players[index]!;
const posed = poseSkeleton(model, pose);
const part = posedPart(posed, ['handL', 'fingersL', 'handR', 'fingersR']);
const mid = part.box.getCenter(new Vector3()).applyMatrix4(new Matrix4().makeRotationY(pl.facing).setPosition(...pl.position));
const out = az.split(',').map(Number).map((a) => {
  const azr = (a * Math.PI) / 180 - pl.facing, e = (Number(el) * Math.PI) / 180, d = Number(dist);
  const flat = d * Math.cos(e);
  const position = [mid.x + flat * Math.sin(azr), mid.y + d * Math.sin(e), mid.z - flat * Math.cos(azr)];
  return { name: `${name}-a${a}-e${el}`, pose: { position, target: mid.toArray(), fov: 30, beam: 1, close: false, light: 0, spot: 0 } };
});
console.log(JSON.stringify(out));
