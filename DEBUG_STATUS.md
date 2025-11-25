# 自動檢測除錯狀態 - 2025-11-25

## 問題描述

使用者報告：自動檢測繳交狀態功能檢查 0 個作業，即使日誌顯示所有作業都「準備檢查」。

```
E3 Helper: 準備檢查作業 - Challenge 3 (ID: 52204)
E3 Helper: 準備檢查作業 - DSA HW (F) (ID: 52431)
... (9 個作業)
E3 Helper: 繳交狀態檢查完成 - 已檢查 0 個作業
```

## 已完成的修復

### 1. 提交狀態判斷邏輯 (8db2908)
- **問題**: 草稿 (status='new') 被誤判為已繳交
- **修復**: 只有 `status === 'submitted'` 才算已繳交
- **位置**: background.js:721-731

### 2. 作業保留邏輯 (8db2908)
- **問題**: 自動檢測的已繳交作業在下次同步時消失
- **修復**: 保留條件改為檢查 `assignmentStatuses[id]` 或 `assignment.manualStatus`
- **位置**: background.js:550-564

### 3. URL 補齊時機 (a33d1c6, 53ac14d)
- **問題**: 作業沒有 URL → 檢測失敗 → 不保留 → URL 不補齊（死循環）
- **修復**: 在合併前補齊新作業的 URL 和課程名稱
- **位置**: background.js:449-493

### 4. 狀態持久化 (8db2908)
- **問題**: 自動檢測的狀態沒有保存到 `assignmentStatuses`
- **修復**: 在檢測到已繳交時同時保存到 `assignmentStatuses` 和 `assignment.manualStatus`
- **位置**: background.js:733-740

### 5. 監聽器重複觸發 (多次提交)
- **問題**: MutationObserver 導致數百次重複觸發
- **修復**:
  - 添加 `assignmentPageListenerSetup` 標記
  - 添加 10 秒最小觸發間隔
  - 只監聽通知元素
- **位置**: content.js:2886-2976

## 當前診斷工作 (2dda941, cb6a04f)

由於問題仍未解決（checkedCount 始終為 0），新增了**超詳細診斷日誌**來追蹤每一步：

### 新增的診斷點

| 行數 | 診斷內容 | 目的 |
|------|---------|------|
| 665 | 總作業數量 | 確認檢測開始 |
| 670 | 跳過手動作業 | 確認手動作業被正確跳過 |
| 676 | 跳過無效 URL | 確認 URL 過濾邏輯 |
| 680 | 準備檢查作業 | 確認作業通過初步過濾 |
| 686 | **URL 解析結果** | **確認 cmid 是否成功提取** |
| 689 | 跳過無 cmid | 確認 cmid 檢查邏輯 |
| 695 | 發送 API 請求 | 確認請求已發送 |
| 710 | **API 響應狀態** | **確認 HTTP 狀態碼和 ok 值** |
| 714 | **API 數據結構** | **確認 data[0].data 是否存在** |
| 743 | 檢測到已繳交 | 確認成功檢測 |
| 747 | 狀態不一致 | 確認狀態保護邏輯 |
| 749 | 繳交狀態 | 確認所有檢查結果 |
| 753 | **成功檢查** | **確認 checkedCount 遞增** |
| 757 | 錯誤處理 | 捕捉任何異常 |
| 765 | 檢查完成總結 | 最終統計 |

### 關鍵診斷點

**問題定位的三個關鍵日誌**（如果 checkedCount=0，必定在這三處之一出問題）：

1. **Line 686 - URL 解析**
   ```javascript
   console.log(`E3 Helper: URL 解析 - ${assignment.name}, cmid: ${cmid}, URL: ${assignment.url}`);
   ```
   - 如果 cmid 為 null → URL 格式問題

