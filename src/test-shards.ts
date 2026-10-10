import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Picks the items of one shard of a slow sweep (design 9.3): the items whose index `i` in the
 * list gives `i % shards === shard - 1`. Each index has exactly one remainder from 0 to
 * `shards - 1`, so each item is in exactly one of the shards 1 to `shards`. Thus a new item joins
 * a shard with no new test file.
 *
 * @param items The items of the sweep, in a fixed order.
 * @param shard The shard, from 1 to `shards`.
 * @param shards The number of shards.
 * @returns The items of the shard, in their order.
 * @throws Error if the shard is not an integer from 1 to `shards`.
 */
export function shardOf<T>(items: readonly T[], shard: number, shards: number): T[] {
  if (!Number.isInteger(shard) || shard < 1 || shard > shards) {
    throw new Error(`The shard ${shard} is not an integer from 1 to ${shards}.`);
  }
  return items.filter((_, i) => i % shards === shard - 1);
}

/**
 * Lists the faults of the shard files of a sweep. {@link shardOf} puts each item into one shard,
 * so an item is lost only when its shard has no file. A fault is a shard from 1 to `shards` with
 * no file `<prefix>-<shard>.test.ts`, a file that does not call a `...Shard(<shard>)` function
 * with its own shard, or a file of a shard above `shards`.
 *
 * @param dir The folder of the test files.
 * @param prefix The start of the names of the shard files, for example `shot-frames`.
 * @param shards The number of shards.
 * @returns One line for each fault. Empty if each shard has its file.
 */
export function shardFileFaults(dir: string, prefix: string, shards: number): string[] {
  const pattern = new RegExp(`^${prefix}-(\\d+)\\.test\\.ts$`);
  const files = new Map<number, string>();
  for (const name of readdirSync(dir)) {
    const match = pattern.exec(name);
    if (match) {
      files.set(Number(match[1]), name);
    }
  }

  const faults: string[] = [];
  for (let shard = 1; shard <= shards; shard++) {
    const name = files.get(shard);
    if (!name) {
      faults.push(`No file ${prefix}-${shard}.test.ts.`);
    } else if (!readFileSync(join(dir, name), 'utf8').includes(`Shard(${shard})`)) {
      faults.push(`${name} does not register the shard ${shard}.`);
    }
  }
  for (const [shard, name] of files) {
    if (shard > shards) {
      faults.push(`${name} is above the ${shards} shards.`);
    }
  }
  return faults;
}
