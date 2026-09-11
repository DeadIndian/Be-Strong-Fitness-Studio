"use client";

/**
 * The man, his reflection, his shadow, and the people in the background.
 *
 * `lib/gym/body.mjs` holds every angle he ever takes and knows nothing about three.js;
 * this file is the other half of that split. It nests one `Object3D` per bone so the
 * scene graph does the forward kinematics — no matrix arithmetic here, and no skinning,
 * because seventeen capsules on seventeen transforms is both cheaper and sharper at the
 * size he is actually drawn.
 *
 * He is the only thing on the top canvas, so nothing in the hall can ever occlude him.
 * That is what lets him walk over the type; it is also why the hall keeps its kit behind
 * the lane, and why his shadow has to be drawn here rather than by a shadow map — this
 * scene has no floor to catch one.
 */

import { BONES, HIP_H } from "@/lib/gym/body.mjs";

/**
 * One capsule per distinct bone size, shared by both copies of him and by the crowd.
 *
 * Deliberately never disposed: it is at most a dozen small buffers, it is keyed by size
 * so it cannot grow with the crowd, and the page holds one rig for its whole life. A
 * dispose path here would be code that never runs.
 */
const GEOMETRY = new Map();

function capsule(THREE, radius, length) {
	const key = `${radius.toFixed(3)}:${length.toFixed(3)}`;
	let geometry = GEOMETRY.get(key);
	if (!geometry) {
		// CapsuleGeometry's height is the middle section only, so the caps have to come out
		// of the bone's length or every limb ends up a radius too long at each joint.
		geometry = new THREE.CapsuleGeometry(radius, Math.max(length * 0.25, length - radius * 2), 4, 10);
		GEOMETRY.set(key, geometry);
	}
	return geometry;
}

/** What each bone is wearing. */
function clothe(name, mat) {
	if (name === "hips" || name.startsWith("thigh")) return mat.shorts;
	if (name === "spine" || name === "chest" || name.startsWith("upperArm")) return mat.shirt;
	if (name.startsWith("foot")) return mat.shoe;
	return mat.skin;
}

/**
 * Him. Two nested groups over the bones: the outer one is where he is standing in the
 * hall, the inner one is his pelvis — hip height, the clip's own root offset, and the
 * bob. Splitting them is what lets the walk's vertical drop happen without disturbing
 * where on the floor he is, and vice versa.
 *
 * `single` replaces every material with one, which is how the reflection is built: a
 * mirror in a dim room flattens colour anyway, so one material is truer there than six.
 */
export function buildActor(THREE, mat, single = null) {
	const group = new THREE.Group();
	const pelvis = new THREE.Group();
	group.add(pelvis);

	const nodes = new Map();
	for (const [name, parent, offset, length, radius, up] of BONES) {
		const node = new THREE.Object3D();
		node.position.set(offset[0], offset[1], offset[2]);
		const mesh = new THREE.Mesh(capsule(THREE, radius, length), single ?? clothe(name, mat));
		mesh.position.y = up ? length / 2 : -length / 2;
		node.add(mesh);
		(parent ? nodes.get(parent) : pelvis).add(node);
		nodes.set(name, node);
	}

	const vL = new THREE.Vector3();
	const vR = new THREE.Vector3();
	const handCenter = new THREE.Vector3();

	function getHandCenter() {
		const handL = nodes.get("handL");
		const handR = nodes.get("handR");
		if (!handL || !handR) return handCenter.set(group.position.x, 0.5, group.position.z);
		group.updateMatrixWorld(true);
		handL.getWorldPosition(vL);
		handR.getWorldPosition(vR);
		handCenter.addVectors(vL, vR).multiplyScalar(0.5);
		return handCenter;
	}

	/** One frame of him: where he is, which way he faces, and every joint. */
	function set(state) {
		group.position.set(state.x, 0, state.z);
		group.rotation.y = state.heading;
		pelvis.position.set(state.root.x, HIP_H + state.root.y + state.bob.y, state.root.z);
		pelvis.rotation.set(0, state.root.ry, state.bob.roll);
		for (const [name, node] of nodes) {
			const angles = state.pose[name];
			if (angles) node.rotation.set(angles[0], angles[1], angles[2]);
		}
	}

	return { group, set, getHandCenter };
}

/**
 * The reflection: a second copy of him inside a shell that is scaled −1 through the
 * mirror's own plane. The shell doing the reflecting means the copy takes the real one's
 * transform verbatim — no mirrored pose, no flipped heading, nothing to get the sign
 * wrong on. A negative scale inverts the winding, so the copy is double-sided; its
 * lighting is consequently a little wrong, which in a dim recess behind glass is not
 * something anybody can see.
 *
 * The reflected copy lives in the *hall* scene, not this one, which is the whole trick:
 * the recess walls crop it by depth test, so there is no render target and no clipping
 * plane anywhere in this page.
 */
