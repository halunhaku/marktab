/**
 * MarkTab - Premium New Tab Extension
 * With Recursive Folder Support
 */

// Search Engine Configuration
const SEARCH_ENGINES = [
  {
    id: 'google',
    name: 'Google',
    desc: 'Global search engine',
    icon: 'G',
    url: 'https://www.google.com/search?q='
  },
  {
    id: 'baidu',
    name: 'Baidu',
    desc: 'Chinese search engine',
    icon: '百',
    url: 'https://www.baidu.com/s?wd='
  },
  {
    id: 'bing',
    name: 'Bing',
    desc: 'Microsoft search engine',
    icon: 'B',
    url: 'https://www.bing.com/search?q='
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    desc: 'Privacy-focused search',
    icon: 'D',
    url: 'https://duckduckgo.com/?q='
  }
];

const SEARCH_ENGINE_PREFIXES = {
  g: 'google',
  google: 'google',
  baidu: 'baidu',
  bd: 'baidu',
  b: 'bing',
  bing: 'bing',
  d: 'duckduckgo',
  ddg: 'duckduckgo',
  duck: 'duckduckgo'
};

// Theme Configuration
const THEMES = [
  {
    id: 'midnight',
    name: 'Midnight',
    desc: 'Deep teal focus',
    swatches: ['#0a0a0f', '#00d4aa', '#0891b2']
  },
  {
    id: 'daylight',
    name: 'Daylight',
    desc: 'Clean light workspace',
    swatches: ['#f8fafc', '#0ea5e9', '#14b8a6']
  },
  {
    id: 'dusk',
    name: 'Dusk',
    desc: 'Soft violet evening',
    swatches: ['#15111f', '#a78bfa', '#f472b6']
  },
  {
    id: 'ember',
    name: 'Ember',
    desc: 'Warm reading mode',
    swatches: ['#17120d', '#f59e0b', '#ef4444']
  }
];

// Configuration
const CONFIG = {
  defaultSettings: {
    hiddenFolderIds: [], // 隐藏的文件夹ID列表
    pinnedBookmarkUrls: [],
    defaultEngine: 'google',
    folderNavCollapsed: false,
    theme: 'midnight'
  }
};

// State
let allBookmarks = [];
let bookmarkTree = [];
let flatFolders = []; // 扁平化的所有文件夹
let uncategorizedBookmarks = []; // 没有放进用户自建文件夹的书签
let settings = { ...CONFIG.defaultSettings };
let currentEngine = SEARCH_ENGINES[0];
let activeFolderId = null; // 当前选中的文件夹
let searchRenderTimer = null;
let selectedBookmarkIndex = -1;

// DOM Elements
const elements = {
  clock: document.getElementById('clock'),
  date: document.getElementById('date'),
  searchInput: document.getElementById('searchInput'),
  searchClear: document.getElementById('searchClear'),
  searchBox: document.getElementById('searchBox'),
  searchSubmit: document.getElementById('searchSubmit'),
  engineBtn: document.getElementById('engineBtn'),
  engineIcon: document.getElementById('engineIcon'),
  engineDropdown: document.getElementById('engineDropdown'),
  folderNav: document.getElementById('folderNav'),
  folderNavContent: document.getElementById('folderNavContent'),
  folderNavToggle: document.getElementById('folderNavToggle'),
  loadingState: document.getElementById('loadingState'),
  bookmarksContent: document.getElementById('bookmarksContent'),
  emptyState: document.getElementById('emptyState'),
  noResults: document.getElementById('noResults'),
  stats: document.getElementById('stats'),
  fab: document.getElementById('fab')
};

// Initialize
async function init() {
  updateTime();
  setInterval(updateTime, 1000);
  
  await loadSettings();
  applyTheme(settings.theme);
  initSearchEngine();
  setupEventListeners();
  setupKeyboardShortcuts();
  applyFolderNavState();
  
  await loadBookmarks();
}

// ==================== Theme Functions ====================

function applyTheme(themeId) {
  const theme = THEMES.find(item => item.id === themeId) || THEMES[0];
  settings.theme = theme.id;
  document.documentElement.dataset.theme = theme.id;
}

function selectTheme(themeId, container) {
  applyTheme(themeId);
  saveSettingsSilent();
  renderThemeOptions(container);
  showToast('Theme updated');
}

