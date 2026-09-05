# Demo 完整實作：Task / Subtask 執行計畫

日期：2026-09-05。依據：`backend-sdd.md`、`frontend-sdd.md`、`hackathon-fullstack-sdd.md`、現有 `src/`，以及根目錄參考 PNG。這份文件是執行分工，不取代或改寫 SDD。

## 工作規則

- 每個 Task 只有一個協調 Agent；每個 Subtask 只有一個實作 Codex CLI session。不得另開 CLI 重複處理同一 Subtask。後續修正須 resume 原 session 或交給明確的新驗收修正 Subtask。
- 所有實作 CLI 使用 `gpt-5.6-sol` 與 `model_reasoning_effort="xhigh"`。本機 CLI 實際命令為 `codex exec`；不把使用者的 `codex -e` 當作未確認的 CLI 參數。
- 每次開始前讀 SDD、責任範圍的既有程式、此前所有相關 handoff；每次完成寫 `docs/handoffs/<subtask>.md`。
- handoff 必須包含：完成內容、修改檔案、API/interface、驗證命令與結果、未解問題、下一位需要知道的事項。
- 主流程依序：1 → 2 → 3 → 4 → 5；同一 Task 中 Subtask 依序執行。唯一提前並行為：1.1 契約完成後，1.2（僅前端 client/types）與 2.1（僅 backend 基礎/資料）可各讀同一契約並行，2.2 必須等待兩者 handoff。不同執行者不可同時修改同一責任範圍。主協調者只維護本計畫、執行分派與獨立只讀驗收。
- 保留現有未提交變更，不 reset、checkout 還原、刪除使用者檔案或自動 commit。不可修改 SDD 或做非 Demo 重構。
- CLI prompt 放 `docs/tasks/`，執行記錄放本機 `.codex-runs/`（不提交）。不將 API key、存取 token 或完整環境變數写入記錄。

## 初步差異與最小影響方向

1. 尚無 `backend/`，所有頁面行為來自本機示範資料。需補齊真實 API、儲存與串接，保留視覺與現有操作。
2. SDD 範例 wire format 為 snake_case，既有 TypeScript view interface 為 camelCase。於 API client 明確轉換，避免重寫 UI。
3. 使用者要求 Agent API 獨立。以同一 FastAPI modular monolith 的 `/api/v1/agent/chat` 為主要入口，`/api/v1/chat` 可相容轉接；不增加微服務。
4. 現有學習頁已有理化動畫與教材、教師與政府工作台已有完整分頁。保留既有功能與路由；資料來源改為 API。僅本機偏好、複習安排、追蹤清單可按現有行為留於 localStorage，須明確說明。
5. 政府資料只用 Insight 聚合，不回傳原始訊息、使用者 ID、姓名、家庭資訊；不可為配合前端送出逐人或逐對話事件。
6. SDD 允許 Demo seed。支援明確標示的離線 Demo 回覆以便沒有供應商 key 時驗收；真實模式必須使用集中式 OpenAI-compatible client 與 embedding API，不可失敗後靜默冒充 AI 成功。
7. Demo 存取 token、角色權限、使用次數限制及請求/檔案限制屬使用者明確新增要求。以最少機制完成，不建立正式帳號系統；secret 留在伺服器，不包入 Vite 產物。契約由 1.1 詳列。

## Task 分解與責任

| Task / Subtask | 工作與驗收結果 | 可修改範圍 | 依賴 | 狀態 |
| --- | --- | --- | --- | --- |
| 1.1 Frontend / API Alignment：契約 | 逐頁盤點行為、wire/view schema、endpoint、Demo flow；記錄 SDD 衝突與最低改动方案，包含 token/usage 介面 | `docs/api-alignment.md`、自身 handoff | 初始盤點 | 完成（含六項補充） |
| 1.2 Frontend / API Alignment：共用 client | 完整 TS API wire/view interface、錯誤與 FormData、token/session 支援、各功能 typed client；不改頁面 | `src/api/`、`src/types/`、自身 handoff | 1.1 | 完成（含獨立驗收修正） |
| 2.1 Backend Core：基礎與資料 | Python/FastAPI 結構、設定、SQLite/SQLAlchemy、Pydantic、可重複 seed、10+政策/3+通知/20+學習/10+資源/5+對話，保留既有前端資料語義 | `backend/`（本階段基礎/DB/schema/seed/data）、自身 handoff | 1.1（可與 1.2 並行） | 執行中 |
| 2.2 Backend Core：業務 API | Profile/memory 確認/刪除、history/detail/delete、resource list/detail、alert matching/read、dashboard 聚合、upload、共用 error；角色驗證接點 | `backend/`（core routes/services 與必要基礎增量）、自身 handoff | 2.1 + 1.2 | 待執行 |
| 3.1 AI Agent：獨立 API 與 pipeline | Agent router、相容 chat、集中 LLM/embed、Chroma 索引/檢索、learning/resource、eligibility、每則最多一個 Insight、附件/timeout/驗證；離線 Demo 明確標示 | `backend/`（Agent/LLM/RAG 與必要整合）、自身 handoff | 2.2 | 待執行 |
| 3.2 AI Agent：前後端串接 | 全頁改用 API：問題/追問/來源、記憶、profile、history、resource、alert、teacher/government；保留動畫、樣式與本機偏好；loading/error/empty | `src/`（頁面/元件/data adapters；必要時 client）、自身 handoff | 3.1 | 待執行 |
| 4.1 Docker / Config / Security：安全 | Demo token/session、角色/ownership、持久原子 quota、rate/輸入/上傳限制、CORS、秘密隔離、Agent 限制；必要的前端存取入口 | `backend/`、`src/api/`、必要存取元件/入口、自身 handoff | 3.2 | 待執行 |
| 4.2 Docker / Config / Security：啟動 | Dockerfiles/Compose、同機前後端與本地 DB/Chroma 持久化、healthcheck、env example、seed/index 啟動、啟停與真實/離線模式說明；實際 build/up | Docker/Compose/config、啟動 scripts、`.gitignore`、`.env.example`、`README.md`、`docs/demo-runbook.md`、自身 handoff | 4.1 | 待執行 |
| 5.1 Integration：自動驗收 | API integration + 真實瀏覽器完整 Demo flow、跨角色隱私/權限/quota/錯誤/重啟持久化；修正既有 audit 的測試資料依賴；產出失敗清單 | `backend/tests/`、`tests/`、`scripts/` 測試、`package*.json` 測試指令、`docs/integration-report.md`、自身 handoff | 4.2 | 待執行 |
| 5.2 Integration：修正與最終驗證 | 只修 5.1 揭露的實際缺陷；跑必要回歸與 Docker smoke；完成可重現驗收報告與剩餘限制 | 必要缺陷檔案（此前 owner 已退出）、驗收文件、自身 handoff | 5.1 | 待執行 |

