/**
 * A panel is a card on the board: brass edge, deep slot ground, a stamped title
 * and one optional control on the right. Every logged-in surface is built from
 * these, so the member console and the staff console are the same object.
 */

import { Stamp } from "./tile-text";

export default function Panel({ title, hint, actions = null, children, className = "" }) {
	return (
		<section
			className={`flex flex-col gap-4 p-3 sm:p-4 ${className}`}
			style={{ border: "1px solid var(--rail)", backgroundColor: "var(--board-deep)" }}
		>
			{title || actions || hint ? (
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						{title ? <Stamp tone="action">{title}</Stamp> : null}
						{hint ? (
							<p className="max-w-measure text-[0.78rem] leading-snug text-muted">{hint}</p>
						) : null}
					</div>
					{actions}
				</div>
			) : null}
			{children}
		</section>
	);
}

/** A label and its value, lined up in a column of them. */
export function Readout({ label, value, className = "" }) {
	return (
		<div className={`flex flex-col gap-0.5 ${className}`}>
			<Stamp>{label}</Stamp>
			<span className="tabular text-[0.9rem] font-bold text-tile">{value}</span>
		</div>
	);
}

/** The one place a surface says something went wrong or landed. */
export function Notice({ tone = "info", children }) {
	if (!children) return null;
	const color = tone === "error" ? "#FF8A8F" : tone === "good" ? "var(--action)" : "var(--muted)";
	return (
		<p
			role={tone === "error" ? "alert" : "status"}
			className="text-[0.8rem] font-bold uppercase tracking-[0.12em]"
			style={{ color }}
		>
			{children}
		</p>
	);
}
