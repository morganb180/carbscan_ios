import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { AuthResponse, carbscanAPI } from "@/utils/api";
import { generatePKCEParams, PKCEParams } from "@/utils/pkce";

const AUTH_BASE_URL = "https://carbscan.ai/api/mobile/v1";
const REDIRECT_URI = "carbscan://auth-callback";

interface AuthWebViewProps {
  onSuccess: (authResponse: AuthResponse) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export default function AuthWebView({ onSuccess, onCancel, onError }: AuthWebViewProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'authenticating' | 'exchanging'>('idle');
  const pkceParamsRef = useRef<PKCEParams | null>(null);

  useEffect(() => {
    initializePKCE();

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  const initializePKCE = async () => {
    try {
      pkceParamsRef.current = await generatePKCEParams();
    } catch (error) {
      console.error('Failed to generate PKCE params:', error);
    }
  };

  const handleDeepLink = async (event: { url: string }) => {
    if (event.url.startsWith(REDIRECT_URI)) {
      await handleAuthCallback(event.url);
    }
  };

  const handleAuthCallback = async (url: string) => {
    setStatus('exchanging');
    setIsLoading(true);

    try {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const state = urlObj.searchParams.get('state');
      const errorParam = urlObj.searchParams.get('error');
      const errorDescription = urlObj.searchParams.get('error_description');

      if (errorParam) {
        onError(errorDescription || errorParam);
        return;
      }

      if (!code) {
        onError('No authorization code received');
        return;
      }

      if (!pkceParamsRef.current) {
        onError('Session expired. Please try again.');
        return;
      }

      if (state !== pkceParamsRef.current.state) {
        onError('Invalid state parameter. Please try again.');
        return;
      }

      const response = await carbscanAPI.exchangeMobileAuthCode(
        code,
        pkceParamsRef.current.codeVerifier
      );

      if (response.success && response.data) {
        onSuccess(response.data);
      } else {
        onError(response.error?.message || 'Failed to complete authentication');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      onError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
      setStatus('idle');
    }
  };

  const handleOpenBrowser = async () => {
    if (!pkceParamsRef.current) {
      await initializePKCE();
    }

    if (!pkceParamsRef.current) {
      onError('Failed to initialize secure session. Please try again.');
      return;
    }

    setIsLoading(true);
    setStatus('authenticating');

    try {
      const { state, codeChallenge } = pkceParamsRef.current;

      const authParams = new URLSearchParams({
        mobile: 'true',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
      });

      const authUrl = `${AUTH_BASE_URL}/auth/mobile/authorize?${authParams.toString()}`;

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        REDIRECT_URI,
        {
          showInRecents: true,
          preferEphemeralSession: false,
        }
      );

      if (result.type === 'success' && result.url) {
        await handleAuthCallback(result.url);
      } else if (result.type === 'cancel') {
        setIsLoading(false);
        setStatus('idle');
        onCancel();
      } else {
        setIsLoading(false);
        setStatus('idle');
      }
    } catch (error) {
      console.error('Browser auth error:', error);
      setIsLoading(false);
      setStatus('idle');
      onError(error instanceof Error ? error.message : 'Failed to open browser');
    }
  };

  if (Platform.OS === "web") {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.closeButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h4">Sign In</ThemedText>
          <View style={styles.closeButton} />
        </View>
        <View style={styles.webFallback}>
          <Feather name="smartphone" size={48} color={theme.textSecondary} />
          <ThemedText type="h4" style={styles.webFallbackTitle}>
            Use the Mobile App
          </ThemedText>
          <ThemedText type="body" style={[styles.webFallbackText, { color: theme.textSecondary }]}>
            Sign-in is available on iOS and Android devices.
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Scan the QR code in the toolbar to open the app in Expo Go on your device.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'authenticating':
        return 'Opening secure login...';
      case 'exchanging':
        return 'Completing sign in...';
      default:
        return '';
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={onCancel} style={styles.closeButton} disabled={isLoading}>
          <Feather name="x" size={24} color={isLoading ? theme.textSecondary : theme.text} />
        </Pressable>
        <ThemedText type="h4">Sign In</ThemedText>
        <View style={styles.closeButton} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Feather name="shield" size={48} color={theme.primary} />
        </View>

        <ThemedText type="h3" style={styles.title}>
          Secure Sign In
        </ThemedText>
        
        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          Sign in securely using your browser. You'll be automatically redirected back to the app.
        </ThemedText>

        <Pressable
          onPress={handleOpenBrowser}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.signInButton,
            { 
              backgroundColor: theme.primary, 
              opacity: isLoading ? 0.6 : pressed ? 0.8 : 1 
            },
          ]}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <ThemedText type="body" style={styles.buttonText}>
                {getStatusMessage()}
              </ThemedText>
            </View>
          ) : (
            <>
              <Feather name="log-in" size={20} color="#fff" />
              <ThemedText type="body" style={styles.buttonText}>
                Continue to Sign In
              </ThemedText>
            </>
          )}
        </Pressable>

        <ThemedText type="caption" style={[styles.hint, { color: theme.textSecondary }]}>
          Sign in with Google, GitHub, Email, or other providers.
        </ThemedText>

        <View style={styles.securityNote}>
          <Feather name="lock" size={14} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 6 }}>
            Protected with PKCE security
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    width: "100%",
    maxWidth: 300,
    minHeight: 50,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  hint: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    opacity: 0.7,
  },
  webFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  webFallbackTitle: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
  webFallbackText: {
    textAlign: "center",
  },
});
