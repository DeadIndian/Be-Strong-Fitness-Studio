"use client";

/**
 * The six panels behind the website editor's tabs. Every control edits the
 * draft in place through `set(path, value)`; none of them know how saving works.
 *
 * Two rules run through all of them: an empty field is allowed and means the
 * public board leaves that part out, and a photo is stored at the size the card
 * renders, never at camera size.
 */

import { useState } from "react";
import { PLATE_COLORS, plateColor, SITE_DEFAULTS } from "@/lib/site/defaults";
import { WEEKDAY_LABELS } from "@/lib/site/hours.mjs";
import { inlineImage } from "@/lib/site/image";
import { safeMapEmbed } from "@/lib/site/sanitize";
import BoardImage from "../board/board-image";
import { ColorField, Field, SelectField, TextField } from "../board/field";
import Panel from "../board/panel";
import Press from "../board/press";
import { Stamp, TileText } from "../board/tile-text";

/**
 * A row in a list the owner can grow: one hairline above it, the delete sitting
 * with the row rather than below it. Not a box — the panel is the only container
 * this surface gets.
 */
function Row({ title, onRemove, removeLabel, children }) {
	return (
		<div className="flex flex-col gap-3 border-t border-edge pt-3.5">
			<div className="flex items-center justify-between gap-3">
				<Stamp tone="tile">{title}</Stamp>
				<Press tone="ghost" size="sm" onClick={onRemove}>
					{removeLabel ?? "Remove"}
				</Press>
			</div>
			{children}
		</div>
	);
}

function slug(text, fallback) {
	const base = String(text ?? "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return `${fallback}-${base || Date.now().toString(36)}`;
}

/**
 * One picture. Upload downscales in the browser and stores the result inline;
 * the path field is for a file a developer has put in the site's own folder.
 */
function ImagePicker({ label, value, onChange, maxEdge = 480, aspect = "aspect-[4/3]" }) {
	const [problem, setProblem] = useState("");

	const take = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		setProblem("");
		try {
			onChange(await inlineImage(file, maxEdge));
		} catch (error) {
			setProblem(error?.message ?? "That photo could not be read.");
		}
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-start gap-3">
				<div className={`relative w-24 flex-none overflow-hidden border border-edge ${aspect}`}>
					<BoardImage src={value} alt="" sizes="6rem" />
				</div>
				<div className="flex min-w-[12rem] flex-1 flex-col gap-2">
					<Field label={label} error={problem}>
						<input type="file" accept="image/*" className="board-input" onChange={take} />
					</Field>
					<TextField
						label="Or a path or link"
						placeholder="https://… or /your-photo.jpg"
						value={String(value ?? "").startsWith("data:") ? "" : (value ?? "")}
						onChange={(event) => onChange(event.target.value)}
						hint={
							String(value ?? "").startsWith("data:")
								? "An uploaded photo is in use. Typing a path here replaces it."
								: undefined
						}
					/>
				</div>
			</div>
			{value ? (
				<Press tone="ghost" size="sm" className="self-start" onClick={() => onChange("")}>
					Remove photo
				</Press>
			) : null}
		</div>
	);
}

/** Uploads share one ceiling, so the owner can see it before they hit it. */
function StorageMeter({ used, budget }) {
	const percent = Math.min(100, Math.round((used / budget) * 100));
	return (
		<div className="flex flex-col gap-1.5">
			<Stamp>{`Uploaded photos: ${percent}% of the space used`}</Stamp>
			<span
				className="block h-2 w-full max-w-[22rem] border border-edge"
				style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
			>
				<span
					className="block h-full"
					style={{ width: `${percent}%`, backgroundColor: percent > 85 ? "var(--warn)" : "var(--action)" }}
				/>
			</span>
			{percent > 85 ? (
				<p className="max-w-measure text-[0.76rem] leading-snug text-muted">
					Nearly full. Remove a photo before adding another, or ask for photo hosting to be set up.
				</p>
			) : null}
		</div>
	);
}

const THEME_FIELDS = [
	["board", "Page background"],
	["boardDeep", "Rails and slots"],
	["tile", "Letter tiles"],
	["ink", "Text on tiles and buttons"],
	["rail", "Brass edges"],
	["action", "Main button"],
	["muted", "Secondary text"],
];