function renderThemeOptions(container) {
  if (!container) return;

  container.innerHTML = THEMES.map(theme => `
    <button class="theme-option ${theme.id === settings.theme ? 'active' : ''}" data-theme="${theme.id}" type="button" aria-pressed="${theme.id === settings.theme}">
      <span class="theme-swatch" aria-hidden="true">
        ${theme.swatches.map(color => `<span style="background: ${color}"></span>`).join('')}
      </span>
      <span class="theme-copy">
        <span class="theme-name">${theme.name}</span>
        <span class="theme-desc">${theme.desc}</span>
      </span>
      <svg class="theme-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
  `).join('');

  container.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => selectTheme(option.dataset.theme, container));
  });
}

// ==================== Search Engine Functions ====================

function initSearchEngine() {
  const engineId = settings.defaultEngine || 'google';
  currentEngine = SEARCH_ENGINES.find(e => e.id === engineId) || SEARCH_ENGINES[0];
  updateEngineIcon();
}

function updateEngineIcon() {
  elements.engineIcon.textContent = currentEngine.icon;
}

function showEngineDropdown() {
  const content = elements.engineDropdown.querySelector('.dropdown-content');
  content.innerHTML = SEARCH_ENGINES.map(engine => `
    <div class="engine-option ${engine.id === currentEngine.id ? 'active' : ''}" data-engine="${engine.id}">
      <span class="engine-option-icon">${escapeHtml(engine.icon)}</span>
      <div class="engine-option-content">
        <div class="engine-option-name">${engine.name}</div>
        <div class="engine-option-desc">${engine.desc}</div>
      </div>
      <svg class="engine-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  `).join('');
  
  elements.engineDropdown.classList.add('active');
  elements.engineBtn.setAttribute('aria-expanded', 'true');
  
  content.querySelectorAll('.engine-option').forEach(option => {
    option.addEventListener('click', () => selectEngine(option.dataset.engine));
  });
}

function hideEngineDropdown() {
  elements.engineDropdown.classList.remove('active');
  elements.engineBtn.setAttribute('aria-expanded', 'false');
}

function selectEngine(engineId) {
  currentEngine = SEARCH_ENGINES.find(e => e.id === engineId) || SEARCH_ENGINES[0];
  settings.defaultEngine = engineId;
  updateEngineIcon();
  showEngineDropdown();
  saveSettingsSilent();
  elements.searchInput.focus();
}

// ==================== Search Functions ====================

function performSearch() {
  const searchIntent = parseSearchIntent(elements.searchInput.value);
  const query = searchIntent.query;
  if (!query) return;
  
  if (isUrl(query)) {
    let url = query;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    window.location.href = url;
    return;
  }
  
  window.location.href = searchIntent.engine.url + encodeURIComponent(query);
}

function openSelectedBookmark() {
  const cards = getVisibleBookmarkCards();
  if (!cards.length) return false;

  const index = selectedBookmarkIndex >= 0 ? selectedBookmarkIndex : 0;
  const card = cards[index];
  if (!card?.dataset.url) return false;

  window.location.href = card.dataset.url;
  return true;
}

function parseSearchIntent(rawQuery) {
  const trimmed = rawQuery.trim();
  const match = trimmed.match(/^([a-zA-Z]+)\s+(.+)$/);
  const engineId = match ? SEARCH_ENGINE_PREFIXES[match[1].toLowerCase()] : null;
  const engine = SEARCH_ENGINES.find(item => item.id === engineId) || currentEngine;

  return {
    engine,
    isPrefixed: Boolean(engineId),
    query: engineId ? match[2].trim() : trimmed
  };
}

function isUrl(str) {
  if (str.includes('.') && !str.includes(' ')) {
    const domainPattern = /^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+/;
    if (domainPattern.test(str)) return true;
  }
  return false;
}

function handleSearchInput(e) {
  const query = e.target.value.trim();
  elements.searchBox.classList.toggle('has-value', !!query);
  selectedBookmarkIndex = -1;
  window.clearTimeout(searchRenderTimer);
  searchRenderTimer = window.setTimeout(() => {
    renderBookmarks(bookmarkTree, parseSearchIntent(query).query);
  }, 80);
}

function clearSearch() {
  window.clearTimeout(searchRenderTimer);
  elements.searchInput.value = '';
  elements.searchBox.classList.remove('has-value');
  selectedBookmarkIndex = -1;
  renderBookmarks(bookmarkTree);
  elements.searchInput.focus();
}

