/**
 * cors-proxy.mjs — Lightweight CORS reverse proxy for OpenClaw Gateway
 *
 * Handles OPTIONS preflight and adds CORS headers so the GitHub Pages
 * dashboard can call the Gateway API cross-origin.
 *
 * Usage:
 *   node scripts/cors-proxy.mjs              # default: :18790 → :18789
 *   PORT=9000 node scripts/cors-proxy.mjs    # custom proxy port
 *
 * Then:
 *   ngrok http 18790    (proxy port, NOT gateway port)
 */
import http from 'node:http';

const GATEWAY = 'http://127.0.0.1:18789';
const PORT = parseInt(process.env.PORT || '18790', 10);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
  'Access-Control-Max-Age': '86400',
};

const server = http.createServer((req, res) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // Forward to Gateway
  const fwdHeaders = { ...req.headers };
  delete fwdHeaders.host; // avoid host mismatch

  const proxyReq = http.request(GATEWAY + req.url, {
    method: req.method,
    headers: fwdHeaders,
  }, (proxyRes) => {
    const headers = { ...proxyRes.headers, ...CORS };
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    res.writeHead(502, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Gateway unreachable' }));
  });

  req.pipe(proxyReq);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`CORS proxy listening on 127.0.0.1:${PORT} → ${GATEWAY}`);
  console.log('Next: ngrok http ' + PORT);
});
