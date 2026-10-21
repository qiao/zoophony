/** The cursor of a read of packed bytes. */
interface ByteReader {
  /** The bytes. */
  readonly bytes: Uint8Array;
  /** The index of the next byte. */
  at: number;
}

/**
 * Makes a reader of base64 text.
 *
 * @param packed The bytes as base64.
 * @returns The reader at the first byte.
 */
export function byteReader(packed: string): ByteReader {
  return { bytes: Uint8Array.from(atob(packed), (c) => c.charCodeAt(0)), at: 0 };
}

/**
 * Turns bytes into base64 text.
 *
 * @param bytes The bytes, each from 0 to 255.
 * @returns The base64 text.
 */
export function toBase64(bytes: readonly number[]): string {
  // A call of fromCharCode takes a limited number of arguments, so the bytes go in parts.
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  }
  return btoa(text);
}

/**
 * Adds an unsigned LEB128 number to a byte list: 7 bits in each byte, the low bits first, and the
 * high bit set on each byte except the last.
 *
 * @param out The bytes.
 * @param value The number, an integer of at least 0.
 * @throws Error if the number is not an integer of at least 0.
 */
export function writeVarint(out: number[], value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`The number ${value} is not an integer of at least 0.`);
  }

  let rest = value;
  while (rest >= 0x80) {
    out.push((rest % 0x80) | 0x80);
    rest = Math.floor(rest / 0x80);
  }
  out.push(rest);
}

/**
 * Gives the zigzag number of a signed number: 0, -1, 1, -2 give 0, 1, 2, 3.
 *
 * @param value The signed integer.
 * @returns The zigzag number.
 */
export function zigzag(value: number): number {
  return value < 0 ? -2 * value - 1 : 2 * value;
}

/**
 * Reads one byte.
 *
 * @param reader The cursor. The read moves it.
 * @returns The byte.
 * @throws Error if the bytes end.
 */
export function readByte(reader: ByteReader): number {
  const byte = reader.bytes[reader.at];
  if (byte === undefined) {
    throw new Error('The packed mesh ends early.');
  }

  reader.at += 1;
  return byte;
}

/**
 * Reads an unsigned LEB128 number ({@link writeVarint}).
 *
 * @param reader The cursor. The read moves it.
 * @returns The number.
 * @throws Error if the bytes end in the number.
 */
export function readVarint(reader: ByteReader): number {
  let value = 0;
  let scale = 1;
  for (;;) {
    const byte = readByte(reader);
    value += (byte & 0x7f) * scale;
    if (byte < 0x80) {
      return value;
    }
    scale *= 0x80;
  }
}

/**
 * Turns a zigzag number back into a signed number: 0, 1, 2, 3 give 0, -1, 1, -2.
 *
 * @param value The zigzag number.
 * @returns The signed number.
 */
export function unzigzag(value: number): number {
  return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
}
