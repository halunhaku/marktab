# MarkTab → 标准 HALUNHAKU 设计迁移

> **状态**:已确认设计,待写实施计划
> **日期**:2026-06-19
> **目标**:将 MarkTab 的视觉系统从"暖纸 + sage green + 圆体 + 玻璃拟态"变体,完全迁移到标准 HALUNHAKU 设计语言(见 `../../../DESIGN_SYSTEM.md`)。
> **决策原则**:完全跟随标准,不做暖纸变体。

---

## 0. 背景与决策摘要

MarkTab 原本是 HALUNHAKU 家族的一个"暖纸变体":背景 `#f7f5f0`、强调色 sage green `#6b9b7a`、标题用 SF Pro Rounded 圆体、卡片大量使用 `backdrop-filter` 玻璃拟态、圆角偏小(6/10/14/20px)。

本次迁移的目标是**完全跟随标准 HALUNHAKU**:`#f6f8f3` 背景、森林绿 `#2f6f4e` 单一强调色、衬线标题、纯白实卡、20-28px 圆角、禁玻璃拟态。

### 关键决策记录(逐条经用户确认)

| # | 决策点 | 选择 |
|---|---|---|
| 1 | 时钟元素字体 | 保留时钟,用 `--mono`(标准"日期/数字"映射) |
| 2 | 字体加载方式 | A. 纯本地字体回退,不打包字体文件(符合 MV3 + 小巧原则) |
| 3 | 卡片玻璃拟态 | 完全改成纯白实卡,删 backdrop-filter(标准禁玻璃拟态) |
| 4 | 圆角体系 | 整体提至 20-28px;kbd 键帽保留 5-7px(拟物例外) |
| 5 | favicon 回退字母 | B. 保留绿色首字母(功能性强调,非装饰),字体改 mono |
| 6 | 主题系统 | light/dark/system 不变;light/dark 配色换标准值 |
| 7 | ACCENTS 多色选择器 | A. 移除,锁定森林绿 `#2f6f4e` |
| 8 | 实现策略 | A. 原地重写 styles.css token + 逐组件迁移,不留中间态 |
| 9 | Recent item 圆角 | 12px(归类列表行/输入框,非卡片) |
| 10 | mark 高亮圆角 | 保留 2-3px(字符级例外,和 kbd 同理) |
| 11 | Spotlight 弹窗动画 | scale 减弱到 0.98 + ease-out(替代 spring) |
| 12 | Cloudflare 官网落地页 | 纳入本次迁移,与扩展界面同一 HALUNHAKU 视觉语言 |
| 13 | 商店提交文档 | 更新,删除 accent color 测试说明,保持提交材料与产品行为一致 |
| 14 | 版本号 | 定为 `1.4.0`,视觉系统迁移按 minor 版本处理 |

### 实施前已纠正的事实错误

1. **MarkTab 没有 Paper 主题选项**。`THEMES`(newtab.js:7-11)已是 light/dark/system 三选项,system→data-theme 的 JS 翻译(newtab.js:156-166)已实现。第 2 节只改 CSS 配色值,不动切换器逻辑。
2. **设置面板 UI 已移除**(newtab.html:172 注释)。ACCENTS 选择器 UI 不存在,`newtab.js` 里的 ACCENTS 数组、`--accent-primary`/`--accent-rgb` 注入、`DEFAULTS.accent` 是死代码,只需清理。

---

## 1. Design Tokens 改写(styles.css 第 9-126 行)

### 1.1 色彩 token

```css
/* Light(替换 :root 与 :root[data-theme="light"]) */
--bg: #f6f8f3
--surface: #ffffff
--surface-soft: #f9fbf6
--text: #1f2722
--text-muted: #66736b
--text-faint: #9aa59e
--green: #2f6f4e
--green-dark: #1f5138
--green-soft: #e7f1ea
--green-border: #d7e5dc
--line: #e5ebe4
--error: #c97c5d
```

变量名重命名映射(全文件替换,不留旧名兼容):

