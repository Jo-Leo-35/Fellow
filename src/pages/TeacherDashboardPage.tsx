import {
  Avatar,
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
  Input,
  InputGroup,
  InputLeftElement,
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
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  useToast,
} from "@chakra-ui/react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Atom,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  MessageCircleQuestion,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Surface } from "@/components/ui/Surface";
import {
  classLabels,
  defaultTeacherSettings,
  loadReviewPlans,
  loadTeacherSettings,
  periodDays,
  periodLabels,
  selectEvents,
  snapshotLabel,
  summarizeStudents,
  summarizeTopics,
  teacherStudents,
  teacherTopics,
  TEACHER_PLANS_KEY,
  TEACHER_SETTINGS_KEY,
  type ReviewPlan,
  type StudentSummary,
  type TeacherClass,
  type TeacherFilters,
  type TeacherPeriod,
  type TeacherSettings,
  type TeacherSubject,
  type TeacherTopic,
} from "@/data/teacherDashboard";

type View = "overview" | "students" | "insights" | "resources" | "settings";
type StudentStatus = "all" | "attention" | "steady" | "inactive";
const navigation = [
  { id: "overview", label: "總覽", icon: LayoutDashboard },
  { id: "students", label: "學生管理", icon: Users },
  { id: "insights", label: "學習洞察", icon: BarChart3 },
  { id: "resources", label: "資源協助", icon: LifeBuoy },
  { id: "settings", label: "設定", icon: Settings },
];
const viewTitles: Record<View, string> = {
  overview: "教學洞察",
  students: "學生管理",
  insights: "學習洞察",
  resources: "教學資源與複習計畫",
  settings: "教學偏好設定",
};
const viewSubtitles: Record<View, string> = {
  overview: "看見理解的卡點，讓每一次引導都有方向。",
  students: "從學習訊號出發，找到適合每位學生的下一步。",
  insights: "把共同的困難，轉成學生看得懂的教學活動。",
  resources: "用教學動畫拆解抽象概念，接續每一次課堂引導。",
  settings: "調整班級範圍與關注條件，讓工作台更貼近你的教學。",
};

function Heading({
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
      <Box minW={0}>
        <Text as="h2" color="navy.900" fontSize="16px" fontWeight="800">
          {title}
        </Text>
        {description && (
          <Text color="gray.500" fontSize="12px" mt="5px" lineHeight="1.7">
            {description}
          </Text>
        )}
      </Box>
      {action}
    </Flex>
  );
}
function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <VStack py="30px" px="16px" textAlign="center" spacing="9px">
      <Flex p="13px" bg="brand.50" borderRadius="full">
        <Icon as={BookOpen} boxSize="24px" color="brand.600" />
      </Flex>
      <Text fontWeight="800" color="navy.700">
        {title}
      </Text>
      <Text maxW="380px" fontSize="13px" color="gray.500" lineHeight="1.8">
        {description}
      </Text>
      {action}
    </VStack>
  );
}
function Metric({
  label,
  value,
  previous,
  icon,
  color,
  testId,
  footer,
}: {
  label: string;
  value: number;
  previous: number;
  icon: LucideIcon;
  color: string;
  testId: string;
  footer: string;
}) {
  const difference = value - previous;
  const change = previous
    ? Math.round(Math.abs(difference / previous) * 100) + "%"
    : "新增 " + value;
  return (
    <Surface
      p={{ base: "17px", md: "21px" }}
      boxShadow="0 3px 15px rgba(20, 50, 74, .025)"
    >
      <HStack align="flex-start" spacing="15px">
        <Flex
          align="center"
          justify="center"
          bg={color + "14"}
          borderRadius="13px"
          w="46px"
          h="46px"
          flexShrink={0}
        >
          <Icon as={icon} color={color} boxSize="23px" />
        </Flex>
        <Box minW={0} flex="1">
          <Text
            data-testid={testId}
            color="navy.900"
            fontSize={{ base: "28px", md: "32px" }}
            lineHeight="1.1"
            fontWeight="800"
          >
            {value.toLocaleString("zh-TW")}
          </Text>
          <Text fontWeight="700" mt="7px" fontSize="13px">
            {label}
          </Text>
        </Box>
        <HStack color="gray.500" fontSize="11px" spacing="3px" mt="3px">
          {difference !== 0 && (
            <Icon as={difference > 0 ? ArrowUp : ArrowDown} boxSize="12px" />
          )}
          <Text>{difference === 0 ? "持平" : change}</Text>
        </HStack>
      </HStack>
      <Text color="gray.500" fontSize="11px" mt="14px">
        {footer} · 較前一個等長期間
      </Text>
    </Surface>
  );
}
function StudentCard({
  student,
  onOpen,
}: {
  student: StudentSummary;
  onOpen: () => void;
}) {
  return (
    <Button
      aria-label={"查看 " + student.name + " 學習詳情"}
      variant="unstyled"
      display="block"
      w="full"
      h="auto"
      textAlign="left"
      whiteSpace="normal"
      fontWeight="normal"
      borderRadius="12px"
      onClick={onOpen}
      _hover={{ bg: "#F2F8FA" }}
      _focusVisible={{ boxShadow: "outline" }}
    >
      <HStack px="11px" py="12px" spacing="11px">
        <Avatar
          name={student.name.slice(1)}
          getInitials={(name) => name.slice(0, 1)}
          size="sm"
          bg={student.needsAttention ? "#FFF0E4" : "brand.50"}
          color={student.needsAttention ? "#BB651E" : "brand.700"}
        />
        <Box flex="1" minW={0}>
          <HStack spacing="7px" flexWrap="wrap">
            <Text color="navy.900" fontSize="13px" fontWeight="800">
              {student.name}
            </Text>
            <Text fontSize="11px" color="gray.500">
              {classLabels[student.classId]}
            </Text>
          </HStack>
          <Text color="gray.500" fontSize="11px" mt="4px" noOfLines={1}>
            {student.mainTopic?.title ?? "尚無學習紀錄"} · 練習正確率{" "}
            {student.accuracy === null ? "—" : student.accuracy + "%"}
          </Text>
        </Box>
        <Icon as={ChevronRight} color="gray.400" boxSize="16px" />
      </HStack>
    </Button>
  );
}
function AnimationLink({
  topic,
  label = "教學動畫",
}: {
  topic: TeacherTopic;
  label?: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      bg="white"
      leftIcon={<Play size={13} />}
      as="a"
      href={"/learning-chat.html?topic=" + topic.id}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </Button>
  );
}

