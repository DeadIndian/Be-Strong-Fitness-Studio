# Landing page: the gym as a building you fall through

Design agreed 2026-09-04. Replaces the single-barbell scroll rig on `app/page.js`.

## What this is

The landing page becomes a six-storey gym seen in section. A procedural 3D figure
trains on the top floor; scrolling drops him one floor at a time, and on the way
down he passes through the page's own headings, whose letters part to let him
through. He lands, walks to the next station, and starts working there.

Every floor is a section that already exists. Every station is justified by the
content on that floor rather than decorating it. The content stays owner-editable
from `/dashboard/staff/website` exactly as it is today; nothing about the story
adds a fact the owner cannot change or remove.

## The floor map

| Floor | Section | Station |
|---|---|---|
| 05 | Brand, lowest monthly price, primary CTA | Mid-set on the loaded bar — the existing `rig.js` barbell, reused |
| 04 | RATES | Loading the bar, one plate per term. Plans already carry `plate: 5/10/15/20/25` |
| 03 | THE ROOM | Walking the floor past the machines, facility rail running off the right edge |
| 02 | HOURS | On the treadmill |
| 01 | THE FINE PRINT + RESULTS | Mirror wall. The 15-minute treadmill limit and two-hour cap are posted here |
| 00 | VISIT + JOIN | Walks to the front desk. Door, map, sign in |

The payoff is floor 00: you have fallen through the whole building and land where
you would actually walk in.

A floor is the span of page between two hairlines, not one `<section>`. Each floor
element carries `data-floor="05"`…`"00"`, and `measure.js` reads the top border of
those elements only — the page draws other rules that are not floors, the wall strip's
and the scale grid's among them. Blocks with no station ride with the floor they sit
on: the wall strip and the three computed figures belong to floor 05 below the fold,
and the footer is the ground outside the door, under floor 00's hairline. Floor 05 has
no hairline of its own, being the top of the building.

HOURS and THE FINE PRINT were originally one floor and are split, because a floor
must be about one viewport tall (see *Choreography*). THE FINE PRINT pairs with
RESULTS instead — the rules and the mirror both belong to the same wall.

## Decisions taken, and what they rule out

**The figure is procedural, built in code.** Jointed primitives with hand-authored
joint curves. No glTF, no Mixamo, no `AnimationMixer`, no skeleton. Costs nothing
to download and matches the hand-lathed steel already in `rig.js`. The risk it
accepts is that a primitive figure reads as a robot rather than a man; timing is
what buys its way out, not fidelity.

**Stations are silhouette props.** The fewest turned forms that name the machine:
treadmill is a belt slab and two rails, bench is a slab on two posts, the mirror is
one bright rectangle, the desk is a slab. The barbell stays at its existing higher
fidelity and is the hero object; if that reads as inconsistent rather than focused,
the fix is trimming the bar, not inflating the treadmill.

**The section divider is the floor slab.** `Band` already draws
`border-t border-edge` across the window. That hairline is what he stands on, walks
along, and what opens for him to fall through. No rendered rooms, no walls, no
ceilings — the building is made of rules the page already draws.

**Text does not reflow — it is displaced by transform.** `pretext` was considered and
rejected. It measures accurately and cheaply, but real re-wrapping changes a
section's line count, which changes its height, which changes document height
mid-scroll. Scroll position then jumps under the reader's thumb. Reserving the space
to prevent that means the text was never reflowing, only moving inside a fixed box —
which is the transform approach with a dependency bolted on.

**Transport is CSS scroll snap, not a scroll lock.** A hard lock was requested and
declined for three specific reasons: it kills Page Down, Home, End, space and
arrows; a locked floor cannot be scrolled inside, so content is unreachable at 200%
zoom, failing WCAG 1.4.10 Reflow, which `PRODUCT.md` commits to; and gating input
until he finishes walking, five times over, is 7–8 seconds of the page refusing a
prospect who is comparison-shopping on cellular. Snap delivers the determinism the
lock was wanted for.

**The story never gates the facts.** Navbar and footer anchors jump straight to any
section without playing anything.

## Module layout

`rig.js` is 569 lines and this roughly triples its job, so it splits. Pure logic
goes to `lib/landing/` as `.mjs` so `node --test` can import it, matching
`lib/site/hours.mjs`.

