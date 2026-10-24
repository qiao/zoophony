/**
 * Measures the contact of each paw of a woodwind player with its instrument over the sample sets
 * of the sweep of its role (design 5.3): the play, the lift, the rest, and the lowering. A gate of
 * the arms or of the depths can pass while the paws float beside the tube
 * (`docs/research/2026-10-24-wind-grips.md`), so this tool measures the grip itself, on the skin
 * of the studio as the GPU poses it.
 *
 * For each paw and each sample, it measures:
 *
 * - `gap`: the smallest distance from the skin of the paw (the bones `hand` and `fingers`) to the
 *   instrument, in cm. 0 when they touch or cross.
 * - `axis`: the distance from the middle of the closed paw to the axis of the tube, in cm.
 * - `in`: the depth of the axis of the tube in the closed paw, in cm. Above 0, the tube goes
 *   through the paw, as a stick goes through a fist.
 * - `tips`: the distance from the finger tips (the corners of the paw farthest from the wrist) to
 *   the instrument, in cm.
 * - `drift`: the distance from the middle of the closed paw to the palm point of the hand of the
 *   player, which the IK puts on the grip, in cm. The retarget turns the paw of the studio
 *   (`PAW_TURN` of `models/studio-rig.ts`), so the paw can leave the grip.
 * - `along`: the place of the middle of the paw along the tube from the mouthpiece, in cm, beside
 *   the place of its grip.
 * - `side`: the direction from the axis to the middle of the paw, in the axes of the chest
 *   (right, up, forward), in cm.
 *
 * A paw holds ({@link holds}) as a fist, with the tube through the middle of the paw, or as a
 * wrap, with its skin and its finger tips on the instrument. The table gives, for each set and paw, the share of the
 * samples in which the paw holds, the median of each measure, and the worst sample. It also gives
 * the smallest gap between the two paws. A paw that leaves its grip on purpose at rest, as the
 * left paw of the tan fox, still gets its row.
 *
 * Usage: pnpm wind-grip <clarinetist | oboist | flutist | fox-violinist>... [--demo <id>]... [--every <n>]
 * [--set <changes>] [--lines]
 *
 * `--every <n>` takes each n-th play sample (8 by default), `--set` changes the holds in memory
 * (`tools/hold-sets.ts`), and `--lines` prints each sample. With several `--set` options, the tool
 * prints a scan: one row for the working tree and one row for each variant (about 3 s each).
 */
import { Triangle, Vector3 } from 'three';

import { GRIP_GAP, volumeMiddle } from './bow-grip.ts';
import { setHolds } from './hold-sets.ts';
import type { DemoFile } from './patch-demos.ts';
import { probeDemos } from './probe-demos.ts';
import type { InstrumentId } from '../src/models/instruments/types.ts';
import { WOODWINDS } from '../src/models/instruments/woodwinds.ts';
import type { WoodwindId } from '../src/models/instruments/woodwinds.ts';
import type { SpeciesId } from '../src/models/species.ts';
import { boneIndex } from '../src/models/rig.ts';
import type { BoneName } from '../src/models/rig.ts';
import { scoreOf } from '../src/score/test-score.ts';
import {
  closeSurface,
  closedDepth,
  openLoops,
  partDistance,
  posedPart,
} from '../src/pose/test-clearance.ts';
import type { ClosedSurface, PosedPart } from '../src/pose/test-clearance.ts';
import { posedPiecePoint, posedPoint, poseSkeleton } from '../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { allAudible, sceneOf } from '../src/pose/test-scene.ts';
import type { TestScene } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import type { SweepSample } from '../src/pose/test-sweep.ts';

/** A role that the tool measures. */
interface RoleGrip {
  /** The sweep of the role, which gives the sample sets. */
  readonly sweep: keyof typeof SWEEP_ROLES;
  readonly species: SpeciesId;
  readonly instrument: InstrumentId;
  /** Gives the posed tube or neck that the paws hold. */
  readonly tube: (posed: PosedSkeleton) => Tube;
  /** The paws that hold it. */
  readonly paws: readonly ('L' | 'R')[];
}

