# CarbScan Mobile API Documentation

This document provides comprehensive documentation for the CarbScan mobile API endpoints designed for the native iOS application.

## Base URL

All mobile API endpoints are versioned and use the following base path:

```
/api/mobile/v1
```

## Authentication

The mobile API uses JWT (JSON Web Token) authentication instead of session cookies for better mobile compatibility.

### Token Types

1. **Access Token**: Short-lived token (30 days) used for API requests
2. **Refresh Token**: Long-lived token (90 days) used to obtain new access tokens

### Making Authenticated Requests

Include the access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Storage

- Store tokens securely in the iOS Keychain
- Never store tokens in UserDefaults or other unsecured storage
- Clear tokens on logout

---

## API Response Format

All mobile API endpoints return a consistent response structure:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data varies by endpoint
  },
  "meta": {
    "timestamp": "2025-11-19T12:00:00.000Z",
    "version": "v1"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional error details
  },
  "meta": {
    "timestamp": "2025-11-19T12:00:00.000Z",
    "version": "v1"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request data validation failed
- `UNAUTHORIZED`: Missing or invalid authentication
- `NOT_FOUND`: Requested resource not found
- `SERVER_ERROR`: Internal server error
- `AUTH_ERROR`: Authentication/authorization error
- `CONFIG_ERROR`: Configuration error
- `REGISTRATION_ERROR`: Device registration error

---

## Endpoints

### Health & Configuration

#### Health Check

Check API server status.

**Endpoint:** `GET /api/mobile/v1/health`

**Authentication:** Not required

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "serverTime": "2025-11-19T12:00:00.000Z",
    "apiVersion": "v1"
  }
}
```

#### Get App Configuration

Retrieve app configuration including feature flags and limits.

**Endpoint:** `GET /api/mobile/v1/config`

**Authentication:** Not required

**Response:**
```json
{
  "success": true,
  "data": {
    "features": {
      "aiChat": true,
      "mealScanning": true,
      "insights": true,
      "offlineMode": true
    },
    "limits": {
      "maxImageSize": 10485760,
      "maxChatMessageLength": 1000
    },
    "endpoints": {
      "analyze": "/api/mobile/v1/analyze",
      "chat": "/api/mobile/v1/chat",
      "meals": "/api/mobile/v1/meals",
      "sync": "/api/mobile/v1/meals/sync"
    }
  }
}
```

---

### Authentication

#### Sign in with Apple

Authenticate using Apple ID credentials with verified token validation.

**Endpoint:** `POST /api/mobile/v1/auth/apple`

**Authentication:** Not required

**✅ PRODUCTION READY** - Implements full Apple ID token verification using Apple's public keys.

**Configuration Required:**
Set `APPLE_CLIENT_ID` environment variable to your iOS app's bundle ID or Apple Service ID (e.g., `com.yourcompany.carbscan`)

**Request Body:**
```json
{
  "identityToken": "string (required - JWT from Apple)",
  "authorizationCode": "string (required - from Apple)",
  "user": {
    "email": "string (optional - only provided on first sign in)",
    "firstName": "string (optional - only on first sign in)",
    "lastName": "string (optional - only on first sign in)"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_access_token_string",
    "refreshToken": "jwt_refresh_token_string",
    "user": {
      "id": "apple_user_stable_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "subscriptionTier": "free",
      "profileImageUrl": null
    }
  },
  "meta": {
    "timestamp": "2025-11-19T05:30:00.000Z",
    "version": "v1"
  }
}
```

**Error Responses:**

*Configuration Error (500):*
```json
{
  "success": false,
  "error": {
    "code": "CONFIGURATION_ERROR",
    "message": "Apple Sign In is not configured on this server"
  }
}
```

*Invalid Token (401):*
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Apple Sign In token verification failed"
  }
}
```

**Implementation Details:**
- Fetches Apple's public keys from `https://appleid.apple.com/auth/keys`
- Verifies JWT signature using RS256 algorithm
- Validates token claims: `iss`, `aud`, `exp`
- Extracts stable Apple user ID from `sub` claim
- Handles Apple Private Relay emails
- Preserves user data across sign-ins (email only provided first time)
- Creates or updates user account automatically
- Returns 30-day access token and 90-day refresh token

**Security Notes:**
- User ID is the stable `sub` claim from verified Apple token
- Email may be Apple Private Relay address
- User information only provided on first authorization
- Subsequent sign-ins use stored user data
- Store both tokens securely in iOS Keychain

#### Request Magic Link

Request a sign-in link via email (alternative authentication method).

