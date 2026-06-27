import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { publishPackage } from './cws-publish.mjs';

const completeEnv = {
  CWS_CLIENT_ID: 'client-id-secret-value',
  CWS_CLIENT_SECRET: 'client-secret-value',
  CWS_REFRESH_TOKEN: 'refresh-token-value',
  CWS_ITEM_ID: 'item-id-value',
};

function recordingApi(calls = []) {
  return {
    async exchangeRefreshToken(input) {
      calls.push(['exchangeRefreshToken', input]);
      return 'access-token-value';
    },
    async uploadItem(input) {
      calls.push(['uploadItem', input]);
      return { uploadState: 'IN_PROGRESS' };
    },
    async waitForUpload(input) {
      calls.push(['waitForUpload', input]);
      return { uploadState: 'SUCCESS' };
    },
    async publishItem(input) {
      calls.push(['publishItem', input]);
      return { status: ['OK'] };
    },
  };
}

test('validates required environment variables in order before artifact access', async () => {
  const names = [
    'CWS_CLIENT_ID',
    'CWS_CLIENT_SECRET',
    'CWS_REFRESH_TOKEN',
    'CWS_ITEM_ID',
  ];

  for (let index = 0; index < names.length; index += 1) {
    const env = Object.fromEntries(names.slice(0, index).map((name) => [name, completeEnv[name]]));
    await assert.rejects(
      publishPackage({ artifactPath: 'definitely-does-not-exist.zip', env, api: recordingApi() }),
      new Error(`Missing ${names[index]}.`),
    );
  }

  await assert.rejects(
    publishPackage({ artifactPath: 'definitely-does-not-exist.zip', env: { ...completeEnv, CWS_CLIENT_ID: '   ' }, api: recordingApi() }),
    new Error('Missing CWS_CLIENT_ID.'),
  );
});

test('requires an artifact path after validating the environment', async () => {
  await assert.rejects(
    publishPackage({ env: completeEnv, api: recordingApi() }),
    new Error('Artifact path is required.'),
  );
});

test('rejects an inaccessible artifact without calling the API or exposing secrets', async () => {
  const calls = [];
  const secretPath = path.join(tmpdir(), completeEnv.CWS_CLIENT_SECRET, 'missing.zip');

  await assert.rejects(
    publishPackage({ artifactPath: secretPath, env: completeEnv, api: recordingApi(calls) }),
    (error) => {
      assert.equal(error.message, 'Artifact is not an accessible file.');
      for (const secret of Object.values(completeEnv)) assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );
  assert.deepEqual(calls, []);
});

test('exchanges, uploads, waits, and publishes in order with safe logs and returns the result', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'marktab-cws-publish-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const artifactPath = path.join(directory, 'marktab.zip');
  const expectedBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  await writeFile(artifactPath, expectedBytes);
  const calls = [];
  const logs = [];

  const result = await publishPackage({
    artifactPath,
    env: completeEnv,
    api: recordingApi(calls),
    log: (message) => logs.push(message),
  });

  assert.deepEqual(result, { status: ['OK'] });
  assert.deepEqual(calls, [
    ['exchangeRefreshToken', {
      clientId: completeEnv.CWS_CLIENT_ID,
      clientSecret: completeEnv.CWS_CLIENT_SECRET,
      refreshToken: completeEnv.CWS_REFRESH_TOKEN,
    }],
    ['uploadItem', {
      itemId: completeEnv.CWS_ITEM_ID,
      accessToken: 'access-token-value',
      zipBytes: expectedBytes,
    }],
    ['waitForUpload', {
      itemId: completeEnv.CWS_ITEM_ID,
      accessToken: 'access-token-value',
      initial: { uploadState: 'IN_PROGRESS' },
    }],
    ['publishItem', {
      itemId: completeEnv.CWS_ITEM_ID,
      accessToken: 'access-token-value',
    }],
  ]);
  assert.deepEqual(logs, [
    'Chrome Web Store authentication completed.',
    'Chrome Web Store upload started.',
    'Chrome Web Store upload completed.',
    'Chrome Web Store publication completed.',
  ]);
  const serializedLogs = JSON.stringify(logs);
  for (const secret of [...Object.values(completeEnv), 'access-token-value']) {
    assert.doesNotMatch(serializedLogs, new RegExp(secret));
  }
  assert.doesNotMatch(serializedLogs, /authorization|bearer|504b0304/i);
});

test('direct CLI reports a safe error and exits with code 1', async () => {
  const scriptPath = fileURLToPath(new URL('./cws-publish.mjs', import.meta.url));
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      env: { ...process.env, ...completeEnv },
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
  assert.equal(result.stderr, 'Artifact path is required.\n');
  for (const secret of Object.values(completeEnv)) assert.doesNotMatch(result.stderr, new RegExp(secret));
});
