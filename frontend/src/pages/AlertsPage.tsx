import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  HStack,
  Icon,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  BellOff,
  CircleAlert,
  CircleCheck,
  Info,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudentShell } from "@/components/layout/StudentShell";
import { ApiState, useAlerts } from "@/api/runtime";
import { alertsApi } from "@/api/alerts";
import { conversationsApi } from "@/api/conversations";
import { resourcesApi } from "@/api/resources";
import { conversationHref } from "@/api/chatSession";
import type { AlertView } from "@/types/view";

type AlertItem = AlertView & {id:string;date:string};
type AlertFilter = "all" | "important" | "system";

interface AlertVisual {
  icon: LucideIcon;
  color: string;
  softColor: string;
  label: string;
  action: string;
  destination: string;
}

const filters: Array<{ key: AlertFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "important", label: "重要" },
  { key: "system", label: "系統" },
];

function getAlertVisual(kind: string): AlertVisual {
  if (kind === "critical") {
    return {
      icon: CircleAlert,
      color: "#E54844",
      softColor: "#FFF0EF",
      label: "重要通知",
      action: "查看詳情",
      destination: "/resources.html",
    };
  }

  if (kind === "information") {
    return {
      icon: Info,
      color: "#2F80ED",
      softColor: "#EBF4FF",
      label: "系統資訊",
      action: "查看詳情",
      destination: "/resources.html",
    };
  }

  return {
    icon: CircleCheck,
    color: "#2EAD6B",
    softColor: "#EAF8F0",
    label: "學習通知",
    action: "去看看",
    destination: "/learning-chat.html",
  };
}

function matchesFilter(item: AlertItem, filter: AlertFilter) {
  if (filter === "important") return item.kind === "critical";
  if (filter === "system") return item.kind !== "critical";
  return true;
}

interface NotificationCardProps {
  item: AlertItem;
  isRead: boolean;
  onAcknowledge: (item: AlertItem) => void;
  onDetails: (item: AlertItem) => void;
}

