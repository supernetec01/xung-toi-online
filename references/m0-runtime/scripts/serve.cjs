const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../game_v3');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
};
http
  .createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405).end();
        return;
      }
      const url = new URL(req.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      if (pathname === '/healthz') {
        res
          .writeHead(200, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ status: 'ok', mode: 'local-demo' }));
        return;
      }
      // Only serve the live entry point, source and assets. Historical offline bundles are references.
      if (pathname !== '/' && pathname !== '/index.html' && !/^\/(src|assets)\//.test(pathname)) {
        res.writeHead(404).end();
        return;
      }
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const data = await fs.readFile(file);
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'",
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 400).end('Không tìm thấy tài nguyên');
    }
  })
  .listen(5001, '0.0.0.0', () => console.log('Giáo Xứ An Hòa: local port 5001 (demo)'));
