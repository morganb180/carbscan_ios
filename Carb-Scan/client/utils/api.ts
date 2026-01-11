import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://carbscan.ai/api/mobile/v1";

const ACCESS_TOKEN_KEY = "carbscan_access_token";
const REFRESH_TOKEN_KEY = "carbscan_refresh_token";

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return getSecureItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getSecureItem(REFRESH_TOKEN_KEY);
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await setSecureItem(ACCESS_TOKEN_KEY, accessToken);
  await setSecureItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await deleteSecureItem(ACCESS_TOKEN_KEY);
  await deleteSecureItem(REFRESH_TOKEN_KEY);
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

class APIError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "APIError";
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    const result: APIResponse<{ accessToken: string }> = await response.json();

    if (result.success && result.data) {
      await setSecureItem(ACCESS_TOKEN_KEY, result.data.accessToken);
      return result.data.accessToken;
    }

    await clearTokens();
    return null;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let accessToken = await getAccessToken();

  const makeRequest = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  let response = await makeRequest(accessToken);

  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await makeRequest(newToken);
    } else {
      throw new APIError("UNAUTHORIZED", "Session expired. Please sign in again.");
    }
  }

  const result: APIResponse<T> = await response.json();

  if (result.success && result.data !== undefined) {
    return result.data;
  }

  if (result.error) {
    throw new APIError(result.error.code, result.error.message, result.error.details);
  }

  throw new APIError("UNKNOWN_ERROR", "An unexpected error occurred");
}

export interface AppleAuthRequest {
  identityToken: string;
  authorizationCode: string;
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    subscriptionTier: string;
    profileImageUrl: string | null;
  };
}

export interface UserProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  subscriptionTier: string;
  profileImageUrl: string | null;
  emailRemindersEnabled?: boolean;
}

export interface AnalyzeRequest {
  imageBase64: string;
  metadata?: {
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    captureTimestamp?: string;
    lighting?: string;
    cameraFacing?: string;
  };
}

export interface AnalyzeResponse {
  analysis: {
    carbEstimate: number;
    confidenceLow: number;
    confidenceHigh: number;
    confidenceLevel: number;
    analysis: string;
    compositeItemName: string;
  };
  mealId: number;
  scanUsage: {
    remainingScans: number;
    scanResetDate: string;
    subscriptionTier: string;
  };
}

export interface MealFromAPI {
  id: number;
  name: string;
  carbEstimate: number;
  confidenceLevel: string;
  createdAt: string;
}

export interface MealsResponse {
  meals: MealFromAPI[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ChatResponse {
  response: string;
  messageType: string;
  followUpQuestions?: string[];
  usage: {
    remainingChats: number;
    totalUsedToday: number;
    subscriptionTier: string;
  };
}

export interface ChatHistoryMessage {
  id: number;
  message: string;
  response: string;
  messageType: string;
  createdAt: string;
}

export interface ChatHistoryResponse {
  messages: ChatHistoryMessage[];
  count: number;
}

export interface InsightsResponse {
  summary: {
    today: {
      totalCarbs: number;
      mealCount: number;
    };
    weekly: {
      totalCarbs: number;
      dailyAverage: number;
      mealCount: number;
    };
    monthly: {
      totalCarbs: number;
      dailyAverage: number;
      mealCount: number;
    };
  };
  trends: {
    direction: string;
    percentageChange: number;
    comparison: string;
  };
  highlights: {
    highestCarbMeal: {
      name: string;
      carbs: number;
      date: string;
    } | null;
    lowestCarbMeal: {
      name: string;
      carbs: number;
      date: string;
    } | null;
  };
}

export interface SubscriptionStatus {
  subscription: {
    tier: string;
    status: string;
    renewalDate: string | null;
  };
  scans: {
    remaining: number;
    resetDate: string;
    limit: number;
    resetPeriod: string;
  };
  chat: {
    remaining: number;
    usedToday: number;
    dailyLimit: number;
  };
  limits: {
    scansPerDay: number;
    scansPerMonth: number;
    chatPerDay: number;
    scanResetPeriod: string;
  };
}

export const carbscanAPI = {
  exchangeMobileAuthCode: async (
    code: string,
    codeVerifier: string
  ): Promise<APIResponse<AuthResponse>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/mobile/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          code_verifier: codeVerifier,
          grant_type: "authorization_code",
        }),
      });

      const result: APIResponse<AuthResponse> = await response.json();

      if (result.success && result.data) {
        await saveTokens(result.data.accessToken, result.data.refreshToken);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network request failed",
        },
      };
    }
  },

  auth: {
    signInWithApple: async (request: AppleAuthRequest): Promise<AuthResponse> => {
      const response = await apiRequest<AuthResponse>("/auth/apple", {
        method: "POST",
        body: JSON.stringify(request),
      });
      await saveTokens(response.accessToken, response.refreshToken);
      return response;
    },

    exchangeReplitSession: async (sessionCookie: string, deviceId?: string): Promise<AuthResponse> => {
      const response = await fetch(`${API_BASE_URL}/auth/replit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": sessionCookie,
        },
        body: JSON.stringify({ deviceId }),
        credentials: "include",
      });

      const result: APIResponse<AuthResponse> = await response.json();

      if (result.success && result.data) {
        await saveTokens(result.data.accessToken, result.data.refreshToken);
        return result.data;
      }

      if (result.error) {
        throw new APIError(result.error.code, result.error.message, result.error.details);
      }

      throw new APIError("UNKNOWN_ERROR", "Failed to exchange Replit session");
    },

    saveTokensFromWebView: async (accessToken: string, refreshToken: string): Promise<void> => {
      await saveTokens(accessToken, refreshToken);
    },

    getCurrentUser: async (): Promise<UserProfile> => {
      return apiRequest<UserProfile>("/auth/me");
    },

    logout: async (): Promise<void> => {
      const refreshToken = await getRefreshToken();
      try {
        await apiRequest("/auth/revoke", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error("Error revoking token:", error);
      }
      await clearTokens();
    },

    isAuthenticated: async (): Promise<boolean> => {
      const token = await getAccessToken();
      return !!token;
    },
  },

  analyze: {
    analyzeImage: async (imageBase64: string): Promise<AnalyzeResponse> => {
      return apiRequest<AnalyzeResponse>("/analyze", {
        method: "POST",
        body: JSON.stringify({
          imageBase64,
          metadata: {
            appVersion: "1.0.0",
            captureTimestamp: new Date().toISOString(),
          },
        }),
      });
    },
  },

  meals: {
    getHistory: async (limit = 20, offset = 0): Promise<MealsResponse> => {
      return apiRequest<MealsResponse>(`/meals?limit=${limit}&offset=${offset}`);
    },
  },

  chat: {
    sendMessage: async (message: string): Promise<ChatResponse> => {
      return apiRequest<ChatResponse>("/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
    },

    getHistory: async (limit = 50): Promise<ChatHistoryResponse> => {
      return apiRequest<ChatHistoryResponse>(`/chat/history?limit=${limit}`);
    },
  },

  insights: {
    get: async (): Promise<InsightsResponse> => {
      return apiRequest<InsightsResponse>("/insights");
    },
  },

  subscriptions: {
    getStatus: async (): Promise<SubscriptionStatus> => {
      return apiRequest<SubscriptionStatus>("/subscriptions/status");
    },
  },

  health: {
    check: async (): Promise<{ status: string; serverTime: string; apiVersion: string }> => {
      const response = await fetch(`${API_BASE_URL}/health`);
      const result: APIResponse<{ status: string; serverTime: string; apiVersion: string }> =
        await response.json();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error("Health check failed");
    },
  },
};

export { APIError };