export function BrandSection({ draft, set, used, budget }) {
	const theme = draft.theme;

	return (
		<div className="flex flex-col gap-4">
			<Panel title="The studio's name" hint="Used in the top rail, the page title and the footer.">
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						label="Full name"
						value={draft.brand.name}
						onChange={(event) => set(["brand", "name"], event.target.value)}
					/>
					<TextField
						label="Short name"
						hint="What fits in the top rail and on the footer."
						value={draft.brand.shortName}
						onChange={(event) => set(["brand", "shortName"], event.target.value)}
					/>
				</div>
				<TextField
					label="One line about the studio"
					value={draft.brand.line}
					onChange={(event) => set(["brand", "line"], event.target.value)}
				/>
			</Panel>

			<Panel title="Logo" hint="A square image reads best. It sits next to the name in the top rail.">
				<ImagePicker
					label="Upload a logo"
					value={draft.brand.logoUrl}
					maxEdge={256}
					aspect="aspect-square"
					onChange={(value) => set(["brand", "logoUrl"], value)}
				/>
				<StorageMeter used={used} budget={budget} />
			</Panel>

			<Panel
				title="Colour scheme"
				hint="Every page follows these seven colours. Keep the tiles light and the text on them dark, or the lettering gets hard to read."
				actions={
					<Press tone="ghost" size="sm" onClick={() => set(["theme"], { ...SITE_DEFAULTS.theme })}>
						Restore original
					</Press>
				}
			>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{THEME_FIELDS.map(([key, label]) => (
						<ColorField
							key={key}
							label={label}
							value={theme[key]}
							onChange={(value) => set(["theme", key], value)}
						/>
					))}
				</div>
				{/* The one legitimate box on this surface: it is a picture of another
				    surface. Its tokens are the draft's, so the hairline retints with them. */}
				<div
					className="flex flex-col gap-3 border border-edge p-3"
					style={{
						"--board": theme.board,
						"--board-deep": theme.boardDeep,
						"--tile": theme.tile,
						"--ink": theme.ink,
						"--rail": theme.rail,
						"--action": theme.action,
						"--muted": theme.muted,
						backgroundColor: "var(--board)",
					}}
				>
					<span className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-action">
						How it looks
					</span>
					<TileText text={draft.brand.shortName || "BE STRONG"} className="tile-sm" />
					<p className="text-[0.8rem] text-muted">Secondary text sits at this weight.</p>
					<Press size="sm" className="self-start">
						Main button
					</Press>
				</div>
			</Panel>
		</div>
	);
}

export function ContactSection({ draft, set }) {
	const contact = draft.contact;
	const mapPasted = String(contact.mapEmbedUrl ?? "").trim();
	const mapSafe = safeMapEmbed(mapPasted);

	return (
		<div className="flex flex-col gap-4">
			<Panel
				title="How people reach the studio"
				hint="Leave anything blank and the website simply does not show it. Nothing is invented."
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						label="Phone"
						type="tel"
						placeholder="+91 …"
						value={contact.phone}
						onChange={(event) => set(["contact", "phone"], event.target.value)}
					/>
					<TextField
						label="WhatsApp number"
						type="tel"
						hint="Digits only is fine. Becomes a WhatsApp button."
						value={contact.whatsapp}
						onChange={(event) => set(["contact", "whatsapp"], event.target.value)}
					/>
					<TextField
						label="Email"
						type="email"
						value={contact.email}
						onChange={(event) => set(["contact", "email"], event.target.value)}
					/>
					<TextField
						label="Instagram link"
						type="url"
						placeholder="https://instagram.com/…"
						value={contact.instagram}
						onChange={(event) => set(["contact", "instagram"], event.target.value)}
					/>
				</div>
				<TextField
					label="Address"
					multiline
					rows={3}
					hint="One line per line, the way it should be read."
					value={(contact.addressLines ?? []).join("\n")}
					onChange={(event) =>
						set(
							["contact", "addressLines"],
							event.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
						)
					}
				/>
			</Panel>

			<Panel
				title="Map"
				hint={'In Google Maps: find the studio, press Share, then Embed a map, then copy the link inside src="…".'}
			>
				<TextField
					label="Google Maps embed link"
					value={contact.mapEmbedUrl}
					placeholder="https://www.google.com/maps/embed?…"
					error={mapPasted && !mapSafe ? "That is not a Google Maps embed link yet." : ""}
					onChange={(event) => set(["contact", "mapEmbedUrl"], event.target.value)}
				/>
				{mapSafe ? (
					<div className="aspect-[4/3] w-full max-w-[28rem] overflow-hidden border border-edge">
						<iframe
							src={mapSafe}
							title="Map preview"
							loading="lazy"
							referrerPolicy="no-referrer-when-downgrade"
							className="h-full w-full"
							style={{ border: 0 }}
						/>
					</div>
				) : null}
				<TextField
					label="Directions link"
					type="url"
					hint="Optional. The plain Google Maps link people can open in their own app."
					value={contact.mapLinkUrl}
					onChange={(event) => set(["contact", "mapLinkUrl"], event.target.value)}
				/>
			</Panel>
		</div>
	);
}

