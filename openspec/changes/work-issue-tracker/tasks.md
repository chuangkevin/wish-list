## 1. 專案初始化

- [x] 1.1 初始化 monorepo 結構（client/、server/、共用 package.json）
- [x] 1.2 設定 server：Express + TypeScript + Drizzle ORM + SQLite
- [x] 1.3 設定 client：Vite + React + TypeScript + TanStack Query
- [x] 1.4 設定開發環境的 proxy（client dev server → server API）

## 2. 資料庫設計與 Migration

- [x] 2.1 建立 Drizzle schema：users 表（id, nickname, token, created_at）
- [x] 2.2 建立 Drizzle schema：issues 表（id, title, description, status, priority, author_id, created_at, updated_at）
- [x] 2.3 建立 Drizzle schema：comments 表（id, issue_id, author_id, content, created_at）
- [x] 2.4 建立 Drizzle schema：media 表（id, issue_id, comment_id, filename, mimetype, size, path, created_at）
- [x] 2.5 建立初始 migration 並驗證 SQLite WAL mode 啟用

## 3. 使用者識別（user-identity）

- [x] 3.1 建立 POST /api/auth/register 端點（暱稱註冊，回傳 token）
- [x] 3.2 建立 GET /api/auth/me 端點（驗證 token，回傳使用者資訊）
- [x] 3.3 建立認證 middleware（Bearer token 驗證）
- [x] 3.4 前端：建立暱稱設定頁面與 auth context
- [x] 3.5 前端：使用者列表選擇登入（不用每次新增）

## 4. 問題管理 API（issue-management）

- [x] 4.1 建立 POST /api/issues 端點（建立問題）
- [x] 4.2 建立 GET /api/issues 端點（問題清單，支援狀態篩選與分頁）
- [x] 4.3 建立 GET /api/issues/:id 端點（問題詳情，含附件與留言）
- [x] 4.4 建立 PATCH /api/issues/:id 端點（編輯問題、變更狀態）

## 5. 媒體上傳 API（media-upload）

- [x] 5.1 設定 multer 檔案上傳 middleware（大小限制、檔案類型過濾）
- [x] 5.2 建立 POST /api/issues/:id/media 端點（上傳多檔）
- [x] 5.3 建立 GET /api/media/:id 端點（取得媒體檔案）
- [x] 5.4 建立 DELETE /api/media/:id 端點（刪除媒體，含檔案系統清理）

## 6. 留言 API（comments）

- [x] 6.1 建立 POST /api/issues/:id/comments 端點（新增留言，支援附帶媒體）
- [x] 6.2 建立 GET /api/issues/:id/comments 端點（取得留言清單）

## 7. 即時更新（SSE）

- [x] 7.1 建立 GET /api/issues/:id/events SSE 端點
- [x] 7.2 在新增留言和狀態變更時推送事件
- [x] 7.3 前端：整合 SSE 與 TanStack Query 的 cache invalidation

## 8. 前端頁面：問題清單

- [x] 8.1 建立問題清單頁面（首頁），顯示所有問題
- [x] 8.2 實作狀態篩選 tabs（全部/待處理/處理中/已解決）
- [x] 8.3 建立新增問題 dialog/modal

## 9. 前端頁面：問題詳情

- [x] 9.1 建立問題詳情頁面，顯示問題資訊與狀態操作
- [x] 9.2 建立附件區：圖片縮圖網格 + 影片播放器
- [x] 9.3 建立圖片 lightbox 放大檢視功能（縮放、拖曳、ESC 關閉）
- [x] 9.4 建立留言區，顯示留言清單與留言輸入框
- [x] 9.5 實作剪貼簿截圖貼上功能（paste event listener）
- [x] 9.6 實作多檔上傳元件（拖放 + 點擊選取）
- [ ] 9.7 實作上傳進度顯示

## 10. Gemini AI API Pool

- [x] 10.1 建立 settings 表 schema（key-value store for API keys, model config）
- [x] 10.2 建立 api_key_usage 表 schema（per-key usage tracking）
- [x] 10.3 建立 geminiKeys service（key loading、round-robin rotation、429 failover、壞 key 自動跳過）
- [x] 10.4 建立 GET/POST/DELETE /api/settings/api-keys 端點（key CRUD + batch import）
- [x] 10.5 建立 GET /api/settings/token-usage 端點（usage stats）
- [x] 10.6 前端：建立設定頁面（API Key 管理、batch import、usage 統計、model 選擇）

## 11. AI 輔助功能

- [x] 11.1 建立 Gemini AI service（呼叫 Gemini API，分析問題並給建議）
- [x] 11.2 建立 POST /api/issues/:id/ai-chat 端點（多輪 AI 對話）
- [x] 11.3 前端：問題詳情頁浮動 AI Chat Panel
- [ ] 11.4 AI 對話記錄持久化顯示（重新進入問題時可看到歷史對話）

## 12. Docker 部署

- [x] 12.1 建立 Dockerfile（multi-stage build：前端 Nginx + 後端 Node.js）
- [x] 12.2 建立 docker-compose.yml + docker-compose.prod.yml
- [x] 12.3 建立 GitHub Actions CI/CD（自動 build → push → deploy via Tailscale）
- [ ] 12.4 測試樹莓派上的完整部署流程

## 13. 待處理功能

- [ ] 13.1 AI 對話歷史記錄：重新開啟問題時顯示過去的 AI 分析對話
- [ ] 13.2 Dark mode 深色模式字體顏色修正（部分元件）
- [ ] 13.3 上傳進度顯示
- [ ] 13.4 問題刪除功能
- [ ] 13.5 留言刪除/編輯功能
