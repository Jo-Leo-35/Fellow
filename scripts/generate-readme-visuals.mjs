// Code-native presentation diagrams; all scenarios and dashboard data are fictional.
// Run from any directory: node scripts/generate-readme-visuals.mjs
// Requires the repository's Playwright, Chromium and Python Pillow installation.
// Optional: --capture-demo refreshes the two actual panels from a running offline Demo.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.join(root, "docs/judges/assets/story");
await fs.mkdir(out, { recursive: true });
const card = (n, title, body, cls = "") => `<article class="card ${cls}"><span class="number">${n}</span><h3>${title}</h3><p>${body}</p></article>`;
const note = text => `<div class="note">${text}</div>`;
const tag = text => `<span class="tag">${text}</span>`;
const row = (label, body) => `<div class="row"><b>${label}</b><span>${body}</span></div>`;
const bubble = (who, text, student = false) => `<div class="bubble ${student ? "student" : ""}"><small>${who}</small><p>${text}</p></div>`;
const molecule = `<svg viewBox="0 0 700 205" role="img" aria-label="水分子內的 O–H 共價鍵為實線，不同水分子之間的氫鍵為虛線">
  <g stroke="#09877c" stroke-width="8"><path d="M140 100 L215 66 M140 100 L184 165 M440 100 L515 66 M440 100 L484 165"/></g>
  <path d="M237 70 L410 97" stroke="#387bea" stroke-width="5" stroke-dasharray="10 8"/>
  <g fill="#102f45" font-family="sans-serif" font-size="26" text-anchor="middle">
  <circle cx="140" cy="100" r="35" fill="#b3ebe1"/><circle cx="440" cy="100" r="35" fill="#b3ebe1"/>
  <circle cx="215" cy="66" r="24" fill="#e9efff"/><circle cx="184" cy="165" r="24" fill="#e9efff"/>
  <circle cx="515" cy="66" r="24" fill="#e9efff"/><circle cx="484" cy="165" r="24" fill="#e9efff"/>
  <text x="140" y="109">O</text><text x="440" y="109">O</text><text x="215" y="75">H</text><text x="184" y="174">H</text><text x="515" y="75">H</text><text x="484" y="174">H</text>
  <text x="325" y="45" fill="#387bea" font-size="23">氫鍵（分子間）</text>
  <text x="110" y="35" font-size="20">δ−</text><text x="225" y="30" font-size="20">δ+</text>
  <text x="565" y="145" fill="#09877c" font-size="21">實線：共價鍵</text></g></svg>`;
