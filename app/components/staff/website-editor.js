"use client";

/**
 * The owner's panel. One draft object, one save, one place per kind of fact.
 * Nothing here writes to the board until Save is pressed, and the save bar only
 * appears once something has actually changed — so the panel is quiet until it
 * has something to say.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { INLINE_BUDGET, inlineBytes } from "@/lib/site/image";
import Press from "../board/press";
import Tabs from "../board/tabs";
import { Stamp, TileText } from "../board/tile-text";
import {
	BrandSection,
	ContactSection,
	FacilitiesSection,
	HoursSection,
	RatesSection,
	ResultsSection,
} from "./website-sections";

const TABS = [
	{ id: "brand", label: "Name & colours", Body: BrandSection },
	{ id: "contact", label: "Contact & location", Body: ContactSection },
	{ id: "hours", label: "Opening hours", Body: HoursSection },
	{ id: "rates", label: "Rates & rules", Body: RatesSection },
	{ id: "room", label: "The room", Body: FacilitiesSection },
	{ id: "results", label: "Member results", Body: ResultsSection },
];

/** Immutable write by path: put(draft, ["plans", 2, "priceInr"], 2500). */
function put(object, path, value) {
	if (!path.length) return value;
	const [head, ...rest] = path;
	const clone = Array.isArray(object) ? [...object] : { ...object };
	clone[head] = put(object?.[head], rest, value);
	return clone;
}

export default function WebsiteEditor({ initial, gaps = [] }) {
	const router = useRouter();
	const [saved, setSaved] = useState(initial);
	const [draft, setDraft] = useState(initial);
	const [tab, setTab] = useState(TABS[0].id);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [note, setNote] = useState("");

	const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
	const used = inlineBytes(draft);
	const set = (path, value) => {
		setDraft((current) => put(current, path, value));
		setNote("");
	};

	const save = async () => {
		setBusy(true);
		setError("");
		try {
			const response = await fetch("/api/site", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(draft),
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(body.error ?? "Could not save.");
				return;
			}
			setSaved(body.settings);
			setDraft(body.settings);
			setNote("Saved. The website is showing this now.");
			router.refresh();
		} catch {
			setError("Could not reach the studio database.");
		} finally {
			setBusy(false);
		}
	};

	const Body = (TABS.find((item) => item.id === tab) ?? TABS[0]).Body;

	return (
		<div className="mx-auto w-full max-w-board px-3 pb-32 pt-8 sm:px-6 sm:pb-28">
			<header className="flex flex-col gap-3">
				<Stamp tone="action">Everything the public site says</Stamp>
				<TileText as="h1" text="WEBSITE" className="tile-md" />
				<p className="max-w-measure text-[0.88rem] leading-relaxed text-muted">
					Change a name, a price, a photo or the whole colour scheme. Nothing is live until you
					press Save.
				</p>
			</header>

			{gaps.length ? (
				<div
					className="mt-6 flex flex-col gap-1 p-3"
					style={{ border: "1px solid var(--rail)", backgroundColor: "var(--board-deep)" }}
				>
					<Stamp tone="action">Still missing</Stamp>
					<p className="text-[0.82rem] leading-relaxed text-tile">
						{gaps.join(" · ")}. Until these are filled in, the website leaves those parts out
						rather than making something up.
					</p>
				</div>
			) : null}

			<Tabs
				label="What to change"
				items={TABS}
				active={tab}
				onSelect={setTab}
				className="mt-6"
			/>

			<div className="mt-6">
				<Body draft={draft} set={set} used={used} budget={INLINE_BUDGET} onNote={setNote} />
			</div>

			{dirty || error || note ? (
				<div className="fixed inset-x-0 bottom-0 z-30 border-t" style={{ borderColor: "var(--rail)" }}>
					<div className="slot-rail px-3 py-3 sm:px-6">
						<div className="mx-auto flex max-w-board flex-wrap items-center justify-between gap-3">
							<p className="text-[0.76rem] leading-snug text-tile">
								{error ? (
									<span style={{ color: "#FF8A8F" }}>{error}</span>
								) : dirty ? (
									"Unsaved changes."
								) : (
									note
								)}
							</p>
							{dirty ? (
								<span className="flex flex-wrap items-center gap-2">
									<Press tone="ghost" size="sm" onClick={() => setDraft(saved)} disabled={busy}>
										Discard
									</Press>
									<Press size="sm" onClick={save} disabled={busy}>
										{busy ? "Saving" : "Save changes"}
									</Press>
								</span>
							) : null}
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
