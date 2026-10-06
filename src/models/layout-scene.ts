import type { Score, Seat } from '../score/types.ts';
import { castScore, CONDUCTOR } from './cast.ts';
import type { PlayerCast, PlayingSection } from './cast.ts';
import { centeredBox } from './bounds.ts';
import {
  STAND_FOOTPRINT,
  footprintOf,
  obstacleOf,
  obstaclesTouch,
  placeFootprint,
  playerFootprint,
} from './footprint.ts';
import type { Footprint, Obstacle, PlacedBox } from './footprint.ts';
import { FIRST_ROW_RADIUS, SEATED_ARC, STAND_DISTANCE, seatAt } from './layout.ts';
import type { ConductorPlace, PlayerPlace, RiserLevel, SceneLayout, StandPlace } from './layout.ts';
import type { Vec3 } from './tuples.ts';
import { ModelCache } from './model-cache.ts';
import type { PlayerModel } from './player.ts';
import { RISER } from './props.ts';
import { CONDUCTOR_STAND, PODIUM_FROM_FRONT, PODIUM_SIZE } from './stage.ts';
import { pieceBounds } from './instruments/piece.ts';

/** The arc length of one singer on the risers (design 4.5, seat geometry). */
export const SINGER_ARC = 0.6;

/** The smallest radius step from one row to the next (design 4.5, seat geometry). */
export const ROW_STEP = 1.2;

/** The largest angle of one side of a row: half of 160° (design 4.5, seat geometry). */
const HALF_SPAN = (80 * Math.PI) / 180;

/**
 * The smallest free space between the footprints of two items of the scene, in meters: two
 * players, a player and a stand, or two rows.
 */
export const FOOTPRINT_GAP = 0.05;

/** The step by which a row, a stand, or a seat arc grows until it is clear, in meters. */
const CLEAR_STEP = 0.02;

/** The room for the chair and the margin at the edge of the stage (design 4.5, stage origin). */
const CHAIR_ROOM = 0.5;
const EDGE_MARGIN = 0.3;

/** The smallest stage side (design 4.5, stage origin). */
const SMALLEST_STAGE = 5;

/**
 * The place of the piano case center from the podium center: 2.0 m to the left and 0.8 m to the
 * front (design 4.5, seat geometry).
 */
const PIANO_CENTER = [-2.0, 0.8] as const;

/** The facing of the pianist: +x, toward the conductor (design 4.5, seat geometry). */
const PIANIST_FACING = -Math.PI / 2;

/**
 * The turn of a keyboard of the orchestra from the facing of its row: a quarter turn to the
 * left, so that the pianist faces along the arc toward the middle of the stage, and the case
 * lies along the row (design 4.5, seat geometry). At 0°, the keyboard thus has the facing of the
 * piano of a concerto: the pianist faces +x, and the lid opens to the audience. Facing the
 * podium, the case of 2.3 m with the bench pushed its row 2 m back.
 */
const KEYBOARD_TURN = Math.PI / 2;

/**
 * The place of a soloist that does not play the piano, from the podium center: 1.8 m to the
 * left and 0.3 m to the front (design 4.5, seat geometry). It is the front left of the
 * conductor, as in a concerto. The default view and the wide views then see the heads, the arms,
 * and the violins of the first desk beside the soloist: the K. 315 flute hides at most 4% of
 * them. At 0.05 m to the front, it hid 17% of a first-desk player in the default view. At 1.4 m
 * to the left, the body of the bear stood in the frame of the solo shots of the flute.
 */
export const SOLOIST_PLACE = [-1.8, 0.3] as const;

/**
 * The facing of a soloist that does not play the piano: the audience, turned 40° to the
 * conductor (design 4.5, seat geometry). Thus the default view sees the face of the soloist, and
 * the soloist sees the conductor at the side. With a turn of 30° at this place, the middle of
 * the bear stood 1% of the half width outside the frame of a solo shot of the K. 315 flute.
 */
export const SOLOIST_FACING = Math.PI + (40 * Math.PI) / 180;

/** The largest angle of one box of a riser arc, for the overlap check. */
const RISER_BOX_ANGLE = (5 * Math.PI) / 180;

/** How the players of a section use music stands (design 4.5, seat geometry). */
type StandUse = 'shared' | 'own' | 'none';

/** The string sections that sit in desks: the first desk in row 0, the other desks in row 1. */
type DeskSection = 'violin-1' | 'violin-2' | 'viola' | 'cello';

/**
 * The groups of the rows: the sections, the first violin seat, the other violin seats, and the
 * desks after the first desk of a string seat (the suffix `-b`). The soloist of the score
 * (design 3.8) has no row.
 */
type RowGroup = PlayingSection | DeskSection | `${DeskSection}-b` | 'soloist';

/**
 * The rows of the orchestra, from the front, with their sections from left to right (design
 * 4.5, seat geometry). It is the American seating with the contrabasses in a line at the back.
 * A keyboard of the orchestra (the celesta, the harpsichord, or a piano that is not the soloist)
 * sits at the left of the harp, behind the violins, as in a professional orchestra.
 */
const ROWS: readonly (readonly RowGroup[])[] = [
  ['violin-1', 'violin-2', 'viola', 'cello'],
  ['violin-1-b', 'violin-2-b', 'viola-b', 'cello-b'],
  ['piano', 'harp', 'flute', 'oboe'],
  ['horn', 'clarinet', 'bassoon', 'trumpet'],
  ['percussion', 'contrabass', 'timpani', 'trombone', 'tuba'],
];

/** Rows 0 and 1 put the violins to the left of 0° and the other strings to the right. */
const SPLIT_ROWS = 2;

/** The players of a desk: two players share one stand (design 4.5, seat geometry). */
const DESK_SIZE = 2;

/** The stands of each section: strings share one for two players, and winds have one each. */
const STAND_USE = {
  violin: 'shared',
  viola: 'shared',
  cello: 'shared',
  contrabass: 'shared',
  harp: 'none',
  piano: 'none',
  flute: 'own',
  oboe: 'own',
  clarinet: 'own',
  bassoon: 'own',
  horn: 'own',
  trumpet: 'own',
  trombone: 'own',
  tuba: 'own',
  timpani: 'none',
  percussion: 'none',
  choir: 'none',
} as const satisfies Readonly<Record<PlayingSection, StandUse>>;

