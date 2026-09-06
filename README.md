# 校園點餐系統 (Campus Food Order)

🌐 **線上使用：[校園點餐系統](https://cagoooo.github.io/vendor/)**

基於 Firebase + React 的現代化校園園遊會點餐系統。

## 🌟 功能特色

- **即時同步**：使用 Firestore 即時資料庫，訂單狀態即時更新
- **三端分離**：顧客點餐、廚房管理、叫號顯示完全獨立
- **響應式設計**：支援手機、平板、大螢幕等各種裝置
- **離線支援**：前端使用 localStorage 快取，網路不穩也能使用
- **PWA 就緒**：可安裝到手機主畫面

## 📦 專案結構

```
campus-food-order/
├── frontend/                # React 前端
│   ├── src/
│   │   ├── apps/            # 三個獨立應用
│   │   │   ├── customer/    # 顧客點餐 App
│   │   │   ├── kitchen/     # 廚房管理 App
│   │   │   └── display/     # 叫號顯示 App
│   │   ├── components/      # 共用元件
│   │   ├── hooks/           # 自訂 Hooks
│   │   ├── stores/          # Zustand 狀態管理
│   │   ├── services/        # Firebase 服務
│   │   └── types/           # TypeScript 型別
│   └── ...
├── functions/               # Cloud Functions
│   └── src/
│       └── index.ts         # API 端點
├── firestore.rules          # Firestore 安全規則
└── firebase.json            # Firebase 設定
```

## 🚀 快速開始

### 1. 建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 建立新專案
3. 啟用 Firestore Database
4. 啟用 Authentication (Email/Password)
5. 複製專案設定

### 2. 設定環境變數

```bash
cd frontend
cp .env.example .env
```

編輯 `.env` 填入您的 Firebase 設定：

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. 安裝相依套件

```bash
# 前端
cd frontend
npm install

# Cloud Functions
cd ../functions
npm install
```

### 4. 本地開發

```bash
# 啟動前端開發伺服器
cd frontend
npm run dev
```

開啟瀏覽器：
- 顧客點餐：http://localhost:3000/
- 廚房管理：http://localhost:3000/kitchen
- 叫號顯示：http://localhost:3000/display

### 5. 使用 Firebase 模擬器 (選用)

```bash
# 設定環境變數
echo "VITE_USE_EMULATOR=true" >> frontend/.env

# 啟動模擬器
firebase emulators:start
```

## 📱 路由說明

| 路徑 | 說明 | 用途 |
|------|------|------|
| `/` | 班級選擇 | 顧客選擇要點餐的班級攤位 |
| `/order/:classId` | 顧客點餐 | 指定班級的點餐介面 |
| `/kitchen` | 廚房管理 | 管理訂單與庫存（店長可切換班級）|
| `/display/:classId` | 叫號顯示 | 大螢幕顯示指定班級的取餐資訊 |
| `/admin` | 管理中心 | 店長專用班級和用戶管理 |

## 🔐 廚房管理權限

系統使用 Firebase Authentication 管理廚房權限：

### 權限設定步驟
1. 在 [Firebase Console](https://console.firebase.google.com/) 啟用 Google 登入
2. 用 Google 帳號登入 `/kitchen`
3. 在 Firestore `users` 集合中將您的 `role` 改為 `owner`

### 角色說明
| 角色 | 權限 |
|------|------|
| `owner` | 完整權限，可清除資料 |
| `staff` | 接單、調庫存 |
| `none` | 無權限 |

## 📦 版本

**v3.4.2** (2026-03-10)
- 🍔 擴充預設品項分類，涵蓋更多校園常見餐點
- ➕ 新增自訂分類快捷流程，可在新增品項時直接新增分類
- 📦 新增「載入豐富預設值」功能，方便舊班級一鍵升級分類列表

**v3.0.0** (2026-01-09)
- 🏫 多班級獨立庫存系統 - 每個班級有自己的菜單和庫存
- 📋 班級選擇首頁 - 顧客可選擇要點餐的班級攤位
- 🔄 班級切換功能 - 店長可在廚房後台切換管理不同班級
- 🔗 動態路由支援 - `/order/:classId`、`/display/:classId`
- 🔒 OAuth 驗證優化 - 符合 Google OAuth 同意畫面要求

**v2.0.0** (2026-01-08)
- ✨ PWA 支援 - 可安裝到手機
- 🔐 Firebase 身份驗證 (Google/Email)
- 👥 權限分級 (店長/員工)
- 📸 菜單圖片上傳準備
- 🎨 UI 排版優化

## 🛠️ 部署

### 部署到 Firebase Hosting

```bash
# 建置前端
cd frontend
npm run build

# 部署
cd ..
firebase deploy
```

## 📝 API 端點

如果需要使用 Cloud Functions（而非直接連接 Firestore），可以部署以下端點：

| 端點 | 方法 | 說明 |
|------|------|------|
| `/getMenu` | GET | 取得菜單與系統狀態 |
| `/getTrending` | GET | 取得熱銷品項 |
| `/placeOrder` | POST | 顧客下單 |
| `/getOrders` | GET | 取得訂單列表 |
| `/updateOrderStatus` | POST | 更新訂單狀態 |
| `/updateStock` | POST | 更新庫存 |
| `/getStats` | GET | 取得統計資料 |

## 📊 Firestore 資料結構

### menuItems
```typescript
{
  id: string;
  name: string;
  price: number;
  stock: number;
  category: 'main' | 'drink' | 'dessert';
  isActive: boolean;
}
```

### orders
```typescript
{
  id: string;
  customerInfo: { class: string; name: string; };
  items: Array<{ name: string; quantity: number; price: number; }>;
  totalPrice: number;
  status: 'Pending' | 'Preparing' | 'Completed' | 'Paid' | 'Cancelled';
  createdAt: Timestamp;
}
```

### system/config
```typescript
{
  isOpen: boolean;
  waitTime: number;
}
```

## 🤝 貢獻

歡迎提交 Pull Request 或開 Issue！

## 📄 授權

MIT License

---

<!-- BEGIN:PROJECT_GUIDE -->
## 專案導覽

校園點餐系統

- 專案定位：校務／行政流程數位化專案
- Repository：`cagoooo/vendor`
- 可見性：公開
- 主要技術：TypeScript、Firebase
- 線上入口：<https://cagoooo.github.io/vendor/>

### 可以怎麼應用

- 把紙本、試算表或人工通知流程轉成可追蹤的線上作業
- 依不同學校的欄位、角色與簽核方式進行客製化
- 作為校務系統、資料同步或自動通知整合的參考實作

這些是依目前專案定位整理的延伸方向，不代表所有情境都已內建完成；實作前請先確認現有功能與資料格式。

### 技術與專案結構

- `README.md`
- `firebase.json`
- `functions`

檔案結構會隨版本演進；若本節與程式碼不一致，以目前預設分支的原始碼為準。

### 本機執行

請先閱讀根目錄設定檔與原始碼入口，再依專案所使用的語言／平台建立環境。此 repo 未提供可安全推定的通用啟動指令。

### 給 AI Agent 的接手指南

1. 先閱讀本 README、`AGENTS.md`（若有）、套件腳本與部署設定。
2. 先畫出角色、資料流、權限與外部服務，再修改表單或資料結構。
3. 不得提交學生個資、憑證、API 金鑰或正式環境匯出資料。
4. 涉及 schema、驗證、權限或通知時，同步檢查前後端與部署設定。
5. 不要捏造尚未存在的功能；README 與實作有落差時，應同時更新文件。
6. 提交前只納入本次任務檔案，並記錄實際執行過的驗證。

### 安全與資料注意事項

- 不要提交 `.env`、服務帳號、API 金鑰、token、學生個資或正式環境匯出資料。
- 使用 Firebase、Supabase、Google API 或其他雲端服務時，請建立自己的測試專案並套用最小權限。
- 若要公開衍生作品，請先確認程式碼、圖片、音訊、字型與教材內容的授權。

### 貢獻與客製化

歡迎依教學現場、活動或工作流程需求進行 fork／客製化。建議在變更說明中交代使用情境、主要修改、測試方式，以及是否影響資料格式或部署設定。
<!-- END:PROJECT_GUIDE -->
