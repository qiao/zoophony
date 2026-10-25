// The harp against the body of the harp player: SET='<changes>' node docs/research/2026-10-25-harp-lean/probes/harp-geo.ts [demo] [every]
// For each sample set of the harpist sweep, the deepest point of the strings and of the frame in
// the closed body (points each 5 mm along each string, and each 1 cm on each frame triangle),
// the gap of the soundbox to the body, and the key points of the rest pose in the model axes.
import { Quaternion, Vector3 } from 'three';
import type { Triangle } from 'three';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import { poseSkeleton, posedPoint } from '../../../../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { HEAD_BONES, closedDepth, closedPart, partDistance, posedPart, surfaceGap } from '../../../../src/pose/test-clearance.ts';
import { SWEEP_ROLES } from '../../../../src/pose/test-sweep-roles.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import type { BoneName } from '../../../../src/models/rig.ts';

const sets = process.env['SET'] ?? '';
if (sets) {
  setHolds(sets);
}
const demoId = process.argv[2] ?? 'boulanger-matin';
const every = Number(process.argv[3] ?? 8);

const BODY: readonly BoneName[] = [
  'hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR', 'tail1',
  'tail2', 'shoulderL', 'shoulderR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR',
];

const demo = (await probeDemos()).find((d) => d.file === `${demoId}.mid`);
if (!demo) throw new Error(`no demo ${demoId}`);
const scene = sceneOf(demo.bytes);
const role = SWEEP_ROLES['harpist'];
if (!role) throw new Error('no role');
const [player] = role.players(scene);
if (!player) throw new Error('no harp player');
const model = player.model;

const toBind = (posed: PosedSkeleton, p: Vector3): Vector3 => {
  const i = boneIndex('instrument');
  const frame = posed.frames[i]!;
  const pivot = new Vector3(...model.skeleton.positions[i]!);
  return p.clone().sub(frame.position).applyQuaternion(frame.rotation.clone().invert()).add(pivot);
};
const joint = (posed: PosedSkeleton, bone: BoneName): Vector3 =>
  toBind(posed, new Vector3(...posedPoint(posed, bone, model.skeleton.positions[boneIndex(bone)]!)));
const fmt = (v: Vector3): string => `[${v.toArray().map((x) => x.toFixed(3)).join(', ')}]`;

/** The sample points of the strings and of the frame of the harp in a posed skeleton. */
function harpPoints(posed: PosedSkeleton): { strings: Vector3[]; frame: Vector3[]; frameTris: Triangle[] } {
  const part = posedPart(posed, ['instrument']);
  const shells = part.closed?.() ?? [part];
  const strings: Vector3[] = [];
  const frame: Vector3[] = [];
  const frameTris: Triangle[] = [];
  for (const shell of shells) {
    const area = shell.triangles.reduce((s, t) => s + t.getArea(), 0);
    const size = shell.box.getSize(new Vector3()).length();
    if (area / size < 0.05) {
      const corners = shell.triangles.flatMap((t) => [t.a, t.b, t.c]);
      const a = corners[0]!;
      const b = corners.reduce((m, c) => (c.distanceTo(a) > m.distanceTo(a) ? c : m), a);
      const c = corners.reduce((m, q) => (q.distanceTo(b) > m.distanceTo(b) ? q : m), b);
      const n = Math.max(2, Math.ceil(b.distanceTo(c) / 0.005));
      for (let k = 0; k <= n; k++) strings.push(b.clone().lerp(c, k / n));
    } else {
      for (const t of shell.triangles) {
        frameTris.push(t);
        const n = Math.max(1, Math.ceil(Math.max(t.a.distanceTo(t.b), t.b.distanceTo(t.c), t.c.distanceTo(t.a)) / 0.01));
        for (let i = 0; i <= n; i++) {
          for (let j = 0; i + j <= n; j++) {
            const u = i / n;
            const v = j / n;
            frame.push(t.a.clone().multiplyScalar(1 - u - v).addScaledVector(t.b, u).addScaledVector(t.c, v));
          }
        }
      }
    }
  }
  return { strings, frame, frameTris };
}

