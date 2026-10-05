import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** The program changes of one demo file (design 8.3). */
export interface DemoPatch {
  /** File name in demos/src/. */
  readonly file: string;
  /** Sets the program of all program changes in one track. The index starts at 0. */
  readonly setProgram: readonly { readonly track: number; readonly program: number }[];
}

/** One demo file, after the changes of `demos/patches.json`. */
export interface DemoFile {
  /** File name in demos/src/, such as `beethoven-5.mid`. */
  readonly file: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
}

/** The folder of the demo inputs and of `patches.json`. */
export const DEMOS_DIR = join(import.meta.dirname, '..', 'demos');

/**
 * Finds the program change data bytes of one track of a Standard MIDI File. The walk reads
 * running status, also after a meta event or a SysEx event, as `midi/` does.
 *
 * @param bytes The bytes of the file.
 * @param track The index of the track chunk (MTrk), from 0. Other chunks do not count.
 * @returns The byte offset of the program of each program change, in file order.
 * @throws Error if the file has no such track, or if the track is not valid.
 */
export function programOffsets(bytes: Uint8Array, track: number): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 8 + view.getUint32(4);
  let index = 0;
  while (pos + 8 <= bytes.length) {
    const id = String.fromCodePoint(...bytes.subarray(pos, pos + 4));
    const start = pos + 8;
    const end = start + view.getUint32(pos + 4);
    if (id === 'MTrk') {
      if (index === track) {
        return trackPrograms(bytes, start, Math.min(end, bytes.length));
      }
      index += 1;
    }
    pos = end;
  }
  throw new Error(`The file has no track ${track}.`);
}

function trackPrograms(bytes: Uint8Array, start: number, end: number): number[] {
  const offsets: number[] = [];
  let pos = start;
  let status = 0;
  const byte = (at: number): number => {
    if (at >= end) {
      throw new Error(`Track byte ${at} is past the end of its chunk.`);
    }
    return bytes[at] ?? 0;
  };
  const variableLength = (): number => {
    let value = 0;
    for (let i = 0; i < 4; i += 1) {
      const next = byte(pos);
      pos += 1;
      value = (value << 7) | (next & 0x7f);
      if (next < 0x80) {
        return value;
      }
    }
    throw new Error(`A variable-length number ends at byte ${pos} with more than 4 bytes.`);
  };
  while (pos < end) {
    variableLength();
    const first = byte(pos);
    if (first === 0xff) {
      const type = byte(pos + 1);
      pos += 2;
      const length = variableLength();
      pos += length;
      if (type === 0x2f) {
        break;
      }
    } else if (first === 0xf0 || first === 0xf7) {
      pos += 1;
      const length = variableLength();
      pos += length;
    } else {
      if (first >= 0x80) {
        status = first;
        pos += 1;
      }
      const kind = status & 0xf0;
      if (kind < 0x80) {
        throw new Error(`Track byte ${pos} has no valid status.`);
      }
      if (kind === 0xc0) {
        offsets.push(pos);
      }
      pos += kind === 0xc0 || kind === 0xd0 ? 1 : 2;
    }
  }
  return offsets;
}

/**
 * Applies the program changes of one patch (design 8.3). The file keeps its length, because a
 * program is one data byte.
 *
 * @param bytes The bytes of the input file.
 * @param patch The changes of the file.
 * @returns A changed copy of the bytes.
 * @throws Error if a track of the patch does not exist or has no program change, or if a
 *   program is not 0 to 127.
 */
export function applyPatch(bytes: Uint8Array, patch: DemoPatch): Uint8Array<ArrayBuffer> {
  const out = Uint8Array.from(bytes);
  for (const { track, program } of patch.setProgram) {
    if (!Number.isInteger(program) || program < 0 || program > 127) {
      throw new Error(`${patch.file}: program ${program} is not 0 to 127.`);
    }
    const offsets = programOffsets(bytes, track);
    if (offsets.length === 0) {
      throw new Error(`${patch.file}: track ${track} has no program change.`);
    }
    for (const offset of offsets) {
      out[offset] = program;
    }
  }
  return out;
}

