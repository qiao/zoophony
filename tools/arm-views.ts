/**
 * Renders the views of `pnpm arm-check --views <dir>` (`tools/arm-check.ts`). For each role with an
 * arm that fails, or each role with `--views-all`, it renders frames with
 * `pnpm close-views play --at <species>`, with the commit of `--base` beside the working tree:
 *
 * - the worst play sample of each such arm: the sample of the measure that is farthest over its
 *   limit, or of the worst measure for an arm that passes;
 * - a strike: the note of the seat of the player nearest to the middle of the demo;
 * - a rest: the middle of the longest gap between the notes of the seat, when it is
 *   {@link REST_GAP_SEC} or longer.
 *
 * The views take the azimuths of {@link VIEW_AZIMUTHS}, and a view that a music stand or another
 * player hides takes a spare azimuth ({@link frameViews}). Then the tool writes one image of each
 * frame, `<dir>/<role>-<demo>-<time>-arms.webp`: one row for each arm and one column for each
 * view, with a crop of the commit on the left and of the working tree on the right, or a crop of
 * the working tree alone with no base. The box of a crop holds the arm of the working tree, from the clavicle to the
 * fingers, with a margin. A box of {@link CROP_SIDE} or less shows at 2x. A folder that holds the
 * frames of an earlier run keeps them, and the tool renders no frame again.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';

import type {
  ARM_LIMITS,
  CheckArgs,
  GateRow,
  RoleReport,
  armVertices,
  labelTime,
} from './arm-check.ts';
import { AIM_ELEVATION, PLAY_FRAME, aimPose, aimTarget } from './close-views.ts';
import { FOLD_ROLES, roleBodies, roleSpecies } from './fold-probe.ts';
import { patchedDemo } from './patch-demos.ts';
import { ROOT, runChild } from './ref-tree.ts';
import { toWebp } from './screenshots.ts';
import { DEMO_IDS } from '../src/app/demos.ts';
import type { DemoId } from '../src/app/demos.ts';
import { bodyBoundsOf } from '../src/gallery/items.ts';
import type { Side } from '../src/models/studio-format.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../src/models/studio-rig.ts';
import { countInAt } from '../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../src/pose/test-scene.ts';

/** The azimuths of the views, in degrees: the front, two fronts at 35°, and the side. */
export const VIEW_AZIMUTHS: readonly number[] = [0, 35, -35, 90];

/** The azimuths that take the place of a view that a stand or another player hides, in order. */
export const SPARE_AZIMUTHS: readonly number[] = [60, -60, -90, 120, -120, 20, -20, 180];

/**
 * The parts of the gate that the views read. `tools/arm-check.ts` passes them, because a static
 * import of the gate from this module would wait for the top-level await of the gate.
 */
export interface GateParts {
  /** The limits (`ARM_LIMITS`). */
  readonly limits: typeof ARM_LIMITS;
  /** Gives the vertices of the faces of an arm (`armVertices()`). */
  readonly armVertices: typeof armVertices;
  /** Gives the song time of a play label (`labelTime()`). */
  readonly labelTime: typeof labelTime;
}

/** The shortest gap between the notes of a seat that gives a rest frame, in seconds. */
export const REST_GAP_SEC = 1.5;

/** The earliest song time of a frame, in seconds, after the seek lead of `close-views play`. */
const FRAME_FROM_SEC = 5;

/** The smallest side of the box of a crop, in CSS pixels of the frame. */
const CROP_SIDE = 200;

/** The side of a crop in the image, in pixels: 2x a box of {@link CROP_SIDE}. */
const CELL_SIDE = 2 * CROP_SIDE;

/** The margin of the box of a crop around the arm, as a share of the larger side of the arm. */
const CROP_MARGIN = 0.2;

/** One frame of a role: a demo, a song time, and its reason. */
interface Frame {
  /** The demo. */
  readonly demo: DemoId;
  /** The song time, in seconds. */
  readonly time: number;
  /** The reason, such as `worst L paw twist p95`. */
  readonly reason: string;
}

/** The report of one role of the gate. */
interface RoleRun {
  /** The role. */
  readonly role: string;
  /** The report of the working tree. */
  readonly tree: RoleReport | null;
}

/** A box of a frame, in CSS pixels. */
interface Box {
  /** The left side. */
  readonly x: number;
  /** The top side. */
  readonly y: number;
  /** The side of the square. */
  readonly side: number;
}

