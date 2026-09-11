"use client";

/**
 * A paragraph he walks through.
 *
 * `@chenglou/pretext` measures and breaks the paragraph's own words to whatever
 * measure we ask for, per line, off a canvas — no DOM read, no browser reflow. This
 * file is the DOM half: what measure to ask for, and where to put what comes back.
 *
 * Two states, and the resting one is the plain document. At rest the paragraph is its
 * own text in its own `<p>`, as the server sent it. Only while he is actually standing
 * in it does it switch to positioned runs, with the true text moved to a
 * visually-hidden sibling so a screen reader is never read a paragraph in pieces. The
 * spec asked for a one-time switch at `fonts.ready`; switching per approach is free
 * once the slack line below is reserved, and it leaves the resting page — which is the
 * page nearly all of the time — carrying no duplicated text at all.
 *
 * The reserve is what makes it free: one extra line of height, permanently, applied
 * before the walk is ever measured. Parting a line lowers its capacity, so a word can
 * fall through to a new one; the slack absorbs that, and the paragraph's own box never
 * changes size in either direction.
 */

import { layoutNextLine, measureLineStats, prepareWithSegments } from "@chenglou/pretext";
import { lineRuns, sameRuns } from "@/lib/gym/flow.mjs";
import { px } from "./scan";

const START = { segmentIndex: 0, graphemeIndex: 0 };

/** Out of the layout, still in the accessibility tree, still found by find-in-page. */
const HIDDEN =
	"position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap";

/**
 * Canvas cannot measure a variable font's width axis — `ctx.font` has no
 * `font-variation-settings` — so a flowing paragraph stays on the default cut. The
 * narrow display axis lives on the lettering, which never flows.
 */
