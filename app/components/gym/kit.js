"use client";

/**
 * The kit: what stands at each of the five stations.
 *
 * Every piece of it is behind the lane he walks, and that is a rule rather than a
 * preference. He is painted on the canvas above the type, so nothing in this scene can
 * ever occlude him — a bench in front of him would be drawn under his shins and read as
 * a bench behind him. Keeping the lane clear makes the depth honest, and it happens to
 * be what a real gym floor looks like from the side anyway: the kit against the wall,
 * the walking room in front of it.
 *
 * The one exception is flat: a mat on the floor is unambiguous from any angle.
 */

import { stationX } from "@/lib/gym/route.mjs";
import { plateColor } from "@/lib/site/defaults";
import { ROOM, rod, slab } from "./hall";

/** A plate: a disc on the tree, or one loaded on the bar. */
function disc(THREE, radius, thickness, material, x, y, z) {
	const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 24), material);
	mesh.rotation.z = Math.PI / 2;
	mesh.position.set(x, y, z);
	return mesh;
}

/** DOOR: the mat you wipe your feet on, the bag you dropped, the clock you checked. */
function buildDoor(THREE, mat) {
	const bgGroup = new THREE.Group();
	const x = stationX(0);

	bgGroup.add(slab(THREE, 1.9, 0.03, 1.2, mat.rubber, x - 1.6, 0.02, 0.55));

	// The duffel, slumped: a stretched sphere is a bag, two straps make it a gym bag.
	const duffel = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), mat.pad);
	duffel.scale.set(1.5, 0.82, 0.9);
	duffel.position.set(x - 0.5, 0.28, -1.15);
	bgGroup.add(duffel);
	for (const side of [-0.16, 0.16]) {
		const strap = rod(THREE, 0.026, 0.5, mat.dark, x - 0.5 + side, 0.52, -1.15);
		strap.rotation.x = Math.PI / 2;
		bgGroup.add(strap);
	}

	/*
	 * The clock, hung off the ceiling facing the visitor — and it keeps their time, not a
	 * decorative time. The room is already lit by the hour; a clock painted at 10:10
	 * while the light says dusk would be the one prop in here that lies.
	 */
	const clock = new THREE.Group();
	clock.position.set(x + 1.9, ROOM.ceil - 1.15, -1.6);
	clock.add(rod(THREE, 0.025, 1.1, mat.dark, 0, 0.7, 0));
	const bezel = rod(THREE, 0.34, 0.1, mat.dark, 0, 0, 0);
	bezel.rotation.x = Math.PI / 2;
	const face = rod(THREE, 0.3, 0.1, mat.pad, 0, 0, 0.03);
	face.rotation.x = Math.PI / 2;
	clock.add(bezel, face);
	const hands = [];
	for (const [length, width] of [
		[0.17, 0.028],
		[0.25, 0.018],
	]) {
		const arm = new THREE.Group();
		arm.position.set(0, 0, 0.09);
		arm.add(slab(THREE, width, length, 0.014, mat.steel, 0, length / 2 - 0.02, 0));
		clock.add(arm);
		hands.push(arm);
	}
	bgGroup.add(clock);

	return { bgGroup, fgGroup: new THREE.Group(), hands };
}

/** A loaded barbell. Same function makes the dumbbells: it is a bar with discs on it. */
function barbell(THREE, mat, length, plate) {
	const group = new THREE.Group();
	const shaft = rod(THREE, Math.min(0.032, plate / 3), length, mat.steel, 0, 0, 0);
	shaft.rotation.z = Math.PI / 2;
	group.add(shaft);
	for (const side of [-1, 1]) {
		for (let i = 0; i < 2; i += 1) {
			group.add(disc(THREE, plate - i * 0.03, 0.07, mat.rubber, side * (length / 2 - 0.11 - i * 0.085), 0, 0));
		}
	}
	return group;
}

