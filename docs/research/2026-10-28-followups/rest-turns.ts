import { armSamples, parseRaiseArgs, studioAxes } from '../../../tools/raise-fit.ts';
import { meanTurn } from '../../../tools/fold-probe.ts';
const opts = parseRaiseArgs(['bassist', '--faces', '0', '--side', 'R', '--sets', 'rest', ...process.argv.slice(2)]);
const samples = (await armSamples(opts)).filter((s) => s.set === 'rest');
console.log('rest samples', samples.length);
for (const key of ['clavicle', 'upper', 'elbow', 'wrist'] as const) {
  const m = meanTurn(samples.map((s) => s.keys[key]));
  console.log(key, m && studioAxes(m).map((v) => v.toFixed(4)).join(', '));
}
