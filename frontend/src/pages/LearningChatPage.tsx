import {
  Badge, Box, Button, Flex, Heading, HStack, Icon, IconButton, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay,
  SimpleGrid, Text, VStack,
} from "@chakra-ui/react";
import {
  ArrowRight, Atom, BookOpenText, Bot, Check, CheckCheck, ChevronRight, CirclePlay,
  FlaskConical, ImagePlus, Lightbulb, SendHorizontal, X,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { StudentShell } from "@/components/layout/StudentShell";
import { ScienceSimulation } from "@/components/learning/ScienceSimulation";
import { getLearningScenario, learningScenarios, resolveLearningScenario, type LearningScenario } from "@/data/learningScenarios";
import type { LearningScenarioView, SourceView as MaterialChunk } from "@/types/view";
import { useChatSession } from "@/api/chatSession";
import { ApiState, useAuth } from "@/api/runtime";
import { learningApi } from "@/api/resources";
import { useQuery } from "@tanstack/react-query";
import { AuthenticatedImage } from "@/components/StudentData";
type LearningStep = LearningScenarioView["steps"][number];
type LearningReply = {title:string;summary:string;steps:LearningScenarioView['steps'];sources:MaterialChunk[]};
interface SourceView { title: string; sources: MaterialChunk[]; selectedId?: string; library?: boolean }

function UserBubble({ text, time }: { text: string; time?: string }) {
  return (
    <Flex w="full" direction="column" align="flex-end">
      <Box maxW="90%" px="15px" py="11px" bg="#CEF5EF" color="#08796F" borderRadius="18px 18px 4px 18px">
        <Text fontSize="14px" lineHeight="1.7" fontWeight="700" whiteSpace="pre-wrap" overflowWrap="anywhere">{text}</Text>
      </Box>
      <HStack mt="5px" spacing="4px" pr="3px" color="#7D909E">
        <Text fontSize="10px">{time ?? "學習提問"}</Text>
        <Icon as={CheckCheck} boxSize="13px" color="brand.500" aria-hidden="true" />
      </HStack>
    </Flex>
  );
}

function SourceButton({ source, index, onOpen }: { source: MaterialChunk; index: number; onOpen: (view: SourceView) => void }) {
  return (
    <Button size="xs" h="23px" minW="25px" px="5px" ml="5px" mt="4px" verticalAlign="baseline"
      color="brand.700" bg="brand.50" variant="ghost"
      aria-label={`閱讀引用 ${index + 1}：${source.chapter}`}
      onClick={() => onOpen({ title: `教材引用 [${index + 1}]`, sources: [source], selectedId: source.id })}>
      [{index + 1}]
    </Button>
  );
}

function ExplanationSteps({ steps, sources, onOpen }: { steps: LearningStep[]; sources: MaterialChunk[]; onOpen: (view: SourceView) => void }) {
  return (
    <VStack align="stretch" spacing="15px">
      {steps.map((step, index) => (
        <HStack key={step.title} align="flex-start" spacing="10px">
          <Flex flexShrink={0} align="center" justify="center" w="23px" h="23px" borderRadius="8px" bg="#EAF3FF" color="learning" fontSize="11px" fontWeight="800">{index + 1}</Flex>
          <Box minW={0}>
            <Text fontSize="13px" fontWeight="800" color="navy.700">{step.title}</Text>
            <Box mt="4px" fontSize="13px" color="#425C6E" lineHeight="1.85">
              {step.body}
              {step.sourceIds.map((id) => {
                const sourceIndex = sources.findIndex((source) => source.id === id);
                return sourceIndex >= 0 ? <SourceButton key={id} source={sources[sourceIndex]} index={sourceIndex} onOpen={onOpen} /> : null;
              })}
            </Box>
          </Box>
        </HStack>
      ))}
    </VStack>
  );
}

function SourceSummary({ sources, onOpen }: { sources: MaterialChunk[]; onOpen: (view: SourceView) => void }) {
  if (!sources.length) return null;
  return (
    <Button w="full" h="auto" minH="44px" py="10px" px="12px" bg="#F2F8F8" color="brand.700"
      variant="ghost" whiteSpace="normal" textAlign="left" fontSize="12px" justifyContent="space-between"
      leftIcon={<BookOpenText size={15} />} rightIcon={<ChevronRight size={15} />}
      onClick={() => onOpen({ title: "本次參考教材", sources })}>
      查看 {sources.length} 段教材依據
    </Button>
  );
}

function AnswerCard({ scenario, reply, onOpen }: { scenario: LearningScenarioView; reply: LearningReply; onOpen: (view: SourceView) => void }) {
  const [extra, setExtra] = useState<"practice" | "alternate" | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <Box as="article" aria-labelledby="learning-answer-title" bg="white" border="1px solid #DFEAEE" borderRadius="18px" overflow="hidden" boxShadow="0 8px 26px rgba(20,50,74,.05)">
      <VStack align="stretch" spacing="18px" p={{ base: "17px", sm: "20px" }}>
        <HStack align="flex-start" spacing="10px">
          <Flex w="34px" h="34px" flexShrink={0} align="center" justify="center" bg="brand.50" color="brand.600" borderRadius="12px"><Bot size={20} /></Flex>
          <Box>
            <Text fontSize="10px" color="brand.700" fontWeight="700" mb="3px">學伴 · 陪你讀懂教材</Text>
            <Heading as="h1" id="learning-answer-title" fontSize="19px" lineHeight="1.45" color="navy.700">{scenario.title}</Heading>
          </Box>
        </HStack>
        <Text fontSize="14px" lineHeight="1.85" color="#3E5668" whiteSpace="pre-line">{reply.summary}</Text>
        {scenario.formula && <Box bg="#F1F7FE" border="1px solid #E2EDFB" borderRadius="12px" p="13px" textAlign="center">
          <Text fontSize="21px" fontWeight="800" color="learning" overflowWrap="anywhere">{scenario.formula}</Text>
          <Text fontSize="11px" lineHeight="1.75" mt="5px" color="#587387">{scenario.formulaNote}</Text>
        </Box>}
        <Box id="learning-animation" tabIndex={-1} scrollMarginTop="12px" borderRadius="16px" _focusVisible={{ outline: "2px solid", outlineColor: "brand.400", outlineOffset: "3px" }}>{scenario.animationTopic && <ScienceSimulation topic={scenario.animationTopic} />}</Box>
        <ExplanationSteps steps={scenario.steps} sources={reply.sources} onOpen={onOpen} />
        <HStack p="12px" spacing="9px" align="flex-start" bg="#FFFAEB" borderRadius="11px">
          <Icon as={Lightbulb} boxSize="17px" color="#A46C0A" flexShrink={0} mt="3px" />
          <Box><Text fontSize="12px" fontWeight="800" color="#886015">容易搞混的地方</Text><Text mt="4px" fontSize="12px" lineHeight="1.8" color="#735C38">{scenario.misconception}</Text></Box>
        </HStack>
        <SourceSummary sources={reply.sources} onOpen={onOpen} />
        <SimpleGrid columns={2} spacing="9px">
          <Button h="42px" bg="brand.500" color="white" _hover={{ bg: "brand.600" }} fontSize="13px" aria-expanded={extra === "practice"}
            isDisabled={!scenario.practice} onClick={() => { setExtra("practice"); setChoice(null); setShowAnswer(false); }}>我想試試</Button>
          <Button h="42px" variant="outline" borderColor="#C8D8E2" color="navy.700" fontSize="13px" aria-expanded={extra === "alternate"}
            isDisabled={!scenario.analogy} onClick={() => setExtra("alternate")}>再解釋一次</Button>
        </SimpleGrid>
        <Box aria-live="polite">
          {extra === "alternate" && (
            <Box p="14px" bg="#F2F7FD" borderRadius="12px">
              <Text fontSize="13px" fontWeight="800" color="learning">換個方式想</Text>
              <Text mt="7px" color="#3E5668" fontSize="13px" lineHeight="1.85">{scenario.analogy}</Text>
            </Box>
          )}
          {extra === "practice" && scenario.practice && (
            <Box as="section" aria-label="理解練習" p="14px" bg="#F2FBF9" border="1px solid" borderColor="brand.100" borderRadius="12px">
              <Text fontSize="13px" fontWeight="800" color="brand.700">換你試試看</Text>
              <Text mt="8px" fontSize="13px" color="navy.700" lineHeight="1.8">{scenario.practice.question}</Text>
              <VStack mt="10px" align="stretch" spacing="7px">
                {scenario.practice.options.map((option, index) => (
                  <Button key={option} variant="outline" h="auto" minH="40px" py="9px" px="11px" whiteSpace="normal" textAlign="left" justifyContent="flex-start" fontSize="12px" lineHeight="1.7"
                    borderColor={choice === index ? "brand.500" : "#D7E5E5"} bg={choice === index ? "brand.100" : "white"} color="navy.700" aria-pressed={choice === index}
                    onClick={() => { setChoice(index); setShowAnswer(true); }}>
                    {String.fromCharCode(65 + index)}. {option}
                  </Button>
                ))}
              </VStack>
              {!showAnswer && <Button variant="link" color="brand.700" size="sm" mt="12px" onClick={() => setShowAnswer(true)}>看答案</Button>}
              {showAnswer && <Box mt="12px" role="status" fontSize="12px" color="brand.700" lineHeight="1.85">
                <Text fontWeight="800">{choice === null ? "一起看解法" : choice === scenario.practice.answerIndex ? "答對了！你抓到重點了。" : "再想想，關鍵在這裡："}</Text>
                <Text>答案：{String.fromCharCode(65 + scenario.practice.answerIndex)}。{scenario.practice.explanation}</Text>
              </Box>}
            </Box>
          )}
        </Box>
      </VStack>
    </Box>
  );
}

