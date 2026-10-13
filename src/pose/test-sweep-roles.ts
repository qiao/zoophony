import { Vector3 } from 'three';

import { CONDUCTOR } from '../models/cast.ts';
import { PIANO } from '../models/instruments/piano.ts';
import type { PlayerModel } from '../models/player.ts';
import type { BoneName } from '../models/rig.ts';
import type { Vec3 } from '../models/tuples.ts';
import { countInAt } from './count-in.ts';
import type { PosePlan } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { closeSurface, closedPart, openLoops, posedPart } from './test-clearance.ts';
import type { ClosedSurface } from './test-clearance.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, ofConductor } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';
import type { NoteTarget, RoleSweep, SweepPart, SweepSample } from './test-sweep.ts';
import type { Transport } from './types.ts';

/**
 * The trunk, the head, the tail, the legs, and the shoulders of an animal. Their triangles are one
 * surface with an open loop at each cut to an upper arm. The triangles of the shoulder bones join
 * the two cuts across the back, so with no shoulders, the two cuts are one loop.
 */
const BODY_BONES = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'jaw',
  'eyeL',
  'eyeR',
  'earL',
  'earR',
  'tail1',
  'tail2',
  'shoulderL',
  'shoulderR',
  'thighL',
  'thighR',
  'shinL',
  'shinR',
  'footL',
  'footR',
] as const satisfies readonly BoneName[];

/** The open loops of {@link BODY_BONES}: the cuts to the two upper arms. */
const BODY_LOOPS = 2;

/** The parts of the two arms that move in the sweep of a role. */
const ARM_PARTS: readonly SweepPart[] = [
  { name: 'paws', bones: ['handL', 'handR'] },
  { name: 'claws', bones: ['fingersL', 'fingersR'] },
  { name: 'forearms', bones: ['forearmL', 'forearmR'] },
  { name: 'upper arms', bones: ['upperArmL', 'upperArmR'] },
];

/**
 * The contact depth of a paw in a body, in meters: 0.01 of the height of the bear of the studio
 * conductor (`lowpoly-studio/roles/conductor/role.toml`), with a margin. A paw that rests on the
 * belly or a knee presses the fur a little.
 */
const CONTACT = 0.015;

/** The decision file of the studio polar bear. */
const POLAR_BEAR_DECISIONS = 'docs/decisions/2026-10-12-studio-polar-bear.md';

/** The decision file of the sweep of each role. */
const SWEEP_DECISIONS = 'docs/decisions/2026-10-13-role-sweep.md';

/** The step of the song time between two samples of a full play, in seconds. */
const PLAY_STEP = 0.25;

/**
 * Gives the samples of a full play of a scene: the count-in and each song time to the end.
 *
 * @param scene The scene.
 * @yields The samples.
 */
function* playSamples(scene: TestScene): Generator<SweepSample> {
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  for (let song = start; song <= scene.score.durationSec; song += PLAY_STEP) {
    yield [song, 10 + song - start, PLAYING];
  }
}

/**
 * The closed surface of the body of an animal: {@link BODY_BONES} with a cap on each cut.
 *
 * @param posed The posed skeleton.
 * @returns The surface.
 */
function bodySurface(posed: PosedSkeleton): ClosedSurface {
  return closedPart(posed, BODY_BONES, BODY_LOOPS);
}

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

/** The case of the piano of each pianist model, found one time. */
const CASES = new WeakMap<PlayerModel, ClosedSurface>();

/**
 * Gives the case of the piano of a pianist: the closed shells of the piano that hold a triangle
 * off the keyboard, such as the fallboard, the cheek blocks, the key bed, the desk, and the rim.
 * The strings are flat strips with an open edge under the lid, so the case leaves out each shell
 * with an open loop. The piano stands on the floor and does not move, so the case of one pose
 * serves all poses.
 *
 * @param posed The posed skeleton.
 * @returns The closed surface of the case.
 */
export function pianoCase(posed: PosedSkeleton): ClosedSurface {
  const known = CASES.get(posed.model);
  if (known) {
    return known;
  }

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
  const shells = (part.closed?.() ?? [part]).filter((shell) => openLoops(shell.triangles) === 0);
  const surface = closeSurface(
    shells.flatMap((shell) => shell.triangles),
    0,
  );
  CASES.set(posed.model, surface);
  return surface;
}

/**
 * Gives the note targets of the palms of a pianist: each palm is on its keys 0.02 s after the
 * note start (design 5.3), in a play that started at the count-in.
 *
 * @param scene The scene.
 * @param index The index of the pianist.
 * @returns The targets.
 */
