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

## 驗證

```bash
npm run typecheck
npm run build
```

若本機已安裝 Playwright Chromium，也可在 dev server 啟動後執行：

```bash
npm run test:visual
npm run test:interactions
```

API 預設使用 `VITE_API_URL=http://localhost:8000/api/v1`，可從 `.env.example` 複製設定。
