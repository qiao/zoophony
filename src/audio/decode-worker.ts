import { sf3ToPcmSf2 } from './decode.ts';
import type { DecodeReply, DecodeRequest, DecodedBank } from './decode-messages.ts';

/** The PCM SF2 files of this session, by the URL of their SF3 file (design 6.3). */
const cache = new Map<string, Promise<ArrayBuffer>>();

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

function pcmFor(url: string): Promise<ArrayBuffer> {
  let pcm = cache.get(url);
  if (!pcm) {
    pcm = fetchPcm(url);
    cache.set(url, pcm);
    // A failed file can load again on the next request.
    pcm.catch(() => cache.delete(url));
  }
  return pcm;
}

async function decodeAll(request: DecodeRequest): Promise<void> {
  const total = request.urls.length;
  let done = 0;
  const pending = request.urls.map(async (url) => {
    const pcm = await pcmFor(url);
    done += 1;
    reply({ type: 'progress', id: request.id, done, total });
    // The cache keeps each buffer, so the Worker transfers a copy.
    const bank: DecodedBank = { url, data: pcm.slice(0) };
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
