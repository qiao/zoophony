/**
 * Prints the bow range of each bowed species (`bowRangeOf()` through `bowedRig()`) with its hold
 * and with other string turns and stick tilts (research of 2026-10-17, round `bow-arm`, rule B1).
 * A range that misses the full hair (the hair less `BowedHold.freeHair` at each end, in the steps
 * of 5 mm of the search) has the mark SHORT.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-bow-arm/bow-range.ts [<turn in degrees>]... [tilt=<degrees>]...
 */
import { MathUtils } from 'three';
import { buildPlayer } from '../../../src/models/player.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import type { Support } from '../../../src/models/props.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
import type { BowedHold, BowedInstrument } from '../../../src/pose/bowed-rig.ts';

const PLAYERS: readonly [SpeciesId, BowedInstrument, Support | undefined][] = [
  ['rabbit', 'violin', undefined],
  ['rabbit', 'violin', 'stand'],
  ['fox-red', 'violin', undefined],
  ['fox-red', 'violin', 'stand'],
  ['cat', 'viola', undefined],
  ['cat', 'viola', 'stand'],
  ['dog', 'cello', undefined],
  ['hippo', 'contrabass', undefined],
];

const args = process.argv.slice(2);
const turns = args.filter((a) => !a.startsWith('tilt=')).map(Number);
const tilts = args.filter((a) => a.startsWith('tilt=')).map((a) => Number(a.slice(5)));
for (const [species, instrument, support] of PLAYERS) {
  const model = buildPlayer(species, instrument, 4, support);
  const base = holdOf(species, instrument);
  const cells: string[] = [];
  const hairLength = bowedRig(model, instrument, base).hairLength;
  const full = [base.freeHair, hairLength - base.freeHair];
  const variants: [string, BowedHold][] = [['base', base]];
  for (const t of turns.length > 0 ? turns : [9]) {
    for (const tilt of tilts.length > 0 ? tilts : [Number.NaN]) {
      const hold: BowedHold = Number.isNaN(tilt)
        ? { ...base, stringTurn: t * MathUtils.DEG2RAD }
        : { ...base, stringTurn: t * MathUtils.DEG2RAD, bowTilt: tilt * MathUtils.DEG2RAD };
      variants.push([Number.isNaN(tilt) ? `${t}°` : `${t}°/${tilt}°`, hold]);
    }
  }
  for (const [label, hold] of variants) {
    const rig = bowedRig(model, instrument, hold);
    const [a, b] = rig.bowRange;
    const ok = Math.abs(a - (full[0] ?? 0)) < 1e-6 && b >= (full[1] ?? 0) - 0.005 - 1e-6;
    cells.push(`${label} ${a.toFixed(3)}-${b.toFixed(3)}${ok ? '' : ' SHORT'}`);
  }
  console.log(
    `${species} ${instrument} ${support ?? 'default'} (full ${full.map((v) => v.toFixed(3)).join('-')}, turn ${(base.stringTurn * MathUtils.RAD2DEG).toFixed(0)}°): ${cells.join(' | ')}`,
  );
}
