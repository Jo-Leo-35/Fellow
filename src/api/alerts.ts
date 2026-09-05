import { adaptAlert, adaptAlertList } from "./adapters";
import { apiJsonRequest, apiRequest, encodePathSegment, type ApiRequestOptions } from "./client";
import type { AlertListView, AlertView } from "@/types/view";
import type { AlertListWire, AlertWire } from "@/types/wire";

type RequestControl = Pick<ApiRequestOptions, "signal" | "timeoutMs">;

export interface AlertListOptions extends RequestControl {
  userId: string;
  unreadOnly?: boolean;
}

async function listAlerts(options: AlertListOptions): Promise<AlertListView> {
  const query = new URLSearchParams({ user_id: options.userId });
  if (options.unreadOnly !== undefined) query.set("unread_only", String(options.unreadOnly));
  const wire = await apiJsonRequest<AlertListWire>(`/alerts?${query}`, {
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  });
  return adaptAlertList(wire);
}

async function markAlertRead(
  alertId: string,
  control: RequestControl = {},
): Promise<AlertView> {
  const wire = await apiRequest<AlertWire>(`/alerts/${encodePathSegment(alertId)}/read`, {
    method: "POST",
    ...control,
  });
  return adaptAlert(wire);
}

export const alertsApi = {
  list: listAlerts,
  markRead: markAlertRead,
};
