/**
 * The animation data, checked by walking it forwards.
 *
 * A hand-authored skeleton fails silently: a transposed sign is a limp, not an
 * exception. So this file carries its own forward kinematics — the rig gets FK free
 * from the three.js scene graph, and repeating it here in thirty lines is what makes
 * "negative swings a limb forward" a tested fact rather than a comment.
 */

import { strict as assert } from "node:assert";
import test from "node:test";
import {
	BONES,
	CLIPS,
	HIP_H,
	REST,
	STATION_CLIPS,
	STRIDE,
	blendDeltas,
	blendRoots,
	bob,
	breath,
	mirror,
	resolve,
	sampleClip,
} from "./body.mjs";

/** Rx·Ry·Rz, row-major — three.js's default Euler order. */
function euler([x, y, z]) {
	const [cx, sx, cy, sy, cz, sz] = [Math.cos(x), Math.sin(x), Math.cos(y), Math.sin(y), Math.cos(z), Math.sin(z)];
	return [
		cy * cz, -cy * sz, sy,
		cx * sz + sx * sy * cz, cx * cz - sx * sy * sz, -sx * cy,
		sx * sz - cx * sy * cz, sx * cz + cx * sy * sz, cx * cy,
	];
}

const mul = (a, b) => {
	const out = new Array(9);
	for (let r = 0; r < 3; r += 1) {
		for (let c = 0; c < 3; c += 1) {
			out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
		}
	}
	return out;
};

const apply = (m, [x, y, z]) => [
	m[0] * x + m[1] * y + m[2] * z,
	m[3] * x + m[4] * y + m[5] * z,
	m[6] * x + m[7] * y + m[8] * z,
];

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** One pose, walked forwards. Parents come before children in BONES, so one pass does it. */
function skeleton(pose, root = { x: 0, y: 0, z: 0 }) {
	const out = {};
	for (const [name, parent, offset, len, radius, up] of BONES) {
		const base = parent ? out[parent] : null;
		const origin = base ? add(base.origin, apply(base.rot, offset)) : [root.x ?? 0, HIP_H + (root.y ?? 0), root.z ?? 0];
		const rot = base ? mul(base.rot, euler(pose[name])) : euler(pose[name]);
		out[name] = { origin, rot, tip: add(origin, apply(rot, [0, up ? len : -len, 0])), radius, len };
	}
	return out;
}

/**
 * The lowest point of a foot capsule, and where it touches. Which end is down depends on
 * the pose — a heel strike stands on `origin`, a forefoot strike on `tip` — so the test
 * has to ask rather than assume, exactly as a floor would.
 */
function contact(s, side) {
	const foot = s[`foot${side}`];
	const heel = foot.origin[1] <= foot.tip[1];
	const end = heel ? foot.origin : foot.tip;
	return { sole: end[1] - foot.radius, z: end[2], heel };
}

/** Every pose of a clip, sampled evenly, with its root offset and bob applied. */
function frames(name, count = 32, gait = null) {
	const clip = CLIPS[name];
	const out = [];
	for (let i = 0; i < count; i += 1) {
		const p = i / count;
		const { pose, root } = sampleClip(clip, p);
		const lift = gait ? bob(p, gait).y : 0;
		const at = { x: root?.x ?? 0, y: (root?.y ?? 0) + lift, z: root?.z ?? 0 };
		out.push({ p, s: skeleton(resolve(pose), at) });
	}
	return out;
}

const soles = ({ s }) => [contact(s, "L").sole, contact(s, "R").sole];
const lowest = (frame) => Math.min(...soles(frame));

test("the skeleton is a tree, rooted at the hips, parents before children", () => {
	const seen = new Set();
	for (const [name, parent, offset, len, radius] of BONES) {
		assert.ok(!seen.has(name), `${name} is declared twice`);
		if (parent) assert.ok(seen.has(parent), `${name} comes before its parent ${parent}`);
		seen.add(name);
		assert.equal(offset.length, 3);
		assert.ok(len > 0 && radius > 0, `${name} has no size`);
	}
	assert.equal(BONES[0][1], null, "the hips are the root");
	assert.equal(BONES.filter(([, parent]) => parent === null).length, 1, "one root only");
	// Every bone REST poses is a bone that exists, and vice versa: a typo in either
	// silently drops a limb from every clip in the file.
	assert.deepEqual(Object.keys(REST).sort(), BONES.map(([name]) => name).sort());
});

