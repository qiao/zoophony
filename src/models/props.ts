import { MathUtils, Quaternion, Vector3 } from 'three';
import { SCENE_COLORS } from './colors.ts';
import { PIANO_BENCH, buildPianoBench } from './instruments/piano.ts';
import { toQuat, toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { centeredBox } from './bounds.ts';
import type { Bounds } from './bounds.ts';
import type { RiserLevel, SceneLayout } from './layout.ts';
import { MeshBuilder, splitByFacing, srgb, transform } from './mesh.ts';
import type { MeshData, Rgb, Transform } from './mesh.ts';
import { box, quad } from './primitives.ts';
import { proportionsOf } from './proportions.ts';
import { SPECIES } from './species.ts';
import type { SpeciesParams } from './species.ts';

/**
 * The colors of the stage, the steps, the podium, and the choir risers (design 4.5, scene
 * colors), in linear values. The stage is glossy walnut, as in `mockup.png` and `scene.png`.
 */
export const STAGE_COLORS = {
  /** The mean color of a plank. Each plank has its own tone around it. */
  plank: srgb('#3b2618'),
  /** The dark line between two planks. */
  seam: srgb('#301c0f'),
  /** The raised lip around the stage top, with a round top that catches the light. */
  nosing: srgb('#5e3c24'),
  /** The skirt: the front and the sides of the stage, and the step rises. */
  skirt: srgb('#3c2416'),
  /** The grooves of the skirt panels. */
  groove: srgb('#26160d'),
  /** The body of the podium, and the frames around the panels of its sides. */
  podium: srgb('#6c4429'),
  /** The boards of the treads of the choir risers, lighter than the stage, as in `orchestra-side.png`. */
  riserTread: srgb('#553620'),
  /** The lighter front edge of each tread of the choir risers. */
  riserNosing: srgb('#7b5335'),
  /** The panels of the sides of the podium, inside their frames. */
  podiumPanel: srgb('#58371f'),
  /** The top plate of the podium and the frame of its top, a little lighter, as in `mockup.png`. */
  podiumTop: srgb('#80532f'),
  /** The panel of the top of the podium, inside its frame and a dark groove. */
  podiumTopPanel: srgb('#73492a'),
} as const satisfies Readonly<Record<string, Rgb>>;

/**
 * The item that a player sits or stands on (design 5.1). `stand` is the floor or the podium, and
 * `riser` is a level of the choir risers.
 */
export type Support = 'chair' | 'stool' | 'high-stool' | 'bench' | 'stand' | 'riser';

/**
 * The chair (design 4.5, props). The player sits on it and faces -z. The seat of each chair fits
 * the legs of its species (`seatHeights()`).
 */
export const CHAIR = {
  seatWidth: 0.42,
  seatDepth: 0.4,
  /** The height of the top of the back above the seat. A lower seat has a lower back. */
  back: 0.5,
  /**
   * The height of the one wide top rail of the back. The rail ends at the back top, and the back
   * is open below it, as on the chairs of `animals.webp`.
   */
  rail: 0.1,
} as const;

/** The heights of a seat (design 4.5, props). */
export interface SeatHeights {
  /** The height of the top of the seat above the floor, in meters. */
  readonly seatHeight: number;
  /**
   * The height of the rest under the feet, in meters: 0 for the floor, or the height of the foot
   * ring of the high stool.
   */
  readonly footHeight: number;
}

/**
 * The stool of the harp (design 4.5, props), with no back. Its seat has the height of the chair of
 * 2026-10-06, for the strings of the harp.
 */
export const STOOL = {
  seatHeight: 0.35,
  seatSize: 0.36,
} as const;

/**
 * The high stool of the contrabass (design 4.5, props). Its seat keeps its height for the
 * contrabass. The feet rest on a ring between the legs, at the legs of the species below the seat
 * (`seatHeights()`).
 */
export const HIGH_STOOL = {
  seatHeight: 0.7,
  seatSize: 0.36,
} as const;

/**
 * The depth of each level of the choir risers, the height of the lowest level, and the rise of
 * each higher level (design 4.5). The lowest level stands 1.0 m high, so that a large animal of
 * the back row hides no head of a singer.
 */
export const RISER = {
  /** The depth of each level, in meters. The singers stand on its middle. */
  depth: 0.8,
  /** The height of the lowest level above the stage top, in meters. */
  base: 1.0,
  /** The height of each higher level above the level in front of it, in meters. */
  rise: 0.25,
  /** The most levels. */
  levels: 3,
  /**
   * The steps in front of the lowest level, from the stage top up to it, as the wooden risers of
   * `orchestra-latest.png` and `orchestra-side.png`. The steps divide the height of the lowest
   * level evenly: three steps give the rise of 0.25 m of the levels. No singer stands on them.
   */
  steps: { count: 3, depth: 0.2 },
  /** The width of the lighter edge at the front of each tread, in meters. */
  nosing: 0.04,
  /** The widest board of a tread, in meters. A dark line divides a deeper tread into boards. */
  board: 0.4,
  /**
   * The arc of the risers past the outermost singer on each side, in meters at the lowest level.
   * The risers of `orchestra-latest.png` and `orchestra-side.png` reach past the choir.
   */
  wing: 1.0,
} as const;

/**
 * Gives the depth of the steps in front of the lowest level of the risers (design 4.5).
 *
 * @returns The depth, in meters.
 */
export function riserStepsDepth(): number {
  return RISER.steps.count * RISER.steps.depth;
}

/** The music stand (design 4.5, props). The reader is at +z and faces -z. */
export const MUSIC_STAND = {
  deskWidth: 0.5,
  deskDepth: 0.35,
  deskHeight: 1.05,
  /** The tilt of the desk toward the reader. */
  tilt: 30 * MathUtils.DEG2RAD,
  /** The length of each leg of the tripod base. */
  legLength: 0.24,
} as const;

/** The width of the legs and of the back posts of the chair. */
const CHAIR_LEG = 0.035;

/**
 * Gives the heights of the seat of a body on a support (design 4.5, props). The chair fits the
 * legs of the species: its seat is the `seatHeight` of the skeleton above the floor. The high
 * stool keeps its seat for the contrabass, and its foot ring is the `seatHeight` of the skeleton
 * below the seat. The stool of the harp keeps its height, because the strings need the body at
 * that height. The piano bench keeps its height for the parametric biped and the penguin. Under
 * a studio body, such as the polar bear, it fits the legs, as the chair does (design 4.4).
 *
 * @param support The support.
 * @param species The species of the body.
 * @returns The heights, or `null` for a standing body.
 */
export function seatHeights(support: Support, species: SpeciesParams): SeatHeights | null {
  const proportions = proportionsOf(species);
  const legs = proportions.seatHeight * proportions.headHeight;
  switch (support) {
    case 'chair':
      return { seatHeight: legs, footHeight: 0 };
    case 'stool':
      return { seatHeight: STOOL.seatHeight, footHeight: 0 };
    case 'high-stool':
      return { seatHeight: HIGH_STOOL.seatHeight, footHeight: HIGH_STOOL.seatHeight - legs };
    case 'bench':
      return {
        seatHeight: species.body && species.body !== 'penguin' ? legs : PIANO_BENCH.seatHeight,
        footHeight: 0,
      };
    case 'stand':
    case 'riser':
      return null;
    default: {
      const unhandled: never = support;
      throw new Error(`The support "${String(unhandled)}" is not known.`);
    }
  }
}

/**
 * Gives the boxes of the chair back: the two back legs, which go on up to the top of the back, and
 * the wide top rail (design 4.5). The back keeps its height above the seat. The seat center is
 * above the origin, and the back is at +z.
 *
 * @param seatHeight The height of the seat, in meters.
 * @returns The boxes.
 */
export function chairBack(seatHeight: number): Bounds[] {
  const c = CHAIR;
  const top = seatHeight + c.back;
  const x = c.seatWidth / 2 - CHAIR_LEG / 2;
  const z = c.seatDepth / 2 - CHAIR_LEG / 2;
  return [
    ...[-x, x].map((px) => centeredBox([px, top / 2, z], [CHAIR_LEG, top, CHAIR_LEG])),
    centeredBox([0, top - c.rail / 2, z], [c.seatWidth - 2 * CHAIR_LEG, c.rail, 0.025]),
  ];
}

/**
 * Adds a box part to a mesh.
 *
 * @param builder The mesh.
 * @param part The box.
 * @param color The color.
 */
function addBox(builder: MeshBuilder, part: Bounds, color: Rgb): void {
  const { min, max } = part;
  builder.add(box(max[0] - min[0], max[1] - min[1], max[2] - min[2]), {
    color,
    at: transform([(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]),
  });
}

/**
 * Builds a chair: a seat, four legs, two back posts, and a wide top rail (design 4.5). The seat
 * center is above the origin, and the back is at +z.
 *
 * @param seatHeight The height of the seat, in meters.
 * @returns The mesh data, with all vertices on bone 0.
 */
export function buildChair(seatHeight: number): MeshData {
  const c = { ...CHAIR, seatHeight };
  const builder = new MeshBuilder();
  const color = SCENE_COLORS.chair;
  const x = c.seatWidth / 2 - CHAIR_LEG / 2;
  const z = c.seatDepth / 2 - CHAIR_LEG / 2;
  addBox(
    builder,
    centeredBox([0, c.seatHeight - 0.02, 0], [c.seatWidth, 0.04, c.seatDepth]),
    color,
  );
  for (const side of [-1, 1]) {
    // A front leg up to the seat. The back legs are the posts of the back.
    const legHeight = c.seatHeight - 0.04;
    addBox(
      builder,
      centeredBox([side * x, legHeight / 2, -z], [CHAIR_LEG, legHeight, CHAIR_LEG]),
      color,
    );
  }
  for (const part of chairBack(seatHeight)) {
    addBox(builder, part, color);
  }
  return builder.build();
}

/**
 * Builds a music stand: a tripod base, a post, a tilted desk, and a white sheet (design 4.5).
 * The post stands on the origin. The reader is at +z, so the desk faces +z.
 *
 * @returns The mesh data, with all vertices on bone 0.
 */
export function buildMusicStand(): MeshData {
  const s = MUSIC_STAND;
  const builder = new MeshBuilder();
  const color = SCENE_COLORS.stand;
  for (let i = 0; i < 3; i++) {
    const turn = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      (i * 120 + 60) * MathUtils.DEG2RAD,
    );
    const center = new Vector3(0, 0, s.legLength / 2)
      .applyQuaternion(turn)
      .add(new Vector3(0, 0.05, 0));
    // Each leg leans 20° down from the post to the floor.
    const leanAxis = new Vector3(1, 0, 0).applyQuaternion(turn).normalize();
    const lean = new Quaternion().setFromAxisAngle(leanAxis, 20 * MathUtils.DEG2RAD);
    builder.add(box(0.015, 0.015, s.legLength), {
      color,
      at: transform(toVec3(center), toQuat(lean.multiply(turn))),
    });
  }
  builder.add(box(0.02, s.deskHeight, 0.02), { color, at: transform([0, s.deskHeight / 2, 0]) });
  // The desk is a vertical plate that leans back by the tilt, so that its face points to the reader.
  const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -s.tilt);
  const deskCenter = new Vector3(0, s.deskHeight, 0);
  addDesk(
    builder,
    box(s.deskWidth, s.deskDepth, 0.012),
    transform(toVec3(deskCenter), toQuat(tilt)),
  );
  // The sheet is one quad a little in front of the desk.
  const w = s.deskWidth / 2 - 0.04;
  const d = s.deskDepth / 2 - 0.04;
  const front = 0.0075;
  const corner = (cx: number, cy: number): Vec3 =>
    toVec3(new Vector3(cx, cy, front).applyQuaternion(tilt).add(deskCenter));
  builder.add(quad(corner(-w, -d), corner(w, -d), corner(w, d), corner(-w, d)), {
    color: SCENE_COLORS.sheet,
  });
  return builder.build();
}

