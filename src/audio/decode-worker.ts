import { sf3ToPcmSf2 } from './decode.ts';
import type { DecodeReply, DecodeRequest } from './decode-messages.ts';
import type { EngineBank } from './engine.ts';

function reply(message: DecodeReply, transfer: Transferable[] = []): void {
  self.postMessage(message, { transfer });
}

async function fetchPcm(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cannot load ${url}: HTTP ${response.status}.`);
  }
  return sf3ToPcmSf2(await response.arrayBuffer());
}

/**
 * Fetches and converts the presets of a request, and transfers the PCM buffers with no copy. The
 * Worker keeps no buffer: the synth keeps each bank for the session (design 6.3). A failure
 * gives a `failed` reply.
 */
async function decode(request: DecodeRequest): Promise<void> {
  const total = request.urls.length;
  let done = 0;
  try {
    const banks = await Promise.all(
      request.urls.map(async (url): Promise<EngineBank> => {
        const data = await fetchPcm(url);
        done += 1;
        reply({ type: 'progress', id: request.id, done, total });
        return { id: url, data };
      }),
    );
    reply(
      { type: 'decoded', id: request.id, banks },
      banks.map((bank) => bank.data),
    );
  } catch (error) {
    reply({ type: 'failed', id: request.id, message: String(error) });
  }
}

self.addEventListener('message', (event: MessageEvent<DecodeRequest>) => {
  void decode(event.data);
});
