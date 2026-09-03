"use client";

/**
 * Food lookup. One search box, one answer, the numbers set in tabular figures so
 * a column of them lines up. The source of both the numbers and the photo is
 * printed with the answer: this is somebody else's data, not the studio's claim.
 */

import { useState } from "react";
import BoardImage from "../board/board-image";
import Panel, { Notice, Readout } from "../board/panel";
import Press from "../board/press";
import { Stamp } from "../board/tile-text";

const MACROS = [
	{ key: "calories", label: "Calories", unit: "kcal" },
	{ key: "protein", label: "Protein", unit: "g" },
	{ key: "carbs", label: "Carbs", unit: "g" },
	{ key: "fat", label: "Fat", unit: "g" },
];

const TRACE = [
	{ key: "fiber", label: "Fibre", unit: "g" },
	{ key: "sugar", label: "Sugar", unit: "g" },
	{ key: "sodium", label: "Sodium", unit: "g" },
];

function amount(value, unit) {
	if (value == null || Number.isNaN(Number(value))) return "—";
	return `${value} ${unit}`;
}

export default function CalorieCalculator() {
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [item, setItem] = useState(null);

	const search = async (event) => {
		event.preventDefault();
		if (query.trim().length < 2) {
			setError("Type at least two letters.");
			return;
		}
		setLoading(true);
		setError("");
		try {
			const response = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query)}`);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				setItem(null);
				setError(body?.error ?? "That search did not come back.");
				return;
			}
			setItem(body?.item ?? null);
			if (!body?.item) setError("Nothing found under that name. Try a simpler word.");
		} catch {
			setItem(null);
			setError("Could not reach the food database.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Panel title="What is in it" hint="Search a food or a dish. Numbers are per the serving named in the answer.">
			<form className="flex flex-col gap-2 sm:flex-row" onSubmit={search}>
				<input
					className="board-input flex-1"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Boiled eggs, chicken curry, banana"
					aria-label="Search a food"
					enterKeyHint="search"
				/>
				<Press type="submit" disabled={loading} className="sm:w-auto" full>
					{loading ? "Looking" : "Look it up"}
				</Press>
			</form>

			<Notice tone="error">{error}</Notice>

			{item ? (
				<div className="flex flex-col gap-4 sm:flex-row">
					<div className="relative aspect-square w-full overflow-hidden border border-edge sm:w-40 sm:flex-none">
						<BoardImage
							src={item.image}
							alt={item.name}
							sizes="(max-width: 640px) 100vw, 10rem"
						/>
					</div>

					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<span className="text-[1rem] font-bold uppercase leading-none tracking-[0.01em] text-tile [font-stretch:82%]">
								{item.name}
							</span>
							<p className="text-[0.78rem] leading-snug text-muted">
								{item.servingBasis}
								{item.source ? ` · numbers from ${item.source}` : ""}
								{item.imageSource ? ` · photo from ${item.imageSource}` : ""}
							</p>
						</div>

						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							{MACROS.map((macro) => (
								<Readout
									key={macro.key}
									label={macro.label}
									value={amount(item.nutrients?.[macro.key], macro.unit)}
									className="tabular"
								/>
							))}
						</div>

						<div className="flex flex-wrap gap-x-6 gap-y-1">
							{TRACE.map((trace) => (
								<Stamp key={trace.key} className="tabular">
									{trace.label} {amount(item.nutrients?.[trace.key], trace.unit)}
								</Stamp>
							))}
						</div>
					</div>
				</div>
			) : null}
		</Panel>
	);
}
