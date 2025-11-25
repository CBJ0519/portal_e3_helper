// NYCU E3 Helper - Content Script
// 優化 E3 使用體驗

// ==================== 日誌系統 ====================
// 用於收集擴充功能操作日誌（完全鏡像 console）
const e3HelperLogs = [];
let e3LogIdCounter = 0;

// 保存原始 console 方法
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  table: console.table
};

// 攔截 console 方法
function interceptConsole() {
  const interceptMethod = (method, type) => {
    console[method] = function(...args) {
      // 調用原始 console 方法
      originalConsole[method].apply(console, args);

      // 保存到日誌（保存原始參數，不轉成字串）
      const timestamp = new Date().toLocaleTimeString('zh-TW', { hour12: false });
      e3HelperLogs.push({
        id: e3LogIdCounter++,
        time: timestamp,
        type: type,
        method: method,
        args: args // 保存原始參數
      });

      // 限制日誌數量
      if (e3HelperLogs.length > 500) {
        e3HelperLogs.shift();
      }

      // 動態更新顯示
      updateLogDisplay();
    };
  };

  interceptMethod('log', 'log');
  interceptMethod('info', 'info');
  interceptMethod('warn', 'warn');
  interceptMethod('error', 'error');
  interceptMethod('debug', 'debug');
  interceptMethod('table', 'table');
}

// ⭐ 立即執行攔截器
interceptConsole();

// 更新日誌顯示（如果面板已打開）
function updateLogDisplay() {
  const logModal = document.getElementById('e3-helper-log-modal');
  const logContent = document.getElementById('e3-helper-log-content');

  if (logModal && logContent && logModal.classList.contains('show')) {
    const shouldScroll = logContent.scrollHeight - logContent.scrollTop <= logContent.clientHeight + 100;
    logContent.innerHTML = getLogsHTML();

    // 重新綁定展開/收合事件
    attachLogEventListeners();

    // 如果之前在底部，保持在底部
    if (shouldScroll) {
      logContent.scrollTop = logContent.scrollHeight;
    }
  }
}

// 清除日誌
function clearLogs() {
  e3HelperLogs.length = 0;
  updateLogDisplay();
}

// 獲取日誌 HTML
function getLogsHTML() {
  if (e3HelperLogs.length === 0) {
    return '<div class="e3-helper-log-placeholder">尚無日誌記錄</div>';
  }

  return e3HelperLogs.map(log => renderLogEntry(log)).join('\n');
}

// 渲染單個日誌條目
function renderLogEntry(log) {
  const typeClass = `e3-helper-log-${log.type}`;
  const icon = {
    'log': '📝',
    'info': 'ℹ️',
    'warn': '⚠️',
    'error': '❌',
    'debug': '🐛'
  }[log.type] || '📝';

  const argsHTML = log.args.map((arg, index) => renderValue(arg, log.id, [index])).join(' ');

  return `<div class="e3-helper-log-entry ${typeClass}" data-log-id="${log.id}">
    <span class="e3-helper-log-time">[${log.time}]</span>
    <span class="e3-helper-log-icon">${icon}</span>
    <span class="e3-helper-log-content-text">${argsHTML}</span>
  </div>`;
}

// 渲染值（支援展開/收合）
function renderValue(value, logId, path, depth = 0) {
  const pathStr = path.join('.');

  if (value === null) {
    return `<span class="e3-helper-log-null">null</span>`;
  }

  if (value === undefined) {
    return `<span class="e3-helper-log-undefined">undefined</span>`;
  }

  if (typeof value === 'string') {
    return `<span class="e3-helper-log-string">"${escapeHtml(value)}"</span>`;
  }

  if (typeof value === 'number') {
    return `<span class="e3-helper-log-number">${value}</span>`;
  }

  if (typeof value === 'boolean') {
    return `<span class="e3-helper-log-boolean">${value}</span>`;
  }

  if (typeof value === 'function') {
    return `<span class="e3-helper-log-function">${value.toString().substring(0, 100)}${value.toString().length > 100 ? '...' : ''}</span>`;
  }

  // 陣列
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `<span class="e3-helper-log-array-label">[]</span>`;
    }

    const preview = value.length === 1 ? '1 item' : `${value.length} items`;
    const id = `e3-log-${logId}-${pathStr}`;

    return `<div class="e3-helper-log-expandable">
      <span class="e3-helper-log-toggle" data-target="${id}">▶</span>
      <span class="e3-helper-log-array-label">Array(${value.length})</span>
      <span class="e3-helper-log-preview">[${preview}]</span>
      <div class="e3-helper-log-expanded-content" id="${id}" style="display: none;">
        ${value.map((item, i) => `
          <div class="e3-helper-log-property">
            <span class="e3-helper-log-key">${i}:</span>
            ${renderValue(item, logId, [...path, i], depth + 1)}
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  // 物件
  if (typeof value === 'object') {
    const keys = Object.keys(value);

    if (keys.length === 0) {
      return `<span class="e3-helper-log-object-label">{}</span>`;
    }

    const preview = keys.slice(0, 3).map(k => `${k}: ...`).join(', ');
    const id = `e3-log-${logId}-${pathStr}`;

    return `<div class="e3-helper-log-expandable">
      <span class="e3-helper-log-toggle" data-target="${id}">▶</span>
      <span class="e3-helper-log-object-label">{...}</span>
      <span class="e3-helper-log-preview">{${preview}${keys.length > 3 ? '...' : ''}}</span>
      <div class="e3-helper-log-expanded-content" id="${id}" style="display: none;">
        ${keys.map(key => `
          <div class="e3-helper-log-property">
            <span class="e3-helper-log-key">${escapeHtml(key)}:</span>
            ${renderValue(value[key], logId, [...path, key], depth + 1)}
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  return `<span class="e3-helper-log-other">${String(value)}</span>`;
}

// 綁定展開/收合事件
function attachLogEventListeners() {
  document.querySelectorAll('.e3-helper-log-toggle').forEach(toggle => {
    toggle.onclick = function(e) {
      e.stopPropagation();
      const targetId = this.getAttribute('data-target');
      const content = document.getElementById(targetId);

      if (content) {
        const isExpanded = content.style.display !== 'none';
        content.style.display = isExpanded ? 'none' : 'block';
        this.textContent = isExpanded ? '▶' : '▼';
      }
    };
  });
}

// 複製日誌（完整展開）
function copyLogsToClipboard() {
  const text = e3HelperLogs.map(log => {
    const timestamp = log.time;
    const args = log.args.map(arg => deepStringify(arg)).join(' ');
    return `[${timestamp}] ${args}`;
  }).join('\n');

  navigator.clipboard.writeText(text).then(() => {
    alert('日誌已複製到剪貼簿');
  }).catch(err => {
    console.error('複製失敗:', err);
  });
}

// 深度序列化（用於複製）
function deepStringify(obj, indent = 0, visited = new WeakSet()) {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'string') return `"${obj}"`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'function') return obj.toString();

  // 防止循環引用
  if (typeof obj === 'object') {
    if (visited.has(obj)) return '[Circular]';
    visited.add(obj);
  }

  const spaces = '  '.repeat(indent);
  const nextSpaces = '  '.repeat(indent + 1);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const items = obj.map(item => nextSpaces + deepStringify(item, indent + 1, visited)).join(',\n');
    return `[\n${items}\n${spaces}]`;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const items = keys.map(key =>
      `${nextSpaces}${key}: ${deepStringify(obj[key], indent + 1, visited)}`
    ).join(',\n');
    return `{\n${items}\n${spaces}}`;
  }

  return String(obj);
}

