import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const toolRoot = process.env.DECK_TOOLS_DIR || "/tmp/futureai-deck-tools-20260905";
const PptxGenJS = require(path.join(toolRoot, "node_modules", "pptxgenjs"));

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const outDir = path.join(projectRoot, "docs", "deliverables", "hackathon-demo-2026-09-05");
const screenshotDir = path.join(projectRoot, ".screenshots");
fs.mkdirSync(outDir, { recursive: true });

const files = {
  home: path.join(screenshotDir, "home.png"),
  learningStart: path.join(screenshotDir, "learning-product-overview.png"),
  learningInteractive: path.join(screenshotDir, "learning-newton-interactive.png"),
  resources: path.join(screenshotDir, "resources-2.png"),
  resourceEducation: path.join(screenshotDir, "category-education-390.png"),
  alerts: path.join(screenshotDir, "alerts-2.png"),
  teacher: path.join(screenshotDir, "teacher.png"),
  government: path.join(screenshotDir, "government.png"),
  logo: path.join(projectRoot, "frontend", "public", "assets", "logo-sprout.svg"),
};

for (const [name, filename] of Object.entries(files)) {
  if (!fs.existsSync(filename)) throw new Error(`Missing ${name}: ${filename}`);
}

const C = {
  navy: "0C2D47",
  ink: "15324A",
  teal: "10B5A4",
  tealDark: "087F74",
  mint: "DDF7F3",
  mint2: "EFFAF8",
  blue: "4089E8",
  bluePale: "E8F1FF",
  orange: "F39A43",
  orangePale: "FFF0E2",
  red: "EB6557",
  redPale: "FDEBE8",
  gray: "668095",
  line: "DDE9EE",
  paper: "F3F8FA",
  white: "FFFFFF",
};

const FONT = "Noto Sans TC";
const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "FutureAI / Fellow";
pptx.company = "FutureAI";
pptx.subject = "黑客松 Demo 錄影腳本與操作截圖";
pptx.title = "Fellow｜學伴 — 黑客松 Demo 錄影腳本";
pptx.lang = "zh-TW";
pptx.theme = {
  headFontFace: FONT,
  bodyFontFace: FONT,
  lang: "zh-TW",
};
pptx.defineSlideMaster({
  title: "MASTER",
  background: { color: C.paper },
  objects: [
    { rect: { x: 0, y: 0, w: 13.333, h: 0.055, fill: { color: C.teal }, line: { color: C.teal } } },
  ],
  slideNumber: { x: 12.35, y: 7.08, w: 0.45, h: 0.2, color: C.gray, fontFace: FONT, fontSize: 8, align: "right" },
});

const shadow = { type: "outer", color: "5E7484", opacity: 0.16, blur: 2, angle: 45, distance: 1 };

function addText(slide, text, x, y, w, h, options = {}) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: FONT,
    fontSize: 16,
    color: C.ink,
    margin: 0,
    breakLine: false,
    valign: "mid",
    fit: "shrink",
    ...options,
  });
}

function roundRect(slide, x, y, w, h, fill, radius = 0.12, line = fill) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: radius,
    fill: { color: fill },
    line: { color: line, width: 0.8 },
  });
}

function pill(slide, text, x, y, w, fill = C.mint, color = C.tealDark) {
  roundRect(slide, x, y, w, 0.31, fill, 0.12, fill);
  addText(slide, text, x, y + 0.005, w, 0.29, { fontSize: 9.5, bold: true, color, align: "center" });
}

function brand(slide, section, page) {
  slide.addImage({ path: files.logo, x: 0.55, y: 0.24, w: 0.28, h: 0.28 });
  addText(slide, "學伴", 0.88, 0.22, 0.68, 0.32, { fontSize: 13.5, bold: true, color: C.navy });
  addText(slide, section, 1.57, 0.24, 2.7, 0.28, { fontSize: 9.5, color: C.gray });
  addText(slide, String(page).padStart(2, "0"), 12.25, 0.24, 0.48, 0.28, { fontSize: 9.5, bold: true, color: C.tealDark, align: "right" });
}

function titleBlock(slide, kicker, title, subtitle, page) {
  brand(slide, kicker, page);
  addText(slide, title, 0.62, 0.74, 11.9, 0.62, { fontSize: 27, bold: true, color: C.navy, breakLine: true });
  addText(slide, subtitle, 0.64, 1.31, 11.6, 0.34, { fontSize: 11.5, color: C.gray });
}

function phone(slide, imagePath, x, y, h, label, accent = C.teal) {
  const w = h * (390 / 844);
  slide.addShape(pptx.ShapeType.roundRect, {
    x: x - 0.05, y: y - 0.05, w: w + 0.1, h: h + 0.1,
    rectRadius: 0.16,
    fill: { color: C.white }, line: { color: C.line, width: 0.7 }, shadow,
  });
  slide.addImage({ path: imagePath, x, y, w, h });
  pill(slide, label, x + 0.08, y + 0.12, Math.max(0.75, w - 0.16), C.white, accent);
  return w;
}

function screenshot(slide, imagePath, x, y, w, h, label) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: x - 0.04, y: y - 0.04, w: w + 0.08, h: h + 0.08,
    rectRadius: 0.12,
    fill: { color: C.white }, line: { color: C.line, width: 0.7 }, shadow,
  });
  slide.addImage({ path: imagePath, x, y, w, h });
  pill(slide, label, x + 0.16, y + 0.16, 1.1, C.white, C.tealDark);
}

function numberDot(slide, number, x, y, fill = C.teal) {
  slide.addShape(pptx.ShapeType.ellipse, { x, y, w: 0.34, h: 0.34, fill: { color: fill }, line: { color: C.white, width: 1.3 } });
  addText(slide, String(number), x, y, 0.34, 0.34, { fontSize: 10, bold: true, color: C.white, align: "center" });
}

function timeline(slide, x, y, w, items) {
  const gap = 0.08;
  const segW = (w - gap * (items.length - 1)) / items.length;
  items.forEach((item, index) => {
    const sx = x + index * (segW + gap);
    roundRect(slide, sx, y, segW, 0.67, item.fill || C.mint2, 0.09, item.fill || C.mint2);
    addText(slide, item.time, sx + 0.1, y + 0.08, segW - 0.2, 0.17, { fontSize: 8.5, bold: true, color: item.color || C.tealDark });
    addText(slide, item.label, sx + 0.1, y + 0.28, segW - 0.2, 0.27, { fontSize: 10.2, bold: true, color: C.navy });
  });
}

