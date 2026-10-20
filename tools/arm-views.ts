/**
 * Renders the views of `pnpm arm-check --views <dir>` (`tools/arm-check.ts`). For each role with an
 * arm that fails, or each role with `--views-all`, it renders frames with
 * `pnpm close-views play --at <species>` at the azimuths of `VIEW_AZIMUTHS`, with the commit of
 * `--base` beside the working tree:
 *
 * - the worst play sample of each such arm: the sample of the measure that is farthest over its
 *   limit, or of the worst measure for an arm that passes;
 * - a strike: the note of the seat of the player nearest to the middle of the demo;
 * - a rest: the middle of the longest gap between the notes of the seat, when it is
 *   {@link REST_GAP_SEC} or longer.
 *
 * Then it writes `<dir>/<role>-arms.webp`: a 2x crop of each arm in each view of each frame, the
 * commit on the left and the working tree on the right. The box of a crop holds the arm of the
 * working tree, from the clavicle to the fingers, with a margin.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
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
import type { Side } from '../src/models/studio-format.ts';
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

/** The largest side of a crop cell in the image, in pixels: a crop of a larger box shrinks. */
const CELL_SIDE = 520;

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

/**
 * Gives the box of each arm of a role in the frame of each azimuth: the posed vertices of the arm
 * in the working tree, seen by the camera of `close-views play --at`.
 *
 * @param role The role.
 * @param frame The frame.
 * @param sides The arms.
 * @param parts The parts of the gate.
 * @returns The boxes, by side, one for each azimuth.
 */
async function armBoxes(
  role: string,
  frame: Frame,
  sides: readonly Side[],
  parts: GateParts,
): Promise<Map<Side, Box[]>> {
  const source = FOLD_ROLES.get(role);
  const species = source ? roleSpecies(source)[0] : undefined;
  const boxes = new Map<Side, Box[]>();
  if (!source || species === undefined) {
    return boxes;
  }
  const scene = sceneOf((await patchedDemo(`${frame.demo}.mid`)).bytes);
  const [body] = roleBodies(source, scene);
  const rig = body?.model.studio;
  if (!body || !rig) {
    return boxes;
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
    return boxes;
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
  const { position, facing } = target.place;
  const cos = Math.cos(facing);
  const sin = Math.sin(facing);
  for (const side of sides) {
    const list: Box[] = [];
    for (const azimuth of VIEW_AZIMUTHS) {
      const aim = aimPose(target.place, target.box, { azimuth, elevation: AIM_ELEVATION, zoom: 1 });
      const camera = new PerspectiveCamera(aim.fov, PLAY_FRAME.width / PLAY_FRAME.height);
      camera.position.set(...aim.position);
      camera.lookAt(...aim.target);
      camera.updateMatrixWorld();
      const p = new Vector3();
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const v of parts.armVertices(rig, side)) {
        const [x = 0, y = 0, z = 0] = [posed[v * 3], posed[v * 3 + 1], posed[v * 3 + 2]];
        p.set(
          position[0] + x * cos + z * sin,
          position[1] + y,
          position[2] - x * sin + z * cos,
        ).project(camera);
        const sx = ((p.x + 1) / 2) * PLAY_FRAME.width;
        const sy = ((1 - p.y) / 2) * PLAY_FRAME.height;
        [x0, y0, x1, y1] = [Math.min(x0, sx), Math.min(y0, sy), Math.max(x1, sx), Math.max(y1, sy)];
      }
      const side0 = Math.max(x1 - x0, y1 - y0) * (1 + 2 * CROP_MARGIN);
      const sideOf = Math.min(PLAY_FRAME.height, Math.max(80, side0));
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      list.push({
        x: Math.min(PLAY_FRAME.width - sideOf, Math.max(0, cx - sideOf / 2)),
        y: Math.min(PLAY_FRAME.height - sideOf, Math.max(0, cy - sideOf / 2)),
        side: sideOf,
      });
    }
    boxes.set(side, list);
  }
  return boxes;
}

/** One cell pair of the image: the crops of the commit and of the working tree. */
interface PairCell {
  /** The label of the row. */
  readonly label: string;
  /** The frame file of the commit, or `null` with no base. */
  readonly base: string | null;
  /** The frame file of the working tree. */
  readonly tree: string;
  /** The box of the crop. */
  readonly box: Box;
}

/**
 * Writes the image of the crop pairs, one row for each pair, as WebP.
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
        base: await url(cell.base),
        tree: (await url(cell.tree)) ?? '',
        box: cell.box,
      })),
    );
    const data = await page.evaluate(
      async ({ list, side }) => {
        const label = 28;
        const canvas = document.createElement('canvas');
        canvas.width = side * 2;
        canvas.height = list.length * (side + label);
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
        for (const [i, row] of list.entries()) {
          const top = i * (side + label);
          context.fillStyle = '#000000';
          context.font = '18px sans-serif';
          context.fillText(row.label, 6, top + 20);
          const { x, y, side: crop } = row.box;
          for (const [k, source] of [row.base, row.tree].entries()) {
            if (source) {
              context.drawImage(
                await load(source),
                x,
                y,
                crop,
                crop,
                k * side,
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
    console.log(`${file}.webp: ${cells.length} pairs, the base on the left`);
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
    const cells: PairCell[] = [];
    for (const frame of frames) {
      const out = join(dir, `${role}-${frame.demo}-${frame.time.toFixed(2)}`);
      const azimuths = VIEW_AZIMUTHS.flatMap((a) => ['--azimuth', String(a)]);
      const base = options.base === null ? [] : ['--base', options.base];
      console.log(`${role}: ${frame.reason} at ${frame.demo} ${frame.time} s into ${out}`);
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
      const boxes = await armBoxes(role, frame, sides, parts);
      for (const side of sides) {
        for (const [k, azimuth] of VIEW_AZIMUTHS.entries()) {
          const box = boxes.get(side)?.[k];
          if (box) {
            const camera = `at-${species}-az${azimuth}`;
            cells.push({
              label: `${role} ${side}, ${frame.reason}, ${frame.demo} ${frame.time} s, azimuth ${azimuth}`,
              base: options.base === null ? null : join(out, `play-base-${camera}.png`),
              tree: join(out, `play-${camera}.png`),
              box,
            });
          }
        }
      }
    }
    if (cells.length > 0) {
      await writePairs(cells, join(dir, `${role}-arms`));
    }
  }
}
