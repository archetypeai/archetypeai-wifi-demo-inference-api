# Migration: Direct Query API → Inference API

This project is the [WiFi occupancy demo](https://github.com/archetypeai/archetypeai-wifi-demo) with its Newton calls moved from the Direct Query API (`POST /api/lens/query`) to the Inference API: Newton C 2.6 → **Newton C 2.6** (same model, new endpoint). The UI, the GHOST-IoT data and frames, the prompts and the token budgets are unchanged.

All measurements below were taken on production on 2026-11-14.

## Summary

- **Endpoint:** every call is `POST /api/inference/query` on `newton-c-2.6`, text only, with the system turn in `system_prompt`. All three Newton routes (`/api/analyze`, `/api/analyze-realtime`, `/api/predict-devices`) share one client, so they move together.
- **No prompt changes.** The snapshots are small (about 3 KB) and the answers short (400–512 tokens), so they finish well within the Inference API's ~58-second query limit, which the earthquake and grid demos had to work around.
- **Same results:** on 40 windows, both versions call occupancy correctly on all 40; the Inference API gets all 360 per-device online/offline calls right, Direct Query 358. See [Results](#results).
- **Open-source fonts:** Geist and Geist Mono replace the design system's PP Neue Montreal, whose files can't be redistributed.

## Direct Query API vs Inference API

|               | Direct Query API                     | Inference API               |
| ------------- | ------------------------------------ | --------------------------- |
| Endpoint      | `POST /api/lens/query`               | `POST /api/inference/query` |
| Model         | `Newton::c2_6_8b_fp8_260424d7a55d5e` | `newton-c-2.6`              |
| System turn   | `instruction_prompt`                 | `system_prompt`             |
| Answer budget | `max_new_tokens` 400 or 512          | The same                    |
| Answer        | `response.response[0]`               | `response.response[0]`      |

## What changed in the code

| File                       | Change                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/newton.js` | `runQuery` calls `POST /api/inference/query` on `newton-c-2.6`, same arguments; accepts the endpoint with or without `/api`.            |
| `vite.config.js`           | The project's `.env` wins over `ATAI_*` shell variables.                                                                                |
| `src/routes/layout.css`    | Geist and Geist Mono from `@fontsource-variable` instead of the design system's `fonts.css`; the font files in `static/fonts/` are gone. |
| `static/demo.png`          | New screenshot.                                                                                                                         |
| Removed                    | The Lens and Direct Query skills in `.claude/skills/` (listed in `CLAUDE.md`), which pointed coding agents at the old APIs.             |
| `LICENSE`                  | Apache License 2.0, for the code (the GHOST-IoT data isn't covered; see the README's Licence section).                                  |

## Results

Both versions scored the same 40 15-minute windows with the app's own prompts: all 20 windows in which any device is online, and 20 evenly spaced windows in which none is (the other 922). The `online` flag is withheld from the model, as in the app, and used as ground truth.

|                                                   | Direct Query        | Inference API       |
| ------------------------------------------------- | ------------------- | ------------------- |
| Windows with activity called OCCUPIED or LIKELY_OCCUPIED | 20/20        | 20/20               |
| Quiet windows called EMPTY or LIKELY_EMPTY        | 20/20               | 20/20               |
| Per-device online/offline correct                 | 358/360             | 360/360             |
| … in windows with activity                        | 178/180             | 180/180             |
| Occupancy call, `/api/analyze`                    | 0.5–2.1 s, median 1.6 s | 0.7–1.7 s, median 0.9 s |
| Per-device call, `/api/predict-devices`           | 2.3–5.1 s, median 3.6 s | 3.6–5.1 s, median 4.2 s |
| Failed requests                                   | 0/80                | 0/80                |

The two versions give the same occupancy verdict on 39 of the 40 windows; on the other they differ only in confidence (OCCUPIED against LIKELY_OCCUPIED).
