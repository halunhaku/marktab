import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildAuthorizationUrl,
  parseOAuthCallback,
  runAuthorization,
  storeRefreshToken,
} from './cws-auth.mjs';

const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const completeEnv = {
  CWS_CLIENT_ID: 'client-id-sensitive',
  CWS_CLIENT_SECRET: 'client-secret-sensitive',
};

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), init);
}

function fakeGh({ closeCode = 0, error } = {}) {
  const calls = [];
  const runGh = (command, args, options) => {
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    let stdin = '';
    child.stdin.setEncoding('utf8');
    child.stdin.on('data', (chunk) => { stdin += chunk; });
    calls.push({ command, args, options, get stdin() { return stdin; } });
    queueMicrotask(() => {
      if (error) child.emit('error', error);
      else child.emit('close', closeCode);
    });
    return child;
  };
  return { calls, runGh };
}

test('buildAuthorizationUrl includes the exact OAuth fields', () => {
  const result = new URL(buildAuthorizationUrl({
    clientId: 'client id',
    redirectUri: 'http://127.0.0.1:43210/callback',
    state: 'random-state',
  }));

  assert.equal(result.origin + result.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.deepEqual(Object.fromEntries(result.searchParams), {
    response_type: 'code',
    client_id: 'client id',
    redirect_uri: 'http://127.0.0.1:43210/callback',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: 'random-state',
  });
});

test('parseOAuthCallback returns the authorization code', () => {
  assert.equal(
    parseOAuthCallback('http://127.0.0.1:1234/callback?state=expected&code=authorization-code', 'expected'),
    'authorization-code',
  );
});

test('parseOAuthCallback validates state before honoring an OAuth error', () => {
  assert.throws(
    () => parseOAuthCallback('http://127.0.0.1:1234/callback?error=access_denied', 'expected'),
    /state mismatch/i,
  );
});

for (const [name, url, pattern] of [
  ['wrong path', 'http://127.0.0.1:1234/not-callback?state=expected&code=private-code', /callback path/i],
  ['OAuth error', 'http://127.0.0.1:1234/callback?error=access_denied&error_description=private-code&state=expected', /authorization was denied/i],
  ['state mismatch', 'http://127.0.0.1:1234/callback?state=wrong&code=private-code', /state mismatch/i],
  ['missing code', 'http://127.0.0.1:1234/callback?state=expected', /missing authorization code/i],
]) {
  test(`parseOAuthCallback rejects ${name} without leaking callback values`, () => {
    assert.throws(
      () => parseOAuthCallback(url, 'expected'),
      (error) => {
        assert.match(error.message, pattern);
        assert.doesNotMatch(error.message, /private-code|access_denied|wrong/);
        return true;
      },
    );
  });
}

test('storeRefreshToken sends the token only through gh stdin', async () => {
  const token = 'refresh-token-sensitive';
  const gh = fakeGh();

  await storeRefreshToken(token, { runGh: gh.runGh });

  assert.equal(gh.calls.length, 1);
  assert.equal(gh.calls[0].command, 'gh');
  assert.deepEqual(gh.calls[0].args, ['secret', 'set', 'CWS_REFRESH_TOKEN']);
  assert.equal(gh.calls[0].options.shell, false);
  assert.equal(gh.calls[0].stdin, token);
  assert.equal(JSON.stringify(gh.calls[0].args).includes(token), false);
});

test('storeRefreshToken propagates a failed gh child safely', async () => {
  const token = 'refresh-token-sensitive';
  const gh = fakeGh({ closeCode: 2 });

  await assert.rejects(
    storeRefreshToken(token, { runGh: gh.runGh }),
    (error) => {
      assert.match(error.message, /GitHub CLI.*failed/i);
      assert.doesNotMatch(error.message, new RegExp(token));
      return true;
    },
  );
});

test('runAuthorization validates local OAuth environment in order', async () => {
  await assert.rejects(runAuthorization({ env: {} }), new Error('Missing CWS_CLIENT_ID.'));
  await assert.rejects(
    runAuthorization({ env: { CWS_CLIENT_ID: 'client' } }),
    new Error('Missing CWS_CLIENT_SECRET.'),
  );
  await assert.rejects(
    runAuthorization({ env: { ...completeEnv, CWS_CLIENT_ID: '   ' } }),
    new Error('Missing CWS_CLIENT_ID.'),
  );
});

test('runAuthorization completes a live loopback callback and keeps credentials in their intended channels', async () => {
  const startedAt = Date.now();
  let launchedUrl;
  let tokenRequest;
  const saved = [];

  await runAuthorization({
    env: completeEnv,
    launch: async (authorizationUrl) => {
      launchedUrl = new URL(authorizationUrl);
      assert.equal(launchedUrl.hostname, 'accounts.google.com');
      const redirectUri = new URL(launchedUrl.searchParams.get('redirect_uri'));
      assert.equal(redirectUri.hostname, '127.0.0.1');
      assert.equal(redirectUri.pathname, '/callback');
      const response = await fetch(`${redirectUri}?state=${encodeURIComponent(launchedUrl.searchParams.get('state'))}&code=one-time-code`);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /authorization complete/i);
    },
    fetchImpl: async (...args) => {
      tokenRequest = args;
      return jsonResponse({ refresh_token: 'new-refresh-token' });
    },
    save: async (token) => saved.push(token),
    timeoutMs: 2_000,
  });

  assert.equal(launchedUrl.searchParams.get('client_id'), completeEnv.CWS_CLIENT_ID);
  assert.equal(launchedUrl.searchParams.get('scope'), SCOPE);
  assert.ok(launchedUrl.searchParams.get('state').length >= 32);
  assert.equal(tokenRequest[0], 'https://oauth2.googleapis.com/token');
  assert.equal(tokenRequest[1].method, 'POST');
  assert.equal(tokenRequest[1].headers['content-type'], 'application/x-www-form-urlencoded');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(tokenRequest[1].body)), {
    client_id: completeEnv.CWS_CLIENT_ID,
    client_secret: completeEnv.CWS_CLIENT_SECRET,
    code: 'one-time-code',
    redirect_uri: launchedUrl.searchParams.get('redirect_uri'),
    grant_type: 'authorization_code',
  });
  assert.deepEqual(saved, ['new-refresh-token']);
  assert.ok(Date.now() - startedAt < 500, 'successful keep-alive cleanup should settle promptly');

  await assert.rejects(fetch(launchedUrl.searchParams.get('redirect_uri')));
});

