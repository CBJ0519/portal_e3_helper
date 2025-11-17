# E3 Helper 除錯指南

## 如何查看除錯資訊

1. **重新載入擴充功能**
   - 開啟 `chrome://extensions/`
   - 找到「NYCU E3 Helper」
   - 點擊重新載入按鈕（🔄）

2. **開啟 E3 首頁**
   - 訪問 https://e3p.nycu.edu.tw/
   - 按 F12 開啟開發者工具
   - 切換到 Console 分頁

3. **查看輸出**
   應該會看到：
   ```
   NYCU E3 Helper 已載入
   E3 Helper: 未找到作業事件，除錯資訊：[Array]
   E3 Helper: DOM 監聽已啟動
   ```

4. **展開陣列查看詳細資訊**
   - 點擊 `[Array]` 展開
   - 會顯示：
     - 找到多少個可能的事件元素
     - 偵測到哪些作業事件
     - 按鈕是否成功插入

## 常見問題排查

### 問題 1：找到 0 個可能的事件元素

**可能原因**：
- 頁面還沒載入完成
- E3 的 HTML 結構改變了

**解決方法**：
1. 等待頁面完全載入（看到課程列表）
2. 在 Console 執行：`window.e3HelperRefresh()`
3. 查看是否有輸出

### 問題 2：偵測到作業但找不到作業連結

**可能原因**：
- 作業連結的 URL 格式不同
- 作業連結是動態載入的

**解決方法**：
1. 手動檢查作業連結的 HTML
2. 右鍵點擊作業 → 檢查元素
3. 查看連結的 href 屬性
4. 回報給開發者

### 問題 3：YUI 錯誤

這是 Moodle 自己的錯誤，不是擴充功能造成的。可以忽略。

## 手動測試指令

在 Console 執行以下指令來測試：

```javascript
// 手動執行一次按鈕添加
window.e3HelperRefresh()

// 查看所有可能的事件元素
document.querySelectorAll('[data-event-component], .event, [data-region="event-item"]').length

// 查看所有作業連結
document.querySelectorAll('a[href*="/mod/assign/view.php"]')

// 查看頁面上所有包含「作業」的元素
Array.from(document.querySelectorAll('*')).filter(el => el.textContent.includes('作業'))
```

## 回報問題

如果仍然無法運作，請提供：

1. Console 的完整輸出（截圖）
2. E3 頁面的 URL
3. 作業元素的 HTML（右鍵檢查元素，複製外層 HTML）
4. 瀏覽器版本