const slides = [
  { id: "support-journey", section: "SYSTEM VISION", title: "從一次提問，到一個支持循環", subtitle: "跟著小晴，理解 Fellow 學伴如何把學習、家庭與公共服務接起來。", body: `
    <div class="hero"><div><span class="tag">主角：小晴 · 高中生 · 農業家庭</span><h2>「我看過課本，<br>還是不懂氫鍵。」</h2><p>有人陪她釐清概念，也有人協助家庭<br>找到原本不知道存在的公共資源。</p></div><div class="hero-quote"><span>一條旅程，三種視角</span><strong>學生獲得協助<br>教師決定教學介入<br>政府理解聚合需求</strong></div></div>
    <div class="grid five journey">${card("01", "學習問答", "先找卡點<br>提問、圖解、確認")}${card("02", "家庭資源", "經授權理解需求<br>整理條件與下一步")}${card("03", "主動提醒", "情境 × 公共事件<br>把協助帶到眼前")}${card("04", "教師支持", "從訊號到討論<br>由教師完成判斷")}${card("05", "政策洞察", "聚合需求與缺口<br>回饋資源改善")}</div>
    ${note("循環回到學生與家庭：資源更容易理解、教學更能回應需求。三種角色只取得其工作所需的資料。")}` },
  { id: "learning-steps", section: "01 / INTERACTIVE LEARNING", title: "先看見卡點，再一起推理", subtitle: "案例：水沸騰時，斷開的是水分子內的共價鍵嗎？", body: `
    <div class="grid two"><div class="panel">${bubble("小晴", "氫鍵也有氫，為什麼不是 O–H 共價鍵？", true)}${bubble("學伴 · 先提問", "你說的是一個水分子裡，還是兩個水分子之間的連結？")}${bubble("小晴 · 仍混淆", "我覺得都是一樣的線。", true)}${bubble("學伴 · 降低抽象程度", "先圈出每個 H₂O，再看看哪條線跨過圈圈。")}</div><div class="panel">${molecule}<h3>讓「分子內」與「分子間」看得見</h3><p>實線是 O–H 共價鍵；此例中，虛線表示不同水分子之間的氫鍵。</p>${note("確認題：一般沸騰後，水蒸氣主要仍是 H₂O 嗎？請用自己的話說明。")}</div></div>
    <div class="steps"><b>① 提問</b><span>→</span><b>② 定位卡點</b><span>→</span><b>③ 引導</b><span>→</span><b>④ 回答</b><span>→</span><b>⑤ 調整</b><span>→</span><b>⑥ 確認</b></div>
    <p class="caption">答錯 → 回到圖解；答對但說不清楚 → 追問理由；能解釋 → 換情境再確認。每一步都回到學生的推理與解釋。</p>` },
  { id: "resource-guide", section: "02 / PERSONALIZED RESOURCES", title: "從「不知道可以問誰」，到知道下一步", subtitle: "小晴家的收入暫時減少，開學費用與午餐支出成為壓力。", body: `
    <div class="grid resource"><div class="panel">${tag("先經使用者同意")}<h3>只確認這次需要的條件</h3>${row("目前需求", "開學費用、日常生活支出")}${row("已提供", "高中在學、家庭收入短期下降")}${row("仍待確認", "居住地、相關身分或承辦要求")}${note("對話可用於本次回應；長期記憶需另行同意。推薦不等於正式資格核定。")}</div><div class="panel featured">${tag("第一個可採取的行動")}<h3>校內就學支持窗口</h3>${row("為何推薦", "在學與費用壓力，與就學支持需求相關")}${row("可能資源", "學費、午餐、獎助學金等協助方向")}${row("準備資料", "先向承辦確認文件清單，再備妥需要的資料")}${row("申請期限", "待查核；不以推測日期製造倒數")}${row("下一步", "與家長討論 → 聯絡學校窗口 → 確認可用方案")}</div></div>
    <div class="steps"><b>家庭情境</b><span>→</span><b>理解需求</b><span>→</span><b>比對條件</b><span>→</span><b>說明優先序</b><span>→</span><b>協助行動</b></div>
    <p class="caption">每張資源卡整理相關理由、待確認條件、來源與下一步，讓家庭知道如何開始。</p>` },
  { id: "proactive-alert", section: "03 / PROACTIVE SUPPORT", title: "讓資源主動找到可能需要的人", subtitle: "農業家庭 × 地區災害事件 × 經查核的救助公告，形成有理由的提醒。", body: `
    <div class="grid resource"><div><div class="panel compact"><h3>① 已授權的家庭特徵</h3><p>家庭從事農業、所在行政區<br>使用者可修正或移除記憶</p></div><div class="plus">＋</div><div class="panel compact"><h3>② 公共事件與政策</h3><p>颱風影響與官方救助公告<br>先核對地區、作物與受理時間</p></div></div><div class="panel featured"><div class="tag">與你的家庭情境相關</div><h3>你的家庭可能需要這項協助</h3>${row("為何收到", "你同意記住務農情境，且公告地區可能相關")}${row("可能政策", "農業災害救助／其他災後支持方向")}${row("資格初查", "地區、受災項目與損失條件仍待承辦核對")}${row("截止日期", "先查核公告期限；尚待確認時說明原因")}${row("文件與窗口", "依公告核對文件；前往公告所列受理單位")}${note("查看原文 → 核對資格 → 設定下一步提醒 → 申請或尋求協助")}</div></div>
    <p class="caption">先讀提醒原因，再查資格與期限，最後選擇下一步與提醒時間。</p>` },
  { id: "teacher-support", section: "04 / TEACHER DASHBOARD", title: "把學習訊號，轉成老師能採取的行動", subtitle: "AI 協助整理證據；教學判斷與是否介入，由教師完成。", body: `
    <div class="dashboard-top"><span>Class Overview / 班級概覽</span><div>${tag("高一甲 · 化學")}${tag("觀察期間：近兩週")}</div></div>
    <div class="grid two"><div class="panel"><small>Students Who May Need Support</small><h3>值得進一步了解的學生</h3><div class="student-line"><span class="avatar">晴</span><div><b>小晴</b><p>曾混淆分子內與分子間的作用</p></div>${tag("待教師確認")}</div>${row("觀察到的訊號", "同一概念反覆提問；圖解後能辨認線條")}${row("仍不知道", "是否能獨立解釋新情境；需要補充觀察")}${note("描述具體卡點與時間，不以「能力差」或「不用功」描述學生。")}</div><div class="panel"><small>Concepts Students Struggle With</small><h3>先補哪一個概念？</h3><div class="concept">分子內／分子間 <span>→</span> 共用電子／分子極性 <span>→</span> 沸騰與相態</div><small>Recommended Teacher Actions</small><h3>建議教師下一步</h3><div class="action">1　課後用水分子圖卡討論 5 分鐘</div><div class="action">2　請學生畫線、說明每條線代表什麼</div><div class="action">3　隔次以新題確認，再調整教材</div></div></div>
    <div class="note">教師只取得授權教學摘要。家庭經濟情境、私人資源對話與原始附件不出現在此視圖。</div>` },
  { id: "government-insights", section: "05 / AGGREGATED INSIGHTS", title: "看見需求變化，找出政策可以改善的地方", subtitle: "地區與主題的聚合視角，不提供單一學生或家庭的查詢入口。", body: `
    <div class="dashboard-top"><span>Anonymous & Aggregated Insights</span><div>${tag("甲區")}${tag("指標計算範例")}</div></div>
    <div class="grid two"><div class="panel"><small>需求趨勢 / 相同長度的兩個期間</small><h3>農業救助的需求訊號增加</h3><div class="bar-row"><span>前期</span><div style="width:28%">40</div></div><div class="bar-row"><span>本期</span><div style="width:70%">100</div></div><p>此例為互動訊號次數，並非受災家庭數。需對照季節、事件與平台使用量。</p>${note("下一步：由承辦查核官方災情，確認是否需加強資源說明與服務量能。")}</div><div class="panel"><small>申請流程分析</small><h3>資訊看到了，為何還沒完成？</h3><div class="funnel"><div>看到資訊　100</div><div>開啟詳情　60</div><div>開始申請　30</div><div>確認送件　12</div></div><p>同一批次、同一觀察窗，且具合法授權與可信申請回傳，才能計算這類漏斗。</p></div></div>
    <p class="caption">查看需求趨勢、找出資訊缺口、核對申請步驟，再由承辦人調整服務。</p>` },
  { id: "data-boundaries", section: "PRIVACY & DATA PROTECTION", title: "同一個支持系統，三條清楚的資料邊界", subtitle: "只將完成任務所需的資訊送到對應角色；分享不等於全面開放。", body: `
    <div class="grid three">${card("學生", "自己的學習與需求", "對話、個人資料、同意的記憶<br><br>可以修正與刪除記憶；刪除記憶與刪除對話是不同操作。")}${card("教師", "授權教學摘要", "班級名冊、學習主題與觀察<br><br>不含家庭經濟資料、私人資源對話或原始附件。")}${card("政府", "固定維度的聚合", "期間 × 地區 × 主題 × 計數<br><br>不含姓名、學生 ID、原始對話，也不能鑽取個人。")}</div>
    <div class="panel privacy-route"><b>內部事件紀錄</b><span>→</span><b>固定維度聚合</b><span>→</span><b>政府 API / CSV</b></div>
    ${note("政府角色只取得固定維度的聚合結果；不同用途的資料各有可見範圍，記憶與對話分別管理。")}` },
];

