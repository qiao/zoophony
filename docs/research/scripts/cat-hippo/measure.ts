// Prints the measures of a player in its bind pose: the head (Hv, width), the torso and the body
// widths, and the width of the instrument body, in meters and in Hv.
// Run it from the root of the repository: node <this file> <species> <instrument>
import { buildPlayer } from '../../../../src/models/player.ts';
import { BONE_NAMES } from '../../../../src/models/rig.ts';

const [species = 'hippo', instrument = 'contrabass'] = process.argv.slice(2);
// SAFETY: a scratch tool; the arguments name a species and an instrument.
const player = buildPlayer(species as never, instrument as never);
const { mesh, body } = player;
const h = body.headHeight;
const hc = body.headCenter;
const index = (name: string): number => BONE_NAMES.indexOf(name as never);
const headBones = new Set([index('head'), index('jaw')]);
const torsoBones = new Set([index('hips'), index('spine'), index('chest')]);
const armBones = new Set(
  ['upperArmL', 'upperArmR', 'forearmL', 'forearmR', 'handL', 'handR', 'fingersL', 'fingersR'].map(
    index,
  ),
);
const legBones = new Set(['thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'].map(index));
const bodyCount = index('instrument');
let crown = -9;
let chin = 9;
let headMin = 9;
let headMax = -9;
let headFront = 9;
let headBack = -9;
let torsoMin = 9;
let torsoMax = -9;
let armMin = 9;
let armMax = -9;
let instMin = 9;
let instMax = -9;
let top = -9;
for (let i = 0; i < mesh.bones.length; i++) {
  const x = mesh.positions[3 * i] ?? 0;
  const y = mesh.positions[3 * i + 1] ?? 0;
  const z = mesh.positions[3 * i + 2] ?? 0;
  const bone = mesh.bones[i] ?? 0;
  if (bone === bodyCount) {
    instMin = Math.min(instMin, x);
    instMax = Math.max(instMax, x);
    continue;
  }
  if (headBones.has(bone)) {
    crown = Math.max(crown, y);
    if (Math.abs(x) < 0.2 * h) {
      chin = Math.min(chin, y);
    }
    headMin = Math.min(headMin, x);
    headMax = Math.max(headMax, x);
    headFront = Math.min(headFront, z);
    headBack = Math.max(headBack, z);
  }
  if (torsoBones.has(bone)) {
    torsoMin = Math.min(torsoMin, x);
    torsoMax = Math.max(torsoMax, x);
  }
  if (armBones.has(bone) || torsoBones.has(bone)) {
    armMin = Math.min(armMin, x);
    armMax = Math.max(armMax, x);
  }
  if (!legBones.has(bone)) {
    top = Math.max(top, y);
  }
}
const hv = crown - chin;
const f = (v: number): string => v.toFixed(3);
console.log(
  `${species} ${instrument}: H ${f(h)} m, Hv ${f(hv)} m (${f(hv / h)} H), crown ${f(crown)} m, ` +
    `head center ${f(hc[1])} m, head width ${f(headMax - headMin)} m (${f((headMax - headMin) / hv)} Hv), ` +
    `head length ${f(headBack - headFront)} m (${f((headBack - headFront) / hv)} Hv), ` +
    `torso width ${f(torsoMax - torsoMin)} m (${f((torsoMax - torsoMin) / hv)} Hv), ` +
    `with arms ${f(armMax - armMin)} m (${f((armMax - armMin) / hv)} Hv), ` +
    `instrument x ${f(instMin)} to ${f(instMax)}, triangles ${mesh.bones.length / 3}`,
);
