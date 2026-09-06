import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const judgeDir = path.join(projectRoot, "docs", "judges");
const assetsDir = path.join(judgeDir, "assets");
const sourceScreens = path.join(projectRoot, ".screenshots");
const fontSourceDir = path.join(projectRoot, "node_modules", "@fontsource", "noto-sans-tc");
const guideFontDir = path.join(assetsDir, "fonts");
const guideFontFilesDir = path.join(guideFontDir, "files");

fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(guideFontFilesDir, { recursive: true });

const imageMap = {
  "logo.svg": path.join(projectRoot, "frontend/public/assets/logo-sprout.svg"),
  "mascot.png": path.join(projectRoot, "frontend/public/assets/mascot-home-v2.png"),
  "home.png": path.join(sourceScreens, "home.png"),
  "learning-topics.png": path.join(sourceScreens, "learning-product-overview.png"),
  "learning-simulation.png": path.join(sourceScreens, "learning-newton-interactive.png"),
  "resource-categories.png": path.join(sourceScreens, "resources-2.png"),
  "resource-result.png": path.join(sourceScreens, "category-education-390.png"),
  "alerts.png": path.join(sourceScreens, "alerts-2.png"),
  "teacher-overview.png": path.join(sourceScreens, "teacher-1440-0.png"),
  "teacher-students.png": path.join(sourceScreens, "teacher-1440-1.png"),
  "teacher-insights.png": path.join(sourceScreens, "teacher-1440-2.png"),
  "teacher-resources.png": path.join(sourceScreens, "teacher-1440-3.png"),
  "government-overview.png": path.join(sourceScreens, "government-1440-0.png"),
  "government-education.png": path.join(sourceScreens, "government-1440-1.png"),
  "government-resources.png": path.join(sourceScreens, "government-1440-2.png"),
  "government-regions.png": path.join(sourceScreens, "government-1440-3.png"),
  "government-trends.png": path.join(sourceScreens, "government-1440-4.png"),
};

for (const [target, source] of Object.entries(imageMap)) {
  if (!fs.existsSync(source)) throw new Error(`Missing screenshot: ${source}`);
  fs.copyFileSync(source, path.join(assetsDir, target));
}

for (const weight of ["400", "700"]) {
  fs.copyFileSync(path.join(fontSourceDir, `${weight}.css`), path.join(guideFontDir, `${weight}.css`));
  for (const name of fs.readdirSync(path.join(fontSourceDir, "files"))) {
    if (name.endsWith(`-${weight}-normal.woff2`)) {
      fs.copyFileSync(path.join(fontSourceDir, "files", name), path.join(guideFontFilesDir, name));
    }
  }
}

