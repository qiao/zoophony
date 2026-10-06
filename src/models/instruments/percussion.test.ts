import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { INSTRUMENT_COLORS } from '../colors.ts';
import type { Rgb } from '../mesh.ts';
import type { Vec3 } from '../tuples.ts';
import { buildPlayer } from '../player.ts';
import { boneIndex } from '../rig.ts';
import { buildInstrument } from './catalog.ts';
import { placePoint } from './hold.ts';
import {
  TIMPANI,
  XYLOPHONE,
  buildCymbals,
  kettleCount,
  xylophoneBarPosition,
} from './percussion.ts';

describe('kettleCount', () => {
  it('gives two kettles up to C3, three up to F3, and four above (design 4.6)', () => {
    expect(kettleCount(43)).toBe(2);
    expect(kettleCount(48)).toBe(2);
    expect(kettleCount(49)).toBe(3);
    expect(kettleCount(53)).toBe(3);
    expect(kettleCount(54)).toBe(4);
  });
});

describe('buildTimpani', () => {
  it('builds copper kettles with a silver hoop, on three black legs on the floor', () => {
    const parts = buildInstrument('timpani', 4).pieces[0]?.parts ?? [];
    const of = (color: Rgb) => parts.filter((part) => part.color === color);
    const lowest = (list: readonly { readonly corners: readonly number[] }[]): number =>
      Math.min(...list.flatMap((part) => part.corners.filter((_, i) => i % 3 === 1)));
    for (const color of [INSTRUMENT_COLORS.kettle, INSTRUMENT_COLORS.silver]) {
      expect(of(color)).toHaveLength(4);
      for (const part of of(color)) {
        expect(part.finish).toBe('metal');
      }
    }
    // The bowl is round under the head, and it stands on the legs above the floor.
    expect(lowest(of(INSTRUMENT_COLORS.kettle))).toBeGreaterThan(0.3);
    expect(of(INSTRUMENT_COLORS.hardware)).toHaveLength(12);
    expect(lowest(of(INSTRUMENT_COLORS.hardware))).toBeGreaterThan(-1e-9);
    expect(lowest(of(INSTRUMENT_COLORS.hardware))).toBeLessThan(0.02);
  });

  it('builds the largest kettles, each with its head at the same height and its keys', () => {
    for (const count of [2, 3, 4] as const) {
      const heads = buildInstrument('timpani', count).targets.filter((t) => t.kind === 'head');
      expect(heads).toHaveLength(count);
      for (const [i, head] of heads.entries()) {
        expect(head.from[1]).toBe(TIMPANI.headHeight);
        expect(head.keys).toEqual(TIMPANI.keys[i]);
      }
      // The largest kettle is at the left of the player.
      expect(heads[0]?.from[0]).toBeLessThan(heads.at(-1)?.from[0] ?? -Infinity);
    }
  });

  it('keeps the corners of neighbor kettles at least 0.05 m apart', () => {
    const heads = buildInstrument('timpani', 4).targets.filter((t) => t.kind === 'head');
    for (let i = 0; i + 1 < heads.length; i++) {
      const gap =
        new Vector3(...(heads[i + 1]?.from ?? [0, 0, 0])).distanceTo(
          new Vector3(...(heads[i]?.from ?? [0, 0, 0])),
        ) -
        ((TIMPANI.radii[i] ?? 0) + (TIMPANI.radii[i + 1] ?? 0)) / Math.cos(Math.PI / 8);
      expect(gap).toBeGreaterThan(0.05);
    }
  });
});

