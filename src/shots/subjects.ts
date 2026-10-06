import { CONDUCTOR } from '../models/cast.ts';
import type { PlayingSection } from '../models/cast.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { ConductorPlace, PlayerPlace, SceneLayout } from '../models/layout.ts';
import type { ModelCache } from '../models/model-cache.ts';
import type { PlayerModel } from '../models/player.ts';
import type { Vec3 } from '../models/tuples.ts';
import { conductorRig } from '../pose/conductor.ts';
import { conductorHead } from '../pose/plan.ts';
import type { Score } from '../score/types.ts';
import { azimuthOf } from './camera-keys.ts';
import { CONDUCTOR_OWNER } from './clearance.ts';
import type { SightPoints } from './clearance.ts';
import type { StageHead } from './foreground.ts';

/** The groups of the section shots (design 5.6). */
export type SectionGroup =
  | 'violins'
  | 'low-strings'
  | 'woodwinds'
  | 'brass'
  | 'percussion'
  | 'harp'
  | 'piano'
  | 'choir';

/** The group of each section (design 5.6). */
export const SECTION_GROUPS = {
  violin: 'violins',
  viola: 'low-strings',
  cello: 'low-strings',
  contrabass: 'low-strings',
  harp: 'harp',
  piano: 'piano',
  flute: 'woodwinds',
  oboe: 'woodwinds',
  clarinet: 'woodwinds',
  bassoon: 'woodwinds',
  horn: 'brass',
  trumpet: 'brass',
  trombone: 'brass',
  tuba: 'brass',
  timpani: 'percussion',
  percussion: 'percussion',
  choir: 'choir',
} as const satisfies Readonly<Record<PlayingSection, SectionGroup>>;

/** The sizes of the subjects of the shots (design 5.6). */
export const SUBJECT_SIZES = {
  /** The target of a section shot is this high above the players. */
  sectionHeight: 0.8,
  /** The sphere of a section holds each player plus this margin in the stage plane. */
  sectionMargin: 0.75,
  /** The largest sphere of a section shot. */
  sectionMaxRadius: 2.6,
  /** The target of a solo shot is this high above the principal player. */
  soloHeight: 0.9,
  /**
   * The target of a conductor shot is this high above the podium top, near the eyes of the bear.
   * The desk of the conductor stand is at the height of its chest, so the frame holds the face,
   * the hands, and the podium. With the first desk at 1.10 m, the target was 1.5 m high.
   */
  conductorHeight: 1.25,
  /** The sphere of a solo or a conductor shot. */
  closeRadius: 0.95,
  /**
   * The target of a conductor shot from the audience side is this far in front of the bear, toward
   * the players who play, and this high above the stage top.
   */
  conductorBackReach: 2.0,
  conductorBackHeight: 1.2,
  /** The sphere of a conductor shot from the audience side: the bear and the players behind it. */
  conductorBackRadius: 1.8,
  /** The sphere also holds each head point plus this margin. */
  headMargin: 0.3,
} as const;

/** One player of a seat: its place, the point of its head, its front, and its sight points. */
interface SubjectPlayer {
  readonly position: Vec3;
  readonly head: Vec3;
  /** The azimuth of the front of the player: the direction that it faces. */
  readonly front: number;
  /**
   * The points that a close camera must see: the middle of the head, then the hands and the
   * instrument (design 5.6).
   */
  readonly sights: SightPoints;
}

/** The players of one seat. */
interface SeatPlayers {
  readonly group: SectionGroup;
  /** The players in the order of the layout. The first one is the principal player. */
  readonly players: readonly SubjectPlayer[];
}

/** The places of the subjects of a layout. */
export interface StageSubjects {
  readonly stageSide: number;
  readonly podium: Vec3;
  /** One entry for each seat, or `null` for a seat with no players on the stage. */
  readonly seats: readonly (SeatPlayers | null)[];
  /** The target of a conductor shot: above the head of the bear. */
  readonly conductorTarget: Vec3;
  /** The sight points of the conductor: its head and the beat points of its two hands. */
  readonly conductorSights: SightPoints;
  /** The heads of all players and of the conductor, for the foreground rule. */
  readonly heads: readonly StageHead[];
}

