"use client";

/**
 * The rig: the only thing on this page that runs every frame.
 *
 * Two renderers over two canvases, sharing one camera. That is the whole reason the
 * page works: the hall paints under the document and he paints over it, so he walks
 * *across* the words instead of behind them, and one camera means the two layers can
 * never disagree about where anything is.
 *
 * Everything else in here is arithmetic that has already been written down somewhere
 * pure — `route.mjs` for where he is, `body.mjs` for what he looks like, `clock.mjs` for
 * the hour, `flow.mjs` for the hole in the paragraph. This file's job is to read the
 * scroll position, ask those four questions, and write the answers into three.js and the
 * DOM. It reads no layout: `scan.js` measured the page once, and the frame loop only
 * ever writes.
 */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CLIPS, STATION_CLIPS, blendDeltas, blendRoots, bob, breath, resolve, sampleClip } from "@/lib/gym/body.mjs";
import { roomState } from "@/lib/gym/clock.mjs";
import { obstacleFrom } from "@/lib/gym/flow.mjs";
import { CADENCE, HALL, gaitFor, smooth, stationAt, stationX, walkAt } from "@/lib/gym/route.mjs";
import { buildActor, buildCrowd, buildReflection, buildShadow } from "./actor";
import { MIRROR, buildHall, materials, palette } from "./hall";
import { buildKit } from "./kit";
import { createFlows } from "./flowing";
import { observePage, scanPage } from "./scan";

/** He walks down the painted line, and turns most of the way to front to work. */
const LANE = 0.42;
const TURN = 0.62;

/** The camera parks at the middle of the gap, so he crosses the frame rather than the frame following him. */
const CAMERA_HALF_LIFE = 320;
const CAMERA_Z = 10.2;
const FACE_HALF_LIFE = 170;
const HOUR_MS = 60_000;

/**
 * The furthest a row will travel to get out of his way. Generous on purpose — he is about
 * a hundred screen pixels wide and a row has to clear all of him — and bounded so a row
 * cannot be flung off its own station.
 */
const CLEAR_MAX = 300;

/** The bar follows his hands through the pull, keyed to the same clip phase they are. */
const BAR = [
	[0, 0.27],
	[0.3, 0.63],
	[0.48, 0.63],
	[0.78, 0.35],
	[1, 0.27],
];

function curve(table, p) {
	const u = p < 0 ? 0 : p > 1 ? 1 : p;
	for (let i = 1; i < table.length; i += 1) {
		if (u <= table[i][0]) {
			const [p0, v0] = table[i - 1];
			const [p1, v1] = table[i];
			const span = p1 - p0;
			return span > 0 ? v0 + ((u - p0) / span) * (v1 - v0) : v0;
		}
	}
	return table[table.length - 1][1];
}

/**
 * Build everything and start the loop.
 *
 * `onFrame` gets the milliseconds each frame took; the watchdog in `room.js` is what
 * decides whether the page is better off without any of this.
 */
