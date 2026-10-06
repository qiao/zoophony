/** One region of an SFZ file, with the opcodes of its headers applied. */
export interface SfzRegion {
  /** The sample path from the folder of the SFZ file, with `/` separators. */
  readonly sample: string;
  readonly lokey: number;
  readonly hikey: number;
  /** The key at which the sample plays at its recorded pitch. */
  readonly pitchKeycenter: number;
  readonly lovel: number;
  readonly hivel: number;
  /** The gain in dB. */
  readonly volume: number;
  /** The pitch change in cents. */
  readonly tune: number;
  /** The first sample frame that plays. */
  readonly offset: number;
  /** The round robin position, from 1. A region with no round robin has 1. */
  readonly seqPosition: number;
  /** The lower limit of the random value of a random round robin, from 0 to 1. */
  readonly lorand: number;
  /** 'attack' for a note-on region, 'release' for a region that plays at the note-off. */
  readonly trigger: string;
  /** The range of the sustain pedal (CC64) in which the region plays. */
  readonly locc64: number;
  readonly hicc64: number;
  /** The attack time of the amplitude envelope in seconds. */
  readonly ampegAttack: number;
  /** The release time of the amplitude envelope in seconds. */
  readonly ampegRelease: number;
}

/** The headers whose opcodes later regions inherit, from the outermost to the innermost. */
const SCOPES = ['control', 'global', 'master', 'group'] as const;

/** A header of an SFZ file. */
type SfzHeader = (typeof SCOPES)[number] | 'region';

/** The semitone of each note letter, from C. */
const NOTE_LETTERS: ReadonlyMap<string, number> = new Map([
  ['c', 0],
  ['d', 2],
  ['e', 4],
  ['f', 5],
  ['g', 7],
  ['a', 9],
  ['b', 11],
]);

/**
 * Reads an SFZ key value: a MIDI note number, or a note name such as `c4` or `f#3`. As in the
 * SFZ format, `c4` is 60.
 *
 * @param value The opcode value.
 * @returns The MIDI note number.
 * @throws Error if the value is neither a number nor a note name.
 */
export function noteNumber(value: string): number {
  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }
  const match = /^([a-g])([#b]?)(-?\d+)$/i.exec(value);
  const letter = match?.[1];
  const semitone = letter === undefined ? undefined : NOTE_LETTERS.get(letter.toLowerCase());
  if (!match || semitone === undefined) {
    throw new Error(`"${value}" is not a key.`);
  }
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return (Number(match[3]) + 1) * 12 + semitone + accidental;
}

function isHeader(value: string): value is SfzHeader {
  return value === 'region' || SCOPES.some((scope) => scope === value);
}

/**
 * Splits one line into opcodes. A value runs to the next opcode name, because sample paths can
 * hold spaces.
 */
function lineOpcodes(line: string): [string, string][] {
  const matches = [...line.matchAll(/(?:^|\s)(\w+)=/g)];
  return matches.map((match, index) => {
    const valueStart = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? line.length;
    return [match[1] ?? '', line.slice(valueStart, end).trim()];
  });
}

function numberOf(opcodes: ReadonlyMap<string, string>, name: string, fallback: number): number {
  const value = opcodes.get(name);
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`The opcode ${name}=${value} is not a number.`);
  }
  return parsed;
}

function keyOf(opcodes: ReadonlyMap<string, string>, name: string): number | undefined {
  const value = opcodes.get(name);
  return value === undefined ? undefined : noteNumber(value);
}

function regionOf(opcodes: ReadonlyMap<string, string>): SfzRegion {
  const sample = opcodes.get('sample');
  if (!sample) {
    throw new Error('A region has no sample.');
  }
  const path = `${opcodes.get('default_path') ?? ''}${sample}`.replaceAll('\\', '/');
  const key = keyOf(opcodes, 'key');
  const lokey = keyOf(opcodes, 'lokey') ?? key ?? 0;
  const hikey = keyOf(opcodes, 'hikey') ?? key ?? 127;
  let lovel = numberOf(opcodes, 'lovel', 0);
  let hivel = numberOf(opcodes, 'hivel', 127);
  // A velocity crossfade becomes a hard split in the middle of the crossfade.
  if (opcodes.has('xfout_lovel') || opcodes.has('xfout_hivel')) {
    const middle =
      (numberOf(opcodes, 'xfout_lovel', 0) + numberOf(opcodes, 'xfout_hivel', 127)) / 2;
    hivel = Math.min(hivel, Math.floor(middle));
  }
  if (opcodes.has('xfin_lovel') || opcodes.has('xfin_hivel')) {
    const middle = (numberOf(opcodes, 'xfin_lovel', 0) + numberOf(opcodes, 'xfin_hivel', 127)) / 2;
    lovel = Math.max(lovel, Math.floor(middle) + 1);
  }
  return {
    sample: path.replace(/^\.\//, ''),
    lokey,
    hikey,
    pitchKeycenter: keyOf(opcodes, 'pitch_keycenter') ?? key ?? 60,
    lovel,
    hivel,
    volume: numberOf(opcodes, 'volume', 0),
    tune: numberOf(opcodes, 'tune', 0),
    offset: numberOf(opcodes, 'offset', 0),
    seqPosition: numberOf(opcodes, 'seq_position', 1),
    lorand: numberOf(opcodes, 'lorand', 0),
    trigger: opcodes.get('trigger') ?? 'attack',
    locc64: numberOf(opcodes, 'locc64', 0),
    hicc64: numberOf(opcodes, 'hicc64', 127),
    ampegAttack: numberOf(opcodes, 'ampeg_attack', 0),
    ampegRelease: numberOf(opcodes, 'ampeg_release', 0),
  };
}

/**
 * Parses the regions of an SFZ file. A region inherits the opcodes of the `<control>`,
 * `<global>`, `<master>`, and `<group>` headers before it. The parser reads only the opcodes of
 * {@link SfzRegion}, and it ignores comments and unknown headers.
 *
 * @param text The text of the SFZ file.
 * @returns The regions in file order.
 * @throws Error if a region has no sample, or if a key or a number opcode has a bad value.
 */
export function parseSfz(text: string): SfzRegion[] {
  const scopes = new Map<SfzHeader, ReadonlyMap<string, string>>();
  const result: SfzRegion[] = [];
  let header: SfzHeader | undefined;
  let opcodes = new Map<string, string>();
  const close = (): void => {
    if (header === 'region') {
      const merged = new Map<string, string>();
      for (const scope of SCOPES) {
        for (const [name, value] of scopes.get(scope) ?? []) {
          merged.set(name, value);
        }
      }
      for (const [name, value] of opcodes) {
        merged.set(name, value);
      }
      result.push(regionOf(merged));
    } else if (header) {
      scopes.set(header, opcodes);
    }
  };
  for (const rawLine of text.replaceAll('\r', '').split('\n')) {
    const line = rawLine.replace(/\/\/.*$/, '');
    // A line can hold headers and opcodes, such as `<region> sample=a.wav key=60`.
    for (const part of line.split(/(<\w+>)/)) {
      const name = /^<(\w+)>$/.exec(part)?.[1];
      if (name === undefined) {
        for (const [opcode, value] of lineOpcodes(part)) {
          opcodes.set(opcode, value);
        }
        continue;
      }
      close();
      header = isHeader(name) ? name : undefined;
      opcodes = new Map();
      if (header && header !== 'region') {
        // A new header clears the headers inside it.
        for (const inner of SCOPES.slice(SCOPES.indexOf(header) + 1)) {
          scopes.delete(inner);
        }
      }
    }
  }
  close();
  return result;
}
