const http = require('node:http');
const https = require('node:https');

/** Metro's local web preview forwards the app API without browser CORS preflights. */
function createDevApiProxy(next, upstream = 'https://webeelab.site') {
  const apiTarget = new URL(upstream);
  return (req, res, done) => {
    const url = new URL(req.url || '/', 'http://localhost');
    let target = apiTarget;
    let upstreamPath = req.url;
    if (['/__dev/kma/kma_sfctm2.php', '/__dev/kma/kma_sfctm3.php', '/__dev/kma/kma_sfcdd3.php'].includes(url.pathname)) {
      target = new URL('https://apihub.kma.go.kr');
      upstreamPath = `/api/typ01/url/${url.pathname.split('/').pop()}${url.search}`;
    } else if (url.pathname === '/__dev/news/rss') {
      target = new URL('https://news.google.com');
      upstreamPath = `/rss/search${url.search}`;
    } else if (!url.pathname.startsWith('/api/v1/')) {
      return next(req, res, done);
    }
    // External data sources are read-only and have fixed destinations.
    if (target !== apiTarget && req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET' });
      return res.end();
    }

    const headers = { ...req.headers, host: target.host, 'user-agent': 'Mozilla/5.0' };
    delete headers.origin;
    delete headers.referer;
    delete headers.connection;
    if (target !== apiTarget) {
      delete headers.authorization;
      delete headers.cookie;
    }
    const transport = target.protocol === 'https:' ? https : http;
    const request = transport.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      path: upstreamPath,
      method: req.method,
      headers,
    }, (response) => {
      const responseHeaders = { ...response.headers };
      // The native client reads the refresh token from headers. Browsers hide Set-Cookie.
      const cookies = response.headers['set-cookie'];
      if (cookies && target === apiTarget) {
        responseHeaders['set-cookie'] = cookies.map((cookie) => cookie.replace(/;\s*Domain=[^;]*/gi, ''));
        const refresh = cookies.map((cookie) => cookie.match(/^refreshToken=([^;]+)/)).find(Boolean);
        if (refresh) responseHeaders['x-refresh-token'] = refresh[1];
      } else if (target !== apiTarget) {
        delete responseHeaders['set-cookie'];
      }
      res.writeHead(response.statusCode || 502, responseHeaders);
      // Pipe SSE chunks immediately as well as ordinary JSON responses.
      response.pipe(res);
      res.on('close', () => response.destroy());
    });
    request.on('error', () => {
      if (res.headersSent) return res.destroy();
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'DEV_PROXY_ERROR', message: 'API 서버에 연결하지 못했어요.' }));
    });
    req.on('aborted', () => request.destroy());
    res.on('close', () => request.destroy());
    req.pipe(request);
  };
}

module.exports = { createDevApiProxy };
