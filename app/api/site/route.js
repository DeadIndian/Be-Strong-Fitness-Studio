import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/server";
import { USER_ROLES } from "@/lib/constants/auth";
import { getSiteSettings, safeMapEmbed, safeHttpUrl, saveSiteSettings } from "@/lib/site/settings";

export async function GET() {
	return NextResponse.json({ settings: await getSiteSettings() });
}

// The board's own settings: never a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * The owner's one write path into the public board. Shape is constrained by the
 * merge in saveSiteSettings (unknown keys are dropped); the two fields that
 * reach an iframe or an anchor are checked here so the panel can say why they
 * were rejected instead of silently blanking them.
 */
export async function PUT(request) {
	const session = await getSessionContext();
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	if (session.role !== USER_ROLES.STAFF) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	let patch;
	try {
		patch = await request.json();
	} catch {
		return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
	}

	const map = patch?.contact?.mapEmbedUrl;
	if (map && !safeMapEmbed(map)) {
		return NextResponse.json(
			{ error: "That map link is not a Google Maps embed URL. Use Share → Embed a map and paste the src." },
			{ status: 400 },
		);
	}
	const instagram = patch?.contact?.instagram;
	if (instagram && !safeHttpUrl(instagram)) {
		return NextResponse.json(
			{ error: "The Instagram link must be a full https:// address." },
			{ status: 400 },
		);
	}

	try {
		return NextResponse.json({ settings: await saveSiteSettings(patch) });
	} catch (error) {
		console.error("[site] save failed:", error?.message);
		return NextResponse.json(
			{ error: "Could not save. The studio database is not reachable." },
			{ status: 502 },
		);
	}
}
