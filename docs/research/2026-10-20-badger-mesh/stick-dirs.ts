/**
 * Prints the direction of each stick, beater, or mallet of the badger with one percussion
 * instrument: the angle in from the forward direction (seen from above, positive toward the
 * middle) and the angle below the level, as the median at the strikes and between the strikes.
 * Usage: INSTRUMENT=snare-drum node docs/research/2026-10-20-badger-mesh/stick-dirs.ts [--set <changes>]...
 */
import { Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { allAudible, PLAYING, sceneOf } from '../../../src/pose/test-scene.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';

const instrument = process.env['INSTRUMENT'] ?? 'snare-drum';
const args = process.argv.slice(2);
const sets = [''];
for (let i = 0; i < args.length; i++) if (args[i] === '--set') sets.push(args[++i] ?? '');
const median = (v: number[]): number => {
  const s = v.toSorted((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? Number.NaN;
};
for (const text of sets) {
  const changes = text ? setHolds(text) : null;
  try {
    const out: string[] = [];
    for (const demo of await probeDemos()) {
      const scene = sceneOf(demo.bytes);
      const index = scene.layout.players.findIndex((p) => p.cast.species === 'badger' && p.cast.instrument === instrument);
      if (index < 0) continue;
      const plan = scene.plan.players[index]!;
      if (plan.note.family !== 'percussion') continue;
      const { species, kettles, support } = scene.layout.players[index]!.cast;
      const model = scene.models.get(species, instrument as never, kettles, support);
      const buffer = createScenePose(scene.plan);
      const audible = allAudible(scene.score);
      const countIn = countInAt(scene.plan.beats, 0).lengthSec;
      for (const side of ['L', 'R'] as const) {
        const track = side === 'L' ? plan.note.left : plan.note.right;
        const bone = side === 'L' ? 'malletL' : 'malletR';
        const head = model.instrument.targets.find((t) => t.kind === 'mallet-head' && t.bone === bone);
        if (!track || !head) continue;
        const sample = (song: number): [number, number] => {
          const pose = poseAt(scene.plan, song, 10 + song + countIn, PLAYING, audible, buffer).players[index]!;
          const posed = poseSkeleton(model, pose);
          const a = new Vector3(...posedPiecePoint(posed, { bone, at: [0, 0, 0] }));
          const b = new Vector3(...posedPiecePoint(posed, { bone, at: head.from }));
          const d = b.sub(a).normalize();
          // The player faces -z, and its left is -x: in toward the middle is +x for the left hand.
          const inward = Math.atan2(side === 'L' ? d.x : -d.x, -d.z) * (180 / Math.PI);
          const down = Math.asin(-d.y) * (180 / Math.PI);
          return [inward, down];
        };
        const hit: [number, number][] = [];
        const mid: [number, number][] = [];
        for (const [i, start] of track.starts.entries()) {
          const song = start + plan.timeOffset;
          hit.push(sample(song));
          const next = track.starts[i + 1];
          if (next !== undefined && next - start > 0.3) mid.push(sample(song + (next - start) / 2));
        }
        const f = (l: [number, number][]) => `in ${median(l.map((x) => x[0])).toFixed(0)}°, down ${median(l.map((x) => x[1])).toFixed(0)}°`;
        out.push(`${demo.file} ${side}: strike ${f(hit)} (${hit.length}); between ${f(mid)} (${mid.length})`);
      }
    }
    console.log(`${text || 'tree'}\n  ${out.join('\n  ')}`);
  } finally {
    changes?.undo();
  }
}
