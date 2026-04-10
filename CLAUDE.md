# Recipe Catalog — AI Session Guide

This file provides context for Claude Code sessions working on this codebase.

---

## What This Is

A self-hostable private recipe catalog web app. Users save, browse, and discover recipes. Claude is integrated directly as a recipe suggestion assistant via a Cloud Function proxy.

The app is designed for a small group of users (2 by default, easily extended). Authentication is Google OAuth; only whitelisted emails can sign in.

---

## Architecture

Fully static single-page app hosted on Firebase Hosting. No traditional backend.

```
Firebase Hosting (static)
├── index.html               — entire frontend SPA (HTML + CSS + JS in one file)
├── config.js                — runtime config (not committed; copy from config.example.js)
├── config.example.js        — template with placeholder values
├── favicon.svg              — app icon
├── firebase-messaging-sw.js — service worker for push notifications
├── firebase.json            — Firebase deploy config
├── .firebaserc              — Firebase project alias
├── firestore.rules          — Firestore security rules
└── functions/               — Cloud Functions source

Firebase services
├── Hosting         — static frontend
├── Authentication  — Google OAuth, restricted to whitelisted emails
├── Firestore       — recipe storage (NoSQL)
└── Cloud Functions — claudeProxy (Anthropic API proxy), sendDinnerSuggestion, getCustomToken

Anthropic API
└── Called via claudeProxy Cloud Function — never directly from the browser
```

---

## config.js

Loaded as a `<script>` tag before `index.html` runs. Sets `window.APP_CONFIG`. Not committed — users copy `config.example.js` to `config.js` and fill in their values.

| Key | What it is | Where to get it |
|-----|-----------|-----------------|
| `appName` | Display name in browser tab, sidebar, and notifications | Choose freely |
| `ownerNames` | Name(s) injected into Claude's system prompt | Choose freely |
| `firebase.apiKey` | Firebase Web API key | Firebase Console > Project Settings > General > Your apps > Web app |
| `firebase.authDomain` | Firebase auth domain | Same location as apiKey |
| `firebase.projectId` | Firebase project ID | Same location as apiKey |
| `firebase.storageBucket` | Firebase storage bucket | Same location as apiKey |
| `firebase.messagingSenderId` | FCM sender ID | Same location as apiKey |
| `firebase.appId` | Firebase app ID | Same location as apiKey |
| `appDomain` | Full hosting URL, no trailing slash | `https://YOUR_PROJECT_ID.web.app` after deploy |
| `claudeProxyUrl` | URL of the deployed `claudeProxy` Cloud Function | Printed after `firebase deploy --only functions` |
| `vapidKey` | VAPID public key for push notifications | Firebase Console > Project Settings > Cloud Messaging > Web Push certificates |

---

## Firestore Schema

Collection: `recipes` — each document has:
- `title` (string)
- `category` (string) — Dinner | Lunch | Breakfast | Snack | Dessert | Side
- `rating` (number) — 1–5
- `favorite` (boolean)
- `cook_time` (number) — minutes
- `tags` (array of strings)
- `date` (string) — YYYY-MM-DD
- `notes` (string)
- `components` (array of objects) — each has: `name`, `ingredients` (string[]), `steps` (string[])
- `createdBy` (string) — email of who saved it
- `updatedAt` (string) — ISO timestamp

Other collections: `settings/notifications`, `fcm_tokens/{uid}`, `pantry/{docId}`, `allowedUsers/{email}`, `sharedLinks/{token}`

---

## Cloud Functions (`functions/index.js`)

| Function | Type | Purpose |
|----------|------|---------|
| `claudeProxy` | HTTP | Proxies `{system, messages}` to Anthropic API; verifies Firebase ID token and `allowedUsers` before forwarding |
| `sendDinnerSuggestion` | Scheduled (hourly) | Reads notification settings, picks top-rated recipes, asks Claude Haiku for a dinner idea, sends FCM push to all users |
| `getCustomToken` | Callable | Cross-app SSO helper — exchanges a verified session for a custom Firebase token |

The Anthropic API key is stored as a Firebase Secret (`ANTHROPIC_API_KEY`), never in code.

**Important:** `functions/index.js` has a `baseUrl` placeholder (`YOUR_PROJECT_ID.web.app`). When helping a user deploy, remind them to update this to their actual domain before deploying functions, or the push notification deep links will be broken.

---

## Frontend (`index.html`)

Single HTML file, vanilla JS, no build step. State is managed in a single `state` object; `render()` re-renders `#root` on every change.

Key functions:
- `render()` — full re-render
- `renderDetail(r)` — recipe detail view
- `renderForm()` — add/edit form
- `renderChatPanelInner()` — Claude chat panel
- `formatStep(s, ingredients)` — renders step with bolded quantities and inline ingredient amounts
- `saveRecipe()` — writes to Firestore
- `deleteRecipe(id)` — deletes from Firestore
- `sendChat(message)` — calls `claudeProxy`, parses recipe JSON from response
- `loadRecipeFromChat()` — loads Claude-suggested recipe into the add form

Claude responds with conversational text plus a recipe JSON block wrapped in `<recipe>` tags. The app strips the JSON from the displayed message and shows a "Load into form" button.

---

## How to Help a User Deploy Their Own Copy

1. Have them follow `SETUP.md` step by step.
2. Common blockers:
   - Forgot to update `firestore.rules` with their email(s)
   - Forgot to add their email to `allowedUsers` in Firestore Console
   - Deployed functions before setting the `ANTHROPIC_API_KEY` secret
   - `claudeProxyUrl` in `config.js` not updated after deploying functions
   - `baseUrl` in `functions/index.js` still says `YOUR_PROJECT_ID` — push notifications will have broken deep links
3. After changes to `index.html` or static files: `firebase deploy --only hosting`
4. After changes to `functions/index.js`: `firebase deploy --only functions`
5. After changes to `firestore.rules`: `firebase deploy --only firestore:rules`

---

## Development Workflow

1. Edit `index.html` (frontend) or `functions/index.js` (Cloud Functions)
2. Push to `main` — GitHub Actions auto-deploys the relevant service
3. Test on mobile with a hard refresh or incognito tab to bypass cache
4. No build step, no npm for the frontend — just edit and push

GitHub Actions workflows in `.github/workflows/`:
- `deploy-hosting.yml` — triggers on any push to main
- `deploy-functions.yml` — triggers when `functions/**` changes
- `deploy-firestore-rules.yml` — triggers when `firestore.rules` changes

Requires GitHub secret `FIREBASE_TOKEN` and variable `FIREBASE_PROJECT_ID`.
