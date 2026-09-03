/**
 * The room, as a rail of prints running off the edge of the page. Native
 * scroll-snap: no carousel library, no JS, keyboard-scrollable, and one photo
 * request per frame at the size that frame actually gets.
 *
 * The title is burned into the bottom of the print rather than sat in a caption
 * bar under it — this page has no boxes.
 */

import BoardImage from "../board/board-image";
import { TileText } from "../board/tile-text";

export default function FacilityRack({ facilities = [] }) {
	if (!facilities.length) return null;

	return (
		<div
			role="region"
			aria-label="Facilities, scroll sideways"
			tabIndex={0}
			className="strip gap-2 pb-4 sm:gap-3"
		>
			{facilities.map((facility) => (
				<figure key={facility.id} className="relative w-[15rem] overflow-hidden sm:w-[21rem]">
					<div className="relative aspect-[4/5]">
						<BoardImage
							src={facility.image}
							alt={facility.title}
							sizes="(max-width: 640px) 66vw, 21rem"
						/>
						<span
							aria-hidden="true"
							className="pointer-events-none absolute inset-0"
							style={{
								background:
									"linear-gradient(to top, color-mix(in srgb, var(--board) 92%, transparent) 3%, transparent 48%)",
							}}
						/>
					</div>
					<figcaption className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
						<TileText text={facility.title} className="tile-xs" />
					</figcaption>
				</figure>
			))}
		</div>
	);
}