```
lib/landing/body.mjs        anatomy + animation clips — pure, no three.js
lib/landing/body.test.mjs
lib/landing/shaft.mjs       page-to-world map + fall bands — pure
lib/landing/shaft.test.mjs
app/components/landing/stage.js      the gate: WebGL, reduced motion, dynamic import
app/components/landing/building.js   renderer, lights, camera, rAF loop, CSS vars
app/components/landing/figure.js     character meshes, applies a pose
app/components/landing/props.js      barbell (moved intact from rig.js) + station props
app/components/landing/measure.js    DOM reads: floor offsets and per-letter x
```

Deleted: `app/components/landing/rig.js`, `app/components/landing/rig-stage.js`.
Changed: `app/page.js`, `app/globals.css`.

`body.mjs` holds what a body is and how it moves; `figure.js` holds how it is built
out of steel. That split is what makes the animation testable in node without a GPU.

## The figure

`rig.js` works at **1 unit = 500 mm** — a 29 mm shaft is `SHAFT_R 0.029`, a 450 mm
bumper is `PLATE_R 0.45`, and the bar comes out 2.14 m long. So a 1.75 m man is
`MAN_H = 3.5` units, and he is correctly shorter than the bar is long.

Segments come off the standard Drillis & Contini body ratios rather than eyeballed
numbers, as fractions of `MAN_H`:

| Segment | Ratio | Segment | Ratio |
|---|---|---|---|
| Head height | 0.130 | Thigh | 0.245 |
| Torso, shoulder to hip | 0.288 | Shin | 0.246 |
| Upper arm | 0.172 | Foot length | 0.152 |
| Forearm | 0.157 | Shoulder width | 0.259 |

Fifteen joints, hips at the root. Each limb is one `CapsuleGeometry`, the torso a
tapered lathe like the sleeve profile already in `rig.js`, the head a squashed
sphere. One matte near-black material lit by the existing `roomEnvironment()`, so he
picks up the owner's `--action` as a rim light and changing the palette in the admin
panel relights him.

**A pose is a flat object of joint angles. A clip is `(t) => pose`.** That is the
whole animation system.

**Alive is four things, and they are cheap.** Anticipation — he dips before he jumps.
Overlap — arms lag the torso by about 60 ms. Settle — overshoot and damped return on
landing. Breath — a low-amplitude spine sine that never stops. At silhouette scale
timing is what reads as alive, not fidelity.

Clips needed: `press`, `load`, `walk`, `run`, `look`, `stand`, `jump`, `fall`,
`land`. Nine.

## The corridor

During a single fall he drops nearly straight down, so the corridor's x is
effectively constant for that fall. The per-letter maths therefore runs **once per
fall**, not once per frame.

**One pass at fall onset.** `building.js` projects his world position to screen space.
When scroll enters a fall band it writes a static `--push` onto each letter of the
heading being crossed — signed by which side of him the letter sits on, magnitude
falling off linearly with distance, zero beyond about two body widths. Around twenty
letters are touched. Their x positions come from `measure.js`, read once on mount.

**One write per frame.** Each parting heading gets a single `--open` between 0 and 1,
driven by his vertical distance from that line: opening as he approaches, closing once he
is through. The letter is then:

```css
.letter-tile { transform: translateX(calc(var(--push, 0px) * var(--open, 0))); }
```

Five style writes per frame for the whole page, no per-letter work during scroll.
Because `--open` derives from live scroll position rather than a timeline, scrubbing
backwards closes the gap correctly instead of replaying a canned animation.

**He stays behind the type.** The canvas keeps `-z-10`. You see him through the gap
the letters opened, and the letters still covering his shoulders sell it: he is inside
the wall of type, not pasted over it. Same layered depth `.mural` already uses at
`-z-15`.

**Only the arriving floor's heading parts.** Five falls, five headings: RATES, THE ROOM,
HOURS, THE FINE PRINT, VISIT — every one of them `tile-lg`. The brand `tile-xl` sits above
him and is never crossed, and RESULTS and JOIN THE FLOOR share a floor with the heading
above them, so nothing falls through those. Body copy and ledger rows stay put: at 13px a
corridor is noise.

Two things that will break if they are not built in from the start:

- Archivo loads through `next/font` with `display: swap`, so letter widths change when
  the real face arrives. `measure.js` must re-read after `document.fonts.ready` or
  every corridor sits offset from its fall.
- Letters inside `TileText` are already `aria-hidden` with the word's label on the
  parent, so none of this changes what a screen reader receives. Keep it that way.

## Choreography