/** One player that the layout places. */
interface Member {
  /** The index of the player in the cast and in `SceneLayout.players`. */
  readonly index: number;
  readonly cast: PlayerCast;
  /** The model of the player, from the model cache of the score. */
  readonly model: PlayerModel;
  /** The footprint in the axes of the row: the footprint of the model after {@link turn}. */
  readonly footprint: Footprint;
  /** The turn of the player from the facing of its row, in radians: 0, or a quarter turn. */
  readonly turn: number;
  /** The smallest arc of the player: 0.95 m, or 0.6 m for a singer. */
  readonly arc: number;
  readonly stand: StandUse;
  /** The distance of its own stand in front of the player, in meters. */
  readonly standDistance: number;
  /** True for a violinist. The first violins sit to the left of 0° in row 0. */
  readonly violin: boolean;
}

/** A player or a stand with its place, relative to the podium center. */
interface Placed<T> {
  readonly place: T;
  readonly obstacle: Obstacle;
}

/** A placed player, with its index in `SceneLayout.players`. */
type PlacedPlayer = Placed<PlayerPlace> & { readonly index: number };

/** A placed stand, with the player that has it as its own stand, or -1 for a shared stand. */
type PlacedStand = Placed<StandPlace> & { readonly owner: number };

/** The players and the stands of one row at one radius. */
interface RowPlacement {
  readonly players: readonly PlacedPlayer[];
  readonly stands: readonly PlacedStand[];
}

/** The podium center: the origin of a layout before the stage size moves it. */
const CENTER: Vec3 = [0, 0, 0];

/**
 * Places a player at an angle and a radius around the podium center.
 *
 * @param member The player.
 * @param angle The angle. 0 points to the back, and negative angles are on the left.
 * @param radius The radius.
 * @param height The height of the floor under the player.
 * @returns The place and the obstacle.
 */
function placePlayer(member: Member, angle: number, radius: number, height = 0): PlacedPlayer {
  const spot = seatAt(CENTER, angle, radius);
  const position: Vec3 = [spot.position[0], height, spot.position[2]];
  const { species, instrument, seatIndex, player, support } = member.cast;
  return {
    index: member.index,
    place: {
      position,
      facing: spot.facing + member.turn,
      support,
      cast: member.cast,
    },
    obstacle: obstacleOf(
      `${species} ${instrument} (seat ${seatIndex}, player ${player})`,
      placeFootprint(member.footprint, position, spot.facing),
    ),
  };
}

/**
 * Places a music stand in front of a row. Its readers face the podium, and so does the stand.
 *
 * @param angle The angle of the stand.
 * @param distance The radius of the stand.
 * @param owner The index of the player that has it as its own stand, or -1.
 * @returns The place and the obstacle.
 */
function placeStand(angle: number, distance: number, owner: number): PlacedStand {
  const spot = seatAt(CENTER, angle, distance);
  return {
    owner,
    place: { position: spot.position, facing: spot.facing },
    obstacle: obstacleOf(
      `stand at ${((angle * 180) / Math.PI).toFixed(1)}°`,
      placeFootprint(STAND_FOOTPRINT, spot.position, spot.facing),
    ),
  };
}

/**
 * Calculates the distance of the own stand of a wind player: 0.65 m in front of the player, or
 * further until the stand keeps the gap to the player and its instrument.
 *
 * @param footprint The footprint of the player.
 * @returns The distance, in meters.
 */
function ownStandDistance(footprint: Footprint): number {
  const player = obstacleOf('player', placeFootprint(footprint, CENTER, 0));
  let distance = STAND_DISTANCE;
  for (;;) {
    // In the model axes, the player faces -z, and the stand faces the player.
    const stand = obstacleOf('stand', placeFootprint(STAND_FOOTPRINT, [0, 0, -distance], 0));
    if (!obstaclesTouch(player, stand, FOOTPRINT_GAP)) {
      return distance;
    }
    distance += CLEAR_STEP;
  }
}

/**
 * Finds if the next player in a row shares the stand of a string player. The players of a
 * string seat share one stand for each two: the players 0 and 1, then 2 and 3.
 */
function sharesWith(member: Member, next: Member | undefined): boolean {
  return (
    member.stand === 'shared' &&
    member.cast.player % 2 === 0 &&
    next?.cast.seatIndex === member.cast.seatIndex
  );
}

/**
 * Finds if a string player has no partner for its stand: the last player of a seat with an odd
 * count.
 */
function standsAlone(member: Member, next: Member | undefined): boolean {
  return member.stand === 'shared' && member.cast.player % 2 === 0 && !sharesWith(member, next);
}

/**
 * Calculates the arc from the seat center of one player to the next in a row. It is at least the
 * mean of their two smallest arcs. It grows until the two players, their own stands, and the
 * stand between them keep the gap (design 4.5).
 *
 * @param left The player on the left, as the audience sees it.
 * @param right The player on the right.
 * @param radius The radius of the row.
 * @returns The arc, in meters.
 */
function spacing(left: Member, right: Member, radius: number): number {
  // The players face the podium, so the left neighbor is on the right side (+x) of a player.
  let arc = Math.max(
    (left.arc + right.arc) / 2,
    -left.footprint.bounds.min[0] + right.footprint.bounds.max[0] + FOOTPRINT_GAP,
  );
  for (;;) {
    const angle = arc / radius;
    const a = placePlayer(left, 0, radius);
    const b = placePlayer(right, angle, radius);
    const stands: PlacedStand[] = [];
    if (left.stand === 'own') {
      stands.push(placeStand(0, radius - left.standDistance, left.index));
    }
    if (right.stand === 'own') {
      stands.push(placeStand(angle, radius - right.standDistance, right.index));
    }
    if (sharesWith(left, right)) {
      stands.push(placeStand(angle / 2, radius - STAND_DISTANCE, -1));
    } else if (standsAlone(left, right)) {
      const alone = aloneStandArc(left, radius) / radius;
      stands.push(placeStand(alone, radius - STAND_DISTANCE, left.index));
    }
    const clear =
      !obstaclesTouch(a.obstacle, b.obstacle, FOOTPRINT_GAP) &&
      stands.every(
        (stand) =>
          (stand.owner === left.index ||
            !obstaclesTouch(stand.obstacle, a.obstacle, FOOTPRINT_GAP)) &&
          (stand.owner === right.index ||
            !obstaclesTouch(stand.obstacle, b.obstacle, FOOTPRINT_GAP)),
      );
    if (clear) {
      return arc;
    }
    arc += CLEAR_STEP;
  }
}