/**
 * The roles that the tool measures: the three woodwinds, and the left paw of the red fox on the
 * neck of the violin, the grip that the user accepts (user, 2026-10-24), for a compare.
 */
const ROLES = {
  clarinetist: woodwind('clarinetist', 'wolf', 'clarinet'),
  oboist: woodwind('oboist', 'mouse', 'oboe'),
  flutist: woodwind('flutist', 'fox-tan', 'flute'),
  'fox-violinist': {
    sweep: 'violinist',
    species: 'fox-red',
    instrument: 'violin',
    tube: neckOf,
    paws: ['L'],
  },
} as const satisfies Readonly<Record<string, RoleGrip>>;

type GripRole = keyof typeof ROLES;

/**
 * Gives the role of a woodwind.
 *
 * @param sweep The sweep of the role.
 * @param species The species.
 * @param id The woodwind.
 * @returns The role.
 */
function woodwind(sweep: keyof typeof SWEEP_ROLES, species: SpeciesId, id: WoodwindId): RoleGrip {
  return {
    sweep,
    species,
    instrument: id,
    tube: (posed) => tubeOf(posed, id),
    paws: ['L', 'R'],
  };
}

/** The largest gap of the skin of a paw to the instrument for a hold, in meters. */
export const TOUCH = 0.003;

/** The largest gap of the finger tips to the instrument for a hold, in meters. */
export const TIPS = 0.006;

/** The share of the corners of the paw, farthest from the wrist, that make the finger tips. */
const TIP_SHARE = 0.15;

/** The largest distance of interest between two parts, in meters. */
const FAR = 0.3;

/** The step of the points along the axis of the tube, in meters. */
const AXIS_STEP = 0.0025;

/** The measures of one paw in one sample. */
export interface PawContact {
  /** The gap of the skin of the paw to the instrument, in meters: 0 when they touch. */
  readonly gap: number;
  /** The distance from the middle of the closed paw to the axis of the tube, in meters. */
  readonly axis: number;
  /** The depth of the axis of the tube in the closed paw, in meters: 0 when it is outside. */
  readonly inside: number;
  /** The gap of the finger tips to the instrument, in meters. */
  readonly tips: number;
  /** The distance from the middle of the closed paw to the palm point of the player, in meters. */
  readonly drift: number;
  /** The place of the middle of the paw along the tube from the mouthpiece, in meters. */
  readonly along: number;
  /** The direction from the axis to the middle of the paw in the axes of the chest, in meters. */
  readonly side: readonly [number, number, number];
}

/**
 * Tells if a paw holds its instrument, in one of two ways. A fist: the axis of the tube passes
 * within {@link GRIP_GAP} of the middle of the closed paw and goes into it, the rule of the bow
 * grip (`tools/bow-grip.ts`). A wrap: the skin touches the instrument, and the finger tips touch
 * it too, so that the fingers close around it. The left paw of the red fox on the violin neck, the
 * grip that the user accepts, has its finger tips 0.1 cm from the neck in the play. A paw whose
 * skin only touches the tube can point away from it, with the tube in the back of the paw.
 *
 * @param c The measures of the paw.
 * @returns True when the paw holds.
 */
export function holds(c: PawContact): boolean {
  const fist = c.axis <= GRIP_GAP && c.inside > 0;
  return fist || (c.gap <= TOUCH && c.tips <= TIPS);
}

/** The tube of a woodwind in one pose, from the mouthpiece, or the neck of a violin from the nut. */
interface Tube {
  readonly start: Vector3;
  readonly axis: Vector3;
  readonly length: number;
}

/**
 * Gives the posed axis of the tube of a woodwind. The piece has the mouthpiece at its origin, and
 * the tube runs along +x. The grip of the right palm gives the scale of the instrument.
 *
 * @param posed The posed skeleton.
 * @param id The woodwind.
 * @returns The tube.
 * @throws Error if the instrument has no grip of the right palm.
 */
