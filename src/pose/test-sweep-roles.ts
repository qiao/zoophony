import { Vector3 } from 'three';

import { CONDUCTOR } from '../models/cast.ts';
import { layoutScene } from '../models/layout-scene.ts';
import { ModelCache } from '../models/model-cache.ts';
import { violinPianoDuoFile } from '../models/test-chamber.ts';
import { PIANO } from '../models/instruments/piano.ts';
import { STRING_SCALES, VIOLIN } from '../models/instruments/strings.ts';
import { INSTRUMENT_SUPPORTS } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import type { BoneName } from '../models/rig.ts';
import { SPECIES, instrumentScale } from '../models/species.ts';
import type { SpeciesId, SpeciesParams } from '../models/species.ts';
import { scoreOf } from '../score/test-score.ts';
import { countInAt } from './count-in.ts';
import { preparePoses } from './plan.ts';
import type { PosePlan } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { LOWER_MAX_SEC } from './rest.ts';
import { closeSurface, closedPart, openLoops, posedPart } from './test-clearance.ts';
import type { ClosedSurface, PosedPart } from './test-clearance.ts';
import { posedPiecePoint, posedPoint } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, ofConductor } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';
import { BODY_OBSTACLE } from './test-sweep.ts';
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

/**
 * The open loops of {@link BODY_BONES} of the rabbit and of the foxes, the bodies of the meshes of
 * the user (`pnpm rig-mesh <animal>`): the cuts to the two upper arms, and two open edges of each
 * mesh, at the whiskers of the rabbit. The export drops the gloss fan over each eye of the rig, and
 * the pea eyes of the app are not in the skin of the studio (design 4.5).
 */
const MESH_BODY_LOOPS = 4;

/**
 * The open loops of {@link BODY_BONES} of the cat mesh: the cuts to the two upper arms, and one
 * open edge pair of 1.4 cm at a whisker (`loops-probe.txt` of
 * `docs/research/2026-10-16-cat-mesh/`).
 */
const CAT_BODY_LOOPS = 3;

/**
 * The open loops of {@link BODY_BONES} of the dog mesh: the cuts to the two upper arms, two open
 * edge pairs of 3 cm at the muzzle, and two of 1.5 cm to 1.9 cm at the toes (`loops-probe.txt` of
 * `docs/research/2026-10-17-dog-mesh/`).
 */
const DOG_BODY_LOOPS = 6;

/**
 * The open loops of {@link BODY_BONES} of the hippo mesh: the cuts to the two upper arms, and one
 * open edge pair of 3.3 cm in the small tail (`loops-probe.txt` of
 * `docs/research/2026-10-18-hippo-mesh/`).
 */
const HIPPO_BODY_LOOPS = 3;

/**
 * The open loops of {@link BODY_BONES} of the mouse mesh: the cuts to the two upper arms, 10 open
 * loops of the whiskers (0.10 m to 0.57 m long, each a thin strip beside the muzzle), and two open
 * edge pairs of 1.4 cm and 2.8 cm at the right toes (`loops-probe.txt` of
 * `docs/research/2026-10-19-mouse-mesh/`).
 */
const MOUSE_BODY_LOOPS = 14;

/**
 * The open loops of {@link BODY_BONES} of the elephant mesh: the cuts to the two upper arms, and
 * two open edge pairs of 7 cm and 8 cm at the ears (`loops-probe.txt` of
 * `docs/research/2026-10-19-elephant-arms/`). The ring of the right shoulder (`refine.rings` of
 * `tools/mesh-rigs/elephant.json`) closes the loop of three edges at the front of the right
 * armpit, where the arm cut of the rig left one corner of the shoulder on the chest.
 */
const ELEPHANT_BODY_LOOPS = 4;

/**
 * The open loops of {@link BODY_BONES} of the beaver mesh: the cuts to the two upper arms, and 7
 * open edge pairs and triples of 1.2 cm to 5.6 cm at the roots of the whiskers on the cheeks
 * (`loops-probe.txt` of `docs/research/2026-10-19-beaver-mesh/`).
 */
const BEAVER_BODY_LOOPS = 9;

/**
 * The open loops of {@link BODY_BONES} of the wolf mesh: the cuts to the two upper arms, and three
 * open edge pairs of 4.2 cm to 11.6 cm, one on the head and two on the sides of the trunk
 * (`loops-probe.txt` of `docs/research/2026-10-20-wolf-mesh/`).
 */
const WOLF_BODY_LOOPS = 5;

/** The parts of the two arms that move in the sweep of a role. */
const ARM_PARTS: readonly SweepPart[] = [
  { name: 'paws', bones: ['handL', 'handR'] },
  { name: 'claws', bones: ['fingersL', 'fingersR'] },
  { name: 'forearms', bones: ['forearmL', 'forearmR'] },
  { name: 'upper arms', bones: ['upperArmL', 'upperArmR'] },
];

/**
 * The instrument that a player holds against its body, with the slide of a trombone: the closed
 * shells of the plates, the ribs, the neck, and the fingerboard of a bowed instrument, or the tube
 * and the keys of a wind instrument. The sweep measures its depth in the body only, with no limit,
 * because a real player touches the instrument with the body: the chin rest of a violin under the
 * jaw, the back of a cello or a contrabass on the chest, and the lip plate of a flute on the chin
 * (`docs/decisions/2026-10-19-hippo-retro.md`).
 */
export const INSTRUMENT_PART: SweepPart = {
  name: 'instrument',
  bones: ['instrument', 'slide'],
  into: [BODY_OBSTACLE],
  measureOnly: true,
};

/**
 * The contact depth of a paw in a body, in meters: 0.01 of the height of the bear of the studio
 * conductor (`lowpoly-studio/roles/conductor/role.toml`), with a margin. A paw that rests on the
 * belly or a knee presses the fur a little.
 */
const CONTACT = 0.015;

/** The decision file of the studio polar bear. */
const POLAR_BEAR_DECISIONS = 'docs/decisions/2026-10-12-studio-polar-bear.md';

/** The decision file of the lap pose of the pianist. */
const LAP_DECISIONS = 'docs/decisions/2026-10-13-pianist-lap.md';

/** The decision file of the sweep of each role. */
const SWEEP_DECISIONS = 'docs/decisions/2026-10-13-role-sweep.md';

/** The decision file of the elephant mesh and its timpani. */
const ELEPHANT_DECISIONS = 'docs/decisions/2026-10-19-mesh-elephant.md';

