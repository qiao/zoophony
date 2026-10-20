// Writes the bear module of each variant of the eye settings into scratch/v/<name>/bear.ts, and
// prints the push, the move from the old eye, the eye place, the direction, and the bend of the
// left eye. eye-fit.ts and app-eyes.ts then measure each folder.
// The settings eyeTwist (the share of the twist term of the bend), eyeDepth (a move along the
// direction after the push, in H), and eyeToward (a turn of the direction toward a vector) are
// probe settings of the round: apply probe-options.patch to tools/studio-body.ts of a0577a5a^
// first. The patch also holds an early form of eyeShift.
// Usage: node docs/research/2026-10-20-bear-eyes/bear-variants.ts '<name>=<json of settings>' ...
// A null value removes the setting of the bear, such as '{"flatEyes":null}'.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ANIMALS, studioBody, studioGlbPath, writeStudioModule } from '../../../tools/studio-body.ts';

const base = ANIMALS.get('bear')!;
const bytes = new Uint8Array(await readFile(studioGlbPath('bear', base)));
for (const arg of process.argv.slice(2)) {
  const at = arg.indexOf('=');
  const name = arg.slice(0, at);
  const change = JSON.parse(arg.slice(at + 1)) as Record<string, unknown>;
  const settings = { ...base, ...change } as Record<string, unknown>;
  for (const [k, v] of Object.entries(change)) if (v === null) delete settings[k];
  const { body, eyeShifts, eyePushes } = studioBody(bytes, 'lowpoly-studio/animals/bear/out/bear.glb', settings as typeof base);
  const dir = join('scratch/v', name);
  await mkdir(dir, { recursive: true });
  await writeStudioModule(join(dir, 'bear.ts'), 'bear', base.constant, body);
  console.log(`${name}: push ${eyePushes.L.toFixed(3)} H, shift from old ${eyeShifts.L.toFixed(3)} H, eye_L ${body.heads.eye_L.join(', ')}, dir ${body.eyes.directions.L.join(', ')}, bend ${body.eyes.bends?.L.join(', ')}`);
}
