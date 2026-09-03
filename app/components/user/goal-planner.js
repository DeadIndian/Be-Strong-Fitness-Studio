"use client";

/**
 * The planner. Your numbers, then a target, then the plan the numbers imply.
 * Everything here is arithmetic on what you typed — it is labelled as such, and
 * it never claims a trainer or a dietitian looked at it.
 */

import { useEffect, useState } from "react";
import Panel, { Notice, Readout } from "../board/panel";
import Press from "../board/press";
import { SelectField, TextField } from "../board/field";
import { Stamp } from "../board/tile-text";

const BLANK = {
	age: "",
	heightCm: "",
	weightKg: "",
	gender: "unspecified",
	activityLevel: "moderate",
	trainingDays: "4",
	dietaryPreference: "none",
};

const ACTIVITY = [
	{ value: "sedentary", label: "Desk job, no training" },
	{ value: "light", label: "Light — a walk most days" },
	{ value: "moderate", label: "Moderate — training some days" },
	{ value: "active", label: "Active — training most days" },
	{ value: "very_active", label: "Very active — hard training daily" },
];

const GENDER = [
	{ value: "unspecified", label: "Rather not say" },
	{ value: "male", label: "Male" },
	{ value: "female", label: "Female" },
];

function fromApi(profile) {
	if (!profile) return BLANK;
	return {
		age: String(profile.age ?? ""),
		heightCm: String(profile.heightCm ?? ""),
		weightKg: String(profile.weightKg ?? ""),
		gender: String(profile.gender ?? "unspecified"),
		activityLevel: String(profile.activityLevel ?? "moderate"),
		trainingDays: String(profile.trainingDays ?? "4"),
		dietaryPreference: String(profile.dietaryPreference ?? "none"),
	};
}

/** One list of the plan's lines under a stamped heading. */
function PlanList({ title, items }) {
	if (!Array.isArray(items) || !items.length) return null;
	return (
		<div
			className="flex flex-col gap-2 p-3"
			style={{ border: "1px solid var(--rail)", backgroundColor: "var(--board)" }}
		>
			<Stamp tone="action">{title}</Stamp>
			<ul className="flex flex-col gap-1.5">
				{items.map((item) => (
					<li key={item} className="flex gap-2 text-[0.8rem] leading-snug text-tile">
						<span aria-hidden="true" className="text-rail">
							/
						</span>
						{item}
					</li>
				))}
			</ul>
		</div>
	);
}

