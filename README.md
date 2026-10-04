# Tebakang Edu Club Hub — v2

Premium, animated, mobile-first digital clubhouse for Tebakang Educator FC.

## Stack
- Vercel Hobby — production hosting + GitHub continuous deployment
- GitHub — source control
- Firebase Spark — Firestore + Email/Password Authentication
- No Firebase Storage / no billing dependency

## Public Club Hub
- One production URL with an Admin entry button in the main header
- Realtime Match Centre for upcoming / matchday / live / half-time / full-time
- Safe empty state when no match exists (no hard-coded result fallback)
- Match timeline and Starting XI + bench
- Mobile-first match archive and season filter
- Recent form and automatic H2H records
- Active squad cards with player photos and player profiles
- Historical lineups still resolve archived/inactive players
- Automatic season club stats: matches, W/D/L, goals for/against
- Album-based Gallery with linked-match photo access
- Full-screen photo viewer with swipe navigation
- Live GOAL overlay and match sharing
- Public visibility settings

## Admin Control Room v2
- Mobile bottom navigation: Home / Matches / Squad / More
- Dashboard with active Matchday Control, Next Match and Latest Result
- Compact match creation workflow
- Per-match manager: Info / Lineup / Live / Poster
- Safe edit-state handling when a match is deleted
- Match hide/show and destructive delete confirmation
- Starting XI / Bench tap selector with pitch preview and 11-player cap
- Formation presets
- Realtime live score and event controls
- Full Time confirmation flow
- Opponent manager with compressed logo uploads and duplicate protection
- Squad manager with compressed WebP player photo uploads
- Player Photo Engine: optional automatic in-browser background removal, Cutout/Original choice and photo focus control
- Player Archive/Inactive workflow instead of destructive player deletion
- Gallery Albums: create, link to match, multi-upload, cover, reorder, hide/show, delete
- Public settings and JSON backup
- Poster Studio v2: Matchday / Starting XI / Full Time / MOTM with Signature / Stadium / Elite design systems, featured-player cutouts and one-tap PNG export
- Human-friendly error messages instead of raw Firestore paths
- Save/loading states to prevent accidental double submission
- Production seed/test controls removed

## Data model
- `matches`
- `events`
- `players`
- `opponents`
- `albums`
- `media`
- `settings/public`

## Zero-cost image strategy
Player photos, opponent logos and gallery photos are compressed client-side to WebP before being written to Firestore. Gallery photos are stored as separate media documents rather than packing an entire album into one Firestore document.

Keep the gallery curated because Firestore documents have size limits and image payloads consume database bandwidth. If the media library grows substantially, move image binaries to a dedicated storage/CDN while keeping metadata in Firestore.

## Security
Public reads are allowed for the public club site. Firestore writes require the authenticated administrator UID defined in `firestore.rules`.

## Production
https://tebakang-edu-club-hub.vercel.app


## Player Photo Engine dependency
Automatic background removal uses `@imgly/background-removal` in the browser. The AI model is fetched on first use and cached by the browser; processing stays on the user's device. The package is licensed under AGPL, so preserve the applicable license/source obligations when redistributing or changing the deployment model.