const sampleSets = role.sampleSets(scene);
console.log(`SET ${sets || '(main)'} demo ${demoId} every ${every}`);
for (const set of sampleSets) {
  let k = 0;
  let worstS = { depth: 0, at: '', p: new Vector3() };
  let worstF = { depth: 0, at: '', p: new Vector3() };
  let gapMin = Infinity;
  let gapMax = 0;
  let count = 0;
  let head = { gap: Infinity, at: '', harp: new Vector3(), body: new Vector3() };
  for (const sample of set.samples) {
    if (set.name === 'play' && k++ % every !== 0) continue;
    count++;
    const posed = poseSkeleton(model, player.poseAt(sample));
    const body = closedPart(posed, BODY, 3);
    const { strings, frame, frameTris } = harpPoints(posed);
    const ds = closedDepth(strings, body);
    const df = closedDepth(frame, body);
    if (ds.depth > worstS.depth) worstS = { depth: ds.depth, at: sample[0].toFixed(2), p: toBind(posed, strings[ds.index]!) };
    if (df.depth > worstF.depth) worstF = { depth: df.depth, at: sample[0].toFixed(2), p: toBind(posed, frame[df.index]!) };
    const gap = surfaceGap(frameTris, body, 0.5).gap;
    gapMin = Math.min(gapMin, gap);
    const headPart = posedPart(posed, HEAD_BONES);
    const harpPart = posedPart(posed, ['instrument']);
    const hg = partDistance(headPart, harpPart, 0.3);
    if (hg < head.gap) {
      let best = Infinity;
      let hp = new Vector3();
      let bp = new Vector3();
      const headCorners = headPart.triangles.flatMap((t) => [t.a, t.b, t.c]);
      for (const p of [...strings, ...frame]) {
        for (const c of headCorners) {
          const d = p.distanceToSquared(c);
          if (d < best) { best = d; hp = p; bp = c; }
        }
      }
      head = { gap: hg, at: sample[0].toFixed(2), harp: toBind(posed, hp), body: toBind(posed, bp) };
    }
    gapMax = Math.max(gapMax, gap);
  }
  console.log(
    `${set.name.padEnd(5)} n ${String(count).padStart(4)}  strings in body ${(worstS.depth * 100).toFixed(1)} cm` +
      `${worstS.depth > 0 ? ` at ${worstS.at} s ${fmt(worstS.p)}` : ''}  frame in body ${(worstF.depth * 100).toFixed(1)} cm` +
      `${worstF.depth > 0 ? ` at ${worstF.at} s ${fmt(worstF.p)}` : ''}  frame gap ${(gapMin * 100).toFixed(1)}..${(gapMax * 100).toFixed(1)} cm  head gap ${(head.gap * 100).toFixed(1)} cm at ${head.at} s harp ${fmt(head.harp)} head ${fmt(head.body)}`,
  );
}

// The key points of the rest pose and of one play sample, in the model axes.
const rest = sampleSets.find((s) => s.name === 'rest')!;
const [restSample] = [...rest.samples];
const posed = poseSkeleton(model, player.poseAt(restSample!));
for (const bone of ['hips', 'chest', 'neck', 'head', 'upperArmL', 'upperArmR', 'shinL', 'shinR', 'footL', 'footR'] as const) {
  console.log(`rest joint ${bone.padEnd(9)} ${fmt(joint(posed, bone))}`);
}
const placed = model.pieces.find((p) => p.piece.bone === 'instrument')!;
const at = placed.at;
const rot = new Quaternion(...at.rotation);
const pos = new Vector3(...at.position);
const scale = (model.instrument.size as unknown as { height?: number }).height;
void scale;
const harpScale = Number(process.env['HS'] ?? 0.78);
const local = (y: number, z: number): Vector3 => new Vector3(0, y * harpScale, z * harpScale).applyQuaternion(rot).add(pos);
console.log(`harp soundbox bottom ${fmt(local(0.08, -0.22))} top ${fmt(local(0.98, 0.3))}`);
console.log(`harp column top ${fmt(local(1.3, -0.38))} base front ${fmt(local(0.04, 0.08))} base back ${fmt(local(0.04, -0.42))}`);
const tilt = new Vector3(0, 1, 0).applyQuaternion(rot);
console.log(`harp up axis ${fmt(tilt)}  lean back ${(Math.acos(tilt.y) * 180 / Math.PI).toFixed(1)} deg`);
