import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { Center, ChakraProvider, ColorModeScript, Spinner } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { theme } from "@/theme";
import "@/styles.css";
import { SessionBoundary } from "@/api/runtime";

const StudentHomePage = lazy(() => import("@/pages/StudentHomePage"));
const LearningChatPage = lazy(() => import("@/pages/LearningChatPage"));
const ResourceChatPage = lazy(() => import("@/pages/ResourceChatPage"));
const ResourcesPage = lazy(() => import("@/pages/ResourcesPage"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const TeacherDashboardPage = lazy(() => import("@/pages/TeacherDashboardPage"));
const GovernmentDashboardPage = lazy(() => import("@/pages/GovernmentDashboardPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StudentHomePage />} />
      <Route path="/index.html" element={<StudentHomePage />} />
      <Route path="/chat" element={<StudentHomePage />} />
      <Route path="/learning-chat.html" element={<LearningChatPage />} />
      <Route path="/chat/learning" element={<LearningChatPage />} />
      <Route path="/resource-chat.html" element={<ResourceChatPage />} />
      <Route path="/chat/resource" element={<ResourceChatPage />} />
      <Route path="/resources.html" element={<ResourcesPage />} />
      <Route path="/resources" element={<ResourcesPage />} />
      <Route path="/alerts.html" element={<AlertsPage />} />
      <Route path="/alerts" element={<AlertsPage />} />
      <Route path="/teacher.html" element={<TeacherDashboardPage />} />
      <Route path="/teacher" element={<TeacherDashboardPage />} />
      <Route path="/government.html" element={<GovernmentDashboardPage />} />
      <Route path="/government" element={<GovernmentDashboardPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<Center minH="100dvh"><Spinner color="brand.500" /></Center>}>
            <SessionBoundary><AppRoutes /></SessionBoundary>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ChakraProvider>
  </React.StrictMode>,
);
