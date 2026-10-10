import { DataTexture, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { FINISHES, FINISH_ORDER, MeshBuilder, triangleNormal } from '../models/mesh.ts';
import { box, cylinder } from '../models/primitives.ts';
import { boneIndex } from '../models/rig.ts';
import { shadeMesh } from '../models/shading.ts';
import { buildPlayer } from '../models/player.ts';
import { createGeometry, createMaterials } from './geometry.ts';
import { createPlayerGeometry } from './player.ts';

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

  it('gives each vertex its crease normal', () => {
    const builder = new MeshBuilder();
    builder.add(cylinder(1, 1, 1, 16), { color: [1, 1, 1] });
    const data = builder.build();
    const normal = createGeometry(data).getAttribute('normal');
    expect(normal.array).toEqual(shadeMesh(data, null).normals);
  });

  it('darkens the vertex colors of a player by the baked occlusion', () => {
    const model = buildPlayer('bear', 'baton');
    const { light } = shadeMesh(model.mesh, model.skeleton.parents);
    const colors = createPlayerGeometry(model).getAttribute('color');
    let darker = 0;
    for (let v = 0; v < colors.count; v++) {
      expect(colors.getX(v)).toBeCloseTo((model.mesh.colors[v * 3] ?? 0) * (light?.[v] ?? 1), 6);
      if ((light?.[v] ?? 1) < 0.9) {
        darker++;
      }
    }
    expect(darker).toBeGreaterThan(0);
  });

  it('gives the fur of a player flat faces (design 4.5)', () => {
    const model = buildPlayer('bear', 'baton');
    const normal = createPlayerGeometry(model).getAttribute('normal');
    expect(normal.array).toEqual(shadeMesh(model.mesh, model.skeleton.parents).normals);

    // Each corner of a fur triangle of the head has the normal of its face. The triangles of one
    // plane of a faceted head (design 4.5) share the mean of their normals, which differ by less
    // than 0.1° in the 32-bit positions.
    const fur = FINISH_ORDER.indexOf('fur');
    const head = boneIndex('head');
    let flat = 0;
    for (let t = 0; t < model.mesh.finishes.length; t++) {
      const corners = [0, 1, 2].map((k) => t * 3 + k);
      if (model.mesh.finishes[t] !== fur || corners.some((c) => model.mesh.bones[c] !== head)) {
        continue;
      }
      const face = new Vector3(
        ...triangleNormal(Array.from(model.mesh.positions.subarray(t * 9, t * 9 + 9)), 0),
      ).normalize();
      for (const c of corners) {
        expect(normal.getX(c)).toBeCloseTo(face.x, 3);
        expect(normal.getY(c)).toBeCloseTo(face.y, 3);
        expect(normal.getZ(c)).toBeCloseTo(face.z, 3);
      }
      flat++;
    }
    // The faceted head of the bear has a few large faces (design 4.5).
    expect(flat).toBeGreaterThan(60);
  });

  it('keeps the colors of a static mesh', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [0.5, 0.25, 1] });
    const data = builder.build();
    expect(createGeometry(data).getAttribute('color').array).toEqual(data.colors);
  });
});

describe('createMaterials', () => {
  it('shades with the normals of the geometry', () => {
    const [material] = createMaterials();
    expect(material.flatShading).toBe(false);
  });

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