/**
 * Adds the desk of a stand (design 4.5): its two large faces in a dark warm gray, and its four
 * narrow faces in a lighter color, so that the desk reads as an object with an edge.
 *
 * @param builder The builder.
 * @param plate The corner list of the desk plate, with its large faces along z.
 * @param at The place of the desk.
 */
export function addDesk(builder: MeshBuilder, plate: readonly number[], at: Transform): void {
  const [front, rest] = splitByFacing(plate, [0, 0, 1], 0.99);
  const [back, edges] = splitByFacing(rest, [0, 0, -1], 0.99);
  builder.add([...front, ...back], { color: SCENE_COLORS.standDesk, at });
  builder.add(edges, { color: SCENE_COLORS.standEdge, at });
}

/**
 * Builds a stool with four legs and no back: the stool of the harp, or the high stool of the
 * contrabass with its foot ring (design 4.5). The seat center is above the origin.
 *
 * @param high True for the high stool.
 * @param seat The heights of the seat and of the foot ring. The stool of the harp has no ring.
 * @returns The mesh data, with all vertices on bone 0.
 */
export function buildStool(high: boolean, seat: SeatHeights): MeshData {
  const { seatHeight } = seat;
  const { seatSize } = high ? HIGH_STOOL : STOOL;
  const builder = new MeshBuilder();
  const color = SCENE_COLORS.chair;
  addBox(builder, centeredBox([0, seatHeight - 0.02, 0], [seatSize, 0.04, seatSize]), color);
  const legHeight = seatHeight - 0.04;
  const at = seatSize / 2 - CHAIR_LEG / 2;
  for (const x of [-at, at]) {
    for (const z of [-at, at]) {
      addBox(builder, centeredBox([x, legHeight / 2, z], [CHAIR_LEG, legHeight, CHAIR_LEG]), color);
    }
  }
  if (high) {
    // The foot ring: four rails between the legs, with their tops at the height of the ring.
    const rail = seatSize - 2 * CHAIR_LEG;
    const y = seat.footHeight - 0.0125;
    for (const side of [-at, at]) {
      addBox(builder, centeredBox([0, y, side], [rail, 0.025, 0.025]), color);
      addBox(builder, centeredBox([side, y, 0], [0.025, 0.025, rail]), color);
    }
  }
  return builder.build();
}

