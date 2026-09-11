import { strict as assert } from "node:assert";
import test from "node:test";
import { SITE_DEFAULTS } from "../site/defaults.js";
import { PHASES, doorLine, phaseAt, roomState } from "./clock.mjs";

const HOURS = SITE_DEFAULTS.hours;

// A Date that lands on a known wall-clock time in Asia/Kolkata (UTC+5:30).
const kolkata = (day, hhmm) => {
	const [h, m] = hhmm.split(":").map(Number);
	// 2026-09-06 is a Sunday; add `day` to reach the weekday we want.
	return new Date(Date.UTC(2026, 8, 6 + day, h, m) - 5.5 * 3600 * 1000);
};

test("every band maps to a declared phase", () => {
	for (let minute = 0; minute < 1440; minute += 1) {
		assert.ok(PHASES.includes(phaseAt(minute)), `minute ${minute}`);
	}
});

test("phase boundaries land where the light actually changes", () => {
	assert.equal(phaseAt(0), "night");
	assert.equal(phaseAt(239), "night");
	assert.equal(phaseAt(240), "dawn");
	assert.equal(phaseAt(419), "dawn");
	assert.equal(phaseAt(420), "morning");
	assert.equal(phaseAt(660), "midday");
	assert.equal(phaseAt(900), "afternoon");
	assert.equal(phaseAt(1080), "evening");
	assert.equal(phaseAt(1289), "evening");
	assert.equal(phaseAt(1290), "night");
	// Out of range wraps rather than throwing: a clock is a circle.
	assert.equal(phaseAt(1440), "night");
	assert.equal(phaseAt(-60), "night", "-60 is 23:00");
});

test("06:40 on a weekday is an open dawn gym", () => {
	const room = roomState(kolkata(1, "06:40"), HOURS);
	assert.equal(room.phase, "dawn");
	assert.equal(room.open, true);
	assert.equal(room.shutter, 0);
	assert.ok(room.crowd >= 1);
	assert.match(room.doorLine, /^Come in — open until /);
	assert.ok(room.light.sun.elevation < 0.2, "the sun is still low");
});

test("03:00 has the shutter down and says when it opens", () => {
	const room = roomState(kolkata(1, "03:00"), HOURS);
	assert.equal(room.open, false);
	assert.equal(room.shutter, 1);
	assert.equal(room.crowd, 0, "a closed gym is an empty gym");
	assert.equal(room.doorLine, "Shutters down. Opens 5:00 am");
	assert.ok(room.light.strip <= 0.22, "shutters down darkens the hall");
});

test("21:00 is open, sodium-lit and busy", () => {
	const room = roomState(kolkata(1, "21:00"), HOURS);
	assert.equal(room.phase, "evening");
	assert.equal(room.open, true);
	assert.ok(room.light.sodium > 0, "the lamp over the desk is on");
	assert.ok(room.crowd >= 5, "evening is the busiest hour");
});

test("Sunday's midday gap is closed without turning midday into night", () => {
	// Sunday runs 06:00–12:00 then 18:00–21:30, so 15:00 is a shut daylit gym.
	const room = roomState(kolkata(0, "15:00"), HOURS);
	assert.equal(room.phase, "afternoon");
	assert.equal(room.open, false);
	assert.equal(room.shutter, 1);
	assert.equal(room.doorLine, "Shutters down. Opens 6:00 pm");
	assert.ok(room.light.sun.intensity > 1, "it is still afternoon outside");
});

test("no hours on file invents no opening time", () => {
	const room = roomState(kolkata(1, "09:00"), { timezone: "Asia/Kolkata", days: [] });
	assert.equal(room.open, false);
	assert.equal(room.doorLine, "");
	assert.equal(room.crowd, 0);
});

test("doorLine says nothing it was not given", () => {
	assert.equal(doorLine(null), "");
	assert.equal(doorLine({ open: true, closesAt: null }), "Come in — open now");
	assert.equal(
		doorLine({ open: false, nextOpen: { inDays: 1, at: 300, day: "Monday" } }),
		"Shutters down. Opens tomorrow 5:00 am",
	);
	assert.equal(
		doorLine({ open: false, nextOpen: { inDays: 3, at: 360, day: "Thursday" } }),
		"Shutters down. Opens Thursday 6:00 am",
	);
});
