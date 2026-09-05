# Demo 完整實作：Task / Subtask 執行計畫

日期：2026-09-05。依據：`backend-sdd.md`、`frontend-sdd.md`、`hackathon-fullstack-sdd.md`、現有 `src/`，以及根目錄參考 PNG。這份文件是執行分工，不取代或改寫 SDD。

## 工作規則

- 最新授權：使用者已明確允許由目前對話直接完成剩餘實作，解除「實作只能由指定模型Codex CLI完成」的限制。後续不再開/重試CLI，使用目前對話工具與各Task owner直接實作、獨立驗收；原CLI session保留作歷史紀錄。既有責任範圍、依賴順序、保留使用者資料與Fake Demo範圍不變。以下CLI規則僅記錄此前執行方式。
- 每個 Task 只有一個協調 Agent；每個 Subtask 只有一個實作 Codex CLI session。不得另開 CLI 重複處理同一 Subtask。後續修正須 resume 原 session 或交給明確的新驗收修正 Subtask。
- 所有實作 CLI 使用 `gpt-5.6-sol` 與 `model_reasoning_effort="xhigh"`。本機 CLI 實際命令為 `codex exec`；不把使用者的 `codex -e` 當作未確認的 CLI 參數。
- 每次開始前讀 SDD、責任範圍的既有程式、此前所有相關 handoff；每次完成寫 `docs/handoffs/<subtask>.md`。
- handoff 必須包含：完成內容、修改檔案、API/interface、驗證命令與結果、未解問題、下一位需要知道的事項。
- 原主流程依序：1 → 2 → 3 → 4 → 5。使用者最新要求優先完成其他後端、Agent 設定後補，因此目前順序調整為：收尾 3.1 已發現的後端缺陷 → 4.1 後端安全 → 4.2 Docker/持久化 → 3.2 前端接線 → 5.1 → 5.2。真實 provider 金鑰/模型設定及品質驗證留待後補，不阻塞無 key 的後端驗收。1.1 完成後的 1.2/2.1 曾依同一契約並行；其餘實作仍依序，不同執行者不可同時修改同一責任範圍。各 Task 協調者可提前只讀準備，實作須等前一 owner 交接；主協調者維護計畫/prompts、分派與獨立驗收；直接實作授權後可在責任不重疊的範圍修正已確認缺陷。
- 保留現有未提交變更，不 reset、checkout 還原、刪除使用者檔案或自動 commit。不可修改 SDD 或做非 Demo 重構。
- 執行工具範圍：不修改 `~/.codex`、不安裝或新增全域 MCP/外掛。缺少文件工具時使用官方網站查核；本任務只授權各 Subtask 的專案責任檔案與隔離測試環境。
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
| 2.1 Backend Core：基礎與資料 | Python/FastAPI 結構、設定、SQLite/SQLAlchemy、Pydantic、可重複 seed、10+政策/3+通知/20+學習/10+資源/5+對話，保留既有前端資料語義 | `backend/`（本階段基礎/DB/schema/seed/data）、自身 handoff | 1.1（可與 1.2 並行） | 完成（含獨立驗收修正） |
| 2.2 Backend Core：業務 API | Profile/memory 確認/刪除、history/detail/delete、resource list/detail、alert matching/read、dashboard 聚合、upload、共用 error；角色驗證接點 | `backend/`（core routes/services 與必要基礎增量）、自身 handoff | 2.1 + 1.2 | 完成（含獨立驗收修正） |
| 3.1 AI Agent：獨立 API 與 pipeline | Agent router、相容 chat、集中 LLM/embed、Chroma 索引/檢索、learning/resource、eligibility、每則最多一個 Insight、附件/timeout/驗證；離線 Demo 明確標示 | `backend/`（Agent/LLM/RAG 與必要整合）、自身 handoff | 2.2 | 完成（含獨立驗收修正；真實provider未設定） |
| 3.2 AI Agent：前後端串接 | 全頁改用 API：問題/追問/來源、記憶、profile、history、resource、alert、teacher/government；保留動畫、樣式與本機偏好；loading/error/empty | `src/`（頁面/元件/data adapters；必要時 client）、自身 handoff | 3.1 + 4.2 | 完成（最終build/typecheck與主要browser smoke通過） |
| 4.1 Docker / Config / Security：安全 | Demo token/session、角色/ownership、持久原子 quota、rate/輸入/上傳限制、CORS、秘密隔離、Agent 限制；前端接點由3.2依交接落實 | `backend/`、必要 `src/api/`、自身 handoff | 3.1 收尾 | 完成（直接修正後28/28通過） |
| 4.2 Docker / Config / Security：啟動 | Dockerfiles/Compose、同機前後端與本地 DB/Chroma 持久化、healthcheck、env example、seed/index 啟動、啟停與真實/離線模式說明；實際 build/up | Docker/Compose/config、啟動 scripts、`.gitignore`、`.env.example`、`README.md`、`docs/demo-runbook.md`、自身 handoff | 4.1 | 完成（Docker/API/重啟及容器重建持久驗證） |
| 5.1 Integration：自動驗收 | API integration + 真實瀏覽器完整 Demo flow、跨角色隱私/權限/quota/錯誤/重啟持久化；修正既有 audit 的測試資料依賴；產出失敗清單 | `backend/tests/`、`tests/`、`scripts/` 測試、`package*.json` 測試指令、`docs/integration-report.md`、自身 handoff | 4.2 + 3.2 | 完成（四項實際缺陷已交5.2修正） |
| 5.2 Integration：修正與最終驗證 | 只修 5.1 揭露的實際缺陷；跑必要回歸與 Docker smoke；完成可重現驗收報告與剩餘限制 | 必要缺陷檔案（此前 owner 已退出）、驗收文件、自身 handoff | 5.1 | 完成（backend37/37、browser87項、client9/9、Docker持久驗證通過） |

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
- 時間界線（已加入 2.2/3.1/4.1 prompt）：固定 Demo dataset anchor 僅供示範學習/Insight/dashboard 資料；session/suggestion 到期、daily quota/reset_at、idempotency TTL 用真實 UTC，rate/timeout 用真實時間或 monotonic clock，不因 offline_demo 凍結安全計時。
- 2.1 已完成修正並凍結：独立驗收 consent 僅接受 bool True，8/8 message-linked Insight 的 owner/topic/category/time 與 activity/snapshot 一致，FK 與單 message 去重通過。最終 seed 為129 learning activities、53 Insights、8 conversations/16 messages，其餘12政策/3通知/42學生/3班保留；重跑不重複。
- 2.2 owner 仍是 `task2_backend`，唯一 CLI session：`01a07058-bbb4-7161-b760-e77a628d54cd`；已於 1.2/2.1 驗收完成後依序啟動，記錄 `.codex-runs/2.2.*`。
- Task 2 已完成：2.2 最終 7 組 core integration、ruff/compile/pip check 通過。獨立驗收確認政府唯一 Insight SELECT 在 SQL GROUP BY/COUNT，沒有 identity/source 欄位或 join 私人表；Unicode code 正確/錯誤分別200/401，resource event × eligibility flags矩陣通過。原兩個 CLI 已退出。
- Task 3 owner：`task3_agent`；依完成的 2.2 session/usage/Insight/persist 接點分派 3.1，3.2 仍等待 Agent pipeline 驗收。
- 3.1 唯一 CLI session：`01a07074-9b1d-7092-9b08-a044c75f22e8`；使用 `gpt-5.6-sol / xhigh`，記錄 `.codex-runs/3.1.*`。依 OpenAI Docs 技能核對官方 API，無 live key 時僅驗證明確 offline_demo 與 mock HTTP provider，不宣稱真實供應商已通過。
- 3.1 文件查核曾額外新增全域 `openaiDeveloperDocs` MCP；協調者確認本輪新增後已移除該 entry，未重啟實作 session。此操作不屬專案範圍，後續已明文禁止全域工具設定修改。
- 3.1 首輪 13 組 backend integration 通過；獨立驗收仍需確認 finalize/refund 跨連線原子計數、startup 不回收其他活躍 worker、六主題追問不退化成固定總覽，以及 mock HTTP strict schema / provider client lifecycle。未修完前不凍結；修正沿用原 3.1 session。Task 3 owner 完成上述驗收與 handoff 後可直接依序開始唯一 3.2 CLI，不需再次等待主協調者確認。
- 3.1 獨立驗收已重現：18/18 學習追問回 overview、18/18 資源追問回同 summary，3 個附 topic/category 的無關問題仍200並扣額；跨執行緒兩 finalize / finalize+release / 兩 release 均留下錯誤 ledger；另一 app startup 釋放未到期活躍 lease。首輪 handoff 的完成標示不代表已通過協調者驗收，上述案例修正後才可交接。
- 使用者最新指示：「Agent 還沒設定，但是沒關係，我們再補，先把其他後端都解決好」。已撤回 3.1 完成後自動開 3.2 的授權；原 3.1 session 僅收尾已發現缺陷與必要回歸，之後先執行 4.1/4.2 後端安全、Docker與持久化。3.2 後移；真實 provider 設定不作為本輪其他後端完成的阻礙。
- Task 4 owner：`task4_security_docker` 已提前開始只讀盤點與 Docker 依賴準備；尚未開 4.1 CLI。須等 3.1 owner 交接退出後才可實作，不與其並行改 backend。
- 3.1 已完成並凍結：原唯一 session 共兩 turn，均 exit0；最後獨立19/19 suite通過（41.233s）。18/18學習與18/18資源追問符合作者內容；原3個unsupported皆503且不扣；兩finalize/finalize+release/兩release ledger分別2/0、1/0、0/0，重複轉移與response usage一致；active lease保留、expired回收，成功/失敗client確實close。無實作或測試進程殘留，未啟動3.2。
- 已正式交接 backend owner 給 `task4_security_docker`，授權依更新prompt啟動唯一4.1，必要驗收完成後直接依序4.2。3.2待Task4完成再開；真實provider設定仍後補。
- 4.1 唯一 CLI session：`01a070aa-cd6b-7993-ac39-bcb6c8629b4f`，`gpt-5.6-sol / xhigh`，記錄 `.codex-runs/4.1.*`；已正常啟動讀取最終3.1 handoff與更新prompt。
- 4.1 首輪23/23測試通過，仍待獨立驗收：使用假值重現 Settings ValidationError 回顯秘密、live空白key接受、upload接受多檔/多餘part，以及core test未指定臨時Chroma目錄。已resume原4.1 session集中修正，並驗真正舊SQLite新增attempt_id欄位可重跑且保留資料；未開4.2。
- 3.2 owner已提前完成不改檔的入口盤點，摘要納入其task prompt；真正3.2 CLI仍待Task4完成。4.2部署交接需明確單process/proxy策略、關閉Chroma匿名telemetry、source與runtime volume分離，不能宣稱尚未接線的UI已完成。
- 使用者再次確認：「AI Agent 可以先緩緩再做（先 Fake Demo），但是其他要完成」。Agent回覆先使用明確標示的offline/Fake Demo；保留現有provider介面待後補，不再擴充真實模型設定/品質/新mock能力工作。其他API、持久資料、權限、前端接線、Docker與整合驗收仍須完成，不能用Fake頁面互動替代。
- 實際阻塞：4.1原session的修正turn在只讀準備後收到 `error` + `turn.failed`，內容為使用額度已用完，可於2026-09-12 2:03 PM重試（CLI未附時區）。exec退出1，該修正turn沒有file changes；四項必要修正仍未完成，不能以首輪23/23宣稱4.1完成。主協調者已核對原`.codex-runs/4.1.jsonl`錯誤；未自行換模型或另開session。
- 接續點：原4.1 session `01a070aa-cd6b-7993-ac39-bcb6c8629b4f`；修正prompt `.codex-runs/4.1-review-resume.md`，4.2完整prompt `.codex-runs/4.2.prompt.md` 已備妥。無殘留CLI/測試進程。依先前指定CLI/model規則，需額度恢復，或使用者明確允許改用目前對話直接實作，才能繼續修改產品。4.2、3.2、5.1、5.2均尚未開CLI。
- 使用者已回覆「允許」目前對話直接完成剩餘實作，額度阻塞已解除。root直接修4.1設定錯誤遮蔽、空白key、單檔multipart與測試隔離；Task4 owner並行獨立驗證真正舊schema升級兩次，新增永久regression test且1/1通過。後續不再消耗CLI session。
- 4.1已完成直接修正與獨立驗收，最終28/28測試通過（48.635s）、ruff/compile/diff checks通過。9個已確認測試Chroma檔已移至/tmp備份，專案Chroma目錄只保留.gitignore。最終4.1 handoff已補齊；Task4 owner接續直接實作4.2。

