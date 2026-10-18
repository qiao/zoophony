/**
 * Prints the seated bind body of the dog: the joints, the front of the trunk at each height near
 * the middle, and the inner side of the legs at each height. Usage: node docs/research/2026-10-17-dog-mesh/dog-profile.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { BONE_NAMES, boneIndex } from '../../../src/models/rig.ts';

const m = buildPlayer('dog', 'cello', 4, 'chair');
const at = (b: string) => (m.skeleton.positions[boneIndex(b as never)] ?? []).map((x) => x.toFixed(3)).join(', ');
for (const b of ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'upperArmL', 'thighL', 'shinL', 'footL', 'earL', 'instrument', 'bow']) {
  console.log(`${b}: ${at(b)}`);
}
console.log(`seat ${m.seat?.seatHeight.toFixed(3)} H ${m.body.headHeight.toFixed(3)} headCenter ${m.body.headCenter.map((x) => x.toFixed(3))} floor ${m.body.floor.map((x) => x.toFixed(3))}`);
const trunk = new Set(['hips', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'shoulderR', 'jaw', 'earL', 'earR'].map((b) => boneIndex(b as never)));
const legs = new Set(['thighL', 'thighR', 'shinL', 'shinR'].map((b) => boneIndex(b as never)));
const n = m.mesh.bones.length;
for (let y = 0.15; y <= 1.35; y += 0.05) {
  let front = Infinity;
  let back = -Infinity;
  let innerL = Infinity;
  let innerZ = 0;
  let legFront = Infinity;
  for (let c = 0; c < n; c++) {
    const py = m.mesh.positions[c * 3 + 1] ?? 0;
    if (Math.abs(py - y) > 0.025) continue;
    const px = m.mesh.positions[c * 3] ?? 0;
    const pz = m.mesh.positions[c * 3 + 2] ?? 0;
    const bone = m.mesh.bones[c] ?? -1;
    if (trunk.has(bone) && Math.abs(px) < 0.1) {
      front = Math.min(front, pz);
      back = Math.max(back, pz);
    }
    if (legs.has(bone) && px > 0) {
      if (px < innerL) {
        innerL = px;
        innerZ = pz;
      }
      legFront = Math.min(legFront, pz);
    }
  }
  console.log(`y ${y.toFixed(2)}: trunk front z ${front.toFixed(3)} back ${back.toFixed(3)} | right leg inner x ${innerL.toFixed(3)} at z ${innerZ.toFixed(3)}, leg front z ${legFront.toFixed(3)}`);
}
console.log(BONE_NAMES.length);
