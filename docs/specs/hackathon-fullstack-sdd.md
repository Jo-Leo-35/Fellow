# 偏鄉學習與家庭資源輔助 Agent
# Hackathon Full-stack Software Design Document

---

# 偏鄉學習與家庭資源輔助 Agent
# Frontend Software Design Document

**Version:** v0.1  
**Target:** Hackathon MVP  
**Architecture:** Frontend / Backend Separation  
**Platform:** Mobile-first Web Application

---

## 1. Frontend Goal

前端主要負責呈現偏鄉學習與家庭資源輔助 Agent 的使用體驗。

系統包含三種主要使用介面：

1. **Student**
   - 學習問答
   - 政府資源查詢
   - 個人化資源推薦
   - 主動通知
   - 個人資料管理

2. **Teacher**
   - 查看學生學習狀況
   - 查看常見知識缺口
   - 查看需要關注的學生或主題

3. **Government**
   - 查看匿名化需求統計
   - 查看區域需求趨勢
   - 查看政策與資源需求訊號

Hackathon 階段不建立三套 Frontend。

所有使用者介面存在同一個 React Application 中，透過 Route 與 Demo Mode 切換。

---

## 2. Frontend Technology Stack

| Category | Technology |
|---|---|
| Framework | React |
| Language | TypeScript |
| Build Tool | Vite |
| UI Framework | Chakra UI |
| Routing | React Router |
| Server State | TanStack Query |
| Form | React Hook Form |
| Validation | Zod |
| Chart | Apache ECharts |
| Icons | Lucide React |
| HTTP Client | Fetch API or Axios |

不使用：

- Next.js
- Tailwind CSS
- Redux
- SSR
- Micro Frontend
- 複雜 State Machine

---

## 3. Frontend Architecture

```text
Browser
   │
   ▼
React Application
   │
   ├── Student UI
   │
   ├── Teacher Dashboard
   │
   └── Government Dashboard
   │
   ▼
REST API
   │
   ▼
FastAPI Backend
```

Frontend 預設：

```text
http://localhost:5173
```

Backend API 預設：

```text
http://localhost:8000/api/v1
```

---

## 4. Route Design

```text
/
├── /chat
├── /resources
├── /alerts
├── /profile
├── /teacher
└── /government
```

Hackathon 可以額外提供 Demo Role Switch：

```text
Demo Mode

[學生]
[教師]
[政府]
```

方便評審快速切換不同角色。

---

## 5. Global Layout

### 5.1 Student Layout

學生端採 Mobile First。

主要結構：

```text
Header

Main Content

Bottom Navigation
```

Bottom Navigation：

```text
聊天
資源
通知
我的
```

### 5.2 Header

包含：

- Logo / 學伴
- Notification Icon
- Menu / Hamburger

Hamburger 點擊後開啟 Drawer。

---

## 6. Chat History Drawer

首頁不直接顯示大型「最近問過」Card。

避免：

- 首頁資訊過多
- 看起來有太多可點擊區域
- 與主要行動產生競爭

改成 Hamburger Menu 中的：

```text
聊天紀錄
```

Drawer Layout：

```text
聊天紀錄

[搜尋聊天紀錄]

今天
3/4 ÷ 1/2 怎麼算？

本週
農作物受損有什麼補助？
家裡有災害應該怎麼辦？
申請助學金需要什麼文件？

本月
弱勢家庭有哪些生活補助？
農業貸款條件是什麼？
```

支援：

- Search
- Open Conversation
- Delete History
- Close Drawer

---

## 7. Student Home / Chat

Route:

```text
/chat
```

首頁主要目的：

> 讓學生快速開始一次新的提問。

畫面應保持簡單。

Layout：

```text
Logo

Agent Mascot

嗨！
今天有什麼想問的？

我可以幫你解答功課問題，
也可以幫你找到適合的政府資源。

[問功課]
[找資源]

[你可以直接問我問題... 📷 ➤]

Bottom Navigation
```

首頁不顯示大型聊天歷史列表。

聊天歷史放入 Drawer。

---

## 8. Quick Actions

首頁提供兩個主要入口。

### 8.1 問功課

