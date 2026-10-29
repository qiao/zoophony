/** The audio of a WAV file, as float samples from -1 to 1. */
interface WavAudio {
  /** The sample rate in Hz. */
  readonly sampleRate: number;
  /** One array for each channel, all of the same length. */
  readonly channels: readonly Float32Array[];
}

/** The WAVE format tag of integer PCM. */
const FORMAT_PCM = 1;

/** The WAVE format tag of IEEE float samples. */
const FORMAT_FLOAT = 3;

/** The WAVE format tag of WAVE_FORMAT_EXTENSIBLE. The sub-format holds the real tag. */
const FORMAT_EXTENSIBLE = 0xfffe;

/** The fields of a `fmt ` chunk that the decoder reads. */
interface WavFormat {
  readonly tag: number;
  readonly channels: number;
  readonly sampleRate: number;
  readonly bits: number;
}

function fourCC(view: DataView, offset: number): string {
  return String.fromCodePoint(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

function readFormat(view: DataView, offset: number, size: number): WavFormat {
  const tag = view.getUint16(offset, true);
  return {
    // The first two bytes of the sub-format GUID are the format tag.
    tag: tag === FORMAT_EXTENSIBLE && size >= 26 ? view.getUint16(offset + 24, true) : tag,
    channels: view.getUint16(offset + 2, true),
    sampleRate: view.getUint32(offset + 4, true),
    bits: view.getUint16(offset + 14, true),
  };
}

function readSample(view: DataView, offset: number, format: WavFormat): number {
  if (format.tag === FORMAT_FLOAT && format.bits === 32) {
    return view.getFloat32(offset, true);
  }
  if (format.tag !== FORMAT_PCM) {
    throw new Error(`The WAV format tag ${format.tag} with ${format.bits} bits is not supported.`);
  }
  switch (format.bits) {
    case 8:
      return (view.getUint8(offset) - 128) / 128;
    case 16:
      return view.getInt16(offset, true) / 32_768;
    case 24: {
      const value =
        view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getInt8(offset + 2) << 16);
      return value / 8_388_608;
    }
    case 32:
      return view.getInt32(offset, true) / 2_147_483_648;
    default:
      throw new Error(`A PCM WAV file with ${format.bits} bits is not supported.`);
  }
}

/**
 * Decodes a RIFF WAVE file with integer PCM (8, 16, 24, or 32 bits) or 32-bit float samples.
 * The decoder skips all chunks other than `fmt ` and `data`.
 *
 * @param bytes The bytes of the file.
 * @returns The sample rate and the samples of each channel.
 * @throws Error if the file is not a WAVE file, or if its format is not supported.
 */
export function decodeWav(bytes: Uint8Array): WavAudio {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 12 || fourCC(view, 0) !== 'RIFF' || fourCC(view, 8) !== 'WAVE') {
    throw new Error('The file is not a RIFF WAVE file.');
  }
  let format: WavFormat | undefined;
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const id = fourCC(view, offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = readFormat(view, body, size);
    } else if (id === 'data') {
      if (!format) {
        throw new Error('The data chunk comes before the fmt chunk.');
      }
      const frameBytes = (format.bits / 8) * format.channels;
      const frames = Math.floor(Math.min(size, bytes.byteLength - body) / frameBytes);
      const channels = Array.from({ length: format.channels }, () => new Float32Array(frames));
      for (let frame = 0; frame < frames; frame++) {
        for (let channel = 0; channel < format.channels; channel++) {
          const at = body + frame * frameBytes + (channel * format.bits) / 8;
          const target = channels[channel];
          if (target) {
            target[frame] = readSample(view, at, format);
          }
        }
      }
      return { sampleRate: format.sampleRate, channels };
    }
    // A chunk with an odd size has one pad byte.
    offset = body + size + (size % 2);
  }
  throw new Error('The WAVE file has no data chunk.');
}
