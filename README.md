# CrewCheck

**Crew health when Earth is far away.** An onboard health monitor for space crews that takes on more as Earth gets farther away.

NASA Space Apps Challenge 2026 · challenge "Create Health Monitoring Software for Astronauts on Space Missions".

> Educational prototype. Synthetic data. Not a medical device.

**Live demo:** https://paulburgeth.github.io/crewcheck/ (opens on day 120 of a Mars transit, no login)

## The idea in one line
On the ISS a flight surgeon answers in seconds. On the way to Mars a reply takes at least 40 minutes, so the crew has to act first. CrewCheck shows, for every signal, **who acts now**: the astronaut, the crew medical officer, or Earth, and how long Earth's reply will take.

## What you can try in 60 seconds
1. **Drag the mission day** from day 1 to day 120: the body map, verdict and charts change.
2. **Switch distance** (ISS, Moon, Mars transit, Mars surface): the same signals give "Ask the flight surgeon, reply in seconds" near Earth and "Handle it yourself, report sent, reply ≥ 40 min" far away. On the Moon Earth answers in seconds but home is ~3 days away, so the crew medic acts with the flight surgeon live ("Decide together").
3. **Tap a glowing zone** on the body: "Why?" explains the rule, the number and the source, stored on board.
4. **Crew** shows all four members; tap a tile to open that person's monitor.
5. **Simulate SpO2 drop** in the suit card: an alert fires from the stream with no manual input.

## How it works: AI advises, rules decide
| Layer | Does | Can change the verdict? |
|---|---|---|
| Rules (`js/data/rules.js`) | status per body system, escalation tier by distance from Earth | yes, only this layer |
| Forecast (`js/engine/forecast.js`) | linear trend of the last 21 days, days until a threshold | no, it warns |
| AI advisor (`js/engine/advisor.js`) | explains in plain language | no, enforced by a test |

Every recommendation carries a confidence badge: **E** Established (NASA source or clinical norm), **H** Hypothesis (trend or model), **A** Ask (decision for the crew medic or flight surgeon).

Escalation matrix (status × distance):

| | ISS / Moon (reply in seconds) | Mars (reply ≥ 40 min) |
|---|---|---|
| Green | no action | no action |
| Yellow | ask the flight surgeon | act yourself, report sent |
| Red | crew medic + flight surgeon live | crew medic, act on board |
| Linked signals or failed countermeasure | ask the flight surgeon | crew medic |

Other parts: a simulated suit stream modelled on the CSA Bio-Monitor with automatic alerts; a one-minute check-in of 5 fields (only what the suit cannot measure); countermeasure follow-up ("did it work?"); Earth report with a simulated downlink; day rings and a crew check-in patch; radiation dose; an instruments panel; the CrewCheck Index with open weights; offline support.

## NASA data
Built on the challenge's Resources tab:
- NASA HRP, [5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/): the frame of the body map and hazard texts.
- NASA HRP, [Hazard: Distance from Earth](https://www.nasa.gov/hrp/hazard-distance-from-earth/): communication delay of up to 20 minutes one way, which drives the escalation logic.
- NASA HRP, [Hazard: Gravity Fields](https://www.nasa.gov/hrp/hazard-gravity-fields/): bone loss of 1-1.5% a month, fluid shift toward the head.
- NASA HRP, [Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/): [SANS](https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/) (about 70% of ISS astronauts), [Reduced Fitness](https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/) (1.5 h exercise a day, 6-7 days a week), [Sleep](https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/) (16 sunrises a day; light and schedule countermeasures).

## Partner agency and other references
- CSA, [Bio-Monitor](https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp): data model of the simulated suit stream ("modelled on", not "integrated with").
- CSA, [Monitoring Radiation for Astronaut Health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp).
- SwRI press release on MSL RAD: about 1.8 mSv a day in cruise (used as a demo estimate).
- Clinical norms (pages opened 14.11.2026): [AHA blood pressure categories](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings); [ADA fasting glucose](https://diabetes.org/diabetes/a1c/diagnosis) and [low glucose below 70 mg/dL](https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose); [CDC: adults need 7 or more hours of sleep](https://www.cdc.gov/sleep/about/index.html); [MedlinePlus vital signs](https://medlineplus.gov/ency/article/002341.htm) (pulse 60-100, breathing 12-18) and [pulse oximetry](https://medlineplus.gov/lab-tests/pulse-oximetry/) (SpO2 95-100%, immediate care at 88% or lower).
- Demo assumptions (labelled in the app): Moon delay about 1.3 s, ISS "hours home", fever 38 °C, breathing 22+, glucose below 54, all drift magnitudes. No career radiation limit is shown, because the NASA-STD-3001 line could not be confirmed in this build.
- Every threshold in the product lists its source on the Sources screen. Values without a confirmed source are labelled "Demo assumption".

## Synthetic data
Four fictional crew members over 180 days, made by an open generator with a fixed seed (`js/demo/generator.js`, seed 20261114). Shapes follow NASA HRP findings; magnitudes marked as assumptions are illustrative. The data passport (`js/demo/passport.js`, shown on the Sources screen) lists for every signal its unit, baseline, noise, drift, events, source and basis. No real astronaut data is used.

## Run locally
Static site, no build step:
```
python3 -m http.server 8000
```
Tests (Node 20+): `node --test`

## Project layout
- `index.html`, `css/`, `js/app.js` — app shell and screens (`js/screens/`)
- `js/data/` — rules, sources, missions, explanations, precomputed advice
- `js/engine/` — evaluate, escalation, follow-up, forecast, score, downlink, radiation, validation, advisor guard
- `js/demo/` — synthetic crew generator and data passport
- `js/sensor/` — simulated suit stream and alerts
- `js/viz/` — hand-written SVG components (body, signal to Earth, decision nodes, timeline, rings, live lines)
- `advisor-proxy/` — optional live advisor proxy (not required by the demo)
- `tests/` — `node --test` suites

## Use of AI
- Code, tests and the data generator were written with Claude Code (Anthropic Claude) and reviewed by the team. Log: `AI_USE.md`.
- In the product, the AI advisor answers shown for key days are **AI-generated (Claude), precomputed** (`js/data/advisor-precomputed.js`). The advisor receives only structured data (fired rules and numbers), never free text, and cannot change status or escalation.
- A live advisor through a small proxy is optional; the demo never depends on it. In this demo the advisor runs on a cloud model; on a mission it would run on board.
- No AI-generated images: the body figure and icons are hand-written SVG. No agency logos.

## Licence
Apache License 2.0, see `LICENSE`. Third party: Chart.js 4.4.7 (MIT), `vendor/chart.js.LICENSE.md`.

## Beyond space
The same logic, "who acts when expert help is far away", fits Antarctic stations, ships and remote clinics on Earth.
