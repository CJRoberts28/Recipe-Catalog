# Recipe Catalog

A self-hostable private recipe catalog web app. **This repo is a public demo** — browse the live preview at the GitHub Pages link above, then clone and set up your own instance.

## Live Demo

Visit the GitHub Pages site (link in the repo header) to click around a read-only example with sample recipes before deciding to clone.

## Features

- Browse, add, edit, and delete recipes with a clean, book-inspired UI
- Multi-component recipe support (e.g. separate sauce + dough components)
- Recipe categories, ratings, favorites, tags, and cook time
- Serving scaler — scales ingredient quantities on the fly
- Step-by-step cooking mode with built-in timers
- Ingredient substitution tool (Claude AI, requires your own setup)
- AI recipe import — paste any recipe text and it's parsed into the app
- "Claude's Kitchen" chat panel for recipe ideas
- Meal planning view with weekly dinner planner
- Daily push notification with a dinner suggestion
- Shareable recipe links (public read, auth required to browse)
- Designed for small groups (2 users by default, easily extended)

## Stack

- **Frontend**: Single-file HTML/JS — no build step, no framework
- **Auth**: Firebase Google Authentication (allowlisted emails)
- **Database**: Firebase Firestore
- **AI**: Claude via Anthropic API (proxied through a Firebase Cloud Function)
- **Notifications**: Firebase Cloud Messaging + scheduled Cloud Function
- **Hosting**: Firebase Hosting (or any static host)

## Setup Your Own Instance

See [SETUP.md](SETUP.md) for full step-by-step instructions.

Quick version:
1. Fork this repo
2. Create a Firebase project and an Anthropic account
3. Copy `config.example.js` → `config.js` and fill in your values
4. Deploy with `firebase deploy` — live at `https://YOUR_PROJECT_ID.web.app`

## Demo vs. Full App

The GitHub Pages demo is a stripped-down static version:
- Firebase and Claude AI are disabled
- Recipes are hardcoded sample data
- No login, no editing, no saving

The `main` branch contains the full source with all features enabled.
