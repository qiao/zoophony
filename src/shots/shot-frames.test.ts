import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';

import type { Obstacle, PlacedBox } from '../models/footprint.ts';
import { insideBeam } from '../models/beam.ts';
import { CONDUCTOR_OBSTACLE, layoutObstacles } from '../models/layout-scene.ts';
import { conductorHead } from '../pose/plan.ts';
import { PLAYING } from '../pose/test-scene.ts';
import type { Vec3 } from '../models/tuples.ts';
import { angleDifference, azimuthOf } from './camera-keys.ts';
import { cameraAt, createCameraPose } from './camera-at.ts';
import { pointBoxDistance, segmentCrossesBox } from './clearance.ts';
import { keyPosition } from './prepare.ts';
import {
  conductorBackSubject,
  conductorSubject,
  prepareSubjects,
  sectionSubject,
  soloSubject,
} from './subjects.ts';
import type { StageSubjects, Subject } from './subjects.ts';
import { demoShotScenes } from './test-shots.ts';
import type { ShotScene } from './test-shots.ts';
import type { Shot } from './types.ts';
import { VIEW_OFFSET_Y } from './view.ts';

const SCENES = await demoShotScenes();

/** The aspects of the tests: a phone in portrait, a square, a desktop, and a wide screen. */
const ASPECTS = [390 / 844, 1, 1.6, 2.4] as const;

/** The step of the samples of the song time, in seconds. */
const STEP = 0.05;

/**
 * Gives the size in pixels of a view of an aspect.
 *
 * @param aspect The aspect.
 * @returns The width and the height.
 */
function sizeOf(aspect: number): [number, number] {
  return aspect < 1 ? [390, 844] : [Math.round(900 * aspect), 900];
}

/**
 * The area of a phone of 390 × 844 between the title and the bar (design 2.8), in the units of
 * the view: the title ends about 60 px from the top, and the bar starts 64 px from the bottom.
 */
const FREE_AREA = { top: 1 - (2 * 60) / 844, bottom: -1 + (2 * 64) / 844 } as const;

/**
 * The frame rule of design 5.6 for the close shots (UX audit 2026-10-06, N2), as numbers of the
 * design.
 */
const FRAME_RULES = {
  /** The boxes of another object nearer than this part of the depth of the focus count. */
  objectNear: 0.9,
  /** The largest part of the frame that one other object covers. */
  objectShare: 0.15,
  /** The cells on each side of the grid of the frame. */
  cells: 20,
  /** The largest radius of a near head in the frame, in the short half side of the frame. */
  edgeRadius: 0.24,
  /** The aspects of the test. */
  aspects: [1.6],
} as const;

/** The rules of design 5.6, as numbers of the design. The test does not read the module values. */
const RULES = {
  /** The smallest distance from the camera to a box. */
  box: 0.6,
  /** The smallest distance from the camera to a box of the podium and the conductor. */
  conductor: 1.0,
  /** The lowest camera above the stage top. */
  height: 0.6,
  /** The boxes within this distance of the target are the body of the subject. */
  body: 0.4,
  /** The line of sight starts this far from the target. */
  sightStart: 0.3,
} as const;

/** An obstacle of the layout, with the clearance of design 5.6. */
interface TestObstacle {
  readonly obstacle: Obstacle;
  readonly clearance: number;
}

/**
 * Gives the boxes within 0.4 m of a point: the body of the subject.
 *
 * @param obstacles The obstacles.
 * @param point The point.
 * @returns The boxes.
 */
function bodyOf(obstacles: readonly TestObstacle[], point: Vec3): Set<PlacedBox> {
  return new Set(
    obstacles.flatMap(({ obstacle }) =>
      obstacle.boxes.filter((box) => pointBoxDistance(box, ...point) <= RULES.body),
    ),
  );
}

/**
 * Tells if a segment crosses a box of the stage, except some boxes. The circle of each obstacle
 * is the only broad phase.
 *
 * @param obstacles The obstacles.
 * @param a The start of the segment.
 * @param b The end of the segment.
 * @param skip The boxes that do not count.
 * @returns True if the segment crosses a box.
 */
