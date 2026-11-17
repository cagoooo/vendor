# 校園點餐系統 開發進度記錄

> 最後更新：2026-01-11 08:12

---

## 🛠️ v1.0.2（2026-11-17，版本號以 `version.json` 為準）

- 修正離線快取只清除自己的舊快取，不再誤刪同網域其他工具的快取（`frontend/public/sw.js` 只刪 `campus-food-` 開頭的舊版）。

---

## 🪶 v1.0.1（2026-11-17，版本號以 `version.json` 為準）

- 首頁（班級選擇頁）、點餐頁、載入畫面與 `home.html` 的頁尾最後一行新增作者署名「Made with ❤️ by 阿凱老師」・桃園市龍潭區石門國民小學，「阿凱老師」連到阿凱老師教育科技創新專區；共用元件 `src/components/SiteCredit.tsx`。

---

## 📦 目前版本：v3.4.0

### ✅ v3.4.0 新功能 (2026-01-11)

#### 1. 取餐叫號動畫增強 🎉
- 新增 Confetti 彩花特效（訂單完成時觸發）
- 新增 CookingAnimation 烹飪動畫（製作中 🍳 / 排隊中 🔥）
- 訂單卡片加入動態進度條暗示
- 請取餐卡片加入入場彈跳動畫和脈衝發光效果

#### 2. CustomerApp Hero Banner RWD 優化 📱
- 增加 Banner 最小高度，確保文字不被截斷
- 優化手機端文字排版和間距
- 改善漸層背景讓文字更清晰

---

### ✅ v3.3.x 功能 (2026-01-10)
- 技術債清理（移除 console.log、替換 any 類型）
- PWA 安裝提示功能
- 虛擬列表優化

---

### ✅ v3.1.0 新功能 (2026-01-09)

### ✅ v3.0.0 已完成功能

#### 1. 多班級獨立庫存系統
- 每個班級有獨立的菜單 (`kitchens/{classId}/menuItems/`)
- 每個班級有獨立的訂單 (`kitchens/{classId}/orders/`)
- 每個班級有獨立的系統設定 (`kitchens/{classId}/system/config`)

#### 2. 班級選擇首頁 (`ClassSelectorPage`)
- 路由：`/` (首頁)
- 顯示所有開放點餐的班級攤位
- 顧客可選擇要點餐的班級

#### 3. 動態路由支援
- `/order/:classId` - 指定班級的顧客點餐頁面
- `/display/:classId` - 指定班級的叫號顯示頁面
- `/pickup/:classId` - 指定班級的取餐頁面
- `/kitchen` - 廚房管理（支援 `?class=xxx` 參數)

#### 4. 店長班級切換功能
- `owner` 角色可在 KitchenApp 右上角切換管理不同班級
- 支援從 URL 參數 `?class=classId` 自動選擇班級
- AdminApp 的班級廚房卡片可點擊直接進入該班級後台

#### 5. 簡化登入流程
- 移除 Email 登入選項，僅保留 Google 登入
- 登入頁面簡化，只有一個 Google 登入按鈕

#### 6. Google OAuth 驗證優化
- 應用程式名稱統一為「校園點餐系統」
- 新增靜態 HTML 內容給 Google 爬蟲
- 新增 Google Search Console 驗證檔案
- 隱私權政策連結使用正確的 base path

---

## 🔄 進行中 / 待 Google 審核

### Google OAuth 同意畫面驗證
**狀態：等待 Google 重新爬取**

已修正的問題：
- ✅ 網站所有權驗證（已通過）
- ⏳ 首頁未說明應用程式用途
- ⏳ 名稱不一致 (OAuth 名稱 vs 首頁顯示)
- ⏳ 首頁不含隱私權政策的連結

**解決方案已部署：**
- `index.html` 已包含直接顯示的靜態內容（不再使用 noscript）
- 靜態內容包含：
  - `<h1>🍽️ 校園點餐系統</h1>`
  - 應用程式說明文字
  - 隱私權政策連結
- Google 可能需要幾小時重新爬取頁面

**下一步：**
1. 等待 GitHub Actions 部署完成
2. 在 Google OAuth 驗證頁面點擊「我已解決問題」
3. 如果仍失敗，可能需要等待 Google 快取更新

---

