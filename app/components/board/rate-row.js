/**
 * One priced term, as it reads on the landing board and again at the member's
 * desk: the plate colour, the term, what a month of it costs, and the standing
 * price. One component for both, so a price the owner edits reads identically
 * wherever it appears and the two surfaces cannot drift apart.
 *
 * The face carries no container of its own — the caller decides what the line
 * *is*. The landing board wraps it in a ledger row that is itself the tap
 * target; the desk wraps it in a hairline row with one control beneath it.
 */

import { plateColor } from "@/lib/site/defaults";
import { TileText } from "./tile-text";

export function perMonth(plan) {
	const months = Number(plan?.durationMonths) || 1;
	return Math.round((Number(plan?.priceInr) || 0) / months);
}

/** The plate that stands for this plan, in the colour the rig carries on its hub. */
export function Plate({ kg, className = "" }) {
	const colour = plateColor(kg);
	return (
		<span
			aria-hidden="true"
			className={`h-2.5 w-2.5 flex-none rounded-full sm:h-3 sm:w-3 ${className}`}
			style={{
				backgroundColor: colour,
				boxShadow: `0 0 0 1px rgba(0,0,0,0.55), 0 0 1rem color-mix(in srgb, ${colour} 55%, transparent)`,
			}}
		/>
	);
}

export default function PlanFace({ plan, className = "" }) {
	const months = Number(plan.durationMonths) || 1;
	return (
		<span className={`relative flex items-baseline gap-3 sm:gap-5 ${className}`}>
			<Plate kg={plan.plate} />
			<span className="flex min-w-0 flex-1 flex-col gap-1.5">
				<TileText text={plan.title} className="tile-sm" />
				<span className="tabular text-[0.68rem] uppercase leading-snug tracking-[0.16em] text-muted">
					{months} {months === 1 ? "month" : "months"}
					{plan.perks?.length ? ` · ${plan.perks.join(" · ")}` : ""}
				</span>
			</span>
			<span className="flex flex-none flex-col items-end gap-1.5">
				<span className="flex items-baseline">
					<span aria-hidden="true" className="pr-1 text-[0.8rem] font-bold text-muted sm:text-[1rem]">
						₹
					</span>
					{/* The price is the biggest thing on the line because it is what the
					    visitor came to read. */}
					<span className="tabular text-[2.1rem] font-extrabold leading-[0.8] tracking-[-0.04em] text-tile transition-colors duration-200 [font-stretch:76%] group-hover:text-action sm:text-[3.1rem]">
						{plan.priceInr.toLocaleString("en-IN")}
					</span>
				</span>
				<span className="tabular text-[0.66rem] uppercase tracking-[0.16em] text-muted">
					₹{perMonth(plan).toLocaleString("en-IN")} a month
				</span>
			</span>
		</span>
	);
}