/** The decision file of the beaver mesh and its bassoon. */
const BEAVER_DECISIONS = 'docs/decisions/2026-10-19-mesh-beaver.md';

/** The decision file of cheerful demos. */
const CHEERFUL_DEMO_DECISIONS = 'docs/decisions/2026-10-14-cheerful-demos.md';

/** The step of the song time between two samples of a full play, in seconds. */
const PLAY_STEP = 0.25;

/** The steps of the wall time between two samples of a lowering, in seconds. */
const LOWER_STEP = { hold: 0.5, move: 0.1 } as const;

/** The transport of a stop at the wall time 10 s, after a play. */
const STOPPED: Transport = { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };

/**
 * Gives the sample of a song time in a play that started at the wall time 10 s, with the
 * count-in first: the wall time of the song time 0 is 10 s plus the count-in.
 *
 * @param scene The scene.
 * @param song The song time, in seconds.
 * @returns The sample.
 */
export function playSample(scene: TestScene, song: number): SweepSample {
  return [song, 10 + song + countInAt(scene.plan.beats, 0).lengthSec, PLAYING];
}

/**
 * Gives the samples of a full play of a scene: the count-in and each song time to the end.
 *
 * @param scene The scene.
 * @yields The samples.
 */
function* playSamples(scene: TestScene): Generator<SweepSample> {
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  for (let song = start; song <= scene.score.durationSec; song += PLAY_STEP) {
    yield playSample(scene, song);
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
 * The closed surface of the body of a mesh of the user, the rabbit or a fox: {@link BODY_BONES}
 * with a cap on each open loop ({@link MESH_BODY_LOOPS}).
 *
 * @param posed The posed skeleton.
 * @returns The surface.
 */
function meshBodySurface(posed: PosedSkeleton): ClosedSurface {
  return closedPart(posed, BODY_BONES, MESH_BODY_LOOPS);
}

/**
 * The closed surface of the body of the cat mesh: {@link BODY_BONES} with a cap on each open loop
 * ({@link CAT_BODY_LOOPS}).
 *
 * @param posed The posed skeleton.
 * @returns The surface.
 */
function catBodySurface(posed: PosedSkeleton): ClosedSurface {
  return closedPart(posed, BODY_BONES, CAT_BODY_LOOPS);
}

/**
 * The closed surface of the body of the dog mesh: {@link BODY_BONES} with a cap on each open loop
 * ({@link DOG_BODY_LOOPS}).
 *
 * @param posed The posed skeleton.
 * @returns The surface.
 */
function dogBodySurface(posed: PosedSkeleton): ClosedSurface {
  return closedPart(posed, BODY_BONES, DOG_BODY_LOOPS);
}

/**
 * The closed surface of the body of the hippo mesh: {@link BODY_BONES} with a cap on each open loop
 * ({@link HIPPO_BODY_LOOPS}).
 *
 * @param posed The posed skeleton.
 * @returns The surface.
 */
function hippoBodySurface(posed: PosedSkeleton): ClosedSurface {
  return closedPart(posed, BODY_BONES, HIPPO_BODY_LOOPS);
}

/**
 * The closed surface of the body of the mouse mesh: {@link BODY_BONES} with a cap on each open loop
 * ({@link MOUSE_BODY_LOOPS}).
 *
 * @param posed The posed skeleton.
 * @returns The surface.
 */
function mouseBodySurface(posed: PosedSkeleton): ClosedSurface {
  return closedPart(posed, BODY_BONES, MOUSE_BODY_LOOPS);
}

/**
 * The closed surface of the body of the beaver mesh: {@link BODY_BONES} with a cap on each open
 * loop ({@link BEAVER_BODY_LOOPS}).
 *
 * @param posed The posed skeleton.
 * @returns The surface.
 */
function beaverBodySurface(posed: PosedSkeleton): ClosedSurface {
  return closedPart(posed, BODY_BONES, BEAVER_BODY_LOOPS);
}

/**
 * The closed surface of the body of the elephant mesh: {@link BODY_BONES} with a cap on each open
 * loop ({@link ELEPHANT_BODY_LOOPS}).
 *
 * @param posed The posed skeleton.
 * @returns The surface.
 */
function elephantBodySurface(posed: PosedSkeleton): ClosedSurface {
  return closedPart(posed, BODY_BONES, ELEPHANT_BODY_LOOPS);
}

/**
 * The closed surface of the body of the wolf mesh: {@link BODY_BONES} with a cap on each open loop
 * ({@link WOLF_BODY_LOOPS}).
 *
 * @param posed The posed skeleton.
 * @returns The surface.
 */
function wolfBodySurface(posed: PosedSkeleton): ClosedSurface {
  return closedPart(posed, BODY_BONES, WOLF_BODY_LOOPS);
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
const CASES = new WeakMap<PlayerModel, PianoCase>();

/** The case of the piano of a pianist. */
export interface PianoCase {
  /** The closed shells, each with its own box, for a fast gap. */
  readonly shells: readonly PosedPart[];
  /** The shells as one closed surface, for the depth of a point. */
  readonly surface: ClosedSurface;
}

/**
 * Gives the case of the piano of a pianist: the closed shells of the piano that hold a triangle
 * off the keyboard, such as the fallboard, the cheek blocks, the key bed, the desk, and the rim.
 * The strings are flat strips with an open edge under the lid, so the case leaves out each shell
 * with an open loop. The piano stands on the floor and does not move, so the case of one pose
 * serves all poses.
 *
 * @param posed The posed skeleton.
 * @returns The case.
 */
export function pianoCase(posed: PosedSkeleton): PianoCase {
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
  const found = {
    shells,
    surface: closeSurface(
      shells.flatMap((shell) => shell.triangles),
      0,
    ),
  };
  CASES.set(posed.model, found);
  return found;
}

/**
 * Gives the note targets of the palms of a pianist: each palm is on its keys 0.02 s after the
 * note start (design 5.3), in a play that started at the count-in.
 *
 * @param scene The scene.
 * @param index The index of the pianist.
 * @param model The model of the pianist.
 * @returns The targets.
 */
function pianistTargets(scene: TestScene, index: number, model: PlayerModel): NoteTarget[] {
  const plan = scene.plan.players[index];
  if (plan?.note.family !== 'keyboard') {
    return [];
  }
  const { note: layer, timeOffset } = plan;
  return (['L', 'R'] as const).flatMap((side) => {
    const track = side === 'L' ? layer.left : layer.right;
    const palm = side === 'L' ? model.body.palmL : model.body.palmR;
    return Array.from(track.starts, (start: number, i): NoteTarget => {
      const point = new Vector3().fromArray(track.points, i * 3);
      return {
        side,
        sample: playSample(scene, start + timeOffset + 0.02),
        error: (posed) => new Vector3(...posedPoint(posed, `hand${side}`, palm)).distanceTo(point),
      };
    });
  });
}

/**
 * The sweep of the pianist (design 5.3): the arms against the body and the case of the piano, in
 * a full play, in the lift of the paws from the lap to the keys at the play start, in the rest
 * pose before the first play, and in the lowering of the paws after a stop.
 */
export const PIANIST_SWEEP: RoleSweep = {
  role: 'pianist',
  parts: ARM_PARTS,
  obstacles: [
    { name: 'body', surface: bodySurface },
    { name: 'case', surface: (posed) => pianoCase(posed).surface },
  ],
  contact: CONTACT,
  accepted: [
    // The lowering starts at the playing pose, so it has the accepted depths of a play.
    ...(['play', 'lower'] as const).map((samples) => ({
      part: 'forearms',
      into: 'body',
      samples,
      depth: 0.09,
      reason:
        'The forearms of the round polar bear go into its trunk under the shoulders. No cheap change of the hold removes it.',
      decision: `${POLAR_BEAR_DECISIONS}, row "Accepted limits", and ${SWEEP_DECISIONS}`,
    })),
    ...(['play', 'lower'] as const).map((samples) => ({
      part: 'upper arms',
      into: 'body',
      samples,
      depth: 0.04,
      reason:
        'The skin of the upper arm of the round polar bear runs inside the side of its belly to the elbow.',
      decision: SWEEP_DECISIONS,
    })),
    // The paws rest in the lap, and the round belly covers the thighs. The forearms lie on the
    // belly, and the upper arms hang by its sides.
    ...(['rest', 'lift'] as const).flatMap((samples) =>
      (['forearms', 'upper arms'] as const).map((part) => ({
        part,
        into: 'body',
        samples,
        depth: 0.03,
        reason:
          'The arms of the round polar bear are short. With the paws in the lap and the elbows by the sides, the arms lie on its belly.',
        decision: LAP_DECISIONS,
      })),
    ),
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
      const model = scene.models.get(species, instrument, kettles);
      return [
        {
          name: `pianist ${index}`,
          model,
          poseAt: ([song, wall, transport]: SweepSample) => {
            const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
            if (!pose) {
              throw new Error(`The pose has no player ${index}.`);
            }
            return pose;
          },
          targets: () => pianistTargets(scene, index, model),
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
      { name: 'lower', samples: lowerSamples(scene) },
    ];
  },
};

/**
 * Gives the samples of the lowering of the paws of a pianist after a stop (design 5.2): at the
 * outermost note of each paw, where a paw lowers past the end of the case, and at the song end.
 * Each stop has samples through the hold of the transport and the longest lowering.
 *
 * @param scene The scene.
 * @returns The samples.
 */
function lowerSamples(scene: TestScene): SweepSample[] {
  const plan = scene.plan.players.find((p) => p.note.family === 'keyboard');
  const stops = [scene.score.durationSec];
  if (plan?.note.family === 'keyboard') {
    for (const [track, sign] of [
      [plan.note.left, -1],
      [plan.note.right, 1],
    ] as const) {
      let best = 0;
      for (let i = 1; i < track.starts.length; i++) {
        if (sign * ((track.points[i * 3] ?? 0) - (track.points[best * 3] ?? 0)) > 0) {
          best = i;
        }
      }
      // The paw is on its keys 0.02 s after the note start (design 5.3).
      stops.push((track.starts[best] ?? 0) + plan.timeOffset + 0.02);
    }
  }

  const samples: SweepSample[] = [];
  const end = STOPPED.holdSec + LOWER_MAX_SEC;
  for (const song of stops) {
    for (let t = 0; t < end; t += t < STOPPED.holdSec ? LOWER_STEP.hold : LOWER_STEP.move) {
      samples.push([song, 10 + t, STOPPED]);
    }
  }
  return samples;
}

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
  accepted: [
    ...['forearms', 'upper arms'].map((part) => ({
      part,
      into: 'body',
      samples: 'arms',
      depth: 0.04,
      reason: 'The hanging arm of the rest pose touches the side of the round body (design 5.2).',
      decision: SWEEP_DECISIONS,
    })),
    ...['paws', 'claws'].flatMap((part) =>
      ['arms', 'play'].map((samples) => ({
        part,
        into: 'body',
        samples,
        depth: 0.045,
        reason:
          'The paws and claws brush the round belly during the count-in lift in fast tempos (design 5.4).',
        decision: CHEERFUL_DEMO_DECISIONS,
      })),
    ),
  ],
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

/**
 * Gives the closed shells of the piece of the `instrument` bone of a player in a pose: for a
 * violin, the body, the neck, the fingerboard, the scroll, and the chin rest, with the bow as a
 * piece of its own. For a flute, the tube, the lip plate, the head cap, and the keys.
 *
 * @param posed The posed skeleton.
 * @returns The shells as one closed surface.
 */
function instrumentSurface(posed: PosedSkeleton): ClosedSurface {
  const part = posedPart(posed, ['instrument']);
  const shells = (part.closed?.() ?? [part]).filter((shell) => openLoops(shell.triangles) === 0);
  return closeSurface(
    shells.flatMap((shell) => shell.triangles),
    0,
  );
}

/**
 * Gives the distance of the bow hair from the strings: the distance of the line of the hair from
 * the middle line of the strings, less half the width of the strings. The hair crosses the strings
 * at the string of the note, so it touches the strip of the strings. The sounding point moves the
 * bow along the strings with the loudness (design 5.3), so the measure takes the line of the
 * strings, through the bow contact point of the model along the fingerboard.
 *
 * @param posed The posed skeleton.
 * @param halfWidth Half the width of the strip of the strings, in meters.
 * @returns The distance, in meters: 0 when the hair touches the strings.
 */
function hairOffStrings(posed: PosedSkeleton, halfWidth: number): number {
  const { targets } = posed.model.instrument;
  const contact = targets.find((t) => t.kind === 'bow-contact');
  const hair = targets.find((t) => t.kind === 'bow-hair');
  const board = targets.find((t) => t.kind === 'fingerboard');
  if (!contact || !hair || !board) {
    throw new Error('The violin has no bow contact, no bow hair, or no fingerboard.');
  }
  const point = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: contact.from }));
  const along = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: board.to }))
    .sub(new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: board.from })))
    .normalize();
  const from = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: hair.from }));
  const to = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: hair.to }));
  const axis = to.clone().sub(from).normalize();
  const normal = new Vector3().crossVectors(axis, along);
  const off = point.clone().sub(from);
  const distance =
    normal.lengthSq() > 1e-12
      ? Math.abs(off.dot(normal.normalize()))
      : off.addScaledVector(axis, -off.dot(axis)).length();
  return Math.max(0, distance - halfWidth);
}

