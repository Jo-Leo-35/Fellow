# Subtask 1.1 — Frontend / API Alignment 契約

日期：2026-09-05  
狀態：實作前契約；本文件不表示 backend 或 UI 已完成。  
依據：`docs/demo-execution-plan.md`、`backend-sdd.md`、`frontend-sdd.md`、`hackathon-fullstack-sdd.md` 與目前 `src/`。`hackathon-fullstack-sdd.md` 的前、後端正文分別與兩份獨立 SDD 完全相同。1.1 是第一個 Subtask，開始時沒有任何 `docs/handoffs/` 前序 handoff。

## 1. 契約目標與最小影響決策

1. API base URL 固定為 `/api/v1`。主要 Agent 入口是 `POST /api/v1/agent/chat`；`POST /api/v1/chat` 只是同一 router/service、auth、idempotency、quota 與 persistence path 的相容 alias。前端新接線一律用 `/agent/chat`。
2. 仍是單一 FastAPI modular monolith。Agent、profile/memory、conversation、resource、alert、upload、dashboard 是同一 process 內的 router/service 邊界，不拆微服務，也不讓瀏覽器呼叫 LLM、embedding 或其他供應商。
3. Wire JSON 欄位使用 `snake_case`；React view model 使用 `camelCase`。轉換集中在 `src/api/` adapter，不把 wire naming 滲入 page，也不為了配合 API 重寫現有 UI。
4. 保留現有兩種聊天畫面、教材來源 modal、理化 `steps/body/sourceIds`、scenario、practice、follow-up 與六種靜態動畫。動畫程式、色彩、圖示、物理／化學顯示標籤及純展示文案可留前端；回答內容、引用來源、資源內容、profile、memory、歷史、通知、學生資料與統計必須來自 API。
5. 保留六個資源分類：`disaster | agriculture | education | economy | health | other`，並保留教師五分頁與政府六分頁。有限 Demo 清單的文字搜尋、tab、排序、CSV 組裝與 modal 開關可在前端做，不增加 search/export endpoint。
6. 教師偏好與複習計畫、政府偏好與追蹤清單仍可使用既有 localStorage。它們是「這個瀏覽器的 UI 資料」，不是伺服器已儲存的資料。學生 profile、memory、通知已讀與 conversation 不得再假裝只在本頁成功。
7. 真實模式的 OpenAI-compatible generation 與 embedding 必須各自集中在 backend client，由 Agent/service 呼叫。`offline_demo` 是啟動時明確選定的模式；成功回應標示 `demo: true`。`live` 供應商錯誤不得靜默改用 fixture 並回成功。

### 1.1 SDD / 現有實作衝突與採用方案

| 衝突 | 採用的最小影響方案 |
| --- | --- |
| SDD chat endpoint 是 `/chat`，執行計畫要求 Agent 獨立入口 | 新 client 只呼叫 `/agent/chat`；`/chat` 保留為同 service alias，不複製 pipeline |
| SDD wire 範例是 snake_case，`src/types`/page 是 camelCase | wire 維持 snake_case，在 `src/api` 做 typed adapter；page 不直接讀 wire object |
| SDD `LearningAnswer.steps[].content`，實際 rich page 使用 `body/sourceIds`，另有 scenario/formula/practice/follow-up/animation | 契約採實際 page 所需的 `body/source_ids` 與完整 `LearningAnswerWire`；不把畫面降級成 SDD 簡化卡片 |
| SDD route 列 `/profile`，目前 UI 是 `/?panel=profile`；另有 `.html` legacy aliases | 先保留現有 routes 與 drawer；route 形狀不影響 profile API。所有 aliases 共用同 page/client，不增加重複 backend route |
| 首頁/learning/resource chat 目前用 query string 傳檔名，file 本身沒有 upload；input 接受所有 `image/*` | 先 upload 取得 attachment id 再 chat；file picker 收斂成 JPEG/PNG，server 仍以 MIME + magic bytes 驗證 |
| Learning/source、resource recommendation、profile/history/alerts 全是 fixture 或 component state | 樣式、動畫、標籤與 local interaction 保留；事實內容與持久狀態改由本契約 API 回傳。錯誤時不執行本機假 success |
| Resource memory UI 明說 reload 清除，SDD 要求同意後寫入 | 同意按鈕 POST server-issued suggestion；拒絕不呼叫 API；重載 profile 可驗證。只有 checklist/draft 仍在本機 |
| SDD 教師/政府主要只描述總覽，現有實作已有完整五/六分頁 | 一個完整 snapshot 支援所有既有分頁與 modal；不刪現有功能，也不為每個 tab 建 endpoint |
| 教師現有 deterministic roster/events 含姓名；政府現有 daily aggregate generator | 教師 endpoint 只回授權教學名冊/摘要；政府 endpoint 僅回 Insight aggregate。兩者改由 server persisted data 計算 |
| SDD 沒有 Demo access gate、role enforcement、quota/idempotency | 加入最小 session exchange、server role/scope、usage 與原子 quota；不擴成正式帳密或 IAM |

### 1.2 SDD 範例 wire 差異與相容性

本契約保留 SDD 的語意，但因既有前端需要 richer payload，不宣稱與 SDD 範例完全 wire-compatible。明確差異如下：

| SDD 範例欄位／shape | 本契約 canonical wire | 相容決策 |
| --- | --- | --- |
| chat `resource` | `resource_recommendation` | adapter 映射到現有 resource card；新舊 Agent routes 都回 canonical 名稱 |
| `resource.status` | `resource_recommendation.eligibility_status` | 避免與 HTTP/status 混淆，enum 語意維持 |
| `learning.steps[].content` | `learning_answer.steps[].body` | 配合既有 rich learning page，另保留 `source_ids` |
| teacher `question_count` | `summary.question_count` | SDD top-level KPI 納入 snapshot nesting |
| teacher `student_count` | `summary.active_student_count` | 對應目前 dashboard 的期間內活躍學生；名冊總數另為 `summary.roster_student_count` |
| teacher `attention_count` | `summary.attention_count` | 欄位語意不變，只移入 snapshot summary |
| teacher `learning_gaps[]` | `topics[]` | 簡化 gap 清單擴充成完整 topic snapshot |
| teacher `learning_gaps[].topic` | `topics[].title` | `topics[].topic` 另保留穩定 enum key |
| teacher `learning_gaps[].count` | `topics[].gap_count` | 只計實際 learning-gap 紀錄 |
| government `event_count` | `totals.event_count` | SDD top-level KPI 納入 snapshot totals |
| government `resource_need_count` | `totals.resource_need_count` | 同上 |
| government `potential_need_count` | `totals.potential_need_count` | 同上 |
| government `resource_topics[]` | `topics[]` | 簡化 topic share 擴充成完整 aggregate snapshot |
| government `resource_topics[].topic` | `topics[].label` | `topics[].topic` 另保留穩定 enum key |
| government `resource_topics[].percentage` | `topics[].percentage` | 語意不變 |
| government `agent_insights[]` | `agent_insights[]` | 保留陣列位置，項目擴充 recommendation/trend 欄位 |
| government `agent_insights[].title` | `agent_insights[].title` | 位置與語意不變 |
| government `agent_insights[].description` | `agent_insights[].description` | 位置與語意不變；本契約另有 recommendation/trend 欄位 |
| conversations raw array | `ConversationListWire.items` | 統一所有 list envelope，並容納 `next_cursor` |

