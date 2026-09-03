/**
 * Photos the owner uploads are stored inline in the settings document: no
 * bucket to configure, no rules to get wrong, and the studio can change a
 * picture without a developer. The cost is a hard size ceiling, so every upload
 * is downscaled to the size the card actually renders and re-encoded until it
 * fits — and the panel shows how much of the ceiling is used.
 */

// Firestore allows 1 MiB per document. Leave room for the text.
export const INLINE_BUDGET = 700_000;
const PER_IMAGE_MAX = 220_000;

export async function inlineImage(file, maxEdge = 480) {
	if (!file.type.startsWith("image/")) {
		throw new Error("That file is not an image.");
	}
	const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
	const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(bitmap.width * scale));
	canvas.height = Math.max(1, Math.round(bitmap.height * scale));
	canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close?.();

	for (const quality of [0.82, 0.68, 0.55]) {
		const url = canvas.toDataURL("image/webp", quality);
		if (url.length <= PER_IMAGE_MAX) return url;
	}
	throw new Error("That photo is too detailed to store here. Crop it and try again.");
}

/** How many bytes of the ceiling the uploaded pictures currently take. */
export function inlineBytes(settings) {
	const sources = [
		settings?.brand?.logoUrl,
		...(settings?.facilities ?? []).map((item) => item.image),
		...(settings?.results ?? []).map((item) => item.image),
	];
	return sources.reduce(
		(total, src) => total + (String(src ?? "").startsWith("data:") ? src.length : 0),
		0,
	);
}
