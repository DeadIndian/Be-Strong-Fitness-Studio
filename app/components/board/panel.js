/**
 * A panel is the working slab: the same glass object the landing page lays over
 * the room, at desk density. One hairline edge, one lit top edge, a title band
 * separated from its contents by the same hairline every rule on the site is
 * drawn with — never a brass box inside a brass box.
 *
 * Every logged-in surface is built from these, so the member console and the
 * owner's panel are the same object. Rows *inside* a panel are hairlines, not
 * further containers: this is the only container level a work surface gets.
 */

export default function Panel({ title, hint, actions = null, children, className = "" }) {
	const banded = Boolean(title || hint || actions);
	return (
		<section className={`slab flex flex-col ${className}`}>
			{banded ? (
				<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-edge px-4 py-3.5 sm:px-5">
					<div className="flex min-w-0 flex-col gap-1.5">
						{title ? (
							<h2 className="text-[0.9rem] font-bold uppercase leading-none tracking-[0.12em] text-tile [font-stretch:80%] sm:text-[1.05rem]">
								{title}
							</h2>
						) : null}
						{hint ? (
							<p className="max-w-measure text-[0.78rem] leading-snug text-muted">{hint}</p>
						) : null}
					</div>
					{actions}
				</div>
			) : null}
			<div className="flex flex-col gap-4 p-4 sm:p-5">{children}</div>
		</section>
	);
}

/** A label and its value, lined up in a column of them. */
export function Readout({ label, value, className = "" }) {
	return (
		<div className={`flex flex-col gap-1 ${className}`}>
			<span className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">
				{label}
			</span>
			<span className="text-[1rem] font-bold uppercase leading-none tracking-[0.01em] text-tile [font-stretch:82%]">
				{value}
			</span>
		</div>
	);
}

/** The one place a surface says something went wrong or landed. */
export function Notice({ tone = "info", children }) {
	if (!children) return null;
	const color = tone === "error" ? "text-warn" : tone === "good" ? "text-action" : "text-muted";
	return (
		<p
			role={tone === "error" ? "alert" : "status"}
			className={`text-[0.78rem] font-bold uppercase tracking-[0.12em] ${color}`}
		>
			{children}
		</p>
	);
}

/**
 * A quiet aside inside a panel: a fact the reader needs before acting, set off
 * by one lit hairline down its left rather than by a second box.
 */
export function Aside({ title, children }) {
	return (
		<div className="flex flex-col gap-1.5 border-l border-edge-lit pl-3.5">
			{title ? (
				<span className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-action">
					{title}
				</span>
			) : null}
			<p className="max-w-measure text-[0.82rem] leading-relaxed text-tile">{children}</p>
		</div>
	);
}
