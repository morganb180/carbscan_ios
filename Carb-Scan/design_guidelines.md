# CarbScan Mobile App - Design Guidelines v2.0 (Ruthless v1)

## Design Principles

| Principle             | Meaning in practice                                         |
| --------------------- | ----------------------------------------------------------- |
| Utility-first         | Get in, get value, get out.                                 |
| One primary action    | Every screen has exactly one dominant action.               |
| Calm confidence       | Estimates feel trustworthy without feeling clinical.        |
| Minimal color         | Color is used for actions and states, not decoration.       |
| Content breathes      | Generous spacing reduces fatigue.                           |
| Fast feedback         | Every tap responds instantly (visual feedback < 100ms).     |
| Forgiving             | Undo where it matters. No punishment.                       |
| Accessible by default | Dynamic type, reduced motion support, screen reader labels. |

## Color Palette (Light Theme)

### Neutrals
- `bg` = `#FAFAF8` (screen background)
- `surface` = `#FFFFFF` (card background)
- `surfaceAlt` = `#F3F4F2` (alternate surface)
- `surfacePressed` = `#EDEEE9` (pressed state)
- `border` = `#E6E7E3` (dividers)
- `text` = `#111214` (primary text)
- `textSecondary` = `#4A4E55` (secondary text)
- `textTertiary` = `#717680` (tertiary text)
- `textInverse` = `#FFFFFF` (text on accent)
- `icon` = `#2A2D33` (icons)

### Accent
- `accent` = `#3B82F6` (primary action)
- `accentPressed` = `#2563EB` (pressed state)
- `accentSoft` = `#E8F1FF` (soft accent bg)

### Status
- `success` = `#16A34A`
- `successSoft` = `#EAF7EE`
- `warning` = `#F59E0B`
- `warningSoft` = `#FFF5E6`
- `danger` = `#DC2626`
- `dangerSoft` = `#FDECEC`

### Overlays
- `scrim` = `rgba(17, 18, 20, 0.45)` (modal backdrops)

## Typography (System Fonts)

| Token       | Size/Line Height | Weight |
|-------------|------------------|--------|
| display     | 28/34            | 700    |
| h1          | 22/28            | 700    |
| h2          | 18/24            | 600    |
| body        | 16/22            | 400    |
| bodyMedium  | 16/22            | 500    |
| button      | 16/22            | 600    |
| caption     | 13/18            | 400    |
| micro       | 12/16            | 400    |

**Rules:**
- Allow dynamic type
- Headlines max 2 lines
- Avoid paragraphs longer than 3 lines
- No em dashes in user copy

## Spacing (8-pt Grid)

| Token | Value |
|-------|-------|
| s1    | 4     |
| s2    | 8     |
| s3    | 12    |
| s4    | 16    |
| s5    | 20    |
| s6    | 24    |
| s7    | 32    |
| s8    | 40    |
| s9    | 48    |

**Screen padding:** Horizontal `s4` (16)

## Border Radius

| Token  | Value |
|--------|-------|
| r1     | 8     |
| r2     | 12    |
| r3     | 16    |
| r4     | 20    |
| rFull  | 9999  |

## Shadows

### Card Shadow (iOS)
- shadowOpacity: 0.06
- shadowRadius: 10
- shadowOffset: 0/4
- Android: elevation 2

### Modal Shadow (iOS)
- shadowOpacity: 0.12
- shadowRadius: 20
- shadowOffset: 0/8
- Android: elevation 6

## Motion

- Press feedback: 100ms
- Modal/sheet: 250ms
- Reduced motion: disable non-essential animation

## Component Inventory

### Buttons
- **Variants:** primary, secondary, ghost, destructive
- **Sizes:** medium (48px), large (56px)
- **States:** default, pressed, disabled, loading
- **Tap feedback:** opacity + subtle scale (0.98)
- **Minimum 44px target**

### Cards
- Background: `surface`
- Border radius: `r3`
- Padding: `s4`
- Shadow: card shadow

### Bottom Sheet / Modal
- Border radius: `r4` (top corners)
- Scrim overlay
- Primary button at bottom
- Drag handle centered at top

### Toast
- Appears from bottom
- Auto-dismiss after 5 seconds
- Optional action button (e.g., "Undo")

## Screen Specifications

### 1. Promise / Entry Screen
- A/B testing headline variants
- Primary CTA: "Scan a meal"
- Secondary: "Try a sample photo"
- Tertiary: "Watch a 5-second demo" (inline expand)
- Trust line: "No account needed to try."

### 2. Camera Screen
- Permission primer bottom sheet if undetermined
- Denied state with "Open Settings" button
- Overlay text: "Center your meal in the frame"
- Capture button with haptic feedback
- Image compression to max 1200px

### 3. Results Screen
- Total carbs (display typography)
- Range line with uncertainty note
- Confidence indicator (High/Medium/Low)
- Editable item list
- Primary CTA: "Save scan"
- Secondary: "Scan again"
- Undo toast after save

### 4. Home Screen
- Header: App icon + "CarbScan"
- Primary CTA: "Scan a meal" (floating button)
- Section: "Recent scans" with history list
- Skeleton loading states
- Empty state for no scans

### 5. Save Gate Modal
- Title: "Save this scan?"
- Auth options: Apple, Google, Email
- Trust line: "We don't sell personal data."

### 6. Notifications Permission
- Deferred until after first save
- Title: "Want a helpful nudge?"
- Primary: "Enable notifications"
- Secondary: "Maybe later" (defer 7 days)

## Accessibility Requirements

- Dynamic type support
- Minimum 44px touch targets
- Screen reader labels on all interactive elements
- High contrast (AA compliance)
- Reduced motion support
- Haptic feedback on interactions
- VoiceOver announcements for state changes

## Analytics Events

All events include: variant, sessionId, screenName, platform, timestamp, isAuthenticated

- `screen_viewed`
- `cta_tapped`
- `permission_prompted`
- `permission_result`
- `photo_captured`
- `scan_completed`
- `item_edited`
- `save_tapped`
- `save_completed`
- `save_undone`

## Experimentation

- A/B variant assigned on first launch
- Persisted in AsyncStorage
- Variants only affect Promise headline/subhead
- Attached to all analytics events
