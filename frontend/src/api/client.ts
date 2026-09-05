import type { SessionView, SessionResponseView } from "@/types/view";
import type {
  ApiErrorCodeWire,
  ApiErrorDetailsWire,
  FieldErrorWire,
  RuntimeModeWire,
  UsageWire,
} from "@/types/wire";

export const DEFAULT_API_BASE_URL = "/api/v1";
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
export const DEFAULT_UPLOAD_TIMEOUT_MS = 30_000;
export const DEFAULT_AGENT_TIMEOUT_MS = 45_000;

const SESSION_TOKEN_KEY = "futureai.demo.session-token.v1";

function normalizeApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_API_BASE_URL;
  return trimmed.replace(/\/+$/, "") || DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export function resolveApiUrl(path: string): string {
  if (/^(?:[a-z]+:)?\/\//i.test(path)) {
    throw new TypeError("API paths must be relative to the configured API base URL.");
  }
  const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `${API_BASE_URL}${normalizedPath}`;
}

export function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

let memoryToken: string | null = null;
let tokenWasHydrated = false;
let memorySession: SessionView | null = null;
let sessionGeneration = 0;
const sessionCleanupListeners = new Set<() => void>();

function notifySessionCleanup(): void {
  for (const listener of sessionCleanupListeners) {
    try {
      listener();
    } catch {
      // Session clearing must not be blocked by a consumer cleanup failure.
    }
  }
}

export function registerApiSessionCleanup(listener: () => void): () => void {
  sessionCleanupListeners.add(listener);
  return () => sessionCleanupListeners.delete(listener);
}

function browserSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function hydrateToken(): void {
  if (tokenWasHydrated) return;
  tokenWasHydrated = true;
  memoryToken = browserSessionStorage()?.getItem(SESSION_TOKEN_KEY) || null;
}

export const apiSession = {
  getGeneration(): number { return sessionGeneration; },
  getToken(): string | null {
    hydrateToken();
    return memoryToken;
  },

  getSession(): SessionView | null {
    return memorySession;
  },

  setToken(token: string): void {
    const normalized = token.trim();
    if (!normalized) throw new TypeError("Session token cannot be empty.");
    hydrateToken();
    if (memoryToken !== normalized) sessionGeneration += 1;
    if (memoryToken !== null && memoryToken !== normalized) {
      memorySession = null;
      notifySessionCleanup();
    }
    tokenWasHydrated = true;
    memoryToken = normalized;
    try {
      browserSessionStorage()?.setItem(SESSION_TOKEN_KEY, normalized);
    } catch {
      // An in-memory token is still valid when browser storage is unavailable.
    }
  },

  setAuthenticatedSession(session: SessionResponseView): void {
    this.setToken(session.accessToken);
    memorySession = {
      expiresAt: session.expiresAt,
      runtimeMode: session.runtimeMode,
      session: session.session,
    };
  },

  setSession(session: SessionView): void {
    memorySession = session;
  },

  clear(): void {
    sessionGeneration += 1;
    notifySessionCleanup();
    tokenWasHydrated = true;
    memoryToken = null;
    memorySession = null;
    try {
      browserSessionStorage()?.removeItem(SESSION_TOKEN_KEY);
    } catch {
      // The in-memory state is already clear.
    }
  },
};

export type ClientErrorCode =
  | ApiErrorCodeWire
  | "HTTP_ERROR"
  | "NETWORK_ERROR"
  | "REQUEST_ABORTED"
  | "INVALID_RESPONSE";

