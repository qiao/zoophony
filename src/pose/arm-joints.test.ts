import { describe, expect, it } from 'vitest';

import { MathUtils, Ray, Vector3 } from 'three';

import { galleryPlan } from '../gallery/plan.ts';
import type { GalleryAnimal } from '../gallery/plan.ts';
import { DEFAULT_TEST_NOTES, parseTestNotes } from '../gallery/notes.ts';
import type { TestNote } from '../gallery/notes.ts';
import { ARM_RADII } from '../models/arms.ts';
import { SHOULDER_JOINT } from '../models/body-frame.ts';
import { CONDUCTOR, SECTION_INSTRUMENTS, SECTION_SPECIES } from '../models/cast.ts';
import type { PlayingSection } from '../models/cast.ts';
import { ModelCache } from '../models/model-cache.ts';
import { INSTRUMENT_SUPPORTS } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import type { SpeciesId } from '../models/species.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { posedPart, signedDistance } from './test-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED } from './test-scene.ts';
import type { AnimalPose, Transport } from './types.ts';

/** Each species with each instrument of its section (design 4.3, 4.6). */
const CAST: readonly (readonly [SpeciesId, InstrumentId])[] = Object.keys(SECTION_SPECIES)
  .filter((section): section is PlayingSection => section in SECTION_SPECIES)
  .flatMap((section) =>
    SECTION_SPECIES[section].flatMap((species) =>
      SECTION_INSTRUMENTS[section].map((id): readonly [SpeciesId, InstrumentId] => [species, id]),
    ),
  );

const NOTES: readonly TestNote[] = (() => {
  const result = parseTestNotes(DEFAULT_TEST_NOTES);
  return result.ok ? result.notes : [];
})();

/** A transport that plays since long before the time of the pose. */
const PLAYING: Transport = {
  playing: true,
  changedAtWall: -100,
  before: null,
  startSec: 0,
  holdSec: 3,
  leadSec: Number.POSITIVE_INFINITY,
};

/** The measures of one shoulder joint in one pose, in meters. */
interface ShoulderJoin {
  /** The depth of the joint in the upper arm. A joint outside the arm gives a negative depth. */
  readonly inArm: number;
  /** The signed distance from the joint to the torso: negative inside the torso. */
  readonly toTorso: number;
}

/**
 * Measures the two shoulder joints of a posed player. The upper arm turns around its joint, so
 * the ball of the arm around the joint keeps its place in each pose. The arm joins the torso with
 * no gap when that ball reaches into the torso.
 *
 * @param posed The posed skeleton.
 * @returns The left and the right joint.
 */
function shoulderJoins(posed: PosedSkeleton): ShoulderJoin[] {
  const torso = posedPart(posed, ['chest']);
  return (['upperArmL', 'upperArmR'] as const).map((bone) => {
    const joint = posed.frames[boneIndex(bone)]?.position ?? new Vector3();
    return {
      inArm: -signedDistance(posedPart(posed, [bone]), joint),
      toTorso: signedDistance(torso, joint),
    };
  });
}

/**
 * Measures the outer side of each bent elbow of a posed player: the distance from the elbow joint
 * to the outer surface of the arm and its filler, along the outer bisector of the bend, as a
 * part of the radius of the arm at the elbow. An elbow that bends by less than 20° counts as 1.
 *
 * @param posed The posed skeleton.
 * @returns The left and the right measure.
 */
function elbowOuters(posed: PosedSkeleton): number[] {
  const { headHeight: h } = posed.model.body;
  // The girth of the species scales the arm and the spread of the shoulders.
  const spread = Math.abs(posed.model.skeleton.positions[boneIndex('upperArmR')]?.[0] ?? 0);
  const radius = (ARM_RADII[1] * spread) / SHOULDER_JOINT.spread;
  const at = (bone: Parameters<typeof boneIndex>[0]): Vector3 =>
    posed.frames[boneIndex(bone)]?.position.clone() ?? new Vector3();
  return (['L', 'R'] as const).map((side) => {
    const joint = at(`forearm${side}`);
    const up = at(`upperArm${side}`).sub(joint).normalize();
    const down = at(`hand${side}`).sub(joint).normalize();
    if (up.angleTo(down) > Math.PI - 20 * MathUtils.DEG2RAD) {
      return 1;
    }

    // The farthest crossing of the ray with the arm, within 0.5 H: the outer surface.
    const ray = new Ray(joint, up.add(down).normalize().negate());
    const hit = new Vector3();
    let outer = 0;
    for (const t of posedPart(posed, [`upperArm${side}`, `forearm${side}`]).triangles) {
      if (ray.intersectTriangle(t.a, t.b, t.c, false, hit)) {
        const distance = hit.distanceTo(joint);
        if (distance < 0.5 * h) {
          outer = Math.max(outer, distance);
        }
      }
    }
    return outer / radius;
  });
}

