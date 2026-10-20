# MarkTab 隐私政策

最后更新：2026-10-15

MarkTab 是一个用于在 Chrome 新标签页展示、搜索和整理本地浏览器书签的扩展，当前版本 3.0.0。

## 一句话总结

MarkTab 没有账号、没有服务器、没有分析、没有遥测、没有跟踪，也不会发起自己的网络请求。所有数据
都留在你的浏览器里。完整说明见下文。

## 数据使用

MarkTab 通过浏览器书签 API 读取书签树，用于在新标签页和弹窗中展示书签、文件夹、数量和搜索结果。
读取发生在本地内存中，用于构建搜索索引。

MarkTab 会保存少量属于它自己的数据：

- 偏好设置（`marktab:settings:v3`，保存在浏览器同步存储 `chrome.storage.sync`）：主题、语言、密度、
  动效、导航栏折叠状态、首页各区域的显示开关与数量、文件夹视图与排序、被隐藏的文件夹 ID、搜索引擎
  选择、是否在新标签页打开、是否显示站点图标。
- MarkTab 自己的数据（`marktab:data:v3`，保存在浏览器本地存储 `chrome.storage.local`）：固定书签
  列表（含顺序）和通过 MarkTab 打开的书签记录（去重后最多 200 条）。
- 两个仅在设备本地保存的键（`localStorage`）：`marktab.appearance.v3`（首屏绘制缓存，用于避免主题
  闪烁）和 `marktab.onboarding.v3`（首次使用引导是否已确认）。

这些数据只用于在你自己的浏览器中保持 MarkTab 的使用体验一致。用户可以随时在「设置 → 数据」中导出
（导出内容不包含浏览器书签）、导入或重置这些数据；卸载扩展也会一并移除它们。

## 数据不会离开浏览器

- MarkTab 不会把书签标题、书签 URL、域名、文件夹名称、隐藏文件夹、固定书签、最近访问记录、搜索词
  或设置数据发送给开发者或任何第三方服务器。
- MarkTab 自身不发起任何网络请求。发布脚本会在打包时检查每个 JS 文件，如果出现 `fetch(`、
  `XMLHttpRequest`、`eval(`、`new Function(`、`document.write(` 或分析/遥测 SDK 的标识，验证就会失败。
- MarkTab 不会出售、出租或共享用户数据给广告平台、数据经纪商或其他第三方。
- MarkTab 不读取、不修改任何网页内容：清单中没有 `host_permissions`，没有 `optional_permissions`，
  也没有内容脚本。

两类数据会离开扩展环境，它们都由用户主动触发，属于功能本身的预期行为：

1. **网页搜索**：当你主动提交搜索时，搜索词会交给你在浏览器中配置的默认搜索引擎（或你在设置中选择的
   引擎）处理。该请求由浏览器发起，而不是由 MarkTab 收集或转发。
2. **打开的链接**：当你打开一个书签时，浏览器会按正常方式访问该网址。

## 站点图标

MarkTab 使用浏览器内置的 favicon 服务（`chrome://favicon` / 扩展页 `/_favicon/`）显示书签对应网站的
图标。图标由浏览器从其本地缓存中解析，MarkTab 不会为获取图标而访问任何网站；解析失败时界面会回退到
首字母图标。这也是 MarkTab 不需要主机权限的原因。

## 远程代码

MarkTab 不加载、不执行远程托管的代码。扩展的 HTML、CSS、JavaScript、样式、语言文件和图标资源全部随
扩展包一起提供；HTML 中不允许出现内联脚本、内联事件处理器或远程脚本／样式引用，且发布校验会强制检查
这些约束。

## 权限说明

MarkTab 的权限固定为五项，每一项都对应可验证的功能：

- `bookmarks`：读取书签树以建立索引、展示书签与文件夹并统计数量；只有在你主动操作（例如在弹窗中
  「收藏当前页面」，或重命名、移动、删除书签）时才会写入书签。
- `favicon`：使用浏览器内置的 favicon 服务显示书签对应网站的图标。
- `search`：只在你主动提交网页搜索时，通过浏览器搜索 API 使用你的默认搜索引擎。
- `storage`：保存上文列出的偏好设置与 MarkTab 自身数据。
- `activeTab`：只在你点击弹窗中的「收藏当前页面」时读取当前标签页的标题和网址，用于创建书签。

MarkTab 不申请 `tabs` 权限（它会暴露所有打开标签页的网址），也不申请任何主机权限、可选权限或内容脚本
权限。

## 从 MarkTab 2.x 升级