/**
 * The arcs of {@link aloneStandArc} for each player and radius. The spread of a row places the
 * row many times at one radius, so the layout calculates each arc one time.
 */
const aloneStandArcs = new WeakMap<Member, Map<number, number>>();

/**
 * Calculates the arc from a string player with no partner to its stand. The stand stands where a
 * partner of the same seat would share it: half the arc to such a partner, to the right.
 */
function aloneStandArc(member: Member, radius: number): number {
  const known = aloneStandArcs.get(member)?.get(radius);
  if (known !== undefined) {
    return known;
  }
  const partner: Member = { ...member, cast: { ...member.cast, player: member.cast.player + 1 } };
  const arc = spacing(member, partner, radius) / 2;
  const arcs = aloneStandArcs.get(member) ?? new Map<number, number>();
  arcs.set(radius, arc);
  aloneStandArcs.set(member, arcs);
  return arc;
}

/** The arc from the seat center of the leftmost player to the left end of its row. */
function leftEnd(member: Member): number {
  return Math.max(member.arc / 2, member.footprint.bounds.max[0] + FOOTPRINT_GAP / 2);
}

/** The arc from the seat center of the rightmost player to the right end of its row. */
function rightEnd(member: Member): number {
  return Math.max(member.arc / 2, -member.footprint.bounds.min[0] + FOOTPRINT_GAP / 2);
}

/** The arc positions of the players of a row, and the place of 0° on the arc. */
interface Arrangement {
  /** The arc position of each player. */
  readonly at: readonly number[];
  /** The arc position of 0°. */
  readonly zero: number;
  /** The smallest radius that keeps the row within 160°. */
  readonly radius: number;
}

/**
 * Places the players of a row on its arc (design 4.5, seat geometry). In a split row, 0° is
 * between the violins and the other sections, and each side spans at most 80°. Else the row is
 * centered on 0°, and it spans at most 160°.
 *
 * @param members The players from left to right. There is at least one.
 * @param split True for rows 0 and 1.
 * @param radius The radius at which the spacing is measured.
 * @returns The arrangement.
 */
function arrange(members: readonly Member[], split: boolean, radius: number): Arrangement {
  const at: number[] = [];
  members.forEach((member, i) => {
    const previous = members[i - 1];
    at.push(previous ? (at[i - 1] ?? 0) + spacing(previous, member, radius) : 0);
  });
  const first = members[0];
  const last = members.at(-1);
  const from = first ? -leftEnd(first) : 0;
  const to = last ? (at.at(-1) ?? 0) + rightEnd(last) : 0;
  if (!split) {
    return { at, zero: (from + to) / 2, radius: (to - from) / (2 * HALF_SPAN) };
  }
  const lastViolin = members.findLastIndex((m) => m.violin);
  let zero = from;
  if (lastViolin === members.length - 1) {
    zero = to;
  } else if (lastViolin >= 0) {
    zero = ((at[lastViolin] ?? 0) + (at[lastViolin + 1] ?? 0)) / 2;
  }
  return { at, zero, radius: Math.max(zero - from, to - zero) / HALF_SPAN };
}

/**
 * Calculates the angle of each player of a row from its arrangement.
 *
 * @param arrangement The arc positions of the players.
 * @param radius The radius of the row.
 * @returns The angles, in radians. 0 points to the back, and negative angles are on the left.
 */
function rowAngles(arrangement: Arrangement, radius: number): number[] {
  return arrangement.at.map((s) => (s - arrangement.zero) / radius);
}

/**
 * Places the players and the stands of a row at a radius around the podium center.
 *
 * @param members The players from left to right.
 * @param angles The angle of each player.
 * @param radius The radius of the row.
 * @param height The height of the floor of the row.
 * @returns The places, with their obstacles.
 */
function placeRow(
  members: readonly Member[],
  angles: readonly number[],
  radius: number,
  height = 0,
): RowPlacement {
  const players = members.map((member, i) => placePlayer(member, angles[i] ?? 0, radius, height));
  const stands: PlacedStand[] = [];
  members.forEach((member, i) => {
    const angle = angles[i] ?? 0;
    const next = members[i + 1];
    if (member.stand === 'own') {
      stands.push(placeStand(angle, radius - member.standDistance, member.index));
    } else if (sharesWith(member, next)) {
      stands.push(placeStand((angle + (angles[i + 1] ?? angle)) / 2, radius - STAND_DISTANCE, -1));
    } else if (standsAlone(member, next)) {
      const arc = aloneStandArc(member, radius);
      stands.push(placeStand(angle + arc / radius, radius - STAND_DISTANCE, member.index));
    }
  });
  return { players, stands };
}

/** An instrumental row with its radius, the angle of each player, and its places. */
interface FittedRow {
  /** The players from left to right. */
  readonly members: readonly Member[];
  /** The index of the row in {@link ROWS}. */
  readonly row: number;
  /** True for rows 0 and 1, which have the violins left of 0° and the other strings right of it. */
  readonly split: boolean;
  readonly radius: number;
  readonly angles: readonly number[];
  readonly placement: RowPlacement;
}

/**
 * Lists the obstacles of the players and the stands of a row.
 *
 * @param row The places of the row.
 * @returns The obstacles: the players, then the stands.
 */
function obstaclesOfRow(row: RowPlacement): Obstacle[] {
  return [...row.players, ...row.stands].map((p) => p.obstacle);
}

/**
 * Finds if new obstacles come closer than the gap to the obstacles already on the stage.
 *
 * @param fresh The new obstacles.
 * @param placed The obstacles on the stage.
 * @returns True if one pair touches.
 */
function touchesAny(fresh: readonly Obstacle[], placed: readonly Obstacle[]): boolean {
  return fresh.some((a) => placed.some((b) => obstaclesTouch(a, b, FOOTPRINT_GAP)));
}