`POST /api/v1/chat` 只提供 route compatibility：它與 `/agent/chat` 共用並回傳本契約的 canonical request/response shape，不模擬舊 SDD chat response shape。若 consumer 依賴舊欄位，必須由 typed adapter 按上表轉換；不得把 alias 描述成完整舊 wire compatibility，也不得另建造成 schema drift 的 pipeline。

## 2. 現有 route / page 盤點與最低接線方案

### 2.1 Route 對照

| Route（alias 共用同一 page） | 現況資料與操作 | 最低 API 接線 | Page 使用的 view model | 留在本機的狀態 |
| --- | --- | --- | --- | --- |
| `/`、`/index.html`、`/chat` | `StudentHomePage`：`chatHistory`、硬編 profile；首頁自由輸入、圖片檔名、歷史搜尋/開啟/刪除、profile 編輯 | 啟動先取 session、usage；歷史用 conversations；profile 用 GET/PUT；圖片先 upload；首頁送 `mode:auto` 到 Agent，再依 primary response 使用既有 learning/resource 呈現 | `SessionView`、`UsageView`、`ConversationSummaryView[]`、`ProfileView`、`AgentChatView` | 輸入 draft、drawer/modal、歷史搜尋字串、profile edit draft；不可把儲存成功留在 React state |
| `/learning-chat.html`、`/chat/learning` | `learningScenarios.ts` 關鍵字回答、material chunks、教材庫、來源 modal、practice、follow-up；`ScienceSimulation` 六種動畫 | 首題及追問用 Agent（`mode:learning`，可帶 `topic`）；教材庫用 learning materials；歷史重播用 conversation detail；照片先 upload | `LearningScenarioView`、`SourceView[]`、`ConversationDetailView` | subject 顯示字、動畫控制、practice 選擇/揭答、教材庫搜尋、modal、scroll state |
| `/resource-chat.html`、`/chat/resource` | `resourceScenarios.ts` 六情境、650ms 假回覆、checklist、來源 modal、memory suggestion、圖片僅檔名 | 首題/追問用 Agent（`mode:resource`，可帶 `category` 與 conversation id）；來源取回應；同意 memory 才 POST；圖片先 upload | `ResourceRecommendationView`、`MemorySuggestionView`、`SourceView[]`、`AgentChatView` | checklist 勾選、modal、draft；按「不用」只關閉建議，不寫 memory；不可再顯示「不會上傳」假流程 |
| `/resources.html`、`/resources` | `resourceCategories`、`recommendedResources`、`resourceDetails`；分類/推薦搜尋、推薦詳情、另一份 history drawer | 六分類/視覺可靜態；推薦與詳情用 resources；兩份 history drawer 都用同一 conversations source，以 conversation id/open target 決定頁面，不以標題 regex 猜 | `ResourceProgramView[]`、`ConversationSummaryView[]` | 搜尋、modal、分類視覺；小型完整清單在 client filter |
| `/alerts.html`、`/alerts` | `alertItems`；全部/重要/系統 tab、已讀、詳情、session-only 移除/還原 | list 與 read API；bell 未讀點由同一 alert list/query cache；destination 由 typed relation 轉 internal route | `AlertView[]` | tab、detail modal、當次頁面 dismissed set 可保留；「移除」不是 backend delete，reload 會回來，UI 不可宣稱已永久刪除 |
| `/?panel=profile`（目前沒有獨立 `/profile` route） | 首頁 bottom drawer；暱稱/年級/地區/家庭工作 | GET/PUT profile；memory 顯示/刪除亦用 API。可日後加 `/profile` route，但不是接線前置條件 | `ProfileView`、`MemoryItemView[]` | edit/cancel draft 與 drawer state |
| `/teacher.html`、`/teacher` | `teacherDashboard.ts` 42 人 deterministic events；總覽、學生管理、學習洞察、資源協助、設定；班級/科目/期間、名冊/學生 modal、圖表、CSV、複習計畫 | teacher dashboard snapshot 支援全部資料分頁；server 驗證 teacher scope。CSV 在前端由 snapshot 組裝 | `TeacherDashboardView` | 搜尋/狀態 filter、active tab、ECharts options、teacher preferences、review plans；後兩者明確 localStorage-only |
| `/government.html`、`/government` | `governmentDashboard.ts` 180 天×六區×六主題 fixture；總覽、教育需求、資源使用、地區、趨勢、設定；CSV、detail、追蹤 | government aggregate snapshot；period/region/topic filters；每次重新 fetch persisted Insight aggregate，不能再呼叫靜態 generator 當最新資料 | `GovernmentDashboardView` | active tab、chart options、CSV 組裝、preferences 與 tracking；後兩者明確 localStorage-only |
| `*` | redirect `/` | 無 | 無 | router 行為 |

### 2.2 Shell 與共用 UI

- `StudentShell` 的 nav、avatar、logo 與靜態 layout 不需 API；通知紅點改由 `AlertListView.unreadCount > 0`，不可永久硬編。
- `DashboardShell` 的 tab/role links 是 UI 導覽。切換 role 不得只相信 route；每個 protected endpoint 仍檢查 server session role。前端切換角色時需使用對應 server-configured Demo access code 取得新 session，不能在 client 改 `role`。
- Teacher 的 owner display name 可被 local preference 覆寫；授權學校/班級 scope 來自 session/dashboard，不能由 preference 擴權。
- `ResourcesPage` 與 `StudentHomePage` 目前各自實作 history drawer；接線後可保留兩個元件外觀，但資料、open、delete 必須共用 conversations client/cache。

## 3. 命名、時間、optional / nullable 規則

- 以下 schema 是 JSON wire schema；所有 object 未列出的欄位一律拒絕或忽略策略須由 Pydantic 統一，建議 `extra="forbid"` 用於 mutation/request。
- `field?: T` 表示 request 可不送；`field: T | null` 表示 response 一定有 key，但值可能為 `null`。
- 時間皆為 ISO 8601 UTC 字串（例如 `2026-09-05T06:30:00Z`）；純日期為 `YYYY-MM-DD`。
- count 是大於等於 0 的 integer；百分比是 `0..100` number。陣列無資料回 `[]`，不得回 `null`。
- ID 是 server-issued opaque string。前端不得從 ID 猜 path、owner 或資料種類。

