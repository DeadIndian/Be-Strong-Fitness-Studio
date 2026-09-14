/**
 * Every fact the public site shows, with the studio's real evidence seeded and
 * everything unknown left explicitly empty. The owner edits this from
 * /dashboard/staff/website; Firestore `settings/site` holds the overrides and
 * this file is the fallback, so a project with no Firestore still renders.
 *
 * Empty string / empty array means "the owner has not supplied this yet".
 * Nothing here may be invented: an unset fact renders as an empty slot, never
 * as a plausible-looking placeholder on the public board.
 */

export const SITE_DEFAULTS = {
	uiVersion: "2d",

	brand: {
		name: "BE STRONG FITNESS STUDIO",
		shortName: "BE STRONG",
		line: "Neighbourhood strength studio.",
		logoUrl: "/logo.jpg",
	},

	// Admin-editable palette. Every surface reads these as CSS custom properties,
	// and the WebGL rig reads action/accent as its two light colours, so the
	// owner changing the teal changes the light in the room too.
	theme: {
		board: "#0B0B0B",
		boardDeep: "#060606",
		tile: "#FFFFFF",
		ink: "#04100F",
		rail: "#007A73",
		action: "#00B3A4",
		accent: "#FF3B3B",
		muted: "#A0A0A0",
	},

	hours: {
		timezone: "Asia/Kolkata",
		note: "",
		days: [
			{ day: 0, ranges: [["06:00", "12:00"], ["18:00", "21:30"]] },
			{ day: 1, ranges: [["05:00", "22:00"]] },
			{ day: 2, ranges: [["05:00", "22:00"]] },
			{ day: 3, ranges: [["05:00", "22:00"]] },
			{ day: 4, ranges: [["05:00", "22:00"]] },
			{ day: 5, ranges: [["05:00", "22:00"]] },
			{ day: 6, ranges: [["05:00", "22:00"]] },
		],
	},

	// Rank colour is the competition plate for that weight: heavier plate, longer plan.
	// perks are the studio's own standing inclusions, two of each per month.
	plans: [
		{ id: "plan-1m", title: "1 Month", durationMonths: 1, priceInr: 2500, plate: 5, perks: ["2 steam baths", "2 massage chair sessions"] },
		{ id: "plan-2m", title: "2 Months", durationMonths: 2, priceInr: 4500, plate: 10, perks: ["4 steam baths", "4 massage chair sessions"] },
		{ id: "plan-3m", title: "3 Months", durationMonths: 3, priceInr: 6000, plate: 15, perks: ["6 steam baths", "6 massage chair sessions"] },
		{ id: "plan-6m", title: "6 Months", durationMonths: 6, priceInr: 8000, plate: 20, perks: ["12 steam baths", "12 massage chair sessions"] },
		{ id: "plan-12m", title: "12 Months", durationMonths: 12, priceInr: 12000, plate: 25, perks: ["24 steam baths", "24 massage chair sessions"] },
	],

	rules: [
		{ id: "rule-treadmill", label: "Treadmill", detail: "15 minutes per person when others are waiting." },
		{ id: "rule-session", label: "Session length", detail: "Two hours per workout." },
	],

	/*
	 * What is in the room, in the studio's own words. The title is the fact; the
	 * photograph is the owner's to add. Every `image` is deliberately empty — the
	 * seeded stock pictures were of somebody else's gym, and a picture of the wrong
	 * room is worse than no picture, so the board prints the list and waits.
	 *
	 * `zone` is which of the three middle stations a facility is read at, so the owner
	 * adding a sauna can put it with recovery instead of with the barbells. Anything
	 * unzoned reads at the iron, which is where a gym's default answer lives.
	 */
	facilities: [
		{ id: "fac-strength", title: "Strength training", zone: "iron", image: "" },
		{ id: "fac-general", title: "General training", zone: "iron", image: "" },
		{ id: "fac-cardio", title: "Cardio", zone: "iron", image: "" },
		{ id: "fac-boxing", title: "Boxing", zone: "classes", image: "" },
		{ id: "fac-karate", title: "Karate", zone: "classes", image: "" },
		{ id: "fac-zumba", title: "Zumba", zone: "classes", image: "" },
		{ id: "fac-yoga", title: "Yoga", zone: "classes", image: "" },
		{ id: "fac-steam", title: "Steam bath", zone: "recovery", image: "" },
		{ id: "fac-massage", title: "Massage chair", zone: "recovery", image: "" },
		{ id: "fac-lockers", title: "Lockers", zone: "recovery", image: "" },
		{ id: "fac-diet", title: "Diet plan", zone: "recovery", image: "" },
		{ id: "fac-greentea", title: "Green tea", zone: "recovery", image: "" },
		{ id: "fac-coffee", title: "Black coffee", zone: "recovery", image: "" },
	],

	/*
	 * Empty until real members are on the board. There were three demonstration
	 * rows here — invented names against stock photographs — and a fabricated
	 * result is the one thing a gym cannot be caught printing. `missingFacts` asks
	 * the owner for these; the results page says plainly that there are none yet.
	 */
	results: [],

	// Nothing here is known yet. The public board omits any empty field; the
	// admin panel counts them and asks for them.
	contact: {
		phone: "",
		whatsapp: "",
		email: "",
		instagram: "",
		addressLines: [],
		mapEmbedUrl: "",
		mapLinkUrl: "",
	},

	checkout: {
		// Flip to false only when a real gateway is wired. Everything the visitor
		// reads about payment is derived from this flag.
		placeholder: true,
		// The owner's own line about how money actually changes hands while the
		// app takes none. Empty until they write it: we will not guess for them.
		note: "",
	},
};

export const PLATE_COLORS = {
	5: "#EDE6D6",
	10: "#1E7A3C",
	15: "#E8B10A",
	20: "#1B4FA8",
	25: "#C9282D",
};

export function plateColor(kg) {
	return PLATE_COLORS[kg] ?? PLATE_COLORS[25];
}

/** The three middle stations, and the zone a facility falls to when it has none. */
export const ZONES = ["iron", "classes", "recovery"];
export const ZONE_FALLBACK = "iron";

/** Which station a facility is read at. An unknown zone lands at the iron rather than nowhere. */
export function safeZone(value) {
	const raw = String(value ?? "").trim().toLowerCase();
	return ZONES.includes(raw) ? raw : ZONE_FALLBACK;
}

/** The facilities read at one station, in the owner's own order. */
export function facilitiesIn(facilities, zone) {
	return (facilities ?? []).filter((item) => safeZone(item?.zone) === zone);
}

/** Is there anything real to put on the visit section yet? */
export function hasVisitInfo(contact) {
	if (!contact) return false;
	return Boolean(
		contact.addressLines?.length ||
			contact.phone ||
			contact.whatsapp ||
			contact.email ||
			contact.instagram ||
			contact.mapEmbedUrl,
	);
}
