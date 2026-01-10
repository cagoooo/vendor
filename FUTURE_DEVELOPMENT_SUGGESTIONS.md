# 🚀 校園點餐系統 未來優化與開發建議

> **更新日期：2026-01-10 21:28**  
> **當前版本：v3.3.4**  
> **參考文件：[DEVELOPMENT_ROADMAP.md](file:///h:/vendor/campus-food-order/DEVELOPMENT_ROADMAP.md)**

---

## 📊 目前進度總覽

### ✅ 已完成階段 (v3.1.1 - v3.3.4)

| 版本 | 階段 | 主要成果 |
|------|------|----------|
| v3.1.1 | P1 安全性 | Firestore 規則、Transaction、ErrorBoundary |
| v3.1.2 | P2 架構 | OrderCard/OrderList 拆分、API 統一入口 |
| v3.2.0 | P3 效能 | React.memo、Code Splitting、6 頁延遲載入 |
| v3.3.0 | P4-5 功能 | 訂單追蹤、進階報表、離線支援、Vitest 測試 |
| v3.3.1 | P6 前期 | API 統一化、離線同步、AdminApp 管理 |
| v3.3.2 | P6 完成 | KitchenApp 重構(-72%)、音效設定、E2E 框架 |
| v3.3.3 | P7 安全 | Rate Limiter、Input Validation、PWA Install |
| v3.3.4 | P8 技術債 | console.log 清理、any 替換、虛擬列表 |

### 📈 本次技術債務清理成果

| 項目 | 改善 |
|------|------|
| console.log 清理 | 3 處 → DEV 條件式 |
| any 類型替換 | 8 處 → 正確類型定義 |
| 虛擬列表優化 | VirtualOrderList 自動啟用 (>20 筆) |
| 新增介面 | RankingItem, ClassStats, 全域類型宣告 |
| 新增套件 | @tanstack/react-virtual |

---

## 🎯 Phase 9：中期功能（建議優先）

### 9.1 🌍 多語言支援 (i18n)

**優先級：** ⭐⭐⭐⭐⭐ (高)  
**預估工時：** 2-3 天  
**影響範圍：** 全系統

#### 技術選型
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

#### 檔案結構
```
frontend/src/locales/
├── zh-TW.json     # 繁體中文（預設）
├── en.json        # 英文
├── zh-CN.json     # 簡體中文（選用）
└── i18n.ts        # 初始化配置
```

#### 實作步驟

1. **建立翻譯檔案** `zh-TW.json`
```json
{
  "common": {
    "submit": "送出",
    "cancel": "取消",
    "confirm": "確認",
    "loading": "載入中..."
  },
  "customer": {
    "selectClass": "選擇班級",
    "placeOrder": "確認訂購",
    "orderSuccess": "訂購成功！",
    "outOfStock": "已售完"
  },
  "kitchen": {
    "newOrder": "新訂單",
    "preparing": "製作中",
    "completed": "完成",
    "inventory": "庫存管理"
  }
}
```

2. **初始化 i18n** `i18n.ts`
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhTW from './zh-TW.json';
import en from './en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': { translation: zhTW },
      'en': { translation: en }
    },
    fallbackLng: 'zh-TW',
    interpolation: { escapeValue: false }
  });
```

3. **組件使用**
```tsx
import { useTranslation } from 'react-i18next';

function CustomerApp() {
  const { t } = useTranslation();
  return <button>{t('customer.placeOrder')}</button>;
}
```

4. **語言切換器**
```tsx
function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <select onChange={(e) => i18n.changeLanguage(e.target.value)}>
      <option value="zh-TW">繁體中文</option>
      <option value="en">English</option>
    </select>
  );
}
```

---

### 9.2 👥 進階權限系統

**優先級：** ⭐⭐⭐⭐ (中高)  
**預估工時：** 2-3 天  
**影響範圍：** 認證、後台管理

#### 現有角色結構
```
owner (擁有者)
  └── classAdmin (班級管理員)
        └── pending (待審核)
