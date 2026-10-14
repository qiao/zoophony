import { DataTexture, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { FINISHES, FINISH_ORDER, MeshBuilder } from '../models/mesh.ts';
import { box, cylinder } from '../models/primitives.ts';
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

  it('keeps each matte face of an animal flat', () => {
    const model = buildPlayer('fox-tan', 'violin');
    const { positions, finishes } = model.mesh;
    const normal = createPlayerGeometry(model).getAttribute('normal');
    const corner = (i: number): Vector3 => new Vector3().fromArray(positions, i * 3);
    let checked = 0;
    for (let t = 0; t < finishes.length; t++) {
      if (FINISH_ORDER[finishes[t] ?? 0] !== 'matte') {
        continue;
      }
      const a = corner(t * 3);
      const face = corner(t * 3 + 1)
        .sub(a)
        .cross(corner(t * 3 + 2).sub(a));
      if (face.lengthSq() < 1e-12) {
        continue;
      }
      face.normalize();
      for (let c = 0; c < 3; c++) {
        const v = t * 3 + c;
        const dot = normal.getX(v) * face.x + normal.getY(v) * face.y + normal.getZ(v) * face.z;
        expect(dot).toBeGreaterThan(0.9999);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('darkens the vertex colors of a player by the baked occlusion', () => {
    const model = buildPlayer('fox-tan', 'violin');
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