```text
📚 問功課
數學、國文、英文...
```

點擊後：

```text
/chat?mode=learning
```

### 8.2 找資源

```text
🏠 找資源
補助、就學、生活...
```

點擊後：

```text
/resources
```

---

## 9. Chat Input

Chat Input 支援：

- Text Input
- Image Upload
- Submit
- Loading
- Disabled State

例如：

```text
┌────────────────────────────┐
│ 你可以直接問我問題...  📷 ➤ │
└────────────────────────────┘
```

支援圖片問題：

```text
數學題目照片
教材照片
政策公告照片
```

Hackathon MVP 可先完成圖片上傳 UI，不一定要實作完整 OCR。

---

## 10. Chat Response Types

Frontend 不將所有 Agent Response Render 成純 Markdown。

Backend Response 必須提供：

```text
response_type
```

Frontend 根據 `response_type` 選擇不同 Component。

```typescript
type ResponseType =
  | "text"
  | "learning_answer"
  | "resource_recommendation"
  | "memory_suggestion"
  | "alert";
```

---

## 11. Normal Text Response

Component：

```text
AgentMessage
```

適用於：

- 一般說明
- Follow-up
- 簡單問答

---

## 12. Learning Answer

Component：

```text
LearningAnswerCard
```

例如：

```text
📐 分數除法

我們一步一步來 👇

3/4 ÷ 1/2

第一步
除以一個分數，
可以改成乘上它的倒數。

3/4 × 2/1

第二步
分子乘分子，
分母乘分母。

= 6/4
= 3/2

[我想試試]
[再解釋一次]
```

Type：

```typescript
interface LearningAnswer {
  title: string;

  explanation?: string;

  steps: {
    title: string;
    content: string;
  }[];

  answer?: string;

  knowledgePoint?: string;

  actions?: {
    label: string;
    action: string;
  }[];
}
```

---

## 13. Resource Recommendation

Component：

```text
ResourceRecommendationCard
```

例如：

```text
我找到一個可能適合你們的資源

農業天然災害救助

🟡 可能符合

為什麼？

✓ 家裡有從事農業
✓ 遇到颱風造成農作物損失
? 需要確認所在地是否為公告區域

缺少條件

! 需要在災害後指定期限內完成通報

[查看需要什麼資料]
[查看政府來源]
```

Type：

```typescript
interface ResourceRecommendation {
  programId: string;

  title: string;

  status:
    | "eligible"
    | "possibly_eligible"
    | "needs_confirmation"
    | "not_eligible";

  reasons: string[];

  missingConditions: string[];

  agency?: string;

  deadline?: string;

  sourceUrl?: string;
}
```

---

## 14. Resource Page

Route:

```text
/resources
```

Resource Page 必須清楚區分兩種功能：

1. 快速分類提問
2. 為你推薦的資源

避免兩個區塊看起來都是同樣的按鈕。

---

## 15. Quick Resource Categories

第一區名稱：

```text
快速分類提問
```

說明：

```text
如果你知道大概遇到什麼問題，
可以從這裡開始。
```

Categories：

```text
災害
農業
就學
經濟
健康
其他
```

這些項目是：

> 「開始查詢的入口」

而不是推薦結果。

點擊：

```text
農業
```

跳轉：

```text
/chat?mode=resource&category=agriculture
```

---

## 16. Personalized Recommendations

第二區名稱：

```text
為你推薦的資源
```

說明：

```text
根據你的地區與家庭情況，
這些資源可能適合你。
```

例如：

```text
農業天然災害救助
農業部
可能符合

弱勢家庭兒少生活扶助
衛生福利部
可能符合

就學貸款
教育部
符合條件
```

這些項目是：

> Agent 已經根據 Profile 主動篩選出的結果。

與上方「快速分類提問」具有不同意義。

---

## 17. Resource Page UX Rule

必須讓使用者理解：

```text
快速分類提問
=
我知道自己想找哪一類資源

為你推薦
=
系統已經幫我找了一些可能適合我的資源
```

兩個區塊需要：

- 不同標題
- 不同描述
- 不同 Card Layout
- 不同 Icon Style

避免視覺上像兩組重複 Button。

---