/** The subject of a shot: the target, the sphere, and the front. */
export interface Subject {
  readonly target: Vec3;
  readonly radius: number;
  /** The azimuth of the front of the subject. A camera stays within 75° of it. */
  readonly front: number;
  /** 0 at the podium, 1 at the back edge of the stage (design 5.6). */
  readonly back: number;
  /** The seats of the subject. */
  readonly seats: readonly number[];
  /** The sight points of a solo or a conductor shot. A section shot has none. */
  readonly sights: SightPoints | null;
  /** The elevation that the shot adds to its kind, in radians: 0, or more for the piano. */
  readonly lift: number;
  /**
   * The factor of the seeded offset of the azimuth from the front: 1, or less for the piano, so
   * that its camera stays near the side view.
   */
  readonly spread: number;
  /** The owners of the heads of the subject players, which the foreground rule skips. */
  readonly members: readonly number[];
  /**
   * The point that sets the distance of the foreground rule: the middle of the head of a solo
   * player or of the conductor, or the target of a section.
   */
  readonly focus: Vec3;
}

/** The radius of the sphere around a head, in head heights `H`. It holds the snout. */
const HEAD_RADIUS_IN_H = 0.6;

/**
 * The view of the piano (design 5.6). The case stands in front of the pianist, so a camera in
 * front of the player looked into the black case, and the hands did not show (UX audit
 * 2026-10-05, SC1). The camera of a piano shot stands on the right of the pianist, the side of
 * the high keys and of the open lid, and higher.
 */
export const KEYBOARD_VIEW = {
  /**
   * The front of a piano subject turns this far from the front of the pianist, to its right: the
   * profile of the pianist over the high keys. With a turn of 100° and the full offset of a solo
   * shot, the camera of the Boulanger piano solo stood 128° from the front of the pianist and
   * showed its back.
   */
  turn: (-88 * Math.PI) / 180,
  /** A piano shot adds this elevation, in radians. */
  lift: (20 * Math.PI) / 180,
  /** The factor of the seeded offset of a piano shot. */
  spread: 0.25,
} as const;

/**
 * Gives the azimuth of the front of a place: the direction `(-sin f, 0, -cos f)` of its facing.
 *
 * @param facing The facing, in radians around y. 0 faces -z.
 * @returns The azimuth, in radians from +z to +x.
 */
export function frontOf(facing: number): number {
  return azimuthOf(-Math.sin(facing), -Math.cos(facing));
}

/**
 * Moves a point of the model axes to its place on the stage: a turn of `facing` around y, then
 * the position.
 *
 * @param point The point in the model axes.
 * @param place The place of the model.
 * @returns The point on the stage.
 */
function onStage(point: Vec3, place: Pick<PlayerPlace, 'position' | 'facing'>): Vec3 {
  const cos = Math.cos(place.facing);
  const sin = Math.sin(place.facing);
  return [
    place.position[0] + point[0] * cos + point[2] * sin,
    place.position[1] + point[1],
    place.position[2] - point[0] * sin + point[2] * cos,
  ];
}

/**
 * Finds the sight points of a player in the model axes (design 5.6): the middle of the head, each
 * palm that holds the instrument in the playing pose, and one point of the instrument. That point
 * is the middle of the first play target on the instrument, such as the bow contact, the keys,
 * or the harp strings, or else the mouthpiece. A palm on the bow or on a mallet hangs in the bind
 * pose, so it does not count.
 *
 * @param model The player model.
 * @returns The head, then the other points.
 */
