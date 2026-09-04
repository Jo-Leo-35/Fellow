import {
  Avatar,
  Box,
  Divider,
  Flex,
  HStack,
  Icon,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Menu, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "@/components/ui/Brand";

export interface DashboardNavItem { label: string; icon: LucideIcon; }

export interface DashboardShellProps {
  edition: string;
  title: string;
  ownerName: string;
  ownerDetail: string;
  items: DashboardNavItem[];
  children: ReactNode;
}

export function DashboardShell({ edition, title, ownerName, ownerDetail, items, children }: DashboardShellProps) {
  return (
    <Flex minH="100dvh" maxW="100vw" overflowX="hidden" bg="#F5FAFC">
      <Flex
        as="aside"
        display={{ base: "none", lg: "flex" }}
        direction="column"
        position="fixed"
        insetY={0}
        left={0}
        w="232px"
        bg="linear-gradient(180deg, #092B49 0%, #071F35 100%)"
        color="white"
        px="18px"
        py="24px"
      >
        <Box px="8px" mb="30px"><Brand edition={edition} inverse /></Box>
        <VStack align="stretch" spacing="7px">
          {items.map((item, index) => (
            <HStack
              key={item.label}
              px="13px"
              py="11px"
              borderRadius="10px"
              bg={index === 0 ? "whiteAlpha.150" : "transparent"}
              color={index === 0 ? "white" : "whiteAlpha.750"}
              fontWeight={index === 0 ? 700 : 500}
              cursor="pointer"
              _hover={{ bg: "whiteAlpha.100", color: "white" }}
            >
              <Icon as={item.icon} boxSize="18px" color={index === 0 ? "brand.300" : "whiteAlpha.700"} />
              <Text fontSize="14px">{item.label}</Text>
            </HStack>
          ))}
        </VStack>
        <Box mt="auto">
          <Divider borderColor="whiteAlpha.200" mb="18px" />
          <HStack px="6px" spacing="10px">
            <Avatar size="sm" name={ownerName} bg="whiteAlpha.300" color="white" />
            <Box minW={0}>
              <Text fontSize="14px" fontWeight="700" noOfLines={1}>{ownerName}</Text>
              <Text fontSize="11px" color="whiteAlpha.650" noOfLines={1}>{ownerDetail}</Text>
            </Box>
          </HStack>
        </Box>
      </Flex>

      <Box as="main" flex="1" ml={{ base: 0, lg: "232px" }} minW={0}>
        <Flex
          display={{ base: "flex", lg: "none" }}
          h="64px"
          px="18px"
          align="center"
          justify="space-between"
          bg="navy.800"
        >
          <IconButton aria-label="開啟選單" icon={<Menu />} variant="ghost" color="white" />
          <Brand edition={edition} inverse />
          <Box w="40px" />
        </Flex>
        <Box px={{ base: "16px", md: "24px", xl: "32px" }} py={{ base: "20px", md: "28px" }}>
          <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" gap="12px" mb="22px">
            <Box>
              <Text as="h1" fontSize={{ base: "24px", md: "28px" }} fontWeight="800" color="navy.700">{title}</Text>
              <Text color="gray.500" fontSize="13px" mt="3px">彙整最近的資料，快速掌握值得關注的變化</Text>
            </Box>
          </Flex>
          {children}
        </Box>
      </Box>
    </Flex>
  );
}
