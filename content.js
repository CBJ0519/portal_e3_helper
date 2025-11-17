// NYCU E3 Helper - Content Script
// 優化 E3 使用體驗

console.log('NYCU E3 Helper 已載入');
console.log('E3 Helper: JSZip 可用:', typeof JSZip !== 'undefined');

// 添加樣式
const style = document.createElement('style');
style.textContent = `
  /* 側欄樣式 */
  .e3-helper-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 350px;
    height: 100vh;
    background: white;
    border-left: 3px solid #667eea;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    z-index: 10001;
    transition: transform 0.3s ease;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    transform: translateX(350px);
  }

  .e3-helper-sidebar.expanded {
    transform: translateX(0);
  }

  .e3-helper-sidebar-toggle {
    position: fixed;
    right: 0;
    top: 100px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 10px 0 0 10px;
    color: white;
    cursor: grab;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: -3px 3px 12px rgba(0,0,0,0.25);
    transition: all 0.3s ease;
    z-index: 10000;
    white-space: nowrap;
    user-select: none;
  }

  .e3-helper-sidebar-toggle:active {
    cursor: grabbing;
  }

  .e3-helper-sidebar-toggle.hidden {
    opacity: 0;
    pointer-events: none;
  }

  .e3-helper-sidebar-toggle:hover {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    transform: translateX(-3px);
    box-shadow: -4px 4px 16px rgba(0,0,0,0.3);
  }

  .e3-helper-sidebar-toggle:active {
    transform: translateX(-1px);
  }

  .e3-helper-toggle-icon {
    font-size: 20px;
  }

  .e3-helper-toggle-text {
    font-size: 14px;
    font-weight: 600;
  }

  .e3-helper-sidebar-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom: 2px solid rgba(255,255,255,0.2);
  }

  .e3-helper-sync-status {
    padding: 8px 12px;
    background: rgba(0,0,0,0.1);
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: rgba(255,255,255,0.9);
  }

  .e3-helper-sync-time {
    flex: 1;
  }

  .e3-helper-sync-btn {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .e3-helper-sync-btn:hover {
    background: rgba(255,255,255,0.3);
  }

  .e3-helper-sync-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .e3-helper-login-warning {
    padding: 10px 12px;
    background: #fff3cd;
    border-left: 4px solid #ffc107;
    margin: 12px;
    border-radius: 4px;
    font-size: 12px;
    color: #856404;
  }

  .e3-helper-login-warning a {
    color: #856404;
    font-weight: 600;
    text-decoration: underline;
  }

  .e3-helper-welcome-message {
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    margin: 12px;
    color: white;
    font-size: 13px;
    line-height: 1.6;
  }

  .e3-helper-welcome-message h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .e3-helper-welcome-message ul {
    margin: 12px 0;
    padding-left: 20px;
  }

  .e3-helper-welcome-message li {
    margin: 6px 0;
  }

  .e3-helper-welcome-message .highlight {
    background: rgba(255,255,255,0.2);
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 600;
  }

  .e3-helper-tabs {
    display: flex;
    padding: 0;
    margin: 0;
  }

  .e3-helper-tab {
    flex: 1;
    padding: 8px 4px;
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.7);
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s ease;
    border-bottom: 3px solid transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    line-height: 1.2;
  }

  .e3-helper-tab:hover {
    color: white;
    background: rgba(255,255,255,0.1);
  }

  .e3-helper-tab.active {
    color: white;
    border-bottom-color: white;
    background: rgba(255,255,255,0.15);
  }

  .e3-helper-assignment-list {
    padding: 12px;
  }

  .e3-helper-assignment-item {
    padding: 12px;
    margin-bottom: 10px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #667eea;
    transition: all 0.2s ease;
  }

  .e3-helper-assignment-item:hover {
    background: #e9ecef;
    transform: translateX(-2px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .e3-helper-assignment-item.urgent {
    border-left-color: #ff6b6b;
    background: #fff5f5;
  }

  .e3-helper-assignment-item.warning {
    border-left-color: #ffa500;
    background: #fff9f0;
  }

  .e3-helper-assignment-item.overdue {
    border-left-color: #999;
    background: #f5f5f5;
    opacity: 0.7;
  }

  .e3-helper-assignment-item.completed {
    border-left-color: #51cf66;
    background: #f0fdf4;
    opacity: 0.85;
  }

  .e3-helper-assignment-name {
    font-weight: 600;
    font-size: 14px;
    color: #2c3e50;
    margin-bottom: 6px;
    display: block;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .e3-helper-assignment-name:hover {
    color: #667eea;
  }

  .e3-helper-assignment-course {
    font-size: 11px;
    color: #6c757d;
    margin-bottom: 6px;
  }

  .e3-helper-assignment-deadline {
    font-size: 12px;
    color: #495057;
    margin-bottom: 6px;
  }

  .e3-helper-assignment-countdown {
    font-size: 13px;
    font-weight: 600;
    color: #667eea;
    font-family: 'Courier New', monospace;
  }

  .e3-helper-assignment-countdown.urgent {
    color: #ff6b6b;
  }

  .e3-helper-assignment-countdown.warning {
    color: #ffa500;
  }

  .e3-helper-assignment-countdown.overdue {
    color: #999;
  }

  .e3-helper-status-toggle {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    background: #e9ecef;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  }

  .e3-helper-status-toggle:hover {
    background: #dee2e6;
    transform: scale(1.05);
  }

  .e3-helper-status-toggle.submitted {
    background: #d3f9d8;
    border-color: #51cf66;
    color: #2b8a3e;
  }

  .e3-helper-no-assignments {
    padding: 20px;
    text-align: center;
    color: #6c757d;
    font-size: 14px;
  }

  .e3-helper-content {
    display: none;
  }

  .e3-helper-content.active {
    display: block;
  }

  .e3-helper-grade-selector {
    padding: 12px;
    border-bottom: 1px solid #e9ecef;
  }

  .e3-helper-grade-selector select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    font-size: 13px;
    background: white;
    cursor: pointer;
  }

  .e3-helper-grade-stats {
    padding: 12px;
  }

  .e3-helper-stat-card {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
    border-left: 4px solid #667eea;
  }

  .e3-helper-stat-title {
    font-size: 12px;
    color: #6c757d;
    margin-bottom: 6px;
  }

  .e3-helper-stat-value {
    font-size: 20px;
    font-weight: 600;
    color: #2c3e50;
  }

  .e3-helper-stat-sub {
    font-size: 11px;
    color: #6c757d;
    margin-top: 4px;
  }

  .e3-helper-stat-card.optimistic {
    border-left-color: #51cf66;
  }

  .e3-helper-stat-card.pessimistic {
    border-left-color: #ff6b6b;
  }

  .e3-helper-loading {
    padding: 20px;
    text-align: center;
    color: #6c757d;
    font-size: 14px;
  }

  .e3-helper-download-container {
    padding: 12px;
  }

  .e3-helper-download-actions {
    padding: 12px;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    gap: 8px;
  }

  .e3-helper-download-btn {
    flex: 1;
    padding: 8px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .e3-helper-download-btn:hover {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }

  .e3-helper-download-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .e3-helper-download-btn.secondary {
    background: #e9ecef;
    color: #495057;
  }

  .e3-helper-download-btn.secondary:hover {
    background: #dee2e6;
  }

  .e3-helper-pdf-list {
    max-height: calc(100vh - 260px);
    overflow-y: auto;
  }

  .e3-helper-pdf-item {
    padding: 10px 12px;
    margin-bottom: 8px;
    background: #f8f9fa;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s ease;
  }

  .e3-helper-pdf-item:hover {
    background: #e9ecef;
    transform: translateX(-2px);
  }

  .e3-helper-pdf-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .e3-helper-pdf-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .e3-helper-pdf-info {
    flex: 1;
    min-width: 0;
  }

  .e3-helper-pdf-name {
    font-size: 13px;
    color: #2c3e50;
    font-weight: 500;
    word-break: break-word;
    margin-bottom: 2px;
  }

  .e3-helper-pdf-course {
    font-size: 11px;
    color: #6c757d;
  }

  .e3-helper-download-status {
    padding: 12px;
    background: #f8f9fa;
    border-top: 1px solid #e9ecef;
    font-size: 12px;
    color: #6c757d;
  }

  .e3-helper-course-item {
    padding: 8px;
    margin-bottom: 6px;
    background: white;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .e3-helper-course-item:hover {
    background: #e9ecef;
    transform: translateX(-2px);
  }

  .e3-helper-course-checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .e3-helper-course-name {
    font-size: 12px;
    color: #2c3e50;
    flex: 1;
  }

  .e3-helper-announcement-item {
    padding: 12px;
    margin-bottom: 10px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #667eea;
    transition: all 0.2s ease;
  }

  .e3-helper-announcement-item:hover {
    background: #e9ecef;
    transform: translateX(-2px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .e3-helper-announcement-item.unread {
    border-left-color: #e74c3c;
    background: #fff5f5;
  }

  .e3-helper-announcement-item.read {
    opacity: 0.75;
    background: #f1f3f5;
  }

  .e3-helper-announcement-title {
    color: #2c3e50;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .e3-helper-announcement-title:hover {
    color: #667eea;
  }

  .e3-helper-announcement-item.read .e3-helper-announcement-title {
    color: #6c757d;
    font-weight: normal;
  }

  .e3-helper-announcement-meta {
    font-size: 12px;
    color: #6c757d;
  }
`;
document.head.appendChild(style);

// 儲存所有作業資訊
let allAssignments = [];
let countdownInterval = null;

// 儲存課程和成績資訊
let allCourses = [];
let selectedCourseId = null;
let gradeData = {};

// 儲存教材檔案資訊
let allPDFs = [];
let selectedPDFs = new Set();
let selectedCourses = new Set(); // 選中要掃描的課程 ID

// 儲存公告與信件資訊
let allAnnouncements = [];
let allMessages = []; // 信件
let readAnnouncements = new Set(); // 已讀公告 ID
let readMessages = new Set(); // 已讀信件 ID

// 支援的檔案類型
const SUPPORTED_FILE_TYPES = [
  { ext: '.pdf', icon: '📄', name: 'PDF' },
  { ext: '.ppt', icon: '📊', name: 'PPT' },
  { ext: '.pptx', icon: '📊', name: 'PPTX' },
  { ext: '.doc', icon: '📝', name: 'DOC' },
  { ext: '.docx', icon: '📝', name: 'DOCX' },
  { ext: '.xls', icon: '📈', name: 'XLS' },
  { ext: '.xlsx', icon: '📈', name: 'XLSX' },
  { ext: '.zip', icon: '📦', name: 'ZIP' },
  { ext: '.rar', icon: '📦', name: 'RAR' },
  { ext: '.mp4', icon: '🎬', name: 'MP4' },
  { ext: '.avi', icon: '🎬', name: 'AVI' },
  { ext: '.mov', icon: '🎬', name: 'MOV' },
  { ext: '.wmv', icon: '🎬', name: 'WMV' },
  { ext: '.flv', icon: '🎬', name: 'FLV' },
  { ext: '.mkv', icon: '🎬', name: 'MKV' },
  { ext: '.webm', icon: '🎬', name: 'WEBM' }
];

// 取得檔案類型資訊
function getFileTypeInfo(url) {
  const lowerUrl = url.toLowerCase();
  for (const type of SUPPORTED_FILE_TYPES) {
    if (lowerUrl.includes(type.ext)) {
      return type;
    }
  }
  return { ext: '', icon: '📎', name: 'FILE' };
}

// 從儲存空間讀取作業狀態
async function loadAssignmentStatuses() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['assignmentStatuses'], (result) => {
      resolve(result.assignmentStatuses || {});
    });
  });
}

// 儲存作業狀態
async function saveAssignmentStatus(eventId, status) {
  const statuses = await loadAssignmentStatuses();
  statuses[eventId] = status;
  await chrome.storage.local.set({ assignmentStatuses: statuses });
  console.log(`E3 Helper: 已儲存作業 ${eventId} 狀態為 ${status}`);
  console.log('E3 Helper: 當前所有手動狀態:', statuses);
}

// 從儲存空間讀取作業列表
async function loadAssignments() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['assignments'], (result) => {
      resolve(result.assignments || []);
    });
  });
}

// 儲存作業列表
async function saveAssignments() {
  chrome.storage.local.set({ assignments: allAssignments });
  console.log(`E3 Helper: 已儲存 ${allAssignments.length} 個作業到 storage`);
}

// 切換作業狀態（循環：未完成 → 已繳交 → 未完成）
async function toggleAssignmentStatus(eventId) {
  const assignment = allAssignments.find(a => a.eventId === eventId);
  if (!assignment) return;

  const currentStatus = assignment.manualStatus || 'pending';
  let newStatus;

  // 簡單的二元切換
  if (currentStatus === 'submitted') {
    newStatus = 'pending';
  } else {
    newStatus = 'submitted';
  }

  assignment.manualStatus = newStatus;
  await saveAssignmentStatus(eventId, newStatus);
  await saveAssignments(); // 同時更新作業列表
  updateSidebarContent();
  console.log(`E3 Helper: 作業 ${eventId} 狀態切換為 ${newStatus}`);
}

