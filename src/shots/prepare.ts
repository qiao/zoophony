import { insideBeam } from '../models/beam.ts';
import { ModelCache } from '../models/model-cache.ts';
import type { SceneLayout } from '../models/layout.ts';
import type { Vec3 } from '../models/tuples.ts';
import { lastAtOrBefore } from '../pose/blend.ts';
import { mulberry32 } from '../pose/random.ts';
import type { Score } from '../score/types.ts';
import { angleDifference, keyDistance, viewAngle, writeKeyPosition } from './camera-keys.ts';
import { CLEARANCE, bodyBoxes, cameraClear, prepareClearance, segmentClear } from './clearance.ts';
import type { ClearBox, Segment, StageClearance } from './clearance.ts';
import { barLengthAt, beatLengthAt, entriesNear, musicIn, prepareMusic } from './music.ts';
import type { ScoreMusic, WindowMusic } from './music.ts';
import { conductorSubject, prepareSubjects, sectionSubject, soloSubject } from './subjects.ts';
import type { SectionGroup, StageSubjects, Subject } from './subjects.ts';
import type { Shot, ShotKey, ShotKind, ShotPlan } from './types.ts';

/** Degrees to radians. */
const DEG = Math.PI / 180;

/**
 * The seed of the shot plan of the app. A fixed seed gives each demo the same film on each visit
 * (design 5.6). The screenshot script uses it too.
 */
export const SHOT_SEED = 1;

/** The times of the shots, in song seconds (design 5.6). */
export const SHOT_TIMES = {
  /** The shortest shot. */
  minSec: 4,
  /** The longest conductor, section, or solo shot. */
  maxSec: 14,
  /** The longest wide or high shot. */
  maxWideSec: 18,
  /** The range of the seeded wanted length of a conductor, section, or solo shot. */
  closeWanted: [6.5, 9.5],
  /** The range of the seeded wanted length of a wide or high shot. */
  wideWanted: [9, 12],
  /** A cut loses 1 for each this many seconds between its length and the wanted length. */
  lengthScale: 3,
  /** The last shot starts on the last downbeat at least this long before the song end. */
  lastLeadSec: 8,
  /**
   * A wide or high shot needs this many other shots since the last wide or high shot, or since
   * the start. Thus the wide and high shots are at most 25% of the shots.
   */
  wideSpacing: 3,
  /** The choice of a subject reads the music of this window after the cut. */
  choiceWindowSec: 8,
} as const;

/** The bonus of a downbeat as a cut point (design 5.6). */
export const CUT_BONUS = {
  /** A bar index that is a multiple of 4: a phrase line. */
  phrase: 1.0,
  /** A bar index that is a multiple of 2. */
  halfPhrase: 0.4,
  /** An entry within a quarter of a bar of the downbeat. */
  entry: 1.5,
} as const;

/** The weights of the choice of the next shot (design 5.6). */
export const CHOICE_WEIGHTS = {
  wide: 0.8,
  wideTutti: 2.2,
  high: 0.3,
  highTutti: 1.6,
  /** For a high shot with 6 or more active seats. */
  highBusy: 0.4,
  conductor: 1.1,
  /** For a conductor shot with 5 or more active seats. */
  conductorBusy: 0.5,
  section: 0.6,
  sectionShare: 3,
  sectionEntry: 1.5,
  sectionTutti: -0.8,
  solo: 0.2,
  soloShare: 2.5,
  /** For a solo shot with 3 or fewer active seats, or at an entry of any seat. */
  soloExposed: 1.2,
  soloEntry: 1.2,
  /** For a solo shot of the piano or the harp. */
  soloFeature: 0.4,
  soloTutti: -1.0,
  /** For a subject in the last 4 shots. */
  recent: -1.6,
  /** For each earlier use of a section or solo subject. */
  reuse: -0.5,
  /** The seeded jitter goes from -0.25 to 0.25. */
  jitter: 0.5,
} as const;

/** The blend rule of design 5.6. */
export const BLEND_RULES = {
  /** A beat of this length or longer is slow music. */
  slowBeatSec: 0.75,
  /** A mean loudness of this value or less is soft music. */
  softLoudness: 0.35,
  /** The shortest and the longest blend. A blend lasts one beat. */
  minSec: 0.5,
  maxSec: 1.2,
  /** The two cameras are less than this many stage sides apart. */
  nearInSides: 0.35,
} as const;

/** The jump cut rule: neighbor shots differ by this view angle or this ratio of size. */
export const JUMP_CUT = { angle: 30 * DEG, sizeRatio: 1.5 } as const;

