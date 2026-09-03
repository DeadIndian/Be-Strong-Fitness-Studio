# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — the prospect.** Someone local looking for a gym, almost always on a phone, often on a slow connection and an older Android device. They are comparison-shopping between two or three nearby studios. They want to know: what does it cost, what's inside, when is it open, where is it, and is anyone actually getting results. They decide in under two minutes.

**Secondary — the member.** Already paid. Returns to the site to manage their membership and to use the companion tools: goal planner, calorie lookup, workout library, reviews. Mostly phone, sometimes mid-workout on gym wifi.

**Tertiary — the gym owner (admin).** Not technical. Runs the studio day to day. Must be able to change every piece of public content himself — name, logo, colours, prices, facilities, hours, contact details, map location, member transformations — without contacting a developer. Only structural changes to the app should require development. He also manages members and their memberships.

## Product Purpose

A gym membership companion: it converts a local prospect into a paying member, then serves that member for the length of their membership. Success is a prospect signing in and buying a plan, and the owner never needing a developer to update the site.

## Positioning

Most local gym sites are a static brochure plus a phone number. This is the studio's whole operating surface: the public site, the membership purchase, the member's training and nutrition tools, and an owner-editable content layer, in one place.

## Operating Context

- Prospect journey: lands on the site (phone) → scans plans, facilities, hours, location → signs in → picks a plan → membership activates.
- Member journey: signs in → dashboard → membership status, goal planner, calorie calculator, workout library, leave a review.
- Owner journey: signs in as staff → manages members and memberships → edits public site content and branding.
- Currency is INR. Pricing is per-duration, not per-month.
- Firebase Auth for identity, Firestore for data, staff role gated by an email allowlist (`STAFF_EMAIL_ALLOWLIST`).
- ExerciseDB via RapidAPI backs the workout library; nutrition search backs the calorie calculator. Both are external and can fail or rate-limit.

## Capabilities and Constraints

**Confirmed working:** Firebase email auth with session cookie, middleware-gated `/dashboard`, staff user management, staff membership management, membership plan selection, goal planner, calorie calculator, workout finder, reviews.

**Payments are not wired.** `MembershipCheckout` activates a membership record instantly with no money moving; the code notes Stripe as a later step. Confirmed decision: keep the placeholder activate for now and design the full buy flow around it, leaving the gateway as a drop-in seam. The UI must not imply a payment was taken.

**Owner-editable content layer is required** (confirmed this round, not yet built): brand name, logo, colour scheme, contact details, address, Google Maps location, hours, membership plans, facilities, and transformations must all be editable from the admin panel. Constraint from the user: surface all of it in the UI *without overwhelming the owner*.

**Undecided:** payment gateway choice and timing.

## Brand Commitments

- Name: **BE STRONG FITNESS STUDIO**. Existing logo at `public/logo.jpg` (150×150).
- Both are placeholders in practice — the owner must be able to replace name and logo from the admin panel.
- No confirmed brand guidelines, palette, or typeface. The incumbent teal `#00b3a4` on near-black is prior implementation, not a stated commitment.

## Evidence on Hand

- **Real:** membership prices (`lib/constants/memberships.js`), gym hours (Mon–Sat 5:00–22:00; Sun 6:00–12:00 and 18:00–21:30), usage rules (treadmill 15 min, 2 hour workout cap), 13 facility photographs in `public/facilities/`.
- **Placeholder — must not be presented as verified proof:** the three transformations in `app/data/transformations.js` (Jim, Sarah, Zach) and their photos. Confirmed placeholder. The admin panel must let the owner replace them with real members; until then the admin surface labels them as sample data.
- **Missing, must not be fabricated:** address, city, phone number, email, real WhatsApp number (`wa.me/1234567890` is a placeholder), Instagram, trainer names and credentials, member count, review content.
- **Pricing is standing, not promotional.** Confirmed: Rs 2500 / 4500 / 6000 / 8000 / 12000 are simply the prices. The struck-through "was" prices and the "50% OFF — Limited Time Offer" claim are removed. Value is communicated by honest per-month math instead of fabricated urgency.

## Product Principles

1. **The phone is the product.** The prospect is on a mid-range Android on cellular data. A design that only works on a 27-inch monitor is broken, not "mostly working."
2. **The owner ships changes, not the developer.** Anything the owner would plausibly want to change about the public site is editable in the admin panel. Development is for structure only.
3. **No fabricated proof or urgency.** No invented testimonials, member counts, countdowns, fake scarcity, or struck-through prices that were never charged. If it isn't true yet, it shows an empty state.
4. **Never imply money moved.** Until a gateway is wired, membership activation is described honestly.
5. **Placeholder content is visibly placeholder to the owner, never dressed up as fact to the visitor.**

## Accessibility & Inclusion

No standard was contractually established. Baseline target is WCAG 2.2 AA: real focus states, keyboard reachability, 44px minimum touch targets, honest contrast on the dark palette, `prefers-reduced-motion` respected by the scroll narrative, and every icon-only control labelled. Motion is central to this site's identity, so the reduced-motion path must be a designed experience rather than a stripped one.
