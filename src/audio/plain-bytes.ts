/**
 * Removes the gzip layer of a file of the site, if the file has one. The build gzips each preset
 * file and each demo file in place (design 6.2, 8.3), and GitHub Pages sends these files with no
 * `Content-Encoding`. The dev server sends the plain files. A gzip file starts with the bytes
 * `1f 8b` (RFC 1952), an SF3 file with `RIFF`, and a MIDI file with `MThd`. Thus the first two
 * bytes tell the two kinds apart.
 *
 * @param buffer The bytes of a response.
 * @returns The bytes with no gzip layer. A buffer with no gzip layer comes back as it is.
 * @throws TypeError if the gzip data is not valid.
 */
export async function plainBytes(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const head = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 2));
  if (head[0] !== 0x1f || head[1] !== 0x8b) {
    return buffer;
  }
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}
