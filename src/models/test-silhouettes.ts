import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

import { FIELD_OF_VIEW, NEAR, VIEW_OFFSET_Y, defaultDistance, farPlane } from '../shots/view.ts';
import { CONDUCTOR } from './cast.ts';
import type { SceneLayout } from './layout.ts';
import type { ModelCache } from './model-cache.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';

/** The size of the image of a check, in pixels: the desktop view of design 9.7. */
const IMAGE = { width: 1440, height: 900 } as const;

/** A view of the stage center: the angles in degrees, and the zoom of the default distance. */
interface StageView {
  readonly azimuth: number;
  readonly elevation: number;
  readonly zoom: number;
}

/**
 * The default view of design 4.5 and the three other wide shots of design 5.6, at rest, in a
 * desktop viewport.
 */
export const WIDE_VIEWS: readonly StageView[] = [
  { azimuth: 30, elevation: 28, zoom: 1 },
  { azimuth: -28, elevation: 24, zoom: 0.95 },
  { azimuth: 0, elevation: 22, zoom: 0.82 },
  { azimuth: 38, elevation: 34, zoom: 1 },
];

/** One item of an image: its triangles in pixels with their depths. */
interface Silhouette {
  readonly label: string;
  /** Three corners for each triangle: x and y in pixels, and the depth. */
  readonly corners: Float32Array;
  /** The bone of the first corner of each triangle. */
  readonly bones: readonly number[];
}

/**
 * Makes the camera of a view of the stage center (design 4.5, camera).
 *
 * @param stageSide The stage side `S`.
 * @param view The angles and the zoom.
 * @returns The camera.
 */
export function stageCamera(stageSide: number, view: StageView): PerspectiveCamera {
  const { width, height } = IMAGE;
  const distance = defaultDistance(stageSide, width / height) * view.zoom;
  const elevation = view.elevation * MathUtils.DEG2RAD;
  const azimuth = view.azimuth * MathUtils.DEG2RAD;
  const flat = Math.cos(elevation) * distance;
  const camera = new PerspectiveCamera(
    FIELD_OF_VIEW,
    width / height,
    NEAR,
    farPlane(distance, stageSide),
  );
  camera.setViewOffset(width, height, 0, VIEW_OFFSET_Y, width, height);
  camera.position.set(
    Math.sin(azimuth) * flat,
    Math.sin(elevation) * distance,
    Math.cos(azimuth) * flat,
  );
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

/**
 * Projects the bind pose mesh of each player and of the conductor into the image. The chairs and
 * the stands are not in the image.
 *
 * @param layout The layout.
 * @param models The player models of the layout.
 * @param camera The camera.
 * @returns The silhouettes, in the order of the players, then the conductor, if the layout has
 *   one.
 */
export function silhouettesOf(
  layout: SceneLayout,
  models: ModelCache,
  camera: PerspectiveCamera,
): Silhouette[] {
  const { width, height } = IMAGE;
  const spots = layout.players.map((p) => ({
    species: p.cast.species,
    instrument: p.cast.instrument,
    kettles: p.cast.kettles,
    support: p.cast.support,
    position: p.position,
    facing: p.facing,
  }));
  if (layout.conductor) {
    spots.push({ ...CONDUCTOR, kettles: 4, support: 'stand', ...layout.conductor });
  }
  const point = new Vector3();
  return spots.map((spot, index) => {
    const mesh = models.get(spot.species, spot.instrument, spot.kettles, spot.support).mesh;
    const positions = mesh.positions;
    const cos = Math.cos(spot.facing);
    const sin = Math.sin(spot.facing);
    const corners = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i] ?? 0;
      const z = positions[i + 2] ?? 0;
      // The turn of `Object3D.rotation.y` by the facing, then the move to the place.
      point
        .set(
          x * cos + z * sin + spot.position[0],
          (positions[i + 1] ?? 0) + spot.position[1],
          -x * sin + z * cos + spot.position[2],
        )
        .project(camera);
      corners[i] = ((point.x + 1) / 2) * width;
      corners[i + 1] = ((1 - point.y) / 2) * height;
      corners[i + 2] = point.z;
    }
    const bones = Array.from({ length: mesh.bones.length / 3 }, (_, t) => mesh.bones[t * 3] ?? -1);
    return { label: `${spot.species} ${spot.instrument} (player ${index})`, corners, bones };
  });
}

/**
 * Visits each pixel of each triangle of a silhouette, with the depth there.
 *
 * @param silhouette The silhouette.
 * @param visit Gets the index of the pixel, the depth, and the bone of the triangle.
 */
function rasterize(
  silhouette: Silhouette,
  visit: (pixel: number, depth: number, bone: number) => void,
): void {
  const { width, height } = IMAGE;
  const c = silhouette.corners;
  for (let t = 0; t * 9 < c.length; t++) {
    const [ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0, cx = 0, cy = 0, cz = 0] = c.subarray(
      t * 9,
      t * 9 + 9,
    );
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-12) {
      continue;
    }
    const bone = silhouette.bones[t] ?? -1;
    const top = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const bottom = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
    const left = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const right = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
    for (let py = top; py <= bottom; py++) {
      for (let px = left; px <= right; px++) {
        const x = px + 0.5;
        const y = py + 0.5;
        const wa = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / area;
        const wb = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / area;
        const wc = 1 - wa - wb;
        if (wa >= 0 && wb >= 0 && wc >= 0) {
          visit(py * width + px, wa * az + wb * bz + wc * cz, bone);
        }
      }
    }
  }
}

/**
 * The bones of the part of a player that a viewer follows: the head, the chest, the arms, and
 * the instrument with its bow. The legs and the chair are not in it.
 */
export const PLAYING_BONES: ReadonlySet<number> = new Set(
  (
    [
      'chest',
      'neck',
      'head',
      'jaw',
      'eyeL',
      'eyeR',
      'earL',
      'earR',
      'trunk1',
      'trunk2',
      'trunk3',
      'shoulderL',
      'upperArmL',
      'forearmL',
      'handL',
      'fingersL',
      'shoulderR',
      'upperArmR',
      'forearmR',
      'handR',
      'fingersR',
      'instrument',
      'bow',
    ] as const satisfies readonly BoneName[]
  ).map((bone) => boneIndex(bone)),
);

/**
 * Finds the part of the silhouette of an item that other items hide, with a depth buffer.
 *
 * @param silhouettes All items of the image.
 * @param back The index of the item that can be hidden.
 * @param front The indices of the items that count as hiding.
 * @param bones The bones of `back` that count. All bones by default.
 * @returns The part of the pixels of `back` that one of `front` covers nearer to the camera.
 */
export function hiddenShare(
  silhouettes: readonly Silhouette[],
  back: number,
  front: readonly number[],
  bones?: ReadonlySet<number>,
): number {
  const target = silhouettes[back];
  if (!target) {
    return 0;
  }
  const own = new Map<number, number>();
  rasterize(target, (pixel, z, bone) => {
    if (!bones || bones.has(bone)) {
      own.set(pixel, Math.min(own.get(pixel) ?? Infinity, z));
    }
  });
  const hidden = new Set<number>();
  for (const id of front) {
    const item = silhouettes[id];
    if (!item) {
      continue;
    }
    rasterize(item, (pixel, z) => {
      const depth = own.get(pixel);
      if (depth !== undefined && z < depth) {
        hidden.add(pixel);
      }
    });
  }
  return own.size === 0 ? 0 : hidden.size / own.size;
}
