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

	facilities: [
		{ id: "fac-strength", title: "Strength training", image: "/facilities/strength-training.jpeg" },
		{ id: "fac-general", title: "General training", image: "/facilities/general-training.jpeg" },
		{ id: "fac-cardio", title: "Cardio", image: "/facilities/cardio.jpg" },
		{ id: "fac-boxing", title: "Boxing", image: "/facilities/boxing.jpg" },
		{ id: "fac-karate", title: "Karate", image: "/facilities/karate.jpg" },
		{ id: "fac-zumba", title: "Zumba", image: "/facilities/Zumba.jpg" },
		{ id: "fac-yoga", title: "Yoga", image: "/facilities/yoga.jpg" },
		{ id: "fac-steam", title: "Steam bath", image: "/facilities/steam-bath.jpg" },
		{ id: "fac-massage", title: "Massage chair", image: "/facilities/massage-chair.jpg" },
		{ id: "fac-lockers", title: "Lockers", image: "/facilities/lockers.jpg" },
		{ id: "fac-diet", title: "Diet plan", image: "/facilities/diet-plan.jpg" },
		{ id: "fac-greentea", title: "Green tea", image: "/facilities/green-tea.jpg" },
		{ id: "fac-coffee", title: "Black coffee", image: "/facilities/black-cofee.jpeg" },
	],

	// sample: true is printed on the public board and in the admin panel. These
	// three are demonstration rows, not members, until the owner replaces them.
	results: [
		{ id: "res-1", name: "Jim", detail: "Lost 14 kg", months: 4, image: "/transformations/jim.jpeg", sample: true },
		{ id: "res-2", name: "Sarah", detail: "Lost 11 kg", months: 5, image: "/transformations/sarah.jpg", sample: true },
		{ id: "res-3", name: "Zach", detail: "Gained 7 kg lean mass", months: 8, image: "/transformations/zach.jpg", sample: true },
	],

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
