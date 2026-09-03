"use client";

/**
 * One loaded bar, lit in one room, behind the whole landing page.
 *
 * The scroll position is the camera operator: a single route past the steel,
 * with one stop per section of the page. Nothing here is decoration — the bar is
 * bare steel, the plates are black rubber bumpers carrying each plan's colour on
 * their insert ring, and the two lights are the owner's own palette.
 *
 * Mounted only by rig-stage.js, which checks WebGL and reduced motion first,
 * so neither this module nor three reaches a visitor who cannot use it.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { plateColor } from "@/lib/site/defaults";

const TAU = Math.PI * 2;

/*
 * A real 20kg bar, measured, in units of 500mm: 2200mm long, 29mm shaft, 50mm
 * sleeves 415mm long, and competition bumpers that are all 450mm across —
 * weight changes their thickness, never their diameter, which is the detail
 * that separates a barbell from five discs on a rod.
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

/** 0 where the page starts, 1 at its last scrollable pixel. */
function readProgress(element) {
	const rect = element.getBoundingClientRect();
	const span = rect.height - window.innerHeight;
	if (span <= 0) return rect.top <= 0 ? 1 : 0;
	return Math.min(1, Math.max(0, -rect.top / span));
}

/**
 * The route past the bar: one stop per section, in scroll order. `tilt.z` near
 * 1.57 lays the bar flat across the frame, near 0 stands it up in the rack.
 * Between two stops every channel is a smoothstepped lerp, so the entire
 * choreography is this table and nothing else. Every stop is far enough out that
 * the whole loaded bar reads — a macro close-up of knurl on a near-black page is
 * indistinguishable from an empty page.
 */
const STOPS = [
	{ at: 0, cam: [1.6, 0.8, 6.8], look: [0, 0, 0], tilt: [0.12, -0.34, 1.46] },
	{ at: 0.16, cam: [-2.6, 0.36, 5.5], look: [0, 0, 0], tilt: [0.1, 0.42, 1.3] },
	{ at: 0.33, cam: [3.5, -1.2, 4.8], look: [0, 0.14, 0], tilt: [0.16, -0.62, 0.86] },
	{ at: 0.5, cam: [0.36, 2, 5.9], look: [0, 0, 0], tilt: [0.08, 0.22, 0.22] },
	{ at: 0.66, cam: [-3.9, -0.65, 5.05], look: [0, 0, 0], tilt: [0.2, -0.52, 0.62] },
	{ at: 0.83, cam: [2.25, 1.22, 7.65], look: [0, 0, 0], tilt: [0.06, -0.3, 1.42] },
	{ at: 1, cam: [0, 0.3, 9.9], look: [0, 0, 0], tilt: [0.03, -0.06, 1.55] },
];

function smooth(t) {
	return t * t * (3 - 2 * t);
}

