/**
 * Authored aggregate fixture for the government product walkthrough.
 * One row represents counts for one day, district and primary topic. An event has
 * exactly one primary topic. No people, messages or household records are used.
 * Resource views count need events with a resource opened (at most once/event).
 * Potential needs count resource need events still requiring follow-up.
 */
export const districts = [
  "甲仙",
  "六龜",
  "杉林",
  "美濃",
  "旗山",
  "內門",
] as const;
export type District = (typeof districts)[number];
export type RegionFilter = District | "all";
export type GovernmentPeriod = "7d" | "30d" | "quarter";
export const periodLabels: Record<GovernmentPeriod, string> = {
  "7d": "過去 7 天",
  "30d": "過去 30 天",
  quarter: "本季",
};
export const governmentTopics = [
  { id: "agriculture", label: "農業災損", color: "#2199E8", education: false },
  { id: "education", label: "就學補助", color: "#19B6A5", education: true },
  { id: "financial", label: "經濟支援", color: "#73ACE9", education: false },
  { id: "science", label: "科學學習", color: "#7388DE", education: true },
  { id: "admission", label: "升學資訊", color: "#EDA544", education: true },
  { id: "health", label: "健康照護", color: "#79CDBE", education: false },
] as const;
export type GovernmentTopic = (typeof governmentTopics)[number]["id"];
export interface AggregateCounts {
  events: number;
  needs: number;
  potential: number;
  views: number;
}
export interface GovernmentAggregate extends AggregateCounts {
  date: string;
  district: District;
  topic: GovernmentTopic;
}
export const aggregateAsOf = "2026-09-05";
const dayMs = 86_400_000;
const anchorTime = Date.parse(`${aggregateAsOf}T00:00:00Z`);
const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10);
export const formatAggregateDate = (date: string) => date.replaceAll("-", "/");
export const emptyCounts = (): AggregateCounts => ({
  events: 0,
  needs: 0,
  potential: 0,
  views: 0,
});
function addCounts(target: AggregateCounts, row: AggregateCounts) {
  target.events += row.events;
  target.needs += row.needs;
  target.potential += row.potential;
  target.views += row.views;
  return target;
}
const topicWeights = [1.6, 1.4, 1.15, 1.05, 0.8, 0.65];
const districtWeights = [1.1, 1.25, 0.85, 1.2, 1.45, 0.9];
export const governmentAggregates: GovernmentAggregate[] = Array.from(
  { length: 180 },
  (_, day) => {
    const time = anchorTime - (179 - day) * dayMs;
    return districts.flatMap((district, regionIndex) =>
      governmentTopics.map((topic, topicIndex) => {
        const weekday = new Date(time).getUTCDay();
        const season = 0.8 + day / 480;
        const regionalFocus =
          topicIndex === 0 && regionIndex < 3
            ? 1.55
            : topicIndex === 3 && regionIndex === 4
              ? 1.4
              : 1;
        const recentFocus =
          day >= 166 && topicIndex === 0
            ? 1.3
            : day >= 150 && topicIndex === 1
              ? 1.2
              : 1;
        const variation =
          0.85 + ((day * 7 + regionIndex * 11 + topicIndex * 3) % 9) / 22;
        const events = Math.max(
          2,
          Math.round(
            4.7 *
              topicWeights[topicIndex] *
              districtWeights[regionIndex] *
              season *
              regionalFocus *
              recentFocus *
              variation *
              (weekday === 0 || weekday === 6 ? 0.82 : 1),
          ),
        );
        const needs = Math.max(
          1,
          Math.round(events * (topicIndex === 3 ? 0.28 : 0.56)),
        );
        const potential = Math.min(
          needs,
          Math.round(
            needs * (0.18 + ((day + regionIndex + topicIndex) % 4) * 0.07),
          ),
        );
        const views = Math.min(
          needs,
          Math.round(needs * (topicIndex === 0 ? 0.6 : 0.78)),
        );
        return {
          date: isoDate(time),
          district,
          topic: topic.id,
          events,
          needs,
          potential,
          views,
        };
      }),
    );
  },
).flat();

export function periodWindow(period: GovernmentPeriod) {
  const date = new Date(anchorTime);
  const quarterStart = Date.UTC(
    date.getUTCFullYear(),
    Math.floor(date.getUTCMonth() / 3) * 3,
    1,
  );
  const days =
    period === "7d"
      ? 7
      : period === "30d"
        ? 30
        : Math.round((anchorTime - quarterStart) / dayMs) + 1;
  return {
    days,
    start: isoDate(anchorTime - (days - 1) * dayMs),
    end: aggregateAsOf,
    previousStart: isoDate(anchorTime - (2 * days - 1) * dayMs),
    previousEnd: isoDate(anchorTime - days * dayMs),
  };
}
export function percentageChange(current: number, previous: number) {
  return previous ? ((current - previous) / previous) * 100 : 0;
}
export function changeLabel(current: number, previous: number) {
  const change = percentageChange(current, previous);
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}
export const regionLabel = (region: RegionFilter) =>
  region === "all" ? "高雄六區" : `${region}區`;

