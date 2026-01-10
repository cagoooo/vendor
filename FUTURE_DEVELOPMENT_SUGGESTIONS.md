# 🚀 校園點餐系統 未來優化與開發建議

> **更新日期：2026-01-10**  
> **當前版本：v3.3.1**  
> **參考文件：DEVELOPMENT_ROADMAP.md**

---

## 📊 目前進度總覽

### ✅ 已完成 (v3.1.1 - v3.3.1)

| 版本 | 功能 | 狀態 |
|------|------|------|
| v3.1.1 | 安全性與穩定性 | ✅ Firestore 規則、Transaction、ErrorBoundary |
| v3.1.2 | 程式碼架構 | ✅ OrderCard/OrderList 拆分、API 統一入口 |
| v3.2.0 | 效能優化 | ✅ React.memo、Code Splitting |
| v3.3.0 | Phase 4-5 | ✅ 訂單追蹤、進階報表、離線支援、自動化測試 |
| v3.3.1 | 優化改進 | ✅ API 統一化、離線同步、KitchenApp 重構、AdminApp 班級管理 |

---

## 🎯 Phase 6：下一步開發 (1-2 週)

### 6.1 完成 KitchenApp 拆分 🏗️

**目前狀態：** 已完成 KitchenHeader、ClassSelector，程式碼從 930 行減至 778 行

**剩餘目標：** 進一步拆分至約 400 行

| 組件 | 說明 | 優先級 |
|------|------|--------|
| `InventoryPanel.tsx` | 庫存管理面板 | 🔴 高 |
| `StatsPanel.tsx` | 統計圖表面板 | 🔴 高 |
| `CategoryManager.tsx` | 分類管理 Modal | 🟡 中 |
| `MenuItemEditor.tsx` | 菜單品項編輯器 | 🟡 中 |

**預估可減少行數：** ~300 行

---

### 6.2 音效設定 UI 🔊

**目前狀態：** `notificationSound.ts` 服務已完成，支援音量控制和開關

**需新增：**

```tsx
// components/SoundSettingsPanel.tsx
function SoundSettingsPanel() {
    const [enabled, setEnabled] = useState(notificationSound.isEnabled());
    const [volume, setVolume] = useState(notificationSound.getVolume());
    
    return (
        <div>
            <label>
                <input type="checkbox" checked={enabled} 
                       onChange={(e) => {
                           setEnabled(e.target.checked);
                           notificationSound.setEnabled(e.target.checked);
                       }} />
                啟用音效通知
            </label>
            <input type="range" min="0" max="1" step="0.1" 
                   value={volume}
                   onChange={(e) => {
                       setVolume(parseFloat(e.target.value));
                       notificationSound.setVolume(parseFloat(e.target.value));
                   }} />
            <button onClick={() => notificationSound.playTest()}>測試</button>
        </div>
    );
}
```

**整合位置：** KitchenApp → 設定 Modal

---

### 6.3 舊 API 完全移除 🧹

**目前狀態：** 已標記 `@deprecated`

**移除步驟：**

1. 確認無任何引用 `api.ts` 的 import
2. 確認 `useMenu.ts` 和 `useOrders.ts` 無使用
3. 刪除上述三個檔案
4. 更新 `hooks/index.ts` 移除 export

**預估節省：** ~400 行程式碼

---

## 🟠 Phase 7：中期功能 (2-4 週)

### 7.1 E2E 自動化測試 🧪

**推薦工具：** Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

**核心測試案例：**

| 測試 | 說明 |
|------|------|
| `customer-order.spec.ts` | 點餐 → 加入購物車 → 結帳 |
| `kitchen-management.spec.ts` | 接單 → 準備中 → 完成 → 付款 |
| `admin-user.spec.ts` | 用戶審核流程 |
| `offline-sync.spec.ts` | 離線下單 → 上線同步 |

**目標覆蓋率：** > 70%

---

### 7.2 多語言支援 (i18n) 🌍

**技術選型：** `react-i18next`

**語言優先順序：**
1. 繁體中文 (zh-TW) - 預設
2. 英文 (en) - 外籍學生
3. 簡體中文 (zh-CN) - 可選

**優先翻譯頁面：**
- ClassSelectorPage（班級選擇）
- CustomerApp（點餐介面）
- OrderTrackingPage（訂單追蹤）

---

### 7.3 PWA 完整支援 📱

**已完成：**
- ✅ Service Worker 基礎
- ✅ OfflineIndicator 組件
- ✅ useOfflineSync Hook

**待完成：**

