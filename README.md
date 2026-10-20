# KnightArena Chess — Android-ready MVP + online platform starter

This package combines the existing responsive React/Vite chess demo with an Android Capacitor configuration and an initial Fastify/PostgreSQL API scaffold.

## Included now
- Playable local chess with legal moves, clocks, move history, resign/draw demo, board flip, PGN export.
- Capacitor configuration (`capacitor.config.json`) for wrapping the web build as an Android app.
- Backend starter: health endpoint, account signup/login, JWT auth, profile endpoint, PGN retrieval endpoint, WebSocket placeholder, SQL schema.

## Important: not production-complete
The current client still plays locally. Online live games, server-authoritative clocks, matchmaking, Glicko-2 rating updates, persistent game creation, Stockfish reviews, report/block administration and rating refunds are not implemented yet. The WebSocket endpoint intentionally returns a placeholder rather than pretending online play works. Do not deploy publicly until authentication, validation, tests, TLS, secrets, anti-abuse controls and game actors are completed.

## Run web client
Requires Node.js 20+:
```sh
npm install
npm run dev
```

## Prepare Android project / APK
Requires Android Studio + Android SDK and Java installed on your computer:
```sh
npm install
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```
In Android Studio, build an APK using **Build > Build Bundle(s) / APK(s) > Build APK(s)**. The generated APK is produced by Android Studio; this workspace does not have Android SDK configured, so an APK cannot be compiled here.

## Start backend
Requires PostgreSQL and Node.js 20+:
```sh
cd server
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET
npm install
psql "$DATABASE_URL" -f schema.sql
npm run dev
```
API base defaults to `http://localhost:3000`; `GET /health` checks it. Do not use the example secret in production.

## Project structure
- `src/` — React client
- `capacitor.config.json` — Android wrapper configuration
- `server/src/index.ts` — API starter
- `server/schema.sql` — PostgreSQL schema
- `architecture.md`, `recon.md`, `features.csv` — supplied project planning sources (if included in original archive)

## Build an APK using GitHub Actions (phone-friendly cloud build)

This repository includes `.github/workflows/android-apk.yml`. After the source is uploaded to a GitHub repository:
1. Open the repository in a browser and choose **Actions**.
2. Select **Build KnightArena Android APK**.
3. Tap **Run workflow** (or wait for the first push build to finish).
4. Open the completed run and download the `KnightArena-debug-apk` artifact.
5. Extract the downloaded artifact ZIP; it contains `app-debug.apk`.
6. Open the APK on your Android phone and follow Android's install prompt if you trust the source.

This produces a **debug APK for testing**, not a signed Play Store release. Cloud build success is not guaranteed until the workflow is run; resolve any build error shown by GitHub Actions if one occurs. The app currently supports local play; online multiplayer and the full backend are not yet production-complete.
