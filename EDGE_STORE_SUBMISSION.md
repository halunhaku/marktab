# MarkTab — Microsoft Edge Add-ons submission

Applies to **MarkTab 3.0.0**. Chrome Web Store has its own notes (listing copy, permission
justifications, screenshot inventory): [CHROME_STORE_SUBMISSION.md](./CHROME_STORE_SUBMISSION.md).
The extension is the same build for both stores; only the publishing path differs.

## Listing

- **Name:** MarkTab
- **Category:** Productivity
- **Languages:** English, Simplified Chinese (in-app catalogue; `default_locale: en`)
- **Single purpose:** replaces the new tab page with a searchable, keyboard-first dashboard for
  the browser's own bookmarks.
- **Short description:** A calm, fast, privacy-friendly bookmark launcher.
- The long description, feature bullets and screenshot inventory are maintained once, in
  [CHROME_STORE_SUBMISSION.md](./CHROME_STORE_SUBMISSION.md#store-listing). Partner Center does
  not consume files from this repository; initial creation and every listing-metadata change
  remain manual there.

## Permissions

The manifest requests exactly five permissions and nothing else — no `host_permissions`, no
`optional_permissions`, no content scripts. Per-permission justifications, with the code that
uses each one, are in
[CHROME_STORE_SUBMISSION.md](./CHROME_STORE_SUBMISSION.md#permissions); the short version for the
Partner Center form:

| Permission | One-line justification |
| --- | --- |
| `bookmarks` | Reads the bookmark tree to index and display bookmarks and folders; writes only on an explicit user action. |
| `favicon` | Renders bookmark icons from the browser's local favicon cache (`/_favicon/`); no page is fetched. |
| `search` | Runs a web search with the user's default search engine only when they submit a query. |
| `storage` | Saves MarkTab's own preferences and data (`marktab:settings:v3`, `marktab:data:v3`). |
| `activeTab` | Reads the current tab's title and URL only when the user clicks "bookmark the current page". |

## Package

`npm run package` produces **`dist/marktab-3.0.0.zip`**, containing exactly `dist/extension`:
`manifest.json`, `newtab.html`, `popup.html`, `background.js`, `theme-boot.js`, the hashed
`assets/*.js` and `assets/*.css` (per-entry bundles plus the shared chunks Vite emits),
`icons/icon{16,32,48,128}.png` and `_locales/{en,zh_CN}/messages.json` — 18 files at 3.0.0.
Sorted entries and a fixed timestamp make the archive reproducible. The same zip is submitted to Edge and to the Chrome Web Store, so the file to
upload in Partner Center is the asset attached to the draft GitHub release for that tag.

## Reviewer test steps

1. Unzip `marktab-3.0.0.zip` and load it via `edge://extensions/` → **Developer mode** →
   **Load unpacked**.
2. Open a new tab: MarkTab replaces it. Press `Ctrl+K` to open the palette, type a bookmark's
   title, press `Enter`.
3. Type a query and press `Ctrl+Enter` to confirm web search uses the browser's default engine.
4. Open a site, click the toolbar icon and use the popup's add action — this is the only
   `activeTab` use; no page content is read otherwise.
5. Hide a folder from its context menu, then restore it in Settings → Folders, and confirm the
   browser's own bookmark manager was never modified.
6. Switch Settings → Appearance to Dark / Compact / Reduced motion, reload, and confirm the
   theme is applied before first paint.
7. With DevTools → Network open, confirm the extension makes no request to a developer-owned
   host.

Full manual pass (including migration and popup checks) is the same list as
[CHROME_STORE_SUBMISSION.md](./CHROME_STORE_SUBMISSION.md#reviewer-instructions-how-to-test).

## Publishing API

MarkTab uses the official Microsoft Edge Add-ons Update REST API v1 at
`https://api.addons.microsoftedge.microsoft.com`. `scripts/edge-api.mjs` implements it and
`scripts/edge-publish.mjs` orchestrates it:

| Step | Request |
| --- | --- |
| Upload package | `POST /v1/products/{productId}/submissions/draft/package`, `content-type: application/zip`, expects `202` and reads the operation id from the `Location` header. |
| Wait for upload | `GET /v1/products/{productId}/submissions/draft/package/operations/{id}` until `Succeeded`; `Failed` raises with the API's message/errorCode; anything else is an error. |
| Submit for review | `POST /v1/products/{productId}/submissions` with `{ notes }` (note text includes the version), expects `202` + operation id. |
| Wait for submission | `GET /v1/products/{productId}/submissions/operations/{id}` until `Succeeded`. |

Requests authenticate with `Authorization: ApiKey <key>` and `x-clientid: <client id>`, time out
after 60 s each, poll at most 60 times at 5 s intervals, and abort the whole run after 12 minutes.
Secret values are redacted from every error message.
The Update REST API only updates an existing product; initial creation and listing metadata
changes remain manual in Partner Center.

## GitHub Actions secrets

Configure these repository secrets under **Settings → Secrets and variables → Actions**:

- `EDGE_PRODUCT_ID`: Product ID from Partner Center.
- `EDGE_CLIENT_ID`: Client ID from **Microsoft Edge → Publish API**.
- `EDGE_API_KEY`: current API key from the same page.

Never commit or paste these values into logs, issues, pull requests or chat. API keys expire;
rotate `EDGE_API_KEY` before its Partner Center expiry date.

## Release behaviour

A `vX.Y.Z` tag packages one deterministic ZIP for Chrome and Edge. The workflow uploads it to
Edge Add-ons, waits for package validation, submits the draft, and waits for the API to accept
the review submission. Store certification remains asynchronous, and the GitHub release stays a
draft until both stores accept.

## Retry and recovery

Run **Actions → Release → Run workflow** with the existing tag to retry a failed submission.
Check both dashboards first: a full retry offers the same version to Chrome again, which Chrome
rejects once it has that version.

If Chrome accepted the version and Edge did not — a rotated API key, say, which fails the upload
with `HTTP 401` before any operation exists — re-run from `main` with the existing tag and
`skip_chrome_web_store` enabled. That run builds, validates and packages as usual, skips only the
Chrome step, and then uploads and submits to Edge. Refresh `EDGE_CLIENT_ID` / `EDGE_API_KEY` from
Partner Center → **Publish API** first, or the upload fails the same way.

If Edge accepted the upload with `HTTP 202` but the workflow stopped while its operation was
still `InProgress`, run the workflow from `main` with the existing tag and set
`resume_edge_upload_operation_id` to the returned operation ID (the script reads it from
`EDGE_UPLOAD_OPERATION_ID`). This resumes polling, submits the Edge review after validation, and
does not resubmit Chrome or upload the package again.

Use `publish_github_release_only` only when an existing GitHub Release is still a draft and both
Chrome Web Store and Edge Add-ons have accepted their review submissions. This mode skips both
store APIs.

Official documentation: <https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api>
