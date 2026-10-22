/**
 * Prints the open loops of the closed body of the sweeps (the trunk, the head, the tail, the legs,
 * and the shoulders) of the bind mesh of the polar bear, as `planSurface()`
 * of `pose/test-clearance.ts` finds them: the boundary edges that share a vertex are in one loop.
 * Each loop gives its edges, its length, its middle, and the main bones of its triangles. Usage:
 *
 *     node docs/research/2026-10-22-mesh-polar-bear/loops-probe.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { BONE_NAMES, boneIndex } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';

const BODY = [
  'hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR', 'tail1',
  'tail2', 'shoulderL', 'shoulderR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR',
] as const;

for (const [species, instrument] of [
  ['polar-bear', 'piano'],
] as const satisfies readonly (readonly [SpeciesId, 'piano'])[]) {
  const { mesh } = buildPlayer(species, instrument, 4, 'bench');
  const wanted = new Set(BODY.map((b) => boneIndex(b)));
  const key = (v: number): string =>
    `${mesh.positions[v * 3]} ${mesh.positions[v * 3 + 1]} ${mesh.positions[v * 3 + 2]}`;
  const edges = new Map<string, { uses: number; a: number; b: number; bone: number }>();
  for (let v = 0; v < mesh.bones.length; v += 3) {
    const bone = mesh.bones[v] ?? -1;
    if (!wanted.has(bone)) {
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const a = v + k;
      const b = v + ((k + 1) % 3);
      const ka = key(a);
      const kb = key(b);
      const id = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const edge = edges.get(id);
      if (edge) {
        edge.uses++;
      } else {
        edges.set(id, { uses: 1, a, b, bone });
      }
    }
  }
  const open = [...edges.values()].filter((e) => e.uses === 1);
  const parent = new Map<string, string>();
  const root = (k: string): string => {
    let r = k;
    while (parent.get(r) !== r) {
      r = parent.get(r) ?? r;
    }
    return r;
  };
  for (const e of open) {
    for (const k of [key(e.a), key(e.b)]) {
      if (!parent.has(k)) {
        parent.set(k, k);
      }
    }
    parent.set(root(key(e.a)), root(key(e.b)));
  }
  const loops = new Map<string, typeof open>();
  for (const e of open) {
    const r = root(key(e.a));
    loops.set(r, [...(loops.get(r) ?? []), e]);
  }
  console.log(`${species}: ${loops.size} open loops`);
  for (const loop of loops.values()) {
    let length = 0;
    const mid = [0, 0, 0];
    const bones = new Map<string, number>();
    for (const e of loop) {
      const p = [0, 1, 2].map((i) => mesh.positions[e.a * 3 + i] ?? 0);
      const q = [0, 1, 2].map((i) => mesh.positions[e.b * 3 + i] ?? 0);
      length += Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
      for (let i = 0; i < 3; i++) {
        mid[i]! += (p[i]! + q[i]!) / 2 / loop.length;
      }
      const name = BONE_NAMES[e.bone] ?? String(e.bone);
      bones.set(name, (bones.get(name) ?? 0) + 1);
    }
    console.log(
      `  ${loop.length} edges, length ${length.toFixed(3)} m, middle ${mid.map((x) => x.toFixed(3)).join(', ')}, bones ${[...bones].map(([b, n]) => `${b} ${n}`).join(', ')}`,
    );
  }
}