test('runAuthorization times out safely and closes the loopback server', async () => {
  let redirectUri;
  await assert.rejects(
    runAuthorization({
      env: completeEnv,
      launch: async (authorizationUrl) => {
        redirectUri = new URL(authorizationUrl).searchParams.get('redirect_uri');
      },
      fetchImpl: async () => { throw new Error('must not exchange'); },
      save: async () => { throw new Error('must not save'); },
      timeoutMs: 20,
    }),
    /timed out/i,
  );
  await assert.rejects(fetch(redirectUri));
});

test('runAuthorization observes a terminal callback while the browser launcher is still pending', async () => {
  const startedAt = Date.now();
  await assert.rejects(
    runAuthorization({
      env: completeEnv,
      launch: async (authorizationUrl) => {
        const url = new URL(authorizationUrl);
        const redirectUri = url.searchParams.get('redirect_uri');
        const state = url.searchParams.get('state');
        const response = await fetch(`${redirectUri}?state=${encodeURIComponent(state)}&error=access_denied`);
        assert.equal(response.status, 400);
        await new Promise(() => {});
      },
      fetchImpl: async () => { throw new Error('must not exchange'); },
      save: async () => { throw new Error('must not save'); },
      timeoutMs: 1_000,
    }),
    /authorization was denied/i,
  );
  assert.ok(Date.now() - startedAt < 500, 'terminal callback should beat the timeout');
});

for (const [name, expectedStatus, sendProbe] of [
  ['wrong path', 404, (redirectUri, state) => fetch(`${new URL(redirectUri).origin}/probe?state=${encodeURIComponent(state)}`)],
  ['wrong state', 400, (redirectUri) => fetch(`${redirectUri}?state=wrong-state&code=probe-code`)],
  ['state-less OAuth error', 400, (redirectUri) => fetch(`${redirectUri}?error=access_denied`)],
  ['wrong method', 404, (redirectUri, state) => fetch(`${redirectUri}?state=${encodeURIComponent(state)}&code=probe-code`, { method: 'POST' })],
]) {
  test(`runAuthorization ignores a nonterminal ${name} probe before a valid callback`, async () => {
    let exchangedCode;
    const saved = [];
    await runAuthorization({
      env: completeEnv,
      launch: async (authorizationUrl) => {
        const url = new URL(authorizationUrl);
        const redirectUri = url.searchParams.get('redirect_uri');
        const state = url.searchParams.get('state');
        const probeResponse = await sendProbe(redirectUri, state);
        assert.equal(probeResponse.status, expectedStatus);
        assert.ok((await probeResponse.text()).length < 100);
        const validResponse = await fetch(`${redirectUri}?state=${encodeURIComponent(state)}&code=genuine-code`);
        assert.equal(validResponse.status, 200);
        await validResponse.text();
      },
      fetchImpl: async (_url, init) => {
        exchangedCode = new URLSearchParams(init.body).get('code');
        return jsonResponse({ refresh_token: 'fresh-token' });
      },
      save: async (token) => saved.push(token),
      timeoutMs: 2_000,
    });

    assert.equal(exchangedCode, 'genuine-code');
    assert.deepEqual(saved, ['fresh-token']);
  });
}