// HTML 轉義
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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
    min-width: 280px;
    max-width: 800px;
    height: 100vh;
    background: white;
    border-left: 3px solid #667eea;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    z-index: 10001;
    transition: transform 0.3s ease;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    transform: translateX(100%);
  }

  .e3-helper-sidebar.expanded {
    transform: translateX(0);
  }

  .e3-helper-resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    width: 6px;
    height: 100%;
    cursor: ew-resize;
    background: transparent;
    z-index: 10002;
    transition: background 0.2s;
  }

  .e3-helper-resize-handle:hover {
    background: rgba(102, 126, 234, 0.3);
  }

  .e3-helper-resize-handle:active {
    background: rgba(102, 126, 234, 0.5);
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

  .e3-helper-toggle-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ff4444;
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: bold;
    min-width: 18px;
    height: 18px;
    display: none;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    border: 2px solid white;
    z-index: 10001;
    pointer-events: none;
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

  /* 已繳交樣式 - 只改背景色，文字保持原樣 */
  a.e3-helper-assignment-item.completed,
  .e3-helper-assignment-item.completed {
    border-left-color: #6ee7b7 !important;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%) !important;
    background-color: #f0fdf4 !important;
    opacity: 1 !important;
  }

  a.e3-helper-assignment-item.completed:hover,
  .e3-helper-assignment-item.completed:hover {
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%) !important;
    background-color: #ecfdf5 !important;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15) !important;
    transform: translateX(-2px);
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
    background: #d1fae5;
    border-color: #6ee7b7;
    color: #047857;
    font-weight: 600;
  }

  .e3-helper-status-toggle.submitted:hover {
    background: #a7f3d0;
    border-color: #34d399;
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
    flex-direction: column;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .e3-helper-pdf-item:hover {
    background: #e9ecef;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .e3-helper-file-actions {
    display: flex;
    gap: 6px;
    margin-left: 38px;
  }

  .e3-helper-file-btn {
    flex: 1;
    padding: 6px 10px;
    font-size: 11px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  .e3-helper-view-page {
    background: #667eea;
    color: white;
  }

  .e3-helper-view-page:hover {
    background: #5568d3;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.4);
  }

  .e3-helper-download-file {
    background: #28a745;
    color: white;
  }

  .e3-helper-download-file:hover {
    background: #218838;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(40, 167, 69, 0.4);
  }

  .e3-helper-file-btn:active {
    transform: translateY(0);
  }

  .e3-helper-pdf-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    flex-shrink: 0;
    z-index: 1;
    position: relative;
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

  .e3-helper-progress-container {
    padding: 12px;
    background: #fff;
    border-top: 1px solid #e9ecef;
  }

  .e3-helper-progress-bar {
    width: 100%;
    height: 20px;
    background: #e9ecef;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 8px;
    position: relative;
  }

  .e3-helper-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    border-radius: 10px;
    transition: width 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .e3-helper-progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.3) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .e3-helper-progress-text {
    font-size: 12px;
    color: #6c757d;
    text-align: center;
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
    position: relative;
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

  .e3-helper-unread-dot {
    position: absolute;
    left: -2px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    background: #e74c3c;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 0 4px rgba(231, 76, 60, 0.5);
    z-index: 1;
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

  /* 日誌 Modal 樣式 */
  .e3-helper-log-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100000;
    justify-content: center;
    align-items: center;
  }

  .e3-helper-log-modal.show {
    display: flex;
  }

  .e3-helper-log-modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 900px;
    height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }

  .e3-helper-log-modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px 12px 0 0;
  }

  .e3-helper-log-modal-header h2 {
    margin: 0;
    font-size: 18px;
  }

  .e3-helper-log-modal-close {
    background: none;
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transition: opacity 0.2s;
  }

  .e3-helper-log-modal-close:hover {
    opacity: 0.7;
  }

  .e3-helper-log-modal-body {
    flex: 1;
    overflow: hidden;
    padding: 16px;
  }

  .e3-helper-log-container {
    height: 100%;
    overflow-y: auto;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
  }

  .e3-helper-log-content {
    min-height: 100%;
  }

  .e3-helper-log-placeholder {
    color: #999;
    text-align: center;
    padding: 40px 20px;
    font-size: 14px;
  }

  .e3-helper-log-entry {
    padding: 6px 8px;
    margin-bottom: 2px;
    border-radius: 4px;
    line-height: 1.5;
    word-wrap: break-word;
  }

  .e3-helper-log-entry:hover {
    background: rgba(0, 0, 0, 0.03);
  }

  .e3-helper-log-time {
    color: #999;
    margin-right: 8px;
    font-size: 11px;
  }

  .e3-helper-log-icon {
    margin-right: 6px;
  }

  .e3-helper-log-content-text {
    display: inline;
  }

  /* 不同類型日誌的顏色 */
  .e3-helper-log-log .e3-helper-log-icon { opacity: 0.8; }
  .e3-helper-log-info { color: #0066cc; }
  .e3-helper-log-warn { color: #ff8800; background: #fff3cd; }
  .e3-helper-log-error { color: #cc0000; background: #f8d7da; }
  .e3-helper-log-debug { color: #6c757d; }

  /* 值的樣式 */
  .e3-helper-log-null { color: #808080; }
  .e3-helper-log-undefined { color: #808080; }
  .e3-helper-log-string { color: #c41a16; }
  .e3-helper-log-number { color: #1c00cf; }
  .e3-helper-log-boolean { color: #1c00cf; }
  .e3-helper-log-function { color: #666; font-style: italic; }
  .e3-helper-log-array-label, .e3-helper-log-object-label { color: #666; font-weight: 500; }
  .e3-helper-log-preview { color: #999; margin-left: 4px; }
  .e3-helper-log-key { color: #881391; margin-right: 4px; }
  .e3-helper-log-other { color: #000; }

  .e3-helper-log-expandable {
    display: inline-block;
    vertical-align: top;
  }

  .e3-helper-log-toggle {
    cursor: pointer;
    user-select: none;
    color: #666;
    margin-right: 4px;
    display: inline-block;
    width: 12px;
    font-size: 10px;
  }

  .e3-helper-log-toggle:hover {
    color: #000;
  }

  .e3-helper-log-expanded-content {
    margin-left: 16px;
    border-left: 1px solid #e0e0e0;
    padding-left: 8px;
    margin-top: 4px;
  }

  .e3-helper-log-property {
    margin: 2px 0;
  }

  .e3-helper-log-modal-footer {
    padding: 12px 20px;
    border-top: 1px solid #e9ecef;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .e3-helper-log-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .e3-helper-log-btn-secondary {
    background: #6c757d;
    color: white;
  }

  .e3-helper-log-btn-secondary:hover {
    background: #5a6268;
  }

  .e3-helper-log-btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .e3-helper-log-btn-primary:hover {
    opacity: 0.9;
  }

  /* 設定 Modal 樣式 */
  .e3-helper-settings-container {
    height: 100%;
    overflow-y: auto;
  }

  .e3-helper-settings-section {
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid #e9ecef;
  }

  .e3-helper-settings-section:last-child {
    border-bottom: none;
  }

  .e3-helper-settings-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: #333;
  }

  .e3-helper-settings-description {
    font-size: 13px;
    color: #666;
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .e3-helper-setting-item {
    margin-bottom: 16px;
  }

  .e3-helper-setting-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    font-size: 14px;
    color: #333;
  }

  .e3-helper-setting-label input[type="checkbox"] {
    margin-right: 8px;
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .e3-helper-setting-label-block {
    display: block;
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }

  .e3-helper-setting-label-block span {
    display: block;
    margin-bottom: 6px;
  }

  .e3-helper-setting-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .e3-helper-setting-input:focus {
    outline: none;
    border-color: #667eea;
  }

  .e3-helper-setting-tip {
    background: #f0f4ff;
    border-left: 3px solid #667eea;
    padding: 12px 16px;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.6;
    color: #333;
    margin-top: 16px;
  }

  .e3-helper-setting-tip strong {
    display: block;
    margin-bottom: 8px;
    color: #667eea;
  }

  .e3-helper-setting-tip a {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
  }

  .e3-helper-setting-tip a:hover {
    text-decoration: underline;
  }

  .e3-helper-ai-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .e3-helper-status-icon {
    font-size: 16px;
  }

  .e3-helper-status-text {
    font-weight: 500;
  }

  .e3-helper-test-btn {
    padding: 8px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: opacity 0.2s;
  }

  .e3-helper-test-btn:hover {
    opacity: 0.9;
  }

  .e3-helper-test-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

// 儲存檔案資訊（教材、影片、公告）
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
  // 文件
  { ext: '.pdf', icon: '📄', name: 'PDF' },
  { ext: '.txt', icon: '📄', name: 'TXT' },
  { ext: '.md', icon: '📄', name: 'Markdown' },

  // 簡報
  { ext: '.ppt', icon: '📊', name: 'PPT' },
  { ext: '.pptx', icon: '📊', name: 'PPTX' },
  { ext: '.odp', icon: '📊', name: 'ODP' },

  // 文書
  { ext: '.doc', icon: '📝', name: 'DOC' },
  { ext: '.docx', icon: '📝', name: 'DOCX' },
  { ext: '.odt', icon: '📝', name: 'ODT' },
  { ext: '.rtf', icon: '📝', name: 'RTF' },

  // 試算表
  { ext: '.xls', icon: '📈', name: 'XLS' },
  { ext: '.xlsx', icon: '📈', name: 'XLSX' },
  { ext: '.ods', icon: '📈', name: 'ODS' },
  { ext: '.csv', icon: '📈', name: 'CSV' },

  // 壓縮檔
  { ext: '.zip', icon: '📦', name: 'ZIP' },
  { ext: '.rar', icon: '📦', name: 'RAR' },
  { ext: '.7z', icon: '📦', name: '7Z' },
  { ext: '.tar', icon: '📦', name: 'TAR' },
  { ext: '.gz', icon: '📦', name: 'GZ' },

  // 影片
  { ext: '.mp4', icon: '🎬', name: 'MP4' },
  { ext: '.avi', icon: '🎬', name: 'AVI' },
  { ext: '.mov', icon: '🎬', name: 'MOV' },
  { ext: '.wmv', icon: '🎬', name: 'WMV' },
  { ext: '.flv', icon: '🎬', name: 'FLV' },
  { ext: '.mkv', icon: '🎬', name: 'MKV' },
  { ext: '.webm', icon: '🎬', name: 'WEBM' },
  { ext: '.m4v', icon: '🎬', name: 'M4V' },

  // 音訊
  { ext: '.mp3', icon: '🎵', name: 'MP3' },
  { ext: '.wav', icon: '🎵', name: 'WAV' },
  { ext: '.flac', icon: '🎵', name: 'FLAC' },
  { ext: '.aac', icon: '🎵', name: 'AAC' },
  { ext: '.m4a', icon: '🎵', name: 'M4A' },
  { ext: '.ogg', icon: '🎵', name: 'OGG' },

  // 圖片
  { ext: '.jpg', icon: '🖼️', name: 'JPG' },
  { ext: '.jpeg', icon: '🖼️', name: 'JPEG' },
  { ext: '.png', icon: '🖼️', name: 'PNG' },
  { ext: '.gif', icon: '🖼️', name: 'GIF' },
  { ext: '.bmp', icon: '🖼️', name: 'BMP' },
  { ext: '.svg', icon: '🖼️', name: 'SVG' },
  { ext: '.webp', icon: '🖼️', name: 'WEBP' },

  // 程式碼
  { ext: '.c', icon: '💻', name: 'C' },
  { ext: '.cpp', icon: '💻', name: 'C++' },
  { ext: '.java', icon: '💻', name: 'Java' },
  { ext: '.py', icon: '💻', name: 'Python' },
  { ext: '.js', icon: '💻', name: 'JavaScript' },
  { ext: '.html', icon: '💻', name: 'HTML' },
  { ext: '.css', icon: '💻', name: 'CSS' },
  { ext: '.json', icon: '💻', name: 'JSON' },
  { ext: '.xml', icon: '💻', name: 'XML' },

  // 其他
  { ext: '.exe', icon: '⚙️', name: 'EXE' },
  { ext: '.apk', icon: '📱', name: 'APK' },
  { ext: '.iso', icon: '💿', name: 'ISO' }
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

// 標準化 URL（用於去重比較）
function normalizeUrl(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    // 移除 fragment (#)
    urlObj.hash = '';

    // 移除不影響檔案身份的參數（forcedownload、時間戳等）
    const ignoredParams = ['forcedownload', 'time', 'token', '_'];
    urlObj.searchParams.forEach((value, key) => {
      if (ignoredParams.includes(key.toLowerCase())) {
        urlObj.searchParams.delete(key);
      }
    });

    // 排序剩餘的查詢參數
    const params = Array.from(urlObj.searchParams.entries()).sort();
    urlObj.search = '';
    params.forEach(([key, value]) => {
      urlObj.searchParams.append(key, value);
    });

    return urlObj.toString();
  } catch (e) {
    // 如果不是有效 URL，返回原始字串
    return url.trim();
  }
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

  // 重新檢查緊急通知
  const now = new Date().getTime();
  await checkUrgentAssignments(allAssignments, now);

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
        <button class="e3-helper-sync-btn" id="e3-helper-settings-btn" title="設定">⚙️</button>
        <button class="e3-helper-sync-btn" id="e3-helper-log-btn" title="查看日誌">📋</button>
        <button class="e3-helper-sync-btn" id="e3-helper-report-btn" title="問題回報">🐛</button>
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
    gradeTab.innerHTML = '<span style="font-size: 16px;">🎓</span><br><span style="font-size: 10px; line-height: 1.3;">課程<br>列表</span>';
    gradeTab.dataset.tab = 'grades';
    gradeTab.title = '課程列表（成員統計、成績分析）';

    const downloadTab = document.createElement('button');
    downloadTab.className = 'e3-helper-tab';
    downloadTab.innerHTML = '<span style="font-size: 16px;">📥</span><br><span style="font-size: 10px; line-height: 1.3;">檔案<br>下載</span>';
    downloadTab.dataset.tab = 'downloads';
    downloadTab.title = '檔案下載（教材、影片、公告）';

    // 公告與信件 tab
    const announcementTab = document.createElement('button');
    announcementTab.className = 'e3-helper-tab';
    announcementTab.innerHTML = '<span style="font-size: 16px;">📢</span><br><span style="font-size: 10px; line-height: 1.3;">公告<br>信件</span>';
    announcementTab.dataset.tab = 'announcements';
    announcementTab.title = '公告與信件';

    // 通知中心 tab
    const notificationTab = document.createElement('button');
    notificationTab.className = 'e3-helper-tab';
    notificationTab.innerHTML = '<span style="font-size: 16px; position: relative;">🔔<span id="e3-helper-notification-badge" style="display: none; position: absolute; top: -5px; right: -8px; background: #dc3545; color: white; border-radius: 10px; padding: 2px 5px; font-size: 9px; font-weight: bold; min-width: 16px; text-align: center;"></span></span><br><span style="font-size: 10px; line-height: 1.3;">通知<br>中心</span>';
    notificationTab.dataset.tab = 'notifications';
    notificationTab.title = '通知中心';

    // 使用說明 tab
    const helpTab = document.createElement('button');
    helpTab.className = 'e3-helper-tab';
    helpTab.innerHTML = '<span style="font-size: 16px;">📖</span><br><span style="font-size: 10px; line-height: 1.3;">使用<br>說明</span>';
    helpTab.dataset.tab = 'help';
    helpTab.title = '使用說明';

    // 只添加作業倒數和公告 tab，在 E3 網站才添加成績和下載 tab
    tabs.appendChild(assignmentTab);
    if (onE3Site) {
      tabs.appendChild(gradeTab);
      tabs.appendChild(downloadTab);
    }
    tabs.appendChild(announcementTab);
    tabs.appendChild(notificationTab);
    tabs.appendChild(helpTab);
    header.appendChild(tabs);
    sidebar.appendChild(header);

    // 創建作業列表容器
    const assignmentContent = document.createElement('div');
    assignmentContent.className = 'e3-helper-content active';
    assignmentContent.dataset.content = 'assignments';

    // 添加時區信息欄
    const timezoneInfo = document.createElement('div');
    timezoneInfo.style.cssText = 'padding: 8px 12px; background: #e3f2fd; border-bottom: 1px solid #bbdefb; font-size: 11px; color: #1976d2; display: flex; align-items: center; justify-content: space-between;';
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneOffset = -(new Date().getTimezoneOffset() / 60);
    const offsetStr = timezoneOffset >= 0 ? `+${timezoneOffset}` : timezoneOffset;
    timezoneInfo.innerHTML = `
      <span>🌍 時區: ${userTimezone} (UTC${offsetStr})</span>
      <span style="font-size: 10px; opacity: 0.8;">所有時間已自動轉換為本地時間</span>
    `;
    assignmentContent.appendChild(timezoneInfo);

    // 添加手動新增作業按鈕
    const addAssignmentBtn = document.createElement('button');
    addAssignmentBtn.id = 'e3-helper-add-assignment-btn';
    addAssignmentBtn.className = 'e3-helper-add-assignment-btn';
    addAssignmentBtn.innerHTML = '➕ 手動新增作業';
    addAssignmentBtn.style.cssText = `
      width: calc(100% - 24px);
      margin: 12px 12px 0 12px;
      padding: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.3s;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
    `;
    assignmentContent.appendChild(addAssignmentBtn);

    const listContainer = document.createElement('div');
    listContainer.className = 'e3-helper-assignment-list';
    assignmentContent.appendChild(listContainer);
    sidebar.appendChild(assignmentContent);

    // 只在 E3 網站創建成績分析和檔案下載容器
    let gradeContent, downloadContent;
    if (onE3Site) {
      // 創建課程列表容器
      gradeContent = document.createElement('div');
      gradeContent.className = 'e3-helper-content';
      gradeContent.dataset.content = 'grades';

      // 課程列表區域
      const courseListArea = document.createElement('div');
      courseListArea.className = 'e3-helper-course-list-area';
      courseListArea.innerHTML = `
        <div style="padding: 12px; border-bottom: 1px solid #e9ecef; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 14px; font-weight: 600;">📚 我的課程</span>
            <button id="e3-helper-refresh-courses" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">🔄 重新載入</button>
          </div>
          <button id="e3-helper-check-participants-btn" style="width: 100%; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-bottom: 6px;">👥 檢查成員變動</button>
          <div id="e3-helper-last-check-time" style="font-size: 10px; opacity: 0.8; text-align: center;">尚未檢測</div>
        </div>
        <div id="e3-helper-course-list-container" style="overflow-y: auto; max-height: calc(100vh - 200px);">
          <div class="e3-helper-loading">載入課程中...</div>
        </div>
      `;
      gradeContent.appendChild(courseListArea);

      // 課程詳細資訊區域（初始隱藏）
      const courseDetailArea = document.createElement('div');
      courseDetailArea.className = 'e3-helper-course-detail-area';
      courseDetailArea.style.display = 'none';
      courseDetailArea.innerHTML = `
        <div style="padding: 12px; border-bottom: 1px solid #e9ecef; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <button id="e3-helper-back-to-list" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-bottom: 8px;">← 返回列表</button>
          <div id="e3-helper-course-title" style="font-size: 14px; font-weight: 600; margin-bottom: 4px;"></div>
          <div id="e3-helper-course-teacher" style="font-size: 11px; opacity: 0.9;"></div>
        </div>

        <!-- 功能選擇 tabs -->
        <div style="display: flex; border-bottom: 1px solid #e9ecef; background: #f8f9fa;">
          <button class="e3-helper-course-function-tab active" data-function="stats" style="flex: 1; padding: 10px; border: none; background: transparent; cursor: pointer; font-size: 12px; border-bottom: 2px solid #667eea;">📊 統計</button>
          <button class="e3-helper-course-function-tab" data-function="grades" style="flex: 1; padding: 10px; border: none; background: transparent; cursor: pointer; font-size: 12px; border-bottom: 2px solid transparent;">📈 成績</button>
        </div>

        <!-- 統計內容 -->
        <div id="e3-helper-course-stats-content" class="e3-helper-course-function-content">
          <div class="e3-helper-loading">載入統計資料中...</div>
        </div>

        <!-- 成績內容 -->
        <div id="e3-helper-course-grades-content" class="e3-helper-course-function-content" style="display: none;">
          <div class="e3-helper-grade-stats">
            <div class="e3-helper-loading">載入成績中...</div>
          </div>
        </div>
      `;
      gradeContent.appendChild(courseDetailArea);
      sidebar.appendChild(gradeContent);

      // 創建檔案下載容器
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
              <button class="e3-helper-download-btn secondary" id="e3-helper-load-past-courses" style="padding: 4px 8px; font-size: 11px;" title="載入歷年課程">📚 歷年</button>
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
        <button class="e3-helper-download-btn" id="e3-helper-download-separate" title="逐個下載選取的檔案">分開下載</button>
        <button class="e3-helper-download-btn" id="e3-helper-download-zip" title="將選取的檔案打包成 ZIP 下載">打包下載</button>
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

      // 添加進度條容器
      const progressContainer = document.createElement('div');
      progressContainer.className = 'e3-helper-progress-container';
      progressContainer.style.display = 'none'; // 預設隱藏
      progressContainer.innerHTML = `
        <div class="e3-helper-progress-bar">
          <div class="e3-helper-progress-fill" style="width: 0%"></div>
        </div>
        <div class="e3-helper-progress-text">準備中...</div>
      `;
      downloadContent.appendChild(progressContainer);

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

    // 創建通知中心容器
    const notificationContent = document.createElement('div');
    notificationContent.className = 'e3-helper-content';
    notificationContent.dataset.content = 'notifications';

    const notificationList = document.createElement('div');
    notificationList.id = 'e3-helper-notification-list';
    notificationList.className = 'e3-helper-assignment-list';
    notificationList.innerHTML = '<div class="e3-helper-loading">載入通知中...</div>';
    notificationContent.appendChild(notificationList);
    sidebar.appendChild(notificationContent);

    // 使用說明內容
    const helpContent = document.createElement('div');
    helpContent.className = 'e3-helper-content';
    helpContent.dataset.content = 'help';
    helpContent.innerHTML = `
      <div style="padding: 20px; overflow-y: auto; height: 100%; background: #f8f9fa; font-size: 13px; line-height: 1.6;">
        <h2 style="margin: 0 0 16px; font-size: 18px; color: #333; border-bottom: 2px solid #7c4dff; padding-bottom: 8px;">📖 使用說明</h2>

        <section style="background: white; padding: 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #7c4dff;">🎯 主要功能</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;"><strong>作業倒數</strong>：即時顯示作業截止時間，手動標記已繳交</li>
            <li style="margin-bottom: 8px;"><strong>公告信件</strong>：整合所有課程的公告與 dcpcmail 信件，支援 AI 翻譯與摘要</li>
            <li style="margin-bottom: 8px;"><strong>智能通知</strong>：浮動按鈕顯示未讀徽章，24 小時內到期作業自動提醒</li>
            <li style="margin-bottom: 8px;"><strong>成績查詢</strong>：快速查看課程成績與評分細節（E3 網站）</li>
            <li style="margin-bottom: 8px;"><strong>檔案下載</strong>：批次下載課程教材、影片（E3 網站）</li>
            <li style="margin-bottom: 8px;"><strong>跨網頁使用</strong>：在任何網站都能開啟側邊欄查看資訊</li>
          </ul>
        </section>

        <section style="background: white; padding: 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #7c4dff;">🚀 首次使用</h3>
          <ol style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">登入 <a href="https://e3p.nycu.edu.tw/" target="_blank" style="color: #7c4dff; text-decoration: underline;">E3 平台</a></li>
            <li style="margin-bottom: 8px;">點擊側邊欄中的「🔄 同步」按鈕</li>
            <li style="margin-bottom: 8px;">等待同步完成（約 10-30 秒）</li>
            <li style="margin-bottom: 8px;">開始使用各項功能！</li>
          </ol>
        </section>

        <section style="background: white; padding: 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #7c4dff;">📝 作業倒數</h3>
          <p style="margin: 0 0 8px;"><strong>視覺化提示：</strong></p>
          <ul style="margin: 0 0 12px; padding-left: 20px;">
            <li style="margin-bottom: 6px;">🔴 紅色：已逾期</li>
            <li style="margin-bottom: 6px;">🟡 黃色：3天內到期</li>
            <li style="margin-bottom: 6px;">🟢 綠色：充裕時間</li>
          </ul>
          <p style="margin: 0 0 8px;"><strong>操作方式：</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">點擊「前往」進入作業頁面</li>
            <li style="margin-bottom: 6px;">完成後點擊「已繳交」標記</li>
            <li style="margin-bottom: 6px;">已繳交的作業不會被自動刪除</li>
          </ul>
        </section>

        <section style="background: white; padding: 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #7c4dff;">📢 公告與信件</h3>
          <p style="margin: 0 0 8px;"><strong>載入資料：</strong></p>
          <ul style="margin: 0 0 12px; padding-left: 20px;">
            <li style="margin-bottom: 6px;">點擊「🔄 載入公告與信件」按鈕</li>
            <li style="margin-bottom: 6px;">在非 E3 網站也能載入（自動連接到 E3）</li>
            <li style="margin-bottom: 6px;">資料載入後會儲存在本地</li>
          </ul>
          <p style="margin: 0 0 8px;"><strong>查看與管理：</strong></p>
          <ul style="margin: 0 0 12px; padding-left: 20px;">
            <li style="margin-bottom: 6px;">🔴 <strong>未讀項目</strong>會在左側顯示紅點標記</li>
            <li style="margin-bottom: 6px;">按類型篩選：全部 / 公告 / 信件</li>
            <li style="margin-bottom: 6px;">按狀態篩選：全部 / 未讀 / 已讀</li>
            <li style="margin-bottom: 6px;">點擊「✓ 全部已讀」一鍵標記所有為已讀</li>
            <li style="margin-bottom: 6px;">點擊「👁️ 查看內容」查看詳細資訊</li>
          </ul>
          <p style="margin: 0 0 8px;"><strong>🤖 AI 翻譯與摘要（選配）：</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">點擊齒輪 ⚙️ 設定 Gemini API（<a href="https://ai.google.dev/" target="_blank" style="color: #7c4dff;">免費申請</a>）</li>
            <li style="margin-bottom: 6px;"><strong>🌐 中→英</strong> / <strong>🌐 英→中</strong>：翻譯為繁體中文，保留完整格式</li>
            <li style="margin-bottom: 6px;"><strong>🤖 AI摘要</strong>：快速生成內容摘要（需 Gemini API）</li>
            <li style="margin-bottom: 6px;">未設定 API 時使用 Google Translate 免費服務</li>
          </ul>
        </section>

        <section style="background: white; padding: 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #7c4dff;">🎓 成績查詢（E3 網站）</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">選擇要查詢的課程</li>
            <li style="margin-bottom: 8px;">點擊「查詢成績」</li>
            <li style="margin-bottom: 8px;">查看作業、考試、總成績與評分細節</li>
          </ul>
        </section>

        <section style="background: white; padding: 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #7c4dff;">📥 檔案下載（E3 網站）</h3>
          <p style="margin: 0 0 8px;"><strong>兩種模式：</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;"><strong>掃描此頁</strong>：快速掃描當前課程頁面的所有檔案</li>
            <li style="margin-bottom: 8px;"><strong>選擇課程</strong>：選擇要掃描的課程進行完整掃描</li>
          </ul>
          <p style="margin: 8px 0;"><strong>支援格式：</strong>PDF、PPT、Word、Excel、影片、ZIP 等</p>
        </section>

        <section style="background: white; padding: 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #7c4dff;">🔄 自動同步</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">每小時自動同步作業與課程資料</li>
            <li style="margin-bottom: 8px;">手動點擊「🔄 同步」立即更新</li>
            <li style="margin-bottom: 8px;">側邊欄底部顯示最後同步時間</li>
          </ul>
        </section>

        <section style="background: white; padding: 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #7c4dff;">🔔 通知徽章</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;"><strong>浮動按鈕徽章</strong>：右側「📚 E3小助手」按鈕右上角顯示紅色徽章</li>
            <li style="margin-bottom: 8px;"><strong>擴充功能圖示</strong>：瀏覽器工具列圖示顯示未讀總數</li>
            <li style="margin-bottom: 8px;"><strong>包含內容</strong>：未讀公告、未讀信件、24小時內到期作業</li>
            <li style="margin-bottom: 8px;">點擊徽章可直接查看通知詳情</li>
          </ul>
        </section>

        <section style="background: white; padding: 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #e74c3c;">🐛 問題回報 / 功能建議</h3>
          <p style="margin: 0 0 12px; color: #666; font-size: 13px; line-height: 1.6;">
            遇到問題或有功能建議？歡迎透過以下方式回報：
          </p>
          <ul style="margin: 0 0 12px; padding-left: 20px; color: #666; font-size: 13px;">
            <li style="margin-bottom: 6px;">點擊側邊欄標題區的 <strong>🐛 按鈕</strong></li>
            <li style="margin-bottom: 6px;">或點擊下方「<a href="https://forms.gle/SbPcqgVRuNSdVyqK9" target="_blank" style="color: #e74c3c; font-weight: 600;">問題回報 / 功能建議</a>」連結</li>
          </ul>
          <div style="background: #fff3e0; padding: 12px; border-radius: 6px; border-left: 4px solid #ff9800;">
            <p style="margin: 0; color: #e65100; font-size: 12px; line-height: 1.5;">
              <strong>💡 提示：</strong>回報問題時，請詳細描述遇到的情況、操作步驟，並提供 Console 日誌（按 F12 查看）或截圖，這將幫助我們更快解決問題！
            </p>
          </div>
        </section>

        <section style="background: white; padding: 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #7c4dff;">❓ 常見問題</h3>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0 0 4px; font-weight: bold;">Q: 同步失敗怎麼辦？</p>
            <p style="margin: 0; color: #666; font-size: 12px;">A: 確認已登入 E3，重新登入後再次同步。按 F12 查看 Console 了解詳細錯誤。</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0 0 4px; font-weight: bold;">Q: 非 E3 網站能用嗎？</p>
            <p style="margin: 0; color: #666; font-size: 12px;">A: 可以！作業倒數、公告信件、通知中心都能在任何網站使用。成績查詢和檔案下載需要在 E3 網站。</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0 0 4px; font-weight: bold;">Q: 翻譯功能怎麼用？</p>
            <p style="margin: 0; color: #666; font-size: 12px;">A: 查看公告/信件詳細內容後，點擊「🌐 中→英」或「🌐 英→中」按鈕即可翻譯。未設定 Gemini API 時會使用 Google Translate 免費服務。翻譯會保留完整的段落格式、連結和附件。</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0 0 4px; font-weight: bold;">Q: 徽章數字是什麼意思？</p>
            <p style="margin: 0; color: #666; font-size: 12px;">A: 浮動按鈕和擴充功能圖示的紅色徽章顯示未讀通知總數，包含：未讀公告、未讀信件、24小時內到期的作業。</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0 0 4px; font-weight: bold;">Q: 資料會被上傳嗎？</p>
            <p style="margin: 0; color: #666; font-size: 12px;">A: 不會！所有資料僅儲存在本地瀏覽器。使用 AI 翻譯時，內容會傳送至 Google AI 或 Google Translate 進行翻譯。</p>
          </div>
        </section>

        <section style="background: white; padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #7c4dff;">🔗 相關連結</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;"><a href="https://e3p.nycu.edu.tw/" target="_blank" style="color: #7c4dff; text-decoration: underline;">NYCU E3 平台</a></li>
            <li style="margin-bottom: 8px;"><a href="https://github.com/CBJ0519/portal_e3_helper" target="_blank" style="color: #7c4dff; text-decoration: underline;">GitHub 專案</a></li>
            <li style="margin-bottom: 8px;"><a href="https://forms.gle/SbPcqgVRuNSdVyqK9" target="_blank" style="color: #e74c3c; text-decoration: underline; font-weight: 600;">🐛 問題回報 / 功能建議</a></li>
          </ul>
        </section>
      </div>
    `;
    sidebar.appendChild(helpContent);

    // 作業倒數 tab 切換事件（所有網站都需要）
    assignmentTab.addEventListener('click', () => {
      assignmentTab.classList.add('active');
      notificationTab.classList.remove('active');
      announcementTab.classList.remove('active');
      helpTab.classList.remove('active');
      assignmentContent.classList.add('active');
      notificationContent.classList.remove('active');
      announcementContent.classList.remove('active');
      helpContent.classList.remove('active');
      if (onE3Site) {
        gradeTab.classList.remove('active');
        downloadTab.classList.remove('active');
        gradeContent.classList.remove('active');
        downloadContent.classList.remove('active');
      }
    });

    // 只在 E3 網站添加成績和下載 tab 的事件處理器
    if (onE3Site) {
      gradeTab.addEventListener('click', async () => {
      gradeTab.classList.add('active');
      assignmentTab.classList.remove('active');
      downloadTab.classList.remove('active');
      notificationTab.classList.remove('active');
      announcementTab.classList.remove('active');
      helpTab.classList.remove('active');
      gradeContent.classList.add('active');
      assignmentContent.classList.remove('active');
      downloadContent.classList.remove('active');
      notificationContent.classList.remove('active');
      announcementContent.classList.remove('active');
      helpContent.classList.remove('active');

      // 顯示課程列表，隱藏課程詳情
      const courseListArea = document.querySelector('.e3-helper-course-list-area');
      const courseDetailArea = document.querySelector('.e3-helper-course-detail-area');
      if (courseListArea) courseListArea.style.display = 'block';
      if (courseDetailArea) courseDetailArea.style.display = 'none';

      // 載入課程列表
      await loadAllCoursesList();
    });

    downloadTab.addEventListener('click', async () => {
      downloadTab.classList.add('active');
      assignmentTab.classList.remove('active');
      gradeTab.classList.remove('active');
      notificationTab.classList.remove('active');
      announcementTab.classList.remove('active');
      helpTab.classList.remove('active');
      downloadContent.classList.add('active');
      assignmentContent.classList.remove('active');
      gradeContent.classList.remove('active');
      notificationContent.classList.remove('active');
      helpContent.classList.remove('active');
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
              <h3>👋 歡迎使用檔案下載</h3>
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
      const loadPastCoursesBtn = document.getElementById('e3-helper-load-past-courses');
      const selectAllCoursesBtn = document.getElementById('e3-helper-select-all-courses');
      const deselectAllCoursesBtn = document.getElementById('e3-helper-deselect-all-courses');
      const startScanBtn = document.getElementById('e3-helper-start-scan');

      // 載入歷年課程按鈕
      if (loadPastCoursesBtn && !loadPastCoursesBtn.dataset.bound) {
        loadPastCoursesBtn.dataset.bound = 'true';
        loadPastCoursesBtn.addEventListener('click', async () => {
          const courseListContainer = document.getElementById('e3-helper-course-list');
          courseListContainer.innerHTML = '<div class="e3-helper-loading">載入歷年課程中...</div>';

          try {
            // 載入歷年課程（會合併到現有列表）
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
                  classification: 'past',
                  sort: 'fullname'
                }
              }])
            });

            const data = await response.json();
            if (data && data[0] && data[0].data && data[0].data.courses) {
              const pastCourses = data[0].data.courses;

              // 合併歷年課程到現有列表（避免重複）
              pastCourses.forEach(course => {
                if (!allCourses.find(c => c.id === course.id)) {
                  allCourses.push(course);
                }
              });

              console.log(`E3 Helper: 已載入 ${pastCourses.length} 個歷年課程，總共 ${allCourses.length} 個課程`);

              // 更新 storage
              await chrome.storage.local.set({ courses: allCourses });

              // 直接更新顯示（不重新載入）
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
            } else {
              courseListContainer.innerHTML = '<div class="e3-helper-loading">無法載入歷年課程</div>';
            }
          } catch (e) {
            console.error('E3 Helper: 載入歷年課程失敗:', e);
            courseListContainer.innerHTML = '<div class="e3-helper-loading">載入失敗</div>';
          }
        });
      }

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

    // 通知中心 tab 事件（新增）
    notificationTab.addEventListener('click', async () => {
      notificationTab.classList.add('active');
      assignmentTab.classList.remove('active');
      announcementTab.classList.remove('active');
      helpTab.classList.remove('active');
      if (onE3Site) {
        gradeTab.classList.remove('active');
        downloadTab.classList.remove('active');
      }
      notificationContent.classList.add('active');
      assignmentContent.classList.remove('active');
      announcementContent.classList.remove('active');
      helpContent.classList.remove('active');
      if (onE3Site) {
        gradeContent.classList.remove('active');
        downloadContent.classList.remove('active');
      }

      // 載入並顯示通知
      await loadNotifications();

      // 標記所有通知為已讀
      await markAllNotificationsAsRead();
    });

    announcementTab.addEventListener('click', async () => {
      announcementTab.classList.add('active');
      assignmentTab.classList.remove('active');
      notificationTab.classList.remove('active');
      helpTab.classList.remove('active');
      if (onE3Site) {
        gradeTab.classList.remove('active');
        downloadTab.classList.remove('active');
      }
      announcementContent.classList.add('active');
      assignmentContent.classList.remove('active');
      notificationContent.classList.remove('active');
      helpContent.classList.remove('active');
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
                  ${!isOnE3Site() ? '<br><small>將在背景自動連接到 E3 載入</small>' : ''}
                </div>
                <button id="e3-helper-reload-all-later" style="background: #ffc107; color: #000; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                  🔄 重新載入完整資料
                </button>
              </div>
            `;
            announcementListContainer.insertAdjacentHTML('afterbegin', warningHTML);

            // 綁定重新載入按鈕
            const reloadBtn = document.getElementById('e3-helper-reload-all-later');
            if (reloadBtn) {
              reloadBtn.addEventListener('click', async () => {
                reloadBtn.disabled = true;
                reloadBtn.textContent = '⏳ 載入中...';

                try {
                  if (isOnE3Site()) {
                    // 在 E3 網站，直接載入
                    await Promise.all([loadAnnouncements(), loadMessages()]);
                    displayAnnouncements();
                    reloadBtn.textContent = '✅ 載入完成';
                  } else {
                    // 不在 E3 網站，通過 background 載入
                    const response = await chrome.runtime.sendMessage({
                      action: 'loadAnnouncementsAndMessages'
                    });

                    if (response && response.success) {
                      // 從 storage 重新載入資料並顯示
                      const storage = await chrome.storage.local.get(['announcements', 'messages']);
                      if (storage.announcements) allAnnouncements = storage.announcements;
                      if (storage.messages) allMessages = storage.messages;
                      displayAnnouncements();
                      reloadBtn.textContent = '✅ 載入完成';
                    } else {
                      throw new Error(response?.error || '載入失敗');
                    }
                  }

                  // 2秒後恢復按鈕
                  setTimeout(() => {
                    reloadBtn.disabled = false;
                    reloadBtn.textContent = '🔄 重新載入完整資料';
                  }, 2000);
                } catch (error) {
                  console.error('E3 Helper: 重新載入失敗', error);
                  reloadBtn.textContent = '❌ 載入失敗';
                  reloadBtn.disabled = false;

                  // 顯示錯誤提示
                  alert('載入失敗：' + error.message);
                }
              });
            }
          }
        } else {
          // 兩者都沒有（這個情況應該被上面的條件捕獲，但保險起見）
          displayAnnouncements();
        }
      }
    });

    // 使用說明 tab 切換事件
    helpTab.addEventListener('click', () => {
      helpTab.classList.add('active');
      assignmentTab.classList.remove('active');
      announcementTab.classList.remove('active');
      notificationTab.classList.remove('active');
      helpContent.classList.add('active');
      assignmentContent.classList.remove('active');
      announcementContent.classList.remove('active');
      notificationContent.classList.remove('active');
      if (onE3Site) {
        gradeTab.classList.remove('active');
        downloadTab.classList.remove('active');
        gradeContent.classList.remove('active');
        downloadContent.classList.remove('active');
      }
    });

    // 添加 resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'e3-helper-resize-handle';
    sidebar.insertBefore(resizeHandle, sidebar.firstChild);

    // 實作拖曳調整寬度
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;

      // 禁用過渡動畫讓拖曳更順暢
      sidebar.style.transition = 'none';

      // 防止選取文字
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = startX - e.clientX; // 向左拖是正值
      const newWidth = startWidth + deltaX;

      // 限制寬度範圍
      if (newWidth >= 280 && newWidth <= 800) {
        sidebar.style.width = newWidth + 'px';
      }
    });

    document.addEventListener('mouseup', async () => {
      if (!isResizing) return;

      isResizing = false;
      // 恢復過渡動畫
      sidebar.style.transition = 'transform 0.3s ease';

      // 儲存寬度設定
      const width = sidebar.offsetWidth;
      await chrome.storage.local.set({ sidebarWidth: width });
      console.log('E3 Helper: 側邊欄寬度已儲存:', width);
    });

    // 載入儲存的寬度設定
    chrome.storage.local.get(['sidebarWidth'], (result) => {
      if (result.sidebarWidth) {
        sidebar.style.width = result.sidebarWidth + 'px';
        console.log('E3 Helper: 載入側邊欄寬度:', result.sidebarWidth);
      }
    });

    document.body.appendChild(sidebar);

    // 創建手動新增作業的模態框
    const addAssignmentModal = document.createElement('div');
    addAssignmentModal.id = 'e3-helper-add-assignment-modal';
    addAssignmentModal.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10001;
      justify-content: center;
      align-items: center;
    `;
    addAssignmentModal.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
        <h3 style="margin: 0 0 16px; font-size: 18px; color: #667eea; display: flex; align-items: center; gap: 8px;">
          <span id="e3-helper-modal-title">➕ 新增作業</span>
        </h3>
        <form id="e3-helper-add-assignment-form" style="display: flex; flex-direction: column; gap: 12px;">
          <input type="hidden" id="e3-helper-edit-assignment-id" value="">
          <div>
            <label style="display: block; margin-bottom: 6px; font-size: 13px; color: #666; font-weight: 600;">作業名稱 *</label>
            <input type="text" id="e3-helper-assignment-name" required placeholder="例：期末專題報告" style="width: 100%; padding: 10px 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 6px; font-size: 13px; color: #666; font-weight: 600;">課程名稱</label>
            <select id="e3-helper-assignment-course-select" style="width: 100%; padding: 10px 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; background: white;">
              <option value="">選擇課程...</option>
            </select>
            <input type="text" id="e3-helper-assignment-course-custom" placeholder="請輸入課程名稱" style="width: 100%; padding: 10px 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; margin-top: 8px; display: none;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 6px; font-size: 13px; color: #666; font-weight: 600;">截止日期 *</label>
            <input type="date" id="e3-helper-assignment-date" required style="width: 100%; padding: 10px 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 6px; font-size: 13px; color: #666; font-weight: 600;">截止時間 *</label>
            <input type="time" id="e3-helper-assignment-time" required value="23:59" style="width: 100%; padding: 10px 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button type="submit" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
              <span id="e3-helper-modal-submit-text">➕ 新增</span>
            </button>
            <button type="button" id="e3-helper-cancel-add-assignment" style="flex: 1; padding: 12px; background: #e0e0e0; color: #666; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">取消</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(addAssignmentModal);

    // 課程選單變化處理
    const courseSelect = document.getElementById('e3-helper-assignment-course-select');
    const courseCustomInput = document.getElementById('e3-helper-assignment-course-custom');

    courseSelect.addEventListener('change', (e) => {
      if (e.target.value === '__custom__') {
        courseCustomInput.style.display = 'block';
        courseCustomInput.focus();
      } else {
        courseCustomInput.style.display = 'none';
        courseCustomInput.value = '';
      }
    });

    // 手動新增作業的事件處理
    // 打開模態框
    document.addEventListener('click', async (e) => {
      if (e.target && e.target.id === 'e3-helper-add-assignment-btn') {
        const modal = document.getElementById('e3-helper-add-assignment-modal');
        const modalTitle = document.getElementById('e3-helper-modal-title');
        const submitText = document.getElementById('e3-helper-modal-submit-text');
        const editIdInput = document.getElementById('e3-helper-edit-assignment-id');

        // 重置表單為新增模式
        modalTitle.textContent = '➕ 新增作業';
        submitText.textContent = '➕ 新增';
        editIdInput.value = '';
        document.getElementById('e3-helper-add-assignment-form').reset();
        document.getElementById('e3-helper-assignment-time').value = '23:59';

        // 更新課程選項列表
        await updateCourseOptions();

        // 重置課程選項
        document.getElementById('e3-helper-assignment-course-select').value = '';
        document.getElementById('e3-helper-assignment-course-custom').style.display = 'none';
        document.getElementById('e3-helper-assignment-course-custom').value = '';

        modal.style.display = 'flex';
      }
    });

    // 關閉模態框
    const cancelBtn = document.getElementById('e3-helper-cancel-add-assignment');
    cancelBtn.addEventListener('click', () => {
      document.getElementById('e3-helper-add-assignment-modal').style.display = 'none';
    });

    // 點擊背景關閉
    addAssignmentModal.addEventListener('click', (e) => {
      if (e.target === addAssignmentModal) {
        addAssignmentModal.style.display = 'none';
      }
    });

    // 表單提交
    const form = document.getElementById('e3-helper-add-assignment-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('e3-helper-assignment-name').value.trim();
      const courseSelectValue = document.getElementById('e3-helper-assignment-course-select').value;
      const courseCustomValue = document.getElementById('e3-helper-assignment-course-custom').value.trim();

      // 決定課程名稱：如果選擇自行輸入，使用自訂輸入框的值
      let course = '';
      if (courseSelectValue === '__custom__') {
        course = courseCustomValue || '手動新增';
      } else {
        course = courseSelectValue || '手動新增';
      }

      const date = document.getElementById('e3-helper-assignment-date').value;
      const time = document.getElementById('e3-helper-assignment-time').value;
      const editId = document.getElementById('e3-helper-edit-assignment-id').value;

      if (!name || !date || !time) {
        alert('請填寫必填欄位');
        return;
      }

      // 組合日期和時間
      const deadlineTimestamp = new Date(`${date}T${time}`).getTime();

      if (editId) {
        // 編輯模式
        const assignment = allAssignments.find(a => a.eventId === editId);
        if (assignment) {
          assignment.name = name;
          assignment.course = course;
          assignment.deadline = deadlineTimestamp;

          // 如果編輯的是同步作業，標記為已手動修改
          if (!assignment.isManual && !editId.startsWith('manual-')) {
            assignment.manuallyEdited = true;
          }
        }
      } else {
        // 新增模式
        const newAssignment = {
          eventId: `manual-${Date.now()}`,
          name: name,
          course: course,
          deadline: deadlineTimestamp,
          url: '#',
          manualStatus: 'pending',
          isManual: true
        };
        allAssignments.push(newAssignment);
      }

      // 儲存到 storage
      await saveAssignments();

      // 更新顯示
      await updateSidebarContent();

      // 關閉模態框
      document.getElementById('e3-helper-add-assignment-modal').style.display = 'none';

      // 顯示成功訊息
      const message = editId ? '作業已更新' : '作業已新增';
      showTemporaryMessage(message);
    });
  }

  if (!toggleBtn) {
    // 創建收合按鈕（獨立於側欄）
    toggleBtn = document.createElement('button');
    toggleBtn.className = 'e3-helper-sidebar-toggle';
    toggleBtn.innerHTML = '<span class="e3-helper-toggle-icon">📚</span><span class="e3-helper-toggle-text">E3小助手</span><span class="e3-helper-toggle-badge" id="e3-helper-toggle-badge"></span>';
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

  // 創建 log modal 和 settings modal（只創建一次）
  createLogModal();
  createSettingsModal();
}

// 創建 log modal 面板
function createLogModal() {
  // 檢查是否已經存在
  if (document.getElementById('e3-helper-log-modal')) {
    return;
  }

  const logModal = document.createElement('div');
  logModal.id = 'e3-helper-log-modal';
  logModal.className = 'e3-helper-log-modal';

  logModal.innerHTML = `
    <div class="e3-helper-log-modal-content">
      <div class="e3-helper-log-modal-header">
        <h2>📋 操作日誌</h2>
        <button class="e3-helper-log-modal-close" id="e3-helper-close-log">&times;</button>
      </div>
      <div class="e3-helper-log-modal-body">
        <div class="e3-helper-log-container">
          <div id="e3-helper-log-content" class="e3-helper-log-content">
            <div class="e3-helper-log-placeholder">尚無日誌記錄</div>
          </div>
        </div>
      </div>
      <div class="e3-helper-log-modal-footer">
        <button id="e3-helper-clear-log" class="e3-helper-log-btn e3-helper-log-btn-secondary">清除日誌</button>
        <button id="e3-helper-copy-log" class="e3-helper-log-btn e3-helper-log-btn-primary">複製日誌</button>
      </div>
    </div>
  `;

  document.body.appendChild(logModal);

  // 使用事件委派綁定 log 按鈕（因為按鈕可能在 modal 創建後才存在）
  document.body.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'e3-helper-log-btn') {
      logModal.classList.add('show');
      // 打開時更新顯示
      const logContent = document.getElementById('e3-helper-log-content');
      if (logContent) {
        logContent.innerHTML = getLogsHTML();
        attachLogEventListeners();
        // 滾動到底部
        logContent.scrollTop = logContent.scrollHeight;
      }
    }
  });

  document.getElementById('e3-helper-close-log').addEventListener('click', () => {
    logModal.classList.remove('show');
  });

  document.getElementById('e3-helper-clear-log').addEventListener('click', () => {
    clearLogs();
  });

  document.getElementById('e3-helper-copy-log').addEventListener('click', () => {
    copyLogsToClipboard();
  });

  // 點擊背景關閉
  logModal.addEventListener('click', (e) => {
    if (e.target === logModal) {
      logModal.classList.remove('show');
    }
  });
}

// 創建設定 Modal
function createSettingsModal() {
  // 檢查是否已經存在
  if (document.getElementById('e3-helper-settings-modal')) {
    return;
  }

  const settingsModal = document.createElement('div');
  settingsModal.id = 'e3-helper-settings-modal';
  settingsModal.className = 'e3-helper-log-modal'; // 複用 log modal 樣式

  settingsModal.innerHTML = `
    <div class="e3-helper-log-modal-content">
      <div class="e3-helper-log-modal-header">
        <h2>⚙️ 設定</h2>
        <button class="e3-helper-log-modal-close" id="e3-helper-close-settings">&times;</button>
      </div>
      <div class="e3-helper-log-modal-body">
        <div class="e3-helper-settings-container">
          <div class="e3-helper-settings-section">
            <h3 class="e3-helper-settings-title">🤖 AI 功能（Google Gemini）</h3>
            <div class="e3-helper-settings-description">
              使用 Google Gemini AI 提供智能翻譯和摘要功能
            </div>

            <div class="e3-helper-setting-item">
              <label class="e3-helper-setting-label">
                <input type="checkbox" id="e3-helper-enable-ai">
                <span>啟用 AI 功能</span>
              </label>
            </div>

            <div id="e3-helper-ai-settings" style="display: none;">
              <div class="e3-helper-setting-item">
                <label class="e3-helper-setting-label-block">
                  <span>Gemini API Key</span>
                  <input type="password" id="e3-helper-gemini-key" class="e3-helper-setting-input" placeholder="AIza...">
                </label>
              </div>

              <div class="e3-helper-setting-item">
                <label class="e3-helper-setting-label-block">
                  <span>AI 模型</span>
                  <input type="text" id="e3-helper-gemini-model" class="e3-helper-setting-input" value="gemini-2.5-flash" readonly style="background-color: #f5f5f5; cursor: not-allowed;">
                </label>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">
                  使用 Gemini 2.5 Flash 模型：配額消耗少、準確度高
                </div>
              </div>

              <div class="e3-helper-setting-tip">
                <strong>💡 如何獲取 Gemini API Key？</strong><br>
                1. 訪問 <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a><br>
                2. 點擊「Get API key」建立金鑰<br>
                3. 每天有免費額度可使用（1500 次請求/天）<br><br>
                <strong>✨ Gemini 2.5 Flash 優點：</strong><br>
                • 準確度高：能精確理解翻譯和摘要意圖<br>
                • 配額友善：每日免費額度可進行大量操作<br>
                • 快速回應：翻譯和摘要速度快
              </div>

              <!-- 連接狀態 -->
              <div class="e3-helper-setting-item" style="display: flex; align-items: center; justify-content: space-between;">
                <div id="e3-helper-ai-status" class="e3-helper-ai-status">
                  <span class="e3-helper-status-icon">⏳</span>
                  <span class="e3-helper-status-text">未檢測</span>
                </div>
                <button id="e3-helper-test-ai-btn" class="e3-helper-test-btn">測試連接</button>
              </div>
            </div>
          </div>

          <div class="e3-helper-settings-section">
            <h3 class="e3-helper-settings-title">ℹ️ 關於 AI 功能</h3>
            <div class="e3-helper-settings-description">
              <strong>功能：</strong><br>
              • AI 翻譯：智能翻譯公告和信件內容<br>
              • AI 摘要：自動摘要長篇公告和信件<br>
              • 24小時提醒：即將到期作業通知<br><br>
              <strong>注意：</strong><br>
              • 需要有效的 Gemini API Key<br>
              • AI 推理需要幾秒鐘時間<br>
              • 翻譯和摘要功能僅在啟用 AI 後可用
            </div>
          </div>
        </div>
      </div>
      <div class="e3-helper-log-modal-footer">
        <button id="e3-helper-save-settings" class="e3-helper-log-btn e3-helper-log-btn-primary">儲存設定</button>
      </div>
    </div>
  `;

  document.body.appendChild(settingsModal);

  // 綁定設定按鈕點擊事件（使用事件委派）
  document.body.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'e3-helper-settings-btn') {
      settingsModal.classList.add('show');
      // 打開時載入當前設定
      await loadAISettings();
    }
  });

  // 關閉按鈕
  document.getElementById('e3-helper-close-settings').addEventListener('click', () => {
    settingsModal.classList.remove('show');
  });

  // 儲存設定按鈕
  document.getElementById('e3-helper-save-settings').addEventListener('click', async () => {
    await saveAISettings();
    settingsModal.classList.remove('show');
  });

  // 啟用 AI 複選框
  document.getElementById('e3-helper-enable-ai').addEventListener('change', (e) => {
    const aiSettings = document.getElementById('e3-helper-ai-settings');
    if (e.target.checked) {
      aiSettings.style.display = 'block';
    } else {
      aiSettings.style.display = 'none';
    }
  });

  // 測試連接按鈕
  document.getElementById('e3-helper-test-ai-btn').addEventListener('click', async () => {
    await testAIConnection();
  });

  // 點擊背景關閉
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('show');
    }
  });
}

// 載入 AI 設定
async function loadAISettings() {
  const storage = await chrome.storage.local.get(['aiSettings']);
  const aiSettings = storage.aiSettings || {
    enabled: false,
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash'
  };

  document.getElementById('e3-helper-enable-ai').checked = aiSettings.enabled;
  document.getElementById('e3-helper-gemini-key').value = aiSettings.geminiApiKey;
  document.getElementById('e3-helper-gemini-model').value = aiSettings.geminiModel;

  // 根據啟用狀態顯示/隱藏 AI 設定
  const aiSettingsDiv = document.getElementById('e3-helper-ai-settings');
  if (aiSettings.enabled) {
    aiSettingsDiv.style.display = 'block';
  } else {
    aiSettingsDiv.style.display = 'none';
  }
}

// 儲存 AI 設定
async function saveAISettings() {
  const enabled = document.getElementById('e3-helper-enable-ai').checked;
  const geminiApiKey = document.getElementById('e3-helper-gemini-key').value.trim();
  const geminiModel = document.getElementById('e3-helper-gemini-model').value;

  const aiSettings = {
    enabled: enabled,
    geminiApiKey: geminiApiKey,
    geminiModel: geminiModel
  };

  await chrome.storage.local.set({ aiSettings: aiSettings });

  console.log('E3 Helper: AI 設定已儲存', aiSettings);
  alert('設定已儲存！');
}

// 測試 AI 連接
async function testAIConnection() {
  const statusDiv = document.getElementById('e3-helper-ai-status');
  const statusIcon = statusDiv.querySelector('.e3-helper-status-icon');
  const statusText = statusDiv.querySelector('.e3-helper-status-text');
  const testBtn = document.getElementById('e3-helper-test-ai-btn');

  const geminiApiKey = document.getElementById('e3-helper-gemini-key').value.trim();

  if (!geminiApiKey) {
    statusIcon.textContent = '❌';
    statusText.textContent = '請輸入 API Key';
    statusDiv.style.color = '#f44336';
    return;
  }

  // 顯示測試中
  statusIcon.textContent = '⏳';
  statusText.textContent = '測試中...';
  statusDiv.style.color = '#ff9800';
  testBtn.disabled = true;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Hello, test connection.'
            }]
          }]
        })
      }
    );

    if (response.ok) {
      statusIcon.textContent = '✅';
      statusText.textContent = '連接成功';
      statusDiv.style.color = '#4caf50';
      console.log('E3 Helper: Gemini API 連接測試成功');
    } else {
      const errorData = await response.json();
      statusIcon.textContent = '❌';
      statusText.textContent = '連接失敗';
      statusDiv.style.color = '#f44336';
      console.error('E3 Helper: Gemini API 連接測試失敗', errorData);
      alert(`連接失敗：${errorData.error?.message || '未知錯誤'}`);
    }
  } catch (error) {
    statusIcon.textContent = '❌';
    statusText.textContent = '連接失敗';
    statusDiv.style.color = '#f44336';
    console.error('E3 Helper: Gemini API 連接測試失敗', error);
    alert(`連接失敗：${error.message}`);
  } finally {
    testBtn.disabled = false;
  }
}

