import {
  adaptLearningMaterialList,
  adaptResourceList,
  adaptResourceProgram,
} from "./adapters";
import { apiJsonRequest, encodePathSegment, type ApiRequestOptions } from "./client";
import type {
  LearningMaterialListView,
  ResourceListView,
  ResourceRecommendationView,
} from "@/types/view";
import type {
  LearningMaterialListWire,
  ResourceCategoryWire,
  ResourceListWire,
  ResourceProgramWire,
} from "@/types/wire";

type RequestControl = Pick<ApiRequestOptions, "signal" | "timeoutMs">;

export interface ResourceListOptions extends RequestControl {
  category?: ResourceCategoryWire;
  recommendedOnly?: boolean;
}

async function listResources(options: ResourceListOptions = {}): Promise<ResourceListView> {
  const query = new URLSearchParams();
  if (options.category !== undefined) query.set("category", options.category);
  if (options.recommendedOnly !== undefined) {
    query.set("recommended_only", String(options.recommendedOnly));
  }
  const suffix = query.size ? `?${query}` : "";
  const wire = await apiJsonRequest<ResourceListWire>(`/resources${suffix}`, {
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  });
  return adaptResourceList(wire);
}

async function getResource(
  programId: string,
  control: RequestControl = {},
): Promise<ResourceRecommendationView> {
  const wire = await apiJsonRequest<ResourceProgramWire>(
    `/resources/${encodePathSegment(programId)}`,
    control,
  );
  return adaptResourceProgram(wire);
}

async function listLearningMaterials(
  control: RequestControl = {},
): Promise<LearningMaterialListView> {
  const wire = await apiJsonRequest<LearningMaterialListWire>("/learning/materials", control);
  return adaptLearningMaterialList(wire);
}

export const resourcesApi = {
  list: listResources,
  getDetail: getResource,
};

export const learningApi = { listMaterials: listLearningMaterials };
