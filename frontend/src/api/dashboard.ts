import { adaptGovernmentDashboard, adaptTeacherDashboard } from "./adapters";
import { apiJsonRequest, type ApiRequestOptions } from "./client";
import type {
  GovernmentDashboardFiltersInput,
  GovernmentDashboardView,
  TeacherDashboardFiltersInput,
  TeacherDashboardView,
} from "@/types/view";
import type { GovernmentDashboardWire, TeacherDashboardWire } from "@/types/wire";

type RequestControl = Pick<ApiRequestOptions, "signal" | "timeoutMs">;

async function getTeacherDashboard(
  filters: TeacherDashboardFiltersInput = {},
  control: RequestControl = {},
): Promise<TeacherDashboardView> {
  const query = new URLSearchParams();
  if (filters.period !== undefined) query.set("period", filters.period);
  if (filters.classId !== undefined) query.set("class_id", filters.classId);
  if (filters.subject !== undefined) query.set("subject", filters.subject);
  if (filters.attentionThreshold !== undefined) {
    query.set("attention_threshold", String(filters.attentionThreshold));
  }
  const suffix = query.size ? `?${query}` : "";
  const wire = await apiJsonRequest<TeacherDashboardWire>(
    `/dashboard/teacher${suffix}`,
    control,
  );
  return adaptTeacherDashboard(wire);
}

async function getGovernmentDashboard(
  filters: GovernmentDashboardFiltersInput = {},
  control: RequestControl = {},
): Promise<GovernmentDashboardView> {
  const query = new URLSearchParams();
  if (filters.period !== undefined) query.set("period", filters.period);
  if (filters.region !== undefined) query.set("region", filters.region);
  if (filters.topic !== undefined) query.set("topic", filters.topic);
  const suffix = query.size ? `?${query}` : "";
  const wire = await apiJsonRequest<GovernmentDashboardWire>(
    `/dashboard/government${suffix}`,
    control,
  );
  return adaptGovernmentDashboard(wire);
}

export const dashboardApi = {
  teacher: getTeacherDashboard,
  government: getGovernmentDashboard,
};
