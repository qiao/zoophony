import { CONDUCTOR } from '../models/cast.ts';
import type { PlayingSection } from '../models/cast.ts';
import type { PlayerPlace, SceneLayout } from '../models/layout.ts';
import type { ModelCache } from '../models/model-cache.ts';
import type { Vec3 } from '../models/tuples.ts';
import { conductorHead } from '../pose/plan.ts';
import type { Score } from '../score/types.ts';
import { azimuthOf } from './camera-keys.ts';

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
   * The target of a conductor shot is this high above the podium top, near the top of the head
   * of the bear. A lower target is behind the desk of the conductor stand at 18°.
   */
  conductorHeight: 1.5,
  /** The sphere of a solo or a conductor shot. */
  closeRadius: 0.95,
  /** The sphere also holds each head point plus this margin. */
  headMargin: 0.3,
} as const;

/** One player of a seat: its place, the point of its head, and its front. */
interface SubjectPlayer {
  readonly position: Vec3;
  readonly head: Vec3;
  /** The azimuth of the front of the player: the direction that it faces. */
  readonly front: number;
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
}

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
  const bySeat = score.seats.map((): PlayerPlace[] => []);
  for (const place of layout.players) {
    bySeat[place.cast.seatIndex]?.push(place);
  }
  const seats = score.seats.map((seat, i): SeatPlayers | null => {
    const places = bySeat[i] ?? [];
    if (seat.section === 'sound-only' || places.length === 0) {
      return null;
    }
    return {
      group: SECTION_GROUPS[seat.section],
      players: places.map((place) => {
        const { species, instrument, kettles } = place.cast;
        return {
          position: place.position,
          head: conductorHead(models.get(species, instrument, kettles), place),
          front: frontOf(place.facing),
        };
      }),
    };
  });
  const bear = models.get(CONDUCTOR.species, CONDUCTOR.instrument);
  const head = conductorHead(bear, layout.conductor);
  return {
    stageSide: layout.stageSide,
    podium: layout.podium,
    seats,
    conductorTarget: [
      head[0],
      layout.conductor.position[1] + SUBJECT_SIZES.conductorHeight,
      head[2],
    ],
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
  return {
    target,
    radius: Math.max(
      SUBJECT_SIZES.closeRadius,
      distance(principal.head, target) + SUBJECT_SIZES.headMargin,
    ),
    front: principal.front,
    back: backOf(subjects, z),
    seats: [seatIndex],
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
  return {
    target: sphere.target,
    radius: sphere.radius,
    front: meanFront(players),
    back: backOf(subjects, sphere.target[2]),
    seats: kept,
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
  };
}
