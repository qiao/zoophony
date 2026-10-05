import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { FLAP_EAR_ANGLE } from './ears.ts';
import { RHINO_HORN_AXIS } from './snouts.ts';
import type { BodyBones } from './biped.ts';
import { cross, dot, length, normalize, sub } from './math.ts';
import type { Vec3 } from './math.ts';
import { MeshBuilder, srgb } from './mesh.ts';
import type { MeshData, Rgb } from './mesh.ts';
import { BONE_NAMES, boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { SPECIES } from './species.ts';
import type { AccentPart, SpeciesParams } from './species.ts';

const SEAT = 0.45;

/** The head height `H` of the rabbit (design 4.5, body proportions). */
const H = 0.38;

/** The mesh and the bones of the rabbit body. */
interface RabbitBody {
  readonly mesh: MeshData;
  readonly positions: BodyBones['positions'];
}

function rabbit(): RabbitBody {
  const builder = new MeshBuilder();
  const body = buildBiped(builder, SPECIES.rabbit, SEAT);
  return { mesh: builder.build(), positions: body.positions };
}

/** Finds the lowest vertex of the parts that follow one bone. */
function bottomOf(mesh: MeshData, bone: BoneName): number {
  let bottom = Infinity;
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      bottom = Math.min(bottom, mesh.positions[v * 3 + 1] ?? Infinity);
    }
  }
  return bottom;
}

/** Finds the highest vertex of the parts that follow one bone. */
function topOf(mesh: MeshData, bone: BoneName): number {
  let top = -Infinity;
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      top = Math.max(top, mesh.positions[v * 3 + 1] ?? -Infinity);
    }
  }
  return top;
}

/** The smallest and the largest x, y, and z of the parts that follow one bone. */
interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

function boundsOf(mesh: MeshData, bone: BoneName): Bounds {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] !== boneIndex(bone)) {
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const value = mesh.positions[v * 3 + k] ?? 0;
      min[k] = Math.min(min[k] ?? Infinity, value);
      max[k] = Math.max(max[k] ?? -Infinity, value);
    }
  }
  return {
    min: [min[0] ?? 0, min[1] ?? 0, min[2] ?? 0],
    max: [max[0] ?? 0, max[1] ?? 0, max[2] ?? 0],
  };
}

/** Counts the triangles that follow one bone. */
function trianglesOn(mesh: MeshData, bone: BoneName): number {
  let count = 0;
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    if (mesh.bones[t * 3] === boneIndex(bone)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculates the signed volume of the triangles of one bone. It is larger than 0 when the
 * corners of each closed part go counterclockwise when seen from outside.
 */
function volumeOn(mesh: MeshData, bone: BoneName): number {
  let volume = 0;
  const p = mesh.positions;
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    if (mesh.bones[t * 3] !== boneIndex(bone)) {
      continue;
    }
    const at = (k: number): Vec3 => [
      p[t * 9 + k * 3] ?? 0,
      p[t * 9 + k * 3 + 1] ?? 0,
      p[t * 9 + k * 3 + 2] ?? 0,
    ];
    volume += dot(at(0), cross(at(1), at(2))) / 6;
  }
  return volume;
}

/** Finds the largest distance of a vertex of one bone from a point. */
function reachFrom(mesh: MeshData, bone: BoneName, from: Vec3): number {
  let reach = 0;
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      const p: Vec3 = [
        mesh.positions[v * 3] ?? 0,
        mesh.positions[v * 3 + 1] ?? 0,
        mesh.positions[v * 3 + 2] ?? 0,
      ];
      reach = Math.max(reach, length(sub(p, from)));
    }
  }
  return reach;
}

/** Finds the largest distance between two vertices of one bone. */
function spanOf(mesh: MeshData, bone: BoneName): number {
  const points: Vec3[] = [];
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      points.push([
        mesh.positions[v * 3] ?? 0,
        mesh.positions[v * 3 + 1] ?? 0,
        mesh.positions[v * 3 + 2] ?? 0,
      ]);
    }
  }
  let span = 0;
  for (const a of points) {
    for (const b of points) {
      span = Math.max(span, length(sub(a, b)));
    }
  }
  return span;
}