const features = [
  {
    id: "learning",
    no: "01",
    file: "01-學習問答與互動動畫",
    role: "學生端",
    title: "學習問答與互動教學動畫",
    short: "讓抽象概念變得看得見、能操作、可檢核。",
    accent: "#4089e8",
    soft: "#e8f1ff",
    entry: "../learning-chat.html?topic=newton",
    route: "/learning-chat.html?topic=newton",
    cover: "learning-topics.png",
    coverKind: "phone",
    vision: "偏鄉學生不該因為少一次課後提問機會，就只能把不懂的概念帶回家。學伴把提問、教材依據、互動觀察與理解檢核放在同一條學習路徑。",
    problem: [
      ["使用者", "正在自學、缺少即時協助的學生"],
      ["原本阻力", "公式能背，但抽象關係無法在腦中形成畫面"],
      ["學伴承諾", "先用結構化步驟回答，再用動畫與練習驗證理解"],
    ],
    design: ["學習回答採結構化卡片呈現，不只輸出一整段文字。", "教學服務依學生程度選用教材，完成解釋後形成可追蹤的學習卡點。"],
    objectives: ["找到六個理化主題入口", "讀懂回答步驟與教材來源", "操作動畫參數並觀察結果", "完成理解檢核與追問"],
    prerequisites: ["以學生角色進入 Demo", "建議從牛頓力學情境開始", "預留約 3 分鐘完成完整體驗", "Demo 專用模式已準備示範內容，可直接依教學操作"],
    journey: ["提出卡點", "檢索教材", "結構化解釋", "動畫操作", "理解檢核", "形成學習訊號"],
    steps: [
      { title: "選擇主題或直接提問", action: "開啟教學動畫頁，選擇「牛頓力學」。也可以從學生首頁輸入相關問題。", look: "畫面會顯示六個支援主題，以及依問題建立的學伴回答。", tip: "Demo 建議問題：物體受力了，為什麼不一定會加速？", image: "learning-topics.png", kind: "phone" },
      { title: "閱讀解釋與教材依據", action: "先閱讀回答摘要與分段步驟，再點教材引用查看本次使用的原創示範教材片段。", look: "每一步可對應來源；不是只有一段無法追溯的文字。", tip: "評審重點：回答結構由 response_type 驅動，前端使用專用 Learning Answer 元件。", image: "learning-topics.png", kind: "phone" },
      { title: "調整力與質量", action: "進入動畫後，拖曳「合力 F」與「質量 m」滑桿，觀察推車與公式結果。", look: "加速度會依 a = F ÷ m 即時更新；固定力時，質量越大，加速度越小。", tip: "先把力調大，再把質量調大，最容易看出兩種變因的差異。", image: "learning-simulation.png", kind: "phone" },
      { title: "用練習與追問收尾", action: "點「我想試試」完成理解題；若仍不清楚，可用「再解釋一次」或建議追問。", look: "回答與來源保存在對話歷史；重新整理後仍可重新開啟。", tip: "新提問會增加問答訊號，但不會憑空假造動畫觀看或練習完成紀錄。", image: "learning-simulation.png", kind: "phone" },
    ],
    dataFlow: ["學生問題", "learning mode", "教材 RAG", "結構化回答", "Primary learning_gap", "教師授權摘要"],
    privacy: ["學生的完整對話不會進入政府工作台。", "教師只在授權範圍查看教學摘要與學習訊號。", "每則訊息最多建立一個主要 Insight，避免重複放大。"],
    boundaries: ["目前使用 Demo 專用模型與原創示範內容。", "支援六個理化主題與各三個既有追問；超出範圍會明確提示。", "JPEG／PNG 可上傳；Demo 畫面依文字題目提供教學回答。"],
    outcomes: ["學生能說明力、質量與加速度的關係", "可以打開教材來源核對回答依據", "可完成練習並延伸追問", "歷史與來源快照由後端持久保存"],
    judge: ["回答不是純聊天泡泡，而是可教學的結構。", "動畫不是裝飾；參數與公式結果同步變化。", "個人提問只轉成最小必要的學習訊號。"],
    script: [["0–5 秒", "選牛頓力學並提出卡點"], ["5–20 秒", "調整力與質量，觀察 a 的變化"], ["20–27 秒", "打開理解檢核或教材來源"], ["27–30 秒", "停在公式結果：看見、操作、驗證"]],
    trouble: [["頁面顯示不支援", "改用六個理化主題範圍內的問題。"], ["圖片沒有被解題", "請補上題目文字，以完整呈現 Demo 解題流程。"], ["額度已用完", "依頁面提示稍後再試；重新登入不會重置。"]],
  },
  {
    id: "resources",
    no: "02",
    file: "02-公共資源推薦",
    role: "學生／家庭",
    title: "個人化公共資源推薦",
    short: "把模糊的求助，整理成可能方案與下一步。",
    accent: "#f39a43",
    soft: "#fff0e2",
    entry: "../resources.html",
    route: "/resources.html",
    cover: "resource-result.png",
    coverKind: "phone",
    vision: "學生與家庭往往知道自己遇到困難，卻不知道補助名稱、承辦單位或要準備什麼。學伴讓使用者從生活語言出發，再以保守、可追溯的方式整理資源方向。",
    problem: [
      ["使用者", "面臨就學、農損、經濟或健康需求的學生與家庭"],
      ["原本阻力", "政策資訊分散，資格文字難懂，也容易錯過應備資料"],
      ["學伴承諾", "說明可能符合的原因、缺少條件、資料清單與洽詢窗口"],
    ],
    design: ["快速分類入口與個人化推薦清楚分流，讓使用者知道目前所在步驟。", "相似度只用於尋找候選方案；資格採保守判斷，敏感資料必須先取得同意。"],
    objectives: ["分辨分類提問與個人化推薦", "用生活情境開始一次資源查詢", "讀懂可能符合與待確認條件", "完成文件清單並核對來源"],
    prerequisites: ["以學生角色進入 Demo", "建議使用「就學」或「農業」情境", "不需要先知道政策名稱", "不要輸入真實身分證號、病歷或完整私人資料"],
    journey: ["描述困難", "政策檢索", "候選排序", "保守資格說明", "文件與來源", "匿名需求訊號"],
    steps: [
      { title: "從六類需求開始", action: "進入資源頁，從災害、農業、就學、經濟、健康、其他中選擇最接近的類別。", look: "上方是「快速分類提問」；下方則是依 Profile 整理的推薦，兩者用途不同。", tip: "不知道分類時選「其他」，不必先猜政策名稱。", image: "resource-categories.png", kind: "phone" },
      { title: "用自己的話描述情況", action: "以就學情境說明：快開學了，家裡收入不穩，學費和生活費有什麼資源？", look: "系統會回傳資源卡片，而不是只列搜尋結果。", tip: "Demo 也支援災害、農業、經濟、健康與其他，共六類。", image: "resource-result.png", kind: "phone" },
      { title: "讀懂資格狀態", action: "依序閱讀「可能符合」、「為什麼可能符合」與「還需要確認」。", look: "畫面刻意避免承諾正式核定；未知期限與網址不會被編造。", tip: "Embedding 只用於找候選與排序，不能直接判定正式資格。", image: "resource-result.png", kind: "phone" },
      { title: "帶走可執行的下一步", action: "打開應備資料清單、政府來源與快捷追問；需要時再同意讓學伴記住結構化資訊。", look: "只有按下「幫我記住」才寫入 Profile；選「不用」不會儲存。", tip: "清單是諮詢準備，不代表已送件或已獲核定。", image: "resource-result.png", kind: "phone" },
    ],
    dataFlow: ["生活情境", "resource mode", "政策 RAG", "Eligibility ranking", "資源卡片", "Primary resource_need"],
    privacy: ["Agent 只能建議記憶，不能自動保存敏感 Profile。", "完整對話與家庭細節不會送進政府工作台。", "政府只接收地區、主題、數量與趨勢等匿名聚合。"],
    boundaries: ["目前政策內容為原創示範資料，不是即時政府公告。", "資格狀態是初步方向，不是正式審查結果。", "未知來源網址、截止日或承辦細節會保留為待確認。"],
    outcomes: ["知道應先聯絡哪個機關或校內窗口", "理解已符合線索與仍待確認條件", "取得可勾選的文件準備清單", "可選擇是否保存有助未來提醒的結構化記憶"],
    judge: ["使用者不用懂政策語言，也能開始。", "系統刻意保守，不把推薦說成核定。", "同意式記憶把便利與隱私放在同一流程。"],
    script: [["0–6 秒", "從六類入口選擇「就學」"], ["6–18 秒", "讀可能符合與待確認條件"], ["18–27 秒", "打開文件清單或政府來源"], ["27–30 秒", "停在下一步：向學校承辦窗口確認"]],
    trouble: [["找不到完全相同情境", "選最接近分類，或使用「其他」整理需求。"], ["沒有正式截止日", "Demo 不猜測日期；依頁面提示向主管機關確認。"], ["不想保存資訊", "選「不用」即可；沒有同意就不寫入記憶。"]],
  },
  {
    id: "alerts",
    no: "03",
    file: "03-主動通知與下一步提醒",
    role: "學生端",
    title: "主動通知與下一步提醒",
    short: "在重要時刻，說清楚為什麼提醒與能做什麼。",
    accent: "#eb6557",
    soft: "#fdebe8",
    entry: "../alerts.html",
    route: "/alerts.html",
    cover: "alerts.png",
    coverKind: "phone",
    vision: "真正的陪伴不只是在被提問時回答，也要在公告、期限或學習回覆出現時，主動把訊息送到正確的人面前，而且讓對方理解收到提醒的原因。",
    problem: [
      ["使用者", "容易錯過公告、申請期限或學習回覆的學生"],
      ["原本阻力", "通知散落各處；收到推播時也不知道與自己有何關係"],
      ["學伴承諾", "依地區與已同意的 Profile 配對，附上原因與清楚行動"],
    ],
    design: ["每一則個人化通知都必須回答「為什麼我會收到？」。", "提醒依地區與使用者已同意的資料進行簡單、可解釋的匹配。"],
    objectives: ["辨識全部、重要與系統通知", "閱讀每則通知的觸發原因", "打開詳情並前往對應功能", "標記已讀並驗證狀態保存"],
    prerequisites: ["以學生角色進入 Demo", "Profile 中的地區／家庭特徵會影響匹配", "通知為示範 Catalog，不是即時政府推播", "已讀狀態由後端保存，重新整理後仍存在"],
    journey: ["公告 Catalog", "Profile／地區匹配", "說明提醒原因", "查看詳情", "採取行動", "保存已讀狀態"],
    steps: [
      { title: "先看未讀與優先級", action: "進入通知頁，先看「全部」未讀數，再切換「重要」或「系統」。", look: "顏色、類型與數量讓使用者先處理最急迫的提醒。", tip: "Demo 中可能同時出現農損公告、助學截止與學習回覆。", image: "alerts.png", kind: "phone" },
      { title: "確認為什麼收到", action: "閱讀卡片內的「為什麼提醒你？」。", look: "系統會指出與所在地區、已設定身分或最近提問的關聯。", tip: "這是可解釋通知，不是黑箱推薦。", image: "alerts.png", kind: "phone" },
      { title: "打開詳情與下一步", action: "點「查看詳情」，閱讀完整內容，再前往資源、學習或其他對應頁面。", look: "詳情抽屜會保留原因、內容與明確 CTA。", tip: "先讓評審看原因，再點行動，比只展示通知列表更有說服力。", image: "alerts.png", kind: "phone" },
      { title: "標記已讀並重新整理", action: "點「我知道了」，確認未讀數下降，再重新整理頁面。", look: "已讀狀態仍然保存；也可以將通知從清單移除或還原。", tip: "已讀紀錄屬於登入學生，不會與其他角色共用。", image: "alerts.png", kind: "phone" },
    ],
    dataFlow: ["Alert Catalog", "地區／Profile 規則", "Matched Alert", "原因與詳情", "Read Record", "後端持久化"],
    privacy: ["通知匹配使用結構化 Profile，而不是把完整對話拿來廣播。", "每位使用者的 read_at 紀錄分開保存。", "教師與政府角色不能讀取學生私人通知。"],
    boundaries: ["Demo 通知使用專用示範資料，不是即時政府公告。", "通知提供資訊與入口，不代表替使用者完成申請或預約。", "個人化理由必須可理解，不應只顯示『系統推薦』。"],
    outcomes: ["能快速辨識重要通知", "理解收到通知的原因", "可直接前往對應的學習或資源流程", "重新整理後已讀狀態仍保持"],
    judge: ["主動性：產品不是被動聊天機器人。", "可解釋性：每則提醒都交代匹配原因。", "持久性：已讀狀態由真實 API 與資料庫保存。"],
    script: [["0–6 秒", "顯示三則未讀與分類"], ["6–17 秒", "指出『為什麼提醒你』"], ["17–25 秒", "打開詳情或對應入口"], ["25–30 秒", "標記已讀並看到未讀數下降"]],
    trouble: [["沒有看到農業提醒", "確認學生 Profile 地區與家庭特徵是否符合示範規則。"], ["已經是已讀", "可還原通知，或用未讀的另一則示範。"], ["期待即時政府公告", "目前使用 Demo 專用通知資料；文件會明確標示。"]],
  },
  {
    id: "teacher",
    no: "04",
    file: "04-教師學習洞察與複習計畫",
    role: "教師端",
    title: "教師學習洞察與複習計畫",
    short: "把大量互動轉成下一堂課可以採取的行動。",
    accent: "#10b5a4",
    soft: "#ddf7f3",
    entry: "../teacher.html",
    route: "/teacher.html",
    cover: "teacher-overview.png",
    coverKind: "desktop",
    vision: "老師需要的不是更多原始訊息，而是能快速辨識共同卡點、需要關注的學生，以及下一堂課最值得採取的教學行動。",
    problem: [
      ["使用者", "同時照顧多個班級與不同學習進度的教師"],
      ["原本阻力", "零散提問難以快速看出共同概念與優先順序"],
      ["學伴承諾", "以授權摘要呈現概念卡點，再直接銜接動畫與複習計畫"],
    ],
    design: ["教師畫面以學習指標、概念卡點與需要關注的訊號為核心。", "每次互動只保留主要學習訊號，教師僅讀取經授權的學習摘要。"],
    objectives: ["使用班級、科目與期間篩選", "辨識最常遇到的概念卡點", "查看學生學習詳情", "開啟教材並安排複習計畫"],
    prerequisites: ["從教師入口建立教師角色 session", "工作台為 Desktop First，建議寬度 1280px 以上", "學生與政府角色不能呼叫教師 API", "複習計畫目前保存在此瀏覽器 localStorage"],
    journey: ["學習互動", "Primary Insight", "班級授權聚合", "概念／學生排序", "教學動畫", "複習計畫"],
    steps: [
      { title: "用總覽抓住全班狀態", action: "先確認提問數、學習學生與需要關注數，再查看最常遇到的學習困難。", look: "同一組篩選控制 KPI、圖表、學生與趨勢，避免數字口徑不一致。", tip: "先講共同卡點，再進到個別學生，故事最清楚。", image: "teacher-overview.png", kind: "desktop" },
      { title: "切換班級、科目與期間", action: "依教學情境切換班級、物理／化學與統計期間；也可匯出目前範圍的班級摘要。", look: "所有卡片會使用同一組授權事件重新計算。", tip: "評審可注意篩選後 KPI、卡點與學生列表會一致更新。", image: "teacher-students.png", kind: "desktop" },
      { title: "從卡點深入學生與主題", action: "在學習洞察查看最需要鞏固的概念，或點學生查看提問、正確率、動畫與理解線索。", look: "系統提供『先確認怎麼想，再搭配動畫與練習』的教學建議。", tip: "提問多不等於能力差；頁面把訊號描述成需要了解的線索。", image: "teacher-insights.png", kind: "desktop" },
      { title: "轉成複習計畫", action: "開啟對應教學動畫，或按「安排複習」設定主題、班級／學生與日期。", look: "計畫可分待複習與已完成；教材預覽維持教師角色，不建立學生對話。", tip: "這一步是 Demo 的關鍵：洞察必須落到下一次教學。", image: "teacher-resources.png", kind: "desktop" },
    ],
    dataFlow: ["學生互動", "learning_gap", "授權班級事件", "KPI／概念排序", "學生摘要", "教學行動"],
    privacy: ["教師只能看授權班級與教學用途資料。", "教材預覽不會冒用學生身分或建立學生對話。", "家庭資源細節與政府匿名聚合不會混進教師工作台。"],
    boundaries: ["提問次數是學習訊號，不是成績或能力標籤。", "複習計畫與教師偏好目前保存在此瀏覽器。", "教師端呈現摘要與建議，仍需透過課堂互動確認學生狀況。"],
    outcomes: ["能找出全班共同概念卡點", "能辨識需要進一步了解的學生", "可從洞察直接開啟相符教材", "能建立可追蹤的複習安排"],
    judge: ["同一資料範圍驅動 KPI、圖表與明細。", "洞察文案避免把提問或答錯污名化。", "從洞察到動畫與複習，形成可行動閉環。"],
    script: [["0–7 秒", "掃過 KPI 與共同卡點"], ["7–17 秒", "切換篩選或點開學生"], ["17–26 秒", "開啟概念教學建議"], ["26–30 秒", "按下安排複習，停在計畫表單"]],
    trouble: [["畫面沒有資料", "確認登入的是教師角色，並清除過窄的篩選條件。"], ["教材開啟後像學生頁", "教師預覽沿用同分頁角色，但不會建立學生對話。"], ["換瀏覽器看不到計畫", "複習計畫目前是該瀏覽器 localStorage。"]],
  },
  {
    id: "government",
    no: "05",
    file: "05-政府匿名需求洞察",
    role: "政府端",
    title: "政府匿名需求洞察",
    short: "保護個人隱私，同時讓地方需求被看見。",
    accent: "#0c2d47",
    soft: "#e5eef4",
    entry: "../government.html",
    route: "/government.html",
    cover: "government-overview.png",
    coverKind: "desktop",
    vision: "單一求助不應被公開，但許多相似需求經過最小化與匿名聚合後，可以成為資源配置的重要訊號。政府端的價值是看見趨勢，而不是看見個人。",
    problem: [
      ["使用者", "需要掌握地方教育與生活資源缺口的決策者"],
      ["原本阻力", "需求訊號分散、延遲，且分析過程容易碰觸不必要個資"],
      ["學伴承諾", "只以地區、主題、數量與趨勢提供可追蹤的匿名聚合"],
    ],
    design: ["政府畫面聚焦決策價值，但不顯示姓名、完整對話或家庭個資。", "政府端只讀匿名洞察事件，不讀取學生原始訊息。"],
    objectives: ["閱讀整體 KPI 與熱門需求", "切換期間與行政區", "查看地區熱度與需求趨勢", "追蹤主題並匯出相同口徑摘要"],
    prerequisites: ["從政府入口建立政府角色 session", "工作台為 Desktop First", "政府角色不能讀學生 Profile、對話或上傳圖片", "追蹤與偏好目前保存在此瀏覽器 localStorage"],
    journey: ["Primary Insight", "移除個人識別", "地區／主題聚合", "期間比較", "趨勢洞察", "資源配置討論"],
    steps: [
      { title: "先讀總覽 KPI", action: "查看互動事件、資源需求、待關注需求與熱門主題占比。", look: "總覽只呈現計數與聚合；不會出現姓名、user_id 或對話內容。", tip: "先說資料邊界，再說洞察價值，能建立評審信任。", image: "government-overview.png", kind: "desktop" },
      { title: "切換期間與需求主題", action: "在教育需求與資源使用分頁切換期間、地區，查看就學、升學、科學學習或資源類別。", look: "KPI、卡片、圖表與匯出都使用同一次篩選範圍。", tip: "百分比由同一組計數推導，而不是手動填入。", image: "government-education.png", kind: "desktop" },
      { title: "比較地區熱度", action: "進入地區分析，查看六區排序；點行政區打開主題與前期變化詳情。", look: "地圖是概念視覺，需求件數與排序來自聚合 API，不宣稱是真實 GIS。", tip: "可以用旗山區作為示範，接著銜接農損需求。", image: "government-regions.png", kind: "desktop" },
      { title: "追蹤趨勢並匯出", action: "在趨勢洞察查看本期與前期，將值得關注的地區／主題加入追蹤，或匯出彙整 CSV。", look: "追蹤、圖表與 CSV 仍只有匿名群組資料。", tip: "把趨勢描述成『需要確認的訊號』，不是直接宣告政策因果。", image: "government-trends.png", kind: "desktop" },
    ],
    dataFlow: ["Primary Insight", "Region＋Topic", "SQL 聚合", "Count／Percentage", "Trend", "匿名 Dashboard／CSV"],
    privacy: ["Raw Conversation ≠ Government Insight。", "政府 API 不回傳 user_id、暱稱、conversation_id、家庭細節或原始訊息。", "只允許 Region、Topic、Count、Percentage、Trend 與 Aggregated Insight。"],
    boundaries: ["目前數據是固定 Demo dataset，不代表真實政策成效。", "地圖是區域概念圖，不是 GIS 邊界或即時災情圖。", "洞察是值得調查的訊號，仍需搭配正式統計與行政程序。"],
    outcomes: ["能掌握需求量與熱門主題", "能比較期間與行政區差異", "能追蹤快速升高的匿名需求", "能匯出與畫面同口徑的聚合資料"],
    judge: ["政府端完全不需要、也不能看到原始對話。", "所有圖表與 CSV 共用同一組篩選聚合。", "產品把個人協助延伸成可驗證的地方需求訊號。"],
    script: [["0–7 秒", "指出 KPI 與熱門需求"], ["7–16 秒", "切到地區分析並選旗山區"], ["16–25 秒", "查看本期／前期趨勢"], ["25–30 秒", "停在匿名欄位與匯出按鈕"]],
    trouble: [["找不到學生姓名", "這是正確結果：政府端設計上不提供個人資料。"], ["地圖與真實行政邊界不同", "目前是概念圖，重點是匿名聚合與排序。"], ["追蹤換瀏覽器消失", "政府追蹤與偏好目前保存在該瀏覽器。"]],
  },
];

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const list = (items, className = "check-list") => `<ul class="${className}">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;

function nav(feature) {
  const sections = [["cover", "先理解功能"], ["why", "願景與問題"], ["prepare", "開始前準備"], ["steps-one", "操作步驟 1–2"], ["steps-two", "操作步驟 3–4"], ["result", "效果與資料邊界"], ["challenge", "評審實作挑戰"]];
  return `<aside class="guide-nav screen-only"><a class="mini-brand" href="index.html"><img src="assets/logo.svg" alt=""><span>評審導覽</span></a><div class="nav-progress"><span data-progress-label>0 / 7</span><div><i data-progress-bar></i></div></div><nav>${sections.map(([id, label], index) => `<a href="#${id}" data-nav-section="${id}"><b>${index + 1}</b><span>${label}</span></a>`).join("")}</nav><div class="nav-actions"><button type="button" data-print>列印／另存 PDF</button><a href="final-demo.html">Final Demo</a></div></aside>`;
}

function pageHeader(feature, page, label) {
  return `<div class="page-header"><div><img src="assets/logo.svg" alt=""><strong>學伴</strong><span>${esc(feature.no)} · ${esc(feature.role)} · ${esc(label)}</span></div><b>${page} / 7</b></div>`;
}

function heroImage(feature, image = feature.cover, kind = feature.coverKind) {
  return `<figure class="hero-image ${kind}"><img src="assets/${image}" alt="${esc(feature.title)}操作畫面"><figcaption>實際操作畫面</figcaption></figure>`;
}

function renderSimulator(id) {
  if (id === "learning") return `<div class="simulator learning-sim" data-simulator="learning"><div class="sim-head"><b>互動體驗：推力與質量</b><span>調整滑桿</span></div><div class="cart-stage"><div class="cart" data-cart><span>5 kg</span><i></i><i></i></div><div class="force-arrow">合力 →</div></div><label>合力 F <output data-force-out>10 N</output><input data-force type="range" min="2" max="20" value="10"></label><label>質量 m <output data-mass-out>5 kg</output><input data-mass type="range" min="1" max="10" value="5"></label><div class="formula-box">a = F ÷ m = <strong data-acceleration>2.0</strong> m/s²</div><button type="button" data-sim-play>播放推車</button></div>`;
  if (id === "resources") return `<div class="simulator resource-sim" data-simulator="resources"><div class="sim-head"><b>互動體驗：需求整理</b><span data-resource-status>待選擇</span></div><div class="category-buttons">${["災害", "農業", "就學", "經濟", "健康", "其他"].map((x) => `<button type="button" data-category="${x}">${x}</button>`).join("")}</div><p class="sim-prompt" data-resource-copy>請先選擇最接近的需求類別。</p><label class="sim-check"><input type="checkbox" data-resource-condition> 家庭收入近期出現變動</label><label class="sim-check"><input type="checkbox" data-resource-condition> 目前有學費或生活費需求</label><div class="recommendation" data-resource-result>選擇「就學」並勾選情況，看看推薦如何改變。</div></div>`;
  if (id === "alerts") return `<div class="simulator alert-sim" data-simulator="alerts"><div class="sim-head"><b>互動體驗：通知中心</b><span><i data-unread>2</i> 則未讀</span></div><div class="alert-tabs"><button type="button" class="active" data-alert-tab="all">全部</button><button type="button" data-alert-tab="critical">重要</button><button type="button" data-alert-tab="system">系統</button></div><article data-alert-card data-type="critical"><b>重要提醒</b><p>你所在的地區有新的農業天然災害救助公告。</p><small>因為所在地與已同意的農業資料符合示範規則。</small><button type="button" data-mark-read>我知道了</button></article><article data-alert-card data-type="system"><b>就學補助申請即將截止</b><p>查看學校窗口與應備資料。</p><small>因為目前設定為學生，且關注就學資源。</small><button type="button" data-mark-read>我知道了</button></article></div>`;
  if (id === "teacher") return `<div class="simulator teacher-sim" data-simulator="teacher"><div class="sim-head"><b>互動體驗：概念優先序</b><span data-plan-status>尚未安排</span></div><button type="button" class="topic-row active" data-topic="熵與熱力學第二定律" data-count="14"><span>熵與熱力學第二定律</span><i style="--value:92%"></i><b>14</b></button><button type="button" class="topic-row" data-topic="反應速率與活化能" data-count="14"><span>反應速率與活化能</span><i style="--value:92%"></i><b>14</b></button><button type="button" class="topic-row" data-topic="化學鍵與氫鍵" data-count="6"><span>化學鍵與氫鍵</span><i style="--value:42%"></i><b>6</b></button><div class="teacher-choice"><span>下一堂課建議</span><strong data-topic-choice>熵與熱力學第二定律</strong><button type="button" data-plan>＋ 安排重點複習</button></div></div>`;
  return `<div class="simulator government-sim" data-simulator="government"><div class="sim-head"><b>互動體驗：匿名地區需求</b><span>只有聚合欄位</span></div><div class="region-buttons"><button type="button" class="active" data-region="旗山區" data-events="425" data-needs="215">旗山區</button><button type="button" data-region="六龜區" data-events="408" data-needs="213">六龜區</button><button type="button" data-region="甲仙區" data-events="357" data-needs="188">甲仙區</button></div><div class="gov-metrics"><article><span>互動事件</span><b data-event-total>425</b></article><article><span>資源需求</span><b data-need-total>215</b></article><article><span>個人姓名</span><b class="blocked">不提供</b></article></div><div class="mini-trend"><i style="height:40%"></i><i style="height:58%"></i><i style="height:68%"></i><i style="height:64%"></i><i style="height:73%"></i><i style="height:62%"></i><i style="height:52%"></i></div><p data-region-copy>旗山區 · 聚合資料，不含姓名或原始對話</p></div>`;
}

function renderStep(feature, step, index) {
  return `<article class="step-card" data-guide-step="${index + 1}"><div class="step-copy"><span class="step-number">${index + 1}</span><div><h3>${esc(step.title)}</h3><p><b>怎麼做：</b>${esc(step.action)}</p><p><b>會看到：</b>${esc(step.look)}</p><aside>${esc(step.tip)}</aside></div></div><figure class="step-shot ${step.kind}"><img src="assets/${step.image}" alt="步驟 ${index + 1}：${esc(step.title)}"><button type="button" class="hotspot screen-only" aria-label="標記步驟 ${index + 1} 完成">${index + 1}</button></figure></article>`;
}

function renderFeature(feature, featureIndex) {
  const next = features[(featureIndex + 1) % features.length];
  const problemCards = feature.problem.map(([title, text]) => `<article><span>${esc(title)}</span><p>${esc(text)}</p></article>`).join("");
  const flow = feature.journey.map((item, index) => `<span><b>${index + 1}</b>${esc(item)}</span>`).join("");
  const dataFlow = feature.dataFlow.map((item, index) => `<span><b>${index + 1}</b>${esc(item)}</span>`).join("");
  const script = feature.script.map(([time, action]) => `<article><b>${esc(time)}</b><p>${esc(action)}</p></article>`).join("");
  const trouble = feature.trouble.map(([issue, answer]) => `<details><summary>${esc(issue)}</summary><p>${esc(answer)}</p></details>`).join("");
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(feature.title)}評審操作教學"><title>${esc(feature.no)}｜${esc(feature.title)}｜Fellow 學伴</title><link rel="stylesheet" href="assets/guide.css"></head><body data-feature="${feature.id}" style="--accent:${feature.accent};--soft:${feature.soft}">${nav(feature)}<main class="manual">
  <section class="manual-page cover-page observe" id="cover">${pageHeader(feature, 1, "功能總覽")}<div class="cover-grid"><div class="cover-copy"><span class="eyebrow">${esc(feature.role)} · JUDGE GUIDE</span><h1>${esc(feature.title)}</h1><p class="lead">${esc(feature.short)}</p><blockquote>${esc(feature.vision)}</blockquote><div class="cover-actions screen-only"><a href="${feature.entry}" target="_blank" rel="noopener">開啟實際 Demo</a><button type="button" data-complete-guide>完成本教學</button></div><div class="route-chip"><span>Demo 專用入口</span><code>${esc(feature.route)}</code></div></div>${heroImage(feature)}</div></section>

  <section class="manual-page observe" id="why">${pageHeader(feature, 2, "願景與問題")}<div class="section-title"><span>WHY IT MATTERS</span><h2>這個功能解決什麼問題？</h2><p>從使用者阻力出發，再看它在整體服務中的位置。</p></div><div class="problem-grid">${problemCards}</div><div class="journey"><h3>使用者價值路徑</h3><div class="flow-row">${flow}</div></div><div class="design-note"><strong>產品設計原則</strong>${feature.design.map((item) => `<p>${esc(item)}</p>`).join("")}</div></section>

  <section class="manual-page observe" id="prepare">${pageHeader(feature, 3, "開始前準備")}<div class="section-title"><span>QUICK START</span><h2>開始前，先知道角色、入口與成功條件</h2></div><div class="prepare-grid"><div><div class="route-card"><span>${esc(feature.role)}</span><h3>${esc(feature.title)}</h3><code>${esc(feature.route)}</code><a class="screen-only" href="${feature.entry}" target="_blank" rel="noopener">在新分頁開啟 ↗</a></div><h3 class="subhead">準備事項</h3>${list(feature.prerequisites)}<h3 class="subhead">完成後，你應該能夠</h3>${list(feature.objectives, "number-list")}</div>${renderSimulator(feature.id)}</div></section>

  <section class="manual-page observe" id="steps-one">${pageHeader(feature, 4, "操作步驟 1–2")}<div class="section-title compact"><span>GUIDED WALKTHROUGH</span><h2>先完成入口與核心理解</h2><p>點截圖上的號碼可以標記進度；PDF 版本可直接依文字操作。</p></div><div class="steps-grid">${renderStep(feature, feature.steps[0], 0)}${renderStep(feature, feature.steps[1], 1)}</div></section>

  <section class="manual-page observe" id="steps-two">${pageHeader(feature, 5, "操作步驟 3–4")}<div class="section-title compact"><span>GUIDED WALKTHROUGH</span><h2>從操作走到可見的結果</h2><p>這兩步是評審最容易判斷產品價值的畫面。</p></div><div class="steps-grid">${renderStep(feature, feature.steps[2], 2)}${renderStep(feature, feature.steps[3], 3)}</div></section>

  <section class="manual-page observe" id="result">${pageHeader(feature, 6, "效果與資料邊界")}<div class="section-title compact"><span>OUTCOME & TRUST</span><h2>完成後看見什麼？資料又如何被保護？</h2></div><div class="result-grid"><div><h3>可驗證成果</h3>${list(feature.outcomes)}<h3>評審值得注意</h3>${list(feature.judge, "star-list")}</div><div><h3>資料路徑</h3><div class="data-flow">${dataFlow}</div><h3>隱私原則</h3>${list(feature.privacy, "lock-list")}</div></div><div class="boundary"><strong>目前 Demo 邊界</strong>${feature.boundaries.map((item) => `<span>${esc(item)}</span>`).join("")}</div></section>

  <section class="manual-page observe" id="challenge">${pageHeader(feature, 7, "評審實作挑戰")}<div class="section-title compact"><span>TRY IT YOURSELF</span><h2>30 秒看懂，3 分鐘親手完成</h2></div><div class="challenge-grid"><div><h3>30 秒展示腳本</h3><div class="script-timeline">${script}</div><h3>常見狀況</h3><div class="trouble">${trouble}</div></div><div class="mission"><span class="eyebrow">JUDGE MISSION</span><h3>請親手完成這個任務</h3><p>${esc(feature.objectives.at(-1))}</p><label><input type="checkbox" data-mission-check> 我已看到操作結果</label><label><input type="checkbox" data-mission-check> 我理解目前資料邊界</label><button type="button" data-complete-guide>標記本功能完成</button><a href="${feature.entry}" target="_blank" rel="noopener">開啟實際 Demo ↗</a><a class="next-guide" href="${next.file}.html">下一份：${esc(next.title)} →</a><a class="final-link" href="final-demo.html">進入 Final Demo</a></div></div></section>
  </main><div class="toast screen-only" role="status" aria-live="polite" data-toast></div><script src="assets/guide.js"></script></body></html>`;
}