```ts
type RoleWire = "student" | "teacher" | "government";
type RuntimeModeWire = "live" | "offline_demo";
type ChatModeWire = "auto" | "learning" | "resource";
type ResponseTypeWire =
  | "text"
  | "learning_answer"
  | "resource_recommendation"
  | "memory_suggestion"
  | "alert";
type InsightTypeWire =
  | "learning_gap"
  | "resource_need"
  | "resource_interest"
  | "casual";
type EligibilityStatusWire =
  | "eligible"
  | "possibly_eligible"
  | "needs_confirmation"
  | "not_eligible";
type ResourceCategoryWire =
  | "disaster"
  | "agriculture"
  | "education"
  | "economy"
  | "health"
  | "other";
type LearningTopicWire =
  | "newton"
  | "thermodynamics"
  | "entropy"
  | "equilibrium"
  | "bonding"
  | "reaction-rate";
type LearningSubjectWire = "物理" | "化學";
```

## 4. Auth、session 與 usage 契約

這是最小 Demo session bootstrap，不是正式帳密系統。`offline_demo` 可依三個固定入口角色建立既定 seed 身分的 session，不要求操作者輸入存取碼；`live` 則只接受設定檔／secret 注入的 access code。兩種方式都不能提交任意 `user_id` 或自訂授權 scope。

```ts
interface DemoSessionRequestWire {
  // 恰好提供一種：offline_demo 使用 role，live 使用 access_code。
  role?: "student" | "teacher" | "government";
  access_code?: string; // 1..256；不得寫進 VITE_*、bundle 或文件
}

interface SessionIdentityWire {
  user_id: string;
  role: RoleWire;
  display_name: string;
  scope_label: string | null; // 例如授權學校或政府彙整範圍，僅顯示
}

interface SessionResponseWire {
  access_token: string;
  token_type: "Bearer";
  expires_at: string;
  runtime_mode: RuntimeModeWire;
  session: SessionIdentityWire;
}

interface SessionCheckWire {
  expires_at: string;
  runtime_mode: RuntimeModeWire;
  session: SessionIdentityWire;
}

interface UsageWire {
  period: "day";
  limit: number;
  used: number;       // 已完成並計費/計次的 Agent request
  reserved: number;   // 尚在執行的 Agent request
  remaining: number;  // max(limit - used - reserved, 0)
  reset_at: string;
}
```

Session 規則：

- `POST /auth/demo/session` 交換成功後建立 server-side、opaque Bearer session；token 至多 8 小時有效，session 與 quota ledger 持久存在 SQLite。沒有 refresh endpoint；到期後重新輸入 access code 交換。
- 前端僅把 token 放記憶體並可同步到 `sessionStorage`，關閉 tab 即消失；不可放 localStorage、URL、log，也不可用 `VITE_*` 硬編。access code 不持久化。離線模式收到 401 後重新建立固定角色 session；live 模式回 access gate。
- 除 session exchange 外，下列所有 API 都要求 `Authorization: Bearer <token>`。Role、subject user id、teacher school/classes 與 government aggregate scope只由 server session 決定。
- 每個 server-configured Demo identity 綁定固定 principal/user 與 role；重新登入、換發新 token，或先切換到另一角色再切回，都仍使用原 principal 的同一 quota window，不能重置用量。前端不得送 `X-Role`、role query/body 或其他可選 header 改變身份；role 只取自 server 驗證過的 session。
- Request 中保留 SDD 的 `user_id` 只為 wire 相容；它必須等於 student token subject。不同即回 403 `USER_SCOPE_FORBIDDEN`，不能用它查別人的資料。
- `GET /usage` 與 Agent response 都使用同一 `UsageWire` 定義。

Quota 原子規則：

1. 通過 token、role、body validation、conversation/attachment ownership 後，server 以 SQLite transaction 原子保留 1 次，`reserved += 1`；無餘額回 429 `QUOTA_EXCEEDED`，不呼叫 Agent。
2. Assistant response 與 conversation 成功持久化後，同一 ledger 將 reservation 原子轉成 `used += 1`。`offline_demo` 的成功回答也扣 1 次，因為它仍是一次 Demo Agent 使用。
3. Validation、401/403、quota/rate-limit、server timeout、provider error、明確取消且未產生持久 assistant message時釋放 reservation，不增加 `used`。
4. 若 client 中斷但 server 已完成並持久化回答，該次仍計入 `used`。Client 用同一 `Idempotency-Key` 重試或先讀 conversation detail，不得製造第二次回答。
5. `/chat` alias 與 `/agent/chat` 共用相同 ledger 與 idempotency store，不能規避 quota。quota key 是 server identity + quota window，不是 path、token 字串或 request `user_id`。
6. `Idempotency-Key` 是 Agent POST 必填 header（UUID 或同等高熵值，1..128 chars），server 對同一 subject 保留至少 24 小時。同 key + 同 body 回原結果且不重扣；同 key + 不同 body 回 409 `IDEMPOTENCY_CONFLICT`。
7. Rate limit 與日 quota 分開。Rate limit 超出回 429 `RATE_LIMITED` 與 `Retry-After`；quota 超出回 429 `QUOTA_EXCEEDED` 並在 error `details.usage` 帶 `UsageWire`。

## 5. Agent 與學習/資源 wire schema

```ts
interface SourceWire {
  source_id: string;
  source_type: "curriculum" | "policy";
  title: string;
  publisher: string | null;
  chapter: string | null;
  page: string | null;
  excerpt: string;          // source modal 顯示的實際引用內容
  url: string | null;       // 已驗證的外部來源；沒有就明確 null
  query_hint: string | null;// 無 URL 時可複製的查詢文字
  updated_at: string | null;
}

interface LearningStepWire {
  title: string;
  body: string;
  source_ids: string[];
}

interface LearningPracticeWire {
  question: string;
  options: string[];       // 2..6
  answer_index: number;    // 0-based，必須在 options 範圍內
  explanation: string;
}

interface LearningFollowUpWire {
  question: string;
  title: string | null;
}

interface LearningAnswerWire {
  scenario_id: LearningTopicWire | null;
  animation_topic: LearningTopicWire | null;
  subject: LearningSubjectWire | null;
  title: string;
  subtitle: string | null;
  summary: string;
  formula: string | null;
  formula_note: string | null;
  steps: LearningStepWire[];
  analogy: string | null;
  misconception: string | null;
  source_ids: string[];
  practice: LearningPracticeWire | null;
  follow_ups: LearningFollowUpWire[];
}

interface EligibilityCheckWire {
  status: "matched" | "needs_confirmation";
  text: string;
}

interface ResourceProgramWire {
  program_id: string;
  category: ResourceCategoryWire;
  title: string;
  agency: string;
  summary: string;
  eligibility_status: EligibilityStatusWire | null;
  eligibility_checks: EligibilityCheckWire[];
  reasons: string[];
  missing_conditions: string[];
  application_window: string | null;
  documents: string[];
  deadline: string | null; // YYYY-MM-DD；未知必須 null，不得編造
  next_step: string | null;
  source_note: string | null;
  source_ids: string[];
  sources: SourceWire[];
}

interface MemorySuggestionWire {
  suggestion_id: string;  // server persisted，綁 user/conversation/value/expiry
  key: string;            // server allow-list key，1..64
  value: string;
  display_value: string;
  reason: string | null;
  expires_at: string;
}

interface AlertActionWire {
  kind: "resource" | "conversation" | "learning_topic";
  target_id: string | null;
  label: string;
}

interface AlertWire {
  alert_id: string;
  kind: "critical" | "information" | "learning";
  title: string;
  message: string;
  reason: string;
  created_at: string;
  read_at: string | null;
  action: AlertActionWire | null;
}

interface AgentChatRequestWire {
  user_id: string;
  conversation_id: string | null;
  mode: ChatModeWire;
  message: string;          // trim 後 0..4000；空字串時至少一個 attachment
  attachment_ids: string[]; // 0..3，皆須屬於 token subject
  category?: ResourceCategoryWire;
  topic?: LearningTopicWire;
}

interface AgentChatResponseWire {
  conversation_id: string;
  message_id: string;
  response_type: ResponseTypeWire;
  text: string;
  learning_answer: LearningAnswerWire | null;
  resource_recommendation: ResourceProgramWire | null;
  memory_suggestion: MemorySuggestionWire | null;
  alert: AlertWire | null;
  sources: SourceWire[];
  suggested_follow_ups: string[];
  created_at: string;
  demo: boolean; // true 僅表示此回答由明確 offline_demo pipeline 產生
  usage: UsageWire;
}
```