/** IRON: the rack, the bar he pulls, the bench, and the A-frame of dumbbells. */
function buildIron(THREE, mat) {
	const bgGroup = new THREE.Group();
	const fgGroup = new THREE.Group();
	const x = stationX(1);

	// The power rack: four perforated uprights, beams across the top, a bar in the hooks.
	const rack = new THREE.Group();
	rack.position.set(x - 0.5, 0, -2.5);
	for (const dx of [-0.72, 0.72]) {
		for (const dz of [-0.6, 0.6]) {
			rack.add(slab(THREE, 0.1, 2.42, 0.1, mat.paint, dx, 1.21, dz));
			for (let hole = 0; hole < 12; hole += 1) {
				rack.add(slab(THREE, 0.11, 0.05, 0.05, mat.dark, dx, 0.52 + hole * 0.15, dz));
			}
		}
		rack.add(slab(THREE, 0.12, 0.12, 1.32, mat.paint, dx, 2.46, 0));
		rack.add(slab(THREE, 0.24, 0.09, 0.16, mat.steel, dx - Math.sign(dx) * 0.14, 1.44, 0.6));
	}
	for (const dz of [-0.6, 0.6]) rack.add(slab(THREE, 1.54, 0.12, 0.12, mat.paint, 0, 2.46, dz));
	const racked = barbell(THREE, mat, 2.2, 0.22);
	racked.position.set(0, 1.52, 0.6);
	rack.add(racked);
	bgGroup.add(rack);

	/*
	 * The bar he actually pulls. Its height is the rig's to move, so the lift lands in his
	 * hands rather than him miming one over a bar bolted to the floor. It sits a hand's
	 * width behind the walking line: close enough to grip, far enough that he is drawn in
	 * front of it and not through it.
	 */
	const bar = barbell(THREE, mat, 2.05, 0.27);
	bar.position.set(x + 0.09, 0.27, 0.55);
	fgGroup.add(bar);

	// Flat bench: a pad on a spine on two feet.
	const bench = new THREE.Group();
	bench.add(slab(THREE, 1.5, 0.11, 0.42, mat.pad, x + 3.4, 0.48, -2.1));
	bench.add(slab(THREE, 0.14, 0.36, 0.14, mat.steel, x + 3.4, 0.24, -2.1));
	for (const dx of [-0.62, 0.62]) bench.add(slab(THREE, 0.12, 0.1, 0.72, mat.steel, x + 3.4 + dx, 0.06, -2.1));
	bgGroup.add(bench);

	// Dumbbells, two tiers on an A-frame against the back.
	const tree = new THREE.Group();
	tree.position.set(x - 2.9, 0, ROOM.back + 1);
	for (const dx of [-1, 1]) {
		tree.add(slab(THREE, 0.09, 0.94, 0.09, mat.dark, dx, 0.47, 0.2));
		tree.add(slab(THREE, 0.09, 0.66, 0.09, mat.dark, dx, 0.33, -0.3));
	}
	for (const [y, z] of [
		[0.94, 0.18],
		[0.66, -0.28],
	]) {
		tree.add(slab(THREE, 2.18, 0.08, 0.32, mat.dark, 0, y, z));
		for (let i = 0; i < 5; i += 1) {
			const bell = barbell(THREE, mat, 0.36, 0.082 + i * 0.014);
			bell.position.set(-0.8 + i * 0.4, y + 0.14, z);
			tree.add(bell);
		}
	}
	bgGroup.add(tree);

	return { bgGroup, fgGroup, bar, obstacles: [bar] };
}

/**
 * CLASSES: mats, and the heavy bag on its chain.
 *
 * The mirror is the hall's, and it stands directly behind this station, which is why the
 * bag hangs in front of it rather than beside it. That is the arrangement of every
 * boxing room there has ever been — and because the reflected copy of him is real
 * geometry in this same scene, the bag occludes the reflection by depth test, for free.
 */
