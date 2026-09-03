"use client";

/**
 * Feedback. The score is five plates, not stars: same vocabulary as the board.
 * Radios do the work under the plates, so the keyboard and a screen reader get
 * a real radio group and we get the look.
 */

import { useEffect, useState } from "react";
import Panel, { Notice } from "../board/panel";
import Press from "../board/press";
import { Stamp } from "../board/tile-text";

const LIMIT = 280;

const SCORES = [
	{ value: 5, label: "5 — the best" },
	{ value: 4, label: "4 — good" },
	{ value: 3, label: "3 — fine" },
	{ value: 2, label: "2 — poor" },
	{ value: 1, label: "1 — bad" },
];

function day(value) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Five plates, filled to the score. */
function Score({ value }) {
	const score = Math.max(1, Math.min(5, Number(value) || 0));
	return (
		<span className="flex items-center gap-1" role="img" aria-label={`${score} out of 5`}>
			{[1, 2, 3, 4, 5].map((step) => (
				<span
					key={step}
					aria-hidden="true"
					className="h-[0.7rem] w-[0.7rem] flex-none rounded-full"
					style={{
						backgroundColor: step <= score ? "var(--action)" : "transparent",
						border: "1px solid var(--rail)",
					}}
				/>
			))}
		</span>
	);
}

export default function ReviewsPanel() {
	const [rating, setRating] = useState(5);
	const [comment, setComment] = useState("");
	const [reviews, setReviews] = useState([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [note, setNote] = useState("");

	useEffect(() => {
		let live = true;
		(async () => {
			try {
				const response = await fetch("/api/reviews", { cache: "no-store" });
				const body = await response.json().catch(() => ({}));
				if (!live) return;
				if (!response.ok) {
					setError(body?.error ?? "Could not load what people have written.");
					return;
				}
				setReviews(Array.isArray(body?.reviews) ? body.reviews : []);
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

	const submit = async (event) => {
		event.preventDefault();
		setBusy(true);
		setError("");
		setNote("");
		try {
			const response = await fetch("/api/reviews", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ rating, comment }),
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(body?.error ?? "Could not post that.");
				return;
			}
			setComment("");
			setRating(5);
			setNote("Posted. Thanks.");
			if (body?.review) setReviews((current) => [body.review, ...current].slice(0, 20));
		} catch {
			setError("Could not reach the studio.");
		} finally {
			setBusy(false);
		}
	};

	const left = LIMIT - comment.length;

	return (
		<Panel title="Say how it is going" hint="Members read this. Keep it about the room, the kit and the training.">
			<form className="flex flex-col gap-4" onSubmit={submit}>
				<fieldset className="flex flex-col gap-2">
					<legend className="mb-1">
						<Stamp tone="tile">Your score</Stamp>
					</legend>
					<div className="flex flex-wrap gap-2">
						{SCORES.map((option) => {
							const live = option.value === rating;
							return (
								<label
									key={option.value}
									className="flex min-h-[2.75rem] cursor-pointer items-center gap-2 px-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--action)]"
									style={{
										border: live ? "1px solid var(--action)" : "1px solid var(--rail)",
										backgroundColor: live ? "var(--board)" : "transparent",
									}}
								>
									<input
										type="radio"
										name="rating"
										className="sr-only"
										value={option.value}
										checked={live}
										onChange={() => setRating(option.value)}
									/>
									<Score value={option.value} />
									<span
										className={`text-[0.72rem] font-bold uppercase tracking-[0.12em] ${
											live ? "text-tile" : "text-muted"
										}`}
									>
										{option.value}
									</span>
									<span className="sr-only">{option.label}</span>
								</label>
							);
						})}
					</div>
				</fieldset>

				<label className="flex flex-col gap-1.5">
					<Stamp tone="tile">What happened</Stamp>
					<textarea
						className="board-input"
						value={comment}
						onChange={(event) => setComment(event.target.value.slice(0, LIMIT))}
						minLength={8}
						maxLength={LIMIT}
						required
						placeholder="Trainers, equipment, the room, your own progress"
					/>
					<span className="tabular text-[0.72rem] font-bold uppercase tracking-[0.14em] text-muted">
						{left} left
					</span>
				</label>

				<div className="flex flex-wrap items-center justify-between gap-3">
					<Notice tone={error ? "error" : "good"}>{error || note}</Notice>
					<Press type="submit" disabled={busy || comment.trim().length < 8}>
						{busy ? "Posting" : "Post it"}
					</Press>
				</div>
			</form>

			<div className="flex flex-col gap-3">
				{loading ? <Stamp>Reading the wall</Stamp> : null}
				{!loading && !reviews.length ? (
					<Stamp>Nothing written yet — yours would be the first</Stamp>
				) : null}

				{reviews.map((review) => (
					<article
						key={review.id}
						className="flex flex-col gap-1.5 p-3"
						style={{ border: "1px solid var(--rail)", backgroundColor: "var(--board)" }}
					>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-[0.8rem] font-bold uppercase tracking-[0.1em] text-tile">
								{review.authorName || "Member"}
							</span>
							<Score value={review.rating} />
						</div>
						<p className="max-w-measure text-[0.82rem] leading-relaxed text-tile">{review.comment}</p>
						{day(review.createdAt) ? <Stamp className="tabular">{day(review.createdAt)}</Stamp> : null}
					</article>
				))}
			</div>
		</Panel>
	);
}
