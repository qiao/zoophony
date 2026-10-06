import { insideBeam } from '../models/beam.ts';
import { ModelCache } from '../models/model-cache.ts';
import type { SceneLayout } from '../models/layout.ts';
import type { Vec3 } from '../models/tuples.ts';
import { lastAtOrBefore } from '../pose/blend.ts';
import { mulberry32 } from '../pose/random.ts';
import type { Score } from '../score/types.ts';
import { FREE_BEAM_FADE } from './beam-opacity.ts';
import { angleDifference, keyDistance, viewAngle, writeKeyPosition } from './camera-keys.ts';
import {
  CLEARANCE,
  bodyBoxes,
  cameraClear,
  prepareClearance,
  prepareSightLines,
  segmentClear,
  sightsClear,
  targetLineClear,
} from './clearance.ts';
import type { ClearBox, Segment, StageClearance, SubjectSightLines } from './clearance.ts';
import { FOREGROUND, foregroundHead, foregroundObject, inFrame } from './foreground.ts';
import { barLengthAt, beatLengthAt, entriesNear, musicIn, prepareMusic } from './music.ts';
import type { ScoreMusic, WindowMusic } from './music.ts';
import {
  SUBJECT_SIZES,
  activeMiddle,
  conductorBackSubject,
  conductorCloseSubject,
  prepareSubjects,
  sectionSubject,
  sideOf,
  sideSubject,
  soloSubject,
} from './subjects.ts';
import type { SectionGroup, StageSide, StageSubjects, Subject } from './subjects.ts';
import type { Shot, ShotKey, ShotKind, ShotPlan } from './types.ts';
import { DEFAULT_AZIMUTH, DEFAULT_ELEVATION, FIELD_OF_VIEW, defaultDistance } from './view.ts';

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
  closeWanted: [5, 12],
  /** The range of the seeded wanted length of a wide or high shot. */
  wideWanted: [9, 12],
  /** A cut loses 1 for each this many seconds between its length and the wanted length. */
  lengthScale: 3,
  /** The last shot starts on the last downbeat at least this long before the song end. */
  lastLeadSec: 8,
  /**
   * A wide or high shot needs this many other shots since the last wide or high shot, or since
   * the start. Thus the wide and high shots after the opening are at most 25% of the shots after
   * it.
   */
  wideSpacing: 3,
  /**
   * The time that each missing shot of rule 3 needs before the last shot. With the shortest
   * wanted length of a close shot then (6.5 s), the slow last bars of the Beethoven 8 demo left
   * room for two shots only, when no subject fitted at the last cuts.
   */
  roomSec: 9.5,
  /** The choice of a subject reads the music of this window after the cut. */
  choiceWindowSec: 8,
  /**
   * The longest time with no wide or high shot, from the end of one to the start of the next.
   * K. 315 showed no wide view from 10 s to 183 s (UX audit 2026-10-06, N6).
   */
  maxWideGapSec: 60,
  /** After this time with no wide or high shot, the wide and high candidates get a bonus. */
  wideDueSec: 45,
  /**
   * A conductor shot needs this many other shots since the last conductor shot, or since the
   * start. Thus the conductor shots are at most 17% of the shots. The Bach demo had 12 of 35.
   */
  conductorSpacing: 5,
  /** A side view needs this many other shots since the last side view, or since the start. */
  sideSpacing: 3,
} as const;