从 MarkTab 2.x 升级时，扩展会读取旧版存储键 `markTabSettings` 和 `rainbowBookmarkSettings`，把其中
能识别的偏好映射到 3.0.0 的数据结构一次。旧键会被保留、不会被改写，也不会被删除，因此升级不会破坏你
原有的数据。

## 联系方式

隐私问题请通过 GitHub Issues 反馈：

https://github.com/halunhaku/marktab/issues

---
---

# MarkTab Privacy Policy

Last updated: 2026-10-15

MarkTab is a browser extension for displaying, searching and organising local Chrome bookmarks
on the new tab page. Current version: 3.0.0.

## Summary

No account, no server, no analytics, no telemetry, no tracking, and no network request of its
own. Everything stays in your browser. The details follow.

## Data use

MarkTab reads the bookmark tree through the browser's bookmark API to display bookmarks,
folders, counts and search results on the new tab page and in the popup. The read happens in
local memory and feeds the search index.

MarkTab saves a small amount of data of its own:

- **Preferences** (`marktab:settings:v3`, in `chrome.storage.sync`): theme, language, density,
  motion, rail collapsed state, home-section visibility and counts, folder view and sort mode,
  hidden folder IDs, search engine choice, open-in-new-tab and show-favicons.
- **MarkTab's own data** (`marktab:data:v3`, in `chrome.storage.local`): the pinned bookmark list
  (including its order) and the bookmarks opened through MarkTab, deduplicated and capped at 200
  entries.
- **Two device-local keys** (`localStorage`): `marktab.appearance.v3` (a first-paint cache that
  prevents a theme flash) and `marktab.onboarding.v3` (whether the first-run card was
  acknowledged).

This data exists only to keep MarkTab consistent in your browser. You can export it from
Settings → Data at any time (the export never includes your browser bookmarks), import it back,
or reset it there; uninstalling the extension removes it as well.

## Data does not leave the browser

- MarkTab does not send bookmark titles, bookmark URLs, hosts, folder names, hidden folders,
  pins, recent visits, search terms or settings to the developer or to any third-party server.
- MarkTab makes no network request of its own. At packaging time every JavaScript file is
  checked, and the build fails if it contains `fetch(`, `XMLHttpRequest`, `eval(`,
  `new Function(`, `document.write(` or any analytics/telemetry SDK identifier.
- MarkTab does not sell, rent or share user data with advertising platforms, data brokers or
  any other third party.
- MarkTab does not read or modify page content: the manifest declares no `host_permissions`, no
  `optional_permissions` and no content scripts.

Two flows leave the extension environment. Both are initiated by you and are the expected
behaviour of the feature:

1. **Web search** — when you submit a search, the query is handled by the default search engine
   configured in your browser (or the engine you picked in Settings). The browser makes that
   request; MarkTab neither collects nor relays it.
2. **Opening a link** — when you open a bookmark, the browser visits that URL as usual.

## Site icons

MarkTab displays bookmark icons through the browser's built-in favicon service
(`chrome://favicon` / the extension-page `/_favicon/` endpoint). The icon is resolved by the
browser from its own local cache; MarkTab never contacts a site to fetch an icon, and the
interface falls back to a letter tile when resolution fails. This is why MarkTab needs no host
permission.

## Remote code

MarkTab does not load or execute remotely hosted code. The extension's HTML, CSS, JavaScript,
styles, locale files and icon assets are all packaged with the extension. Inline scripts, inline
event handlers and remote script/stylesheet references are rejected by the release validation.

## Permissions

MarkTab requests exactly five permissions, each tied to verifiable behaviour:

- `bookmarks`: reads the bookmark tree to build the index, display bookmarks and folders, and
  count them; it writes a bookmark only in response to an explicit action of yours (such as
  "bookmark the current page" in the popup, or renaming, moving or deleting a bookmark).
- `favicon`: displays bookmark icons through the browser's built-in favicon service.
- `search`: uses your default search engine through the browser's search API, only when you
  actively submit a web search.
- `storage`: saves the preferences and MarkTab-owned data described above.
- `activeTab`: reads the current tab's title and URL only when you click "bookmark the current
  page" in the popup, so that action can create the bookmark.

MarkTab does not request `tabs` (which would expose the URL of every open tab), nor any host
permission, optional permission or content-script access.

## Upgrading from MarkTab 2.x

On upgrade, MarkTab reads the legacy storage keys `markTabSettings` and
`rainbowBookmarkSettings` once and maps the preferences it recognises onto the 3.0.0 model. The
legacy keys are left in place: they are never rewritten and never deleted, so the upgrade cannot
destroy your existing data.

## Contact

For privacy questions, contact the developer through GitHub Issues:

https://github.com/halunhaku/marktab/issues