```

#### 建議新增角色

| 角色 | 權限描述 | 使用場景 |
|------|----------|----------|
| `cashier` | 僅處理收款（不可修改菜單） | 收銀員專用 |
| `viewer` | 僅查看報表（唯讀） | 老師/觀察者 |
| `inventory` | 僅管理庫存 | 補貨人員 |
| `staff` | 處理訂單（不可管理菜單） | 一般員工 |

#### 實作方式

1. **更新 UserRole 類型** `types/index.ts`
```typescript
export type UserRole = 
  | 'owner' 
  | 'classAdmin' 
  | 'cashier' 
  | 'viewer' 
  | 'inventory' 
  | 'staff' 
  | 'pending';

export interface RolePermissions {
  canManageMenu: boolean;
  canManageInventory: boolean;
  canProcessOrders: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  owner: {
    canManageMenu: true,
    canManageInventory: true,
    canProcessOrders: true,
    canViewReports: true,
    canManageUsers: true
  },
  classAdmin: {
    canManageMenu: true,
    canManageInventory: true,
    canProcessOrders: true,
    canViewReports: true,
    canManageUsers: true
  },
  cashier: {
    canManageMenu: false,
    canManageInventory: false,
    canProcessOrders: true,
    canViewReports: false,
    canManageUsers: false
  },
  // ... 其他角色
};
```

2. **權限 Hook** `usePermissions.ts`
```typescript
export function usePermissions() {
  const { user } = useAuth();
  const permissions = ROLE_PERMISSIONS[user?.role ?? 'pending'];
  
  return {
    can: (action: keyof RolePermissions) => permissions[action],
    role: user?.role
  };
}
```

3. **條件渲染**
```tsx
function KitchenApp() {
  const { can } = usePermissions();
  
  return (
    <>
      {can('canProcessOrders') && <VirtualOrderList />}
      {can('canManageInventory') && <InventoryPanel />}
      {can('canViewReports') && <StatsPanel />}
    </>
  );
}
```

---

### 9.3 🔄 Background Sync

**優先級：** ⭐⭐⭐ (中)  
**預估工時：** 1-2 天  
**影響範圍：** Service Worker、離線體驗

#### 功能說明
當使用者在離線狀態下操作時，自動將操作存入佇列，恢復網路後自動重試。

#### 實作步驟

1. **更新 Service Worker** `sw.js`
```javascript
// 註冊 Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  const db = await openDB('offline-sync', 1);
  const pendingOrders = await db.getAll('pending-orders');
  
  for (const order of pendingOrders) {
    try {
      await fetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify(order)
      });
      await db.delete('pending-orders', order.id);
    } catch (error) {
      console.log('Sync failed, will retry later');
    }
  }
}
```

2. **前端註冊 Sync**
```typescript
async function submitOfflineOrder(order: Order) {
  // 儲存到 IndexedDB
  await saveToIndexedDB('pending-orders', order);
  
  // 註冊 Background Sync
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-orders');
  }
}
```

---

## 🟡 Phase 10：進階功能

### 10.1 🎁 行銷功能模組

**優先級：** ⭐⭐⭐ (中)  
**預估工時：** 3-5 天

#### 優惠券系統

| 優惠類型 | 說明 | 範例 |
|----------|------|------|
| `percentage` | 百分比折扣 | 全單 8 折 |
| `fixed` | 固定金額折扣 | 滿 100 折 20 |
| `freeItem` | 贈送品項 | 點餐送飲料 |
| `buyXGetY` | 買 X 送 Y | 買 3 送 1 |

#### 資料結構
```typescript
interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'freeItem' | 'buyXGetY';
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  validFrom: Date;
  validTo: Date;
  usageLimit: number;
  usedCount: number;
  classId: string;
}
```

#### 集點卡系統

```typescript
interface LoyaltyCard {
  id: string;
  customerId: string;
  classId: string;
  points: number;
  totalSpent: number;
  tier: 'bronze' | 'silver' | 'gold';
  rewards: RewardHistory[];
}

