import { describe, expect, it } from 'vitest';

import { mulberry32 } from '../pose/random.ts';
import { NOT_STARTED, PLAYING } from '../pose/test-scene.ts';
import type { Transport } from '../pose/types.ts';
import { cameraAt, createCameraPose } from './camera-at.ts';
import { demoShotScenes } from './test-shots.ts';
import type { CameraPose, CameraView, ShotPlan } from './types.ts';
import { DEFAULT_TARGET, defaultView } from './view.ts';

const SCENES = await demoShotScenes();

const DESKTOP: CameraView = { aspect: 1440 / 900, still: false };

/**
 * Gives a copy of the camera of a time.
 *
 * @param plan The plan.
 * @param time The song time.
 * @param transport The transport.
 * @param view The view.
 * @returns A new camera.
 */
function cameraOf(
  plan: ShotPlan,
  time: number,
  transport: Transport = PLAYING,
  view: CameraView = DESKTOP,
): CameraPose {
  const pose = cameraAt(plan, time, transport, view, createCameraPose());
  return {
    position: [...pose.position],
    target: [...pose.target],
    fov: pose.fov,
    beam: pose.beam,
    close: pose.close,
    light: pose.light,
    spot: pose.spot,
  };
}

/**
 * Gives the distance between the positions of two cameras.
 *
 * @param a A camera.
 * @param b Another camera.
 * @returns The distance.
 */
function moved(a: CameraPose, b: CameraPose): number {
  return Math.hypot(
    a.position[0] - b.position[0],
    a.position[1] - b.position[1],
    a.position[2] - b.position[2],
  );
}

describe('cameraAt and the transport (design 5.6)', () => {
  const scene = SCENES[0];
  if (!scene) {
    throw new Error('No scene.');
  }
  const { plan, score } = scene;

  it('shows the default view before the first play', () => {
    const view = defaultView(plan.stageSide, 1440, 900);
    const camera = cameraOf(plan, 0, NOT_STARTED);
    for (const k of [0, 1, 2]) {
      expect(camera.position[k]).toBeCloseTo(view.position[k] ?? 0, 9);
    }
    expect(camera.target).toEqual(DEFAULT_TARGET);
    expect(camera.fov).toBe(30);
    const phone = defaultView(plan.stageSide, 390, 844);
    const tall = cameraOf(plan, 50, NOT_STARTED, { aspect: 390 / 844, still: false });
    expect(tall.position[1]).toBeCloseTo(phone.position[1], 9);
  });

  it('holds the camera of the start point in the count-in of a play', () => {
    // A play from the song start: the first shot holds its first key until the downbeat. That key
    // is the default view of the first screen, so the click on play makes no cut.
    const first = cameraOf(plan, 0);
    expect(cameraOf(plan, -0.9)).toEqual(first);
    const before = cameraOf(plan, 0, NOT_STARTED);
    for (const k of [0, 1, 2]) {
      expect(first.position[k]).toBeCloseTo(before.position[k] ?? 0, 9);
    }
    expect(first.target).toEqual(before.target);
    expect(first.fov).toBe(before.fov);
    expect(first.beam).toBe(before.beam);
    // A play from a pause point: the count-in holds the camera of the pause point.
    const resume: Transport = { ...PLAYING, startSec: 100 };
    expect(cameraOf(plan, 99.5, resume)).toEqual(cameraOf(plan, 100));
  });

  it('shows the camera of the song time while paused, also before the start point', () => {
    const paused: Transport = { ...PLAYING, playing: false, changedAtWall: 5, startSec: 100 };
    expect(cameraOf(plan, 40, paused)).toEqual(cameraOf(plan, 40));
  });

  it('holds the last camera after the song end', () => {
    const end = cameraOf(plan, score.durationSec);
    expect(cameraOf(plan, score.durationSec + 10)).toEqual(end);
    expect(cameraOf(plan, score.durationSec + 100)).toEqual(end);
    const view = defaultView(plan.stageSide, 1440, 900);
    for (const k of [0, 1, 2]) {
      expect(end.position[k]).toBeCloseTo(view.position[k] ?? 0, 9);
    }
  });

  it('gives the same camera at a time after a seek as in order', () => {
    const random = mulberry32(7);
    const times = Array.from({ length: 200 }, () => random() * score.durationSec);
    const inOrder = new Map(times.toSorted((a, b) => a - b).map((t) => [t, cameraOf(plan, t)]));
    const out = createCameraPose();
    for (const time of times) {
      const pose = cameraAt(plan, time, PLAYING, DESKTOP, out);
      expect({ ...pose, position: [...pose.position], target: [...pose.target] }).toEqual(
        inOrder.get(time),
      );
    }
  });
});