/**
 * The search of a clear camera (design 5.6): the wanted azimuth, then these steps to each side,
 * then the same azimuths higher.
 */
export const KEY_SEARCH = {
  azimuthSteps: [0, 12, 24, 36, 48, 60, 75].map((d) => d * DEG),
  elevationSteps: [0, 8, 16, 24, 32, 40].map((d) => d * DEG),
  /** The camera stays within this angle of the front of the subject. */
  maxFromFront: 75 * DEG,
  /** The search stops at this elevation. */
  maxElevation: 60 * DEG,
} as const;

/**
 * The aspects that the planner tests: the nearest camera (each view as wide as it is tall, or
 * wider) and the farthest camera (a phone in portrait, 390 × 844).
 */
export const TEST_ASPECTS = { near: 1, far: 0.46 } as const;

/** The samples of a move that the planner tests, as parts of the move. */
const MOVE_SAMPLES = [0, 0.25, 0.5, 0.75, 1] as const;

/**
 * The aspects of the beam test: a desktop, a tablet in portrait, and a phone in portrait. Each
 * view has its own camera on the ray of the key, so each one gets its own test.
 */
const BEAM_ASPECTS = [TEST_ASPECTS.near, 0.7, TEST_ASPECTS.far] as const;

/** The smallest distance of a camera from the surface of the cone of the beam, in meters. */
export const BEAM_MARGIN = 0.3;

/**
 * Tells on which side of the cone of the visible beam a camera is (design 4.5, 5.6).
 *
 * @param stageSide The stage side `S`.
 * @param point The camera.
 * @returns `inside` or `outside` with a margin of {@link BEAM_MARGIN}, else `edge`.
 */
function beamSide(stageSide: number, point: Vec3): 'inside' | 'outside' | 'edge' {
  if (insideBeam(stageSide, point, BEAM_MARGIN)) {
    return 'inside';
  }
  return insideBeam(stageSide, point, -BEAM_MARGIN) ? 'edge' : 'outside';
}

/**
 * Mixes two points.
 *
 * @param a The point at 0.
 * @param b The point at 1.
 * @param t The weight of `b`.
 * @returns The mixed point.
 */
