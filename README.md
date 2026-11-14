# CrewCheck

**Crew health when Earth is far away.** An onboard health monitor for space crews that takes on more as Earth gets farther away.

NASA Space Apps Challenge 2026 · challenge "Create Health Monitoring Software for Astronauts on Space Missions".

> Educational prototype. Synthetic data. Not a medical device.

**Live demo:** https://paulburgeth.github.io/crewcheck/ (no login; works offline after the first visit)

## The idea
Today spaceflight medicine relies on a flight surgeon on the ground. On the ISS the answer comes in seconds. On the way to Mars a message takes up to 20 minutes one way (NASA HRP), so a question and its answer can take 40. The crew has to act first.

CrewCheck answers one question for every signal: **who acts now**, the astronaut, the crew medical officer, or Earth, and how long Earth's reply will take. The vitals come in automatically from a suit; the crew spends under a minute a day on input.

## See it in one minute
1. Press **Play story** (about 40 seconds). Six steps run on the real app state, nothing is faked:
   - **Sense**: the suit measures, Maya does nothing.
   - **Drift**: three signals drift together on a Mars transit.
   - **Rules**: rules decide, and every rule has a source.
   - **Distance**: near Earth the flight surgeon answers; far away the crew acts.
   - **Act**: the onboard agent acts within its limits; the crew medic approves the rest.
   - **Check**: did it work? Sleep yes, pressure not yet.
2. Then **try it yourself**: drag the mission day, switch distance (ISS, Moon, Mars transit, Mars surface) or press **Compare** (Near Earth / Deep space), tap a glowing zone on the body to see why, open **Crew** for all four members.

## How it works: rules decide, forecast warns, AI advises
| Layer | Does | Can change the verdict? |
|---|---|---|
| Rules (`js/data/rules.js`) | status per body system, escalation tier by distance from Earth | yes, only this layer |
| Forecast (`js/engine/forecast.js`) | linear trend of the last 21 days, days until a threshold | no, it warns |
| AI advisor (`js/engine/advisor.js`) | explains in plain language: a note for the medic and answers to three fixed questions | no, enforced by a test |

The screen reads in three columns: **Sense** (body map and suit), **Decide** (the verdict "Decided by rules", with mini-scales showing the personal norm, the threshold and today's value) and **Act** (the onboard agent's case card).

Every recommendation carries a confidence badge: **Proven** (NASA source or clinical norm), **Hypothesis** (trend or model), **Ask medic** (a decision for the crew medic or flight surgeon).

Escalation matrix (status × distance):

| | ISS / Moon (reply in seconds) | Mars (reply up to 40 min) |
|---|---|---|
| Green | no action | no action |
| Yellow | ask the flight surgeon | act yourself, report sent |
| Red | crew medic + flight surgeon live | crew medic, act on board |
| Linked signals or failed countermeasure | ask the flight surgeon | crew medic |

On the Moon Earth answers in seconds but home is about three days away, so the crew medic decides together with the flight surgeon.

## The onboard agent
The agent runs each case through **Watch, Flag, Plan, Act, Verify** (`js/engine/agent.js`). It decides nothing: cases, stages and actions come from the rule engine. It does only non-clinical work, and less of it near Earth:

- **May** (grows with distance from Earth): watch signals, notify Earth, schedule a re-measure, draft a report, page the crew medic, track the case.
- **Never**: diagnose, choose medicines or doses, close a red case alone, change a status or a threshold.

The case card shows what the agent has done and what waits for a person, with an **Approve** button. The "Agent may" levels are a design assumption and are labelled so in the app.

## Other parts
- **Suit stream**, simulated and modelled on the CSA Bio-Monitor, with automatic alerts (try "Simulate SpO2 drop").
- **One-minute check-in** of five fields: only what the suit cannot measure.
- **Countermeasure follow-up**: "did it work?" a few days later.
- **Earth screen** as one picture: each report is an envelope that travels from the ship to Earth; the travel time is compressed and stated on screen.
- **Crew monitor** for four members, **day rings**, streak, crew patch and the **CrewCheck Index** with open weights.
- **Sources** screen: the decision chain as a picture, the data passport and every threshold with its source.
- Radiation dose estimate and an instruments panel (drawer).

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
Open http://localhost:8000. Tests (Node 20+): `node --test`

## Project layout
- `index.html`, `css/`, `js/app.js`: app shell and screens (`js/screens/`, story mode in `js/screens/story.js`)
- `js/data/`: rules, sources, missions, explanations, precomputed advice
- `js/engine/`: evaluate, escalation, follow-up, forecast, onboard agent, score, downlink, radiation, validation, advisor guard
- `js/demo/`: synthetic crew generator and data passport
- `js/sensor/`: simulated suit stream and alerts
- `js/viz/`: hand-written SVG components (body, distance scene, decision nodes, timeline, rings, live lines)
- `advisor-proxy/`: small proxy for the live advisor; the demo works without it
- `docs/`: data contract, design decisions, known issues
- `tests/`: `node --test` suites

## Use of AI
- **Building it.** Code, tests and the data generator were written with Claude Code (Anthropic Claude) and reviewed by the team. Log: `AI_USE.md`.
- **In the product.** The AI advisor is Claude. It receives only structured data (fired rules and numbers), never free text, answers only three fixed questions, and cannot change status or escalation.
- **Live and offline.** When online, the advisor answers live through a small proxy (`advisor-proxy/`, rate-limited, own key on the server, never in the browser). Offline, or if the proxy is down, the app shows precomputed answers labelled "AI-generated (Claude), precomputed" (`js/data/advisor-precomputed.js`). In this demo the advisor runs on a cloud model; on a mission it would run on board.
- **No AI-generated images.** The body figure and icons are hand-written SVG. No agency logos.

## Licence
Apache License 2.0, see `LICENSE`. Third party: Chart.js 4.4.7 (MIT), `vendor/chart.js.LICENSE.md`.

## Beyond space
The same logic, "who acts when expert help is far away", fits Antarctic stations, ships and remote clinics on Earth.
