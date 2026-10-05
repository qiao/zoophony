import { describe, expect, it } from 'vitest';

import { INSTRUMENT_COLORS } from './colors.ts';
import { IDENTITY, cross, dot, length, rotate, sub } from './math.ts';
import { seated } from './biped.ts';
import type { MeshData } from './mesh.ts';
import {
  CHAIR_BACK_CLEARANCE,
  INSTRUMENT_SUPPORTS,
  buildPlayer,
  chairForward,
  stanceOn,
} from './player.ts';
import { CHAIR, CHAIR_BACK, HIGH_STOOL, STOOL } from './props.ts';
import { RABBIT_HEAD_HEIGHT, SPECIES } from './species.ts';
import type { SpeciesId } from './species.ts';
import { INSTRUMENT_IDS } from './instruments/catalog.ts';
import type { InstrumentId } from './instruments/types.ts';
import { boneIndex } from './rig.ts';
import type { Transform, Vec3 } from './math.ts';
import { placePoint } from './instruments/hold.ts';
import { INSTRUMENT_SCALE, VIOLIN } from './instruments/strings.ts';

/** Measures the extent of the vertices of one bone along a unit direction. */
function extentAlong(positions: Float32Array, bones: Uint8Array, bone: number, axis: Vec3): number {
  let min = Infinity;
  let max = -Infinity;
  for (let v = 0; v < bones.length; v++) {
    if (bones[v] !== bone) {
      continue;
    }
    const p: Vec3 = [positions[v * 3] ?? 0, positions[v * 3 + 1] ?? 0, positions[v * 3 + 2] ?? 0];
    min = Math.min(min, dot(p, axis));
    max = Math.max(max, dot(p, axis));
  }
  return max - min;
}

function trianglesOn(bones: Uint8Array, wanted: readonly number[]): number {
  let count = 0;
  for (let t = 0; t < bones.length / 3; t++) {
    if (wanted.includes(bones[t * 3] ?? -1)) {
      count++;
    }
  }
  return count;
}

describe('buildPlayer', () => {
  const player = buildPlayer('rabbit', 'violin');
  const placeOf = (bone: 'instrument' | 'bow'): Transform =>
    player.pieces.find((p) => p.piece.bone === bone)?.at ?? {
      position: [NaN, NaN, NaN],
      rotation: IDENTITY,
      scale: [1, 1, 1],
    };
  const violinAxis = rotate(placeOf('instrument').rotation, [1, 0, 0]);
  const violinTop = rotate(placeOf('instrument').rotation, [0, 1, 0]);
  const bowAxis = rotate(placeOf('bow').rotation, [1, 0, 0]);
  const contactTarget = player.instrument.targets.find((t) => t.kind === 'bow-contact');
  const bowContact = placePoint(player.pieces, {
    bone: 'instrument',
    at: contactTarget?.from ?? [NaN, NaN, NaN],
  });

  it('merges the body, the violin, and the bow into one mesh of rigid parts (design 4.4)', () => {
    const { bones } = player.mesh;
    for (let t = 0; t < bones.length / 3; t++) {
      expect(bones[t * 3 + 1]).toBe(bones[t * 3]);
      expect(bones[t * 3 + 2]).toBe(bones[t * 3]);
    }
    expect(trianglesOn(bones, [boneIndex('bow')])).toBeGreaterThan(0);
    expect(trianglesOn(bones, [boneIndex('instrument')])).toBeGreaterThan(0);
    // All triangles are matte: the violin and the bow have no metal (design 4.5).
    expect(player.mesh.matteTriangles).toBe(bones.length / 3);
  });

  it('hangs the violin on the chest and puts its bone at the tail end (design 4.7)', () => {
    const { parents, positions } = player.skeleton;
    expect(parents[boneIndex('instrument')]).toBe(boneIndex('chest'));
    const tail = positions[boneIndex('instrument')] ?? [0, 0, 0];
    expect(length(sub(bowContact, tail))).toBeCloseTo(
      Math.hypot(VIOLIN.bowContact, VIOLIN.stringHeight) * INSTRUMENT_SCALE,
      6,
    );
  });

  it('holds the violin to the left, with the strings up (design 4.6)', () => {
    expect(violinAxis[0]).toBeLessThan(-0.5);
    expect(violinTop[1]).toBeGreaterThan(0);
    expect(dot(violinAxis, violinTop)).toBeCloseTo(0, 9);
  });

  it('makes the violin 0.51 m long and the bow 0.57 m long (design 4.6)', () => {
    const { positions, bones } = player.mesh;
    const violin = extentAlong(positions, bones, boneIndex('instrument'), violinAxis);
    expect(violin).toBeGreaterThan(0.505);
    expect(violin).toBeLessThan(0.52);
    const bow = extentAlong(positions, bones, boneIndex('bow'), bowAxis);
    expect(bow).toBeCloseTo(0.57, 2);
  });

  it('shows the strings as a thin dark strip (design 4.5, review of step 3)', () => {
    const { positions, colors } = player.mesh;
    const across = cross(violinTop, violinAxis);
    const strings: Vec3[] = [];
    for (let v = 0; v < colors.length / 3; v++) {
      const color = [colors[v * 3], colors[v * 3 + 1], colors[v * 3 + 2]];
      if (color.every((c, i) => c === Math.fround(INSTRUMENT_COLORS.strings[i] ?? -1))) {
        strings.push([positions[v * 3] ?? 0, positions[v * 3 + 1] ?? 0, positions[v * 3 + 2] ?? 0]);
      }
    }
    expect(strings.length).toBeGreaterThan(0);
    const widths = strings.map((p) => dot(p, across));
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(
      0.008 * INSTRUMENT_SCALE + 1e-6,
    );
    // The strings are darker than the bow hair.
    expect(Math.max(...INSTRUMENT_COLORS.strings)).toBeLessThan(
      Math.min(...INSTRUMENT_COLORS.bowHair),
    );
  });

  it('puts the bow in the right hand in the bind pose', () => {
    const grip = placeOf('bow').position;
    const hand = player.skeleton.positions[boneIndex('handR')] ?? [0, 0, 0];
    expect(length(sub(grip, hand))).toBeLessThan(0.1);
    expect(player.skeleton.parents[boneIndex('bow')]).toBe(boneIndex('handR'));
  });
});

