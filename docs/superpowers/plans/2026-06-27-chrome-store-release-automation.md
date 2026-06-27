# Chrome Web Store Release Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a validated MarkTab tag as a draft-first GitHub Release and submit the same ZIP to the existing Chrome Web Store item for public review.

**Architecture:** GitHub Actions orchestrates existing quality gates, deterministic packaging, GitHub Release creation, and a repository-owned Node.js Chrome Web Store client. Small modules separate version validation, HTTP API behavior, publication orchestration, and one-time OAuth bootstrap so every boundary can be tested with Node's built-in test runner and mocked dependencies.

**Tech Stack:** GitHub Actions, Node.js 18+ ESM, built-in `node:test`, built-in `fetch`, Chrome Web Store Publish API, OAuth 2.0, GitHub CLI.

---

## File Map

- Create `.github/workflows/release.yml`: tag/manual release orchestration.
- Create `scripts/release-version.mjs`: validate and return the canonical tag/package/manifest version.
- Create `scripts/release-version.test.mjs`: version-contract tests using temporary files.
- Create `scripts/cws-api.mjs`: OAuth, upload, status polling, and publish HTTP client.
- Create `scripts/cws-api.test.mjs`: mocked HTTP and polling tests.
- Create `scripts/cws-publish.mjs`: environment/artifact validation and publication command.
- Create `scripts/cws-publish.test.mjs`: orchestration, redaction, and missing-input tests.
- Create `scripts/cws-auth.mjs`: loopback OAuth bootstrap and direct GitHub secret storage.
- Create `scripts/cws-auth.test.mjs`: authorization URL, state, and secret-piping tests.
- Create `scripts/release-workflow.test.mjs`: static workflow security and ordering contract.
- Modify `package.json`: register the new tests and local release commands.
- Modify `README.md`: document normal release usage.
- Modify `CHROME_STORE_SUBMISSION.md`: document one-time setup, automation, retry, and review monitoring.

### Task 1: Add A Testable Release Version Contract

**Files:**
- Create: `scripts/release-version.test.mjs`
- Create: `scripts/release-version.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing version-contract tests**

Create `scripts/release-version.test.mjs`:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateReleaseVersion } from './release-version.mjs';

async function fixture(packageVersion = '1.4.2', manifestVersion = packageVersion) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'marktab-version-'));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ version: packageVersion }));
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify({ version: manifestVersion }));
  return root;
}

test('returns the version when tag, package, and manifest agree', async () => {
  assert.equal(await validateReleaseVersion({ root: await fixture(), tag: 'v1.4.2' }), '1.4.2');
});

test('rejects malformed tags', async () => {
  await assert.rejects(
    validateReleaseVersion({ root: await fixture(), tag: 'release-1.4.2' }),
    /Tag must match vX\.Y\.Z/
  );
});

test('rejects package or manifest version mismatch', async () => {
  await assert.rejects(
    validateReleaseVersion({ root: await fixture('1.4.2', '1.4.1'), tag: 'v1.4.2' }),
    /Version mismatch: tag=1\.4\.2 package=1\.4\.2 manifest=1\.4\.1/
  );
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `node --test scripts/release-version.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/release-version.mjs`.

- [ ] **Step 3: Implement the version validator and CLI**

Create `scripts/release-version.mjs`:

```js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function validateReleaseVersion({ root = process.cwd(), tag }) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag || '')) {
    throw new Error('Tag must match vX.Y.Z.');
  }
  const [pkg, manifest] = await Promise.all([
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'manifest.json'), 'utf8').then(JSON.parse)
  ]);
  const version = tag.slice(1);
  if (pkg.version !== version || manifest.version !== version) {
    throw new Error(`Version mismatch: tag=${version} package=${pkg.version} manifest=${manifest.version}`);
  }
  return version;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    console.log(await validateReleaseVersion({ tag: process.argv[2] }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
```

Add `scripts/release-version.test.mjs` to the explicit `npm test` file list in `package.json`.

- [ ] **Step 4: Run the focused and full tests**

Run: `node --test scripts/release-version.test.mjs`

Expected: 3 tests pass.

Run: `npm test`

Expected: all existing and new tests pass.

- [ ] **Step 5: Commit the version contract**

```powershell
git add -- package.json scripts/release-version.mjs scripts/release-version.test.mjs
git commit -m "test: enforce release tag version contract"
```

### Task 2: Build The Chrome Web Store HTTP Client

**Files:**
- Create: `scripts/cws-api.test.mjs`
- Create: `scripts/cws-api.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing API-client tests**

Create `scripts/cws-api.test.mjs` with a response helper and these concrete cases:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exchangeRefreshToken,
  publishItem,
  uploadItem,
  waitForUpload
} from './cws-api.mjs';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' }
});

