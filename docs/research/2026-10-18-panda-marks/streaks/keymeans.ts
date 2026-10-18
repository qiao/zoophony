/** Prints the mean turns of the clavicle, the upper arm, and the forearm of each side in each set. */
import { readFile } from 'node:fs/promises';
import { Quaternion } from 'three';

interface Sample {
  readonly set: string;
  readonly keys: Record<string, Record<string, [number, number, number, number]>>;
}
const all = JSON.parse(await readFile(process.argv[2] ?? 'scratch/streaks/keys.json', 'utf8')) as Sample[];
const deg = (a: Quaternion, b: Quaternion): number =>
  (2 * Math.acos(Math.min(1, Math.abs(a.dot(b)))) * 180) / Math.PI;
for (const side of ['L', 'R']) {
  for (const set of ['rest', 'play', 'lift']) {
    const samples = all.filter((s) => s.set === set);
    const line: string[] = [];
    for (const name of Object.keys(samples[0]?.keys[side] ?? {})) {
      const qs = samples.map((s) => new Quaternion(...(s.keys[side]?.[name] ?? [0, 0, 0, 1])));
      const first = qs[0] ?? new Quaternion();
      const sum = [0, 0, 0, 0];
      for (const q of qs) {
        const sign = q.dot(first) < 0 ? -1 : 1;
        sum[0] += sign * q.x; sum[1] += sign * q.y; sum[2] += sign * q.z; sum[3] += sign * q.w;
      }
      const mean = new Quaternion(sum[0], sum[1], sum[2], sum[3]).normalize();
      const spread = qs.reduce((m, q) => Math.max(m, deg(q, mean)), 0);
      line.push(`${name} [${[mean.x, mean.y, mean.z, mean.w].map((v) => v.toFixed(4)).join(', ')}] ${deg(mean, new Quaternion()).toFixed(1)} deg, spread ${spread.toFixed(1)}`);
    }
    console.log(`${side} ${set} (${samples.length}): ${line.join('; ')}`);
  }
}
