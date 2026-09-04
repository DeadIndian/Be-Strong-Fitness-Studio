# The hall walk

One gym hall, seen from the side. One man in it, small. Scroll walks him past
five stations, and the words on the page open to let him through.

The old landing page was a five-storey shaft he fell down. It is deleted. This
replaces it entirely.

## What the visitor experiences

The first viewport is the door of the studio, lit by whatever time it actually
is where they are standing. He is at the door, small, stretching, bag on the
floor. As they scroll he walks right — into the iron, past the bags and mats,
through recovery, and finally to the desk where the prices are. Scrolling up
walks him back. A flick settles him at a station; stopping mid-floor leaves him
standing there, breathing.

He walks in front of the page. When he reaches a paragraph, the paragraph's
lines part around him and close behind him — real reflow, the words genuinely
re-broken to a narrower measure, not slid aside. His shadow falls across the
type.

Nothing is ever locked. Momentum scrolling, keyboard, Home/End, screen readers,
find-in-page and 200% zoom all behave exactly as on a plain document, because
underneath the room it *is* a plain document.

## The five stations

Walk-in order, which is also the order a prospect's questions arrive. Price is
last, because nobody walks into a gym and asks the price first.

| # | Station | The question it answers | Content |
|---|---------|------------------------|---------|
| 1 | DOOR | Is it open? Where am I? | Brand name and line · live open/closed lamp · the full hours table · the clock's own door line · one call to action |
| 2 | IRON | What can I actually train on? | The `iron` facilities · the training rules · hours-open-a-week, computed |
| 3 | CLASSES | What else is included? | The `classes` facilities · that every class is in the one membership |
| 4 | RECOVERY | What do I get afterwards? | The `recovery` facilities · how the metered perks work · the link to results |
| 5 | DESK | What does it cost, and what happens if I press? | The rates ledger · the three join steps · no-payment-online note · how to reach the studio |

Station count is fixed at five whatever the owner has filled in. An empty
station still prints its heading and its stations-line, because he has to have
somewhere to stand.

## The clock is a light, not a mood

The visitor's own local time, read against the studio's hours table in the
studio's timezone, sets the room:

| Phase | Room |
|-------|------|
| closed / predawn | Shutter down over the door, hall on emergency strip only, one figure at most. Door line: "Shutters down. Opens 5:00 am." |
| dawn | Low warm light through the back window, hall strips just on, one or two figures |
| morning | Full white daylight, strips on, three or four figures |
| midday | Flat bright, strips off, two figures |
| evening | Orange low sun across the floor, strips on hard, five or six figures |
| night | Window black, sodium lamp over the desk, strips on, three figures |

Arrive at 06:40 and it is a dawn gym. Arrive at 21:00 and it is a sodium-lit
one. Arrive at 03:00 and the shutter is down and the page says when it opens.
The light is a fact the page already knows, so it may as well be true.

An empty gym reads as a dead gym, so the background figures are part of the
lighting spec: unlit, faceless, matte, on slow loops at deep-background
machines, count driven by the phase above.

## Structure

Three layers, back to front:

| z | Layer | What is in it |
|---|-------|---------------|
| −20 | CSS backdrop | Board colour, two radial lights, the studio name painted on the far wall |
| −10 | Hall canvas | The room: floor, walls, ceiling strip, window, shutter, all five stations' kit, the background figures, the mirror |
| 0 | The document | Every word, every price, every link. Complete and readable on its own. |
| 10 | Actor canvas | Him, and his shadow. Alpha, `pointer-events: none`. |

Two `<canvas>` elements and two `WebGLRenderer`s, sharing one `PerspectiveCamera`
instance. This is deliberate: he must paint *over* the type while the room paints
*under* it, and one canvas cannot be on both sides of the same element. The actor
context is cheap — twenty capsules, one quad, no shadow map — and the alternative
(blitting a render target into a 2D canvas every frame) costs a full-frame copy
for the same result.

The camera is shared, so he sits in the room correctly with no reprojection.

## Scroll to walk

No scroll-jacking. `scrollY` is read, never written.

```
scan.js   → measures each [data-station] section once → document-space anchors
route.mjs → (scrollTop, anchors) → { index, t, s, station }
            s ∈ [0,1] is walk progress; x = HALL_X0 + s * HALL_LENGTH
```

