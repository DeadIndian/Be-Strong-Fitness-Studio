/**
 * What a body is, and how it moves. Pure — no three.js — so `node --test` can hold the
 * anatomy and the clips without a GPU.
 *
 * A pose is a flat object of joint angles in radians. A clip is `(t) => pose` over t in
 * [0, 1). That is the whole animation system. `figure.js` turns a pose into steel.
 *
 * He faces +x with the camera on +z, so the sagittal plane is xy and every single-axis
 * joint rotates about Z. Positive always means anatomical flexion; each bone carries a
 * `flex` sign so that stays true whichever way the bone hangs.
 */

/** A 1.75 m man in rig.js units, where 1 unit = 500 mm. */
export const MAN_H = 3.5;

/** Drillis & Contini segment ratios, as fractions of standing height. */
export const SEG = {
	ankle: 0.039,
	shin: 0.246,
	thigh: 0.245,
	torso: 0.288,
	neck: 0.052,
	head: 0.13,
	upperArm: 0.172,
	forearm: 0.157,
	hand: 0.108,
	foot: 0.152,
	shoulders: 0.259,
	hips: 0.191,
};

/** Standing hip height: ankle, shin and thigh stacked. */
export const HIP_H = MAN_H * (SEG.ankle + SEG.shin + SEG.thigh);

/** Anatomical range per joint family, radians. Nothing may leave these. */
export const LIMITS = {
	pelvis: [-0.6, 0.6],
	spine: [-0.75, 0.75],
	neck: [-0.6, 0.6],
	shoulder: [-2.9, 2.9],
	elbow: [0, 2.6],
	wrist: [-0.9, 0.9],
	hip: [-1.3, 1.9],
	knee: [-2.4, 0],
	ankle: [-0.8, 0.8],
};

export const JOINTS = [
	"pelvis",
	"spine",
	"neck",
	"shoulderL",
	"shoulderR",
	"elbowL",
	"elbowR",
	"wristL",
	"wristR",
	"hipL",
	"hipR",
	"kneeL",
	"kneeR",
	"ankleL",
	"ankleR",
];

/** `elbowL` and `elbowR` are one joint family with one range. */
export function limitOf(joint) {
	return LIMITS[joint.replace(/[LR]$/, "")];
}

/**
 * Standing at ease. Shoulders carry `[swing, out]` — swing in the sagittal plane, out
 * to the side — so the arms hang with a little clearance instead of inside the ribs.
 */
export function restPose() {
	return {
		root: [0, 0, 0],
		pelvis: 0,
		spine: 0,
		neck: 0,
		shoulderL: [0, 0.14],
		shoulderR: [0, -0.14],
		elbowL: 0.12,
		elbowR: 0.12,
		wristL: 0,
		wristR: 0,
		hipL: 0,
		hipR: 0,
		kneeL: -0.08,
		kneeR: -0.08,
		ankleL: 0,
		ankleR: 0,
	};
}

const U = (ratio) => ratio * MAN_H;

/** Legs and arms hang downward, so their rest is a half turn about Z. */
const DOWN = [0, 0, Math.PI];

/**
 * The pelvis is a stub *inside* the floor-to-crown stack, not an extra storey on top of
 * it: `SEG` already sums to 1 with `torso` meaning hip-to-shoulder. So both the spine and
 * the thighs hang from the pelvis's origin, `-PELVIS` back along it.
 */
const PELVIS = 0.26;

/**
 * The chain, parent before child. `joint` names the angle that drives the bone, `flex`
 * the sign that makes positive mean flexion, `offset` where the pivot sits relative to
 * the parent's far end, and `rest` the bone's resting Euler.
 */
export const TORSO = [
	{
		name: "pelvis",
		parent: null,
		joint: "pelvis",
		flex: -1,
		len: PELVIS,
		r: 0.15,
		offset: [0, 0, 0],
		rest: [0, 0, 0],
	},
	{
		name: "spine",
		parent: "pelvis",
		joint: "spine",
		flex: -1,
		len: U(SEG.torso),
		r: 0.17,
		offset: [0, -PELVIS, 0],
		rest: [0, 0, 0],
	},
	{
		name: "neck",
		parent: "spine",
		joint: "neck",
		flex: -1,
		len: U(SEG.neck),
		r: 0.07,
		offset: [0, 0, 0],
		rest: [0, 0, 0],
	},
	// The head rides the neck. `flex: 0` is how it does not nod a second time on top of it.
	{
		name: "head",
		parent: "neck",
		joint: "neck",
		flex: 0,
		len: U(SEG.head),
		r: 0.145,
		offset: [0, 0, 0],
		rest: [0, 0, 0],
	},
];