/** Finds the vertices of one color, on all bones or on a list of bones. */
function verticesWithColor(mesh: MeshData, color: Rgb, bones?: readonly BoneName[]): Vec3[] {
  const found: Vec3[] = [];
  const wanted = bones?.map(boneIndex);
  for (let v = 0; v < mesh.bones.length; v++) {
    if (wanted && !wanted.includes(mesh.bones[v] ?? -1)) {
      continue;
    }
    const same = color.every((c, k) => Math.abs((mesh.colors[v * 3 + k] ?? 0) - c) < 1e-6);
    if (same) {
      found.push([
        mesh.positions[v * 3] ?? 0,
        mesh.positions[v * 3 + 1] ?? 0,
        mesh.positions[v * 3 + 2] ?? 0,
      ]);
    }
  }
  return found;
}

/** Builds the body of a variant of the rabbit. */
function variant(change: Partial<SpeciesParams>): BuiltBody {
  const builder = new MeshBuilder();
  const body = buildBiped(builder, { ...SPECIES.rabbit, ...change }, SEAT);
  return { mesh: builder.build(), body };
}

/** The mesh and the bones of one body. */
interface BuiltBody {
  readonly mesh: MeshData;
  readonly body: BodyBones;
}

const SNOUT_TYPES: readonly SpeciesParams['snout'][] = [
  'short',
  'long',
  'trunk',
  'flat-nose',
  'horn',
  'beak',
];

const TAIL_TYPES: readonly SpeciesParams['tail'][] = [
  'none',
  'puff',
  'bushy',
  'ringed',
  'thin',
  'flat',
];

const FACE_PATTERNS: readonly SpeciesParams['facePattern'][] = [
  'none',
  'mask',
  'eye-patches',
  'stripe',
  'forehead-stripes',
];

const EAR_TYPES: readonly SpeciesParams['ears'][] = [
  'long',
  'pointed',
  'round',
  'large-round',
  'floppy',
  'large-flap',
  'small',
  'none',
];

