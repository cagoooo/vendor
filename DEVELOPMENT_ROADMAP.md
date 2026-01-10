# 📋 校園點餐系統 開發優化路線圖

> 最後更新：2026-01-10
> 當前版本：v3.1.0
> 此文件提供詳細的後續開發、優化與改良方向

---

## 📊 現狀總覽

### 已完成的核心功能
| 功能模組 | 狀態 | 說明 |
|---------|------|------|
| 多班級獨立系統 | ✅ | 每個班級有獨立的菜單、訂單、庫存 |
| 三端分離架構 | ✅ | 顧客點餐、廚房管理、叫號顯示 |
| Google OAuth 登入 | ✅ | 簡化的單一登入方式 |
| 角色權限系統 | ✅ | owner / classAdmin / pending / none |
| 菜單圖片上傳 | ✅ | Firebase Storage 整合 |
| 即時訂單同步 | ✅ | Firestore realtime updates |
| PWA 支援 | ✅ | 可安裝至手機 |

---

## 🎯 優先級 1：安全性與穩定性優化

### 1.1 Firestore 安全規則強化

> [!CAUTION]
> 目前部分規則過於寬鬆，存在安全隱患

**現狀問題：**
```javascript
// 當前規則 - 過於寬鬆
match /kitchens/{classId}/menuItems/{itemId} {
  allow update: if true;  // 任何人都能修改！
}
```

**改進建議：**

#### [MODIFY] firestore.rules
```diff
// 菜單品項
match /kitchens/{classId}/menuItems/{itemId} {
  allow read: if true;
- allow update: if true;
+ // 只允許更新 stock 欄位，其他欄位需要管理權限
+ allow update: if request.resource.data.diff(resource.data).affectedKeys()
+   .hasOnly(['stock']) || canManageClass(classId);
  allow create, delete: if canManageClass(classId);
}

// 每日銷售統計
match /kitchens/{classId}/dailySales/{date} {
- allow read, write: if true;
+ allow read: if true;
+ // 只允許增量更新（下單時）
+ allow write: if request.resource.data.keys().hasAll(['updatedAt']);
}
```

**實作要點：**
- 限制匿名用戶只能更新 `stock` 欄位
- 使用 Firestore Rules 的 `diff()` 和 `affectedKeys()` 進行細粒度控制
- 考慮使用 Cloud Functions 處理敏感操作

---

### 1.2 庫存扣除競態條件修復

**現狀問題：**
高併發下單時，可能出現庫存超賣

**改進方案：**

#### [MODIFY] frontend/src/services/classApi.ts
```typescript
// 使用 Firestore Transaction 確保原子性操作
export async function placeClassOrderWithTransaction(
  classId: string,
  orderData: OrderInput
): Promise<ApiResponse> {
  return runTransaction(db, async (transaction) => {
    // 1. 讀取所有相關菜單項目的當前庫存
    const stockChecks = await Promise.all(
      orderData.items.map(item => 
        transaction.get(doc(db, getMenuItemsPath(classId), item.menuItemId))
      )
    );
    
    // 2. 驗證庫存是否足夠
    for (let i = 0; i < stockChecks.length; i++) {
      const currentStock = stockChecks[i].data()?.stock || 0;
      if (currentStock < orderData.items[i].quantity) {
        throw new Error(`${orderData.items[i].name} 庫存不足`);
      }
    }
    
    // 3. 扣除庫存並建立訂單
    orderData.items.forEach((item, i) => {
      transaction.update(
        doc(db, getMenuItemsPath(classId), item.menuItemId),
        { stock: increment(-item.quantity) }
      );
    });
    
    // 4. 建立訂單
    const orderId = await generateClassOrderId(classId);
    const orderRef = doc(db, getOrdersPath(classId), orderId);
    transaction.set(orderRef, { ...orderData, id: orderId });
    
    return { status: 'success', orderId };
  });
}
```

---

### 1.3 錯誤處理與重試機制

**新增檔案建議：**

