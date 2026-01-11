import { create } from "zustand";
import * as Crypto from "expo-crypto";

interface SessionState {
  sessionId: string;
  initializeSession: () => void;
}

function generateSessionId(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  sessionId: generateSessionId(),

  initializeSession: () => {
    set({ sessionId: generateSessionId() });
  },
}));
