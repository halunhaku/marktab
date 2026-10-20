# MarkTab — Chrome Web Store submission

Applies to **MarkTab 3.0.0** (`package.json` version, mirrored in `public/manifest.json`).
The Chrome Web Store is the only store this extension ships to; see
[Microsoft Edge — publishing retired](#microsoft-edge--publishing-retired).

## Single purpose

MarkTab replaces the new tab page with a bookmark dashboard built from the browser's own
bookmark tree, so a user can find and open a bookmark in one or two actions. It does not read
page content, does not contact a server, and stores nothing outside the browser.

## Store listing

### Name

MarkTab

### Short description (zh)

一个安静、快速、隐私友好的书签启动器。

### Short description (en)

A calm, fast, privacy-friendly bookmark launcher.

### Detailed description (zh)

MarkTab 把你的浏览器书签变成一个命令行风格的启动器。打开新标签页，按 `⌘K`，输入几个字母，
结果就已经在下面了 —— 搜索、固定、最近访问和文件夹浏览共享同一个索引。

主要功能：

- **命令面板** — `⌘K` 打开一个输入框，同时搜索书签标题、域名、文件夹路径、网址、文件夹、应用操作和网页搜索
- **模糊排序** — 每个词都必须命中；标题优先于域名，命中词首和词边界会加分；固定和最近访问带来额外权重
- **固定常用书签** — 一键固定任意书签，固定列表可重新排序，数量上限可在设置中调整
- **最近访问** — 记录通过 MarkTab 打开的书签（按网址去重，最多 200 条），失败可撤销
- **文件夹浏览** — 左侧文件夹导航 + 文件夹视图（网格/列表、手动/标题/时间排序、文件夹内搜索）
- **可逆的文件夹隐藏** — 隐藏只写入偏好设置，绝不修改浏览器书签，随时一键恢复
- **外观三轴** — 主题（浅色/深色/跟随系统）、密度（舒适/紧凑）、动效（跟随系统/减弱/完整）相互独立
- **双语界面** — 英文与简体中文，文案键位有类型检查保证一致
- **导出 / 导入** — 只包含 MarkTab 自己的设置、固定与最近访问；不包含浏览器书签，也不改写书签树
- **弹窗** — 书签统计、一键切换主题、收藏当前页面、打开新标签页、打开浏览器书签管理器
- **键盘优先** — `⌘K` 打开面板，`↑↓` / `Home` / `End` 移动，`Enter` 打开，`Shift+Enter` 新标签页打开，`⌘Enter` 网页搜索，`Esc` 逐层关闭
- **隐私优先** — 无账号、无服务器、无分析、无网络请求；权限固定为 5 项

### Detailed description (en)

MarkTab turns your browser bookmarks into a launcher. Open a new tab, press `⌘K`, type a few
letters, and the result is already there — search, pins, recents and folder browsing share one
index.

Key features:

- **Command palette** — `⌘K` opens one field that searches bookmark titles, hosts, folder paths, URLs, folders, app actions and the web
- **Fuzzy ranking** — every word must match; titles outrank hosts, word-boundary and prefix hits score higher, and pins/recents add frecency weight
- **Pinned bookmarks** — pin anything, reorder the list, cap how many appear on Home
- **Recent history** — records bookmarks opened through MarkTab (deduplicated by URL, max 200), with undo
- **Folder browsing** — rail navigation plus a folder view with grid/list, manual/title/recency sorting and in-folder search
- **Reversible folder hiding** — hiding writes only to preferences; browser bookmarks are never modified, and one click restores
- **Three appearance axes** — theme (light/dark/system), density (comfortable/compact) and motion (system/reduced/full), independent
- **Bilingual UI** — English and Simplified Chinese, with typed key parity
- **Export / import** — MarkTab's own settings, pins and recents only; never your bookmark tree
- **Popup** — library stats, one-click theme switch, bookmark the current page, open the new tab page, open the browser bookmark manager
- **Keyboard first** — `⌘K` palette, `↑↓`/`Home`/`End` to move, `Enter` to open, `Shift+Enter` in a new tab, `⌘Enter` for web search, `Esc` to peel one layer
- **Privacy first** — no account, no server, no analytics, no network requests; exactly five permissions

### Category

Productivity

### Languages

Chinese Simplified, English

### Screenshots

Every image here is captured from the built extension with `npm run screenshots`
(`scripts/capture-store-assets.mjs`), which loads `dist/extension` in Chromium with a
representative library, drives the real interface, and removes any image it did not produce. Run
it after `npm run build` and before uploading; upload the PNG, use the JPEG elsewhere.

| File | Size / role |
| --- | --- |
| `store-assets/newtab-screenshot-1280x800.png` / `.jpg` | 1280×800, home (light) |
| `store-assets/newtab-dark-1280x800.png` / `.jpg` | 1280×800, home (dark) |
| `store-assets/folder-screenshot-1280x800.png` / `.jpg` | 1280×800, folder view (light) |
| `store-assets/folder-dark-1280x800.png` / `.jpg` | 1280×800, folder view (dark) |
| `store-assets/palette-screenshot-1280x800.png` / `.jpg` | 1280×800, command palette (light) |
| `store-assets/palette-dark-1280x800.png` / `.jpg` | 1280×800, command palette (dark) |
| `store-assets/pinned-1280x800.png` / `.jpg` | 1280×800, pinned view |
| `store-assets/recent-1280x800.png` / `.jpg` | 1280×800, recently opened view |
| `store-assets/settings-1280x800.png` / `.jpg` | 1280×800, settings |
| `store-assets/popup-screenshot-1280x800.png` / `.jpg` | 1280×800, toolbar popup |
| `store-assets/small-promo-440x280.png` / `.jpg` | 440×280, small promo tile |

## Permissions

Exactly five, and the release gate fails if the set changes
(`scripts/validate-release.mjs` → `ALLOWED_PERMISSIONS`). All justifications name the code that
uses the permission.

| Permission | Justification | Where it is used |
| --- | --- | --- |
| `bookmarks` | Reads the user's bookmark tree to build the search index, render bookmarks, folders and counts, and creates/renames/moves/deletes a bookmark **only** in response to an explicit user action. | `src/core/platform/bookmarks.ts` (`createBookmark`, `renameBookmark`, `moveBookmark`, `removeBookmark`, `openBookmarkManager`), `src/core/bookmarks/store.ts` (`getTree` + the bookmark event listeners), `src/core/bookmarks/index.ts`. |
| `favicon` | Displays a site icon for each bookmark, resolved by the browser from its own local favicon cache. No page is fetched and no host permission is needed. | `src/core/platform/favicon.ts` → `runtime.getURL('/_favicon/?pageUrl=…&size=…')`, consumed by `src/ui/components/Favicon.tsx`. |
| `search` | Runs a web search with the browser's configured default search engine, only when the user submits a query from the palette. | `src/core/util/url.ts` (`SEARCH_ENGINES`, `buildSearchUrl`) and the `Mod+Enter` path in `src/ui/features/palette/CommandPalette.tsx`. |
| `storage` | Persists the user's preferences and MarkTab's own data: appearance, language, density, motion, rail state, home visibility and counts, folder view/sort/hidden ids, search preferences, pinned bookmarks and recent visits. | `src/core/platform/storage.ts` with `SETTINGS_KEY` = `marktab:settings:v3` (`storage.sync`) and `DATA_KEY` = `marktab:data:v3` (`storage.local`). |
| `activeTab` | Reads the active tab's title and URL **only** after the user clicks "Bookmark the current page" in the popup, so that action can create the bookmark. | `src/core/platform/bookmarks.ts` → `readActivePage()`, called from `src/ui/features/popup/PopupApp.tsx`. |

Not requested, deliberately (ADR-010): no `host_permissions`, no `optional_permissions`, no
content scripts, and no `tabs` permission — `tabs` would expose the URL of every open tab, which
MarkTab does not need.

## Privacy field answers

- **Single purpose:** display, search and organise the user's local bookmarks on a replacement
  new tab page.
- **Remote code:** no remote code is loaded or executed. All HTML, CSS, JavaScript, locale data
  and icons ship inside the package, and the built HTML contains no inline script, no inline
  event handler and no remote asset reference.
- **Data collection:** none. Bookmark data is read and rendered locally. Nothing is transmitted
  to the developer.
- **Data sharing / sale:** none, for any purpose, including advertising and creditworthiness.
- **Network requests:** none. The release gate rejects `fetch(`, `XMLHttpRequest`, analytics and
  telemetry identifiers in every shipped `.js` file.
- **Privacy policy URL:** publish `PRIVACY_POLICY.md` at a public URL before submission and use
  that URL in the dashboard.

## Release package

`npm run package` (`scripts/package-release.mjs`) produces **`dist/marktab-3.0.0.zip`**, and the
ZIP contains exactly the contents of `dist/extension` — the same tree Playwright loads and the
same tree `npm run validate` checks:

```text
manifest.json
newtab.html
popup.html
background.js
theme-boot.js
assets/…    the per-entry bundles (newtab, popup) plus the shared chunks Vite emits,
            each name carrying a content hash: *-<hash>.js and *-<hash>.css
icons/icon16.png  icons/icon32.png  icons/icon48.png  icons/icon128.png
_locales/en/messages.json  _locales/zh_CN/messages.json
```

At 3.0.0 that is 18 files totalling ~236 KiB (JS ~155 KiB, CSS ~56 KiB); `npm run validate`
prints the exact numbers, and the set of hashed asset names changes with the sources, so never
hand-edit a file list into the dashboard — always inspect the produced zip.

Properties that matter for the store:

- **Deterministic.** Entries are sorted and stamped with a fixed timestamp (`SOURCE_DATE_EPOCH`,
  clamped to the ZIP epoch range), so two runs on the same sources are byte-identical and a
  store diff is meaningful.
- **Minimal.** No source maps, no TypeScript sources and no Markdown can reach the archive —
  `validate-release.mjs` fails if any of those file types is present.
- **Named for the version.** `dist/marktab-<version>.zip`, with stale `marktab-X.Y.Z.zip` files
  removed first, so the upload path is unambiguous.
- **Budgeted.** JavaScript ≤ 420 KiB, CSS ≤ 130 KiB, total payload ≤ 1.2 MiB.

Do not include screenshots, store assets, source drafts or local caches in the ZIP; the script
only ever zips `dist/extension`, so the way to keep them out is to keep them out of `dist/`.

## Reviewer instructions (how to test)

1. Unzip `marktab-3.0.0.zip` to a permanent folder.
2. Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select
   that folder (the one containing `manifest.json`).
3. Open a **new tab** — MarkTab replaces the new tab page (there is no options page; all
   settings live inside the new tab page). Clicking the toolbar icon opens the popup.
4. Create a few bookmarks and folders in the normal bookmark manager first, then:
   - **Palette:** press `Ctrl/Cmd+K`, type part of a bookmark title, press `Enter`. Verify the
     result opens and appears under **Recent**.
   - **Web search:** type a query and press `Ctrl/Cmd+Enter`. Verify the browser's default search
     engine opens (the extension never redirects to a fixed engine of its own choosing unless
     the user selects one in Settings → Search).
   - **Availability without the permission:** verify no page-content access is requested. The
     extension has no `tabs` or host permissions; nothing is injected into any page.
   - **Bookmarking the current page:** open any site, click the extension icon, click
     **Bookmark the current page** (the popup's add action), then reload the new tab page and
     confirm the new bookmark appears. This is the only `activeTab` use.
   - **Folder hiding is reversible:** open a folder, hide it from its context menu, then
     Settings → Folders → unhide. Confirm the browser's own bookmark manager still shows the
     folder and all its bookmarks.
   - **Appearance:** Settings → Appearance → switch theme to Dark, density to Compact, motion to
     Reduced; reload the new tab page and confirm the choice is applied before first paint (no
     white flash) and that motion is gone.
   - **Persistence:** reload and reopen the popup; confirm theme, hidden folders and pins
     persisted.
   - **Offline / network:** with DevTools → Network open, use the extension. There must be no
     request to a developer-owned host (only the `/_favicon/` resolver served locally by the
     browser).
   - **Migration (optional):** an existing MarkTab 2.x install keeps working; its legacy storage
     keys remain readable and are not deleted.

There is no account, no sign-in, no server component and no test credential required.

## Automated publishing (maintainers)

The publisher uses the Chrome Web Store API V2; `CWS_PUBLISHER_ID` is required in every upload,
status and publish request. A pushed `vX.Y.Z` tag triggers `.github/workflows/release.yml`:
verify the tag against `package.json` + `public/manifest.json`, run tests, build, validate,
package, create a **draft** GitHub release, upload, wait for the upload to succeed, submit for
public review with `DEFAULT_PUBLISH`, then publish the draft once Chrome accepts the submission.

### One-time prerequisites

- An item that is already published, with the publisher account's two-step verification enabled
  and a review-ready listing and privacy disclosure.
- The Chrome Web Store API enabled in Google Cloud, an OAuth consent screen configured, and a
  **Desktop app** OAuth client created (the helper uses a temporary loopback callback on
  `127.0.0.1`).
- If the consent app is **External** and still in **Testing**, add the Google account that will
  authorize (item owner or publisher-access account) as a Test user.
- Google limits refresh tokens to seven days for External consent apps in Testing when the
  `chromewebstore` scope is requested. Move the consent app to **In production** before
  generating the final `CWS_REFRESH_TOKEN`, or rotate the secret before each seven-day expiry.
- `CWS_PUBLISHER_ID` — **Publisher → Settings** in the Developer Dashboard.
- `CWS_ITEM_ID` — from the Dashboard or the item's listing URL. Never invent one.
- Rotate any credential that may have been exposed through an uncontrolled channel.

Repository secrets, with these exact names:
`CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_PUBLISHER_ID`, `CWS_ITEM_ID`.

```powershell
gh secret set CWS_CLIENT_ID
gh secret set CWS_CLIENT_SECRET
gh secret set CWS_PUBLISHER_ID
gh secret set CWS_ITEM_ID
```

To mint the refresh token, provide the OAuth client credentials to the local helper without
putting private values on the command line. Note this helper is a script, not an npm script —
there is no `npm run cws:auth`:

```powershell
$env:CWS_CLIENT_ID = Read-Host "OAuth client ID"
$secureClientSecret = Read-Host "OAuth client secret" -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureClientSecret)
try {
  $env:CWS_CLIENT_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  node scripts/cws-auth.mjs
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  Remove-Item Env:CWS_CLIENT_ID -ErrorAction SilentlyContinue
  Remove-Item Env:CWS_CLIENT_SECRET -ErrorAction SilentlyContinue
}
```

The helper opens the browser for OAuth authorization: sign in with the account that owns, or has
publisher access to, the target item (this may differ from the Google Cloud project owner). After
the loopback callback it pipes the refresh token straight into `gh secret set CWS_REFRESH_TOKEN`
over stdin; it does not print or store the token. Never commit credentials or paste them into
issues, pull requests, logs or chat.

### Retry and recovery

- **Retry a failed tag release:** **Actions → Release → Run workflow**, enter the existing
  `vX.Y.Z` tag. The workflow checks out that exact tag, rebuilds the deterministic ZIP, reuses
  the draft release and replaces the same-named asset.
- **Only the final publish step failed:** confirm in the Chrome Web Store Developer Dashboard
  that the submission was accepted, then re-run with `publish_github_release_only`. That mode
  requires an existing draft and skips the store API entirely. Do not use it when the submission
  failed or is ambiguous.

Never invent a replacement version and never move an existing tag. Chrome Web Store review is
asynchronous; monitor it in the Developer Dashboard and respond to feedback there.

## Microsoft Edge — publishing retired

MarkTab published to the Microsoft Edge Add-ons store from v2.0.6 to v3.0.0. **The listing was
unpublished on 2026-10-20.** The store operations for it are complete; no further Edge work is
scheduled, and the Chrome Web Store is the only store this extension ships to.

Nothing of the Edge path is left in the repository: the Edge publisher (`scripts/edge-publish.mjs`),
its API client (`scripts/edge-api.mjs`), their tests, the guide they came with
(`EDGE_STORE_SUBMISSION.md`), the Edge npm script, the `EDGE_*` repository secrets the release
workflow read, and the two Edge-only recovery inputs `workflow_dispatch` used to offer are all
gone. `release.yml` publishes to the Chrome Web Store only, and
`scripts/release-workflow.test.mjs` fails if any of those inputs come back.

How the withdrawal behaves, per Microsoft's own documentation
([Status for submitted extensions](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/submission-states)):

- **Unpublish** — the action taken here — changes the item's state to *Unavailable in store →
  Unpublished from store*. It is no longer available to new users at
  `edge.microsoft.com/addons`, while users who already installed it keep their copy.
- **Hidden** (the `Visibility` setting on the *Availability* page) is **not** a withdrawal: it
  only removes the item from search results and browsing, and leaves it on the store, still
  receiving updates. Do not use it as a substitute.
- Partner Center offers no "delete the item permanently" step and no dedicated *discontinued*
  field, so the unpublished item stays in the dashboard as an archive. Nothing else needs to be
  done there.

Existing Edge installs keep working (the 3.0.0 package is unaffected) but stop receiving updates,
because nothing is published there any more. The `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID` and
`EDGE_API_KEY` repository secrets were deleted from GitHub → **Settings → Secrets and variables
→ Actions** on the same day.

## Pre-submission checklist

- [ ] `npm run bump -- 3.0.0` has run (version agrees across `package.json`, `public/manifest.json`, `README.md` and this file).
- [ ] `npm run release:check` passes locally (typecheck → test → build → validate → package).
- [ ] `dist/marktab-3.0.0.zip` contains only the files listed under **Release package** above.
- [ ] The permissions table in `README.md`, `PRIVACY_POLICY.md`, `AGENTS.md` and this file still names exactly five permissions.
- [ ] Screenshots recaptured from the 3.0.0 build (`store-assets/` is currently v2-era).
- [ ] Listing claims match the extension's behaviour.
- [ ] Manual test pass: new tab paint, palette search, pin/unpin, hidden-folder recovery, theme/density/motion, persistence, popup stats, "bookmark the current page", no network requests to developer hosts.
