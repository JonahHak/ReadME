# APEX LIFT

Personal athletic optimizer for one athlete (Jonah). It turns any exercise, photo, sport or training-day request into a science-graded prescription, coached through the Cameron Goodson lens (neurology, biomechanics, physics).

The coaching brain is an LLM reached through an **OmniRoute** gateway (OpenAI-compatible). When the gateway is missing or down, the app answers from the offline library in `data/`.

## Run locally

```bash
cd apex-lift
npm install
npm start                  # http://localhost:3000, offline mode
# live mode:
OMNIROUTE_BASE_URL=https://<your-gateway>/v1 OMNIROUTE_API_KEY=<key> npm start
npm test                   # API (with a mock gateway) + content audit
```

## Environment variables

| Name | Required | What |
|---|---|---|
| `OMNIROUTE_BASE_URL` | for live mode | Gateway URL. `/v1` is appended if missing. |
| `OMNIROUTE_API_KEY` | for live mode | Gateway key. Read only on the server, never sent to the browser. |
| `MODEL_TEXT` | no | Force a text model. Default: strongest Claude model on the gateway. |
| `MODEL_VISION` | no | Force a vision model. Default: strongest vision-capable model. |

## How it works

- `server.js` serves `public/` and proxies `/api/optimize`, `/api/session`, `/api/pregame`, `/api/vision` to `{base}/chat/completions` with `stream: true`, relaying tokens to the browser as server-sent events so cards fill in progressively.
- Every answer is validated with Zod (`lib/schemas.js`). On invalid JSON the server retries once with the validation error, then falls back to the offline library.
- `prompts/coach_system.md` is the coaching system prompt. Each call also gets the athlete profile (editable in Settings), the last 14 days of logs, today's toggles, and the JSON Schema for the expected output.
- Photos are resized in the browser to ≤1280 px and sent as base64 `image_url` parts.
- Logs, tests, Garmin numbers and settings live in `localStorage` (Settings → Export/Import JSON to move them).

## Content

| File | What |
|---|---|
| `data/exercises.json` | 43 full Optimization Cards, Morning 5, 15 pre-game protocols, 14 sessions |
| `data/tips.json` | Small-tips library, each claim web-verified and graded A–D (2026-10-27) |
| `data/fightlab.json` | Fight philosophy, home contact ladder, striking/grappling progressions |
| `data/systems.json` | Lungs/EIB, vision, skills, recovery, XC running economy, looks extras |

Edit the sources in `data/parts/`, then run `node scripts/build-data.js && npm test`.

## Deploy

The repo-root `Dockerfile` builds this folder, so Railway or Render deploys it with no extra settings. Set the env vars above in the service's Variables tab.
