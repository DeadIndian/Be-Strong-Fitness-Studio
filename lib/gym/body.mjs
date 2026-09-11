/**
 * The man: his bones, and everything he does in the hall.
 *
 * Pure data and pure arithmetic. The rig nests one Object3D per bone and lets the
 * scene graph do the forward kinematics, so nothing here needs a matrix.
 *
 * Two conventions, and they are opposite because a chain pointing up and a chain
 * pointing down cannot share a sense of "forward":
 *
 *   · He faces +Z. Every bone's mesh runs along its own local -Y (`up: false`) or
 *     local +Y (`up: true`), and its child's offset is that same length.
 *   · On a limb (`up: false`) a NEGATIVE x-rotation swings the tip FORWARD.
 *     On the torso (`up: true`) a POSITIVE x-rotation leans it FORWARD.
 *   · z-rotation opens a limb outward on his left (+x) and inward on his right.
 *
 * body.test.mjs runs forward kinematics of its own over this data and asserts the
 * poses are anatomically possible — feet near the floor, hands out of the chest,
 * the leading foot actually leading. That check is why the sign rules above can be
 * trusted rather than re-derived every time a clip is edited.
 */

/**
 * Hip height standing: two leg segments, the ankle, and the thickness of the foot
 * capsule, so the sole of a resting foot lands exactly on y = 0. Sets his whole
 * scale — he comes out 1.74 m to the top of his head.
 */
export const HIP_H = 0.895;

/**
 * How far one step carries him, in the hall's own units, which are metres. Not a dial:
 * it is a measurement of the poses below, and body.test.mjs re-measures it by forward
 * kinematics. If a leg key is edited, this number moves or the test fails — which
 * matters because the cadence is derived from it, and a cadence that disagrees with the
 * stride is a man whose feet slide.
 *
 * ponytail: a four-key cycle cannot hold a contact patch perfectly still — his heel
 * wants a 0.48 m step over early stance and his toe wants 0.75 m over late stance, so
 * whatever single number goes here leaves ±7 cm of skate across a footfall. That is 4%
 * of his height at a size where he is a few hundred pixels tall. Eight keys and foot IK
 * are what would fix it, if anyone ever looks that closely.
 */
export const STRIDE = { walk: 0.61, run: 1 };

/** name, parent, offset in the parent's frame, length, radius, points up. */
export const BONES = [
	["hips", null, [0, 0, 0], 0.13, 0.118, true],
	["spine", "hips", [0, 0.13, 0], 0.19, 0.1, true],
	["chest", "spine", [0, 0.19, 0], 0.21, 0.124, true],
	["neck", "chest", [0, 0.21, 0], 0.07, 0.043, true],
	["head", "neck", [0, 0.07, 0], 0.15, 0.097, true],

	["upperArmL", "chest", [0.165, 0.185, 0], 0.27, 0.05, false],
	["foreArmL", "upperArmL", [0, -0.27, 0], 0.25, 0.041, false],
	["handL", "foreArmL", [0, -0.25, 0], 0.1, 0.038, false],
	["upperArmR", "chest", [-0.165, 0.185, 0], 0.27, 0.05, false],
	["foreArmR", "upperArmR", [0, -0.27, 0], 0.25, 0.041, false],
	["handR", "foreArmR", [0, -0.25, 0], 0.1, 0.038, false],

	["thighL", "hips", [0.085, 0, 0], 0.43, 0.074, false],
	["shinL", "thighL", [0, -0.43, 0], 0.41, 0.056, false],
	["footL", "shinL", [0, -0.41, 0], 0.17, 0.046, false],
	["thighR", "hips", [-0.085, 0, 0], 0.43, 0.074, false],
	["shinR", "thighR", [0, -0.43, 0], 0.41, 0.056, false],
	["footR", "shinR", [0, -0.41, 0], 0.17, 0.046, false],
];

/** A foot flat on the floor is a quarter turn out of the shin it hangs from. */
const FLAT = -Math.PI / 2;

/**
 * Standing at ease. Every clip below is a *delta* on this, which is what makes the
 * clips readable, blendable and short: a walk cycle only has to say what a walk
 * does differently, and two clips at half weight each are the average of what they
 * change rather than a fight over every bone in the body.
 */
