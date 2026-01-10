# 🚀 校園點餐系統 未來優化與開發建議

> **更新日期：2026-01-10 16:37**  
> **當前版本：v3.3.2**  
> **參考文件：DEVELOPMENT_ROADMAP.md**

---

## 📊 目前進度總覽

### ✅ 已完成 (v3.1.1 - v3.3.2)

| 版本 | 功能 | 狀態 |
|------|------|------|
| v3.1.1 | 安全性與穩定性 | ✅ Firestore 規則、Transaction、ErrorBoundary |
| v3.1.2 | 程式碼架構 | ✅ OrderCard/OrderList 拆分、API 統一入口 |
| v3.2.0 | 效能優化 | ✅ React.memo、Code Splitting |
| v3.3.0 | Phase 4-5 | ✅ 訂單追蹤、進階報表、離線支援、Vitest 測試 |
| v3.3.1 | Phase 6 前半 | ✅ API 統一化、離線同步、AdminApp 班級管理 |
| v3.3.2 | Phase 6 完成 | ✅ KitchenApp 重構(-67%)、音效設定 UI、E2E 框架 |

### 📈 程式碼精簡成果

| 指標 | 改善 |
|------|------|
| KitchenApp.tsx | 930 行 → **259 行** (**-72%**) |
| 舊 API 移除 | 刪除 api.ts, useMenu.ts, useOrders.ts |
| 新增組件 | InventoryPanel, StatsPanel, KitchenHeader, ClassSelector |

---

## 🎯 Phase 7：下一步建議 (1-2 週)

### 7.1 執行 E2E 測試 🧪

**已完成的設置：**
- ✅ Playwright 配置 (`playwright.config.ts`)
- ✅ 測試檔案 (`customer-order.spec.ts`, `kitchen-management.spec.ts`)
- ✅ npm 指令 (`test:e2e`, `test:e2e:ui`)

**下一步：**

```bash
# 安裝瀏覽器（首次執行需要）
npx playwright install

# 執行測試
npm run test:e2e

# 開啟 UI 模式
npm run test:e2e:ui
```

**擴充測試案例：**

| 測試 | 優先級 | 說明 |
|------|--------|------|
| 離線操作測試 | 🔴 高 | 模擬網路斷線後下單 |
| 訂單追蹤測試 | 🟡 中 | 驗證即時狀態更新 |
| 管理員功能測試 | 🟡 中 | 班級管理 CRUD |

---

### 7.2 Rate Limiting 安全防護 �️

**問題：** 目前無 API 請求頻率限制

**解決方案：**

```typescript
// services/rateLimiter.ts
class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    
    canProceed(key: string, limit: number, windowMs: number): boolean {
        const now = Date.now();
        const timestamps = this.requests.get(key) || [];
        const validTimestamps = timestamps.filter(t => now - t < windowMs);
        
        if (validTimestamps.length >= limit) {
            return false;
        }
        
        validTimestamps.push(now);
        this.requests.set(key, validTimestamps);
        return true;
    }
}

export const rateLimiter = new RateLimiter();
```

**應用場景：**
- 下單：每分鐘最多 10 次
- 登入嘗試：每分鐘最多 5 次

---

### 7.3 Input Validation 強化 ✅

**需增強驗證的輸入：**

| 欄位 | 目前驗證 | 建議加強 |
|------|----------|----------|
| 顧客姓名 | 無 | 長度 2-20，禁止特殊字元 |
| 訂單備註 | 無 | 長度 < 200，XSS sanitize |
| 班級名稱 | 無 | 格式驗證（如：X年X班）|
| 價格/庫存 | 無 | 正整數，上限檢查 |

---

## 🟠 Phase 8：中期功能 (2-4 週)

### 8.1 多語言支援 (i18n) 🌍

**技術選型：** `react-i18next`

```bash
npm install react-i18next i18next
```

**語言優先順序：**
1. 繁體中文 (zh-TW) - 預設
2. 英文 (en) - 外籍學生
3. 簡體中文 (zh-CN) - 可選

**檔案結構：**
```
frontend/src/locales/
├── zh-TW.json     # 繁體中文
├── en.json        # 英文
└── index.ts       # 初始化
```

**優先翻譯頁面：**
- ClassSelectorPage（班級選擇）
- CustomerApp（點餐介面）
- OrderTrackingPage（訂單追蹤）

---

### 8.2 PWA 完整支援 📱

**已完成：**
- ✅ Service Worker 基礎
- ✅ OfflineIndicator 組件
- ✅ useOfflineSync Hook

**待完成：**

| 功能 | 說明 | 複雜度 |
|------|------|--------|
| App Manifest | icons、theme_color | 低 |
| Install Prompt | 引導用戶安裝 | 中 |
| Push Notification | 新訂單推送 | 高 |
| Background Sync | 離線操作重試 | 高 |

---

### 8.3 進階權限系統 👥

