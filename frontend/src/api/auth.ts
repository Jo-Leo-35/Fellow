import { adaptSession, adaptSessionResponse, adaptUsage } from "./adapters";
import { apiJsonRequest, apiSession, type ApiRequestOptions } from "./client";
import type { DemoSessionInput, SessionResponseView, SessionView, UsageView } from "@/types/view";
import type {
  DemoSessionRequestWire,
  SessionCheckWire,
  SessionResponseWire,
  UsageWire,
} from "@/types/wire";

type RequestControl = Pick<ApiRequestOptions, "signal" | "timeoutMs">;

async function createDemoSession(
  input: DemoSessionInput,
  control: RequestControl = {},
): Promise<SessionResponseView> {
  const body: DemoSessionRequestWire = {};
  if (input.accessCode !== undefined) body.access_code = input.accessCode;
  if (input.role !== undefined) body.role = input.role;
  const wire = await apiJsonRequest<SessionResponseWire, DemoSessionRequestWire>(
    "/auth/demo/session",
    { method: "POST", body, auth: false, ...control },
  );
  const session = adaptSessionResponse(wire);
  apiSession.setAuthenticatedSession(session);
  return session;
}

async function getSession(control: RequestControl = {}): Promise<SessionView> {
  const generation = apiSession.getGeneration();
  const wire = await apiJsonRequest<SessionCheckWire>("/auth/session", control);
  const session = adaptSession(wire);
  if (generation === apiSession.getGeneration()) apiSession.setSession(session);
  return session;
}

async function getUsage(control: RequestControl = {}): Promise<UsageView> {
  return adaptUsage(await apiJsonRequest<UsageWire>("/usage", control));
}

export const authApi = {
  createDemoSession,
  getSession,
  clearSession: () => apiSession.clear(),
};

export const usageApi = { get: getUsage };
