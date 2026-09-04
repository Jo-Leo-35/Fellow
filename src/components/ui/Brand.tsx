import { HStack, Icon, Text } from "@chakra-ui/react";
import { Sprout } from "lucide-react";

export interface BrandProps {
  edition?: string;
  inverse?: boolean;
}

export function Brand({ edition, inverse = false }: BrandProps) {
  const foreground = inverse ? "white" : "navy.700";
  return (
    <HStack spacing="8px" aria-label={`學伴${edition ? ` ${edition}` : ""}`}>
      <Icon as={Sprout} boxSize="23px" color={inverse ? "brand.300" : "brand.500"} strokeWidth={2.5} />
      <Text fontSize="18px" fontWeight="800" color={foreground} letterSpacing="0.02em">
        學伴
      </Text>
      {edition && <Text fontSize="13px" color={inverse ? "whiteAlpha.700" : "gray.500"}>{edition}</Text>}
    </HStack>
  );
}