/**
 * Gives the demo of a file name, such as `beethoven-9` for `beethoven-9.mid`.
 *
 * @param file The file name.
 * @returns The demo, or `null` when the app has no such demo.
 */
function demoOf(file: string): DemoId | null {
  const id = file.replace(/\.mid$/, '');
  return DEMO_IDS.find((demo) => demo === id) ?? null;
}

/**
 * Chooses the worst play sample of an arm: the sample of the measure that is farthest from the
 * base in margins, or over its limit as a share of the limit with no base.
 *
 * @param tree The report of the role.
 * @param rows The values of the gate of the arm.
 * @param parts The parts of the gate.
 * @returns The frame, or `null` when the play has no sample after the seek lead.
 */
function worstFrame(tree: RoleReport, rows: readonly GateRow[], parts: GateParts): Frame | null {
  const ratio = (row: GateRow): number => {
    const limit = parts.limits[row.measure];
    const worse = limit.up ? row.value - (row.base ?? 0) : (row.base ?? 0) - row.value;
    if (row.base !== null) {
      return worse / limit.margin;
    }
    return limit.up ? row.value / limit.limit : limit.limit / Math.max(1e-6, row.value);
  };
  for (const row of rows.toSorted((a, b) => ratio(b) - ratio(a))) {
    const label = tree.arms[row.side][row.measure].play?.view ?? '';
    const time = parts.labelTime(label);
    const demo = demoOf(label.split(' ')[0] ?? '');
    if (time !== null && demo !== null) {
      return { demo, time, reason: `worst ${row.side} ${parts.limits[row.measure].name}` };
    }
  }
  return null;
}

/**
 * Chooses a strike frame and a rest frame of the player of a role in a demo, from the notes of
 * its seat.
 *
 * @param role The role.
 * @param demo The demo.
 * @returns The frames.
 */
async function noteFrames(role: string, demo: DemoId): Promise<Frame[]> {
  const source = FOLD_ROLES.get(role);
  if (!source) {
    return [];
  }
  const scene = sceneOf((await patchedDemo(`${demo}.mid`)).bytes);
  const [body] = roleBodies(source, scene);
  const seat =
    body?.index === null || body === undefined
      ? null
      : (scene.layout.players[body.index]?.cast.seatIndex ?? null);
  const end = scene.score.durationSec - 1;
  const starts = scene.score.notes
    .filter((note) => seat === null || note.seatIndex === seat)
    .map((note) => note.startSec)
    .filter((start) => start >= FRAME_FROM_SEC && start < end);
  const frames: Frame[] = [];
  const middle = scene.score.durationSec / 2;
  const strike = starts.toSorted((a, b) => Math.abs(a - middle) - Math.abs(b - middle))[0];
  if (strike !== undefined) {
    frames.push({ demo, time: Number(strike.toFixed(2)), reason: 'strike' });
  }
  let gap = { from: 0, length: 0 };
  for (let i = 1; i < starts.length; i++) {
    const length = (starts[i] ?? 0) - (starts[i - 1] ?? 0);
    if (length > gap.length) {
      gap = { from: starts[i - 1] ?? 0, length };
    }
  }
  if (gap.length >= REST_GAP_SEC) {
    frames.push({ demo, time: Number((gap.from + gap.length / 2).toFixed(2)), reason: 'rest' });
  }
  return frames;
}

/** The boxes of the arms and the azimuths of the views of one frame. */
interface FrameViews {
  /** The azimuths of the views, in degrees, in the order of the columns. */
  readonly azimuths: readonly number[];
  /** The box of each arm in each view, in the order of the azimuths. */
  readonly boxes: ReadonlyMap<Side, readonly Box[]>;
  /** The azimuths that a stand or another player hides, for the log. */
  readonly hidden: readonly number[];
}

/** A box of a part of the stage in the axes of its place: the corners of the box. */
type Corners = readonly (readonly [number, number, number])[];

/**
 * Gives the eight corners of a box.
 *
 * @param min The low corner.
 * @param max The high corner.
 * @returns The corners.
 */
function cornersOf(min: Vec3, max: Vec3): Corners {
  return [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [
    k & 1 ? max[0] : min[0],
    k & 2 ? max[1] : min[1],
    k & 4 ? max[2] : min[2],
  ]);
}

/**
 * Gives the screen box and the nearest distance of points seen by a camera.
 *
 * @param points The points on the stage.
 * @param camera The camera.
 * @returns The box in CSS pixels of the frame and the nearest distance, or `null` when a point is
 *   behind the camera.
 */
