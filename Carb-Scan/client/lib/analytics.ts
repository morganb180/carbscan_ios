import { Platform } from "react-native";
import { useOnboardingStore, ExperimentVariant } from "@/stores/onboardingStore";

type AnalyticsEvent =
  | "app_opened"
  | "screen_viewed"
  | "cta_tapped"
  | "permission_prompted"
  | "permission_result"
  | "permission_deferred"
  | "photo_captured"
  | "scan_completed"
  | "item_edited"
  | "save_tapped"
  | "save_completed"
  | "save_undone"
  | "scan_again_tapped"
  | "notifications_prompted"
  | "notifications_result"
  | "auth_modal_viewed"
  | "auth_started"
  | "auth_completed"
  | "auth_dismissed"
  | "onboarding_viewed_screen"
  | "onboarding_cta_tapped"
  | "scan_started"
  | "scan_photo_captured"
  | "scan_results_viewed"
  | "time_to_first_win_shown"
  | "meal_saved"
  | "onboarding_completed"
  | "welcome_viewed"
  | "welcome_cta_tapped";

type EventProperties = Record<string, string | number | boolean | undefined>;

interface AnalyticsAdapter {
  track: (event: string, properties?: EventProperties) => void;
  identify: (userId: string, traits?: EventProperties) => void;
}

class ConsoleAdapter implements AnalyticsAdapter {
  track(event: string, properties?: EventProperties) {
    if (__DEV__) {
      console.log(`[Analytics] ${event}`, properties || {});
    }
  }

  identify(userId: string, traits?: EventProperties) {
    if (__DEV__) {
      console.log(`[Analytics] identify: ${userId}`, traits || {});
    }
  }
}

let sessionId = Math.random().toString(36).substring(2, 15);

class Analytics {
  private adapter: AnalyticsAdapter;

  constructor() {
    this.adapter = new ConsoleAdapter();
  }

  setAdapter(adapter: AnalyticsAdapter) {
    this.adapter = adapter;
  }

  resetSession() {
    sessionId = Math.random().toString(36).substring(2, 15);
  }

  private getVariant(): ExperimentVariant | null {
    return useOnboardingStore.getState().experimentVariant;
  }

  private enrichProperties(properties?: EventProperties): EventProperties {
    return {
      ...properties,
      variant: this.getVariant() || undefined,
      sessionId,
      platform: Platform.OS,
      timestamp: Date.now(),
    };
  }

  track(event: AnalyticsEvent, properties?: EventProperties) {
    this.adapter.track(event, this.enrichProperties(properties));
  }

  identify(userId: string, traits?: EventProperties) {
    this.adapter.identify(userId, traits);
  }

  screenViewed(screenName: string, additionalProps?: EventProperties) {
    this.track("screen_viewed", { screenName, ...additionalProps });
  }

  ctaTapped(ctaName: string, screenName: string, additionalProps?: EventProperties) {
    this.track("cta_tapped", { ctaName, screenName, ...additionalProps });
  }

  onboardingViewedScreen(screenName: string) {
    this.track("onboarding_viewed_screen", { screenName });
    this.track("screen_viewed", { screenName });
  }

  onboardingCtaTapped(screenName: string, ctaName: string) {
    this.track("onboarding_cta_tapped", { screenName, ctaName });
    this.track("cta_tapped", { ctaName, screenName });
  }

  scanStarted() {
    this.track("scan_started");
  }

  scanPhotoCaptured() {
    this.track("scan_photo_captured");
    this.track("photo_captured");
  }

  scanResultsViewed() {
    this.track("scan_results_viewed");
  }

  scanCompleted(totalCarbs: number, itemCount: number, confidence: string) {
    this.track("scan_completed", { totalCarbs, itemCount, confidence });
  }

  timeToFirstWinShown(seconds: number) {
    this.track("time_to_first_win_shown", { seconds });
  }

  saveTapped(isAuthenticated?: boolean) {
    this.track("save_tapped", { isAuthenticated });
  }

  saveCompleted(scanId?: string) {
    this.track("save_completed", { scanId });
    this.track("meal_saved");
  }

  saveUndone() {
    this.track("save_undone");
  }

  itemEdited(itemId: string) {
    this.track("item_edited", { itemId });
  }

  scanAgainTapped() {
    this.track("scan_again_tapped");
  }

  authModalViewed() {
    this.track("auth_modal_viewed");
  }

  authStarted(method: "apple" | "google" | "email") {
    this.track("auth_started", { method });
  }

  authCompleted(method: "apple" | "google" | "email") {
    this.track("auth_completed", { method });
  }

  authDismissed() {
    this.track("auth_dismissed");
  }

  mealSaved() {
    this.track("meal_saved");
  }

  permissionPrompted(type: "camera" | "notifications") {
    this.track("permission_prompted", { type });
  }

  permissionResult(type: "camera" | "notifications", status: string) {
    this.track("permission_result", { type, status });
  }

  permissionDeferred(type: "camera" | "notifications") {
    this.track("permission_deferred", { type });
  }

  onboardingCompleted(timeToFirstScanSeconds: number) {
    this.track("onboarding_completed", { timeToFirstScanSeconds });
  }
}

export const analytics = new Analytics();
