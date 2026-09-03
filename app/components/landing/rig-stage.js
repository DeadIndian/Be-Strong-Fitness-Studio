"use client";

/**
 * Whether the visitor gets the rig at all, decided before three.js is fetched:
 * no WebGL means no download and no canvas, reduced motion means one still
 * frame, otherwise the scroll drives it. The page's own ground stays behind it,
 * so a visitor with none of this reads a finished page rather than a broken one.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Rig = dynamic(() => import("./rig"), { ssr: false });

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

export default function RigStage({ plates, scrollTarget }) {
	const [mode, setMode] = useState("off");
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (!canRender()) return;
		setMode(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "still" : "live");
	}, []);

	if (mode === "off") return null;

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-700 ease-press"
			style={{ opacity: ready ? 1 : 0 }}
		>
			<Rig
				plates={plates}
				scrollTarget={scrollTarget}
				still={mode === "still"}
				onReady={() => setReady(true)}
			/>
		</div>
	);
}
