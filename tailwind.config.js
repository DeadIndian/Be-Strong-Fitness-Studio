/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./app/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
	theme: {
		extend: {
			colors: {
				board: "var(--board)",
				"board-deep": "var(--board-deep)",
				tile: "var(--tile)",
				ink: "var(--ink)",
				rail: "var(--rail)",
				action: "var(--action)",
				accent: "var(--accent)",
				muted: "var(--muted)",
				edge: "var(--edge)",
				"edge-lit": "var(--edge-lit)",
				warn: "var(--warn)",
			},
			fontFamily: {
				board: ["var(--font-board)", "ui-sans-serif", "system-ui", "sans-serif"],
			},
			spacing: {
				tile: "var(--tile-size)",
				rail: "var(--rail-height)",
				gutter: "var(--gutter)",
				// The lane he works in, and the type column's padding that keeps it clear.
				lane: "var(--lane)",
				column: "calc(var(--gutter) + var(--lane))",
			},
			maxWidth: {
				board: "84rem",
				measure: "68ch",
			},
			boxShadow: {
				// Depth is distance from the light, never a drawn outline.
				tile: "0 0.6rem 1.6rem rgba(0, 0, 0, 0.55)",
				slot: "inset 0 1px 0 var(--edge-lit)",
				plate: "0 1.25rem 3.5rem rgba(0, 0, 0, 0.6)",
				lit: "0 0 0 1px var(--edge-lit), 0 0 2.5rem color-mix(in srgb, var(--action) 22%, transparent)",
			},
			transitionTimingFunction: {
				press: "cubic-bezier(0.16, 1, 0.3, 1)",
			},
		},
	},
	plugins: [],
};
