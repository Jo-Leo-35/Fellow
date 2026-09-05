import {
  adaptMemoryItem,
  adaptProfile,
  toProfilePutRequestWire,
} from "./adapters";
import {
  apiJsonRequest,
  apiRequest,
  encodePathSegment,
  type ApiRequestOptions,
} from "./client";
import type { MemoryItemView, ProfileUpdateInput, ProfileView } from "@/types/view";
import type {
  MemoryConsentRequestWire,
  MemoryItemWire,
  ProfilePutRequestWire,
  ProfileWire,
} from "@/types/wire";

type RequestControl = Pick<ApiRequestOptions, "signal" | "timeoutMs">;

async function getProfile(userId: string, control: RequestControl = {}): Promise<ProfileView> {
  const wire = await apiJsonRequest<ProfileWire>(`/profile/${encodePathSegment(userId)}`, control);
  return adaptProfile(wire);
}

async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
  control: RequestControl = {},
): Promise<ProfileView> {
  const body: ProfilePutRequestWire = toProfilePutRequestWire(input);
  const wire = await apiJsonRequest<ProfileWire, ProfilePutRequestWire>(
    `/profile/${encodePathSegment(userId)}`,
    { method: "PUT", body, ...control },
  );
  return adaptProfile(wire);
}

async function acceptMemory(
  userId: string,
  suggestionId: string,
  control: RequestControl = {},
): Promise<MemoryItemView> {
  const body: MemoryConsentRequestWire = { suggestion_id: suggestionId, consent: true };
  const wire = await apiJsonRequest<MemoryItemWire, MemoryConsentRequestWire>(
    `/profile/${encodePathSegment(userId)}/memory`,
    { method: "POST", body, ...control },
  );
  return adaptMemoryItem(wire);
}

async function deleteMemory(
  userId: string,
  key: string,
  control: RequestControl = {},
): Promise<void> {
  await apiRequest<void>(
    `/profile/${encodePathSegment(userId)}/memory/${encodePathSegment(key)}`,
    { method: "DELETE", ...control },
  );
}

export const profileApi = {
  get: getProfile,
  update: updateProfile,
  acceptMemory,
  deleteMemory,
};