Anchors come from the measured sections, not from constants, so the owner adding
six facilities to IRON cannot desync the walk from the reading position.

`scroll-snap-type: y proximity` on the root with `scroll-snap-align: start` per
station. Proximity, never mandatory: a mandatory snap cannot be scrolled
*inside*, so at 200% zoom a station taller than the viewport would have
unreachable content and fail WCAG 1.4.10.

### Gait comes from scroll velocity

This is the aliveness lever. Velocity is `ds/dt`, smoothed:

- ≈ 0, at a station → that station's work clip (deadlift, jab, sit, sign)
- ≈ 0, mid-floor → stand, breathing
- small → walk
- large → run
- negative → the same clips mirrored, so scrolling up walks him back
- accelerating → he leans into it

Blended by velocity rather than switched, so there is no snap between gaits.

### Orientation

Landscape parks the camera perpendicular to the station line: he walks across a
wide hall. Portrait parks it along the line, ahead of him and above, looking
back: he walks down a corridor toward the reader, growing as he comes. One room,
one set of kit, two camera rigs — not two scenes.

## The reflow

`@chenglou/pretext` is a text *measurement and layout* library, not an animation
one. That is what this needs. Canvas `measureText` is the ground truth, so line
breaking is computed with zero DOM reads and zero reflow, at whatever measure we
ask for, per frame.

Two displacement mechanisms, each where it fits:

**Flow** — prose paragraphs, marked `data-flow`. Real re-breaking:

```
per line band:
  no overlap with his box        → one run, full measure
  overlap, wide viewport         → run A = [0, boxLeft], run B = [boxRight, width]
                                   (layoutNextLine's streaming cursor continues
                                    A's text into B on the same line)
  overlap, narrow viewport       → one run on the wider side
                                   (a 390px column cannot hold two 110px runs)
```

**Yield** — ledger rows, list items, buttons, marked `data-yield`. One composited
transform, no layout:

```css
transform: translateX(calc(var(--push, 0px) * var(--open, 0)));
```

`--push` is written once per approach, `--open` per frame. Both default to
nothing, so an element with no rig behind it never moves.

### Details that make it read as parting rather than clipping

- The obstacle handed to pretext is his silhouette inflated and **led** ~140px in
  his direction of travel, so the words open *ahead* of him and close behind.
- `obstacle.x` is quantised to 8px steps, or the lines jitter every frame. 8px is
  finer than a word, so word breaks dominate the visible granularity anyway.
- Flowing paragraphs use the default width axis. Canvas `ctx.font` cannot express
  `font-variation-settings`, so measuring `wdth`-varied Archivo would be wrong.
  The variable axis stays where it belongs, on the display lettering, which does
  not flow.
- Each flowing paragraph reserves one extra line of height, permanently. Parting
  a line reduces its capacity, which can push a word onto a new line; reserved
  slack absorbs that so the page height never changes mid-walk. If reflow would
  exceed the reserve, that paragraph reverts to full-measure lines for the frame —
  he passes over the words instead of parting them.
- Viewport positions come from cached document-space measurements plus `scrollY`,
  so there is no forced layout in the frame loop.

### Server and hydration

A flowing paragraph server-renders as a plain `<p>` with its real text. It
switches to runs once, after `document.fonts.ready`, before the visitor has
scrolled. The visual runs are `aria-hidden`; the true text is carried in a
visually-hidden sibling, so a screen reader is never read a paragraph in pieces.

## The kit

Procedural geometry only — boxes, cylinders, capsules, tori, lathes. No image
assets anywhere on this page. Materials are roughness and metalness over the
owner's own palette, lit by a PMREM room environment plus the clock's lights.

| Station | What is built |
|---------|---------------|
| DOOR | Door aperture, roller shutter, mat, duffel bag, wall clock |
| IRON | Power rack, barbell with plates, bench, dumbbell rack |
| CLASSES | Heavy bag on a chain, mats, the mirror panel |
| RECOVERY | Fogged steam-room door, massage chair, towel shelf, kettle and cups |
| DESK | Counter, stool, ledger, and the plate tree |

