/**
 * The landing page. One loaded bar is lit behind the whole of it and the scroll
 * drives the camera past it, section by section.
 *
 * There are no cards and no glass panels here: the type sits directly on the
 * room, one hairline runs the width of the window between sections, and a priced
 * term is a line in a ledger rather than a tile in a grid. Everything printed
 * comes from settings, so the owner can edit any fact from the admin panel;
 * anything he has not supplied yet is left off rather than invented.
 */

import Link from "next/link";
import { readViewer } from "@/lib/auth/viewer";
import { hasVisitInfo, plateColor } from "@/lib/site/defaults";
import { toMinutes } from "@/lib/site/hours.mjs";
import { getSiteSettings } from "@/lib/site/settings";
import OpenNow from "./components/board/open-now";
import Press from "./components/board/press";
import { perMonth } from "./components/board/rate-row";
import ResultCard from "./components/board/result-card";
import { Stamp, TileText } from "./components/board/tile-text";
import FacilityRack from "./components/landing/facility-rack";
import HoursBand from "./components/landing/hours-band";
import RigStage from "./components/landing/rig-stage";

/** The three things that happen after the press, in the order they happen. */
const JOIN_STEPS = [
	["Sign in", "Your email is the account. No card is asked for."],
	["Press a term", "Whichever one you want, at the standing price."],
	["Train", "The term sits on your account and is settled at the studio."],
];

/**
 * Hours the doors are open in a week, added up from the owner's own table. A
 * computed figure, so it cannot drift from the hours printed further down the
 * page and it cannot be a claim nobody checked.
 */
function weeklyHours(hours) {
	let minutes = 0;
	for (const day of hours?.days ?? []) {
		for (const range of day?.ranges ?? []) {
			const start = toMinutes(range?.[0]);
			const close = toMinutes(range?.[1]);
			if (start === null || close === null) continue;
			minutes += (close <= start ? close + 1440 : close) - start;
		}
	}
	return Math.round(minutes / 60);
}

/**
 * A section: one rule across the window, the heading at wall scale on the left,
 * and whatever governs it on the right of the same baseline. No box and no label
 * above the heading — the heading carries its own weight. `bleed` renders outside
 * the type column, for the photograph rails that run off the edge of the room.
 */
function Band({ id, title, aside = null, children = null, bleed = null }) {
	return (
		<section id={id} className="border-t border-edge py-14 sm:py-20">
			<div className="mx-auto w-full max-w-board px-gutter">
				<header className="mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
					<TileText as="h2" text={title} className="wipe tile-lg" />
					{aside ? (
						<div className="rise flex-none sm:max-w-[24rem] sm:text-right">{aside}</div>
					) : null}
				</header>
				{children}
			</div>
			{bleed}
		</section>
	);
}

/** The plate that stands for this plan, in the colour the rig carries on its hub. */
function Plate({ kg, className = "" }) {
	const colour = plateColor(kg);
	return (
		<span
			aria-hidden="true"
			className={`h-2.5 w-2.5 flex-none rounded-full sm:h-3 sm:w-3 ${className}`}
			style={{
				backgroundColor: colour,
				boxShadow: `0 0 0 1px rgba(0,0,0,0.55), 0 0 1rem color-mix(in srgb, ${colour} 55%, transparent)`,
			}}
		/>
	);
}

/**
 * One priced term as a line in a ledger. The whole line is the target — on a
 * phone that is a 76px-tall tap area, not a button hunted for at the end of a
 * row — the price is the biggest thing on it because price is what the visitor
 * came to read, and reaching for it floods the line with light from the left
 * rather than drawing a box around it.
 */
