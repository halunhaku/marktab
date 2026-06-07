/**
 * MarkTab — Bookmark Launcher
 * Search-first, keyboard-driven, paper-calm new tab.
 */

// ─── Theme Registry ──────────────────────────────────────────
const THEMES = [
  { id: 'light',  name: 'Light',  desc: 'Warm paper' },
  { id: 'dark',   name: 'Dark',   desc: 'Soft charcoal' },
  { id: 'system', name: 'System', desc: 'Follows OS' }
];

const ACCENTS = [
  { id: 'green', name: 'Sage',    value: '#6b9b7a' },
  { id: 'teal',  name: 'Teal',    value: '#5a9e9e' },
  { id: 'rose',  name: 'Rose',    value: '#b8697a' },
  { id: 'blue',  name: 'Stone',   value: '#6b8fa3' },
  { id: 'warm',  name: 'Warmth',  value: '#b8926b' }
];

// ─── Defaults ────────────────────────────────────────────────
const DEFAULTS = {
  hiddenFolderIds: [],
  pinnedBookmarkUrls: [],
  recentUrls: [],
  theme: 'light',
  accent: 'green',
  homeShowRecent: true,
  homeRecentCount: 8
};

// ─── State ───────────────────────────────────────────────────
let settings = {};
let allBookmarks = [];
let bookmarkTree = [];
let flatFolders = [];
let uncategorizedBookmarks = [];

// ─── DOM refs ────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = {
  homeView:            $('homeView'),
  folderView:          $('folderView'),
  settingsView:        $('settingsView'),
  homeClock:           $('homeClock'),
  homeDate:            $('homeDate'),
  homeSearchInput:     $('homeSearchInput'),
  homeSections:        $('homeSections'),
  homePinnedGrid:      $('homePinnedGrid'),
  homeRecentGrid:      $('homeRecentGrid'),
  homeFolderPills:     $('homeFolderPills'),
  homeLoading:         $('homeLoading'),
  homeFab:             $('homeFab'),
  folderSidebar:       $('folderSidebar'),
  sidebarNav:          $('sidebarNav'),
  sidebarHomeBtn:      $('sidebarHomeBtn'),
  folderSearchInput:   $('folderSearchInput'),
  folderTitle:         $('folderTitle'),
  folderCount:         $('folderCount'),
  folderContent:       $('folderContent'),
  folderBookmarksGrid: $('folderBookmarksGrid'),
  folderEmpty:         $('folderEmpty'),
  searchPanel:         $('searchPanel'),
  searchPanelOverlay:  $('searchPanelOverlay'),
  searchPanelInput:    $('searchPanelInput'),
  searchPanelClose:    $('searchPanelClose'),
  searchPanelResults:  $('searchPanelResults'),
  searchBookmarkItems: $('searchBookmarkItems'),
  searchFolderItems:   $('searchFolderItems'),
  searchWebItem:       $('searchWebItem'),
  searchEmpty:         $('searchEmpty'),
  toastContainer:      $('toastContainer')
};

// ─── Helpers ─────────────────────────────────────────────────
function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url || ''; }
}

function getFaviconUrl(pageUrl, size = 32) {
  if (!pageUrl || typeof chrome === 'undefined' || !chrome.runtime) return '';
  try {
    const u = new URL(chrome.runtime.getURL('/_favicon/'));
    u.searchParams.set('pageUrl', pageUrl);
    u.searchParams.set('size', String(size));
    return u.toString();
  } catch { return ''; }
}

function highlightMatch(text, query) {
  const safe = escapeHtml(text);
  if (!query) return safe;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ─── Toast ───────────────────────────────────────────────────
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  el.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

// ─── Time ────────────────────────────────────────────────────
function updateTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  el.homeClock.textContent = `${h}:${m}`;
  el.homeDate.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });
}

// ─── Theme ───────────────────────────────────────────────────
let systemWatcher = null;
let systemCallback = null;