const frames = [
  ["先說出真正卡住的地方", "小晴", "氫鍵和共價鍵都有氫，為什麼還要分兩種？", "學伴", "我們先看你說的「鍵」在哪裡：一個 H₂O 裡面，還是兩個 H₂O 之間？", "先釐清學生的理解，不急著給完整答案。"],
  ["把回答當作下一步線索", "小晴", "我覺得 O 和 H 之間那條線就是氫鍵。", "學伴", "先把每個 H₂O 圈起來。O–H 的線在圈內，還是跨到另一圈？", "答錯時降低抽象程度，先辨認位置。"],
  ["換一種說法，搭配圖解", "小晴", "圈內的是一個水分子，虛線是連到另一個水分子。", "學伴", "對。在這個例子中，實線是共用電子形成的 O–H 共價鍵；虛線是分子間氫鍵。", "位置辨認之後，再補上形成方式；水分子只是本次例子。"],
  ["用生活例子連回概念", "小晴", "那把水煮開，兩種線都會斷嗎？", "學伴", "想像分組站隊：各組彼此分開，是否代表組內成員也拆散？這只是區分層次的類比。", "類比不代表鍵結機制，也不能把分子看成真的人群。"],
  ["請學生說明自己的推理", "小晴", "我想是水分子彼此分開，但每個 H₂O 還在。", "學伴", "很好。請用「分子間吸引」和「O–H 共價鍵」說明為什麼水蒸氣主要仍是 H₂O。", "答對還要能解釋理由，不能只依選項判定掌握。"],
  ["以小問題確認理解", "學伴", "一般沸騰等於把水分解成氫氣與氧氣嗎？為什麼？", "小晴", "不等於。沸騰主要克服分子間吸引，水分子內 O–H 共價鍵仍維持。", "下一次用不同情境再確認；一次正確回答不代表長期掌握。"],
];
frames.forEach((f, i) => slides.push({ id: `learning-frame-${i + 1}`, section: `LEARNING WALKTHROUGH / ${i + 1} OF 6`, title: f[0], subtitle: "高中化學 · 氫鍵與共價鍵 · 引導式教學流程", body: `<div class="grid two"><div class="panel">${bubble(f[1], f[2], f[1] === "小晴")}${bubble(f[3], f[4], f[3] === "小晴")}</div><div class="panel">${molecule}<h3>這一步的教學目的</h3><p>${f[5]}</p>${tag("回答 → 調整提問 → 再確認")}</div></div><div class="frame-progress">${frames.map((_, j) => `<span class="${j <= i ? "on" : ""}">${j + 1}</span>`).join("")}</div>${note("一般沸騰時 H₂O 仍維持；圖中的氫鍵位於不同水分子間，其他合適分子也可能形成分子內氫鍵。")}` }));

