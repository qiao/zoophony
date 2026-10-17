/**
 * Measures the moves of the left hand of the bowed strings with the code of the app (research of
 * 2026-10-17, round `left-hand`): `buildStrokes()` of `src/pose/strokes.ts` on the part of the
 * first player (player 0) of each bowed seat of each demo. The other players of a seat copy its
 * notes. Each place is in meters from the nut on a real instrument of full size, as in
 * `docs/research/2026-10-17-string-hands/hand-moves.ts`, so the measure does not depend on the
 * body of an animal. A move is a change of the hand place of more than 0.1 mm from one stroke to
 * the next.
 *
 * The probe runs on the tree of `main` too: it reads the place of each stroke from
 * `Stroke.fingerboard` (main) or `Stroke.hand.place` (the branch).
 *
 * Usage, from the root of a tree:
 *
 *     node docs/research/2026-10-17-left-hand/hand-moves.ts [--demo <id>]...
 *     node docs/research/2026-10-17-left-hand/hand-moves.ts --series <demo> <seconds> > <file>
 *
 * `--series` prints a JSON object: for the first player of the first seat of the violins, the
 * violas, and the cellos of the demo, the place of the left hand in mm from the nut on a real
 * string (`BowState.fingerboard`, with the vibrato on the branch) at each 10 ms from 0 s to the
 * time.
 */
import * as strokesModule from '../../../src/pose/strokes.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

type Bowed = 'violin' | 'viola' | 'cello' | 'contrabass';

const BOWED: readonly Bowed[] = ['violin', 'viola', 'cello', 'contrabass'];

/** The string length of a real instrument of full size, in meters. */
const LENGTHS: Readonly<Record<Bowed, number>> = {
  violin: 0.328,
  viola: 0.37,
  cello: 0.69,
  contrabass: 1.06,
};

/** The semitones from the open string to the end of the target `fingerboard`. */
const END = 20;

/** A move of the hand of at most this length, in meters, is no move. */
const STILL = 1e-4;

/** The loose view of a stroke of either tree. */
interface AnyStroke {
  readonly start: number;
  readonly end: number;
  readonly string: number;
  readonly fingerboard?: number;
  readonly hand?: { readonly place: number; readonly position: number; readonly open: boolean };
  readonly vibrato?: number;
}

/** The loose view of the module of either tree. */
interface AnyModule {
  readonly buildStrokes: (...args: unknown[]) => AnyStroke[];
  readonly bowStateAt: (
    strokes: readonly AnyStroke[],
    starts: Float64Array,
    time: number,
    out: Record<string, number>,
  ) => void;
  readonly createBowState: () => Record<string, number>;
  readonly vibratoRate?: (instrument: Bowed, unit: number) => number;
}

// SAFETY: the probe reads the module of the tree in which it runs, main or the branch.
const mod = strokesModule as unknown as AnyModule;
const branch = mod.buildStrokes.length === 6;
const TUNINGS: Readonly<Record<Bowed, readonly number[]>> = {
  violin: [55, 62, 69, 76],
  viola: [48, 55, 62, 69],
  cello: [36, 43, 50, 57],
  contrabass: [28, 33, 38, 43],
};

/**
 * Builds the strokes of a part with the code of the tree.
 *
 * @param notes The notes of the player.
 * @param instrument The instrument.
 * @returns The strokes.
 */
function strokesOf(notes: readonly unknown[], instrument: Bowed): AnyStroke[] {
  return branch
    ? mod.buildStrokes(notes, [], [0.03, 0.6], 1, instrument, mod.vibratoRate?.(instrument, 0.5))
    : mod.buildStrokes(notes, [], [0.03, 0.6], 1, TUNINGS[instrument]);
}

/**
 * Gives the place of a stroke in meters from the nut on a real string.
 *
 * @param stroke The stroke.
 * @param instrument The instrument.
 * @returns The place.
 */
function placeOf(stroke: AnyStroke, instrument: Bowed): number {
  const share = stroke.hand?.place ?? stroke.fingerboard ?? 0;
  return share * LENGTHS[instrument] * (1 - 2 ** (-END / 12));
}

const args = process.argv.slice(2);
const seriesAt = args.indexOf('--series');
const demos = await patchedDemos();

