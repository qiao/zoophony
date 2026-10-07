import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  MeshStandardMaterial,
  NearestFilter,
  NoColorSpace,
  RGBAFormat,
} from 'three';

import { FINISHES, FINISH_ORDER } from '../models/mesh.ts';
import type { MeshData } from '../models/mesh.ts';
import { shadeMesh } from '../models/shading.ts';

/**
 * Makes the finish table of design 4.5: one texel for each finish, with the roughness in the
 * green channel and the metalness in the blue channel, as three.js reads them from a roughness map
 * and a metalness map. The red channel holds the sheen of fur.
 *
 * @returns The texture, one texel high.
 */
function createFinishTexture(): DataTexture {
  const texels = new Uint8Array(FINISH_ORDER.length * 4);
  for (const [i, finish] of FINISH_ORDER.entries()) {
    texels[i * 4] = Math.round(FINISHES[finish].sheen * 255);
    texels[i * 4 + 1] = Math.round(FINISHES[finish].roughness * 255);
    texels[i * 4 + 2] = Math.round(FINISHES[finish].metalness * 255);
    texels[i * 4 + 3] = 255;
  }
  const texture = new DataTexture(texels, FINISH_ORDER.length, 1, RGBAFormat);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * The soft edge of fur (design 4.5, materials). Near the outline of a part, the view grazes the
 * surface, and the hairs scatter more light toward the eye. The light of a fur pixel grows by up
 * to `1 + strength`, with the power `power` of `1 - cos` of the angle between the normal and the
 * view. Thus the outlines of the players separate from the dark hall.
 */
export const FUR_SHEEN = {
  strength: 2,
  power: 2.5,
} as const;

/**
 * The GLSL of the fur sheen, after the light sum of three.js (`aomap_fragment`). The red channel
 * of the finish texel gives the sheen of the finish. Only a skinned mesh (a player) gets it, so
 * that the chairs and the stands keep the plain matte finish.
 */
const SHEEN_GLSL = /* glsl */ `
#ifdef USE_SKINNING
  float furEdge = pow(1.0 - saturate(dot(normal, geometryViewDir)), uFurSheenPower);
  float furLight = 1.0 + uFurSheen * texelRoughness.r * furEdge;
  reflectedLight.directDiffuse *= furLight;
  reflectedLight.indirectDiffuse *= furLight;
#endif
`;

/**
 * Creates the material of design 4.5. It uses the crease normals and the vertex colors of
 * {@link createGeometry}. The `uv` of each vertex points at the texel of its finish, so one
 * material and one draw call give each triangle its own roughness, metalness, and fur sheen.
 *
 * @returns The material, in an array for the one geometry group of {@link createGeometry}.
 */
export function createMaterials(): [MeshStandardMaterial] {
  const finishes = createFinishTexture();
  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 1,
    roughnessMap: finishes,
    metalnessMap: finishes,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uFurSheen'] = { value: FUR_SHEEN.strength };
    shader.uniforms['uFurSheenPower'] = { value: FUR_SHEEN.power };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uFurSheen;\nuniform float uFurSheenPower;',
      )
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${SHEEN_GLSL}`);
  };
  material.customProgramCacheKey = () => 'fur-sheen';
  return [material];
}

/**
 * Creates a geometry from mesh data, with one group for the material of
 * {@link createMaterials}. The `uv` of each vertex points at the middle of the texel of the
 * finish of its triangle.
 *
 * @param data The mesh data of `models/`.
 * @param parents The parent of each bone of a player, for the baked occlusion of design 4.5, or
 *   `null` for a static mesh with no occlusion.
 * @returns The geometry, with positions, colors, finish coordinates, and the crease normals of
 *   design 4.5. The colors hold the occlusion.
 */
export function createGeometry(
  data: MeshData,
  parents: readonly number[] | null = null,
): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
  const { normals, light } = shadeMesh(data, parents);
  const colors = light
    ? data.colors.map((value, i) => value * (light[Math.floor(i / 3)] ?? 1))
    : data.colors;
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  const vertexCount = data.positions.length / 3;
  const uv = new Float32Array(vertexCount * 2);
  for (let v = 0; v < vertexCount; v++) {
    uv[v * 2] = ((data.finishes[Math.floor(v / 3)] ?? 0) + 0.5) / FINISH_ORDER.length;
    uv[v * 2 + 1] = 0.5;
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.addGroup(0, vertexCount, 0);
  return geometry;
}