#### [NEW] frontend/src/utils/retry.ts
```typescript
interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        onRetry?.(lastError, attempt);
        await new Promise(r => 
          setTimeout(r, delayMs * Math.pow(backoffMultiplier, attempt - 1))
        );
      }
    }
  }
  
  throw lastError!;
}
```

---

## 🎯 優先級 2：程式碼架構優化

### 2.1 組件拆分 - KitchenApp 重構

**現狀問題：**
`KitchenApp.tsx` 有 **1037 行**，過於龐大難以維護

**建議拆分結構：**
```
frontend/src/apps/kitchen/
├── KitchenApp.tsx              # 主入口（精簡至 ~200 行）
├── components/
│   ├── OrderList/
│   │   ├── OrderList.tsx       # 訂單列表
│   │   ├── OrderCard.tsx       # 單一訂單卡片
│   │   └── OrderFilters.tsx    # 篩選器
│   ├── Inventory/
│   │   ├── InventoryTable.tsx  # 庫存表格
│   │   ├── MenuItem.tsx        # 單一品項
│   │   └── AddItemModal.tsx    # 新增品項彈窗
│   ├── Stats/
│   │   ├── SalesChart.tsx      # 銷售圖表
│   │   └── Dashboard.tsx       # 儀表板
│   └── Settings/
│       ├── ShopSettings.tsx    # 店舖設定
│       └── CategoryManager.tsx # 分類管理
├── hooks/
│   ├── useKitchenOrders.ts     # 訂單邏輯
│   ├── useInventory.ts         # 庫存邏輯
│   └── useKitchenStats.ts      # 統計邏輯
└── types.ts                    # 類型定義
```

**好處：**
- 提高可讀性和可維護性
- 便於單元測試
- 支援 Code Splitting 加快載入

---

### 2.2 API 層整合統一

**現狀問題：**
存在兩套 API (`api.ts` 和 `classApi.ts`)，容易混淆

**改進方案：**

#### [NEW] frontend/src/services/api/index.ts
```typescript
// 統一的 API 入口
import * as classApi from './classApi';
import * as legacyApi from './legacyApi';

export const api = {
  class: classApi,  // 班級隔離 API
  legacy: legacyApi // 舊版 API（逐步廢棄）
};

// 或使用 Factory Pattern
export function createApi(classId?: string) {
  if (classId) {
    return {
      getMenu: () => classApi.getClassMenu(classId),
      placeOrder: (data: OrderInput) => classApi.placeClassOrder(classId, data),
      // ...
    };
  }
  return legacyApi;
}
```

---

### 2.3 狀態管理優化

**現狀分析：**
- 使用 Zustand 管理購物車和訂單歷史
- 部分狀態散落在各組件內

**改進建議：**

#### [MODIFY] frontend/src/stores/index.ts
```typescript
// 添加更多全局狀態管理
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

// 系統狀態 Store
interface SystemStore {
  isOnline: boolean;
  currentClassId: string | null;
  setCurrentClass: (classId: string) => void;
  syncStatus: 'synced' | 'syncing' | 'error';
}

export const useSystemStore = create<SystemStore>()(
  devtools(
    persist(
      (set) => ({
        isOnline: navigator.onLine,
        currentClassId: null,
        setCurrentClass: (classId) => set({ currentClassId: classId }),
        syncStatus: 'synced',
      }),
      { name: 'system-store' }
    )
  )
);

// 網路狀態監聽
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => 
    useSystemStore.setState({ isOnline: true })
  );
  window.addEventListener('offline', () => 
    useSystemStore.setState({ isOnline: false })
  );
}
```

---

## 🎯 優先級 3：效能優化

### 3.1 React 渲染優化

**建議使用的技術：**

