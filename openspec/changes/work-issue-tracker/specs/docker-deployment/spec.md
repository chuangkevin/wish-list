## ADDED Requirements

### Requirement: Docker Compose 一鍵部署
系統 SHALL 提供 docker-compose.yml，使用者只需執行 `docker compose up -d` 即可完成部署。

#### Scenario: 首次部署
- **WHEN** 使用者在樹莓派上執行 `docker compose up -d`
- **THEN** 系統自動建立容器、初始化資料庫、啟動服務，可透過 `http://<pi-ip>:3000` 存取

### Requirement: 資料持久化
系統 SHALL 透過 Docker volume 持久化 SQLite 資料庫和上傳的媒體檔案，容器重啟後資料不遺失。

#### Scenario: 容器重啟後資料保留
- **WHEN** 使用者執行 `docker compose down` 再 `docker compose up -d`
- **THEN** 所有問題、留言、上傳檔案皆完整保留

### Requirement: ARM 架構支援
Docker image SHALL 支援 ARM64 架構（樹莓派 4/5）。

#### Scenario: 樹莓派上建置
- **WHEN** 在樹莓派上執行 `docker compose build`
- **THEN** 成功建置 ARM64 架構的 Docker image

### Requirement: 資源限制
Docker 配置 SHALL 設定合理的記憶體限制，避免耗盡樹莓派資源。

#### Scenario: 記憶體限制
- **WHEN** 容器運行時
- **THEN** 容器記憶體使用不超過 512MB
