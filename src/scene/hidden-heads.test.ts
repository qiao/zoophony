import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';

import { patchedDemos } from '../../tools/patch-demos.ts';
import { CONDUCTOR } from '../models/cast.ts';
import type { SceneLayout } from '../models/layout.ts';
import { layoutScene } from '../models/layout-scene.ts';
import { ModelCache } from '../models/model-cache.ts';
import { boneIndex } from '../models/rig.ts';
import { SPECIES } from '../models/species.ts';
import type { SpeciesId } from '../models/species.ts';
import { HEAD_BONES } from '../pose/test-clearance.ts';
import { writeSmf } from '../midi/test-smf.ts';
import { choirFile } from '../models/test-choir.ts';
import { scoreOf } from '../score/test-score.ts';
import { FIELD_OF_VIEW, NEAR, VIEW_OFFSET_Y, defaultView, farPlane } from '../shots/view.ts';

/** The size of the image of the check, in pixels. */
const WIDTH = 1440;
const HEIGHT = 900;

/** The bones of the head, with the ears and the trunk. */
const HEAD = new Set<number>(HEAD_BONES.map((bone) => boneIndex(bone)));

/** One player of the image: its species, and its triangles in pixels with their depths. */
interface Silhouette {
  readonly species: SpeciesId;
  readonly label: string;
  /** Three corners for each triangle: x and y in pixels, and the depth. */
  readonly corners: Float32Array;
  /** True for each triangle of the head. */
  readonly head: readonly boolean[];
}

/** One pair in which a player hides a part of the head of another player. */
interface HiddenHead {
  readonly front: Silhouette;
  readonly back: Silhouette;
  /** The part of the visible head of `back` that `front` hides, from 0 to 1. */
  readonly share: number;
}

/**
 * Makes the camera of the default view for a layout at 1440 × 900 (design 4.5, camera).
 *
 * @param layout The layout.
 * @returns The camera.
 */
function cameraOf(layout: SceneLayout): PerspectiveCamera {
  const view = defaultView(layout.stageSide, WIDTH, HEIGHT);
  const camera = new PerspectiveCamera(
    FIELD_OF_VIEW,
    WIDTH / HEIGHT,
    NEAR,
    farPlane(view.distance, layout.stageSide),
  );
  camera.setViewOffset(WIDTH, HEIGHT, 0, VIEW_OFFSET_Y, WIDTH, HEIGHT);
  camera.position.set(...view.position);
  camera.lookAt(new Vector3(...view.target));
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
 * @returns The silhouettes, in the order of the players, then the conductor.
 */
function silhouettesOf(layout: SceneLayout, models: ModelCache): Silhouette[] {
  const camera = cameraOf(layout);
  const spots = [
    ...layout.players.map((p) => ({ ...p.cast, position: p.position, facing: p.facing })),
    { ...CONDUCTOR, kettles: 4 as const, support: 'stand' as const, ...layout.conductor },
  ];
  const point = new Vector3();
  return spots.map((spot, index) => {
    const { positions, bones } = models.get(
      spot.species,
      spot.instrument,
      spot.kettles,
      spot.support,
    ).mesh;
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
      corners[i] = ((point.x + 1) / 2) * WIDTH;
      corners[i + 1] = ((1 - point.y) / 2) * HEIGHT;
      corners[i + 2] = point.z;
    }
    const head = Array.from({ length: bones.length / 3 }, (_, t) => HEAD.has(bones[t * 3] ?? -1));
    return {
      species: spot.species,
      label: `${spot.species} ${spot.instrument} (player ${index})`,
      corners,
      head,
    };
  });
}

/**
 * Visits each pixel of each triangle of a silhouette, with the depth there.
 *
 * @param silhouette The silhouette.
 * @param visit Gets the index of the pixel, the depth, and true for a triangle of the head.
 */