// 格式化倒數時間
function formatCountdown(deadline) {
  const now = new Date().getTime();
  const timeLeft = deadline - now;

  if (timeLeft < 0) {
    return { text: '已截止', status: 'overdue' };
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  let text = '';
  if (days > 0) {
    text = `${days}天 ${hours}小時 ${minutes}分 ${seconds}秒`;
  } else if (hours > 0) {
    text = `${hours}小時 ${minutes}分 ${seconds}秒`;
  } else if (minutes > 0) {
    text = `${minutes}分 ${seconds}秒`;
  } else {
    text = `${seconds}秒`;
  }

  // 判斷狀態
  let status = 'normal';
  if (timeLeft < 60 * 60 * 1000) { // < 1小時
    status = 'urgent';
  } else if (timeLeft < 24 * 60 * 60 * 1000) { // < 24小時
    status = 'warning';
  }

  return { text, status };
}

// 創建並更新側欄
function createSidebar() {
  // 檢查是否已經有側欄
  let sidebar = document.querySelector('.e3-helper-sidebar');
  let toggleBtn = document.querySelector('.e3-helper-sidebar-toggle');

  if (!sidebar) {
    // 創建側欄
    sidebar = document.createElement('div');
    sidebar.className = 'e3-helper-sidebar';

    // 創建標題和標籤
    const header = document.createElement('div');
    header.className = 'e3-helper-sidebar-header';

    // 添加同步狀態區域
    const syncStatus = document.createElement('div');
    syncStatus.className = 'e3-helper-sync-status';
    syncStatus.innerHTML = `
      <div class="e3-helper-sync-time" id="e3-helper-sync-time">載入中...</div>
      <div style="display: flex; gap: 4px;">
        <button class="e3-helper-sync-btn" id="e3-helper-sync-btn">🔄 同步</button>
        <button class="e3-helper-sync-btn" id="e3-helper-close-btn">✕</button>
      </div>
    `;
    header.appendChild(syncStatus);

    const tabs = document.createElement('div');
    tabs.className = 'e3-helper-tabs';

    // 檢查是否在 E3 網站
    const onE3Site = isOnE3Site();

    // 作業倒數 tab
    const assignmentTab = document.createElement('button');
    assignmentTab.className = 'e3-helper-tab active';
    assignmentTab.innerHTML = '<span style="font-size: 16px;">📝</span><br><span style="font-size: 10px; line-height: 1.3;">作業<br>倒數</span>';
    assignmentTab.dataset.tab = 'assignments';
    assignmentTab.title = '作業倒數';


    const gradeTab = document.createElement('button');
    gradeTab.className = 'e3-helper-tab';
    gradeTab.innerHTML = '<span style="font-size: 16px;">📊</span><br><span style="font-size: 10px; line-height: 1.3;">成績<br>分析</span>';
    gradeTab.dataset.tab = 'grades';
    gradeTab.title = '成績分析';

    const downloadTab = document.createElement('button');
    downloadTab.className = 'e3-helper-tab';
    downloadTab.innerHTML = '<span style="font-size: 16px;">📥</span><br><span style="font-size: 10px; line-height: 1.3;">教材<br>下載</span>';
    downloadTab.dataset.tab = 'downloads';
    downloadTab.title = '教材下載';

    // 公告與信件 tab
    const announcementTab = document.createElement('button');
    announcementTab.className = 'e3-helper-tab';
    announcementTab.innerHTML = '<span style="font-size: 16px;">📢</span><br><span style="font-size: 10px; line-height: 1.3;">公告<br>信件</span>';
    announcementTab.dataset.tab = 'announcements';
    announcementTab.title = '公告與信件';

    // 只添加作業倒數和公告 tab，在 E3 網站才添加成績和下載 tab
    tabs.appendChild(assignmentTab);
    if (onE3Site) {
      tabs.appendChild(gradeTab);
      tabs.appendChild(downloadTab);
    }
    tabs.appendChild(announcementTab);
    header.appendChild(tabs);
    sidebar.appendChild(header);

    // 創建作業列表容器
    const assignmentContent = document.createElement('div');
    assignmentContent.className = 'e3-helper-content active';
    assignmentContent.dataset.content = 'assignments';

    const listContainer = document.createElement('div');
    listContainer.className = 'e3-helper-assignment-list';
    assignmentContent.appendChild(listContainer);
    sidebar.appendChild(assignmentContent);

    // 只在 E3 網站創建成績分析和教材下載容器
    let gradeContent, downloadContent;
    if (onE3Site) {
      // 創建成績分析容器
      gradeContent = document.createElement('div');
      gradeContent.className = 'e3-helper-content';
      gradeContent.dataset.content = 'grades';

      const gradeStats = document.createElement('div');
      gradeStats.className = 'e3-helper-grade-stats';
      gradeStats.innerHTML = '<div class="e3-helper-loading">載入課程成績中...</div>';
      gradeContent.appendChild(gradeStats);
      sidebar.appendChild(gradeContent);

      // 創建教材下載容器
      downloadContent = document.createElement('div');
      downloadContent.className = 'e3-helper-content';
      downloadContent.dataset.content = 'downloads';

      const scanOptions = document.createElement('div');
      scanOptions.className = 'e3-helper-download-actions';
      scanOptions.innerHTML = `
        <button class="e3-helper-download-btn" id="e3-helper-scan-current" style="flex: 1;">📄 掃描此頁</button>
        <button class="e3-helper-download-btn" id="e3-helper-show-course-select" style="flex: 1;">🔍 選擇課程</button>
      `;
      downloadContent.appendChild(scanOptions);

      // 課程選擇區域（初始隱藏）
      const courseSelectContainer = document.createElement('div');
      courseSelectContainer.className = 'e3-helper-course-select-container';
      courseSelectContainer.style.display = 'none';
      courseSelectContainer.innerHTML = `
        <div style="padding: 12px; border-bottom: 1px solid #e9ecef;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 13px; font-weight: 600; color: #495057;">選擇要掃描的課程</span>
            <div style="display: flex; gap: 4px;">
              <button class="e3-helper-download-btn secondary" id="e3-helper-select-all-courses" style="padding: 4px 8px; font-size: 11px;">全選</button>
              <button class="e3-helper-download-btn secondary" id="e3-helper-deselect-all-courses" style="padding: 4px 8px; font-size: 11px;">取消</button>
            </div>
          </div>
          <div id="e3-helper-course-list" style="max-height: 200px; overflow-y: auto; background: #f8f9fa; border-radius: 4px; padding: 8px;">
            <div class="e3-helper-loading">載入課程中...</div>
          </div>
          <button class="e3-helper-download-btn" id="e3-helper-start-scan" style="width: 100%; margin-top: 8px;">開始掃描</button>
        </div>
      `;
      downloadContent.appendChild(courseSelectContainer);

      const downloadActions = document.createElement('div');
      downloadActions.className = 'e3-helper-download-actions';
      downloadActions.innerHTML = `
        <button class="e3-helper-download-btn secondary" id="e3-helper-select-all">全選</button>
        <button class="e3-helper-download-btn secondary" id="e3-helper-deselect-all">取消全選</button>
        <button class="e3-helper-download-btn" id="e3-helper-download-selected">下載選取</button>
      `;
      downloadContent.appendChild(downloadActions);

      const pdfListContainer = document.createElement('div');
      pdfListContainer.className = 'e3-helper-pdf-list';
      pdfListContainer.innerHTML = '<div class="e3-helper-loading">請選擇掃描模式</div>';
      downloadContent.appendChild(pdfListContainer);

      const downloadStatus = document.createElement('div');
      downloadStatus.className = 'e3-helper-download-status';
      downloadStatus.textContent = '已選取 0 個檔案';
      downloadContent.appendChild(downloadStatus);
      sidebar.appendChild(downloadContent);
    } // 結束 if (onE3Site)

    // 創建公告容器
    const announcementContent = document.createElement('div');
    announcementContent.className = 'e3-helper-content';
    announcementContent.dataset.content = 'announcements';

    const announcementList = document.createElement('div');
    announcementList.className = 'e3-helper-assignment-list';
    announcementList.innerHTML = '<div class="e3-helper-loading">載入公告中...</div>';
    announcementContent.appendChild(announcementList);
    sidebar.appendChild(announcementContent);

    // 標籤切換事件（只在 E3 網站上）
    if (onE3Site) {
      assignmentTab.addEventListener('click', () => {
        assignmentTab.classList.add('active');
        gradeTab.classList.remove('active');
        downloadTab.classList.remove('active');
        announcementTab.classList.remove('active');
        assignmentContent.classList.add('active');
        gradeContent.classList.remove('active');
        downloadContent.classList.remove('active');
        announcementContent.classList.remove('active');
      });
    }

    // 只在 E3 網站添加成績和下載 tab 的事件處理器
    if (onE3Site) {
      gradeTab.addEventListener('click', async () => {
      gradeTab.classList.add('active');
      assignmentTab.classList.remove('active');
      downloadTab.classList.remove('active');
      announcementTab.classList.remove('active');
      gradeContent.classList.add('active');
      assignmentContent.classList.remove('active');
      downloadContent.classList.remove('active');
      announcementContent.classList.remove('active');

      // 檢查是否需要顯示歡迎訊息
      const storage = await chrome.storage.local.get(['lastSyncTime', 'courses', 'gradeData']);
      const hasNeverSynced = !storage.lastSyncTime;
      const hasNoCourses = !storage.courses || storage.courses.length === 0;

      console.log('E3 Helper: 成績分析 tab 點擊', {
        hasNeverSynced,
        hasNoCourses,
        gradeDataInMemory: Object.keys(gradeData).length,
        gradeDataInStorage: storage.gradeData ? Object.keys(storage.gradeData).length : 0
      });

      if (hasNeverSynced && hasNoCourses) {
        // 顯示歡迎訊息
        const statsContainer = document.querySelector('.e3-helper-grade-stats');
        if (statsContainer) {
          const isOnE3 = window.location.hostname.includes('e3.nycu.edu.tw') || window.location.hostname.includes('e3p.nycu.edu.tw');
          statsContainer.innerHTML = `
            <div class="e3-helper-welcome-message">
              <h3>👋 歡迎使用成績分析</h3>
              ${isOnE3 ? `
                <p>請先點擊上方的 <span class="highlight">🔄 同步</span> 按鈕來載入課程資料。</p>
              ` : `
                <p>請先訪問 <a href="https://e3p.nycu.edu.tw/" target="_blank" style="color: white; text-decoration: underline; font-weight: 600;">NYCU E3</a>，然後點擊 <span class="highlight">🔄 同步</span> 按鈕。</p>
              `}
              <p>同步完成後，再切換到此分頁即可查看成績分析。</p>
            </div>
          `;
        }
      } else if (Object.keys(gradeData).length === 0) {
        // 記憶體中沒有成績資料
        // 先嘗試從 storage 載入
        if (storage.gradeData && Object.keys(storage.gradeData).length > 0) {
          console.log('E3 Helper: 從 storage 載入成績資料');
          gradeData = storage.gradeData;
          if (storage.courses) {
            allCourses = storage.courses;
          }
          displayCourseGradeList();
        } else {
          // storage 中也沒有成績資料
          // 顯示提示訊息（displayCourseGradeList 會處理）
          console.log('E3 Helper: storage 中也沒有成績資料，顯示提示訊息');
          displayCourseGradeList();
        }
      } else {
        // 記憶體中已有成績資料，直接顯示
        console.log('E3 Helper: 記憶體中已有成績資料，直接顯示');
        displayCourseGradeList();
      }
    });

    downloadTab.addEventListener('click', async () => {
      downloadTab.classList.add('active');
      assignmentTab.classList.remove('active');
      gradeTab.classList.remove('active');
      announcementTab.classList.remove('active');
      downloadContent.classList.add('active');
      assignmentContent.classList.remove('active');
      gradeContent.classList.remove('active');
      announcementContent.classList.remove('active');

      // 檢查是否需要顯示歡迎訊息
      const storage = await chrome.storage.local.get(['lastSyncTime', 'courses']);
      const hasNeverSynced = !storage.lastSyncTime;
      const hasNoCourses = !storage.courses || storage.courses.length === 0;

      if (hasNeverSynced && hasNoCourses && allPDFs.length === 0) {
        // 顯示歡迎訊息
        const pdfListContainer = document.querySelector('.e3-helper-pdf-list');
        if (pdfListContainer) {
          const isOnE3 = window.location.hostname.includes('e3.nycu.edu.tw') || window.location.hostname.includes('e3p.nycu.edu.tw');
          pdfListContainer.innerHTML = `
            <div class="e3-helper-welcome-message">
              <h3>👋 歡迎使用教材下載</h3>
              ${isOnE3 ? `
                <p>請先點擊上方的 <span class="highlight">🔄 同步</span> 按鈕來載入課程資料。</p>
                <p>同步完成後，您可以：</p>
                <ul>
                  <li>📄 掃描此頁的教材</li>
                  <li>🔍 選擇課程進行掃描</li>
                  <li>📦 批次下載為 ZIP</li>
                </ul>
              ` : `
                <p>請先訪問 <a href="https://e3p.nycu.edu.tw/" target="_blank" style="color: white; text-decoration: underline; font-weight: 600;">NYCU E3</a>，然後點擊 <span class="highlight">🔄 同步</span> 按鈕。</p>
                <p>同步完成後，您就可以在 E3 網站上掃描和下載教材了。</p>
              `}
            </div>
          `;
        }
      }

      // 綁定掃描按鈕事件（只綁定一次）
      const scanCurrentBtn = document.getElementById('e3-helper-scan-current');
      const showCourseSelectBtn = document.getElementById('e3-helper-show-course-select');
      const courseSelectContainer = document.querySelector('.e3-helper-course-select-container');

      if (scanCurrentBtn && !scanCurrentBtn.dataset.bound) {
        scanCurrentBtn.dataset.bound = 'true';
        scanCurrentBtn.addEventListener('click', () => {
          courseSelectContainer.style.display = 'none';
          scanCurrentPage();
        });
      }

      if (showCourseSelectBtn && !showCourseSelectBtn.dataset.bound) {
        showCourseSelectBtn.dataset.bound = 'true';
        showCourseSelectBtn.addEventListener('click', async () => {
          // 顯示課程選擇區域
          if (courseSelectContainer.style.display === 'none') {
            courseSelectContainer.style.display = 'block';
            await loadCourseSelector();
          } else {
            courseSelectContainer.style.display = 'none';
          }
        });
      }

      // 綁定課程選擇相關按鈕
      const selectAllCoursesBtn = document.getElementById('e3-helper-select-all-courses');
      const deselectAllCoursesBtn = document.getElementById('e3-helper-deselect-all-courses');
      const startScanBtn = document.getElementById('e3-helper-start-scan');

      if (selectAllCoursesBtn && !selectAllCoursesBtn.dataset.bound) {
        selectAllCoursesBtn.dataset.bound = 'true';
        selectAllCoursesBtn.addEventListener('click', () => {
          document.querySelectorAll('.e3-helper-course-checkbox').forEach(cb => cb.checked = true);
          selectedCourses.clear();
          allCourses.forEach(c => selectedCourses.add(c.id));
        });
      }

      if (deselectAllCoursesBtn && !deselectAllCoursesBtn.dataset.bound) {
        deselectAllCoursesBtn.dataset.bound = 'true';
        deselectAllCoursesBtn.addEventListener('click', () => {
          document.querySelectorAll('.e3-helper-course-checkbox').forEach(cb => cb.checked = false);
          selectedCourses.clear();
        });
      }

      if (startScanBtn && !startScanBtn.dataset.bound) {
        startScanBtn.dataset.bound = 'true';
        startScanBtn.addEventListener('click', () => {
          if (selectedCourses.size === 0) {
            alert('請至少選擇一個課程');
            return;
          }
          courseSelectContainer.style.display = 'none';
          scanSelectedCourses();
        });
      }

      // 顯示初始訊息
      if (allPDFs.length === 0) {
        const pdfListContainer = document.querySelector('.e3-helper-pdf-list');
        if (pdfListContainer) {
          pdfListContainer.innerHTML = '<div class="e3-helper-loading">請選擇掃描模式<br><small style="color: #999; margin-top: 8px; display: block;">📄 掃描此頁：快速掃描當前頁面<br>🔍 選擇課程：選擇要掃描的課程<br><br>支援：PDF、PPT、Word、Excel、影片、ZIP 等</small></div>';
        }
      }
    });
    } // 結束 if (onE3Site) - 成績和下載 tab 事件處理器

    announcementTab.addEventListener('click', async () => {
      announcementTab.classList.add('active');
      assignmentTab.classList.remove('active');
      if (onE3Site) {
        gradeTab.classList.remove('active');
        downloadTab.classList.remove('active');
      }
      announcementContent.classList.add('active');
      assignmentContent.classList.remove('active');
      if (onE3Site) {
        gradeContent.classList.remove('active');
        downloadContent.classList.remove('active');
      }

      // 檢查是否需要顯示歡迎訊息
      const storage = await chrome.storage.local.get(['lastSyncTime', 'courses', 'announcements', 'messages', 'readAnnouncements', 'readMessages']);
      const hasNeverSynced = !storage.lastSyncTime;
      const hasNoCourses = !storage.courses || storage.courses.length === 0;

      // 先從 storage 載入公告和信件資料（如果還沒載入的話）
      if (allAnnouncements.length === 0 && storage.announcements && storage.announcements.length > 0) {
        allAnnouncements = storage.announcements;
        if (storage.readAnnouncements) {
          readAnnouncements = new Set(storage.readAnnouncements);
        }
      }
      if (allMessages.length === 0 && storage.messages && storage.messages.length > 0) {
        allMessages = storage.messages;
        if (storage.readMessages) {
          readMessages = new Set(storage.readMessages);
        }
      }

      if (hasNeverSynced && hasNoCourses) {
        // 顯示歡迎訊息
        announcementList.innerHTML = `
          <div class="e3-helper-welcome-message">
            <h3>👋 歡迎使用公告與信件聚合</h3>
            ${isOnE3Site() ? `
              <p>請先點擊上方的 <span class="highlight">🔄 同步</span> 按鈕來載入課程資料。</p>
            ` : `
              <p>請先訪問 <a href="https://e3p.nycu.edu.tw/" target="_blank" style="color: white; text-decoration: underline; font-weight: 600;">NYCU E3</a>，然後點擊 <span class="highlight">🔄 同步</span> 按鈕。</p>
            `}
            <p>同步完成後，您就可以查看所有課程的最新公告與信件了。</p>
          </div>
        `;
      } else if (allAnnouncements.length === 0 && allMessages.length === 0) {
        // 兩者都沒有資料（storage 中也沒有），顯示載入按鈕
        announcementList.innerHTML = `
            <div class="e3-helper-welcome-message">
              <h3>📢 公告與信件聚合</h3>
              <p>將所有課程的最新公告與系統信件整合在此，方便快速查看。</p>
              ${isOnE3Site() ? `
                <button id="e3-helper-load-announcements-now" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 12px;">
                  🔄 載入公告與信件
                </button>
                <p style="color: #999; font-size: 12px; margin-top: 8px;">⏱️ 載入時間約 30-60 秒</p>
              ` : `
                <p>請訪問 E3 網站，然後在公告分頁點擊「載入公告與信件」按鈕。</p>
              `}
            </div>
          `;

        // 綁定載入按鈕事件
        const loadBtn = document.getElementById('e3-helper-load-announcements-now');
        if (loadBtn && !loadBtn.dataset.bound) {
          loadBtn.dataset.bound = 'true';
          loadBtn.addEventListener('click', async () => {
            await Promise.all([loadAnnouncements(), loadMessages()]);
            displayAnnouncements();
          });
        }
      } else {
        // 已有公告或信件資料
        // 檢查是否兩者都有
        const hasAnnouncements = allAnnouncements.length > 0;
        const hasMessages = allMessages.length > 0;

        if (hasAnnouncements && hasMessages) {
          // 兩者都有，直接顯示
          displayAnnouncements();
        } else if (hasAnnouncements || hasMessages) {
          // 只有其中一種，顯示並提示重新載入
          displayAnnouncements();

          // 在頂部加入提示
          const announcementListContainer = document.querySelector('.e3-helper-content[data-content="announcements"] .e3-helper-assignment-list');
          if (announcementListContainer) {
            const warningHTML = `
              <div style="padding: 12px; margin-bottom: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; color: #856404;">
                <div style="font-weight: 600; margin-bottom: 6px;">⚠️ 資料不完整</div>
                <div style="font-size: 12px; margin-bottom: 8px;">
                  ${hasAnnouncements ? '已載入公告，但尚未載入信件資料。' : '已載入信件，但尚未載入公告資料。'}
                </div>
                ${isOnE3Site() ? `
                  <button id="e3-helper-reload-all-later" style="background: #ffc107; color: #000; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                    🔄 重新載入完整資料
                  </button>
                ` : `
                  <div style="font-size: 11px;">請訪問 E3 網站重新載入</div>
                `}
              </div>
            `;
            announcementListContainer.insertAdjacentHTML('afterbegin', warningHTML);

            // 綁定重新載入按鈕
            const reloadBtn = document.getElementById('e3-helper-reload-all-later');
            if (reloadBtn) {
              reloadBtn.addEventListener('click', async () => {
                reloadBtn.disabled = true;
                reloadBtn.textContent = '⏳ 載入中...';
                await Promise.all([loadAnnouncements(), loadMessages()]);
                displayAnnouncements();
              });
            }
          }
        } else {
          // 兩者都沒有（這個情況應該被上面的條件捕獲，但保險起見）
          displayAnnouncements();
        }
      }
    });

    document.body.appendChild(sidebar);
  }

  if (!toggleBtn) {
    // 創建收合按鈕（獨立於側欄）
    toggleBtn = document.createElement('button');
    toggleBtn.className = 'e3-helper-sidebar-toggle';
    toggleBtn.innerHTML = '<span class="e3-helper-toggle-icon">📚</span><span class="e3-helper-toggle-text">E3小助手</span>';
    toggleBtn.title = 'E3 小助手（可上下拖曳調整位置）';

    // 從 localStorage 載入保存的位置
    const savedTop = localStorage.getItem('e3-helper-toggle-top');
    if (savedTop) {
      toggleBtn.style.top = savedTop;
    }

    // 拖曳功能變數
    let isDragging = false;
    let currentY = 0;
    let initialY = 0;
    let yOffset = 0;
    let hasMoved = false;

    // 滑鼠按下
    toggleBtn.addEventListener('mousedown', (e) => {
      if (e.target === toggleBtn || toggleBtn.contains(e.target)) {
        initialY = e.clientY - yOffset;
        isDragging = true;
        hasMoved = false;

        // 移除 transition 以獲得即時回饋
        toggleBtn.style.transition = 'none';
        e.preventDefault();
      }
    });

    // 滑鼠移動
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      e.preventDefault();
      currentY = e.clientY - initialY;

      // 如果移動超過 3px，視為拖曳
      if (Math.abs(currentY - yOffset) > 3) {
        hasMoved = true;
      }

      // 拖曳按鈕
      if (hasMoved) {
        yOffset = currentY;
        setPosition(toggleBtn, yOffset);
      }
    });

    // 滑鼠放開
    document.addEventListener('mouseup', (e) => {
      if (!isDragging) return;

      // 恢復 transition
      toggleBtn.style.transition = '';

      // 如果有拖曳，保存位置
      if (hasMoved) {
        const currentTop = toggleBtn.style.top;
        localStorage.setItem('e3-helper-toggle-top', currentTop);
        console.log(`E3 Helper: 按鈕位置已保存: ${currentTop}`);
      } else {
        // 如果沒有拖曳，視為點擊
        sidebar.classList.toggle('expanded');
        const icon = toggleBtn.querySelector('.e3-helper-toggle-icon');
        const text = toggleBtn.querySelector('.e3-helper-toggle-text');
        if (sidebar.classList.contains('expanded')) {
          icon.textContent = '✕';
          text.textContent = '關閉';
          toggleBtn.classList.add('hidden');
        } else {
          icon.textContent = '📚';
          text.textContent = 'E3小助手';
          toggleBtn.classList.remove('hidden');
        }
      }

      isDragging = false;
      hasMoved = false;
    });

    // 設定位置的輔助函數
    function setPosition(el, offset) {
      // 計算新位置（從預設的 100px 開始）
      const newTop = 100 + offset;
      // 限制在視窗範圍內（最少 10px，最多視窗高度 - 60px）
      const clampedTop = Math.max(10, Math.min(window.innerHeight - 60, newTop));
      el.style.top = `${clampedTop}px`;
    }

    // 如果有保存的位置，計算 offset
    if (savedTop) {
      yOffset = parseInt(savedTop) - 100;
    }

    document.body.appendChild(toggleBtn);
  }

  // 更新作業列表
  updateSidebarContent();

  // 每秒更新倒數（只創建一次）
  if (!countdownInterval) {
    countdownInterval = setInterval(updateCountdowns, 1000);
  }
}

