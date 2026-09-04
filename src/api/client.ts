const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as
      | { error?: { code?: string; message?: string } }
      | null;
    throw new ApiError(
      payload?.error?.message ?? "目前無法連線，請稍後再試。",
      response.status,
      payload?.error?.code,
    );
  }

  return response.json() as Promise<T>;
}
