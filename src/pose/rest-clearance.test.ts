import { describe, expect, it } from 'vitest';

import { galleryPlan } from '../gallery/plan.ts';
import type { GalleryAnimal } from '../gallery/plan.ts';
import { CONDUCTOR, SECTION_INSTRUMENTS, SECTION_SPECIES } from '../models/cast.ts';
import type { PlayingSection } from '../models/cast.ts';
import { INSTRUMENT_SUPPORTS, buildPlayer, supportOf } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import type { Support } from '../models/props.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import type { SpeciesId } from '../models/species.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { ARM_CONTACT_DEPTH, armGaps, clearanceRig } from './test-arm-clearance.ts';
import { HEAD_BONES, partDistance, posedPart } from './test-clearance.ts';
import type { ArmGap } from './test-arm-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import { NOT_STARTED } from './test-scene.ts';

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
 * Finds the smallest gap of each arm part from each body group of each animal in the rest pose,
 * over the wall times.
 *
 * @param bodyOf Gives the model of a cast.
 * @returns For each label, the smallest gap of each arm part from each body group.
 */
function restGaps(bodyOf: (cast: Cast) => PlayerModel): Map<string, ArmGap[]> {
  const animal = (cast: Cast, seatIndex: number): GalleryAnimal => ({
    model: bodyOf(cast),
    place: {
      position: [seatIndex * 3, 0, 0],
      facing: Math.PI,
      support: cast.support,
      cast: { ...cast, seatIndex, player: 0, kettles: 4 },
    },
  });
  const players = CASTS.map(animal);
  const conductor = animal(CONDUCTOR_CAST, players.length);
  const plan = galleryPlan(players, conductor, []);
  const buffer = createScenePose(plan);
  const rigs = [...players, conductor].map((a) => clearanceRig(a.model));

  const worst = new Map<string, ArmGap[]>();
  for (const wall of WALL_TIMES) {
    const scene = poseAt(plan, 0, wall, NOT_STARTED, [], buffer);
    const poses = [...scene.players, scene.conductor];
    for (const [i, cast] of [...CASTS, CONDUCTOR_CAST].entries()) {
      const pose = poses[i];
      const rig = rigs[i];
      if (!pose || !rig) {
        throw new Error(`The ${cast.label} has no pose.`);
      }
      const gaps = armGaps(rig, poseSkeleton(rig.model, pose), 0.1);
      const before = worst.get(cast.label) ?? gaps;
      worst.set(
        cast.label,
        gaps.map((gap, k) => {
          const old = before[k] ?? gap;
          return gap.gap < old.gap ? gap : old;
        }),
      );
    }
  }
  return worst;
}

/**
 * Lists the arm parts that go into the body deeper than {@link ARM_CONTACT_DEPTH}. A contact is
 * permitted.
 *
 * @param gaps The smallest gaps of each animal.
 * @returns One line for each part, empty if no part goes in deeper.
 */
function faults(gaps: ReadonlyMap<string, readonly ArmGap[]>): string[] {
  return [...gaps].flatMap(([label, list]) =>
    list
      .filter((gap) => gap.gap < -ARM_CONTACT_DEPTH)
      .map((g) => `${label}: ${g.side} ${g.part} in the ${g.group}, gap ${g.gap.toFixed(3)} H`),
  );
}

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

describe('the arms in the rest pose (design 5.2, 5.3)', () => {
  it('keeps each arm out of the torso, the head, and the thighs', () => {
    // On 2026-10-07, the forearms of the violin sections and of the pianist were inside the
    // torso and the belly (user report). The first rest pose put the right forearm of the
    // violins 0.37 H into the torso, and the hanging arms of the conductor and of the standing
    // percussion players 0.25 H into the hips.
    const gaps = restGaps((cast) => buildPlayer(cast.species, cast.instrument, 4, cast.support));

    expect(gaps.size).toBe(CASTS.length + 1);
    expect(faults(gaps)).toEqual([]);
  });

  it('keeps the rested bow and instrument out of the torso and the head', () => {
    // They can touch the body, as the instruments of the reference images lie against it. The
    // distance of two posed parts has no sign, so a part that crosses the body gets 0.
    const limit = 0.001;
    const bowed = CASTS.filter((cast) => cast.instrument in BOWED_REST);
    const players = bowed.map((cast, seatIndex): GalleryAnimal => {
      const model = buildPlayer(cast.species, cast.instrument, 4, cast.support);
      return {
        model,
        place: {
          position: [seatIndex * 3, 0, 0],
          facing: Math.PI,
          support: cast.support,
          cast: { ...cast, seatIndex, player: 0, kettles: 4 },
        },
      };
    });
    const bear = buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument);
    const conductor: GalleryAnimal = {
      model: bear,
      place: {
        position: [players.length * 3, 0, 0],
        facing: Math.PI,
        support: 'stand',
        cast: { ...CONDUCTOR_CAST, seatIndex: players.length, player: 0, kettles: 4 },
      },
    };
    const plan = galleryPlan(players, conductor, []);
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