function mixPoints(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** One of the four wide shots: the azimuth and the elevation in degrees, and the zoom. */
interface WideVariant {
  readonly azimuth: number;
  readonly elevation: number;
  readonly zoom: number;
}

/**
 * The wide shots (design 5.6). The first one is the default view of design 4.5. The frontal shot
 * needs a zoom of about 0.8, because the default distance fits the corner view. With the zoom 0.8
 * and the push-in, a stage corner left the frame by 0.3% at the aspect 1, so the zoom is 0.82.
 */
export const WIDE_VARIANTS: readonly WideVariant[] = [
  { azimuth: 30, elevation: 28, zoom: 1 },
  { azimuth: -28, elevation: 24, zoom: 0.95 },
  { azimuth: 0, elevation: 22, zoom: 0.82 },
  { azimuth: 38, elevation: 34, zoom: 1 },
];

/** The camera values of each kind of shot, in degrees and factors (design 5.6). */
export const SHOT_KEYS = {
  wide: { fov: 30, pushIn: 0.88, arc: 6 },
  high: { fov: 30, zoom: 0.6, azimuth: [15, 40], elevation: [58, 62], arc: 12, rise: 4 },
  conductor: { fov: 26, offset: [10, 22], elevation: 18, pushIn: 0.85 },
  section: { fov: 30, offset: [8, 22], elevation: 18, backRise: 24, pushIn: 0.92, arc: 6 },
  solo: { fov: 24, offset: [20, 40], elevation: 14, backRise: 26, pushIn: 0.9, arc: 4 },
  /** The last shot pulls out from this zoom to 1 in the default view. */
  lastPullOut: 0.85,
} as const;

/** The size of a wide or high shot for the jump cut rule, in stage sides. */
const WIDE_SIZE_IN_SIDES = 0.7;

/** A candidate for the next shot. */
interface Candidate {
  readonly kind: ShotKind;
  /** The kind and the subject, for example `solo 3`. */
  readonly id: string;
  /** The group of a section or solo shot, else `null`. */
  readonly group: SectionGroup | null;
  /** The seats of a section shot, with the most activity first, or the seat of a solo shot. */
  readonly seats: readonly number[];
  readonly score: number;
}

/** A shot of the plan, with the data of the choice of the next shot. */
interface PlannedShot {
  readonly shot: Shot;
  readonly id: string;
  readonly group: SectionGroup | null;
  /** The size of the subject for the jump cut rule, in meters. */
  readonly size: number;
  /** The boxes that hold the target. */
  readonly held: ReadonlySet<ClearBox>;
}

/** The data of the planner of one score. */
interface Planner {
  readonly music: ScoreMusic;
  readonly subjects: StageSubjects;
  readonly clearance: StageClearance;
  readonly stageSide: number;
  readonly random: () => number;
  /** The start of the last shot, in song seconds. */
  readonly lastStart: number;
  readonly planned: PlannedShot[];
  /** The number of shots since the last wide or high shot, or since the start. */
  sinceWide: number;
}

/** The keys and the subject of a new shot, before its times. */
interface Framing {
  readonly target: Vec3;
  readonly radius: number;
  readonly from: ShotKey;
  readonly to: ShotKey;
  readonly seats: readonly number[];
  readonly held: ReadonlySet<ClearBox>;
}

/**
 * Gives a seeded number in a range.
 *
 * @param random The seeded generator.
 * @param range The lowest and the highest value.
 * @returns A number in the range.
 */
function between(random: () => number, range: readonly [number, number]): number {
  return range[0] + (range[1] - range[0]) * random();
}

/**
 * Gives a seeded sign.
 *
 * @param random The seeded generator.
 * @returns 1 or -1.
 */
function signOf(random: () => number): number {
  return random() < 0.5 ? -1 : 1;
}

/**
 * Mixes two keys.
 *
 * @param a The key at 0.
 * @param b The key at 1.
 * @param u The part of the move, from 0 to 1.
 * @returns The mixed key.
 */
export function mixKeys(a: ShotKey, b: ShotKey, u: number): ShotKey {
  return {
    azimuth: a.azimuth + (b.azimuth - a.azimuth) * u,
    elevation: a.elevation + (b.elevation - a.elevation) * u,
    zoom: a.zoom + (b.zoom - a.zoom) * u,
    fov: a.fov + (b.fov - a.fov) * u,
  };
}

/**
 * Calculates the camera position of a key.
 *
 * @param stageSide The stage side `S`.
 * @param target The target.
 * @param radius The radius of the subject, or 0 for a wide or a high shot.
 * @param key The key.
 * @param aspect The aspect of the view.
 * @returns The position.
 */
export function keyPosition(
  stageSide: number,
  target: Vec3,
  radius: number,
  key: ShotKey,
  aspect: number,
): Vec3 {
  const out: [number, number, number] = [0, 0, 0];
  const distance = keyDistance(stageSide, radius, key, aspect);
  writeKeyPosition(target, key.azimuth, key.elevation, distance, out);
  return out;
}

/**
 * Tells if a move keeps its camera clear (design 5.6) at the samples of the move, from the
 * nearest to the farthest camera. The camera also stays inside or outside the cone of the visible
 * beam for the full move, because the beam draws only its outer faces.
 *
 * @param planner The planner.
 * @param target The target.
 * @param radius The radius of the subject.
 * @param from The key at the start.
 * @param to The key at the end.
 * @param held The boxes of the body of the subject.
 * @returns True if the move is clear.
 */
function moveClear(
  planner: Planner,
  target: Vec3,
  radius: number,
  from: ShotKey,
  to: ShotKey,
  held: ReadonlySet<ClearBox>,
): boolean {
  const S = planner.stageSide;
  // A camera that crosses the cone of the beam in a shot sees the beam come or go at once. For
  // each tested aspect, the camera stays on one side for the full move, with a margin.
  const sides = BEAM_ASPECTS.map((aspect) =>
    beamSide(S, keyPosition(S, target, radius, from, aspect)),
  );
  if (sides.includes('edge')) {
    return false;
  }
  return MOVE_SAMPLES.every((u) => {
    const key = mixKeys(from, to, u);
    const near = keyPosition(S, target, radius, key, TEST_ASPECTS.near);
    const far = keyPosition(S, target, radius, key, TEST_ASPECTS.far);
    const across = BEAM_ASPECTS.some(
      (aspect, i) => beamSide(S, keyPosition(S, target, radius, key, aspect)) !== sides[i],
    );
    if (across) {
      return false;
    }
    return cameraClear(planner.clearance, target, near, far, held);
  });
}

/**
 * Tells if a new shot is a jump cut after the previous shot (design 5.6): the view turns less
 * than 30°, and the size of the subject changes less than 1.5 times.
 *
 * @param previous The previous shot.
 * @param from The first key of the new shot.
 * @param size The size of the new subject.
 * @returns True for a jump cut.
 */
function jumpCut(previous: PlannedShot | undefined, from: ShotKey, size: number): boolean {
  if (!previous) {
    return false;
  }
  const ratio = Math.max(size, previous.size) / Math.max(1e-6, Math.min(size, previous.size));
  return viewAngle(previous.shot.to, from) < JUMP_CUT.angle && ratio < JUMP_CUT.sizeRatio;
}

/** The move of a close shot. */
interface CloseMove {
  readonly wantedAzimuth: number;
  readonly elevation: number;
  /** The arc of the move, in radians. Its sign turns when the end leaves the front range. */
  readonly arc: number;
  readonly pushIn: number;
  readonly fov: number;
}

/**
 * Searches a clear camera for a close shot (design 5.6): the wanted azimuth, then ±12° to ±75°,
 * then the same azimuths 8° to 40° higher, up to 60°. The camera stays within 75° of the front
 * of the subject. A camera that makes a jump cut does not count.
 *
 * @param planner The planner.
 * @param subject The subject.
 * @param move The move of the shot.
 * @returns The framing, or `null` with no clear camera.
 */
function searchClose(planner: Planner, subject: Subject, move: CloseMove): Framing | null {
  const held = bodyBoxes(planner.clearance, subject.target);
  const previous = planner.planned.at(-1);
  const s = KEY_SEARCH;
  for (const rise of s.elevationSteps) {
    const elevation = move.elevation + rise;
    if (elevation > s.maxElevation + 1e-9) {
      break;
    }
    for (const step of s.azimuthSteps) {
      for (const side of step === 0 ? [1] : [1, -1]) {
        const azimuth = move.wantedAzimuth + side * step;
        if (Math.abs(angleDifference(azimuth, subject.front)) > s.maxFromFront) {
          continue;
        }
        let arc = move.arc;
        if (Math.abs(angleDifference(azimuth + arc, subject.front)) > s.maxFromFront) {
          arc = -arc;
        }
        const from: ShotKey = { azimuth, elevation, zoom: 1, fov: move.fov };
        const to: ShotKey = {
          azimuth: azimuth + arc,
          elevation,
          zoom: move.pushIn,
          fov: move.fov,
        };
        if (jumpCut(previous, from, subject.radius)) {
          continue;
        }
        if (moveClear(planner, subject.target, subject.radius, from, to, held)) {
          return {
            target: subject.target,
            radius: subject.radius,
            from,
            to,
            seats: subject.seats,
            held,
          };
        }
      }
    }
  }
  return null;
}

/**
 * Makes the framing of a wide shot: one of the four variants, with a push-in or an arc.
 *
 * @param planner The planner.
 * @returns The framing.
 */
function wideFraming(planner: Planner): Framing {
  const { random } = planner;
  const variant = WIDE_VARIANTS[Math.floor(random() * WIDE_VARIANTS.length)] ?? WIDE_VARIANTS[0];
  const k = SHOT_KEYS.wide;
  const from: ShotKey = {
    azimuth: (variant?.azimuth ?? 30) * DEG,
    elevation: (variant?.elevation ?? 28) * DEG,
    zoom: variant?.zoom ?? 1,
    fov: k.fov,
  };
  const to: ShotKey =
    random() < 0.5
      ? { ...from, zoom: from.zoom * k.pushIn }
      : { ...from, azimuth: from.azimuth + signOf(random) * k.arc * DEG };
  return { target: [0, 0, 0], radius: 0, from, to, seats: [], held: new Set() };
}

/**
 * Makes the framing of a high shot: a seeded azimuth to one side and an elevation of 58° to 62°,
 * with an arc of 12° and a rise of 4°.
 *
 * @param planner The planner.
 * @returns The framing.
 */
function highFraming(planner: Planner): Framing {
  const { random } = planner;
  const k = SHOT_KEYS.high;
  const azimuth = signOf(random) * between(random, k.azimuth) * DEG;
  const from: ShotKey = {
    azimuth,
    elevation: between(random, k.elevation) * DEG,
    zoom: k.zoom,
    fov: k.fov,
  };
  const to: ShotKey = {
    ...from,
    azimuth: azimuth - Math.sign(azimuth) * k.arc * DEG,
    elevation: from.elevation + k.rise * DEG,
  };
  return {
    target: [0, 0, -0.05 * planner.stageSide],
    radius: 0,
    from,
    to,
    seats: [],
    held: new Set(),
  };
}

/**
 * Makes the framing of a candidate, with a clear camera.
 *
 * @param planner The planner.
 * @param candidate The candidate.
 * @returns The framing, or `null` with no clear camera.
 */
function framingOf(planner: Planner, candidate: Candidate): Framing | null {
  const { random, subjects } = planner;
  switch (candidate.kind) {
    case 'wide':
      return wideFraming(planner);
    case 'high':
      return highFraming(planner);
    case 'conductor': {
      const k = SHOT_KEYS.conductor;
      const subject = conductorSubject(subjects);
      return searchClose(planner, subject, {
        wantedAzimuth: subject.front + signOf(random) * between(random, k.offset) * DEG,
        elevation: k.elevation * DEG,
        arc: 0,
        pushIn: k.pushIn,
        fov: k.fov,
      });
    }
    case 'section': {
      const k = SHOT_KEYS.section;
      const subject = sectionSubject(subjects, candidate.seats);
      if (!subject) {
        return null;
      }
      return searchClose(planner, subject, {
        wantedAzimuth: subject.front + signOf(random) * between(random, k.offset) * DEG,
        elevation: (k.elevation + k.backRise * subject.back) * DEG,
        arc: signOf(random) * k.arc * DEG,
        pushIn: k.pushIn,
        fov: k.fov,
      });
    }
    case 'solo': {
      const k = SHOT_KEYS.solo;
      const subject = soloSubject(subjects, candidate.seats[0] ?? -1);
      if (!subject) {
        return null;
      }
      return searchClose(planner, subject, {
        wantedAzimuth: subject.front + signOf(random) * between(random, k.offset) * DEG,
        elevation: (k.elevation + k.backRise * subject.back) * DEG,
        arc: signOf(random) * k.arc * DEG,
        pushIn: k.pushIn,
        fov: k.fov,
      });
    }
  }
}

/**
 * Lists the candidates for the shot at a cut, with their scores (design 5.6).
 *
 * @param planner The planner.
 * @param cut The cut, in song seconds.
 * @param window The music of the window after the cut.
 * @returns The candidates, with the rules of the choice applied, best first.
 */
function candidatesAt(planner: Planner, cut: number, window: WindowMusic): Candidate[] {
  const w = CHOICE_WEIGHTS;
  const { music, subjects, random, planned } = planner;
  const entering = new Set(entriesNear(music, cut, barLengthAt(music, cut) / 4));
  const total = Math.max(1e-9, window.totalActivity);
  const tutti = window.tutti;
  const list: Candidate[] = [];
  const add = (
    kind: ShotKind,
    id: string,
    group: SectionGroup | null,
    seats: number[],
    score: number,
  ): void => {
    list.push({ kind, id, group, seats, score });
  };
  add('wide', 'wide', null, [], w.wide + (tutti ? w.wideTutti : 0));
  add(
    'high',
    'high',
    null,
    [],
    w.high + (tutti ? w.highTutti : 0) + (window.activeCount >= 6 ? w.highBusy : 0),
  );
  add(
    'conductor',
    'conductor',
    null,
    [],
    w.conductor + (window.activeCount >= 5 ? w.conductorBusy : 0),
  );
  const groups = new Map<SectionGroup, number[]>();
  for (const [seat, players] of subjects.seats.entries()) {
    if (!players || !(window.active[seat] || entering.has(seat))) {
      continue;
    }
    const seats = groups.get(players.group) ?? [];
    seats.push(seat);
    groups.set(players.group, seats);
    const share = (window.activity[seat] ?? 0) / total;
    const exposed = window.activeCount <= 3 || entering.size > 0;
    const feature = players.group === 'piano' || players.group === 'harp';
    add(
      'solo',
      `solo ${seat}`,
      players.group,
      [seat],
      w.solo +
        w.soloShare * share +
        (exposed ? w.soloExposed : 0) +
        (entering.has(seat) ? w.soloEntry : 0) +
        (feature ? w.soloFeature : 0) +
        (tutti ? w.soloTutti : 0),
    );
  }
  for (const [group, seats] of groups) {
    const activity = seats.reduce((sum, s) => sum + (window.activity[s] ?? 0), 0);
    const sorted = seats.toSorted(
      (a, b) => (window.activity[b] ?? 0) - (window.activity[a] ?? 0) || a - b,
    );
    add(
      'section',
      `section ${group}`,
      group,
      sorted,
      w.section +
        w.sectionShare * (activity / total) +
        (seats.some((s) => entering.has(s)) ? w.sectionEntry : 0) +
        (tutti ? w.sectionTutti : 0),
    );
  }

  const previous = planned.at(-1);
  const recent = new Set(planned.slice(-4).map((p) => p.id));
  const uses = new Map<string, number>();
  for (const p of planned) {
    uses.set(p.id, (uses.get(p.id) ?? 0) + 1);
  }
  const wideRoom = planner.lastStart - cut >= SHOT_TIMES.minSec + roomBeforeLast(0);
  const scored: Candidate[] = [];
  for (const candidate of list) {
    const close = candidate.kind === 'section' || candidate.kind === 'solo';
    const wideKind = candidate.kind === 'wide' || candidate.kind === 'high';
    // Rule 1: no repeat of the kind and the subject.
    if (previous && candidate.id === previous.id) {
      continue;
    }
    // Rule 2: no section or solo shot of the group of the previous shot.
    if (close && previous?.group === candidate.group) {
      continue;
    }
    // Rule 3: three other shots between two wide or high shots, also from the start, and room for
    // them before the last shot. Thus the wide and high shots are at most 25% of the shots.
    if (wideKind && (planner.sinceWide < SHOT_TIMES.wideSpacing || !wideRoom)) {
      continue;
    }
    let score = candidate.score;
    // Rule 4: variety.
    if (recent.has(candidate.id)) {
      score += w.recent;
    }
    if (close) {
      score += w.reuse * (uses.get(candidate.id) ?? 0);
    }
    // Rule 5: seeded jitter.
    score += (random() - 0.5) * w.jitter;
    scored.push({ ...candidate, score });
  }
  return scored.toSorted((a, b) => b.score - a.score);
}

/**
 * Gives the time that a shot leaves before the start of the last shot, so that the last wide
 * shot also has three other shots since the last wide or high shot.
 *
 * @param after The number of shots since the last wide or high shot, with this shot.
 * @returns The time in seconds, or 0 if the shot can end at the start of the last shot.
 */
function roomBeforeLast(after: number): number {
  const missing = SHOT_TIMES.wideSpacing - after;
  return missing <= 0 ? 0 : missing * (SHOT_TIMES.minSec + 1);
}

/**
 * Chooses the end of a shot (design 5.6): the best downbeat from 4 s to 14 s after the start (18 s
 * for a wide or high shot), by the distance from the wanted length, the phrase lines, and the
 * entries. With no downbeat in the window, the cut falls on the beat nearest to the wanted time.
 * Each end leaves room for the shots before the last shot. A short song that has no such room
 * keeps only the window.
 *
 * @param planner The planner.
 * @param start The start of the shot.
 * @param kind The kind of the shot.
 * @returns The end of the shot, in song seconds.
 */
function chooseEnd(planner: Planner, start: number, kind: ShotKind): number {
  const t = SHOT_TIMES;
  const { music, random, lastStart } = planner;
  const wideKind = kind === 'wide' || kind === 'high';
  const wanted = start + between(random, wideKind ? t.wideWanted : t.closeWanted);
  const longest = start + (wideKind ? t.maxWideSec : t.maxSec);
  const shortest = start + t.minSec;
  const room = roomBeforeLast(wideKind ? 0 : planner.sinceWide + 1);
  for (const strict of [true, false]) {
    const fits = (time: number): boolean => {
      if (time < shortest - 1e-9 || time > longest + 1e-9) {
        return false;
      }
      if (Math.abs(time - lastStart) < 1e-9) {
        return room === 0 || !strict;
      }
      return time <= lastStart - Math.max(t.minSec, strict ? room : 0) + 1e-9;
    };
    let best = Number.NaN;
    let bestScore = -Infinity;
    const first = Math.max(0, lastAtOrBefore(music.downbeats, shortest - 1e-6) + 1);
    for (let bar = first; bar < music.downbeats.length; bar++) {
      const time = music.downbeats[bar] ?? 0;
      if (time > longest + 1e-9) {
        break;
      }
      if (!fits(time)) {
        continue;
      }
      let score = -Math.abs(time - wanted) / t.lengthScale;
      if (bar % 4 === 0) {
        score += CUT_BONUS.phrase;
      } else if (bar % 2 === 0) {
        score += CUT_BONUS.halfPhrase;
      }
      if (entriesNear(music, time, barLengthAt(music, time) / 4).length > 0) {
        score += CUT_BONUS.entry;
      }
      if (score > bestScore) {
        bestScore = score;
        best = time;
      }
    }
    if (!Number.isNaN(best)) {
      return best;
    }
    // No downbeat fits: the beat nearest to the wanted time.
    for (const time of music.beats) {
      if (fits(time) && (Number.isNaN(best) || Math.abs(time - wanted) < Math.abs(best - wanted))) {
        best = time;
      }
    }
    if (!Number.isNaN(best)) {
      return best;
    }
  }
  return lastStart - start <= (wideKind ? t.maxWideSec : t.maxSec)
    ? lastStart
    : Math.min(wanted, lastStart - t.minSec);
}

/**
 * Tells if two neighbor shots blend (design 5.6): slow or soft music, two close shots, cameras
 * less than `0.35 × S` apart, and a clear straight path between them that stays on one side of
 * the cone of the beam.
 *
 * @param planner The planner.
 * @param previous The previous shot.
 * @param next The framing of the next shot.
 * @param kind The kind of the next shot.
 * @param window The music after the cut.
 * @param cut The cut, in song seconds.
 * @returns The blend time in seconds, or 0 for a hard cut.
 */
function blendOf(
  planner: Planner,
  previous: PlannedShot,
  next: Framing,
  kind: ShotKind,
  window: WindowMusic,
  cut: number,
): number {
  const r = BLEND_RULES;
  const beat = beatLengthAt(planner.music, cut);
  if (beat < r.slowBeatSec && window.meanLoudness > r.softLoudness) {
    return 0;
  }
  const close = (k: ShotKind): boolean => k === 'conductor' || k === 'section' || k === 'solo';
  if (!close(previous.shot.kind) || !close(kind)) {
    return 0;
  }
  const S = planner.stageSide;
  const held = new Set([...previous.held, ...next.held]);
  for (const aspect of [TEST_ASPECTS.near, TEST_ASPECTS.far]) {
    const a = keyPosition(S, previous.shot.target, previous.shot.radius, previous.shot.to, aspect);
    const b = keyPosition(S, next.target, next.radius, next.from, aspect);
    // The distance rule reads the cameras of a desktop view. A phone in portrait moves both
    // cameras out on their rays.
    if (
      aspect === TEST_ASPECTS.near &&
      Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) >= r.nearInSides * S
    ) {
      return 0;
    }
    if (!pathClear(planner.clearance, a, b, previous.shot.target, next.target, held)) {
      return 0;
    }
    const side = beamSide(S, a);
    const crosses =
      side === 'edge' || MOVE_SAMPLES.some((u) => beamSide(S, mixPoints(a, b, u)) !== side);
    if (crosses) {
      return 0;
    }
  }
  return Math.min(r.maxSec, Math.max(r.minSec, beat));
}