| 旧名 | 新名 |
|---|---|
| `--bg-page` | `--bg` |
| `--bg-card` / `--bg-surface` | `--surface` |
| `--bg-sidebar` | `--surface` |
| `--bg-input` | `--surface-soft` |
| `--bg-hover` | `--green-soft`(交互态用) |
| `--bg-active` | `--green-soft` |
| `--accent` | `--green` |
| `--accent-hover` | `--green-dark` |
| `--accent-light` | `--green-soft` |
| `--accent-glow` | `rgba(47,111,78,0.18)` 或 `--green-soft` |
| `--accent-primary` / `--accent-rgb` | 删除(动态注入移除) |
| `--text-primary` | `--text` |
| `--text-secondary` | `--text-muted` |
| `--text-tertiary` | `--text-faint` |
| `--text-muted` | `--text-faint`(注意旧 muted≈faint) |
| `--text-on-accent` | `#ffffff` 字面值或保留别名 |
| `--border-light` | `--line` |
| `--border-med` | `--green-border` |
| `--border-subtle` / `--border-strong` | `--line` / `--green-border`(删除冗余别名) |

### 1.2 字体 token

```css
--serif: "Noto Serif SC", "Songti SC", "STSong", "Source Han Serif SC", Georgia, serif
--sans: "Geist", "Noto Sans SC", "PingFang SC", "Helvetica Neue", system-ui, sans-serif
--mono: "SFMono-Regular", "Menlo", "Consolas", "JetBrains Mono", monospace
```

- 删除 `--font-display`(SF Pro Rounded)
- `--font-body` → `--sans`
- `--font-mono` → `--mono`
- 新增 `--serif`(标题用)

### 1.3 圆角 token

```css
--radius-card: 20px      /* 原 --radius-xl */
--radius-card-lg: 24px   /* 新增 */
--radius-card-xl: 28px   /* 新增,弹窗用 */
--radius-input: 12px     /* 新增,输入框/列表行/小元素 */
--radius-pill: 999px     /* 原 --radius-full */
```

删除 `--radius-sm`(6px)、`--radius-md`(10px)、`--radius-lg`(14px)——均 < 8px 或偏小,违规。

### 1.4 阴影 token(偏绿,禁纯黑)

```css
--shadow-sm: 0 4px 16px rgba(37,58,43,0.05)
--shadow: 0 18px 50px rgba(37,58,43,0.08)
--shadow-hover: 0 24px 60px rgba(37,58,43,0.12)
```

替换 `--shadow-card` / `--shadow-elevated` / `--shadow-panel`,所有 `rgba(0,0,0,...)` 阴影改偏绿。

### 1.5 Dark 配色

`:root[data-theme="dark"]` 块整体替换为标准深色值(`#111214` / `#1a1d1c` / `#ececec` / `#4a9e6e` 等)。

### 1.6 动效 token

`--ease-out` / `--ease-spring` / `--duration-*` 保留(命名语义化,值符合标准)。`--ease-spring` 仅 Spotlight 弹窗使用,迁移时改为 `--ease-out`(决策 11)。

---

## 2. 全局基础与主题

### 2.1 body

```css
body {
  font-family: var(--sans);      /* 原 var(--font-body) */
  background: var(--bg);         /* 原 var(--bg-page) */
  color: var(--text);            /* 原 var(--text-primary) */
  font-size: 1rem;               /* 0.875rem → 1rem */
  line-height: 1.5;
}
```

`:focus-visible` outline 颜色 `--accent` → `--green`。

### 2.2 主题切换(基于纠正后的事实)

**切换器 UI 与 JS 逻辑不动**:`THEMES`、`applyTheme()`、`cycleTheme()`、system→data-theme 翻译均已正确。

**只改 CSS 配色值**:`:root`、`:root[data-theme="light"]`、`:root[data-theme="dark"]` 三块换标准值。

### 2.3 ACCENTS 移除(决策 A)

```js
// newtab.js 清理:
// 1. 删除 ACCENTS 数组(13-19 行)
// 2. applyTheme(themeId, accentId) → applyTheme(themeId)
//    删除 accent 查找、settings.accent 赋值、--accent-primary/--accent-rgb 注入
// 3. cycleTheme(): applyTheme(next, settings.accent) → applyTheme(next)
// 4. 初始化: applyTheme(settings.theme, settings.accent) → applyTheme(settings.theme)
// 5. DEFAULTS.accent 删除
```

CSS 所有 `var(--accent-primary)` / 动态注入引用统一改为 `var(--green)`。

### 2.4 settings.accent 残留

