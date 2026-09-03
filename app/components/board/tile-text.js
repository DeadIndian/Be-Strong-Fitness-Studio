/**
 * A run of letters set as tiles. The tile is the layout unit of the whole site:
 * narrow viewports get a smaller tile and fewer tiles per row, never a different
 * composition. Screen readers get the whole word, not the letters.
 */

export function TileText({
	text,
	className = "",
	tileClassName = "",
	press = false,
	stagger = 26,
	style,
	as: Tag = "span",
	// A plain prop, not forwardRef: this module is rendered from server components too.
	innerRef = undefined,
}) {
	// Letters are laid out per word, so a run that has to wrap breaks between
	// words like type does — never mid-word, which is what a flat list of
	// inline-flex characters does at any width narrower than the whole line.
	let cursor = 0;
	const words = String(text ?? "")
		.toUpperCase()
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => {
			const start = cursor;
			cursor += word.length;
			return { word, start };
		});

	return (
		<Tag
			ref={innerRef}
			aria-label={String(text ?? "")}
			className={`inline-flex flex-wrap items-center gap-x-[0.34em] gap-y-[0.06em] ${className}`}
			style={style}
		>
			{words.map(({ word, start }) => (
				<span
					aria-hidden="true"
					key={`${word}-${start}`}
					className="inline-flex flex-none items-center gap-[0.12em]"
				>
					{Array.from(word).map((character, offset) => (
						<span
							key={`${character}-${offset}`}
							className={`letter-tile ${tileClassName}`}
							data-press={press ? "true" : undefined}
							style={press ? { "--press-delay": `${(start + offset) * stagger}ms` } : undefined}
						>
							{character}
						</span>
					))}
				</span>
			))}
		</Tag>
	);
}

/** Unlettered slots: what a row looks like before the owner fills it in. */
export function EmptySlots({ count = 8, label, className = "" }) {
	return (
		<span
			className={`inline-flex flex-wrap items-center gap-[0.12em] ${className}`}
			role="img"
			aria-label={label ?? "Not filled in yet"}
		>
			{Array.from({ length: count }).map((_, index) => (
				<span aria-hidden="true" key={index} className="letter-tile" data-empty="true" />
			))}
		</span>
	);
}

/** A small stamped caption in the board's own voice: not a kicker above a heading. */
export function Stamp({ children, className = "", tone = "muted" }) {
	const color = tone === "action" ? "text-action" : tone === "tile" ? "text-tile" : "text-muted";
	return (
		<span
			className={`inline-block text-[0.68rem] font-bold uppercase tracking-[0.22em] ${color} ${className}`}
		>
			{children}
		</span>
	);
}
