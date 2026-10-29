import { describe, expect, it } from 'vitest';

import { galleryPlan } from '../gallery/plan.ts';
import type { GalleryAnimal } from '../gallery/plan.ts';
import { CONDUCTOR, SECTION_INSTRUMENTS, SECTION_SPECIES } from '../models/cast.ts';
import type { PlayingSection } from '../models/cast.ts';
import { INSTRUMENT_SUPPORTS, buildPlayer, supportOf } from '../models/player.ts';
import type { Support } from '../models/props.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import type { SpeciesId } from '../models/species.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { HEAD_BONES, partDistance, posedPart } from './test-clearance.ts';
import { poseSkeleton, posedPoint } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { boneIndex } from '../models/rig.ts';
import { NOT_STARTED, PLAYING } from './test-scene.ts';
import { posedCorner } from './test-skin.ts';

/** One animal of the test: a species with an instrument on its support. */
interface Cast {
  readonly species: SpeciesId;
  readonly instrument: InstrumentId;
  readonly support: Support;
  readonly label: string;
}

/** Each species with each instrument of its section (design 4.3, 4.6), and the soloists who stand. */
const CASTS: readonly Cast[] = Object.keys(SECTION_SPECIES)
  .filter((section): section is PlayingSection => section in SECTION_SPECIES)
  .flatMap((section) =>
    SECTION_SPECIES[section].flatMap((species) =>
      SECTION_INSTRUMENTS[section].flatMap((instrument) => {
        const seat = INSTRUMENT_SUPPORTS[instrument];
        const solo = supportOf(instrument, true);
        const supports = solo === seat ? [seat] : [seat, solo];
        return supports.map((support) => ({
          species,
          instrument,
          support,
          label: `${species} ${instrument}${support === seat ? '' : ` (${support})`}`,
        }));
      }),
    ),
  );

/** The conductor, who stands on the podium. */
const CONDUCTOR_CAST: Cast = { ...CONDUCTOR, support: 'stand', label: 'bear baton' };

/** The wall times of the samples: the idle motion breathes and sways the body. */
const WALL_TIMES = [10, 13.7, 21.1, 29.3];

/**
 * The pieces of each bowed string in the rest pose that stay out of the torso: the violin and
 * the viola rest on the lap with the bow, and the cello and the contrabass keep only the bow on
 * the lap.
 */
const BOWED_REST: Readonly<Partial<Record<InstrumentId, readonly ('instrument' | 'bow')[]>>> = {
  violin: ['instrument', 'bow'],
  viola: ['instrument', 'bow'],
  cello: ['bow'],
  contrabass: ['bow'],
};

/** The players of a test with their models, and the plan of the gallery with them. */
interface CastPlan {
  /** The players, with their models. */
  readonly players: readonly GalleryAnimal[];
  /** The plan of the players and the conductor. */
  readonly plan: ReturnType<typeof galleryPlan>;
}

/**
 * Makes the plan of the gallery with some players and the conductor.
 *
 * @param casts The players.
 * @returns The players with their models, and the plan.
 */
function castPlan(casts: readonly Cast[]): CastPlan {
  const players = casts.map((cast, seatIndex): GalleryAnimal => ({
    model: buildPlayer(cast.species, cast.instrument, 4, cast.support),
    place: {
      position: [seatIndex * 3, 0, 0],
      facing: Math.PI,
      cast: { ...cast, seatIndex, player: 0, kettles: 4 },
    },
  }));
  const conductor: GalleryAnimal = {
    model: buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument),
    place: {
      position: [players.length * 3, 0, 0],
      facing: Math.PI,
      cast: { ...CONDUCTOR_CAST, seatIndex: players.length, player: 0, kettles: 4 },
    },
  };
  return { players, plan: galleryPlan(players, conductor, []) };
}