describe('buildPlayer with each instrument', () => {
  it('sets the stance from the support of the instrument (design 4.6)', () => {
    const feet = (id: InstrumentId): number => {
      const { mesh } = buildPlayer('rabbit', id);
      let bottom = Infinity;
      for (let v = 0; v < mesh.bones.length; v++) {
        if (mesh.bones[v] === boneIndex('footL')) {
          bottom = Math.min(bottom, mesh.positions[v * 3 + 1] ?? Infinity);
        }
      }
      return bottom;
    };
    expect(feet('contrabass')).toBeCloseTo(HIGH_STOOL.footRing, 6);
    for (const id of ['violin', 'harp', 'piano', 'timpani', 'choir-folder'] as const) {
      expect(feet(id), id).toBeCloseTo(0, 6);
    }
    const hips = (id: InstrumentId): number =>
      buildPlayer('rabbit', id).skeleton.positions[boneIndex('hips')]?.[1] ?? NaN;
    expect(hips('cello')).toBeCloseTo(CHAIR.seatHeight + 0.15 * RABBIT_HEAD_HEIGHT, 9);
    expect(hips('contrabass')).toBeCloseTo(HIGH_STOOL.seatHeight + 0.15 * RABBIT_HEAD_HEIGHT, 9);
    // A standing body has its torso base 0.77 H above the floor (review of step 4, F3).
    expect(hips('timpani')).toBeCloseTo((0.77 + 0.15) * RABBIT_HEAD_HEIGHT, 9);
    expect(hips('choir-folder')).toBe(hips('timpani'));
  });

  it('gives each support of 5.1 a stance', () => {
    const rabbit = SPECIES.rabbit;
    expect(stanceOn('chair', rabbit)).toEqual(seated(0.35, 0, chairForward(rabbit)));
    expect(stanceOn('stool', rabbit)).toEqual(seated(STOOL.seatHeight));
    expect(stanceOn('bench', rabbit)).toEqual(seated(0.45));
    expect(stanceOn('high-stool', rabbit)).toEqual(
      seated(HIGH_STOOL.seatHeight, HIGH_STOOL.footRing),
    );
    expect(stanceOn('stand', rabbit)).toEqual({ kind: 'standing' });
    expect(stanceOn('riser', rabbit)).toEqual({ kind: 'standing' });
  });

  it('puts the mouthpiece at the mouth and each piece on its bone', () => {
    for (const id of INSTRUMENT_IDS) {
      const player = buildPlayer('fox-tan', id);
      expect(player.support, id).toBe(INSTRUMENT_SUPPORTS[id]);
      expect(player.skeleton.parents[boneIndex('instrument')], id).toBe(
        boneIndex(player.instrument.parent),
      );
      const mouth = player.instrument.grips.mouth;
      if (mouth) {
        expect(length(sub(placePoint(player.pieces, mouth), player.body.mouth)), id).toBeLessThan(
          1e-9,
        );
      }
      for (const { piece, at } of player.pieces) {
        expect(player.skeleton.positions[boneIndex(piece.bone)], id).toEqual(at.position);
      }
    }
  });

  it('keeps each vertex of each species with each instrument above the floor', () => {
    // The cymbals and the triangle hung from the hands into the floor (review of step 4, P1).
    for (const species of Object.keys(SPECIES).filter((k): k is SpeciesId => k in SPECIES)) {
      for (const id of INSTRUMENT_IDS) {
        const { mesh } = buildPlayer(species, id);
        let bottom = Infinity;
        for (let v = 0; v < mesh.bones.length; v++) {
          bottom = Math.min(bottom, mesh.positions[v * 3 + 1] ?? Infinity);
        }
        expect(bottom, `${species} ${id}`).toBeGreaterThan(-1e-9);
      }
    }
  });

  it('puts the grips of the hand tools in the hanging hands', () => {
    for (const id of ['cymbals', 'small-percussion', 'timpani', 'snare-drum'] as const) {
      const player = buildPlayer('meerkat', id);
      for (const side of ['palmL', 'palmR'] as const) {
        const grip = player.instrument.grips[side];
        if (grip) {
          expect(length(sub(placePoint(player.pieces, grip), player.body[side])), id).toBeLessThan(
            0.07 * player.body.headHeight + 1e-9,
          );
        }
      }
    }
  });
});