/**
 * Builds the seat of a player: the chair, a stool, the high stool, or the piano bench. The seat
 * center is above the origin, and the player sits on it and faces -z.
 *
 * @param support The support of the player.
 * @param seat The heights of the seat ({@link seatHeights}), or `null` for a standing player.
 * @returns The mesh data, or `null` for a standing player.
 */
export function buildSupport(support: Support, seat: SeatHeights | null): MeshData | null {
  if (!seat) {
    return null;
  }

  switch (support) {
    case 'chair':
      return buildChair(seat.seatHeight);
    case 'stool':
      return buildStool(false, seat);
    case 'high-stool':
      return buildStool(true, seat);
    case 'bench':
      return buildPianoBench(seat.seatHeight);
    case 'stand':
    case 'riser':
      return null;
    default: {
      const unhandled: never = support;
      throw new Error(`The support "${String(unhandled)}" is not known.`);
    }
  }
}

/** The largest angle of one face of a riser arc. */
const RISER_FACET = 5 * MathUtils.DEG2RAD;

/** The width of the dark line between two boards of a tread, as between two planks of the stage. */
const PLANK_LINE = 0.012;

/** One arc block of the risers: a level or a step, around the podium center. */
interface RiserBlock {
  /** The distance of the front face from the podium center, in meters. */
  readonly inner: number;
  /** The distance of the back face from the podium center, in meters. */
  readonly outer: number;
  /** The height of the top above the stage top, in meters. */
  readonly height: number;
  /** Half the angle of the arc, in radians. The arc is centered on 0°. */
  readonly halfAngle: number;
}