// 更新課程選項列表
async function updateCourseOptions() {
  const select = document.getElementById('e3-helper-assignment-course-select');
  if (!select) return;

  // 收集所有唯一的課程名稱
  const courseNames = new Set();

  // 從 allCourses 中獲取課程名稱
  if (allCourses && allCourses.length > 0) {
    allCourses.forEach(course => {
      if (course.fullname) {
        courseNames.add(course.fullname);
      }
    });
  }

  // 從現有作業中獲取課程名稱
  allAssignments.forEach(assignment => {
    if (assignment.course && assignment.course !== '手動新增' && assignment.course !== '(未知課程)') {
      courseNames.add(assignment.course);
    }
  });

  // 清空並填充 select
  select.innerHTML = '<option value="">選擇課程...</option>';

  // 將課程名稱排序後添加到選項中
  const sortedCourses = Array.from(courseNames).sort();
  sortedCourses.forEach(courseName => {
    const option = document.createElement('option');
    option.value = courseName;
    option.textContent = courseName;
    select.appendChild(option);
  });

  // 添加「自行輸入」選項
  const customOption = document.createElement('option');
  customOption.value = '__custom__';
  customOption.textContent = '➕ 自行輸入...';
  select.appendChild(customOption);

  console.log(`E3 Helper: 已載入 ${sortedCourses.length} 個課程選項`);
}

