# 部署設定

| 檔案 | 用途 |
| --- | --- |
| `compose.yaml` | 前後端 Compose 服務、健康檢查與持久 volumes |
| `Dockerfile.frontend` | 前端建置及 nginx 靜態服務 |
| `Dockerfile.backend` | Python 後端映像 |
| `nginx.conf` | 靜態入口與 API 代理 |
| `backend-entrypoint.py` | 容器內 seed、索引與 API 啟動 |
| `runpod.py`、`RUNPOD.md` | RunPod 單埠啟動入口及壓縮包部署操作 |

上傳 RunPod 請參考 [RunPod 部署](RUNPOD.md)，使用 `scripts/package-runpod.py`
產生包含已建置前端的壓縮包。

根目錄 `compose.yaml` 只作相容入口，引用此目錄設定。因此原有的 `docker compose ...` 指令仍從專案根目錄執行。預設設定檔也仍位於根目錄 `.env`；使用外部設定檔時，`FUTUREAI_ENV_FILE` 請填絕對路徑。

日常 localhost 展示使用 [本機啟動腳本](../scripts/local-demo.py)，不需要 Docker：

```bash
# 在專案根目錄執行
python3 scripts/local-demo.py start
python3 scripts/local-demo.py status
python3 scripts/local-demo.py stop
```

本機前後端分別只綁定 `127.0.0.1:45465`、`127.0.0.1:45466`。Docker 前端預設只發布 loopback port，容器內監聽位址不等於主機對外發布。完整操作見 [Demo runbook](../docs/demo-runbook.md)。