function buildClasses(THREE, mat) {
	const bgGroup = new THREE.Group();
	const fgGroup = new THREE.Group();
	const x = stationX(2);

	for (let i = 0; i < 4; i += 1) {
		bgGroup.add(slab(THREE, 1.28, 0.04, 1.9, i % 2 ? mat.pad : mat.rubber, x - 2 + i * 1.32, 0.02, 0.3));
	}
	// A spare pair rolled and stood against the back, because a class has more mats than
	// the floor is showing.
	for (const [dx, tilt] of [
		[-0.16, 0.08],
		[0.2, -0.06],
	]) {
		const roll = rod(THREE, 0.19, 1.5, mat.pad, x + 3.3 + dx, 0.78, ROOM.back + 0.7);
		roll.rotation.z = tilt;
		bgGroup.add(roll);
	}

	const bag = new THREE.Group();
	bag.position.set(x, ROOM.ceil - 0.1, -0.35);
	const chain = rod(THREE, 0.022, 1.45, mat.steel, 0, -0.725, 0);
	const cap = rod(THREE, 0.24, 0.1, mat.dark, 0, -1.5, 0);
	const body = rod(THREE, 0.25, 1.25, mat.pad, 0, -2.15, 0);
	// Pivots at the ceiling, so the rig swings the whole hanging length by one rotation.
	bag.add(chain, cap, body);
	fgGroup.add(bag);

	const obstacles = [bag];

	return { bgGroup, fgGroup, bag, obstacles };
}

/** RECOVERY: the steam room, the chair he sits in, towels, and the kettle. */
function buildRecovery(THREE, mat) {
	const bgGroup = new THREE.Group();
	const fgGroup = new THREE.Group();
	const x = stationX(3);
	const wallZ = ROOM.back + 0.45;

	/*
	 * The steam room, built as a real box against the back with a lit interior and a
	 * fogged door: the light inside is what makes the fog read as steam rather than as a
	 * grey panel, and it is the only warm thing at this end of the hall.
	 */
	const steam = new THREE.Group();
	steam.position.set(x - 2.3, 0, wallZ);
	steam.add(slab(THREE, 0.12, 2.3, 1.6, mat.wall, -1.06, 1.15, -0.8));
	steam.add(slab(THREE, 0.12, 2.3, 1.6, mat.wall, 1.06, 1.15, -0.8));
	steam.add(slab(THREE, 2.24, 0.12, 1.6, mat.wall, 0, 2.36, -0.8));
	steam.add(slab(THREE, 2.24, 2.3, 0.12, mat.wall, 0, 1.15, -1.54));
	steam.add(slab(THREE, 0.16, 2.3, 0.16, mat.dark, -0.82, 1.15, 0));
	steam.add(slab(THREE, 0.16, 2.3, 0.16, mat.dark, 0.82, 1.15, 0));
	steam.add(slab(THREE, 2.24, 0.16, 0.18, mat.dark, 0, 2.22, 0));
	const door = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 2.06), mat.fog);
	door.position.set(0, 1.07, 0.02);
	steam.add(door);
	const inside = new THREE.PointLight(mat.sodium.emissive, 3.4, 4, 2);
	inside.position.set(0, 1.5, -0.7);
	steam.add(inside);
	bgGroup.add(steam);

	// Towels, rolled, three tiers of them.
	const shelf = new THREE.Group();
	shelf.position.set(x + 1.5, 0, wallZ - 0.1);
	for (let tier = 0; tier < 3; tier += 1) {
		const y = 0.5 + tier * 0.42;
		shelf.add(slab(THREE, 1.5, 0.05, 0.44, mat.dark, 0, y, 0));
		for (let i = 0; i < 4; i += 1) {
			const towel = rod(THREE, 0.095, 0.38, mat.linen, -0.54 + i * 0.36, y + 0.12, 0);
			towel.rotation.x = Math.PI / 2;
			shelf.add(towel);
		}
	}
	for (const dx of [-0.7, 0.7]) shelf.add(slab(THREE, 0.07, 1.8, 0.4, mat.dark, dx, 0.9, 0));
	bgGroup.add(shelf);

	/*
	 * The massage chair, and he sits in it. The seat is at the height the sit clip drops
	 * his hips to, so he lands on the pad rather than hovering over it; the footrest is
	 * the one thing in the hall that reaches past the walking line, and it can, because a
	 * shin drawn over a footrest is a shin resting on one.
	 */
	const chair = new THREE.Group();
	chair.position.set(x, 0, 0.34);
	chair.add(slab(THREE, 1, 0.18, 1.3, mat.dark, 0, 0.09, 0.1));
	chair.add(slab(THREE, 0.94, 0.16, 0.9, mat.pad, 0, 0.42, 0.14));
	const back = slab(THREE, 0.94, 1.08, 0.18, mat.pad, 0, 0.98, -0.42);
	back.rotation.x = -0.26;
	chair.add(back);
	const head = slab(THREE, 0.8, 0.26, 0.18, mat.dark, 0, 1.5, -0.62);
	head.rotation.x = -0.26;
	chair.add(head);
	for (const dx of [-0.55, 0.55]) chair.add(slab(THREE, 0.16, 0.22, 0.8, mat.dark, dx, 0.58, 0.12));
	const rest = slab(THREE, 0.94, 0.14, 0.66, mat.pad, 0, 0.4, 0.86);
	rest.rotation.x = 0.22;
	chair.add(rest);
	fgGroup.add(chair);

	// The kettle and the cups. Small, and the smallest thing in the room is what makes the
	// rest of it look like somewhere people actually stand around.
	const table = new THREE.Group();
	table.position.set(x + 3.6, 0, -2.5);
	table.add(slab(THREE, 0.86, 0.06, 0.54, mat.dark, 0, 0.72, 0));
	for (const dx of [-0.36, 0.36]) table.add(slab(THREE, 0.07, 0.72, 0.07, mat.steel, dx, 0.36, 0));
	table.add(rod(THREE, 0.11, 0.22, mat.steel, -0.16, 0.86, 0));
	table.add(rod(THREE, 0.07, 0.05, mat.dark, -0.16, 0.99, 0));
	const spout = rod(THREE, 0.02, 0.16, mat.steel, -0.03, 0.92, 0);
	spout.rotation.z = -0.7;
	table.add(spout);
	for (const [dx, dz] of [
		[0.22, 0.08],
		[0.36, -0.1],
	]) {
		table.add(rod(THREE, 0.05, 0.08, mat.linen, dx, 0.79, dz));
	}
	bgGroup.add(table);

	// Create a dedicated obstacle box that is slightly wider than the chair to ensure text dodges the armrests perfectly
	const chairObs = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 1.5));
	chairObs.position.set(x, 0.7, 0.34);
	chairObs.updateMatrixWorld(true);

	return { bgGroup, fgGroup, obstacles: [chairObs] };
}

