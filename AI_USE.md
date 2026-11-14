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

## Not AI
- No AI-generated images. The body figure and icons are hand-written SVG.
- No real astronaut data. All data is synthetic, produced by an open generator with a fixed seed.
