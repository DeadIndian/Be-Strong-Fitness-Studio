"use client";

/**
 * Everything the building is made of except the man: the room the steel reflects, the
 * materials, the hero barbell (moved intact from the old single-bar rig) and the three
 * station props.
 *
 * A station is the fewest turned forms that name the machine. The bar keeps its higher
 * fidelity because it is the hero object and the only thing seen close.
 *
 * Axes throughout: he faces +x with the camera toward +z, so his lateral axis is z. A
 * barbell spans his hands and therefore lies along z; a treadmill runs along x.
 */

import * as THREE from "three";
import { plateColor } from "@/lib/site/defaults";

const TAU = Math.PI * 2;

/*
 * A real 20kg bar, measured, in units of 500mm: 2200mm long, 29mm shaft, 50mm sleeves
 * 415mm long, and competition bumpers that are all 450mm across — weight changes their
 * thickness, never their diameter, which is the detail that separates a barbell from
 * five discs on a rod.
 */
const SHAFT_R = 0.029;
const SHAFT_HALF = 1.31;
const SLEEVE_R = 0.05;
const SLEEVE_END = 2.14;
const PLATE_R = 0.45;
const HUB_R = 0.062;

/** Where the hands and the back go: knurl lives only here, as on the real bar. */
const GRIP = [
	[0.49, 1.29],
	[-0.12, 0.12],
];

/** Half the thickness of a competition bumper, from its weight. */
function plateHalf(kg) {
	return (2.2 * Math.min(kg, 25) + 11) / 1000;
}

/** A CSS custom property, read live, so the owner's palette lights this scene. */
export function token(name, fallback) {
	const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return value || fallback;
}

/** The knurl: a diamond cross-hatch, drawn once, read as grip by the bump map. */
function knurlCanvas() {
	const canvas = document.createElement("canvas");
	canvas.width = 128;
	canvas.height = 128;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#808080";
	ctx.fillRect(0, 0, 128, 128);
	ctx.lineWidth = 2;
	for (const [direction, shade] of [
		[1, "#f2f2f2"],
		[-1, "#0d0d0d"],
	]) {
		ctx.strokeStyle = shade;
		for (let x = -128; x < 256; x += 9) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x + direction * 128, 128);
			ctx.stroke();
		}
	}
	return canvas;
}

/**
 * One knurl map per band length, so the diamonds come out square instead of stretched:
 * the circumference is fixed, the band is not.
 */
function knurlFor(canvas, length) {
	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(4, Math.max(1, Math.round((4 * length) / (TAU * SHAFT_R))));
	return texture;
}

/** Moulded rubber, not plastic: fine speckle so the plate faces are not glass. */
function speckleTexture() {
	const canvas = document.createElement("canvas");
	canvas.width = 128;
	canvas.height = 128;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#808080";
	ctx.fillRect(0, 0, 128, 128);
	for (let index = 0; index < 7000; index += 1) {
		ctx.fillStyle = index % 2 ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
		ctx.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
	}
	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(5, 5);
	return texture;
}

/**
 * The room the steel has to reflect. Chrome with nothing around it renders as a black
 * rod, so this gradient — dark ceiling, the gym's own hard white fixture, a strip in the
 * owner's primary, a kicker in their accent, and a floor bounce — is what makes the bar
 * read as metal at all. It costs one canvas and no request.
 */
export function roomEnvironment(renderer, action, accent) {
	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 256;
	const ctx = canvas.getContext("2d");
	const wall = ctx.createLinearGradient(0, 0, 0, 256);
	wall.addColorStop(0, "#3c3c3c");
	wall.addColorStop(0.42, "#141414");
	wall.addColorStop(1, "#000000");
	ctx.fillStyle = wall;
	ctx.fillRect(0, 0, 512, 256);
	// The long hard highlight every polished sleeve is read by.
	ctx.fillStyle = "#fff6ea";
	ctx.fillRect(0, 14, 512, 17);
	ctx.globalAlpha = 0.9;
	ctx.fillStyle = action;
	ctx.fillRect(0, 52, 512, 11);
	ctx.globalAlpha = 0.5;
	ctx.fillStyle = accent;
	ctx.fillRect(296, 184, 192, 22);
	/*
	 * The floor bounce. Half-metal lit only from the ceiling goes black on every
	 * downward face — a thigh, a forearm, the underside of a jaw — so this band is what
	 * keeps him modelled from below rather than cut off at the horizon.
	 */
	ctx.globalAlpha = 0.42;
	ctx.fillStyle = "#5e5e5e";
	ctx.fillRect(0, 216, 512, 40);
	ctx.globalAlpha = 1;
	const equirect = new THREE.CanvasTexture(canvas);
	equirect.mapping = THREE.EquirectangularReflectionMapping;
	equirect.colorSpace = THREE.SRGBColorSpace;
	const pmrem = new THREE.PMREMGenerator(renderer);
	const environment = pmrem.fromEquirectangular(equirect).texture;
	pmrem.dispose();
	equirect.dispose();
	return environment;
}

