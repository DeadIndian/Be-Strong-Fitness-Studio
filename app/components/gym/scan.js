"use client";

/**
 * The page, measured once.
 *
 * Every number the walk needs comes from the document itself — the station tops,
 * the rows he steps past, the ledger rows that own a plate — so an owner who adds
 * six facilities to the iron cannot slide the walk out of step with what is being
 * read. Measured once here, cached, and re-measured only when the page's own size
 * changes; the frame loop then forces no layout at all.
 *
 * Coordinates are document space: viewport rect plus scroll offset. That is the one
 * space the scroll position, the DOM and the projected camera all agree on.
 */

import { HALL } from "@/lib/gym/route.mjs";

/** A rect in document space. */
function docBox(el, scrollX, scrollY) {
	const rect = el.getBoundingClientRect();
	return { left: rect.left + scrollX, top: rect.top + scrollY, width: rect.width, height: rect.height };
}

/** A computed length in px, defaulting rather than poisoning the walk with NaN. */
export function px(value, fallback = 0) {
	const n = Number.parseFloat(value);
	return Number.isFinite(n) ? n : fallback;
}

/**
 * Anything that can hold a row of type. Deliberately broad: a row that moves out of his
 * way has to be *found*, and marking them by hand in the page is a list that is one
 * forgotten `<span>` away from a line of text sitting behind his chest — which is
 * exactly what it was. Found, not declared.
 */
const ROW = "p,span,li,a,button,dd,dt,address,h1,h2,h3,time,[data-yield]";

/** Kept clear at both edges, so a row that slides never touches the side of the screen. */
const GUTTER = 14;

/**
 * The scrollTop at which a station sits where it wants to be read: its own top, less
 * whatever `scroll-padding-top` reserves for the sticky rail. Read off the stylesheet
 * rather than restated here, so the rail's height and the walk cannot drift apart.
 *
 * Forced non-decreasing and inside the scrollable range, because `walkAt` divides by
 * the gap between neighbours and a station past the end of the scroll is a gap the
 * visitor could never cross.
 */
function anchorsFrom(sections, scrollY, pad) {
	const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
	let floor = 0;
	return sections.map((section) => {
		const top = section.getBoundingClientRect().top + scrollY - pad;
		floor = Math.max(floor, Math.min(limit, top));
		return floor;
	});
}

/**
 * A row's *ink*, not its box, in document space.
 *
 * Almost every caption on this page is a short line inside a full-width block, and the
 * block is what `getBoundingClientRect` reports. Asking the box whether it can get out of
 * his way therefore always answers no, when the words themselves have most of the column
 * to move into. A range over the element's own contents is what the reader actually sees,
 * so it is what the slide is measured against — and the transform still moves the element,
 * so the ink goes with it.
 */
function inkBox(el, scrollX, scrollY) {
	const range = document.createRange();
	range.selectNodeContents(el);
	const ink = range.getBoundingClientRect();
	range.detach();
	const rect = ink.width > 0 && ink.height > 0 ? ink : el.getBoundingClientRect();
	return { left: rect.left + scrollX, top: rect.top + scrollY, width: rect.width, height: rect.height };
}

function getScrollParent(node) {
	if (node == null || node === document.body || node === document.documentElement) return null;
	if (node.scrollWidth > node.clientWidth) {
		const overflow = window.getComputedStyle(node).overflowX;
		if (overflow === 'auto' || overflow === 'scroll') return node;
	}
	return getScrollParent(node.parentNode);
}

/**
 * Every row of type he has to get past, and how much room each one has to get out of
 * the way in.
 *
 * The outermost text-bearing element wins: a ledger row moves as one line rather than
 * having its label and its price slide apart. A paragraph marked `data-flow` is skipped
 * along with everything inside it, because that one genuinely re-breaks instead.
 *
 * `room` is the hard bound on the slide — a row cannot travel further than the gutter at
 * either side without hanging off the screen. Measured here so the frame loop can pick a
 * direction without reading layout.
 */
function yieldsIn(scrollX, scrollY) {
	const docWidth = document.documentElement.clientWidth;
	const candidates = [...document.querySelectorAll(`[data-station] :is(${ROW})`)];

	// Clear last scan's displacement first: a row measured mid-slide reports a box that
	// includes the transform, and every direction chosen from it would be wrong.
	for (const el of candidates) {
		el.style.removeProperty("--open");
		el.style.removeProperty("--push");
	}

	const taken = [];
	const rows = [];
	for (const el of candidates) {
		if (!(el.textContent ?? "").trim()) continue;
		if (el.closest("[data-flow]")) continue;
		// Document order, so an ancestor is always seen first and claims the row.
		if (taken.some((seen) => seen.contains(el))) continue;
		// `transform` does nothing to a non-replaced inline box, and a row that silently
		// refuses to move is the whole defect this collector exists to end.
		if (getComputedStyle(el).display === "inline") continue;

		const box = inkBox(el, scrollX, scrollY);
		if (!(box.width > 0) || !(box.height > 0)) continue;

		const scrollParent = getScrollParent(el);

		taken.push(el);
		el.dataset.yield = "";
		rows.push({
			el,
			box,
			// The gutter is kept: a row slid flat against the edge of the screen reads as a
			// row that fell off it, which is not an improvement on him standing over it.
			room: {
				left: Math.max(0, box.left - GUTTER),
				right: Math.max(0, docWidth - (box.left + box.width) - GUTTER),
			},
			scrollParent,
			initialScrollX: scrollParent ? scrollParent.scrollLeft : 0,
			isPlate: el.hasAttribute("data-plate"),
			open: 0,
			push: 0,
		});
	}
	return rows;
}

/** Everything the rig reads off the page, in document space. */
export function scanPage() {
	const { scrollX, scrollY } = window;
	const pad = px(getComputedStyle(document.documentElement).scrollPaddingTop, 0);

	const sections = [...document.querySelectorAll("[data-station]")]
		.sort((a, b) => Number(a.dataset.station) - Number(b.dataset.station))
		.slice(0, HALL.stations);

	return {
		anchors: anchorsFrom(sections, scrollY, pad),
		// A row he shoves aside. Which way it goes is left to the rig: it depends on which
		// side of him the row is standing, which is not known until he is next to it.
		yields: yieldsIn(scrollX, scrollY),
		// A priced row, and the plate on the tree that is its price in metal.
		plates: [...document.querySelectorAll("[data-plate]")].map((el) => ({
			el,
			id: el.dataset.plate,
		})),
	};
}

/**
 * Re-measure when the page's own geometry moves, and not otherwise.
 *
 * A `ResizeObserver` on the body catches every cause at once — a resize, a rotation,
 * the flow reserve being applied, a font landing late — without listening for any of
 * them by name. Debounced, because a drag-resize fires it per frame and re-anchoring
 * mid-drag is work nobody sees.
 */
export function observePage(onChange, delayMs = 180) {
	let timer = 0;
	const later = () => {
		window.clearTimeout(timer);
		timer = window.setTimeout(onChange, delayMs);
	};

	const observer = new ResizeObserver(later);
	observer.observe(document.body);
	window.addEventListener("resize", later, { passive: true });

	return () => {
		window.clearTimeout(timer);
		observer.disconnect();
		window.removeEventListener("resize", later);
	};
}