function FollowUpAnswer({ reply, onOpen }: { reply: LearningReply; onOpen: (view: SourceView) => void }) {
  return (
    <Box as="article" aria-label="學伴回覆" p="17px" bg="white" border="1px solid #DFEAEE" borderRadius="16px">
      <HStack spacing="8px" mb="9px"><Icon as={Bot} color="brand.600" boxSize="18px" /><Text fontWeight="800" fontSize="14px" color="navy.700">{reply.title}</Text></HStack>
      <Text fontSize="13px" lineHeight="1.85" color="#425C6E">{reply.summary}</Text>
      {reply.steps.length > 0 && <Box mt="15px"><ExplanationSteps steps={reply.steps} sources={reply.sources} onOpen={onOpen} /></Box>}
      {reply.sources.length > 0 && <Box mt="15px"><SourceSummary sources={reply.sources} onOpen={onOpen} /></Box>}
    </Box>
  );
}

function MaterialsModal({ view, onClose }: { view: SourceView | null; onClose: () => void }) {
  const [search, setSearch] = useState("");
  useEffect(() => { setSearch(""); }, [view]);
  const sources = view?.library && search.trim() ? view.sources.filter(source => `${source.title} ${source.chapter} ${source.content}`.includes(search.trim())) : view?.sources ?? [];
  return (
    <Modal isOpen={Boolean(view)} onClose={onClose} scrollBehavior="inside" size="md">
      <ModalOverlay />
      <ModalContent mx="12px" maxH="85dvh" borderRadius="18px">
        <ModalHeader color="navy.700" fontSize="18px" pr="45px">{view?.title}</ModalHeader>
        <ModalCloseButton aria-label="關閉教材" />
        <ModalBody pb="24px">
          <Text fontSize="12px" color="#607889" lineHeight="1.8" mb="14px">學伴自編教材，依主題整理概念與重點。點開引用，隨時回到原文確認。</Text>
          {view?.library && <Input aria-label="搜尋教材" placeholder="搜尋概念，例如：慣性、催化劑" value={search} onChange={(event) => setSearch(event.target.value)} mb="14px" fontSize="13px" />}
          <Text fontSize="11px" mb="10px" color="brand.700">{search.trim() ? "搜尋結果" : "教材重點"} · {sources.length} 段</Text>
          <VStack align="stretch" spacing="12px">
            {sources.map((source, index) => (
              <Box key={source.id} p="14px" border="1px solid" borderColor={source.id === view?.selectedId ? "brand.400" : "#DFE9ED"} borderRadius="12px" bg={source.id === view?.selectedId ? "brand.50" : "#F8FBFC"}>
                <HStack align="flex-start" spacing="7px"><Badge colorScheme="teal">{view?.selectedId ? "引用" : index + 1}</Badge><Text fontSize="13px" color="navy.700" fontWeight="800">{source.title}</Text></HStack>
                <Text mt="6px" fontSize="11px" color="#5E788A">{source.chapter} · {source.page}</Text>
                <Text as="blockquote" mt="9px" fontSize="13px" lineHeight="1.9" color="#3E5668">{source.content}</Text>
              </Box>
            ))}
            {sources.length === 0 && <Text fontSize="13px" color="#607889">沒有找到相關教材。試試「熱量」、「化學平衡」或「氫鍵」。</Text>}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function LearningSession({ scenario: initialScenario, initialQuestion, initialImage }: { scenario: LearningScenario; initialQuestion: string; initialImage: string }) {
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const chat = useChatSession({mode:"learning", topic:initialScenario.id, message:initialQuestion || initialScenario.question});
  const materials=useQuery({queryKey:["materials"],queryFn:({signal})=>learningApi.listMaterials({signal})});
  const messages=chat.messages;
  const topic=messages.find(message=>message.learningAnswer)?.learningAnswer?.animationTopic;
  const scenario=getLearningScenario(topic??null)??initialScenario;
  const [feedback, setFeedback] = useState("");
  const [sourceView, setSourceView] = useState<SourceView | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  useEffect(()=>{if(chat.completedSubmission){setDraft("");setSelectedImage(null);if(uploadRef.current)uploadRef.current.value="";}},[chat.completedSubmission]);
  const endRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const showFullAnswer=messages.some(message=>Boolean(message.learningAnswer?.animationTopic));
  const followUps=messages.filter(message=>message.role==='assistant').at(-1)?.suggestedFollowUps??[];

  useEffect(() => { topRef.current?.closest("main")?.scrollTo({ top: 0 }); }, []);
  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "end" });
  }, [messages.length]);

  const sendQuestion = async (text: string) => {
    const question = text.trim();
    if (!question && !selectedImage) { setFeedback("請先輸入問題，或選擇題目圖片。"); return; }
    if(!await chat.send(question, selectedImage))return;
    setDraft(""); setSelectedImage(null); setFeedback("");
    if (uploadRef.current) uploadRef.current.value = "";
  };
  const handleSubmit = (event: FormEvent) => { event.preventDefault(); sendQuestion(draft); };
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && !["image/jpeg", "image/png"].includes(file.type)) { setFeedback("請選擇圖片檔案。"); setSelectedImage(null); event.target.value = ""; return; }
    setSelectedImage(file); setFeedback(file ? "請同時輸入圖片中的題目文字。" : "");
  };

  const composer = (
    <Box as="footer" flexShrink={0} px="12px" pt="10px" pb="max(12px, env(safe-area-inset-bottom))" bg="white" borderTop="1px solid #E6EEF1" zIndex={4}>
      {selectedImage && <HStack mb="7px" px="10px" py="6px" bg="brand.50" borderRadius="9px" color="brand.700">
        <Icon as={ImagePlus} boxSize="15px" /><Text flex="1" minW={0} fontSize="11px" noOfLines={1}>{selectedImage.name}</Text>
        <IconButton aria-label="移除已選圖片" icon={<X size={14} />} size="xs" variant="ghost" onClick={() => { setSelectedImage(null); setFeedback(""); if (uploadRef.current) uploadRef.current.value = ""; }} />
      </HStack>}
      <Flex as="form" onSubmit={handleSubmit} align="center" gap="4px" p="4px" bg="#F8FBFC" border="1px solid #DDE8EC" borderRadius="15px">
        <Input isDisabled={chat.busy} value={draft} onChange={(event) => { setDraft(event.target.value); if (feedback) setFeedback(""); }}
          onKeyDown={(event) => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }}
          aria-label="輸入問題" placeholder="哪個概念還不懂？繼續問我…" autoComplete="off" h="40px" px="10px" bg="transparent" border="none" fontSize="13px" color="navy.700" _focusVisible={{ boxShadow: "0 0 0 2px #12B7A7" }} />
        <input ref={uploadRef} type="file" accept="image/jpeg,image/png" hidden onChange={handleImageChange} />
        <IconButton type="button" aria-label="上傳題目圖片" icon={<ImagePlus size={19} />} size="sm" flexShrink={0} variant="ghost" color="navy.600" onClick={() => uploadRef.current?.click()} />
        <IconButton type="submit" aria-label="送出問題" isLoading={chat.busy} icon={<SendHorizontal size={18} />} size="sm" flexShrink={0} borderRadius="full" bg="brand.500" color="white" _hover={{ bg: "brand.600" }} />
      </Flex>
      {feedback && <Text role="status" mt="5px" px="4px" color="#647B8B" fontSize="11px">{feedback}</Text>}
    </Box>
  );

  return (
    <StudentShell backHref="/index.html" showBottomNav={false} contentPadding={0} footer={composer}>
      <VStack ref={topRef} align="stretch" spacing="16px" px="12px" pt="18px" pb="20px">
        <Box px="3px">
          <HStack justify="space-between" mb="9px">
            <Badge colorScheme="teal" borderRadius="full" px="9px" py="3px" fontSize="10px">互動學習</Badge>
            <Button size="xs" variant="ghost" color="brand.700" leftIcon={<BookOpenText size={14} />} onClick={() => setSourceView({ title: "教材庫", sources: materials.data?.items??[], library: true })}>教材庫</Button>
          </HStack>
          <Heading as="h2" fontSize="28px" lineHeight="1.45" letterSpacing="-.02em" color="navy.700">教學動畫</Heading>
          <Text mt="6px" fontSize="12px" lineHeight="1.8" color="#607889">跟著動畫看懂原理，動手探索每一個變化。</Text>
          <HStack mt="11px" spacing="7px" fontSize="10px" color="brand.700">
            <HStack spacing="4px"><Atom size={12} /><Text>選擇主題</Text></HStack><ArrowRight size={12} />
            <HStack spacing="4px"><CirclePlay size={12} /><Text>觀看動畫</Text></HStack><ArrowRight size={12} />
            <HStack spacing="4px"><Check size={12} /><Text>動手練習</Text></HStack>
          </HStack>
        </Box>
        <Box as="nav" aria-label="物理化學主題">
          <SimpleGrid columns={2} spacing="8px">
            {learningScenarios.map((item) => {
              const active = item.id === scenario.id;
              return <Button key={item.id} as={RouterLink} to={`/learning-chat.html?topic=${item.id}`}
                aria-label={`探索${item.title}`} aria-current={active ? "page" : undefined}
                h="auto" minH="65px" p="10px" justifyContent="flex-start" textAlign="left" whiteSpace="normal" variant="outline"
                borderColor={active ? "brand.400" : "#E0E9EE"} bg={active ? "#EAF9F5" : "white"} _hover={{ bg: "brand.50", borderColor: "brand.300" }} borderRadius="12px">
                <Icon as={item.subject === "物理" ? Atom : FlaskConical} boxSize="18px" color={active ? "brand.600" : "#6E8DA7"} mr="8px" flexShrink={0} />
                <Box minW={0}><Text fontSize="12px" color="navy.700" fontWeight="800" lineHeight="1.5">{item.title}</Text><Text mt="3px" fontSize="10px" color="#657F90" fontWeight="400" lineHeight="1.5">{item.subtitle}</Text></Box>
              </Button>;
            })}
          </SimpleGrid>
        </Box>
        {showFullAnswer && (
          <Button leftIcon={<CirclePlay size={19} />} rightIcon={<ChevronRight size={16} />}
            h="44px" bg="brand.500" color="white" fontSize="13px" _hover={{ bg: "brand.600" }}
            aria-controls="learning-animation"
            onClick={() => {
              const animation = document.getElementById("learning-animation");
              animation?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
              animation?.focus({ preventScroll: true });
            }}>
            前往教學動畫
          </Button>
        )}
        <ApiState loading={chat.busy} error={chat.error} retry={chat.retry}/>
        {chat.busy && <Button size="xs" variant="ghost" onClick={chat.cancel}>取消等待</Button>}
        {chat.pendingText && <UserBubble text={chat.pendingText}/>}
        <VStack as="section" role="log" aria-label="後續問答" aria-live="polite" align="stretch" spacing="14px">
          {messages.map((message,index)=><VStack key={message.messageId} align="stretch" spacing="12px">
            {message.role==='user'?<><UserBubble text={message.text}/>{message.attachmentIds.map(id=><AuthenticatedImage key={id} id={id}/>)}</>: message.learningAnswer && index===1 ? <AnswerCard scenario={message.learningAnswer} reply={{title:message.learningAnswer.title,summary:message.text,steps:message.learningAnswer.steps,sources:message.sources}} onOpen={setSourceView}/> : <FollowUpAnswer reply={{title:message.learningAnswer?.title??'學伴回覆',summary:message.text,steps:message.learningAnswer?.steps??[],sources:message.sources}} onOpen={setSourceView}/>}
          </VStack>)}
        </VStack>
        <Box as="section" role="region" aria-label="建議追問"><Text mb="9px" fontSize="12px" color="#657F90">你也可以接著問</Text><VStack align="stretch" spacing="7px">{followUps.map(question=><Button key={question} isDisabled={chat.busy} variant="outline" bg="white" borderColor="#DDE8ED" color="navy.700" borderRadius="12px" minH="39px" h="auto" py="10px" whiteSpace="normal" fontSize="12px" justifyContent="space-between" rightIcon={<ChevronRight size={14}/>} onClick={()=>sendQuestion(question)}>{question}</Button>)}</VStack></Box>
        <Box ref={endRef} h="1px" aria-hidden="true" />
      </VStack>
      <MaterialsModal view={sourceView} onClose={() => setSourceView(null)} />
    </StudentShell>
  );
}

