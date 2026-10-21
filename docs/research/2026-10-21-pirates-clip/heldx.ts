// Crossing of the held parts with the other side: node docs/research/2026-10-21-pirates-clip/heldx.ts <midi|demo> <instrument> [step]
import { readFile } from 'node:fs/promises';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedPart, partDistance } from '../../../src/pose/test-clearance.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
const [file = '', instrument = 'xylophone', stepText = '0.25'] = process.argv.slice(2);
const bytes = file.includes('/') ? new Uint8Array(await readFile(file)) : (await probeDemos()).find((d) => d.file === `${file}.mid`)!.bytes;
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env['SET']) console.log(setHolds(process.env['SET']).text ?? '');
const s = sceneOf(bytes);
const audible = allAudible(s.score);
const buffer = createScenePose(s.plan);
for (const [index, place] of s.layout.players.entries()) {
  if (place.cast.instrument !== instrument) continue;
  const model = s.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
  let n = 0, total = 0; const hits: string[] = [];
  for (let t = 0; t <= s.score.durationSec; t += Number(stepText)) {
    const posed = poseSkeleton(model, poseAt(s.plan, t, 10 + t, PLAYING, audible, buffer).players[index]!);
    const hl = posedPart(posed, ['malletL']), hr = posedPart(posed, ['malletR']);
    const sl = posedPart(posed, ['handL', 'fingersL', 'malletL']), sr = posedPart(posed, ['handR', 'fingersR', 'malletR']);
    total++;
    if (partDistance(hl, sr, 0.1) === 0 || partDistance(hr, sl, 0.1) === 0) { n++; hits.push(t.toFixed(2)); }
  }
  console.log(`${file.split('/').at(-1)} player ${index} ${instrument}: a held part crosses the other side in ${n} of ${total} samples`, process.env['HITS'] ? hits.join(' ') : '');
}