test("standing at ease, he is a man-sized man with his feet on the floor", () => {
	const s = skeleton(REST);
	for (const side of ["L", "R"]) {
		const { sole } = contact(s, side);
		const foot = s[`foot${side}`];
		assert.ok(Math.abs(sole) < 0.005, `resting sole ${side} is ${sole.toFixed(4)} off the floor`);
		assert.ok(Math.abs(foot.origin[1] - foot.tip[1]) < 0.02, `resting foot ${side} is not flat`);
		assert.ok(foot.tip[2] > 0.1, "his toes point forwards, at +Z");
	}
	const head = s.head.tip[1] + s.head.radius;
	assert.ok(head > 1.7 && head < 1.8, `he is ${head.toFixed(3)} m tall`);
	// Arms hang outside the ribs and short of the hips — the two ways a rest pose reads
	// as broken rather than relaxed.
	assert.ok(s.handL.origin[0] > s.chest.origin[0] + s.chest.radius);
	assert.ok(s.handR.origin[0] < -s.chest.origin[0] - s.chest.radius);
	assert.ok(s.handL.tip[1] > s.hips.origin[1] - 0.16, "his hands are not past his knees");
});

test("mirroring swaps his sides and nothing else", () => {
	const flipped = mirror({ thighL: [-0.3, 0.1, 0.2], thighR: [0.4, 0, 0], spine: [0.1, 0.2, 0.3] });
	assert.deepEqual(flipped.thighR, [-0.3, -0.1, -0.2]);
	assert.deepEqual(flipped.thighL, [0.4, -0, -0]);
	assert.deepEqual(flipped.spine, [0.1, -0.2, -0.3]);
	// Twice is identity, which is the only property the walk cycle actually relies on.
	const twice = mirror(flipped);
	assert.deepEqual(twice.thighL, [-0.3, 0.1, 0.2]);
	// A mirrored REST is REST: he stands symmetrically, so the cycle's two halves match.
	const rest = mirror(REST);
	for (const name of Object.keys(REST)) {
		for (let axis = 0; axis < 3; axis += 1) {
			assert.ok(Math.abs(rest[name][axis] - REST[name][axis]) < 1e-12, `${name} is not symmetric at rest`);
		}
	}
});
test("through a walk he always has a foot down and swings the other one clear", () => {
	const walking = frames("walk", 32, { walk: 1 });
	let clearL = 0;
	let clearR = 0;
	for (const frame of walking) {
		const [left, right] = soles(frame);
		const down = Math.min(left, right);
		assert.ok(down > -0.035, `he sinks ${down.toFixed(3)} into the floor at p=${frame.p}`);
		assert.ok(down < 0.006, `he floats ${down.toFixed(3)} above it at p=${frame.p}`);
		clearL = Math.max(clearL, left);
		clearR = Math.max(clearR, right);
	}
	assert.ok(clearL > 0.09, `his left foot only lifts ${clearL.toFixed(3)}`);
	assert.ok(clearR > 0.09, `his right foot only lifts ${clearR.toFixed(3)}`);
});

test("a run leaves the floor entirely and comes back to it", () => {
	const running = frames("run", 32, { run: 1 });
	const airborne = running.filter((frame) => lowest(frame) > 0.15);
	const landed = running.filter((frame) => lowest(frame) < 0.01);
	assert.ok(airborne.length >= 4, `only ${airborne.length} frames of flight`);
	assert.ok(landed.length >= 4, `only ${landed.length} frames of contact`);
	for (const frame of running) {
		assert.ok(lowest(frame) > -0.02, `he sinks ${lowest(frame).toFixed(3)} in at p=${frame.p}`);
	}
	// Flight comes after a footfall, not at it: the peak is a quarter-cycle from the strike.
	const peak = running.reduce((best, frame) => (lowest(frame) > lowest(best) ? frame : best));
	assert.ok(Math.abs(peak.p - 0.25) < 0.1 || Math.abs(peak.p - 0.75) < 0.1, `peak at p=${peak.p}`);
});

