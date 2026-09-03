"use client";

/**
 * The live OPEN / CLOSED lamp, read off the studio's own wall clock.
 *
 * The first paint claims nothing: pages are cached, so baked-in HTML must not
 * say "open now" from an hour ago. It renders today's hours (true whenever the
 * page was built) and the lamp lights on mount, then re-checks every 30s.
 */

import { useEffect, useState } from "react";
import { clockInZone, formatMinutes, openState } from "@/lib/site/hours.mjs";

function read(hours) {
	const zone = hours?.timezone || "Asia/Kolkata";
	return openState(hours?.days, clockInZone(new Date(), zone));
}

export function useOpenState(hours) {
	const [state, setState] = useState(null);

	useEffect(() => {
		setState(read(hours));
		const id = setInterval(() => setState(read(hours)), 30_000);
		return () => clearInterval(id);
	}, [hours]);

	return state;
}

/** Today's spans as plain text: "5:00 am – 10:00 pm", or "Closed". */
export function spansLabel(spans) {
	if (!spans?.length) return "Closed";
	return spans
		.map(([start, end]) => `${formatMinutes(start)} – ${formatMinutes(end)}`)
		.join("  ·  ");
}

export default function OpenNow({ hours, className = "", detailClassName = "" }) {
	const state = useOpenState(hours);

	const lamp = state === null ? "unknown" : state.open ? "open" : "shut";
	const headline =
		state === null
			? "Today"
			: state.open
				? "Open now"
				: state.nextOpen
					? `Opens ${state.nextOpen.inDays === 0 ? "today" : state.nextOpen.inDays === 1 ? "tomorrow" : state.nextOpen.day} ${formatMinutes(state.nextOpen.at)}`
					: "Closed";

	// The detail only earns its place when it says something the headline does not:
	// when it closes, or the second window on a split day. "Opens today 5:00 am"
	// followed by "Today 5:00 am – 10:00 pm" is the same fact twice.
	const detail =
		state === null
			? null
			: state.open && state.closesAt !== null
				? `until ${formatMinutes(state.closesAt)}`
				: state.today?.length > 1
					? `Today ${spansLabel(state.today)}`
					: null;

	return (
		<span
			className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className}`}
			aria-live="polite"
		>
			<span
				aria-hidden="true"
				className="h-2.5 w-2.5 flex-none rounded-full"
				style={{
					backgroundColor:
						lamp === "open" ? "var(--action)" : lamp === "shut" ? "var(--muted)" : "var(--rail)",
					boxShadow: lamp === "open" ? "0 0 0 0.28em color-mix(in srgb, var(--action) 22%, transparent)" : "none",
				}}
			/>
			<span className="whitespace-nowrap text-[0.7rem] font-bold uppercase tracking-[0.16em] text-tile">
				{headline}
			</span>
			{detail ? (
				<span
					className={`tabular whitespace-nowrap text-[0.7rem] uppercase tracking-[0.1em] text-muted ${detailClassName}`}
				>
					{detail}
				</span>
			) : null}
		</span>
	);
}