// 顯示臨時訊息
function showTemporaryMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10002;
    font-size: 14px;
    font-weight: 600;
    animation: slideIn 0.3s ease;
  `;
  messageEl.textContent = message;
  document.body.appendChild(messageEl);

  setTimeout(() => {
    messageEl.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => messageEl.remove(), 300);
  }, 2000);
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

    // 格式化日期 - 包含星期和更詳細的資訊
    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    const weekday = weekdays[deadlineDate.getDay()];
    const dateStr = `${deadlineDate.getMonth() + 1}/${deadlineDate.getDate()} (${weekday}) ${deadlineDate.getHours().toString().padStart(2, '0')}:${deadlineDate.getMinutes().toString().padStart(2, '0')}`;

    // 使用手動標記的狀態
    const manualStatus = assignment.manualStatus || 'pending';

    // 檢查是否為24小時內到期且未繳交的緊急作業
    const timeUntilDeadline = assignment.deadline - now;
    const isUrgent = timeUntilDeadline > 0 && timeUntilDeadline <= 24 * 60 * 60 * 1000 && manualStatus !== 'submitted';

    // 決定樣式類別
    let statusClass = countdown.status;
    if (manualStatus === 'submitted') {
      statusClass = 'completed';
    }

    // 狀態切換按鈕
    let statusToggleText = '標記為已繳交';
    let statusToggleClass = '';
    if (manualStatus === 'submitted') {
      // 檢查是否為自動檢測
      if (assignment.autoDetected) {
        statusToggleText = '✓ 已繳交 (自動)';
        statusToggleClass = 'submitted auto-detected';
      } else {
        statusToggleText = '✓ 已繳交';
        statusToggleClass = 'submitted';
      }
    }

    // 緊急標籤
    const urgentBadge = isUrgent ? '<span style="display: inline-block; background: #dc3545; color: white; font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-left: 6px; font-weight: 600;">🚨 24hr內到期</span>' : '';

    const hasValidUrl = assignment.url && assignment.url !== '#' && assignment.url.startsWith('http');

    // 所有作業都添加編輯和刪除按鈕
    const manualControls = `
      <div style="display: flex; gap: 6px; margin-top: 8px;">
        <button class="e3-helper-edit-assignment" data-event-id="${assignment.eventId}" onclick="event.preventDefault(); event.stopPropagation();" style="flex: 1; padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.3s;">✏️ 編輯</button>
        <button class="e3-helper-delete-assignment" data-event-id="${assignment.eventId}" onclick="event.preventDefault(); event.stopPropagation();" style="flex: 1; padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.3s;">🗑️ 刪除</button>
      </div>
    `;

    return `
      <a href="${hasValidUrl ? assignment.url : 'javascript:void(0);'}" target="${hasValidUrl ? '_blank' : '_self'}" class="e3-helper-assignment-item ${statusClass}" data-event-id="${assignment.eventId}" ${!hasValidUrl ? 'data-need-fetch="true"' : ''} style="display: block; text-decoration: none; color: inherit; cursor: pointer;">
        <div class="e3-helper-assignment-name">${assignment.name}${urgentBadge}</div>
        <div class="e3-helper-assignment-course">${assignment.course || '(未知課程)'}</div>
        <div class="e3-helper-assignment-deadline">
          📅 ${dateStr}
          <span class="e3-helper-status-toggle ${statusToggleClass}" data-event-id="${assignment.eventId}" onclick="event.preventDefault(); event.stopPropagation();">${statusToggleText}</span>
        </div>
        <div class="e3-helper-assignment-countdown ${countdown.status}">⏰ ${countdown.text}</div>
        ${manualControls}
      </a>
    `;
  }).join('');

  // 檢查並創建24小時內到期作業的通知
  await checkUrgentAssignments(sortedAssignments, now);

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

  // 為編輯按鈕添加點擊事件
  listContainer.querySelectorAll('.e3-helper-edit-assignment').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const eventId = e.target.dataset.eventId;
      const assignment = allAssignments.find(a => a.eventId === eventId);
      if (!assignment) return;

      // 打開模態框並填入現有資料
      const modal = document.getElementById('e3-helper-add-assignment-modal');
      const modalTitle = document.getElementById('e3-helper-modal-title');
      const submitText = document.getElementById('e3-helper-modal-submit-text');
      const editIdInput = document.getElementById('e3-helper-edit-assignment-id');

      modalTitle.textContent = '✏️ 編輯作業';
      submitText.textContent = '💾 儲存';
      editIdInput.value = eventId;

      // 更新課程選項列表
      await updateCourseOptions();

      // 填入表單
      document.getElementById('e3-helper-assignment-name').value = assignment.name;

      // 填入課程名稱
      const courseSelect = document.getElementById('e3-helper-assignment-course-select');
      const courseCustomInput = document.getElementById('e3-helper-assignment-course-custom');
      const assignmentCourse = assignment.course || '';

      // 檢查課程名稱是否在選單中
      let courseFound = false;
      for (let option of courseSelect.options) {
        if (option.value === assignmentCourse) {
          courseSelect.value = assignmentCourse;
          courseFound = true;
          break;
        }
      }

      // 如果課程不在選單中，使用「自行輸入」
      if (!courseFound && assignmentCourse) {
        courseSelect.value = '__custom__';
        courseCustomInput.value = assignmentCourse;
        courseCustomInput.style.display = 'block';
      } else {
        courseCustomInput.style.display = 'none';
        courseCustomInput.value = '';
      }

      // 轉換時間戳為日期和時間
      const deadline = new Date(assignment.deadline);
      const dateStr = deadline.toISOString().split('T')[0];
      const timeStr = `${deadline.getHours().toString().padStart(2, '0')}:${deadline.getMinutes().toString().padStart(2, '0')}`;

      document.getElementById('e3-helper-assignment-date').value = dateStr;
      document.getElementById('e3-helper-assignment-time').value = timeStr;

      modal.style.display = 'flex';
    });
  });

  // 為刪除按鈕添加點擊事件
  listContainer.querySelectorAll('.e3-helper-delete-assignment').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const eventId = e.target.dataset.eventId;
      const assignment = allAssignments.find(a => a.eventId === eventId);
      if (!assignment) return;

      // 檢查是否為同步作業
      const isManual = assignment.isManual || eventId.startsWith('manual-');
      const confirmMessage = isManual
        ? `確定要刪除「${assignment.name}」嗎？此操作無法復原。`
        : `確定要刪除「${assignment.name}」嗎？\n\n⚠️ 注意：這是從 E3 同步的作業，刪除後下次同步時可能會再次出現。`;

      // 確認刪除
      if (confirm(confirmMessage)) {
        // 從陣列中移除
        const index = allAssignments.findIndex(a => a.eventId === eventId);
        if (index !== -1) {
          allAssignments.splice(index, 1);
          await saveAssignments();
          await updateSidebarContent();
          showTemporaryMessage('作業已刪除');
        }
      }
    });
  });
}

// 檢查24小時內到期的緊急作業並創建通知
async function checkUrgentAssignments(assignments, currentTime) {
  // 從 storage 獲取現有的緊急作業通知
  const storage = await chrome.storage.local.get(['urgentAssignmentNotifications']);
  let urgentNotifications = storage.urgentAssignmentNotifications || [];

  // 找出24小時內到期且未繳交的作業
  const urgentAssignments = assignments.filter(assignment => {
    const timeUntilDeadline = assignment.deadline - currentTime;
    const manualStatus = assignment.manualStatus || 'pending';
    return timeUntilDeadline > 0 &&
           timeUntilDeadline <= 24 * 60 * 60 * 1000 &&
           manualStatus !== 'submitted';
  });

  console.log(`E3 Helper: 發現 ${urgentAssignments.length} 個24小時內到期的緊急作業`);

  // 為每個緊急作業創建或更新通知
  urgentAssignments.forEach(assignment => {
    // 檢查是否已經有這個作業的未讀通知
    const existingNotification = urgentNotifications.find(n => n.eventId === assignment.eventId);

    if (!existingNotification) {
      // 創建新通知
      const timeUntilDeadline = assignment.deadline - currentTime;
      const hoursLeft = Math.floor(timeUntilDeadline / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60));

      let timeText = '';
      if (hoursLeft > 0) {
        timeText = `還有 ${hoursLeft} 小時 ${minutesLeft} 分鐘`;
      } else {
        timeText = `還有 ${minutesLeft} 分鐘`;
      }

      const notification = {
        id: `urgent-${assignment.eventId}-${currentTime}`,
        eventId: assignment.eventId,
        type: 'urgent',
        title: assignment.name,
        message: `${timeText}截止 - ${assignment.course || '(未知課程)'}`,
        url: assignment.url,
        timestamp: currentTime,
        read: false
      };

      urgentNotifications.push(notification);
      console.log(`E3 Helper: 創建緊急作業通知：${assignment.name}`);
    }
  });

  // 移除已經過期或已繳交的緊急通知
  const beforeCount = urgentNotifications.length;
  urgentNotifications = urgentNotifications.filter(notification => {
    const assignment = assignments.find(a => a.eventId === notification.eventId);
    if (!assignment) return false;

    const timeUntilDeadline = assignment.deadline - currentTime;
    const manualStatus = assignment.manualStatus || 'pending';

    // 保留未到期且未繳交的通知
    return timeUntilDeadline > 0 && manualStatus !== 'submitted';
  });
  const afterCount = urgentNotifications.length;

  if (beforeCount !== afterCount) {
    console.log(`E3 Helper: 移除 ${beforeCount - afterCount} 個過期或已繳交的緊急通知`);
  }

  // 儲存更新後的緊急通知
  await chrome.storage.local.set({ urgentAssignmentNotifications: urgentNotifications });

  // 更新通知 badge
  await updateNotificationBadge();
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

      // 更新項目樣式 - 保留手動標記的已繳交狀態
      const manualStatus = assignment.manualStatus || 'pending';
      const statusClass = manualStatus === 'submitted' ? 'completed' : countdown.status;
      item.className = `e3-helper-assignment-item ${statusClass}`;
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

// 載入課程列表（支援當前課程和歷年課程）
async function loadCourseList(classification = 'inprogress') {
  const select = document.getElementById('e3-helper-course-select');
  const statsContainer = document.querySelector('.e3-helper-grade-stats');

  if (!select) return;

  const loadingText = classification === 'past' ? '載入歷年課程中...' : '載入課程中...';
  statsContainer.innerHTML = `<div class="e3-helper-loading">${loadingText}</div>`;

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
          classification: classification, // 'inprogress' 或 'past'
          sort: 'fullname'
        }
      }])
    });

    const data = await response.json();
    console.log(`E3 Helper: 課程列表回應 (${classification}):`, data);

    if (data && data[0] && data[0].data && data[0].data.courses) {
      const courses = data[0].data.courses;

      // 根據分類決定是否合併或替換
      if (classification === 'past') {
        // 合併歷年課程到現有列表（避免重複）
        courses.forEach(course => {
          if (!allCourses.find(c => c.id === course.id)) {
            allCourses.push(course);
          }
        });
        console.log(`E3 Helper: 已載入 ${courses.length} 個歷年課程，總共 ${allCourses.length} 個課程`);
      } else {
        // 替換為當前課程
        allCourses = courses;
        console.log(`E3 Helper: 已載入 ${allCourses.length} 個當前課程`);
      }

      // 清空並重新填充選單
      select.innerHTML = '<option value="">選擇課程...</option>';
      allCourses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.fullname;
        select.appendChild(option);
      });

      // 綁定選擇事件
      select.removeEventListener('change', handleCourseSelect); // 避免重複綁定
      select.addEventListener('change', handleCourseSelect);

      statsContainer.innerHTML = '<div class="e3-helper-loading">請選擇課程</div>';

      // 儲存到 storage
      await chrome.storage.local.set({ courses: allCourses });
    } else {
      statsContainer.innerHTML = '<div class="e3-helper-loading">無法載入課程列表</div>';
    }
  } catch (e) {
    console.error('E3 Helper: 載入課程列表失敗:', e);
    statsContainer.innerHTML = '<div class="e3-helper-loading">載入失敗</div>';
  }
}

// 處理課程選擇事件
function handleCourseSelect(e) {
  const statsContainer = document.querySelector('.e3-helper-grade-stats');
  const courseId = e.target.value;
  if (courseId) {
    loadCourseGrades(courseId);
  } else {
    statsContainer.innerHTML = '<div class="e3-helper-loading">請選擇課程</div>';
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

// ==================== 課程列表功能 ====================

// 更新上次檢測時間顯示
function updateLastCheckTimeDisplay() {
  const timeDisplay = document.getElementById('e3-helper-last-check-time');
  if (!timeDisplay) return;

  chrome.storage.local.get(['lastParticipantCheckTime'], (result) => {
    const lastCheckTime = result.lastParticipantCheckTime;
    if (!lastCheckTime) {
      timeDisplay.textContent = '尚未檢測';
      return;
    }

    const now = Date.now();
    const diff = now - lastCheckTime;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) {
      timeDisplay.textContent = '剛剛檢測';
    } else if (minutes < 60) {
      timeDisplay.textContent = `${minutes} 分鐘前檢測`;
    } else if (hours < 24) {
      timeDisplay.textContent = `${hours} 小時前檢測`;
    } else {
      const days = Math.floor(hours / 24);
      timeDisplay.textContent = `${days} 天前檢測`;
    }
  });
}

// 載入所有課程列表
async function loadAllCoursesList() {
  console.log('E3 Helper: 載入課程列表');

  const container = document.getElementById('e3-helper-course-list-container');
  if (!container) return;

  container.innerHTML = '<div class="e3-helper-loading">載入課程中...</div>';

  try {
    // 從 storage 載入課程和統計資料
    const storage = await chrome.storage.local.get(['courses', 'participantCounts', 'lastParticipantCheckTime']);
    let courses = storage.courses || [];
    const participantCounts = storage.participantCounts || {};
    const lastCheckTime = storage.lastParticipantCheckTime || 0;

    // 更新上次檢測時間顯示
    updateLastCheckTimeDisplay();

    // 自動檢測邏輯：如果距離上次檢測超過 30 分鐘，自動執行一次檢測
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTime;
    const AUTO_CHECK_INTERVAL = 30 * 60 * 1000; // 30 分鐘

    if (timeSinceLastCheck > AUTO_CHECK_INTERVAL && courses.length > 0) {
      console.log('E3 Helper: 距離上次檢測已超過 30 分鐘，自動執行檢測...');

      // 異步執行，不阻塞 UI
      checkAllCoursesParticipants().then(() => {
        console.log('E3 Helper: 自動檢測完成');
        // 重新載入列表以顯示更新後的數據
        loadAllCoursesList();
      }).catch(error => {
        console.error('E3 Helper: 自動檢測失敗', error);
      });
    }

    if (courses.length === 0) {
      container.innerHTML = `
        <div class="e3-helper-welcome-message">
          <h3>📚 尚無課程資料</h3>
          <p>請先點擊上方的 🔄 同步按鈕來載入課程資料。</p>
        </div>
      `;
      return;
    }

    // 將課程分組：正在進行的課程
    allCourses = courses;
    console.log(`E3 Helper: 載入了 ${courses.length} 個課程`);

    // 生成課程列表 HTML
    const courseListHTML = courses.map(course => {
      const participantData = participantCounts[course.id];
      const participantCount = participantData ? participantData.count : '未知';

      return `
        <div class="e3-helper-course-item" data-course-id="${course.id}" style="padding: 12px; border-bottom: 1px solid #e9ecef; cursor: pointer; transition: background 0.2s; position: relative;"
             onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
          <div style="padding-right: 55px; margin-bottom: 6px;">
            <div style="font-size: 13px; font-weight: 600; color: #495057; line-height: 1.4; word-wrap: break-word;">${course.fullname}</div>
            <span style="position: absolute; right: 12px; top: 12px; font-size: 11px; color: #6c757d; background: #e9ecef; padding: 2px 6px; border-radius: 3px; white-space: nowrap;">👥 ${participantCount}</span>
          </div>
          ${course.summary ? `<div style="font-size: 11px; color: #6c757d; line-height: 1.3; margin-top: 4px;">${course.summary.replace(/<[^>]*>/g, '').substring(0, 60)}${course.summary.length > 60 ? '...' : ''}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = courseListHTML;

    // 綁定課程點擊事件
    container.querySelectorAll('.e3-helper-course-item').forEach(item => {
      item.addEventListener('click', () => {
        const courseId = item.dataset.courseId;
        const course = courses.find(c => c.id === parseInt(courseId));
        if (course) {
          showCourseDetail(course);
        }
      });
    });

    // 綁定重新載入按鈕事件
    const refreshBtn = document.getElementById('e3-helper-refresh-courses');
    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = 'true';
      refreshBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        refreshBtn.textContent = '🔄 載入中...';
        refreshBtn.disabled = true;

        // 重新從 API 載入課程
        await loadCourseList('inprogress');

        // 重新顯示課程列表
        await loadAllCoursesList();

        refreshBtn.textContent = '🔄 重新載入';
        refreshBtn.disabled = false;
      });
    }

    // 綁定檢查成員變動按鈕事件
    const checkParticipantsBtn = document.getElementById('e3-helper-check-participants-btn');
    if (checkParticipantsBtn && !checkParticipantsBtn.dataset.bound) {
      checkParticipantsBtn.dataset.bound = 'true';
      checkParticipantsBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const originalText = checkParticipantsBtn.textContent;
        checkParticipantsBtn.textContent = '⏳ 檢查中...';
        checkParticipantsBtn.disabled = true;

        try {
          console.log('E3 Helper: 手動觸發成員檢測');
          const changes = await checkAllCoursesParticipants();

          if (changes && changes.length > 0) {
            checkParticipantsBtn.textContent = `✓ 發現 ${changes.length} 個變動`;
            setTimeout(() => {
              checkParticipantsBtn.textContent = originalText;
            }, 3000);
          } else {
            checkParticipantsBtn.textContent = '✓ 無變動';
            setTimeout(() => {
              checkParticipantsBtn.textContent = originalText;
            }, 3000);
          }

          // 重新載入課程列表以更新人數
          await loadAllCoursesList();
        } catch (error) {
          console.error('E3 Helper: 檢查成員變動失敗', error);
          checkParticipantsBtn.textContent = '✗ 檢查失敗';
          setTimeout(() => {
            checkParticipantsBtn.textContent = originalText;
          }, 3000);
        } finally {
          checkParticipantsBtn.disabled = false;
        }
      });
    }

  } catch (error) {
    console.error('E3 Helper: 載入課程列表失敗:', error);
    container.innerHTML = `
      <div class="e3-helper-welcome-message">
        <h3>❌ 載入失敗</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// 顯示課程詳細資訊
async function showCourseDetail(course) {
  console.log('E3 Helper: 顯示課程詳情:', course.fullname);

  // 隱藏列表，顯示詳情
  const courseListArea = document.querySelector('.e3-helper-course-list-area');
  const courseDetailArea = document.querySelector('.e3-helper-course-detail-area');
  if (courseListArea) courseListArea.style.display = 'none';
  if (courseDetailArea) courseDetailArea.style.display = 'block';

  // 填充課程標題
  const titleEl = document.getElementById('e3-helper-course-title');
  const teacherEl = document.getElementById('e3-helper-course-teacher');
  if (titleEl) titleEl.textContent = course.fullname;
  if (teacherEl) teacherEl.textContent = course.summary ? course.summary.replace(/<[^>]*>/g, '').substring(0, 100) : '';

  // 預設顯示統計頁面
  showCourseStats(course);

  // 綁定返回按鈕事件（每次都重新綁定，確保課程資訊正確）
  const backBtn = document.getElementById('e3-helper-back-to-list');
  if (backBtn) {
    // 移除舊的事件監聽器（如果有）
    const newBackBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);

    // 綁定新的事件
    newBackBtn.addEventListener('click', () => {
      if (courseListArea) courseListArea.style.display = 'block';
      if (courseDetailArea) courseDetailArea.style.display = 'none';
    });
  }

  // 綁定功能 tab 切換事件（每次都重新綁定，確保課程資訊正確）
  document.querySelectorAll('.e3-helper-course-function-tab').forEach(tab => {
    // 移除舊的事件監聽器
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);

    // 綁定新的事件
    newTab.addEventListener('click', () => {
      // 更新 tab 樣式
      document.querySelectorAll('.e3-helper-course-function-tab').forEach(t => {
        if (t.classList) t.classList.remove('active');
        if (t.style) t.style.borderBottom = '2px solid transparent';
      });

      if (newTab.classList) newTab.classList.add('active');
      if (newTab.style) newTab.style.borderBottom = '2px solid #667eea';

      // 切換內容
      const functionType = newTab.dataset.function;
      const statsContent = document.getElementById('e3-helper-course-stats-content');
      const gradesContent = document.getElementById('e3-helper-course-grades-content');

      if (functionType === 'stats') {
        if (statsContent) statsContent.style.display = 'block';
        if (gradesContent) gradesContent.style.display = 'none';
        showCourseStats(course);
      } else if (functionType === 'grades') {
        if (statsContent) statsContent.style.display = 'none';
        if (gradesContent) gradesContent.style.display = 'block';
        loadCourseGrades(course.id);
      }
    });
  });
}

