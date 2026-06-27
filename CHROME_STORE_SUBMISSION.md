# MarkTab Release Notes

## Single Purpose

MarkTab replaces the Chrome new tab page with a visual bookmark dashboard, making local browser bookmarks easier to browse, search, and organize by user-created folders.

## Store Listing Draft

### Name

MarkTab

### Short Description

一个安静、快速、隐私友好的书签启动器。

### Detailed Description

MarkTab 把你的 Chrome 书签变成一个优雅、高效的书签启动器。打开新标签页即可在 1-2 个动作内找到目标网站。

主要功能：

- **搜索优先** — Spotlight 风格搜索面板，输入即搜，结果按书签/文件夹/网页搜索分组展示
- **按文件夹浏览** — 左侧文件夹导航 + 右侧书签网格卡片，支持文件夹内搜索过滤
- **首页分层** — Pinned 主入口（大卡片）> Recent 辅助（紧凑列表）> Folders 分类（胶囊按钮）
- **网页搜索** — 通过 Chrome Search API 使用浏览器默认搜索引擎，不自行选择或重定向
- **置顶常用书签** — 任何书签均可置顶，首页 Pinned 区域展示
- **隐藏/恢复分类** — 可在设置面板中切换文件夹可见性
- **主题切换** — Light / Dark / System 三套主题 + 森林绿单一强调色
- **Favicon** — 使用 Chrome 内置 favicon 服务，加载失败自动回退到首字母
- **弹出窗口** — 查看书签统计、打开新标签页、添加当前页面为书签
- **键盘驱动** — `/` / `⌘K` 聚焦搜索，`↑↓` 导航，`Enter` 打开，`Esc` 关闭
- **隐私优先** — 不向第三方发送书签标题、URL、域名或设置数据
- **Manifest V3**，无框架依赖

### Category

Productivity

### Languages

Chinese Simplified
English

### English Listing Draft

Short description:

A calm, fast, privacy-friendly bookmark launcher.

Detailed description:

MarkTab turns your Chrome bookmarks into an elegant, efficient bookmark launcher. Open a new tab and find the site you need in one or two actions.

Key features:

- **Search first** — Spotlight-style search panel with grouped bookmark, folder, and web search results
- **Folder browsing** — Sidebar folder navigation with bookmark grid cards and in-folder filtering
- **Layered home page** — Pinned primary shortcuts, Recent quick access, and Folders for browsing
- **Web search** — Uses the Chrome Search API with the browser's default search engine
- **Pinned bookmarks** — Pin any bookmark and keep it on the home page
- **Bilingual UI** — Supports English and Simplified Chinese through Chrome i18n
- **Favicon support** — Uses Chrome's built-in favicon service with letter fallback
- **Popup actions** — View bookmark stats, open a new tab, add the current page, or manage bookmarks
- **Keyboard driven** — `/` / `Ctrl or Cmd + K` opens search, arrow keys navigate, `Enter` opens, `Esc` closes
- **Privacy first** — Bookmark titles, URLs, domains, and settings are not sent to developer servers
- **Manifest V3**, framework-free

## Permission Justifications

| Permission | Justification |
| --- | --- |
| `bookmarks` | Required to read the user's bookmark tree, display bookmarks on the new tab page, count bookmarks/folders, and create a bookmark when the user clicks “添加当前页面”. |
| `favicon` | Required to display bookmark favicons through Chrome's built-in favicon service. |
| `search` | Required only when the user actively submits a web search from the new tab page. It uses Chrome's default search provider through the Chrome Search API. |
| `storage` | Required to save user preferences such as hidden folder IDs, pinned bookmark URLs, selected theme, and folder navigation collapsed state. |
| `activeTab` | Required only when the user opens the popup and clicks “添加当前页面”; it allows the extension to read the active tab title and URL for bookmark creation. |

## Privacy Field Answers

- Single purpose: Display and search local Chrome bookmarks on a replacement new tab page.
- Remote code: No remote code is loaded or executed.
- Data collection: The extension handles bookmark data locally to provide its core functionality. Bookmark data is not sent to developer servers.
- Data sharing/sale: No user data is sold or shared for advertising or unrelated purposes.
- Privacy policy URL: Publish `PRIVACY_POLICY.md` content to a public URL before submission and use that URL in the dashboard.