function applyTheme(themeId, accentId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const accent = ACCENTS.find(a => a.id === accentId) || ACCENTS[0];
  settings.theme = theme.id;
  settings.accent = accent.id;

  // Stop previous system watcher
  if (systemWatcher && systemCallback) {
    systemWatcher.removeEventListener('change', systemCallback);
    systemWatcher = null;
    systemCallback = null;
  }

  if (theme.id === 'system') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light';
    systemCallback = e => {
      document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    };
    mq.addEventListener('change', systemCallback);
    systemWatcher = mq;
  } else {
    document.documentElement.dataset.theme = theme.id;
  }

  document.documentElement.style.setProperty('--accent-primary', accent.value);
  document.documentElement.style.setProperty('--accent-rgb', hexToRgb(accent.value));
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `${r},${g},${b}`;
}

// ─── Settings ────────────────────────────────────────────────
async function loadSettings() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.sync.get(['markTabSettings']);
      settings = { ...DEFAULTS, ...(result.markTabSettings || {}) };
      // migrate legacy
      if (!result.markTabSettings) {
        const legacy = await chrome.storage.sync.get(['rainbowBookmarkSettings']);
        if (legacy.rainbowBookmarkSettings) {
          settings = { ...DEFAULTS, ...legacy.rainbowBookmarkSettings };
          delete settings.defaultEngine;
          await saveSettingsSilent();
        }
      }
    } else {
      settings = { ...DEFAULTS };
    }
  } catch { settings = { ...DEFAULTS }; }
}

async function saveSettingsSilent() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.sync.set({ markTabSettings: settings });
    }
  } catch {}
}

async function saveSettings() {
  await saveSettingsSilent();
  showToast('Settings saved');
}

// ─── Bookmark Manager ────────────────────────────────────────
function flattenFolders(tree) {
  const folders = [];
  function traverse(node, depth = 0, parentPath = []) {
    if (node.children && !node.url) {
      const directBm = node.children.filter(c => c.url);
      const currentPath = [...parentPath.map(p => p.title), node.title || 'Untitled'];
      const pathIds = [...parentPath.map(p => p.id), node.id];
      const displayPath = currentPath.slice(2).filter(Boolean);
      folders.push({
        id: node.id, title: node.title || 'Untitled', depth,
        displayDepth: Math.max(depth - 2, 0),
        path: currentPath, pathIds, displayPath: displayPath.length ? displayPath : [node.title || 'Untitled'],
        pathString: currentPath.join(' / '), bookmarks: directBm,
        bookmarkCount: countAllBookmarks(node), parentId: node.parentId,
        children: node.children.filter(c => c.children).map(c => c.id),
        isSystemFolder: depth <= 1
      });
      node.children.forEach(child => {
        if (child.children) traverse(child, depth + 1, [...parentPath, { id: node.id, title: node.title || 'Untitled' }]);
      });
    }
  }
  tree.forEach(root => traverse(root, 0, []));
  return folders;
}

function countAllBookmarks(folder) {
  let count = 0;
  if (folder.children) {
    folder.children.forEach(child => {
      if (child.url) count++;
      else if (child.children) count += countAllBookmarks(child);
    });
  }
  return count;
}

function getUserFolders(includeHidden = false) {
  return flatFolders.filter(f => !f.isSystemFolder && (includeHidden || isFolderVisible(f.id)));
}

function isFolderVisible(id) {
  return !settings.hiddenFolderIds.includes(id);
}

function toggleFolderVisibility(id) {
  const idx = settings.hiddenFolderIds.indexOf(id);
  if (idx > -1) settings.hiddenFolderIds.splice(idx, 1);
  else settings.hiddenFolderIds.push(id);
  saveSettingsSilent();
}

function isPinned(url) {
  return Boolean(url && settings.pinnedBookmarkUrls.includes(url));
}

function togglePin(url) {
  if (!url) return;
  const idx = settings.pinnedBookmarkUrls.indexOf(url);
  if (idx === -1) settings.pinnedBookmarkUrls.push(url);
  else settings.pinnedBookmarkUrls.splice(idx, 1);
  saveSettingsSilent();
  return idx === -1; // true = now pinned
}

function getPinnedBookmarks() {
  const seen = new Set();
  return allBookmarks.filter(b => {
    if (!b.url || seen.has(b.url) || !isPinned(b.url)) return false;
    seen.add(b.url);
    return true;
  });
}

function getRecentBookmarks(count = 8) {
  const recent = [];
  const seen = new Set();
  for (const url of settings.recentUrls) {
    if (recent.length >= count) break;
    const bm = allBookmarks.find(b => b.url === url);
    if (bm && !seen.has(url)) { recent.push(bm); seen.add(url); }
  }
  return recent;
}