// 顯示歡迎訊息（首次使用）
function showWelcomeMessage() {
  const listContainer = document.querySelector('.e3-helper-assignment-list');
  if (!listContainer) return;

  const isOnE3 = window.location.hostname.includes('e3.nycu.edu.tw') || window.location.hostname.includes('e3p.nycu.edu.tw');

  const welcomeHTML = `
    <div class="e3-helper-welcome-message">
      <h3>👋 歡迎使用 E3 小助手</h3>
      <p>這是您第一次使用，讓我來幫您設定！</p>

      ${isOnE3 ? `
        <p>✨ 您目前在 E3 網站上，請點擊上方的 <span class="highlight">🔄 同步</span> 按鈕來載入您的資料。</p>
        <ul>
          <li>📝 同步作業和截止時間</li>
          <li>📚 同步課程列表</li>
          <li>📊 準備成績分析</li>
        </ul>
        <p>同步完成後，您就可以在<strong>任何網頁</strong>上查看作業和成績了！</p>
      ` : `
        <p>⚠️ 請先訪問 <a href="https://e3p.nycu.edu.tw/" target="_blank" style="color: white; text-decoration: underline; font-weight: 600;">NYCU E3</a>，然後點擊上方的 <span class="highlight">🔄 同步</span> 按鈕。</p>
        <ul>
          <li>📝 載入作業和截止時間</li>
          <li>📚 載入課程列表</li>
          <li>📊 準備成績分析資料</li>
        </ul>
        <p>同步完成後，您就可以在<strong>任何網頁</strong>上使用小助手了！</p>
      `}
    </div>
  `;

  listContainer.innerHTML = welcomeHTML;
}

// 更新側欄內容
async function updateSidebarContent() {
  const listContainer = document.querySelector('.e3-helper-assignment-list');
  if (!listContainer) return;

  // 檢查是否是首次使用
  const storage = await chrome.storage.local.get(['lastSyncTime', 'assignments']);
  const hasNeverSynced = !storage.lastSyncTime;
  const hasNoAssignments = !storage.assignments || storage.assignments.length === 0;

  // 如果從未同步過，顯示歡迎訊息
  if (hasNeverSynced && hasNoAssignments) {
    showWelcomeMessage();
    return;
  }

  if (allAssignments.length === 0) {
    listContainer.innerHTML = '<div class="e3-helper-no-assignments">暫無作業</div>';
    return;
  }

  // 過濾並排序作業
  const now = new Date().getTime();
  const filteredAssignments = allAssignments.filter(assignment => {
    // 隱藏已繳交且過期的作業
    const isSubmitted = assignment.manualStatus === 'submitted';
    const isOverdue = assignment.deadline < now;

    // 如果同時是已繳交和過期，則隱藏
    if (isSubmitted && isOverdue) {
      return false;
    }

    return true;
  });

  // 按截止時間排序
  const sortedAssignments = [...filteredAssignments].sort((a, b) => a.deadline - b.deadline);

  if (sortedAssignments.length === 0) {
    listContainer.innerHTML = '<div class="e3-helper-no-assignments">暫無作業</div>';
    return;
  }

  listContainer.innerHTML = sortedAssignments.map(assignment => {
    const countdown = formatCountdown(assignment.deadline);
    const deadlineDate = new Date(assignment.deadline);
    const dateStr = `${deadlineDate.getMonth() + 1}月${deadlineDate.getDate()}日 ${deadlineDate.getHours().toString().padStart(2, '0')}:${deadlineDate.getMinutes().toString().padStart(2, '0')}`;

    // 使用手動標記的狀態
    const manualStatus = assignment.manualStatus || 'pending';

    // 決定樣式類別
    let statusClass = countdown.status;
    if (manualStatus === 'submitted') {
      statusClass = 'completed';
    }

    // 狀態切換按鈕
    let statusToggleText = '標記為已繳交';
    let statusToggleClass = '';
    if (manualStatus === 'submitted') {
      statusToggleText = '✓ 已繳交';
      statusToggleClass = 'submitted';
    }

    const hasValidUrl = assignment.url && assignment.url !== '#' && assignment.url.startsWith('http');

    return `
      <a href="${hasValidUrl ? assignment.url : 'javascript:void(0);'}" target="${hasValidUrl ? '_blank' : '_self'}" class="e3-helper-assignment-item ${statusClass}" data-event-id="${assignment.eventId}" ${!hasValidUrl ? 'data-need-fetch="true"' : ''} style="display: block; text-decoration: none; color: inherit; cursor: pointer;">
        <div class="e3-helper-assignment-name">${assignment.name}</div>
        <div class="e3-helper-assignment-course">${assignment.course || '(未知課程)'}</div>
        <div class="e3-helper-assignment-deadline">
          📅 ${dateStr}
          <span class="e3-helper-status-toggle ${statusToggleClass}" data-event-id="${assignment.eventId}" onclick="event.preventDefault(); event.stopPropagation();">${statusToggleText}</span>
        </div>
        <div class="e3-helper-assignment-countdown ${countdown.status}">⏰ ${countdown.text}</div>
      </a>
    `;
  }).join('');

  // 為需要獲取 URL 的作業添加點擊事件
  listContainer.querySelectorAll('.e3-helper-assignment-item[data-need-fetch="true"]').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const eventId = link.dataset.eventId;

      // 檢查是否在 E3 網站上
      if (!isOnE3Site()) {
        // 在非 E3 網站上，直接前往 E3 首頁
        window.open('https://e3p.nycu.edu.tw/my/', '_blank');
        return;
      }

      const nameEl = link.querySelector('.e3-helper-assignment-name');
      const originalText = nameEl.textContent;

      try {
        // 顯示 loading
        nameEl.textContent = '載入中...';
        link.style.opacity = '0.6';

        // 使用 API 獲取 URL
        const eventDetails = await getEventDetails(eventId);
        if (eventDetails && eventDetails.url) {
          // 更新作業的 URL
          const assignment = allAssignments.find(a => a.eventId === eventId);
          if (assignment) {
            assignment.url = eventDetails.url;
            await saveAssignments(); // 保存更新後的作業列表
          }
          window.open(eventDetails.url, '_blank');
        } else {
          alert('無法獲取作業連結，請稍後再試或直接訪問 E3');
        }
      } catch (error) {
        console.error('E3 Helper: 獲取作業連結失敗', error);
        alert('無法獲取作業連結：' + error.message);
      } finally {
        // 恢復原始文字和樣式
        nameEl.textContent = originalText;
        link.style.opacity = '1';
      }
    });
  });

  // 為狀態切換按鈕添加點擊事件
  listContainer.querySelectorAll('.e3-helper-status-toggle').forEach(toggle => {
    toggle.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const eventId = e.target.dataset.eventId;
      await toggleAssignmentStatus(eventId);
    });
  });
}

// 更新所有倒數時間
function updateCountdowns() {
  const items = document.querySelectorAll('.e3-helper-assignment-item');

  items.forEach(item => {
    const eventId = item.dataset.eventId;
    const assignment = allAssignments.find(a => a.eventId === eventId);

    if (assignment) {
      const countdown = formatCountdown(assignment.deadline);
      const countdownEl = item.querySelector('.e3-helper-assignment-countdown');

      if (countdownEl) {
        countdownEl.textContent = `⏰ ${countdown.text}`;
        countdownEl.className = `e3-helper-assignment-countdown ${countdown.status}`;
      }

      // 更新項目樣式
      item.className = `e3-helper-assignment-item ${countdown.status}`;
    }
  });
}

// 獲取 sesskey
function getSesskey() {
  let sesskey = '';
  if (typeof M !== 'undefined' && M.cfg && M.cfg.sesskey) {
    sesskey = M.cfg.sesskey;
  } else {
    // 從頁面中查找 sesskey
    const sesskeyInput = document.querySelector('input[name="sesskey"]');
    if (sesskeyInput) {
      sesskey = sesskeyInput.value;
    } else {
      // 從任何 URL 中提取 sesskey（例如從連結中）
      const linkWithSesskey = document.querySelector('a[href*="sesskey="]');
      if (linkWithSesskey) {
        const match = linkWithSesskey.href.match(/sesskey=([^&]+)/);
        if (match) {
          sesskey = match[1];
        }
      }
    }
  }
  return sesskey;
}

// 通過 Moodle API 獲取事件詳情
async function getEventDetails(eventId) {
  try {
    const sesskey = getSesskey();
    console.log(`E3 Helper: 嘗試調用 API 獲取事件 ${eventId} 的詳情，sesskey: ${sesskey ? '已取得 (' + sesskey + ')' : '未找到'}`);

    // 嘗試從 Moodle 的 REST API 獲取事件詳情
    const url = `https://e3p.nycu.edu.tw/lib/ajax/service.php${sesskey ? '?sesskey=' + sesskey : ''}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        index: 0,
        methodname: 'core_calendar_get_calendar_event_by_id',
        args: { eventid: parseInt(eventId) }
      }])
    });

    console.log('E3 Helper: API 回應狀態:', response.status);
    const data = await response.json();
    console.log('E3 Helper: API 回應資料:', data);

    if (data && data[0] && data[0].data && data[0].data.event) {
      const event = data[0].data.event;
      const assignUrl = event.url || event.action?.url;
      console.log('E3 Helper: 找到作業 URL:', assignUrl);

      // 返回包含 URL 和其他資訊的物件
      return {
        url: assignUrl,
        instance: event.instance, // 這是真正的 assignment ID
        course: event.course,
        modulename: event.modulename
      };
    }
  } catch (e) {
    console.error('E3 Helper: 無法通過 API 獲取事件詳情:', e);
  }
  return null;
}

// 注意：NYCU E3 沒有啟用作業提交狀態的 API，因此移除了自動檢查功能
// 改為使用手動標記的方式來追蹤作業狀態

// ==================== 成績分析功能 ====================

// 載入課程列表
async function loadCourseList() {
  const select = document.getElementById('e3-helper-course-select');
  const statsContainer = document.querySelector('.e3-helper-grade-stats');

  if (!select) return;

  statsContainer.innerHTML = '<div class="e3-helper-loading">載入課程中...</div>';

  try {
    const sesskey = getSesskey();
    const url = `https://e3p.nycu.edu.tw/lib/ajax/service.php${sesskey ? '?sesskey=' + sesskey : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        index: 0,
        methodname: 'core_course_get_enrolled_courses_by_timeline_classification',
        args: {
          offset: 0,
          limit: 0,
          classification: 'inprogress',
          sort: 'fullname'
        }
      }])
    });

    const data = await response.json();
    console.log('E3 Helper: 課程列表回應:', data);

    if (data && data[0] && data[0].data && data[0].data.courses) {
      allCourses = data[0].data.courses;

      // 清空並重新填充選單
      select.innerHTML = '<option value="">選擇課程...</option>';
      allCourses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.fullname;
        select.appendChild(option);
      });

      // 綁定選擇事件
      select.addEventListener('change', (e) => {
        const courseId = e.target.value;
        if (courseId) {
          loadCourseGrades(courseId);
        } else {
          statsContainer.innerHTML = '<div class="e3-helper-loading">請選擇課程</div>';
        }
      });

      statsContainer.innerHTML = '<div class="e3-helper-loading">請選擇課程</div>';
      console.log(`E3 Helper: 已載入 ${allCourses.length} 個課程`);
    } else {
      statsContainer.innerHTML = '<div class="e3-helper-loading">無法載入課程列表</div>';
    }
  } catch (e) {
    console.error('E3 Helper: 載入課程列表失敗:', e);
    statsContainer.innerHTML = '<div class="e3-helper-loading">載入失敗</div>';
  }
}

// 載入課程成績
async function loadCourseGrades(courseId) {
  const statsContainer = document.querySelector('.e3-helper-grade-stats');
  statsContainer.innerHTML = '<div class="e3-helper-loading">載入成績中...</div>';

  try {
    // 構建成績頁面URL（會自動顯示當前登入用戶的成績）
    const gradeUrl = `https://e3p.nycu.edu.tw/local/courseextension/grade/report/user/index.php?id=${courseId}`;

    console.log(`E3 Helper: 正在載入課程 ${courseId} 的成績頁面: ${gradeUrl}`);

    // 抓取成績頁面
    const response = await fetch(gradeUrl);
    const html = await response.text();

    console.log('E3 Helper: 成績頁面載入完成，狀態:', response.status);

    // 解析HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 嘗試多種方式尋找成績表格
    let gradeTable = doc.querySelector('.generaltable.user-grade');

    if (!gradeTable) {
      // 嘗試其他選擇器
      gradeTable = doc.querySelector('table.generaltable');
      console.log('E3 Helper: 使用備用選擇器找到表格:', !!gradeTable);
    }

    if (!gradeTable) {
      // 列出所有表格供除錯
      const allTables = doc.querySelectorAll('table');
      console.log('E3 Helper: 頁面中所有表格:', allTables.length);
      allTables.forEach((table, idx) => {
        console.log(`  表格 ${idx}:`, table.className, table.id);
      });
      statsContainer.innerHTML = '<div class="e3-helper-loading">找不到成績表格，請查看 Console</div>';
      return;
    }

    console.log('E3 Helper: 找到成績表格');
    console.log('E3 Helper: 表格 HTML (前 500 字元):', gradeTable.outerHTML.substring(0, 500));

    // 解析成績資料
    const grades = parseGradeTable(gradeTable);
    console.log('E3 Helper: 解析成績:', grades);

    // 檢查是否有成績資料
    if (grades.items.length === 0 || grades.totalWeight === 0) {
      statsContainer.innerHTML = `
        <div class="e3-helper-loading">
          此課程尚未設定成績項目<br>
          或您沒有權限查看成績
        </div>
      `;
      return;
    }

    // 計算統計資料
    const stats = calculateGradeStats(grades);
    console.log('E3 Helper: 統計資料:', stats);

    // 顯示統計結果
    displayGradeStats(stats, grades);

  } catch (e) {
    console.error('E3 Helper: 載入成績失敗:', e);
    statsContainer.innerHTML = `
      <div class="e3-helper-loading">
        載入成績失敗<br>
        <small style="color: #999;">${e.message}</small>
      </div>
    `;
  }
}

// 解析成績表格
function parseGradeTable(table) {
  const rows = table.querySelectorAll('tr');
  const grades = [];
  let totalWeight = 0;
  let earnedPoints = 0;
  let evaluatedWeight = 0;

  console.log(`E3 Helper: 解析表格，共 ${rows.length} 列`);

  rows.forEach((row, rowIdx) => {
    const cells = row.querySelectorAll('th, td');

    // 除錯：顯示每一列的內容
    if (rowIdx < 5) {
      const cellTexts = Array.from(cells).map(c => c.textContent.trim());
      console.log(`  第 ${rowIdx} 列 (${cells.length} 格):`, cellTexts);
    }

    if (cells.length < 3) return;

    const itemName = cells[0]?.textContent.trim();
    const weightText = cells[1]?.textContent.trim();
    const scoreText = cells[2]?.textContent.trim();

    // 跳過標題列和摘要列
    if (!itemName || itemName === '評分項目' || itemName === '依配分計算後得分' ||
        itemName === '全班微調後分數' || itemName === '個人微調分數' || itemName === '課程總分') {
      console.log(`  跳過: ${itemName}`);
      return;
    }

    // 解析權重（例如："5.00 %"）
    const weightMatch = weightText.match(/([\d.]+)\s*%/);
    const weight = weightMatch ? parseFloat(weightMatch[1]) : 0;

    // 解析分數（例如："100.00" 或 "-"）
    let score = null;
    if (scoreText && scoreText !== '-' && scoreText !== '') {
      const scoreMatch = scoreText.match(/([\d.]+)/);
      if (scoreMatch) {
        score = parseFloat(scoreMatch[1]);
      }
    }

    console.log(`  項目: ${itemName}, 權重: ${weight}%, 分數: ${score}`);

    if (weight > 0) {
      totalWeight += weight;

      if (score !== null) {
        // 已評分項目
        earnedPoints += (score / 100) * weight;
        evaluatedWeight += weight;
      }

      grades.push({
        name: itemName,
        weight: weight,
        score: score,
        evaluated: score !== null
      });
    }
  });

  console.log(`E3 Helper: 解析完成 - 總配分: ${totalWeight}%, 已評分: ${evaluatedWeight}%, 獲得分數: ${earnedPoints}`);

  return {
    items: grades,
    totalWeight,
    earnedPoints,
    evaluatedWeight
  };
}

