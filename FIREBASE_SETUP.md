# Firebase setup — Tebakang Edu Club Hub v2

The Club Hub is designed to stay on Firebase Spark / no billing.

## Required Firebase services
1. Firestore Database
2. Authentication with Email/Password enabled
3. One controlled administrator account whose UID matches `firestore.rules`

## Production domain
The production site is:
- tebakang-edu-club-hub.vercel.app

If a Firebase Authentication feature requires an authorized domain, use the Vercel production domain above. Netlify is no longer part of the production architecture.

## Collections used
- matches
- events
- players
- opponents
- albums
- media
- settings/public

## Images
Firebase Storage is intentionally not required for the current zero-cost architecture.

The browser compresses:
- player photos to WebP before saving
- opponent logos to WebP before saving
- gallery photos to WebP before saving

Gallery photos are stored as separate documents so an album is not constrained to one large Firestore document.

## Realtime behavior
Public pages read Firestore in realtime. Deleted or hidden matches disappear from the public dataset immediately. If no match exists, the Match Centre renders a true empty state rather than static fallback match data.

## Rules
The repository `firestore.rules` allows public reads and restricts all writes to the authenticated administrator UID.
