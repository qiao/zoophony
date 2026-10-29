/**
 * Fetches a URL, and refuses a response with an HTTP error status. This module has no imports,
 * so the Worker and the player can share it at a small cost.
 *
 * @param url The URL.
 * @returns The response, with a status of 200 to 299.
 * @throws Error `Cannot load <url>: HTTP <status>.` for another status.
 */
export async function fetchOk(url: string | URL): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cannot load ${String(url)}: HTTP ${response.status}.`);
  }
  return response;
}
