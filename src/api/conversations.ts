import { adaptConversationDetail, adaptConversationList } from "./adapters";
import {
  apiJsonRequest,
  apiRequest,
  encodePathSegment,
  type ApiRequestOptions,
} from "./client";
import type { ConversationDetailView, ConversationListView } from "@/types/view";
import type { ConversationDetailWire, ConversationListWire } from "@/types/wire";

type RequestControl = Pick<ApiRequestOptions, "signal" | "timeoutMs">;

export interface ConversationListOptions extends RequestControl {
  userId: string;
  limit?: number;
  cursor?: string;
}

async function listConversations(options: ConversationListOptions): Promise<ConversationListView> {
  const query = new URLSearchParams({ user_id: options.userId });
  if (options.limit !== undefined) query.set("limit", String(options.limit));
  if (options.cursor !== undefined) query.set("cursor", options.cursor);
  const wire = await apiJsonRequest<ConversationListWire>(`/conversations?${query}`, {
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  });
  return adaptConversationList(wire);
}

async function getConversation(
  conversationId: string,
  control: RequestControl = {},
): Promise<ConversationDetailView> {
  const wire = await apiJsonRequest<ConversationDetailWire>(
    `/conversations/${encodePathSegment(conversationId)}`,
    control,
  );
  return adaptConversationDetail(wire);
}

async function deleteConversation(
  conversationId: string,
  control: RequestControl = {},
): Promise<void> {
  await apiRequest<void>(`/conversations/${encodePathSegment(conversationId)}`, {
    method: "DELETE",
    ...control,
  });
}

export const conversationsApi = {
  list: listConversations,
  /** History reopen is read-only and must use this method, never Agent chat. */
  getDetail: getConversation,
  delete: deleteConversation,
};
