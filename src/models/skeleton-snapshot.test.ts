import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { INSTRUMENT_SUPPORTS, buildPlayer, supportOf } from './player.ts';
import type { PlayerModel } from './player.ts';
import { SPECIES } from './species.ts';
import type { SpeciesId } from './species.ts';
import type { Vec3 } from './tuples.ts';
import type { InstrumentId } from './instruments/types.ts';

/**
 * The hash of the skeleton of each species (design 4.3, 4.7), from {@link skeletonHash}. A change
 * of the proportions of a species, or of a bone place, changes its hash. When the change is
 * deliberate, copy the new hash of each species from the diff of the failed test, and give the
 * reason in the commit message.
 */
const SKELETON_HASHES: Readonly<Record<SpeciesId, string>> = {
  rabbit: '69b401c653d3cbe6',
  'fox-red': '107fc1807bee65be',
  'fox-tan': '107fc1807bee65be',
  wolf: '4503aa5e1d9b0f6a',
  elephant: 'e960e89c061666ca',
  bear: '5df1af371f4c908a',
  cat: 'c2e14b7734b0d24f',
  hippo: '9ed3613f98ae6901',
  deer: '24eef5c96141d9b3',
  panda: 'f3ee15f7f9f6ab76',
  mouse: 'dba618fc3c22c155',
  beaver: '8a6c1fe6096db172',
  dog: 'a6a04366cf1868be',
  monkey: 'c320405b09122391',
  pig: '0de113149fbe26e7',
  rhino: '500d849c41df896e',
  badger: '4fb5c13e49cf85f8',
  meerkat: '0c9d2575659fa509',
  penguin: '0b418ab955b83dd3',
  'polar-bear': 'f2d1c8675e400301',
};

/** The instruments of design 4.6. */
const INSTRUMENTS = Object.keys(INSTRUMENT_SUPPORTS).filter(
  (id): id is InstrumentId => id in INSTRUMENT_SUPPORTS,
);

/**
 * Gives the numbers of the skeleton of a player: the bind position of each bone, the head
 * height, and the body points, in meters. Each number is rounded to 1e-9 m, so that a change of
 * the order of the arithmetic, which moves a value by about 1e-16 m, keeps the hash.
 *
 * @param model The player.
 * @returns The numbers.
 */
function skeletonNumbers(model: PlayerModel): number[] {
  const { body } = model;
  const points: readonly Vec3[] = [
    ...model.skeleton.positions,
    body.headCenter,
    body.mouth,
    body.floor,
    body.palmL,
    body.palmR,
    body.fingerBlockL,
    body.fingerBlockR,
  ];
  // Adding 0 turns -0 into 0.
  return [body.headHeight, ...points.flat()].map((v) => Math.round(v * 1e9) + 0);
}

/**
 * Calculates the hash of the skeleton of a species: the skeleton of its player with each
 * instrument on the support of the instrument, and on the stand of a soloist where the soloist
 * stands. The body depends only on the species and the support, so these players hold the body
 * of the species on each support of design 4.6.
 *
 * @param species The species.
 * @returns The first 16 hex digits of the SHA-256 hash.
 */
function skeletonHash(species: SpeciesId): string {
  const hash = createHash('sha256');
  for (const instrument of INSTRUMENTS) {
    const supports = new Set([INSTRUMENT_SUPPORTS[instrument], supportOf(instrument, true)]);
    for (const support of supports) {
      const numbers = skeletonNumbers(buildPlayer(species, instrument, 4, support));
      hash.update(`${instrument} ${support}: ${numbers.join(' ')}\n`);
    }
  }
  return hash.digest('hex').slice(0, 16);
}

describe('the skeleton of each species (design 4.3, 4.7)', () => {
  it('keeps each bone and each body point, with each instrument and support', () => {
    const species = Object.keys(SPECIES).filter((id): id is SpeciesId => id in SPECIES);
    const hashes = Object.fromEntries(species.map((id) => [id, skeletonHash(id)]));

    expect(hashes).toEqual(SKELETON_HASHES);
  });
});
