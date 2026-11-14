# Decisions

Architecture source: NASA_SpaceApps_2026_ARCHITECTURE.md (approved 14.11.2026), kept outside this repo.

- **Static site, ES modules, no build.** Fewer moving parts in a 30-hour build; opens from GitHub Pages and from disk.
- **Rules as data with a source id** (`js/data/rules.js`, `js/data/sources.js`). The Sources screen is generated from them; a test fails if a rule has no known source.
- **Escalation depends on round-trip delay.** Earth counts as "reachable" when the round trip is under one minute (ISS, Moon). Far from Earth, yellow means "act yourself + report"; linked signals (sleep + mind + heart) or a failed countermeasure bring in the crew medic.
- **Follow-up** compares rules fired the day before a countermeasure with rules fired 7 days later.
- **Personal norm** = mean of mission days 1-14 (includes adaptation days; accepted for the demo).
- **CrewCheck Index** weights are a demo assumption and are shown with the formula.
- **Radiation**: no career limit number is shown because the 600 mSv line in NASA-STD-3001 could not be read in this build.
- **Clinical sources** that could not be opened (CDC fever, low-glucose levels, breathing rate) are labelled "Demo assumption".
- **Advisor**: precomputed answers (Claude) for story days; optional live proxy, off by default (`PROXY_URL` empty). Advice is frozen next to the verdict and cannot change it (test).
- **Service worker**: network first, cache fallback, versioned cache name.
- **Hero name**: Maya Okafor (fictional). Alternatives offered: Lena Varga, Tomas Reyes.

## UX v2: demo as a story (14.11.2026)
- **What**: story mode (6 steps on the real app state, Play ~40 s, `#/explore` skips it, `#/story?step=N` opens a step), full-width distance scene (line length by delay, envelope with compressed countdown, Compare near/deep), "Decided by rules" verdict with mini-scales (personal norm band = mean ± 1 SD of days 1-14, threshold, current value, 3-day spark), three columns Sense / Decide / Act, icon+word confidence badges (Proven / Hypothesis / Ask medic), action cards, advisor bubble with three fixed questions, sources strip (tap lights body zones), radiation and instruments moved to a drawer.
- **Why**: Paul's feedback on the live screen: looked like another health dashboard, unclear what to press, too much text. Brief `crewcheck_ux_v2_brief.md`.
- **Engine, rules, generator, thresholds untouched.** The norm band on the mini-scale is computed in the UI from the same 14-day window.
- **Fragile**: scene animation uses a timer (works in background tabs); CSS transitions on line length need a rendering browser. Word budget: about 40 words outside value labels on the main screen; measured with a script, depends on the day.
- **Rejected**: a separate wizard page (would fake states); free text to the advisor.

## G7: Earth screen as one picture (14.11.2026)
- **What**: the Earth screen opens with one ship → Earth line. Each downlink message (D107, D108–110 …) is an envelope in its verdict colour that leaves "On board", travels the line and lands "At Earth" (Earth glows on landing). A distance switch (ISS, Moon, Mars transit, Mars surface) on the screen changes the global mission, the line length, the travel time and the "Sent / Lands" clock. "Send again" replays. The message log stays below, folded in `<details>`. Copy report unchanged.
- **Why**: QA proposal Г7; Paul rated far screens visually weak. Four identical "Sent · Earth · Reply" rows did not show the delay.
- **Reuse, not a second implementation**: `js/viz/scene.js` now exports `linkOf(m)` (line length + compressed travel time), `shipSvg`, `earthSvg`, `reduced`, `mmss`; the Monitor scene uses `linkOf` for the same values it had before (behaviour unchanged). `js/viz/signal.js` is no longer used by any screen.
- **Motion**: timers, not rAF (works in background tabs); with `prefers-reduced-motion` every envelope is shown landed, tag "Motion off".
- **Fragile**: the travel time is compressed (20 min shown in 3.2 s; ISS/Moon 0.7 s), stated on the screen. Envelopes fly with a fixed stagger; with many messages they queue on board.
- **Rejected**: one big fixed-size SVG (does not reflow to 375 px); per-envelope real-time ratios (Moon 1.3 s vs Mars 20 min is invisible on any one scale).
