import { Box, type BoxProps } from "@chakra-ui/react";

export function Surface(props: BoxProps) {
  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="#E3EDF1"
      borderRadius="16px"
      boxShadow="card"
      {...props}
    />
  );
}