test("the leading foot actually leads, in both gaits and both halves", () => {
	for (const name of ["walk", "run"]) {
		const gait = name === "walk" ? { walk: 1 } : { run: 1 };
		const [strike] = frames(name, 2, gait);
		const lead = contact(strike.s, "L");
		const trail = contact(strike.s, "R");
		assert.ok(lead.z > trail.z + 0.25, `${name}: his feet are only ${(lead.z - trail.z).toFixed(3)} apart`);
		// And the arm on the leading side is the one swung back.
		assert.ok(strike.s.handL.origin[2] < strike.s.handR.origin[2], `${name}: his arms swing with his legs`);
	}
});
test("STRIDE is a measurement of the poses, not a dial", () => {
	// At double support the trailing toe is leaving as the leading heel lands. One step
	// later that leading foot is the trailing one, its toe where this one's toe is now —
	// so the step is the gap between the two toes, and nothing else.
	const [strike] = frames("walk", 2, { walk: 1 });
	const step = strike.s.footL.tip[2] - strike.s.footR.tip[2];
	assert.ok(
		Math.abs(step - STRIDE.walk) < 0.02,
		`the walk keys step ${step.toFixed(3)} but STRIDE.walk says ${STRIDE.walk}`,
	);

	// A run has no double support to measure, so measure the consequence instead: while a
	// foot is planted, the world moves forwards under it at two steps per cycle, and what
	// is left over is skid. Not a derivative at the key — the keys ease, so the pose is
	// momentarily still there and any slope read across a key comes out three times slow.
	const contactWindow = [-0.0625, -0.03, 0, 0.03, 0.0625];
	const world = contactWindow.map((p) => {
		const { pose } = sampleClip(CLIPS.run, p);
		const toe = skeleton(resolve(pose), { x: 0, y: bob(p, { run: 1 }).y, z: 0 }).footL.tip[2];
		return toe + 2 * STRIDE.run * p;
	});
	const skid = Math.max(...world) - Math.min(...world);
	assert.ok(skid < 0.15, `his planted foot skids ${skid.toFixed(3)} at STRIDE.run ${STRIDE.run}`);
	assert.ok(STRIDE.run > STRIDE.walk * 1.4, "a run covers more ground per step than a walk");
});

/** Distance from a point to a bone's capsule axis — how the test knows he is not inside himself. */
function toAxis(point, bone) {
	const axis = [bone.tip[0] - bone.origin[0], bone.tip[1] - bone.origin[1], bone.tip[2] - bone.origin[2]];
	const rel = [point[0] - bone.origin[0], point[1] - bone.origin[1], point[2] - bone.origin[2]];
	const len = axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2;
	const t = len > 0 ? Math.max(0, Math.min(1, (rel[0] * axis[0] + rel[1] * axis[1] + rel[2] * axis[2]) / len)) : 0;
	return Math.hypot(rel[0] - axis[0] * t, rel[1] - axis[1] * t, rel[2] - axis[2] * t);
}

