# MarkTab

MarkTab 是一个 Chrome/Edge 新标签页扩展，把浏览器书签整理成一个安静、快速、隐私友好的书签启动器（Bookmark Launcher）。

## 功能

- **搜索优先** — Spotlight 风格搜索面板，按书签/文件夹/网页搜索分组展示，键盘全程可操作
- **按文件夹浏览** — 左侧栏 + 右侧内容区的文件夹视图，支持文件夹内联搜索过滤
- **网页搜索** — 使用 Chrome 默认搜索引擎，尊重用户浏览器设置，不自行选择或重定向
- **置顶常用书签** — 首页 Pinned 区域，3 列卡片展示，少量时显示占位提示
- **最近访问** — 紧凑列表展示最近打开的书签，辅助快速回溯
- **文件夹入口** — 首页胶囊按钮展示所有文件夹，一键进入
- **主题系统** — Light ☀️ / Dark 🌙 / System 🖥️ 跟随系统三套主题 + 5 种强调色（Sage / Teal / Rose / Stone / Warmth）
- **Favicon** — 使用 Chrome 内置 favicon 服务，加载失败自动回退到首字母
- **弹出窗口** — 查看书签统计、打开新标签页、添加当前页面为书签、管理书签
- **隐私优先** — 不向第三方发送书签标题、URL、域名或设置数据
- **Manifest V3**，无框架依赖

## 安装

### 从 GitHub Release 安装

1. 下载最新 release 中的 `marktab-1.3.0.zip`
2. 解压到本地文件夹
3. 打开浏览器扩展管理页面：
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
4. 开启「开发者模式」
5. 点击「加载已解压的扩展程序」
6. 选择解压后的 MarkTab 文件夹

### 从源码安装

1. 克隆或下载本仓库
2. 打开 `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目根目录

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `/` 或 `Ctrl/Cmd + K` | 聚焦搜索 |
| `↑ / ↓` | 在搜索面板中导航结果 |
| `Enter` | 打开选中的书签或文件夹 |
| `Shift + Enter` | 使用 Chrome 默认搜索引擎搜索网页 |
| `Esc` | 关闭搜索面板

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `bookmarks` | 读取书签树、展示书签、统计数量，并在用户点击时添加当前页面为书签 |
| `favicon` | 使用 Chrome 内置 favicon 服务显示书签对应网站图标 |
| `search` | 在用户主动提交网页搜索时，通过 Chrome Search API 使用浏览器默认搜索引擎 |
| `storage` | 保存隐藏分类、置顶书签、主题、侧边栏折叠状态 |
| `activeTab` | 仅在用户点击「添加当前页面」时读取当前标签页标题和 URL |

## 隐私

MarkTab 不会把书签标题、书签 URL、分类名称或设置数据发送到开发者服务器。用户主动提交网页搜索时，搜索关键词会通过 Chrome Search API 发送给用户在浏览器中设置的默认搜索引擎。

完整说明见 [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)。

## 开发

核心文件：

```text
manifest.json
newtab.html
newtab.js
styles.css
popup.html
popup.js
icons/icon16.png
icons/icon32.png
icons/icon48.png
icons/icon128.png
```

验证发布状态：

```bash
npm run validate
```

打包 release zip：

```bash
npm run package
```

生成文件会输出到 `dist/marktab-1.3.0.zip`。发布前请同时检查 [CHROME_STORE_SUBMISSION.md](./CHROME_STORE_SUBMISSION.md)。

查看发布包内容：

```bash
npm run inspect:zip
```

更新商店截图：

```bash
npm run screenshots
```

同步更新版本号：

```bash
npm run bump -- 1.1.1
```

## License

MIT