// 計算統計資料
function calculateGradeStats(grades) {
  const { totalWeight, earnedPoints, evaluatedWeight } = grades;
  const unevaluatedWeight = totalWeight - evaluatedWeight;

  // 當前表現（基於已評分項目）
  const currentPerformance = evaluatedWeight > 0 ? (earnedPoints / evaluatedWeight) * 100 : 0;

  // 樂觀預估（剩餘全滿分）
  const optimisticScore = totalWeight > 0 ? ((earnedPoints + unevaluatedWeight) / totalWeight) * 100 : 0;

  // 保守預估（剩餘全0分）
  const pessimisticScore = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : 0;

  // 評分進度
  const progress = totalWeight > 0 ? (evaluatedWeight / totalWeight) * 100 : 0;

  return {
    totalWeight,
    evaluatedWeight,
    unevaluatedWeight,
    earnedPoints,
    currentPerformance,
    optimisticScore,
    pessimisticScore,
    progress
  };
}

// 顯示統計結果
function displayGradeStats(stats, grades) {
  const statsContainer = document.querySelector('.e3-helper-grade-stats');

  // 如果還沒有任何評分項目
  if (stats.evaluatedWeight === 0 || !grades || grades.items.length === 0) {
    statsContainer.innerHTML = `
      <div class="e3-helper-no-assignments">
        目前尚無任何評分項目<br>
        <small style="color: #999; margin-top: 8px; display: block;">等待老師評分後即可查看</small>
      </div>
    `;
    return;
  }

  // 顯示摘要卡片
  const summaryHTML = `
    <div style="padding: 12px; border-bottom: 1px solid #e9ecef; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div style="display: flex; justify-content: space-around; color: white;">
        <div style="text-align: center;">
          <div style="font-size: 11px; opacity: 0.9;">評分進度</div>
          <div style="font-size: 18px; font-weight: 600;">${stats.progress.toFixed(0)}%</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 11px; opacity: 0.9;">當前表現</div>
          <div style="font-size: 18px; font-weight: 600;">${stats.currentPerformance.toFixed(1)}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 11px; opacity: 0.9;">樂觀預估</div>
          <div style="font-size: 18px; font-weight: 600;">${stats.optimisticScore.toFixed(1)}</div>
        </div>
      </div>
    </div>
  `;

  // 顯示成績項目列表
  const itemsHTML = grades.items.map(item => {
    const statusClass = item.evaluated ? 'completed' : 'warning';
    const scoreDisplay = item.evaluated ? `${item.score.toFixed(0)} 分` : '尚未評分';
    const scoreColor = item.evaluated ? '#51cf66' : '#ffa500';

    return `
      <div class="e3-helper-assignment-item ${statusClass}">
        <div class="e3-helper-assignment-name">${item.name}</div>
        <div class="e3-helper-assignment-deadline">
          📊 配分: ${item.weight.toFixed(0)}%
          <span style="margin-left: 12px; color: ${scoreColor}; font-weight: 600;">${scoreDisplay}</span>
        </div>
      </div>
    `;
  }).join('');

  statsContainer.innerHTML = summaryHTML + '<div class="e3-helper-assignment-list">' + itemsHTML + '</div>';
}

// 載入所有課程的成績
async function loadAllCourseGrades(forceRefresh = false) {
  const statsContainer = document.querySelector('.e3-helper-grade-stats');
  statsContainer.innerHTML = '<div class="e3-helper-loading">載入課程成績中...</div>';

  const isOnE3 = window.location.hostname.includes('e3.nycu.edu.tw') || window.location.hostname.includes('e3p.nycu.edu.tw');

  try {
    // 先嘗試從 storage 載入
    if (!forceRefresh) {
      const storage = await chrome.storage.local.get(['gradeData', 'courses']);
      if (storage.gradeData && Object.keys(storage.gradeData).length > 0) {
        console.log('E3 Helper: 從 storage 載入成績資料');
        gradeData = storage.gradeData;
        if (storage.courses) {
          allCourses = storage.courses;
        }
        displayCourseGradeList();
        return;
      }
    }

    // 如果不在 E3 網站上，不能載入（會有 CORS 問題）
    if (!isOnE3) {
      console.warn('E3 Helper: 不在 E3 網站上，無法載入成績資料');
      displayCourseGradeList(); // 會顯示適當的提示訊息
      return;
    }

    // 確保已載入課程列表
    if (allCourses.length === 0) {
      const storage = await chrome.storage.local.get(['courses']);
      if (storage.courses && storage.courses.length > 0) {
        allCourses = storage.courses;
      } else {
        // 如果不在 E3 網站上，無法載入課程列表
        if (!window.location.hostname.includes('e3.nycu.edu.tw') && !window.location.hostname.includes('e3p.nycu.edu.tw')) {
          statsContainer.innerHTML = `
            <div class="e3-helper-no-assignments">
              無法載入成績資料<br>
              <small style="color: #999; margin-top: 8px; display: block;">請先訪問 E3 或點擊同步按鈕</small>
            </div>
          `;
          return;
        }

        // 在 E3 網站上，嘗試載入課程列表
        const sesskey = getSesskey();
        const url = `https://e3p.nycu.edu.tw/lib/ajax/service.php${sesskey ? '?sesskey=' + sesskey : ''}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{
            index: 0,
            methodname: 'core_course_get_enrolled_courses_by_timeline_classification',
            args: {
              offset: 0,
              limit: 0,
              classification: 'inprogress',
              sort: 'fullname'
            }
          }])
        });

        const data = await response.json();
        if (data && data[0] && data[0].data && data[0].data.courses) {
          allCourses = data[0].data.courses;
        }
      }
    }

    if (allCourses.length === 0) {
      statsContainer.innerHTML = `
        <div class="e3-helper-no-assignments">
          無法載入課程列表<br>
          <small style="color: #999; margin-top: 8px; display: block;">請訪問 E3 並點擊同步按鈕</small>
        </div>
      `;
      return;
    }

    console.log(`E3 Helper: 開始載入 ${allCourses.length} 個課程的成績`);

    // 清空舊資料
    gradeData = {};

    let loadedCount = 0;

    // 載入每個課程的成績
    for (const course of allCourses) {
      try {
        statsContainer.innerHTML = `<div class="e3-helper-loading">載入課程成績中... ${loadedCount + 1}/${allCourses.length}<br><small style="color: #999; margin-top: 8px; display: block;">${course.fullname}</small></div>`;

        // 構建成績頁面URL
        const gradeUrl = `https://e3p.nycu.edu.tw/local/courseextension/grade/report/user/index.php?id=${course.id}`;

        // 抓取成績頁面
        const response = await fetch(gradeUrl);
        const html = await response.text();

        // 解析HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 尋找成績表格
        let gradeTable = doc.querySelector('.generaltable.user-grade');
        if (!gradeTable) {
          gradeTable = doc.querySelector('table.generaltable');
        }

        if (gradeTable) {
          // 解析成績資料
          const grades = parseGradeTable(gradeTable);

          // 只儲存有成績資料的課程
          if (grades.items.length > 0 && grades.totalWeight > 0) {
            const stats = calculateGradeStats(grades);
            gradeData[course.id] = {
              course: course,
              grades: grades,
              stats: stats
            };
          }
        }

        loadedCount++;

        // 延遲避免請求過於頻繁
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (e) {
        console.error(`E3 Helper: 載入課程 ${course.fullname} 成績時發生錯誤:`, e);
      }
    }

    console.log(`E3 Helper: 成績載入完成，共 ${Object.keys(gradeData).length} 個課程有成績資料`);

    // 儲存成績資料到 storage
    await chrome.storage.local.set({ gradeData: gradeData });
    console.log('E3 Helper: 成績資料已儲存到 storage');

    // 顯示課程列表
    displayCourseGradeList();

  } catch (e) {
    console.error('E3 Helper: 載入課程成績失敗:', e);
    statsContainer.innerHTML = `
      <div class="e3-helper-loading">
        載入失敗<br>
        <small style="color: #999;">${e.message}</small>
      </div>
    `;
  }
}

// 顯示課程成績列表
async function displayCourseGradeList() {
  const statsContainer = document.querySelector('.e3-helper-grade-stats');

  const courseIds = Object.keys(gradeData);

  console.log('E3 Helper: displayCourseGradeList 被調用', {
    courseIdsLength: courseIds.length,
    gradeData: gradeData,
    courseIds: courseIds,
    allCoursesLength: allCourses.length
  });

  if (courseIds.length === 0) {
    console.warn('E3 Helper: gradeData 是空的');

    // 檢查是否有課程資料
    const storage = await chrome.storage.local.get(['courses']);
    const hasCourses = (storage.courses && storage.courses.length > 0) || allCourses.length > 0;
    const isOnE3 = window.location.hostname.includes('e3.nycu.edu.tw') || window.location.hostname.includes('e3p.nycu.edu.tw');

    if (hasCourses) {
      // 有課程但沒有成績資料，提示用戶載入成績
      statsContainer.innerHTML = `
        <div class="e3-helper-welcome-message">
          <h3>📊 成績資料尚未載入</h3>
          ${isOnE3 ? `
            <p>您已同步課程列表，但還沒有載入成績資料。</p>
            <p>點擊下方的按鈕開始載入成績：</p>
            <button id="e3-helper-load-grades-now" style="width: 100%; margin-top: 12px; padding: 10px; font-size: 14px; background: white; color: #667eea; border: 2px solid white; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;">
              🔄 載入成績資料
            </button>
            <p style="margin-top: 12px; font-size: 12px; opacity: 0.9;">
              ⏱️ 載入時間約 1-2 分鐘，請耐心等待
            </p>
          ` : `
            <p>您已同步課程列表，但還沒有載入成績資料。</p>
            <p>請訪問 <a href="https://e3p.nycu.edu.tw/" target="_blank" style="color: white; text-decoration: underline; font-weight: 600;">NYCU E3</a>，然後在成績分析頁面點擊「載入成績資料」按鈕。</p>
            <p style="margin-top: 12px; font-size: 12px; opacity: 0.9;">
              ⏱️ 載入成績需要在 E3 網站上進行
            </p>
          `}
        </div>
      `;

      // 如果在 E3 網站上，綁定載入按鈕
      if (isOnE3) {
        const loadBtn = document.getElementById('e3-helper-load-grades-now');
        if (loadBtn) {
          // 添加 hover 效果
          loadBtn.addEventListener('mouseenter', () => {
            if (!loadBtn.disabled) {
              loadBtn.style.background = 'rgba(255,255,255,0.9)';
              loadBtn.style.transform = 'translateY(-2px)';
              loadBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            }
          });
          loadBtn.addEventListener('mouseleave', () => {
            if (!loadBtn.disabled) {
              loadBtn.style.background = 'white';
              loadBtn.style.transform = 'translateY(0)';
              loadBtn.style.boxShadow = 'none';
            }
          });

          // 綁定點擊事件
          loadBtn.addEventListener('click', () => {
            loadBtn.disabled = true;
            loadBtn.style.opacity = '0.7';
            loadBtn.style.cursor = 'not-allowed';
            loadBtn.textContent = '⏳ 載入中...';
            loadAllCourseGrades(true).then(() => {
              // 載入完成
            }).catch((e) => {
              console.error('E3 Helper: 載入成績失敗', e);
              loadBtn.disabled = false;
              loadBtn.style.opacity = '1';
              loadBtn.style.cursor = 'pointer';
              loadBtn.textContent = '🔄 載入成績資料';
              alert('載入成績失敗：' + e.message);
            });
          });
        }
      }
    } else {
      // 沒有課程資料，提示用戶先同步
      statsContainer.innerHTML = `
        <div class="e3-helper-no-assignments">
          目前沒有課程有成績資料<br>
          <small style="color: #999; margin-top: 8px; display: block;">請先同步課程資料，或等待老師評分</small>
        </div>
      `;
    }
    return;
  }

  // 添加刷新按鈕
  const refreshBtnHTML = `
    <div style="padding: 12px; border-bottom: 1px solid #e9ecef; background: #f8f9fa;">
      <button class="e3-helper-download-btn secondary" id="e3-helper-refresh-grades" style="width: 100%; padding: 6px;">
        🔄 重新載入成績
      </button>
    </div>
  `;

  // 顯示課程列表（類似作業列表）
  const listHTML = courseIds.map(courseId => {
    const data = gradeData[courseId];
    const { course, stats } = data;

    // 決定樣式
    let statusClass = 'normal';
    if (stats.progress >= 80) {
      statusClass = 'completed'; // 綠色，評分進度高
    } else if (stats.progress < 30) {
      statusClass = 'warning'; // 橘色，評分進度低
    }

    return `
      <div class="e3-helper-assignment-item ${statusClass}" data-course-id="${courseId}">
        <div class="e3-helper-assignment-name">${course.fullname}</div>
        <div class="e3-helper-assignment-deadline">
          📊 評分進度: ${stats.progress.toFixed(0)}%
          <span style="margin-left: 12px;">當前表現: <span style="color: #667eea; font-weight: 600;">${stats.currentPerformance.toFixed(1)}</span></span>
        </div>
        <button class="e3-helper-status-toggle" data-course-id="${courseId}">查看評分細節</button>
      </div>
    `;
  }).join('');

  statsContainer.innerHTML = refreshBtnHTML + `<div class="e3-helper-assignment-list">${listHTML}</div>`;

  // 綁定刷新按鈕事件
  const refreshBtn = document.getElementById('e3-helper-refresh-grades');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '載入中...';
      await loadAllCourseGrades(true); // 強制刷新
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄 重新載入成績';
    });
  }

  // 綁定查看細節按鈕事件
  statsContainer.querySelectorAll('.e3-helper-status-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const courseId = e.target.dataset.courseId;
      showCourseGradeDetails(courseId);
    });
  });
}

// 顯示課程成績詳細資訊
function showCourseGradeDetails(courseId) {
  const data = gradeData[courseId];
  if (!data) return;

  const { course, grades, stats } = data;
  const statsContainer = document.querySelector('.e3-helper-grade-stats');

  // 顯示摘要卡片
  const summaryHTML = `
    <div style="padding: 12px; border-bottom: 1px solid #e9ecef; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="color: white; font-size: 14px; font-weight: 600;">${course.fullname}</div>
        <button id="e3-helper-back-to-list" style="background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">← 返回列表</button>
      </div>
      <div style="display: flex; justify-content: space-around; color: white;">
        <div style="text-align: center;">
          <div style="font-size: 11px; opacity: 0.9;">評分進度</div>
          <div style="font-size: 18px; font-weight: 600;">${stats.progress.toFixed(0)}%</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 11px; opacity: 0.9;">當前表現</div>
          <div style="font-size: 18px; font-weight: 600;">${stats.currentPerformance.toFixed(1)}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 11px; opacity: 0.9;">樂觀預估</div>
          <div style="font-size: 18px; font-weight: 600;">${stats.optimisticScore.toFixed(1)}</div>
        </div>
      </div>
    </div>
  `;

  // 顯示成績項目列表
  const itemsHTML = grades.items.map(item => {
    const statusClass = item.evaluated ? 'completed' : 'warning';
    const scoreDisplay = item.evaluated ? `${item.score.toFixed(0)} 分` : '尚未評分';
    const scoreColor = item.evaluated ? '#51cf66' : '#ffa500';

    return `
      <div class="e3-helper-assignment-item ${statusClass}">
        <div class="e3-helper-assignment-name">${item.name}</div>
        <div class="e3-helper-assignment-deadline">
          📊 配分: ${item.weight.toFixed(0)}%
          <span style="margin-left: 12px; color: ${scoreColor}; font-weight: 600;">${scoreDisplay}</span>
        </div>
      </div>
    `;
  }).join('');

  statsContainer.innerHTML = summaryHTML + '<div class="e3-helper-assignment-list">' + itemsHTML + '</div>';

  // 綁定返回按鈕事件
  const backBtn = document.getElementById('e3-helper-back-to-list');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      displayCourseGradeList();
    });
  }
}

// ==================== 教材下載功能 ====================

// 載入課程選擇器
async function loadCourseSelector() {
  const courseListContainer = document.getElementById('e3-helper-course-list');
  if (!courseListContainer) return;

  courseListContainer.innerHTML = '<div class="e3-helper-loading">載入課程中...</div>';

  // 確保已載入課程列表
  if (allCourses.length === 0) {
    // 先從 storage 載入
    const storage = await chrome.storage.local.get(['courses']);
    if (storage.courses && storage.courses.length > 0) {
      allCourses = storage.courses;
      console.log(`E3 Helper: 從 storage 載入了 ${allCourses.length} 個課程`);
    } else if (window.location.hostname.includes('e3.nycu.edu.tw') || window.location.hostname.includes('e3p.nycu.edu.tw')) {
      // 只在 E3 網站上嘗試載入
      await loadCourseList();
    }
  }

  if (allCourses.length === 0) {
    courseListContainer.innerHTML = `
      <div class="e3-helper-loading">
        無法載入課程列表<br>
        <small style="color: #999; margin-top: 8px; display: block;">請訪問 E3 並點擊同步按鈕</small>
      </div>
    `;
    return;
  }

  // 顯示課程列表
  courseListContainer.innerHTML = allCourses.map(course => {
    const isSelected = selectedCourses.has(course.id);
    return `
      <div class="e3-helper-course-item" data-course-id="${course.id}">
        <input type="checkbox" class="e3-helper-course-checkbox" data-course-id="${course.id}" ${isSelected ? 'checked' : ''}>
        <span class="e3-helper-course-name">${course.fullname}</span>
      </div>
    `;
  }).join('');

  // 綁定勾選框事件
  courseListContainer.querySelectorAll('.e3-helper-course-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const courseId = parseInt(e.target.dataset.courseId);
      if (e.target.checked) {
        selectedCourses.add(courseId);
      } else {
        selectedCourses.delete(courseId);
      }
    });
  });

  // 綁定整個項目的點擊事件
  courseListContainer.querySelectorAll('.e3-helper-course-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('e3-helper-course-checkbox')) return;
      const checkbox = item.querySelector('.e3-helper-course-checkbox');
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });
  });
}