const css = String.raw`
@import url("fonts/400.css");
@import url("fonts/700.css");
:root{--navy:#0c2d47;--ink:#15324a;--teal:#10b5a4;--teal-dark:#087f74;--mint:#ddf7f3;--paper:#eef5f7;--white:#fff;--gray:#647d91;--line:#d9e7ec;--orange:#f39a43;--red:#eb6557;--accent:#10b5a4;--soft:#ddf7f3;scroll-behavior:smooth}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;color:var(--ink);background:var(--paper)}button,a,input{font:inherit}button,a{transition:.2s ease}a{color:inherit}.guide-nav{position:fixed;z-index:20;left:20px;top:20px;bottom:20px;width:220px;background:var(--navy);border-radius:22px;padding:22px 16px;box-shadow:0 18px 50px rgba(7,38,60,.22);color:#fff;display:flex;flex-direction:column}.mini-brand{display:flex;align-items:center;gap:10px;text-decoration:none;padding:0 8px 17px;border-bottom:1px solid rgba(255,255,255,.12)}.mini-brand img{width:30px;filter:brightness(0) invert(1)}.mini-brand span{font-size:18px;font-weight:800}.nav-progress{padding:18px 8px 12px}.nav-progress span{font-size:11px;color:#a8d9d4}.nav-progress div{height:5px;background:rgba(255,255,255,.14);border-radius:9px;margin-top:7px;overflow:hidden}.nav-progress i{display:block;height:100%;width:0;background:#55d8ca;border-radius:9px;transition:.35s}.guide-nav nav{display:grid;gap:4px}.guide-nav nav a{display:flex;gap:10px;align-items:center;text-decoration:none;padding:9px;border-radius:11px;color:#c8d7df;font-size:12px}.guide-nav nav a:hover,.guide-nav nav a.active{background:rgba(69,202,189,.18);color:#fff}.guide-nav nav b{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.1);font-size:10px}.guide-nav nav a.seen b{background:var(--teal);color:#fff}.nav-actions{margin-top:auto;display:grid;gap:8px}.nav-actions button,.nav-actions a{border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;border-radius:11px;padding:10px;text-align:center;text-decoration:none;cursor:pointer;font-size:12px;font-weight:700}.nav-actions a{background:var(--teal);border-color:var(--teal)}.manual{margin-left:260px;padding:20px}.manual-page{position:relative;width:min(1122px,calc(100vw - 300px));min-height:720px;margin:0 auto 24px;background:#f7fbfc;border-radius:24px;padding:26px 42px 34px;overflow:hidden;box-shadow:0 12px 36px rgba(22,59,79,.09);border-top:6px solid var(--accent)}.manual-page.observe{opacity:.35;transform:translateY(14px);transition:opacity .55s,transform .55s}.manual-page.observe.visible{opacity:1;transform:none}.page-header{height:34px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:10px}.page-header>div{display:flex;align-items:center;gap:9px}.page-header img{width:24px;height:24px}.page-header strong{font-size:15px;color:var(--navy)}.page-header span{font-size:10px;color:var(--gray)}.page-header>b{font-size:10px;color:var(--accent)}.eyebrow,.section-title>span{display:inline-flex;padding:6px 11px;border-radius:999px;background:var(--soft);color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.08em}.cover-grid{height:625px;display:grid;grid-template-columns:1.25fr .75fr;gap:46px;align-items:center}.cover-copy h1{font-size:42px;line-height:1.16;margin:20px 0 10px;color:var(--navy);letter-spacing:-1.5px}.cover-copy .lead{font-size:20px;font-weight:700;color:var(--accent);margin:0 0 24px}.cover-copy blockquote{font-size:15px;line-height:1.9;color:var(--gray);border-left:5px solid var(--accent);margin:0;padding:4px 0 4px 20px;max-width:610px}.cover-actions{display:flex;gap:10px;margin-top:25px}.cover-actions a,.cover-actions button,.mission>a,.mission>button{border:0;border-radius:12px;padding:11px 17px;background:var(--accent);color:#fff;text-decoration:none;font-weight:800;cursor:pointer}.cover-actions button{background:var(--navy)}.route-chip{margin-top:25px;display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);border-radius:13px;padding:12px 15px;width:max-content;max-width:100%}.route-chip span{font-size:10px;font-weight:800;color:var(--gray)}.route-chip code{font-size:11px;color:var(--navy);overflow-wrap:anywhere}.hero-image{position:relative;margin:0;border:8px solid #fff;background:#fff;box-shadow:0 15px 40px rgba(29,68,89,.18);overflow:hidden}.hero-image.phone{height:540px;width:250px;border-radius:31px;justify-self:center}.hero-image.desktop{width:440px;height:330px;border-radius:18px}.hero-image img{width:100%;height:100%;object-fit:cover;object-position:top}.hero-image.desktop img{object-position:left top}.hero-image figcaption,.step-shot .hotspot{position:absolute;top:13px;left:13px;border-radius:999px;background:rgba(255,255,255,.94);color:var(--accent);padding:6px 11px;font-size:9px;font-weight:800;border:0;box-shadow:0 4px 13px rgba(20,48,68,.15)}.section-title{margin:22px 0 20px}.section-title h2{font-size:29px;margin:10px 0 4px;color:var(--navy);letter-spacing:-.6px}.section-title p{font-size:12px;color:var(--gray);margin:0}.section-title.compact{margin-bottom:12px}.problem-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.problem-grid article{min-height:140px;padding:19px;background:#fff;border:1px solid var(--line);border-radius:16px}.problem-grid span{font-size:10px;color:var(--accent);font-weight:800}.problem-grid p{font-size:14px;line-height:1.7;font-weight:650;color:var(--navy);margin:12px 0 0}.journey{margin-top:20px;background:var(--navy);border-radius:18px;padding:16px 20px;color:#fff}.journey h3{font-size:13px;color:#8ee0d7;margin:0 0 13px}.flow-row,.data-flow{display:flex;gap:16px;align-items:center}.flow-row span,.data-flow span{position:relative;display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;flex:1}.flow-row span:not(:last-child):after,.data-flow span:not(:last-child):after{content:"→";position:absolute;right:-12px;color:#7bcfc6}.flow-row b,.data-flow b{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:var(--accent);color:#fff;font-size:9px}.design-note{display:grid;grid-template-columns:150px 1fr;gap:6px 18px;background:var(--soft);border-radius:16px;padding:16px 20px;margin-top:18px}.design-note strong{grid-row:1/3;color:var(--accent);font-size:12px}.design-note p{font-size:11px;line-height:1.55;margin:0;color:var(--navy)}.prepare-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:30px;align-items:start}.route-card{padding:18px 20px;background:var(--navy);color:#fff;border-radius:17px}.route-card span{font-size:10px;color:#8fe0d8}.route-card h3{font-size:20px;margin:8px 0}.route-card code{display:block;font-size:11px;color:#d6e9f0}.route-card a{display:inline-block;margin-top:13px;color:#fff;font-size:11px;font-weight:800}.subhead{font-size:14px;color:var(--navy);margin:17px 0 8px}.check-list,.number-list,.star-list,.lock-list{list-style:none;margin:0;padding:0;display:grid;gap:7px}.check-list li,.number-list li,.star-list li,.lock-list li{position:relative;padding-left:27px;font-size:11px;line-height:1.52}.check-list li:before,.number-list li:before,.star-list li:before,.lock-list li:before{position:absolute;left:0;top:0;width:19px;height:19px;border-radius:50%;display:grid;place-items:center;background:var(--soft);color:var(--accent);font-size:9px;font-weight:900}.check-list li:before{content:"✓"}.number-list{counter-reset:item}.number-list li{counter-increment:item}.number-list li:before{content:counter(item)}.star-list li:before{content:"★"}.lock-list li:before{content:"◆"}.simulator{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 20px;min-height:410px;box-shadow:0 8px 22px rgba(26,62,80,.07)}.sim-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px}.sim-head b{color:var(--navy);font-size:15px}.sim-head span{font-size:10px;color:var(--accent);background:var(--soft);border-radius:99px;padding:5px 9px}.cart-stage{height:115px;background:linear-gradient(#f0faf9,#fff);border-radius:14px;position:relative;overflow:hidden}.cart{position:absolute;left:45px;bottom:28px;width:110px;height:43px;border:3px solid var(--accent);border-radius:12px;background:var(--soft);display:grid;place-items:center;font-size:12px;font-weight:800;transition:transform 1s ease}.cart i{position:absolute;width:17px;height:17px;background:var(--navy);border-radius:50%;bottom:-12px}.cart i:first-of-type{left:17px}.cart i:last-of-type{right:17px}.force-arrow{position:absolute;left:167px;bottom:43px;color:var(--accent);font-weight:800}.learning-sim label{display:grid;grid-template-columns:1fr auto;gap:5px;margin-top:12px;font-size:11px;font-weight:700}.learning-sim input{grid-column:1/3;width:100%;accent-color:var(--accent)}.formula-box{background:var(--soft);border-radius:12px;padding:12px;text-align:center;margin-top:12px;color:var(--navy)}.simulator>button,.teacher-choice button{border:0;border-radius:10px;padding:9px 13px;background:var(--accent);color:#fff;font-weight:800;cursor:pointer;margin-top:12px}.category-buttons,.region-buttons,.alert-tabs{display:flex;flex-wrap:wrap;gap:7px}.category-buttons button,.region-buttons button,.alert-tabs button{border:1px solid var(--line);border-radius:99px;background:#fff;padding:7px 10px;cursor:pointer;font-size:10px;font-weight:700;color:var(--navy)}.category-buttons button.active,.region-buttons button.active,.alert-tabs button.active{background:var(--accent);border-color:var(--accent);color:#fff}.sim-prompt{font-size:12px;line-height:1.6;background:var(--soft);padding:12px;border-radius:12px}.sim-check{display:block;font-size:11px;margin:10px 0}.sim-check input{accent-color:var(--accent)}.recommendation{margin-top:14px;border-left:4px solid var(--accent);background:#f5fafb;padding:13px;font-size:12px;line-height:1.55}.alert-sim article{position:relative;border:1px solid var(--line);border-radius:13px;padding:12px;margin-top:10px}.alert-sim article.read{opacity:.48}.alert-sim article b{color:var(--navy);font-size:12px}.alert-sim article p{font-size:11px;margin:6px 0}.alert-sim article small{display:block;color:var(--gray);font-size:9px;padding-right:90px}.alert-sim article button{position:absolute;right:10px;bottom:10px;border:0;background:var(--soft);color:var(--accent);border-radius:8px;padding:6px 9px;font-size:9px;cursor:pointer}.topic-row{width:100%;display:grid;grid-template-columns:180px 1fr 28px;gap:10px;align-items:center;border:0;background:transparent;padding:9px 5px;cursor:pointer;text-align:left;color:var(--navy)}.topic-row span{font-size:10px;font-weight:700}.topic-row i{height:8px;background:linear-gradient(90deg,var(--accent) var(--value),#e9f0f3 var(--value));border-radius:10px}.topic-row.active{background:var(--soft);border-radius:10px}.teacher-choice{margin-top:18px;background:#f4f9fa;border-radius:14px;padding:15px}.teacher-choice span{font-size:9px;color:var(--gray)}.teacher-choice strong{display:block;margin:5px 0;color:var(--navy)}.gov-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0}.gov-metrics article{border-radius:12px;background:#f4f9fa;padding:12px}.gov-metrics span{font-size:9px;color:var(--gray)}.gov-metrics b{display:block;font-size:22px;color:var(--navy)}.gov-metrics .blocked{font-size:14px;color:var(--red);margin-top:8px}.mini-trend{height:110px;display:flex;gap:9px;align-items:flex-end;border-bottom:1px solid var(--line);padding:0 10px}.mini-trend i{flex:1;background:linear-gradient(var(--accent),#7bddcf);border-radius:7px 7px 0 0;transition:.3s}.government-sim>p{font-size:10px;color:var(--gray)}.steps-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.step-card{height:520px;border:1px solid var(--line);border-radius:18px;background:#fff;padding:16px;display:grid;grid-template-rows:220px 1fr;gap:12px}.step-copy{display:flex;gap:12px;overflow:hidden}.step-number{flex:0 0 34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#fff;font-size:12px;font-weight:800}.step-copy h3{font-size:17px;color:var(--navy);margin:4px 0 9px}.step-copy p{font-size:10.5px;line-height:1.58;margin:7px 0;color:var(--ink)}.step-copy aside{font-size:9.3px;line-height:1.5;background:var(--soft);color:var(--navy);border-radius:10px;padding:8px 10px;margin-top:8px}.step-shot{position:relative;margin:0;border-radius:13px;background:#edf4f6;overflow:hidden}.step-shot img{width:100%;height:100%;object-fit:cover;object-position:top}.step-shot.phone img{object-fit:contain;background:#edf4f6}.step-shot.desktop img{object-position:left top}.step-shot .hotspot{left:auto;right:12px;top:12px;background:var(--accent);color:#fff;width:30px;height:30px;padding:0;cursor:pointer}.step-card.done{outline:3px solid var(--accent)}.step-card.done .hotspot:after{content:"✓"}.step-card.done .hotspot{font-size:0}.step-card.done .hotspot:after{font-size:13px}.result-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:24px}.result-grid>div{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 20px;min-height:390px}.result-grid h3{font-size:15px;color:var(--navy);margin:0 0 12px}.result-grid h3:not(:first-child){margin-top:20px}.data-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}.data-flow span{background:var(--soft);border-radius:10px;padding:8px;font-size:9px}.data-flow span:not(:last-child):after{content:none}.data-flow b{width:18px;height:18px;font-size:7px}.boundary{display:flex;gap:8px;align-items:center;margin-top:16px;background:#fff2e6;border-radius:14px;padding:13px 16px}.boundary strong{font-size:11px;color:#c6701f;min-width:90px}.boundary span{font-size:9.5px;line-height:1.45;flex:1}.challenge-grid{display:grid;grid-template-columns:1.3fr .7fr;gap:24px}.challenge-grid h3{font-size:15px;color:var(--navy);margin:0 0 10px}.script-timeline{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.script-timeline article{min-height:90px;border-radius:13px;background:var(--soft);padding:12px}.script-timeline b{font-size:9px;color:var(--accent)}.script-timeline p{font-size:10px;font-weight:700;line-height:1.5;margin:7px 0 0;color:var(--navy)}.trouble{display:grid;gap:7px}.trouble details{background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 11px}.trouble summary{font-size:10px;font-weight:800;cursor:pointer;color:var(--navy)}.trouble p{font-size:9.5px;color:var(--gray);margin:7px 0 1px}.mission{background:var(--navy);color:#fff;border-radius:18px;padding:20px;display:flex;flex-direction:column;min-height:470px}.mission h3{font-size:21px;color:#fff;margin:18px 0 6px}.mission p{font-size:13px;line-height:1.7;color:#d6e7ed}.mission label{font-size:10px;margin:7px 0}.mission input{accent-color:var(--teal)}.mission>button,.mission>a{width:100%;margin-top:9px;text-align:center;font-size:10px}.mission>button{background:var(--teal)}.mission>a{background:#fff;color:var(--navy)}.mission .next-guide{margin-top:auto;background:rgba(255,255,255,.09);color:#fff}.mission .final-link{background:var(--orange);color:#fff}.toast{position:fixed;z-index:100;right:25px;bottom:25px;background:var(--navy);color:#fff;padding:12px 17px;border-radius:12px;box-shadow:0 8px 25px rgba(0,0,0,.2);font-size:12px;opacity:0;transform:translateY(15px);pointer-events:none}.toast.show{opacity:1;transform:none}
/* Portal */
.portal-body{background:#f1f7f8}.portal{max-width:1220px;margin:auto;padding:28px 32px 70px}.portal-header{display:flex;justify-content:space-between;align-items:center}.portal-brand{display:flex;align-items:center;gap:10px;text-decoration:none}.portal-brand img{width:34px}.portal-brand strong{font-size:19px;color:var(--navy)}.portal-header nav{display:flex;gap:8px}.portal-header nav a{padding:9px 13px;border-radius:10px;text-decoration:none;font-size:12px;font-weight:700}.portal-header nav a:last-child{background:var(--navy);color:#fff}.portal-hero{display:grid;grid-template-columns:1.1fr .9fr;gap:45px;align-items:center;min-height:520px}.portal-hero h1{font-size:50px;line-height:1.1;color:var(--navy);margin:19px 0 14px;letter-spacing:-2px}.portal-hero p{font-size:17px;line-height:1.8;color:var(--gray)}.portal-hero .hero-visual{position:relative;height:410px}.portal-hero .hero-visual:before{content:"";position:absolute;inset:20px 40px;border-radius:50%;background:var(--mint)}.portal-hero .hero-visual img{position:absolute;left:50%;top:50%;width:240px;transform:translate(-50%,-47%);filter:drop-shadow(0 20px 25px rgba(13,70,78,.16))}.portal-stats{display:flex;gap:12px;margin-top:22px}.portal-stats span{background:#fff;border:1px solid var(--line);border-radius:13px;padding:12px 15px;font-size:11px;color:var(--gray)}.portal-stats b{font-size:20px;color:var(--navy);margin-right:7px}.overall-progress{background:var(--navy);border-radius:19px;color:#fff;padding:18px 22px;display:flex;align-items:center;gap:18px}.overall-progress>span{font-size:13px;font-weight:800}.overall-progress>div{height:8px;flex:1;background:rgba(255,255,255,.14);border-radius:99px;overflow:hidden}.overall-progress i{height:100%;display:block;width:0;background:#4ed4c6}.overall-progress b{font-size:13px;color:#92e2da}.portal-section{padding-top:55px}.portal-section>span{font-size:10px;color:var(--teal-dark);font-weight:800;letter-spacing:.1em}.portal-section h2{font-size:31px;color:var(--navy);margin:8px 0}.portal-section>p{color:var(--gray);font-size:14px}.feature-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:25px}.feature-card{--card-accent:var(--teal);display:grid;grid-template-columns:170px 1fr;background:#fff;border:1px solid var(--line);border-radius:19px;overflow:hidden;text-decoration:none;min-height:240px;box-shadow:0 8px 25px rgba(23,61,78,.06)}.feature-card:hover{transform:translateY(-4px);box-shadow:0 16px 35px rgba(23,61,78,.12)}.feature-card figure{margin:0;background:#eef5f6;height:240px;overflow:hidden}.feature-card figure img{width:100%;height:100%;object-fit:cover;object-position:top}.feature-card.phone figure img{object-fit:contain}.feature-card>div{padding:20px}.feature-card small{color:var(--card-accent);font-weight:800}.feature-card h3{font-size:21px;color:var(--navy);margin:9px 0}.feature-card p{font-size:12px;line-height:1.7;color:var(--gray)}.feature-card footer{display:flex;gap:8px;align-items:center;margin-top:18px}.feature-card footer span{font-size:10px;border-radius:99px;background:#edf6f7;padding:5px 8px}.feature-card footer b{margin-left:auto;color:var(--card-accent);font-size:11px}.feature-card.completed{outline:3px solid var(--teal)}.feature-card.completed footer b:before{content:"✓ 已完成 · "}.portal-final{margin-top:45px;border-radius:24px;background:linear-gradient(135deg,var(--navy),#164a65);color:#fff;padding:34px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center}.portal-final h2{font-size:28px;margin:0 0 8px}.portal-final p{color:#ccdde5;margin:0}.portal-final a{background:var(--orange);color:#fff;border-radius:13px;padding:13px 19px;text-decoration:none;font-weight:800}.portal-footer{text-align:center;color:var(--gray);font-size:11px;margin-top:55px}
/* Final demo */
.demo-shell{height:100vh;display:grid;grid-template-rows:auto 1fr;background:#eaf2f4}.demo-top{background:var(--navy);color:#fff;padding:13px 20px;display:flex;align-items:center;gap:14px}.demo-top img{width:28px;filter:brightness(0) invert(1)}.demo-top strong{font-size:16px}.demo-top p{margin:0;color:#a9c1ce;font-size:11px}.demo-top a{margin-left:auto;background:rgba(255,255,255,.1);border-radius:9px;padding:8px 11px;text-decoration:none;font-size:11px}.demo-main{display:grid;grid-template-columns:260px 1fr;min-height:0}.demo-rail{background:#fff;border-right:1px solid var(--line);padding:18px;overflow:auto}.demo-rail h1{font-size:21px;color:var(--navy);margin:4px 0}.demo-rail>p{font-size:11px;color:var(--gray);line-height:1.6}.demo-routes{display:grid;gap:8px;margin-top:17px}.demo-routes button{display:grid;grid-template-columns:30px 1fr;text-align:left;border:1px solid var(--line);border-radius:11px;background:#fff;padding:9px;cursor:pointer;color:var(--navy)}.demo-routes button.active{border-color:var(--teal);background:var(--mint)}.demo-routes b{width:24px;height:24px;border-radius:50%;background:var(--navy);color:#fff;display:grid;place-items:center;font-size:9px}.demo-routes span{font-size:10px;font-weight:800}.demo-routes small{font-size:8px;color:var(--gray);grid-column:2}.demo-controls{margin-top:16px;display:grid;gap:7px}.demo-controls button,.demo-controls a{border:0;border-radius:9px;padding:9px;background:var(--teal);color:#fff;text-align:center;text-decoration:none;font-size:10px;font-weight:800;cursor:pointer}.demo-controls a{background:var(--navy)}.demo-stage{padding:17px;min-width:0;display:grid;grid-template-rows:auto 1fr;gap:10px}.stage-head{display:flex;align-items:center;gap:10px}.stage-head span{font-size:11px;color:var(--gray)}.stage-head strong{font-size:13px;color:var(--navy)}.stage-head a{margin-left:auto;color:var(--teal-dark);font-size:10px;font-weight:800}.frame-wrap{position:relative;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 35px rgba(18,54,73,.13)}.frame-wrap iframe{border:0;width:100%;height:100%;background:#fff}.frame-hint{position:absolute;right:15px;bottom:15px;background:rgba(12,45,71,.9);color:#fff;padding:9px 12px;border-radius:10px;font-size:9px;pointer-events:none}
@media(max-width:900px){.guide-nav{display:none}.manual{margin:0;padding:8px}.manual-page{width:100%;min-height:auto;padding:22px;border-radius:16px}.cover-grid,.prepare-grid,.result-grid,.challenge-grid{grid-template-columns:1fr}.cover-grid{height:auto}.hero-image.desktop{width:100%}.hero-image{margin:20px auto}.steps-grid{grid-template-columns:1fr}.step-card{height:auto}.portal{padding:20px}.portal-hero{grid-template-columns:1fr}.portal-hero .hero-visual{display:none}.feature-cards{grid-template-columns:1fr}.demo-main{grid-template-columns:1fr}.demo-rail{display:none}}
@page{size:A4 landscape;margin:0}@media print{html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.screen-only,.toast{display:none!important}.manual{margin:0;padding:0}.manual-page{width:297mm;height:210mm;min-height:210mm;margin:0;border-radius:0;box-shadow:none;break-after:page;page-break-after:always;padding:7mm 11mm 9mm}.manual-page:last-child{break-after:auto;page-break-after:auto}.manual-page.observe{opacity:1;transform:none}.cover-grid{height:175mm}.cover-copy h1{font-size:34px}.hero-image.phone{height:150mm;width:69mm}.hero-image.desktop{width:118mm;height:91mm}.section-title{margin:5mm 0 4mm}.section-title h2{font-size:25px}.problem-grid article{min-height:35mm}.journey{margin-top:4mm}.design-note{margin-top:4mm}.simulator{min-height:108mm}.step-card{height:143mm;grid-template-rows:60mm 1fr}.result-grid>div{min-height:111mm}.mission{min-height:130mm}.trouble details[open] p{display:block}.trouble details p{display:block}.portal-body,.demo-shell{display:none}}
`;