- 4.2已完成：隔離 project `futureai-t42-681542`、port45465實際build/up、15頁入口、API/auth/Fake Demo、restart與down/up逐表/附圖/Chroma持久化皆通過。Root獨立確認兩服務healthy、health/offline、401 envelope、OpenAPI與三角色HTML入口；未影響原5173及其他專案容器。
- 4.2期間root重現固定Demo時間導致歷史最近活動排序錯誤：`agent._persist_answer`在寫入交易內以每位使用者的最新時間與真實UTC建立嚴格遞增`updated_at`，不改訊息/Insight證據時間。新歷史排序/追問/replay regression與既有snapshot/alias/dashboard測試2/2通過（5.280s）；最終全suite於5執行。
- 3.2已正式交接原Task3 owner直接完成src/API接線，不再開CLI；Task4並行只補Swagger Bearer scheme文件互動，保留現有401/envelope/auth實作。

- 4.1追加Swagger Bearer安全宣告：protected operation支援Authorize，公開exchange/health與既有401格式保留；schema/auth regression2/2通過。之後backend rebuild納入。
- 3.2期間root以真localhost HTTP重現舊token延迟401登出新身份；Task3已加入session generation防護，也避免舊session lookup200覆蓋新身份。root新增永久`scripts/api-client-audit.mjs`，9/9通過，包含上述兩競態、同身份401、JSON/error/binary body deadline、singleflight取消隔離、session取消、重試key/body穩定。
- 5.1提前進行不依賴UI且與src不重疊的前置：Task5新增共用真auth helper、隔離Compose fixture準備、兩組seed/Insight provenance/跨端點持久回歸，2/2通過（2.843s）。完整UI與最終Docker驗收仍待3.2交接；report明確區分已驗與待驗。