/**
 * Every material in the building, plus the two knobs that geometry needs: `ring`, the
 * segment count a phone can afford, and `lathe`, a tracked turned profile.
 */
export function makeMaterials({ track, narrow }) {
	const speckle = track(speckleTexture());
	// Bare bar steel, not a mirror: a real shaft is satin and reads grey.
	const steel = track(
		new THREE.MeshStandardMaterial({ color: 0xb6bbc2, metalness: 1, roughness: 0.31 }),
	);
	const chrome = track(
		new THREE.MeshStandardMaterial({ color: 0xd7dbe0, metalness: 1, roughness: 0.15 }),
	);
	// One black rubber compound for every plate: the gym's own bumpers.
	const rubber = track(
		new THREE.MeshStandardMaterial({
			color: 0x131313,
			metalness: 0.02,
			roughness: 0.94,
			bumpMap: speckle,
			bumpScale: 0.004,
			side: THREE.DoubleSide,
		}),
	);
	/*
	 * The man. Machined aluminium, not a silhouette: a dark figure on a dark room is a
	 * figure nobody sees, which is exactly what the first build proved. Half-metal at
	 * this roughness gives him a broad soft specular off the fixture overhead and a hard
	 * teal edge off the strip behind, so his outline survives even where his front face
	 * falls to the same value as the wall.
	 */
	const matte = track(
		new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.55, roughness: 0.36 }),
	);
	const ring = narrow ? 22 : 44;
	const lathe = (points, segments = ring) =>
		track(
			new THREE.LatheGeometry(
				points.map(([x, y]) => new THREE.Vector2(x, y)),
				segments,
			),
		);
	return { steel, chrome, rubber, matte, ring, lathe, knurlSource: knurlCanvas() };
}

/**
 * The loaded bar. Turned along its own +y as the old rig built it, then the whole group
 * is tipped onto z — his lateral axis — so it spans his hands instead of pointing at the
 * camera. Returns the hub-ring materials too: `building.js` lights one per rate.
 */
export function barbell({ plates = [5, 10, 15, 20, 25], mats, track, narrow = false }) {
	const { steel, chrome, rubber, ring, lathe, knurlSource } = mats;
	const group = new THREE.Group();
	// +y becomes +z: the bar lies across him.
	group.rotation.x = Math.PI / 2;

	const shaft = new THREE.Mesh(
		track(new THREE.CylinderGeometry(SHAFT_R, SHAFT_R, SHAFT_HALF * 2 + 0.04, ring)),
		steel,
	);
	shaft.castShadow = !narrow;
	group.add(shaft);

	// The grip: a hair proud of the shaft, so the knurl catches the light on its own edge
	// the way a machined band does.
	for (const [from, to] of GRIP) {
		const length = to - from;
		const map = track(knurlFor(knurlSource, length));
		const band = new THREE.Mesh(
			track(new THREE.CylinderGeometry(SHAFT_R * 1.045, SHAFT_R * 1.045, length, ring)),
			track(
				new THREE.MeshStandardMaterial({
					color: 0xacb1b8,
					metalness: 1,
					roughness: 0.44,
					roughnessMap: map,
					bumpMap: map,
					bumpScale: 0.0035,
				}),
			),
		);
		band.position.y = from + length / 2;
		group.add(band);
		if (from > 0) {
			const mirror = band.clone();
			mirror.position.y = -band.position.y;
			group.add(mirror);
		}
	}

	/*
	 * One sleeve, turned as a profile rather than stacked cylinders: the snap-ring
	 * shoulder, the step out to 50mm, three machined grooves, a chamfer and a closed end.
	 * The far side is the same geometry rotated through the shaft, so the winding — and
	 * therefore the lighting — stays correct.
	 */
	const sleeve = lathe([
		[SHAFT_R, SHAFT_HALF - 0.01],
		[0.038, SHAFT_HALF],
		[0.038, SHAFT_HALF + 0.022],
		[SLEEVE_R, SHAFT_HALF + 0.038],
		[SLEEVE_R, 1.94],
		[SLEEVE_R - 0.007, 1.955],
		[SLEEVE_R, 1.97],
		[SLEEVE_R, 2.01],
		[SLEEVE_R - 0.007, 2.025],
		[SLEEVE_R, 2.04],
		[SLEEVE_R, 2.08],
		[SLEEVE_R - 0.007, 2.095],
		[SLEEVE_R, 2.11],
		[SLEEVE_R - 0.014, SLEEVE_END],
		[0, SLEEVE_END],
	]);

	for (const sign of [1, -1]) {
		const mesh = new THREE.Mesh(sleeve, chrome);
		mesh.castShadow = !narrow;
		if (sign < 0) mesh.rotation.z = Math.PI;
		group.add(mesh);
	}

	/*
	 * Heaviest inboard, the way a bar is actually loaded, and loaded from the first frame:
	 * the visitor lands on a finished object, not on one that assembles itself. Black
	 * rubber bumpers over a chrome bore, all 450mm across — the plan's own colour survives
	 * only as the insert ring at the hub, which is where a real bumper carries it.
	 */
	let offset = SHAFT_HALF + 0.05;
	// One hub ring per term, kept in loading order so they can light in it.
	const marks = [];
	for (const kg of [...plates].sort((a, b) => b - a)) {
		const half = plateHalf(kg);
		const bevel = Math.min(0.018, half * 0.5);
		const body = lathe([
			[HUB_R, -half * 0.72],
			[HUB_R + 0.035, -half],
			[PLATE_R - bevel, -half],
			[PLATE_R, -half + bevel],
			[PLATE_R, half - bevel],
			[PLATE_R - bevel, half],
			[HUB_R + 0.035, half],
			[HUB_R, half * 0.72],
		]);
		const bore = track(new THREE.CylinderGeometry(HUB_R, HUB_R, half * 2.02, ring, 1, true));
		const insert = track(
			new THREE.CylinderGeometry(HUB_R + 0.026, HUB_R + 0.026, half * 1.46, ring, 1, true),
		);
		const mark = track(
			new THREE.MeshStandardMaterial({
				color: new THREE.Color(plateColor(kg)),
				// Lit by the rate being read, not by the room: see building.js.
				emissive: new THREE.Color(plateColor(kg)),
				emissiveIntensity: 0,
				metalness: 0.05,
				roughness: 0.55,
				side: THREE.DoubleSide,
			}),
		);
		marks.push(mark);
		const centre = offset + half;
		for (const sign of [1, -1]) {
			const plate = new THREE.Mesh(body, rubber);
			plate.castShadow = !narrow;
			plate.position.y = sign * centre;
			group.add(plate);

			const ringMark = new THREE.Mesh(insert, mark);
			ringMark.position.y = sign * centre;
			group.add(ringMark);

			const liner = new THREE.Mesh(bore, chrome);
			liner.position.y = sign * centre;
			group.add(liner);
		}
		offset += half * 2 + 0.004;
	}

	// The collar that holds the load on: a turned chrome clamp, nothing more.
	const collar = lathe([
		[SLEEVE_R, 0],
		[0.082, 0.008],
		[0.082, 0.03],
		[0.07, 0.038],
		[0.07, 0.062],
		[0.082, 0.07],
		[0.082, 0.092],
		[SLEEVE_R, 0.1],
	]);
	for (const sign of [1, -1]) {
		const mesh = new THREE.Mesh(collar, chrome);
		mesh.castShadow = !narrow;
		mesh.position.y = sign * (offset + 0.006);
		if (sign < 0) mesh.rotation.z = Math.PI;
		group.add(mesh);
	}

	return { group, marks };
}

