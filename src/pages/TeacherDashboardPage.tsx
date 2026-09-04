import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  useDisclosure,
  VStack,
  type BoxProps,
} from "@chakra-ui/react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  MessageCircleQuestion,
  Settings,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Surface } from "@/components/ui/Surface";
import { learningGaps } from "@/data/demo";

type Period = "7d" | "30d" | "term";

interface Metric {
  label: string;
  value: number;
  change: string;
  icon: LucideIcon;
  color: string;
  chipBackground: string;
}

interface AttentionStudent {
  name: string;
  avatar: string;
  signal: Record<Period, string>;
  level: "high" | "medium";
  category: string;
  suggestion: string;
}

const periodLabels: Record<Period, string> = {
  "7d": "過去 7 天",
  "30d": "過去 30 天",
  term: "本學期",
};

const periodMetrics: Record<Period, Array<Pick<Metric, "value" | "change">>> = {
  "7d": [
    { value: 128, change: "+12%" },
    { value: 42, change: "+5%" },
    { value: 18, change: "+28%" },
  ],
  "30d": [
    { value: 486, change: "+18%" },
    { value: 42, change: "+5%" },
    { value: 22, change: "+16%" },
  ],
  term: [
    { value: 1642, change: "+24%" },
    { value: 42, change: "+5%" },
    { value: 31, change: "+19%" },
  ],
};

const metricStyles: Array<Omit<Metric, "value" | "change">> = [
  {
    label: "提問數",
    icon: MessageCircleQuestion,
    color: "#2F80ED",
    chipBackground: "#EAF3FF",
  },
  {
    label: "學生數",
    icon: Users,
    color: "#0FAF9E",
    chipBackground: "#E5F8F5",
  },
  {
    label: "需協助",
    icon: LifeBuoy,
    color: "#F27A24",
    chipBackground: "#FFF1E7",
  },
];

const gapData: Record<Period, typeof learningGaps> = {
  "7d": learningGaps,
  "30d": [
    { topic: "分數", count: 138 },
    { topic: "百分率", count: 101 },
    { topic: "圓面積", count: 65 },
    { topic: "應用題", count: 44 },
    { topic: "比例", count: 32 },
  ],
  term: [
    { topic: "分數", count: 412 },
    { topic: "百分率", count: 306 },
    { topic: "圓面積", count: 188 },
    { topic: "應用題", count: 129 },
    { topic: "比例", count: 96 },
  ],
};

const attentionStudents: AttentionStudent[] = [
  {
    name: "陳小明",
    avatar: "明",
    level: "high",
    category: "高頻提問",
    signal: {
      "7d": "近 7 天提問 12 次",
      "30d": "近 30 天提問 38 次",
      term: "本學期提問 96 次",
    },
    suggestion: "建議先了解是否卡在分數與比例的基礎概念。",
  },
  {
    name: "林小華",
    avatar: "華",
    level: "medium",
    category: "錯誤增加",
    signal: {
      "7d": "近期錯誤增加",
      "30d": "錯誤題數較前期增加 18%",
      term: "連續兩個單元錯誤率偏高",
    },
    suggestion: "可安排短題組，確認百分率換算的理解狀況。",
  },
  {
    name: "張小花",
    avatar: "花",
    level: "medium",
    category: "正確率下降",
    signal: {
      "7d": "數學答題正確率下降",
      "30d": "近 30 天正確率下降 9%",
      term: "應用題正確率低於班級平均",
    },
    suggestion: "建議從題意拆解開始，搭配一步一問的練習。",
  },
];

const navItems = [
  { label: "總覽", icon: LayoutDashboard },
  { label: "學生管理", icon: Users },
  { label: "學習洞察", icon: BarChart3 },
  { label: "資源協助", icon: LifeBuoy },
  { label: "設定", icon: Settings },
];

function MetricCard({ label, value, change, icon, color, chipBackground }: Metric) {
  return (
    <Surface
      px={{ base: "16px", md: "18px" }}
      py="17px"
      minH="106px"
      transition="transform .2s ease, box-shadow .2s ease, border-color .2s ease"
      _hover={{ transform: "translateY(-2px)", boxShadow: "float", borderColor: chipBackground }}
    >
      <HStack align="center" spacing="14px">
        <Flex
          w="46px"
          h="46px"
          flexShrink={0}
          align="center"
          justify="center"
          borderRadius="13px"
          bg={chipBackground}
        >
          <Icon as={icon} boxSize="23px" color={color} strokeWidth="2.25" />
        </Flex>
        <Box minW={0}>
          <Text fontSize={{ base: "25px", md: "28px" }} lineHeight="1" fontWeight="800" color="navy.900">
            {value.toLocaleString("zh-TW")}
          </Text>
          <HStack mt="7px" spacing="8px" align="baseline" flexWrap="wrap">
            <Text fontSize="13px" fontWeight="700" color="navy.500">
              {label}
            </Text>
            <HStack spacing="2px" color={label === "需協助" ? "critical" : "success"}>
              <TrendingUp size={12} aria-hidden="true" />
              <Text fontSize="11px" fontWeight="800">
                {change}
              </Text>
            </HStack>
          </HStack>
        </Box>
      </HStack>
    </Surface>
  );
}