/** Always seven rows, in week order, whatever the saved document happens to hold. */
function weekOf(hours) {
	return WEEKDAY_LABELS.map((label, day) => {
		const entry = (hours?.days ?? []).find((item) => Number(item.day) === day);
		return { day, label, ranges: Array.isArray(entry?.ranges) ? entry.ranges : [] };
	});
}

export function HoursSection({ draft, set }) {
	const week = weekOf(draft.hours);
	const write = (rows) => set(["hours", "days"], rows.map(({ day, ranges }) => ({ day, ranges })));
	const editDay = (day, change) =>
		write(week.map((row) => (row.day === day ? { ...row, ranges: change(row.ranges) } : row)));

	return (
		<div className="flex flex-col gap-4">
			<Panel
				title="The week"
				hint="A day with no window is shown as closed. Add a second window for a morning and evening split."
				actions={
					<Press
						tone="ghost"
						size="sm"
						onClick={() => write(week.map((row) => ({ ...row, ranges: week[1].ranges })))}
					>
						Copy Monday to all
					</Press>
				}
			>
				<ul className="flex flex-col">
					{week.map((row) => {
						const closed = row.ranges.length === 0;
						return (
							<li
								key={row.day}
								className="flex flex-col gap-3 border-t border-edge py-3.5 first:border-t-0 first:pt-0 last:pb-0"
							>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<Stamp tone="tile">{row.label}</Stamp>
									<label className="flex items-center gap-2 text-[0.74rem] font-bold uppercase tracking-[0.14em] text-muted">
										<input
											type="checkbox"
											checked={closed}
											className="h-5 w-5 flex-none"
											onChange={(event) =>
												editDay(row.day, () => (event.target.checked ? [] : [["05:00", "22:00"]]))
											}
										/>
										Closed
									</label>
								</div>

								{closed ? null : (
									<div className="flex flex-col gap-2">
										{row.ranges.map((range, index) => (
											<div key={index} className="flex flex-wrap items-end gap-2">
												<Field label={index === 0 ? "Opens" : "Opens again"} className="w-[8.5rem]">
													<input
														type="time"
														className="board-input tabular"
														value={range?.[0] ?? ""}
														onChange={(event) =>
															editDay(row.day, (ranges) =>
																ranges.map((item, i) =>
																	i === index ? [event.target.value, item?.[1] ?? ""] : item,
																),
															)
														}
													/>
												</Field>
												<Field label="Closes" className="w-[8.5rem]">
													<input
														type="time"
														className="board-input tabular"
														value={range?.[1] ?? ""}
														onChange={(event) =>
															editDay(row.day, (ranges) =>
																ranges.map((item, i) =>
																	i === index ? [item?.[0] ?? "", event.target.value] : item,
																),
															)
														}
													/>
												</Field>
												{row.ranges.length > 1 ? (
													<Press
														tone="ghost"
														size="sm"
														onClick={() =>
															editDay(row.day, (ranges) => ranges.filter((_, i) => i !== index))
														}
													>
														Remove window
													</Press>
												) : null}
											</div>
										))}
										<Press
											tone="ghost"
											size="sm"
											className="self-start"
											onClick={() => editDay(row.day, (ranges) => [...ranges, ["18:00", "21:30"]])}
										>
											Add another window
										</Press>
									</div>
								)}
							</li>
						);
					})}
				</ul>
			</Panel>

			<Panel title="Clock" hint="The open-now lamp reads the studio's own clock, not the visitor's.">
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						label="Timezone"
						hint="IANA name, for example Asia/Kolkata."
						value={draft.hours.timezone}
						onChange={(event) => set(["hours", "timezone"], event.target.value)}
					/>
					<TextField
						label="Note about hours"
						hint="Optional. Shown under the week, for holidays or a ladies' hour."
						value={draft.hours.note}
						onChange={(event) => set(["hours", "note"], event.target.value)}
					/>
				</div>
			</Panel>
		</div>
	);
}

