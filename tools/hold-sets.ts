import { MathUtils } from 'three';

import { BOWED_HOLDS } from '../src/pose/bowed-rig.ts';
import { CONDUCTOR_HOLD, LEFT_HAND_PLACES } from '../src/pose/conductor.ts';
import { HANDS_HOLDS } from '../src/pose/hands.ts';

/**
 * The holds that `--set` can change, by the first name of a path (design 5.3, 5.4). The tools
 * change the objects of the modules in memory, before they build a scene, and the source files
 * do not change. The rabbits hold the violin with a hold of their own, which `violin` does not
 * change.
 */
const HOLDS = {
  piano: HANDS_HOLDS.piano,
  harp: HANDS_HOLDS.harp,
  violin: BOWED_HOLDS.violin,
  viola: BOWED_HOLDS.viola,
  cello: BOWED_HOLDS.cello,
  contrabass: BOWED_HOLDS.contrabass,
  conductor: CONDUCTOR_HOLD,
  conductorLeft: LEFT_HAND_PLACES,
} as const;

/** A change of a hold in memory. */
export interface HoldChange {
  /** Puts the old value back. */
  readonly undo: () => void;
  /** The text of the old value. */
  readonly before: string;
  /** The text of the new value. */
  readonly after: string;
}

/** The changes of a list of `--set`. */
export interface HoldChanges {
  /** Puts all old values back. */
  readonly undo: () => void;
  /** The text of the list. */
  readonly text: string;
}

/** The names of the holds that `--set` can change. */
export const HOLD_NAMES = Object.keys(HOLDS);

/**
 * Parses one number of a `--set` value. A number with the unit `deg` is an angle in degrees, and
 * the hold gets it in radians.
 *
 * @param text The text, such as `0.1` or `16deg`.
 * @param path The path, for the message.
 * @returns The number.
 * @throws Error if the text is not a number.
 */
function parseNumber(text: string, path: string): number {
  const degrees = text.endsWith('deg');
  const value = Number(degrees ? text.slice(0, -3) : text);
  if (text.trim() === '' || !Number.isFinite(value)) {
    throw new Error(`The value "${text}" of ${path} is not a number.`);
  }
  return degrees ? value * MathUtils.DEG2RAD : value;
}

/**
 * Gives the value of a key of an object, or reports that the object has no such key.
 *
 * @param node The object.
 * @param key The key.
 * @returns The entry of the key, or `undefined` if the object has no such key.
 */
// oxlint-disable-next-line anti-slop/no-object-parameters -- a `--set` path is an I/O boundary that walks any hold.
function entryOf(node: object, key: string): [string, unknown] | undefined {
  return Object.entries(node).find(([k]) => k === key);
}

/**
 * Changes one value of a hold in memory, such as `piano.lean=16deg` or
 * `piano.restL.lap.offset=-0.75,0.1,0`. The path names the keys from a hold of {@link HOLDS}. The
 * new value has the type of the old value: a number, or a list of numbers of the same length.
 *
 * @param change The change, as `<path>=<value>`.
 * @returns A function that puts the old value back, and the texts of the old and the new value.
 * @throws Error if the path has an unknown key, or if the value does not fit the old value.
 */
export function setHold(change: string): HoldChange {
  const equals = change.indexOf('=');
  if (equals < 1) {
    throw new Error(`The change "${change}" is not <path>=<value>.`);
  }
  const path = change.slice(0, equals);
  const text = change.slice(equals + 1);
  const [first = '', ...keys] = path.split('.');
  const hold = entryOf(HOLDS, first);
  if (!hold || keys.length === 0) {
    throw new Error(
      `The path ${path} names no hold value. The holds are ${HOLD_NAMES.join(', ')}.`,
    );
  }

  // oxlint-disable-next-line anti-slop/no-known-value-widening -- the walk goes down into each hold.
  let node: object = HOLDS;
  let key = first;
  for (const next of keys) {
    const child = entryOf(node, key)?.[1];
    if (!(child instanceof Object)) {
      throw new Error(`The key "${key}" of ${path} has no keys.`);
    }
    node = child;
    key = next;
  }
  const entry = entryOf(node, key);
  if (!entry) {
    throw new Error(`The key "${key}" of ${path} is not known.`);
  }

  const old = entry[1];
  let value: number | number[];
  if (Array.isArray(old) && old.every((v) => Number.isFinite(v))) {
    value = text.split(',').map((part) => parseNumber(part, path));
    if (value.length !== old.length) {
      throw new Error(`${path} has ${old.length} numbers, and "${text}" has ${value.length}.`);
    }
  } else if (Number.isFinite(old)) {
    value = parseNumber(text, path);
  } else {
    throw new Error(`The value of ${path} is not a number or a list of numbers.`);
  }
  const target = node;
  Reflect.set(target, key, value);
  return {
    undo: () => Reflect.set(target, key, old),
    before: String(old),
    after: String(value),
  };
}

/**
 * Applies a list of changes, separated by `;`, as {@link setHold} does.
 *
 * @param list The changes, such as `piano.lean=16deg;piano.curl=0.4`.
 * @returns A function that puts all old values back, and a text of the changes.
 * @throws Error if a change does not fit. The changes before it are then put back.
 */
export function setHolds(list: string): HoldChanges {
  const done: HoldChange[] = [];
  const undo = (): void => {
    for (const change of done.toReversed()) {
      change.undo();
    }
  };
  try {
    for (const change of list.split(';').filter((c) => c.trim() !== '')) {
      done.push(setHold(change.trim()));
    }
  } catch (error) {
    undo();
    throw error;
  }
  return { undo, text: list };
}
