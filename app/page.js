/**
 * The landing page: five storeys of a building the visitor scrolls down, with one man
 * working his way to the bottom of it. `Stage` mounts the rig behind everything; this file
 * is the page it reads, and the page reads perfectly well without it.
 *
 * Two rules hold the whole thing together. Nothing is invented: every fact printed here
 * comes from settings, and anything the owner has not supplied is left off rather than
 * filled with a plausible-looking sample. And nothing is a card: the type sits directly on
 * the room, a hairline runs the width of the window between sections, and a priced term is
 * a line in a ledger.
 *
 * Structure the rig depends on, and which therefore must not drift:
 *   · exactly five `<Floor>` wrappers plus the ground footer, in this order, whatever the
 *     owner has or has not filled in — `STATIONS` in `building.js` is a fixed list of five
 *     and a floor that appears only when `contact` is set would leave him standing on air;
 *   · one `.parting` heading per floor below the first, being the line his fall goes
 *     through;
 *   · `.shove` on every row he is meant to displace on his way past.
 */

import Link from "next/link";
import { readViewer } from "@/lib/auth/viewer";
import { hasVisitInfo } from "@/lib/site/defaults";
import { toMinutes } from "@/lib/site/hours.mjs";
import { getSiteSettings } from "@/lib/site/settings";
import OpenNow from "./components/board/open-now";
import Press from "./components/board/press";
import PlanFace, { perMonth } from "./components/board/rate-row";
import { Stamp, TileText } from "./components/board/tile-text";
import HoursBand from "./components/landing/hours-band";
import Stage from "./components/landing/stage";

/** The three things that happen after the press, in the order they happen. */
const JOIN_STEPS = [
	["Sign in", "Your email is the account. No card is asked for."],
	["Press a term", "Whichever one you want, at the standing price."],
	["Train", "The term sits on your account and is settled at the studio."],
];

/**
 * Hours the doors are open in a week, added up from the owner's own table. A computed
 * figure, so it cannot drift from the hours printed further down the page and it cannot be
 * a claim nobody checked.
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
 * One storey. The wrapper is what the rig reads to find its slabs, so the number painted
 * here and the hairline he stands on are one fact in two media. The number is decorative —
 * it repeats the heading inside it — so it is hidden from assistive technology rather than
 * announced five times on the way down.
 */
function Floor({ no, children }) {
	return (
		<div className="floor" data-floor={no}>
			<span aria-hidden="true" className="absolute right-gutter top-5 z-10">
				<Stamp tone="muted">{no}</Stamp>
			</span>
			{children}
		</div>
	);
}

/**
 * A section: the heading at wall scale, whatever governs it on the line below, and the type
 * held out of the lane the man works in. The heading carries `parting` because it is the
 * line his fall goes through — the rig measures its letters and drives them aside.
 *
 * `aside` is wrapped twice on purpose, and in this order. `.rise` animates a transform and
 * `.shove` sets one, so the two may never share an element — an animation would win
 * outright. `.shove` is the outer of the two because it is the one that gets measured, and
 * measuring a box that `.rise` currently has translated 2.5rem down the page would put its
 * middle 2.5rem off where he actually meets it.
 */
function Band({ id, title, aside = null, children = null }) {
	return (
		<section id={id} className="py-14 sm:py-20">
			<div className="mx-auto w-full max-w-board px-gutter pr-column">
				<header className="mb-8 flex flex-col gap-4 sm:mb-12 sm:gap-5">
					<TileText as="h2" text={title} className="wipe parting tile-lg" />
					{aside ? (
						<div className="shove max-w-measure">
							<div className="rise">{aside}</div>
						</div>
					) : null}
				</header>
				{children}
			</div>
		</section>
	);
}

/**
 * One priced term as a line in a ledger. The whole line is the target — on a phone that is
 * a 76px-tall tap area, not a button hunted for at the end of a row — and reaching for it
 * floods the line with light from the left rather than drawing a box around it. The face
 * itself is shared with the member's desk, so the price reads the same in both places.
 */