function moveBookmarkSelection(direction) {
  const cards = getVisibleBookmarkCards();
  if (!cards.length) return;

  if (selectedBookmarkIndex === -1) {
    selectedBookmarkIndex = direction > 0 ? 0 : cards.length - 1;
  } else {
    selectedBookmarkIndex = (selectedBookmarkIndex + direction + cards.length) % cards.length;
  }

  updateBookmarkSelection(cards);
}

function getVisibleBookmarkCards() {
  return Array.from(elements.bookmarksContent.querySelectorAll('.bookmark-card'));
}

function updateBookmarkSelection(cards = getVisibleBookmarkCards()) {
  cards.forEach((card, index) => {
    const isSelected = index === selectedBookmarkIndex;
    card.classList.toggle('keyboard-selected', isSelected);
    card.setAttribute('aria-selected', String(isSelected));
    if (isSelected) {
      card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
}

// ==================== Settings Functions ====================

async function loadSettings() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.sync.get(['markTabSettings', 'rainbowBookmarkSettings']);
      if (result.markTabSettings || result.rainbowBookmarkSettings) {
        settings = { ...CONFIG.defaultSettings, ...(result.markTabSettings || result.rainbowBookmarkSettings) };
        if (!result.markTabSettings && result.rainbowBookmarkSettings) {
          await chrome.storage.sync.set({ markTabSettings: settings });
        }
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettings() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.sync.set({ markTabSettings: settings });
      showToast('Settings saved');
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

async function saveSettingsSilent() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.sync.set({ markTabSettings: settings });
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// ==================== Bookmark Functions ====================

async function loadBookmarks() {
  try {
    elements.loadingState.style.display = 'flex';
    elements.bookmarksContent.style.display = 'none';
    elements.emptyState.style.display = 'none';
    
    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      const tree = await chrome.bookmarks.getTree();
      bookmarkTree = tree;
      
      // 扁平化所有文件夹
      flatFolders = flattenFolders(tree);
      
      // 获取所有书签
      allBookmarks = [];
      flatFolders.forEach(f => {
        allBookmarks = allBookmarks.concat(f.bookmarks);
      });
      uncategorizedBookmarks = getUncategorizedBookmarks(flatFolders);
      
      renderFolderNav();
      renderBookmarks(tree);
      updateStats();
    } else {
      showMockData();
    }
  } catch (error) {
    console.error('Failed to load bookmarks:', error);
    showMockData();
  } finally {
    elements.loadingState.style.display = 'none';
  }
}

// 扁平化所有文件夹（递归）
function flattenFolders(tree) {
  const folders = [];
  
  function traverse(node, depth = 0, parentPath = []) {
    if (node.children && !node.url) {
      // 获取此文件夹下的直接书签
      const directBookmarks = node.children.filter(c => c.url);
      
      // 获取完整路径
      const currentPath = [...parentPath.map(p => p.title), node.title || 'Untitled'];
      const pathIds = [...parentPath.map(p => p.id), node.id];
      const displayPath = currentPath.slice(2).filter(Boolean);
      
      folders.push({
        id: node.id,
        title: node.title || 'Untitled',
        depth: depth,
        displayDepth: Math.max(depth - 2, 0),
        path: currentPath,
        pathIds: pathIds,
        displayPath: displayPath.length ? displayPath : [node.title || 'Untitled'],
        pathString: currentPath.join(' / '),
        bookmarks: directBookmarks,
        bookmarkCount: countAllBookmarks(node),
        parentId: node.parentId,
        children: node.children.filter(c => c.children).map(c => c.id),
        isSystemFolder: depth <= 1
      });
      
      // 递归处理子文件夹
      node.children.forEach(child => {
        if (child.children) {
          traverse(child, depth + 1, [...parentPath, { id: node.id, title: node.title || 'Untitled' }]);
        }
      });
    }
  }
  
  tree.forEach(root => traverse(root, 0, []));
  return folders;
}

function getUserFolders(includeHidden = false) {
  return flatFolders.filter(folder => {
    if (folder.isSystemFolder) return false;
    return includeHidden || isFolderVisible(folder.id);
  });
}

function getUncategorizedBookmarks(folders) {
  return folders
    .filter(folder => folder.isSystemFolder && folder.bookmarks.length > 0)
    .flatMap(folder => folder.bookmarks);
}

// 计算文件夹中所有书签（包括子文件夹）
function countAllBookmarks(folder) {
  let count = 0;
  if (folder.children) {
    folder.children.forEach(child => {
      if (child.url) {
        count++;
      } else if (child.children) {
        count += countAllBookmarks(child);
      }
    });
  }
  return count;
}

// 检查文件夹是否应该显示
function isFolderVisible(folderId) {
  return !settings.hiddenFolderIds.includes(folderId);
}

// 切换文件夹显示状态
function toggleFolderVisibility(folderId) {
  const index = settings.hiddenFolderIds.indexOf(folderId);
  if (index > -1) {
    settings.hiddenFolderIds.splice(index, 1);
  } else {
    settings.hiddenFolderIds.push(folderId);
    if (activeFolderId === folderId) {
      activeFolderId = null;
    }
  }
  saveSettingsSilent();
  renderFolderNav();
  renderBookmarks(bookmarkTree);
}

function isBookmarkPinned(bookmark) {
  return Boolean(bookmark?.url && settings.pinnedBookmarkUrls.includes(bookmark.url));
}

function toggleBookmarkPin(bookmarkUrl) {
  if (!bookmarkUrl) return;

  const index = settings.pinnedBookmarkUrls.indexOf(bookmarkUrl);
  const willPin = index === -1;
  if (willPin) {
    settings.pinnedBookmarkUrls.push(bookmarkUrl);
  } else {
    settings.pinnedBookmarkUrls.splice(index, 1);
  }

  saveSettingsSilent();
  renderBookmarks(bookmarkTree, parseSearchIntent(elements.searchInput.value).query);
  showToast(willPin ? 'Bookmark pinned' : 'Bookmark unpinned');
}

function getPinnedBookmarks() {
  const seen = new Set();
  return allBookmarks.filter(bookmark => {
    if (!bookmark.url || seen.has(bookmark.url) || !isBookmarkPinned(bookmark)) {
      return false;
    }
    seen.add(bookmark.url);
    return true;
  });
}

// ==================== Folder Navigation ====================

function renderFolderNav() {
  const container = elements.folderNavContent;
  container.innerHTML = '';
  
  // 添加 "All" 选项
  const allItem = document.createElement('div');
  allItem.className = `folder-nav-item level-0 ${activeFolderId === null ? 'active' : ''}`;
  const visibleBookmarkCount = getVisibleBookmarkCount();
  allItem.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
    <span class="folder-name">All</span>
    <span class="bookmark-count">${visibleBookmarkCount}</span>
  `;
  allItem.addEventListener('click', () => {
    activeFolderId = null;
    renderFolderNav();
    renderBookmarks(bookmarkTree);
  });
  container.appendChild(allItem);
  
  // 添加所有可见的用户分类。隐藏分类可在设置面板中恢复。
  getUserFolders(false).forEach(folder => {
    const isVisible = isFolderVisible(folder.id);
    const isActive = activeFolderId === folder.id;
    
    const item = document.createElement('div');
    item.className = `folder-nav-item level-${Math.min(folder.displayDepth + 1, 2)} ${isActive ? 'active' : ''} ${!isVisible ? 'hidden-folder' : ''}`;
    item.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="folder-name">${escapeHtml(folder.title)}</span>
      <span class="bookmark-count">${folder.bookmarkCount}</span>
    `;
    
    item.addEventListener('click', (e) => {
      if (e.shiftKey) {
        // Shift+点击切换显示/隐藏
        toggleFolderVisibility(folder.id);
      } else {
        // 普通点击选中
        activeFolderId = folder.id;
        renderFolderNav();
        renderBookmarks(bookmarkTree);
      }
    });
    
    container.appendChild(item);
  });
}

// ==================== Render Bookmarks ====================

function renderBookmarks(tree, searchQuery = '') {
  const container = elements.bookmarksContent;
  container.innerHTML = '';
  selectedBookmarkIndex = -1;
  
  let hasResults = false;
  let sectionIndex = 0;
  const normalizedQuery = searchQuery.toLowerCase();
  const matchesSearch = bookmark => {
    if (!normalizedQuery) return true;
    const titleMatch = bookmark.title && bookmark.title.toLowerCase().includes(normalizedQuery);
    const urlMatch = bookmark.url && bookmark.url.toLowerCase().includes(normalizedQuery);
    return titleMatch || urlMatch;
  };

  if (!activeFolderId) {
    const pinnedBookmarks = getPinnedBookmarks().filter(matchesSearch);
    if (pinnedBookmarks.length > 0) {
      const section = createBookmarkSection({
        title: 'Pinned',
        breadcrumb: 'Pinned bookmarks',
        count: pinnedBookmarks.length,
        bookmarks: pinnedBookmarks,
        searchQuery,
        sectionIndex,
        icon: 'pin'
      });
      container.appendChild(section);
      hasResults = true;
      sectionIndex++;
    }
  }
  
  // 确定要显示的文件夹
  let foldersToRender = getUserFolders(false);
  
  // 如果有选中的文件夹，只显示该文件夹
  if (activeFolderId) {
    foldersToRender = foldersToRender.filter(f => f.id === activeFolderId || f.pathIds.includes(activeFolderId));
  }
  
  // 按路径排序
  foldersToRender.sort((a, b) => a.displayPath.join(' / ').localeCompare(b.displayPath.join(' / ')));
  
  if (!activeFolderId && uncategorizedBookmarks.length > 0) {
    foldersToRender.unshift({
      id: '__uncategorized',
      title: '未分类',
      displayPath: ['未分类'],
      bookmarks: uncategorizedBookmarks,
      bookmarkCount: uncategorizedBookmarks.length
    });
  }
  
  foldersToRender.forEach(folder => {
    let bookmarks = folder.bookmarks;
    
    // 搜索过滤
    if (normalizedQuery) {
      bookmarks = bookmarks.filter(matchesSearch);
    }
    
    if (bookmarks.length === 0) return;
    
    hasResults = true;
    
    // 路径面包屑
    const breadcrumb = folder.displayPath.join(' / ');
    const section = createBookmarkSection({
      title: folder.title,
      breadcrumb,
      count: bookmarks.length,
      bookmarks,
      searchQuery,
      sectionIndex,
      icon: 'folder'
    });
    
    container.appendChild(section);
    sectionIndex++;
  });
  
  // 显示/隐藏状态
  if (searchQuery && !hasResults) {
    container.style.display = 'none';
    elements.noResults.style.display = 'flex';
    elements.emptyState.style.display = 'none';
  } else if (!hasResults) {
    container.style.display = 'none';
    elements.noResults.style.display = 'none';
    elements.emptyState.style.display = 'flex';
  } else {
    container.style.display = 'block';
    elements.noResults.style.display = 'none';
    elements.emptyState.style.display = 'none';
    setupBookmarkFavicons(container);
    setupBookmarkCardSelection(container);
    setupBookmarkPinButtons(container);
  }
}

function createBookmarkSection({ title, breadcrumb, count, bookmarks, searchQuery, sectionIndex, icon }) {
  const section = document.createElement('div');
  section.className = `bookmark-section ${icon === 'pin' ? 'pinned-section' : ''}`;
  section.style.animationDelay = `${sectionIndex * 0.05}s`;
  section.classList.add('fade-in');
  const iconPath = icon === 'pin'
    ? '<path d="M12 17v5"></path><path d="M5 17h14"></path><path d="M15 3.6 20.4 9l-3 3 1.1 4H5.5l1.1-4-3-3L9 3.6"></path>'
    : '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>';

  section.innerHTML = `
    <div class="section-header">
      <div class="section-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${iconPath}
        </svg>
      </div>
      <div class="section-title-group">
        <h2 class="section-title">${escapeHtml(title)}</h2>
        ${breadcrumb !== title ? `<span class="section-breadcrumb">${escapeHtml(breadcrumb)}</span>` : ''}
      </div>
      <span class="section-count">${count}</span>
    </div>
    <div class="bookmarks-grid">
      ${bookmarks.map((bookmark, index) => createBookmarkCard(bookmark, index, searchQuery)).join('')}
    </div>
  `;

  return section;
}

function createBookmarkCard(bookmark, index, searchQuery = '') {
  const domain = getDomain(bookmark.url);
  const initial = bookmark.title ? bookmark.title.charAt(0).toUpperCase() : '?';
  const faviconUrl = getFaviconUrl(bookmark.url, 64);
  const title = bookmark.title || 'Untitled';
  const isPinned = isBookmarkPinned(bookmark);
  
  return `
    <div class="bookmark-card" data-url="${escapeHtml(bookmark.url)}" title="${escapeHtml(title)}" aria-selected="false">
      <button class="pin-bookmark ${isPinned ? 'active' : ''}" type="button" data-url="${escapeHtml(bookmark.url)}" aria-label="${isPinned ? 'Unpin bookmark' : 'Pin bookmark'}" aria-pressed="${isPinned}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 17v5"></path>
          <path d="M5 17h14"></path>
          <path d="M15 3.6 20.4 9l-3 3 1.1 4H5.5l1.1-4-3-3L9 3.6"></path>
        </svg>
      </button>
      <a href="${escapeHtml(bookmark.url)}" class="bookmark-link">
        <div class="bookmark-favicon">
          ${faviconUrl ? `<img class="favicon-img" src="${escapeHtml(faviconUrl)}" alt="" loading="lazy">` : ''}
          <span class="favicon-letter">${escapeHtml(initial)}</span>
        </div>
        <span class="bookmark-title">${highlightMatch(title, searchQuery)}</span>
        <span class="bookmark-url">${highlightMatch(domain, searchQuery)}</span>
      </a>
    </div>
  `;
}

function getFaviconUrl(pageUrl, size = 32) {
  if (!pageUrl || typeof chrome === 'undefined' || !chrome.runtime) return '';

  try {
    const faviconUrl = new URL(chrome.runtime.getURL('/_favicon/'));
    faviconUrl.searchParams.set('pageUrl', pageUrl);
    faviconUrl.searchParams.set('size', String(size));
    return faviconUrl.toString();
  } catch {
    return '';
  }
}

function setupBookmarkFavicons(container) {
  container.querySelectorAll('.favicon-img').forEach(img => {
    const wrapper = img.closest('.bookmark-favicon');

    img.addEventListener('load', () => {
      wrapper.classList.add('has-image');
    }, { once: true });

    img.addEventListener('error', () => {
      wrapper.classList.remove('has-image');
      img.remove();
    }, { once: true });

    if (img.complete && img.naturalWidth > 0) {
      wrapper.classList.add('has-image');
    }
  });
}

function setupBookmarkCardSelection(container) {
  container.querySelectorAll('.bookmark-card').forEach((card, index) => {
    card.dataset.resultIndex = String(index);

    card.addEventListener('focus', () => {
      selectedBookmarkIndex = index;
      updateBookmarkSelection();
    });

    card.addEventListener('mouseenter', () => {
      selectedBookmarkIndex = index;
      updateBookmarkSelection();
    });

    card.addEventListener('click', event => {
      if (event.target.closest('.pin-bookmark')) return;
      if (event.target.closest('a')) return;
      window.location.href = card.dataset.url;
    });
  });
}

function setupBookmarkPinButtons(container) {
  container.querySelectorAll('.pin-bookmark').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      toggleBookmarkPin(button.dataset.url);
    });
  });
}