function side(tag, sign) {
	// His lateral axis is z, so a pair spreads across z and never across x.
	const shoulder = (U(SEG.shoulders) / 2) * sign;
	// The femoral heads sit about halfway out along the pelvis, not at its edge.
	const hip = (U(SEG.hips) / 4) * sign;
	return [
		{
			name: `upperArm${tag}`,
			parent: "spine",
			joint: `shoulder${tag}`,
			flex: 1,
			len: U(SEG.upperArm),
			r: 0.085,
			offset: [0, -0.06, shoulder],
			rest: DOWN,
		},
		{
			name: `forearm${tag}`,
			parent: `upperArm${tag}`,
			joint: `elbow${tag}`,
			flex: 1,
			len: U(SEG.forearm),
			r: 0.07,
			offset: [0, 0, 0],
			rest: [0, 0, 0],
		},
		{
			name: `hand${tag}`,
			parent: `forearm${tag}`,
			joint: `wrist${tag}`,
			flex: 1,
			len: U(SEG.hand),
			r: 0.06,
			offset: [0, 0, 0],
			rest: [0, 0, 0],
		},
		{
			name: `thigh${tag}`,
			parent: "pelvis",
			joint: `hip${tag}`,
			flex: 1,
			len: U(SEG.thigh),
			r: 0.115,
			offset: [0, -PELVIS, hip],
			rest: DOWN,
		},
		{
			name: `shin${tag}`,
			parent: `thigh${tag}`,
			joint: `knee${tag}`,
			flex: 1,
			len: U(SEG.shin),
			r: 0.095,
			offset: [0, 0, 0],
			rest: [0, 0, 0],
		},
		// Toes toward +x, the way he faces.
		{
			name: `foot${tag}`,
			parent: `shin${tag}`,
			joint: `ankle${tag}`,
			flex: 1,
			len: U(SEG.foot),
			r: 0.075,
			offset: [0, 0, 0],
			rest: [0, 0, Math.PI / 2],
		},
	];
}

export const BONES = [...TORSO, ...side("L", 1), ...side("R", -1)];

const TAU = Math.PI * 2;

/** Arms lag the torso by about 60 ms. Overlap is what reads as flesh, not linkage. */
const LAG = 0.055;

/** Slow resting respiration, in cycles per second. */
const BREATH_HZ = 0.37;

const clamp = (value, [low, high]) => Math.min(high, Math.max(low, value));

const mix = (a, b, m) => a + (b - a) * m;

/** The lagged phase, wrapped. Wrapping is what keeps a looping clip closing on itself. */
const lagged = (t) => {
	const shifted = t - LAG;
	return shifted - Math.floor(shifted);
};

/** Cross-fade two poses. Arrays blend element-wise, so shoulders survive the crossing. */
export function blend(a, b, m) {
	if (m <= 0) return { ...a };
	if (m >= 1) return { ...b };
	const out = {};
	for (const key of Object.keys(a)) {
		const from = a[key];
		const to = key in b ? b[key] : from;
		out[key] = Array.isArray(from)
			? from.map((value, index) => mix(value, Array.isArray(to) ? to[index] : to, m))
			: mix(from, to, m);
	}
	return out;
}

/**
 * The one motion that never stops. It runs on the wall clock rather than a clip's `t`,
 * which is both why he keeps breathing while a paragraph is read and why the clips
 * themselves can still close exactly on their own period.
 */
export function breath(pose, seconds) {
	const wave = Math.sin(TAU * BREATH_HZ * seconds);
	return {
		...pose,
		spine: clamp(pose.spine + wave * 0.022, LIMITS.spine),
		neck: clamp(pose.neck - wave * 0.014, LIMITS.neck),
	};
}

/** A pose is the rest pose with a few joints overridden. */
export function posed(over) {
	return { ...restPose(), ...over };
}

