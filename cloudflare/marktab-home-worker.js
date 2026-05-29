const VERSION = '1.3.0';
const RELEASE_ZIP = `https://github.com/forhalunhaku/marktab/releases/download/v${VERSION}/marktab-${VERSION}.zip`;
const GITHUB_REPO = 'https://github.com/forhalunhaku/marktab';
const PRIVACY_URL = `${GITHUB_REPO}/blob/main/PRIVACY_POLICY.md`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MarkTab — 安静、快速、隐私友好的书签启动器</title>
  <meta name="description" content="MarkTab 是一个 Chrome/Edge 新标签页扩展，把浏览器书签整理成安静、快速、隐私友好的书签启动器（Bookmark Launcher）。">
  <meta property="og:title" content="MarkTab">
  <meta property="og:description" content="一个安静、快速、隐私友好的书签启动器。">
  <meta property="og:type" content="website">
  <meta name="theme-color" content="#f7f5f0">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <style>
    :root {
      --bg: #f7f5f0;
      --bg-card: rgba(255,255,255,0.82);
      --bg-card-hover: rgba(255,255,255,0.95);
      --bg-surface: #ffffff;
      --accent: #6b9b7a;
      --accent-hover: #5a8a69;
      --accent-light: rgba(107,155,122,0.15);
      --accent-glow: rgba(107,155,122,0.2);
      --text: #2c2c2c;
      --text-secondary: #787878;
      --text-tertiary: #a8a8a8;
      --text-muted: #c8c8c8;
      --border: rgba(0,0,0,0.06);
      --border-med: rgba(0,0,0,0.1);
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.03);
      --shadow-md: 0 4px 16px rgba(0,0,0,0.04);
      --shadow-lg: 0 8px 32px rgba(0,0,0,0.06);
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
      --radius-xl: 20px;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", system-ui, sans-serif;
      --font-display: ui-rounded, "SF Pro Rounded", "Avenir Next", "Nunito", system-ui, sans-serif;
      --ease: cubic-bezier(0.4,0,0.2,1);
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; font-size: 16px; -webkit-font-smoothing: antialiased; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100dvh;
    }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; height: auto; }

    .container { width: min(1080px, calc(100% - 48px)); margin: 0 auto; }

    /* ── Nav ─────────────────────────── */
    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 0;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.05rem;
    }
    .brand-mark {
      width: 32px; height: 32px;
      display: grid; place-items: center;
      background: var(--accent-light);
      border-radius: var(--radius-sm);
      color: var(--accent);
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.85rem;
    }
    .nav-links {
      display: flex; align-items: center; gap: 24px;
      font-size: 0.9rem; color: var(--text-secondary);
    }
    .nav-links a { transition: color 0.2s var(--ease); }
    .nav-links a:hover { color: var(--text); }

    /* ── Hero ────────────────────────── */
    .hero {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      align-items: center;
      padding: 40px 0 80px;
      min-height: calc(100dvh - 80px);
    }
    .hero h1 {
      font-family: var(--font-display);
      font-size: clamp(2.8rem, 5vw, 4.2rem);
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.08;
      margin-bottom: 16px;
    }
    .hero .lead {
      font-size: 1.05rem;
      color: var(--text-secondary);
      line-height: 1.7;
      max-width: 480px;
      margin-bottom: 28px;
    }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 22px; border-radius: var(--radius-md);
      font-size: 0.95rem; font-weight: 500;
      transition: all 0.2s var(--ease);
      cursor: pointer;
    }
    .btn-primary {
      background: var(--accent); color: #fff;
      box-shadow: 0 1px 4px var(--accent-glow);
    }
    .btn-primary:hover { background: var(--accent-hover); transform: translateY(-1px); }
    .btn-secondary {
      background: var(--bg-card); color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover {
      background: var(--bg-card-hover); border-color: var(--border-med);
      transform: translateY(-1px);
    }
    .meta-tags {
      display: flex; flex-wrap: wrap; gap: 8px;
      margin-top: 20px;
    }
    .meta-tags span {
      font-size: 0.78rem; color: var(--text-tertiary);
      padding: 3px 10px; border: 1px solid var(--border);
      border-radius: 999px;
    }

    /* ── Mockup ──────────────────────── */
    .mockup {
      position: relative;
      padding: 24px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-md);
      min-height: 400px;
    }
    .mockup::after {
      content: "";
      position: absolute; inset: 0;
      border-radius: inherit;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
      pointer-events: none;
    }
    .mockup-clock {
      display: flex; align-items: baseline; gap: 8px;
      margin-bottom: 28px;
    }
    .mockup-time {
      font-family: var(--font-display);
      font-size: 1rem; font-weight: 450;
      color: var(--text-secondary); letter-spacing: 0.03em;
    }
    .mockup-date {
      font-size: 0.75rem; color: var(--text-tertiary);
    }
    .mockup-date::before {
      content: "·"; margin-right: 8px; color: var(--text-muted);
    }
    .mockup-search {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      margin-bottom: 28px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    .mockup-search-icon {
      width: 18px; height: 18px;
      color: var(--text-tertiary);
      flex-shrink: 0;
    }
    .mockup-search-placeholder {
      flex: 1; font-size: 0.9rem; color: var(--text-tertiary);
    }
    .mockup-search-hint {
      font-size: 0.65rem; color: var(--text-tertiary);
      padding: 3px 8px; background: var(--bg-hover, rgba(0,0,0,0.03));
      border: 1px solid var(--border); border-radius: 7px;
      font-family: monospace;
    }
    .mockup-pinned-label {
      font-size: 0.69rem; font-weight: 500;
      color: var(--text-tertiary); text-transform: uppercase;
      letter-spacing: 0.1em; margin-bottom: 12px;
    }
    .mockup-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 10px; margin-bottom: 24px;
    }
    .mockup-card {
      display: flex; flex-direction: column; align-items: center;
      gap: 6px; padding: 12px 8px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    .mockup-card-fav {
      width: 28px; height: 28px;
      display: grid; place-items: center;
      background: rgba(0,0,0,0.04);
      border-radius: var(--radius-sm);
      font-family: var(--font-display);
      font-size: 0.75rem; font-weight: 600; color: var(--accent);
    }
    .mockup-card-title {
      font-size: 0.75rem; font-weight: 500; text-align: center;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      max-width: 100%;
    }
    .mockup-card-domain {
      font-size: 0.62rem; color: var(--text-tertiary);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      max-width: 100%;
    }
    .mockup-recent-label {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 10px;
    }
    .mockup-recent-label span {
      font-size: 0.69rem; font-weight: 500;
      color: var(--text-tertiary); text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .mockup-recent-list {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .mockup-recent-item {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 10px;
      background: rgba(255,255,255,0.5);
      border: 1px solid rgba(0,0,0,0.04);
      border-radius: var(--radius-md);
    }
    .mockup-recent-fav {
      width: 20px; height: 20px;
      display: grid; place-items: center;
      background: rgba(0,0,0,0.03);
      border-radius: 5px;
      font-family: var(--font-display);
      font-size: 0.6rem; font-weight: 600; color: var(--accent);
      flex-shrink: 0;
    }
    .mockup-recent-text {
      flex: 1; min-width: 0;
    }
    .mockup-recent-text strong {
      display: block;
      font-size: 0.72rem; font-weight: 450; color: var(--text-secondary);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .mockup-recent-text span {
      font-size: 0.6rem; color: var(--text-tertiary);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;
    }

    /* ── Sections ────────────────────── */
    section { padding: 64px 0; border-top: 1px solid var(--border); }
    .section-head {
      text-align: center; max-width: 600px;
      margin: 0 auto 48px;
    }
    .section-head h2 {
      font-family: var(--font-display);
      font-size: clamp(1.6rem, 3vw, 2.4rem);
      font-weight: 600;
      letter-spacing: -0.01em;
      margin-bottom: 12px;
    }
    .section-head p {
      color: var(--text-secondary);
      font-size: 0.95rem;
    }

    .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .feature {
      padding: 24px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    .feature-icon {
      width: 36px; height: 36px;
      display: grid; place-items: center;
      background: var(--accent-light);
      border-radius: var(--radius-sm);
      margin-bottom: 14px;
      color: var(--accent);
    }
    .feature h3 {
      font-size: 1rem; font-weight: 600;
      margin-bottom: 6px;
    }
    .feature p {
      color: var(--text-secondary);
      font-size: 0.88rem;
      line-height: 1.6;
    }

    /* ── Theme showcase ──────────────── */
    .theme-showcase {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 16px; margin-top: 32px;
    }
    .theme-card {
      padding: 20px; border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      text-align: center;
    }
    .theme-card.paper { background: #f7f5f0; color: #2c2c2c; }
    .theme-card.dark { background: #1a1a1e; color: #e8e6e0; }
    .theme-card.system {
      background: linear-gradient(135deg, #f7f5f0 50%, #1a1a1e 50%);
      color: #2c2c2c;
    }
    .theme-card .theme-name {
      font-family: var(--font-display);
      font-size: 1.2rem; font-weight: 600;
    }
    .theme-card .theme-desc {
      font-size: 0.82rem; opacity: 0.6; margin-top: 4px;
    }

    /* ── Accent colors ───────────────── */
    .accent-row {
      display: flex; gap: 12px; justify-content: center;
      margin-top: 20px; flex-wrap: wrap;
    }
    .accent-swatch {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .accent-swatch .dot {
      width: 28px; height: 28px; border-radius: 50%;
      border: 2px solid var(--bg-surface);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .accent-swatch span {
      font-size: 0.75rem; color: var(--text-tertiary);
    }

    /* ── Install ─────────────────────── */
    .install-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .install-card {
      padding: 28px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    .install-card .label {
      font-size: 0.72rem; font-weight: 500; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .install-card .version-num {
      font-family: var(--font-display);
      font-size: 2.8rem; font-weight: 600;
      line-height: 1; margin: 12px 0 20px;
    }
    .install-card ol {
      margin: 12px 0 0; padding-left: 20px;
      color: var(--text-secondary); font-size: 0.9rem;
    }
    .install-card li + li { margin-top: 8px; }
    .install-card code {
      padding: 1px 6px; background: var(--bg-hover, rgba(0,0,0,0.04));
      border: 1px solid var(--border); border-radius: 4px;
      font-size: 0.82rem;
    }

    /* ── Footer ──────────────────────── */
    footer {
      display: flex; justify-content: space-between;
      flex-wrap: wrap; gap: 12px;
      padding: 32px 0 40px;
      color: var(--text-tertiary);
      font-size: 0.85rem;
      border-top: 1px solid var(--border);
    }
    footer a { color: var(--text-secondary); }
    footer a:hover { color: var(--text); }

    /* ── Responsive ──────────────────── */
    @media (max-width: 860px) {
      .hero { grid-template-columns: 1fr; min-height: auto; padding: 20px 0 48px; }
      .features { grid-template-columns: 1fr 1fr; }
      .theme-showcase { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .features { grid-template-columns: 1fr; }
      .install-grid { grid-template-columns: 1fr; }
      .mockup-grid { grid-template-columns: repeat(2, 1fr); }
      .mockup-recent-list { grid-template-columns: 1fr; }
      .nav-links { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <nav>
      <a class="brand" href="/">
        <span class="brand-mark">M</span>
        <span>MarkTab</span>
      </a>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#themes">Themes</a>
        <a href="#install">Install</a>
        <a href="${GITHUB_REPO}">GitHub</a>
        <a href="${PRIVACY_URL}">Privacy</a>
      </div>
    </nav>
  </div>

  <main>
    <div class="container">
      <header class="hero">
        <div>
          <h1>Your bookmarks,<br>quietly at hand.</h1>
          <p class="lead">
            MarkTab 把 Chrome 书签变成一个安静、高效的书签启动器。
            搜索优先、键盘驱动、纸感设计。不收集数据。
          </p>
          <div class="actions">
            <a class="btn btn-primary" href="${RELEASE_ZIP}">Download v${VERSION}</a>
            <a class="btn btn-secondary" href="${GITHUB_REPO}">View on GitHub</a>
          </div>
          <div class="meta-tags">
            <span>Chrome / Edge</span>
            <span>Manifest V3</span>
            <span>No frameworks</span>
          </div>
        </div>

        <div class="mockup" aria-label="MarkTab 界面预览">
          <div class="mockup-clock">
            <span class="mockup-time">12:14</span>
            <span class="mockup-date">Wednesday, May 28</span>
          </div>
          <div class="mockup-search">
            <svg class="mockup-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span class="mockup-search-placeholder">Search bookmarks and folders…</span>
            <span class="mockup-search-hint">⌘K</span>
          </div>
          <div class="mockup-pinned-label">Pinned</div>
          <div class="mockup-grid">
            <div class="mockup-card">
              <div class="mockup-card-fav">G</div>
              <span class="mockup-card-title">GitHub</span>
              <span class="mockup-card-domain">github.com</span>
            </div>
            <div class="mockup-card">
              <div class="mockup-card-fav">N</div>
              <span class="mockup-card-title">Notion</span>
              <span class="mockup-card-domain">notion.so</span>
            </div>
            <div class="mockup-card">
              <div class="mockup-card-fav">F</div>
              <span class="mockup-card-title">Figma</span>
              <span class="mockup-card-domain">figma.com</span>
            </div>
          </div>
          <div class="mockup-recent-label">
            <span>Recent</span>
          </div>
          <div class="mockup-recent-list">
            <div class="mockup-recent-item">
              <div class="mockup-recent-fav">C</div>
              <div class="mockup-recent-text">
                <strong>Claude</strong>
                <span>claude.ai</span>
              </div>
            </div>
            <div class="mockup-recent-item">
              <div class="mockup-recent-fav">L</div>
              <div class="mockup-recent-text">
                <strong>Linear</strong>
                <span>linear.app</span>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>

    <section id="features">
      <div class="container">
        <div class="section-head">
          <h2>Designed for everyday use</h2>
          <p>三个层级、一个搜索框、全部键盘可达。打开新标签页即可在 1-2 个动作内找到目标网站。</p>
        </div>
        <div class="features">
          <article class="feature">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <h3>Search first</h3>
            <p>Spotlight 风格搜索面板。输入即搜，结果按书签/文件夹/网页分组。键盘全程可达。</p>
          </article>
          <article class="feature">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3>Browse by folder</h3>
            <p>左侧导航栏 + 右侧书签网格。文件夹内可搜索过滤，书签卡片显示 favicon、标题、域名。</p>
          </article>
          <article class="feature">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <h3>Privacy by design</h3>
            <p>书签标题、URL、文件夹名、设置数据均不发送到开发者服务器。网页搜索通过 Chrome Search API 处理。</p>
          </article>
        </div>
      </div>
    </section>

    <section id="themes">
      <div class="container">
        <div class="section-head">
          <h2>Three themes, five accents</h2>
          <p>亮色 / 暗色 / 跟随系统，配合 5 种强调色。</p>
        </div>
        <div class="theme-showcase">
          <div class="theme-card paper">
            <div class="theme-name">Light</div>
            <div class="theme-desc">Warm paper · Default</div>
          </div>
          <div class="theme-card dark">
            <div class="theme-name">Dark</div>
            <div class="theme-desc">Soft charcoal</div>
          </div>
          <div class="theme-card system">
            <div class="theme-name">System</div>
            <div class="theme-desc">Follows OS preference</div>
          </div>
        </div>
        <div class="accent-row">
          <div class="accent-swatch"><div class="dot" style="background:#6b9b7a"></div><span>Sage</span></div>
          <div class="accent-swatch"><div class="dot" style="background:#5a9e9e"></div><span>Teal</span></div>
          <div class="accent-swatch"><div class="dot" style="background:#b8697a"></div><span>Rose</span></div>
          <div class="accent-swatch"><div class="dot" style="background:#6b8fa3"></div><span>Stone</span></div>
          <div class="accent-swatch"><div class="dot" style="background:#b8926b"></div><span>Warmth</span></div>
        </div>
      </div>
    </section>

    <section id="install">
      <div class="container">
        <div class="section-head">
          <h2>Get started</h2>
          <p>下载解压，在 Chrome/Edge 扩展管理页面加载已解压的扩展即可。</p>
        </div>
        <div class="install-grid">
          <div class="install-card">
            <div class="label">Latest Release</div>
            <div class="version-num">v${VERSION}</div>
            <a class="btn btn-primary" href="${RELEASE_ZIP}">Download .zip</a>
          </div>
          <div class="install-card">
            <div class="label">Installation</div>
            <ol>
              <li>Download and extract <code>marktab-${VERSION}.zip</code>.</li>
              <li>Open <code>chrome://extensions/</code> or <code>edge://extensions/</code>.</li>
              <li>Enable Developer mode, click "Load unpacked".</li>
              <li>Select the extracted MarkTab folder.</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  </main>

  <div class="container">
    <footer>
      <span>© 2026 MarkTab</span>
      <span>
        <a href="${PRIVACY_URL}">Privacy Policy</a>
        · <a href="${GITHUB_REPO}">GitHub</a>
      </span>
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

addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname === '/robots.txt') {
    event.respondWith(respond('User-agent: *\nAllow: /\n', 'text/plain; charset=utf-8'));
    return;
  }

  if (url.pathname === '/download') {
    event.respondWith(Response.redirect(RELEASE_ZIP, 302));
    return;
  }

  if (url.pathname === '/github') {
    event.respondWith(Response.redirect(GITHUB_REPO, 302));
    return;
  }

  event.respondWith(respond(html, 'text/html; charset=utf-8'));
});
