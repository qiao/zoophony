/**
 * Prints grip candidates for the red fox or the rabbit: for each turn a (deg) and normal offset c
 * (cm, in the hand axes), the place `at` in H of the point of the line nearest to a reference point.
 *
 * Usage: node docs/research/2026-10-17-grip-all/grip-cands.ts <palmY cm> <H m> <refY cm> <refZ cm> <x H> <a,...> <c,...>
 */
const [palmY, H, refY, refZ, x, as, cs] = process.argv.slice(2);
const out: string[] = [];
for (const a of as!.split(',').map(Number)) {
  for (const c of cs!.split(',').map(Number)) {
    const r = (a * Math.PI) / 180;
    const n = [Math.cos(r), Math.sin(r)];
    const d = [Math.sin(r), -Math.cos(r)];
    const t = Number(refY) * d[0]! + Number(refZ) * d[1]!;
    const y = c * n[0]! + t * d[0]!;
    const z = c * n[1]! + t * d[1]!;
    const h = Number(H) * 100;
    out.push(`${x},${((y - Number(palmY)) / h).toFixed(4)},${(z / h).toFixed(4)},${a}`);
  }
}
console.log(out.join(' '));
