import { describe, expect, it } from 'vitest';

import { patchedDemo } from '../../tools/patch-demos.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import type { SceneLayout } from '../models/layout.ts';
import { layoutScene } from '../models/layout-scene.ts';
import { scoreOf } from '../score/test-score.ts';
import { LIGHT_POOL, defaultAim } from './light-pool.ts';
import type { LightAim } from './light-pool.ts';
import { SOLO_LIGHT, aimGap, easeAim, easeShare, soloAim } from './solo-light.ts';

/**
 * Builds the layout of a demo after `demos/patches.json`, with the real modules.
 *
 * @param file The file name of the demo.
 * @returns The layout.
 */
async function demoLayout(file: string): Promise<SceneLayout> {
  return layoutScene(scoreOf((await patchedDemo(file)).bytes));
}

/**
 * Gives the solo flags with the seats of one or more instruments soloed.
 *
 * @param layout The layout.
 * @param instruments The instruments of the soloed seats.
 * @returns True for each seat of these instruments, by the seat index.
 */
function soloOf(layout: SceneLayout, instruments: readonly InstrumentId[]): boolean[] {
  const flags: boolean[] = [];
  for (const player of layout.players) {
    if (instruments.includes(player.cast.instrument)) {
      flags[player.cast.seatIndex] = true;
    }
  }
  return Array.from(flags, (flag) => flag === true);
}

/**
 * Gives the places (x, z) of the players of some instruments.
 *
 * @param layout The layout.
 * @param instruments The instruments.
 * @returns The places.
 */
function placesOf(layout: SceneLayout, instruments: readonly InstrumentId[]): [number, number][] {
  return layout.players
    .filter((player) => instruments.includes(player.cast.instrument))
    .map(({ position }) => [position[0], position[2]]);
}

/**
 * Gives the distance of a place from the center of the pool of an aim, in radii of the pool. A
 * place inside the radii of the pool gives less than 1.
 *
 * @param aim The aim of the stage lights.
 * @param x The x of the place, in meters.
 * @param z The z of the place, in meters.
 * @returns The distance, in radii of the pool.
 */
function poolDistance(aim: LightAim, x: number, z: number): number {
  return Math.hypot((x - aim.center[0]) / aim.radius[0], (z - aim.center[1]) / aim.radius[1]);
}