export function RatesSection({ draft, set }) {
	const plans = draft.plans;
	const rules = draft.rules;

	return (
		<div className="flex flex-col gap-4">
			<Panel
				title="What a membership costs"
				hint="These are the rows on the front of the site and the plans a member can activate. A member already on a plan keeps the price they were sold."
				actions={
					<Press
						tone="ghost"
						size="sm"
						onClick={() =>
							set(
								["plans"],
								[
									...plans,
									{
										id: slug("", "plan"),
										title: "New term",
										durationMonths: 1,
										priceInr: 0,
										plate: 5,
										perks: [],
									},
								],
							)
						}
					>
						Add a rate
					</Press>
				}
			>
				<ul className="flex flex-col gap-4">
					{plans.map((plan, index) => (
						<li key={plan.id ?? index}>
							<Row
								title={plan.title || "Unnamed"}
								removeLabel="Take off the board"
								onRemove={() => set(["plans"], plans.filter((_, i) => i !== index))}
							>
								<div className="grid gap-4 sm:grid-cols-2">
									<TextField
										label="Name"
										value={plan.title}
										onChange={(event) => set(["plans", index, "title"], event.target.value)}
									/>
									<TextField
										label="Price in rupees"
										type="number"
										min="0"
										step="50"
										value={plan.priceInr}
										onChange={(event) =>
											set(["plans", index, "priceInr"], Number(event.target.value) || 0)
										}
									/>
									<TextField
										label="Length in months"
										type="number"
										min="1"
										max="60"
										value={plan.durationMonths}
										onChange={(event) =>
											set(["plans", index, "durationMonths"], Number(event.target.value) || 1)
										}
									/>
									<div className="flex items-end gap-2">
										<SelectField
											label="Plate colour"
											hint="The heavier the plate, the longer the term."
											className="flex-1"
											value={String(plan.plate ?? 5)}
											onChange={(event) =>
												set(["plans", index, "plate"], Number(event.target.value))
											}
										>
											{Object.keys(PLATE_COLORS).map((kg) => (
												<option key={kg} value={kg}>
													{kg} kg
												</option>
											))}
										</SelectField>
										<span
											aria-hidden="true"
											className="mb-[1.6rem] h-8 w-8 flex-none rounded-full"
											style={{
												backgroundColor: plateColor(Number(plan.plate ?? 5)),
												boxShadow: `0 0 0 1px rgba(0,0,0,0.55), 0 0 1.25rem color-mix(in srgb, ${plateColor(Number(plan.plate ?? 5))} 45%, transparent)`,
											}}
										/>
									</div>
								</div>
								<TextField
									label="What it includes"
									multiline
									rows={3}
									hint="One per line. Leave empty for floor access only."
									value={(plan.perks ?? []).join("\n")}
									onChange={(event) =>
										set(
											["plans", index, "perks"],
											event.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
										)
									}
								/>
							</Row>
						</li>
					))}
				</ul>
			</Panel>

			<Panel
				title="House rules"
				hint="The short rules shown beside the rates: one label, one sentence."
				actions={
					<Press
						tone="ghost"
						size="sm"
						onClick={() =>
							set(["rules"], [...rules, { id: slug("", "rule"), label: "New rule", detail: "" }])
						}
					>
						Add a rule
					</Press>
				}
			>
				<ul className="flex flex-col gap-4">
					{rules.map((rule, index) => (
						<li key={rule.id ?? index}>
							<Row
								title={rule.label || "Unnamed"}
								onRemove={() => set(["rules"], rules.filter((_, i) => i !== index))}
							>
								<div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
									<TextField
										label="Label"
										value={rule.label}
										onChange={(event) => set(["rules", index, "label"], event.target.value)}
									/>
									<TextField
										label="The rule"
										value={rule.detail}
										onChange={(event) => set(["rules", index, "detail"], event.target.value)}
									/>
								</div>
							</Row>
						</li>
					))}
				</ul>
			</Panel>

			<Panel
				title="How members pay"
				hint="The app never takes money: pressing a plan only records the term on the member's account. Write here how you actually want to be paid, and the member sees it beside every plan."
			>
				<TextField
					label="Your payment line"
					multiline
					rows={3}
					maxLength={280}
					hint="Shown to members exactly as typed. Leave it empty and they are told only that the app takes no payment."
					placeholder="Pay at the desk when you come in."
					value={draft.checkout?.note ?? ""}
					onChange={(event) => set(["checkout", "note"], event.target.value)}
				/>
			</Panel>
		</div>
	);
}