/** The bonus of a downbeat as a cut point (design 5.6). */
export const CUT_BONUS = {
  /** A bar index that is a multiple of 4: a phrase line. */
  phrase: 0.5,
  /** A bar index that is a multiple of 2. */
  halfPhrase: 0.2,
  /** An entry within a quarter of a bar of the downbeat. */
  entry: 1.5,
  /**
   * The beat in the middle of a bar with an even number of beats. Cuts only on downbeats gave
   * Bach 30 of 34 shots of 9.6 s, and K. 525 three lengths (UX audit 2026-10-06, N5).
   */
  midBar: -0.3,
  /**
   * A shot with the length of the previous shot. With a steady tempo, the cuts of the Bach demo
   * fell on whole bars of 2.4 s, and 4 lengths made 37 shots.
   */
  sameLength: -0.4,
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
  side: 0.4,
  /** For the share of the activity of the seats of the side. */
  sideShare: 2,
  /** For a side view with a seat that enters at the cut. */
  sideEntry: 0.8,
  /** For a side view with the piano, which view 03 of `scene.png` shows. */
  sidePiano: 0.6,
  section: 0.6,
  sectionShare: 3,
  sectionEntry: 1.5,
  sectionTutti: -0.8,
  /** For a section shot of a group with a seat that carries the lead. */
  sectionLead: 0.6,
  solo: 0.2,
  soloShare: 2.5,
  /** For a solo shot with 3 or fewer active seats, or at an entry of any seat. */
  soloExposed: 1.2,
  soloEntry: 1.2,
  /**
   * For a solo shot of a seat that carries the lead: the top line, or one loud seat over a quiet
   * accompaniment. The flute of the K. 315 concerto had its first solo shot at 94 s.
   */
  soloLead: 1.2,
  /** For a solo shot of the piano or the harp. */
  soloFeature: 0.4,
  soloTutti: -1.0,
  /** For a subject in the last 4 shots. */
  recent: -1.6,
  /** For each earlier use of a section or solo subject. */
  reuse: -0.5,
  /** The seeded jitter goes from -0.25 to 0.25. */
  jitter: 0.5,
  /**
   * For a wide or high shot after 45 s with no wide view. It is larger than the score of each
   * close candidate, so that a wide view comes at least every 60 s.
   */
  wideDue: 8,
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
  azimuthSteps: [0, 12, 24, 36, 48, 60, 72].map((d) => d * DEG),
  /**
   * The seeded offset of the wanted azimuth from the front is a multiple of this angle, in
   * degrees. Thus each camera of the search of a subject is on one grid around its front, and the
   * planner keeps the result of the tests of each camera for the later cuts.
   */
  azimuthGrid: 6,
  elevationSteps: [0, 8, 16, 24, 32, 40].map((d) => d * DEG),
  /** The camera stays within this angle of the front of the subject. */
  maxFromFront: 75 * DEG,
  /**
   * The camera of a side view stays within this angle of the front of its side, so that it shows
   * the side from the front, as views 03 and 04 of `scene.png`.
   */
  sideFromFront: 30 * DEG,
  /**
   * The camera of a section or solo shot stays at least this far in azimuth from the camera of
   * the last shot of the same subject. K. 315 showed the solo flute six times from almost the
   * same angle (UX audit 2026-10-06, N7).
   */
  repeatAngle: 20 * DEG,
  /**
   * The tops of the elevation bands of the search, plus the lift of a piano shot. At a cut, each
   * candidate first gets a search in the lowest band, and only then in the higher bands. The close shots of the back
   * rows looked down at 40° to 60°: the animals showed the tops of their heads, and the dark area
   * beside the stage filled 30% to 45% of the frame (UX audit 2026-10-06, N4).
   */
  bands: [30 * DEG, 40 * DEG, 50 * DEG],
  /**
   * A candidate with a score this near to the best score of the cut gets the second band before
   * the candidates with lower scores get it. Thus an entry or the lead keeps its shot.
   */
  bandMargin: 1,
} as const;

/**
 * The aspects that the planner tests: the nearest camera (each view as wide as it is tall, or
 * wider) and the farthest camera (a phone in portrait, 390 × 844).
 */
export const TEST_ASPECTS = { near: 1, far: 0.46 } as const;

/** The samples of a move that the planner tests, as parts of the move. */
const MOVE_SAMPLES = [0, 0.25, 0.5, 0.75, 1] as const;

/**
 * The samples between the samples of a move at which the planner also tests the line of sight
 * to the target: with the samples of the move, 1/16 of the move apart. A section camera of the
 * K. 525 demo crossed a box at 15/16 of its move, between two of the five samples.
 */
const LINE_SAMPLES = Array.from({ length: 17 }, (...[, i]) => i / 16).filter(
  (...[, i]) => i % 4 !== 0,
);

/** The samples of a move at which the planner tests the sight lines of the subject. */
const SIGHT_MOVE_SAMPLES = new Set<number>([0, 0.5, 1]);

/** The samples of the line of sight along a blend: 1/64 of the move apart. */
const SIGHT_SAMPLES = Array.from({ length: 65 }, (...[, i]) => i / 64);

/**
 * The aspects of the beam test: a desktop, a tablet in portrait, and a phone in portrait. Each
 * view has its own camera on the ray of the key, so each one gets its own test.
 */
const BEAM_ASPECTS = [TEST_ASPECTS.near, 0.7, TEST_ASPECTS.far] as const;

/** The smallest distance of a camera from the surface of the cone of the beam, in meters. */
export const BEAM_MARGIN = 0.3;

/**
 * A close camera stays nearer to the stage center than this part of the default distance. Free
 * mode fades the beam from 0.45 on (4.5), so a change to Free mode keeps the beam of the shot.
 */
export const CLOSE_DISTANCE_SHARE = FREE_BEAM_FADE[0] - 0.01;

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
 * The wide shots (design 5.6). The first one is the default view of design 4.5. The zoom is a
 * factor of the default view, and it keeps each player in the frame of a landscape view.
 */
export const WIDE_VARIANTS: readonly WideVariant[] = [
  { azimuth: 0, elevation: 28, zoom: 1 },
  { azimuth: -24, elevation: 24, zoom: 1.1 },
  { azimuth: 24, elevation: 24, zoom: 1.1 },
  { azimuth: 0, elevation: 20, zoom: 1 },
];

/**
 * Gives the key of the default view of design 4.5 at a zoom.
 *
 * @param zoom The zoom of the key: 1 for the default view.
 * @returns The key.
 */
function defaultKey(zoom: number): ShotKey {
  return { azimuth: DEFAULT_AZIMUTH, elevation: DEFAULT_ELEVATION, zoom, fov: FIELD_OF_VIEW };
}