interface ApiErrorOptions {
  requestId?: string | null;
  retryable?: boolean;
  runtimeMode?: RuntimeModeWire | null;
  details?: ApiErrorDetailsWire;
  retryAfterSeconds?: number | null;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly requestId: string | null;
  readonly retryable: boolean;
  readonly runtimeMode: RuntimeModeWire | null;
  readonly details?: ApiErrorDetailsWire;
  readonly retryAfterSeconds: number | null;
  readonly usage?: UsageWire;

  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ClientErrorCode | string = "HTTP_ERROR",
    options: ApiErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ApiError";
    this.requestId = options.requestId ?? null;
    this.retryable = options.retryable ?? false;
    this.runtimeMode = options.runtimeMode ?? null;
    this.details = options.details;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.usage = options.details?.usage;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "headers" | "signal"> {
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Session exchange is the only API call that should set this to false. */
  auth?: boolean;
}

export interface ApiBinaryResponse {
  blob: Blob;
  contentType: string | null;
  contentLength: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRuntimeMode(value: unknown): value is RuntimeModeWire {
  return value === "live" || value === "offline_demo";
}

function isUsageWire(value: unknown): value is UsageWire {
  if (!isRecord(value)) return false;
  return (
    value.period === "day" &&
    typeof value.limit === "number" &&
    typeof value.used === "number" &&
    typeof value.reserved === "number" &&
    typeof value.remaining === "number" &&
    typeof value.reset_at === "string"
  );
}

function readFieldErrors(value: unknown): FieldErrorWire[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const fields = value.flatMap((item): FieldErrorWire[] => {
    if (!isRecord(item)) return [];
    if (
      typeof item.field !== "string" ||
      typeof item.code !== "string" ||
      typeof item.message !== "string"
    ) {
      return [];
    }
    return [{ field: item.field, code: item.code, message: item.message }];
  });
  return fields.length ? fields : undefined;
}

function readErrorDetails(value: unknown): ApiErrorDetailsWire | undefined {
  if (!isRecord(value)) return undefined;
  const fields = readFieldErrors(value.fields);
  const usage = isUsageWire(value.usage) ? value.usage : undefined;
  const retryAfterSeconds =
    typeof value.retry_after_seconds === "number" ? value.retry_after_seconds : undefined;
  if (!fields && !usage && retryAfterSeconds === undefined) return undefined;
  return {
    ...(fields ? { fields } : {}),
    ...(usage ? { usage } : {}),
    ...(retryAfterSeconds === undefined ? {} : { retry_after_seconds: retryAfterSeconds }),
  };
}

function pydanticFieldErrors(detail: unknown): FieldErrorWire[] | undefined {
  if (!Array.isArray(detail)) return undefined;
  const fields = detail.flatMap((item): FieldErrorWire[] => {
    if (!isRecord(item)) return [];
    const location = Array.isArray(item.loc)
      ? item.loc.filter((part) => typeof part === "string" || typeof part === "number").join(".")
      : "request";
    return [
      {
        field: location || "request",
        code: typeof item.type === "string" ? item.type : "invalid",
        message: typeof item.msg === "string" ? item.msg : "Invalid value.",
      },
    ];
  });
  return fields.length ? fields : undefined;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - Date.now()) / 1_000)) : null;
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function responseError(response: Response): Promise<ApiError> {
  // Keep body failures observable so the enclosing request lifecycle can
  // classify a timeout, caller cancellation, or interrupted network stream.
  const text = await response.text();
  const payload = parseJson(text);
  const requestIdHeader = response.headers.get("X-Request-Id");
  const retryAfterHeader = parseRetryAfter(response.headers.get("Retry-After"));

  if (isRecord(payload) && isRecord(payload.error)) {
    const envelope = payload.error;
    const details = readErrorDetails(envelope.details);
    const retryAfterSeconds = details?.retry_after_seconds ?? retryAfterHeader;
    return new ApiError(
      typeof envelope.message === "string" ? envelope.message : "目前無法完成請求，請稍後再試。",
      response.status,
      typeof envelope.code === "string" ? envelope.code : "HTTP_ERROR",
      {
        requestId:
          typeof envelope.request_id === "string" ? envelope.request_id : requestIdHeader,
        retryable:
          typeof envelope.retryable === "boolean"
            ? envelope.retryable
            : response.status === 429 || response.status >= 500,
        runtimeMode: isRuntimeMode(envelope.runtime_mode) ? envelope.runtime_mode : null,
        details:
          retryAfterSeconds !== null && details?.retry_after_seconds === undefined
            ? { ...details, retry_after_seconds: retryAfterSeconds }
            : details,
        retryAfterSeconds,
      },
    );
  }

  if (isRecord(payload) && "detail" in payload) {
    const fields = pydanticFieldErrors(payload.detail);
    const message =
      typeof payload.detail === "string"
        ? payload.detail
        : fields
          ? "請檢查輸入欄位。"
          : "請求內容無法通過驗證。";
    const details: ApiErrorDetailsWire | undefined = fields ? { fields } : undefined;
    return new ApiError(message, response.status, "VALIDATION_ERROR", {
      requestId: requestIdHeader,
      retryable: false,
      details,
      retryAfterSeconds: retryAfterHeader,
    });
  }

  return new ApiError(
    "目前無法完成請求，請稍後再試。",
    response.status,
    "HTTP_ERROR",
    {
      requestId: requestIdHeader,
      retryable: response.status === 429 || response.status >= 500,
      retryAfterSeconds: retryAfterHeader,
    },
  );
}

