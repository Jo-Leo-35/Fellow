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
