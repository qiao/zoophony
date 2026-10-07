import { describe, expect, it } from 'vitest';

import { Box3, Triangle, Vector3 } from 'three';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { CONDUCTOR } from '../models/cast.ts';
import { conductorOn } from '../models/layout-scene.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { buildPodium } from '../models/stage.ts';
import { countInAt } from './count-in.ts';
import type { ModelCache } from '../models/model-cache.ts';
import { preparePoses } from './plan.ts';
import type { PosePlan } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { partDistance } from './test-clearance.ts';
import type { PosedPart } from './test-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { forearmCache } from './test-play-clearance.ts';
import { posePoint } from './frames.ts';
import { toVec3 } from '../models/tuples.ts';
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

/** The nearest pose of a sample, with its gap up to {@link GAP}. */
interface Nearest {
  readonly gap: number;
  readonly label: string;
}

/** The nearest poses of the bear to its stand, and of its left hand to the rest of the bear. */
interface Clearance {
  readonly stand: Nearest;
  readonly leftHand: Nearest;
}

/** The left forearm and hand, which move between the cues (design 5.4). */
const LEFT_HAND = ['forearmL', 'handL', 'fingersL'] as const satisfies readonly BoneName[];

/**
 * The parts of the bear that the left hand must not enter in the playing pose: the head, the
 * body, and the right forearm, hand, and baton. The upper arm joins the body at the shoulder, so
 * it is not here.
 */
const PLAYING_AVOID = [
  'head',
  'jaw',
  'neck',
  'hips',
  'spine',
  'chest',
  'forearmR',
  'handR',
  'fingersR',
  'baton',
] as const satisfies readonly BoneName[];

/**
 * The parts that the left hand must not enter when the arms lift and lower. The hanging arm of
 * the rest pose (5.2) touches the side of the round body, so the body is not here.
 */
const MOVING_AVOID = [
  'head',
  'jaw',
  'neck',
  'forearmR',
  'handR',
  'fingersR',
  'baton',
] as const satisfies readonly BoneName[];

/**
 * Gives the posed triangles of some groups of bones in one pass over the mesh. Each triangle
 * follows the bone of its first corner (design 4.4), as in `posedPart()` of `test-clearance.ts`.
 *
 * @param posed The posed skeleton.
 * @param groups The groups of bones.
 * @returns One part for each group.
 */
function posedParts(posed: PosedSkeleton, groups: readonly (readonly BoneName[])[]): PosedPart[] {
  const sets = groups.map((bones) => new Set(bones.map(boneIndex)));
  const parts = groups.map(() => ({ triangles: new Array<Triangle>(), box: new Box3() }));
  const { positions, bones } = posed.model.mesh;
  const binds = posed.model.skeleton.positions;
  const corner = new Vector3();
  for (let v = 0; v < bones.length; v += 3) {
    const bone = bones[v] ?? 0;
    const frame = posed.frames[bone];
    const owners = parts.filter((_, g) => sets[g]?.has(bone));
    if (!frame || owners.length === 0) {
      continue;
    }
    const bind = binds[bone] ?? [0, 0, 0];
    const [a, b, c] = [0, 1, 2].map((k) =>
      posePoint(frame, bind, toVec3(corner.fromArray(positions, (v + k) * 3))),
    );
    if (!a || !b || !c) {
      continue;
    }
    const triangle = new Triangle(a, b, c);
    for (const part of owners) {
      part.triangles.push(triangle);
      part.box.expandByPoint(a).expandByPoint(b).expandByPoint(c);
    }
  }
  return parts;
}

/**
 * Finds the poses of the bear nearest to the stand and the poses of its left hand nearest to the
 * rest of the bear, at some times.
 *
 * @param scene The scene.
 * @param stand The stand.
 * @param samples The song time, the wall time, and the transport of each sample.
 * @param avoid The bones that the left hand must not come near.
 * @param models The models of the bear: the models of the scene by default.
 * @returns The smallest gaps, up to {@link GAP}, with their samples.
 */
function clearanceOf(
  scene: TestScene,
  stand: PosedPart,
  samples: Iterable<readonly [song: number, wall: number, transport: Transport]>,
  avoid: readonly BoneName[],
  models: ModelCache = scene.models,
): Clearance {
  const bear = models.get(CONDUCTOR.species, CONDUCTOR.instrument, 4);
  const full =
    models === scene.models ? scene.plan : preparePoses(scene.score, scene.layout, 1, models);
  const plan: PosePlan = { ...full, players: [] };
  const buffer = createScenePose(plan);
  const audible = allAudible(scene.score);
  let nearest: Clearance = {
    stand: { gap: GAP, label: 'none' },
    leftHand: { gap: GAP, label: 'none' },
  };
  for (const [song, wall, transport] of samples) {
    const pose = ofConductor(poseAt(plan, song, wall, transport, audible, buffer).conductor);
    // Each bone of `avoid` is its own part, so that its tight box skips most triangles.
    const [all, hand, ...others] = posedParts(poseSkeleton(bear, pose), [
      BONE_NAMES,
      LEFT_HAND,
      ...avoid.map((bone) => [bone]),
    ]);
    if (!all || !hand) {
      throw new Error('The bear has its parts.');
    }
    const label = `song ${song.toFixed(2)} s, wall ${wall.toFixed(2)} s`;
    const toStand = partDistance(all, stand, GAP);
    const free = Math.min(GAP, ...others.map((other) => partDistance(hand, other, GAP)));
    nearest = {
      stand: toStand < nearest.stand.gap ? { gap: toStand, label } : nearest.stand,
      leftHand: free < nearest.leftHand.gap ? { gap: free, label } : nearest.leftHand,
    };
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

describe('the clearance of the conductor (design 4.5, 5.4)', async () => {
  const stand = standOf();
  const demos = await patchedDemos();
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes, 1);
    if (!scene.plan.conductor) {
      continue;
    }
    it(`keeps the bear out of the stand and the left hand free in a play of ${demo.file}`, () => {
      const { stand: toStand, leftHand } = clearanceOf(
        scene,
        stand,
        playSamples(scene),
        PLAYING_AVOID,
      );
      expect(toStand.gap, `stand, ${toStand.label}`).toBeGreaterThanOrEqual(GAP);
      // A cue of the left hand to the right, 20 degrees past the front of the upper body, put
      // the forearm through the muzzle of the turned head.
      expect(leftHand.gap, `left hand, ${leftHand.label}`).toBeGreaterThanOrEqual(GAP);
    });

    it(`keeps the bear out of the stand when it lifts and lowers its arms in ${demo.file}`, () => {
      const { stand: toStand, leftHand } = clearanceOf(
        scene,
        stand,
        armSamples(scene),
        MOVING_AVOID,
      );
      expect(toStand.gap, `stand, ${toStand.label}`).toBeGreaterThanOrEqual(GAP);
      expect(leftHand.gap, `left hand, ${leftHand.label}`).toBeGreaterThanOrEqual(GAP);
    });

    it(`keeps the left hand free in the lift of ${demo.file} with the forearms of option B`, () => {
      // With the elbow of 0.17 H, the left forearm came 1.90 cm from the head at the top of the
      // ready gesture in the count-in of K. 525 (2026-10-07).
      const { leftHand } = clearanceOf(
        scene,
        stand,
        armSamples(scene),
        MOVING_AVOID,
        forearmCache(),
      );
      expect(leftHand.gap, `left hand, ${leftHand.label}`).toBeGreaterThanOrEqual(GAP);
    });
  }
});