/** Idle. Weight rocks from one leg to the other; the arms follow a beat behind. */
export function stand(t) {
	const sway = Math.sin(TAU * t);
	const arm = Math.sin(TAU * lagged(t));
	return posed({
		root: [0, sway * 0.012, 0],
		pelvis: sway * 0.05,
		spine: -sway * 0.03,
		shoulderL: [arm * 0.05, 0.14],
		shoulderR: [-arm * 0.05, -0.14],
		elbowL: 0.12 + Math.max(0, arm) * 0.1,
		elbowR: 0.12 + Math.max(0, -arm) * 0.1,
		kneeL: -0.08 - Math.max(0, sway) * 0.06,
		kneeR: -0.08 - Math.max(0, -sway) * 0.06,
	});
}

/** Between sets: he looks up the shaft, then back down at the bar. */
export function look(t) {
	const scan = Math.sin(TAU * t);
	const base = stand(t);
	return {
		...base,
		neck: clamp(base.neck + scan * 0.48, LIMITS.neck),
		spine: clamp(base.spine + Math.max(0, scan) * 0.06, LIMITS.spine),
	};
}

/** One rep on the loaded bar. `drive` is the rep; the elbows run a beat behind it. */
export function press(t) {
	const drive = (1 - Math.cos(TAU * t)) / 2;
	const arm = (1 - Math.cos(TAU * lagged(t))) / 2;
	const swing = 1.15 + drive * 1.35;
	return posed({
		root: [0, drive * 0.06, 0],
		pelvis: -drive * 0.04,
		spine: -0.05 + drive * 0.08,
		neck: -drive * 0.16,
		shoulderL: [swing, 0.3 - drive * 0.14],
		shoulderR: [swing, -(0.3 - drive * 0.14)],
		elbowL: 2.15 - arm * 2.0,
		elbowR: 2.15 - arm * 2.0,
		wristL: -0.2,
		wristR: -0.2,
		hipL: 0.04,
		hipR: 0.04,
		kneeL: -0.1 - (1 - drive) * 0.06,
		kneeR: -0.1 - (1 - drive) * 0.06,
	});
}

/** One plate onto the sleeve: stoop for it, stand with it, place it, go back down. */
export function load(t) {
	const stoop = Math.max(0, Math.sin(TAU * t)) ** 1.4;
	const carry = Math.max(0, -Math.sin(TAU * lagged(t)));
	return posed({
		root: [carry * 0.12, -stoop * 0.5, 0],
		pelvis: stoop * 0.42,
		spine: -stoop * 0.34 + carry * 0.1,
		neck: stoop * 0.3 - carry * 0.08,
		shoulderL: [stoop * 0.5 + carry * 0.85, 0.14 + carry * 0.1],
		shoulderR: [stoop * 0.5 + carry * 0.85, -0.14 - carry * 0.1],
		elbowL: 0.25 + carry * 1.1,
		elbowR: 0.25 + carry * 1.1,
		wristL: -carry * 0.3,
		wristR: -carry * 0.3,
		hipL: stoop * 1.15,
		hipR: stoop * 1.15,
		kneeL: -0.08 - stoop * 1.5,
		kneeR: -0.08 - stoop * 1.5,
		ankleL: stoop * 0.35,
		ankleR: stoop * 0.35,
	});
}

/** A leg only bends on its swing half. Straight on the stance half, or he limps. */
const swingKnee = (phase) => -Math.max(0, -Math.sin(TAU * phase)) * 0.8 - 0.1;

/** One period is one full stride — two steps — so the walk cycles without a hitch. */
export function walk(t) {
	const step = Math.sin(TAU * t);
	const arm = Math.sin(TAU * lagged(t));
	return posed({
		root: [0, -0.04 + Math.abs(Math.cos(TAU * t)) * 0.05, 0],
		pelvis: step * 0.08,
		spine: -0.04 - Math.abs(step) * 0.03,
		shoulderL: [-arm * 0.5, 0.16],
		shoulderR: [arm * 0.5, -0.16],
		elbowL: 0.3 + Math.max(0, -arm) * 0.35,
		elbowR: 0.3 + Math.max(0, arm) * 0.35,
		hipL: step * 0.55,
		hipR: -step * 0.55,
		kneeL: swingKnee(t),
		kneeR: swingKnee(t + 0.5),
		ankleL: -step * 0.2,
		ankleR: step * 0.2,
	});
}

