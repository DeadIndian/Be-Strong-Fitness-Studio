import { unstable_cache, revalidateTag } from "next/cache";
import { SITE_DEFAULTS } from "./defaults";
import { safeHttpUrl, safeImageSrc, safeMapEmbed, safeTheme, safeZone } from "./sanitize";

export { safeHttpUrl, safeImageSrc, safeMapEmbed, safeTheme, safeZone };

const TAG = "site-settings";
const DOC = "settings/site";

function isPlainObject(value) {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Overrides win, arrays replace wholesale, unknown keys are dropped. */
function merge(base, override) {
	if (!isPlainObject(override)) return base;
	const out = Array.isArray(base) ? base : { ...base };
	for (const [key, value] of Object.entries(override)) {
		if (!(key in out)) continue;
		out[key] = isPlainObject(out[key]) ? merge(out[key], value) : value;
	}
	return out;
}

async function readOverrides() {
	try {
		const { adminDb } = await import("@/lib/firebase/admin");
		const snapshot = await adminDb.doc(DOC).get();
		return snapshot.exists ? snapshot.data() : null;
	} catch (error) {
		// No Firestore, no credentials, or no document: the defaults are the site.
		console.warn("[site-settings] falling back to defaults:", error?.message);
		return null;
	}
}

const readCached = unstable_cache(readOverrides, ["site-settings"], {
	tags: [TAG],
	revalidate: 300,
});

/** The full settings object, defaults filled in and unsafe values dropped. */
export async function getSiteSettings() {
	const settings = merge(SITE_DEFAULTS, await readCached());
	settings.theme = safeTheme(settings.theme);
	settings.brand = { ...settings.brand, logoUrl: safeImageSrc(settings.brand.logoUrl) };
	settings.contact = {
		...settings.contact,
		mapEmbedUrl: safeMapEmbed(settings.contact.mapEmbedUrl),
		mapLinkUrl: safeHttpUrl(settings.contact.mapLinkUrl),
		instagram: safeHttpUrl(settings.contact.instagram),
	};
	settings.facilities = settings.facilities.map((item) => ({
		...item,
		zone: safeZone(item.zone),
		image: safeImageSrc(item.image),
	}));
	settings.results = settings.results.map((item) => ({
		...item,
		image: safeImageSrc(item.image),
	}));
	return settings;
}

export async function saveSiteSettings(patch) {
	const { adminDb } = await import("@/lib/firebase/admin");
	const next = merge(SITE_DEFAULTS, patch);
	await adminDb.doc(DOC).set(next, { merge: true });
	revalidateTag(TAG);
	return next;
}

/** Plans come from settings so an owner price edit binds the checkout too. */
export function findPlan(settings, planId) {
	return settings.plans.find((plan) => plan.id === planId) ?? null;
}

export function themeCss(theme) {
	const safe = safeTheme(theme);
	return `:root{--board:${safe.board};--board-deep:${safe.boardDeep};--tile:${safe.tile};--ink:${safe.ink};--rail:${safe.rail};--action:${safe.action};--accent:${safe.accent};--muted:${safe.muted}}`;
}

/** What the admin panel nags about: real facts the owner has not supplied. */
export function missingFacts(settings) {
	const gaps = [];
	if (!settings.contact.phone) gaps.push("Phone number");
	if (!settings.contact.email) gaps.push("Email address");
	if (!settings.contact.addressLines.length) gaps.push("Street address");
	if (!settings.contact.mapEmbedUrl) gaps.push("Map location");
	// Either no results at all or results still flagged as demonstration rows: both
	// are the same gap on the board, which is that nobody real is on it yet.
	if (!settings.results.length || settings.results.some((result) => result.sample)) {
		gaps.push("Real member results");
	}
	if (!settings.facilities.some((item) => item.image)) gaps.push("Photographs of the room");
	return gaps;
}
