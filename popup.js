/**
 * MarkTab - Popup Script
 */

const FALLBACK_MESSAGES = {
  popupQuickActions: 'MarkTab quick actions',
  bookmarkOverview: 'Bookmark overview',
  quickActions: 'Quick actions',
  searchShortcut: 'Search shortcut',
  popupSubtitle: 'A bookmark-powered new tab',
  bookmarks: 'Bookmarks',
  folders: 'Folders',
  openMarktabNewTab: 'Open MarkTab new tab',
  addCurrentPage: 'Add current page',
  manageBookmarks: 'Manage bookmarks',
  quickSearchBookmarks: 'Quickly search bookmarks on the new tab page',
  localFirst: 'Local first',
  noBookmarkUpload: 'No bookmark data upload',
  addedToBookmarks: 'Added to bookmarks',
  addBookmarkFailed: 'Could not add bookmark. Try again.',
  cannotBookmarkPage: 'This page cannot be bookmarked'
};

function getUiLocale() {
  const language = typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
    ? chrome.i18n.getUILanguage()
    : navigator.language;
  return language || 'en';
}

function msg(key, substitutions = []) {
  const values = Array.isArray(substitutions) ? substitutions : [substitutions];
  if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
    const translated = chrome.i18n.getMessage(key, values);
    if (translated) return translated;
  }
  return values.reduce(
    (text, value, index) => text.replaceAll(`$${index + 1}`, String(value)),
    FALLBACK_MESSAGES[key] || key
  );
}

function localizeDocument() {
  const locale = getUiLocale().replace('_', '-');
  document.documentElement.lang = locale.startsWith('zh') ? 'zh-CN' : 'en';

  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = msg(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(node => {
    node.setAttribute('aria-label', msg(node.dataset.i18nAriaLabel));
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  localizeDocument();

  // 加载统计
  await loadStats();
  
  // 绑定按钮事件
  document.getElementById('openNewTab').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://newtab' });
    window.close();
  });
  
  document.getElementById('addBookmark').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      try {
        await chrome.bookmarks.create({
          title: tab.title || tab.url,
          url: tab.url
        });
        showNotification(msg('addedToBookmarks'));
        await loadStats();
      } catch (error) {
        showNotification(msg('addBookmarkFailed'));
      }
    } else {
      showNotification(msg('cannotBookmarkPage'));
    }
  });
  
  document.getElementById('manageBookmarks').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://bookmarks/' });
    window.close();
  });
});

// 加载统计
async function loadStats() {
  try {
    const tree = await chrome.bookmarks.getTree();
    
    let bookmarkCount = 0;
    let folderCount = 0;
    
    function traverse(node) {
      if (node.url) {
        bookmarkCount++;
      } else if (node.children) {
        folderCount++;
        node.children.forEach(traverse);
      }
    }
    
    tree.forEach(traverse);
    
    // 减去根节点
    folderCount = Math.max(0, folderCount - 1);
    
    document.getElementById('bookmarkCount').textContent = bookmarkCount;
    document.getElementById('folderCount').textContent = folderCount;
  } catch (error) {
    document.getElementById('bookmarkCount').textContent = '-';
    document.getElementById('folderCount').textContent = '-';
  }
}

// 显示通知
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'popup-toast';
  notification.setAttribute('role', 'status');
  notification.setAttribute('aria-live', 'polite');
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}
