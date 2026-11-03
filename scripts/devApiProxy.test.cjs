const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { createDevApiProxy } = require('./devApiProxy.cjs');

async function listen(t, handler) {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return `http://127.0.0.1:${server.address().port}`;
}

test('web login forwards credentials and auth headers without forwarding the browser Origin', async (t) => {
  const upstream = await listen(t, async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    assert.equal(req.url, '/api/v1/auth/sign-in');
    assert.equal(req.method, 'POST');
    assert.equal(req.headers.origin, undefined);
    assert.equal(req.headers['user-agent'], 'Mozilla/5.0');
    assert.deepEqual(JSON.parse(body), { username: 'fixture', password: 'fixture-only' });
    res.writeHead(200, {
      Authorization: 'Bearer fixture-access',
      'Set-Cookie': 'refreshToken=fixture-refresh; Domain=example.test; HttpOnly; Path=/',
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({ code: 'OK' }));
  });
  const proxy = await listen(t, createDevApiProxy((req, res, next) => next(), upstream));
  const response = await fetch(`${proxy}/api/v1/auth/sign-in`, {
    method: 'POST', headers: { Origin: proxy, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'fixture', password: 'fixture-only' }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('authorization'), 'Bearer fixture-access');
  assert.equal(response.headers.get('x-refresh-token'), 'fixture-refresh');
  assert.equal(response.headers.get('set-cookie'), 'refreshToken=fixture-refresh; HttpOnly; Path=/');
  assert.deepEqual(await response.json(), { code: 'OK' });
});

test('non-API routes retain the middleware continuation used by Expo Router', () => {
  const done = () => {};
  let called = false;
  createDevApiProxy((req, res, next) => {
    called = true;
    assert.equal(next, done);
    next();
  })({ url: '/login?redirect=%2Fhive-control' }, {}, done);
  assert.equal(called, true);
});

test('SSE data arrives before the upstream response closes', async (t) => {
  let finish;
  const upstream = await listen(t, (req, res) => {
    assert.equal(req.headers.authorization, 'Bearer fixture-access');
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write('event: ready\ndata: {}\n\n');
    finish = () => res.end('event: done\ndata: {}\n\n');
  });
  const proxy = await listen(t, createDevApiProxy(() => {}, upstream));
  const response = await fetch(`${proxy}/api/v1/sse/subscribe`, { headers: { Authorization: 'Bearer fixture-access' } });
  const reader = response.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: ready/);
  finish();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: done/);
  await reader.cancel();
});