// 顯示課程統計資訊
async function showCourseStats(course) {
  console.log('E3 Helper: 顯示課程統計:', course.fullname);

  const statsContent = document.getElementById('e3-helper-course-stats-content');
  if (!statsContent) return;

  statsContent.innerHTML = '<div class="e3-helper-loading">載入統計資料中...</div>';

  try {
    // 獲取課程統計資料
    const storage = await chrome.storage.local.get(['participantCounts', 'participantChangeNotifications']);
    const participantCounts = storage.participantCounts || {};
    const participantNotifications = storage.participantChangeNotifications || [];

    const participantData = participantCounts[course.id];
    const courseChanges = participantNotifications.filter(n => n.courseId === course.id).slice(0, 10);

    // 生成統計 HTML
    let statsHTML = `
      <div style="padding: 16px;">
        <!-- 基本資訊 -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">課程基本資訊</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <div style="font-size: 11px; opacity: 0.8;">課程代碼</div>
              <div style="font-size: 16px; font-weight: 600; margin-top: 4px;">${course.id}</div>
            </div>
            <div>
              <div style="font-size: 11px; opacity: 0.8;">目前人數</div>
              <div style="font-size: 16px; font-weight: 600; margin-top: 4px;">${participantData ? participantData.count : '未檢測'} 人</div>
            </div>
          </div>
        </div>

        <!-- 成員變動歷史 -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; font-weight: 600; color: #495057; margin-bottom: 8px;">📊 成員變動歷史</div>
    `;

    if (courseChanges.length > 0) {
      statsHTML += `
        <div style="background: #f8f9fa; border-radius: 8px; padding: 12px;">
      `;

      courseChanges.forEach(change => {
        const timeAgo = getTimeAgoText(change.timestamp);
        const diffText = change.diff > 0 ? `<span style="color: #28a745;">+${change.diff}</span>` : `<span style="color: #dc3545;">${change.diff}</span>`;

        statsHTML += `
          <div style="padding: 8px 0; border-bottom: 1px solid #dee2e6; last-child:border-bottom: none;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 12px; color: #495057;">${change.oldCount} → ${change.newCount}</span>
                <span style="font-size: 12px; margin-left: 8px;">(${diffText} 人)</span>
              </div>
              <span style="font-size: 11px; color: #6c757d;">${timeAgo}</span>
            </div>
          </div>
        `;
      });

      statsHTML += `
        </div>
      `;
    } else {
      statsHTML += `
        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; color: #6c757d; font-size: 12px;">
          尚無成員變動記錄
        </div>
      `;
    }

    statsHTML += `
        </div>

        <!-- 成員列表區域 -->
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 13px; font-weight: 600; color: #495057;">👥 成員列表</div>
            <button id="e3-helper-show-members-btn" data-course-id="${course.id}"
                    style="background: #667eea; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
              顯示成員
            </button>
          </div>
          <div id="e3-helper-members-container" style="display: none;">
            <div class="e3-helper-loading">載入成員中...</div>
          </div>
        </div>

        <!-- 快速操作 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button onclick="window.open('https://e3p.nycu.edu.tw/course/view.php?id=${course.id}', '_blank')"
                  style="background: white; border: 1px solid #dee2e6; color: #495057; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s;"
                  onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
            📖 開啟課程頁面
          </button>
          <button onclick="window.open('https://e3p.nycu.edu.tw/user/index.php?id=${course.id}&scopec=1', '_blank')"
                  style="background: white; border: 1px solid #dee2e6; color: #495057; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s;"
                  onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
            👥 在新分頁查看
          </button>
        </div>
      </div>
    `;

    statsContent.innerHTML = statsHTML;

    // 綁定顯示成員按鈕事件
    const showMembersBtn = document.getElementById('e3-helper-show-members-btn');
    if (showMembersBtn) {
      showMembersBtn.addEventListener('click', async () => {
        const membersContainer = document.getElementById('e3-helper-members-container');

        if (membersContainer.style.display === 'none') {
          membersContainer.style.display = 'block';
          showMembersBtn.textContent = '隱藏成員';

          // 載入成員列表
          await loadCourseMembers(course.id, course.fullname);
        } else {
          membersContainer.style.display = 'none';
          showMembersBtn.textContent = '顯示成員';
        }
      });
    }

  } catch (error) {
    console.error('E3 Helper: 載入課程統計失敗:', error);
    statsContent.innerHTML = `
      <div style="padding: 16px; text-align: center; color: #dc3545;">
        載入失敗<br>
        <small style="color: #6c757d;">${error.message}</small>
      </div>
    `;
  }
}

// 載入課程成員列表
async function loadCourseMembers(courseId, courseName) {
  console.log('E3 Helper: 載入課程成員:', courseName);

  const membersContainer = document.getElementById('e3-helper-members-container');
  if (!membersContainer) return;

  membersContainer.innerHTML = '<div class="e3-helper-loading">載入成員中...</div>';

  try {
    // 獲取成員頁面（使用 perpage=5000 來獲取所有成員，避免分頁問題）
    const participantsUrl = `https://e3p.nycu.edu.tw/user/index.php?id=${courseId}&scopec=1&perpage=5000`;
    const response = await fetch(participantsUrl, { credentials: 'include' });
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 解析成員列表 - 方法1: 從表格行解析
    const members = [];
    const memberRows = doc.querySelectorAll('tbody tr');

    memberRows.forEach(row => {
      // E3 的成員表格使用 th 而不是 td 作為第一欄
      const nameCell = row.querySelector('th.cell.c1, td.cell.c1');
      const roleCell = row.querySelector('th.cell.c2, td.cell.c2');
      const emailCell = row.querySelector('th.cell.c3, td.cell.c3');

      if (nameCell) {
        const nameLink = nameCell.querySelector('a[href*="/user/view.php"]');
        if (nameLink) {
          // 提取姓名（移除前面的大頭照 alt 文字）
          let name = nameLink.textContent.trim();
          // 移除可能的換行和多餘空白
          name = name.replace(/\s+/g, ' ').trim();

          const role = roleCell ? roleCell.textContent.trim() : '學生';
          const email = emailCell ? emailCell.textContent.trim() : '';

          // 排除 role 為 "No roles" 的成員（退課學生）
          // 注意：E3 顯示的是 "No roles"（首字母大寫，有空格）
          if (name && role !== 'No roles') {
            members.push({ name, role, email });
          }
        }
      }
    });

    console.log(`E3 Helper: 方法1 找到 ${members.length} 位成員`);

    // 如果沒找到成員，嘗試直接從所有用戶連結解析
    if (members.length === 0) {
      console.log('E3 Helper: 未找到成員（方法1），嘗試方法2...');

      // 方法2：直接找所有用戶連結
      const userLinks = doc.querySelectorAll('a[href*="/user/view.php"]');
      userLinks.forEach(link => {
        let name = link.textContent.trim();
        // 移除可能的換行和多餘空白
        name = name.replace(/\s+/g, ' ').trim();

        if (name && !name.includes('img')) {
          // 嘗試從父元素的兄弟元素找角色
          const parentRow = link.closest('tr');
          let role = '學生';
          let email = '';

          if (parentRow) {
            const cells = parentRow.querySelectorAll('td, th');
            if (cells.length > 2) {
              role = cells[2]?.textContent.trim() || '學生';
            }
            if (cells.length > 3) {
              email = cells[3]?.textContent.trim() || '';
            }
          }

          // 排除 role 為 "No roles" 的成員（退課學生）
          if (role !== 'No roles') {
            members.push({ name, role, email });
          }
        }
      });
    }

    console.log(`E3 Helper: 找到 ${members.length} 位成員`);

    // 顯示成員列表
    if (members.length > 0) {
      let membersHTML = `
        <div style="background: #f8f9fa; border-radius: 8px; padding: 12px; max-height: 400px; overflow-y: auto;">
      `;

      // 按角色分組
      const roleGroups = {};
      members.forEach(member => {
        const role = member.role || '學生';
        if (!roleGroups[role]) {
          roleGroups[role] = [];
        }
        roleGroups[role].push(member);
      });

      // 顯示每個角色組
      Object.keys(roleGroups).sort().forEach(role => {
        membersHTML += `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: 600; color: #6c757d; margin-bottom: 8px; text-transform: uppercase;">
              ${role} (${roleGroups[role].length})
            </div>
        `;

        roleGroups[role].forEach(member => {
          membersHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border-radius: 4px; margin-bottom: 6px; border: 1px solid #dee2e6;">
              <div>
                <div style="font-size: 12px; color: #495057; font-weight: 500;">${member.name}</div>
                ${member.email ? `<div style="font-size: 10px; color: #6c757d; margin-top: 2px;">${member.email}</div>` : ''}
              </div>
            </div>
          `;
        });

        membersHTML += `</div>`;
      });

      membersHTML += `</div>`;
      membersContainer.innerHTML = membersHTML;
    } else {
      membersContainer.innerHTML = `
        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; color: #6c757d; font-size: 12px;">
          無法載入成員列表<br>
          <small style="margin-top: 4px; display: block;">請點擊「在新分頁查看」按鈕在 E3 網站上查看</small>
        </div>
      `;
    }

  } catch (error) {
    console.error('E3 Helper: 載入成員列表失敗:', error);
    membersContainer.innerHTML = `
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; color: #dc3545; font-size: 12px;">
        載入失敗<br>
        <small style="color: #6c757d; margin-top: 4px; display: block;">${error.message}</small>
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

// ==================== 檔案下載功能（教材、影片、公告）====================

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

// 載入通知列表
async function loadNotifications() {
  console.log('E3 Helper: 開始載入通知...');

  const notificationListElement = document.getElementById('e3-helper-notification-list');
  if (!notificationListElement) return;

  // 從 storage 獲取通知（包括作業通知、成員變動通知和緊急作業通知）
  const storage = await chrome.storage.local.get(['notifications', 'participantChangeNotifications', 'urgentAssignmentNotifications']);
  const assignmentNotifications = storage.notifications || [];
  const participantNotifications = storage.participantChangeNotifications || [];
  const urgentNotifications = storage.urgentAssignmentNotifications || [];

  // 合併所有通知
  const allNotifications = [...assignmentNotifications, ...participantNotifications, ...urgentNotifications];

  if (allNotifications.length === 0) {
    notificationListElement.innerHTML = `
      <div class="e3-helper-welcome-message">
        <h3>🔔 目前沒有通知</h3>
        <p>當有新作業上架或課程成員變動時，這裡會顯示通知。</p>
      </div>
    `;
    return;
  }

  // 按時間排序（最新的在前）
  allNotifications.sort((a, b) => b.timestamp - a.timestamp);

  // 生成通知列表 HTML
  const notificationHTML = allNotifications.map(notification => {
    const timeAgo = getTimeAgoText(notification.timestamp);
    const isUnread = !notification.read;
    const unreadBadge = isUnread ? '<span style="display: inline-block; width: 8px; height: 8px; background: #dc3545; border-radius: 50%; margin-right: 6px;"></span>' : '';

    let icon = '📝';
    let typeText = '新作業';
    let title = notification.title || '';
    let message = notification.message || '';
    let url = notification.url || '';

    if (notification.type === 'urgent') {
      icon = '🚨';
      typeText = '緊急作業';
    } else if (notification.type === 'deadline') {
      icon = '⏰';
      typeText = '截止提醒';
    } else if (notification.type === 'announcement') {
      icon = '📢';
      typeText = '公告';
    } else if (notification.type === 'participant-change') {
      icon = '📊';
      typeText = '成員變動';
      const changeText = notification.diff > 0 ? `增加 ${notification.diff} 人` : `減少 ${Math.abs(notification.diff)} 人`;
      title = notification.courseName;
      message = `${changeText} (${notification.oldCount} → ${notification.newCount})`;
      url = `https://e3p.nycu.edu.tw/user/index.php?id=${notification.courseId}&scopec=1`;
    }

    return `
      <div class="e3-helper-assignment-item ${isUnread ? 'unread' : ''}"
           style="cursor: pointer; opacity: ${isUnread ? '1' : '0.7'};"
           data-notification-id="${notification.id}"
           data-notification-type="${notification.type || 'assignment'}"
           data-url="${url}">
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          ${unreadBadge}
          <span style="font-size: 12px;">${icon} ${typeText}</span>
          <span style="margin-left: auto; font-size: 11px; color: #999;">${timeAgo}</span>
        </div>
        <div style="font-weight: ${isUnread ? '600' : '400'}; margin-bottom: 4px;">
          ${title}
        </div>
        <div style="font-size: 12px; color: #666;">
          ${message}
        </div>
      </div>
    `;
  }).join('');

  notificationListElement.innerHTML = notificationHTML;

  // 綁定點擊事件
  notificationListElement.querySelectorAll('.e3-helper-assignment-item').forEach(item => {
    item.addEventListener('click', async () => {
      const notificationId = item.dataset.notificationId;
      const notificationType = item.dataset.notificationType;
      const url = item.dataset.url;

      // 標記為已讀（根據類型選擇正確的 storage key）
      if (notificationType === 'participant-change') {
        const storage = await chrome.storage.local.get(['participantChangeNotifications']);
        const notifications = storage.participantChangeNotifications || [];
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
          await chrome.storage.local.set({ participantChangeNotifications: notifications });
          await updateNotificationBadge();
        }
      } else if (notificationType === 'urgent') {
        const storage = await chrome.storage.local.get(['urgentAssignmentNotifications']);
        const notifications = storage.urgentAssignmentNotifications || [];
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
          await chrome.storage.local.set({ urgentAssignmentNotifications: notifications });
          await updateNotificationBadge();
        }
      } else {
        const storage = await chrome.storage.local.get(['notifications']);
        const notifications = storage.notifications || [];
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
          await chrome.storage.local.set({ notifications });
          await updateNotificationBadge();
        }
      }

      // 如果有 URL，打開連結
      if (url) {
        window.open(url, '_blank');
      }
    });
  });

  console.log(`E3 Helper: 通知載入完成，共 ${allNotifications.length} 個（作業: ${assignmentNotifications.length}, 成員變動: ${participantNotifications.length}, 緊急: ${urgentNotifications.length}）`);
}

// 標記所有通知為已讀
async function markAllNotificationsAsRead() {
  const storage = await chrome.storage.local.get(['notifications', 'participantChangeNotifications', 'urgentAssignmentNotifications']);
  const assignmentNotifications = storage.notifications || [];
  const participantNotifications = storage.participantChangeNotifications || [];
  const urgentNotifications = storage.urgentAssignmentNotifications || [];

  // 標記所有通知為已讀
  assignmentNotifications.forEach(notification => {
    notification.read = true;
  });
  participantNotifications.forEach(notification => {
    notification.read = true;
  });
  urgentNotifications.forEach(notification => {
    notification.read = true;
  });

  await chrome.storage.local.set({
    notifications: assignmentNotifications,
    participantChangeNotifications: participantNotifications,
    urgentAssignmentNotifications: urgentNotifications
  });

  // 更新 badge 顯示
  await updateNotificationBadge();

  console.log('E3 Helper: 所有通知已標記為已讀');
}

// 更新通知 badge 計數
async function updateNotificationBadge() {
  const storage = await chrome.storage.local.get(['notifications', 'participantChangeNotifications', 'urgentAssignmentNotifications']);
  const assignmentNotifications = storage.notifications || [];
  const participantNotifications = storage.participantChangeNotifications || [];
  const urgentNotifications = storage.urgentAssignmentNotifications || [];

  // 計算未讀通知數量（合併所有類型的通知）
  const unreadCount = assignmentNotifications.filter(n => !n.read).length +
                      participantNotifications.filter(n => !n.read).length +
                      urgentNotifications.filter(n => !n.read).length;

  // 更新側欄 badge
  const badge = document.getElementById('e3-helper-notification-badge');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  // 更新浮動按鈕 badge
  const toggleBadge = document.getElementById('e3-helper-toggle-badge');
  if (toggleBadge) {
    if (unreadCount > 0) {
      toggleBadge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
      toggleBadge.style.display = 'flex';
    } else {
      toggleBadge.style.display = 'none';
    }
  }

  // 通知 background script 更新擴充功能圖標 badge
  chrome.runtime.sendMessage({
    action: 'updateBadge',
    count: unreadCount
  }).catch(err => {
    console.log('E3 Helper: 無法與 background script 通訊（可能正在重新載入）');
  });
}

// 輔助函數：計算時間差文字
function getTimeAgoText(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  if (days < 7) return `${days} 天前`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
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

// ==================== 課程成員檢測功能 ====================

// 獲取課程參與者數量
async function fetchCourseParticipants(courseId, courseName) {
  try {
    // 使用 perpage=5000 來確保獲取所有成員的總數
    const participantsUrl = `https://e3p.nycu.edu.tw/user/index.php?id=${courseId}&scopec=1&perpage=5000`;

    const response = await fetch(participantsUrl, {
      credentials: 'include'
    });

    if (!response.ok) {
      console.warn(`E3 Helper: 無法訪問課程 ${courseId} 成員頁面: HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 實際計算成員數量，排除 role 為 "No roles" 的成員（退課學生）
    let participantCount = 0;
    const memberRows = doc.querySelectorAll('tbody tr');

    memberRows.forEach(row => {
      const roleCell = row.querySelector('th.cell.c2, td.cell.c2');
      if (roleCell) {
        const role = roleCell.textContent.trim();
        // 排除 "No roles" 的成員（表示已退課）
        // 注意：E3 顯示的是 "No roles"（首字母大寫，有空格）
        if (role && role !== 'No roles') {
          participantCount++;
        }
      }
    });

    console.log(`E3 Helper: 實際計算成員數量: ${participantCount} (已排除 No roles)`);

    // 如果無法從表格解析，回退到其他方法
    if (participantCount === 0) {
      // 方法 1: 從 data-table-total-rows 屬性直接讀取
      const tableContainer = doc.querySelector('[data-table-total-rows]');
      if (tableContainer) {
        const totalRows = tableContainer.getAttribute('data-table-total-rows');
        if (totalRows) {
          participantCount = parseInt(totalRows, 10);
          console.log(`E3 Helper: 從 data-table-total-rows 讀取: ${participantCount} (警告: 可能包含退課學生)`);
        }
      }

      // 方法 2: 從「找到 X 位參與者」文字解析
      if (participantCount === 0) {
        const participantCountEl = doc.querySelector('[data-region="participant-count"]');
        if (participantCountEl) {
          const text = participantCountEl.textContent.trim();
          const match = text.match(/(\d+)/);
          if (match) {
            participantCount = parseInt(match[1], 10);
            console.log(`E3 Helper: 從參與者文字解析: ${participantCount} (警告: 可能包含退課學生)`);
          }
        }
      }

      // 方法 3: 從「選擇所有X個使用者」按鈕文字解析
      if (participantCount === 0) {
        const checkAllBtn = doc.querySelector('#checkall');
        if (checkAllBtn) {
          const value = checkAllBtn.value || checkAllBtn.textContent;
          const match = value.match(/(\d+)/);
          if (match) {
            participantCount = parseInt(match[1], 10);
            console.log(`E3 Helper: 從全選按鈕解析: ${participantCount} (警告: 可能包含退課學生)`);
          }
        }
      }
    }

    if (participantCount > 0) {
      console.log(`E3 Helper: ✓ 課程 ${courseName} (ID: ${courseId}) 目前有 ${participantCount} 位參與者`);
      return {
        courseId,
        courseName,
        count: participantCount,
        timestamp: Date.now()
      };
    }

    console.warn(`E3 Helper: ✗ 無法解析課程 ${courseId} 的參與者數量`);
    return null;

  } catch (error) {
    console.error(`E3 Helper: 獲取課程 ${courseId} 參與者時發生錯誤:`, error);
    return null;
  }
}

// 檢查所有課程的成員變動
async function checkAllCoursesParticipants() {
  console.log('E3 Helper: 開始檢查課程成員變動...');

  try {
    // 載入課程列表
    const storage = await chrome.storage.local.get(['courses', 'participantCounts']);
    const courses = storage.courses || [];
    const oldCounts = storage.participantCounts || {};

    if (courses.length === 0) {
      console.log('E3 Helper: 沒有課程資料，跳過成員檢測');
      return;
    }

    const newCounts = {};
    const changes = [];

    // 逐個檢查課程
    for (const course of courses) {
      const result = await fetchCourseParticipants(course.id, course.fullname);

      if (result) {
        newCounts[course.id] = result;

        // 檢查是否有變動
        const oldData = oldCounts[course.id];
        if (oldData && oldData.count !== result.count) {
          const diff = result.count - oldData.count;
          changes.push({
            courseId: course.id,
            courseName: course.fullname,
            oldCount: oldData.count,
            newCount: result.count,
            diff: diff,
            timestamp: Date.now()
          });
          console.log(`E3 Helper: 偵測到變動 - ${course.fullname}: ${oldData.count} → ${result.count} (${diff > 0 ? '+' : ''}${diff})`);
        }
      }

      // 避免請求過快，每個請求間隔 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 儲存新的數量和檢測時間
    await chrome.storage.local.set({
      participantCounts: newCounts,
      lastParticipantCheckTime: Date.now()
    });

    // 如果有變動，發送通知並儲存到通知中心
    if (changes.length > 0) {
      await saveParticipantChangeNotifications(changes);
      await updateNotificationBadge();

      // 發送桌面通知
      for (const change of changes) {
        const changeText = change.diff > 0 ? `增加 ${change.diff} 人` : `減少 ${Math.abs(change.diff)} 人`;
        chrome.runtime.sendMessage({
          action: 'showNotification',
          title: `📊 課程成員變動`,
          message: `${change.courseName}\n${changeText} (${change.oldCount} → ${change.newCount})`
        });
      }
    }

    console.log(`E3 Helper: 成員檢測完成，檢查了 ${courses.length} 個課程，發現 ${changes.length} 個變動`);

    // 更新顯示的檢測時間
    updateLastCheckTimeDisplay();

    return changes;

  } catch (error) {
    console.error('E3 Helper: 檢查課程成員時發生錯誤:', error);
    return [];
  }
}

// 儲存成員變動通知
async function saveParticipantChangeNotifications(changes) {
  try {
    const storage = await chrome.storage.local.get(['participantChangeNotifications']);
    const notifications = storage.participantChangeNotifications || [];

    // 加入新的變動通知
    for (const change of changes) {
      notifications.push({
        id: `participant-${change.courseId}-${change.timestamp}`,
        type: 'participant-change',
        courseId: change.courseId,
        courseName: change.courseName,
        oldCount: change.oldCount,
        newCount: change.newCount,
        diff: change.diff,
        timestamp: change.timestamp,
        read: false
      });
    }

    // 只保留最近 100 條通知
    const recentNotifications = notifications.slice(-100);

    await chrome.storage.local.set({ participantChangeNotifications: recentNotifications });
    console.log(`E3 Helper: 已儲存 ${changes.length} 個成員變動通知`);

  } catch (error) {
    console.error('E3 Helper: 儲存成員變動通知時發生錯誤:', error);
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
          ${isRead ? '' : '<div class="e3-helper-unread-dot"></div>'}
          <div class="e3-helper-announcement-title">
            ${typeIcon} ${item.title}
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

// 翻譯文字（使用 Gemini AI 或 Google Translate 免費 API）
async function translateText(text, sourceLang, targetLang) {
  try {
    console.log(`E3 Helper: 翻譯文字，從 ${sourceLang} 到 ${targetLang}`);

    // 檢查是否啟用 AI
    const storage = await chrome.storage.local.get(['aiSettings']);
    const aiSettings = storage.aiSettings || { enabled: false };

    if (aiSettings.enabled && aiSettings.geminiApiKey) {
      // 使用 Gemini API 翻譯
      console.log('E3 Helper: 使用 Gemini AI 翻譯');
      return await translateWithGemini(text, sourceLang, targetLang, aiSettings.geminiApiKey);
    } else {
      // 使用 Google Translate 免費服務
      console.log('E3 Helper: 使用 Google Translate 免費服務');
      return await translateWithGoogleFree(text, sourceLang, targetLang);
    }

  } catch (error) {
    console.error('E3 Helper: 翻譯失敗', error);
    throw new Error('翻譯失敗，請稍後再試');
  }
}

// 使用 Gemini API 翻譯
async function translateWithGemini(text, sourceLang, targetLang, apiKey) {
  const langMap = {
    'zh-CN': 'Traditional Chinese (Taiwan)',
    'zh-TW': 'Traditional Chinese (Taiwan)',
    'en': 'English'
  };

  const targetLanguage = langMap[targetLang] || targetLang;

  const prompt = `Translate the following text to ${targetLanguage}. IMPORTANT: Preserve all line breaks, paragraph structure, and formatting. Only translate the text content, do not add any explanations or notes.\n\n${text}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('E3 Helper: Gemini API 錯誤詳情', errorData);
      throw new Error(`Gemini API 錯誤: ${errorData.error?.message || response.status}`);
    }

    const data = await response.json();
    console.log('E3 Helper: Gemini 翻譯 API 完整回應', data);

    // 檢查回應結構
    if (!data.candidates || data.candidates.length === 0) {
      console.error('E3 Helper: Gemini API 無 candidates', data);
      if (data.promptFeedback?.blockReason) {
        throw new Error(`內容被過濾: ${data.promptFeedback.blockReason}`);
      }
      throw new Error('Gemini API 返回空結果');
    }

    const candidate = data.candidates[0];

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('E3 Helper: Gemini API candidate 無內容', candidate);
      if (candidate.finishReason) {
        throw new Error(`生成終止: ${candidate.finishReason}`);
      }
      throw new Error('Gemini API 返回格式錯誤');
    }

    const translatedText = candidate.content.parts[0].text.trim();
    console.log('E3 Helper: Gemini AI 翻譯完成');
    return translatedText;

  } catch (error) {
    console.error('E3 Helper: Gemini AI 翻譯失敗', error);
    throw error;
  }
}

// 翻譯 HTML 內容（保留連結和附件）
async function translateHTMLContent(container, sourceLang, targetLang) {
  // 創建臨時容器解析HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = container.innerHTML;

  // 提取所有需要翻譯的文字節點
  const textNodes = [];
  const textContents = [];

  function extractTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text && text.length > 0) {
        textNodes.push(node);
        textContents.push(text);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 跳過不需要翻譯的元素
      if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || node.tagName === 'CODE') {
        return;
      }
      // 遞歸處理子節點
      for (let child of node.childNodes) {
        extractTextNodes(child);
      }
    }
  }

  extractTextNodes(tempDiv);

  if (textContents.length === 0) {
    return container.innerHTML;
  }

  console.log(`E3 Helper: 找到 ${textContents.length} 個文字節點需要翻譯`);

  // 合併所有文字內容，用特殊分隔符分隔
  const delimiter = '\n<<<SEPARATOR>>>\n';
  const combinedText = textContents.join(delimiter);

  try {
    // 一次性翻譯所有文字
    const translatedCombined = await translateText(combinedText, sourceLang, targetLang);

    // 分割翻譯結果
    const translatedTexts = translatedCombined.split(delimiter);

    // 將翻譯結果放回對應的文字節點
    for (let i = 0; i < textNodes.length && i < translatedTexts.length; i++) {
      textNodes[i].textContent = translatedTexts[i].trim();
    }

    console.log('E3 Helper: 翻譯完成，HTML結構完整保留');
    return tempDiv.innerHTML;

  } catch (error) {
    console.error('E3 Helper: 翻譯失敗', error);
    throw error;
  }
}

// 使用 Google Translate 免費服務翻譯
async function translateWithGoogleFree(text, sourceLang, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`翻譯 API 錯誤: ${response.status}`);
  }

  const data = await response.json();

  // Google Translate API 返回的格式: [[["translated text", "original text", null, null, 1]], ...]
  if (!data || !data[0] || !Array.isArray(data[0])) {
    throw new Error('翻譯 API 返回格式錯誤');
  }

  // 組合所有翻譯片段
  const translatedText = data[0]
    .filter(item => item && item[0])
    .map(item => item[0])
    .join('');

  console.log('E3 Helper: Google Translate 翻譯完成');
  return translatedText;
}