## Automated Chrome Web Store Publishing

### One-time prerequisites

- Start with an item that is already published in the Chrome Web Store, has two-step verification enabled for its publisher account, and has a review-ready listing and privacy disclosures.
- In Google Cloud, enable the Chrome Web Store API, configure the OAuth consent screen, and create a **Desktop app** OAuth client.
- Find the extension's item ID in the Chrome Web Store Developer Dashboard or in its listing URL. Store that value as `CWS_ITEM_ID`; do not substitute an invented or example ID.
- Rotate any client secret, refresh token, or other credential that has been exposed through an uncontrolled channel before configuring automation.

Configure these GitHub Actions secrets, with these exact names:

- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`
- `CWS_ITEM_ID`

From PowerShell, let GitHub CLI prompt interactively for the three known values so they do not appear in shell history:

```powershell
gh secret set CWS_CLIENT_ID
gh secret set CWS_CLIENT_SECRET
gh secret set CWS_ITEM_ID
```

Then provide the OAuth client credentials to the local authorization helper without placing private values in the command line:

```powershell
$env:CWS_CLIENT_ID = Read-Host "OAuth client ID"
$secureClientSecret = Read-Host "OAuth client secret" -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureClientSecret)
try {
  $env:CWS_CLIENT_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  npm run cws:auth
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  Remove-Item Env:CWS_CLIENT_ID -ErrorAction SilentlyContinue
  Remove-Item Env:CWS_CLIENT_SECRET -ErrorAction SilentlyContinue
}
```

`npm run cws:auth` opens the browser for OAuth authorization and pipes the returned refresh token directly to `gh secret set CWS_REFRESH_TOKEN` over standard input. It does not print or store the token locally. Never commit credentials or paste them into issues, pull requests, logs, or chat.

For routine releases, follow [Automated releases (maintainers)](./README.md#automated-releases-maintainers). The pushed `vX.Y.Z` tag triggers deterministic packaging, a draft GitHub Release, and Chrome Web Store submission; the GitHub Release becomes public only after the store API accepts the submission.

### Retry and review operations

To retry a failed release, open **Actions → Release → Run workflow**, enter the existing `vX.Y.Z` tag, and run it. The workflow checks out that exact tag, rebuilds the deterministic ZIP, reuses the existing draft release, and replaces its ZIP asset. A failed run leaves the GitHub Release as a draft.

If the remote Chrome Web Store state is ambiguous, inspect the item in the Developer Dashboard before retrying. Never invent a replacement version or move the existing tag. Chrome Web Store review is asynchronous: monitor it manually in the Developer Dashboard and respond to review feedback there.

## Release Package Checklist

- Run `npm run validate`.
- Run `npm run package` and inspect the generated zip in `dist/`; the automated tag workflow performs the upload and store submission.
- Optional: run `npm run inspect:zip` to review the package contents.
- Confirm the zip only includes `manifest.json`, `newtab.html`, `newtab.js`, `styles.css`, `popup.html`, `popup.js`, and required icons.
- Confirm `_locales/en/messages.json` and `_locales/zh_CN/messages.json` are included in the zip.
- Do not include `.DS_Store`, icon generation helper pages, source drafts, store screenshots, or local caches.
- Test by loading the unpacked extension from `chrome://extensions`.
- Verify:
  - Home page: search, Pinned/Recent/Folders sections render correctly
  - Search panel: Spotlight overlay opens via click, `/`, and `⌘K`; results group by bookmarks/folders/web; keyboard navigation works
  - Folder view: sidebar navigation, bookmark grid, inline search filtering
  - Settings: theme switching and folder visibility toggles
  - Popup: statistics, open new tab, add current page, manage bookmarks
- Verify all settings persist after reload (theme, hidden folders, pinned bookmarks).
- Verify "添加当前页面" only reads the active tab after the user clicks the popup action.
- Run `npm run screenshots` to refresh store screenshots, then review the files in `store-assets/`.
- Confirm listing claims match the extension behavior.

## AI Maintenance Notes

Future coding agents should follow [AGENTS.md](./AGENTS.md): keep the extension single-purpose, avoid remote executable code, keep permissions minimal, and update privacy/store documentation whenever data handling or permissions change.
