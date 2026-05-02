# Setup Guide

Step-by-step instructions for deploying your own copy of this recipe catalog.

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- Firebase CLI: `npm install -g firebase-tools`
- A [Google account](https://accounts.google.com/) (for Firebase)
- An [Anthropic account](https://console.anthropic.com/) (for Claude AI)
- Git

---

## Steps

### 1. Fork and clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_FORK.git
cd YOUR_FORK
```

### 2. Create your config file

```bash
cp config.example.js config.js
```

You'll fill in the values in `config.js` as you complete the steps below.

### 3. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com/)
2. Click **Add project** and follow the prompts
3. Note your **Project ID** (e.g. `my-recipe-catalog`)

### 4. Enable Google Authentication

1. In Firebase Console, go to **Authentication > Sign-in method**
2. Click **Google** and enable it
3. Set a support email and save

### 5. Register a web app and copy credentials

1. Go to **Project Settings > General > Your apps**
2. Click **Add app** > Web (`</>`)
3. Register the app (no need to enable Hosting here)
4. Copy the `firebaseConfig` object values into the `firebase` block in `config.js`

### 6. Update Firestore rules and Firebase project alias

Edit `firestore.rules` — replace the placeholder emails with the Google account email(s) that should have access:

```js
// Add your users' Google account email addresses here
'you@gmail.com',
'partner@gmail.com'
```

Copy `.firebaserc.example` to `.firebaserc` and fill in your project ID:

```bash
cp .firebaserc.example .firebaserc
```

Then edit `.firebaserc`:

```json
{
  "projects": {
    "default": "my-recipe-catalog"
  }
}
```

### 7. Create your Firestore database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** (your rules from step 6 will lock it down)
4. Select a region close to your users and click **Enable**

### 8. Deploy Firestore rules

```bash
firebase login
firebase deploy --only firestore:rules
```

### 9. Get your Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an API key

### 10. Upgrade Firebase to the Blaze plan

Cloud Functions require Firebase's **Blaze (pay-as-you-go)** plan. The free Spark plan does not support them.

1. In Firebase Console, go to the gear icon > **Usage and billing**
2. Click **Modify plan** and select **Blaze**
3. Add a billing account (you won't be charged unless usage exceeds the free tier, which is generous for personal use)

### 11. Set the Anthropic API key as a Firebase Secret

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```

Paste your API key when prompted.

### 12. Deploy Cloud Functions and copy the proxy URL

Before deploying, open `functions/index.js` and replace `YOUR_PROJECT_ID` in the `APP_DOMAIN` variable with your actual Firebase project ID. This is used for push notification deep links.

```bash
firebase deploy --only functions
```

After deploying, the console will print the `claudeProxy` URL. It looks like:

```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/claudeProxy
```

Copy this URL and paste it into `config.js` as the value for `claudeProxyUrl`.

### 13. Get your VAPID key for push notifications

1. In Firebase Console, go to **Project Settings > Cloud Messaging**
2. Scroll to **Web Push certificates**
3. Click **Generate key pair**
4. Copy the key and paste it into `config.js` as the value for `vapidKey`

### 14. Deploy the app

```bash
firebase deploy --only hosting
```

Your app is now live at `https://YOUR_PROJECT_ID.web.app`.

### 15. Authorize your domain

1. In Firebase Console, go to **Authentication > Settings > Authorized domains**
2. Click **Add domain**
3. Enter `YOUR_PROJECT_ID.web.app`

### 16. Add users to Firestore

For each email address you added to `firestore.rules`:

1. Go to **Firebase Console > Firestore Database**
2. Click **Start collection** (if it doesn't exist yet) and name it `allowedUsers`
3. Add a document with:
   - **Document ID**: the user's full email address (e.g. `you@gmail.com`)
   - **Field**: `active` (boolean) = `true`

Repeat for each user.

### 17. Set up GitHub Actions auto-deploy (optional)

You can configure GitHub Actions to automatically deploy to Firebase when you push to `main`.

1. Generate a Firebase CI token:
   ```bash
   firebase login:ci
   ```
   Copy the token that is printed.

2. In your GitHub repo, go to **Settings > Secrets and variables > Actions**:
   - Add a **Secret**: `FIREBASE_TOKEN` = (paste the token)
   - Add a **Variable**: `FIREBASE_PROJECT_ID` = your Firebase project ID

3. Create `.github/workflows/firebase-deploy.yml` with a workflow that runs `firebase deploy` on push to `main`. The Firebase CLI docs have a ready-made example.

### 18. Customize app branding

In `config.js`, update:
- `appName` — shown in the browser tab, sidebar, login screen, and notifications
- `ownerNames` — used in Claude's system prompt (e.g. `"John & Jane"`)

---

## After Setup

- To add more users: add their email to `firestore.rules` (and redeploy rules) and add a document to the `allowedUsers` Firestore collection.
- To update the app: edit `index.html` and push to `main`.
- To update Cloud Functions: edit `functions/index.js` and push to `main` (or run `firebase deploy --only functions`).
