import { describe, expect, it } from 'vitest';

import { Box3, Triangle, Vector3 } from 'three';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { PIANO } from '../models/instruments/piano.ts';
import type { PlayerModel } from '../models/player.ts';
import { buildSupport } from '../models/props.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { scoreOf } from '../score/test-score.ts';
import { shardOf } from '../test-shards.ts';
import { countInAt } from './count-in.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { depthUnder, partDistance, posedPart, signedDistance } from './test-clearance.ts';
import type { PosedPart } from './test-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { posedCorner } from './test-skin.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';
import type { Transport } from './types.ts';

/**
 * The largest depth of a point of a paw or a claw under the skin of the trunk and the head, and
 * under the case of the piano, in meters: the contact depth of the conductor (design 5.4). A paw
 * that rests on a knee presses the fur a little.
 */
export const PIANIST_DEPTH = 0.015;

/** The smallest gap from the trunk, the head, and the legs to the case of the piano, in meters. */
export const PIANIST_GAP = 0.01;

/** The step of the song time between two samples of a full play, in seconds. */
const STEP = 0.25;

/**
 * The step of the wall time between two samples of the lift at the play start and of the rest
 * pose, in seconds.
 */
const LIFT_STEP = 0.1;

/** The trunk, the head, and the legs: the paws must not enter them, and they must not enter the case. */
const BODY = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'jaw',
  'thighL',
  'thighR',
  'shinL',
  'shinR',
  'footL',
  'footR',
] as const satisfies readonly BoneName[];

/** The paws with their claws. */
const PAWS = ['handL', 'fingersL', 'handR', 'fingersR'] as const satisfies readonly BoneName[];

/**
 * The forearms. In the rest pose, they must not enter the trunk, the head, and the legs. While
 * the round polar bear plays, they go into its trunk (design 5.3).
 */
const FOREARMS = ['forearmL', 'forearmR'] as const satisfies readonly BoneName[];

/**
 * Tells if a point of the piano in its own axes is on the keyboard: the keys and the key bed under
 * them. A claw may press a key down, and the key bed is under the keys. The white keys run 0.15 m
 * back from the front edge of the keys, the black keys stand on them, and the key bed is 0.08 m
 * under their top.
 *
 * @param p The point, in the piano axes.
 * @returns True for a point of the keyboard.
 */
function onKeyboard(p: Vector3): boolean {
  return (
    Math.abs(p.x) <= PIANO.keyboardWidth / 2 + 0.005 &&
    p.z <= 0.005 &&
    p.z >= -PIANO.whiteKeyLength - 0.005 &&
    p.y >= PIANO.keyTop - 0.085
  );
}

/** The parts of the posed pianist. */
interface PianistParts {
  /** The trunk, the head, and the legs. */
  readonly body: PosedPart;
  /** The paws with their claws. */
  readonly paws: PosedPart;
  /** The forearms. */
  readonly forearms: PosedPart;
}

/**
 * Gives the case of the piano of a pianist: the closed shells of the piano that hold a triangle
 * off the keyboard, such as the fallboard, the cheek blocks, the key bed, the desk, and the rim.
 * The piano stands on the floor and does not move, so the shells of one pose serve all poses.
 *
 * @param posed The posed skeleton.
 * @returns The closed shells.
 */
function caseShells(posed: PosedSkeleton): readonly PosedPart[] {
  const piano = posed.model.pieces.find((p) => p.piece.bone === 'instrument');
  const origin = new Vector3(...(piano?.at.position ?? [0, 0, 0]));
  const middle = new Vector3();
  const part = posedPart(posed, ['instrument'], (corners) => {
    middle.set(0, 0, 0);
    for (const corner of corners) {
      middle.add(corner);
    }
    return !onKeyboard(middle.divideScalar(corners.length).sub(origin));
  });
  return part.closed?.() ?? [part];
}

/**
 * Gives the depth of the deepest point in a closed shell of a set, by the crossings of a ray
 * (`signedDistance()`), so that a point beside a thin board counts as outside.
 *
 * @param points The points.
 * @param shells The closed shells.
 * @returns The depth, in meters: 0 when no point is in a shell.
 */
function depthInShells(points: readonly Vector3[], shells: readonly PosedPart[]): number {
  let deepest = 0;
  for (const point of points) {
    for (const shell of shells) {
      if (shell.box.containsPoint(point)) {
        deepest = Math.max(deepest, -signedDistance(shell, point));
      }
    }
  }
  return deepest;
}

/**
 * Gives the triangles of the bench of a pianist in its model axes.
 *
 * @param model The model of the pianist.
 * @returns The bench.
 * @throws Error if the pianist has no seat.
 */
