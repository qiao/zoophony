import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  LOCK_PATH,
  attenuationGenerator,
  layerRanks,
  maxSecAt,
  planZones,
  sampleLoudness,
  timecents,
  uncoveredRanges,
} from './build-soundfont.ts';
import type { SourceLock } from './build-soundfont.ts';
import { parseSfz } from './sfz.ts';
import { PRESET_ALIASES, PRESET_RECIPES } from './soundfont-recipes.ts';
import type { PartRecipe } from './soundfont-recipes.ts';

const SUSTAIN = { mode: 'sustain', loopSec: 1, crossfadeSec: 0.2, startDb: -12 } as const;

function part(overrides: Partial<PartRecipe>): PartRecipe {
  return {
    source: 'vsco',
    sfz: 'Test.sfz',
    velocities: [45, 110],
    window: [0, 127],
    extend: [2, 5],
    cut: SUSTAIN,
    ...overrides,
  };
}

/** Three keys with four velocity layers each, and a second round robin that the plan skips. */
const REGIONS = parseSfz(
  [60, 64, 67]
    .flatMap((key) =>
      [
        [0, 41],
        [42, 62],
        [63, 83],
        [84, 127],
      ].map(
        ([lovel, hivel]) =>
          `<region> sample=k${key}_${hivel}.wav lokey=${key} hikey=${key + 3} pitch_keycenter=${key} lovel=${lovel} hivel=${hivel}`,
      ),
    )
    .concat('<region> sample=rr2.wav lokey=60 hikey=63 seq_position=2')
    .join('\n'),
);

describe('timecents and attenuationGenerator', () => {
  it('converts seconds to timecents, with 1 ms as the shortest time', () => {
    expect([timecents(1), timecents(2), timecents(0.5), timecents(0)]).toEqual([
      0, 1200, -1200, -12_000,
    ]);
  });

  it('divides the attenuation by the factor 0.4 of spessasynth_core, from 0 to 1440', () => {
    expect([attenuationGenerator(6), attenuationGenerator(-3), attenuationGenerator(100)]).toEqual([
      150, 0, 1440,
    ]);
  });
});

describe('maxSecAt', () => {
  it('interpolates between key 24 and key 96, and holds the ends', () => {
    expect([maxSecAt([4, 1], 12), maxSecAt([4, 1], 60), maxSecAt([4, 1], 120)]).toEqual([
      4, 2.5, 1,
    ]);
  });
});

describe('uncoveredRanges', () => {
  it('finds the gaps between the covered key ranges', () => {
    expect(
      uncoveredRanges([
        [10, 20],
        [15, 30],
        [40, 127],
      ]),
    ).toEqual([
      [0, 9],
      [31, 39],
    ]);
  });
});

describe('planZones', () => {
  it('keeps one layer for each velocity, and gives the layers contiguous ranges', () => {
    const plans = planZones(REGIONS, part({}));

    expect(plans.filter((plan) => plan.keys[0] === 64).map((plan) => plan.velocities)).toEqual([
      [0, 62],
      [63, 127],
    ]);
    expect(plans.map((plan) => plan.region.sample)).not.toContain('rr2.wav');
  });

  it('extends the lowest and the highest regions, inside the window', () => {
    const plans = planZones(REGIONS, part({}));
    const narrow = planZones(REGIONS, part({ window: [62, 68] }));

    expect([plans[0]?.keys, plans.at(-1)?.keys]).toEqual([
      [58, 63],
      [67, 75],
    ]);
    expect([narrow[0]?.keys, narrow.at(-1)?.keys]).toEqual([
      [62, 63],
      [67, 68],
    ]);
  });

  it('maps a drum key to the regions of another key, at the pitch of the source key', () => {
    const plans = planZones(REGIONS, part({ velocities: [100], keys: [{ key: 50, from: 61 }] }));

    expect(plans).toEqual([
      expect.objectContaining({ keys: [50, 50], velocities: [0, 127], rootKey: 49 }),
    ]);
    expect(plans[0]?.region.sample).toBe('k60_127.wav');
  });
});

describe('layerRanks', () => {
  it('gives 0 to the loudest layer of a key and 1 to the layer below it', () => {
    const plans = planZones(REGIONS, part({}));
    const ranks = layerRanks(plans);

    expect(plans.map((plan) => ranks.get(plan.region))).toEqual([1, 0, 1, 0, 1, 0]);
  });
});

describe('sampleLoudness', () => {
  it('measures the loop of a sustained sample and the start of a decaying sample', () => {
    const data = new Float32Array(44_100).fill(0.1);
    data.fill(1, 0, 1000);
    const looped = sampleLoudness(
      { data, loop: { start: 22_050, end: 44_100 }, tail: undefined },
      44_100,
    );
    const decaying = sampleLoudness({ data, loop: undefined, tail: undefined }, 44_100);

    expect(looped).toBeCloseTo(-20, 3);
    expect(decaying).toBeGreaterThan(-12);
  });
});

describe('the recipes', () => {
  it('make each preset one time, and the aliases copy a recipe', () => {
    const ids = PRESET_RECIPES.map((recipe) => `${recipe.bank}:${recipe.program}`);
    const aliases = PRESET_ALIASES.map((alias) => `0:${alias.program}`);

    expect(new Set([...ids, ...aliases]).size).toBe(ids.length + aliases.length);
    for (const alias of PRESET_ALIASES) {
      expect(ids).toContain(`0:${alias.of}`);
    }
  });

  it('read only SFZ files that the lock holds', async () => {
    // SAFETY: tools/build-soundfont.ts writes the lock as an object of LockEntry values.
    const lock = JSON.parse(await readFile(LOCK_PATH, 'utf8')) as SourceLock;
    const keys = new Set(Object.keys(lock).map((key) => key.toLowerCase()));
    for (const recipe of PRESET_RECIPES) {
      for (const item of recipe.parts) {
        expect(keys.has(`${item.source}/${item.sfz}`.toLowerCase()), item.sfz).toBe(true);
      }
    }
  });
});
