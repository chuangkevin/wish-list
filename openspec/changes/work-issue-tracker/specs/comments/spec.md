## ADDED Requirements

### Requirement: 新增留言
使用者 SHALL 能夠在問題詳情頁底部的留言區新增留言，留言內容為純文字。

#### Scenario: 成功新增留言
- **WHEN** 使用者輸入留言內容並送出
- **THEN** 留言立即出現在留言區，顯示留言者暱稱與時間

#### Scenario: 空白留言無法送出
- **WHEN** 使用者嘗試送出空白留言
- **THEN** 系統不送出留言，顯示提示

### Requirement: 留言附帶媒體
使用者 SHALL 能夠在留言中附帶截圖或照片（同 media-upload 功能）。

#### Scenario: 留言附帶截圖
- **WHEN** 使用者在留言輸入框貼上截圖並送出
- **THEN** 留言連同截圖一起顯示在留言區

### Requirement: 即時留言更新
系統 SHALL 透過 SSE 即時推送新留言給所有正在查看同一問題的使用者。

#### Scenario: 即時看到新留言
- **WHEN** 使用者 A 在問題 X 的留言區送出留言
- **THEN** 正在查看問題 X 的使用者 B 無需重新整理即可看到該留言

### Requirement: 留言時間排序
系統 SHALL 依照留言時間正序排列所有留言（最舊在上，最新在下）。

#### Scenario: 留言排序
- **WHEN** 使用者查看問題留言區
- **THEN** 留言依時間正序排列，最新的留言在最下方
