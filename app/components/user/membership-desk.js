"use client";

/**
 * The plan desk. Presentational: the console above owns the fetch, the POST and
 * the state, so the band showing what you hold and the rows offering a term can
 * never disagree with each other.
 *
 * The rows are the landing board's ledger lines at desk density — same face,
 * same price, one hairline between terms — with a single control under each.
 * While checkout is a placeholder, every word here says so: the control records
 * a plan, it does not claim to have taken money.
 */

import Panel, { Aside, Notice } from "../board/panel";
import Press from "../board/press";
import PlanFace from "../board/rate-row";
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
				<Aside title="No card is charged in this app">
					Taking a term here records it on your account so the studio can see it. The app takes no
					payment.
					{payNote ? ` ${payNote}` : ""}
				</Aside>
			) : null}

			<ul className="flex flex-col">
				{terms.map((plan) => {
					const control = controlFor(plan, membership, busyPlan);
					const held = membership?.planId === plan.id;
					return (
						<li
							key={plan.id}
							className="flex flex-col gap-3 border-t border-edge py-4 first:border-t-0 first:pt-0 last:pb-0"
						>
							<PlanFace plan={plan} />
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
								{held ? (
									<span className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-action">
										The term you hold
									</span>
								) : null}
								<Press
									tone={control.tone}
									size="md"
									disabled={control.disabled}
									onClick={() => onActivate(plan.id)}
									className="w-full sm:ml-auto sm:w-auto"
								>
									{control.label}
								</Press>
							</div>
						</li>
					);
				})}
			</ul>

			<p className="max-w-measure text-[0.78rem] leading-relaxed text-muted">
				A term runs from the day you take it. A member already on a plan keeps the price they were
				sold; moving to another term starts that term from today.
			</p>
		</Panel>
	);
}