```typescript
// 1. 使用 React.memo 防止不必要的重新渲染
const OrderCard = React.memo(function OrderCard({ order, onUpdate }: Props) {
  // ...
});

// 2. 使用 useMemo 快取昂貴計算
const sortedOrders = useMemo(() => {
  return orders
    .filter(o => o.status === selectedStatus)
    .sort((a, b) => b.createdAt - a.createdAt);
}, [orders, selectedStatus]);

// 3. 使用 useCallback 防止函式重複建立
const handleStatusUpdate = useCallback((orderId: string, status: string) => {
  updateClassOrderStatus(classId, orderId, status);
}, [classId]);

// 4. 虛擬化長列表
import { FixedSizeList as List } from 'react-window';

function OrderList({ orders }: { orders: Order[] }) {
  return (
    <List
      height={600}
      itemCount={orders.length}
      itemSize={120}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <OrderCard order={orders[index]} />
        </div>
      )}
    </List>
  );
}
```

---

### 3.2 Bundle Size 優化

**分析與建議：**

```bash
# 1. 安裝分析工具
npm install -D vite-bundle-analyzer

# 2. 檢查包大小
npm run build -- --analyze
```

**優化方向：**
| 套件 | 大小 | 優化建議 |
|-----|------|---------|
| chart.js | ~200KB | 按需載入，只匯入需要的圖表類型 |
| sweetalert2 | ~50KB | 考慮用原生 dialog 或輕量替代品 |
| lucide-react | ~30KB | 已使用 tree-shaking，確認正確使用 |

**Chart.js 優化範例：**
```typescript
// ❌ 錯誤：匯入全部
import { Chart } from 'chart.js/auto';

// ✅ 正確：按需匯入
import { Chart, BarController, CategoryScale, LinearScale } from 'chart.js';
Chart.register(BarController, CategoryScale, LinearScale);
```

---

### 3.3 圖片優化

**建議實作：**

#### [NEW] frontend/src/utils/imageOptimization.ts
```typescript
// 壓縮圖片再上傳
export async function compressImage(
  file: File,
  options: { maxWidth?: number; quality?: number } = {}
): Promise<Blob> {
  const { maxWidth = 800, quality = 0.8 } = options;
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('壓縮失敗')),
        'image/webp',
        quality
      );
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// 使用 WebP 格式
// 估算可節省 25-35% 的檔案大小
```

---

## 🎯 優先級 4：功能增強

### 4.1 離線支援增強

**目標：** 在網路不穩時仍能正常操作

#### [NEW] frontend/src/hooks/useOfflineSync.ts
```typescript
import { useSystemStore } from '../stores';

export function useOfflineSync() {
  const isOnline = useSystemStore(s => s.isOnline);
  const [pendingActions, setPendingActions] = useState<Action[]>([]);
  
  // 離線時暫存操作
  const queueAction = useCallback((action: Action) => {
    if (!isOnline) {
      setPendingActions(prev => [...prev, action]);
      // 存到 IndexedDB
      saveToOfflineQueue(action);
      return;
    }
    executeAction(action);
  }, [isOnline]);
  
  // 上線時同步
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      syncPendingActions(pendingActions);
      setPendingActions([]);
    }
  }, [isOnline, pendingActions]);
  
  return { queueAction, pendingCount: pendingActions.length };
}
```

---

### 4.2 通知系統

**功能設計：**

```typescript
// 1. 瀏覽器通知（需用戶授權）
async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// 2. 新訂單音效提醒
const notificationSound = new Audio('/sounds/new-order.mp3');

function playNewOrderSound() {
  notificationSound.currentTime = 0;
  notificationSound.play().catch(console.error);
}

// 3. 訂單狀態推送（可選 - 需 Firebase Cloud Messaging）
// 適用於需要即時通知顧客取餐的場景
```

---

### 4.3 報表與數據分析

**新增功能建議：**

#### [NEW] frontend/src/apps/kitchen/components/Reports/SalesReport.tsx
```typescript
interface SalesReportData {
  period: 'day' | 'week' | 'month';
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  popularItems: Array<{ name: string; count: number; revenue: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
}

// 功能清單：
// 1. 銷售趨勢圖（日/週/月）
// 2. 熱銷品項排行榜
// 3. 高峰時段分析
// 4. 訂單完成率
// 5. 平均製作時間
// 6. 匯出 CSV/Excel
```

---

### 4.4 多語言支援準備

**建議架構：**

