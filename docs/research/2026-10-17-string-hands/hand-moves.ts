/**
 * Measures the moves of the left hand of the bowed strings in the stroke plan of the app
 * (`buildStrokes()` of `src/pose/strokes.ts`), and in the prototype of a position planner
 * (`planHand()` of `planner.ts`), on the string parts of each demo (research of 2026-10-17).
 *
 * A part is the notes of the first player (player 0) of each bowed seat: the other players of a
 * seat copy its notes. Each place is in meters from the nut on a real instrument of full size,
 * so that the measure does not depend on the body of an animal. The app puts the middle of the
 * finger block on the place of each note (`fingerboardPlace()`). The prototype keeps the middle of
 * the hand frame in its position, and the fingers reach the notes.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-string-hands/hand-moves.ts [--demo <id>]... [--set <key>=<value>]...
 *
 * `--set` changes a weight of the prototype for this run, such as `--set shift=2`. The two runs
 * of the report:
 *
 *     node docs/research/2026-10-17-string-hands/hand-moves.ts > hand-moves.txt
 *     node docs/research/2026-10-17-string-hands/hand-moves.ts --set shift=2.5 \
 *       --set shiftPerSemitone=1.5 --set freeShift=0.5 --set crossing=0.5 --set height=0.05 \
 *       --set quickSec=0 --set halfPosition=0 --set open=0.3 --set openLong=0.3 \
 *       --set extension=0.8 > hand-moves-noguchi.txt
 *
 * The second run takes the ratios of the cost table of the open fingering program of Noguchi
 * (`violin_fingering_core.js` of https://github.com/knoguchi/violin-fingering): 2.5 for each
 * shift, 3.0 for each position (about 2 semitones), half of the cost after an open string, and
 * 0.5 for a cross to a neighbor string.
 */
import { CHORD_SEC, groupChords } from '../../../src/pose/note-groups.ts';
import { FINGERBOARD_SEMITONES, TUNINGS, buildStrokes } from '../../../src/pose/strokes.ts';
import type { Stroke } from '../../../src/pose/strokes.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import type { PlayerNote } from '../../../src/score/types.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { planHand, stopPlace } from './planner.ts';
import type { HandFrame, HandStep, PlanWeights, StrokePitch } from './planner.ts';

type Bowed = keyof typeof TUNINGS;

const BOWED: readonly Bowed[] = ['violin', 'viola', 'cello', 'contrabass'];

/**
 * The hand frame of each instrument. The spans and the string lengths come from the reference
 * `docs/reference/string-technique.md`: the violin and the viola reach a perfect fourth from the
 * first to the fourth finger, the cello a minor third (a major third with an extension), and the
 * double bass a whole tone (Simandl), with a thumb position from the octave.
 */
export const FRAMES: Readonly<Record<Bowed, HandFrame>> = {
  violin: {
    reach: [-1, 5],
    extend: [0, 1],
    fingers: [1, 1, 2, 2, 3, 3, 4, 4],
    thumbFrom: Infinity,
    thumbReach: 5,
    thumbFingers: [],
    top: 15,
    stringLength: 0.328,
  },
  viola: {
    reach: [-1, 5],
    extend: [0, 1],
    fingers: [1, 1, 2, 2, 3, 3, 4, 4],
    thumbFrom: Infinity,
    thumbReach: 5,
    thumbFingers: [],
    top: 13,
    stringLength: 0.37,
  },
  cello: {
    reach: [0, 3],
    extend: [1, 1],
    fingers: [1, 1, 2, 3, 4, 4],
    thumbFrom: 12,
    thumbReach: 5,
    thumbFingers: [0, 1, 1, 2, 2, 3],
    top: 19,
    stringLength: 0.69,
  },
  contrabass: {
    reach: [0, 2],
    extend: [1, 1],
    fingers: [1, 1, 2, 4, 4],
    thumbFrom: 12,
    thumbReach: 4,
    thumbFingers: [0, 1, 2, 3, 3],
    top: 19,
    stringLength: 1.06,
  },
};

