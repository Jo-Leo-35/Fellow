import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  HStack,
  Icon,
  Image,
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
  Tooltip,
  useDisclosure,
  VisuallyHidden,
  VStack,
  type BoxProps,
} from "@chakra-ui/react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import {
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  GraduationCap,
  HandHeart,
  LayoutDashboard,
  Lightbulb,
  Map,
  MessageCircleQuestion,
  PackageSearch,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Surface } from "@/components/ui/Surface";
import { resourceNeeds } from "@/data/demo";

type Period = "7d" | "30d" | "quarter";
type HeatLevel = "高" | "中" | "低";

interface MetricStyle {
  label: string;
  icon: LucideIcon;
  iconColor: string;
  iconBackground: string;
  trendColor: string;
}

interface RegionAggregate {
  name: string;
  level: HeatLevel;
  count: number;
  trend: string;
}

const periodLabels: Record<Period, string> = {
  "7d": "過去 7 天",
  "30d": "過去 30 天",
  quarter: "本季",
};

const periodMetrics: Record<Period, Array<{ value: number; change: string }>> = {
  "7d": [
    { value: 1284, change: "+18%" },
    { value: 328, change: "+25%" },
    { value: 87, change: "+32%" },
  ],
  "30d": [
    { value: 4968, change: "+14%" },
    { value: 1247, change: "+21%" },
    { value: 296, change: "+27%" },
  ],
  quarter: [
    { value: 14826, change: "+11%" },
    { value: 3684, change: "+19%" },
    { value: 814, change: "+23%" },
  ],
};

const metricStyles: MetricStyle[] = [
  {
    label: "互動事件",
    icon: MessageCircleQuestion,
    iconColor: "#2F80ED",
    iconBackground: "#EAF3FF",
    trendColor: "success",
  },
  {
    label: "資源需求",
    icon: HandHeart,
    iconColor: "#0FAF9E",
    iconBackground: "#E5F8F5",
    trendColor: "success",
  },
  {
    label: "潛在需求",
    icon: Sparkles,
    iconColor: "#E89622",
    iconBackground: "#FFF4DF",
    trendColor: "critical",
  },
];

const periodNeedValues: Record<Period, number[]> = {
  "7d": resourceNeeds.map((item) => item.percentage),
  "30d": [34, 30, 21, 15, 11],
  quarter: [31, 29, 22, 18, 12],
};

const regionAggregates: Record<Period, RegionAggregate[]> = {
  "7d": [
    { name: "旗美山城", level: "高", count: 96, trend: "+41%" },
    { name: "北高山區", level: "高", count: 82, trend: "+28%" },
    { name: "都會周邊", level: "中", count: 67, trend: "+17%" },
    { name: "南部沿海", level: "低", count: 43, trend: "+9%" },
  ],
  "30d": [
    { name: "旗美山城", level: "高", count: 351, trend: "+34%" },
    { name: "北高山區", level: "高", count: 294, trend: "+22%" },
    { name: "都會周邊", level: "中", count: 246, trend: "+14%" },
    { name: "南部沿海", level: "低", count: 158, trend: "+6%" },
  ],
  quarter: [
    { name: "旗美山城", level: "高", count: 982, trend: "+29%" },
    { name: "北高山區", level: "高", count: 836, trend: "+20%" },
    { name: "都會周邊", level: "中", count: 721, trend: "+12%" },
    { name: "南部沿海", level: "低", count: 461, trend: "+5%" },
  ],
};

const heatColors: Record<HeatLevel, string> = {
  高: "#0E92C9",
  中: "#20BBAE",
  低: "#A7E8E0",
};

const navItems = [
  { label: "總覽", icon: LayoutDashboard },
  { label: "教育需求", icon: GraduationCap },
  { label: "資源使用", icon: PackageSearch },
  { label: "地區分析", icon: Map },
  { label: "趨勢洞察", icon: BarChart3 },
  { label: "設定", icon: Settings },
];

function SectionTitle({ children, ...props }: BoxProps) {
  return (
    <Text as="h2" fontSize="16px" fontWeight="800" color="navy.900" {...props}>
      {children}
    </Text>
  );
}