function NotificationCard({
  item,
  isRead,
  onAcknowledge,
  onDetails,
}: NotificationCardProps) {
  const visual = getAlertVisual(item.kind);

  return (
    <Card
      as="article"
      aria-label={`${visual.label}：${item.title}${isRead ? "，已讀" : "，未讀"}`}
      bg={isRead ? "#FBFDFD" : "white"}
      borderColor={isRead ? "#E8EFF1" : "#DEE9ED"}
      boxShadow={isRead ? "0 3px 12px rgba(20,50,74,.035)" : "0 7px 22px rgba(20,50,74,.075)"}
      transition="border-color .2s ease, box-shadow .2s ease, background .2s ease"
      overflow="hidden"
    >
      <CardBody p={{ base: "14px", sm: "16px" }}>
        <Flex align="flex-start" gap="11px">
          <Flex
            aria-hidden="true"
            align="center"
            justify="center"
            flexShrink={0}
            boxSize="34px"
            mt="1px"
            borderRadius="full"
            bg={visual.softColor}
            color={visual.color}
          >
            <Icon as={visual.icon} boxSize="21px" strokeWidth={2.6} />
          </Flex>

          <Box minW={0} flex="1">
            <Flex align="flex-start" justify="space-between" gap="8px">
              <HStack minW={0} spacing="7px" align="center">
                <Heading
                  as="h2"
                  size="xs"
                  fontSize="14px"
                  lineHeight="1.45"
                  color={item.kind === "critical" ? visual.color : "navy.700"}
                  noOfLines={2}
                >
                  {item.title}
                </Heading>
                {!isRead && (
                  <Box
                    aria-label="未讀"
                    flexShrink={0}
                    boxSize="7px"
                    bg={visual.color}
                    borderRadius="full"
                  />
                )}
              </HStack>
              <Text flexShrink={0} fontSize="11px" lineHeight="20px" color="#778A98">
                {item.date}
              </Text>
            </Flex>

            <Text mt="5px" fontSize="13px" lineHeight="1.6" color="#263F52">
              {item.message}
            </Text>

            <Box mt="8px" pl="9px" borderLeft="2px solid" borderColor={visual.softColor}>
              <Text fontSize="11px" lineHeight="1.5" fontWeight="800" color="#526979">
                為什麼提醒你？
              </Text>
              <Text mt="1px" fontSize="11px" lineHeight="1.55" color="#718492">
                {item.reason}
              </Text>
            </Box>
          </Box>
        </Flex>

        <HStack mt="12px" spacing="9px" pl={{ base: 0, sm: "45px" }}>
          <Button
            size="sm"
            minH="36px"
            flex="1"
            bg="#0EAA9C"
            color="white"
            fontSize="12px"
            _hover={{ bg: "brand.600" }}
            _active={{ bg: "brand.700" }}
            onClick={() => onDetails(item)}
            aria-label={`${visual.action}：${item.title}`}
          >
            {visual.action}
          </Button>
          <Button
            size="sm"
            minH="36px"
            flex="1"
            variant="outline"
            borderColor={isRead ? "#DCE6E9" : "#B7CBD1"}
            color={isRead ? "#80919C" : "navy.600"}
            bg="white"
            fontSize="12px"
            leftIcon={isRead ? <CircleCheck size={15} /> : undefined}
            isDisabled={isRead}
            onClick={() => onAcknowledge(item)}
            aria-label={isRead ? `${item.title}已讀` : `將${item.title}標示為已讀`}
          >
            {isRead ? "已讀" : "我知道了"}
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
}

interface EmptyNotificationsProps {
  isDismissed: boolean;
  onRestore: () => void;
  onShowAll: () => void;
}

function EmptyNotifications({ isDismissed, onRestore, onShowAll }: EmptyNotificationsProps) {
  return (
    <VStack
      py="54px"
      px="24px"
      spacing="12px"
      textAlign="center"
      role="status"
      aria-live="polite"
    >
      <Flex align="center" justify="center" boxSize="58px" borderRadius="full" bg="#EAF7F5" color="brand.600">
        <BellOff size={27} />
      </Flex>
      <Heading as="h2" fontSize="16px" color="navy.700">
        目前沒有通知
      </Heading>
      <Text maxW="250px" fontSize="13px" lineHeight="1.65" color="#718492">
        {isDismissed ? "你已整理完這裡的通知，需要時可以全部還原。" : "這個分類目前沒有通知，新的提醒會出現在這裡。"}
      </Text>
      <Button
        mt="4px"
        size="sm"
        variant="outline"
        leftIcon={isDismissed ? <RotateCcw size={16} /> : undefined}
        onClick={isDismissed ? onRestore : onShowAll}
      >
        {isDismissed ? "還原全部通知" : "查看全部通知"}
      </Button>
    </VStack>
  );
}

export default function AlertsPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const query=useAlerts();const [error,setError]=useState<unknown>(null);
  const alertItems=(query.data?.items??[]).map(item=>({...item,id:item.alertId,date:new Date(item.createdAt).toLocaleDateString("zh-TW")}));
  const readIds=new Set(alertItems.filter(item=>item.readAt).map(item=>item.id));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();

  const visibleItems = useMemo(
    () => alertItems.filter((item) => !dismissedIds.has(item.id)),
    [dismissedIds,query.data],
  );

  const unreadCount = (filter: AlertFilter) =>
    visibleItems.filter((item) => matchesFilter(item, filter) && !readIds.has(item.id)).length;

  const handleAcknowledge = async (item:AlertItem) => {setError(null);try{await alertsApi.markRead(item.id);await query.refetch();}catch(e){setError(e);}};
  const handleDetails = (item: AlertItem) => {
    setSelectedAlert(item);
    onOpen();
  };

  const handleDismiss = () => {
    if (!selectedAlert) return;
    setDismissedIds((current) => new Set(current).add(selectedAlert.id));
    onClose();
    toast({
      title: "已暫時隱藏通知（本次頁面）",
      status: "info",
      duration: 1800,
      isClosable: true,
      position: "top",
    });
  };

  const handleRestore = () => {
    setDismissedIds(new Set());
    toast({ title: "通知已還原", status: "success", duration: 1600, position: "top" });
  };

  const handleDestination=async()=>{if(!selectedAlert)return;setError(null);try{await alertsApi.markRead(selectedAlert.id);await query.refetch();const action=selectedAlert.action;if(action?.kind==='conversation'&&action.targetId){const detail=await conversationsApi.getDetail(action.targetId);navigate(conversationHref(detail.conversationId,detail.mode));}else if(action?.kind==='learning_topic'&&action.targetId){navigate(`/learning-chat.html?topic=${encodeURIComponent(action.targetId)}`);}else if(action?.kind==='resource'&&action.targetId){navigate(`/resources.html?resource=${encodeURIComponent(action.targetId)}`);}else navigate('/resources.html');onClose();}catch(e){setError(e);}};

  const selectedVisual = selectedAlert ? getAlertVisual(selectedAlert.kind) : null;

  return (
    <StudentShell active="alerts" contentPadding={0}>
      <Box minH="100%" pb="12px"><ApiState loading={query.isPending} error={error??query.error} retry={()=>void query.refetch()}/>
        <Tabs
          index={tabIndex}
          onChange={setTabIndex}
          variant="unstyled"
          isFitted
          colorScheme="brand"
        >
          <TabList
            position="sticky"
            top={0}
            zIndex={3}
            h="52px"
            px="12px"
            bg="rgba(255,255,255,.97)"
            borderBottom="1px solid"
            borderColor="#E8EFF2"
            backdropFilter="blur(10px)"
          >
            {filters.map((filter) => {
              const count = unreadCount(filter.key);
              return (
                <Tab
                  key={filter.key}
                  gap="6px"
                  position="relative"
                  color="#718492"
                  fontSize="13px"
                  fontWeight="700"
                  _selected={{ color: "brand.600" }}
                  _focusVisible={{ boxShadow: "inset 0 0 0 2px #12B7A7", borderRadius: "8px" }}
                  _after={{
                    content: '""',
                    position: "absolute",
                    bottom: 0,
                    left: "22%",
                    right: "22%",
                    height: "3px",
                    borderRadius: "full",
                    bg: "transparent",
                  }}
                  sx={{ "&[aria-selected=true]::after": { bg: "brand.500" } }}
                >
                  <Text as="span">{filter.label}</Text>
                  <Badge
                    aria-label={`${count} 則未讀`}
                    minW="19px"
                    px="5px"
                    py="1px"
                    textAlign="center"
                    borderRadius="full"
                    bg={count > 0 ? "#E7F8F5" : "#F0F4F5"}
                    color={count > 0 ? "brand.700" : "#8A9AA4"}
                    fontSize="9px"
                    lineHeight="15px"
                  >
                    {count}
                  </Badge>
                </Tab>
              );
            })}
          </TabList>

          <Box
            px="16px"
            pt="12px"
            aria-live="polite"
            color="#718492"
            fontSize="11px"
            lineHeight="1.5"
          >
            {unreadCount("all") > 0
              ? `共有 ${unreadCount("all")} 則未讀通知`
              : "太好了，所有通知都已讀完"}
          </Box>

          <TabPanels>
            {filters.map((filter) => {
              const items = visibleItems.filter((item) => matchesFilter(item, filter.key));
              const dismissedForFilter = alertItems.some(
                (item) => matchesFilter(item, filter.key) && dismissedIds.has(item.id),
              );

              return (
                <TabPanel key={filter.key} px="14px" pt="8px" pb="14px">
                  {items.length > 0 ? (
                    <VStack spacing="11px" align="stretch">
                      {items.map((item) => (
                        <NotificationCard
                          key={item.id}
                          item={item}
                          isRead={readIds.has(item.id)}
                          onAcknowledge={handleAcknowledge}
                          onDetails={handleDetails}
                        />
                      ))}
                    </VStack>
                  ) : (
                    <EmptyNotifications
                      isDismissed={dismissedForFilter}
                      onRestore={handleRestore}
                      onShowAll={() => setTabIndex(0)}
                    />
                  )}
                </TabPanel>
              );
            })}
          </TabPanels>
        </Tabs>
      </Box>

      <Drawer
        isOpen={isOpen}
        placement="bottom"
        onClose={onClose}
      >
        <DrawerOverlay bg="rgba(7,31,53,.38)" backdropFilter="blur(2px)" />
        <DrawerContent
          maxW="430px"
          mx="auto"
          borderTopRadius="24px"
          boxShadow="0 -18px 48px rgba(20,50,74,.18)"
        >
          <DrawerCloseButton mt="7px" mr="7px" aria-label="關閉通知詳情" />
          {selectedAlert && selectedVisual && (
            <>
              <DrawerHeader px="20px" pt="22px" pb="12px" pr="58px">
                <HStack align="flex-start" spacing="11px">
                  <Flex
                    align="center"
                    justify="center"
                    flexShrink={0}
                    boxSize="38px"
                    borderRadius="full"
                    bg={selectedVisual.softColor}
                    color={selectedVisual.color}
                  >
                    <Icon as={selectedVisual.icon} boxSize="23px" strokeWidth={2.6} />
                  </Flex>
                  <Box>
                    <Text fontSize="11px" color={selectedVisual.color} fontWeight="800">
                      {selectedVisual.label} · {selectedAlert.date}
                    </Text>
                    <Heading as="h2" mt="2px" fontSize="17px" lineHeight="1.45" color="navy.700">
                      {selectedAlert.title}
                    </Heading>
                  </Box>
                </HStack>
              </DrawerHeader>
              <DrawerBody px="20px" pb="8px">
                <Text fontSize="14px" lineHeight="1.75" color="#334D60">
                  {selectedAlert.message}
                </Text>
                <Box mt="16px" p="14px" borderRadius="14px" bg="#F3F8F9">
                  <HStack mb="5px" spacing="6px" color="brand.700">
                    <Lightbulb size={16} />
                    <Text fontSize="12px" fontWeight="800">
                      為什麼提醒你？
                    </Text>
                  </HStack>
                  <Text fontSize="12px" lineHeight="1.7" color="#5F7483">
                    {selectedAlert.reason}
                  </Text>
                </Box>
                <Divider my="14px" borderColor="#E8EFF2" />
                <Text fontSize="11px" lineHeight="1.6" color="#82939E">
                  提醒內容依你提供的資料與近期使用情況產生，你可以隨時選擇移除。
                </Text>
              </DrawerBody>
              <DrawerFooter gap="8px" px="20px" pt="10px" pb="max(18px, env(safe-area-inset-bottom))">
                <Button variant="ghost" color="#718492" fontSize="12px" onClick={handleDismiss}>
                  從列表移除
                </Button>
                <Button flex="1" fontSize="13px" onClick={handleDestination}>
                  前往相關頁面
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </StudentShell>
  );
}
