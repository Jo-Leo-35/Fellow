import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  Flex,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  Tooltip,
  VisuallyHidden,
  VStack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  BookOpen,
  Home,
  ImagePlus,
  Leaf,
  MessageCircleMore,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useRef,
  useState,
} from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { StudentShell } from "@/components/layout/StudentShell";
import { chatHistory } from "@/data/demo";

type HistoryGroup = (typeof chatHistory)[number];

function QuickActionCard({
  href,
  label,
  description,
  icon,
  tone,
}: {
  href: string;
  label: string;
  description: string;
  icon: typeof BookOpen;
  tone: "learning" | "resource";
}) {
  const isLearning = tone === "learning";

  return (
    <Flex
      as={RouterLink}
      to={href}
      aria-label={`${label}：${description}`}
      direction="column"
      align="center"
      justify="center"
      minH="112px"
      px="10px"
      py="14px"
      border="1px solid"
      borderColor={isLearning ? "#D9E9FF" : "#FBE6C4"}
      borderRadius="18px"
      bg={
        isLearning
          ? "linear-gradient(145deg, #FFFFFF 15%, #F2F7FF 100%)"
          : "linear-gradient(145deg, #FFFFFF 15%, #FFF8EC 100%)"
      }
      boxShadow="0 8px 22px rgba(20, 50, 74, 0.07)"
      transition="transform .18s ease, box-shadow .18s ease, border-color .18s ease"
      _hover={{
        transform: "translateY(-3px)",
        boxShadow: "0 13px 28px rgba(20, 50, 74, 0.12)",
        borderColor: isLearning ? "#A9CCFA" : "#F6CD8C",
      }}
      _active={{ transform: "translateY(-1px) scale(.99)" }}
      _focusVisible={{
        outline: "none",
        boxShadow: `0 0 0 3px ${isLearning ? "rgba(59,142,243,.28)" : "rgba(246,166,60,.32)"}, 0 12px 28px rgba(20,50,74,.12)`,
      }}
    >
      <Flex
        align="center"
        justify="center"
        boxSize="43px"
        mb="7px"
        borderRadius="14px"
        color={isLearning ? "learning" : "#EE9B20"}
        bg={isLearning ? "#EAF3FF" : "#FFF0D8"}
      >
        <Icon as={icon} boxSize="25px" strokeWidth={2.2} />
      </Flex>
      <Text color="navy.700" fontSize="17px" fontWeight="800" lineHeight="1.25">
        {label}
      </Text>
      <Text mt="4px" color="#728596" fontSize="11px" fontWeight="500" noOfLines={1}>
        {description}
      </Text>
    </Flex>
  );
}

