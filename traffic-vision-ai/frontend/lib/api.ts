import type {
  AuthResponse,
  DetectionResponse,
  LoginRequest,
  RegisterRequest,
} from "@/types";
import { clearAuth, getToken } from "@/lib/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type RawDetectedSign = {
  id?: number;
  sign_type?: string;
  signType?: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  description?: string;
};

type RawDetectionResponse = {
  id?: number;
  signs?: RawDetectedSign[];
  detectedSigns?: RawDetectedSign[];
  total_signs?: number;
  totalSigns?: number;
  processing_time_ms?: number;
  processingTimeMs?: number;
  model_version?: string;
  modelVersion?: string;
  image_size?: [number, number];
  imageSize?: [number, number];
  status?: string;
  imageUrl?: string;
  createdAt?: string;
};

type RequestOptions = {
  method?: "GET" | "POST";
  body?: BodyInit | null;
  headers?: Record<string, string>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = typeof window !== "undefined" ? getToken() : null;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    body: options.body,
    headers,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    clearAuth();
    window.location.href = "/login";
    throw new Error("Sessiya tugagan. Qayta kiring.");
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      payload?.detail ??
      payload?.message ??
      "So'rov bajarilmadi. Backend javobini tekshiring.";
    throw new Error(detail);
  }

  return payload as T;
}

function normalizeDetectedSign(sign: RawDetectedSign) {
  return {
    id: sign.id,
    signType: sign.signType ?? sign.sign_type ?? "unknown",
    confidence: sign.confidence,
    x: sign.x,
    y: sign.y,
    width: sign.width,
    height: sign.height,
    description: sign.description,
  };
}

function normalizeDetectionResponse(
  payload: RawDetectionResponse,
): DetectionResponse {
  const detectedSigns = (payload.detectedSigns ?? payload.signs ?? []).map(
    normalizeDetectedSign,
  );

  return {
    id: payload.id,
    detectedSigns,
    totalSigns: payload.totalSigns ?? payload.total_signs ?? detectedSigns.length,
    processingTimeMs:
      payload.processingTimeMs ?? payload.processing_time_ms ?? 0,
    modelVersion: payload.modelVersion ?? payload.model_version,
    imageSize: payload.imageSize ?? payload.image_size,
    status: payload.status,
    imageUrl: payload.imageUrl,
    createdAt: payload.createdAt,
  };
}

export const authApi = {
  login: (data: LoginRequest) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    }),
  register: (data: RegisterRequest) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    }),
};

export const detectionApi = {
  detect: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await request<RawDetectionResponse>("/api/detect/", {
      method: "POST",
      body: formData,
    });

    return normalizeDetectionResponse(response);
  },
  getHistory: async (page = 0, size = 10) => {
    const response = await request<{
      content?: DetectionResponse[];
      totalElements?: number;
      totalPages?: number;
    } & {
      content?: RawDetectionResponse[];
    }>(`/api/history?page=${page}&size=${size}`);

    return {
      ...response,
      content: (response.content ?? []).map(normalizeDetectionResponse),
    };
  },
  getById: async (id: number) => {
    const response = await request<RawDetectionResponse>(`/api/detect/${id}`);
    return normalizeDetectionResponse(response);
  },
};
