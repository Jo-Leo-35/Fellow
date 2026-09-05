# 學伴 Frontend Prototype

依 `frontend-sdd.md` 與參考設計稿完成的 React + TypeScript + Vite 多頁原型。UI 使用 Chakra UI、Lucide 與 Apache ECharts；資料目前為 demo data，HTTP 邊界保留在 `src/api/client.ts`，方便後端 agent 接線。

## 開發

```bash
npm install
npm run dev
```

預設網址為 `http://localhost:5173`。

## 七個 HTML 畫面

| HTML | 畫面 |
|---|---|
| `index.html` | 學生首頁、聊天紀錄 Drawer、關於我資料面板 |
| `learning-chat.html` | 學習輔助回答 |
| `resource-chat.html` | 資源推薦回答 |
| `resources.html` | 資源分類與個人化推薦 |
| `alerts.html` | 主動通知 |
| `teacher.html` | 教師教學洞察 |
| `government.html` | 政府需求洞察 |

## 物理與化學教學動畫

`learning-chat.html` 以「教學動畫」為入口，提供六個抽象概念主題，可以從頁面切換或直接開啟：

| 主題 | 主題連結 |
|---|---|
| 牛頓力學 | `/learning-chat.html?topic=newton` |
| 熱力學 | `/learning-chat.html?topic=thermodynamics` |
| 熵與自發過程 | `/learning-chat.html?topic=entropy` |
| 化學平衡 | `/learning-chat.html?topic=equilibrium` |
| 化學鍵結 | `/learning-chat.html?topic=bonding` |
| 反應速率 | `/learning-chat.html?topic=reaction-rate` |

學生可以播放、暫停與重播教學動畫，調整參數觀察變化，搭配生活類比、概念解釋與理解檢核題。引用可開啟對應的學伴自編教材原文；教材庫支援依概念查找。介面以學習內容與操作為主，不展示原型標記或技術實作說明。

首頁輸入的 `q`、聊天紀錄的 `history` 與學習頁自由輸入都會用於選擇相關主題；超出教材範圍的問題會引導學生選擇有教材依據的問題。圖片內容目前無法讀取，需由學生輸入題目文字。

開發實作：目前以前端本機關鍵字比對檢索自編教材片段，再顯示依據教材撰寫的預設回覆，保留 RAG 的「檢索教材 → 引用解釋 → 檢核理解」流程。尚未接入向量資料庫、即時模型生成、外部 AI、後端或 OCR。教材章節及頁碼為自編內容的整理索引，並非引用外部出版品。

## 教師與政府工作台

- `/teacher.html`：總覽、學生管理、學習洞察、資源協助與設定。班級／科目／期間篩選共用同一組學習事件；學生明細呈現概念理解與教學建議，可開啟對應的物理化學教學動畫，儲存複習安排並追蹤完成狀態。
- `/government.html`：總覽、教育需求、資源使用、地區分析、趨勢洞察與設定。提供高雄六區的期間／地區篩選、主題與區域明細、前期趨勢比較、追蹤清單及 CSV 匯出。
- 兩端共用響應式導覽、手機選單與角色入口，介面採產品文案。指定參考稿的教師頭像、區域插畫與燈泡已經分離去背後使用，詳見 [ASSETS.md](ASSETS.md)。

開發資料：教師使用 `src/data/teacherDashboard.ts` 中原創虛構名冊與固定學習事件，政府使用獨立的 `src/data/governmentDashboard.ts` 匿名彙整資料；基準日為 2026-09-05。政府端沒有姓名、學號或對話內容。指標、排名、明細、趨勢及匯出均從同一份資料推導，每件事件只有一個主要主題，顯示的需求占比合計為 100%。

設定、複習安排與追蹤項目保存在目前瀏覽器的 localStorage；目前沒有跨裝置同步、真實名冊登入或後端資料串接，儲存安排不會寄送訊息。實際整合時需以授權 API 取代各端資料模組，並由後端執行角色權限與政府端匿名彙整。

## 快速分類提問 Demo

從 `resources.html` 點選六個分類，會開啟對應情境。諮詢頁也能直接切換分類：

| 分類 | Demo 連結 | 示範資源 |
|---|---|---|
| 災害 | `/resource-chat.html?category=disaster` | 災害救助與安置協助 |
| 農業 | `/resource-chat.html?category=agriculture` | 農業天然災害救助 |
| 就學 | `/resource-chat.html?category=education` | 就學貸款與助學資源 |
| 經濟 | `/resource-chat.html?category=economy` | 弱勢家庭兒少生活扶助 |
| 健康 | `/resource-chat.html?category=health` | 心理諮詢與醫療協助 |
| 其他 | `/resource-chat.html?category=other` | 社會福利諮詢與轉介 |

每個情境都有推薦原因、待確認條件、可勾選的資料清單、政府來源查詢文字、三個快捷追問與分類回覆。資料集中在 `src/data/resourceScenarios.ts`；共用介面在 `src/pages/ResourceChatPage.tsx`。

直接開啟未帶參數的諮詢頁會保留原農業 Demo；只提供 `q` 時依問題關鍵字選擇情境，無法辨識時進入「其他」。切換情境會清除目前的追問、附件與勾選狀態。記憶同意只保留在當前頁面，照片不會上傳。所有比對及回覆均為前端示範，並未呼叫 AI 或後端。

## 驗證

```bash
npm run typecheck
npm run build
```

若本機已安裝 Playwright Chromium，也可在 dev server 啟動後執行：

```bash
npm run test:visual
npm run test:interactions
npm run test:categories
npm run test:learning
npm run test:dashboards
```

分類測試涵蓋六類入口、文件與來源視窗、追問、分類切換狀態、路由預設與三種螢幕尺寸。工作台測試涵蓋四種螢幕尺寸的所有分頁、篩選、明細、設定、追蹤與 CSV 內容；截圖輸出至 `.screenshots/`。首次使用可執行 `npx playwright install --with-deps chromium` 安裝測試瀏覽器及所需系統函式庫。

API 預設使用 `VITE_API_URL=http://localhost:8000/api/v1`，可從 `.env.example` 複製設定。

## Git 版本控制

專案使用 `main` 分支；第一筆提交保留既有前端，後續提交加入六分類 Demo。使用 `git log --oneline` 查看版本、`git diff HEAD~1 HEAD` 比較最新改動。建置輸出、相依套件、截圖與環境變數檔已排除追蹤（保留 `.env.example`）。
