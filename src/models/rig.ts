import type { Vec3 } from './tuples.ts';

/**
 * The bones of a player, in the order of the rotations of a pose (design 4.7, 5.1). Each skeleton
 * has all bones, so a bone has the same index in each player. A bone with no part, such as the
 * trunk of a rabbit, moves nothing.
 */
export const BONE_NAMES = [
  'root',
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'jaw',
  'eyeL',
  'eyeR',
  'earL',
  'earR',
  'tail1',
  'tail2',
  'trunk1',
  'trunk2',
  'trunk3',
  'shoulderL',
  'upperArmL',
  'forearmL',
  'handL',
  'fingersL',
  'shoulderR',
  'upperArmR',
  'forearmR',
  'handR',
  'fingersR',
  'thighL',
  'shinL',
  'footL',
  'thighR',
  'shinR',
  'footR',
  'instrument',
  'bow',
  'malletL',
  'malletR',
  'baton',
  'slide',
] as const;

/** The name of a bone (design 4.7). */
export type BoneName = (typeof BONE_NAMES)[number];

/** The bone that holds the instrument: the chest for the violin, the viola, and winds (4.7). */
export type InstrumentParent = 'chest' | 'root';

/**
 * Gives the index of a bone in {@link BONE_NAMES}.
 *
 * @param name The bone name.
 * @returns The index, which is also the index of its rotation in a pose.
 */
export function boneIndex(name: BoneName): number {
  return BONE_NAMES.indexOf(name);
}

/** The parent of each bone except `instrument`, whose parent depends on the instrument (4.7). */
const BONE_PARENTS = {
  root: null,
  hips: 'root',
  spine: 'hips',
  chest: 'spine',
  neck: 'chest',
  head: 'neck',
  jaw: 'head',
  eyeL: 'head',
  eyeR: 'head',
  earL: 'head',
  earR: 'head',
  tail1: 'hips',
  tail2: 'tail1',
  trunk1: 'head',
  trunk2: 'trunk1',
  trunk3: 'trunk2',
  shoulderL: 'chest',
  upperArmL: 'shoulderL',
  forearmL: 'upperArmL',
  handL: 'forearmL',
  fingersL: 'handL',
  shoulderR: 'chest',
  upperArmR: 'shoulderR',
  forearmR: 'upperArmR',
  handR: 'forearmR',
  fingersR: 'handR',
  thighL: 'hips',
  shinL: 'thighL',
  footL: 'shinL',
  thighR: 'hips',
  shinR: 'thighR',
  footR: 'shinR',
  bow: 'handR',
  malletL: 'handL',
  malletR: 'handR',
  baton: 'handR',
  slide: 'instrument',
} as const satisfies Readonly<Record<Exclude<BoneName, 'instrument'>, BoneName | null>>;

/**
 * The skeleton of one player in its bind pose. All bones have no rotation in the bind pose, so
 * a pose rotation of a bone turns it from the axes of the model.
 */
export interface Skeleton {
  /** The position of each bone in the axes of the model, in the order of {@link BONE_NAMES}. */
  readonly positions: readonly Vec3[];
  /** The index of the parent of each bone, or -1 for the root. */
  readonly parents: readonly number[];
}

/**
 * Makes a skeleton from the bone positions.
 *
 * @param positions The bind position of each bone, in the axes of the model.
 * @param instrumentParent The parent of the `instrument` bone.
 * @returns The skeleton, in the order of {@link BONE_NAMES}.
 */
export function makeSkeleton(
  positions: Readonly<Record<BoneName, Vec3>>,
  instrumentParent: InstrumentParent,
): Skeleton {
  return {
    positions: BONE_NAMES.map((name) => positions[name]),
    parents: BONE_NAMES.map((name) => {
      const parent = name === 'instrument' ? instrumentParent : BONE_PARENTS[name];
      return parent === null ? -1 : boneIndex(parent);
    }),
  };
}
