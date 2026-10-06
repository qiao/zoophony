import { Group, Mesh } from 'three';
import type { MeshStandardMaterial } from 'three';

import type { Vec3 } from '../models/tuples.ts';
import { buildStage } from '../models/stage.ts';
import { createGeometry } from './geometry.ts';

/**
 * Creates the stage (design 4.5). The floor of the hall around it is part of the hall
 * (scene/hall.ts).
 *
 * @param stageSide The stage side `S`, in meters.
 * @param podium The podium center of the layout, or `null` for a layout with no podium.
 * @param materials The matte and the metal material of {@link createMaterials}.
 * @returns A group with the stage mesh.
 */
export function createStage(
  stageSide: number,
  podium: Vec3 | null,
  materials: readonly MeshStandardMaterial[],
): Group {
  const stage = new Mesh(createGeometry(buildStage(stageSide, podium)), [...materials]);
  stage.castShadow = true;
  stage.receiveShadow = true;
  return new Group().add(stage);
}