/**
 * Places a row at the smallest radius that keeps it within its span and clear of the items in
 * front (design 4.5, seat geometry).
 *
 * @param members The players of the row from left to right.
 * @param row The index of the row in {@link ROWS}.
 * @param smallest The radius of the previous row plus 1.2 m.
 * @param placed The obstacles on the stage.
 * @returns The row with its radius, its angles, and its places.
 */
function fitRow(
  members: readonly Member[],
  row: number,
  smallest: number,
  placed: readonly Obstacle[],
): FittedRow {
  const split = row < SPLIT_ROWS;
  let radius = smallest;
  for (;;) {
    const arrangement = arrange(members, split, radius);
    if (arrangement.radius > radius) {
      radius = Math.max(arrangement.radius, radius + CLEAR_STEP);
      continue;
    }
    const angles = rowAngles(arrangement, radius);
    const placement = placeRow(members, angles, radius);
    if (!touchesAny(obstaclesOfRow(placement), placed)) {
      return { members, row, split, radius, angles, placement };
    }
    radius += CLEAR_STEP;
  }
}

/**
 * Divides the singers evenly across the levels of the risers. The lower levels get the extra
 * singers.
 *
 * @param count The number of singers.
 * @param levels The number of levels.
 * @returns The number of singers on each level.
 */
export function divideSingers(count: number, levels: number): number[] {
  return Array.from(
    { length: levels },
    (_, k) => Math.floor(count / levels) + (k < count % levels ? 1 : 0),
  );
}

/**
 * Makes the obstacle of one riser level: one box for each part of at most 5° of its arc.
 *
 * @param level The level.
 * @param podium The podium center.
 * @returns The obstacle.
 */
function riserObstacle(level: RiserLevel, podium: Vec3): Obstacle {
  const parts = Math.max(1, Math.ceil((2 * level.halfAngle) / RISER_BOX_ANGLE));
  const step = (2 * level.halfAngle) / parts;
  const outer = level.radius + RISER.depth / 2;
  const size: Vec3 = [
    2 * outer * Math.sin(step / 2),
    level.height,
    RISER.depth + outer * (1 - Math.cos(step / 2)),
  ];
  const box = footprintOf([centeredBox([0, level.height / 2, 0], size)]);
  const boxes = Array.from({ length: parts }, (_, i) => {
    const spot = seatAt(podium, -level.halfAngle + (i + 0.5) * step, level.radius);
    return placeFootprint(box, spot.position, spot.facing);
  }).flat();
  return obstacleOf(`riser level ${level.level}`, boxes);
}

/** The singers and the risers for one count of levels. */
interface ChoirPlacement {
  readonly singers: readonly PlacedPlayer[];
  readonly risers: readonly RiserLevel[];
  readonly obstacles: readonly Obstacle[];
}

/**
 * Places the singers on the risers behind the orchestra (design 4.5, seat geometry). The singers
 * fill the levels evenly. Level `k` has the radius `r + 0.8 k` and the height `1.0 + 0.25 k`. If a
 * level needs more than 160°, or if the risers touch the orchestra, all levels move back.
 *
 * @param members The singers, in the order of the seats.
 * @param levels The number of levels.
 * @param smallest The radius of the last row plus 1.2 m.
 * @param placed The obstacles on the stage.
 * @returns The singers and the risers.
 */
function fitChoir(
  members: readonly Member[],
  levels: number,
  smallest: number,
  placed: readonly Obstacle[],
): ChoirPlacement {
  const groups: Member[][] = [];
  let next = 0;
  for (const count of divideSingers(members.length, levels)) {
    groups.push(members.slice(next, next + count));
    next += count;
  }
  let radius = smallest;
  for (;;) {
    const levelRadius = (k: number): number => radius + RISER.depth * k;
    const arrangements = groups.map((group, k) => arrange(group, false, levelRadius(k)));
    if (arrangements.some((a, k) => a.radius > levelRadius(k))) {
      radius += CLEAR_STEP;
      continue;
    }
    // All levels span the angle of the widest level of singers.
    const halfAngle = Math.max(
      ...arrangements.map((a, k) => (a.radius * HALF_SPAN) / levelRadius(k)),
    );
    const risers = groups.map((_, k): RiserLevel => ({
      level: k,
      radius: levelRadius(k),
      height: RISER.base + RISER.rise * k,
      halfAngle,
    }));
    const singers = groups.flatMap(
      (group, k) =>
        placeRow(
          group,
          rowAngles(arrangements[k] ?? arrange(group, false, 1), levelRadius(k)),
          levelRadius(k),
          RISER.base + RISER.rise * k,
        ).players,
    );
    const obstacles = [
      ...risers.map((level) => riserObstacle(level, CENTER)),
      ...singers.map((s) => s.obstacle),
    ];
    if (!touchesAny(obstacles, placed)) {
      return { singers, risers, obstacles };
    }
    radius += CLEAR_STEP;
  }
}

/**
 * Places the conductor on the podium top, facing the orchestra (design 4.5).
 *
 * @param podium The podium center.
 * @returns The place of the conductor.
 */
export function conductorOn(podium: Vec3): ConductorPlace {
  return { position: [podium[0], podium[1] + PODIUM_SIZE[1], podium[2]], facing: 0 };
}

/** The label of the obstacle of the podium, the conductor stand, and the conductor. */
export const CONDUCTOR_OBSTACLE = 'podium and conductor';

/**
 * Makes the obstacle of the podium, the conductor stand, and the conductor.
 *
 * @param podium The podium center.
 * @param models The player models of the score.
 * @returns The obstacle.
 */
function conductorObstacle(podium: Vec3, models: ModelCache): Obstacle {
  const [width, height, depth] = PODIUM_SIZE;
  const stand = CONDUCTOR_STAND;
  const deskZ = -stand.forward;
  const boxes = footprintOf([
    centeredBox([0, height / 2, 0], [width, height, depth]),
    centeredBox([0, height + stand.deskHeight / 2, deskZ], [0.24, stand.deskHeight, 0.24]),
    centeredBox(
      [0, height + stand.deskHeight, deskZ],
      [
        stand.deskWidth,
        stand.deskDepth * Math.cos(stand.tilt) + 0.03,
        stand.deskDepth * Math.sin(stand.tilt) + 0.03,
      ],
    ),
  ]);
  const bear = playerFootprint(models.get(CONDUCTOR.species, CONDUCTOR.instrument));
  const conductor = conductorOn(podium);
  return obstacleOf(CONDUCTOR_OBSTACLE, [
    ...placeFootprint(boxes, podium, 0),
    ...placeFootprint(bear, conductor.position, conductor.facing),
  ]);
}