function crossesBox(
  obstacles: readonly TestObstacle[],
  a: Vec3,
  b: Vec3,
  skip: ReadonlySet<PlacedBox>,
): boolean {
  const segment = { ax: a[0], ay: a[1], az: a[2], bx: b[0], by: b[1], bz: b[2] };
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const length2 = dx * dx + dz * dz;
  return obstacles.some(({ obstacle: o }) => {
    const t = Math.min(1, Math.max(0, ((o.x - a[0]) * dx + (o.z - a[2]) * dz) / length2));
    if (Math.hypot(a[0] + dx * t - o.x, a[2] + dz * t - o.z) > o.radius) {
      return false;
    }
    return o.boxes.some((box) => !skip.has(box) && segmentCrossesBox(box, segment));
  });
}

/**
 * Samples the camera of a scene every 50 ms, from before the song start to after its end.
 *
 * @param scene The scene.
 * @param aspect The aspect of the view.
 * @param visit Gets the time, the camera, the index of the shot, and the shot.
 */
function sampleCamera(
  scene: ShotScene,
  aspect: number,
  visit: (time: number, position: Vec3, target: Vec3, shot: Shot, index: number) => void,
): void {
  const { plan, score } = scene;
  const out = createCameraPose();
  for (let time = -1; time < score.durationSec + 2; time += STEP) {
    const pose = cameraAt(plan, time, PLAYING, { aspect, still: false }, out);
    let index = 0;
    while (
      index + 1 < plan.shots.length &&
      (plan.shots[index + 1]?.startSec ?? 0) <= Math.max(time, 0)
    ) {
      index++;
    }
    const shot = plan.shots[index];
    if (shot) {
      visit(time, pose.position, pose.target, shot, index);
    }
  }
}

/**
 * Gives the subject of a conductor shot: from the orchestra side, with the target above the head
 * of the bear, or from the audience side, with the target in front of the bear.
 *
 * @param subjects The subjects of the scene.
 * @param shot The conductor shot.
 * @returns The subject.
 */
function conductorOf(subjects: StageSubjects, shot: Shot): Subject {
  const [x, , z] = subjects.conductorTarget;
  const front = Math.hypot(shot.target[0] - x, shot.target[2] - z) < 1e-9;
  return front ? conductorSubject(subjects) : conductorBackSubject(subjects, shot.target);
}

