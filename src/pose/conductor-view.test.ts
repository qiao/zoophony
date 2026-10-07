import { describe, expect, it } from 'vitest';

import { MathUtils, Vector3 } from 'three';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { CONDUCTOR } from '../models/cast.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import type { Vec3 } from '../models/tuples.ts';
import { countInAt } from './count-in.ts';
import { posePoint } from './frames.ts';
import type { PosePlan } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { poseSkeleton } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { PLAYING, allAudible, ofConductor, sceneOf } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';

/** A point in the image plane of a view: to the right and up, in meters. */
type ViewPoint = readonly [x: number, y: number];

/** A camera that sees the bear from behind, as the camera of a shot (design 5.6). */
interface BackView {
  readonly name: string;
  /** The angle of the line of sight below the level, in radians. */
  readonly elevation: number;
}

/**
 * The cameras behind the bear: the close conductor shot (view 05 of `scene.png`, 10° above the
 * level), and the default view, which looks down at about 34° at the podium (review of
 * 2026-10-07).
 */
const VIEWS: readonly BackView[] = [
  { name: 'conductor shot', elevation: 10 * MathUtils.DEG2RAD },
  { name: 'default view', elevation: 34 * MathUtils.DEG2RAD },
];

/** The bones of the outline of the head from behind: the head with the ears, the jaw, the eyes. */
const HEAD = ['head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR'] as const satisfies readonly BoneName[];

/** The bones of each hand. */
const HANDS = {
  L: ['handL', 'fingersL'],
  R: ['handR', 'fingersR'],
} as const satisfies Readonly<Record<'L' | 'R', readonly BoneName[]>>;

/** The step of the song time between two samples, in seconds. */
const STEP = 0.1;

/**
 * The smallest median distance of each hand from the outline of the head, in head heights `H`.
 * In `mockup.png`, the left hand is about 0.15 H and the baton hand about 0.6 H from it.
 */
const MEDIAN_GAP = 0.2;

/** The smallest median height of each wrist above its shoulder joint, in `H`. */
const MEDIAN_HEIGHT = 0.35;

/**
 * Gives a point of the model axes in the image plane of a view from behind. The bear faces -z,
 * so the right of the image is +x, and its up leans forward by the elevation.
 *
 * @param view The view.
 * @param point The point.
 * @returns The point in the image plane.
 */
function inView(view: BackView, point: Vector3): ViewPoint {
  return [point.x, point.y * Math.cos(view.elevation) - point.z * Math.sin(view.elevation)];
}

/**
 * Gives the convex hull of some points, counterclockwise (Andrew's monotone chain).
 *
 * @param points The points.
 * @returns The corners of the hull.
 */