不主动迁移,让其自然失效(applyTheme 不再读它,无副作用)。

---

## 3. Home 视图(新标签页主页)

### 3.1 时钟区

```css
.home-clock { font-family: var(--mono); }   /* 原 var(--font-display) */
.home-date  { font-family: var(--mono); }
```

clamp 字号、letter-spacing 保留。

### 3.2 搜索卡

```css
.home-search-card {
  background: var(--surface);              /* 原半透明白 */
  border: 1px solid var(--line);
  border-radius: 20px;                     /* 16 → 20 */
  box-shadow: var(--shadow-sm);            /* 偏绿淡阴影 */
  /* backdrop-filter: blur(6px) 删除 */
}
.home-search-card:focus-within {
  border-color: var(--green-border);
  box-shadow: 0 0 0 3px var(--green-soft), var(--shadow);
}
```

搜索图标 `--accent` → `--green`。

### 3.3 kbd / hint badge

```css
.home-search-hint-badge { border-radius: 7px; }   /* 保留,拟物例外 */
.home-search-hints kbd { border-radius: 5px; }     /* 保留 */
```

仅颜色 token 替换。

### 3.4 Section 标签

```css
.home-section-label {
  font-size: 0.75rem;      /* 0.69 → 0.75 */
  font-weight: 600;        /* 500 → 600 */
  color: var(--text-faint); /* 删除 rgba(0,0,0,0.3) 硬编码 */
}
/* 删除 :root[data-theme="light"] .home-section-label 硬编码覆盖 */
```

### 3.5 Pinned 卡片

```css
.home-card {
  background: var(--surface);          /* 原半透明 */
  border: 1px solid var(--line);
  border-radius: 20px;                 /* 14 → 20 */
  box-shadow: var(--shadow-sm);
}
.home-card:hover {
  border-color: var(--green-border);
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}
```

`.home-card-favicon` 圆角 6 → 12(`--radius-input`);hover 的 `scale(1.04)` **保留**(卡片内图标微缩放属于交互反馈,非卡片本体 hover,可接受;若严格遵循标准可改为无 scale——实施时确认)。

`.home-card-favicon-letter`:圆体 → mono,`--accent` → `--green`。

### 3.6 Recent 列表(决策 9)

```css
.home-recent-item {
  background: var(--surface-soft);     /* 原半透明 */
  border: 1px solid var(--line);
  border-radius: var(--radius-input);  /* 10 → 12,列表行 */
}
.home-recent-item:hover {
  background: var(--surface);
  border-color: var(--green-border);
}
```

Recent item 归类为"列表行"用 12px,不用 20px。

### 3.7 favicon 容器与回退字母(决策 5)

```css
.home-recent-favicon {
  border-radius: var(--radius-input);  /* 6 → 12 */
  background: var(--green-soft);       /* 浅绿底衬托首字母 */
}
.home-recent-favicon-letter {
  font-family: var(--mono);            /* 圆体 → mono */
  color: var(--green);                 /* 保留绿色 */
}
```

### 3.8 folder pills / loading / FAB / 动画

- `.home-folder-pills`:`--surface` + `--line`,圆角 16 → 20
- `.folder-pill`:已是 999px,token 替换;count 徽章 token 替换
- `.home-fab`:见第 7 节
- `.loading-dot`:`--accent` → `--green`;dotPulse 的 scale 保留(加载动效)
- `viewEnter` / `sectionEnter`:保留(与标准 reveal-up 一致)

---

## 4. Folder 视图

### 4.1 侧边栏

```css
.folder-sidebar {
  background: var(--surface);          /* 原半透明 rgba(255,255,255,0.6) */
  border-right: 1px solid var(--line);
  /* backdrop-filter: blur(12px) 删除 */
}
```

### 4.2 品牌区

```css
.sidebar-brand { font-family: var(--serif); }   /* 原圆体 */
.sidebar-logo {
  background: var(--green-soft);
  border-radius: var(--radius-input);  /* 6 → 12 */
  color: var(--green);
}
```

### 4.3 导航项(胶囊化)

```css
.sidebar-nav-item { border-radius: var(--radius-pill); }  /* 10 → 999 */
.sidebar-nav-item:hover { background: var(--green-soft); color: var(--green-dark); }
.sidebar-nav-item.active {
  background: var(--green-soft); color: var(--green-dark); font-weight: 600;
}
```

