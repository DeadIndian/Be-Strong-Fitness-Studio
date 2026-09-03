/**
 * Opening-hours logic for the studio board.
 *
 * Kept in .mjs so both Next and `node --test` can import it unchanged.
 * Times are wall-clock strings ("05:00") in the studio's own timezone; the
 * visitor's device clock is irrelevant, so every read goes through Intl with
 * an explicit timeZone.
 */

export const WEEKDAY_LABELS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

/** "05:30" -> 330. Returns null for anything unparseable. */
export function toMinutes(hhmm) {
	const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
	if (!match) return null;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours > 23 || minutes > 59) return null;
	return hours * 60 + minutes;
}

/** 330 -> "5:30 am", for display. */
export function formatMinutes(total) {
	const minutes = ((Math.round(total) % 1440) + 1440) % 1440;
	const hour24 = Math.floor(minutes / 60);
	const minute = minutes % 60;
	const suffix = hour24 < 12 ? "am" : "pm";
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
	return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** The studio's own wall clock: { day: 0-6, minutes: 0-1439 }. */
export function clockInZone(date, timeZone) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(date);
	const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
	const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
		get("weekday"),
	);
	// Intl renders midnight as "24" in some ICU versions.
	const hour = Number(get("hour")) % 24;
	return { day: day < 0 ? date.getDay() : day, minutes: hour * 60 + Number(get("minute")) };
}

/** Normalized [start, end) pairs for one day, end > 1440 when it crosses midnight. */
function spansForDay(days, dayIndex) {
	const entry = days.find((day) => Number(day.day) === dayIndex);
	if (!entry || !Array.isArray(entry.ranges)) return [];
	const spans = [];
	for (const range of entry.ranges) {
		const start = toMinutes(range?.[0]);
		const close = toMinutes(range?.[1]);
		if (start === null || close === null) continue;
		spans.push([start, close <= start ? close + 1440 : close]);
	}
	return spans.sort((a, b) => a[0] - b[0]);
}

/**
 * Is the studio open at `clock`, and if not, when does it next open?
 * Returns { open, closesAt, nextOpen: { day, dayIndex, at } | null, today }.
 */
export function openState(days, clock) {
	const list = Array.isArray(days) ? days : [];
	const today = spansForDay(list, clock.day);

	for (const [start, end] of today) {
		if (clock.minutes >= start && clock.minutes < end) {
			return { open: true, closesAt: end % 1440, nextOpen: null, today };
		}
	}

	// A span that began yesterday and runs past midnight.
	const yesterdayIndex = (clock.day + 6) % 7;
	for (const [start, end] of spansForDay(list, yesterdayIndex)) {
		if (end > 1440 && clock.minutes < end - 1440) {
			return { open: true, closesAt: (end - 1440) % 1440, nextOpen: null, today };
		}
		void start;
	}

	for (let ahead = 0; ahead < 8; ahead += 1) {
		const dayIndex = (clock.day + ahead) % 7;
		for (const [start] of spansForDay(list, dayIndex)) {
			if (ahead > 0 || start > clock.minutes) {
				return {
					open: false,
					closesAt: null,
					nextOpen: { day: WEEKDAY_LABELS[dayIndex], dayIndex, at: start, inDays: ahead },
					today,
				};
			}
		}
	}

	return { open: false, closesAt: null, nextOpen: null, today };
}
