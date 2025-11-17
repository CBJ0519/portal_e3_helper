// NYCU E3 Helper - Background Script (Service Worker)
// 處理下載請求和自動同步

console.log('E3 Helper Background Script 已載入');

// 監聽來自 content script 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    console.log(`E3 Helper: 收到下載請求 - ${request.filename}`);

    // 使用 Chrome Downloads API 下載檔案
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: false // 不顯示儲存對話框，直接下載到預設位置
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('E3 Helper: 下載失敗', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log(`E3 Helper: 下載已開始，ID: ${downloadId}`);
        sendResponse({ success: true, downloadId: downloadId });
      }
    });

    // 返回 true 表示會異步回應
    return true;
  } else if (request.action === 'syncNow') {
    // 手動觸發同步
    console.log('E3 Helper: 收到手動同步請求');
    syncE3Data().then(result => {
      sendResponse(result);
    });
    return true;
  }
});

// ==================== 自動同步功能 ====================

// 安裝時設定定時同步
chrome.runtime.onInstalled.addListener(() => {
  console.log('E3 Helper: 擴充功能已安裝/更新');

  // 設定每小時同步一次
  chrome.alarms.create('syncE3Data', {
    periodInMinutes: 60
  });

  // 立即執行一次同步
  syncE3Data();
});

// 監聽定時器
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncE3Data') {
    console.log('E3 Helper: 定時同步觸發');
    syncE3Data();
  }
});

// 同步 E3 資料
async function syncE3Data() {
  console.log('E3 Helper: 開始同步資料...', new Date().toLocaleTimeString());

  const syncResult = {
    success: false,
    timestamp: Date.now(),
    assignments: 0,
    courses: 0,
    error: null,
    loginRequired: false
  };

  try {
    // 檢查登入狀態
    console.log('E3 Helper: 檢查登入狀態...');
    const isLoggedIn = await checkLoginStatus();
    console.log('E3 Helper: 登入狀態:', isLoggedIn);

    if (!isLoggedIn) {
      console.log('E3 Helper: 未登入 E3，無法同步');
      syncResult.loginRequired = true;
      syncResult.error = '請先登入 E3';
      await chrome.storage.local.set({ lastSync: syncResult });
      return syncResult;
    }

    // 同步作業資料
    console.log('E3 Helper: 開始同步作業...');
    const assignments = await syncAssignments();
    console.log(`E3 Helper: 作業同步完成，共 ${assignments.length} 個`);
    syncResult.assignments = assignments.length;

    // 同步課程列表
    console.log('E3 Helper: 開始同步課程...');
    const courses = await syncCourses();
    console.log(`E3 Helper: 課程同步完成，共 ${courses.length} 個`);
    syncResult.courses = courses.length;

    // 同步成績資料（僅在手動同步時執行，避免自動同步太慢）
    // 注意：這裡先不同步成績，因為會花很長時間

    // 儲存同步結果
    syncResult.success = true;
    await chrome.storage.local.set({
      lastSync: syncResult,
      lastSyncTime: Date.now()
    });

    console.log('E3 Helper: 同步完成', syncResult);
    return syncResult;

  } catch (error) {
    console.error('E3 Helper: 同步失敗', error);
    syncResult.error = error.message;

    // 檢查是否是登入問題
    if (error.message.includes('login') || error.message.includes('401')) {
      syncResult.loginRequired = true;
    }

    await chrome.storage.local.set({ lastSync: syncResult });
    return syncResult;
  }
}

// 檢查 E3 登入狀態
async function checkLoginStatus() {
  try {
    const response = await fetchWithTimeout('https://e3p.nycu.edu.tw/', {
      method: 'GET',
      credentials: 'include'
    }, 10000); // 增加到 10秒

    const text = await response.text();

    // 檢查是否被重定向到登入頁面
    if (response.url.includes('/login/') || text.includes('loginform')) {
      return false;
    }

    // 檢查是否包含登出按鈕（代表已登入）
    if (text.includes('logout') || text.includes('登出')) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('E3 Helper: 檢查登入狀態失敗', error);
    return false;
  }
}

