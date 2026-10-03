# Tebakang Edu Club Hub

Animated, mobile-first digital clubhouse for Tebakang Educator FC.

## Current prototype
- Dark premium animated interface
- Tebakang Educator FC official crest
- Match ticker
- Latest result / Match Centre
- Overview, Timeline, Lineup and Stats tabs
- Match archive
- Squad cards
- Responsive mobile-first layout
- Netlify-ready static deployment

## Data strategy
The prototype is intentionally static first. Firebase Spark will later provide:
- Firestore: matches, seasons, players, opponents, match events
- Firebase Auth: admin login
- Realtime listeners: live score and live events

Images stay in the Git repository/static assets for a zero-billing setup.

## Netlify
No build command is required. Publish directory is the project root (`.`).

## Important
`assets/katma-placeholder.svg` is only a temporary placeholder. Replace it with the official KATMA crest before the production launch.