function stepList(slide, steps, x, y, w, accent = C.teal) {
  steps.forEach((step, index) => {
    const sy = y + index * 0.6;
    numberDot(slide, index + 1, x, sy + 0.015, accent);
    addText(slide, step, x + 0.46, sy, w - 0.46, 0.42, { fontSize: 11.6, bold: index === steps.length - 1, color: C.ink });
  });
}

function quoteCard(slide, text, x, y, w, h, fill = C.navy) {
  roundRect(slide, x, y, w, h, fill, 0.11, fill);
  addText(slide, `「${text}」`, x + 0.25, y + 0.13, w - 0.5, h - 0.26, { fontSize: 12.2, bold: true, color: C.white, breakLine: true, valign: "mid" });
}

// 01 Cover
{
  const slide = pptx.addSlide("MASTER");
  slide.background = { color: C.paper };
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.42, y: -1.05, w: 4.65, h: 4.65, fill: { color: C.mint }, line: { color: C.mint } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 10.82, y: 4.95, w: 2.25, h: 2.25, fill: { color: C.bluePale }, line: { color: C.bluePale } });
  slide.addImage({ path: files.logo, x: 0.7, y: 0.62, w: 0.46, h: 0.46 });
  addText(slide, "Fellow｜學伴", 1.28, 0.59, 3.5, 0.5, { fontSize: 18, bold: true, color: C.navy });
  pill(slide, "HACKATHON DEMO KIT", 0.72, 1.43, 2.17, C.mint, C.tealDark);
  addText(slide, "5 個功能 × 30 秒", 0.7, 1.98, 7.2, 0.76, { fontSize: 36, bold: true, color: C.navy });
  addText(slide, "操作截圖、旁白與錄影分鏡", 0.72, 2.78, 6.4, 0.44, { fontSize: 20, bold: true, color: C.tealDark });
  addText(slide, "從一位學生的提問開始，連結學習、生活協助、教師行動與匿名政策洞察。", 0.72, 3.36, 6.45, 0.72, { fontSize: 14, color: C.gray, breakLine: true, valign: "top" });
  pill(slide, "學生端", 0.72, 4.45, 1.05, C.bluePale, C.blue);
  pill(slide, "教師端", 1.89, 4.45, 1.05, C.mint, C.tealDark);
  pill(slide, "政府端", 3.06, 4.45, 1.05, C.orangePale, C.orange);
  roundRect(slide, 0.72, 5.17, 5.95, 0.84, C.white, 0.12, C.line);
  addText(slide, "總片長", 0.98, 5.35, 0.85, 0.2, { fontSize: 10, bold: true, color: C.gray });
  addText(slide, "2:30", 1.82, 5.25, 1.0, 0.42, { fontSize: 23, bold: true, color: C.navy });
  addText(slide, "每段只有一個任務、三個操作、一道清楚的結果。", 2.98, 5.27, 3.35, 0.4, { fontSize: 11.2, color: C.ink, breakLine: true });
  phone(slide, files.home, 9.1, 0.82, 5.9, "學生首頁", C.tealDark);
  numberDot(slide, 1, 11.22, 2.95, C.orange);
  addText(slide, "問功課", 11.58, 2.91, 0.83, 0.32, { fontSize: 9, bold: true, color: C.orange });
  numberDot(slide, 2, 11.16, 3.9, C.blue);
  addText(slide, "找資源", 11.52, 3.86, 0.88, 0.32, { fontSize: 9, bold: true, color: C.blue });
  addText(slide, "2026.09.05", 0.72, 6.88, 1.4, 0.2, { fontSize: 9, color: C.gray });
}

// 02 Story flow
{
  const slide = pptx.addSlide("MASTER");
  titleBlock(slide, "DEMO STORY", "一條完整閉環，拆成五支短片", "每段可以獨立觀看；連續播放時，會形成從個人到系統的故事。", 2);
  const cards = [
    { n: "01", title: "看懂概念", role: "學生", note: "問答＋互動動畫", color: C.blue, fill: C.bluePale },
    { n: "02", title: "找到協助", role: "學生／家庭", note: "條件與下一步", color: C.orange, fill: C.orangePale },
    { n: "03", title: "不錯過提醒", role: "學生", note: "主動通知與行動", color: C.red, fill: C.redPale },
    { n: "04", title: "轉成教學", role: "教師", note: "洞察與複習計畫", color: C.tealDark, fill: C.mint },
    { n: "05", title: "看見地方需求", role: "政府", note: "匿名彙整與趨勢", color: C.navy, fill: "E5EEF4" },
  ];
  cards.forEach((card, index) => {
    const x = 0.62 + index * 2.52;
    roundRect(slide, x, 2.05, 2.19, 2.62, C.white, 0.12, C.line);
    slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.18, y: 2.27, w: 0.52, h: 0.52, fill: { color: card.fill }, line: { color: card.fill } });
    addText(slide, card.n, x + 0.18, 2.27, 0.52, 0.52, { fontSize: 10, bold: true, color: card.color, align: "center" });
    pill(slide, card.role, x + 1.18, 2.34, 0.78, card.fill, card.color);
    addText(slide, card.title, x + 0.18, 3.04, 1.84, 0.42, { fontSize: 16, bold: true, color: C.navy, breakLine: true });
    addText(slide, card.note, x + 0.18, 3.61, 1.82, 0.5, { fontSize: 10.5, color: C.gray, breakLine: true, valign: "top" });
    addText(slide, "30 秒", x + 0.18, 4.25, 0.8, 0.2, { fontSize: 9.5, bold: true, color: card.color });
    if (index < cards.length - 1) {
      slide.addShape(pptx.ShapeType.chevron, { x: x + 2.22, y: 3.08, w: 0.22, h: 0.46, fill: { color: C.line }, line: { color: C.line } });
    }
  });
  roundRect(slide, 0.64, 5.12, 12.05, 1.15, C.navy, 0.13, C.navy);
  addText(slide, "共同節奏", 0.92, 5.33, 1.05, 0.24, { fontSize: 10, bold: true, color: "91DDD5" });
  addText(slide, "問題情境", 2.08, 5.28, 1.22, 0.34, { fontSize: 13, bold: true, color: C.white, align: "center" });
  addText(slide, "→", 3.34, 5.28, 0.34, 0.34, { fontSize: 15, bold: true, color: "91DDD5", align: "center" });
  addText(slide, "一個關鍵操作", 3.73, 5.28, 1.62, 0.34, { fontSize: 13, bold: true, color: C.white, align: "center" });
  addText(slide, "→", 5.43, 5.28, 0.34, 0.34, { fontSize: 15, bold: true, color: "91DDD5", align: "center" });
  addText(slide, "可見的結果", 5.84, 5.28, 1.42, 0.34, { fontSize: 13, bold: true, color: C.white, align: "center" });
  addText(slide, "→", 7.3, 5.28, 0.34, 0.34, { fontSize: 15, bold: true, color: "91DDD5", align: "center" });
  addText(slide, "對人的價值", 7.71, 5.28, 1.42, 0.34, { fontSize: 13, bold: true, color: C.white, align: "center" });
  addText(slide, "每支片最多 3 個主要點擊", 9.65, 5.26, 2.55, 0.38, { fontSize: 11, bold: true, color: "FFE1BE", align: "center" });
}

