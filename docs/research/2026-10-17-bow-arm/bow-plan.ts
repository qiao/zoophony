/**
 * Measures the bow plan of the bowed strings with the code of the app (research of 2026-10-17,
 * round `bow-arm`): `buildStrokes()` and `bowStateAt()` of `src/pose/strokes.ts` on the part of
 * the first player (player 0) of each bowed seat of each demo, with the loudness of the score.
 * The other players of a seat copy its notes. It prints for each instrument: the bows for each
 * second of sound, the share of the notes in a slur, the string turn and the stick tilt of each
 * hold, the time of the string crossings and their lead before the note, the share of the fast
 * crossings in which the right elbow keeps the mean string, and the sounding point by loudness.
 *
 * The probe runs on the tree of `main` too: there, each normal stroke is a bow, the crossing
 * follows `BOW_MOTION.shiftSec`, and the contact point stays at the point of the model, 1/16 of
 * the string length from the bridge.
 *
 * Usage, from the root of a tree:
 *
 *     node docs/research/2026-10-17-bow-arm/bow-plan.ts [--demo <id>]...
 *     node docs/research/2026-10-17-bow-arm/bow-plan.ts --series <demo> <from> <seconds> > <file>
 *
 * `--series` prints a JSON object: for the first player of the first seat of the violins, the
 * place of the strings on the bow hair as a share of the bow range, and the angle of the bow
 * around the strings from the middle of the strings in degrees, at each 10 ms of the time range.
 */
import * as rigModule from '../../../src/pose/bowed-rig.ts';
import { noteLoudness } from '../../../src/pose/loudness.ts';
import * as strokesModule from '../../../src/pose/strokes.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import type { PlayerNote } from '../../../src/score/types.ts';
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

/** The share of the bow contact point of the model from the bridge: 15 mm of 240 mm. */
const MODEL_SHARE = 0.015 / 0.24;

/** The species of each section, with its own hold or the hold of the instrument. */
const SPECIES: Readonly<Record<Bowed, readonly string[]>> = {
  violin: ['rabbit', 'fox-red'],
  viola: ['cat'],
  cello: ['dog'],
  contrabass: ['hippo'],
};

/** The bow range of the probe, in meters. */
const RANGE = [0.03, 0.6] as const;

/** The loose view of a stroke of either tree. */
interface AnyStroke {
  readonly start: number;
  readonly end: number;
  readonly technique: string;
  readonly string: number;
  readonly slur?: { readonly notes: number };
  readonly crossMean?: number;
}

/** The loose view of a hold of either tree. */
interface AnyHold {
  readonly stringTurn: number;
  readonly bowTilt?: number;
  readonly soundingPoint?: readonly [number, number];
}

/** The loose view of the modules of either tree. */
interface AnyModule {
  readonly buildStrokes: (...args: unknown[]) => AnyStroke[];
  readonly bowStateAt: (
    strokes: readonly AnyStroke[],
    starts: Float64Array,
    time: number,
    out: Record<string, number>,
  ) => void;
  readonly createBowState: () => Record<string, number>;
  readonly vibratoRate: (instrument: Bowed, unit: number) => number;
  readonly holdOf: (species: string, instrument: Bowed) => AnyHold;
}

// SAFETY: the probe reads the modules of the tree in which it runs, main or the branch.
const mod = { ...strokesModule, ...rigModule } as unknown as AnyModule;
const branch = mod.buildStrokes.length === 7;

/**
 * Builds the strokes of a part with the code of the tree.
 *
 * @param notes The notes of the player.
 * @param loudness The loudness of each note.
 * @param instrument The instrument.
 * @param beats The times of the beats.
 * @returns The strokes.
 */
function strokesOf(
  notes: readonly PlayerNote[],
  loudness: readonly number[],
  instrument: Bowed,
  beats: Float64Array,
): AnyStroke[] {
  const hz = mod.vibratoRate(instrument, 0.5);
  return branch
    ? mod.buildStrokes(notes, loudness, RANGE, 1, instrument, hz, beats)
    : mod.buildStrokes(notes, loudness, RANGE, 1, instrument, hz);
}