if (seriesAt >= 0) {
  const demo = args[seriesAt + 1] ?? 'boulanger-matin';
  const seconds = Number(args[seriesAt + 2] ?? 30);
  const file = demos.find((d) => d.file === `${demo}.mid`);
  if (!file) {
    throw new Error(`No demo ${demo}.`);
  }
  const score = scoreOf(file.bytes);
  const out: Record<string, number[]> = {};
  for (const instrument of ['violin', 'viola', 'cello'] as const) {
    const seatIndex = score.seats.findIndex((s) => s.section === instrument);
    if (seatIndex < 0) {
      continue;
    }
    const notes = score.notes.filter((n) => n.seatIndex === seatIndex && n.player === 0);
    const strokes = strokesOf(notes, instrument);
    const starts = Float64Array.from(strokes, (s) => s.start);
    const state = mod.createBowState();
    const values: number[] = [];
    for (let k = 0; k <= seconds * 100; k++) {
      mod.bowStateAt(strokes, starts, k / 100, state);
      const share = (state['fingerboard'] ?? 0) + (state['vibrato'] ?? 0);
      values.push(1000 * share * LENGTHS[instrument] * (1 - 2 ** (-END / 12)));
    }
    out[instrument] = values;
  }
  console.log(JSON.stringify({ tree: branch ? 'branch' : 'main', demo, step: 0.01, out }));
} else {
  const asked = args.flatMap((arg, i) => (args[i - 1] === '--demo' ? [arg] : []));
  const rows = new Map<Bowed, { strokes: number; moves: number; travel: number; sound: number; crossings: number; vibrato: number }>(
    BOWED.map((b) => [b, { strokes: 0, moves: 0, travel: 0, sound: 0, crossings: 0, vibrato: 0 }]),
  );
  const parts: string[] = [];
  for (const demo of demos) {
    const id = demo.file.replace(/\.mid$/, '');
    if (asked.length > 0 && !asked.includes(id)) {
      continue;
    }
    const score = scoreOf(demo.bytes);
    for (const [seatIndex, seat] of score.seats.entries()) {
      const instrument = BOWED.find((b) => b === seat.section);
      if (!instrument) {
        continue;
      }
      const notes = score.notes.filter((n) => n.seatIndex === seatIndex && n.player === 0);
      if (notes.length === 0) {
        continue;
      }
      const strokes = strokesOf(notes, instrument);
      const row = rows.get(instrument);
      if (!row) {
        continue;
      }
      let moves = 0;
      for (const [i, s] of strokes.entries()) {
        row.strokes += 1;
        row.sound += Math.max(0, s.end - s.start);
        row.vibrato += (s.vibrato ?? 0) > 0 ? 1 : 0;
        const before = strokes[i - 1];
        if (!before) {
          continue;
        }
        const move = Math.abs(placeOf(s, instrument) - placeOf(before, instrument));
        if (move > STILL) {
          moves += 1;
          row.moves += 1;
          row.travel += move;
        }
        row.crossings += s.string !== before.string ? 1 : 0;
      }
      parts.push(`| ${id} | ${instrument} ${seat.indexInSection} | ${strokes.length} | ${((100 * moves) / strokes.length).toFixed(1)}% |`);
    }
  }
  const pct = (a: number, b: number): string => `${((100 * a) / b).toFixed(1)}%`;
  console.log(`Tree: ${branch ? 'branch (Stroke.hand)' : 'main (Stroke.fingerboard)'}`);
  console.log('');
  console.log('| Instrument | Strokes | Strokes that move the hand | Share | Mean move mm | Moves for each second of sound | Hand travel mm/s | String changes | Strokes with vibrato |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const instrument of BOWED) {
    const r = rows.get(instrument);
    if (!r || r.strokes === 0) {
      continue;
    }
    console.log(
      `| ${instrument} | ${r.strokes} | ${r.moves} | ${pct(r.moves, r.strokes)} | ${r.moves > 0 ? ((1000 * r.travel) / r.moves).toFixed(1) : '-'} | ${(r.moves / r.sound).toFixed(2)} | ${((1000 * r.travel) / r.sound).toFixed(0)} | ${pct(r.crossings, r.strokes)} | ${pct(r.vibrato, r.strokes)} |`,
    );
  }
  console.log(
    ['', '## Each part', '', '| Demo | Part | Strokes | Share that moves |', '|---|---|---|---|', ...parts].join('\n'),
  );
}
