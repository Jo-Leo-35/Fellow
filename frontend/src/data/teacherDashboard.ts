import type { LearningTopic } from "./learningScenarios";

// Original fictional roster and deterministic learning events. These fixtures contain
// no real student records. All dashboard aggregates derive from these same events.
export type TeacherPeriod = "7d" | "30d" | "term";
export type TeacherSubject = "all" | "物理" | "化學";
export type TeacherClass = "all" | "801" | "802" | "803";
export interface TeacherFilters {
  period: TeacherPeriod;
  classId: TeacherClass;
  subject: TeacherSubject;
}
export interface TeacherStudent {
  id: string;
  name: string;
  classId: Exclude<TeacherClass, "all">;
  number: number;
}
export interface LearningEvent {
  id: string;
  studentId: string;
  topic: LearningTopic;
  daysAgo: number;
  correct: boolean;
  animationCompleted: boolean;
}
export interface TeacherTopic {
  id: LearningTopic;
  title: string;
  subject: Exclude<TeacherSubject, "all">;
  misconception: string;
  activity: string;
  question: string;
  duration: number;
}
export interface TeacherSettings {
  displayName: string;
  defaultClass: TeacherClass;
  attentionThreshold: number;
  showLearningTips: boolean;
}
export interface ReviewPlan {
  id: string;
  topic: LearningTopic;
  classId: TeacherClass;
  studentId?: string;
  createdAt: string;
  completed: boolean;
  note: string;
}

export const snapshotLabel = "2026 / 09 / 05";
export const periodLabels: Record<TeacherPeriod, string> = {
  "7d": "過去 7 天",
  "30d": "過去 30 天",
  term: "本學期",
};
// School term begins September 1. The snapshot includes September 1–5;
// previous=true compares the immediately preceding equally long period.
export const periodDays: Record<TeacherPeriod, number> = {
  "7d": 7,
  "30d": 30,
  term: 5,
};
export const classLabels: Record<TeacherClass, string> = {
  all: "全部班級",
  "801": "八年一班",
  "802": "八年二班",
  "803": "八年三班",
};
export const defaultTeacherSettings: TeacherSettings = {
  displayName: "王老師",
  defaultClass: "all",
  attentionThreshold: 65,
  showLearningTips: true,
};
export const TEACHER_SETTINGS_KEY = "xueban.teacher.settings.v1";
export const TEACHER_PLANS_KEY = "xueban.teacher.plans.v1";

export const teacherTopics: TeacherTopic[] = [
  {
    id: "newton",
    title: "牛頓力學",
    subject: "物理",
    misconception: "把「有受力」直接當成「一定會加速」，忽略力的方向與合力。",
    activity:
      "先畫桌上書本的受力圖，再調整推力與摩擦力，觀察合力如何改變加速度。",
    question: "書本同時受到重力與支持力，為什麼還是靜止？",
    duration: 8,
  },
  {
    id: "thermodynamics",
    title: "熱力學第一定律",
    subject: "物理",
    misconception: "混淆熱量、溫度與內能，無法追蹤能量的進出。",
    activity:
      "用能量收支動畫，把吸熱、對外做功和內能改變分開，再請學生口述一筆能量帳。",
    question: "氣體吸收熱量時，溫度一定會升高嗎？",
    duration: 10,
  },
  {
    id: "entropy",
    title: "熵與熱力學第二定律",
    subject: "物理",
    misconception: "只看冰箱內部變冷，漏掉外界與整個系統的熵變。",
    activity: "觀察粒子混合動畫，再畫出冰箱、室內與電能的關係，辨認系統邊界。",
    question: "冰箱可以製冰，為什麼沒有違反熱力學第二定律？",
    duration: 12,
  },
  {
    id: "equilibrium",
    title: "化學動態平衡",
    subject: "化學",
    misconception: "把濃度不再改變誤認成反應完全停止。",
    activity:
      "比較正、逆反應的粒子流動，暫停動畫數一數每秒反應的粒子，找出動態平衡。",
    question: "反應達到平衡後，粒子還在進行反應嗎？",
    duration: 8,
  },
  {
    id: "bonding",
    title: "化學鍵與氫鍵",
    subject: "化學",
    misconception: "把水沸騰時分子間作用力的改變，當成水分子內的化學鍵斷裂。",
    activity: "在分子動畫中指出分子內與分子間的位置，再比較沸騰與分解的差別。",
    question: "水沸騰後，水分子還是 H₂O 嗎？",
    duration: 8,
  },
  {
    id: "reaction-rate",
    title: "反應速率與活化能",
    subject: "化學",
    misconception: "以為每次碰撞都能反應，或認為催化劑會改變平衡組成。",
    activity:
      "調整溫度，觀察能量超過門檻的粒子比例；接著比較有無催化劑的反應路徑。",
    question: "溫度只高一點，反應為什麼就快了很多？",
    duration: 10,
  },
];