// 03 Learning
{
  const slide = pptx.addSlide("MASTER");
  titleBlock(slide, "01 · STUDENT LEARNING", "AI 學習問答＋互動教學動畫", "把「聽過公式」變成「親手調整後真的看懂」。", 3);
  const h = 4.92;
  phone(slide, files.learningStart, 0.68, 1.83, h, "選主題", C.blue);
  phone(slide, files.learningInteractive, 3.26, 1.83, h, "動手理解", C.tealDark);
  numberDot(slide, 1, 2.48, 3.12, C.blue);
  numberDot(slide, 2, 5.23, 3.92, C.teal);
  pill(slide, "30 秒腳本", 6.15, 1.84, 1.16, C.mint, C.tealDark);
  addText(slide, "學生卡在牛頓力學時，學伴先回答，再讓他直接改變力與質量，觀察加速度如何變化。", 6.15, 2.27, 6.35, 0.89, { fontSize: 15.5, bold: true, color: C.navy, breakLine: true, valign: "top" });
  stepList(slide, ["選擇「牛頓力學」", "播放動畫並調整一個參數", "停在公式結果與理解檢核"], 6.18, 3.33, 5.85, C.blue);
  quoteCard(slide, "學生不只拿到答案，還能看見變化、動手驗證。", 6.15, 5.25, 6.12, 0.75, C.navy);
  timeline(slide, 6.15, 6.16, 6.12, [
    { time: "0–5s", label: "提出卡點", fill: C.bluePale, color: C.blue },
    { time: "5–20s", label: "操作動畫", fill: C.mint, color: C.tealDark },
    { time: "20–30s", label: "確認理解", fill: C.orangePale, color: C.orange },
  ]);
}

// 04 Resources
{
  const slide = pptx.addSlide("MASTER");
  titleBlock(slide, "02 · RESOURCE GUIDANCE", "個人化公共資源推薦", "不必先知道補助名稱，從生活情境開始整理可行方向。", 4);
  const h = 4.92;
  phone(slide, files.resources, 0.68, 1.83, h, "六類入口", C.orange);
  phone(slide, files.resourceEducation, 3.26, 1.83, h, "就學情境", C.blue);
  numberDot(slide, 1, 2.47, 2.92, C.orange);
  numberDot(slide, 2, 5.21, 4.14, C.blue);
  pill(slide, "30 秒腳本", 6.15, 1.84, 1.16, C.orangePale, C.orange);
  addText(slide, "學生描述學費與生活費壓力後，學伴整理可能資源、待確認條件、應備資料與政府窗口。", 6.15, 2.27, 6.35, 0.89, { fontSize: 15.5, bold: true, color: C.navy, breakLine: true, valign: "top" });
  stepList(slide, ["從六類問題選擇「就學」", "顯示可能符合與待確認條件", "打開資料清單或政府來源"], 6.18, 3.33, 5.85, C.orange);
  quoteCard(slide, "把模糊的求助，整理成可以立刻採取的下一步。", 6.15, 5.25, 6.12, 0.75, C.navy);
  timeline(slide, 6.15, 6.16, 6.12, [
    { time: "0–6s", label: "描述情境", fill: C.orangePale, color: C.orange },
    { time: "6–22s", label: "查看條件", fill: C.bluePale, color: C.blue },
    { time: "22–30s", label: "帶走下一步", fill: C.mint, color: C.tealDark },
  ]);
}

// 05 Alerts
{
  const slide = pptx.addSlide("MASTER");
  titleBlock(slide, "03 · PROACTIVE SUPPORT", "主動通知與下一步提醒", "從「等學生來問」進一步變成「重要時刻主動出現」。", 5);
  phone(slide, files.alerts, 0.87, 1.82, 5.04, "通知中心", C.red);
  numberDot(slide, 1, 2.32, 2.66, C.red);
  numberDot(slide, 2, 2.34, 4.28, C.blue);
  numberDot(slide, 3, 2.35, 5.82, C.teal);
  pill(slide, "30 秒腳本", 4.15, 1.84, 1.16, C.redPale, C.red);
  addText(slide, "重要公告、申請截止與學習回覆被整理在同一處；每則提醒都說清楚「為什麼提醒」與可以採取的行動。", 4.15, 2.27, 8.1, 0.86, { fontSize: 15.2, bold: true, color: C.navy, breakLine: true, valign: "top" });
  const cols = [
    { x: 4.15, n: "01", title: "看見優先級", note: "重要、系統與全部通知分流", fill: C.redPale, color: C.red },
    { x: 6.83, n: "02", title: "理解原因", note: "不是只丟一個標題，而是說明觸發依據", fill: C.bluePale, color: C.blue },
    { x: 9.51, n: "03", title: "立即行動", note: "查看詳情或標示已讀，降低遺漏", fill: C.mint, color: C.tealDark },
  ];
  cols.forEach((item) => {
    roundRect(slide, item.x, 3.37, 2.45, 1.53, C.white, 0.11, C.line);
    pill(slide, item.n, item.x + 0.18, 3.56, 0.52, item.fill, item.color);
    addText(slide, item.title, item.x + 0.18, 3.98, 2.05, 0.3, { fontSize: 12.2, bold: true, color: C.navy });
    addText(slide, item.note, item.x + 0.18, 4.32, 2.05, 0.4, { fontSize: 9.5, color: C.gray, breakLine: true, valign: "top" });
  });
  quoteCard(slide, "真正的陪伴，是在關鍵時刻讓人不錯過協助。", 4.15, 5.24, 7.81, 0.75, C.navy);
  timeline(slide, 4.15, 6.16, 7.81, [
    { time: "0–6s", label: "未讀提醒", fill: C.redPale, color: C.red },
    { time: "6–22s", label: "打開詳情", fill: C.bluePale, color: C.blue },
    { time: "22–30s", label: "確認行動", fill: C.mint, color: C.tealDark },
  ]);
}

