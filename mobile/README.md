# UniSage Mobile App

React Native (Expo) mobile application for UPES CSE students — study smarter with notes, flashcards, quizzes, and progress tracking.

## Tech Stack

- **Framework:** React Native (Expo SDK 50)
- **Navigation:** Expo Router (file-based)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State:** React Context + SWR for data fetching
- **Storage:** AsyncStorage (cache) + SecureStore (JWT)
- **Animations:** React Native Reanimated + Gesture Handler
- **Icons:** @expo/vector-icons (Ionicons)

## Prerequisites

- Node.js 18+
- npm or yarn
- **Expo Go** app on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))
- Backend API running at `http://localhost:3000` (see `../backend/`)

## Quick Start

```bash
# 1. Navigate to mobile directory
cd mobile

# 2. Install dependencies
npm install

# 3. Start Expo dev server
npx expo start
```

Then:
- **Phone:** Scan the QR code with Expo Go
- **Android Emulator:** Press `a`
- **iOS Simulator (Mac only):** Press `i`

## Connecting to Backend

### On Emulator
Works out of the box — the API client uses `http://localhost:3000`.

### On Physical Device
You must use your computer's LAN IP instead of `localhost`. Update `lib/constants.ts`:

```typescript
const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://192.168.X.X:3000'  // ← Your LAN IP
    : 'https://your-production-url.com',
};
```

Find your LAN IP:
```bash
# macOS
ipconfig getifaddr en0

# Windows
ipconfig | findstr "IPv4"

# Linux
hostname -I
```

## Project Structure

```
mobile/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx         # Root layout (providers)
│   ├── index.tsx           # Entry redirect
│   ├── (auth)/             # Auth stack
│   │   ├── splash.tsx      # Splash screen
│   │   ├── login.tsx       # Login form
│   │   └── signup.tsx      # Signup form
│   ├── (tabs)/             # Bottom tab navigator
│   │   ├── index.tsx       # Dashboard / Home
│   │   ├── subjects.tsx    # Subjects list
│   │   ├── progress.tsx    # Progress stats
│   │   └── profile.tsx     # User profile
│   ├── subject/[id].tsx    # Subject detail + units
│   └── content/[id].tsx    # Content viewer (notes/flash/quiz)
├── components/
│   ├── ui/                 # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── StatCard.tsx
│   ├── dashboard/          # Dashboard-specific components
│   │   ├── WelcomeHeader.tsx
│   │   ├── StreakCard.tsx
│   │   ├── TodaysFocus.tsx
│   │   └── SubjectCard.tsx
│   ├── content/            # Content viewer components
│   │   ├── NotesViewer.tsx
│   │   ├── FlashcardViewer.tsx
│   │   └── QuizViewer.tsx
│   └── layout/
│       └── ScreenWrapper.tsx
├── lib/
│   ├── api.ts              # Axios client + interceptors
│   ├── constants.ts        # Colors, spacing, config
│   ├── storage.ts          # AsyncStorage wrapper
│   ├── types.ts            # TypeScript interfaces
│   ├── utils.ts            # Helper functions
│   └── hooks/
│       ├── useAuth.ts      # Auth context + provider
│       ├── useSubjects.ts  # SWR hooks for subjects/units
│       └── useContent.ts   # SWR hooks for content/progress/bookmarks
├── assets/                 # App icons, splash screen
├── app.json                # Expo config
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
└── global.css
```

## Features

### Authentication
- Email/password login & signup
- JWT stored in encrypted SecureStore
- Auto-session restore on app open
- Graceful token expiration handling

### Dashboard
- Welcome header with greeting
- Study streak tracker
- "Today's Focus" — continue where you left off
- Horizontal subject carousel
- Quick stats (quiz avg, study time, completed)

### Subjects
- Search and filter by year
- Subject cards with progress indicators
- Subject detail with expandable unit accordion
- Content type indicators (notes / flashcards / quiz)

### Content Viewers
- **Notes:** Clean reader with scroll progress, bookmark, mark-complete
- **Flashcards:** 3D flip animation, swipe gestures (know/review), shuffle, completion summary
- **Quiz:** Multiple choice, timer, instant feedback, review incorrect, results screen

### Progress
- Overall stats dashboard
- Weekly study time bar chart
- Per-subject breakdown with progress bars

### Offline Support
- Content cached in AsyncStorage
- Offline action queue (progress, bookmarks, quiz attempts)
- Auto-sync when connectivity returns

## Building for Distribution

### Android APK (for testing)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure the project
eas build:configure

# Build preview APK
eas build --platform android --profile preview
```

The APK download link will be provided when the build completes.

### iOS (requires Apple Developer account)

```bash
eas build --platform ios --profile preview
```

### Production Builds

```bash
# Android (AAB for Play Store)
eas build --platform android --profile production

# iOS (IPA for App Store)
eas build --platform ios --profile production
```

## Troubleshooting

### "Network Error" on physical device
→ You're using `localhost`. Switch to your LAN IP in `lib/constants.ts`

### Expo Go crashes on start
→ Clear Expo cache: `npx expo start --clear`

### Metro bundler stuck
→ Kill and restart: `npx expo start --clear`

### NativeWind styles not applying
→ Ensure `global.css` is imported in `app/_layout.tsx`
→ Ensure `metro.config.js` has `withNativeWind` wrapper

### "Unable to resolve module" errors
→ Run `npm install` again then `npx expo start --clear`

### Gesture handler not working
→ Ensure `GestureHandlerRootView` wraps the app in `_layout.tsx`

## Environment Variables

For production, create a `.env` file:
```env
EXPO_PUBLIC_API_URL=https://your-api.com
```

Then update `lib/constants.ts` to use `process.env.EXPO_PUBLIC_API_URL`.

## License

Private — UniSage Platform
