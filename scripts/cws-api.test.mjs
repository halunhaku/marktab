import assert from 'node:assert/strict';
import test from 'node:test';

import {
  exchangeRefreshToken,
  getItemStatus,
  publishItem,
  uploadItem,
  waitForUpload,
} from './cws-api.mjs';

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

test('exchangeRefreshToken posts form credentials outside the URL and returns the access token', async () => {
  const calls = [];
  const accessToken = await exchangeRefreshToken({
    clientId: 'client id',
    clientSecret: 'client/secret',
    refreshToken: 'refresh+token',
    fetchImpl: async (...args) => {
      calls.push(args);
      return jsonResponse({ access_token: 'access-token' });
    },
  });

  assert.equal(accessToken, 'access-token');
  assert.equal(calls.length, 1);
  const [url, init] = calls[0];
  assert.equal(url, 'https://oauth2.googleapis.com/token');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['content-type'], 'application/x-www-form-urlencoded');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(init.body)), {
    grant_type: 'refresh_token',
    client_id: 'client id',
    client_secret: 'client/secret',
    refresh_token: 'refresh+token',
  });
  assert.doesNotMatch(url, /client id|client\/secret|refresh\+token/);
});

test('exchangeRefreshToken rejects a response without an access token', async () => {
  await assert.rejects(
    exchangeRefreshToken({
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      fetchImpl: async () => jsonResponse({ token_type: 'Bearer' }),
    }),
    /token exchange.*missing access_token/i,
  );
});

test('exchangeRefreshToken times out a fetch that never settles', async () => {
  const startedAt = Date.now();
  await assert.rejects(
    exchangeRefreshToken({
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      fetchImpl: async () => new Promise(() => {}),
      requestTimeoutMs: 20,
    }),
    /token exchange.*timed out/i,
  );
  assert.ok(Date.now() - startedAt < 250);
});

test('uploadItem puts zip bytes at the encoded item URL with required headers', async () => {
  const zipBytes = new Uint8Array([80, 75, 3, 4]);
  let request;
  const result = await uploadItem({
    itemId: 'item/id with space',
    accessToken: 'upload-token',
    zipBytes,
    fetchImpl: async (...args) => {
      request = args;
      return jsonResponse({ uploadState: 'SUCCESS' });
    },
  });

  assert.deepEqual(result, { uploadState: 'SUCCESS' });
  assert.equal(
    request[0],
    'https://www.googleapis.com/upload/chromewebstore/v1.1/items/item%2Fid%20with%20space?uploadType=media',
  );
  assert.equal(request[1].method, 'PUT');
  assert.equal(request[1].body, zipBytes);
  assert.equal(request[1].headers.authorization, 'Bearer upload-token');
  assert.equal(request[1].headers['x-goog-api-version'], '2');
  assert.equal(request[1].headers['content-type'], 'application/zip');
});

test('getItemStatus gets the draft projection with required headers', async () => {
  let request;
  const result = await getItemStatus({
    itemId: 'item/id',
    accessToken: 'status-token',
    fetchImpl: async (...args) => {
      request = args;
      return jsonResponse({ uploadState: 'IN_PROGRESS' });
    },
  });

  assert.deepEqual(result, { uploadState: 'IN_PROGRESS' });
  assert.equal(
    request[0],
    'https://www.googleapis.com/chromewebstore/v1.1/items/item%2Fid?projection=DRAFT',
  );
  assert.equal(request[1].method, 'GET');
  assert.equal(request[1].headers.authorization, 'Bearer status-token');
  assert.equal(request[1].headers['x-goog-api-version'], '2');
});

test('waitForUpload polls IN_PROGRESS until SUCCESS', async () => {
  const sleeps = [];
  let polls = 0;
  const result = await waitForUpload({
    itemId: 'item',
    accessToken: 'token',
    initial: { uploadState: 'IN_PROGRESS' },
    fetchImpl: async () => {
      polls += 1;
      return jsonResponse({ uploadState: polls === 1 ? 'IN_PROGRESS' : 'SUCCESS' });
    },
    sleep: async (milliseconds) => sleeps.push(milliseconds),
    intervalMs: 123,
  });

  assert.deepEqual(result, { uploadState: 'SUCCESS' });
  assert.equal(polls, 2);
  assert.deepEqual(sleeps, [123, 123]);
});

