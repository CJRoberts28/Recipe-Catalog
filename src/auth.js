import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Checks whether an email is in the allowedUsers Firestore collection.
 * Each document in allowedUsers has the email as its ID and { active: true }.
 * Manage access in Firebase Console: Firestore > allowedUsers collection.
 */
export async function checkAllowed(email, db) {
  try {
    const snap = await getDoc(doc(db, "allowedUsers", email));
    return snap.exists() && snap.data().active === true;
  } catch (e) {
    console.error("checkAllowed error:", e);
    return false;
  }
}
