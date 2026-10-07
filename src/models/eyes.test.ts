import { Ray, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { LOW_EYES, headSurface } from './head.ts';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { FINISH_ORDER, MeshBuilder, srgb } from './mesh.ts';
import type { Rgb } from './mesh.ts';
import { boneIndex } from './rig.ts';
import { EYE_COLOR, EYE_LIGHT_COLOR, SPECIES } from './species.ts';
import { H, rabbit, variant, verticesWithColor } from './test-body.ts';

describe('addEyes', () => {
  it('gives each eye an upright oval of 0.18 × 0.21 H low on the face, with two lights', () => {
    const { mesh, positions } = rabbit();
    const eye = verticesWithColor(mesh, srgb(EYE_COLOR), ['eyeR']);
    const ys = eye.map((p) => p[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.19 * H);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.21 * H);
    // The oval lies on the face, which turns about 20° to the side. The first eyes were 0.13 H
    // wide.
    const xs = eye.map((p) => p[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.16 * H);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.19 * H);
    // The eye center is a little inside the surface, so the eye shows half.
    const center: Vec3 = [positions.head[0], positions.head[1] + 0.5 * H, positions.head[2]];
    const c = new Vector3(...center);
    const eyeCenter = new Vector3(...positions.eyeR);
    const { point } = headSurface(H, center, toVec3(eyeCenter.clone().sub(c)));
    const inside = new Vector3(...point).distanceTo(c) - eyeCenter.distanceTo(c);
    expect(inside).toBeGreaterThan(0);
    expect(inside).toBeLessThan(0.02 * H);
    // The eyes are low on the face: 0.57 of the head below the top, and 0.39 of the head width
    // apart (spec 2.4), within 0.01. The first eyes were 0.44 below the top.
    expect(Math.abs((center[1] + 0.5 * H - positions.eyeR[1]) / H - 0.57)).toBeLessThan(0.01);
    expect(Math.abs((positions.eyeR[0] - positions.eyeL[0]) / (1.32 * H) - 0.39)).toBeLessThan(
      0.01,
    );
    // Two white lights on the eye bone, so they close with the eye: a large light at the upper
    // outer side, and a small light at the lower inner side. Both are in front of the eye.
    const light = verticesWithColor(mesh, srgb(EYE_LIGHT_COLOR), ['eyeR']);
    const upper = light.filter((p) => p[1] > positions.eyeR[1]);
    const lower = light.filter((p) => p[1] < positions.eyeR[1]);
    expect(upper.length).toBeGreaterThan(0);
    expect(lower.length).toBeGreaterThan(0);
    const spanOf = (points: readonly Vec3[]): number =>
      Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1]));
    expect(spanOf(upper)).toBeGreaterThan(2 * spanOf(lower));
    const meanX = (points: readonly Vec3[]): number =>
      points.reduce((sum, p) => sum + p[0], 0) / points.length;
    expect(meanX(upper)).toBeGreaterThan(positions.eyeR[0]);
    expect(meanX(lower)).toBeLessThan(positions.eyeR[0]);
    const normal = new Vector3(...headSurface(H, center, toVec3(eyeCenter.clone().sub(c))).normal);
    for (const p of light) {
      expect(new Vector3(...p).sub(eyeCenter).dot(normal)).toBeGreaterThan(0);
    }
    // The eyes have the wet finish.
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      if (mesh.bones[t * 3] === boneIndex('eyeR')) {
        expect(mesh.finishes[t]).toBe(FINISH_ORDER.indexOf('lacquer'));
      }
    }
  });

  it('keeps the eyes high above a muzzle that starts high on the face (design 4.5)', () => {
    // The low eyes sat on the top of the long muzzle of the fox, which hid their lower half.
    for (const [snout, below] of [
      ['long', 0.43],
      ['blunt', 0.43],
      ['roman', 0.43],
      ['short', 0.57],
      ['pointed', 0.57],
      ['beak', 0.57],
    ] as const) {
      const { body } = variant({ snout });
      const top = body.headCenter[1] + 0.5 * H;
      expect(Math.abs((top - body.positions.eyeR[1]) / H - below), snout).toBeLessThan(0.01);
    }
  });

  it('raises the eyes over a patch around them, so that the patch does not hide them', () => {
    for (const [facePattern, out] of [
      ['eye-rings', true],
      ['eye-patches', true],
      ['face-disc', true],
      ['none', false],
      ['stripe', false],
    ] as const) {
      const { body } = variant({ facePattern });
      const c = new Vector3(...body.headCenter);
      const eye = new Vector3(...body.positions.eyeR);
      const { point } = headSurface(H, body.headCenter, toVec3(eye.clone().sub(c)));
      const above = eye.distanceTo(c) - new Vector3(...point).distanceTo(c);
      expect(above > 0, facePattern).toBe(out);
    }
  });

  it('shows the black eyes of the penguin in white rings (audit 2, N8)', () => {
    // The black eyes on the black head of the penguin did not show in a close shot.
    const builder = new MeshBuilder();
    const body = buildBiped(builder, SPECIES.penguin, { kind: 'standing' });
    const mesh = builder.build();
    const h = H * SPECIES.penguin.size;
    const belly = srgb(SPECIES.penguin.colors.belly);
    const black = srgb(EYE_COLOR);
    const colorAt = (v: number): Rgb => [
      mesh.colors[v * 3] ?? 0,
      mesh.colors[v * 3 + 1] ?? 0,
      mesh.colors[v * 3 + 2] ?? 0,
    ];
    const same = (a: Rgb, b: Rgb): boolean => a.every((c, k) => Math.abs(c - (b[k] ?? 0)) < 1e-6);
    // The color of the first triangle that a ray from outside hits.
    const seen = (from: Vector3, toward: Vector3): Rgb | null => {
      const ray = new Ray(from, toward);
      const hit = new Vector3();
      let best = Infinity;
      let color: Rgb | null = null;
      const p = mesh.positions;
      for (let t = 0; t * 9 < p.length; t++) {
        const [a, b, c] = [0, 1, 2].map(
          (k) => new Vector3(p[t * 9 + k * 3], p[t * 9 + k * 3 + 1], p[t * 9 + k * 3 + 2]),
        );
        if (a && b && c && ray.intersectTriangle(a, b, c, false, hit)) {
          const d = hit.distanceTo(from);
          if (d < best) {
            best = d;
            color = colorAt(t * 3);
          }
        }
      }
      return color;
    };
    for (const side of [-1, 1]) {
      const surface = headSurface(h, body.headCenter, [
        side * LOW_EYES.direction[0],
        LOW_EYES.direction[1],
        LOW_EYES.direction[2],
      ]);
      const normal = new Vector3(...surface.normal);
      const up = new Vector3(0, 1, 0).projectOnPlane(normal).normalize();
      const look = (offset: number): Rgb | null => {
        const at = new Vector3(...surface.point).addScaledVector(up, offset * h);
        return seen(at.clone().addScaledVector(normal, h), normal.clone().negate());
      };
      // The eye shows over its full height, from 0.06 H below the surface point, with its white
      // light 0.035 H above it. The white ring shows above the eye on the black forehead, and
      // the white face below it. With the eye 0.01 H inside the surface, the ring hid its lower
      // half.
      for (const offset of [-0.06, -0.01, 0.07]) {
        expect(same(look(offset) ?? [0, 0, 0], black), `side ${side} at ${offset}`).toBe(true);
      }
      expect(same(look(0.035) ?? [0, 0, 0], srgb(EYE_LIGHT_COLOR)), `side ${side} light`).toBe(
        true,
      );
      expect(same(look(0.12) ?? [0, 0, 0], belly), `side ${side} above`).toBe(true);
      expect(same(look(0.2) ?? [0, 0, 0], srgb(SPECIES.penguin.colors.fur))).toBe(true);
    }
  });
});
