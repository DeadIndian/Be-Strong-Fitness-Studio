"use client";

/**
 * The top rail. Same object on every surface: the studio name in tiles, the
 * board's own links, the live open lamp, and one primary action. The mobile
 * menu is a native <dialog>, so Escape, the focus trap and the scroll lock are
 * the platform's job, not ours.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { hasVisitInfo } from "@/lib/site/defaults";
import OpenNow from "../board/open-now";
import Press from "../board/press";
import { Stamp, TileText } from "../board/tile-text";

function publicLinks(settings) {
	const links = [
		{ label: "Rates", href: "/#rates" },
		{ label: "The room", href: "/#room" },
		{ label: "Hours", href: "/#hours" },
		{ label: "Results", href: "/#results" },
	];
	// No link to a section with nothing in it yet.
	if (hasVisitInfo(settings?.contact)) links.push({ label: "Visit", href: "/#visit" });
	return links;
}

const STAFF_LINKS = [
	{ label: "Members", href: "/dashboard/staff/users" },
	{ label: "Memberships", href: "/dashboard/staff/memberships" },
	{ label: "Website", href: "/dashboard/staff/website" },
];

function MenuGlyph() {
	return (
		<span aria-hidden="true" className="flex flex-col gap-[3px]">
			<span className="block h-[2px] w-4 bg-current" />
			<span className="block h-[2px] w-4 bg-current" />
			<span className="block h-[2px] w-4 bg-current" />
		</span>
	);
}

export default function SiteNavbar({ settings, session = null }) {
	const pathname = usePathname();
	const sheet = useRef(null);
	const [busy, setBusy] = useState(false);

	const inStaff = pathname.startsWith("/dashboard/staff");
	const links = inStaff ? STAFF_LINKS : publicLinks(settings);
	const close = useCallback(() => sheet.current?.close(), []);

	useEffect(() => close(), [pathname, close]);

	const signOut = async () => {
		setBusy(true);
		try {
			await fetch("/api/auth/logout", { method: "POST" });
		} finally {
			window.location.assign("/login");
		}
	};

	const home = session?.staff ? "/dashboard/staff" : session ? "/dashboard/user" : "/";
	// On the sign-in page itself the action cannot be "Sign in" — the way out is back.
	const action = session
		? { href: session.staff ? "/dashboard/staff" : "/dashboard/user", label: session.staff ? "Console" : "My membership" }
		: pathname === "/login"
			? { href: "/", label: "Back to the board" }
			: { href: "/login", label: "Sign in" };

	return (
		<header className="sticky top-0 z-40">
			<div className="slot-rail flex min-h-rail items-stretch justify-between gap-2 px-3 sm:px-5">
				<Link
					href={home}
					className="flex items-center gap-2.5 py-2 sm:gap-3.5"
					aria-label={settings.brand.name}
				>
					{settings.brand.logoUrl ? (
						// eslint-disable-next-line @next/next/no-img-element -- owner-supplied URL, no loader config
						<img
							src={settings.brand.logoUrl}
							alt=""
							width={36}
							height={36}
							className="h-8 w-8 flex-none object-cover sm:h-9 sm:w-9"
						/>
					) : null}
					<TileText text={settings.brand.shortName} className="tile-nav" />
				</Link>

				<nav aria-label={inStaff ? "Staff sections" : "Board sections"} className="hidden items-stretch md:flex">
					{links.map((link) => {
						const active = !link.href.includes("#") && pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								aria-current={active ? "page" : undefined}
								className={`relative flex items-center px-3 text-[0.72rem] font-bold uppercase tracking-[0.18em] transition-colors ${
									active ? "text-tile" : "text-muted hover:text-tile"
								}`}
							>
								{link.label}
								{active ? (
									<span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-[3px] bg-action" />
								) : null}
							</Link>
						);
					})}
				</nav>

				<div className="flex items-center gap-2 py-2 sm:gap-3">
					<OpenNow hours={settings.hours} className="hidden lg:inline-flex" />
					<Press href={action.href} size="sm" className="hidden sm:inline-flex">
						{action.label}
					</Press>
					{session ? (
						<Press tone="ghost" size="sm" onClick={signOut} disabled={busy} className="hidden md:inline-flex">
							{busy ? "Signing out" : "Sign out"}
						</Press>
					) : null}
					<Press
						tone="ghost"
						size="sm"
						className="md:hidden"
						aria-label="Open menu"
						onClick={() => sheet.current?.showModal()}
					>
						<MenuGlyph />
						Menu
					</Press>
				</div>
			</div>

			<dialog
				ref={sheet}
				className="board-sheet"
				aria-label="Menu"
				onClick={(event) => {
					if (event.target === sheet.current) close();
				}}
			>
				<div className="flex h-full flex-col">
					<div className="slot-rail flex min-h-rail items-center justify-between gap-3 px-3">
						<TileText text={settings.brand.shortName} className="tile-nav" />
						<Press tone="ghost" size="sm" onClick={close} aria-label="Close menu">
							Close
						</Press>
					</div>

					<nav aria-label="Sections" className="flex-1 overflow-y-auto">
						{links.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								onClick={close}
								className="flex min-h-[3.25rem] items-center justify-between gap-3 border-b border-edge px-4 text-[0.82rem] font-bold uppercase tracking-[0.18em] text-tile"
							>
								{link.label}
								<span
									aria-hidden="true"
									className="h-[0.3rem] w-[0.3rem] flex-none rotate-45 bg-action"
								/>
							</Link>
						))}
					</nav>

					<div className="flex flex-col gap-3 border-t border-edge p-4">
						<OpenNow hours={settings.hours} />
						<Press href={action.href} size="lg" full onClick={close}>
							{action.label}
						</Press>
						{session ? (
							<Press tone="ghost" size="md" full onClick={signOut} disabled={busy}>
								{busy ? "Signing out" : "Sign out"}
							</Press>
						) : null}
						<Stamp>{settings.brand.name}</Stamp>
					</div>
				</div>
			</dialog>
		</header>
	);
}
