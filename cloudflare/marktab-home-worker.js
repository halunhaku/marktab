const VERSION = '1.3.1';
const RELEASE_ZIP = `https://github.com/forhalunhaku/marktab/releases/download/v${VERSION}/marktab-${VERSION}.zip`;
const GITHUB_REPO = 'https://github.com/forhalunhaku/marktab';
const RELEASE_URL = `${GITHUB_REPO}/releases/tag/v${VERSION}`;
const PRIVACY_URL = `${GITHUB_REPO}/blob/main/PRIVACY_POLICY.md`;
const LICENSE_URL = `${GITHUB_REPO}#license`;
const SCREENSHOT_BASE = 'https://raw.githubusercontent.com/forhalunhaku/marktab/main/screenshots';

const screenshots = {
  home: `${SCREENSHOT_BASE}/home.png`,
  popup: `${SCREENSHOT_BASE}/popup.png`,
  pinned: `${SCREENSHOT_BASE}/pinned.png`,
  recent: `${SCREENSHOT_BASE}/recent.png`,
  spotlight: `${SCREENSHOT_BASE}/spotlight.png`,
  folder: `${SCREENSHOT_BASE}/folder.png`
};

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#6b9b7a"/>
  <path d="M20 14h24a5 5 0 0 1 5 5v31L32 41 15 50V19a5 5 0 0 1 5-5z" fill="#fff"/>
  <path d="M23 19h18a3 3 0 0 1 3 3v19l-12-6.5L20 41V22a3 3 0 0 1 3-3z" fill="#dcefe3"/>
  <path d="M32 35l12 6V22a3 3 0 0 0-3-3H23a3 3 0 0 0-3 3v19l12-6z" fill="#f7f5f0"/>