// ==================== 公告相關功能 ====================

// 檢查是否在 E3 網站
function isOnE3Site() {
  return window.location.hostname.includes('e3.nycu.edu.tw') ||
         window.location.hostname.includes('e3p.nycu.edu.tw');
}

// 載入所有課程的公告
async function loadAnnouncements() {
  console.log('E3 Helper: 開始載入公告...');

  const announcementList = document.querySelector('.e3-helper-content[data-content="announcements"] .e3-helper-assignment-list');
  if (!announcementList) return;

  announcementList.innerHTML = '<div class="e3-helper-loading">載入公告中...<br><small style="color: #999; margin-top: 8px; display: block;">正在從所有課程獲取公告</small></div>';

  // 檢查是否在 E3 網站
  if (!isOnE3Site()) {
    announcementList.innerHTML = `
      <div class="e3-helper-welcome-message">
        <h3>⚠️ 無法載入公告</h3>
        <p>請訪問 <a href="https://e3p.nycu.edu.tw/" target="_blank" style="color: white; text-decoration: underline; font-weight: 600;">NYCU E3</a> 來載入公告。</p>
      </div>
    `;
    return;
  }

  // 確保已載入課程列表
  if (allCourses.length === 0) {
    const storage = await chrome.storage.local.get(['courses']);
    if (storage.courses && storage.courses.length > 0) {
      allCourses = storage.courses;
    } else {
      await loadCourseList();
    }
  }

  if (allCourses.length === 0) {
    announcementList.innerHTML = `
      <div class="e3-helper-welcome-message">
        <h3>⚠️ 沒有課程資料</h3>
        <p>請先點擊上方的 <span class="highlight">🔄 同步</span> 按鈕來載入課程。</p>
      </div>
    `;
    return;
  }

  // 獲取所有課程的公告
  allAnnouncements = [];
  let processedCount = 0;

  for (const course of allCourses) {
    try {
      processedCount++;
      announcementList.innerHTML = `
        <div class="e3-helper-loading">
          載入公告中...<br>
          <small style="color: #999; margin-top: 8px; display: block;">
            進度: ${processedCount}/${allCourses.length}<br>
            正在處理: ${course.fullname.substring(0, 30)}...
          </small>
        </div>
      `;

      console.log(`E3 Helper: 載入課程 ${course.id} (${course.fullname}) 的公告...`);

      // 使用 Moodle API 獲取課程論壇/公告
      const announcements = await fetchCourseAnnouncements(course.id, course.fullname);

      if (announcements && announcements.length > 0) {
        allAnnouncements.push(...announcements);
        console.log(`E3 Helper: 課程 ${course.fullname} 找到 ${announcements.length} 個公告`);
      }

    } catch (error) {
      console.error(`E3 Helper: 載入課程 ${course.id} 公告時發生錯誤:`, error);
    }
  }

  // 按時間排序（最新的在前）
  allAnnouncements.sort((a, b) => b.timestamp - a.timestamp);

  // 儲存到 storage
  await chrome.storage.local.set({ announcements: allAnnouncements });

  console.log(`E3 Helper: 公告載入完成，共 ${allAnnouncements.length} 個`);
}