**現有角色：** `owner` > `classAdmin` > `pending` > `none`

**建議新增：**

| 角色 | 權限說明 |
|------|----------|
| `cashier` | 只能處理收款，不能修改菜單 |
| `viewer` | 只能查看報表 |
| `inventory` | 只能管理庫存 |

**Firestore Rules 範例：**
```javascript
function canManageInventory() {
    return hasRole(['owner', 'classAdmin', 'inventory']);
}
```

---

## 🟡 Phase 9：長期規劃 (1-2 月)

### 9.1 行銷功能模組 🎁

#### 優惠券系統

```typescript
interface Coupon {
    id: string;
    code: string;           // 優惠碼
    type: 'percentage' | 'fixed' | 'freeItem';
    value: number;
    minOrderAmount?: number;
    validUntil: Timestamp;
    usedCount: number;
    maxUsage?: number;
}
```

#### 集點卡系統

```typescript
interface LoyaltyCard {
    customerHash: string;  // 班級+姓名 hash
    points: number;
    totalSpent: number;
    orderCount: number;
}
```

---

### 9.2 跨班級數據儀表板 📊

**功能設計 (Owner 專用)：**

| 圖表 | 說明 |
|------|------|
| 總營收趨勢 | 折線圖，每日營收變化 |
| 班級排名 | 長條圖，各班營收比較 |
| 暢銷品排行 | 圓餅圖，全校品項銷售佔比 |
| 熱力圖 | 時段 × 日期 訂單密度 |

---

### 9.3 印表機整合 🖨️

**支援類型：**
- 網路印表機
- USB 熱感應印表機
- 藍牙行動印表機

**使用場景：**
- 訂單小票列印
- 叫號單列印
- 日結報表列印

---

### 9.4 LINE / Telegram 通知 📲

**Cloud Functions 實作：**

```typescript
// functions/src/onNewOrder.ts
exports.notifyKitchen = functions.firestore
    .document('kitchens/{classId}/orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data();
        await sendLineNotify({
            message: `🍽️ 新訂單 ${order.orderId}`
        });
    });
```

---

## 🔧 技術債務清理

### 待處理項目

| 項目 | 狀態 | 說明 |
|------|------|------|
| 舊 API 移除 | ✅ 完成 | 已刪除 api.ts, useMenu.ts, useOrders.ts |
| KitchenApp 拆分 | ✅ 完成 | 259 行 (-72%) |
| console.log 清理 | ⏳ 待處理 | 改用 logger |
| any 類型替換 | ⏳ 待處理 | 改為具體類型 |

---

## 📈 效能優化待辦

### 已完成 ✅
- React.memo (OrderCard)
- Code Splitting (React.lazy)
- Bundle 分割

### 待優化 📌

| 優化 | 預期效果 | 複雜度 |
|------|----------|--------|
| 虛擬列表 | 大量訂單效能 +50% | 中 |
| 圖片懶載入 | 首屏載入加速 | 低 |
| useMemo/useCallback | 減少不必要渲染 | 低 |

---

## 🎨 UI/UX 待提升

### 動畫優化
- 訂單卡片進場動畫
- 狀態變更脈衝效果
- 頁面切換過渡

### 無障礙 (A11y)
- 按鈕 `aria-label`
- 表單 `aria-describedby`
- 鍵盤導航支援
- 顏色對比度 >= 4.5:1

---

## 📋 優先級排序

### 🔴 最高優先 (已完成 ✅)
1. ~~KitchenApp 重構~~ ✅
2. ~~音效設定 UI~~ ✅
3. ~~舊 API 移除~~ ✅
4. ~~E2E 測試框架~~ ✅

### 🟠 高優先 (本週)
5. 執行並擴充 E2E 測試
6. Rate Limiting
7. Input Validation

### 🟡 中優先 (兩週內)
8. 多語言支援 (i18n)
9. PWA 完整支援
10. 進階權限系統

### 🟢 低優先 (長期)
11. 行銷功能
12. 印表機整合
13. LINE 通知

---

## 🚀 快速開始

```bash
# E2E 測試
npx playwright install   # 首次安裝瀏覽器
npm run test:e2e         # 執行測試

# 開發
npm run dev              # 啟動開發伺服器
npm run build            # 建置生產版本
npm run test:run         # 單元測試
```

---

## 📍 版本紀錄

| 版本 | 日期 | 主要變更 |
|------|------|----------|
| v3.3.2 | 2026-01-10 | KitchenApp 重構 (-72%)、音效設定 UI、E2E 框架 |
| v3.3.1 | 2026-01-10 | API 統一化、離線同步、AdminApp 管理 |
| v3.3.0 | 2026-01-10 | 訂單追蹤、進階報表、離線支援、Vitest 測試 |
| v3.2.0 | 2026-01-09 | 效能優化 |
| v3.1.2 | 2026-01-09 | 架構優化 |
| v3.1.1 | 2026-01-09 | 安全+穩定 |