## 18. Memory Suggestion

Agent 不允許直接將對話內容自動寫入 Profile。

例如使用者說：

```text
我阿公是種香蕉的。
```

Frontend 顯示：

```text
要讓我記得「家裡從事農業」嗎？

這樣以後有農業相關補助，
我可以更快提醒你。

[幫我記住]
[不用]
```

Component：

```text
MemorySuggestionCard
```

Type：

```typescript
interface MemorySuggestion {
  key: string;
  value: string;
  displayValue: string;
  reason?: string;
}
```

只有點擊：

```text
幫我記住
```

Frontend 才呼叫 Memory API。

---

## 19. Alert Page

Route：

```text
/alerts
```

Tabs：

```text
全部
重要
系統
```

Alert Type：

```text
Critical
Information
Learning
```

例如：

```text
⚠️ 重要提醒

你所在的地區有新的
農業天然災害救助公告。

為什麼提醒你？

因為你的家庭資料中有
「從事農業」。

[查看詳情]
[我知道了]
```

所有個人化通知都應回答：

> 為什麼我會收到這個通知？

---

## 20. Profile Page

Route：

```text
/profile
```

頁面名稱：

```text
關於我
```

不要使用：

```text
AI Memory
```

基本欄位：

```text
暱稱
年級
地區
家庭工作
```

Hackathon 可選欄位：

```text
家庭類型
經濟狀況
其他身份
```

支援：

```text
查看
編輯
刪除
```

敏感資料區：

```text
🔒 私密資料

這些資料只會在你同意的情況下，
用來幫你尋找比較適合的資源。
```

---

## 21. Teacher Dashboard

Route：

```text
/teacher
```

Desktop First。

Sidebar：

```text
總覽
學生管理
學習洞察
資源協助
設定
```

Hackathon 主要完成：

```text
總覽
```

---

## 22. Teacher KPI

顯示：

```text
128
提問數

42
學生數

18
需協助
```

Component：

```text
MetricCard
```

---

## 23. Learning Gap Chart

顯示：

```text
最常遇到的學習困難

分數      42
百分率    31
圓面積    18
應用題    12
比例       9
```

使用：

```text
ECharts Horizontal Bar Chart
```

---

## 24. Student Attention

顯示需要注意的學習訊號。

例如：

```text
小明
近 7 天提問 12 次

小華
近期錯誤增加

小花
數學答題正確率下降
```

Hackathon 階段只做 Demo Data。

---

## 25. Government Dashboard

Route：

```text
/government
```

這是產品 Pitch 最重要的畫面之一。

Sidebar：

```text
總覽
教育需求
資源使用
地區分析
趨勢洞察
設定
```

Hackathon 主要完成：

```text
總覽
```

---

## 26. Government KPI

顯示：

```text
1,284
互動事件

328
資源需求

87
潛在需求
```

---

## 27. Resource Need Ranking

例如：

```text
熱門需求主題

農業災損      37%
就學補助      28%
經濟支援      19%
升學資訊      16%
健康照護       9%
```

---

## 28. Region Insight

顯示區域需求熱度。

Hackathon 可以：

1. 使用簡化地圖
2. 使用靜態 SVG
3. 使用區域 Ranking

不需要建立真正 GIS 系統。

---

## 29. Agent Insight

Component：

```text
AgentInsightCard
```

例如：

```text
💡 Agent 發現的潛在需求

近期某區域農損相關詢問明顯增加。

建議：
確認是否需要增加相關補助資訊曝光。

[查看趨勢]
```

---

## 30. Government Privacy Rule

Government Dashboard 不允許顯示：

```text
學生姓名
完整對話
家庭姓名
詳細個資
```

只能顯示：

```text
Insight Event
Aggregation
Region
Topic
Count
Trend
```

---

## 31. Chakra UI Design System

主要品牌色：

```text
Teal
```

Color：

```text
Primary Teal
#12B7A7

Dark Teal
#08796F

Navy
#14324A

Background
#F5FAFC

Card
#FFFFFF

Learning Blue
#3B8EF3

Warning Orange
#F6A63C

Critical Red
#EF5753

Success Green
#37B876
```

---

## 32. Component Style

