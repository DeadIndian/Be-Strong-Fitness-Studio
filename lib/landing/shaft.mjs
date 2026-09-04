/**
 * The building's geometry, as arithmetic. Pure — no DOM, no three.js — so
 * `node --test` can hold the invariant the whole landing page rests on.
 *
 * One constant maps the page to the world: `world y = -k * page y`. Because that map
 * is linear and every slab sits at the same depth from the camera, a slab placed at a
 * floor's world y projects onto that floor's CSS hairline at every scroll position and
 * every window size. The floors are not tuned to line up; they cannot fail to.
 */

/** Must match the camera in building.js, which inherited it from rig.js. */
export const FOV = 32;

/** A 1.75 m man in rig.js units, where 1 unit = 500 mm. */
const MAN_H = 3.5;

/** The two aspects the figure's on-screen share is quoted at. */
const NARROW = { aspect: 0.45, share: 0.35 };
const WIDE = { aspect: 1.6, share: 0.58 };

/**
 * How big he is, and therefore how big the building is. He holds a fixed share of the
 * viewport, `k` follows from that share, and the camera distance follows from `k`: it is
 * exactly the distance at which one world unit projects to `1/k` pixels. One viewport of
 * scroll is then one storey of building.
 */
export function scaleFor({ width, height }, manHeight = MAN_H) {
	const span = WIDE.aspect - NARROW.aspect;
	const t = Math.min(1, Math.max(0, (width / height - NARROW.aspect) / span));
	const share = NARROW.share + (WIDE.share - NARROW.share) * t;
	const k = manHeight / (share * height);
	const dist = (k * height) / (2 * Math.tan((FOV * Math.PI) / 360));
	return { k, dist, share };
}

/*
 * A fall runs while the slab he is standing on travels from three quarters of the way
 * down the frame to a quarter of the way down it — half a viewport of scroll. Both
 * hairlines are on screen for all of it, so the drop reads as exactly one storey.
 */
const LEAD = 0.72;
const TRAIL = 0.28;

/** Which floor the reader is on: the first whose slab is below the viewport centre. */
export function floorAt(knots, scrollY, height) {
	const centre = scrollY + height / 2;
	for (let index = 0; index < knots.length; index += 1) {
		if (centre < knots[index]) return index;
	}
	return knots.length - 1;
}

/**
 * The fall in progress, if any. `t` comes off live scroll rather than a clock, which is
 * what makes dragging the scrollbar back up un-fall him instead of replaying a canned
 * animation. The last floor has no fall: there is no storey under it.
 */
export function fallAt(knots, scrollY, height) {
	for (let index = 0; index < knots.length - 1; index += 1) {
		const from = knots[index] - LEAD * height;
		const to = knots[index] - TRAIL * height;
		if (to <= from) continue;
		if (scrollY >= from && scrollY < to) return { index, t: (scrollY - from) / (to - from) };
	}
	return null;
}

/**
 * The corridor: how far each letter of a heading steps aside for him. Signed by which
 * side of him it sits on, falling off linearly with distance, zero beyond `reach`.
 *
 * Then the guard that only ever matters on a phone: at 360px a heading has barely more
 * width than the word, so an unscaled push shoves the outermost letter off the edge of
 * the screen. Every push is scaled by the least slack any pushed letter actually has, so
 * the line opens as far as it can and no further.
 */
export function pushes(letters, manX, reach, bounds) {
	const raw = letters.map(({ x, w }) => {
		const gap = Math.abs(x + w / 2 - manX);
		if (gap >= reach) return 0;
		return (x + w / 2 < manX ? -1 : 1) * (reach - gap);
	});

	let factor = 1;
	for (let index = 0; index < raw.length; index += 1) {
		const push = raw[index];
		if (!push) continue;
		const { x, w } = letters[index];
		const room = push < 0 ? x - bounds.left : bounds.right - (x + w);
		if (room <= 0) return raw.map(() => 0);
		factor = Math.min(factor, room / Math.abs(push));
	}

	return factor >= 1 ? raw : raw.map((push) => push * factor);
}
