"use client";

/**
 * The only module in the landing page that reads the DOM. Three things matter: where each
 * floor's slab sits on the page, where each parting heading's letters sit across its
 * column, and where every other thing on that floor that gets out of his way sits.
 *
 * All of it is read on mount and re-read whenever anything could have moved it — an owner
 * edit, a window resize, an image landing, the real Archivo arriving. Nothing here reads
 * during scroll: a letter does not move relative to its column when the page scrolls, so
 * measuring per frame would buy nothing and cost a layout.
 */

/** The floor wrappers, in document order: the top storey down, then the ground outside. */
const FLOORS = "[data-floor]";

/** A heading whose letters part around him, and the blocks that shove aside beneath it. */
const PARTING = ".parting";
const SHOVE = ".shove";

/**
 * One element's horizontal footprint plus the page offset of its own middle. `x`/`w` are
 * what `pushes` reasons about; `mid` is what `--open` is driven by. Measured with the
 * corridor shut, or each reading carries the last one's displacement into the next.
 */
function slot(el) {
	el.style.setProperty("--open", "0");
	const rect = el.getBoundingClientRect();
	return {
		el,
		x: rect.left,
		w: rect.width,
		mid: rect.top + rect.height / 2 + window.scrollY,
	};
}

/**
 * `knots` is one page offset per slab — the top border of every floor after the first,
 * because the top storey is the top of the building and has no slab under its own ceiling.
 * `headings` and `blocks` are indexed to match: entry `i` belongs to the floor whose
 * ceiling is `knots[i]`, which is the floor fall `i` passes through.
 */
export function read() {
	const floors = [...document.querySelectorAll(FLOORS)];
	const tops = floors.map((floor) => floor.getBoundingClientRect().top + window.scrollY);

	const inner = floors.slice(1);
	const headings = inner.map((floor) => {
		const el = floor.querySelector(PARTING);
		if (!el) return null;
		const measured = slot(el);
		const column = el.parentElement.getBoundingClientRect();
		return {
			...measured,
			letters: [...el.querySelectorAll(".letter-tile")].map((tile) => {
				const rect = tile.getBoundingClientRect();
				return { el: tile, x: rect.left, w: rect.width };
			}),
			bounds: { left: column.left, right: column.right },
			line: el.getBoundingClientRect().height,
		};
	});
	// Every other object on the floor: a priced line, a row of hours, a step, a caption.
	const blocks = inner.map((floor) => [...floor.querySelectorAll(SHOVE)].map(slot));

	return { knots: tops.slice(1), headings, blocks };
}

/**
 * Watch for anything that moves a floor, a letter or a block, coalesced to one read per
 * frame. Fires once immediately so the caller never has to measure for itself. Returns
 * the stop.
 */
export function observe(onChange) {
	let live = true;
	let frame = 0;

	const fire = () => {
		frame = 0;
		if (live) onChange(read());
	};
	const schedule = () => {
		if (!live || frame) return;
		frame = requestAnimationFrame(fire);
	};

	const board = document.getElementById("board-main");
	const observer = board ? new ResizeObserver(schedule) : null;
	if (board && observer) observer.observe(board);
	window.addEventListener("resize", schedule);
	// Archivo loads with display: swap, so every letter width changes once, late.
	document.fonts?.ready?.then(schedule);

	onChange(read());

	return () => {
		live = false;
		if (frame) cancelAnimationFrame(frame);
		observer?.disconnect();
		window.removeEventListener("resize", schedule);
	};
}
