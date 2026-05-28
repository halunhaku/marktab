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
- **主题切换** — Paper / Charcoal / System 三套主题 + 5 种强调色
- **Favicon** — 使用 Chrome 内置 favicon 服务，加载失败自动回退到首字母
- **弹出窗口** — 查看书签统计、打开新标签页、添加当前页面为书签
- **键盘驱动** — `/` / `⌘K` 聚焦搜索，`↑↓` 导航，`Enter` 打开，`Esc` 关闭
- **隐私优先** — 不向第三方发送书签标题、URL、域名或设置数据
- **Manifest V3**，无框架依赖

### Category

Productivity

### Language

Chinese Simplified

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

## Release Package Checklist

- Run `npm run validate`.
- Run `npm run package` and upload the generated zip from `dist/`.
- Optional: run `npm run inspect:zip` to review the package contents.
- Confirm the zip only includes `manifest.json`, `newtab.html`, `newtab.js`, `styles.css`, `popup.html`, `popup.js`, and required icons.
- Do not include `.DS_Store`, icon generation helper pages, source drafts, store screenshots, or local caches.
- Test by loading the unpacked extension from `chrome://extensions`.
- Verify:
  - Home page: search, Pinned/Recent/Folders sections render correctly
  - Search panel: Spotlight overlay opens via click, `/`, and `⌘K`; results group by bookmarks/folders/web; keyboard navigation works
  - Folder view: sidebar navigation, bookmark grid, inline search filtering
  - Settings: theme switching, accent color, folder visibility toggles
  - Popup: statistics, open new tab, add current page, manage bookmarks
- Verify all settings persist after reload (theme, accent, hidden folders, pinned bookmarks).
- Verify "添加当前页面" only reads the active tab after the user clicks the popup action.
- Run `npm run screenshots` to refresh store screenshots, then review the files in `store-assets/`.
- Confirm listing claims match the extension behavior.

## AI Maintenance Notes

Future coding agents should follow [AGENTS.md](./AGENTS.md): keep the extension single-purpose, avoid remote executable code, keep permissions minimal, and update privacy/store documentation whenever data handling or permissions change.