test('exchanges a refresh token without leaking credentials into the URL', async () => {
  const calls = [];
  const token = await exchangeRefreshToken({
    clientId: 'client-id', clientSecret: 'client-secret', refreshToken: 'refresh-token',
    fetchImpl: async (url, options) => { calls.push({ url, options }); return jsonResponse({ access_token: 'access' }); }
  });
  assert.equal(token, 'access');
  assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token');
  assert.equal(calls[0].options.method, 'POST');
  assert.doesNotMatch(calls[0].url, /client-secret|refresh-token/);
});

test('uploads zip bytes with API v2 headers', async () => {
  const calls = [];
  const result = await uploadItem({
    itemId: 'item-id', accessToken: 'access', zipBytes: Buffer.from('zip'),
    fetchImpl: async (url, options) => { calls.push({ url, options }); return jsonResponse({ uploadState: 'SUCCESS' }); }
  });
  assert.equal(result.uploadState, 'SUCCESS');
  assert.match(calls[0].url, /\/upload\/chromewebstore\/v1\.1\/items\/item-id$/);
  assert.equal(calls[0].options.headers['x-goog-api-version'], '2');
  assert.equal(calls[0].options.headers.authorization, 'Bearer access');
});

test('polls IN_PROGRESS until SUCCESS', async () => {
  const states = ['IN_PROGRESS', 'SUCCESS'];
  const result = await waitForUpload({
    itemId: 'item-id', accessToken: 'access', initial: { uploadState: 'IN_PROGRESS' },
    fetchImpl: async () => jsonResponse({ uploadState: states.shift() }),
    sleep: async () => {}, maxAttempts: 3
  });
  assert.equal(result.uploadState, 'SUCCESS');
});

test('rejects terminal upload failure and bounded timeout', async () => {
  await assert.rejects(
    waitForUpload({ itemId: 'item', accessToken: 'access', initial: { uploadState: 'FAILURE' } }),
    /Upload failed/
  );
  await assert.rejects(
    waitForUpload({
      itemId: 'item', accessToken: 'access', initial: { uploadState: 'IN_PROGRESS' },
      fetchImpl: async () => jsonResponse({ uploadState: 'IN_PROGRESS' }), sleep: async () => {}, maxAttempts: 1
    }),
    /timed out/
  );
});

test('publishes to the public default target', async () => {
  const calls = [];
  await publishItem({
    itemId: 'item-id', accessToken: 'access',
    fetchImpl: async (url, options) => { calls.push({ url, options }); return jsonResponse({ status: ['OK'] }); }
  });
  assert.deepEqual(JSON.parse(calls[0].options.body), { target: 'default' });
});

test('reports API errors without authorization values', async () => {
  await assert.rejects(
    uploadItem({
      itemId: 'item', accessToken: 'never-log-this', zipBytes: Buffer.from('zip'),
      fetchImpl: async () => jsonResponse({ error: { message: 'denied never-log-this' } }, 403)
    }),
    error => /denied \*\*\*/.test(error.message) && !/never-log-this/.test(error.message)
  );
});
```

- [ ] **Step 2: Verify the API tests fail**

Run: `node --test scripts/cws-api.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/cws-api.mjs`.

- [ ] **Step 3: Implement the minimal HTTP client**

Create `scripts/cws-api.mjs` with these exported contracts:

```js
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_ROOT = 'https://www.googleapis.com/chromewebstore/v1.1/items';
const UPLOAD_ROOT = 'https://www.googleapis.com/upload/chromewebstore/v1.1/items';

async function readJson(response, action, secrets = []) {
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; }
  catch { throw new Error(`${action} returned invalid JSON (HTTP ${response.status}).`); }
  if (!response.ok) {
    let detail = String(body.error?.message || body.error || 'unknown error');
    for (const secret of secrets.filter(Boolean)) detail = detail.replaceAll(secret, '***');
    throw new Error(`${action} failed (HTTP ${response.status}): ${detail}`);
  }
  return body;
}