function trackVisit(url) {
  if (!url) return;
  settings.recentUrls = [url, ...settings.recentUrls.filter(u => u !== url)].slice(0, 50);
  saveSettingsSilent();
}

function searchBookmarks(query) {
  const q = query.toLowerCase().trim();
  if (!q) return { bookmarks: [], folders: [] };
  const bmResults = allBookmarks.filter(b =>
    (b.title && b.title.toLowerCase().includes(q)) ||
    (b.url && b.url.toLowerCase().includes(q))
  );
  const folderResults = getUserFolders(true).filter(f =>
    f.title.toLowerCase().includes(q)
  );
  return { bookmarks: bmResults.slice(0, 12), folders: folderResults.slice(0, 6) };
}

async function loadBookmarks() {
  try {
    el.homeLoading.style.display = 'flex';
    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      const tree = await chrome.bookmarks.getTree();
      bookmarkTree = tree;
      flatFolders = flattenFolders(tree);
      allBookmarks = [];
      flatFolders.forEach(f => { allBookmarks = allBookmarks.concat(f.bookmarks); });
      uncategorizedBookmarks = getUserFolders(true)
        .filter(f => f.isSystemFolder)
        .flatMap(f => f.bookmarks);
      renderHome();
      el.homeLoading.style.display = 'none';
    } else {
      showMockData();
    }
  } catch { showMockData(); }
}

// ─── Mock Data ──────────────────────────────────────────────
function showMockData() {
  const mockTree = [{
    id: '0', title: '', children: [{
      id: '1', title: 'Bookmarks Bar', children: [
        { id: 'b1', title: 'GitHub', url: 'https://github.com' },
        { id: 'b2', title: 'Notion', url: 'https://notion.so' },
        { id: 'b3', title: 'Figma', url: 'https://figma.com' },
        { id: 'b4', title: 'ChatGPT', url: 'https://chat.openai.com' },
        { id: 'b5', title: 'Claude', url: 'https://claude.ai' },
        { id: 'b6', title: 'Linear', url: 'https://linear.app' },
        { id: 'b7', title: 'Vercel', url: 'https://vercel.com' },
        {
          id: 'f1', title: 'Dev Tools', children: [
            { id: 'b8', title: 'MDN', url: 'https://developer.mozilla.org' },
            { id: 'b9', title: 'Stack Overflow', url: 'https://stackoverflow.com' },
            { id: 'b10', title: 'Can I Use', url: 'https://caniuse.com' }
          ]
        },
        {
          id: 'f2', title: 'Design', children: [
            { id: 'b11', title: 'Dribbble', url: 'https://dribbble.com' },
            { id: 'b12', title: 'Awwwards', url: 'https://awwwards.com' }
          ]
        }
      ]
    }, {
      id: '2', title: 'Other Bookmarks', children: [
        { id: 'b13', title: 'YouTube', url: 'https://youtube.com' },
        { id: 'b14', title: 'Reddit', url: 'https://reddit.com' }
      ]
    }]
  }];
  bookmarkTree = mockTree;
  flatFolders = flattenFolders(mockTree);
  allBookmarks = [];
  flatFolders.forEach(f => { allBookmarks = allBookmarks.concat(f.bookmarks); });
  uncategorizedBookmarks = [];
  el.homeLoading.style.display = 'none';
  renderHome();
}

// ─── Home View ──────────────────────────────────────────────
function renderHome() {
  renderHomePinned();
  renderHomeRecent();
  renderHomeFolders();
}

function renderHomePinned() {
  const pinned = getPinnedBookmarks();
  let html = pinned.map(b => createHomeCard(b)).join('');
  el.homePinnedGrid.className = `home-card-grid home-pinned-grid pinned-count-${Math.min(pinned.length, 8)}`;

  // Keep the home rhythm stable: pinned areas up to 4 items stay as one 4-column row.
  if (pinned.length < 4) {
    const placeholder = `
      <div class="home-card-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 17v5"></path><path d="M5 17h14"></path>
          <path d="M15 3.6 20.4 9l-3 3 1.1 4H5.5l1.1-4-3-3L9 3.6"></path>
        </svg>
        <span>Pin a bookmark<br>from any folder</span>
      </div>`;
    const fillCount = 4 - pinned.length;
    for (let i = 0; i < fillCount; i++) {
      html += placeholder;
    }
  }
  el.homePinnedGrid.innerHTML = html;
  afterRenderCards(el.homePinnedGrid);
}

