import { describe, expect, it } from 'vitest';

import { chord, noteOff, noteOn, programChange, track, writeSmf } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
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
  SOLOIST_FACING,
  SOLOIST_PLACE,
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
import { violinConcertinoFile } from '../score/test-audit-files.ts';
import {
  PLAYING_BONES,
  WIDE_VIEWS,
  hiddenShare,
  silhouettesOf,
  stageCamera,
} from './test-silhouettes.ts';

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
    { name: 'concertino', file: writeSmf(violinConcertinoFile()) },
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
 * soloist (design 3.8), such as the pianist, and the singers are not in a row.
 *
 * @returns The angles of each row, from the front.
 */
function rowsOf(layout: SceneLayout): Map<number, number[]> {
  const soloist = LAYOUTS.find((c) => c.layout === layout)?.score.soloist;
  const rows = new Map<number, number[]>();
  for (const p of layout.players) {
    if (p.cast.seatIndex === soloist || p.support === 'riser') {
      continue;
    }
    const { radius, angle } = polar(layout, p);
    const key = Math.round(radius * 1e6) / 1e6;
    rows.set(key, [...(rows.get(key) ?? []), angle]);
  }
  return new Map([...rows].toSorted((a, b) => a[0] - b[0]));
}

/**
 * Makes a test piano concerto: the strings and a piano of a program, 16 s.
 *
 * @param program The program of the piano.
 * @returns The file.
 */