function screenBox(
  points: readonly Vector3[],
  camera: PerspectiveCamera,
): {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly near: number;
} | null {
  let [x0, y0, x1, y1, near] = [Infinity, Infinity, -Infinity, -Infinity, Infinity];
  const p = new Vector3();
  for (const point of points) {
    near = Math.min(near, point.distanceTo(camera.position));
    p.copy(point).project(camera);
    if (p.z > 1) {
      return null;
    }
    const sx = ((p.x + 1) / 2) * PLAY_FRAME.width;
    const sy = ((1 - p.y) / 2) * PLAY_FRAME.height;
    [x0, y0, x1, y1] = [Math.min(x0, sx), Math.min(y0, sy), Math.max(x1, sx), Math.max(y1, sy)];
  }
  return { x0, y0, x1, y1, near };
}

/** The share of the box of an arm that a nearer box must cover to hide the arm. */
const HIDDEN_SHARE = 0.25;

/**
 * Gives the views of one frame of a role: the box of each arm of the working tree in the frame of
 * each azimuth of {@link VIEW_AZIMUTHS}. An azimuth from which a music stand or another player
 * covers {@link HIDDEN_SHARE} of an arm and stands nearer to the camera takes the next azimuth of
 * {@link SPARE_AZIMUTHS} that shows each arm.
 *
 * @param role The role.
 * @param frame The frame.
 * @param sides The arms.
 * @param parts The parts of the gate.
 * @returns The views.
 */
async function frameViews(
  role: string,
  frame: Frame,
  sides: readonly Side[],
  parts: GateParts,
): Promise<FrameViews> {
  const source = FOLD_ROLES.get(role);
  const species = source ? roleSpecies(source)[0] : undefined;
  const none: FrameViews = { azimuths: VIEW_AZIMUTHS, boxes: new Map(), hidden: [] };
  if (!source || species === undefined) {
    return none;
  }
  const scene = sceneOf((await patchedDemo(`${frame.demo}.mid`)).bytes);
  const [body] = roleBodies(source, scene);
  const rig = body?.model.studio;
  if (!body || !rig) {
    return none;
  }
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const poses = poseAt(
    scene.plan,
    frame.time,
    10 + frame.time - start,
    PLAYING,
    allAudible(scene.score),
    createScenePose(scene.plan),
  );
  const pose = body.index === null ? poses.conductor : poses.players[body.index];
  if (!pose) {
    return none;
  }
  const studio = poseStudioBones(
    rig,
    body.model.skeleton,
    pose.rotations,
    studioOffsets(pose),
    1,
    createStudioPose(),
  );
  const posed = skinStudioMesh(rig.mesh, studio);
  const target = await aimTarget(frame.demo, { kind: 'species', species });
  const onStage = (
    place: { readonly position: Vec3; readonly facing: number },
    x: number,
    y: number,
    z: number,
  ): Vector3 => {
    const cos = Math.cos(place.facing);
    const sin = Math.sin(place.facing);
    return new Vector3(
      place.position[0] + x * cos + z * sin,
      place.position[1] + y,
      place.position[2] - x * sin + z * cos,
    );
  };
  const arms = new Map(
    sides.map((side) => [
      side,
      parts
        .armVertices(rig, side)
        .map((v) =>
          onStage(target.place, posed[v * 3] ?? 0, posed[v * 3 + 1] ?? 0, posed[v * 3 + 2] ?? 0),
        ),
    ]),
  );
  const same = (a: Vec3, b: Vec3): boolean => Math.hypot(a[0] - b[0], a[2] - b[2]) < 1e-3;
  const occluders = [
    ...scene.layout.players
      .filter((place) => !same(place.position, target.place.position))
      .map((place) => {
        const { species: who, instrument, kettles, support } = place.cast;
        const box = bodyBoundsOf(scene.models.get(who, instrument, kettles, support).mesh);
        return cornersOf(box.min, box.max).map(([x, y, z]) => onStage(place, x, y, z));
      }),
    ...scene.layout.stands.map((stand) =>
      cornersOf([-0.25, 0, -0.15], [0.25, stand.deskHeight + 0.2, 0.15]).map(([x, y, z]) =>
        onStage(stand, x, y, z),
      ),
    ),
  ];
  const views = [...VIEW_AZIMUTHS, ...SPARE_AZIMUTHS].map((azimuth) => {
    const aim = aimPose(target.place, target.box, { azimuth, elevation: AIM_ELEVATION, zoom: 1 });
    const camera = new PerspectiveCamera(aim.fov, PLAY_FRAME.width / PLAY_FRAME.height);
    camera.position.set(...aim.position);
    camera.lookAt(...aim.target);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    let hidden = false;
    const boxes = sides.map((side): Box => {
      const arm = screenBox(arms.get(side) ?? [], camera);
      if (!arm) {
        hidden = true;
        return { x: 0, y: 0, side: PLAY_FRAME.height };
      }
      const area = Math.max(1, (arm.x1 - arm.x0) * (arm.y1 - arm.y0));
      for (const corners of occluders) {
        const box = screenBox(corners, camera);
        if (box && box.near < arm.near) {
          const w = Math.min(box.x1, arm.x1) - Math.max(box.x0, arm.x0);
          const h = Math.min(box.y1, arm.y1) - Math.max(box.y0, arm.y0);
          hidden ||= w > 0 && h > 0 && (w * h) / area > HIDDEN_SHARE;
        }
      }
      const sideOf = Math.min(
        PLAY_FRAME.height,
        Math.max(CROP_SIDE, Math.max(arm.x1 - arm.x0, arm.y1 - arm.y0) * (1 + 2 * CROP_MARGIN)),
      );
      const cx = (arm.x0 + arm.x1) / 2;
      const cy = (arm.y0 + arm.y1) / 2;
      return {
        x: Math.min(PLAY_FRAME.width - sideOf, Math.max(0, cx - sideOf / 2)),
        y: Math.min(PLAY_FRAME.height - sideOf, Math.max(0, cy - sideOf / 2)),
        side: sideOf,
      };
    });
    return { azimuth, hidden, boxes };
  });
  const shown = views.filter((view) => !view.hidden);
  const chosen = [...shown, ...views.filter((view) => view.hidden)].slice(0, VIEW_AZIMUTHS.length);
  return {
    azimuths: chosen.map((view) => view.azimuth),
    boxes: new Map(
      sides.map((side, k) => [
        side,
        chosen.map((view) => view.boxes[k] ?? view.boxes[0] ?? { x: 0, y: 0, side: CROP_SIDE }),
      ]),
    ),
    hidden: views.filter((view) => view.hidden).map((view) => view.azimuth),
  };
}