/** A bowed string of a bowed role of the sweep. */
type SweptBowed = 'violin' | 'viola' | 'cello' | 'contrabass';

/**
 * Gives the note targets of the bow of a violinist, a violist, a cellist, or a bassist: the bow hair is on
 * the strings in the middle of each bowed stroke (design 5.3), in a play that started at the
 * count-in.
 *
 * @param scene The scene.
 * @param index The index of the player.
 * @returns The targets.
 */
function bowedTargets(scene: TestScene, index: number): NoteTarget[] {
  const plan = scene.plan.players[index];
  const cast = scene.layout.players[index]?.cast;
  if (
    plan?.note.family !== 'bowed' ||
    (cast?.instrument !== 'violin' &&
      cast?.instrument !== 'viola' &&
      cast?.instrument !== 'cello' &&
      cast?.instrument !== 'contrabass')
  ) {
    return [];
  }
  const { note: layer, timeOffset } = plan;
  const params: SpeciesParams = SPECIES[cast.species];
  const scale = instrumentScale(params, cast.instrument);
  const halfWidth = (VIOLIN.stringsWidth / 2) * STRING_SCALES[cast.instrument] * scale;
  return layer.strokes.flatMap((stroke): NoteTarget[] =>
    stroke.technique === 'pizzicato'
      ? []
      : [
          {
            side: 'R',
            sample: playSample(scene, (stroke.start + stroke.end) / 2 + timeOffset),
            error: (posed) => hairOffStrings(posed, halfWidth),
          },
        ],
  );
}

