// Scans rigid moves of the contrabass of the hippo around its end pin: the depth of the
// contrabass in the body over some play samples, and the arm factors that reach the whole
// fingerboard and the whole hair. Usage: node docs/research/2026-10-21-hippo-bass/search.ts <grid json> [--demo <id>]
import { Quaternion, Vector3 } from 'three';
import { SPECIES } from '../../../src/models/species.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { bowRangeOf, bowedRig, holdOf, SPECIES_HOLDS, stopRangeOf } from '../../../src/pose/bowed-rig.ts';
import type { BowedHold } from '../../../src/pose/bowed-rig.ts';
import { closedDepth } from '../../../src/pose/test-clearance.ts';
import type { ClosedSurface } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { BASSIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] ?? d) : d; };
const grid = JSON.parse(args[0]?.startsWith("[") ? args[0] : (await import("node:fs")).readFileSync(args[0] ?? "", "utf8")) as Variant[];
const demoId = opt('--demo', 'beethoven-1');
const every = Number(opt('--every', '25'));
const scale = Number(opt('--scale', '0'));
if (scale > 0) (SPECIES.hippo as { bassScale?: number }).bassScale = scale;

interface Variant { yaw?: number; tilt?: number; side?: number; roll?: number; dx?: number; dy?: number; dz?: number; extra?: Partial<BowedHold> }

const pre = opt('--pre', '');
if (pre) (await import('../../../tools/hold-sets.ts')).setHolds(pre);
const base = holdOf('hippo', 'contrabass');
const role = BASSIST_SWEEP;
const body = role.obstacles.find((o) => o.name === 'body')!;
const demo = (await patchedDemos()).find((d) => d.file.startsWith(demoId))!;
const scene = sceneOf(demo.bytes);
const [player] = role.players(scene);
const model = player!.model;
const H = model.body.headHeight;
const inst = boneIndex('instrument');
const corners: number[] = [];
const seen = new Set<string>();
for (let c = 0; c < model.mesh.bones.length; c++) {
  if (model.mesh.bones[c] !== inst) continue;
  const key = `${model.mesh.positions[c * 3]} ${model.mesh.positions[c * 3 + 1]} ${model.mesh.positions[c * 3 + 2]}`;
  if (!seen.has(key)) { seen.add(key); corners.push(c); }
}
interface Probe { surface: ClosedSurface; local: Vector3[]; rootRot: Quaternion; pivot: Vector3 }
const probes: Probe[] = [];
const playTurnB = new Quaternion(...base.playTurn);
for (const { name, samples } of role.sampleSets(scene)) {
  if (name !== 'play' && name !== 'rest') continue;
  let i = 0;
  for (const sample of samples) {
    if (name === 'play' && i++ % every !== 0) continue;
    const posed = poseSkeleton(model, player!.poseAt(sample));
    const f = posed.frames[inst]!;
    const inv = f.rotation.clone().invert();
    const local = corners.map((c) => new Vector3(...posedCorner(posed, c)).sub(f.position).applyQuaternion(inv));
    if (name === 'rest') continue; // the rest keeps the play place
    probes.push({ surface: body.surface(posed), local, rootRot: f.rotation.clone().multiply(playTurnB.clone().invert()), pivot: f.position.clone() });
  }
}
const D = Math.PI / 180;
const holdOfVariant = (v: Variant): BowedHold => {
  // The turns in the model axes around the end pin: the yaw around y, the tilt around x (a
  // positive tilt leans the top forward), and the side lean around z (positive to the left).
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (v.yaw ?? 0) * D)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -(v.tilt ?? 0) * D))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (v.side ?? 0) * D));
  let turn = q.multiply(playTurnB.clone());
  if (v.roll) {
    const axisB = new Vector3(0, 1, 0).applyQuaternion(turn); // the long axis, roughly
    turn = new Quaternion().setFromAxisAngle(axisB.normalize(), v.roll * D).multiply(turn);
  }
  const s = base.playShift;
  return { ...base, ...v.extra, playTurn: [turn.x, turn.y, turn.z, turn.w], playShift: [s[0] + (v.dx ?? 0) / H, s[1] + (v.dy ?? 0) / H, s[2] + (v.dz ?? 0) / H] };
};
const reachOf = (hold: BowedHold): string => {
  const rig = bowedRig(buildPlayer('hippo', 'contrabass', 4, 'stand'), 'contrabass', hold);
  const scaled = (f: number) => ({ ...rig, armL: { ...rig.armL, reach: rig.armL.reach * f }, armR: { ...rig.armR, reach: rig.armR.reach * f } });
  const free = rig.hold.freeHair;
  const full = (f: number, w: 0 | 1): boolean => {
    if (w === 0) { const s = stopRangeOf(scaled(f)); return s[0] <= 1e-9 && s[1] >= 1 - 1e-9; }
    const b = bowRangeOf(scaled(f)); return b[0] <= free + 1e-6 && b[1] >= rig.hairLength - free - 0.011;
  };
  const fac = (w: 0 | 1): number => { let lo = 0.3, hi = 4; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (full(m, w)) hi = m; else lo = m; } return hi; };
  const s = stopRangeOf(rig), b = bowRangeOf(rig);
  return `L ${fac(0).toFixed(3)} R ${fac(1).toFixed(3)} stop ${s.map((x) => x.toFixed(2)).join('-')} bow ${b.map((x) => x.toFixed(3)).join('-')}`;
};
for (const v of grid) {
  const hold = holdOfVariant(v);
  const turn = new Quaternion(...hold.playTurn);
  let worst = 0;
  for (const p of probes) {
    const rot = p.rootRot.clone().multiply(turn);
    const t = p.pivot.clone().add(new Vector3(...hold.playShift).sub(new Vector3(...base.playShift)).multiplyScalar(H).applyQuaternion(p.rootRot));
    const pts = p.local.map((l) => l.clone().applyQuaternion(rot).add(t));
    worst = Math.max(worst, closedDepth(pts, p.surface).depth);
  }
  SPECIES_HOLDS.hippo = { contrabass: hold };
  console.log(`${JSON.stringify(v)}: depth ${(worst * 100).toFixed(1)} cm; ${reachOf(hold)}; shift ${hold.playShift.map((x) => x.toFixed(4))} turn ${hold.playTurn.map((x) => x.toFixed(4))}`);
}