export const REST = {
	hips: [0, 0, 0],
	spine: [0.02, 0, 0],
	chest: [0.03, 0, 0],
	neck: [-0.06, 0, 0],
	head: [0.02, 0, 0],
	upperArmL: [-0.06, 0, 0.14],
	foreArmL: [-0.22, 0, -0.06],
	handL: [0, 0, 0],
	upperArmR: [-0.06, 0, -0.14],
	foreArmR: [-0.22, 0, 0.06],
	handR: [0, 0, 0],
	thighL: [0, 0, 0.03],
	shinL: [0.06, 0, 0],
	footL: [FLAT, 0, 0],
	thighR: [0, 0, -0.03],
	shinR: [0.06, 0, 0],
	footR: [FLAT, 0, 0],
};

/**
 * The other half of a cycle, generated rather than typed. Swap left for right and
 * flip the two axes that have a handedness. Half the data, and no chance of a
 * transposed sign that only shows up as a limp.
 */
export function mirror(pose) {
	const out = {};
	for (const name of Object.keys(pose)) {
		const [x, y, z] = pose[name];
		const side = name.endsWith("L") ? "R" : name.endsWith("R") ? "L" : "";
		out[side ? name.slice(0, -1) + side : name] = [x, -y, -z];
	}
	return out;
}

/*
 * The locomotion keys are not free-hand. A leg is a fixed 0.84 m of bone, so the
 * angle it is swung to decides how far off the floor its foot ends up: swing a thigh
 * 30° and the foot cannot reach the ground unless the pelvis drops to meet it. Every
 * key below is solved against that, with `bob`'s pelvis drop as the other half of the
 * equation — which is why the numbers look arbitrary and are not. Move one and the
 * floor test in body.test.mjs will say so.
 */

// Double support: the left heel lands as the right toe pushes off. Arms counter-swung.
const WALK_STRIKE = {
	thighL: [-0.3, 0, 0],
	shinL: [-0.04, 0, 0],
	footL: [0.02, 0, 0],
	thighR: [0.32, 0, 0],
	shinR: [0.22, 0, 0],
	footR: [-0.27, 0, 0],
	upperArmL: [0.32, 0, 0],
	foreArmL: [0.08, 0, 0],
	upperArmR: [-0.32, 0, 0],
	foreArmR: [-0.3, 0, 0],
	spine: [0.02, 0, 0],
};

// Mid-stance: the standing leg is straight under him — the one moment the pelvis is
// at full height — while the other knee comes through with the heel tucked behind.
// The swing foot clears by 12 cm, which looks like too much and is not: a quarter of
// a cycle is all it has to lift and land in, so anything less reads as a drag.
const WALK_PASS = {
	thighL: [0, 0, 0],
	shinL: [0, 0, 0],
	footL: [0, 0, 0],
	thighR: [-0.3, 0, 0],
	shinR: [0.94, 0, 0],
	footR: [-0.7, 0, 0],
	upperArmL: [0.1, 0, 0],
	foreArmL: [0, 0, 0],
	upperArmR: [-0.1, 0, 0],
	foreArmR: [-0.15, 0, 0],
	spine: [0.02, 0, 0],
};

// Forefoot strike, knee deep to absorb it, the other heel already folded up behind.
const RUN_STRIKE = {
	thighL: [-0.5, 0, 0],
	shinL: [1.1, 0, 0],
	footL: [-0.22, 0, 0],
	thighR: [0.3, 0, 0],
	shinR: [1.19, 0, 0],
	footR: [0.25, 0, 0],
	upperArmL: [0.75, 0, 0],
	foreArmL: [-1.0, 0, 0],
	upperArmR: [-0.75, 0, 0],
	foreArmR: [-1.15, 0, 0],
	spine: [0.16, 0, 0],
	chest: [0.1, 0, 0],
	neck: [-0.14, 0, 0],
};

/*
 * Flight: nothing is touching. A quarter of a cycle after the LEFT foot struck, it is
 * the RIGHT knee that is driven up — the struck leg is behind him, pushing off. Getting
 * this the wrong way round is not a wrong-looking pose, it is a foot that travels
 * forwards while it is supposed to be planted, so `body.test.mjs` measures the sign.
 */