export async function exchangeRefreshToken({ clientId, clientSecret, refreshToken, fetchImpl = fetch }) {
  const body = new URLSearchParams({
    client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token'
  });
  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body
  });
  const data = await readJson(response, 'OAuth token exchange', [clientId, clientSecret, refreshToken]);
  if (!data.access_token) throw new Error('OAuth token exchange returned no access token.');
  return data.access_token;
}

function apiHeaders(accessToken, extra = {}) {
  return { authorization: `Bearer ${accessToken}`, 'x-goog-api-version': '2', ...extra };
}

export async function uploadItem({ itemId, accessToken, zipBytes, fetchImpl = fetch }) {
  return readJson(await fetchImpl(`${UPLOAD_ROOT}/${encodeURIComponent(itemId)}`, {
    method: 'PUT', headers: apiHeaders(accessToken, { 'content-type': 'application/zip' }), body: zipBytes
  }), 'Chrome Web Store upload', [accessToken]);
}

export async function getItemStatus({ itemId, accessToken, fetchImpl = fetch }) {
  return readJson(await fetchImpl(`${API_ROOT}/${encodeURIComponent(itemId)}?projection=DRAFT`, {
    headers: apiHeaders(accessToken)
  }), 'Chrome Web Store status', [accessToken]);
}

export async function waitForUpload({
  itemId, accessToken, initial, fetchImpl = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxAttempts = 30, intervalMs = 5000
}) {
  let state = initial;
  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    if (state.uploadState === 'SUCCESS') return state;
    if (state.uploadState === 'FAILURE' || state.uploadState === 'NOT_FOUND') {
      throw new Error(`Upload failed with state ${state.uploadState}.`);
    }
    if (state.uploadState !== 'IN_PROGRESS') throw new Error(`Unexpected upload state: ${state.uploadState || 'missing'}.`);
    if (attempt === maxAttempts) break;
    await sleep(intervalMs);
    state = await getItemStatus({ itemId, accessToken, fetchImpl });
  }
  throw new Error('Upload processing timed out.');
}

export async function publishItem({ itemId, accessToken, fetchImpl = fetch }) {
  return readJson(await fetchImpl(`${API_ROOT}/${encodeURIComponent(itemId)}/publish`, {
    method: 'POST', headers: apiHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify({ target: 'default' })
  }), 'Chrome Web Store publish', [accessToken]);
}
```

- [ ] **Step 4: Run API and full tests**

Run: `node --test scripts/cws-api.test.mjs`

Expected: all API tests pass.

Add `scripts/cws-api.test.mjs` to `npm test`, then run `npm test`.

Expected: all tests pass.

- [ ] **Step 5: Commit the API client**

```powershell
git add -- package.json scripts/cws-api.mjs scripts/cws-api.test.mjs
git commit -m "feat: add Chrome Web Store API client"
```

### Task 3: Add Publication Orchestration

**Files:**
- Create: `scripts/cws-publish.test.mjs`
- Create: `scripts/cws-publish.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing orchestration tests**

Create `scripts/cws-publish.test.mjs`:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { publishPackage } from './cws-publish.mjs';

const requiredEnv = {
  CWS_CLIENT_ID: 'id', CWS_CLIENT_SECRET: 'secret',
  CWS_REFRESH_TOKEN: 'refresh', CWS_ITEM_ID: 'item'
};

test('validates every required secret before reading the artifact', async () => {
  await assert.rejects(publishPackage({ artifactPath: 'missing.zip', env: {} }), /Missing CWS_CLIENT_ID/);
});

test('runs token, upload, poll, and publish in order', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'marktab-publish-'));
  const artifactPath = path.join(root, 'marktab.zip');
  await writeFile(artifactPath, 'zip');
  const calls = [];
  const api = {
    exchangeRefreshToken: async () => { calls.push('token'); return 'access'; },
    uploadItem: async () => { calls.push('upload'); return { uploadState: 'IN_PROGRESS' }; },
    waitForUpload: async () => { calls.push('poll'); return { uploadState: 'SUCCESS' }; },
    publishItem: async () => { calls.push('publish'); return { status: ['OK'] }; }
  };
  await publishPackage({ artifactPath, env: requiredEnv, api, log: () => {} });
  assert.deepEqual(calls, ['token', 'upload', 'poll', 'publish']);
});
```

- [ ] **Step 2: Verify orchestration tests fail**

Run: `node --test scripts/cws-publish.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement publication orchestration and CLI**

