# MarkTab 隐私政策

最后更新：2026-06-26

MarkTab 是一个用于在 Chrome 和 Microsoft Edge 新标签页展示、搜索和整理本地浏览器书签的扩展。

## 数据使用

MarkTab 会读取浏览器书签，用于在新标签页和弹出窗口中展示书签、文件夹数量、分类列表和搜索结果。

MarkTab 会保存少量设置数据，包括隐藏的分类 ID、置顶书签 URL、最近通过 MarkTab 打开的书签 URL、主题和其他界面偏好。这些设置通过浏览器扩展存储保存，用于在同一浏览器或浏览器同步环境中保留用户偏好。

MarkTab 会使用浏览器内置 favicon 服务显示书签对应网站图标。图标加载失败时，界面会回退到首字母图标。

## 数据传输

MarkTab 不会把书签标题、书签 URL、文件夹名称、最近访问记录、搜索记录或设置数据发送到开发者服务器。

MarkTab 不会出售、出租或共享用户数据给广告平台、数据经纪商或其他第三方。

用户主动在搜索框中提交网页搜索时，MarkTab 会通过浏览器搜索 API 使用用户在浏览器中设置的默认搜索引擎。这是网页搜索功能的预期行为。

## 远程代码

MarkTab 不加载或执行远程托管代码。扩展的 HTML、CSS、JavaScript、语言文件和图标资源都随扩展包一起提供。

## 权限说明

- `bookmarks`：读取书签树、展示书签和文件夹，并在用户主动点击“添加当前页面”时创建书签。
- `favicon`：使用浏览器内置 favicon 服务显示书签对应网站图标。
- `search`：在用户主动提交网页搜索时，通过浏览器搜索 API 使用浏览器默认搜索引擎。
- `storage`：保存用户设置，例如隐藏分类、置顶书签、最近访问记录和主题。
- `activeTab`：仅在用户点击扩展弹出窗口中的“添加当前页面”时读取当前标签页标题和 URL，用于创建书签。

## 联系方式

如需反馈隐私问题，请通过 GitHub Issues 联系开发者：

https://github.com/halunhaku/marktab/issues

---

# MarkTab Privacy Policy

Last updated: 2026-06-26

MarkTab is a browser extension for displaying, searching, and organizing local Chrome and Microsoft Edge bookmarks on the new tab page.

## Data Use

MarkTab reads browser bookmarks to display bookmarks, folder counts, folder lists, and search results on the new tab page and extension popup.

MarkTab saves a small amount of settings data, including hidden folder IDs, pinned bookmark URLs, recently opened bookmark URLs, theme, and other interface preferences. These settings are stored with browser extension storage so user preferences can persist in the same browser or browser sync environment.

MarkTab uses the browser's built-in favicon service to display website icons for bookmarks. If an icon fails to load, the interface falls back to a letter icon.

## Data Transfer

MarkTab does not send bookmark titles, bookmark URLs, folder names, recent visit records, search records, or settings data to developer servers.

MarkTab does not sell, rent, or share user data with advertising platforms, data brokers, or other third parties.

When a user actively submits a web search from the search box, MarkTab uses the browser search API with the user's default browser search engine. This is expected behavior for the web search feature.

## Remote Code

MarkTab does not load or execute remotely hosted code. The extension's HTML, CSS, JavaScript, locale files, and icon assets are packaged with the extension.

## Permissions

- `bookmarks`: Reads the bookmark tree, displays bookmarks and folders, and creates bookmarks only when the user explicitly adds the current page.
- `favicon`: Uses the browser's built-in favicon service to display bookmark icons.
- `search`: Uses the browser's default search engine through the browser search API only when the user actively submits a web search.
- `storage`: Saves user settings such as hidden folders, pinned bookmarks, recent visit records, and theme.
- `activeTab`: Reads the current tab only when the user clicks "Add current page" in the extension popup, so the extension can create a bookmark.

## Contact

For privacy questions, contact the developer through GitHub Issues:

https://github.com/halunhaku/marktab/issues