// 計算規則：每消費 10 元 = 1 點
const POINTS_PER_AMOUNT = 10;
// 兌換規則：100 點 = 10 元折扣
const REDEEM_RATIO = 10;
```

---

### 10.2 🖨️ 印表機整合

**優先級：** ⭐⭐ (低)  
**預估工時：** 2-3 天

#### 支援類型

| 印表機類型 | 連接方式 | 技術方案 |
|------------|----------|----------|
| 熱感應印表機 | USB | Web USB API |
| 藍牙印表機 | Bluetooth | Web Bluetooth API |
| 網路印表機 | Wi-Fi | ESC/POS over TCP |
| 雲端列印 | 網路 | Google Cloud Print |

#### 收據範本
```
================================
        班級名稱
================================
單號: #001    日期: 2026-01-10
--------------------------------
雞腿飯 x2              $160
滷肉飯 x1               $55
--------------------------------
小計:                  $215
--------------------------------
    *** 請憑單取餐 ***
================================
```

---

### 10.3 📲 LINE / Telegram 通知

**優先級：** ⭐⭐⭐ (中)  
**預估工時：** 2-3 天

#### LINE Notify 整合

```typescript
// Cloud Functions
import * as functions from 'firebase-functions';

export const notifyNewOrder = functions.firestore
  .document('kitchens/{classId}/orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const classId = context.params.classId;
    
    // 取得班級的 LINE Token
    const classDoc = await admin.firestore()
      .collection('kitchens')
      .doc(classId)
      .get();
    const lineToken = classDoc.data()?.lineNotifyToken;
    
    if (lineToken) {
      await sendLineNotify(lineToken, {
        message: `🍽️ 新訂單 #${order.orderNumber}\n` +
                 `顧客: ${order.customerName}\n` +
                 `金額: $${order.total}`
      });
    }
  });
```

#### 通知觸發點

| 事件 | 通知對象 | 範例訊息 |
|------|----------|----------|
| 新訂單 | 廚房 | 🍽️ 新訂單 #001 |
| 訂單完成 | 顧客 | ✅ 您的餐點已完成 |
| 庫存不足 | 管理員 | ⚠️ 雞腿飯 庫存剩 5 份 |
| 當日統計 | 管理員 | 📊 今日營收 $12,500 |

---

## 🟢 Phase 11：長期規劃

### 11.1 📊 跨班級數據儀表板

**場景：** 學校層級的統計分析

#### 功能
- 全校營收排名
- 熱門品項分析
- 跨班級比較圖表
- 匯出週報/月報

#### 架構
```
/admin/dashboard
├── 全校營收總覽
├── 班級排名 (依營收/訂單數)
├── 時段熱力圖
└── 匯出報表 (PDF/Excel)
```

---

### 11.2 🤖 AI 智能功能

**預估工時：** 5-7 天

#### 智能推薦
```typescript
interface RecommendationEngine {
  // 基於購買歷史推薦
  getPersonalizedRecommendations(customerId: string): MenuItem[];
  
  // 銷售預測
  predictDemand(classId: string, date: Date): PredictionResult;
  
