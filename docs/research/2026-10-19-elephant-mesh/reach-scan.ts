/**
 * Scans variants of the kettles and of the timpani hold of the elephant: for each line of a file
 * of variants (the changes of `--set`, separated by `;`), the share of the strikes whose mallet
 * head is within 5 mm of its target, by demo, and the worst error. The hands rule is `sides` when
 * the line holds `timpani.hands=sides`, and `alternate` else, because `--set` takes no text.
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-19-elephant-mesh/reach-scan.ts <variants.txt>
 */
import { setHolds } from '../../../tools/hold-sets.ts';
import { PERCUSSION_HOLDS } from '../../../src/pose/percussion-rig.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { TIMPANIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';

const ids = (process.env.DEMOS ?? 'beethoven-1,beethoven-8-4,beethoven-9,brahms-2').split(',');
const demos = (await patchedDemos()).filter((d) => ids.includes(d.file.replace('.mid', '')));
const lines = (await import('node:fs')).readFileSync(process.argv[2]!, 'utf8').split('\n').filter((l) => l.trim());
for (const v of lines) {
  const sides = v.includes('timpani.hands=sides');
  Reflect.set(PERCUSSION_HOLDS.timpani, 'hands', sides ? 'sides' : 'alternate');
  const rest = v.split(';').filter((c) => !c.startsWith('timpani.hands=')).join(';');
  const changes = v === 'base' || rest === '' ? null : setHolds(rest);
  let n = 0, over = 0, worst = 0;
  const per: string[] = [];
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes);
    for (const p of TIMPANIST_SWEEP.players(scene)) {
      let dn = 0, dover = 0;
      for (const t of p.targets()) {
        const e = t.error(poseSkeleton(p.model, p.poseAt(t.sample)));
        n++; dn++;
        if (e > 0.005) { over++; dover++; }
        worst = Math.max(worst, e);
      }
      per.push(`${(100 * (1 - dover / dn)).toFixed(0)}%`);
    }
  }
  console.log(`${(100 * (1 - over / n)).toFixed(1)}% reached (${per.join(' ')}), worst ${(worst * 100).toFixed(1)} cm | ${v}`);
  changes?.undo();
}
