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

原始 `ChatGPT Image Sep 4, 2026 at 09_50_44 PM.png` 僅作版面參考，沒有直接裁切進產品，避免背景、壓縮與生成瑕疵被帶入 UI。

一般導航、分類、狀態與 KPI 圖示統一使用 Lucide 描邊圖示，因此可直接以 `currentColor` 換色，不需要另存點陣素材。
