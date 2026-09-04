/**
 * The results wall. The landing board does not carry results at all — a gym with none yet
 * has nothing to put there, and an empty section on the way down the building is worse than
 * no section — so this page is the whole of it: every row the studio has entered, straight
 * from settings, and an honest empty state until there is one.
 */

import { readViewer } from "@/lib/auth/viewer";
import { getSiteSettings } from "@/lib/site/settings";
import Press from "@/app/components/board/press";
import PressText from "@/app/components/board/press-text";
import ResultCard from "@/app/components/board/result-card";
import { EmptySlots, Stamp } from "@/app/components/board/tile-text";

export async function generateMetadata() {
	const { brand } = await getSiteSettings();
	return {
		title: `Results | ${brand.name}`,
		description: `Member results recorded at ${brand.name}.`,
	};
}

export default async function ResultsPage() {
	const [settings, viewer] = await Promise.all([getSiteSettings(), readViewer()]);
	const results = settings.results ?? [];
	const sampled = results.some((result) => result.sample);
	const real = results.filter((result) => !result.sample).length;

	return (
		<main id="board-main" className="mx-auto flex w-full max-w-board flex-col gap-8 px-3 py-10 sm:px-6 sm:py-16">
			<header className="flex flex-col gap-3">
				<PressText as="h1" text="RESULTS" className="tile-md" />
				<p className="max-w-measure text-[0.9rem] leading-relaxed text-muted">
					{results.length
						? "Every result the studio has put on the board. The studio enters these itself — each one is a member who trained here."
						: "The studio has not put any results on the board yet."}
				</p>
				{sampled ? (
					<Stamp>
						{real
							? "Rows marked Sample are demonstration rows, not members."
							: "Every row here is a demonstration row. Real member results replace them when the studio adds them."}
					</Stamp>
				) : null}
			</header>

			{results.length ? (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{results.map((result) => (
						<li key={result.id}>
							<ResultCard
								result={result}
								sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 24rem"
							/>
						</li>
					))}
				</ul>
			) : (
				<div className="flex flex-col items-start gap-3 border-y border-edge py-6">
					<EmptySlots count={7} label="No results on the board yet" />
					<p className="max-w-measure text-[0.84rem] leading-relaxed text-muted">
						Nothing to show here yet. The room, the terms and the hours are all on the board.
					</p>
				</div>
			)}

			<div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
				<Press href={viewer ? "/dashboard/user" : "/login"} size="lg">
					{viewer ? "Pick your plan" : "Sign in to join"}
				</Press>
				<Press href="/" tone="ghost" size="md">
					Back to the board
				</Press>
			</div>
		</main>
	);
}