const RUN_FLIGHT = {
	thighR: [-0.95, 0, 0],
	shinR: [1.09, 0, 0],
	footR: [-0.2, 0, 0],
	thighL: [0.84, 0, 0],
	shinL: [0.79, 0, 0],
	footL: [-0.3, 0, 0],
	upperArmR: [0.3, 0, 0],
	foreArmR: [-1.1, 0, 0],
	upperArmL: [-0.3, 0, 0],
	foreArmL: [-1.1, 0, 0],
	spine: [0.16, 0, 0],
	chest: [0.1, 0, 0],
	neck: [-0.14, 0, 0],
};

const cycle = (strike, pass) => ({
	loop: true,
	keys: [
		{ p: 0, pose: strike },
		{ p: 0.25, pose: pass },
		{ p: 0.5, pose: mirror(strike) },
		{ p: 0.75, pose: mirror(pass) },
	],
});

/*
 * What he does when he is standing still at each station. `period` is how long one
 * pass takes, in seconds — the locomotion cycles have no period because they are
 * driven by distance covered, not by elapsed time, which is the only way his feet
 * stay planted when the visitor scrolls slowly.
 *
 * Every key of a clip lists the same bones. A bone missing from one key reads as a
 * zero delta there, which is correct arithmetic and a very convincing twitch.
 */