const fictionalNames = [
  "陳予安",
  "林映禾",
  "張知行",
  "黃以晴",
  "李沐恩",
  "吳承遠",
  "劉星禾",
  "蔡語澄",
  "楊子岳",
  "許若庭",
  "鄭書恆",
  "謝雨彤",
  "郭品澄",
  "洪宥辰",
  "陳思齊",
  "林柏言",
  "張念初",
  "黃可晴",
  "李向晨",
  "吳以樂",
  "劉奕安",
  "蔡千尋",
  "楊知夏",
  "許亦凡",
  "鄭禾安",
  "謝沛文",
  "郭初晴",
  "洪景澄",
  "陳允希",
  "林之恆",
  "張若白",
  "黃奕辰",
  "李映彤",
  "吳書言",
  "劉星宇",
  "蔡予晴",
  "楊沐晨",
  "許念慈",
  "鄭以安",
  "謝知恩",
  "郭晨希",
  "洪語禾",
];
export const teacherStudents: TeacherStudent[] = fictionalNames.map(
  (name, index) => ({
    id: `student-${String(index + 1).padStart(2, "0")}`,
    name,
    classId: (["801", "802", "803"] as const)[Math.floor(index / 14)],
    number: (index % 14) + 1,
  }),
);

export const learningEvents: LearningEvent[] = teacherStudents.flatMap(
  (student, studentIndex) =>
    Array.from({ length: 120 }, (_, daysAgo) => {
      if ((studentIndex * 7 + daysAgo * 3) % 5 > 2) return [];
      const topicIndex =
        (studentIndex + Math.floor(daysAgo / 2) + (daysAgo % 3)) %
        teacherTopics.length;
      const threshold =
        studentIndex % 7 === 0
          ? 42
          : studentIndex % 5 === 0
            ? 60
            : 76 + (studentIndex % 12);
      const correct =
        (studentIndex * 17 + daysAgo * 13 + topicIndex * 19) % 100 < threshold;
      return [
        {
          id: `${student.id}-${daysAgo}`,
          studentId: student.id,
          topic: teacherTopics[topicIndex].id,
          daysAgo,
          correct,
          animationCompleted: (studentIndex + daysAgo) % 5 !== 0,
        },
      ];
    }).flat(),
);

export function selectEvents(
  filters: TeacherFilters,
  previous = false,
): LearningEvent[] {
  const length = periodDays[filters.period];
  const studentIds = new Set(
    teacherStudents
      .filter(
        (student) =>
          filters.classId === "all" || student.classId === filters.classId,
      )
      .map((student) => student.id),
  );
  const topicIds = new Set(
    teacherTopics
      .filter(
        (topic) =>
          filters.subject === "all" || topic.subject === filters.subject,
      )
      .map((topic) => topic.id),
  );
  return learningEvents.filter(
    (event) =>
      event.daysAgo >= (previous ? length : 0) &&
      event.daysAgo < (previous ? length * 2 : length) &&
      studentIds.has(event.studentId) &&
      topicIds.has(event.topic),
  );
}

