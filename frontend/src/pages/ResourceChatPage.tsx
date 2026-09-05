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
  CircleEllipsis,
  CircleHelp,
  ClipboardCheck,
  CloudLightning,
  FileImage,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Landmark,
  Leaf,
  Link2,
  LockKeyhole,
  MessageCircleQuestion,
  Send,
  ShieldCheck,
  Sparkles,
  Sprout,
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
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { StudentShell } from "@/components/layout/StudentShell";
import { resourceCategories } from "@/data/demo";
import { getResourceScenario, type ResourceCategory, type ResourceScenario as ResourceTemplate } from "@/data/resourceScenarios";

import { useChatSession } from "@/api/chatSession";
import { ApiState, useAuth, useProfile, useRefreshStudentData } from "@/api/runtime";
import { profileApi } from "@/api/profile";
import { AuthenticatedImage } from "@/components/StudentData";
import type { ResourceRecommendationView, SourceView } from "@/types/view";

type ResourceScenario=Omit<ResourceTemplate,"status"> & {status:string};
const scenarioIcons = {
  disaster: CloudLightning,
  agriculture: Sprout,
  education: GraduationCap,
  economy: HandCoins,
  health: HeartPulse,
  other: CircleEllipsis,
} satisfies Record<ResourceCategory, typeof Sprout>;

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
  scenario,
  text,
  onOpenChecklist,
  onOpenSource,
}: {
  scenario: ResourceScenario;
  text: string;
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
            <Text mt="1px" fontSize="14px" color="navy.800" fontWeight={800} lineHeight="1.45" whiteSpace="pre-line">
              {text}
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
              {scenario.status}
            </Badge>
            <Text id="resource-title" as="h1" fontSize={{ base: "20px", sm: "21px" }} color="navy.900" fontWeight={800} lineHeight="1.4">
              {scenario.title}
            </Text>
            <Text mt="5px" fontSize="12px" color="#728491" lineHeight="1.55">
              申請資格與受理方式，由承辦單位確認。
            </Text>
          </Box>
          {scenario.key === "agriculture" ? (
            <PlantIllustration />
          ) : (
            <Circle size="76px" flexShrink={0} bg={scenario.background} color={scenario.color} aria-hidden="true">
              <Icon as={scenarioIcons[scenario.key]} boxSize="40px" strokeWidth={1.8} />
            </Circle>
          )}
        </Flex>

        <Box mt="17px">
          <Text mb="10px" fontSize="14px" color="navy.800" fontWeight={800}>
            {scenario.status === "待確認需求" ? "可以先從這裡開始" : "初步比對重點"}
          </Text>
          <Stack spacing="9px">
            {scenario.requirements.map((requirement) => (
              <RequirementRow key={requirement.text} kind={requirement.kind}>{requirement.text}</RequirementRow>
            ))}
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
                {scenario.confirmationTitle}
              </Text>
              <Text mt="2px" fontSize="11.5px" color="#8B6742" lineHeight="1.55">
                {scenario.confirmationDescription}
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
              資源機關：<Text as="span" color="navy.700" fontWeight={700}>{scenario.agency}</Text>　洽詢窗口：{scenario.applicationWindow}
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
  label,
  choice,
  onChoose,
}: {
  label: string;
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
            {remembered ? `已記住「${label}」` : "好，我不會記住這項資訊"}
          </Text>
          {remembered && (
            <Text mt="2px" fontSize="11.5px" color="#6E828F">
              已儲存在你的資料中，可到「我的」刪除記憶。
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
            要讓我記得「{label}」嗎？
          </Text>
          <Text mt="3px" fontSize="11.5px" color="#6C808D" lineHeight="1.55">
            只有你同意後才會儲存，之後可以隨時刪除。
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
  scenario,
  isOpen,
  onClose,
}: {
  scenario: ResourceScenario;
  isOpen: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [prepared, setPrepared] = useState(() => scenario.documents.map(() => false));
  const allPrepared = prepared.every(Boolean);

  const togglePrepared = (index: number) => {
    setPrepared((current) => current.map((value, itemIndex) => (itemIndex === index ? !value : value)));
  };

  const finish = () => {
    toast({
      title: "資料清單已確認",
      description: scenario.nextStep,
      status: "success",
      duration: 3200,
      isClosable: true,
      position: "top",
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm" motionPreset="slideInBottom" scrollBehavior="inside">
      <ModalOverlay bg="rgba(9,36,60,.42)" backdropFilter="blur(3px)" />
      <ModalContent mx="16px" maxH="calc(100dvh - 32px)" borderRadius="20px" overflow="hidden">
        <ModalHeader pb="8px" color="navy.900" fontSize="19px">
          先準備這些資料
        </ModalHeader>
        <ModalCloseButton aria-label="關閉資料清單" top="12px" right="12px" />
        <ModalBody pb="8px">
          <Text fontSize="12.5px" color="#697F8D" lineHeight="1.65">
            {scenario.checklistDescription}
          </Text>
          <Stack mt="15px" spacing="9px">
            {scenario.documents.map((item, index) => (
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
              {scenario.checklistNote}
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
  scenario,
  sources,
  isOpen,
  onClose,
}: {
  scenario: ResourceScenario;
  sources: SourceView[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const toast = useToast();

  const copySearchPhrase = async () => {
    try {
      await navigator.clipboard.writeText(scenario.sourceQuery);
      toast({
        title: "查詢文字已複製",
        status: "success",
        duration: 2400,
        position: "top",
      });
    } catch {
      toast({
        title: "瀏覽器無法自動複製",
        description: `請搜尋「${scenario.sourceQuery}」。`,
        status: "info",
        duration: 3800,
        position: "top",
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm" motionPreset="scale" scrollBehavior="inside">
      <ModalOverlay bg="rgba(9,36,60,.42)" backdropFilter="blur(3px)" />
      <ModalContent mx="16px" maxH="calc(100dvh - 32px)" borderRadius="20px">
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
                資源主管機關
              </Text>
              <Text mt="1px" color="navy.900" fontSize="16px" fontWeight={800}>
                {scenario.agency}
              </Text>
              <Text mt="3px" color="#657D8A" fontSize="12px" lineHeight="1.55">
                {scenario.sourceDescription}
              </Text>
            </Box>
          </HStack>

          <Stack mt="15px" spacing="10px">
            <HStack align="flex-start" spacing="9px">
              <Icon as={MessageCircleQuestion} mt="2px" boxSize="15px" color="warning" />
              <Text fontSize="12.5px" color="navy.700" lineHeight="1.6">
                {scenario.sourceNote}
              </Text>
            </HStack>
            <HStack align="flex-start" spacing="9px">
              <Icon as={ShieldCheck} mt="2px" boxSize="15px" color="brand.600" />
              <Text fontSize="12.5px" color="navy.700" lineHeight="1.6">
                可複製下方文字查找政府資訊；服務內容與受理方式請向承辦窗口確認。
              </Text>
            </HStack>
          </Stack>

          <Box mt="14px" p="11px 12px" bg="#F6F9FA" borderRadius="12px">
            <Text fontSize="10.5px" color="#718591" fontWeight={700} letterSpacing=".03em">
              建議查詢文字
            </Text>
            <Text mt="4px" fontSize="13px" color="navy.800" fontWeight={700} lineHeight="1.5">
              {scenario.sourceQuery}
            </Text>
          </Box>
        <VStack align="stretch" spacing="10px" mt="14px">{sources.map(item=><Box key={item.sourceId} p="12px" border="1px solid #DCE8EC" borderRadius="12px"><Text fontWeight="700" fontSize="12px">{item.title}</Text><Text fontSize="12px" mt="6px" lineHeight="1.8">{item.excerpt}</Text>{item.url&&<Button as="a" href={item.url} target="_blank" rel="noopener noreferrer" size="xs" variant="link" mt="8px">查看原始來源</Button>}</Box>)}</VStack></ModalBody>
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
  const [searchParams] = useSearchParams();
  const question = searchParams.get("q")?.trim() || null;
  const scenario = getResourceScenario(searchParams.get("category"), question);

  return <ResourceChatDemo key={`${scenario.key}:${question ?? ""}`} scenario={scenario} question={question} />;
}

function ResourceChatDemo({ scenario: initialScenario, question }: { scenario: ResourceScenario; question: string | null }) {
  const checklist=useDisclosure(); const source=useDisclosure();
  const fileInputRef=useRef<HTMLInputElement>(null);const endRef=useRef<HTMLDivElement>(null);
  const [draft,setDraft]=useState('');const [attachment,setAttachment]=useState<File|null>(null);
  const [memoryChoice,setMemoryChoice]=useState<MemoryChoice>(null);const [memoryError,setMemoryError]=useState<unknown>(null);const [savingMemory,setSavingMemory]=useState(false);
  const {identity}=useAuth();const profile=useProfile();const refresh=useRefreshStudentData();
  const chat=useChatSession({mode:'resource',category:initialScenario.key,message:question??initialScenario.question});
  useEffect(()=>{if(chat.completedSubmission){setDraft('');setAttachment(null);if(fileInputRef.current)fileInputRef.current.value='';}},[chat.completedSubmission]);
  const messages=chat.messages;const isReplying=chat.busy;const attachmentName=attachment?.name??null;
  const resourceMessage=messages.find(message=>message.resourceRecommendation);
  const resource=resourceMessage?.resourceRecommendation;
  const scenario=resource ? scenarioFromResource(resource):initialScenario;
  const suggestion=messages.filter(message=>message.memorySuggestion).at(-1)?.memorySuggestion;
  useEffect(()=>setMemoryChoice(null),[suggestion?.suggestionId]);
  const currentChoice=memoryChoice??(suggestion&&profile.data?.memories.some(item=>item.key===suggestion.key&&item.value===suggestion.value)?'remembered':null);
  const followUps=messages.filter(message=>message.role==='assistant').at(-1)?.suggestedFollowUps??[];
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth',block:'end'});},[messages.length,isReplying]);
  async function chooseMemory(choice:Exclude<MemoryChoice,null>) {
    if(choice==='declined'){setMemoryChoice(choice);return;}if(!suggestion||savingMemory)return;
    setSavingMemory(true);setMemoryError(null);try{await profileApi.acceptMemory(identity.userId,suggestion.suggestionId);await refresh();setMemoryChoice('remembered');}catch(e){setMemoryError(e);}finally{setSavingMemory(false);}
  }
  const selectAttachment=(event:ChangeEvent<HTMLInputElement>)=>setAttachment(event.target.files?.[0]??null);
  const removeAttachment=()=>{setAttachment(null);if(fileInputRef.current)fileInputRef.current.value='';};
  const sendMessage=(text:string,file:File|null=null)=>chat.send(text,file);
  const submitMessage=async(event:FormEvent<HTMLDivElement>)=>{event.preventDefault();if(isReplying||(!draft.trim()&&!attachment))return;if(await sendMessage(draft.trim(),attachment)){setDraft('');removeAttachment();}};
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
        accept="image/jpeg,image/png"
        display="none"
        onChange={selectAttachment}
        aria-label="選擇附件照片"
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
          <Box>
            <HStack justify="space-between" spacing="8px">
              <HStack spacing="8px">
                <Circle size="30px" bg={scenario.background} color={scenario.color}>
                  <Icon as={scenarioIcons[scenario.key]} boxSize="18px" />
                </Circle>
                <Text color="navy.800" fontSize="16px" fontWeight={800}>{scenario.label}資源諮詢</Text>
              </HStack>
              <Badge px="8px" py="4px" borderRadius="full" bg="white" color="#6C808D" fontSize="10px">
                資源諮詢
              </Badge>
            </HStack>
            <Text mt="7px" color="#6C808D" fontSize="11.5px" lineHeight="1.65">
              查看申請資訊，或直接提問，讓學伴幫你整理下一步。
            </Text>
            <Flex as="nav" aria-label="切換資源分類" mt="11px" gap="6px" wrap="wrap">
              {resourceCategories.map((category) => {
                const selected = category.key === scenario.key;
                return (
                  <Button
                    key={category.key}
                    as={RouterLink}
                    to={`/resource-chat.html?category=${category.key}`}
                    aria-label={`切換到${category.label}分類`}
                    aria-current={selected ? "page" : undefined}
                    size="xs"
                    h="30px"
                    px="10px"
                    borderRadius="full"
                    border="1px solid"
                    borderColor={selected ? scenario.color : "#DDE8EC"}
                    bg={selected ? scenario.background : "white"}
                    color={selected ? scenario.color : "#6C808D"}
                    _hover={{ bg: selected ? scenario.background : "#EDF5F7" }}
                  >
                    {category.label}
                  </Button>
                );
              })}
            </Flex>
          </Box>
          <ApiState error={chat.error} retry={chat.retry}/>{isReplying&&<Button size="xs" variant="ghost" onClick={chat.cancel}>取消等待</Button>}
          {chat.pendingText&&<Box alignSelf="flex-end" bg="#D2F5EF" p="14px" borderRadius="16px"><Text fontSize="13px">{chat.pendingText}</Text></Box>}
          <VStack role="log" aria-label="後續問答" align="stretch" spacing="13px">
            {messages.map(message=>message.role==='user'?<Box key={message.messageId} alignSelf="flex-end" maxW="90%"><Box p="14px" bg="#D2F5EF" borderRadius="17px 17px 4px 17px"><Text whiteSpace="pre-line" fontSize="13px" color="#08766D">{message.text}</Text>{message.attachmentIds.map(id=><AuthenticatedImage key={id} id={id}/>)}</Box></Box>:<Box key={message.messageId}>{message.messageId===resourceMessage?.messageId&&message.resourceRecommendation?<ResourceRecommendationCard text={message.text} scenario={scenarioFromResource(message.resourceRecommendation)} onOpenChecklist={checklist.onOpen} onOpenSource={source.onOpen}/>:<HStack align="flex-start"><BotMark size="30px"/><Box p="13px" bg="white" border="1px solid #E1EBEE" borderRadius="4px 16px 16px 16px"><Text whiteSpace="pre-line" fontSize="12.5px" lineHeight="1.8">{message.text}</Text></Box></HStack>}</Box>)}
          </VStack>
          {followUps.length>0&&<Box as="section" aria-label="建議追問" p="14px" bg={scenario.background} borderRadius="16px"><Text fontSize="12px" fontWeight="800" mb="9px">接著你可以問</Text><Stack spacing="7px">{followUps.map(question=><Button key={question} variant="outline" bg="white" h="auto" minH="36px" py="8px" fontSize="12px" whiteSpace="normal" justifyContent="space-between" rightIcon={<ChevronRight size={15}/>} isDisabled={isReplying} onClick={()=>sendMessage(question)}>{question}</Button>)}</Stack></Box>}
          <ApiState loading={savingMemory} error={memoryError}/>
          {suggestion&&<MemorySuggestion label={suggestion.displayValue} choice={currentChoice} onChoose={choice=>void chooseMemory(choice)}/>}
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

      <ChecklistModal key={JSON.stringify([resourceMessage?.messageId, scenario.documents])} scenario={scenario} isOpen={checklist.isOpen} onClose={checklist.onClose} />
      <GovernmentSourceModal sources={resourceMessage?.sources??[]} scenario={scenario} isOpen={source.isOpen} onClose={source.onClose} />
    </>
  );
}

function scenarioFromResource(resource:ResourceRecommendationView):ResourceScenario {
 const visual=getResourceScenario(resource.category,null);
 return {...visual,title:resource.title,agency:resource.agency,intro:resource.summary,status:resource.eligibilityStatus==='eligible'?'初步符合':resource.eligibilityStatus==='possibly_eligible'?'可能符合':resource.eligibilityStatus==='not_eligible'?'未符合':'待確認需求',requirements:resource.requirements,confirmationTitle:resource.deadline??'申請期限需要確認',confirmationDescription:resource.missingConditions.join('；'),applicationWindow:resource.applicationWindow??'請洽主管機關確認',documents:resource.documents,checklistDescription:'以下為此項資源列出的準備文件，實際要求以主管機關公告為準。',checklistNote:resource.sourceNote??'',nextStep:resource.nextStep??"請洽主管機關確認",sourceDescription:resource.sources.map(item=>item.title).join('、'),sourceNote:resource.sourceNote??'',sourceQuery:resource.sources.map(item=>item.queryHint).filter(Boolean).join(' '),memoryLabel:'',followUps:[],fallbackReply:''};
}
