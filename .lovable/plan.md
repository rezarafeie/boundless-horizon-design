

# Mobile VPN App Experience (PWA)

## Overview

This plan transforms your BNETS.CO website into a mobile-first VPN application that users can install on their devices. The app will provide a native VPN app experience with quick connect functionality, subscription management, and usage monitoring.

---

## What You Will Get

### 1. Mobile App Dashboard
A dedicated mobile home screen that looks and feels like a VPN app:
- Large circular "Connect" button with animated status indicator
- Current server location display
- Connection status (Connected/Disconnected/Connecting)
- Quick access to subscription details and QR code

### 2. My Subscriptions Screen
A dedicated screen to manage all your VPN subscriptions:
- List of active subscriptions with status badges
- Time remaining countdown
- Data usage display (if available from panel)
- Quick copy subscription link
- QR code viewer for each subscription

### 3. Bottom Navigation Bar
Mobile-native navigation for quick access:
- Home (Dashboard)
- My VPN (Subscriptions)
- Buy (New subscription)
- Support (Telegram link)

### 4. Improved Install Experience
- Dedicated `/install` page with step-by-step instructions
- Platform detection (iOS/Android) with specific install guides
- Enhanced PWA prompt

### 5. Mobile-Optimized Features
- Pull-to-refresh functionality
- Haptic feedback simulation (vibration on button press)
- Offline mode indicator
- Quick share subscription link
- Save subscription to device storage

---

## New Pages and Components

### New Pages:
1. `/app` - Mobile VPN Dashboard (main app view)
2. `/app/subscriptions` - My Subscriptions list
3. `/install` - App installation instructions

### New Components:
1. `MobileAppLayout.tsx` - Mobile app shell with bottom navigation
2. `VPNDashboard.tsx` - Main dashboard with connect button
3. `SubscriptionsList.tsx` - List of user subscriptions
4. `MobileBottomNav.tsx` - Bottom navigation bar
5. `InstallPage.tsx` - Installation instructions
6. `ConnectionStatusCard.tsx` - VPN-style connection status display

---

## Technical Implementation

### PWA Enhancements:
- Install `vite-plugin-pwa` for proper PWA support
- Configure workbox for offline caching
- Add all required PWA meta tags
- Create proper app icons in multiple sizes

### Data Storage:
- Use localStorage to save user's subscription IDs
- Allow quick access without login
- Sync with Supabase when online

### Mobile-First Design:
- Safe area insets for notched phones
- Touch-friendly button sizes (minimum 44px)
- Swipe gestures for navigation
- Dark mode optimized for AMOLED screens

---

## User Flow

```text
User installs app from browser
        |
        v
Opens to VPN Dashboard
        |
    +---+---+
    |       |
    v       v
Has saved    No saved
subscription subscription
    |            |
    v            v
Shows quick   Shows "Add VPN"
connect UI    button -> /subscription
    |
    v
Tap to copy link
or show QR code
```

---

## File Changes Summary

| File | Action |
|------|--------|
| `package.json` | Add vite-plugin-pwa dependency |
| `vite.config.ts` | Configure PWA plugin |
| `public/manifest.json` | Enhanced with more icons and shortcuts |
| `index.html` | Add mobile meta tags, splash screens |
| `src/App.tsx` | Add new mobile routes |
| `src/pages/MobileApp.tsx` | New - Main mobile dashboard |
| `src/pages/MobileSubscriptions.tsx` | New - Subscriptions list |
| `src/pages/InstallApp.tsx` | New - Installation guide |
| `src/components/mobile/MobileAppLayout.tsx` | New - App shell |
| `src/components/mobile/VPNConnectButton.tsx` | New - Big connect button |
| `src/components/mobile/BottomNavigation.tsx` | New - Bottom nav |
| `src/components/mobile/SubscriptionCard.tsx` | New - Subscription display |
| `src/hooks/useSavedSubscriptions.ts` | New - Local storage hook |

---

## Visual Design

The mobile app will feature:
- Dark gradient backgrounds (matching your current dark theme)
- Glowing connection status indicator (green = active, yellow = pending, red = expired)
- Card-based layout with rounded corners
- Persian/English language support maintained
- Smooth animations for connection status changes

---

## After Installation

Once approved, you will have:
1. A mobile-first VPN app that can be installed to home screen
2. Works offline with cached data
3. Quick access to subscription links and QR codes
4. Native app feel with bottom navigation
5. Push-to-install prompts on mobile browsers

Your users can visit the website, tap "Install App" and have a VPN management app on their home screen that feels like a native application.