describe('the players on the floor (design 5.2)', () => {
  it('keeps each player and its instrument above the floor at rest and while it plays', () => {
    // The violin and the viola of a soloist who stands can hang below the hanging left hand,
    // 0.05 m to 0.12 m into the floor.
    const { players, plan } = castPlan(CASTS);
    const buffer = createScenePose(plan);

    const below: string[] = [];
    for (const transport of [NOT_STARTED, PLAYING]) {
      for (const time of [0, 2, 4]) {
        const scene = poseAt(plan, time, 10, transport, [], buffer);
        for (const [i, { model, place }] of players.entries()) {
          const pose = scene.players[i];
          if (!pose) {
            throw new Error(`The ${place.cast.instrument} has no pose.`);
          }
          const posed = poseSkeleton(model, pose);
          let bottom = Infinity;
          for (let c = 0; c < model.mesh.bones.length; c++) {
            bottom = Math.min(bottom, posedCorner(posed, c)[1]);
          }
          if (bottom < -0.001) {
            below.push(`${CASTS[i]?.label ?? ''} at ${time} s: ${bottom.toFixed(3)} m`);
          }
        }
      }
    }
    expect(below).toEqual([]);
  });
});

describe('the hanging arms of the standing players (design 5.2)', () => {
  it('holds each palm of a standing player at least at the height of its hip joints', () => {
    // An animal of the reference images holds its arms at its belly. With the short standing legs
    // and an elbow bend of 30°, the hanging palms come down near the knees: at rest, and the free
    // left hand of the bass drum while it plays.
    const standing = CASTS.filter((cast) => cast.support === 'stand');
    const { players, plan } = castPlan(standing);
    const bear = buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument);
    const buffer = createScenePose(plan);

    const low: string[] = [];
    const check = (label: string, posed: PosedSkeleton): void => {
      const hip = posed.model.skeleton.positions[boneIndex('thighR')]?.[1] ?? NaN;
      const h = posed.model.body.headHeight;
      for (const side of ['L', 'R'] as const) {
        const palm = posedPoint(posed, `hand${side}`, posed.model.body[`palm${side}`])[1];
        if (palm < hip) {
          low.push(`${label} ${side}: ${((palm - hip) / h).toFixed(2)} H`);
        }
      }
    };
    for (const [state, transport] of [
      ['rest', NOT_STARTED],
      ['play', PLAYING],
    ] as const) {
      for (const wall of WALL_TIMES) {
        const scene = poseAt(plan, 0, wall, transport, [], buffer);
        for (const [i, { model }] of players.entries()) {
          const pose = scene.players[i];
          if (pose) {
            check(`${standing[i]?.label ?? ''} ${state} ${wall} s`, poseSkeleton(model, pose));
          }
        }
        if (scene.conductor) {
          check(`bear baton ${state} ${wall} s`, poseSkeleton(bear, scene.conductor));
        }
      }
    }
    expect(low).toEqual([]);
  });
});

describe('the arms in the rest pose (design 5.2, 5.3)', () => {
  it('keeps the rested bow and instrument out of the torso and the head', () => {
    // They can touch the body, as the instruments of the reference images lie against it. The
    // distance of two posed parts has no sign, so a part that crosses the body gets 0.
    const limit = 0.001;
    const bowed = CASTS.filter((cast) => cast.instrument in BOWED_REST);
    const { players, plan } = castPlan(bowed);
    const buffer = createScenePose(plan);

    const near: string[] = [];
    for (const wall of WALL_TIMES) {
      const scene = poseAt(plan, 0, wall, NOT_STARTED, [], buffer);
      for (const [i, { model, place }] of players.entries()) {
        const pose = scene.players[i];
        if (!pose) {
          throw new Error(`The ${place.cast.instrument} has no pose.`);
        }
        const posed = poseSkeleton(model, pose);
        const body = posedPart(posed, ['spine', 'chest', ...HEAD_BONES]);
        for (const bone of BOWED_REST[place.cast.instrument] ?? []) {
          const gap = partDistance(posedPart(posed, [bone]), body, limit);
          if (gap === 0) {
            near.push(`${bowed[i]?.label ?? ''} ${bone} at ${wall} s: ${gap.toFixed(3)} m`);
          }
        }
      }
    }
    expect(near).toEqual([]);
  });
});
