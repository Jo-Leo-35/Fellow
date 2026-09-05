# Task 5 — Integration verification

Agent 採明確標示的 Fake Demo / `offline_demo`，真實外部 provider 未設定、未測，後補。其餘資料流程使用真實 FastAPI、SQLite、Chroma、圖片儲存、session、quota 與 Docker。5.1 → 5.2 已完成。四項實際產品缺陷均修復，後端37/37、六組browser87/87、API client9/9與Docker持久性全部通過；沒有未解的非Agent設定缺陷。

## 環境

2026-09-05，Linux aarch64、Node22.22.2、Python3.12.3、Docker29.3.0 / Compose5.1.1。專屬測試 project `futureai-integration-b63c9d8e757a`，localhost動態port59653，全新且獨立的SQLite / Chroma volumes。既有使用者5173 Vite、4.2 project與pathwise容器未受影響。

Fixture 的三角色存取碼由 CSPRNG 產生，私有env在repo外、權限0600；session使用真正exchange，瀏覽器token只在sessionStorage，不輸出至log/report/URL/localStorage。每案錯誤遮蔽credentials，失敗登入截圖遮住password輸入。

功能套件需大量真Agent請求；只有此 fixture 的學生principal與ledger limit提高至1000、exchange/Agent rate提高至每分鐘1000，used/reserved保留。產品dailyquota20、exchange10/min與Agent30/min均未修改；真低限額、429、競爭扣次、退款與rate共用由獨立backend負向測試驗證。

## 結果

| 驗證 | 結果 | 證據 |
| --- | --- | --- |
| 修復前 backend 全套 | 32/32 通過 | `.codex-runs/5.1-root-backend-tests.log`，95.181秒 |
| 修復後 backend 全套 | 37/37 通過 | `.codex-runs/5.2-root-backend-tests.log`，64.774秒；含catalog/routing新回歸 |
| API client 真HTTP | 9/9 通過，另連續10輪90case通過 | `.codex-runs/5.1-client-isolation-repeat.log` |
| Typecheck | 通過 | `.codex-runs/5.2-typecheck.log` |
| 最終Docker build / readiness | 通過 | `.codex-runs/5.2-fixture-up.log`，tsc / Vite production build、兩容器healthy |
| Learning 26案 | 26/26 通過 | `.codex-runs/5.2-learning.log`，六完整流程、18追問及全部布局/negative |
| Resources 27案 | 27/27 通過 | `.codex-runs/5.2-categories.log`，六完整流程、18/18建議追問、文件/記憶/切換/布局 |
| Dashboard 13案 | 13/13 通過 | `.codex-runs/5.2-dashboards.log`；含21組聚合一致性 |
| Interactions 7案 | 7/7 通過 | `.codex-runs/5.2-interactions-complete.log`；profile保存/重載、history搜尋、資源/通知與兩dashboard |
| 真登入／首頁／圖片／歷史／角色 7案 | 7/7 通過 | `.codex-runs/5.2-integration.log`，三角色gate、首頁單次submit、兩類圖片告知、history與teacher aliases |
| Visual 7頁 | 7/7 通過 | `.codex-runs/5.2-visual.log`，全部HTTP200、0overflow、0browser error；截圖已更新 |
| Docker restart與down/up持久性 | 全通過，relogin亦保留用量 | `.codex-runs/5.2-restart.log`；全SQLite rows、uploads、Chroma完整內容與三角色API快照相同 |
| 真實外部Agent | 未設定／未測 | Fake成功及localhost mock不等於live驗收 |

正常展示project `futureai-t42-681542` 亦已由主協調者以最終source重建至 `http://127.0.0.1:45465`，兩服務healthy，保留22個非catalog資料表逐表hash、2張圖片hash、18/12 Chroma chunks及學生每日配額20；`/docs`保留DemoBearer。證據 `.codex-runs/5.2-normal-deploy-report.json`、`5.2-normal-build.log`與`5.2-normal-deploy.log`。正常環境三角色真UI登入/reload也全通、0 Agent POST、0 pageerrors，log `.codex-runs/5.2-normal-browser.log`。Task3臨時Vite45466已關閉，原使用者5173仍保留。

## 四項實際產品修復