test('waitForUpload returns immediately for initial SUCCESS', async () => {
  const initial = { uploadState: 'SUCCESS' };
  let called = false;
  const result = await waitForUpload({
    itemId: 'item',
    accessToken: 'token',
    initial,
    fetchImpl: async () => {
      called = true;
      return jsonResponse({ uploadState: 'SUCCESS' });
    },
    sleep: async () => {
      called = true;
    },
  });

  assert.equal(result, initial);
  assert.equal(called, false);
});

for (const state of ['FAILURE', 'NOT_FOUND']) {
  test(`waitForUpload rejects initial ${state} as terminal`, async () => {
    await assert.rejects(
      waitForUpload({
        itemId: 'item',
        accessToken: 'token',
        initial: { uploadState: state },
        fetchImpl: async () => {
          throw new Error('must not poll');
        },
        sleep: async () => {},
      }),
      new RegExp(`upload.*${state}`, 'i'),
    );
  });
}

test('waitForUpload rejects a terminal state returned by polling', async () => {
  await assert.rejects(
    waitForUpload({
      itemId: 'item',
      accessToken: 'token',
      initial: { uploadState: 'IN_PROGRESS' },
      fetchImpl: async () => jsonResponse({ uploadState: 'FAILURE' }),
      sleep: async () => {},
    }),
    /upload.*FAILURE/i,
  );
});

test('waitForUpload performs at most maxAttempts polls before timing out', async () => {
  let polls = 0;
  await assert.rejects(
    waitForUpload({
      itemId: 'item',
      accessToken: 'token',
      initial: { uploadState: 'IN_PROGRESS' },
      fetchImpl: async () => {
        polls += 1;
        return jsonResponse({ uploadState: 'IN_PROGRESS' });
      },
      sleep: async () => {},
      maxAttempts: 3,
    }),
    /timed out.*3/i,
  );
  assert.equal(polls, 3);
});

for (const initial of [{}, { uploadState: 'QUEUED' }]) {
  test(`waitForUpload rejects ${initial.uploadState ? 'unexpected' : 'missing'} upload state`, async () => {
    await assert.rejects(
      waitForUpload({
        itemId: 'item',
        accessToken: 'token',
        initial,
        fetchImpl: async () => jsonResponse({ uploadState: 'SUCCESS' }),
        sleep: async () => {},
      }),
      /upload.*(missing|unexpected).*state/i,
    );
  });
}

test('publishItem posts the public default target as JSON', async () => {
  let request;
  const result = await publishItem({
    itemId: 'item/id',
    accessToken: 'publish-token',
    fetchImpl: async (...args) => {
      request = args;
      return jsonResponse({ status: ['OK'] });
    },
  });

  assert.deepEqual(result, { status: ['OK'] });
  assert.equal(
    request[0],
    'https://www.googleapis.com/chromewebstore/v1.1/items/item%2Fid/publish',
  );
  assert.equal(request[1].method, 'POST');
  assert.equal(request[1].headers.authorization, 'Bearer publish-token');
  assert.equal(request[1].headers['x-goog-api-version'], '2');
  assert.equal(request[1].headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(request[1].body), { target: 'default' });
});

test('publishItem rejects a response with missing application status', async () => {
  await assert.rejects(
    publishItem({
      itemId: 'item',
      accessToken: 'token',
      fetchImpl: async () => jsonResponse({ statusDetail: 'status unavailable' }),
    }),
    /publish item.*missing.*status.*status unavailable/i,
  );
});

test('publishItem rejects a response with malformed application status', async () => {
  const accessToken = 'malformed-sensitive';
  await assert.rejects(
    publishItem({
      itemId: 'item',
      accessToken,
      fetchImpl: async () => jsonResponse({
        status: 'OK',
        statusDetail: `Bad for ${accessToken}`,
      }),
    }),
    (error) => {
      assert.match(error.message, /publish item.*malformed.*status/i);
      assert.match(error.message, /"status":"OK"/);
      assert.match(error.message, /Bad for \*\*\*/);
      assert.doesNotMatch(error.message, new RegExp(accessToken));
      return true;
    },
  );
});

