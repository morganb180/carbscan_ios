import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ExperimentVariant = "A" | "B";

export type PermissionStatus = "undetermined" | "granted" | "denied";

export interface SavedScan {
  id: string;
  name: string;
  totalCarbs: number;
  itemCount: number;
  timestamp: number;
  thumbnailUri?: string;
}

interface OnboardingState {
  experimentVariant: ExperimentVariant | null;
  onboardingStartTs: number | null;
  scanStartTs: number | null;
  firstScanCompleted: boolean;
  timeToFirstScanSeconds: number | null;
  firstSaveCompleted: boolean;
  onboardingCompleted: boolean;
  cameraPermissionStatus: PermissionStatus;
  notificationPermissionStatus: PermissionStatus;
  hasShownTimeToFirstWin: boolean;
  savedScansCount: number;
  totalScansCount: number;
  notificationPromptedAt: number | null;
  notificationDeferredUntil: number | null;
  hasSavedScan: boolean;
  recentScans: SavedScan[];

  initializeExperiment: () => void;
  startOnboarding: () => void;
  startScan: () => void;
  completeScan: () => void;
  completeSave: () => void;
  addSavedScan: (scan: SavedScan) => void;
  removeSavedScan: (scanId: string) => void;
  completeOnboarding: () => void;
  setCameraPermission: (status: PermissionStatus) => void;
  setNotificationPermission: (status: PermissionStatus) => void;
  markTimeToFirstWinShown: () => void;
  incrementSavedScans: () => void;
  incrementTotalScans: () => void;
  setNotificationPrompted: () => void;
  deferNotificationPrompt: () => void;
  shouldShowNotificationPrompt: () => boolean;
  reset: () => void;
}

const initialState = {
  experimentVariant: null as ExperimentVariant | null,
  onboardingStartTs: null as number | null,
  scanStartTs: null as number | null,
  firstScanCompleted: false,
  timeToFirstScanSeconds: null as number | null,
  firstSaveCompleted: false,
  onboardingCompleted: false,
  cameraPermissionStatus: "undetermined" as PermissionStatus,
  notificationPermissionStatus: "undetermined" as PermissionStatus,
  hasShownTimeToFirstWin: false,
  savedScansCount: 0,
  totalScansCount: 0,
  notificationPromptedAt: null as number | null,
  notificationDeferredUntil: null as number | null,
  hasSavedScan: false,
  recentScans: [] as SavedScan[],
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      initializeExperiment: () => {
        const { experimentVariant } = get();
        if (experimentVariant === null) {
          const variant: ExperimentVariant = Math.random() < 0.5 ? "A" : "B";
          set({ experimentVariant: variant });
        }
      },

      startOnboarding: () => {
        const { onboardingStartTs } = get();
        if (onboardingStartTs === null) {
          set({ onboardingStartTs: Date.now() });
        }
      },

      startScan: () => {
        set({ scanStartTs: Date.now() });
      },

      completeScan: () => {
        const { scanStartTs, firstScanCompleted } = get();
        const now = Date.now();

        if (!firstScanCompleted && scanStartTs) {
          const elapsedSeconds = Math.round((now - scanStartTs) / 1000);
          const clampedSeconds = Math.max(3, elapsedSeconds);
          set({
            firstScanCompleted: true,
            timeToFirstScanSeconds: clampedSeconds,
          });
        }

        set((state) => ({ totalScansCount: state.totalScansCount + 1 }));
      },

      completeSave: () => {
        const { firstSaveCompleted } = get();
        if (!firstSaveCompleted) {
          set({ firstSaveCompleted: true, hasSavedScan: true });
        }
        set((state) => ({ savedScansCount: state.savedScansCount + 1 }));
      },

      addSavedScan: (scan: SavedScan) => {
        set((state) => ({
          recentScans: [scan, ...state.recentScans].slice(0, 50),
        }));
      },

      removeSavedScan: (scanId: string) => {
        set((state) => ({
          recentScans: state.recentScans.filter((s) => s.id !== scanId),
          savedScansCount: Math.max(0, state.savedScansCount - 1),
        }));
      },

      completeOnboarding: () => {
        set({ onboardingCompleted: true });
      },

      setCameraPermission: (status: PermissionStatus) => {
        set({ cameraPermissionStatus: status });
      },

      setNotificationPermission: (status: PermissionStatus) => {
        set({ notificationPermissionStatus: status });
      },

      markTimeToFirstWinShown: () => {
        set({ hasShownTimeToFirstWin: true });
      },

      incrementSavedScans: () => {
        set((state) => ({ savedScansCount: state.savedScansCount + 1 }));
      },

      incrementTotalScans: () => {
        set((state) => ({ totalScansCount: state.totalScansCount + 1 }));
      },

      setNotificationPrompted: () => {
        set({ notificationPromptedAt: Date.now() });
      },

      deferNotificationPrompt: () => {
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        set({ notificationDeferredUntil: Date.now() + sevenDaysMs });
      },

      shouldShowNotificationPrompt: () => {
        const state = get();
        if (!state.hasSavedScan) return false;
        if (state.totalScansCount < 2) return false;
        if (state.notificationPromptedAt !== null) return false;
        if (state.notificationDeferredUntil && Date.now() < state.notificationDeferredUntil) {
          return false;
        }
        if (!state.onboardingCompleted) return false;
        return true;
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "@carbscan_onboarding",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
