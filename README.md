# Tebakang Edu Club Hub — v1.0

Premium, animated, mobile-first digital clubhouse for Tebakang Educator FC.

## Stack
- Vercel Hobby — hosting + continuous deployment
- GitHub — source control
- Firebase Spark — Firestore + Email/Password Authentication
- No Firebase Storage / no billing dependency

## Public Club Hub
- Dynamic Match Centre: upcoming / matchday / live / half-time / full-time
- Realtime scores and match events
- Match timeline
- Starting XI + substitutes
- Match statistics
- Match archive + season filter + historical match viewer
- Recent form
- H2H records generated automatically
- Squad cards with player photos
- Player profiles + season/career stats
- Club season stats + player spotlight
- Media gallery
- Live GOAL overlay
- Match sharing
- Public visibility settings

## Admin Control Room
- Opponent Manager with compressed logo uploads
- Player Manager with compressed face/full-body photos
- Create, edit, hide, restore and delete past/future matches
- Formation, XI, substitutes and Man of the Match
- Live score controls
- Goal / card / substitution / note timeline events
- Optional match statistics
- Media manager
- Season and visibility settings
- JSON backup
- Automatic Matchday / Full Time / Lineup / MOTM Poster Studio

## Zero-cost image strategy
Images are compressed client-side to WebP before being written as small Firestore document fields. This avoids enabling Firebase Storage. Keep the gallery curated because Firestore documents have size limits and image payloads consume database bandwidth.

## Security
Public reads are allowed for the public club site. Firestore writes require the authenticated administrator UID defined in `firestore.rules`.

## Production
https://tebakang-edu-club-hub.vercel.app