describe('chairForward', () => {
  const ids = Object.keys(SPECIES).filter((id): id is SpeciesId => id in SPECIES);

  /** Finds how far the body reaches behind the front of the chair back, at sample points. */
  function backOverlap(mesh: MeshData): number {
    const skip = new Set(
      (['tail1', 'tail2', 'instrument', 'bow'] as const).map((bone) => boneIndex(bone)),
    );
    const n = 8;
    let worst = -Infinity;
    const p = mesh.positions;
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      if (skip.has(mesh.bones[t * 3] ?? 0)) {
        continue;
      }
      const corner = (k: number): Vec3 => [
        p[t * 9 + k * 3] ?? 0,
        p[t * 9 + k * 3 + 1] ?? 0,
        p[t * 9 + k * 3 + 2] ?? 0,
      ];
      const [a, b, c] = [corner(0), corner(1), corner(2)];
      for (let i = 0; i <= n; i++) {
        for (let j = 0; i + j <= n; j++) {
          const q = [0, 1, 2].map(
            (k) =>
              (a[k] ?? 0) + (((b[k] ?? 0) - (a[k] ?? 0)) * i + ((c[k] ?? 0) - (a[k] ?? 0)) * j) / n,
          );
          for (const part of CHAIR_BACK) {
            const [x = 0, y = 0, z = 0] = q;
            if (x >= part.min[0] && x <= part.max[0] && y >= part.min[1] && y <= part.max[1]) {
              worst = Math.max(worst, z - part.min[2]);
            }
          }
        }
      }
    }
    return worst;
  }

  it('keeps the body of each species in front of the chair back (design 4.5)', () => {
    for (const id of ids) {
      const { mesh } = buildPlayer(id, 'violin');
      expect(backOverlap(mesh), id).toBeLessThanOrEqual(-CHAIR_BACK_CLEARANCE + 1e-6);
    }
  });

  it('moves the large species forward, and leaves the rabbit at the open back', () => {
    // Below the top rail, the back of the chair is open, so the torso of the rabbit is clear.
    const rabbit = chairForward(SPECIES.rabbit);
    expect(rabbit).toBe(0);
    expect(chairForward(SPECIES.mouse)).toBe(0);
    expect(chairForward(SPECIES.elephant)).toBeGreaterThan(0.05);
  });

  it('moves a floor instrument with the body', () => {
    const forward = chairForward(SPECIES.elephant);
    const cello = buildPlayer('elephant', 'cello');
    expect(cello.body.floor).toEqual([0, 0, -forward]);
    // The end pin stands 0.42 H + 0.44 m in front of the seat point of the body (design 4.6).
    const pin = cello.pieces[0]?.at.position[2] ?? NaN;
    expect(pin).toBeCloseTo(-forward - 0.42 * 1.35 * RABBIT_HEAD_HEIGHT - 0.44, 9);
  });
});