describe('soloAim (design 2.4, 4.5)', async () => {
  const layout = await demoLayout('boulanger-matin.mid');
  const conductor = layout.conductor?.position ?? [0, 0, 0];

  it('keeps the aim with no solo when no seat is soloed', () => {
    const free = defaultAim(layout.stageSide, layout.podium);
    expect(soloAim(layout, [])).toEqual(free);
    expect(
      soloAim(
        layout,
        layout.players.map(() => false),
      ),
    ).toEqual(free);
    // A soloed seat with no players, such as the sound-only seat, moves no light.
    expect(soloAim(layout, [...Array<boolean>(200).fill(false), true])).toEqual(free);
  });

  it('moves the key light, the pool, the hot spot, and the beam to the soloed cellos', () => {
    const aim = soloAim(layout, soloOf(layout, ['cello']));
    const cellos = placesOf(layout, ['cello']);
    const xs = cellos.map(([x]) => x);
    const zs = cellos.map(([, z]) => z);

    expect(aim.center[0]).toBeCloseTo((Math.min(...xs) + Math.max(...xs)) / 2, 9);
    expect(aim.center[1]).toBeCloseTo((Math.min(...zs) + Math.max(...zs)) / 2, 9);
    expect(aim.spot).toEqual(aim.center);
    expect(aim.beam).toEqual(aim.center);
    expect(aim.boost).toBe(SOLO_LIGHT.boost);
    // The players far from the pool keep less light than with no solo.
    expect(aim.floor).toBe(SOLO_LIGHT.floor);
    expect(aim.floor).toBeLessThan(LIGHT_POOL.floor);
    // Each cello is inside the pool. The conductor is inside the pool with no solo, and outside
    // the pool of the solo.
    for (const [x, z] of cellos) {
      expect(poolDistance(aim, x, z)).toBeLessThan(1);
    }
    const free = defaultAim(layout.stageSide, layout.podium);
    const [cx, , cz] = conductor;
    expect(poolDistance(free, cx, cz)).toBeLessThan(1);
    expect(poolDistance(aim, cx, cz)).toBeGreaterThan(1);
  });

  it('sizes the pool of one player with the smallest radius', () => {
    const flags = soloOf(layout, ['piano']);
    expect(placesOf(layout, ['piano'])).toHaveLength(1);
    const piano = soloAim(layout, flags);
    expect(piano.radius).toEqual([SOLO_LIGHT.minRadius, SOLO_LIGHT.minRadius]);
    const [[x, z] = [0, 0]] = placesOf(layout, ['piano']);
    expect(piano.center).toEqual([x, z]);
  });

  it('covers two soloed seats with one pool between them', () => {
    const both = soloAim(layout, soloOf(layout, ['cello', 'piano']));
    const free = defaultAim(layout.stageSide, layout.podium);
    for (const [x, z] of placesOf(layout, ['cello', 'piano'])) {
      expect(poolDistance(both, x, z)).toBeLessThan(1);
    }
    // The pool is never larger than the pool with no solo.
    expect(both.radius[0]).toBeLessThanOrEqual(free.radius[0]);
    expect(both.radius[1]).toBeLessThanOrEqual(free.radius[1]);
  });

  it('gives a chamber group with no podium a hot spot on the soloed seat', async () => {
    const quartet = await demoLayout('mozart-k525.mid');
    expect(defaultAim(quartet.stageSide, null).boost).toBe(0);
    const aim = soloAim(quartet, soloOf(quartet, ['cello']));
    expect(aim.boost).toBe(SOLO_LIGHT.boost);
  });
});

describe('easeShare (design 2.4)', () => {
  it('moves the lights fast at first, then slower, and at once with reduced motion', () => {
    expect(easeShare(0, false)).toBe(0);
    expect(easeShare(SOLO_LIGHT.easeSec, false)).toBeCloseTo(1 - Math.exp(-1), 9);
    expect(easeShare(3 * SOLO_LIGHT.easeSec, false)).toBeGreaterThan(0.95);
    expect(easeShare(1 / 60, true)).toBe(1);
    // A clock that goes back does not move the lights back.
    expect(easeShare(-1, false)).toBe(0);
  });
});

describe('easeAim', () => {
  it('moves each value of the aim in a straight line', () => {
    const from = defaultAim(11.28, [0, 0, 4.64]);
    const to = { ...from, center: [4, 3], beam: [4, 3], boost: 0, floor: 0.2 } as const;
    expect(easeAim(from, to, 0)).toEqual(from);
    expect(easeAim(from, to, 1)).toEqual(to);
    const half = easeAim(from, to, 0.5);
    expect(half.center).toEqual([2, (from.center[1] + 3) / 2]);
    expect(half.beam).toEqual([2, 1.5]);
    expect(half.boost).toBeCloseTo(from.boost / 2, 9);
    expect(half.floor).toBeCloseTo((from.floor + 0.2) / 2, 9);
  });
});

describe('aimGap', () => {
  it('gives the largest difference of one value of two aims', () => {
    const from = defaultAim(11.28, [0, 0, 4.64]);
    expect(aimGap(from, from)).toBe(0);
    expect(aimGap(from, { ...from, beam: [0, -0.5] })).toBe(0.5);
    expect(
      aimGap(from, { ...from, spotRadius: [from.spotRadius[0] + 2, from.spotRadius[1]] }),
    ).toBe(2);
    expect(aimGap(from, { ...from, boost: from.boost - 0.25 })).toBeCloseTo(0.25, 9);
    expect(aimGap(from, { ...from, floor: from.floor - 0.15 })).toBeCloseTo(0.15, 9);
  });
});
