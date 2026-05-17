/**
 * MarkTab - Popup Script
 */

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
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
        showNotification('书签添加成功！');
        await loadStats();
      } catch (error) {
        showNotification('添加失败，请重试');
      }
    } else {
      showNotification('当前页面无法添加为书签');
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
  notification.style.cssText = `
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(78, 205, 196, 0.95);
    color: white;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    animation: fadeInUp 0.3s ease-out;
    z-index: 1000;
  `;
  notification.setAttribute('role', 'status');
  notification.setAttribute('aria-live', 'polite');
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}