2. **Line 710 - API 響應**
   ```javascript
   console.log(`E3 Helper: API 響應狀態 - ${assignment.name}, status: ${response.status}, ok: ${response.ok}`);
   ```
   - 如果 ok 為 false → API 請求失敗（登入/權限/網路問題）

3. **Line 714 - 數據結構**
   ```javascript
   console.log(`E3 Helper: API 數據結構 - ${assignment.name}, hasData: ${!!(data && data[0] && data[0].data)}`);
   ```
   - 如果 hasData 為 false → API 返回格式不符預期

**checkedCount 只有在通過這三個檢查後才會遞增**（line 752）。

## 下一步操作

### 使用者需要做的事：

1. **重新載入擴充功能**
   ```
   1. 打開 chrome://extensions/
   2. 找到「NYCU E3 Helper」
   3. 點擊「重新載入」按鈕
   ```

2. **開啟 Service Worker Console**
   ```
   在擴充功能卡片上點擊「Service Worker」連結
   ```

3. **執行同步並收集日誌**
   ```
   1. 打開側邊欄
   2. 點擊「🔄 同步」按鈕
   3. 等待同步完成
   4. 在 Service Worker Console 中找到以下日誌範圍：
      - 開始：「E3 Helper: 自動檢測開始檢查 X 個作業...」
      - 結束：「E3 Helper: 繳交狀態檢查完成 - 已檢查 Y 個作業」
   5. 複製完整的這段日誌
   ```

4. **提供日誌**
   ```
   特別注意以下關鍵日誌：
   - URL 解析：cmid 的值
   - API 響應：status 和 ok 的值
   - API 數據結構：hasData 的值
   ```

### 預期發現

根據日誌內容，我們將能夠確定：

- **如果沒有「URL 解析」日誌** → 所有作業在「準備檢查」後就拋出異常了（try-catch 捕捉）
- **如果有「URL 解析」但 cmid=null** → URL 格式問題，可能 E3 API 返回的 URL 不包含 id 參數
- **如果 cmid 正確但 ok=false** → API 請求失敗（未登入/sesskey 過期/權限問題）
- **如果 ok=true 但 hasData=false** → API 返回結構變更或錯誤響應
- **如果 hasData=true 但 checkedCount=0** → 數據解析邏輯有問題（這個可能性最低，因為邏輯已驗證）

## 參考文件

- **DIAGNOSTIC_LOG_GUIDE.md** - 詳細的日誌解讀指南
- **STORE_DESCRIPTION.txt** - 功能說明（v1.7）

## Git 版本

```bash
# 最新提交
cb6a04f docs: 新增自動檢測診斷日誌指南
2dda941 debug: 添加完整的自動檢測流程診斷日誌
6da438a debug: 添加自動檢測跳過原因的詳細日誌
8e4327d debug: 添加詳細 URL 診斷日誌並改進補齊條件
a33d1c6 fix: 在合併前補齊新作業 URL，確保自動檢測正常工作
53ac14d fix: 補齊作業 URL 以啟用自動檢測繳交狀態
8db2908 fix: 修復自動檢測的已繳交作業不被保留的問題

# 查看變更
git log --oneline -10
git show 2dda941
```

## 已知限制

1. **只檢測 E3 同步的作業** - 手動新增的作業不會自動檢測（設計如此）
2. **需要有效的 URL** - URL 必須包含 `mod/assign/view.php?id=數字` 格式
3. **需要登入狀態** - 必須已登入 E3 才能檢查繳交狀態
4. **8 秒超時** - 每個作業的 API 請求有 8 秒超時限制
5. **200ms 延遲** - 每個作業之間間隔 200ms，避免請求過快

## 結論

目前已實施最詳盡的診斷日誌系統，覆蓋自動檢測流程的每個步驟。下次測試應該能明確定位問題所在。一旦獲得新的日誌，就能立即判斷：

1. **URL 解析** 是否成功
2. **API 請求** 是否成功
3. **數據結構** 是否正確

這三個檢查點之一必定會暴露問題。