/** The camera values of each kind of shot, in degrees and factors (design 5.6). */
export const SHOT_KEYS = {
  /**
   * The push-in keeps the wide camera farther than 0.5 of the default distance, the end of the
   * beam fade of Free mode (design 4.5).
   */
  wide: { fov: 30, pushIn: 0.92, arc: 6 },
  /**
   * View 09 of `scene.png`: the stage from the front and high in the hall, farther than the
   * default view.
   */
  high: { fov: 30, zoom: 0.75, azimuth: [0, 12], elevation: [40, 44], arc: 8, rise: 4 },
  /** View 05 of `scene.png`: the conductor from behind, close, and a little above its head. */
  conductor: { fov: 26, offset: [6, 18], elevation: 10, pushIn: 0.92 },
  /** View 02 of `scene.png`: the orchestra over the shoulder of the bear, from the audience side. */
  conductorBack: { fov: 30, offset: [0, 8], elevation: 22, pushIn: 0.95 },
  /** Views 03 and 04 of `scene.png`: one side of the stage, from the front of that side and low. */
  side: { fov: 30, offset: [0, 12], elevation: 14, pushIn: 0.95, arc: 6 },
  section: { fov: 30, offset: [8, 22], elevation: 14, backRise: 8, pushIn: 0.92, arc: 6 },
  solo: { fov: 24, offset: [20, 40], elevation: 12, backRise: 10, pushIn: 0.9, arc: 4 },
  /** The last shot pulls out from this zoom to 1 in the default view. */
  lastPullOut: 0.92,
} as const;

/** The size of a wide or high shot for the jump cut rule, in stage sides. */
const WIDE_SIZE_IN_SIDES = 0.7;

/**
 * The shots of a small group (design 5.6): a score with fewer than this many seats with players
 * gets only the solo shots of its players, a two-shot of all players, and the wide shots.
 */
export const SMALL_GROUP_SEATS = 3;