## Demo 驗收路徑

1. Docker 單機啟動；前端、`/health`、Swagger 正常；資料 seed 可重跑且不重複。
2. 以 Demo token 進入學生端，發問 → Agent API → 結構化答案/來源 → 對話持久化 → 追問與歷史重開。
3. 六類資源入口 → 查詢/推薦 → 顯示可能符合與待確認條件/來源；同意才儲存 memory，拒絕不寫入；可刪除。
4. Profile 編輯、通知匹配與已讀可重載，圖片只允許 JPEG/PNG 且有限制與所有權。
5. 教師可看授權教學資料；政府只收到匿名聚合。學生不能讀管理角色 API，政府不能讀原始學生資料。
6. quota/rate limit/無效 token/供應商錯誤有一致回應，UI 不把錯誤顯示為成功。
7. 教師與政府統計能反映新 Insight；離線 Demo 與真實 LLM 模式明確區分。
8. build/typecheck、後端整合測試、Playwright Demo flow 通過。外部 key 若未提供，不宣稱已驗證真實供應商呼叫。

## 執行紀錄

- 初始：Docker 29.3.0 / Compose v5.1.1、Python 3.12.3、Node 22.22.2、Codex CLI 0.146.0 可用。現有工作目錄有未提交變更，已識別並保留。
- Task 1 owner：`task1_alignment`。1.1 CLI session：`01a06ff4-a120-7482-8e91-796b9dbedf51`。
- 原前端基準：`npm run build` 通過。主機 Chromium 缺 OS library 且無免密 sudo；以 apt download + dpkg-deb 解包至 `.codex-runs/browser-libs/root`，驗收命令可加 `LD_LIBRARY_PATH=$PWD/.codex-runs/browser-libs/root/usr/lib/aarch64-linux-gnu`。不更改系統套件。5173 有使用者現存 Vite，請勿停止。
- 原前端瀏覽器基準（補齊 library 後）：`npm run test:learning` 26 passed / 0 failed；`npm run test:dashboards` 13 passed / 0 failed。log 位於 `.codex-runs/baseline-*.log`。
- 其餘基準：`npm run test:categories` 27 passed / 0 failed；`npm run test:interactions` exit 0。後續驗收應保留這些互動覆蓋，移除對純前端假資料的依賴。
- 接續來源：`01a06ff1-dd1b-73f2-b649-21771d439bbf`。1.1 原 session 雖在後續呼叫遇到額度限制，契約與 handoff 已包含六項補充；接續時已核對，不重做 1.1。
- 已補齊 `docs/tasks/2.1.md` 至 `5.2.md`；全數 10 個 Subtask 均有獨立 prompt、責任範圍、依賴及驗收要求。
- 1.2 owner：`task1_alignment`，唯一 CLI session：`01a07032-22a3-7791-92e6-b2f5406c346e`。本輪已正常開始讀取契約；沿用指定模型與 effort，尚未完成實作驗收。
- Task 2 owner：`task2_backend`。2.1 依已凍結契約在 backend 專屬範圍分派，2.2 等待 1.2 與 2.1 handoff。
- 2.1 唯一 CLI session：`01a07034-5b79-7a63-b673-882af019c636`。本機 `models cache missing base_instructions` 警告不代表模型拒絕；若執行被中斷，沿用這個 session resume，不另開實作 session。
- 本輪只讀環境檢查：Docker daemon 可用（29.3.0，Linux aarch64），Compose v5.1.1；既有其他專案容器不屬本任務，不停止或移除。5.1 已註記旧學習文案斷言與新「離線示範」標示的必要調整。
- 1.2 初稿 typecheck/build 與自測通過。獨立延遲 HTTP body 驗收發現 timeout/abort 未涵蓋 body，及共用 submission 任一 consumer 取消會影響其他 consumer；已回原 1.2 session 修正，完成前不凍結交接。
- 1.2 已完成修正並凍結：最終 typecheck/build、真實 HTTP 延遲 JSON/error/binary body、個別 consumer 取消隔離、單次 transport、cache/logout 驗收均通過。紀錄確認只有原 session 的兩個 turn；15 個修改檔案全部在允許範圍。頁面接線仍屬 3.2。
- 2.1 首輪 health/docs/seed 重跑等 smoke 通過；獨立驗收發現 consent 接受數字 1/1.0 及 seed Insight/message owner/topic/date 不一致，正由原 session 修正。1.2 依賴已滿足，2.1 驗收完成後 Task 2 owner 直接接續 2.2。
