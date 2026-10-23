import { gzipSync } from 'node:zlib';

/**
 * The most triangles of a studio body (design 4.4, 4.5), the value of `STUDIO_BODY_BUDGET` in
 * `src/models/budget.test.ts`. `pnpm rig-mesh --check` stops above it.
 */
export const STUDIO_TRIANGLE_BUDGET = 4600;

/**
 * The largest gzip size of the packed mesh of one studio body, in bytes (design 7.2). Each studio
 * body of `STUDIO_BODIES` is in the first download, so its mesh counts against the limit of 1 MB.
 * The budget keeps about one third of room above the largest body of 2026-10-14, the rabbit mesh
 * of the user at 23,682 B. The first rig of that mesh, with one color for each face, was 53,969 B
 * (`docs/decisions/2026-10-14-mesh-rig-retro.md`).
 */
export const STUDIO_MESH_GZIP_BUDGET = 32_000;

/**
 * Gives the gzip size of a text, with the default level of Node zlib, as `pnpm size` measures the
 * first download (design 7.2).
 *
 * @param text The text, such as the packed mesh of a studio body.
 * @returns The size after gzip, in bytes.
 */
export function gzipSize(text: string): number {
  return gzipSync(text).byteLength;
}
