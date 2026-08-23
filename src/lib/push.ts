/**
 * Mechanic push-notification registration.
 *
 * Requests browser permission, registers the FCM service worker, gets a
 * device token, and hands it to the backend (POST /api/mechanic/push/register-token)
 * so job-assignment alerts can reach this device even when the app is closed.
 *
 * Fully optional: if Firebase isn't configured, permission is denied, or the
 * browser doesn't support push, this silently no-ops — it must never block
 * or break the mechanic app.
 */
import { api } from "../api/client.js";

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

let registered = false;

export async function registerMechanicPush() {
  if (registered) return;
  if (!FIREBASE_CONFIG.apiKey || !VAPID_KEY) return; // not configured — no-op
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const swParams = new URLSearchParams(FIREBASE_CONFIG as Record<string, string>);
    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${swParams.toString()}`
    );

    const { initializeApp } = await import("firebase/app");
    const { getMessaging, getToken } = await import("firebase/messaging");
    const app = initializeApp(FIREBASE_CONFIG, "messaging-app");
    const messaging = getMessaging(app);

    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return;

    await api.post("/api/mechanic/push/register-token", { token, platform: "WEB" });
    registered = true;
  } catch (err) {
    console.warn("[Push] Registration skipped:", (err as Error)?.message);
  }
}
