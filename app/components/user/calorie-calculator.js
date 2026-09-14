"use client";

import { useState, useRef } from "react";
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
    const fileInputRef = useRef(null);

	const search = async (event, file = null) => {
		if (event) event.preventDefault();
		if (!file && query.trim().length < 2) {
			setError("Type at least two letters or upload a photo.");
			return;
		}
		setLoading(true);
		setError("");
		
        try {
            let imageBase64 = null;
            if (file) {
                imageBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const base64 = e.target.result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }

			const response = await fetch('/api/nutrition/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    image: imageBase64
                })
            });
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				setItem(null);
				setError(body?.error ?? "That search did not come back.");
				return;
			}
			setItem(body?.item ?? null);
			if (!body?.item) setError("Nothing found under that name or image.");
		} catch (e) {
            console.error(e);
			setItem(null);
			setError("Could not reach the food database.");
		} finally {
			setLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
		}
	};

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            search(null, file);
        }
    };

	return (
		<Panel title="What is in it (AI Powered)" hint="Search a food or upload a photo. Numbers are estimated by Gemini.">
			<form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => search(e, null)}>
				<input
					className="board-input flex-1"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Boiled eggs, chicken curry, banana"
					aria-label="Search a food"
					enterKeyHint="search"
				/>
                <input 
                    type="file" 
                    accept="image/*"
                    capture="environment"
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange} 
                />
                <Press type="button" onClick={() => fileInputRef.current?.click()} disabled={loading} className="sm:w-auto px-4 !bg-neutral-800 text-white">
					{loading ? "..." : "📸 Photo"}
				</Press>
				<Press type="submit" disabled={loading} className="sm:w-auto" full>
					{loading ? "Looking" : "Look it up"}
				</Press>
			</form>

			<Notice tone="error">{error}</Notice>

			{item ? (
				<div className="flex flex-col gap-4 sm:flex-row">
					<div className="relative aspect-square w-full overflow-hidden border border-edge sm:w-40 sm:flex-none">
						<BoardImage
							src={item.image || "/images/food-placeholder.svg"}
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