function PlanLine({ plan, href, signedIn }) {
	const months = Number(plan.durationMonths) || 1;
	return (
		<Link
			href={href}
			aria-label={`${plan.title}, ₹${plan.priceInr} — ${signedIn ? "take this term" : "sign in to take this term"}`}
			className="ledger group block py-5 sm:py-7"
		>
			<span className="relative flex items-baseline gap-3 sm:gap-5">
				<Plate kg={plan.plate} />
				<span className="flex min-w-0 flex-1 flex-col gap-1.5">
					<TileText text={plan.title} className="tile-sm" />
					<span className="tabular text-[0.68rem] uppercase leading-snug tracking-[0.16em] text-muted">
						{months} {months === 1 ? "month" : "months"}
						{plan.perks?.length ? ` · ${plan.perks.join(" · ")}` : ""}
					</span>
				</span>
				<span className="flex flex-none flex-col items-end gap-1.5">
					<span className="flex items-baseline">
						<span aria-hidden="true" className="pr-1 text-[0.8rem] font-bold text-muted sm:text-[1rem]">
							₹
						</span>
						<span className="tabular text-[2.1rem] font-extrabold leading-[0.8] tracking-[-0.04em] text-tile transition-colors duration-200 [font-stretch:76%] group-hover:text-action sm:text-[3.1rem]">
							{plan.priceInr.toLocaleString("en-IN")}
						</span>
					</span>
					<span className="tabular text-[0.66rem] uppercase tracking-[0.16em] text-muted">
						₹{perMonth(plan).toLocaleString("en-IN")} a month
					</span>
				</span>
			</span>
		</Link>
	);
}

/**
 * Label, leader, rule: the term sits on a line drawn to what governs it. Narrow
 * screens drop the leader and stack instead — a dashed line between two wrapped
 * blocks connects nothing.
 */
function LeaderRow({ label, detail, swatch = null }) {
	return (
		<li className="flex flex-col gap-0.5 sm:flex-row sm:items-end sm:gap-3">
			<span className="flex items-center gap-2 text-[0.74rem] font-bold uppercase tracking-[0.14em] text-tile sm:pb-1">
				{swatch}
				{label}
			</span>
			<span
				aria-hidden="true"
				className="mb-[0.5rem] hidden flex-1 border-b border-dashed opacity-40 sm:block"
				style={{ borderColor: "var(--muted)" }}
			/>
			<span className="text-[0.8rem] leading-snug text-muted sm:max-w-[22rem] sm:pb-1 sm:text-right">
				{detail}
			</span>
		</li>
	);
}

/** One way to reach the studio, as a ledger line: what it is, then the value. */
function ContactLine({ label, value, href, external = false }) {
	const away = external ? { target: "_blank", rel: "noreferrer" } : {};
	return (
		<a href={href} className="ledger group flex items-baseline justify-between gap-5 py-4" {...away}>
			<span className="relative flex-none text-[0.66rem] font-bold uppercase tracking-[0.2em] text-muted">
				{label}
			</span>
			<span className="relative min-w-0 truncate text-[0.95rem] font-bold text-tile transition-colors group-hover:text-action sm:text-[1.05rem]">
				{value}
			</span>
		</a>
	);
}

/**
 * One word of the wall strip, with the drawn mark that separates it from the
 * next. The strip is the studio's own list of what is in the room, painted above
 * the rates the way it would be painted above a rack.
 */
function StripWord({ text }) {
	return (
		<span className="flex flex-none items-center gap-[3rem]">
			<span className="whitespace-nowrap text-[0.72rem] font-bold uppercase tracking-[0.28em] text-muted sm:text-[0.8rem]">
				{text}
			</span>
			<span className="h-[0.32rem] w-[0.32rem] flex-none rotate-45 bg-action" />
		</span>
	);
}