describe('xylophoneBarPosition', () => {
  it('puts the natural bars side by side and the sharp bars behind them, higher', () => {
    const c = xylophoneBarPosition(72);
    const d = xylophoneBarPosition(74);
    const cSharp = xylophoneBarPosition(73);
    expect(d[0] - c[0]).toBeCloseTo(XYLOPHONE.pitch, 9);
    expect(cSharp[0]).toBeCloseTo((c[0] + d[0]) / 2, 9);
    expect(cSharp[1]).toBeGreaterThan(c[1]);
    expect(cSharp[2]).toBeLessThan(c[2]);
  });

  it('centers the bars on the player, and plays the nearest bar outside the range', () => {
    const low = xylophoneBarPosition(XYLOPHONE.keys[0]);
    const high = xylophoneBarPosition(XYLOPHONE.keys[1]);
    expect(low[0] + high[0]).toBeCloseTo(0, 9);
    expect(xylophoneBarPosition(40)).toEqual(low);
    expect(xylophoneBarPosition(120)).toEqual(high);
  });
});

describe('buildCymbals', () => {
  it('turns the inner faces of the two cymbals to each other', () => {
    const model = buildCymbals();
    const [left, right] = model.pieces;
    const inner = (rotation: readonly [number, number, number, number] | undefined) =>
      new Vector3(0, -1, 0).applyQuaternion(new Quaternion(...(rotation ?? [0, 0, 0, 1])));
    expect(inner(left?.hold.rotation).x).toBeCloseTo(1, 9);
    expect(inner(right?.hold.rotation).x).toBeCloseTo(-1, 9);
    expect(left?.bone).toBe('malletL');
    expect(right?.bone).toBe('malletR');
  });
});

describe('buildSmallPercussion', () => {
  it('gives the tambourine to key 54, and the triangle to the left hand', () => {
    const model = buildInstrument('small-percussion');
    const tambourine = model.targets.find((t) => t.kind === 'head');
    expect(tambourine?.keys).toEqual([54, 54]);
    expect(model.targets.find((t) => t.kind === 'bar')?.bone).toBe('malletL');
  });
});

describe('the instruments of the standing badger (design 4.6)', () => {
  /** Gives the strike points of the heads and the bars of an instrument of the badger. */
  function strikePoints(id: 'snare-drum' | 'xylophone' | 'small-percussion'): Vec3[] {
    const model = buildPlayer('badger', id);
    const points: Vec3[] = [];
    for (const target of model.instrument.targets) {
      if (target.kind === 'bars') {
        const [low, high] = target.keys ?? [0, -1];
        for (let key = low; key <= high; key++) {
          points.push(
            placePoint(model.pieces, { bone: 'instrument', at: xylophoneBarPosition(key) }),
          );
        }
      } else if (target.kind === 'head') {
        points.push(placePoint(model.pieces, { bone: target.bone, at: target.from }));
      }
    }
    return points;
  }

  it('puts each head and bar at least 0.1 m below the shoulders, so that the sticks slant down', () => {
    const shoulder = buildPlayer('badger', 'snare-drum').skeleton.positions[boneIndex('upperArmR')];
    for (const id of ['snare-drum', 'xylophone', 'small-percussion'] as const) {
      for (const point of strikePoints(id)) {
        expect((shoulder?.[1] ?? 0) - point[1], id).toBeGreaterThan(0.1);
      }
    }
  });

  it('puts the snare head and the bars at least 0.45 m in front of the player', () => {
    for (const id of ['snare-drum', 'xylophone'] as const) {
      for (const point of strikePoints(id)) {
        expect(-point[2], id).toBeGreaterThan(0.45);
      }
    }
  });

  it('strikes a sharp bar 0.04 m from its near end', () => {
    const natural = xylophoneBarPosition(72);
    const sharp = xylophoneBarPosition(73);
    // The natural bar C5 is 0.30 m long, and the sharp bars start 0.02 m behind the natural bars.
    expect(-natural[2]).toBeCloseTo(XYLOPHONE.front + XYLOPHONE.longest / 2, 9);
    expect(-sharp[2]).toBeLessThan(XYLOPHONE.front + XYLOPHONE.longest + 0.02 + 0.045);
    expect(-sharp[2]).toBeGreaterThan(XYLOPHONE.front + 0.29 + 0.02 + 0.035);
  });
});
