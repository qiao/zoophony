import type { TimeSignature, Timeline } from './timeline.ts';
import type { Beat } from './types.ts';

/** The pattern of the baton in a bar, and the number of conducted beats of the bar (design 5.4). */
interface BarPattern {
  readonly pattern: Beat['pattern'];
  readonly beatsInBar: number;
}

/**
 * The beat tempo from which a bar gets fewer conducted beats (design 5.4): a bar of 2/x or 3/x
 * gets one beat, and a bar of 4/x gets two beats, as a conductor beats a fast 4/4 in 2 (alla
 * breve). The beat tempo counts the beat units (the denominator of the time signature) for each
 * minute. A bar of 4/x gets one beat from twice this tempo, and a bar of 9/8 or 12/8 gets fewer
 * dotted beats from a dotted tempo of this value.
 */
const ONE_BEAT_TEMPO = 168;

/** The beat tempo from which a bar of 6/8 or 6/4 gets two dotted beats (design 5.4). */
const TWO_BEAT_TEMPO = 150;

/**
 * The most conducted beats of a file (design 3.3). A file with more is not valid for the app.
 * This limit keeps the cost of the beats in proportion to the size of the file.
 */
export const MAX_BEATS = 100_000;

/**
 * Builds the conducted beats of a file from its time signatures and its tempo map (design 5.4).
 * The first bar starts at tick 0, and each time signature starts a new bar. The tempo at the
 * downbeat of a bar selects the pattern of the bar. The beats stop before the end of the song.
 *
 * @param timeline The time signatures, the tempo map, and the length of the file.
 * @returns The beats, sorted by time, or undefined for more than {@link MAX_BEATS} beats.
 */
export function buildBeats(timeline: Timeline): Beat[] | undefined {
  const { durationSec, tempoMap } = timeline;
  const signatures = timeline.timeSignatures;
  const beats: Beat[] = [];
  for (const [s, signature] of signatures.entries()) {
    const endTick = signatures[s + 1]?.tick ?? Infinity;
    const barTicks = (signature.numerator * 4 * timeline.ticksPerQuarter) / signature.denominator;
    for (let bar = signature.tick; bar < endTick; bar += barTicks) {
      if (tempoMap.toSeconds(bar) >= durationSec) {
        return beats;
      }
      const quarterTempo = 60_000_000 / tempoMap.tempoAt(bar);
      const { pattern, beatsInBar } = barPattern(signature, quarterTempo);
      for (let indexInBar = 0; indexInBar < beatsInBar; indexInBar += 1) {
        const tick = bar + (indexInBar * barTicks) / beatsInBar;
        const timeSec = tempoMap.toSeconds(tick);
        if (tick >= endTick || timeSec >= durationSec) {
          break;
        }
        beats.push({ timeSec, indexInBar, beatsInBar, pattern });
        if (beats.length > MAX_BEATS) {
          return undefined;
        }
      }
    }
  }
  return beats;
}

/**
 * Selects the pattern of a bar from its time signature and its tempo (the table of design 5.4).
 *
 * @param signature The time signature of the bar.
 * @param quarterTempo Quarter notes for each minute at the downbeat.
 * @returns The pattern and the number of conducted beats.
 */
function barPattern(signature: TimeSignature, quarterTempo: number): BarPattern {
  const { numerator, denominator } = signature;
  // A file stores whole microseconds, so 168 BPM reads as 167.99997. Round to 0.01 BPM.
  const beatTempo = Math.round((quarterTempo * denominator * 100) / 4) / 100;
  if (numerator === 2 || numerator === 3) {
    return beatTempo >= ONE_BEAT_TEMPO
      ? { pattern: 1, beatsInBar: 1 }
      : { pattern: numerator, beatsInBar: numerator };
  }
  if (numerator === 4) {
    if (beatTempo >= 2 * ONE_BEAT_TEMPO) {
      return { pattern: 1, beatsInBar: 1 };
    }
    return beatTempo >= ONE_BEAT_TEMPO
      ? { pattern: 2, beatsInBar: 2 }
      : { pattern: 4, beatsInBar: 4 };
  }
  if (numerator === 6 && (denominator === 8 || denominator === 4)) {
    return beatTempo >= TWO_BEAT_TEMPO
      ? { pattern: 2, beatsInBar: 2 }
      : { pattern: 6, beatsInBar: 6 };
  }
  // A bar of 9/8 or 12/8 has dotted beats of three beat units.
  if (numerator === 9 && denominator === 8) {
    return beatTempo / 3 >= ONE_BEAT_TEMPO
      ? { pattern: 1, beatsInBar: 1 }
      : { pattern: 3, beatsInBar: 3 };
  }
  if (numerator === 12 && denominator === 8) {
    return beatTempo / 3 >= ONE_BEAT_TEMPO
      ? { pattern: 2, beatsInBar: 2 }
      : { pattern: 4, beatsInBar: 4 };
  }
  return { pattern: 'generic', beatsInBar: numerator };
}