/**
 * Reads the SHA-256 table of `demos/README.md`: each row with a file in `src/` and a checksum.
 *
 * @param readme The text of the README.
 * @returns The checksum in lower-case hex for each file name in demos/src/.
 */
export function readChecksums(readme: string): Map<string, string> {
  const checksums = new Map<string, string>();
  for (const match of readme.matchAll(/^\| `src\/([^`]+)` \| `([0-9a-f]{64})` \|$/gm)) {
    const [, file, hash] = match;
    if (file && hash) {
      checksums.set(file, hash);
    }
  }
  return checksums;
}

/**
 * Calculates the SHA-256 of bytes.
 *
 * @param bytes The bytes.
 * @returns The checksum in lower-case hex.
 */
export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Checks the SHA-256 of a demo input against `demos/README.md`.
 *
 * @param file The file name in demos/src/.
 * @param bytes The bytes of the file.
 * @param checksums The table of {@link readChecksums}.
 * @throws Error if the README has no checksum for the file, or if the checksum differs.
 */
export function checkDemo(
  file: string,
  bytes: Uint8Array,
  checksums: ReadonlyMap<string, string>,
): void {
  const expected = checksums.get(file);
  if (!expected) {
    throw new Error(`demos/README.md has no SHA-256 for src/${file}.`);
  }
  const actual = sha256(bytes);
  if (actual !== expected) {
    throw new Error(
      `src/${file} has the SHA-256 ${actual}, but demos/README.md gives ${expected}.`,
    );
  }
}

/**
 * Reads the patch list of `demos/patches.json`.
 *
 * @param text The text of the JSON file.
 * @returns The patches.
 * @throws Error if an entry has no file name, or a change has no integer track and program.
 */
export function parsePatches(text: string): DemoPatch[] {
  // SAFETY: the loop below checks each field that the script reads.
  const patches = JSON.parse(text) as DemoPatch[];
  if (!Array.isArray(patches)) {
    throw new Error('demos/patches.json is not a list.');
  }
  for (const patch of patches) {
    const valid =
      patch.file.endsWith('.mid') &&
      Array.isArray(patch.setProgram) &&
      patch.setProgram.every(
        (change) => Number.isInteger(change.track) && Number.isInteger(change.program),
      );
    if (!valid) {
      throw new Error(
        `demos/patches.json has an entry that is not valid: ${JSON.stringify(patch)}.`,
      );
    }
  }
  return patches;
}

/**
 * Reads each demo input of demos/src/, checks its SHA-256, and applies `demos/patches.json`
 * (design 8.3).
 *
 * @param dir The demos folder.
 * @returns The changed files, and the files with no patch as they are, sorted by name.
 * @throws Error if a checksum differs, or if a patch names a file that does not exist.
 */
export async function patchedDemos(dir = DEMOS_DIR): Promise<DemoFile[]> {
  const checksums = readChecksums(await readFile(join(dir, 'README.md'), 'utf8'));
  const patches = parsePatches(await readFile(join(dir, 'patches.json'), 'utf8'));
  const files = (await readdir(join(dir, 'src')))
    .filter((file) => file.endsWith('.mid'))
    .toSorted();
  for (const patch of patches) {
    if (!files.includes(patch.file)) {
      throw new Error(`demos/patches.json names ${patch.file}, which is not in demos/src/.`);
    }
  }
  const demos: DemoFile[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await readFile(join(dir, 'src', file)));
    checkDemo(file, bytes, checksums);
    const patch = patches.find((item) => item.file === file);
    demos.push({ file, bytes: patch ? applyPatch(bytes, patch) : bytes });
  }
  return demos;
}

async function main(): Promise<void> {
  const out = join(import.meta.dirname, '..', 'public', 'demos');
  const demos = await patchedDemos();
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  for (const demo of demos) {
    await writeFile(join(out, demo.file), demo.bytes);
  }
  console.log(`Wrote ${demos.length} demo files to public/demos/.`);
}

if (import.meta.main) {
  await main();
}
