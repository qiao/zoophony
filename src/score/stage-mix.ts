import type { Score, SynthEvent } from './types.ts';

/** The status nibble of a MIDI control change. */
const CONTROL_CHANGE = 0xb0;

/** The controller number of the pan. */
export const PAN_CONTROLLER = 10;

/** The controller number of the reverb send. */
export const REVERB_SEND_CONTROLLER = 91;

/**
 * The azimuth of the default camera view: 0, on the audience axis (design 4.5, camera). The
 * listener hears the stage from this direction. `DEFAULT_AZIMUTH` of `shots/view.ts` has the same
 * value, and a test compares them.
 */
export const LISTENER_AZIMUTH = 0;

/**
 * The part of the full pan range that the stage fills (design 6.1). A player at the side of the
 * stage, half a stage side from the center in the view, gets 80 % of a full pan.
 */
const PAN_WIDTH = 0.8;

/** The distance from the podium center, in meters, up to which the reverb send is smallest. */
const NEAR_DEPTH = 2.4;

/** The distance from the podium center, in meters, from which the reverb send is largest. */
const FAR_DEPTH = 7.2;

/** The reverb send (CC 91) of a player at {@link NEAR_DEPTH} or nearer. */
export const NEAR_REVERB_SEND = 40;

/** The reverb send (CC 91) of a player at {@link FAR_DEPTH} or farther. */
export const FAR_REVERB_SEND = 80;

/**
 * The gain of a choir channel in dB (design 6.1). One synth channel sings for a full choir, so
 * with no gain the choir is only as loud as the two oboes, about 9 dB below the orchestra in the
 * tutti of the Beethoven 9 demo. With this gain, it is about 3 dB below the orchestra. The vocal
 * soloists get no gain.
 */
export const CHOIR_GAIN_DB = 6;

/**
 * The pan, the reverb send, and the gain of one synth channel, from the stage places and the
 * section of its players.
 */
export interface ChannelMix {
  /** `port * 16 + channel` (design 3.4). */
  readonly channel: number;
  /** The value of CC 10: 1 is full left, 64 is the center, and 127 is full right. */
  readonly pan: number;
  /** The value of CC 91, from {@link NEAR_REVERB_SEND} to {@link FAR_REVERB_SEND}. */
  readonly reverbSend: number;
  /** The gain of the channel in dB: {@link CHOIR_GAIN_DB} for a choir channel, else 0. */
  readonly gainDb: number;
}

/**
 * The fields of a scene layout that the mix reads (design 5.1). `SceneLayout` of
 * `models/layout.ts` has them. The score module does not import the models module, because the
 * models module imports the score module.
 */
interface MixLayout {
  /** The stage side `S`, in meters. */
  readonly stageSide: number;
  /** The podium center: the rows are arcs around it. */
  readonly podium: readonly [number, number, number];
  /** The players, each with its position and its seat. */
  readonly players: readonly {
    readonly position: readonly [number, number, number];
    readonly cast: { readonly seatIndex: number };
  }[];
}

/**
 * Calculates the pan and the reverb send of each synth channel of a score from the stage
 * (design 6.1). The pan follows the mean place of the players of the channel in the default
 * camera view, so a player on the left of the screen sounds on the left. The reverb send
 * follows their mean distance from the podium center, so the back rows sound farther away.
 *
 * A channel feeds each seat whose sources hold it, and a merged seat has more than one channel
 * (design 3.7). All players of these seats count. A channel with no player (the sound-only seat)
 * gets the center pan and the send of the middle depth. A channel that feeds a choir seat, other
 * than the seat of the vocal soloists, gets {@link CHOIR_GAIN_DB}.
 *
 * @param score The score.
 * @param layout The layout of the score, from `layoutScene()`.
 * @returns One entry for each channel of the seats, in channel order.
 */
