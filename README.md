# NYCU E3 Helper

優化陽明交通大學 E3 學習平台的使用體驗。

## 功能

### ✅ 已實作

#### 1. 一鍵前往作業按鈕
- **問題**：在首頁時間軸、日曆等地方看到作業時，點擊可能會跳到日曆頁面，需要額外步驟才能進入作業
- **解決**：在每個作業旁邊自動新增「📝 前往作業」按鈕，點擊直接進入作業頁面
- **設計**：
  - 紫色漸層按鈕，醒目且美觀
  - 滑鼠懸停時有動畫效果
  - 按鈕文字清楚標示「前往作業」

**支援位置**：
- ✅ 首頁時間軸的作業事件
- ✅ 日曆頁面的作業事件
- ✅ 通知中心的作業通知
- ✅ 課程總覽的作業列表
- ✅ 所有包含作業資訊的區塊

**使用範例**：
```
作業名稱: Midterm Survey  [📝 前往作業]
                            ↑ 點這裡直接進入作業頁面
```

### 🔮 規劃中

#### 2. 作業截止時間提醒
- 視覺化顯示即將到期的作業
- 瀏覽器通知

#### 3. 快速下載教材
- 批次下載課程檔案
- 自動整理資料夾結構

#### 4. 公告聚合
- 整合所有課程的最新公告
- 標記已讀/未讀

## 安裝方式

### Chrome / Edge

1. 下載或 clone 此專案
2. 開啟瀏覽器，進入擴充功能管理頁面
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. 開啟「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇 `e3_helper` 資料夾
6. 完成！

## 使用方式

安裝後，訪問 E3 平台：
- https://e3.nycu.edu.tw/
- https://e3p.nycu.edu.tw/

擴充功能會自動運作，無需額外設定。

### 驗證功能是否運作

1. 開啟 E3 首頁（https://e3p.nycu.edu.tw/）
2. 按 F12 開啟開發者工具
3. 切換到 Console 分頁
4. 應該會看到：
   ```
   NYCU E3 Helper 已載入
   E3 Helper: 已新增 X 個「前往作業」按鈕
   E3 Helper: DOM 監聽已啟動
   ```

5. 查看作業按鈕：
   - 在首頁時間軸找到作業事件
   - 應該會看到紫色的「📝 前往作業」按鈕
   - 點擊按鈕直接進入作業頁面

6. 測試按鈕效果：
   - 滑鼠移到按鈕上，應該有漸變和陰影效果
   - 點擊後直接進入 `/mod/assign/view.php`

## 技術細節

### 一鍵前往作業按鈕

**實作原理**：

1. **偵測作業事件**
   - 搜尋所有事件容器：`[data-event-component]`, `.event`, `[data-region="event-item"]`
   - 判斷是否為作業：
     - 文字包含「作業」
     - 有 `assign` 相關類別
     - `data-event-component="mod_assign"`

2. **創建按鈕**
   ```javascript
   const btn = document.createElement('a');
   btn.href = assignUrl;
   btn.className = 'e3-helper-btn';
   btn.textContent = '前往作業';
   ```

3. **插入按鈕**
   - 優先插入到作業標題後面
   - 如果找不到標題，插入到第一個連結後面
   - 使用 `insertAdjacentElement('afterend', btn)`

4. **樣式設計**
   ```css
   .e3-helper-btn {
     background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
     color: white;
     padding: 4px 12px;
     border-radius: 4px;
     /* 滑鼠懸停時反轉漸層方向 */
   }
   ```

**處理動態內容**：
- 使用 `MutationObserver` 監聽 DOM 變化
- 新增節點時自動添加按鈕
- 使用 `data-e3helper-processed` 標記避免重複處理

**防止重複**：
```javascript
if (item.dataset.e3helperProcessed) {
  return; // 已處理過，跳過
}
item.dataset.e3helperProcessed = 'true';
```

## 相容性

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave
- ✅ 其他 Chromium 核心瀏覽器

## 隱私權

- 不收集任何資料
- 不追蹤使用者行為
- 所有操作僅在本地瀏覽器執行
- 不連接任何外部伺服器

## 授權

MIT License

## 開發

### 專案結構

```
e3_helper/
├── manifest.json      # Chrome Extension 配置
├── content.js         # 內容腳本（核心功能）
└── README.md          # 說明文件
```

### 除錯

在 E3 頁面上按 F12，在 Console 執行：

```javascript
// 手動刷新作業連結修改
window.e3HelperRefresh();
```

### 貢獻

歡迎提交 Issue 和 Pull Request！

## 常見問題

### Q: 為什麼有些作業連結沒有被修改？

A: 可能原因：
1. 該連結已經有 action 參數
2. 連結是動態載入的，可能需要等待一段時間
3. 可以在 Console 執行 `window.e3HelperRefresh()` 手動刷新

### Q: 修改後的連結安全嗎？

A: 完全安全。我們只是添加一個 URL 參數，這是 Moodle 原生支援的功能，不會造成任何問題。

### Q: 會影響成績或繳交記錄嗎？

A: 不會。我們只是改變進入頁面的方式，不會修改任何資料或功能。

## 更新日誌

### v1.0.0 (2025-01-14)
- ✨ 新功能：一鍵前往作業按鈕
- ✨ 紫色漸層按鈕設計，醒目美觀
- ✨ 支援動態載入的內容（MutationObserver）
- ✨ 自動偵測所有作業事件並添加按鈕
- ✨ 滑鼠懸停動畫效果