function benchOf(model: PlayerModel): PosedPart {
  const mesh = buildSupport(model.support, model.seat);
  if (!mesh) {
    throw new Error('The pianist has no bench.');
  }
  const triangles: Triangle[] = [];
  const box = new Box3();
  for (let v = 0; v < mesh.positions.length / 3; v += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => new Vector3().fromArray(mesh.positions, (v + k) * 3));
    if (a && b && c) {
      triangles.push(new Triangle(a, b, c));
      box.expandByPoint(a).expandByPoint(b).expandByPoint(c);
    }
  }
  return { triangles, box };
}

/**
 * Gives the posed trunk, head, legs, paws, and forearms of a pianist in one pass over the mesh. Each
 * triangle belongs to the bone of its first corner, as in `posedPart()` of `test-clearance.ts`,
 * and each corner takes the skin of the GPU (`posedCorner()`): the skin of the studio for a studio
 * body.
 *
 * @param posed The posed skeleton.
 * @returns The parts.
 */
function pianistParts(posed: PosedSkeleton): PianistParts {
  const { mesh } = posed.model;
  const body = new Set<number>(BODY.map(boneIndex));
  const paws = new Set<number>(PAWS.map(boneIndex));
  const forearms = new Set<number>(FOREARMS.map(boneIndex));
  const parts: Record<keyof PianistParts, { triangles: Triangle[]; box: Box3 }> = {
    body: { triangles: [], box: new Box3() },
    paws: { triangles: [], box: new Box3() },
    forearms: { triangles: [], box: new Box3() },
  };
  for (let v = 0; v < mesh.bones.length; v += 3) {
    const bone = mesh.bones[v] ?? 0;
    const part = body.has(bone)
      ? parts.body
      : paws.has(bone)
        ? parts.paws
        : forearms.has(bone)
          ? parts.forearms
          : null;
    if (!part) {
      continue;
    }
    const [a, b, c] = [0, 1, 2].map((k) => new Vector3(...posedCorner(posed, v + k)));
    if (a && b && c) {
      part.triangles.push(new Triangle(a, b, c));
      part.box.expandByPoint(a).expandByPoint(b).expandByPoint(c);
    }
  }
  return parts;
}

/** The worst sample of one measure, with its label. */
interface Worst {
  readonly value: number;
  readonly label: string;
}

/** The worst samples of a pianist in a set of samples. */
export interface PianistClearance {
  /** The deepest point of a paw under the skin of the trunk, the head, and the legs. */
  readonly inBody: Worst;
  /** The deepest point of a paw under the case of the piano. */
  readonly inCase: Worst;
  /** The smallest gap from a paw to the bench. */
  readonly toBench: Worst;
  /** The smallest gap from the trunk, the head, and the legs to the case of the piano. */
  readonly bodyToCase: Worst;
  /**
   * The deepest point of a forearm under the skin of the trunk, the head, and the legs. It is 0
   * when the caller does not measure the forearms.
   */
  readonly forearmsInBody: Worst;
}

/**
 * Measures the clearance of the pianist of a scene at some times (design 5.3).
 *
 * @param scene The scene.
 * @param index The index of the pianist in the plan.
 * @param samples The song time, the wall time, and the transport of each sample.
 * @param withForearms True to measure the forearms in the body too.
 * @returns The worst samples.
 */
export function pianistClearance(
  scene: TestScene,
  index: number,
  samples: Iterable<readonly [song: number, wall: number, transport: Transport]>,
  withForearms = false,
): PianistClearance {
  const place = scene.layout.players[index];
  if (!place) {
    throw new Error(`The scene has no player ${index}.`);
  }
  const model = scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles);
  const bench = benchOf(model);
  const buffer = createScenePose(scene.plan);
  const audible = allAudible(scene.score);
  let worst: PianistClearance = {
    inBody: { value: 0, label: 'none' },
    inCase: { value: 0, label: 'none' },
    toBench: { value: PIANIST_GAP, label: 'none' },
    bodyToCase: { value: PIANIST_GAP, label: 'none' },
    forearmsInBody: { value: 0, label: 'none' },
  };
  let shells: readonly PosedPart[] | null = null;
  for (const [song, wall, transport] of samples) {
    const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
    if (!pose) {
      throw new Error(`The pose has no player ${index}.`);
    }
    const posed = poseSkeleton(model, pose);
    shells ??= caseShells(posed);
    const parts = pianistParts(posed);
    const points = parts.paws.triangles.flatMap((t) => [t.a, t.b, t.c]);
    const label = `song ${song.toFixed(2)} s, wall ${wall.toFixed(2)} s`;
    const inBody = depthUnder(points, parts.body, 2 * PIANIST_DEPTH);
    const inCase = depthInShells(points, shells);
    const toBench = partDistance(parts.paws, bench, PIANIST_GAP);
    const bodyToCase = Math.min(
      PIANIST_GAP,
      ...shells.map((shell) => partDistance(parts.body, shell, PIANIST_GAP)),
    );
    const forearmsInBody = withForearms
      ? depthUnder(
          parts.forearms.triangles.flatMap((t) => [t.a, t.b, t.c]),
          parts.body,
          2 * PIANIST_DEPTH,
        )
      : 0;
    worst = {
      inBody: inBody > worst.inBody.value ? { value: inBody, label } : worst.inBody,
      inCase: inCase > worst.inCase.value ? { value: inCase, label } : worst.inCase,
      toBench: toBench < worst.toBench.value ? { value: toBench, label } : worst.toBench,
      bodyToCase:
        bodyToCase < worst.bodyToCase.value ? { value: bodyToCase, label } : worst.bodyToCase,
      forearmsInBody:
        forearmsInBody > worst.forearmsInBody.value
          ? { value: forearmsInBody, label }
          : worst.forearmsInBody,
    };
  }
  return worst;
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
 * Gives the sample of the rest pose before the first play (design 5.2, 5.3).
 *
 * @param scene The scene.
 * @yields The song time, the wall time, and the transport.
 */
