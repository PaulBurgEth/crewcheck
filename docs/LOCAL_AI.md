# Local AI MVP: onboard Ollama

This is a Doc-in-a-Box-inspired engineering prototype, not a reproduction of a NASA system and not a flight-certified medical device. The MVP uses a small local model to explain CrewCheck's existing rule results when Earth connectivity is unavailable.

## Safety boundary

The data path is intentionally one-way:

1. CrewCheck's deterministic engine evaluates signals and decides status, escalation and actions.
2. The browser sends only allow-listed rule ids and numbers to `advisor-proxy`.
3. The adapter sends that structured JSON to Ollama and asks for a short schema-constrained explanation.
4. The adapter validates the model output before returning it.
5. The UI attaches the explanation next to the unchanged verdict.

The model cannot change status, tier, thresholds or actions. It receives no free-text prompt from the user. If any AI component fails, the rule engine and alerts still work.

## MVP topology

Recommended simulation target:

- edge computer: NVIDIA Jetson Orin Nano 8GB-class development device, or an ordinary Linux/Windows computer for initial testing;
- runtime: Ollama;
- model: `llama3.2:3b` (the Ollama package is about 2 GB; runtime memory is additional);
- web app: unchanged static CrewCheck UI;
- adapter: `advisor-proxy/server.js`, colocated with Ollama;
- connection: local-only or a restricted onboard LAN.

Jetson Orin Nano is a ground-development proxy for a constrained edge computer. It is not presented here as NASA-selected or flight-qualified hardware. Llama 3.2 3B is an engineering candidate, not a NASA-validated medical model.

## Install and configure

Prerequisites: Node 20+, Ollama, and the CrewCheck repository. Download the model before the offline test:

```sh
ollama pull llama3.2:3b
```

Copy `advisor-proxy/.env.example` to `advisor-proxy/.env`. For an adapter and Ollama on the same computer:

```dotenv
ADVISOR_PROVIDER=ollama
ALLOWED_ORIGIN=http://127.0.0.1:8000
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_TIMEOUT_MS=18000
DAILY_CAP=300
PER_IP_PER_MIN=6
HOST=127.0.0.1
PORT=8790
```

Start CrewCheck and the adapter in separate terminals from the repository root:

```sh
python3 -m http.server 8000
node --env-file=advisor-proxy/.env advisor-proxy/server.js
```

Set `PROXY_URL` in `js/screens/advisor-live.js` to:

```js
export const PROXY_URL = 'http://127.0.0.1:8790/advice';
```

Open `http://127.0.0.1:8000`. On a non-green story day, open **AI explains**. A successful local answer is labelled `AI-generated onboard · rules decided`.

### Separate UI and edge computers

On the edge computer, keep `OLLAMA_BASE_URL` on loopback and change only the adapter listener:

```dotenv
HOST=0.0.0.0
ALLOWED_ORIGIN=http://crewcheck-ui:8000
```

Use `http://edge-computer:8790/advice` for the browser's `PROXY_URL`. Limit inbound TCP 8790 to the UI computer or onboard-LAN subnet. TLS and an authenticated gateway are required before use on any shared or untrusted network.

## Offline acceptance check

1. While connected, install Ollama and pull `llama3.2:3b`.
2. Disconnect external internet access; leave the local link between the UI and edge computer active.
3. Open a non-green CrewCheck day and request an advisor explanation.
4. Confirm a new answer appears with the onboard label.
5. Stop Ollama and request a different fixed question or day.
6. Confirm the precomputed explanation remains available and status, tier and actions are unchanged.
7. Restart Ollama and confirm a later request can again return an onboard answer.

The browser makes one attempt per person/day/question and does not retry continuously. Reload the page between failure and recovery checks.

## Deliberately out of scope

- medical diagnosis or treatment selection;
- model fine-tuning;
- retrieval-augmented generation or a medical document corpus;
- voice, images or free-text chat;
- automatic replacement of rules or thresholds;
- flight qualification, clinical validation, power benchmarking or radiation-hardening claims.

Before any real medical use, model responses need a purpose-built evaluation set and qualified human review. This MVP demonstrates isolation and offline continuity, not clinical safety.

## References

- [Ollama chat API](https://docs.ollama.com/api/chat)
- [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
- [Ollama Llama 3.2 model page](https://ollama.com/library/llama3.2)
