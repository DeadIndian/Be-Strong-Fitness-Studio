/**
 * The landing page: one gym hall seen from the side, five stations wide, with one
 * man in it. This file is the hall's own signage — the whole of it, complete and
 * readable with no canvas, no JavaScript and no WebGL. That is the artefact; the
 * rig is only what it is lit by.
 *
 * Content is in walk-in order, which is the order a prospect's questions actually
 * arrive: is it open, what can I train on, what else is included, what do I get
 * afterwards, what does it cost. Price is last on purpose — nobody walks into a
 * gym and asks the price first.
 *
 * Two rules hold it together. Nothing is invented: every fact printed here comes
 * from settings, and anything the owner has not supplied is either left off or
 * said plainly to be missing, never filled with a plausible-looking sample. And
 * nothing is a card: the type sits directly on the room, one hairline separates a
 * row from the next, and a priced term is a line in a ledger.
 *
 * Structure the rig reads, and which therefore must not drift:
 *   · exactly five `<section data-station="1..5">`, in this order, whatever the
 *     owner has or has not filled in — the hall is five stations wide, and a
 *     station that appeared only when its data did would leave him nowhere to
 *     stand;
 *   · `data-flow` on prose he re-breaks around himself, which must therefore hold
 *     text and nothing else;
 *   · `data-yield` on the rows and controls he steps aside;
 *   · `data-plate="<plan-id>"` on each priced row, being its plate on the tree.
 */

import Link from "next/link";
import { readViewer } from "@/lib/auth/viewer";
import { facilitiesIn, hasVisitInfo } from "@/lib/site/defaults";
import { toMinutes } from "@/lib/site/hours.mjs";
import { getSiteSettings } from "@/lib/site/settings";
import OpenNow from "./components/board/open-now";
import Press from "./components/board/press";
import { perMonth } from "./components/board/rate-row";
import PricingCard from "./components/board/pricing-card";
import DragCarousel from "./components/board/drag-carousel";
import { Stamp, TileText } from "./components/board/tile-text";
import HoursStrip, { DoorLine } from "./components/gym/hours-strip";
import Room from "./components/gym/room";

/** The three things that happen after the press, in the order they happen. */
const JOIN_STEPS = [
	["Sign in", "Your email is the account. No card is asked for."],
	["Press a term", "Whichever one you want, at the standing price."],
	["Train", "The term sits on your account and is settled at the studio."],
];

/**
 * Hours the doors are open in a week, added up from the owner's own table. A
 * computed figure, so it cannot drift from the hours printed at the door and it
 * cannot be a claim nobody checked.
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
 * One station: a numbered stop on the walk, its number and its standing question
 * painted on the wall above it with the strip light running off to the next one.
 *
 * The head prints whether or not there is anything under it. An empty station is
 * still a place in the room, and he has to have somewhere to stand.
 */
function Station({ no, id, asks, children }) {
	return (
		<section id={id} data-station={no} className="station px-gutter py-14 sm:py-24">
			<div className="mx-auto flex w-full max-w-board flex-col gap-8 sm:gap-12">
				<p className="flex flex-wrap items-center gap-x-5 gap-y-2">
					<span
						aria-hidden="true"
						className="tabular flex-none text-[0.72rem] font-extrabold tracking-[0.22em] text-action"
					>
						{String(no).padStart(2, "0")}
					</span>
					<span className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-muted">
						{asks}
					</span>
					<span
						aria-hidden="true"
						className="hidden h-px flex-1 sm:block"
						style={{
							background: "linear-gradient(90deg, var(--edge-lit), var(--edge) 55%, transparent)",
						}}
					/>
				</p>
				{children}
			</div>
		</section>
	);
}

/**
 * A paragraph he walks through: its lines re-break to leave him room and close up
 * behind him.
 *
 * Text and nothing else. The client hands the paragraph's own words to a canvas
 * measurer and lays them out itself, so a link nested in here would come back as
 * bare words with its href dropped. Links go on their own line, in a ledger row,
 * or in a Press.
 */
function Prose({ children, className = "" }) {
	return (
		<p
			data-flow
			className={`max-w-measure text-[0.95rem] leading-relaxed text-muted sm:text-[1.02rem] ${className}`}
		>
			{children}
		</p>
	);
}

/**
 * What is at this station, in the studio's own words, printed rather than
 * photographed. The owner's photographs go on the facility itself when they upload
 * them; a stock picture of somebody else's gym is not a substitute for one and is
 * not shown here. Nothing zoned here says so, rather than leaving a hole.
 */