Validation / render invariants：

- `category` 僅可搭配 `mode:resource|auto`；`topic` 僅可搭配 `mode:learning|auto`；兩者不可同時提供。`mode:learning` 不可帶 category，`mode:resource` 不可帶 topic。
- `message.trim()` 與 `attachment_ids` 不可同時為空。Conversation 非 null 時必須屬於 subject，且延續 mode/category/topic 必須相容；否則 409 `CONVERSATION_MODE_CONFLICT`。
- Primary `response_type` 對應的 payload 必須非 null，其他 primary payload 為 null；但 resource/learning 回覆可同時帶一個 `memory_suggestion`。一般 `text` 只保留 `text`、sources/follow-ups（若有）。
- `LearningStepWire.source_ids`、`LearningAnswerWire.source_ids` 與 `ResourceProgramWire.source_ids` 中每個 id 都必須存在同一 response 的 `sources`（resource 內亦帶完整 sources），讓 modal 不必猜或讀本機 fixture。
- `scenario_id`/`animation_topic` 是既有六種 UI 動畫的選擇 key。若真實回答沒有可靠對應，回 null，UI 不顯示錯誤動畫；動畫本身仍完全本機。
- Practice 題目/答案是 API 回傳的教學內容；使用者選項、揭答與重播是 UI local state，本契約不新增練習提交 API。
- Eligibility 的 embedding 僅能選候選/排序。沒有正式規則證據時不得回 `eligible`；用 `possibly_eligible` 或 `needs_confirmation` 並列出 missing conditions。
- `demo:false` 只代表 live pipeline，不保證政策仍有效；deadline/source 仍需如實 nullable。`demo:true` 要在聊天 UI 顯示「離線示範」標示。

Initial query／重播去重規則：

- Learning/resource route 的初始 `q` 每次使用者動作只能送一次 Agent。submission id 與 `Idempotency-Key` 必須在動作建立時固定，React StrictMode effect 重跑仍重用同一 key，並從共用 mutation registry/query cache 取得同一個 in-flight promise（或等價 single-flight）；不得因 mount/effect 重跑另送 request。
- 若前一頁已完成或已啟動 Agent request，navigation 要攜帶 submission id 並讓目的頁從 cache/navigation state 取得既有 result 或 in-flight promise；目的頁不得再用 `q` 重送。直接開啟帶 `q` 的 URL 時，也以該次 navigation 的穩定 submission id 執行相同 single-flight 規則。
- History reopen 只能 `GET /conversations/{conversation_id}` 重播已保存 detail/source snapshot；不得呼叫 Agent、不得寫 Insight、不得保留或扣除 quota。

## 6. Profile、memory、conversation、resource、alert、upload schema

```ts
interface MemoryItemWire {
  key: string;
  value: string;
  display_value: string;
  source_conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileWire {
  user_id: string;
  nickname: string;
  grade: number | null;             // 1..12
  region: string | null;            // 0..100
  family_occupation: string | null; // 0..100
  family_type: string | null;
  economic_status: string | null;
  other_identities: string[];
  memories: MemoryItemWire[];
  updated_at: string;
}

interface ProfilePutRequestWire {
  nickname: string;                 // trim 1..40
  grade: number | null;
  region: string | null;
  family_occupation: string | null;
  family_type: string | null;
  economic_status: string | null;
  other_identities: string[];       // each 1..80, max 20
}

interface MemoryConsentRequestWire {
  suggestion_id: string;
  consent: true; // literal true；拒絕時不呼叫 POST
}

interface ConversationSummaryWire {
  conversation_id: string;
  title: string;
  mode: ChatModeWire;
  last_response_type: ResponseTypeWire | null;
  preview: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  demo: boolean;
}

interface ConversationListWire {
  items: ConversationSummaryWire[];
  next_cursor: string | null;
}

interface AttachmentWire {
  attachment_id: string;
  filename: string;
  media_type: "image/jpeg" | "image/png";
  size_bytes: number;
  download_url: string; // /api/v1/uploads/{attachment_id}/content
  owner_user_id: string;
  created_at: string;
}

interface ConversationMessageWire {
  message_id: string;
  role: "user" | "assistant";
  text: string;
  attachment_ids: string[];
  attachments: AttachmentWire[];
  response_type: ResponseTypeWire | null;
  learning_answer: LearningAnswerWire | null;
  resource_recommendation: ResourceProgramWire | null;
  memory_suggestion: MemorySuggestionWire | null;
  alert: AlertWire | null;
  sources: SourceWire[];
  suggested_follow_ups: string[];
  created_at: string;
  demo: boolean;
}

interface ConversationDetailWire {
  conversation_id: string;
  user_id: string;
  title: string;
  mode: ChatModeWire;
  created_at: string;
  updated_at: string;
  demo: boolean;
  messages: ConversationMessageWire[];
}

interface ResourceListWire {
  items: ResourceProgramWire[];
  demo: boolean;
}

interface AlertListWire {
  items: AlertWire[];
  unread_count: number;
  demo: boolean;
}

interface UploadResponseWire extends AttachmentWire {}
```

Conversation replay 必須回傳儲存當下的 structured assistant payload 與 source snapshot；不可只回 `messages.content` 後重新呼叫模型或再檢索，否則來源編號、practice、resource detail 和 Demo 重播會改變。