</svg>`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MarkTab - 书签驱动的新标签页扩展</title>
  <meta name="description" content="MarkTab 是一个以书签为核心的 Chrome/Edge 新标签页扩展，用更安静、清晰、快速的方式管理和访问常用网页。">
  <meta property="og:title" content="MarkTab">
  <meta property="og:description" content="以书签为核心的浏览器新标签页扩展。">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${screenshots.home}">
  <meta name="theme-color" content="#f7f5f0">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f7f5f0;
      --surface: #ffffff;
      --surface-soft: #fbfaf6;
      --surface-glass: rgba(255, 255, 255, 0.76);
      --text: #202520;
      --text-muted: #66736b;
      --text-faint: #9aa59e;
      --green: #2f6f4e;
      --green-hover: #255b3f;
      --green-soft: #e7f1ea;
      --green-border: #d7e5dc;
      --line: #e5ebe4;
      --shadow-sm: 0 4px 16px rgba(37, 58, 43, 0.05);
      --shadow: 0 18px 50px rgba(37, 58, 43, 0.08);
      --shadow-hover: 0 24px 60px rgba(37, 58, 43, 0.12);
      --radius-sm: 10px;
      --radius-md: 16px;
      --radius-lg: 24px;
      --radius-xl: 28px;
      --radius-pill: 999px;
      --font: "Geist", "Noto Sans SC", "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --font-display: ui-rounded, "SF Pro Rounded", "Avenir Next", "Nunito", var(--font);
      --font-mono: "SFMono-Regular", "Menlo", "Consolas", monospace;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111214;
        --surface: #1a1d1c;
        --surface-soft: #1e2120;
        --surface-glass: rgba(26, 29, 28, 0.78);
        --text: #ececec;
        --text-muted: #9a9e9a;
        --text-faint: #5d635d;
        --green: #4a9e6e;
        --green-hover: #5caf7c;
        --green-soft: #1a2e24;
        --green-border: #2a4038;
        --line: rgba(232, 235, 230, 0.08);
        --shadow-sm: 0 4px 18px rgba(0, 0, 0, 0.18);
        --shadow: 0 18px 54px rgba(0, 0, 0, 0.28);
        --shadow-hover: 0 24px 64px rgba(0, 0, 0, 0.34);
      }
    }

    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
    body {
      margin: 0;
      min-height: 100dvh;
      background:
        radial-gradient(circle at 12% 0%, rgba(47, 111, 78, 0.12), transparent 34rem),
        radial-gradient(circle at 88% 10%, rgba(215, 229, 220, 0.42), transparent 28rem),
        var(--bg);
      color: var(--text);
      font-family: var(--font);
      line-height: 1.6;
    }
    a { color: inherit; text-decoration: none; }
    img { display: block; max-width: 100%; height: auto; }
    .page { overflow: hidden; }
    .container { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
    .section { padding: 56px 0; }
    .section-head { max-width: 680px; margin-bottom: 24px; }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      color: var(--green);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .eyebrow::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 0 5px var(--green-soft);
    }
    h1, h2, h3, p { margin: 0; }
    h1, h2, h3 { font-family: var(--font-display); letter-spacing: -0.02em; }
    h2 { font-size: clamp(2rem, 4vw, 3.4rem); line-height: 1.08; font-weight: 650; }
    .section-desc { margin-top: 12px; color: var(--text-muted); max-width: 620px; }

    .nav {
      position: sticky;
      top: 14px;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin: 14px auto 0;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius-pill);
      background: var(--surface-glass);
      box-shadow: var(--shadow-sm);
      backdrop-filter: blur(18px);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding-right: 8px;
      font-family: var(--font-display);
      font-size: 0.96rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .brand-mark {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--green-soft);
      color: var(--green);
      font-weight: 800;
      box-shadow: inset 0 0 0 1px var(--green-border);
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-muted);
      font-size: 0.86rem;
    }
    .nav-links a {
      padding: 8px 12px;
      border-radius: var(--radius-pill);
      transition: background 160ms ease, color 160ms ease;
      white-space: nowrap;
    }
    .nav-links a:hover { background: var(--green-soft); color: var(--green-hover); }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      gap: 42px;
      align-items: center;
      padding: 76px 0 48px;
    }
    .hero h1 {
      font-size: clamp(3.8rem, 9vw, 7.8rem);
      line-height: 0.92;
      font-weight: 720;
      margin-bottom: 20px;
    }
    .hero-lead {
      color: var(--text-muted);
      font-size: clamp(1rem, 1.7vw, 1.18rem);
      max-width: 560px;
      text-wrap: pretty;
    }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 26px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 18px;
      border: 1px solid transparent;
      border-radius: var(--radius-pill);
      font-weight: 700;
      font-size: 0.94rem;
      white-space: nowrap;
      transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
    }
    .btn:hover { transform: translateY(-1px); }
    .btn-primary { background: var(--green); color: #fff; box-shadow: 0 12px 28px rgba(47, 111, 78, 0.22); }
    .btn-primary:hover { background: var(--green-hover); box-shadow: 0 16px 34px rgba(47, 111, 78, 0.28); }
    .btn-secondary { background: var(--surface); border-color: var(--line); color: var(--text); }
    .btn-secondary:hover { border-color: var(--green-border); background: var(--surface-soft); }
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 22px;
    }
    .badge {
      padding: 5px 10px;
      border: 1px solid var(--line);
      border-radius: var(--radius-pill);
      background: var(--surface-glass);
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 650;
    }

    .hero-preview {
      position: relative;
    }
    .hero-shot {
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: var(--radius-xl);
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .hero-shot img { width: 100%; }
    .popup-card {
      position: absolute;
      right: -18px;
      bottom: -34px;
      width: min(34%, 190px);
      min-width: 150px;
      padding: 8px;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: color-mix(in srgb, var(--surface) 84%, transparent);
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
    }
    .popup-card img {
      border-radius: 16px;
      box-shadow: var(--shadow-sm);
    }

    .preview-grid {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 18px;
      align-items: start;
    }
    .preview-large,
    .preview-small {
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: var(--surface);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .preview-large { box-shadow: var(--shadow); }
    .preview-stack {
      display: grid;
      gap: 18px;
    }
    .shot-caption {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-top: 1px solid var(--line);
      color: var(--text-muted);
      font-size: 0.82rem;
      font-weight: 650;
    }
    .shot-caption span:last-child {
      color: var(--text-faint);
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 500;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-top: 28px;
    }
    .feature-card,
    .privacy-card,
    .install-card {
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: var(--surface-glass);
      box-shadow: var(--shadow-sm);
    }
    .feature-card {
      min-height: 190px;
      padding: 22px;
    }
    .feature-icon {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      margin-bottom: 18px;
      border-radius: 14px;
      background: var(--green-soft);
      color: var(--green);
      font-weight: 800;
    }
    .feature-card h3 { font-size: 1rem; margin-bottom: 8px; }
    .feature-card p { color: var(--text-muted); font-size: 0.9rem; }

    .philosophy {
      display: grid;
      grid-template-columns: 0.86fr 1.14fr;
      gap: 24px;
      align-items: start;
    }
    .principles {
      display: grid;
      gap: 12px;
    }
    .principle {
      padding: 18px 20px;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--surface-glass);
    }
    .principle h3 { font-size: 0.98rem; margin-bottom: 6px; }
    .principle p { color: var(--text-muted); font-size: 0.9rem; }

    .privacy-grid,
    .install-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-top: 28px;
    }
    .privacy-card { padding: 20px; }
    .privacy-card strong {
      display: block;
      margin-bottom: 8px;
      font-family: var(--font-display);
      font-size: 1rem;
    }
    .privacy-card p { color: var(--text-muted); font-size: 0.9rem; }

    .install-card { padding: 22px; }
    .install-card .step {
      display: inline-grid;
      place-items: center;
      width: 28px;
      height: 28px;
      margin-bottom: 16px;
      border-radius: 50%;
      background: var(--green-soft);
      color: var(--green);
      font-family: var(--font-mono);
      font-size: 0.78rem;
      font-weight: 800;
    }
    .install-card h3 { font-size: 1rem; margin-bottom: 8px; }
    .install-card p { color: var(--text-muted); font-size: 0.9rem; }
    code {
      padding: 2px 6px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: var(--surface-soft);
      font-family: var(--font-mono);
      font-size: 0.84em;
    }

    .download-panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-top: 26px;
      padding: 22px;
      border: 1px solid var(--green-border);
      border-radius: var(--radius-lg);
      background: var(--green-soft);
    }
    .download-panel strong { display: block; font-family: var(--font-display); font-size: 1.1rem; }
    .download-panel span { color: var(--text-muted); font-size: 0.9rem; }

    .footer {
      padding: 34px 0 42px;
      border-top: 1px solid var(--line);
      color: var(--text-muted);
      font-size: 0.88rem;
    }
    .footer-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .footer-links {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
    }
    .footer a:hover { color: var(--green-hover); }

    @media (max-width: 900px) {
      .hero,
      .preview-grid,
      .philosophy {
        grid-template-columns: 1fr;
      }
      .hero { padding-top: 48px; }
      .popup-card {
        position: relative;
        right: auto;
        bottom: auto;
        width: min(260px, 72%);
        margin: -24px 18px 0 auto;
      }
      .feature-grid,
      .privacy-grid,
      .install-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 640px) {
      .container { width: min(100% - 28px, 1120px); }
      .nav { align-items: flex-start; border-radius: 22px; }
      .nav-links { display: none; }
      .hero h1 { font-size: clamp(3rem, 18vw, 4.5rem); }
      .section { padding: 42px 0; }
      .feature-grid,
      .privacy-grid,
      .install-grid {
        grid-template-columns: 1fr;
      }
      .download-panel {
        align-items: stretch;
        flex-direction: column;
      }
      .download-panel .btn { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="container">
      <nav class="nav" aria-label="Primary navigation">
        <a class="brand" href="/">
          <span class="brand-mark">M</span>
          <span>MarkTab</span>
        </a>
        <div class="nav-links">
          <a href="#preview">Preview</a>
          <a href="#features">Features</a>
          <a href="#privacy">Privacy</a>
          <a href="#install">Install</a>
          <a href="${GITHUB_REPO}">GitHub</a>
        </div>
      </nav>
    </div>

    <main>
      <div class="container">
        <header class="hero">
          <div>
            <span class="eyebrow">Bookmark new tab</span>
            <h1>MarkTab</h1>
            <p class="hero-lead">
              MarkTab 是一个以书签为核心的浏览器新标签页扩展，用更安静、清晰、快速的方式管理和访问你的常用网页。
            </p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="${RELEASE_ZIP}">Download v${VERSION}</a>
              <a class="btn btn-secondary" href="${GITHUB_REPO}">View on GitHub</a>
            </div>
            <div class="badges" aria-label="Project badges">
              <span class="badge">Manifest V3</span>
              <span class="badge">Chrome Extension</span>
              <span class="badge">Edge Compatible</span>
              <span class="badge">Local-first</span>
            </div>
          </div>
          <div class="hero-preview" aria-label="MarkTab product screenshots">
            <figure class="hero-shot">
              <img src="${screenshots.home}" alt="MarkTab home new tab view" loading="eager">
            </figure>
            <figure class="popup-card">
              <img src="${screenshots.popup}" alt="MarkTab toolbar popup quick panel" loading="eager">
            </figure>
          </div>
        </header>
      </div>

      <section class="section" id="preview">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Preview</span>
            <h2>真实界面，而不是概念图。</h2>
            <p class="section-desc">Landing page 使用仓库中的 README 截图资源，展示首页、快捷面板、搜索、固定书签、最近访问和文件夹视图。</p>
          </div>
          <div class="preview-grid">
            <figure class="preview-large">
              <img src="${screenshots.spotlight}" alt="Spotlight search in MarkTab" loading="lazy">
              <figcaption class="shot-caption"><span>Spotlight search</span><span>Ctrl / Cmd + K</span></figcaption>
            </figure>
            <div class="preview-stack">
              <figure class="preview-small">
                <img src="${screenshots.pinned}" alt="Pinned bookmarks in MarkTab" loading="lazy">
                <figcaption class="shot-caption"><span>Pinned bookmarks</span><span>Fast access</span></figcaption>
              </figure>
              <figure class="preview-small">
                <img src="${screenshots.recent}" alt="Recent bookmarks in MarkTab" loading="lazy">
                <figcaption class="shot-caption"><span>Recent items</span><span>Local history</span></figcaption>
              </figure>
            </div>
            <figure class="preview-large">
              <img src="${screenshots.folder}" alt="Folder view in MarkTab" loading="lazy">
              <figcaption class="shot-caption"><span>Folder view</span><span>Browse by folder</span></figcaption>
            </figure>
            <figure class="preview-small">
              <img src="${screenshots.popup}" alt="MarkTab extension popup" loading="lazy">
              <figcaption class="shot-caption"><span>Toolbar popup</span><span>Quick controls</span></figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section class="section" id="features">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Features</span>
            <h2>围绕书签的日常工作流。</h2>
            <p class="section-desc">MarkTab 保持单一目的：把浏览器书签变成可搜索、可浏览、可长期使用的新标签页。</p>
          </div>
          <div class="feature-grid">
            <article class="feature-card">
              <div class="feature-icon">B</div>
              <h3>Bookmark-powered new tab</h3>
              <p>直接读取浏览器书签树，不需要额外账号，也不迁移你的收藏数据。</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">K</div>
              <h3>Spotlight search</h3>
              <p>搜索书签标题、URL 和文件夹，并在需要时提交网页搜索。</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">P</div>
              <h3>Pinned bookmarks</h3>
              <p>把高频书签固定在首页，让最常用的入口始终在第一屏。</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">R</div>
              <h3>Recent items</h3>
              <p>记录通过 MarkTab 打开的书签，帮助你快速回到刚访问过的页面。</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">F</div>
              <h3>Folder view</h3>
              <p>用侧边栏和网格卡片浏览文件夹，并在当前文件夹内快速过滤。</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">L</div>
              <h3>Local-first privacy</h3>
              <p>书签、最近访问和偏好设置都用于本地体验，不上传到开发者服务。</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section" id="design">
        <div class="container philosophy">
          <div class="section-head">
            <span class="eyebrow">Design philosophy</span>
            <h2>安静、清晰、低干扰。</h2>
            <p class="section-desc">设计目标不是让新标签页变成内容流，而是让书签重新变得可用。</p>
          </div>
          <div class="principles">
            <article class="principle">
              <h3>信息密度适中</h3>
              <p>首页保留搜索、Pinned、Recent 和文件夹入口；完整列表放在 Folder View 中处理。</p>
            </article>
            <article class="principle">
              <h3>长期使用优先</h3>
              <p>低饱和色、轻阴影、圆润卡片和清晰层级，让它适合作为每天都会打开的新标签页。</p>
            </article>
            <article class="principle">
              <h3>功能和视觉一致</h3>
              <p>工具栏 popup、README 和新标签页使用同一套克制的产品语言，不制造额外负担。</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section" id="privacy">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Privacy</span>
            <h2>本地优先，不上传书签。</h2>
            <p class="section-desc">MarkTab 的隐私边界保持透明。网页搜索只在你主动提交搜索时交给浏览器默认搜索引擎。</p>
          </div>
          <div class="privacy-grid">
            <article class="privacy-card">
              <strong>不上传书签</strong>
              <p>书签标题、URL、文件夹名称不会发送到开发者服务器。</p>
            </article>
            <article class="privacy-card">
              <strong>不采集搜索记录</strong>
              <p>MarkTab 不保存或上传你的搜索关键词；网页搜索由 Chrome Search API 处理。</p>
            </article>
            <article class="privacy-card">
              <strong>设置保存在浏览器</strong>
              <p>Pinned、Recent、主题和隐藏文件夹等偏好用于本地新标签页体验。</p>
            </article>
          </div>
          <div class="download-panel">
            <div>
              <strong>想看完整隐私说明？</strong>
              <span>权限说明和数据处理边界都写在仓库中。</span>
            </div>
            <a class="btn btn-secondary" href="${PRIVACY_URL}">Privacy policy</a>
          </div>
        </div>
      </section>

      <section class="section" id="install">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Install</span>
            <h2>下载 zip，加载已解压扩展。</h2>
            <p class="section-desc">当前不要把 MarkTab 误认为已上架商店。请从 GitHub Release 下载并通过开发者模式安装。</p>
          </div>
          <div class="install-grid">
            <article class="install-card">
              <span class="step">1</span>
              <h3>下载 Release zip</h3>
              <p>下载 <code>marktab-${VERSION}.zip</code>，并解压到一个固定文件夹。</p>
            </article>
            <article class="install-card">
              <span class="step">2</span>
              <h3>打开扩展管理页面</h3>
              <p>Chrome 使用 <code>chrome://extensions/</code>，Edge 使用 <code>edge://extensions/</code>。</p>
            </article>
            <article class="install-card">
              <span class="step">3</span>
              <h3>加载已解压扩展</h3>
              <p>启用开发者模式，点击加载已解压的扩展程序，选择 MarkTab 文件夹。</p>
            </article>
          </div>
          <div class="download-panel">
            <div>
              <strong>Latest release: v${VERSION}</strong>
              <span>Manifest V3 package for Chrome and Edge compatible browsers.</span>
            </div>
            <a class="btn btn-primary" href="${RELEASE_ZIP}">Download v${VERSION}</a>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="container footer-inner">
        <span>© 2026 MarkTab. MIT License.</span>
        <div class="footer-links">
          <a href="${GITHUB_REPO}">GitHub</a>
          <a href="${RELEASE_URL}">Release</a>
          <a href="${PRIVACY_URL}">Privacy</a>
          <a href="${LICENSE_URL}">License</a>
        </div>
      </div>
    </footer>
  </div>
</body>
</html>`;

function respond(body, contentType, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin'
    }
  });
}

function redirectTo(url) {
  return Response.redirect(url, 302);
}

addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname === '/robots.txt') {
    event.respondWith(respond('User-agent: *\nAllow: /\n', 'text/plain; charset=utf-8'));
    return;
  }

  if (url.pathname === '/favicon.svg') {
    event.respondWith(respond(faviconSvg, 'image/svg+xml; charset=utf-8'));
    return;
  }

  if (url.pathname === '/download') {
    event.respondWith(redirectTo(RELEASE_ZIP));
    return;
  }

  if (url.pathname === '/github') {
    event.respondWith(redirectTo(GITHUB_REPO));
    return;
  }

  if (url.pathname === '/release') {
    event.respondWith(redirectTo(RELEASE_URL));
    return;
  }

  if (url.pathname === '/privacy') {
    event.respondWith(redirectTo(PRIVACY_URL));
    return;
  }

  event.respondWith(respond(html, 'text/html; charset=utf-8'));
});