function requestHeaders(options: ApiRequestOptions): Headers {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  if (options.body instanceof FormData) {
    // The browser must generate the multipart boundary.
    headers.delete("Content-Type");
  }

  if (options.auth !== false) {
    const token = apiSession.getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

type AbortKind = "caller" | "timeout" | null;

async function performRequest<T>(
  path: string,
  options: ApiRequestOptions,
  consumeResponse: (response: Response) => Promise<T>,
): Promise<T> {
  const requestSessionGeneration = apiSession.getGeneration();
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  let abortKind: AbortKind = null;
  const abortFromCaller = () => {
    if (abortKind !== null) return;
    abortKind = "caller";
    controller.abort(options.signal?.reason);
  };

  if (options.signal?.aborted) abortFromCaller();
  else options.signal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeoutId =
    timeoutMs > 0
      ? globalThis.setTimeout(() => {
          if (abortKind !== null) return;
          abortKind = "timeout";
          controller.abort();
        }, timeoutMs)
      : undefined;

  let response: Response | undefined;
  try {
    const { auth: _auth, timeoutMs: _timeoutMs, signal: _signal, ...requestInit } = options;
    response = await fetch(resolveApiUrl(path), {
      ...requestInit,
      headers: requestHeaders(options),
      signal: controller.signal,
    });

    if (!response.ok) throw await responseError(response);
    return await consumeResponse(response);
  } catch (cause) {
    let error: ApiError;
    if (cause instanceof ApiError) {
      error = cause;
    } else if (abortKind === "timeout") {
      error = new ApiError("請求逾時，請稍後再試。", 0, "REQUEST_TIMEOUT", {
        retryable: true,
        cause,
      });
    } else if (abortKind === "caller" || controller.signal.aborted || options.signal?.aborted) {
      error = new ApiError("請求已取消。", 0, "REQUEST_ABORTED", { cause });
    } else {
      error = new ApiError("目前無法連線，請檢查網路後再試。", 0, "NETWORK_ERROR", {
        retryable: true,
        cause,
      });
    }

    // Clear auth only after classifying this request. Session cleanup may abort
    // shared transports, but must not replace the original 401/body-read error.
    if (response?.status === 401 && options.auth !== false && requestSessionGeneration === apiSession.getGeneration()) apiSession.clear();
    throw error;
  } finally {
    if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  return performRequest(path, options, async (response) => {
    if (
      response.status === 204 ||
      response.status === 205 ||
      response.headers.get("Content-Length") === "0"
    ) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text.trim()) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch (cause) {
      throw new ApiError("API 回應不是有效的 JSON。", response.status, "INVALID_RESPONSE", {
        requestId: response.headers.get("X-Request-Id"),
        cause,
      });
    }
  });
}

export async function apiJsonRequest<TResponse, TBody = never>(
  path: string,
  options: Omit<ApiRequestOptions, "body"> & { body?: TBody } = {},
): Promise<TResponse> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;
  if (hasBody) headers.set("Content-Type", "application/json");
  return apiRequest<TResponse>(path, {
    ...options,
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });
}

export async function apiFormRequest<TResponse>(
  path: string,
  formData: FormData,
  options: Omit<ApiRequestOptions, "body"> = {},
): Promise<TResponse> {
  const headers = new Headers(options.headers);
  headers.delete("Content-Type");
  return apiRequest<TResponse>(path, { ...options, headers, body: formData });
}

export async function apiBinaryRequest(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiBinaryResponse> {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "image/*");
  return performRequest(path, { ...options, headers }, async (response) => {
    const contentLengthHeader = response.headers.get("Content-Length");
    const contentLength = contentLengthHeader === null ? null : Number(contentLengthHeader);
    return {
      blob: await response.blob(),
      contentType: response.headers.get("Content-Type"),
      contentLength: Number.isFinite(contentLength) ? contentLength : null,
    };
  });
}
