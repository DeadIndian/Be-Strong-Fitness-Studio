"use client";

/**
 * Exercise lookup. A search, a mode, and cards that are mostly the demo loop —
 * the picture is the answer, the words are the cue. Each result keeps its own
 * <details> for the steps so a phone shows ten exercises, not one.
 */

import { useState } from "react";
import Panel, { Notice } from "../board/panel";
import Press from "../board/press";
import { Stamp } from "../board/tile-text";

const MODES = [
	{ value: "auto", label: "Anything" },
	{ value: "name", label: "By name" },
	{ value: "bodyPart", label: "By body part" },
	{ value: "target", label: "By muscle" },
];

const HELP = {
	auto: "A name, a body part or a muscle — whichever you have.",
	name: "An exercise name: cable fly, push up, romanian deadlift.",
	bodyPart: "chest · back · shoulders · upper legs · waist · cardio",
	target: "biceps · triceps · glutes · quads · hamstrings · calves",
};

export default function WorkoutFinder() {
	const [query, setQuery] = useState("");
	const [mode, setMode] = useState("auto");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [results, setResults] = useState([]);
	const [asked, setAsked] = useState(false);

	const search = async (event) => {
		event.preventDefault();
		const term = query.trim();
		setAsked(true);
		setError("");
		setResults([]);
		if (term.length < 2) {
			setError("Type at least two letters.");
			return;
		}
		setLoading(true);
		try {
			const response = await fetch(
				`/api/workouts/search?${new URLSearchParams({ q: term, mode })}`,
			);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(body?.error ?? "That search did not come back.");
				return;
			}
			setResults(Array.isArray(body?.exercises) ? body.exercises : []);
		} catch {
			setError("Could not reach the exercise database.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Panel title="How it is done" hint={HELP[mode]}>
			<form className="flex flex-col gap-2 sm:flex-row" onSubmit={search}>
				<input
					className="board-input flex-1"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Chest, cable fly, triceps"
					aria-label="Search an exercise"
					enterKeyHint="search"
				/>
				<select
					className="board-input sm:w-44"
					value={mode}
					onChange={(event) => setMode(event.target.value)}
					aria-label="What to search by"
				>
					{MODES.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				<Press type="submit" disabled={loading} full className="sm:w-auto">
					{loading ? "Looking" : "Find it"}
				</Press>
			</form>

			<Notice tone="error">{error}</Notice>

			{!asked && !loading ? <Stamp>Search to see the demos</Stamp> : null}
			{asked && !loading && !error && !results.length ? (
				<Stamp>Nothing under that name</Stamp>
			) : null}

			<ul className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
				{results.map((exercise) => (
					<li key={exercise.id} className="flex flex-col gap-2.5">
						{exercise.gifUrl ? (
							// eslint-disable-next-line @next/next/no-img-element -- third-party GIF, no loader config
							<img
								src={exercise.gifUrl}
								alt={`${exercise.name} demonstration`}
								loading="lazy"
								className="aspect-[4/3] w-full border border-edge bg-[color:var(--board-deep)] object-contain"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/images/workout-placeholder.svg";
                                }}
							/>
						) : (
                            <img
                                src="/images/workout-placeholder.svg"
                                alt={`${exercise.name} placeholder`}
                                loading="lazy"
                                className="aspect-[4/3] w-full border border-edge bg-[color:var(--board-deep)] object-contain"
                            />
                        )}

						<div className="flex flex-1 flex-col gap-2">
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<span className="text-[0.86rem] font-bold uppercase leading-tight tracking-[0.06em] text-tile">
									{exercise.name}
								</span>
								<Stamp tone="action">{exercise.bodyPart}</Stamp>
							</div>

							<p className="text-[0.76rem] leading-snug text-muted">
								Works {exercise.target}
								{exercise.equipment ? ` · needs ${exercise.equipment}` : ""}
								{exercise.secondaryMuscles?.length
									? ` · also ${exercise.secondaryMuscles.slice(0, 3).join(", ")}`
									: ""}
							</p>

							{exercise.instructions?.length ? (
								<details className="mt-auto">
									<summary className="min-h-[2.25rem] cursor-pointer list-none py-1 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-action">
										How to do it
									</summary>
									<ol className="mt-1 flex list-decimal flex-col gap-1 pl-4 text-[0.76rem] leading-snug text-tile">
										{exercise.instructions.slice(0, 5).map((step, index) => (
											<li key={`${exercise.id}-${index}`}>{step}</li>
										))}
									</ol>
								</details>
							) : null}
						</div>
					</li>
				))}
			</ul>
		</Panel>
	);
}
