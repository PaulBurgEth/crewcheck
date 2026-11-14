# Use of AI in CrewCheck

Log of where AI was used, kept from the first hour of the build.

| When (UTC+7) | What | Tool |
|---|---|---|
| 14.11.2026 12:16 | Repository created; first commit. Work started after the event start (14.11.2026 09:00 local). | Claude Code (Anthropic Claude) |
| 14.11.2026 | Code of the app, tests and synthetic data generator written with an AI coding assistant, reviewed by the team | Claude Code |

## In the product
- **AI advisor.** The advisor panel explains signals in plain language. It never sets status or escalation: rules decide.
- **Precomputed answers** (`js/data/advisor-precomputed.js`) are marked "AI-generated (Claude), precomputed".
- The advisor receives only structured data (fired rules and numbers), never free text.
- **Live advisor.** When online, answers come live from Claude through a small proxy (`advisor-proxy/`): own key on the server, never in the browser; rate-limited; accepts requests only from the demo page. Offline or if the proxy is down, the precomputed answers are shown.
- The three advisor questions ("Why now?", "What if I wait?", "What should the medic check?") are fixed buttons. Their precomputed answers were written by Claude from the same structured data and are labelled "AI-generated (Claude), precomputed". There is no free text input; the live proxy accepts only these three question ids.

## Not AI
- No AI-generated images. The body figure and icons are hand-written SVG.
- No real astronaut data. All data is synthetic, produced by an open generator with a fixed seed.