export const CLIPS = {
	stand: { loop: true, period: 4, keys: [{ p: 0, pose: {} }] },
	walk: cycle(WALK_STRIKE, WALK_PASS),
	run: cycle(RUN_STRIKE, RUN_FLIGHT),

	// DOOR. Shoulder rolls, a reach overhead, then folding down over the knees.
	stretch: {
		loop: true,
		period: 7.5,
		keys: [
			{ p: 0, pose: { upperArmL: [0, 0, 0.45], upperArmR: [0, 0, -0.45], foreArmL: [0, 0, 0], foreArmR: [0, 0, 0], spine: [0, 0, 0], chest: [0.04, 0, 0], neck: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
			{ p: 0.28, pose: { upperArmL: [-0.1, 0, 1.3], upperArmR: [-0.1, 0, -1.3], foreArmL: [0.15, 0, 0], foreArmR: [0.15, 0, 0], spine: [0, 0, 0], chest: [-0.05, 0, 0], neck: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
			{ p: 0.55, pose: { upperArmL: [0, 0, 2.6], upperArmR: [0, 0, -2.6], foreArmL: [0.2, 0, 0], foreArmR: [0.2, 0, 0], spine: [-0.06, 0, 0], chest: [-0.1, 0, 0], neck: [0.08, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
			{ p: 0.8, pose: { upperArmL: [-0.55, 0, 0.2], upperArmR: [-0.55, 0, -0.2], foreArmL: [0.18, 0, 0], foreArmR: [0.18, 0, 0], spine: [0.55, 0, 0], chest: [0.18, 0, 0], neck: [-0.4, 0, 0], thighL: [-0.18, 0, 0], thighR: [-0.18, 0, 0] } },
		],
	},

	// IRON. Set up, pull, hold, put it down. The most legible thing a gym does.
	deadlift: {
		loop: true,
		period: 4.2,
		keys: [
			{ p: 0, root: { y: -0.10, z: 0.02 }, pose: { spine: [0.72, 0, 0], chest: [0.16, 0, 0], neck: [-0.55, 0, 0], thighL: [-0.95, 0, 0], thighR: [-0.95, 0, 0], shinL: [1.05, 0, 0], shinR: [1.05, 0, 0], footL: [-0.08, 0, 0], footR: [-0.08, 0, 0], upperArmL: [-0.6, 0, -0.06], upperArmR: [-0.6, 0, 0.06], foreArmL: [0.32, 0, 0], foreArmR: [0.32, 0, 0] } },
			{ p: 0.3, root: { y: 0, z: 0 }, pose: { spine: [-0.02, 0, 0], chest: [-0.06, 0, 0], neck: [0.02, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], shinL: [-0.04, 0, 0], shinR: [-0.04, 0, 0], footL: [0, 0, 0], footR: [0, 0, 0], upperArmL: [0, 0, -0.12], upperArmR: [0, 0, 0.12], foreArmL: [0.2, 0, 0], foreArmR: [0.2, 0, 0] } },
			{ p: 0.48, root: { y: 0, z: 0 }, pose: { spine: [-0.02, 0, 0], chest: [-0.08, 0, 0], neck: [0.02, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], shinL: [-0.04, 0, 0], shinR: [-0.04, 0, 0], footL: [0, 0, 0], footR: [0, 0, 0], upperArmL: [0, 0, -0.12], upperArmR: [0, 0, 0.12], foreArmL: [0.2, 0, 0], foreArmR: [0.2, 0, 0] } },
			{ p: 0.78, root: { y: -0.05, z: 0.02 }, pose: { spine: [0.55, 0, 0], chest: [0.12, 0, 0], neck: [-0.4, 0, 0], thighL: [-0.72, 0, 0], thighR: [-0.72, 0, 0], shinL: [0.85, 0, 0], shinR: [0.85, 0, 0], footL: [-0.06, 0, 0], footR: [-0.06, 0, 0], upperArmL: [-0.48, 0, -0.08], upperArmR: [-0.48, 0, 0.08], foreArmL: [0.26, 0, 0], foreArmR: [0.26, 0, 0] } },
		],
	},

	// CLASSES. Guard, jab, guard, cross, guard, on a bag that swings back at him.
	punch: {
		loop: true,
		period: 3,
		keys: [
			{ p: 0, pose: { upperArmL: [-1.25, 0, 0.3], foreArmL: [-1.3, 0, 0], upperArmR: [-1.15, 0, -0.28], foreArmR: [-1.4, 0, 0], spine: [0.05, 0.18, 0], thighL: [-0.15, 0, 0], thighR: [0.12, 0, 0] } },
			{ p: 0.18, pose: { upperArmL: [-1.55, 0, 0.1], foreArmL: [-0.15, 0, 0], upperArmR: [-1.15, 0, -0.28], foreArmR: [-1.4, 0, 0], spine: [0.06, 0.3, 0], thighL: [-0.2, 0, 0], thighR: [0.14, 0, 0] } },
			{ p: 0.36, pose: { upperArmL: [-1.25, 0, 0.3], foreArmL: [-1.3, 0, 0], upperArmR: [-1.15, 0, -0.28], foreArmR: [-1.4, 0, 0], spine: [0.05, 0.18, 0], thighL: [-0.15, 0, 0], thighR: [0.12, 0, 0] } },
			{ p: 0.62, pose: { upperArmL: [-1.25, 0, 0.3], foreArmL: [-1.35, 0, 0], upperArmR: [-1.6, 0, -0.1], foreArmR: [-0.15, 0, 0], spine: [0.1, -0.34, 0], thighL: [-0.24, 0, 0], thighR: [0.18, 0, 0] } },
			{ p: 0.82, pose: { upperArmL: [-1.25, 0, 0.3], foreArmL: [-1.3, 0, 0], upperArmR: [-1.15, 0, -0.28], foreArmR: [-1.4, 0, 0], spine: [0.05, 0.18, 0], thighL: [-0.15, 0, 0], thighR: [0.12, 0, 0] } },
		],
	},

	// RECOVERY. In the massage chair. The hips drop, so this one moves his root.
	sit: {
		loop: true,
		period: 6,
		root: { y: -0.35, z: -0.12 },
		keys: [
			{ p: 0, pose: { thighL: [-1.42, 0, 0.06], thighR: [-1.42, 0, -0.06], shinL: [1.4, 0, 0], shinR: [1.4, 0, 0], footL: [0, 0, 0], footR: [0, 0, 0], spine: [-0.16, 0, 0], chest: [-0.12, 0, 0], neck: [0.14, 0, 0], upperArmL: [0, 0, 0.3], upperArmR: [0, 0, -0.3], foreArmL: [-0.85, 0, 0], foreArmR: [-0.85, 0, 0] } },
			{ p: 0.5, pose: { thighL: [-1.4, 0, 0.06], thighR: [-1.44, 0, -0.06], shinL: [1.42, 0, 0], shinR: [1.38, 0, 0], footL: [0.04, 0, 0], footR: [-0.04, 0, 0], spine: [-0.2, 0, 0], chest: [-0.16, 0, 0], neck: [0.18, 0, 0], upperArmL: [0, 0, 0.34], upperArmR: [0, 0, -0.34], foreArmL: [-0.8, 0, 0], foreArmR: [-0.8, 0, 0] } },
		],
	},

	// DESK. A step in, lean on the counter, sign the ledger.
	sign: {
		loop: true,
		period: 4,
		root: { z: 0.16 },
		keys: [
			{ p: 0, pose: { spine: [0.28, 0, 0], chest: [0.12, 0, 0], neck: [-0.28, 0, 0], upperArmR: [-0.8, 0, -0.42], foreArmR: [-1, 0, 0], handR: [0, 0, 0], upperArmL: [-0.5, 0, 0.28], foreArmL: [-1.35, 0, 0], thighL: [-0.1, 0, 0], thighR: [0.06, 0, 0] } },
			{ p: 0.35, pose: { spine: [0.3, 0, 0], chest: [0.12, 0, 0], neck: [-0.3, 0, 0], upperArmR: [-0.82, 0, -0.4], foreArmR: [-1.2, 0, 0], handR: [0, 0, 0.25], upperArmL: [-0.5, 0, 0.28], foreArmL: [-1.35, 0, 0], thighL: [-0.1, 0, 0], thighR: [0.06, 0, 0] } },
			{ p: 0.7, pose: { spine: [0.28, 0, 0], chest: [0.12, 0, 0], neck: [-0.28, 0, 0], upperArmR: [-0.78, 0, -0.44], foreArmR: [-1, 0, 0], handR: [0, 0, -0.15], upperArmL: [-0.5, 0, 0.28], foreArmL: [-1.35, 0, 0], thighL: [-0.1, 0, 0], thighR: [0.06, 0, 0] } },
		],
	},

	// DESK, once, when a term is chosen: he squats, takes its plate, loads the bar.
	plate: {
		loop: false,
		period: 1.5,
		keys: [
			{ p: 0, pose: { spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], upperArmR: [0, 0, 0], foreArmR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], shinL: [0, 0, 0], shinR: [0, 0, 0] } },
			{ p: 0.32, pose: { spine: [0.55, 0, 0], chest: [0.14, 0, 0], neck: [-0.42, 0, 0], upperArmR: [-0.5, 0, -0.18], foreArmR: [0.1, 0, 0], thighL: [-0.42, 0, 0], thighR: [-0.42, 0, 0], shinL: [0.48, 0, 0], shinR: [0.48, 0, 0] } },
			{ p: 0.66, pose: { spine: [0.1, 0, 0], chest: [0.04, 0, 0], neck: [-0.1, 0, 0], upperArmR: [-1.2, 0, -0.3], foreArmR: [-0.95, 0, 0], thighL: [-0.1, 0, 0], thighR: [-0.1, 0, 0], shinL: [0.12, 0, 0], shinR: [0.12, 0, 0] } },
			{ p: 1, pose: { spine: [0.3, 0, 0], chest: [0.08, 0, 0], neck: [-0.22, 0, 0], upperArmR: [-0.72, 0, -0.1], foreArmR: [-0.3, 0, 0], thighL: [-0.18, 0, 0], thighR: [-0.18, 0, 0], shinL: [0.2, 0, 0], shinR: [0.2, 0, 0] } },
		],
	},
};

/** What he is doing at each of the five stations, in walk-in order. */
export const STATION_CLIPS = ["stretch", "deadlift", "punch", "sit", "sign"];

const ZERO = [0, 0, 0];
const ease = (t) => t * t * (3 - 2 * t);

/** One frame of a clip: the delta pose at `p`, and the root offset it carries. */
export function sampleClip(clip, p) {
	const keys = clip?.keys ?? [];
	const root = clip?.root ?? null;
	if (!keys.length) return { pose: {}, root };
	if (keys.length === 1) return { pose: keys[0].pose, root: keys[0].root ?? root };

	let u = Number.isFinite(p) ? p : 0;
	if (clip.loop) {
		const base = keys[0].p;
		u = base + ((((u - base) % 1) + 1) % 1);
	} else {
		u = u < 0 ? 0 : u > 1 ? 1 : u;
	}

	let index = keys.length - 1;
	for (let k = 0; k < keys.length; k += 1) if (u >= keys[k].p) index = k;

	const from = keys[index];
	const wrapping = index === keys.length - 1;
	const to = clip.loop && wrapping ? keys[0] : keys[Math.min(index + 1, keys.length - 1)];
	const toP = clip.loop && wrapping ? keys[0].p + 1 : to.p;
	const span = toP - from.p;
	const t = span > 0 ? ease((u - from.p) / span) : 0;

	const pose = {};
	for (const name of Object.keys(from.pose)) pose[name] = null;
	for (const name of Object.keys(to.pose)) pose[name] = null;
	for (const name of Object.keys(pose)) {
		const a = from.pose[name] ?? ZERO;
		const b = to.pose[name] ?? ZERO;
		pose[name] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
	}

	const fromRoot = from.root ?? root;
	const toRoot = to.root ?? root;
	let sampledRoot = root;
	if (fromRoot || toRoot) {
		const rA = fromRoot ?? {};
		const rB = toRoot ?? {};
		sampledRoot = {};
		if (rA.x !== undefined || rB.x !== undefined) sampledRoot.x = (rA.x ?? 0) + ((rB.x ?? 0) - (rA.x ?? 0)) * t;
		if (rA.y !== undefined || rB.y !== undefined) sampledRoot.y = (rA.y ?? 0) + ((rB.y ?? 0) - (rA.y ?? 0)) * t;
		if (rA.z !== undefined || rB.z !== undefined) sampledRoot.z = (rA.z ?? 0) + ((rB.z ?? 0) - (rA.z ?? 0)) * t;
		if (rA.ry !== undefined || rB.ry !== undefined) sampledRoot.ry = (rA.ry ?? 0) + ((rB.ry ?? 0) - (rA.ry ?? 0)) * t;
	}

	return { pose, root: sampledRoot };
}

/**
 * Several things at once, by weight. Deltas are small angles over one rest pose, so
 * a weighted sum is the right blend and a quaternion slerp would be machinery for
 * an answer nobody could tell apart.
 */
export function blendDeltas(entries) {
	const out = {};
	for (const entry of entries ?? []) {
		const pose = entry?.pose;
		const weight = entry?.weight ?? 0;
		if (!pose || !(weight > 0)) continue;
		for (const name of Object.keys(pose)) {
			const value = pose[name];
			const accumulated = out[name] ?? (out[name] = [0, 0, 0]);
			accumulated[0] += value[0] * weight;
			accumulated[1] += value[1] * weight;
			accumulated[2] += value[2] * weight;
		}
	}
	return out;
}

/** Where the blend puts his hips, for the clips that sit him down or step him in. */
export function blendRoots(entries) {
	const out = { x: 0, y: 0, z: 0, ry: 0 };
	for (const entry of entries ?? []) {
		const root = entry?.root;
		const weight = entry?.weight ?? 0;
		if (!root || !(weight > 0)) continue;
		out.x += (root.x ?? 0) * weight;
		out.y += (root.y ?? 0) * weight;
		out.z += (root.z ?? 0) * weight;
		out.ry += (root.ry ?? 0) * weight;
	}
	return out;
}

/** Rest plus whatever the blend came to: the pose the rig actually writes. */
export function resolve(delta) {
	const out = {};
	for (const name of Object.keys(REST)) {
		const base = REST[name];
		const d = delta?.[name];
		out[name] = d ? [base[0] + d[0], base[1] + d[1], base[2] + d[2]] : base;
	}
	return out;
}

/**
 * He is never actually still. Breathing runs on wall-clock time, not on the walk,
 * so a reader who stops scrolling is looking at a man standing there rather than a
 * paused frame. This one addition is most of the difference between the two.
 */
export function breath(seconds) {
	const t = Number.isFinite(seconds) ? seconds : 0;
	const chest = Math.sin(t * 1.7);
	const sway = Math.sin(t * 0.73);
	return {
		chest: [chest * 0.018, 0, 0],
		neck: [-chest * 0.012, 0, 0],
		upperArmL: [0, 0, chest * 0.022],
		upperArmR: [0, 0, -chest * 0.022],
		hips: [0, sway * 0.02, sway * 0.012],
	};
}

/**
 * The hips through a stride: lowest at each footfall, highest at mid-stance, rolling
 * about the spine. Without this he glides, and gliding is the single thing that gives
 * away a walk cycle. The amplitude is not taste either — it is the drop that lets a
 * swung leg's foot reach the floor at all, so it is solved with the keys above.
 */
export function bob(phase, gait) {
	const walk = gait?.walk ?? 0;
	const run = gait?.run ?? 0;
	const p = Number.isFinite(phase) ? phase : 0;
	const turn = p * Math.PI * 2;
	return {
		y: -(walk * 0.048 + run * 0.07) * Math.abs(Math.cos(turn)),
		roll: Math.sin(turn) * (walk * 0.035 + run * 0.07),
	};
}
