CarbScan User Authentication & Database Integration Guide
Overview
CarbScan uses a unified user database that supports both web and mobile authentication. Users can sign in from either platform and access the same account data including meal history, subscription status, and preferences.

Database Architecture
Base URL
https://carbscan.ai
Users Table Schema
users {
  id: string (primary key)     // User identifier
  email: string (unique)       // User's email address
  firstName: string            // First name
  lastName: string             // Last name
  profileImageUrl: string      // Profile picture URL
  
  // Subscription
  stripeCustomerId: string     // Stripe customer ID
  stripeSubscriptionId: string // Stripe subscription ID
  subscriptionTier: string     // "free" | "essentials" | "pro"
  subscriptionStatus: string   // "active" | "past_due" | "canceled"
  subscriptionRenewalDate: Date
  remainingScans: number       // Scans remaining in current period
  scanResetDate: Date          // When scan count resets
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}
Refresh Tokens Table (Mobile Only)
refresh_tokens {
  id: number (primary key)
  userId: string (references users.id)
  tokenHash: string            // SHA-256 hash of refresh token
  deviceId: string             // Optional - for per-device revocation
  createdAt: Date
  expiresAt: Date
  revokedAt: Date              // NULL if still valid
}
Authentication Methods
Web App: Replit OAuth
Uses session-based authentication
Users identified by Replit user ID
Sessions stored server-side with cookies
Mobile App: Sign in with Apple + JWT
Uses JWT token-based authentication
Users identified by Apple's stable sub claim
Tokens stored in iOS Keychain
Mobile Authentication Flow
1. Sign in with Apple
Endpoint: POST /api/mobile/v1/auth/apple

Request:

{
  "identityToken": "eyJ...",
  "authorizationCode": "c8f...",
  "user": {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
Notes:

identityToken is the JWT returned by Apple's AuthenticationServices
authorizationCode is the authorization code from Apple
user object is only provided by Apple on the first sign-in - store it!
Response:

{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "apple_sub_claim_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "subscriptionTier": "free",
      "profileImageUrl": null
    }
  }
}
Token Lifetimes:

Access Token: 30 days
Refresh Token: 90 days
2. Making Authenticated Requests
Include the access token in the Authorization header for all API calls:

Authorization: Bearer <accessToken>
3. Token Refresh
When access token expires (HTTP 401 response), use the refresh token to get a new one:

Endpoint: POST /api/mobile/v1/auth/refresh

Request:

{
  "refreshToken": "eyJ..."
}
Response:

{
  "success": true,
  "data": {
    "accessToken": "eyJ..."
  }
}
Implementation Notes:

Implement automatic token refresh on 401 responses
If refresh fails, require user to sign in again
Store new access token in Keychain
4. Logout
Endpoint: POST /api/mobile/v1/auth/revoke

Request:

{
  "refreshToken": "eyJ..."
}
This revokes the refresh token server-side. Clear all tokens from Keychain after calling this.

Account Linking (Web ↔ Mobile)
Users can access the same account from both platforms. The system links accounts by email address:

When a mobile user signs in with Apple:

Server extracts email from verified Apple token
Checks if a user with that email already exists (from web sign-up)
If yes: Links to existing account, preserving all meal history and subscription
If no: Creates new account with Apple user ID
Apple Private Relay: Users who choose "Hide My Email" get an Apple relay address (e.g., abc123@privaterelay.appleid.com). This address:

Persists across sign-ins for this user
Forwards emails to user's real address
Works normally for account matching
Shared Data Across Platforms
Once authenticated, users have full access to their data from either platform:

Data	Mobile Endpoint	Description
Meal History	GET /api/mobile/v1/meals	All saved meals with images and carb data
Meal Analysis	POST /api/mobile/v1/analyze	Analyze food photos for carbs
Insights	GET /api/mobile/v1/insights	Carb trends, daily/weekly/monthly stats
AI Chat	POST /api/mobile/v1/chat	Nutrition coaching conversations
Chat History	GET /api/mobile/v1/chat/history	Previous chat messages
Subscription	GET /api/mobile/v1/subscriptions/status	Tier, limits, renewal info
Offline Sync	POST /api/mobile/v1/meals/sync	Sync offline-created meals
Configuration Requirements
Environment Variables (Already Set on carbscan.ai)
Variable	Description	Status
JWT_SECRET	Secret key for signing JWT tokens	✅ Set
APPLE_CLIENT_ID	iOS app bundle ID	❌ Need to set
Setting Up Apple Client ID
Before Sign in with Apple will work, you need to:

Register your iOS app in Apple Developer Portal
Enable "Sign in with Apple" capability
Get your app's Bundle ID (e.g., com.carbscan.ios)
Add APPLE_CLIENT_ID environment variable with that Bundle ID
Security Best Practices
Token Storage
// Store tokens in Keychain, never in UserDefaults
let keychain = Keychain(service: "com.carbscan.ios")
keychain["accessToken"] = accessToken
keychain["refreshToken"] = refreshToken
Token Refresh Flow
// Intercept 401 responses and refresh automatically
if response.statusCode == 401 {
    let newToken = try await refreshAccessToken()
    // Retry original request with new token
}
Logout Cleanup
func logout() async {
    // 1. Revoke refresh token server-side
    try await api.revokeToken(refreshToken)
    
    // 2. Clear Keychain
    keychain["accessToken"] = nil
    keychain["refreshToken"] = nil
    
    // 3. Clear any cached user data
    UserDefaults.standard.removeObject(forKey: "cachedUserProfile")
}
Subscription Tiers
All users start on Free tier. Subscription upgrades sync across platforms automatically.

Tier	Scans	Reset Period	History Access	AI Chat
Free	3	Daily	7 days	5/day
Essentials	90	Monthly	30 days	20/day
Pro	300	Monthly	Unlimited	Unlimited
Check subscription status via:

GET /api/mobile/v1/subscriptions/status
API Response Format
All mobile API endpoints return consistent JSON:

Success
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "version": "v1"
  }
}
Error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "version": "v1"
  }
}
Common Error Codes
UNAUTHORIZED - Missing or invalid token
VALIDATION_ERROR - Invalid request data
SCAN_LIMIT_EXCEEDED - User has used all scans
CHAT_LIMIT_EXCEEDED - User has used all chat messages
NOT_FOUND - Resource doesn't exist
SERVER_ERROR - Internal error
Quick Start Checklist
 Set APPLE_CLIENT_ID environment variable to your iOS bundle ID
 Implement Sign in with Apple using AuthenticationServices
 Store tokens in iOS Keychain (not UserDefaults)
 Add Authorization: Bearer <token> to all API requests
 Implement automatic token refresh on 401 responses
 Handle offline scenarios with local caching
 Call /api/mobile/v1/auth/revoke on logout
Related Documentation
Full API Reference: See MOBILE_API.md for complete endpoint documentation
Web App: https://carbscan.ai
API Base URL: https://carbscan.ai/api/mobile/v1