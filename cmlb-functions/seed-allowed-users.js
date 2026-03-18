// One-time script to seed the allowedUsers Firestore collection.
// Run from the cmlb-functions directory:
//   node seed-allowed-users.js
//
// To add or remove users later, just edit Firebase Console directly:
//   Firestore > allowedUsers > (add/delete documents)

const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json"); // download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "cmlb-recipes",
});

const db = admin.firestore();

const ALLOWED_USERS = [
  "c.jonesroberts@gmail.com",
  "l.robertsmlt@gmail.com",
  "gischris28@gmail.com",
];

async function seed() {
  const batch = db.batch();
  for (const email of ALLOWED_USERS) {
    batch.set(db.collection("allowedUsers").doc(email), { active: true });
  }
  await batch.commit();
  console.log(`Created ${ALLOWED_USERS.length} documents in allowedUsers.`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
