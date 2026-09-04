export const chatHistory = [
  { group: "今天", items: [{ title: "3/4 ÷ 1/2 怎麼算？", time: "10:24" }] },
  {
    group: "本週",
    items: [
      { title: "農作物受損有什麼補助？", time: "11/18" },
      { title: "家裡有災害應該怎麼辦？", time: "11/17" },
      { title: "申請助學金需要什麼文件？", time: "11/16" },
    ],
  },
  {
    group: "本月",
    items: [
      { title: "弱勢家庭有哪些生活補助？", time: "11/12" },
      { title: "農業貸款條件是什麼？", time: "11/08" },
    ],
  },
];

export const resourceCategories = [
  { key: "disaster", label: "災害", description: "颱風、地震…", color: "#FFF1E8" },
  { key: "agriculture", label: "農業", description: "農作物、設備…", color: "#E9F9EE" },
  { key: "education", label: "就學", description: "學費、獎助學金…", color: "#EBF4FF" },
  { key: "economy", label: "經濟", description: "生活補助…", color: "#FFF8DF" },
  { key: "health", label: "健康", description: "醫療、心理…", color: "#EAF8FF" },
  { key: "other", label: "其他", description: "其他問題…", color: "#EEF2FA" },
];

export const recommendedResources = [
  { title: "農業天然災害救助", agency: "農業部", status: "可能符合", tone: "orange" },
  { title: "弱勢家庭兒少生活扶助", agency: "衛生福利部", status: "可能符合", tone: "red" },
  { title: "就學貸款", agency: "教育部", status: "符合條件", tone: "blue" },
];

export const alertItems = [
  {
    id: "alert-1",
    kind: "critical",
    title: "重要提醒",
    date: "11/20",
    message: "你所在的地區有新的農業天然災害救助公告",
    reason: "因為你的家庭資料中有「從事農業」。",
  },
  {
    id: "alert-2",
    kind: "information",
    title: "就學補助申請即將截止",
    date: "11/18",
    message: "112 學年度第 2 學期就學補助申請將於 11/30 截止",
    reason: "因為你目前設定為學生，且關注就學資源。",
  },
  {
    id: "alert-3",
    kind: "learning",
    title: "你的問題有新回覆",
    date: "11/17",
    message: "關於「3/4 ÷ 1/2 怎麼算？」已經準備好練習題",
    reason: "因為你最近詢問過分數除法。",
  },
];

export const learningGaps = [
  { topic: "分數", count: 42 },
  { topic: "百分率", count: 31 },
  { topic: "圓面積", count: 18 },
  { topic: "應用題", count: 12 },
  { topic: "比例", count: 9 },
];

export const resourceNeeds = [
  { topic: "農業災損", percentage: 37 },
  { topic: "就學補助", percentage: 28 },
  { topic: "經濟支援", percentage: 19 },
  { topic: "升學資訊", percentage: 16 },
  { topic: "健康照護", percentage: 9 },
];
