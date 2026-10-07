import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { HEAD_RINGS, headSurface } from './head.ts';
import { RHINO_HORN_AXIS } from './snouts.ts';
import { toVec3 } from './tuples.ts';
import { srgb } from './mesh.ts';
import { boneIndex } from './rig.ts';
import { SPECIES, TEETH_COLOR } from './species.ts';
import type { SpeciesParams } from './species.ts';
import {
  H,
  boundsOf,
  reachFrom,
  trianglesOn,
  variant,
  verticesWithColor,
  volumeOn,
} from './test-body.ts';

/** The snout types that the tests build (design 4.3). */
const SNOUT_TYPES: readonly SpeciesParams['snout'][] = [
  'short',
  'long',
  'blunt',
  'broad',
  'pointed',
  'buck-teeth',
  'trunk',
  'flat-nose',
  'horn',
  'beak',
];

describe('addSnout', () => {
  it('builds each snout type on the head, with faces that point out', () => {
    for (const snout of SNOUT_TYPES) {
      const { mesh } = variant({ snout });
      expect(mesh.positions.length / 9).toBeLessThanOrEqual(2600);
      expect(volumeOn(mesh, 'head')).toBeGreaterThan(0);
      // Only the beak has a part on the jaw, and only the trunk has parts on the trunk bones.
      expect(trianglesOn(mesh, 'jaw') > 0).toBe(snout === 'beak');
      for (const bone of ['trunk1', 'trunk2', 'trunk3'] as const) {
        expect(trianglesOn(mesh, bone) > 0).toBe(snout === 'trunk');
      }
    }
  });

  it('puts the mouth in the middle, below the eyes, at the front of each snout', () => {
    const snoutBones = ['head', 'jaw', 'trunk1'] as const;
    for (const snout of SNOUT_TYPES) {
      const { mesh, body } = variant({ snout });
      const center = new Vector3(...body.headCenter);
      const mouth = new Vector3(...body.mouth);
      const offset = mouth.clone().sub(center);
      expect(offset.x, snout).toBe(0);
      expect(body.mouth[1], snout).toBeLessThan(body.positions.eyeR[1]);
      // The mouth of the trunk is under the chin, behind the low eyes.
      if (snout !== 'trunk') {
        expect(body.mouth[2], snout).toBeLessThan(body.positions.eyeR[2]);
      }
      // The mouth is outside the head.
      const surface = headSurface(H, body.headCenter, toVec3(offset));
      expect(offset.length(), snout).toBeGreaterThan(
        new Vector3(...surface.point).distanceTo(center),
      );
      // A corner of the snout, the beak, or the trunk is near the mouth.
      let nearest = Infinity;
      for (let v = 0; v < mesh.bones.length; v++) {
        if (snoutBones.some((bone) => mesh.bones[v] === boneIndex(bone))) {
          const p = new Vector3(
            mesh.positions[v * 3] ?? 0,
            mesh.positions[v * 3 + 1] ?? 0,
            mesh.positions[v * 3 + 2] ?? 0,
          );
          nearest = Math.min(nearest, p.distanceTo(mouth));
        }
      }
      expect(nearest, snout).toBeLessThan(0.2 * H);
    }
  });

  it('gives the long snout and the beak their lengths in front of the face (design 4.5)', () => {
    // The face is the front of the cheeks of the head.
    const face = Math.max(...HEAD_RINGS.map((ring) => ring.front - (ring.z ?? 0)));
    for (const [snout, reach] of [
      ['long', 0.25],
      ['blunt', 0.3],
      ['pointed', 0.2],
      ['beak', 0.2],
    ] as const) {
      const { mesh, body } = variant({ snout });
      const front = Math.min(boundsOf(mesh, 'head').min[2], boundsOf(mesh, 'jaw').min[2]);
      const reachInFront = body.headCenter[2] - face * H - front;
      expect(reachInFront).toBeGreaterThan(reach * H - 0.02 * H);
      expect(reachInFront).toBeLessThan(reach * H + 0.02 * H);
    }
  });

  it('gives the buck teeth two white teeth below the muzzle (review of step 4)', () => {
    const { mesh, body } = variant({ snout: 'buck-teeth' });
    const teeth = verticesWithColor(mesh, srgb(TEETH_COLOR), ['head']);
    expect(teeth.length).toBeGreaterThan(0);
    for (const p of teeth) {
      expect(p[1]).toBeLessThan(body.headCenter[1] - 0.24 * H);
      expect(p[2]).toBeLessThan(body.headCenter[2] - 0.4 * H);
    }
    expect(Math.min(...teeth.map((p) => p[0]))).toBeCloseTo(
      -Math.max(...teeth.map((p) => p[0])),
      9,
    );
  });

  it('builds the trunk of 1.4 H on three bones (design 4.5)', () => {
    const { mesh, body } = variant({ snout: 'trunk' });
    const p = body.positions;
    expect(new Vector3(...p.trunk2).distanceTo(new Vector3(...p.trunk1))).toBeCloseTo(0.5 * H, 9);
    expect(new Vector3(...p.trunk3).distanceTo(new Vector3(...p.trunk2))).toBeCloseTo(0.5 * H, 9);
    // The last segment is 0.4 H long, and its tip has a radius of 0.08 H.
    expect(reachFrom(mesh, 'trunk3', p.trunk3)).toBeCloseTo(Math.hypot(0.4, 0.08) * H, 6);
    // The trunk starts 0.2 H below the low eyes, hangs down in front of the chest, and its tip
    // curls up.
    expect(p.trunk1[1]).toBeLessThan(body.positions.eyeR[1] - 0.2 * H);
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
    const axis = new Vector3(...RHINO_HORN_AXIS).normalize();
    const along = horn.map((p) => new Vector3(...p).dot(axis));
    expect(Math.max(...along) - Math.min(...along)).toBeCloseTo(0.4 * H, 6);
  });
});