/**
 * Makes the obstacles of a layout: the podium with the conductor, each player with its
 * instrument and its seat, each music stand, and each riser level. The overlap test and the
 * layout use the same footprints.
 *
 * @param layout The layout.
 * @param models The player models of the score. A new cache by default.
 * @returns The obstacles, in the stage axes.
 */
export function layoutObstacles(layout: SceneLayout, models = new ModelCache()): Obstacle[] {
  const players = layout.players.map((place) => {
    const { species, instrument, kettles, support, seatIndex, player } = place.cast;
    return obstacleOf(
      `${species} ${instrument} (seat ${seatIndex}, player ${player})`,
      placeFootprint(
        playerFootprint(models.get(species, instrument, kettles, support)),
        place.position,
        place.facing,
      ),
    );
  });
  const stands = layout.stands.map((stand, i) =>
    obstacleOf(`stand ${i}`, placeFootprint(STAND_FOOTPRINT, stand.position, stand.facing)),
  );
  const risers = layout.risers.map((level) => riserObstacle(level, layout.podium));
  // The levels of the risers stand against each other, so they form one obstacle.
  const riserBlock =
    risers.length > 0
      ? [
          obstacleOf(
            'risers',
            risers.flatMap((r) => r.boxes),
          ),
        ]
      : [];
  return [conductorObstacle(layout.podium, models), ...players, ...stands, ...riserBlock];
}

/**
 * Turns a footprint by a quarter turn to the left around y, as a facing of +π/2 turns a model.
 * A point (x, z) goes to (z, -x), so each box stays a box.
 *
 * @param footprint The footprint.
 * @returns The turned footprint.
 */
function quarterTurn(footprint: Footprint): Footprint {
  return footprintOf(
    footprint.boxes.map((b) => ({
      min: [b.min[2], b.min[1], -b.max[0]],
      max: [b.max[2], b.max[1], -b.min[0]],
    })),
  );
}

/**
 * Makes the member of the layout for one player.
 *
 * @param cast The cast of the player.
 * @param index The index of the player in the cast.
 * @param section The section of its seat.
 * @param models The player models of the score.
 * @param turned True for a keyboard of the orchestra, which turns by {@link KEYBOARD_TURN}.
 * @returns The member.
 */
function memberOf(
  cast: PlayerCast,
  index: number,
  section: PlayingSection,
  models: ModelCache,
  turned: boolean,
): Member {
  const model = models.get(cast.species, cast.instrument, cast.kettles, cast.support);
  const footprint = turned ? quarterTurn(playerFootprint(model)) : playerFootprint(model);
  const stand = STAND_USE[section];
  return {
    index,
    cast,
    model,
    footprint,
    turn: turned ? KEYBOARD_TURN : 0,
    arc: section === 'choir' ? SINGER_ARC : SEATED_ARC,
    stand,
    standDistance: stand === 'own' ? ownStandDistance(footprint) : STAND_DISTANCE,
    violin: section === 'violin',
  };
}

/**
 * Finds the row group of a player.
 *
 * @param seat The seat of the player.
 * @param player The index of the player in its seat.
 * @returns The group: the section, the first violin seat, or the other violin seats. A violin,
 *   viola, or cello player after the first desk gets the group with the suffix `-b`.
 */
function groupOf(seat: Seat, player: number): RowGroup {
  if (seat.section === 'sound-only') {
    return 'choir';
  }
  let desk: DeskSection;
  if (seat.section === 'violin') {
    desk = seat.indexInSection === 0 ? 'violin-1' : 'violin-2';
  } else if (seat.section === 'viola' || seat.section === 'cello') {
    desk = seat.section;
  } else {
    return seat.section;
  }
  return player < DESK_SIZE ? desk : `${desk}-b`;
}

/** The items of a layout with the podium center at the origin. */
interface Draft {
  readonly players: readonly (PlayerPlace | undefined)[];
  readonly stands: readonly StandPlace[];
  readonly risers: readonly RiserLevel[];
  readonly obstacles: readonly Obstacle[];
  /** The largest z of the soloist, with its instrument, or -Infinity with no soloist. */
  readonly soloistFront: number;
}

/** The stage side `S` and the front distance `F` (design 4.5, stage origin), in meters. */
interface StageSize {
  readonly side: number;
  readonly front: number;
}

/**
 * Calculates the stage side and the front distance of a draft (design 4.5, stage origin). The
 * half width `L` is the largest `|x|` of a seat plus 0.5 m for the chair and 0.3 m of margin, or
 * of a footprint box plus 0.3 m. The depth `D` follows the same rule behind the podium.
 *
 * @param draft The draft, with the podium center at the origin.
 * @returns The stage side `S` and the front distance `F`.
 */
function stageOf(draft: Draft): StageSize {
  const seats = draft.players.filter((p): p is PlayerPlace => p !== undefined);
  const boxes = draft.obstacles.flatMap((o) => o.boxes);
  const reachX = (b: PlacedBox): number => b.halfX * Math.abs(b.cos) + b.halfZ * Math.abs(b.sin);
  const reachZ = (b: PlacedBox): number => b.halfX * Math.abs(b.sin) + b.halfZ * Math.abs(b.cos);
  const halfWidth = Math.max(
    ...seats.map((p) => Math.abs(p.position[0]) + CHAIR_ROOM + EDGE_MARGIN),
    ...boxes.map((b) => Math.abs(b.x) + reachX(b) + EDGE_MARGIN),
  );
  const front = Math.max(PODIUM_FROM_FRONT, draft.soloistFront + EDGE_MARGIN);
  const behind = Math.max(
    0,
    ...seats.map((p) => -p.position[2] + CHAIR_ROOM + EDGE_MARGIN),
    ...boxes.map((b) => -b.z + reachZ(b) + EDGE_MARGIN),
  );
  return { side: Math.max(SMALLEST_STAGE, 2 * halfWidth, front + behind), front };
}