describe('cameraAt and the moves (design 5.6)', () => {
  it.each(SCENES)('holds each shot of $file still with reduced motion, with hard cuts', (scene) => {
    const { plan } = scene;
    const still: CameraView = { ...DESKTOP, still: true };
    for (const [i, shot] of plan.shots.entries()) {
      const start = Math.max(shot.startSec, 0);
      const end = Math.min(shot.endSec, scene.score.durationSec + 5);
      const first = cameraOf(plan, start, PLAYING, still);
      for (const u of [0.01, 0.3, 0.6, 0.99]) {
        expect(cameraOf(plan, start + (end - start) * u, PLAYING, still), `shot ${i}`).toEqual(
          first,
        );
      }
      const next = plan.shots[i + 1];
      if (next) {
        // The camera at the cut is the first camera of the next shot: no blend frames.
        const at = cameraOf(plan, next.startSec, PLAYING, still);
        expect(cameraOf(plan, next.startSec + 0.05, PLAYING, still)).toEqual(at);
      }
    }
  });

  it.each(SCENES)(
    'moves the camera of $file smoothly, and changes it at once only at a cut',
    (scene) => {
      const { plan, score } = scene;
      const step = 0.001;
      for (const [i, shot] of plan.shots.entries()) {
        const start = Math.max(shot.startSec, 0);
        const end = Math.min(shot.endSec, score.durationSec);
        if (shot.blendSec > 0) {
          const previous = cameraOf(plan, shot.startSec - 1e-6);
          const distance = moved(previous, cameraOf(plan, shot.startSec + shot.blendSec));
          const limit = (distance / shot.blendSec) * 2 * step;
          for (let t = shot.startSec; t < shot.startSec + shot.blendSec; t += 0.01) {
            expect(
              moved(cameraOf(plan, t), cameraOf(plan, t + step)),
              `blend ${i}`,
            ).toBeLessThanOrEqual(limit);
          }
          expect(moved(previous, cameraOf(plan, shot.startSec))).toBeLessThan(1e-6);
        }
        // Inside a shot, the camera moves at most a few millimeters in each millisecond.
        for (let t = start + shot.blendSec + 0.01; t < end - 0.01; t += 0.25) {
          expect(moved(cameraOf(plan, t), cameraOf(plan, t + step)), `shot ${i}`).toBeLessThan(
            0.005,
          );
        }
      }
    },
  );

  it('gives each blend of the demos one beat of 0.5 s to 1.2 s', () => {
    // The sight lines and the test of the path of a blend at 65 points leave no blend in the demos:
    // the last blend of the Beethoven 8 demo crossed a box between two of the first 17 points. The
    // next test gives a cut a blend.
    const blends = SCENES.flatMap((s) => s.plan.shots.filter((shot) => shot.blendSec > 0));
    for (const shot of blends) {
      expect(shot.blendSec).toBeGreaterThanOrEqual(0.5);
      expect(shot.blendSec).toBeLessThanOrEqual(1.2);
    }
  });

  it('blends a cut between two close shots smoothly, from the end camera of the first one', () => {
    const scene = SCENES[0];
    if (!scene) {
      throw new Error('No scene.');
    }
    const close = (kind: string | undefined): boolean => kind === 'solo' || kind === 'section';
    const cut = scene.plan.shots.findIndex(
      (shot, i) => close(shot.kind) && close(scene.plan.shots[i - 1]?.kind),
    );
    const shot = scene.plan.shots[cut];
    if (!shot) {
      throw new Error('No cut between two close shots.');
    }
    const plan: ShotPlan = {
      ...scene.plan,
      shots: scene.plan.shots.with(cut, { ...shot, blendSec: 1 }),
    };
    const before = cameraOf(plan, shot.startSec - 1e-6);
    expect(moved(before, cameraOf(plan, shot.startSec))).toBeLessThan(1e-6);
    const after = cameraOf(plan, shot.startSec + 1);
    expect(moved(after, cameraOf(scene.plan, shot.startSec + 1))).toBeLessThan(1e-9);
    const step = 0.001;
    const limit = (moved(before, after) / 1) * 2 * step;
    for (let t = shot.startSec; t < shot.startSec + 1; t += 0.01) {
      expect(moved(cameraOf(plan, t), cameraOf(plan, t + step))).toBeLessThanOrEqual(limit);
    }
  });
});

describe('cameraAt and the frame of a close shot (design 4.5, 5.6)', () => {
  it('marks the close shots, so that their full frame stands in the free area', () => {
    const scene = SCENES[0];
    if (!scene) {
      throw new Error('No scene.');
    }
    const { plan } = scene;
    expect(cameraAt(plan, 0, NOT_STARTED, DESKTOP, createCameraPose()).close).toBe(false);
    const kinds = new Set<string>();
    for (const shot of plan.shots.slice(1, -1)) {
      const middle = (shot.startSec + shot.endSec) / 2;
      const close = shot.kind !== 'wide' && shot.kind !== 'high';
      expect(cameraOf(plan, middle).close, `${shot.kind} at ${middle} s`).toBe(close);
      kinds.add(close ? 'close' : 'wide');
    }
    expect([...kinds].toSorted()).toEqual(['close', 'wide']);
  });
});
