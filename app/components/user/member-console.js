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
	const [section, setSection] = useState("");
	const [plans, setPlans] = useState([]);
	const [membership, setMembership] = useState(null);
	const [loading, setLoading] = useState(true);
	const [busyPlan, setBusyPlan] = useState("");
	const [error, setError] = useState("");
	const [note, setNote] = useState("");

	useEffect(() => {
		const handleHashChange = () => {
			const hash = window.location.hash.replace("#", "");
			if (SECTIONS.find(s => s.id === hash)) {
				setSection(hash);
			} else {
				setSection("");
			}
		};
		handleHashChange(); // initial
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	const goHub = () => {
		window.location.hash = "";
	};

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
			{section === "" ? (
				<>
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

					<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{SECTIONS.map((s) => (
							<a
								key={s.id}
								href={`#${s.id}`}
								className="group flex flex-col items-center justify-center gap-3 border border-edge bg-glass p-8 text-center transition-all hover:border-action hover:bg-[color-mix(in_srgb,var(--action)_10%,transparent)]"
							>
								<span className="text-[1.2rem] font-bold uppercase tracking-widest text-tile group-hover:text-action">
									{s.label}
								</span>
								<span className="h-[2px] w-8 bg-muted transition-all group-hover:w-16 group-hover:bg-action" />
							</a>
						))}
					</div>
				</>
			) : (
				<>
					<div className="mb-6 flex items-center justify-between border-b border-edge pb-4">
						<TileText as="h2" text={SECTIONS.find(s => s.id === section)?.label.toUpperCase()} className="tile-sm" />
						<button
							onClick={goHub}
							className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-muted hover:text-tile transition-colors"
						>
							← Back to Hub
						</button>
					</div>

					<div className="flex flex-col gap-6">
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
						{section === "workouts" ? (
							<>
								<WorkoutFinder />
								<div className="mt-4 flex justify-center border-t border-edge pt-8">
									<a href="/dashboard/user/workouts" className="group flex items-center justify-center gap-2 bg-action px-6 py-3 text-sm font-bold uppercase tracking-widest text-board transition-transform hover:scale-105 hover:bg-tile">
										✨ Generate AI Workout Plan ✨
									</a>
								</div>
							</>
						) : null}
						{section === "reviews" ? <ReviewsPanel /> : null}
					</div>
				</>
			)}

			<hr className="hair mt-8" />
			<p className="mt-4 max-w-measure text-[0.8rem] leading-relaxed text-muted">
				Anything in here wrong? Ask at the desk — the studio edits its own rates, hours and details,
				so a correction does not wait on a developer.
			</p>
		</div>
	);
}
