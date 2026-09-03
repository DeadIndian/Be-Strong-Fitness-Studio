"use client";

/**
 * The member console. One fetch of /api/user/membership at the top, so the plan
 * band and the plan rows can never disagree, and one section on screen at a
 * time — a phone gets the whole of the section it asked for instead of a
 * scroll-spy fighting the sticky rail.
 *
 * No header here: the site rail above already carries the studio name, the open
 * lamp and sign out.
 */

import { useCallback, useEffect, useState } from "react";
import { Notice, Readout } from "../board/panel";
import Tabs from "../board/tabs";
import { Stamp, TileText } from "../board/tile-text";
import CalorieCalculator from "./calorie-calculator";
import GoalPlanner from "./goal-planner";
import MembershipDesk from "./membership-desk";
import ReviewsPanel from "./reviews-panel";
import WorkoutFinder from "./workout-finder";

const SECTIONS = [
	{ id: "membership", label: "My plan" },
	{ id: "planner", label: "Training plan" },
	{ id: "nutrition", label: "Food" },
	{ id: "workouts", label: "Exercises" },
	{ id: "reviews", label: "Feedback" },
];

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

/** Whole days from now until then; negative days read as none left. */
function daysLeft(value) {
	if (!value) return null;
	const end = new Date(value).getTime();
	if (Number.isNaN(end)) return null;
	return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

export default function MemberConsole({ displayName, placeholder = true, payNote = "" }) {
	const [section, setSection] = useState(SECTIONS[0].id);
	const [plans, setPlans] = useState([]);
	const [membership, setMembership] = useState(null);
	const [loading, setLoading] = useState(true);
	const [busyPlan, setBusyPlan] = useState("");
	const [error, setError] = useState("");
	const [note, setNote] = useState("");

	useEffect(() => {
		let live = true;
		(async () => {
			try {
				const response = await fetch("/api/user/membership", { cache: "no-store" });
				const body = await response.json().catch(() => ({}));
				if (!live) return;
				if (!response.ok) {
					setError(body?.error ?? "Could not load your membership.");
					return;
				}
				setPlans(Array.isArray(body.plans) ? body.plans : []);
				setMembership(body.membership ?? null);
			} catch {
				if (live) setError("Could not reach the studio. Check your connection.");
			} finally {
				if (live) setLoading(false);
			}
		})();
		return () => {
			live = false;
		};
	}, []);

	const activate = useCallback(async (planId) => {
		setBusyPlan(planId);
		setError("");
		setNote("");
		try {
			const response = await fetch("/api/user/membership", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ planId }),
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(body?.error ?? "Could not put you on that plan.");
				return;
			}
			setMembership(body.membership ?? null);
			setNote("Recorded. The studio can see this plan on your account.");
		} catch {
			setError("Could not reach the studio. Check your connection.");
		} finally {
			setBusyPlan("");
		}
	}, []);

	const status = membership?.status ?? "";
	const left = daysLeft(membership?.expiresAt);

	return (
		<div className="mx-auto w-full max-w-board px-3 py-8 sm:px-6">
			<TileText as="h1" text={displayName.toUpperCase()} className="tile-md" />

			{/* What you hold, on one rule under your name — the standing of the account
			    is a fact to read at a glance, not a card to look at. */}
			<div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-4 border-y border-edge py-4">
				{loading ? (
					<Stamp>Reading your account</Stamp>
				) : membership?.planTitle ? (
					<>
						<Readout label="Plan" value={membership.planTitle} />
						<div className="flex flex-col gap-1">
							<span className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">
								Standing
							</span>
							<span
								className="text-[1rem] font-bold uppercase leading-none tracking-[0.01em] [font-stretch:82%]"
								style={{ color: STATUS_COLOR[status] ?? "var(--tile)" }}
							>
								{status || "unknown"}
							</span>
						</div>
						<Readout label="Started" value={day(membership.startedAt)} className="tabular" />
						<Readout
							label="Runs to"
							value={left === null ? day(membership.expiresAt) : `${day(membership.expiresAt)} · ${left} days`}
							className="tabular"
						/>
					</>
				) : (
					<div className="flex flex-col gap-1.5">
						<Stamp>No plan yet</Stamp>
						<p className="max-w-measure text-[0.82rem] leading-snug text-tile">
							Pick a term below. Every plan is the same room, the same equipment and the same hours
							— only the length differs.
						</p>
					</div>
				)}
			</div>

			<Tabs
				label="Console sections"
				items={SECTIONS}
				active={section}
				onSelect={setSection}
				className="mt-6"
			/>

			<div className="mt-6 flex flex-col gap-6">
				{error && section === "membership" ? <Notice tone="error">{error}</Notice> : null}
				{note && section === "membership" ? <Notice tone="good">{note}</Notice> : null}

				{section === "membership" ? (
					<MembershipDesk
						plans={plans}
						membership={membership}
						loading={loading}
						busyPlan={busyPlan}
						placeholder={placeholder}
						payNote={payNote}
						onActivate={activate}
					/>
				) : null}
				{section === "planner" ? <GoalPlanner /> : null}
				{section === "nutrition" ? <CalorieCalculator /> : null}
				{section === "workouts" ? <WorkoutFinder /> : null}
				{section === "reviews" ? <ReviewsPanel /> : null}
			</div>

			<hr className="hair mt-8" />
			<p className="mt-4 max-w-measure text-[0.8rem] leading-relaxed text-muted">
				Anything in here wrong? Ask at the desk — the studio edits its own rates, hours and details,
				so a correction does not wait on a developer.
			</p>
		</div>
	);
}