标准导航项要求胶囊。这是最明显的圆角化改动。

### 4.4 工具按钮

```css
.folder-tool-button { border-radius: var(--radius-pill); }  /* 10 → 999 */
.folder-tool-button:hover,
.folder-tool-button.active {
  background: var(--green-soft);
  border-color: var(--green-border);
  color: var(--green);
}
```

### 4.5 搜索框

```css
.folder-search-box {
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);   /* 14 → 999 */
  box-shadow: var(--shadow-sm);
}
.folder-search-box:focus-within {
  border-color: var(--green-border);
  box-shadow: 0 0 0 3px var(--green-soft);
}
```

### 4.6 文件夹标题

```css
.folder-title {
  font-family: var(--serif);    /* 圆体 → 衬线 */
  font-size: 1.5rem;            /* 1.4 → 1.5 */
  font-weight: 500;
}
```

### 4.7 文件夹卡片

```css
.folder-card {
  background: var(--surface);          /* 原半透明 */
  border: 1px solid var(--line);
  border-radius: 20px;                 /* 14 → 20 */
  box-shadow: var(--shadow-sm);
}
.folder-card::after { content: none; } /* 删除玻璃高光伪元素 */
.folder-card:hover {
  border-color: var(--green-border);
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}
.folder-card-favicon { border-radius: var(--radius-input); }  /* 10 → 12 */
.folder-card-favicon-letter { font-family: var(--mono); color: var(--green); }
```

### 4.8 pin 按钮

```css
.folder-card-pin.pinned,
.folder-card-pin:hover {
  color: var(--green); background: var(--green-soft);
}
```

圆角 50% 保留(圆形按钮)。favicon hover 的 `scale(1.04)` 同 3.5 处理。

---

## 5. Spotlight 搜索面板

### 5.1 遮罩(保留 backdrop-filter,标准例外)

```css
.search-panel-overlay {
  background: rgba(0, 0, 0, 0.4);   /* 0.3 → 0.4,标准遮罩 */
  backdrop-filter: blur(4px);       /* 保留,遮罩例外 */
}
```

### 5.2 面板本体

```css
.search-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 28px;              /* 20 → 28,标准弹窗 */
  box-shadow: var(--shadow-hover);  /* 偏绿深阴影 */
}
@keyframes panelSlide {
  from { opacity: 0; transform: translateY(-20px) scale(0.98); }  /* 0.97 → 0.98,spring → ease-out */
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
/* .search-panel 的 animation: panelSlide 0.25s var(--ease-spring) → var(--ease-out) */
```

### 5.3 结果项

```css
.search-result-item { border-radius: var(--radius-input); }  /* 10 → 12 */
.search-result-item:hover { background: var(--green-soft); }
.search-result-item.selected { background: var(--green-soft); }
.search-result-favicon { border-radius: var(--radius-input); }  /* 6 → 12 */
.search-result-favicon-letter { font-family: var(--mono); color: var(--green); }
```

### 5.4 高亮(决策 10,字符级例外)

```css
.search-result-title mark,
.search-result-sub mark {
  background: var(--green-soft);
  color: var(--green-dark);
  border-radius: 2px;   /* 保留小圆角,字符级装饰 */
}
```

### 5.5 网页搜索入口

```css
.search-result-web { border-radius: var(--radius-input); border-top: 1px solid var(--line); }
.search-result-web-icon { background: var(--green-soft); color: var(--green); }
.search-result-web-text { color: var(--green); }
```

### 5.6 空状态 / tip kbd

```css
.search-panel-empty { padding: var(--gap-3xl) var(--gap-lg); }
.search-panel-empty p { color: var(--text-muted); }
.search-panel-empty svg { opacity: 0.4; }
.search-panel-tip kbd { border-radius: 3px; }   /* 保留,拟物例外 */
```

---

## 6. Popup 扩展弹窗

### 6.1 背景(决策:删径向渐变)

```css
.popup-page {
  background: var(--bg);    /* 删除 radial-gradient 装饰背景 */
  font-family: var(--sans);
}
```

### 6.2 logo / 标题 / 版本