// ==================== Utility Functions ====================

function updateTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  elements.clock.textContent = `${hours}:${minutes}`;
  
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  elements.date.textContent = now.toLocaleDateString('en-US', options);
}

function updateStats() {
  const visibleBookmarks = getVisibleBookmarkCount();
  
  const visibleFolders = getUserFolders(false);
  elements.stats.textContent = `${visibleBookmarks} bookmarks · ${visibleFolders.length} labels`;
}

function getVisibleBookmarkCount() {
  const visibleFolderBookmarks = getUserFolders(false).reduce((count, folder) => count + folder.bookmarks.length, 0);
  return visibleFolderBookmarks + uncategorizedBookmarks.length;
}

function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function highlightMatch(text, searchQuery) {
  const safeText = escapeHtml(text);
  const query = parseSearchIntent(searchQuery).query.trim();
  if (!query) return safeText;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safeText.replace(new RegExp(`(${escapedQuery})`, 'ig'), '<mark>$1</mark>');
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-elevated);
    color: var(--text-primary);
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 500;
    z-index: 1000;
    animation: fadeInUp 0.3s ease-out;
    border: 1px solid var(--border-subtle);
    backdrop-filter: blur(10px);
  `;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ==================== Settings Panel ====================

function openSettingsPanel() {
  if (document.getElementById('settingsPanel')) return;
  
  const panel = document.createElement('div');
  panel.id = 'settingsPanel';
  panel.innerHTML = `
    <div class="settings-overlay"></div>
    <div class="settings-modal">
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="settings-close" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="settings-content">
        <div class="settings-section">
          <h3>Theme</h3>
          <div class="theme-options" id="themeOptions"></div>
        </div>

        <div class="settings-section">
          <h3>Visible Labels</h3>
          <p class="settings-hint">Click to toggle label visibility. Hidden labels won't appear in the main view.</p>
          
          <div class="folder-tree" id="folderTree">
            <!-- 动态生成文件夹树 -->
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Statistics</h3>
          <div class="stats-info">
            <div class="stat-row">
              <span>Total Bookmarks</span>
              <span class="stat-value">${allBookmarks.length}</span>
            </div>
            <div class="stat-row">
              <span>Total Labels</span>
              <span class="stat-value">${getUserFolders(true).length}</span>
            </div>
            <div class="stat-row">
              <span>Visible Labels</span>
              <span class="stat-value">${getUserFolders(false).length}</span>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h3>Privacy</h3>
          <div class="privacy-info">
            <div class="privacy-row">
              <span class="privacy-dot"></span>
              <span>Bookmarks and settings stay in Chrome storage.</span>
            </div>
            <div class="privacy-row">
              <span class="privacy-dot"></span>
              <span>No remote code or developer server sync.</span>
            </div>
            <div class="privacy-row">
              <span class="privacy-dot"></span>
              <span>Web searches go only to the selected search engine.</span>
            </div>
          </div>
        </div>
      </div>
      <div class="settings-footer">
        <button class="btn btn-secondary" id="btnReset">Show All Labels</button>
        <button class="btn btn-primary" id="btnSave">Done</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // 渲染文件夹树
  renderThemeOptions(panel.querySelector('#themeOptions'));
  renderFolderTree(panel.querySelector('#folderTree'));
  
  // 绑定事件
  const overlay = panel.querySelector('.settings-overlay');
  const closeBtn = panel.querySelector('.settings-close');
  const resetBtn = panel.querySelector('#btnReset');
  const saveBtn = panel.querySelector('#btnSave');
  
  overlay.addEventListener('click', closeSettingsPanel);
  closeBtn.addEventListener('click', closeSettingsPanel);
  resetBtn.addEventListener('click', () => {
    settings.hiddenFolderIds = [];
    renderFolderTree(panel.querySelector('#folderTree'));
    renderFolderNav();
    renderBookmarks(bookmarkTree);
    showToast('All labels visible');
  });
  saveBtn.addEventListener('click', () => {
    saveSettings();
    closeSettingsPanel();
  });
}

