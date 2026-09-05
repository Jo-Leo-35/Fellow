export type ResourceCategory = "agriculture" | "disaster" | "education" | "economy" | "health" | "other";

export interface ResourceScenario {
  key: ResourceCategory;
  label: string;
  color: string;
  background: string;
  question: string;
  title: string;
  status: "可能符合" | "待確認需求";
  intro: string;
  requirements: Array<{ kind: "matched" | "confirm"; text: string }>;
  confirmationTitle: string;
  confirmationDescription: string;
  agency: string;
  applicationWindow: string;
  documents: string[];
  checklistDescription: string;
  checklistNote: string;
  nextStep: string;
  sourceDescription: string;
  sourceNote: string;
  sourceQuery: string;
  memoryLabel: string;
  followUps: Array<{ question: string; answer: string }>;
  fallbackReply: string;
}

// These sample situations demonstrate the frontend flow; they are not eligibility decisions.
export const resourceScenarios: Record<ResourceCategory, ResourceScenario> = {
  agriculture: {
    key: "agriculture",
    label: "農業",
    color: "#27A968",
    background: "#DDF5E6",
    question: "阿公的菜園被颱風吹壞了，有沒有補助可以申請？",
    title: "農業天然災害救助",
    status: "可能符合",
    intro: "我找到一個可能適合你們的資源",
    requirements: [
      { kind: "matched", text: "家裡有從事農業或照顧菜園" },
      { kind: "matched", text: "颱風造成蔬菜與農作物受損" },
      { kind: "confirm", text: "需確認菜園所在地是否列入公告區域" },
    ],
    confirmationTitle: "是否仍在所在地公告的受理期限內",
    confirmationDescription: "期限會依災害、作物與地區不同，請向公所確認。",
    agency: "農業部",
    applicationWindow: "菜園所在地公所",
    documents: [
      "申請人的身分證明與印章",
      "農地位置、地段或使用證明",
      "能看出作物與受損範圍的照片",
      "所在地公所要求的其他證明",
    ],
    checklistDescription: "以下是常見準備項目。實際文件會依地區與公告不同，送件前請再向所在地公所確認。",
    checklistNote: "先拍照保留受損狀況，但不要為了拍照進入危險區域。",
    nextStep: "下一步請向菜園所在地的公所確認公告與期限。",
    sourceDescription: "農業天然災害現金救助相關公告",
    sourceNote: "是否能申請，要以農業部最新公告的地區、作物項目與受理期間為準。",
    sourceQuery: "農業部 農業天然災害救助 公告區域",
    memoryLabel: "家裡從事農業",
    followUps: [
      {
        question: "要去哪裡申請？",
        answer: "可以先洽菜園所在地公所，說明作物種類、農地位置與受災情況，請承辦人員確認是否有適用公告，再確認申請方式。這是示範整理，還沒有替你提出申請。",
      },
      {
        question: "需要準備哪些資料？",
        answer: "先整理身分證明、農地位置或使用證明，以及作物受損照片；點「查看需要什麼資料」可以逐項勾選。實際應備文件請以所在地公所要求為準。",
      },
      {
        question: "申請期限到什麼時候？",
        answer: "這份示範沒有連接即時災害公告，無法確認截止日期。請用「農業部 農業天然災害救助 公告區域」查詢，並向菜園所在地公所確認這次災害的受理期間。",
      },
    ],
    fallbackReply: "這是農業資源互動示範。你可以接著問申請窗口、所需資料或申請期限；補充菜園所在地與作物種類，也能幫助你整理要向公所詢問的內容。訊息只留在本頁，實際資格仍需由公所確認。",
  },
  disaster: {
    key: "disaster",
    label: "災害",
    color: "#EC6250",
    background: "#FFE5DF",
    question: "家裡淹水，家具都壞了，暫時也沒地方住，可以找誰幫忙？",
    title: "災害救助與安置協助",
    status: "可能符合",
    intro: "先整理居住與生活需求，救助項目仍需確認",
    requirements: [
      { kind: "matched", text: "住家因災害受損，日常生活受到影響" },
      { kind: "matched", text: "目前有暫時住宿或生活物資需求" },
      { kind: "confirm", text: "需由地方窗口確認受災情況與可用資源" },
    ],
    confirmationTitle: "目前的住處是否安全，以及當地受理方式",
    confirmationDescription: "安置與救助的窗口、範圍及期限，請依地方政府當次公告確認。",
    agency: "所在地縣市政府社會局（處）",
    applicationWindow: "受災地公所或地方安置窗口",
    documents: [
      "受災者身分與聯絡方式",
      "受災地址及居住情況說明",
      "在安全情況下取得的受損照片或紀錄",
      "需要住宿、物資或其他協助的需求清單",
    ],
    checklistDescription: "可以先整理以下資訊，方便公所了解需求。實際申請文件由地方承辦窗口確認，安置需求可先提出。",
    checklistNote: "人身安全優先；不要為了找文件或拍照返回危險住處。",
    nextStep: "下一步請向受災地公所說明目前住處與生活需求，確認救助或安置窗口。",
    sourceDescription: "地方政府災害救助與災民收容安置資訊",
    sourceNote: "不同災害與縣市的資源、受理方式可能不同，請查詢所在地政府的最新公告。",
    sourceQuery: "所在地縣市政府 災害救助 收容安置 公所",
    memoryLabel: "想查詢災後生活協助",
    followUps: [
      {
        question: "要去哪裡找安置協助？",
        answer: "先聯絡受災地公所或地方政府公告的安置窗口，說明目前所在位置、同行人數與住宿需求，請窗口確認可用安排。本頁的示範不會替你登記或預留安置名額。",
      },
      {
        question: "需要準備哪些資料？",
        answer: "可以先整理聯絡方式、受災地址、居住情況與需要的協助，已有的受損紀錄也可一併準備。不要為了補齊資料進入危險區域；請向公所確認後續需要哪些正式文件。",
      },
      {
        question: "救助申請有期限嗎？",
        answer: "救助的受理期限依當地公告及項目而定，這個示範沒有即時期限資料。請向受災地公所確認；如果眼前沒有安全住處，可以先表達安置需求，再由窗口說明後續程序。",
      },
    ],
    fallbackReply: "這是災害協助互動示範。可以接著問安置窗口、受災資料或救助期限；也可以先整理目前最需要的是住宿、物資還是住家受損協助，再向受災地公所詢問。這裡不會送出求助案件。",
  },
  education: {
    key: "education",
    label: "就學",
    color: "#3988E8",
    background: "#E2EFFF",
    question: "快開學了，家裡最近收入不穩，學費和生活費有什麼資源可以幫忙？",
    title: "就學貸款與助學資源",
    status: "可能符合",
    intro: "先向學校確認適合的助學方案與辦理流程",
    requirements: [
      { kind: "matched", text: "目前有就學與學費支出的需求" },
      { kind: "matched", text: "家庭收入變動，影響開學費用安排" },
      { kind: "confirm", text: "需確認學制、在學身分與各方案申請條件" },
    ],
    confirmationTitle: "學校本學期的申請時程與可用方案",
    confirmationDescription: "助學金、學雜費減免與就學貸款的條件及程序不同，請由學校協助確認。",
    agency: "教育部與就讀學校",
    applicationWindow: "學務處或校內助學承辦窗口",
    documents: [
      "學生證或在學身分資料",
      "本學期學雜費繳費單",
      "家庭經濟情況或相關身分證明（依方案）",
      "學校或承貸銀行指定的申請表與文件",
    ],
    checklistDescription: "先備妥基本在學與繳費資訊，再向學校確認適合的方案。不同助學項目不一定需要相同文件。",
    checklistNote: "就學貸款涉及後續還款，請先了解條件，也可詢問是否有適用的助學金或減免。",
    nextStep: "下一步請洽校內助學窗口，確認本學期助學、減免或就學貸款的辦理時間。",
    sourceDescription: "教育部助學資訊與各校就學貸款、助學公告",
    sourceNote: "各校與各方案的資格、文件及辦理時間不同，請以教育部、學校和承貸銀行公告為準。",
    sourceQuery: "教育部 就學貸款 助學金 學校 學務處",
    memoryLabel: "想了解就學資源",
    followUps: [
      {
        question: "要去哪裡申請助學？",
        answer: "可以先向學校學務處或助學承辦窗口說明學費與生活費需求，詢問助學金、學雜費減免和就學貸款。若選擇就學貸款，接著依學校及承貸銀行指示辦理，並先了解還款義務。",
      },
      {
        question: "需要準備哪些資料？",
        answer: "先備好在學身分資料與本學期繳費單。家庭經濟證明、申請表及銀行文件會依所選方案不同，請拿資料清單向學校確認後再準備。",
      },
      {
        question: "什麼時候要辦理？",
        answer: "請查看學校本學期的助學與就學貸款公告，確認申請、銀行辦理及校內繳件時間。這份示範沒有即時日期；若已接近繳費期限，請直接向學校承辦窗口說明情況。",
      },
    ],
    fallbackReply: "這是就學資源互動示範。你可以接著問校內窗口、準備資料或申請時程，也可以先整理自己的學制與需要協助的費用項目。可申請的方案仍要由學校依實際情況確認。",
  },
  economy: {
    key: "economy",
    label: "經濟",
    color: "#DF971C",
    background: "#FFF1D2",
    question: "爸爸最近失業，家裡還有弟弟妹妹要照顧，生活費快不夠了怎麼辦？",
    title: "弱勢家庭兒少生活扶助",
    status: "可能符合",
    intro: "先整理家庭生活需求，扶助資格需由窗口評估",
    requirements: [
      { kind: "matched", text: "家庭主要收入出現變動" },
      { kind: "matched", text: "家中有兒少照顧與基本生活支出" },
      { kind: "confirm", text: "需由社福窗口了解家庭狀況與適用扶助項目" },
    ],
    confirmationTitle: "家庭狀況適用哪一種生活扶助",
    confirmationDescription: "實際扶助項目與應備文件，需依戶籍所在地規定及社工評估確認。",
    agency: "衛生福利部與所在地社會局（處）",
    applicationWindow: "戶籍地公所或社會福利服務中心",
    documents: [
      "申請人與兒少的身分、家庭成員資料",
      "家庭近期收入與必要支出說明",
      "失業或其他家庭變故的相關資料（如有）",
      "承辦窗口依扶助項目要求的證明文件",
    ],
    checklistDescription: "這份清單協助你準備諮詢。請先讓社福窗口了解家庭情況，再確認需要申請哪個項目與準備哪些正式文件。",
    checklistNote: "如果目前吃飯或基本生活已有困難，聯繫窗口時可以先說明最急迫的需求。",
    nextStep: "下一步請洽戶籍地公所或社福中心，說明收入變動與兒少照顧需求。",
    sourceDescription: "兒少生活扶助與家庭支持服務資訊",
    sourceNote: "這是可詢問的資源方向，不代表已符合補助資格；扶助內容由地方承辦單位確認。",
    sourceQuery: "衛生福利部 弱勢家庭 兒童少年 生活扶助 公所",
    memoryLabel: "想了解家庭生活扶助",
    followUps: [
      {
        question: "可以先找哪個單位？",
        answer: "可以先洽戶籍所在地公所或附近社會福利服務中心，說明家庭收入變動、孩子照顧與生活需求，請窗口協助了解可用的兒少生活扶助或其他家庭支持資源。",
      },
      {
        question: "需要準備哪些資料？",
        answer: "先整理家庭成員、近期收入支出，以及失業或家庭變故的相關資料（如有）。正式文件會依扶助項目不同，點開資料清單後可帶著問題向社福窗口確認。",
      },
      {
        question: "多久可以得到協助？",
        answer: "需要由承辦窗口了解家庭狀況及可用資源，這份示範無法預估審查時間或核定結果。請在聯繫時先說明最急迫的生活需求，並詢問後續評估、補件與聯絡方式。",
      },
    ],
    fallbackReply: "這是家庭生活扶助互動示範。你可以接著問求助窗口、準備資料或後續評估流程；實際可用的兒少扶助與家庭支持，仍需由所在地社福窗口了解情況後確認。",
  },
  health: {
    key: "health",
    label: "健康",
    color: "#3094CB",
    background: "#DEF3FF",
    question: "最近壓力很大、常常睡不好，想找人聊聊，但不知道去哪裡比較合適。",
    title: "心理諮詢與醫療協助",
    status: "待確認需求",
    intro: "先找到可以談談的窗口，再確認適合的服務",
    requirements: [
      { kind: "matched", text: "近期有壓力與睡眠方面的困擾" },
      { kind: "matched", text: "希望了解能提供支持的專業資源" },
      { kind: "confirm", text: "需確認所在地、服務需求與預約方式" },
    ],
    confirmationTitle: "適合的諮詢窗口、預約安排與費用",
    confirmationDescription: "可先向學校輔導室或所在地社區心理衛生中心詢問服務，醫療需求由專業人員評估。",
    agency: "衛生福利部與所在地衛生局",
    applicationWindow: "學校輔導室或社區心理衛生中心",
    documents: [
      "想談的困擾與對生活的影響（可先簡單記下）",
      "方便聯絡或預約的方式與時段",
      "需要先詢問的費用、隱私或陪同問題",
      "服務單位告知的預約資料（如有）",
    ],
    checklistDescription: "這是諮詢前的準備清單，不是必備申請文件。可以只整理你願意分享的資訊，再向服務單位確認預約方式。",
    checklistNote: "不必在示範頁填寫病歷或診斷資料；這裡的互動也不會替你完成預約。",
    nextStep: "下一步請向學校輔導室或所在地心理衛生中心詢問諮詢方式與可預約時段。",
    sourceDescription: "各縣市社區心理諮商與心理衛生服務資訊",
    sourceNote: "服務內容、費用與預約安排請向各地窗口確認，本示範只提供資源方向，不提供診斷。",
    sourceQuery: "衛生福利部 各縣市 社區心理諮商服務 心理衛生中心",
    memoryLabel: "想了解健康支持資源",
    followUps: [
      {
        question: "可以去哪裡找人聊聊？",
        answer: "可以先向學校輔導室，或所在地衛生局、社區心理衛生中心詢問諮詢與轉介服務。聯繫時可簡單說明困擾和希望獲得的支持，再由服務人員協助確認適合的安排。",
      },
      {
        question: "第一次諮詢要準備什麼？",
        answer: "可以先記下想談的困擾、對生活的影響，以及方便預約的時段。也可以把費用、隱私與是否能有人陪同列為問題；實際要提供哪些資料，先向服務單位確認即可。",
      },
      {
        question: "要怎麼預約下一步？",
        answer: "找到所在地心理衛生中心或學校輔導室後，詢問預約方式、可安排時段與費用。這份示範不會替你掛號或保留時段；若有醫療需求，可請窗口協助了解合適的就醫方向。",
      },
    ],
    fallbackReply: "這是健康資源互動示範，可以陪你整理想向窗口詢問的內容。你可以接著問哪裡能諮詢、第一次要準備什麼，或怎麼預約；具體健康情況需要由合適的專業人員評估。",
  },
  other: {
    key: "other",
    label: "其他",
    color: "#51799D",
    background: "#E6EEF7",
    question: "家裡最近遇到一些困難，我不確定算哪一類，也不知道該先找誰。",
    title: "社會福利諮詢與轉介",
    status: "待確認需求",
    intro: "不用先知道補助名稱，也可以從整理需求開始",
    requirements: [
      { kind: "matched", text: "希望有人協助釐清目前的生活困難" },
      { kind: "matched", text: "還不確定問題分類或負責窗口" },
      { kind: "confirm", text: "先了解所在地與最需要協助的一件事" },
    ],
    confirmationTitle: "目前最需要處理的是哪一件事",
    confirmationDescription: "可先從生活、居住、照顧或就學需求說起，再由窗口協助確認資源方向。",
    agency: "所在地縣市政府社會局（處）",
    applicationWindow: "社會福利服務中心或公所社會課",
    documents: [
      "用幾句話整理目前遇到的困難",
      "所在縣市、行政區與方便聯絡的方式",
      "希望優先處理的需求與急迫程度",
      "已詢問過的單位或現有資料（如有）",
    ],
    checklistDescription: "諮詢前不一定要備齊證明。這份清單幫你整理問題，讓窗口更容易理解需要什麼協助。",
    checklistNote: "可以先說明你願意分享的情況，正式申請時再由承辦人員告知所需資料。",
    nextStep: "下一步請找所在地社福中心或公所，先說明最急迫的一項需求。",
    sourceDescription: "社會福利服務中心據點與福利諮詢資源",
    sourceNote: "先由諮詢窗口釐清需求，再確認是否需要轉介；本頁沒有代為送件或建立服務案件。",
    sourceQuery: "衛生福利部 社會福利服務中心 福利諮詢 所在縣市",
    memoryLabel: "想先釐清適合的資源",
    followUps: [
      {
        question: "不知道分類可以先找誰？",
        answer: "可以先找所在地社會福利服務中心或公所社會課，不必先知道補助名稱。用自己的話說明發生了什麼、目前最需要哪一種協助，窗口可協助釐清或轉介。",
      },
      {
        question: "還沒整理資料也能詢問嗎？",
        answer: "可以先詢問服務方式，簡單整理所在縣市、目前困難和最急迫的需求即可。若後續需要提出正式申請，再依承辦窗口告知的項目準備文件。",
      },
      {
        question: "接下來可以做什麼？",
        answer: "先選出目前最想處理的一件事，例如生活費、居住或照顧安排，再聯繫所在地社福中心。諮詢時可記下承辦窗口、建議資源與下一次聯絡方式，方便接續處理。",
      },
    ],
    fallbackReply: "這是福利諮詢互動示範。你不需要先判斷自己符合哪項資格，可以從「最近發生什麼事」與「最需要什麼協助」整理起，再向所在地社福中心詢問。也可以使用上方快捷問題看看下一步。",
  },
};

