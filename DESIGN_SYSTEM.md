# HALUNHAKU — 跨项目设计语言总规范

> 本文档是从 `creep_cal`、`my-cloudflare-blog`、`marktab` 三个项目的设计文件中提炼的**全局设计语言**。
> 它是所有新项目和跨项目重构的视觉基线。
> 每个项目可以在根目录维护自己的 `DESIGN.md` 作为该项目的具体约束（页面类型、组件清单等），但**不得违背本总规范**。
> 如果项目 DESIGN.md 与本总规范冲突，以本总规范为准，并在项目 DESIGN.md 中注明差异与原因。

---

## 0. 设计语言名称：HALUNHAKU

这套视觉系统的特征是：**暖白浅绿背景、白色卡片、森林绿单一强调色、衬线标题、极淡阴影、大量留白、克制动效**。

它定位在「文学阅读感」与「工具产品感」之间：
- **不是**传统模板（纸纹、水彩、厚重纹理）
- **不是**企业 SaaS（数据面板、多色图表、霓虹强调色）
- **不是**极简黑白（缺少温度）
- **是**：干净、圆润、克制、有产品感、带绿色温度的内容空间

---

## 1. 适用范围

本规范适用于：

| 项目 | 应用方式 |
|---|---|
| **my-cloudflare-blog** | 原生设计源，前台+后台+编辑器三态 |
| **creep_cal** | 工程计算工作台（信息密度更高，但同 token） |
| **marktab** | 浏览器新标签页扩展（暖纸主题变体） |
| **新项目** | 默认遵循本规范，除非有明确理由偏离 |
| **ima-extension** | **例外**：纯工具型扩展，使用中性 Inter 字体，不强制套用本规范 |

新项目从创建第一天起就应引入这份规范，避免后期重构。

---

## 2. 视觉关键词

| 关键词 | 含义 |
|---|---|
| **干净** | 暖白/浅绿背景，白色卡片，无噪点纹理、无重复图案 |
| **圆润** | 卡片圆角 20-28px，按钮/标签 999px，头像/图标 50% |
| **轻盈** | 阴影透明度极低（0.05-0.12），hover 仅微浮 |
| **克制** | 唯一强调色绿色；hover 仅变色/微位移，无缩放闪烁 |
| **绿色** | 主色森林绿，辅助浅绿背景，无多色系统 |
| **留白** | Section 间距 40px，卡片 padding 20-24px，最大宽度 1120px |
| **衬线** | 标题用 Noto Serif SC / Songti SC，正文用无衬线 |
| **温度** | 所有中性色偏暖绿/暖灰，不用纯灰纯黑 |
| **产品感** | 导航为悬浮药丸，按钮为胶囊，卡片统一圆角阴影 |
| **文学感** | 阅读宽度 720px，行高 1.9，温和引文块 |

---

## 3. 色彩系统

### 3.1 核心调色板（Light）

```css
--bg: #f6f8f3           /* 页面背景：暖白浅绿 */
--surface: #ffffff       /* 卡片/面板：纯白 */
--surface-soft: #f9fbf6  /* 次级表面：更暖浅绿 */
--text: #1f2722          /* 正文：深绿黑 */
--text-muted: #66736b    /* 弱文本：灰绿 */
--text-faint: #9aa59e    /* 极弱文本：浅灰绿 */
--green: #2f6f4e          /* 强调色：森林绿 */
--green-dark: #1f5138     /* 强调色深：hover/active */
--green-soft: #e7f1ea     /* 强调色淡：背景/标签/hover */
--green-border: #d7e5dc   /* 绿色边框 */
--line: #e5ebe4           /* 分割线/淡边框 */
--error: #c97c5d          /* 危险/删除：陶土色，非亮红 */
```

> MarkTab 的「暖纸主题」是允许的变体：背景 `#f7f5f0`，accent 用更柔和的 sage green `#6b9b7a`。气质一致，可视为本规范的暖纸分支。

### 3.2 深色模式（Dark）