/**
 * Places the pianist with the piano and the bench: the case center 2.0 m to the left of the
 * podium center and 0.8 m to the front, with the long axis along x and the keys at the left
 * end. The pianist faces +x, toward the conductor (design 4.5, seat geometry).
 *
 * @param member The pianist.
 * @returns The place of the pianist, its obstacle, and the largest z of the piano.
 */
function placePiano(member: Member): PlacedPlayer & { readonly front: number } {
  const piano = member.model.pieces.find((p) => p.piece.bone === 'instrument');
  const bounds = piano ? pieceBounds(piano.piece) : { min: CENTER, max: CENTER };
  const offset = piano?.at.position ?? CENTER;
  const cx = offset[0] + (bounds.min[0] + bounds.max[0]) / 2;
  const cz = offset[2] + (bounds.min[2] + bounds.max[2]) / 2;
  // Facing +x moves a point (x, z) of the model to (-z, x).
  const position: Vec3 = [PIANO_CENTER[0] + cz, 0, PIANO_CENTER[1] - cx];
  return {
    index: member.index,
    place: {
      position,
      facing: PIANIST_FACING,
      support: member.cast.support,
      cast: member.cast,
    },
    obstacle: obstacleOf(
      `${member.cast.species} piano`,
      placeFootprint(member.footprint, position, PIANIST_FACING),
    ),
    front: position[2] + offset[0] + bounds.max[0],
  };
}

/**
 * Places the soloist of the score at the front left of the conductor (design 4.2, 4.5). The
 * pianist sits at the piano ({@link placePiano}). Another soloist stands or sits at
 * {@link SOLOIST_PLACE}, faces the audience, and turns 40° to the conductor. It has no music
 * stand, because a soloist plays from memory.
 *
 * @param member The soloist.
 * @returns The place of the soloist, its obstacle, and the largest z of its footprint.
 */
function placeSoloist(member: Member): PlacedPlayer & { readonly front: number } {
  if (member.cast.instrument === 'piano') {
    return placePiano(member);
  }
  const position: Vec3 = [SOLOIST_PLACE[0], 0, SOLOIST_PLACE[1]];
  const obstacle = obstacleOf(
    `${member.cast.species} ${member.cast.instrument} (seat ${member.cast.seatIndex}, player ${member.cast.player})`,
    placeFootprint(member.footprint, position, SOLOIST_FACING),
  );
  const front = Math.max(
    ...obstacle.boxes.map((b) => b.z + b.halfX * Math.abs(b.sin) + b.halfZ * Math.abs(b.cos)),
  );
  return {
    index: member.index,
    place: { position, facing: SOLOIST_FACING, support: member.cast.support, cast: member.cast },
    obstacle,
    front,
  };
}

/** The limits of the spread of a row (design 4.5, seat geometry). */
export interface SpreadLimits {
  /** The largest angle of a seat from 0°, in radians: 90°. */
  readonly maxAngle: number;
  /** The largest arc between two neighbors of a row, in meters: 1.6. */
  readonly maxArc: number;
}

/**
 * The limits of the spread (design 4.5, seat geometry). In the reference image, the seats reach
 * ±90°, and two neighbors are 1.1 to 1.7 m apart.
 */
export const SPREAD_LIMITS: SpreadLimits = { maxAngle: (90 * Math.PI) / 180, maxArc: 1.6 };

/** The step of the spread factor of one side of a row. */
const SPREAD_STEP = 0.02;

/**
 * Finds if each box of a row keeps the edge margin from the side edges, the front edge, and the
 * back edge of the stage.
 *
 * @param row The places of the row, relative to the podium center.
 * @param stage The stage side and the front distance.
 * @returns True if each box is inside.
 */
function rowOnStage(row: RowPlacement, stage: StageSize): boolean {
  const half = stage.side / 2;
  return obstaclesOfRow(row).every((obstacle) =>
    obstacle.boxes.every((b) => {
      const reachX = b.halfX * Math.abs(b.cos) + b.halfZ * Math.abs(b.sin);
      const reachZ = b.halfX * Math.abs(b.sin) + b.halfZ * Math.abs(b.cos);
      return (
        Math.abs(b.x) + reachX <= half - EDGE_MARGIN + 1e-9 &&
        b.z + reachZ <= stage.front - EDGE_MARGIN + 1e-9 &&
        -b.z + reachZ <= stage.side - stage.front - EDGE_MARGIN + 1e-9
      );
    }),
  );
}

/**
 * Calculates the angles of a row after the spread of one side. Each arc between two neighbors
 * on that side, and the arc from 0° to the innermost player, grows by a factor up to 1.6 m. An
 * arc that is already longer stays. With no player at 0°, the innermost arc of a centered row
 * grows up to half of 1.6 m, because the innermost player of the other side shares it. The
 * innermost arc of rows 0 and 1 is the gap of the conductor, and it grows with no limit.
 *
 * @param row The row.
 * @param side -1 for the players left of 0°, 1 for the players right of 0°.
 * @param factor The factor of the arcs, at least 1.
 * @returns The angle of each player.
 */
function spreadAngles(row: FittedRow, side: -1 | 1, factor: number): number[] {
  const { radius, angles } = row;
  const { maxArc } = SPREAD_LIMITS;
  const order = angles
    .map((angle, i) => ({ arc: angle * side * radius, i }))
    .filter((p) => p.arc > 1e-9)
    .toSorted((a, b) => a.arc - b.arc);
  const middle = angles.some((a) => Math.abs(a) <= 1e-9);
  let innerLimit = maxArc / 2;
  if (middle) {
    innerLimit = maxArc;
  } else if (row.split) {
    innerLimit = Infinity;
  }
  const grow = (arc: number, limit: number): number =>
    arc >= limit ? arc : Math.min(limit, arc * factor);
  const next = [...angles];
  let previous = 0;
  let at = 0;
  order.forEach((p, k) => {
    at += grow(p.arc - previous, k === 0 ? innerLimit : maxArc);
    previous = p.arc;
    next[p.i] = (side * at) / radius;
  });
  return next;
}

