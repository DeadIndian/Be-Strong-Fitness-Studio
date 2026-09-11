/**
 * The room's light, read off the clock.
 *
 * The visitor arrives at some actual hour of some actual day, and the studio's
 * hours table already knows whether the doors are open. That is enough to light
 * the hall truthfully: dawn light at 06:40, sodium over the desk at 21:00,
 * shutters down at 03:00. The light is a fact the page already has, so it may as
 * well be true rather than a mood somebody picked.
 *
 * Pure arithmetic over a Date and the owner's hours. Kept in .mjs so both Next
 * and `node --test` import it unchanged. Nothing here reads the DOM, three.js or
 * the theme: colours that belong to the owner's palette are named, not hard-coded,
 * and the rig resolves them.
 */

import { clockInZone, formatMinutes, openState } from "../site/hours.mjs";

/**
 * Six phases of a day, by the studio's own wall clock. The boundaries are where
 * the light in a real room actually changes, which is why they are not six equal
 * blocks: nothing happens between 11:00 and 15:00 but flat brightness, and
 * everything happens in the ninety minutes around sunrise.
 */
export const PHASES = ["night", "dawn", "morning", "midday", "afternoon", "evening"];

const PHASE_BANDS = [
	// [firstMinute, phase] — ascending, first band is the wrap from midnight.
	[0, "night"],
	[240, "dawn"], // 04:00
	[420, "morning"], // 07:00
	[660, "midday"], // 11:00
	[900, "afternoon"], // 15:00
	[1080, "evening"], // 18:00
	[1290, "night"], // 21:30
];

/**
 * What each phase does to the room.
 *
 *   exposure  tone-mapping exposure, so the whole frame breathes with the hour
 *   ambient   flat fill, the light that has bounced off everything
 *   strip     the overhead strip's intensity; its colour is the owner's --action
 *   sun       light through the back window: its own colour, and how high it is
 *   sodium    the warm lamp over the desk, which only earns its place at night
 *   crowd     how many other people are in here
 *
 * `sun.elevation` is 0 at the horizon and 1 overhead; the rig places the light
 * and brightens the window plane from it, so one number moves both.
 */
const PHASE_LIGHT = {
	night: { exposure: 0.82, ambient: 0.1, strip: 1.15, sun: { color: "#12203a", intensity: 0.16, elevation: 0.04 }, sodium: 1, crowd: 3 },
	dawn: { exposure: 0.95, ambient: 0.16, strip: 0.7, sun: { color: "#ff9f5e", intensity: 0.85, elevation: 0.1 }, sodium: 0.25, crowd: 2 },
	morning: { exposure: 1.06, ambient: 0.3, strip: 0.45, sun: { color: "#dceaff", intensity: 1.7, elevation: 0.42 }, sodium: 0, crowd: 4 },
	midday: { exposure: 1.12, ambient: 0.38, strip: 0.12, sun: { color: "#ffffff", intensity: 2.1, elevation: 0.9 }, sodium: 0, crowd: 2 },
	afternoon: { exposure: 1.04, ambient: 0.3, strip: 0.3, sun: { color: "#ffe0bd", intensity: 1.6, elevation: 0.45 }, sodium: 0, crowd: 3 },
	evening: { exposure: 0.96, ambient: 0.18, strip: 0.95, sun: { color: "#ff7a3c", intensity: 1.05, elevation: 0.08 }, sodium: 0.5, crowd: 6 },
};

/** Which phase a studio-local minute-of-day falls in. */
export function phaseAt(minutes) {
	const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
	let phase = PHASE_BANDS[0][1];
	for (const [start, name] of PHASE_BANDS) {
		if (m >= start) phase = name;
	}
	return phase;
}

/**
 * The line printed at the door. It says one thing the visitor came to know and
 * nothing else. With no hours on file it says nothing at all — an empty studio
 * table is not licence to invent an opening time.
 */
export function doorLine(state) {
	if (!state) return "";
	if (state.open) {
		return state.closesAt === null ? "Come in — open now" : `Come in — open until ${formatMinutes(state.closesAt)}`;
	}
	if (!state.nextOpen) return "";
	const when =
		state.nextOpen.inDays === 0
			? formatMinutes(state.nextOpen.at)
			: state.nextOpen.inDays === 1
				? `tomorrow ${formatMinutes(state.nextOpen.at)}`
				: `${state.nextOpen.day} ${formatMinutes(state.nextOpen.at)}`;
	return `Shutters down. Opens ${when}`;
}

/**
 * Everything the rig and the door need, from one Date and the owner's hours.
 *
 * Phase is time; the shutter is the hours table. The two are deliberately
 * independent — a studio shut at noon is a shut studio in full daylight, not a
 * night scene — and the crowd follows the shutter, because a closed gym is empty
 * whatever the hour.
 */
export function roomState(date, hours) {
	const timezone = hours?.timezone || "Asia/Kolkata";
	const clock = clockInZone(date instanceof Date ? date : new Date(date), timezone);
	const state = openState(hours?.days, clock);
	const phase = phaseAt(clock.minutes);
	const spec = PHASE_LIGHT[phase];

	return {
		clock,
		phase,
		open: state.open,
		closesAt: state.closesAt,
		nextOpen: state.nextOpen,
		today: state.today,
		doorLine: doorLine(state),
		shutter: state.open ? 0 : 1,
		crowd: state.open ? spec.crowd : 0,
		light: {
			key: phase,
			exposure: spec.exposure,
			ambient: spec.ambient,
			// Shutters down darkens the hall without changing the hour outside.
			strip: state.open ? spec.strip : Math.min(spec.strip, 0.22),
			sun: { ...spec.sun },
			sodium: state.open ? spec.sodium : spec.sodium * 0.4,
		},
	};
}