export default function TeacherDashboardPage() {
  const toast = useToast();
  const [settings, setSettings] =
    useState<TeacherSettings>(loadTeacherSettings);
  const [settingsDraft, setSettingsDraft] = useState<TeacherSettings>(settings);
  const [activeView, setActiveView] = useState<View>("overview");
  const [filters, setFilters] = useState<TeacherFilters>({
    period: "7d",
    classId: settings.defaultClass,
    subject: "all",
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatus, setStudentStatus] = useState<StudentStatus>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [plans, setPlans] = useState<ReviewPlan[]>(loadReviewPlans);
  const [planStatus, setPlanStatus] = useState<"all" | "pending" | "completed">(
    "all",
  );
  const [planDraft, setPlanDraft] = useState<{
    topic: TeacherTopic;
    studentId?: string;
  } | null>(null);
  const [planNote, setPlanNote] = useState("");

  const events = useMemo(() => selectEvents(filters), [filters]);
  const previousEvents = useMemo(() => selectEvents(filters, true), [filters]);
  const students = useMemo(
    () =>
      summarizeStudents(events, filters.classId, settings.attentionThreshold),
    [events, filters.classId, settings.attentionThreshold],
  );
  const previousStudents = useMemo(
    () =>
      summarizeStudents(
        previousEvents,
        filters.classId,
        settings.attentionThreshold,
      ),
    [previousEvents, filters.classId, settings.attentionThreshold],
  );
  const topics = useMemo(() => summarizeTopics(events), [events]);
  const attentionStudents = students
    .filter((student) => student.needsAttention)
    .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100));
  const activeStudents = students.filter(
    (student) => student.questionCount > 0,
  );
  const selectedStudent = students.find(
    (student) => student.id === selectedStudentId,
  );
  const leadingTopic = topics[0];
  const correctCount = events.filter((event) => event.correct).length;
  const accuracy = events.length
    ? Math.round((correctCount / events.length) * 100)
    : 0;
  const animationCount = events.filter(
    (event) => event.animationCompleted,
  ).length;
  const gapCount = events.length - correctCount;
  const filteredStudents = students.filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    const matchesQuery =
      !query ||
      (
        student.name +
        classLabels[student.classId] +
        student.number.toString().padStart(2, "0")
      )
        .toLowerCase()
        .includes(query);
    const matchesStatus =
      studentStatus === "all" ||
      (studentStatus === "attention" && student.needsAttention) ||
      (studentStatus === "steady" &&
        student.questionCount >= 3 &&
        !student.needsAttention) ||
      (studentStatus === "inactive" && student.questionCount === 0);
    return matchesQuery && matchesStatus;
  });
  const availableTopics = teacherTopics.filter(
    (topic) => filters.subject === "all" || topic.subject === filters.subject,
  );
  const scopedPlans = plans.filter(
    (plan) =>
      (filters.classId === "all" ||
        plan.classId === "all" ||
        plan.classId === filters.classId) &&
      (filters.subject === "all" ||
        teacherTopics.find((topic) => topic.id === plan.topic)?.subject ===
          filters.subject),
  );
  const visiblePlans = scopedPlans.filter(
    (plan) =>
      planStatus === "all" ||
      (planStatus === "completed" ? plan.completed : !plan.completed),
  );

  function navigate(id: string) {
    if (navigation.some((item) => item.id === id)) {
      setActiveView(id as View);
      setSelectedStudentId(null);
    }
  }
  function updateFilter<K extends keyof TeacherFilters>(
    key: K,
    value: TeacherFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setSelectedStudentId(null);
  }
  function openPlan(topic: TeacherTopic, studentId?: string) {
    setSelectedStudentId(null);
    setPlanNote("");
    setPlanDraft({ topic, studentId });
  }
  function persistPlans(next: ReviewPlan[]) {
    try {
      localStorage.setItem(TEACHER_PLANS_KEY, JSON.stringify(next));
      setPlans(next);
      return true;
    } catch {
      toast({
        title: "計畫尚未儲存",
        description: "瀏覽器儲存空間無法使用，請稍後再試。",
        status: "error",
        duration: 4500,
        isClosable: true,
      });
      return false;
    }
  }
  function savePlan() {
    if (!planDraft) return;
    const classId = planDraft.studentId
      ? teacherStudents.find((student) => student.id === planDraft.studentId)!
          .classId
      : filters.classId;
    const duplicate = plans.find(
      (plan) =>
        plan.topic === planDraft.topic.id &&
        plan.classId === classId &&
        plan.studentId === planDraft.studentId &&
        !plan.completed,
    );
    if (duplicate) {
      toast({
        title: "這個主題已有待複習計畫",
        description: "到資源協助可開啟教學動畫，或完成既有計畫。",
        status: "info",
        duration: 4000,
      });
      setPlanDraft(null);
      setPlanStatus("pending");
      setActiveView("resources");
      return;
    }
    const next: ReviewPlan = {
      id: "review-" + Date.now(),
      topic: planDraft.topic.id,
      classId,
      studentId: planDraft.studentId,
      createdAt: new Date().toISOString(),
      completed: false,
      note: planNote.trim() || planDraft.topic.activity,
    };
    if (persistPlans([next, ...plans])) {
      setPlanDraft(null);
      toast({
        title: "複習計畫已加入",
        description: "到資源協助即可追蹤進度。",
        status: "success",
        duration: 3000,
      });
    }
  }
  function togglePlan(plan: ReviewPlan) {
    if (
      persistPlans(
        plans.map((item) =>
          item.id === plan.id ? { ...item, completed: !item.completed } : item,
        ),
      )
    )
      toast({
        title: plan.completed ? "計畫已重新開啟" : "已完成這次複習",
        status: "success",
        duration: 2500,
      });
  }
  function exportCsv() {
    const exportStudents =
      activeView === "students" ? filteredStudents : students;
    const rows = [
      [
        "班級",
        "座號",
        "學生",
        "統計期間",
        "科目",
        "提問數",
        "練習正確率",
        "需關注",
        "主要概念",
      ],
      ...exportStudents.map((student) => [
        classLabels[student.classId],
        String(student.number),
        student.name,
        periodLabels[filters.period],
        filters.subject === "all" ? "全部科目" : filters.subject,
        String(student.questionCount),
        student.accuracy === null ? "尚無紀錄" : student.accuracy + "%",
        student.needsAttention ? "是" : "否",
        student.mainTopic?.title ?? "",
      ]),
    ];
    const blob = new Blob(
      [
        "\ufeff" +
          rows
            .map((row) =>
              row
                .map((value) => '"' + value.replace(/"/g, '""') + '"')
                .join(","),
            )
            .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "學伴-班級學習摘要-" + filters.period + ".csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({
      title: "班級學習摘要已匯出",
      description:
        "共 " +
        exportStudents.length +
        " 位學生，符合目前班級、科目與學生篩選。",
      status: "success",
      duration: 3000,
    });
  }
  function saveSettings() {
    if (!settingsDraft.displayName.trim()) {
      toast({ title: "請填寫顯示名稱", status: "warning", duration: 2500 });
      return;
    }
    const next = {
      ...settingsDraft,
      displayName: settingsDraft.displayName.trim(),
    };
    try {
      localStorage.setItem(TEACHER_SETTINGS_KEY, JSON.stringify(next));
      setSettings(next);
      setSettingsDraft(next);
      setFilters((current) => ({ ...current, classId: next.defaultClass }));
      toast({ title: "教學偏好已儲存", status: "success", duration: 3000 });
    } catch {
      toast({
        title: "設定尚未儲存",
        description: "瀏覽器儲存空間無法使用，請稍後再試。",
        status: "error",
        duration: 4000,
      });
    }
  }

  const gapChart = useMemo<EChartsOption>(
    () => ({
      animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      animationDuration: 500,
      textStyle: { fontFamily: "Noto Sans TC, sans-serif" },
      grid: { left: 102, right: 35, top: 8, bottom: 10 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: "{b}<br/>需要鞏固的練習：{c} 次",
        confine: true,
      },
      xAxis: {
        type: "value",
        show: false,
        max: Math.max(...topics.map((topic) => topic.gapCount), 1) * 1.2,
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: topics.map((topic) =>
          topic.title
            .replace("熵與熱力學第二定律", "熵與第二定律")
            .replace("反應速率與活化能", "反應速率"),
        ),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 11, color: "#29465C", margin: 14 },
      },
      series: [
        {
          type: "bar",
          data: topics.map((topic) => ({
            value: topic.gapCount,
            itemStyle: {
              color: topic.subject === "物理" ? "#429AF0" : "#1ABDAE",
            },
          })),
          barWidth: 10,
          showBackground: true,
          backgroundStyle: { color: "#F0F5F8", borderRadius: 6 },
          itemStyle: { borderRadius: [0, 6, 6, 0] },
          label: {
            show: true,
            position: "right",
            color: "#29465C",
            fontWeight: 700,
            fontSize: 11,
          },
        },
      ],
      aria: {
        enabled: true,
        description: topics
          .map((topic) => topic.title + "，需鞏固 " + topic.gapCount + " 次")
          .join("；"),
      },
    }),
    [topics],
  );
  const trendChart = useMemo<EChartsOption>(() => {
    const length = periodDays[filters.period];
    const bucketCount = Math.min(length, filters.period === "7d" ? 7 : 6);
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const start = Math.floor(
        (length * (bucketCount - index - 1)) / bucketCount,
      );
      const end = Math.floor((length * (bucketCount - index)) / bucketCount);
      const rows = events.filter(
        (event) => event.daysAgo >= start && event.daysAgo < end,
      );
      const date = new Date(Date.UTC(2026, 8, 5 - (end - 1)));
      return {
        label: date.getUTCMonth() + 1 + "/" + date.getUTCDate(),
        total: rows.length,
        missed: rows.filter((event) => !event.correct).length,
      };
    });
    return {
      animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      animationDuration: 500,
      textStyle: { fontFamily: "Noto Sans TC, sans-serif" },
      color: ["#19B8A7", "#E7A658"],
      tooltip: { trigger: "axis", confine: true },
      legend: {
        bottom: 0,
        icon: "circle",
        textStyle: { color: "#718096", fontSize: 11 },
      },
      grid: { left: 36, right: 13, top: 18, bottom: 60 },
      xAxis: {
        type: "category",
        data: buckets.map((bucket) => bucket.label),
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#E4EDF1" } },
        axisTick: { show: false },
        axisLabel: { color: "#7A91A2", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#EFF4F7" } },
        axisLabel: { color: "#7A91A2", fontSize: 10 },
      },
      series: [
        {
          name: "學習提問",
          type: "line",
          smooth: true,
          symbolSize: 6,
          data: buckets.map((bucket) => bucket.total),
          areaStyle: { color: "#1ABDAE", opacity: 0.08 },
        },
        {
          name: "需鞏固練習",
          type: "line",
          smooth: true,
          symbolSize: 5,
          data: buckets.map((bucket) => bucket.missed),
        },
      ],
      aria: {
        enabled: true,
        description:
          "本期共 " +
          events.length +
          " 次提問，其中 " +
          (events.length - events.filter((event) => event.correct).length) +
          " 次練習需要鞏固。",
      },
    };
  }, [events, filters.period]);

  const filterBar = (
    <Surface p="15px" mb="20px" boxShadow="none">
      <Flex
        justify="space-between"
        align={{ base: "stretch", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap="14px"
      >
        <HStack spacing="8px">
          <Icon as={GraduationCap} color="brand.600" boxSize="19px" />
          <Text fontWeight="700" fontSize="13px">
            我的教學班級
          </Text>
          <Badge colorScheme="teal" borderRadius="full" px="8px">
            {filters.classId === "all"
              ? "3 個班級"
              : classLabels[filters.classId]}
          </Badge>
        </HStack>
        <SimpleGrid
          columns={{ base: 2, sm: 3 }}
          spacing="10px"
          w={{ base: "full", md: "auto" }}
        >
          <Select
            aria-label="選擇班級"
            value={filters.classId}
            onChange={(event) =>
              updateFilter("classId", event.target.value as TeacherClass)
            }
            size="sm"
            borderRadius="9px"
            minW={{ md: "132px" }}
            bg="#FAFCFD"
          >
            {Object.entries(classLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="選擇科目"
            value={filters.subject}
            onChange={(event) =>
              updateFilter("subject", event.target.value as TeacherSubject)
            }
            size="sm"
            borderRadius="9px"
            minW={{ md: "114px" }}
            bg="#FAFCFD"
          >
            <option value="all">全部科目</option>
            <option value="物理">物理</option>
            <option value="化學">化學</option>
          </Select>
          <Select
            aria-label="選擇統計期間"
            value={filters.period}
            onChange={(event) =>
              updateFilter("period", event.target.value as TeacherPeriod)
            }
            size="sm"
            borderRadius="9px"
            minW={{ md: "132px" }}
            bg="#FAFCFD"
          >
            {Object.entries(periodLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </SimpleGrid>
      </Flex>
    </Surface>
  );
  const metrics = (
    <SimpleGrid columns={{ base: 1, sm: 3 }} spacing="16px" mb="20px">
      <Metric
        label="學習提問"
        value={events.length}
        previous={previousEvents.length}
        icon={MessageCircleQuestion}
        color="#328CE7"
        testId="teacher-question-count"
        footer={periodLabels[filters.period] + "累積提問"}
      />
      <Metric
        label="學習學生"
        value={activeStudents.length}
        previous={
          previousStudents.filter((student) => student.questionCount > 0).length
        }
        icon={Users}
        color="#0EAD9C"
        testId="teacher-student-count"
        footer={"已涵蓋 " + students.length + " 位班級學生"}
      />
      <Metric
        label="需要關注"
        value={attentionStudents.length}
        previous={
          previousStudents.filter((student) => student.needsAttention).length
        }
        icon={LifeBuoy}
        color="#EF8736"
        testId="teacher-attention-count"
        footer={"練習 ≥ 3 次，正確率 < " + settings.attentionThreshold + "%"}
      />
    </SimpleGrid>
  );
  const gapPanel = (
    <Surface p={{ base: "18px", md: "22px" }} minW={0}>
      <Heading
        title="最常遇到的學習困難"
        description="依練習尚未答對次數排序，找到值得一起講解的概念。"
        action={
          activeView === "overview" ? (
            <Button
              variant="link"
              size="xs"
              flexShrink={0}
              onClick={() => setActiveView("insights")}
              rightIcon={<ChevronRight size={13} />}
            >
              深入洞察
            </Button>
          ) : undefined
        }
      />
      <HStack spacing="14px" mb="7px" fontSize="11px" color="gray.500">
        <HStack spacing="5px">
          <Box w="7px" h="7px" bg="#429AF0" borderRadius="full" />
          <Text>物理</Text>
        </HStack>
        <HStack spacing="5px">
          <Box w="7px" h="7px" bg="#1ABDAE" borderRadius="full" />
          <Text>化學</Text>
        </HStack>
        <Text ml="auto">共 {gapCount} 次需鞏固</Text>
      </HStack>
      {topics.length ? (
        <ReactECharts
          option={gapChart}
          notMerge
          style={{ height: "235px", width: "100%" }}
          opts={{ renderer: "svg" }}
        />
      ) : (
        <Empty
          title="這段期間還沒有學習紀錄"
          description="試著選擇較長期間，或切換班級與科目。"
        />
      )}
    </Surface>
  );

  return (
    <DashboardShell
      edition="教師版"
      title={viewTitles[activeView]}
      subtitle={viewSubtitles[activeView]}
      ownerName={settings.displayName}
      ownerDetail="青禾國中 · 自然科"
      ownerImage="/assets/reference-teacher-avatar.png"
      items={navigation}
      activeItem={activeView}
      onNavigate={navigate}
      actions={
        activeView !== "settings" ? (
          <Button
            size="sm"
            variant="outline"
            bg="white"
            leftIcon={<Download size={15} />}
            onClick={exportCsv}
          >
            匯出班級摘要
          </Button>
        ) : undefined
      }
    >
      {activeView !== "settings" && filterBar}
      {activeView === "overview" && (
        <>
          {metrics}
          <Grid
            templateColumns={{ base: "1fr", xl: "1.15fr 1fr" }}
            gap="20px"
            mb="20px"
          >
            {gapPanel}
            <Surface p={{ base: "18px", md: "22px" }} minW={0}>
              <Heading
                title="需要關注的學生"
                description="學習訊號是對話的起點，適合再用一題確認理解。"
                action={
                  <Badge
                    bg="#FFF2E8"
                    color="#BE6B25"
                    borderRadius="full"
                    px="9px"
                    py="3px"
                    whiteSpace="nowrap"
                  >
                    {attentionStudents.length} 位
                  </Badge>
                }
              />
              {attentionStudents.length ? (
                <VStack align="stretch" spacing="2px">
                  {attentionStudents.slice(0, 4).map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      onOpen={() => setSelectedStudentId(student.id)}
                    />
                  ))}
                </VStack>
              ) : (
                <Empty
                  title="目前沒有需要優先關注的學生"
                  description="繼續觀察概念理解，或到學生管理查看個別學習進度。"
                />
              )}
              <Flex justify="flex-end" mt="13px">
                <Button
                  variant="link"
                  size="sm"
                  rightIcon={<ChevronRight size={15} />}
                  onClick={() => {
                    setStudentStatus("attention");
                    setActiveView("students");
                  }}
                >
                  查看全部學生
                </Button>
              </Flex>
            </Surface>
          </Grid>
          {settings.showLearningTips && leadingTopic && (
            <Surface
              bg="linear-gradient(110deg, #E8F9F5 0%, #F6FCFA 100%)"
              borderColor="#CFEBE3"
              p={{ base: "18px", md: "22px" }}
              mb="20px"
              boxShadow="none"
            >
              <Flex
                align={{ base: "flex-start", lg: "center" }}
                direction={{ base: "column", lg: "row" }}
                gap="20px"
              >
                <Flex align="center" gap="14px" flex="1">
                  <Image
                    src="/assets/reference-insight-bulb.png"
                    alt=""
                    boxSize="46px"
                    objectFit="contain"
                    flexShrink={0}
                  />
                  <Box>
                    <HStack spacing="7px" mb="6px" flexWrap="wrap">
                      <Badge
                        colorScheme="teal"
                        borderRadius="full"
                        px="7px"
                        fontSize="10px"
                      >
                        本期教學提案
                      </Badge>
                      <Text fontWeight="800" fontSize="14px">
                        先讓「{leadingTopic.title}」看得懂
                      </Text>
                    </HStack>
                    <Text fontSize="12px" lineHeight="1.9" color="#497566">
                      {leadingTopic.studentCount} 位學生在這裡需要再釐清。
                      {leadingTopic.activity}
                    </Text>
                  </Box>
                </Flex>
                <AnimationLink topic={leadingTopic} label="開啟教學動畫" />
              </Flex>
            </Surface>
          )}
          <Grid templateColumns={{ base: "1fr", xl: "1.15fr 1fr" }} gap="20px">
            <Surface p="22px" minW={0}>
              <Heading
                title="學習參與趨勢"
                description={
                  periodLabels[filters.period] + "的提問與需鞏固練習"
                }
              />
              <ReactECharts
                option={trendChart}
                notMerge
                style={{ height: "205px", width: "100%" }}
                opts={{ renderer: "svg" }}
              />
            </Surface>
            <Surface p="22px">
              <Heading
                title="從提問，走到理解"
                description="課堂後的自主探索，也能成為下一次教學的線索。"
              />
              <VStack align="stretch" spacing="19px">
                <Box>
                  <Flex justify="space-between" mb="8px">
                    <Text fontSize="13px" fontWeight="700">
                      練習正確率
                    </Text>
                    <Text fontWeight="800" fontSize="14px" color="brand.700">
                      {events.length ? accuracy + "%" : "—"}
                    </Text>
                  </Flex>
                  <Progress
                    value={accuracy}
                    size="sm"
                    borderRadius="full"
                    colorScheme="teal"
                    bg="#EDF5F5"
                  />
                  <Text fontSize="11px" color="gray.500" mt="7px">
                    {correctCount} / {events.length} 次概念練習答對
                  </Text>
                </Box>
                <Box>
                  <Flex justify="space-between" mb="8px">
                    <Text fontSize="13px" fontWeight="700">
                      教學動畫看完率
                    </Text>
                    <Text fontWeight="800" fontSize="14px" color="blue.600">
                      {events.length
                        ? Math.round((animationCount / events.length) * 100) +
                          "%"
                        : "—"}
                    </Text>
                  </Flex>
                  <Progress
                    value={
                      events.length ? (animationCount / events.length) * 100 : 0
                    }
                    size="sm"
                    borderRadius="full"
                    colorScheme="blue"
                    bg="#EDF3FA"
                  />
                  <Text fontSize="11px" color="gray.500" mt="7px">
                    {animationCount} / {events.length} 次提問完成動畫觀看
                  </Text>
                </Box>
                <Divider />
                <Button
                  variant="ghost"
                  justifyContent="space-between"
                  size="sm"
                  rightIcon={<ArrowRight size={15} />}
                  onClick={() => setActiveView("resources")}
                >
                  複習計畫
                  <Text
                    as="span"
                    ml="auto"
                    mr="12px"
                    fontSize="12px"
                    color="gray.500"
                  >
                    {scopedPlans.filter((plan) => !plan.completed).length}{" "}
                    項待完成
                  </Text>
                </Button>
              </VStack>
            </Surface>
          </Grid>
        </>
      )}

      {activeView === "students" && (
        <>
          {metrics}
          <Surface p={{ base: "16px", md: "22px" }}>
            <Heading
              title="班級學習名冊"
              description="點選學生，查看概念理解與可採取的教學行動。"
              action={
                <Badge colorScheme="teal" borderRadius="full" px="9px">
                  {filteredStudents.length} 位學生
                </Badge>
              }
            />
            <Flex
              gap="12px"
              direction={{ base: "column", md: "row" }}
              mb="19px"
            >
              <InputGroup maxW={{ md: "340px" }}>
                <InputLeftElement pointerEvents="none">
                  <Search size={16} color="#8A9EAB" />
                </InputLeftElement>
                <Input
                  aria-label="搜尋學生"
                  placeholder="搜尋姓名、班級或座號"
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  bg="#FAFCFD"
                  fontSize="13px"
                />
              </InputGroup>
              <Select
                aria-label="篩選學生學習狀態"
                maxW={{ md: "190px" }}
                value={studentStatus}
                onChange={(event) =>
                  setStudentStatus(event.target.value as StudentStatus)
                }
                fontSize="13px"
              >
                <option value="all">全部學習狀態</option>
                <option value="attention">需要關注</option>
                <option value="steady">持續學習中</option>
                <option value="inactive">尚無學習紀錄</option>
              </Select>
              {(studentSearch || studentStatus !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  alignSelf="center"
                  onClick={() => {
                    setStudentSearch("");
                    setStudentStatus("all");
                  }}
                >
                  清除學生篩選
                </Button>
              )}
            </Flex>
            {filteredStudents.length ? (
              <TableContainer>
                <Table size="sm" variant="simple">
                  <Thead bg="#F6FAFC">
                    <Tr>
                      {[
                        "學生",
                        "班級 / 座號",
                        "提問數",
                        "練習正確率",
                        "主要概念",
                        "學習訊號",
                        "詳情",
                      ].map((label) => (
                        <Th
                          key={label}
                          fontSize="11px"
                          py="13px"
                          color="gray.500"
                          borderColor="#EAF0F4"
                        >
                          {label}
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredStudents.map((student) => (
                      <Tr key={student.id} _hover={{ bg: "#FAFCFD" }}>
                        <Td py="15px">
                          <HStack spacing="9px">
                            <Avatar
                              name={student.name.slice(1)}
                              getInitials={(name) => name.slice(0, 1)}
                              size="xs"
                              bg="brand.50"
                              color="brand.700"
                            />
                            <Text
                              fontWeight="700"
                              color="navy.900"
                              fontSize="13px"
                            >
                              {student.name}
                            </Text>
                          </HStack>
                        </Td>
                        <Td fontSize="12px">
                          {classLabels[student.classId]} /{" "}
                          {String(student.number).padStart(2, "0")}
                        </Td>
                        <Td fontWeight="700" fontSize="13px">
                          {student.questionCount}
                        </Td>
                        <Td fontSize="13px">
                          {student.accuracy === null
                            ? "—"
                            : student.accuracy + "%"}
                        </Td>
                        <Td fontSize="12px">
                          {student.mainTopic?.title ?? "尚無紀錄"}
                        </Td>
                        <Td>
                          <Badge
                            px="7px"
                            py="2px"
                            borderRadius="full"
                            colorScheme={
                              student.needsAttention
                                ? "orange"
                                : student.questionCount === 0
                                  ? "gray"
                                  : "teal"
                            }
                            fontSize="10px"
                          >
                            {student.needsAttention
                              ? "需要關注"
                              : student.questionCount === 0
                                ? "尚無紀錄"
                                : student.questionCount < 3
                                  ? "持續觀察"
                                  : "持續學習中"}
                          </Badge>
                        </Td>
                        <Td>
                          <Button
                            aria-label={"查看 " + student.name + " 學習詳情"}
                            size="xs"
                            variant="ghost"
                            onClick={() => setSelectedStudentId(student.id)}
                            rightIcon={<ChevronRight size={13} />}
                          >
                            查看
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            ) : (
              <Empty
                title="沒有符合條件的學生"
                description="試著更換搜尋字詞或學習狀態，完整名冊仍保留在這裡。"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStudentSearch("");
                      setStudentStatus("all");
                    }}
                  >
                    顯示全部學生
                  </Button>
                }
              />
            )}
            <Text fontSize="11px" color="gray.500" mt="18px" lineHeight="1.8">
              關注條件：本期至少 3 次練習，且正確率低於{" "}
              {settings.attentionThreshold}
              %。練習較少時標記為持續觀察，可在設定調整條件。
            </Text>
          </Surface>
        </>
      )}

      {activeView === "insights" && (
        <>
          <Grid
            templateColumns={{ base: "1fr", xl: "1.15fr 1fr" }}
            gap="20px"
            mb="22px"
          >
            {gapPanel}
            <Surface p="22px" bg="linear-gradient(140deg, #EFFAF7, #FFFFFF)">
              <HStack color="brand.700" mb="14px">
                <Icon as={Sparkles} boxSize="18px" />
                <Text fontWeight="800" fontSize="14px">
                  下一堂課，從這裡開始
                </Text>
              </HStack>
              {leadingTopic ? (
                <>
                  <Text
                    as="h2"
                    fontSize="23px"
                    fontWeight="800"
                    color="navy.900"
                    lineHeight="1.6"
                  >
                    {leadingTopic.title}
                  </Text>
                  <Text
                    fontSize="13px"
                    color="gray.600"
                    lineHeight="1.9"
                    mt="12px"
                  >
                    {leadingTopic.misconception}
                  </Text>
                  <HStack spacing="20px" mt="20px">
                    <Box>
                      <Text fontSize="24px" color="brand.700" fontWeight="800">
                        {leadingTopic.studentCount}
                        <Text
                          as="span"
                          fontSize="12px"
                          ml="5px"
                          color="gray.500"
                        >
                          位學生
                        </Text>
                      </Text>
                      <Text fontSize="11px" color="gray.500">
                        在此概念需要鞏固
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="24px" color="navy.700" fontWeight="800">
                        {leadingTopic.duration}
                        <Text
                          as="span"
                          fontSize="12px"
                          ml="5px"
                          color="gray.500"
                        >
                          分鐘
                        </Text>
                      </Text>
                      <Text fontSize="11px" color="gray.500">
                        建議活動時間
                      </Text>
                    </Box>
                  </HStack>
                  <Button
                    mt="23px"
                    size="sm"
                    leftIcon={<Plus size={15} />}
                    onClick={() => openPlan(leadingTopic)}
                  >
                    安排重點複習
                  </Button>
                </>
              ) : (
                <Empty
                  title="等待新的學習線索"
                  description="切換班級或期間，查看已有的概念練習。"
                />
              )}
            </Surface>
          </Grid>
          <Heading
            title="概念教學建議"
            description="先確認學生怎麼想，再透過動畫觀察，最後用一句話說明。"
          />
          <SimpleGrid columns={{ base: 1, xl: 2 }} spacing="18px">
            {topics.map((topic) => (
              <Surface key={topic.id} p="22px">
                <HStack justify="space-between" align="flex-start" mb="14px">
                  <HStack spacing="11px">
                    <Flex
                      p="10px"
                      borderRadius="11px"
                      bg={topic.subject === "物理" ? "#EBF4FF" : "brand.50"}
                    >
                      <Icon
                        as={topic.subject === "物理" ? Atom : FlaskConical}
                        boxSize="20px"
                        color={
                          topic.subject === "物理" ? "blue.500" : "brand.600"
                        }
                      />
                    </Flex>
                    <Box>
                      <Text
                        as="h3"
                        fontWeight="800"
                        fontSize="15px"
                        color="navy.900"
                      >
                        {topic.title}
                      </Text>
                      <Text fontSize="11px" color="gray.500" mt="4px">
                        {topic.subject} · {topic.studentCount} 位學生需鞏固 ·
                        正確率 {topic.accuracy}%
                      </Text>
                    </Box>
                  </HStack>
                  <Badge
                    colorScheme="orange"
                    px="8px"
                    borderRadius="full"
                    flexShrink={0}
                  >
                    {topic.gapCount} 次
                  </Badge>
                </HStack>
                <Text fontSize="12px" color="gray.600" lineHeight="1.9">
                  {topic.misconception}
                </Text>
                <Box bg="#F5FAFC" p="13px" borderRadius="11px" mt="14px">
                  <Text
                    color="brand.700"
                    fontSize="11px"
                    fontWeight="800"
                    mb="5px"
                  >
                    建議教學活動 · {topic.duration} 分鐘
                  </Text>
                  <Text fontSize="12px" lineHeight="1.9">
                    {topic.activity}
                  </Text>
                </Box>
                <Flex gap="9px" mt="17px" flexWrap="wrap">
                  <AnimationLink topic={topic} />
                  <Button
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={() => openPlan(topic)}
                    aria-label={"安排" + topic.title + "複習"}
                  >
                    安排複習
                  </Button>
                </Flex>
              </Surface>
            ))}
          </SimpleGrid>
        </>
      )}

      {activeView === "resources" && (
        <>
          <Surface p={{ base: "18px", md: "22px" }} mb="24px">
            <Heading
              title="我的複習計畫"
              description="依目前班級與科目顯示；完成後保留紀錄，隨時可以重新開啟。"
              action={
                <Badge
                  colorScheme="teal"
                  px="9px"
                  borderRadius="full"
                  whiteSpace="nowrap"
                >
                  {scopedPlans.filter((plan) => !plan.completed).length}{" "}
                  項待複習
                </Badge>
              }
            />
            <HStack mb="18px" spacing="8px" flexWrap="wrap">
              {(
                [
                  { id: "all", label: "全部計畫" },
                  { id: "pending", label: "待複習" },
                  { id: "completed", label: "已完成" },
                ] as const
              ).map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={planStatus === item.id ? "solid" : "ghost"}
                  onClick={() => setPlanStatus(item.id)}
                  aria-pressed={planStatus === item.id}
                >
                  {item.label}
                </Button>
              ))}
            </HStack>
            {visiblePlans.length ? (
              <VStack spacing="12px" align="stretch">
                {visiblePlans.map((plan) => {
                  const topic = teacherTopics.find(
                    (item) => item.id === plan.topic,
                  )!;
                  const student = teacherStudents.find(
                    (item) => item.id === plan.studentId,
                  );
                  return (
                    <Box
                      key={plan.id}
                      p="16px"
                      bg={plan.completed ? "#F7FAFB" : "#F5FBF9"}
                      border="1px solid"
                      borderColor={plan.completed ? "#E4EDF1" : "#D9EEE7"}
                      borderRadius="13px"
                    >
                      <Flex
                        gap="15px"
                        align="flex-start"
                        direction={{ base: "column", md: "row" }}
                      >
                        <Flex gap="12px" flex="1">
                          <Icon
                            as={plan.completed ? CheckCircle2 : ClipboardList}
                            color={plan.completed ? "brand.500" : "brand.700"}
                            boxSize="20px"
                            mt="3px"
                            flexShrink={0}
                          />
                          <Box>
                            <HStack flexWrap="wrap" spacing="8px">
                              <Text
                                fontSize="14px"
                                fontWeight="800"
                                color="navy.900"
                              >
                                {topic.title}
                              </Text>
                              <Badge
                                borderRadius="full"
                                fontSize="10px"
                                colorScheme={plan.completed ? "teal" : "orange"}
                              >
                                {plan.completed ? "已完成" : "待複習"}
                              </Badge>
                            </HStack>
                            <Text fontSize="11px" color="gray.500" mt="5px">
                              {classLabels[plan.classId]}
                              {student
                                ? " · " + student.name
                                : " · 班級複習"} ·{" "}
                              {new Date(plan.createdAt).toLocaleDateString(
                                "zh-TW",
                              )}{" "}
                              建立
                            </Text>
                            <Text
                              fontSize="12px"
                              lineHeight="1.9"
                              mt="9px"
                              whiteSpace="pre-wrap"
                            >
                              {plan.note}
                            </Text>
                          </Box>
                        </Flex>
                        <Flex gap="7px" flexWrap="wrap">
                          <AnimationLink topic={topic} label="開啟動畫" />
                          <Button
                            size="sm"
                            variant={plan.completed ? "ghost" : "solid"}
                            leftIcon={
                              plan.completed ? undefined : <Check size={12} />
                            }
                            onClick={() => togglePlan(plan)}
                            aria-label={
                              (plan.completed ? "重新開啟" : "完成") +
                              topic.title +
                              "複習"
                            }
                          >
                            {plan.completed ? "重新開啟" : "標記完成"}
                          </Button>
                        </Flex>
                      </Flex>
                    </Box>
                  );
                })}
              </VStack>
            ) : (
              <Empty
                title={
                  planStatus === "completed"
                    ? "完成的複習會留在這裡"
                    : plans.length
                      ? "這個範圍還沒有符合的複習計畫"
                      : "為下一堂課，準備一個理解的起點"
                }
                description="從下方挑選教學動畫，加入複習計畫；也可以從學生詳情安排個別引導。"
              />
            )}
          </Surface>
          <Heading
            title="物理與化學教學動畫"
            description="從受力、能量到粒子世界，先觀察，再推理，最後練習。"
            action={
              <Badge
                bg="brand.50"
                color="brand.700"
                px="9px"
                borderRadius="full"
                whiteSpace="nowrap"
              >
                {availableTopics.length} 個主題
              </Badge>
            }
          />
          <SimpleGrid columns={{ base: 1, md: 2, "2xl": 3 }} spacing="18px">
            {availableTopics.map((topic, index) => (
              <Surface key={topic.id} overflow="hidden">
                <Flex
                  h="115px"
                  bg={
                    topic.subject === "物理"
                      ? "linear-gradient(120deg, #E5F2FD, #F4FAFF)"
                      : "linear-gradient(120deg, #DFF6F0, #F3FCF9)"
                  }
                  px="24px"
                  align="center"
                  justify="space-between"
                >
                  <Box>
                    <Text
                      color={
                        topic.subject === "物理" ? "blue.600" : "brand.700"
                      }
                      letterSpacing="2px"
                      fontSize="10px"
                      fontWeight="800"
                    >
                      {topic.subject} · 教學動畫
                    </Text>
                    <Text
                      mt="8px"
                      fontSize="22px"
                      fontWeight="800"
                      color="navy.700"
                    >
                      {
                        [
                          "F = ma",
                          "ΔU = Q − W",
                          "ΔS總 ≥ 0",
                          "正反應 ⇌ 逆反應",
                          "H₂O ··· H₂O",
                          "E ≥ Eₐ",
                        ][
                          teacherTopics.findIndex(
                            (item) => item.id === topic.id,
                          )
                        ]
                      }
                    </Text>
                  </Box>
                  <Icon
                    as={topic.subject === "物理" ? Atom : FlaskConical}
                    boxSize="48px"
                    color={topic.subject === "物理" ? "#88BAE1" : "#7BD4C2"}
                    strokeWidth="1.2"
                    transform={"rotate(" + (index % 2 ? 8 : -8) + "deg)"}
                  />
                </Flex>
                <Box p="20px">
                  <Text
                    as="h3"
                    color="navy.900"
                    fontWeight="800"
                    fontSize="15px"
                  >
                    {topic.title}
                  </Text>
                  <Text
                    fontSize="12px"
                    color="gray.500"
                    lineHeight="1.9"
                    mt="8px"
                    minH="45px"
                  >
                    {topic.question}
                  </Text>
                  <HStack spacing="9px" mt="17px">
                    <AnimationLink topic={topic} label="開啟動畫" />
                    <Button
                      size="sm"
                      onClick={() => openPlan(topic)}
                      aria-label={"加入" + topic.title + "複習計畫"}
                      leftIcon={<Plus size={15} />}
                    >
                      加入計畫
                    </Button>
                  </HStack>
                </Box>
              </Surface>
            ))}
          </SimpleGrid>
        </>
      )}

      {activeView === "settings" && (
        <Grid templateColumns={{ base: "1fr", xl: "1.4fr 1fr" }} gap="22px">
          <Surface p={{ base: "20px", md: "26px" }}>
            <Heading
              title="我的教學工作台"
              description="儲存後會套用到學習洞察，下次開啟也會保留。"
            />
            <VStack align="stretch" spacing="24px">
              <FormControl>
                <FormLabel
                  fontSize="13px"
                  fontWeight="700"
                  htmlFor="teacher-display-name"
                >
                  顯示名稱
                </FormLabel>
                <Input
                  id="teacher-display-name"
                  maxLength={20}
                  value={settingsDraft.displayName}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                />
                <Text fontSize="11px" color="gray.500" mt="7px">
                  顯示在側邊欄，最多 20 個字。
                </Text>
              </FormControl>
              <FormControl>
                <FormLabel
                  fontSize="13px"
                  fontWeight="700"
                  htmlFor="teacher-default-class"
                >
                  預設班級
                </FormLabel>
                <Select
                  id="teacher-default-class"
                  value={settingsDraft.defaultClass}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      defaultClass: event.target.value as TeacherClass,
                    }))
                  }
                >
                  {Object.entries(classLabels).map(([id, label]) => (
                    <option value={id} key={id}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <Divider />
              <FormControl>
                <FormLabel
                  fontSize="13px"
                  fontWeight="700"
                  htmlFor="teacher-attention-threshold"
                >
                  需要關注的練習正確率門檻
                </FormLabel>
                <Select
                  id="teacher-attention-threshold"
                  value={settingsDraft.attentionThreshold}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      attentionThreshold: Number(event.target.value),
                    }))
                  }
                >
                  {[50, 60, 65, 70].map((threshold) => (
                    <option key={threshold} value={threshold}>
                      低於 {threshold}%
                    </option>
                  ))}
                </Select>
                <Text
                  fontSize="11px"
                  color="gray.500"
                  lineHeight="1.8"
                  mt="7px"
                >
                  需先有至少 3
                  次概念練習，才會列入需要關注名單。這個條件協助安排引導，仍需透過課堂互動了解學生。
                </Text>
              </FormControl>
              <FormControl
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap="12px"
              >
                <Box>
                  <FormLabel
                    fontSize="13px"
                    fontWeight="700"
                    htmlFor="teacher-learning-tips"
                    mb="5px"
                  >
                    顯示教學提案
                  </FormLabel>
                  <Text fontSize="11px" color="gray.500">
                    在總覽顯示優先概念與教學動畫建議。
                  </Text>
                </Box>
                <Switch
                  id="teacher-learning-tips"
                  isChecked={settingsDraft.showLearningTips}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      showLearningTips: event.target.checked,
                    }))
                  }
                  colorScheme="teal"
                />
              </FormControl>
              <Flex pt="5px" gap="10px">
                <Button
                  size="sm"
                  onClick={saveSettings}
                  leftIcon={<Check size={15} />}
                >
                  儲存教學偏好
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSettingsDraft({ ...defaultTeacherSettings });
                    toast({
                      title: "已帶入預設偏好",
                      description: "按下儲存後套用。",
                      status: "info",
                      duration: 2500,
                    });
                  }}
                >
                  還原預設值
                </Button>
              </Flex>
            </VStack>
          </Surface>
          <VStack align="stretch" spacing="20px">
            <Surface
              p="24px"
              bg="#F0FAF7"
              borderColor="#D7EEE5"
              boxShadow="none"
            >
              <HStack mb="16px">
                <Icon as={GraduationCap} color="brand.700" boxSize="22px" />
                <Text fontWeight="800" color="navy.900">
                  青禾國中 · 自然科
                </Text>
              </HStack>
              <Text fontSize="13px" lineHeight="2" color="gray.600">
                目前管理八年級 3 個班級，共 42
                位學生。教師工作台整合概念練習、教學動畫與複習計畫，幫你把注意力放在下一步教學。
              </Text>
              <Divider my="18px" />
              <HStack justify="space-between">
                <Text fontSize="12px" color="gray.500">
                  學習資料更新日
                </Text>
                <Text fontSize="12px" fontWeight="700">
                  {snapshotLabel}
                </Text>
              </HStack>
            </Surface>
            <Surface p="24px">
              <HStack mb="12px">
                <Icon as={Lightbulb} color="orange.400" boxSize="19px" />
                <Text fontWeight="800" fontSize="14px">
                  用訊號開啟對話
                </Text>
              </HStack>
              <Text fontSize="12px" color="gray.600" lineHeight="2">
                先問學生「你是怎麼想的？」，再搭配動畫與一題概念練習。提問多或答錯，都可能是正在積極理解的過程。
              </Text>
            </Surface>
          </VStack>
        </Grid>
      )}

      {activeView !== "settings" && (
        <Flex
          justify="space-between"
          gap="10px"
          flexWrap="wrap"
          mt="22px"
          color="gray.500"
          fontSize="10px"
        >
          <Text>青禾國中 · 自然科教學工作台</Text>
          <Text>
            資料截至 {snapshotLabel} · {periodLabels[filters.period]} ·{" "}
            {filters.subject === "all" ? "物理與化學" : filters.subject}
          </Text>
        </Flex>
      )}

      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudentId(null)}
        size="xl"
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(3px)" />
        <ModalContent borderRadius="20px" mx="14px">
          <ModalHeader pb="10px">
            <Text fontSize="19px" color="navy.900">
              {selectedStudent?.name}的學習概況
            </Text>
            <Text fontSize="12px" color="gray.500" fontWeight="400" mt="6px">
              {selectedStudent && classLabels[selectedStudent.classId]} ·{" "}
              {periodLabels[filters.period]} ·{" "}
              {filters.subject === "all" ? "物理與化學" : filters.subject}
            </Text>
          </ModalHeader>
          <ModalCloseButton aria-label="關閉學生學習詳情" />
          <ModalBody pb="20px">
            {selectedStudent && (
              <>
                <SimpleGrid columns={3} gap="10px" mb="22px">
                  {[
                    { label: "學習提問", value: selectedStudent.questionCount },
                    {
                      label: "練習正確率",
                      value:
                        selectedStudent.accuracy === null
                          ? "—"
                          : selectedStudent.accuracy + "%",
                    },
                    {
                      label: "看完動畫",
                      value: selectedStudent.animationCount,
                    },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      p="14px"
                      bg="#F3F9FB"
                      borderRadius="12px"
                      textAlign="center"
                    >
                      <Text fontWeight="800" fontSize="23px" color="navy.900">
                        {item.value}
                      </Text>
                      <Text fontSize="11px" color="gray.500" mt="4px">
                        {item.label}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
                <Heading
                  title="概念理解線索"
                  description={
                    selectedStudent.needsAttention
                      ? "練習正確率低於關注門檻，建議從主要概念開始確認。"
                      : selectedStudent.questionCount < 3
                        ? "目前練習較少，可以先累積幾次概念觀察。"
                        : "持續觀察不同概念的練習，再調整教學節奏。"
                  }
                />
                <VStack spacing="13px" align="stretch">
                  {summarizeTopics(selectedStudent.events).map((topic) => (
                    <Box key={topic.id}>
                      <Flex
                        justify="space-between"
                        align="baseline"
                        mb="6px"
                        gap="8px"
                      >
                        <Text fontSize="12px" fontWeight="700">
                          {topic.title}
                        </Text>
                        <Text fontSize="11px" color="gray.500">
                          {topic.questions - topic.gapCount} / {topic.questions}{" "}
                          次答對
                        </Text>
                      </Flex>
                      <Progress
                        value={topic.accuracy ?? 0}
                        size="xs"
                        borderRadius="full"
                        colorScheme={
                          topic.accuracy !== null &&
                          topic.accuracy < settings.attentionThreshold
                            ? "orange"
                            : "teal"
                        }
                      />
                    </Box>
                  ))}
                </VStack>
                {selectedStudent.mainTopic ? (
                  <Box bg="brand.50" borderRadius="13px" p="17px" mt="23px">
                    <HStack mb="9px" color="brand.700">
                      <Icon as={Sparkles} boxSize="15px" />
                      <Text fontSize="13px" fontWeight="800">
                        下一步教學建議
                      </Text>
                    </HStack>
                    <Text fontSize="12px" lineHeight="1.9">
                      {selectedStudent.mainTopic.activity}
                    </Text>
                    <Text
                      fontSize="12px"
                      color="brand.800"
                      fontWeight="700"
                      mt="12px"
                      mb="14px"
                      lineHeight="1.9"
                    >
                      可以先問：「{selectedStudent.mainTopic.question}」
                    </Text>
                    <AnimationLink
                      topic={selectedStudent.mainTopic}
                      label="一起看教學動畫"
                    />
                  </Box>
                ) : (
                  <Empty
                    title="還沒有這個範圍的學習紀錄"
                    description="切換期間或科目，或先邀請學生探索教學動畫。"
                  />
                )}
              </>
            )}
          </ModalBody>
          <ModalFooter gap="9px">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStudentId(null)}
            >
              關閉
            </Button>
            {selectedStudent?.mainTopic && (
              <Button
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() =>
                  openPlan(selectedStudent.mainTopic!, selectedStudent.id)
                }
              >
                安排個別複習
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={!!planDraft}
        onClose={() => setPlanDraft(null)}
        size="lg"
        isCentered
      >
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(3px)" />
        <ModalContent borderRadius="20px" mx="14px">
          <ModalHeader fontSize="19px" color="navy.900">
            安排複習計畫
          </ModalHeader>
          <ModalCloseButton aria-label="關閉複習計畫" />
          <ModalBody>
            {planDraft && (
              <>
                <HStack spacing="10px" mb="17px">
                  <Flex p="10px" borderRadius="11px" bg="brand.50">
                    <Icon as={BookOpen} boxSize="21px" color="brand.700" />
                  </Flex>
                  <Box>
                    <Text fontWeight="800" fontSize="15px">
                      {planDraft.topic.title}
                    </Text>
                    <Text fontSize="12px" color="gray.500" mt="4px">
                      {planDraft.studentId
                        ? teacherStudents.find(
                            (student) => student.id === planDraft.studentId,
                          )?.name + " · 個別複習"
                        : classLabels[filters.classId] + " · 班級複習"}{" "}
                      · 約 {planDraft.topic.duration} 分鐘
                    </Text>
                  </Box>
                </HStack>
                <Box p="15px" bg="#F5FAFC" borderRadius="12px" mb="19px">
                  <Text fontSize="12px" lineHeight="1.9">
                    {planDraft.topic.activity}
                  </Text>
                </Box>
                <FormControl>
                  <FormLabel
                    htmlFor="teacher-plan-note"
                    fontSize="13px"
                    fontWeight="700"
                  >
                    給自己的教學備註
                  </FormLabel>
                  <Textarea
                    id="teacher-plan-note"
                    placeholder="例如：先請學生畫受力圖，再播放動畫核對。"
                    value={planNote}
                    onChange={(event) => setPlanNote(event.target.value)}
                    maxLength={500}
                    fontSize="13px"
                    rows={3}
                  />
                  <Text fontSize="11px" color="gray.500" mt="7px">
                    可留空，將使用上方建議活動。計畫儲存在你的教師工作台。
                  </Text>
                </FormControl>
              </>
            )}
          </ModalBody>
          <ModalFooter gap="9px">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPlanDraft(null)}
            >
              取消
            </Button>
            <Button size="sm" onClick={savePlan} leftIcon={<Plus size={14} />}>
              儲存複習計畫
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardShell>
  );
}
