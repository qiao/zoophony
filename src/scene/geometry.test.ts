import { DataTexture, ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';

import { FINISHES, FINISH_ORDER, MeshBuilder } from '../models/mesh.ts';
import { box, cylinder } from '../models/primitives.ts';
import { shadeMesh } from '../models/shading.ts';
import { buildPlayer } from '../models/player.ts';
import { FUR_SHEEN, createGeometry, createMaterials } from './geometry.ts';
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

  it('reads the sheen of fur of each finish from the red channel of its texel', () => {
    const [material] = createMaterials();
    const map = material.roughnessMap;
    const texels = map instanceof DataTexture ? map.image.data : null;
    for (const [i, finish] of FINISH_ORDER.entries()) {
      expect(texels?.[i * 4]).toBe(Math.round(FINISHES[finish].sheen * 255));
    }
    expect(FINISHES.matte.sheen).toBeGreaterThan(0);
    expect(FINISHES.metal.sheen).toBe(0);
  });

  it('adds the fur sheen of the players to the light sum of the standard shader', () => {
    const [material] = createMaterials();
    const shader = {
      uniforms: {},
      vertexShader: ShaderLib.standard.vertexShader,
      fragmentShader: ShaderLib.standard.fragmentShader,
    };
    // SAFETY: onBeforeCompile reads and writes only these three fields of the shader.
    material.onBeforeCompile(
      shader as Parameters<typeof material.onBeforeCompile>[0],
      undefined as never,
    );
    expect(shader.fragmentShader).toContain('uniform float uFurSheen;');
    const sheen = shader.fragmentShader.indexOf('reflectedLight.directDiffuse *= furLight;');
    expect(sheen).toBeGreaterThan(shader.fragmentShader.indexOf('#include <lights_fragment_end>'));
    expect(sheen).toBeLessThan(shader.fragmentShader.indexOf('vec3 totalDiffuse'));
    expect(shader.fragmentShader).toContain('#ifdef USE_SKINNING');
    expect(shader.uniforms).toEqual({
      uFurSheen: { value: FUR_SHEEN.strength },
      uFurSheenPower: { value: FUR_SHEEN.power },
    });
    expect(material.customProgramCacheKey()).toBe('fur-sheen');
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