const css = `
@import url('../fonts/400.css'); @import url('../fonts/700.css');
:root{font-family:'Noto Sans TC',sans-serif;color:#16384b;background:#e8f0f1;font-synthesis:none}
*{box-sizing:border-box}body{margin:0}button,select{font:inherit}button:focus-visible,select:focus-visible{outline:3px solid #5fbdf0;outline-offset:3px}
.slide{width:1600px;height:900px;background:#f5faf9;padding:46px 62px;position:relative;display:none;overflow:hidden}.slide.active{display:block}
.eyebrow{font-size:19px;letter-spacing:3px;color:#087c73;font-weight:700}h1{font-size:49px;line-height:1.3;margin:12px 0 10px;letter-spacing:-1px}h2{font-size:47px;line-height:1.4;margin:16px 0}h3{font-size:29px;line-height:1.5;margin:10px 0 16px}p{font-size:23px;line-height:1.75;margin:10px 0}.subtitle{color:#597280;margin:0 0 28px;font-size:24px}.grid{display:grid;gap:24px}.two{grid-template-columns:1fr 1fr}.three{grid-template-columns:repeat(3,1fr)}.five{grid-template-columns:repeat(5,1fr);gap:16px}.resource{grid-template-columns:.82fr 1.18fr}.panel,.card{background:white;border:1px solid #dbe9e7;border-radius:22px;padding:27px 30px}.panel{min-width:0}.card .number{font-size:20px;color:#0a8177;font-weight:700}.card h3{font-size:26px}.card p{font-size:21px}.featured{border-top:5px solid #119c8b}.tag{display:inline-block;background:#e0f5ef;border-radius:30px;padding:6px 15px;font-size:18px;color:#087268;font-weight:700;margin:0 6px 6px 0}.hero{display:grid;grid-template-columns:1.1fr 1fr;gap:30px;align-items:center;margin-bottom:24px}.hero p{margin-bottom:0}.hero-quote{border-radius:26px;background:#13374b;color:white;padding:33px 40px}.hero-quote span{font-size:21px;color:#9de5d7;display:block;margin-bottom:17px}.hero-quote strong{font-size:34px;line-height:1.7}.journey .card{padding:22px}.journey h3{margin:9px 0}.note{padding:17px 23px;background:#e4f4ee;border-left:5px solid #109987;border-radius:8px;font-size:22px;line-height:1.65;margin-top:22px}.bubble{background:#edf7f4;padding:14px 21px;border-radius:16px;margin-bottom:14px}.bubble.student{background:#eff3fb;margin-left:30px}.bubble small{font-size:17px;font-weight:700;color:#08766d}.bubble.student small{color:#3664a0}.bubble p{font-size:22px;line-height:1.6;margin:6px 0 0}.panel svg{display:block;width:100%;margin-bottom:10px}.steps{display:flex;align-items:center;justify-content:space-between;margin-top:26px;padding:22px 24px;background:#14394a;color:#fff;border-radius:16px;font-size:22px}.steps span{color:#79cdbb}.caption{font-size:19px;line-height:1.6;color:#597280;margin-top:17px}.row{display:grid;grid-template-columns:115px 1fr;gap:15px;padding:12px 0;border-bottom:1px solid #e7eeed;font-size:21px;line-height:1.65}.row:last-child{border:0}.row b{color:#08766d}.compact{padding:22px 30px}.compact h3{margin:4px 0 9px}.plus{text-align:center;color:#0b8d7d;font-size:33px;line-height:1.4}.dashboard-top{display:flex;align-items:center;justify-content:space-between;background:#17394b;color:white;border-radius:17px;padding:18px 24px;font-size:25px;margin-bottom:22px}.panel small{font-size:18px;color:#647e87}.student-line{display:flex;gap:15px;align-items:center;margin:22px 0}.student-line b{font-size:25px}.student-line p{font-size:19px}.student-line .tag{font-size:16px}.avatar{background:#e2f6f0;border-radius:50%;padding:16px;font-size:27px}.concept{font-size:24px;line-height:1.8;background:#f0f7f5;padding:18px;margin-bottom:24px;border-radius:10px}.concept span{color:#0b8d7d}.action{padding:12px 16px;background:#eff6fb;margin:10px 0;border-radius:8px;font-size:22px}.bar-row{display:flex;gap:20px;align-items:center;margin:24px 0;font-size:23px}.bar-row div{background:#168d81;border-radius:8px;padding:11px 20px;color:white;font-weight:700;min-width:70px}.bar-row:first-of-type div{background:#80bfb4}.funnel{display:grid;gap:10px;justify-items:center}.funnel div{width:100%;text-align:center;background:#e3f3ee;padding:10px;font-size:21px;border-radius:7px}.funnel div:nth-child(2){width:85%}.funnel div:nth-child(3){width:70%;background:#b4dfd3}.funnel div:nth-child(4){width:55%;background:#147f75;color:#fff}.privacy-route{display:flex;justify-content:space-around;align-items:center;font-size:28px;margin-top:28px}.privacy-route span{color:#0a8d7b}.frame-progress{display:flex;justify-content:center;gap:25px;margin:26px}.frame-progress span{display:grid;place-items:center;border-radius:50%;width:48px;height:48px;background:#e0e9e6;font-size:23px;color:#4d6a65}.frame-progress .on{background:#137f73;color:white}.footer{position:absolute;left:62px;right:62px;bottom:24px;padding-top:16px;border-top:1px solid #d6e4e1;display:flex;justify-content:space-between;font-size:16px;color:#607b82}.footer b{color:#08786f}.controls{position:fixed;bottom:0;left:0;right:0;background:#16384b;padding:12px;display:flex;gap:12px;justify-content:center;align-items:center;color:white;z-index:2}.controls button,.controls select{padding:8px 14px;border-radius:7px;border:0;background:white;color:#16384b;font-size:16px}.controls span{font-size:15px}#stage{width:1600px;height:900px;transform-origin:top left}#viewport{margin:auto;position:relative}
.subtitle{margin-bottom:20px}.hero{margin-bottom:12px}.hero h2{font-size:42px;margin:12px 0}.steps{padding:16px 24px;margin-top:18px}.bubble{padding:12px 21px}.bubble p{font-size:21px;line-height:1.55}.row{font-size:20px;padding:10px 0}
.panel svg text{font-family:'Noto Sans TC',sans-serif}#learning-steps .panel{padding-top:22px;padding-bottom:22px}#learning-steps .caption{margin-top:12px}
#teacher-support .dashboard-top,#government-insights .dashboard-top{padding:12px 24px;margin-bottom:16px;font-size:23px}
#teacher-support .panel,#government-insights .panel{padding:20px 24px}
#teacher-support h3,#government-insights h3{font-size:26px;margin:6px 0 10px}
#teacher-support .note,#government-insights .note{font-size:19px;padding:12px 18px;margin-top:16px}
#teacher-support .student-line{margin:10px 0}#teacher-support .row{font-size:19px;padding:8px 0}
#teacher-support .concept{font-size:21px;line-height:1.55;padding:12px;margin-bottom:14px}
#teacher-support .action{font-size:20px;padding:9px 14px;margin:7px 0}
#government-insights .panel p{font-size:21px;line-height:1.6}#government-insights .bar-row{margin:18px 0}
@media(max-width:700px){.controls{gap:8px;padding:10px 6px}.controls select{width:40vw;font-size:13px;padding:8px}.controls button{font-size:13px;padding:8px}.controls span{display:none}}
@media print{.controls{display:none}.slide{display:block!important;break-after:page}#stage{transform:none!important;height:auto!important}#viewport{width:auto!important;height:auto!important}@page{size:1600px 900px;margin:0}}
`;
const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Fellow 學伴產品故事：五個核心功能與引導式教學步驟，從氫鍵教學、家庭資源與教師支持，走到公共服務改善。"><title>Fellow 學伴｜README 產品故事圖卡</title><style>${css}</style></head><body><main id="viewport"><div id="stage">${slides.map((s, i) => `<section class="slide${i === 0 ? " active" : ""}" id="${s.id}" aria-label="${s.title}"><div class="eyebrow">FELLOW 學伴 / ${s.section}</div><h1>${s.title}</h1><p class="subtitle">${s.subtitle}</p>${s.body}<footer class="footer"><b>Fellow 學伴 · 從提問到支持</b><span>使用情境 → 操作流程 → 系統回應 → 下一步</span><span>${String(i + 1).padStart(2, "0")} / ${slides.length}</span></footer></section>`).join("")}</div></main><nav class="controls" aria-label="圖卡導覽"><button id="prev" type="button" aria-label="上一張">← 上一張</button><select id="choose" aria-label="選擇圖卡">${slides.map((s, i) => `<option value="${i}">${i + 1}. ${s.title}</option>`).join("")}</select><button id="next" type="button" aria-label="下一張">下一張 →</button><span>← → 切換 · 無自動播放</span></nav><script>
const slides=[...document.querySelectorAll('.slide')];let index=0;const choose=document.querySelector('#choose');
function show(value){index=(value+slides.length)%slides.length;slides.forEach((slide,i)=>{slide.classList.toggle('active',i===index);slide.setAttribute('aria-hidden',String(i!==index))});choose.value=index;history.replaceState(null,'','#'+slides[index].id)}
document.querySelector('#prev').onclick=()=>show(index-1);document.querySelector('#next').onclick=()=>show(index+1);choose.onchange=()=>show(Number(choose.value));document.addEventListener('keydown',e=>{if(e.target.closest('select,button,input'))return;if(e.key==='ArrowRight')show(index+1);if(e.key==='ArrowLeft')show(index-1)});
function resize(){const scale=Math.min(innerWidth/1600,(innerHeight-72)/900);document.querySelector('#stage').style.transform='scale('+scale+')';const viewport=document.querySelector('#viewport');viewport.style.width=1600*scale+'px';viewport.style.height=900*scale+'px'}
addEventListener('resize',resize);resize();const selected=slides.findIndex(s=>s.id===location.hash.slice(1));show(selected<0?0:selected);
</script></body></html>`;
const htmlPath = path.join(out, "storyboard.html");
await fs.writeFile(htmlPath, html);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("requestfailed", request => errors.push(`Failed: ${request.url()}`));
  await page.goto(pathToFileURL(htmlPath).href);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '#stage{transform:none!important}.controls{display:none}' });
  for (const [i, slide] of slides.entries()) {
    await page.selectOption("#choose", String(i), { force: true });
    const overlaps = await page.locator(`#${slide.id}`).evaluate(el => {
      const limit = el.querySelector(".footer").getBoundingClientRect().top;
      return [...el.children].filter(n => !n.classList.contains("footer") && n.getBoundingClientRect().bottom > limit - 6).map(n => n.className || n.tagName);
    });
    if (overlaps.length) errors.push(`Footer overlap in ${slide.id}: ${overlaps.join(', ')}`);
    await page.locator(`#${slide.id}`).screenshot({ path: path.join(out, `${slide.id}.png`) });
  }
  if (errors.length) throw new Error(errors.join("\n"));
  if (process.argv.includes("--capture-demo")) {
    const demo = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
    const base = process.env.README_DEMO_URL || "http://localhost:45465";
    const response = await demo.goto(new URL("/learning-chat.html?topic=bonding", base).href);
    if (!response?.ok()) throw new Error(`Demo page returned HTTP ${response?.status()}`);
    await demo.getByRole("heading", { name: "化學鍵與氫鍵", exact: true }).waitFor();
    await demo.evaluate(() => document.fonts.ready);
    const player = demo.getByRole("region", { name: "教學動畫播放器" });
    for (const [label, filename] of [["分子內：共價鍵", "bonding-covalent-demo"], ["分子間：氫鍵", "bonding-hydrogen-demo"]]) {
      await player.getByRole("button", { name: label, exact: true }).click();
      await player.screenshot({ path: path.join(out, `${filename}.png`) });
    }
    await demo.close();
    console.log("Captured the two actual bonding Demo panels.");
  }
} finally {
  await browser.close();
}
const localPython = path.join(root, ".venv/bin/python");
const python = process.env.README_VISUALS_PYTHON || await fs.access(localPython).then(() => localPython).catch(() => "python3");
const result = spawnSync(python, ["-c", `from PIL import Image
from pathlib import Path
import sys
p = Path(sys.argv[1])
frames = [Image.open(p / f'learning-frame-{i}.png').convert('RGB') for i in range(1, 7)]
frames[0].save(p / 'learning-walkthrough.gif', save_all=True, append_images=frames[1:], duration=[6500] * 6, loop=0, disposal=2, optimize=False)
print('Generated 7 PNG diagrams, 6 teaching PNG frames, a 39-second GIF and a keyboard-accessible HTML storyboard.')
`, out], { encoding: "utf8" });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(result.stderr || "GIF encoding failed");
process.stdout.write(result.stdout);