```
frontend/src/
├── i18n/
│   ├── index.ts           # i18next 設定
│   ├── locales/
│   │   ├── zh-TW.json     # 繁體中文
│   │   ├── en.json        # 英文
│   │   └── zh-CN.json     # 簡體中文
│   └── useTranslation.ts  # 自訂 Hook
```

**基本設定：**
```typescript
// frontend/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';

i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': { translation: zhTW },
    'en': { translation: en }
  },
  lng: 'zh-TW',
  fallbackLng: 'zh-TW',
  interpolation: { escapeValue: false }
});

export default i18n;
```

---

## 🎯 優先級 5：DevOps 與維運

### 5.1 自動化測試

**建議測試架構：**

```
frontend/
├── src/
│   └── ...
├── tests/
│   ├── unit/              # 單元測試
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── utils/
│   ├── integration/       # 整合測試
│   │   ├── api.test.ts
│   │   └── auth.test.ts
│   └── e2e/               # 端對端測試
│       ├── customer-flow.spec.ts
│       └── kitchen-flow.spec.ts
├── vitest.config.ts
└── playwright.config.ts
```

**測試指令設定：**
```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test"
  }
}
```

---

### 5.2 監控與日誌

**建議整合：**

```typescript
// 1. 錯誤追蹤（Sentry）
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});

// 2. 效能監控
const transaction = Sentry.startTransaction({
  name: 'place-order',
  op: 'task'
});

// 3. 自訂指標
function trackMetric(name: string, value: number) {
  if (window.gtag) {
    gtag('event', name, { value });
  }
}
```

---

### 5.3 CI/CD 增強

#### [MODIFY] .github/workflows/deploy.yml
```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
        working-directory: frontend
      
      - name: Run linter
        run: npm run lint
        working-directory: frontend
      
      - name: Run tests
        run: npm run test:ci
        working-directory: frontend
      
      - name: Build
        run: npm run build
        working-directory: frontend
        
  deploy:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      # ... 部署步驟
```

---

## 📋 開發里程碑建議

### Phase 1：穩定性優先（1-2 週）
- [ ] 修復 Firestore 安全規則漏洞
- [ ] 實作庫存扣除的 Transaction
- [ ] 加入全局錯誤處理與 Toast 通知
- [ ] 優化行動端響應式設計

### Phase 2：程式碼品質（2-3 週）
- [ ] 拆分 KitchenApp 組件
- [ ] 統一 API 層
- [ ] 建立單元測試基礎架構
- [ ] 加入 TypeScript 嚴格模式

### Phase 3：效能優化（1-2 週）
- [ ] 實作圖片壓縮與 WebP 轉換
- [ ] 優化 Bundle Size
- [ ] 加入 React.memo 和 useMemo
- [ ] 實作長列表虛擬化

### Phase 4：功能增強（3-4 週）
- [ ] 離線支援增強
- [ ] 報表與數據分析功能
- [ ] 訂單通知系統
- [ ] AdminApp 班級管理完善

### Phase 5：長期改進
- [ ] 多語言支援
- [ ] A/B 測試框架
- [ ] 效能監控整合
- [ ] E2E 測試覆蓋

---

## 🔧 快速參考

### 開發指令
```bash
# 本地開發
cd frontend && npm run dev -- --port 3300

# 構建生產版本
npm run build

# 類型檢查
npm run type-check

# 程式碼檢查
npm run lint

# 部署
firebase deploy --only hosting
```

### 重要檔案路徑
| 檔案 | 說明 |
|-----|------|
| `frontend/src/apps/kitchen/KitchenApp.tsx` | 廚房後台主組件 |
| `frontend/src/apps/customer/CustomerApp.tsx` | 顧客點餐主組件 |
| `frontend/src/services/classApi.ts` | 班級 API 服務 |
| `firestore.rules` | Firestore 安全規則 |
| `.github/workflows/deploy.yml` | CI/CD Pipeline |

---

> 💡 此文件應隨著開發進度持續更新。建議每完成一個 Phase 後進行一次回顧與調整。
