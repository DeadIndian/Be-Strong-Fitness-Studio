"use client";

/**
 * The plan desk. Presentational: the console above owns the fetch, the POST and
 * the state, so the band showing what you hold and the rows offering a term can
 * never disagree with each other.
 *
 * While checkout is a placeholder, every word here says so. The control records
 * a plan; it does not claim to have taken money.
 */

import Panel, { Notice } from "../board/panel";
import Press from "../board/press";
import RateRow from "../board/rate-row";
import { Stamp } from "../board/tile-text";

/** What the one control on a row may say, given what the member already holds. */
function controlFor(plan, membership, busyPlan) {
	if (busyPlan === plan.id) return { label: "Working", disabled: true, tone: "ghost" };
	if (busyPlan) return { label: "Take this term", disabled: true, tone: "ghost" };

	const held = membership?.planId === plan.id;
	const status = membership?.status ?? "";
	if (held && status === "active") return { label: "You are on this", disabled: true, tone: "ghost" };
	if (held) return { label: "Start this again", disabled: false, tone: "action" };
	if (status === "active") return { label: "Move to this term", disabled: false, tone: "tile" };
	return { label: "Take this term", disabled: false, tone: "action" };
}

export default function MembershipDesk({
	plans = [],
	membership = null,
	loading = false,
	busyPlan = "",
	placeholder = true,
	payNote = "",
	onActivate,
}) {
	if (loading) {
		return (
			<Panel title="The rates">
				<Stamp>Reading the board</Stamp>
			</Panel>
		);
	}

	if (!plans.length) {
		return (
			<Panel title="The rates" hint="The studio has not put any plans on the board yet.">
				<Notice>Ask at the desk what a membership costs today.</Notice>
			</Panel>
		);
	}

	const terms = [...plans].sort((a, b) => a.durationMonths - b.durationMonths);

	return (
		<Panel
			title="The rates"
			hint="Same room, same equipment, same hours on every term. Only the length changes."
		>
			{placeholder ? (
				<div
					className="flex flex-col gap-1 p-3"
					style={{ border: "1px solid var(--rail)", backgroundColor: "var(--board)" }}
				>
					<Stamp tone="action">No card is charged in this app</Stamp>
					<p className="max-w-measure text-[0.82rem] leading-relaxed text-tile">
						Taking a term here records it on your account so the studio can see it. The app takes
						no payment.
						{payNote ? ` ${payNote}` : ""}
					</p>
				</div>
			) : null}

			<ul className="flex flex-col gap-3">
				{terms.map((plan) => {
					const control = controlFor(plan, membership, busyPlan);
					const held = membership?.planId === plan.id;
					return (
						<li
							key={plan.id}
							className="flex flex-col"
							style={{
								border: held ? "1px solid var(--action)" : "1px solid var(--rail)",
								backgroundColor: "var(--board)",
							}}
						>
							<RateRow plan={plan} />

							<div className="flex flex-col gap-3 px-3 pb-3 pt-2 sm:px-4">
								<p className="text-[0.78rem] leading-snug text-muted">
									Runs {plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"} from
									the day you take it.
									{plan.perks?.length ? ` Includes ${plan.perks.join(" and ")}.` : ""}
								</p>
								<Press
									tone={control.tone}
									size="md"
									full
									disabled={control.disabled}
									onClick={() => onActivate(plan.id)}
								>
									{control.label}
								</Press>
							</div>
						</li>
					);
				})}
			</ul>

			<p className="max-w-measure text-[0.78rem] leading-relaxed text-muted">
				A member already on a plan keeps the price they were sold. Moving to another term starts
				that term from today.
			</p>
		</Panel>
	);
}
