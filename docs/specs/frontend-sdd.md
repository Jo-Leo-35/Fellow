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