/**
 * Tells if a player of a scene is in the sweep of a bowed role: the first player of each species of
 * the role with the instrument of the role on the support of the section, and each soloist of these
 * species, which stands where the section sits. The violin seats alternate the rabbit and the red
 * fox (`models/cast.ts`), so a demo shows many violinists of each species with one model.
 *
 * @param scene The scene.
 * @param index The index of the player.
 * @param instrument The instrument of the role.
 * @param species The species of the role.
 * @returns True for a player of the sweep.
 */
function sweptBowed(
  scene: TestScene,
  index: number,
  instrument: SweptBowed,
  species: ReadonlySet<SpeciesId>,
): boolean {
  const { cast } = scene.layout.players[index] ?? {};
  if (!cast || !species.has(cast.species) || cast.instrument !== instrument) {
    return false;
  }
  // A soloist stands where the section sits. The contrabass player stands in each seat.
  const support = INSTRUMENT_SUPPORTS[instrument];
  if (cast.support !== support) {
    return true;
  }
  const first = scene.layout.players.findIndex(
    (p) =>
      p.cast.species === cast.species &&
      p.cast.instrument === instrument &&
      p.cast.support === support,
  );
  return first === index;
}

/** The species of the violinists with a studio body of a mesh of the user. */
const VIOLINISTS: ReadonlySet<SpeciesId> = new Set(['rabbit', 'fox-red']);

/** The species of the violists with a studio body of a mesh of the user. */
const VIOLISTS: ReadonlySet<SpeciesId> = new Set(['cat']);

/** The species of the cellists with a studio body of a mesh of the user. */
const CELLISTS: ReadonlySet<SpeciesId> = new Set(['dog']);

/** The species of the bassists with a studio body of a mesh of the user. */
const BASSISTS: ReadonlySet<SpeciesId> = new Set(['hippo']);

/** The name of the players of each bowed role in the sweep. */
const BOWED_LABELS = {
  violin: 'violinist',
  viola: 'violist',
  cello: 'cellist',
  contrabass: 'bassist',
} as const;

/**
 * Gives the swept players of a bowed role in a scene ({@link sweptBowed}).
 *
 * @param scene The scene.
 * @param instrument The instrument of the role.
 * @param species The species of the role.
 * @returns The players.
 */
function bowedPlayers(
  scene: TestScene,
  instrument: SweptBowed,
  species: ReadonlySet<SpeciesId>,
): ReturnType<RoleSweep['players']> {
  const label = BOWED_LABELS[instrument];
  return scene.layout.players.flatMap((place, index) => {
    if (!sweptBowed(scene, index, instrument, species)) {
      return [];
    }
    const { kettles, support } = place.cast;
    const buffer = createScenePose(scene.plan);
    const audible = allAudible(scene.score);
    return [
      {
        name: `${label} ${index} (${support})`,
        model: scene.models.get(place.cast.species, instrument, kettles, support),
        poseAt: ([song, wall, transport]: SweepSample) => {
          const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
          if (!pose) {
            throw new Error(`The pose has no player ${index}.`);
          }
          return pose;
        },
        targets: () => bowedTargets(scene, index),
      },
    ];
  });
}

/**
 * The sweep of the violinist (design 5.3): the arms and the bow against the body and the violin,
 * and the violin in the body ({@link INSTRUMENT_PART}), in a full play, in the lift of the violin
 * at the play start, in the rest pose before the first play, and in the lowering after the song
 * end. The first seated rabbit and the first seated red fox of each demo, and each standing
 * soloist of these species, play it.
 */
export const VIOLINIST_SWEEP: RoleSweep = {
  role: 'violinist',
  parts: [...ARM_PARTS, { name: 'bow', bones: ['bow'] }, INSTRUMENT_PART],
  obstacles: [
    { name: 'body', surface: meshBodySurface },
    { name: 'violin', surface: instrumentSurface },
  ],
  contact: CONTACT,
  accepted: [],
  targetError: 1e-3,
  hasRole: (score) => score.seats.some((seat) => seat.section === 'violin'),
  players: (scene) => bowedPlayers(scene, 'violin', VIOLINISTS),
  sampleSets: (scene) => {
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const play: Transport = { ...PLAYING, changedAtWall: 10 };
    const lift: SweepSample[] = [];
    for (let wall = 10; wall < 13; wall += 0.1) {
      lift.push([Math.min(0, start + wall - 10), wall, play]);
    }
    const lower: SweepSample[] = [];
    const end = STOPPED.holdSec + LOWER_MAX_SEC;
    for (let t = 0; t < end; t += t < STOPPED.holdSec ? LOWER_STEP.hold : LOWER_STEP.move) {
      lower.push([scene.score.durationSec, 10 + t, STOPPED]);
    }
    return [
      { name: 'play', samples: playSamples(scene) },
      { name: 'lift', samples: lift },
      { name: 'rest', samples: [[start, 10, NOT_STARTED]] },
      { name: 'lower', samples: lower },
    ];
  },
};