/** The weights of the prototype. */
export const WEIGHTS: PlanWeights = {
  shift: 3,
  shiftPerSemitone: 0.4,
  quickSec: 0.15,
  freeShift: 0.3,
  freeGapSec: 0.15,
  height: 0.4,
  homePosition: 2,
  halfPosition: 1,
  thumb: 2,
  extension: 2,
  open: -0.1,
  openLong: 1.5,
  longSec: 0.6,
  crossing: 0.2,
};

const args = process.argv.slice(2);
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const asked = pick('--demo');
const weights: PlanWeights = { ...WEIGHTS };
for (const change of pick('--set')) {
  const [key, value] = change.split('=');
  if (!key || value === undefined || !(key in WEIGHTS)) {
    throw new Error(`Unknown weight in --set ${change}.`);
  }
  Object.assign(weights, { [key]: Number(value) });
}

/** A move of the hand of at most this length, in meters, is no move. */
const STILL = 1e-4;

/**
 * Gives the pitches of the strokes of one player, with the groups and the double stops of
 * `buildStrokes()`.
 *
 * @param notes The notes of the player, sorted by start.
 * @returns One entry for each stroke.
 */
export function strokePitches(notes: readonly PlayerNote[]): StrokePitch[] {
  const groups = groupChords(notes);
  let sounding: readonly PlayerNote[] = [];
  return groups.map((g, k) => {
    const next = groups[k + 1];
    sounding = sounding.filter((held) => held.endSec > g.start + CHORD_SEC);
    let low = g.low;
    let high = g.high;
    for (const held of sounding) {
      low = Math.min(low, held.pitch);
      high = Math.max(high, held.pitch);
    }
    sounding = [...sounding, ...notes.slice(g.first, g.first + g.count)];
    const end = next ? Math.min(g.end, next.start) : g.end;
    return { start: g.start, end, low, high };
  });
}

/**
 * Gives the place of the hand of an app stroke on a real string, in meters from the nut.
 *
 * @param stroke The stroke.
 * @param frame The hand frame of the instrument.
 * @returns The place.
 */
function appPlace(stroke: Stroke, frame: HandFrame): number {
  return stroke.fingerboard * stopPlace(FINGERBOARD_SEMITONES, frame.stringLength);
}

/** The counts of one plan of the hand. */
interface Tally {
  strokes: number;
  sound: number;
  moves: number;
  travel: number;
  largest: number;
  crossings: number;
  low: number;
  open: number;
  extended: number;
  thumb: number;
}

const blank = (): Tally => ({
  strokes: 0,
  sound: 0,
  moves: 0,
  travel: 0,
  largest: 0,
  crossings: 0,
  low: 0,
  open: 0,
  extended: 0,
  thumb: 0,
});

/**
 * Adds the moves of one plan to a tally.
 *
 * @param tally The tally to change.
 * @param places The hand place of each stroke, in meters.
 * @param strings The string coordinate of each stroke.
 * @param times The start and the end of each stroke.
 */
function count(
  tally: Tally,
  places: readonly number[],
  strings: readonly number[],
  times: readonly StrokePitch[],
): void {
  for (const [i, place] of places.entries()) {
    tally.strokes += 1;
    const t = times[i];
    if (t) {
      tally.sound += Math.max(0, t.end - t.start);
    }
    const before = places[i - 1];
    if (before !== undefined) {
      const move = Math.abs(place - before);
      if (move > STILL) {
        tally.moves += 1;
        tally.travel += move;
        tally.largest = Math.max(tally.largest, move);
      }
      if ((strings[i] ?? 0) !== (strings[i - 1] ?? 0)) {
        tally.crossings += 1;
      }
    }
  }
}

const app = new Map<Bowed, Tally>(BOWED.map((b) => [b, blank()]));
const plan = new Map<Bowed, Tally>(BOWED.map((b) => [b, blank()]));
const parts = new Map<Bowed, number>(BOWED.map((b) => [b, 0]));
const histogram = new Map<Bowed, number[]>(BOWED.map((b) => [b, []]));
/** The time from the start of the stroke before a shift to the start of the shift note. */
const shiftTimes = new Map<Bowed, number[]>(BOWED.map((b) => [b, []]));
/** The shifts after an open string or a rest of at least `freeGapSec`. */
const freeShifts = new Map<Bowed, number>(BOWED.map((b) => [b, 0]));
const demoRows: string[] = [
  '| Demo | Instrument | Strokes | App: share that moves | Prototype: share that moves |',
  '|---|---|---|---|---|',
];
const excerpts: string[] = [];