export function FacilitiesSection({ draft, set, used, budget }) {
	const facilities = draft.facilities;

	return (
		<Panel
			title="What's in the room"
			hint="The cards visitors scroll through. Order here is the order on the site."
			actions={
				<Press
					tone="ghost"
					size="sm"
					onClick={() =>
						set(["facilities"], [...facilities, { id: slug("", "fac"), title: "New", image: "" }])
					}
				>
					Add a card
				</Press>
			}
		>
			<StorageMeter used={used} budget={budget} />
			<ul className="flex flex-col gap-4">
				{facilities.map((facility, index) => (
					<li key={facility.id ?? index}>
						<Row
							title={facility.title || "Unnamed"}
							onRemove={() => set(["facilities"], facilities.filter((_, i) => i !== index))}
						>
							<TextField
								label="Name"
								value={facility.title}
								onChange={(event) => set(["facilities", index, "title"], event.target.value)}
							/>
							<ImagePicker
								label="Photo"
								value={facility.image}
								onChange={(value) => set(["facilities", index, "image"], value)}
							/>
						</Row>
					</li>
				))}
			</ul>
		</Panel>
	);
}

export function ResultsSection({ draft, set, used, budget }) {
	const results = draft.results;

	return (
		<Panel
			title="Member results"
			hint="Anything ticked as a sample is labelled Sample on the website. Untick it only for a real member who agreed to be shown."
			actions={
				<Press
					tone="ghost"
					size="sm"
					onClick={() =>
						set(
							["results"],
							[
								...results,
								{ id: slug("", "res"), name: "", detail: "", months: 3, image: "", sample: false },
							],
						)
					}
				>
					Add a result
				</Press>
			}
		>
			<StorageMeter used={used} budget={budget} />
			<ul className="flex flex-col gap-4">
				{results.map((result, index) => (
					<li key={result.id ?? index}>
						<Row
							title={result.name || "Unnamed"}
							onRemove={() => set(["results"], results.filter((_, i) => i !== index))}
						>
							<div className="grid gap-4 sm:grid-cols-2">
								<TextField
									label="Name"
									value={result.name}
									onChange={(event) => set(["results", index, "name"], event.target.value)}
								/>
								<TextField
									label="What changed"
									placeholder="Lost 8 kg"
									value={result.detail}
									onChange={(event) => set(["results", index, "detail"], event.target.value)}
								/>
								<TextField
									label="Over how many months"
									type="number"
									min="1"
									max="120"
									value={result.months}
									onChange={(event) =>
										set(["results", index, "months"], Number(event.target.value) || 1)
									}
								/>
								<label className="flex items-end gap-2 pb-2 text-[0.74rem] font-bold uppercase tracking-[0.14em] text-muted">
									<input
										type="checkbox"
										checked={Boolean(result.sample)}
										className="h-5 w-5 flex-none"
										onChange={(event) => set(["results", index, "sample"], event.target.checked)}
									/>
									Sample, not a real member
								</label>
							</div>
							<ImagePicker
								label="Photo"
								maxEdge={600}
								aspect="aspect-[3/4]"
								value={result.image}
								onChange={(value) => set(["results", index, "image"], value)}
							/>
						</Row>
					</li>
				))}
			</ul>
		</Panel>
	);
}