| 功能 | 說明 |
|------|------|
| App Manifest | 完善 icons、theme_color |
| Install Prompt | 引導用戶安裝 PWA |
| Push Notification | 新訂單推送通知 |
| Background Sync | 離線操作自動重試 |

---

### 7.4 進階權限系統 👥

**現有角色：** `owner` > `classAdmin` > `pending` > `none`

**建議新增：**

| 角色 | 權限 |
|------|------|
| `cashier` | 只能處理收款 |
| `viewer` | 只能查看報表 |
| `inventory` | 只能管理庫存 |

**Firestore Rules 更新範例：**
```javascript
function canManageInventory() {
    return hasRole(['owner', 'classAdmin', 'inventory']);
}
```

---

## 🟡 Phase 8：長期規劃 (1-2 月)

### 8.1 行銷功能模組 🎁

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

**Firestore 路徑：** `kitchens/{classId}/coupons/{couponId}`

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

### 8.2 跨班級數據儀表板 📊

**功能設計 (Owner 專用)：**

| 圖表 | 說明 |
|------|------|
| 總營收趨勢 | 折線圖，每日營收變化 |
| 班級排名 | 長條圖，各班營收比較 |
| 暢銷品排行 | 圓餅圖，全校品項銷售佔比 |
| 熱力圖 | 時段 × 日期 訂單密度 |

---

### 8.3 印表機整合 🖨️

**支援類型：**
- 網路印表機
- USB 熱感應印表機
- 藍牙行動印表機

**使用場景：**
- 訂單小票列印
- 叫號單列印
- 日結報表列印

---

### 8.4 LINE / Telegram 通知 📲

**Cloud Functions 實作：**

```typescript
// functions/src/onNewOrder.ts
exports.notifyKitchen = functions.firestore
    .document('kitchens/{classId}/orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data();
        await sendLineNotify({
            token: process.env.LINE_TOKEN,
            message: `🍽️ 新訂單 ${order.orderId}\n${order.items.map(i => i.name).join('、')}`
        });
    });
```

---

## 🔧 技術債務清理

### 待處理項目

| 項目 | 位置 | 優先級 |
|------|------|--------|
| 移除舊 API | `api.ts`, `useMenu.ts`, `useOrders.ts` | 🔴 高 |
| 移除 console.log | 全域 | 🟡 中 |
| 替換 any 類型 | `KitchenApp.tsx` | 🟡 中 |
| 統一錯誤處理 | 全域 | 🟢 低 |

---

## 📈 效能優化待辦

### 已完成 ✅
- React.memo (OrderCard)
- Code Splitting (React.lazy)
- Bundle 分割

### 待優化 📌

| 優化 | 預期效果 |
|------|----------|
| 虛擬列表 | 大量訂單效能 +50% |
| 圖片懶載入 | 首屏載入加速 |
| useMemo/useCallback | 減少不必要渲染 |

**虛擬列表推薦：** `@tanstack/react-virtual`

---

## 🛡️ 安全性待加強

| 項目 | 說明 | 優先級 |
|------|------|--------|
| Rate Limiting | API 請求頻率限制 | 🔴 高 |
| Input Validation | 前後端雙重驗證 | 🔴 高 |
| XSS 防護 | sanitize 用戶輸入 | 🟡 中 |

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

### 🔴 最高優先 (本週)
1. ~~離線同步完善~~ ✅
2. ~~API 統一化~~ ✅
3. ~~KitchenApp 重構~~ ✅ (基礎完成)
4. 音效設定 UI
5. 舊 API 完全移除

### 🟠 高優先 (兩週內)
6. E2E 測試 (Playwright)
7. KitchenApp 進一步拆分
8. Rate Limiting

### 🟡 中優先 (一個月內)
9. 多語言支援
10. PWA 完整支援
11. 進階權限系統

### 🟢 低優先 (長期)
12. 行銷功能
13. 印表機整合
14. LINE 通知

---

## 🚀 快速開始

```bash
# 開始下一個功能開發
git checkout -b feature/sound-settings-ui

# 運行測試
npm run test:run

# 建置驗證
npm run build
```

---

## 📍 版本紀錄

| 版本 | 日期 | 主要變更 |
|------|------|----------|
| v3.3.1 | 2026-01-10 | API 統一化、離線同步、KitchenApp 重構、AdminApp 管理 |
| v3.3.0 | 2026-01-10 | 訂單追蹤、進階報表、離線支援、自動化測試 |
| v3.2.0 | 2026-01-09 | 效能優化 |
| v3.1.2 | 2026-01-09 | 架構優化 |
| v3.1.1 | 2026-01-09 | 安全+穩定 |
