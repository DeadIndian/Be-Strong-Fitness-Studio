# Gym-Floors Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the landing page as a six-storey gym seen in section, with a procedural 3D figure who trains on each floor and falls to the next as you scroll, parting the heading he falls through.

**Architecture:** Pure geometry and animation live in `lib/landing/*.mjs` and are tested with `node --test`. One constant maps the page to the world (`world y = -k × page y`), and the camera distance is derived so one world unit is exactly `1/k` pixels — that is what makes a canvas slab land on a CSS hairline at any scroll position or window size. Rendering splits `rig.js` into a gate, a loop, a figure, and props. The page itself becomes six `data-floor` wrappers with a reserved right-hand lane for the figure; every floor's content, hairline and printed number work with no JavaScript and no WebGL.

**Tech Stack:** Next.js 14.2.35 App Router (plain JS, no TypeScript), React 18.3.1, Tailwind 3.4.17, three.js 0.185.1 used raw, `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-09-04-gym-floors-landing-design.md`

## Global Constraints

- **No new dependency, runtime or dev.** three.js 0.185.1 and `node:test` are all this needs.
- **Plain JavaScript.** No TypeScript, no `.ts`/`.tsx`. `jsconfig.json` gives `@/` → repo root.
- **Tabs, not spaces.** Every file in this repo is tab-indented. Match it.
- **1 unit = 500 mm**, as `rig.js` already works. A 1.75 m man is `MAN_H = 3.5`.
- **Camera FOV is 32°**, matching `rig.js:232`. It appears in `lib/landing/shaft.mjs` as `FOV` and must not be duplicated with a different value.
- **No invented facts.** Everything printed comes from `getSiteSettings()`. Do not add copy the owner cannot edit at `/dashboard/staff/website`.
- **No payment language.** Nothing may imply money moved; `settings.checkout.placeholder` is still `true`.
- **`prefers-reduced-motion` is a designed path, not a stripped one** — see Task 10.
- **The canvas is decorative**: it stays `aria-hidden="true"` and `pointer-events-none`, and letter transforms only ever touch elements that are already `aria-hidden` inside `TileText`.
- **Pure modules only in `lib/landing/`.** No `import * as THREE`, no `document`, no `window` — that is what keeps them testable in node.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/landing/shaft.mjs` | Page↔world scale, which floor is occupied, which fall is in progress, corridor push maths. Pure. |
| `lib/landing/shaft.test.mjs` | The projection identity, fall bands, slack guard. |
| `lib/landing/body.mjs` | Anatomy ratios, bone table, joint limits, nine animation clips, pose blend, breath. Pure. |
| `lib/landing/body.test.mjs` | Loop closure, jump anticipation, joint limits, blend endpoints. |
| `app/components/landing/measure.js` | The only DOM reader: floor offsets, heading letter boxes, re-read triggers. |
| `app/components/landing/props.js` | Shared materials, `roomEnvironment`, the barbell (moved from `rig.js`), station silhouettes. |
| `app/components/landing/figure.js` | Builds the figure's meshes from `body.mjs` and applies a pose. |
| `app/components/landing/building.js` | Renderer, lights, camera, the rAF loop, CSS custom-property writes, perf bailout. |
| `app/components/landing/stage.js` | The gate: WebGL probe, reduced-motion check, dynamic import. Replaces `rig-stage.js`. |
| `app/page.js` | Six `data-floor` wrappers, the figure's lane, printed floor numbers. |
| `app/globals.css` | Scroll snap, lane token, letter transform, floor numbers, scroll hint. |

Deleted at the end of Task 10: `app/components/landing/rig.js`, `app/components/landing/rig-stage.js`.

**Test commands.** Task 1 adds `"test": "node --test"` to `package.json`. Node 24 discovers `*.test.mjs` recursively and skips `node_modules`. Tasks 5–10 touch the DOM and the GPU, which this repo has no harness for and which the no-new-dependency constraint keeps that way — those tasks carry explicit manual acceptance checks plus `npm run lint` and `npm run build`.

---

## Task 1: Page-to-world scale and fall bands

**Files:**
- Create: `lib/landing/shaft.mjs`
- Create: `lib/landing/shaft.test.mjs`
- Modify: `package.json:5-10` (add the `test` script)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `FOV = 32` (degrees)
  - `scaleFor({ width, height }, manHeight = 3.5)` → `{ k, dist, share }`. `k` is world units per pixel; `dist` is the camera's z.
  - `floorAt(knots, scrollY, height)` → integer index into `knots`.
  - `fallAt(knots, scrollY, height)` → `{ index, t }` with `t` in `[0, 1)`, or `null` when he is not falling.
  - `knots` is throughout an ascending array of page-y pixel offsets, one per floor: the slab that floor stands on. Six floors means six knots — the top borders of floors 04…00 plus the footer's.

- [ ] **Step 1: Write the failing test**

Create `lib/landing/shaft.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { FOV, fallAt, floorAt, scaleFor } from "./shaft.mjs";

/** Six floors on an 800px-tall phone, each one viewport apart. */
const KNOTS = [800, 1600, 2400, 3200, 4000, 4800];

test("one world unit projects to exactly 1/k pixels at the derived distance", () => {
	for (const view of [{ width: 360, height: 800 }, { width: 1440, height: 900 }, { width: 768, height: 1024 }]) {
		const { k, dist } = scaleFor(view);
		// Perspective: half the visible world height at `dist` is dist*tan(fov/2).
		const pixelsPerUnit = view.height / (2 * dist * Math.tan((FOV * Math.PI) / 360));
		assert.ok(Math.abs(pixelsPerUnit - 1 / k) < 1e-9, `${view.width}x${view.height}: ${pixelsPerUnit} vs ${1 / k}`);
	}
});

test("he is 35% of a portrait phone and 58% of a desktop", () => {
	assert.ok(Math.abs(scaleFor({ width: 360, height: 800 }).share - 0.35) < 0.005);
	assert.ok(Math.abs(scaleFor({ width: 1440, height: 900 }).share - 0.58) < 0.005);
	// One viewport of scroll is one storey: 10 units on the phone, ~6 on the desktop.
	assert.ok(Math.abs(scaleFor({ width: 360, height: 800 }).k * 800 - 10) < 0.05);
	assert.ok(Math.abs(scaleFor({ width: 1440, height: 900 }).k * 900 - 6.03) < 0.05);
});

test("share clamps outside the two reference aspects", () => {
	assert.equal(scaleFor({ width: 200, height: 800 }).share, scaleFor({ width: 360, height: 800 }).share);
	assert.equal(scaleFor({ width: 3000, height: 900 }).share, scaleFor({ width: 1440, height: 900 }).share);
});

test("the occupied floor follows the viewport centre", () => {
	assert.equal(floorAt(KNOTS, 0, 800), 0);
	assert.equal(floorAt(KNOTS, 800, 800), 1);
	assert.equal(floorAt(KNOTS, 99999, 800), 5);
});

test("a fall band opens before its hairline and closes after it", () => {
	assert.equal(fallAt(KNOTS, 0, 800), null);
	const start = fallAt(KNOTS, 800 - 0.72 * 800, 800);
	assert.deepEqual({ index: start.index, t: start.t }, { index: 0, t: 0 });
	assert.ok(fallAt(KNOTS, 800 - 0.5 * 800, 800).t > 0.4);
	assert.equal(fallAt(KNOTS, 800 - 0.27 * 800, 800), null);
});

test("bands one viewport apart never overlap, and t only rises", () => {
	let seen = null;
	for (let scroll = 0; scroll < 4800; scroll += 8) {
		const fall = fallAt(KNOTS, scroll, 800);
		if (!fall) { seen = null; continue; }
		if (seen && seen.index === fall.index) assert.ok(fall.t >= seen.t);
		seen = fall;
		assert.ok(fall.t >= 0 && fall.t < 1);
	}
});