function FacilityList({ items }) {
	if (!items.length) {
		return (
			<p className="text-[0.86rem] uppercase tracking-[0.16em] text-muted">
				Nothing is listed here yet.
			</p>
		);
	}
	return (
		<ol className="grid gap-x-10 border-b border-edge sm:grid-cols-2 lg:gap-x-16">
			{items.map((item, index) => (
				<li
					key={item.id}
					data-yield
					className="flex items-baseline gap-4 border-t border-edge py-4 sm:gap-6"
				>
					<span
						aria-hidden="true"
						className="tabular w-[1.4rem] flex-none text-[0.72rem] font-extrabold tracking-[0.08em] text-action"
					>
						{String(index + 1).padStart(2, "0")}
					</span>
					<TileText text={item.title} className="tile-xs" />
				</li>
			))}
		</ol>
	);
}

/**
 * Arithmetic on what the owner already maintains, at the size a number painted on
 * a wall would be. Not a claim: the hours come off the hours table and the count
 * off the room list, so neither can be talked up.
 */
function Figures({ rows }) {
	if (!rows.length) return null;
	return (
		<dl className="grid grid-cols-1 border-b border-edge sm:grid-cols-2">
			{rows.map(([value, label], index) => (
				<div
					key={label}
					data-yield
					className={`flex flex-col gap-2 border-t border-edge py-7 sm:py-9 ${
						index ? "sm:border-l sm:border-edge sm:pl-6 lg:pl-10" : ""
					}`}
				>
					<dd className="tabular order-1 text-[2.6rem] font-extrabold leading-[0.78] tracking-[-0.045em] text-tile [font-stretch:74%] sm:text-[3.6rem]">
						{value}
					</dd>
					<dt className="order-2 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted">
						{label}
					</dt>
				</div>
			))}
		</dl>
	);
}

/**
 * Label, leader, rule: the term sits on a line drawn to what governs it. Narrow
 * screens drop the leader and stack instead — a dashed line between two wrapped
 * blocks connects nothing.
 */
function LeaderRow({ label, detail }) {
	return (
		<li
			data-yield
			className="flex flex-col gap-0.5 border-t border-edge py-4 sm:flex-row sm:items-end sm:gap-3"
		>
			<span className="text-[0.74rem] font-bold uppercase tracking-[0.14em] text-tile sm:pb-1">
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
		<a
			href={href}
			data-yield
			className="ledger group flex items-baseline justify-between gap-5 py-4"
			{...away}
		>
			<span className="relative flex-none text-[0.66rem] font-bold uppercase tracking-[0.2em] text-muted">
				{label}
			</span>
			<span className="relative min-w-0 truncate text-[0.95rem] font-bold text-tile transition-colors group-hover:text-action sm:text-[1.05rem]">
				{value}
			</span>
		</a>
	);
}