function renderFolderTree(container) {
  // 显示所有用户自建分类，包括已经隐藏的分类，方便随时恢复显示。
  const allFolders = getUserFolders(true).sort((a, b) => {
    return a.displayPath.join(' / ').localeCompare(b.displayPath.join(' / '));
  });
  
  container.innerHTML = allFolders.map(folder => renderFolderTreeItem(folder)).join('');
  
  // 绑定切换事件 - 点击整个行都可以切换
  container.querySelectorAll('.folder-tree-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // 阻止事件冒泡，避免子元素触发多次
      e.stopPropagation();
      
      const folderId = item.dataset.folderId;
      if (!folderId) return;
      
      // 切换可见性
      toggleFolderVisibility(folderId);
      
      // 重新渲染整个树以更新状态
      renderFolderTree(container);
    });
  });
}

function renderFolderTreeItem(folder) {
  const isVisible = isFolderVisible(folder.id);
  const indent = folder.displayDepth * 24;
  
  // 获取父文件夹名称用于显示路径
  const parentFolder = flatFolders.find(f => f.id === folder.parentId);
  const showPath = parentFolder && !parentFolder.isSystemFolder;
  
  return `
    <div class="folder-tree-item ${!isVisible ? 'folder-hidden' : ''}" data-folder-id="${folder.id}" style="padding-left: ${indent + 12}px">
      <button class="folder-tree-toggle ${isVisible ? 'visible' : 'toggle-hidden'}" tabindex="-1">
        <svg class="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${isVisible 
            ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
            : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
          }
        </svg>
      </button>
      <div class="folder-tree-content">
        <span class="folder-tree-name">${escapeHtml(folder.title)}</span>
        ${showPath ? `<span class="folder-tree-path">${escapeHtml(parentFolder.title)}</span>` : ''}
        <span class="folder-tree-count">${folder.bookmarkCount}</span>
      </div>
    </div>
  `;
}

