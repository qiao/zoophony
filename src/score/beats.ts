import type { TimeSignature, Timeline } from './timeline.ts';
import type { Beat } from './types.ts';

/** The pattern of the baton in a bar, and the number of conducted beats of the bar (design 5.4). */
interface BarPattern {
  readonly pattern: Beat['pattern'];
  readonly beatsInBar: number;
}

/**
 * The beat tempo from which a bar of 2/x or 3/x gets one beat (design 5.4). The beat tempo
 * counts the beat units (the denominator of the time signature) for each minute.
 */
const ONE_BEAT_TEMPO = 168;

/** The beat tempo from which a bar of 6/8 or 6/4 gets two dotted beats (design 5.4). */
const TWO_BEAT_TEMPO = 150;

/**
 * Builds the conducted beats of a file from its time signatures and its tempo map (design 5.4).
 * The first bar starts at tick 0, and each time signature starts a new bar. The tempo at the
 * downbeat of a bar selects the pattern of the bar. The beats stop before the end of the song.
 *
 * @param timeline The time signatures and the tempo map of the file.
 * @param durationSec The time of the last note-off.
 * @returns The beats, sorted by time.
 */
export function buildBeats(timeline: Timeline, durationSec: number): Beat[] {
  const tempoMap = timeline.tempoMap;
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
    return { pattern: 4, beatsInBar: 4 };
  }
  if (numerator === 6 && (denominator === 8 || denominator === 4)) {
    return beatTempo >= TWO_BEAT_TEMPO
      ? { pattern: 2, beatsInBar: 2 }
      : { pattern: 6, beatsInBar: 6 };
  }
  if (numerator === 9 && denominator === 8) {
    return { pattern: 3, beatsInBar: 3 };
  }
  if (numerator === 12 && denominator === 8) {
    return { pattern: 4, beatsInBar: 4 };
  }
  return { pattern: 'generic', beatsInBar: numerator };
}
