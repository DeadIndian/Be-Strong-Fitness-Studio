/**
 * The browser's Firebase handle, built on first use rather than on import.
 *
 * A client component is also rendered on the server, so initialising at module
 * scope ran getAuth() during SSR and a missing or wrong key took the whole login
 * page down with a 500 — before the form could say so in words. Asking for it
 * inside the click keeps the failure where readableError() can read it.
 */

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cached = null;

/** Throws Firebase's own error (auth/invalid-api-key and friends) — call it inside a try. */
export function clientAuth() {
	if (cached) return cached;
	const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
	cached = getAuth(app);
	// The session cookie is the session; a persisted browser copy only goes stale.
	setPersistence(cached, inMemoryPersistence).catch(() => {});
	return cached;
}