test("everything he does at a station, he does standing on the floor", () => {
	for (const name of [...STATION_CLIPS, "plate", "stand"]) {
		for (const frame of frames(name)) {
			const down = lowest(frame);
			assert.ok(down > -0.02, `${name} sinks ${down.toFixed(3)} into the floor at p=${frame.p}`);
			const head = frame.s.head.tip[1] + frame.s.head.radius;
			assert.ok(head > 1.05 && head < 1.79, `${name} puts his head at ${head.toFixed(3)} at p=${frame.p}`);
			// No hand is ever inside his chest: 0.124 of chest plus 0.038 of hand.
			for (const side of ["L", "R"]) {
				const gap = toAxis(frame.s[`hand${side}`].tip, frame.s.chest);
				assert.ok(gap > 0.162, `${name}: his ${side} hand is ${gap.toFixed(3)} inside his chest at p=${frame.p}`);
			}
		}
	}
});
test("sampling a clip eases between its keys and wraps when it loops", () => {
	const clip = {
		loop: true,
		keys: [
			{ p: 0, pose: { spine: [0, 0, 0] } },
			{ p: 0.5, pose: { spine: [1, 2, 3] } },
		],
	};
	assert.deepEqual(sampleClip(clip, 0).pose.spine, [0, 0, 0]);
	assert.deepEqual(sampleClip(clip, 0.25).pose.spine, [0.5, 1, 1.5], "ease is symmetric at the midpoint");
	assert.deepEqual(sampleClip(clip, 0.5).pose.spine, [1, 2, 3]);
	assert.deepEqual(sampleClip(clip, 0.75).pose.spine, [0.5, 1, 1.5], "and it comes back the other way");
	assert.deepEqual(sampleClip(clip, 1).pose.spine, [0, 0, 0], "one whole cycle is where it started");
	assert.deepEqual(sampleClip(clip, 2.25).pose.spine, [0.5, 1, 1.5], "and so is the next one");
	assert.deepEqual(sampleClip(clip, -0.75).pose.spine, [0.5, 1, 1.5], "scrolled backwards it still reads");

	// A bone in one key and not the other reads as a zero delta at the other, which is
	// what lets a clip name only the bones it moves.
	const partial = { loop: false, keys: [{ p: 0, pose: { neck: [0.4, 0, 0] } }, { p: 1, pose: {} }] };
	assert.deepEqual(sampleClip(partial, 0.5).pose.neck, [0.2, 0, 0]);
	assert.deepEqual(sampleClip(partial, 0).pose.neck, [0.4, 0, 0]);

	// Sitting exactly on a key that omits a bone drops it from the pose entirely rather
	// than zeroing it — the same thing once resolved, since a missing delta is REST.
	assert.equal(sampleClip(partial, 1).pose.neck, undefined);
	assert.deepEqual(resolve(sampleClip(partial, 1).pose).neck, REST.neck);

	// Not looping clamps, so a one-shot cannot be scrubbed off either end.
	assert.deepEqual(sampleClip(partial, -5).pose.neck, [0.4, 0, 0]);
	assert.deepEqual(resolve(sampleClip(partial, 5).pose).neck, REST.neck);

	// Degenerate clips answer rather than throw: the rig samples every frame.
	assert.deepEqual(sampleClip({ keys: [] }, 0.5), { pose: {}, root: null });
	assert.deepEqual(sampleClip(null, 0.5), { pose: {}, root: null });
	assert.deepEqual(sampleClip(CLIPS.stand, 0.5).pose, {});
	assert.deepEqual(sampleClip(clip, Number.NaN).pose.spine, [0, 0, 0], "a NaN phase is the first frame");
	assert.deepEqual(sampleClip(CLIPS.sit, 0.5).root, { y: -0.35, z: -0.12 }, "the root rides along");
});

test("every clip is well formed, so the rig never samples a hole", () => {
	for (const [name, clip] of Object.entries(CLIPS)) {
		assert.ok(clip.keys.length > 0, `${name} has no keys`);
		assert.equal(clip.keys[0].p, 0, `${name} does not start at 0`);
		let last = -1;
		for (const key of clip.keys) {
			assert.ok(key.p > last, `${name} has keys out of order at ${key.p}`);
			assert.ok(key.p <= 1, `${name} has a key past the end at ${key.p}`);
			last = key.p;
			for (const [bone, value] of Object.entries(key.pose)) {
				assert.ok(bone in REST, `${name} moves ${bone}, which is not a bone`);
				assert.equal(value.length, 3, `${name}'s ${bone} is not a triple`);
				assert.ok(value.every(Number.isFinite), `${name}'s ${bone} is not finite`);
			}
		}
		if (!clip.loop) assert.equal(last, 1, `${name} is a one-shot that never reaches its end`);
		if (clip.period !== undefined) assert.ok(clip.period > 0, `${name} has period ${clip.period}`);
	}
	assert.equal(STATION_CLIPS.length, 5, "five stations");
	for (const name of STATION_CLIPS) assert.ok(CLIPS[name], `${name} has no clip`);
});
test("blending two things he is doing is the average of what they change", () => {
	const walking = { pose: { spine: [0.2, 0, 0], thighL: [-0.4, 0, 0] }, weight: 0.5 };
	const punching = { pose: { spine: [0.1, 0.3, 0] }, weight: 0.5 };
	const mixed = blendDeltas([walking, punching]);
	assert.deepEqual(mixed.spine, [0.15000000000000002, 0.15, 0]);
	assert.deepEqual(mixed.thighL, [-0.2, 0, 0], "a bone only one of them moves moves half as far");

	// Weightless entries are skipped rather than added at zero, so a clip fading out
	// costs nothing once it is gone.
	assert.deepEqual(blendDeltas([{ pose: { spine: [9, 9, 9] }, weight: 0 }]), {});
	assert.deepEqual(blendDeltas([{ pose: { spine: [9, 9, 9] }, weight: -1 }]), {});
	assert.deepEqual(blendDeltas([{ weight: 1 }, null, undefined]), {});
	assert.deepEqual(blendDeltas(null), {});

	const roots = blendRoots([
		{ root: { y: -0.35, z: -0.12 }, weight: 0.5 },
		{ root: { z: 0.16, ry: 0.4 }, weight: 0.25 },
	]);
	assert.equal(roots.x, 0);
	assert.ok(Math.abs(roots.y + 0.175) < 1e-12);
	assert.ok(Math.abs(roots.z + 0.02) < 1e-12);
	assert.ok(Math.abs(roots.ry - 0.1) < 1e-12);
	assert.deepEqual(blendRoots([{ weight: 1 }, { root: { x: 5 }, weight: 0 }]), { x: 0, y: 0, z: 0, ry: 0 });
	assert.deepEqual(blendRoots(null), { x: 0, y: 0, z: 0, ry: 0 });
});

