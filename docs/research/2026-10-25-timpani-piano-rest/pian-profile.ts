// Prints the side profile of the posed rest skin of the pianist at x = +-0.2 m: the top of the lap
// bones and of the trunk under each z, and the shoulder joint and the reach of the arm.
import { Ray, Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env.SET) setHolds(process.env.SET);
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { armRig } from '../../../src/pose/ik.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { posedPart } from '../../../src/pose/test-clearance.ts';
import { posedAt } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, firstPlayers, sceneOf } from '../../../src/pose/test-scene.ts';

const demo = (await patchedDemos()).find((d) => d.file.startsWith('bach-bwv1047'));
if (!demo) throw new Error('no demo');
const scene = sceneOf(demo.bytes);
const [piano] = firstPlayers(scene, ['piano'] as const);
if (!piano) throw new Error('no piano');
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const posed = posedAt(scene, piano, start, 10, NOT_STARTED);
const parts = {
  thigh: posedPart(posed, ['thighR', 'shinR']),
  trunk: posedPart(posed, ['hips', 'spine', 'chest']),
};
const x = Number(process.argv[2] ?? 0.2);
const p = (bone: Parameters<typeof boneIndex>[0]): Vector3 =>
  posed.frames[boneIndex(bone)]?.position ?? new Vector3();
const t3 = (v: Vector3): string => v.toArray().map((n) => n.toFixed(3)).join(',');
const sh = p('upperArmR');
const arm = armRig(piano.model, 'R');
console.log(`shoulder R ${t3(sh)}, reach ${arm.reach.toFixed(3)}, hips ${t3(p('hips'))}, thigh R ${t3(p('thighR'))}, knee ${t3(p('shinR'))}`);
for (let z = 0.1; z >= -0.6; z -= 0.05) {
  const cells: string[] = [];
  for (const [name, part] of Object.entries(parts)) {
    const ray = new Ray(new Vector3(x, 3, z), new Vector3(0, -1, 0));
    const ys: number[] = [];
    const hit = new Vector3();
    for (const t of part.triangles) if (ray.intersectTriangle(t.a, t.b, t.c, false, hit)) ys.push(hit.y);
    ys.sort((a, b) => b - a);
    cells.push(`${name} ${ys.map((y) => y.toFixed(2)).join('/') || '-'}`);
  }
  const d = new Vector3(x, 0.45, z).distanceTo(sh);
  console.log(`z ${z.toFixed(2)}: ${cells.join('; ')}; shoulder to (y 0.45) ${d.toFixed(2)}`);
}
