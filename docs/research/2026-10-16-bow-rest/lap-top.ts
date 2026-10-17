/**
 * Prints the top of each part of the skin over the right thigh of the seated rabbit and red fox, in
 * the bind pose: the highest crossing of the vertical line at each place along the thigh with the
 * triangles of the thigh, the shin, the hips, and the spine (-1 for none).
 *
 * Usage, from the root of the worktree: `node docs/research/2026-10-16-bow-rest/lap-top.ts`
 */
import { Vector3 } from 'three';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';

for (const species of ['rabbit', 'fox-red'] as SpeciesId[]) {
  const model = buildPlayer(species, 'violin', 4, 'chair');
  const { positions, bones } = model.mesh;
  const names = ['thighR', 'shinR', 'hips', 'spine'];
  const hip = new Vector3(...(model.skeleton.positions[boneIndex('thighR')] ?? [0, 0, 0]));
  const knee = new Vector3(...(model.skeleton.positions[boneIndex('shinR')] ?? [0, 0, 0]));
  for (const along of [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1]) {
    const p = hip.clone().lerp(knee, along);
    const tops: string[] = [];
    for (const name of names) {
      const b = boneIndex(name as 'hips');
      let top = -1;
      for (let v = 0; v + 2 < bones.length; v += 3) {
        if (bones[v] !== b) continue;
        const c = (i: number, k: number): number => positions[(v + i) * 3 + k] ?? 0;
        const [ax, az, bx, bz, cx, cz] = [c(0, 0), c(0, 2), c(1, 0), c(1, 2), c(2, 0), c(2, 2)];
        const area = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
        if (Math.abs(area) < 1e-12) continue;
        const wb = ((p.x - ax) * (cz - az) - (cx - ax) * (p.z - az)) / area;
        const wc = ((bx - ax) * (p.z - az) - (p.x - ax) * (bz - az)) / area;
        const wa = 1 - wb - wc;
        if (wa >= 0 && wb >= 0 && wc >= 0) top = Math.max(top, wa * c(0, 1) + wb * c(1, 1) + wc * c(2, 1));
      }
      tops.push(`${name} ${top.toFixed(3)}`);
    }
    console.log(`${species} along ${along}: x ${p.x.toFixed(3)} z ${p.z.toFixed(3)} | ${tops.join(' | ')}`);
  }
}