Upload 規則：每次一個 multipart field `file`，只接受 magic bytes 與 MIME 都是 JPEG/PNG，單檔上限 5 MiB；file picker 使用 `.jpg,.jpeg,.png,image/jpeg,image/png`。檔名只作顯示並去除 path。Response 不得包含 `data/uploads/...` 等 server filesystem path。`download_url` 必須再次驗證 Bearer token 與 owner；teacher/government 不能下載學生圖片。Client 用 `FormData` 時不得手動設定 multipart `Content-Type` boundary。

## 7. Teacher dashboard snapshot

```ts
type TeacherPeriodWire = "7d" | "30d" | "term";
type TeacherClassWire = "all" | "801" | "802" | "803";
type TeacherSubjectWire = "all" | "物理" | "化學";
type StudentLearningStatusWire = "attention" | "steady" | "observing" | "inactive";

interface TeacherFiltersWire {
  period: TeacherPeriodWire;
  class_id: TeacherClassWire;
  subject: TeacherSubjectWire;
  attention_threshold: 50 | 60 | 65 | 70;
}

interface FilterOptionWire { id: string; label: string; }

interface TeacherCountsWire {
  question_count: number;
  active_student_count: number;
  roster_student_count: number;
  attention_count: number;
  practice_count: number;
  correct_count: number;
  gap_count: number;
  animation_completed_count: number;
  animation_observation_count: number;
  accuracy_percentage: number | null;
  animation_completion_percentage: number | null;
}

interface TeacherTopicSummaryWire {
  topic: LearningTopicWire;
  title: string;
  subject: LearningSubjectWire;
  question_count: number;
  practice_count: number;
  correct_count: number;
  gap_count: number;
  student_count: number;
  accuracy_percentage: number | null;
  misconception: string;
  suggested_activity: string;
  suggested_question: string;
  duration_minutes: number;
}

interface StudentTopicSummaryWire {
  topic: LearningTopicWire;
  title: string;
  question_count: number;
  practice_count: number;
  correct_count: number;
  gap_count: number;
  accuracy_percentage: number | null;
}

interface TeacherRosterStudentWire {
  student_id: string;
  name: string;
  class_id: Exclude<TeacherClassWire, "all">;
  class_label: string;
  number: number;
  question_count: number;
  practice_count: number;
  correct_count: number;
  accuracy_percentage: number | null;
  animation_completed_count: number;
  animation_observation_count: number;
  animation_completion_percentage: number | null;
  status: StudentLearningStatusWire;
  needs_attention: boolean;
  main_topic: LearningTopicWire | null;
  topic_summaries: StudentTopicSummaryWire[];
}

interface TeacherTrendPointWire {
  start_date: string;
  end_date: string;
  label: string;
  question_count: number;
  gap_count: number;
}

interface TeacherDashboardWire {
  as_of: string;
  demo: boolean;
  filters: TeacherFiltersWire;
  filter_options: {
    periods: FilterOptionWire[];
    classes: FilterOptionWire[];
    subjects: FilterOptionWire[];
  };
  authorized_scope: {
    school_name: string;
    class_ids: string[];
    label: string;
  };
  summary: TeacherCountsWire;
  previous_summary: TeacherCountsWire;
  topics: TeacherTopicSummaryWire[];
  roster: TeacherRosterStudentWire[];
  trend: TeacherTrendPointWire[];
}
```

- 一個 response 支援總覽、學生管理、學習洞察與資源協助；student search/status、排序與 CSV 在前端對 `roster/topics` 做。設定與 review plans 繼續 localStorage，故不增加 teacher mutation endpoint。
- Server 以 token teacher scope 先限制學校/班級，再套 query filter。即使 request 傳別班 class id，也回 403，不可為方便回傳全校資料。
- Teacher 可看到授權名冊姓名、班級、座號與學習摘要；不得收到家庭 profile、經濟狀況、原始對話、raw message、學生 upload 或資源求助內容。
- 新的成功 learning interaction 若學生在授權 roster，只增加該學生/主題的 `question_count`；primary insight 為 `learning_gap` 時另增加實際 `gap_count`。單純產生聊天或 practice 題目不代表學生已作答，因此不增加 `practice_count` 或 `correct_count`。
- `accuracy_percentage = correct_count / practice_count * 100`（再依 UI 精度顯示）；`practice_count` 只包含有實際、已知作答結果的紀錄。分母為 0 時必須回 `null`，不能以聊天筆數或 gap 推測正確率。
- `animation_completion_percentage = animation_completed_count / animation_observation_count * 100`；兩個 count 只納入有明確動畫觀看結果的 sample，且 completed 不得大於 observation，分母為 0 時回 `null`。目前沒有 animation completion API，所以新聊天不增加任一 animation count；既有 authored seed 值可保留，但其 denominator 也必須隨 snapshot 明確回傳。
- `needs_attention`/`status` 只能依實際 `gap_count`，或在 `practice_count > 0` 時依已知正確率判斷；固定為 `gap_count > 0` 或（`practice_count >= 3` 且正確率低於 threshold）才 attention。沒有已知作答結果時不得製造正確率；有提問但證據不足標為 `observing`，無提問為 `inactive`，其餘為 `steady`。

## 8. Government aggregate snapshot 與 Insight 計數

```ts
type GovernmentPeriodWire = "7d" | "30d" | "quarter";
type GovernmentRegionWire = "all" | "甲仙" | "六龜" | "杉林" | "美濃" | "旗山" | "內門";
type GovernmentTopicWire =
  | "agriculture"
  | "education"
  | "financial"
  | "science"
  | "admission"
  | "health";

interface GovernmentCountsWire {
  event_count: number;
  resource_need_count: number;
  potential_need_count: number;
  resource_view_count: number;
}

interface GovernmentTopicAggregateWire extends GovernmentCountsWire {
  topic: GovernmentTopicWire;
  label: string;
  percentage: number;
  education: boolean;
  previous: GovernmentCountsWire;
}

interface GovernmentRegionAggregateWire extends GovernmentCountsWire {
  region: Exclude<GovernmentRegionWire, "all">;
  label: string;
  previous: GovernmentCountsWire;
}

interface GovernmentTrendPointWire extends GovernmentCountsWire {
  start_date: string;
  end_date: string;
  label: string;
  previous: GovernmentCountsWire;
}

interface GovernmentDailyAggregateWire extends GovernmentCountsWire {
  date: string;
  region: Exclude<GovernmentRegionWire, "all">;
  topic: GovernmentTopicWire;
}

interface GovernmentAgentInsightWire {
  title: string;
  description: string;
  recommendation: string;
  topic: GovernmentTopicWire;
  region: GovernmentRegionWire;
  direction: "up" | "down" | "flat";
  change_percentage: number;
}

interface GovernmentDashboardWire {
  as_of: string;
  demo: boolean;
  filters: {
    period: GovernmentPeriodWire;
    region: GovernmentRegionWire;
    topic: GovernmentTopicWire | null;
  };
  filter_options: {
    periods: FilterOptionWire[];
    regions: FilterOptionWire[];
    topics: FilterOptionWire[];
  };
  window: {
    start_date: string;
    end_date: string;
    previous_start_date: string;
    previous_end_date: string;
    days: number;
  };
  totals: GovernmentCountsWire;
  previous_totals: GovernmentCountsWire;
  topics: GovernmentTopicAggregateWire[];
  regions: GovernmentRegionAggregateWire[];
  trend: GovernmentTrendPointWire[];
  daily_aggregates: GovernmentDailyAggregateWire[];
  agent_insights: GovernmentAgentInsightWire[];
}
```