/**
 * Tells if the straight path of a blend is clear: each point of it keeps its distances, and sees
 * its target.
 *
 * @param clearance The obstacles.
 * @param a The camera at the start.
 * @param b The camera at the end.
 * @param targetA The target at the start.
 * @param targetB The target at the end.
 * @param held The boxes of the bodies of the two subjects.
 * @returns True if the path is clear.
 */
export function pathClear(
  clearance: StageClearance,
  a: Vec3,
  b: Vec3,
  targetA: Vec3,
  targetB: Vec3,
  held: ReadonlySet<ClearBox>,
): boolean {
  if (Math.min(a[1], b[1]) < CLEARANCE.height) {
    return false;
  }
  const segment: Segment = { ax: a[0], ay: a[1], az: a[2], bx: b[0], by: b[1], bz: b[2] };
  if (!segmentClear(clearance, segment, 'clearance', held)) {
    return false;
  }
  return MOVE_SAMPLES.every((u) => {
    const p: Vec3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    const t: Vec3 = [
      targetA[0] + (targetB[0] - targetA[0]) * u,
      targetA[1] + (targetB[1] - targetA[1]) * u,
      targetA[2] + (targetB[2] - targetA[2]) * u,
    ];
    return cameraClear(clearance, t, p, p, held);
  });
}

