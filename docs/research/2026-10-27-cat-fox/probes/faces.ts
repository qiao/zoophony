/** Prints the bind middle and the corner weights of faces of the studio body of a role. Usage: node scratch/faces.ts <role> <face>... */
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { probeDemos } from '../tools/probe-demos.ts';

const [roleName, ...faces] = process.argv.slice(2);
const role = FOLD_ROLES.get(roleName!)!;
const demos = (await probeDemos()).slice(0, 1);
let done = false;
probeFolds(role, demos, 1000, (rig) => {
  if (done) return;
  done = true;
  const m = rig.mesh;
  for (const f of faces.map(Number)) {
    const cs = [m.corners[f * 3]!, m.corners[f * 3 + 1]!, m.corners[f * 3 + 2]!];
    const mid = [0, 1, 2].map((k) => cs.reduce((s, v) => s + m.positions[v * 3 + k]!, 0) / 3);
    const ws = cs.map((v) => {
      const parts: string[] = [];
      for (let k = 0; k < 4; k++) {
        const w = m.weights[v * 4 + k]!;
        if (w > 0.02) parts.push(`${STUDIO_BONES[m.joints[v * 4 + k]!]} ${w.toFixed(2)}`);
      }
      return `v${v}: ${parts.join(' ')}`;
    });
    console.log(`face ${f} middle ${mid.map((x) => x.toFixed(3)).join(', ')} | ${ws.join(' | ')}`);
  }
}, ['rest']);
