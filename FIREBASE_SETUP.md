# Firebase setup — Tebakang Edu Club Hub

This project intentionally stays on Firebase Spark / no billing.

## Required Firebase Console steps
1. Build > Firestore Database > Create database.
2. Use Production mode.
3. Authentication > Sign-in method > enable Email/Password.
4. Authentication > Users > Add user. Create only the admin account(s) you control.
5. Copy the admin user's UID.
6. Replace REPLACE_WITH_ADMIN_UID in firestore.rules with that UID.
7. Firestore Database > Rules > paste the updated rules and Publish.
8. Authentication > Settings > Authorized domains > add:
   - tebakang-edu-club-hub.netlify.app

Do not enable Firebase Storage for this architecture. Logos/photos are static GitHub/Netlify assets.

## Collections used
- matches
- matches/{matchId}/events
- players

Public pages use realtime Firestore listeners with static fallback data if Firestore is empty/unavailable.
