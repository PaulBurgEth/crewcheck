# CrewCheck advisor proxy

Tiny Node 20+ adapter with no package dependencies. It receives a structured advisor payload, asks either an onboard Ollama model or Anthropic for a plain-English explanation, and returns `{text, points, origin}`. It never changes a verdict.

The browser does not connect to Ollama directly. This adapter preserves the payload allow-list, fixed questions, output validation, rate limits and exact-origin CORS check for both providers.

## Onboard Ollama quick start

Install Ollama, then download the 3B model while internet access is available:

```sh
ollama pull llama3.2:3b
```

Copy `.env.example` to `.env`, set `ALLOWED_ORIGIN` to the exact origin serving CrewCheck, then start the adapter from the repository root:

```sh
node --env-file=advisor-proxy/.env advisor-proxy/server.js
```

The default configuration calls Ollama at `127.0.0.1:11434`, uses `llama3.2:3b`, and exposes the adapter only at `127.0.0.1:8790`. Set the full `/advice` address as `PROXY_URL` in `js/screens/advisor-live.js`.

For a two-computer onboard-LAN setup, run Ollama and this adapter on the edge computer, set `HOST=0.0.0.0`, and point `PROXY_URL` at that computer. Keep Ollama bound to loopback. Restrict port 8790 to the onboard LAN; do not expose it to the public internet.

Full setup, safety behaviour and offline acceptance checks are in [`docs/LOCAL_AI.md`](../docs/LOCAL_AI.md).

## Cloud alternative

Set these values instead:

```dotenv
ADVISOR_PROVIDER=anthropic
ANTHROPIC_API_KEY=replace-me
ANTHROPIC_MODEL=claude-haiku-5-5
```

Keep secrets in `.env`; it is ignored by git. The cloud path retains the previous behaviour.

## Reverse proxy

Example nginx location for a separately chosen host:

```nginx
location /advice {
    proxy_pass http://127.0.0.1:8790;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 4k;
}
```

Per-IP limits trust `X-Real-IP` only when the connection to the adapter comes from loopback.

## Failure behaviour

The adapter rejects unknown payload fields, free text, unknown rules, invalid model output and answers outside the size limits. Model errors return a non-2xx response. The browser deliberately keeps the precomputed answer already on screen; status, tier and actions continue to come from the rule engine.

Deployment happens only on the owner's command. Nothing here deploys itself.
