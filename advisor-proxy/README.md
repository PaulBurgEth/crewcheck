# CrewCheck advisor proxy

Tiny Node 20+ server (no dependencies). Receives the structured advisor payload (fired rules and numbers, no free text), asks the model for a plain-English explanation, returns `{text, points, origin:'live'}`. It never changes a verdict.

Deployment happens only on the owner's command. Nothing here deploys itself.

## Run
Copy `.env.example` to `.env` outside git, set real values, then load it into the service environment. `ANTHROPIC_API_KEY` is required; `ALLOWED_ORIGIN` must be the exact site origin.

    node advisor-proxy/server.js

Binds to 127.0.0.1 only, default port 8790 (pick a free, own port).

## Process manager
systemd: `EnvironmentFile=/path/to/.env`, `ExecStart=/usr/bin/node /path/to/crewcheck/advisor-proxy/server.js`, `Restart=on-failure`.
pm2: `pm2 start advisor-proxy/server.js --name crewcheck-advisor` with the env set.

## nginx (separate subdomain chosen by the owner)
    location /advice {
        proxy_pass http://127.0.0.1:8790;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 4k;
    }

Per-IP limits use `X-Real-IP` only when the connection comes from loopback.

## Spend
Set a monthly spend limit in the Anthropic console. The proxy also caps calls per IP per minute and per UTC day (`DAILY_CAP`).

## Then
Set `PROXY_URL` in `js/screens/advisor-live.js` to the full `/advice` URL.
