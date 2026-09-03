"use client";

/**
 * The week the way it is posted on the door: days with the same hours collapse
 * into one line, so the reader takes in "Mon – Sat · 5:00 am – 10:00 pm" instead
 * of comparing seven bars that all say the same thing. Whether the studio is
 * open right now is the lamp's job, not this list's.
 *
 * Today's line is marked only once the studio's own clock has been read on the
 * client, so a cached page never points at the wrong day.
 */

import { useEffect, useState } from "react";
import { clockInZone, formatMinutes, toMinutes, WEEKDAY_LABELS } from "@/lib/site/hours.mjs";

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

export default function HoursBand({ hours, className = "" }) {
	const [today, setToday] = useState(null);
	const zone = hours?.timezone || "Asia/Kolkata";

	useEffect(() => {
		const read = () => setToday(clockInZone(new Date(), zone).day);
		read();
		const id = setInterval(read, 60_000);
		return () => clearInterval(id);
	}, [zone]);

	return (
		<div className={`flex flex-col gap-5 ${className}`}>
			<ul className="flex flex-col border-b border-edge">
				{runs(hours).map((run) => {
					const now = today !== null && today >= run.from && today <= run.to;
					const shut = run.text === "Closed";
					return (
						<li
							key={run.from}
							className="flex flex-col gap-1 border-t border-edge py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:py-5"
						>
							<span className="flex items-center gap-3">
								<span
									className={`text-[0.78rem] font-bold uppercase tracking-[0.16em] ${
										now ? "text-action" : "text-tile"
									}`}
								>
									{runLabel(run)}
								</span>
								{now ? (
									<span className="bg-action px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-ink">
										Today
									</span>
								) : null}
							</span>

							<span
								className={`tabular text-[1.05rem] font-bold uppercase leading-tight tracking-[0.02em] [font-stretch:80%] sm:text-right sm:text-[1.35rem] ${
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
