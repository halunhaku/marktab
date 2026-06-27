import { readFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import * as cwsApi from './cws-api.mjs';

const REQUIRED_ENV = [
  'CWS_CLIENT_ID',
  'CWS_CLIENT_SECRET',
  'CWS_REFRESH_TOKEN',
  'CWS_ITEM_ID',
];

function safeError(error, secrets) {
  let message = String(error?.message ?? error);
  for (const secret of secrets.filter(Boolean).map(String).sort((a, b) => b.length - a.length)) {
    message = message.replaceAll(secret, '***');
  }
  return new Error(message);
}

async function readArtifact(artifactPath) {
  try {
    const metadata = await stat(artifactPath);
    if (!metadata.isFile()) throw new Error('not a file');
    return await readFile(artifactPath);
  } catch {
    throw new Error('Artifact is not an accessible file.');
  }
}

export async function publishPackage({
  artifactPath,
  env = process.env,
  api = cwsApi,
  log = console.log,
} = {}) {
  for (const name of REQUIRED_ENV) {
    if (!String(env[name] ?? '').trim()) throw new Error(`Missing ${name}.`);
  }
  if (!artifactPath) throw new Error('Artifact path is required.');

  const { CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN, CWS_ITEM_ID } = env;
  const secrets = [CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN, CWS_ITEM_ID];
  let accessToken;

  try {
    const zipBytes = await readArtifact(artifactPath);
    accessToken = await api.exchangeRefreshToken({
      clientId: CWS_CLIENT_ID,
      clientSecret: CWS_CLIENT_SECRET,
      refreshToken: CWS_REFRESH_TOKEN,
    });
    log('Chrome Web Store authentication completed.');

    const initial = await api.uploadItem({ itemId: CWS_ITEM_ID, accessToken, zipBytes });
    log('Chrome Web Store upload started.');

    await api.waitForUpload({ itemId: CWS_ITEM_ID, accessToken, initial });
    log('Chrome Web Store upload completed.');

    const result = await api.publishItem({ itemId: CWS_ITEM_ID, accessToken });
    log('Chrome Web Store publication completed.');
    return result;
  } catch (error) {
    throw safeError(error, [...secrets, accessToken]);
  }
}

const isDirectRun = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  publishPackage({ artifactPath: process.argv[2] }).catch((error) => {
    console.error(error?.message ?? 'Chrome Web Store publication failed.');
    process.exitCode = 1;
  });
}