function PlanLine({ plan, href, signedIn }) {
	return (
		<Link
			href={href}
			aria-label={`${plan.title}, ₹${plan.priceInr} — ${signedIn ? "take this term" : "sign in to take this term"}`}
			className="ledger group block py-5 sm:py-7"
		>
			<PlanFace plan={plan} />
		</Link>
	);
}

/**
 * Label, leader, rule: the term sits on a line drawn to what governs it. Narrow screens
 * drop the leader and stack instead — a dashed line between two wrapped blocks connects
 * nothing.
 */
function LeaderRow({ label, detail }) {
	return (
		<li className="shove flex flex-col gap-0.5 border-t border-edge py-4 sm:flex-row sm:items-end sm:gap-3">
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
			className="ledger shove group flex items-baseline justify-between gap-5 py-4"
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

	// Three figures, each arithmetic on data the owner already maintains rather than a
	// claim: the hours off the hours table, the count off the room list, and the load on
	// the bar the visitor is watching — one plate per term, both ends, on a 20kg bar.
	// Anything that comes out as zero is left off.
	const barKg = plans.length
		? 20 + 2 * plans.reduce((total, plan) => total + (Number(plan.plate) || 5), 0)
		: 0;
	const scale = [
		[weeklyHours(settings.hours), "hours open a week"],
		[facilities.length, "things in the room"],
		[barKg ? `${barKg} kg` : 0, "on the bar behind you"],
	].filter(([value]) => value !== 0);

	return (
		<>
			<Stage plates={plans.map((plan) => Number(plan.plate) || 5).join(",")} />

			<main id="board-main">
				<Floor no="05">
					<section className="relative flex min-h-[calc(100svh-var(--rail-height))] flex-col justify-end px-gutter pb-12 pt-20 sm:pb-16">
						{/*
						 * The name painted on the far wall. It is behind the rig's canvas, so the
						 * loaded bar passes in front of the lettering — the first viewport has
						 * actual depth in it instead of a picture of depth.
						 */}
						<span aria-hidden="true" className="mural">
							<span>{settings.brand.shortName}</span>
						</span>

						{/*
						 * The type sits on the room, not in a box. This one scrim is what keeps it
						 * legible over whatever the steel behind it is doing — heavy where the
						 * words are, gone by the middle of the frame so the man is not veiled.
						 */}
						<span
							aria-hidden="true"
							className="pointer-events-none absolute inset-x-0 bottom-0 top-[18%]"
							style={{
								background:
									"linear-gradient(to top, color-mix(in srgb, var(--board) 94%, transparent) 6%, color-mix(in srgb, var(--board) 52%, transparent) 42%, transparent 84%)",
							}}
						/>

						<div className="relative mx-auto flex w-full max-w-board flex-col gap-7 pr-lane sm:gap-9">
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

					{/*
					 * The size of the place, in three figures. No heading: these are the caption
					 * to the room itself. This floor has no `.parting` line and no `.shove` rows
					 * because he is standing on it, not falling through it.
					 */}
					{scale.length >= 3 ? (
						<section className="mx-auto w-full max-w-board border-t border-edge px-gutter">
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

					{/*
					 * The only affordance this floor needs. He is already working above the line,
					 * so the page says what happens next once and in its own voice rather than
					 * drawing a bouncing chevron about it.
					 */}
					<p className="mx-auto w-full max-w-board px-gutter pb-12 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted sm:pb-16">
						Scroll — he takes the floors the hard way
					</p>
				</Floor>

				<Floor no="04">
					<Band
						id="rates"
						title="RATES"
						aside={
							<div className="flex flex-col gap-4">
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
						{/*
						 * The plates on the bar he is loading one floor up are these five terms, in
						 * this order. `Stage` is handed the same list, so a price edit re-loads the
						 * bar as well as the ledger.
						 */}
						<ol className="border-b border-edge">
							{plans.map((plan) => (
								<li key={plan.id} className="shove border-t border-edge">
									<PlanLine plan={plan} href={join} signedIn={signedIn} />
								</li>
							))}
						</ol>
						<p className="mt-6 max-w-measure text-[0.76rem] leading-relaxed text-muted">
							No payment is taken online. Activating a term records it on your account — nothing is
							charged{settings.checkout?.note ? `. ${settings.checkout.note}` : "."}
						</p>
					</Band>
				</Floor>

				<Floor no="03">
					<Band
						id="room"
						title="THE ROOM"
						aside={
							<p className="text-[0.86rem] leading-relaxed text-muted sm:text-[0.92rem]">
								Everything the studio has, and what is expected of you while you use it. Steam
								baths and the massage chair are metered per term; the count for each is on its
								line in the rates above.
							</p>
						}
					>
						{/*
						 * The room as a list of what is in it, printed rather than photographed. The
						 * studio's own photographs go here when the owner uploads them; a stock
						 * picture of somebody else's gym is not a substitute and is not shown.
						 */}
						{facilities.length ? (
							<ol className="grid gap-x-10 border-b border-edge sm:grid-cols-2 lg:gap-x-16">
								{facilities.map((facility, index) => (
									<li
										key={facility.id}
										className="shove flex items-baseline gap-4 border-t border-edge py-4 sm:gap-6"
									>
										<span
											aria-hidden="true"
											className="tabular w-[1.4rem] flex-none text-[0.72rem] font-extrabold tracking-[0.08em] text-action"
										>
											{String(index + 1).padStart(2, "0")}
										</span>
										<TileText text={facility.title} className="tile-xs" />
									</li>
								))}
							</ol>
						) : null}

						{rules.length ? (
							<div className="mt-10 flex flex-col gap-4 sm:mt-14">
								<Stamp tone="tile">While you train</Stamp>
								<ul className="flex flex-col border-b border-edge">
									{rules.map((rule) => (
										<LeaderRow key={rule.id} label={rule.label} detail={rule.detail} />
									))}
								</ul>
							</div>
						) : null}
					</Band>
				</Floor>

				{/*
				 * Hours sit below the room and above the desk: a prospect asks what is in there,
				 * then when it is open, then how to join, and each floor is a whole viewport of
				 * scrolling away from the next.
				 */}
				<Floor no="02">
					<Band
						id="hours"
						title="HOURS"
						aside={
							<div className="flex">
								<OpenNow hours={settings.hours} />
							</div>
						}
					>
						<HoursBand hours={settings.hours} />
					</Band>
				</Floor>

				<Floor no="01">
					{/*
					 * The last stop on the route: the three things that happen after the press,
					 * said plainly, because the one thing a visitor fears here is that pressing it
					 * charges a card. It does not. Whatever the studio has published about
					 * reaching them follows on the same floor rather than on one of its own — the
					 * rig has five stations and the floor count cannot depend on the owner's data.
					 */}
					<Band
						id="join"
						title="JOIN THE FLOOR"
						aside={
							<div className="flex flex-col gap-3.5">
								<Press href={join} size="lg">
									{cta}
								</Press>
								<p className="max-w-[24rem] text-[0.74rem] leading-relaxed text-muted">
									No card is asked for and nothing is charged online. Your term is recorded on
									your account and settled at the studio.
								</p>
							</div>
						}
					>
						<ol className="border-b border-edge">
							{JOIN_STEPS.map(([step, detail], index) => (
								<li
									key={step}
									className="shove flex items-baseline gap-4 border-t border-edge py-5 sm:gap-8 sm:py-6"
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

						{hasVisitInfo(contact) ? (
							<div id="visit" className="mt-12 flex flex-col gap-4 sm:mt-16">
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
											<ContactLine
												label="Email"
												value={contact.email}
												href={`mailto:${contact.email}`}
											/>
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
					</Band>
				</Floor>

				<footer className="border-t border-edge" data-floor="ground">
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
								["Join", "#join"],
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
