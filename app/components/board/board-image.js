/**
 * Any image the owner can change. Files we ship from /public go through
 * next/image; a pasted link or an inline upload is rendered as a plain <img>,
 * so the site never has to allowlist someone else's host in next.config.js.
 *
 * Both fill their container: the caller owns the aspect ratio.
 */

import Image from "next/image";
import { safeImageSrc } from "@/lib/site/sanitize";

export default function BoardImage({ src, alt, sizes = "100vw", className = "", priority = false }) {
	const safe = safeImageSrc(src);

	// An empty slot, the same honest state as an unlettered tile.
	if (!safe) {
		return (
			<span
				aria-hidden="true"
				className="absolute inset-0 block"
				style={{ backgroundColor: "var(--board-deep)" }}
			/>
		);
	}

	if (safe.startsWith("/")) {
		return (
			<Image
				src={safe}
				alt={alt}
				fill
				sizes={sizes}
				priority={priority}
				className={`object-cover ${className}`}
			/>
		);
	}

	return (
		// eslint-disable-next-line @next/next/no-img-element -- owner-supplied source, no loader config
		<img
			src={safe}
			alt={alt}
			loading={priority ? "eager" : "lazy"}
			className={`absolute inset-0 h-full w-full object-cover ${className}`}
		/>
	);
}
