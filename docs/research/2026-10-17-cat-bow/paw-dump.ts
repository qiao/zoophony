/**
 * Dumps the posed right paw, the forearm, and the bow of one player of a bowed sweep for a
 * render of the grip: node docs/research/2026-10-17-cat-bow/paw-dump.ts <role> <demo|soloist-<species>> <species> <out.json>
 *   [--set <changes>]
 */
import { writeFileSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';

import { boneIndex } from '../../../src/models/rig.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES, soloistScene } from '../../../src/pose/test-sweep-roles.ts';
import type { SweepSample } from '../../../src/pose/test-sweep.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import type { SpeciesId } from '../../../src/models/species.ts';

const args = process.argv.slice(2);
const [role, where, species, out] = args as ['violist' | 'violinist', string, SpeciesId, string];
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const changes = pick('--set');
const restore = changes.length > 0 ? setHolds(changes.join(';')).undo : null;
const sweep = SWEEP_ROLES[role];
const scene = where.startsWith('soloist-')
  ? soloistScene(role, species)
  : sceneOf((await patchedDemo(`${where}.mid`)).bytes);
const player = sweep
  .players(scene)
  .find((p) => scene.layout.players[Number(/(\d+)/.exec(p.name)?.[1])]?.cast.species === species);
if (!player) {
  throw new Error('no player');
}
const sets = sweep.sampleSets(scene).map((s) => ({ name: s.name, samples: [...s.samples] }));
const pickSample = (name: string, k: number): SweepSample => {
  const list = [...(sets.find((s) => s.name === name)?.samples ?? [])];
  const s = list[Math.min(k, list.length - 1)];
  if (!s) {
    throw new Error(name);
  }
  return s;
};
const moments: Record<string, SweepSample> = {
  rest: pickSample('rest', 0),
  play: pickSample('play', 40),
  play2: pickSample('play', 90),
  lift50: pickSample('lift', 6),
};
const wanted = new Set(['forearmR', 'handR', 'fingersR', 'bow'].map(boneIndex));
const result: Record<string, unknown> = {};
for (const [name, sample] of Object.entries(moments)) {
  const posed = poseSkeleton(player.model, player.poseAt(sample));
  const { bones, colors } = posed.model.mesh;
  const hand = posed.frames[boneIndex('handR')];
  const inv = new Quaternion().copy(hand!.rotation).invert();
  const origin = hand!.position.clone();
  const tris: number[][] = [];
  for (let c = 0; c + 2 < bones.length; c += 3) {
    const b = bones[c] ?? 0;
    if (!wanted.has(b)) {
      continue;
    }
    const corners = [0, 1, 2].map((k) =>
      new Vector3(...posedCorner(posed, c + k)).sub(origin).applyQuaternion(inv).toArray(),
    );
    tris.push([
      ...corners.flat(),
      colors[c * 3] ?? 0,
      colors[c * 3 + 1] ?? 0,
      colors[c * 3 + 2] ?? 0,
      b === boneIndex('bow') ? 1 : 0,
    ]);
  }
  result[name] = { tris, sample };
}
writeFileSync(out, JSON.stringify(result));
restore?.();