function tubeOf(posed: PosedSkeleton, id: WoodwindId): Tube {
  const grip = posed.model.instrument.grips.palmR;
  if (!grip) {
    throw new Error(`The ${id} has no grip of the right palm.`);
  }
  const w = WOODWINDS[id];
  const length = (grip.at[0] / w.palmR) * w.length;
  const start = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [0, 0, 0] }));
  const end = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [length, 0, 0] }));
  return { start, axis: end.sub(start).normalize(), length };
}

/**
 * Gives the posed neck of a violin: the line of its target `fingerboard`, from the nut to the end
 * of the fingerboard, along the strings.
 *
 * @param posed The posed skeleton.
 * @returns The neck.
 * @throws Error if the instrument has no target `fingerboard`.
 */
function neckOf(posed: PosedSkeleton): Tube {
  const board = posed.model.instrument.targets.find((t) => t.kind === 'fingerboard');
  if (!board) {
    throw new Error(`The ${posed.model.instrument.id} has no target "fingerboard".`);
  }
  const start = new Vector3(...posedPiecePoint(posed, { bone: board.bone, at: board.from }));
  const end = new Vector3(...posedPiecePoint(posed, { bone: board.bone, at: board.to }));
  const length = end.distanceTo(start);
  return { start, axis: end.sub(start).normalize(), length };
}

/** A posed paw: its triangles, and its closed surface. */
interface PosedPaw {
  readonly part: PosedPart;
  readonly closed: ClosedSurface;
}

/**
 * Gives the closed paw of one side: the triangles of the bones `hand` and `fingers`, as the skin
 * poses them, with a cap on each open loop.
 *
 * @param posed The posed skeleton.
 * @param side The side.
 * @returns The open part and the closed surface.
 */
function pawOf(posed: PosedSkeleton, side: 'L' | 'R'): PosedPaw {
  const bones: BoneName[] = [`hand${side}`, `fingers${side}`];
  const part = posedPart(posed, bones);
  return { part, closed: closeSurface(part.triangles, openLoops(part.triangles)) };
}

const nearest = new Vector3();

/**
 * Gives the smallest distance from points to the triangles of a part.
 *
 * @param points The points.
 * @param part The part.
 * @returns The distance, in meters.
 */
function pointsDistance(points: readonly Vector3[], part: PosedPart): number {
  let best = Infinity;
  for (const p of points) {
    for (const t of part.triangles) {
      best = Math.min(best, t.closestPointToPoint(p, nearest).distanceTo(p));
    }
  }
  return best;
}

/**
 * Gives the finger tips of a posed paw: the corners of the paw farthest from the wrist. The skin of
 * a studio body gives most corners of the fingers the bone `hand`, so the tool reads the whole paw.
 *
 * @param posed The posed skeleton.
 * @param paw The posed paw.
 * @param side The side.
 * @returns The corners.
 */
function tipsOf(posed: PosedSkeleton, paw: PosedPart, side: 'L' | 'R'): Vector3[] {
  const wrist = posed.frames[boneIndex(`hand${side}`)]?.position ?? new Vector3();
  const corners = paw.triangles.flatMap((t: Triangle) => [t.a, t.b, t.c]);
  const sorted = corners.toSorted((a, b) => b.distanceTo(wrist) - a.distanceTo(wrist));
  return sorted.slice(0, Math.max(1, Math.round(sorted.length * TIP_SHARE)));
}

/**
 * Measures one paw in one pose ({@link PawContact}).
 *
 * @param posed The posed skeleton.
 * @param tube The posed tube.
 * @param side The side.
 * @param instrument The posed instrument.
 * @returns The measures.
 */