function closeSettingsPanel() {
  const panel = document.getElementById('settingsPanel');
  if (panel) {
    panel.classList.add('closing');
    setTimeout(() => panel.remove(), 300);
  }
}

function applyFolderNavState() {
  elements.folderNavContent.classList.toggle('collapsed', settings.folderNavCollapsed);
  elements.folderNavToggle.classList.toggle('collapsed', settings.folderNavCollapsed);
}

// ==================== Event Listeners ====================

function setupEventListeners() {
  // Search
  elements.searchInput.addEventListener('input', handleSearchInput);
  elements.searchClear.addEventListener('click', clearSearch);
  elements.searchSubmit.addEventListener('click', performSearch);
  elements.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveBookmarkSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveBookmarkSelection(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const intent = parseSearchIntent(elements.searchInput.value);
      if (intent.isPrefixed || e.shiftKey || !openSelectedBookmark()) {
        performSearch();
      }
    }
  });
  
  // Engine dropdown
  elements.engineBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (elements.engineDropdown.classList.contains('active')) {
      hideEngineDropdown();
    } else {
      showEngineDropdown();
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!elements.engineBtn.contains(e.target) && !elements.engineDropdown.contains(e.target)) {
      hideEngineDropdown();
    }
  });
  
  // Folder nav toggle
  elements.folderNavToggle.addEventListener('click', () => {
    elements.folderNavContent.classList.toggle('collapsed');
    elements.folderNavToggle.classList.toggle('collapsed');
    settings.folderNavCollapsed = elements.folderNavContent.classList.contains('collapsed');
    saveSettingsSilent();
  });
  
  // FAB
  elements.fab.addEventListener('click', openSettingsPanel);
  
  // Bookmark changes
  if (typeof chrome !== 'undefined' && chrome.bookmarks) {
    chrome.bookmarks.onCreated.addListener(() => loadBookmarks());
    chrome.bookmarks.onRemoved.addListener(() => loadBookmarks());
    chrome.bookmarks.onChanged.addListener(() => loadBookmarks());
    chrome.bookmarks.onMoved.addListener(() => loadBookmarks());
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      elements.searchInput.focus();
    }
    
    if (e.key === 'Escape') {
      const settingsPanel = document.getElementById('settingsPanel');
      
      if (settingsPanel) {
        closeSettingsPanel();
      } else if (elements.engineDropdown.classList.contains('active')) {
        hideEngineDropdown();
      } else {
        clearSearch();
        elements.searchInput.blur();
      }
    }
  });
}

