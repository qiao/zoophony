// Serves page/ with no cache on port 4192. WebKit refuses port 4190 (ManageSieve).
// Usage: node serve.mjs [port]

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(import.meta.dirname, 'page');
const port = Number(process.argv[2] ?? 4192);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json' };

createServer(async (req, res) => {
  const path = normalize(new URL(req.url ?? '/', 'http://localhost').pathname);
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, {
      'Content-Type': types[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
