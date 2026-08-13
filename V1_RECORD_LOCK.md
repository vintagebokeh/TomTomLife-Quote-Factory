# TomTomLife Quote Factory V1 — Record Lock

## Product responsibility

Quote Factory V1 is a **Knowledge-to-Voice Factory**:

`Source media → provenance/extraction → canonical text and meaning → script → voice → Production Package`

Its canonical output is a production-ready knowledge, script, and narration package for a future **TomTomLife Media Factory**. Quote Factory V1 does not own visual generation, motion, composition, mastering, music/SFX, typography animation, or publishing.

## Production Package handoff

The package is represented by the canonical `quote_jobs` record and contains:

- content ID; source filename/type/SHA-256 and durable provenance reference when available;
- clean text, core meaning, language, scripts, and selected voice-source snapshot/type;
- selected narration slot, server-owned WAV reference, duration, provider, model, and voice ID;
- processing timestamps, run counts, character accounting, and nullable cost fields.

There is no formal export endpoint or file yet. A downstream Media Factory must consume this documented contract without depending on original source pixels, frames, or audio as a creative input.

## Stage 5 record lock

- Provider/SDK: `google-gemini-api` via `@google/genai`
- Model: `gemini-2.5-flash-preview-tts`
- Female/Male voices: `Sulafat` / `Charon`
- Audio contract: Gemini Base64 `inlineData` PCM to server-owned 16-bit, 24 kHz mono WAV under `/audio/...`
- Voice failure, retry, source invalidation, duration, accounting, persistence, and diagnostics remain part of the V1 baseline.

## Build 8 classification

Build 8 is **R&D / PROVEN ARCHITECTURAL REFERENCE**, not canonical Quote Factory V1 responsibility. It preserves reusable Manus transport/lifecycle/validation evidence, local video handling, `production_assets` trusted persistence, the clean-room VisualBrief experiment, generated-keyframe proof, and FFmpeg composition foundation for a future Media Factory.

Build 8B's verified Manus video is a legacy R&D artifact. Build 8D's `QUOTE_CINEMATIC_V1` keyframe is a clean-room R&D proof; it used canonical production intent, not original source media, as creative conditioning.

## Security and artifact hygiene

Provider and server credentials remain server-side only. `production_assets` uses RLS with no public policies and is persisted via constrained server endpoints. Known debt remains: **SECURITY_DEBT: quote_jobs direct-browser persistence**.

Runtime `audio/`, `video/`, `source/`, and `production/` directories are Git-ignored. Runtime artifacts and secrets are not committed.

## Record lock rule

Future work beyond Knowledge-to-Voice belongs to TomTomLife Media Factory unless it is a genuine Quote Factory defect, maintenance, security fix, provider compatibility repair, data recovery, or documentation correction.
