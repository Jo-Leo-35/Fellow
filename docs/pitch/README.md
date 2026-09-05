# Fellow｜安心學習 Demo Pitch

6 頁、16:9、120 秒。視覺採暖白、深藍與青綠，學生、家庭資源、教師及政府頁面以實際產品截圖為主。

- [PowerPoint](Fellow-安心學習-6頁DemoPitch.pptx)：文字、流程、三方關係圖可編輯；已附講者備忘稿。
- [PDF 預覽](Fellow-安心學習-6頁DemoPitch.pdf)：由 PowerPoint 實際渲染，已內嵌中文字體。
- [120 秒講稿與 Demo 分鏡](Fellow-120秒講稿與Demo分鏡.md)：逐頁口播、影片尺寸與替換方法。
- [逐頁預覽](previews/)：1600×900 PNG。

使用者原始的七個段落整合為六頁：保留獨立封面與 Pain Point，政府洞察和結語共用最後一頁。封面與結尾用同一組三方節點呼應，第二頁呈現三個資訊缺口。

Demo 區域目前放置真實產品截圖，已預留 HTML 操作錄影的位置，尚未嵌入影片。家庭頁使用本次新擷取的農業災損情境。教師頁僅呈現現有的學習訊號；經同意的家庭關懷轉介標示為設計方向。政府資料為匿名 Demo 聚合，資源回到家庭為服務目標。

## 重建

`build-deck.mjs` 使用 PptxGenJS 4.0.1；不修改應用程式套件。

```bash
npm install --prefix /tmp/fellow-pptx pptxgenjs@4.0.1
DECK_TOOLS_DIR=/tmp/fellow-pptx node docs/pitch/build-deck.mjs
```

會生成 PPTX、講稿 Markdown 和 `deck-layout.json`。字體使用 Noto Sans CJK TC；PowerPoint 未內嵌字體，PDF 已內嵌。

以 LibreOffice Impress 將 PPTX 另存 PDF，並用 Poppler `pdftoppm -png -scale-to 1600` 產生預覽即可。簡報內圖片全部嵌入，不需要隨附 `assets/` 才能播放。
