# 前端

| 位置 | 用途 |
| --- | --- |
| `src/` | React 頁面、元件、API client、型別與樣式 |
| `public/assets/` | 字圖素材與產品插畫 |
| `*.html` | 七個學生／教師／政府入口 |
| `vite.config.ts` | 建置根目錄、入口與同源 API 代理 |
| `tsconfig*.json` | TypeScript 專案設定 |
| `dist/` | 自動產生的建置成果，不納入版本控制 |

從專案根目錄執行 `npm run dev`、`npm run build`、`npm run typecheck`。npm 套件與鎖定檔留在根目錄，供前端及驗收腳本共用。

評審文件由 `npm run dev`／`npm run build` 的前置步驟，從 `docs/judges/` 複製至 `public/評審請看這/`；該副本已忽略，請修改原始文件。整合啟動方式見 [根目錄 README](../README.md#安裝與執行)。
