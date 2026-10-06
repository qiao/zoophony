import { describe, expect, it } from 'vitest';

import { chord, programChange, track, writeSmf } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import type { Score, SectionSize } from '../score/types.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { CONDUCTOR, castScore } from './cast.ts';
import { obstaclesTouch } from './footprint.ts';
import type { PlacedBox } from './footprint.ts';
import { REFERENCE_STAGE_SIDE, SEATED_ARC } from './layout.ts';
import type { PlayerPlace, SceneLayout } from './layout.ts';
import {
  FOOTPRINT_GAP,
  ROW_STEP,
  SPREAD_LIMITS,
  divideSingers,
  layoutObstacles,
  layoutScene,
  placesOfCast,
} from './layout-scene.ts';
import type { Vec3 } from './tuples.ts';
import { ModelCache } from './model-cache.ts';
import { buildPlayer } from './player.ts';
import { boneIndex } from './rig.ts';
import { PODIUM_SIZE } from './stage.ts';
import { choirFile } from './test-choir.ts';
import { perf60File } from './test-perf-60.ts';

/**
 * One model cache for all layouts of this file. A model of a kind of player is always the same, so
 * the tests build each kind once. A new cache for each layout takes most of the time of the file.
 */
const MODELS = new ModelCache();

/**
 * The layouts of the demos and of the choir test file with the three section sizes, and of
 * `perf-60.mid` (9.5).
 */
const LAYOUTS: readonly { name: string; score: Score; layout: SceneLayout }[] = await (async () => {
  const sizes: readonly SectionSize[] = ['auto', 'one-per-part', 'full'];
  const inputs = [
    ...(await patchedDemos()).map((demo) => ({ name: demo.file, file: demo.bytes })),
    { name: 'choir', file: writeSmf(choirFile()) },
  ];
  const cases = inputs.flatMap(({ name, file }) =>
    sizes.map((size) => ({ name: `${name} ${size}`, score: scoreOf(file, size) })),
  );
  cases.push({ name: 'perf-60', score: scoreOf(perf60File(), 'one-per-part') });
  return cases.map((c) => ({ ...c, layout: layoutScene(c.score, MODELS) }));
})();

/** Gives the place of a player relative to the podium center: the radius and the angle. */
function polar(layout: SceneLayout, place: PlayerPlace) {
  const dx = place.position[0] - layout.podium[0];
  const dz = place.position[2] - layout.podium[2];
  return { radius: Math.hypot(dx, dz), angle: Math.atan2(dx, -dz) };
}

/**
 * Groups the seats of the instrumental rows by their radius, with the angle of each seat. The
 * pianist and the singers are not in a row.
 *
 * @returns The angles of each row, from the front.
 */
function rowsOf(layout: SceneLayout): Map<number, number[]> {
  const rows = new Map<number, number[]>();
  for (const p of layout.players) {
    if (p.support === 'bench' || p.support === 'riser') {
      continue;
    }
    const { radius, angle } = polar(layout, p);
    const key = Math.round(radius * 1e6) / 1e6;
    rows.set(key, [...(rows.get(key) ?? []), angle]);
  }
  return new Map([...rows].toSorted((a, b) => a[0] - b[0]));
}

/** Finds the layout of a case. */
function layoutOf(name: string): SceneLayout {
  const found = LAYOUTS.find((c) => c.name === name);
  if (!found) {
    throw new Error(`No layout ${name}.`);
  }
  return found.layout;
}

/** Gives the players of a section in a layout, from the cast instrument. */
function playersWith(layout: SceneLayout, instrument: string): PlayerPlace[] {
  return layout.players.filter((p) => p.cast.instrument === instrument);
}

