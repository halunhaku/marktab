const VERSION = '1.2.1';
const RELEASE_ZIP = `https://github.com/forhalunhaku/marktab/releases/download/v${VERSION}/marktab-${VERSION}.zip`;
const GITHUB_REPO = 'https://github.com/forhalunhaku/marktab';
const PRIVACY_URL = `${GITHUB_REPO}/blob/main/PRIVACY_POLICY.md`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MarkTab - 隐私友好的书签新标签页</title>
  <meta name="description" content="MarkTab 是一个 Chrome/Edge 新标签页扩展，把本地浏览器书签整理成快速、清晰、隐私友好的书签工作台。">
  <meta property="og:title" content="MarkTab">
  <meta property="og:description" content="一个快速、清晰、隐私友好的书签新标签页。">
  <meta property="og:type" content="website">
  <meta name="theme-color" content="#101215">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23101215'/%3E%3Crect x='8' y='8' width='48' height='48' rx='12' fill='%231d2226' stroke='%2378b8a2' stroke-opacity='.55'/%3E%3Cpath d='M18 45V19h7l7 13 7-13h7v26h-7V31.5L34.7 42h-5.4L25 31.5V45h-7Z' fill='%2378b8a2'/%3E%3C/svg%3E">
  <link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'%3E%3Crect width='180' height='180' rx='42' fill='%23101215'/%3E%3Crect x='22' y='22' width='136' height='136' rx='32' fill='%231d2226' stroke='%2378b8a2' stroke-opacity='.55' stroke-width='4'/%3E%3Cpath d='M51 128V52h20l19 35 19-35h20v76h-19V89l-12 30H82L70 89v39H51Z' fill='%2378b8a2'/%3E%3C/svg%3E">
  <style>
    :root {
      color-scheme: dark;
      --bg: #101215;
      --surface: rgba(22, 25, 29, 0.78);
      --surface-strong: #1d2226;
      --line: rgba(242, 241, 236, 0.1);
      --line-strong: rgba(242, 241, 236, 0.18);
      --text: #f2f1ec;
      --muted: #b9c0bc;
      --soft: #87918d;
      --accent: #78b8a2;
      --accent-2: #d6c7a1;
      --accent-soft: rgba(120, 184, 162, 0.13);
      --shadow: 0 30px 90px rgba(0, 0, 0, 0.32);
      font-family: "Avenir Next", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      min-height: 100dvh;
      background:
        radial-gradient(circle at 14% -8%, rgba(120, 184, 162, 0.18), transparent 34rem),
        radial-gradient(circle at 86% 22%, rgba(214, 199, 161, 0.12), transparent 30rem),
        linear-gradient(180deg, #14181b 0%, var(--bg) 36rem);
      color: var(--text);
      line-height: 1.6;
      overflow-x: hidden;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .shell {
      width: min(1180px, calc(100% - 40px));
      margin: 0 auto;
    }

    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.4rem 0;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.8rem;
      font-weight: 800;
      letter-spacing: 0;
    }

    .mark {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(120, 184, 162, 0.36);
      border-radius: 12px;
      background: var(--accent-soft);
      color: var(--accent);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: var(--muted);
      font-size: 0.95rem;
    }

    .nav-links a {
      transition: color 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .nav-links a:hover {
      color: var(--text);
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(420px, 1.05fr);
      gap: clamp(2rem, 6vw, 5rem);
      align-items: center;
      min-height: calc(100dvh - 84px);
      padding: 3rem 0 5rem;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      width: fit-content;
      padding: 0.45rem 0.7rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.035);
      color: var(--muted);
      font-size: 0.88rem;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 4px var(--accent-soft);
    }

    h1 {
      margin: 1.4rem 0 1rem;
      max-width: 10ch;
      font-size: clamp(4rem, 11vw, 9rem);
      line-height: 0.9;
      letter-spacing: 0;
      font-weight: 500;
    }

    .lead {
      max-width: 36rem;
      margin: 0;
      color: var(--muted);
      font-size: clamp(1rem, 1.7vw, 1.22rem);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
      margin-top: 2rem;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 46px;
      padding: 0.8rem 1rem;
      border-radius: 13px;
      border: 1px solid var(--line);
      font-weight: 750;
      transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), background 180ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .button:hover {
      transform: translateY(-2px);
      border-color: var(--line-strong);
    }

    .button:active {
      transform: translateY(1px) scale(0.99);
    }

    .primary {
      background: var(--accent);
      color: #101215;
      border-color: transparent;
    }

    .secondary {
      background: rgba(255, 255, 255, 0.035);
      color: var(--text);
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.7rem;
      margin-top: 1.4rem;
      color: var(--soft);
      font-size: 0.9rem;
    }

    .meta span {
      padding: 0.25rem 0.55rem;
      border: 1px solid var(--line);
      border-radius: 999px;
    }

    .product {
      position: relative;
      min-height: 560px;
    }

    .screen {
      position: absolute;
      inset: 2rem 0 auto auto;
      width: min(700px, 100%);
      min-height: 460px;
      padding: 2rem;
      border: 1px solid var(--line);
      border-radius: 28px;
      background: rgba(16, 18, 21, 0.72);
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
      overflow: hidden;
      animation: rise 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .screen::after {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 75% 25%, rgba(214, 199, 161, 0.13), transparent 18rem);
      pointer-events: none;
    }

    .clock {
      display: flex;
      align-items: end;
      gap: 1.2rem;
      position: relative;
      z-index: 1;
    }

    .time {
      font-size: clamp(4rem, 8vw, 7rem);
      line-height: 0.9;
      font-weight: 500;
    }

    .date {
      color: var(--soft);
      padding-bottom: 0.65rem;
    }

    .search {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      margin-top: 2rem;
      padding: 0.55rem;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.025);
    }

    .engine,
    .submit {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
    }

    .engine {
      background: var(--surface-strong);
      color: var(--accent);
      font-weight: 800;
    }

    .submit {
      margin-left: auto;
      background: var(--accent);
      color: #101215;
    }

    .placeholder {
      color: var(--soft);
    }

    .folders {
      position: relative;
      z-index: 1;
      margin-top: 2.4rem;
    }

    .label {
      color: var(--soft);
      font-size: 0.78rem;
      letter-spacing: 0.14em;
      font-weight: 800;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.7rem;
      margin-top: 0.8rem;
      padding: 0.7rem;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.025);
    }

    .chip {
      padding: 0.55rem 0.7rem;
      border: 1px solid transparent;
      border-radius: 11px;
      color: var(--muted);
    }

    .chip.active {
      color: var(--text);
      border-color: rgba(120, 184, 162, 0.38);
      background: var(--accent-soft);
    }

    .cards {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.8rem;
      margin-top: 1rem;
    }

    .card {
      min-height: 110px;
      padding: 1rem;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.025);
    }

    .favicon {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 1px solid var(--line);
      border-radius: 11px;
      color: var(--accent);
      background: var(--surface-strong);
      font-weight: 800;
    }

    .card strong {
      display: block;
      margin-top: 0.85rem;
      font-size: 0.94rem;
    }

    .card span {
      display: block;
      color: var(--soft);
      font-size: 0.82rem;
    }

    section {
      padding: 5rem 0;
      border-top: 1px solid var(--line);
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      gap: 2rem;
      align-items: end;
      margin-bottom: 2rem;
    }

    h2 {
      max-width: 14ch;
      margin: 0;
      font-size: clamp(2rem, 5vw, 4.2rem);
      line-height: 0.98;
      font-weight: 560;
    }

    .section-head p {
      max-width: 31rem;
      margin: 0;
      color: var(--muted);
    }

    .feature-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr 1fr;
      gap: 1rem;
    }

    .feature {
      min-height: 190px;
      padding: 1.2rem;
      border: 1px solid var(--line);
      border-radius: 20px;
      background: var(--surface);
    }

    .feature:nth-child(4) {
      grid-column: span 2;
    }

    .feature h3 {
      margin: 0 0 0.7rem;
      font-size: 1.15rem;
    }

    .feature p {
      margin: 0;
      color: var(--muted);
    }

    .install {
      display: grid;
      grid-template-columns: 0.8fr 1.2fr;
      gap: 1rem;
      align-items: stretch;
    }

    .version-card,
    .steps {
      border: 1px solid var(--line);
      border-radius: 22px;
      background: var(--surface);
      padding: 1.3rem;
    }

    .version-card strong {
      display: block;
      font-size: 3.4rem;
      line-height: 1;
      font-weight: 520;
      margin: 0.7rem 0 1rem;
    }

    ol {
      margin: 0;
      padding-left: 1.2rem;
      color: var(--muted);
    }

    li + li {
      margin-top: 0.75rem;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 2rem 0 3rem;
      color: var(--soft);
      font-size: 0.92rem;
    }

    .footer a {
      color: var(--muted);
    }

    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 900px) {
      .hero,
      .install {
        grid-template-columns: 1fr;
      }

      .hero {
        min-height: auto;
        padding-top: 2rem;
      }

      .product {
        min-height: auto;
      }

      .screen {
        position: relative;
        inset: auto;
      }

      .feature-grid {
        grid-template-columns: 1fr;
      }

      .feature:nth-child(4) {
        grid-column: auto;
      }

      .section-head {
        display: grid;
      }
    }

    @media (max-width: 560px) {
      .shell {
        width: min(100% - 28px, 1180px);
      }

      .nav-links {
        display: none;
      }

      h1 {
        font-size: clamp(3.3rem, 22vw, 5rem);
      }

      .screen {
        min-height: auto;
        padding: 1rem;
        border-radius: 20px;
      }

      .clock {
        display: block;
      }

      .date {
        padding: 0.4rem 0 0;
      }

      .cards {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <nav class="nav shell" aria-label="主导航">
    <a class="brand" href="/">
      <span class="mark">M</span>
      <span>MarkTab</span>
    </a>
    <div class="nav-links">
      <a href="#features">功能</a>
      <a href="#install">安装</a>
      <a href="${PRIVACY_URL}">隐私</a>
      <a href="${GITHUB_REPO}">GitHub</a>
    </div>
  </nav>

  <main>
    <header class="hero shell">
      <div>
        <div class="eyebrow"><span class="dot"></span> Chrome / Edge Manifest V3</div>
        <h1>MarkTab</h1>
        <p class="lead">把浏览器书签整理成快速、清晰、隐私友好的新标签页工作台。所有书签标题、URL、文件夹和设置都留在本地浏览器里。</p>
        <div class="actions">
          <a class="button primary" href="${RELEASE_ZIP}">下载 v${VERSION}</a>
          <a class="button secondary" href="${GITHUB_REPO}">查看源码</a>
        </div>
        <div class="meta">
          <span>无框架依赖</span>
          <span>本地图标和系统字体</span>
          <span>可恢复隐藏分类</span>
        </div>
      </div>

      <div class="product" aria-label="MarkTab 界面预览">
        <div class="screen">
          <div class="clock">
            <div class="time">12:14</div>
            <div class="date">Wednesday, May 20, 2026</div>
          </div>
          <div class="search">
            <div class="engine">G</div>
            <div class="placeholder">Search bookmarks or the web...</div>
            <div class="submit">⌕</div>
          </div>
          <div class="folders">
            <div class="label">FOLDERS</div>
            <div class="chips">
              <div class="chip active">All · 128</div>
              <div class="chip">Research · 34</div>
              <div class="chip">Tools · 19</div>
            </div>
          </div>
          <div class="cards">
            <div class="card"><div class="favicon">G</div><strong>GitHub</strong><span>github.com</span></div>
            <div class="card"><div class="favicon">F</div><strong>Figma</strong><span>figma.com</span></div>
            <div class="card"><div class="favicon">D</div><strong>Docs</strong><span>developer.chrome.com</span></div>
          </div>
        </div>
      </div>
    </header>

    <section id="features">
      <div class="shell">
        <div class="section-head">
          <h2>为日常打开而设计</h2>
          <p>MarkTab 不试图接管你的浏览器，它只把已经存在的本地书签变得更容易搜索、浏览和管理。</p>
        </div>
        <div class="feature-grid">
          <article class="feature">
            <h3>自动按文件夹整理</h3>
            <p>读取浏览器书签树，按用户自建文件夹展示，并保留未分类书签入口。</p>
          </article>
          <article class="feature">
            <h3>快速搜索</h3>
            <p>按标题和 URL 搜索书签，支持 Ctrl/Cmd + K、方向键和 Enter 键盘流。</p>
          </article>
          <article class="feature">
            <h3>网页搜索清晰可控</h3>
            <p>支持 Google、Baidu、Bing、DuckDuckGo；搜索词只会发往你选择的搜索引擎。</p>
          </article>
          <article class="feature">
            <h3>隐私边界明确</h3>
            <p>不向开发者服务器发送书签标题、URL、文件夹名、favicon 域名或设置数据。</p>
          </article>
          <article class="feature">
            <h3>置顶、隐藏、恢复</h3>
            <p>常用书签可置顶，不想展示的分类可隐藏，并能在设置面板里恢复。</p>
          </article>
        </div>
      </div>
    </section>

    <section id="install">
      <div class="shell install">
        <div class="version-card">
          <span class="label">LATEST RELEASE</span>
          <strong>v${VERSION}</strong>
          <a class="button primary" href="${RELEASE_ZIP}">下载安装包</a>
        </div>
        <div class="steps">
          <span class="label">INSTALL</span>
          <ol>
            <li>下载并解压 <code>marktab-${VERSION}.zip</code>。</li>
            <li>打开 <code>chrome://extensions/</code> 或 <code>edge://extensions/</code>。</li>
            <li>开启开发者模式，点击“加载已解压的扩展程序”。</li>
            <li>选择解压后的 MarkTab 文件夹。</li>
          </ol>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer shell">
    <span>© 2026 MarkTab</span>
    <span><a href="${PRIVACY_URL}">Privacy Policy</a> · <a href="${GITHUB_REPO}">GitHub</a></span>
  </footer>
</body>
</html>`;

function response(body, contentType, status = 200) {
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
    event.respondWith(response('User-agent: *\\nAllow: /\\n', 'text/plain; charset=utf-8'));
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

  event.respondWith(response(html, 'text/html; charset=utf-8'));
});