function ChatComposer() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const goToLearningChat = () => {
    const cleanMessage = message.trim();
    if (!cleanMessage && !selectedFile) return;

    const params = new URLSearchParams();
    if (cleanMessage) params.set("q", cleanMessage);
    if (selectedFile) params.set("image", selectedFile.name);
    navigate(`/learning-chat.html?${params.toString()}`);
  };

  const handleSubmit = (event: FormEvent<HTMLDivElement>) => {
    event.preventDefault();
    goToLearningChat();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      goToLearningChat();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSend = Boolean(message.trim() || selectedFile);

  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      flexShrink={0}
      px="13px"
      pt={selectedFile ? "5px" : "8px"}
      pb="10px"
      bg="linear-gradient(180deg, rgba(247,251,252,0) 0%, #F7FBFC 20%)"
    >
      <VisuallyHidden
        ref={fileInputRef}
        as="input"
        type="file"
        accept="image/*"
        aria-label="選擇題目圖片"
        onChange={handleFileChange}
      />

      {selectedFile && (
        <HStack
          role="status"
          maxW="100%"
          w="fit-content"
          mb="7px"
          px="9px"
          py="5px"
          spacing="6px"
          border="1px solid #CBECE7"
          borderRadius="10px"
          bg="#EAF9F6"
          color="navy.700"
        >
          <ImagePlus size={14} aria-hidden="true" />
          <Text maxW="255px" fontSize="11px" fontWeight="600" noOfLines={1}>
            已選擇：{selectedFile.name}
          </Text>
          <IconButton
            aria-label="移除已選圖片"
            icon={<X size={13} />}
            size="xs"
            minW="22px"
            h="22px"
            color="navy.500"
            variant="ghost"
            onClick={clearSelectedFile}
            _focusVisible={{ boxShadow: "0 0 0 2px #12B7A7" }}
          />
        </HStack>
      )}

      <HStack
        spacing="3px"
        minH="50px"
        px="5px"
        border="1px solid #DDE9ED"
        borderRadius="17px"
        bg="white"
        boxShadow="0 8px 24px rgba(20,50,74,.10)"
        transition="border-color .18s ease, box-shadow .18s ease"
        _focusWithin={{
          borderColor: "brand.400",
          boxShadow: "0 0 0 3px rgba(18,183,167,.14), 0 8px 24px rgba(20,50,74,.10)",
        }}
      >
        <Input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="輸入想問的問題"
          placeholder="你可以直接問我問題…"
          px="10px"
          border="none"
          color="navy.700"
          fontSize="13px"
          _placeholder={{ color: "#8A9AA7" }}
          _focusVisible={{ boxShadow: "none" }}
        />
        <Tooltip label="上傳圖片" placement="top" hasArrow>
          <IconButton
            aria-label="上傳題目圖片"
            icon={<ImagePlus size={20} />}
            size="sm"
            color="#49647A"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            _hover={{ bg: "brand.50", color: "brand.700" }}
            _focusVisible={{ boxShadow: "0 0 0 2px #12B7A7" }}
          />
        </Tooltip>
        <Tooltip label={canSend ? "送出問題" : "請先輸入問題或選擇圖片"} placement="top" hasArrow>
          <IconButton
            aria-label="送出問題"
            type="submit"
            icon={<Send size={18} />}
            size="sm"
            mr="2px"
            color="white"
            bg={canSend ? "brand.500" : "#D4E3E6"}
            isDisabled={!canSend}
            _hover={canSend ? { bg: "brand.600", transform: "translateY(-1px)" } : undefined}
            _active={canSend ? { bg: "brand.700", transform: "scale(.96)" } : undefined}
            _focusVisible={{ boxShadow: "0 0 0 3px rgba(18,183,167,.28)" }}
            transition="all .16s ease"
          />
        </Tooltip>
      </HStack>
    </Box>
  );
}

function ChatHistoryDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HistoryGroup[]>(() =>
    chatHistory.map((group) => ({ ...group, items: [...group.items] })),
  );
  const [announcement, setAnnouncement] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-Hant");
  const filteredHistory = history
    .map((group) => ({
      ...group,
      items: normalizedQuery
        ? group.items.filter((item) => item.title.toLocaleLowerCase("zh-Hant").includes(normalizedQuery))
        : group.items,
    }))
    .filter((group) => group.items.length > 0);

  const openConversation = (title: string) => {
    onClose();
    navigate(`/learning-chat.html?history=${encodeURIComponent(title)}`);
  };

  const deleteConversation = (groupName: string, title: string) => {
    setHistory((groups) =>
      groups.map((group) =>
        group.group === groupName
          ? { ...group, items: group.items.filter((item) => item.title !== title) }
          : group,
      ),
    );
    setAnnouncement(`已刪除聊天紀錄：${title}`);
  };

  return (
    <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
      <DrawerOverlay bg="rgba(7,31,53,.38)" backdropFilter="blur(2px)" />
      <DrawerContent
        w={{ base: "82vw", md: "350px" }}
        maxW={{ base: "82vw", md: "350px" }}
        h="100dvh"
        color="white"
        bg="linear-gradient(165deg, #143A5B 0%, #0B2944 52%, #071F35 100%)"
        boxShadow="16px 0 44px rgba(4,20,35,.30)"
      >
        <DrawerCloseButton
          aria-label="關閉聊天紀錄"
          top="15px"
          right="14px"
          borderRadius="10px"
          color="whiteAlpha.900"
          _hover={{ bg: "whiteAlpha.200" }}
          _focusVisible={{ boxShadow: "0 0 0 2px #5BD7CA" }}
        />
        <DrawerHeader px="17px" pt="18px" pb="12px" fontSize="18px" fontWeight="800">
          聊天紀錄
        </DrawerHeader>

        <Box px="14px" pb="10px">
          <InputGroup>
            <InputLeftElement pointerEvents="none" color="whiteAlpha.700">
              <Search size={17} aria-hidden="true" />
            </InputLeftElement>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="搜尋聊天紀錄"
              placeholder="搜尋聊天紀錄"
              h="43px"
              border="1px solid"
              borderColor="whiteAlpha.100"
              borderRadius="13px"
              bg="whiteAlpha.100"
              color="white"
              fontSize="13px"
              _placeholder={{ color: "whiteAlpha.600" }}
              _hover={{ borderColor: "whiteAlpha.300", bg: "whiteAlpha.200" }}
              _focusVisible={{ borderColor: "brand.300", boxShadow: "0 0 0 2px rgba(91,215,202,.22)" }}
            />
          </InputGroup>
        </Box>

        <DrawerBody className="soft-scrollbar" px="11px" pt="5px" pb="16px">
          <VisuallyHidden aria-live="polite">{announcement}</VisuallyHidden>
          {filteredHistory.length > 0 ? (
            <VStack align="stretch" spacing="18px">
              {filteredHistory.map((group) => (
                <Box key={group.group}>
                  <Text px="7px" mb="6px" color="whiteAlpha.800" fontSize="12px" fontWeight="700">
                    {group.group}
                  </Text>
                  <VStack align="stretch" spacing="3px">
                    {group.items.map((item) => (
                      <HStack key={`${group.group}-${item.title}`} role="group" spacing="2px" align="center">
                        <Button
                          onClick={() => openConversation(item.title)}
                          variant="ghost"
                          flex="1"
                          minW={0}
                          h="auto"
                          minH="45px"
                          justifyContent="flex-start"
                          px="8px"
                          py="8px"
                          borderRadius="11px"
                          color="whiteAlpha.900"
                          fontWeight="500"
                          textAlign="left"
                          _hover={{ bg: "whiteAlpha.100", color: "white" }}
                          _active={{ bg: "whiteAlpha.200" }}
                          _focusVisible={{ boxShadow: "inset 0 0 0 2px #5BD7CA" }}
                        >
                          <HStack w="full" minW={0} justify="space-between" spacing="8px">
                            <Text minW={0} fontSize="12px" noOfLines={1}>
                              {item.title}
                            </Text>
                            <Text flexShrink={0} color="whiteAlpha.600" fontSize="10px">
                              {item.time}
                            </Text>
                          </HStack>
                        </Button>
                        <Tooltip label="刪除紀錄" placement="right" hasArrow>
                          <IconButton
                            aria-label={`刪除「${item.title}」`}
                            icon={<Trash2 size={15} />}
                            size="sm"
                            flexShrink={0}
                            color="whiteAlpha.700"
                            variant="ghost"
                            opacity={{ base: 0.8, md: 0.25 }}
                            onClick={() => deleteConversation(group.group, item.title)}
                            _groupHover={{ opacity: 1 }}
                            _hover={{ bg: "rgba(239,87,83,.18)", color: "#FFACA9" }}
                            _focusVisible={{ opacity: 1, boxShadow: "inset 0 0 0 2px #FFACA9" }}
                          />
                        </Tooltip>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              ))}
            </VStack>
          ) : (
            <VStack py="52px" spacing="11px" color="whiteAlpha.700" textAlign="center">
              <Icon as={MessageCircleMore} boxSize="28px" />
              <Text fontSize="13px">找不到符合的聊天紀錄</Text>
              <Button size="sm" variant="ghost" color="brand.200" onClick={() => setQuery("")}>
                清除搜尋
              </Button>
            </VStack>
          )}
        </DrawerBody>

        <DrawerFooter
          justifyContent="stretch"
          px="12px"
          pt="11px"
          pb="max(15px, env(safe-area-inset-bottom))"
          borderTop="1px solid"
          borderColor="whiteAlpha.100"
        >
          <Button
            as={RouterLink}
            to="/index.html?panel=profile"
            onClick={onClose}
            w="full"
            justifyContent="flex-start"
            leftIcon={<Settings size={18} />}
            color="whiteAlpha.900"
            variant="ghost"
            _hover={{ bg: "whiteAlpha.100", color: "white" }}
            _focusVisible={{ boxShadow: "inset 0 0 0 2px #5BD7CA" }}
          >
            設定
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ProfileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    nickname: "小芽",
    grade: "國中一年級",
    region: "高雄市旗山區",
    familyWork: "農業",
  });

  const fields = [
    { key: "nickname" as const, label: "暱稱" },
    { key: "grade" as const, label: "年級" },
    { key: "region" as const, label: "地區" },
    { key: "familyWork" as const, label: "家庭工作" },
  ];

  const saveProfile = () => {
    setEditing(false);
    toast({ title: "資料已更新", status: "success", duration: 1800, isClosable: true });
  };

  return (
    <Drawer isOpen={isOpen} placement="bottom" onClose={onClose}>
      <DrawerOverlay bg="rgba(7,31,53,.4)" backdropFilter="blur(2px)" />
      <DrawerContent maxW="430px" mx="auto" borderTopRadius="24px">
        <DrawerCloseButton aria-label="關閉關於我" top="14px" right="14px" />
        <DrawerHeader px="20px" pt="21px" pb="9px" color="navy.800" fontSize="20px">
          關於我
          <Text mt="3px" color="gray.500" fontSize="12px" fontWeight="500">
            讓學伴更快找到適合你的學習與生活資源
          </Text>
        </DrawerHeader>
        <DrawerBody px="20px" py="10px">
          <VStack align="stretch" spacing="11px">
            {fields.map((field) => (
              <FormControl key={field.key}>
                <FormLabel mb="5px" color="gray.600" fontSize="11px" fontWeight="700">
                  {field.label}
                </FormLabel>
                <Input
                  value={profile[field.key]}
                  isReadOnly={!editing}
                  onChange={(event) => setProfile((current) => ({ ...current, [field.key]: event.target.value }))}
                  h="42px"
                  bg={editing ? "white" : "#F5F9FA"}
                  borderColor={editing ? "brand.200" : "#E4ECEF"}
                  fontSize="13px"
                />
              </FormControl>
            ))}
          </VStack>
          <HStack mt="16px" align="flex-start" spacing="9px" p="13px" borderRadius="13px" bg="brand.50" color="brand.800">
            <Icon as={ShieldCheck} boxSize="18px" mt="1px" flexShrink={0} />
            <Box>
              <Text fontSize="12px" fontWeight="800">私密資料</Text>
              <Text mt="3px" fontSize="11px" lineHeight="1.65">
                這些資料只會在你同意的情況下，用來尋找比較適合的資源。
              </Text>
            </Box>
          </HStack>
        </DrawerBody>
        <DrawerFooter px="20px" pt="10px" pb="max(18px, env(safe-area-inset-bottom))" gap="8px">
          {editing ? (
            <>
              <Button variant="ghost" onClick={() => setEditing(false)}>取消</Button>
              <Button flex="1" onClick={saveProfile}>儲存資料</Button>
            </>
          ) : (
            <Button w="full" onClick={() => setEditing(true)}>編輯資料</Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default function StudentHomePage() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchParams, setSearchParams] = useSearchParams();
  const isProfileOpen = searchParams.get("panel") === "profile";
  const closeProfile = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("panel");
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <StudentShell active={isProfileOpen ? "profile" : "chat"} onMenu={onOpen} contentPadding={0} footer={<ChatComposer />}>
        <Flex
          direction="column"
          minH="100%"
          px="16px"
          pt={{ base: "11px", sm: "14px" }}
          pb="12px"
          position="relative"
          overflow="hidden"
          bg="linear-gradient(180deg, #FFFFFF 0%, #F8FCFC 52%, #F1FBF8 100%)"
          sx={{
            "@media (max-height: 720px)": {
              ".home-hero": { minHeight: "142px" },
              ".home-mascot": { height: "142px" },
            },
          }}
        >
          <Box
            className="home-hero"
            flex="1 1 194px"
            minH="174px"
            maxH="230px"
            position="relative"
            aria-hidden="true"
          >
            <Box
              position="absolute"
              left="50%"
              bottom="3px"
              w="245px"
              h="158px"
              transform="translateX(-50%)"
              borderRadius="50%"
              bg="radial-gradient(ellipse at center, rgba(139,231,217,.31) 0%, rgba(214,247,240,.38) 47%, rgba(247,251,252,0) 72%)"
              filter="blur(.2px)"
            />
            <Icon
              as={Leaf}
              position="absolute"
              left="3px"
              bottom="22px"
              boxSize="54px"
              color="brand.200"
              opacity={0.34}
              transform="rotate(-24deg)"
              strokeWidth={1.2}
            />
            <Icon
              as={Leaf}
              position="absolute"
              right="4px"
              bottom="7px"
              boxSize="69px"
              color="brand.200"
              opacity={0.27}
              transform="rotate(31deg) scaleX(-1)"
              strokeWidth={1.15}
            />
            <Box
              position="absolute"
              left="28px"
              top="35%"
              boxSize="7px"
              borderRadius="full"
              bg="brand.200"
              opacity={0.55}
            />
            <Icon
              as={Sparkles}
              position="absolute"
              right="44px"
              top="25px"
              boxSize="18px"
              color="brand.300"
              opacity={0.55}
            />
            <Image
              className="home-mascot"
              src="/assets/mascot-home-v2.png"
              alt=""
              position="absolute"
              left="50%"
              bottom="0"
              h={{ base: "166px", sm: "184px" }}
              maxW="205px"
              objectFit="contain"
              transform="translateX(-50%)"
              filter="drop-shadow(0 13px 14px rgba(8,121,111,.14))"
            />
          </Box>

          <VStack spacing="5px" mt="3px" mb="17px" textAlign="center">
            <Text color="navy.700" fontSize="20px" fontWeight="800" lineHeight="1.3">
              嗨！今天有什麼想問的？
            </Text>
            <Text maxW="315px" color="#6A7F8F" fontSize="12px" lineHeight="1.75">
              我可以陪你解答功課問題，
              <br />
              也能幫你找到適合的政府資源。
            </Text>
          </VStack>

          <Flex gap="10px" w="full">
            <Box flex="1" minW={0}>
              <QuickActionCard
                href="/learning-chat.html"
                label="問功課"
                description="數學、國文、英文…"
                icon={BookOpen}
                tone="learning"
              />
            </Box>
            <Box flex="1" minW={0}>
              <QuickActionCard
                href="/resources.html"
                label="找資源"
                description="補助、就學、生活…"
                icon={Home}
                tone="resource"
              />
            </Box>
          </Flex>
        </Flex>
      </StudentShell>

      <ChatHistoryDrawer isOpen={isOpen} onClose={onClose} />
      <ProfileDrawer isOpen={isProfileOpen} onClose={closeProfile} />
    </>
  );
}