function pianistTargets(scene: TestScene, index: number): NoteTarget[] {
  const countIn = countInAt(scene.plan.beats, 0).lengthSec;
  const plan = scene.plan.players[index];
  if (plan?.note.family !== 'keyboard') {
    return [];
  }
  const { note: layer, timeOffset } = plan;
  return (['L', 'R'] as const).flatMap((side) => {
    const track = side === 'L' ? layer.left : layer.right;
    return Array.from(track.starts, (start: number, i): NoteTarget => {
      const point: Vec3 = [
        track.points[i * 3] ?? 0,
        track.points[i * 3 + 1] ?? 0,
        track.points[i * 3 + 2] ?? 0,
      ];
      const song = start + timeOffset + 0.02;
      return { side, sample: [song, 10 + song + countIn, PLAYING], point };
    });
  });
}

/**
 * The sweep of the pianist (design 5.3): the arms against the body and the case of the piano, in
 * a full play, in the lift of the paws from the knees to the keys at the play start, and in the
 * rest pose before the first play.
 */
export const PIANIST_SWEEP: RoleSweep = {
  role: 'pianist',
  parts: ARM_PARTS,
  obstacles: [
    { name: 'body', surface: bodySurface },
    { name: 'case', surface: pianoCase },
  ],
  contact: CONTACT,
  accepted: [
    {
      part: 'forearms',
      into: 'body',
      samples: 'play',
      depth: 0.09,
      reason:
        'The forearms of the round polar bear go into its trunk under the shoulders. No cheap change of the hold removes it.',
      decision: `${POLAR_BEAR_DECISIONS}, row "Accepted limits", and ${SWEEP_DECISIONS}`,
    },
    ...['play', 'lift', 'rest'].map((samples) => ({
      part: 'upper arms',
      into: 'body',
      samples,
      depth: 0.07,
      reason:
        'The skin of the upper arm of the round polar bear runs inside the side of its belly to the elbow.',
      decision: SWEEP_DECISIONS,
    })),
  ],
  targetError: 1e-4,
  hasRole: (score) => score.seats.some((seat) => seat.section === 'piano'),
  players: (scene) =>
    scene.layout.players.flatMap((place, index) => {
      if (place.cast.instrument !== 'piano') {
        return [];
      }
      const { species, instrument, kettles } = place.cast;
      const buffer = createScenePose(scene.plan);
      const audible = allAudible(scene.score);
      return [
        {
          name: `pianist ${index}`,
          model: scene.models.get(species, instrument, kettles),
          poseAt: ([song, wall, transport]: SweepSample) => {
            const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
            if (!pose) {
              throw new Error(`The pose has no player ${index}.`);
            }
            return pose;
          },
          targets: () => pianistTargets(scene, index),
        },
      ];
    }),
  sampleSets: (scene) => {
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const play: Transport = { ...PLAYING, changedAtWall: 10 };
    const lift: SweepSample[] = [];
    for (let wall = 10; wall < 13; wall += 0.1) {
      lift.push([Math.min(0, start + wall - 10), wall, play]);
    }
    return [
      { name: 'play', samples: playSamples(scene) },
      { name: 'lift', samples: lift },
      { name: 'rest', samples: [[start, 10, NOT_STARTED]] },
    ];
  },
};

/**
 * The sweep of the conductor (design 5.4): the arms and the baton against the body, in a full
 * play, and in the lift of the arms at the play start and the bow and the lowering after the song
 * end.
 */
export const CONDUCTOR_SWEEP: RoleSweep = {
  role: 'conductor',
  parts: [...ARM_PARTS, { name: 'baton', bones: ['baton'] }],
  obstacles: [{ name: 'body', surface: bodySurface }],
  contact: CONTACT,
  accepted: ['forearms', 'upper arms'].map((part) => ({
    part,
    into: 'body',
    samples: 'arms',
    depth: 0.04,
    reason: 'The hanging arm of the rest pose touches the side of the round body (design 5.2).',
    decision: SWEEP_DECISIONS,
  })),
  targetError: 0,
  hasRole: () => true,
  players: (scene) => {
    if (!scene.plan.conductor) {
      return [];
    }
    const plan: PosePlan = { ...scene.plan, players: [] };
    const buffer = createScenePose(plan);
    const audible = allAudible(scene.score);
    return [
      {
        name: 'conductor',
        model: scene.models.get(CONDUCTOR.species, CONDUCTOR.instrument, 4),
        poseAt: ([song, wall, transport]: SweepSample) =>
          ofConductor(poseAt(plan, song, wall, transport, audible, buffer).conductor),
        targets: () => [],
      },
    ];
  },
  sampleSets: (scene) => {
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const play: Transport = { ...PLAYING, changedAtWall: 10 };
    const ended: Transport = { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
    const arms: SweepSample[] = [];
    for (let wall = 10; wall < 14; wall += 0.05) {
      arms.push([Math.min(0, start + wall - 10), wall, play]);
      arms.push([scene.score.durationSec, wall, ended]);
    }
    return [
      { name: 'play', samples: playSamples(scene) },
      { name: 'arms', samples: arms },
    ];
  },
};

/** The sweep of each role, by its name. */
export const SWEEP_ROLES = {
  conductor: CONDUCTOR_SWEEP,
  pianist: PIANIST_SWEEP,
} as const;
