import { describe, expect, it } from 'vitest';

import { chord, controlChange, note, programChange, track } from '../midi/test-smf.ts';
import { layoutScene } from '../models/layout-scene.ts';
import { ModelCache } from '../models/model-cache.ts';
import { DEFAULT_AZIMUTH } from '../shots/view.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import {
  FAR_REVERB_SEND,
  LISTENER_AZIMUTH,
  NEAR_REVERB_SEND,
  PAN_CONTROLLER,
  REVERB_SEND_CONTROLLER,
  mixSynthEvents,
  stageMix,
} from './stage-mix.ts';
import type { ChannelMix } from './stage-mix.ts';
import { scoreOf } from './test-score.ts';
import type { Score, SectionId } from './types.ts';

/** One model cache for all layouts of this file, so that each kind of player builds once. */
const models = new ModelCache();

/** The patched demo files. */
const DEMOS = await patchedDemos();

/**
 * Builds the score of a demo with the real modules.
 *
 * @throws Error if the demo does not exist.
 */
function demoScore(name: string): Score {
  const found = DEMOS.find((item) => item.file === name);
  if (!found) {
    throw new Error(`No demo ${name}.`);
  }
  return scoreOf(found.bytes);
}

/**
 * Gives the mix of the first channel that feeds a seat of a section.
 *
 * @throws Error if no seat of the section has a channel in the mix.
 */
function mixOf(score: Score, mix: readonly ChannelMix[], section: SectionId): ChannelMix {
  const seat = score.seats.find((s) => s.section === section);
  const source = seat?.sources[0];
  const found = source && mix.find((m) => m.channel === source.port * 16 + source.channel);
  if (!found) {
    throw new Error(`No channel of the section ${section}.`);
  }
  return found;
}

describe('stageMix (design 6.1)', () => {
  it('uses the azimuth of the default camera view', () => {
    expect(LISTENER_AZIMUTH).toBeCloseTo(DEFAULT_AZIMUTH, 12);
  });

  it('pans the first violins left and the cellos right in the Beethoven 9 demo', () => {
    const score = demoScore('beethoven-9.mid');
    const mix = stageMix(score, layoutScene(score, models));
    expect(mixOf(score, mix, 'violin').pan).toBeLessThan(40);
    expect(mixOf(score, mix, 'cello').pan).toBeGreaterThan(64);
    expect(mixOf(score, mix, 'trumpet').pan).toBeGreaterThan(90);
    // The basses stand at the back, near the middle of the frontal view (design 4.5, camera).
    expect(Math.abs(mixOf(score, mix, 'contrabass').pan - 64)).toBeLessThan(16);
  });

  it('puts the brass and the percussion of Boulanger on their side of the stage', () => {
    // The file pans the trumpets and the trombones left, and the percussion right.
    const score = demoScore('boulanger-matin.mid');
    const mix = stageMix(score, layoutScene(score, models));
    expect(mixOf(score, mix, 'trumpet').pan).toBeGreaterThan(64);
    expect(mixOf(score, mix, 'trombone').pan).toBeGreaterThan(64);
    expect(mixOf(score, mix, 'percussion').pan).toBeLessThan(64);
  });

  it('gives the back rows more reverb send than the front rows', () => {
    for (const name of ['beethoven-9.mid', 'boulanger-matin.mid']) {
      const score = demoScore(name);
      const mix = stageMix(score, layoutScene(score, models));
      const violin = mixOf(score, mix, 'violin').reverbSend;
      expect(mixOf(score, mix, 'clarinet').reverbSend).toBeGreaterThan(violin);
      expect(mixOf(score, mix, 'contrabass').reverbSend).toBeGreaterThan(violin);
      for (const entry of mix) {
        expect(entry.reverbSend).toBeGreaterThanOrEqual(NEAR_REVERB_SEND);
        expect(entry.reverbSend).toBeLessThanOrEqual(FAR_REVERB_SEND);
        expect(entry.pan).toBeGreaterThanOrEqual(1);
        expect(entry.pan).toBeLessThanOrEqual(127);
      }
    }
  });

  it('gives a channel that several seats share the mean place of all their players', () => {
    // A string ensemble divides by pitch into several seats of one channel (design 3.5, 3.7).
    const score = scoreOf({
      tracks: [
        track([programChange(0, 0, 48)], chord(0, 0, [40, 55, 67, 79])),
        track([programChange(0, 1, 40)], note(0, 1, 79)),
      ],
    });
    const layout = layoutScene(score, models);
    const shared = score.seats.filter((seat) => seat.sources.some((s) => s.channel === 0));
    expect(shared.length).toBeGreaterThan(1);
    const players = layout.players.filter((p) => shared.includes(score.seats[p.cast.seatIndex]!));
    const meanX =
      players.reduce(
        (sum, p) =>
          sum +
          p.position[0] * Math.cos(DEFAULT_AZIMUTH) -
          p.position[2] * Math.sin(DEFAULT_AZIMUTH),
        0,
      ) / players.length;
    const expected = Math.round(64 + 63 * ((0.8 * meanX) / (layout.stageSide / 2)));
    const mix = stageMix(score, layout);
    expect(mix.map((m) => m.channel)).toEqual([0, 1]);
    expect(mix[0]?.pan).toBe(expected);
  });

  it('gives a channel with no player the center pan and the middle send', () => {
    // Program 81 has no animal, so its notes go to the sound-only seat (design 3.5).
    const score = scoreOf({
      tracks: [track([programChange(0, 2, 81)], note(0, 2, 60)), track(note(0, 0, 60))],
    });
    const mix = stageMix(score, layoutScene(score, models));
    expect(mix.find((m) => m.channel === 2)).toEqual({
      channel: 2,
      pan: 64,
      reverbSend: (NEAR_REVERB_SEND + FAR_REVERB_SEND) / 2,
      gainDb: 0,
    });
  });
});

describe('mixSynthEvents (design 6.1)', () => {
  it('drops the pan and the reverb send of the file, and sets the mix at the start', () => {
    const score = scoreOf({
      tracks: [
        track(
          [controlChange(0, 0, PAN_CONTROLLER, 0), controlChange(0, 0, REVERB_SEND_CONTROLLER, 0)],
          [controlChange(0, 0, 7, 90), controlChange(240, 0, PAN_CONTROLLER, 127)],
          note(0, 0, 60),
        ),
      ],
    });
    const mix: ChannelMix[] = [{ channel: 0, pan: 30, reverbSend: 70, gainDb: 0 }];
    const events = mixSynthEvents(score.synthEvents, mix);
    const controls = events.filter((event) => event.kind === 0xb0);
    expect(controls.map((event) => [event.timeSec, event.data1, event.data2])).toEqual([
      [0, PAN_CONTROLLER, 30],
      [0, REVERB_SEND_CONTROLLER, 70],
      [0, 7, 90],
    ]);
    expect(events.filter((event) => event.kind !== 0xb0)).toEqual(
      score.synthEvents.filter((event) => event.kind !== 0xb0),
    );
  });
});
