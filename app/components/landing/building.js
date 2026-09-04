"use client";

/**
 * The building. One renderer, one man, six stations, and a camera that reads the page.
 *
 * The whole thing rests on one map: `world y = -k · page y`, with the camera parked at
 * the distance where one world unit projects to exactly `1/k` pixels. `shaft.mjs` owns
 * that arithmetic; this file spends it. The consequence is that a height in the world
 * and a height on the page are the same measurement, so his feet can be placed against a
 * hairline and a 450 mm bumper comes out 450 mm against the type beside it.
 *
 * Two clocks, deliberately. Reps, breath and idle run on the wall clock, so he keeps
 * working while a paragraph is read. The jump, the fall, the landing, the camera and the
 * parting letters run on live scroll, so dragging the scrollbar back up un-falls him.
 *
 * He stands on the hairline below him for as long as that line is in frame, and waits
 * near the bottom of the frame while it is still a storey away. That is the one honest
 * answer to a storey being a whole viewport tall: a point fixed in the world crosses the
 * entire frame in one storey of scroll, so nothing can be both slab-pinned and on screen.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { CLIPS, blend, breath } from "@/lib/landing/body.mjs";
import { fallAt, floorAt, pushes, scaleFor } from "@/lib/landing/shaft.mjs";
import { figure } from "./figure";
import { observe } from "./measure";
import { barbell, makeMaterials, roomEnvironment, station, token } from "./props";

/**
 * Three-quarters on, turned toward the camera. A dead-side elevation puts the bar
 * end-on and hides his chest behind a bumper. A yaw is the one rotation that leaves
 * every world height untouched, so the slab-on-hairline map survives it exactly.
 */
const YAW = -0.42;

/** His feet may not sit below this fraction of the viewport... */
const LOW = 0.84;

/** ...nor above his own height plus this much clearance for his head. */
const HEAD = 0.07;

/** A bumper's radius: what a loaded bar rests on when it is on the floor. */
const PLATE_R = 0.45;

/** Seconds per cycle. A press is a rep; a stand is a slow shift of weight. */
const RATE = { press: 2.1, load: 3.0, walk: 1.1, run: 0.66, look: 5.5, stand: 6.5 };

/** Floor 05 down to floor 01: what he does there, and what he does it on. */
const STATIONS = [
	{ kind: null, work: "press", bar: "hold" },
	{ kind: null, work: "load", bar: "floor" },
	{ kind: "treadmill", work: "run", bar: null },
	{ kind: "mirror", work: "look", bar: null },
	{ kind: "desk", work: "stand", bar: null },
];

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * The pose for one frame. Off a fall it is the station's own clip on the wall clock. In
 * a fall it is jump, then fall, then land, cross-faded, all three driven by scroll — the
 * fifth of the band spent on the anticipation is what makes the drop read as his
 * decision instead of the scrollbar's.
 */
function poseFor(work, seconds, fall) {
	const idle = CLIPS[work]((seconds / RATE[work]) % 1);
	if (!fall) return breath(idle, seconds);
	const t = fall.t;
	if (t < 0.2) return blend(idle, CLIPS.jump(t / 0.2), clamp01(t / 0.12));
	if (t < 0.74) return blend(CLIPS.jump(1), CLIPS.fall((t - 0.2) / 0.54), clamp01((t - 0.2) / 0.14));
	return blend(CLIPS.fall(1), CLIPS.land((t - 0.74) / 0.26), clamp01((t - 0.74) / 0.1));
}

/** A yaw wrapper, so a child can keep its own rotations and still be turned. */
function yawed(child) {
	const group = new THREE.Group();
	group.rotation.y = YAW;
	group.add(child);
	return group;
}

/**
 * `plates` arrives as a comma-separated string rather than an array on purpose: an array
 * literal is a new value on every parent render, and this effect builds a whole renderer.
 */