**Endpoint:** `POST /api/mobile/v1/auth/magic-link/request`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sent": true,
    "message": "If this email is registered, you will receive a sign-in link shortly"
  }
}
```

#### Verify Magic Link

Verify magic link token and authenticate.

**Endpoint:** `POST /api/mobile/v1/auth/magic-link/verify`

**Authentication:** Not required

**Request Body:**
```json
{
  "token": "magic_link_token"
}
```

**Status:** Not yet implemented (returns 501)

#### Refresh Access Token

Obtain a new access token using refresh token.

**Endpoint:** `POST /api/mobile/v1/auth/refresh`

**Authentication:** Not required

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token_string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_access_token_string"
  }
}
```

**Usage:**
- Call this endpoint when access token expires
- Update stored access token in Keychain
- If refresh token is invalid/expired, require user to sign in again

#### Revoke Token (Logout)

Revoke refresh token and log out.

**Endpoint:** `POST /api/mobile/v1/auth/revoke`

**Authentication:** Not required

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token_string" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "revoked": true
  }
}
```

**Implementation Notes:**
- Currently acknowledges revocation without maintaining blacklist
- In production, implement token blacklist for enhanced security
- Clear all tokens from Keychain on client side

#### Get Current User

Retrieve authenticated user's profile information.

**Endpoint:** `GET /api/mobile/v1/auth/me`

**Authentication:** Required

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "subscriptionTier": "pro",
    "profileImageUrl": "https://example.com/image.jpg",
    "emailRemindersEnabled": true
  }
}
```

---

### Device Management

#### Register Device for Push Notifications

Register device token for push notifications.

**Endpoint:** `POST /api/mobile/v1/devices/register`

**Authentication:** Optional (recommended)

**Request Body:**
```json
{
  "deviceToken": "apns_device_token_string",
  "platform": "ios",
  "deviceModel": "iPhone 15 Pro",
  "osVersion": "17.0",
  "appVersion": "1.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "registered": true,
    "deviceId": "placeholder-device-id"
  }
}
```

**Implementation Notes:**
- Currently logs device registration without persistent storage
- TODO: Implement device token storage in database
- Platform must be either "ios" or "android"

#### Unregister Device

Remove device token (e.g., on logout or notification opt-out).

**Endpoint:** `POST /api/mobile/v1/devices/unregister`

**Authentication:** Optional

**Request Body:**
```json
{
  "deviceToken": "apns_device_token_string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "unregistered": true
  }
}
```

---

## Meal Analysis

#### Analyze Food Image

Analyze a food image and get carbohydrate estimates.

**Endpoint:** `POST /api/mobile/v1/analyze`

**Authentication:** Required

**Request Body:**
```json
{
  "imageBase64": "base64_encoded_image_string",
  "metadata": {
    "deviceModel": "iPhone 15 Pro",
    "osVersion": "17.0",
    "appVersion": "1.0.0",
    "captureTimestamp": "2025-01-01T12:00:00.000Z",
    "lighting": "natural",
    "cameraFacing": "back"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "carbEstimate": 45,
      "confidenceLow": 40,
      "confidenceHigh": 50,
      "confidenceLevel": 0.85,
      "analysis": "Detailed analysis text...",
      "compositeItemName": "Chicken salad with rice"
    },
    "mealId": 123,
    "scanUsage": {
      "remainingScans": 9,
      "scanResetDate": "2025-02-01T00:00:00.000Z",
      "subscriptionTier": "essentials"
    }
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "version": "v1"
  }
}
```

**Error Response (No Scans Remaining):**
```json
{
  "success": false,
  "error": {
    "code": "NO_SCANS_REMAINING",
    "message": "You have no scans remaining. Please wait for your scans to reset or upgrade your plan.",
    "details": {
      "remainingScans": 0,
      "scanResetDate": "2025-01-02T00:00:00.000Z",
      "subscriptionTier": "free"
    }
  }
}
```

#### Get Meal History

Retrieve user's meal history with pagination.