const pct = (a: number, b: number): string => (b > 0 ? `${((100 * a) / b).toFixed(1)}%` : '-');
const mm = (m: number): string => (m * 1000).toFixed(1);

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nameOf = (key: number): string => `${NAMES[key % 12] ?? '?'}${Math.floor(key / 12) - 1}`;

/**
 * Prints the plans of the app and of the prototype for a passage, one row for each stroke.
 *
 * @param title The title of the passage.
 * @param instrument The instrument.
 * @param pitches The strokes.
 * @returns The lines of a Markdown table.
 */
function passage(title: string, instrument: Bowed, pitches: readonly StrokePitch[]): string[] {
  const frame = FRAMES[instrument];
  const tuning = TUNINGS[instrument];
  const notes: PlayerNote[] = [];
  for (const p of pitches) {
    for (const pitch of p.low === p.high ? [p.high] : [p.low, p.high]) {
      notes.push({
        seatIndex: 0,
        player: 0,
        pitch,
        velocity: 80,
        startSec: p.start,
        endSec: p.end,
        technique: 'normal',
        synthChannel: 0,
      });
    }
  }
  const strokes = buildStrokes(notes, [], [0.03, 0.6], 1, tuning);
  const steps = planHand(pitches, tuning, frame, weights);
  const lines = [
    `### ${title} (${instrument})`,
    '',
    '| Note | Start s | App string | App hand mm | Prototype string | Position | Finger | Prototype hand mm | Note mm |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  let appMoves = 0;
  let planMoves = 0;
  for (const [i, p] of pitches.entries()) {
    const s = strokes[i];
    const step = steps[i];
    if (!s || !step) {
      continue;
    }
    const a = appPlace(s, frame);
    const before = strokes[i - 1];
    const beforeStep = steps[i - 1];
    const appMoved = before !== undefined && Math.abs(a - appPlace(before, frame)) > STILL;
    const planMoved =
      beforeStep !== undefined && Math.abs(step.handPlace - beforeStep.handPlace) > STILL;
    appMoves += appMoved ? 1 : 0;
    planMoves += planMoved ? 1 : 0;
    const name = p.low === p.high ? nameOf(p.high) : `${nameOf(p.low)}+${nameOf(p.high)}`;
    lines.push(
      `| ${name} | ${p.start.toFixed(2)} | ${s.string} | ${mm(a)}${appMoved ? ' *' : ''} | ${step.string} | ${step.position} | ${step.open ? 'open' : step.finger}${step.extended ? ' ext' : ''} | ${mm(step.handPlace)}${planMoved ? ' *' : ''} | ${mm(step.notePlace)} |`,
    );
  }
  lines.push(
    '',
    `Moves of the hand (*): app ${appMoves} of ${pitches.length - 1}, prototype ${planMoves} of ${pitches.length - 1}.`,
    '',
  );
  return lines;
}

/**
 * Makes the strokes of a passage of even notes.
 *
 * @param names The note names, such as `G3`, or two names joined by `+` for a double stop.
 * @param step The time from one note start to the next, in seconds.
 * @returns The strokes.
 */
function even(names: readonly string[], step: number): StrokePitch[] {
  const keyOf = (name: string): number => {
    const m = /^([A-G]#?)(-?\d)$/.exec(name);
    const index = NAMES.indexOf(m?.[1] ?? '');
    if (!m || index < 0) {
      throw new Error(`Unknown note ${name}.`);
    }
    return 12 * (Number(m[2]) + 1) + index;
  };
  return names.map((n, i) => {
    const keys = n.split('+').map(keyOf);
    return {
      start: i * step,
      end: (i + 1) * step,
      low: Math.min(...keys),
      high: Math.max(...keys),
    };
  });
}

for (const demo of await patchedDemos()) {
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
    const frame = FRAMES[instrument];
    const tuning = TUNINGS[instrument];
    const strokes = buildStrokes(notes, [], [0.03, 0.6], 1, tuning);
    const pitches = strokePitches(notes);
    if (strokes.length !== pitches.length) {
      throw new Error(`${id} ${instrument}: ${strokes.length} strokes, ${pitches.length} pitches.`);
    }
    const steps: HandStep[] = planHand(pitches, tuning, frame, weights);

    const a = blank();
    count(
      a,
      strokes.map((s) => appPlace(s, frame)),
      strokes.map((s) => s.string),
      pitches,
    );
    const p = blank();
    count(
      p,
      steps.map((s) => s.handPlace),
      steps.map((s) => s.string),
      pitches,
    );
    for (const [i, s] of steps.entries()) {
      const before = steps[i - 1];
      const now = pitches[i];
      const then = pitches[i - 1];
      if (before && now && then && before.position !== s.position) {
        shiftTimes.get(instrument)?.push(now.start - then.start);
        if (before.open || now.start - then.end >= weights.freeGapSec) {
          freeShifts.set(instrument, (freeShifts.get(instrument) ?? 0) + 1);
        }
      }
      p.low += s.position <= 5 ? 1 : 0;
      p.open += s.open ? 1 : 0;
      p.extended += s.extended ? 1 : 0;
      p.thumb += s.position >= frame.thumbFrom ? 1 : 0;
      const h = histogram.get(instrument);
      if (h) {
        h[s.position] = (h[s.position] ?? 0) + 1;
      }
    }
    for (const [total, part] of [
      [app.get(instrument), a],
      [plan.get(instrument), p],
    ] as const) {
      if (!total) {
        continue;
      }
      for (const key of Object.keys(part) as (keyof Tally)[]) {
        total[key] = key === 'largest' ? Math.max(total[key], part[key]) : total[key] + part[key];
      }
    }
    parts.set(instrument, (parts.get(instrument) ?? 0) + 1);
    demoRows.push(
      `| ${id} | ${instrument} ${seat.indexInSection} | ${a.strokes} | ${pct(a.moves, a.strokes - 1)} | ${pct(p.moves, p.strokes - 1)} |`,
    );
    if (id === 'boulanger-matin' && instrument === 'violin' && seat.indexInSection === 0) {
      excerpts.push(
        ...passage(
          'The first 24 strokes of the first violins of boulanger-matin',
          instrument,
          pitches.slice(0, 24),
        ),
      );
    }
    if (id === 'beethoven-9' && instrument === 'cello') {
      const start = pitches.findIndex((s) => s.start >= 0);
      excerpts.push(
        ...passage(
          'The first 24 strokes of the cellos of beethoven-9',
          instrument,
          pitches.slice(start, start + 24),
        ),
      );
    }
  }
}

const out: string[] = [
  `Weights: ${JSON.stringify(weights)}`,
  '',
  '## All demos, for each instrument',
  '',
  '| Instrument | Parts | Strokes | Plan | Strokes that move the hand | Share | Mean move mm | Largest move mm | Moves for each second of sound | Hand travel mm/s | String changes |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
];
for (const instrument of BOWED) {
  for (const [label, tally] of [
    ['app', app.get(instrument)],
    ['prototype', plan.get(instrument)],
  ] as const) {
    if (!tally || tally.strokes === 0) {
      continue;
    }
    out.push(
      `| ${instrument} | ${parts.get(instrument) ?? 0} | ${tally.strokes} | ${label} | ${tally.moves} | ${pct(tally.moves, tally.strokes)} | ${tally.moves > 0 ? mm(tally.travel / tally.moves) : '-'} | ${mm(tally.largest)} | ${(tally.moves / tally.sound).toFixed(2)} | ${((1000 * tally.travel) / tally.sound).toFixed(0)} | ${pct(tally.crossings, tally.strokes)} |`,
    );
  }
}
out.push(
  '',
  '## The prototype: positions, open strings, extensions, and the thumb',
  '',
  '| Instrument | Position at most 5 semitones (1st to 3rd position of the violin) | Open strings | Extensions | Thumb position | Strokes by position (semitones of the first finger: count) |',
  '|---|---|---|---|---|---|',
);
for (const instrument of BOWED) {
  const tally = plan.get(instrument);
  if (!tally || tally.strokes === 0) {
    continue;
  }
  const h = histogram.get(instrument) ?? [];
  const bins = h.flatMap((n, position) => (n ? [`${position}: ${n}`] : [])).join(', ');
  out.push(
    `| ${instrument} | ${pct(tally.low, tally.strokes)} | ${pct(tally.open, tally.strokes)} | ${pct(tally.extended, tally.strokes)} | ${pct(tally.thumb, tally.strokes)} | ${bins} |`,
  );
}
out.push(
  '',
  '## The prototype: the time before each shift',
  '',
  'The time from the start of the stroke before a shift to the start of the shift note.',
  '',
  '| Instrument | Shifts | 10th percentile s | Median s | Shifts with less than 0.15 s | Shifts after an open string or a rest |',
  '|---|---|---|---|---|---|',
);
for (const instrument of BOWED) {
  const times = (shiftTimes.get(instrument) ?? []).toSorted((x, y) => x - y);
  if (times.length === 0) {
    continue;
  }
  const at = (q: number): string => (times[Math.floor(q * (times.length - 1))] ?? 0).toFixed(3);
  out.push(
    `| ${instrument} | ${times.length} | ${at(0.1)} | ${at(0.5)} | ${pct(times.filter((t) => t < 0.15).length, times.length)} | ${pct(freeShifts.get(instrument) ?? 0, times.length)} |`,
  );
}
out.push('', '## Each part', '', ...demoRows, '', '## Passages checked by hand', '');

out.push(
  ...passage(
    'G major scale over three octaves, eighth notes at 120 bpm',
    'violin',
    even(
      [
        'G3',
        'A3',
        'B3',
        'C4',
        'D4',
        'E4',
        'F#4',
        'G4',
        'A4',
        'B4',
        'C5',
        'D5',
        'E5',
        'F#5',
        'G5',
        'A5',
        'B5',
        'C6',
        'D6',
        'E6',
        'F#6',
        'G6',
      ],
      0.25,
    ),
  ),
  ...passage(
    'A broken G major chord that crosses the four strings, sixteenth notes at 100 bpm',
    'violin',
    even(
      [
        'G3',
        'D4',
        'B4',
        'G5',
        'B4',
        'D4',
        'G3',
        'D4',
        'A4',
        'F#5',
        'A4',
        'D4',
        'G3',
        'D4',
        'B4',
        'G5',
      ],
      0.15,
    ),
  ),
  ...passage(
    'A melody high on the A string and the E string, quarter notes at 72 bpm',
    'violin',
    even(['A5', 'B5', 'C#6', 'D6', 'E6', 'D6', 'C#6', 'B5', 'A5', 'G#5', 'A5', 'E5'], 0.83),
  ),
  ...passage(
    'C major scale over two octaves, quarter notes at 96 bpm',
    'cello',
    even(
      ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'],
      0.625,
    ),
  ),
  ...passage(
    'A major scale up the A string, quarter notes at 72 bpm',
    'cello',
    even(
      [
        'A3',
        'B3',
        'C#4',
        'D4',
        'E4',
        'F#4',
        'G#4',
        'A4',
        'G#4',
        'F#4',
        'E4',
        'D4',
        'C#4',
        'B3',
        'A3',
      ],
      0.83,
    ),
  ),
  ...passage(
    'G major scale over two octaves, quarter notes at 96 bpm',
    'contrabass',
    even(
      ['G1', 'A1', 'B1', 'C2', 'D2', 'E2', 'F#2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F#3', 'G3'],
      0.625,
    ),
  ),
  ...passage(
    'Double stops in thirds, quarter notes at 72 bpm',
    'viola',
    even(['C4+E4', 'D4+F4', 'E4+G4', 'F4+A4', 'G4+B4', 'F4+A4', 'E4+G4', 'D4+F4', 'C4+E4'], 0.83),
  ),
  ...excerpts,
);
console.log(out.join('\n'));
