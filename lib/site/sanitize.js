/**
 * Guards for owner-supplied values. Kept out of settings.js so the admin panel
 * can run the same check in the browser — settings.js imports next/cache and
 * cannot cross to the client.
 *
 * Every value here reaches a <style> tag, an iframe src or an anchor href, so
 * anything that does not match is dropped rather than escaped.
 */

import { SITE_DEFAULTS } from "./defaults";

// The zone rule lives with the facilities it describes; re-exported here because the
// admin panel reaches for its guards in one place.
export { safeZone } from "./defaults";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHex(value) {
	return HEX.test(String(value ?? "").trim());
}

export function safeTheme(theme) {
	const out = { ...SITE_DEFAULTS.theme };
	for (const key of Object.keys(out)) {
		const value = String(theme?.[key] ?? "").trim();
		if (isHex(value)) out[key] = value;
	}
	return out;
}

/** Only Google's own embed path passes: an iframe src is code, not content. */
export function safeMapEmbed(url) {
	const raw = String(url ?? "").trim();
	if (!raw) return "";
	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== "https:") return "";
		if (!/(^|\.)google\.com$/.test(parsed.hostname)) return "";
		if (!parsed.pathname.startsWith("/maps/embed")) return "";
		return parsed.toString();
	} catch {
		return "";
	}
}

export function safeHttpUrl(url) {
	const raw = String(url ?? "").trim();
	if (!raw) return "";
	try {
		const parsed = new URL(raw);
		return parsed.protocol === "https:" ? parsed.toString() : "";
	} catch {
		return "";
	}
}

/** An <img src> the owner supplied: our own /public path, https, or an inline upload. */
export function safeImageSrc(value) {
	const raw = String(value ?? "").trim();
	if (!raw) return "";
	if (raw.startsWith("/")) return raw.startsWith("//") ? "" : raw;
	if (/^data:image\/(png|jpeg|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(raw)) return raw;
	return safeHttpUrl(raw);
}
