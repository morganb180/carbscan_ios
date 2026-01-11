import { Platform } from "react-native";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useSessionStore } from "@/stores/sessionStore";

export type AnalyticsEvent =
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
  | "auth_dismissed";

interface BaseEventProps {
  variant: "A" | "B" | null;
  sessionId: string;
  screenName?: string;
  platform: string;
  timestamp: number;
  isAuthenticated: boolean;
}

interface EventProps extends Partial<BaseEventProps> {
  [key: string]: unknown;
}

class Analytics {
  private getBaseProps(): BaseEventProps {
    const variant = useOnboardingStore.getState().experimentVariant;
    const sessionId = useSessionStore.getState().sessionId;
    
    return {
      variant,
      sessionId,
      platform: Platform.OS,
      timestamp: Date.now(),
      isAuthenticated: false,
    };
  }

  track(event: AnalyticsEvent, props: EventProps = {}) {
    const baseProps = this.getBaseProps();
    const fullEvent = {
      event,
      ...baseProps,
      ...props,
    };

    if (__DEV__) {
      console.log("[Analytics]", event, fullEvent);
    }
  }

  screenViewed(screenName: string, additionalProps: EventProps = {}) {
    this.track("screen_viewed", { screenName, ...additionalProps });
  }

  ctaTapped(ctaName: string, screenName: string, additionalProps: EventProps = {}) {
    this.track("cta_tapped", { ctaName, screenName, ...additionalProps });
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

  photoCaptured() {
    this.track("photo_captured");
  }

  scanCompleted(props: { totalCarbs: number; itemCount: number; confidence: string }) {
    this.track("scan_completed", props);
  }

  itemEdited(itemId: string) {
    this.track("item_edited", { itemId });
  }

  saveTapped(isAuthenticated: boolean) {
    this.track("save_tapped", { isAuthenticated });
  }

  saveCompleted(scanId: string) {
    this.track("save_completed", { scanId });
  }

  saveUndone() {
    this.track("save_undone");
  }

  scanAgainTapped() {
    this.track("scan_again_tapped");
  }

  authModalViewed() {
    this.track("auth_modal_viewed");
  }

  authStarted(method: string) {
    this.track("auth_started", { method });
  }

  authCompleted(method: string) {
    this.track("auth_completed", { method });
  }

  authDismissed() {
    this.track("auth_dismissed");
  }
}

export const analytics = new Analytics();
