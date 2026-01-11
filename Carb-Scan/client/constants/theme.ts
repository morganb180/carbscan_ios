import { Platform } from "react-native";

export const Colors = {
  light: {
    bg: "#FAFAF8",
    surface: "#FFFFFF",
    surfaceAlt: "#F3F4F2",
    surfacePressed: "#EDEEE9",
    border: "#E6E7E3",
    text: "#111214",
    textSecondary: "#4A4E55",
    textTertiary: "#717680",
    textInverse: "#FFFFFF",
    icon: "#2A2D33",

    accent: "#3B82F6",
    accentPressed: "#2563EB",
    accentSoft: "#E8F1FF",

    success: "#16A34A",
    successSoft: "#EAF7EE",
    warning: "#F59E0B",
    warningSoft: "#FFF5E6",
    danger: "#DC2626",
    dangerSoft: "#FDECEC",

    scrim: "rgba(17, 18, 20, 0.45)",

    screenBg: "#FAFAF8",
    cardBg: "#FFFFFF",
    cardBgAlt: "#F3F4F2",
    divider: "#E6E7E3",

    textPrimary: "#111214",
    textOnAccent: "#FFFFFF",

    primaryCtaBg: "#3B82F6",
    primaryCtaBgPressed: "#2563EB",
    link: "#3B82F6",

    successFg: "#16A34A",
    successBg: "#EAF7EE",
    warningFg: "#F59E0B",
    warningBg: "#FFF5E6",
    errorFg: "#DC2626",
    errorBg: "#FDECEC",

    backgroundRoot: "#FAFAF8",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F3F4F2",
    backgroundTertiary: "#EDEEE9",
    cardBackground: "#FFFFFF",
    primary: "#3B82F6",
    error: "#DC2626",
    buttonText: "#FFFFFF",
    tabIconDefault: "#717680",
    tabIconSelected: "#3B82F6",
    chatBubbleUser: "#3B82F6",
    chatBubbleAI: "#F3F4F2",
  },
  dark: {
    bg: "#111214",
    surface: "#1C1D20",
    surfaceAlt: "#26272B",
    surfacePressed: "#32343A",
    border: "#38383A",
    text: "#FFFFFF",
    textSecondary: "#98989D",
    textTertiary: "#717680",
    textInverse: "#111214",
    icon: "#E5E5E5",

    accent: "#60A5FA",
    accentPressed: "#3B82F6",
    accentSoft: "#1E3A5F",

    success: "#22C55E",
    successSoft: "#1A3D2E",
    warning: "#FBBF24",
    warningSoft: "#3D3520",
    danger: "#EF4444",
    dangerSoft: "#3D2020",

    scrim: "rgba(0, 0, 0, 0.6)",

    screenBg: "#111214",
    cardBg: "#1C1D20",
    cardBgAlt: "#26272B",
    divider: "#38383A",

    textPrimary: "#FFFFFF",
    textOnAccent: "#FFFFFF",

    primaryCtaBg: "#60A5FA",
    primaryCtaBgPressed: "#3B82F6",
    link: "#60A5FA",

    successFg: "#22C55E",
    successBg: "#1A3D2E",
    warningFg: "#FBBF24",
    warningBg: "#3D3520",
    errorFg: "#EF4444",
    errorBg: "#3D2020",

    backgroundRoot: "#111214",
    backgroundDefault: "#1C1D20",
    backgroundSecondary: "#26272B",
    backgroundTertiary: "#32343A",
    cardBackground: "#1C1D20",
    primary: "#60A5FA",
    error: "#EF4444",
    buttonText: "#FFFFFF",
    tabIconDefault: "#717680",
    tabIconSelected: "#60A5FA",
    chatBubbleUser: "#60A5FA",
    chatBubbleAI: "#26272B",
  },
};

export const Spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 32,
  s8: 40,
  s9: 48,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 56,
  inputHeight: 48,
  buttonHeight: 52,
  buttonHeightMedium: 48,
  buttonHeightLarge: 56,
  screenPaddingHorizontal: 16,
};

export const BorderRadius = {
  r1: 8,
  r2: 12,
  r3: 16,
  r4: 20,
  rFull: 9999,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
  },
  h1: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500" as const,
  },
  button: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600" as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
  },
  micro: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: "700" as const,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  headline: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 17,
    fontWeight: "400" as const,
  },
  carbCount: {
    fontSize: 48,
    fontWeight: "700" as const,
  },
};

export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
    },
    android: {
      elevation: 2,
    },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
    },
  }),
  modal: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
    android: {
      elevation: 6,
    },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
  }),
  floatingButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Motion = {
  pressFeedback: 100,
  modalSheet: 250,
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