/** One cell pair of the image: the crops of the commit and of the working tree. */
interface PairCell {
  /** The label of the cell. */
  readonly label: string;
  /** The row of the cell: the index of the arm. */
  readonly row: number;
  /** The column of the cell: the index of the view. */
  readonly column: number;
  /** The frame file of the commit, or `null` with no base. */
  readonly base: string | null;
  /** The frame file of the working tree. */
  readonly tree: string;
  /** The box of the crop. */
  readonly box: Box;
}

/**
 * Writes the image of the crop pairs of one frame, one row for each arm and one column for each
 * view, as WebP.
 *
 * @param cells The pairs.
 * @param file The file, with no extension.
 */
async function writePairs(cells: readonly PairCell[], file: string): Promise<void> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const url = async (path: string | null): Promise<string | null> =>
      path === null ? null : `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
    const rows = await Promise.all(
      cells.map(async (cell) => ({
        label: cell.label,
        row: cell.row,
        column: cell.column,
        base: await url(cell.base),
        tree: (await url(cell.tree)) ?? '',
        box: cell.box,
      })),
    );
    const data = await page.evaluate(
      async ({ list, side }) => {
        const label = 28;
        const columns = Math.max(...list.map((cell) => cell.column)) + 1;
        const lines = Math.max(...list.map((cell) => cell.row)) + 1;
        const pair = list.some((cell) => cell.base !== null) ? 2 : 1;
        const canvas = document.createElement('canvas');
        canvas.width = columns * side * pair;
        canvas.height = lines * (side + label);
        const context = canvas.getContext('2d');
        if (!context) {
          return '';
        }
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const load = async (source: string): Promise<HTMLImageElement> => {
          const image = new Image();
          image.src = source;
          await image.decode();
          return image;
        };
        for (const cell of list) {
          const top = cell.row * (side + label);
          const left = cell.column * side * pair;
          context.fillStyle = '#000000';
          context.font = '16px sans-serif';
          context.fillText(cell.label, left + 6, top + 20);
          const { x, y, side: crop } = cell.box;
          const sources = pair === 2 ? [cell.base, cell.tree] : [cell.tree];
          for (const [k, source] of sources.entries()) {
            if (source) {
              context.drawImage(
                await load(source),
                x,
                y,
                crop,
                crop,
                left + k * side,
                top + label,
                side,
                side,
              );
            }
          }
        }
        return canvas.toDataURL('image/png');
      },
      { list: rows, side: CELL_SIDE },
    );
    const png = Buffer.from(data.replace(/^data:image\/png;base64,/, ''), 'base64');
    await writeFile(`${file}.webp`, await toWebp(browser, png));
    const what = cells.some((cell) => cell.base !== null)
      ? 'pairs, the base on the left of each pair'
      : 'crops of the working tree';
    console.log(`${file}.webp: ${cells.length} ${what}`);
  } finally {
    await browser.close();
  }
}

/**
 * Renders the views of the gate (`--views <dir>`).
 *
 * @param reports The reports of the working tree of each role.
 * @param rows The values of the gate.
 * @param options The command line.
 * @param parts The parts of the gate.
 */
export async function renderViews(
  reports: readonly RoleRun[],
  rows: readonly GateRow[],
  options: CheckArgs,
  parts: GateParts,
): Promise<void> {
  const dir = options.views ?? '';
  await mkdir(dir, { recursive: true });
  for (const { role, tree } of reports) {
    const source = FOLD_ROLES.get(role);
    const species = source ? roleSpecies(source)[0] : undefined;
    if (!tree || species === undefined) {
      continue;
    }
    const own = rows.filter((row) => row.role === role);
    const sides = (['L', 'R'] as const).filter(
      (side) => options.viewsAll || own.some((r) => r.side === side && r.verdict === 'FAIL'),
    );
    if (sides.length === 0) {
      continue;
    }
    const worst = sides.flatMap((side) => {
      const failing = own.filter((r) => r.side === side && r.verdict === 'FAIL');
      const frame = worstFrame(
        tree,
        failing.length > 0 ? failing : own.filter((r) => r.side === side),
        parts,
      );
      return frame ? [frame] : [];
    });
    const first = worst[0];
    const frames = [...worst, ...(first ? await noteFrames(role, first.demo) : [])].filter(
      (frame, i, all) =>
        all.findIndex((f) => f.demo === frame.demo && Math.abs(f.time - frame.time) < 0.5) === i,
    );
    for (const frame of frames) {
      const cells: PairCell[] = [];
      const out = join(dir, `${role}-${frame.demo}-${frame.time.toFixed(2)}`);
      const views = await frameViews(role, frame, sides, parts);
      if (views.hidden.length > 0) {
        console.log(
          `A stand or another player hides an arm at the azimuths ${views.hidden.join(', ')}.`,
        );
      }
      const azimuths = views.azimuths.flatMap((a) => ['--azimuth', String(a)]);
      const base = options.base === null ? [] : ['--base', options.base];
      const cameras = views.azimuths.map((azimuth) => `at-${species}-az${azimuth}`);
      const prefixes = options.base === null ? ['play-'] : ['play-', 'play-base-'];
      const files = cameras.flatMap((camera) =>
        prefixes.map((prefix) => join(out, `${prefix}${camera}.png`)),
      );
      console.log(`${role}: ${frame.reason} at ${frame.demo} ${frame.time} s into ${out}`);
      if (files.every((file) => existsSync(file))) {
        console.log(`${out} holds the frames of an earlier run, so the tool renders none.`);
      } else {
        await runChild(
          'pnpm',
          [
            'close-views',
            'play',
            out,
            '--demo',
            frame.demo,
            '--time',
            String(frame.time),
            '--at',
            species,
            ...azimuths,
            ...base,
          ],
          ROOT,
        );
      }
      for (const [row, side] of sides.entries()) {
        for (const [column, azimuth] of views.azimuths.entries()) {
          const box = views.boxes.get(side)?.[column];
          if (box) {
            const camera = `at-${species}-az${azimuth}`;
            cells.push({
              row,
              column,
              label: `${side}, ${frame.reason}, ${frame.demo} ${frame.time} s, azimuth ${azimuth}`,
              base: options.base === null ? null : join(out, `play-base-${camera}.png`),
              tree: join(out, `play-${camera}.png`),
              box,
            });
          }
        }
      }
      if (cells.length > 0) {
        await writePairs(cells, `${out}-arms`);
      }
    }
  }
}