// 使用 Gemini API 生成摘要
async function generateAISummary(text, apiKey) {
  const prompt = `Summarize in 100 words or less (no markdown):\n${text}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('E3 Helper: Gemini API 錯誤詳情', errorData);
      throw new Error(`Gemini API 錯誤: ${errorData.error?.message || response.status}`);
    }

    const data = await response.json();
    console.log('E3 Helper: Gemini API 完整回應', data);

    // 檢查回應結構
    if (!data.candidates || data.candidates.length === 0) {
      console.error('E3 Helper: Gemini API 無 candidates', data);
      // 檢查是否被安全過濾
      if (data.promptFeedback?.blockReason) {
        throw new Error(`內容被過濾: ${data.promptFeedback.blockReason}`);
      }
      throw new Error('Gemini API 返回空結果');
    }

    const candidate = data.candidates[0];

    // 檢查是否有內容
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('E3 Helper: Gemini API candidate 無內容', candidate);
      if (candidate.finishReason) {
        throw new Error(`生成終止: ${candidate.finishReason}`);
      }
      throw new Error('Gemini API 返回格式錯誤');
    }

    const summary = candidate.content.parts[0].text.trim();
    console.log('E3 Helper: Gemini AI 摘要完成');
    return summary;

  } catch (error) {
    console.error('E3 Helper: Gemini AI 摘要失敗', error);
    throw error;
  }
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="font-size: 12px; color: #6c757d; font-weight: 600;">📄 內容</div>
          <div style="display: flex; gap: 6px;">
            <button id="e3-helper-ai-summary-btn" data-item-id="${item.id}" style="background: #9c27b0; border: none; color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s ease; display: none;">
              🤖 AI摘要
            </button>
            <button id="e3-helper-translate-zh-btn" data-item-id="${item.id}" style="background: #4caf50; border: none; color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s ease; display: flex; align-items: center; gap: 4px;">
              🌐 中→英
            </button>
            <button id="e3-helper-translate-en-btn" data-item-id="${item.id}" style="background: #2196f3; border: none; color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s ease; display: flex; align-items: center; gap: 4px;">
              🌐 英→中
            </button>
            <button id="e3-helper-show-original-btn" data-item-id="${item.id}" style="background: #ff9800; border: none; color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s ease; display: none;">
              📄 顯示原文
            </button>
          </div>
        </div>
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

  // 檢查是否啟用 AI，顯示 AI 摘要按鈕
  const storage = await chrome.storage.local.get(['aiSettings']);
  const aiSettings = storage.aiSettings || { enabled: false };
  const aiSummaryBtn = document.getElementById('e3-helper-ai-summary-btn');
  if (aiSettings.enabled && aiSettings.geminiApiKey && aiSummaryBtn) {
    aiSummaryBtn.style.display = 'flex';
  }

  // 綁定翻譯和摘要按鈕事件
  let originalContent = null; // 儲存原文
  let currentTranslation = null; // 儲存當前翻譯

  const translateZhBtn = document.getElementById('e3-helper-translate-zh-btn');
  const translateEnBtn = document.getElementById('e3-helper-translate-en-btn');
  const showOriginalBtn = document.getElementById('e3-helper-show-original-btn');

  // AI 摘要按鈕事件
  if (aiSummaryBtn) {
    aiSummaryBtn.addEventListener('click', async () => {
      if (!contentContainer) return;

      // 儲存原文
      if (!originalContent) {
        originalContent = contentContainer.innerHTML;
      }

      // 顯示載入中
      aiSummaryBtn.disabled = true;
      aiSummaryBtn.innerHTML = '⏳ 摘要中...';

      try {
        const textContent = contentContainer.innerText || contentContainer.textContent;
        const summary = await generateAISummary(textContent, aiSettings.geminiApiKey);

        contentContainer.innerHTML = `<div style="white-space: pre-wrap; background: #f0f4ff; padding: 12px; border-radius: 6px; border-left: 3px solid #9c27b0;"><div style="font-weight: 600; color: #9c27b0; margin-bottom: 8px;">🤖 AI 摘要</div>${escapeHtml(summary)}</div>`;
        currentTranslation = contentContainer.innerHTML;

        // 顯示「顯示原文」按鈕
        showOriginalBtn.style.display = 'flex';
        aiSummaryBtn.innerHTML = '✅ 已摘要';

        setTimeout(() => {
          aiSummaryBtn.innerHTML = '🤖 AI摘要';
        }, 2000);
      } catch (error) {
        console.error('E3 Helper: AI 摘要失敗', error);
        alert('AI 摘要失敗：' + error.message);
        aiSummaryBtn.innerHTML = '🤖 AI摘要';
      } finally {
        aiSummaryBtn.disabled = false;
      }
    });
  }

  if (translateZhBtn) {
    translateZhBtn.addEventListener('click', async () => {
      if (!contentContainer) return;

      // 儲存原文
      if (!originalContent) {
        originalContent = contentContainer.innerHTML;
      }

      // 顯示載入中
      translateZhBtn.disabled = true;
      translateZhBtn.innerHTML = '⏳ 翻譯中...';

      try {
        const translatedHTML = await translateHTMLContent(contentContainer, 'zh-TW', 'en');
        contentContainer.innerHTML = translatedHTML;
        currentTranslation = contentContainer.innerHTML;

        // 顯示「顯示原文」按鈕
        showOriginalBtn.style.display = 'flex';
        translateZhBtn.innerHTML = '✅ 已翻譯';

        setTimeout(() => {
          translateZhBtn.innerHTML = '🌐 中→英';
        }, 2000);
      } catch (error) {
        console.error('E3 Helper: 翻譯失敗', error);
        alert('翻譯失敗：' + error.message);
        translateZhBtn.innerHTML = '🌐 中→英';
      } finally {
        translateZhBtn.disabled = false;
      }
    });
  }

  if (translateEnBtn) {
    translateEnBtn.addEventListener('click', async () => {
      if (!contentContainer) return;

      // 儲存原文
      if (!originalContent) {
        originalContent = contentContainer.innerHTML;
      }

      // 顯示載入中
      translateEnBtn.disabled = true;
      translateEnBtn.innerHTML = '⏳ 翻譯中...';

      try {
        const translatedHTML = await translateHTMLContent(contentContainer, 'en', 'zh-TW');
        contentContainer.innerHTML = translatedHTML;
        currentTranslation = contentContainer.innerHTML;

        // 顯示「顯示原文」按鈕
        showOriginalBtn.style.display = 'flex';
        translateEnBtn.innerHTML = '✅ 已翻譯';

        setTimeout(() => {
          translateEnBtn.innerHTML = '🌐 英→中';
        }, 2000);
      } catch (error) {
        console.error('E3 Helper: 翻譯失敗', error);
        alert('翻譯失敗：' + error.message);
        translateEnBtn.innerHTML = '🌐 英→中';
      } finally {
        translateEnBtn.disabled = false;
      }
    });
  }

  if (showOriginalBtn) {
    showOriginalBtn.addEventListener('click', () => {
      if (!contentContainer || !originalContent) return;

      contentContainer.innerHTML = originalContent;
      showOriginalBtn.style.display = 'none';
    });
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

    let html;

    // 嘗試直接 fetch（在 E3 網站上應該可以）
    try {
      const response = await fetch(itemUrl, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      html = await response.text();
    } catch (fetchError) {
      console.log('E3 Helper: 直接 fetch 失敗，嘗試使用 background script', fetchError);

      // 如果直接 fetch 失敗（可能因為跨域），使用 background script
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'fetchContent',
          url: itemUrl
        });

        if (response && response.success) {
          html = response.html;
        } else {
          throw new Error(response?.error || '無法載入內容');
        }
      } catch (bgError) {
        console.error('E3 Helper: Background script 抓取失敗', bgError);
        throw new Error('無法載入內容，請確認已登入 E3');
      }
    }
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
      pdfListContainer.innerHTML = `<div class="e3-helper-loading">正在掃描課程 ${scannedCourses + 1}/${selectedCourseList.length}<br><small style="color: #999; margin-top: 8px; display: block;">${course.fullname}</small><br><small style="color: #667eea; margin-top: 4px; display: block;">已找到 ${totalPDFs} 個檔案</small></div>`;

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

// 掃描當前頁面中的檔案（教材、影片、公告）
// 掃描內嵌影片（video 標籤和 iframe）
// 可以傳入自訂的 document 物件（用於深度掃描）
function scanEmbeddedVideos(courseName = '', documentObj = document) {
  const videos = [];

  // 1. 掃描 <video> 標籤
  const videoElements = documentObj.querySelectorAll('video');
  console.log(`E3 Helper: 找到 ${videoElements.length} 個 video 標籤`);

  videoElements.forEach((video, index) => {
    // 優先從 src 屬性獲取
    if (video.src && video.src.trim() !== '') {
      const videoUrl = video.src;
      const filename = extractFilenameFromUrl(videoUrl) || `內嵌影片_${index + 1}`;
      const fileType = getFileTypeInfo(videoUrl) || { ext: '.mp4', icon: '🎬', name: 'VIDEO' };

      videos.push({
        url: videoUrl,
        filename: filename,
        course: courseName,
        fileType: fileType,
        isEmbedded: true
      });
      console.log(`E3 Helper: 找到 video 標籤影片 - ${filename}: ${videoUrl}`);
    }

    // 從 <source> 子標籤獲取
    const sources = video.querySelectorAll('source');
    sources.forEach((source, sourceIndex) => {
      if (source.src && source.src.trim() !== '') {
        const videoUrl = source.src;
        const filename = extractFilenameFromUrl(videoUrl) || `內嵌影片_${index + 1}_source_${sourceIndex + 1}`;
        const fileType = getFileTypeInfo(videoUrl) || { ext: '.mp4', icon: '🎬', name: 'VIDEO' };

        // 檢查是否已經加入過（避免重複）
        if (!videos.find(v => v.url === videoUrl)) {
          videos.push({
            url: videoUrl,
            filename: filename,
            course: courseName,
            fileType: fileType,
            isEmbedded: true
          });
          console.log(`E3 Helper: 找到 source 標籤影片 - ${filename}: ${videoUrl}`);
        }
      }
    });
  });

  // 2. 掃描 <iframe> 中的影片
  const iframes = documentObj.querySelectorAll('iframe');
  console.log(`E3 Helper: 找到 ${iframes.length} 個 iframe`);

  iframes.forEach((iframe, index) => {
    const src = iframe.src;
    if (!src) return;

    // 檢查是否是影片相關的 iframe
    const isVideoIframe =
      src.includes('youtube.com') ||
      src.includes('youtu.be') ||
      src.includes('vimeo.com') ||
      src.includes('dailymotion.com') ||
      src.includes('video') ||
      src.includes('.mp4') ||
      src.includes('.webm') ||
      src.includes('.ogg');

    if (isVideoIframe) {
      // 嘗試提取影片標題
      let title = iframe.title || iframe.getAttribute('aria-label') || `iframe影片_${index + 1}`;

      // 對於 YouTube，嘗試從 URL 提取影片 ID
      let videoUrl = src;
      let filename = title;

      if (src.includes('youtube.com') || src.includes('youtu.be')) {
        const videoIdMatch = src.match(/(?:embed\/|v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (videoIdMatch) {
          const videoId = videoIdMatch[1];
          filename = `YouTube_${videoId}_${title}`;
          videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }
      }

      videos.push({
        url: videoUrl,
        filename: sanitizeFilename(filename),
        course: courseName,
        fileType: { ext: '', icon: '🎬', name: 'IFRAME_VIDEO' },
        isEmbedded: true,
        isIframe: true,
        originalSrc: src
      });
      console.log(`E3 Helper: 找到 iframe 影片 - ${filename}: ${src}`);
    }
  });

  // 3. 掃描 <embed> 標籤（較舊的嵌入方式）
  const embeds = documentObj.querySelectorAll('embed[src*="video"], embed[type*="video"]');
  console.log(`E3 Helper: 找到 ${embeds.length} 個 embed 標籤`);

  embeds.forEach((embed, index) => {
    const src = embed.src;
    if (src && src.trim() !== '') {
      const filename = extractFilenameFromUrl(src) || `embed影片_${index + 1}`;
      const fileType = getFileTypeInfo(src) || { ext: '.mp4', icon: '🎬', name: 'VIDEO' };

      videos.push({
        url: src,
        filename: filename,
        course: courseName,
        fileType: fileType,
        isEmbedded: true
      });
      console.log(`E3 Helper: 找到 embed 影片 - ${filename}: ${src}`);
    }
  });

  return videos;
}

// 從 URL 中提取檔名的輔助函數
function extractFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();

    if (filename && filename.includes('.')) {
      // 移除 URL 參數（? 之後的部分）
      const cleanFilename = filename.split('?')[0];
      // 解碼 URL 編碼的字元
      const decodedFilename = decodeURIComponent(cleanFilename);
      // 清理不合法的檔名字元
      return sanitizeFilename(decodedFilename);
    }

    return null;
  } catch (e) {
    // 如果無法解析 URL，嘗試直接從字串中提取
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.includes('.')) {
      const cleanFilename = lastPart.split('?')[0];
      const decodedFilename = decodeURIComponent(cleanFilename);
      return sanitizeFilename(decodedFilename);
    }
    return null;
  }
}

// 清理檔名的輔助函數
function sanitizeFilename(filename) {
  // 移除或替換不合法的檔名字元
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 200); // 限制檔名長度
}

async function scanCurrentPage() {
  const pdfListContainer = document.querySelector('.e3-helper-pdf-list');
  if (!pdfListContainer) return;

  pdfListContainer.innerHTML = '<div class="e3-helper-loading">正在掃描當前頁面...</div>';
  allPDFs = [];
  selectedPDFs.clear();

  // 獲取當前課程名稱和頁面 URL
  const currentCourseName = getCurrentCourseName();
  const currentPageUrl = window.location.href;

  // 建立檔案類型選擇器
  const fileSelectors = SUPPORTED_FILE_TYPES.map(type =>
    `a[href$="${type.ext}"], a[href*="${type.ext}?"], a[href*="pluginfile.php"][href*="${type.ext}"]`
  ).join(', ');

  // 方法1: 掃描所有 pluginfile.php 連結（這是 E3 主要的檔案來源）
  const pluginfileLinks = document.querySelectorAll('a[href*="pluginfile.php"]');
  console.log(`E3 Helper: 在當前頁面找到 ${pluginfileLinks.length} 個 pluginfile 連結`);

  pluginfileLinks.forEach(link => {
    const url = link.href;
    const fileType = getFileTypeInfo(url);
    let filename = extractFilename(link);

    // 如果無法從連結文字提取，從 URL 提取
    if (!filename || filename.length < 3) {
      filename = extractFilenameFromUrl(url);
    }

    // 避免重複
    if (!allPDFs.find(pdf => pdf.url === url)) {
      allPDFs.push({
        url: url,
        filename: filename || '未命名檔案',
        course: currentCourseName,
        fileType: fileType,
        pageUrl: currentPageUrl  // 使用當前頁面 URL
      });
    }
  });

  // 方法2: 掃描當前頁面的檔案連結（使用傳統選擇器）
  const fileLinks = document.querySelectorAll(fileSelectors);
  console.log(`E3 Helper: 在當前頁面找到 ${fileLinks.length} 個傳統檔案連結`);

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
        fileType: fileType,
        pageUrl: currentPageUrl  // 使用當前頁面 URL
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
        pageUrl: url,  // resource 連結使用自己的 URL
        fileType: { ext: '', icon: '📎', name: 'RESOURCE' }
      });
    }
  });

  // 掃描內嵌影片（video 標籤）
  console.log(`E3 Helper: 開始掃描內嵌影片...`);
  const embeddedVideos = scanEmbeddedVideos(currentCourseName);
  console.log(`E3 Helper: 找到 ${embeddedVideos.length} 個內嵌影片`);

  // 將內嵌影片加到列表中
  embeddedVideos.forEach(video => {
    if (!allPDFs.find(pdf => pdf.url === video.url)) {
      allPDFs.push(video);
    }
  });

  // 掃描當前頁面的公告貼文（如果是公告頁面）
  const forumPosts = document.querySelectorAll('.post-content-container, div[id^="post-content-"]');
  console.log(`E3 Helper: 找到 ${forumPosts.length} 個公告貼文`);

  if (forumPosts.length > 0) {
    forumPosts.forEach((post, index) => {
      // 在每個貼文中掃描檔案
      const postFileSelectors = SUPPORTED_FILE_TYPES.map(type =>
        `a[href$="${type.ext}"], a[href*="${type.ext}?"], a[href*="pluginfile.php"][href*="${type.ext}"]`
      ).join(', ');

      const postFileLinks = post.querySelectorAll(postFileSelectors);

      postFileLinks.forEach(link => {
        const url = link.href;
        let filename = extractFilename(link);
        const fileType = getFileTypeInfo(url);

        if (!allPDFs.find(pdf => pdf.url === url)) {
          allPDFs.push({
            url: url,
            filename: filename || '未命名檔案',
            course: currentCourseName,
            fileType: fileType,
            fromForum: true
          });
        }
      });

      // 在每個貼文中掃描內嵌影片
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = post.innerHTML;
      const postVideos = scanEmbeddedVideos(currentCourseName, tempDiv);

      postVideos.forEach(video => {
        if (!allPDFs.find(pdf => pdf.url === video.url)) {
          video.fromForum = true;
          allPDFs.push(video);
        }
      });
    });
  }

  console.log(`E3 Helper: 總共找到 ${allPDFs.length} 個檔案（包含教材、內嵌影片和公告）`);

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
      pdfListContainer.innerHTML = `<div class="e3-helper-loading">正在掃描課程 ${scannedCourses + 1}/${allCourses.length}<br><small style="color: #999; margin-top: 8px; display: block;">${course.fullname}</small><br><small style="color: #667eea; margin-top: 4px; display: block;">已找到 ${totalPDFs} 個檔案</small></div>`;

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

// 通用活動掃描函數 - 掃描任何 Moodle 活動頁面（supervideo、page、quiz 等）
async function scanActivityForFiles(activityUrl, courseName, activityType = 'activity') {
  const files = [];

  try {
    console.log(`E3 Helper: 正在掃描活動: ${activityUrl}`);
    const response = await fetch(activityUrl, { credentials: 'include' });

    if (!response.ok) {
      console.log(`E3 Helper: 活動頁面回應異常: ${response.status}`);
      return files;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 建立檔案類型選擇器
    const fileSelectors = SUPPORTED_FILE_TYPES.map(type =>
      `a[href$="${type.ext}"], a[href*="${type.ext}?"], a[href*="pluginfile.php"][href*="${type.ext}"]`
    ).join(', ');

    // 方法1: 掃描所有 pluginfile.php 連結（E3 的主要檔案來源）
    const pluginfileLinks = doc.querySelectorAll('a[href*="pluginfile.php"]');
    console.log(`E3 Helper: 在活動中找到 ${pluginfileLinks.length} 個 pluginfile 連結`);

    pluginfileLinks.forEach(link => {
      const url = link.href;
      const fileType = getFileTypeInfo(url);
      const extractedFilename = extractFilenameFromUrl(url);
      const linkText = link.textContent.trim();
      const filename = extractedFilename || linkText || '未命名檔案';

      if (!files.find(f => f.url === url)) {
        files.push({
          url: url,
          filename: sanitizeFilename(filename),
          course: courseName,
          fileType: fileType,
          fromActivity: true,
          activityType: activityType,
          pageUrl: activityUrl  // 保存頁面 URL
        });
      }
    });

    // 方法2: 傳統檔案選擇器
    const fileLinks = doc.querySelectorAll(fileSelectors);
    console.log(`E3 Helper: 在活動中找到 ${fileLinks.length} 個傳統檔案連結`);

    fileLinks.forEach(link => {
      const url = link.href;
      const fileType = getFileTypeInfo(url);
      const extractedFilename = extractFilenameFromUrl(url);
      const linkText = link.textContent.trim();
      const filename = extractedFilename || linkText || extractFilename(link);

      if (!files.find(f => f.url === url)) {
        files.push({
          url: url,
          filename: sanitizeFilename(filename),
          course: courseName,
          fileType: fileType,
          fromActivity: true,
          activityType: activityType,
          pageUrl: activityUrl  // 保存頁面 URL
        });
      }
    });

    // 方法3: 掃描內嵌影片（supervideo 常使用）
    const embeddedVideos = scanEmbeddedVideos(courseName, doc);
    console.log(`E3 Helper: 在活動中找到 ${embeddedVideos.length} 個內嵌影片`);

    embeddedVideos.forEach(video => {
      if (!files.find(f => f.url === video.url)) {
        video.fromActivity = true;
        video.activityType = activityType;
        video.pageUrl = activityUrl;  // 保存頁面 URL
        files.push(video);
      }
    });

    console.log(`E3 Helper: 活動掃描完成，共找到 ${files.length} 個檔案`);
  } catch (e) {
    console.error(`E3 Helper: 掃描活動時發生錯誤:`, e);
  }

  return files;
}

// 掃描作業頁面中的附檔和影片
async function scanAssignmentForFiles(assignUrl, courseName) {
  const files = [];

  try {
    console.log(`E3 Helper: 正在掃描作業頁面: ${assignUrl}`);
    const response = await fetch(assignUrl, { credentials: 'include' });
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 設置正確的 base URL
    const base = doc.createElement('base');
    base.href = assignUrl;
    doc.head.insertBefore(base, doc.head.firstChild);

    // 方法1: 掃描所有 pluginfile.php 連結（作業附檔的主要來源）
    const pluginfileLinks = doc.querySelectorAll('a[href*="pluginfile.php"]');
    console.log(`E3 Helper: 找到 ${pluginfileLinks.length} 個 pluginfile 連結`);

    pluginfileLinks.forEach(link => {
      const url = link.href;
      const fileType = getFileTypeInfo(url);
      let filename = extractFilename(link);

      // 如果無法從連結文字提取，從 URL 提取
      if (!filename || filename.length < 3) {
        filename = extractFilenameFromUrl(url);
      }

      if (!files.find(f => f.url === url)) {
        files.push({
          url: url,
          filename: filename || '未命名檔案',
          course: courseName,
          fileType: fileType,
          fromAssignment: true,
          pageUrl: assignUrl  // 保存作業頁面 URL
        });
        console.log(`E3 Helper: 找到作業附檔 - ${filename}: ${url.substring(0, 100)}...`);
      }
    });

    // 方法2: 使用傳統的檔案類型選擇器（作為補充）
    const fileSelectors = SUPPORTED_FILE_TYPES.map(type =>
      `a[href$="${type.ext}"], a[href*="${type.ext}?"]`
    ).join(', ');

    const fileLinks = doc.querySelectorAll(fileSelectors);
    console.log(`E3 Helper: 找到 ${fileLinks.length} 個傳統檔案連結`);

    fileLinks.forEach(link => {
      const url = link.href;

      // 排除已經加入的檔案
      if (files.find(f => f.url === url)) {
        return;
      }

      let filename = extractFilename(link);
      const fileType = getFileTypeInfo(url);

      files.push({
        url: url,
        filename: filename || '未命名檔案',
        course: courseName,
        fileType: fileType,
        fromAssignment: true,
        pageUrl: assignUrl  // 保存作業頁面 URL
      });
    });

    // 方法3: 掃描作業頁面中的內嵌影片
    const embeddedVideos = scanEmbeddedVideos(courseName, doc);
    console.log(`E3 Helper: 找到 ${embeddedVideos.length} 個內嵌影片`);

    embeddedVideos.forEach(video => {
      if (!files.find(f => f.url === video.url)) {
        video.fromAssignment = true;
        video.pageUrl = assignUrl;  // 保存作業頁面 URL
        files.push(video);
      }
    });

    console.log(`E3 Helper: 在作業頁面中找到 ${files.length} 個檔案（含附檔和影片）`);
  } catch (e) {
    console.error(`E3 Helper: 掃描作業頁面時發生錯誤:`, e);
  }

  return files;
}

// 掃描公告論壇中的檔案和影片
async function scanForumForFiles(forumUrl, courseName) {
  const files = [];

  try {
    console.log(`E3 Helper: 正在掃描公告論壇: ${forumUrl}`);
    const response = await fetch(forumUrl, { credentials: 'include' });
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 設置正確的 base URL
    const base = doc.createElement('base');
    base.href = forumUrl;
    doc.head.insertBefore(base, doc.head.firstChild);

    // 找到所有討論串連結
    const discussionLinks = doc.querySelectorAll('a[href*="/mod/forum/discuss.php"]');
    console.log(`E3 Helper: 找到 ${discussionLinks.length} 個討論串`);

    // 掃描每個討論串（最多掃描前 20 個以避免太慢）
    const maxDiscussions = Math.min(discussionLinks.length, 20);
    for (let i = 0; i < maxDiscussions; i++) {
      const discussUrl = discussionLinks[i].href;

      try {
        const discussResponse = await fetch(discussUrl, { credentials: 'include' });
        const discussHtml = await discussResponse.text();
        const discussDoc = parser.parseFromString(discussHtml, 'text/html');

        // 設置正確的 base URL
        const discussBase = doc.createElement('base');
        discussBase.href = discussUrl;
        discussDoc.head.insertBefore(discussBase, discussDoc.head.firstChild);

        // 掃描討論串中的檔案連結
        const fileSelectors = SUPPORTED_FILE_TYPES.map(type =>
          `a[href$="${type.ext}"], a[href*="${type.ext}?"], a[href*="pluginfile.php"][href*="${type.ext}"]`
        ).join(', ');

        const fileLinks = discussDoc.querySelectorAll(fileSelectors);

        fileLinks.forEach(link => {
          const url = link.href;
          let filename = extractFilename(link);
          const fileType = getFileTypeInfo(url);

          // 使用標準化 URL 進行去重比較
          const normalizedUrl = normalizeUrl(url);
          if (!files.find(f => normalizeUrl(f.url) === normalizedUrl)) {
            files.push({
              url: url,
              filename: filename || '未命名檔案',
              course: courseName,
              fileType: fileType,
              fromForum: true,
              pageUrl: discussUrl  // 保存討論串頁面 URL
            });
          }
        });

        // 掃描討論串中的內嵌影片
        const embeddedVideos = scanEmbeddedVideos(courseName, discussDoc);
        embeddedVideos.forEach(video => {
          const normalizedVideoUrl = normalizeUrl(video.url);
          if (!files.find(f => normalizeUrl(f.url) === normalizedVideoUrl)) {
            video.fromForum = true;
            video.pageUrl = discussUrl;  // 保存討論串頁面 URL
            files.push(video);
          }
        });

        // 延遲避免請求過快
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.error(`E3 Helper: 掃描討論串時發生錯誤:`, e);
      }
    }

    console.log(`E3 Helper: 在公告論壇中找到 ${files.length} 個檔案`);
  } catch (e) {
    console.error(`E3 Helper: 掃描公告論壇時發生錯誤:`, e);
  }

  return files;
}

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

    // 同時也抓取課程首頁（包含作業、公告等連結）
    const courseMainUrl = `https://e3p.nycu.edu.tw/course/view.php?id=${courseId}`;
    console.log(`E3 Helper: 正在抓取課程首頁: ${courseMainUrl}`);

    const mainResponse = await fetch(courseMainUrl);
    const mainHtml = await mainResponse.text();
    const mainDoc = parser.parseFromString(mainHtml, 'text/html');

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

    // 方法1: Resource 連結（需要進一步抓取）
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
              fileType: fileType,
              pageUrl: resourceUrl  // 使用 resource 頁面 URL
            });
          }
        }

        // 延遲避免請求過快
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.error(`E3 Helper: 抓取 resource 頁面時發生錯誤:`, e);
      }
    }

    // 方法2: 尋找所有 activity 連結並檢查（folder、url 等）
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

          // 方法1: 掃描所有 pluginfile.php 連結（E3 的主要檔案來源）
          const pluginfileLinks = folderDoc.querySelectorAll('a[href*="pluginfile.php"]');

          pluginfileLinks.forEach(fileLink => {
            const url = fileLink.href;
            const fileType = getFileTypeInfo(url);
            let filename = fileLink.textContent.trim();

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

            // 使用標準化 URL 進行去重比較
            const normalizedUrl = normalizeUrl(url);
            if (!pdfs.find(pdf => normalizeUrl(pdf.url) === normalizedUrl)) {
              pdfs.push({
                url: url,
                filename: filename || '未命名檔案',
                course: courseName,
                fileType: fileType,
                pageUrl: folderUrl  // 使用 folder 頁面 URL
              });
            }
          });

          // 方法2: 傳統檔案選擇器（作為補充）
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

            // 使用標準化 URL 進行去重比較
            const normalizedUrl = normalizeUrl(url);
            if (!pdfs.find(pdf => normalizeUrl(pdf.url) === normalizedUrl)) {
              pdfs.push({
                url: url,
                filename: filename || '未命名檔案',
                course: courseName,
                fileType: fileType,
                pageUrl: folderUrl  // 使用 folder 頁面 URL
              });
            }
          });

          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (e) {
        console.error(`E3 Helper: 掃描 activity 時發生錯誤:`, e);
      }
    }

    // 方法3: 掃描內嵌影片
    console.log(`E3 Helper: 開始掃描課程 "${courseName}" 中的內嵌影片...`);
    const embeddedVideos = scanEmbeddedVideos(courseName, doc);
    console.log(`E3 Helper: 在課程 "${courseName}" 中找到 ${embeddedVideos.length} 個內嵌影片`);

    // 將內嵌影片加到列表中
    embeddedVideos.forEach(video => {
      if (!pdfs.find(pdf => pdf.url === video.url)) {
        // 為直接掃描到的內嵌影片設置課程首頁為 pageUrl
        video.pageUrl = video.pageUrl || courseMainUrl;
        pdfs.push(video);
      }
    });

    // 方法4: 掃描作業頁面中的附檔和影片（從課程首頁找作業連結）
    console.log(`E3 Helper: 開始掃描課程 "${courseName}" 中的作業...`);
    const assignLinks = mainDoc.querySelectorAll('a[href*="/mod/assign/view.php"]');
    console.log(`E3 Helper: 在課程首頁找到 ${assignLinks.length} 個作業`);

    // 掃描每個作業（限制最多掃描 10 個以避免太慢）
    const maxAssigns = Math.min(assignLinks.length, 10);
    for (let i = 0; i < maxAssigns; i++) {
      const assignUrl = assignLinks[i].href;
      const assignFiles = await scanAssignmentForFiles(assignUrl, courseName);

      // 將作業中的檔案加到列表中
      assignFiles.forEach(file => {
        if (!pdfs.find(pdf => pdf.url === file.url)) {
          pdfs.push(file);
        }
      });

      // 延遲避免請求過快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 方法5: 掃描公告論壇中的檔案和影片（從課程首頁找論壇連結）
    console.log(`E3 Helper: 開始掃描課程 "${courseName}" 中的公告論壇...`);
    const forumLinks = mainDoc.querySelectorAll('a[href*="/mod/forum/view.php"]');
    console.log(`E3 Helper: 在課程首頁找到 ${forumLinks.length} 個論壇`);

    // 掃描每個論壇（限制最多掃描 3 個以避免太慢）
    const maxForums = Math.min(forumLinks.length, 3);
    for (let i = 0; i < maxForums; i++) {
      const forumUrl = forumLinks[i].href;
      const forumFiles = await scanForumForFiles(forumUrl, courseName);

      // 將論壇中的檔案加到列表中
      forumFiles.forEach(file => {
        if (!pdfs.find(pdf => pdf.url === file.url)) {
          pdfs.push(file);
        }
      });
    }

    // 方法6: 通用活動掃描（掃描所有其他類型的活動，包括 supervideo、page、quiz 等）
    console.log(`E3 Helper: 開始掃描課程 "${courseName}" 中的其他活動...`);

    // 找出所有活動連結，但排除已經掃描過的類型
    const allActivityLinks = mainDoc.querySelectorAll('a[href*="/mod/"][href*="/view.php"]');
    const otherActivityLinks = Array.from(allActivityLinks).filter(link => {
      const href = link.href;
      // 排除已經掃描過的模組類型
      return !href.includes('/mod/resource/') &&
             !href.includes('/mod/folder/') &&
             !href.includes('/mod/assign/') &&
             !href.includes('/mod/forum/') &&
             !href.includes('/mod/url/');
    });

    console.log(`E3 Helper: 在課程首頁找到 ${otherActivityLinks.length} 個其他活動`);

    // 限制掃描數量（避免太慢）
    const maxOtherActivities = Math.min(otherActivityLinks.length, 15);
    for (let i = 0; i < maxOtherActivities; i++) {
      const activityUrl = otherActivityLinks[i].href;

      // 識別活動類型
      let activityType = 'activity';
      if (activityUrl.includes('/mod/supervideo/')) {
        activityType = 'supervideo';
      } else if (activityUrl.includes('/mod/page/')) {
        activityType = 'page';
      } else if (activityUrl.includes('/mod/quiz/')) {
        activityType = 'quiz';
      } else if (activityUrl.includes('/mod/book/')) {
        activityType = 'book';
      }

      const activityFiles = await scanActivityForFiles(activityUrl, courseName, activityType);

      // 將活動中的檔案加到列表中
      activityFiles.forEach(file => {
        if (!pdfs.find(pdf => pdf.url === file.url)) {
          pdfs.push(file);
        }
      });

      // 延遲避免請求過快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 方法7: 直接檔案連結（通用檔案連結，最後掃描以避免覆蓋具體來源的 pageUrl）
    console.log(`E3 Helper: 開始掃描課程 "${courseName}" 中的直接檔案連結...`);
    const directFileLinks = doc.querySelectorAll(fileSelectors);
    console.log(`E3 Helper: 在課程 "${courseName}" 中找到 ${directFileLinks.length} 個直接檔案連結`);

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

      // 只加入尚未被其他方法掃描到的檔案（避免覆蓋更具體的 pageUrl）
      const normalizedUrl = normalizeUrl(url);
      const existingFile = pdfs.find(pdf => normalizeUrl(pdf.url) === normalizedUrl);

      if (!existingFile) {
        pdfs.push({
          url: url,
          filename: filename || '未命名檔案',
          course: courseName,
          fileType: fileType,
          pageUrl: courseMainUrl  // 使用課程首頁 URL（作為備用）
        });
      }
      // 已存在的檔案靜默跳過（避免重複）
    });

    console.log(`E3 Helper: 在課程 "${courseName}" 中找到 ${pdfs.length} 個檔案（包含教材、作業、內嵌影片、公告和其他活動）`);
  } catch (e) {
    console.error(`E3 Helper: 掃描課程 ${courseName} 時發生錯誤:`, e);
  }

  return pdfs;
}