Card：

```text
background: white
border-radius: 16px
soft shadow
light border
```

Button：

```text
border-radius: 10px - 14px
```

主要 CTA：

```text
Teal Background
White Text
```

---

## 33. Responsive Design

Student：

```text
Mobile First
```

Teacher：

```text
Desktop First
```

Government：

```text
Desktop First
```

Chakra Breakpoints：

```text
base
sm
md
lg
xl
```

---

## 34. Frontend Folder Structure

```text
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── chat.ts
│   │   ├── profile.ts
│   │   ├── resource.ts
│   │   ├── alerts.ts
│   │   └── dashboard.ts
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInput.tsx
│   │   │   ├── AgentMessage.tsx
│   │   │   ├── LearningAnswerCard.tsx
│   │   │   ├── ResourceRecommendationCard.tsx
│   │   │   └── MemorySuggestionCard.tsx
│   │   │
│   │   ├── resource/
│   │   │   ├── ResourceCategoryGrid.tsx
│   │   │   └── RecommendedResourceList.tsx
│   │   │
│   │   ├── alert/
│   │   │   └── AlertCard.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── TrendChart.tsx
│   │   │   ├── NeedChart.tsx
│   │   │   └── AgentInsightCard.tsx
│   │   │
│   │   └── layout/
│   │       ├── StudentLayout.tsx
│   │       ├── DashboardLayout.tsx
│   │       ├── BottomNavigation.tsx
│   │       └── ChatHistoryDrawer.tsx
│   │
│   ├── pages/
│   │   ├── ChatPage.tsx
│   │   ├── ResourcePage.tsx
│   │   ├── AlertPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── TeacherDashboardPage.tsx
│   │   └── GovernmentDashboardPage.tsx
│   │
│   ├── hooks/
│   ├── types/
│   ├── theme/
│   ├── router/
│   └── App.tsx
│
├── .env
├── package.json
└── vite.config.ts
```

---

## 35. Frontend Environment

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 36. Frontend Definition of Done

Frontend MVP 完成條件：

- [ ] Student Home 完成
- [ ] Chat Input 可使用
- [ ] Chat History Drawer 完成
- [ ] Learning Answer Card 完成
- [ ] Resource Recommendation Card 完成
- [ ] Memory Suggestion Card 完成
- [ ] Resource Category 完成
- [ ] Personalized Recommendation 完成
- [ ] Alert Page 完成
- [ ] Profile Page 完成
- [ ] Teacher Dashboard 完成
- [ ] Government Dashboard 完成
- [ ] API 接線完成
- [ ] Mobile Responsive 完成
- [ ] Loading / Error State 完成

---

## 37. Frontend Development Priority

### P0

1. Chakra UI Theme
2. Router
3. Student Layout
4. Chat Page

### P1

5. Learning Response
6. Resource Response
7. Resource Page

### P2

8. Profile
9. Memory
10. Alert

### P3

11. Teacher Dashboard
12. Government Dashboard

### P4

13. Animation
14. Empty State
15. UI Polish


---

# Backend

# 偏鄉學習與家庭資源輔助 Agent
# Backend Software Design Document

**Version:** v0.1  
**Target:** Hackathon MVP  
**Runtime:** Single Machine  
**Architecture:** Modular Monolith

---

## 1. Backend Goal

Backend 負責：

1. 接收學生問題
2. 判斷問題模式
3. 查詢教材或政策知識庫
4. 呼叫 LLM
5. 產生結構化回答
6. 管理使用者 Profile / Memory
7. 產生 Insight Event
8. 提供 Teacher Dashboard Data
9. 提供 Government Dashboard Data
10. 執行簡單 Alert Matching

Hackathon 階段所有功能集中在單一 FastAPI Application。

---

## 2. Backend Technology Stack

| Category | Technology |
|---|---|
| Language | Python |
| Web Framework | FastAPI |
| Validation | Pydantic |
| ORM | SQLAlchemy |
| Database | SQLite |
| Vector Store | ChromaDB |
| LLM | OpenAI-compatible API |
| Embedding | Embedding API |
| Scheduler | APScheduler |
| File Storage | Local Filesystem |
| API Documentation | OpenAPI / Swagger |

