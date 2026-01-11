import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";

import { User, Subscription } from "@/types";
import { carbscanAPI, getAccessToken, clearTokens, AuthResponse } from "@/utils/api";

interface AuthContextType {
  user: User | null;
  subscription: Subscription;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithAppleCredentials: (identityToken: string, authorizationCode: string, userInfo?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  loginWithReplitTokens: (authResponse: {
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
  }) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  decrementScans: () => void;
  decrementChatLimit: () => void;
}

const defaultSubscription: Subscription = {
  tier: "free",
  scansRemaining: 3,
  scansTotal: 3,
  historyDays: 7,
  chatLimit: 5,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(defaultSubscription);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        const profile = await carbscanAPI.auth.getCurrentUser();
        setUser({
          id: profile.id,
          email: profile.email || "",
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          subscriptionTier: profile.subscriptionTier as "free" | "essentials" | "pro",
        });

        await fetchSubscriptionStatus();
      }
    } catch (error) {
      console.error("Failed to check auth state:", error);
      await clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const status = await carbscanAPI.subscriptions.getStatus();
      setSubscription({
        tier: status.subscription.tier as "free" | "essentials" | "pro",
        scansRemaining: status.scans.remaining,
        scansTotal: status.scans.limit,
        historyDays: status.subscription.tier === "pro" ? 365 : status.subscription.tier === "essentials" ? 30 : 7,
        chatLimit: status.chat.remaining,
      });
    } catch (error) {
      console.error("Failed to fetch subscription status:", error);
    }
  };

  const loginWithAppleCredentials = useCallback(async (
    identityToken: string,
    authorizationCode: string,
    userInfo?: { email?: string; firstName?: string; lastName?: string }
  ) => {
    const response = await carbscanAPI.auth.signInWithApple({
      identityToken,
      authorizationCode,
      user: userInfo,
    });

    setUser({
      id: response.user.id,
      email: response.user.email || "",
      firstName: response.user.firstName || "",
      lastName: response.user.lastName || "",
      subscriptionTier: response.user.subscriptionTier as "free" | "essentials" | "pro",
    });

    await fetchSubscriptionStatus();
  }, []);

  const loginWithReplitTokens = useCallback(async (authResponse: {
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
  }) => {
    await carbscanAPI.auth.saveTokensFromWebView(authResponse.accessToken, authResponse.refreshToken);

    setUser({
      id: authResponse.user.id,
      email: authResponse.user.email || "",
      firstName: authResponse.user.firstName || "",
      lastName: authResponse.user.lastName || "",
      subscriptionTier: authResponse.user.subscriptionTier as "free" | "essentials" | "pro",
    });

    await fetchSubscriptionStatus();
  }, []);

  const loginDemo = useCallback(async () => {
    setUser({
      id: "demo-user",
      email: "demo@carbscan.ai",
      firstName: "Demo",
      lastName: "User",
      subscriptionTier: "free",
    });
    setSubscription(defaultSubscription);
  }, []);

  const logout = useCallback(async () => {
    try {
      await carbscanAPI.auth.logout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
    setUser(null);
    setSubscription(defaultSubscription);
  }, []);

  const refreshSubscription = useCallback(async () => {
    await fetchSubscriptionStatus();
  }, []);

  const decrementScans = useCallback(() => {
    setSubscription((prev) => {
      if (prev.scansRemaining > 0) {
        return {
          ...prev,
          scansRemaining: prev.scansRemaining - 1,
        };
      }
      return prev;
    });
  }, []);

  const decrementChatLimit = useCallback(() => {
    setSubscription((prev) => {
      if (prev.chatLimit > 0) {
        return {
          ...prev,
          chatLimit: prev.chatLimit - 1,
        };
      }
      return prev;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      subscription,
      isLoading,
      isAuthenticated: !!user,
      loginWithAppleCredentials,
      loginWithReplitTokens,
      loginDemo,
      logout,
      refreshSubscription,
      decrementScans,
      decrementChatLimit,
    }),
    [user, subscription, isLoading, loginWithAppleCredentials, loginWithReplitTokens, loginDemo, logout, refreshSubscription, decrementScans, decrementChatLimit]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
