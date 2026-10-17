/**
 * Measures the lap rest of a seated player (design 5.2, 5.3): the lower end of the instrument on
 * the skin of the thighs, and the bow across the lap. The goals of the lap rest of the violin are
 * in `docs/decisions/2026-10-16-seat-rest.md`. The measure comes from `rest-probe.ts` of
 * `docs/research/2026-10-16-seat-rest/`. `pnpm hold-fit` gives it in its rest columns.
 */
import { Triangle, Vector3 } from 'three';

import { roleBodies } from './fold-probe.ts';
import type { RoleSource } from './fold-probe.ts';
import type { DemoFile } from './patch-demos.ts';
import { boneIndex } from '../src/models/rig.ts';
import type { BoneName } from '../src/models/rig.ts';
import { countInAt } from '../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { closedDepth } from '../src/pose/test-clearance.ts';
import type { ClosedSurface } from '../src/pose/test-clearance.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../src/pose/test-kinematics.ts';
import { NOT_STARTED, allAudible, sceneOf } from '../src/pose/test-scene.ts';
import { posedCorner } from '../src/pose/test-skin.ts';
import type { SweepObstacle } from '../src/pose/test-sweep.ts';

/**
 * The wall times of the rest samples of the lap rest, in seconds, before the first play: the times
 * of `rest-probe.ts`. The idle motion moves the bow tip of the rabbit by up to 0.8 cm between
 * them (`docs/research/2026-10-16-hip-open/rest-probe-branch.txt`).
 */
export const REST_WALLS: readonly number[] = [10, 13.7, 21.1, 29.3];

/** The bones of the skin of the lap: the thighs and the hips. */
const LAP_BONES: readonly BoneName[] = ['thighL', 'thighR', 'hips'];

/** The bones of the thighs. The front of their skin is the front of the knees. */
const THIGH_BONES: readonly BoneName[] = ['thighL', 'thighR'];

/**
 * The height of the lower end of an instrument, in meters: each corner of the instrument less
 * than this above its lowest corner is a corner of the lower end.
 */
export const END_HEIGHT = 0.02;

/** The bow across the lap in one rest sample. */
export interface BowRest {
  /** The height of the tip of the bow above the frog, in meters: negative below the frog. */
  readonly tipRise: number;
  /**
   * The reach of the tip of the bow past the front of the knees toward the music stand, in
   * meters: negative behind the knees.
   */
  readonly tipPast: number;
}

/** The lap rest of a seated player in one rest sample. */
export interface LapRest {
  /**
   * The distance from the lower end of the instrument to the nearest triangle of the skin of the
   * thighs and the hips, in meters: 0 when a corner of the end is in the body.
   */
  readonly endGap: number;
  /** The depth of the deepest corner of the lower end in the body, in meters: 0 for none. */
  readonly endDepth: number;
  /** The bow, or `null` for a player with no bow, such as a flutist. */
  readonly bow: BowRest | null;
}

/**
 * Finds the frog and the tip of a bow: the two corners of the bow that are farthest apart. The
 * frog is the end nearer to the right paw.
 *
 * @param bow The corners of the bow.
 * @param paw The right paw.
 * @returns The frog and the tip, or `null` with no corner.
 */
function bowEnds(
  bow: readonly Vector3[],
  paw: Vector3,
): { readonly frog: Vector3; readonly tip: Vector3 } | null {
  const [first] = bow;
  if (!first) {
    return null;
  }
  let frog = first;
  let tip = first;
  let far = 0;
  for (const a of bow) {
    for (const b of bow) {
      const d = a.distanceToSquared(b);
      if (d > far) {
        far = d;
        frog = a;
        tip = b;
      }
    }
  }
  return tip.distanceTo(paw) < frog.distanceTo(paw) ? { frog: tip, tip: frog } : { frog, tip };
}

/**
 * Measures the lap rest of a seated player in one rest sample, in the axes of the model (the
 * player faces -z). The lower end of the instrument is each corner of the `instrument` bone less
 * than {@link END_HEIGHT} above its lowest corner. Its gap is the distance from its corners to the
 * nearest triangle of the skin of the thighs and the hips, and its depth is the depth of its
 * deepest corner in the body (`closedDepth()`). A corner in the body gives the gap 0. The front of
 * the knees is the front of the skin of the thighs. The ends of the bow are the two corners of the
 * `bow` bone that are farthest apart, and the frog is the end nearer to the right paw.
 *
 * @param posed The posed skeleton of the player.
 * @param body The closed surface of the body, such as the obstacle `body` of the sweep.
 * @returns The lap rest, or `null` for a player with no corner of the `instrument` bone.
 */