export function pawContact(
  posed: PosedSkeleton,
  tube: Tube,
  side: 'L' | 'R',
  instrument: PosedPart,
): PawContact {
  const paw = pawOf(posed, side);
  const middle = volumeMiddle(paw.closed);
  const along = Math.min(tube.length, Math.max(0, middle.clone().sub(tube.start).dot(tube.axis)));
  const onAxis = tube.start.clone().addScaledVector(tube.axis, along);
  const points: Vector3[] = [];
  for (let s = 0; s <= tube.length; s += AXIS_STEP) {
    points.push(tube.start.clone().addScaledVector(tube.axis, s));
  }
  const palm = side === 'L' ? posed.model.body.palmL : posed.model.body.palmR;
  const chest = posed.frames[boneIndex('chest')]?.rotation;
  const offset = middle.clone().sub(onAxis);
  if (chest) {
    offset.applyQuaternion(chest.clone().invert());
  }
  return {
    gap: partDistance(paw.part, instrument, FAR),
    axis: middle.distanceTo(onAxis),
    inside: closedDepth(points, paw.closed).depth,
    tips: pointsDistance(tipsOf(posed, paw.part, side), instrument),
    drift: middle.distanceTo(new Vector3(...posedPoint(posed, `hand${side}`, palm))),
    along,
    side: [offset.x, offset.y, -offset.z],
  };
}

/** The measures of the paws in one sample. */
interface SampleContact {
  readonly set: string;
  readonly song: number;
  readonly wall: number;
  readonly paws: Readonly<Partial<Record<'L' | 'R', PawContact>>>;
  /** The gap between the skins of the two paws, in meters: 0 when they touch or cross. */
  readonly between: number;
  /**
   * The gap of the instrument to the skin of the trunk and the legs ({@link BODY_BONES}), in
   * meters: 0 when they touch or cross. At rest, a real player puts the instrument on the body.
   */
  readonly body: number;
  /** The gap of the lower end of the tube to the skin of the trunk and the legs, in meters. */
  readonly end: number;
}

/** The bones of the trunk and of the legs, on which a player at rest puts its instrument. */
const BODY_BONES: readonly BoneName[] = [
  'hips',
  'spine',
  'chest',
  'thighL',
  'thighR',
  'shinL',
  'shinR',
];

/**
 * Finds the first player of the species and the instrument of a role in a scene.
 *
 * @param grip The role.
 * @param scene The scene.
 * @returns The index of the player in the layout, or -1.
 */
function playerOf(grip: RoleGrip, scene: TestScene): number {
  return scene.layout.players.findIndex(
    (p) => p.cast.species === grip.species && p.cast.instrument === grip.instrument,
  );
}

/**
 * Measures each sample of the sweep of a role in one demo.
 *
 * @param grip The role.
 * @param scene The scene of the demo.
 * @param every The step of the play samples: each n-th sample.
 * @returns The measures, or none when the demo has no player of the role.
 */
function measureScene(grip: RoleGrip, scene: TestScene, every: number): SampleContact[] {
  const index = playerOf(grip, scene);
  const place = scene.layout.players[index];
  if (!place) {
    return [];
  }
  const { species, instrument, kettles, support } = place.cast;
  const model = scene.models.get(species, instrument, kettles, support);
  const buffer = createScenePose(scene.plan);
  const audible = allAudible(scene.score);
  const out: SampleContact[] = [];
  for (const set of SWEEP_ROLES[grip.sweep].sampleSets(scene)) {
    const samples: SweepSample[] = [...set.samples];
    const kept = set.name === 'play' ? samples.filter((_, i) => i % every === 0) : samples;
    for (const [song, wall, transport] of kept) {
      const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
      if (!pose) {
        throw new Error(`The pose has no player ${index}.`);
      }
      const posed = poseSkeleton(model, pose);
      const instrumentPart = posedPart(posed, ['instrument']);
      const tube = grip.tube(posed);
      const paws: Partial<Record<'L' | 'R', PawContact>> = {};
      for (const side of grip.paws) {
        paws[side] = pawContact(posed, tube, side, instrumentPart);
      }
      const between = partDistance(
        posedPart(posed, ['handL', 'fingersL']),
        posedPart(posed, ['handR', 'fingersR']),
        FAR,
      );
      const body = posedPart(posed, BODY_BONES);
      const end = tube.start.clone().addScaledVector(tube.axis, tube.length);
      out.push({
        set: set.name,
        song,
        wall,
        paws,
        between,
        body: partDistance(instrumentPart, body, FAR),
        end: pointsDistance([end], body),
      });
    }
  }
  return out;
}