describe('the clearance of the camera (design 5.6)', () => {
  it.each(SCENES)(
    'keeps the camera of $file clear at each aspect, every 50 ms',
    (scene) => {
      const { layout, models, plan } = scene;
      const obstacles = layoutObstacles(layout, models).map((obstacle) => ({
        obstacle,
        clearance: obstacle.label === CONDUCTOR_OBSTACLE ? RULES.conductor : RULES.box,
      }));
      const held = plan.shots.map((shot) => bodyOf(obstacles, shot.target));
      let samples = 0;
      for (const aspect of ASPECTS) {
        sampleCamera(scene, aspect, (time, position, target, shot, index) => {
          // A wide or a high camera stands far outside the stage, and its target is the stage.
          if (shot.kind === 'wide' || shot.kind === 'high') {
            return;
          }
          samples++;
          const where = `${scene.file} at ${time.toFixed(2)} s, aspect ${aspect.toFixed(2)}, ${shot.kind}`;
          expect(position[1], where).toBeGreaterThanOrEqual(RULES.height);
          for (const { obstacle, clearance } of obstacles) {
            const flat = Math.hypot(position[0] - obstacle.x, position[2] - obstacle.z);
            if (flat - obstacle.radius >= clearance) {
              continue;
            }
            for (const box of obstacle.boxes) {
              const d = pointBoxDistance(box, ...position);
              expect(d, `${where}, ${obstacle.label}`).toBeGreaterThanOrEqual(clearance - 1e-6);
            }
          }
          // The line of sight from 0.3 m outside the target to the camera.
          const skip = new Set([
            ...(held[index] ?? []),
            ...(shot.blendSec > 0 ? (held[index - 1] ?? []) : []),
            ...bodyOf(obstacles, target),
          ]);
          const length = Math.hypot(
            position[0] - target[0],
            position[1] - target[1],
            position[2] - target[2],
          );
          const k = RULES.sightStart / length;
          const start: Vec3 = [
            target[0] + (position[0] - target[0]) * k,
            target[1] + (position[1] - target[1]) * k,
            target[2] + (position[2] - target[2]) * k,
          ];
          expect(crossesBox(obstacles, start, position, skip), where).toBe(false);
        });
      }
      expect(samples).toBeGreaterThan(1000);
    },
    60_000,
  );

  it.each(SCENES)(
    'keeps each close camera of $file within 75° of the front of the subject',
    (scene) => {
      const { score, layout, models } = scene;
      const subjects = prepareSubjects(score, layout, models);
      const subjectOf = (shot: Shot): Subject | null => {
        switch (shot.kind) {
          case 'conductor':
            return conductorOf(subjects, shot);
          case 'solo':
            return soloSubject(subjects, shot.seats[0] ?? -1);
          case 'section':
            return sectionSubject(subjects, shot.seats);
          default:
            return null;
        }
      };
      sampleCamera(scene, 1.6, (time, position, target, shot) => {
        const subject = subjectOf(shot);
        if (!subject || time < shot.startSec + shot.blendSec) {
          return;
        }
        const azimuth = azimuthOf(position[0] - target[0], position[2] - target[2]);
        const off = Math.abs(angleDifference(azimuth, subject.front));
        expect(off, `${scene.file} at ${time.toFixed(2)} s`).toBeLessThanOrEqual(
          (75 * Math.PI) / 180 + 1e-6,
        );
      });
    },
    60_000,
  );
});

describe('the beam in the shots (design 5.6)', () => {
  it.each(SCENES)(
    'keeps each camera of $file inside or outside the beam for a full shot',
    (scene) => {
      const S = scene.layout.stageSide;
      for (const aspect of ASPECTS) {
        let shotIndex = -1;
        let inside = false;
        sampleCamera(scene, aspect, (time, position, _target, shot, index) => {
          if (time < Math.max(shot.startSec, 0) + shot.blendSec) {
            return;
          }
          const now = insideBeam(S, position);
          if (index === shotIndex) {
            expect(
              now,
              `${scene.file} ${shot.kind} shot ${index} at ${time.toFixed(2)} s, aspect ${aspect.toFixed(2)}`,
            ).toBe(inside);
          }
          shotIndex = index;
          inside = now;
        });
      }
    },
    60_000,
  );
});