// Largest remainder rounding makes displayed mutually exclusive topic shares total 100.0%.
function normalizedShares(counts: number[]) {
  const total = counts.reduce((sum, value) => sum + value, 0);
  if (!total) return counts.map(() => 0);
  const raw = counts.map((value) => (value / total) * 1000);
  const rounded = raw.map(Math.floor);
  const remainder = 1000 - rounded.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - rounded[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < remainder; i++) rounded[order[i].index]++;
  return rounded.map((value) => value / 10);
}
export function getGovernmentDashboard(
  period: GovernmentPeriod,
  region: RegionFilter,
  topic?: GovernmentTopic,
) {
  const window = periodWindow(period);
  const inScope = governmentAggregates.filter(
    (row) =>
      (region === "all" || row.district === region) &&
      (!topic || row.topic === topic),
  );
  const current = inScope.filter(
    (row) => row.date >= window.start && row.date <= window.end,
  );
  const previous = inScope.filter(
    (row) => row.date >= window.previousStart && row.date <= window.previousEnd,
  );
  const totals = current.reduce(addCounts, emptyCounts());
  const previousTotals = previous.reduce(addCounts, emptyCounts());
  const topics = governmentTopics.map((item) => ({
    ...item,
    ...current
      .filter((row) => row.topic === item.id)
      .reduce(addCounts, emptyCounts()),
    previous: previous
      .filter((row) => row.topic === item.id)
      .reduce(addCounts, emptyCounts()),
  }));
  const shares = normalizedShares(topics.map((item) => item.needs));
  const rankedTopics = topics
    .map((item, index) => ({ ...item, percentage: shares[index] }))
    .sort((a, b) => b.needs - a.needs);
  const regions = districts
    .map((district) => ({
      district,
      ...current
        .filter((row) => row.district === district)
        .reduce(addCounts, emptyCounts()),
      previous: previous
        .filter((row) => row.district === district)
        .reduce(addCounts, emptyCounts()),
    }))
    .filter((item) => region === "all" || item.district === region)
    .sort((a, b) => b.needs - a.needs);
  const bucketSize = Math.ceil(window.days / (period === "7d" ? 7 : 8));
  const startTime = Date.parse(`${window.start}T00:00:00Z`);
  const trend = Array.from(
    { length: Math.ceil(window.days / bucketSize) },
    (_, index) => {
      const start = isoDate(startTime + index * bucketSize * dayMs);
      const end = isoDate(
        Math.min(
          anchorTime,
          startTime + ((index + 1) * bucketSize - 1) * dayMs,
        ),
      );
      const priorStart = isoDate(
        Date.parse(`${start}T00:00:00Z`) - window.days * dayMs,
      );
      const priorEnd = isoDate(
        Date.parse(`${end}T00:00:00Z`) - window.days * dayMs,
      );
      return {
        start,
        end,
        label: start.slice(5).replace("-", "/"),
        ...current
          .filter((row) => row.date >= start && row.date <= end)
          .reduce(addCounts, emptyCounts()),
        previous: previous
          .filter((row) => row.date >= priorStart && row.date <= priorEnd)
          .reduce(addCounts, emptyCounts()),
      };
    },
  );
  const insightTopic = [...rankedTopics]
    .filter((item) => item.needs > 0)
    .sort(
      (a, b) =>
        percentageChange(b.needs, b.previous.needs) -
        percentageChange(a.needs, a.previous.needs),
    )[0];
  return {
    window,
    totals,
    previousTotals,
    topics: rankedTopics,
    regions,
    trend,
    insightTopic,
    current,
  };
}
export type GovernmentDashboard = ReturnType<typeof getGovernmentDashboard>;

export function governmentCsv(period: GovernmentPeriod, region: RegionFilter) {
  const data = getGovernmentDashboard(period, region);
  const headers = [
    "期間開始",
    "期間結束",
    "地區",
    "主要主題",
    "互動事件",
    "資源需求",
    "待關注需求",
    "已開啟資源需求",
  ];
  const rows = districts
    .filter((district) => region === "all" || region === district)
    .flatMap((district) =>
      governmentTopics.map((topic) => {
        const counts = data.current
          .filter((row) => row.district === district && row.topic === topic.id)
          .reduce(addCounts, emptyCounts());
        return [
          data.window.start,
          data.window.end,
          `${district}區`,
          topic.label,
          counts.events,
          counts.needs,
          counts.potential,
          counts.views,
        ];
      }),
    );
  return (
    "\uFEFF" +
    [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\r\n")
  );
}
