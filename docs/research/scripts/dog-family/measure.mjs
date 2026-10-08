// Prints the heights of the bodies of the dog family on a chair of 0.35 m, in H and in Hv.
// Run it from the root of the repository:
//   node docs/research/scripts/dog-family/measure.mjs [species...]
// Hv here is the crown minus the lowest head corner near the middle plane. The report uses
// 0.92 H for the dog family.
import { buildBiped } from '../../../../src/models/biped.ts';
import { seated } from '../../../../src/models/body-frame.ts';
import { MeshBuilder } from '../../../../src/models/mesh.ts';
import { BONE_NAMES } from '../../../../src/models/rig.ts';
import { SPECIES } from '../../../../src/models/species.ts';

const ids = (process.argv.slice(2).length ? process.argv.slice(2) : ['wolf', 'dog', 'cat', 'fox-red']);
for (const id of ids) {
  const b = new MeshBuilder();
  const body = buildBiped(b, SPECIES[id], seated(0.35));
  const mesh = b.build();
  const h = body.headHeight;
  const head = BONE_NAMES.indexOf('head');
  const jaw = BONE_NAMES.indexOf('jaw');
  const ear = [BONE_NAMES.indexOf('earL'), BONE_NAMES.indexOf('earR')];
  let crown = -1;
  let chin = 9;
  let earTop = -1;
  let minX = 9;
  let maxX = -9;
  let minZ = 9;
  let maxZ = -9;
  let backZ = -9;
  const hc = body.headCenter;
  for (let i = 0; i < mesh.bones.length; i++) {
    const x = mesh.positions[3 * i] ?? 0;
    const y = mesh.positions[3 * i + 1] ?? 0;
    const z = mesh.positions[3 * i + 2] ?? 0;
    const bone = mesh.bones[i] ?? 0;
    if (bone === head || bone === jaw) {
      if (y > crown && Math.abs(y - hc[1]) < 0.8 * h) crown = Math.max(crown, y);
      if (Math.abs(x) < 0.2 * h) chin = Math.min(chin, y);
      if (Math.abs(y - hc[1]) < 0.4 * h) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
    }
    if (ear.includes(bone)) earTop = Math.max(earTop, y);
    backZ = Math.max(backZ, z);
  }
  const hv = crown - chin;
  const seat = 0.35;
  const p = body.positions;
  const sh = p.upperArmR;
  const fmt = (v) => v.toFixed(3);
  console.log(
    `${id}: H ${fmt(h)} m, Hv ${fmt(hv)} m (${fmt(hv / h)} H), crown ${fmt(crown)} m floor, ` +
      `crown/seat ${fmt((crown - seat) / hv)} Hv (${fmt((crown - seat) / h)} H), chin ${fmt((chin - seat) / hv)} Hv, ` +
      `shoulder ${fmt((sh[1] - seat) / hv)} Hv (${fmt((sh[1] - seat) / h)} H), shoulder x ${fmt(sh[0] / h)} H, ` +
      `head center ${fmt((hc[1] - seat) / h)} H, ear top over crown ${fmt((earTop - crown) / hv)} Hv, ` +
      `head width ${fmt((maxX - minX) / hv)} Hv, head length ${fmt((maxZ - minZ) / hv)} Hv, seat ${fmt(seat / hv)} Hv, ` +
      `back z ${fmt(backZ)} m, triangles ${mesh.finishes.length}`,
  );
  const r = (v) => v.map((n) => n.toFixed(3)).join(',');
  console.log(`  head ${r(hc)} mouth ${r(body.mouth)} shoulder ${r(sh)} elbow ${r(p.forearmR)} wrist ${r(p.handR)} hip ${r(p.thighR)} knee ${r(p.shinR)} hock ${r(p.footR)} tail2 ${r(p.tail2)}`);
}
