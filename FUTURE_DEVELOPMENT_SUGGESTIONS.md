# 🚀 校園點餐系統 未來優化與開發建議

> **更新日期：2026-01-10 20:35**  
> **當前版本：v3.3.3**  
> **參考文件：DEVELOPMENT_ROADMAP.md**

---

## 📊 目前進度總覽

### ✅ 已完成 (v3.1.1 - v3.3.3)

| 版本 | 功能 | 狀態 |
|------|------|------|
| v3.1.1 | 安全性與穩定性 | ✅ Firestore 規則、Transaction、ErrorBoundary |
| v3.1.2 | 程式碼架構 | ✅ OrderCard/OrderList 拆分、API 統一入口 |
| v3.2.0 | 效能優化 | ✅ React.memo、Code Splitting |
| v3.3.0 | Phase 4-5 | ✅ 訂單追蹤、進階報表、離線支援、Vitest 測試 |
| v3.3.1 | Phase 6 前半 | ✅ API 統一化、離線同步、AdminApp 管理 |
| v3.3.2 | Phase 6 完成 | ✅ KitchenApp 重構(-72%)、音效設定 UI、E2E 框架 |
| v3.3.3 | Phase 7 | ✅ Rate Limiter、Input Validation、PWA Install |

### 📈 程式碼精簡成果

| 指標 | 改善 |
|------|------|
| KitchenApp.tsx | 930 行 → **259 行** (**-72%**) |
| 舊 API 移除 | 刪除 api.ts, useMenu.ts, useOrders.ts |
| 新增組件 | InventoryPanel, StatsPanel, InstallBanner |
| 單元測試 | 41 個 (9 cart + 32 validation) |

---

## 🔐 Phase 7 已完成：安全性強化

### Rate Limiter 服務 (`rateLimiter.ts`)

```typescript
// 使用範例
import { rateLimiter } from '../services/rateLimiter';

const result = rateLimiter.checkAndRecord('order');
if (!result.allowed) {
    alert(`請等待 ${result.retryAfter} 秒`);
    return;
}
```

| 類型 | 限制 | 封鎖時間 |
|------|------|----------|
| order | 10 次/分鐘 | 5 分鐘 |
| login | 5 次/分鐘 | 10 分鐘 |
| api | 100 次/分鐘 | 1 分鐘 |

### Input Validation 工具 (`validation.ts`)

| 函式 | 驗證規則 |
|------|----------|
| `validateCustomerName` | 2-20 字，禁特殊字元 |
| `validateClassName` | 1-15 字 |
| `validateOrderNote` | ≤200 字，XSS 過濾 |
| `validatePrice` | 1-9999 整數 |
| `validateStock` | 0-9999 整數 |
| `validateItemName` | 1-30 字 |
| `sanitizeHtml` | 移除 HTML 標籤 |

**已整合位置：**
- ✅ CustomerApp 下單流程
- ✅ InventoryPanel 新增品項

---

## 📱 PWA 完整支援

### 已有配置
- ✅ `manifest.json` - 完整 PWA 設定
- ✅ Icons - 8 種尺寸 (72-512px)
- ✅ `sw.js` - Service Worker
- ✅ Shortcuts - 廚房、叫號快捷方式

### 今日新增
- ✅ `useInstallPrompt.ts` - 安裝事件 Hook
- ✅ `InstallBanner.tsx` - 安裝提示橫幅
  - Android: 一鍵安裝按鈕
  - iOS: 顯示操作步驟說明
  - 關閉後 7 天不再顯示

---

## 🎯 Phase 8：下一步建議

### 8.1 多語言支援 (i18n) 🌍

**技術選型：** `react-i18next`

```bash
npm install react-i18next i18next
```

**語言優先順序：**
1. 繁體中文 (zh-TW) - 預設
2. 英文 (en) - 外籍學生

**檔案結構：**
```
frontend/src/locales/
├── zh-TW.json     # 繁體中文
├── en.json        # 英文
└── index.ts       # 初始化
```

---

### 8.2 進階權限系統 👥

**現有角色：** `owner` > `classAdmin` > `pending`

**建議新增：**

| 角色 | 權限說明 |
|------|----------|
| `cashier` | 只能處理收款 |
| `viewer` | 只能查看報表 |
| `inventory` | 只能管理庫存 |

---

### 8.3 Background Sync �

**功能：** 離線操作自動重試

```typescript
// sw.js 中加入
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-orders') {
        event.waitUntil(syncPendingOrders());
    }
});
```

---

## 🟡 Phase 9：長期規劃

### 9.1 行銷功能模組 🎁

| 功能 | 說明 |
|------|------|
| 優惠券 | percentage/fixed/freeItem |
| 集點卡 | 根據消費金額累積 |

### 9.2 印表機整合 🖨️

- 網路印表機
- USB 熱感應印表機
- 藍牙行動印表機

### 9.3 LINE 通知 📲

```typescript
// Cloud Functions
exports.notifyKitchen = functions.firestore
    .document('kitchens/{classId}/orders/{orderId}')
    .onCreate(async (snap) => {
        await sendLineNotify({ message: `🍽️ 新訂單` });
    });
```

---

## 🔧 技術債務

| 項目 | 狀態 |
|------|------|
| 舊 API 移除 | ✅ 完成 |
| KitchenApp 拆分 | ✅ 完成 (-72%) |
| console.log 清理 | ⏳ 待處理 |
| any 類型替換 | ⏳ 待處理 |

---

##  優先級排序

### ✅ 已完成
1. ~~KitchenApp 重構~~ ✅
2. ~~音效設定 UI~~ ✅
3. ~~舊 API 移除~~ ✅
4. ~~E2E 測試框架~~ ✅
5. ~~Rate Limiting~~ ✅
6. ~~Input Validation~~ ✅
7. ~~PWA Install Prompt~~ ✅

### � 高優先 (下次)
8. 多語言支援 (i18n)
9. 進階權限系統
10. Background Sync

### 🟢 低優先
11. 行銷功能
12. 印表機整合
13. LINE 通知

---

## 🚀 快速開始

```bash
# 開發
npm run dev

# 測試
npm run test:run         # 41 個單元測試
npm run test:e2e         # E2E 測試

# 建置
npm run build
```

---

## 📍 版本紀錄

| 版本 | 日期 | 主要變更 |
|------|------|----------|
| v3.3.3 | 2026-01-10 | Rate Limiter + Validation + PWA Install |
| v3.3.2 | 2026-01-10 | KitchenApp 重構 (-72%)、E2E 框架 |
| v3.3.1 | 2026-01-10 | API 統一化、離線同步 |
| v3.3.0 | 2026-01-10 | 訂單追蹤、進階報表、Vitest 測試 |
| v3.2.0 | 2026-01-09 | 效能優化 |
| v3.1.x | 2026-01-09 | 安全+架構優化 |
