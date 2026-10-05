import { sf3ToPcmSf2 } from './decode.ts';
import type { DecodeReply, DecodeRequest, DecodedBank } from './decode-messages.ts';

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
 * Worker keeps no buffer: the synth keeps each bank for the session (design 6.3).
 */
async function decodeAll(request: DecodeRequest): Promise<void> {
  const total = request.urls.length;
  let done = 0;
  const pending = request.urls.map(async (url) => {
    const data = await fetchPcm(url);
    done += 1;
    reply({ type: 'progress', id: request.id, done, total });
    const bank: DecodedBank = { url, data };
    return bank;
  });
  const banks = await Promise.all(pending);
  const pcmBytes = banks.reduce((sum, bank) => sum + bank.data.byteLength, 0);
  reply(
    { type: 'decoded', id: request.id, banks, pcmBytes },
    banks.map((bank) => bank.data),
  );
}

async function decode(request: DecodeRequest): Promise<void> {
  try {
    await decodeAll(request);
  } catch (error) {
    reply({ type: 'failed', id: request.id, message: String(error) });
  }
}

self.addEventListener('message', (event: MessageEvent<DecodeRequest>) => {
  void decode(event.data);
});
