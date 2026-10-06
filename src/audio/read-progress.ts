/**
 * Reads the body of a response in chunks, and reports the bytes of each chunk as it arrives. The
 * decode Worker uses it, so that the load ring follows the bytes of the preset files on a slow
 * network (design 2.8, 6.3). This module has no imports, so that the Worker can use it at a small
 * cost.
 *
 * @param response The response.
 * @param onBytes Gets the byte count of each chunk.
 * @returns The bytes of the body.
 */
export async function readWithProgress(
  response: Response,
  onBytes: (bytes: number) => void,
): Promise<ArrayBuffer> {
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onBytes(buffer.byteLength);
    return buffer;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  // Each read waits for the chunk before it, so the reads form a chain.
  const readChunks = async (): Promise<void> => {
    const { done, value } = await reader.read();
    if (done) {
      return;
    }
    chunks.push(value);
    length += value.byteLength;
    onBytes(value.byteLength);
    await readChunks();
  };
  await readChunks();
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}
