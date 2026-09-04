import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: "#E8FBF8",
      100: "#C9F3EE",
      200: "#94E6DC",
      300: "#5BD7CA",
      400: "#2AC6B7",
      500: "#12B7A7",
      600: "#0B978A",
      700: "#08796F",
      800: "#075D56",
      900: "#064B46",
    },
    navy: {
      50: "#EFF5F9",
      100: "#D9E6EE",
      500: "#14324A",
      700: "#0D2942",
      800: "#09243C",
      900: "#071F35",
    },
    learning: "#3B8EF3",
    warning: "#F6A63C",
    critical: "#EF5753",
    success: "#37B876",
  },
  fonts: {
    heading: "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif",
    body: "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif",
  },
  radii: {
    card: "16px",
  },
  shadows: {
    card: "0 8px 28px rgba(20, 50, 74, 0.08)",
    float: "0 14px 36px rgba(20, 50, 74, 0.14)",
  },
  styles: {
    global: {
      "html, body, #root": { minHeight: "100%" },
      body: { bg: "#EDF5F7", color: "navy.500" },
      "*": { WebkitTapHighlightColor: "transparent" },
      "::selection": { bg: "brand.100", color: "navy.900" },
    },
  },
  components: {
    Button: {
      baseStyle: { borderRadius: "12px", fontWeight: 700 },
      defaultProps: { colorScheme: "brand" },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: "16px",
          border: "1px solid",
          borderColor: "#E3EDF1",
          boxShadow: "card",
        },
      },
    },
    Input: {
      defaultProps: { focusBorderColor: "brand.500" },
    },
  },
});