function hullOf(points: readonly ViewPoint[]): ViewPoint[] {
  const sorted = points.toSorted((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: ViewPoint, a: ViewPoint, b: ViewPoint): number =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chain = (list: readonly ViewPoint[]): ViewPoint[] => {
    const out: ViewPoint[] = [];
    for (const p of list) {
      while (out.length >= 2 && turn(out.at(-2) ?? p, out.at(-1) ?? p, p) <= 0) {
        out.pop();
      }
      out.push(p);
    }
    return out.slice(0, -1);
  };
  return [...chain(sorted), ...chain(sorted.toReversed())];
}

/**
 * Gives the distance of a point from a convex outline: positive outside, negative inside.
 *
 * @param hull The corners of the outline, counterclockwise.
 * @param point The point.
 * @returns The signed distance.
 */
function outsideOf(hull: readonly ViewPoint[], point: ViewPoint): number {
  let inside = true;
  let nearest = Infinity;
  for (const [i, a] of hull.entries()) {
    const b = hull[(i + 1) % hull.length] ?? a;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const dx = point[0] - a[0];
    const dy = point[1] - a[1];
    if (ex * dy - ey * dx < 0) {
      inside = false;
    }
    const t = MathUtils.clamp((dx * ex + dy * ey) / (ex * ex + ey * ey || 1), 0, 1);
    nearest = Math.min(nearest, Math.hypot(dx - t * ex, dy - t * ey));
  }
  return inside ? -nearest : nearest;
}

/** The parts of the bear that the measure sees: the head and each hand. */
type Part = 'head' | 'L' | 'R';

/** One mesh point that the measure sees: a corner of the bind mesh, with its bone. */
interface SeenPoint {
  readonly part: Part;
  readonly bone: number;
  /** The bind point, in the model axes. */
  readonly bind: Vec3;
}

/**
 * Finds the mesh points of the head and of the hands, each one time. The flat mesh holds each
 * corner once for each triangle.
 *
 * @param model The bear.
 * @returns The points.
 */
function seenPoints(model: PlayerModel): SeenPoint[] {
  const parts = new Map<number, Part>();
  for (const bone of HEAD) {
    parts.set(boneIndex(bone), 'head');
  }
  for (const side of ['L', 'R'] as const) {
    for (const bone of HANDS[side]) {
      parts.set(boneIndex(bone), side);
    }
  }

  const { positions, bones } = model.mesh;
  const seen = new Map<string, SeenPoint>();
  for (const [v, bone] of bones.entries()) {
    const part = parts.get(bone);
    if (part) {
      const bind: Vec3 = [
        positions[3 * v] ?? 0,
        positions[3 * v + 1] ?? 0,
        positions[3 * v + 2] ?? 0,
      ];
      seen.set(`${bone} ${bind.join(' ')}`, { part, bone, bind });
    }
  }
  return [...seen.values()];
}

/**
 * Gives the posed points of the head and of the hands in the image plane of each view.
 *
 * @param posed The posed skeleton.
 * @param seen The points. Each point follows the bone of its vertex (design 4.4).
 * @returns For each view, the points of each part.
 */
function viewPoints(posed: PosedSkeleton, seen: readonly SeenPoint[]): Record<Part, ViewPoint[]>[] {
  const out = VIEWS.map((): Record<Part, ViewPoint[]> => ({ head: [], L: [], R: [] }));
  const binds = posed.model.skeleton.positions;
  for (const { part, bone, bind } of seen) {
    const frame = posed.frames[bone];
    if (!frame) {
      continue;
    }
    const point = posePoint(frame, binds[bone] ?? [0, 0, 0], bind);
    for (const [k, view] of VIEWS.entries()) {
      out[k]?.[part].push(inView(view, point));
    }
  }
  return out;
}

/** The measures of one hand over a play, in `H`. */
interface HandMeasures {
  /** The distance from the outline of the head in each view, one value for each sample. */
  readonly gaps: number[][];
  /** The height of the wrist above the shoulder joint, one value for each sample. */
  readonly heights: number[];
}

/**
 * Measures the hands of the bear from behind in each sample of a full play: the count-in and
 * each song time to the end, at {@link STEP}.
 *
 * @param scene The scene.
 * @param bear The model of the bear.
 * @returns The measures of the left and the right hand.
 */
function measurePlay(scene: TestScene, bear: PlayerModel): Record<'L' | 'R', HandMeasures> {
  const plan: PosePlan = { ...scene.plan, players: [] };
  const buffer = createScenePose(plan);
  const audible = allAudible(scene.score);
  const h = bear.body.headHeight;
  const seen = seenPoints(bear);
  const out = {
    L: { gaps: VIEWS.map((): number[] => []), heights: new Array<number>() },
    R: { gaps: VIEWS.map((): number[] => []), heights: new Array<number>() },
  };

  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  for (let song = start; song <= scene.score.durationSec; song += STEP) {
    const wall = 10 + song - start;
    const pose = ofConductor(poseAt(plan, song, wall, PLAYING, audible, buffer).conductor);
    const posed = poseSkeleton(bear, pose);
    const views = viewPoints(posed, seen);
    const hulls = views.map((points) => hullOf(points.head));
    for (const side of ['L', 'R'] as const) {
      for (const [k, points] of views.entries()) {
        const hull = hulls[k] ?? [];
        const gap = Math.min(...points[side].map((p) => outsideOf(hull, p)));
        out[side].gaps[k]?.push(gap / h);
      }
      const wrist = posed.frames[boneIndex(side === 'L' ? 'handL' : 'handR')]?.position;
      const shoulder = posed.frames[boneIndex(side === 'L' ? 'upperArmL' : 'upperArmR')]?.position;
      out[side].heights.push(((wrist?.y ?? 0) - (shoulder?.y ?? 0)) / h);
    }
  }
  return out;
}

/**
 * Gives the median of some values.
 *
 * @param values The values.
 * @returns The median.
 */
function median(values: readonly number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? NaN;
}

describe('the conductor from behind (design 5.4, review of 2026-10-07)', async () => {
  const demos = await patchedDemos();
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes, 1);
    if (!scene.plan.conductor) {
      continue;
    }
    it(`keeps the baton hand up and beside the head in a play of ${demo.file}`, () => {
      // Both hands were at the height of the mouth, 0 to 10 px from the outline of the head, and
      // the bear seemed to hold its head. In `mockup.png`, the arms go up and out.
      const bear = scene.models.get(CONDUCTOR.species, CONDUCTOR.instrument, 4);
      const hands = measurePlay(scene, bear);
      for (const side of ['R'] as const) {
        const { gaps, heights } = hands[side];
        for (const [k, view] of VIEWS.entries()) {
          const label = `hand ${side}, ${view.name}`;
          expect(Math.min(...(gaps[k] ?? [])), label).toBeGreaterThanOrEqual(0);
          expect(median(gaps[k] ?? []), label).toBeGreaterThanOrEqual(MEDIAN_GAP);
        }
        expect(median(heights), `wrist ${side}`).toBeGreaterThanOrEqual(MEDIAN_HEIGHT);
      }
    });
  }
});
