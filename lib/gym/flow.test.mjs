import { strict as assert } from "node:assert";
import test from "node:test";
import { crossesLine, lineRuns, obstacleFrom, quantise, sameRuns } from "./flow.mjs";

const WIDE = 640;
const NARROW = 330;

test("quantising stops the lines shivering", () => {
	assert.equal(quantise(0), 0);
	assert.equal(quantise(3), 0);
	assert.equal(quantise(5), 8);
	assert.equal(quantise(101), 104);
	assert.equal(quantise(-5), -8);
	assert.equal(quantise(101, 0), 101, "a zero step is no step");
	assert.equal(quantise(Number.NaN), 0);
});

test("his box is inflated and led in the direction he is walking", () => {
	const box = { left: 200, width: 100, top: 40, height: 200 };

	const still = obstacleFrom(box, { heading: 0, lead: 140, inflate: 16 });
	assert.equal(still.left, quantise(184));
	assert.equal(still.width, quantise(132));

	const forward = obstacleFrom(box, { heading: 1, lead: 140, inflate: 16 });
	assert.ok(forward.left > still.left, "the hole opens ahead of him");
	assert.ok(forward.width > still.width, "and stays open behind him");

	const back = obstacleFrom(box, { heading: -1, lead: 140, inflate: 16 });
	assert.ok(back.left < still.left, "scrolled back, it opens the other way");
	assert.equal(back.width, forward.width, "by the same amount");
});

test("nothing measurable is no obstacle at all", () => {
	assert.equal(obstacleFrom(null), null);
	assert.equal(obstacleFrom({ left: 0, width: 0, top: 0, height: 10 }), null);
	assert.equal(obstacleFrom({ left: 0, width: 10, top: 0, height: 0 }), null);
	assert.equal(obstacleFrom({ left: Number.NaN, width: 10, top: 0, height: 10 }), null);
});

test("a line he is nowhere near keeps the whole measure", () => {
	const above = { left: 100, width: 120, top: 200, height: 160 };
	assert.equal(crossesLine(0, 28, above), false);
	assert.deepEqual(lineRuns(0, 28, WIDE, above), [{ left: 0, width: WIDE }]);
	assert.deepEqual(lineRuns(0, 28, WIDE, null), [{ left: 0, width: WIDE }]);
});

test("a wide line parts into two runs with him between them", () => {
	const him = { left: 240, width: 140, top: 0, height: 90 };
	const runs = lineRuns(28, 28, WIDE, him);
	assert.deepEqual(runs, [
		{ left: 0, width: 240 },
		{ left: 380, width: 260 },
	]);
});

test("a phone column floats the line to the wider side instead", () => {
	const him = { left: 150, width: 120, top: 0, height: 90 };
	assert.deepEqual(lineRuns(0, 28, NARROW, him, { split: false }), [{ left: 0, width: 150 }]);

	// Same obstacle, but now the right side is the wider one.
	const early = { left: 40, width: 120, top: 0, height: 90 };
	assert.deepEqual(lineRuns(0, 28, NARROW, early, { split: false }), [{ left: 160, width: 170 }]);
});

test("a side too narrow to hold a word is not used", () => {
	const nearLeft = { left: 30, width: 140, top: 0, height: 90 };
	assert.deepEqual(lineRuns(0, 28, WIDE, nearLeft, { minRun: 72 }), [{ left: 170, width: 470 }]);

	const nearRight = { left: 500, width: 140, top: 0, height: 90 };
	assert.deepEqual(lineRuns(0, 28, WIDE, nearRight, { minRun: 72 }), [{ left: 0, width: 500 }]);
});

test("a line he covers entirely is empty, and its words go to the next one", () => {
	const across = { left: -20, width: 400, top: 0, height: 90 };
	assert.deepEqual(lineRuns(0, 28, NARROW, across), []);
});

test("standing past the edge of a column is not standing in it", () => {
	assert.deepEqual(lineRuns(0, 28, WIDE, { left: -300, width: 200, top: 0, height: 90 }), [
		{ left: 0, width: WIDE },
	]);
	assert.deepEqual(lineRuns(0, 28, WIDE, { left: 700, width: 200, top: 0, height: 90 }), [
		{ left: 0, width: WIDE },
	]);
});

test("a paragraph with no width has no runs", () => {
	assert.deepEqual(lineRuns(0, 28, 0, null), []);
});

test("sameRuns is the guard against re-breaking a paragraph for nothing", () => {
	const a = [{ left: 0, width: 240 }, { left: 380, width: 260 }];
	assert.equal(sameRuns(a, a), true);
	assert.equal(sameRuns(a, [{ left: 0, width: 240 }, { left: 380, width: 260 }]), true);
	assert.equal(sameRuns(a, [{ left: 0, width: 240 }, { left: 388, width: 252 }]), false);
	assert.equal(sameRuns(a, [{ left: 0, width: 240 }]), false);
	assert.equal(sameRuns(a, null), false);
	assert.equal(sameRuns(null, null), true);
});
