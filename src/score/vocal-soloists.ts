import type { SoloNote, SoloSeat } from './soloist.ts';

/**
 * The values of the rule for the vocal soloists (design 3.8): the solo singers of a choral work,
 * such as the four soloists of the Ode to Joy, on their own channel beside the choir.
 */
const VOCAL_SOLOISTS_RULE = {
  /** The step at which the rule reads the notes, in seconds. */
  stepSec: 0.1,
  /** The seat has at most this many voices: the soprano, the alto, the tenor, and the bass. */
  voices: 4,
  /** It sings with no other choir seat in this part of its sounding time or more. */
  alone: 0.75,
  /** One voice sings alone in this part of its sounding time or more, as in a recitative. */
  solo: 0.3,
} as const;

/**
 * Counts the notes of each seat that sound at each step of 0.1 s.
 *
 * @param seats The seats.
 * @param notes The notes of the seats.
 * @param steps The number of steps.
 * @returns One count for each seat and step.
 */
function countsOf(
  seats: readonly SoloSeat[],
  notes: readonly SoloNote[],
  steps: number,
): Uint8Array[] {
  const counts = seats.map(() => new Uint8Array(steps));
  const step = VOCAL_SOLOISTS_RULE.stepSec;
  for (const note of notes) {
    const count = counts[note.seatIndex];
    if (!count || seats[note.seatIndex]?.section !== 'choir') {
      continue;
    }
    const to = Math.min(steps, Math.round(note.endSec / step));
    for (let i = Math.max(0, Math.round(note.startSec / step)); i < to; i++) {
      count[i] = Math.min(255, (count[i] ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Finds the vocal soloists of a score (design 3.8): the one choir seat beside another choir seat
 * that has at most four voices, sings with no other choir seat in 0.75 of its time, and has one
 * voice alone in 0.3 of its time. With no such rule, the channel of the soloists of the Ode to
 * Joy sings as 8 penguins in the choir row. The soloists get one singer for each voice, and they
 * stand in front of the choir (4.5).
 *
 * @param seats The seats, with the player counts of the size rule and their voices.
 * @param notes The notes of the seats.
 * @param durationSec The time of the last note-off.
 * @returns The index of the seat, or `null` if no seat or more than one seat passes.
 */
export function findVocalSoloists(
  seats: readonly SoloSeat[],
  notes: readonly SoloNote[],
  durationSec: number,
): number | null {
  const rule = VOCAL_SOLOISTS_RULE;
  const choir = seats.flatMap((s, i) => (s.section === 'choir' && s.playerCount > 0 ? [i] : []));
  if (choir.length < 2) {
    return null;
  }
  const steps = Math.ceil(durationSec / rule.stepSec) + 1;
  const counts = countsOf(seats, notes, steps);
  const found = choir.filter((index) => {
    const own = counts[index];
    if (!own || (seats[index]?.voices ?? 0) > rule.voices) {
      return false;
    }
    let sounding = 0;
    let alone = 0;
    let solo = 0;
    for (let t = 0; t < steps; t++) {
      const count = own[t] ?? 0;
      if (count === 0) {
        continue;
      }
      sounding++;
      if (choir.every((other) => other === index || (counts[other]?.[t] ?? 0) === 0)) {
        alone++;
      }
      if (count === 1) {
        solo++;
      }
    }
    return sounding > 0 && alone >= rule.alone * sounding && solo >= rule.solo * sounding;
  });
  return found.length === 1 ? (found[0] ?? null) : null;
}
