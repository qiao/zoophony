// Writes the module of the studio polar bear with another seat height into a file.
// Usage: node docs/research/2026-10-14-polar-bench/make-variant.ts <seat|none> <out>
import { readFile } from "node:fs/promises";
import { ANIMALS, studioBody, studioGlbPath, writeStudioModule } from "../../../tools/studio-body.ts";

const [seatText, out] = process.argv.slice(2);
const base = ANIMALS.get('polar-bear');
if (!base || !out || !seatText) {
  throw new Error('usage');
}
const settings = seatText === 'none' ? base : { ...base, seat: Number(seatText) };
const file = studioGlbPath('polar-bear', settings);
const { body } = studioBody(await readFile(file), 'lowpoly-studio/animals/polar-bear/out/polar-bear.glb', settings);
await writeStudioModule(out, 'polar-bear', settings.constant, body);
console.log(`seat ${seatText}: seatHeight ${body.seatHeight}, floor ${JSON.stringify(body.floor)}`);