test('runAuthorization destroys incomplete loopback sockets when timing out', async (t) => {
  let socket;
  const startedAt = Date.now();
  const authorization = runAuthorization({
    env: completeEnv,
    launch: async (authorizationUrl) => {
      const redirectUri = new URL(new URL(authorizationUrl).searchParams.get('redirect_uri'));
      socket = createConnection({ host: redirectUri.hostname, port: Number(redirectUri.port) });
      t.after(() => socket.destroy());
      await new Promise((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('error', reject);
      });
      socket.write('GET /callback HTTP/1.1\r\nHost: 127.0.0.1\r\n');
    },
    fetchImpl: async () => { throw new Error('must not exchange'); },
    save: async () => { throw new Error('must not save'); },
    timeoutMs: 25,
  });
  let guardTimer;
  const outcome = await Promise.race([
    authorization.then(
      () => ({ type: 'resolved' }),
      (error) => ({ type: 'rejected', error }),
    ),
    new Promise((resolve) => {
      guardTimer = setTimeout(() => resolve({ type: 'late' }), 250);
    }),
  ]);
  clearTimeout(guardTimer);

  if (outcome.type === 'late') {
    socket.destroy();
    await authorization.catch(() => {});
  }
  assert.equal(outcome.type, 'rejected', 'timeout cleanup must not wait for the client socket');
  assert.match(outcome.error.message, /timed out/i);
  assert.ok(Date.now() - startedAt < 250, 'socket cleanup should settle promptly');
});

test('runAuthorization normalizes secret-storage failures without leaking the refresh token', async () => {
  const refreshToken = 'refresh/token sensitive';
  await assert.rejects(
    runAuthorization({
      env: completeEnv,
      launch: async (authorizationUrl) => {
        const url = new URL(authorizationUrl);
        await fetch(`${url.searchParams.get('redirect_uri')}?state=${encodeURIComponent(url.searchParams.get('state'))}&code=short-code`);
      },
      fetchImpl: async () => jsonResponse({ refresh_token: refreshToken }),
      save: async () => { throw new Error(`failed for ${encodeURIComponent(refreshToken)}`); },
      timeoutMs: 2_000,
    }),
    (error) => {
      assert.match(error.message, /save.*GitHub secret/i);
      assert.doesNotMatch(error.message, /refresh|token|sensitive|%2F/);
      return true;
    },
  );
});

for (const [name, response, pattern] of [
  ['non-2xx response', jsonResponse({ error: 'private-one-time-code client-secret-sensitive' }, { status: 400 }), /HTTP 400/i],
  ['malformed JSON', new Response('private-one-time-code client-secret-sensitive', { status: 200 }), /malformed JSON/i],
  ['missing refresh token', jsonResponse({ access_token: 'private-access-token' }), /missing refresh_token/i],
]) {
  test(`runAuthorization rejects a ${name} without credential leakage`, async () => {
    const code = 'private-one-time-code';
    await assert.rejects(
      runAuthorization({
        env: completeEnv,
        launch: async (authorizationUrl) => {
          const url = new URL(authorizationUrl);
          const redirectUri = url.searchParams.get('redirect_uri');
          await fetch(`${redirectUri}?state=${encodeURIComponent(url.searchParams.get('state'))}&code=${code}`);
        },
        fetchImpl: async () => response,
        save: async () => { throw new Error('must not save'); },
        timeoutMs: 2_000,
      }),
      (error) => {
        assert.match(error.message, pattern);
        for (const secret of [...Object.values(completeEnv), code, 'private-access-token']) {
          assert.equal(error.message.includes(secret), false);
        }
        return true;
      },
    );
  });
}

test('importing cws-auth does not run the CLI', async () => {
  const scriptUrl = new URL('./cws-auth.mjs', import.meta.url);
  const imported = await import(`${scriptUrl.href}?import-guard=${Date.now()}`);
  assert.equal(typeof imported.runAuthorization, 'function');
});

test('direct CLI reports a safe error and exits 1', async () => {
  const scriptPath = fileURLToPath(new URL('./cws-auth.mjs', import.meta.url));
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      env: { ...process.env, CWS_CLIENT_ID: '', CWS_CLIENT_SECRET: 'must-not-print' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });

  assert.equal(result.code, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'Missing CWS_CLIENT_ID.\n');
  assert.doesNotMatch(result.stderr, /must-not-print/);
});
