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
import { armGaps, clearanceRig } from './test-arm-clearance.ts';
import type { ArmGap } from './test-arm-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import { plumpModel } from './test-plump.ts';
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

/** The instruments whose rest pose keeps the arms out of the body so far. */
const CHECKED: ReadonlySet<InstrumentId> = new Set<InstrumentId>([
  'violin',
  'viola',
  'cello',
  'contrabass',
  'piano',
  'harp',
  'timpani',
  'bass-drum',
  'snare-drum',
  'cymbals',
  'small-percussion',
  'xylophone',
  'baton',
]);

/** The conductor, who stands on the podium. */
const CONDUCTOR_CAST: Cast = { ...CONDUCTOR, support: 'stand', label: 'bear baton' };

/** The wall times of the samples: the idle motion breathes and sways the body. */
const WALL_TIMES = [10, 13.7, 21.1, 29.3];

/** The smallest gap between an arm and the torso or the head, in head heights. */
const BODY_GAP = 0.01;

/**
 * Gives the smallest gap of a body group that an arm keeps: {@link BODY_GAP} from the torso and
 * the head. An arm can rest on a thigh, but it does not go into it.
 *
 * @param gap The gap.
 * @returns The smallest gap.
 */
function allowed(gap: ArmGap): number {
  return gap.group === 'legs' ? 0 : BODY_GAP;
}

/**
 * Finds the smallest gap of each arm part from each body group of each animal in the rest pose,
 * over the wall times.
 *
 * @param bodyOf Gives the model of a cast.
 * @returns For each label, the gaps with the least margin over their smallest allowed gap.
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
      if (!CHECKED.has(cast.instrument)) {
        continue;
      }
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
 * Lists the arm parts that come nearer to the body than they may.
 *
 * @param gaps The smallest gaps of each animal.
 * @returns One line for each part, empty if all parts keep their gaps.
 */
function faults(gaps: ReadonlyMap<string, readonly ArmGap[]>): string[] {
  return [...gaps].flatMap(([label, list]) =>
    list
      .filter((gap) => gap.gap < allowed(gap))
      .map((g) => `${label}: ${g.side} ${g.part} in the ${g.group}, gap ${g.gap.toFixed(3)} H`),
  );
}

describe('the arms in the rest pose (design 5.2, 5.3)', () => {
  it('keeps each arm out of the torso, the head, and the thighs', () => {
    // On 2026-10-07, the forearms of the violin sections and of the pianist were inside the
    // torso and the belly (user report). The first rest pose put the right forearm of the
    // violins 0.37 H into the torso, and the hanging arms of the conductor and of the standing
    // percussion players 0.25 H into the hips.
    const gaps = restGaps((cast) => buildPlayer(cast.species, cast.instrument, 4, cast.support));

    expect(gaps.size).toBeGreaterThan(0);
    expect(faults(gaps)).toEqual([]);
  });

  it('leaves room for the plump bodies of option B', () => {
    // The torso of option B is 1.1 (medium) or 1.25 (large) times wider and deeper, with the
    // shoulders 0.53 H wide, and the arms have the radii 0.20, 0.17, and 0.15 H
    // (`docs/research/2026-10-06-cute-furry-spec.md`, 2.4).
    const gaps = restGaps((cast) =>
      plumpModel(buildPlayer(cast.species, cast.instrument, 4, cast.support), cast.species),
    );

    expect(faults(gaps)).toEqual([]);
  });
});
