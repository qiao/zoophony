import { MathUtils } from 'three';

import { BOWED_HOLDS, SPECIES_HOLDS } from '../src/pose/bowed-rig.ts';
import { CONDUCTOR_HOLD, LEFT_HAND_PLACES } from '../src/pose/conductor.ts';
import { HANDS_HOLDS } from '../src/pose/hands.ts';
import { SPECIES_WIND_HOLDS } from '../src/pose/winds.ts';

/**
 * The own holds of the species (`SPECIES_HOLDS` of the bowed strings and `SPECIES_WIND_HOLDS` of
 * the winds), by the root `<instrument>@<species>`, such as `violin@rabbit` or `flute@fox-tan`. A
 * species with an own hold does not use the hold of its instrument.
 */
const OWN_HOLDS = Object.fromEntries(
  [...Object.entries(SPECIES_HOLDS), ...Object.entries(SPECIES_WIND_HOLDS)].flatMap(
    ([species, holds]) =>
      Object.entries(holds ?? {}).map(([instrument, hold]) => [`${instrument}@${species}`, hold]),
  ),
);

/**
 * The holds that `--set` can change, by the first name of a path (design 5.3, 5.4). The tools
 * change the objects of the modules in memory, before they build a scene, and the source files
 * do not change. The rabbits hold the violin with a hold of their own: `violin` does not change
 * it, and `violin@rabbit` does.
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
  ...OWN_HOLDS,
};

/** A change of a hold in memory. */
export interface HoldChange {
  /** Puts the old value back. */
  readonly undo: () => void;
  /** The text of the old value. */
  readonly before: string;
  /** The text of the new value. */
  readonly after: string;
  /**
   * The other paths that the change moves too. A hold that copies another hold with a spread
   * shares its nested objects, such as `violin.restBow` and `viola.restBow`. A change of the own
   * hold of a species moves no other path ({@link copyPath}).
   */
  readonly also: readonly string[];
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
 * Finds each path from the roots of {@link HOLDS} to an object.
 *
 * @param target The object.
 * @returns The paths, such as `viola.restBow.lap`.
 */
// oxlint-disable-next-line anti-slop/no-object-parameters -- a `--set` path is an I/O boundary that walks any hold.
function pathsTo(target: object): string[] {
  const found: string[] = [];
  // oxlint-disable-next-line anti-slop/no-object-parameters -- the walk goes down into each hold.
  const walk = (node: object, path: string): void => {
    for (const [key, child] of Object.entries(node)) {
      if (!(child instanceof Object)) {
        continue;
      }
      const next = path ? `${path}.${key}` : key;
      if (child === target) {
        found.push(next);
      } else {
        walk(child, next);
      }
    }
  };
  walk(HOLDS, '');
  return found;
}

/** The copies of the objects on the path of a change ({@link copyPath}). */
interface PathCopy {
  /** The copy of the last object of the path, which gets the change. */
  readonly target: object;
  /** Puts each shared object back in its parent. */
  readonly undo: () => void;
}

/**
 * Copies each object and each list on a path below a hold before a change, so that the change
 * reaches only that hold. A hold that copies another hold with a spread shares its nested objects
 * and lists, such as the `restBow` of two species, or a list of a module constant. Each copy is
 * shallow, and it takes the place of the shared object in its parent.
 *
 * @param hold The hold, the root of the path.
 * @param keys The keys from the hold to the object that holds the value, with no last key.
 * @returns The copy of the last object of the path, or the hold with no key, and a function that
 *   puts each shared object back in its parent.
 */
// oxlint-disable-next-line anti-slop/no-object-parameters -- a `--set` path is an I/O boundary that walks any hold.
function copyPath(hold: object, keys: readonly string[]): PathCopy {
  const copies: [parent: object, key: string, shared: object][] = [];
  let target = hold;
  for (const key of keys) {
    const shared = entryOf(target, key)?.[1];
    if (!(shared instanceof Object)) {
      break;
    }
    const copy = Array.isArray(shared) ? [...shared] : { ...shared };
    Reflect.set(target, key, copy);
    copies.push([target, key, shared]);
    target = copy;
  }
  return {
    target,
    undo: () => {
      for (const [parent, key, shared] of copies.toReversed()) {
        Reflect.set(parent, key, shared);
      }
    },
  };
}

/**
 * Changes one value of a hold in memory, such as `piano.lean=16deg` or
 * `piano.restL.lap.offset=-0.75,0.1,0`. The path names the keys from a hold of {@link HOLDS}. The
 * new value has the type of the old value: a number, or a list of numbers of the same length. A
 * change of the own hold of a species, with the root `<instrument>@<species>`, first copies each
 * object on its path ({@link copyPath}), so that it changes only that species. A change with the
 * root of an instrument, such as `violin.restBow.lap.along`, changes the shared object, and gives
 * the other paths that it moves too, such as `viola.restBow.lap.along`.
 *
 * @param change The change, as `<path>=<value>`.
 * @returns A function that puts the old value back, the texts of the old and the new value, and
 *   the other paths that the change moves too.
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
  const hold = entryOf(HOLDS, first)?.[1];
  if (!(hold instanceof Object) || keys.length === 0) {
    throw new Error(
      `The path ${path} names no hold value. The holds are ${HOLD_NAMES.join(', ')}.`,
    );
  }

  // oxlint-disable-next-line anti-slop/no-known-value-widening -- the walk goes down into each hold.
  let node: object = hold;
  let [key = ''] = keys;
  for (const next of keys.slice(1)) {
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
  const copied: PathCopy = first.includes('@')
    ? copyPath(hold, keys.slice(0, -1))
    : { target: node, undo: () => {} };
  const target = copied.target;
  Reflect.set(target, key, value);
  const parent = [first, ...keys.slice(0, -1)].join('.');
  return {
    undo: () => {
      Reflect.set(target, key, old);
      copied.undo();
    },
    before: String(old),
    after: String(value),
    also: pathsTo(target)
      .filter((other) => other !== parent)
      .map((other) => `${other}.${key}`),
  };
}

/**
 * Applies a list of changes, separated by `;`, as {@link setHold} does.
 *
 * @param list The changes, such as `piano.lean=16deg;piano.curl=0.4`.
 * @returns A function that puts all old values back, and a text of the changes, with the other
 *   paths that they move too.
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
  const also = done.flatMap((change) => change.also);
  const text = also.length > 0 ? `${list} (also moves ${also.join(', ')})` : list;
  return { undo, text };
}