**Endpoint:** `GET /api/mobile/v1/meals`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of meals to return (default: 20, max: 100)
- `offset` (optional): Number of meals to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "meals": [
      {
        "id": 123,
        "name": "Chicken salad with rice",
        "carbEstimate": 45,
        "confidenceLevel": "0.85",
        "createdAt": "2025-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 150,
      "hasMore": true
    }
  }
}
```

#### Sync Meals (Offline-First)

Delta sync for offline-first architecture. Supports conflict resolution (server wins).

**Endpoint:** `POST /api/mobile/v1/meals/sync`

**Authentication:** Required

**Request Body:**
```json
{
  "lastSyncTimestamp": "2025-01-01T00:00:00.000Z",
  "localMeals": [
    {
      "localId": "local-uuid-123",
      "name": "Breakfast toast",
      "carbEstimate": 30,
      "confidenceLevel": 0.8,
      "createdAt": "2025-01-01T08:00:00.000Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modifiedMeals": [
      {
        "id": 124,
        "name": "Lunch sandwich",
        "carbEstimate": 55,
        "createdAt": "2025-01-01T12:00:00.000Z"
      }
    ],
    "syncedLocalMeals": [
      {
        "localId": "local-uuid-123",
        "serverId": 125
      }
    ],
    "serverTimestamp": "2025-01-01T14:00:00.000Z",
    "conflictResolution": "server_wins"
  }
}
```

---

## AI Chat

#### Send Chat Message

Send a message to the AI nutrition assistant.

**Endpoint:** `POST /api/mobile/v1/chat`

**Authentication:** Required

**Request Body:**
```json
{
  "message": "How many carbs are in a banana?"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "response": "A medium banana (about 7 inches) contains approximately 27 grams of carbohydrates...",
    "messageType": "carb_lookup",
    "followUpQuestions": [
      "What about a small banana?",
      "Are bananas good for diabetics?",
      "What fruits have fewer carbs?"
    ],
    "usage": {
      "remainingChats": 2,
      "totalUsedToday": 1,
      "subscriptionTier": "free"
    }
  }
}
```

**Error Response (Limit Reached):**
```json
{
  "success": false,
  "error": {
    "code": "CHAT_LIMIT_REACHED",
    "message": "You've reached your daily limit of AI chat questions. Upgrade to Pro for unlimited AI assistance!",
    "details": {
      "remainingChats": 0,
      "dailyLimit": 3,
      "subscriptionTier": "free"
    }
  }
}
```

#### Get Chat History

Retrieve chat conversation history.

**Endpoint:** `GET /api/mobile/v1/chat/history`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50, max: 200)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "message": "How many carbs in rice?",
        "response": "One cup of cooked white rice contains about 45 grams of carbs...",
        "messageType": "carb_lookup",
        "createdAt": "2025-01-01T12:00:00.000Z"
      }
    ],
    "count": 10
  }
}
```

---

## Insights & Analytics

#### Get Nutrition Insights

Get comprehensive nutrition analytics and trends.

**Endpoint:** `GET /api/mobile/v1/insights`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "today": {
        "totalCarbs": 120,
        "mealCount": 3
      },
      "weekly": {
        "totalCarbs": 750,
        "dailyAverage": 107,
        "mealCount": 21
      },
      "monthly": {
        "totalCarbs": 3200,
        "dailyAverage": 107,
        "mealCount": 90
      }
    },
    "trends": {
      "direction": "decreasing",
      "percentageChange": -8,
      "comparison": "vs previous week"
    },
    "highlights": {
      "highestCarbMeal": {
        "name": "Pasta with bread",
        "carbs": 85,
        "date": "2025-01-01T19:00:00.000Z"
      },
      "lowestCarbMeal": {
        "name": "Grilled chicken salad",
        "carbs": 12,
        "date": "2025-01-01T12:00:00.000Z"
      }
    }
  }
}
```

---

## Subscriptions

#### Get Subscription Status

Get current subscription details and usage limits.

**Endpoint:** `GET /api/mobile/v1/subscriptions/status`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "tier": "essentials",
      "status": "active",
      "renewalDate": "2025-02-01T00:00:00.000Z"
    },
    "scans": {
      "remaining": 85,
      "resetDate": "2025-02-01T00:00:00.000Z",
      "limit": 90,
      "resetPeriod": "monthly"
    },
    "chat": {
      "remaining": 2,
      "usedToday": 1,
      "dailyLimit": 3
    },
    "limits": {
      "scansPerDay": 10,
      "scansPerMonth": 90,
      "chatPerDay": 3,
      "scanResetPeriod": "monthly"
    }
  }
}
```

---

## Upcoming Endpoints

The following endpoints are planned for future implementation:

### App Store Subscriptions
- `POST /api/mobile/v1/subscriptions/validate-receipt` - Validate App Store receipt
- `POST /api/mobile/v1/subscriptions/sync` - Sync StoreKit with server

---

## Error Handling

### HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Validation error or malformed request
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error
- `501 Not Implemented`: Feature not yet implemented

### Retry Logic

Implement exponential backoff for failed requests:

```swift
// Example retry logic
let maxRetries = 3
var retryCount = 0
let baseDelay = 1.0 // seconds

func retryRequest() {
    if retryCount < maxRetries {
        let delay = baseDelay * pow(2.0, Double(retryCount))
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            retryCount += 1
            makeRequest()
        }
    }
}
```

### Network Reachability

Monitor network status and handle offline scenarios gracefully:
- Queue requests when offline
- Implement offline-first architecture with local caching
- Sync when connection restored

---

## Security Best Practices

### JWT Secret Configuration

