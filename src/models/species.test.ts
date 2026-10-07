import { readFileSync } from 'node:fs';

import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import type { BodyBoneName } from './biped.ts';
import { seated } from './body-frame.ts';
import { HEAD_RINGS, headSurface } from './head.ts';
import { SEATED_ARC } from './layout.ts';
import { MeshBuilder, srgb } from './mesh.ts';
import type { MeshData, Rgb } from './mesh.ts';
import { CHAIR } from './props.ts';
import { BONE_NAMES, boneIndex, makeSkeleton } from './rig.ts';
import { EYE_COLOR, NOSE_COLOR, RABBIT_HEAD_HEIGHT, SPECIES } from './species.ts';
import type { SpeciesId, SpeciesParams } from './species.ts';
import { toVec3 } from './tuples.ts';
import { joinsAtMostOneJoint } from './test-body.ts';
import type { Bounds } from './bounds.ts';

const DESIGN = readFileSync(
  new URL('../../docs/design/04-stage-cast-look.md', import.meta.url),
  'utf8',
);

const IDS = Object.keys(SPECIES).filter((id): id is SpeciesId => id in SPECIES);

/** The species ids of a species name in the tables of design 4.3 and 4.5. */
const NAMES = new Map<string, readonly SpeciesId[]>([
  ['fox (both colors)', ['fox-red', 'fox-tan']],
  ['fox, violins', ['fox-red']],
  ['fox, flutes', ['fox-tan']],
  ['bear (conductor)', ['bear']],
  ['polar bear', ['polar-bear']],
]);

/**
 * Reads the rows of the Markdown table that follows a header line of the design.
 *
 * @param header The exact header line of the table.
 * @returns The cells of each row, with no spaces at the ends.
 */
function tableRows(header: string): string[][] {
  const start = DESIGN.indexOf(`${header}\n`);
  expect(start).toBeGreaterThan(-1);
  const rows: string[][] = [];
  // Skip the header and the separator line.
  for (const line of DESIGN.slice(start).split('\n').slice(2)) {
    if (!line.startsWith('|')) {
      break;
    }
    rows.push(
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  }
  return rows;
}

function idsOf(name: string): readonly SpeciesId[] {
  const ids = NAMES.get(name) ?? IDS.filter((id) => id === name);
  expect(ids.length, `the species "${name}" of the design`).toBeGreaterThan(0);
  return ids;
}

function hexOf(cell: string): string {
  const match = /`(#[0-9a-f]{6})`/.exec(cell);
  expect(match, cell).not.toBeNull();
  return match?.[1] ?? '';
}

/** The mesh and the bones of one species on a chair. */
interface Built {
  readonly mesh: MeshData;
  readonly body: ReturnType<typeof buildBiped>;
}

function build(params: SpeciesParams): Built {
  const builder = new MeshBuilder();
  const body = buildBiped(builder, params, seated(CHAIR.seatHeight));
  return { mesh: builder.build(), body };
}

function hasColor(mesh: MeshData, color: Rgb): boolean {
  for (let v = 0; v < mesh.bones.length; v++) {
    if (color.every((c, k) => Math.abs((mesh.colors[v * 3 + k] ?? 0) - c) < 1e-6)) {
      return true;
    }
  }
  return false;
}

describe('SPECIES', () => {
  it('holds the shape parameters of design 4.3', () => {
    const rows = tableRows('| Species | ears | snout | tail | facePattern |');
    const seen = new Set<SpeciesId>();
    for (const [name = '', ears, snout, tail, facePattern] of rows) {
      for (const id of idsOf(name)) {
        seen.add(id);
        expect({ id, ...SPECIES[id] }).toMatchObject({ id, ears, snout, tail, facePattern });
      }
    }
    expect([...seen].toSorted()).toEqual([...IDS].toSorted());
  });

  it('holds the sizes and the colors of design 4.5', () => {
    const rows = tableRows('| Species | Size | Fur | Belly and face | Accent |');
    const seen = new Set<SpeciesId>();
    for (const [name = '', size = '', fur = '', belly = '', accent = ''] of rows) {
      for (const id of idsOf(name)) {
        seen.add(id);
        expect({ id, size: SPECIES[id].size, ...SPECIES[id].colors }).toEqual({
          id,
          size: Number(size),
          fur: hexOf(fur),
          belly: hexOf(belly),
          accent: hexOf(accent),
        });
      }
    }
    expect([...seen].toSorted()).toEqual([...IDS].toSorted());
  });

  it('gives the meerkat the girth of design 4.3, and the other species 1.0', () => {
    // The meerkat is thin. The round torso of the bear with 1.0 is as wide as in animals.webp.
    const expected = new Map<SpeciesId, number>([['meerkat', 0.75]]);
    for (const id of IDS) {
      const params: SpeciesParams = SPECIES[id];
      expect(params.girth ?? 1, id).toBe(expected.get(id) ?? 1);
    }
  });

  it('holds the accent parts of design 4.5', () => {
    const rows = tableRows('| Species | Accent parts | Species | Accent parts |');
    const seen = new Set<SpeciesId>();
    for (const row of rows) {
      for (const [name = '', parts = ''] of [row.slice(0, 2), row.slice(2, 4)]) {
        if (name === '') {
          continue;
        }
        for (const id of idsOf(name)) {
          seen.add(id);
          expect({ id, parts: [...SPECIES[id].accentParts].toSorted() }).toEqual({
            id,
            parts: parts.split(', ').toSorted(),
          });
        }
      }
    }
    expect([...seen].toSorted()).toEqual([...IDS].toSorted());
  });
});

/**
 * Gives the box around the vertices of one bone, from the head center, in head heights.
 *
 * @param built The species on a chair.
 * @param bone The bone.
 * @param h The head height `H`, in meters.
 * @returns The lowest and the highest values on x, y, and z.
 */
function boneBox(built: Built, bone: string, h: number): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < built.mesh.bones.length; v++) {
    if (BONE_NAMES[built.mesh.bones[v] ?? 0] === bone) {
      for (const k of [0, 1, 2] as const) {
        const p = ((built.mesh.positions[v * 3 + k] ?? 0) - built.body.headCenter[k]) / h;
        min[k] = Math.min(min[k], p);
        max[k] = Math.max(max[k], p);
      }
    }
  }
  return { min, max };
}

