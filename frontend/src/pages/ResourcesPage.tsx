import {
  Badge,
  Box,
  Button,
  Circle,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  VisuallyHidden,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import {
  CalendarClock,
  ChevronRight,
  CircleEllipsis,
  CloudLightning,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Landmark,
  MessageCircleQuestion,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { StudentShell } from "@/components/layout/StudentShell";
import { Surface } from "@/components/ui/Surface";
import { resourceCategories } from "@/data/demo";
import { ChatHistoryDrawer } from "@/components/StudentData";
import { ApiState } from "@/api/runtime";
import { resourcesApi } from "@/api/resources";
import { useQuery } from "@tanstack/react-query";
import type { ResourceRecommendationView } from "@/types/view";

type RecommendedResource = ResourceRecommendationView & {status:string;tone:string};
const displayResource=(x:ResourceRecommendationView):RecommendedResource=>({...x,status:x.eligibilityStatus==='eligible'?'初步符合':x.eligibilityStatus==='possibly_eligible'?'可能符合':x.eligibilityStatus==='not_eligible'?'未符合':'待確認',tone:x.eligibilityStatus==='eligible'?'green':'orange'});
const actualDetail=(x:ResourceRecommendationView):ResourceDetail=>({category:x.category,summary:x.summary,checks:x.requirements.map(r=>r.text),nextStep:x.nextStep??"請洽主管機關確認",icon:categoryVisuals[x.category]?.icon??Landmark,iconBg:'#EAF6F5',iconColor:'#188779'});
type IconComponent = typeof Sprout;

interface ResourceDetail {
  category: string;
  summary: string;
  checks: string[];
  nextStep: string;
  icon: IconComponent;
  iconBg: string;
  iconColor: string;
}

const categoryVisuals: Record<
  string,
  { icon: IconComponent; color: string; ring: string }
> = {
  disaster: { icon: CloudLightning, color: "#E85845", ring: "#FFE5DE" },
  agriculture: { icon: Sprout, color: "#25A663", ring: "#DDF5E6" },
  education: { icon: GraduationCap, color: "#3B8EF3", ring: "#DFEEFF" },
  economy: { icon: HandCoins, color: "#EC9A20", ring: "#FFF0D2" },
  health: { icon: HeartPulse, color: "#2E8FD0", ring: "#DDF3FF" },
  other: { icon: CircleEllipsis, color: "#426B94", ring: "#E4EDF7" },
};

const statusVisuals: Record<string, { bg: string; color: string; border: string }> = {
  orange: { bg: "#FFF3DE", color: "#A96000", border: "#F8DFB5" },
  red: { bg: "#FFF0EF", color: "#C7433D", border: "#F5D2CF" },
  blue: { bg: "#EAF3FF", color: "#246DBB", border: "#CFE4FD" },
};

function ResourceDetailsModal({
  resource,
  onClose,
}: {
  resource: RecommendedResource | null;
  onClose: () => void;
}) {
  const query=useQuery({queryKey:['resources','detail',resource?.programId],queryFn:({signal})=>resourcesApi.getDetail(resource!.programId,{signal}),enabled:Boolean(resource)});
  if (!resource) return null;
  const program = query.data ?? resource;
  const detail = actualDetail(program);
  const status = statusVisuals[resource.tone] ?? statusVisuals.orange;

  return (
    <Modal isOpen onClose={onClose} isCentered size="sm" scrollBehavior="inside">
      <ModalOverlay bg="rgba(7,31,53,.48)" backdropFilter="blur(2px)" />
      <ModalContent mx="16px" maxH="min(680px, calc(100dvh - 32px))" borderRadius="20px" overflow="hidden">
        <ModalCloseButton
          top="12px"
          right="12px"
          color="navy.500"
          _focusVisible={{ boxShadow: "0 0 0 3px rgba(18,183,167,.25)" }}
        />
        <ModalHeader px="20px" pt="21px" pb="13px" borderBottom="1px solid #E9F0F2">
          <HStack pr="34px" spacing="11px" align="center">
            <Circle size="42px" flexShrink={0} bg={detail.iconBg} color={detail.iconColor}>
              <Icon as={detail.icon} boxSize="23px" strokeWidth={2.2} />
            </Circle>
            <Box minW={0}>
              <Text color="navy.800" fontSize="17px" fontWeight="800" lineHeight="1.35">
                {resource.title}
              </Text>
              <HStack mt="4px" spacing="7px">
                <Text color="#667C8C" fontSize="11px" fontWeight="600">
                  {resource.agency}
                </Text>
                <Badge
                  px="7px"
                  py="2px"
                  border="1px solid"
                  borderColor={status.border}
                  borderRadius="full"
                  bg={status.bg}
                  color={status.color}
                  fontSize="9px"
                >
                  {resource.status}
                </Badge>
              </HStack>
            </Box>
          </HStack>
        </ModalHeader>

        <ModalBody px="20px" py="18px"><ApiState loading={query.isPending} error={query.error} retry={()=>void query.refetch()}/>
          <Text color="#3E5668" fontSize="13px" lineHeight="1.75">
            {detail.summary}
          </Text>

          <Box mt="18px">
            <HStack mb="10px" spacing="7px" color="navy.700">
              <Icon as={ShieldCheck} boxSize="17px" color="brand.600" />
              <Text fontSize="13px" fontWeight="800">初步比對重點</Text>
            </HStack>
            <VStack align="stretch" spacing="9px">
              {detail.checks.map((check) => (
                <HStack key={check} align="flex-start" spacing="9px">
                  <Circle mt="5px" size="6px" flexShrink={0} bg="brand.500" />
                  <Text color="#465E70" fontSize="12.5px" lineHeight="1.65">
                    {check}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>

          <Box mt="18px" p="13px" border="1px solid #DCEAEC" borderRadius="13px" bg="#F5FAFB">
            <HStack align="flex-start" spacing="9px">
              <Icon as={CalendarClock} mt="2px" boxSize="17px" flexShrink={0} color="#426B94" />
              <Box>
                <Text color="navy.700" fontSize="12px" fontWeight="800">下一步可以這樣做</Text>
                <Text mt="4px" color="#536B7C" fontSize="11.5px" lineHeight="1.65">
                  {detail.nextStep}
                </Text>
              </Box>
            </HStack>
          </Box>

          <VStack mt="18px" align="stretch" spacing="16px" color="#465E70">
            <Box>
              <Text color="navy.700" fontSize="13px" fontWeight="800">洽詢與申請</Text>
              <Text mt="6px" fontSize="12px" lineHeight="1.7">
                洽詢窗口：{program.applicationWindow ?? program.agency}
              </Text>
              <Text mt="4px" fontSize="12px" lineHeight="1.7">
                申請期限：{program.deadline ?? "請向承辦單位確認"}
              </Text>
            </Box>
            {program.documents.length > 0 && (
              <Box>
                <Text color="navy.700" fontSize="13px" fontWeight="800">準備資料</Text>
                <Box as="ul" mt="6px" pl="18px">
                  {program.documents.map(document => (
                    <Text as="li" key={document} mt="4px" fontSize="12px" lineHeight="1.7">{document}</Text>
                  ))}
                </Box>
              </Box>
            )}
            {program.sources.length > 0 && (
              <Box pt="14px" borderTop="1px solid #E9F0F2">
                <Text color="navy.700" fontSize="13px" fontWeight="800">參考資訊</Text>
                {program.sources.map(item => (
                  <Box key={item.sourceId} mt="10px">
                    <Text fontSize="12px" fontWeight="700">{item.title}</Text>
                    <Text mt="4px" fontSize="11.5px" lineHeight="1.8">{item.excerpt}</Text>
                    {item.url && (
                      <Button as="a" href={item.url} target="_blank" rel="noopener noreferrer" mt="6px" size="xs" variant="link">
                        查看原始來源
                      </Button>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </VStack>
          <Text mt="13px" color="#83939E" fontSize="10.5px" lineHeight="1.55">
            申請資格、應備文件與受理期限，以主管機關最新公告為準。
          </Text>
        </ModalBody>

        <ModalFooter gap="9px" px="20px" py="15px" borderTop="1px solid #E9F0F2">
          <Button flex="0 0 auto" variant="outline" borderColor="#D6E2E7" color="navy.600" onClick={onClose}>
            稍後再看
          </Button>
          <Button
            as={RouterLink}
            to={`/resource-chat.html?category=${detail.category}`}
            flex="1"
            bg="brand.500"
            color="white"
            rightIcon={<ChevronRight size={16} />}
            _hover={{ bg: "brand.600" }}
            _focusVisible={{ boxShadow: "0 0 0 3px rgba(18,183,167,.28)" }}
          >
            詢問學伴
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function ResourcesPage() {
  const resourceQuery=useQuery({queryKey:["resources","list"],queryFn:({signal})=>resourcesApi.list({signal})});
  const recommendedResources=(resourceQuery.data?.items??[]).map(displayResource);
  const historyDrawer = useDisclosure();
  const [query, setQuery] = useState("");
  const [selectedResource, setSelectedResource] = useState<RecommendedResource | null>(null);
  const [params,setParams]=useSearchParams();
  const selectedId=params.get("resource");
  const selectedQuery=useQuery({queryKey:["resources","detail",selectedId],queryFn:({signal})=>resourcesApi.getDetail(selectedId!,{signal}),enabled:Boolean(selectedId)});
  useEffect(()=>{if(selectedQuery.data)setSelectedResource(displayResource(selectedQuery.data));},[selectedQuery.data]);
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-TW");

  const filteredCategories = useMemo(
    () =>
      resourceCategories.filter((category) =>
        `${category.label} ${category.description}`
          .toLocaleLowerCase("zh-TW")
          .includes(normalizedQuery),
      ),
    [normalizedQuery],
  );

  const filteredResources = useMemo(
    () =>
      recommendedResources.filter((resource) => {
        const detail = actualDetail(resource);
        return `${resource.title} ${resource.agency} ${resource.status} ${detail.summary}`
          .toLocaleLowerCase("zh-TW")
          .includes(normalizedQuery);
      }),
    [normalizedQuery, resourceQuery.data],
  );

  const resultCount = filteredCategories.length + filteredResources.length;

  return (
    <>
      <StudentShell active="resources" onMenu={historyDrawer.onOpen}>
        <Box px={{ base: "14px", sm: "17px" }} pt="18px" pb="24px"><ApiState error={selectedQuery.error}/><ApiState loading={resourceQuery.isPending} error={resourceQuery.error} retry={()=>void resourceQuery.refetch()}/>
          <Flex align="flex-start" justify="space-between" gap="12px">
            <Box>
              <HStack spacing="7px">
                <Text as="h1" color="navy.800" fontSize="20px" fontWeight="800" letterSpacing="-.02em">
                  找適合你的資源
                </Text>
                <Icon as={Sparkles} boxSize="17px" color="warning" fill="#F6A63C" />
              </HStack>
              <Text mt="4px" color="#6C8190" fontSize="11.5px" lineHeight="1.65">
                補助、就學、健康支持，從你的需求開始找。
              </Text>
            </Box>
          </Flex>

          <InputGroup mt="13px" size="sm">
            <InputLeftElement pointerEvents="none" h="42px">
              <Search size={17} color="#6B8191" />
            </InputLeftElement>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              h="42px"
              pl="39px"
              pr={query ? "40px" : "12px"}
              aria-label="搜尋資源或問題分類"
              placeholder="搜尋補助、就學、健康…"
              bg="white"
              color="navy.700"
              borderColor="#DDE8EC"
              borderRadius="13px"
              fontSize="12.5px"
              boxShadow="0 5px 16px rgba(20,50,74,.05)"
              _placeholder={{ color: "#91A0AA" }}
              _hover={{ borderColor: "#BFD5DB" }}
              _focusVisible={{ borderColor: "brand.400", boxShadow: "0 0 0 3px rgba(18,183,167,.13)" }}
            />
            {query && (
              <InputRightElement h="42px">
                <IconButton
                  aria-label="清除搜尋"
                  icon={<X size={15} />}
                  size="xs"
                  minW="27px"
                  h="27px"
                  variant="ghost"
                  color="#667C8C"
                  onClick={() => setQuery("")}
                  _focusVisible={{ boxShadow: "0 0 0 2px #12B7A7" }}
                />
              </InputRightElement>
            )}
          </InputGroup>
          <VisuallyHidden aria-live="polite">
            {normalizedQuery ? `找到 ${resultCount} 個結果` : "顯示全部資源"}
          </VisuallyHidden>

          <Box
            as="section"
            aria-labelledby="quick-category-heading"
            mt="18px"
            px="13px"
            pt="15px"
            pb="14px"
            border="1px solid #DDECEF"
            borderRadius="18px"
            bg="linear-gradient(145deg, #F3FBFC 0%, #EEF7FA 100%)"
          >
            <Flex align="flex-start" justify="space-between" gap="10px">
              <Box>
                <HStack spacing="7px">
                  <Circle size="23px" bg="brand.100" color="brand.700">
                    <Icon as={MessageCircleQuestion} boxSize="14px" strokeWidth={2.4} />
                  </Circle>
                  <Text id="quick-category-heading" as="h2" color="navy.800" fontSize="15px" fontWeight="800">
                    快速分類提問
                  </Text>
                </HStack>
                <Text mt="5px" pl="30px" color="#718593" fontSize="10.5px" lineHeight="1.55">
                  知道大概遇到什麼問題？從這裡開始詢問。
                </Text>
              </Box>
              <Badge flexShrink={0} px="7px" py="3px" borderRadius="full" bg="white" color="brand.700" fontSize="9px">
                開始查詢
              </Badge>
            </Flex>

            {filteredCategories.length > 0 ? (
              <SimpleGrid mt="12px" columns={3} spacing="8px">
                {filteredCategories.map((category) => {
                  const visual = categoryVisuals[category.key] ?? categoryVisuals.other;
                  return (
                    <Button
                      key={category.key}
                      as={RouterLink}
                      to={`/resource-chat.html?category=${category.key}`}
                      aria-label={`${category.label}：${category.description}，開始提問`}
                      h="auto"
                      minH="92px"
                      minW={0}
                      px="4px"
                      py="10px"
                      whiteSpace="normal"
                      bg="white"
                      border="1px solid #E4ECEF"
                      borderRadius="14px"
                      boxShadow="0 5px 13px rgba(20,50,74,.055)"
                      _hover={{ transform: "translateY(-2px)", borderColor: visual.ring, boxShadow: "0 8px 18px rgba(20,50,74,.10)" }}
                      _active={{ transform: "translateY(0) scale(.98)" }}
                      _focusVisible={{ outline: "none", boxShadow: "0 0 0 3px rgba(18,183,167,.24)" }}
                      transition="transform .16s ease, border-color .16s ease, box-shadow .16s ease"
                    >
                      <VStack spacing="5px" minW={0}>
                        <Circle size="34px" bg={visual.ring} color={visual.color}>
                          <Icon as={visual.icon} boxSize="20px" strokeWidth={2.2} />
                        </Circle>
                        <Text color="navy.700" fontSize="13px" fontWeight="800" lineHeight="1.2">
                          {category.label}
                        </Text>
                        <Text w="full" color="#81919C" fontSize="9px" fontWeight="500" lineHeight="1.25" noOfLines={1}>
                          {category.description}
                        </Text>
                      </VStack>
                    </Button>
                  );
                })}
              </SimpleGrid>
            ) : (
              <Text mt="14px" py="15px" color="#728694" fontSize="11.5px" textAlign="center">
                沒有符合的問題分類，可以查看下方資源。
              </Text>
            )}
          </Box>

          <Box as="section" aria-labelledby="recommendations-heading" mt="21px">
            <Flex align="flex-start" justify="space-between" gap="10px" px="2px">
              <Box>
                <HStack spacing="7px">
                  <Icon as={Sparkles} boxSize="16px" color="brand.600" />
                  <Text id="recommendations-heading" as="h2" color="navy.800" fontSize="16px" fontWeight="800">
                    資源與申請資訊
                  </Text>
                </HStack>
                <Text mt="5px" color="#718593" fontSize="10.5px" lineHeight="1.55">
                  查看服務內容、準備資料與洽詢窗口。
                </Text>
              </Box>
              <Badge flexShrink={0} px="8px" py="4px" borderRadius="full" bg="brand.50" color="brand.700" fontSize="9px">
                資源總覽
              </Badge>
            </Flex>

            {filteredResources.length > 0 ? (
              <Surface mt="12px" overflow="hidden" boxShadow="0 7px 22px rgba(20,50,74,.07)">
                {filteredResources.map((resource, index) => {
                  const detail = actualDetail(resource);
                  const status = statusVisuals[resource.tone] ?? statusVisuals.orange;
                  return (
                    <Button
                      key={resource.programId}
                      variant="unstyled"
                      display="flex"
                      w="full"
                      h="auto"
                      minH="73px"
                      px="13px"
                      py="11px"
                      textAlign="left"
                      whiteSpace="normal"
                      borderTop={index === 0 ? "none" : "1px solid #E8EFF1"}
                      borderRadius="0"
                      onClick={() => setSelectedResource(resource)}
                      aria-label={`查看${resource.title}詳情，${resource.agency}，${resource.status}`}
                      _hover={{ bg: "#F7FBFC" }}
                      _active={{ bg: "#EFF7F8" }}
                      _focusVisible={{ outline: "none", boxShadow: "inset 0 0 0 3px rgba(18,183,167,.28)" }}
                    >
                      <Flex w="full" minW={0} align="center" gap="11px">
                        <Circle size="40px" flexShrink={0} bg={detail.iconBg} color={detail.iconColor}>
                          <Icon as={detail.icon} boxSize="22px" strokeWidth={2.2} />
                        </Circle>
                        <Box minW={0} flex="1">
                          <Text color="navy.800" fontSize="13px" fontWeight="800" lineHeight="1.4" noOfLines={1}>
                            {resource.title}
                          </Text>
                          <HStack mt="5px" spacing="7px">
                            <HStack minW={0} spacing="4px" color="#718593">
                              <Icon as={Landmark} boxSize="11px" flexShrink={0} />
                              <Text fontSize="10px" fontWeight="600" noOfLines={1}>
                                {resource.agency}
                              </Text>
                            </HStack>
                            <Badge
                              flexShrink={0}
                              px="6px"
                              py="2px"
                              border="1px solid"
                              borderColor={status.border}
                              borderRadius="full"
                              bg={status.bg}
                              color={status.color}
                              fontSize="8.5px"
                              lineHeight="1.2"
                            >
                              {resource.status}
                            </Badge>
                          </HStack>
                        </Box>
                        <Circle size="27px" flexShrink={0} bg="#F1F6F8" color="#537085">
                          <Icon as={ChevronRight} boxSize="16px" strokeWidth={2.2} />
                        </Circle>
                      </Flex>
                    </Button>
                  );
                })}
              </Surface>
            ) : (
              <Surface mt="12px" py="28px" px="18px" textAlign="center">
                <Circle mx="auto" size="39px" bg="#EEF5F7" color="#648092">
                  <Icon as={Search} boxSize="19px" />
                </Circle>
                <Text mt="9px" color="navy.700" fontSize="12.5px" fontWeight="700">
                  {normalizedQuery ? "找不到符合的資源" : "目前尚無資源"}
                </Text>
                <Text mt="3px" color="#80919C" fontSize="10.5px">
                  {normalizedQuery ? "換個關鍵字，或從上方分類開始提問。" : "可以從上方分類提問，讓學伴協助整理需求。"}
                </Text>
              </Surface>
            )}
          </Box>
        </Box>
      </StudentShell>

      <ChatHistoryDrawer isOpen={historyDrawer.isOpen} onClose={historyDrawer.onClose} />
      <ResourceDetailsModal resource={selectedResource} onClose={() => {setSelectedResource(null);if(selectedId){const next=new URLSearchParams(params);next.delete("resource");setParams(next,{replace:true});}}} />
    </>
  );
}
