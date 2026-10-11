// Prints the leg measures of the parametric body of each player of the section cast and of the
// conductor, in head heights H (docs/research/2026-10-11-short-legs.md, section 4).
//
// Usage, from the root of the repository: node docs/research/scripts/short-legs/measure.ts
import { SECTION_INSTRUMENTS, SECTION_SPECIES } from '../../../../src/models/cast.ts';
import type { MeshData } from '../../../../src/models/mesh.ts';
import { buildPlayer } from '../../../../src/models/player.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import type { BoneName } from '../../../../src/models/rig.ts';

/** The height of the top of the foot above the sole, in H (`FOOT.height` of legs.ts). */
const FOOT_TOP = 0.25;

/**
 * Gives the corners of the mesh on some bones.
 *
 * @param mesh The mesh.
 * @param bones The bones.
 * @returns The corners.
 */
function corners(mesh: MeshData, bones: readonly BoneName[]): number[][] {
  const set = new Set(bones.map((b) => boneIndex(b)));
  const out: number[][] = [];
  for (let c = 0; c < mesh.bones.length; c++) {
    if (set.has(mesh.bones[c] ?? -1)) {
      out.push([mesh.positions[3 * c] ?? 0, mesh.positions[3 * c + 1] ?? 0, mesh.positions[3 * c + 2] ?? 0]);
    }
  }
  return out;
}

const cast: [string, string][] = Object.entries(SECTION_SPECIES).flatMap(([section, species]) =>
  species.map((s): [string, string] => [s, SECTION_INSTRUMENTS[section as keyof typeof SECTION_INSTRUMENTS][0]]),
);
cast.push(['bear', 'baton']);

for (const [species, instrument] of cast) {
  // @ts-expect-error The ids come from the cast tables.
  const p = buildPlayer(species, instrument);
  const h = p.body.headHeight;
  const { shinR: knee, thighR: hip, upperArmR: shoulder } = p.body.positions;
  const seated = p.support !== 'stand' && p.support !== 'riser';
  const sole = Math.min(...corners(p.mesh, ['footR', 'shinR']).map((c) => c[1] ?? 0));
  const base = seated ? hip[1] - 0.3 * h : hip[1] - 0.17 * h;
  const crown = Math.max(...corners(p.mesh, ['head']).map((c) => c[1] ?? 0));
  const back = Math.max(
    ...corners(p.mesh, ['hips', 'spine'])
      .filter((c) => (c[1] ?? 0) < base + 0.3 * h)
      .map((c) => c[2] ?? 0),
  );
  const shin = corners(p.mesh, ['shinR']);
  const kneeFront = Math.min(...shin.map((c) => c[2] ?? 0));
  const kneeTop = Math.max(...shin.filter((c) => (c[1] ?? 0) > knee[1] - 0.05 * h).map((c) => c[1] ?? 0));
  const f = (v: number): string => (v / h).toFixed(2);
  console.log(
    [
      species.padEnd(10),
      instrument.padEnd(12),
      p.support.padEnd(10),
      `H ${h.toFixed(3)} m`,
      `base ${f(base - sole)} (${(base - sole).toFixed(3)} m)`,
      `crown ${f(crown - base)}`,
      `shoulder ${f(shoulder[1] - base)}`,
      `knee ${f(knee[1] - base)}`,
      `knee top ${f(kneeTop - base)}`,
      `knee front ${f(back - kneeFront)}`,
      `shin to foot top ${f(knee[1] - sole - FOOT_TOP * h)}`,
    ].join('  '),
  );
}