1. **原作類比與練習理由。** Backend seed縮短六主題內容，使既有完整解釋檢查失敗。恢復11個文字值：5個類比、6個理由。只升級精確等於已知舊預設的catalog欄位；practice亦核對題幹／選項／答案，自訂值與歷史message/source快照完全保留，重跑不UPDATE。詳見 [catalog handoff](handoffs/5.2-catalog.md)。
2. **資料清單無法完成。** Modal在API到達前用舊4項初始化狀態，實際2/3項文件出現後仍剩4項。以實際推薦message ID與文件集決定state identity，開關同份清單保留勾選，切換推薦重設；驗全部可見文件勾完可完成。
3. **首頁Newton第二定律誤路由。** `mode:auto`的『牛頓』2分輸給entropy泛稱『第二定律』4分，503。只新增五個精確定律名稱hint，保留generic router與unsupported邊界。無圖/PNG、五種定律、來源、持久快照、一次扣額與replay均有真API回歸；無關問題仍503不扣。詳見 [routing handoff](handoffs/5.2-routing.md)。
4. **首卡丟失圖片告知。** Learning/Resource首張結構卡只渲染summary，API完整message中的『離線示範無法辨識圖片內容』被省略。兩種首卡改呈現完整message.text，保留結構化動畫、練習、文件與來源；首次回覆及歷史重載都有瀏覽器回歸。

API契約、產品quota與live設定沒有變動。既有歷史保留當時的教材內容；新回答使用更新後catalog，未為得到新文字而重建對話。

## 測試接線修正與覆蓋

修前失敗與最小定位記於 [5.1 handoff](handoffs/5.1.md)，不是所有紅燈都是產品缺陷：

- Audits改走真auth/API/ID歷史，不再匯入Vite mock generator；合法離線模式、精確資源標題後綴與server scope label只作局部文案豁免。
- 政府CSV稀疏群組列數與四項總和對照同次filtered API，不硬鎖舊mock的六行。21種期間/地區組合檢查current/previous/trend/topics/regions/daily總和、百分比、數量界限及巢狀個資禁入。
- 農業fixture改完整既有支援需求句；Profile驗真正保存、API與reload，保留`panel=profile`重載後自動開啟。追問等待真HTTP後限定main，避免disabled textarea與user bubble重複匹配。
- Alerts由真profile設置明確農業條件，再取server匹配的critical通知驗已讀及reload；不同case不依賴前案留下的記憶狀態。聊天紀錄以API mode辨認資源對話，不因最新問題用『菜園』而沒有『農』字就誤判不存在。
- 六學習主題保留播放／暫停／重播、物理slider、四種動畫切換、練習正誤／重設、類比、逐引用來源、18個追問與320/1440布局。六資源分類保留文件數／勾選／重開／切換、來源、真memory同意／拒絕與18個建議追問。
- 教師教材同tab維持teacher身份，兩個learning aliases皆只GET材料與18chunks，不發Agent POST；教師不能冒用學生身份。首頁到回答單次POST、GET歷史不扣次、教師chat增question不捏造practice/animation分母、政府新event增量都有驗證。
- Client第9案一次不穩定來自測試server共用可切換handler，前案abort後遲到HTTP被下一案接走；Root改為按fake token固定route，10輪全通，未改產品retry邏輯。

Backend補充回歸驗最低seed量与逐筆Insight provenance、memory JSON true嚴格型別、profile/history刪除後不被seed復活、upload bytes、auth/role/owner、idempotency alias/conflict、nullable wire、並發quota與expiry。完整SQLite行比較不輸出私人值。

## 重跑命令

```bash
python3 scripts/integration-fixture.py prepare
python3 scripts/integration-fixture.py up
npm run test:api-client
npm run test:browser
python3 scripts/integration-restart.py
python3 scripts/integration-fixture.py down
```

已有state時直接`up`；`prepare`拒絕覆寫，可用`--state /private/path/another-state.json`建立新project，再以`AUDIT_FIXTURE_STATE`指定給browser。`BASE_URL`可覆寫連線位置，但角色code仍需來自明確fixture。`down`不刪volumes。每案階段結果記在`.codex-runs/*-progress.json`。

此主機的Playwright Chromium需本地library：

```bash
export LD_LIBRARY_PATH="$PWD/.codex-runs/browser-libs/root/usr/lib/aarch64-linux-gnu"
```

其他環境先依Playwright安裝Chromium與系統依賴。Backend使用已安裝requirements與httpx的獨立Python環境：

```bash
PYTHONPATH=backend ANONYMIZED_TELEMETRY=False python -m unittest discover -s backend/tests -v
npm run typecheck
npm run build
```

最終持久性驗收使用全SQLite row摘要、uploads bytes hash，以及Chroma每段ID/documents/metadata/embedding的摘要比對；不是只檢查chunks筆數。重啟與容器移除重建後，來源/資料/記憶/已讀/用量/session及dashboard完全保持；alias replay沒有寫入或重扣。

專屬測試fixture已執行`down`，container/network移除，volumes及私有env/state保留。`.codex-runs/5.2-fixture-down.log`；可用`python3 scripts/integration-fixture.py up`原地重跑。正常45465展示環境繼續運作。

日常Demo啟動維持 `python3 scripts/create-demo-env.py`、`docker compose up --build -d`。三角色完整操作、離線支援與備份說明見 [runbook](demo-runbook.md)。
