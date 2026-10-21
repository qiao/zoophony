// Measures the depth of each body part of the harp deer into each piece of its stool (the seat
// slab and the 4 legs, `buildStool()` of `models/props.ts`) over all samples of the harpist sweep,
// in the axes of the player model. Prints the largest depth and the share of samples with a depth
// above 0 and above 5 mm, by part and piece.
import { Box3, Vector3 } from 'three';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import { HARPIST_SWEEP } from '../../../../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../../src/pose/test-skin.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import { CHAIR, CHAIR_LEG, STOOL } from '../../../../src/models/props.ts';
const PARTS: Record<string, string[]> = {
  haunch: ['hips', 'spine'], thighs: ['thighL', 'thighR'], shins: ['shinL', 'shinR'],
  feet: ['footL', 'footR'], tail: ['tail1', 'tail2'], paws: ['handL', 'handR', 'fingersL', 'fingersR'],
  arms: ['forearmL', 'forearmR', 'upperArmL', 'upperArmR'],
};
const step = Number(process.argv[2] ?? 1);
for (const demo of await probeDemos()) {
  const scene = sceneOf(demo.bytes);
  if (!HARPIST_SWEEP.hasRole(scene.score)) continue;
  for (const player of HARPIST_SWEEP.players(scene)) {
    const m = player.model;
    const seat = m.seat!;
    const w = seat.seatWidth ?? STOOL.seatSize;
    const d = seat.seatDepth ?? STOOL.seatSize;
    const zc = seat.seatDepth === undefined ? 0 : (CHAIR.seatDepth - d) / 2;
    const pieces: Record<string, Box3> = {
      seat: new Box3(new Vector3(-w / 2, seat.seatHeight - 0.04, zc - d / 2), new Vector3(w / 2, seat.seatHeight, zc + d / 2)),
    };
    const ax = w / 2 - CHAIR_LEG / 2, az = d / 2 - CHAIR_LEG / 2;
    for (const [n, x, z] of [['leg front L', -ax, zc - az], ['leg front R', ax, zc - az], ['leg back L', -ax, zc + az], ['leg back R', ax, zc + az]] as const) {
      pieces[n] = new Box3(new Vector3(x - CHAIR_LEG / 2, 0, z - CHAIR_LEG / 2), new Vector3(x + CHAIR_LEG / 2, seat.seatHeight - 0.04, z + CHAIR_LEG / 2));
    }
    console.log(`${demo.file} ${player.name}: seat ${seat.seatHeight.toFixed(3)} m, width ${w} m, depth ${d} m (the player faces -z, the seat from z ${(zc - d / 2).toFixed(3)} to ${(zc + d / 2).toFixed(3)})`);
    const corners: Record<string, number[]> = {};
    for (const [part, bones] of Object.entries(PARTS)) {
      const set = new Set(bones.map((b) => boneIndex(b as never)));
      corners[part] = [];
      for (let c = 0; c < m.mesh.bones.length; c++) if (set.has(m.mesh.bones[c] ?? -1)) corners[part]!.push(c);
    }
    const stats = new Map<string, { worst: number; n: number; any: number; over: number; at: string; point: Vector3 }>();
    const v = new Vector3();
    for (const set of HARPIST_SWEEP.sampleSets(scene)) {
      let k = 0;
      for (const s of set.samples) {
        if (k++ % step) continue;
        const posed = poseSkeleton(m, player.poseAt(s));
        for (const [part, cs] of Object.entries(corners)) {
          const depth: Record<string, number> = {};
          const where: Record<string, Vector3> = {};
          for (const c of cs) {
            v.fromArray(posedCorner(posed, c));
            for (const [name, b] of Object.entries(pieces)) {
              if (!b.containsPoint(v)) continue;
              const dd = Math.min(v.x - b.min.x, b.max.x - v.x, v.y - b.min.y, b.max.y - v.y, v.z - b.min.z, b.max.z - v.z);
              if (dd > (depth[name] ?? 0)) { depth[name] = dd; where[name] = v.clone(); }
            }
          }
          for (const name of Object.keys(pieces)) {
            const key = `${part} | ${name} | ${set.name}`;
            const st = stats.get(key) ?? { worst: 0, n: 0, any: 0, over: 0, at: '', point: new Vector3() };
            st.n++;
            const dd = depth[name] ?? 0;
            if (dd > 0) st.any++;
            if (dd > 0.005) st.over++;
            if (dd > st.worst) { st.worst = dd; st.at = `${s[0].toFixed(2)} s`; st.point = where[name]!; }
            stats.set(key, st);
          }
        }
      }
    }
    console.log('| Part | Stool piece | Set | Largest depth cm | Samples with depth | Over 5 mm | Worst sample | Point (x, y, z) m |');
    console.log('|---|---|---|---|---|---|---|---|');
    for (const [key, st] of stats) {
      if (st.any === 0) continue;
      console.log(`| ${key} | ${(st.worst * 100).toFixed(1)} | ${((100 * st.any) / st.n).toFixed(1)}% | ${((100 * st.over) / st.n).toFixed(1)}% | ${st.at} | ${st.point.toArray().map((x) => x.toFixed(3)).join(', ')} |`);
    }
  }
}
