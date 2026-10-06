import { describe, expect, it } from 'vitest';

import { readWithProgress } from './read-progress.ts';

/**
 * Makes a response whose body arrives in chunks.
 *
 * @param chunks The chunks of the body.
 * @returns The response.
 */
function chunkedResponse(chunks: readonly number[][]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new Uint8Array(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

describe('readWithProgress (design 2.8, 6.3)', () => {
  it('reports the bytes of each chunk, and gives the full body', async () => {
    const counts: number[] = [];
    const buffer = await readWithProgress(chunkedResponse([[1, 2, 3], [4], [5, 6]]), (bytes) => {
      counts.push(bytes);
    });
    expect(counts).toEqual([3, 1, 2]);
    expect([...new Uint8Array(buffer)]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('reports the full size of a response with no body stream', async () => {
    const counts: number[] = [];
    const buffer = await readWithProgress(new Response(null), (bytes) => {
      counts.push(bytes);
    });
    expect(counts).toEqual([0]);
    expect(buffer.byteLength).toBe(0);
  });
});
