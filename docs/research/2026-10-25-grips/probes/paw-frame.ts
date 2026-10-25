// Prints the skin of each paw in the axes of one instrument piece, for samples of a sweep role.
// Usage: node scratch/paw-frame.ts <sweep role> <species> <instrument> <piece bone> <demo prefix>
//   [<sets, such as play,rest>] [<every>] [<set changes>]
import { Quaternion, Vector3 } from 'three';
import { probeDemos } from '../tools/probe-demos.ts';
import { setHolds } from '../tools/hold-sets.ts';
import { boneIndex } from '../src/models/rig.ts';
import type { BoneName } from '../src/models/rig.ts';
import { posedPart } from '../src/pose/test-clearance.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { allAudible, sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { scoreOf } from '../src/score/test-score.ts';

const [role, species, instrument, pieceBone, demoName, setsArg, everyArg, changes] =
  process.argv.slice(2);
if (changes) {
  console.log(setHolds(changes).text);
}
const sweep = SWEEP_ROLES[role as keyof typeof SWEEP_ROLES];
const demos = await probeDemos();
const demo = demos.find((d) => d.file.startsWith(demoName ?? '') && sweep.hasRole(scoreOf(d.bytes)));
if (!demo) throw new Error('no demo');
console.log(demo.file);
const scene = sceneOf(demo.bytes);
const index = scene.layout.players.findIndex(
  (p) => p.cast.species === species && p.cast.instrument === instrument,
);
const place = scene.layout.players[index];
if (!place) throw new Error('no player');
const model = scene.models.get(
  place.cast.species,
  place.cast.instrument,
  place.cast.kettles,
  place.cast.support,
);
const piece = model.pieces.find((p) => p.piece.bone === pieceBone);
if (!piece) throw new Error('no piece');
const at = piece.at as unknown as { position: number[]; rotation: number[]; scale?: number };
console.log('piece at', JSON.stringify(piece.at));
const buffer = createScenePose(scene.plan);
const audible = allAudible(scene.score);
const wantedSets = (setsArg ?? 'play,rest').split(',');
const every = Number(everyArg ?? 20);
const bi = boneIndex(pieceBone as BoneName);
const bindBone = new Vector3(...(model.skeleton.positions[bi] ?? [0, 0, 0]));
const atPos = new Vector3(...(at.position as [number, number, number]));
const atRot = new Quaternion(...(at.rotation as [number, number, number, number]));
const atInv = atRot.clone().invert();
for (const set of sweep.sampleSets(scene)) {
  if (!wantedSets.includes(set.name)) continue;
  const samples = [...set.samples].filter((_, i) => i % every === 0).slice(0, 4);
  for (const [song, wall, transport] of samples) {
    const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
    if (!pose) continue;
    const posed = poseSkeleton(model, pose);
    const frame = posed.frames[bi];
    if (!frame) continue;
    const inv = frame.rotation.clone().invert();
    const toLocal = (w: Vector3): Vector3 =>
      w.clone().sub(frame.position).applyQuaternion(inv).add(bindBone).sub(atPos).applyQuaternion(atInv);
    for (const side of ['L', 'R'] as const) {
      const part = posedPart(posed, [`hand${side}`, `fingers${side}`]);
      const pts = part.triangles.flatMap((t) => [t.a, t.b, t.c]).map(toLocal);
      const min = new Vector3(Infinity, Infinity, Infinity);
      const max = new Vector3(-Infinity, -Infinity, -Infinity);
      for (const p of pts) {
        min.min(p);
        max.max(p);
      }
      const mid = pts.reduce((a, b) => a.add(b), new Vector3()).divideScalar(pts.length);
      const wrist = toLocal(posed.frames[boneIndex(`hand${side}`)]?.position ?? new Vector3());
      const f = (v: Vector3): string =>
        `(${(v.x * 100).toFixed(1)}, ${(v.y * 100).toFixed(1)}, ${(v.z * 100).toFixed(1)})`;
      const hq = posed.frames[boneIndex(`hand${side}`)]?.rotation ?? new Quaternion();
      const toLocalDir = (d: Vector3): Vector3 => d.applyQuaternion(inv).applyQuaternion(atInv);
      const palmDir = toLocalDir(new Vector3(side === 'L' ? -1 : 1, 0, 0).applyQuaternion(hq));
      const fingerDir = toLocalDir(new Vector3(0, -1, 0).applyQuaternion(hq));
      const g = (v: Vector3): string => `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
      console.log(
        `${set.name} ${song.toFixed(2)} ${side}: box ${f(min)} to ${f(max)} cm, mid ${f(mid)}, wrist ${f(wrist)}, palm ${g(palmDir)}, fingers ${g(fingerDir)}`,
      );
    }
  }
}
