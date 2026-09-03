"use client";

/**
 * The board's section switch: labels on one hairline, the live one carrying the
 * light. No rail and no pills — the same rule that separates every row on the
 * site, with the active label sitting on a lit segment of it. On a phone it
 * scroll-snaps instead of wrapping into a second row.
 */

export default function Tabs({ label, items, active, onSelect, className = "" }) {
	return (
		<nav
			aria-label={label}
			className={`flex snap-x gap-1 overflow-x-auto border-b border-edge ${className}`}
		>
			{items.map((item) => {
				const live = item.id === active;
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => onSelect(item.id)}
						aria-current={live ? "true" : undefined}
						// -mb-px lands the lit segment on the hairline itself, not under it.
						className={`-mb-px min-h-[2.9rem] flex-none snap-start border-b-2 px-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] transition-colors ${
							live
								? "border-action text-tile"
								: "border-transparent text-muted hover:border-edge hover:text-tile"
						}`}
					>
						{item.label}
					</button>
				);
			})}
		</nav>
	);
}