不使用：

- Kubernetes
- Kafka
- RabbitMQ
- Celery
- Redis
- PostgreSQL
- Microservices
- CrewAI
- AutoGen
- LangGraph

---

## 3. Runtime Architecture

```text
Frontend
   │
   │ REST API
   ▼
FastAPI
   │
   ├── Agent Service
   ├── Teaching Service
   ├── Resource Service
   ├── Memory Service
   ├── Insight Service
   └── Alert Service
   │
   ├── SQLite
   ├── ChromaDB
   ├── Local Files
   └── LLM API
```

Backend：

```text
http://localhost:8000
```

Swagger：

```text
http://localhost:8000/docs
```

---

## 4. Backend Module Design

```text
backend/
├── app/
│   ├── main.py
│   │
│   ├── routers/
│   │   ├── chat.py
│   │   ├── profile.py
│   │   ├── resource.py
│   │   ├── alert.py
│   │   └── dashboard.py
│   │
│   ├── services/
│   │   ├── agent.py
│   │   ├── teaching.py
│   │   ├── resource.py
│   │   ├── eligibility.py
│   │   ├── memory.py
│   │   ├── insight.py
│   │   └── alert.py
│   │
│   ├── rag/
│   │   ├── indexer.py
│   │   └── retriever.py
│   │
│   ├── llm/
│   │   └── client.py
│   │
│   ├── db/
│   │   ├── database.py
│   │   └── models.py
│   │
│   └── schemas/
│       ├── chat.py
│       ├── profile.py
│       ├── resource.py
│       ├── alert.py
│       └── dashboard.py
│
├── data/
│   ├── curriculum/
│   ├── policies/
│   ├── alerts/
│   └── uploads/
│
├── chroma/
│
├── scripts/
│   ├── seed.py
│   └── build_index.py
│
├── .env
└── requirements.txt
```

---

## 5. Agent Pipeline

主要流程：

```text
User Message

      ↓

Mode / Intent Routing

      ↓

Load User Profile

      ↓

Retrieve Relevant Knowledge

      ↓

Eligibility / Context Processing

      ↓

LLM Generation

      ↓

Structured Response

      ↓

Insight Extraction

      ↓

Store Event

      ↓

Return Response
```

---

## 6. Chat Mode

Frontend Request 提供：

```text
mode
```

Type：

```python
ChatMode = Literal[
    "auto",
    "learning",
    "resource"
]
```

如果：

```text
learning
```

直接走 Teaching Service。

如果：

```text
resource
```

直接走 Resource Service。

只有：

```text
auto
```

才進行 Intent Detection。

避免每一次請求都浪費額外 LLM Call。

---

## 7. Teaching Service

Teaching Service 負責：

1. 搜尋 Curriculum RAG
2. 取得學生 Grade
3. 建立 Prompt
4. 呼叫 LLM
5. 產生 LearningAnswer
6. 產生 Learning Gap Insight

流程：

```text
Question
   ↓
Profile.grade
   ↓
Curriculum Retrieval
   ↓
LLM
   ↓
Learning Answer
   ↓
Learning Gap
```

---

## 8. Resource Service

Resource Service 負責：

1. 搜尋政策資料
2. 讀取家庭 Profile
3. 執行簡單 Eligibility Match
4. 排序 Resource
5. 呼叫 LLM 解釋
6. 提供來源
7. 建立 Resource Need Insight
8. 視情況產生 Memory Suggestion

---

## 9. Retrieval Augmented Generation

Hackathon 使用兩個 Corpus：

```text
Curriculum
Policy
```

---

## 10. Curriculum Data

```text
data/curriculum/

math/
chinese/
science/
english/
```

文件格式可使用：

```text
Markdown
Text
JSON
```

每份文件需要基本 Metadata：

```json
{
  "subject": "math",
  "grade": 6,
  "knowledge_point": "fraction_division",
  "title": "分數除法"
}
```

---

## 11. Policy Data

```text
data/policies/

agriculture/
education/
welfare/
disaster/
```

Hackathon 建議人工建立：

```text
10 - 30 個政策
```