test('publishItem rejects a non-object response as malformed', async () => {
  await assert.rejects(
    publishItem({
      itemId: 'item',
      accessToken: 'token',
      fetchImpl: async () => jsonResponse(null),
    }),
    /publish item.*malformed.*response/i,
  );
});

test('publishItem rejects non-OK application status with redacted status details', async () => {
  const accessToken = 'publish-sensitive';
  await assert.rejects(
    publishItem({
      itemId: 'item',
      accessToken,
      fetchImpl: async () => jsonResponse({
        status: ['NOT_AUTHORIZED'],
        statusDetail: `Denied for ${accessToken}`,
      }),
    }),
    (error) => {
      assert.match(error.message, /publish item/i);
      assert.match(error.message, /NOT_AUTHORIZED/);
      assert.match(error.message, /Denied for \*\*\*/);
      assert.doesNotMatch(error.message, new RegExp(accessToken));
      return true;
    },
  );
});

test('operations reject malformed JSON with the action and HTTP status', async () => {
  await assert.rejects(
    uploadItem({
      itemId: 'item',
      accessToken: 'token',
      zipBytes: new Uint8Array(),
      fetchImpl: async () => new Response('not json', { status: 200 }),
    }),
    /upload item.*HTTP 200.*malformed JSON/i,
  );
});

test('server errors include action and status while redacting every known credential', async () => {
  const secrets = {
    clientId: 'client-sensitive',
    clientSecret: 'secret-sensitive',
    refreshToken: 'refresh-sensitive',
  };
  await assert.rejects(
    exchangeRefreshToken({
      ...secrets,
      fetchImpl: async () => jsonResponse(
        { error: `${secrets.clientId} ${secrets.clientSecret} ${secrets.refreshToken}` },
        { status: 401 },
      ),
    }),
    (error) => {
      assert.match(error.message, /token exchange.*HTTP 401/i);
      assert.match(error.message, /\*\*\*/);
      for (const secret of Object.values(secrets)) assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );
});

test('server errors redact credentials containing JSON-special characters', async () => {
  const clientSecret = 'secret"tail';
  await assert.rejects(
    exchangeRefreshToken({
      clientId: 'client',
      clientSecret,
      refreshToken: 'refresh',
      fetchImpl: async () => jsonResponse(
        { error: `invalid credential ${clientSecret}`, hint: 'rotate credentials' },
        { status: 401 },
      ),
    }),
    (error) => {
      assert.match(error.message, /rotate credentials/);
      assert.doesNotMatch(error.message, /secret\\"tail/);
      assert.doesNotMatch(error.message, /secret"tail/);
      return true;
    },
  );
});

test('server errors fully redact overlapping credentials without leaking a suffix', async () => {
  const clientId = 'shared';
  const clientSecret = 'shared-secret-tail';
  await assert.rejects(
    exchangeRefreshToken({
      clientId,
      clientSecret,
      refreshToken: 'refresh',
      fetchImpl: async () => jsonResponse(
        { error: `invalid ${clientSecret}`, hint: 'check configuration' },
        { status: 401 },
      ),
    }),
    (error) => {
      assert.match(error.message, /check configuration/);
      assert.doesNotMatch(error.message, /shared/);
      assert.doesNotMatch(error.message, /secret-tail/);
      return true;
    },
  );
});

test('API server errors redact the access token when it is echoed', async () => {
  const accessToken = 'access-sensitive';
  await assert.rejects(
    getItemStatus({
      itemId: 'item',
      accessToken,
      fetchImpl: async () => jsonResponse({ error: accessToken }, { status: 403 }),
    }),
    (error) => {
      assert.match(error.message, /get item status.*HTTP 403/i);
      assert.doesNotMatch(error.message, new RegExp(accessToken));
      assert.match(error.message, /\*\*\*/);
      return true;
    },
  );
});