function sample(progress, out) {
	let index = 0;
	while (index < STOPS.length - 2 && progress > STOPS[index + 1].at) index += 1;
	const from = STOPS[index];
	const to = STOPS[index + 1];
	const t = smooth(Math.min(1, Math.max(0, (progress - from.at) / (to.at - from.at))));
	for (let axis = 0; axis < 3; axis += 1) {
		out.cam[axis] = from.cam[axis] + (to.cam[axis] - from.cam[axis]) * t;
		out.look[axis] = from.look[axis] + (to.look[axis] - from.look[axis]) * t;
		out.tilt[axis] = from.tilt[axis] + (to.tilt[axis] - from.tilt[axis]) * t;
	}
	return out;
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
 * One knurl map per band length, so the diamonds come out square instead of
 * stretched: the circumference is fixed, the band is not.
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
 * The room the steel has to reflect. Chrome with nothing around it renders as a
 * black rod, so this gradient — dark ceiling, the gym's own hard white fixture,
 * a strip in the owner's primary, a kicker in their accent, and a floor bounce —
 * is what makes the bar read as metal at all. It costs one canvas and no request.
 */
function roomEnvironment(renderer, action, accent) {
	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 256;
	const ctx = canvas.getContext("2d");
	const wall = ctx.createLinearGradient(0, 0, 0, 256);
	wall.addColorStop(0, "#242424");
	wall.addColorStop(0.42, "#0c0c0c");
	wall.addColorStop(1, "#000000");
	ctx.fillStyle = wall;
	ctx.fillRect(0, 0, 512, 256);
	// The long hard highlight every polished sleeve is read by.
	ctx.fillStyle = "#fff6ea";
	ctx.fillRect(0, 16, 512, 13);
	ctx.globalAlpha = 0.85;
	ctx.fillStyle = action;
	ctx.fillRect(0, 52, 512, 9);
	ctx.globalAlpha = 0.5;
	ctx.fillStyle = accent;
	ctx.fillRect(296, 184, 192, 22);
	ctx.globalAlpha = 0.32;
	ctx.fillStyle = "#4a4a4a";
	ctx.fillRect(0, 226, 512, 30);
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

function token(name, fallback) {
	const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return value || fallback;
}

export default function Rig({ plates = [5, 10, 15, 20, 25], scrollTarget, still = false, onReady }) {
	const hostRef = useRef(null);
	const latest = useRef({ plates, onReady });
	// Rebuilt only when the plate values actually change, not on every render.
	const platesKey = plates.join("|");

	useEffect(() => {
		latest.current = { plates, onReady };
	});

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return undefined;
		const plateList = latest.current.plates;
		const announce = () => latest.current.onReady?.();

		const narrow = window.matchMedia("(max-width: 768px)").matches;
		const action = token("--action", "#00b3a4");
		const accent = token("--accent", "#ff3b3b");
		const ground = token("--board", "#0b0b0b");

		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: !narrow,
			powerPreference: "high-performance",
		});
		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.6 : 2));
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.08;
		renderer.shadowMap.enabled = !narrow;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		host.appendChild(renderer.domElement);
		renderer.domElement.style.display = "block";
		renderer.domElement.style.width = "100%";
		renderer.domElement.style.height = "100%";

		const scene = new THREE.Scene();
		// The far end of the bar falls off into the page's own ground colour, so
		// the room has depth without a single gradient being drawn in CSS.
		scene.fog = new THREE.Fog(new THREE.Color(ground), 5, 22);
		scene.environment = roomEnvironment(renderer, action, accent);

		const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 90);

		// rig (the bar's attitude) -> spin (roll about its own axis)
		const rig = new THREE.Group();
		const spin = new THREE.Group();
		rig.add(spin);
		scene.add(rig);

		const disposables = [scene.environment];
		const track = (item) => {
			disposables.push(item);
			return item;
		};

		const knurlSource = knurlCanvas();
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

		const ring = narrow ? 22 : 44;
		const lathe = (points, segments = ring) =>
			track(
				new THREE.LatheGeometry(
					points.map(([x, y]) => new THREE.Vector2(x, y)),
					segments,
				),
			);

		const shaft = new THREE.Mesh(
			track(new THREE.CylinderGeometry(SHAFT_R, SHAFT_R, SHAFT_HALF * 2 + 0.04, ring)),
			steel,
		);
		shaft.castShadow = !narrow;
		spin.add(shaft);

		// The grip: a hair proud of the shaft, so the knurl catches the light on its
		// own edge the way a machined band does.
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
			spin.add(band);
			if (from > 0) {
				const mirror = band.clone();
				mirror.position.y = -band.position.y;
				spin.add(mirror);
			}
		}

		/*
		 * One sleeve, turned as a profile rather than stacked cylinders: the snap-ring
		 * shoulder, the step out to 50mm, three machined grooves, a chamfer and a
		 * closed end. The far side is the same geometry rotated through the shaft, so
		 * the winding — and therefore the lighting — stays correct.
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
			spin.add(mesh);
		}

		/*
		 * Heaviest inboard, the way a bar is actually loaded, and loaded from the
		 * first frame: the visitor lands on a finished object, not on one that
		 * assembles itself. Black rubber bumpers over a chrome bore, all 450mm
		 * across — the plan's own colour survives only as the insert ring at the
		 * hub, which is where a real bumper carries it.
		 */
		let offset = SHAFT_HALF + 0.05;
		// One hub ring per term, kept in loading order so they can light in it.
		const marks = [];
		for (const kg of [...plateList].sort((a, b) => b - a)) {
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
			const bore = track(
				new THREE.CylinderGeometry(HUB_R, HUB_R, half * 2.02, ring, 1, true),
			);
			const insert = track(
				new THREE.CylinderGeometry(HUB_R + 0.026, HUB_R + 0.026, half * 1.46, ring, 1, true),
			);
			const mark = track(
				new THREE.MeshStandardMaterial({
					color: new THREE.Color(plateColor(kg)),
					// Lit by the scroll, not by the room: see `apply`.
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
				spin.add(plate);

				const ringMark = new THREE.Mesh(insert, mark);
				ringMark.position.y = sign * centre;
				spin.add(ringMark);

				const liner = new THREE.Mesh(bore, chrome);
				liner.position.y = sign * centre;
				spin.add(liner);
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
			spin.add(mesh);
		}

		// Three lights, and they are the theme: the hard white strip overhead that
		// the gym actually has, the owner's primary raking in from behind as a rim,
		// their accent as a low kicker. Change the palette in the admin panel and
		// the light in this room changes with it.
		const key = new THREE.DirectionalLight(0xfff3e4, 2.4);
		key.position.set(-4, 7.5, 5);
		key.castShadow = !narrow;
		if (!narrow) {
			key.shadow.mapSize.set(1024, 1024);
			key.shadow.camera.left = -6;
			key.shadow.camera.right = 6;
			key.shadow.camera.top = 6;
			key.shadow.camera.bottom = -6;
			key.shadow.camera.far = 30;
			key.shadow.bias = -0.0012;
		}
		scene.add(key);

		const rim = new THREE.DirectionalLight(new THREE.Color(action), 2.1);
		rim.position.set(3.5, 1.5, -6);
		scene.add(rim);

		const kicker = new THREE.DirectionalLight(new THREE.Color(accent), 0.75);
		kicker.position.set(5, -3.5, 2);
		scene.add(kicker);

		scene.add(new THREE.AmbientLight(0xffffff, 0.22));

		// The floor, only to catch the bar's shadow. Nothing else needs it.
		if (!narrow) {
			const floor = new THREE.Mesh(
				track(new THREE.PlaneGeometry(70, 70)),
				track(new THREE.ShadowMaterial({ opacity: 0.55 })),
			);
			floor.rotation.x = -Math.PI / 2;
			// Just clear of the bar stood on end (2.14 units), so the shadow lands close
			// enough to read as contact rather than as a smudge on a distant plane.
			floor.position.y = -2.4;
			floor.receiveShadow = true;
			scene.add(floor);
		}

		let viewport = { width: 0, height: 0 };
		const resize = () => {
			const width = Math.max(1, window.innerWidth);
			const height = Math.max(1, window.innerHeight);
			// A mobile address bar sliding away is not a resize: re-rendering the
			// whole scene for 60px of chrome is how a scroll starts stuttering.
			if (width === viewport.width && Math.abs(height - viewport.height) < 80) return false;
			viewport = { width, height };
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			return true;
		};
		resize();

		const state = { cam: [0, 0, 0], look: [0, 0, 0], tilt: [0, 0, 0] };
		const eye = new THREE.Vector3();
		const focus = new THREE.Vector3();
		// The bar never stops turning, so the first viewport is a live object even
		// before the visitor scrolls; the scroll adds its own spin on top.
		let idle = 0;

		const apply = (progress) => {
			sample(progress, state);
			// The bar loads up as the rates are read: one hub ring lights per term,
			// heaviest first, and each stays lit. By the foot of the page the whole
			// load is on and every colour in the price list is accounted for.
			const loaded = ((progress - 0.06) / 0.32) * marks.length;
			for (let index = 0; index < marks.length; index += 1) {
				marks[index].emissiveIntensity = Math.min(1, Math.max(0, loaded - index)) * 0.85;
			}
			// One rule frames the bar in any window: pull the camera back along its
			// own sight line until the loaded bar fits the narrower field of view, and
			// lean it toward the diagonal by however much that pull-back was needed.
			// A phone in portrait therefore gets the whole bar on a diagonal, never a
			// splinter and never a bar running off both edges.
			const fit = Math.max(1, 1.11 / camera.aspect);
			const lean = -0.45 * Math.min(1, fit - 1);
			focus.fromArray(state.look);
			eye.fromArray(state.cam).sub(focus).multiplyScalar(fit).add(focus);
			camera.position.copy(eye);
			camera.lookAt(focus);
			rig.rotation.set(state.tilt[0], state.tilt[1], state.tilt[2] + lean);
			spin.rotation.y = idle + progress * TAU * 1.6;
			renderer.render(scene, camera);
		};

		const dispose = () => {
			renderer.domElement.remove();
			renderer.dispose();
			for (const item of disposables) item.dispose();
		};

		if (still) {
			// Reduced motion: one drafted frame of the whole loaded bar, no listener.
			apply(0);
			announce();
			const onResize = () => {
				if (resize()) apply(0);
			};
			window.addEventListener("resize", onResize);
			return () => {
				window.removeEventListener("resize", onResize);
				dispose();
			};
		}

		const target = scrollTarget?.current ?? document.documentElement;
		let frame = 0;
		let previous = 0;

		// One loop, running while the tab is visible: it turns the bar at its own
		// rate and reads the scroll each frame, so there is no scroll listener and
		// no difference between "the visitor scrolled" and "the visitor is reading".
		const tick = (now) => {
			frame = requestAnimationFrame(tick);
			const elapsed = previous ? Math.min(64, now - previous) : 16;
			previous = now;
			idle += elapsed * 0.00022;
			resize();
			apply(readProgress(target));
		};

		const start = () => {
			if (!frame) {
				previous = 0;
				frame = requestAnimationFrame(tick);
			}
		};
		const stop = () => {
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
		};
		const onVisibility = () => (document.hidden ? stop() : start());

		apply(readProgress(target));
		announce();
		start();
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			document.removeEventListener("visibilitychange", onVisibility);
			stop();
			dispose();
		};
	}, [platesKey, scrollTarget, still]);

	return <div ref={hostRef} aria-hidden="true" className="h-full w-full" />;
}