const js = String.raw`
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const feature = document.body.dataset.feature;
  const storageKey = 'futureai-judge-progress-v1';
  const readProgress = () => { try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; } };
  const writeProgress = (value) => localStorage.setItem(storageKey, JSON.stringify(value));
  const toast = (message) => { const node = $('[data-toast]'); if (!node) return; node.textContent = message; node.classList.add('show'); clearTimeout(window.__guideToast); window.__guideToast = setTimeout(() => node.classList.remove('show'), 1800); };
  $$('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));
  const sections = $$('.manual-page');
  const seen = new Set();
  const updateSectionProgress = () => { const total = sections.length; const label = $('[data-progress-label]'); const bar = $('[data-progress-bar]'); if (label) label.textContent = seen.size + ' / ' + total; if (bar) bar.style.width = (seen.size / total * 100) + '%'; };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) return; entry.target.classList.add('visible'); seen.add(entry.target.id); const nav = $('[data-nav-section="' + entry.target.id + '"]'); if (nav) nav.classList.add('seen'); $$('.guide-nav nav a').forEach(a => a.classList.toggle('active', a === nav)); updateSectionProgress(); }), { threshold: .34 });
    sections.forEach(section => observer.observe(section));
  } else { sections.forEach(section => section.classList.add('visible')); }
  $$('[data-guide-step]').forEach(card => { const button = $('.hotspot', card); if (button) button.addEventListener('click', () => { card.classList.toggle('done'); toast(card.classList.contains('done') ? '這一步已完成' : '已取消完成標記'); }); });
  $$('[data-complete-guide]').forEach(button => button.addEventListener('click', () => { if (!feature) return; const progress = readProgress(); progress[feature] = true; writeProgress(progress); toast('本功能已標記完成，可以前往下一份教學'); button.textContent = '✓ 已完成'; }));

  const learning = $('[data-simulator="learning"]');
  if (learning) {
    const update = () => { const force = Number($('[data-force]', learning).value); const mass = Number($('[data-mass]', learning).value); $('[data-force-out]', learning).textContent = force + ' N'; $('[data-mass-out]', learning).textContent = mass + ' kg'; $('[data-acceleration]', learning).textContent = (force / mass).toFixed(1); learning.style.setProperty('--sim-distance', Math.min(250, force / mass * 42) + 'px'); };
    $$('input[type=range]', learning).forEach(input => input.addEventListener('input', update)); update();
    $('[data-sim-play]', learning).addEventListener('click', () => { const cart = $('[data-cart]', learning); cart.style.transform = 'translateX(var(--sim-distance))'; setTimeout(() => cart.style.transform = 'translateX(0)', 1200); });
  }
  const resources = $('[data-simulator="resources"]');
  if (resources) {
    let category = '';
    const update = () => { const checks = $$('[data-resource-condition]', resources).filter(x => x.checked).length; const status = $('[data-resource-status]', resources); const copy = $('[data-resource-copy]', resources); const result = $('[data-resource-result]', resources); status.textContent = category ? (checks === 2 ? '可能符合' : '待確認條件') : '待選擇'; copy.textContent = category ? '目前選擇：' + category + '。補充情況後，系統會整理候選資源。' : '請先選擇最接近的需求類別。'; result.textContent = category === '就學' && checks === 2 ? '就學貸款與助學資源｜可能符合｜下一步：向學校承辦窗口確認。' : category ? category + '資源｜仍需補充所在地與需求條件。' : '選擇「就學」並勾選情況，看看推薦如何改變。'; };
    $$('[data-category]', resources).forEach(button => button.addEventListener('click', () => { category = button.dataset.category; $$('[data-category]', resources).forEach(x => x.classList.toggle('active', x === button)); update(); }));
    $$('[data-resource-condition]', resources).forEach(input => input.addEventListener('change', update));
  }
  const alerts = $('[data-simulator="alerts"]');
  if (alerts) {
    const updateUnread = () => $('[data-unread]', alerts).textContent = $$('[data-alert-card]:not(.read)', alerts).length;
    $$('[data-alert-tab]', alerts).forEach(button => button.addEventListener('click', () => { $$('[data-alert-tab]', alerts).forEach(x => x.classList.toggle('active', x === button)); $$('[data-alert-card]', alerts).forEach(card => card.hidden = button.dataset.alertTab !== 'all' && card.dataset.type !== button.dataset.alertTab); }));
    $$('[data-mark-read]', alerts).forEach(button => button.addEventListener('click', () => { button.closest('[data-alert-card]').classList.add('read'); button.textContent = '已讀'; updateUnread(); }));
  }
  const teacher = $('[data-simulator="teacher"]');
  if (teacher) {
    $$('[data-topic]', teacher).forEach(button => button.addEventListener('click', () => { $$('[data-topic]', teacher).forEach(x => x.classList.toggle('active', x === button)); $('[data-topic-choice]', teacher).textContent = button.dataset.topic; $('[data-plan-status]', teacher).textContent = button.dataset.count + ' 次卡點訊號'; }));
    $('[data-plan]', teacher).addEventListener('click', event => { event.currentTarget.textContent = '✓ 已加入複習計畫'; $('[data-plan-status]', teacher).textContent = '已安排'; });
  }
  const government = $('[data-simulator="government"]');
  if (government) $$('[data-region]', government).forEach(button => button.addEventListener('click', () => { $$('[data-region]', government).forEach(x => x.classList.toggle('active', x === button)); $('[data-event-total]', government).textContent = button.dataset.events; $('[data-need-total]', government).textContent = button.dataset.needs; $('[data-region-copy]', government).textContent = button.dataset.region + ' · 聚合資料，不含姓名或原始對話'; $$('.mini-trend i', government).forEach((bar, index) => bar.style.height = (35 + ((Number(button.dataset.needs) + index * 13) % 43)) + '%'); }));

  const progress = readProgress();
  if (feature && progress[feature]) $$('[data-complete-guide]').forEach(button => button.textContent = '✓ 已完成');
})();
`;