// 06 Teacher
{
  const slide = pptx.addSlide("MASTER");
  titleBlock(slide, "04 · TEACHER ACTION", "教師學習洞察與複習計畫", "把大量互動整理成下一堂課可以採取的教學行動。", 6);
  screenshot(slide, files.teacher, 0.66, 1.86, 7.9, 4.94, "教師端");
  numberDot(slide, 1, 2.65, 3.05, C.blue);
  numberDot(slide, 2, 6.71, 3.07, C.orange);
  numberDot(slide, 3, 6.18, 5.1, C.teal);
  pill(slide, "30 秒腳本", 8.94, 1.84, 1.16, C.mint, C.tealDark);
  addText(slide, "工作台先指出班級共同卡點與需要關注的學生，再連到教學動畫與複習安排。", 8.94, 2.27, 3.72, 0.84, { fontSize: 14.5, bold: true, color: C.navy, breakLine: true, valign: "top" });
  stepList(slide, ["查看最常遇到的概念", "打開學生或主題詳情", "加入複習計畫"], 8.96, 3.3, 3.5, C.tealDark);
  quoteCard(slide, "洞察的終點不是圖表，而是下一次教學。", 8.94, 5.28, 3.68, 0.92, C.navy);
  timeline(slide, 8.94, 6.31, 3.68, [
    { time: "0–8s", label: "看全班", fill: C.bluePale, color: C.blue },
    { time: "8–22s", label: "找卡點", fill: C.orangePale, color: C.orange },
    { time: "22–30s", label: "排複習", fill: C.mint, color: C.tealDark },
  ]);
}

// 07 Government
{
  const slide = pptx.addSlide("MASTER");
  titleBlock(slide, "05 · PUBLIC INSIGHT", "政府匿名需求洞察", "保護個人隱私，同時讓地方需求被看見。", 7);
  screenshot(slide, files.government, 0.66, 1.86, 7.9, 4.94, "政府端");
  numberDot(slide, 1, 2.54, 2.46, C.blue);
  numberDot(slide, 2, 5.18, 3.25, C.orange);
  numberDot(slide, 3, 7.14, 3.28, C.teal);
  pill(slide, "30 秒腳本", 8.94, 1.84, 1.16, C.orangePale, C.orange);
  addText(slide, "政府端只看匿名彙整後的教育與資源需求，可切換地區、期間，追蹤快速升高的主題。", 8.94, 2.27, 3.72, 0.84, { fontSize: 14.5, bold: true, color: C.navy, breakLine: true, valign: "top" });
  stepList(slide, ["掃過整體需求 KPI", "切換行政區或期間", "打開趨勢或匯出摘要"], 8.96, 3.3, 3.5, C.orange);
  quoteCard(slide, "從一個人的求助，看見整個地區的服務缺口。", 8.94, 5.28, 3.68, 0.92, C.navy);
  timeline(slide, 8.94, 6.31, 3.68, [
    { time: "0–8s", label: "看總量", fill: C.bluePale, color: C.blue },
    { time: "8–22s", label: "找地區", fill: C.orangePale, color: C.orange },
    { time: "22–30s", label: "追趨勢", fill: C.mint, color: C.tealDark },
  ]);
}

// 08 Recording SOP
{
  const slide = pptx.addSlide("MASTER");
  titleBlock(slide, "RECORDING SOP", "每支 30 秒，固定同一個節奏", "畫面只負責證明功能；旁白負責說清楚價值。", 8);
  const phases = [
    { x: 0.66, w: 1.65, time: "0–3 秒", title: "功能名", note: "一行說明誰遇到什麼問題", fill: C.navy, color: C.white },
    { x: 2.47, w: 1.7, time: "3–8 秒", title: "情境", note: "讓評審知道目前角色與任務", fill: C.blue, color: C.white },
    { x: 4.33, w: 3.38, time: "8–23 秒", title: "關鍵操作", note: "最多 3 個點擊；每次點擊後停 1 秒", fill: C.teal, color: C.white },
    { x: 7.87, w: 2.1, time: "23–28 秒", title: "結果", note: "停在最能證明價值的畫面", fill: C.orange, color: C.white },
    { x: 10.13, w: 2.54, time: "28–30 秒", title: "片尾", note: "Fellow｜把一個問題變成下一步", fill: C.navy, color: C.white },
  ];
  phases.forEach((item, index) => {
    roundRect(slide, item.x, 1.97, item.w, 1.62, item.fill, 0.11, item.fill);
    addText(slide, item.time, item.x + 0.18, 2.16, item.w - 0.36, 0.23, { fontSize: 9.5, bold: true, color: index === 0 || index === 4 ? "91DDD5" : C.white });
    addText(slide, item.title, item.x + 0.18, 2.48, item.w - 0.36, 0.35, { fontSize: 15, bold: true, color: item.color });
    addText(slide, item.note, item.x + 0.18, 2.91, item.w - 0.36, 0.43, { fontSize: 9.2, color: item.color, breakLine: true, valign: "top" });
  });
  addText(slide, "錄影前 3 分鐘檢查", 0.68, 4.12, 3.0, 0.36, { fontSize: 17, bold: true, color: C.navy });
  const checks = [
    "1920×1080、瀏覽器縮放 100%",
    "關閉書籤列、通知、DevTools 與私人分頁",
    "預先開好 5 個網址，重設需要的操作狀態",
    "問題先複製好；避免現場慢慢輸入",
    "每段錄 3 take，旁白後製加入",
    "片頭與片尾使用相同字體、色彩與 Logo",
  ];
  checks.forEach((item, index) => {
    const col = index < 3 ? 0 : 1;
    const row = index % 3;
    const x = 0.7 + col * 4.05;
    const y = 4.68 + row * 0.55;
    numberDot(slide, index + 1, x, y, index < 3 ? C.teal : C.blue);
    addText(slide, item, x + 0.45, y - 0.01, 3.42, 0.38, { fontSize: 10.5, color: C.ink, bold: true, breakLine: true });
  });
  roundRect(slide, 8.89, 4.09, 3.78, 2.16, C.white, 0.12, C.line);
  pill(slide, "旁白原則", 9.17, 4.34, 1.05, C.orangePale, C.orange);
  addText(slide, "不要說：", 9.17, 4.87, 0.85, 0.24, { fontSize: 10, bold: true, color: C.red });
  addText(slide, "「我現在點這裡。」", 10.02, 4.84, 2.1, 0.3, { fontSize: 11, color: C.gray });
  addText(slide, "改成說：", 9.17, 5.36, 0.85, 0.24, { fontSize: 10, bold: true, color: C.tealDark });
  addText(slide, "「這一步讓學生知道接下來能做什麼。」", 10.02, 5.31, 2.24, 0.58, { fontSize: 11, bold: true, color: C.navy, breakLine: true, valign: "top" });
}