```css
--bg: #111214            /* 近黑 */
--surface: #1a1d1c       /* 深色卡片 */
--surface-soft: #1e2120
--text: #ececec
--text-muted: #9a9e9a
--text-faint: #5d635d
--green: #4a9e6e          /* 深色模式绿色提亮 */
--green-dark: #3a8a5e
--green-soft: #1a2e24
--green-border: #2a4038
--line: rgba(232,235,230,0.08)
```

深色模式通过 `data-theme="dark"`（或 `:root[data-theme="dark"]`）切换，localStorage 持久化，支持 system / light / dark 三态。

### 3.3 阴影

```css
--shadow-sm: 0 4px 16px rgba(37,58,43,0.05)
--shadow: 0 18px 50px rgba(37,58,43,0.08)
--shadow-hover: 0 24px 60px rgba(37,58,43,0.12)
```

阴影**永远**偏绿色（`rgba(37,58,43,...)`），不用纯黑阴影。

### 3.4 色彩使用硬规则

1. **不新增第二种强调色**（不引入蓝、橙、紫作为强调）
2. **不用多色标签系统**（如 success 绿 / warning 黄 / error 红三色徽章）
3. **不用亮红**做危险操作；删除用陶土色 `#c97c5d`
4. 所有颜色从 CSS 变量引用，不硬编码 `#333` / `#f0f0f0`
5. 需精细透明度时（遮罩、阴影、叠加层）用 `rgba()`，但优先取自变量，如 `rgba(47,111,78,0.08)` 对应 `--green`

---

## 4. 字体系统

### 4.1 字体栈

```css
--serif: "Noto Serif SC", "Songti SC", "STSong", "Source Han Serif SC", Georgia, serif
--sans: "Geist", "Noto Sans SC", "PingFang SC", "Helvetica Neue", system-ui, sans-serif
--mono: "SFMono-Regular", "Menlo", "Consolas", "JetBrains Mono", monospace
```

### 4.2 字号字重规范

| 用途 | 字体 | 大小 | 字重 |
|---|---|---|---|
| Hero 大标题 | serif | `clamp(72px,10vw,132px)` | 400 |
| 页面标题 (h1) | serif | 1.8rem | 400 |
| Section 标题 | sans | 1.5rem | 500 |
| 文章标题 | serif | 1.2-1.35rem | 400 |
| 正文 | sans | 1rem | 400 |
| 卡片标题 | sans | 0.95rem | 500 |
| 小标签 | sans | 0.75rem | 600 |
| 导航项 | sans | 0.875rem | 450 |
| 标签/徽章 | sans | 0.75rem | 450 |
| 日期/元信息/数字 | mono | 0.7-0.75rem | 400 |

### 4.3 阅读体验

- 文章正文最大宽度：**720px**
- 行高：**1.9**（正文）/ 1.5（UI）
- 引文：左侧 2px 绿色竖线 + 斜体 + 浅灰文字

---

## 5. 布局与间距

```css
--content-max: 1120px;   /* 页面最大宽度 */
--read-max: 720px;       /* 阅读最大宽度 */
```

### 5.1 间距阶梯

| Token | 值 |
|---|---|
| Section padding | 40px 0（桌面）/ 32px 0（移动） |
| 卡片 gap | 16-24px（桌面）/ 12-16px（移动） |
| 卡片 padding | 20-24px（桌面）/ 16-20px（移动） |

### 5.2 圆角阶梯

| Token | 值 | 用途 |
|---|---|---|
| `--radius-card` | 20px | 小卡片 |
| `--radius-card-lg` | 24px | 中卡片 |
| `--radius-card-xl` | 28px | 主内容卡 / 弹窗 |
| `--radius-input` | 12px | 普通输入框 |
| `--radius-pill` | 999px | 按钮、标签、搜索框、导航项 |

**不使用**圆角 < 8px（即不使用直角）。

### 5.3 断点

```css
@media (max-width: 1024px) { /* 平板 */ }
@media (max-width: 768px)  { /* 手机 */ }
@media (max-width: 480px)  { /* 小屏手机 */ }
```

---

## 6. 核心组件规范

### 6.1 导航 Header

