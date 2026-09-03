import assert from "node:assert/strict";
import test from "node:test";
import { clockInZone, openState, toMinutes } from "./hours.mjs";

const WEEK = [
	{ day: 0, ranges: [["06:00", "12:00"], ["18:00", "21:30"]] },
	{ day: 1, ranges: [["05:00", "22:00"]] },
	{ day: 2, ranges: [["05:00", "22:00"]] },
	{ day: 3, ranges: [["05:00", "22:00"]] },
	{ day: 4, ranges: [["05:00", "22:00"]] },
	{ day: 5, ranges: [["05:00", "22:00"]] },
	{ day: 6, ranges: [["05:00", "22:00"]] },
];

test("toMinutes rejects junk and parses wall clock", () => {
	assert.equal(toMinutes("05:30"), 330);
	assert.equal(toMinutes("00:00"), 0);
	assert.equal(toMinutes("24:00"), null);
	assert.equal(toMinutes("bad"), null);
});

test("open inside a span, closed between the Sunday split", () => {
	assert.equal(openState(WEEK, { day: 1, minutes: 8 * 60 }).open, true);
	const gap = openState(WEEK, { day: 0, minutes: 15 * 60 });
	assert.equal(gap.open, false);
	assert.deepEqual(
		{ day: gap.nextOpen.day, at: gap.nextOpen.at },
		{ day: "Sunday", at: 18 * 60 },
	);
});

test("before opening points at today, after closing points at tomorrow", () => {
	const early = openState(WEEK, { day: 2, minutes: 4 * 60 });
	assert.equal(early.nextOpen.at, 5 * 60);
	assert.equal(early.nextOpen.inDays, 0);
	const late = openState(WEEK, { day: 2, minutes: 23 * 60 });
	assert.equal(late.nextOpen.day, "Wednesday");
	assert.equal(late.nextOpen.inDays, 1);
});

test("a span crossing midnight stays open after 00:00", () => {
	const nightShift = [{ day: 5, ranges: [["22:00", "02:00"]] }];
	assert.equal(openState(nightShift, { day: 5, minutes: 23 * 60 }).open, true);
	assert.equal(openState(nightShift, { day: 6, minutes: 60 }).open, true);
	assert.equal(openState(nightShift, { day: 6, minutes: 3 * 60 }).open, false);
});

test("no hours at all never claims open and never crashes", () => {
	assert.deepEqual(openState([], { day: 3, minutes: 600 }), {
		open: false,
		closesAt: null,
		nextOpen: null,
		today: [],
	});
});

test("clockInZone reads the studio's wall clock, not the runner's", () => {
	// 2026-09-03T00:30:00Z is 06:00 on Thursday in Kolkata.
	const clock = clockInZone(new Date("2026-09-03T00:30:00Z"), "Asia/Kolkata");
	assert.deepEqual(clock, { day: 4, minutes: 6 * 60 });
});
