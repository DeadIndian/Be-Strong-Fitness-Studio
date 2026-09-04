import assert from "node:assert/strict";
import test from "node:test";
import { FOV, fallAt, floorAt, pushes, scaleFor } from "./shaft.mjs";

/** Six floors on an 800px-tall phone, each one viewport apart. */
const KNOTS = [800, 1600, 2400, 3200, 4000, 4800];

test("one world unit projects to exactly 1/k pixels at the derived distance", () => {
	for (const view of [
		{ width: 360, height: 800 },
		{ width: 1440, height: 900 },
		{ width: 768, height: 1024 },
	]) {
		const { k, dist } = scaleFor(view);
		// Perspective: half the visible world height at `dist` is dist*tan(fov/2).
		const pixelsPerUnit = view.height / (2 * dist * Math.tan((FOV * Math.PI) / 360));
		assert.ok(
			Math.abs(pixelsPerUnit - 1 / k) < 1e-9,
			`${view.width}x${view.height}: ${pixelsPerUnit} vs ${1 / k}`,
		);
	}
});

test("he is 35% of a portrait phone and 58% of a desktop", () => {
	assert.ok(Math.abs(scaleFor({ width: 360, height: 800 }).share - 0.35) < 0.005);
	assert.ok(Math.abs(scaleFor({ width: 1440, height: 900 }).share - 0.58) < 0.005);
	// One viewport of scroll is one storey: 10 units on the phone, ~6 on the desktop.
	assert.ok(Math.abs(scaleFor({ width: 360, height: 800 }).k * 800 - 10) < 0.05);
	assert.ok(Math.abs(scaleFor({ width: 1440, height: 900 }).k * 900 - 6.03) < 0.05);
});

test("share clamps outside the two reference aspects", () => {
	assert.equal(
		scaleFor({ width: 200, height: 800 }).share,
		scaleFor({ width: 360, height: 800 }).share,
	);
	assert.equal(
		scaleFor({ width: 3000, height: 900 }).share,
		scaleFor({ width: 1440, height: 900 }).share,
	);
});

test("the occupied floor follows the viewport centre", () => {
	assert.equal(floorAt(KNOTS, 0, 800), 0);
	assert.equal(floorAt(KNOTS, 800, 800), 1);
	assert.equal(floorAt(KNOTS, 99999, 800), 5);
});

test("a fall band opens before its hairline and closes after it", () => {
	assert.equal(fallAt(KNOTS, 0, 800), null);
	const start = fallAt(KNOTS, 800 - 0.72 * 800, 800);
	assert.deepEqual({ index: start.index, t: start.t }, { index: 0, t: 0 });
	assert.ok(fallAt(KNOTS, 800 - 0.5 * 800, 800).t > 0.4);
	assert.equal(fallAt(KNOTS, 800 - 0.27 * 800, 800), null);
});

test("bands one viewport apart never overlap, and t only rises", () => {
	let seen = null;
	for (let scroll = 0; scroll < 4800; scroll += 8) {
		const fall = fallAt(KNOTS, scroll, 800);
		if (!fall) {
			seen = null;
			continue;
		}
		if (seen && seen.index === fall.index) assert.ok(fall.t >= seen.t);
		seen = fall;
		assert.ok(fall.t >= 0 && fall.t < 1);
	}
});

test("the last floor cannot fall out of the building", () => {
	assert.equal(fallAt(KNOTS, 4800 - 0.5 * 800, 800), null);
});

/** Five 30px letters — "RATES" at tile-lg on a 360px phone — in a 254px column. */
function rates(startX = 20) {
	return Array.from({ length: 5 }, (_, index) => ({ x: startX + index * 32, w: 30 }));
}

test("letters beyond reach do not move at all", () => {
	const out = pushes(rates(), 900, 70, { left: 16, right: 270 });
	assert.deepEqual(out, [0, 0, 0, 0, 0]);
});

test("letters part around him: left goes left, right goes right", () => {
	const letters = rates();
	const manX = letters[2].x + letters[2].w / 2;
	const out = pushes(letters, manX, 70, { left: -9999, right: 9999 });
	assert.ok(out[0] < 0 && out[1] < 0, `${out}`);
	assert.ok(out[3] > 0 && out[4] > 0, `${out}`);
	// Symmetric input, symmetric output.
	assert.ok(Math.abs(out[0] + out[4]) < 1e-9);
	assert.ok(Math.abs(out[1] + out[3]) < 1e-9);
});

test("the slack guard keeps every pushed letter inside its column", () => {
	const letters = rates();
	const bounds = { left: 16, right: 270 };
	const out = pushes(letters, letters[2].x + letters[2].w / 2, 70, bounds);
	out.forEach((push, index) => {
		const { x, w } = letters[index];
		assert.ok(x + push >= bounds.left - 1e-9, `letter ${index} left edge ${x + push}`);
		assert.ok(x + w + push <= bounds.right + 1e-9, `letter ${index} right edge ${x + w + push}`);
	});
	// The guard binds — this is a real scale-down, not a no-op.
	assert.ok(Math.abs(out[1]) < 38);
});

test("a line with no slack at all simply does not move", () => {
	const letters = rates();
	const out = pushes(letters, letters[2].x + letters[2].w / 2, 70, { left: 20, right: 178 });
	assert.ok(
		out.every((push) => push === 0),
		`${out}`,
	);
});