**The plates are the prices.** The plate tree at the desk holds one plate per
term: radius from `priceInr`, colour from `PLATE_COLORS`, in the order the ledger
prints them. Reaching for a plan row lights and lifts its plate. Choosing one has
him take it and load the bar. A price the owner edits changes the ledger and the
metal in the same breath.

**The mirror** at CLASSES shows him reversed — a second copy of his mesh, in the
hall scene, mirrored across the panel plane, sitting in a shallow recess so the
wall geometry itself occludes anything outside the frame. No render target, no
clipping planes.

**The shadow** is a soft radial quad in a screen-space overlay pass on the actor
canvas, tracking his projected feet. Because that canvas composites over the
document, it darkens the words. This one detail is what sells "he is in front of
the page."

## Degradation

| Condition | What is served |
|-----------|----------------|
| No JS | The plain five-section document. This is the authored artefact, not a fallback. |
| No WebGL | Same. |
| Median frame > 34ms over 60 frames | Both renderers unmount; same. |
| `prefers-reduced-motion: reduce` | The full room with the true light and the true time. He is posed at each station and changes pose between them with no tween, no idle reps, no gait. Reflow computes once per stop. |

The un-animated state is the finished state. Nothing on this page is only
reachable by scrolling something.

## Files

```
lib/gym/route.mjs    stations, scroll → s, gait from velocity      + route.test.mjs
lib/gym/clock.mjs    time → phase, light, crowd, shutter, door copy + clock.test.mjs
lib/gym/flow.mjs     obstacle + measure → per-line run geometry     + flow.test.mjs
lib/gym/body.mjs     bones, rest pose, clips, blend, breath         + body.test.mjs

app/components/gym/room.js        capability gate, dynamic import, watchdog
app/components/gym/rig.js         two renderers, one camera, frame loop
app/components/gym/hall.js        floor, walls, strip, window, shutter, mirror
app/components/gym/kit.js         the five stations' equipment
app/components/gym/actor.js       skeleton → meshes, pose application, crowd
app/components/gym/flowing.js     the pretext paragraph
app/components/gym/scan.js        one-time DOM measurement
app/components/gym/hours-strip.js the hours table (replaces the deleted hours-band)
```

The four `lib/gym` modules are pure and run under `node --test` unchanged. All
the geometry that can be wrong without being visibly wrong lives in them.

### Marks the rig reads

| Mark | On | Meaning |
|------|-----|---------|
| `data-station="1..5"` | each `<section>` | a station anchor; measured for the walk |
| `data-flow` | prose paragraphs | re-break my lines around him |
| `data-yield` | rows, items, buttons | step aside by transform |
| `data-plate="<plan-id>"` | each ledger row | light this plate on the tree |

## Content model change

Facilities gain a `zone` of `iron`, `classes` or `recovery`, so the owner can
route a new facility to the station where it belongs. An unzoned facility
defaults to `iron`. The seeded thirteen are zoned as:

- **iron** — strength training, general training, cardio
- **classes** — boxing, karate, zumba, yoga
- **recovery** — steam bath, massage chair, lockers, diet plan, green tea, black coffee

Touched: `lib/site/defaults.js`, `lib/site/sanitize.js`, and the owner editor in
`app/components/staff/website-sections.js`.

## CSS

`app/globals.css` keeps the design system — the token block, `.slab`, `.ledger`,
`.letter-tile` and its tile scales, `.slot-rail`, the sheet, the dialog, the
input, `press-in`, the reduced-motion block. All of it is used by the navbar, the
dashboard and the results page too.

It loses the old shaft: `--lane`, `.mural`'s five-storey framing, `.floor` and
its hairlines, `.rise`, `.wipe`, `.hair`, and the `.shove` selector. The
`--push`/`--open` transform channel survives under `data-yield`, because the
mechanism was right; only the shaft it served is gone.

`.station` replaces `.floor` as the snap unit.

## Not doing

- No audio. A gym site that makes noise on scroll is a gym site people close.
- No scroll hijack, no locked cutscene. It was the original idea and it is the
  one thing that would break mobile, keyboard and assistive technology at once.
- No photographs. The room is procedural; the owner's own photographs belong on
  the facilities and results, where a real one can be checked.
