## Context

這是一個全新的工作問題回報平台，給女朋友在工作中遇到問題時，可以快速建立問題單並附上截圖、照片或影片，男友和其他協作者可以在留言板上討論並協助解決。部署在樹莓派上的 Docker 環境，需要輕量且穩定。

目前沒有任何既有系統，從零開始建立。

## Goals / Non-Goals

**Goals:**
- 簡單直覺的問題回報流程，非技術人員也能輕鬆使用
- 支援剪貼簿貼上截圖、多檔上傳（照片＋影片）
- 每個問題有獨立的留言討論串
- 多人可同時使用，即時看到新留言
- 在樹莓派上穩定運行，資源佔用低
- 一鍵 Docker Compose 部署

**Non-Goals:**
- 不做複雜的權限控管（不需要 admin/user 角色區分）
- 不做通知系統（email/push notification）— 未來可加
- 不做全文搜尋 — 初版用簡單的標題篩選即可
- 不做影片轉碼 — 直接儲存原始檔案
- 不做 SSO/OAuth 登入 — 簡易暱稱識別即可

## Decisions

### 1. Monorepo 單一專案結構

```
wish-list/
├── client/          # React + Vite 前端
├── server/          # Express 後端
├── docker-compose.yml
├── Dockerfile
└── openspec/
```

**為什麼**：專案規模小，monorepo 簡化開發和部署流程。前後端共用一個 Docker image，減少樹莓派資源消耗。

**替代方案**：前後端分離部署 — 但增加複雜度且對小專案沒必要。

### 2. SQLite + Drizzle ORM

**為什麼**：SQLite 零配置、單檔資料庫，完美適合樹莓派。Drizzle 提供型別安全的查詢且輕量，不像 Prisma 需要額外的 query engine binary。

**替代方案**：better-sqlite3 直接寫 SQL — 可行但缺乏 migration 和型別安全。

### 3. 媒體檔案儲存在本機檔案系統

```
/data/
├── db.sqlite        # 資料庫
└── uploads/         # 上傳的媒體檔案
    ├── {issue-id}/
    │   ├── {uuid}.png
    │   ├── {uuid}.jpg
    │   └── {uuid}.mp4
```

**為什麼**：樹莓派上最簡單的方案。透過 Docker volume 持久化，備份只需複製整個 `/data` 目錄。

**替代方案**：S3-compatible storage — 過度設計，且需要額外服務。

### 4. 簡易使用者識別（暱稱制）

使用者首次使用時輸入暱稱，存在 localStorage + 後端 users 表。不需要密碼，以 cookie/token 維持 session。

**為什麼**：使用者只有女朋友和幾位協作者，不需要正式的認證系統。降低使用門檻。

**替代方案**：密碼登入 — 增加摩擦力，對此場景不需要。

### 5. Server-Sent Events (SSE) 實現即時更新

**為什麼**：比 WebSocket 簡單，不需要額外的 library。單向推送（server → client）足夠應付留言即時顯示的需求。樹莓派上資源消耗更低。

**替代方案**：WebSocket — 功能更強但此場景不需要雙向通訊。Polling — 浪費資源。

### 6. 前端使用 React + TanStack Query

**為什麼**：React 生態成熟，TanStack Query 處理 server state、快取和即時更新整合良好。搭配 SSE 可以自動 invalidate query 實現即時更新。

### 7. 影片上傳大小限制 100MB

**為什麼**：樹莓派儲存有限（通常 SD 卡 32-128GB），需要合理控制。照片限制 10MB，截圖通常在 1MB 以下不需特別限制。

## Risks / Trade-offs

- **SQLite 並發寫入限制** → 此專案使用者量極少（< 5 人），不會遇到並發問題。啟用 WAL mode 進一步降低風險。
- **樹莓派儲存空間** → 影片會快速消耗儲存。設定上傳大小限制，未來可加清理機制。
- **無認證的安全風險** → 僅在內網使用。如需對外暴露，未來可加 basic auth 或 Cloudflare Tunnel。
- **SSE 連線數** → 樹莓派上需注意連線數上限。但使用者 < 5 人，不是問題。
- **SD 卡壽命** → 頻繁寫入可能影響 SD 卡壽命。建議使用外接 SSD 掛載 `/data` volume。