describe('buildBiped', () => {
  it('builds the rabbit body within the budget of 1,200 triangles (design 4.5)', () => {
    const { mesh } = rabbit();
    expect(mesh.positions.length / 9).toBeLessThanOrEqual(1200);
  });

  it('makes each part rigid: the three corners of a triangle follow one bone (design 4.4)', () => {
    const { mesh } = rabbit();
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      expect(mesh.bones[t * 3 + 1]).toBe(mesh.bones[t * 3]);
      expect(mesh.bones[t * 3 + 2]).toBe(mesh.bones[t * 3]);
    }
  });

  it('puts the top of the head 2.4 H above the seat, with H 0.38 m (design 4.5)', () => {
    const { mesh } = rabbit();
    expect(topOf(mesh, 'head')).toBeCloseTo(SEAT + 2.4 * H, 6);
  });

  it('puts the torso above the chest bone on `chest`, with the arms (design 4.7)', () => {
    const { mesh, positions } = rabbit();
    const chest = positions.chest[1];
    expect(chest).toBeCloseTo(SEAT + 0.8 * H, 9);
    expect(bottomOf(mesh, 'chest')).toBeCloseTo(chest, 6);
    expect(topOf(mesh, 'chest')).toBeCloseTo(SEAT + 1.45 * H, 6);
    expect(topOf(mesh, 'spine')).toBeCloseTo(chest, 6);
    expect(bottomOf(mesh, 'spine')).toBeCloseTo(SEAT, 6);
  });

  it('gives the long ears 1.1 H on the ear bones (design 4.5)', () => {
    const { mesh, positions } = rabbit();
    // The ears lean back and out, so their height is a little less than their length.
    const earHeight = topOf(mesh, 'earL') - positions.earL[1];
    expect(earHeight).toBeGreaterThan(1.05 * H);
    expect(earHeight).toBeLessThanOrEqual(1.1 * H);
  });

  it('rests the feet on the floor for each size and seat height (design 4.5)', () => {
    for (const size of [0.75, 1, 1.35]) {
      for (const seat of [SEAT, 0.6]) {
        const builder = new MeshBuilder();
        buildBiped(builder, { ...SPECIES.rabbit, size }, seat);
        const mesh = builder.build();
        // The mesh data holds 32-bit floats.
        expect(bottomOf(mesh, 'footL')).toBeCloseTo(0, 6);
        expect(bottomOf(mesh, 'footR')).toBeCloseTo(0, 6);
      }
    }
  });

  it('puts the left side of the animal at -x, because it faces -z', () => {
    const { positions } = rabbit();
    expect(positions.upperArmL[0]).toBeLessThan(0);
    expect(positions.upperArmR[0]).toBeGreaterThan(0);
    expect(positions.shinL[2]).toBeLessThan(positions.thighL[2]);
  });

  it('gives the arm segments of design 4.5: 0.6 H and 0.55 H', () => {
    const { positions } = rabbit();
    expect(positions.upperArmL[1] - positions.forearmL[1]).toBeCloseTo(0.6 * H, 9);
    expect(positions.forearmL[1] - positions.handL[1]).toBeCloseTo(0.55 * H, 9);
  });

  it('places a bone for each body bone of the rig', () => {
    const { positions } = rabbit();
    const instrumentBones = new Set(['instrument', 'bow', 'malletL', 'malletR', 'baton', 'slide']);
    const bodyBones = BONE_NAMES.filter((name) => !instrumentBones.has(name));
    expect(Object.keys(positions).toSorted()).toEqual(bodyBones.toSorted());
  });

  it('builds each ear type on the ear bones, with the left ear as the mirror image of the right', () => {
    for (const ears of EAR_TYPES) {
      const { mesh, body } = variant({ ears });
      const left = boundsOf(mesh, 'earL');
      const right = boundsOf(mesh, 'earR');
      expect(trianglesOn(mesh, 'earL')).toBe(trianglesOn(mesh, 'earR'));
      expect(body.positions.earL[0]).toBeCloseTo(-body.positions.earR[0], 9);
      if (ears === 'none') {
        expect(trianglesOn(mesh, 'earR')).toBe(0);
        continue;
      }
      expect(trianglesOn(mesh, 'earR')).toBeGreaterThan(0);
      expect(left.min[0]).toBeCloseTo(-right.max[0], 6);
      expect(left.max[1]).toBeCloseTo(right.max[1], 6);
      // The faces of each part point out, also on the mirror side.
      expect(volumeOn(mesh, 'earL')).toBeGreaterThan(0);
      expect(volumeOn(mesh, 'earR')).toBeCloseTo(volumeOn(mesh, 'earL'), 9);
    }
  });

  it('gives the ears the sizes of design 4.5', () => {
    // A pointed ear reaches 0.45 H from its base.
    const pointed = variant({ ears: 'pointed' });
    expect(reachFrom(pointed.mesh, 'earR', pointed.body.positions.earR)).toBeCloseTo(0.45 * H, 6);
    // The disc ears are 0.3, 0.45, and 0.2 H wide.
    for (const [ears, width] of [
      ['round', 0.3],
      ['large-round', 0.45],
      ['small', 0.2],
    ] as const) {
      const { mesh } = variant({ ears });
      expect(spanOf(mesh, 'earR')).toBeCloseTo(width * H, 6);
    }
    // A floppy ear hangs 0.5 H down from its base.
    const floppy = variant({ ears: 'floppy' });
    const drop = floppy.body.positions.earR[1] - boundsOf(floppy.mesh, 'earR').min[1];
    expect(drop).toBeGreaterThan(0.4 * H);
    expect(drop).toBeLessThan(0.5 * H);
  });

  it('makes the large-flap ear 0.9 H wide and no higher than the head, with the inner ear in front', () => {
    const { mesh, body } = variant({ ears: 'large-flap', accentParts: ['inner-ears'] });
    const { min, max } = boundsOf(mesh, 'earR');
    const back: Vec3 = [Math.sin(FLAP_EAR_ANGLE), 0, Math.cos(FLAP_EAR_ANGLE)];
    // The plate is 0.06 H thick, so its extent along `back` is a little more than 0.9 H.
    const width = (max[0] - min[0]) * back[0] + (max[2] - min[2]) * back[2];
    expect(width).toBeGreaterThan(0.9 * H);
    expect(width).toBeLessThan(1.0 * H);
    // The ear does not reach above the head.
    expect(max[1]).toBeLessThanOrEqual(body.headCenter[1] + 0.5 * H);
    // The vertices of the inner ear are in front of the plate.
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const front: Vec3 = [Math.cos(FLAP_EAR_ANGLE), 0, -Math.sin(FLAP_EAR_ANGLE)];
    const inner: number[] = [];
    const outer: number[] = [];
    for (let v = 0; v < mesh.bones.length; v++) {
      if (mesh.bones[v] !== boneIndex('earR')) {
        continue;
      }
      const p: Vec3 = [
        mesh.positions[v * 3] ?? 0,
        mesh.positions[v * 3 + 1] ?? 0,
        mesh.positions[v * 3 + 2] ?? 0,
      ];
      const isInner = Math.abs((mesh.colors[v * 3] ?? 0) - accent[0]) < 1e-6;
      (isInner ? inner : outer).push(dot(p, front));
    }
    expect(inner.length).toBeGreaterThan(0);
    expect(Math.min(...inner)).toBeGreaterThan(Math.max(...outer) - 1e-6);
  });

  it('builds each snout type on the head, with faces that point out', () => {
    for (const snout of SNOUT_TYPES) {
      const { mesh } = variant({ snout });
      expect(mesh.positions.length / 9).toBeLessThanOrEqual(1200);
      expect(volumeOn(mesh, 'head')).toBeGreaterThan(0);
      // Only the beak has a part on the jaw, and only the trunk has parts on the trunk bones.
      expect(trianglesOn(mesh, 'jaw') > 0).toBe(snout === 'beak');
      for (const bone of ['trunk1', 'trunk2', 'trunk3'] as const) {
        expect(trianglesOn(mesh, bone) > 0).toBe(snout === 'trunk');
      }
    }
  });

  it('gives the long snout and the beak their lengths in front of the face (design 4.5)', () => {
    for (const [snout, reach] of [
      ['long', 0.45],
      ['beak', 0.3],
    ] as const) {
      const { mesh, body } = variant({ snout });
      const front = Math.min(boundsOf(mesh, 'head').min[2], boundsOf(mesh, 'jaw').min[2]);
      // The face is 0.45 H in front of the head center.
      const reachInFront = body.headCenter[2] - 0.45 * H - front;
      expect(reachInFront).toBeGreaterThan(reach * H - 0.02 * H);
      expect(reachInFront).toBeLessThan(reach * H + 0.02 * H);
    }
  });

  it('builds the trunk of 1.4 H on three bones (design 4.5)', () => {
    const { mesh, body } = variant({ snout: 'trunk' });
    const p = body.positions;
    expect(length(sub(p.trunk2, p.trunk1))).toBeCloseTo(0.5 * H, 9);
    expect(length(sub(p.trunk3, p.trunk2))).toBeCloseTo(0.5 * H, 9);
    // The last segment is 0.4 H long, and its tip has a radius of 0.08 H.
    expect(reachFrom(mesh, 'trunk3', p.trunk3)).toBeCloseTo(Math.hypot(0.4, 0.08) * H, 6);
    // The trunk starts low on the face, hangs down in front of the chest, and its tip curls up.
    expect(p.trunk1[1]).toBeLessThan(body.positions.eyeR[1] - 0.35 * H);
    expect(p.trunk3[1]).toBeLessThan(p.neck[1]);
    expect(p.trunk3[2]).toBeLessThan(p.trunk2[2]);
    expect(boundsOf(mesh, 'trunk3').max[1]).toBeGreaterThan(p.trunk3[1] + 0.3 * H);
  });

  it('makes the flat nose 0.4 H wide and the horn 0.4 H long, in their accent colors', () => {
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const flat = variant({ snout: 'flat-nose', accentParts: ['snout'] });
    const disc = verticesWithColor(flat.mesh, accent);
    const xs = disc.map((p) => p[0]);
    const ys = disc.map((p) => p[1]);
    // The disc is an octagon, 0.4 H wide and 0.3 H tall across its corners. Across its faces, it
    // is cos(22.5°) of that.
    const acrossFaces = Math.cos(Math.PI / 8);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(0.4 * H * acrossFaces, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.3 * H * acrossFaces, 6);
    const rhino = variant({ snout: 'horn', accentParts: ['horn'] });
    const horn = verticesWithColor(rhino.mesh, accent);
    const axis = normalize(RHINO_HORN_AXIS);
    const along = horn.map((p) => dot(p, axis));
    expect(Math.max(...along) - Math.min(...along)).toBeCloseTo(0.4 * H, 6);
  });

  it('builds each tail type on its bones, with faces that point out', () => {
    for (const tail of TAIL_TYPES) {
      const { mesh } = variant({ tail });
      const bones = { none: 0, puff: 1, bushy: 2, ringed: 2, thin: 2, flat: 2 }[tail];
      expect(trianglesOn(mesh, 'tail1') > 0).toBe(bones >= 1);
      expect(trianglesOn(mesh, 'tail2') > 0).toBe(bones === 2);
      if (bones >= 1) {
        expect(volumeOn(mesh, 'tail1')).toBeGreaterThan(0);
      }
      if (bones === 2) {
        expect(volumeOn(mesh, 'tail2')).toBeGreaterThan(0);
      }
    }
  });

  it('gives the tails the lengths of design 4.5', () => {
    for (const [tail, total, tipRadius] of [
      ['bushy', 0.9, 0],
      ['ringed', 0.8, 0.05],
      ['thin', 0.7, 0.025],
    ] as const) {
      const { mesh, body } = variant({ tail });
      const { tail1, tail2 } = body.positions;
      const second = Math.sqrt(reachFrom(mesh, 'tail2', tail2) ** 2 - (tipRadius * H) ** 2);
      expect(length(sub(tail2, tail1)) + second).toBeCloseTo(total * H, 6);
    }
    // The flat tail is a stalk and a paddle of 0.3 H wide and 0.06 H thick.
    const flat = variant({ tail: 'flat' });
    const { tail1, tail2 } = flat.body.positions;
    const paddle = Math.sqrt(
      reachFrom(flat.mesh, 'tail2', tail2) ** 2 - (0.15 ** 2 + 0.03 ** 2) * H * H,
    );
    expect(length(sub(tail2, tail1)) + paddle).toBeCloseTo(0.5 * H, 6);
    // The puff is a ball of 0.2 H.
    expect(spanOf(variant({ tail: 'puff' }).mesh, 'tail1')).toBeCloseTo(0.2 * H, 6);
  });

  it('gives the ringed tail rings of the fur and the accent color, with an accent tip', () => {
    const { mesh, body } = variant({ tail: 'ringed', accentParts: ['tail'] });
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const fur = srgb(SPECIES.rabbit.colors.fur);
    const tail = ['tail1', 'tail2'] as const;
    const fromJoint = (p: Vec3): number => length(sub(p, body.positions.tail2));
    const tip = verticesWithColor(mesh, accent, tail).map(fromJoint);
    const furRings = verticesWithColor(mesh, fur, tail).map(fromJoint);
    expect(furRings.length).toBeGreaterThan(0);
    expect(tip.length).toBeGreaterThan(0);
    expect(Math.max(...tip)).toBeGreaterThan(Math.max(...furRings));
  });

  it('builds each face pattern on the head surface, in the accent color', () => {
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const extra = { none: 0, mask: 60, 'eye-patches': 40, stripe: 252, 'forehead-stripes': 72 };
    const plain = variant({ facePattern: 'none', accentParts: ['face-pattern'] }).mesh;
    for (const facePattern of FACE_PATTERNS) {
      const { mesh, body } = variant({ facePattern, accentParts: ['face-pattern'] });
      expect(mesh.bones.length / 3 - plain.bones.length / 3).toBe(extra[facePattern]);
      expect(volumeOn(mesh, 'head')).toBeGreaterThan(0);
      const pattern = verticesWithColor(mesh, accent, ['head']);
      if (facePattern === 'none') {
        expect(pattern).toHaveLength(0);
        continue;
      }
      // Each vertex is near the surface of the head (1.0 is on it), and the pattern is symmetric.
      for (const p of pattern) {
        const d = sub(p, body.headCenter);
        const r = Math.hypot(d[0] / (0.45 * H), d[1] / (0.5 * H), d[2] / (0.45 * H));
        expect(r).toBeGreaterThan(0.9);
        expect(r).toBeLessThan(1.12);
      }
      const xs = pattern.map((p) => p[0]);
      expect(Math.min(...xs)).toBeCloseTo(-Math.max(...xs), 6);
    }
  });

  it('puts the forehead stripes above the eyes, and the stripe of the badger over the head', () => {
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const belly = srgb(SPECIES.rabbit.colors.belly);
    const cat = variant({ facePattern: 'forehead-stripes', accentParts: ['face-pattern'] });
    for (const p of verticesWithColor(cat.mesh, accent, ['head'])) {
      expect(p[1]).toBeGreaterThan(cat.body.positions.eyeR[1]);
      expect(p[2]).toBeLessThan(cat.body.headCenter[2]);
    }
    const badger = variant({ facePattern: 'stripe', accentParts: ['face-pattern'] });
    const c = badger.body.headCenter;
    // The middle stripe has the belly color on the top of the head, where the head has the fur
    // color, and the accent stripes reach the back of the head.
    const top = verticesWithColor(badger.mesh, belly, ['head']).filter(
      (p) => p[1] > c[1] + 0.45 * H,
    );
    expect(top.length).toBeGreaterThan(0);
    for (const p of top) {
      expect(Math.abs(p[0])).toBeLessThan(0.1 * H);
    }
    const back = verticesWithColor(badger.mesh, accent, ['head']).map((p) => p[2] - c[2]);
    expect(Math.max(...back)).toBeGreaterThan(0.2 * H);
  });

  it('gives the accent color to each accent part, and to no other part (design 4.5)', () => {
    const red = '#ff0000';
    const parts: readonly (readonly [AccentPart, Partial<SpeciesParams>, readonly BoneName[]])[] = [
      ['inner-ears', {}, ['earL', 'earR']],
      ['ears', {}, ['earL', 'earR']],
      ['nose', {}, ['head']],
      ['snout', { snout: 'flat-nose' }, ['head']],
      ['horn', { snout: 'horn' }, ['head']],
      ['beak', { snout: 'beak' }, ['head', 'jaw']],
      ['hands', {}, ['handL', 'handR', 'fingersL', 'fingersR']],
      ['feet', {}, ['footL', 'footR']],
      ['tail', { tail: 'thin' }, ['tail1', 'tail2']],
      ['face-pattern', { facePattern: 'mask' }, ['head']],
    ];
    const colors = { ...SPECIES.rabbit.colors, accent: red };
    for (const [part, change, bones] of parts) {
      const plain = variant({ ...change, colors, accentParts: [] }).mesh;
      expect(verticesWithColor(plain, srgb(red))).toHaveLength(0);
      const { mesh } = variant({ ...change, colors, accentParts: [part] });
      const accented = new Set<BoneName>();
      for (let v = 0; v < mesh.bones.length; v++) {
        if (mesh.colors[v * 3] === 1 && mesh.colors[v * 3 + 1] === 0) {
          accented.add(BONE_NAMES[mesh.bones[v] ?? 0] ?? 'root');
        }
      }
      expect([...accented].toSorted()).toEqual([...bones].toSorted());
    }
  });

  it('gives the belly color to the face below the forehead (design 4.3)', () => {
    const { mesh, body } = variant({});
    const belly = srgb(SPECIES.rabbit.colors.belly);
    const face = verticesWithColor(mesh, belly, ['head']).map((p) => p[1] - body.positions.eyeR[1]);
    expect(face.length).toBeGreaterThan(0);
    // The face reaches above the eyes, and the forehead above it keeps the fur color.
    expect(Math.max(...face)).toBeGreaterThan(0);
    expect(Math.max(...face)).toBeLessThan(0.2 * H);
  });

  it('makes a short thick neck under the head (design 4.5)', () => {
    const { mesh, body } = variant({});
    const { min, max } = boundsOf(mesh, 'neck');
    expect(max[0] - min[0]).toBeCloseTo(0.6 * H, 6);
    expect(min[1]).toBeCloseTo(SEAT + 1.15 * H, 6);
    // The neck ends inside the head, and the torso reaches the chin.
    expect(max[1]).toBeLessThan(body.headCenter[1] - 0.25 * H);
    expect(topOf(mesh, 'chest')).toBeGreaterThan(body.headCenter[1] - 0.5 * H);
  });

  it('makes a round pear torso and thick legs (design 4.5)', () => {
    const { mesh } = variant({});
    const spine = boundsOf(mesh, 'spine');
    // The torso is 1.2 H wide at the belly. An octagon is cos(22.5°) of that across its faces.
    expect(spine.max[0] - spine.min[0]).toBeCloseTo(1.2 * H * Math.cos(Math.PI / 8), 6);
    const thigh = boundsOf(mesh, 'thighL');
    expect(thigh.max[0] - thigh.min[0]).toBeCloseTo(0.52 * H, 6);
    const shin = boundsOf(mesh, 'shinL');
    expect(shin.max[0] - shin.min[0]).toBeCloseTo(0.4 * H, 6);
  });
});
