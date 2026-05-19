# MarkTab

MarkTab 是一个 Chrome/Edge 新标签页扩展，把浏览器书签整理成快速、清晰、隐私友好的书签工作台。

## 功能

- 按用户自建书签文件夹自动分类
- 支持按标题和 URL 搜索书签
- 支持 Google、Baidu、Bing、DuckDuckGo 搜索
- 支持隐藏和恢复不想展示的分类
- 支持多套主题切换
- 使用 Chrome 内置 favicon 服务显示网页图标，失败时自动回退到首字母
- 弹出窗口可查看统计、打开新标签页、添加当前页面为书签
- 使用本地图标和系统字体，不向第三方发送书签标题、URL 或域名
- Manifest V3，无框架依赖

## 安装

### 从 GitHub Release 安装

1. 下载最新 release 中的 `marktab-1.1.0.zip`
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
| `Ctrl/Cmd + K` | 聚焦搜索框 |
| `Esc` | 清除搜索或关闭面板 |

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `bookmarks` | 读取书签树、展示书签、统计数量，并在用户点击时添加当前页面为书签 |
| `favicon` | 使用 Chrome 内置 favicon 服务显示书签对应网站图标 |
| `storage` | 保存默认搜索引擎、隐藏分类、主题、侧边栏折叠状态 |
| `activeTab` | 仅在用户点击「添加当前页面」时读取当前标签页标题和 URL |

## 隐私

MarkTab 不会把书签标题、书签 URL、分类名称或设置数据发送到开发者服务器。用户主动提交网页搜索时，搜索关键词会发送给所选择的搜索引擎。

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

打包 release zip：

```bash
mkdir -p dist
zip -r dist/marktab-1.1.0.zip manifest.json newtab.html newtab.js styles.css popup.html popup.js icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png
```

## License

MIT