**The invariant.** `measure.js` reads each floor's `border-top` offset — via a
`ResizeObserver` on `#board-main`, so owner edits, font swap and image loads all
re-trigger it — and the page maps to the world through **one constant: `world y = -k ×
page y`.**  Camera y is that map applied to the viewport centre; camera distance is
`k × viewportHeight / (2 tan(fov/2))`, which is exactly the distance at which one world
unit projects to `1/k` pixels.

The consequence: a canvas slab placed at floor *i*'s world y projects onto that floor's
hairline exactly, at every scroll position, every window size, any content height. The
floors are not tuned to line up; they cannot fail to. This also removes the
`at: 0.16, 0.33…` fractions in `rig.js` that silently desynchronise the camera the moment
the owner adds a sixth plan.

A piecewise-linear map with a knot at every hairline and one storey between knots was the
earlier plan and is dropped. Its per-floor slope means the world-to-pixel scale changes at
every knot, so the camera distance has to be re-derived per floor and filtered across the
join to avoid a visible step-zoom — and while that filter is settling, the slabs are not
exact. The linear map has no knots to cross, so it is exact everywhere and needs no filter.
The cost is that storey height in world units is no longer uniform: a floor the owner makes
taller is a taller room, and his fall through it is longer. That is the correct reading of
"the page is the building".

**He descends monotonically, one storey per section; the camera descends at the
page's rate.** While he works, the two move together and he holds a stable height on
screen. During a fall he drops faster than the camera and you watch him go down the
frame; the camera then closes the gap over the next stretch of reading. That lag *is*
the fall. No pinning, no second coordinate system.

**Clock versus scroll.** Anything that must continue while the reader sits still runs
on the wall clock — his reps, his breath, the idle. Anything that must scrub backwards
runs off scroll — the fall, the camera, `--open`. So he keeps training while a
paragraph is read, and dragging the scrollbar back up un-falls him cleanly.

**The fall is a parabola, not a drop.** A straight drop would spend most of its length
hidden behind body copy. He leaves the lane, arcs left across the column with the apex
timed to the arriving floor's heading, then swings back and lands at the station. He
crosses type exactly once per fall, at speed, precisely where the corridor is.

**Content constraint: a floor should be about one viewport tall.** Two hairlines then
sit on screen together during a fall, so the drop reads as one storey and he never
leaves frame. RATES is five ledger rows; THE ROOM is a heading and a photo rail. Past
roughly 160vh in a single section he falls out of frame, and the fix there is content,
not code.

## Transport

`scroll-snap-type: y proximity` on `html` — the document scroller, which already carries
`scroll-behavior` and `scroll-padding-top` — with `scroll-snap-align: start` and
`scroll-snap-stop: always` on each `data-floor` element. `always` is what stops a fling
skipping two floors, so one gesture is one fall. `proximity` rather than `mandatory`,
because mandatory makes every resting position between two snap points unreachable — which
is exactly the 200% zoom failure the scroll lock was declined over. The cost is that a very
short flick on a tall floor can settle without advancing. `.strip` already snaps the
facility rail horizontally, so the idiom is in the codebase.

Momentum, trackpad inertia and iOS rubber-banding stay the browser's problem rather than
ours. A fast flick still plays one complete fall, just faster. Someone in a hurry gets a
quick fall, which is correct.

`scroll-padding-top` is already set to clear the sticky rail, so anchors keep landing
below it.

**The scroll indicator stays** — a small mark near the foot of floor 05 saying there is
more, one floor at a time. Built as a view-timeline animation like `.marquee`, so it
needs no JS and the existing reduced-motion block silences it.

## The phone

The slab-on-hairline invariant pins the world-to-pixel scale, so the `fit` pull-back
rule in `rig.js` does not survive — it is replaced by one knob that does the same job
properly.

**Storey height sets his size.** He is a fixed share of the viewport, and `k` follows from
that share: `k = MAN_H / (share × viewportHeight)` world units per pixel, so one viewport
of scroll is one storey of building.

| | Aspect | Storey | He is | Pixels (w × h) |
|---|---|---|---|---|
| Phone portrait, 360×800 | 0.45 | 10 units (5 m) | 35% of frame | ~72 × 280 |
| Desktop, 1440×900 | 1.6 | 6 units (3 m) | 58% of frame | ~133 × 522 |

`share` interpolates linearly between those two aspects, so it is one derived number and
there is no per-breakpoint composition. Camera FOV stays 32°, as `rig.js` has it. Camera
distance comes out around 17 units on a phone against 10.5 on a desktop, so `rig.js`'s
fixed `Fog(5, 22)` is re-expressed as a multiple of that distance or he fogs out on the
phone.

