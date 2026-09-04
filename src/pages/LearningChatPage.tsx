import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
  VisuallyHidden,
  VStack,
} from "@chakra-ui/react";
import {
  Bot,
  CheckCheck,
  CircleArrowDown,
  ImagePlus,
  Lightbulb,
  PencilLine,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { StudentShell } from "@/components/layout/StudentShell";

type ExtraExplanation = "practice" | "alternate" | null;

interface UserMessage {
  id: number;
  text: string;
  time: string;
}

function UserBubble({ text, time }: Omit<UserMessage, "id">) {
  return (
    <Flex w="full" direction="column" align="flex-end">
      <Box
        maxW="82%"
        px="16px"
        py="10px"
        bg="#CEF5EF"
        color="#08796F"
        borderRadius="18px 18px 4px 18px"
        boxShadow="0 5px 15px rgba(18, 183, 167, 0.08)"
      >
        <Text fontSize="14px" lineHeight="1.6" fontWeight="700">
          {text}
        </Text>
      </Box>
      <HStack mt="4px" spacing="3px" pr="3px" color="#7D909E">
        <Text fontSize="10px" lineHeight="1">
          {time}
        </Text>
        <VisuallyHidden>已讀</VisuallyHidden>
        <Icon as={CheckCheck} boxSize="13px" color="brand.500" aria-hidden="true" />
      </HStack>
    </Flex>
  );
}

function FormulaPanel({ children }: { children: React.ReactNode }) {
  return (
    <Flex
      minH="42px"
      align="center"
      justify="center"
      px="16px"
      py="8px"
      bg="#F1F7FE"
      border="1px solid"
      borderColor="#E8F1FD"
      borderRadius="10px"
      color="learning"
      fontSize="18px"
      fontWeight="700"
      letterSpacing="0.02em"
    >
      {children}
    </Flex>
  );
}

function LearningAnswerCard() {
  const [extra, setExtra] = useState<ExtraExplanation>(null);
  const [showPracticeAnswer, setShowPracticeAnswer] = useState(false);

  const showPractice = () => {
    setExtra("practice");
    setShowPracticeAnswer(false);
  };

  return (
    <Box
      as="article"
      aria-labelledby="learning-answer-title"
      w="full"
      bg="white"
      border="1px solid"
      borderColor="#E2ECEF"
      borderRadius="16px"
      boxShadow="0 8px 26px rgba(20, 50, 74, 0.07)"
      overflow="hidden"
    >
      <Box p={{ base: "18px 17px 16px", sm: "20px" }}>
        <HStack align="flex-start" spacing="11px">
          <Flex
            flexShrink={0}
            w="30px"
            h="30px"
            align="center"
            justify="center"
            bg="brand.50"
            border="1px solid"
            borderColor="brand.100"
            borderRadius="full"
            position="relative"
          >
            <Icon as={Bot} boxSize="18px" color="brand.600" strokeWidth={2.5} />
            <Box
              position="absolute"
              top="-4px"
              right="-2px"
              w="7px"
              h="7px"
              bg="brand.400"
              border="2px solid white"
              borderRadius="full"
            />
          </Flex>
          <Box pt="2px">
            <Text
              id="learning-answer-title"
              color="navy.700"
              fontSize="16px"
              fontWeight="800"
              lineHeight="1.4"
            >
              分數除法
            </Text>
            <HStack mt="4px" spacing="5px" color="#526B7D">
              <Text fontSize="13px" fontWeight="600">
                我們一步一步來
              </Text>
              <Icon as={CircleArrowDown} boxSize="15px" color="brand.500" aria-hidden="true" />
            </HStack>
          </Box>
        </HStack>

        <VStack mt="15px" spacing="14px" align="stretch">
          <FormulaPanel>3/4 ÷ 1/2</FormulaPanel>

          <Box>
            <Text color="navy.700" fontSize="13px" fontWeight="800">
              第一步
            </Text>
            <Text mt="4px" color="#3E5668" fontSize="13px" lineHeight="1.75">
              除以一個分數，可以改成乘上它的倒數。
            </Text>
          </Box>

          <FormulaPanel>3/4 × 2/1</FormulaPanel>

          <Box>
            <Text color="navy.700" fontSize="13px" fontWeight="800">
              第二步
            </Text>
            <Text mt="4px" color="#3E5668" fontSize="13px" lineHeight="1.75">
              分子乘分子，分母乘分母，再把答案約成最簡分數。
            </Text>
          </Box>

          <FormulaPanel>
            <VStack spacing="1px">
              <Text>= 6/4</Text>
              <Text>= 3/2</Text>
            </VStack>
          </FormulaPanel>

          <HStack spacing="7px" color="#3E5668" align="flex-start">
            <Icon as={Sparkles} boxSize="15px" mt="3px" color="warning" />
            <Text fontSize="13px" lineHeight="1.65">
              這樣就算出來了！你想試試看下一題嗎？
            </Text>
          </HStack>

          <Box aria-live="polite">
            {extra === "practice" && (
              <Box
                p="13px"
                bg="#F2FBF9"
                border="1px solid"
                borderColor="brand.100"
                borderRadius="12px"
              >
                <HStack spacing="7px" color="brand.700">
                  <Icon as={PencilLine} boxSize="16px" />
                  <Text fontSize="13px" fontWeight="800">
                    換你試試看
                  </Text>
                </HStack>
                <Text mt="8px" color="navy.700" fontSize="17px" fontWeight="700" textAlign="center">
                  2/3 ÷ 1/3 = ？
                </Text>
                <Button
                  mt="10px"
                  w="full"
                  size="sm"
                  variant="outline"
                  borderColor="brand.300"
                  color="brand.700"
                  bg="white"
                  onClick={() => setShowPracticeAnswer((shown) => !shown)}
                  aria-expanded={showPracticeAnswer}
                >
                  {showPracticeAnswer ? "收起答案" : "看答案"}
                </Button>
                {showPracticeAnswer && (
                  <Text mt="9px" color="#3E5668" fontSize="13px" lineHeight="1.65" textAlign="center">
                    2/3 × 3/1 = 6/3 = <b>2</b>
                  </Text>
                )}
              </Box>
            )}

            {extra === "alternate" && (
              <Box
                p="13px"
                bg="#F7F9FC"
                border="1px solid"
                borderColor="#E3EAF1"
                borderRadius="12px"
              >
                <HStack spacing="7px" color="learning">
                  <Icon as={Lightbulb} boxSize="17px" />
                  <Text fontSize="13px" fontWeight="800">
                    換個方式想
                  </Text>
                </HStack>
                <Text mt="7px" color="#3E5668" fontSize="13px" lineHeight="1.75">
                  把 3/4 想成三個 1/4；一個 1/2 等於兩個 1/4，所以 3/4 裡有一個半的 1/2，也就是 1 又 1/2，等於 3/2。
                </Text>
              </Box>
            )}
          </Box>
        </VStack>
      </Box>

      <Flex gap="10px" px={{ base: "17px", sm: "20px" }} pb="18px">
        <Button
          flex="1"
          h="42px"
          bg="brand.500"
          color="white"
          _hover={{ bg: "brand.600" }}
          _active={{ bg: "brand.700" }}
          onClick={showPractice}
          aria-expanded={extra === "practice"}
          fontSize="14px"
        >
          我想試試
        </Button>
        <Button
          flex="1"
          h="42px"
          variant="outline"
          borderColor="#C8D8E2"
          color="navy.700"
          bg="white"
          _hover={{ bg: "#F7FAFC" }}
          onClick={() => setExtra("alternate")}
          aria-expanded={extra === "alternate"}
          fontSize="14px"
        >
          再解釋一次
        </Button>
      </Flex>
    </Box>
  );
}

export default function LearningChatPage() {
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [composerFeedback, setComposerFeedback] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedImage(file);
    setComposerFeedback(file ? `已選擇圖片：${file.name}` : "");
  };

  const clearImage = () => {
    setSelectedImage(null);
    setComposerFeedback("");
    if (uploadRef.current) uploadRef.current.value = "";
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();

    if (!text && !selectedImage) {
      setComposerFeedback("請先輸入問題，或上傳一張題目圖片。");
      return;
    }

    const imageNote = selectedImage ? `已上傳題目圖片：${selectedImage.name}` : "";
    const messageText = [text, imageNote].filter(Boolean).join("\n");
    const time = new Intl.DateTimeFormat("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());

    setMessages((current) => [
      ...current,
      { id: Date.now(), text: messageText, time },
    ]);
    setDraft("");
    setSelectedImage(null);
    setComposerFeedback("問題已送出，學伴正在準備回覆。");
    if (uploadRef.current) uploadRef.current.value = "";
  };

  const composer = (
    <Box
      as="footer"
      flexShrink={0}
      px="12px"
      pt="10px"
      pb={{ base: "max(10px, env(safe-area-inset-bottom))", md: "12px" }}
      bg="white"
      borderTop="1px solid"
      borderColor="#E6EEF1"
      boxShadow="0 -8px 22px rgba(20, 50, 74, 0.035)"
      zIndex={4}
    >
      {selectedImage && (
        <HStack
          mb="7px"
          px="10px"
          py="6px"
          spacing="7px"
          bg="brand.50"
          borderRadius="9px"
          color="brand.700"
        >
          <Icon as={ImagePlus} boxSize="15px" flexShrink={0} />
          <Text flex="1" minW={0} fontSize="11px" fontWeight="600" noOfLines={1}>
            {selectedImage.name}
          </Text>
          <IconButton
            aria-label="移除已選圖片"
            icon={<X size={14} />}
            size="xs"
            minW="24px"
            h="24px"
            variant="ghost"
            onClick={clearImage}
          />
        </HStack>
      )}

      <Flex
        as="form"
        onSubmit={handleSubmit}
        align="center"
        gap="4px"
        p="4px"
        bg="#F8FBFC"
        border="1px solid"
        borderColor="#DDE8EC"
        borderRadius="15px"
        boxShadow="0 5px 16px rgba(20, 50, 74, 0.06)"
      >
        <Input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (composerFeedback) setComposerFeedback("");
          }}
          aria-label="輸入問題"
          placeholder="告訴我你的問題..."
          autoComplete="off"
          h="40px"
          px="10px"
          bg="transparent"
          border="none"
          fontSize="13px"
          color="navy.700"
          _placeholder={{ color: "#8596A3" }}
          _focusVisible={{ boxShadow: "none" }}
        />
        <input
          ref={uploadRef}
          id="learning-image-upload"
          type="file"
          accept="image/*"
          hidden
          onChange={handleImageChange}
        />
        <IconButton
          type="button"
          aria-label="上傳題目圖片"
          icon={<ImagePlus size={20} />}
          size="sm"
          flexShrink={0}
          variant="ghost"
          color="navy.600"
          cursor="pointer"
          onClick={() => uploadRef.current?.click()}
        />
        <IconButton
          type="submit"
          aria-label="送出問題"
          icon={<SendHorizontal size={18} />}
          size="sm"
          flexShrink={0}
          borderRadius="full"
          bg="brand.500"
          color="white"
          _hover={{ bg: "brand.600" }}
          _active={{ bg: "brand.700" }}
        />
      </Flex>
      {composerFeedback && (
        <Text
          role="status"
          mt="5px"
          px="4px"
          color={composerFeedback.startsWith("請先") ? "critical" : "#647B8B"}
          fontSize="10px"
          lineHeight="1.4"
        >
          {composerFeedback}
        </Text>
      )}
    </Box>
  );

  return (
    <StudentShell
      backHref="/index.html"
      showBottomNav={false}
      contentPadding={0}
      footer={composer}
    >
      <VStack
        minH="100%"
        align="stretch"
        spacing="12px"
        px="12px"
        pt="14px"
        pb="16px"
      >
        <UserBubble text="3/4 ÷ 1/2 怎麼算？" time="10:24" />
        <LearningAnswerCard />

        {messages.map((message) => (
          <UserBubble key={message.id} text={message.text} time={message.time} />
        ))}

        {messages.length > 0 && (
          <HStack
            alignSelf="flex-start"
            spacing="8px"
            px="11px"
            py="8px"
            bg="white"
            border="1px solid"
            borderColor="#E2ECEF"
            borderRadius="13px 13px 13px 4px"
            color="#526B7D"
          >
            <Icon as={Bot} boxSize="16px" color="brand.600" />
            <Text fontSize="12px">收到，我會接著幫你一起想。</Text>
          </HStack>
        )}
        <Box ref={messageEndRef} h="1px" aria-hidden="true" />
      </VStack>
    </StudentShell>
  );
}
