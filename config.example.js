// config.example.js — template for your deployment config
// Copy this file to config.js and fill in your values.
// See SETUP.md for step-by-step instructions.

window.APP_CONFIG = {
  // App branding — shown in the browser tab, sidebar, login screen, and notifications
  appName: "My Recipe Catalog",       // e.g. "Smith Family Recipes", "Our Kitchen"
  ownerNames: "Us",                   // e.g. "John & Jane", "The Smiths" — used in Claude's system prompt

  // Firebase project config
  // Get from: Firebase Console > Project Settings > General > Your apps > Web app
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  },

  // Your Firebase Hosting domain (no trailing slash)
  // Default after deploy: https://YOUR_PROJECT_ID.web.app
  appDomain: "https://YOUR_PROJECT_ID.web.app",

  // Cloud Functions URL — fill in after deploying functions
  // Format: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/claudeProxy
  claudeProxyUrl: "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/claudeProxy",

  // VAPID key for push notifications
  // Get from: Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
  vapidKey: "YOUR_VAPID_KEY"
};
