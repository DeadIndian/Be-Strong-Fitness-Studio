import { plateColor } from "@/lib/site/defaults";
import { TileText } from "./tile-text";
import { perMonth } from "./rate-row";

export default function PricingCard({ plan, className = "" }) {
	const months = Number(plan.durationMonths) || 1;
	const colour = plateColor(plan.plate);

	return (
		<div
			className={`relative flex flex-col justify-between gap-6 overflow-hidden rounded-3xl p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl group ${className}`}
			style={{
				backgroundColor: "rgba(10, 10, 10, 0.65)",
				backdropFilter: "blur(12px)",
				WebkitBackdropFilter: "blur(12px)",
				boxShadow: `0 4px 24px -4px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)`,
			}}
		>
			{/* Ambient background glow matching the plate color */}
			<div
				className="absolute -top-1/2 -right-1/2 w-full h-full opacity-[0.15] blur-3xl pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.25]"
				style={{
					background: `radial-gradient(circle, ${colour} 0%, transparent 70%)`,
				}}
			/>

			{/* Border highlight on hover */}
			<div
				className="absolute inset-0 rounded-3xl pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				style={{
					boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${colour} 50%, transparent)`,
				}}
			/>

			{/* Header: Title and Plate indicator */}
			<div className="relative flex items-center justify-between gap-4">
				<TileText text={plan.title} className="tile-sm" />
				<span
					aria-hidden="true"
					className="h-3 w-3 flex-none rounded-full"
					style={{
						backgroundColor: colour,
						boxShadow: `0 0 0 1px rgba(0,0,0,0.55), 0 0 1rem color-mix(in srgb, ${colour} 60%, transparent)`,
					}}
				/>
			</div>

			{/* Price */}
			<div className="relative flex flex-col gap-1">
				<span className="flex items-baseline gap-1">
					<span aria-hidden="true" className="text-xl font-bold text-muted">
						₹
					</span>
					<span className="tabular text-4xl font-extrabold leading-[0.8] tracking-[-0.04em] text-tile [font-stretch:76%] transition-colors duration-200 group-hover:text-white sm:text-5xl">
						{plan.priceInr.toLocaleString("en-IN")}
					</span>
				</span>
				<span className="tabular text-xs uppercase tracking-[0.16em] text-muted">
					₹{perMonth(plan).toLocaleString("en-IN")} a month
				</span>
			</div>

			{/* Perks */}
			<div className="relative flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
				<span className="text-[0.68rem] uppercase font-bold tracking-[0.16em] text-muted mb-1">
					Includes
				</span>
				<ul className="flex flex-col gap-2">
					<li className="flex items-start gap-2 text-sm text-gray-300">
						<svg className="w-4 h-4 mt-0.5 text-action flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
						<span>{months} {months === 1 ? "month" : "months"} access</span>
					</li>
					{plan.perks?.map((perk, i) => (
						<li key={i} className="flex items-start gap-2 text-sm text-gray-300">
							<svg className="w-4 h-4 mt-0.5 text-action flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
							<span>{perk}</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
