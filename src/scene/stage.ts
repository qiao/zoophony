import { Group, Mesh, PlaneGeometry, ShadowMaterial } from 'three';
import type { MeshStandardMaterial } from 'three';

import type { Vec3 } from '../models/math.ts';
import { STAGE_THICKNESS, buildStage } from '../models/stage.ts';
import { createGeometry } from './geometry.ts';

/** The side of the shadow-only floor, in stage sides (design 4.5, props). */
export const FLOOR_SIZE_IN_SIDES = 3;

/** The opacity of the shadows on the floor (design 4.5, props). */
export const FLOOR_SHADOW_OPACITY = 0.5;

/**
 * Creates the stage and the shadow-only floor (design 4.5). The floor shows only shadows, so the
 * CSS gradient of the page shows through it.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param podium The podium center of the layout.
 * @param materials The matte and the metal material of {@link createMaterials}.
 * @returns A group with the stage mesh and the floor.
 */
export function createStage(
  stageSide: number,
  podium: Vec3,
  materials: readonly MeshStandardMaterial[],
): Group {
  const stage = new Mesh(createGeometry(buildStage(stageSide, podium)), [...materials]);
  stage.castShadow = true;
  stage.receiveShadow = true;

  const size = FLOOR_SIZE_IN_SIDES * stageSide;
  const floor = new Mesh(
    new PlaneGeometry(size, size),
    new ShadowMaterial({ opacity: FLOOR_SHADOW_OPACITY }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -STAGE_THICKNESS;
  floor.receiveShadow = true;

  const group = new Group();
  group.add(stage, floor);
  return group;
}
