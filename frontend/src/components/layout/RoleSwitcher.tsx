import { Button, HStack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "@/api/runtime";

const roleLinks = [
  { label: "學生端", href: "/index.html", role: "student" },
  { label: "教師端", href: "/teacher.html", role: "teacher" },
  { label: "政府端", href: "/government.html", role: "government" },
];

export function RoleSwitcher({ showLogout = false }: { showLogout?: boolean }) {
  const { identity, session, logout } = useAuth();

  return (
    <HStack as="nav" aria-label="切換使用介面" spacing="4px" flexWrap="wrap">
      {showLogout && session.runtimeMode === "live" && (
        <Button size="xs" variant="ghost" onClick={logout}>登出</Button>
      )}
      {roleLinks.map((role) => {
        const selected = role.role === identity.role;
        return (
          <Button
            key={role.href}
            as={RouterLink}
            to={role.href}
            onClick={() => { if (!selected) logout(); }}
            size="xs"
            h="29px"
            px="9px"
            variant="ghost"
            aria-current={selected ? "page" : undefined}
            bg={selected ? "brand.50" : "transparent"}
            color={selected ? "brand.700" : "#688293"}
            fontWeight={selected ? 700 : 500}
            _hover={{ bg: "brand.50", color: "brand.700" }}
          >
            {role.label}
          </Button>
        );
      })}
    </HStack>
  );
}