const portalCards = features.map((feature) => `<a class="feature-card ${feature.coverKind}" data-feature-card="${feature.id}" href="${feature.file}.html" style="--card-accent:${feature.accent}"><figure><img src="assets/${feature.cover}" alt="${esc(feature.title)}"></figure><div><small>${feature.no} · ${esc(feature.role)}</small><h3>${esc(feature.title)}</h3><p>${esc(feature.short)}</p><footer><span>7 頁教學</span><span>互動體驗</span><b>開始導覽 →</b></footer></div></a>`).join("");

const portalHtml = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Fellow 學伴評審導覽入口"><title>評審請看這｜Fellow 學伴</title><link rel="stylesheet" href="assets/guide.css"></head><body class="portal-body"><main class="portal"><header class="portal-header"><a class="portal-brand" href="index.html"><img src="assets/logo.svg" alt=""><strong>Fellow｜學伴</strong></a><nav><a href="#guides">五份教學</a><a href="final-demo.html">Final Demo</a></nav></header><section class="portal-hero"><div><span class="eyebrow">JUDGE EXPERIENCE</span><h1>從一個問題，<br>走到能採取的下一步。</h1><p>學伴是一個面向偏鄉學生的學習與家庭資源輔助 Agent。它先幫一位學生看懂、找到協助，再把最小必要訊號轉成教師行動與政府匿名洞察。</p><div class="portal-stats"><span><b>5</b>個核心功能</span><span><b>35</b>頁完整教學</span><span><b>3</b>種角色</span></div></div><div class="hero-visual"><img src="assets/mascot.png" alt="學伴機器人"></div></section><section class="overall-progress"><span>你的導覽進度</span><div><i data-overall-bar></i></div><b data-overall-label>0 / 5</b></section><section class="portal-section" id="guides"><span>STEP-BY-STEP GUIDES</span><h2>依序理解五個功能</h2><p>每份教學都有完整 PDF、互動練習與直接開啟產品 Demo 的入口。</p><div class="feature-cards">${portalCards}</div></section><section class="portal-final"><div><h2>五個功能看完後，進入 Final Demo</h2><p>在同一個舞台切換學生、教師與政府角色，完成從提問到匿名洞察的完整故事。</p></div><a href="final-demo.html">進入完整成果 →</a></section><footer class="portal-footer">此為評審 Demo 專用入口；API、權限、持久化與三角色資料流程皆為實際串接。</footer></main><script>(${function portalProgress(){const key='futureai-judge-progress-v1';let p={};try{p=JSON.parse(localStorage.getItem(key)||'{}')}catch{}const cards=[...document.querySelectorAll('[data-feature-card]')];const done=cards.filter(card=>p[card.dataset.featureCard]);done.forEach(card=>card.classList.add('completed'));document.querySelector('[data-overall-label]').textContent=done.length+' / '+cards.length;document.querySelector('[data-overall-bar]').style.width=(done.length/cards.length*100)+'%';}.toString()})()</script></body></html>`;
const portalHtmlWithTwoMinuteDeck = portalHtml
  .replace('<nav><a href="#guides">', '<nav><a href="Fellow-兩分鐘-Demo-投影片.html">2 分鐘投影片</a><a href="#guides">')
  .replace('<section class="overall-progress">', '<section class="portal-final"><div><h2>兩分鐘影片，直接從這裡開始</h2><p>16:9 PowerPoint 式投影片，含精準 120 秒自動播放、逐頁動畫與完整旁白稿。</p></div><a href="Fellow-兩分鐘-Demo-投影片.html">開啟錄影投影片 →</a></section><section class="overall-progress">');

