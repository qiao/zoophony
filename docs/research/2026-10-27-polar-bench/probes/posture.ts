// Measures the posture of the polar bear pianist against the target of a professional pianist
// (docs/reference/piano-technique.md) over the rest and the play samples of all demos (diagnosis
// only). A copy of posture.ts of docs/research/2026-10-24-pianist-pose/ with the env HOLD: a JSON
// object of values of HANDS_HOLDS.piano, with the angles in degrees. Usage, from the root of the
// tree: HOLD='{"lean":23}' node docs/research/2026-10-27-polar-bench/probes/posture.ts [step]
import { Matrix4, Vector3 } from 'three';

import { FOLD_ROLES, probeFolds } from '../../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../../tools/patch-demos.ts';
import { PIANO, PIANO_SCALE } from '../../../../src/models/instruments/piano.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';

import { HANDS_HOLDS } from '../../../../src/pose/hands.ts';
const holdEnv = HANDS_HOLDS.piano as unknown as Record<string, unknown>;
for (const [k, v] of Object.entries(JSON.parse(process.env.HOLD ?? '{}'))) {
  holdEnv[k] = typeof v === 'number' && /lean|Lean|Drop|curl/.test(k) ? (v * Math.PI) / 180 : v;
}
const names: readonly string[] = STUDIO_BONES;
const step = Number(process.argv[2] ?? '0.25');
const role = FOLD_ROLES.get('pianist');
if (!role) {
  throw new Error('no pianist');
}
const demos = await patchedDemos();
const m = new Matrix4();
const DEG = 180 / Math.PI;

type Row = Record<string, number>;
const rows: { set: string; label: string; row: Row }[] = [];

probeFolds(role, demos, step, (rig, studio, posed, _folded, set, label) => {
  const at = (bone: string, point: readonly number[]): Vector3 => {
    const i = names.indexOf(bone);
    m.fromArray(studio.matrices, i * 16);
    return new Vector3(point[0], point[1], point[2]).applyMatrix4(m);
  };
  const h = rig.body.heads as Readonly<Record<string, readonly number[]>>;
  const head = (bone: string): Vector3 => at(bone, h[bone] ?? [0, 0, 0]);
  let floor = Infinity;
  for (let i = 1; i < posed.length; i += 3) {
    floor = Math.min(floor, posed[i] ?? 0);
  }
  const row: Row = { floor: floor * 100 };
  const spine = head('spine');
  const neck = head('neck');
  const hips = head('hips');
  // The lean of the trunk from the vertical, forward positive (the player faces -z).
  row.lean = Math.atan2(-(neck.z - hips.z), neck.y - hips.y) * DEG;
  row.leanSpine = Math.atan2(-(neck.z - spine.z), neck.y - spine.y) * DEG;
  // The side lean of the trunk from the vertical, to the left of the player (-x) positive.
  row.leanSide = Math.atan2(-(neck.x - spine.x), neck.y - spine.y) * DEG;
  const chest = head('chest');
  const headCenter = at('head', rig.body.headCenter);
  const nose = at('head', rig.body.nose);
  // The gaze: the pitch of the line from the head center to the nose, down positive.
  row.gaze =
    Math.atan2(headCenter.y - nose.y, Math.hypot(nose.x - headCenter.x, nose.z - headCenter.z)) *
    DEG;
  row.headY = headCenter.y * 100;
  row.headZ = -headCenter.z * 100;
  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? -1 : 1;
    const shoulder = head(`upper_arm_${side}`);
    const elbow = head(`forearm_${side}`);
    const wrist = head(`hand_${side}`);
    const knuckle = head(`fingers_${side}`);
    const upper = elbow.clone().sub(shoulder);
    const fore = wrist.clone().sub(elbow);
    const hand = knuckle.clone().sub(wrist);
    row[`elbowKey${side}`] = (elbow.y - PIANO.keyTop * PIANO_SCALE) * 100;
    row[`wristKey${side}`] = (wrist.y - PIANO.keyTop * PIANO_SCALE) * 100;
    // The angle of the upper arm from the vertical, and its parts: forward and out to the side.
    row[`upperFromVertical${side}`] = upper.angleTo(new Vector3(0, -1, 0)) * DEG;
    row[`upperForward${side}`] = Math.atan2(-upper.z, -upper.y) * DEG;
    row[`upperOut${side}`] = Math.atan2(s * upper.x, -upper.y) * DEG;
    // The elbow in front of the chest joint, and out from the shoulder joint.
    row[`elbowFront${side}`] = -(elbow.z - chest.z) * 100;
    row[`elbowOut${side}`] = s * (elbow.x - shoulder.x) * 100;
    // The slope of the forearm, up to the wrist positive, and the bend of the paw on it in the
    // vertical plane, up positive (a high wrist gives a paw that bends down: negative).
    const forePitch = Math.atan2(fore.y, Math.hypot(fore.x, fore.z)) * DEG;
    const handPitch = Math.atan2(hand.y, Math.hypot(hand.x, hand.z)) * DEG;
    row[`foreSlope${side}`] = forePitch;
    row[`wristBend${side}`] = handPitch - forePitch;
    row[`elbowAngle${side}`] = upper.clone().negate().angleTo(fore) * DEG;
    // The shoulder joint below the neck joint (a raised shoulder makes it smaller).
    row[`shoulderDrop${side}`] = (neck.y - shoulder.y) * 100;
    row[`wristX${side}`] = wrist.x * 100;
  }
  rows.push({ set, label, row });
});

const keys = Object.keys(rows[0]?.row ?? {});
const stat = (sel: Row[], key: string): string => {
  const v = sel.map((r) => r[key] ?? 0).toSorted((a, b) => a - b);
  if (v.length === 0) {
    return '-';
  }
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const p = (q: number): number => v[Math.min(v.length - 1, Math.floor(q * v.length))] ?? 0;
  return `${mean.toFixed(1)} [${p(0.05).toFixed(1)}, ${p(0.95).toFixed(1)}]`;
};
const play = rows.filter((r) => r.set === 'play').map((r) => r.row);
const rest = rows.filter((r) => r.set === 'rest').map((r) => r.row);
// The far samples: the 5% of the play samples with the left wrist furthest left, and with the
// right wrist furthest right.
const cut = (key: string, q: number): number =>
  play.map((r) => r[key] ?? 0).toSorted((a, b) => a - b)[Math.floor(q * play.length)] ?? 0;
const leftCut = cut('wristXL', 0.05);
const rightCut = cut('wristXR', 0.95);
const farLeft = play.filter((r) => (r.wristXL ?? 0) <= leftCut);
const farRight = play.filter((r) => (r.wristXR ?? 0) >= rightCut);
console.log(
  `samples: play ${play.length}, rest ${rest.length}, far left ${farLeft.length}, far right ${farRight.length}`,
);
console.log('| Measure | Rest | Play mean [p5, p95] | Far left | Far right |');
console.log('|---|---|---|---|---|');
for (const key of keys) {
  console.log(
    `| ${key} | ${stat(rest, key)} | ${stat(play, key)} | ${stat(farLeft, key)} | ${stat(farRight, key)} |`,
  );
}