// 載入信件
async function loadMessages() {
  console.log('E3 Helper: 開始載入信件...');

  const announcementList = document.querySelector('.e3-helper-content[data-content="announcements"] .e3-helper-assignment-list');
  if (!announcementList) return;

  // 檢查是否在 E3 網站
  if (!isOnE3Site()) {
    console.log('E3 Helper: 不在 E3 網站，跳過信件載入');
    return;
  }

  try {
    // 從 dcpcmail 系統獲取信件列表
    // 先獲取所有課程的信箱
    if (allCourses.length === 0) {
      const storage = await chrome.storage.local.get(['courses']);
      if (storage.courses && storage.courses.length > 0) {
        allCourses = storage.courses;
      }
    }

    console.log(`E3 Helper: 準備從 ${allCourses.length} 個課程載入信件`);
    allMessages = [];

    for (const course of allCourses) {
      try {
        // 訪問課程的信箱頁面
        const mailboxUrl = `https://e3p.nycu.edu.tw/local/dcpcmail/view.php?c=${course.id}&t=inbox`;
        console.log(`E3 Helper: 正在載入課程 ${course.fullname} (ID: ${course.id}) 的信件...`);

        const response = await fetch(mailboxUrl, { credentials: 'include' });

        if (!response.ok) {
          console.log(`E3 Helper: 課程 ${course.id} 信件載入失敗 (HTTP ${response.status})`);
          continue;
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 查找信件列表
        const mailRows = doc.querySelectorAll('.mail_list .mail_item');

        if (!mailRows || mailRows.length === 0) {
          console.log(`E3 Helper: 課程 ${course.id} 未找到信件列表（可能是動態載入）`);

          // 嘗試查找所有可能的容器
          const possibleContainers = [
            doc.querySelectorAll('div[class*="mail"]'),
            doc.querySelectorAll('div[class*="message"]'),
            doc.querySelectorAll('div[class*="inbox"]'),
            doc.querySelectorAll('ul'),
            doc.querySelectorAll('div[data-region]'),
            doc.querySelectorAll('.list-group'),
            doc.querySelectorAll('[role="list"]')
          ];

          console.log(`E3 Helper: 嘗試查找其他容器:`, {
            'div[class*="mail"]': possibleContainers[0].length,
            'div[class*="message"]': possibleContainers[1].length,
            'div[class*="inbox"]': possibleContainers[2].length,
            'ul': possibleContainers[3].length,
            'div[data-region]': possibleContainers[4].length,
            '.list-group': possibleContainers[5].length,
            '[role="list"]': possibleContainers[6].length
          });

          // 檢查頁面中是否有空收件匣的訊息
          const emptyMessage = doc.body.textContent;
          if (emptyMessage.includes('沒有郵件') || emptyMessage.includes('無郵件') || emptyMessage.includes('No messages')) {
            console.log(`E3 Helper: 課程 ${course.id} 的收件匣是空的`);
          }

          // 輸出頁面 body 的實際內容（去除 head）
          const bodyContent = doc.body ? doc.body.innerHTML.substring(0, 3000) : '(無 body)';
          console.log(`E3 Helper: 頁面 body 內容前 3000 字元:`, bodyContent);
          continue;
        }

        console.log(`E3 Helper: 課程 ${course.id} 找到 ${mailRows.length} 個可能的信件項目`);
        let parsedCount = 0;

        mailRows.forEach((row, index) => {
          try {
            // 取得連結
            const link = row.querySelector('a.mail_link');
            if (!link) {
              if (index < 3) { // 只輸出前 3 個以避免過多 log
                console.log(`E3 Helper: 課程 ${course.id} 第 ${index} 個項目未找到 mail_link`);
                console.log(`E3 Helper: 項目 HTML:`, row.innerHTML.substring(0, 200));
              }
              return;
            }

            // 取得信件 ID
            const mailId = link.href.match(/m=(\d+)/)?.[1];
            if (!mailId) {
              console.log(`E3 Helper: 課程 ${course.id} 無法從 URL 提取信件 ID: ${link.href}`);
              return;
            }

            // 取得主旨
            const summaryEl = row.querySelector('.mail_summary');
            if (!summaryEl) return;

            const courseLabel = summaryEl.querySelector('.mail_label.mail_course')?.textContent || '';
            const fullText = summaryEl.textContent || '';
            const subject = fullText.replace(courseLabel, '').trim();

            // 取得寄件人
            const sender = row.querySelector('.mail_users')?.textContent.trim() || '未知';

            // 取得日期
            const dateEl = row.querySelector('.mail_date');
            const dateTitle = dateEl?.getAttribute('title') || '';
            let timestamp = Date.now();

            if (dateTitle) {
              // dateTitle 格式: "2025年11月13日,21:02"
              try {
                // 轉換為標準格式
                const dateMatch = dateTitle.match(/(\d{4})年(\d{1,2})月(\d{1,2})日,(\d{1,2}):(\d{2})/);
                if (dateMatch) {
                  const [_, year, month, day, hour, minute] = dateMatch;
                  timestamp = new Date(year, month - 1, day, hour, minute).getTime();
                }
              } catch (e) {
                console.warn(`E3 Helper: 無法解析日期 "${dateTitle}":`, e);
              }
            }

            // 檢查未讀狀態
            const isUnread = row.classList.contains('mail_unread');

            allMessages.push({
              id: `msg-${course.id}-${mailId}`,
              type: 'message',
              title: subject || '(無主旨)',
              courseName: course.fullname,
              author: sender,
              timestamp: timestamp,
              url: link.href,
              isRead: !isUnread
            });

            parsedCount++;
          } catch (err) {
            console.error('E3 Helper: 解析信件時發生錯誤:', err);
          }
        });

        console.log(`E3 Helper: 課程 ${course.id} 成功解析 ${parsedCount} 個信件`);
      } catch (error) {
        console.error(`E3 Helper: 載入課程 ${course.id} 信件時發生錯誤:`, error);
      }
    }

    // 按時間排序
    allMessages.sort((a, b) => b.timestamp - a.timestamp);

    // 儲存到 storage
    await chrome.storage.local.set({ messages: allMessages });
    console.log(`E3 Helper: 信件載入完成，共 ${allMessages.length} 個`);
  } catch (error) {
    console.error('E3 Helper: 載入信件時發生錯誤:', error);
  }
}

// 從課程獲取公告（透過解析課程頁面 HTML）
async function fetchCourseAnnouncements(courseId, courseName) {
  try {
    // 直接訪問課程頁面
    const courseUrl = `https://e3p.nycu.edu.tw/course/view.php?id=${courseId}`;

    const response = await fetch(courseUrl, {
      credentials: 'include'
    });

    if (!response.ok) {
      console.warn(`E3 Helper: 無法訪問課程 ${courseId} 頁面: HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const announcements = [];

    // 方法 1: 尋找公告論壇區域
    // 在 Moodle 中，公告通常在名為「公告」「News」「Announcements」的論壇中
    const forumLinks = doc.querySelectorAll('a[href*="/mod/forum/view.php"]');

    for (const link of forumLinks) {
      const forumName = link.textContent.trim();

      // 檢查是否為公告論壇
      if (forumName.includes('公告') ||
          forumName.includes('News') ||
          forumName.includes('Announcement') ||
          forumName.includes('announcement')) {

        // 提取論壇 ID
        const forumUrl = link.href;
        const forumIdMatch = forumUrl.match(/id=(\d+)/);

        if (forumIdMatch) {
          const forumId = parseInt(forumIdMatch[1]);
          console.log(`E3 Helper: 找到課程 ${courseName} 的公告論壇: ${forumName} (ID: ${forumId})`);

          // 獲取論壇中的討論串
          const forumAnnouncements = await fetchForumDiscussions(forumId, courseId, courseName, forumName);
          if (forumAnnouncements && forumAnnouncements.length > 0) {
            announcements.push(...forumAnnouncements);
          }
        }
      }
    }

    // 方法 2: 如果找不到公告論壇，嘗試從側邊欄的最新公告區域提取
    if (announcements.length === 0) {
      const latestNewsBlocks = doc.querySelectorAll('.block_news_items, [data-block="news_items"]');

      for (const block of latestNewsBlocks) {
        const newsLinks = block.querySelectorAll('a[href*="/mod/forum/discuss.php"]');

        for (const newsLink of newsLinks) {
          const discussionUrl = newsLink.href;
          const discussionIdMatch = discussionUrl.match(/d=(\d+)/);

          if (discussionIdMatch) {
            const discussionId = discussionIdMatch[1];
            const title = newsLink.textContent.trim();

            // 嘗試找到發布時間
            const timeElement = newsLink.closest('.post').querySelector('.time, .date, time');
            const timestamp = timeElement ? new Date(timeElement.textContent).getTime() : Date.now();

            announcements.push({
              id: `${courseId}-news-${discussionId}`,
              courseId: courseId,
              courseName: courseName,
              forumName: '公告',
              title: title,
              author: '未知',
              timestamp: timestamp,
              url: discussionUrl,
              isRead: false
            });
          }
        }
      }
    }

    if (announcements.length > 0) {
      console.log(`E3 Helper: 課程 ${courseName} 找到 ${announcements.length} 個公告`);
    }

    return announcements;

  } catch (error) {
    console.error(`E3 Helper: 獲取課程 ${courseId} 公告時發生錯誤:`, error);
    return [];
  }
}

// 獲取論壇討論串（公告）- 透過解析論壇頁面 HTML
async function fetchForumDiscussions(forumId, courseId, courseName, forumName) {
  try {
    // 直接訪問論壇頁面
    const forumUrl = `https://e3p.nycu.edu.tw/mod/forum/view.php?id=${forumId}`;

    const response = await fetch(forumUrl, {
      credentials: 'include'
    });

    if (!response.ok) {
      console.warn(`E3 Helper: 無法訪問論壇 ${forumId}: HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const announcements = [];

    // 尋找討論串列表
    // Moodle 論壇的討論串通常在 table 或 list 中
    const discussionLinks = doc.querySelectorAll('a[href*="/mod/forum/discuss.php"]');

    for (const link of discussionLinks) {
      const discussionUrl = link.href;
      const discussionIdMatch = discussionUrl.match(/d=(\d+)/);

      if (!discussionIdMatch) continue;

      const discussionId = discussionIdMatch[1];
      const title = link.textContent.trim();

      // 跳過空標題
      if (!title || title.length === 0) continue;

      // 尋找作者和時間資訊
      // 通常在同一行或父元素中
      const row = link.closest('tr, li, .discussionname, .discussion');
      let author = '未知';
      let timestamp = Date.now();

      if (row) {
        // 嘗試找到作者
        const authorElement = row.querySelector('.author, .username, [data-region="author"]');
        if (authorElement) {
          author = authorElement.textContent.trim();
        }

        // 嘗試找到時間
        const timeElement = row.querySelector('time, .time, .date, [data-timestamp]');
        if (timeElement) {
          // 優先使用 data-timestamp 屬性
          if (timeElement.dataset.timestamp) {
            timestamp = parseInt(timeElement.dataset.timestamp) * 1000;
          } else {
            // 嘗試解析文字內容
            const timeText = timeElement.textContent.trim();
            const parsedTime = new Date(timeText).getTime();
            if (!isNaN(parsedTime)) {
              timestamp = parsedTime;
            }
          }
        }
      }

      // 避免重複添加
      const announcementId = `${courseId}-${forumId}-${discussionId}`;
      if (!announcements.some(a => a.id === announcementId)) {
        announcements.push({
          id: announcementId,
          courseId: courseId,
          courseName: courseName,
          forumName: forumName,
          title: title,
          author: author,
          timestamp: timestamp,
          url: discussionUrl,
          isRead: false
        });
      }
    }

    // 限制最多 20 個公告
    if (announcements.length > 20) {
      // 按時間排序後取前 20 個
      announcements.sort((a, b) => b.timestamp - a.timestamp);
      return announcements.slice(0, 20);
    }

    return announcements;

  } catch (error) {
    console.error(`E3 Helper: 獲取論壇 ${forumId} 討論時發生錯誤:`, error);
    return [];
  }
}

// 顯示公告與信件列表
async function displayAnnouncements() {
  const announcementList = document.querySelector('.e3-helper-content[data-content="announcements"] .e3-helper-assignment-list');
  if (!announcementList) return;

  // 合併公告和信件，並標記類型
  const allItems = [
    ...allAnnouncements.map(a => ({ ...a, type: 'announcement' })),
    ...allMessages.map(m => ({ ...m, type: 'message' }))
  ];

  // 按時間排序
  allItems.sort((a, b) => b.timestamp - a.timestamp);

  if (allItems.length === 0) {
    announcementList.innerHTML = `
      <div class="e3-helper-welcome-message">
        <h3>📢 沒有找到公告或信件</h3>
        <p>目前沒有任何課程公告或系統信件。</p>
      </div>
    `;
    return;
  }

  // 載入已讀狀態
  const storage = await chrome.storage.local.get(['readAnnouncements', 'readMessages']);
  if (storage.readAnnouncements) {
    readAnnouncements = new Set(storage.readAnnouncements);
  }
  if (storage.readMessages) {
    readMessages = new Set(storage.readMessages);
  }

  // 顯示列表
  let currentFilter = 'all';
  let currentType = 'all'; // all, announcement, message

  const renderAnnouncementList = (filter = 'all', typeFilter = 'all') => {
    let filteredItems = allItems;

    // 類型篩選
    if (typeFilter === 'announcement') {
      filteredItems = filteredItems.filter(item => item.type === 'announcement');
    } else if (typeFilter === 'message') {
      filteredItems = filteredItems.filter(item => item.type === 'message');
    }

    // 已讀/未讀篩選
    if (filter === 'unread') {
      filteredItems = filteredItems.filter(item => {
        const readSet = item.type === 'announcement' ? readAnnouncements : readMessages;
        return !readSet.has(item.id);
      });
    } else if (filter === 'read') {
      filteredItems = filteredItems.filter(item => {
        const readSet = item.type === 'announcement' ? readAnnouncements : readMessages;
        return readSet.has(item.id);
      });
    }

    // 重新計算統計數量
    const totalAnnouncements = allAnnouncements.length;
    const totalMessages = allMessages.length;
    const unreadAnnouncements = allAnnouncements.filter(a => !readAnnouncements.has(a.id)).length;
    const unreadMessages = allMessages.filter(m => !readMessages.has(m.id)).length;
    const currentUnreadCount = unreadAnnouncements + unreadMessages;

    // 統計區域 HTML
    const statsHtml = `
      <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; margin-bottom: 12px; border: 1px solid #dee2e6;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div style="flex: 1;">
            <div style="font-size: 14px; color: #495057; font-weight: 600; margin-bottom: 6px;">
              📢 ${totalAnnouncements} 個公告 | 📨 ${totalMessages} 個信件
            </div>
            ${currentUnreadCount > 0 ? `<div><span style="background: #e74c3c; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block;">${currentUnreadCount} 未讀</span></div>` : ''}
          </div>
          <div style="display: flex; gap: 6px; flex-shrink: 0;">
            ${currentUnreadCount > 0 ? `<button id="e3-helper-mark-all-read" style="background: #51cf66; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;">✓ 全部已讀</button>` : ''}
            <button id="e3-helper-refresh-announcements" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;">
              🔄 重新載入
            </button>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
          <div style="font-size: 11px; color: #6c757d; padding: 5px 0; font-weight: 600;">類型：</div>
          <button class="e3-helper-type-btn ${typeFilter === 'all' ? 'active' : ''}" data-type="all" style="background: ${typeFilter === 'all' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e9ecef'}; color: ${typeFilter === 'all' ? 'white' : '#495057'}; border: none; padding: 5px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;">
            全部
          </button>
          <button class="e3-helper-type-btn ${typeFilter === 'announcement' ? 'active' : ''}" data-type="announcement" style="background: ${typeFilter === 'announcement' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e9ecef'}; color: ${typeFilter === 'announcement' ? 'white' : '#495057'}; border: none; padding: 5px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;">
            📢 公告
          </button>
          <button class="e3-helper-type-btn ${typeFilter === 'message' ? 'active' : ''}" data-type="message" style="background: ${typeFilter === 'message' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e9ecef'}; color: ${typeFilter === 'message' ? 'white' : '#495057'}; border: none; padding: 5px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;">
            📨 信件
          </button>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <div style="font-size: 11px; color: #6c757d; padding: 5px 0; font-weight: 600;">狀態：</div>
          <button class="e3-helper-filter-btn ${filter === 'all' ? 'active' : ''}" data-filter="all" style="background: ${filter === 'all' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e9ecef'}; color: ${filter === 'all' ? 'white' : '#495057'}; border: none; padding: 5px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;">
            全部
          </button>
          <button class="e3-helper-filter-btn ${filter === 'unread' ? 'active' : ''}" data-filter="unread" style="background: ${filter === 'unread' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e9ecef'}; color: ${filter === 'unread' ? 'white' : '#495057'}; border: none; padding: 5px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;">
            未讀
          </button>
          <button class="e3-helper-filter-btn ${filter === 'read' ? 'active' : ''}" data-filter="read" style="background: ${filter === 'read' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e9ecef'}; color: ${filter === 'read' ? 'white' : '#495057'}; border: none; padding: 5px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;">
            已讀
          </button>
        </div>
      </div>
    `;

    const announcementItems = filteredItems.map(item => {
      const readSet = item.type === 'announcement' ? readAnnouncements : readMessages;
      const isRead = readSet.has(item.id);
      const timeAgo = getTimeAgo(item.timestamp);
      const typeIcon = item.type === 'announcement' ? '📢' : '📨';
      const typeLabel = item.type === 'announcement' ? '公告' : '信件';

      return `
        <div class="e3-helper-announcement-item ${isRead ? 'read' : 'unread'}" data-item-id="${item.id}" data-item-type="${item.type}">
          <div class="e3-helper-announcement-title">
            ${isRead ? '' : '<span style="color: #e74c3c; margin-right: 4px; font-weight: bold;">●</span>'}${typeIcon} ${item.title}
          </div>
          <div class="e3-helper-announcement-meta">
            <span>${typeLabel}: ${item.courseName.substring(0, 30)}${item.courseName.length > 30 ? '...' : ''}</span>
            <span style="margin-left: 12px;">👤 ${item.author}</span>
            <span style="margin-left: 12px;">⏰ ${timeAgo}</span>
          </div>
          <button class="e3-helper-status-toggle" data-item-id="${item.id}" data-item-type="${item.type}">
            👁️ 查看內容
          </button>
        </div>
      `;
    }).join('');

    const listHtml = filteredItems.length > 0
      ? announcementItems
      : '<div class="e3-helper-loading">此篩選條件下沒有項目</div>';

    // 總是使用最新的統計 HTML
    announcementList.innerHTML = statsHtml + listHtml;

    // 重新綁定事件
    bindAnnouncementEvents(renderAnnouncementList);
  };

  renderAnnouncementList(currentFilter);
}

// 綁定公告相關事件
function bindAnnouncementEvents(renderCallback) {
  // 重新載入按鈕
  const refreshBtn = document.getElementById('e3-helper-refresh-announcements');
  if (refreshBtn && !refreshBtn.dataset.bound) {
    refreshBtn.dataset.bound = 'true';
    refreshBtn.addEventListener('click', async () => {
      await Promise.all([loadAnnouncements(), loadMessages()]);
      displayAnnouncements();
    });
  }

  // 全部已讀按鈕
  const markAllReadBtn = document.getElementById('e3-helper-mark-all-read');
  if (markAllReadBtn && !markAllReadBtn.dataset.bound) {
    markAllReadBtn.dataset.bound = 'true';
    markAllReadBtn.addEventListener('click', async () => {
      // 將所有公告和信件標記為已讀
      allAnnouncements.forEach(a => readAnnouncements.add(a.id));
      allMessages.forEach(m => readMessages.add(m.id));

      // 儲存到 storage
      await chrome.storage.local.set({
        readAnnouncements: Array.from(readAnnouncements),
        readMessages: Array.from(readMessages)
      });

      console.log(`E3 Helper: 已將所有公告和信件標記為已讀`);

      // 重新顯示
      displayAnnouncements();
    });
  }

  // 類型篩選按鈕
  document.querySelectorAll('.e3-helper-type-btn').forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        document.querySelectorAll('.e3-helper-type-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = '#e9ecef';
          b.style.color = '#495057';
        });
        btn.classList.add('active');
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        btn.style.color = 'white';

        // 重新渲染（保持當前的已讀/未讀篩選）
        const currentFilter = document.querySelector('.e3-helper-filter-btn.active')?.dataset.filter || 'all';
        renderCallback(currentFilter, btn.dataset.type);
      });
    }
  });

  // 狀態篩選按鈕
  document.querySelectorAll('.e3-helper-filter-btn').forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        // 更新按鈕樣式
        document.querySelectorAll('.e3-helper-filter-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = '#e9ecef';
          b.style.color = '#495057';
        });
        btn.classList.add('active');
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        btn.style.color = 'white';

        // 重新渲染（保持當前的類型篩選）
        const currentType = document.querySelector('.e3-helper-type-btn.active')?.dataset.type || 'all';
        renderCallback(btn.dataset.filter, currentType);
      });
    }
  });

  // 查看內容按鈕事件
  document.querySelectorAll('.e3-helper-status-toggle').forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const itemId = btn.dataset.itemId;
        const itemType = btn.dataset.itemType;
        showAnnouncementDetails(itemId, itemType);
      });
    }
  });
}

// 顯示公告/信件詳細內容
async function showAnnouncementDetails(itemId, itemType) {
  const announcementList = document.querySelector('.e3-helper-content[data-content="announcements"] .e3-helper-assignment-list');
  if (!announcementList) return;

  // 找到對應的項目
  const allItems = [
    ...allAnnouncements.map(a => ({ ...a, type: 'announcement' })),
    ...allMessages.map(m => ({ ...m, type: 'message' }))
  ];
  const item = allItems.find(i => i.id === itemId && i.type === itemType);
  if (!item) return;

  const typeIcon = item.type === 'announcement' ? '📢' : '📨';
  const typeLabel = item.type === 'announcement' ? '公告' : '信件';
  const readSet = item.type === 'announcement' ? readAnnouncements : readMessages;
  const isRead = readSet.has(item.id);

  // 顯示詳細頁面
  const detailHTML = `
    <div style="padding: 12px; border-bottom: 1px solid #e9ecef; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="color: white; font-size: 14px; font-weight: 600;">
          ${typeIcon} ${typeLabel}詳細內容
        </div>
        <button id="e3-helper-back-to-announcements" style="background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">
          ← 返回列表
        </button>
      </div>
      <div style="color: rgba(255,255,255,0.9); font-size: 12px;">
        ${item.courseName}
      </div>
    </div>
    <div style="padding: 12px;">
      <div style="margin-bottom: 12px;">
        <div style="font-size: 15px; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
          ${item.title}
        </div>
        <div style="font-size: 12px; color: #6c757d;">
          <span>👤 ${item.author}</span>
          <span style="margin-left: 12px;">⏰ ${new Date(item.timestamp).toLocaleString('zh-TW')}</span>
          ${!isRead ? '<span style="margin-left: 12px; color: #e74c3c;">● 未讀</span>' : ''}
        </div>
      </div>
      <div style="padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #667eea;">
        <div id="e3-helper-item-content" style="color: #495057; font-size: 13px; line-height: 1.6;">
          <div class="e3-helper-loading" style="text-align: center; padding: 40px;">載入中...</div>
        </div>
      </div>
      <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
        <button id="e3-helper-mark-status-btn" data-item-id="${item.id}" data-item-type="${item.type}" data-is-read="${isRead}" style="background: white; border: 1px solid #dee2e6; color: #495057; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s ease;">
          ${isRead ? '標為未讀' : '標為已讀'}
        </button>
        <a href="${item.url}" target="_blank" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; transition: all 0.2s ease;">
          🔗 開啟完整頁面
        </a>
      </div>
    </div>
  `;

  announcementList.innerHTML = detailHTML;

  // 綁定返回按鈕
  const backBtn = document.getElementById('e3-helper-back-to-announcements');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      displayAnnouncements();
    });
  }

  // 綁定標記狀態按鈕
  const markStatusBtn = document.getElementById('e3-helper-mark-status-btn');
  if (markStatusBtn) {
    markStatusBtn.addEventListener('click', async () => {
      const isCurrentlyRead = markStatusBtn.dataset.isRead === 'true';

      if (itemType === 'message') {
        if (isCurrentlyRead) {
          readMessages.delete(itemId);
        } else {
          readMessages.add(itemId);
        }
        await chrome.storage.local.set({ readMessages: Array.from(readMessages) });
      } else {
        if (isCurrentlyRead) {
          readAnnouncements.delete(itemId);
        } else {
          readAnnouncements.add(itemId);
        }
        await chrome.storage.local.set({ readAnnouncements: Array.from(readAnnouncements) });
      }

      // 更新按鈕文字和狀態
      markStatusBtn.dataset.isRead = (!isCurrentlyRead).toString();
      markStatusBtn.textContent = isCurrentlyRead ? '標為已讀' : '標為未讀';
    });
  }

  // 載入內容
  const contentContainer = document.getElementById('e3-helper-item-content');
  if (contentContainer) {
    await loadItemPreview(itemId, itemType, item.url, contentContainer);
  }

  // 標記為已讀（如果還沒讀過）
  if (!isRead) {
    if (itemType === 'message') {
      readMessages.add(itemId);
      await chrome.storage.local.set({ readMessages: Array.from(readMessages) });
    } else {
      readAnnouncements.add(itemId);
      await chrome.storage.local.set({ readAnnouncements: Array.from(readAnnouncements) });
    }
  }
}

// 載入公告/信件的詳細預覽
async function loadItemPreview(itemId, itemType, itemUrl, previewContainer) {
  try {
    console.log(`E3 Helper: 載入 ${itemType} 預覽，ID: ${itemId}`);

    // 檢查是否在 E3 網站
    if (!isOnE3Site()) {
      previewContainer.innerHTML = `
        <div style="text-align: center; color: #999;">
          請在 E3 網站上查看詳細內容
        </div>
      `;
      return;
    }

    const response = await fetch(itemUrl, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let content = '';
    let attachments = [];

    if (itemType === 'announcement') {
      // 解析公告內容
      // 查找第一個帖子的內容
      const postContent = doc.querySelector('.post-content-container, .posting, [data-region="post-content"]');
      if (postContent) {
        // 移除不必要的元素
        const clonedContent = postContent.cloneNode(true);
        clonedContent.querySelectorAll('.commands, .link-block-metadata, .forum-post-footer').forEach(el => el.remove());
        content = clonedContent.innerHTML || clonedContent.textContent;
      } else {
        // 備用方案：查找包含內容的容器
        const contentArea = doc.querySelector('.content, #region-main');
        if (contentArea) {
          content = contentArea.innerHTML;
        }
      }

      // 查找附件
      const attachmentLinks = doc.querySelectorAll('a[href*="/pluginfile.php"]');
      attachments = Array.from(attachmentLinks).map(link => ({
        name: link.textContent.trim() || '附件',
        url: link.href
      }));

    } else if (itemType === 'message') {
      // 解析信件內容
      // dcpcmail 的內容通常在 .mail_content 或類似的容器中
      const mailContent = doc.querySelector('.mail_content, .message-content, #mail_content');
      if (mailContent) {
        content = mailContent.innerHTML;
      } else {
        // 備用方案
        const mainContent = doc.querySelector('#region-main, .content');
        if (mainContent) {
          content = mainContent.innerHTML;
        }
      }

      // 查找附件
      const attachmentLinks = doc.querySelectorAll('a[href*="attachment"], a[href*="pluginfile"]');
      attachments = Array.from(attachmentLinks).map(link => ({
        name: link.textContent.trim() || '附件',
        url: link.href
      }));
    }

    // 清理內容：移除 script, style 等
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    tempDiv.querySelectorAll('script, style, iframe, form, button[type="submit"]').forEach(el => el.remove());

    // 限制圖片大小
    tempDiv.querySelectorAll('img').forEach(img => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
    });

    // 所有連結在新分頁開啟
    tempDiv.querySelectorAll('a').forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });

    content = tempDiv.innerHTML;

    // 如果內容為空，顯示提示
    if (!content || content.trim().length === 0) {
      content = '<div style="color: #999; text-align: center; padding: 20px;">無內容或需要開啟完整頁面查看</div>';
    }

    // 限制內容長度（避免太長）
    if (content.length > 5000) {
      content = content.substring(0, 5000) + '<div style="color: #999; margin-top: 12px; font-style: italic;">...內容過長，請開啟完整頁面查看</div>';
    }

    // 顯示內容和附件
    let html_output = `<div style="max-height: 400px; overflow-y: auto;">${content}</div>`;

    if (attachments.length > 0) {
      html_output += `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #dee2e6;">
          <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px; color: #6c757d;">📎 附件 (${attachments.length})</div>
          ${attachments.slice(0, 10).map(att => `
            <a href="${att.url}" target="_blank" style="display: block; color: #667eea; text-decoration: none; font-size: 12px; padding: 4px 0;">
              📄 ${att.name}
            </a>
          `).join('')}
          ${attachments.length > 10 ? '<div style="color: #999; font-size: 11px; margin-top: 4px;">...更多附件請開啟完整頁面查看</div>' : ''}
        </div>
      `;
    }

    previewContainer.innerHTML = html_output;

  } catch (error) {
    console.error('E3 Helper: 載入預覽失敗', error);
    previewContainer.innerHTML = `
      <div style="text-align: center; color: #e74c3c; padding: 20px;">
        載入失敗：${error.message}<br>
        <span style="font-size: 11px; color: #999; margin-top: 8px; display: block;">請點擊下方「開啟完整頁面」查看</span>
      </div>
    `;
  }
}

// 計算時間差
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);

  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  if (days < 7) return `${days} 天前`;
  if (weeks < 4) return `${weeks} 週前`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 掃描選中的課程
async function scanSelectedCourses() {
  const pdfListContainer = document.querySelector('.e3-helper-pdf-list');
  const downloadStatus = document.querySelector('.e3-helper-download-status');
  if (!pdfListContainer) return;

  allPDFs = [];
  selectedPDFs.clear();

  const selectedCourseList = allCourses.filter(c => selectedCourses.has(c.id));

  if (selectedCourseList.length === 0) {
    pdfListContainer.innerHTML = '<div class="e3-helper-loading">請選擇至少一個課程</div>';
    return;
  }

  pdfListContainer.innerHTML = '<div class="e3-helper-loading">正在掃描選中的課程...</div>';

  console.log(`E3 Helper: 開始掃描 ${selectedCourseList.length} 個選中的課程`);

  let scannedCourses = 0;
  let totalPDFs = 0;

  for (const course of selectedCourseList) {
    try {
      if (downloadStatus) {
        downloadStatus.textContent = `正在掃描課程 ${scannedCourses + 1}/${selectedCourseList.length}: ${course.fullname}`;
      }
      pdfListContainer.innerHTML = `<div class="e3-helper-loading">正在掃描課程 ${scannedCourses + 1}/${selectedCourseList.length}<br><small style="color: #999; margin-top: 8px; display: block;">${course.fullname}</small><br><small style="color: #667eea; margin-top: 4px; display: block;">已找到 ${totalPDFs} 個教材檔案</small></div>`;

      const coursePDFs = await scanCourseDeep(course.id, course.fullname);
      totalPDFs += coursePDFs.length;
      allPDFs.push(...coursePDFs);

      scannedCourses++;

      // 延遲避免請求過於頻繁
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (e) {
      console.error(`E3 Helper: 掃描課程 ${course.fullname} 時發生錯誤:`, e);
    }
  }

  console.log(`E3 Helper: 掃描完成，共找到 ${allPDFs.length} 個教材檔案`);

  if (downloadStatus) {
    downloadStatus.textContent = `掃描完成！共找到 ${allPDFs.length} 個教材檔案`;
  }

  // 更新顯示
  updatePDFList();

  // 綁定按鈕事件
  bindDownloadButtons();

  // 3秒後恢復狀態顯示
  setTimeout(() => {
    if (downloadStatus) {
      downloadStatus.textContent = `已選取 ${selectedPDFs.size} 個檔案`;
    }
  }, 3000);
}

// 掃描當前頁面中的教材檔案
async function scanCurrentPage() {
  const pdfListContainer = document.querySelector('.e3-helper-pdf-list');
  if (!pdfListContainer) return;

  pdfListContainer.innerHTML = '<div class="e3-helper-loading">正在掃描當前頁面...</div>';
  allPDFs = [];
  selectedPDFs.clear();

  // 獲取當前課程名稱
  const currentCourseName = getCurrentCourseName();

  // 建立檔案類型選擇器
  const fileSelectors = SUPPORTED_FILE_TYPES.map(type =>
    `a[href$="${type.ext}"], a[href*="${type.ext}?"], a[href*="pluginfile.php"][href*="${type.ext}"]`
  ).join(', ');

  // 掃描當前頁面的教材檔案連結
  const fileLinks = document.querySelectorAll(fileSelectors);

  console.log(`E3 Helper: 在當前頁面找到 ${fileLinks.length} 個直接檔案連結`);

  fileLinks.forEach(link => {
    const url = link.href;
    let filename = extractFilename(link);
    const fileType = getFileTypeInfo(url);

    // 避免重複
    if (!allPDFs.find(pdf => pdf.url === url)) {
      allPDFs.push({
        url: url,
        filename: filename || '未命名檔案',
        course: currentCourseName,
        fileType: fileType
      });
    }
  });

  // 也掃描 resource 連結
  const resourceLinks = document.querySelectorAll('a[href*="/mod/resource/view.php"]');
  console.log(`E3 Helper: 在當前頁面找到 ${resourceLinks.length} 個 resource 連結`);

  resourceLinks.forEach(link => {
    const url = link.href;
    let filename = extractFilename(link);

    // 標記為需要進一步檢查的 resource
    if (!allPDFs.find(pdf => pdf.url === url)) {
      allPDFs.push({
        url: url,
        filename: filename || '未命名檔案',
        course: currentCourseName,
        isResource: true,
        fileType: { ext: '', icon: '📎', name: 'RESOURCE' }
      });
    }
  });

  console.log(`E3 Helper: 總共找到 ${allPDFs.length} 個教材檔案`);

  // 更新顯示
  updatePDFList();

  // 綁定按鈕事件
  bindDownloadButtons();
}

// 掃描所有課程中的 PDF（深度掃描）
async function scanAllCourses() {
  const pdfListContainer = document.querySelector('.e3-helper-pdf-list');
  const downloadStatus = document.querySelector('.e3-helper-download-status');
  if (!pdfListContainer) return;

  allPDFs = [];
  selectedPDFs.clear();

  pdfListContainer.innerHTML = '<div class="e3-helper-loading">正在載入課程列表...</div>';

  // 確保已載入課程列表
  if (allCourses.length === 0) {
    await loadCourseList();
  }

  if (allCourses.length === 0) {
    pdfListContainer.innerHTML = '<div class="e3-helper-loading">無法載入課程列表</div>';
    return;
  }

  console.log(`E3 Helper: 開始掃描 ${allCourses.length} 個課程`);

  let scannedCourses = 0;
  let totalPDFs = 0;

  for (const course of allCourses) {
    try {
      if (downloadStatus) {
        downloadStatus.textContent = `正在掃描課程 ${scannedCourses + 1}/${allCourses.length}: ${course.fullname}`;
      }
      pdfListContainer.innerHTML = `<div class="e3-helper-loading">正在掃描課程 ${scannedCourses + 1}/${allCourses.length}<br><small style="color: #999; margin-top: 8px; display: block;">${course.fullname}</small><br><small style="color: #667eea; margin-top: 4px; display: block;">已找到 ${totalPDFs} 個教材檔案</small></div>`;

      const coursePDFs = await scanCourseDeep(course.id, course.fullname);
      totalPDFs += coursePDFs.length;
      allPDFs.push(...coursePDFs);

      scannedCourses++;

      // 延遲避免請求過於頻繁
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (e) {
      console.error(`E3 Helper: 掃描課程 ${course.fullname} 時發生錯誤:`, e);
    }
  }

  console.log(`E3 Helper: 掃描完成，共找到 ${allPDFs.length} 個教材檔案`);

  if (downloadStatus) {
    downloadStatus.textContent = `掃描完成！共找到 ${allPDFs.length} 個教材檔案`;
  }

  // 更新顯示
  updatePDFList();

  // 綁定按鈕事件
  bindDownloadButtons();

  // 3秒後恢復狀態顯示
  setTimeout(() => {
    if (downloadStatus) {
      downloadStatus.textContent = `已選取 ${selectedPDFs.size} 個檔案`;
    }
  }, 3000);
}

// 深度掃描單一課程（包括子頁面）
async function scanCourseDeep(courseId, courseName) {
  const pdfs = [];

  try {
    // 抓取教材列表頁面（而不是課程大綱頁面）
    const courseUrl = `https://e3p.nycu.edu.tw/local/courseextension/index.php?courseid=${courseId}`;
    console.log(`E3 Helper: 正在抓取教材列表頁面: ${courseUrl}`);

    const response = await fetch(courseUrl);

    // 檢查是否被重定向
    console.log(`E3 Helper: 實際 URL: ${response.url}`);
    console.log(`E3 Helper: 狀態碼: ${response.status}`);

    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 設置正確的 base URL
    const base = doc.createElement('base');
    base.href = courseUrl;
    doc.head.insertBefore(base, doc.head.firstChild);

    // 建立檔案類型選擇器
    const fileSelectors = SUPPORTED_FILE_TYPES.map(type =>
      `a[href$="${type.ext}"], a[href*="${type.ext}?"], a[href*="pluginfile.php"][href*="${type.ext}"]`
    ).join(', ');

    // 除錯：輸出 HTML 的一部分
    console.log(`E3 Helper: 課程頁面 HTML 長度: ${html.length}`);
    console.log(`E3 Helper: 使用的選擇器: ${fileSelectors.substring(0, 100)}...`);

    // 方法1: 直接的檔案連結
    const directFileLinks = doc.querySelectorAll(fileSelectors);
    console.log(`E3 Helper: 在課程 "${courseName}" 中找到 ${directFileLinks.length} 個直接檔案連結`);

    // 除錯：列出所有連結
    const allLinks = doc.querySelectorAll('a[href]');
    console.log(`E3 Helper: 課程頁面總共有 ${allLinks.length} 個連結`);

    // 顯示所有連結（用於除錯）
    const allLinksList = Array.from(allLinks).map(a => ({
      text: a.textContent.trim().substring(0, 50),
      href: a.href,
      class: a.className
    }));
    console.log('E3 Helper: 所有連結:', allLinksList);

    directFileLinks.forEach(link => {
      const url = link.href;
      let filename = link.textContent.trim();
      const fileType = getFileTypeInfo(url);

      // 從 span.instancename 提取檔名
      const instanceName = link.querySelector('span.instancename');
      if (instanceName) {
        filename = instanceName.textContent.trim();
      }

      filename = filename.replace(/\s+/g, ' ').trim();

      if (!filename || filename.length < 3) {
        const urlParts = url.split('/');
        filename = decodeURIComponent(urlParts[urlParts.length - 1]);
        // 移除 URL 參數
        if (filename.includes('?')) {
          filename = filename.split('?')[0];
        }
        // 移除副檔名（稍後會自動加上）
        SUPPORTED_FILE_TYPES.forEach(type => {
          filename = filename.replace(type.ext, '');
        });
      }

      if (!pdfs.find(pdf => pdf.url === url)) {
        pdfs.push({
          url: url,
          filename: filename || '未命名檔案',
          course: courseName,
          fileType: fileType
        });
      }
    });

    // 方法2: Resource 連結（需要進一步抓取）
    const resourceLinks = doc.querySelectorAll('a[href*="/mod/resource/view.php"]');
    console.log(`E3 Helper: 在課程 "${courseName}" 中找到 ${resourceLinks.length} 個 resource 連結`);

    for (const link of resourceLinks) {
      try {
        const resourceUrl = link.href;

        // 從連結文字先取得可能的檔名
        let filename = link.textContent.trim();
        const instanceName = link.querySelector('.instancename');
        if (instanceName) {
          filename = instanceName.textContent.trim();
        }
        filename = filename.replace(/\s+/g, ' ').trim();

        // 抓取 resource 頁面
        const resResponse = await fetch(resourceUrl);
        const resHtml = await resResponse.text();
        const resDoc = parser.parseFromString(resHtml, 'text/html');

        // 在 resource 頁面中尋找檔案連結（支援所有檔案類型）
        const fileLink = resDoc.querySelector(fileSelectors);
        if (fileLink) {
          const url = fileLink.href;
          const fileType = getFileTypeInfo(url);

          // 嘗試從 resource 頁面標題取得檔名
          const pageTitle = resDoc.querySelector('.page-header-headings h1');
          if (pageTitle && pageTitle.textContent.trim().length > 3) {
            filename = pageTitle.textContent.trim();
          }

          if (!filename || filename.length < 3) {
            const urlParts = url.split('/');
            filename = decodeURIComponent(urlParts[urlParts.length - 1]);
            if (filename.includes('?')) {
              filename = filename.split('?')[0];
            }
            // 移除副檔名
            SUPPORTED_FILE_TYPES.forEach(type => {
              filename = filename.replace(type.ext, '');
            });
          }

          filename = filename.replace(/\s+/g, ' ').trim();

          if (!pdfs.find(pdf => pdf.url === url)) {
            pdfs.push({
              url: url,
              filename: filename || '未命名檔案',
              course: courseName,
              fileType: fileType
            });
          }
        }

        // 延遲避免請求過快
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.error(`E3 Helper: 抓取 resource 頁面時發生錯誤:`, e);
      }
    }

    // 方法3: 尋找所有 activity 連結並檢查（folder、url 等）
    const activityLinks = doc.querySelectorAll('a[href*="/mod/folder/view.php"], a[href*="/mod/url/view.php"]');
    console.log(`E3 Helper: 在課程 "${courseName}" 中找到 ${activityLinks.length} 個其他活動連結`);

    for (const link of activityLinks) {
      try {
        // 檢查是否是 folder（資料夾）
        if (link.href.includes('/mod/folder/view.php')) {
          const folderUrl = link.href;
          const folderResponse = await fetch(folderUrl);
          const folderHtml = await folderResponse.text();
          const folderDoc = parser.parseFromString(folderHtml, 'text/html');

          // 在資料夾中尋找檔案
          const folderFiles = folderDoc.querySelectorAll(fileSelectors);
          folderFiles.forEach(fileLink => {
            const url = fileLink.href;
            let filename = fileLink.textContent.trim();
            const fileType = getFileTypeInfo(url);

            if (!filename || filename.length < 3) {
              const urlParts = url.split('/');
              filename = decodeURIComponent(urlParts[urlParts.length - 1]);
              if (filename.includes('?')) {
                filename = filename.split('?')[0];
              }
              // 移除副檔名
              SUPPORTED_FILE_TYPES.forEach(type => {
                filename = filename.replace(type.ext, '');
              });
            }

            if (!pdfs.find(pdf => pdf.url === url)) {
              pdfs.push({
                url: url,
                filename: filename || '未命名檔案',
                course: courseName,
                fileType: fileType
              });
            }
          });

          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (e) {
        console.error(`E3 Helper: 掃描 activity 時發生錯誤:`, e);
      }
    }

    console.log(`E3 Helper: 在課程 "${courseName}" 中找到 ${pdfs.length} 個教材檔案`);
  } catch (e) {
    console.error(`E3 Helper: 掃描課程 ${courseName} 時發生錯誤:`, e);
  }

  return pdfs;
}

// 獲取當前課程名稱
function getCurrentCourseName() {
  let currentCourseName = 'E3教材';

  // 方法1: 從麵包屑導覽取得
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    const courseLink = breadcrumb.querySelector('a[href*="/course/view.php"]');
    if (courseLink) {
      currentCourseName = courseLink.textContent.trim();
    }
  }

  // 方法2: 從頁面標題取得
  if (currentCourseName === 'E3教材') {
    const pageTitle = document.querySelector('.page-header-headings h1');
    if (pageTitle) {
      const titleText = pageTitle.textContent.trim();
      if (titleText.length > 3 && !titleText.includes('儀表板') && !titleText.includes('Dashboard')) {
        currentCourseName = titleText;
      }
    }
  }

  // 方法3: 從 body 的 class 取得課程 ID
  if (currentCourseName === 'E3教材' && allCourses.length > 0) {
    const bodyClasses = document.body.className;
    const courseIdMatch = bodyClasses.match(/course-(\d+)/);
    if (courseIdMatch) {
      const courseId = courseIdMatch[1];
      const course = allCourses.find(c => c.id == courseId);
      if (course) {
        currentCourseName = course.fullname;
      }
    }
  }

  // 清理課程名稱
  currentCourseName = currentCourseName.replace(/[<>:"/\\|?*]/g, '_');
  return currentCourseName;
}

// 從連結中提取檔名
function extractFilename(link) {
  let filename = link.textContent.trim();

  // 如果是 resource 連結，嘗試從 URL 獲取檔名
  if (link.href.includes('/mod/resource/view.php')) {
    const resourceName = link.querySelector('.instancename');
    if (resourceName) {
      filename = resourceName.textContent.trim();
    }
  }

  // 去除多餘空白和換行
  filename = filename.replace(/\s+/g, ' ').trim();

  // 如果檔名為空或太短，從 URL 提取
  if (!filename || filename.length < 3) {
    const urlParts = link.href.split('/');
    filename = decodeURIComponent(urlParts[urlParts.length - 1]);
    filename = filename.replace('.pdf', '');
  }

  return filename;
}

// 更新 PDF 列表顯示
function updatePDFList() {
  const pdfListContainer = document.querySelector('.e3-helper-pdf-list');
  const downloadStatus = document.querySelector('.e3-helper-download-status');

  if (!pdfListContainer) return;

  if (allPDFs.length === 0) {
    pdfListContainer.innerHTML = '<div class="e3-helper-no-assignments">目前沒有找到教材檔案<br><small style="color: #999; margin-top: 8px; display: block;">請前往課程頁面使用此功能</small></div>';
    if (downloadStatus) {
      downloadStatus.textContent = '已選取 0 個檔案';
    }
    return;
  }

  pdfListContainer.innerHTML = allPDFs.map((pdf, index) => {
    const isSelected = selectedPDFs.has(index);
    const fileType = pdf.fileType || { icon: '📎', name: 'FILE' };
    return `
      <div class="e3-helper-pdf-item">
        <input type="checkbox" class="e3-helper-pdf-checkbox" data-index="${index}" ${isSelected ? 'checked' : ''}>
        <span class="e3-helper-pdf-icon">${fileType.icon}</span>
        <div class="e3-helper-pdf-info">
          <div class="e3-helper-pdf-name">${pdf.filename}</div>
          <div class="e3-helper-pdf-course">${pdf.course} • ${fileType.name}</div>
        </div>
      </div>
    `;
  }).join('');

  // 更新狀態
  if (downloadStatus) {
    downloadStatus.textContent = `已選取 ${selectedPDFs.size} 個檔案`;
  }

  // 綁定勾選框事件
  pdfListContainer.querySelectorAll('.e3-helper-pdf-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      if (e.target.checked) {
        selectedPDFs.add(index);
      } else {
        selectedPDFs.delete(index);
      }
      updatePDFList();
    });
  });
}

// 綁定下載按鈕事件
function bindDownloadButtons() {
  const selectAllBtn = document.getElementById('e3-helper-select-all');
  const deselectAllBtn = document.getElementById('e3-helper-deselect-all');
  const downloadBtn = document.getElementById('e3-helper-download-selected');

  // 使用 dataset.bound 防止重複綁定
  if (selectAllBtn && !selectAllBtn.dataset.bound) {
    selectAllBtn.dataset.bound = 'true';
    selectAllBtn.addEventListener('click', () => {
      selectedPDFs.clear();
      allPDFs.forEach((_, index) => selectedPDFs.add(index));
      updatePDFList();
    });
  }

  if (deselectAllBtn && !deselectAllBtn.dataset.bound) {
    deselectAllBtn.dataset.bound = 'true';
    deselectAllBtn.addEventListener('click', () => {
      selectedPDFs.clear();
      updatePDFList();
    });
  }

  if (downloadBtn && !downloadBtn.dataset.bound) {
    downloadBtn.dataset.bound = 'true';
    downloadBtn.addEventListener('click', () => {
      downloadSelectedPDFs();
    });
  }
}

// 批量下載選取的檔案（打包成 ZIP）
async function downloadSelectedPDFs() {
  if (selectedPDFs.size === 0) {
    alert('請先選取要下載的檔案');
    return;
  }

  // 檢查 JSZip 是否已載入
  if (typeof JSZip === 'undefined') {
    alert('正在載入打包工具，請稍後再試...');
    return;
  }

  const downloadStatus = document.querySelector('.e3-helper-download-status');
  const downloadBtn = document.getElementById('e3-helper-download-selected');

  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.textContent = '打包中...';
  }

  try {
    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;
    const fileCountMap = {}; // 用於處理重複檔名

    if (downloadStatus) {
      downloadStatus.textContent = '正在準備下載...';
    }

    // 下載並加入每個檔案到 ZIP
    for (const index of selectedPDFs) {
      const pdf = allPDFs[index];

      try {
        if (downloadStatus) {
          downloadStatus.textContent = `正在處理 ${successCount + failCount + 1}/${selectedPDFs.size}: ${pdf.filename}`;
        }

        // 決定檔案副檔名
        const fileType = pdf.fileType || { ext: '', name: 'FILE' };
        let finalFilename = pdf.filename;

        // 檢查檔名是否已經有任何副檔名
        const hasExtension = SUPPORTED_FILE_TYPES.some(type =>
          finalFilename.toLowerCase().endsWith(type.ext)
        );

        // 如果檔名還沒有副檔名，加上副檔名
        if (fileType.ext && !hasExtension) {
          finalFilename = `${finalFilename}${fileType.ext}`;
        }

        // 取得課程簡稱（取前20字元，避免檔名過長）
        const coursePrefix = pdf.course.substring(0, 20).replace(/[<>:"/\\|?*]/g, '_');

        // 組合成完整檔名：[課程]_檔名
        let fullFilename = `[${coursePrefix}]_${finalFilename}`;

        // 處理重複檔名：如果檔名已存在，加上編號
        let uniqueFilename = fullFilename;
        if (fileCountMap[fullFilename]) {
          fileCountMap[fullFilename]++;
          const nameParts = fullFilename.split('.');
          if (nameParts.length > 1) {
            const ext = nameParts.pop();
            uniqueFilename = `${nameParts.join('.')}_${fileCountMap[fullFilename]}.${ext}`;
          } else {
            uniqueFilename = `${fullFilename}_${fileCountMap[fullFilename]}`;
          }
        } else {
          fileCountMap[fullFilename] = 1;
        }

        // 使用 fetch 下載檔案內容
        const response = await fetch(pdf.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();

        // 加入到 ZIP（所有檔案在同一層）
        zip.file(uniqueFilename, blob);

        successCount++;

      } catch (e) {
        console.error(`E3 Helper: 處理檔案 ${pdf.filename} 時發生錯誤:`, e);
        failCount++;
      }
    }

    if (successCount === 0) {
      alert('沒有成功下載任何檔案');
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '下載選取';
      }
      if (downloadStatus) {
        downloadStatus.textContent = `已選取 ${selectedPDFs.size} 個檔案`;
      }
      return;
    }

    // 產生 ZIP 檔案
    if (downloadStatus) {
      downloadStatus.textContent = '正在打包 ZIP 檔案...';
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // 產生檔名（使用當前日期時間）
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const zipFilename = `E3教材_${dateStr}_${timeStr}.zip`;

    // 創建下載連結
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 下載完成
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.textContent = '下載選取';
    }

    if (downloadStatus) {
      downloadStatus.textContent = `打包完成！成功: ${successCount}, 失敗: ${failCount}`;
    }

    // 3秒後恢復狀態顯示
    setTimeout(() => {
      if (downloadStatus) {
        downloadStatus.textContent = `已選取 ${selectedPDFs.size} 個檔案`;
      }
    }, 3000);

  } catch (e) {
    console.error('E3 Helper: 打包 ZIP 時發生錯誤:', e);
    alert('打包失敗，請查看 Console 了解詳情');

    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.textContent = '下載選取';
    }

    if (downloadStatus) {
      downloadStatus.textContent = `已選取 ${selectedPDFs.size} 個檔案`;
    }
  }
}

// 收集作業資訊（用於側欄顯示）
function collectAssignmentInfo() {
  let collectedCount = 0;
  let debugInfo = [];

  // 避免重複收集
  const processedEventIds = new Set(allAssignments.map(a => a.eventId));

  // 找到所有作業事件區塊
  const selectors = [
    '[data-event-component="mod_assign"]',
    '[data-type="event"]',
    '.event',
    '[data-region="event-item"]'
  ];

  const allElements = new Set();
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => allElements.add(el));
  });

  debugInfo.push(`找到 ${allElements.size} 個可能的事件元素`);

  let firstAssignmentHtmlLogged = false;

  allElements.forEach(item => {
    // 檢查是否為作業事件
    const text = item.textContent || '';
    const isAssignment =
      text.includes('作業') ||
      text.includes('assignment') ||
      item.querySelector('[class*="assign"]') ||
      item.querySelector('img[src*="assign"]') ||
      item.dataset.eventComponent === 'mod_assign';

    if (isAssignment) {
      debugInfo.push(`偵測到作業: ${text.substring(0, 40)}...`);

      // 尋找事件連結和 event ID
      let mainLink = null;
      let eventId = null;

      if (item.tagName === 'A') {
        mainLink = item;
        eventId = item.dataset.eventId;
      } else {
        const eventLink = item.querySelector('a[data-event-id], a[data-type="event"]');
        if (eventLink) {
          mainLink = eventLink;
          eventId = eventLink.dataset.eventId;
        }
      }

      // 收集作業資訊
      if (eventId && mainLink && !processedEventIds.has(eventId)) {
        // 提取作業名稱
        const assignmentName = mainLink.textContent.trim();

        // 嘗試提取課程名稱
        let courseName = '';
        // 方法1: 從事件卡片中查找課程連結
        const courseLink = item.querySelector('a[href*="/course/view.php"]');
        if (courseLink) {
          courseName = courseLink.textContent.trim();
        }
        // 方法2: 查找包含課程名稱的元素（通常有 course 相關的 class）
        if (!courseName) {
          const courseEl = item.querySelector('[class*="course"], [data-course-name]');
          if (courseEl) {
            courseName = courseEl.textContent.trim();
          }
        }
        // 方法3: 如果在課程頁面上，從頁面標題獲取
        if (!courseName && document.querySelector('.page-header-headings h1')) {
          courseName = document.querySelector('.page-header-headings h1').textContent.trim();
        }

        // 提取截止時間（從 href 中的 time 參數，單位是秒）
        let deadline = null;
        if (mainLink.href) {
          const timeMatch = mainLink.href.match(/time=(\d+)/);
          if (timeMatch) {
            deadline = parseInt(timeMatch[1]) * 1000; // 轉換為毫秒
          }
        }

        if (deadline) {
          const assignmentData = {
            eventId: eventId,
            name: assignmentName,
            course: courseName,
            deadline: deadline,
            url: null,
            manualStatus: 'pending'
          };

          allAssignments.push(assignmentData);
          processedEventIds.add(eventId);
          collectedCount++;
          debugInfo.push(`  📌 已收集作業資訊: ${assignmentName}, 截止: ${new Date(deadline).toLocaleString()}`);

          // 載入已儲存的手動標記狀態
          (async () => {
            const statuses = await loadAssignmentStatuses();
            if (statuses[eventId]) {
              assignmentData.manualStatus = statuses[eventId];
              console.log(`E3 Helper: 作業 ${eventId} 載入手動標記狀態: ${statuses[eventId]}`);
            }

            // 非同步獲取 URL 和課程資訊（不阻塞載入）
            const eventDetails = await getEventDetails(eventId);
            if (eventDetails) {
              let needSave = false;
              if (eventDetails.url) {
                assignmentData.url = eventDetails.url;
                console.log(`E3 Helper: 作業 ${eventId} URL: ${eventDetails.url}`);
                needSave = true;
              }
              // 如果 API 返回了課程資訊，且當前沒有課程名稱，則使用 API 的
              if (eventDetails.course && eventDetails.course.fullname && !assignmentData.course) {
                assignmentData.course = eventDetails.course.fullname;
                console.log(`E3 Helper: 作業 ${eventId} 從 API 獲取課程: ${eventDetails.course.fullname}`);
                needSave = true;
              }

              // 如果有更新，保存到 storage
              if (needSave) {
                await saveAssignments();
              }
            }

            updateSidebarContent();
          })().catch(err => {
            console.error(`E3 Helper: 載入作業資訊時發生錯誤:`, err);
          });
        }
      }
    }
  });

  if (collectedCount > 0) {
    console.log(`E3 Helper: 已收集 ${collectedCount} 個作業資訊`);
    // 儲存到 storage
    saveAssignments();
  } else {
    console.log('E3 Helper: 未找到作業事件');
  }

  // 更新側欄
  if (allAssignments.length > 0) {
    updateSidebarContent();
  }
}

// ==================== 同步功能 ====================

// 檢查 extension context 是否有效
function isExtensionContextValid() {
  try {
    // 嘗試訪問 chrome.runtime.id，如果失效會拋出錯誤
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

// 顯示 extension context 失效警告
function showExtensionInvalidWarning() {
  const sidebar = document.getElementById('e3-helper-sidebar');
  if (!sidebar) return;

  const existingWarning = document.getElementById('e3-helper-context-warning');
  if (existingWarning) return; // 已經顯示過了

  const warning = document.createElement('div');
  warning.id = 'e3-helper-context-warning';
  warning.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 10001;
    max-width: 300px;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  warning.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
    <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">擴充功能已更新</div>
    <div style="font-size: 14px; margin-bottom: 20px; opacity: 0.9;">請重新整理頁面以繼續使用</div>
    <button onclick="location.reload()" style="
      background: white;
      color: #ff6b6b;
      border: none;
      padding: 10px 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      重新整理頁面
    </button>
  `;
  document.body.appendChild(warning);
}

// 更新同步狀態顯示
function updateSyncStatus() {
  if (!isExtensionContextValid()) {
    console.warn('E3 Helper: Extension context 已失效，請重新整理頁面');
    showExtensionInvalidWarning();
    return;
  }

  chrome.storage.local.get(['lastSync', 'lastSyncTime'], (result) => {
    const syncTimeEl = document.getElementById('e3-helper-sync-time');
    if (!syncTimeEl) return;

    if (result.lastSync) {
      const sync = result.lastSync;

      if (sync.loginRequired) {
        // 顯示登入警告
        syncTimeEl.innerHTML = '⚠️ 需要登入';
        showLoginWarning();
      } else if (sync.success) {
        // 顯示最後同步時間
        const timeAgo = getTimeAgo(sync.timestamp);
        syncTimeEl.textContent = `✓ ${timeAgo}前同步`;
      } else {
        // 顯示錯誤
        syncTimeEl.textContent = `✕ 同步失敗`;
      }
    } else {
      syncTimeEl.textContent = '尚未同步';
    }
  });
}

// 顯示登入警告
function showLoginWarning() {
  // 在作業列表上方顯示警告
  const listContainer = document.querySelector('.e3-helper-assignment-list');
  if (!listContainer) return;

  const warningExists = document.querySelector('.e3-helper-login-warning');
  if (warningExists) return; // 已經顯示了

  const warning = document.createElement('div');
  warning.className = 'e3-helper-login-warning';
  warning.innerHTML = `
    ⚠️ E3 登入已過期<br>
    請<a href="https://e3p.nycu.edu.tw/" target="_blank">點此登入 E3</a>，然後點擊同步按鈕
  `;

  listContainer.parentElement.insertBefore(warning, listContainer);
}

// 移除登入警告
function removeLoginWarning() {
  const warning = document.querySelector('.e3-helper-login-warning');
  if (warning) {
    warning.remove();
  }
}

// 計算時間差
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes}分鐘`;
  if (hours < 24) return `${hours}小時`;
  return `${days}天`;
}

// 手動觸發同步
function manualSync() {
  // 檢查 extension context 是否有效
  if (!isExtensionContextValid()) {
    console.warn('E3 Helper: Extension context 已失效，請重新整理頁面');
    showExtensionInvalidWarning();
    return;
  }

  const syncBtn = document.getElementById('e3-helper-sync-btn');
  const syncTimeEl = document.getElementById('e3-helper-sync-time');

  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.textContent = '同步中...';
  }

  if (syncTimeEl) {
    syncTimeEl.textContent = '正在同步資料...';
  }

  // 設定超時保護（60秒）- 增加時間以應對較慢的網路
  const timeoutId = setTimeout(() => {
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.textContent = '🔄 同步';
    }
    if (syncTimeEl) {
      syncTimeEl.textContent = '✕ 同步超時 - 請檢查網路或重試';
    }
    console.error('E3 Helper: 同步超時（60秒）');
  }, 60000);

  // 向 background script 發送同步請求
  chrome.runtime.sendMessage({ action: 'syncNow' }, (response) => {
    clearTimeout(timeoutId);
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.textContent = '🔄 同步';
    }

    // 檢查是否有錯誤
    if (chrome.runtime.lastError) {
      console.error('E3 Helper: 同步通訊錯誤', chrome.runtime.lastError);
      if (syncTimeEl) {
        syncTimeEl.textContent = '✕ 通訊失敗';
      }
      alert('同步失敗：無法與背景服務通訊');
      return;
    }

    if (response) {
      if (response.loginRequired) {
        if (syncTimeEl) {
          syncTimeEl.innerHTML = '⚠️ 需要登入';
        }
        showLoginWarning();
        alert('E3 登入已過期，請先登入 E3');
      } else if (response.success) {
        removeLoginWarning();
        if (syncTimeEl) {
          syncTimeEl.textContent = '✓ 剛剛同步';
        }

        // 重新載入作業和課程資料
        Promise.all([
          loadAssignments(),
          chrome.storage.local.get(['courses', 'lastSyncTime', 'assignmentStatuses'])
        ]).then(([assignments, storage]) => {
          allAssignments = assignments;
          console.log(`E3 Helper: 同步後載入了 ${assignments.length} 個作業`);
          console.log('E3 Helper: 作業狀態詳情:', assignments.map(a => ({ id: a.eventId, name: a.name, status: a.manualStatus })));

          if (storage.assignmentStatuses) {
            console.log('E3 Helper: Storage 中的 assignmentStatuses:', storage.assignmentStatuses);
          }

          if (storage.courses) {
            allCourses = storage.courses;
            console.log(`E3 Helper: 已載入 ${allCourses.length} 個課程`);
          }

          // 更新側欄內容（會自動檢查是否顯示歡迎訊息）
          updateSidebarContent();

          // 如果之前是首次使用，現在同步成功了，可以顯示提示
          if (storage.lastSyncTime && allAssignments.length > 0) {
            console.log('E3 Helper: 首次同步完成！');
          }
        });

        console.log(`E3 Helper: 同步成功，作業: ${response.assignments}，課程: ${response.courses}`);
      } else {
        if (syncTimeEl) {
          syncTimeEl.textContent = '✕ 同步失敗';
        }
        alert(`同步失敗: ${response.error}`);
      }
    } else {
      if (syncTimeEl) {
        syncTimeEl.textContent = '✕ 同步失敗';
      }
    }
  });
}

