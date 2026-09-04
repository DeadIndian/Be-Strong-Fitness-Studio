"use client";

/**
 * The man, built out of steel. `body.mjs` decides what a body is and how it moves; this
 * turns that into meshes and applies a pose to them.
 *
 * One pivot per bone, parented in chain order. A pose sets rotations on pivots and the
 * position of the root group — nothing else, so applying a pose is fifteen assignments
 * and costs nothing per frame.
 */

import * as THREE from "three";
import { BONES, HIP_H, restPose } from "@/lib/landing/body.mjs";

/**
 * One bone as one primitive, its origin at the joint and its length running up local +y.
 * The torso is a lathe with the same profile language as the bar's sleeve; the head is a
 * squashed sphere; every limb is a capsule.
 */
function boneMesh(bone, mats, track, narrow) {
	const { matte, lathe } = mats;
	if (bone.name === "spine") {
		const { r, len } = bone;
		const mesh = new THREE.Mesh(
			lathe([
				[0.02, 0],
				[r * 0.78, len * 0.1],
				[r * 0.84, len * 0.36],
				[r, len * 0.68],
				[r * 0.88, len * 0.92],
				[0.02, len],
			]),
			matte,
		);
		// A chest is wider across than it is deep: x is his front-to-back axis.
		mesh.scale.x = 0.72;
		mesh.castShadow = !narrow;
		return mesh;
	}

	if (bone.name === "head") {
		const mesh = new THREE.Mesh(
			track(new THREE.SphereGeometry(bone.r, narrow ? 12 : 20, narrow ? 8 : 14)),
			matte,
		);
		mesh.scale.set(1, bone.len / (2 * bone.r), 0.94);
		mesh.position.y = bone.len / 2;
		mesh.castShadow = !narrow;
		return mesh;
	}

	const mesh = new THREE.Mesh(
		track(
			new THREE.CapsuleGeometry(
				bone.r,
				Math.max(0.001, bone.len - 2 * bone.r),
				4,
				narrow ? 8 : 14,
			),
		),
		matte,
	);
	mesh.position.y = bone.len / 2;
	mesh.castShadow = !narrow;
	return mesh;
}

export function figure({ mats, track, narrow = false }) {
	const group = new THREE.Group();
	const table = new Map(BONES.map((bone) => [bone.name, bone]));
	const pivots = new Map();
	const parts = [];

	for (const bone of BONES) {
		const pivot = new THREE.Group();
		// A child hangs off its parent's far end, then its own offset from there.
		const reach = bone.parent ? table.get(bone.parent).len : 0;
		pivot.position.set(bone.offset[0], reach + bone.offset[1], bone.offset[2]);
		pivot.rotation.set(bone.rest[0], bone.rest[1], bone.rest[2]);
		(bone.parent ? pivots.get(bone.parent) : group).add(pivot);
		pivot.add(boneMesh(bone, mats, track, narrow));
		pivots.set(bone.name, pivot);
		parts.push({ bone, pivot });
	}

	/**
	 * A pose, applied. Single-axis joints rotate about z, the sagittal axis; a shoulder
	 * carries `[swing, out]` and spends the second on x. `flex` is what makes positive
	 * mean flexion whichever way the bone hangs.
	 */
	function apply(pose) {
		for (const { bone, pivot } of parts) {
			const angle = pose[bone.joint];
			if (Array.isArray(angle)) {
				pivot.rotation.z = bone.rest[2] + bone.flex * angle[0];
				pivot.rotation.x = bone.rest[0] + angle[1];
			} else {
				pivot.rotation.z = bone.rest[2] + bone.flex * angle;
			}
		}
		group.position.set(pose.root[0], HIP_H + pose.root[1], pose.root[2]);
	}

	apply(restPose());
	return { group, apply, pivots };
}