不需要完整 Crawl 政府網站。

---

## 12. Policy Schema

```json
{
  "id": "agri-disaster-001",

  "title": "農業天然災害救助",

  "category": "agriculture",

  "agency": "農業主管機關",

  "region": "Taiwan",

  "description": "農業天然災害相關救助資訊",

  "eligibility": [
    "實際從事農業生產",
    "位於公告災害地區",
    "符合農作物災損條件"
  ],

  "documents": [
    "身分證明",
    "土地或農業相關資料"
  ],

  "deadline": null,

  "source_url": ""
}
```

---

## 13. Vector Retrieval

Index Pipeline：

```text
Document
   ↓
Chunk
   ↓
Embedding
   ↓
ChromaDB
```

Query：

```text
Question
   ↓
Embedding
   ↓
Vector Search
   ↓
Top K
   ↓
Prompt Context
```

MVP：

```text
Top K = 5
```

---

## 14. LLM Client

所有 LLM 呼叫集中在：

```text
llm/client.py
```

Interface：

```python
class LLMClient:

    async def generate(
        self,
        messages,
        response_schema=None
    ):
        ...

    async def embed(
        self,
        texts
    ):
        ...
```

不要讓每一個 Service 自己直接呼叫 SDK。

---

## 15. Structured Output

LLM 不直接回傳任意 JSON。

Backend 使用 Pydantic 驗證。

例如：

```python
class LearningStep(BaseModel):
    title: str
    content: str


class LearningAnswer(BaseModel):
    title: str
    explanation: str | None
    steps: list[LearningStep]
    answer: str | None
    knowledge_point: str | None
```

---

## 16. Chat API

Endpoint：

```http
POST /api/v1/chat
```

Request：

```json
{
  "user_id": "demo_student_01",

  "conversation_id": null,

  "mode": "auto",

  "message": "阿公的香蕉被颱風吹倒，有補助嗎？",

  "attachment_ids": []
}
```

---

## 17. Chat Response

```json
{
  "conversation_id": "conv_001",

  "message_id": "msg_002",

  "response_type": "resource_recommendation",

  "text": "我找到一個可能適合你們的資源。",

  "resource": {
    "program_id": "agri-disaster-001",

    "title": "農業天然災害救助",

    "status": "possibly_eligible",

    "reasons": [
      "家中從事農業",
      "遇到颱風造成農作物損失"
    ],

    "missing_conditions": [
      "需要確認所在地是否為公告區域"
    ],

    "agency": "農業主管機關",

    "source_url": ""
  },

  "memory_suggestion": {
    "key": "family_occupation",
    "value": "farmer",
    "display_value": "家庭從事農業"
  },

  "sources": []
}
```

---

## 18. Response Type

Frontend / Backend 共用：

```text
text
learning_answer
resource_recommendation
memory_suggestion
alert
```

---

## 19. Eligibility Status

共用 Enum：

```text
eligible
possibly_eligible
needs_confirmation
not_eligible
```

---

## 20. Eligibility Matching

Hackathon 不建立正式 Rule Engine。

使用簡單 Python Rules。

例如：

```python
if profile.family_occupation == "farmer":
    candidate_categories.append("agriculture")
```

再搭配：

```text
Keyword
Embedding Similarity
Profile Feature
```

進行候選 Resource Ranking。

---

## 21. Important Eligibility Rule

Embedding：

```text
只能用來找候選方案與排序。
```

不直接用來判定：

```text
正式符合資格
```

Frontend 應顯示：

```text
可能符合
```

而不是：

```text
一定可以申請
```

---

## 22. Memory Design

Memory 不儲存整段 Conversation。

主要使用：

```text
Structured Profile
```

例如：

```json
{
  "grade": 6,

  "region": "Kaohsiung",

  "family_occupation": "farmer"
}
```

---

## 23. Memory Write Rule

Agent 可以：

```text
Suggest Memory
```

不能：

```text
Auto Save Sensitive Profile
```

流程：

```text
Conversation

   ↓

Agent 發現可能有價值資訊

   ↓

memory_suggestion

   ↓

Frontend 顯示確認

   ↓

User Confirm

   ↓

POST Memory API

   ↓

Database
```

