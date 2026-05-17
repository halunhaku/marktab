# MarkTab Release Notes

## Single Purpose

MarkTab replaces the Chrome new tab page with a visual bookmark dashboard, making local browser bookmarks easier to browse, search, and organize by user-created folders.

## Store Listing Draft

### Name

MarkTab

### Short Description

一个快速、清晰、隐私友好的书签新标签页。

### Detailed Description

MarkTab 会把 Chrome 书签展示为清晰的分类面板，让你在打开新标签页时快速浏览、搜索和访问常用网站。

主要功能：

- 自动读取本地 Chrome 书签并按用户自建文件夹分类
- 支持按标题和 URL 搜索书签
- 支持选择默认搜索引擎
- 支持隐藏或恢复不想展示的分类
- 弹出窗口可查看书签统计、打开新标签页、添加当前页面为书签
- 不向第三方发送书签标题、URL 或分类数据

### Category

Productivity

### Language

Chinese Simplified

## Permission Justifications

| Permission | Justification |
| --- | --- |
| `bookmarks` | Required to read the user's bookmark tree, display bookmarks on the new tab page, count bookmarks/folders, and create a bookmark when the user clicks “添加当前页面”. |
| `storage` | Required to save user preferences such as default search engine, hidden folder IDs, and folder navigation collapsed state. |
| `activeTab` | Required only when the user opens the popup and clicks “添加当前页面”; it allows the extension to read the active tab title and URL for bookmark creation. |

## Privacy Field Answers

- Single purpose: Display and search local Chrome bookmarks on a replacement new tab page.
- Remote code: No remote code is loaded or executed.
- Data collection: The extension handles bookmark data locally to provide its core functionality. Bookmark data is not sent to developer servers.
- Data sharing/sale: No user data is sold or shared for advertising or unrelated purposes.
- Privacy policy URL: Publish `PRIVACY_POLICY.md` content to a public URL before submission and use that URL in the dashboard.

## Release Package Checklist

- Upload the generated zip from `dist/`.
- Do not include `.DS_Store`, icon generation helper pages, source drafts, or local caches.
- Test by loading the unpacked extension from `chrome://extensions`.
- Verify the new tab page opens, search works, hidden labels can be restored, and popup actions work.
- Prepare screenshots: at least one new tab screenshot and one popup screenshot.
- Confirm listing claims match the extension behavior.
