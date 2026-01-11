# CarbScan - AI-Powered Carb Counting App

## Overview
CarbScan is a mobile application that helps people with diabetes count carbohydrates in their meals using AI-powered image analysis. The app allows users to take photos of food, get instant carb counts, track their meal history, and receive personalized nutrition insights.

## Tech Stack
- **Frontend:** React Native with Expo
- **Backend:** Express.js with TypeScript
- **Storage:** AsyncStorage for local persistence
- **Navigation:** React Navigation 7+ with bottom tabs
- **Styling:** iOS 26 liquid glass design system
- **State Management:** React Context (AuthContext)

## Project Structure
```
client/
├── App.tsx                 # Root component with providers
├── components/             # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── ErrorBoundary.tsx
│   ├── ErrorFallback.tsx
│   ├── FoodIllustration.tsx  # SVG line art illustration with animation
│   ├── HeaderTitle.tsx
│   ├── KeyboardAwareScrollViewCompat.tsx
│   ├── Spacer.tsx
│   ├── ThemedText.tsx
│   └── ThemedView.tsx
├── constants/
│   └── theme.ts            # Design tokens (colors, spacing, typography)
├── contexts/
│   ├── AuthContext.tsx     # Authentication state management
│   └── NotificationContext.tsx  # Push notification state and permission handling
├── hooks/
│   ├── useColorScheme.ts
│   ├── useScreenOptions.ts
│   └── useTheme.ts
├── lib/
│   ├── query-client.ts     # React Query configuration
│   └── notifications.ts    # Push notification utilities (expo-notifications)
├── navigation/
│   ├── MainTabNavigator.tsx  # 4-tab navigation
│   └── RootStackNavigator.tsx # Stack with modals
├── screens/
│   ├── ScanScreen.tsx      # Camera and food analysis
│   ├── HistoryScreen.tsx   # Meal history list
│   ├── InsightsScreen.tsx  # Charts and analytics
│   ├── ProfileScreen.tsx   # User profile and settings
│   ├── ChatScreen.tsx      # AI nutrition assistant
│   ├── MealDetailScreen.tsx # Individual meal view
│   └── LoginScreen.tsx     # Apple Sign-In
├── types/
│   └── index.ts            # TypeScript interfaces
└── utils/
    ├── mockApi.ts          # Simulated API responses
    └── storage.ts          # AsyncStorage utilities

server/
├── index.ts                # Express server entry
├── routes.ts               # API routes
├── storage.ts              # Server storage utilities (PostgreSQL via Drizzle)
├── db.ts                   # Database connection
├── notifications.ts        # Push notification service (expo-server-sdk)
└── templates/
    └── landing-page.html   # Static landing page

shared/
└── schema.ts               # Drizzle ORM schema (users, device_registrations, notification_messages)
```

## Key Features
1. **Scan Screen:** Full-screen camera for taking food photos with AI analysis
2. **History Screen:** Paginated list of logged meals with swipe-to-delete
3. **Insights Screen:** Weekly carb charts, meal time breakdown, streak tracking
4. **Profile Screen:** User info, subscription management, settings, push notification toggle
5. **AI Chat:** Nutrition assistant for meal planning advice
6. **Dual Authentication:** Apple Sign-In (iOS) + WebView-based Replit Auth (all providers)
7. **Push Notifications:** Expo push notifications with user opt-in, device registration, and business messaging

## Authentication System
The app supports two authentication methods:

### Apple Sign-In (iOS only)
- Native integration via expo-apple-authentication
- Directly calls /api/mobile/v1/auth/apple with identity token and authorization code
- Stores JWT tokens in expo-secure-store

### Browser Auth with PKCE (all platforms)
Uses OAuth 2.0 + PKCE for secure browser-based authentication:

**Flow:**
1. App generates `state` (CSRF protection) + `code_verifier` (32 random bytes)
2. App computes `code_challenge` = SHA256(code_verifier) in base64url
3. Opens browser: `carbscan.ai/auth/mobile/authorize?state=...&code_challenge=...&redirect_uri=carbscan://auth-callback`
4. User signs in with Google, GitHub, Email, etc.
5. Backend redirects to: `carbscan://auth-callback?code=ONE_TIME_CODE&state=...`
6. App validates state matches, then POSTs to `/auth/mobile/token` with `code` + `code_verifier`
7. Backend verifies SHA256(code_verifier) matches original code_challenge, returns tokens

**Backend Endpoints Required:**
- `GET /auth/mobile/authorize` - Accepts code_challenge, state, redirect_uri; initiates OAuth
- `POST /auth/mobile/token` - Exchanges code + code_verifier for access/refresh tokens

**Security Features:**
- PKCE prevents authorization code interception attacks
- State parameter prevents CSRF attacks
- One-time codes with ~60 second TTL
- Deep linking via carbscan:// URL scheme