- **悬浮药丸**：`position: sticky; top: 16px; border-radius: 999px; backdrop-filter: blur(18px)`
- 三段式：左(logo+品牌) + 中(导航项) + 右(主题切换+菜单)
- 导航项为胶囊：`border-radius: 999px; padding: 8px 14px`
- hover/active：`background: var(--green-soft); color: var(--green-dark)`
- 移动端隐藏中间导航，右侧汉堡菜单 + 毛玻璃抽屉
- **禁止**：下划线式导航、无圆角顶部 bar、桌面端显示汉堡按钮

### 6.2 卡片（通用基类）

```css
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: var(--shadow-sm);
  padding: 20px 24px;
}
.card:hover {                /* 可交互卡片 */
  border-color: var(--green-border);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
```

### 6.3 按钮

| 类型 | 样式 |
|---|---|
| **主按钮** | `background: var(--green); color: #fff; border-radius: 999px; padding: 10px 24px` |
| **次按钮** | `background: var(--surface); border: 1px solid var(--green-border); color: var(--green-dark); border-radius: 999px` |
| **删除按钮** | `border: 1px solid rgba(201,124,93,0.3); color: var(--error)` 弱危险色 |
| **滤镜/分页** | `border: 1px solid var(--line); border-radius: 999px`，active 绿色背景 |

**禁止**：直角按钮、填充过重的次按钮、大面积红色。

### 6.4 输入框

```css
border-radius: 12px;          /* 普通输入框 */
border-radius: 999px;         /* 搜索框/select */
border: 1px solid var(--line);
background: var(--surface-soft);
padding: 10px 14px;
focus: border-color: var(--green-border);
```

### 6.5 标签/徽章

```css
.tag {
  display: inline-flex;
  padding: 3px 12px;
  font-size: 0.75rem;
  font-weight: 450;
  color: var(--green-dark);
  background: var(--green-soft);
  border-radius: 999px;
}
```

### 6.6 弹窗 Modal

- `border-radius: 28px`，`background: var(--surface)`
- 半透明遮罩 `rgba(0,0,0,0.4)`
- 最大宽度 480-640px
- 圆形淡背景关闭按钮
- 点击遮罩或 Esc 关闭

### 6.7 空状态

- 居中布局，padding 48px
- 标题 `1.1rem / var(--text-muted)`，描述 `0.9rem / var(--text-faint)`
- 可用 `border: 1px dashed var(--line)` 虚线框

---

## 7. 动效与交互

- **hover**：仅 border-color + 微浮（translateY -2px），**无 scale、brightness、大幅位移**
- **transition**：`0.2s ease` 或 `0.25s ease`
- **页面进入**：`reveal-up`（translateY 20px→0, opacity 0→1, 0.6s）
- **链接**：颜色变化或箭头 `→` 右移
- **图表**：高度/数值变化 `0.5s ease`
- **reduce-motion**：`prefers-reduced-motion` 下全部禁用动画

**克制原则**：动效服务于反馈，不制造新鲜感。

---

## 8. 插画与图像方向

### 8.1 默认占位图

无封面/无图内容使用**纯 SVG 纸页线框图标**：
- 浅绿色渐变背景（`radial-gradient + linear-gradient`）
- 圆角矩形 + 标题线 + 正文线 + 装饰圆点 + 叶子路径
- 绿色透明度 0.045-0.26，极轻
- 不显示标题/分类文字

### 8.2 氛围插画（仅 Hero 允许）

Hero 区域可放极简、透明、低存在感装饰，条件：
- SVG 或纯 CSS，不用外部图片
- 仅用绿色（`rgba(47,111,78,0.02-0.15)`），透明度极低
- 不干扰标题可读性
- 推荐：淡绿色渐变圆、水面弧线、散点
- 不推荐：具象插画、密集图形、高对比线条

### 8.3 禁止的插画风格

- ❌ 厚重 3D 插画
- ❌ 商业 SaaS 插画（人物/办公室/图表）
- ❌ 多色渐变
- ❌ 玻璃拟态（backdrop-filter 仅限导航和弹窗遮罩）
- ❌ 纸纹/水彩/噪点纹理背景
- ❌ Emoji 作为分类图标

---

## 9. 无障碍