**His lane.** `Band` gets a floor variant constraining type to the left ~65% and
reserving the right ~35%. This also resolves a collision: `Band` currently places its
`aside` on the right, where he would be standing. At 360px that leaves a 254px column.
The longest headings are "THE FINE PRINT" and "JOIN THE FLOOR", twelve letters each,
which come out around 240px at `tile-lg`'s 30px letters — they fit with 14px to spare,
so they are the first thing to test.

**The corridor at 360px.** His falling silhouette is ~95px, roughly six 30px letters.
On a five-letter heading like "RATES" the word tears open between two letters rather
than gently parting, which reads as force and is the better outcome. But 45px of push
each way in a 254px column can shove the outermost letter off the edge, so **push
scales down by whatever slack the line actually has.** Without that guard this breaks
at 360px and nowhere else.

**Floor 03 gets one extra trick.** THE ROOM is where he walks past the machines, and
the facility rail *is* the machines — so that rail drops to `z-index: -12`, behind the
canvas, and he walks in front of the photographs. Same trick `.mural` uses at `-15`.
The canvas is `pointer-events-none`, so the rail stays swipeable.

## Fallback paths

**No JavaScript.** Everything works. `page.js` is a server component, so all content
ships in the HTML. Snap is pure CSS. Letters default to `--push: 0px` and `--open: 0`
and simply do not move.

**No WebGL.** The gate in `stage.js` returns null before three.js is fetched — today's
behaviour, preserved. With no character nothing says "building", so one element earns
its place in every path: **each floor prints its number.** `05` down to `00`, set as a
`Stamp` beside the hairline. Orientation in the full experience, the entire building
metaphor when the canvas never mounts.

**Reduced motion — designed, not stripped.** The building stops being a film and
becomes an elevation drawing. One canvas in `still` mode renders him frozen mid-lift at
the current floor's station, standing on that floor's hairline. No fall, no camera move,
no corridor. Changing floors swaps the still instantly with no transition — a page
turned, not an animation. Prerendered rasters were the alternative and are out: the
lights in that scene are the owner's palette, so an image goes stale the moment he
changes the teal.

**The mid-range Android guard.** The `narrow` flag in `rig.js` already drops
antialiasing, shadows, pixel ratio and ring segments; it moves to `building.js`
unchanged. Added: if thirty
consecutive frames exceed ~28 ms, the loop stops and holds a still. The bailout target
is the reduced-motion presentation, which is already designed — so a struggling phone
lands somewhere deliberate rather than somewhere broken.

## Accessibility

`PRODUCT.md` commits to WCAG 2.2 AA, and three things hold that line:

- **Keyboard moves floors.** Nothing is intercepted, so Page Down, Home, End, space and
  arrows work through the native scroller.
- **A floor taller than the viewport scrolls inside itself** before the next snap point
  engages — which is why snapping is `proximity`. This is what keeps the page readable at
  200% zoom.
- **Anchors bypass the story.** Navbar and footer links land on any section directly.

Letter transforms are decorative and on `aria-hidden` elements. Ledger rows keep their
76px tap area. The canvas stays `aria-hidden` and `pointer-events-none`.

## Testing

Two pure modules get `node:test` files beside them, matching `lib/site/hours.test.mjs`:

- **`body.mjs`** — hips travel down before they travel up in the jump clip; no joint
  exceeds its anatomical limit; every looping clip ends where it started, so reps do not
  pop.
- **`shaft.mjs`** — the projection identity holds: one world unit is exactly `1/k` pixels at
  the derived camera distance, so a slab lands on its hairline. Fall bands for adjacent
  floors a viewport apart do not overlap. The corridor's slack guard keeps every pushed
  letter inside its column. This is the invariant the whole design rests on, so it gets
  tests rather than a comment.

Manual checks, both of which fail at exactly one size:

- "THE FINE PRINT" and "JOIN THE FLOOR" at 360px against the 254px column.
- The corridor slack guard on a five-letter heading.

## Out of scope

- No payment gateway. Checkout stays the honest placeholder activate.
- No new facts. Address, phone, trainers and reviews remain absent until the owner
  supplies them; the story adds no content the admin panel cannot edit or remove.
- No changes to the member dashboard, staff panel, login or `/transformations`. Those
  surfaces inherit `globals.css` tokens and are unaffected by this work.
- No new runtime dependency. three.js 0.185.1 is already installed and is all this needs.
