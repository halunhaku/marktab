const FALLBACK_VERSION = '2.1.1';
const GITHUB_REPO = 'https://github.com/halunhaku/marktab';
const GITHUB_API_LATEST_RELEASE = 'https://api.github.com/repos/halunhaku/marktab/releases/latest';
const FALLBACK_RELEASE_URL = `${GITHUB_REPO}/releases/tag/v${FALLBACK_VERSION}`;
const FALLBACK_RELEASE_ZIP = `${GITHUB_REPO}/releases/download/v${FALLBACK_VERSION}/marktab-${FALLBACK_VERSION}.zip`;
const PRIVACY_URL = `${GITHUB_REPO}/blob/main/PRIVACY_POLICY.md`;
const LICENSE_URL = `${GITHUB_REPO}#license`;
// The tracked screenshot set lives in `store-assets/` (captured by `npm run screenshots`
// from the real build), so point at the files that exist rather than a README-only folder.
const SCREENSHOT_BASE = 'https://raw.githubusercontent.com/halunhaku/marktab/main/store-assets';

const screenshots = {
  home: `${SCREENSHOT_BASE}/newtab-screenshot-1280x800.jpg`,
  popup: `${SCREENSHOT_BASE}/popup-screenshot-1280x800.jpg`,
  pinned: `${SCREENSHOT_BASE}/pinned-1280x800.jpg`,
  recent: `${SCREENSHOT_BASE}/recent-1280x800.jpg`,
  spotlight: `${SCREENSHOT_BASE}/palette-screenshot-1280x800.jpg`,
  folder: `${SCREENSHOT_BASE}/folder-screenshot-1280x800.jpg`,
  settings: `${SCREENSHOT_BASE}/settings-1280x800.jpg`
};

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#5b6cff"/>
  <path d="M20 14h24a5 5 0 0 1 5 5v31L32 41 15 50V19a5 5 0 0 1 5-5z" fill="#fff"/>
  <path d="M23 19h18a3 3 0 0 1 3 3v19l-12-6.5L20 41V22a3 3 0 0 1 3-3z" fill="#dce4fb"/>
  <path d="M32 35l12 6V22a3 3 0 0 0-3-3H23a3 3 0 0 0-3 3v19l12-6z" fill="#f4f6fd"/>