/**
 * Gives the note targets of the palms of a flutist or an oboist: each palm is on its grip at the
 * start of each phrase (design 5.3), in a play that started at the count-in.
 *
 * @param scene The scene.
 * @param index The index of the flutist.
 * @param model The model of the flutist.
 * @returns The targets.
 */
function flutistTargets(scene: TestScene, index: number, model: PlayerModel): NoteTarget[] {
  const plan = scene.plan.players[index];
  if (plan?.note.family !== 'woodwind') {
    return [];
  }
  const { note: layer, timeOffset } = plan;
  return (['L', 'R'] as const).flatMap((side) => {
    const grip = side === 'L' ? model.instrument.grips.palmL : model.instrument.grips.palmR;
    const palm = side === 'L' ? model.body.palmL : model.body.palmR;
    if (!grip) {
      return [];
    }
    return Array.from(layer.track.phraseStarts, (start: number): NoteTarget => ({
      side,
      sample: playSample(scene, start + timeOffset + 0.1),
      error: (posed) =>
        new Vector3(...posedPoint(posed, `hand${side}`, palm)).distanceTo(
          new Vector3(...posedPiecePoint(posed, grip)),
        ),
    }));
  });
}

/**
 * Tells if a player of a scene is in the sweep of the flutist: the first seated tan fox with a
 * flute, and each tan fox soloist, which stands (design 4.2).
 *
 * @param scene The scene.
 * @param index The index of the player.
 * @returns True for a player of the sweep.
 */
function sweptFlutist(scene: TestScene, index: number): boolean {
  const { cast } = scene.layout.players[index] ?? {};
  if (cast?.species !== 'fox-tan' || cast.instrument !== 'flute') {
    return false;
  }
  if (cast.support === 'stand') {
    return true;
  }
  const first = scene.layout.players.findIndex(
    (p) =>
      p.cast.species === 'fox-tan' && p.cast.instrument === 'flute' && p.cast.support !== 'stand',
  );
  return first === index;
}

/**
 * The sweep of the flutist (design 5.3): the arms against the body and the flute, and the flute in
 * the body ({@link INSTRUMENT_PART}), in a full play, in the lift of the flute at the play start,
 * in the rest pose before the first play, and in the lowering after the song end, with the palms
 * on their grips. The first seated tan fox of each demo with flutes, and each standing tan fox
 * soloist, play it. `pnpm pose-depth flutist --gaps` also gives the gap from the head, with its
 * long muzzle, to the flute.
 */
export const FLUTIST_SWEEP: RoleSweep = {
  role: 'flutist',
  parts: [...ARM_PARTS, INSTRUMENT_PART],
  obstacles: [
    { name: 'body', surface: meshBodySurface },
    { name: 'flute', surface: instrumentSurface },
  ],
  contact: CONTACT,
  accepted: [],
  targetError: 1e-3,
  hasRole: (score) => score.seats.some((seat) => seat.section === 'flute'),
  players: (scene) =>
    scene.layout.players.flatMap((place, index) => {
      if (!sweptFlutist(scene, index)) {
        return [];
      }
      const { species, instrument, kettles, support } = place.cast;
      const buffer = createScenePose(scene.plan);
      const audible = allAudible(scene.score);
      const model = scene.models.get(species, instrument, kettles, support);
      return [
        {
          name: `flutist ${index} (${support})`,
          model,
          poseAt: ([song, wall, transport]: SweepSample) => {
            const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
            if (!pose) {
              throw new Error(`The pose has no player ${index}.`);
            }
            return pose;
          },
          targets: () => flutistTargets(scene, index, model),
        },
      ];
    }),
  sampleSets: (scene) => VIOLINIST_SWEEP.sampleSets(scene),
};

/**
 * Gives the note targets of the palms of a trombonist: the left palm is on its grip at the start
 * of each phrase, and the right palm is on the grip of the slide just after the start of each
 * note, when the slide has reached the position of the note (design 5.3), in a play that started
 * at the count-in.
 *
 * @param scene The scene.
 * @param index The index of the trombonist.
 * @param model The model of the trombonist.
 * @returns The targets.
 */
function trombonistTargets(scene: TestScene, index: number, model: PlayerModel): NoteTarget[] {
  const plan = scene.plan.players[index];
  if (plan?.note.family !== 'brass') {
    return [];
  }
  const { note: layer, timeOffset } = plan;
  return (['L', 'R'] as const).flatMap((side) => {
    const grip = side === 'L' ? model.instrument.grips.palmL : model.instrument.grips.palmR;
    const palm = side === 'L' ? model.body.palmL : model.body.palmR;
    if (!grip) {
      return [];
    }
    const starts = side === 'L' ? layer.track.phraseStarts : layer.track.starts;
    return Array.from(starts, (start: number): NoteTarget => ({
      side,
      sample: playSample(scene, start + timeOffset + 0.05),
      error: (posed) =>
        new Vector3(...posedPoint(posed, `hand${side}`, palm)).distanceTo(
          new Vector3(...posedPiecePoint(posed, grip)),
        ),
    }));
  });
}

/**
 * Tells if a player of a scene is in the sweep of the trombonist: the first seated panda with a
 * trombone, and each panda soloist, which stands (design 4.2).
 *
 * @param scene The scene.
 * @param index The index of the player.
 * @returns True for a player of the sweep.
 */
function sweptTrombonist(scene: TestScene, index: number): boolean {
  const { cast } = scene.layout.players[index] ?? {};
  if (cast?.species !== 'panda' || cast.instrument !== 'trombone') {
    return false;
  }
  if (cast.support === 'stand') {
    return true;
  }
  const first = scene.layout.players.findIndex(
    (p) =>
      p.cast.species === 'panda' && p.cast.instrument === 'trombone' && p.cast.support !== 'stand',
  );
  return first === index;
}

