# 📋 校園點餐系統 開發優化路線圖

> **最後更新：2026-01-10**  
> **當前版本：v3.2.0**  
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

### UI/UX 改善
| 項目 | Commit | 狀態 |
|-----|--------|------|
| 返回點餐按鈕優化 | `b6adb7f` | ✅ 更醒目的按鈕樣式 |

---

## 🎯 優先級 4：功能增強

### 4.1 離線支援增強
**目標：** 網路不穩時仍能正常操作

```typescript
// 使用 IndexedDB 暫存離線操作
// 上線後自動同步
```

**實作要點：**
- 離線時將操作存入 IndexedDB
- 顯示離線狀態指示器
- 上線後自動重送待處理操作
- 衝突解決策略

**預估工時：** 3-5 天

---

### 4.2 訂單通知系統

**功能設計：**
| 功能 | 優先級 | 說明 |
|-----|--------|------|
| 瀏覽器 Push | 高 | 廚房新訂單提醒 |
| 訂單完成音效 | 高 | 已有基礎實作 |
| Email 日報 | 中 | 每日銷售摘要 |
| LINE 通知 | 低 | 需額外整合 |

**預估工時：** 2-3 天

---

### 4.3 進階報表分析

**新功能建議：**
- 銷售趨勢圖（日/週/月切換）
- 高峰時段熱力圖
- 品項銷售佔比圓餅圖
- 訂單完成率統計
- 匯出 CSV/Excel

**預估工時：** 5-7 天

---

### 4.4 顧客端優化

| 功能 | 說明 | 優先級 |
|-----|------|--------|
| 訂單追蹤頁面 | 顯示製作進度 | 高 |
| 歷史訂單查看 | localStorage 實作 | 中 |
| 常用訂單快捷 | 一鍵重複下單 | 中 |
| 取餐提醒 | 輪到號碼時震動 | 低 |

---

## 🎯 優先級 5：DevOps 與維運

### 5.1 自動化測試

**建議架構：**
```
tests/
├── unit/           # Vitest 單元測試
├── integration/    # API 整合測試
└── e2e/            # Playwright E2E 測試
```

**測試覆蓋目標：**
- 核心 API 函數 80%+
- 重要用戶流程 E2E
- 購物車 Store

**預估工時：** 5-7 天

---

### 5.2 監控與日誌

**建議整合：**
| 工具 | 用途 | 優先級 |
|-----|------|--------|
| Sentry | 錯誤追蹤 | 高 |
| Firebase Analytics | 用戶行為 | 中 |
| Performance Monitoring | 效能監控 | 中 |

---

### 5.3 CI/CD 強化

**待改進：**
- PR 自動化測試
- Preview 部署
- 自動版本號更新
- Changelog 生成

---

## 🎯 優先級 6：未來功能

### 6.1 多語言支援
- i18next 整合
- 繁中/簡中/英文

### 6.2 進階權限系統
- 班級內分工（收銀/製作/出餐）
- 審計日誌

### 6.3 庫存管理增強
- 低庫存預警
- 自動補貨提醒
- 進貨記錄

### 6.4 行銷功能
- 優惠券系統
- 會員點數
- 限時特價

---

## 📋 開發里程碑建議

### Phase 4：功能增強（2-3 週）
- [ ] 離線操作支援
- [ ] 訂單追蹤頁面
- [ ] 進階報表功能
- [ ] 顧客常用訂單

### Phase 5：測試與監控（1-2 週）
- [ ] Vitest 單元測試
- [ ] Playwright E2E
- [ ] Sentry 錯誤追蹤
- [ ] CI/CD 測試整合

### Phase 6：長期規劃
- [ ] 多語言支援
- [ ] 進階權限系統
- [ ] 庫存管理增強
- [ ] 行銷功能

---

## 🔧 技術債務清單

| 項目 | 優先級 | 說明 |
|-----|--------|------|
| 移除舊版 api.ts | 中 | 統一使用 classApi |
| TypeScript 嚴格模式 | 中 | 啟用 strict: true |
| 圖片上傳壓縮 | 低 | WebP 轉換 |
| Service Worker 更新 | 低 | PWA 快取策略 |

---

## 🔗 重要檔案路徑

| 檔案 | 說明 |
|-----|------|
| `frontend/src/apps/kitchen/KitchenApp.tsx` | 廚房後台主組件 |
| `frontend/src/apps/kitchen/components/` | 拆分後的組件 |
| `frontend/src/services/api/index.ts` | 統一 API 入口 |
| `frontend/src/components/ErrorBoundary.tsx` | 錯誤邊界 |
| `frontend/src/hooks/useToast.ts` | Toast 通知 |
| `firestore.rules` | Firestore 安全規則 |

---

> 💡 此文件應隨著開發進度持續更新。建議每完成一個 Phase 後進行回顧與調整。
