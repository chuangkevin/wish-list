## Why

女朋友在工作中經常遇到各種問題（軟體操作、流程卡關、系統異常等），需要一個簡單的方式把問題記錄下來，讓男友可以遠端協助排查和解決。目前透過 LINE 溝通容易訊息洗掉、缺乏追蹤，需要一個專屬的問題回報與追蹤平台。

## What Changes

這是一個全新專案，從零開始建立：

- 建立問題回報系統：使用者可以新增工作問題，包含標題、描述、優先級
- 支援豐富媒體附件：螢幕截圖（剪貼簿直接貼上）、多張照片上傳、影片上傳
- 問題留言討論：每個問題底下有留言板，支援多人討論與進度回報
- 問題狀態管理：待處理、處理中、已解決等狀態流轉
- 多人協作：多位使用者可以查看、留言、協助處理問題
- Docker 容器化部署：適用於樹莓派的輕量化部署方案

## Capabilities

### New Capabilities

- `issue-management`：問題的建立、瀏覽、編輯、狀態管理（CRUD + 狀態流轉）
- `media-upload`：媒體檔案上傳功能，包含剪貼簿貼上截圖、多張照片上傳、影片上傳
- `comments`：問題留言板功能，支援多人討論與回覆
- `user-identity`：簡易使用者識別（不需複雜登入，輸入暱稱即可辨識身份）
- `docker-deployment`：Docker Compose 部署配置，針對樹莓派（ARM）優化

### Modified Capabilities

（無，全新專案）

## Impact

- **前端**：需建立完整的 React SPA，包含問題列表頁、問題詳情頁、媒體上傳元件
- **後端**：需建立 Express API 伺服器，處理 CRUD、檔案上傳、WebSocket（留言即時更新）
- **資料庫**：SQLite schema 設計，包含 issues、comments、media、users 表
- **檔案系統**：需要 Docker volume 來持久化上傳的媒體檔案與 SQLite 資料庫
- **部署**：Docker Compose 配置，需考慮樹莓派 ARM 架構與記憶體限制
