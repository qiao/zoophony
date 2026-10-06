import { describe, expect, it } from 'vitest';
import { Mesh } from 'three';

import { createMaterials } from './geometry.ts';
import { createStage } from './stage.ts';

describe('createStage', () => {
  it('makes one stage mesh that casts and takes the shadows of the spotlight', () => {
    const meshes = createStage(8, [0, 0, 3], createMaterials()).children;
    expect(meshes).toHaveLength(1);
    const [stage] = meshes;
    expect(stage).toBeInstanceOf(Mesh);
    expect(stage?.castShadow).toBe(true);
    expect(stage?.receiveShadow).toBe(true);
  });
});
