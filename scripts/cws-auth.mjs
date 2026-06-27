import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHROME_WEB_STORE_SCOPE = 'https://www.googleapis.com/auth/chromewebstore';

function redact(value, secrets) {
  let message = String(value?.message ?? value);
  const normalized = [...new Set(secrets.filter(Boolean).map(String))]
    .sort((left, right) => right.length - left.length);
  for (const secret of normalized) message = message.replaceAll(secret, '***');
  return message;
}

export function buildAuthorizationUrl({ clientId, redirectUri, state }) {
  const url = new URL(AUTHORIZATION_URL);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: CHROME_WEB_STORE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return url.href;
}

export function parseOAuthCallback(callbackUrl, expectedState) {
  const url = new URL(callbackUrl);
  if (url.pathname !== '/callback') throw new Error('Unexpected OAuth callback path.');
  if (url.searchParams.get('state') !== expectedState) throw new Error('OAuth state mismatch.');
  if (url.searchParams.has('error')) throw new Error('OAuth authorization was denied.');
  const code = url.searchParams.get('code');
  if (!code) throw new Error('OAuth callback is missing authorization code.');
  return code;
}

function defaultRunGh(command, args, options) {
  return spawn(command, args, options);
}

export function storeRefreshToken(token, { runGh = defaultRunGh } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };

    let child;
    try {
      child = runGh('gh', ['secret', 'set', 'CWS_REFRESH_TOKEN'], {
        stdio: ['pipe', 'ignore', 'ignore'],
        windowsHide: true,
        shell: false,
      });
    } catch {
      finish(new Error('GitHub CLI secret storage failed.'));
      return;
    }

    child.once('error', () => finish(new Error('GitHub CLI secret storage failed.')));
    child.once('close', (code) => {
      if (code === 0) finish();
      else finish(new Error('GitHub CLI secret storage failed.'));
    });
    child.stdin.once('error', () => finish(new Error('GitHub CLI secret storage failed.')));
    child.stdin.end(token);
  });
}

export function openBrowser(url, { platform = process.platform, run = execFile } = {}) {
  const launchers = {
    win32: ['rundll32.exe', ['url.dll,FileProtocolHandler', url]],
    darwin: ['open', [url]],
    linux: ['xdg-open', [url]],
  };
  const launcher = launchers[platform];
  if (!launcher) return Promise.reject(new Error('Unsupported platform for browser launch.'));

  return new Promise((resolve, reject) => {
    run(launcher[0], launcher[1], { windowsHide: true, shell: false }, (error) => {
      if (error) reject(new Error('Unable to launch the browser.'));
      else resolve();
    });
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}

function plainText(response, statusCode, text) {
  response.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(text);
}

async function exchangeAuthorizationCode({
  clientId,
  clientSecret,
  code,
  redirectUri,
  fetchImpl,
}) {
  let response;
  try {
    response = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
  } catch {
    throw new Error('OAuth token exchange request failed.');
  }

  if (!response.ok) throw new Error(`OAuth token exchange failed (HTTP ${response.status}).`);

  let data;
  try {
    data = JSON.parse(await response.text());
  } catch {
    throw new Error('OAuth token exchange failed: malformed JSON.');
  }
  if (!data?.refresh_token) throw new Error('OAuth token exchange failed: missing refresh_token.');
  return data.refresh_token;
}

export async function runAuthorization({
  env = process.env,
  fetchImpl = fetch,
  launch = openBrowser,
  save = storeRefreshToken,
  timeoutMs = 300_000,
} = {}) {
  if (!String(env.CWS_CLIENT_ID ?? '').trim()) throw new Error('Missing CWS_CLIENT_ID.');
  if (!String(env.CWS_CLIENT_SECRET ?? '').trim()) throw new Error('Missing CWS_CLIENT_SECRET.');

  const clientId = env.CWS_CLIENT_ID;
  const clientSecret = env.CWS_CLIENT_SECRET;
  const state = randomBytes(32).toString('hex');
  let code;
  let refreshToken;
  let timer;
  let callbackSettled = false;
  let resolveCallback;
  let rejectCallback;
  const sockets = new Set();
  const callback = new Promise((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  const server = createServer((request, response) => {
    if (callbackSettled) {
      plainText(response, 409, 'OAuth callback was already received.');
      return;
    }

    let callbackUrl;
    try {
      callbackUrl = new URL(request.url, 'http://127.0.0.1');
    } catch {
      plainText(response, 404, 'Not found.');
      return;
    }
    if (request.method !== 'GET' || callbackUrl.pathname !== '/callback') {
      plainText(response, 404, 'Not found.');
      return;
    }
    if (callbackUrl.searchParams.get('state') !== state) {
      plainText(response, 400, 'Invalid OAuth state.');
      return;
    }

    try {
      code = parseOAuthCallback(callbackUrl.href, state);
      callbackSettled = true;
      plainText(response, 200, 'Authorization complete. You can close this tab.');
      resolveCallback(code);
    } catch (error) {
      callbackSettled = true;
      plainText(response, 400, 'Authorization failed. Return to the terminal.');
      rejectCallback(error);
    }
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });

  try {
    await listen(server);
    const address = server.address();
    const redirectUri = `http://127.0.0.1:${address.port}/callback`;
    const authorizationUrl = buildAuthorizationUrl({ clientId, redirectUri, state });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('OAuth authorization timed out.')), timeoutMs);
    });

    code = await Promise.race([
      Promise.all([launch(authorizationUrl), callback]).then(([, callbackCode]) => callbackCode),
      timeout,
    ]);
    refreshToken = await exchangeAuthorizationCode({
      clientId,
      clientSecret,
      code,
      redirectUri,
      fetchImpl,
    });
    try {
      await save(refreshToken);
    } catch {
      throw new Error('Unable to save Chrome Web Store credential as GitHub secret.');
    }
    console.log('Chrome Web Store refresh token saved as GitHub secret CWS_REFRESH_TOKEN.');
  } catch (error) {
    throw new Error(redact(error, [clientId, clientSecret, state, code, refreshToken]));
  } finally {
    if (timer) clearTimeout(timer);
    for (const socket of sockets) socket.destroy();
    await close(server);
  }
}

const isDirectRun = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  runAuthorization().catch((error) => {
    console.error(error?.message ?? 'Chrome Web Store authorization failed.');
    process.exitCode = 1;
  });
}
