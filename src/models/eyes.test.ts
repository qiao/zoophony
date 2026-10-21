import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { EYE, addEye, eyeMiddle } from './eyes.ts';
import { FINISH_ORDER, MeshBuilder } from './mesh.ts';
import { boneIndex } from './rig.ts';
import type { Vec3 } from './tuples.ts';

describe('eyeMiddle (design 4.5)', () => {
  const normal: Vec3 = [0.6, 0, -0.8];
  const surface = { point: [0.1, 1.2, -0.3] satisfies Vec3, normal };

  it('puts the middle of an eye 0.01 H into the head along the normal', () => {
    const { point } = eyeMiddle(surface, 0.5);
    const move = new Vector3(...point).sub(new Vector3(...surface.point));
    expect(move.distanceTo(new Vector3(...normal).multiplyScalar(-0.005))).toBeLessThan(1e-12);
  });
});

describe('addEye (design 4.5)', () => {
  const h = 0.4;
  const middle = new Vector3(0.05, 1.3, -0.2);
  const normal = new Vector3(0.6, 0, -0.8);
  const builder = new MeshBuilder();
  addEye(
    builder,
    { eye: [0, 0, 0], eyeLight: [1, 1, 1] },
    { point: middle.toArray(), normal: normal.toArray() },
    h,
    boneIndex('eyeR'),
  );
  const mesh = builder.build();
  const corners = Array.from({ length: mesh.bones.length }, (_, c) =>
    new Vector3().fromArray(mesh.positions, c * 3),
  );
  /** Tells if a corner is on a face of the black oval. */
  const onOval = (c: number): boolean => (mesh.colors[c * 3] ?? 1) === 0;

  it('puts the oval and its light on the eye bone, with the wet finish', () => {
    expect(mesh.bones.every((bone) => bone === boneIndex('eyeR'))).toBe(true);
    expect([...mesh.finishes].every((f) => f === FINISH_ORDER.indexOf('lacquer'))).toBe(true);
  });

  it('lies the oval on the face: its thin axis on the normal, its long axis up', () => {
    const up = new Vector3(0, 1, 0);
    const across = new Vector3().crossVectors(up, normal);
    const extent = (axis: Vector3): number => {
      const along = corners.flatMap((p, c) => (onOval(c) ? [p.clone().sub(middle).dot(axis)] : []));
      return Math.max(...along) - Math.min(...along);
    };
    // The faces around the axis cut the oval a little inside its width and its depth.
    expect(extent(up) / h).toBeCloseTo(EYE[1], 6);
    for (const [axis, size] of [
      [normal, EYE[2]],
      [across, EYE[0]],
    ] as const) {
      expect(extent(axis) / h).toBeLessThanOrEqual(size + 1e-9);
      expect(extent(axis) / h).toBeGreaterThan(0.9 * size);
    }
  });

  it('puts the white light above the middle, on the front of the oval', () => {
    const light = corners.filter((_, c) => !onOval(c));
    expect(light.length).toBeGreaterThan(0);
    const center = light.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(light.length);
    expect(center.y).toBeGreaterThan(middle.y);
    expect(center.clone().sub(middle).dot(normal)).toBeGreaterThan(0);
  });
});