const demoRoutes = [
  ["01", "學習動畫", "學生提問 → 操作 → 檢核", "../learning-chat.html?topic=newton", "01-學習問答與互動動畫.html"],
  ["02", "資源推薦", "描述需求 → 條件 → 下一步", "../resource-chat.html?category=education", "02-公共資源推薦.html"],
  ["03", "主動通知", "原因 → 詳情 → 行動", "../alerts.html", "03-主動通知與下一步提醒.html"],
  ["04", "教師洞察", "卡點 → 學生 → 複習", "../teacher.html", "04-教師學習洞察與複習計畫.html"],
  ["05", "政府洞察", "匿名聚合 → 地區 → 趨勢", "../government.html", "05-政府匿名需求洞察.html"],
];
const finalHtml = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Final Demo｜Fellow 學伴</title><link rel="stylesheet" href="assets/guide.css"></head><body><div class="demo-shell"><header class="demo-top"><img src="assets/logo.svg" alt=""><div><strong>Fellow｜Final Demo</strong><p>從學生的一次提問，到教師行動與政府匿名洞察</p></div><a href="index.html">回到評審入口</a></header><main class="demo-main"><aside class="demo-rail"><span class="eyebrow">LIVE PRODUCT</span><h1>完整成果</h1><p>請依序點選五段旅程。右側會直接載入實際產品頁面；需要完整操作空間時可另開新分頁。</p><div class="demo-routes">${demoRoutes.map(([no,title,note,route,guide],index)=>`<button type="button" data-demo-route="${route}" data-guide="${guide}" ${index===0?'class="active"':''}><b>${no}</b><span>${title}</span><small>${note}</small></button>`).join("")}</div><div class="demo-controls"><button type="button" data-auto-tour>自動導覽：關閉</button><a data-open-demo href="${demoRoutes[0][3]}" target="_blank" rel="noopener">另開目前 Demo ↗</a></div></aside><section class="demo-stage"><div class="stage-head"><span>目前段落</span><strong data-stage-title>${demoRoutes[0][1]}</strong><a data-guide-link href="${demoRoutes[0][4]}">回到詳細教學</a></div><div class="frame-wrap"><iframe data-demo-frame title="Fellow 實際產品 Demo" src="${demoRoutes[0][3]}"></iframe><div class="frame-hint">此為評審 Demo 專用畫面，可直接切換角色與功能。</div></div></section></main></div><script>(${function finalDemo(){const buttons=[...document.querySelectorAll('[data-demo-route]')];const frame=document.querySelector('[data-demo-frame]');const title=document.querySelector('[data-stage-title]');const open=document.querySelector('[data-open-demo]');const guide=document.querySelector('[data-guide-link]');let index=0,timer=null;function activate(i){index=i;const button=buttons[i];buttons.forEach(x=>x.classList.toggle('active',x===button));frame.src=button.dataset.demoRoute;title.textContent=button.querySelector('span').textContent;open.href=button.dataset.demoRoute;guide.href=button.dataset.guide;}buttons.forEach((button,i)=>button.addEventListener('click',()=>{activate(i);if(timer){clearInterval(timer);timer=null;document.querySelector('[data-auto-tour]').textContent='自動導覽：關閉';}}));document.querySelector('[data-auto-tour]').addEventListener('click',event=>{if(timer){clearInterval(timer);timer=null;event.currentTarget.textContent='自動導覽：關閉';return;}event.currentTarget.textContent='自動導覽：每 12 秒切換';timer=setInterval(()=>activate((index+1)%buttons.length),12000);});}.toString()})()</script></body></html>`;

const readme = `# Fellow 學伴｜評審閱讀入口

完整產品故事、五大核心功能、氫鍵教學案例與展示素材已移至 [評審 README](../README.md)。
`;

fs.writeFileSync(path.join(assetsDir, "guide.css"), css, "utf8");
fs.writeFileSync(path.join(assetsDir, "guide.js"), js, "utf8");
features.forEach((feature, index) => fs.writeFileSync(path.join(judgeDir, `${feature.file}.html`), renderFeature(feature, index), "utf8"));
fs.writeFileSync(path.join(judgeDir, "index.html"), portalHtmlWithTwoMinuteDeck, "utf8");
fs.writeFileSync(path.join(judgeDir, "final-demo.html"), finalHtml, "utf8");
// The authored product story lives in docs/README.md; keep this legacy entry as a link.
const readmePath = path.join(judgeDir, "README.md");
if (!fs.existsSync(readmePath)) fs.writeFileSync(readmePath, readme, "utf8");

console.log(JSON.stringify({ judgeDir, htmlGuides: features.map((feature) => `${feature.file}.html`) }, null, 2));
