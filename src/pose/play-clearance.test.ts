import { describe, expect, it } from 'vitest';

import { buildPlayer } from '../models/player.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import type { BoneName } from '../models/rig.ts';
import { BIND_ROTATIONS } from './frames.ts';
import { posedPart, signedDistance } from './test-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import type { WritablePose } from './pose-at.ts';
import { armFaults, defaultDemoScene, liftSamples, playSamples } from './test-play-clearance.ts';

/**
 * The instruments of the default demo whose arms the test checks while they play. The default
 * demo has each woodwind and brass instrument, and each bowed string.
 */
const PLAYING_INSTRUMENTS: readonly InstrumentId[] = [
  'flute',
  'oboe',
  'clarinet',
  'bassoon',
  'horn',
  'trumpet',
  'trombone',
  'tuba',
];

/** The parts of the body that a held instrument keeps out of: the legs and the torso. */
const BODY_PARTS = [
  'thighL',
  'thighR',
  'shinL',
  'shinR',
  'spine',
  'chest',
] as const satisfies readonly BoneName[];

/**
 * Makes the pose of the bind pose, in which a wind instrument has its playing place.
 *
 * @returns The pose.
 */
function bindPose(): WritablePose {
  return {
    rotations: Float32Array.from(BIND_ROTATIONS),
    rootOffset: [0, 0, 0],
    slideOffset: [0, 0, 0],
    instrumentOffset: [0, 0, 0],
    blink: 0,
  };
}

describe('the arms in the playing pose (design 5.2, 5.3)', () => {
  // The samples: each second of the default demo with the bodies of `main`, each second (from
  // 0.5 s) with the forearms of option B, and the lift every 0.05 s. With the elbows of the winds
  // down, the arms went up to 0.3 H into the thighs and 0.2 H into the belly (2026-10-07).
  it.each(PLAYING_INSTRUMENTS)('keeps the arms of the %s out of the body', async (instrument) => {
    const { scene, forearms } = await defaultDemoScene();

    const faults = [
      ...armFaults(scene, scene.plan, scene.models, instrument, playSamples(scene, 1)),
      ...armFaults(scene, forearms.plan, forearms.models, instrument, playSamples(scene, 1, 0.5)),
      ...armFaults(scene, scene.plan, scene.models, instrument, liftSamples(0.05), true),
    ];

    expect(faults).toEqual([]);
  });
});

describe('the instruments in the playing pose (design 4.6, 5.3)', () => {
  it('keeps the horn out of the thighs and the belly of the pig', () => {
    // The first horn hung its coil and its bell 0.17 H into the right thigh and 0.05 H into the
    // belly of the pig in the bind pose (2026-10-07).
    const model = buildPlayer('pig', 'horn');
    const posed = poseSkeleton(model, bindPose());
    const h = model.body.headHeight;
    const instrument = posedPart(posed, ['instrument']);

    const depths = BODY_PARTS.map((bone) => {
      const part = posedPart(posed, [bone]);
      let gap = Infinity;
      for (const t of instrument.triangles) {
        for (const p of [t.a, t.b, t.c]) {
          if (part.box.containsPoint(p)) {
            gap = Math.min(gap, signedDistance(part, p) / h);
          }
        }
      }
      return { bone, gap };
    });

    expect(depths.filter((d) => d.gap < 0)).toEqual([]);
  });
});