// 09 Routes and wording
{
  const slide = pptx.addSlide("MASTER");
  titleBlock(slide, "HANDOFF", "錄影網址與資料口徑", "開拍前照這張表逐一確認，避免在評審面前誤述產品狀態。", 9);
  const rows = [
    ["01", "學習動畫", "/learning-chat.html?topic=newton", "公式＋參數結果"],
    ["02", "資源推薦", "/resource-chat.html?category=education", "可能符合＋下一步"],
    ["03", "主動通知", "/alerts.html", "提醒原因＋行動"],
    ["04", "教師洞察", "/teacher.html", "卡點＋複習安排"],
    ["05", "政府洞察", "/government.html", "匿名需求＋趨勢"],
  ];
  const x = 0.68, y = 1.95, widths = [0.68, 1.52, 4.02, 2.42];
  const headers = ["片段", "功能", "網址", "結尾畫面"];
  let cx = x;
  headers.forEach((header, i) => {
    roundRect(slide, cx, y, widths[i], 0.48, C.navy, 0.04, C.navy);
    addText(slide, header, cx + 0.1, y, widths[i] - 0.2, 0.48, { fontSize: 9.5, bold: true, color: C.white, align: i === 0 ? "center" : "left" });
    cx += widths[i] + 0.04;
  });
  rows.forEach((row, r) => {
    let rx = x;
    row.forEach((cell, i) => {
      const fill = r % 2 === 0 ? C.white : "ECF5F7";
      roundRect(slide, rx, y + 0.55 + r * 0.61, widths[i], 0.54, fill, 0.04, fill);
      addText(slide, cell, rx + 0.1, y + 0.55 + r * 0.61, widths[i] - 0.2, 0.54, { fontSize: i === 2 ? 9.3 : 10.3, bold: i === 0 || i === 1, color: i === 0 ? C.tealDark : C.ink, align: i === 0 ? "center" : "left" });
      rx += widths[i] + 0.04;
    });
  });
  roundRect(slide, 9.7, 1.94, 2.92, 3.54, C.white, 0.12, C.line);
  pill(slide, "建議用語", 9.98, 2.22, 1.05, C.mint, C.tealDark);
  const good = ["示範情境", "可能符合", "待確認條件", "匿名彙整", "協助整理下一步"];
  good.forEach((item, index) => {
    slide.addShape(pptx.ShapeType.ellipse, { x: 10.0, y: 2.82 + index * 0.47, w: 0.2, h: 0.2, fill: { color: C.teal }, line: { color: C.teal } });
    addText(slide, item, 10.34, 2.73 + index * 0.47, 1.83, 0.38, { fontSize: 10.8, bold: true, color: C.navy });
  });
  roundRect(slide, 0.68, 5.53, 11.94, 0.93, C.orangePale, 0.11, C.orangePale);
  addText(slide, "錄影口徑", 0.94, 5.78, 0.92, 0.27, { fontSize: 10.5, bold: true, color: C.orange });
  addText(slide, "目前頁面以 Demo／示範資料呈現。除非錄影前已完成並驗證即時後端串接，請不要宣稱已連接即時政府資料、完成正式資格判定或提供真實 AI 即時服務。", 1.9, 5.67, 10.25, 0.47, { fontSize: 11, bold: true, color: C.navy, breakLine: true });
  addText(slide, "固定片尾：Fellow｜學伴 — 把一個問題，變成下一步。", 0.7, 6.72, 7.6, 0.28, { fontSize: 12.5, bold: true, color: C.tealDark });
}

const pptxPath = path.join(outDir, "Fellow-黑客松-Demo-投影片.pptx");
await pptx.writeFile({ fileName: pptxPath });

const rel = (name) => `../../.screenshots/${name}`;
const flowCards = [
  ["01", "學生", "看懂概念", "問答＋互動動畫"],
  ["02", "學生／家庭", "找到協助", "條件與下一步"],
  ["03", "學生", "不錯過提醒", "主動通知與行動"],
  ["04", "教師", "轉成教學", "洞察與複習計畫"],
  ["05", "政府", "看見地方需求", "匿名彙整與趨勢"],
];

