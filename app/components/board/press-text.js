"use client";

/**
 * A run of tiles that presses in the first time the row reaches the viewport.
 * The observer lives here rather than in a wrapper: a server component can pass
 * a string across the boundary, never a render prop.
 */

import { useEffect, useRef, useState } from "react";
import { TileText } from "./tile-text";

export default function PressText({ text, as = "span", className = "", threshold = 0.3, ...rest }) {
	const ref = useRef(null);
	const [seen, setSeen] = useState(false);

	useEffect(() => {
		const node = ref.current;
		if (!node) return undefined;
		if (typeof IntersectionObserver === "undefined") {
			setSeen(true);
			return undefined;
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setSeen(true);
					observer.disconnect();
				}
			},
			{ threshold },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [threshold]);

	// ponytail: ref goes on the tile run itself — a wrapper would need its own box.
	return <TileText as={as} innerRef={ref} text={text} className={className} press={seen} {...rest} />;
}