function pianoConcerto(program: number): TestFile {
  const part = (channel: number, prog: number, key: number) =>
    track(
      [programChange(0, channel, prog)],
      ...Array.from({ length: 32 }, (_, b) => [
        noteOn(b * 480, channel, key, 70),
        noteOff(b * 480 + 470, channel, key),
      ]),
    );
  return {
    tracks: [
      [],
      part(0, 40, 76),
      part(1, 41, 62),
      part(2, 42, 55),
      part(3, 43, 43),
      track([programChange(0, 4, program)], chord(0, 4, [48, 60, 64], 480 * 32)),
    ],
  };
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
    for (const { name, score, layout } of LAYOUTS) {
      const [rowZero = 0, rowOne = 0] = rowsOf(layout).keys();
      for (const p of layout.players) {
        const strings = ['violin', 'viola', 'cello'].includes(p.cast.instrument);
        if (!strings || p.cast.seatIndex === score.soloist) {
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
    // Before: 10.05, 11.8, 7.32, 10.94, 8.1, 8.91, and 14.73 m. The celesta of Boulanger moved
    // from the front left to the row of the harp (UX audit 2026-10-06, N1). Before: 11.19 m. The
    // vocal soloists of Beethoven 9 stand on a level of their own (N8). Before: 11.18 m.
    const sides = {
      'boulanger-matin.mid auto': 11.29,
      'mozart-k315.mid auto': 8.98,
      'beethoven-9.mid auto': 11.98,
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
          // cellos 1.67 m, and a contrabass beside the timpani (1.82 m wide) 1.84 m. The case
          // and the bench of a keyboard lie along its row and need 2.9 m beside the harp. The
          // spread keeps an arc that is already longer than 1.6 m.
          const wide = new Set(['contrabass', 'cello', 'timpani']);
          if (pair.every((instrument) => wide.has(instrument)) || pair.includes('piano')) {
            return;
          }
          expect(radius * (angle - before), `${name}: ${pair.join(' and ')}`).toBeLessThanOrEqual(
            SPREAD_LIMITS.maxArc + 1e-5,
          );
        });
      }
    }
  });

  it('places a piano soloist 2.0 m to the left and 0.8 m to the front, facing +x', () => {
    const score = scoreOf(pianoConcerto(0));
    expect(score.soloist).toBe(score.seats.findIndex((s) => s.section === 'piano'));
    const layout = layoutScene(score, MODELS);
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

  it('seats a keyboard of the orchestra at the left of the harp, along its row (audit 2, N1)', () => {
    // The celesta of Boulanger and the harpsichord of Bach play color and continuo. They sat at
    // the front left, and their cases covered the first violins (UX audit 2026-10-06, N1).
    for (const name of ['boulanger-matin.mid auto', 'bach-bwv1048.mid auto']) {
      const layout = layoutOf(name);
      const [pianist, ...others] = playersWith(layout, 'piano');
      expect(others, name).toEqual([]);
      if (!pianist) {
        throw new Error(`${name} has no keyboard.`);
      }
      const { radius, angle } = polar(layout, pianist);
      const strings = layout.players.filter((p) =>
        ['violin', 'viola', 'cello'].includes(p.cast.instrument),
      );
      expect(radius, name).toBeGreaterThan(
        Math.max(...strings.map((p) => polar(layout, p).radius)),
      );
      // The pianist faces along the arc toward the middle: a quarter turn from the podium.
      const turn = pianist.facing - (Math.PI - angle);
      expect(Math.cos(turn), name).toBeCloseTo(0, 9);
      expect(Math.sin(turn), name).toBeCloseTo(1, 9);
      // No player of its row sits to its left.
      const row = layout.players.filter(
        (p) => Math.abs(polar(layout, p).radius - radius) < 1e-6 && p !== pianist,
      );
      for (const p of row) {
        expect(polar(layout, p).angle, `${name}: ${p.cast.instrument}`).toBeGreaterThan(angle);
      }
    }
  });

  it('hides no first desk of the violins behind the soloist or a keyboard (audit 2, N1)', () => {
    // A box beside the lines of sight passed the clearance test of the shots. The black case of
    // the celesta covered 49% to 53% of the first violin of Boulanger in three wide views, and
    // the K. 315 flute 17% of the second violin of the first desk in the default view. The case
    // of a piano soloist stands in front of the first violins, as in a piano concerto.
    const found: string[] = [];
    for (const { name, score, layout } of LAYOUTS) {
      // The first violin seat of the orchestra. The concertino has a solo violin and the
      // violins of a string ensemble.
      const first = score.seats.findIndex((s, i) => s.section === 'violin' && i !== score.soloist);
      const front = layout.players.flatMap((p, i) =>
        (p.cast.instrument === 'piano') !== (p.cast.seatIndex === score.soloist) ? [i] : [],
      );
      const desk = layout.players.flatMap((p, i) =>
        p.cast.seatIndex === first && p.cast.player < 2 ? [i] : [],
      );
      for (const view of WIDE_VIEWS) {
        const silhouettes = silhouettesOf(layout, MODELS, stageCamera(layout.stageSide, view));
        for (const back of desk) {
          // The whole player with the section size of the app, then its head, arms, and
          // instrument. The smaller rows of "One per part" put the first desk nearer to the
          // soloist: the ears of the solo rabbit of the concertino hide 12% there.
          const share = name.endsWith(' auto') ? hiddenShare(silhouettes, back, front) : 0;
          const playing = hiddenShare(silhouettes, back, front, PLAYING_BONES);
          const limit = name.endsWith(' one-per-part') ? 0.15 : 0.05;
          if (share >= 0.1 || playing >= limit) {
            const shares = `${(100 * share).toFixed(0)}% and ${(100 * playing).toFixed(0)}%`;
            found.push(`${name}, azimuth ${view.azimuth}, player ${back}: ${shares}`);
          }
        }
      }
    }
    expect(found).toEqual([]);
  });

  it('places the soloist of K. 315 at the front left of the conductor, standing (design 4.5)', () => {
    for (const size of ['auto', 'one-per-part', 'full'] as const) {
      const name = `mozart-k315.mid ${size}`;
      const layout = layoutOf(name);
      const [soloist, ...others] = playersWith(layout, 'flute');
      expect(others, name).toEqual([]);
      expect(soloist?.support, name).toBe('stand');
      expect(soloist?.facing, name).toBeCloseTo(SOLOIST_FACING, 9);
      // The front of the soloist turns 40° from the audience (+z) to the conductor (+x).
      const facing = soloist?.facing ?? 0;
      const turn = (40 * Math.PI) / 180;
      expect(-Math.sin(facing), name).toBeCloseTo(Math.sin(turn), 9);
      expect(-Math.cos(facing), name).toBeCloseTo(Math.cos(turn), 9);
      const [x = 0, , z = 0] = soloist?.position ?? [];
      expect(x - layout.podium[0], name).toBeCloseTo(SOLOIST_PLACE[0], 9);
      expect(z - layout.podium[2], name).toBeCloseTo(SOLOIST_PLACE[1], 9);
      // The soloist plays with no music stand: the oboes and the horns have their own stands,
      // and two string players share one.
      const desks = new Map<number, number>();
      let winds = 0;
      for (const p of layout.players) {
        if (['violin', 'viola', 'cello'].includes(p.cast.instrument)) {
          desks.set(p.cast.seatIndex, (desks.get(p.cast.seatIndex) ?? 0) + 1);
        } else if (['oboe', 'horn'].includes(p.cast.instrument)) {
          winds++;
        }
      }
      const shared = [...desks.values()].reduce((sum, n) => sum + Math.ceil(n / 2), 0);
      expect(layout.stands, name).toHaveLength(shared + winds);
    }
    // The flute sat in the row of the woodwinds, and the stage had the side 8.75 m. The place
    // 0.3 m to the front moves the front edge forward (UX audit 2026-10-06, N1).
    expect(layoutOf('mozart-k315.mid auto').stageSide).toBeCloseTo(8.98, 2);
  });

  it('keeps the front edge 0.3 m in front of the soloist and its instrument (design 4.5)', () => {
    let checked = 0;
    for (const { name, score, layout } of LAYOUTS) {
      const front = layout.stageSide / 2;
      for (const obstacle of layoutObstacles(layout, MODELS)) {
        const place = layout.players.find(
          (p) =>
            p.cast.seatIndex === score.soloist &&
            obstacle.label.startsWith(`${p.cast.species} ${p.cast.instrument}`),
        );
        if (!place) {
          continue;
        }
        for (const b of obstacle.boxes) {
          const reach = b.halfX * Math.abs(b.sin) + b.halfZ * Math.abs(b.cos);
          expect(b.z + reach, `${name}: ${obstacle.label}`).toBeLessThanOrEqual(front - 0.3 + 1e-9);
        }
        checked++;
      }
    }
    // The flute of K. 315 with each section size.
    expect(checked).toBeGreaterThanOrEqual(3);
  });

  it('seats a soloist of the bassoon on a chair at the place of a standing soloist', () => {
    // The test piece of the bassoon soloist of `score/soloist.test.ts`: a loud bassoon under
    // the strings, after a rest of 4 beats.
    const line = (channel: number, program: number, key: number, velocity = 70) =>
      track(
        [programChange(0, channel, program)],
        ...Array.from({ length: 32 }, (_, b) =>
          channel === 4 && b < 4
            ? []
            : [noteOn(b * 480, channel, key, velocity), noteOff(b * 480 + 470, channel, key)],
        ),
      );
    const score = scoreOf({
      tracks: [
        [],
        line(0, 40, 76),
        line(1, 41, 62),
        line(2, 42, 55),
        line(3, 43, 43),
        line(4, 70, 50, 110),
      ],
    });
    expect(score.soloist).toBe(4);
    const layout = layoutScene(score, MODELS);
    const [bassoon] = playersWith(layout, 'bassoon');
    expect(bassoon?.support).toBe('chair');
    expect((bassoon?.position[0] ?? 0) - layout.podium[0]).toBeCloseTo(SOLOIST_PLACE[0], 9);
    expect((bassoon?.position[2] ?? 0) - layout.podium[2]).toBeCloseTo(SOLOIST_PLACE[1], 9);
    const obstacles = layoutObstacles(layout, MODELS);
    for (const [i, a] of obstacles.entries()) {
      for (const b of obstacles.slice(i + 1)) {
        expect(obstaclesTouch(a, b, 0), `${a.label} and ${b.label}`).toBe(false);
      }
    }
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

  it('puts the vocal soloists on the lowest level, in front of the choir (audit 2, N8)', () => {
    // The four soloists of the Ode to Joy stood in the row of the choir as 8 penguins.
    for (const size of ['auto', 'one-per-part', 'full'] as const) {
      const name = `beethoven-9.mid ${size}`;
      const { score, layout } = LAYOUTS.find((c) => c.name === name) ?? {};
      if (!score || !layout) {
        throw new Error(`No layout ${name}.`);
      }
      const singers = playersWith(layout, 'choir-folder');
      const soloists = singers.filter((p) => p.cast.seatIndex === score.vocalSoloists);
      const choir = singers.filter((p) => p.cast.seatIndex !== score.vocalSoloists);
      expect(soloists, name).toHaveLength(4);
      const lowest = layout.risers[0];
      for (const p of soloists) {
        expect(p.position[1], name).toBeCloseTo(lowest?.height ?? 0, 9);
        expect(polar(layout, p).radius, name).toBeCloseTo(lowest?.radius ?? 0, 6);
      }
      for (const p of choir) {
        expect(p.position[1], name).toBeGreaterThan((lowest?.height ?? 0) + 0.1);
      }
      // The soloists stand 1.2 m apart, twice the arc of a singer of the choir.
      const angles = soloists.map((p) => polar(layout, p).angle).toSorted((a, b) => a - b);
      for (const [i, angle] of angles.slice(1).entries()) {
        expect((angle - (angles[i] ?? 0)) * (lowest?.radius ?? 0), name).toBeGreaterThan(1.19);
      }
    }
  });
});