function fontOf(style) {
	return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

function samePlan(a, b) {
	if (!a || !b || a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) if (!sameRuns(a[i], b[i])) return false;
	return true;
}

/**
 * One flowing paragraph, and everything it knows about itself.
 *
 * Returns `null` for anything it must not touch. A paragraph holding a link or any
 * other element is one of those: the runs are plain strings, so an `<a>` in here would
 * come back as bare words with its href dropped. Links go in a ledger row or a Press.
 */
function paragraph(el) {
	if (el.querySelector("*")) return null;
	const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
	if (!text) return null;

	const truth = document.createElement("span");
	const runs = document.createElement("span");
	truth.textContent = text;
	runs.setAttribute("aria-hidden", "true");
	runs.style.display = "none";
	el.textContent = "";
	el.append(truth, runs);
	el.style.position = "relative";

	let width = 0;
	let lineHeight = 0;
	let budget = 0;
	let originX = 0;
	let originY = 0;
	let padLeft = 0;
	let padTop = 0;
	let prepared = null;
	let geometry = null;
	let current = null;

	/**
	 * Read the paragraph's own typography and measure. Run at setup and again whenever
	 * the page's geometry moves, because a narrower column is a different paragraph.
	 */
	function read() {
		const style = getComputedStyle(el);
		const rect = el.getBoundingClientRect();
		const inset = {
			left: px(style.paddingLeft) + px(style.borderLeftWidth),
			right: px(style.paddingRight) + px(style.borderRightWidth),
			top: px(style.paddingTop) + px(style.borderTopWidth),
		};

		width = Math.max(1, rect.width - inset.left - inset.right);
		lineHeight = px(style.lineHeight, px(style.fontSize, 16) * 1.5);
		originX = rect.left + window.scrollX + inset.left;
		originY = rect.top + window.scrollY + inset.top;
		// An absolutely positioned child resolves against the padding box, but a run's `left`
		// is measured from the content edge. Equal on this page's prose, kept honest anyway.
		padLeft = inset.left;
		padTop = inset.top;

		prepared = prepareWithSegments(text, fontOf(style), { letterSpacing: px(style.letterSpacing, 0) });

		/*
		 * Can this measure hold two columns at all? A hole in the middle of a 340px phone
		 * column leaves two runs of about a hundred pixels, which is a narrow paragraph but
		 * still a paragraph. Below that the line floats to the wider side instead, which is
		 * the honest answer when there is only one side.
		 */
		geometry = { minRun: Math.max(96, width * 0.16), split: width >= 320 };

		/*
		 * How many lines to reserve, asked rather than guessed.
		 *
		 * He is taller than any paragraph on this page, so he does not part one line — he
		 * parts all of them at once, and a line broken either side of him holds about two
		 * thirds of what it held. Measuring the paragraph a second time at that narrower
		 * measure is what says how many rows the parted version needs; the extra row is the
		 * break waste of twice as many runs, each of which loses up to a word to its own
		 * line break.
		 *
		 * Reserving one line was the bug behind the whole effect: the parted layout needed
		 * four rows, got three, spent them all, and was discarded as not fitting — every
		 * frame, on every paragraph, so the words simply passed behind him. The `+ 3` is a
		 * ceiling, not an allowance: past it the honest answer is to rest rather than open a
		 * hole in the page that a reader would feel.
		 */
		const natural = measureLineStats(prepared, width).lineCount;
		const parted = measureLineStats(prepared, Math.max(geometry.minRun * 2, width * 0.64)).lineCount;
		budget = Math.max(natural + 1, Math.min(natural + 3, parted + 1));
		el.style.minHeight = `${budget * lineHeight}px`;
		current = null;
	}

	/** The plain document: one text node in one paragraph, and nothing of ours in it. */
	function rest() {
		truth.style.cssText = "";
		runs.style.display = "none";
	}

	/**
	 * Lay the words into the runs the plan allows, one line at a time, carrying
	 * pretext's cursor across the gap so run B continues run A's sentence on the same
	 * visual line rather than restarting it.
	 *
	 * `null` means it did not fit in the reserve, and the caller lets him pass over the
	 * paragraph instead — the page height is not allowed to move under a reader.
	 */
	function stream(plan) {
		const out = [];
		let cursor = START;

		for (let row = 0; row < plan.length; row += 1) {
			for (const run of plan[row]) {
				const line = layoutNextLine(prepared, cursor, run.width);
				// No line means there is no text left, which means all of it has been placed.
				if (!line) return out;
				// A cursor that did not advance would spin here forever, which is what one
				// unbreakable word wider than the run it was handed looks like.
				if (line.end.segmentIndex === cursor.segmentIndex && line.end.graphemeIndex === cursor.graphemeIndex) {
					return null;
				}
				cursor = line.end;
				if (line.text) out.push({ left: run.left, top: row * lineHeight, text: line.text });
			}
		}

		/*
		 * Every row used. That is a fit only if there was nothing left over — and asking is
		 * the whole point: text that ends exactly on the last row never returns the empty
		 * line that would otherwise be the only signal it fitted.
		 */
		return layoutNextLine(prepared, cursor, width) ? null : out;
	}


	/** Write the lines out, reusing the spans, so a re-break allocates nothing. */
	function paint(lines) {
		while (runs.childElementCount < lines.length) {
			const span = document.createElement("span");
			span.style.position = "absolute";
			span.style.whiteSpace = "pre";
			runs.append(span);
		}
		const children = runs.children;
		for (let i = 0; i < children.length; i += 1) {
			const span = children[i];
			const line = lines[i];
			if (!line) {
				span.style.display = "none";
				continue;
			}
			span.style.display = "block";
			span.style.left = `${padLeft + line.left}px`;
			span.style.top = `${padTop + line.top}px`;
			if (span.textContent !== line.text) span.textContent = line.text;
		}
		truth.style.cssText = HIDDEN;
		runs.style.display = "block";
	}

	/**
	 * One frame. The obstacle arrives in document space and is already quantised to 8px
	 * steps, so translating it by this paragraph's fixed origin keeps it quantised and
	 * the lines do not shiver as he moves a fraction of a pixel.
	 *
	 * The plan is compared before any layout happens: same runs, same words, nothing to
	 * do. That guard is why this costs nothing on the great majority of frames.
	 */
	function update(obstacle) {
		const local = obstacle
			? { left: obstacle.left - originX, width: obstacle.width, top: obstacle.top - originY, height: obstacle.height }
			: null;

		const plan = [];
		let parted = false;
		for (let row = 0; row < budget; row += 1) {
			const spans = lineRuns(row * lineHeight, lineHeight, width, local, geometry);
			if (spans.length !== 1 || spans[0].width !== width) parted = true;
			plan.push(spans);
		}

		if (samePlan(plan, current)) return;
		current = plan;

		if (!parted) {
			rest();
			return;
		}
		const lines = stream(plan);
		if (lines) paint(lines);
		else rest();
	}

	read();
	return {
		update,
		remeasure() {
			rest();
			read();
		},
		release() {
			el.style.position = "";
			el.style.minHeight = "";
			el.textContent = text;
		},
	};
}

/**
 * Every paragraph marked `data-flow`, ready to be walked through.
 *
 * Called after `document.fonts.ready`: every measure here is a measure of the font the
 * reader will actually see, and Archivo landing late would otherwise re-break every
 * line at once, in front of them.
 */
export function createFlows() {
	const all = [...document.querySelectorAll("[data-flow]")].map(paragraph).filter(Boolean);

	return {
		update(obstacle) {
			for (const item of all) item.update(obstacle);
		},
		remeasure() {
			for (const item of all) item.remeasure();
		},
		release() {
			for (const item of all) item.release();
		},
	};
}