describe('the face of the polar bear (design 4.3, 4.5)', () => {
  const polar = build(SPECIES['polar-bear']);
  const bear = build(SPECIES.bear);
  const polarH = RABBIT_HEAD_HEIGHT * SPECIES['polar-bear'].size;
  const bearH = RABBIT_HEAD_HEIGHT * SPECIES.bear.size;

  it('sets small round ears low on the sides of the head', () => {
    // The round ears of the bear rise 0.1 H above the top of the head.
    expect(boneBox(bear, 'earR', bearH).max[1]).toBeGreaterThan(0.55);
    const ear = boneBox(polar, 'earR', polarH);
    expect(ear.max[1]).toBeLessThan(0.42);
    expect(ear.min[1]).toBeGreaterThan(0.15);
    expect(ear.min[0]).toBeGreaterThan(0.35);
    expect(ear.max[0]).toBeLessThan(0.65);
  });

  it('gives a long straight muzzle of 0.27 H in front of the face, with the nose on it', () => {
    const face = Math.max(...HEAD_RINGS.map((ring) => ring.front - (ring.z ?? 0)));
    const reach = (built: Built, h: number) => -boneBox(built, 'head', h).min[2] - face;
    expect(reach(bear, bearH)).toBeLessThan(0.12);
    expect(reach(polar, polarH)).toBeGreaterThan(0.25);
    expect(reach(polar, polarH)).toBeLessThan(0.29);
    // The nose has the black accent color, and it is near the front of the muzzle.
    const nose = srgb(SPECIES['polar-bear'].colors.accent);
    let noseFront = Infinity;
    for (let v = 0; v < polar.mesh.bones.length; v++) {
      if (nose.every((c, k) => Math.abs((polar.mesh.colors[v * 3 + k] ?? 0) - c) < 1e-6)) {
        noseFront = Math.min(noseFront, polar.mesh.positions[v * 3 + 2] ?? 0);
      }
    }
    const front = polar.body.headCenter[2] - noseFront;
    expect(front / polarH).toBeGreaterThan(face + 0.2);
  });

  it('puts the mouth outside the head, under the muzzle', () => {
    const center = new Vector3(...polar.body.headCenter);
    const offset = new Vector3(...polar.body.mouth).sub(center);
    expect(offset.x).toBe(0);
    expect(polar.body.mouth[1]).toBeLessThan(polar.body.positions.eyeR[1]);
    const surface = headSurface(polarH, polar.body.headCenter, toVec3(offset));
    expect(offset.length()).toBeGreaterThan(new Vector3(...surface.point).distanceTo(center));
    let nearest = Infinity;
    for (let v = 0; v < polar.mesh.bones.length; v++) {
      if (polar.mesh.bones[v] === boneIndex('head')) {
        const p = new Vector3(
          polar.mesh.positions[v * 3] ?? 0,
          polar.mesh.positions[v * 3 + 1] ?? 0,
          polar.mesh.positions[v * 3 + 2] ?? 0,
        );
        nearest = Math.min(nearest, p.distanceTo(new Vector3(...polar.body.mouth)));
      }
    }
    expect(nearest).toBeLessThan(0.2 * polarH);
  });
});