```css
.popup-logo { border-radius: var(--radius-input); box-shadow: var(--shadow-sm); }
.popup-title { font-family: var(--serif); font-weight: 400; }   /* 圆体 700 → 衬线 400 */
.popup-version { background: var(--green-soft); color: var(--green-dark); }
```

### 6.3 统计卡(标准统计数字特征)

```css
.popup-stat-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;                     /* 14 → 20 */
  box-shadow: var(--shadow-sm);
}
.popup-stat-value {
  color: var(--green);
  font-family: var(--serif);               /* 圆体 → 衬线 */
  font-weight: 400;                        /* 700 → 400 */
}
```

### 6.4 主按钮

```css
.popup-button-primary {
  background: var(--green);
  box-shadow: var(--shadow-sm);            /* 删彩色光晕阴影 */
}
.popup-button-primary:hover {
  background: var(--green-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
```

### 6.5 次按钮(绿色边框)

```css
.popup-button-secondary {
  background: var(--surface);
  border: 1px solid var(--green-border);
  color: var(--green-dark);
}
.popup-button-secondary:hover {
  background: var(--green-soft);
  transform: translateY(-2px);
}
```

### 6.6 快捷键区

```css
.popup-shortcut {
  border-radius: 20px;              /* 14 → 20 */
  background: var(--surface-soft);
  border: 1px solid var(--line);
}
.popup-shortcut kbd { border-radius: 5px; }   /* 保留,拟物例外 */
```

### 6.7 popup toast(反色保留)

```css
.popup-toast {
  background: var(--text);
  color: var(--surface);
  box-shadow: var(--shadow);
  border-radius: var(--radius-pill);
}
```

### 6.8 popup 局部 dark

`@media (prefers-color-scheme: dark) { .popup-page { ... } }`(第 2099-2114 行)整套换标准 dark 值,变量名跟着 token 重命名走。

---

## 7. 设置残留清理 + FAB + 滚动条

### 7.1 死代码清理(设置面板 UI 已不存在)

```js
// newtab.js:见第 2.3 节
```

```css
/* styles.css 删除(无 HTML 引用):
   - .theme-options / .theme-option 及相关
   - 第 2242-2244 行 .theme-options 移动端规则
   - 任何引用 --accent-primary / --accent-rgb 的残留 */
```

### 7.2 FAB

```css
.home-fab {
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-sm);
  border-radius: 50%;        /* 圆形保留 */
}
.home-fab:hover {
  background: var(--green-soft);
  border-color: var(--green-border);
  color: var(--green);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
```

### 7.3 folder-empty

实施时核实现有样式,按标准空状态规范补齐(padding 48px、muted/faint、虚线框)。

### 7.4 滚动条

```css
::-webkit-scrollbar { width: 6px; height: 6px; }   /* 保留 */
::-webkit-scrollbar-thumb { background: var(--line); border-radius: var(--radius-pill); }
::-webkit-scrollbar-thumb:hover { background: var(--text-faint); }
```

### 7.5 loading dots

`.loading-dot { background: var(--green); }`,dotPulse scale 保留(加载动效)。

---

## 8. 文档与迁移

### 8.1 README

```markdown
| 主题外观 | Light、Dark、System 三种主题，森林绿单一强调色。 |
```

删除所有 accent 多色描述。

### 8.2 AGENTS.md 新增 Visual Language 段落

注意:以下段落写入项目根目录 `AGENTS.md`,所以设计系统路径使用 `./DESIGN_SYSTEM.md`。

```markdown
## Visual Language

MarkTab follows the HALUNHAKU design system (see ./DESIGN_SYSTEM.md):
- Single forest-green accent (#2f6f4e), no multi-color accent selector.
- Serif headings (Noto Serif SC), sans body, mono for dates/numbers/clock.
- White cards with 20-28px radius, 1px green-gray borders, soft green-tinted shadows.
- No glassmorphism except search overlay backdrop; no decorative gradients.
```

### 8.3 隐私 / 权限 / 商店文档

`PRIVACY_POLICY.md` 不动(不涉及新权限、不改变数据流)。

`CHROME_STORE_SUBMISSION.md` 要更新,因为当前文档仍提到 accent color:

```markdown
- Settings: theme switching, folder visibility toggles
- Verify all settings persist after reload (theme, hidden folders, pinned bookmarks).
```

