// The paw gap of the pianist for two held keys: left at c - d/2, right at c + d/2.
import { note, programChange, tempo, track } from '../../../src/midi/test-smf.ts';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedPart, partDistance } from '../../../src/pose/test-clearance.ts';
import { pianoKeyPosition } from '../../../src/models/instruments/piano.ts';
const Q = 480;
import { setHolds } from '../../../tools/hold-sets.ts';
import { PAW_TURN } from '../../../src/models/studio-rig.ts';
if (process.env['SET']) setHolds(process.env['SET']);
if (process.env['PAWMAX']) (PAW_TURN as { max: number }).max = (Number(process.env['PAWMAX']) * Math.PI) / 180;
const centers = (process.argv[2] ?? '60,66,72').split(',').map(Number);
const pairs: [number, number][] = [];
for (const c of centers) for (let d = 2; d <= 30; d += 2) pairs.push([c - d / 2, c + d / 2]);
// Each pair: a wide chord (wider than an octave splits; else force by two notes far apart in time?)
// Use chords of three notes: low, a gap > 12 so it splits... simpler: left note low and right note high in one chord, with an extra far note to force the split.
const notes = pairs.flatMap(([a, b], i) => [note(i * 4 * Q, 0, a, i * 4 * Q + 3 * Q), note(i * 4 * Q, 1, b, i * 4 * Q + 3 * Q)]);
const file = { format: 1 as const, tracks: [track([tempo(0, 120)]), track([programChange(0, 0, 0), programChange(0, 1, 0)], ...notes)] };
const s = sceneOf(file);
const index = s.layout.players.findIndex((p) => p.cast.instrument === 'piano');
const pl = s.layout.players[index]!;
const model = s.models.get(pl.cast.species, 'piano', pl.cast.kettles, pl.cast.support);
const buffer = createScenePose(s.plan);
const audible = allAudible(s.score);
for (const [i, [a, b]] of pairs.entries()) {
  const t = i * 2 + 1.0;
  const pose = poseAt(s.plan, t, 10 + t, PLAYING, audible, buffer).players[index]!;
  const posed = poseSkeleton(model, pose);
  const L = posedPart(posed, ['handL', 'fingersL']);
  const R = posedPart(posed, ['handR', 'fingersR']);
  const dx = pianoKeyPosition(b)[0] - pianoKeyPosition(a)[0];
  console.log(`L ${a} R ${b} palms ${(dx * 100).toFixed(1)} cm: paw gap ${(partDistance(L, R, 0.3) * 100).toFixed(1)} cm, x overlap ${((L.box.max.x - R.box.min.x) * 100).toFixed(1)} cm`);
}
// directions
import { posedPoint } from '../../../src/pose/test-kinematics.ts';
for (const [i, [a, b]] of pairs.entries()) {
  const t = i * 2 + 1.0;
  const pose = poseAt(s.plan, t, 10 + t, PLAYING, audible, buffer).players[index]!;
  const posed = poseSkeleton(model, pose);
  const parts = ['L', 'R'].map((sd) => {
    const fore = posedPart(posed, [`forearm${sd}` as 'forearmL']);
    const paw = posedPart(posed, [`fingers${sd}` as 'fingersL']);
    const e = posedPoint(posed, `forearm${sd}` as 'forearmL', [0, 0, 0]);
    const w = posedPoint(posed, `hand${sd}` as 'handL', [0, 0, 0]);
    const f = posedPoint(posed, `fingers${sd}` as 'fingersL', [0, 0, 0]);
    const ang = (p: number[], q: number[]) => (Math.atan2(q[0]! - p[0]!, -(q[2]! - p[2]!)) * 180) / Math.PI;
    return `${sd} elbow ${e.map((v) => v.toFixed(2))} wrist ${w.map((v) => v.toFixed(2))} fore ${ang(e, w).toFixed(0)}° paw ${ang(w, f).toFixed(0)}° ${fore.triangles.length}${paw.triangles.length}`;
  });
  if (b - a > 12) console.log(a, b, parts.join(' | '));
}
