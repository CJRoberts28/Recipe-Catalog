// cmlb-functions/functions/index.js
// Firebase Cloud Functions for CMLB Recipe Catalog
//
// Deploy: cd cmlb-functions && firebase deploy --only functions
//
// Functions:
//   claudeProxy              — HTTP proxy to Anthropic API (used by chat UI)
//   sendDinnerSuggestion     — Hourly scheduled function; sends daily push notification with a Claude-generated dinner idea

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const ALLOWED_EMAILS = ["c.jonesroberts@gmail.com", "lrobertsmlt@gmail.com"];
const PROXY_MODEL = "claude-sonnet-4-20250514";
const PROXY_MAX_TOKENS = 1000;

// ── claudeProxy ───────────────────────────────────────────────────────────────
// Receives {model, max_tokens, system, messages} from the frontend and proxies
// to the Anthropic API, keeping the API key server-side.
exports.claudeProxy = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // Verify Firebase ID token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const decoded = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
      if (!ALLOWED_EMAILS.includes(decoded.email)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    } catch (e) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const { system, messages } = req.body;
      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY.value(),
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({ model: PROXY_MODEL, max_tokens: PROXY_MAX_TOKENS, system, messages }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error("Anthropic API error:", response.status, errText);
        res.status(502).json({ error: "Upstream error" });
        return;
      }
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("claudeProxy error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  }
);

// ── sendDinnerSuggestion ──────────────────────────────────────────────────────
// Runs at the top of every hour (America/New_York). Checks Firestore for the
// configured notification hour and, if it matches, asks Claude Haiku to suggest
// a dinner based on the recipe catalog, then sends an FCM push to both users.
//
// Firestore reads:
//   settings/notifications  — { enabled, hour, lastSent }
//   fcm_tokens/{uid}        — { token, email, updatedAt }
//   recipes (collection)    — all recipe documents
//
// Guard rails:
//   - settings.enabled must be true
//   - current NY hour must match settings.hour
//   - settings.lastSent must not equal today (prevents duplicate sends)
exports.sendDinnerSuggestion = onSchedule(
  {
    schedule: "0 * * * *",         // every hour, on the hour
    timeZone: "America/New_York",
    secrets: [ANTHROPIC_API_KEY],
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async () => {
    const db = admin.firestore();

    // 1. Read notification settings
    const settingsRef = db.collection("settings").doc("notifications");
    const settingsSnap = await settingsRef.get();
    if (!settingsSnap.exists) {
      console.log("No notification settings found. Skipping.");
      return;
    }
    const settings = settingsSnap.data();
    if (!settings.enabled) {
      console.log("Notifications disabled. Skipping.");
      return;
    }

    // 2. Check current hour in the user's configured timezone (fallback: Pacific)
    const timezone = settings.timezone || "America/Los_Angeles";
    const now = new Date();
    const currentHour = parseInt(
      new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(now)
    );
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now); // "YYYY-MM-DD"

    if (currentHour !== settings.hour) {
      console.log(`Hour mismatch: current=${currentHour}, configured=${settings.hour}. Skipping.`);
      return;
    }

    // 3. Guard: already sent today
    if (settings.lastSent === todayStr) {
      console.log(`Already sent for ${todayStr}. Skipping.`);
      return;
    }

    // 4. Get all registered FCM tokens
    const tokensSnap = await db.collection("fcm_tokens").get();
    if (tokensSnap.empty) {
      console.log("No FCM tokens registered. Skipping.");
      return;
    }
    const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
    if (tokens.length === 0) {
      console.log("No valid tokens found. Skipping.");
      return;
    }

    // 5. Fetch the recipe catalog
    const recipesSnap = await db.collection("recipes").get();
    const recipes = recipesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (recipes.length === 0) {
      console.log("No recipes in catalog. Skipping.");
      return;
    }

    // 6. Build Claude prompt — top-rated/favorited recipes for context, all titles for de-duplication
    const topRecipes = recipes
      .filter(r => (r.rating >= 4) || r.favorite)
      .sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || (b.rating || 0) - (a.rating || 0))
      .slice(0, 15);

    const catalogSummary = topRecipes.map(r =>
      `- ${r.title} (★${r.rating || '?'}${r.favorite ? ', fav' : ''}, tags: ${(r.tags || []).join(', ')})`
    ).join("\n") || "(none yet)";

    const allTitles = recipes.map(r => r.title).join(", ") || "(none)";

    const systemPrompt = `You are a dinner suggestion assistant for Chris and Lindsay's private recipe catalog.
Suggest one specific dinner for tonight. Either revisit a recipe they love or propose something new that fits their taste.
Keep it very short: one sentence for the suggestion name and one sentence explaining why it fits tonight.
Do not include JSON or recipe tags. Be warm and direct.`;

    const userMessage = `Their top-rated and favorite recipes:\n${catalogSummary}\n\nAll recipe titles (for context — don't just repeat these):\n${allTitles}\n\nWhat should they make for dinner tonight?`;

    // 7. Call Claude Haiku for the suggestion
    const anthropicRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY.value(),
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error in sendDinnerSuggestion:", anthropicRes.status, errText);
      return;
    }
    const anthropicData = await anthropicRes.json();
    const suggestion = (anthropicData.content?.[0]?.text || "").trim()
      || "How about revisiting one of your favorites tonight?";

    console.log("Suggestion:", suggestion);

    // 8. Check if suggestion references an existing recipe for deep linking
    const mentionedRecipe = recipes.find(r =>
      suggestion.toLowerCase().includes(r.title.toLowerCase())
    );
    const baseUrl = "https://cjroberts28.github.io/cmlbRecipes/";
    const deepLink = mentionedRecipe
      ? `${baseUrl}?recipeId=${mentionedRecipe.id}`
      : `${baseUrl}?chat=1`;
    const notifData = mentionedRecipe
      ? { type: "existing_recipe", recipeId: mentionedRecipe.id }
      : { type: "new_idea" };

    // 9. Send FCM multicast notification to all registered users
    const notifBody = suggestion.length > 180 ? suggestion.slice(0, 177) + "..." : suggestion;
    const fcmPayload = {
      notification: {
        title: "Tonight's Dinner Idea",
        body: notifBody,
      },
      data: notifData,
      webpush: {
        notification: {
          icon: "https://cjroberts28.github.io/cmlbRecipes/favicon.svg",
          badge: "https://cjroberts28.github.io/cmlbRecipes/favicon.svg",
          requireInteraction: false,
        },
        fcmOptions: {
          link: deepLink,
        },
      },
      tokens,
    };

    const fcmResponse = await admin.messaging().sendEachForMulticast(fcmPayload);
    console.log(`FCM: ${fcmResponse.successCount} sent, ${fcmResponse.failureCount} failed`);

    // 10. Remove stale/invalid tokens (expired or unregistered)
    const staleUids = [];
    fcmResponse.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          const deadToken = tokens[idx];
          tokensSnap.docs.forEach(d => {
            if (d.data().token === deadToken) staleUids.push(d.id);
          });
        }
      }
    });
    if (staleUids.length > 0) {
      const batch = db.batch();
      staleUids.forEach(uid => batch.delete(db.collection("fcm_tokens").doc(uid)));
      await batch.commit();
      console.log(`Removed ${staleUids.length} stale token(s)`);
    }

    // 11. Update lastSent to prevent duplicate sends today
    await settingsRef.update({ lastSent: todayStr });
    console.log(`Done. Dinner suggestion sent for ${todayStr}.`);
  }
);