function MetricCard({
  value,
  change,
  style,
}: {
  value: number;
  change: string;
  style: MetricStyle;
}) {
  return (
    <Surface
      px={{ base: "16px", md: "18px" }}
      py="17px"
      minH="106px"
      transition="transform .2s ease, box-shadow .2s ease, border-color .2s ease"
      _hover={{ transform: "translateY(-2px)", boxShadow: "float", borderColor: style.iconBackground }}
    >
      <HStack spacing="14px" h="100%">
        <Flex
          boxSize="46px"
          flexShrink={0}
          align="center"
          justify="center"
          borderRadius="13px"
          bg={style.iconBackground}
        >
          <Icon as={style.icon} boxSize="23px" color={style.iconColor} strokeWidth="2.25" aria-hidden="true" />
        </Flex>
        <Box minW={0}>
          <Text fontSize={{ base: "25px", md: "28px" }} lineHeight="1" fontWeight="800" color="navy.900">
            {value.toLocaleString("zh-TW")}
          </Text>
          <HStack mt="7px" spacing="8px" align="center" flexWrap="wrap">
            <Text fontSize="13px" fontWeight="700" color="navy.500">
              {style.label}
            </Text>
            <HStack spacing="2px" color={style.trendColor}>
              <ArrowUpRight size={12} aria-hidden="true" />
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

function RegionHeatCard({ period }: { period: Period }) {
  const [selectedRegion, setSelectedRegion] = useState("旗美山城");
  const regions = regionAggregates[period];
  const selected = regions.find((region) => region.name === selectedRegion) ?? regions[0];

  return (
    <Surface p={{ base: "17px 14px", md: "20px" }} minW={0}>
      <Flex align="flex-start" justify="space-between" gap="12px">
        <Box>
          <SectionTitle>地區需求熱度</SectionTitle>
          <Text mt="3px" fontSize="11px" color="gray.500">
            依彙整需求事件分布
          </Text>
        </Box>
        <VStack align="stretch" spacing="4px" flexShrink={0} aria-label="需求熱度圖例">
          {(["高", "中", "低"] as HeatLevel[]).map((level) => (
            <HStack key={level} spacing="6px">
              <Box boxSize="7px" borderRadius="full" bg={heatColors[level]} />
              <Text fontSize="10px" fontWeight="700" color="gray.600">
                {level}
              </Text>
            </HStack>
          ))}
        </VStack>
      </Flex>

      <Box position="relative" mt="4px" minH={{ base: "180px", md: "194px" }}>
        <Image
          src="/assets/region-kaohsiung.svg"
          alt="高雄市簡化區域需求熱度圖；詳細彙整數據列於下方"
          w="100%"
          h={{ base: "180px", md: "194px" }}
          objectFit="contain"
          draggable={false}
        />
        <Badge
          position="absolute"
          left="8px"
          bottom="5px"
          px="8px"
          py="4px"
          borderRadius="full"
          textTransform="none"
          bg="rgba(255,255,255,.92)"
          color="gray.600"
          fontSize="9px"
          boxShadow="0 4px 12px rgba(20,50,74,.08)"
        >
          非 GIS 示意
        </Badge>
      </Box>

      <Divider borderColor="#EDF2F4" mb="10px" />
      <VisuallyHidden id="region-heat-list-title">彙整區域需求清單，可選擇區域查看事件量與趨勢</VisuallyHidden>
      <SimpleGrid as="ul" columns={{ base: 2, sm: 4, xl: 2 }} spacing="7px" listStyleType="none" m={0}>
        {regions.map((region) => {
          const isSelected = selected.name === region.name;
          return (
            <Box as="li" key={region.name}>
              <Tooltip
                label={`${region.name}：${region.count} 件彙整需求，較前期 ${region.trend}`}
                hasArrow
                placement="top"
                openDelay={250}
              >
                <Button
                  w="100%"
                  h="34px"
                  px="8px"
                  variant="outline"
                  bg={isSelected ? "brand.50" : "#FAFCFD"}
                  borderColor={isSelected ? "brand.300" : "#E6EEF2"}
                  color="navy.600"
                  aria-describedby="region-heat-list-title region-selection-summary"
                  aria-pressed={isSelected}
                  aria-label={`${region.name}，熱度${region.level}，${region.count} 件，趨勢 ${region.trend}`}
                  onClick={() => setSelectedRegion(region.name)}
                  onFocus={() => setSelectedRegion(region.name)}
                  _hover={{ bg: "brand.50", borderColor: "brand.300" }}
                  _focusVisible={{ boxShadow: "0 0 0 3px rgba(18,183,167,.2)" }}
                >
                  <HStack w="100%" justify="space-between" spacing="5px">
                    <HStack spacing="6px" minW={0}>
                      <Box boxSize="7px" flexShrink={0} borderRadius="full" bg={heatColors[region.level]} />
                      <Text fontSize="10px" fontWeight="700" noOfLines={1}>
                        {region.name}
                      </Text>
                    </HStack>
                    <Text fontSize="10px" fontWeight="800" color="navy.900">
                      {region.count}
                    </Text>
                  </HStack>
                </Button>
              </Tooltip>
            </Box>
          );
        })}
      </SimpleGrid>
      <Flex
        id="region-selection-summary"
        mt="8px"
        px="10px"
        py="8px"
        align="center"
        justify="space-between"
        gap="8px"
        borderRadius="10px"
        bg="#F5FAFC"
        aria-live="polite"
      >
        <Text fontSize="10px" color="gray.600">
          {selected.name} · 熱度{selected.level}
        </Text>
        <Text fontSize="10px" fontWeight="800" color="brand.700">
          {selected.count} 件 · {selected.trend}
        </Text>
      </Flex>
    </Surface>
  );
}

function AgentInsightCard({ onOpen, period }: { onOpen: () => void; period: Period }) {
  const leadingRegion = regionAggregates[period][0];

  return (
    <Surface
      mt="14px"
      px={{ base: "16px", md: "20px" }}
      py={{ base: "17px", md: "14px" }}
      overflow="hidden"
      position="relative"
      borderColor="#DDEDEB"
      bg="linear-gradient(100deg, #FFFFFF 0%, #F8FCFC 70%, #EEFAF7 100%)"
    >
      <Box position="absolute" right="90px" top="-65px" boxSize="150px" borderRadius="full" bg="brand.50" opacity=".65" />
      <Flex
        position="relative"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap={{ base: "14px", md: "16px" }}
      >
        <Flex boxSize="48px" flexShrink={0} align="center" justify="center" borderRadius="14px" bg="#FFF3D6" color="#E89622">
          <Icon as={Lightbulb} boxSize="25px" strokeWidth="2.2" aria-hidden="true" />
        </Flex>
        <Box flex="1" minW={0}>
          <HStack spacing="7px" mb="3px" flexWrap="wrap">
            <Text as="h2" fontSize="14px" fontWeight="800" color="navy.900">
              Agent 發現的潛在需求
            </Text>
            <Badge px="7px" py="2px" borderRadius="full" bg="#FFF0EB" color="#D6533C" fontSize="9px" textTransform="none">
              值得關注
            </Badge>
          </HStack>
          <Text fontSize="12px" lineHeight="1.75" color="gray.600">
            {leadingRegion.name}的農業災損相關需求較前期增加 {leadingRegion.trend.replace("+", "")}；建議確認補助資訊是否需要提高曝光。
          </Text>
        </Box>
        <Button
          flexShrink={0}
          size="sm"
          rightIcon={<TrendingUp size={15} />}
          onClick={onOpen}
          _hover={{ bg: "brand.600", transform: "translateY(-1px)", boxShadow: "0 7px 18px rgba(18,183,167,.2)" }}
          _active={{ bg: "brand.700", transform: "none" }}
          _focusVisible={{ boxShadow: "0 0 0 3px rgba(18,183,167,.24)" }}
        >
          查看趨勢
        </Button>
      </Flex>
    </Surface>
  );
}

function InsightModal({ isOpen, onClose, period }: { isOpen: boolean; onClose: () => void; period: Period }) {
  const leadingRegion = regionAggregates[period][0];
  const trendPoints = period === "7d" ? [18, 24, 31] : period === "30d" ? [82, 104, 128] : [236, 289, 351];

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg" motionPreset="slideInBottom">
      <ModalOverlay bg="rgba(9, 36, 60, .46)" backdropFilter="blur(3px)" />
      <ModalContent mx="16px" borderRadius="20px" overflow="hidden">
        <ModalHeader pb="7px" color="navy.900" fontSize="19px">
          潛在需求趨勢
          <Text mt="4px" fontSize="12px" fontWeight="500" color="gray.500">
            {periodLabels[period]} · 僅呈現彙整後的地區與主題數據
          </Text>
        </ModalHeader>
        <ModalCloseButton aria-label="關閉潛在需求趨勢" top="13px" right="13px" />
        <ModalBody pt="14px" pb="8px">
          <Box p="15px" borderRadius="14px" bg="#F6FAFC" border="1px solid" borderColor="#E5EEF1">
            <Flex align={{ base: "flex-start", sm: "center" }} justify="space-between" gap="10px" direction={{ base: "column", sm: "row" }}>
              <Box>
                <Text fontSize="11px" color="gray.500">
                  旗美山城 · 農業災損
                </Text>
                <HStack mt="4px" spacing="7px">
                  <Text fontSize="23px" fontWeight="800" color="navy.900">
                    {leadingRegion.count} 件
                  </Text>
                  <Badge borderRadius="full" bg="#E7F8F1" color="#148B65" textTransform="none">
                    {leadingRegion.trend}
                  </Badge>
                </HStack>
              </Box>
              <HStack spacing="6px" h="54px" align="flex-end" aria-label={`近三期事件量為 ${trendPoints.join("、")} 件`}>
                {trendPoints.map((point, index) => (
                  <Tooltip key={point} label={`${point} 件`} hasArrow>
                    <Box
                      w="22px"
                      h={`${Math.round((point / Math.max(...trendPoints)) * 46)}px`}
                      minH="12px"
                      borderRadius="6px 6px 2px 2px"
                      bg={index === trendPoints.length - 1 ? "brand.500" : "brand.200"}
                    />
                  </Tooltip>
                ))}
              </HStack>
            </Flex>
          </Box>

          <VStack align="stretch" spacing="9px" mt="14px">
            <HStack align="flex-start" spacing="9px">
              <Icon as={Lightbulb} boxSize="16px" mt="2px" color="#E89622" />
              <Text fontSize="12px" lineHeight="1.7" color="gray.600">
                需求增幅集中於農業災損與經濟支援主題，可優先檢查相關補助說明的觸及率。
              </Text>
            </HStack>
            <HStack align="flex-start" spacing="9px">
              <Icon as={ShieldCheck} boxSize="16px" mt="2px" color="brand.600" />
              <Text fontSize="12px" lineHeight="1.7" color="gray.600">
                本洞察僅使用區域、主題、數量與趨勢等彙整資料，不包含個人識別資訊或對話內容。
              </Text>
            </HStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" onClick={onClose}>
            完成
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function GovernmentDashboardPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const insightModal = useDisclosure();

  const ranking = useMemo(
    () =>
      resourceNeeds.map((item, index) => ({
        topic: item.topic,
        percentage: periodNeedValues[period][index],
      })),
    [period],
  );

  const chartOption = useMemo<EChartsOption>(() => {
    const maximum = Math.ceil(Math.max(...ranking.map((item) => item.percentage)) / 5) * 5 + 5;

    return {
      animationDuration: 650,
      animationDurationUpdate: 420,
      textStyle: { fontFamily: "Noto Sans TC, sans-serif" },
      grid: { left: 76, right: 48, top: 10, bottom: 8, containLabel: false },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(18, 183, 167, .06)" } },
        backgroundColor: "#0D2942",
        borderWidth: 0,
        padding: [8, 11],
        textStyle: { color: "#FFFFFF", fontSize: 12, fontFamily: "Noto Sans TC, sans-serif" },
        formatter: "{b}<br/><b>{c}%</b>",
      },
      xAxis: {
        type: "value",
        max: maximum,
        show: false,
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: ranking.map((item) => item.topic),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#29465C", fontSize: 12, fontWeight: 600, margin: 14, fontFamily: "Noto Sans TC, sans-serif" },
      },
      series: [
        {
          name: "需求占比",
          type: "bar",
          data: ranking.map((item) => item.percentage),
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
                { offset: 0, color: "#149EE0" },
                { offset: 1, color: "#74B9F4" },
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
            formatter: "{c}%",
          },
          emphasis: { itemStyle: { opacity: 0.84 } },
        },
      ],
      aria: {
        enabled: true,
        description: `${periodLabels[period]}熱門需求主題排行：${ranking
          .map((item) => `${item.topic} ${item.percentage}%`)
          .join("、")}`,
      },
    };
  }, [period, ranking]);

  return (
    <DashboardShell
      edition="政府版"
      title="高雄偏鄉需求洞察"
      ownerName="高雄市政府"
      ownerDetail="教育局"
      items={navItems}
    >
      <Box position="relative">
        <Box position="absolute" top={{ base: "-65px", md: "-67px" }} right="0" zIndex={2}>
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
              _focusVisible={{ boxShadow: "0 0 0 3px rgba(18,183,167,.2)" }}
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
          {periodMetrics[period].map((metric, index) => (
            <MetricCard key={metricStyles[index].label} {...metric} style={metricStyles[index]} />
          ))}
        </SimpleGrid>

        <Grid templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 1.25fr) minmax(350px, .75fr)" }} gap="14px">
          <Surface p={{ base: "17px 14px", md: "20px" }} minW={0}>
            <Flex align={{ base: "flex-start", sm: "center" }} justify="space-between" gap="8px" mb="5px">
              <Box>
                <SectionTitle>熱門需求主題</SectionTitle>
                <Text mt="3px" fontSize="11px" color="gray.500">
                  依彙整互動事件中的需求主題占比
                </Text>
              </Box>
              <HStack spacing="5px" color="brand.700" flexShrink={0}>
                <Icon as={BarChart3} boxSize="16px" aria-hidden="true" />
                <Text fontSize="11px" fontWeight="700">
                  前 5 名
                </Text>
              </HStack>
            </Flex>
            <ReactECharts
              option={chartOption}
              notMerge
              lazyUpdate
              opts={{ renderer: "svg" }}
              style={{ width: "100%", height: "286px" }}
            />
          </Surface>

          <RegionHeatCard period={period} />
        </Grid>

        <AgentInsightCard onOpen={insightModal.onOpen} period={period} />
      </Box>

      <InsightModal isOpen={insightModal.isOpen} onClose={insightModal.onClose} period={period} />
    </DashboardShell>
  );
}