describe('buildBiped for each species', () => {
  const bodyBones = BONE_NAMES.filter(
    (name): name is BodyBoneName =>
      !['instrument', 'bow', 'malletL', 'malletR', 'baton', 'slide'].includes(name),
  );

  for (const id of IDS) {
    const species: SpeciesParams = SPECIES[id];
    const { mesh, body } = build(species);
    const h = RABBIT_HEAD_HEIGHT * species.size;

    describe(id, () => {
      it('stays within the body budget of 2,600 triangles (design 4.5)', () => {
        expect(mesh.positions.length / 9).toBeLessThanOrEqual(2600);
      });

      it('puts each triangle on one body joint at most, with faces that point out (4.4)', () => {
        // The trunk grid is one closed part on five bones, and the trunk of the elephant one on
        // three bones, so the parts of each count as one, on its first bone.
        const trunk = new Set((['hips', 'spine', 'chest', 'neck', 'head'] as const).map(boneIndex));
        const nose = new Set((['trunk1', 'trunk2', 'trunk3'] as const).map(boneIndex));
        const volumes = new Map<number, number>();
        const p = mesh.positions;
        for (let t = 0; t < mesh.bones.length / 3; t++) {
          const first = mesh.bones[t * 3] ?? -1;
          const welded = nose.has(first) ? boneIndex('trunk1') : first;
          const bone = trunk.has(first) ? boneIndex('spine') : welded;
          expect(joinsAtMostOneJoint(mesh, t)).toBe(true);
          const at = (k: number): Vector3 =>
            new Vector3(
              p[t * 9 + k * 3] ?? 0,
              p[t * 9 + k * 3 + 1] ?? 0,
              p[t * 9 + k * 3 + 2] ?? 0,
            );
          const volume = at(0).dot(new Vector3().crossVectors(at(1), at(2))) / 6;
          volumes.set(bone, (volumes.get(bone) ?? 0) + volume);
        }
        for (const [bone, volume] of volumes) {
          expect(bodyBones).toContain(BONE_NAMES[bone]);
          expect(volume, BONE_NAMES[bone]).toBeGreaterThan(0);
        }
      });

      it('places each body bone, and makes a skeleton of the 38 bones of design 4.7', () => {
        expect(Object.keys(body.positions).toSorted()).toEqual([...bodyBones].toSorted());
        const skeleton = makeSkeleton(
          {
            ...body.positions,
            instrument: body.headCenter,
            bow: body.palmR,
            malletL: body.palmL,
            malletR: body.palmR,
            baton: body.palmR,
            slide: body.headCenter,
          },
          'chest',
        );
        expect(skeleton.positions).toHaveLength(38);
        expect(skeleton.parents.filter((parent) => parent === -1)).toHaveLength(1);
      });

      it('puts the top of the head 2.3 H above the seat, with H = 0.38 m × size', () => {
        expect(body.headHeight).toBeCloseTo(0.38 * species.size, 12);
        expect(body.headCenter[1] + 0.5 * h).toBeCloseTo(CHAIR.seatHeight + 2.3 * h, 9);
        // A face pattern lies a little above the head surface. The antlers of the deer rise
        // above the head.
        let top = -Infinity;
        for (let v = 0; v < mesh.bones.length; v++) {
          if (BONE_NAMES[mesh.bones[v] ?? 0] === 'head') {
            top = Math.max(top, mesh.positions[v * 3 + 1] ?? -Infinity);
          }
        }
        expect(top).toBeGreaterThanOrEqual(CHAIR.seatHeight + 2.3 * h - 1e-6);
        // The boxes of the stripe of the badger stand a little above the flat crown.
        if (species.ears !== 'antlered') {
          expect(top).toBeLessThan(CHAIR.seatHeight + 2.37 * h);
        }
      });

      it('uses the colors of design 4.5', () => {
        expect(hasColor(mesh, srgb(species.colors.fur))).toBe(true);
        expect(hasColor(mesh, srgb(species.colors.belly))).toBe(true);
        expect(hasColor(mesh, srgb(species.colors.accent))).toBe(true);
        expect(hasColor(mesh, srgb(EYE_COLOR))).toBe(true);
        // The trunk and the beak have no nose ball, and an accent nose has the accent color.
        const ownNose =
          !species.accentParts.includes('nose') &&
          species.snout !== 'trunk' &&
          species.snout !== 'beak';
        expect(hasColor(mesh, srgb(NOSE_COLOR))).toBe(ownNose);
      });

      it('fits the seat arc of 0.95 m, so that neighbors do not touch (review of step 3, F12)', () => {
        let halfWidth = 0;
        for (let v = 0; v < mesh.bones.length; v++) {
          halfWidth = Math.max(halfWidth, Math.abs(mesh.positions[v * 3] ?? 0));
        }
        expect(2 * halfWidth).toBeLessThan(SEATED_ARC);
      });
    });
  }
});
