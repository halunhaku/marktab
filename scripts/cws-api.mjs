const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const STORE_API_ROOT = 'https://www.googleapis.com/chromewebstore/v1.1/items';
const STORE_UPLOAD_ROOT = 'https://www.googleapis.com/upload/chromewebstore/v1.1/items';

function redact(value, secrets) {
  let result = String(value);
  for (const secret of secrets) {
    if (secret) result = result.replaceAll(String(secret), '***');
  }
  return result;
}

async function requestJson({ action, url, init, fetchImpl, secrets = [] }) {
  let response;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    throw new Error(`${action} failed: ${redact(error?.message ?? error, secrets)}`);
  }

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${action} failed (HTTP ${response.status}): malformed JSON`);
  }

  if (!response.ok) {
    throw new Error(
      `${action} failed (HTTP ${response.status}): ${redact(JSON.stringify(data), secrets)}`,
    );
  }
  return data;
}

function itemUrl(root, itemId, suffix = '') {
  return `${root}/${encodeURIComponent(itemId)}${suffix}`;
}

function apiHeaders(accessToken, extra = {}) {
  return {
    authorization: `Bearer ${accessToken}`,
    'x-goog-api-version': '2',
    ...extra,
  };
}

export async function exchangeRefreshToken({
  clientId,
  clientSecret,
  refreshToken,
  fetchImpl = fetch,
}) {
  const secrets = [clientId, clientSecret, refreshToken];
  const data = await requestJson({
    action: 'Token exchange',
    url: TOKEN_URL,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    },
    fetchImpl,
    secrets,
  });

  if (!data.access_token) throw new Error('Token exchange failed: missing access_token');
  return data.access_token;
}

export function uploadItem({ itemId, accessToken, zipBytes, fetchImpl = fetch }) {
  return requestJson({
    action: 'Upload item',
    url: itemUrl(STORE_UPLOAD_ROOT, itemId),
    init: {
      method: 'PUT',
      headers: apiHeaders(accessToken, { 'content-type': 'application/zip' }),
      body: zipBytes,
    },
    fetchImpl,
    secrets: [accessToken],
  });
}

export function getItemStatus({ itemId, accessToken, fetchImpl = fetch }) {
  return requestJson({
    action: 'Get item status',
    url: itemUrl(STORE_API_ROOT, itemId, '?projection=DRAFT'),
    init: {
      method: 'GET',
      headers: apiHeaders(accessToken),
    },
    fetchImpl,
    secrets: [accessToken],
  });
}

function inspectUploadState(result) {
  const state = result?.uploadState;
  if (!state) throw new Error('Upload response has missing state');
  if (state === 'SUCCESS') return 'success';
  if (state === 'IN_PROGRESS') return 'pending';
  if (state === 'FAILURE' || state === 'NOT_FOUND') {
    throw new Error(`Upload reached terminal state ${state}`);
  }
  throw new Error(`Upload response has unexpected state ${state}`);
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitForUpload({
  itemId,
  accessToken,
  initial,
  fetchImpl = fetch,
  sleep = defaultSleep,
  maxAttempts = 30,
  intervalMs = 5000,
}) {
  let current = initial;
  if (inspectUploadState(current) === 'success') return current;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(intervalMs);
    current = await getItemStatus({ itemId, accessToken, fetchImpl });
    if (inspectUploadState(current) === 'success') return current;
  }

  throw new Error(`Upload timed out after ${maxAttempts} status checks`);
}

export function publishItem({ itemId, accessToken, fetchImpl = fetch }) {
  return requestJson({
    action: 'Publish item',
    url: itemUrl(STORE_API_ROOT, itemId, '/publish'),
    init: {
      method: 'POST',
      headers: apiHeaders(accessToken, { 'content-type': 'application/json' }),
      body: JSON.stringify({ target: 'default' }),
    },
    fetchImpl,
    secrets: [accessToken],
  });
}