/**
 * The sweep of the trombonist (design 5.3): the arms against the body and the trombone, and the
 * trombone with its slide in the body ({@link INSTRUMENT_PART}), in a full play, in the lift at the
 * play start, in the rest pose before the first play, and in the lowering after the song end, with
 * the left palm on its grip and the right palm on the slide. The first
 * seated panda of each demo with trombones, and each standing panda soloist, play it. The body of
 * the panda mesh has no open edge, so its closed surface has the two cuts to the upper arms.
 */
export const TROMBONIST_SWEEP: RoleSweep = {
  role: 'trombonist',
  parts: [...ARM_PARTS, INSTRUMENT_PART],
  obstacles: [
    { name: 'body', surface: bodySurface },
    { name: 'trombone', surface: instrumentSurface },
  ],
  contact: CONTACT,
  accepted: [],
  targetError: 1e-3,
  hasRole: (score) => score.seats.some((seat) => seat.section === 'trombone'),
  players: (scene) =>
    scene.layout.players.flatMap((place, index) => {
      if (!sweptTrombonist(scene, index)) {
        return [];
      }
      const { species, instrument, kettles, support } = place.cast;
      const buffer = createScenePose(scene.plan);
      const audible = allAudible(scene.score);
      const model = scene.models.get(species, instrument, kettles, support);
      return [
        {
          name: `trombonist ${index} (${support})`,
          model,
          poseAt: ([song, wall, transport]: SweepSample) => {
            const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
            if (!pose) {
              throw new Error(`The pose has no player ${index}.`);
            }
            return pose;
          },
          targets: () => trombonistTargets(scene, index, model),
        },
      ];
    }),
  sampleSets: (scene) => VIOLINIST_SWEEP.sampleSets(scene),
};

/**
 * The sweep of the violist (design 5.3): the sweep of the violinist with the viola. The first
 * seated cat of each demo, and each standing cat soloist, play it.
 */
export const VIOLIST_SWEEP: RoleSweep = {
  ...VIOLINIST_SWEEP,
  role: 'violist',
  obstacles: [
    { name: 'body', surface: catBodySurface },
    { name: 'viola', surface: instrumentSurface },
  ],
  hasRole: (score) => score.seats.some((seat) => seat.section === 'viola'),
  players: (scene) => bowedPlayers(scene, 'viola', VIOLISTS),
};

/**
 * The sweep of the cellist (design 5.3): the sweep of the violinist with the cello. The first
 * seated dog of each demo plays it. A cellist does not stand as a soloist (4.2).
 */
export const CELLIST_SWEEP: RoleSweep = {
  ...VIOLINIST_SWEEP,
  role: 'cellist',
  obstacles: [
    { name: 'body', surface: dogBodySurface },
    { name: 'cello', surface: instrumentSurface },
  ],
  hasRole: (score) => score.seats.some((seat) => seat.section === 'cello'),
  players: (scene) => bowedPlayers(scene, 'cello', CELLISTS),
};

/**
 * The sweep of the bassist (design 5.3): the sweep of the violinist with the contrabass. The first
 * hippo of each demo plays it, standing, as each contrabass player stands.
 */
export const BASSIST_SWEEP: RoleSweep = {
  ...VIOLINIST_SWEEP,
  role: 'bassist',
  obstacles: [
    { name: 'body', surface: hippoBodySurface },
    { name: 'contrabass', surface: instrumentSurface },
  ],
  hasRole: (score) => score.seats.some((seat) => seat.section === 'contrabass'),
  players: (scene) => bowedPlayers(scene, 'contrabass', BASSISTS),
};

/** The species of the timpanists with a studio body of a mesh of the user. */
const TIMPANISTS: ReadonlySet<SpeciesId> = new Set(['elephant']);

/**
 * Gives the note targets of the mallets of a timpanist: the head of each mallet is on its target
 * of the head of a kettle at the start of each of its strikes (design 5.3), in a play that started
 * at the count-in.
 *
 * @param scene The scene.
 * @param index The index of the timpanist.
 * @param model The model of the timpanist.
 * @returns The targets.
 */
function timpanistTargets(scene: TestScene, index: number, model: PlayerModel): NoteTarget[] {
  const plan = scene.plan.players[index];
  if (plan?.note.family !== 'percussion') {
    return [];
  }
  const { note: layer, timeOffset } = plan;
  return (['L', 'R'] as const).flatMap((side) => {
    const track = side === 'L' ? layer.left : layer.right;
    const bone = side === 'L' ? 'malletL' : 'malletR';
    const head = model.instrument.targets.find((t) => t.kind === 'mallet-head' && t.bone === bone);
    if (!track || !head) {
      return [];
    }
    return Array.from(track.starts, (start, i): NoteTarget => {
      const point = new Vector3(
        track.points[3 * i] ?? 0,
        track.points[3 * i + 1] ?? 0,
        track.points[3 * i + 2] ?? 0,
      );
      return {
        side,
        sample: playSample(scene, start + timeOffset),
        error: (posed) =>
          new Vector3(...posedPiecePoint(posed, { bone, at: head.from })).distanceTo(point),
      };
    });
  });
}

/**
 * The sweep of the timpanist (design 5.3): the arms, the mallets, and the head with the trunk,
 * the tusks, and the ears against the body and the kettles, in a full play, in the lift at the
 * play start, in the rest pose before the first play, and in the lowering after the song end. The
 * elephant of each demo with timpani plays it, standing, as each timpani player stands.
 */