</svg>`;

function fallbackRelease() {
  return {
    version: FALLBACK_VERSION,
    releaseUrl: FALLBACK_RELEASE_URL,
    zipUrl: FALLBACK_RELEASE_ZIP,
    zipName: `marktab-${FALLBACK_VERSION}.zip`
  };
}

async function getLatestRelease() {
  try {
    const response = await fetch(GITHUB_API_LATEST_RELEASE, {
      headers: {
        'accept': 'application/vnd.github+json',
        'user-agent': 'marktab-home-worker'
      }
    });

    if (!response.ok) return fallbackRelease();

    const release = await response.json();
    const tag = typeof release.tag_name === 'string' ? release.tag_name : `v${FALLBACK_VERSION}`;
    const version = tag.replace(/^v/i, '');
    const zipAsset = Array.isArray(release.assets)
      ? release.assets.find(asset => /^marktab-\d+\.\d+\.\d+\.zip$/.test(asset.name || '')) ||
        release.assets.find(asset => typeof asset.name === 'string' && asset.name.endsWith('.zip'))
      : null;

    return {
      version,
      releaseUrl: release.html_url || `${GITHUB_REPO}/releases/tag/${tag}`,
      zipUrl: zipAsset?.browser_download_url || `${GITHUB_REPO}/releases/download/${tag}/marktab-${version}.zip`,
      zipName: zipAsset?.name || `marktab-${version}.zip`
    };
  } catch {
    return fallbackRelease();
  }
}

function renderHtml(release) {
  const { version, releaseUrl, zipUrl, zipName } = release;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MarkTab - 书签驱动的新标签页扩展</title>
  <meta name="description" content="MarkTab 是一个以书签为核心的 Chrome 新标签页扩展，用更安静、清晰、快速的方式管理和访问常用网页。">
  <meta property="og:title" content="MarkTab">
  <meta property="og:description" content="以书签为核心的浏览器新标签页扩展。">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${screenshots.home}">
  <meta name="theme-color" content="#f6f8fc">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f6f8fc;
      --bg-soft: #f3f6fb;
      --surface: #ffffff;
      --surface-soft: #f8fafc;
      --surface-glass: rgba(255, 255, 255, 0.78);
      --text: #101828;
      --text-muted: #667085;
      --text-faint: #8a94a6;
      --accent: #5b6cff;
      --accent-strong: #4f7cff;
      --accent-soft: rgba(91, 108, 255, 0.12);
      --accent-surface: rgba(79, 124, 255, 0.08);
      --accent-border: rgba(79, 124, 255, 0.2);
      --line: rgba(15, 23, 42, 0.1);
      --line-strong: rgba(15, 23, 42, 0.12);
      --shadow-sm: 0 10px 24px rgba(15, 23, 42, 0.04);
      --shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
      --shadow-hover: 0 26px 60px rgba(15, 23, 42, 0.1);
      --radius-card: 20px;
      --radius-card-lg: 24px;
      --radius-card-xl: 28px;
      --radius-input: 12px;
      --radius-pill: 999px;
      --ease-out: cubic-bezier(0.32, 0.72, 0, 1);
      --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
      --duration-fast: 120ms;
      --duration-base: 200ms;
      --duration-slow: 320ms;
      --serif: "Noto Serif SC", "Songti SC", "STSong", "Source Han Serif SC", Georgia, serif;
      --sans: "Geist", "Noto Sans SC", "PingFang SC", "Helvetica Neue", system-ui, sans-serif;
      --mono: "SFMono-Regular", "Menlo", "Consolas", "JetBrains Mono", monospace;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #080d16;
        --bg-soft: #0d1422;
        --surface: rgba(15, 23, 42, 0.72);
        --surface-soft: rgba(30, 41, 59, 0.62);
        --surface-glass: rgba(15, 23, 42, 0.78);
        --text: #f8fafc;
        --text-muted: #cbd5e1;
        --text-faint: #64748b;
        --accent: #7aa2ff;
        --accent-strong: #7aa2ff;
        --accent-soft: rgba(122, 162, 255, 0.16);
        --accent-surface: rgba(122, 162, 255, 0.16);
        --accent-border: rgba(122, 162, 255, 0.34);
        --line: rgba(148, 163, 184, 0.16);
        --line-strong: rgba(148, 163, 184, 0.26);
        --shadow-sm: 0 12px 26px rgba(2, 6, 23, 0.18);
        --shadow: 0 22px 48px rgba(2, 6, 23, 0.28);
        --shadow-hover: 0 28px 70px rgba(2, 6, 23, 0.36);
      }
    }

    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    body {
      margin: 0;
      min-height: 100dvh;
      font-family: var(--sans);
      font-optical-sizing: auto;
      color: var(--text);
      line-height: 1.6;
      background:
        radial-gradient(circle at 12% 0%, rgba(91, 108, 255, 0.1), transparent 34rem),
        radial-gradient(circle at 88% 10%, rgba(79, 124, 255, 0.08), transparent 28rem),
        linear-gradient(180deg, #f4f7fb 0%, #f6f8fc 54%, #f3f6fb 100%);
    }
    a { color: inherit; text-decoration: none; }
    img { display: block; max-width: 100%; height: auto; }
    :focus-visible {
      outline: 2px solid rgba(91, 108, 255, 0.5);
      outline-offset: 3px;
    }
    .page { overflow: hidden; }
    .container { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
    .section { padding: 56px 0; }
    .section-head { max-width: 680px; margin-bottom: 24px; }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      color: var(--accent-strong);
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
      background: var(--accent);
      box-shadow: 0 0 0 5px var(--accent-soft);
    }
    h1, h2, h3, p { margin: 0; }
    h1, h2, h3 { font-family: var(--serif); }
    h1 { letter-spacing: -0.045em; }
    h2 { font-size: clamp(2rem, 4vw, 3.4rem); line-height: 1.08; font-weight: 400; letter-spacing: -0.03em; }
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
      box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.55);
      backdrop-filter: blur(18px) saturate(180%);
      -webkit-backdrop-filter: blur(18px) saturate(180%);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding-right: 8px;
      font-family: var(--serif);
      font-size: 0.96rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      white-space: nowrap;
    }
    .brand-mark {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 11px;
      background: linear-gradient(180deg, rgba(34, 44, 66, 0.96), rgba(57, 78, 120, 0.92));
      color: #f9fbff;
      font-size: 0.84rem;
      font-weight: 800;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 8px 16px rgba(15, 23, 42, 0.1);
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-muted);
      font-size: 0.86rem;
    }
    .nav-links a {
      display: inline-flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: var(--radius-pill);
      transition:
        background-color var(--duration-base) var(--ease-out),
        color var(--duration-base) var(--ease-out),
        transform var(--duration-fast) var(--ease-out);
      white-space: nowrap;
    }
    .nav-links a:hover { background: var(--accent-surface); color: var(--accent-strong); }
    .nav-links a:active { transform: scale(0.96); transition-duration: 80ms; }

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
      font-weight: 400;
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
      letter-spacing: -0.01em;
      white-space: nowrap;
      transition:
        transform var(--duration-base) var(--ease-out),
        background-color var(--duration-base) var(--ease-out),
        border-color var(--duration-base) var(--ease-out),
        box-shadow var(--duration-base) var(--ease-out);
    }
    .btn:hover { transform: translateY(-1px); }
    .btn:active { transform: scale(0.97); transition-duration: 80ms; }
    .btn-primary {
      background: linear-gradient(180deg, #6077ff 0%, var(--accent-strong) 100%);
      color: #f8fbff;
      box-shadow: 0 14px 28px rgba(79, 124, 255, 0.22);
    }
    .btn-primary:hover { box-shadow: 0 18px 34px rgba(79, 124, 255, 0.3); }
    .btn-secondary { background: var(--surface); border-color: var(--line); color: var(--text); }
    .btn-secondary:hover { border-color: var(--accent-border); background: var(--accent-surface); color: var(--accent-strong); }
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
      border-radius: var(--radius-card-xl);
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
      background: var(--surface);
      box-shadow: var(--shadow);
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
      border-radius: var(--radius-card-lg);
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
      font-family: var(--mono);
      font-size: 0.72rem;
      font-weight: 500;
      letter-spacing: 0.02em;
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
      border-radius: var(--radius-card-lg);
      background: var(--surface-glass);
      box-shadow: var(--shadow-sm);
    }
    .feature-card {
      min-height: 190px;
      padding: 22px;
    }
    .feature-card,
    .privacy-card,
    .install-card,
    .principle {
      transition:
        transform var(--duration-base) var(--ease-out),
        border-color var(--duration-base) var(--ease-out),
        box-shadow var(--duration-base) var(--ease-out);
    }
    .feature-card:hover,
    .privacy-card:hover,
    .install-card:hover,
    .principle:hover {
      transform: translateY(-2px);
      border-color: var(--accent-border);
      box-shadow: var(--shadow);
    }
    .feature-icon {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      margin-bottom: 18px;
      border-radius: var(--radius-input);
      background: var(--accent-soft);
      color: var(--accent-strong);
      font-weight: 800;
    }
    .feature-card h3 { font-size: 1rem; letter-spacing: -0.01em; margin-bottom: 8px; }
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
      border-radius: var(--radius-card);
      background: var(--surface);
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
      font-family: var(--serif);
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
      background: var(--accent-soft);
      color: var(--accent-strong);
      font-family: var(--mono);
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.02em;
    }
    .install-card h3 { font-size: 1rem; margin-bottom: 8px; }
    .install-card p { color: var(--text-muted); font-size: 0.9rem; }
    code {
      padding: 2px 6px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: var(--surface-soft);
      font-family: var(--mono);
      font-size: 0.84em;
    }

    .download-panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-top: 26px;
      padding: 22px;
      border: 1px solid var(--accent-border);
      border-radius: var(--radius-card-lg);
      background: var(--accent-surface);
    }
    .download-panel strong { display: block; font-family: var(--serif); font-size: 1.1rem; font-weight: 400; }
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
    .footer a:hover { color: var(--accent-strong); }

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

    .hero { animation: heroIn 640ms var(--ease-out) both; }
    @keyframes heroIn {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .js .section { opacity: 0; transform: translateY(18px); }
    .js .section.visible {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 600ms var(--ease-out), transform 600ms var(--ease-out);
    }
    .section.visible .feature-card { animation: rise 520ms var(--ease-out) both; }
    .section.visible .feature-card:nth-child(2) { animation-delay: 60ms; }
    .section.visible .feature-card:nth-child(3) { animation-delay: 120ms; }
    .section.visible .feature-card:nth-child(4) { animation-delay: 180ms; }
    .section.visible .feature-card:nth-child(5) { animation-delay: 240ms; }
    .section.visible .feature-card:nth-child(6) { animation-delay: 300ms; }
    @keyframes rise {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        scroll-behavior: auto !important;
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
    @media (prefers-color-scheme: dark) {
      body {
        background:
          radial-gradient(circle at 12% 0%, rgba(87, 103, 163, 0.16), transparent 34rem),
          radial-gradient(circle at 88% 10%, rgba(75, 90, 140, 0.14), transparent 28rem),
          linear-gradient(180deg, var(--bg) 0%, var(--bg-soft) 100%);
      }
      .nav {
        box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }
      .btn-primary {
        background: linear-gradient(180deg, #8aaeff 0%, #6f98ff 100%);
        box-shadow: 0 16px 30px rgba(9, 23, 51, 0.34);
      }
      .btn-primary:hover {
        box-shadow: 0 18px 34px rgba(9, 23, 51, 0.4);
      }
    }
  </style>
  <script>
    (function () {
      document.documentElement.classList.add('js');
      function init() {
        var sections = document.querySelectorAll('.section');
        if (!sections.length) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
            !('IntersectionObserver' in window)) {
          sections.forEach(function (s) { s.classList.add('visible'); });
          return;
        }
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              io.unobserve(entry.target);
            }
          });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        sections.forEach(function (s) { io.observe(s); });
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  </script>
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
              <a class="btn btn-primary" href="${zipUrl}">Download v${version}</a>
              <a class="btn btn-secondary" href="${GITHUB_REPO}">View on GitHub</a>
            </div>
            <div class="badges" aria-label="Project badges">
              <span class="badge">Manifest V3</span>
              <span class="badge">Chrome Extension</span>
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
            <p class="section-desc">Landing page 使用仓库中的真实截图（store-assets/），展示首页、快捷面板、搜索、固定书签、最近访问和文件夹视图。</p>
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
                <figcaption class="shot-caption"><span>Recent items</span><span>Recently opened</span></figcaption>
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
              <p>下载 <code>${zipName}</code>，并解压到一个固定文件夹。</p>
            </article>
            <article class="install-card">
              <span class="step">2</span>
              <h3>打开扩展管理页面</h3>
              <p>在 Chrome 地址栏打开 <code>chrome://extensions/</code>。</p>
            </article>
            <article class="install-card">
              <span class="step">3</span>
              <h3>加载已解压扩展</h3>
              <p>启用开发者模式，点击加载已解压的扩展程序，选择 MarkTab 文件夹。</p>
            </article>
          </div>
          <div class="download-panel">
            <div>
              <strong>Latest release: v${version}</strong>
              <span>Manifest V3 package for Chrome.</span>
            </div>
            <a class="btn btn-primary" href="${zipUrl}">Download v${version}</a>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="container footer-inner">
        <span>© 2026 MarkTab. MIT License.</span>
        <div class="footer-links">
          <a href="${GITHUB_REPO}">GitHub</a>
          <a href="${releaseUrl}">Release</a>
          <a href="${PRIVACY_URL}">Privacy</a>
          <a href="${LICENSE_URL}">License</a>
        </div>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

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

async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === '/robots.txt') {
    return respond('User-agent: *\nAllow: /\n', 'text/plain; charset=utf-8');
  }

  if (url.pathname === '/favicon.svg') {
    return respond(faviconSvg, 'image/svg+xml; charset=utf-8');
  }

  const latestRelease = await getLatestRelease();

  if (url.pathname === '/download') {
    return redirectTo(latestRelease.zipUrl);
  }

  if (url.pathname === '/github') {
    return redirectTo(GITHUB_REPO);
  }

  if (url.pathname === '/release') {
    return redirectTo(latestRelease.releaseUrl);
  }

  if (url.pathname === '/privacy') {
    return redirectTo(PRIVACY_URL);
  }

  return respond(renderHtml(latestRelease), 'text/html; charset=utf-8');
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
