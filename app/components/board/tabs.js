"use client";

/**
 * The board's section switch: a slot rail of stamped labels with the live one
 * underlined in the accent. Used by the member console and the owner's panel, so
 * both surfaces change section the same way — and on a phone it scroll-snaps
 * instead of wrapping into a second row.
 */

export default function Tabs({ label, items, active, onSelect, className = "" }) {
	return (
		<nav aria-label={label} className={`slot-rail flex snap-x gap-1 overflow-x-auto px-1 ${className}`}>
			{items.map((item) => {
				const live = item.id === active;
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => onSelect(item.id)}
						aria-current={live ? "true" : undefined}
						className={`relative min-h-[2.75rem] flex-none snap-start px-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] transition-colors ${
							live ? "text-tile" : "text-muted hover:text-tile"
						}`}
					>
						{item.label}
						{live ? (
							<span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-[3px] bg-action" />
						) : null}
					</button>
				);
			})}
		</nav>
	);
}
