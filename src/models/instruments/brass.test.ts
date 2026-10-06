import { Quaternion, Ray, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { BRASS, buildBrass } from './brass.ts';

describe('buildBrass', () => {
  it('puts the mouthpiece at the mouth, on a bone of the chest', () => {
    for (const id of ['horn', 'trumpet', 'trombone', 'tuba'] as const) {
      const model = buildBrass(id);
      expect(model.parent).toBe('chest');
      expect(model.pieces[0]?.hold.anchor).toBe('mouth');
      expect(model.grips.mouth).toEqual({ bone: 'instrument', at: [0, 0, 0] });
      expect(model.targets.some((t) => t.kind === 'bell')).toBe(true);
    }
  });

  it('points the trumpet forward (design 4.6)', () => {
    const hold = buildBrass('trumpet').pieces[0]?.hold;
    const along = new Vector3(1, 0, 0).applyQuaternion(
      new Quaternion(...(hold?.rotation ?? [0, 0, 0, 1])),
    );
    expect(along.z).toBeLessThan(-0.99);
  });

  it('puts the trombone slide on its bone, in the right hand, with its travel (design 4.6)', () => {
    const model = buildBrass('trombone');
    const slide = model.pieces.find((p) => p.bone === 'slide');
    expect(slide?.hold.anchor).toBe('instrument');
    expect(model.grips.palmR?.bone).toBe('slide');
    const line = model.targets.find((t) => t.kind === 'slide');
    expect(line?.bone).toBe('slide');
    const travel = new Vector3(...(line?.to ?? [0, 0, 0])).sub(
      new Vector3(...(line?.from ?? [0, 0, 0])),
    );
    expect(travel.x).toBeCloseTo(BRASS.trombone.travel, 9);
    expect(travel.length()).toBeCloseTo(BRASS.trombone.travel, 9);
  });

  it('opens the tuba bell up, and the horn bell to the right and to the back', () => {
    const tuba = buildBrass('tuba').targets.find((t) => t.kind === 'bell');
    expect(tuba?.normal).toEqual([0, 1, 0]);
    const horn = buildBrass('horn').targets.find((t) => t.kind === 'bell');
    expect(horn?.normal[0]).toBeGreaterThan(0.5);
    expect(horn?.normal[2]).toBeGreaterThan(0.4);
  });

  it('opens each bell, so that a ray into the opening meets the inside of the flare', () => {
    const radii = {
      horn: BRASS.horn.bellRadius,
      trumpet: BRASS.trumpet.bellRadius,
      trombone: BRASS.trombone.bellRadius,
      tuba: BRASS.tuba.bellRadius,
    } as const;
    for (const id of ['horn', 'trumpet', 'trombone', 'tuba'] as const) {
      const model = buildBrass(id);
      const bell = model.targets.find((t) => t.kind === 'bell');
      const normal = new Vector3(...(bell?.normal ?? [0, 0, 0]));
      const mouth = new Vector3(...(bell?.from ?? [0, 0, 0]));
      // A ray from in front of the opening, a little off the axis, along the axis into the bell.
      const side = new Vector3(1, 0, 0).projectOnPlane(normal);
      if (side.lengthSq() < 1e-6) {
        side.set(0, 0, 1).projectOnPlane(normal);
      }
      const start = mouth
        .clone()
        .addScaledVector(normal, 1)
        .addScaledVector(side.normalize(), 0.3 * radii[id]);
      const ray = new Ray(start, normal.clone().negate());
      let nearest = Infinity;
      const hit = new Vector3();
      for (const part of model.pieces[0]?.parts ?? []) {
        const c = part.corners;
        for (let t = 0; t * 9 < c.length; t++) {
          const [a, b, d] = [0, 1, 2].map(
            (k) => new Vector3(c[t * 9 + k * 3], c[t * 9 + k * 3 + 1], c[t * 9 + k * 3 + 2]),
          );
          if (a && b && d && ray.intersectTriangle(a, b, d, true, hit)) {
            nearest = Math.min(nearest, hit.distanceTo(start));
          }
        }
      }
      // The first face that the ray meets lies deeper than the opening: the flare inside.
      expect(nearest - 1, id).toBeGreaterThan(0.2 * radii[id]);
    }
  });
});
