# Pre-PR MVP audit: CrewCheck + onboard Local AI

## Decision

**Conditional GO for the pull request and hackathon demonstration.**

The current change is a feasible software MVP that connects CrewCheck's existing advisor contract to an optional onboard Ollama model without moving medical decisions into the model. It is suitable for demonstrating the bridge between the two hackathon projects.

The result is **not** evidence of clinical safety, flight readiness, NASA equivalence, or verified performance on the proposed Jetson target. A real Ollama smoke test on the demonstration hardware remains a pre-demo execution requirement.

## Scope used for this audit

### Hackathon project 1: CrewCheck

The existing NASA Space Apps prototype remains the primary product:

- deterministic rules decide status, escalation and actions;
- distance from Earth changes who acts;
- synthetic crew, suit and cabin data drive a repeatable story;
- the app remains usable without any live AI service;
- AI explains but cannot change the verdict.

### Hackathon project 2: Local AI MVP

The second project is limited to:

- an optional local explanation provider;
- Ollama's local `/api/chat` endpoint;
- Llama 3.2 3B as an edge-oriented engineering candidate;
- the existing structured CrewCheck advisor payload;
- validated short JSON output;
- safe fallback to the existing precomputed experience.

No RAG, fine-tuning, free-text chat, diagnosis, treatment selection, multimodal input or autonomous clinical action is required for this MVP.

## Comparison with NASA Doc-in-a-Box

| Area | NASA Doc-in-a-Box material | CrewCheck Local AI MVP | Audit result |
|---|---|---|---|
| Purpose | Support Crew Medical Officer decision-making during Earth-independent operations | Explain an already-decided CrewCheck verdict | Aligned in context; deliberately narrower and safer |
| Decision authority | Explores clinical decision support and future diagnostic/treatment support | Rules decide; AI cannot change status, tier, threshold or action | Suitable MVP boundary |
| Data | Vital signs, notes, labs, imaging, cabin, radiation, exercise and other mission data | Allow-listed rule ids and numbers derived from synthetic vital, cabin and mission data | Partial subset, sufficient for the demo |
| Architecture | Multi-modal, agentic, containerized edge system | One text model behind a small provider-neutral adapter | Inspired by, not a reproduction |
| Hardware | Reported prototype used an HPE Edgeline EL8000 with NVIDIA A100 and OpenShift | Proposed Jetson Orin Nano 8GB-class development target with Ollama | Different engineering experiment; no NASA hardware claim |
| Models | NASA material reports Gemma 2, Llama 3.1 and a larger adapted open-source model path | Llama 3.2 3B | Plausible edge candidate, not a NASA-validated equivalent |
| Evaluation | Medical scenarios and OSCE-style expert evaluation | Contract, validation, fallback and rule-integrity tests | Enough for software MVP; not medical validation |
| Failure handling | High-integrity testing and human oversight are emphasized | Invalid/unavailable model responses are discarded; CrewCheck continues with rules and precomputed content | Strong alignment for hackathon scope |

Primary references:

- [NASA NTRS: Doc-in-A Box — Adaptation and Fine Tuning of an Open-Source LLM](https://ntrs.nasa.gov/citations/20250004306)
- [NASA NTRS: Artificial Intelligence at NASA / Doc in a Box](https://ntrs.nasa.gov/citations/20250003811)
- [Ollama chat API](https://docs.ollama.com/api/chat)
- [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
- [NVIDIA Jetson AI Lab: Llama 3.2 3B](https://www.jetson-ai-lab.com/models/llama3-2-3b/)

## Feasibility findings

| Check | Result | Evidence / condition |
|---|---|---|
| CrewCheck works without Local AI | Pass | Static app and precomputed advisor remain independent of the adapter |
| Rules remain the decision authority | Pass | Advice is attached to a frozen verdict; tests verify status and tier do not change |
| Browser sends constrained data | Pass | The proxy accepts only known missions, rules, signals, fixed request types and bounded numeric fields |
| Ollama request contract | Pass at software-test level | `/api/chat`, non-streamed response, JSON schema and deterministic temperature are covered by tests |
| Model output containment | Pass | Unknown/oversized/non-JSON output is rejected before reaching the UI |
| Failure fallback | Pass | Adapter/model failure returns non-2xx; the UI keeps the existing precomputed or no-advice state while rules continue |
| Provider startup path | Pass at configuration level | The Ollama provider starts without an Anthropic key and keeps Ollama behind the adapter |
| Offline operation | Conditional | Model must be pulled in advance; UI, adapter and Ollama must all be served locally or over the onboard LAN |
| Jetson Orin Nano execution | Plausible, unverified here | NVIDIA documents Llama 3.2 3B on Orin Nano 8GB; this repository has not run the real target |
| Cold-start response within 18 seconds | Unverified | Warm the model before the demo and measure on the chosen hardware |
| Clinical quality | Not established | No OSCE-style or qualified medical review has been performed; not required for this hackathon MVP |

Current automated result: **96 tests passed**, including adapter request shape, payload rejection, output validation, cache/rate controls, unavailable-model behaviour, and unchanged CrewCheck decision logic.

## Execution conditions for a successful demo

These are operational steps, not new product features:

1. Install Ollama and pull `llama3.2:3b` before disconnecting from the internet.
2. Serve CrewCheck locally for the Local AI demonstration. Do not expect an HTTPS GitHub Pages page to call a plain-HTTP LAN service because browsers can block mixed content.
3. Set `PROXY_URL` to the local adapter and make `ALLOWED_ORIGIN` exactly match the URL used to open CrewCheck (`localhost` and `127.0.0.1` are different origins).
4. Start Ollama first, then the adapter, then the static CrewCheck server.
5. Warm the model with one request before judging; record first-response and warm-response times.
6. Demonstrate one story day that has precomputed advice.
7. Stop Ollama and request a different fixed question or reload the page; confirm the precomputed explanation remains and the verdict is unchanged.
8. Restart Ollama, reload, and confirm an answer is labelled `AI-generated onboard · rules decided`.
9. Keep the demo on a local or trusted onboard network. The current MVP is not intended for an exposed public service.

## PR acceptance boundary

The PR is ready when reviewers accept the following claim:

> CrewCheck can optionally ask a small onboard model to explain structured rule results. If the model is unavailable or invalid, CrewCheck's rule-based monitoring and existing offline explanation experience continue to operate.

The PR should **not** claim:

- reproduction of NASA Doc-in-a-Box;
- a NASA-recommended or NASA-validated Llama 3.2 model;
- diagnostic or treatment capability;
- clinical accuracy or medical-device readiness;
- flight-qualified Jetson hardware;
- measured offline performance on hardware not actually tested.

## Deferred until after the hackathons

Do not add these before the PR unless a demonstrated blocker appears:

- medical corpus/RAG and citation grounding;
- model fine-tuning or model comparison;
- voice, image, ultrasound, notes or free-text input;
- OSCE-style medical evaluation and clinician review;
- power, thermal, memory and sustained-load benchmarking;
- container orchestration, redundant runtimes or automatic model discovery;
- public-network authentication, certificates and production operations;
- retry UX, health dashboards or configuration UI;
- flight, radiation, privacy or regulatory qualification.

These are valid next-phase subjects, but adding them now would blur the two hackathon deliverables and increase execution risk without improving the MVP claim.