function SectionTitle({ children, ...props }: BoxProps) {
  return (
    <Text as="h2" fontSize="16px" fontWeight="800" color="navy.900" {...props}>
      {children}
    </Text>
  );
}

function AttentionRow({ student, period }: { student: AttentionStudent; period: Period }) {
  return (
    <HStack
      px="12px"
      py="11px"
      spacing="11px"
      borderRadius="12px"
      transition="background-color .18s ease, transform .18s ease"
      _hover={{ bg: "#F5FAFC", transform: "translateX(2px)" }}
    >
      <Flex
        w="38px"
        h="38px"
        flexShrink={0}
        align="center"
        justify="center"
        bg={student.level === "high" ? "#FFF0EB" : "#EAF7F7"}
        borderRadius="11px"
        fontSize="21px"
        aria-hidden="true"
      >
        {student.avatar}
      </Flex>
      <Box minW={0} flex="1">
        <HStack spacing="7px" mb="3px">
          <Text fontSize="13px" fontWeight="800" color="navy.900" noOfLines={1}>
            {student.name}
          </Text>
          <Badge
            px="6px"
            py="1px"
            borderRadius="full"
            textTransform="none"
            fontSize="9px"
            color={student.level === "high" ? "#C84331" : "#137B76"}
            bg={student.level === "high" ? "#FFF0EB" : "#E8F7F5"}
          >
            {student.category}
          </Badge>
        </HStack>
        <Text fontSize="12px" color="gray.600" noOfLines={1}>
          {student.signal[period]}
        </Text>
      </Box>
      <ChevronRight size={16} color="#9AAEB8" aria-hidden="true" />
    </HStack>
  );
}