/**
 * Gives the notes and the loudness of the first player of a seat.
 *
 * @param score The score.
 * @param all The loudness of each note of the score.
 * @param seatIndex The seat.
 * @returns The notes and their loudness.
 */
function partOf(
  score: ReturnType<typeof scoreOf>,
  all: Float32Array,
  seatIndex: number,
): { notes: PlayerNote[]; loudness: number[] } {
  const notes: PlayerNote[] = [];
  const loudness: number[] = [];
  for (const [i, n] of score.notes.entries()) {
    if (n.seatIndex === seatIndex && n.player === 0) {
      notes.push(n);
      loudness.push(all[i] ?? 0);
    }
  }
  return { notes, loudness };
}

/**
 * Gives the turn of the bow around the strings of the first species of a section, in degrees.
 *
 * @param instrument The instrument.
 * @returns The turn for each string.
 */
function turnOf(instrument: Bowed): number {
  const species = SPECIES[instrument][0] ?? 'rabbit';
  return (mod.holdOf(species, instrument).stringTurn * 180) / Math.PI;
}

const args = process.argv.slice(2);
const seriesAt = args.indexOf('--series');
const demos = await patchedDemos();

if (seriesAt >= 0) {
  const demo = args[seriesAt + 1] ?? 'boulanger-matin';
  const from = Number(args[seriesAt + 2] ?? 0);
  const seconds = Number(args[seriesAt + 3] ?? 20);
  const file = demos.find((d) => d.file === `${demo}.mid`);
  if (!file) {
    throw new Error(`No demo ${demo}.`);
  }
  const score = scoreOf(file.bytes);
  const seatIndex = score.seats.findIndex((s) => s.section === 'violin');
  const { notes, loudness } = partOf(score, noteLoudness(score), seatIndex);
  const beats = Float64Array.from(score.beats, (b) => b.timeSec);
  const strokes = strokesOf(notes, loudness, 'violin', beats);
  const starts = Float64Array.from(strokes, (s) => s.start);
  const state = mod.createBowState();
  const turn = turnOf('violin');
  const bow: number[] = [];
  const angle: number[] = [];
  for (let k = 0; k <= seconds * 100; k++) {
    mod.bowStateAt(strokes, starts, from + k / 100, state);
    bow.push(((state['bow'] ?? 0) - RANGE[0]) / (RANGE[1] - RANGE[0]));
    angle.push(((state['string'] ?? 0) - 1.5) * turn);
  }
  console.log(
    JSON.stringify({ tree: branch ? 'branch' : 'main', demo, from, step: 0.01, bow, angle }),
  );
} else {
  const asked = args.flatMap((arg, i) => (args[i - 1] === '--demo' ? [arg] : []));
  interface Row {
    notes: number;
    bows: number;
    slurred: number;
    sound: number;
    crossings: number;
    crossTime: number;
    crossLead: number;
    fastCrossings: number;
    meanKept: number;
    /** The sum and the count of the sounding point in mm, in three bins of loudness. */
    sounding: [number, number][];
  }
  const rows = new Map<Bowed, Row>(
    BOWED.map((b) => [
      b,
      {
        notes: 0,
        bows: 0,
        slurred: 0,
        sound: 0,
        crossings: 0,
        crossTime: 0,
        crossLead: 0,
        fastCrossings: 0,
        meanKept: 0,
        sounding: [
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
    ]),
  );
  const state = mod.createBowState();
  for (const demo of demos) {
    const id = demo.file.replace(/\.mid$/, '');
    if (asked.length > 0 && !asked.includes(id)) {
      continue;
    }
    const score = scoreOf(demo.bytes);
    const all = noteLoudness(score);
    const beats = Float64Array.from(score.beats, (b) => b.timeSec);
    for (const [seatIndex, seat] of score.seats.entries()) {
      const instrument = BOWED.find((b) => b === seat.section);
      const row = instrument ? rows.get(instrument) : undefined;
      if (!instrument || !row) {
        continue;
      }
      const { notes, loudness } = partOf(score, all, seatIndex);
      if (notes.length === 0) {
        continue;
      }
      const strokes = strokesOf(notes, loudness, instrument, beats);
      const starts = Float64Array.from(strokes, (s) => s.start);
      const hold = mod.holdOf(SPECIES[instrument][0] ?? 'rabbit', instrument);
      let lastSlur: unknown = null;
      for (const [i, s] of strokes.entries()) {
        if (s.technique !== 'normal') {
          continue;
        }
        row.notes += 1;
        row.sound += Math.max(0, s.end - s.start);
        const slur = s.slur ?? s;
        if (slur !== lastSlur) {
          row.bows += 1;
        }
        lastSlur = slur;
        row.slurred += (s.slur?.notes ?? 1) > 1 ? 1 : 0;

        // The sounding point at the middle of the note, in mm from the bridge on a real string.
        mod.bowStateAt(strokes, starts, (s.start + s.end) / 2, state);
        const level = state['loudness'];
        const [piano, forte] = hold.soundingPoint ?? [MODEL_SHARE, MODEL_SHARE];
        const share = level === undefined ? MODEL_SHARE : piano + (forte - piano) * level;
        const bin = level === undefined ? 1 : level < 0.3 ? 0 : level < 0.6 ? 1 : 2;
        const cell = row.sounding[bin];
        if (cell) {
          cell[0] += 1000 * share * LENGTHS[instrument];
          cell[1] += 1;
        }

        // The crossing to the next stroke: the times at which the string leaves and reaches.
        const next = strokes[i + 1];
        if (!next || next.string === s.string || next.technique === 'pizzicato') {
          continue;
        }
        let left = Number.NaN;
        let reached = Number.NaN;
        const first = Math.max(s.start, next.start - 0.2);
        for (let j = 0; j <= 200; j++) {
          const t = Math.min(next.start, first + j * 0.001);
          mod.bowStateAt(strokes, starts, t, state);
          const string = state['string'] ?? 0;
          if (Number.isNaN(left) && Math.abs(string - s.string) > 1e-6) {
            left = t;
          }
          if (Number.isNaN(reached) && Math.abs(string - next.string) < 1e-6) {
            reached = t;
          }
        }
        if (!Number.isNaN(left) && !Number.isNaN(reached)) {
          row.crossings += 1;
          row.crossTime += reached - left;
          row.crossLead += next.start - reached;
        }
        if (next.start - s.start < 0.25) {
          row.fastCrossings += 1;
          row.meanKept += s.crossMean !== undefined && s.crossMean !== s.string ? 1 : 0;
        }
      }
    }
  }
  const pct = (a: number, b: number): string => (b > 0 ? `${((100 * a) / b).toFixed(1)}%` : '-');
  console.log(`Tree: ${branch ? 'branch' : 'main'}`);
  console.log('');
  console.log(
    '| Instrument | Turn | Tilt | Notes | Bows for each second of sound | Notes in a slur | Crossings | Mean crossing ms | Mean lead ms | Fast crossings with the elbow on the mean string | Sounding point mm, loudness < 0.3 | 0.3 to 0.6 | > 0.6 |',
  );
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const instrument of BOWED) {
    const r = rows.get(instrument);
    if (!r || r.notes === 0) {
      continue;
    }
    const hold = mod.holdOf(SPECIES[instrument][0] ?? 'rabbit', instrument);
    const mm = r.sounding.map(([sum, n]) => (n > 0 ? `${(sum / n).toFixed(1)} (${n})` : '-'));
    console.log(
      `| ${instrument} | ${turnOf(instrument).toFixed(0)}° | ${(((hold.bowTilt ?? 0) * 180) / Math.PI).toFixed(0)}° | ${r.notes} | ${(r.bows / r.sound).toFixed(2)} | ${pct(r.slurred, r.notes)} | ${r.crossings} | ${((1000 * r.crossTime) / r.crossings).toFixed(1)} | ${((1000 * r.crossLead) / r.crossings).toFixed(1)} | ${pct(r.meanKept, r.fastCrossings)} of ${r.fastCrossings} | ${mm.join(' | ')} |`,
    );
  }
}
