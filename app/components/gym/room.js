"use client";

/**
 * The gate.
 *
 * Everything expensive on this page is behind this file, and the page is complete
 * without any of it: five sections of real type, in walk-in order, that a text browser
 * would render correctly. This component decides whether the room is a good idea on
 * *this* device, mounts the two canvases if it is, and takes them away again if the
 * frames turn out to be too slow — which is the honest version of "works on mobile".
 *
 * The rig itself is `import()`ed, so three.js and pretext are not in the page's first
 * load at all. A server component cannot use `next/dynamic` with `ssr: false`, which is
 * the other reason this boundary exists.
 */

import { useEffect, useRef, useState } from "react";
import Loading from "../../loading";

/** Does this browser have the three things the rig cannot be written without? */
function capable() {
	if (typeof window === "undefined") return false;
	if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") return false;
	if (!window.matchMedia) return false;
	try {
		const probe = document.createElement("canvas");
		return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
	} catch {
		return false;
	}
}

/**
 * The watchdog. A rolling minute of frame costs, judged by its median so one janky
 * frame during a scroll cannot condemn the page, and only after sixty frames have gone
 * by — the first second of any WebGL page is shader compilation and is always slow.
 *
 * Over 34ms sustained is under 30fps, at which point the room is costing the reader more
 * than it is giving them and the right answer is to leave.
 */
const WARMUP = 60;
const RING = 60;
const BUDGET = 34;

export default function Room({ hours, plans }) {
	const hallRef = useRef(null);
	const actorRef = useRef(null);
	const [dead, setDead] = useState(false);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (dead) return undefined;
		if (!capable()) return undefined;

		const canvasHall = hallRef.current;
		const canvasActor = actorRef.current;
		if (!canvasHall || !canvasActor) return undefined;

		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const root = document.documentElement;
		let rig = null;
		let gone = false;

		const costs = new Float32Array(RING);
		let seen = 0;
		const sorted = new Float32Array(RING);

		function onFrame(ms) {
			costs[seen % RING] = ms;
			seen += 1;
			if (seen < WARMUP || seen % RING !== 0) return;
			sorted.set(costs);
			sorted.sort();
			if (sorted[RING >> 1] > BUDGET) setDead(true);
		}

		import("./rig")
			.then(({ createRig }) => {
				if (gone) return;
				rig = createRig({ canvasHall, canvasActor, hours, plans, reduced, onFrame: reduced ? null : onFrame });
				// The document styles itself for the room's presence rather than the room
				// reaching into the document: the scrims, the reserved column and the lettering
				// all hang off this one attribute, and it is never set if we did not get here.
				root.dataset.room = "on";
				setReady(true);
			})
			.catch(() => setDead(true));

		return () => {
			gone = true;
			delete root.dataset.room;
			if (rig) rig.destroy();
		};
	}, [dead, hours, plans]);

	if (dead) return null;

	return (
		<>
			{!ready && <Loading />}
			<canvas ref={hallRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
			<canvas ref={actorRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-10 h-full w-full" />
		</>
	);
}