/**
 * Spreads the players of one side of a row with the largest factor, in steps of 0.02 down from
 * 1.6 / 0.95, that keeps the limits (design 4.5, seat geometry). Each seat stays within ±90°,
 * each box keeps 0.3 m from the edges, and each footprint keeps 0.05 m from the other items.
 * {@link spreadAngles} keeps the arcs at most 1.6 m. The spread only makes the arcs of a row
 * longer, so the items of the row stay apart. The overlap test of the layouts checks all pairs.
 *
 * @param row The row.
 * @param side -1 for the players left of 0°, 1 for the players right of 0°.
 * @param placed The obstacles of the other items on the stage.
 * @param stage The stage side and the front distance.
 * @returns The row with the new angles, or the same row if no factor above 1 fits.
 */
function spreadSide(
  row: FittedRow,
  side: -1 | 1,
  placed: readonly Obstacle[],
  stage: StageSize,
): FittedRow {
  const { maxAngle, maxArc } = SPREAD_LIMITS;
  for (let k = maxArc / SEATED_ARC; k > 1 + 1e-9; k -= SPREAD_STEP) {
    const next = spreadAngles(row, side, k);
    if (next.some((a) => Math.abs(a) > maxAngle + 1e-9)) {
      continue;
    }
    const placement = placeRow(row.members, next, row.radius);
    if (rowOnStage(placement, stage) && !touchesAny(obstaclesOfRow(placement), placed)) {
      return { ...row, angles: next, placement };
    }
  }
  return row;
}

/** The row of the desks after the first desk of each string seat. */
const BACK_DESK_ROW = 1;

/** The step of the blend of the back desks toward their wedges. */
const WEDGE_STEP = 0.1;

/**
 * Calculates the angles that put the back desks of one side of row 1 behind the first desks of
 * their seats in row 0. The players of one seat keep their packed arcs around the middle angle
 * of the first desk. Then a pass from 0° to the outside keeps each packed arc between two
 * neighbors, and the packed arc from 0° to the innermost player, as a minimum.
 *
 * @param packed Row 1 before the spread.
 * @param front Row 0 after the spread.
 * @param side -1 for the players left of 0°, 1 for the players right of 0°.
 * @returns The angle of each player. The players of the other side keep their packed angles.
 */
function wedgeAngles(packed: FittedRow, front: FittedRow, side: -1 | 1): number[] {
  const middle = (angles: readonly number[], at: (i: number) => boolean, seat: number): number => {
    const own = angles.filter((_, i) => at(i) && packed.members[i]?.cast.seatIndex === seat);
    return own.reduce((sum, a) => sum + a, 0) / own.length;
  };
  const frontDesk = (seat: number): number => {
    const own = front.angles.filter((_, i) => {
      const cast = front.members[i]?.cast;
      return cast?.seatIndex === seat && cast.player < DESK_SIZE;
    });
    return own.reduce((sum, a) => sum + a, 0) / own.length;
  };
  const onSide = (i: number): boolean => side * (packed.angles[i] ?? 0) > 0;
  const next = packed.angles.map((angle, i) => {
    if (!onSide(i)) {
      return angle;
    }
    const seat = packed.members[i]?.cast.seatIndex ?? -1;
    const target = frontDesk(seat);
    return Number.isFinite(target) ? target + angle - middle(packed.angles, onSide, seat) : angle;
  });
  const order = packed.angles
    .map((angle, i) => ({ out: side * angle, i }))
    .filter((p) => p.out > 0)
    .toSorted((a, b) => a.out - b.out);
  let inner = 0;
  let innerPacked = 0;
  for (const { out, i } of order) {
    const at = Math.max(side * (next[i] ?? 0), inner + out - innerPacked);
    next[i] = side * at;
    inner = at;
    innerPacked = out;
  }
  return next;
}

/**
 * Moves the back desks of one side of row 1 toward the first desks of their seats in row 0, as
 * the wedges of the strings of a professional orchestra (design 4.5, seat geometry). The row
 * takes the largest blend, in steps of 0.1, between the spread angles and the angles of
 * {@link wedgeAngles} that keeps each seat within ±90°, each box 0.3 m from the edges, and each
 * footprint 0.05 m from the other items.
 *
 * @param spread Row 1 after the spread.
 * @param packed Row 1 before the spread.
 * @param front Row 0 after the spread.
 * @param side -1 for the players left of 0°, 1 for the players right of 0°.
 * @param placed The obstacles of the other items on the stage.
 * @param stage The stage side and the front distance.
 * @returns The row with the new angles, or the spread row if no blend fits.
 */
function wedgeSide(
  spread: FittedRow,
  packed: FittedRow,
  front: FittedRow,
  side: -1 | 1,
  placed: readonly Obstacle[],
  stage: StageSize,
): FittedRow {
  const target = wedgeAngles(packed, front, side);
  const steps = Math.round(1 / WEDGE_STEP);
  for (let k = steps; k > 0; k--) {
    const blend = k / steps;
    const next = spread.angles.map((angle, i) =>
      side * (packed.angles[i] ?? 0) > 0 ? angle + blend * ((target[i] ?? angle) - angle) : angle,
    );
    if (next.some((a) => Math.abs(a) > SPREAD_LIMITS.maxAngle + 1e-9)) {
      continue;
    }
    const placement = placeRow(spread.members, next, spread.radius);
    if (rowOnStage(placement, stage) && !touchesAny(obstaclesOfRow(placement), placed)) {
      return { ...spread, angles: next, placement };
    }
  }
  return spread;
}

/**
 * Spreads each instrumental row inside the stage, from the front (design 4.5, seat geometry). The
 * packed rows end at ±43° to ±74°, so the front corners of the stage stayed empty. The left side
 * and the right side of a row each get their own factor. Rows 0 and 1 keep the violins left of
 * 0° and the other strings right of it. After its spread, row 1 moves its back desks toward their
 * first desks ({@link wedgeSide}). The stage side does not change.
 *
 * @param rows The packed rows, from the front.
 * @param fixed The obstacles that do not move: the podium with the conductor, the piano, the
 *   risers, and the singers.
 * @param stage The stage side and the front distance.
 * @returns The rows after the spread.
 */