---

## 24. Profile API

Get：

```http
GET /api/v1/profile/{user_id}
```

Update：

```http
PUT /api/v1/profile/{user_id}
```

Memory：

```http
POST /api/v1/profile/{user_id}/memory
```

Delete：

```http
DELETE /api/v1/profile/{user_id}/memory/{key}
```

---

## 25. Conversation History

Endpoint：

```http
GET /api/v1/conversations?user_id=demo_student_01
```

回傳：

```json
[
  {
    "id": "conv_001",
    "title": "3/4 ÷ 1/2 怎麼算？",
    "updated_at": "2026-09-04T10:24:00"
  }
]
```

Conversation Detail：

```http
GET /api/v1/conversations/{conversation_id}
```

Delete：

```http
DELETE /api/v1/conversations/{conversation_id}
```

---

## 26. Database

使用：

```text
SQLite
```

DB：

```text
data/app.db
```

---

## 27. Users Table

```text
users

id
nickname
grade
region
created_at
updated_at
```

---

## 28. Profiles Table

```text
profiles

id
user_id

family_occupation
economic_status
family_type

created_at
updated_at
```

---

## 29. Conversations Table

```text
conversations

id
user_id
title

created_at
updated_at
```

---

## 30. Messages Table

```text
messages

id
conversation_id

role

content

response_type

created_at
```

Role：

```text
user
assistant
```

---

## 31. Insight Events Table

```text
insight_events

id

user_id

region

event_type

topic

confidence

created_at
```

---

## 32. Alert Table

```text
alerts

id

title

category

region

target_feature

content

source

created_at
```

---

## 33. Alert Read Table

```text
alert_reads

id

alert_id

user_id

read_at
```

---

## 34. Insight Engine

Insight Engine 將 Conversation 轉成：

```text
learning_gap
resource_need
resource_interest
casual
```

---

## 35. Learning Insight Example

Input：

```text
這題分數除法真的不會。
```

Event：

```json
{
  "event_type": "learning_gap",

  "topic": "fraction_division",

  "confidence": 0.91
}
```

---

## 36. Resource Insight Example

Input：

```text
我阿公種香蕉，
颱風把香蕉都吹倒了。
```

Event：

```json
{
  "event_type": "resource_need",

  "topic": "agriculture_disaster",

  "confidence": 0.94
}
```

---

## 37. Insight Rule

Hackathon 每次 Message：

```text
最多建立一個 Primary Insight。
```

避免大量重複事件。

---

## 38. Teacher Dashboard API

```http
GET /api/v1/dashboard/teacher
```

Example：

```json
{
  "question_count": 128,

  "student_count": 42,

  "attention_count": 18,

  "learning_gaps": [
    {
      "topic": "分數",
      "count": 42
    },

    {
      "topic": "百分率",
      "count": 31
    },

    {
      "topic": "圓面積",
      "count": 18
    }
  ]
}
```

---

## 39. Government Dashboard API

```http
GET /api/v1/dashboard/government
```

只讀取：

```text
Insight Events
```

不得讀取：

```text
Raw Messages
```

---

## 40. Government Dashboard Response

```json
{
  "event_count": 1284,

  "resource_need_count": 328,

  "potential_need_count": 87,

  "resource_topics": [
    {
      "topic": "農業災損",
      "percentage": 37
    },

    {
      "topic": "就學補助",
      "percentage": 28
    },

    {
      "topic": "經濟支援",
      "percentage": 19
    }
  ],

  "agent_insights": [
    {
      "title": "農損需求增加",

      "description":
        "近期某區域農業災損相關詢問明顯增加。"
    }
  ]
}
```

---

## 41. Alert Engine

Hackathon 不需要真正接完整政府 API。

使用：

```text
data/alerts/
```

Demo Event：

```json
{
  "id": "alert-001",

  "title": "農業天然災害救助公告",

  "category": "agriculture",

  "region": "Kaohsiung",

  "target_feature": "farmer",

  "content": "目前有新的農業天然災害救助資訊。"
}
```

---

## 42. Alert Matching

Rule：

```python
if user.region == alert.region:
    if profile.family_occupation == alert.target_feature:
        matched = True
```