export default async function HomePage() {
	const [settings, viewer] = await Promise.all([getSiteSettings(), readViewer()]);
	const signedIn = Boolean(viewer);
	const contact = settings.contact;
	const plans = settings.plans ?? [];
	const rules = settings.rules ?? [];
	const facilities = settings.facilities ?? [];
	const join = signedIn ? "/dashboard/user" : "/login";
	const cta = signedIn ? "Pick your plan" : "Sign in to join";

	// The honest hook: the lowest real monthly cost on the board, and the term that
	// actually gets you it. No "was" price, because none was ever charged.
	const best = plans.length
		? plans.reduce((low, plan) => (perMonth(plan) < perMonth(low) ? plan : low))
		: null;

	// Two figures at the iron, both arithmetic on the owner's own data. Anything
	// that comes out as zero is left off rather than printed as a nought.
	const figures = [
		[weeklyHours(settings.hours), "hours open a week"],
		[facilities.length, "things in the room"],
	].filter(([value]) => value !== 0);

	// Recovery only explains metering if the owner's terms actually meter something.
	const metered = plans.some((plan) => plan.perks?.length);

	return (
		<>
			{/*
			 * The studio's name painted on the far wall of the hall. It is the CSS
			 * backdrop, behind the room's own canvas, so the rack and the loaded bar
			 * pass in front of the lettering — the hall has real depth in it rather than
			 * a picture of depth. Where the rig never mounts, it is simply wall paint.
			 */}
			<span aria-hidden="true" className="mural">
				<span>{settings.brand.shortName}</span>
			</span>

			{/*
			 * The room. Mounts itself only where the browser can carry it and takes itself
			 * away again if the frames turn out too slow, so everything below stands on its
			 * own — this is the last thing added to the page and the first thing to go.
			 */}
			<Room hours={settings.hours} plans={plans} />

			<main id="board-main">
				{/*
				 * 01 · THE DOOR. The lamp, the name, the week, and the one line the
				 * shutter itself says — all three of the live ones read the studio's own
				 * clock on the client, because a cached page must not claim an hour that
				 * has passed. No price here: nobody walks into a gym and asks that first.
				 */}
				<Station no={1} id="door" asks="Is it open, and where am I?">
					<div className="slab rounded-3xl p-6 sm:p-10 flex flex-col gap-6 sm:gap-8">
						<OpenNow hours={settings.hours} />
						<TileText as="h1" text={settings.brand.name} className="tile-xl" press stagger={34} />
					</div>

					<div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
						<div className="flex flex-col gap-7">
							<Prose>
								{settings.brand.line} Steel, floor space and every class in one membership. Sign
								in, take a term, and it is on your account the moment you press it.
							</Prose>
							<DoorLine hours={settings.hours} />
							<div className="flex flex-col items-start gap-3.5">
								<Press href={join} size="lg" data-yield>
									{cta}
								</Press>
								<span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted">
									No payment is taken online
								</span>
							</div>
						</div>

						<div className="flex flex-col gap-4">
							<Stamp tone="tile">The week on the door</Stamp>
							<HoursStrip hours={settings.hours} />
						</div>
					</div>

					<p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted">
						Scroll — he walks you through it
					</p>
				</Station>

				{/*
				 * 02 · THE IRON. What he is standing in front of: the machines and the free
				 * weights, what is expected of you while you use them, and the size of the
				 * place in two figures nobody had to write down.
				 */}
				<Station no={2} id="iron" asks="What can I actually train on?">
					<div className="slab rounded-3xl p-6 sm:p-10 flex flex-col gap-8">
						<TileText as="h2" text="The iron" className="tile-lg" />
						<Prose>
							Racks, bars, plates and the machines, on one open floor. Nothing here is a
							separate membership and nothing is booked — you turn up and use it.
						</Prose>
						<FacilityList items={facilitiesIn(facilities, "iron")} />
					</div>

					{rules.length ? (
						<div className="slab rounded-3xl p-6 sm:p-10 flex flex-col gap-4">
							<Stamp tone="tile">While you train</Stamp>
							<ul className="flex flex-col border-b border-edge">
								{rules.map((rule) => (
									<LeaderRow key={rule.id} label={rule.label} detail={rule.detail} />
								))}
							</ul>
						</div>
					) : null}

					<div className="slab rounded-3xl p-6 sm:p-10">
						<Figures rows={figures} />
					</div>
				</Station>

				{/*
				 * 03 · THE FLOOR. The classes, which are the answer to the question a rate
				 * card never answers: what am I getting that is not a machine.
				 */}
				<Station no={3} id="classes" asks="What else is included?">
					<div className="slab rounded-3xl p-6 sm:p-10 flex flex-col gap-8">
						<TileText as="h2" text="The floor" className="tile-lg" />
						<Prose>
							Every class the studio runs is in the one membership. There is no per-class fee,
							no separate pass and no upgrade tier — the same term that opens the door opens
							the floor.
						</Prose>
						<FacilityList items={facilitiesIn(facilities, "classes")} />
					</div>
				</Station>

				{/*
				 * 04 · RECOVERY. What happens after the session, which is the half of a gym
				 * that gets left off its own website. The metered line is printed only if the
				 * owner's terms actually meter something.
				 */}
				<Station no={4} id="recovery" asks="What do I get afterwards?">
					<div className="slab rounded-3xl p-6 sm:p-10 flex flex-col gap-8">
						<TileText as="h2" text="Recovery" className="tile-lg" />
						<Prose>
							The end of a session is part of the session. Steam, the chair, a locker and
							something hot are all on the same membership as the barbells.
						</Prose>
						<FacilityList items={facilitiesIn(facilities, "recovery")} />

						{metered ? (
							<Prose>
								The steam bath and the massage chair are metered rather than unlimited: each
								term includes a set number of both, and the count for a term is printed on its
								line at the desk.
							</Prose>
						) : null}

						<Link
							href="/transformations"
							data-yield
							className="ledger group flex items-baseline justify-between gap-5 py-5"
						>
							<span className="relative">
								<TileText text="Member results" className="tile-sm" />
							</span>
							<span className="relative flex-none text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted transition-colors group-hover:text-action">
								See the board
							</span>
						</Link>
					</div>
				</Station>

				{/*
				 * 05 · THE DESK. The last stop, and the first place a price appears. Each row
				 * carries its plan id, because that row and the plate on the tree behind it are
				 * one fact in two media: a price the owner edits re-cuts the metal.
				 */}
				<Station no={5} id="desk" asks="What does it cost, and what happens if I press?">
					<div className="slab rounded-3xl p-6 sm:p-10 flex flex-col gap-8">
						<TileText as="h2" text="The desk" className="tile-lg" />
						<Prose>
							Longer terms cost less per month. Every term includes the whole floor and every
							class; only the metered counts change.
						</Prose>
					</div>

					{plans.length ? (
						<div className="w-[100vw] relative left-1/2 -ml-[50vw]">
							<DragCarousel className="gap-6 pb-8 pt-4 pl-[max(var(--gutter),calc(50vw-42rem))] pr-[max(320px,calc(50vw-42rem))]">
								{plans.map((plan) => (
									<Link
										key={plan.id}
										data-plate={plan.id}
										data-yield
										href={join}
										aria-label={`${plan.title}, ₹${plan.priceInr} — ${
											signedIn ? "take this term" : "sign in to take this term"
										}`}
										className="relative flex-none w-[85vw] sm:w-[320px] snap-center outline-none"
									>
										<PricingCard plan={plan} className="h-full w-full" />
									</Link>
								))}
							</DragCarousel>
						</div>
					) : null}

					{best ? (
						<div className="slab rounded-3xl p-6 sm:p-10">
							<p className="flex flex-wrap items-end gap-x-4 gap-y-1">
								<span className="tabular text-[2.6rem] font-extrabold leading-[0.78] tracking-[-0.045em] text-tile [font-stretch:74%] sm:text-[3.4rem]">
									₹{perMonth(best).toLocaleString("en-IN")}
								</span>
								<span className="pb-1 text-[0.7rem] uppercase leading-tight tracking-[0.16em] text-muted">
									a month is the least it costs,
									<br />
									on the {best.title.toLowerCase()} term
								</span>
							</p>
						</div>
					) : null}

					<div className="slab rounded-3xl p-6 sm:p-10 flex flex-col gap-4">
						<Stamp tone="tile">What happens when you press it</Stamp>
						<ol className="border-b border-edge">
							{JOIN_STEPS.map(([step, detail], index) => (
								<li
									key={step}
									data-yield
									className="flex items-baseline gap-4 border-t border-edge py-4 sm:gap-8 sm:py-5"
								>
									<span
										aria-hidden="true"
										className="tabular w-[1.5rem] flex-none text-[0.8rem] font-extrabold tracking-[0.08em] text-action"
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
					</div>

					<div className="slab rounded-3xl p-6 sm:p-10 flex flex-col items-start gap-3.5">
						<Press href={join} size="lg" data-yield>
							{cta}
						</Press>
						<p className="max-w-[26rem] text-[0.74rem] leading-relaxed text-muted">
							No card is asked for and nothing is charged online. Your term is recorded on your
							account and settled at the studio
							{settings.checkout?.note ? `. ${settings.checkout.note}` : "."}
						</p>
					</div>

					{hasVisitInfo(contact) ? (
						<div id="visit" className="slab rounded-3xl p-6 sm:p-10 flex flex-col gap-4">
							<Stamp tone="tile">Where and how to reach us</Stamp>
							{contact.addressLines?.length ? (
								<address className="not-italic text-[0.95rem] leading-relaxed text-tile sm:text-[1.05rem]">
									{contact.addressLines.map((line) => (
										<span key={line} className="block">
											{line}
										</span>
									))}
								</address>
							) : null}
							<div className="grid gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-14">
								<div className="flex flex-col border-b border-edge">
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
										className="aspect-[4/3] w-full overflow-hidden"
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
						</div>
					) : null}


				</Station>

				<footer className="border-t border-edge px-gutter py-12">
					<div className="mx-auto flex w-full max-w-board flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex flex-col gap-2.5">
							<TileText text={settings.brand.name} className="tile-xs" />
							{contact.addressLines?.length ? (
								<address className="not-italic text-[0.78rem] leading-relaxed text-muted">
									{contact.addressLines.join(", ")}
								</address>
							) : null}
						</div>

						<nav aria-label="Stations" className="flex flex-wrap gap-x-6 gap-y-2.5">
							{[
								["The door", "#door"],
								["The iron", "#iron"],
								["The floor", "#classes"],
								["Recovery", "#recovery"],
								["The desk", "#desk"],
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
