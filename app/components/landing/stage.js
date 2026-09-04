"use client";

/**
 * Whether the visitor gets the building at all, decided before three.js is fetched: no
 * WebGL means no download and no canvas, reduced motion means the still elevation, and a
 * phone that cannot hold the frame rate falls back to that same still mid-visit. The
 * page's own ground stays behind all three, so a visitor with none of it reads a finished
 * page rather than a broken one.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

const Building = dynamic(() => import("./building"), { ssr: false });

function canRender() {
	try {
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
		if (!context) return false;
		context.getExtension("WEBGL_lose_context")?.loseContext();
		return true;
	} catch {
		return false;
	}
}

export default function Stage({ plates }) {
	const [mode, setMode] = useState("off");
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (!canRender()) return;
		setMode(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "still" : "live");
	}, []);

	// Both are stable: `building.js` rebuilds its whole renderer when a prop changes.
	const onReady = useCallback(() => setReady(true), []);
	const onSlow = useCallback(() => setMode("still"), []);

	if (mode === "off") return null;

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-700 ease-press"
			style={{ opacity: ready ? 1 : 0 }}
		>
			<Building
				plates={plates}
				still={mode === "still"}
				onReady={onReady}
				onSlow={onSlow}
			/>
		</div>
	);
}