export function createRig({ canvasHall, canvasActor, hours, plans, reduced = false, onFrame = null }) {
	const renderers = [canvasHall, canvasActor].map((canvas) =>
		new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" }),
	);
	const [back, front] = renderers;
	for (const renderer of renderers) {
		renderer.setClearAlpha(0);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.outputColorSpace = THREE.SRGBColorSpace;
	}

	const camera = new THREE.PerspectiveCamera(36, 1, 0.4, 90);
	const hallScene = new THREE.Scene();
	const actorScene = new THREE.Scene();

	/*
	 * One PMREM of three.js's own room, used as the environment for both scenes. It is
	 * what gives bare metal something to reflect — the alternative is a hall lit by point
	 * lights alone, which reads as plastic. Generated once and the generator thrown away;
	 * the texture outlives it.
	 */
	const pmrem = new THREE.PMREMGenerator(back);
	const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	pmrem.dispose();
	hallScene.environment = environment;
	actorScene.environment = environment;
	hallScene.environmentIntensity = 0.34;
	actorScene.environmentIntensity = 0.4;

	const tone = palette(THREE);
	const mat = materials(THREE, tone);

	const hall = buildHall(THREE, mat);
	const kit = buildKit(THREE, { mat, plans });
	const crowd = buildCrowd(THREE, mat);
	const ghost = buildReflection(THREE, mat, MIRROR.z);
	hallScene.add(hall.group, kit.group, crowd.group, ghost.group);

	/*
	 * His scene holds him, his shadow, and two lights of its own. It needs the lights
	 * because it is a separate scene: the hall's strip cannot reach into it, and a figure
	 * lit only by the environment map would not darken as the hall darkens.
	 */
	const man = buildActor(THREE, mat);
	const shade = buildShadow(THREE);
	const fill = new THREE.AmbientLight(0xffffff, 1);
	const key = new THREE.DirectionalLight(0xffffff, 1);
	const rim = new THREE.PointLight(0xffffff, 1, 9, 2);
	actorScene.add(man.group, shade.mesh, fill, key, rim);

	let page = scanPage();
	let flows = null;
	let hour = roomState(new Date(), hours);
	let hourAt = 0;

	let width = 0;
	let height = 0;
	let portrait = false;

	let last = 0;
	let raf = 0;
	let dead = false;

	let prevS = null;
	let velocity = 0;
	let phase = 0;
	let camX = stationX(0);
	let facing = Math.PI / 2;
	let dirSign = 1;
	let bagAngle = 0;
	let bagRate = 0;
	let punchP = 0;
	let active = null;
	let posedAt = -1;
	let shift = 0;

	/** The hour, written into every surface that carries it. */
	function applyHour(state) {
		hall.apply(state);
		kit.apply(state);
		const light = state.light;
		for (const renderer of renderers) renderer.toneMappingExposure = light.exposure;

		fill.color.set(light.sun.color);
		fill.intensity = 0.4 + light.ambient * 2.4;
		// Direction is all a directional light has, so it does not matter where in the hall
		// he is standing when this is set.
		key.color.set(light.sun.color);
		key.intensity = 0.35 + light.sun.intensity * 1.9;
		key.position.set(-9, 6 + light.sun.elevation * 14, -7);
		rim.color.copy(mat.strip.emissive);
		rim.intensity = light.strip * 5.5;
		ghost.lamp.intensity = light.strip * 3.2 + light.ambient * 2.4;
	}

	function resize() {
		width = Math.max(1, window.innerWidth);
		height = Math.max(1, window.innerHeight);
		portrait = height > width;
		camera.aspect = width / height;
		// Portrait looks down the hall, so he comes toward the reader instead of across
		// them; a wider angle is what keeps the room around him at that distance.
		camera.fov = portrait ? 46 : 36;
		camera.updateProjectionMatrix();
		const dpr = Math.min(window.devicePixelRatio || 1, portrait ? 1.75 : 2);
		for (const renderer of renderers) {
			renderer.setPixelRatio(dpr);
			renderer.setSize(width, height, false);
		}
		shift = portrait ? 0 : offsetFor(measureCentre());
	}

	/**
	 * Where on the screen the words are.
	 *
	 * He has to walk *through* the paragraph, not past it, and a paragraph is a measure
	 * of about 68 characters sitting at the left of a board that is centred and capped —
	 * so where its middle falls is a fraction of the viewport that changes with the
	 * viewport. Read once per resize, never per frame.
	 */
	function measureCentre() {
		const el = document.querySelector("[data-flow]");
		if (!el) return 0.5;
		const rect = el.getBoundingClientRect();
		if (!(rect.width > 0)) return 0.5;
		return Math.min(0.6, Math.max(0.22, (rect.left + rect.width / 2) / width));
	}

	/**
	 * The lateral offset that puts him at that fraction of the frame.
	 *
	 * Panning the camera sideways rather than moving him keeps the hall behind him
	 * correct: he still walks the painted line, the room still stands where it was built,
	 * and it is the frame that is composed around the type instead of him being nudged
	 * off the floor to meet it.
	 */
	function offsetFor(fraction) {
		const reach = Math.tan((camera.fov * Math.PI) / 360) * (CAMERA_Z - LANE) * camera.aspect;
		return (0.5 - fraction) * 2 * reach;
	}


	/**
	 * His silhouette in document pixels.
	 *
	 * Eight corners of the box he occupies, projected through the shared camera and
	 * offset by the scroll — which is what makes the hole in the paragraph land on the
	 * words he is actually standing over, at whatever focal length and aspect the
	 * viewport turned out to be. Nothing here reads layout.
	 */
	const corner = new THREE.Vector3();
	let barGrabbed = false;
	function screenBox(x, z) {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const dx of [-0.52, 0.52]) {
			for (const dy of [0.02, 1.86]) {
				for (const dz of [-0.36, 0.36]) {
					corner.set(x + dx, dy, z + dz).project(camera);
					const cx = (corner.x * 0.5 + 0.5) * width;
					const cy = (0.5 - corner.y * 0.5) * height;
					if (cx < minX) minX = cx;
					if (cx > maxX) maxX = cx;
					if (cy < minY) minY = cy;
					if (cy > maxY) maxY = cy;
				}
			}
		}
		return {
			left: minX + window.scrollX,
			top: minY + window.scrollY,
			width: maxX - minX,
			height: maxY - minY,
		};
	}

	/**
	 * How much a row has to care that he is there: 0 clear, 1 standing on it.
	 *
	 * The share is of the *row*, not of him: he is ten times the height of a line, so
	 * dividing by his own height would cap a fully-covered row at a fraction and leave it
	 * stopping short of clear — which reads as a row that tried to move and gave up.
	 * Horizontal distance fades it in as he approaches, so a button lifts before he reaches
	 * it instead of flicking on the frame he arrives.
	 */
	function nearness(obstacle, box) {
		if (!obstacle) return 0;
		const overlap = Math.min(obstacle.top + obstacle.height, box.top + box.height) - Math.max(obstacle.top, box.top);
		if (overlap <= 0) return 0;
		const gap = Math.max(obstacle.left - (box.left + box.width), box.left - (obstacle.left + obstacle.width));
		const near = 1 - Math.max(0, gap) / 260;
		if (near <= 0) return 0;
		const share = overlap / Math.max(1, Math.min(box.height, obstacle.height));
		return Math.min(1, share) * Math.min(1, near);
	}

	/** Did a looping clip's phase pass this mark since last frame, wrap included? */
	function crossed(before, after, mark) {
		return after < before ? before < mark || after >= mark : before < mark && after >= mark;
	}

	/**
	 * How far a row has to slide to be out from behind him, and which way.
	 *
	 * Both answers are measured, not chosen: leftward is the distance that puts the row's
	 * trailing edge before his leading one, rightward the distance that puts its leading
	 * edge after his trailing one. Whichever genuinely clears him wins, ties going to the
	 * shorter trip.
	 *
	 * A row that cannot clear him inside its own room does not move at all. Shoving it as
	 * far as it could go was worse than leaving it: he still stood on it, and now its first
	 * words were off the edge of the screen as well. A row wider than the space either side
	 * of him has no honest slide — it either re-breaks, which is `data-flow`, or it lets him
	 * pass over it.
	 */
	function clearance(obstacle, row) {
		if (!obstacle) return 0;
		const left = row.box.left + row.box.width - obstacle.left;
		const right = obstacle.left + obstacle.width - row.box.left;
		// One of these being spent means the row already sits clear of him on that side.
		if (left <= 0 || right <= 0) return 0;

		const canLeft = left <= Math.min(row.room.left, CLEAR_MAX);
		const canRight = right <= Math.min(row.room.right, CLEAR_MAX);
		if (canLeft && (!canRight || left <= right)) return -left;
		return canRight ? right : 0;
	}

	/**
	 * One frame.
	 *
	 * Read the scroll, ask the four pure modules what that means, write the answers.
	 * The order matters in one place only: the camera has to be placed before his box is
	 * projected through it, or the hole in the paragraph is a frame behind him.
	 */
	function frame(now) {
		raf = requestAnimationFrame(frame);
		const started = performance.now();
		const dt = Math.min(64, now - last || 16);
		last = now;
		const seconds = now / 1000;

		// The clock is only asked once a minute, and the minute hand is why it is asked at
		// all: the light changes on the hour, the hands change on the minute.
		if (now - hourAt > HOUR_MS) {
			hourAt = now;
			hour = roomState(new Date(), hours);
			applyHour(hour);
		}

		const walk = walkAt(window.scrollY, page.anchors);
		if (prevS === null) prevS = walk.s;
		const ds = walk.s - prevS;
		prevS = walk.s;

		// Walk progress per second, smoothed, is what decides the gait — not the raw
		// per-frame delta, which a trackpad delivers in spikes.
		velocity = smooth(velocity, (ds * 1000) / dt, 120, dt);
		const gait = reduced ? { stand: 1, walk: 0, run: 0, heading: 0, lean: 0, stride: 1 } : gaitFor(velocity);
		const at = stationAt(walk);
		const clip = CLIPS[STATION_CLIPS[at.index]];
		const work = at.working ? gait.stand : 0;

		/*
		 * Cadence comes from ground covered, not from the clock, so his feet cannot skate:
		 * accumulating the delta rather than deriving the phase from `s` is what keeps a
		 * gait change from snapping the stride mid-step.
		 */
		phase += (ds * CADENCE) / gait.stride;
		const clipP = reduced ? 0.42 : (seconds / clip.period) % 1;

		/*
		 * Every clip he is doing any of, at the weight he is doing it. `blendDeltas` works
		 * on offsets from rest, so a walk at 0.3 and a deadlift at 0.7 is a man pulling a
		 * bar with his feet still moving — which is exactly what arriving at a station
		 * looks like.
		 */
		const entries = [];
		if (gait.walk > 0.001) entries.push({ ...sampleClip(CLIPS.walk, phase), weight: gait.walk });
		if (gait.run > 0.001) entries.push({ ...sampleClip(CLIPS.run, phase), weight: gait.run });
		if (work > 0.001) entries.push({ ...sampleClip(clip, clipP), weight: work });
		if (gait.lean > 0.001) {
			// Positive x is forward on the torso, and forward is wherever he is facing, so
			// this leans into the direction of travel without knowing which way that is.
			entries.push({ pose: { spine: [gait.lean * 0.5, 0, 0], chest: [gait.lean * 0.28, 0, 0] }, weight: 1 });
		}
		if (!reduced) entries.push({ pose: breath(seconds), weight: 1 });

		const pose = resolve(blendDeltas(entries));
		const root = blendRoots(entries);
		const swing = reduced ? { y: 0, roll: 0 } : bob(phase, gait);

		/*
		 * Which way he is pointing. `gaitFor` returns 0 for "keep facing whatever you were",
		 * so the sign is remembered rather than recomputed — otherwise he would snap back to
		 * front every time the reader stopped scrolling. Easing between +π/2 and −π/2 passes
		 * through 0, which is a man turning round to walk back, and is why this is smoothed
		 * rather than assigned.
		 */
		if (gait.heading !== 0) dirSign = gait.heading;
		let aim = (Math.PI / 2) * (dirSign || 1);
		if (at.working) {
			if (at.index === 2 || at.index === 4) aim = (dirSign === -1) ? -Math.PI : Math.PI;
			else aim = 0;
		}
		facing = reduced ? aim : smooth(facing, aim, FACE_HALF_LIFE, dt);

		const stationPos = stationX(at.index);
		const stateX = at.working ? walk.x + (stationPos - walk.x) * work : walk.x;
		const state = { x: stateX, z: LANE, heading: facing, pose, root, bob: swing };
		man.set(state);
		rim.position.set(stateX - dirSign * 1.6, 2.5, LANE + 1.1);

		// The root offset is in his own frame, so it has to be turned by his heading before
		// the shadow can be put under it. Running spreads it, which is the only lift he has.
		const sin = Math.sin(facing);
		const cos = Math.cos(facing);
		shade.set(stateX + root.x * cos + root.z * sin, LANE + root.z * cos - root.x * sin, gait.run * 0.14);

		/*
		 * The reflection, only while there is a mirror to hold it. The hall has no back wall
		 * below the clerestory, so a copy left visible outside the recess would be a second
		 * man standing in the void in front of the painted name.
		 */
		const seen = Math.abs(stateX - MIRROR.x) < MIRROR.width / 2 + 0.7;
		ghost.group.visible = seen;
		if (seen) ghost.set(state);

		crowd.apply(hour.crowd, seconds);

		/*
		 * The bag, on a spring. Two impulses per punch cycle, at the phases his hands are
		 * actually out, and then it rings down on its own — a bag that stopped dead when he
		 * stopped hitting it would be the giveaway that none of this is physical.
		 */
		if (!reduced) {
			if (work > 0.35 && clip === CLIPS.punch) {
				if (crossed(punchP, clipP, 0.18) || crossed(punchP, clipP, 0.62)) bagRate += 1.7;
			}
			punchP = clipP;
			const step = dt / 1000;
			bagRate += -bagAngle * 24 * step;
			bagRate *= Math.pow(0.5, dt / 430);
			bagAngle += bagRate * step;
			kit.bag.rotation.x = bagAngle;
		}

		// The bar attaches to his hands during the pull, weighted by how much of the pull he is
		// doing, so it locks into his hands when lifting and lowers to the floor when he walks off.
		const hands = man.getHandCenter();
		const defaultX = stationX(1) + 0.09;
		const defaultY = 0.27;
		const defaultZ = 0.55;
		
		if (clip === CLIPS.deadlift && work > 0) {
			if (hands.y < defaultY + 0.45) barGrabbed = true;
		} else {
			barGrabbed = false;
		}
		
		const barWeight = barGrabbed ? work : 0;
		const targetY = Math.max(0.27, hands.y);

		kit.bar.position.x = defaultX + (hands.x - defaultX) * barWeight;
		kit.bar.position.y = defaultY + (targetY - defaultY) * barWeight;
		kit.bar.position.z = defaultZ + (hands.z - defaultZ) * barWeight;

		/*
		 * The camera parks: at the station while he works, at the middle of the gap while he
		 * crosses it. That is the whole reason he reads as walking rather than as being
		 * dragged — between stations the frame holds still and he moves through it.
		 */
		const parked = at.working ? stationX(at.index) : HALL.x0 + (walk.index + 0.5) * HALL.gap;
		camX = reduced ? parked : smooth(camX, parked, CAMERA_HALF_LIFE, dt);
		if (portrait) {
			// Down the hall rather than across it, so a phone gets him walking toward the
			// reader — the one axis a narrow screen has room for.
			camera.position.set(camX + 7.4, 2.15, 6.6);
			camera.lookAt(camX - 1.6, 1.15, -0.6);
		} else {
			camera.position.set(camX + shift, 1.95, CAMERA_Z);
			camera.lookAt(camX + shift, 1.2, -0.7);
		}
		camera.updateMatrixWorld();

		/*
		 * The hole in the type. The lead is a fraction of his own width rather than a fixed
		 * distance: 140px of lead on a 95px silhouette is a corridor three times as wide as
		 * the man walking down it, which reads as a bug in the layout rather than as someone
		 * standing there. Scaled to him, it opens just ahead of his shoulder at any focal
		 * length and any viewport.
		 *
		 * Reduced motion gets it once per stop instead of per frame: the paragraph still
		 * genuinely parts around him, it just does not re-break under a reader who asked for
		 * no animation.
		 */
		const box = screenBox(stateX, LANE);
		const obstacle = obstacleFrom(box, {
			heading: dirSign * Math.min(1, gait.walk + gait.run),
			lead: box.width * 0.45,
		});
		if (flows) {
			if (!reduced) flows.update(obstacle);
			else if (at.index !== posedAt) {
				posedAt = at.index;
				flows.update(obstacle);
			}
		}

		/*
		 * The rows that are not paragraphs. A ledger row cannot re-break — it holds a link —
		 * so it steps aside instead, and it steps aside far enough to actually be read:
		 * `clearance` is the distance that puts the row's own edge past his silhouette, not
		 * a nudge. `--open` eases it in as he approaches, `--push` is where it is going.
		 * Both are only written when they move, because a style write on a row is a style
		 * recalc on the row.
		 */
		for (const row of page.yields) {
			const hit = nearness(obstacle, row.box);
			const open = smooth(row.open, hit, 180, dt);
			const push = smooth(row.push, hit > 0 ? clearance(obstacle, row) : 0, 180, dt);
			if (Math.abs(open - row.open) > 0.0015 || (open > 0.0015) !== (row.open > 0.0015)) {
				row.el.style.setProperty("--open", open.toFixed(3));
			}
			if (Math.abs(push - row.push) > 0.02) row.el.style.setProperty("--push", `${push.toFixed(2)}px`);
			row.open = open;
			row.push = push;
		}

		/*
		 * The prices, as metal. Reaching for a row on the page lifts its plate off the rail
		 * and lights its rim — the plan is an object in the room, and pointing at the number
		 * points at the object.
		 */
		for (const [id, plate] of kit.plates) {
			const lit = smooth(plate.lit ?? 0, id === active ? 1 : 0, 150, dt);
			plate.lit = lit;
			plate.node.position.y = plate.home + lit * 0.19;
			plate.material.emissiveIntensity = lit * 0.6;
		}

		back.render(hallScene, camera);
		front.render(actorScene, camera);
		if (onFrame) onFrame(performance.now() - started);
	}

	/** Whichever priced row the reader is reaching for, by pointer or by tab. */
	function reach(event) {
		const row = event.target?.closest?.("[data-plate]");
		const id = row ? row.getAttribute("data-plate") : null;
		if (id !== active) active = id;
	}

	applyHour(hour);
	resize();
	window.addEventListener("resize", resize, { passive: true });
	document.addEventListener("pointerover", reach, { passive: true });
	document.addEventListener("focusin", reach);

	/*
	 * The flowing paragraphs wait for the font. Every measure pretext takes is a measure
	 * of the face the reader will actually see, and Archivo landing late would otherwise
	 * re-break every line on the page at once, in front of them. Reserving the slack line
	 * moves the page, so the anchors are re-read straight after.
	 */
	document.fonts.ready.then(() => {
		if (dead) return;
		flows = createFlows();
		page = scanPage();
	});

	const stopWatching = observePage(() => {
		page = scanPage();
		if (flows) flows.remeasure();
	});

	raf = requestAnimationFrame(frame);

	/** Give the page back exactly as it was found. */
	function destroy() {
		dead = true;
		cancelAnimationFrame(raf);
		window.removeEventListener("resize", resize);
		document.removeEventListener("pointerover", reach);
		document.removeEventListener("focusin", reach);
		stopWatching();
		if (flows) flows.release();
		for (const row of page.yields) {
			row.el.style.removeProperty("--open");
			row.el.style.removeProperty("--push");
			// The attribute was ours, and it is what carries the transform: left behind it
			// would make a containing block of every row on a page with no rig on it.
			delete row.el.dataset.yield;
		}
		environment.dispose();
		for (const renderer of renderers) {
			renderer.dispose();
			renderer.forceContextLoss();
		}
	}

	return { destroy };
}







