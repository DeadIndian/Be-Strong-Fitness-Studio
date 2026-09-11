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
 * Three outcomes, and the third one matters. Wide enough on both sides and the
 * line becomes two runs with him between them — the same line, genuinely
 * re-broken, not slid aside. Wide enough on one side and the line floats there,
 * which is all a phone column can do: two 110px runs are not a paragraph. Wide
 * enough on neither and the line is empty, and its text goes to the next line. A
 * caller that cannot handle the empty case will silently print words underneath
 * him.
 */
export function lineRuns(lineTop, lineHeight, blockWidth, obstacle, { minRun = 72, split = true } = {}) {
	const full = [{ left: 0, width: blockWidth }];
	if (!(blockWidth > 0)) return [];
	if (!crossesLine(lineTop, lineHeight, obstacle)) return full;

	const holeStart = Math.max(0, Math.min(blockWidth, obstacle.left));
	const holeEnd = Math.max(0, Math.min(blockWidth, obstacle.left + obstacle.width));
	// He has walked clear of this column horizontally, whatever the vertical says.
	if (holeEnd <= 0 || holeStart >= blockWidth) return full;

	const left = { left: 0, width: holeStart };
	const right = { left: holeEnd, width: blockWidth - holeEnd };
	const leftFits = left.width >= minRun;
	const rightFits = right.width >= minRun;

	if (split && leftFits && rightFits) return [left, right];
	if (leftFits && (!rightFits || left.width >= right.width)) return [left];
	if (rightFits) return [right];
	return [];
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