/** The treadmill: the walk with the amplitudes opened up and a real flight phase. */
export function run(t) {
	const step = Math.sin(TAU * t);
	const arm = Math.sin(TAU * lagged(t));
	const bounce = Math.abs(Math.cos(TAU * t));
	return posed({
		root: [0, -0.06 + bounce * 0.16, 0],
		pelvis: step * 0.12,
		spine: -0.16 - Math.abs(step) * 0.04,
		neck: -0.1,
		shoulderL: [-arm * 0.95, 0.2],
		shoulderR: [arm * 0.95, -0.2],
		elbowL: 1.5 + Math.max(0, -arm) * 0.5,
		elbowR: 1.5 + Math.max(0, arm) * 0.5,
		hipL: step * 0.95,
		hipR: -step * 0.95,
		kneeL: swingKnee(t) - Math.max(0, -Math.sin(TAU * t)) * 0.7,
		kneeR: swingKnee(t + 0.5) - Math.max(0, -Math.sin(TAU * (t + 0.5))) * 0.7,
		ankleL: -step * 0.3,
		ankleR: step * 0.3,
	});
}

/**
 * Off the edge. Anticipation is the whole point of the first third: he dips before he
 * goes, so the fall reads as his decision rather than the scrollbar's.
 */
export function jump(t) {
	const dip = t < 0.35 ? Math.sin((Math.PI * t) / 0.35) : 0;
	const push = t < 0.35 ? 0 : (t - 0.35) / 0.65;
	const tuck = Math.sin(Math.PI * push) ** 2;
	return posed({
		root: [0, -dip * 0.55 + push * 1.4, push * 0.35],
		pelvis: dip * 0.3 - push * 0.1,
		spine: -dip * 0.28 + push * 0.16,
		neck: dip * 0.2 - push * 0.24,
		shoulderL: [-dip * 0.6 + push * 1.6, 0.18],
		shoulderR: [-dip * 0.6 + push * 1.6, -0.18],
		elbowL: 0.4 + dip * 0.5 + tuck * 0.6,
		elbowR: 0.4 + dip * 0.5 + tuck * 0.6,
		hipL: dip * 1.0 + tuck * 0.7,
		hipR: dip * 1.0 + tuck * 0.7,
		kneeL: -0.1 - dip * 1.5 - tuck * 1.0,
		kneeR: -0.1 - dip * 1.5 - tuck * 1.0,
		ankleL: dip * 0.4 - push * 0.5,
		ankleR: dip * 0.4 - push * 0.5,
	});
}

/**
 * Airborne. `root` stays at the origin: the arc through the storey belongs to
 * `building.js`, which drives it off live scroll. The limbs are deliberately asymmetric —
 * a man falling with matched legs is a mannequin being dropped.
 */
export function fall(t) {
	const spread = Math.sin(Math.PI * Math.min(1, t * 1.4));
	return posed({
		root: [0, 0, 0],
		pelvis: -0.12,
		spine: 0.1 - spread * 0.16,
		neck: -0.2 - spread * 0.2,
		shoulderL: [2.2 + spread * 0.4, 0.5],
		shoulderR: [1.7 + spread * 0.5, -0.34],
		elbowL: 0.5 + spread * 0.4,
		elbowR: 0.9 - spread * 0.3,
		wristL: -0.3,
		wristR: 0.2,
		hipL: 0.9 + spread * 0.5,
		hipR: -0.2 - spread * 0.35,
		kneeL: -1.4 - spread * 0.5,
		kneeR: -0.3 - spread * 0.3,
		ankleL: -0.3,
		ankleR: 0.3,
	});
}

/** Impact, then a damped return. The overshoot is the weight; without it he floats. */
export function land(t) {
	const q = Math.exp(-5 * t) * Math.cos(TAU * 1.4 * t);
	const absorb = Math.max(0, q);
	return posed({
		root: [0, -q * 0.55, 0],
		pelvis: absorb * 0.34,
		spine: -absorb * 0.3,
		neck: absorb * 0.22,
		shoulderL: [absorb * 0.9, 0.2 + absorb * 0.2],
		shoulderR: [absorb * 0.9, -0.2 - absorb * 0.2],
		elbowL: 0.3 + absorb * 0.9,
		elbowR: 0.3 + absorb * 0.9,
		hipL: absorb * 1.2,
		hipR: absorb * 1.2,
		kneeL: -0.1 - absorb * 1.7,
		kneeR: -0.1 - absorb * 1.7,
		ankleL: absorb * 0.45,
		ankleR: absorb * 0.45,
	});
}

export const CLIPS = { stand, look, press, load, walk, run, jump, fall, land };

/** The clips that repeat while the reader sits still, and so must close on themselves. */
export const LOOPS = ["stand", "look", "press", "load", "walk", "run"];
