import { describe, expect, it } from 'vitest';
import { BackSide, Mesh, MeshBasicMaterial } from 'three';

import { ENVIRONMENT, buildEnvironmentScene } from './environment.ts';

describe('buildEnvironmentScene (design 4.5)', () => {
  const meshes = buildEnvironmentScene().children.filter((child) => child instanceof Mesh);
  const colorOf = (mesh: Mesh): MeshBasicMaterial => {
    if (!(mesh.material instanceof MeshBasicMaterial)) {
      throw new Error('The environment has a mesh with another material.');
    }
    return mesh.material;
  };

  it('puts the room around the origin, seen from inside, and keeps it dark', () => {
    const room = meshes.find((mesh) => colorOf(mesh).side === BackSide);
    if (!room) {
      throw new Error('The environment has no room.');
    }
    const { r, g, b } = colorOf(room).color;
    expect(Math.max(r, g, b)).toBeLessThan(0.01);
  });

  it('puts warm lamps above 1 around the horizon, and one warm light above', () => {
    const bright = meshes.filter((mesh) => colorOf(mesh).color.r > 1);
    expect(bright).toHaveLength(ENVIRONMENT.lamps + 1);
    for (const mesh of bright) {
      const { r, b } = colorOf(mesh).color;
      expect(r).toBeGreaterThan(b);
    }
    const top = bright.reduce((a, c) => (c.position.y > a.position.y ? c : a));
    expect(Math.hypot(top.position.x, top.position.z)).toBe(0);
  });
});