/**
 * A station: the fewest turned forms that name the machine, with its origin on the floor
 * slab so it can be dropped straight onto a hairline. `stand` is the height he works at —
 * zero on the floor, the belt's top face on the treadmill.
 */
export function station(kind, { mats, track, narrow = false }) {
	const { steel, chrome, rubber, ring } = mats;
	const group = new THREE.Group();
	const box = (w, h, d, material, at) => {
		const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), material);
		mesh.position.set(at[0], at[1], at[2]);
		mesh.castShadow = !narrow;
		group.add(mesh);
		return mesh;
	};

	if (kind === "treadmill") {
		// Runs along x, the way he faces. Belt, two rails, two uprights, a console.
		box(3.0, 0.28, 1.2, steel, [0, 0.14, 0]);
		box(2.9, 0.14, 1.1, rubber, [0, 0.34, 0]);
		for (const sign of [1, -1]) {
			const rail = new THREE.Mesh(
				track(new THREE.CylinderGeometry(0.05, 0.05, 2.6, Math.max(8, ring / 3))),
				chrome,
			);
			rail.rotation.z = Math.PI / 2;
			rail.position.set(0.1, 0.95, sign * 0.62);
			group.add(rail);
			box(0.1, 1.0, 0.1, chrome, [1.3, 0.75, sign * 0.58]);
			box(0.1, 0.62, 0.1, chrome, [-0.9, 0.62, sign * 0.62]);
		}
		box(0.16, 0.52, 1.14, steel, [1.34, 1.45, 0]);
		return { group, stand: 0.41 };
	}

	if (kind === "mirror") {
		// One bright rectangle. It is the whole wall, and it is what makes the room read.
		const glass = track(
			new THREE.MeshStandardMaterial({
				color: 0x1a1c1e,
				metalness: 1,
				roughness: 0.06,
				emissive: 0x0a0f10,
				emissiveIntensity: 0.4,
			}),
		);
		box(4.4, 3.4, 0.06, glass, [0.3, 1.75, -1.5]);
		box(4.4, 0.12, 0.16, chrome, [0.3, 0.06, -1.42]);
		return { group, stand: 0 };
	}

	if (kind === "desk") {
		// The front desk, running along z so he walks up to its face.
		box(1.1, 0.14, 3.0, steel, [0.95, 1.05, 0]);
		box(0.12, 1.0, 2.6, rubber, [1.44, 0.5, 0]);
		return { group, stand: 0 };
	}

	return { group, stand: 0 };
}