describe('the shoulder joints (design 4.5, 4.7)', () => {
  const models = new ModelCache();
  const animal = (
    species: SpeciesId,
    instrument: InstrumentId,
    seatIndex: number,
  ): GalleryAnimal => ({
    model: models.get(species, instrument),
    place: {
      position: [seatIndex * 3, 0, 0],
      facing: Math.PI,
      support: INSTRUMENT_SUPPORTS[instrument],
      cast: {
        seatIndex,
        player: 0,
        species,
        instrument,
        kettles: 4,
        support: INSTRUMENT_SUPPORTS[instrument],
      },
    },
  });
  const players = CAST.map(([species, id], i) => animal(species, id, i));
  const conductor = animal(CONDUCTOR.species, CONDUCTOR.instrument, players.length);
  const plan = galleryPlan(players, conductor, NOTES);

  /** The poses of each animal: the rest pose, and the poses of the test notes every 0.1 s. */
  function posesOf(): { readonly label: string; readonly posed: PosedSkeleton }[] {
    const out: { label: string; posed: PosedSkeleton }[] = [];
    const buffer = createScenePose(plan);
    const add = (time: number, transport: Transport, label: string): void => {
      const scene = poseAt(plan, time, 10, transport, [], buffer);
      const each = (who: GalleryAnimal, pose: AnimalPose | null | undefined): void => {
        if (pose) {
          const name = `${who.place.cast.species} with the ${who.place.cast.instrument} ${label}`;
          out.push({ label: name, posed: poseSkeleton(who.model, pose) });
        }
      };
      players.forEach((who, i) => each(who, scene.players[i]));
      each(conductor, scene.conductor);
    };
    add(1, NOT_STARTED, 'at rest');
    for (let time = 0; time <= 4.5; time += 0.1) {
      add(time, PLAYING, `at ${time.toFixed(1)} s`);
    }
    return out;
  }

  const poses = posesOf();

  it('rounds each upper arm into a ball around its shoulder joint', () => {
    for (const { label, posed } of poses) {
      const h = posed.model.body.headHeight;
      for (const join of shoulderJoins(posed)) {
        // The ball of the arm has the radius of the arm at the shoulder: 0.17 H at the girth 1,
        // and 0.13 H for the meerkat (the girth 0.75).
        expect(join.inArm / h, label).toBeGreaterThan(0.1);
      }
    }
  });

  it('sinks the ball of each shoulder 0.05 H into the torso, in each pose', () => {
    // The joint is up to 0.074 H out of the side of the torso, and the ball reaches 0.085 H into
    // it. The flat end of the first upper arm had its middle on the joint, so a raised arm showed
    // a gap of up to 0.074 H between the arm and the torso.
    for (const { label, posed } of poses) {
      const h = posed.model.body.headHeight;
      for (const join of shoulderJoins(posed)) {
        expect((join.inArm - join.toTorso) / h, label).toBeGreaterThan(SHOULDER_JOINT.overlap);
      }
    }
  });

  it('keeps the outer side of each bent elbow 0.6 of the arm radius from the joint', () => {
    // The flat end of the first upper arm overlapped the forearm, and a bent elbow showed a
    // notch on its outer side. The filler ball of 0.9 of the arm radius fills it.
    for (const { label, posed } of poses) {
      for (const outer of elbowOuters(posed)) {
        expect(outer, label).toBeGreaterThan(0.6);
      }
    }
  });
});