### Key Components
- `AuthWebView.tsx`: Opens system browser with PKCE params, handles deep link callback
- `pkce.ts`: Generates secure code_verifier, code_challenge, and state values
- `LoginScreen.tsx`: Platform-specific login buttons (Apple on iOS, browser auth for others)
- `AuthContext.tsx`: Provides loginWithAppleCredentials and loginWithBrowserAuth methods

## Subscription Tiers
- **Free:** 3 scans/day, 7 days history, 5 chat messages/day
- **Essentials:** 90 scans/month, 30 days history, more chat
- **Pro:** 300 scans/month, unlimited history, unlimited chat

## Running the App
- The Expo app runs on port 8081
- The Express backend runs on port 5000
- Use the QR code from Replit's URL bar to test on a physical device via Expo Go

## Design System
- Primary color: #007AFF (iOS system blue)
- Background: White/Dark adaptive
- Typography: SF Pro system fonts
- Cards use subtle shadows (shadowOpacity: 0.05)
- All interactive elements have haptic feedback

## Recent Changes
- Initial MVP build with all core features
- Mock API responses for food analysis and chat
- AsyncStorage-based local data persistence
- Full authentication flow with demo login
- Fixed meal persistence: Scanned meals now save correctly to AsyncStorage
- Fixed chat limits: Uses memoized callbacks with functional updates to prevent stale closures
- Fixed insights: Rolling 7-day window for accurate weekly analytics
- Memoized AuthContext functions for stable references
- Implemented dual authentication system: native Apple Sign-In (iOS) and WebView-based Replit Auth for all other providers
- Created AuthWebView component that opens carbscan.ai login page, intercepts post-login navigation, and exchanges Replit session for JWT tokens via /api/mobile/v1/auth/replit
- Updated LoginScreen with platform-specific authentication buttons (Apple on iOS, generic sign-in for web/Android)
- Added loginWithReplitTokens method to AuthContext for handling WebView authentication flow
- Added push notification architecture with PostgreSQL persistence
- Created device_registrations and notification_messages database tables
- Added NotificationContext for client-side push notification permission handling
- Added notification toggle in Profile screen settings
- Created backend notification service with expo-server-sdk for sending push notifications
- API endpoints: POST /api/mobile/v1/devices/register, POST /api/mobile/v1/devices/unregister, POST /api/notifications/trigger, POST /api/notifications/create
- **Redesigned Splash + Welcome Experience:**
  - Updated splash screen background to warm off-white (#FAFAF8 light, #111214 dark)
  - Created `FoodIllustration` component with minimalist SVG line art and subtle breathing animation
  - Redesigned `OnboardingPromiseScreen` (Welcome screen) with calm, minimal aesthetic
  - Layout: Illustration → Brand statement → "Scan a meal" CTA → Trust line
  - Added staggered entrance animations for each element
  - Brand statement: "Understand carbs as easily as taking a photo."
  - Trust line: "No account needed to try."
  - Added `welcome_viewed` and `welcome_cta_tapped` analytics events

## Push Notifications
The app supports push notifications via Expo push service:

### Client Side
- `NotificationContext.tsx`: Manages notification state, permission requests, and device registration
- `client/lib/notifications.ts`: Expo push token retrieval and device registration with server
- Toggle in Profile > Settings allows users to enable/disable notifications
- On enable: Requests permission, gets Expo push token, registers with server
- On disable: Unregisters device from server

### Server Side
- `device_registrations` table: Stores Expo push tokens linked to user IDs
- `notification_messages` table: Stores messages created by business users for sending
- `server/notifications.ts`: Uses expo-server-sdk to send push notifications
- Endpoints:
  - `POST /api/mobile/v1/devices/register` - Register device for push notifications
  - `POST /api/mobile/v1/devices/unregister` - Unregister device
  - `POST /api/notifications/create` - Create a notification message in database
  - `POST /api/notifications/trigger` - Send notification (by messageId or immediate title/body)
  - `POST /api/notifications/process-pending` - Process scheduled pending notifications

### Business User Flow
1. Set `ADMIN_API_KEY` environment variable for secure admin access
2. Insert notification message into `notification_messages` table (via direct DB access or API)
3. Call `/api/notifications/trigger` with `X-Admin-API-Key` header and messageId to send to all registered devices
4. Or call `/api/notifications/trigger` with title/body/userIds for immediate targeted notifications

### Security
- Device registration endpoints require valid carbscan.ai access token via `Authorization: Bearer <token>` header
- Server validates token against carbscan.ai `/auth/me` endpoint and ensures userId matches authenticated user
- Admin notification endpoints (create, trigger, process, pending) require `X-Admin-API-Key` header
- Set `ADMIN_API_KEY` environment variable to enable admin functionality