- Root完成最終backend full suite：32/32通過（95.181s），記錄`.codex-runs/5.1-root-backend-tests.log`。Ruff涵蓋backend app/scripts/tests、Docker entrypoint與兩個env/fixture scripts皆通過。若5.2沒有相關變更或新疑慮，沿用此結果。
- 3.2獨立browser核對：三角色登入無pageerror、真profile/history與重載只GET、logout移除token、教師同頁教材預覽含18段API教材且0 Agent POST皆通過。已修教師newtab因noopener缺session的入口問題，以及Profile nickname失效session顯示、gap_count避免描述為已作答錯誤等接線細節。

- 3.2已正式完成凍結：最終typecheck/build/diff-check與主要browser smoke通過，handoff已更新，原src owner退出。Task5正式接管5.1→5.2，使用新functional fixture做完整驗收/必要修正/回歸與最終文件；root另做獨立審核，最後更新正常20次quota的4.2 Demo到最终source。

- 5.1初輪production learning為20/26，六項flow揭露backend seed把原作者analogy/practice理由縮短，導致既有教學內容退化。5.2精準修復委派原Task3 owner：六scenario指定文字、精確舊預設比對升級、保留自訂與immutable history；Task5繼續其他UI/audit，兩者檔案範圍不重疊。
- client audit完整輪曾第9案不穩定；root修測試伺服器為每案fake token固定handler，避免取消後遲到HTTP誤入下一案。產品client不變；修後連續10輪9案（90 case executions）全通過，記錄`.codex-runs/5.1-client-isolation-repeat.log`。

