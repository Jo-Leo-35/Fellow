# 素材清單與替換位置

所有產品素材放在 `public/assets/`，HTML／React 中使用 `/assets/<filename>` 引用。

| 檔案 | 用途 | 狀態／替換說明 |
|---|---|---|
| `mascot-home-v2.png` | 首頁大型學伴角色 | imagegen 產生，1254×1254、透明背景；目前正式使用 |
| `mascot-home.png` | 第一版站姿學伴 | imagegen 產生，保留作備選，不覆寫 |
| `logo-sprout.svg` | 芽苗品牌符號 | 可描邊 SVG；目前 Header 以同風格 Lucide Sprout 呈現，可直接替換 Brand 元件 |
| `bot-mini.svg` | 回答卡小型 Agent 圖示 | 可描邊 SVG；各回答卡目前以 Lucide/CSS 實作，可直接換成此檔 |
| `plant-resource.svg` | 農業資源插圖 | 靜態 SVG；資源卡也有本地 CSS/Lucide 版本 |
| `region-kaohsiung.svg` | 政府版區域需求示意 | 靜態 SVG、非 GIS；只呈現匿名彙整熱度 |
| `reference-teacher-avatar.png` | 教師工作台側欄頭像 | 從指定參考稿提取、清理，316×320 RGBA |
| `reference-region-map.png` | 政府工作台地區分析插畫 | 從指定參考稿提取、清理，640×479 RGBA；裝飾性區域概念圖，件數依鄰近統計呈現 |
| `reference-insight-bulb.png` | 政府工作台洞察提示 | 從指定參考稿提取、清理，137×160 RGBA |

依使用者要求，沿用原始 `ChatGPT Image Sep 4, 2026 at 09_50_44 PM.png` 中的教師角色、區域配色插畫與燈泡。以內建 imagegen 的 `background-extraction` 編輯模式分離並放大原稿元素，再將純洋紅背景透過技能提供的 `remove_chroma_key.py` 轉為 alpha；以 Canvas 移除透明留白並縮至產品所需尺寸。這些是經影像模型清理的衍生素材，並非原圖像素的無損裁切。原圖保持不變，未使用 CLI 圖像模型。

三個 PNG 已檢查 alpha 與四角透明度，並在瀏覽器檢查顯示。最終提示詞記錄於 [docs/reference-asset-prompts.md](docs/reference-asset-prompts.md)。

一般導航、分類、狀態與 KPI 圖示統一使用 Lucide 描邊圖示，因此可直接以 `currentColor` 換色，不需要另存點陣素材。
