# CarbScan Push Notification System

## Overview

The CarbScan push notification system enables sending notifications to users who have opted in via the mobile app. It uses Expo's push notification service to deliver messages to iOS and Android devices.

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│  Express API    │────▶│   PostgreSQL    │
│  (Expo Client)  │     │    (Server)     │     │    Database     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Expo Push API  │
                        └─────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| NotificationContext | `client/contexts/NotificationContext.tsx` | Manages user opt-in, permissions, and device registration |
| Notification Service | `server/notifications.ts` | Sends push notifications via Expo SDK |
| API Routes | `server/routes.ts` | Admin endpoints for creating and triggering notifications |
| Database Schema | `shared/schema.ts` | Stores device registrations and notification messages |

---

## Database Tables

### device_registrations

Stores registered devices for push notifications.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | varchar | User ID from carbscan.ai |
| expoPushToken | varchar | Expo push token (unique) |
| platform | varchar | "ios" or "android" |
| deviceModel | varchar | Device model name |
| osVersion | varchar | OS version |
| appVersion | varchar | App version |
| isActive | boolean | Whether device is active |
| createdAt | timestamp | Registration date |
| updatedAt | timestamp | Last update date |

### notification_messages

Stores notification content for sending.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| title | varchar | Notification title |
| body | text | Notification body |
| data | json | Optional custom data payload |
| targetUserIds | json | Specific user IDs to target (null = all users) |
| status | varchar | "pending", "sent", "failed" |
| scheduledFor | timestamp | Optional scheduled send time |
| sentAt | timestamp | When notification was sent |
| createdAt | timestamp | Creation date |

---

## Admin API Reference

All admin endpoints require the `X-Admin-API-Key` header with a valid API key.

### Prerequisites

Set the `ADMIN_API_KEY` environment variable in your Replit secrets:

```
ADMIN_API_KEY=your-secure-api-key-here
```

### Endpoints

#### Create a Notification Message

Store a notification in the database for later sending.

```bash
POST /api/notifications/create
```

**Headers:**
```
Content-Type: application/json
X-Admin-API-Key: your-api-key
```

**Body:**
```json
{
  "title": "New Feature Available",
  "body": "Check out our latest carb tracking improvements!",
  "data": {
    "screen": "insights",
    "deepLink": "/insights"
  },
  "targetUserIds": ["user-123", "user-456"],
  "scheduledFor": "2024-01-15T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "New Feature Available",
    "status": "pending"
  }
}
```

#### Trigger a Notification

Send a notification immediately, either by message ID or with inline content.

```bash
POST /api/notifications/trigger
```

**Option 1: Send a stored message**
```json
{
  "messageId": 1
}
```

**Option 2: Send immediate notification**
```json
{
  "title": "Flash Sale!",
  "body": "50% off Pro subscriptions for the next 2 hours",
  "userIds": ["user-123"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sent": 5,
    "failed": 0
  }
}
```

#### Process Pending Notifications

Process all scheduled notifications that are due.

```bash
POST /api/notifications/process-pending
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 3
  }
}
```

#### Get Pending Notifications

List all pending notifications.

```bash
GET /api/notifications/pending
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Scheduled Reminder",
      "status": "pending",
      "scheduledFor": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

## How to Send Notifications

### Method 1: Immediate Broadcast to All Users

Send a notification to all registered devices:

```bash
curl -X POST https://your-app.replit.app/api/notifications/trigger \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: your-api-key" \
  -d '{
    "title": "Important Update",
    "body": "We have exciting news to share!"
  }'
```

### Method 2: Targeted Notification

Send to specific users:

```bash
curl -X POST https://your-app.replit.app/api/notifications/trigger \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: your-api-key" \
  -d '{
    "title": "Welcome Back!",
    "body": "We missed you. Here is a special offer.",
    "userIds": ["user-abc-123", "user-def-456"]
  }'
```

### Method 3: Scheduled Notification

Create a notification to be sent later:

```bash
# Step 1: Create the message
curl -X POST https://your-app.replit.app/api/notifications/create \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: your-api-key" \
  -d '{
    "title": "Weekly Summary",
    "body": "Your carb tracking summary is ready!",
    "scheduledFor": "2024-01-15T09:00:00Z"
  }'

# Step 2: Process pending (run on a schedule via cron)
curl -X POST https://your-app.replit.app/api/notifications/process-pending \
  -H "X-Admin-API-Key: your-api-key"
```

---

## User Opt-In Flow

1. User navigates to **Profile > Settings**
2. User toggles **Push Notifications** to ON
3. App requests system notification permission
4. On approval, device is registered with the server
5. User can disable notifications anytime (device is unregistered)

---

## Custom Data Payloads

Include custom data to enable deep linking or custom behavior:

```json
{
  "title": "New Meal Logged",
  "body": "Tap to view your lunch analysis",
  "data": {
    "type": "meal_logged",
    "mealId": "meal-123",
    "screen": "MealDetail"
  }
}
```

The app can read this data when the user taps the notification.

---

## Security

- **Device Registration**: Requires valid carbscan.ai access token. Server validates the token and ensures users can only register their own devices.
- **Admin Endpoints**: Protected by `X-Admin-API-Key` header. Set `ADMIN_API_KEY` environment variable.
- **Token Validation**: All device operations verify the user's identity via carbscan.ai `/auth/me`.

---

## Troubleshooting

### Notifications not being received

1. Verify the user has enabled notifications in Profile settings
2. Check that the device is registered in `device_registrations` table
3. Ensure `ADMIN_API_KEY` is set correctly
4. Confirm the Expo push token is valid (starts with `ExponentPushToken[...]`)

### API returns 401 Unauthorized

- For device endpoints: User's access token is invalid or expired
- For admin endpoints: `X-Admin-API-Key` header is missing or incorrect

### API returns 503 Service Unavailable

- `ADMIN_API_KEY` environment variable is not set

---

## Best Practices

1. **Respect user preferences** - Only send relevant, timely notifications
2. **Test on physical devices** - Push notifications don't work in web preview
3. **Use descriptive titles** - Keep titles under 50 characters
4. **Include actionable content** - Tell users what to do
5. **Schedule wisely** - Avoid sending during late night hours
6. **Monitor delivery rates** - Track sent vs failed counts