政府資料硬邊界：

- Payload 只能含日/區域/主題/count/percentage/trend 及由這些 aggregate 衍生的敘述。不得含 `user_id`、student id/name、conversation/message/attachment id、家庭/profile、raw message、逐人或逐對話 event；即使 seed 是虛構資料也不建立這種 endpoint。
- `daily_aggregates` 是固定維度的 aggregate row，供現有 CSV 與細節 modal；不是 raw Insight Event。Government router/service 不 join users、profiles、conversations/messages 或 uploads，只查 aggregate projection。
- 前端 preference 與 tracking 仍是 localStorage，不出現在 server。每次 dashboard fetch 取 persisted Insight aggregate；不得再把 `governmentAggregates` 靜態 generator 當最新結果。

每個成功 Agent message 最多寫一個 primary Insight，並依 server profile 中的 region 與固定 taxonomy 計數：

固定 Demo taxonomy 不新增 API。Resource category 的預設 government topic 為：

| Resource category | Government topic | 限定語意 |
| --- | --- | --- |
| `agriculture` | `agriculture` | 農作、農地、農損；既有分類器會優先於一般災害 |
| `disaster` | `financial` | 非農業的一般安置／住家受損與救助支援 |
| `education` | `education` | 就學補助；若輸入明確是升學資訊，固定改用 `admission` |
| `economy` | `financial` | 生活、急難與經濟支援 |
| `health` | `health` | 醫療、心理與照護 |
| `other` | `financial` | 僅限目前 Demo 的社福／生活支持情境；無足夠語意時應分類 `casual`，不可硬套 topic |

Learning interaction 的教學 gap 固定映射 `science`；明確升學資訊映射 `admission`。Profile region 在 server 先做 Unicode NFKC、trim/移除空白，再將 `高雄市美濃區`、`美濃區` 或 `美濃` 正規化為 `美濃`（其他五區同規則）。只有六個 allow-list region 能進 aggregate；空值、未知或範圍外地區保留為 internal null 並排除 government region/topic aggregates，不得預設到任一區，也不得在 response 暴露原始 region 或其他 profile/PII。

| Primary Insight | Government 當日/區域/主題 row 的變化 | Teacher 變化 |
| --- | --- | --- |
| `learning_gap` | `event_count +1`，通常映射 `science`；不增加 resource counts | 若在 teacher 授權 roster：question +1、gap +1 |
| `resource_need` | `event_count +1`、`resource_need_count +1`；推薦為 `possibly_eligible`/`needs_confirmation` 時再 `potential_need_count +1` | 無；不可把家庭需求送 teacher |
| `resource_interest` | `event_count +1`、`resource_need_count +1`、`resource_view_count +1`；代表這次 Agent interaction 已明確開啟/追問資源，不以頁面 reload 重複計數 | 無 |
| `casual` | `event_count +1`，其餘不變 | 無 |

Insight、user/assistant message 與 quota finalize 必須在可恢復的一致 transaction boundary 完成；dashboard aggregate 可以 query-time group 或交易內 upsert，但重試同一 idempotency key不得重複增加。`resource_view_count <= resource_need_count <= event_count` 與 `potential_need_count <= resource_need_count` 必須保持。新 Insight 持久化後，下一次 teacher/government GET 即反映，不依 process memory。

## 9. `/api/v1` endpoint 表

| Method / path | Request / query | Success | Roles / ownership | 常見錯誤 |
| --- | --- | --- | --- | --- |
| `POST /auth/demo/session` | JSON `DemoSessionRequestWire` | 200 `SessionResponseWire` | public exchange；server code 決定 identity/role | 401 `INVALID_ACCESS_CODE`、429 `RATE_LIMITED` |
| `GET /auth/session` | 無 | 200 `SessionCheckWire` | 任一有效 Bearer，只回自己 | 401 `UNAUTHORIZED`/`SESSION_EXPIRED` |
| `GET /usage` | 無 | 200 `UsageWire` | 任一有效 Bearer，只回該 subject；非 student 可回其 configured limit（通常 0 或不使用） | 401 |
| `POST /agent/chat` | JSON `AgentChatRequestWire`；header `Idempotency-Key` | 200 `AgentChatResponseWire` | student；`user_id`、conversation、attachments 全須屬於 subject | 401/403/404/409/422/429/502/503/504 |
| `POST /chat` | 完全同上 | 完全同上 | 相容 alias，必須進同 service/quota/idempotency | 完全同上 |
| `GET /learning/materials` | 無 query；回有限 Demo curriculum 全清單，搜尋在前端 | 200 `{ items: SourceWire[]; demo: boolean }` | student、teacher；只含 curriculum，無學生資料 | 401/403 |
| `GET /profile/{user_id}` | path user id | 200 `ProfileWire` | student self only | 401、403 `USER_SCOPE_FORBIDDEN`、404 `PROFILE_NOT_FOUND` |
| `PUT /profile/{user_id}` | JSON `ProfilePutRequestWire`（replace editable fields） | 200 `ProfileWire` | student self；表單送出是明確使用者操作 | 401/403/422 |
| `POST /profile/{user_id}/memory` | JSON `MemoryConsentRequestWire` | 201 `MemoryItemWire`；相同 suggestion 已接受則 200 同 item | student self；suggestion 必須屬於自己且未過期 | 403、404 `MEMORY_SUGGESTION_NOT_FOUND`、409 `MEMORY_SUGGESTION_EXPIRED`、422 |
| `DELETE /profile/{user_id}/memory/{key}` | URL-encoded opaque key | 204，無 body；不存在亦可 idempotent 204 | student self | 401/403 |
| `GET /conversations` | `user_id` required；`limit` optional 1..100 default 100；`cursor` optional opaque | 200 `ConversationListWire`；有限 Demo 通常一次全回 | student self；server 仍用 token subject | 401/403/422 |
| `GET /conversations/{conversation_id}` | 無 | 200 `ConversationDetailWire` | student owner only | 401/403/404 `CONVERSATION_NOT_FOUND` |
| `DELETE /conversations/{conversation_id}` | 無 | 204，無 body | student owner only；同步刪除其 messages，不刪 profile memory | 401/403/404 |
| `GET /resources` | `category` optional `ResourceCategoryWire`；`recommended_only` optional boolean default false；不加 search | 200 `ResourceListWire`，無結果 `items:[]` | student；推薦依 authenticated profile | 401/403/422 |
| `GET /resources/{program_id}` | 無 | 200 `ResourceProgramWire` | student；program id 不含 owner | 401/403/404 `RESOURCE_NOT_FOUND` |
| `GET /alerts` | `user_id` required；`unread_only` optional boolean default false；tabs 在前端 | 200 `AlertListWire`，無結果 `items:[]`、`unread_count:0` | student self；matching 用 server profile | 401/403/422 |
| `POST /alerts/{alert_id}/read` | empty JSON body `{}` 或 Content-Length 0，client 統一不送 body | 200 `AlertWire`；重複呼叫回同 read state | student owner only | 401/403/404 `ALERT_NOT_FOUND` |
| `POST /uploads` | multipart/form-data，一個 `file` | 201 `UploadResponseWire` | student；owner 由 token 決定，不接受 user id form field | 401/403/413/415/422 |
| `GET /uploads/{attachment_id}/content` | `Accept: image/*` 可選 | 200 bytes；正確 `Content-Type`、`Content-Length`、private cache header | student owner only | 401/403/404 `ATTACHMENT_NOT_FOUND` |
| `GET /dashboard/teacher` | `period` default `7d`；`class_id` default `all`；`subject` default `all`；`attention_threshold` default 65 | 200 `TeacherDashboardWire` | teacher；先套 server scope | 401/403/422 |
| `GET /dashboard/government` | `period:GovernmentPeriodWire` default `7d`；`region:GovernmentRegionWire` default `all`；`topic?:GovernmentTopicWire` | 200 `GovernmentDashboardWire` | government aggregate-only | 401/403/422 |