export function stageMix(
  score: Pick<Score, 'seats' | 'vocalSoloists'>,
  layout: MixLayout,
): ChannelMix[] {
  const sums = new Map<number, { x: number; depth: number; players: number }>();
  const choirs = new Set<number>();
  score.seats.forEach((seat, index) => {
    for (const source of seat.sources) {
      const channel = source.port * 16 + source.channel;
      sums.set(channel, { x: 0, depth: 0, players: 0 });
      if (seat.section === 'choir' && index !== score.vocalSoloists) {
        choirs.add(channel);
      }
    }
  });
  const rightX = Math.cos(LISTENER_AZIMUTH);
  const rightZ = -Math.sin(LISTENER_AZIMUTH);
  const [podiumX, , podiumZ] = layout.podium;
  for (const player of layout.players) {
    const seat = score.seats[player.cast.seatIndex];
    const [x, , z] = player.position;
    for (const source of seat?.sources ?? []) {
      const sum = sums.get(source.port * 16 + source.channel);
      if (sum) {
        sum.x += x * rightX + z * rightZ;
        sum.depth += Math.hypot(x - podiumX, z - podiumZ);
        sum.players += 1;
      }
    }
  }
  const half = layout.stageSide / 2;
  return [...sums.entries()]
    .toSorted(([a], [b]) => a - b)
    .map(([channel, sum]) => {
      const gainDb = choirs.has(channel) ? CHOIR_GAIN_DB : 0;
      if (sum.players === 0) {
        return { channel, pan: 64, reverbSend: sendAt((NEAR_DEPTH + FAR_DEPTH) / 2), gainDb };
      }
      const side = clamp((sum.x / sum.players / half) * PAN_WIDTH, -1, 1);
      return {
        channel,
        pan: Math.round(64 + 63 * side),
        reverbSend: sendAt(sum.depth / sum.players),
        gainDb,
      };
    });
}

/**
 * Gives the gain of each synth channel of a mix, for the engine (design 6.1).
 *
 * @param mix The mix of each channel, from {@link stageMix}.
 * @returns The gain in dB, by channel index. A channel with no entry gets 0.
 */
export function channelGainsDb(mix: readonly ChannelMix[]): number[] {
  const gains: number[] = [];
  for (const entry of mix) {
    while (gains.length <= entry.channel) {
      gains.push(0);
    }
    gains[entry.channel] = entry.gainDb;
  }
  return gains;
}

/**
 * Applies a stage mix to the synth events (design 6.1). The events lose each pan and reverb
 * send of the file, and get the values of the mix at the song start, before the events of the
 * file. Thus the file cannot change them, and a seek restores them with the other controllers
 * (design 6.5).
 *
 * @param events The synth events of a score, sorted by time.
 * @param mix The mix of each channel, from {@link stageMix}.
 * @returns The new events, sorted by time.
 */
export function mixSynthEvents(
  events: readonly SynthEvent[],
  mix: readonly ChannelMix[],
): SynthEvent[] {
  const controls = mix.flatMap((entry): SynthEvent[] => [
    controlAtStart(entry.channel, PAN_CONTROLLER, entry.pan),
    controlAtStart(entry.channel, REVERB_SEND_CONTROLLER, entry.reverbSend),
  ]);
  const kept = events.filter(
    (event) =>
      event.kind !== CONTROL_CHANGE ||
      (event.data1 !== PAN_CONTROLLER && event.data1 !== REVERB_SEND_CONTROLLER),
  );
  return [...controls, ...kept];
}

/** Makes a control change of a channel at the song start. */
function controlAtStart(channel: number, controller: number, value: number): SynthEvent {
  return {
    timeSec: 0,
    channel,
    kind: CONTROL_CHANGE,
    data1: controller,
    data2: value,
    seatIndex: -1,
  };
}

/** Gives the reverb send of a distance from the podium center. */
function sendAt(depth: number): number {
  const t = clamp((depth - NEAR_DEPTH) / (FAR_DEPTH - NEAR_DEPTH), 0, 1);
  return Math.round(NEAR_REVERB_SEND + t * (FAR_REVERB_SEND - NEAR_REVERB_SEND));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
