// node docs/research/2026-10-21-pirates-clip/pawdepth.ts <midi path or demo id> <instrument> [step]: the depth of one paw in the other.
import { readFile } from 'node:fs/promises';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { closedPart, closedDepth, openLoops, posedPart } from '../../../src/pose/test-clearance.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
const [file = '', instrument = 'piano', stepText = '0.25', set = ''] = process.argv.slice(2);
import { setHolds } from '../../../tools/hold-sets.ts';
if (set) console.log(setHolds(set));
import { PAW_TURN } from '../../../src/models/studio-rig.ts';
if (process.env['PAWMAX']) (PAW_TURN as { max: number }).max = (Number(process.env['PAWMAX']) * Math.PI) / 180;
const bytes = file.includes('/') ? new Uint8Array(await readFile(file)) : (await patchedDemo(`${file}.mid`)).bytes;
const s = sceneOf(bytes);
const audible = allAudible(s.score);
const buffer = createScenePose(s.plan);
const step = Number(stepText);
for (const [index, place] of s.layout.players.entries()) {
  if (place.cast.instrument !== instrument) continue;
  const model = s.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
  let over = 0, total = 0, worst = 0, worstT = 0;
  const hits: string[] = [];
  for (let t = 0; t <= s.score.durationSec; t += step) {
    const pose = poseAt(s.plan, t, 10 + t, PLAYING, audible, buffer).players[index]!;
    const posed = poseSkeleton(model, pose);
    const sl = closedPart(posed, ['handL', 'fingersL'], openLoops(posedPart(posed, ['handL', 'fingersL']).triangles)), sr = closedPart(posed, ['handR', 'fingersR'], openLoops(posedPart(posed, ['handR', 'fingersR']).triangles));
    const pl = posedPart(posed, ['handL', 'fingersL']).triangles.flatMap((t) => [t.a, t.b, t.c]);
    const pr = posedPart(posed, ['handR', 'fingersR']).triangles.flatMap((t) => [t.a, t.b, t.c]);
    const d = Math.max(closedDepth(pl, sr).depth, closedDepth(pr, sl).depth);
    total++;
    if (d > 0.005) { over++; hits.push(`${t.toFixed(2)}:${(d * 100).toFixed(1)}`); }
    if (d > worst) { worst = d; worstT = t; }
  }
  console.log(`${file.split('/').at(-1)} player ${index} ${place.cast.species} ${instrument}: paw in paw over 0.5 cm in ${over} of ${total} samples (${((100 * over) / total).toFixed(1)}%), worst ${(worst * 100).toFixed(1)} cm at ${worstT.toFixed(2)} s`);
  if (process.env['HITS']) console.log(hits.join(' '));
}
