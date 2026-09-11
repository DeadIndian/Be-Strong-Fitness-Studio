/**
 * The walk: where he is in the hall, and how he is moving.
 *
 * Scroll position is the only input, and it is only ever read. The five station
 * anchors come measured from the page (see scan.js) rather than from constants
 * here, so the owner adding six facilities to one station cannot slide the walk
 * out of step with what the visitor is reading.
 *
 * Pure arithmetic, no DOM, no three.js.
 */

import { STRIDE } from "./body.mjs";

/** The hall in world units: five stations on a line, with runway at both ends. */
export const HALL = {
	stations: 5,
	x0: 0,
	gap: 7,
	get span() {
		return (this.stations - 1) * this.gap;
	},
	runway: 6,
};

/** Where station `i` (0-based) stands. */
export function stationX(index) {
	const i = Math.min(HALL.stations - 1, Math.max(0, Math.round(index)));
	return HALL.x0 + i * HALL.gap;
}

/**
 * Cycles per unit of walk progress. A cycle is two steps, and the step is measured off
 * his own leg keys rather than guessed here — that shared number is the whole reason his
 * feet stay on the floor instead of skating along it. Cadence is driven by distance
 * covered and never by elapsed time, which is what keeps it true when the visitor
 * scrolls slowly, stops halfway, or drags backwards.
 */
export const CADENCE = HALL.span / (STRIDE.walk * 2);

/**
 * Which station he is at, how far past it, and where that puts him.
 *
 * `anchors` is one scrollTop per station: the position at which that station sits
 * where it wants to be read. Returns `t` in [0,1] across the current gap and `s`
 * in [0,1] across the whole hall.
 */
export function walkAt(scrollTop, anchors) {
	const list = Array.isArray(anchors) ? anchors.filter((n) => Number.isFinite(n)) : [];
	if (list.length < 2) return { index: 0, t: 0, s: 0, x: stationX(0) };

	const y = Number.isFinite(scrollTop) ? scrollTop : 0;
	const last = list.length - 1;

	if (y <= list[0]) return { index: 0, t: 0, s: 0, x: stationX(0) };
	if (y >= list[last]) return { index: last, t: 0, s: 1, x: stationX(last) };

	let index = 0;
	while (index < last - 1 && y >= list[index + 1]) index += 1;

	const from = list[index];
	const to = list[index + 1];
	// Two sections measured to the same scrollTop would divide by zero; treat the
	// pair as already arrived rather than producing NaN for the rest of the frame.
	const t = to > from ? (y - from) / (to - from) : 0;
	const s = (index + t) / last;

	return { index, t, s, x: HALL.x0 + s * HALL.span };
}

/** Nearest station, and whether he is close enough to be working at it. */
export function stationAt(walk, dwell = 0.16) {
	const near = walk.t <= dwell ? walk.index : walk.t >= 1 - dwell ? walk.index + 1 : -1;
	return { index: near < 0 ? walk.index : near, working: near >= 0 };
}

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Gait from scroll velocity, in walk-progress per second.
 *
 * This is what makes him alive rather than a sprite on a rail: stop and he stands
 * and breathes, ease and he walks, flick and he runs, scroll back and the whole
 * thing mirrors and he walks back the way he came. The three weights are blended
 * rather than switched, so there is no frame at which he changes gait.
 */
export function gaitFor(velocity) {
	const v = Number.isFinite(velocity) ? velocity : 0;
	const speed = Math.abs(v);

	const moving = clamp01((speed - 0.006) / 0.03);
	const run = clamp01((speed - 0.11) / 0.26);
	const walk = Math.max(0, moving - run);
	const stand = Math.max(0, 1 - moving);

	const total = stand + walk + run || 1;
	return {
		stand: stand / total,
		walk: walk / total,
		run: run / total,
		// He faces the way he is going; standing keeps whatever he last faced.
		heading: speed < 0.006 ? 0 : Math.sign(v),
		// Into the run, out of the stand: the lean is the acceleration made visible.
		lean: run * 0.34 + walk * 0.08,
		// A run's step is longer, so it takes fewer cycles to cover the same ground. This
		// ratio is measured from his poses too: the cadence divides by it.
		stride: 1 + run * (STRIDE.run / STRIDE.walk - 1),
	};
}

/** One-pole smoothing that behaves the same whatever the frame rate. */
export function smooth(previous, next, halfLifeMs, deltaMs) {
	if (!Number.isFinite(previous)) return next;
	if (!(halfLifeMs > 0) || !(deltaMs > 0)) return next;
	const k = 1 - Math.pow(0.5, deltaMs / halfLifeMs);
	return previous + (next - previous) * k;
}
