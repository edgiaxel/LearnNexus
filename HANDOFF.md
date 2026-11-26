# Handoff — M4 Quality Freeze & M5 Release Readiness

- **Branch / Worktree:** `main` (single clean worktree; merged `feature/m4-m5-qa-evidence` and `feature/m5-docs-proposal-pack` via `--no-ff`; temporary worktrees and feature branches removed)
- **Owner:** Main Orchestrator (with 2 isolated `wt` lanes: `QA` and `DOC`)
- **Live Production URL:** `https://learnnexus-nine.vercel.app` (`zeenity/learnnexus`)
- **Linked Contract:** `UI_CONTRACT.md` (Locked M0–M5 contracts on `main`)
- **Date:** 26 November 2026

## Completed Scope & Exit Criteria

- **Bundle Splitting, Hygiene, CI & License (Phase 1 on `main`):**
  - Split Rollup output into deterministic cacheable chunks (`vite.config.ts`) and lazy-loaded `PhaserHost` behind `<Suspense>` (`src/app/App.tsx`), deferring `1,511.73 kB` raw (`347.75 kB` gzip) of Phaser engine/scene JS until entering the 2D Studio (`0` Phaser requests on Entry Gateway & Academic Spaces).
  - Restored root `LICENSE` (Apache License 2.0 for LearnNexus code, carving out LimeZu sprites strictly to `assets/LICENSE.txt` non-commercial scope), added `vercel.json` (SPA rewrites + HTTP security headers), added `.github/workflows/ci.yml` (`npm ci`, `typecheck`, `test:unit`, `build`), replaced `src/styles/index.css:1` em dash with `:`, and added `recordings/` and `.vercel` to `.gitignore`.
- **M4 Quality Audit, Curated Screenshots & Raw `1080p` Demo Captures:**
  - `tests/e2e/m4-quality-audit.spec.ts` verifies lazy Phaser chunk isolation, client bundle chunk split + zero secrets, two-way live Studio Chat + avatar bubbles (`Nadia` <-> `Bima`), `Tab`/`Enter`/`Escape` keyboard/focus/cursor navigation, and zero horizontal overflow / antislop regressions across `1280x720`, `1024x700`, and `390x844`.
  - `scripts/capture-evidence.mjs` generated all `9` curated PNG screenshots in `docs/evidence/screenshots/` (`01-entry-gateway.png` through `09-multiuser-realtime-split.png`).
  - `scripts/record-demo.mjs` generated gitignored unedited `1920x1080` 30fps H.264 recordings (`recordings/take-a-single-user-core-crud-1080p.mp4` `62.87s` / `3.39 MB`, `recordings/take-b-multi-user-splitscreen-1080p.mp4` `75.73s` / `4.22 MB`).
- **M5 Documentation Pack & Vercel Setup/Deploy:**
  - Authored/updated onboarding `README.md` (Material AI Assistance Disclosure + glossary, teammate setup/PR tutorial, demo reset runbook, LimeZu public credit), `docs/REPORT.md`, `docs/PROPOSAL_SEMIFINAL.md` (formatted for `<= 10` A4 content pages, preserving `[PENDING REAL STUDENT USABILITY DATA]` anti-fabrication guard), `docs/USABILITY_TEST_SHEET.md`, and `docs/TEAM_SUBMISSION_CHECKLIST.md`.
  - Configured Vercel CLI (`67.0.0`, `xgv1807-4213`), installed global `vercel-labs/agent-skills`, added `https://mcp.vercel.com` MCP server config (`~/.gemini/config/mcp_config.json` & T3 Antigravity `mcp_config.json`), linked `zeenity/learnnexus`, pushed `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`, deployed `https://learnnexus-nine.vercel.app`, smoke-tested live two-browser sync (`HTTP 200`, `0` console errors), and cleaned temporary test chat rows.

## Verified Commands & Results

- `npm run typecheck` (`tsc --noEmit`): **PASS** (exit `0`)
- `npm run test:unit` (`node --test tests/unit/m3-guards.test.ts tests/unit/m6-m9-guards.test.ts`): **PASS** (`17/17` tests across `8` suites)
- `npm run test:rls` (`node tests/rls/verify-rls.mjs`): **PASS** (`4/4` actors across all `13` tables; re-verified after smoke cleanup)
- `npm run build` (`tsc --noEmit && vite build`): **PASS** (`99` modules; `index-D2WuUhG2.js` `158.67 kB`, `index-FeizwK2V.css` `50.77 kB`, `vendor-react-PY8vvcCh.js` `223.19 kB`, `vendor-supabase-B9O_2iRq.js` `230.52 kB`, lazy `PhaserHost-CM4XjDcy.js` `33.08 kB`, lazy `vendor-phaser-DNvWzekM.js` `1,478.65 kB`)
- `npx playwright test --reporter=list`: **PASS** (`26/26` tests in `2.9m`, `0` failed, `0` skipped)
- Live Vercel Production Smoke Test (`https://learnnexus-nine.vercel.app`): **PASS** (`HTTP 200 OK`, `0` pre-studio Phaser requests, sharp Config A studio, two-context `Live sync` & two-way chat, `0` console errors)

## Remaining Team Actions Before 30 November 2026, 23:59 WIB

Tracked step-by-step in `docs/TEAM_SUBMISSION_CHECKLIST.md`:
1. Sign official Declaration of Originality (`https://s.id/DeclarationOfOriginalitySTACK2026`) by all 4 members.
2. Run 5–10 real peer usability tests (`docs/USABILITY_TEST_SHEET.md`) and replace Section 6 placeholder in `docs/PROPOSAL_SEMIFINAL.md` with factual measured results.
3. Fill exact teammate roles (`[CONFIRM EXACT TEAM ROLE]` / `[CONFIRM CONTRIBUTION DETAILS]`) in `README.md` & `docs/PROPOSAL_SEMIFINAL.md`, and export `<= 10`-page A4 Proposal PDF with Declaration appendix.
4. Combine raw `recordings/take-a-*.mp4` + `recordings/take-b-*.mp4` with team intro/voiceover & English subtitles (`<= 2:00`, `>= 1080p`).
5. Share `.env` privately with teammates, verify Vercel URL/seed state (`supabase/seed.sql`), and submit deliverables before deadline.
