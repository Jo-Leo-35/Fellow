import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  Icon,
  IconButton,
  Text,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { ArrowUpRight, Menu, type LucideIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "@/api/runtime";
import { Brand } from "@/components/ui/Brand";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";

export interface DashboardNavItem {
  label: string;
  icon: LucideIcon;
  id?: string;
}
export interface DashboardShellProps {
  edition: string;
  title: string;
  ownerName: string;
  ownerDetail: string;
  items: DashboardNavItem[];
  children: ReactNode;
  activeItem?: string;
  onNavigate?: (id: string) => void;
  subtitle?: string;
  actions?: ReactNode;
  ownerImage?: string;
}

export function DashboardShell({
  edition,
  title,
  ownerName,
  ownerDetail,
  items,
  children,
  activeItem,
  onNavigate,
  subtitle = "從學習與需求訊號，找到下一步可以提供的支持。",
  actions,
  ownerImage,
}: DashboardShellProps) {
  const {identity:sessionIdentity}=useAuth();
  ownerName=sessionIdentity.displayName; ownerDetail=sessionIdentity.scopeLabel??"";
  const menu = useDisclosure();
  const menuRef = useRef<HTMLButtonElement>(null);
  const currentItem = activeItem ?? items[0]?.id ?? items[0]?.label;
  const navigation = (
    <VStack
      as="nav"
      aria-label={`${edition}導覽`}
      align="stretch"
      spacing="6px"
    >
      {items.map((item) => {
        const id = item.id ?? item.label;
        const selected = currentItem === id;
        return (
          <Button
            key={id}
            variant="ghost"
            justifyContent="flex-start"
            minH="44px"
            h="auto"
            px="14px"
            py="12px"
            borderRadius="11px"
            color={selected ? "white" : "#B9CFDD"}
            fontWeight={selected ? 700 : 500}
            bg={selected ? "rgba(85,153,186,.24)" : "transparent"}
            fontSize="14px"
            leftIcon={
              <Icon
                as={item.icon}
                boxSize="18px"
                color={selected ? "#47DDCC" : "#A7C1D1"}
              />
            }
            aria-current={selected ? "page" : undefined}
            _hover={{ bg: "whiteAlpha.150", color: "white" }}
            _focusVisible={{
              outline: "2px solid #47DDCC",
              outlineOffset: "2px",
            }}
            onClick={() => {
              onNavigate?.(id);
              menu.onClose();
            }}
          >
            {item.label}
          </Button>
        );
      })}
    </VStack>
  );
  const identity = (
    <HStack spacing="11px" px="6px">
      <Avatar
        size="sm"
        name={ownerName}
        src={ownerImage}
        bg="#B8DAD9"
        color="navy.800"
      />
      <Box minW={0}>
        <Text color="white" fontSize="13px" fontWeight="700" noOfLines={1}>
          {ownerName}
        </Text>
        <Text fontSize="11px" color="#ADC4D4" mt="3px" noOfLines={1}>
          {ownerDetail}
        </Text>
      </Box>
    </HStack>
  );
  return (
    <Flex minH="100dvh" maxW="100vw" bg="#F5FAFC">
      <Flex
        as="aside"
        display={{ base: "none", lg: "flex" }}
        direction="column"
        position="fixed"
        insetY={0}
        left={0}
        w="232px"
        bg="linear-gradient(180deg, #102F49 0%, #092339 100%)"
        color="white"
        px="18px"
        py="28px"
        zIndex={20}
        overflowY="auto"
      >
        <Box px="8px" mb="34px">
          <Brand edition={edition} inverse />
        </Box>
        {navigation}
        <Box mt="auto" pt="36px">
          <Box
            px="12px"
            py="14px"
            borderRadius="12px"
            bg="rgba(103,183,192,.08)"
            mb="20px"
          >
            <Text fontSize="11px" color="#8EB8C8" mb="6px">
              學伴，讓每一份需要被看見
            </Text>
            <Button
              as={RouterLink}
              to="/index.html"
              variant="link"
              color="#C4E8E7"
              fontSize="12px"
              rightIcon={<ArrowUpRight size={14} />}
            >
              前往學生學習空間
            </Button>
          </Box>
          <Divider borderColor="whiteAlpha.200" mb="18px" />
          {identity}
        </Box>
      </Flex>

      <Box flex="1" ml={{ base: 0, lg: "232px" }} minW={0}>
        <Flex
          as="header"
          h={{ base: "64px", lg: "58px" }}
          px={{ base: "16px", md: "24px", xl: "32px" }}
          align="center"
          justify="space-between"
          bg="white"
          borderBottom="1px solid #E4EEF2"
          gap="10px"
        >
          <HStack spacing="8px" minW={0}>
            <IconButton
              ref={menuRef}
              display={{ base: "inline-flex", lg: "none" }}
              aria-label="開啟選單"
              icon={<Menu size={21} />}
              variant="ghost"
              color="navy.700"
              onClick={menu.onOpen}
            />
            <Box display={{ base: "none", sm: "block", lg: "none" }}>
              <Brand edition={edition} />
            </Box>
            <Text
              display={{ base: "block", sm: "none", lg: "block" }}
              color="#6A8292"
              fontSize="12px"
              fontWeight="500"
            >
              {edition}工作台
            </Text>
          </HStack>
          <RoleSwitcher showLogout />
        </Flex>
        <Box
          as="main"
          maxW="1600px"
          mx="auto"
          px={{ base: "16px", md: "24px", xl: "32px" }}
          py={{ base: "22px", md: "28px" }}
        >
          <Flex
            direction={{ base: "column", md: "row" }}
            align={{ base: "stretch", md: "flex-start" }}
            justify="space-between"
            gap="18px"
            mb="24px"
          >
            <Box minW={0}>
              <Text
                as="h1"
                fontSize={{ base: "25px", md: "28px" }}
                fontWeight="800"
                color="navy.700"
                lineHeight="1.5"
              >
                {title}
              </Text>
              <Text color="#6B8292" fontSize="13px" mt="5px" lineHeight="1.8">
                {subtitle}
              </Text>
            </Box>
            {actions && (
              <Box flexShrink={0} maxW="full">
                {actions}
              </Box>
            )}
          </Flex>
          {children}
        </Box>
      </Box>

      <Drawer
        isOpen={menu.isOpen}
        onClose={menu.onClose}
        placement="left"
        finalFocusRef={menuRef}
        size="xs"
      >
        <DrawerOverlay />
        <DrawerContent bg="#102F49" color="white">
          <DrawerCloseButton aria-label="關閉選單" />
          <DrawerHeader pt="28px" pb="24px" pr="45px">
            <Brand edition={edition} inverse />
          </DrawerHeader>
          <DrawerBody display="flex" flexDirection="column" px="18px" pb="24px">
            {navigation}
            <Box mt="auto" pt="32px">
              <Divider borderColor="whiteAlpha.200" mb="18px" />
              {identity}
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}