test("resolving a delta lands on rest plus the delta, and only on real bones", () => {
	const pose = resolve({ spine: [0.5, 0, 0], nonsense: [1, 1, 1] });
	assert.deepEqual(pose.spine, [REST.spine[0] + 0.5, REST.spine[1], REST.spine[2]]);
	assert.deepEqual(pose.head, REST.head, "a bone the delta ignores is left at rest");
	assert.equal(pose.nonsense, undefined, "a bone that does not exist is dropped");
	assert.deepEqual(Object.keys(resolve(null)).sort(), Object.keys(REST).sort());
	assert.deepEqual(resolve({}).footL, REST.footL);
});

test("he breathes on the clock, not on the walk", () => {
	const still = breath(0);
	assert.deepEqual(still.chest, [0, 0, 0]);
	// Chest and neck oppose: he does not nod every time he inhales.
	const mid = breath(1);
	assert.ok(mid.chest[0] > 0 && mid.neck[0] < 0);
	assert.deepEqual(breath(Number.NaN).chest, breath(0).chest, "a bad clock is a held breath");
	// Small enough to read as alive rather than as a seizure, at every moment.
	for (let t = 0; t < 12; t += 0.1) {
		for (const value of Object.values(breath(t))) {
			for (const angle of value) assert.ok(Math.abs(angle) <= 0.025, `breath reached ${angle} at ${t}`);
		}
	}
	assert.ok(Math.abs(breath(Math.PI / 2 / 1.7).chest[0] - 0.018) < 1e-9, "the chest reaches its full 0.018");
});

test("his hips drop at every footfall and ride highest in the middle of a step", () => {
	const walk = { walk: 1, run: 0 };
	assert.ok(bob(0, walk).y < -0.047, "lowest as a foot lands");
	assert.ok(Math.abs(bob(0.25, walk).y) < 1e-12, "highest halfway between");
	assert.ok(bob(0.5, walk).y < -0.047, "and lowest again on the other foot");
	assert.ok(bob(0.25, walk).roll > 0 && bob(0.75, walk).roll < 0, "rolling opposite ways");
	assert.ok(Math.abs(bob(0, { run: 1 }).y) > Math.abs(bob(0, walk).y), "a run drops further than a walk");
	const stand = bob(0.3, null);
	assert.ok(stand.y === 0 && stand.roll === 0, "standing still, his hips are still");
	assert.deepEqual(bob(Number.NaN, walk), bob(0, walk), "a bad phase is a footfall");
	// The drop is what lets a swung leg reach the floor, so it may never exceed the leg.
	for (let p = 0; p < 1; p += 0.05) assert.ok(bob(p, { walk: 0.5, run: 0.5 }).y > -0.08);
});