// 獲取當前課程名稱
function getCurrentCourseName() {
  let currentCourseName = 'E3檔案';

  // 方法1: 從麵包屑導覽取得
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    const courseLink = breadcrumb.querySelector('a[href*="/course/view.php"]');
    if (courseLink) {
      currentCourseName = courseLink.textContent.trim();
    }
  }

  // 方法2: 從頁面標題取得
  if (currentCourseName === 'E3檔案') {
    const pageTitle = document.querySelector('.page-header-headings h1');
    if (pageTitle) {
      const titleText = pageTitle.textContent.trim();
      if (titleText.length > 3 && !titleText.includes('儀表板') && !titleText.includes('Dashboard')) {
        currentCourseName = titleText;
      }
    }
  }

  // 方法3: 從 body 的 class 取得課程 ID
  if (currentCourseName === 'E3檔案' && allCourses.length > 0) {
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
    // 使用 extractFilenameFromUrl 正確提取檔名
    const urlFilename = extractFilenameFromUrl(link.href);
    if (urlFilename) {
      filename = urlFilename;
      // 移除副檔名（稍後會重新加上）
      SUPPORTED_FILE_TYPES.forEach(type => {
        filename = filename.replace(type.ext, '');
      });
    } else {
      filename = '未命名檔案';
    }
  }

  // 清理檔名中的不合法字元
  filename = sanitizeFilename(filename);

  return filename;
}