/**
 * Gives the median of numbers.
 *
 * @param values The numbers.
 * @returns The median, or `NaN` for none.
 */
function median(values: readonly number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length === 0) {
    return Number.NaN;
  }
  return sorted.length % 2 === 1
    ? (sorted[mid] ?? Number.NaN)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * Writes centimeters with one decimal.
 *
 * @param meters The value, in meters.
 * @returns The text.
 */
function cm(meters: number): string {
  return (meters * 100).toFixed(1);
}

/**
 * Writes the lines of the table of a role.
 *
 * @param name The name of the role.
 * @param grip The role.
 * @param samples The measures.
 * @param lines True to add one line for each sample.
 * @returns The lines.
 */
function tableLines(
  name: GripRole,
  grip: RoleGrip,
  samples: readonly SampleContact[],
  lines: boolean,
): string[] {
  const out = [
    `${name} (${grip.species}, ${grip.instrument}): the gaps and the distances in cm, the median of each set; "worst" names the sample with the largest axis distance`,
    '| Set | Paw | Samples | Holds | Gap | Axis | In | Tips | Drift | Along | Side (right, up, fwd) | Worst axis | Paws gap min | Body gap | End gap |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---:|---:|',
  ];
  for (const set of ['play', 'lift', 'rest', 'lower']) {
    const of = samples.filter((s) => s.set === set);
    if (of.length === 0) {
      continue;
    }
    for (const side of grip.paws) {
      const measured = of.flatMap((s) => {
        const c = s.paws[side];
        return c ? [{ s, c }] : [];
      });
      const paws = measured.map((m) => m.c);
      const held = paws.filter(holds).length;
      const worst = measured.reduce((a, b) => (b.c.axis > a.c.axis ? b : a));
      const at = (f: (c: PawContact) => number): string => cm(median(paws.map(f)));
      const sideMedian = [0, 1, 2].map((k) => at((p) => p.side[k] ?? 0));
      out.push(
        `| ${set} | ${side} | ${of.length} | ${((100 * held) / of.length).toFixed(0)}% | ${at((p) => p.gap)} | ${at((p) => p.axis)} | ${at((p) => p.inside)} | ${at((p) => p.tips)} | ${at((p) => p.drift)} | ${at((p) => p.along)} | ${sideMedian.join(', ')} | ${cm(worst.c.axis)} at ${worst.s.song.toFixed(2)} s, wall ${worst.s.wall.toFixed(2)} s | ${cm(Math.min(...of.map((s) => s.between)))} | ${cm(median(of.map((s) => s.body)))} | ${cm(median(of.map((s) => s.end)))} |`,
      );
    }
  }
  if (lines) {
    out.push('', 'set song wall | paw gap axis in tips drift along | ... | paws gap');
    for (const s of samples) {
      const p = (side: 'L' | 'R'): string => {
        const c = s.paws[side];
        return c
          ? `${side} ${[c.gap, c.axis, c.inside, c.tips, c.drift, c.along].map(cm).join(' ')}`
          : `${side} -`;
      };
      out.push(
        `${s.set} ${s.song.toFixed(2)} ${s.wall.toFixed(2)} | ${grip.paws.map(p).join(' | ')} | ${cm(s.between)}`,
      );
    }
  }
  return out;
}

/**
 * Writes one row of a scan: the share of the samples in which each paw holds, and the median
 * distance of its middle to the axis and of its finger tips to the instrument, for each set.
 *
 * @param label The variant.
 * @param grip The role.
 * @param samples The measures.
 * @returns The row.
 */
