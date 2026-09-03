/**
 * One member's result: the photograph, with the name burned into the bottom of it
 * and the numbers under the name. No border and no caption bar — the print is the
 * object. The public board and the results wall show the same print, so a result
 * cannot look like two different claims.
 *
 * `sample: true` is printed on the photograph itself — a demonstration row never
 * passes for a member.
 */

import BoardImage from "./board-image";
import { TileText } from "./tile-text";

export default function ResultCard({ result, sizes }) {
	return (
		<article className="relative overflow-hidden">
			<div className="relative aspect-[3/4]">
				<BoardImage src={result.image} alt={`${result.name} — ${result.detail}`} sizes={sizes} />
				<span
					aria-hidden="true"
					className="pointer-events-none absolute inset-0"
					style={{
						background:
							"linear-gradient(to top, color-mix(in srgb, var(--board) 94%, transparent) 3%, transparent 52%)",
					}}
				/>
			</div>

			{result.sample ? (
				<span className="absolute left-0 top-0 bg-action px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.2em] text-ink">
					Sample
				</span>
			) : null}

			<div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3.5 sm:p-4">
				<TileText text={result.name} className="tile-xs" />
				<span className="tabular text-[0.68rem] uppercase tracking-[0.12em] text-muted">
					{result.detail}
					{result.months ? ` · ${result.months} mo` : ""}
				</span>
			</div>
		</article>
	);
}