// 更新 PDF 列表顯示
function updatePDFList() {
  const pdfListContainer = document.querySelector('.e3-helper-pdf-list');
  const downloadStatus = document.querySelector('.e3-helper-download-status');

  if (!pdfListContainer) return;

  // 去重：使用標準化 URL 比較
  const originalCount = allPDFs.length;
  const seenUrls = new Map(); // 標準化 URL -> 檔案物件
  const uniquePDFs = [];

  allPDFs.forEach(pdf => {
    const normalizedUrl = normalizeUrl(pdf.url);
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.set(normalizedUrl, pdf);
      uniquePDFs.push(pdf);
    } else {
      // 如果重複，但新的有更好的 pageUrl，則更新
      const existing = seenUrls.get(normalizedUrl);
      if (pdf.pageUrl && !existing.pageUrl) {
        existing.pageUrl = pdf.pageUrl;
      }
      if (pdf.pageUrl && existing.pageUrl === existing.url && pdf.pageUrl !== pdf.url) {
        // 新的 pageUrl 更好（不是指向檔案本身）
        existing.pageUrl = pdf.pageUrl;
      }
    }
  });

  if (originalCount !== uniquePDFs.length) {
    console.log(`E3 Helper: 去除 ${originalCount - uniquePDFs.length} 個重複檔案 (原 ${originalCount} → 現 ${uniquePDFs.length})`);
    allPDFs = uniquePDFs;

    // 重建 selectedPDFs（更新索引）
    const newSelectedPDFs = new Set();
    selectedPDFs.forEach(oldIndex => {
      if (oldIndex < allPDFs.length) {
        newSelectedPDFs.add(oldIndex);
      }
    });
    selectedPDFs = newSelectedPDFs;
  }

  if (allPDFs.length === 0) {
    pdfListContainer.innerHTML = '<div class="e3-helper-no-assignments">目前沒有找到檔案<br><small style="color: #999; margin-top: 8px; display: block;">請前往課程頁面使用此功能，或點擊「📄 掃描此頁」掃描當前頁面</small></div>';
    if (downloadStatus) {
      downloadStatus.textContent = '已選取 0 個檔案';
    }
    return;
  }

  // 除錯：檢查缺少 pageUrl 的檔案
  const missingPageUrl = allPDFs.filter(pdf => !pdf.pageUrl || pdf.pageUrl === pdf.url);
  if (missingPageUrl.length > 0) {
    console.log(`E3 Helper: 發現 ${missingPageUrl.length} 個檔案缺少有效的 pageUrl:`,
      missingPageUrl.map(pdf => ({
        filename: pdf.filename,
        url: pdf.url.substring(0, 80),
        pageUrl: pdf.pageUrl ? pdf.pageUrl.substring(0, 80) : 'undefined',
        fromForum: pdf.fromForum,
        fromAssignment: pdf.fromAssignment,
        fromActivity: pdf.fromActivity
      }))
    );
  }

  pdfListContainer.innerHTML = allPDFs.map((pdf, index) => {
    const isSelected = selectedPDFs.has(index);
    const fileType = pdf.fileType || { icon: '📎', name: 'FILE' };

    // 為內嵌影片和公告檔案添加標記
    let embeddedBadge = '';
    if (pdf.isEmbedded) {
      if (pdf.isIframe && (pdf.url.includes('youtube.com') || pdf.url.includes('youtu.be'))) {
        embeddedBadge = ' <span style="background: #ff0000; color: white; font-size: 9px; padding: 2px 4px; border-radius: 3px; margin-left: 4px;">YouTube</span>';
      } else if (pdf.isIframe && pdf.url.includes('vimeo.com')) {
        embeddedBadge = ' <span style="background: #1ab7ea; color: white; font-size: 9px; padding: 2px 4px; border-radius: 3px; margin-left: 4px;">Vimeo</span>';
      } else if (pdf.isIframe) {
        embeddedBadge = ' <span style="background: #667eea; color: white; font-size: 9px; padding: 2px 4px; border-radius: 3px; margin-left: 4px;">內嵌</span>';
      } else {
        embeddedBadge = ' <span style="background: #28a745; color: white; font-size: 9px; padding: 2px 4px; border-radius: 3px; margin-left: 4px;">影片</span>';
      }
    }

    // 為公告來源的檔案添加標記
    if (pdf.fromForum) {
      embeddedBadge += ' <span style="background: #ffc107; color: #333; font-size: 9px; padding: 2px 4px; border-radius: 3px; margin-left: 4px;">📢公告</span>';
    }

    // 為作業來源的檔案添加標記
    if (pdf.fromAssignment) {
      embeddedBadge += ' <span style="background: #17a2b8; color: white; font-size: 9px; padding: 2px 4px; border-radius: 3px; margin-left: 4px;">📝作業</span>';
    }

    // 為其他活動來源的檔案添加標記
    if (pdf.fromActivity && pdf.activityType) {
      const activityBadges = {
        'supervideo': { text: '📹影片', color: '#e91e63' },
        'page': { text: '📄頁面', color: '#9c27b0' },
        'quiz': { text: '📝測驗', color: '#ff9800' },
        'book': { text: '📖書籍', color: '#795548' },
        'activity': { text: '🔧活動', color: '#607d8b' }
      };

      const badge = activityBadges[pdf.activityType] || activityBadges['activity'];
      embeddedBadge += ` <span style="background: ${badge.color}; color: white; font-size: 9px; padding: 2px 4px; border-radius: 3px; margin-left: 4px;">${badge.text}</span>`;
    }

    // 決定按鈕顯示
    const hasPageUrl = pdf.pageUrl && pdf.pageUrl !== pdf.url;
    const pageButtonHtml = hasPageUrl
      ? `<button class="e3-helper-file-btn e3-helper-view-page" data-url="${pdf.pageUrl}" title="查看檔案所在的頁面">📄 查看來源頁面</button>`
      : '';

    return `
      <div class="e3-helper-pdf-item" data-file-url="${pdf.url}" data-page-url="${pdf.pageUrl || ''}" data-index="${index}">
        <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
          <input type="checkbox" class="e3-helper-pdf-checkbox" data-index="${index}" ${isSelected ? 'checked' : ''}>
          <span class="e3-helper-pdf-icon">${fileType.icon}</span>
          <div class="e3-helper-pdf-info" style="flex: 1;">
            <div class="e3-helper-pdf-name">${pdf.filename}${embeddedBadge}</div>
            <div class="e3-helper-pdf-course">${pdf.course} • ${fileType.name}</div>
          </div>
        </div>
        <div class="e3-helper-file-actions">
          ${pageButtonHtml}
          <button class="e3-helper-file-btn e3-helper-download-file" data-url="${pdf.url}" data-filename="${pdf.filename}" data-index="${index}" title="直接下載此檔案">⬇️ 直接下載</button>
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

  // 綁定「查看來源頁面」按鈕
  pdfListContainer.querySelectorAll('.e3-helper-view-page').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.dataset.url;
      if (url) {
        window.open(url, '_blank');
      }
    });
  });

  // 綁定「直接下載」按鈕
  pdfListContainer.querySelectorAll('.e3-helper-download-file').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.dataset.url;
      const index = parseInt(btn.dataset.index);
      const pdf = allPDFs[index];

      if (pdf) {
        // 決定檔案副檔名
        const fileType = pdf.fileType || { ext: '', name: 'FILE' };
        let finalFilename = sanitizeFilename(pdf.filename);

        // 檢查檔名是否已經有副檔名
        const hasExtension = SUPPORTED_FILE_TYPES.some(type =>
          finalFilename.toLowerCase().endsWith(type.ext)
        );

        // 如果檔名還沒有副檔名，加上副檔名
        if (fileType.ext && !hasExtension) {
          finalFilename = `${finalFilename}${fileType.ext}`;
        }

        // 組合成完整檔名：[課程]_檔名
        const coursePrefix = sanitizeFilename(pdf.course.substring(0, 20));
        const fullFilename = `[${coursePrefix}]_${finalFilename}`;

        // 檢查是否為無法直接下載的 iframe 影片
        if (pdf.isIframe && (pdf.url.includes('youtube.com') || pdf.url.includes('youtu.be') || pdf.url.includes('vimeo.com'))) {
          // 直接打開連結
          window.open(pdf.url, '_blank');
        } else {
          // 使用 Chrome Downloads API 下載
          chrome.runtime.sendMessage({
            action: 'download',
            url: pdf.url,
            filename: fullFilename
          });
        }
      }
    });
  });
}

// 綁定下載按鈕事件
function bindDownloadButtons() {
  const selectAllBtn = document.getElementById('e3-helper-select-all');
  const deselectAllBtn = document.getElementById('e3-helper-deselect-all');
  const downloadSeparateBtn = document.getElementById('e3-helper-download-separate');
  const downloadZipBtn = document.getElementById('e3-helper-download-zip');

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

  if (downloadSeparateBtn && !downloadSeparateBtn.dataset.bound) {
    downloadSeparateBtn.dataset.bound = 'true';
    downloadSeparateBtn.addEventListener('click', () => {
      downloadSeparately();
    });
  }

  if (downloadZipBtn && !downloadZipBtn.dataset.bound) {
    downloadZipBtn.dataset.bound = 'true';
    downloadZipBtn.addEventListener('click', () => {
      downloadAsZip();
    });
  }
}

// 分開下載選取的檔案
async function downloadSeparately() {
  if (selectedPDFs.size === 0) {
    alert('請先選取要下載的檔案');
    return;
  }

  const downloadStatus = document.querySelector('.e3-helper-download-status');
  const downloadBtn = document.getElementById('e3-helper-download-separate');
  const progressContainer = document.querySelector('.e3-helper-progress-container');
  const progressFill = document.querySelector('.e3-helper-progress-fill');
  const progressText = document.querySelector('.e3-helper-progress-text');

  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.textContent = '下載中...';
  }

  // 顯示進度條
  if (progressContainer) {
    progressContainer.style.display = 'block';
  }

  if (progressFill) {
    progressFill.style.width = '0%';
  }

  try {
    const totalFiles = selectedPDFs.size;
    let currentIndex = 0;

    // 逐個下載每個檔案
    for (const index of selectedPDFs) {
      const pdf = allPDFs[index];
      currentIndex++;

      // 更新進度條
      const progress = Math.round((currentIndex / totalFiles) * 100);
      if (progressFill) {
        progressFill.style.width = `${progress}%`;
      }

      if (progressText) {
        progressText.textContent = `正在下載 ${currentIndex}/${totalFiles}: ${pdf.filename.substring(0, 30)}${pdf.filename.length > 30 ? '...' : ''}`;
      }

      if (downloadStatus) {
        downloadStatus.textContent = `正在下載 ${currentIndex}/${totalFiles}: ${pdf.filename}`;
      }

      try {
        // 決定檔案副檔名
        const fileType = pdf.fileType || { ext: '', name: 'FILE' };
        let finalFilename = sanitizeFilename(pdf.filename);

        // 檢查檔名是否已經有副檔名
        const hasExtension = SUPPORTED_FILE_TYPES.some(type =>
          finalFilename.toLowerCase().endsWith(type.ext)
        );

        // 如果檔名還沒有副檔名，加上副檔名
        if (fileType.ext && !hasExtension) {
          finalFilename = `${finalFilename}${fileType.ext}`;
        }

        // 組合成完整檔名：[課程]_檔名
        const coursePrefix = sanitizeFilename(pdf.course.substring(0, 20));
        const fullFilename = `[${coursePrefix}]_${finalFilename}`;

        // 檢查是否為無法直接下載的 iframe 影片
        if (pdf.isIframe && (pdf.url.includes('youtube.com') || pdf.url.includes('youtu.be') || pdf.url.includes('vimeo.com'))) {
          console.log(`E3 Helper: 跳過外部影片 ${pdf.filename}（需要使用外部工具下載）`);
          // 直接打開連結讓用戶自行處理
          window.open(pdf.url, '_blank');
        } else {
          // 使用 Chrome Downloads API 下載
          chrome.runtime.sendMessage({
            action: 'download',
            url: pdf.url,
            filename: fullFilename
          });
        }

        // 延遲避免下載過快
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (e) {
        console.error(`E3 Helper: 下載檔案 ${pdf.filename} 時發生錯誤:`, e);
      }
    }

    // 下載完成
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.textContent = '分開下載';
    }

    if (downloadStatus) {
      downloadStatus.textContent = `下載完成！共 ${totalFiles} 個檔案`;
    }

    if (progressText) {
      progressText.textContent = '下載完成！';
    }

    // 2秒後隱藏進度條並恢復狀態顯示
    setTimeout(() => {
      if (progressContainer) {
        progressContainer.style.display = 'none';
      }
      if (downloadStatus) {
        downloadStatus.textContent = `已選取 ${selectedPDFs.size} 個檔案`;
      }
    }, 2000);

  } catch (e) {
    console.error('E3 Helper: 下載時發生錯誤:', e);
    alert('下載失敗，請查看 Console 了解詳情');

    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.textContent = '分開下載';
    }

    if (downloadStatus) {
      downloadStatus.textContent = `已選取 ${selectedPDFs.size} 個檔案`;
    }

    // 隱藏進度條
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
  }
}

// 批量下載選取的檔案（打包成 ZIP）
async function downloadAsZip() {
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
  const downloadBtn = document.getElementById('e3-helper-download-zip');
  const progressContainer = document.querySelector('.e3-helper-progress-container');
  const progressFill = document.querySelector('.e3-helper-progress-fill');
  const progressText = document.querySelector('.e3-helper-progress-text');

  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.textContent = '打包中...';
  }

  // 顯示進度條
  if (progressContainer) {
    progressContainer.style.display = 'block';
  }

  try {
    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;
    const fileCountMap = {}; // 用於處理重複檔名
    const totalFiles = selectedPDFs.size;

    if (downloadStatus) {
      downloadStatus.textContent = '正在準備下載...';
    }

    if (progressFill) {
      progressFill.style.width = '0%';
    }

    if (progressText) {
      progressText.textContent = '正在準備下載...';
    }

    // 下載並加入每個檔案到 ZIP
    let currentIndex = 0;
    for (const index of selectedPDFs) {
      const pdf = allPDFs[index];
      currentIndex++;

      // 更新進度條
      const progress = Math.round((currentIndex / totalFiles) * 90); // 保留 10% 給打包
      if (progressFill) {
        progressFill.style.width = `${progress}%`;
      }

      if (progressText) {
        progressText.textContent = `正在處理 ${currentIndex}/${totalFiles}: ${pdf.filename.substring(0, 30)}${pdf.filename.length > 30 ? '...' : ''}`;
      }

      try {
        if (downloadStatus) {
          downloadStatus.textContent = `正在處理 ${currentIndex}/${totalFiles}: ${pdf.filename}`;
        }

        // 決定檔案副檔名
        const fileType = pdf.fileType || { ext: '', name: 'FILE' };

        // 清理檔名（確保沒有路徑分隔符號等不合法字元）
        let finalFilename = sanitizeFilename(pdf.filename);

        // 檢查檔名是否已經有任何副檔名
        const hasExtension = SUPPORTED_FILE_TYPES.some(type =>
          finalFilename.toLowerCase().endsWith(type.ext)
        );

        // 如果檔名還沒有副檔名，加上副檔名
        if (fileType.ext && !hasExtension) {
          finalFilename = `${finalFilename}${fileType.ext}`;
        }

        // 取得課程簡稱（取前20字元，避免檔名過長）
        const coursePrefix = sanitizeFilename(pdf.course.substring(0, 20));

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

        // 檢查是否為無法直接下載的 iframe 影片
        if (pdf.isIframe && (pdf.url.includes('youtube.com') || pdf.url.includes('youtu.be') || pdf.url.includes('vimeo.com'))) {
          console.log(`E3 Helper: 跳過外部影片 ${pdf.filename}（需要使用外部工具下載）`);

          // 創建一個文字檔案，包含影片連結
          const linkText = `${pdf.filename}\n影片連結: ${pdf.url}\n\n此為外部影片（YouTube/Vimeo），請使用瀏覽器開啟連結觀看，或使用專門的下載工具下載。`;
          const linkBlob = new Blob([linkText], { type: 'text/plain;charset=utf-8' });
          const linkFilename = uniqueFilename.replace(/\.[^.]+$/, '') + '_連結.txt';
          zip.file(linkFilename, linkBlob);

          successCount++;
        } else {
          // 使用 fetch 下載檔案內容
          const response = await fetch(pdf.url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const blob = await response.blob();

          // 加入到 ZIP（所有檔案在同一層）
          zip.file(uniqueFilename, blob);

          successCount++;
        }

      } catch (e) {
        console.error(`E3 Helper: 處理檔案 ${pdf.filename} 時發生錯誤:`, e);
        failCount++;
      }
    }

    if (successCount === 0) {
      alert('沒有成功下載任何檔案');
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '打包下載';
      }
      if (downloadStatus) {
        downloadStatus.textContent = `已選取 ${selectedPDFs.size} 個檔案`;
      }
      // 隱藏進度條
      if (progressContainer) {
        progressContainer.style.display = 'none';
      }
      return;
    }

    // 產生 ZIP 檔案
    if (downloadStatus) {
      downloadStatus.textContent = '正在打包 ZIP 檔案...';
    }

    if (progressFill) {
      progressFill.style.width = '90%';
    }

    if (progressText) {
      progressText.textContent = '正在壓縮打包...';
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // 進度條達到 100%
    if (progressFill) {
      progressFill.style.width = '100%';
    }

    if (progressText) {
      progressText.textContent = '打包完成！';
    }

    // 產生檔名（使用當前日期時間）
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const zipFilename = `E3檔案_${dateStr}_${timeStr}.zip`;

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
      downloadBtn.textContent = '打包下載';
    }

    if (downloadStatus) {
      downloadStatus.textContent = `打包完成！成功: ${successCount}, 失敗: ${failCount}`;
    }

    // 2秒後隱藏進度條並恢復狀態顯示
    setTimeout(() => {
      if (progressContainer) {
        progressContainer.style.display = 'none';
      }
      if (downloadStatus) {
        downloadStatus.textContent = `已選取 ${selectedPDFs.size} 個檔案`;
      }
    }, 2000);

  } catch (e) {
    console.error('E3 Helper: 打包 ZIP 時發生錯誤:', e);
    alert('打包失敗，請查看 Console 了解詳情');

    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.textContent = '打包下載';
    }

    if (downloadStatus) {
      downloadStatus.textContent = `已選取 ${selectedPDFs.size} 個檔案`;
    }

    // 隱藏進度條
    if (progressContainer) {
      progressContainer.style.display = 'none';
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
        // 定義無效的課程名稱（這些是頁面標題，不是真正的課程名稱）
        const invalidCourseNames = ['焦點綜覽', '通知', '時間軸', 'Timeline', 'Notifications', '概覽', 'Overview'];

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
        // 方法3: 如果在課程頁面上，從頁面標題獲取（但要排除無效名稱）
        if (!courseName && document.querySelector('.page-header-headings h1')) {
          const pageTitle = document.querySelector('.page-header-headings h1').textContent.trim();
          if (!invalidCourseNames.includes(pageTitle)) {
            courseName = pageTitle;
          }
        }

        // 過濾掉無效的課程名稱
        if (invalidCourseNames.includes(courseName)) {
          courseName = '';
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

  const reportBtn = document.getElementById('e3-helper-report-btn');
  if (reportBtn && !reportBtn.dataset.bound) {
    reportBtn.dataset.bound = 'true';
    reportBtn.addEventListener('click', () => {
      window.open('https://forms.gle/SbPcqgVRuNSdVyqK9', '_blank');
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
      // 初始化通知 badge 計數
      updateNotificationBadge();
    });
  } else {
    // DOM 已經載入完成
    if (window.location.hostname.includes('e3.nycu.edu.tw') || window.location.hostname.includes('e3p.nycu.edu.tw')) {
      collectAssignmentInfo();
    }
    createSidebar();
    bindSyncButton();
    updateSyncStatus();
    // 初始化通知 badge 計數
    updateNotificationBadge();
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

// 監聽來自 background script 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkParticipants') {
    console.log('E3 Helper: 收到成員檢測請求');

    // 執行成員檢測
    checkAllCoursesParticipants().then(changes => {
      sendResponse({
        success: true,
        changes: changes ? changes.length : 0
      });
    }).catch(error => {
      console.error('E3 Helper: 成員檢測失敗', error);
      sendResponse({
        success: false,
        error: error.message
      });
    });

    // 返回 true 表示會異步回應
    return true;
  } else if (request.action === 'loadAnnouncementsAndMessagesInTab') {
    console.log('E3 Helper: 收到載入公告和信件的請求');

    // 執行載入
    Promise.all([loadAnnouncements(), loadMessages()]).then(() => {
      console.log('E3 Helper: 公告和信件載入完成');
      sendResponse({
        success: true,
        message: '公告和信件已載入'
      });
    }).catch(error => {
      console.error('E3 Helper: 載入公告和信件失敗', error);
      sendResponse({
        success: false,
        error: error.message
      });
    });

    // 返回 true 表示會異步回應
    return true;
  }
});

// 啟動
init();

// 暴露測試函數到 window 對象（方便在 Console 測試）
try {
  console.log('E3 Helper: 正在設置 window.E3Helper...');
  window.E3Helper = {
    checkParticipants: checkAllCoursesParticipants,
    fetchCourseParticipants: fetchCourseParticipants,
    loadNotifications: loadNotifications,
    updateNotificationBadge: updateNotificationBadge
  };
  console.log('E3 Helper: window.E3Helper 已設置');
} catch (error) {
  console.error('E3 Helper: 設置 window.E3Helper 失敗', error);
}