/**
 * Gives the bands of the top of a tread from its front to its back: the lighter edge, then boards
 * of at most {@link RISER}.board with a dark line between two boards.
 *
 * @param inner The distance of the front of the tread from the podium center.
 * @param outer The distance of the back of the tread from the podium center.
 * @returns The bands: the start, the end, and the color.
 */
function treadBands(inner: number, outer: number): [number, number, Rgb][] {
  const line = PLANK_LINE / 2;
  const bands: [number, number, Rgb][] = [[inner, inner + RISER.nosing, STAGE_COLORS.riserNosing]];
  const start = inner + RISER.nosing;
  const boards = Math.ceil((outer - start) / RISER.board - 1e-9);
  const width = (outer - start) / boards;
  for (let i = 0; i < boards; i++) {
    const from = start + i * width + (i > 0 ? line : 0);
    const to = start + (i + 1) * width - (i < boards - 1 ? line : 0);
    bands.push([from, to, STAGE_COLORS.riserTread]);
    if (i < boards - 1) {
      bands.push([to, to + 2 * line, STAGE_COLORS.seam]);
    }
  }
  return bands;
}

/**
 * Adds one closed arc block of the risers: the top as a tread, the front, the back, and the two
 * ends.
 *
 * @param builder The builder.
 * @param block The block.
 * @param podium The podium center, the center of the arc.
 */