describe('the subject in the frame (design 5.6)', () => {
  it.each(SCENES)(
    'shows each subject head and each wide stage of $file at each aspect',
    (scene) => {
      const { score, layout, models, plan } = scene;
      const S = layout.stageSide;
      const corners: Vec3[] = [
        [-S / 2, 0, -S / 2],
        [S / 2, 0, -S / 2],
        [-S / 2, 0, S / 2],
        [S / 2, 0, S / 2],
      ];
      // Each player of a wide shot shows with its feet and its head (design 4.5, the portrait
      // rule). The stage corners show in a landscape view.
      const orchestra: Vec3[] = layout.players.flatMap((p) => [
        p.position,
        conductorHead(
          models.get(p.cast.species, p.cast.instrument, p.cast.kettles, p.cast.support),
          p,
        ),
      ]);
      const headsOf = (shot: Shot, aspect: number): Vec3[] => {
        if (shot.kind === 'wide') {
          return aspect >= 1 ? [...corners, ...orchestra] : orchestra;
        }
        if (shot.kind === 'conductor') {
          return [shot.target];
        }
        if (shot.kind === 'high') {
          return [];
        }
        const heads = layout.players
          .filter((p) => shot.seats.includes(p.cast.seatIndex))
          .map((p) => ({
            place: p,
            head: conductorHead(
              models.get(p.cast.species, p.cast.instrument, p.cast.kettles, p.cast.support),
              p,
            ),
          }));
        const principal = heads.find((h) => h.place.cast.player === 0)?.head;
        const inSphere = heads
          .map((h) => h.head)
          .filter(
            (head) =>
              Math.hypot(
                head[0] - shot.target[0],
                head[1] - shot.target[1],
                head[2] - shot.target[2],
              ) <= shot.radius,
          );
        return shot.kind === 'solo' && principal ? [principal] : inSphere;
      };
      const camera = new PerspectiveCamera();
      const out = createCameraPose();
      let checked = 0;
      for (const aspect of ASPECTS) {
        const [width, height] = sizeOf(aspect);
        for (const shot of plan.shots) {
          const start = Math.max(shot.startSec, 0) + shot.blendSec;
          const end = Math.min(shot.endSec, score.durationSec + 1) - 1e-3;
          const points = headsOf(shot, aspect);
          for (const u of [0, 0.5, 1]) {
            const time = start + (end - start) * u;
            const pose = cameraAt(plan, time, PLAYING, { aspect, still: false }, out);
            camera.fov = pose.fov;
            camera.aspect = aspect;
            camera.near = 0.1;
            camera.far = 1000;
            camera.setViewOffset(width, height, 0, VIEW_OFFSET_Y, width, height);
            camera.position.set(...pose.position);
            camera.lookAt(new Vector3(...pose.target));
            camera.updateMatrixWorld();
            camera.updateProjectionMatrix();
            // A wide shot in portrait keeps the orchestra between the title and the bar (2.8).
            const free = shot.kind === 'wide' && aspect < 1 ? FREE_AREA : { top: 1, bottom: -1 };
            for (const point of points) {
              const p = new Vector3(...point).project(camera);
              const where = `${scene.file} ${shot.kind} ${shot.seats.join()} at ${time.toFixed(2)} s, aspect ${aspect.toFixed(2)}`;
              expect(Math.abs(p.x), where).toBeLessThanOrEqual(1);
              expect(p.y, where).toBeLessThanOrEqual(free.top);
              expect(p.y, where).toBeGreaterThanOrEqual(free.bottom);
              checked++;
            }
          }
        }
      }
      expect(checked).toBeGreaterThan(100);
    },
    60_000,
  );
});

/**
 * Finds the obstacle of the owner of sight points: a player of the layout, or the conductor.
 *
 * @param scene The scene.
 * @param obstacles The obstacles of the layout.
 * @param owner The index of the player in the layout, or -1 for the conductor.
 * @returns The obstacle.
 */
function ownObstacle(scene: ShotScene, obstacles: readonly Obstacle[], owner: number): Obstacle {
  const place = scene.layout.players[owner];
  const label = place
    ? `${place.cast.species} ${place.cast.instrument} (seat ${place.cast.seatIndex}, player ${place.cast.player})`
    : CONDUCTOR_OBSTACLE;
  const found = obstacles.find((o) => o.label === label);
  if (!found) {
    throw new Error(`No obstacle ${label}.`);
  }
  return found;
}

/**
 * Gives the times of a shot that the frame tests read: its start after the blend, its middle,
 * and its end.
 *
 * @param scene The scene.
 * @param shot The shot.
 * @returns The song times.
 */
function shotTimes(scene: ShotScene, shot: Shot): number[] {
  const start = Math.max(shot.startSec, 0) + shot.blendSec;
  const end = Math.min(shot.endSec, scene.score.durationSec + 1) - 1e-3;
  return [start, (start + end) / 2, end];
}

/**
 * Gives the subject of a close shot.
 *
 * @param subjects The subjects of the scene.
 * @param shot The shot.
 * @returns The subject, or `null` for a wide or a high shot.
 */
