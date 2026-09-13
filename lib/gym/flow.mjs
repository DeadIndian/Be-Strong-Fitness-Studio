/**
 * Where the words may sit while he is standing in them.
 *
 * The reflow itself is @chenglou/pretext's job: it measures with canvas
 * `measureText` and re-breaks a paragraph to whatever measure we hand it, per
 * line, with no DOM read and no browser reflow. This module is the other half —
 * the geometry that decides what measure each line gets, which is the part that
 * can be quietly wrong and so is the part that gets tested.
 *
 * Coordinates are the paragraph's own box: x from its left edge, y from its top.
 * No DOM, no three.js.
 */

/**
 * Snap to a step. His box moves a fraction of a pixel per frame and every change
 * re-breaks a paragraph, so unquantised input makes the lines shiver. Eight pixels
 * is finer than any word, so word breaks still dominate what the eye sees.
 */
export function quantise(value, step = 8) {
	if (!Number.isFinite(value)) return 0;
	if (!(step > 0)) return value;
	return Math.round(value / step) * step;
}

/**
 * His silhouette, turned into the hole the text has to leave.
 *
 * Inflated, because type touching a shoulder reads as a collision rather than as
 * space. Led in his direction of travel, because words that open *ahead* of him
 * and close behind read as him pushing through them; a hole centred on him reads
 * as a hole that happens to be following him around.
 */
export function obstacleFrom(box, { heading = 0, lead = 140, inflate = 18, step = 8 } = {}) {
	if (!box || !Number.isFinite(box.left) || !Number.isFinite(box.width)) return null;
	if (!(box.width > 0) || !(box.height > 0)) return null;

	const shift = lead * (Number.isFinite(heading) ? heading : 0);
	return {
		left: quantise(box.left - inflate + shift, step),
		width: quantise(box.width + inflate * 2 + Math.abs(shift), step),
		top: quantise(box.top - inflate, step),
		height: quantise(box.height + inflate * 2, step),
	};
}

/** Does this obstacle cross the band of page this line occupies? */
export function crossesLine(lineTop, lineHeight, obstacle) {
	if (!obstacle) return false;
	return obstacle.top < lineTop + lineHeight && obstacle.top + obstacle.height > lineTop;
}

/**
 * The runs one line may use: `[{left, width}]`, in reading order.
 *
 * It accepts an array of obstacles, merges their overlapping areas into "holes",
 * and returns the remaining usable spans of text space.
 */
export function lineRuns(lineTop, lineHeight, blockWidth, obstacles, { minRun = 72, split = true } = {}) {
	const full = [{ left: 0, width: blockWidth }];
	if (!(blockWidth > 0)) return [];
	if (!obstacles || obstacles.length === 0) return full;

	const holes = [];
	for (const obs of obstacles) {
		if (!crossesLine(lineTop, lineHeight, obs)) continue;
		const start = Math.max(0, Math.min(blockWidth, obs.left));
		const end = Math.max(0, Math.min(blockWidth, obs.left + obs.width));
		if (end > start) holes.push({ start, end });
	}

	if (holes.length === 0) return full;

	holes.sort((a, b) => a.start - b.start);
	const merged = [];
	let current = holes[0];
	for (let i = 1; i < holes.length; i += 1) {
		if (holes[i].start <= current.end) {
			current.end = Math.max(current.end, holes[i].end);
		} else {
			merged.push(current);
			current = holes[i];
		}
	}
	merged.push(current);

	const runs = [];
	let x = 0;
	for (const hole of merged) {
		if (hole.start - x >= minRun) {
			runs.push({ left: x, width: hole.start - x });
		}
		x = hole.end;
	}
	if (blockWidth - x >= minRun) {
		runs.push({ left: x, width: blockWidth - x });
	}

	if (runs.length === 0) return [];
	if (split) return runs;

	let widest = runs[0];
	for (let i = 1; i < runs.length; i += 1) {
		if (runs[i].width > widest.width) widest = runs[i];
	}
	return [widest];
}

/** Are these two run plans the same? Cheap guard against pointless re-layout. */
export function sameRuns(a, b) {
	if (a === b) return true;
	if (!a || !b || a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) {
		if (a[i].left !== b[i].left || a[i].width !== b[i].width) return false;
	}
	return true;
}
