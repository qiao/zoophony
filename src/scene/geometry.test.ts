import { DataTexture } from 'three';
import { describe, expect, it } from 'vitest';

import { FINISHES, FINISH_ORDER, MeshBuilder } from '../models/mesh.ts';
import { box } from '../models/primitives.ts';
import { createGeometry, createMaterials } from './geometry.ts';

describe('createGeometry', () => {
  it('points the uv of each vertex at the texel of the finish of its triangle', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [1, 1, 1], finish: 'metal' });
    builder.add(box(1, 1, 1), { color: [1, 1, 1] });
    const geometry = createGeometry(builder.build());
    const uv = geometry.getAttribute('uv');
    const texel = (finish: number): number => (finish + 0.5) / FINISH_ORDER.length;
    expect(uv.getX(0)).toBeCloseTo(texel(FINISH_ORDER.indexOf('metal')), 6);
    expect(uv.getX(12 * 3 - 1)).toBeCloseTo(texel(FINISH_ORDER.indexOf('metal')), 6);
    expect(uv.getX(12 * 3)).toBeCloseTo(texel(FINISH_ORDER.indexOf('matte')), 6);
    expect(geometry.groups).toEqual([{ start: 0, count: 24 * 3, materialIndex: 0 }]);
  });
});

describe('createMaterials', () => {
  it('reads the roughness and the metalness of each finish from one texel', () => {
    const [material] = createMaterials();
    const map = material.roughnessMap;
    expect(material.metalnessMap).toBe(map);
    expect(map).toBeInstanceOf(DataTexture);
    const texels = map instanceof DataTexture ? map.image.data : null;
    for (const [i, finish] of FINISH_ORDER.entries()) {
      expect(texels?.[i * 4 + 1]).toBe(Math.round(FINISHES[finish].roughness * 255));
      expect(texels?.[i * 4 + 2]).toBe(Math.round(FINISHES[finish].metalness * 255));
    }
  });
});