- 5.2 catalog修復已交接：6scenario/11文字回復作者原作，精確舊值/題意guard及JSON條件更新，targeted3/3通過，root code review通過。Task5另定位實際Checklist固定4項導致無法完成，以及首卡未呈現後端完整message披露等UI接點。
- 5.1真首頁integration重現auto路由：`請解釋牛頓第二定律`（帶合法PNG）被通用`第二定律`權重判為entropy而503。原Task3 owner受限修agent.py既有Newton/thermo明確詞優先與新獨立真API regression，Task5保留原UI輸入驗證；不擴充Fake/live範圍。

- 5.2四項實際缺陷全部修復並驗收：恢復作者類比／練習理由、API文件清單依實際推薦初始化、具名Newton／thermo定律路由、學習與資源首卡完整呈現圖片限制告知。歷史快照及自訂教材不覆寫；Fake Demo不辨識圖片、不支援問題仍503且不扣額。
- 最終backend全套37/37通過（64.774s，`.codex-runs/5.2-root-backend-tests.log`）；client真HTTP9/9且連續10輪90案例通過；typecheck、production build、ruff與diff check通過。Backend與src已凍結，之後只有驗收與文件更新。
- 最終真瀏覽器87項全部通過：learning26、resources27、dashboard13、interactions7、integration7、visual7；涵蓋36個建議追問、21組匿名聚合、三角色登入、單次提交、GET歷史不扣額、圖片披露與教師教材身份。Root另抽查最終首頁／學習頁截圖，排版正常。
- 專屬fixture完成restart與down/up重建：全部SQLite rows、圖片bytes、Chroma IDs/documents/metadata/embeddings、session/quota/memory/read/history/dashboard與alias replay保持一致，重新登入不重置quota。證據`.codex-runs/5.2-restart.log`；驗後停用fixture並保留其state與volumes供重跑。
- 正常展示project `futureai-t42-681542` 已重建至最終source，入口 `http://127.0.0.1:45465`。Root比對22個非catalog資料表與2張圖片hash全部保留，索引18/12、學生每日配額20、Swagger Bearer與兩服務healthy；三角色production登入／重載皆無Agent提交或pageerror。證據`.codex-runs/5.2-normal-deploy-report.json`、`5.2-normal-browser.log`。
- 已停止本輪臨時Vite45466，原使用者5173與其他專案容器保留。全部10個Subtask完成；操作與重跑方式見`docs/demo-runbook.md`、`docs/integration-report.md`及`docs/handoffs/5.2.md`。唯一依使用者指示後補的是外部AI provider設定與真實品質驗收。