未來再擴充：

```text
Embedding
Policy Rule
Region
Age
Grade
Other Profile
```

---

## 43. Alert API

List：

```http
GET /api/v1/alerts?user_id=demo_student_01
```

Mark Read：

```http
POST /api/v1/alerts/{alert_id}/read
```

---

## 44. File Upload

Endpoint：

```http
POST /api/v1/uploads
```

MVP 支援：

```text
jpg
jpeg
png
```

檔案放：

```text
data/uploads/
```

Response：

```json
{
  "attachment_id": "file_001",

  "filename": "math.jpg"
}
```

Chat Request 再帶：

```json
{
  "attachment_ids": [
    "file_001"
  ]
}
```

---

## 45. Privacy Boundary

Hackathon 最重要的資料邊界：

```text
Raw Conversation
        ≠
Government Insight
```

Raw：

```text
我阿公是種香蕉的，
颱風把農作物吹倒了。
```

Government：

```json
{
  "region": "Kaohsiung",

  "topic": "agriculture_disaster",

  "count": 1
}
```

---

## 46. Government Data Rule

Government API 不回傳：

- user_id
- nickname
- raw message
- conversation_id
- family detail

只回傳：

- Region
- Topic
- Count
- Percentage
- Trend
- Aggregated Insight

---

## 47. CORS

Backend 允許：

```text
http://localhost:5173
```

---

## 48. Backend Environment

```env
APP_ENV=development

DATABASE_URL=sqlite:///./data/app.db

LLM_API_KEY=

LLM_MODEL=

EMBEDDING_MODEL=

CHROMA_PATH=./chroma

FRONTEND_ORIGIN=http://localhost:5173

DEMO_MODE=true
```

---

## 49. Seed Data

一定要建立：

```text
scripts/seed.py
```

Demo User：

```json
{
  "id": "demo_student_01",

  "nickname": "小明",

  "grade": 6,

  "region": "Kaohsiung"
}
```

Profile：

```json
{
  "family_occupation": "farmer"
}
```

---

## 50. Demo Seed Requirements

至少產生：

```text
1 Demo Student

10+ Policies

3+ Alerts

20+ Learning Events

10+ Resource Events

5+ Conversations
```

確保現場 Demo Dashboard 不會是空的。

---

## 51. Shared Enum

Frontend / Backend 必須固定以下名稱。

Chat Mode：

```text
auto
learning
resource
```

Response Type：

```text
text
learning_answer
resource_recommendation
memory_suggestion
alert
```

Insight Type：

```text
learning_gap
resource_need
resource_interest
casual
```

Eligibility Status：

```text
eligible
possibly_eligible
needs_confirmation
not_eligible
```

禁止 Frontend / Backend 自行建立不同名稱。

---

## 52. API Error Format

所有 API Error 使用一致格式：

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",

    "message": "找不到指定資源。"
  }
}
```

---

## 53. Backend Definition of Done

Backend MVP 完成條件：

- [ ] FastAPI 啟動
- [ ] SQLite 初始化
- [ ] Demo User Seed
- [ ] Chat API
- [ ] LLM Client
- [ ] Teaching Flow
- [ ] Curriculum RAG
- [ ] Policy RAG
- [ ] Resource Recommendation
- [ ] Eligibility Basic Rule
- [ ] Profile API
- [ ] Memory Confirmation API
- [ ] Conversation History API
- [ ] Insight Extraction
- [ ] Teacher Dashboard API
- [ ] Government Dashboard API
- [ ] Alert Matching
- [ ] Alert API
- [ ] Swagger 可使用
- [ ] CORS 完成

---

## 54. Backend Development Priority

### P0

1. FastAPI
2. SQLite
3. Pydantic Schema
4. Chat API
5. Demo User

### P1

6. LLM Client
7. Teaching Agent
8. Structured Response

### P2

9. ChromaDB
10. Curriculum RAG
11. Policy RAG

### P3

12. Resource Recommendation
13. Eligibility
14. Memory

### P4

15. Insight
16. Teacher Dashboard
17. Government Dashboard

### P5

18. Alert
19. Upload
20. Demo Polish

