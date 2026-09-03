/**
 * One priced row of the board: plate colour, term, what a month of it costs,
 * and the standing price. The same row is used on the landing board and in
 * checkout, so a price the owner edits reads identically in both places.
 */

import { plateColor } from "@/lib/site/defaults";
import { Stamp, TileText } from "./tile-text";

export function perMonth(plan) {
	const months = Number(plan?.durationMonths) || 1;
	return Math.round((Number(plan?.priceInr) || 0) / months);
}

export function PlateSwatch({ kg, className = "" }) {
	return (
		<span
			aria-hidden="true"
			className={`h-[1.05rem] w-[1.05rem] flex-none rounded-full shadow-tile sm:h-5 sm:w-5 ${className}`}
			style={{
				backgroundColor: plateColor(kg),
				border: "1px solid rgba(0,0,0,0.35)",
				boxShadow: "0.06em 0.09em 0 rgba(0,0,0,0.42), inset 0 0 0 0.16em rgba(0,0,0,0.18)",
			}}
		/>
	);
}

export default function RateRow({ plan, press = false, action = null, className = "" }) {
	return (
		<div
			className={`slot-rail flex min-h-[3.1rem] items-center gap-3 px-3 sm:gap-4 sm:px-4 lg:min-h-[4.4rem] lg:px-5 ${className}`}
		>
			<PlateSwatch kg={plan.plate} />

			<span className="flex min-w-0 flex-col gap-1">
				{/* The tile is the layout unit, so a wide screen gets a bigger tile —
				    never a rearranged row. */}
				<TileText text={plan.title} className="tile-xs lg:[--tile-size:1.15rem]" press={press} />
				<Stamp className="tabular">₹{perMonth(plan).toLocaleString("en-IN")} a month</Stamp>
			</span>

			<span className="ml-auto flex items-center gap-1.5">
				<span aria-hidden="true" className="text-[0.9rem] font-bold text-rail sm:text-[1.05rem] lg:text-[1.3rem]">
					₹
				</span>
				<TileText
					text={String(plan.priceInr)}
					className="tile-sm tabular lg:[--tile-size:1.7rem]"
					press={press}
					stagger={34}
				/>
			</span>

			{action}
		</div>
	);
}