export const TIMPANIST_SWEEP: RoleSweep = {
  role: 'timpanist',
  parts: [
    ...ARM_PARTS,
    { name: 'mallets', bones: ['malletL', 'malletR'] },
    { name: 'head', bones: ['head'] },
  ],
  obstacles: [
    { name: 'body', surface: elephantBodySurface },
    { name: 'kettles', surface: instrumentSurface },
  ],
  contact: CONTACT,
  accepted: [
    ...['play', 'lift', 'rest', 'lower'].map((samples) => ({
      part: 'upper arms',
      into: 'body',
      samples,
      depth: 0.03,
      reason:
        'The upper arm of the elephant mesh lies on the side of the body above the elbow, so the arm touches the side (design 5.2).',
      decision: ELEPHANT_DECISIONS,
    })),
    ...['play', 'lift', 'lower'].map((samples) => ({
      part: 'mallets',
      into: 'kettles',
      samples,
      depth: 0.03,
      reason:
        'The middle of the ball of a mallet lies on the head of the kettle at the note start (design 5.3).',
      decision: ELEPHANT_DECISIONS,
    })),
  ],
  targetError: 1e-3,
  hasRole: (score) => score.seats.some((seat) => seat.section === 'timpani'),
  players: (scene) =>
    scene.layout.players.flatMap((place, index) => {
      const { species, instrument, kettles, support } = place.cast;
      if (!TIMPANISTS.has(species) || instrument !== 'timpani') {
        return [];
      }
      const buffer = createScenePose(scene.plan);
      const audible = allAudible(scene.score);
      const model = scene.models.get(species, instrument, kettles, support);
      return [
        {
          name: `timpanist ${index} (${support})`,
          model,
          poseAt: ([song, wall, transport]: SweepSample) => {
            const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
            if (!pose) {
              throw new Error(`The pose has no player ${index}.`);
            }
            return pose;
          },
          targets: () => timpanistTargets(scene, index, model),
        },
      ];
    }),
  sampleSets: (scene) => VIOLINIST_SWEEP.sampleSets(scene),
};

/**
 * The bowed roles whose species can stand as the soloist of the violin and piano duo
 * ({@link soloistScene}): the instrument of each role and its species. No demo has a standing
 * violin soloist, so the sweep of a demo never poses one.
 */
export const SOLOIST_ROLES = {
  violinist: { instrument: 'violin', species: VIOLINISTS },
  violist: { instrument: 'viola', species: VIOLISTS },
} as const;

/** A bowed role of {@link SOLOIST_ROLES}. */
export type SoloistRole = keyof typeof SOLOIST_ROLES;

/** The name of the violin and piano duo in the chamber test files of the shot tests. */
export const SOLOIST_FILE = 'violin-piano';

/**
 * Builds the scene of the violin and piano duo of the chamber test files (design 4.2, the recital
 * form, `chamberShotScenes()` of `shots/test-shots.ts`), with a species of a bowed role as the
 * standing soloist in the place of the violinist, with the instrument of the role. The place keeps
 * the footprint of the rabbit. The players of the role in the scene (`RoleSweep.players`) then
 * hold the soloist.
 *
 * @param role The bowed role.
 * @param species The species of the soloist: a species of the role.
 * @param seed The seed of the pose.
 * @returns The scene.
 * @throws Error if the species is not a species of the role, or the duo has no violinist.
 */
export function soloistScene(role: SoloistRole, species: SpeciesId, seed = 1): TestScene {
  const { instrument, species: allowed } = SOLOIST_ROLES[role];
  if (!allowed.has(species)) {
    throw new Error(
      `The species ${species} is not a species of the ${role}: ${[...allowed].join(', ')}.`,
    );
  }

  const score = scoreOf(violinPianoDuoFile());
  const models = new ModelCache();
  const duo = layoutScene(score, models);
  const index = duo.players.findIndex((place) => place.cast.instrument === 'violin');
  const violinist = duo.players[index];
  if (!violinist) {
    throw new Error('The violin and piano duo has no violinist.');
  }
  const players = [...duo.players];
  players[index] = { ...violinist, cast: { ...violinist.cast, species, instrument } };
  const layout = { ...duo, players };
  return { score, layout, plan: preparePoses(score, layout, seed, models), models };
}

/**
 * Tells if a player of a scene is in the sweep of the oboist: the first seated mouse with an oboe,
 * and each mouse soloist, which stands (design 4.2).
 *
 * @param scene The scene.
 * @param index The index of the player.
 * @returns True for a player of the sweep.
 */
function sweptOboist(scene: TestScene, index: number): boolean {
  const { cast } = scene.layout.players[index] ?? {};
  if (cast?.species !== 'mouse' || cast.instrument !== 'oboe') {
    return false;
  }
  if (cast.support === 'stand') {
    return true;
  }
  const first = scene.layout.players.findIndex(
    (p) => p.cast.species === 'mouse' && p.cast.instrument === 'oboe' && p.cast.support !== 'stand',
  );
  return first === index;
}

/**
 * The sweep of the oboist (design 5.3): the sweep of the flutist with the oboe and the mouse. The
 * first seated mouse of each demo with oboes, and each standing mouse soloist, play it, with the
 * palms on their grips at the start of each phrase.
 */
export const OBOIST_SWEEP: RoleSweep = {
  ...FLUTIST_SWEEP,
  role: 'oboist',
  obstacles: [
    { name: 'body', surface: mouseBodySurface },
    { name: 'oboe', surface: instrumentSurface },
  ],
  hasRole: (score) => score.seats.some((seat) => seat.section === 'oboe'),
  players: (scene) =>
    scene.layout.players.flatMap((place, index) => {
      if (!sweptOboist(scene, index)) {
        return [];
      }
      const { species, instrument, kettles, support } = place.cast;
      const buffer = createScenePose(scene.plan);
      const audible = allAudible(scene.score);
      const model = scene.models.get(species, instrument, kettles, support);
      return [
        {
          name: `oboist ${index} (${support})`,
          model,
          poseAt: ([song, wall, transport]: SweepSample) => {
            const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
            if (!pose) {
              throw new Error(`The pose has no player ${index}.`);
            }
            return pose;
          },
          targets: () => flutistTargets(scene, index, model),
        },
      ];
    }),
};

/**
 * Tells if a player of a scene is in the sweep of the bassoonist: the first seated beaver with a
 * bassoon, and each beaver soloist, which stands (design 4.2).
 *
 * @param scene The scene.
 * @param index The index of the player.
 * @returns True for a player of the sweep.
 */
function sweptBassoonist(scene: TestScene, index: number): boolean {
  const { cast } = scene.layout.players[index] ?? {};
  if (cast?.species !== 'beaver' || cast.instrument !== 'bassoon') {
    return false;
  }
  if (cast.support === 'stand') {
    return true;
  }
  const first = scene.layout.players.findIndex(
    (p) =>
      p.cast.species === 'beaver' && p.cast.instrument === 'bassoon' && p.cast.support !== 'stand',
  );
  return first === index;
}

/**
 * The sweep of the bassoonist (design 5.3): the sweep of the flutist with the bassoon and the
 * beaver. The first seated beaver of each demo with bassoons, and each standing beaver soloist,
 * play it, with the palms on their grips at the start of each phrase.
 */