function rasterize(
  silhouette: Silhouette,
  visit: (pixel: number, depth: number, head: boolean) => void,
): void {
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
    const head = silhouette.head[t] ?? false;
    const top = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const bottom = Math.min(HEIGHT - 1, Math.ceil(Math.max(ay, by, cy)));
    const left = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const right = Math.min(WIDTH - 1, Math.ceil(Math.max(ax, bx, cx)));
    for (let py = top; py <= bottom; py++) {
      for (let px = left; px <= right; px++) {
        const x = px + 0.5;
        const y = py + 0.5;
        const wa = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / area;
        const wb = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / area;
        const wc = 1 - wa - wb;
        if (wa >= 0 && wb >= 0 && wc >= 0) {
          visit(py * WIDTH + px, wa * az + wb * bz + wc * cz, head);
        }
      }
    }
  }
}

/**
 * Finds each pair in which a player hides at least 5% of the head of another player in the
 * default view, with a depth buffer of the silhouettes (`docs/research/seating.md`, section 7).
 *
 * @param layout The layout.
 * @param models The player models of the layout.
 * @returns The pairs.
 */
function hiddenHeads(layout: SceneLayout, models: ModelCache): HiddenHead[] {
  const silhouettes = silhouettesOf(layout, models);
  const depth = new Float32Array(WIDTH * HEIGHT).fill(Infinity);
  const owner = new Int16Array(WIDTH * HEIGHT).fill(-1);
  silhouettes.forEach((silhouette, id) => {
    rasterize(silhouette, (pixel, z) => {
      if (z < (depth[pixel] ?? Infinity)) {
        depth[pixel] = z;
        owner[pixel] = id;
      }
    });
  });
  const pairs: HiddenHead[] = [];
  silhouettes.forEach((back, id) => {
    // The nearest surface of the player alone gives its visible head.
    const own = new Map<number, { depth: number; head: boolean }>();
    rasterize(back, (pixel, z, head) => {
      const known = own.get(pixel);
      if (!known || z < known.depth) {
        own.set(pixel, { depth: z, head });
      }
    });
    const headPixels = [...own].filter(([, p]) => p.head).map(([pixel]) => pixel);
    const counts = new Map<number, number>();
    for (const pixel of headPixels) {
      const by = owner[pixel] ?? -1;
      if (by >= 0 && by !== id) {
        counts.set(by, (counts.get(by) ?? 0) + 1);
      }
    }
    for (const [by, count] of counts) {
      const front = silhouettes[by];
      const share = count / headPixels.length;
      if (front && share >= 0.05) {
        pairs.push({ front, back, share });
      }
    }
  });
  return pairs;
}

describe('the default view (design 4.2, 4.5)', () => {
  // The test draws six images of 1440 x 900 pixels with each triangle of each animal. It takes
  // 0.8 s on an idle Mac, so a high load of the machine can pass the default limit of 5 s.
  it('shows each head of a smaller animal behind a large animal to at least 90%', async () => {
    // The user asked on 2026-10-05 that the large animals sit at the back, so that they hide no
    // smaller animal. A large species has the size 1.2 or more.
    const found: string[] = [];
    // A model of a kind of player is always the same, so the layouts share one cache.
    const models = new ModelCache();
    const inputs = [
      ...(await patchedDemos()).map((demo) => ({ name: demo.file, bytes: demo.bytes })),
      { name: 'choir', bytes: writeSmf(choirFile()) },
    ];
    for (const { name, bytes } of inputs) {
      const layout = layoutScene(scoreOf(bytes), models);
      for (const { front, back, share } of hiddenHeads(layout, models)) {
        const large = SPECIES[front.species].size >= 1.2;
        if (!large || SPECIES[back.species].size >= SPECIES[front.species].size) {
          continue;
        }
        // The lowest riser level stands 1.0 m high. With 0.25 m, the elephant of the timpani hid
        // 18.1% of the head of one penguin of the choir test file, and this pair had a limit of
        // 20% (docs/research/seating.md, section 7).
        if (share >= 0.1) {
          found.push(`${name}: ${front.label} hides ${(100 * share).toFixed(1)}% of ${back.label}`);
        }
      }
    }
    expect(found).toEqual([]);
  });
});