/** A candidate for the next shot. */
interface Candidate {
  readonly kind: ShotKind;
  /** The kind and the subject, for example `solo 3`. */
  readonly id: string;
  /** The group of a section or solo shot, else `null`. */
  readonly group: SectionGroup | null;
  /** The side of the stage of a side view, else `null`. */
  readonly side: StageSide | null;
  /**
   * The seats of a section shot or of a side view, with the most activity first, or the seat of
   * a solo shot.
   */
  readonly seats: readonly number[];
  readonly score: number;
  /** True if a seat of the subject enters at the cut. */
  readonly entry: boolean;
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
  /** The body boxes and the sight lines of each subject so far, by its target and its owner. */
  readonly sightCache: Map<string, SubjectLines>;
  /**
   * The result of the foreground and the clearance tests of each close move so far: one map for
   * each subject and move, by the place of the camera on the grid. The same subject comes back at
   * many cuts, with the same cameras.
   */
  readonly moveCache: Map<string, Map<number, boolean>>;
  /** The number of shots since the last wide or high shot, or since the start. */
  sinceWide: number;
  /** The end of the last wide or high shot, in song seconds. */
  lastWideEnd: number;
  /** The seats with players on the stage. Fewer than 3 make a small group. */
  readonly staged: readonly number[];
  /** The number of shots since the last conductor shot, or since the start. */
  sinceConductor: number;
  /** The number of conductor shots so far. */
  conductorShots: number;
  /** The number of shots since the last side view, or since the start. */
  sinceSide: number;
  /** The azimuth of the last shot of each section or solo subject, by the id of the candidate. */
  readonly lastAzimuth: Map<string, number>;
  /**
   * The elevation band of the search of a close camera at this cut: the elevation above which it
   * starts, and its top, in radians.
   */
  band: [number, number];
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
 * Rounds an angle to the azimuth grid of the search (design 5.6).
 *
 * @param degrees The angle, in degrees.
 * @returns The nearest multiple of 6°, in radians.
 */
function onGrid(degrees: number): number {
  const grid = KEY_SEARCH.azimuthGrid;
  return Math.round(degrees / grid) * grid * DEG;
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
 * beam for the full move, because the beam draws only its outer faces, and it stays nearer to the
 * stage center than 0.44 of the default distance.
 *
 * @param planner The planner.
 * @param target The target.
 * @param radius The radius of the subject.
 * @param from The key at the start.
 * @param to The key at the end.
 * @param held The boxes of the body of the subject.
 * @param sights The lines of sight to the head, the hands, and the instrument of a solo or a
 *   conductor shot, or `null`. Each camera of the move sees them (design 5.6).
 * @returns True if the move is clear.
 */
function moveClear(
  planner: Planner,
  target: Vec3,
  radius: number,
  from: ShotKey,
  to: ShotKey,
  held: ReadonlySet<ClearBox>,
  sights: SubjectSightLines | null,
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
  // The cheap tests of all samples come first, so that a camera that fails them costs little.
  const keys = MOVE_SAMPLES.map((u) => mixKeys(from, to, u));
  const outside = keys.some((key) =>
    BEAM_ASPECTS.some((aspect, i) => {
      const camera = keyPosition(S, target, radius, key, aspect);
      const share = Math.hypot(...camera) / defaultDistance(S, aspect);
      return share > CLOSE_DISTANCE_SHARE || beamSide(S, camera) !== sides[i];
    }),
  );
  if (outside) {
    return false;
  }
  const clear = keys.every((key, k) => {
    const near = keyPosition(S, target, radius, key, TEST_ASPECTS.near);
    const far = keyPosition(S, target, radius, key, TEST_ASPECTS.far);
    if (!cameraClear(planner.clearance, target, near, far, held)) {
      return false;
    }
    return (
      !sights ||
      !SIGHT_MOVE_SAMPLES.has(MOVE_SAMPLES[k] ?? -1) ||
      (sightsClear(planner.clearance, sights, near) && sightsClear(planner.clearance, sights, far))
    );
  });
  // The farthest camera has the longest line of sight on the ray.
  return (
    clear &&
    LINE_SAMPLES.every((u) =>
      targetLineClear(
        planner.clearance,
        target,
        keyPosition(S, target, radius, mixKeys(from, to, u), TEST_ASPECTS.far),
        held,
      ),
    )
  );
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
  /** The azimuth of the last shot of the same subject, or `null`. */
  readonly avoid: number | null;
  /** The camera stays within this angle of the front of the subject, in radians. */
  readonly maxFromFront: number;
}

/** The body boxes and the sight lines of a subject. */
interface SubjectLines {
  readonly held: ReadonlySet<ClearBox>;
  readonly sights: SubjectSightLines | null;
}

/**
 * Gives the key of a subject for the caches of the planner: its target and the owner of its
 * sight points.
 *
 * @param subject The subject.
 * @returns The key.
 */
function subjectKey(subject: Subject): string {
  return `${subject.target.join()} ${subject.sights?.owner ?? 'none'}`;
}

/**
 * Gives the body boxes and the sight lines of a subject. The planner keeps them for each subject,
 * because the same subject comes back at many cuts.
 *
 * @param planner The planner.
 * @param subject The subject.
 * @returns The body boxes and the sight lines.
 */
function subjectLines(planner: Planner, subject: Subject): SubjectLines {
  const key = subjectKey(subject);
  const known = planner.sightCache.get(key);
  if (known) {
    return known;
  }
  const held = bodyBoxes(planner.clearance, subject.target);
  const sights = subject.sights ? prepareSightLines(planner.clearance, subject.sights, held) : null;
  const lines = { held, sights };
  planner.sightCache.set(key, lines);
  return lines;
}

/**
 * Tells if a head or another object stands in the foreground of a close move, at its start or at
 * its end, in each view of the foreground rule (design 5.6).
 *
 * @param planner The planner.
 * @param subject The subject.
 * @param from The key at the start.
 * @param to The key at the end.
 * @param test The test of one camera: the heads, or the cover of the other objects.
 * @returns True if a head or an object stands in the foreground.
 */
function moveForeground(
  planner: Planner,
  subject: Subject,
  from: ShotKey,
  to: ShotKey,
  test: 'heads' | 'objects',
): boolean {
  const S = planner.stageSide;
  const { target, members, focus, outside } = subject;
  if (test === 'heads' && outside) {
    // The point stays out of the frame of a desktop view for the full move.
    const desktop = FOREGROUND.aspects[0];
    for (const u of MOVE_SAMPLES) {
      const key = mixKeys(from, to, u);
      const camera = keyPosition(S, target, subject.radius, key, desktop);
      if (inFrame(outside, camera, target, key.fov, desktop)) {
        return true;
      }
    }
  }
  for (const aspect of FOREGROUND.aspects) {
    for (const key of [from, to]) {
      const camera = keyPosition(S, target, subject.radius, key, aspect);
      const found =
        test === 'heads'
          ? foregroundHead(planner.subjects.heads, members, focus, camera, target, key.fov, aspect)
          : foregroundObject(planner.clearance, members, focus, camera, target, key.fov, aspect);
      if (found) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Searches a clear camera for a close shot (design 5.6) in the elevation band of the cut: the
 * wanted azimuth, then ±12° to ±72°, then the same azimuths 8° to 40° higher, up to the top of
 * the band. The camera stays within 75° of the front of the subject. A camera that makes a jump
 * cut does not count, and a camera with a head or another large object in the foreground does
 * not count.
 *
 * @param planner The planner.
 * @param subject The subject.
 * @param move The move of the shot.
 * @returns The framing, or `null` with no clear camera.
 */
function searchClose(planner: Planner, subject: Subject, move: CloseMove): Framing | null {
  const { held, sights } = subjectLines(planner, subject);
  const moveKey = `${subjectKey(subject)} ${subject.radius} ${move.pushIn} ${move.fov}`;
  const known = planner.moveCache.get(moveKey) ?? new Map<number, boolean>();
  planner.moveCache.set(moveKey, known);
  const previous = planner.planned.at(-1);
  const s = KEY_SEARCH;
  // The band moves up with the lift of a piano shot.
  const bottom = planner.band[0] + subject.lift;
  const top = planner.band[1] + subject.lift;
  const tryCamera = (azimuth: number, elevation: number): Framing | null => {
    if (Math.abs(angleDifference(azimuth, subject.front)) > move.maxFromFront) {
      return null;
    }
    let arc = move.arc;
    if (Math.abs(angleDifference(azimuth + arc, subject.front)) > move.maxFromFront) {
      arc = -arc;
    }
    const from: ShotKey = { azimuth, elevation, zoom: 1, fov: move.fov };
    const to: ShotKey = { azimuth: azimuth + arc, elevation, zoom: move.pushIn, fov: move.fov };
    if (jumpCut(previous, from, subject.radius)) {
      return null;
    }
    // N7: no repeat of the framing of the last shot of the subject.
    if (move.avoid !== null && Math.abs(angleDifference(azimuth, move.avoid)) < s.repeatAngle) {
      return null;
    }
    // The camera on the grid around the front, the elevation in 0.1°, and the direction of the
    // arc.
    const onFront = Math.round(angleDifference(azimuth, subject.front) / (s.azimuthGrid * DEG));
    const key =
      ((onFront + 32) * 1000 + Math.round((elevation / DEG) * 10)) * 2 + (arc > 0 ? 1 : 0);
    let clear = known.get(key);
    if (clear === undefined) {
      // The cheap test of the heads comes first, and the cover of the objects last.
      clear =
        !moveForeground(planner, subject, from, to, 'heads') &&
        moveClear(planner, subject.target, subject.radius, from, to, held, sights) &&
        !moveForeground(planner, subject, from, to, 'objects');
      known.set(key, clear);
    }
    if (!clear) {
      return null;
    }
    return { target: subject.target, radius: subject.radius, from, to, seats: subject.seats, held };
  };
  let last = -Infinity;
  for (const rise of s.elevationSteps) {
    const elevation = Math.min(move.elevation + rise, top);
    if (elevation <= last + 1e-9) {
      break;
    }
    last = elevation;
    if (elevation <= bottom + 1e-9) {
      continue;
    }
    for (const step of s.azimuthSteps) {
      for (const side of step === 0 ? [1] : [1, -1]) {
        const framing = tryCamera(move.wantedAzimuth + side * step, elevation);
        if (framing) {
          return framing;
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
  const from: ShotKey = variant
    ? {
        azimuth: variant.azimuth * DEG,
        elevation: variant.elevation * DEG,
        zoom: variant.zoom,
        fov: k.fov,
      }
    : defaultKey(1);
  const to: ShotKey =
    random() < 0.5
      ? { ...from, zoom: from.zoom * k.pushIn }
      : { ...from, azimuth: from.azimuth + signOf(random) * k.arc * DEG };
  return { target: [0, 0, 0], radius: 0, from, to, seats: [], held: new Set() };
}

/**
 * Makes the framing of the opening shot (design 5.6): the default view of design 4.5, which is
 * also the view of the first screen, with a push-in to 0.92.
 *
 * @returns The framing.
 */
function openingFraming(): Framing {
  const from = defaultKey(1);
  const to = defaultKey(SHOT_KEYS.wide.pushIn);
  return { target: [0, 0, 0], radius: 0, from, to, seats: [], held: new Set() };
}

/**
 * Makes the framing of a high shot, as view 09 of `scene.png`: a seeded azimuth of up to 12° to
 * one side and an elevation of 40° to 44°, with an arc of 8° over the middle and a rise of 4°.
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
 * Makes the framing of a conductor shot (design 5.6). The shots take turns: the first one, and
 * each odd one, looks over the shoulder of the bear at the orchestra (view 02 of `scene.png`).
 * The other ones show the bear from behind, close (view 05). Both cameras stand on the audience
 * side. When the framing of the turn has no clear camera, the other one fills in.
 *
 * @param planner The planner.
 * @param window The music after the cut.
 * @returns The framing, or `null` with no clear camera or with no conductor.
 */
function conductorFraming(planner: Planner, window: WindowMusic): Framing | null {
  const { random, subjects } = planner;
  const { conductor } = subjects;
  if (!conductor) {
    return null;
  }
  const back = (): Framing | null => {
    const k = SHOT_KEYS.conductorBack;
    const subject = conductorBackSubject(
      subjects,
      conductor,
      activeMiddle(subjects, window.activity),
    );
    return searchClose(planner, subject, {
      wantedAzimuth: subject.front + signOf(random) * onGrid(between(random, k.offset)),
      elevation: k.elevation * DEG,
      arc: 0,
      pushIn: k.pushIn,
      fov: k.fov,
      avoid: null,
      maxFromFront: KEY_SEARCH.maxFromFront,
    });
  };
  const close = (): Framing | null => {
    const k = SHOT_KEYS.conductor;
    const subject = conductorCloseSubject(conductor);
    return searchClose(planner, subject, {
      wantedAzimuth: subject.front + signOf(random) * onGrid(between(random, k.offset)),
      elevation: k.elevation * DEG,
      arc: 0,
      pushIn: k.pushIn,
      fov: k.fov,
      avoid: null,
      maxFromFront: KEY_SEARCH.maxFromFront,
    });
  };
  return planner.conductorShots % 2 === 0 ? (back() ?? close()) : (close() ?? back());
}

/**
 * Makes the framing of a candidate, with a clear camera.
 *
 * @param planner The planner.
 * @param candidate The candidate.
 * @param window The music after the cut.
 * @returns The framing, or `null` with no clear camera.
 */
function framingOf(planner: Planner, candidate: Candidate, window: WindowMusic): Framing | null {
  const { random, subjects } = planner;
  switch (candidate.kind) {
    case 'wide':
      return wideFraming(planner);
    case 'high':
      return highFraming(planner);
    case 'conductor':
      return conductorFraming(planner, window);
    case 'side': {
      const k = SHOT_KEYS.side;
      const subject = sideSubject(subjects, candidate.seats, candidate.side ?? -1);
      if (!subject) {
        return null;
      }
      return searchClose(planner, subject, {
        wantedAzimuth: subject.front + signOf(random) * onGrid(between(random, k.offset)),
        elevation: k.elevation * DEG,
        arc: signOf(random) * k.arc * DEG,
        pushIn: k.pushIn,
        fov: k.fov,
        avoid: planner.lastAzimuth.get(candidate.id) ?? null,
        maxFromFront: KEY_SEARCH.sideFromFront,
      });
    }
    case 'section': {
      const k = SHOT_KEYS.section;
      const subject = sectionSubject(
        subjects,
        candidate.seats,
        candidate.group === 'ensemble' ? SUBJECT_SIZES.twoShotMargin : SUBJECT_SIZES.sectionMargin,
      );
      if (!subject) {
        return null;
      }
      return searchClose(planner, subject, {
        wantedAzimuth:
          subject.front + signOf(random) * onGrid(between(random, k.offset) * subject.spread),
        elevation: (k.elevation + k.backRise * subject.back) * DEG + subject.lift,
        arc: signOf(random) * k.arc * DEG,
        pushIn: k.pushIn,
        fov: k.fov,
        avoid: planner.lastAzimuth.get(candidate.id) ?? null,
        maxFromFront: KEY_SEARCH.maxFromFront,
      });
    }
    case 'solo': {
      const k = SHOT_KEYS.solo;
      const subject = soloSubject(subjects, candidate.seats[0] ?? -1);
      if (!subject) {
        return null;
      }
      return searchClose(planner, subject, {
        wantedAzimuth:
          subject.front + signOf(random) * onGrid(between(random, k.offset) * subject.spread),
        elevation: (k.elevation + k.backRise * subject.back) * DEG + subject.lift,
        arc: signOf(random) * k.arc * DEG,
        pushIn: k.pushIn,
        fov: k.fov,
        avoid: planner.lastAzimuth.get(candidate.id) ?? null,
        maxFromFront: KEY_SEARCH.maxFromFront,
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
  if (planned.length === 1) {
    // The first cut after the opening: each active seat that played its first note in the
    // opening counts as an entry, so the first voice gets its shot. The baritone of the Ode to
    // Joy sings alone from 1.5 s, and the first rule gave the first singer shot at 18 s.
    for (const [seat, notes] of music.seats.entries()) {
      const first = notes.starts[0];
      if (first !== undefined && first < cut && window.active[seat]) {
        entering.add(seat);
      }
    }
  }
  const total = Math.max(1e-9, window.totalActivity);
  const tutti = window.tutti;
  // A group with fewer than 3 seats gets no high shot and no section shot, but a two-shot.
  const { staged } = planner;
  const small = staged.length < SMALL_GROUP_SEATS;
  const list: Candidate[] = [];
  const add = (
    kind: ShotKind,
    id: string,
    group: SectionGroup | null,
    seats: number[],
    score: number,
    side: StageSide | null = null,
  ): void => {
    list.push({ kind, id, group, side, seats, score, entry: seats.some((s) => entering.has(s)) });
  };
  // N6: a wide view at least every 60 s. When the last shot starts more than 60 s after the last
  // wide view, a wide view also comes at one of the last cuts with room for it (rule 3).
  const t = SHOT_TIMES;
  const lateLast = planner.lastStart - planner.lastWideEnd > t.maxWideGapSec;
  const lastRoom = planner.lastStart - cut < t.minSec + roomBeforeLast(0) + t.maxSec;
  const due = cut - planner.lastWideEnd >= t.wideDueSec || (lateLast && lastRoom) ? w.wideDue : 0;
  add('wide', 'wide', null, [], w.wide + (tutti ? w.wideTutti : 0) + due);
  if (!small) {
    add(
      'high',
      'high',
      null,
      [],
      w.high + (tutti ? w.highTutti : 0) + (window.activeCount >= 6 ? w.highBusy : 0) + due,
    );
  }
  // A chamber group has no conductor (design 4.2), and a small group shows no conductor.
  if (subjects.conductor && !small) {
    add(
      'conductor',
      'conductor',
      null,
      [],
      w.conductor + (window.activeCount >= 5 ? w.conductorBusy : 0),
    );
  }
  // The side views: the seats of each side that play or enter, with the most activity first.
  if (!small) {
    for (const side of [-1, 1] as const) {
      const seats = staged
        .filter((s) => (window.active[s] || entering.has(s)) && sideOf(subjects, s) === side)
        .toSorted((a, b) => (window.activity[b] ?? 0) - (window.activity[a] ?? 0) || a - b);
      if (seats.length < 2) {
        continue;
      }
      const activity = seats.reduce((sum, s) => sum + (window.activity[s] ?? 0), 0);
      const piano = seats.some((s) => subjects.seats[s]?.group === 'piano');
      add(
        'side',
        `side ${side}`,
        null,
        seats,
        w.side +
          w.sideShare * (activity / total) +
          (seats.some((s) => entering.has(s)) ? w.sideEntry : 0) +
          (piano ? w.sidePiano : 0),
        side,
      );
    }
  }
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
        (window.lead[seat] ? w.soloLead : 0) +
        (feature ? w.soloFeature : 0) +
        (tutti ? w.soloTutti : 0),
    );
  }
  if (small) {
    // The two-shot holds all players of the stage, also the seats that rest.
    groups.clear();
    const players = staged.reduce((sum, s) => sum + (subjects.seats[s]?.players.length ?? 0), 0);
    if (players >= 2) {
      groups.set('ensemble', [...staged]);
    }
  }
  for (const [group, seats] of groups) {
    const activity = seats.reduce((sum, s) => sum + (window.activity[s] ?? 0), 0);
    const sorted = seats.toSorted(
      (a, b) => (window.activity[b] ?? 0) - (window.activity[a] ?? 0) || a - b,
    );
    add(
      'section',
      group === 'ensemble' ? 'two-shot' : `section ${group}`,
      group,
      sorted,
      w.section +
        w.sectionShare * (activity / total) +
        (seats.some((s) => entering.has(s)) ? w.sectionEntry : 0) +
        (seats.some((s) => window.lead[s]) ? w.sectionLead : 0) +
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
  // A player alone can have two solo shots in a row, from two cameras: the jump cut rule and the
  // rule of no repeat of a framing keep them apart.
  const alone = staged.length === 1;
  const scored: Candidate[] = [];
  for (const candidate of list) {
    const close = candidate.kind === 'section' || candidate.kind === 'solo';
    const reused = close || candidate.kind === 'side';
    const wideKind = candidate.kind === 'wide' || candidate.kind === 'high';
    const again = alone && candidate.kind === 'solo';
    // Rule 1: no repeat of the kind and the subject.
    if (previous && candidate.id === previous.id && !again) {
      continue;
    }
    // Rule 2: no section or solo shot of the group of the previous shot.
    if (close && previous?.group === candidate.group && !again) {
      continue;
    }
    // Rule 3: three other shots between two wide or high shots, also from the start, and room for
    // them before the last shot. Thus the wide and high shots after the opening are at most 25%.
    if (wideKind && (planner.sinceWide < SHOT_TIMES.wideSpacing || !wideRoom)) {
      continue;
    }
    // Rule 3b: five other shots between two conductor shots, also from the start.
    if (candidate.kind === 'conductor' && planner.sinceConductor < SHOT_TIMES.conductorSpacing) {
      continue;
    }
    // Rule 3c: three other shots between two side views, also from the start.
    if (candidate.kind === 'side' && planner.sinceSide < SHOT_TIMES.sideSpacing) {
      continue;
    }
    let score = candidate.score;
    // Rule 4: variety.
    if (recent.has(candidate.id)) {
      score += w.recent;
    }
    if (reused) {
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
  return missing <= 0 ? 0 : missing * SHOT_TIMES.roomSec;
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
  let longest = start + (wideKind ? t.maxWideSec : t.maxSec);
  if (!wideKind && planner.lastWideEnd + t.maxWideGapSec >= start + t.minSec) {
    // N6: the next cut comes in time for a wide view.
    longest = Math.min(longest, planner.lastWideEnd + t.maxWideGapSec);
  }
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
    const consider = (time: number, bonus: number): void => {
      if (!fits(time)) {
        return;
      }
      let score = -Math.abs(time - wanted) / t.lengthScale + bonus;
      const previous = planner.planned.at(-1)?.shot;
      if (previous && Math.abs(time - start - (previous.endSec - previous.startSec)) < 0.05) {
        score += CUT_BONUS.sameLength;
      }
      if (entriesNear(music, time, barLengthAt(music, time) / 4).length > 0) {
        score += CUT_BONUS.entry;
      }
      if (score > bestScore) {
        bestScore = score;
        best = time;
      }
    };
    for (let bar = Math.max(0, first - 1); bar < music.downbeats.length; bar++) {
      const time = music.downbeats[bar] ?? 0;
      if (time > longest + 1e-9) {
        break;
      }
      if (bar >= first) {
        consider(time, bar % 4 === 0 ? CUT_BONUS.phrase : bar % 2 === 0 ? CUT_BONUS.halfPhrase : 0);
      }
      // The beat in the middle of the bar, in a bar with an even number of beats (N5).
      const next = music.downbeats[bar + 1];
      if (next !== undefined) {
        const middle = (time + next) / 2;
        const beat = music.beats[lastAtOrBefore(music.beats, middle + 1e-6)];
        if (beat !== undefined && Math.abs(beat - middle) < 1e-3) {
          consider(middle, CUT_BONUS.midBar);
        }
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
  return SIGHT_SAMPLES.every((u) => {
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
  if (kind === 'section' || kind === 'solo' || kind === 'side') {
    planner.lastAzimuth.set(candidate.id, framing.from.azimuth);
  }
  planner.sinceSide = kind === 'side' ? 0 : planner.sinceSide + 1;
  planner.sinceWide = wideKind ? 0 : planner.sinceWide + 1;
  if (wideKind) {
    planner.lastWideEnd = Math.max(times.endSec, planner.lastWideEnd);
  }
  if (kind === 'conductor') {
    planner.sinceConductor = 0;
    planner.conductorShots++;
  } else {
    planner.sinceConductor++;
  }
}

/**
 * Makes the previous shot longer when no subject fits at a cut (design 5.6). Its new end is the
 * end that a shot of its kind from the cut would get, and its move takes the longer time.
 *
 * @param planner The planner.
 * @param cut The cut, in song seconds.
 * @returns The new end in song seconds, or `null` if the shot would pass its longest length.
 */
function holdPrevious(planner: Planner, cut: number): number | null {
  const last = planner.planned.at(-1);
  if (!last) {
    return null;
  }
  const { kind, startSec } = last.shot;
  const wideKind = kind === 'wide' || kind === 'high';
  const end = Math.min(chooseEnd(planner, cut, kind), planner.lastStart);
  if (end - Math.max(0, startSec) > (wideKind ? SHOT_TIMES.maxWideSec : SHOT_TIMES.maxSec) + 1e-9) {
    return null;
  }
  planner.planned[planner.planned.length - 1] = {
    ...last,
    shot: { ...last.shot, endSec: end, moveEndSec: end },
  };
  if (wideKind) {
    planner.lastWideEnd = end;
  }
  return end;
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
 * - The first shot is the default view from `-Infinity`. It holds for the count-in, and it pushes
 *   in over the first phrase.
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
  const subjects = prepareSubjects(score, layout, models);
  const planner: Planner = {
    music,
    subjects,
    clearance: prepareClearance(layout, models),
    stageSide: layout.stageSide,
    random: mulberry32(seed),
    lastStart: lastStartOf(music, score.durationSec),
    planned: [],
    sightCache: new Map(),
    moveCache: new Map(),
    sinceWide: 0,
    lastWideEnd: 0,
    staged: subjects.seats.flatMap((players, seat) => (players ? [seat] : [])),
    sinceConductor: 0,
    conductorShots: 0,
    sinceSide: 0,
    lastAzimuth: new Map(),
    band: [-Infinity, KEY_SEARCH.bands[0]],
  };

  // The opening: the default view of the first screen holds for the count-in, then it pushes in
  // slowly over the first phrase. The click on play thus makes no cut.
  let cut = chooseEnd(planner, 0, 'wide');
  addShot(planner, { kind: 'wide', id: 'wide', group: null }, openingFraming(), {
    startSec: -Infinity,
    endSec: cut,
    moveEndSec: cut,
    blendSec: 0,
  });

  while (cut < planner.lastStart - 1e-9) {
    const window = musicIn(music, cut, cut + SHOT_TIMES.choiceWindowSec);
    let chosen: { candidate: Candidate; framing: Framing } | null = null;
    const candidates = candidatesAt(planner, cut, window);
    // The lowest elevation band first. The best candidate gets all bands at once, and a
    // candidate near the best score the second band. The other candidates get the higher bands
    // only after all candidates failed (N4).
    const lead = (candidates[0]?.score ?? 0) - KEY_SEARCH.bandMargin;
    const bands = KEY_SEARCH.bands.length;
    for (const higher of [false, true]) {
      for (const candidate of candidates) {
        // The first pass: the first band, the second band for a candidate near the best, and all
        // bands for the best candidate at its entry. The second pass: the bands that the
        // candidate did not get.
        let first = candidate.score >= lead ? 2 : 1;
        if (candidate === candidates[0] && candidate.entry) {
          first = bands;
        }
        for (let band = higher ? first : 0; band < (higher ? bands : first); band++) {
          planner.band = [KEY_SEARCH.bands[band - 1] ?? -Infinity, KEY_SEARCH.bands[band] ?? 0];
          const framing = framingOf(planner, candidate, window);
          if (framing) {
            chosen = { candidate, framing };
            break;
          }
        }
        if (chosen) {
          break;
        }
      }
      if (chosen) {
        break;
      }
    }
    // A conductor shot that fills the time searches all bands.
    planner.band = [-Infinity, KEY_SEARCH.bands[bands - 1] ?? 0];
    if (!chosen) {
      // No subject fits, for example in a rest of all seats. The previous shot holds on while it
      // stays within its longest length, so that no wide shot comes just before the last shot.
      // Else the conductor fills the time, also against rule 3b, because it conducts the rest.
      // Else a wide shot fills the time.
      const held = holdPrevious(planner, cut);
      if (held !== null) {
        cut = held;
        continue;
      }
      const conductor: Candidate = {
        kind: 'conductor',
        id: 'conductor',
        group: null,
        side: null,
        seats: [],
        score: 0,
        entry: false,
      };
      // After a conductor shot, the other framing of the conductor fills the time. The jump cut
      // rule keeps the two views apart. A small group shows no conductor.
      const small = planner.staged.length < SMALL_GROUP_SEATS;
      const framing = small ? null : conductorFraming(planner, window);
      if (framing) {
        chosen = { candidate: conductor, framing };
      } else {
        const candidate: Candidate = {
          kind: 'wide',
          id: 'wide',
          group: null,
          side: null,
          seats: [],
          score: 0,
          entry: false,
        };
        chosen = { candidate, framing: wideFraming(planner) };
      }
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
  const to = defaultKey(1);
  addShot(
    planner,
    { kind: 'wide', id: 'wide', group: null },
    {
      target: [0, 0, 0],
      radius: 0,
      from: defaultKey(SHOT_KEYS.lastPullOut),
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