Query 不接受 `user_id` 的 endpoint 不應為了 UI 方便新增它。List response 永遠 200 + empty array；只有成功 DELETE 使用 204。204 client 不可呼叫 `response.json()`。

## 10. Wire → view adapter 契約

1. Adapter 只改 naming/小型呈現，不新增事實。未知 deadline 仍是 `null`，不可轉成看似真實日期。
2. 主要欄位固定映射如下；nested object 遞迴採相同規則。

| Wire | View | 備註 |
| --- | --- | --- |
| `conversation_id` | `conversationId` | history open/delete 一律用 ID，不用 title |
| `message_id` | `messageId` | replay key |
| `response_type` | `responseType` | 決定 existing card |
| `learning_answer` | `learningAnswer` | 轉 `LearningScenarioView` |
| `scenario_id` / `animation_topic` | `scenarioId` / `animationTopic` | 只選擇現有動畫 |
| `formula_note` | `formulaNote` | 可 null |
| `source_ids` | `sourceIds` | step/body citation 不變 |
| `answer_index` | `answerIndex` | 仍 0-based |
| `resource_recommendation` | `resourceRecommendation` | primary resource card |
| `program_id` | `programId` | resource identity |
| `eligibility_status` | `eligibilityStatus` | UI label由 enum map，不使用中文字串當邏輯 |
| `missing_conditions` | `missingConditions` | 不丟失待確認資訊 |
| `application_window` | `applicationWindow` | 可 null |
| `memory_suggestion` / `display_value` | `memorySuggestion` / `displayValue` | consent 使用 suggestionId |
| `created_at` / `updated_at` | `createdAt` / `updatedAt` | 分組/格式化在 view layer |
| dashboard `*_count` / `*_percentage` | camelCase 同義欄位 | 不把百分比重新由不同 denominator 計算 |

後續 1.2 至少需提供下列 camelCase view interfaces：

```ts
interface AgentChatView {
  conversationId: string;
  messageId: string;
  responseType: ResponseTypeWire;
  text: string;
  learningAnswer: LearningScenarioView | null;
  resourceRecommendation: ResourceRecommendationView | null;
  memorySuggestion: MemorySuggestionView | null;
  alert: AlertView | null;
  sources: SourceView[];
  suggestedFollowUps: string[];
  createdAt: string;
  demo: boolean;
  usage: UsageView;
}

interface LearningScenarioView {
  scenarioId: LearningTopicWire | null;
  animationTopic: LearningTopicWire | null;
  subject: LearningSubjectWire | null;
  title: string;
  subtitle: string | null;
  summary: string;
  formula: string | null;
  formulaNote: string | null;
  steps: Array<{ title: string; body: string; sourceIds: string[] }>;
  analogy: string | null;
  misconception: string | null;
  sourceIds: string[];
  practice: { question: string; options: string[]; answerIndex: number; explanation: string } | null;
  followUps: Array<{ question: string; title: string | null }>;
}

interface ResourceRecommendationView {
  programId: string;
  category: ResourceCategoryWire;
  title: string;
  agency: string;
  summary: string;
  eligibilityStatus: EligibilityStatusWire | null;
  eligibilityChecks: Array<{ status: "matched" | "needs_confirmation"; text: string }>;
  reasons: string[];
  missingConditions: string[];
  applicationWindow: string | null;
  documents: string[];
  deadline: string | null;
  nextStep: string | null;
  sourceNote: string | null;
  sourceIds: string[];
  sources: SourceView[];
}
```

`Conversation*View`、`ProfileView`、`AlertView`、`TeacherDashboardView`、`GovernmentDashboardView` 與 `UsageView` 應是對對應 Wire schema 的 mechanical camelCase 轉換，不另創第二套 enum。現有 `src/types/index.ts` 的簡化 `LearningAnswer`（step `content`）與實際 learning page 的 step `body` 不一致；1.2 應以本契約的 `body/sourceIds` 為準並讓 adapter 相容 page，不把 backend 改回簡化 SDD 範例。

## 11. Error、header、timeout 與 cancel

```ts
interface FieldErrorWire {
  field: string;
  code: string;
  message: string;
}

interface ApiErrorWire {
  error: {
    code:
      | "VALIDATION_ERROR"
      | "UNAUTHORIZED"
      | "SESSION_EXPIRED"
      | "INVALID_ACCESS_CODE"
      | "FORBIDDEN"
      | "USER_SCOPE_FORBIDDEN"
      | "PROFILE_NOT_FOUND"
      | "CONVERSATION_NOT_FOUND"
      | "CONVERSATION_MODE_CONFLICT"
      | "RESOURCE_NOT_FOUND"
      | "ALERT_NOT_FOUND"
      | "ATTACHMENT_NOT_FOUND"
      | "MEMORY_SUGGESTION_NOT_FOUND"
      | "MEMORY_SUGGESTION_EXPIRED"
      | "UNSUPPORTED_MEDIA_TYPE"
      | "FILE_TOO_LARGE"
      | "UPLOAD_INVALID"
      | "IDEMPOTENCY_CONFLICT"
      | "QUOTA_EXCEEDED"
      | "RATE_LIMITED"
      | "REQUEST_TIMEOUT"
      | "PROVIDER_UNAVAILABLE"
      | "PROVIDER_ERROR"
      | "OFFLINE_DEMO_UNAVAILABLE"
      | "INTERNAL_ERROR";
    message: string;
    request_id: string;
    retryable: boolean;
    runtime_mode: RuntimeModeWire;
    details?: {
      fields?: FieldErrorWire[];
      usage?: UsageWire;
      retry_after_seconds?: number;
    };
  };
}
```