export default function Building({ plates = "5,10,15,20,25", still = false, onReady, onSlow }) {
	const hostRef = useRef(null);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return undefined;

		const narrow = window.matchMedia("(max-width: 768px)").matches;
		const ground = token("--board", "#0b0b0b");
		const action = token("--action", "#00b3a4");
		const accent = token("--accent", "#ff3b3b");

		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: !narrow,
			powerPreference: "high-performance",
		});
		renderer.setClearColor(0x000000, 0);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.08;
		renderer.domElement.style.display = "block";
		renderer.domElement.style.width = "100%";
		renderer.domElement.style.height = "100%";
		host.appendChild(renderer.domElement);

		const junk = [];
		const track = (item) => {
			junk.push(item);
			return item;
		};

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
		scene.environment = track(roomEnvironment(renderer, action, accent));

		/*
		 * Shadow maps stay off: a shaft has no ground plane to catch a shadow, so the
		 * second render pass would cost what it costs and draw nothing. The room
		 * environment is doing the lighting work here.
		 */
		const lamps = new THREE.Group();
		const aim = new THREE.Object3D();
		lamps.add(aim);
		scene.add(lamps);
		const lamp = (colour, power, at) => {
			const light = new THREE.DirectionalLight(new THREE.Color(colour), power);
			light.position.set(at[0], at[1], at[2]);
			light.target = aim;
			lamps.add(light);
		};
		/*
		 * Key from the fixture overhead, a rim in the owner's primary raking him from
		 * behind, a hard white counter-rim on the far shoulder, and the accent as a low
		 * kicker. The two rims are what actually separate him from the room: a half-metal
		 * figure on a near-black wall is read by its edges long before its faces, so those
		 * are the lights that must not be economised on.
		 */
		lamp("#fff3e4", 3.1, [-4, 7.5, 5]);
		lamp(action, 3.4, [4.5, 2.5, -6]);
		lamp("#dfe7ff", 1.5, [-5.5, 3, -4.5]);
		lamp(accent, 0.9, [5, -3.5, 2]);
		scene.add(new THREE.AmbientLight(0xffffff, 0.42));

		const mats = makeMaterials({ track, narrow });
		const man = figure({ mats, track, narrow });
		const manYaw = yawed(man.group);
		scene.add(manYaw);

		// One bar, built once. Floor 04's copy shares its geometry and materials.
		const load = plates
			.split(",")
			.map(Number)
			.filter((kg) => kg > 0);
		const bar = barbell({ plates: load.length ? load : [5, 10, 15, 20, 25], mats, track, narrow });
		const spare = bar.group.clone();

		const crew = STATIONS.map((spec) => {
			const built = spec.kind
				? station(spec.kind, { mats, track, narrow })
				: { group: new THREE.Group(), stand: 0 };
			const node = yawed(built.group);
			node.visible = false;
			scene.add(node);
			const rig = spec.bar ? yawed(spec.bar === "hold" ? bar.group : spare) : null;
			if (rig) {
				rig.visible = false;
				scene.add(rig);
			}
			return { ...spec, node, rig, stand: built.stand };
		});

		let map = { knots: [], headings: [], blocks: [] };
		const view = { width: 0, height: 0 };
		let k = 0.01;
		let dist = 12;
		let share = 0.5;

		/**
		 * Size to the host and re-derive the map. Returns whether anything changed, so a
		 * mobile address bar sliding away — a height change with no reflow — is not a
		 * resize and does not rebuild the projection.
		 */
		function resize() {
			const width = host.clientWidth;
			const height = host.clientHeight;
			if (!width || !height) return false;
			if (width === view.width && Math.abs(height - view.height) < 80) return false;
			view.width = width;
			view.height = height;
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.6 : 2));
			renderer.setSize(width, height, false);
			const fit = scaleFor(view);
			k = fit.k;
			dist = fit.dist;
			share = fit.share;
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			/*
			 * Fog starts *behind* him, not on him. The near plane is past the camera
			 * distance on purpose: at z 0 he is exactly `dist` away, so a near plane
			 * inside that put every frame of him a sixth of the way to the board colour
			 * and cost him the contrast he had. Depth is still bought — the far sleeve of
			 * the bar and the back of a treadmill sit beyond the near plane.
			 */
			scene.fog = new THREE.Fog(new THREE.Color(ground), dist * 1.15, dist * 3.4);
			return true;
		}

		/** Screen pixels to world, on the plane the slabs live on. */
		const worldX = (px) => (px - view.width / 2) * k;
		const worldY = (px, scrollY) => -k * (scrollY + px);

		/**
		 * Where his feet sit, in screen pixels: on the hairline below him, clamped to the
		 * frame at both ends so a floor taller than a viewport never takes him off screen.
		 */
		function rest(knot, scrollY) {
			const high = (share + HEAD) * view.height;
			return Math.min(LOW * view.height, Math.max(high, knot - scrollY));
		}

		/** The lane he works in: the strip between the type column and the right edge. */
		function lane() {
			const measured = map.headings.find(Boolean);
			const column = measured ? measured.bounds.right : view.width * 0.66;
			return { column, centre: (column + view.width) / 2 };
		}

		let armed = -1;
		let opened = -1;
		let held = null;
		const a = new THREE.Vector3();
		const b = new THREE.Vector3();

		function draw(now, frozen) {
			if (!map.knots.length || !view.height) return;
			const scrollY = window.scrollY;
			const height = view.height;
			const fall = frozen ? null : fallAt(map.knots, scrollY, height);
			const index = fall ? fall.index : floorAt(map.knots, scrollY, height);
			const spec = crew[Math.min(index, crew.length - 1)];
			const { column, centre } = lane();
			// The hairline he stands on, less however high his station holds him off it.
			const stood = (i) =>
				rest(map.knots[i], scrollY) - crew[Math.min(i, crew.length - 1)].stand / k;

			/*
			 * The line this fall goes through, and the point on it he goes through: the end of
			 * the words, not the middle of the column and not the middle of the line.
			 *
			 * The column is the wrong aim because a five-letter heading ends well before
			 * mid-column, so short headings would sit the effect out entirely while long ones
			 * part. The middle of the line is worse: the words start flush against the column's
			 * left edge, so the letters left of centre have nowhere to go and `pushes` correctly
			 * refuses the whole line. Aimed at the tail, every heading parts by 50px on a phone
			 * and 110px on a desktop, because the open column is always on that side.
			 */
			const heading = fall ? map.headings[fall.index] : null;
			const tail = heading?.letters.length ? heading.letters.at(-1) : null;

			/*
			 * Down on a square law — gravity, not a cross-fade — and across on a sine whose
			 * apex lands on the tail of the heading. The two together are the parabola: he
			 * leaves the lane, crosses the letters at speed, and swings back to the station.
			 */
			const feet = fall
				? stood(fall.index) + (stood(fall.index + 1) - stood(fall.index)) * fall.t ** 2
				: stood(index);
			const apex = tail ? tail.x + tail.w : column * 0.5;
			const px = fall ? centre - (centre - apex) * Math.sin(Math.PI * fall.t) : centre;
			// His middle, which is what a heading has to make room for.
			const chest = feet - share * height * 0.5;

			camera.position.set(0, worldY(height / 2, scrollY), dist);
			// The lamps ride with the camera, or a light fixed at y 7.5 ends up a hundred
			// storeys overhead by the ground floor.
			lamps.position.y = camera.position.y;

			manYaw.position.set(worldX(px), worldY(feet, scrollY), 0);
			man.apply(poseFor(spec.work, now / 1000, fall));

			// Only the floor he is on, plus the one he is falling to, exist this frame.
			for (let i = 0; i < crew.length; i += 1) {
				const unit = crew[i];
				const show = i < map.knots.length && (i === index || (Boolean(fall) && i === index + 1));
				if (unit.kind) unit.node.visible = show;
				if (unit.rig) unit.rig.visible = show;
				if (!show) continue;
				const slab = rest(map.knots[i], scrollY);
				if (unit.kind) unit.node.position.set(worldX(centre), worldY(slab, scrollY), 0);
				// A bar waiting to be loaded rests on its own plates, off to his side.
				if (unit.bar === "floor") {
					unit.rig.position.set(worldX(centre) + 0.34, worldY(slab, scrollY) + PLATE_R, 0);
				}
			}

			/*
			 * The bar in his hands, placed from the hands rather than his hands posed onto
			 * it: no IK, and the grip is exact through the whole rep. Once he leaves floor
			 * 05 it stays where he left it — in page space, so it scrolls away like the
			 * object it is instead of following the camera down the shaft.
			 */
			const grip = crew[0].rig;
			if (index === 0 && !fall) {
				manYaw.updateMatrixWorld(true);
				man.pivots.get("handL").getWorldPosition(a);
				man.pivots.get("handR").getWorldPosition(b);
				grip.position.copy(a.add(b).multiplyScalar(0.5));
				held = { x: grip.position.x, page: -grip.position.y / k };
			} else if (grip.visible) {
				if (held) grip.position.set(held.x, -k * held.page, 0);
				else grip.visible = false;
			}

			// The bar loads as the rates are read: one hub ring lights per term.
			const term = map.knots.length > 1 ? map.knots[1] - map.knots[0] : height;
			const loaded =
				clamp01((scrollY - map.knots[0] + height * 0.5) / Math.max(1, term)) * bar.marks.length;
			bar.marks.forEach((mark, i) => {
				mark.emissiveIntensity = clamp01(loaded - i) * 0.85;
			});

			/*
			 * The corridor. `--push` is how far a thing steps aside, written once at the
			 * onset of a fall; `--open` is how far the corridor is open, written per frame.
			 * Both are custom properties, so a moved object costs one composited transform
			 * and no layout, whatever it is.
			 *
			 * The heading's letters part *around* him, some left and some right, because his
			 * path goes through the middle of the word and `pushes` splits it there. Nothing
			 * else on the floor can split: a priced line, a row of hours and a step are each
			 * as wide as the column, so they go one way — right, into the lane he vacated to
			 * come at them. He takes their space and they take his, which is the only version
			 * of this that does not need a wider page to happen on.
			 */
			if (!fall) armed = -1;
			if (heading && armed !== fall.index) {
				armed = fall.index;
				const reach = share * height * 0.24;
				const push = pushes(heading.letters, apex, reach, heading.bounds);
				heading.letters.forEach((tile, i) => {
					tile.el.style.setProperty("--push", `${Math.round(push[i])}px`);
				});
				for (const block of map.blocks[fall.index] ?? []) {
					// Never past the window's own edge, and never further than he reaches.
					const room = Math.max(0, view.width - 8 - (block.x + block.w));
					block.el.style.setProperty("--push", `${Math.round(Math.min(room, reach))}px`);
				}
			}
			for (const line of map.headings) {
				if (!line) continue;
				const gap = Math.abs(line.mid - scrollY - chest);
				const open = line === heading ? 1 - Math.min(1, gap / (share * height * 0.62)) : 0;
				line.el.style.setProperty("--open", open.toFixed(3));
			}

			/*
			 * The blocks of the one floor he is inside. Each opens on its own middle, so the
			 * floor gives way in the order he reaches it rather than all together, and the
			 * range is wider than a heading's because a single row is a much shorter thing
			 * than a line of wall lettering and would otherwise flick past.
			 */
			const shoving = fall ? fall.index : -1;
			if (shoving !== opened) {
				for (const block of map.blocks[opened] ?? []) {
					block.el.style.setProperty("--open", "0");
				}
				opened = shoving;
			}
			if (shoving >= 0) {
				const span = share * height * 0.8;
				for (const block of map.blocks[shoving] ?? []) {
					const gap = Math.abs(block.mid - scrollY - chest);
					block.el.style.setProperty("--open", (1 - Math.min(1, gap / span)).toFixed(3));
				}
			}

			renderer.render(scene, camera);
		}

		let raf = 0;
		let previous = 0;
		let slow = 0;
		let live = false;

		function stop() {
			live = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		}

		function frame(now) {
			raf = 0;
			if (!live) return;
			resize();
			const gap = previous ? now - previous : 16;
			previous = now;
			draw(now, false);
			/*
			 * Thirty frames in a row over 28 ms and the rig hands over to the still
			 * elevation. That state is designed rather than degraded, and it is a better
			 * answer on a mid-range phone than a slideshow of a man falling.
			 */
			slow = gap > 28 ? slow + 1 : 0;
			if (slow > 30) {
				stop();
				onSlow?.();
				return;
			}
			raf = requestAnimationFrame(frame);
		}

		function start() {
			if (live) return;
			live = true;
			previous = 0;
			slow = 0;
			raf = requestAnimationFrame(frame);
		}

		/** The still presentation: one frame per floor, swapped with no transition. */
		let sat = -1;
		function once() {
			resize();
			draw(0, true);
		}
		const onFloor = () => {
			const at = floorAt(map.knots, window.scrollY, view.height);
			if (at === sat) return;
			sat = at;
			once();
		};
		const onVisible = () => {
			if (document.hidden) stop();
			else start();
		};

		const stopMeasure = observe((next) => {
			map = next;
			// A re-measure invalidates both halves of the corridor: `read` has just shut
			// every `--open`, and the `--push` values it measured belong to the old layout.
			armed = -1;
			opened = -1;
			if (still) once();
		});

		resize();
		draw(0, still);
		onReady?.();

		if (still) {
			window.addEventListener("scroll", onFloor, { passive: true });
			window.addEventListener("resize", once);
		} else {
			start();
			document.addEventListener("visibilitychange", onVisible);
		}

		return () => {
			stop();
			stopMeasure();
			window.removeEventListener("scroll", onFloor);
			window.removeEventListener("resize", once);
			document.removeEventListener("visibilitychange", onVisible);
			for (const line of map.headings) {
				if (!line) continue;
				line.el.style.removeProperty("--open");
				for (const tile of line.letters) tile.el.style.removeProperty("--push");
			}
			for (const floor of map.blocks) {
				for (const block of floor) {
					block.el.style.removeProperty("--open");
					block.el.style.removeProperty("--push");
				}
			}
			for (const item of junk) item.dispose?.();
			renderer.dispose();
			renderer.domElement.remove();
		};
	}, [plates, still, onReady, onSlow]);

	return <div ref={hostRef} aria-hidden="true" className="h-full w-full" />;
}
