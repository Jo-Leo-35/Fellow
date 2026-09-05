import {
  Avatar,
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Bell, BookOpenText, House, Menu, MessageCircleMore, UserRound } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import type { ReactNode } from "react";
import type { StudentNavKey } from "@/types";
import { useAlerts, useAuth, useUsage } from "@/api/runtime";
import { Brand } from "@/components/ui/Brand";

const navItems = [
  { key: "chat" as const, label: "聊天", icon: MessageCircleMore, href: "/index.html" },
  { key: "resources" as const, label: "資源", icon: House, href: "/resources.html" },
  { key: "alerts" as const, label: "通知", icon: Bell, href: "/alerts.html" },
  { key: "profile" as const, label: "我的", icon: UserRound, href: "/index.html?panel=profile" },
];

export interface StudentShellProps {
  children: ReactNode;
  active?: StudentNavKey;
  onMenu?: () => void;
  backHref?: string;
  showBottomNav?: boolean;
  contentPadding?: string | number;
  footer?: ReactNode;
}

export function StudentShell({
  children,
  active = "chat",
  onMenu,
  backHref,
  showBottomNav = true,
  contentPadding = 0,
  footer,
}: StudentShellProps) {
  const {identity,session,logout}=useAuth();const alerts=useAlerts();const usage=useUsage();
  return (
    <Flex minH="100dvh" justify="center" align="stretch" bg={{ base: "white", md: "#EDF5F7" }}>
      <Flex
        direction="column"
        position="relative"
        w="full"
        maxW={{ base: "none", md: "430px" }}
        h={{ base: "100dvh", md: "min(920px, calc(100dvh - 48px))" }}
        maxH={{ base: "100dvh", md: "920px" }}
        my={{ base: 0, md: "24px" }}
        overflow="hidden"
        bg="#F7FBFC"
        borderRadius={{ base: 0, md: "24px" }}
        border={{ base: "none", md: "1px solid #DCE9EE" }}
        boxShadow={{ base: "none", md: "0 18px 55px rgba(20,50,74,.14)" }}
      >
        <Flex
          as="header"
          h="64px"
          flexShrink={0}
          align="center"
          justify="space-between"
          px="16px"
          bg="white"
          borderBottom="1px solid"
          borderColor="#ECF2F4"
          zIndex={5}
        >
          {!backHref && !onMenu ? (
            <>
              <Brand />
              <Box position="relative" ml="auto">
                <IconButton aria-label="通知" as={RouterLink} to="/alerts.html" icon={<Bell size={20} />} variant="ghost" />
                {Boolean(alerts.data?.unreadCount) && <Box position="absolute" top="8px" right="9px" w="6px" h="6px" bg="critical" borderRadius="full" border="1px solid white" />}
              </Box>
            </>
          ) : (
            <>
              <IconButton
                aria-label={backHref ? "返回" : "開啟聊天紀錄"}
                as={backHref ? RouterLink : undefined}
                to={backHref}
                icon={backHref ? <Text fontSize="29px" lineHeight="1">‹</Text> : <Menu size={23} />}
                variant="ghost"
                color="navy.600"
                onClick={backHref ? undefined : onMenu}
              />
              <Brand />
              <HStack spacing="6px">
                {!backHref && (
                  <Box position="relative">
                    <IconButton aria-label="通知" as={RouterLink} to="/alerts.html" icon={<Bell size={20} />} variant="ghost" />
                    {Boolean(alerts.data?.unreadCount) && <Box position="absolute" top="8px" right="9px" w="6px" h="6px" bg="critical" borderRadius="full" border="1px solid white" />}
                  </Box>
                )}
                <Avatar size="xs" name={identity.displayName} bg="brand.100" color="navy.700" icon={<BookOpenText size={15} />} />
              </HStack>
            </>
          )}
        </Flex>

        <HStack px="14px" py="4px" bg="brand.50" justify="space-between"><Text fontSize="10px">{session.runtimeMode === "offline_demo" ? "AI 離線示範" : `AI 線上服務 · ${identity.displayName}${usage.data ? ` · 今日剩餘 ${usage.data.remaining}` : ""}`}</Text>{session.runtimeMode === "live" && <Text as="button" fontSize="10px" onClick={logout}>切換身分</Text>}</HStack>
        <Box as="main" flex="1" minH={0} overflowY="auto" className="soft-scrollbar" p={contentPadding}>
          {children}
        </Box>
        {footer}

        {showBottomNav && (
          <Flex
            as="nav"
            aria-label="學生功能"
            h="68px"
            flexShrink={0}
            align="center"
            justify="space-around"
            bg="white"
            borderTop="1px solid"
            borderColor="#E5EEF1"
            boxShadow="0 -6px 20px rgba(20,50,74,.04)"
            zIndex={4}
          >
            {navItems.map((item) => {
              const selected = active === item.key;
              return (
                <VStack
                  key={item.key}
                  as={RouterLink}
                  to={item.href}
                  spacing="2px"
                  minW="64px"
                  color={selected ? "brand.600" : "#6F8292"}
                  fontWeight={selected ? 700 : 500}
                  fontSize="11px"
                  position="relative"
                  aria-current={selected ? "page" : undefined}
                >
                  {selected && <Box position="absolute" top="-12px" w="28px" h="3px" bg="brand.500" borderRadius="full" />}
                  <Icon as={item.icon} boxSize="20px" strokeWidth={selected ? 2.6 : 2} />
                  <Text>{item.label}</Text>
                </VStack>
              );
            })}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}