export default async function HomePage() {
	const [settings, viewer] = await Promise.all([getSiteSettings(), readViewer()]);
	const signedIn = Boolean(viewer);
	const contact = settings.contact;
	const plans = settings.plans ?? [];
	const rules = settings.rules ?? [];
	const sampled = settings.results.some((result) => result.sample);
	const join = signedIn ? "/dashboard/user" : "/login";
	const cta = signedIn ? "Pick your plan" : "Sign in to join";

	// The honest hook: the lowest real monthly cost on the board, and the term
	// that actually gets you it. No "was" price, because none was ever charged.
	const best = plans.length
		? plans.reduce((low, plan) => (perMonth(plan) < perMonth(low) ? plan : low))
		: null;

	// The strip under the first viewport, in the studio's own words: what is in the
	// room, nothing added. Every entry is a facility the owner can edit or remove.
	const strip = settings.facilities.map((facility) => facility.title);

	// Three figures, each computed from the owner's own data rather than claimed:
	// the hours off the hours table, the count off the facilities list, and the
	// load on the bar the visitor is watching — one plate per term, both ends,
	// on a 20kg bar. Anything that comes out as zero is left off.
	const barKg = plans.length
		? 20 + 2 * plans.reduce((total, plan) => total + (Number(plan.plate) || 5), 0)
		: 0;
	const scale = [
		[weeklyHours(settings.hours), "hours open a week"],
		[settings.facilities.length, "in the room"],
		[barKg ? `${barKg} kg` : 0, "on the bar behind you"],
	].filter(([value]) => value !== 0);

	return (
		<>
			<RigStage plates={plans.map((plan) => Number(plan.plate) || 5)} />

			<main id="board-main">
				<section className="relative flex min-h-[calc(100svh-var(--rail-height))] flex-col justify-end px-gutter pb-12 pt-20 sm:pb-16">
					{/*
					 * The name painted on the far wall. It is behind the rig's canvas, so
					 * the loaded bar passes in front of the lettering — the first viewport
					 * has actual depth in it instead of a picture of depth.
					 */}
					<span aria-hidden="true" className="mural">
						<span>{settings.brand.shortName}</span>
					</span>

					{/*
					 * The type sits on the room, not in a box. This one scrim is what keeps
					 * it legible over whatever the steel behind it is doing — heavy where the
					 * words are, gone by the middle of the frame so the bar is not veiled.
					 */}
					<span
						aria-hidden="true"
						className="pointer-events-none absolute inset-x-0 bottom-0 top-[18%]"
						style={{
							background:
								"linear-gradient(to top, color-mix(in srgb, var(--board) 94%, transparent) 6%, color-mix(in srgb, var(--board) 52%, transparent) 42%, transparent 84%)",
						}}
					/>

					<div className="relative mx-auto flex w-full max-w-board flex-col gap-7 sm:gap-9">
						<OpenNow hours={settings.hours} className="lg:hidden" />

						<TileText as="h1" text={settings.brand.name} className="tile-xl" press stagger={34} />

						<div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
							<p className="max-w-measure text-[0.95rem] leading-relaxed text-muted sm:text-[1.05rem]">
								{settings.brand.line} Steel, floor space and every class in one membership. Sign in,
								take a term, and it activates on your account the moment you press it.
							</p>

							{best ? (
								<p className="flex flex-none items-end gap-3">
									<span className="tabular text-[3rem] font-extrabold leading-[0.78] tracking-[-0.045em] text-tile [font-stretch:74%] sm:text-[4.2rem]">
										₹{perMonth(best).toLocaleString("en-IN")}
									</span>
									<span className="pb-1 text-[0.7rem] uppercase leading-tight tracking-[0.16em] text-muted">
										a month
										<br />
										on the {best.title.toLowerCase()} term
									</span>
								</p>
							) : null}
						</div>

						<div className="flex flex-wrap items-center gap-3 sm:gap-4">
							<Press href={join} size="lg">
								{cta}
							</Press>
							<Press href="#rates" tone="ghost" size="lg">
								See the rates
							</Press>
							<span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted">
								No payment is taken online
							</span>
						</div>
					</div>
				</section>

				{/* The wall strip. Decorative repetition of facts stated in full below. */}
				<div className="marquee border-y border-edge py-3.5" aria-hidden="true">
					{[0, 1].map((copy) => (
						<div key={copy} className="marquee-track">
							{strip.map((word) => (
								<StripWord key={`${copy}-${word}`} text={word} />
							))}
						</div>
					))}
				</div>

				{/*
				 * The size of the place, in three figures. No heading: these are the
				 * caption to the room itself, and every one of them is arithmetic on
				 * data the owner already maintains.
				 */}
				{scale.length >= 3 ? (
					<section className="mx-auto w-full max-w-board px-gutter">
						<dl className="grid grid-cols-1 sm:grid-cols-3">
							{scale.map(([value, label], index) => (
								<div
									key={label}
									className={`rise flex flex-col gap-2 border-edge py-8 sm:py-14 ${
										index ? "border-t sm:border-l sm:border-t-0 sm:pl-6 lg:pl-10" : ""
									}`}
								>
									<dd className="tabular order-1 text-[2.9rem] font-extrabold leading-[0.78] tracking-[-0.045em] text-tile [font-stretch:74%] sm:text-[4rem]">
										{value}
									</dd>
									<dt className="order-2 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted">
										{label}
									</dt>
								</div>
							))}
						</dl>
					</section>
				) : null}

				<Band
					id="rates"
					title="RATES"
					aside={
						<div className="flex flex-col gap-4 sm:items-end">
							<p className="text-[0.86rem] leading-relaxed text-muted sm:text-[0.92rem]">
								Longer terms cost less per month. Every term includes the whole floor and every
								class; only the steam bath and massage chair counts change.
							</p>
							<Press href={join} size="md">
								{cta}
							</Press>
						</div>
					}
				>
					<ol className="border-b border-edge">
						{plans.map((plan) => (
							<li key={plan.id}>
								<PlanLine plan={plan} href={join} signedIn={signedIn} />
							</li>
						))}
					</ol>
					<p className="mt-6 max-w-measure text-[0.76rem] leading-relaxed text-muted">
						No payment is taken online. Activating a term records it on your account — nothing is
						charged{settings.checkout?.note ? `. ${settings.checkout.note}` : "."}
					</p>
				</Band>

				<Band
					id="room"
					title="THE ROOM"
					aside={
						<p className="text-[0.86rem] leading-relaxed text-muted sm:text-[0.92rem]">
							Everything the studio has. Steam baths and the massage chair are metered per term —
							the count for each is on the inclusions list below.
						</p>
					}
					bleed={<FacilityRack facilities={settings.facilities} />}
				/>

				<Band
					id="terms"
					title="THE FINE PRINT"
					aside={
						<p className="text-[0.86rem] leading-relaxed text-muted sm:text-[0.92rem]">
							What is expected of you on the floor, and exactly what each term buys.
						</p>
					}
				>
					<div className="grid gap-10 md:grid-cols-2 md:gap-16">
						{rules.length ? (
							<div className="rise flex flex-col gap-4">
								<Stamp tone="tile">While you train</Stamp>
								<ul className="flex flex-col gap-3.5">
									{rules.map((rule) => (
										<LeaderRow key={rule.id} label={rule.label} detail={rule.detail} />
									))}
								</ul>
							</div>
						) : null}
						{plans.length ? (
							<div className="rise flex flex-col gap-4">
								<Stamp tone="tile">Each term includes</Stamp>
								<ul className="flex flex-col gap-3.5">
									{plans.map((plan) => (
										<LeaderRow
											key={plan.id}
											label={plan.title}
											swatch={<Plate kg={plan.plate} />}
											detail={plan.perks?.length ? plan.perks.join(" · ") : "Full floor access"}
										/>
									))}
								</ul>
							</div>
						) : null}
					</div>
				</Band>

				<Band
					id="hours"
					title="HOURS"
					aside={
						<div className="flex sm:justify-end">
							<OpenNow hours={settings.hours} />
						</div>
					}
				>
					<HoursBand hours={settings.hours} />
				</Band>

				<Band
					id="results"
					title="RESULTS"
					aside={
						<div className="flex flex-col gap-4 sm:items-end">
							{sampled ? (
								<p className="text-[0.82rem] leading-relaxed text-muted">
									Sample rows. Real member results replace these when the studio adds them.
								</p>
							) : null}
							<Press href="/transformations" tone="ghost" size="md">
								Every result
							</Press>
						</div>
					}
					bleed={
						<ul
							className="strip gap-2 pb-4 sm:gap-3"
							tabIndex={0}
							aria-label="Member results, scroll sideways"
						>
							{settings.results.map((result) => (
								<li key={result.id} className="w-[14rem] sm:w-[19rem]">
									<ResultCard result={result} sizes="(max-width: 640px) 62vw, 19rem" />
								</li>
							))}
						</ul>
					}
				/>

				{hasVisitInfo(contact) ? (
					<Band
						id="visit"
						title="VISIT"
						aside={
							contact.addressLines?.length ? (
								<address className="not-italic text-[0.95rem] leading-relaxed text-tile sm:text-[1.05rem]">
									{contact.addressLines.map((line) => (
										<span key={line} className="block">
											{line}
										</span>
									))}
								</address>
							) : null
						}
					>
						<div className="grid gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-14">
							<div className="rise flex flex-col border-b border-edge">
								{contact.phone ? (
									<ContactLine label="Call" value={contact.phone} href={`tel:${contact.phone}`} />
								) : null}
								{contact.whatsapp ? (
									<ContactLine
										label="WhatsApp"
										value={String(contact.whatsapp)}
										href={`https://wa.me/${String(contact.whatsapp).replace(/\D/g, "")}`}
										external
									/>
								) : null}
								{contact.email ? (
									<ContactLine label="Email" value={contact.email} href={`mailto:${contact.email}`} />
								) : null}
								{contact.instagram ? (
									<ContactLine
										label="Instagram"
										value={contact.instagram.replace(/^https?:\/\/(www\.)?/, "")}
										href={contact.instagram}
										external
									/>
								) : null}
							</div>
							{contact.mapEmbedUrl ? (
								<div
									className="rise aspect-[4/3] w-full overflow-hidden"
									style={{ borderTop: "1px solid var(--edge-lit)" }}
								>
									<iframe
										src={contact.mapEmbedUrl}
										title="Studio location"
										loading="lazy"
										referrerPolicy="no-referrer-when-downgrade"
										className="h-full w-full"
										style={{ border: 0 }}
									/>
								</div>
							) : null}
						</div>
					</Band>
				) : null}

				{/*
				 * The last stop on the route: the three things that happen after the
				 * press, said plainly, because the one thing a visitor fears here is
				 * that pressing it charges a card. It does not.
				 */}
				<Band
					id="join"
					title="JOIN THE FLOOR"
					aside={
						<div className="flex flex-col gap-3.5 sm:items-end">
							<Press href={join} size="lg">
								{cta}
							</Press>
							<p className="max-w-[24rem] text-[0.74rem] leading-relaxed text-muted sm:text-right">
								No card is asked for and nothing is charged online. Your term is recorded on your
								account and settled at the studio.
							</p>
						</div>
					}
				>
					<ol className="border-b border-edge">
						{JOIN_STEPS.map(([step, detail], index) => (
							<li
								key={step}
								className="flex items-baseline gap-4 border-t border-edge py-5 sm:gap-8 sm:py-6"
							>
								<span
									aria-hidden="true"
									className="tabular w-[1.5rem] flex-none text-[0.8rem] font-extrabold tracking-[0.08em] text-action sm:text-[0.95rem]"
								>
									{String(index + 1).padStart(2, "0")}
								</span>
								<span className="flex min-w-0 flex-col gap-1.5 sm:flex-1 sm:flex-row sm:items-baseline sm:gap-8">
									<TileText text={step} className="tile-sm sm:w-[13rem] sm:flex-none" />
									<span className="text-[0.85rem] leading-snug text-muted sm:text-[0.9rem]">
										{detail}
									</span>
								</span>
							</li>
						))}
					</ol>
				</Band>

				<footer className="border-t border-edge">
					<div className="mx-auto flex w-full max-w-board flex-col gap-7 px-gutter py-12 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex flex-col gap-2.5">
							<TileText text={settings.brand.name} className="tile-xs" />
							{contact.addressLines?.length ? (
								<address className="not-italic text-[0.78rem] leading-relaxed text-muted">
									{contact.addressLines.join(", ")}
								</address>
							) : null}
						</div>

						<nav aria-label="Sections" className="flex flex-wrap gap-x-6 gap-y-2.5">
							{[
								["Rates", "#rates"],
								["The room", "#room"],
								["Hours", "#hours"],
								["Results", "/transformations"],
								...(contact.phone ? [["Call", `tel:${contact.phone}`]] : []),
							].map(([label, href]) => (
								<Link
									key={label}
									href={href}
									className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-muted transition-colors hover:text-action"
								>
									{label}
								</Link>
							))}
						</nav>
					</div>
				</footer>




			</main>
		</>
	);
}