function* restSamples(scene: TestScene): Generator<readonly [number, number, Transport]> {
  yield [-countInAt(scene.plan.beats, 0).lengthSec, 10, NOT_STARTED];
}

/**
 * Gives the samples of the lift of the paws from the knees to the keys at the play start (design
 * 5.2, 5.3).
 *
 * @param scene The scene.
 * @yields The song time, the wall time, and the transport.
 */
function* liftSamples(scene: TestScene): Generator<readonly [number, number, Transport]> {
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const play: Transport = { ...PLAYING, changedAtWall: 10 };
  for (let wall = 10; wall < 13; wall += LIFT_STEP) {
    yield [Math.min(0, start + wall - 10), wall, play];
  }
}

/**
 * The number of shard files of the test of the pianist clearance
 * (`pianist-clearance-<shard>.test.ts`, design 9.3). The skin of the studio polar bear takes
 * about 12 s for each demo, so each shard holds one of the two demos with a piano.
 */
export const PIANIST_CLEARANCE_SHARDS = 2;

/**
 * Registers the tests of the clearance of the pianist in the demos of one shard (design 4.4,
 * 5.3): a full play, the rest pose, and the lift of the paws. In the rest pose, the forearms
 * also stay out of the body. The shard takes its demos from the
 * patched demos with a piano seat. Each shard file calls it with its own shard.
 *
 * @param shard The shard, from 1 to {@link PIANIST_CLEARANCE_SHARDS}.
 */
export function describePianistClearanceShard(shard: number): void {
  describe('the clearance of the pianist (design 4.4, 5.3)', async () => {
    const withPiano = (await patchedDemos()).filter((demo) =>
      scoreOf(demo.bytes).seats.some((seat) => seat.section === 'piano'),
    );
    for (const demo of shardOf(withPiano, shard, PIANIST_CLEARANCE_SHARDS)) {
      const scene = sceneOf(demo.bytes);
      const pianists = scene.layout.players.flatMap((place, index) =>
        place.cast.instrument === 'piano' ? [index] : [],
      );
      for (const index of pianists) {
        it(`keeps the paws out of the body, the piano case, and the bench in ${demo.file}`, () => {
          const sets = [
            { samples: playSamples(scene), atRest: false },
            { samples: liftSamples(scene), atRest: false },
            { samples: restSamples(scene), atRest: true },
          ];
          for (const { samples, atRest } of sets) {
            const { inBody, inCase, toBench, bodyToCase, forearmsInBody } = pianistClearance(
              scene,
              index,
              samples,
              atRest,
            );
            expect
              .soft(forearmsInBody.value, `forearms in the body at rest, ${forearmsInBody.label}`)
              .toBeLessThanOrEqual(PIANIST_DEPTH);
            expect
              .soft(inBody.value, `paws in the body, ${inBody.label}`)
              .toBeLessThanOrEqual(PIANIST_DEPTH);
            expect
              .soft(inCase.value, `paws in the case, ${inCase.label}`)
              .toBeLessThanOrEqual(PIANIST_DEPTH);
            expect.soft(toBench.value, `paws at the bench, ${toBench.label}`).toBeGreaterThan(0);
            expect(
              bodyToCase.value,
              `body at the case, ${bodyToCase.label}`,
            ).toBeGreaterThanOrEqual(PIANIST_GAP);
          }
        });
      }
    }
  });
}
