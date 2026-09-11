"use client";

/**
 * The hall: its surfaces, and the light in them.
 *
 * Seen from the side, so there is no front wall — the camera stands outside the
 * section and looks in. There is no back wall either, and that is the same decision
 * twice: the studio's name painted across the CSS backdrop *is* the far wall, so the
 * rack and the loaded bar are geometry standing in front of paint rather than a
 * picture of depth. What the back of the hall does have is a clerestory band, high up,
 * which is what real halls have and what lets the hour rake across the floor.
 *
 * Every colour comes from the owner's own tokens, so the room is lit in their palette
 * and not in one chosen here. Everything is boxes, cylinders and lathes; there is not
 * an image file on this page.
 */

import { HALL, stationX } from "@/lib/gym/route.mjs";

const END = HALL.runway + 2;
const LENGTH = HALL.span + END * 2;
const MID = HALL.x0 + HALL.span / 2;
const BACK = -5.4;
const FRONT = 4.2;
const DEPTH = FRONT - BACK;
const CENTRE = (BACK + FRONT) / 2;
const CEIL = 3.6;

/** The shell, for anything that has to stand inside it. */
export const ROOM = { back: BACK, front: FRONT, ceil: CEIL, mid: MID, length: LENGTH };

/** The mirror wall at CLASSES, and the plane the reflected copy of him folds across. */
export const MIRROR = { x: stationX(2), z: BACK + 0.55, width: 4.4, height: 2.5 };

export function slab(THREE, w, h, d, material, x = 0, y = 0, z = 0) {
	const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
	mesh.position.set(x, y, z);
	return mesh;
}

export function rod(THREE, radius, height, material, x = 0, y = 0, z = 0) {
	const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), material);
	mesh.position.set(x, y, z);
	return mesh;
}

/**
 * The owner's palette, as the room sees it. Only the plain-hex tokens are read: the
 * derived ones are `color-mix()` expressions, which are a browser's business and not a
 * colour three.js can parse.
 */
export function palette(THREE) {
	const style = getComputedStyle(document.documentElement);
	const read = (name, fallback) => {
		const value = style.getPropertyValue(name).trim();
		try {
			return new THREE.Color(value || fallback);
		} catch {
			return new THREE.Color(fallback);
		}
	};
	return {
		board: read("--board", "#0b0b0b"),
		tile: read("--tile", "#ffffff"),
		action: read("--action", "#00b3a4"),
		accent: read("--accent", "#ff3b3b"),
		rail: read("--rail", "#007a73"),
	};
}

/** Roughness and metalness over that palette. No maps, so nothing to download. */
export function materials(THREE, tone) {
	const std = (options) => new THREE.MeshStandardMaterial(options);
	const lift = (colour, amount) => tone.board.clone().lerp(new THREE.Color(colour), amount);
	return {
		floor: std({ color: lift("#43434a", 0.52), roughness: 0.72, metalness: 0.1 }),
		wall: std({ color: lift("#2c2e33", 0.4), roughness: 0.95, metalness: 0.02 }),
		steel: std({ color: "#32363c", roughness: 0.33, metalness: 0.95 }),
		dark: std({ color: "#15161b", roughness: 0.84, metalness: 0.14 }),
		rubber: std({ color: "#0c0d0f", roughness: 0.97, metalness: 0 }),
		paint: std({ color: tone.rail, roughness: 0.5, metalness: 0.24 }),
		pad: std({ color: "#1c1e24", roughness: 0.9, metalness: 0.04 }),
		linen: std({ color: tone.tile, roughness: 0.92, metalness: 0 }),
		glass: std({ color: tone.tile, roughness: 0.07, metalness: 0.5, transparent: true, opacity: 0.2 }),
		// Steam on the inside of a door: opaque enough to lose what is behind it, not so
		// opaque that the room beyond stops being a room.
		fog: std({ color: tone.tile, roughness: 0.98, metalness: 0, transparent: true, opacity: 0.52 }),
		mirror: std({ color: "#949da3", roughness: 0.035, metalness: 1 }),
		crowd: std({ color: "#0f1013", roughness: 0.98, metalness: 0 }),
		skin: std({ color: tone.tile.clone().lerp(new THREE.Color("#8d8f96"), 0.42), roughness: 0.62, metalness: 0.05 }),
		// What he is wearing. He is the one moving thing in the hall, so he is the one
		// thing wearing the studio's own two colours: --action on the shorts, --accent on
		// the shoes. At this size that is most of what makes him read as a person at all.
		shirt: std({ color: "#22252c", roughness: 0.74, metalness: 0.03 }),
		shorts: std({ color: tone.action, roughness: 0.6, metalness: 0.06 }),
		shoe: std({ color: tone.accent, roughness: 0.5, metalness: 0.1 }),
		strip: std({ color: "#05070a", emissive: tone.action, emissiveIntensity: 1, roughness: 0.45 }),
		pane: std({ color: "#05070a", emissive: "#ffffff", emissiveIntensity: 1, roughness: 0.6, side: THREE.DoubleSide }),
		sodium: std({ color: "#0a0806", emissive: "#ffb347", emissiveIntensity: 1, roughness: 0.5 }),
	};
}