function renderHomeRecent() {
  if (!settings.homeShowRecent) { el.homeRecentGrid.innerHTML = ''; return; }
  const allRecent = getRecentBookmarks(settings.homeRecentCount);
  if (!allRecent.length) { el.homeRecentGrid.innerHTML = ''; return; }
  const showCount = Math.min(allRecent.length, 4);
  const recent = allRecent.slice(0, showCount);

  // Update "View all" button on the section label
  el.homeRecentGrid.className = 'home-recent-list';
  el.homeRecentGrid.innerHTML = recent.map(b => createRecentRow(b)).join('');
  afterRenderRecent();

  // Manage "View all" button
  const section = el.homeRecentGrid.closest('.home-section');
  const label = section?.querySelector('.home-section-label');
  if (!label) return;
  const existing = label.querySelector('.home-recent-view-all');
  if (allRecent.length > 4) {
    if (!existing) {
      const btn = document.createElement('button');
      btn.className = 'home-recent-view-all';
      btn.textContent = 'View all';
      btn.addEventListener('click', () => {
        const recent20 = getRecentBookmarks(20);
        openFolderViewForBookmarks(recent20, 'Recent');
      });
      label.appendChild(btn);
    }
  } else if (existing) {
    existing.remove();
  }
}

function createRecentRow(bookmark) {
  const domain = getDomain(bookmark.url);
  const title = bookmark.title || 'Untitled';
  const initial = title.charAt(0).toUpperCase();
  const faviconUrl = getFaviconUrl(bookmark.url, 32);
  const timeLabel = formatRecentTime(bookmark.dateAdded);
  return `
    <a class="home-recent-item" href="${escapeHtml(bookmark.url)}" data-url="${escapeHtml(bookmark.url)}" title="${escapeHtml(title)}">
      <div class="home-recent-favicon">
        ${faviconUrl ? `<img class="home-recent-favicon-img" src="${escapeHtml(faviconUrl)}" alt="" loading="lazy">` : ''}
        <span class="home-recent-favicon-letter">${escapeHtml(initial)}</span>
      </div>
      <div class="home-recent-item-content">
        <div class="home-recent-item-title">${escapeHtml(title)}</div>
        <div class="home-recent-item-domain">${escapeHtml(domain)}</div>
      </div>
      ${timeLabel ? `<span class="home-recent-time">${escapeHtml(timeLabel)}</span>` : ''}
    </a>
  `;
}

function formatRecentTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startToday - startDate) / 86400000);
  if (dayDiff === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff > 1 && dayDiff < 7) return `${dayDiff}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function afterRenderRecent() {
  el.homeRecentGrid.querySelectorAll('.home-recent-favicon-img').forEach(img => {
    const wrapper = img.closest('.home-recent-favicon');
    img.addEventListener('load', () => wrapper.classList.add('loaded'), { once: true });
    img.addEventListener('error', () => { wrapper.classList.remove('loaded'); img.remove(); }, { once: true });
    if (img.complete && img.naturalWidth > 0) wrapper.classList.add('loaded');
  });
  el.homeRecentGrid.querySelectorAll('.home-recent-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      trackVisit(item.dataset.url);
      window.location.href = item.href;
    });
  });
}

function openFolderViewForBookmarks(bookmarks, title) {
  activeFolderId = '__recent';
  renderSidebar();
  renderFolderContentForBookmarks(bookmarks, title);
  showView('folder');
}

function renderHomeFolders() {
  const folders = getUserFolders(false);
  el.homeFolderPills.innerHTML = folders.map(f => `
    <button class="folder-pill" data-folder-id="${escapeHtml(f.id)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      <span>${escapeHtml(f.title)}</span>
      <span class="folder-pill-count">${f.bookmarkCount}</span>
    </button>
  `).join('');
  el.homeFolderPills.querySelectorAll('.folder-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      openFolderView(btn.dataset.folderId);
    });
  });
}

function createHomeCard(bookmark) {
  const domain = getDomain(bookmark.url);
  const title = bookmark.title || 'Untitled';
  const initial = title.charAt(0).toUpperCase();
  const faviconUrl = getFaviconUrl(bookmark.url, 64);
  const pinned = isPinned(bookmark.url);
  return `
    <a class="home-card" href="${escapeHtml(bookmark.url)}" data-url="${escapeHtml(bookmark.url)}" title="${escapeHtml(title)}">
      <div class="home-card-favicon">
        ${faviconUrl ? `<img class="home-card-favicon-img" src="${escapeHtml(faviconUrl)}" alt="" loading="lazy">` : ''}
        <span class="home-card-favicon-letter">${escapeHtml(initial)}</span>
      </div>
      <span class="home-card-title">${escapeHtml(title)}</span>
      <span class="home-card-domain">${escapeHtml(domain)}</span>
    </a>
  `;
}

function afterRenderCards(container) {
  container.querySelectorAll('.home-card-favicon-img').forEach(img => {
    const wrapper = img.closest('.home-card-favicon');
    img.addEventListener('load', () => wrapper.classList.add('loaded'), { once: true });
    img.addEventListener('error', () => { wrapper.classList.remove('loaded'); img.remove(); }, { once: true });
    if (img.complete && img.naturalWidth > 0) wrapper.classList.add('loaded');
  });
  container.querySelectorAll('.home-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      trackVisit(card.dataset.url);
      window.location.href = card.href;
    });
  });
}

// ─── Folder View ────────────────────────────────────────────
let activeFolderId = null;

function openFolderView(folderId) {
  activeFolderId = folderId;
  renderSidebar();
  renderFolderContent(folderId);
  showView('folder');
}

function renderSidebar() {
  const folders = getUserFolders(false);

  let html = `
    <button class="sidebar-nav-item" data-action="home">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      </svg>
      <span>Home</span>
    </button>
    <button class="sidebar-nav-item" data-action="recent">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span>Recent</span>
    </button>
  `;

  html += `<div class="sidebar-nav-label">Folders</div>`;
  folders.forEach(f => {
    html += createSidebarFolderItem(f);
  });

  el.sidebarNav.innerHTML = html;

  el.sidebarNav.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.action === 'home') {
        returnHome();
      } else if (item.dataset.action === 'recent') {
        // show recent bookmarks in folder view
        const recent = getRecentBookmarks(20);
        activeFolderId = '__recent';
        renderFolderContentForBookmarks(recent, 'Recent');
        renderSidebar();
      } else if (item.dataset.folderId) {
        openFolderView(item.dataset.folderId);
      }
    });
  });
}

function createSidebarFolderItem(folder) {
  const isActive = activeFolderId === folder.id;
  const isHidden = !isFolderVisible(folder.id);
  return `
    <button class="sidebar-nav-item ${isActive ? 'active' : ''} ${isHidden ? 'hidden' : ''}" data-folder-id="${escapeHtml(folder.id)}" title="${escapeHtml(folder.title)}">
      <svg class="sidebar-folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="sidebar-folder-name">${escapeHtml(folder.title)}</span>
      <span class="sidebar-folder-count">${folder.bookmarkCount}</span>
    </button>
  `;
}

function renderFolderContent(folderId) {
  const folder = flatFolders.find(f => f.id === folderId);
  if (!folder) return;
  renderFolderContentForBookmarks(folder.bookmarks, folder.title, folder.displayPath.join(' / '));
}

function renderFolderContentForBookmarks(bookmarks, title, breadcrumb = '') {
  el.folderTitle.textContent = title;
  el.folderCount.textContent = `${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}`;
  el.folderSearchInput.placeholder = `Search in ${title}…`;

  if (!bookmarks.length) {
    el.folderBookmarksGrid.innerHTML = '';
    el.folderEmpty.style.display = 'flex';
    return;
  }
  el.folderEmpty.style.display = 'none';
  el.folderBookmarksGrid.innerHTML = bookmarks.map(b => createFolderCard(b)).join('');
  afterRenderFolderCards();
}

function createFolderCard(bookmark) {
  const domain = getDomain(bookmark.url);
  const title = bookmark.title || 'Untitled';
  const initial = title.charAt(0).toUpperCase();
  const faviconUrl = getFaviconUrl(bookmark.url, 64);
  const pinned = isPinned(bookmark.url);
  return `
    <div class="folder-card" data-url="${escapeHtml(bookmark.url)}">
      <button class="folder-card-pin ${pinned ? 'pinned' : ''}" data-url="${escapeHtml(bookmark.url)}" aria-label="${pinned ? 'Unpin' : 'Pin'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14">
          <path d="M12 17v5"></path><path d="M5 17h14"></path>
          <path d="M15 3.6 20.4 9l-3 3 1.1 4H5.5l1.1-4-3-3L9 3.6"></path>
        </svg>
      </button>
      <a class="folder-card-link" href="${escapeHtml(bookmark.url)}" data-url="${escapeHtml(bookmark.url)}">
        <div class="folder-card-favicon">
          ${faviconUrl ? `<img class="folder-card-favicon-img" src="${escapeHtml(faviconUrl)}" alt="" loading="lazy">` : ''}
          <span class="folder-card-favicon-letter">${escapeHtml(initial)}</span>
        </div>
        <span class="folder-card-title">${escapeHtml(title)}</span>
        <span class="folder-card-domain">${escapeHtml(domain)}</span>
      </a>
    </div>
  `;
}

function afterRenderFolderCards() {
  el.folderBookmarksGrid.querySelectorAll('.folder-card-favicon-img').forEach(img => {
    const wrapper = img.closest('.folder-card-favicon');
    img.addEventListener('load', () => wrapper.classList.add('loaded'), { once: true });
    img.addEventListener('error', () => { wrapper.classList.remove('loaded'); img.remove(); }, { once: true });
    if (img.complete && img.naturalWidth > 0) wrapper.classList.add('loaded');
  });
  el.folderBookmarksGrid.querySelectorAll('.folder-card-link').forEach(link => {
    link.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      trackVisit(link.dataset.url);
      window.location.href = link.href;
    });
  });
  el.folderBookmarksGrid.querySelectorAll('.folder-card-pin').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      togglePin(btn.dataset.url);
      btn.classList.toggle('pinned');
      btn.setAttribute('aria-label', btn.classList.contains('pinned') ? 'Unpin' : 'Pin');
      renderHome();
      showToast(btn.classList.contains('pinned') ? 'Pinned' : 'Unpinned');
    });
  });
}

// ─── Search result favicon loading ────────────────────────
function setupSearchFavicons() {
  document.querySelectorAll('.search-result-favicon-img').forEach(img => {
    const wrapper = img.closest('.search-result-favicon');
    if (!wrapper) return;
    img.addEventListener('load', () => wrapper.classList.add('loaded'), { once: true });
    img.addEventListener('error', () => { wrapper.classList.remove('loaded'); img.remove(); }, { once: true });
    if (img.complete && img.naturalWidth > 0) wrapper.classList.add('loaded');
  });
}

// ─── Folder search filter ──────────────────────────────────
function filterFolderBookmarks(query) {
  const q = query.toLowerCase().trim();
  if (activeFolderId === '__recent') {
    const bookmarks = getRecentBookmarks(100);
    const filtered = q ? bookmarks.filter(b =>
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.url && b.url.toLowerCase().includes(q))
    ) : bookmarks;
    renderFolderContentForBookmarks(filtered, 'Recent');
    return;
  }
  const folder = flatFolders.find(f => f.id === activeFolderId);
  if (!folder) return;
  const bookmarks = q ? folder.bookmarks.filter(b =>
    (b.title && b.title.toLowerCase().includes(q)) ||
    (b.url && b.url.toLowerCase().includes(q))
  ) : folder.bookmarks;
  renderFolderContentForBookmarks(bookmarks, folder.title);
  if (!q) el.folderSearchInput.placeholder = `Search in ${folder.title}…`;
}

// ─── Search Panel (Spotlight Style) ─────────────────────────
let searchResultIndex = -1;
let searchResults = [];

function openSearch() {
  el.searchPanelOverlay.style.display = 'flex';
  el.searchPanel.style.display = 'flex';
  el.searchPanelInput.value = '';
  el.searchPanelInput.focus();
  searchResultIndex = -1;
  searchResults = [];
  el.searchBookmarkItems.innerHTML = '';
  el.searchFolderItems.innerHTML = '';
  el.searchWebItem.innerHTML = '';
  el.searchEmpty.style.display = 'flex';
  el.searchEmpty.querySelector('p').textContent = 'Start typing to search';
  document.body.classList.add('search-open');
}

function closeSearch() {
  el.searchPanelOverlay.style.display = 'none';
  el.searchPanel.style.display = 'none';
  document.body.classList.remove('search-open');
  searchResultIndex = -1;
  searchResults = [];
}

function handleSearchInput() {
  const query = el.searchPanelInput.value;
  if (!query.trim()) {
    el.searchBookmarkItems.innerHTML = '';
    el.searchFolderItems.innerHTML = '';
    el.searchWebItem.innerHTML = '';
    el.searchEmpty.style.display = 'flex';
    el.searchEmpty.querySelector('p').textContent = 'Start typing to search';
    return;
  }

  el.searchEmpty.style.display = 'none';
  const { bookmarks, folders } = searchBookmarks(query);

  // Render bookmark results
  if (bookmarks.length) {
    el.searchBookmarkItems.innerHTML = bookmarks.map((b, i) => createSearchBookmarkItem(b, query, i)).join('');
  } else {
    el.searchBookmarkItems.innerHTML = '';
  }

  // Render folder results
  if (folders.length) {
    el.searchFolderItems.innerHTML = folders.map((f, i) => createSearchFolderItem(f, query, bookmarks.length + i)).join('');
  } else {
    el.searchFolderItems.innerHTML = '';
  }

  // Setup favicon loading for search results
  setupSearchFavicons();

  // Web search item
  el.searchWebItem.innerHTML = `
    <button class="search-result-item search-web-item" data-index="${bookmarks.length + folders.length}" data-action="web">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
      <div class="search-result-content">
        <span class="search-result-title">Search web for <strong>${escapeHtml(query.trim())}</strong></span>
      </div>
    </button>
  `;

  // Collect all result items
  searchResults = [];
  el.searchPanelResults.querySelectorAll('.search-result-item').forEach(item => {
    searchResults.push(item);
  });

  // Auto-highlight first
  searchResultIndex = 0;
  updateSearchHighlight();

  // Update group visibility
  document.querySelectorAll('.search-group').forEach(g => {
    const items = g.querySelector('.search-panel-items');
    g.style.display = items && items.children.length ? 'block' : 'none';
  });
}

function createSearchBookmarkItem(bookmark, query, index) {
  const domain = getDomain(bookmark.url);
  const title = bookmark.title || 'Untitled';
  const initial = title.charAt(0).toUpperCase();
  const faviconUrl = getFaviconUrl(bookmark.url, 32);
  return `
    <button class="search-result-item" data-index="${index}" data-url="${escapeHtml(bookmark.url)}" data-action="bookmark">
      <div class="search-result-favicon">
        ${faviconUrl ? `<img class="search-result-favicon-img" src="${escapeHtml(faviconUrl)}" alt="" loading="lazy">` : ''}
        <span class="search-result-favicon-letter">${escapeHtml(initial)}</span>
      </div>
      <div class="search-result-content">
        <span class="search-result-title">${highlightMatch(title, query)}</span>
        <span class="search-result-domain">${highlightMatch(domain, query)}</span>
      </div>
    </button>
  `;
}

function createSearchFolderItem(folder, query, index) {
  return `
    <button class="search-result-item" data-index="${index}" data-folder-id="${escapeHtml(folder.id)}" data-action="folder">
      <div class="search-result-favicon search-result-folder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <div class="search-result-content">
        <span class="search-result-title">${highlightMatch(folder.title, query)}</span>
        <span class="search-result-domain">${folder.bookmarkCount} bookmarks</span>
      </div>
    </button>
  `;
}

function updateSearchHighlight() {
  searchResults.forEach((item, i) => {
    item.classList.toggle('selected', i === searchResultIndex);
  });
  const active = searchResults[searchResultIndex];
  if (active) active.scrollIntoView({ block: 'nearest' });
}

function navigateSearch(direction) {
  if (!searchResults.length) return;
  searchResultIndex = (searchResultIndex + direction + searchResults.length) % searchResults.length;
  updateSearchHighlight();
}

function activateSearchResult() {
  const item = searchResults[searchResultIndex];
  if (!item) return;
  const action = item.dataset.action;
  if (action === 'bookmark') {
    trackVisit(item.dataset.url);
    window.location.href = item.dataset.url;
  } else if (action === 'folder') {
    closeSearch();
    openFolderView(item.dataset.folderId);
  } else if (action === 'web') {
    performWebSearch(el.searchPanelInput.value);
  }
}

async function performWebSearch(query) {
  if (!query.trim()) return;
  if (typeof chrome !== 'undefined' && chrome.search?.query) {
    try {
      await chrome.search.query({ text: query, disposition: 'CURRENT_TAB' });
    } catch { showToast('Search failed'); }
  } else {
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }
}

// ─── Theme Cycle ────────────────────────────────────────────
function cycleTheme() {
  const themeIds = THEMES.map(t => t.id);
  const current = settings.theme;
  const idx = themeIds.indexOf(current);
  const next = themeIds[(idx + 1) % themeIds.length];
  applyTheme(next, settings.accent);
  saveSettingsSilent();
  const names = { light: 'Light ☀️', dark: 'Dark 🌙', system: 'System 🖥️' };
  showToast(`Theme: ${names[next] || next}`);
}

// ─── View Manager ───────────────────────────────────────────
function returnHome() {
  renderHome();
  showView('home');
}

function showView(view) {
  el.homeView.style.display = view === 'home' ? 'grid' : 'none';
  el.folderView.style.display = view === 'folder' ? 'flex' : 'none';
  el.homeFab.style.display = view === 'home' ? 'flex' : 'none';
}

// ─── Event Setup ────────────────────────────────────────────
function setupEvents() {
  // Home search: click triggers spotlight panel
  el.homeSearchInput.addEventListener('focus', e => {
    e.target.blur();
    openSearch();
  });

  // Folder search — inline filtering
  el.folderSearchInput.addEventListener('input', debounce(function() {
    filterFolderBookmarks(this.value.trim());
  }, 80));
  el.folderSearchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      el.folderSearchInput.value = '';
      filterFolderBookmarks('');
      el.folderSearchInput.blur();
    }
  });

  // Home FAB — cycle theme
  el.homeFab.addEventListener('click', cycleTheme);

  // Sidebar home button
  el.sidebarHomeBtn.addEventListener('click', returnHome);

  // Sidebar toggle (mobile)
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      el.folderSidebar.classList.toggle('open');
    });
  }
  // Close sidebar when clicking content on mobile
  el.folderContent?.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      el.folderSidebar.classList.remove('open');
    }
  });

  // Search panel
  el.searchPanelInput.addEventListener('input', debounce(handleSearchInput, 60));
  el.searchPanelClose.addEventListener('click', closeSearch);
  el.searchPanelOverlay.addEventListener('click', closeSearch);

  // Search result clicks (delegated)
  el.searchPanelResults.addEventListener('click', e => {
    const item = e.target.closest('.search-result-item');
    if (!item) return;
    const idx = parseInt(item.dataset.index);
    if (!isNaN(idx)) { searchResultIndex = idx; activateSearchResult(); }
  });
}

function setupKeyboard() {
  document.addEventListener('keydown', e => {
    const isSearchOpen = el.searchPanel.style.display === 'flex';

    // / or Cmd+K to open search
    if ((e.key === '/' && !isInputFocused()) ||
        ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
      e.preventDefault();
      if (isSearchOpen) closeSearch();
      else openSearch();
      return;
    }

    if (isSearchOpen) {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeSearch();
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateSearch(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigateSearch(-1);
          break;
        case 'Enter':
          if (e.shiftKey) {
            // Shift+Enter: web search
            performWebSearch(el.searchPanelInput.value);
          } else {
            e.preventDefault();
            activateSearchResult();
          }
          break;
      }
      return;
    }
  });
}

function isInputFocused() {
  const active = document.activeElement;
  return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
}

// ─── Init ───────────────────────────────────────────────────
async function init() {
  updateTime();
  setInterval(updateTime, 1000);

  await loadSettings();
  applyTheme(settings.theme, settings.accent);
  setupEvents();
  setupKeyboard();
  await loadBookmarks();
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
