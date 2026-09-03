/**
 * The site's one control shape: a hard-edged bar of light. Every button, submit
 * and primary link is this component — there is no second button style. It lifts
 * toward the light on hover and settles back in when pressed.
 */

import Link from "next/link";

// One tone per job, and the border is what the light catches on.
const TONES = {
	action: {
		className: "bg-action text-ink hover:shadow-lit",
		style: { borderColor: "color-mix(in srgb, var(--action) 70%, white)" },
	},
	tile: {
		className: "bg-tile text-ink",
		style: { borderColor: "rgba(255,255,255,0.9)" },
	},
	ghost: {
		className: "bg-[rgba(255,255,255,0.04)] text-tile hover:bg-[rgba(255,255,255,0.1)]",
		style: { borderColor: "var(--edge)" },
	},
	danger: {
		className: "bg-accent text-ink",
		style: { borderColor: "color-mix(in srgb, var(--accent) 70%, white)" },
	},
};

const SIZES = {
	sm: "min-h-[2.5rem] px-3 text-[0.7rem] tracking-[0.16em]",
	md: "min-h-[2.75rem] px-4 text-[0.78rem] tracking-[0.18em]",
	lg: "min-h-[3.25rem] px-5 text-[0.92rem] tracking-[0.16em] sm:px-7",
};

export default function Press({
	children,
	href,
	tone = "action",
	size = "md",
	className = "",
	full = false,
	style,
	...rest
}) {
	const skin = TONES[tone] ?? TONES.action;
	const classes = [
		"inline-flex select-none items-center justify-center gap-2 whitespace-nowrap border text-center font-bold uppercase leading-none",
		"transition-all duration-200 ease-press",
		"hover:-translate-y-[0.08em] active:translate-y-[0.04em]",
		"disabled:pointer-events-none disabled:opacity-45",
		skin.className,
		SIZES[size] ?? SIZES.md,
		full ? "w-full" : "",
		className,
	].join(" ");
	const merged = { ...skin.style, ...style };

	if (href) {
		if (/^(https?:|mailto:|tel:)/.test(href)) {
			return (
				<a className={classes} style={merged} href={href} {...rest}>
					{children}
				</a>
			);
		}
		return (
			<Link className={classes} style={merged} href={href} {...rest}>
				{children}
			</Link>
		);
	}

	return (
		<button className={classes} style={merged} type={rest.type ?? "button"} {...rest}>
			{children}
		</button>
	);
}
