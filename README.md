# Recipe Catalog

A self-hostable private recipe catalog with Claude AI integration.

## Features

- Google sign-in (restricted to a whitelist of email addresses)
- Browse, add, edit, and delete recipes with a clean, minimal UI
- Claude chat panel for recipe ideas — suggests recipes and loads them into the add form with one click
- Push notifications with a daily Claude-generated dinner suggestion
- Recipes synced in real time via Firestore
- Shareable recipe links (public read, auth required to list)
- Designed for small groups (2 users by default, easily extended)

## Stack

- **Frontend**: Static HTML/JS (no build step) on Firebase Hosting
- **Auth**: Firebase Google Authentication (whitelisted emails)
- **Database**: Firebase Firestore
- **AI**: Claude via Anthropic API (proxied through a Cloud Function)
- **Notifications**: Firebase Cloud Messaging + scheduled Cloud Function

## Deployment

See [SETUP.md](SETUP.md) for step-by-step deployment instructions.

The short version:
1. Fork this repo
2. Create a Firebase project and an Anthropic account
3. Copy `config.example.js` to `config.js` and fill in your values
4. Deploy to Firebase Hosting — the app is live at `https://YOUR_PROJECT_ID.web.app`