function inferResourceCategory(question: string): ResourceCategory {
  // Specific needs precede broad terms: crop damage is agriculture, and tuition is education.
  if (/農業|農作|作物|農地|農田|菜園|果園|農損|農民|農機|種植|畜牧|養殖/.test(question)) return "agriculture";
  if (/災害|災損|風災|水災|震災|颱風|地震|淹水|火災|土石流|安置|避難|房屋受損/.test(question)) return "disaster";
  if (/健康|醫療|醫院|看病|就醫|心理|諮商|諮詢心理|輔導室|失眠|睡不|焦慮|憂鬱/.test(question)) return "health";
  if (/就學|學費|學雜費|助學|獎學金|獎助|學校|開學|在學|學貸|升學|教育/.test(question)) return "education";
  if (/經濟|生活費|生活補助|生活扶助|失業|收入|低收入|弱勢|急難|房租|租金|薪水|薪資/.test(question)) return "economy";
  if (/壓力/.test(question)) return "health";
  return "other";
}

export function getResourceScenario(category: string | null, question?: string | null): ResourceScenario {
  const normalizedCategory = category?.trim().toLowerCase();
  if (normalizedCategory && Object.prototype.hasOwnProperty.call(resourceScenarios, normalizedCategory)) {
    return resourceScenarios[normalizedCategory as ResourceCategory];
  }

  const normalizedQuestion = question?.trim();
  if (normalizedQuestion) return resourceScenarios[inferResourceCategory(normalizedQuestion)];

  // Keep the original direct-entry agricultural demo, but never treat an invalid key as valid.
  return resourceScenarios[normalizedCategory ? "other" : "agriculture"];
}

export function getScenarioReply(scenario: ResourceScenario, text: string): string {
  const normalized = text.trim().replace(/[\s？?！!。．，,]/g, "");
  const exactReply = scenario.followUps.find(
    (followUp) => followUp.question.replace(/[\s？?！!。．，,]/g, "") === normalized,
  );
  if (exactReply) return exactReply.answer;

  if (/資料|文件|準備|證明|照片|證件|清單|表格/.test(normalized)) return scenario.followUps[1].answer;
  if (/期限|截止|何時|什麼時候|多久|時程|日期|時間|下一步|接下來|預約/.test(normalized)) return scenario.followUps[2].answer;
  if (/哪裡|哪裏|哪個|誰|窗口|單位|申請|怎麼辦|諮詢|聊聊|聯絡/.test(normalized)) return scenario.followUps[0].answer;
  return scenario.fallbackReply;
}