export default function GoalPlanner() {
	const [profile, setProfile] = useState(BLANK);
	const [goals, setGoals] = useState([]);
	const [chosen, setChosen] = useState("");
	const [plan, setPlan] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState("");
	const [note, setNote] = useState("");

	useEffect(() => {
		let live = true;
		(async () => {
			try {
				const response = await fetch("/api/user/plan", { cache: "no-store" });
				const body = await response.json().catch(() => ({}));
				if (!live) return;
				if (!response.ok) {
					setError(body?.error ?? "Could not load your details.");
					return;
				}
				setProfile(fromApi(body?.profile));
				setGoals(Array.isArray(body?.goals) ? body.goals : []);
				setChosen(String(body?.selectedGoal ?? ""));
				setPlan(body?.plan ?? null);
			} catch {
				if (live) setError("Could not reach the studio.");
			} finally {
				if (live) setLoading(false);
			}
		})();
		return () => {
			live = false;
		};
	}, []);

	const edit = (event) => {
		const { name, value } = event.target;
		setProfile((current) => ({ ...current, [name]: value }));
		setNote("");
	};

	const saveProfile = async (event) => {
		event.preventDefault();
		setSaving(true);
		setError("");
		setNote("");
		try {
			const response = await fetch("/api/user/plan", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ profile }),
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(body?.error ?? "Could not save your details.");
				return;
			}
			setProfile(fromApi(body?.profile));
			setGoals(Array.isArray(body?.goals) ? body.goals : []);
			setNote("Saved. Pick a target below.");
		} catch {
			setError("Could not reach the studio.");
		} finally {
			setSaving(false);
		}
	};

	const pickGoal = async (goalId) => {
		setWorking(true);
		setError("");
		setNote("");
		try {
			const response = await fetch("/api/user/plan", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ goalId }),
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(body?.error ?? "Could not work out a plan.");
				return;
			}
			setChosen(String(body?.selectedGoal ?? goalId));
			setPlan(body?.plan ?? null);
			if (Array.isArray(body?.goals)) setGoals(body.goals);
		} catch {
			setError("Could not reach the studio.");
		} finally {
			setWorking(false);
		}
	};

	if (loading) {
		return (
			<Panel title="Your numbers">
				<Stamp>Reading your saved details</Stamp>
			</Panel>
		);
	}

	const ready = Boolean(profile.age && profile.heightCm && profile.weightKg);

	return (
		<>
			<Panel
				title="Your numbers"
				hint="Saved to your account only. Used to work out calories and a week's split."
			>
				<form className="grid gap-3 sm:grid-cols-2" onSubmit={saveProfile}>
					<TextField
						label="Age"
						name="age"
						type="number"
						inputMode="numeric"
						min="12"
						max="100"
						value={profile.age}
						onChange={edit}
						required
					/>
					<TextField
						label="Height in cm"
						name="heightCm"
						type="number"
						inputMode="numeric"
						min="120"
						max="230"
						value={profile.heightCm}
						onChange={edit}
						required
					/>
					<TextField
						label="Weight in kg"
						name="weightKg"
						type="number"
						inputMode="decimal"
						min="30"
						max="300"
						step="0.1"
						value={profile.weightKg}
						onChange={edit}
						required
					/>
					<SelectField label="Gender" name="gender" value={profile.gender} onChange={edit}>
						{GENDER.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</SelectField>
					<SelectField
						label="How you live now"
						name="activityLevel"
						value={profile.activityLevel}
						onChange={edit}
					>
						{ACTIVITY.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</SelectField>
					<TextField
						label="Training days a week"
						name="trainingDays"
						type="number"
						inputMode="numeric"
						min="1"
						max="7"
						value={profile.trainingDays}
						onChange={edit}
					/>
					<TextField
						label="Food you avoid or prefer"
						name="dietaryPreference"
						value={profile.dietaryPreference}
						onChange={edit}
						placeholder="Vegetarian, high protein, no seafood"
						className="sm:col-span-2"
					/>

					<div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
						<Notice tone={error ? "error" : "good"}>{error || note}</Notice>
						<Press type="submit" disabled={saving}>
							{saving ? "Saving" : "Save my numbers"}
						</Press>
					</div>
				</form>
			</Panel>

			{ready && goals.length ? (
				<Panel title="Your target" hint="One at a time. Changing it rewrites the plan below.">
					<ul className="grid gap-3 sm:grid-cols-2">
						{goals.map((goal) => {
							const live = goal.id === chosen;
							return (
								<li
									key={goal.id}
									className="flex flex-col gap-2 p-3"
									style={{
										border: live ? "1px solid var(--action)" : "1px solid var(--rail)",
										backgroundColor: "var(--board)",
									}}
								>
									<div className="flex flex-wrap items-baseline justify-between gap-2">
										<span className="text-[0.86rem] font-bold uppercase tracking-[0.06em] text-tile">
											{goal.title}
										</span>
										{goal.recommended ? <Stamp tone="action">Fits your numbers</Stamp> : null}
									</div>
									<p className="text-[0.78rem] leading-snug text-muted">{goal.description}</p>
									<Press
										tone={live ? "ghost" : "tile"}
										size="sm"
										full
										className="mt-auto"
										disabled={working || live}
										onClick={() => pickGoal(goal.id)}
									>
										{live ? "This is your target" : working ? "Working" : "Aim at this"}
									</Press>
								</li>
							);
						})}
					</ul>
				</Panel>
			) : null}

			{plan ? (
				<Panel
					title={`${plan.goalTitle} — the plan`}
					hint="Worked out from the numbers you saved. A calculator, not a dietitian: ask a doctor before a big change."
				>
					<p className="max-w-measure text-[0.84rem] leading-relaxed text-tile">{plan.overview}</p>

					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<Readout label="Runs for" value={`${plan.durationWeeks} weeks`} className="tabular" />
						<Readout label="A day" value={`${plan.dailyCalories} kcal`} className="tabular" />
						<Readout
							label="Protein · carbs · fat"
							value={`${plan.dailyMacros?.protein ?? "—"} · ${plan.dailyMacros?.carbs ?? "—"} · ${plan.dailyMacros?.fat ?? "—"} g`}
							className="tabular"
						/>
						<Readout label="Training days" value={profile.trainingDays} className="tabular" />
					</div>

					<div className="grid gap-3 sm:grid-cols-3">
						<PlanList title="Food" items={plan.nutritionPlan} />
						<PlanList title="Training" items={plan.trainingPlan} />
						<PlanList title="Daily habits" items={plan.habits} />
					</div>
				</Panel>
			) : null}
		</>
	);
}