/**
 * Adds a shot to the plan.
 *
 * @param planner The planner.
 * @param candidate The kind and the subject.
 * @param framing The keys and the subject.
 * @param times The start, the end, the end of the move, and the blend.
 */
function addShot(
  planner: Planner,
  candidate: Pick<Candidate, 'kind' | 'id' | 'group'>,
  framing: Framing,
  times: Pick<Shot, 'startSec' | 'endSec' | 'moveEndSec' | 'blendSec'>,
): void {
  const { kind } = candidate;
  const wideKind = kind === 'wide' || kind === 'high';
  planner.planned.push({
    shot: {
      kind,
      ...times,
      seats: framing.seats,
      target: framing.target,
      radius: framing.radius,
      from: framing.from,
      to: framing.to,
    },
    id: candidate.id,
    group: candidate.group,
    size: wideKind ? WIDE_SIZE_IN_SIDES * planner.stageSide : framing.radius,
    held: framing.held,
  });
  planner.sinceWide = wideKind ? 0 : planner.sinceWide + 1;
}

/**
 * Finds the start of the last shot: the last downbeat at least 8 s before the song end, and at
 * least 4 s after the song start.
 *
 * @param music The music of the score.
 * @param durationSec The song length.
 * @returns The start, in song seconds.
 */