export function lapRest(posed: PosedSkeleton, body: ClosedSurface): LapRest | null {
  const { bones } = posed.model.mesh;
  const instrument = boneIndex('instrument');
  const bowBone = boneIndex('bow');
  const lap = new Set(LAP_BONES.map(boneIndex));
  const thighs = new Set(THIGH_BONES.map(boneIndex));
  const corner = (c: number): Vector3 => new Vector3(...posedCorner(posed, c));
  const held: Vector3[] = [];
  const bow: Vector3[] = [];
  const skin: Triangle[] = [];
  let kneeFront = Infinity;
  for (let c = 0; c + 2 < bones.length; c += 3) {
    const bone = bones[c] ?? -1;
    if (bone === instrument) {
      held.push(corner(c), corner(c + 1), corner(c + 2));
    } else if (bone === bowBone) {
      bow.push(corner(c), corner(c + 1), corner(c + 2));
    } else if (lap.has(bone)) {
      const t = new Triangle(corner(c), corner(c + 1), corner(c + 2));
      skin.push(t);
      if (thighs.has(bone)) {
        kneeFront = Math.min(kneeFront, t.a.z, t.b.z, t.c.z);
      }
    }
  }
  if (held.length === 0) {
    return null;
  }

  const low = Math.min(...held.map((p) => p.y));
  const end = held.filter((p) => p.y < low + END_HEIGHT);
  const endDepth = closedDepth(end, body).depth;
  const near = new Vector3();
  let endGap = endDepth > 0 ? 0 : Infinity;
  for (const p of endGap > 0 ? end : []) {
    for (const t of skin) {
      endGap = Math.min(endGap, t.closestPointToPoint(p, near).distanceTo(p));
    }
  }

  const paw = posed.frames[boneIndex('handR')]?.position ?? new Vector3();
  const ends = bowEnds(bow, paw);
  return {
    endGap,
    endDepth,
    bow: ends ? { tipRise: ends.tip.y - ends.frog.y, tipPast: kneeFront - ends.tip.z } : null,
  };
}

/** The largest value of a measure of the lap rest over the rest samples, with its sample. */
export interface LapWorst {
  /** The value, in meters. */
  readonly value: number;
  /** The demo, the player, and the wall time of the sample, such as `beethoven-8 violinist 3 (fox-red, chair) wall 10 s`. */
  readonly sample: string;
}

/** The largest value of each measure of the lap rest over the rest samples of a run. */
export interface LapWorsts {
  /** The largest gap of the lower end of the instrument to the skin of the thighs. */
  readonly endGap: LapWorst;
  /** The deepest corner of the lower end in the body. */
  readonly endDepth: LapWorst;
  /** The highest tip of the bow above the frog, or `null` with no bow. */
  readonly tipRise: LapWorst | null;
  /** The tip of the bow farthest past the knees, or `null` with no bow. */
  readonly tipPast: LapWorst | null;
}

/** The lap rest of one rest sample, with its name. */
export interface LapSample {
  /** The demo, the player, and the wall time, as {@link LapWorst.sample}. */
  readonly sample: string;
  /** The lap rest of the sample. */
  readonly rest: LapRest;
}

/**
 * Finds the largest value of each measure of the lap rest over the rest samples. Of two samples
 * with the same value, the first stays.
 *
 * @param samples The lap rest of each sample.
 * @returns The largest values, or `null` with no sample.
 */
export function lapWorsts(samples: readonly LapSample[]): LapWorsts | null {
  const largest = (value: (rest: LapRest) => number | undefined): LapWorst | null => {
    let worst: LapWorst | null = null;
    for (const { sample, rest } of samples) {
      const v = value(rest);
      if (v !== undefined && (!worst || v > worst.value)) {
        worst = { value: v, sample };
      }
    }
    return worst;
  };
  const endGap = largest((rest) => rest.endGap);
  const endDepth = largest((rest) => rest.endDepth);
  if (!endGap || !endDepth) {
    return null;
  }
  return {
    endGap,
    endDepth,
    tipRise: largest((rest) => rest.bow?.tipRise),
    tipPast: largest((rest) => rest.bow?.tipPast),
  };
}

/**
 * Measures the lap rest of each seated body of a role ({@link lapRest}) in the rest pose before the
 * first play of each demo, at each wall time of {@link REST_WALLS}, with the holds of now. A
 * standing player, such as a soloist, has no lap and does not count.
 *
 * @param role The role.
 * @param demos The demos. A demo with no seated body of the role adds nothing.
 * @param body The obstacle of the body of the sweep of the role.
 * @returns The largest value of each measure ({@link lapWorsts}), or `null` with no sample.
 */
export function probeLaps(
  role: RoleSource,
  demos: readonly DemoFile[],
  body: SweepObstacle,
): LapWorsts | null {
  const samples: LapSample[] = [];
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes);
    const audible = allAudible(scene.score);
    const buffer = createScenePose(scene.plan);
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const id = demo.file.replace(/\.mid$/, '');
    for (const { index, model } of roleBodies(role, scene)) {
      const cast = index === null ? null : scene.layout.players[index]?.cast;
      if (index === null || !cast || cast.support === 'stand') {
        continue;
      }
      for (const wall of REST_WALLS) {
        const pose = poseAt(scene.plan, start, wall, NOT_STARTED, audible, buffer).players[index];
        if (!pose) {
          continue;
        }
        const posed = poseSkeleton(model, pose);
        const rest = lapRest(posed, body.surface(posed));
        if (rest) {
          samples.push({
            sample: `${id} player ${index} (${cast.species}, ${cast.support}) wall ${wall} s`,
            rest,
          });
        }
      }
    }
  }
  return lapWorsts(samples);
}
