# 評審請看這

這個資料夾是 Fellow／學伴的評審體驗入口。

## 建議開啟方式

在專案根目錄執行 python3 scripts/local-demo.py start 後，開啟：

- http://localhost:45465/%E8%A9%95%E5%AF%A9%E8%AB%8B%E7%9C%8B%E9%80%99/
- Final Demo：http://localhost:45465/%E8%A9%95%E5%AF%A9%E8%AB%8B%E7%9C%8B%E9%80%99/final-demo.html

直接使用 Vite 開發伺服器時，也可在相同 port 開啟「/評審請看這/」。

## 兩分鐘影片投影片

- [Fellow-兩分鐘-Demo-投影片.html](Fellow-兩分鐘-Demo-投影片.html)：16:9、8 幕、總長 120 秒，含自動播放與逐頁旁白稿。

## 五份文件

- 01 學習問答與互動教學動畫：[HTML](01-學習問答與互動動畫.html)｜[PDF](01-學習問答與互動動畫.pdf)
- 02 個人化公共資源推薦：[HTML](02-公共資源推薦.html)｜[PDF](02-公共資源推薦.pdf)
- 03 主動通知與下一步提醒：[HTML](03-主動通知與下一步提醒.html)｜[PDF](03-主動通知與下一步提醒.pdf)
- 04 教師學習洞察與複習計畫：[HTML](04-教師學習洞察與複習計畫.html)｜[PDF](04-教師學習洞察與複習計畫.pdf)
- 05 政府匿名需求洞察：[HTML](05-政府匿名需求洞察.html)｜[PDF](05-政府匿名需求洞察.pdf)

## 建議體驗順序

1. 從 index.html 閱讀願景與五個功能。
2. 逐份打開 HTML 教學，完成頁內互動與評審任務。
3. 需要離線閱讀時開啟對應 PDF；每份 7 頁。
4. 最後進入 final-demo.html，在同一畫面切換實際產品頁面。

## 目前系統口徑

Agent 為明確標示的 Fake Demo／offline_demo，不呼叫外部 AI provider；其餘前後端 API、SQLite／Chroma、權限、持久化與三角色資料流程已實際串接。政策與教材是原創示範資料；資源推薦不是正式資格核定；政府端只讀匿名 Insight 聚合，不讀取原始學生對話。