export function buildReflection(THREE, mat, planeZ) {
	const inner = buildActor(THREE, mat, null);
	// The recess is a tunnel, and the hall's own lights do not reach down it. One small
	// lamp riding along with the copy is what makes there be anything in the mirror at
	// all; its brightness is the hour's, so the reflection dims when the hall does.
	const lamp = new THREE.PointLight("#ffffff", 0, 7, 2);
	lamp.position.set(0, 2, 1.5);
	inner.group.add(lamp);

	const shell = new THREE.Group();
	shell.position.z = 2 * planeZ;
	shell.scale.z = -1;
	shell.add(inner.group);
	return { group: shell, set: inner.set, lamp };
}

/**
 * His shadow, and the reason the whole illusion holds.
 *
 * A radial gradient on a 2D canvas, laid flat on the floor of *this* scene — so it
 * composites over the document along with him and genuinely darkens the words he is
 * standing on. A shadow map could not do that: the type is not in any scene. It costs
 * one 128px texture and one quad, and it foreshortens with the camera for free.
 *
 * It tightens and darkens as he comes down, which is what a real contact shadow does and
 * what tells the eye how far off the floor he is.
 */
export function buildShadow(THREE) {
	const size = 128;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	const shade = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	shade.addColorStop(0, "rgba(0,0,0,0.9)");
	shade.addColorStop(0.5, "rgba(0,0,0,0.42)");
	shade.addColorStop(1, "rgba(0,0,0,0)");
	ctx.fillStyle = shade;
	ctx.fillRect(0, 0, size, size);

	const texture = new THREE.CanvasTexture(canvas);
	const mesh = new THREE.Mesh(
		new THREE.PlaneGeometry(1, 1),
		new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.75 }),
	);
	mesh.rotation.x = -Math.PI / 2;
	mesh.position.y = 0.012;
	mesh.renderOrder = -1;

	/** `lift` is how far off the floor he is, in metres. */
	function set(x, z, lift = 0) {
		const spread = 1 + Math.min(1.4, Math.max(0, lift) * 2.2);
		mesh.position.x = x;
		mesh.position.z = z;
		mesh.scale.set(1.45 * spread, 1.05 * spread, 1);
		mesh.material.opacity = 0.78 / spread;
	}

	set(0, 0, 0);
	return { mesh, set };
}

/** Deterministic scatter: the same room every reload, and no randomness in a frame. */
function scatter(i) {
	const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

/**
 * The other people in the hall.
 *
 * Silhouettes, unarticulated, and standing in the gaps between stations rather than
 * anywhere the kit is — they are depth and company, not characters. Their number does not
 * change; their opacity does, and it follows the shutter, so at 05:00 the hall is empty
 * and at 19:00 it is not. That is the same fact the light and the door copy are telling,
 * said a third way.
 */
export function buildCrowd(THREE, mat) {
	const group = new THREE.Group();
	const material = mat.crowd;
	// Set before the first render so only `opacity` changes later, which needs no recompile.
	material.transparent = true;
	material.opacity = 0;
	group.visible = false;

	const spots = [-3.6, 3.5, 10.5, 17.5, 24.5, 31.6];
	const figures = spots.map((spot, i) => {
		const person = new THREE.Group();
		person.position.set(spot + (scatter(i) - 0.5) * 1.9, 0, -1.5 + scatter(i + 7) * 0.8);
		person.rotation.y = (scatter(i + 19) - 0.5) * 2.4;
		person.scale.setScalar(0.9 + scatter(i + 31) * 0.18);
		person.add(new THREE.Mesh(capsule(THREE, 0.155, 0.6), material).translateY(1.18));
		person.add(new THREE.Mesh(capsule(THREE, 0.098, 0.14), material).translateY(1.64));
		for (const dx of [-0.095, 0.095]) {
			person.add(new THREE.Mesh(capsule(THREE, 0.078, 0.82), material).translateY(0.46).translateX(dx));
		}
		group.add(person);
		return { person, phase: scatter(i + 53) * Math.PI * 2 };
	});

	/** `amount` is how busy the hall is; `seconds` is wall clock, so they never freeze. */
	function apply(amount, seconds) {
		group.visible = amount > 0.02;
		if (!group.visible) return;
		material.opacity = amount;
		for (const { person, phase } of figures) {
			person.rotation.z = Math.sin(seconds * 1.1 + phase) * 0.022;
			person.position.y = Math.sin(seconds * 1.7 + phase) * 0.014;
		}
	}

	return { group, apply };
}



