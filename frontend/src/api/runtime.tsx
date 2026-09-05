import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Center, FormControl, FormLabel, Heading, Input, Spinner, Text, VStack } from "@chakra-ui/react";
import { apiSession, registerApiSessionCleanup, ApiError } from "./client";
import { authApi, usageApi } from "./auth";
import { profileApi } from "./profile";
import { alertsApi } from "./alerts";
import { conversationsApi } from "./conversations";
import type { SessionView } from "@/types/view";

const AuthContext = createContext<{ session: SessionView | null; logout: () => void }>({ session: null, logout: () => {} });
export const roleHome = (role: string) => role === "teacher" ? "/teacher.html" : role === "government" ? "/government.html" : "/index.html";
export const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : "目前無法完成操作，請稍後重試。";
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value.session) throw new Error("Authenticated page requires a session");
  return { ...value, session: value.session, identity: value.session.session };
}
export function ApiState({ loading, error, retry }: { loading?: boolean; error?: unknown; retry?: () => void }) {
  if (loading) return <Center p="24px" role="status"><Spinner mr="10px" color="brand.500" />載入資料中…</Center>;
  if (error) return <Box role="alert" p="16px" bg="red.50" borderRadius="12px"><Text>{errorMessage(error)}</Text>{retry && <Button size="sm" mt="8px" onClick={retry}>重試</Button>}</Box>;
  return null;
}
export function SessionBoundary({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [token, setToken] = useState(apiSession.getToken);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [requiresCode, setRequiresCode] = useState(false);
  const [autoRetry, setAutoRetry] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const attemptedAutoRole = useRef<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const check = useQuery({ queryKey: ["session"], queryFn: ({ signal }) => authApi.getSession({ signal }), enabled: Boolean(token), retry: false });
  const session = token ? check.data ?? null : null;
  const logout = () => { attemptedAutoRole.current = null; apiSession.clear(); setCode(""); setRequiresCode(false); };
  useEffect(() => registerApiSessionCleanup(() => {
    void cache.cancelQueries(); cache.clear(); setToken(null); setEpoch(value => value + 1); setCode("");
  }), [cache]);
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(logout, Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session?.expiresAt]);
  const wantedRole = location.pathname.startsWith("/teacher") ? "teacher" : location.pathname.startsWith("/government") ? "government" : "student";
  const allowed = session && (session.session.role === wantedRole || (session.session.role === "teacher" && (location.pathname.startsWith("/learning-chat") || location.pathname === "/chat/learning")));
  useEffect(() => {
    if (token || requiresCode || attemptedAutoRole.current === wantedRole) return;
    attemptedAutoRole.current = wantedRole;
    setBusy(true); setError(null);
    void authApi.createDemoSession({ role: wantedRole }).then(result => {
      cache.setQueryData(["session"], result); setToken(result.accessToken);
    }).catch(cause => {
      if (cause instanceof ApiError && cause.code === "ACCESS_CODE_REQUIRED") setRequiresCode(true);
      else setError(cause);
    }).finally(() => setBusy(false));
  }, [autoRetry, cache, requiresCode, token, wantedRole]);
  async function login(event: React.FormEvent) {
    event.preventDefault(); if (busy || !code.trim()) return; setBusy(true); setError(null);
    try {
      const result = await authApi.createDemoSession({ accessCode: code.trim() });
      setCode(""); cache.setQueryData(["session"], result); setToken(result.accessToken);
      if (result.session.role !== wantedRole) navigate(roleHome(result.session.role), { replace: true });
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  }
  if (token && check.isPending) return <ApiState loading />;
  if (!token && !requiresCode) return <Center minH="100dvh" p="24px" bg="#F1F8F8"><VStack spacing="16px"><ApiState loading={busy && !error} error={error} /><Button display={error ? "inline-flex" : "none"} onClick={() => { attemptedAutoRole.current = null; setError(null); setAutoRetry(value => value + 1); }}>重試</Button></VStack></Center>;
  if (!allowed) return <Center minH="100dvh" p="24px" bg="#F1F8F8"><VStack as="form" onSubmit={login} align="stretch" spacing="18px" p="28px" bg="white" borderRadius="20px" maxW="420px" w="full" boxShadow="lg">
    <Heading fontSize="25px" color="navy.700">學伴 Demo</Heading>
    <Text color="gray.600">線上 AI 服務需要輸入存取碼，以開啟你的學習或工作空間。</Text>
    {session ? <><Text>目前以 {session.session.displayName} 登入，此頁需要其他角色。</Text><Button onClick={() => navigate(roleHome(session.session.role))}>回到我的空間</Button><Button variant="outline" onClick={logout}>切換身分</Button></> : <><FormControl><FormLabel>Demo 存取碼</FormLabel><Input type="password" autoComplete="off" value={code} onChange={event => setCode(event.target.value)} aria-label="Demo 存取碼" /></FormControl><Button type="submit" isLoading={busy} isDisabled={!code.trim()}>進入 Demo</Button><ApiState error={error ?? check.error} /></>}
  </VStack></Center>;
  return <AuthContext.Provider value={{ session, logout }}><Box key={`${session.session.userId}:${epoch}`}>{children}</Box></AuthContext.Provider>;
}
export function useProfile() { const { identity } = useAuth(); return useQuery({ queryKey: ["profile", identity.userId], queryFn: ({ signal }) => profileApi.get(identity.userId, { signal }), enabled: identity.role === "student" }); }
export function useUsage() { const { identity } = useAuth(); return useQuery({ queryKey: ["usage", identity.userId], queryFn: ({ signal }) => usageApi.get({ signal }) }); }
export function useAlerts() { const { identity } = useAuth(); return useQuery({ queryKey: ["alerts", identity.userId], queryFn: ({ signal }) => alertsApi.list({ userId: identity.userId, signal }), enabled: identity.role === "student" }); }
export function useHistory() { const { identity } = useAuth(); return useInfiniteQuery({ queryKey: ["conversations", identity.userId], queryFn: ({ signal, pageParam }) => conversationsApi.list({ userId: identity.userId, limit: 100, cursor:pageParam??undefined, signal }), initialPageParam:null as string|null, getNextPageParam: page=>page.nextCursor??undefined }); }
export function useRefreshStudentData() { const cache = useQueryClient(); return () => Promise.all(["usage", "conversations", "profile", "alerts", "resources", "teacher", "government"].map(key => cache.invalidateQueries({ queryKey: [key] }))); }
