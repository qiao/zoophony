import { BasicSoundBank, SoundBankLoader } from 'spessasynth_core';

/**
 * Converts an SF3 file to an SF2 file with PCM samples, so that the synth decodes no Ogg data
 * during play (design 6.3).
 *
 * @param sf3 The bytes of the SF3 file.
 * @returns The bytes of the PCM SF2 file.
 */
export async function sf3ToPcmSf2(sf3: ArrayBuffer): Promise<ArrayBuffer> {
  await BasicSoundBank.isSF3DecoderReady;
  const bank = SoundBankLoader.fromArrayBuffer(sf3);
  await bank.setSampleFormat({ format: 'pcm' });
  return bank.writeSF2();
}
