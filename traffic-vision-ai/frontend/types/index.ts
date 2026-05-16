export interface DetectedSign {
  id?: number;
  signType: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  description?: string;
}

export interface DetectionResponse {
  id?: number;
  detectedSigns: DetectedSign[];
  totalSigns: number;
  processingTimeMs: number;
  modelVersion?: string;
  imageSize?: [number, number];
  status?: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface LiveDetectionResponse extends DetectionResponse {
  frameId?: number;
  hasCriticalSign?: boolean;
  criticalSignTypes?: string[];
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  username: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface User {
  username: string;
  email: string;
  role: string;
  token: string;
}

export interface ManagedModel {
  name: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
  isPrimary: boolean;
  isFallback: boolean;
}

export interface ModelRegistryResponse {
  primaryModel: string;
  fallbackModels: string[];
  models: ManagedModel[];
}