function AttentionModal({
  isOpen,
  onClose,
  period,
}: {
  isOpen: boolean;
  onClose: () => void;
  period: Period;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg" motionPreset="slideInBottom">
      <ModalOverlay bg="rgba(9, 36, 60, .46)" backdropFilter="blur(3px)" />
      <ModalContent mx="16px" borderRadius="20px" overflow="hidden">
        <ModalHeader pb="7px" color="navy.900" fontSize="19px">
          需要關注的學生
          <Text mt="4px" fontSize="12px" fontWeight="500" color="gray.500">
            {periodLabels[period]}的學習訊號與建議行動
          </Text>
        </ModalHeader>
        <ModalCloseButton aria-label="關閉需要關注的學生清單" top="13px" right="13px" />
        <ModalBody pt="12px" pb="8px">
          <VStack align="stretch" spacing="10px">
            {attentionStudents.map((student) => (
              <Box key={student.name} p="14px" borderRadius="14px" bg="#F6FAFC" border="1px solid" borderColor="#E6EEF2">
                <HStack spacing="10px" mb="9px">
                  <Flex
                    w="38px"
                    h="38px"
                    align="center"
                    justify="center"
                    borderRadius="11px"
                    bg={student.level === "high" ? "#FFF0EB" : "#EAF7F7"}
                    fontSize="21px"
                    aria-hidden="true"
                  >
                    {student.avatar}
                  </Flex>
                  <Box>
                    <Text fontSize="14px" fontWeight="800" color="navy.900">
                      {student.name}
                    </Text>
                    <Text fontSize="12px" color={student.level === "high" ? "critical" : "gray.600"}>
                      {student.signal[period]}
                    </Text>
                  </Box>
                </HStack>
                <HStack align="flex-start" spacing="7px">
                  <Icon as={AlertTriangle} boxSize="14px" mt="2px" color="#E69A2E" flexShrink={0} />
                  <Text fontSize="12px" lineHeight="1.7" color="gray.600">
                    {student.suggestion}
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} size="sm">
            完成
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function TeacherDashboardPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const attentionModal = useDisclosure();

  const metrics = metricStyles.map((metric, index) => ({
    ...metric,
    ...periodMetrics[period][index],
  }));

  const chartOption = useMemo<EChartsOption>(() => {
    const data = gapData[period];
    const maximum = Math.ceil(Math.max(...data.map((item) => item.count)) * 1.18);

    return {
      animationDuration: 650,
      animationDurationUpdate: 450,
      textStyle: { fontFamily: "Noto Sans TC, sans-serif" },
      grid: { left: 56, right: 42, top: 12, bottom: 7, containLabel: false },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(59, 142, 243, .06)" } },
        backgroundColor: "#0D2942",
        borderWidth: 0,
        padding: [8, 11],
        textStyle: { color: "#FFFFFF", fontSize: 12, fontFamily: "Noto Sans TC, sans-serif" },
        formatter: "{b}<br/><b>{c}</b> 次",
      },
      xAxis: {
        type: "value",
        max: maximum,
        show: false,
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: data.map((item) => item.topic),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#29465C", fontSize: 12, fontWeight: 600, margin: 14, fontFamily: "Noto Sans TC, sans-serif" },
      },
      series: [
        {
          name: "提問次數",
          type: "bar",
          data: data.map((item) => item.count),
          barWidth: 10,
          showBackground: true,
          backgroundStyle: { color: "#EFF4F7", borderRadius: 8 },
          itemStyle: {
            borderRadius: [0, 8, 8, 0],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: "#2686ED" },
                { offset: 1, color: "#70B5F6" },
              ],
            },
          },
          label: {
            show: true,
            position: "right",
            distance: 13,
            color: "#29465C",
            fontSize: 12,
            fontWeight: 700,
            formatter: "{c}",
          },
          emphasis: { itemStyle: { opacity: 0.85 } },
        },
      ],
      aria: {
        enabled: true,
        description: `${periodLabels[period]}最常遇到的學習困難：${data
          .map((item) => `${item.topic} ${item.count} 次`)
          .join("、")}`,
      },
    };
  }, [period]);

  return (
    <DashboardShell
      edition="教師版"
      title="教學洞察"
      ownerName="王老師"
      ownerDetail="高雄市 XX 國小"
      items={navItems}
    >
      <Box position="relative">
        <Box
          position={{ base: "static", sm: "absolute" }}
          top={{ sm: "-73px", md: "-67px" }}
          right={{ sm: 0 }}
          zIndex={2}
          display="flex"
          justifyContent="flex-end"
          mb={{ base: "12px", sm: 0 }}
        >
          <Menu placement="bottom-end" isLazy>
            <MenuButton
              as={Button}
              size="sm"
              variant="outline"
              bg="white"
              color="navy.600"
              borderColor="#DCE8EC"
              rightIcon={<ChevronDown size={16} />}
              aria-label={`選擇統計期間，目前為${periodLabels[period]}`}
              _hover={{ bg: "#F8FBFC", borderColor: "brand.300" }}
              _expanded={{ bg: "brand.50", borderColor: "brand.300" }}
            >
              {periodLabels[period]}
            </MenuButton>
            <MenuList minW="142px" p="6px" borderRadius="12px" borderColor="#DCE8EC" boxShadow="float">
              {(Object.keys(periodLabels) as Period[]).map((key) => (
                <MenuItem
                  key={key}
                  onClick={() => setPeriod(key)}
                  borderRadius="8px"
                  fontSize="13px"
                  fontWeight={period === key ? "700" : "500"}
                  color={period === key ? "brand.700" : "navy.600"}
                  bg={period === key ? "brand.50" : "transparent"}
                  _hover={{ bg: "brand.50" }}
                >
                  {periodLabels[key]}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Box>

        <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} spacing="12px" mb="14px">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </SimpleGrid>

        <Grid templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 1.1fr) minmax(360px, .9fr)" }} gap="14px">
          <Surface p={{ base: "17px 14px", md: "20px" }} minW={0}>
            <Flex align={{ base: "flex-start", sm: "center" }} justify="space-between" gap="8px" mb="5px">
              <Box>
                <SectionTitle>最常遇到的學習困難</SectionTitle>
                <Text mt="3px" fontSize="11px" color="gray.500">
                  依學生提問主題統計
                </Text>
              </Box>
              <HStack spacing="5px" color="learning" flexShrink={0}>
                <Icon as={GraduationCap} boxSize="16px" />
                <Text fontSize="11px" fontWeight="700">
                  共 {gapData[period].reduce((total, item) => total + item.count, 0)} 次
                </Text>
              </HStack>
            </Flex>
            <ReactECharts
              option={chartOption}
              notMerge
              lazyUpdate
              opts={{ renderer: "svg" }}
              style={{ width: "100%", height: "264px" }}
            />
          </Surface>

          <Surface p={{ base: "17px 14px", md: "20px" }} minW={0}>
            <Flex align="flex-start" justify="space-between" gap="10px" mb="10px" px="2px">
              <Box>
                <SectionTitle>需要關注的學生</SectionTitle>
                <Text mt="3px" fontSize="11px" color="gray.500">
                  根據近期學習狀況整理
                </Text>
              </Box>
              <Flex w="34px" h="34px" align="center" justify="center" bg="#FFF3E7" borderRadius="10px">
                <Icon as={AlertTriangle} boxSize="17px" color="#EC8B27" />
              </Flex>
            </Flex>

            <VStack align="stretch" spacing="2px">
              {attentionStudents.map((student) => (
                <AttentionRow key={student.name} student={student} period={period} />
              ))}
            </VStack>

            <Flex mt="14px" pt="13px" borderTop="1px solid" borderColor="#EDF2F4" justify="flex-end">
              <Button
                variant="ghost"
                size="sm"
                color="brand.600"
                rightIcon={<ChevronRight size={15} />}
                onClick={attentionModal.onOpen}
                _hover={{ bg: "brand.50", color: "brand.700" }}
                _focusVisible={{ boxShadow: "0 0 0 3px rgba(18,183,167,.22)" }}
              >
                查看全部
              </Button>
            </Flex>
          </Surface>
        </Grid>
      </Box>

      <AttentionModal isOpen={attentionModal.isOpen} onClose={attentionModal.onClose} period={period} />
    </DashboardShell>
  );
}
