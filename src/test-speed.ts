/**
 * Does a fixed amount of float math on new small arrays, as the pose code does. It takes about
 * 2.6 ms on the development Mac.
 *
 * @returns A sum, so that the work has a result.
 */
function referenceWork(): number {
  let sum = 0;
  for (let i = 0; i < 100_000; i++) {
    const v: [number, number, number] = [Math.sin(i), Math.cos(i), i * 1e-4];
    sum += Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }
  return sum;
}

/**
 * Measures the time of a work as a multiple of the time of a fixed reference work of float math.
 * Each round times the reference work and the work in turn. Load on the machine only adds time,
 * and a short work often runs with no stop. Thus the least time of each over all rounds is near
 * its time with no load. A slower machine also does the reference work more slowly, so the ratio
 * stays almost the same. Only tests use this function, so it does not enter the first download.
 *
 * @param work The work to time.
 * @param rounds The number of rounds.
 * @returns The least time of the work, divided by the least time of the reference work.
 * @throws Error if the reference work gives no result.
 */
export function timeRatio(work: () => void, rounds: number): number {
  let least = Infinity;
  let reference = Infinity;
  let sum = 0;
  for (let round = 0; round < rounds; round++) {
    let start = performance.now();
    sum += referenceWork();
    reference = Math.min(reference, performance.now() - start);
    start = performance.now();
    work();
    least = Math.min(least, performance.now() - start);
  }
  if (sum <= 0) {
    throw new Error('The reference work gave no result.');
  }
  return least / reference;
}
