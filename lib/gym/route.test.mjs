import { strict as assert } from "node:assert";
import test from "node:test";
import { STRIDE } from "./body.mjs";
import { CADENCE, HALL, gaitFor, smooth, stationAt, stationX, walkAt } from "./route.mjs";

const ANCHORS = [0, 800, 1600, 2400, 3200];

test("the hall is five stations wide and he starts at the first one", () => {
	assert.equal(HALL.stations, 5);
	assert.equal(HALL.span, 28);
	assert.equal(stationX(0), 0);
	assert.equal(stationX(4), 28);
	// Out of range clamps rather than walking him through a wall.
	assert.equal(stationX(-3), 0);
	assert.equal(stationX(9), 28);
});

test("scroll maps onto the walk, ends included", () => {
	assert.deepEqual(walkAt(0, ANCHORS), { index: 0, t: 0, s: 0, x: 0 });
	assert.deepEqual(walkAt(-500, ANCHORS), { index: 0, t: 0, s: 0, x: 0 });
	assert.deepEqual(walkAt(3200, ANCHORS), { index: 4, t: 0, s: 1, x: 28 });
	assert.deepEqual(walkAt(99999, ANCHORS), { index: 4, t: 0, s: 1, x: 28 });

	const mid = walkAt(1600, ANCHORS);
	assert.equal(mid.index, 2);
	assert.equal(mid.t, 0);
	assert.equal(mid.s, 0.5);
	assert.equal(mid.x, 14);

	const between = walkAt(1200, ANCHORS);
	assert.equal(between.index, 1);
	assert.equal(between.t, 0.5);
	assert.equal(between.s, 0.375);
});

test("walk progress only ever increases with scroll", () => {
	let previous = -1;
	for (let y = -200; y <= 3400; y += 37) {
		const { s } = walkAt(y, ANCHORS);
		assert.ok(s >= previous, `s went backwards at ${y}`);
		assert.ok(s >= 0 && s <= 1, `s out of range at ${y}`);
		previous = s;
	}
});

test("nothing measurable means he stands at the door rather than at NaN", () => {
	for (const anchors of [null, [], [0], [Number.NaN, 0]]) {
		const walk = walkAt(500, anchors);
		assert.equal(walk.s, 0);
		assert.equal(walk.x, 0);
	}
	// Two sections measured to the same scrollTop must not divide by zero.
	const collapsed = walkAt(800, [0, 800, 800, 1600, 2400]);
	assert.ok(Number.isFinite(collapsed.s));
	assert.ok(Number.isFinite(collapsed.x));
});

test("he is working at a station only when he is standing at one", () => {
	assert.deepEqual(stationAt(walkAt(0, ANCHORS)), { index: 0, working: true });
	assert.deepEqual(stationAt(walkAt(1600, ANCHORS)), { index: 2, working: true });
	assert.deepEqual(stationAt(walkAt(3200, ANCHORS)), { index: 4, working: true });
	// Arriving counts as arrived: just short of the next anchor is that station.
	assert.deepEqual(stationAt(walkAt(1560, ANCHORS)), { index: 2, working: true });
	assert.equal(stationAt(walkAt(1200, ANCHORS)).working, false, "mid-floor is not a station");
});

test("gait follows scroll velocity and mirrors when he is scrolled back", () => {
	const still = gaitFor(0);
	assert.equal(still.stand, 1);
	assert.equal(still.heading, 0);

	const walking = gaitFor(0.03);
	assert.ok(walking.walk > walking.stand && walking.walk > walking.run);
	assert.equal(walking.heading, 1);

	const running = gaitFor(0.6);
	assert.equal(running.run, 1);
	assert.ok(running.lean > walking.lean, "a run leans further than a walk");
	assert.ok(running.stride > 1, "a longer stride means fewer cycles per metre");

	const back = gaitFor(-0.03);
	assert.equal(back.heading, -1);
	assert.equal(back.walk, walking.walk, "walking back is the same walk");

	for (const v of [0, 0.001, 0.02, 0.12, 0.4, 5, -5, Number.NaN]) {
		const gait = gaitFor(v);
		const total = gait.stand + gait.walk + gait.run;
		assert.ok(Math.abs(total - 1) < 1e-9, `weights do not sum to one at ${v}`);
	}
});

test("cadence is per unit walked, so his feet cannot slide", () => {
	// One cycle is two of his own measured steps, and the hall is 28 units long.
	assert.ok(Math.abs(CADENCE - HALL.span / (2 * STRIDE.walk)) < 1e-9);
	assert.ok(CADENCE > 20 && CADENCE < 26, `${CADENCE} cycles across the hall is not a walk`);
	// A run at the same cadence would out-run its own stride, so the ratio must be > 1.
	assert.ok(gaitFor(5).stride > 1.5, "a run's step is more than half again a walk's");
});

test("smoothing is frame-rate independent and survives a cold start", () => {
	assert.equal(smooth(Number.NaN, 4, 100, 16), 4);
	assert.equal(smooth(0, 4, 0, 16), 4);
	// One half-life closes half the gap, whatever the step size it was reached in.
	assert.ok(Math.abs(smooth(0, 1, 100, 100) - 0.5) < 1e-12);
	let a = 0;
	for (let i = 0; i < 10; i += 1) a = smooth(a, 1, 100, 10);
	assert.ok(Math.abs(a - 0.5) < 1e-12, "ten 10ms steps equal one 100ms step");
});
