"use client";

/**
 * The week as it is posted on the door, and the one line the shutter itself says.
 *
 * Days with the same hours collapse into one row, so the reader takes in
 * "Mon – Sat · 5:00 am – 10:00 pm" instead of comparing seven bars that all say
 * the same thing.
 *
 * Both exports read the studio's own wall clock on the client and print nothing
 * about *now* until they have. Pages are cached: baked-in HTML claiming "open
 * until 10:00 pm" would be an hour old and wrong, and the one fact a visitor came
 * here for is the one we may not guess at.
 */

import { useEffect, useState } from "react";
import { doorLine } from "@/lib/gym/clock.mjs";
import {
	clockInZone,
	formatMinutes,
	openState,
	toMinutes,
	WEEKDAY_LABELS,
} from "@/lib/site/hours.mjs";

/** One day's opening hours as posted text, or "Closed". */
function dayText(day) {
	const spans = [];
	for (const range of day?.ranges ?? []) {
		const start = toMinutes(range?.[0]);
		const close = toMinutes(range?.[1]);
		if (start === null || close === null) continue;
		spans.push([start, close <= start ? close + 1440 : close]);
	}
	if (!spans.length) return "Closed";
	return spans
		.sort((a, b) => a[0] - b[0])
		.map(([start, end]) => `${formatMinutes(start)} – ${formatMinutes(end)}`)
		.join(", ");
}

/** Consecutive days that read the same become one row. */
function runs(hours) {
	const rows = [];
	for (let index = 0; index < 7; index += 1) {
		const text = dayText((hours?.days ?? []).find((day) => Number(day.day) === index));
		const last = rows[rows.length - 1];
		if (last && last.text === text) last.to = index;
		else rows.push({ from: index, to: index, text });
	}
	return rows;
}

function runLabel({ from, to }) {
	if (from === to) return WEEKDAY_LABELS[from];
	return `${WEEKDAY_LABELS[from].slice(0, 3)} – ${WEEKDAY_LABELS[to].slice(0, 3)}`;
}

/** The studio's own clock, re-read on a timer so a long-open tab does not go stale. */
function useStudioClock(hours, everyMs = 30_000) {
	const [state, setState] = useState(null);

	useEffect(() => {
		const zone = hours?.timezone || "Asia/Kolkata";
		const read = () => {
			const clock = clockInZone(new Date(), zone);
			setState({ day: clock.day, ...openState(hours?.days, clock) });
		};
		read();
		const id = setInterval(read, everyMs);
		return () => clearInterval(id);
	}, [hours, everyMs]);

	return state;
}

/**
 * What the door says: the same sentence the rig lights the room by, so the copy
 * and the shutter can never disagree. Empty while the clock is unread and empty
 * for a studio with no hours on file — an empty table is not licence to invent an
 * opening time — but it holds its line of height either way, so the door does not
 * jump when the answer arrives.
 */
export function DoorLine({ hours, className = "" }) {
	const state = useStudioClock(hours);
	const line = state ? doorLine(state) : "";

	return (
		<p
			aria-live="polite"
			className={`min-h-[1.4em] text-[0.82rem] font-bold uppercase tracking-[0.2em] ${
				state?.open ? "text-action" : "text-muted"
			} ${className}`}
		>
			{line}
		</p>
	);
}

export default function HoursStrip({ hours, className = "" }) {
	const state = useStudioClock(hours, 60_000);
	const today = state?.day ?? null;

	return (
		<div className={`flex flex-col gap-5 ${className}`}>
			<ul className="flex flex-col border-b border-edge">
				{runs(hours).map((run) => {
					const now = today !== null && today >= run.from && today <= run.to;
					const shut = run.text === "Closed";
					return (
						<li
							key={run.from}
							data-yield
							className="flex flex-col gap-1 border-t border-edge py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:py-4"
						>
							<span className="flex items-center gap-3">
								<span
									className={`text-[0.74rem] font-bold uppercase tracking-[0.16em] ${
										now ? "text-action" : "text-tile"
									}`}
								>
									{runLabel(run)}
								</span>
								{now ? (
									<span className="bg-action px-1.5 py-0.5 text-[0.56rem] font-bold uppercase tracking-[0.18em] text-ink">
										Today
									</span>
								) : null}
							</span>

							<span
								className={`tabular text-[0.98rem] font-bold uppercase leading-tight tracking-[0.02em] [font-stretch:80%] sm:text-right sm:text-[1.15rem] ${
									shut ? "text-muted" : now ? "text-action" : "text-tile"
								}`}
							>
								{run.text}
							</span>
						</li>
					);
				})}
			</ul>
			{hours?.note ? (
				<p className="max-w-measure text-[0.78rem] leading-relaxed text-muted">{hours.note}</p>
			) : null}
		</div>
	);
}