- 所有非 2xx JSON 錯誤都用同一 envelope；FastAPI/Pydantic 422 也必須轉換，不能漏出預設 `detail` shape 或 stack trace。
- 400 只保留語法錯誤；field/business validation 用 422。401 表示 token 無效/過期；403 表示 role 或 ownership；404 使用上列既有 SDD `RESOURCE_NOT_FOUND` 等具體 code；409 是 mode/idempotency conflict；413/415 是 upload；429 區分 quota/rate；502 provider；503 explicit offline scenario unavailable；504 timeout。
- JSON request 設 `Content-Type: application/json`、`Accept: application/json`。GET/DELETE 不送無意義 JSON body。Upload 使用 browser `FormData`，不手動寫 `Content-Type`。Image content response 不是 JSON。
- API client 預設 timeout：一般 JSON GET/PUT/DELETE 15 秒、upload 30 秒、Agent 45 秒，以 `AbortController` 實作。Server Agent deadline 同為 45 秒並回 504 `REQUEST_TIMEOUT`；provider timeout 回相同 code 或 502 `PROVIDER_UNAVAILABLE`，不得回成功 fixture。
- 使用者 cancel 造成前端 `AbortError` 時顯示「已取消」而不是 success/error assistant bubble。若 server 確認取消且尚未 commit，釋放 quota；若 completion 已 commit，保留 conversation/usage，client 以 idempotency key 或 detail 恢復。
- `offline_demo` 只回答 seed 支援的 scenario。支援時回 200 + `demo:true`；不支援時回 503 `OFFLINE_DEMO_UNAVAILABLE`，UI 明說離線示範沒有此情境。`live` provider failure 回 502/504 且 `demo` success 不得出現。

## 12. 可重現 Demo flow

1. 以明確 `offline_demo`（無 provider key）或 `live`（有 server-side key）啟動。`GET /health` 應只回健康狀態與 `runtime_mode`，不回 secret；Swagger 列出上述 routes。
2. 在 `offline_demo` 開啟學生入口，自動以 `{ role: "student" }` 呼叫 `POST /auth/demo/session`；以 response token 呼叫 session、usage。UI 顯示目前是離線示範。`live` 模式才要求輸入 student Demo code。
3. GET profile、conversations、alerts/resources；六分類與 UI labels 正常，有限清單搜尋在 browser。
4. 可先 POST 一張 JPEG/PNG，取得 `attachment_id` 與 authenticated `download_url`；用新的 `Idempotency-Key` POST `/agent/chat`。成功後有 structured answer、完整 sources、`demo` 與一致 usage。
5. 以回傳 conversation id 追問；重載後 list/detail 重播相同 message、practice/resource payload 與 sources。刪 history 後 detail 404，list 不再出現。
6. Resource flow 顯示 `possibly_eligible`/待確認、文件與政府來源；只有按「幫我記住」才 POST suggestion，重載 profile 仍存在；DELETE memory 後消失。
7. Alerts mark-read 重載仍已讀。UI session-only dismiss 重載可再出現，不能宣稱 server delete。
8. 重新以 teacher code exchange，dashboard 只顯示授權 roster/learning summary，五分頁、filters、student detail、CSV 與 local review plan正常；不得看到家庭或 raw chat。
9. 開啟政府入口；離線模式自動建立 government session，live 模式以 government code exchange。六分頁只顯示 aggregate。學生端新增的 persisted primary Insight 在下一次 snapshot 改變對應 count/trend；payload/CSV 不含個人、conversation 或 message 欄位。
10. 驗證 invalid token 401、wrong role/owner 403、quota/rate 429、upload 413/415、provider 502/timeout 504 與 offline unsupported 503；任何錯誤都不顯示為 AI 成功，也不錯扣 quota。

## 13. 後續 task acceptance

### 1.2 共用 client

- 實作上述 wire/view types、recursive snake→camel 明確 adapter（不可無型別通用魔法吞錯）、Bearer/sessionStorage、FormData、204、error envelope、timeout/cancel 與 Agent idempotency。
- 每個 endpoint 有 typed function；頁面仍不在 1.2 修改。`apiRequest` 不可對 multipart 強塞 JSON header，也不可對 204 呼叫 JSON parser。

### Task 2 Backend Core

- Schema/seed 必須涵蓋現有六 learning topics、教材 source chunks、六 resource categories、三 alerts、至少既定 seed 量、42 人/3 班或足以支援所有 teacher tabs 的授權 snapshot、六區/六 government topics aggregate。
- 先完成 auth hook 可被 Task 4 強化，但從第一個 route 起不可相信任意 `user_id`。Conversation detail 儲存 structured payload/source snapshot；uploads 僅 JPEG/PNG 且 owner download path。
- Core APIs（profile/memory/history/resources/materials/alerts/upload/dashboard）與 Agent router 分開；government query path 必須只依 Insight aggregate projection。

### Task 3 Agent / UI

- Agent 使用集中式 LLM/embedding clients，主要 route `/agent/chat`；alias 共用完整 pipeline。Offline fixture 是明確 mode，不是 provider fallback。
- Page 接線覆蓋本文件第 2 節全部 route/action；保留動畫、source modal、rich learning/resource cards、follow-up、practice、六分類及完整 dashboards，不退化成純 Markdown 或 SDD 簡化首頁。
- 新 primary Insight 與 history/usage 可重播、可持久，teacher/government snapshot 真正反映新資料。

### Task 4 Security / quota

- 完成 server-configured access exchange、opaque session lifecycle、role/scope、ownership、CORS、input/upload limits、persistent atomic usage reservation/finalize/refund、rate limit 與 idempotency；實際驗證 alias 不可繞 quota。
- Secret 只在 server environment；Vite build、repo、logs、response、download URL 不含 key/token/server path。

### Task 5 Integration

- 以第 12 節跑 API + browser + restart persistence。明確分開「offline Demo 已驗證」與「live provider 已驗證」；沒有 key 不宣稱 live calls 或 embedding 通過。

## 14. 本契約刻意不做

- 不建立正式註冊/密碼/refresh-token/企業 IAM。
- 不建立 event streaming、WebSocket/SSE、queue、microservice、GIS、crawler、正式 eligibility rule engine 或新 dashboard mutation service。
- 不新增 server search/export、practice submission、teacher review-plan 或 government tracking API；現有有限資料與 UI-only state 足以支援 Demo。
- 不把政府 aggregate 為了 drill-down 改成個人/對話資料；不讓 teacher 因方便取得家庭 profile。
