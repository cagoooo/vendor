# 📋 校園點餐系統 開發優化路線圖

> **最後更新：2026-01-10 10:45**  
> **當前版本：v3.3.1**  
> 此文件提供詳細的後續開發、優化與改良方向

---

## ✅ 已完成項目

### P1 安全性與穩定性 `v3.1.1`
| 項目 | Commit | 狀態 |
|-----|--------|------|
| Firestore 規則強化 | `49d37a3` | ✅ 限制 menuItems 只能更新 stock |
| 庫存 Transaction | `49d37a3` | ✅ runTransaction 防止超賣 |
| ErrorBoundary | `49d37a3` | ✅ 全局錯誤捕獲 |
| useToast Hook | `49d37a3` | ✅ 統一通知 API |

### P2 程式碼架構 `v3.1.2`
| 項目 | Commit | 狀態 |
|-----|--------|------|
| OrderCard/OrderList 組件拆分 | `52b25aa` | ✅ KitchenApp 減少 ~107 行 |
| 統一 API 入口 | `71c1eb4` | ✅ services/api/index.ts |

### P3 效能優化 `v3.2.0`
| 項目 | Commit | 狀態 |
|-----|--------|------|
| React.memo | `230966b` | ✅ OrderCard 避免不必要渲染 |
| React.lazy + Suspense | `230966b` | ✅ 6 個頁面延遲載入 |
| Code Splitting | `230966b` | ✅ Bundle 分割為多個 chunks |

### P4 Phase 4-5 功能 `v3.3.0` (2026-01-10)
| 項目 | Commit | 狀態 |
|-----|--------|------|
| 訂單追蹤頁面 | `79df09e` | ✅ /track/:classId/:orderId |
| 進階報表分析 | `22d8da2` | ✅ 趨勢圖+時段分布+CSV匯出 |
| 離線支援 | `d96cb31` | ✅ useOfflineSync + OfflineIndicator |
| 自動化測試 | `5daac38` | ✅ Vitest 9/9 通過 |
| Google 驗證 meta | `a80d6cd` | ✅ index.html + home.html |

### P5 優化改進 `v3.3.1` (2026-01-10)
| 項目 | 狀態 | 說明 |
|-----|------|------|
| API 統一化 | ✅ | 標記舊版 api.ts、useMenu.ts、useOrders.ts 為 @deprecated |
| 離線同步完善 | ✅ | 實作 executeAction，整合到 CustomerApp |
| KitchenApp 組件拆分 | ✅ | 新增 ClassSelector、KitchenHeader，減少 152 行 |
| 庫存低量警示 | ✅ | 新增 LowStockAlert.tsx 組件 |
| 音效通知優化 | ✅ | 新增 notificationSound.ts 服務 |
| AdminApp 班級管理 | ✅ | 新增/編輯/刪除班級功能、updateKitchen、deleteKitchen API |


### UI/UX 改善
| 項目 | Commit | 狀態 |
|-----|--------|------|
| 返回點餐按鈕優化 | `b6adb7f` | ✅ 更醒目的按鈕樣式 |

---

## ⏳ 待處理項目

### Google OAuth 驗證
- ✅ 已建立 `cagoooo.github.io` 根倉庫
- ✅ 已上傳驗證檔：`google6de03ad76f9c1b29.html`
- ⏳ **等待 Google 審核（1-3 工作日）**

---

## 📁 新增檔案清單 (Phase 4-5)

```
frontend/
├── src/
│   ├── apps/customer/
│   │   └── OrderTrackingPage.tsx    ← 訂單追蹤
│   ├── apps/kitchen/components/
│   │   ├── AdvancedStats.tsx        ← 進階報表
│   │   ├── ClassSelector.tsx        ← 班級選擇器 (NEW)
│   │   └── KitchenHeader.tsx        ← 廚房 Header (NEW)
│   ├── components/
│   │   └── OfflineIndicator.tsx     ← 離線指示
│   ├── hooks/
│   │   └── useOfflineSync.ts        ← 離線同步 (完善)
│   └── services/
│       └── reportApi.ts             ← 報表 API
├── tests/
│   ├── setup.ts
│   └── unit/
│       └── cartStore.test.ts        ← 9 個測試
└── vitest.config.ts
```

---

## 🧪 測試指令

```bash
npm run test           # 監控模式
npm run test:run       # 單次執行
npm run test:coverage  # 覆蓋率報告
```

---

## 🎯 建議下一階段

### Phase 6：短期優先（本週）
- [x] 離線同步完善
- [x] API 統一化
- [x] KitchenApp 組件拆分 (基礎完成)
- [x] 庫存低量警示
- [x] 音效通知服務
- [x] AdminApp 班級管理
- [ ] 音效設定 UI
- [ ] 舊 API 完全移除

### Phase 7：中期功能（兩週內）
- [ ] E2E 自動化測試 (Playwright)
- [ ] KitchenApp 進一步拆分 (InventoryPanel, StatsPanel)
- [ ] Rate Limiting

### Phase 8：長期功能
- [ ] 多語言支援 (i18n)
- [ ] PWA 完整支援
- [ ] 進階權限系統
- [ ] 行銷功能（優惠券、集點）

### 測試擴充
- [ ] API 整合測試
- [ ] E2E 測試 (Playwright)
- [ ] 覆蓋率 > 70%

---

## 📍 版本紀錄

| 版本 | 日期 | 內容 |
|-----|------|------|
| v3.3.1 | 2026-01-10 | API 統一化 + 離線同步完善 + 組件拆分開始 |
| v3.3.0 | 2026-01-10 | Phase 4-5：追蹤+報表+離線+測試 |
| v3.2.0 | 2026-01-09 | P3 效能優化 |
| v3.1.2 | 2026-01-09 | P2 架構優化 |
| v3.1.1 | 2026-01-09 | P1 安全+穩定 |