Create `scripts/cws-publish.mjs`:

```js
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as defaultApi from './cws-api.mjs';

const names = ['CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN', 'CWS_ITEM_ID'];

export async function publishPackage({ artifactPath, env = process.env, api = defaultApi, log = console.log }) {
  for (const name of names) if (!env[name]) throw new Error(`Missing ${name}.`);
  if (!artifactPath) throw new Error('Artifact path is required.');
  await access(artifactPath);
  const zipBytes = await readFile(artifactPath);
  const accessToken = await api.exchangeRefreshToken({
    clientId: env.CWS_CLIENT_ID, clientSecret: env.CWS_CLIENT_SECRET, refreshToken: env.CWS_REFRESH_TOKEN
  });
  log('OAuth token acquired.');
  const initial = await api.uploadItem({ itemId: env.CWS_ITEM_ID, accessToken, zipBytes });
  log(`Upload state: ${initial.uploadState}.`);
  await api.waitForUpload({ itemId: env.CWS_ITEM_ID, accessToken, initial });
  const result = await api.publishItem({ itemId: env.CWS_ITEM_ID, accessToken });
  log('Chrome Web Store public review requested.');
  return result;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { await publishPackage({ artifactPath: process.argv[2] }); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
```

Add `"cws:publish": "node scripts/cws-publish.mjs"` and the test file to `package.json`.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test scripts/cws-publish.test.mjs`

Expected: 2 tests pass.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit publication orchestration**

```powershell
git add -- package.json scripts/cws-publish.mjs scripts/cws-publish.test.mjs
git commit -m "feat: orchestrate Chrome Web Store publication"
```

### Task 4: Add The Local OAuth Bootstrap Helper

**Files:**
- Create: `scripts/cws-auth.test.mjs`
- Create: `scripts/cws-auth.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for authorization safety**

Create `scripts/cws-auth.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAuthorizationUrl, parseOAuthCallback, storeRefreshToken } from './cws-auth.mjs';

test('authorization URL requests offline Chrome Web Store access and carries state', () => {
  const url = new URL(buildAuthorizationUrl({
    clientId: 'client', redirectUri: 'http://127.0.0.1:4321/callback', state: 'csrf'
  }));
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('prompt'), 'consent');
  assert.equal(url.searchParams.get('state'), 'csrf');
  assert.equal(url.searchParams.get('scope'), 'https://www.googleapis.com/auth/chromewebstore');
});

test('callback parser rejects a mismatched state before returning the code', () => {
  assert.throws(
    () => parseOAuthCallback('http://127.0.0.1:4321/callback?code=abc&state=wrong', 'expected'),
    /state mismatch/
  );
  assert.equal(
    parseOAuthCallback('http://127.0.0.1:4321/callback?code=abc&state=expected', 'expected'),
    'abc'
  );
});

test('pipes the refresh token to gh stdin instead of command arguments', async () => {
  const calls = [];
  await storeRefreshToken('refresh-secret', {
    runGh: async (args, stdin) => calls.push({ args, stdin })
  });
  assert.deepEqual(calls, [{ args: ['secret', 'set', 'CWS_REFRESH_TOKEN'], stdin: 'refresh-secret' }]);
  assert.doesNotMatch(calls[0].args.join(' '), /refresh-secret/);
});
```

- [ ] **Step 2: Verify the helper tests fail**

Run: `node --test scripts/cws-auth.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement loopback authorization**

Create `scripts/cws-auth.mjs` with these exact public boundaries:

```js
import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const scope = 'https://www.googleapis.com/auth/chromewebstore';

export function buildAuthorizationUrl({ clientId, redirectUri, state }) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
    scope, access_type: 'offline', prompt: 'consent', state
  });
  return url.toString();
}

