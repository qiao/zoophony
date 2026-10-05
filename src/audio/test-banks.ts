import { join } from 'node:path';

import { loadSoundBank, presetTarget, splitPreset } from '../../tools/split-soundfont.ts';
import type { PresetTarget } from '../../tools/split-soundfont.ts';
import { sf3ToPcmSf2 } from './decode.ts';
import type { EngineBank } from './engine.ts';

const SOURCE = join(import.meta.dirname, '..', '..', 'assets', 'soundfont', 'GeneralUserGS.sf3');

/**
 * Makes PCM SF2 banks from the presets of GeneralUserGS.sf3, in the same way as the build split
 * and the decode Worker. Only tests use this function.
 *
 * @param targets The bank and program of each preset. Drum kits use bank 128.
 * @returns One bank for each target.
 * @throws Error if the SoundFont has no preset for a target.
 */
export async function testBanks(targets: readonly PresetTarget[]): Promise<EngineBank[]> {
  const source = await loadSoundBank(SOURCE);
  const banks = targets.map(async (target): Promise<EngineBank> => {
    const preset = source.presets.find((item) => {
      const found = presetTarget(item);
      return found?.bank === target.bank && found.program === target.program;
    });
    if (!preset) {
      throw new Error(`GeneralUserGS.sf3 has no preset ${target.bank}:${target.program}.`);
    }
    const data = await sf3ToPcmSf2(splitPreset(source, preset));
    return { id: `${target.bank}:${target.program}`, data };
  });
  return Promise.all(banks);
}
