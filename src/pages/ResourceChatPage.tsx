import {
  Badge,
  Box,
  Button,
  Checkbox,
  Circle,
  Divider,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  Bot,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileImage,
  Landmark,
  Leaf,
  Link2,
  LockKeyhole,
  MessageCircleQuestion,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wind,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { StudentShell } from "@/components/layout/StudentShell";

const documentItems = [
  "申請人的身分證明與印章",
  "農地位置、地段或使用證明",
  "能看出作物與受損範圍的照片",
  "所在地公所要求的其他證明",
];

type MemoryChoice = "remembered" | "declined" | null;

interface LocalMessage {
  id: number;
  role: "student" | "assistant";
  text: string;
  time: string;
}

function BotMark({ size = "34px" }: { size?: string }) {
  return (
    <Circle
      size={size}
      flexShrink={0}
      bg="brand.50"
      color="brand.600"
      border="1px solid"
      borderColor="brand.100"
      boxShadow="0 4px 12px rgba(18,183,167,.12)"
      aria-hidden="true"
    >
      <Icon as={Bot} boxSize="19px" strokeWidth={2.4} />
    </Circle>
  );
}

function PlantIllustration() {
  return (
    <Box
      role="img"
      aria-label="在土地上成長的綠色幼苗插圖"
      position="relative"
      w="92px"
      h="88px"
      flexShrink={0}
    >
      <Box
        position="absolute"
        inset="3px 2px 8px 8px"
        bg="#E6F8EA"
        borderRadius="48% 52% 47% 53% / 55% 44% 56% 45%"
        transform="rotate(-5deg)"
      />
      <Box
        position="absolute"
        left="14px"
        right="10px"
        bottom="9px"
        h="13px"
        bg="#BFECCB"
        borderRadius="50%"
        opacity={0.9}
      />
      <Box
        position="absolute"
        left="47px"
        bottom="17px"
        w="5px"
        h="40px"
        bg="#29A85B"
        borderRadius="full"
        transform="rotate(3deg)"
        transformOrigin="bottom"
      />
      <Icon
        as={Leaf}
        position="absolute"
        left="24px"
        top="29px"
        boxSize="29px"
        color="#49C875"
        fill="#49C875"
        strokeWidth={1.6}
        transform="rotate(-20deg)"
      />
      <Icon
        as={Leaf}
        position="absolute"
        right="17px"
        top="18px"
        boxSize="31px"
        color="#35B967"
        fill="#35B967"
        strokeWidth={1.6}
        transform="scaleX(-1) rotate(-12deg)"
      />
      <Circle
        position="absolute"
        top="13px"
        right="7px"
        size="23px"
        bg="whiteAlpha.800"
        color="#71BBD1"
      >
        <Icon as={Wind} boxSize="14px" strokeWidth={2.2} />
      </Circle>
    </Box>
  );
}

function RequirementRow({
  kind,
  children,
}: {
  kind: "matched" | "confirm";
  children: string;
}) {
  const matched = kind === "matched";

  return (
    <HStack align="flex-start" spacing="9px">
      <Circle
        mt="2px"
        size="20px"
        flexShrink={0}
        bg={matched ? "#27B86B" : "#EDF2F5"}
        color={matched ? "white" : "#60788A"}
      >
        <Icon as={matched ? Check : CircleHelp} boxSize="13px" strokeWidth={3} />
      </Circle>
      <Text fontSize="13.5px" lineHeight="1.65" color="navy.700" fontWeight={matched ? 600 : 500}>
        {children}
      </Text>
    </HStack>
  );
}

function ResourceRecommendationCard({
  onOpenChecklist,
  onOpenSource,
}: {
  onOpenChecklist: () => void;
  onOpenSource: () => void;
}) {
  return (
    <Box
      as="article"
      aria-labelledby="resource-title"
      w="full"
      bg="white"
      border="1px solid"
      borderColor="#DDEBED"
      borderRadius="20px"
      boxShadow="0 12px 34px rgba(24, 62, 73, .09)"
      overflow="hidden"
    >
      <Box px={{ base: "17px", sm: "19px" }} pt="17px" pb="15px">
        <HStack spacing="10px" align="center">
          <BotMark />
          <Box minW={0}>
            <HStack spacing="5px">
              <Text fontSize="11px" color="brand.700" fontWeight={800} letterSpacing=".04em">
                學伴
              </Text>
              <Icon as={Sparkles} boxSize="12px" color="warning" fill="#F6A63C" />
            </HStack>
            <Text mt="1px" fontSize="14px" color="navy.800" fontWeight={800} lineHeight="1.45">
              我找到一個可能適合你們的資源
            </Text>
          </Box>
        </HStack>
      </Box>

      <Divider borderColor="#ECF2F3" />

      <Box px={{ base: "17px", sm: "19px" }} py="17px">
        <Flex align="center" justify="space-between" gap="8px">
          <Box minW={0} flex="1">
            <Badge
              px="9px"
              py="4px"
              mb="8px"
              borderRadius="full"
              bg="#FFF2D9"
              color="#B86B00"
              textTransform="none"
              fontSize="11px"
              fontWeight={800}
              letterSpacing=".02em"
            >
              可能符合
            </Badge>
            <Text id="resource-title" as="h1" fontSize={{ base: "20px", sm: "21px" }} color="navy.900" fontWeight={800} lineHeight="1.4">
              農業天然災害救助
            </Text>
            <Text mt="5px" fontSize="12px" color="#728491" lineHeight="1.55">
              初步條件比對結果，並非核定通知
            </Text>
          </Box>
          <PlantIllustration />
        </Flex>

        <Box mt="17px">
          <Text mb="10px" fontSize="14px" color="navy.800" fontWeight={800}>
            為什麼可能符合？
          </Text>
          <Stack spacing="9px">
            <RequirementRow kind="matched">家裡有從事農業或照顧菜園</RequirementRow>
            <RequirementRow kind="matched">颱風造成蔬菜與農作物受損</RequirementRow>
            <RequirementRow kind="confirm">需確認菜園所在地是否列入公告區域</RequirementRow>
          </Stack>
        </Box>

        <Box mt="17px">
          <Text mb="8px" fontSize="14px" color="navy.800" fontWeight={800}>
            還需要確認
          </Text>
          <HStack
            align="flex-start"
            spacing="9px"
            p="11px 12px"
            bg="#FFF8EA"
            border="1px solid"
            borderColor="#FCE5B3"
            borderRadius="12px"
          >
            <Circle mt="1px" size="21px" bg="#F06A59" color="white" flexShrink={0}>
              <Icon as={CalendarClock} boxSize="12px" strokeWidth={2.6} />
            </Circle>
            <Box>
              <Text fontSize="13px" color="#724619" fontWeight={700} lineHeight="1.55">
                是否仍在所在地公告的受理期限內
              </Text>
              <Text mt="2px" fontSize="11.5px" color="#8B6742" lineHeight="1.55">
                期限會依災害、作物與地區不同，請向公所確認。
              </Text>
            </Box>
          </HStack>
        </Box>

        <Stack
          mt="15px"
          spacing="7px"
          p="11px 12px"
          bg="#F7FAFB"
          borderRadius="12px"
          border="1px solid"
          borderColor="#E7EFF1"
        >
          <HStack spacing="8px" align="flex-start">
            <Icon as={Landmark} mt="2px" boxSize="14px" color="brand.600" />
            <Text fontSize="11.5px" color="#637987" lineHeight="1.55">
              政策機關：<Text as="span" color="navy.700" fontWeight={700}>農業部</Text>　申請窗口：所在地公所
            </Text>
          </HStack>
          <HStack spacing="8px" align="flex-start">
            <Icon as={ShieldCheck} mt="2px" boxSize="14px" color="brand.600" />
            <Text fontSize="11.5px" color="#637987" lineHeight="1.55">
              本頁僅供初步整理；申請資格與期限以政府最新公告為準。
            </Text>
          </HStack>
        </Stack>

        <Stack mt="16px" spacing="9px">
          <Button
            h="44px"
            leftIcon={<ClipboardCheck size={17} />}
            onClick={onOpenChecklist}
            bg="brand.500"
            color="white"
            boxShadow="0 8px 18px rgba(18,183,167,.22)"
            _hover={{ bg: "brand.600", transform: "translateY(-1px)" }}
            _active={{ bg: "brand.700", transform: "none" }}
          >
            查看需要什麼資料
          </Button>
          <Button
            h="43px"
            variant="outline"
            borderColor="brand.300"
            color="brand.700"
            rightIcon={<ChevronRight size={17} />}
            onClick={onOpenSource}
            _hover={{ bg: "brand.50", borderColor: "brand.500" }}
          >
            查看政府來源
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

function MemorySuggestion({
  choice,
  onChoose,
}: {
  choice: MemoryChoice;
  onChoose: (choice: Exclude<MemoryChoice, null>) => void;
}) {
  if (choice) {
    const remembered = choice === "remembered";
    return (
      <HStack
        w="full"
        align="flex-start"
        p="12px 14px"
        bg={remembered ? "#ECFAF6" : "#F4F7F8"}
        border="1px solid"
        borderColor={remembered ? "brand.100" : "#E2EAED"}
        borderRadius="15px"
        spacing="9px"
      >
        <Circle size="23px" bg={remembered ? "brand.500" : "#8799A5"} color="white" flexShrink={0}>
          <Icon as={remembered ? Check : X} boxSize="13px" strokeWidth={3} />
        </Circle>
        <Box>
          <Text fontSize="13px" color="navy.700" fontWeight={700}>
            {remembered ? "已在這次示範中記住「家裡從事農業」" : "好，我不會記住這項資訊"}
          </Text>
          {remembered && (
            <Text mt="2px" fontSize="11.5px" color="#6E828F">
              重新整理頁面後就會清除，不會送到後端。
            </Text>
          )}
        </Box>
      </HStack>
    );
  }

  return (
    <Box
      w="full"
      p="14px"
      bg="white"
      border="1px solid"
      borderColor="#DDEBED"
      borderRadius="16px"
      boxShadow="0 7px 22px rgba(24,62,73,.06)"
    >
      <HStack align="flex-start" spacing="10px">
        <Circle size="30px" bg="#EAF8F4" color="brand.700" flexShrink={0}>
          <Icon as={LockKeyhole} boxSize="15px" />
        </Circle>
        <Box flex="1">
          <Text fontSize="13.5px" color="navy.800" fontWeight={800} lineHeight="1.5">
            要讓我記得「家裡從事農業」嗎？
          </Text>
          <Text mt="3px" fontSize="11.5px" color="#6C808D" lineHeight="1.55">
            只有你同意後才會記住；示範資料只保留在本頁。
          </Text>
          <HStack mt="10px" spacing="8px">
            <Button size="sm" onClick={() => onChoose("remembered")}>
              幫我記住
            </Button>
            <Button size="sm" variant="ghost" color="#607581" onClick={() => onChoose("declined")}>
              不用
            </Button>
          </HStack>
        </Box>
      </HStack>
    </Box>
  );
}

function ChecklistModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [prepared, setPrepared] = useState(() => documentItems.map(() => false));
  const allPrepared = prepared.every(Boolean);

  const togglePrepared = (index: number) => {
    setPrepared((current) => current.map((value, itemIndex) => (itemIndex === index ? !value : value)));
  };

  const finish = () => {
    toast({
      title: "資料清單已確認",
      description: "下一步請向菜園所在地的公所確認公告與期限。",
      status: "success",
      duration: 3200,
      isClosable: true,
      position: "top",
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm" motionPreset="slideInBottom">
      <ModalOverlay bg="rgba(9,36,60,.42)" backdropFilter="blur(3px)" />
      <ModalContent mx="16px" borderRadius="20px" overflow="hidden">
        <ModalHeader pb="8px" color="navy.900" fontSize="19px">
          先準備這些資料
        </ModalHeader>
        <ModalCloseButton aria-label="關閉資料清單" top="12px" right="12px" />
        <ModalBody pb="8px">
          <Text fontSize="12.5px" color="#697F8D" lineHeight="1.65">
            以下是常見準備項目。實際文件會依地區與公告不同，送件前請再向所在地公所確認。
          </Text>
          <Stack mt="15px" spacing="9px">
            {documentItems.map((item, index) => (
              <Checkbox
                key={item}
                alignItems="flex-start"
                p="11px 12px"
                bg={prepared[index] ? "brand.50" : "#F8FAFB"}
                border="1px solid"
                borderColor={prepared[index] ? "brand.200" : "#E4ECEF"}
                borderRadius="12px"
                cursor="pointer"
                transition="all .18s ease"
                colorScheme="brand"
                isChecked={prepared[index]}
                onChange={() => togglePrepared(index)}
                sx={{ ".chakra-checkbox__control": { mt: "2px" } }}
              >
                <Text fontSize="13px" color="navy.700" fontWeight={600} lineHeight="1.55">
                  {item}
                </Text>
              </Checkbox>
            ))}
          </Stack>
          <HStack mt="14px" p="10px 11px" bg="#FFF8EA" borderRadius="11px" align="flex-start">
            <Icon as={TriangleAlert} mt="2px" boxSize="14px" color="#CF7A12" flexShrink={0} />
            <Text fontSize="11.5px" color="#7A582E" lineHeight="1.55">
              先拍照保留受損狀況，但不要為了拍照進入危險區域。
            </Text>
          </HStack>
        </ModalBody>
        <ModalFooter pt="14px" gap="8px">
          <Button variant="ghost" color="#647A87" onClick={onClose}>
            稍後再看
          </Button>
          <Button onClick={finish} isDisabled={!allPrepared} leftIcon={<Check size={16} />}>
            {allPrepared ? "都準備好了" : `還有 ${prepared.filter((item) => !item).length} 項`}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function GovernmentSourceModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const toast = useToast();

  const copySearchPhrase = async () => {
    try {
      await navigator.clipboard.writeText("農業部 農業天然災害救助 公告區域");
      toast({
        title: "查詢文字已複製",
        status: "success",
        duration: 2400,
        position: "top",
      });
    } catch {
      toast({
        title: "瀏覽器無法自動複製",
        description: "請搜尋「農業部 農業天然災害救助 公告區域」。",
        status: "info",
        duration: 3800,
        position: "top",
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm" motionPreset="scale">
      <ModalOverlay bg="rgba(9,36,60,.42)" backdropFilter="blur(3px)" />
      <ModalContent mx="16px" borderRadius="20px">
        <ModalHeader pb="7px" color="navy.900" fontSize="19px">
          政府來源
        </ModalHeader>
        <ModalCloseButton aria-label="關閉政府來源" top="12px" right="12px" />
        <ModalBody>
          <HStack
            p="13px"
            align="flex-start"
            bg="brand.50"
            border="1px solid"
            borderColor="brand.100"
            borderRadius="14px"
          >
            <Circle size="36px" bg="white" color="brand.700" flexShrink={0} boxShadow="0 4px 12px rgba(18,183,167,.12)">
              <Icon as={Landmark} boxSize="18px" />
            </Circle>
            <Box>
              <Text fontSize="11px" color="brand.700" fontWeight={800}>
                政策主管機關
              </Text>
              <Text mt="1px" color="navy.900" fontSize="16px" fontWeight={800}>
                農業部
              </Text>
              <Text mt="3px" color="#657D8A" fontSize="12px" lineHeight="1.55">
                農業天然災害現金救助相關公告
              </Text>
            </Box>
          </HStack>

          <Stack mt="15px" spacing="10px">
            <HStack align="flex-start" spacing="9px">
              <Icon as={MessageCircleQuestion} mt="2px" boxSize="15px" color="warning" />
              <Text fontSize="12.5px" color="navy.700" lineHeight="1.6">
                是否能申請，要以農業部最新公告的地區、作物項目與受理期間為準。
              </Text>
            </HStack>
            <HStack align="flex-start" spacing="9px">
              <Icon as={ShieldCheck} mt="2px" boxSize="15px" color="brand.600" />
              <Text fontSize="12.5px" color="navy.700" lineHeight="1.6">
                為避免示範頁連到過期公告，本頁不直接開啟外部網址，也不會送出任何個人資料。
              </Text>
            </HStack>
          </Stack>

          <Box mt="14px" p="11px 12px" bg="#F6F9FA" borderRadius="12px">
            <Text fontSize="10.5px" color="#718591" fontWeight={700} letterSpacing=".03em">
              建議查詢文字
            </Text>
            <Text mt="4px" fontSize="13px" color="navy.800" fontWeight={700} lineHeight="1.5">
              農業部 農業天然災害救助 公告區域
            </Text>
          </Box>
        </ModalBody>
        <ModalFooter gap="8px">
          <Button variant="ghost" color="#647A87" onClick={onClose}>
            關閉
          </Button>
          <Button leftIcon={<Link2 size={16} />} onClick={copySearchPhrase}>
            複製查詢文字
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function ResourceChatPage() {
  const checklist = useDisclosure();
  const source = useDisclosure();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const replyTimerRef = useRef<number>();
  const [draft, setDraft] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isReplying, setIsReplying] = useState(false);
  const [memoryChoice, setMemoryChoice] = useState<MemoryChoice>(null);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current !== undefined) window.clearTimeout(replyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0 || isReplying) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isReplying, messages]);

  const chooseMemory = (choice: Exclude<MemoryChoice, null>) => {
    setMemoryChoice(choice);
    toast({
      title: choice === "remembered" ? "已取得你的同意" : "不會記住這項資訊",
      description: choice === "remembered" ? "示範資料只在目前頁面暫時保留。" : undefined,
      status: choice === "remembered" ? "success" : "info",
      duration: 2600,
      position: "top",
    });
  };

  const selectAttachment = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAttachmentName(file.name);
    toast({
      title: "已附加照片",
      description: "照片只顯示在此示範頁，不會上傳。",
      status: "info",
      duration: 2600,
      position: "top",
    });
  };

  const removeAttachment = () => {
    setAttachmentName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitMessage = (event: FormEvent<HTMLDivElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if ((!trimmed && !attachmentName) || isReplying) return;

    const now = new Intl.DateTimeFormat("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    const text = [trimmed, attachmentName ? `已附上照片：${attachmentName}` : ""].filter(Boolean).join("\n");

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "student", text, time: now },
    ]);
    setDraft("");
    removeAttachment();
    setIsReplying(true);

    replyTimerRef.current = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "收到！我會把你補充的內容一起列入比對。這是互動示範，訊息不會送到後端；實際資格仍要由所在地公所確認。",
          time: now,
        },
      ]);
      setIsReplying(false);
    }, 650);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const composer = (
    <Box
      as="form"
      onSubmit={submitMessage}
      flexShrink={0}
      px="13px"
      pt="10px"
      pb="max(12px, env(safe-area-inset-bottom))"
      bg="rgba(255,255,255,.97)"
      borderTop="1px solid"
      borderColor="#E3ECEF"
      boxShadow="0 -8px 24px rgba(20,50,74,.055)"
      zIndex={4}
    >
      {attachmentName && (
        <HStack
          mb="8px"
          w="fit-content"
          maxW="full"
          px="10px"
          py="6px"
          bg="brand.50"
          borderRadius="10px"
          spacing="7px"
        >
          <Icon as={FileImage} boxSize="14px" color="brand.700" flexShrink={0} />
          <Text maxW="250px" noOfLines={1} fontSize="11.5px" color="brand.800" fontWeight={600}>
            {attachmentName}
          </Text>
          <IconButton
            aria-label="移除照片"
            icon={<X size={13} />}
            size="xs"
            minW="22px"
            h="22px"
            variant="ghost"
            onClick={removeAttachment}
          />
        </HStack>
      )}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        display="none"
        onChange={selectAttachment}
        aria-label="選擇災損照片"
      />
      <HStack
        spacing="5px"
        minH="48px"
        px="5px"
        py="4px"
        bg="#F7FAFB"
        border="1px solid"
        borderColor="#DCE7EA"
        borderRadius="16px"
        _focusWithin={{ borderColor: "brand.400", boxShadow: "0 0 0 3px rgba(18,183,167,.10)" }}
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder="你還想問什麼…"
          aria-label="輸入訊息"
          minH="38px"
          maxH="92px"
          py="9px"
          px="9px"
          resize="none"
          border="none"
          fontSize="13px"
          lineHeight="1.45"
          color="navy.800"
          _placeholder={{ color: "#8A9BA5" }}
          _focusVisible={{ boxShadow: "none" }}
          isDisabled={isReplying}
        />
        <IconButton
          type="button"
          aria-label="附加照片"
          icon={<FileImage size={19} />}
          size="sm"
          variant="ghost"
          color="navy.700"
          onClick={() => fileInputRef.current?.click()}
          isDisabled={isReplying}
        />
        <IconButton
          type="submit"
          aria-label="送出訊息"
          icon={isReplying ? <Spinner size="xs" /> : <Send size={17} />}
          size="sm"
          borderRadius="full"
          bg="brand.500"
          color="white"
          boxShadow="0 5px 12px rgba(18,183,167,.22)"
          isDisabled={(!draft.trim() && !attachmentName) || isReplying}
          _hover={{ bg: "brand.600" }}
          _active={{ bg: "brand.700" }}
        />
      </HStack>
    </Box>
  );

  return (
    <>
      <StudentShell backHref="/resources.html" showBottomNav={false} footer={composer}>
        <VStack align="stretch" spacing="13px" px={{ base: "14px", sm: "17px" }} pt="18px" pb="24px">
          <Flex justify="flex-end">
            <Box maxW="84%">
              <Box
                px="14px"
                py="11px"
                bgGradient="linear(to-br, #C9F7EE, #D9F7F3)"
                color="#08766D"
                borderRadius="17px 17px 4px 17px"
                boxShadow="0 6px 16px rgba(18,183,167,.09)"
              >
                <Text fontSize="13.5px" fontWeight={700} lineHeight="1.65">
                  阿公的菜園被颱風吹壞了，有沒有補助可以申請？
                </Text>
              </Box>
              <HStack mt="4px" justify="flex-end" spacing="4px" pr="2px" color="#82949E">
                <Text fontSize="10.5px">14:17</Text>
                <Icon as={CheckCheck} boxSize="13px" color="brand.500" aria-label="已讀" />
              </HStack>
            </Box>
          </Flex>

          <ResourceRecommendationCard
            onOpenChecklist={checklist.onOpen}
            onOpenSource={source.onOpen}
          />

          <MemorySuggestion choice={memoryChoice} onChoose={chooseMemory} />

          {messages.map((message) =>
            message.role === "student" ? (
              <Flex key={message.id} justify="flex-end">
                <Box maxW="84%">
                  <Box px="14px" py="10px" bg="#D2F5EF" borderRadius="17px 17px 4px 17px">
                    <Text whiteSpace="pre-line" fontSize="13px" color="#08766D" fontWeight={600} lineHeight="1.6">
                      {message.text}
                    </Text>
                  </Box>
                  <HStack mt="4px" justify="flex-end" spacing="4px" color="#82949E">
                    <Text fontSize="10.5px">{message.time}</Text>
                    <Icon as={CheckCheck} boxSize="13px" color="brand.500" />
                  </HStack>
                </Box>
              </Flex>
            ) : (
              <HStack key={message.id} align="flex-start" spacing="9px">
                <BotMark size="30px" />
                <Box px="13px" py="10px" bg="white" border="1px solid" borderColor="#E1EBEE" borderRadius="4px 16px 16px 16px">
                  <Text fontSize="12.5px" color="navy.700" lineHeight="1.65">
                    {message.text}
                  </Text>
                </Box>
              </HStack>
            ),
          )}

          {isReplying && (
            <HStack align="center" spacing="9px" aria-live="polite">
              <BotMark size="30px" />
              <HStack px="13px" py="10px" bg="white" border="1px solid" borderColor="#E1EBEE" borderRadius="4px 16px 16px 16px">
                <Spinner size="xs" color="brand.500" />
                <Text fontSize="11.5px" color="#748792">正在整理你的補充…</Text>
              </HStack>
            </HStack>
          )}
          <Box ref={endRef} h="1px" />
        </VStack>
      </StudentShell>

      <ChecklistModal isOpen={checklist.isOpen} onClose={checklist.onClose} />
      <GovernmentSourceModal isOpen={source.isOpen} onClose={source.onClose} />
    </>
  );
}
