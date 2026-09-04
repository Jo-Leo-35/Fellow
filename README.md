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
```

分類測試涵蓋六類入口、文件與來源視窗、追問、分類切換狀態、路由預設與三種螢幕尺寸；截圖輸出至 `.screenshots/`。首次使用可執行 `npx playwright install --with-deps chromium` 安裝測試瀏覽器及所需系統函式庫。

API 預設使用 `VITE_API_URL=http://localhost:8000/api/v1`，可從 `.env.example` 複製設定。

## Git 版本控制

專案使用 `main` 分支；第一筆提交保留既有前端，後續提交加入六分類 Demo。使用 `git log --oneline` 查看版本、`git diff HEAD~1 HEAD` 比較最新改動。建置輸出、相依套件、截圖與環境變數檔已排除追蹤（保留 `.env.example`）。