删除所有 `accent color` / `theme, accent` 的提交测试说明,避免商店材料描述已经移除的设置项。

### 8.4 Cloudflare 官网落地页

`cloudflare/marktab-home-worker.js` 纳入本次迁移范围。它是 MarkTab 对外展示页面,当前仍包含圆体标题、旧圆角、黑色阴影和玻璃拟态,如果不迁移会造成品牌视觉不一致。

迁移要求:

- 字体 token 跟随 `DESIGN_SYSTEM.md`:标题 `--serif`,正文 `--sans`,数字/元信息 `--mono`。
- 颜色 token 使用标准 HALUNHAKU light/dark 值,森林绿为唯一强调色。
- 卡片、下载面板、截图展示容器改为纯白/深色实卡 + 绿色偏色阴影。
- 删除非必要 `backdrop-filter`;官网 header 若保留毛玻璃,需按 `DESIGN_SYSTEM.md` 导航例外处理,不能扩散到卡片。
- 保留现有 GitHub release、隐私政策和截图 URL 逻辑,不改变 Worker 路由或外部数据流。
- `scripts/bump-version.mjs` 已会同步 `FALLBACK_VERSION`,版本号更新时要继续覆盖该文件。

### 8.5 截图与商店素材

视觉迁移后必须刷新并人工检查图片素材:

- `npm run screenshots` 更新 `store-assets/`。
- README 中的 `screenshots/` 如果仍用于项目展示,需要同步更新 Home / Pinned / Recent / Spotlight / Folder / Popup 六张视图截图。
- Cloudflare 官网读取 `screenshots/` 下的远程 raw 图片;若官网也发布,截图更新需随代码一起提交并部署后验证。

### 8.6 版本号

执行迁移时运行 `npm run bump -- 1.4.0`。视觉系统迁移属于 minor 版本,该版本号同步 `package.json`、`manifest.json`、README、popup 和 Cloudflare Worker fallback version。

---

## 例外清单(经确认偏离标准最小圆角/动效的点)

| 元素 | 偏离 | 理由 |
|---|---|---|
| kbd 键帽 / hint badge | 圆角 5-7px(<8px) | 拟物按键语义,非装饰圆角 |
| mark 文本高亮 | 圆角 2-3px | 字符级装饰,强制放大破坏识别 |
| Spotlight 弹窗 | scale(0.98) 收缩 | 弹窗展开反馈,减弱后的例外 |
| favicon hover | scale(1.04) | 卡片内图标微缩放,非卡片本体(实施时确认是否保留) |
| loading dots | scale 脉冲 | 加载指示器固有动效,非 hover |
| popup toast | 反色(深底浅字) | toast 通用模式,标准未禁止 |

---

## 不在范围内

- 不重构 styles.css 架构(不拆分多文件)
- 不打包字体文件(纯本地回退)
- 不新增功能、不改交互逻辑(除 ACCENTS 移除)
- 不动 bookmark/search/popup 的 JS 业务逻辑
- 不新增权限,不改变隐私数据流,不改变网页搜索提交路径
- 不改 Cloudflare Worker 的发布渠道、GitHub release 查询逻辑或截图 URL 结构(只改视觉与版本文案)

---

## 验证清单(实施后)

- [ ] `npm run validate` 通过
- [ ] `npm run package` 生成 dist 包
- [ ] `npm run screenshots` 更新 `store-assets/` 并人工检查截图
- [ ] 浏览器加载扩展,检查 Home / Folder / Spotlight / Popup 四个视图
- [ ] Light / Dark / System 三主题切换正常
- [ ] 检查所有 backdrop-filter 已移除(除 search overlay)
- [ ] 检查无 `rgba(0,0,0,...)` 纯黑阴影残留
- [ ] 检查无 `--accent` / `--font-display` / `--bg-page` 等旧 token 残留
- [ ] 检查 ACCENTS 死代码已清理
- [ ] README / AGENTS.md / CHROME_STORE_SUBMISSION.md 已更新
- [ ] `cloudflare/marktab-home-worker.js` 已迁移到标准 HALUNHAKU 视觉语言
- [ ] README 截图与 Cloudflare 官网引用截图均反映新视觉
- [ ] 版本号已 bump 到 `1.4.0`,并确认 `dist/marktab-1.4.0.zip` 生成