## 📁 關鍵檔案路徑

| 檔案 | 說明 |
|------|------|
| `frontend/src/apps/customer/ClassSelectorPage.tsx` | 班級選擇首頁 |
| `frontend/src/apps/customer/CustomerApp.tsx` | 顧客點餐應用 |
| `frontend/src/apps/kitchen/KitchenApp.tsx` | 廚房管理應用（含班級切換）|
| `frontend/src/apps/kitchen/LoginPage.tsx` | 登入頁面（僅 Google）|
| `frontend/src/apps/admin/AdminApp.tsx` | 管理中心（含班級廚房卡片點擊功能）|
| `frontend/src/services/classApi.ts` | 班級隔離 API |
| `frontend/index.html` | 靜態 HTML（含 Google OAuth 用內容）|
| `frontend/public/privacy.html` | 隱私權政策頁面 |
| `frontend/public/google6de03ad76f9c1b29.html` | Google Search Console 驗證檔案 |
| `firestore.rules` | Firestore 安全規則 |

---

## 🔐 權限系統

| 角色 | 說明 | 權限 |
|------|------|------|
| `owner` | 店長/管理員 | 可管理所有班級、審核用戶、切換班級 |
| `classAdmin` | 班級管理員 | 只能管理自己被指派的班級 |
| `pending` | 待審核 | 已申請但等待 owner 審核 |
| `none` | 無權限 | 一般用戶，只能點餐 |

---

## 🌐 線上網址

- **GitHub Pages**: https://cagoooo.github.io/vendor/
- **Firebase Console**: https://console.firebase.google.com/project/vendor-5383c
- **Google Cloud Console**: https://console.cloud.google.com/

---

## 🗂️ Firebase Firestore 結構

```
kitchens/
  {classId}/                    # 例如 class-6-7
    className: "6年7班"
    ownerUid: "xxx"
    ownerName: "Kai A"
    isOpen: true
    createdAt: Timestamp
    
    menuItems/                  # 菜單品項
      {itemId}/
        name: "雞腿飯"
        price: 80
        stock: 50
        imageUrl: "https://..."   # 圖片 URL（Firebase Storage）
        isActive: true
        
    orders/                     # 訂單
      {orderId}/
        customerInfo: { class: "3年1班", name: "小明" }
        items: [...]
        status: "Pending" | "Preparing" | "Completed" | "Paid"
        
    system/
      config/                   # 系統設定
        isOpen: true
        waitTime: 15

users/
  {uid}/
    email: "xxx@gmail.com"
    name: "Kai A"
    role: "owner" | "classAdmin" | "pending" | "none"
    classId: "class-6-7"        # 只有 classAdmin 有
```

---

## 📋 待辦事項 (未來可做)

1. **AdminApp 班級管理增強**
   - 新增班級功能
   - 編輯班級資訊
   - 刪除班級

2. **數據統計**
   - 跨班級銷售統計（owner 專用）
   - 導出銷售報表

3. **其他優化**
   - 訂單通知音效優化
   - PWA 離線支援增強
   - 更多 UI 細節調整

---

## 🚀 開發指令

```bash
# 本地開發
cd h:\vendor\campus-food-order\frontend
npm run dev -- --port 3300

# 構建
npm run build

# 部署 Firestore 規則
firebase deploy --only firestore:rules

# 推送到 GitHub（自動觸發 GitHub Actions 部署）
git add -A
git commit -m "your message"
git push origin main
```

---

## 📝 最近 Git 提交記錄

```
1102711 fix: 移除 noscript 改為直接顯示靜態內容給 Google 爬蟲
0d80c69 feat: 班級廚房卡片可點擊直接進入後台管理
041b401 fix: 新增靜態 meta 標籤和 noscript 內容給 Google OAuth 驗證
3ff72f3 chore: 新增 Google Search Console 驗證檔案
ecfb3e8 refactor: 移除 Email 登入，僅保留 Google 登入
235c25a v3.0.0: 多班級獨立庫存系統
```

---

下次回來時，可以直接：
1. 開啟 VS Code 在 `h:\vendor\campus-food-order`
2. 執行 `cd frontend && npm run dev -- --port 3300`
3. 訪問 http://localhost:3300/ 測試
4. 檢查 Google OAuth 驗證是否通過
