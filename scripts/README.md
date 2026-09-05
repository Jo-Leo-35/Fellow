# 腳本索引

一般指令從專案根目錄執行；本機啟停 wrapper 會依腳本自身位置尋找專案，
因此專案目錄改名或搬家後不需修改任何絕對路徑。

| 分類 | 腳本 | 用途 |
| --- | --- | --- |
| 本機部署 | `start.sh`、`stop.sh`、`local-demo.py`、`create-demo-env.py` | 私有設定檔建立、啟停及狀態檢查 |
| 文件發布 | `sync-judge-docs.mjs` | 將 `docs/judges/` 原始文件同步到前端生成目錄 |
| 文件製作 | `generate-judge-guides.mjs` | 產生五份教學與評審 HTML，輸出至 `docs/judges/` |
| 簡報製作 | `generate-hackathon-demo-deck.mjs` | 產生投影片與旁白，輸出至 `docs/deliverables/` |
| 瀏覽器驗收 | `*-audit.mjs` | 學習、資源、工作台、互動、整合、視覺及 client 驗證 |
| 驗收共用程式 | `audit-helpers.mjs` | 測試 session、API 呼叫與進度紀錄 |
| 隔離驗收環境 | `integration-fixture.py`、`integration-restart.py` | Compose fixture 與資料保存驗證 |

文件製作腳本依賴既有 `.screenshots/`；簡報腳本另使用 `DECK_TOOLS_DIR` 指定工具目錄。這些是作者製作工具，不是執行作品的必要步驟。後端專用 seed／index 腳本維持在 [backend/scripts/](../backend/scripts/)。

常用操作：

```bash
./scripts/start.sh
npm run demo:status
npm run demo:logs
./scripts/stop.sh
```

`local-demo.py` 會從自身位置解析 `frontend/`、`backend/`、`.venv/` 與
`runtime/local-demo/`；`--env-file` 的相對路徑則一律相對於專案根目錄。