// ==================== Mock Data ====================

function showMockData() {
  const mockTree = [{
    children: [
      {
        id: '1',
        title: 'Bookmarks Bar',
        children: [
          { title: 'Google', url: 'https://google.com' },
          { title: 'GitHub', url: 'https://github.com' },
          {
            id: '1-1',
            title: 'Dev Tools',
            children: [
              { title: 'VS Code', url: 'https://code.visualstudio.com' },
              { title: 'Figma', url: 'https://figma.com' }
            ]
          },
          {
            id: '1-2',
            title: 'AI Tools',
            children: [
              { title: 'ChatGPT', url: 'https://chat.openai.com' },
              { title: 'Claude', url: 'https://claude.ai' }
            ]
          }
        ]
      },
      {
        id: '2',
        title: 'Other Bookmarks',
        children: [
          { title: 'YouTube', url: 'https://youtube.com' },
          { title: 'Twitter', url: 'https://twitter.com' }
        ]
      },
      {
        id: '3',
        title: 'Mobile Bookmarks',
        children: [
          { title: 'Reddit', url: 'https://reddit.com' }
        ]
      }
    ]
  }];
  
  bookmarkTree = mockTree;
  flatFolders = flattenFolders(mockTree);
  allBookmarks = [];
  flatFolders.forEach(f => {
    allBookmarks = allBookmarks.concat(f.bookmarks);
  });
  uncategorizedBookmarks = getUncategorizedBookmarks(flatFolders);
  
  renderFolderNav();
  renderBookmarks(mockTree);
  updateStats();
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