function addRiserBlock(builder: MeshBuilder, block: RiserBlock, podium: Vec3): void {
  const { inner, outer, height, halfAngle } = block;
  const point = (r: number, angle: number, y: number): Vec3 => [
    podium[0] + r * Math.sin(angle),
    podium[1] + y,
    podium[2] - r * Math.cos(angle),
  ];
  const segments = Math.max(1, Math.ceil((2 * halfAngle) / RISER_FACET));
  const sides: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a0 = -halfAngle + (2 * halfAngle * i) / segments;
    const a1 = -halfAngle + (2 * halfAngle * (i + 1)) / segments;
    for (const [from, to, color] of treadBands(inner, outer)) {
      builder.add(
        quad(
          point(from, a0, height),
          point(from, a1, height),
          point(to, a1, height),
          point(to, a0, height),
        ),
        { color },
      );
    }
    sides.push(
      ...quad(
        point(inner, a0, 0),
        point(inner, a1, 0),
        point(inner, a1, height),
        point(inner, a0, height),
      ),
      ...quad(
        point(outer, a0, 0),
        point(outer, a0, height),
        point(outer, a1, height),
        point(outer, a1, 0),
      ),
    );
  }
  sides.push(
    ...quad(
      point(inner, -halfAngle, 0),
      point(inner, -halfAngle, height),
      point(outer, -halfAngle, height),
      point(outer, -halfAngle, 0),
    ),
    ...quad(
      point(inner, halfAngle, 0),
      point(outer, halfAngle, 0),
      point(outer, halfAngle, height),
      point(inner, halfAngle, height),
    ),
  );
  builder.add(sides, { color: STAGE_COLORS.skirt });
}

/**
 * Builds the choir risers: one arc block for each level, from the stage top to the height of the
 * level, and the steps in front of the lowest level (design 4.5). Each tread has a lighter edge
 * at its front and boards of a wood a little lighter than the stage top, and the faces have the
 * color of the stage sides, as the wooden risers of `orchestra-latest.png` and `orchestra-side.png`.
 *
 * @param levels The levels of the layout.
 * @param podium The podium center, the center of the arcs.
 * @returns The mesh data in the stage axes, with all vertices on bone 0.
 */
export function buildRisers(levels: readonly RiserLevel[], podium: Vec3): MeshData {
  const builder = new MeshBuilder();
  for (const { level, radius, height, halfAngle } of levels) {
    const inner = radius - RISER.depth / 2;
    addRiserBlock(builder, { inner, outer: radius + RISER.depth / 2, height, halfAngle }, podium);
    if (level !== 0) {
      continue;
    }
    const { count, depth } = RISER.steps;
    for (let j = 1; j <= count; j++) {
      const step = {
        inner: inner - j * depth,
        outer: inner - (j - 1) * depth,
        height: (height * (count + 1 - j)) / (count + 1),
        halfAngle,
      };
      addRiserBlock(builder, step, podium);
    }
  }
  return builder.build();
}

/**
 * Builds the static props of a layout as one mesh: the seat of each player, each music stand,
 * and the choir risers (design 4.4). Each kind of seat at each height is built one time.
 *
 * @param layout The layout of a score.
 * @returns The mesh data in the stage axes, with all vertices on bone 0.
 */
export function buildSceneProps(layout: SceneLayout): MeshData {
  const builder = new MeshBuilder();
  const seats = new Map<string, MeshData | null>();
  const place = (position: Vec3, facing: number): Transform =>
    transform(position, toQuat(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), facing)));
  for (const player of layout.players) {
    const { support, species } = player.cast;
    const heights = seatHeights(support, SPECIES[species]);
    const key = `${support} ${String(heights?.seatHeight)} ${String(heights?.footHeight)}`;
    if (!seats.has(key)) {
      seats.set(key, buildSupport(support, heights));
    }
    const seat = seats.get(key);
    if (seat) {
      builder.addMesh(seat, place(player.position, player.facing));
    }
  }
  if (layout.stands.length > 0) {
    const stand = buildMusicStand();
    for (const at of layout.stands) {
      builder.addMesh(stand, place(at.position, at.facing));
    }
  }
  if (layout.risers.length > 0) {
    builder.addMesh(buildRisers(layout.risers, layout.podium), transform());
  }
  return builder.build();
}