- 正文对比度满足 WCAG AA（`--text #1f2722` on `--bg #f6f8f3`）
- 所有可交互元素有 `:focus-visible` 样式
- 所有 input/textarea 有 `<label>` 或 `aria-label`
- 所有图片有 alt 文本
- 语义化 HTML：`<nav>`, `<main>`, `<article>`, `<section>`, `aria-label`
- 深色模式 `data-theme="dark"` 切换，localStorage 持久化

---

## 10. 跨项目硬规则（Agent 必须遵守）

1. **不要引入新视觉风格**：不擅自加玻璃拟态、霓虹色、渐变文字、粒子背景
2. **不要随意新增颜色**：所有颜色用 CSS 变量；新增需先在变量和 DESIGN.md 定义
3. **不要重阴影/大渐变/多色系统**：保持轻盈、单色强调、淡阴影
4. **不要破坏阅读体验**：720px 宽度、1.9 行高、衬线标题、无干扰装饰
5. **后台不做独立设计系统**：用前台同款 token（绿色强调、圆角卡片、淡边框）
6. **新组件先匹配现有规范**：spacing（20-24px）、radius（20-28px 卡片 / 999px 按钮）、border（1px var(--line)）、typography（见第 4 节）
7. **修改 UI 前先读 DESIGN 文档**：找不到则重新加载
8. **DESIGN 文档与代码冲突时**：优先保持项目一致性，再最小幅度修正规范
9. **常规颜色用 CSS 变量**：禁止 `color: #333`；遮罩/阴影可用 `rgba()`，优先取自变量
10. **hover 克制**：仅 border-color + translateY(1-2px)，不用 scale/brightness
11. **优先复用现有 class**：不要每次写 inline style
12. **新项目第一天就引入本规范**：建立 `:root` 变量 + `DESIGN.md`，避免后期重构

---

## 11. 新项目启动检查清单

创建新项目时，按此清单建立设计基线：

- [ ] 在 `package.json` 之外建立 `DESIGN.md`（项目级约束）
- [ ] 在全局 CSS 建立 `:root` 色彩/字体/圆角/阴影变量（复制第 3-5 节）
- [ ] 配置 dark mode（`data-theme="dark"` + localStorage）
- [ ] 字体栈使用第 4.1 节（如可用，预加载 Noto Serif SC / Geist / Noto Sans SC）
- [ ] Tailwind 项目：将变量映射到 `theme.extend.colors` / `fontFamily` / `borderRadius` / `boxShadow`（参考 creep_cal 的 tailwind.config.js）
- [ ] 在 README 注明「本项目遵循 HALUNHAKU 设计语言，见 ../DESIGN_SYSTEM.md」
- [ ] 默认占位图用 SVG 纸页线框，不用纯色块

---

## 12. 示例对照

### ✅ 推荐

```css
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 20px 24px;
}
.card:hover {
  border-color: var(--green-border);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
.btn {
  border-radius: 999px;
  padding: 10px 24px;
}
```

### ❌ 避免

```css
.card {
  background: #f0f0f0;                    /* 硬编码 */
  box-shadow: 0 10px 30px rgba(0,0,0,0.2); /* 纯黑重阴影 */
}
.button { border-radius: 4px; }            /* 直角 */
.success { color: #22c55e; }               /* 新增强调色 */
.warning { color: #f59e0b; }               /* 多色系统 */
.error   { color: #ef4444; }               /* 亮红 */
```

```html
<!-- 不要反复写 inline style -->
<div style="background: var(--surface); border: 1px solid var(--line); ...">
```

---

## 13. 项目应用索引

| 项目 | DESIGN 文档 | 主题变体 | 备注 |
|---|---|---|---|
| my-cloudflare-blog | `DESIGN.md` | 标准 HALUNHAKU | 设计源，前台+后台+编辑器三态 |
| creep_cal | `DESIGN.md` | 标准 HALUNHAKU | Tailwind 实现，工程计算密度更高 |
| marktab | （styles.css 内嵌） | 暖纸主题变体 | 浏览器扩展，无框架 |
| ima-extension | — | 中性 Inter（例外） | 纯工具型扩展，不强制套用 |
| kpi-report-tool | 待建 | — | 当前为脚手架，建议未来套用 |
| 全平台markdown笔记软件 | 待建 | — | 空目录，新项目应直接套用 |