export function buildHall(THREE, mat) {
	const group = new THREE.Group();

	// Floor, and the walking line inlaid down it — the one graphic in the room, and it
	// is the line he actually walks, not a decoration of one.
	group.add(slab(THREE, LENGTH, 0.3, DEPTH, mat.floor, MID, -0.15, CENTRE));
	group.add(slab(THREE, LENGTH - 1, 0.02, 1.15, mat.paint, MID, 0.005, 0.5));

	// Ceiling, and one strip light the length of the hall. The strip is the site's own
	// --action: the light overhead and the light on the buttons are one colour.
	group.add(slab(THREE, LENGTH, 0.3, DEPTH, mat.dark, MID, CEIL + 0.15, CENTRE));
	const strip = slab(THREE, LENGTH - 3, 0.1, 0.36, mat.strip, MID, CEIL - 0.22, -0.4);
	group.add(strip, slab(THREE, LENGTH - 3, 0.16, 0.6, mat.dark, MID, CEIL - 0.1, -0.4));

	/*
	 * The clerestory: a glazed band along the back, above the sightline to the painted
	 * wall. One pane, its own emission driven by the hour, with mullions in front of it
	 * so the light is broken into bays rather than being a lit rectangle.
	 */
	const pane = new THREE.Mesh(new THREE.PlaneGeometry(LENGTH - 6, 0.9, Math.round(LENGTH - 6), 2), mat.pane);
	pane.position.set(MID, CEIL - 0.75, BACK + 0.05);
	group.add(pane);
	group.add(slab(THREE, LENGTH - 5.6, 0.14, 0.3, mat.dark, MID, CEIL - 0.28, BACK + 0.1));
	group.add(slab(THREE, LENGTH - 5.6, 0.14, 0.3, mat.dark, MID, CEIL - 1.24, BACK + 0.1));
	for (let bay = 0; bay <= HALL.stations * 2; bay += 1) {
		const x = HALL.x0 - END + 3 + ((LENGTH - 6) * bay) / (HALL.stations * 2);
		group.add(slab(THREE, 0.1, 0.9, 0.14, mat.dark, x, CEIL - 0.75, BACK + 0.12));
	}

	// End walls. The left one is the street door, so it is three boxes and a hole rather
	// than one box: a jamb behind, a pier in front, a lintel over the top.
	const door = { from: 1, to: 2.35, head: 2.25, x: HALL.x0 - END + 0.2 };
	group.add(slab(THREE, 0.4, CEIL, door.from - BACK, mat.wall, door.x, CEIL / 2, (BACK + door.from) / 2));
	group.add(slab(THREE, 0.4, CEIL, FRONT - door.to, mat.wall, door.x, CEIL / 2, (door.to + FRONT) / 2));
	group.add(
		slab(THREE, 0.4, CEIL - door.head, door.to - door.from, mat.wall, door.x, (CEIL + door.head) / 2, (door.from + door.to) / 2),
	);
	group.add(slab(THREE, 0.4, CEIL, DEPTH, mat.wall, HALL.x0 + HALL.span + END - 0.2, CEIL / 2, CENTRE));

	/*
	 * The roller shutter. Slats hang from the drum, and the whole curtain scales out of
	 * it: this is the one piece of the room the hours table moves directly, so at 03:00
	 * the visitor is looking at a shut studio and the page says when it opens.
	 */
	const curtain = new THREE.Group();
	curtain.position.set(door.x, door.head, (door.from + door.to) / 2);
	const slats = Math.round(door.head / 0.13);
	for (let i = 0; i < slats; i += 1) {
		curtain.add(slab(THREE, 0.14, 0.115, door.to - door.from - 0.06, mat.steel, 0, -(i + 0.5) * 0.13, 0));
	}
	group.add(curtain);
	const drum = rod(THREE, 0.19, door.to - door.from + 0.24, mat.dark, door.x, door.head + 0.2, (door.from + door.to) / 2);
	drum.rotation.x = Math.PI / 2;
	group.add(drum);

	/*
	 * The mirror at CLASSES. A recess with a frame in front of it, and him copied into
	 * it folded across the glass — so the wall's own geometry crops the reflection at the
	 * frame, with no render target and no clipping plane. The recess runs back further
	 * than it looks: a mirror image stands as far behind the glass as he is in front of
	 * it, and the frame is what stops anyone seeing the tunnel that holds it.
	 */
	const jamb = 0.16;
	for (const [w, h, y, z] of [
		[MIRROR.width + jamb * 2, jamb, MIRROR.height / 2 + 0.2 + jamb / 2, 0.16],
		[MIRROR.width + jamb * 2, jamb, 0.2 - jamb / 2, 0.16],
	]) {
		group.add(slab(THREE, w, h, 0.2, mat.dark, MIRROR.x, y, MIRROR.z + z));
	}
	for (const side of [-1, 1]) {
		group.add(
			slab(THREE, jamb, MIRROR.height, MIRROR.height / 2, mat.dark, MIRROR.x + side * (MIRROR.width + jamb) / 2, MIRROR.height / 2 + 0.2, MIRROR.z + 0.16),
		);
		group.add(slab(THREE, 0.1, MIRROR.height, 7, mat.dark, MIRROR.x + side * MIRROR.width / 2, MIRROR.height / 2 + 0.2, MIRROR.z - 3.4));
	}
	group.add(slab(THREE, MIRROR.width, 0.1, 7, mat.dark, MIRROR.x, 0.2, MIRROR.z - 3.4));
	group.add(slab(THREE, MIRROR.width, 0.1, 7, mat.dark, MIRROR.x, MIRROR.height + 0.2, MIRROR.z - 3.4));
	const glass = new THREE.Mesh(new THREE.PlaneGeometry(MIRROR.width, MIRROR.height), mat.glass);
	glass.position.set(MIRROR.x, MIRROR.height / 2 + 0.2, MIRROR.z + 0.04);
	group.add(glass);

	/*
	 * The sodium lamp over the desk. Every other light in here is the studio's own
	 * --action; this one is the warm street-lit corner where the money is talked about,
	 * and it is the only light that stays on when the hall itself has gone dim.
	 */
	const deskX = stationX(4);
	const shade = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.32, 16, 1, true), mat.dark);
	shade.position.set(deskX, CEIL - 0.95, 0.3);
	shade.rotation.x = Math.PI;
	shade.material.side = THREE.DoubleSide;
	group.add(shade, rod(THREE, 0.02, 0.6, mat.dark, deskX, CEIL - 0.5, 0.3));
	const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat.sodium);
	bulb.position.set(deskX, CEIL - 1.06, 0.3);
	group.add(bulb);

	/*
	 * The light. Four things, and the hour moves all of them: the fill, the strip
	 * overhead, the sun coming in through the clerestory, and the sodium lamp. There are
	 * no shadow maps — his shadow is a quad the actor scene draws, which costs one
	 * texture instead of a depth pass per frame.
	 */
	const ambient = new THREE.AmbientLight(mat.floor.color, 1);
	group.add(ambient);

	const lamps = [];
	for (let i = 0; i < HALL.stations; i += 1) {
		const lamp = new THREE.PointLight(mat.strip.emissive, 1, 16, 2);
		lamp.position.set(stationX(i), CEIL - 0.5, -0.4);
		group.add(lamp);
		lamps.push(lamp);
	}

	const sodiumLight = new THREE.PointLight("#ffb347", 1, 9, 2);
	sodiumLight.position.set(deskX, CEIL - 1.2, 0.3);
	group.add(sodiumLight);

	// Placed behind and above the clerestory, so raising it rakes the band's light down
	// the floor the way the hour actually does.
	const sun = new THREE.DirectionalLight("#ffffff", 1);
	sun.target.position.set(MID, 0.2, 1.4);
	group.add(sun, sun.target);

	/**
	 * The hour, applied. Called once at setup and again whenever the clock crosses into
	 * another phase — not per frame, because nothing in here moves on its own.
	 */
	function apply(state) {
		const light = state.light;
		ambient.color.copy(mat.floor.color).lerp(new THREE.Color(light.sun.color), 0.35);
		ambient.intensity = light.ambient * 3.4;

		mat.strip.emissiveIntensity = light.strip * 0.8;
		for (const lamp of lamps) lamp.intensity = light.strip * 2;

		sun.color.set(light.sun.color);
		sun.intensity = light.sun.intensity * 2.4;
		sun.position.set(MID - 10, 1 + Math.max(0.04, light.sun.elevation) * 20, BACK - 16);

		// The window is lit by the same sun it lets in, so a red dawn arrives as a red band
		// rather than as a white one with red light under it.
		mat.pane.emissive.set(light.sun.color);
		mat.pane.emissiveIntensity = 0.1 + light.sun.intensity * 0.6;

		mat.sodium.emissiveIntensity = light.sodium * 2.8;
		sodiumLight.intensity = light.sodium * 7;

		// Never exactly zero: a curtain scaled flat has no normals worth shading.
		curtain.scale.y = Math.max(0.0015, state.shutter);
	}

	return { group, apply };
}
