import assert from "node:assert/strict";
import test from "node:test";
import {
	BONES,
	CLIPS,
	HIP_H,
	JOINTS,
	LIMITS,
	LOOPS,
	MAN_H,
	SEG,
	blend,
	breath,
	jump,
	limitOf,
	restPose,
} from "./body.mjs";

test("he is a 1.75 m man in 500 mm units", () => {
	assert.equal(MAN_H, 3.5);
	assert.ok(Math.abs(HIP_H - 1.855) < 1e-9, `${HIP_H}`);
});

test("the rest pose names all fifteen joints and nothing else", () => {
	const pose = restPose();
	assert.deepEqual(
		Object.keys(pose)
			.filter((key) => key !== "root")
			.sort(),
		[...JOINTS].sort(),
	);
	assert.deepEqual(pose.root, [0, 0, 0]);
});

test("limits resolve left and right to one family", () => {
	assert.equal(limitOf("elbowL"), LIMITS.elbow);
	assert.equal(limitOf("elbowR"), LIMITS.elbow);
	assert.equal(limitOf("spine"), LIMITS.spine);
});

test("segments stack floor to crown to exactly one standing height", () => {
	const stack =
		SEG.ankle + SEG.shin + SEG.thigh + SEG.torso + SEG.neck + SEG.head;
	assert.ok(Math.abs(stack - 1) < 0.02, `${stack}`);
});

test("every bone hangs off an existing bone, with the pelvis as the only root", () => {
	const seen = new Set();
	for (const bone of BONES) {
		if (bone.parent === null) assert.equal(bone.name, "pelvis");
		else assert.ok(seen.has(bone.parent), `${bone.name} precedes its parent ${bone.parent}`);
		seen.add(bone.name);
	}
	assert.equal(BONES.filter((bone) => bone.parent === null).length, 1);
});

test("every bone names a real joint, a flex sign and a three-part rest", () => {
	for (const bone of BONES) {
		assert.ok(limitOf(bone.joint), `${bone.name} drives unknown joint ${bone.joint}`);
		assert.ok([1, 0, -1].includes(bone.flex), `${bone.name} flex ${bone.flex}`);
		assert.equal(bone.rest.length, 3, `${bone.name} rest`);
		assert.equal(bone.offset.length, 3, `${bone.name} offset`);
		assert.ok(bone.len > 0 && bone.r > 0, `${bone.name} size`);
	}
});

test("the pelvis is inside the height stack, not an extra storey on top of it", () => {
	const table = new Map(BONES.map((bone) => [bone.name, bone]));
	const pelvis = table.get("pelvis");
	// Both the spine and the legs hang from the pelvis's origin, not its far end.
	assert.equal(table.get("spine").offset[1], -pelvis.len);
	assert.equal(table.get("thighL").offset[1], -pelvis.len);
	assert.equal(table.get("thighR").offset[1], -pelvis.len);
	// So hips sit at HIP_H and the crown lands on MAN_H.
	const crown =
		HIP_H + MAN_H * (SEG.torso + SEG.neck + SEG.head);
	assert.ok(Math.abs(crown - MAN_H) < 1e-9, `${crown}`);
});

test("a pair spreads across z, his lateral axis, and never across x", () => {
	const table = new Map(BONES.map((bone) => [bone.name, bone]));
	for (const name of ["upperArm", "thigh"]) {
		const left = table.get(`${name}L`);
		const right = table.get(`${name}R`);
		assert.ok(left.offset[2] > 0, `${name}L sits at z ${left.offset[2]}`);
		assert.equal(left.offset[2], -right.offset[2]);
		assert.equal(left.offset[0], 0, `${name}L is offset along his forward axis`);
		assert.equal(right.offset[0], 0);
	}
	// And no bone at all is offset front-to-back: the rig is symmetric about xy.
	for (const bone of BONES) assert.equal(bone.offset[0], 0, `${bone.name} offset x`);
});

test("no clip drives any joint outside its anatomical range", () => {
	for (const [name, clip] of Object.entries(CLIPS)) {
		for (let step = 0; step <= 120; step += 1) {
			const t = step / 120;
			const pose = clip(t);
			for (const joint of JOINTS) {
				const [low, high] = limitOf(joint);
				const value = pose[joint];
				const swing = Array.isArray(value) ? value[0] : value;
				assert.ok(
					swing >= low - 1e-9 && swing <= high + 1e-9,
					`${name} at t=${t.toFixed(3)}: ${joint} = ${swing}, limit [${low}, ${high}]`,
				);
			}
			assert.equal(pose.root.length, 3, `${name} root`);
		}
	}
});

test("every looping clip ends exactly where it started, so reps do not pop", () => {
	for (const name of LOOPS) {
		const first = CLIPS[name](0);
		const last = CLIPS[name](1);
		for (const key of Object.keys(first)) {
			const from = Array.isArray(first[key]) ? first[key] : [first[key]];
			const to = Array.isArray(last[key]) ? last[key] : [last[key]];
			from.forEach((value, index) => {
				assert.ok(
					Math.abs(value - to[index]) < 1e-9,
					`${name} does not close: ${key}[${index}] ${value} vs ${to[index]}`,
				);
			});
		}
	}
});

test("his hips travel down before they travel up in the jump", () => {
	const dip = jump(0.17).root[1];
	const peak = jump(1).root[1];
	assert.ok(dip < -0.2, `anticipation dip was ${dip}`);
	assert.ok(peak > 1, `takeoff reached ${peak}`);
	// And the dip really is the lowest point of the clip.
	for (let step = 0; step <= 60; step += 1) {
		assert.ok(jump(step / 60).root[1] >= dip - 1e-9);
	}
});

test("blend returns its endpoints untouched and interpolates arrays element-wise", () => {
	const a = restPose();
	const b = CLIPS.press(0.5);
	assert.deepEqual(blend(a, b, 0), { ...a });
	assert.deepEqual(blend(a, b, 1), { ...b });
	const half = blend(a, b, 0.5);
	assert.ok(Math.abs(half.elbowL - (a.elbowL + b.elbowL) / 2) < 1e-9);
	assert.ok(Math.abs(half.shoulderL[1] - (a.shoulderL[1] + b.shoulderL[1]) / 2) < 1e-9);
	// A blend is a new object, not a mutated input.
	assert.notEqual(half, a);
	assert.deepEqual(a, restPose());
});

test("breath never stops and never leaves the spine's range", () => {
	const pose = CLIPS.stand(0.25);
	const moved = new Set();
	for (let ms = 0; ms < 4000; ms += 40) {
		const out = breath(pose, ms / 1000);
		moved.add(out.spine.toFixed(6));
		assert.ok(out.spine >= LIMITS.spine[0] && out.spine <= LIMITS.spine[1]);
		assert.ok(out.neck >= LIMITS.neck[0] && out.neck <= LIMITS.neck[1]);
	}
	assert.ok(moved.size > 20, `breath was flat: ${moved.size} distinct values`);
	// It rides on top of the clip rather than replacing it.
	assert.equal(breath(pose, 0).hipL, pose.hipL);
});
