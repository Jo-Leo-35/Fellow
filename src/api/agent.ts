import { adaptAgentChat, toAgentChatRequestWire } from "./adapters";
import {
  ApiError,
  apiJsonRequest,
  DEFAULT_AGENT_TIMEOUT_MS,
  registerApiSessionCleanup,
  type ApiRequestOptions,
} from "./client";
import type { AgentChatInput, AgentChatView } from "@/types/view";
import type { AgentChatRequestWire, AgentChatResponseWire } from "@/types/wire";

type AgentRequestControl = Pick<ApiRequestOptions, "signal" | "timeoutMs">;

export interface AgentChatOptions {
  /** Required by the server. Reuse this value when retrying the same action. */
  idempotencyKey: string;
  /** Stable UI action id used to share in-flight and completed navigation results. */
  submissionId?: string;
  /** Cancels only this consumer; use cancelSubmission() to cancel the shared action. */
  signal?: AbortSignal;
  /** Sets the shared transport timeout when this call creates the submission. */
  timeoutMs?: number;
}

export interface AgentSubmission {
  submissionId: string;
  idempotencyKey: string;
  input: AgentChatInput;
}

interface SubmissionEntry {
  fingerprint: string;
  transportController: AbortController;
  promise: Promise<AgentChatView>;
  state: "pending" | "fulfilled" | "rejected";
}

const submissions = new Map<string, SubmissionEntry>();
const MAX_RETAINED_SUBMISSIONS = 100;

function cancelAllAgentSubmissions(): void {
  const entries = new Set(submissions.values());
  submissions.clear();
  for (const entry of entries) {
    if (entry.state === "pending") entry.transportController.abort();
  }
}

registerApiSessionCleanup(cancelAllAgentSubmissions);

function secureId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Secure random identifiers are unavailable in this browser.");
}

export function createAgentSubmission(input: AgentChatInput): AgentSubmission {
  return {
    submissionId: `submission_${secureId()}`,
    idempotencyKey: secureId(),
    input: { ...input, attachmentIds: [...input.attachmentIds] },
  };
}

function fingerprint(wire: AgentChatRequestWire): string {
  return JSON.stringify({
    user_id: wire.user_id,
    conversation_id: wire.conversation_id,
    mode: wire.mode,
    message: wire.message,
    attachment_ids: wire.attachment_ids,
    category: wire.category ?? null,
    topic: wire.topic ?? null,
  });
}

function pruneCompletedSubmissions(retainedKey: string): void {
  if (submissions.size <= MAX_RETAINED_SUBMISSIONS) return;
  for (const [key, entry] of submissions) {
    if (submissions.size <= MAX_RETAINED_SUBMISSIONS) return;
    if (key !== retainedKey && entry.state === "fulfilled") submissions.delete(key);
  }
}

function subscriberAbortError(): ApiError {
  return new ApiError("請求已取消。", 0, "REQUEST_ABORTED");
}

function subscribeToSubmission(
  entry: SubmissionEntry,
  signal?: AbortSignal,
): Promise<AgentChatView> {
  if (!signal) return entry.promise;
  if (signal.aborted) return Promise.reject(subscriberAbortError());

  return new Promise<AgentChatView>((resolve, reject) => {
    let subscriberSettled = false;
    const cleanup = () => signal.removeEventListener("abort", abortSubscriber);
    const abortSubscriber = () => {
      if (subscriberSettled) return;
      subscriberSettled = true;
      cleanup();
      reject(subscriberAbortError());
    };

    signal.addEventListener("abort", abortSubscriber, { once: true });
    entry.promise.then(
      (value) => {
        if (subscriberSettled) return;
        subscriberSettled = true;
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        if (subscriberSettled) return;
        subscriberSettled = true;
        cleanup();
        reject(error);
      },
    );
  });
}

function sendChat(
  path: "/agent/chat" | "/chat",
  input: AgentChatInput,
  options: AgentChatOptions,
): Promise<AgentChatView> {
  const idempotencyKey = options.idempotencyKey.trim();
  if (!idempotencyKey || idempotencyKey.length > 128) {
    throw new TypeError("idempotencyKey must contain 1 to 128 characters.");
  }

  const body = toAgentChatRequestWire(input);
  const requestFingerprint = fingerprint(body);
  const registryKey = options.submissionId?.trim() || idempotencyKey;
  const existing = submissions.get(registryKey);
  if (existing) {
    if (existing.fingerprint !== requestFingerprint) {
      throw new ApiError(
        "同一個 submission/idempotency key 不可用於不同訊息。",
        409,
        "IDEMPOTENCY_CONFLICT",
      );
    }
    return subscribeToSubmission(existing, options.signal);
  }

  if (options.signal?.aborted) return Promise.reject(subscriberAbortError());

  const headers = new Headers({ "Idempotency-Key": idempotencyKey });
  const transportController = new AbortController();
  let entry: SubmissionEntry;
  const promise = apiJsonRequest<AgentChatResponseWire, AgentChatRequestWire>(path, {
    method: "POST",
    body,
    headers,
    signal: transportController.signal,
    timeoutMs: options.timeoutMs ?? DEFAULT_AGENT_TIMEOUT_MS,
  })
    .then(adaptAgentChat)
    .then((result) => {
      entry.state = "fulfilled";
      pruneCompletedSubmissions(registryKey);
      return result;
    })
    .catch((error: unknown) => {
      entry.state = "rejected";
      if (submissions.get(registryKey) === entry) submissions.delete(registryKey);
      throw error;
    });
  entry = {
    fingerprint: requestFingerprint,
    transportController,
    promise,
    state: "pending",
  };
  submissions.set(registryKey, entry);
  pruneCompletedSubmissions(registryKey);
  return subscribeToSubmission(entry, options.signal);
}

export function getAgentSubmission(
  submissionId: string,
  signal?: AbortSignal,
): Promise<AgentChatView> | undefined {
  const entry = submissions.get(submissionId);
  return entry ? subscribeToSubmission(entry, signal) : undefined;
}

export function clearAgentSubmission(submissionId: string): void {
  submissions.delete(submissionId);
}

/** Explicitly cancel the shared transport for one complete user action. */
export function cancelAgentSubmission(submissionId: string): boolean {
  const entry = submissions.get(submissionId);
  if (!entry) return false;
  submissions.delete(submissionId);
  if (entry.state === "pending") entry.transportController.abort();
  return true;
}

export const agentApi = {
  chat: (input: AgentChatInput, options: AgentChatOptions) =>
    sendChat("/agent/chat", input, options),
  submit: (submission: AgentSubmission, control: AgentRequestControl = {}) =>
    sendChat("/agent/chat", submission.input, {
      ...control,
      submissionId: submission.submissionId,
      idempotencyKey: submission.idempotencyKey,
    }),
  /** Compatibility route only; new UI wiring should call chat(). */
  chatCompatible: (input: AgentChatInput, options: AgentChatOptions) =>
    sendChat("/chat", input, options),
  createSubmission: createAgentSubmission,
  getSubmission: getAgentSubmission,
  clearSubmission: clearAgentSubmission,
  cancelSubmission: cancelAgentSubmission,
};