const phoneHtml = (src, label, cls = "") => `<figure class="phone ${cls}"><img src="${src}" alt="${label}"><figcaption>${label}</figcaption></figure>`;
const timelineHtml = (items) => `<div class="timeline">${items.map(([time, label]) => `<div><b>${time}</b><span>${label}</span></div>`).join("")}</div>`;
const stepsHtml = (steps) => `<ol class="steps">${steps.map((step) => `<li>${step}</li>`).join("")}</ol>`;
const pageHeader = (kicker, page) => `<header><div class="brand"><img src="../../../frontend/public/assets/logo-sprout.svg"><b>學伴</b><span>${kicker}</span></div><em>${String(page).padStart(2, "0")}</em></header>`;
const featureHead = (kicker, title, subtitle, page) => `${pageHeader(kicker, page)}<div class="head"><h1>${title}</h1><p>${subtitle}</p></div>`;

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <title>Fellow｜學伴 — 黑客松 Demo 錄影腳本</title>
  <link rel="stylesheet" href="../../node_modules/@fontsource/noto-sans-tc/400.css">
  <link rel="stylesheet" href="../../node_modules/@fontsource/noto-sans-tc/600.css">
  <link rel="stylesheet" href="../../node_modules/@fontsource/noto-sans-tc/700.css">
  <link rel="stylesheet" href="../../node_modules/@fontsource/noto-sans-tc/800.css">
  <style>
    :root{--navy:#0c2d47;--ink:#15324a;--teal:#10b5a4;--teal-dark:#087f74;--mint:#ddf7f3;--blue:#4089e8;--blue-pale:#e8f1ff;--orange:#f39a43;--orange-pale:#fff0e2;--red:#eb6557;--red-pale:#fdebe8;--gray:#668095;--line:#dde9ee;--paper:#f3f8fa;--white:#fff}
    *{box-sizing:border-box}html,body{margin:0;background:#cbd6db;font-family:"Noto Sans TC",sans-serif;color:var(--ink)}body{display:flex;flex-direction:column;align-items:center;gap:20px;padding:20px}
    .slide{position:relative;width:1280px;height:720px;overflow:hidden;background:var(--paper);padding:23px 60px 34px;border-top:6px solid var(--teal);page-break-after:always;break-after:page}.slide:last-child{page-break-after:auto;break-after:auto}
    header{height:35px;display:flex;justify-content:space-between;align-items:center}.brand{display:flex;align-items:center;gap:10px}.brand img{width:28px;height:28px}.brand b{font-size:18px;color:var(--navy)}.brand span{font-size:12px;color:var(--gray);margin-left:4px}header em{font-style:normal;font-size:12px;font-weight:800;color:var(--teal-dark)}
    .head{margin-top:14px}.head h1{margin:0;font-size:35px;line-height:1.15;color:var(--navy);letter-spacing:-1px}.head p{margin:8px 0 0;font-size:15px;color:var(--gray)}
    .pill{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:6px 13px;background:var(--mint);color:var(--teal-dark);font-size:12px;font-weight:800;letter-spacing:.04em}.pill.orange{background:var(--orange-pale);color:#c57420}.pill.blue{background:var(--blue-pale);color:var(--blue)}.pill.red{background:var(--red-pale);color:var(--red)}
    .cover{padding-left:70px}.cover:after{content:"";position:absolute;width:460px;height:460px;border-radius:50%;right:-45px;top:-110px;background:var(--mint);z-index:0}.cover .cover-brand{display:flex;align-items:center;gap:12px;margin-top:44px}.cover .cover-brand img{width:44px}.cover .cover-brand b{font-size:23px;color:var(--navy)}.cover .cover-copy{position:relative;z-index:2;width:650px;margin-top:58px}.cover h1{font-size:52px;line-height:1.05;margin:20px 0 12px;color:var(--navy);letter-spacing:-2px}.cover h2{font-size:26px;margin:0;color:var(--teal-dark)}.cover p{font-size:17px;line-height:1.8;color:var(--gray);width:610px}.roles{display:flex;gap:10px;margin-top:24px}.metric{margin-top:35px;width:565px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px 22px;display:flex;align-items:center;gap:16px}.metric span{font-size:12px;font-weight:800;color:var(--gray)}.metric strong{font-size:31px;color:var(--navy)}.metric p{font-size:13px;line-height:1.5;margin:0;width:auto;color:var(--ink)}.cover .phone{position:absolute;right:125px;top:69px;z-index:2;height:570px}
    .phone{position:relative;margin:0;height:498px;width:auto;aspect-ratio:390/844;border:7px solid #fff;border-radius:28px;overflow:hidden;box-shadow:0 13px 30px rgba(31,64,83,.19);background:#fff}.phone img{width:100%;height:100%;object-fit:cover}.phone figcaption{position:absolute;left:14px;top:14px;padding:5px 11px;background:rgba(255,255,255,.94);border-radius:999px;font-size:11px;font-weight:800;color:var(--teal-dark);box-shadow:0 3px 10px rgba(25,63,82,.12)}
    .flow{display:flex;gap:26px;margin-top:45px}.flow-card{position:relative;width:210px;height:245px;border-radius:18px;background:#fff;border:1px solid var(--line);padding:22px 18px}.flow-card:not(:last-child):after{content:"›";position:absolute;right:-22px;top:92px;color:#b9cbd3;font-size:34px;font-weight:800}.flow-card .num{display:flex;width:50px;height:50px;border-radius:50%;align-items:center;justify-content:center;background:var(--mint);color:var(--teal-dark);font-weight:800}.flow-card small{position:absolute;right:15px;top:28px;background:var(--blue-pale);color:var(--blue);border-radius:20px;padding:4px 9px;font-weight:800}.flow-card h3{font-size:21px;color:var(--navy);margin:23px 0 9px}.flow-card p{font-size:13px;color:var(--gray);line-height:1.6}.flow-card b{position:absolute;left:18px;bottom:19px;color:var(--teal-dark);font-size:12px}.formula{margin-top:34px;border-radius:18px;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;gap:24px;height:92px;font-size:17px;font-weight:800}.formula span{color:#91ddd5}.formula em{font-style:normal;color:#ffe1be;font-size:14px;margin-left:25px}
    .feature-grid{display:grid;grid-template-columns:500px 1fr;gap:45px;margin-top:27px;align-items:center}.phones{display:flex;gap:26px;align-items:center}.phones .phone{height:472px}.feature-copy{height:480px;display:flex;flex-direction:column}.feature-copy h2{font-size:21px;line-height:1.5;color:var(--navy);margin:18px 0 16px}.steps{list-style:none;padding:0;margin:0;counter-reset:step}.steps li{counter-increment:step;position:relative;padding:10px 0 10px 45px;font-size:15px;font-weight:650;color:var(--ink)}.steps li:before{content:counter(step);position:absolute;left:0;top:8px;width:30px;height:30px;border-radius:50%;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}.quote{margin-top:auto;border-radius:15px;background:var(--navy);color:#fff;padding:15px 20px;font-size:16px;font-weight:800}.timeline{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:8px;margin-top:14px}.timeline div{background:var(--mint);border-radius:12px;padding:9px 11px;display:flex;flex-direction:column}.timeline b{font-size:10px;color:var(--teal-dark)}.timeline span{font-size:13px;font-weight:800;color:var(--navy);margin-top:3px}
    .alert-grid{grid-template-columns:320px 1fr}.alert-grid .phone{height:500px;margin-left:40px}.triptych{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px}.triptych article{background:#fff;border:1px solid var(--line);border-radius:15px;padding:17px}.triptych b{font-size:11px;color:var(--teal-dark)}.triptych h3{font-size:16px;color:var(--navy);margin:12px 0 7px}.triptych p{font-size:12px;line-height:1.55;color:var(--gray);margin:0}
    .desktop-grid{grid-template-columns:790px 1fr;gap:38px}.desktop-shot{position:relative;width:790px;height:494px;border:7px solid #fff;border-radius:16px;overflow:hidden;box-shadow:0 13px 30px rgba(31,64,83,.18)}.desktop-shot img{width:100%;height:100%;object-fit:cover}.desktop-shot figcaption{position:absolute;left:16px;top:16px;padding:5px 11px;background:rgba(255,255,255,.94);border-radius:999px;font-size:11px;font-weight:800;color:var(--teal-dark)}.desktop-grid .feature-copy h2{font-size:19px}.desktop-grid .steps li{font-size:14px}.desktop-grid .quote{font-size:15px}
    .sop-phases{display:grid;grid-template-columns:1.1fr 1.15fr 2.2fr 1.4fr 1.65fr;gap:12px;margin-top:37px}.phase{height:155px;border-radius:17px;padding:19px;color:#fff;background:var(--navy)}.phase:nth-child(2){background:var(--blue)}.phase:nth-child(3){background:var(--teal)}.phase:nth-child(4){background:var(--orange)}.phase b{font-size:12px;opacity:.9}.phase h3{font-size:20px;margin:12px 0 8px}.phase p{font-size:12px;line-height:1.5;margin:0}.check-area{display:grid;grid-template-columns:2.1fr 1fr;gap:34px;margin-top:35px}.check-area h2{font-size:22px;color:var(--navy);margin:0 0 13px}.checks{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px}.checks span{position:relative;padding-left:31px;font-size:13px;font-weight:650;line-height:1.55}.checks span:before{content:"✓";position:absolute;left:0;top:0;width:22px;height:22px;border-radius:50%;background:var(--mint);color:var(--teal-dark);display:flex;align-items:center;justify-content:center;font-weight:900}.narration{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px 22px}.narration b{font-size:12px;color:var(--orange)}.narration p{font-size:14px;color:var(--gray);margin:8px 0}.narration strong{font-size:15px;color:var(--navy)}
    .handoff{display:grid;grid-template-columns:1fr 280px;gap:28px;margin-top:35px}.route-table{border-collapse:separate;border-spacing:0 7px;width:100%;font-size:13px}.route-table th{background:var(--navy);color:#fff;text-align:left;padding:11px}.route-table th:first-child,.route-table td:first-child{text-align:center}.route-table td{background:#fff;padding:10px 11px}.route-table tr td:first-child{font-weight:800;color:var(--teal-dark)}.wording{background:#fff;border:1px solid var(--line);border-radius:17px;padding:22px}.wording h3{margin:0 0 16px;color:var(--navy)}.wording span{display:block;padding:7px 0 7px 27px;position:relative;font-size:14px;font-weight:700}.wording span:before{content:"";position:absolute;left:0;top:12px;width:12px;height:12px;border-radius:50%;background:var(--teal)}.caution{margin-top:18px;background:var(--orange-pale);border-radius:15px;padding:15px 20px;font-size:13px;line-height:1.6;color:var(--navy);font-weight:650}.endline{margin-top:15px;color:var(--teal-dark);font-size:16px;font-weight:800}
    @page{size:13.333in 7.5in;margin:0}@media print{html,body{background:#fff}body{display:block;padding:0}.slide{margin:0}}
  </style>
</head>
<body>
  <section class="slide cover">
    <div class="cover-brand"><img src="../../../frontend/public/assets/logo-sprout.svg"><b>Fellow｜學伴</b></div>
    <div class="cover-copy"><span class="pill">HACKATHON DEMO KIT</span><h1>5 個功能 × 30 秒</h1><h2>操作截圖、旁白與錄影分鏡</h2><p>從一位學生的提問開始，連結學習、生活協助、教師行動與匿名政策洞察。</p><div class="roles"><span class="pill blue">學生端</span><span class="pill">教師端</span><span class="pill orange">政府端</span></div><div class="metric"><span>總片長</span><strong>2:30</strong><p>每段只有一個任務、三個操作、一道清楚的結果。</p></div></div>
    ${phoneHtml(rel("home.png"), "學生首頁")}
  </section>

  <section class="slide">${featureHead("DEMO STORY", "一條完整閉環，拆成五支短片", "每段可以獨立觀看；連續播放時，會形成從個人到系統的故事。", 2)}
    <div class="flow">${flowCards.map(([n,role,title,note])=>`<article class="flow-card"><span class="num">${n}</span><small>${role}</small><h3>${title}</h3><p>${note}</p><b>30 秒</b></article>`).join("")}</div>
    <div class="formula"><span>共同節奏</span>問題情境 → 一個關鍵操作 → 可見的結果 → 對人的價值 <em>每支片最多 3 個主要點擊</em></div>
  </section>

  <section class="slide">${featureHead("01 · STUDENT LEARNING", "AI 學習問答＋互動教學動畫", "把「聽過公式」變成「親手調整後真的看懂」。", 3)}
    <div class="feature-grid"><div class="phones">${phoneHtml(rel("learning-product-overview.png"), "選主題")}${phoneHtml(rel("learning-newton-interactive.png"), "動手理解")}</div><div class="feature-copy"><span class="pill blue">30 秒腳本</span><h2>學生卡在牛頓力學時，學伴先回答，再讓他直接改變力與質量，觀察加速度如何變化。</h2>${stepsHtml(["選擇「牛頓力學」","播放動畫並調整一個參數","停在公式結果與理解檢核"])}<div class="quote">「學生不只拿到答案，還能看見變化、動手驗證。」</div>${timelineHtml([["0–5s","提出卡點"],["5–20s","操作動畫"],["20–30s","確認理解"]])}</div></div>
  </section>

  <section class="slide">${featureHead("02 · RESOURCE GUIDANCE", "個人化公共資源推薦", "不必先知道補助名稱，從生活情境開始整理可行方向。", 4)}
    <div class="feature-grid"><div class="phones">${phoneHtml(rel("resources-2.png"), "六類入口")}${phoneHtml(rel("category-education-390.png"), "就學情境")}</div><div class="feature-copy"><span class="pill orange">30 秒腳本</span><h2>學生描述學費與生活費壓力後，學伴整理可能資源、待確認條件、應備資料與政府窗口。</h2>${stepsHtml(["從六類問題選擇「就學」","顯示可能符合與待確認條件","打開資料清單或政府來源"])}<div class="quote">「把模糊的求助，整理成可以立刻採取的下一步。」</div>${timelineHtml([["0–6s","描述情境"],["6–22s","查看條件"],["22–30s","帶走下一步"]])}</div></div>
  </section>

  <section class="slide">${featureHead("03 · PROACTIVE SUPPORT", "主動通知與下一步提醒", "從「等學生來問」進一步變成「重要時刻主動出現」。", 5)}
    <div class="feature-grid alert-grid">${phoneHtml(rel("alerts-2.png"), "通知中心")}<div class="feature-copy"><span class="pill red">30 秒腳本</span><h2>重要公告、申請截止與學習回覆被整理在同一處；每則提醒都說清楚「為什麼提醒」與可以採取的行動。</h2><div class="triptych"><article><b>01</b><h3>看見優先級</h3><p>重要、系統與全部通知分流</p></article><article><b>02</b><h3>理解原因</h3><p>不是只丟一個標題，而是說明觸發依據</p></article><article><b>03</b><h3>立即行動</h3><p>查看詳情或標示已讀，降低遺漏</p></article></div><div class="quote">「真正的陪伴，是在關鍵時刻讓人不錯過協助。」</div>${timelineHtml([["0–6s","未讀提醒"],["6–22s","打開詳情"],["22–30s","確認行動"]])}</div></div>
  </section>

  <section class="slide">${featureHead("04 · TEACHER ACTION", "教師學習洞察與複習計畫", "把大量互動整理成下一堂課可以採取的教學行動。", 6)}
    <div class="feature-grid desktop-grid"><figure class="desktop-shot"><img src="${rel("teacher.png")}" alt="教師端工作台"><figcaption>教師端</figcaption></figure><div class="feature-copy"><span class="pill">30 秒腳本</span><h2>工作台先指出班級共同卡點與需要關注的學生，再連到教學動畫與複習安排。</h2>${stepsHtml(["查看最常遇到的概念","打開學生或主題詳情","加入複習計畫"])}<div class="quote">「洞察的終點不是圖表，而是下一次教學。」</div>${timelineHtml([["0–8s","看全班"],["8–22s","找卡點"],["22–30s","排複習"]])}</div></div>
  </section>

  <section class="slide">${featureHead("05 · PUBLIC INSIGHT", "政府匿名需求洞察", "保護個人隱私，同時讓地方需求被看見。", 7)}
    <div class="feature-grid desktop-grid"><figure class="desktop-shot"><img src="${rel("government.png")}" alt="政府端工作台"><figcaption>政府端</figcaption></figure><div class="feature-copy"><span class="pill orange">30 秒腳本</span><h2>政府端只看匿名彙整後的教育與資源需求，可切換地區、期間，追蹤快速升高的主題。</h2>${stepsHtml(["掃過整體需求 KPI","切換行政區或期間","打開趨勢或匯出摘要"])}<div class="quote">「從一個人的求助，看見整個地區的服務缺口。」</div>${timelineHtml([["0–8s","看總量"],["8–22s","找地區"],["22–30s","追趨勢"]])}</div></div>
  </section>

  <section class="slide">${featureHead("RECORDING SOP", "每支 30 秒，固定同一個節奏", "畫面只負責證明功能；旁白負責說清楚價值。", 8)}
    <div class="sop-phases"><article class="phase"><b>0–3 秒</b><h3>功能名</h3><p>一行說明誰遇到什麼問題</p></article><article class="phase"><b>3–8 秒</b><h3>情境</h3><p>讓評審知道目前角色與任務</p></article><article class="phase"><b>8–23 秒</b><h3>關鍵操作</h3><p>最多 3 個點擊；每次點擊後停 1 秒</p></article><article class="phase"><b>23–28 秒</b><h3>結果</h3><p>停在最能證明價值的畫面</p></article><article class="phase"><b>28–30 秒</b><h3>片尾</h3><p>Fellow｜把一個問題變成下一步</p></article></div>
    <div class="check-area"><div><h2>錄影前 3 分鐘檢查</h2><div class="checks">${["1920×1080、瀏覽器縮放 100%","關閉書籤列、通知、DevTools 與私人分頁","預先開好 5 個網址，重設操作狀態","問題先複製好；避免現場慢慢輸入","每段錄 3 take，旁白後製加入","片頭與片尾使用相同字體、色彩與 Logo"].map(x=>`<span>${x}</span>`).join("")}</div></div><aside class="narration"><b>旁白原則</b><p>不要說：「我現在點這裡。」</p><strong>改成說：「這一步讓學生知道接下來能做什麼。」</strong></aside></div>
  </section>

  <section class="slide">${featureHead("HANDOFF", "錄影網址與資料口徑", "開拍前照這張表逐一確認，避免在評審面前誤述產品狀態。", 9)}
    <div class="handoff"><table class="route-table"><thead><tr><th>片段</th><th>功能</th><th>網址</th><th>結尾畫面</th></tr></thead><tbody>${[["01","學習動畫","/learning-chat.html?topic=newton","公式＋參數結果"],["02","資源推薦","/resource-chat.html?category=education","可能符合＋下一步"],["03","主動通知","/alerts.html","提醒原因＋行動"],["04","教師洞察","/teacher.html","卡點＋複習安排"],["05","政府洞察","/government.html","匿名需求＋趨勢"]].map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table><aside class="wording"><h3>建議用語</h3>${["示範情境","可能符合","待確認條件","匿名彙整","協助整理下一步"].map(x=>`<span>${x}</span>`).join("")}</aside></div>
    <div class="caution"><b>錄影口徑：</b>目前頁面以 Demo／示範資料呈現。除非錄影前已完成並驗證即時後端串接，請不要宣稱已連接即時政府資料、完成正式資格判定或提供真實 AI 即時服務。</div><div class="endline">固定片尾：Fellow｜學伴 — 把一個問題，變成下一步。</div>
  </section>
</body>
</html>`;

const htmlPath = path.join(outDir, "Fellow-黑客松-Demo-投影片.html");
fs.writeFileSync(htmlPath, html, "utf8");

const scriptText = `# Fellow｜學伴：5 支 30 秒 Demo 旁白稿\n\n` + [
  ["01 AI 學習問答＋互動動畫", "學生問一個不懂的物理概念，學伴不只回答，還用互動動畫讓他看見力、質量與加速度的變化，最後用理解檢核確認是否真的看懂。"],
  ["02 個人化公共資源推薦", "當學生遇到學費壓力，不需要先知道補助名稱；只要描述情況，學伴就能整理可能的資源、待確認條件、應備資料與下一步窗口。"],
  ["03 主動通知", "學伴不只是等學生提問，也會把重要公告、申請截止與學習回覆主動送到學生面前，並說明提醒原因與可以採取的行動。"],
  ["04 教師洞察", "教師不必逐一翻看所有對話；工作台會整理班級常見的理解卡點與需要關注的學生，並直接連到教學動畫與複習安排。"],
  ["05 政府匿名需求洞察", "個別學生的身分與對話不會出現在政府端；決策者看到的是匿名彙整後的教育與資源需求，用來掌握地區差異與快速升高的主題。"],
].map(([title, body]) => `## ${title}\n\n${body}\n`).join("\n") + `\n## 固定片尾\n\nFellow｜學伴 — 把一個問題，變成下一步。\n`;
fs.writeFileSync(path.join(outDir, "Demo-30秒旁白稿.md"), scriptText, "utf8");

console.log(JSON.stringify({ outDir, pptxPath, htmlPath }, null, 2));
