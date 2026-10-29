// The local server of a built site for the load measures: `pnpm load-probe`. It serves a folder
// such as `dist/` over HTTP/2 with TLS (and HTTP/1.1), and copies the answers of the host:
//
// - GitHub Pages: gzip for the text types, ETag, and `Cache-Control: max-age=600`.
//
// The phone shape delays each request and shares one link rate among all bodies, so that the
// fetches of the Workers also get the shape (`--phone` of `pnpm load-probe`).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';
import { createSecureServer } from 'node:http2';
import type { Http2ServerRequest, Http2ServerResponse } from 'node:http2';
import { extname, join, normalize, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

/** The root of the repository. */
const ROOT = resolve(import.meta.dirname, '..');

/** The text types that the server sends with gzip, as GitHub Pages does. */
const GZIP_TYPES = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt']);

/** The content type of each file type of the site. */
const CONTENT_TYPES = new Map([
  ['.html', 'text/html'],
  ['.js', 'text/javascript'],
  ['.css', 'text/css'],
  ['.json', 'application/json'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain'],
  ['.wav', 'audio/wav'],
  ['.flac', 'audio/flac'],
  ['.mid', 'audio/midi'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

/** Fast 4G of DevTools: 60 ms of round trip x 2.75 for each request. */
const PHONE_LATENCY_MS = 165;

/** Fast 4G of DevTools: 9 Mbit/s x 0.9 down, for all requests together, in bytes per second. */
const PHONE_BYTES_PER_S = (9e6 / 8) * 0.9;

/** The bytes that each body of the shaper gets in its turn. */
const LINK_TURN_BYTES = 4096;

/** A body that the shaper sends: the bytes that are left, and the functions of the response. */
interface LinkBody {
  /** The bytes that the shaper did not send yet. */
  rest: Buffer;
  /** Writes bytes into the response. */
  readonly write: (chunk: Buffer) => void;
  /** Ends the response. */
  readonly end: () => void;
}

/** A file of the site with its gzip bytes and its ETag. */
interface SiteFile {
  /** The bytes of the file. */
  readonly body: Buffer;
  /** The gzip bytes of a text type, or `null`. */
  readonly gzip: Buffer | null;
  /** The ETag: a part of the SHA-1 of the bytes. */
  readonly etag: string;
}

/**
 * The server of a site as GitHub Pages serves it: HTTP/2 with TLS (or HTTP/1.1), gzip for the text
 * types, `Cache-Control: max-age=600`, and ETag. The phone run shapes the network in the server, so
 * that the fetches of the Workers also get the shape: each body gets a turn of
 * {@link LINK_TURN_BYTES} bytes, so that each body keeps the order of its own bytes.
 */
export class SiteServer {
  /** The folder of the site. */
  readonly #root: string;
  /** The latency of each request, in ms. */
  readonly #latencyMs: number;
  /** The rate of the link, in bytes per second, `Infinity` with no shape. */
  readonly #bytesPerSecond: number;
  /** The files that the server read, by path. */
  readonly #files = new Map<string, SiteFile>();
  /** The open bodies of the shaper. */
  readonly #bodies: LinkBody[] = [];
  /** The bytes that the link can send now. */
  #budget = 0;
  /** The time of the last tick of the shaper, in ms. */
  #last = performance.now();
  /** The time of the last request of the page, in ms. */
  #pageAt = 0;
  /** The bytes that the server sent for each path since the last {@link SiteServer.reset}. */
  sent = new Map<string, number>();
  /** Each response since the last reset: the path, its start, its end, and its bytes. */
  timeline: [string, number, number, number][] = [];

  /**
   * Creates the server of a folder.
   *
   * @param root The folder of the site, such as `dist/`.
   * @param phone True for the shape of Fast 4G.
   */
  constructor(root: string, phone: boolean) {
    this.#root = root;
    this.#latencyMs = phone ? PHONE_LATENCY_MS : 0;
    this.#bytesPerSecond = phone ? PHONE_BYTES_PER_S : Infinity;
  }

  /** Clears the bytes and the timeline for the next load. */
  reset(): void {
    this.sent = new Map();
    this.timeline = [];
  }

  /**
   * Gives each open body its share of the link (5 ms ticks).
   */
  tick(): void {
    const now = performance.now();
    this.#budget = Math.min(
      this.#budget + ((now - this.#last) / 1000) * this.#bytesPerSecond,
      this.#bytesPerSecond * 0.02,
    );
    this.#last = now;
    while (this.#bodies.length > 0 && this.#budget >= 1) {
      for (let i = 0; i < this.#bodies.length && this.#budget >= 1;) {
        const body = this.#bodies[i];
        if (!body) {
          break;
        }
        const take = Math.min(body.rest.length, LINK_TURN_BYTES, Math.floor(this.#budget));
        body.write(body.rest.subarray(0, take));
        body.rest = body.rest.subarray(take);
        this.#budget -= take;
        if (body.rest.length === 0) {
          this.#bodies.splice(i, 1);
          body.end();
        } else {
          i++;
        }
      }
    }
  }

  /**
   * Reads a file of the site, with its gzip bytes and its ETag, one time.
   *
   * @param path The path of the URL.
   * @returns The file, or `null` when the site has no such file.
   */
  #file(path: string): SiteFile | null {
    let file = join(this.#root, normalize(decodeURIComponent(path)));
    if (!file.startsWith(this.#root)) {
      return null;
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
      file = join(file, 'index.html');
    }
    if (!existsSync(file)) {
      return null;
    }

    let entry = this.#files.get(file);
    if (!entry) {
      const body = readFileSync(file);
      entry = {
        body,
        gzip: GZIP_TYPES.has(extname(file)) ? gzipSync(body) : null,
        etag: `"${createHash('sha1').update(body).digest('hex').slice(0, 16)}"`,
      };
      this.#files.set(file, entry);
    }
    return entry;
  }

  /**
   * Answers a request after the latency of the shape.
   *
   * @param request The request.
   * @param response The response.
   */
  serve(request: Http2ServerRequest, response: Http2ServerResponse): void {
    const path = new URL(request.url ?? '/', 'https://localhost').pathname;
    const reply = (): void => {
      this.#reply(path, request.headers, response);
    };
    if (this.#latencyMs > 0) {
      setTimeout(reply, this.#latencyMs);
    } else {
      reply();
    }
  }

  /**
   * Sends a file, a 304 answer for a known ETag, or a 404 answer.
   *
   * @param path The path of the URL.
   * @param headers The headers of the request.
   * @param response The response.
   */
  #reply(path: string, headers: IncomingHttpHeaders, response: Http2ServerResponse): void {
    const entry = this.#file(path);
    if (!entry) {
      response.writeHead(404);
      response.end();
      return;
    }

    if (path === '/') {
      this.#pageAt = performance.now();
    }
    const filePath = path.endsWith('/') ? `${path}index.html` : path;
    const replyHeaders: OutgoingHttpHeaders = {
      'content-type': CONTENT_TYPES.get(extname(filePath)) ?? 'application/octet-stream',
      'cache-control': 'max-age=600',
      etag: entry.etag,
    };
    if (headers['if-none-match'] === entry.etag) {
      response.writeHead(304, replyHeaders);
      response.end();
      return;
    }

    const gzip = entry.gzip !== null && String(headers['accept-encoding']).includes('gzip');
    const body = gzip && entry.gzip ? entry.gzip : entry.body;
    if (gzip) {
      replyHeaders['content-encoding'] = 'gzip';
    }
    replyHeaders['content-length'] = String(body.length);
    response.writeHead(200, replyHeaders);
    this.sent.set(path, (this.sent.get(path) ?? 0) + body.length);
    const row: [string, number, number, number] = [
      path,
      Math.round(performance.now() - this.#pageAt),
      -1,
      body.length,
    ];
    this.timeline.push(row);
    response.on('finish', () => {
      row[2] = Math.round(performance.now() - this.#pageAt);
    });
    if (this.#bytesPerSecond === Infinity) {
      response.end(body);
      return;
    }

    this.#bodies.push({
      rest: body,
      write: (chunk) => {
        response.write(chunk);
      },
      end: () => {
        response.end();
      },
    });
  }
}

/** The certificate of the server. */
interface Certificate {
  /** The private key, as PEM. */
  readonly key: Buffer;
  /** The certificate for `localhost`, as PEM. */
  readonly cert: Buffer;
  /** The base64 SHA-256 of the public key, for `--ignore-certificate-errors-spki-list`. */
  readonly spki: string;
}

/**
 * Gives the certificate of the server, and the SPKI hash of its key. Chrome trusts the key, so it
 * keeps an HTTP cache: with a certificate error, it keeps none, and a repeat visit loads each file
 * again.
 *
 * @returns The key, the certificate, and the hash.
 */
function certificate(): Certificate {
  const dir = join(ROOT, 'scratch', 'site-server-cert');
  const keyFile = join(dir, 'key.pem');
  const certFile = join(dir, 'cert.pem');
  if (!existsSync(certFile)) {
    mkdirSync(dir, { recursive: true });
    execFileSync('openssl', [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-subj',
      '/CN=localhost',
      '-days',
      '365',
      '-keyout',
      keyFile,
      '-out',
      certFile,
    ]);
  }

  const spki = execFileSync('sh', [
    '-c',
    `openssl x509 -in '${certFile}' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64`,
  ])
    .toString()
    .trim();
  return { key: readFileSync(keyFile), cert: readFileSync(certFile), spki };
}

/** A site server that listens on a port. */
export interface RunningSite {
  /** The server, with the bytes and the timeline of the last load. */
  readonly server: SiteServer;
  /**
   * The flag that makes Chrome trust the certificate of the server:
   * `--ignore-certificate-errors-spki-list=<hash>`.
   */
  readonly trustFlag: string;
  /** Stops the shaper and the listener. */
  readonly close: () => void;
}

/**
 * Starts the server of a site on a port of `localhost`, with its shaper.
 *
 * @param root The folder of the site, such as `dist/`.
 * @param phone True for the shape of Fast 4G.
 * @param port The port.
 * @returns The running site.
 */
export async function startSiteServer(
  root: string,
  phone: boolean,
  port: number,
): Promise<RunningSite> {
  const server = new SiteServer(root, phone);
  const linkTimer = setInterval(() => {
    server.tick();
  }, 5);
  const { key, cert, spki } = certificate();
  const listener = createSecureServer({ key, cert, allowHTTP1: true }, (request, response) => {
    server.serve(request, response);
  });
  await new Promise<void>((done) => listener.listen(port, done));
  return {
    server,
    trustFlag: `--ignore-certificate-errors-spki-list=${spki}`,
    close: () => {
      clearInterval(linkTimer);
      listener.close();
    },
  };
}
