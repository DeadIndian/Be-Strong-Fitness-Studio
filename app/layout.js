import "./globals.css";
import { Archivo } from "next/font/google";
import { readViewer } from "@/lib/auth/viewer";
import { getSiteSettings, themeCss } from "@/lib/site/settings";
import SiteNavbar from "./components/navigation/site-navbar";

const board = Archivo({
	subsets: ["latin"],
	axes: ["wdth"],
	variable: "--font-board",
	display: "swap",
});

export async function generateMetadata() {
	const { brand } = await getSiteSettings();
	return {
		title: `${brand.name} — rates, hours and what's inside`,
		description: `${brand.name}. ${brand.line} Membership rates, opening hours and facilities.`,
	};
}

export default async function RootLayout({ children }) {
	const [settings, viewer] = await Promise.all([getSiteSettings(), readViewer()]);

	return (
		<html lang="en" className={board.variable} suppressHydrationWarning>
			<head>
				{/* The owner's palette, validated to hex in lib/site/settings.js. */}
				<style>{themeCss(settings.theme)}</style>
			</head>
			<body suppressHydrationWarning>
				<a
					href="#board-main"
					className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-action focus:px-4 focus:py-2 focus:font-bold focus:uppercase focus:text-ink"
				>
					Skip to content
				</a>
				<SiteNavbar settings={settings} session={viewer} />
				{children}
			</body>
		</html>
	);
}
