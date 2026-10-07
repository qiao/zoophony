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
      ['long', 0.43],
      ['blunt', 0.43],
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

  it('gives the short muzzle two full cheeks of 0.30 × 0.25 H (spec 2.4)', () => {
    // The first cheeks were 0.26 × 0.22 H. The cheeks of the cute face are 1.15 times larger.
    const { mesh, body } = variant({ snout: 'short', accentParts: ['snout'] });
    const cheeks = verticesWithColor(mesh, srgb(SPECIES.rabbit.colors.accent), ['head']);
    const xs = cheeks.map((p) => p[0] - body.headCenter[0]);
    const ys = cheeks.map((p) => p[1]);
    // The ball of 8 sides has no corner at its side: its faces are cos(22.5°) of the radius
    // from its axis there.
    const side = (0.1035 + 0.1495 * Math.cos(Math.PI / 8)) * H;
    expect(Math.max(...xs)).toBeCloseTo(side, 6);
    expect(Math.min(...xs)).toBeCloseTo(-side, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.253 * H, 6);
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

  it('makes the trunk one closed tube with a round curl and no ball at a bend', () => {
    const { mesh } = variant({ snout: 'trunk' });
    const bones = new Set((['trunk1', 'trunk2', 'trunk3'] as const).map(boneIndex));
    const key = (v: number): string =>
      [0, 1, 2].map((k) => (mesh.positions[v * 3 + k] ?? 0).toFixed(6)).join(',');
    const edges = new Map<string, number>();
    let triangles = 0;
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      if (!bones.has(mesh.bones[t * 3] ?? -1)) {
        continue;
      }
      triangles++;
      for (let k = 0; k < 3; k++) {
        const a = key(t * 3 + k);
        const b = key(t * 3 + ((k + 1) % 3));
        const edge = a < b ? `${a}|${b}` : `${b}|${a}`;
        edges.set(edge, (edges.get(edge) ?? 0) + 1);
      }
    }
    // Each edge has two triangles, so the three bones share their rings. The first trunk had a
    // separate tube for each segment and a faceted ball at each bend, which made 280 triangles.
    expect([...edges.values()].every((n) => n === 2)).toBe(true);
    // 10 sides, 11 rings, and a cap at each end.
    expect(triangles).toBe(10 * 2 * 10 + 2 * 10);
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