export const BASSOONIST_SWEEP: RoleSweep = {
  ...FLUTIST_SWEEP,
  role: 'bassoonist',
  obstacles: [
    { name: 'body', surface: beaverBodySurface },
    { name: 'bassoon', surface: instrumentSurface },
  ],
  accepted: ['lift', 'lower'].map((samples) => ({
    part: 'paws',
    into: 'bassoon',
    samples,
    depth: 0.016,
    reason:
      'The left paw closes on the wing joint of the smaller bassoon, and in the middle of the lift and the lowering it goes up to 1.6 cm into the tube in one sample of about 30 (design 5.3).',
    decision: BEAVER_DECISIONS,
  })),
  hasRole: (score) => score.seats.some((seat) => seat.section === 'bassoon'),
  players: (scene) =>
    scene.layout.players.flatMap((place, index) => {
      if (!sweptBassoonist(scene, index)) {
        return [];
      }
      const { species, instrument, kettles, support } = place.cast;
      const buffer = createScenePose(scene.plan);
      const audible = allAudible(scene.score);
      const model = scene.models.get(species, instrument, kettles, support);
      return [
        {
          name: `bassoonist ${index} (${support})`,
          model,
          poseAt: ([song, wall, transport]: SweepSample) => {
            const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
            if (!pose) {
              throw new Error(`The pose has no player ${index}.`);
            }
            return pose;
          },
          targets: () => flutistTargets(scene, index, model),
        },
      ];
    }),
};

/**
 * Tells if a player of a scene is in the sweep of the hornist: the first seated pig with a horn,
 * and each pig soloist, which stands (design 4.2).
 *
 * @param scene The scene.
 * @param index The index of the player.
 * @returns True for a player of the sweep.
 */
function sweptHornist(scene: TestScene, index: number): boolean {
  const { cast } = scene.layout.players[index] ?? {};
  if (cast?.species !== 'pig' || cast.instrument !== 'horn') {
    return false;
  }
  if (cast.support === 'stand') {
    return true;
  }
  const first = scene.layout.players.findIndex(
    (p) => p.cast.species === 'pig' && p.cast.instrument === 'horn' && p.cast.support !== 'stand',
  );
  return first === index;
}

/**
 * The sweep of the hornist (design 5.3): the sweep of the trombonist with the horn and the pig.
 * The first seated pig of each demo with horns, and each standing pig soloist, play it. The left
 * palm is on its grip at the valves at the start of each phrase, and the right palm on its grip in
 * the bell at the start of each note ({@link trombonistTargets}: the horn has no slide). The body
 * of the pig mesh has no open edge, so its closed surface has the two cuts to the upper arms
 * (`loops-probe.txt` of `docs/research/2026-10-19-pig-mesh/`).
 */
export const HORNIST_SWEEP: RoleSweep = {
  ...TROMBONIST_SWEEP,
  role: 'hornist',
  obstacles: [
    { name: 'body', surface: bodySurface },
    { name: 'horn', surface: instrumentSurface },
  ],
  hasRole: (score) => score.seats.some((seat) => seat.section === 'horn'),
  players: (scene) =>
    scene.layout.players.flatMap((place, index) => {
      if (!sweptHornist(scene, index)) {
        return [];
      }
      const { species, instrument, kettles, support } = place.cast;
      const buffer = createScenePose(scene.plan);
      const audible = allAudible(scene.score);
      const model = scene.models.get(species, instrument, kettles, support);
      return [
        {
          name: `hornist ${index} (${support})`,
          model,
          poseAt: ([song, wall, transport]: SweepSample) => {
            const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
            if (!pose) {
              throw new Error(`The pose has no player ${index}.`);
            }
            return pose;
          },
          targets: () => trombonistTargets(scene, index, model),
        },
      ];
    }),
};

/**
 * Tells if a player of a scene is in the sweep of the clarinetist: the first seated wolf with a
 * clarinet, and each wolf soloist, which stands (design 4.2).
 *
 * @param scene The scene.
 * @param index The index of the player.
 * @returns True for a player of the sweep.
 */
function sweptClarinetist(scene: TestScene, index: number): boolean {
  const { cast } = scene.layout.players[index] ?? {};
  if (cast?.species !== 'wolf' || cast.instrument !== 'clarinet') {
    return false;
  }
  if (cast.support === 'stand') {
    return true;
  }
  const first = scene.layout.players.findIndex(
    (p) =>
      p.cast.species === 'wolf' && p.cast.instrument === 'clarinet' && p.cast.support !== 'stand',
  );
  return first === index;
}

/**
 * The sweep of the clarinetist (design 5.3): the sweep of the flutist with the clarinet and the
 * wolf. The first seated wolf of each demo with clarinets, and each standing wolf soloist, play it,
 * with the palms on their grips at the start of each phrase.
 */
export const CLARINETIST_SWEEP: RoleSweep = {
  ...FLUTIST_SWEEP,
  role: 'clarinetist',
  obstacles: [
    { name: 'body', surface: wolfBodySurface },
    { name: 'clarinet', surface: instrumentSurface },
  ],
  hasRole: (score) => score.seats.some((seat) => seat.section === 'clarinet'),
  players: (scene) =>
    scene.layout.players.flatMap((place, index) => {
      if (!sweptClarinetist(scene, index)) {
        return [];
      }
      const { species, instrument, kettles, support } = place.cast;
      const buffer = createScenePose(scene.plan);
      const audible = allAudible(scene.score);
      const model = scene.models.get(species, instrument, kettles, support);
      return [
        {
          name: `clarinetist ${index} (${support})`,
          model,
          poseAt: ([song, wall, transport]: SweepSample) => {
            const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
            if (!pose) {
              throw new Error(`The pose has no player ${index}.`);
            }
            return pose;
          },
          targets: () => flutistTargets(scene, index, model),
        },
      ];
    }),
};

/** The sweep of each role, by its name. */
export const SWEEP_ROLES = {
  conductor: CONDUCTOR_SWEEP,
  pianist: PIANIST_SWEEP,
  violinist: VIOLINIST_SWEEP,
  violist: VIOLIST_SWEEP,
  cellist: CELLIST_SWEEP,
  bassist: BASSIST_SWEEP,
  flutist: FLUTIST_SWEEP,
  trombonist: TROMBONIST_SWEEP,
  oboist: OBOIST_SWEEP,
  timpanist: TIMPANIST_SWEEP,
  hornist: HORNIST_SWEEP,
  bassoonist: BASSOONIST_SWEEP,
  clarinetist: CLARINETIST_SWEEP,
} as const;
