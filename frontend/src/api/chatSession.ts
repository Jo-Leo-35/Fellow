import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { agentApi, type AgentSubmission } from "./agent";
import { conversationsApi } from "./conversations";
import { uploadsApi } from "./uploads";
import { apiSession, registerApiSessionCleanup, ApiError } from "./client";
import { useAuth, useRefreshStudentData } from "./runtime";
import type { AgentChatInput, ConversationMessageView, AgentChatView } from "@/types/view";

const entries = new Map<string, AgentSubmission>();
registerApiSessionCleanup(() => entries.clear());
export const conversationHref = (id: string, mode: string) => `${mode === "resource" ? "/resource-chat.html" : "/learning-chat.html"}?conversation=${encodeURIComponent(id)}`;
export function useChatSession(input: Omit<AgentChatInput, "userId" | "conversationId" | "attachmentIds">) {
  const { identity } = useAuth();
  const [params] = useSearchParams(); const location = useLocation(); const navigate = useNavigate(); const cache = useQueryClient();
  const conversationId = params.get("conversation");
  const refresh = useRefreshStudentData();
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [pendingText, setPendingText] = useState("");
  const [completedSubmission,setCompletedSubmission]=useState<string|null>(null);
  const uploadRetry=useRef<{message:string;file:File|null}|null>(null);
  const uploadControl=useRef<AbortController|null>(null);
  const working = useRef(false); const submission = useRef<AgentSubmission | null>(null); const mounted = useRef(true);
  const detail = useQuery({ queryKey: ["conversation", identity.userId, conversationId], queryFn: ({ signal }) => conversationsApi.getDetail(conversationId!, { signal }), enabled: Boolean(conversationId) });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; uploadControl.current?.abort(); }; }, []);
  async function execute(action: AgentSubmission) {
    if (working.current) return false; working.current = true; setBusy(true); setError(null); setPendingText(action.input.message); submission.current = action;
    const generation = apiSession.getGeneration();
    try {
      const result = await agentApi.submit(action);
      if (!mounted.current || generation !== apiSession.getGeneration()) return false;
      await refresh();
      await cache.invalidateQueries({ queryKey: ["conversation", identity.userId, result.conversationId] });
      if(!mounted.current || generation!==apiSession.getGeneration())return false;
      setPendingText(""); submission.current = null;setCompletedSubmission(action.submissionId);
      if (result.conversationId !== conversationId) navigate(conversationHref(result.conversationId, result.responseType === "resource_recommendation" ? "resource" : "learning"), { replace: true, state: { result } });
      return true;
    } catch (cause) { if (mounted.current && generation === apiSession.getGeneration()) setError(cause); if(cause instanceof ApiError&&cause.status===429)void cache.invalidateQueries({queryKey:["usage"]}); return false; }
    finally { working.current = false; if (mounted.current) setBusy(false); }
  }
  const entryKey = `${identity.userId}:${location.key}:${location.pathname}:${location.search}`;
  useEffect(() => {
    if (conversationId || identity.role !== "student") return;
    let action = entries.get(entryKey);
    if (!action) {
      action = agentApi.createSubmission({ ...input, userId: identity.userId, conversationId: null, attachmentIds: [] } as AgentChatInput);
      entries.set(entryKey, action);
    }
    void execute(action);
  }, [entryKey, conversationId]);
  async function send(message: string, file?: File | null) {
    if (working.current || (!message.trim() && !file)) return false;
    uploadRetry.current={message,file:file??null};
    setError(null); setBusy(true); working.current = true;
    const generation = apiSession.getGeneration();
    try {
      uploadControl.current=new AbortController();
      const attachment = file ? await uploadsApi.uploadImage(file,{signal:uploadControl.current.signal}) : null;
      if (generation !== apiSession.getGeneration() || !mounted.current) return false;
      const latest = detail.data?.messages.filter(message=>input.mode==='learning'?Boolean(message.learningAnswer):Boolean(message.resourceRecommendation)).at(-1);
      const context = input.mode==='learning' ? {...input,topic:latest?.learningAnswer?.animationTopic??input.topic} : {...input,category:latest?.resourceRecommendation?.category??input.category};
      const action = agentApi.createSubmission({ ...context, userId: identity.userId, conversationId, message: message.trim(), attachmentIds: attachment ? [attachment.attachmentId] : [] } as AgentChatInput);
      uploadRetry.current=null;working.current = false; return await execute(action);
    } catch (cause) { if(mounted.current&&generation===apiSession.getGeneration())setError(cause);return false; } finally { working.current = false; if (mounted.current) setBusy(false); }
  }
  return { conversationId, completedSubmission, messages: detail.data?.messages ?? [], detail: detail.data, busy: busy || detail.isFetching, error: error ?? detail.error, pendingText, send,
    retry: () => uploadRetry.current ? void send(uploadRetry.current.message,uploadRetry.current.file) : submission.current ? void execute(submission.current) : void detail.refetch(),
    cancel: () => { uploadControl.current?.abort(); if (submission.current) agentApi.cancelSubmission(submission.current.submissionId); },
  };
}
export function replyFromMessage(message: ConversationMessageView): Omit<AgentChatView, "usage" | "conversationId"> {
  return { ...message, responseType: message.responseType ?? "text" };
}