test("the last floor cannot fall out of the building", () => {
	assert.equal(fallAt(KNOTS, 4800 - 0.5 * 800, 800), null);
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node --test lib/landing/shaft.test.mjs
```

Expected: fails with `Cannot find module '.../lib/landing/shaft.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `lib/landing/shaft.mjs`:

```js
/**
 * The building's geometry, as arithmetic. Pure — no DOM, no three.js — so
 * `node --test` can hold the invariant the whole landing page rests on.
 *
 * One constant maps the page to the world: `world y = -k * page y`. Because that map
 * is linear and every slab sits at the same depth from the camera, a slab placed at a
 * floor's world y projects onto that floor's CSS hairline at every scroll position and
 * every window size. The floors are not tuned to line up; they cannot fail to.
 */

/** Must match the camera in building.js, which inherited it from rig.js. */
export const FOV = 32;

/** A 1.75 m man in rig.js units, where 1 unit = 500 mm. */
const MAN_H = 3.5;

/** The two aspects the figure's on-screen share is quoted at. */
const NARROW = { aspect: 0.45, share: 0.35 };
const WIDE = { aspect: 1.6, share: 0.58 };

/**
 * How big he is, and therefore how big the building is. He holds a fixed share of the
 * viewport, `k` follows from that share, and the camera distance follows from `k`: it is
 * exactly the distance at which one world unit projects to `1/k` pixels. One viewport of
 * scroll is then one storey of building.
 */
export function scaleFor({ width, height }, manHeight = MAN_H) {
	const span = WIDE.aspect - NARROW.aspect;
	const t = Math.min(1, Math.max(0, (width / height - NARROW.aspect) / span));
	const share = NARROW.share + (WIDE.share - NARROW.share) * t;
	const k = manHeight / (share * height);
	const dist = (k * height) / (2 * Math.tan((FOV * Math.PI) / 360));
	return { k, dist, share };
}
```

Append to the same file:

```js
/*
 * A fall runs while the slab he is standing on travels from three quarters of the way
 * down the frame to a quarter of the way down it — half a viewport of scroll. Both
 * hairlines are on screen for all of it, so the drop reads as exactly one storey.
 */
const LEAD = 0.72;
const TRAIL = 0.28;

/** Which floor the reader is on: the first whose slab is below the viewport centre. */
export function floorAt(knots, scrollY, height) {
	const centre = scrollY + height / 2;
	for (let index = 0; index < knots.length; index += 1) {
		if (centre < knots[index]) return index;
	}
	return knots.length - 1;
}

/**
 * The fall in progress, if any. `t` comes off live scroll rather than a clock, which is
 * what makes dragging the scrollbar back up un-fall him instead of replaying a canned
 * animation. The last floor has no fall: there is no storey under it.
 */
export function fallAt(knots, scrollY, height) {
	for (let index = 0; index < knots.length - 1; index += 1) {
		const from = knots[index] - LEAD * height;
		const to = knots[index] - TRAIL * height;
		if (to <= from) continue;
		if (scrollY >= from && scrollY < to) return { index, t: (scrollY - from) / (to - from) };
	}
	return null;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
node --test lib/landing/shaft.test.mjs
```

Expected: `# pass 7`, `# fail 0`.

- [ ] **Step 5: Add the test script**

In `package.json`, change the `scripts` block so it reads:

```json
	"scripts": {
		"dev": "next dev",
		"build": "next build",
		"start": "next start",
		"lint": "next lint",
		"test": "node --test"
	},
```

Then run `npm test` and confirm it discovers both this file and the existing
`lib/site/hours.test.mjs` — expected `# pass 13`, `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add lib/landing/shaft.mjs lib/landing/shaft.test.mjs package.json
git commit -m "Map the page to the world with one constant"
```

---

## Task 2: The corridor — how far each letter moves aside

**Files:**
- Modify: `lib/landing/shaft.mjs` (append)
- Modify: `lib/landing/shaft.test.mjs` (append)

**Interfaces:**
- Consumes: nothing from Task 1; same file, separate concern.
- Produces: `pushes(letters, manX, reach, bounds)` → array of signed pixel offsets, one per
  letter, in the same order. `letters` is `[{ x, w }]` in viewport pixels (left edge and
  width, exactly what `getBoundingClientRect()` gives). `manX` is his projected screen x.
  `reach` is how far either side of him a letter feels the push. `bounds` is
  `{ left, right }`, the column the line may not leave.

- [ ] **Step 1: Write the failing test**

Append to `lib/landing/shaft.test.mjs`:

```js
import { pushes } from "./shaft.mjs";

/** Five 30px letters — "RATES" at tile-lg on a 360px phone — in a 254px column. */
function rates(startX = 20) {
	return Array.from({ length: 5 }, (_, index) => ({ x: startX + index * 32, w: 30 }));
}

test("letters beyond reach do not move at all", () => {
	const out = pushes(rates(), 900, 70, { left: 16, right: 270 });
	assert.deepEqual(out, [0, 0, 0, 0, 0]);
});

test("letters part around him: left goes left, right goes right", () => {
	const letters = rates();
	const manX = letters[2].x + letters[2].w / 2;
	const out = pushes(letters, manX, 70, { left: -9999, right: 9999 });
	assert.ok(out[0] < 0 && out[1] < 0, `${out}`);
	assert.ok(out[3] > 0 && out[4] > 0, `${out}`);
	// Symmetric input, symmetric output.
	assert.ok(Math.abs(out[0] + out[4]) < 1e-9);
	assert.ok(Math.abs(out[1] + out[3]) < 1e-9);
});
```

```js
test("the slack guard keeps every pushed letter inside its column", () => {
	const letters = rates();
	const bounds = { left: 16, right: 270 };
	const out = pushes(letters, letters[2].x + letters[2].w / 2, 70, bounds);
	out.forEach((push, index) => {
		const { x, w } = letters[index];
		assert.ok(x + push >= bounds.left - 1e-9, `letter ${index} left edge ${x + push}`);
		assert.ok(x + w + push <= bounds.right + 1e-9, `letter ${index} right edge ${x + w + push}`);
	});
	// The guard binds — this is a real scale-down, not a no-op.
	assert.ok(Math.abs(out[1]) < 38);
});

test("a line with no slack at all simply does not move", () => {
	const letters = rates();
	const out = pushes(letters, letters[2].x + letters[2].w / 2, 70, { left: 20, right: 178 });
	assert.ok(out.every((push) => push === 0), `${out}`);
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node --test lib/landing/shaft.test.mjs
```

Expected: fails with `pushes is not a function` (or an import error) on the four new tests.

- [ ] **Step 3: Write the implementation**

Append to `lib/landing/shaft.mjs`:

```js
/**
 * The corridor: how far each letter of a heading steps aside for him. Signed by which
 * side of him it sits on, falling off linearly with distance, zero beyond `reach`.
 *
 * Then the guard that only ever matters on a phone: at 360px a heading has barely more
 * width than the word, so an unscaled push shoves the outermost letter off the edge of
 * the screen. Every push is scaled by the least slack any pushed letter actually has, so
 * the line opens as far as it can and no further.
 */
export function pushes(letters, manX, reach, bounds) {
	const raw = letters.map(({ x, w }) => {
		const gap = Math.abs(x + w / 2 - manX);
		if (gap >= reach) return 0;
		return (x + w / 2 < manX ? -1 : 1) * (reach - gap);
	});

	let factor = 1;
	for (let index = 0; index < raw.length; index += 1) {
		const push = raw[index];
		if (!push) continue;
		const { x, w } = letters[index];
		const room = push < 0 ? x - bounds.left : bounds.right - (x + w);
		if (room <= 0) return raw.map(() => 0);
		factor = Math.min(factor, room / Math.abs(push));
	}

	return factor >= 1 ? raw : raw.map((push) => push * factor);
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npm test
```

Expected: `# pass 17`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/landing/shaft.mjs lib/landing/shaft.test.mjs
git commit -m "Open a corridor in a heading without pushing letters off the phone"
```

---

## Task 3: Anatomy — what a body is

**Files:**
- Create: `lib/landing/body.mjs`
- Create: `lib/landing/body.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `MAN_H = 3.5`, `SEG` (segment ratios), `HIP_H` (his hip height off the floor),
    `LIMITS` (radians per joint family)
  - `JOINTS` — the fifteen joint names, in a fixed order
  - `restPose()` → a fresh pose object. **A pose is a flat object**: `root` is `[x, y, z]` in
    world units relative to the floor he stands on, `shoulderL`/`shoulderR` are
    `[swing, out]` radian pairs, and every other joint is a single radian number.
  - `limitOf(joint)` → `[min, max]`, resolving `kneeL` and `kneeR` to `knee`
  - `BONES` — the table `figure.js` builds meshes from:
    `{ name, parent, joint, flex, len, r, offset, rest }`, where `offset` is `[x, y, z]` from
    the parent's far end, `rest` is `[x, y, z]` Euler radians, `len`/`r` are world units,
    `joint` names the pose entry this bone reads, and `flex` is `+1`/`-1` so that a positive
    joint angle is anatomical flexion on every bone.
  - `TORSO` and `BONES[0].name === "pelvis"` — the tree is rooted at the hips.

- [ ] **Step 1: Write the failing test**

Create `lib/landing/body.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { BONES, JOINTS, LIMITS, MAN_H, SEG, HIP_H, restPose, limitOf } from "./body.mjs";

test("he is a 1.75 m man in 500 mm units, and shorter than the bar is long", () => {
	assert.equal(MAN_H, 3.5);
	assert.ok(MAN_H < 2 * 2.14);
});

test("fifteen joints, and a rest pose that names every one of them", () => {
	assert.equal(JOINTS.length, 15);
	const pose = restPose();
	for (const joint of JOINTS) assert.ok(joint in pose, `rest pose is missing ${joint}`);
	assert.equal(pose.root.length, 3);
	assert.equal(pose.shoulderL.length, 2);
});

test("the rest pose is inside every limit", () => {
	const pose = restPose();
	for (const joint of JOINTS) {
		const [min, max] = limitOf(joint);
		for (const value of [].concat(pose[joint])) {
			assert.ok(value >= min && value <= max, `${joint} rests at ${value}, outside ${min}..${max}`);
		}
	}
});

test("limits resolve sides to one family, and every family is covered", () => {
	assert.deepEqual(limitOf("kneeL"), LIMITS.knee);
	assert.deepEqual(limitOf("kneeR"), LIMITS.knee);
	for (const joint of JOINTS) assert.ok(Array.isArray(limitOf(joint)), `no limit for ${joint}`);
});

test("every bone hangs off a bone that exists, and the pelvis is the root", () => {
	const names = new Set(BONES.map((bone) => bone.name));
	assert.equal(BONES[0].name, "pelvis");
	assert.equal(BONES[0].parent, null);
	for (const bone of BONES.slice(1)) {
		assert.ok(names.has(bone.parent), `${bone.name} hangs off missing ${bone.parent}`);
		assert.ok(bone.len > 0 && bone.r > 0, `${bone.name} has no size`);
		assert.equal(bone.offset.length, 3);
	}
});

test("every bone names a joint that exists and a flex direction", () => {
	for (const bone of BONES) {
		assert.ok(limitOf(bone.joint), `${bone.name} reads unknown joint ${bone.joint}`);
		assert.ok([1, 0, -1].includes(bone.flex), `${bone.name} has flex ${bone.flex}`);
		assert.equal(bone.rest.length, 3);
	}
});

test("floor to crown, the segments stack to his whole height", () => {
	const stack = ["ankle", "shin", "thigh", "torso", "neck", "head"].reduce(
		(total, key) => total + SEG[key],
		0,
	);
	assert.ok(Math.abs(stack - 1) < 0.02, `segments stack to ${stack} of his height`);
});

test("the chain lands his hips, his crown and his ankles where the ratios say", () => {
	const at = (name) => BONES.find((bone) => bone.name === name);
	assert.ok(Math.abs(HIP_H - MAN_H * (SEG.ankle + SEG.shin + SEG.thigh)) < 1e-9);
	const crown = HIP_H + at("spine").len + at("neck").len + at("head").len;
	assert.ok(Math.abs(crown - MAN_H) < 1e-9, `crown at ${crown}, not ${MAN_H}`);
	const ankle = HIP_H - at("thighL").len - at("shinL").len;
	assert.ok(Math.abs(ankle - MAN_H * SEG.ankle) < 1e-9, `ankle at ${ankle}`);
	// Both chains leaving the hips step back down the pelvis stub, or he stands on stilts.
	assert.equal(at("spine").offset[1], -at("pelvis").len);
	assert.equal(at("thighL").offset[1], -at("pelvis").len);
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node --test lib/landing/body.test.mjs
```

Expected: fails with `Cannot find module '.../lib/landing/body.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `lib/landing/body.mjs`:

```js
/**
 * What a body is and how it moves. Pure — no three.js — so the animation can be tested
 * in node without a GPU. `figure.js` holds how it is built out of steel; nothing about
 * geometry or materials belongs here.
 *
 * Working in rig.js units, where 1 unit = 500 mm.
 */

/** A 1.75 m man. He is correctly shorter than the 2.14-unit bar is long. */
export const MAN_H = 3.5;

/**
 * Drillis & Contini segment ratios, as fractions of standing height, rather than
 * eyeballed numbers. Ankle height and neck length are here so the stack from floor to
 * crown comes to exactly 1.
 */
export const SEG = {
	ankle: 0.039,
	shin: 0.246,
	thigh: 0.245,
	torso: 0.288,
	neck: 0.052,
	head: 0.130,
	upperArm: 0.172,
	forearm: 0.157,
	hand: 0.108,
	foot: 0.152,
	shoulders: 0.259,
	hips: 0.191,
};

/**
 * How high his hips are off the floor he is standing on. A pose's `root` is measured from
 * standing, so `root: [0, 0, 0]` puts his feet on the floor and `figure.js` adds this.
 */
export const HIP_H = MAN_H * (SEG.ankle + SEG.shin + SEG.thigh);

/** Radians, and they are anatomy rather than taste: a knee does not bend forwards. */
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
```

Append to `lib/landing/body.mjs`:

```js
export const JOINTS = [
	"pelvis", "spine", "neck",
	"shoulderL", "shoulderR", "elbowL", "elbowR", "wristL", "wristR",
	"hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR",
];

/** `kneeL` and `kneeR` are the same joint family. */
export function limitOf(joint) {
	return LIMITS[joint.replace(/[LR]$/, "")];
}

/**
 * A pose is a flat object. `root` is his hips in world units relative to the floor he
 * stands on; shoulders carry two angles (swing forward, abduction out) because an arm
 * needs both; every other joint is one angle. Standing, not limp: a real body at rest
 * holds a little elbow and knee.
 */
export function restPose() {
	return {
		root: [0, 0, 0],
		pelvis: 0, spine: 0, neck: 0,
		shoulderL: [0, 0.14], shoulderR: [0, -0.14],
		elbowL: 0.12, elbowR: 0.12,
		wristL: 0, wristR: 0,
		hipL: 0, hipR: 0,
		kneeL: -0.08, kneeR: -0.08,
		ankleL: 0, ankleR: 0,
	};
}

const U = (ratio) => ratio * MAN_H;

/*
 * He faces +x and the camera sits on +z, so it sees him in profile and the sagittal
 * plane is xy. Every single-axis joint therefore rotates about **Z**, and a shoulder's
 * second angle rotates about X, into depth.
 *
 * `flex` is what makes one sign mean one thing everywhere: a joint angle is applied as
 * `rotation.z = rest.z + flex * angle`, and **positive is always anatomical flexion**.
 * It is -1 on the bones that point up and +1 on everything that hangs, because flexing a
 * spine forward and swinging a thigh forward are opposite rotations of the same sign.
 * Without it, the sign of every clip's spine would have to be reasoned about one clip
 * at a time.
 */
const DOWN = [0, 0, Math.PI];

/** The pelvis stub. Both the spine and the legs step back down it to reach the hips. */
const PELVIS = 0.26;

/**
 * The bone table `figure.js` builds meshes from. Every bone is one capsule of length
 * `len` drawn along its own +Y, placed at `offset` from its parent's far end, oriented by
 * `rest` and then by the pose angle named in `joint`.
 *
 * The pelvis is the one bone that is not a link in a chain — it is a mass around the hips,
 * so the two chains that leave the hips (the spine going up, each thigh going down) both
 * carry `-PELVIS` to undo it. Get that wrong and he stands 130 mm too tall on stilts.
 */
export const TORSO = [
	{ name: "pelvis", parent: null, joint: "pelvis", flex: -1, len: PELVIS, r: 0.15, offset: [0, 0, 0], rest: [0, 0, 0] },
	{ name: "spine", parent: "pelvis", joint: "spine", flex: -1, len: U(SEG.torso), r: 0.17, offset: [0, -PELVIS, 0], rest: [0, 0, 0] },
	{ name: "neck", parent: "spine", joint: "neck", flex: -1, len: U(SEG.neck), r: 0.07, offset: [0, 0, 0], rest: [0, 0, 0] },
	// The head rides the neck. `flex: 0` is how it does not nod a second time on top of it.
	{ name: "head", parent: "neck", joint: "neck", flex: 0, len: U(SEG.head), r: 0.145, offset: [0, 0, 0], rest: [0, 0, 0] },
];

/** One arm and one leg, mirrored. `sign` is +1 on his left, -1 on his right. */
function side(tag, sign) {
	const shoulder = (U(SEG.shoulders) / 2) * sign;
	// The femoral heads sit about halfway out along the pelvis, not at its edge.
	const hip = (U(SEG.hips) / 4) * sign;
	return [
		{ name: `upperArm${tag}`, parent: "spine", joint: `shoulder${tag}`, flex: 1, len: U(SEG.upperArm), r: 0.085, offset: [shoulder, -0.06, 0], rest: DOWN },
		{ name: `forearm${tag}`, parent: `upperArm${tag}`, joint: `elbow${tag}`, flex: 1, len: U(SEG.forearm), r: 0.07, offset: [0, 0, 0], rest: [0, 0, 0] },
		{ name: `hand${tag}`, parent: `forearm${tag}`, joint: `wrist${tag}`, flex: 1, len: U(SEG.hand), r: 0.06, offset: [0, 0, 0], rest: [0, 0, 0] },
		{ name: `thigh${tag}`, parent: "pelvis", joint: `hip${tag}`, flex: 1, len: U(SEG.thigh), r: 0.115, offset: [hip, -PELVIS, 0], rest: DOWN },
		{ name: `shin${tag}`, parent: `thigh${tag}`, joint: `knee${tag}`, flex: 1, len: U(SEG.shin), r: 0.095, offset: [0, 0, 0], rest: [0, 0, 0] },
		// Toes toward +x, the way he faces. If they come out behind him in Task 8, negate this.
		{ name: `foot${tag}`, parent: `shin${tag}`, joint: `ankle${tag}`, flex: 1, len: U(SEG.foot), r: 0.075, offset: [0, 0, 0], rest: [0, 0, Math.PI / 2] },
	];
}

export const BONES = [...TORSO, ...side("L", 1), ...side("R", -1)];
```

Note the two-axis joints: a bone whose `joint` is `shoulderL` or `shoulderR` reads a
`[swing, out]` pair — swing about Z, in the plane the camera sees, and `out` about X, into
depth. Every other bone reads one number about Z.


- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npm test
```

Expected: `# pass 25` (13 after Task 1, 17 after Task 2, plus eight here).

- [ ] **Step 5: Commit**

```bash
git add lib/landing/body.mjs lib/landing/body.test.mjs
git commit -m "feat: give the landing figure an anatomy"
```

---

## Task 4: The nine clips — how a body moves

**Files:**
- Modify: `lib/landing/body.mjs` (append; the anatomy from Task 3 stays as it is)
- Modify: `lib/landing/body.test.mjs` (append)

**Interfaces:**
- Consumes: `MAN_H`, `SEG`, `LIMITS`, `JOINTS`, `restPose`, `limitOf` from Task 3.
- Produces:
  - Nine clips, each `(t) => pose`: `stand`, `look`, `press`, `load`, `walk`, `run`,
    `jump`, `fall`, `land`
  - `CLIPS` — `{ stand, look, press, ... }`, so `building.js` can name one from a station table
  - `LOOPS` — the names of the six periodic clips, the ones that must close their loop
  - `blend(a, b, m)` → a new pose, `m` from 0 to 1, arrays interpolated element-wise
  - `breath(pose, seconds)` → a new pose. **Not a clip.** It runs on the wall clock and is
    applied by `building.js` on top of whatever clip is playing, which is what keeps it
    from breaking loop closure.

**What `t` means:** for the six periodic clips it is cycle position and only its fractional
part matters — `clip(0)` and `clip(1)` are the same pose, so reps do not pop. For `jump`,
`fall` and `land` it runs 0 to 1 once.

**What `root` means:** a local offset in world units from the point he stands on, not a
world position. `building.js` adds it to the trajectory. That is why `fall` leaves it at
zero — during a fall the trajectory is the parabola, and the clip only shapes the body.

- [ ] **Step 1: Write the failing test**

Append to `lib/landing/body.test.mjs`:

```js
import { CLIPS, LOOPS, blend, breath, jump, land, stand } from "./body.mjs";

/** Twenty-one samples across a cycle: enough to catch a limit break or a pop. */
const SAMPLES = Array.from({ length: 21 }, (_, index) => index / 20);

test("all nine clips exist, and the six that repeat are named", () => {
	assert.equal(Object.keys(CLIPS).length, 9);
	for (const name of LOOPS) assert.ok(name in CLIPS, `${name} is not a clip`);
	assert.equal(LOOPS.length, 6);
});

test("every looping clip ends where it started, so reps do not pop", () => {
	for (const name of LOOPS) {
		const first = CLIPS[name](0);
		const last = CLIPS[name](1);
		for (const joint of ["root", ...JOINTS]) {
			const from = [].concat(first[joint]);
			const to = [].concat(last[joint]);
			from.forEach((value, index) => {
				assert.ok(
					Math.abs(value - to[index]) < 1e-9,
					`${name} does not close: ${joint} goes ${value} to ${to[index]}`,
				);
			});
		}
	}
});

test("no clip breaks an anatomical limit", () => {
	for (const [name, clip] of Object.entries(CLIPS)) {
		for (const t of SAMPLES) {
			const posed = clip(t);
			for (const joint of JOINTS) {
				const [min, max] = limitOf(joint);
				for (const value of [].concat(posed[joint])) {
					assert.ok(
						value >= min && value <= max,
						`${name} at t=${t} puts ${joint} at ${value}, outside ${min}..${max}`,
					);
				}
			}
		}
	}
});

test("he dips before he jumps, and leaves the floor by the end of it", () => {
	assert.ok(jump(0.2).root[1] < jump(0).root[1], "no anticipation in the jump");
	assert.ok(jump(1).root[1] > jump(0).root[1], "he never leaves the floor");
});

test("landing overshoots and settles, rather than stopping dead", () => {
	const heights = SAMPLES.map((t) => land(t).root[1]);
	assert.ok(Math.min(...heights) < -0.3, "he does not absorb the landing");
	assert.ok(Math.max(...heights) > 0.02, "he does not rebound past his rest height");
	assert.ok(Math.abs(land(1).root[1]) < 0.02, `he ends the landing at ${land(1).root[1]}`);
});

test("blending hits both ends exactly and interpolates the pairs", () => {
	const a = stand(0);
	const b = jump(0.2);
	assert.deepEqual(blend(a, b, 0), a);
	assert.deepEqual(blend(a, b, 1), b);
	const half = blend(a, b, 0.5);
	assert.ok(Math.abs(half.root[1] - (a.root[1] + b.root[1]) / 2) < 1e-12);
	assert.equal(half.shoulderL.length, 2);
});

test("breath never stops, stays small, and cannot push a joint past its limit", () => {
	const base = stand(0);
	const early = breath(base, 0);
	const later = breath(base, 1.35);
	assert.notEqual(early.spine, later.spine);
	assert.ok(Math.abs(later.spine - base.spine) < 0.05, "breath is not subtle");
	const extreme = breath({ ...base, spine: LIMITS.spine[1] }, 0.68);
	assert.ok(extreme.spine <= LIMITS.spine[1], "breath pushed the spine past its limit");
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node --test lib/landing/body.test.mjs
```

Expected: fails on the new import — `The requested module './body.mjs' does not provide an
export named 'CLIPS'`.

- [ ] **Step 3: Write the shared machinery**

Append to `lib/landing/body.mjs`:

```js
/*
 * Alive is four things, none of them expensive. Anticipation — he dips before he
 * jumps. Overlap — his arms trail his torso. Settle — he overshoots a landing and
 * damps back. Breath — a spine sine that never stops. At silhouette scale that is
 * what reads as a man; fidelity is not what buys it.
 */

const TAU = Math.PI * 2;
const LAG = 0.055; // ~60 ms of a one-second cycle: his arms trail his torso
const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value));

/** Every clip starts from rest and names only what it moves. */
const posed = (over) => ({ ...restPose(), ...over });

export function blend(a, b, m) {
	if (m <= 0) return { ...a };
	if (m >= 1) return { ...b };
	const out = {};
	for (const key of Object.keys(a)) {
		const from = a[key];
		const to = b[key];
		out[key] = Array.isArray(from)
			? from.map((value, index) => value + (to[index] - value) * m)
			: from + (to - from) * m;
	}
	return out;
}

const BREATH_HZ = 0.37;

/**
 * The one motion that never stops. On the wall clock rather than the clip, so it
 * keeps going while a paragraph is being read — and so it cannot break the loop
 * closure the clips are tested for.
 */
export function breath(pose, seconds) {
	const swell = Math.sin(TAU * BREATH_HZ * seconds);
	return {
		...pose,
		spine: clamp(pose.spine + swell * 0.02, limitOf("spine")),
		neck: clamp(pose.neck - swell * 0.012, limitOf("neck")),
	};
}
```

- [ ] **Step 4: Write the four station clips**

Append to `lib/landing/body.mjs`:

```js
/** Idle: weight shifting from foot to foot. What he does between everything else. */
export function stand(t) {
	const sway = Math.sin(TAU * t) * 0.03;
	return posed({
		root: [0, -Math.abs(sway) * 0.3, 0],
		pelvis: sway,
		spine: -sway * 0.6,
		shoulderL: [Math.sin(TAU * (t - LAG)) * 0.04, 0.17],
		shoulderR: [Math.sin(TAU * (t - LAG)) * 0.04, -0.17],
		elbowL: 0.22,
		elbowR: 0.22,
	});
}

/** He looks over the edge at the floor below. Played once he has landed and turned. */
export function look(t) {
	const turn = Math.sin(TAU * t);
	return posed({
		...stand(t),
		neck: 0.34 + turn * 0.14,
		spine: 0.1 + turn * 0.05,
		shoulderL: [0.18, 0.2],
		shoulderR: [0.18, -0.2],
		elbowL: 0.3,
		elbowR: 0.3,
	});
}

/** Floor 05: mid-set on the loaded bar. One rep per cycle, driving off the chest. */
export function press(t) {
	const drive = (1 - Math.cos(TAU * t)) / 2; // 0 at both ends, 1 at lockout
	return posed({
		root: [0, -0.1 + drive * 0.06, 0],
		spine: -0.1 - drive * 0.04,
		neck: -0.06,
		shoulderL: [-1.35 + drive * 0.55, 0.48],
		shoulderR: [-1.35 + drive * 0.55, -0.48],
		elbowL: 2.15 - drive * 2.0,
		elbowR: 2.15 - drive * 2.0,
		hipL: 0.12,
		hipR: 0.12,
		kneeL: -0.22,
		kneeR: -0.22,
	});
}
```

```js
/** Floor 04: loading the bar, one plate per cycle — one plate per priced term. */
export function load(t) {
	const stoop = (1 - Math.cos(TAU * t)) / 2; // 0 upright, 1 fully bent
	const carry = Math.sin(TAU * t); // asymmetric: reaching down, then lifting
	return posed({
		root: [0, -stoop * 0.5, stoop * 0.15],
		pelvis: stoop * 0.5,
		spine: stoop * 0.55,
		neck: -stoop * 0.3,
		shoulderL: [-stoop * 0.9 + carry * 0.2, 0.2],
		shoulderR: [-stoop * 0.9 + carry * 0.2, -0.2],
		elbowL: 0.25 + stoop * 0.5,
		elbowR: 0.25 + stoop * 0.5,
		hipL: stoop * 1.1,
		hipR: stoop * 1.1,
		kneeL: -stoop * 1.3,
		kneeR: -stoop * 1.3,
		ankleL: stoop * 0.3,
		ankleR: stoop * 0.3,
	});
}

/** The knee of a leg on its way through: bent on the swing, straight on the stance. */
const swingKnee = (phase) => -Math.max(0, -Math.sin(TAU * phase)) * 0.8 - 0.1;

/** Floor 03: walking the floor past the machines. Contralateral, arms trailing. */
export function walk(t) {
	const step = Math.sin(TAU * t);
	const arm = Math.sin(TAU * (t - LAG));
	return posed({
		root: [0, -0.06 + Math.cos(2 * TAU * t) * 0.06, 0],
		pelvis: step * 0.09,
		spine: -step * 0.07,
		hipL: step * 0.5,
		hipR: -step * 0.5,
		kneeL: swingKnee(t),
		kneeR: swingKnee(t + 0.5),
		ankleL: -step * 0.18,
		ankleR: step * 0.18,
		shoulderL: [-arm * 0.4, 0.2],
		shoulderR: [arm * 0.4, -0.2],
		elbowL: 0.35 + Math.max(0, arm) * 0.3,
		elbowR: 0.35 + Math.max(0, -arm) * 0.3,
	});
}
```

```js
/** Floor 02: on the treadmill. Same shape as the walk, further through the air. */
export function run(t) {
	const step = Math.sin(TAU * t);
	const arm = Math.sin(TAU * (t - LAG));
	return posed({
		root: [0, -0.1 + Math.abs(Math.cos(TAU * t)) * 0.28, 0],
		pelvis: step * 0.14,
		spine: 0.18 - step * 0.1,
		neck: -0.14,
		hipL: step * 0.9,
		hipR: -step * 0.9,
		kneeL: -0.5 - Math.max(0, -step) * 1.3,
		kneeR: -0.5 - Math.max(0, step) * 1.3,
		ankleL: -step * 0.25,
		ankleR: step * 0.25,
		shoulderL: [-arm * 0.7, 0.24],
		shoulderR: [arm * 0.7, -0.24],
		elbowL: 1.3,
		elbowR: 1.3,
	});
}
```

- [ ] **Step 5: Write the three transit clips**

These are the fall itself: he sinks, leaves, crosses the type, and takes the landing.

Append to `lib/landing/body.mjs`:

```js
/** Anticipation, then the push. He sinks for the first third and is gone after it. */
export function jump(t) {
	const dip = t < 0.35 ? Math.sin((Math.PI * t) / 0.35) : 0;
	const push = t < 0.35 ? 0 : (t - 0.35) / 0.65;
	const tuck = Math.sin(Math.PI * push) ** 2;
	return posed({
		root: [0, -dip * 0.55 + push * 1.4, push * 0.35],
		pelvis: dip * 0.3,
		spine: dip * 0.4 - push * 0.15,
		hipL: dip * 1.2 + tuck * 0.6,
		hipR: dip * 1.2 + tuck * 0.6,
		kneeL: -dip * 1.5 - tuck * 0.9,
		kneeR: -dip * 1.5 - tuck * 0.9,
		ankleL: dip * 0.4 - push * 0.5,
		ankleR: dip * 0.4 - push * 0.5,
		shoulderL: [dip * 0.8 - push * 2.2, 0.26],
		shoulderR: [dip * 0.8 - push * 2.2, -0.26],
		elbowL: 0.3 + dip * 0.4,
		elbowR: 0.3 + dip * 0.4,
	});
}
```

```js
/**
 * Falling. `root` stays at zero: during a fall the parabola in `building.js` is his
 * position and the clip only shapes the body — legs trailing, one arm reaching for
 * the floor below, spine arched against the drop. Asymmetric on purpose: a
 * symmetrical fall reads as a dropped mannequin.
 */
export function fall(t) {
	const settle = Math.min(1, t * 3);
	return posed({
		root: [0, 0, 0],
		pelvis: -0.2 * settle,
		spine: -0.35 * settle,
		neck: 0.3 * settle,
		shoulderL: [-2.4 * settle, 0.4],
		shoulderR: [-1.5 * settle, -0.55],
		elbowL: 0.5,
		elbowR: 1.1,
		hipL: -0.5 * settle,
		hipR: 0.7 * settle,
		kneeL: -0.4 - settle * 0.5,
		kneeR: -0.1 - settle * 1.4,
		ankleL: -0.4 * settle,
		ankleR: -0.2,
	});
}

/**
 * The landing: absorb, overshoot, damp back to standing. The whole reason a landing
 * reads as weight rather than as a teleport, and the cheapest of the four.
 */
export function land(t) {
	const q = Math.exp(-5 * t) * Math.cos(TAU * 1.4 * t);
	const absorb = Math.max(0, q);
	return posed({
		root: [0, -q * 0.55, 0],
		pelvis: absorb * 0.35,
		spine: absorb * 0.4 - Math.min(0, q) * 0.2,
		neck: -absorb * 0.2,
		hipL: absorb * 1.3,
		hipR: absorb * 1.3,
		kneeL: -absorb * 1.7,
		kneeR: -absorb * 1.7,
		ankleL: absorb * 0.45,
		ankleR: absorb * 0.45,
		shoulderL: [-absorb * 1.1, 0.3 + absorb * 0.1],
		shoulderR: [-absorb * 1.1, -0.3 - absorb * 0.1],
		elbowL: 0.4 + absorb * 0.8,
		elbowR: 0.4 + absorb * 0.8,
	});
}

export const CLIPS = { stand, look, press, load, walk, run, jump, fall, land };

/** The clips whose end must equal their start, because they repeat while he is read. */
export const LOOPS = ["stand", "look", "press", "load", "walk", "run"];
```

- [ ] **Step 6: Run the tests and confirm they pass**

```bash
npm test
```

Expected: `# pass 32` (25 after Task 3, plus seven here).

If the limit test fails, the fix is the coefficient it names, not the limit — `LIMITS` is
anatomy and the clips have to live inside it.

- [ ] **Step 7: Commit**

```bash
git add lib/landing/body.mjs lib/landing/body.test.mjs
git commit -m "feat: add the nine clips the landing figure moves through"
```

---

## Task 5: The building in markup and CSS

Everything in this task works with no JavaScript and no WebGL, and it is the whole
"no WebGL" fallback path. Nothing here depends on Tasks 1–4.

**Files:**
- Modify: `app/globals.css`
- Modify: `app/page.js`

**Interfaces:**
- Consumes: nothing.
- Produces, for `measure.js` in Task 6 to read:
  - Seven `[data-floor]` elements in document order: `"05"`, `"04"`, `"03"`, `"02"`,
    `"01"`, `"00"`, `"ground"`. The top of each is a slab; **the top of `"05"` is not**
    (it is the top of the building), so `knots` is the last six.
  - Each floor's own heading is `floorEl.querySelector("h2")`. Floor 05 has an `h1`
    and no `h2`, which is correct — the brand never parts.
- Produces, for `building.js` in Task 9 to write: `--push` per `.letter-tile` and
  `--open` per heading.

**Section order changes.** `HOURS` moves above `THE FINE PRINT`, per the floor map:
04 RATES, 03 THE ROOM, 02 HOURS, 01 THE FINE PRINT + RESULTS, 00 VISIT + JOIN.

- [ ] **Step 1: Add the lane token**

In `app/globals.css`, in the `:root` block, after the `--gutter` line:

```css
	/*
	 * His lane: the right-hand strip of every floor, kept clear of type so he has
	 * somewhere to stand. `Band` currently puts its aside exactly here, which is why
	 * the aside moves under the heading in this task. At 360px this leaves a ~252px
	 * type column — the number the twelve-letter headings are measured against.
	 */
	--lane: clamp(4.5rem, 22vw, 24rem);
```

- [ ] **Step 2: Make the document scroller snap by floor**

In `app/globals.css`, inside `@layer base`, add one line to the existing `html` rule so
it reads:

```css
	html {
		scroll-behavior: smooth;
		/* The rail is sticky, so an anchored section must stop below it. */
		scroll-padding-top: calc(var(--rail-height) + 0.75rem);
		-webkit-text-size-adjust: 100%;
		/*
		 * One gesture is one floor. `proximity`, never `mandatory`: mandatory makes
		 * every resting position between two floors unreachable, which fails WCAG
		 * 1.4.10 Reflow at 200% zoom — the same reason a scroll lock was declined.
		 */
		scroll-snap-type: y proximity;
	}
```

- [ ] **Step 3: Add the floor rules**

In `app/globals.css`, inside `@layer components`, after the `.hair` rule:

```css
	/*
	 * A floor is the span of page between two hairlines, not one <section>. The
	 * hairline is the floor slab: what he stands on, walks along, and what opens for
	 * him to fall through. `scroll-snap-stop: always` is what stops a fling skipping
	 * two floors, so one gesture is one fall.
	 */
	.floor {
		position: relative;
		scroll-snap-align: start;
		scroll-snap-stop: always;
	}

	/* Floor 05 is the top of the building, so it has no slab of its own. */
	.floor + .floor {
		border-top: 1px solid var(--edge);
	}

	/* Two sections sharing a floor still get a rule between them. It is not a slab. */
	.floor > section + section {
		border-top: 1px solid var(--edge);
	}

	/*
	 * Every floor prints its number. Orientation while the canvas runs, and the entire
	 * building metaphor when it never mounts — which is why it is markup rather than
	 * something the renderer draws. It sits in his lane, clear of the type column.
	 */
	.floor-no {
		position: absolute;
		top: 0.6rem;
		right: var(--gutter);
		z-index: 1;
		font-variant-numeric: tabular-nums;
	}

	/*
	 * Floor 03 is where he walks past the machines, and the rail *is* the machines: it
	 * drops behind the canvas so he walks in front of the photographs, the same layered
	 * depth `.mural` uses. The canvas is pointer-events-none, so the rail stays swipeable.
	 */
	.floor[data-floor="03"] .strip {
		position: relative;
		z-index: -12;
	}

	/*
	 * There is more, one floor at a time — and it stops saying so once the visitor has
	 * moved. A view timeline drives it, like `.marquee`, so it costs no JS, and the
	 * reduced-motion block at the foot of this file already silences it.
	 */
	.hint {
		display: block;
		width: 1px;
		height: 2.5rem;
		background: linear-gradient(to bottom, transparent, var(--action));
		transform-origin: top center;
	}

	@supports (animation-timeline: view()) {
		@media (prefers-reduced-motion: no-preference) {
			.hint {
				animation: hint linear both;
				animation-timeline: view();
				animation-range: cover 0% cover 40%;
			}
		}
	}

	@keyframes hint {
		from {
			transform: scaleY(1);
			opacity: 1;
		}
		to {
			transform: scaleY(0.2);
			opacity: 0;
		}
	}
```

- [ ] **Step 4: Let the letters move, and stop the wipe from clipping them**

In `app/globals.css`, add one declaration to the existing `.letter-tile` rule — it goes
last in that block, after `flex: none`:

```css
		/*
		 * The corridor. `--push` is written once per fall, signed by which side of him
		 * the letter sits on; `--open` is one write per frame for the heading being
		 * crossed. Both default to nothing, so with no JS the letters simply do not move.
		 */
		transform: translateX(calc(var(--push, 0px) * var(--open, 0)));
```

Then replace the whole `@keyframes wipe` block. `inset(0 0 0 0)` clips at the border box,
so a heading parting for him would have its outermost letters cut off — the slack is what
prevents that, and it changes nothing about how the wipe looks:

```css
	@keyframes wipe {
		from {
			clip-path: inset(0 100% 0 -100vw);
		}
		to {
			clip-path: inset(0 -100vw 0 -100vw);
		}
	}
```

`press-in` still sets `transform` outright and wins over the corridor for the letters it
runs on. Only the `h1` uses `press`, and the brand is never crossed, so that stands.

- [ ] **Step 5: Add the `Floor` wrapper to `app/page.js`**

Insert after the `Band` function (around line 72):

```jsx
/**
 * One floor of the building: the span of page between two hairlines. `measure.js`
 * reads the top of these elements and nothing else — the wall strip and the scale
 * grid draw rules that are not slabs. The number is printed in the markup rather
 * than drawn by the renderer, because where WebGL never starts it is the only thing
 * left saying "building".
 */
function Floor({ id, children }) {
	return (
		<div className="floor" data-floor={id}>
			<Stamp className="floor-no">{id}</Stamp>
			{children}
		</div>
	);
}
```

- [ ] **Step 6: Move `Band`'s aside out of his lane**

`Band` currently places its `aside` on the right of the heading baseline, which is
exactly where he stands. Replace the whole `Band` function body's `return` with:

```jsx
	return (
		<section id={id} className="py-14 sm:py-20">
			<div className="mx-auto w-full max-w-board px-gutter pr-[calc(var(--gutter)+var(--lane))]">
				<header className="mb-8 flex flex-col gap-4 sm:mb-12">
					<TileText as="h2" text={title} className="wipe tile-lg" />
					{aside ? <div className="rise max-w-measure">{aside}</div> : null}
				</header>
				{children}
			</div>
			{bleed}
		</section>
	);
```

Also drop `border-t border-edge` from the `<section>` — `.floor + .floor` and
`.floor > section + section` draw every rule on this page now, and leaving it here
would double the hairline `measure.js` reads.

Two consequences to carry through the asides themselves: `sm:items-end`,
`sm:text-right` and `sm:justify-end` inside an aside now point at nothing. Strip them
as you meet them — RATES, THE ROOM, HOURS, RESULTS, VISIT and JOIN each have one.

- [ ] **Step 7: Group the page into six floors**

Every block named below moves **verbatim**; only the wrappers around them are new. The
line numbers are the file as it stands before this task.

```jsx
			<main id="board-main">
				<Floor id="05">
					{/* the hero <section>, lines 186–247 */}
					{/* the wall strip <div className="marquee">, lines 249–258 */}
					{/* the three-figure scale <section>, lines 260–285 */}

					{/* There is more, one floor at a time. */}
					<div aria-hidden="true" className="flex justify-center pb-10">
						<span className="hint" />
					</div>
				</Floor>

				<Floor id="04">{/* the RATES <Band>, lines 287–313 */}</Floor>

				<Floor id="03">{/* the THE ROOM <Band>, lines 315–325 */}</Floor>

				<Floor id="02">{/* the HOURS <Band>, lines 365–375 */}</Floor>

				<Floor id="01">
					{/* the THE FINE PRINT <Band>, lines 327–363 */}
					{/* the RESULTS <Band>, lines 377–405 */}
				</Floor>

				<Floor id="00">
					{/* the VISIT <Band> and its hasVisitInfo guard, lines 407–465 */}
					{/* the JOIN THE FLOOR <Band> and its comment, lines 467–508 */}
				</Floor>

				{/* The ground outside the door, under floor 00's slab. */}
				<footer className="floor border-t border-edge" data-floor="ground">
					{/* the footer's inner <div>, lines 511–538 */}
				</footer>
			</main>
```

Three more edits in the same pass:

1. The hero's inner column gets his lane too. On line 210, add the padding:

```jsx
					<div className="relative mx-auto flex w-full max-w-board flex-col gap-7 pr-[var(--lane)] sm:gap-9">
```

2. Delete the `<RigStage plates={...} />` line (183) and its import (24). The canvas
   comes back as `Stage` in Task 10; until then the page is the no-WebGL path, which is
   worth looking at on its own.

3. Delete the surrounding `<>…</>` fragment if `RigStage` was its only sibling — `main`
   becomes the single root again.

- [ ] **Step 8: Lint and build**

```bash
npm run lint && npm run build
```

Expected: no warnings, and `Route (app) ┌ ○ /` in the build output. If lint reports
`'RigStage' is defined but never used`, the import in edit 2 above was missed.

- [ ] **Step 9: Check it by eye at 360px — both known failure points**

```bash
npm run dev
```

At 360×800 in a device-emulating viewport, confirm:

- Seven floor numbers, `05` through `00` and none on the footer, each sitting just under
  its own hairline on the right.
- **"THE FINE PRINT" and "JOIN THE FLOOR" fit the type column.** Twelve letters each at
  `tile-lg`'s ~30px. They may wrap between words; they may not overflow into the lane or
  off the screen. If either does, narrow `--lane`'s `22vw` — do not shrink `tile-lg`,
  which is the site's wall-scale voice everywhere else.
- The RATES ledger rows still read inside the narrowed column, and each is still at least
  76px tall for the thumb.
- One flick advances exactly one floor and stops. Page Down, Home, End, space and the
  arrow keys all still work.
- At 200% browser zoom a floor taller than the viewport scrolls **inside itself** before
  the next floor snaps. If it does not, `scroll-snap-type` was set to `mandatory`.
- The navbar and footer anchors still land on `#rates`, `#room`, `#hours` directly.

- [ ] **Step 10: Commit**

```bash
git add app/page.js app/globals.css
git commit -m "feat: build the landing page as six floors of a building"
```

---

## Task 6: `measure.js` — the only module that touches the DOM

**Files:**
- Create: `app/components/landing/measure.js`

**Interfaces:**
- Consumes: the markup from Task 5.
- Produces:
  - `read()` → `{ knots, headings }`. `knots` is the six page-y slab offsets, ready to
    hand straight to `floorAt` and `fallAt` from Task 1. `headings` is five entries,
    indexed to match `fallAt`'s `index`, each
    `{ el, letters: [{ el, x, w }], bounds: { left, right } }` in viewport pixels.
  - `observe(onChange)` → a stop function. Calls `onChange(read())` once immediately, then
    again on every event that can move a hairline.

- [ ] **Step 1: Write it**

Create `app/components/landing/measure.js`:

```js
"use client";

/**
 * The only module in this feature that touches the DOM. Everything else works on
 * numbers, which is what lets the maths be tested in node without a browser.
 */

/** Page-y of every slab, and the letters of every heading that parts for him. */
export function read() {
	const floors = Array.from(document.querySelectorAll("[data-floor]"));
	const tops = floors.map((el) => el.getBoundingClientRect().top + window.scrollY);

	// The slab he stands on is the *next* floor's hairline, so floor 05's own top is
	// not a knot — it is the top of the building. The last knot is the ground.
	const knots = tops.slice(1);

	// Five floors below the top, five falls, five headings that part — indexed the
	// same as fallAt's `index`. Floor 05's h1 is deliberately not among them: the
	// brand sits above him and is never crossed.
	const headings = floors.slice(1, 6).map((floor) => {
		const el = floor.querySelector("h2");
		if (!el) return null;

		// Measure with the corridor shut, or every rect comes back already pushed.
		el.style.setProperty("--open", "0");
		const column = el.parentElement.getBoundingClientRect();
		const letters = Array.from(el.querySelectorAll(".letter-tile")).map((tile) => {
			const rect = tile.getBoundingClientRect();
			return { el: tile, x: rect.left, w: rect.width };
		});

		return { el, letters, bounds: { left: column.left, right: column.right } };
	});

	return { knots, headings };
}

/**
 * Re-read on anything that can move a hairline: the owner editing content, an image
 * arriving, the window resizing, the font swapping in. That last one is not optional
 * — Archivo loads through `next/font` with `display: swap`, so letter widths change
 * after first paint, and without this hook every corridor sits offset from its fall.
 */
export function observe(onChange) {
	let live = true;
	const fire = () => {
		if (live) onChange(read());
	};

	const observer = new ResizeObserver(fire);
	const main = document.getElementById("board-main");
	if (main) observer.observe(main);
	window.addEventListener("resize", fire);
	document.fonts?.ready.then(fire);

	fire();

	return () => {
		live = false;
		observer.disconnect();
		window.removeEventListener("resize", fire);
	};
}
```

- [ ] **Step 2: Check it against the real page**

Add one temporary line to the foot of `measure.js` so the console can reach it:

```js
if (typeof window !== "undefined") window.__measure = read;
```

Nothing imports `measure.js` yet, so add one temporary line at the top of the still-present
`app/components/landing/rig-stage.js` to get the module into the page's bundle:

```js
import "./measure";
```

Then:

```bash
npm run dev
```

In the browser console on `/`:

```js
__measure().knots.length;                      // 6
__measure().headings.length;                   // 5
__measure().headings.map((h) => h.el.textContent);
// ["RATES", "THEROOM", "HOURS", "THEFINEPRINT", "VISIT"]
__measure().headings[0].letters.length;        // 5
__measure().knots.every((k, i, a) => !i || k > a[i - 1]);  // true — ascending
```

`textContent` runs the letters together because each letter is its own span; the
`aria-label` on the heading still reads the words with their spaces. That is the existing
`TileText` contract and it is what a screen reader is protected from.

Delete both temporary lines — the probe in `measure.js` and the import in `rig-stage.js` —
before committing.

- [ ] **Step 3: Commit**

```bash
git add app/components/landing/measure.js
git commit -m "feat: read the building's slabs and heading letters off the page"
```

---

## Task 7: `props.js` — the steel, moved and extended

The barbell is moved out of `rig.js` **substantially verbatim**: it is the hero object of
floor 05 and it already works. What is new is three silhouette props and one matte
material for the figure.

**Files:**
- Create: `app/components/landing/props.js`

**Interfaces:**
- Consumes: `plateColor` from `@/lib/site/defaults`, and `three`.
- Produces:
  - `token(name, fallback)` → the computed value of a CSS custom property
  - `roomEnvironment(renderer, action, accent)` → a PMREM environment texture
  - `makeMaterials({ track, narrow })` → `{ steel, chrome, rubber, matte, ring, lathe }`.
    `track(x)` is the caller's dispose registry; `lathe(points, segments?)` is a helper
    the props share; `ring` is the segment count.
  - `barbell({ plates, mats, track, narrow })` → `{ group, marks }`. `group` lies along
    **X**, centred on its own middle. `marks` is one emissive material per plate, in
    loading order, heaviest first.
  - `station(kind, { mats, track })` → a `THREE.Group` standing on `y = 0`, for
    `kind` of `"treadmill" | "mirror" | "desk"`.

**Why only three stations:** floor 05 and floor 04 are the same barbell — he presses it,
then loads it. Floor 03 has no prop at all, because the facility rail *is* the machines
and he walks in front of the photographs. That leaves 02, 01 and 00.

- [ ] **Step 1: Move the shared steel across**

Create `app/components/landing/props.js` with the header and everything that transfers
unchanged:

```js
"use client";

/**
 * The objects in the building: the loaded bar, the stations he trains at, and the
 * room they all reflect. Moved out of the old rig.js — the bar is the hero object
 * and its fidelity is deliberate, while the stations are the fewest turned forms
 * that name the machine. If that reads as inconsistent rather than focused, the fix
 * is trimming the bar, not inflating the treadmill.
 */

import * as THREE from "three";
import { plateColor } from "@/lib/site/defaults";

const TAU = Math.PI * 2;
```

Then move these blocks from `rig.js` **verbatim**, in this order, adding `export` to the
last three:

| From `rig.js` | What it is |
|---|---|
| lines 21–43 | the bar's measured constants, `GRIP`, `plateHalf` |
| lines 89–142 | `knurlCanvas`, `knurlFor`, `speckleTexture` |
| lines 144–182 | `roomEnvironment` — **export it** |
| lines 184–187 | `token` — **export it** |

`SHAFT_R`, `SHAFT_HALF`, `SLEEVE_R`, `SLEEVE_END`, `PLATE_R`, `HUB_R`, `GRIP`,
`plateHalf`, `knurlCanvas`, `knurlFor` and `speckleTexture` all stay module-private.

- [ ] **Step 2: Write the material set**

Append to `props.js`. This is `rig.js` lines 246–274, lifted into a function, plus one
matte for the man:

```js
/**
 * Every material in the building, and the two helpers the props share. `track` is the
 * caller's dispose registry — this module allocates GPU resources and never owns their
 * lifetime. `narrow` halves the lathe segment count on a phone, as the old rig did.
 */
export function makeMaterials({ track, narrow }) {
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
	/*
	 * The man. One matte near-black, lit by the same room environment as the steel, so
	 * he picks up the owner's --action as a rim light: change the palette in the admin
	 * panel and he is relit with everything else. This is the entire reason the
	 * reduced-motion path renders a live frame instead of a prerendered raster.
	 */
	const matte = track(
		new THREE.MeshStandardMaterial({ color: 0x0e0e0f, metalness: 0.18, roughness: 0.68 }),
	);

	const ring = narrow ? 22 : 44;
	const lathe = (points, segments = ring) =>
		track(
			new THREE.LatheGeometry(
				points.map(([x, y]) => new THREE.Vector2(x, y)),
				segments,
			),
		);

	return { steel, chrome, rubber, matte, ring, lathe, knurlSource };
}
```

- [ ] **Step 3: Move the bar across**

The bar's interior is long, correct, and already in the repository — so it transfers by
line range rather than by retyping, which is also how it avoids transcription errors.
Append this wrapper to `props.js` and move the cited blocks into it unchanged:

```js
/**
 * One loaded bar, turned rather than assembled from cylinders. Built along Y as the
 * old rig built it, then laid along X by the group's own rotation — so every profile
 * inside is untouched and the caller gets a bar lying across the frame.
 *
 * Heaviest plate inboard, the way a bar is actually loaded, and loaded from the first
 * frame: the visitor lands on a finished object, not one that assembles itself.
 */
export function barbell({ plates, mats, track, narrow }) {
	const group = new THREE.Group();
	const spin = new THREE.Group();
	group.add(spin);
	// Built vertically, hung horizontally.
	group.rotation.z = Math.PI / 2;

	const { steel, chrome, rubber, ring, lathe, knurlSource } = mats;
	const marks = [];

	// ── from rig.js, unchanged ────────────────────────────────────────────────
	// lines 276–281   the shaft
	// lines 283–308   the two knurl bands
	// lines 310–339   the sleeve profile and its mirrored pair
	// lines 341–398   the plates, their chrome bores and their coloured hub rings,
	//                 including `let offset` and the `marks.push(mark)` line
	// lines 400–417   the two collars
	// ──────────────────────────────────────────────────────────────────────────

	return { group, marks };
}
```

Four things to fix up as you move them, and nothing else:

1. `spin.add(...)` stays exactly as it is — `spin` is declared above.
2. `!narrow` on every `castShadow` stays; `narrow` is now a parameter.
3. `plateList` becomes `plates`.
4. Delete `spin.rotation.y` handling — there is none in these ranges, but the old
   `apply` set it. `building.js` owns the spin now and there is no idle roll: a bar he
   is pressing does not rotate on its own.

- [ ] **Step 4: Write the three stations**

Append to `props.js`:

```js
/**
 * A station is the fewest turned forms that name the machine, standing on y = 0 with
 * its working face toward the camera. The bar earns its detail by being the hero
 * object; these earn theirs by being instantly legible at 95 pixels tall.
 */
export function station(kind, { mats, track }) {
	const group = new THREE.Group();
	const box = (w, h, d) => track(new THREE.BoxGeometry(w, h, d));
	const add = (geometry, material, [x, y, z]) => {
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(x, y, z);
		group.add(mesh);
		return mesh;
	};

	if (kind === "treadmill") {
		// A belt slab and two rails. Nothing else says treadmill; nothing else is needed.
		add(box(1.5, 0.12, 3.2), mats.rubber, [0, 0.06, 0]);
		add(box(0.1, 0.1, 3.2), mats.steel, [-0.8, 0.12, 0]);
		add(box(0.1, 0.1, 3.2), mats.steel, [0.8, 0.12, 0]);
		for (const sign of [-1, 1]) {
			add(box(0.09, 1.5, 0.09), mats.steel, [sign * 0.8, 0.75, -1.5]);
			add(box(1.7, 0.09, 0.09), mats.steel, [0, 1.5, -1.5]);
		}
		return group;
	}

	if (kind === "mirror") {
		// One bright rectangle. The mirror wall is a light source, not an object.
		const glass = track(
			new THREE.MeshStandardMaterial({
				color: 0x1a1c1e,
				metalness: 1,
				roughness: 0.06,
				emissive: new THREE.Color(0x0a0f10),
				emissiveIntensity: 0.4,
			}),
		);
		add(box(4.4, 3.4, 0.06), glass, [0, 1.75, -0.6]);
		add(box(4.5, 0.07, 0.12), mats.chrome, [0, 0.05, -0.6]);
		return group;
	}

	// The front desk: a slab, and the post it stands on.
	add(box(3.0, 0.14, 1.0), mats.steel, [0, 1.05, 0]);
	add(box(2.6, 1.0, 0.12), mats.rubber, [0, 0.5, 0.44]);
	return group;
}
```

- [ ] **Step 5: Lint and build**

```bash
npm run lint && npm run build
```

Expected: clean. Nothing imports `props.js` yet, so this task's gate is that it compiles
and that the barbell still builds; it is looked at in Task 10, where the canvas comes back.

- [ ] **Step 6: Commit**

```bash
git add app/components/landing/props.js
git commit -m "feat: move the bar out of the rig and give him stations to train at"
```

---

## Task 8: `figure.js` — the man, built out of steel

`body.mjs` says what a body is; this is the only file that knows he is made of capsules.
Fifteen pivots are built once and a pose is fifteen rotations, so nothing is allocated per
frame.

**Files:**
- Create: `app/components/landing/figure.js`

**Interfaces:**
- Consumes: `BONES`, `HIP_H`, `restPose` from `@/lib/landing/body.mjs`; `mats` and `track`
  from Task 7; `three`.
- Produces:
  - `figure({ mats, track, narrow })` → `{ group, apply, pivots }`.
    `group` is a `THREE.Group` whose origin is **the floor he stands on**, not his hips.
    `apply(pose)` puts him in a pose from `body.mjs`. `pivots` is a `Map` of bone name to
    its `THREE.Group`, so `building.js` can read where his hands ended up.

**The one rule of the skeleton:** a bone's pivot sits at its parent's far end plus its own
`offset`, and its capsule runs from that pivot along its own **+Y** for `len`. Every
placement in `BONES` is expressed against that rule, including the two that step back down
the pelvis stub.

- [ ] **Step 1: Write the meshes**

Create `app/components/landing/figure.js`:

```js
"use client";

/**
 * The figure. `body.mjs` holds what a body is and how it moves; this file holds how it is
 * built out of steel, and it is the only place that knows he is capsules rather than
 * angles. That split is what lets the animation be tested in node without a GPU.
 *
 * One matte material for all of him, lit by the same roomEnvironment the bar uses — so he
 * picks the owner's --action up as a rim light and changing the palette in the admin panel
 * relights him.
 */

import * as THREE from "three";
import { BONES, HIP_H, restPose } from "@/lib/landing/body.mjs";

/**
 * One bone's mesh, already positioned in its pivot's frame. Everything is a capsule except
 * the two forms that carry the read at silhouette scale: the torso is a tapered lathe,
 * turned the same way the bar's sleeves are, and the head is a sphere stretched to head
 * height.
 */
function boneMesh(bone, mats, track, narrow) {
	// The torso. Its profile already runs from the pivot up to `len`, so it needs no offset.
	if (bone.name === "spine") {
		const r = bone.r;
		const mesh = new THREE.Mesh(
			mats.lathe([
				[0.02, 0],
				[r * 0.78, bone.len * 0.1],
				[r * 0.84, bone.len * 0.36],
				[r, bone.len * 0.68],
				[r * 0.88, bone.len * 0.92],
				[0.02, bone.len],
			]),
			mats.matte,
		);
		// A torso is wider across than it is deep, and depth is the axis the camera reads.
		mesh.scale.x = 0.72;
		return mesh;
	}

	// The head: a sphere at head width, stretched to head height, because a face is taller
	// than it is wide.
	if (bone.name === "head") {
		const mesh = new THREE.Mesh(
			track(new THREE.SphereGeometry(bone.r, narrow ? 12 : 20, narrow ? 8 : 14)),
			mats.matte,
		);
		mesh.scale.set(1, bone.len / (2 * bone.r), 0.94);
		mesh.position.y = bone.len / 2;
		return mesh;
	}

	// Everything else is one capsule. CapsuleGeometry's `length` is the cylinder between
	// the caps, so subtracting both radii makes the drawn bone `len` end to end; the clamp
	// keeps a bone shorter than its own girth — the pelvis stub — legal.
	const mesh = new THREE.Mesh(
		track(
			new THREE.CapsuleGeometry(
				bone.r,
				Math.max(0.001, bone.len - 2 * bone.r),
				4,
				narrow ? 8 : 14,
			),
		),
		mats.matte,
	);
	mesh.position.y = bone.len / 2;
	return mesh;
}
```

- [ ] **Step 2: Build the tree and apply a pose**

Append to `app/components/landing/figure.js`:

```js
export function figure({ mats, track, narrow = false }) {
	const group = new THREE.Group();
	const table = new Map(BONES.map((bone) => [bone.name, bone]));
	const pivots = new Map();
	const parts = [];

	for (const bone of BONES) {
		const pivot = new THREE.Group();
		// The one rule: a bone starts at its parent's far end, plus its own offset. The
		// parent's capsule runs from its own pivot along +Y for `len`, so that end is `len`
		// up in the parent's frame.
		const reach = bone.parent ? table.get(bone.parent).len : 0;
		pivot.position.set(bone.offset[0], reach + bone.offset[1], bone.offset[2]);
		pivot.rotation.set(bone.rest[0], bone.rest[1], bone.rest[2]);
		(bone.parent ? pivots.get(bone.parent) : group).add(pivot);
		pivot.add(boneMesh(bone, mats, track, narrow));
		pivots.set(bone.name, pivot);
		parts.push({ bone, pivot });
	}

	/**
	 * Put him in a pose. `rotation.z = rest.z + flex * angle` is the whole of it: `flex` is
	 * what makes a positive angle mean anatomical flexion on a spine that points up and a
	 * thigh that hangs down alike.
	 */
	function apply(pose) {
		for (const { bone, pivot } of parts) {
			const angle = pose[bone.joint];
			if (Array.isArray(angle)) {
				// A shoulder: swing in the plane the camera reads, then out into depth. The
				// pose carries the mirrored sign for `out`, so there is no side table here.
				pivot.rotation.z = bone.rest[2] + bone.flex * angle[0];
				pivot.rotation.x = bone.rest[0] + angle[1];
			} else {
				pivot.rotation.z = bone.rest[2] + bone.flex * angle;
			}
		}
		// `root` is measured from standing on the floor, so his hip height is added once
		// here rather than in all nine clips.
		group.position.set(pose.root[0], HIP_H + pose.root[1], pose.root[2]);
	}

	apply(restPose());
	return { group, apply, pivots };
}
```

- [ ] **Step 3: Check the skeleton against the ratios, in the browser console**

Nothing renders him yet — that is Task 9 — but the whole chain can be measured without a
canvas, because `updateMatrixWorld` is arithmetic. Add these temporary lines to the foot of
`figure.js`:

```js
// Temporary: deleted at the end of this step.
import { makeMaterials } from "./props";
if (typeof window !== "undefined") {
	window.__rig = () => {
		const track = (x) => x;
		const rig = figure({ mats: makeMaterials({ track, narrow: false }), track });
		rig.group.updateMatrixWorld(true);
		// A pivot's world translation is the joint's position. elements[12] is x, [13] is y.
		rig.at = (name) => {
			const m = rig.pivots.get(name).matrixWorld.elements;
			return { x: m[12], y: m[13] };
		};
		return rig;
	};
}
```

and one temporary line at the top of the still-present `app/components/landing/rig-stage.js`,
so the module is actually in the page's bundle:

```js
import "./figure";
```

Then:

```bash
npm run dev
```

In the browser console on `/`:

```js
const rig = __rig();
rig.at("pelvis").y;   // 1.855  — his hips, 3.5 × (0.039 + 0.246 + 0.245)
rig.at("footL").y;    // 0.1365 — his ankle, 3.5 × 0.039
rig.at("neck").y;     // 2.863  — his shoulders, hips + 1.008
rig.at("head").y + 3.5 * 0.130;   // 3.5 — his crown, which is his whole height
rig.at("handL").y;    // 1.6 to 1.8 — a hanging wrist sits about hip height
// Toes point the way he faces. The foot mesh is half a foot along the bone from the ankle.
rig.pivots.get("footL").children[0].matrixWorld.elements[12] > 0;   // true
```

Expected: every figure within 0.01 of the comment. **These are the calibration knobs**, and
each one has exactly one thing to change:

| What is wrong | What to change in `lib/landing/body.mjs` |
|---|---|
| He is ~0.26 too tall, or floats | `spine` / `thigh` offsets lost their `-PELVIS` |
| Toes point behind him | negate the `foot` bone's `rest` z |
| Arms or legs stick up instead of hanging | `DOWN` is not `[0, 0, Math.PI]` |
| A knee bends forwards | negate `flex` on `shin`, or the `knee` limits are flipped |
| His head over-rotates when he looks | `head` must be `flex: 0` |

Delete both temporary blocks — the probe in `figure.js` and the import in `rig-stage.js` —
before committing.

- [ ] **Step 4: Lint and build**

```bash
npm run lint && npm run build
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add app/components/landing/figure.js
git commit -m "feat: build the man out of capsules, one pivot per joint"
```

---

<!-- MORE -->























