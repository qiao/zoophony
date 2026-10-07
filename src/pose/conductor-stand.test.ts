import { describe, expect, it } from 'vitest';

import { Box3, Triangle, Vector3 } from 'three';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { CONDUCTOR } from '../models/cast.ts';
import { conductorOn } from '../models/layout-scene.ts';
import { BONE_NAMES } from '../models/rig.ts';
import { buildPodium } from '../models/stage.ts';
import { countInAt } from './count-in.ts';
import type { PosePlan } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { partDistance, posedPart } from './test-clearance.ts';
import type { PosedPart } from './test-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import { PLAYING, allAudible, ofConductor, sceneOf } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';
import type { Transport } from './types.ts';

/** The smallest gap from the bear to the conductor stand, in meters. */
const GAP = 0.02;

/** The step of the song time between two samples, in seconds. */
const STEP = 0.1;

/**
 * Gives the conductor stand in the model axes of the bear: the triangles of the podium mesh above
 * the podium top, which are the post, the desk, and the open score. The bear stands on the podium
 * top at the podium center, and faces the orchestra with no turn (design 4.5).
 *
 * @returns The stand.
 */
function standOf(): PosedPart {
  const place = conductorOn([0, 0, 0]);
  expect(place.facing).toBe(0);
  const from = new Vector3(...place.position);
  const mesh = buildPodium();
  const triangles: Triangle[] = [];
  const box = new Box3();
  for (let v = 0; v < mesh.positions.length / 3; v += 3) {
    const [a, b, c] = [0, 1, 2].map((k) =>
      new Vector3().fromArray(mesh.positions, (v + k) * 3).sub(from),
    );
    if (!a || !b || !c || Math.max(a.y, b.y, c.y) < 0.05) {
      continue;
    }
    triangles.push(new Triangle(a, b, c));
    box.expandByPoint(a).expandByPoint(b).expandByPoint(c);
  }
  return { triangles, box };
}

/** The nearest pose of the bear to the stand. */
interface Nearest {
  readonly gap: number;
  readonly label: string;
}

/**
 * Finds the pose of the bear nearest to the stand at some times.
 *
 * @param scene The scene.
 * @param stand The stand.
 * @param samples The song time, the wall time, and the transport of each sample.
 * @returns The smallest gap, up to {@link GAP}, with its sample.
 */
function nearestPose(
  scene: TestScene,
  stand: PosedPart,
  samples: Iterable<readonly [song: number, wall: number, transport: Transport]>,
): Nearest {
  const bear = scene.models.get(CONDUCTOR.species, CONDUCTOR.instrument, 4);
  const plan: PosePlan = { ...scene.plan, players: [] };
  const buffer = createScenePose(plan);
  const audible = allAudible(scene.score);
  let nearest: Nearest = { gap: GAP, label: 'none' };
  for (const [song, wall, transport] of samples) {
    const pose = ofConductor(poseAt(plan, song, wall, transport, audible, buffer).conductor);
    const gap = partDistance(posedPart(poseSkeleton(bear, pose), BONE_NAMES), stand, GAP);
    if (gap < nearest.gap) {
      nearest = { gap, label: `song ${song.toFixed(2)} s, wall ${wall.toFixed(2)} s` };
    }
  }
  return nearest;
}

/**
 * Gives the samples of a full play of a scene: the count-in and each song time to the end.
 *
 * @param scene The scene.
 * @yields The song time, the wall time, and the transport.
 */
function* playSamples(scene: TestScene): Generator<readonly [number, number, Transport]> {
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  for (let song = start; song <= scene.score.durationSec; song += STEP) {
    yield [song, 10 + song - start, PLAYING];
  }
}

/**
 * Gives the samples of the motions of the arms (design 5.2, 5.4): the lift at the play start, in
 * the count-in, and the bow and the lowering after the song end.
 *
 * @param scene The scene.
 * @yields The song time, the wall time, and the transport.
 */
function* armSamples(scene: TestScene): Generator<readonly [number, number, Transport]> {
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const play: Transport = { ...PLAYING, changedAtWall: 10 };
  const ended: Transport = { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
  for (let wall = 10; wall < 14; wall += STEP / 5) {
    yield [Math.min(0, start + wall - 10), wall, play];
    yield [scene.score.durationSec, wall, ended];
  }
}

describe('the conductor and its stand (design 4.5, 5.4)', async () => {
  const stand = standOf();
  const demos = await patchedDemos();
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes, 1);
    if (!scene.plan.conductor) {
      continue;
    }
    it(`keeps the bear out of the stand in a full play of ${demo.file}`, () => {
      const nearest = nearestPose(scene, stand, playSamples(scene));
      expect(nearest.gap, nearest.label).toBeGreaterThanOrEqual(GAP);
    });

    it(`keeps the bear out of the stand when it lifts and lowers its arms in ${demo.file}`, () => {
      const nearest = nearestPose(scene, stand, armSamples(scene));
      expect(nearest.gap, nearest.label).toBeGreaterThanOrEqual(GAP);
    });
  }
});