// 綁定同步按鈕事件
function bindSyncButton() {
  const syncBtn = document.getElementById('e3-helper-sync-btn');
  if (syncBtn && !syncBtn.dataset.bound) {
    syncBtn.dataset.bound = 'true';
    syncBtn.addEventListener('click', manualSync);
  }

  const closeBtn = document.getElementById('e3-helper-close-btn');
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = 'true';
    closeBtn.addEventListener('click', () => {
      const sidebar = document.querySelector('.e3-helper-sidebar');
      const toggleBtn = document.querySelector('.e3-helper-sidebar-toggle');

      if (sidebar) {
        sidebar.classList.remove('expanded');
      }

      if (toggleBtn) {
        toggleBtn.classList.remove('hidden');
        const icon = toggleBtn.querySelector('.e3-helper-toggle-icon');
        const text = toggleBtn.querySelector('.e3-helper-toggle-text');
        if (icon) icon.textContent = '📚';
        if (text) text.textContent = 'E3小助手';
      }
    });
  }
}

// 初始化
async function init() {
  // 檢查 extension context 是否有效
  if (!isExtensionContextValid()) {
    console.error('E3 Helper: Extension context 已失效，無法初始化');
    return;
  }

  // 先從 storage 載入作業、課程、成績和公告資料
  const storage = await chrome.storage.local.get(['assignments', 'courses', 'gradeData', 'announcements', 'readAnnouncements', 'lastSyncTime']);

  if (storage.assignments) {
    allAssignments = storage.assignments;
    console.log(`E3 Helper: 從 storage 載入了 ${allAssignments.length} 個作業`);

    // 檢查作業課程名稱
    const withCourse = allAssignments.filter(a => a.course && a.course !== '');
    const withoutCourse = allAssignments.filter(a => !a.course || a.course === '');
    console.log(`E3 Helper: 有課程名稱: ${withCourse.length} 個, 沒有課程名稱: ${withoutCourse.length} 個`);

    if (withoutCourse.length > 0) {
      console.log('E3 Helper: 沒有課程名稱的作業:', withoutCourse.map(a => ({
        id: a.eventId,
        name: a.name,
        course: a.course
      })));
    }
  }

  if (storage.courses) {
    allCourses = storage.courses;
    console.log(`E3 Helper: 從 storage 載入了 ${allCourses.length} 個課程`);
  }

  if (storage.gradeData) {
    gradeData = storage.gradeData;
    console.log(`E3 Helper: 從 storage 載入了 ${Object.keys(gradeData).length} 個課程的成績資料`);
  }

  if (storage.announcements) {
    allAnnouncements = storage.announcements;
    console.log(`E3 Helper: 從 storage 載入了 ${allAnnouncements.length} 個公告`);
  }

  if (storage.readAnnouncements) {
    readAnnouncements = new Set(storage.readAnnouncements);
    console.log(`E3 Helper: 從 storage 載入了 ${readAnnouncements.size} 個已讀公告`);
  }

  // 檢查是否是首次使用
  const isFirstTime = !storage.lastSyncTime && (!storage.assignments || storage.assignments.length === 0);
  if (isFirstTime) {
    console.log('E3 Helper: 首次使用，將顯示歡迎訊息');
  }

  // 等待 DOM 完全載入
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // 只在 E3 網站上收集作業資訊
      if (window.location.hostname.includes('e3.nycu.edu.tw') || window.location.hostname.includes('e3p.nycu.edu.tw')) {
        collectAssignmentInfo();
      }
      createSidebar();
      bindSyncButton();
      updateSyncStatus();
    });
  } else {
    // DOM 已經載入完成
    if (window.location.hostname.includes('e3.nycu.edu.tw') || window.location.hostname.includes('e3p.nycu.edu.tw')) {
      collectAssignmentInfo();
    }
    createSidebar();
    bindSyncButton();
    updateSyncStatus();
  }

  // 也在頁面載入完成後再收集一次（處理延遲載入的內容）
  // 只在 E3 網站上執行
  if (window.location.hostname.includes('e3.nycu.edu.tw') || window.location.hostname.includes('e3p.nycu.edu.tw')) {
    window.addEventListener('load', () => {
      setTimeout(collectAssignmentInfo, 500);
    });
  }

  // 每 5 分鐘更新一次同步狀態顯示
  setInterval(updateSyncStatus, 300000);
}

// 啟動
init();
