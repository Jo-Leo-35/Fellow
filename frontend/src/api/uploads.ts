import { adaptAttachment } from "./adapters";
import {
  ApiError,
  apiBinaryRequest,
  apiFormRequest,
  DEFAULT_UPLOAD_TIMEOUT_MS,
  encodePathSegment,
  type ApiBinaryResponse,
  type ApiRequestOptions,
} from "./client";
import type { AttachmentView } from "@/types/view";
import type { UploadResponseWire } from "@/types/wire";

type RequestControl = Pick<ApiRequestOptions, "signal" | "timeoutMs">;

const allowedImageTypes = new Set(["image/jpeg", "image/png"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

async function uploadImage(file: File, control: RequestControl = {}): Promise<AttachmentView> {
  if (!allowedImageTypes.has(file.type)) {
    throw new ApiError("只支援 JPEG 或 PNG 圖片。", 0, "UNSUPPORTED_MEDIA_TYPE");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError("圖片不可超過 5 MiB。", 0, "FILE_TOO_LARGE");
  }
  const formData = new FormData();
  formData.append("file", file);
  const wire = await apiFormRequest<UploadResponseWire>("/uploads", formData, {
    method: "POST",
    signal: control.signal,
    timeoutMs: control.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS,
  });
  return adaptAttachment(wire);
}

async function downloadContent(
  attachmentId: string,
  control: RequestControl = {},
): Promise<ApiBinaryResponse> {
  return apiBinaryRequest(`/uploads/${encodePathSegment(attachmentId)}/content`, {
    signal: control.signal,
    timeoutMs: control.timeoutMs,
    headers: { Accept: "image/*" },
  });
}

export const uploadsApi = {
  uploadImage,
  downloadContent,
};