function modelSights(model: PlayerModel): Omit<SightPoints, 'owner'> {
  const { grips, targets } = model.instrument;
  const parts: Vec3[] = [];
  for (const palm of [grips.palmL, grips.palmR]) {
    if (palm?.bone === 'instrument') {
      parts.push(placePoint(model.pieces, palm));
    }
  }
  const target = targets.find((t) => t.bone === 'instrument');
  if (target) {
    const a = placePoint(model.pieces, { bone: target.bone, at: target.from });
    const b = placePoint(model.pieces, { bone: target.bone, at: target.to });
    parts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
  } else if (grips.mouth?.bone === 'instrument') {
    parts.push(placePoint(model.pieces, grips.mouth));
  }
  return { head: model.body.headCenter, parts };
}

/**
 * Finds the sight points of the conductor (design 5.6): the middle of the head, and the point of
 * beat 1 of the baton (5.4) with its mirror for the left hand.
 *
 * @param model The bear with the baton.
 * @param place The place of the conductor.
 * @returns The sight points on the stage.
 */
function conductorSights(model: PlayerModel, place: ConductorPlace): SightPoints {
  const beat = conductorRig(model).beatPoint;
  return {
    owner: CONDUCTOR_OWNER,
    head: onStage(model.body.headCenter, place),
    parts: [onStage(beat, place), onStage([-beat[0], beat[1], beat[2]], place)],
  };
}

/**
 * Prepares the places of the subjects of a layout: the players of each seat with their heads and
 * fronts, and the head of the conductor.
 *
 * @param score The score.
 * @param layout The layout of the score.
 * @param models The player models of the score.
 * @returns The subjects.
 */
export function prepareSubjects(
  score: Score,
  layout: SceneLayout,
  models: ModelCache,
): StageSubjects {
  const bySeat = score.seats.map((): { place: PlayerPlace; index: number }[] => []);
  for (const [index, place] of layout.players.entries()) {
    bySeat[place.cast.seatIndex]?.push({ place, index });
  }
  const heads: StageHead[] = [];
  const seats = score.seats.map((seat, i): SeatPlayers | null => {
    const places = bySeat[i] ?? [];
    if (seat.section === 'sound-only' || places.length === 0) {
      return null;
    }
    return {
      group: SECTION_GROUPS[seat.section],
      players: places.map(({ place, index }) => {
        const { species, instrument, kettles } = place.cast;
        const model = models.get(species, instrument, kettles);
        const sights = modelSights(model);
        const center = onStage(sights.head, place);
        heads.push({ owner: index, center, radius: HEAD_RADIUS_IN_H * model.body.headHeight });
        return {
          position: place.position,
          head: conductorHead(model, place),
          front: frontOf(place.facing),
          sights: {
            owner: index,
            head: center,
            parts: sights.parts.map((p) => onStage(p, place)),
          },
        };
      }),
    };
  });
  const bear = models.get(CONDUCTOR.species, CONDUCTOR.instrument);
  const head = conductorHead(bear, layout.conductor);
  const conductor = conductorSights(bear, layout.conductor);
  heads.push({
    owner: CONDUCTOR_OWNER,
    center: conductor.head,
    radius: HEAD_RADIUS_IN_H * bear.body.headHeight,
  });
  return {
    stageSide: layout.stageSide,
    podium: layout.podium,
    seats,
    conductorTarget: [
      head[0],
      layout.conductor.position[1] + SUBJECT_SIZES.conductorHeight,
      head[2],
    ],
    conductorSights: conductor,
    heads,
  };
}

/**
 * Calculates the back value of a target: 0 at the podium and 1 at the back edge of the stage
 * (design 5.6). A back row gets a higher camera, which looks over the front rows.
 *
 * @param subjects The subjects.
 * @param z The z of the target.
 * @returns The back value, from 0 to 1.
 */
function backOf(subjects: StageSubjects, z: number): number {
  const podiumZ = subjects.podium[2];
  const value = (podiumZ - z) / (podiumZ + subjects.stageSide / 2);
  return Math.min(1, Math.max(0, value));
}

/**
 * Calculates the distance between two points.
 *
 * @param a A point.
 * @param b Another point.
 * @returns The distance.
 */
