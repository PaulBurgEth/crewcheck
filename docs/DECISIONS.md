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
