import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Select,
  SimpleGrid,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useToast,
} from "@chakra-ui/react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  Check,
  Download,
  GraduationCap,
  HandHeart,
  LayoutDashboard,
  Map,
  MessageCircleQuestion,
  PackageSearch,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Surface } from "@/components/ui/Surface";
import {
  changeLabel,
  districts,
  formatAggregateDate,
  governmentTopics,
  percentageChange,
  periodLabels,
  regionLabel,
  type GovernmentDashboard,
  type GovernmentPeriod,
  type GovernmentTopic,
  type RegionFilter,
} from "@/data/governmentDashboard";

import { useQuery, useQueries } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard";
import { ApiState } from "@/api/runtime";
import { governmentPresentation, emptyGovernment, governmentSnapshotCsv } from "@/api/dashboardPresentation";

type View =
  | "overview"
  | "education"
  | "resources"
  | "regions"
  | "insights"
  | "settings";
interface Preferences {
  period: GovernmentPeriod;
  region: RegionFilter;
  compare: boolean;
}
interface TrackedTopic {
  topic: GovernmentTopic;
  region: RegionFilter;
}
const settingsKey = "xueban-government-preferences-v1";
const trackingKey = "xueban-government-tracking-v1";
const defaultPreferences: Preferences = {
  period: "7d",
  region: "all",
  compare: true,
};
const validRegion = (value: unknown): value is RegionFilter =>
  value === "all" || districts.includes(value as (typeof districts)[number]);
function readPreferences(): Preferences {
  try {
    const stored = JSON.parse(localStorage.getItem(settingsKey) || "null");
    return {
      period:
        stored && Object.hasOwn(periodLabels, stored.period)
          ? stored.period
          : "7d",
      region: validRegion(stored?.region) ? stored.region : "all",
      compare: typeof stored?.compare === "boolean" ? stored.compare : true,
    };
  } catch {
    return defaultPreferences;
  }
}
function readTracking(): TrackedTopic[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(trackingKey) || "[]",
    );
    return Array.isArray(stored)
      ? stored
          .filter(
            (item): item is TrackedTopic =>
              item &&
              validRegion(item.region) &&
              governmentTopics.some((topic) => topic.id === item.topic),
          )
          .map((item) => ({ topic: item.topic, region: item.region }))
      : [];
  } catch {
    return [];
  }
}
const navItems = [
  { id: "overview", label: "總覽", icon: LayoutDashboard },
  { id: "education", label: "教育需求", icon: GraduationCap },
  { id: "resources", label: "資源使用", icon: PackageSearch },
  { id: "regions", label: "地區分析", icon: Map },
  { id: "insights", label: "趨勢洞察", icon: BarChart3 },
  { id: "settings", label: "設定", icon: Settings },
];
const viewTitles: Record<View, string> = {
  overview: "高雄偏鄉需求洞察",
  education: "教育需求",
  resources: "資源使用",
  regions: "地區分析",
  insights: "趨勢洞察",
  settings: "工作台設定",
};
const number = (value: number) => value.toLocaleString("zh-TW");
const share = (value: number, total: number) =>
  total > 0 ? (value / total) * 100 : 0;
function CardTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Flex justify="space-between" align="flex-start" gap="12px" mb="18px">
      <Box>
        <Text as="h2" fontSize="16px" fontWeight="800" color="navy.900">
          {title}
        </Text>
        {description && (
          <Text mt="5px" color="gray.500" fontSize="12px" lineHeight="1.7">
            {description}
          </Text>
        )}
      </Box>
      {action}
    </Flex>
  );
}
function Change({ current, previous }: { current: number; previous: number }) {
  const increased = current >= previous;
  return (
    <HStack spacing="2px" color={increased ? "#087F74" : "#61778A"}>
      <Icon as={increased ? ArrowUpRight : ArrowDownRight} boxSize="13px" />
      <Text fontSize="11px" fontWeight="700">
        {changeLabel(current, previous)}
      </Text>
    </HStack>
  );
}
function MetricCard({
  label,
  value,
  previous,
  icon,
  color,
  background,
  compare,
  note,
}: {
  label: string;
  value: number;
  previous: number;
  icon: LucideIcon;
  color: string;
  background: string;
  compare: boolean;
  note: string;
}) {
  return (
    <Surface
      p={{ base: "18px", md: "22px" }}
      data-testid={`government-kpi-${label}`}
    >
      <HStack spacing="15px" align="flex-start">
        <Flex
          align="center"
          justify="center"
          boxSize="48px"
          borderRadius="14px"
          bg={background}
          flexShrink={0}
        >
          <Icon as={icon} boxSize="24px" color={color} />
        </Flex>
        <Box>
          <Text
            fontSize="29px"
            lineHeight="1.1"
            fontWeight="800"
            color="navy.900"
            letterSpacing="-.6px"
          >
            {number(value)}
          </Text>
          <HStack mt="7px" spacing="9px" flexWrap="wrap">
            <Text fontSize="13px" fontWeight="700" color="navy.700">
              {label}
            </Text>
            {compare && <Change current={value} previous={previous} />}
          </HStack>
          <Text mt="7px" color="gray.500" fontSize="11px">
            {note}
          </Text>
        </Box>
      </HStack>
    </Surface>
  );
}
function TrendChart({
  data,
  compare,
  height = 250,
}: {
  data: GovernmentDashboard;
  compare: boolean;
  height?: number;
}) {
  const option = useMemo<EChartsOption>(
    () => ({
      animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      animationDuration: 400,
      textStyle: { fontFamily: "Noto Sans TC, sans-serif" },
      color: ["#10B5A4", "#B5C9D6"],
      grid: { left: 44, right: 18, top: 28, bottom: 35 },
      tooltip: { trigger: "axis", valueFormatter: (value) => `${value} 件` },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.trend.map((point) => point.label),
        axisLine: { lineStyle: { color: "#DFE9EE" } },
        axisTick: { show: false },
        axisLabel: { color: "#6C8597", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: "#6C8597", fontSize: 11 },
        splitLine: { lineStyle: { color: "#EEF3F6", type: "dashed" } },
      },
      series: [
        {
          name: "本期資源需求",
          type: "line",
          smooth: true,
          symbolSize: 7,
          data: data.trend.map((point) => point.needs),
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(16,181,164,.23)" },
                { offset: 1, color: "rgba(16,181,164,0)" },
              ],
            },
          },
        },
        ...(compare
          ? [
              {
                name: "前期資源需求",
                type: "line" as const,
                smooth: true,
                symbolSize: 4,
                data: data.trend.map((point) => point.previous.needs),
                lineStyle: { width: 2, type: "dashed" as const },
              },
            ]
          : []),
      ],
      aria: {
        enabled: true,
        description: `資源需求趨勢，${data.trend.map((point) => `${point.label}起${point.needs}件`).join("、")}`,
      },
    }),
    [data, compare],
  );
  return (
    <Box
      role="img"
      aria-label={`資源需求趨勢圖，共 ${number(data.totals.needs)} 件`}
    >
      <ReactECharts
        option={option}
        notMerge
        opts={{ renderer: "svg" }}
        style={{ height, width: "100%" }}
      />
    </Box>
  );
}
function RankingCard({
  data,
  onTopic,
}: {
  data: GovernmentDashboard;
  onTopic: (topic: GovernmentTopic) => void;
}) {
  const option = useMemo<EChartsOption>(
    () => ({
      animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      animationDuration: 500,
      textStyle: { fontFamily: "Noto Sans TC, sans-serif" },
      grid: { left: 78, right: 48, top: 4, bottom: 4 },
      xAxis: {
        type: "value",
        show: false,
        max: Math.max(...data.topics.map((topic) => topic.percentage)) + 10,
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: data.topics.map((topic) => topic.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 12,
          fontWeight: 500,
          color: "#29465C",
          margin: 14,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (value) => `${value}%`,
      },
      series: [
        {
          type: "bar",
          barWidth: 11,
          showBackground: true,
          backgroundStyle: { color: "#F0F5F8", borderRadius: 8 },
          data: data.topics.map((topic) => ({
            value: topic.percentage,
            itemStyle: { color: "#4AAAF0", borderRadius: 8 },
          })),
          label: {
            show: true,
            position: "right",
            formatter: "{c}%",
            color: "#29465C",
            fontSize: 12,
            fontWeight: 700,
            distance: 10,
          },
        },
      ],
      aria: {
        enabled: true,
        description: data.topics
          .map(
            (topic) => `${topic.label}${topic.needs}件，占${topic.percentage}%`,
          )
          .join("、"),
      },
    }),
    [data],
  );
  return (
    <Surface p="22px" minW={0}>
      <CardTitle
        title="熱門需求主題"
        description={`共 ${number(data.totals.needs)} 件資源需求 · 每件依主要主題歸類`}
        action={
          <Badge
            colorScheme="teal"
            borderRadius="full"
            px="9px"
            py="4px"
            fontSize="10px"
          >
            六大主題
          </Badge>
        }
      />
      <ReactECharts
        option={option}
        notMerge
        opts={{ renderer: "svg" }}
        style={{ height: 230, width: "100%" }}
        onEvents={{
          click: (event: { dataIndex?: number }) => {
            if (typeof event.dataIndex === "number")
              onTopic(data.topics[event.dataIndex].id);
          },
        }}
      />
      <Flex flexWrap="wrap" gap="6px" mt="10px">
        {data.topics.map((topic) => (
          <Button
            key={topic.id}
            size="xs"
            variant="ghost"
            color="gray.600"
            fontWeight="500"
            onClick={() => onTopic(topic.id)}
            aria-label={`查看${topic.label}詳情`}
          >
            {topic.label}
            <Text as="span" ml="4px" color="brand.700">
              {number(topic.needs)}
            </Text>
          </Button>
        ))}
      </Flex>
    </Surface>
  );
}
function RegionsCard({
  data,
  region,
  onRegion,
  expanded = false,
}: {
  data: GovernmentDashboard;
  region: RegionFilter;
  onRegion: (region: RegionFilter) => void;
  expanded?: boolean;
}) {
  const maximum = Math.max(1, ...data.regions.map((item) => item.needs));
  return (
    <Surface p="22px" minW={0}>
      <CardTitle
        title="地區需求熱度"
        description="依各區資源需求件數排序"
        action={
          region !== "all" ? (
            <Button size="xs" variant="ghost" onClick={() => onRegion("all")}>
              查看全部
            </Button>
          ) : undefined
        }
      />
      <Flex
        direction={expanded ? { base: "column", md: "row" } : "column"}
        align="center"
        gap="18px"
      >
        <Box
          flexShrink={0}
          textAlign="center"
          w={expanded ? { base: "100%", md: "40%" } : "100%"}
        >
          <Image
            src="/assets/reference-region-map.png"
            alt="地區需求分布插畫"
            objectFit="contain"
            h={expanded ? "270px" : "120px"}
            mx="auto"
          />
          <Text fontSize="10px" color="gray.500" mt="6px">
            區域概念圖 · 需求件數依統計排序
          </Text>
        </Box>
        <VStack align="stretch" spacing="8px" w="100%">
          {data.regions.map((item, index) => (
            <Button
              h="auto"
              whiteSpace="normal"
              variant="ghost"
              p="8px"
              justifyContent="stretch"
              key={item.district}
              onClick={() => onRegion(item.district)}
              aria-label={`篩選${item.district}區`}
              bg={region === item.district ? "brand.50" : "transparent"}
              _hover={{ bg: "#F0F9F8" }}
            >
              <HStack w="100%" spacing="9px">
                <Text fontSize="10px" color="gray.400" w="13px">
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <Text fontSize="12px" color="navy.700" flexShrink={0}>
                  {item.district}區
                </Text>
                <Progress
                  flex="1"
                  minW="20px"
                  size="xs"
                  colorScheme="teal"
                  value={(item.needs / maximum) * 100}
                  bg="#EDF6F5"
                  borderRadius="full"
                />
                <Text
                  fontSize="12px"
                  color="navy.700"
                  minW="39px"
                  textAlign="right"
                >
                  {number(item.needs)}
                </Text>
                <Text fontSize="10px" color="gray.500">
                  件
                </Text>
              </HStack>
            </Button>
          ))}
        </VStack>
      </Flex>
    </Surface>
  );
}

export default function GovernmentDashboardPage() {
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);
  const [draftPreferences, setDraftPreferences] =
    useState<Preferences>(preferences);
  const [view, setView] = useState<View>("overview");
  const [period, setPeriod] = useState<GovernmentPeriod>(preferences.period);
  const [region, setRegion] = useState<RegionFilter>(preferences.region);
  const [tracking, setTracking] = useState<TrackedTopic[]>(readTracking);
  const [detail, setDetail] = useState<{
    topic?: GovernmentTopic;
    region: RegionFilter;
  } | null>(null);
  const toast = useToast();
  const snapshotQuery=useQuery({queryKey:['government',period,region],queryFn:({signal})=>dashboardApi.government({period,region},{signal})});
  const data=snapshotQuery.data?governmentPresentation(snapshotQuery.data):emptyGovernment;
  const aggregateAsOf=snapshotQuery.data?.asOf.slice(0,10)??'';
  const detailQuery=useQuery({queryKey:['government',period,detail],queryFn:({signal})=>dashboardApi.government({period,region:detail!.region,topic:detail!.topic},{signal}),enabled:Boolean(detail)});
  const detailData=detailQuery.data?governmentPresentation(detailQuery.data):null;
  const trackingQueries=useQueries({queries:tracking.map(item=>({queryKey:['government',period,item.region,item.topic],queryFn:({signal}:{signal:AbortSignal})=>dashboardApi.government({period,region:item.region,topic:item.topic},{signal})}))});
  const selectedTopic = detail?.topic
    ? governmentTopics.find((topic) => topic.id === detail.topic)
    : undefined;
  const insight = data.insightTopic;
  const serverInsight=snapshotQuery.data?.agentInsights[0];
  const educationTopics = data.topics.filter((topic) => topic.education);
  const educationCount = educationTopics.reduce(
    (sum, topic) => sum + topic.events,
    0,
  );
  const tracked = (topic: GovernmentTopic, targetRegion: RegionFilter) =>
    tracking.some(
      (item) => item.topic === topic && item.region === targetRegion,
    );
  const toggleTracking = (
    topic: GovernmentTopic,
    targetRegion: RegionFilter,
  ) => {
    const next = tracked(topic, targetRegion)
      ? tracking.filter(
          (item) => item.topic !== topic || item.region !== targetRegion,
        )
      : [...tracking, { topic, region: targetRegion }];
    try {
      localStorage.setItem(trackingKey, JSON.stringify(next));
      setTracking(next);
      toast({
        title: next.length > tracking.length ? "已加入追蹤清單" : "已移除追蹤",
        status: "success",
        duration: 2200,
      });
    } catch {
      toast({
        title: "無法儲存追蹤清單",
        description: "請確認瀏覽器允許儲存資料後重試。",
        status: "error",
        duration: 3500,
      });
    }
  };
  const exportCsv = () => {
    const blob = new Blob([governmentSnapshotCsv(data)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `學伴-${regionLabel(region)}-需求彙整-${data.window.start}-${data.window.end}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({
      title: "已匯出區域與主題彙整",
      description: `${regionLabel(region)} · ${periodLabels[period]}`,
      status: "success",
      duration: 2500,
    });
  };
  const savePreferences = () => {
    try {
      localStorage.setItem(settingsKey, JSON.stringify(draftPreferences));
      setPreferences(draftPreferences);
      setPeriod(draftPreferences.period);
      setRegion(draftPreferences.region);
      toast({ title: "設定已儲存並套用", status: "success", duration: 2500 });
    } catch {
      toast({
        title: "設定未儲存",
        description: "請確認瀏覽器允許儲存資料後重試。",
        status: "error",
        duration: 3500,
      });
    }
  };
  const filters = (
    <HStack spacing="8px" flexWrap="wrap">
      <Select
        aria-label="地區篩選"
        value={region}
        onChange={(event) => setRegion(event.target.value as RegionFilter)}
        size="sm"
        bg="white"
        borderColor="#DCE7ED"
        borderRadius="9px"
        w="134px"
        fontSize="12px"
      >
        <option value="all">高雄六區</option>
        {districts.map((district) => (
          <option key={district} value={district}>
            {district}區
          </option>
        ))}
      </Select>
      <Select
        aria-label="統計期間"
        value={period}
        onChange={(event) => setPeriod(event.target.value as GovernmentPeriod)}
        size="sm"
        bg="white"
        borderColor="#DCE7ED"
        borderRadius="9px"
        w="130px"
        fontSize="12px"
      >
        {Object.entries(periodLabels).map(([key, label]) => (
          <option value={key} key={key}>
            {label}
          </option>
        ))}
      </Select>
    </HStack>
  );
  const trendCard = (
    <Surface p="22px" minW={0}>
      <CardTitle
        title="需求變化趨勢"
        description={`${formatAggregateDate(data.window.start)} — ${formatAggregateDate(data.window.end)} · ${period === "7d" ? "每日" : "區間"}資源需求件數`}
        action={
          <Button
            variant="ghost"
            size="xs"
            color="brand.700"
            rightIcon={<ArrowRight size={13} />}
            onClick={() => setDetail({ region })}
          >
            查看明細
          </Button>
        }
      />
      <HStack fontSize="11px" color="gray.500" spacing="16px">
        <HStack>
          <Box boxSize="7px" bg="brand.500" borderRadius="full" />
          <Text>本期</Text>
        </HStack>
        {preferences.compare && (
          <HStack>
            <Box w="13px" borderTop="2px dashed #B5C9D6" />
            <Text>前 {data.window.days} 天</Text>
          </HStack>
        )}
      </HStack>
      <TrendChart data={data} compare={preferences.compare} />
    </Surface>
  );
  const insightCard = insight ? (
    <Surface
      p={{ base: "18px", md: "22px" }}
      bg="linear-gradient(115deg, #F0FAF7 0%, #FFFDF6 100%)"
      borderColor="#D9EEE6"
    >
      <Flex
        align={{ base: "flex-start", md: "center" }}
        gap="15px"
        direction={{ base: "column", md: "row" }}
      >
        <HStack align="flex-start" flex="1" spacing="14px">
          <Image
            src="/assets/reference-insight-bulb.png"
            alt=""
            w="42px"
            h="49px"
            objectFit="contain"
            flexShrink={0}
          />
          <Box>
            <HStack spacing="8px" mb="6px">
              <Text fontSize="14px" fontWeight="800" color="navy.900">
                值得關注的需求變化
              </Text>
              <Badge
                fontSize="9px"
                colorScheme="teal"
                borderRadius="full"
                px="7px"
              >
                學伴洞察
              </Badge>
            </HStack>
            <Text color="navy.700" fontSize="13px" lineHeight="1.9">
              {serverInsight?.description??`${regionLabel(region)}的「${insight.label}」本期有 ${number(insight.needs)} 件資源需求，${number(insight.potential)} 件待關注。`}

            </Text>
            <Text color="gray.500" fontSize="12px" lineHeight="1.8" mt="3px">
              {serverInsight?.recommendation??"建議檢視相關資源的說明與可取得性，協助需求順利銜接。"}
            </Text>
          </Box>
        </HStack>
        <Button
          size="sm"
          colorScheme="teal"
          rightIcon={<ArrowRight size={15} />}
          onClick={() => setDetail({ region, topic: insight.id })}
          flexShrink={0}
        >
          查看趨勢
        </Button>
      </Flex>
    </Surface>
  ) : <Surface p="22px"><Text>目前沒有足夠資料產生需求洞察。</Text></Surface>;
  if(!snapshotQuery.data) return <DashboardShell edition="政府版" title="需求概況" ownerName="" ownerDetail="" items={navItems}><ApiState loading={snapshotQuery.isPending} error={snapshotQuery.error} retry={()=>void snapshotQuery.refetch()}/></DashboardShell>;

  return (
    <DashboardShell
      edition="政府版"
      title={viewTitles[view]}
      subtitle="讓每一次提問，成為看見地方需求的起點"
      ownerName="高雄市政府"
      ownerDetail="教育局 · 需求觀測工作台"
      items={navItems}
      activeItem={view}
      onNavigate={(id) => {
        setView(id as View);
        setDetail(null);
      }}
      actions={view !== "settings" ? filters : undefined}
    >
      {view !== "settings" && (
        <Flex
          justify="space-between"
          gap="10px"
          flexWrap="wrap"
          align="center"
          mb="18px"
        >
          <HStack spacing="7px" color="gray.500" fontSize="11px">
            <Box boxSize="6px" bg="brand.400" borderRadius="full" />
            <Text>
              資料截至 {formatAggregateDate(aggregateAsOf)} ·{" "}
              {regionLabel(region)}
              {preferences.compare ? ` · 與前 ${data.window.days} 天比較` : ""}
            </Text>
          </HStack>
          <Button
            variant="ghost"
            size="xs"
            color="navy.600"
            leftIcon={<Download size={14} />}
            onClick={exportCsv}
          >
            匯出彙整
          </Button>
        </Flex>
      )}
      <VStack align="stretch" spacing="18px">
        {view === "overview" && (
          <>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing="14px">
              <MetricCard
                label="互動事件"
                value={data.totals.events}
                previous={data.previousTotals.events}
                icon={MessageCircleQuestion}
                color="#258DEC"
                background="#ECF5FF"
                compare={preferences.compare}
                note="各主要主題的提問與互動"
              />
              <MetricCard
                label="資源需求"
                value={data.totals.needs}
                previous={data.previousTotals.needs}
                icon={HandHeart}
                color="#0FAF9E"
                background="#E7F8F4"
                compare={preferences.compare}
                note="互動中需要資源協助的事件"
              />
              <MetricCard
                label="潛在需求"
                value={data.totals.potential}
                previous={data.previousTotals.potential}
                icon={Sparkles}
                color="#EA9D31"
                background="#FFF4E1"
                compare={preferences.compare}
                note="資源需求中仍待關注的事件"
              />
            </SimpleGrid>
            <Grid
              templateColumns={{
                base: "minmax(0,1fr)",
                xl: "minmax(0,1.1fr) minmax(0,.9fr)",
              }}
              gap="18px"
            >
              <RankingCard
                data={data}
                onTopic={(topic) => setDetail({ topic, region })}
              />
              <RegionsCard data={data} region={region} onRegion={setRegion} />
            </Grid>
            {insightCard}
            {trendCard}
          </>
        )}
        {view === "education" && (
          <>
            <Surface p="22px" bg="linear-gradient(120deg, #EAF8F6, #F6FBFF)">
              <HStack align="flex-start" spacing="16px">
                <Flex
                  boxSize="48px"
                  borderRadius="14px"
                  align="center"
                  justify="center"
                  bg="white"
                  color="brand.600"
                >
                  <GraduationCap size={25} />
                </Flex>
                <Box>
                  <Text
                    as="h2"
                    fontSize="18px"
                    fontWeight="800"
                    color="navy.900"
                  >
                    從學習到升學，看見支持的缺口
                  </Text>
                  <Text
                    fontSize="13px"
                    color="navy.600"
                    lineHeight="1.8"
                    mt="7px"
                  >
                    本期教育相關互動共 {number(educationCount)} 件，占全部互動{" "}
                    {share(educationCount, data.totals.events).toFixed(1)}
                    %。以科學學習、就學補助與升學資訊三個主題掌握需要。
                  </Text>
                </Box>
              </HStack>
            </Surface>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing="14px">
              {educationTopics.map((topic) => (
                <Surface p="22px" key={topic.id}>
                  <HStack justify="space-between" mb="15px">
                    <Text fontWeight="800" color="navy.800">
                      {topic.label}
                    </Text>
                    <Box boxSize="8px" borderRadius="full" bg={topic.color} />
                  </HStack>
                  <Text fontSize="30px" fontWeight="800" color="navy.900">
                    {number(topic.events)}
                    <Text
                      as="span"
                      fontSize="12px"
                      ml="7px"
                      color="gray.500"
                      fontWeight="500"
                    >
                      件互動
                    </Text>
                  </Text>
                  <Text fontSize="12px" color="gray.500" mt="7px">
                    資源需求 {number(topic.needs)} 件 · 待關注{" "}
                    {number(topic.potential)} 件
                  </Text>
                  <Divider my="16px" />
                  <Button
                    size="sm"
                    variant="ghost"
                    px="0"
                    color="brand.700"
                    rightIcon={<ArrowRight size={14} />}
                    onClick={() => setDetail({ region, topic: topic.id })}
                  >
                    查看{topic.label}趨勢
                  </Button>
                </Surface>
              ))}
            </SimpleGrid>
            <Surface p="22px">
              <CardTitle
                title="教育資源支持方向"
                description="依目前選取期間與地區的需求，安排內容與資源檢視"
              />
              <VStack align="stretch" spacing="12px">
                {educationTopics.map((topic) => (
                  <Flex
                    key={topic.id}
                    justify="space-between"
                    gap="12px"
                    align="center"
                    p="15px"
                    bg="#F6FAFC"
                    borderRadius="12px"
                  >
                    <Box>
                      <Text fontSize="13px" fontWeight="700" color="navy.800">
                        {topic.label === "科學學習"
                          ? "用教學動畫補上抽象概念的理解"
                          : topic.label === "就學補助"
                            ? "整理申請步驟與準備文件，降低查找門檻"
                            : "讓升學路徑與重要時程更容易找到"}
                      </Text>
                      <Text fontSize="12px" color="gray.500" mt="5px">
                        {topic.label} · 本期有 {number(topic.potential)}{" "}
                        件需求待關注
                      </Text>
                    </Box>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="teal"
                      flexShrink={0}
                      onClick={() => toggleTracking(topic.id, region)}
                      leftIcon={
                        tracked(topic.id, region) ? (
                          <BookmarkCheck size={14} />
                        ) : (
                          <Bookmark size={14} />
                        )
                      }
                    >
                      {tracked(topic.id, region) ? "已追蹤" : "追蹤"}
                    </Button>
                  </Flex>
                ))}
              </VStack>
            </Surface>
          </>
        )}
        {view === "resources" && (
          <>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing="14px">
              <MetricCard
                label="資源需求"
                value={data.totals.needs}
                previous={data.previousTotals.needs}
                icon={HandHeart}
                color="#0FAF9E"
                background="#E7F8F4"
                compare={preferences.compare}
                note="本期需要資源協助的互動"
              />
              <MetricCard
                label="已開啟資源"
                value={data.totals.views}
                previous={data.previousTotals.views}
                icon={PackageSearch}
                color="#258DEC"
                background="#ECF5FF"
                compare={preferences.compare}
                note="每件需求最多計一次開啟"
              />
              <Surface p="22px">
                <HStack justify="space-between">
                  <Text color="navy.600" fontSize="13px" fontWeight="700">
                    資源觸及率
                  </Text>
                  <Icon as={TrendingUp} color="brand.500" boxSize="21px" />
                </HStack>
                <Text
                  fontSize="30px"
                  color="navy.900"
                  fontWeight="800"
                  mt="10px"
                >
                  {share(data.totals.views, data.totals.needs).toFixed(1)}%
                </Text>
                <Progress
                  mt="10px"
                  borderRadius="full"
                  size="xs"
                  colorScheme="teal"
                  value={share(data.totals.views, data.totals.needs)}
                />
                <Text fontSize="11px" color="gray.500" mt="9px">
                  已開啟資源需求 ÷ 全部資源需求
                </Text>
              </Surface>
            </SimpleGrid>
            <Surface p="22px" minW={0}>
              <CardTitle
                title="各主題資源使用"
                description="比較需求與資源觸及，找出值得改善的資訊銜接"
              />
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      {["需求主題", "資源需求", "已開啟資源", "觸及率", ""].map(
                        (label, index) => (
                          <Th
                            key={index}
                            color="gray.500"
                            fontSize="11px"
                            py="13px"
                          >
                            {label}
                          </Th>
                        ),
                      )}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.topics.map((topic) => (
                      <Tr key={topic.id}>
                        <Td py="18px" fontWeight="700" color="navy.800">
                          {topic.label}
                        </Td>
                        <Td>{number(topic.needs)}</Td>
                        <Td>{number(topic.views)}</Td>
                        <Td>
                          <HStack minW="90px">
                            <Progress
                              w="55px"
                              size="xs"
                              borderRadius="full"
                              colorScheme="teal"
                              value={share(topic.views, topic.needs)}
                            />
                            <Text fontSize="12px">
                              {share(topic.views, topic.needs).toFixed(1)}%
                            </Text>
                          </HStack>
                        </Td>
                        <Td>
                          <Button
                            size="xs"
                            variant="ghost"
                            color="brand.700"
                            onClick={() =>
                              setDetail({ region, topic: topic.id })
                            }
                          >
                            查看詳情
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </Surface>
            {insightCard}
          </>
        )}
        {view === "regions" && (
          <>
            <RegionsCard
              data={data}
              region={region}
              onRegion={setRegion}
              expanded
            />
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="14px">
              {data.regions.map((item) => (
                <Surface p="20px" key={item.district}>
                  <Flex justify="space-between" align="center">
                    <Text fontWeight="800" color="navy.800">
                      {item.district}區
                    </Text>
                    {preferences.compare && (
                      <Change
                        current={item.needs}
                        previous={item.previous.needs}
                      />
                    )}
                  </Flex>
                  <Text
                    fontSize="27px"
                    fontWeight="800"
                    color="navy.900"
                    mt="13px"
                  >
                    {number(item.needs)}
                    <Text
                      as="span"
                      fontSize="12px"
                      color="gray.500"
                      fontWeight="500"
                      ml="8px"
                    >
                      件資源需求
                    </Text>
                  </Text>
                  <Text fontSize="12px" mt="6px" color="gray.500">
                    互動 {number(item.events)} 件 · 待關注{" "}
                    {number(item.potential)} 件
                  </Text>
                  <Button
                    mt="15px"
                    size="sm"
                    variant="ghost"
                    px="0"
                    color="brand.700"
                    rightIcon={<ArrowRight size={13} />}
                    onClick={() => setDetail({ region: item.district })}
                  >
                    查看{item.district}區趨勢
                  </Button>
                </Surface>
              ))}
            </SimpleGrid>
          </>
        )}
        {view === "insights" && (
          <>
            {insightCard}
            {trendCard}
            <Surface p="22px">
              <CardTitle
                title="我的追蹤清單"
                description="保留值得持續觀察的地區與主題；追蹤項目儲存在此瀏覽器"
                action={
                  <Badge colorScheme="teal" borderRadius="full" px="9px">
                    {tracking.length} 項
                  </Badge>
                }
              />
              {tracking.length ? (
                <VStack align="stretch" spacing="10px">
                  {tracking.map((item,index) => {
                    const result=trackingQueries[index];const stats=result.data?governmentPresentation(result.data):null;
                    const topic = governmentTopics.find(
                      (topic) => topic.id === item.topic,
                    )!;
                    return (
                      <Flex
                        key={`${item.region}-${item.topic}`}
                        gap="12px"
                        flexWrap="wrap"
                        align="center"
                        bg="#F5FAFC"
                        p="15px"
                        borderRadius="12px"
                      >
                        <Box flex="1" minW="160px">
                          <Text
                            fontSize="13px"
                            fontWeight="700"
                            color="navy.800"
                          >
                            {regionLabel(item.region)} · {topic.label}
                          </Text>
                          <ApiState error={result.error} retry={()=>void result.refetch()}/><Text fontSize="12px" color="gray.500" mt="5px">
                            {periodLabels[period]} ·{" "}
                            {stats?number(stats.totals.needs):result.error?"無法載入":"載入中"} 件資源需求
                          </Text>
                        </Box>
                        <Button
                          size="xs"
                          variant="ghost"
                          color="brand.700"
                          onClick={() => setDetail(item)}
                        >
                          查看趨勢
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          color="gray.500"
                          onClick={() =>
                            toggleTracking(item.topic, item.region)
                          }
                          aria-label={`移除${regionLabel(item.region)}${topic.label}追蹤`}
                        >
                          取消追蹤
                        </Button>
                      </Flex>
                    );
                  })}
                </VStack>
              ) : (
                <VStack py="22px" color="gray.500" spacing="10px">
                  <Bookmark size={27} />
                  <Text fontSize="13px">
                    從需求詳情加入追蹤，持續掌握變化。
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="teal"
                    onClick={() => setDetail({ region, topic: insight.id })}
                  >
                    探索本期洞察
                  </Button>
                </VStack>
              )}
            </Surface>
          </>
        )}
        {view === "settings" && (
          <Surface p={{ base: "22px", md: "30px" }} maxW="760px">
            <CardTitle
              title="打造你的需求觀測工作台"
              description="設定偏好的檢視範圍，下次開啟時自動套用。"
            />
            <VStack align="stretch" spacing="24px">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="20px">
                <FormControl>
                  <FormLabel fontSize="13px" color="navy.700">
                    預設統計期間
                  </FormLabel>
                  <Select
                    aria-label="預設統計期間"
                    value={draftPreferences.period}
                    onChange={(event) =>
                      setDraftPreferences((current) => ({
                        ...current,
                        period: event.target.value as GovernmentPeriod,
                      }))
                    }
                  >
                    {Object.entries(periodLabels).map(([key, label]) => (
                      <option value={key} key={key}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="13px" color="navy.700">
                    預設地區
                  </FormLabel>
                  <Select
                    aria-label="預設地區"
                    value={draftPreferences.region}
                    onChange={(event) =>
                      setDraftPreferences((current) => ({
                        ...current,
                        region: event.target.value as RegionFilter,
                      }))
                    }
                  >
                    <option value="all">高雄六區</option>
                    {districts.map((item) => (
                      <option key={item} value={item}>
                        {item}區
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>
              <Divider />
              <FormControl
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap="16px"
              >
                <Box>
                  <FormLabel
                    htmlFor="government-comparison"
                    fontSize="13px"
                    fontWeight="700"
                    color="navy.800"
                    mb="5px"
                  >
                    顯示前期比較
                  </FormLabel>
                  <Text fontSize="12px" color="gray.500">
                    在指標與趨勢圖中，對照相同天數的前一期。
                  </Text>
                </Box>
                <Switch
                  id="government-comparison"
                  colorScheme="teal"
                  isChecked={draftPreferences.compare}
                  onChange={(event) =>
                    setDraftPreferences((current) => ({
                      ...current,
                      compare: event.target.checked,
                    }))
                  }
                />
              </FormControl>
              <Box bg="#F2F8FA" p="17px" borderRadius="12px">
                <HStack align="flex-start" spacing="10px">
                  <Icon as={ShieldCheck} boxSize="20px" color="brand.600" />
                  <Box>
                    <Text fontSize="13px" fontWeight="700" color="navy.800">
                      以彙整需求理解地方
                    </Text>
                    <Text
                      fontSize="12px"
                      lineHeight="1.9"
                      color="gray.500"
                      mt="6px"
                    >
                      工作台提供區域、主題、件數與趨勢。下載報表與追蹤清單皆以相同範圍整理，協助跨期觀察需求變化。
                    </Text>
                  </Box>
                </HStack>
              </Box>
              <HStack justify="flex-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraftPreferences(defaultPreferences)}
                >
                  還原預設值
                </Button>
                <Button
                  size="sm"
                  colorScheme="teal"
                  leftIcon={<Check size={15} />}
                  onClick={savePreferences}
                >
                  儲存並套用
                </Button>
              </HStack>
            </VStack>
          </Surface>
        )}
      </VStack>
      <HStack
        mt="23px"
        spacing="6px"
        color="gray.500"
        fontSize="11px"
        justify="center"
      >
        <Icon as={ShieldCheck} boxSize="13px" />
        <Text>以匿名彙整資料，理解地方需要</Text>
      </HStack>
      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        size="2xl"
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay bg="rgba(6,30,48,.35)" backdropFilter="blur(3px)" />
        <ModalContent mx="14px" borderRadius="20px">
          <ModalHeader pr="45px" pb="10px" color="navy.900">
            <Text fontSize="19px">
              {selectedTopic
                ? `${selectedTopic.label}需求趨勢`
                : "地區需求趨勢"}
            </Text>
            {detail && (
              <Text fontSize="12px" fontWeight="500" color="gray.500" mt="7px">
                {regionLabel(detail.region)} · {periodLabels[period]} ·{" "}
                {formatAggregateDate(data.window.start)} —{" "}
                {formatAggregateDate(data.window.end)}
              </Text>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb="24px">
            <ApiState loading={detailQuery.isPending} error={detailQuery.error} retry={()=>void detailQuery.refetch()}/>
            {detailData && (
              <>
                <SimpleGrid columns={3} spacing="10px" mt="12px">
                  {[
                    { label: "互動事件", value: detailData.totals.events },
                    { label: "資源需求", value: detailData.totals.needs },
                    { label: "待關注需求", value: detailData.totals.potential },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      bg="#F1F8FA"
                      borderRadius="12px"
                      p="13px"
                    >
                      <Text fontSize="11px" color="gray.500">
                        {item.label}
                      </Text>
                      <Text
                        mt="7px"
                        fontSize={{ base: "20px", md: "25px" }}
                        fontWeight="800"
                        color="navy.900"
                      >
                        {number(item.value)}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
                <HStack justify="space-between" mt="22px">
                  <Text fontSize="13px" fontWeight="700" color="navy.800">
                    資源需求件數
                  </Text>
                  {preferences.compare && (
                    <Change
                      current={detailData.totals.needs}
                      previous={detailData.previousTotals.needs}
                    />
                  )}
                </HStack>
                <TrendChart
                  data={detailData}
                  compare={preferences.compare}
                  height={220}
                />
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>統計區間</Th>
                        <Th isNumeric>本期需求</Th>
                        {preferences.compare && <Th isNumeric>前期需求</Th>}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {detailData.trend.map((point) => (
                        <Tr key={point.start}>
                          <Td fontSize="12px">
                            {point.start.slice(5).replace("-", "/")}
                            {point.start !== point.end
                              ? ` – ${point.end.slice(5).replace("-", "/")}`
                              : ""}
                          </Td>
                          <Td isNumeric>{number(point.needs)}</Td>
                          {preferences.compare && (
                            <Td isNumeric>{number(point.previous.needs)}</Td>
                          )}
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
                <Text
                  mt="15px"
                  fontSize="11px"
                  color="gray.500"
                  lineHeight="1.8"
                >
                  每件事件依主要主題歸類；待關注需求包含在資源需求內。
                  {preferences.compare
                    ? `前期為 ${formatAggregateDate(detailData.window.previousStart)} — ${formatAggregateDate(detailData.window.previousEnd)}，以相同天數對照。`
                    : ""}
                </Text>
              </>
            )}
          </ModalBody>
          <ModalFooter gap="9px" borderTop="1px solid #EDF3F6">
            {detail?.topic && (
              <Button
                size="sm"
                variant="outline"
                colorScheme="teal"
                leftIcon={
                  tracked(detail.topic, detail.region) ? (
                    <BookmarkCheck size={15} />
                  ) : (
                    <Bookmark size={15} />
                  )
                }
                onClick={() => toggleTracking(detail.topic!, detail.region)}
              >
                {tracked(detail.topic, detail.region)
                  ? "已加入追蹤"
                  : "加入追蹤"}
              </Button>
            )}
            <Button size="sm" onClick={() => setDetail(null)}>
              完成
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardShell>
  );
}