function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** A sphere around players. */
interface PlayerSphere {
  readonly target: Vec3;
  readonly radius: number;
}

/**
 * Calculates the sphere of a section shot around players (design 5.6): the target 0.8 m above
 * their middle, and the radius that holds each player plus 0.75 m and each head.
 *
 * @param players The players. There is at least one.
 * @returns The sphere.
 */
function sphereOf(players: readonly SubjectPlayer[]): PlayerSphere {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of players) {
    x += p.position[0];
    y += p.position[1];
    z += p.position[2];
  }
  const n = players.length;
  const target: Vec3 = [x / n, y / n + SUBJECT_SIZES.sectionHeight, z / n];
  let radius = 0;
  for (const p of players) {
    const flat = Math.hypot(p.position[0] - target[0], p.position[2] - target[2]);
    radius = Math.max(
      radius,
      flat + SUBJECT_SIZES.sectionMargin,
      distance(p.head, target) + SUBJECT_SIZES.headMargin,
    );
  }
  return { target, radius };
}

/**
 * Gives the azimuth of the mean front of players.
 *
 * @param players The players.
 * @returns The azimuth, in radians.
 */
function meanFront(players: readonly SubjectPlayer[]): number {
  let x = 0;
  let z = 0;
  for (const p of players) {
    x += Math.sin(p.front);
    z += Math.cos(p.front);
  }
  return azimuthOf(x, z);
}

/**
 * Gives the subject of a solo shot (design 5.6): the principal player of a seat, 0.9 m above the
 * stage, with a sphere of 0.95 m, or more to hold its head.
 *
 * @param subjects The subjects.
 * @param seatIndex The seat.
 * @returns The subject, or `null` for a seat with no players.
 */
export function soloSubject(subjects: StageSubjects, seatIndex: number): Subject | null {
  const principal = subjects.seats[seatIndex]?.players[0];
  if (!principal) {
    return null;
  }
  const [x, y, z] = principal.position;
  const target: Vec3 = [x, y + SUBJECT_SIZES.soloHeight, z];
  const piano = subjects.seats[seatIndex]?.group === 'piano';
  return {
    target,
    radius: Math.max(
      SUBJECT_SIZES.closeRadius,
      distance(principal.head, target) + SUBJECT_SIZES.headMargin,
    ),
    front: piano ? principal.front + KEYBOARD_VIEW.turn : principal.front,
    back: backOf(subjects, z),
    seats: [seatIndex],
    sights: principal.sights,
    lift: piano ? KEYBOARD_VIEW.lift : 0,
    spread: piano ? KEYBOARD_VIEW.spread : 1,
    members: [principal.sights.owner],
    focus: principal.sights.head,
  };
}

/**
 * Gives the subject of a section shot (design 5.6): the players of the active seats of a group.
 * When the sphere is larger than 2.6 m, the shot keeps the seat with the most activity, and the
 * next seat if both still fit. When one seat alone is too large, the shot keeps the players
 * nearest to its principal player.
 *
 * @param subjects The subjects.
 * @param seats The active seats of the group, with the most activity first.
 * @returns The subject, or `null` with no players.
 */