export interface StudentSummary extends TeacherStudent {
  events: LearningEvent[];
  questionCount: number;
  accuracy: number | null;
  needsAttention: boolean;
  mainTopic: TeacherTopic | undefined;
  animationCount: number;
}
export function summarizeStudents(
  events: LearningEvent[],
  classId: TeacherClass,
  threshold = 65,
): StudentSummary[] {
  return teacherStudents
    .filter((student) => classId === "all" || student.classId === classId)
    .map((student) => {
      const rows = events.filter((event) => event.studentId === student.id);
      const accuracy = rows.length
        ? Math.round(
            (rows.filter((event) => event.correct).length / rows.length) * 100,
          )
        : null;
      const topicRows = teacherTopics
        .map((topic) => ({
          topic,
          missed: rows.filter(
            (event) => event.topic === topic.id && !event.correct,
          ).length,
          total: rows.filter((event) => event.topic === topic.id).length,
        }))
        .filter((row) => row.total > 0)
        .sort((a, b) => b.missed - a.missed || b.total - a.total);
      return {
        ...student,
        events: rows,
        questionCount: rows.length,
        accuracy,
        needsAttention:
          rows.length >= 3 && accuracy !== null && accuracy < threshold,
        mainTopic: topicRows[0]?.topic,
        animationCount: rows.filter((event) => event.animationCompleted).length,
      };
    });
}

export function summarizeTopics(events: LearningEvent[]) {
  return teacherTopics
    .map((topic) => {
      const rows = events.filter((event) => event.topic === topic.id);
      const gaps = rows.filter((event) => !event.correct);
      return {
        ...topic,
        questions: rows.length,
        gapCount: gaps.length,
        studentCount: new Set(gaps.map((event) => event.studentId)).size,
        accuracy: rows.length
          ? Math.round(((rows.length - gaps.length) / rows.length) * 100)
          : null,
      };
    })
    .filter((topic) => topic.questions > 0)
    .sort((a, b) => b.gapCount - a.gapCount);
}

export function loadTeacherSettings(): TeacherSettings {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(TEACHER_SETTINGS_KEY) ?? "null",
    );
    if (!saved || typeof saved !== "object") return defaultTeacherSettings;
    const value = saved as Partial<TeacherSettings>;
    return {
      displayName:
        typeof value.displayName === "string" && value.displayName.trim()
          ? value.displayName.trim().slice(0, 20)
          : defaultTeacherSettings.displayName,
      defaultClass:
        typeof value.defaultClass === "string" &&
        Object.hasOwn(classLabels, value.defaultClass)
          ? value.defaultClass
          : "all",
      attentionThreshold:
        typeof value.attentionThreshold === "number" &&
        [50, 60, 65, 70].includes(value.attentionThreshold)
          ? value.attentionThreshold
          : 65,
      showLearningTips:
        typeof value.showLearningTips === "boolean"
          ? value.showLearningTips
          : true,
    };
  } catch {
    return defaultTeacherSettings;
  }
}

export function loadReviewPlans(): ReviewPlan[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(TEACHER_PLANS_KEY) ?? "[]",
    );
    if (!Array.isArray(saved)) return [];
    return saved
      .filter(
        (plan): plan is ReviewPlan =>
          !!plan &&
          typeof plan === "object" &&
          typeof plan.id === "string" &&
          teacherTopics.some((topic) => topic.id === plan.topic) &&
          typeof plan.classId === "string" &&
          Object.hasOwn(classLabels, plan.classId) &&
          typeof plan.createdAt === "string" &&
          Number.isFinite(Date.parse(plan.createdAt)) &&
          typeof plan.completed === "boolean" &&
          typeof plan.note === "string" &&
          (plan.studentId === undefined ||
            teacherStudents.some((student) => student.id === plan.studentId)),
      )
      .slice(0, 100);
  } catch {
    return [];
  }
}