function scanRow(label: string, grip: RoleGrip, samples: readonly SampleContact[]): string {
  const cells = ['play', 'lift', 'rest', 'lower'].flatMap((set) =>
    grip.paws.map((side) => {
      const paws = samples.flatMap((s) => (s.set === set && s.paws[side] ? [s.paws[side]] : []));
      if (paws.length === 0) {
        return '-';
      }
      const held = (100 * paws.filter(holds).length) / paws.length;
      const at = (f: (c: PawContact) => number): string => cm(median(paws.map(f)));
      return `${held.toFixed(0)}% ${at((p) => p.axis)} ${at((p) => p.tips)} ${at((p) => p.gap)}`;
    }),
  );
  const between = cm(Math.min(...samples.map((s) => s.between)));
  const rest = samples.filter((s) => s.set === 'rest');
  const body = `${cm(median(rest.map((s) => s.body)))} ${cm(median(rest.map((s) => s.end)))}`;
  return `| ${label} | ${cells.join(' | ')} | ${between} | ${body} |`;
}

/**
 * Finds the first demo with a player of a role, and measures it.
 *
 * @param grip The role.
 * @param demos The demos.
 * @param asked The names of the demos to take, or none for all.
 * @param every The step of the play samples.
 * @returns The demo and the measures, or `null` when no demo has the role.
 */
function measureFirst(
  grip: RoleGrip,
  demos: readonly DemoFile[],
  asked: readonly string[],
  every: number,
): { file: string; samples: SampleContact[] } | null {
  const sweep = SWEEP_ROLES[grip.sweep];
  for (const demo of demos) {
    const wanted = asked.length === 0 || asked.some((a) => demo.file.startsWith(a));
    if (!wanted || !sweep.hasRole(scoreOf(demo.bytes))) {
      continue;
    }
    const samples = measureScene(grip, sceneOf(demo.bytes), every);
    if (samples.length > 0) {
      return { file: demo.file, samples };
    }
  }
  return null;
}

/**
 * Runs the tool. One `--set` prints the table of the variant. Several `--set` options print a
 * scan: one row for the working tree and one row for each variant.
 *
 * @param args The arguments after the script.
 * @throws Error if a role is not known, or if no demo has a role.
 */
async function main(args: readonly string[]): Promise<void> {
  const roles = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  const value = (name: string): string[] =>
    args.flatMap((a, i) => (a === name && args[i + 1] !== undefined ? [args[i + 1] ?? ''] : []));
  const isRole = (r: string): r is GripRole => r in ROLES;
  if (roles.length === 0 || !roles.every(isRole)) {
    throw new Error(
      `Usage: pnpm wind-grip <${Object.keys(ROLES).join(' | ')}>... [--demo <id>]... [--every <n>] [--set <changes>]... [--lines]`,
    );
  }
  const every = Number(value('--every')[0] ?? 8);
  const asked = value('--demo');
  const variants = value('--set');
  const demos = await probeDemos();
  for (const name of roles.filter(isRole)) {
    const grip: RoleGrip = ROLES[name];
    if (variants.length > 1) {
      const sets = ['play', 'lift', 'rest', 'lower'];
      const heads = sets.flatMap((set) => grip.paws.map((side) => `${set} ${side}`));
      console.log(
        `\n${name}: each cell gives the share of the samples that hold, then the median axis distance, tip gap, and skin gap in cm`,
      );
      console.log(`| Variant | ${heads.join(' | ')} | Paws gap min | Rest body, end gap |`);
      console.log(`|---|${heads.map(() => '---').join('|')}|---:|---|`);
      for (const variant of ['', ...variants]) {
        const { undo } = setHolds(variant);
        try {
          const measured = measureFirst(grip, demos, asked, every);
          console.log(scanRow(variant || 'tree', grip, measured?.samples ?? []));
        } finally {
          undo();
        }
      }
      continue;
    }
    const changes = variants[0];
    const undo = changes ? setHolds(changes).undo : (): void => {};
    if (changes) {
      console.log(`set: ${changes}`);
    }
    const measured = measureFirst(grip, demos, asked, every);
    undo();
    if (!measured) {
      throw new Error(`No demo has the role ${name}.`);
    }
    console.log(`\n${measured.file}`);
    console.log(tableLines(name, grip, measured.samples, args.includes('--lines')).join('\n'));
  }
}

await main(process.argv.slice(2));