/**
 * DESK: the counter, the stool, the ledger — and the plate tree, which is the price list.
 *
 * Each plan gets one plate, sized by what it costs and coloured by the competition
 * colour of its weight, so the rates are read as metal before they are read as numbers.
 * The tree hands back a handle per plan: reaching for a row on the page lifts its plate
 * and lights the rim, which is the whole reason the prices are objects and not a table.
 */
function buildDesk(THREE, mat, plans) {
	const bgGroup = new THREE.Group();
	const fgGroup = new THREE.Group();
	const x = stationX(4);
	const plates = new Map();

	const deskBody = new THREE.Group();
	deskBody.add(
		slab(THREE, 3.3, 1.02, 0.72, mat.dark, x + 0.2, 0.51, -1.25),
		slab(THREE, 3.5, 0.08, 0.88, mat.steel, x + 0.2, 1.06, -1.22),
		slab(THREE, 3.3, 0.06, 0.06, mat.paint, x + 0.2, 0.72, -0.88)
	);
	bgGroup.add(deskBody);

	// The ledger, open on the counter, which is what he signs.
	for (const [dx, tilt] of [
		[-0.19, 0.05],
		[0.19, -0.05],
	]) {
		const leaf = slab(THREE, 0.36, 0.02, 0.5, mat.linen, x + 0.5 + dx, 1.11, -1.2);
		leaf.rotation.x = tilt;
		bgGroup.add(leaf);
	}

	// The stool: a disc, a post, three feet.
	const stool = new THREE.Group();
	stool.position.set(x + 2.5, 0, -0.5);
	stool.add(rod(THREE, 0.23, 0.08, mat.pad, 0, 0.68, 0));
	stool.add(rod(THREE, 0.05, 0.64, mat.steel, 0, 0.36, 0));
	for (let i = 0; i < 3; i += 1) {
		const foot = slab(THREE, 0.06, 0.05, 0.34, mat.steel, 0, 0.05, 0);
		foot.rotation.y = (i * Math.PI * 2) / 3;
		foot.translateZ(0.17);
		stool.add(foot);
	}
	bgGroup.add(stool);

	/*
	 * The prices, leaning against a rail on the floor beside the counter — not stacked on
	 * a post, because five plates on a post at readable sizes intersect each other, and
	 * plates stood in a row against a rail is what every gym in the world does with them.
	 * Radius is the price, normalised across whatever the owner has actually published.
	 */
	const prices = plans.map((plan) => Number(plan.priceInr) || 0);
	const low = Math.min(...prices);
	const span = Math.max(...prices) - low;
	const railX = x - 4.2;
	const railZ = -2.65;

	bgGroup.add(slab(THREE, 4.3, 0.07, 0.07, mat.paint, railX + 1.85, 0.52, railZ));
	for (const dx of [-0.1, 3.8]) bgGroup.add(slab(THREE, 0.09, 0.55, 0.09, mat.dark, railX + dx, 0.27, railZ));

	plans.forEach((plan, i) => {
		const norm = span > 0 ? (prices[i] - low) / span : 0.5;
		const radius = 0.2 + norm * 0.22;
		const colour = plateColor(plan.plate);
		const material = new THREE.MeshStandardMaterial({
			color: colour,
			emissive: colour,
			emissiveIntensity: 0,
			roughness: 0.55,
			metalness: 0.3,
		});
		const plate = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.062, 28), material);
		plate.rotation.x = Math.PI / 2 - 0.15;
		const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.09, 16), mat.steel);
		hub.rotation.x = Math.PI / 2 - 0.15;

		// One handle per plan: the group is what lifts, the material is what lights.
		const node = new THREE.Group();
		node.position.set(railX + 0.42 + i * 0.84, radius, railZ + 0.34 + radius * 0.15);
		node.add(plate, hub);
		bgGroup.add(node);
		plates.set(String(plan.id), { node, material, home: radius });
	});

	return { bgGroup, fgGroup, plates, obstacles: [] };
}

