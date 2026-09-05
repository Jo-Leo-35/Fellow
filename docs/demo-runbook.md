# Demo 啟動與驗收 Runbook

目前先使用 **Fake Demo / `offline_demo`**，不設定或呼叫真實 provider。這份文件涵蓋已接上真 API 的三角色頁面、持久化與 Docker。API 不會因為無 key 而退回未標示的假成功。

## 1. 建立私有設定並啟動

需求：Docker Engine、Docker Compose v2.30+、用來產生設定的 Python 3。Compose 的 `env_file.format: raw` 用來保留秘密值中的字元；backend 在健康後才讓前端啟動，依 [Compose services](https://docs.docker.com/reference/compose-file/services/) 與 [startup order](https://docs.docker.com/compose/how-tos/startup-order/) 的機制。

```bash
python3 scripts/create-demo-env.py
docker compose config --quiet
docker compose up --build -d
docker compose ps
curl --fail http://localhost:8080/health
```

產生器從 `.env.example` 建立 `0600` 的 `.env`，後端相容存取碼使用三個不同的 `secrets.token_urlsafe(32)` 值。既有檔案不會被覆寫，值也不印到終端。`offline_demo` 瀏覽器入口會依頁面角色自動建立 session，操作者不需要讀取或輸入存取碼；`live` 模式才會顯示存取碼欄位。不要把這份檔案加入 Git、前端 build 或公開資料。

已有 `.env` 時可另建外部私有檔：

```bash
python3 scripts/create-demo-env.py --output /private/path/futureai.env --port 8088
export FUTUREAI_ENV_FILE=/private/path/futureai.env
docker compose --env-file "$FUTUREAI_ENV_FILE" config --quiet
docker compose --env-file "$FUTUREAI_ENV_FILE" up --build -d
```

父目錄需先存在。外部設定路徑下的後續 Compose 指令都保留 `--env-file "$FUTUREAI_ENV_FILE"`。`FUTUREAI_ENV_FILE` 選擇 backend 使用的檔案；`--env-file` 同時供 Compose 讀取 `WEB_PORT` 等部署設定。檢查設定使用 `config --quiet`，避免將完整環境值印出。

網址預設為 `http://localhost:8080`；API 在 `/api/v1`，健康檢查 `/health`，Swagger `/docs`，規格 `/openapi.json`。原七個 `.html` 路徑及 `/chat`、`/resources`、`/alerts`、`/teacher`、`/government` 等 SPA 路徑可正常開啟。nginx 靜態資產與反向代理共用 origin。

## 2. 三角色瀏覽器操作與 API smoke

直接開啟對應角色入口：學生 `/index.html`、教師 `/teacher.html`、政府 `/government.html`。離線 Demo 會自動建立該角色 session，不顯示存取碼畫面。Token 只保存在該分頁 sessionStorage，重新整理會沿用；跨角色入口時會建立新的對應 session。教師教材使用同一分頁預覽以保留教師身份。未來切換到 `live` 模式時，入口會恢復要求存取碼。

建議操作順序：

1. 學生首頁輸入「請解釋牛頓第二定律」，送出後看回答、動畫、教材引用與練習；用建議追問繼續。首頁至回答頁只提交一次，重新整理或從聊天紀錄重開不扣次。
2. 可附上 JPEG/PNG。Fake Demo 僅依文字回答，畫面會說明無法辨識圖片；只送圖片會得到可理解的錯誤並保留重試內容。六個學習主題入口提供既有可操作範例。
3. 到「找資源」選農業，使用「家裡菜園颱風受損，有補助嗎？」；開啟政府来源與文件清單，勾完可完成。切換其他五類查看對應內容及追問。只有明確同意「幫我記住」才新增記憶；「不用」不寫入。
4. 「我的」可編輯暱稱等資料、查看及刪除記憶；重載後確認保存。通知頁可依重要／系統篩選、查看詳情及標記已讀。
5. 教師登入後，巡覽五個分頁，切換班級、科目、期間，查看學生摘要與 CSV；教材庫可開啟六種動畫及18段來源，仍維持教師身份、不建立學生對話。新提問增加問答訊號，不虛構練習或動畫觀察紀錄。
6. 政府登入後，巡覽六個分頁，切換期間／地區、查看趨勢及 CSV。資料只含匿名計數，過濾後的圖表與 CSV 使用同一組 API 聚合。追蹤及偏好保存在此瀏覽器。

離線 Demo 不限每日提問次數，畫面不顯示剩餘額度。完整功能測試仍使用隔離 fixture，避免將測試對話寫入日常展示資料。

以下標準 Python 可直接驗證 API；存取碼以隱藏輸入取得，token 僅留在記憶體，不輸出到終端。修改 `BASE` 可使用另一個 port。

```python
import getpass
import json
import uuid
import urllib.request

BASE = "http://localhost:8080/api/v1"

def call(path, *, token=None, body=None, key=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if key:
        headers["Idempotency-Key"] = key
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    request = urllib.request.Request(BASE + path, data=data, headers=headers)
    with urllib.request.urlopen(request, timeout=50) as response:
        return json.load(response)

def sign_in(role):
    session = call("/auth/demo/session", body={"access_code": getpass.getpass(role + " code: ")})
    return session["access_token"], session["session"]["user_id"]

token, user_id = sign_in("student")
question = {"user_id": user_id, "conversation_id": None, "mode": "learning",
            "message": "請解釋牛頓第二定律", "attachment_ids": [], "topic": "newton"}
key = str(uuid.uuid4())
answer = call("/agent/chat", token=token, body=question, key=key)
replay = call("/chat", token=token, body=question, key=key)
assert answer["demo"] is True
assert answer["message_id"] == replay["message_id"]
history = call("/conversations/" + answer["conversation_id"], token=token)
print("Student answer persisted; alias replay did not add another answer.")
print("Usage:", call("/usage", token=token))

token, _ = sign_in("teacher")
print("Teacher summary:", call("/dashboard/teacher", token=token)["summary"])
token, _ = sign_in("government")
print("Government aggregate:", call("/dashboard/government", token=token)["totals"])
```

學生的 `user_id` 一律取自登入回應；教師與政府不能呼叫學生私有資料 API。政府僅提供日／區／主題聚合，不提供姓名、原始訊息或家庭資料。

上述頁面與 API 均以真 session、資料來源及持久化運作；最終驗收案例、命令與結果見 [整合報告](integration-report.md)。

## 3. Fake Demo 的支援邊界

- 六個學習主題：牛頓力學、熱力學、熵、化學平衡、化學鍵結、反應速率；各有三個既有追問。回覆含教材來源、教學步驟、練習及相容的動畫 topic。
- 六類資源：災害、農業、就學、經濟、健康、其他；回覆保留待確認條件、文件、來源與下一步。
- 不支援的問題回 `503 OFFLINE_DEMO_UNAVAILABLE`，不扣用量；帶 topic/category 也不能把無關問題變成支援情境。
- 圖片僅收 JPEG/PNG，單檔最多 5 MiB、每次 upload 僅一個 `file` 欄位。Fake Demo 不辨識照片內容，會明示僅依文字回答；圖片下載仍要求 owner token。
- 資源是示範方向，資格採保守判斷；未知 URL、公告期限仍為 null，不代表真實申請已核定。

## 4. 設定與資料位置

| 設定 | 預設／說明 |
| --- | --- |
| `WEB_BIND` / `WEB_PORT` | `127.0.0.1` / `8080`；要在同網路展示可改 bind，並更新 exact origins |
| `RUNTIME_MODE` | `offline_demo`；Fake Demo 不需要 live key |
| `DEMO_ACCESS_CODES` | server-only JSON；空值／未知 principal／重複值使 startup 失敗 |
| `FRONTEND_ORIGIN` | 逗號分隔 exact HTTP(S) origins，不使用萬用字元 |
| `AUTH_SESSION_TTL_MINUTES` | 480，最大 8 小時；token hash、expiry 存 SQLite |
| `AUTH_EXCHANGE_RATE_LIMIT_REQUESTS` / `...WINDOW_SECONDS` | 10 / 60；交換存取碼的獨立 rate limit |
| `AGENT_RATE_LIMIT_REQUESTS` / `...WINDOW_SECONDS` | 30 / 60；按 authenticated principal，兩 chat aliases 共用 |
| `MAX_JSON_BODY_BYTES` / `MAX_MULTIPART_BODY_BYTES` | 65536 / 6291456；先限 body，再做欄位與圖片驗證 |
| `AGENT_DEADLINE_SECONDS` | 45，上限 45 秒；nginx timeout 55 秒讓 API 回應自己的錯誤 |
| `AGENT_RESERVATION_TTL_SECONDS` | 90；只回收已到期 lease |
| `IDEMPOTENCY_TTL_HOURS` | 24，最少保留 24 小時 |
| `MEMORY_SUGGESTION_TTL_HOURS` / `UNATTACHED_UPLOAD_TTL_HOURS` | 各 24；未連結圖片於 startup 清理 |
| `ANONYMIZED_TELEMETRY` | Compose 固定 `False`，Chroma 離線索引不送匿名 telemetry |

`offline_demo` 沒有每日提問上限；後端保留用量帳本、reservation 與重送去重，帳本容量隨請求擴充，usage 的相容數值不代表離線提問上限。`live` 才依 server Demo principal 的每日額度限制（seed 學生 20 次、教師與政府 0 次）。查詢一般 API 不計次。Quota day、session／suggestion expiry 與去重 TTL 使用真實 UTC，重新登入不重置。`429 RATE_LIMITED` 與 live 的 `429 QUOTA_EXCEEDED` 皆有 Retry-After；短時間請求頻率限制仍適用。

部署固定一個 Uvicorn worker。Backend 不發佈 host port，`--no-proxy-headers` 且 nginx 移除客戶 forwarded headers，外部無法靠偽造 `X-Forwarded-For` 切換 exchange bucket；所有經此 nginx 的使用者共用 exchange rate bucket，Agent 仍按 principal 分開。這是單機 Demo 的選擇。

| 容器路徑 | 儲存方式 |
| --- | --- |
| `/app/data/curriculum`、`/app/data/policies`、`/app/data/alerts` | 映像內原始 seed catalogs，不掛 runtime volume |
| `/var/lib/futureai/data/app.db` | `backend_data` named volume；auth、quota、history、profile、Insight等 |
| `/var/lib/futureai/data/uploads` | 同一 `backend_data` volume，owner驗證後下載 |
| `/var/lib/futureai/chroma` | `chroma_data` named volume |

Compose 強制 `APP_DATA_DIR` 與 `CHROMA_PATH` 指向上表位置。自行設定 `DATABASE_URL` 時必須留在持久 volume 中；通常保持未設定即可。Backend UID/GID 為 10001，前端使用 [NGINX unprivileged image](https://github.com/nginx/docker-nginx-unprivileged)，不以 root 執行。新 named volumes 由映像目錄帶入正確擁有者。

## 5. 啟停、索引與持久化

```bash
docker compose logs --tail 60 backend
docker compose restart
docker compose down
docker compose up -d
```

`down` 不帶 `--volumes` 時保留資料；日常啟停不要使用 `down --volumes`。每次 backend 啟動都先執行 seed、index、readiness，再啟動 API。Seed marker 使 mutable profile/memory/history/read/quota/session 不被重建或覆寫；首次 dataset anchor 也保持。索引以穩定 chunk ID upsert，重跑不增加重複 chunks。

更新程式／source catalogs 後：

```bash
docker compose up --build -d
```

Seed 對已存在的 catalog row 採保留策略；本版有一項明確的局部教材升級，只在六情境的類比／解題理由逐字等於已知舊預設時恢復原作，並核對練習題幹／選項／答案。自訂內容與歷史回答快照保持原樣，重跑不改資料。其他教材／政策更新若需同步 SQLite，仍應另做明確資料遷移，不能把重新 seed 當作覆寫使用者資料的工具。Chroma build 讀取映像 catalogs，整合更新後應重驗來源一致性。

需要手動重建索引時（使用同一 backend runtime 設定）：

```bash
docker compose exec -T backend python scripts/build_index.py
docker compose restart backend
```

現有 SQLite 的 `attempt_id` 欄位有最小兼容升級，可重跑且保留原資料；不是通用 migration 系統。

可在停機後備份 SQLite/uploads 與索引：

```bash
umask 077
mkdir -p backups
docker compose stop
# 停止後仍可用 compose cp 複製容器掛載的持久資料。
docker compose cp backend:/var/lib/futureai/data backups/data
docker compose cp backend:/var/lib/futureai/chroma backups/chroma
docker compose start
```

備份包含私人資料，請存放在私有位置；不加入 Git。

## 6. 本機 backend 開發

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
# 將 server 設定透過環境注入；或在 backend/.env 建立私有設定。
# APP_DATA_DIR / CHROMA_PATH 建議指定 repo 外的持久目錄。
export RUNTIME_MODE=offline_demo
export ANONYMIZED_TELEMETRY=False
.venv/bin/python scripts/seed.py
.venv/bin/python scripts/build_index.py
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 --no-proxy-headers
```

本機 startup 同樣要求 `DEMO_ACCESS_CODES` 与 index ready；root 的 `.env` 是 Compose 設定，backend 原生模式預設讀 `backend/.env`。Vite 的 origin 若為 `http://localhost:5173`，在 backend 的 `FRONTEND_ORIGIN` 精確加入它。

## 7. 真實 provider 設定後補

目前不以 live key、模型選擇或外部品質驗收阻塞其他功能。之後明確切換 `RUNTIME_MODE=live` 時才填入 server-only `LLM_API_KEY`、`LLM_MODEL`、`EMBEDDING_MODEL` 與 `LLM_BASE_URL`。既有 client 需要 OpenAI-compatible structured Chat Completions、image content parts及 embedding API；必須以實際供應商另行驗證，不沿用 CLI 模型名稱。

以同一設定重新 build index 再啟動；live 配置缺漏、索引不相容或建索引失敗會讓啟動失敗，provider 錯誤不會靜默回 Fake Demo。現階段只宣稱 Fake Demo 與 localhost mock boundary 測試通過。

## 8. 故障定位

- 容器不健康：先 `docker compose logs --tail 60 backend`。啟動邊界只印錯誤種類與設定提示，不印 key/code 或完整 provider exception。
- 未生成設定：`.env.example` 的空 `DEMO_ACCESS_CODES` 會刻意拒絕啟動，先用產生器建立私有檔。
- `401`：重新使用對應 code 交換 session；過期 token 不可續用。
- `403`：檢查登入角色與 subject；不能用 user_id/header 代替授權。
- `429`：依 Retry-After 等待；重新登入不會清除當日 quota。
- `503 OFFLINE_DEMO_UNAVAILABLE`：改用上述支援問題；不會製造成功 history 或扣次。
- `/docs` 或 API 正常但頁面出錯：重新確認角色、瀏覽器 Network 的 `/api/v1` 回應與前端 build 版本；依整合報告重跑對應案例。頁面會顯示 API 錯誤與重試入口，不用本機資料偽裝成功。