export function parseOAuthCallback(callbackUrl, expectedState) {
  const url = new URL(callbackUrl);
  if (url.pathname !== '/callback') throw new Error('Unexpected OAuth callback path.');
  if (url.searchParams.get('error')) throw new Error(`OAuth authorization failed: ${url.searchParams.get('error')}.`);
  if (url.searchParams.get('state') !== expectedState) throw new Error('OAuth state mismatch.');
  const code = url.searchParams.get('code');
  if (!code) throw new Error('OAuth callback did not include a code.');
  return code;
}

export async function storeRefreshToken(token, { runGh = defaultRunGh } = {}) {
  await runGh(['secret', 'set', 'CWS_REFRESH_TOKEN'], token);
}

async function defaultRunGh(args, stdin) {
  await new Promise((resolve, reject) => {
    const child = spawn('gh', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`gh exited with ${code}`)));
    child.stdin.end(stdin);
  });
}

function openBrowser(url) {
  if (process.platform === 'win32') return execFileAsync('rundll32.exe', ['url.dll,FileProtocolHandler', url], { windowsHide: true });
  if (process.platform === 'darwin') return execFileAsync('open', [url]);
  return execFileAsync('xdg-open', [url]);
}

export async function runAuthorization({
  env = process.env, fetchImpl = fetch, launch = openBrowser, save = storeRefreshToken
} = {}) {
  const clientId = env.CWS_CLIENT_ID;
  const clientSecret = env.CWS_CLIENT_SECRET;
  if (!clientId) throw new Error('Missing local CWS_CLIENT_ID.');
  if (!clientSecret) throw new Error('Missing local CWS_CLIENT_SECRET.');

  const state = randomBytes(32).toString('hex');
  let resolveCallback;
  let rejectCallback;
  const callback = new Promise((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });
  const server = http.createServer((request, response) => {
    try {
      const callbackUrl = new URL(request.url, `http://${request.headers.host}`);
      const code = parseOAuthCallback(callbackUrl, state);
      response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Authorization complete. You can close this tab.');
      resolveCallback(code);
    } catch (error) {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Authorization failed. Return to the terminal.');
      rejectCallback(error);
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
  const timeout = setTimeout(() => rejectCallback(new Error('OAuth authorization timed out.')), 300_000);

  try {
    await launch(buildAuthorizationUrl({ clientId, redirectUri, state }));
    const code = await callback;
    const response = await fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret, code,
        redirect_uri: redirectUri, grant_type: 'authorization_code'
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`OAuth code exchange failed (HTTP ${response.status}).`);
    if (!data.refresh_token) throw new Error('OAuth code exchange returned no refresh token.');
    await save(data.refresh_token);
    console.log('CWS_REFRESH_TOKEN saved to GitHub Actions secrets.');
  } finally {
    clearTimeout(timeout);
    await new Promise(resolve => server.close(resolve));
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { await runAuthorization(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
```

Add `"cws:auth": "node scripts/cws-auth.mjs"` plus the test file to `package.json`.

- [ ] **Step 4: Run helper and full tests**

Run: `node --test scripts/cws-auth.test.mjs`

Expected: 3 tests pass.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit OAuth bootstrap**

```powershell
git add -- package.json scripts/cws-auth.mjs scripts/cws-auth.test.mjs
git commit -m "feat: add Chrome Web Store OAuth bootstrap"
```

### Task 5: Define The Workflow Contract Before The Workflow

**Files:**
- Create: `scripts/release-workflow.test.mjs`
- Create: `.github/workflows/release.yml`
- Modify: `package.json`

- [ ] **Step 1: Write the failing static workflow test**

Create `scripts/release-workflow.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowPath = new URL('../.github/workflows/release.yml', import.meta.url);

test('release workflow is tag/manual only, serialized, and minimally privileged', async () => {
  const yaml = await readFile(workflowPath, 'utf8');
  assert.match(yaml, /tags:\s*\['v\*'\]/);
  assert.match(yaml, /workflow_dispatch:/);
  assert.match(yaml, /contents:\s*write/);
  assert.match(yaml, /group:\s*chrome-web-store-release/);
  assert.match(yaml, /cancel-in-progress:\s*false/);
  assert.doesNotMatch(yaml, /pull_request:/);
});

test('quality gates and draft release precede store publication and release publication', async () => {
  const yaml = await readFile(workflowPath, 'utf8');
  const ordered = [
    'npm test', 'npm run validate', 'npm run package', 'gh release create',
    'npm run cws:publish', 'gh release edit'
  ].map(token => yaml.indexOf(token));
  assert.ok(ordered.every(index => index >= 0));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b));
  for (const secret of ['CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN', 'CWS_ITEM_ID']) {
    assert.match(yaml, new RegExp(`secrets\\.${secret}`));
  }
});
```

- [ ] **Step 2: Verify the workflow test fails**

Run: `node --test scripts/release-workflow.test.mjs`

Expected: FAIL with `ENOENT` for `.github/workflows/release.yml`.

- [ ] **Step 3: Create the release workflow**

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      tag:
        description: Existing vX.Y.Z tag to retry
        required: true
        type: string

permissions:
  contents: write

concurrency:
  group: chrome-web-store-release
  cancel-in-progress: false

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Resolve release tag
        id: release
        shell: bash
        env:
          REQUESTED_TAG: ${{ github.event_name == 'workflow_dispatch' && inputs.tag || github.ref_name }}
        run: |
          if [[ ! "$REQUESTED_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Tag must match vX.Y.Z." >&2
            exit 1
          fi
          echo "tag=$REQUESTED_TAG" >> "$GITHUB_OUTPUT"
          echo "version=${REQUESTED_TAG#v}" >> "$GITHUB_OUTPUT"

      - uses: actions/checkout@v4
        with:
          ref: ${{ steps.release.outputs.tag }}
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Validate release version
        run: node scripts/release-version.mjs "${{ steps.release.outputs.tag }}"

      - name: Test
        run: npm test

      - name: Validate extension
        run: npm run validate

      - name: Package extension
        run: npm run package

      - name: Create draft GitHub Release and upload ZIP
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ steps.release.outputs.tag }}
          VERSION: ${{ steps.release.outputs.version }}
        run: |
          gh release view "$TAG" >/dev/null 2>&1 || gh release create "$TAG" --draft --verify-tag --title "MarkTab $TAG" --notes "Automated release for $TAG."
          gh release upload "$TAG" "dist/marktab-$VERSION.zip" --clobber

      - name: Submit Chrome Web Store public review
        env:
          CWS_CLIENT_ID: ${{ secrets.CWS_CLIENT_ID }}
          CWS_CLIENT_SECRET: ${{ secrets.CWS_CLIENT_SECRET }}
          CWS_REFRESH_TOKEN: ${{ secrets.CWS_REFRESH_TOKEN }}
          CWS_ITEM_ID: ${{ secrets.CWS_ITEM_ID }}
        run: npm run cws:publish -- "dist/marktab-${{ steps.release.outputs.version }}.zip"

      - name: Publish GitHub Release
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ steps.release.outputs.tag }}
        run: gh release edit "$TAG" --draft=false

      - name: Summarize failure
        if: failure()
        run: echo "Release stopped. Any GitHub Release remains a draft; inspect the failed step and Chrome Web Store dashboard before retrying." >> "$GITHUB_STEP_SUMMARY"
```

- [ ] **Step 4: Run workflow and full tests**

Add `scripts/release-workflow.test.mjs` to `npm test`.

Run: `node --test scripts/release-workflow.test.mjs`

Expected: 2 tests pass.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit the workflow**

```powershell
git add -- package.json scripts/release-workflow.test.mjs .github/workflows/release.yml
git commit -m "ci: automate tagged extension releases"
```

### Task 6: Document Setup, Normal Releases, And Recovery

**Files:**
- Modify: `README.md`
- Modify: `CHROME_STORE_SUBMISSION.md`

- [ ] **Step 1: Add the maintainer release flow to README**

Add a concise `## Automated releases` section that includes these commands and states that the tag must be pushed only after the version-bump commit is on the release branch:

```powershell
npm run bump -- 1.4.2
npm test
npm run validate
npm run package
git add -- package.json manifest.json README.md CHROME_STORE_SUBMISSION.md popup.html cloudflare/marktab-home-worker.js
git commit -m "chore: release v1.4.2"
git tag v1.4.2
git push origin HEAD
git push origin v1.4.2
```

Explain that the tag workflow creates the ZIP, keeps the GitHub Release in draft state, requests Chrome Web Store public review, and publishes the GitHub Release only after API acceptance.

- [ ] **Step 2: Add one-time setup and retry instructions to the store guide**

Add an `## Automated Chrome Web Store Publishing` section to `CHROME_STORE_SUBMISSION.md` containing:

```powershell
gh secret set CWS_CLIENT_ID
gh secret set CWS_CLIENT_SECRET
gh secret set CWS_ITEM_ID
$env:CWS_CLIENT_ID = Read-Host 'Desktop OAuth client ID'
$secureSecret = Read-Host 'Rotated desktop OAuth client secret' -AsSecureString
$env:CWS_CLIENT_SECRET = [System.Net.NetworkCredential]::new('', $secureSecret).Password
npm run cws:auth
```

State explicitly:

- Chrome Web Store API must be enabled in the OAuth client's Google Cloud project.
- `npm run cws:auth` opens a browser and writes `CWS_REFRESH_TOKEN` directly through authenticated GitHub CLI.
- Credential values must never be committed or pasted into issues, pull requests, logs, or chat.
- A previously exposed client secret must be rotated before setup.
- Manual retry is GitHub Actions → Release → Run workflow → enter the existing `vX.Y.Z` tag.
- A failed run leaves the GitHub Release as a draft; ambiguous store state requires inspection in the Developer Dashboard.
- Store review approval/rejection remains asynchronous and must be monitored manually.

- [ ] **Step 3: Verify documentation and validation**

Run: `rg -n "CWS_(CLIENT_ID|CLIENT_SECRET|REFRESH_TOKEN|ITEM_ID)|workflow_dispatch|npm run cws:auth" README.md CHROME_STORE_SUBMISSION.md`

Expected: setup, release, and retry references are present, with no real credential values.

Run: `npm run validate`

Expected: `Release validation passed.`

- [ ] **Step 4: Commit documentation**

```powershell
git add -- README.md CHROME_STORE_SUBMISSION.md
git commit -m "docs: explain automated store releases"
```

### Task 7: Perform Final Verification And Review

**Files:**
- Verify all files changed by Tasks 1-6.

- [ ] **Step 1: Scan for accidental credentials and unsafe workflow triggers**

Run:

```powershell
rg -n "GOCSPX-|gho_|access_token|refresh-secret|client-secret" . --glob '!docs/superpowers/plans/**' --glob '!scripts/*.test.mjs'
rg -n "pull_request|permissions:|contents:|concurrency:" .github/workflows/release.yml
```

Expected: no real credential-shaped values; no `pull_request` trigger; only `contents: write`; concurrency is present.

- [ ] **Step 2: Run the complete automated gate**

Run: `npm test`

Expected: every test passes, including API, publisher, OAuth, version, workflow, layout, and packaging tests.

Run: `npm run validate`

Expected: `Release validation passed.`

Run: `npm run package`

Expected: validation passes and the ZIP matching `package.json` version is created in `dist`.

- [ ] **Step 3: Inspect the packaged extension boundary**

Run on Windows:

```powershell
$zip = Get-ChildItem -LiteralPath dist -Filter 'marktab-*.zip' | Select-Object -First 1
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zip.FullName)
try { $archive.Entries.FullName | Sort-Object } finally { $archive.Dispose() }
```

Expected: only manifest, HTML, CSS, runtime JS, icons, and locale files are present; no workflow, release scripts, tests, secrets, or docs are packaged.

- [ ] **Step 4: Review the branch diff**

Run:

```powershell
git diff --check codex/newtab-ui-layout...HEAD
git diff --stat codex/newtab-ui-layout...HEAD
git status --short --branch
```

Expected: no whitespace errors; only release automation, tests, package scripts, and documentation changed; unrelated local store assets remain untracked and untouched.

- [ ] **Step 5: Commit any verification-only corrections**

If verification required tracked corrections, stage only those exact release-automation files and commit:

```powershell
git commit -m "fix: harden automated release checks"
```

If no corrections were needed, do not create an empty commit.

- [ ] **Step 6: Request code review before publication**

Use `superpowers:requesting-code-review`, address any findings, rerun Step 2, then use `superpowers:finishing-a-development-branch` to push `codex/chrome-store-release-automation` and open a draft stacked pull request targeting `codex/newtab-ui-layout`.

Do not create a production tag as part of implementation. The first real tag is a separate maintainer-authorized release action after both pull requests are merged and all four repository secrets are present.
