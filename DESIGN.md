# Arkade Ascend: design direction (redesign, 20 Oct 2026)

The presentation is a sales tool a salesperson drives on a laptop, a tablet or a
phone, face to face with a buyer. The redesign keeps every fact, label and
function the client approved; it changes how the presentation looks, moves and
feels. The client's own brand stays: the brochure's fonts and its plum, gold and
ivory, so the screen and the printed brochure agree.

## Concept card

```
Idea:        The presentation rises like the tower: every section is a level
             of the building, and moving between them is a ride up (or down)
             a gold satin lift.
Metaphor:    The tower's lift and the brochure's silk. Sections are stops on a
             lift display; the brochure's gold satin is the lift's curtain.
Signature:   The Lift, the page transition. A two-layer satin curtain (plum
             lining, then gold) sweeps up past the screen with a domed leading
             edge that flattens as it covers; the section number rolls like a
             lift display (old floor out, new floor in) and the curtain carries
             on up, its trailing edge domed, as the new page's lines rise out of
             their masks behind it. Going back to an earlier section, everything
             runs downward. (src/app/LiftCurtain.jsx, TransitionStage.jsx)
Emotion:     Weightless and expensive: the first three seconds feel like the
             doors of a private lift closing on a quiet night.
Motion verb: rise. Lines rise out of masks, pictures unveil from the bottom up,
             numbers roll up like a lift display, the curtain ascends.
Screenshot:  Home: ASCEND set monumental across the screen in the brochure's
             display face, the twilight tower standing in a tall window behind
             it, a storey scale beside it whose gold marker has climbed to 37.
```

Anchor: the project's own name (Ascend), its 37-storey tower and the
brochure's line "Rise to a life extraordinaire". None of it moves to another
brand.

Three territories were weighed:

| Concept | Originality | Fit | Feasibility | Portability (lower is better) |
|---|---|---|---|---|
| The Ascent: sections as lift stops, satin lift transition | 4 | 5 | 4 | 1 |
| Silk atelier: every page a bolt of cloth unrolled | 3 | 4 | 3 | 3 |
| Blueprint: plans and drawings as the visual system | 3 | 3 | 4 | 3 |

The Ascent wins: it is built from the name, the tower and the brochure's own
line, and it gives one motion verb every page can share.

## Palette (roles)

| Role | Token | Hex |
|---|---|---|
| Night ground | ink / espresso | #120b0d / #1b1113 |
| Plum ground, lining | plum-800 / plum-700 | #3d2a2f / #4e373c |
| Ink on dark | ivory | #f6efe4 |
| Muted | gold-200 at 72% | |
| Accent | gold-500 (headline gold) | #c49a6c |
| Highlight | gold-200 (champagne) | #ecd3a8 |
| Curtain | satin: #7f5b37 to #c49a6c to #f2d5a3 | |
| Paper (plans, map) | cream-100 with plum-800 ink | #f4edcc |

The brochure's palette is the brand; the redesign uses it harder: deeper night
grounds, more contrast, gold kept for what matters (the current section, the
primary action, the curtain).

## Type

- Display: Billie Eilish (the brochure's headline face), uppercase, set
  monumental and tight. It has no usable figures, so every number is Gotham
  (`.num`).
- Text, labels, figures: Gotham Book and Medium.
- The Arkade Ascend lockup stays the supplied artwork (Avenir LT Std Black).
- Scale (fluid): hero word to 22vw; page titles fit their column up to
  7.5rem; section titles 1.6 to 3.8rem; body 15 to 18px at 1.6; labels 10 to
  12px uppercase, tracked.

## Grid, rhythm, shape

- Margins are the page gutter (`--gutter`); content aligns to it. Pages are a
  single viewport (the document never scrolls; `.page-scroll` regions do when a
  short window needs it).
- Shape rule: pictures and panels are sharp-cornered frames (2px); controls are
  pills and circles. The lift curtain alone is domed.

## Motion language

- Eases: `silk` (0.22, 1, 0.36, 1) for arrivals, `curtain` (0.76, 0, 0.24, 1)
  for the lift, `expo.out` for the hero.
- Durations: the lift about 1.6 s door to door; headline characters 0.9 s,
  staggered 25 ms; pictures unveil in 1.1 to 1.3 s; small UI 0.3 to 0.5 s.
- Direction carries meaning: a later section rises, an earlier one descends.
- Micro-interactions, one per role:
  - primary pills: a satin fill rises from the bottom and the label rolls up;
  - round icon buttons: magnetic pull of a few pixels, fill rises;
  - list rows and tabs: the label slides a few pixels and turns gold, a
    hairline draws;
  - the pointer: a gold ring follows the native cursor (never replacing it),
    grows over anything clickable and names drag targets ("Drag").
- Idle: the silk veil on Home and Neu Gen, a slow drift in the hero picture, a
  light sweeping over the hero word. Everything stops under reduced motion.
- Reduced motion: no curtain, no follower, no rolls; content is shown at once.

## Intro

The full-screen gate is the loader: the lift shaft (a gold hairline) rises up
the middle, a counter climbs 00 to 100 with the real loading of the fonts and
the first pictures (at most 2.6 s), the Arkade Ascend lockup draws itself in,
and the gate asks for the tap that opens full screen. The tap lifts the gate
away as the curtain does and Home's hero rises.

## Composition plan (key pages)

```
HOME                                   MENU
[logo]                   [menu ◯]      [logo] [home]            [close ◯]
         ┌────────┐ G..37 scale        01 About Us        ┌──────────────┐
  A S C  │ tower  │  E N D             02 Neu Gen Life    │   preview    │
         │ window │                    03 The Tower  ──▶  │  (rises in)  │
         └────────┘                    ...                │              │
 Malad West   [Begin the tour →]       10 Gallery         └──────────────┘
 Neu Gen life        MahaRERA No.      [QR] MahaRERA                Malad West
```

Inner pages keep their working layouts (orbit, plans, map, panoramas) and gain
the shared system: lift-display index, character-rise titles, pictures that
unveil upward, rising pills, the follower and the lift between them.

## Genericness test

A generic model asked for "an award-winning real-estate site" lands on a
fullscreen video hero, a scroll story and fade-up sections. Changed: the
document never scrolls (it is a presentation), the transition is the
building's own lift, the hero is the project's name and its storey count, and
the palette and type are the client's brochure, not a stock luxury theme.