/**
 * All five stations, and the handles the rig needs to move any of them.
 *
 * `apply` is the hour again: the only thing the kit owes the clock is the clock itself,
 * which keeps the visitor's own time. Everything else in here is still.
 */
export function buildKit(THREE, { mat, plans }) {
	const bgGroup = new THREE.Group();
	const fgGroup = new THREE.Group();
	const door = buildDoor(THREE, mat);
	const iron = buildIron(THREE, mat);
	const classes = buildClasses(THREE, mat);
	const recovery = buildRecovery(THREE, mat);
	const desk = buildDesk(THREE, mat, plans);

	bgGroup.add(door.bgGroup, iron.bgGroup, classes.bgGroup, recovery.bgGroup, desk.bgGroup);
	fgGroup.add(door.fgGroup, iron.fgGroup, classes.fgGroup, recovery.fgGroup, desk.fgGroup);

	function apply(state) {
		const minutes = state.clock.minutes;
		door.hands[0].rotation.z = -((minutes % 720) / 720) * Math.PI * 2;
		door.hands[1].rotation.z = -((minutes % 60) / 60) * Math.PI * 2;
	}

	const obstacles = [
		...(iron.obstacles || []),
		...(classes.obstacles || []),
		...(recovery.obstacles || []),
		...(desk.obstacles || []),
	];

	return { bgGroup, fgGroup, apply, plates: desk.plates, bag: classes.bag, bar: iron.bar, obstacles };
}