function closeSubject(subjects: StageSubjects, shot: Shot): Subject | null {
  switch (shot.kind) {
    case 'conductor':
      return conductorOf(subjects, shot);
    case 'solo':
      return soloSubject(subjects, shot.seats[0] ?? -1);
    case 'section':
      return sectionSubject(subjects, shot.seats);
    default:
      return null;
  }
}

describe('the subject behind other items (design 5.6, UX audit 2026-10-05, SC1)', () => {
  it.each(SCENES)(
    'shows the head, and all hands and instrument points but one, of each solo of $file',
    (scene) => {
      const { score, layout, models, plan } = scene;
      const obstacles = layoutObstacles(layout, models);
      const tests = obstacles.map((obstacle) => ({ obstacle, clearance: 0 }));
      const subjects = prepareSubjects(score, layout, models);
      const near = (point: Vec3, reach: number): PlacedBox[] =>
        obstacles.flatMap((o) => o.boxes.filter((b) => pointBoxDistance(b, ...point) <= reach));
      const out = createCameraPose();
      let checked = 0;
      for (const shot of plan.shots) {
        const sights = shot.kind === 'section' ? null : closeSubject(subjects, shot)?.sights;
        if (!sights) {
          continue;
        }
        const body = near(shot.target, RULES.body);
        const headSkip = new Set([...body, ...ownObstacle(scene, obstacles, sights.owner).boxes]);
        const parts = sights.parts.map((point) => ({
          point,
          skip: new Set([...body, ...near(point, 0.25)]),
        }));
        for (const aspect of [1.6, 390 / 844]) {
          for (const time of shotTimes(scene, shot)) {
            const pose = cameraAt(plan, time, PLAYING, { aspect, still: false }, out);
            const camera: Vec3 = [pose.position[0], pose.position[1], pose.position[2]];
            const from = (point: Vec3): Vec3 => {
              const k =
                0.15 / Math.hypot(camera[0] - point[0], camera[1] - point[1], camera[2] - point[2]);
              return [
                point[0] + (camera[0] - point[0]) * k,
                point[1] + (camera[1] - point[1]) * k,
                point[2] + (camera[2] - point[2]) * k,
              ];
            };
            const where = `${scene.file} ${shot.kind} ${shot.seats.join()} at ${time.toFixed(2)} s, aspect ${aspect.toFixed(2)}`;
            expect(crossesBox(tests, from(sights.head), camera, headSkip), where).toBe(false);
            const hidden = parts.filter((p) => crossesBox(tests, from(p.point), camera, p.skip));
            expect(hidden.length, where).toBeLessThanOrEqual(1);
            checked++;
          }
        }
      }
      expect(checked).toBeGreaterThan(20);
    },
    60_000,
  );

  it.each(SCENES)(
    'keeps the heads of other players out of the middle of the close shots of $file',
    (scene) => {
      const { score, layout, models, plan } = scene;
      const subjects = prepareSubjects(score, layout, models);
      const camera = new PerspectiveCamera();
      let checked = 0;
      for (const shot of plan.shots) {
        const subject = closeSubject(subjects, shot);
        if (!subject) {
          continue;
        }
        // The rule reads the start and the end of the move, in a desktop view.
        for (const key of [shot.from, shot.to]) {
          const position = new Vector3(
            ...keyPosition(plan.stageSide, shot.target, shot.radius, key, 1.6),
          );
          camera.fov = key.fov;
          camera.aspect = 1.6;
          camera.near = 0.1;
          camera.far = 1000;
          camera.position.copy(position);
          camera.lookAt(new Vector3(...shot.target));
          camera.updateMatrixWorld();
          camera.updateProjectionMatrix();
          const focus = position.distanceTo(new Vector3(...subject.focus));
          for (const head of subjects.heads) {
            if (subject.members.includes(head.owner)) {
              continue;
            }
            const center = new Vector3(...head.center);
            const share = position.distanceTo(center) / focus;
            const p = center.project(camera);
            if (p.z < 1 && share < 0.95) {
              const where = `${scene.file} ${shot.kind} ${shot.seats.join()} from ${shot.startSec.toFixed(2)} s, head of player ${head.owner}`;
              expect(Math.abs(p.x) < 0.4 && Math.abs(p.y) < 0.6, where).toBe(false);
            }
            checked++;
          }
        }
      }
      expect(checked).toBeGreaterThan(100);
    },
  );

  it.each(SCENES)(
    'keeps large heads and objects of other players out of the close shots of $file (N2)',
    (scene) => {
      const { score, layout, models, plan } = scene;
      const subjects = prepareSubjects(score, layout, models);
      const obstacles = layoutObstacles(layout, models);
      // The owner of each obstacle: the index of the player, -1 for the conductor, or null for a
      // stand or the risers.
      const labels = layout.players.map(
        (p) =>
          `${p.cast.species} ${p.cast.instrument} (seat ${p.cast.seatIndex}, player ${p.cast.player})`,
      );
      const objects = obstacles
        .filter((o) => o.label !== 'risers')
        .map((o) => ({
          obstacle: o,
          owner: o.label === CONDUCTOR_OBSTACLE ? -1 : labels.indexOf(o.label),
        }));
      const camera = new PerspectiveCamera();
      const view = new Vector3();
      const n = FRAME_RULES.cells;
      let checked = 0;
      for (const shot of plan.shots) {
        const subject = closeSubject(subjects, shot);
        if (!subject) {
          continue;
        }
        for (const aspect of FRAME_RULES.aspects) {
          for (const key of [shot.from, shot.to]) {
            const position = keyPosition(plan.stageSide, shot.target, shot.radius, key, aspect);
            camera.fov = key.fov;
            camera.aspect = aspect;
            camera.position.set(...position);
            camera.lookAt(new Vector3(...shot.target));
            camera.updateMatrixWorld();
            const tanV = Math.tan(((key.fov / 2) * Math.PI) / 180);
            const tanH = tanV * aspect;
            /**
             * Gives the depth of a point in front of the camera, and its place on the screen.
             *
             * @param point The point.
             * @returns The depth, the x, and the y in the units of the view.
             */
            const toScreen = (point: Vec3): [number, number, number] => {
              view.set(...point).applyMatrix4(camera.matrixWorldInverse);
              const depth = -view.z;
              const d = Math.max(depth, 0.1);
              return [depth, view.x / (d * tanH), view.y / (d * tanV)];
            };
            const focusDepth = toScreen(subject.focus)[0];
            const where = `${scene.file} ${shot.kind} ${shot.seats.join()} from ${shot.startSec.toFixed(2)} s, aspect ${aspect.toFixed(2)}`;
            for (const { obstacle, owner } of objects) {
              if (subject.members.includes(owner)) {
                continue;
              }
              const cells = new Set<number>();
              for (const box of obstacle.boxes) {
                const middle = toScreen([box.x, (box.minY + box.maxY) / 2, box.z]);
                if (middle[0] > FRAME_RULES.objectNear * focusDepth) {
                  continue;
                }
                const points: [number, number, number][] = [];
                for (const lx of [-box.halfX, box.halfX]) {
                  for (const lz of [-box.halfZ, box.halfZ]) {
                    for (const y of [box.minY, box.maxY]) {
                      points.push(
                        toScreen([
                          box.x + lx * box.cos + lz * box.sin,
                          y,
                          box.z - lx * box.sin + lz * box.cos,
                        ]),
                      );
                    }
                  }
                }
                if (points.every((p) => p[0] <= 0)) {
                  continue;
                }
                const xs = points.map((p) => p[1]);
                const ys = points.map((p) => p[2]);
                for (let i = 0; i < n; i++) {
                  const x = -1 + (2 * i + 1) / n;
                  for (let j = 0; j < n; j++) {
                    const y = -1 + (2 * j + 1) / n;
                    if (
                      x >= Math.min(...xs) &&
                      x <= Math.max(...xs) &&
                      y >= Math.min(...ys) &&
                      y <= Math.max(...ys)
                    ) {
                      cells.add(i * n + j);
                    }
                  }
                }
              }
              expect(cells.size / (n * n), `${where}, ${obstacle.label}`).toBeLessThanOrEqual(
                FRAME_RULES.objectShare,
              );
            }
            for (const head of subjects.heads) {
              if (subject.members.includes(head.owner)) {
                continue;
              }
              const [depth, x, y] = toScreen(head.center);
              const distance = camera.position.distanceTo(new Vector3(...head.center));
              const focus = camera.position.distanceTo(new Vector3(...subject.focus));
              if (depth <= 0 || distance >= 0.95 * focus) {
                continue;
              }
              const size = head.radius / (depth * Math.min(tanV, tanH));
              const rx = head.radius / (depth * tanH);
              const ry = head.radius / (depth * tanV);
              const shows = Math.abs(x) - 0.5 * rx < 1 && Math.abs(y) - 0.5 * ry < 1;
              expect(shows && size > FRAME_RULES.edgeRadius, `${where}, head ${head.owner}`).toBe(
                false,
              );
              checked++;
            }
          }
        }
      }
      expect(checked).toBeGreaterThan(100);
    },
    60_000,
  );

  it.each(SCENES)('films the pianist of $file from the side of the high keys', (scene) => {
    const { score, layout, plan } = scene;
    const pianoSeats = new Set(
      score.seats.flatMap((seat, i) => (seat.section === 'piano' ? [i] : [])),
    );
    const out = createCameraPose();
    for (const shot of plan.shots) {
      if (shot.kind !== 'solo' && shot.kind !== 'section') {
        continue;
      }
      const pianist = layout.players.find((p) => p.cast.seatIndex === shot.seats[0]);
      if (!pianist || !shot.seats.every((seat) => pianoSeats.has(seat))) {
        continue;
      }
      // The right of the pianist is the side of the high keys and of the open lid.
      const front = azimuthOf(-Math.sin(pianist.facing), -Math.cos(pianist.facing));
      for (const time of shotTimes(scene, shot)) {
        const pose = cameraAt(plan, time, PLAYING, { aspect: 1.6, still: false }, out);
        const dx = pose.position[0] - pose.target[0];
        const dy = pose.position[1] - pose.target[1];
        const dz = pose.position[2] - pose.target[2];
        const side = angleDifference(azimuthOf(dx, dz), front) * (180 / Math.PI);
        const where = `${scene.file} ${shot.kind} at ${time.toFixed(2)} s: ${side.toFixed(0)}°`;
        // A camera in front of the pianist looked into the case (shot-boulanger-piano-solo).
        expect(side, where).toBeLessThan(-25);
        expect(side, where).toBeGreaterThan(-175);
        expect(Math.atan2(dy, Math.hypot(dx, dz)) * (180 / Math.PI), where).toBeGreaterThan(30);
      }
    }
  });

  it('keeps the bear out of the frame of the solo shots of the K. 315 soloist (AM3)', () => {
    const scene = SCENES.find((s) => s.file === 'mozart-k315.mid');
    if (!scene) {
      throw new Error('No K. 315 demo.');
    }
    const { score, layout, plan } = scene;
    const [x, y, z] = layout.conductor.position;
    const out = createCameraPose();
    const camera = new PerspectiveCamera();
    let checked = 0;
    for (const shot of plan.shots) {
      if (shot.kind !== 'solo' || shot.seats[0] !== score.soloist) {
        continue;
      }
      for (const time of shotTimes(scene, shot).slice(0, 2)) {
        const pose = cameraAt(plan, time, PLAYING, { aspect: 1.6, still: false }, out);
        camera.fov = pose.fov;
        camera.aspect = 1.6;
        camera.position.set(...pose.position);
        camera.lookAt(new Vector3(...pose.target));
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();
        // The middle of the body of the bear, 0.8 m above the podium top.
        const p = new Vector3(x, y + 0.8, z).project(camera);
        expect(
          Math.abs(p.x),
          `${shot.startSec.toFixed(2)} s at ${time.toFixed(2)} s`,
        ).toBeGreaterThan(1);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(6);
  });
});