function lastStartOf(music: ScoreMusic, durationSec: number): number {
  const i = lastAtOrBefore(music.downbeats, durationSec - SHOT_TIMES.lastLeadSec);
  const time = music.downbeats[i];
  return time !== undefined && time >= SHOT_TIMES.minSec ? time : SHOT_TIMES.minSec;
}

/**
 * Calculates the shots of a score (design 5.6): the cut points, the subjects, and the clear
 * cameras. Pure: the same score, layout, and seed give the same plan.
 *
 * - The first shot shows the conductor from `-Infinity`, for the count-in and the first phrase.
 * - Each cut falls on a downbeat. A shot lasts 4 to 14 s, and a wide or high shot up to 18 s.
 * - The music after each cut selects its subject.
 * - The last shot is a wide shot that pulls out, and it holds after the song end.
 *
 * @param score The score.
 * @param layout The layout of the score, from `layoutScene()`.
 * @param seed The seed of the plan.
 * @param models The player models of the score, which the layout shares. A new cache by default.
 * @returns The plan for `cameraAt()`.
 */
export function prepareShots(
  score: Score,
  layout: SceneLayout,
  seed: number,
  models = new ModelCache(),
): ShotPlan {
  const music = prepareMusic(score);
  const planner: Planner = {
    music,
    subjects: prepareSubjects(score, layout, models),
    clearance: prepareClearance(layout, models),
    stageSide: layout.stageSide,
    random: mulberry32(seed),
    lastStart: lastStartOf(music, score.durationSec),
    planned: [],
    sinceWide: 0,
  };

  // The opening: the conductor for the count-in and the first phrase.
  const conductor = {
    kind: 'conductor',
    id: 'conductor',
    group: null,
    seats: [],
    score: 0,
  } as const;
  const opening = framingOf(planner, conductor);
  let cut = chooseEnd(planner, 0, opening ? 'conductor' : 'wide');
  if (opening) {
    addShot(planner, conductor, opening, {
      startSec: -Infinity,
      endSec: cut,
      moveEndSec: cut,
      blendSec: 0,
    });
  } else {
    addShot(planner, { kind: 'wide', id: 'wide', group: null }, wideFraming(planner), {
      startSec: -Infinity,
      endSec: cut,
      moveEndSec: cut,
      blendSec: 0,
    });
  }

  while (cut < planner.lastStart - 1e-9) {
    const window = musicIn(music, cut, cut + SHOT_TIMES.choiceWindowSec);
    let chosen: { candidate: Candidate; framing: Framing } | null = null;
    for (const candidate of candidatesAt(planner, cut, window)) {
      const framing = framingOf(planner, candidate);
      if (framing) {
        chosen = { candidate, framing };
        break;
      }
    }
    if (!chosen) {
      const candidate: Candidate = { kind: 'wide', id: 'wide', group: null, seats: [], score: 0 };
      chosen = { candidate, framing: wideFraming(planner) };
    }
    const { candidate, framing } = chosen;
    const previous = planner.planned.at(-1);
    const end = Math.min(chooseEnd(planner, cut, candidate.kind), planner.lastStart);
    addShot(planner, candidate, framing, {
      startSec: cut,
      endSec: end,
      moveEndSec: end,
      blendSec: previous ? blendOf(planner, previous, framing, candidate.kind, window, cut) : 0,
    });
    cut = end;
  }

  // The closing: the default view pulls out and holds after the song end.
  const k = SHOT_KEYS;
  const variant = WIDE_VARIANTS[0];
  const to: ShotKey = {
    azimuth: (variant?.azimuth ?? 30) * DEG,
    elevation: (variant?.elevation ?? 28) * DEG,
    zoom: 1,
    fov: k.wide.fov,
  };
  addShot(
    planner,
    { kind: 'wide', id: 'wide', group: null },
    {
      target: [0, 0, 0],
      radius: 0,
      from: { ...to, zoom: k.lastPullOut },
      to,
      seats: [],
      held: new Set(),
    },
    {
      startSec: cut,
      endSec: Infinity,
      moveEndSec: Math.max(score.durationSec, cut + SHOT_TIMES.minSec),
      blendSec: 0,
    },
  );
  const shots = planner.planned.map((p) => p.shot);
  return {
    stageSide: layout.stageSide,
    shots,
    starts: Float64Array.from(shots, (s) => s.startSec),
  };
}
