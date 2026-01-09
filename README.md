# 校園點餐系統 (Campus Food Order)

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