function spreadRows(
  rows: readonly FittedRow[],
  fixed: readonly Obstacle[],
  stage: StageSize,
): FittedRow[] {
  const done: FittedRow[] = [];
  rows.forEach((row, n) => {
    const placed = [
      ...fixed,
      ...done.flatMap((r) => obstaclesOfRow(r.placement)),
      ...rows.slice(n + 1).flatMap((r) => obstaclesOfRow(r.placement)),
    ];
    let next = spreadSide(spreadSide(row, -1, placed, stage), 1, placed, stage);
    const front = done.find((r) => r.row === 0);
    if (row.row === BACK_DESK_ROW && front) {
      next = wedgeSide(next, row, front, -1, placed, stage);
      next = wedgeSide(next, row, front, 1, placed, stage);
    }
    done.push(next);
  });
  return done;
}

/**
 * Checks that each player of the cast has a place, and gives the places in the order of the cast
 * (design 5.1).
 *
 * @param places The place of each player in the order of the cast, or `undefined` for a player
 *   that no row placed.
 * @param cast The cast, for the message of the error.
 * @returns The places.
 * @throws {Error} If a player has no place, because then `SceneLayout.players` no longer
 *   follows the order of the cast.
 */
export function placesOfCast(
  places: readonly (PlayerPlace | undefined)[],
  cast: readonly PlayerCast[],
): PlayerPlace[] {
  return places.map((place, i) => {
    if (!place) {
      const c = cast[i];
      throw new Error(
        `The layout has no place for player ${i} (${c?.species} ${c?.instrument}, seat ${c?.seatIndex}).`,
      );
    }
    return place;
  });
}

/**
 * Calculates the positions of the stage, the players, the music stands, and the risers for a
 * score (design 4.5, 5.1). The sections sit in rows around the podium. The footprints of the
 * players, their instruments, their seats, and the stands keep 0.05 m from each other: a seat
 * arc grows for a wide footprint, and a row moves back until it is clear of the items in front.
 *
 * @param score The score.
 * @param models The player models of the score. The pose plan and the scene can share this cache,
 *   so that each kind of player builds its model one time. A new cache by default.
 * @returns The layout, with the players in the order of `castScore()`.
 * @throws {Error} If a player has no place.
 */
export function layoutScene(score: Score, models = new ModelCache()): SceneLayout {
  const cast = castScore(score);
  const groups: RowGroup[] = [];
  const members = cast.map((c, index) => {
    const seat = score.seats[c.seatIndex];
    if (c.seatIndex === score.soloist) {
      groups.push('soloist');
    } else {
      groups.push(seat ? groupOf(seat, c.player) : 'choir');
    }
    const section = !seat || seat.section === 'sound-only' ? 'choir' : seat.section;
    return memberOf(c, index, section, models, groups.at(-1) === 'piano');
  });
  const inGroup = (group: RowGroup): Member[] => members.filter((m) => groups[m.index] === group);
  const players: (PlayerPlace | undefined)[] = members.map(() => undefined);
  const fixed: Obstacle[] = [conductorObstacle(CENTER, models)];

  let soloistFront = -Infinity;
  for (const member of inGroup('soloist')) {
    const soloist = placeSoloist(member);
    players[member.index] = soloist.place;
    fixed.push(soloist.obstacle);
    soloistFront = Math.max(soloistFront, soloist.front);
  }

  const rows: FittedRow[] = [];
  let radius = FIRST_ROW_RADIUS - ROW_STEP;
  ROWS.forEach((rowGroups, n) => {
    const row = rowGroups.flatMap(inGroup);
    if (row.length === 0) {
      return;
    }
    const placed = [...fixed, ...rows.flatMap((r) => obstaclesOfRow(r.placement))];
    const fit = fitRow(row, n, radius + ROW_STEP, placed);
    radius = fit.radius;
    rows.push(fit);
  });
  const withRows = (fitted: readonly FittedRow[]): (PlayerPlace | undefined)[] => {
    const places = [...players];
    for (const p of fitted.flatMap((r) => r.placement.players)) {
      places[p.index] = p.place;
    }
    return places;
  };
  const obstacles = [...fixed, ...rows.flatMap((r) => obstaclesOfRow(r.placement))];
  const stands = rows.flatMap((r) => r.placement.stands.map((stand) => stand.place));

  const empty: ChoirPlacement = { singers: [], risers: [], obstacles: [] };
  let choir = empty;
  let draft: Draft = { players: withRows(rows), stands, risers: [], obstacles, soloistFront };
  const singers = inGroup('choir');
  // The count of levels that gives the smallest stage wins, and fewer levels win a tie.
  let best = Infinity;
  for (let levels = 1; levels <= Math.min(RISER.levels, singers.length); levels++) {
    const candidateChoir = fitChoir(singers, levels, radius + ROW_STEP, obstacles);
    const withChoir = withRows(rows);
    for (const s of candidateChoir.singers) {
      withChoir[s.index] = s.place;
    }
    const candidate: Draft = {
      players: withChoir,
      stands,
      risers: candidateChoir.risers,
      obstacles: [...obstacles, ...candidateChoir.obstacles],
      soloistFront,
    };
    const { side } = stageOf(candidate);
    if (side < best - 1e-9) {
      best = side;
      draft = candidate;
      choir = candidateChoir;
    }
  }

  const stage = stageOf(draft);
  // The rows spread inside the stage, and the stage side stays (design 4.5, stage origin).
  const spread = spreadRows(rows, [...fixed, ...choir.obstacles], stage);
  const places = withRows(spread);
  for (const s of choir.singers) {
    places[s.index] = s.place;
  }
  const podium: Vec3 = [0, 0, stage.side / 2 - stage.front];
  const move = (p: Vec3): Vec3 => [p[0] + podium[0], p[1] + podium[1], p[2] + podium[2]];
  return {
    stageSide: stage.side,
    podium,
    conductor: conductorOn(podium),
    players: placesOfCast(places, cast).map((p): PlayerPlace => ({
      position: move(p.position),
      facing: p.facing,
      support: p.support,
      cast: p.cast,
    })),
    stands: spread
      .flatMap((r) => r.placement.stands)
      .map((stand): StandPlace => ({
        position: move(stand.place.position),
        facing: stand.place.facing,
      })),
    risers: draft.risers,
  };
}