**⚠️ CRITICAL:** Before deploying to production, you **MUST** set the `JWT_SECRET` environment variable to a cryptographically secure random value.

```bash
# Generate a secure secret (example using openssl)
openssl rand -hex 64

# Set environment variable in production
export JWT_SECRET="your-generated-secure-random-hex-string"
```

**What happens if you don't:**
- Production deployment will fail with: `FATAL: JWT_SECRET environment variable MUST be set in production`
- Development uses a random secret that changes on each server restart (invalidating all tokens)

### Token Management
1. Store tokens in iOS Keychain with appropriate access control
2. Never log tokens in production
3. Implement token refresh before expiry
4. Clear tokens on logout
5. Handle token invalidation gracefully (e.g., after server restart in dev)

### API Communication
1. Always use HTTPS
2. Implement certificate pinning for production
3. Validate SSL certificates
4. Use App Transport Security (ATS)

### Data Protection
1. Enable data protection for sensitive data
2. Use encryption for local storage
3. Implement secure data wiping on logout

### Token Revocation Limitations

**Current Implementation:**
- Token revocation (`POST /auth/revoke`) acknowledges the request but **does not maintain a blacklist**
- Tokens remain valid until expiry even after "logout"
- This is acceptable for initial development but needs enhancement for production

**For Production:**
- Implement Redis-based token blacklist
- OR: Store refresh tokens in database with revocation flag
- OR: Use short-lived access tokens (15 mins) with refresh rotation

---

## Swift Integration Example

### Basic API Client Setup

```swift
import Foundation

class CarbScanAPIClient {
    static let shared = CarbScanAPIClient()
    private let baseURL = "https://your-api-domain.com/api/mobile/v1"
    
    private var accessToken: String? {
        // Retrieve from Keychain
        return KeychainManager.shared.get(key: "accessToken")
    }
    
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> T {
        guard let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(body)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            // Try to refresh token
            try await refreshToken()
            // Retry original request
            return try await self.request(endpoint: endpoint, method: method, body: body)
        }
        
        let apiResponse = try JSONDecoder().decode(MobileAPIResponse<T>.self, from: data)
        
        if apiResponse.success, let data = apiResponse.data {
            return data
        } else if let error = apiResponse.error {
            throw APIError.serverError(error.message)
        } else {
            throw APIError.unknown
        }
    }
}

struct MobileAPIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: APIErrorResponse?
    let meta: Meta?
    
    struct APIErrorResponse: Decodable {
        let code: String
        let message: String
        let details: [String: String]?
    }
    
    struct Meta: Decodable {
        let timestamp: String
        let version: String
    }
}

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case serverError(String)
    case unknown
}
```

### Authentication Example

```swift
struct AppleSignInRequest: Encodable {
    let identityToken: String
    let authorizationCode: String
    let user: User?
    
    struct User: Encodable {
        let email: String?
        let firstName: String?
        let lastName: String?
    }
}

struct AuthResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let user: User
    
    struct User: Decodable {
        let id: String
        let email: String?
        let firstName: String?
        let lastName: String?
        let subscriptionTier: String?
        let profileImageUrl: String?
    }
}

func signInWithApple(identityToken: String, authorizationCode: String) async throws {
    let request = AppleSignInRequest(
        identityToken: identityToken,
        authorizationCode: authorizationCode,
        user: nil
    )
    
    let response: AuthResponse = try await CarbScanAPIClient.shared.request(
        endpoint: "/auth/apple",
        method: "POST",
        body: request
    )
    
    // Store tokens in Keychain
    KeychainManager.shared.save(key: "accessToken", value: response.accessToken)
    KeychainManager.shared.save(key: "refreshToken", value: response.refreshToken)
}
```

---

## OpenAPI Specification

An OpenAPI 3.0 specification will be generated in a future task to enable:
- Automatic Swift client generation using Swift OpenAPI Generator
- Interactive API documentation
- Type-safe API contracts

---

## Support

For questions or issues with the mobile API:
1. Check this documentation
2. Review error messages and codes
3. Check server logs for detailed error information
4. Contact backend team for API-specific issues

---

## Version History

### v1.1 (January 2026)
- Added food image analysis endpoint (`POST /analyze`)
- Added meal history with pagination (`GET /meals`)
- Added offline-first delta sync (`POST /meals/sync`)
- Added AI chat messaging (`POST /chat`)
- Added chat history retrieval (`GET /chat/history`)
- Added nutrition insights and analytics (`GET /insights`)
- Added subscription status endpoint (`GET /subscriptions/status`)
- Full scan limit enforcement with tier-based resets
- Chat usage tracking with daily limits

### v1 (November 2025)
- Initial mobile API release
- JWT authentication with Sign in with Apple
- Device token registration
- Health and config endpoints
- User profile endpoints
