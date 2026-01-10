# 🚀 校園點餐系統 未來優化與開發建議

> **建立日期：2026-01-10**  
> **當前版本：v3.3.0**  
> **參考文件：DEVELOPMENT_ROADMAP.md, PROGRESS.md**

---

## 📊 目錄

1. [Phase 6：短期優先項目（1-2 週）](#phase-6短期優先項目1-2-週)
2. [Phase 7：中期功能擴展（2-4 週）](#phase-7中期功能擴展2-4-週)
3. [Phase 8：長期策略性開發（1-2 月）](#phase-8長期策略性開發1-2-月)
4. [技術債務清理](#技術債務清理)
5. [測試擴充計劃](#測試擴充計劃)
6. [效能優化進階](#效能優化進階)
7. [安全性強化](#安全性強化)
8. [UI/UX 提升計劃](#uiux-提升計劃)
9. [DevOps 改進](#devops-改進)
10. [優先級排序建議](#優先級排序建議)

---

## Phase 6：短期優先項目（1-2 週）

### 6.1 離線同步功能完善 ⚡

**現狀分析：**
目前 `useOfflineSync.ts` 只是基礎框架，`executeAction` 函數尚未實作具體邏輯。

**建議改進：**

```typescript
// 完整實作 executeAction
async function executeAction(action: PendingAction): Promise<void> {
    switch (action.type) {
        case 'PLACE_ORDER':
            const { classId, customerClass, customerName, items, totalPrice, note } = action.payload;
            await placeClassOrder(classId, customerClass, customerName, items, totalPrice, note);
            break;
        case 'UPDATE_ORDER_STATUS':
            await updateClassOrderStatus(action.payload.classId, action.payload.orderId, action.payload.status);
            break;
        case 'UPDATE_STOCK':
            await updateClassStock(action.payload.classId, action.payload.itemId, action.payload.quantity);
            break;
        default:
            console.warn(`Unknown action type: ${action.type}`);
    }
}
```

**需修改檔案：**
- `frontend/src/hooks/useOfflineSync.ts`
- `frontend/src/apps/customer/CustomerApp.tsx` - 整合離線下單

---

### 6.2 庫存低量警示系統 🔔

**功能描述：**
當菜單品項庫存低於設定門檻時，自動通知廚房人員。

**實作方案：**

| 檔案 | 修改內容 |
|------|----------|
| `types/index.ts` | 新增 `lowStockThreshold` 欄位到 MenuItem |
| `KitchenApp.tsx` | 庫存頁面新增設定低量門檻 UI |
| `components/LowStockAlert.tsx` | **[NEW]** 低庫存警示組件 |
| `hooks/useLowStockMonitor.ts` | **[NEW]** 監控庫存變化 Hook |

**示例組件結構：**
```tsx
// components/LowStockAlert.tsx
interface LowStockAlertProps {
    items: MenuItem[];
    threshold?: number; // 預設 5
}

export function LowStockAlert({ items, threshold = 5 }: LowStockAlertProps) {
    const lowStockItems = items.filter(item => item.stock <= threshold && item.isActive);
    
    if (lowStockItems.length === 0) return null;
    
    return (
        <div className="low-stock-alert">
            <span className="alert-icon">⚠️</span>
            <span>庫存不足：{lowStockItems.map(i => i.name).join('、')}</span>
        </div>
    );
}
```

---

### 6.3 音效通知優化 🔊

**現狀問題：**
- 新訂單音效可能被瀏覽器封鎖
- 缺乏音量控制
- 無法自訂通知鈴聲

**建議改進：**

```typescript
// services/notificationSound.ts
class NotificationSoundService {
    private audioContext: AudioContext | null = null;
    private soundEnabled: boolean = true;
    private volume: number = 0.7;
    
    async init() {
        // 用戶互動後初始化 AudioContext
        this.audioContext = new AudioContext();
    }
    
    async playOrderNotification() {
        if (!this.soundEnabled || !this.audioContext) return;
        // 播放訂單通知音
    }
    
    setVolume(vol: number) {
        this.volume = Math.max(0, Math.min(1, vol));
    }
    
    toggle(enabled: boolean) {
        this.soundEnabled = enabled;
    }
}
```

**設定 UI 位置：** KitchenApp → 設定 → 音效設定

---

### 6.4 API 統一化重構 🔧

**現狀問題：**
目前有兩套 API 並存：
- `services/api.ts` - 舊版單一班級 API
- `services/classApi.ts` - 新版多班級 API

這導致了銷售統計等功能的數據不一致問題。

**重構計劃：**

1. **保留 `classApi.ts` 作為主要 API**
2. **棄用 `api.ts` 中的重複函數**
3. **建立遷移表：**

| 舊函數 (api.ts) | 新函數 (classApi.ts) | 狀態 |
|----------------|---------------------|------|
| `getMenu()` | `getClassMenu(classId)` | 需遷移 |
| `placeOrder()` | `placeClassOrder(classId, ...)` | 需遷移 |
| `getOrders()` | `getClassOrders(classId)` | 需遷移 |
| `updateStock()` | `updateClassStock(classId, ...)` | 需遷移 |
| `getStats()` | `getClassStats(classId)` | 需遷移 |

---

## Phase 7：中期功能擴展（2-4 週）

### 7.1 多語言支援 (i18n) 🌍

**技術選型：** `react-i18next`

**實作步驟：**

1. **安裝依賴**
   ```bash
   npm install react-i18next i18next
   ```

2. **建立語言檔案結構**
   ```
   frontend/src/
   └── locales/
       ├── zh-TW.json     # 繁體中文（預設）
       ├── en.json        # 英文
       └── zh-CN.json     # 簡體中文（可選）
   ```

3. **語言檔案範例**
   ```json
   // locales/zh-TW.json
   {
     "common": {
       "loading": "載入中...",
       "error": "發生錯誤",
       "confirm": "確認",
       "cancel": "取消"
     },
     "order": {
       "title": "點餐",
       "cart": "購物車",
       "checkout": "結帳",
       "total": "總計"
     },
     "kitchen": {
       "pending": "待處理",
       "preparing": "準備中",
       "completed": "已完成"
     }
   }
   ```

4. **優先翻譯頁面**
   - ClassSelectorPage（給外籍學生使用）
   - CustomerApp 點餐介面
   - OrderTrackingPage 訂單追蹤

---

### 7.2 進階權限系統 👥

**現狀權限：**
```
owner > classAdmin > pending > none
```

**建議新增角色：**

| 角色 | 權限說明 |
|------|----------|
| `superAdmin` | 跨學校管理（未來擴展用） |
| `owner` | 所有班級管理 + 用戶審核 |
| `classAdmin` | 單一班級管理 |
| `cashier` | 只能處理付款、不能修改菜單 |
| `viewer` | 只能查看統計報表 |

**Firestore 規則更新：**
```javascript
function hasRole(allowedRoles) {
    return request.auth != null && 
           getUserData().role in allowedRoles;
}

// 使用範例
allow update: if hasRole(['owner', 'classAdmin', 'cashier']);
```

---

### 7.3 行銷功能模組 🎁

#### 7.3.1 優惠券系統

**資料結構：**
```typescript
interface Coupon {
    id: string;
    code: string;           // 優惠碼
    type: 'percentage' | 'fixed' | 'freeItem';
    value: number;          // 折扣值
    minOrderAmount?: number;// 最低消費
    maxUsage?: number;      // 最大使用次數
    usedCount: number;
    validFrom: Timestamp;
    validUntil: Timestamp;
    classId?: string;       // 特定班級限用
    isActive: boolean;
}
```

**Firestore 路徑：** `kitchens/{classId}/coupons/{couponId}`

#### 7.3.2 集點卡系統

**資料結構：**
```typescript
interface LoyaltyCard {
    id: string;
    classId: string;
    customerIdentifier: string;  // 班級+姓名 hash
    points: number;
    totalSpent: number;
    orderCount: number;
    createdAt: Timestamp;
    lastOrderAt: Timestamp;
}

interface LoyaltyReward {
    id: string;
    classId: string;
    name: string;
    pointsCost: number;
    rewardType: 'discount' | 'freeItem' | 'coupon';
    value: any;
}
```

---

### 7.4 AdminApp 班級管理增強 ⚙️

**需新增功能：**

| 功能 | 說明 | 優先級 |
|------|------|--------|
| 新增班級 | 建立新的 kitchen 文件 | 高 |
| 編輯班級資訊 | 修改 className、ownerName | 高 |
| 刪除班級 | 軟刪除（設 isDeleted: true）| 中 |
| 批次開關營業 | 同時控制多班級營業狀態 | 中 |
| 班級複製 | 複製菜單到新班級 | 低 |

**UI 設計建議：**
```tsx
// AdminApp 新增班級 Modal
<Modal title="新增班級">
    <Input label="班級名稱" placeholder="例：6年7班" />
    <Select label="負責人" options={ownerOptions} />
    <Checkbox label="從現有班級複製菜單" />
    {copyFrom && <Select label="複製來源" options={classOptions} />}
</Modal>
```

---

## Phase 8：長期策略性開發（1-2 月）

### 8.1 PWA 完整支援 📱

**目前狀態：** 基礎 Service Worker + 離線指示器

**完整 PWA 清單：**

- [ ] **App Manifest 完善**
  ```json
  {
    "name": "校園點餐系統",
    "short_name": "點餐",
    "start_url": "/vendor/",
    "display": "standalone",
    "background_color": "#1a1a2e",
    "theme_color": "#4a90a4",
    "icons": [
      { "src": "/icons/icon-192.png", "sizes": "192x192" },
      { "src": "/icons/icon-512.png", "sizes": "512x512" }
    ]
  }
  ```

- [ ] **離線快取策略**
  - 靜態資源：Cache First
  - API 請求：Network First with Cache Fallback
  - 圖片：Stale While Revalidate

- [ ] **Push Notification**
  ```typescript
  // 廚房端：新訂單推送
  // 顧客端：訂單狀態更新推送
  ```

- [ ] **背景同步 (Background Sync)**
  - 離線下單後自動重試

---

### 8.2 數據分析儀表板 📈

**跨班級統計（Owner 專用）**

```typescript
interface GlobalStats {
    totalRevenue: number;           // 總營收
    totalOrders: number;            // 總訂單數
    averageOrderValue: number;      // 平均客單價
    topSellingItems: ItemStat[];    // 暢銷品排行
    classRanking: ClassStat[];      // 班級營收排名
    peakHours: HourlyData[];        // 尖峰時段分析
    dailyTrend: DailyData[];        // 每日趨勢
}
```

**視覺化圖表建議：**
- 營收趨勢折線圖
- 班級營收長條圖
- 品項銷售圓餅圖
- 熱力圖（時段 × 日期）

---

### 8.3 印表機整合 🖨️

**支援類型：**
- 熱感應印表機（POS 機）
- 網路印表機
- 藍牙印表機（行動裝置）

**技術方案：**
```typescript
// services/printerService.ts
interface PrinterService {
    // 連接印表機
    connect(type: 'usb' | 'network' | 'bluetooth', address?: string): Promise<void>;
    
    // 列印訂單小票
    printOrderReceipt(order: Order): Promise<void>;
    
    // 列印叫號單
    printCallNumber(orderNumber: string): Promise<void>;
    
    // 列印日結報表
    printDailySummary(stats: DailyStats): Promise<void>;
}
```

---

### 8.4 LINE / Telegram 通知整合 📲

**建議使用 Firebase Cloud Functions：**

```typescript
// functions/src/notifications.ts
export const onNewOrder = functions.firestore
    .document('kitchens/{classId}/orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data();
        const { classId } = context.params;
        
        // 發送 LINE 通知給廚房人員
        await sendLineNotification(classId, {
            type: 'newOrder',
            orderNumber: order.orderNumber,
            items: order.items,
            total: order.totalPrice
        });
    });
```

---

## 技術債務清理

### 優先處理項目

| 項目 | 位置 | 說明 | 緊急度 |
|------|------|------|--------|
| KitchenApp 過大 | `KitchenApp.tsx` (930行) | 拆分為子組件 | 🔴 高 |
| API 重複 | `api.ts` vs `classApi.ts` | 統一入口 | 🔴 高 |
| 硬編碼字串 | 多處 | 抽取常數/i18n | 🟡 中 |
| console.log | 全域 | 移除或改用 logger | 🟡 中 |
| any 類型 | 多處 | 改為具體類型 | 🟢 低 |

### KitchenApp 拆分建議

```
frontend/src/apps/kitchen/
├── KitchenApp.tsx              # 主入口（~200行）
├── components/
│   ├── OrderPanel.tsx          # 訂單面板
│   ├── InventoryPanel.tsx      # 庫存管理
│   ├── StatsPanel.tsx          # 統計面板
│   ├── SettingsPanel.tsx       # 設定面板
│   ├── ClassSelector.tsx       # 班級選擇器
│   ├── CategoryManager.tsx     # 分類管理
│   └── MenuItemEditor.tsx      # 菜單編輯
├── hooks/
│   ├── useKitchenData.ts       # 資料載入
│   └── useKitchenActions.ts    # 操作邏輯
└── types.ts                    # 類型定義
```

---

## 測試擴充計劃

### 目前狀態
- ✅ Unit Tests: 9/9 通過 (`cartStore.test.ts`)
- ⏳ 覆蓋率目標: > 70%

### 擴充計劃

```
frontend/tests/
├── unit/
│   ├── cartStore.test.ts       ✅ 已完成
│   ├── orderApi.test.ts        📌 待建立
│   ├── classApi.test.ts        📌 待建立
│   ├── useOfflineSync.test.ts  📌 待建立
│   └── utils.test.ts           📌 待建立
├── integration/
│   ├── orderFlow.test.ts       📌 待建立
│   └── authFlow.test.ts        📌 待建立
└── e2e/
    ├── customer.spec.ts        📌 Playwright
    ├── kitchen.spec.ts         📌 Playwright
    └── admin.spec.ts           📌 Playwright
```

### E2E 測試範例 (Playwright)

```typescript
// e2e/customer.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Customer Order Flow', () => {
    test('should complete an order successfully', async ({ page }) => {
        // 1. 選擇班級
        await page.goto('/vendor/');
        await page.click('[data-class="class-6-7"]');
        
        // 2. 加入購物車
        await page.click('[data-item="雞腿飯"] .add-btn');
        await expect(page.locator('.cart-count')).toHaveText('1');
        
        // 3. 結帳
        await page.click('.checkout-btn');
        await page.fill('[name="customerClass"]', '3年1班');
        await page.fill('[name="customerName"]', '小明');
        await page.click('.submit-order-btn');
        
        // 4. 驗證成功
        await expect(page.locator('.order-success')).toBeVisible();
    });
});
```

---

## 效能優化進階

### 已完成 ✅
- React.memo 優化 OrderCard
- Code Splitting (React.lazy)
- Bundle 分割

### 待優化 📌

| 優化項目 | 預期效果 | 實作難度 |
|---------|---------|---------|
| 虛擬列表 | 大量訂單時效能提升 50%+ | 中 |
| 圖片懶載入 | 首屏載入加速 | 低 |
| Service Worker 預快取 | 二次載入幾乎即時 | 中 |
| 資料壓縮 | 減少傳輸量 | 低 |
| 使用 useMemo/useCallback | 減少不必要渲染 | 低 |

### 虛擬列表實作建議

```bash
npm install @tanstack/react-virtual
```

```tsx
// components/VirtualOrderList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualOrderList({ orders }: { orders: Order[] }) {
    const parentRef = useRef<HTMLDivElement>(null);
    
    const virtualizer = useVirtualizer({
        count: orders.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 150, // 預估每個訂單卡片高度
    });
    
    return (
        <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
            <div style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map(virtualRow => (
                    <OrderCard 
                        key={orders[virtualRow.index].id}
                        order={orders[virtualRow.index]}
                        style={{
                            position: 'absolute',
                            top: virtualRow.start,
                            height: virtualRow.size,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
```

---

## 安全性強化

### 目前實作 ✅
- Firestore 規則限制
- Transaction 防超賣
- 角色權限檢查

### 待加強 📌

| 安全項目 | 說明 | 優先級 |
|---------|------|--------|
| Rate Limiting | 限制 API 請求頻率 | 高 |
| Input Validation | 前後端雙重驗證 | 高 |
| XSS 防護 | sanitize 用戶輸入 | 中 |
| CSRF Token | Form 提交保護 | 中 |
| 敏感資料加密 | 用戶識別碼雜湊 | 低 |

### Rate Limiting 實作 (Cloud Functions)

```typescript
// functions/src/rateLimit.ts
import * as functions from 'firebase-functions';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(ip: string, limit = 100, windowMs = 60000): boolean {
    const now = Date.now();
    const record = rateLimit.get(ip);
    
    if (!record || now > record.resetTime) {
        rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }
    
    if (record.count >= limit) {
        return false; // 超過限制
    }
    
    record.count++;
    return true;
}
```

---

## UI/UX 提升計劃

### 動畫優化

```css
/* 訂單卡片進場動畫 */
@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.order-card {
    animation: slideIn 0.3s ease-out;
}

/* 狀態變更脈衝效果 */
@keyframes statusPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.order-card.status-changed {
    animation: statusPulse 0.5s ease-in-out;
}
```

### 深色模式支援

```css
:root {
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --text-primary: #1a1a2e;
    --accent: #4a90a4;
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg-primary: #1a1a2e;
        --bg-secondary: #16213e;
        --text-primary: #eaeaea;
        --accent: #6bc5d2;
    }
}
```

### 無障礙改進 (A11y)

- [ ] 所有按鈕加上 `aria-label`
- [ ] 表單加上 `aria-describedby`
- [ ] 顏色對比度 >= 4.5:1
- [ ] 鍵盤導航支援
- [ ] Screen Reader 測試

---

## DevOps 改進

### 目前部署流程
```
git push → GitHub Actions → GitHub Pages
```

### 建議改進

#### 1. 環境分離
```
main branch     → Production (GitHub Pages)
develop branch  → Staging (Firebase Hosting Preview)
```

#### 2. CI/CD 擴充

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint        # 新增
      - run: npm run test:run
      - run: npm run test:coverage
      
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: firebase hosting:channel:deploy staging
      
  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      - run: # Deploy to GitHub Pages
```

#### 3. 自動化版本管理

```bash
npm install -D standard-version
```

```json
// package.json
{
  "scripts": {
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major"
  }
}
```

---

## 優先級排序建議

### 🔴 最高優先（本週完成）

1. **離線同步完善** - 使用體驗核心功能
2. **API 統一化** - 解決資料不一致問題
3. **KitchenApp 拆分** - 維護性關鍵

### 🟠 高優先（兩週內）

4. **庫存低量警示** - 實用功能，實作簡單
5. **音效通知優化** - 用戶體驗改善
6. **AdminApp 班級管理** - 功能完整性

### 🟡 中優先（一個月內）

7. **E2E 測試** - 品質保證
8. **PWA 完整支援** - 使用體驗提升
9. **多語言支援** - 擴展使用族群

### 🟢 低優先（長期規劃）

10. **行銷功能** - 附加價值功能
11. **印表機整合** - 硬體依賴功能
12. **進階分析儀表板** - 進階功能

---

## 快速開始指南

### 開始 Phase 6

```bash
# 1. 建立新分支
git checkout -b feature/phase-6-improvements

# 2. 安裝可能需要的新依賴
cd frontend
npm install @tanstack/react-virtual  # 虛擬列表

# 3. 建立新檔案
touch src/components/LowStockAlert.tsx
touch src/hooks/useLowStockMonitor.ts
touch src/services/notificationSound.ts

# 4. 執行測試確保無破壞
npm run test:run

# 5. 開發完成後
npm run build
git add -A
git commit -m "feat: Phase 6 improvements"
git push origin feature/phase-6-improvements
```

---

## 參考資源

- [React i18next 文件](https://react.i18next.com/)
- [Playwright 測試指南](https://playwright.dev/)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Web Push Notifications](https://web.dev/push-notifications-overview/)

---

> 💡 **建議**：每完成一個階段，請更新 `DEVELOPMENT_ROADMAP.md` 的進度追蹤表格，保持文件同步。
