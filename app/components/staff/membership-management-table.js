"use client";

/**
 * Who is on what plan. One row per account: the plan and the standing on the
 * left, the two controls that can change them on the right. Assigning a plan is
 * the same act the member's own console performs, so it says the same thing —
 * a term recorded, not a payment taken.
 */

import { useState } from "react";
import Panel, { Notice } from "../board/panel";
import { Stamp } from "../board/tile-text";

const STATUS_COLOR = {
	active: "var(--action)",
	paused: "var(--muted)",
	cancelled: "var(--warn)",
	expired: "var(--warn)",
};

function day(value) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function MembershipManagementTable({ initialUsers, plans, allowedStatus }) {
	const [users, setUsers] = useState(initialUsers);
	const [filter, setFilter] = useState("");
	const [busy, setBusy] = useState("");
	const [error, setError] = useState("");
	const [note, setNote] = useState("");

	const patch = async (uid, body) => {
		setBusy(uid);
		setError("");
		setNote("");
		try {
			const response = await fetch("/api/staff/memberships", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ uid, ...body }),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(data?.error ?? "Could not change that membership.");
				return;
			}
			setUsers((current) =>
				current.map((user) =>
					user.uid === uid
						? { ...user, membership: { ...(user.membership ?? {}), ...(data?.membership ?? {}) } }
						: user,
				),
			);
			setNote("Saved.");
		} catch {
			setError("Could not reach the studio database.");
		} finally {
			setBusy("");
		}
	};

	const term = filter.trim().toLowerCase();
	const rows = [...users]
		.sort((a, b) => String(a.email ?? "").localeCompare(String(b.email ?? "")))
		.filter((user) =>
			term ? `${user.email ?? ""} ${user.displayName ?? ""}`.toLowerCase().includes(term) : true,
		);
	const onPlan = users.filter((user) => user.membership?.status === "active").length;

	return (
		<Panel
			title={`${onPlan} of ${users.length} on a plan`}
			hint="Assigning a plan starts its term today. Nothing here takes a payment."
			actions={
				users.length > 8 ? (
					<input
						className="board-input sm:w-56"
						value={filter}
						onChange={(event) => setFilter(event.target.value)}
						placeholder="Find by email or name"
						aria-label="Find a member"
					/>
				) : null
			}
		>
			<Notice tone={error ? "error" : "good"}>{error || note}</Notice>

			<ul className="flex flex-col">
				{rows.map((user) => {
					const membership = user.membership ?? null;
					const working = busy === user.uid;
					const status = membership?.status ?? "";
					return (
						<li
							key={user.uid}
							className="flex flex-col gap-3 border-t border-edge py-4 first:border-t-0 first:pt-0 last:pb-0"
						>
							<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
								<span className="min-w-0 truncate text-[0.84rem] font-bold text-tile">
									{user.email ?? "No email on the account"}
								</span>
								{user.role === "staff" ? <Stamp tone="action">Staff</Stamp> : null}
							</div>

							<div className="flex flex-wrap gap-x-6 gap-y-1">
								<Stamp className="text-tile">{membership?.planTitle ?? "No plan"}</Stamp>
								<span
									className="text-[0.68rem] font-bold uppercase tracking-[0.22em]"
									style={{ color: STATUS_COLOR[status] ?? "var(--muted)" }}
								>
									{status || "nothing recorded"}
								</span>
								<Stamp className="tabular">Runs to {day(membership?.expiresAt)}</Stamp>
							</div>

							<div className="flex flex-col gap-2 sm:flex-row">
								<label className="flex flex-1 flex-col gap-1">
									<Stamp>Put on a plan</Stamp>
									<select
										className="board-input"
										disabled={working}
										value=""
										onChange={(event) => {
											if (event.target.value) {
												patch(user.uid, { planId: event.target.value, status: "active" });
											}
										}}
									>
										<option value="">
											{membership?.planTitle ? "Change the term" : "Pick a term"}
										</option>
										{plans.map((plan) => (
											<option key={plan.id} value={plan.id}>
												{plan.title} — ₹{plan.priceInr}
											</option>
										))}
									</select>
								</label>

								<label className="flex flex-1 flex-col gap-1">
									<Stamp>Standing</Stamp>
									<select
										className="board-input"
										disabled={working || !membership?.planId}
										value={status}
										onChange={(event) => patch(user.uid, { status: event.target.value })}
									>
										{membership?.planId ? null : <option value="">No plan yet</option>}
										{allowedStatus.map((option) => (
											<option key={option} value={option}>
												{option}
											</option>
										))}
									</select>
								</label>
							</div>

							{working ? <Stamp tone="action">Saving</Stamp> : null}
						</li>
					);
				})}
			</ul>

			{!rows.length ? <Stamp>No account matches that</Stamp> : null}
		</Panel>
	);
}