export function sectionSubject(subjects: StageSubjects, seats: readonly number[]): Subject | null {
  const playersOf = (list: readonly number[]): SubjectPlayer[] =>
    list.flatMap((s) => subjects.seats[s]?.players ?? []);
  const max = SUBJECT_SIZES.sectionMaxRadius;
  let kept: readonly number[] = seats;
  let players = playersOf(kept);
  if (players.length === 0) {
    return null;
  }
  let sphere = sphereOf(players);
  if (sphere.radius > max && seats.length > 1) {
    kept = seats.slice(0, 2);
    players = playersOf(kept);
    sphere = sphereOf(players);
    if (sphere.radius > max) {
      kept = seats.slice(0, 1);
      players = playersOf(kept);
      sphere = sphereOf(players);
    }
  }
  if (sphere.radius > max) {
    const principal = players[0]?.position ?? [0, 0, 0];
    const sorted = players.toSorted(
      (a, b) => distance(a.position, principal) - distance(b.position, principal),
    );
    let count = 1;
    while (count < sorted.length && sphereOf(sorted.slice(0, count + 1)).radius <= max) {
      count++;
    }
    players = sorted.slice(0, count);
    sphere = sphereOf(players);
  }
  const piano = kept.every((seat) => subjects.seats[seat]?.group === 'piano');
  return {
    target: sphere.target,
    radius: sphere.radius,
    front: piano ? meanFront(players) + KEYBOARD_VIEW.turn : meanFront(players),
    back: backOf(subjects, sphere.target[2]),
    seats: kept,
    sights: null,
    lift: piano ? KEYBOARD_VIEW.lift : 0,
    spread: piano ? KEYBOARD_VIEW.spread : 1,
    members: players.map((p) => p.sights.owner),
    focus: sphere.target,
  };
}

/**
 * Gives the subject of a conductor shot (design 5.6): the head of the bear, 1.5 m above the
 * podium top, with a sphere of 0.95 m. The bear faces the orchestra, so its front points to -z.
 *
 * @param subjects The subjects.
 * @returns The subject.
 */
export function conductorSubject(subjects: StageSubjects): Subject {
  return {
    target: subjects.conductorTarget,
    radius: SUBJECT_SIZES.closeRadius,
    front: Math.PI,
    back: 0,
    seats: [],
    sights: subjects.conductorSights,
    lift: 0,
    spread: 1,
    members: [CONDUCTOR_OWNER],
    focus: subjects.conductorSights.head,
  };
}

/**
 * Gives the subject of a conductor shot from the audience side (design 5.6): the camera looks over
 * the shoulder of the bear to the players who play. The bear stands in the front of the frame, and
 * the lit players fill the back. The conductor shot from the orchestra side showed a dark frame
 * with no player, and all conductor shots had one angle (UX audit 2026-10-05, SC3).
 *
 * @param subjects The subjects.
 * @param toward The middle of the players who play, or the podium with no such players.
 * @returns The subject.
 */
export function conductorBackSubject(subjects: StageSubjects, toward: Vec3): Subject {
  const head = subjects.conductorSights.head;
  let dx = toward[0] - head[0];
  let dz = toward[2] - head[2];
  const length = Math.hypot(dx, dz);
  if (length < 0.5) {
    // The bear faces -z, to the orchestra.
    dx = 0;
    dz = -1;
  } else {
    dx /= length;
    dz /= length;
  }
  const reach = SUBJECT_SIZES.conductorBackReach;
  const target: Vec3 = [
    head[0] + dx * reach,
    subjects.podium[1] + SUBJECT_SIZES.conductorBackHeight,
    head[2] + dz * reach,
  ];
  return {
    target,
    radius: SUBJECT_SIZES.conductorBackRadius,
    front: azimuthOf(-dx, -dz),
    back: 0,
    seats: [],
    sights: { owner: CONDUCTOR_OWNER, head, parts: [] },
    lift: 0,
    spread: 1,
    members: [CONDUCTOR_OWNER],
    focus: target,
  };
}

/**
 * Gives the middle of the principal players of some seats, weighted by their activity.
 *
 * @param subjects The subjects.
 * @param activity The activity of each seat.
 * @returns The middle, or the podium with no activity.
 */
export function activeMiddle(subjects: StageSubjects, activity: ArrayLike<number>): Vec3 {
  let x = 0;
  let z = 0;
  let total = 0;
  for (const [seat, players] of subjects.seats.entries()) {
    const principal = players?.players[0];
    const weight = activity[seat] ?? 0;
    if (!principal || weight <= 0) {
      continue;
    }
    x += principal.position[0] * weight;
    z += principal.position[2] * weight;
    total += weight;
  }
  return total > 0 ? [x / total, subjects.podium[1], z / total] : subjects.podium;
}