describe('layoutScene', () => {
  it('gives each player of the cast a place, in the order of the cast (design 5.1)', () => {
    for (const { name, score, layout } of LAYOUTS) {
      expect(
        layout.players.map((p) => p.cast),
        name,
      ).toEqual(castScore(score));
    }
    const perf = layoutOf('perf-60');
    expect(perf.players).toHaveLength(60);
  });

  it('takes the player models from the cache of the score (audit 2026-10-05, finding 8)', () => {
    const asked = new Set<string>();
    /** A cache that records each kind of player that the layout asks for. */
    class RecordingCache extends ModelCache {
      override get(...args: Parameters<ModelCache['get']>) {
        const [species, instrument, kettles = 4] = args;
        asked.add(`${species} ${instrument} ${kettles}`);
        return MODELS.get(...args);
      }
    }
    const score = scoreOf(perf60File(), 'one-per-part');
    layoutScene(score, new RecordingCache());
    const kinds = castScore(score).map((c) => `${c.species} ${c.instrument} ${c.kettles}`);
    expect([...asked].toSorted()).toEqual(
      [...new Set([...kinds, `${CONDUCTOR.species} ${CONDUCTOR.instrument} 4`])].toSorted(),
    );
  });

  it('throws for a player with no place (review of step 4, F9)', () => {
    const { score, layout } = LAYOUTS[0] ?? { score: undefined, layout: undefined };
    if (!score || !layout) {
      throw new Error('No layout.');
    }
    const cast = castScore(score);
    expect(placesOfCast(layout.players, cast)).toEqual(layout.players);
    const missing = layout.players.map((p, i) => (i === 3 ? undefined : p));
    expect(() => placesOfCast(missing, cast)).toThrow(/no place for player 3/);
  });

  it('keeps all chairs, players, instruments, stands, and risers apart (design 4.5)', () => {
    for (const { name, layout } of LAYOUTS) {
      const obstacles = layoutObstacles(layout, MODELS);
      const touching: string[] = [];
      for (const [i, a] of obstacles.entries()) {
        for (const b of obstacles.slice(i + 1)) {
          if (obstaclesTouch(a, b, 0)) {
            touching.push(`${a.label} and ${b.label}`);
          }
        }
      }
      expect(touching, name).toEqual([]);
    }
  });

  it('keeps all items on the stage (design 4.5, stage origin)', () => {
    const reach = (b: PlacedBox): Vec3 => [
      b.halfX * Math.abs(b.cos) + b.halfZ * Math.abs(b.sin),
      0,
      b.halfX * Math.abs(b.sin) + b.halfZ * Math.abs(b.cos),
    ];
    for (const { name, layout } of LAYOUTS) {
      const half = layout.stageSide / 2;
      for (const obstacle of layoutObstacles(layout, MODELS)) {
        for (const box of obstacle.boxes) {
          expect(Math.abs(box.x) + reach(box)[0], `${name}: ${obstacle.label}`).toBeLessThanOrEqual(
            half - 0.3 + 1e-9,
          );
          expect(Math.abs(box.z) + reach(box)[2], `${name}: ${obstacle.label}`).toBeLessThanOrEqual(
            half + 1e-9,
          );
        }
      }
      expect(layout.stageSide, name).toBeGreaterThanOrEqual(5);
    }
  });

  it('gives the reference composition the stage of 8.12 m (design 4.5)', () => {
    const seat = (
      channel: number,
      program: number,
      keys: readonly number[],
    ): ReturnType<typeof track> =>
      track([programChange(0, channel, program)], chord(0, channel, keys));
    // Three first violins, four second violins and a cello, two flutes and three clarinets.
    const score = scoreOf(
      {
        tracks: [
          seat(0, 40, [72, 74, 76]),
          seat(1, 40, [60, 62, 64, 65]),
          seat(2, 42, [48]),
          seat(3, 73, [72, 76]),
          seat(4, 71, [60, 64, 67]),
        ],
      },
      'one-per-part',
    );
    const layout = layoutScene(score);
    expect(layout.stageSide).toBeCloseTo(REFERENCE_STAGE_SIDE, 2);
    expect(layout.podium[2]).toBeCloseTo(layout.stageSide / 2 - 1.0, 9);
    // The first desks sit in row 0, the third first violin and the second desk of the second
    // violins in row 1, the flutes in row 2, and the clarinets in row 3.
    const radii = layout.players.map((p) => polar(layout, p).radius);
    expect(radii.map((r) => Math.round(r * 100) / 100)).toEqual([
      2.72, 2.72, 3.92, 2.72, 2.72, 3.92, 3.92, 2.72, 5.12, 5.12, 6.32, 6.32, 6.32,
    ]);
  });

  it('puts the conductor on the podium top, facing the orchestra (design 4.5)', () => {
    for (const { name, layout } of LAYOUTS) {
      const [x, y, z] = layout.podium;
      expect(layout.conductor.position, name).toEqual([x, y + PODIUM_SIZE[1], z]);
      expect(layout.conductor.facing, name).toBe(0);
    }
  });

  it('puts the violins to the left of 0° and the other strings to the right (design 4.2)', () => {
    const desks = new Set(['violin', 'viola', 'cello']);
    for (const { name, layout } of LAYOUTS) {
      for (const p of layout.players) {
        if (!desks.has(p.cast.instrument)) {
          continue;
        }
        const { radius, angle } = polar(layout, p);
        const left = p.cast.instrument === 'violin';
        expect(left ? angle < 0 : angle > 0, `${name}: ${p.cast.instrument}`).toBe(true);
        // No string player sits behind the conductor.
        expect(Math.abs(angle) * radius, name).toBeGreaterThanOrEqual(SEATED_ARC / 2 - 1e-9);
      }
    }
  });

  it('puts the first desk of each string seat in row 0 and the other desks in row 1', () => {
    for (const { name, layout } of LAYOUTS) {
      const [rowZero = 0, rowOne = 0] = rowsOf(layout).keys();
      for (const p of layout.players) {
        if (!['violin', 'viola', 'cello'].includes(p.cast.instrument)) {
          continue;
        }
        const expected = p.cast.player < 2 ? rowZero : rowOne;
        expect(polar(layout, p).radius, `${name}: ${p.cast.instrument}`).toBeCloseTo(expected, 6);
      }
    }
  });

  it('puts the contrabasses, the timpani, and the brass of the back row in the last row', () => {
    for (const { name, layout } of LAYOUTS) {
      const radii = [...rowsOf(layout).keys()];
      const last = radii.at(-1) ?? 0;
      for (const p of layout.players) {
        if (['contrabass', 'timpani', 'trombone', 'tuba'].includes(p.cast.instrument)) {
          expect(polar(layout, p).radius, `${name}: ${p.cast.instrument}`).toBeCloseTo(last, 6);
        }
      }
    }
  });

  it('steps each row back by at least 1.2 m and keeps it within ±90° (design 4.5)', () => {
    for (const { name, layout } of LAYOUTS) {
      const rows = rowsOf(layout);
      const radii = [...rows.keys()];
      expect(radii[0], name).toBeGreaterThanOrEqual(2.4 - 1e-6);
      radii.slice(1).forEach((r, i) => {
        expect(r - (radii[i] ?? 0), name).toBeGreaterThanOrEqual(ROW_STEP - 1e-6);
      });
      for (const angles of rows.values()) {
        expect(Math.max(...angles.map(Math.abs)), name).toBeLessThanOrEqual(
          SPREAD_LIMITS.maxAngle + 1e-9,
        );
      }
    }
  });

  it('keeps the stage side of the packed rows (review of step 4, F1)', () => {
    // The bodies of animals.webp (wider hips, a lower chair) changed the sides a little. Before:
    // 9.83, 7.12, 10.96, and 14.68 m. The pandas of the cellos are narrower than the elephants
    // of the first map: Grieg was 7.23 m with the elephants. The round torso of the third round
    // made perf-60 14.66 m (was 14.69 m), and its head and snouts 14.67 m. The holds of step 5
    // turn the cello and the contrabass, so that the neck passes the left of the head (review of
    // step 5, F2). Before: 9.82, 11.68, 7.0, and 14.67 m. The dogs of the cellos made Grieg 7.32 m
    // and perf-60 14.73 m. The professional seating (docs/research/seating.md) moved the first
    // desks of the four string sections into row 0 and the contrabasses into the last row.
    // Before: 10.05, 11.8, 7.32, 10.94, 8.1, 8.91, and 14.73 m.
    const sides = {
      'boulanger-matin.mid auto': 11.19,
      'mozart-k315.mid auto': 8.75,
      'beethoven-9.mid auto': 11.18,
      'mozart-k525.mid auto': 6.71,
      'bach-bwv1048.mid auto': 10.43,
      'beethoven-8.mid auto': 9.91,
      'choir auto': 12.0,
      'perf-60': 13.41,
    };
    for (const [name, side] of Object.entries(sides)) {
      expect(layoutOf(name).stageSide, name).toBeCloseTo(side, 2);
    }
  });

  it('spreads the rows toward the front corners (review of step 4, F1)', () => {
    // The distance from the front right corner, which the default camera sees at the bottom of
    // the image, to the nearest seat, in stage sides. The packed rows gave 0.29 to 0.48, and the
    // reference image gives 0.10.
    const nearCorner = (layout: SceneLayout): number => {
      const half = layout.stageSide / 2;
      const distances = layout.players.map((p) =>
        Math.hypot(p.position[0] - half, p.position[2] - half),
      );
      return Math.min(...distances) / layout.stageSide;
    };
    for (const { name, layout } of LAYOUTS) {
      if (name.endsWith(' auto')) {
        expect(nearCorner(layout), name).toBeLessThanOrEqual(0.31);
      }
    }
    // The wider cellos and contrabasses of step 5 moved it from 0.147 to 0.181. The professional
    // seating moved it to 0.284, and the wedges of the back desks to 0.205.
    expect(nearCorner(layoutOf('perf-60'))).toBeLessThanOrEqual(0.21);
  });

  it('moves the back desks behind the first desks of their seats (design 4.5)', () => {
    // In the Beethoven 9 demo, the back desks of the cellos and the violas sit behind their first
    // desks, as in the wedges of a professional orchestra. In the removed Beethoven 5 demo, the
    // spread alone put the cello at 30°, behind the violas.
    const layout = layoutOf('beethoven-9.mid auto');
    const angle = (p: PlayerPlace): number => (polar(layout, p).angle * 180) / Math.PI;
    for (const instrument of ['cello', 'viola'] as const) {
      const seats = new Set(playersWith(layout, instrument).map((p) => p.cast.seatIndex));
      for (const seat of seats) {
        const players = playersWith(layout, instrument).filter((p) => p.cast.seatIndex === seat);
        const front = players.filter((p) => p.cast.player < 2).map(angle);
        const back = players.filter((p) => p.cast.player >= 2).map(angle);
        const middle = (list: readonly number[]): number =>
          list.reduce((sum, a) => sum + a, 0) / list.length;
        expect(back.length, `${instrument} ${seat}`).toBeGreaterThan(0);
        expect(Math.abs(middle(back) - middle(front)), `${instrument} ${seat}`).toBeLessThan(5);
      }
    }
  });

  it('keeps two neighbors of a row at most 1.6 m apart (review of step 4, F1)', () => {
    for (const { name, layout } of LAYOUTS) {
      const stringRow = (back: boolean): number | undefined => {
        const p = layout.players.find(
          (q) =>
            ['violin', 'viola', 'cello'].includes(q.cast.instrument) && q.cast.player >= 2 === back,
        );
        return p ? Math.round(polar(layout, p).radius * 1e6) / 1e6 : undefined;
      };
      const backDesks = stringRow(true);
      const splitRows = new Set([stringRow(false), backDesks]);
      for (const [radius, angles] of rowsOf(layout)) {
        // The back desks move toward the first desks of their seats after the spread. Thus
        // their arcs can be longer than 1.6 m.
        if (radius === backDesks) {
          continue;
        }
        const sorted = angles.toSorted((a, b) => a - b);
        sorted.slice(1).forEach((angle, i) => {
          const before = sorted[i] ?? angle;
          // The gap of the conductor in rows 0 and 1 has no limit.
          if (splitRows.has(radius) && before < 0 && angle > 0) {
            return;
          }
          // The pair is in this row: a player of another row can have the same angle (review of
          // step 4, P3).
          const pair = layout.players
            .filter((p) => {
              const place = polar(layout, p);
              return (
                Math.round(place.radius * 1e6) / 1e6 === radius &&
                [before, angle].includes(place.angle)
              );
            })
            .map((p) => p.cast.instrument);
          expect(pair, name).toHaveLength(2);
          // Two contrabasses with their shared stand need 2.17 m of arc before the spread, two
          // cellos 1.67 m, and a contrabass beside the timpani (1.82 m wide) 1.84 m. The spread
          // keeps an arc that is already longer than 1.6 m.
          const wide = new Set(['contrabass', 'cello', 'timpani']);
          if (pair.every((instrument) => wide.has(instrument))) {
            return;
          }
          expect(radius * (angle - before), `${name}: ${pair.join(' and ')}`).toBeLessThanOrEqual(
            SPREAD_LIMITS.maxArc + 1e-5,
          );
        });
      }
    }
  });

  it('places the piano 2.0 m to the left and 0.8 m to the front, with the pianist facing +x', () => {
    // The harpsichord of the Bach demo plays in the piano section (design 3.5).
    const layout = layoutOf('bach-bwv1048.mid auto');
    const [pianist] = playersWith(layout, 'piano');
    expect(pianist?.support).toBe('bench');
    expect(pianist?.facing).toBeCloseTo(-Math.PI / 2, 9);
    // Facing -π/2 turns the front of the model (-z) to +x.
    expect(-Math.sin(pianist?.facing ?? 0)).toBeCloseTo(1, 9);
    const model = buildPlayer('meerkat', 'piano');
    const keys = model.pieces[0]?.at.position ?? [0, 0, 0];
    // The front of the keys is 0.55 H + 0.05 m in front of the seat (design 4.6), along +x.
    const keyFront = (pianist?.position[0] ?? 0) - keys[2];
    expect(keyFront - (pianist?.position[0] ?? 0)).toBeCloseTo(0.55 * 0.85 * 0.38 + 0.05, 9);
    // The case is 2.0 m long from the key front, so its middle is 1.0 m to the right of it.
    expect(keyFront + 1.0 - layout.podium[0]).toBeCloseTo(-2.0, 1);
    // The front edge keeps 0.3 m in front of the piano case, which is 1.40 m wide.
    const front = layout.stageSide / 2 - layout.podium[2];
    expect(front).toBeGreaterThan(0.8 + 0.7 + 0.3 - 0.05);
  });

  it('shares a stand for two string players and gives each wind player its own', () => {
    const layout = layoutOf('boulanger-matin.mid auto');
    const strings = layout.players.filter((p) =>
      ['violin', 'viola', 'cello', 'contrabass'].includes(p.cast.instrument),
    );
    const winds = layout.players.filter((p) =>
      ['flute', 'oboe', 'clarinet', 'bassoon', 'horn', 'trumpet', 'trombone', 'tuba'].includes(
        p.cast.instrument,
      ),
    );
    const seats = new Map<number, number>();
    for (const p of strings) {
      seats.set(p.cast.seatIndex, (seats.get(p.cast.seatIndex) ?? 0) + 1);
    }
    const shared = [...seats.values()].reduce((sum, n) => sum + Math.ceil(n / 2), 0);
    expect(layout.stands).toHaveLength(shared + winds.length);
  });

  it('keeps the ears of neighbor elephants apart (review of step 3, F12)', () => {
    const ears = new Set([boneIndex('earL'), boneIndex('earR')]);
    const mesh = buildPlayer('elephant', 'cello').mesh;
    const local: Vec3[] = [];
    for (let v = 0; v < mesh.bones.length; v++) {
      if (ears.has(mesh.bones[v] ?? -1)) {
        local.push([
          mesh.positions[v * 3] ?? 0,
          mesh.positions[v * 3 + 1] ?? 0,
          mesh.positions[v * 3 + 2] ?? 0,
        ]);
      }
    }
    const world = (p: PlayerPlace): Vec3[] =>
      local.map(([x, y, z]) => [
        p.position[0] + x * Math.cos(p.facing) + z * Math.sin(p.facing),
        y,
        p.position[2] - x * Math.sin(p.facing) + z * Math.cos(p.facing),
      ]);
    for (const { name, layout } of LAYOUTS) {
      const cellos = playersWith(layout, 'cello').toSorted(
        (a, b) => polar(layout, a).angle - polar(layout, b).angle,
      );
      cellos.slice(1).forEach((cello, i) => {
        const a = world(cellos[i] ?? cello);
        const b = world(cello);
        let nearest = Infinity;
        for (const p of a) {
          for (const q of b) {
            nearest = Math.min(nearest, Math.hypot(p[0] - q[0], p[2] - q[2]));
          }
        }
        expect(nearest, name).toBeGreaterThan(FOOTPRINT_GAP);
      });
    }
  });

  it('fills the risers evenly, with the count of levels that gives the smallest stage (F13)', () => {
    expect(divideSingers(32, 3)).toEqual([11, 11, 10]);
    expect(divideSingers(7, 2)).toEqual([4, 3]);
    // The choir test file has 32 singers behind the timpani. With the professional seating, two
    // levels give the smallest stage.
    const layout = layoutOf('choir auto');
    expect(layout.risers.map((r) => r.level)).toEqual([0, 1]);
    // The lowest level stands 1.0 m high, so that the back row hides no singer (design 4.5).
    expect(layout.risers.map((r) => r.height)).toEqual([1, 1.25]);
    const singers = playersWith(layout, 'choir-folder');
    const perLevel = layout.risers.map(
      (r) => singers.filter((s) => Math.abs(s.position[1] - r.height) < 1e-9).length,
    );
    expect(perLevel).toEqual([16, 16]);
    for (const s of singers) {
      expect(s.support).toBe('riser');
    }
    // Level 0 filled first to 160° gave 15.44 m for a choir of 32 (review of step 3, F13).
    expect(layout.stageSide).toBeLessThan(12.1);
  });
});