  // 自動補貨建議
  suggestRestocking(classId: string): RestockSuggestion[];
}
```

#### 實作方案
- **推薦系統：** Firebase ML + TensorFlow.js
- **銷售預測：** 時間序列分析 (ARIMA)
- **使用者行為分析：** Google Analytics 4

---

### 11.3 🔌 第三方整合

| 整合項目 | 用途 | API |
|----------|------|-----|
| 金流 | 線上付款 | 綠界 ECPay / LINE Pay |
| 簡訊 | OTP 驗證 | Twilio / Nexmo |
| 地圖 | 外送功能 | Google Maps API |
| 社群登入 | Facebook/Apple | Firebase Auth |

---

## 🔧 技術債務（已完成）

### ✅ 已清理項目

| 項目 | 狀態 | 說明 |
|------|------|------|
| console.log 清理 | ✅ | 3 處 → DEV 條件式 |
| `any` 類型替換 | ✅ | 8 處 → RankingItem, ClassStats |
| 虛擬列表優化 | ✅ | VirtualOrderList 自動啟用 |

### ⏳ 待處理項目

| 項目 | 優先級 | 預估工時 |
|------|--------|----------|
| Bundle 大小優化 | ⭐⭐ | 0.5 天 |
| 圖片壓縮/WebP | ⭐⭐ | 0.5 天 |
| E2E 測試補充 | ⭐⭐⭐ | 1 天 |
| 效能監控整合 | ⭐⭐ | 0.5 天 |

---

## 📋 優先級排序建議

### 🔴 高優先（建議本週完成）

| # | 功能 | 預估工時 | 影響 |
|---|------|----------|------|
| 1 | 多語言支援 (i18n) | 2-3 天 | 外籍學生可使用 |
| 2 | 進階權限系統 | 2-3 天 | 安全性提升 |

### 🟡 中優先（建議本月完成）

| # | 功能 | 預估工時 | 影響 |
|---|------|----------|------|
| 3 | Background Sync | 1-2 天 | 離線體驗 |
| 4 | LINE 通知整合 | 2-3 天 | 即時提醒 |
| 5 | E2E 測試補充 | 1 天 | 品質保證 |

### 🟢 低優先（長期規劃）

| # | 功能 | 預估工時 | 影響 |
|---|------|----------|------|
| 6 | 優惠券系統 | 3-5 天 | 行銷功能 |
| 7 | 印表機整合 | 2-3 天 | 實體出單 |
| 8 | 跨班級儀表板 | 3-4 天 | 學校管理 |
| 9 | AI 推薦 | 5-7 天 | 智能化 |

---

## 🧪 測試覆蓋率目標

### 當前狀態

| 類型 | 測試數量 | 覆蓋率 |
|------|----------|--------|
| 單元測試 (Vitest) | 41 個 | ~60% |
| E2E 測試 (Playwright) | 框架完成 | 待增加 |

### 目標

| 類型 | 目標測試數 | 目標覆蓋率 |
|------|------------|------------|
| 單元測試 | 80+ 個 | 80% |
| E2E 測試 | 20+ 個 | 核心流程100% |

### 建議新增測試

```
tests/unit/
├── classApi.test.ts       # API 服務測試
├── useClassMenu.test.ts   # Hook 測試
├── rateLimiter.test.ts    # Rate Limiter 測試
└── VirtualOrderList.test.tsx # 虛擬列表測試

tests/e2e/
├── customer-flow.spec.ts  # 顧客下單完整流程
├── kitchen-flow.spec.ts   # 廚房處理訂單流程
├── admin-flow.spec.ts     # 管理員操作流程
└── offline-mode.spec.ts   # 離線模式測試
```

---

## 🚀 快速開始指令

```bash
# 開發模式
npm run dev

# 單元測試
npm run test:run       # 執行全部 (41 個)
npm run test:watch     # 監聽模式

# E2E 測試
npx playwright install # 首次安裝瀏覽器
npm run test:e2e       # 執行 E2E 測試

# 建置
npm run build

# 預覽 Production
npm run preview

# 部署
npm run deploy
```

---

## 📍 版本紀錄

| 版本 | 日期 | 主要變更 |
|------|------|----------|
| v3.3.4 | 2026-01-10 | 技術債清理 + VirtualOrderList |
| v3.3.3 | 2026-01-10 | Rate Limiter + Validation + PWA Install |
| v3.3.2 | 2026-01-10 | KitchenApp 重構 (-72%)、E2E 框架 |
| v3.3.1 | 2026-01-10 | API 統一化、離線同步 |
| v3.3.0 | 2026-01-10 | 訂單追蹤、進階報表、Vitest 測試 |
| v3.2.0 | 2026-01-09 | 效能優化 |
| v3.1.x | 2026-01-09 | 安全+架構優化 |

---

## 📚 參考資源

### 技術文件
- [React i18next 文件](https://react.i18next.com/)
- [TanStack Virtual 文件](https://tanstack.com/virtual)
- [Web USB API](https://developer.mozilla.org/en-US/docs/Web/API/USB)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [LINE Notify API](https://notify-bot.line.me/doc/)

### 設計參考
- [Material Design 3](https://m3.material.io/)
- [Tailwind UI](https://tailwindui.com/)
- [Dribbble - Food Ordering Apps](https://dribbble.com/tags/food_ordering)

---

> 💡 **提示：** 建議依照優先級順序逐步實作，每完成一個功能就更新版本號並記錄在 CHANGELOG 中。