// 取得 sesskey
async function getSesskey() {
  try {
    const response = await fetchWithTimeout('https://e3p.nycu.edu.tw/', {
      credentials: 'include'
    }, 10000); // 增加到 10秒
    const html = await response.text();

    // 從 HTML 中提取 sesskey
    const sesskeyMatch = html.match(/sesskey[="]([a-zA-Z0-9]+)/);
    if (sesskeyMatch) {
      return sesskeyMatch[1];
    }

    // 嘗試從 M.cfg.sesskey 提取
    const mConfigMatch = html.match(/M\.cfg\s*=\s*\{[^}]*"sesskey"\s*:\s*"([^"]+)"/);
    if (mConfigMatch) {
      return mConfigMatch[1];
    }

    return null;
  } catch (error) {
    console.error('E3 Helper: 取得 sesskey 失敗', error);
    return null;
  }
}

// 帶超時的 fetch
async function fetchWithTimeout(url, options, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('請求超時');
    }
    throw error;
  }
}

// 同步作業資料
async function syncAssignments() {
  console.log('E3 Helper: 正在同步作業...');

  const sesskey = await getSesskey();
  if (!sesskey) {
    throw new Error('無法取得 sesskey，請重新登入');
  }

  const url = `https://e3p.nycu.edu.tw/lib/ajax/service.php?sesskey=${sesskey}`;

  // 獲取日曆事件（15秒超時）
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify([{
      index: 0,
      methodname: 'core_calendar_get_action_events_by_timesort',
      args: {
        limitnum: 50,
        timesortfrom: Math.floor(Date.now() / 1000) - 86400 * 7, // 過去 7 天
        timesortto: Math.floor(Date.now() / 1000) + 86400 * 90  // 未來 90 天
      }
    }])
  }, 15000); // 增加到 15秒

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('E3 Helper: API 回應:', data);

  if (data && data[0] && data[0].error) {
    console.error('E3 Helper: API 錯誤:', data[0].error);
    throw new Error(data[0].error);
  }

  if (data && data[0] && data[0].data && data[0].data.events) {
    const events = data[0].data.events;

    // 過濾出作業
    const assignments = events
      .filter(event =>
        event.modulename === 'assign' ||
        event.name.includes('作業')
      )
      .map(event => ({
        eventId: event.id.toString(),
        name: event.name,
        course: event.course ? event.course.fullname : '',
        deadline: event.timesort * 1000,
        url: event.url,
        manualStatus: 'pending'
      }));

    // 載入現有的手動狀態和舊作業列表
    const storage = await chrome.storage.local.get(['assignmentStatuses', 'assignments']);
    const statuses = storage.assignmentStatuses || {};
    const oldAssignments = storage.assignments || [];
    console.log('E3 Helper: 讀取到的手動狀態:', statuses);
    console.log('E3 Helper: 手動狀態數量:', Object.keys(statuses).length);

    // 合併手動狀態和舊資料（包括課程名稱、URL 等）
    let mergedCount = 0;
    const oldAssignmentMap = new Map(oldAssignments.map(a => [a.eventId, a]));

    assignments.forEach(assignment => {
      const oldAssignment = oldAssignmentMap.get(assignment.eventId);

      // 合併手動狀態
      if (statuses[assignment.eventId]) {
        assignment.manualStatus = statuses[assignment.eventId];
        mergedCount++;
        console.log(`E3 Helper: 合併狀態 - 作業 ${assignment.eventId}: ${statuses[assignment.eventId]}`);
      }

      // 如果新作業沒有課程名稱，但舊資料有，則保留舊的課程名稱
      if (!assignment.course && oldAssignment && oldAssignment.course) {
        assignment.course = oldAssignment.course;
        console.log(`E3 Helper: 保留課程名稱 - 作業 ${assignment.eventId}: ${oldAssignment.course}`);
      }

      // 如果新作業沒有 URL，但舊資料有，則保留舊的 URL
      if (!assignment.url && oldAssignment && oldAssignment.url) {
        assignment.url = oldAssignment.url;
      }
    });
    console.log(`E3 Helper: 已合併 ${mergedCount} 個手動狀態到 ${assignments.length} 個作業`);

    // 找出那些已標記為「已繳交」但不在新列表中的舊作業（可能已過期但用戶想保留）
    const newAssignmentIds = new Set(assignments.map(a => a.eventId));
    const keptOldAssignments = oldAssignments
      .filter(oldAssignment => {
        // 保留條件：不在新列表中 && 手動標記為已繳交
        return !newAssignmentIds.has(oldAssignment.eventId) &&
               statuses[oldAssignment.eventId] === 'submitted';
      })
      .map(oldAssignment => {
        // 確保 manualStatus 是最新的
        return {
          ...oldAssignment,
          manualStatus: statuses[oldAssignment.eventId]
        };
      });

    if (keptOldAssignments.length > 0) {
      console.log(`E3 Helper: 保留 ${keptOldAssignments.length} 個已繳交的舊作業:`,
                  keptOldAssignments.map(a => ({ id: a.eventId, name: a.name, status: a.manualStatus })));
      // 將舊作業加到列表末尾
      assignments.push(...keptOldAssignments);
    }

    // 對於沒有課程名稱的作業，嘗試從 API 獲取完整資訊
    // 注意：這個檢查要在保留舊作業之後，才能涵蓋所有作業（包括保留的舊作業）
    const assignmentsWithoutCourse = assignments.filter(a => !a.course || a.course === '');
    if (assignmentsWithoutCourse.length > 0) {
      console.log(`E3 Helper: 發現 ${assignmentsWithoutCourse.length} 個作業沒有課程名稱，嘗試從 API 獲取...`);

      for (const assignment of assignmentsWithoutCourse) {
        try {
          const eventDetailUrl = `https://e3p.nycu.edu.tw/lib/ajax/service.php?sesskey=${sesskey}`;
          const eventResponse = await fetchWithTimeout(eventDetailUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify([{
              index: 0,
              methodname: 'core_calendar_get_calendar_event_by_id',
              args: { eventid: parseInt(assignment.eventId) }
            }])
          }, 10000);

          if (eventResponse.ok) {
            const eventData = await eventResponse.json();
            if (eventData && eventData[0] && eventData[0].data && eventData[0].data.event) {
              const event = eventData[0].data.event;
              if (event.course && event.course.fullname) {
                assignment.course = event.course.fullname;
                console.log(`E3 Helper: 作業 ${assignment.eventId} (${assignment.name}) 補齊課程: ${event.course.fullname}`);
              }
            }
          }
        } catch (error) {
          console.error(`E3 Helper: 獲取作業 ${assignment.eventId} 詳細資訊失敗:`, error);
        }
      }
    }

    // 儲存作業列表
    await chrome.storage.local.set({ assignments: assignments });
    console.log(`E3 Helper: 已同步 ${assignments.length} 個作業（包含 ${keptOldAssignments.length} 個保留的已繳交作業）`);

    return assignments;
  }

  return [];
}

// 同步課程列表
async function syncCourses() {
  console.log('E3 Helper: 正在同步課程...');

  const sesskey = await getSesskey();
  if (!sesskey) {
    throw new Error('無法取得 sesskey，請重新登入');
  }

  const url = `https://e3p.nycu.edu.tw/lib/ajax/service.php?sesskey=${sesskey}`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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
  }, 15000); // 增加到 15秒

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('E3 Helper: 課程 API 回應:', data);

  if (data && data[0] && data[0].error) {
    console.error('E3 Helper: 課程 API 錯誤:', data[0].error);
    throw new Error(data[0].error);
  }

  if (data && data[0] && data[0].data && data[0].data.courses) {
    const courses = data[0].data.courses;

    // 儲存課程列表
    await chrome.storage.local.set({ courses: courses });
    console.log(`E3 Helper: 已同步 ${courses.length} 個課程`);

    return courses;
  }

  return [];
}

// 監聽來自 content script 的連接請求
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'e3-helper') {
    console.log('E3 Helper: Content script 已連接');

    // 發送最後同步時間
    chrome.storage.local.get(['lastSync', 'lastSyncTime'], (result) => {
      port.postMessage({
        type: 'syncStatus',
        data: result
      });
    });
  }
});
