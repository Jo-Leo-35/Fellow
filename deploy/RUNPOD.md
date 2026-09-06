# RunPod 部署

此壓縮包包含完整原始碼、教材與已建置前端；RunPod 端只需 Python 套件，
不需要 Node.js 或 Docker Compose。預設為 `offline_demo`，使用示範回答，
不需要 LLM API key，也不會載入 GPU 模型。

## 上傳與啟動

1. 建立 Linux Pod，使用提供 Python 3.12 的映像，將 **Expose HTTP Ports** 設為 `8080`。
2. 將 `FutureAI-runpod.tar.gz` 上傳到 Pod 的 `/workspace`，並在 Pod 終端機執行：

```bash
cd /workspace
tar -xzf FutureAI-runpod.tar.gz
cd FutureAI
bash scripts/setup-runpod.sh
bash scripts/start-runpod.sh
```

若映像缺少 venv 或系統函式庫，在 Ubuntu/Debian Pod 中先執行
`apt-get update` 與 `apt-get install -y python3-venv libgomp1`。
可用 `PYTHON_BIN=python3.12 bash scripts/setup-runpod.sh` 指定已安裝的 Python。
首次安裝需要網路；啟動會自動建立私有 `.env`、示範資料庫與檢索索引。

在 RunPod 的 **Connect → HTTP services → Port 8080** 開啟網站。
網址形式為 `https://<POD_ID>-8080.proxy.runpod.net`；健康檢查是同網址加 `/health`。
API 與前端共用此入口，因此不需要另開 8000 埠或設定前端 API 網址。
前景執行按 Ctrl+C 停止。

官方參考：[HTTP 連線與開放埠](https://docs.runpod.io/pods/configuration/expose-ports)、
[Pod 概覽與 Docker Compose 限制](https://docs.runpod.io/pods/overview)。

## 背景執行

先停止前景服務，再從 `/workspace/FutureAI` 執行：

```bash
mkdir -p runtime/runpod
nohup bash scripts/start-runpod.sh > runtime/runpod/server.log 2>&1 &
echo $! > runtime/runpod/server.pid
tail -f runtime/runpod/server.log
```

此時 Ctrl+C 只會退出日誌檢視；要停止服務：

```bash
kill "$(cat runtime/runpod/server.pid)"
```

這只讓服務在關閉終端機後繼續執行；Pod 重啟後需重新執行啟動指令。
同一份資料目錄只啟動一個服務程序。

## 設定與資料保存

- 首次啟動產生 `.env`；壓縮包不包含本機金鑰、登入碼、資料庫或上傳檔案。
- `.env` 使用逐行 `KEY=value` 原始格式，值不加 shell 引號。既有環境變數優先於設定檔。
- 保持預設 `RUNTIME_MODE=offline_demo` 即可展示。需要真實模型回答時，編輯 `.env`：
  設 `RUNTIME_MODE=live`，填入 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`、
  `EMBEDDING_MODEL`，然後重啟。GPU 推論伺服器需要另行安裝與啟動。
- `.env` 中 `DEMO_ACCESS_CODES` 包含學生、教師及政府三種登入碼；請在 Pod 上自行查看。
- 預設資料放在 `runtime/runpod/data/`，向量索引放在 `runtime/runpod/chroma/`。
  可透過 `APP_DATA_DIR`、`CHROMA_PATH` 指定其他持久儲存位置，建議使用絕對路徑。
- 另用設定檔時執行 `bash scripts/start-runpod.sh --env-file /workspace/private.env`；
  修改埠可加 `--port 8081`，並同步修改 Pod 的 Expose HTTP Ports。

請確認專案位於實際掛載的 `/workspace` volume。Volume disk 隨 Pod 刪除而刪除；
若需跨 Pod 保存，使用 network volume，並保留 `.env` 與 `runtime/runpod/`。
詳見 [RunPod 儲存類型](https://docs.runpod.io/pods/storage/types)。

## 重新打包

在開發機的專案根目錄執行 `python3 scripts/package-runpod.py`。
此步驟需要 Git、Node.js、npm，以及 `npm ci` 安裝的前端依賴；
會重新建置前端並產生 `dist/FutureAI-runpod.tar.gz` 與 SHA-256 校驗檔。
