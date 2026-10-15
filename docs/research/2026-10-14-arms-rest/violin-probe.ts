/**
 * Measures the violin of the first seated rabbit and red fox of a demo against the neck, the
 * head, and the body, at each play time of a step, with the hold of the working tree and each
 * variant of `--set` (the syntax of `pnpm pose-depth --set`):
 *
 * - the gap from the neck triangles (main bone `neck`) to the closed violin, and from the head
 *   (`HEAD_BONES`) to the closed violin: 0 when they touch;
 * - the deepest corner of the violin in the closed body (the bones of the sweep body).
 *
 * It prints the smallest, the median, and the largest value over the times.
 *
 * Usage: node docs/research/2026-10-14-arms-rest/violin-probe.ts [--demo <file>] [--step <s>] [--set '<changes>']...
 */
import { Vector3 } from 'three';

import type { BoneName } from '../../../src/models/rig.ts';
import {
  HEAD_BONES,
  closeSurface,
  closedDepth,
  closedPart,
  openLoops,
  posedPart,
  surfaceGap,
} from '../../../src/pose/test-clearance.ts';
import { posedAt } from '../../../src/pose/test-kinematics.ts';
import { demoSceneOf } from '../../../src/pose/test-scene.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const arg = (name: string, value: string): string => {
  const i = process.argv.indexOf(name);
  return i > 0 ? (process.argv[i + 1] ?? value) : value;
};
const sets = process.argv.flatMap((a, i) => (process.argv[i - 1] === '--set' ? [a] : []));
const demo = arg('--demo', 'beethoven-9.mid');
const step = Number(arg('--step', '7'));
const BODY: BoneName[] = ['hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR', 'tail1', 'tail2', 'shoulderL', 'shoulderR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'];

const stats = (values: number[]): string => {
  const s = values.toSorted((a, b) => a - b);
  const cm = (v: number | undefined): string => ((v ?? NaN) * 100).toFixed(1);
  return `min ${cm(s[0])}, median ${cm(s[Math.floor(s.length / 2)])}, max ${cm(s[s.length - 1])} cm`;
};

for (const variant of ['', ...sets]) {
  const changes = variant ? setHolds(variant) : null;
  const scene = await demoSceneOf(demo);
  console.log(`\n${variant || 'base'} (${demo}, every ${step} s):`);
  for (const species of ['rabbit', 'fox-red'] as const) {
    const index = scene.layout.players.findIndex(
      (p) => p.cast.species === species && p.cast.instrument === 'violin' && p.cast.support !== 'stand',
    );
    if (index < 0) {
      continue;
    }
    const player = { index, model: scene.models.get(species, 'violin', scene.layout.players[index]?.cast.kettles ?? 0, 'chair') };
    const neckGaps: number[] = [];
    const headGaps: number[] = [];
    const depths: number[] = [];
    const headIn: number[] = [];
    for (let t = 2; t < scene.score.durationSec; t += step) {
      const posed = posedAt(scene, player as never, t);
      const part = posedPart(posed, ['instrument']);
      const shells = (part.closed?.() ?? [part]).filter((sh) => openLoops(sh.triangles) === 0);
      const violin = closeSurface(shells.flatMap((sh) => sh.triangles), 0);
      neckGaps.push(surfaceGap(posedPart(posed, ['neck']).triangles, violin, 0.3).gap);
      headGaps.push(surfaceGap(posedPart(posed, HEAD_BONES).triangles, violin, 0.3).gap);
      const trunkBones = BODY.filter((b) => !(HEAD_BONES as readonly string[]).includes(b));
      let body = null;
      for (let loops = 1; loops < 12 && !body; loops++) {
        try {
          body = closedPart(posed, trunkBones, loops);
        } catch {
          body = null;
        }
      }
      if (!body) {
        throw new Error('no trunk loops');
      }
      const corners = part.triangles.flatMap((tri) => [tri.a, tri.b, tri.c]).map((p) => new Vector3().copy(p));
      depths.push(closedDepth(corners, body).depth);
      const head = posedPart(posed, [...HEAD_BONES, 'neck']).triangles.flatMap((tri) => [tri.a, tri.b, tri.c]);
      headIn.push(closedDepth(head, violin).depth);
    }
    console.log(`  ${species} (${neckGaps.length} times): neck to violin ${stats(neckGaps)}`);
    console.log(`  ${species}: head to violin ${stats(headGaps)}`);
    console.log(`  ${species}: violin into the trunk (no head) ${stats(depths)}`);
    console.log(`  ${species}: head and neck into the violin ${stats(headIn)}`);
  }
  changes?.undo();
}
