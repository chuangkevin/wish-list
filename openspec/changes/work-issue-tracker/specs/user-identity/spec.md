## ADDED Requirements

### Requirement: 首次使用設定暱稱
系統 SHALL 在使用者首次造訪時，要求輸入暱稱以識別身份。暱稱儲存在瀏覽器 localStorage 及後端資料庫。

#### Scenario: 首次造訪
- **WHEN** 使用者首次開啟應用程式且尚未設定暱稱
- **THEN** 系統顯示暱稱輸入畫面，使用者輸入暱稱後才能進入主頁面

#### Scenario: 暱稱重複
- **WHEN** 使用者輸入的暱稱已被其他人使用
- **THEN** 系統提示暱稱已存在，請更換

### Requirement: 記住使用者身份
系統 SHALL 在使用者設定暱稱後，透過 token 記住身份，後續造訪不需重新輸入。

#### Scenario: 回訪使用者
- **WHEN** 已設定暱稱的使用者再次開啟應用程式
- **THEN** 系統自動識別身份，直接進入主頁面

### Requirement: 顯示使用者資訊
系統 SHALL 在問題和留言中顯示對應使用者的暱稱。

#### Scenario: 留言顯示暱稱
- **WHEN** 使用者查看留言區
- **THEN** 每則留言顯示留言者的暱稱和留言時間