export default function LearningChatPage() {
  const {identity}=useAuth();
  const [params] = useSearchParams();
  const question = (params.get("q") ?? "").trim();
  const initialImage = params.get("image") ?? "";
  const scenario = getLearningScenario(params.get("topic")) ?? resolveLearningScenario(question) ?? learningScenarios[0];
  if(identity.role === "teacher") return <TeacherPreview scenario={scenario}/>;
  return <LearningSession key={`${scenario.id}:${question}:${initialImage}`} scenario={scenario} initialQuestion={question} initialImage={initialImage} />;
}

function TeacherPreview({scenario}:{scenario:LearningScenario}) {
 const query=useQuery({queryKey:['materials'],queryFn:({signal})=>learningApi.listMaterials({signal})});const [sourceView,setSourceView]=useState<SourceView|null>(null);
 return <StudentShell backHref="/teacher.html" showBottomNav={false}><VStack p="18px" align="stretch" spacing="16px"><Heading fontSize="24px">教材預覽 · {scenario.title}</Heading><Text fontSize="12px">教師教材預覽，不建立學生對話。</Text><SimpleGrid columns={2} gap="8px">{learningScenarios.map(item=><Button key={item.id} as={RouterLink} to={`/learning-chat.html?topic=${item.id}`} size="sm">{item.title}</Button>)}</SimpleGrid><ScienceSimulation topic={scenario.id}/><ApiState loading={query.isPending} error={query.error} retry={()=>void query.refetch()}/><SourceSummary sources={query.data?.items.filter(item=>item.chapter?.includes(scenario.title)||item.title.includes(scenario.title))??[]} onOpen={setSourceView}/><Button onClick={()=>setSourceView({title:'教材庫',sources:query.data?.items??[],library:true})}>教材庫</Button></VStack><MaterialsModal view={sourceView} onClose={()=>setSourceView(null)}/></StudentShell>;
}
