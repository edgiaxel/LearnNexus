# LearnNexus: Team SibukTA STACK 2026 Semifinal Submission Checklist

> **Hard Deadline:** **30 November 2026, 23:59 WIB (UTC+7)**  
> **Official Rules Reference:** [`docs/STACK_2026.md`](./STACK_2026.md) (Semifinal Phase & Final Phase Preparation)

Complete every checklist item below in order before uploading the final STACK 2026 Semifinal deliverables.

---

## 1. Signed Declaration of Originality (Mandatory Appendix)

- [ ] Download the official STACK 2026 Declaration of Originality template from `https://s.id/DeclarationOfOriginalitySTACK2026`.
- [ ] Fill in exact team details (**Team SibukTA**, project title **LearnNexus**, **Case 1: Smarter Campus and Learning**, all 4 member names & university details).
- [ ] Obtain required signatures (wet or valid digital signature as specified by the committee) and export as a crisp PDF page ready to append at the end of the Proposal PDF.

---

## 2. Live Peer Usability Testing (`5-10` Students) & Proposal Backfill

- [x] Verify the live deployment URL ([https://learnnexus-nine.vercel.app](https://learnnexus-nine.vercel.app)) is reachable (`HTTP 200`, `Supabase connected`, multi-user Realtime & persistence smoke-tested) and seeded cleanly (`supabase/seed.sql`).
- [ ] Run the 5-minute protocol in [`docs/USABILITY_TEST_SHEET.md`](./USABILITY_TEST_SHEET.md) with **5 to 10 university students** (obtaining verbal consent, recording real pass/fail, timing, Likert ratings, and friction notes).
- [ ] Compute factual totals/averages and paste the filled summary into [`docs/PROPOSAL_SEMIFINAL.md`](./PROPOSAL_SEMIFINAL.md) Section 6, removing the `[PENDING REAL STUDENT USABILITY DATA — COLLECT WITH docs/USABILITY_TEST_SHEET.md]` placeholder.
- [ ] Verify zero fabricated scores, quotes, or sample sizes exist anywhere in the proposal.

---

## 3. Team Metadata, Roles & Phase 3 Metric Backfill

- [ ] Confirm and replace `[CONFIRM EXACT TEAM ROLE]` and `[CONFIRM CONTRIBUTION DETAILS]` for **Jonathan Lukas Wijaya**, **Deffa Kiane**, and **Khaerul Husnaen** in [`README.md`](../README.md) and [`docs/PROPOSAL_SEMIFINAL.md`](./PROPOSAL_SEMIFINAL.md).
- [x] Verify Orchestrator Phase 3 backfill has replaced all remaining markers across `README.md`, `docs/REPORT.md`, `docs/PROPOSAL_SEMIFINAL.md`, and `docs/USABILITY_TEST_SHEET.md`:
  - Live deployment URL: `https://learnnexus-nine.vercel.app`
  - Build bundle metrics: `99` modules (`index-D2WuUhG2.js` `158.67 kB`, `vendor-react` `223.19 kB`, `vendor-supabase` `230.52 kB`, lazy `PhaserHost` `33.08 kB` + `vendor-phaser` `1,478.65 kB`)
  - Final M4 verification: `typecheck` PASS, `17/17` unit, `4/4` RLS (`13` tables), `26/26` E2E (`2.9m`), live Vercel smoke PASS
  - Bug-fix log & screenshot gallery (`01-entry-gateway.png` .. `09-multiuser-realtime-split.png`) backfilled
- [ ] Confirm `docs/PROPOSAL_SEMIFINAL.md` and `README.md` include the **Material AI Assistance Disclosure** (Google Antigravity / Gemini coding models during development + explicit statement of **zero runtime AI features** in LearnNexus).
- [ ] Confirm LimeZu attribution uses **only** `https://limezu.itch.io/moderninteriors` alongside `assets/LICENSE.txt` (zero signed itch.io download tokens anywhere).

---

## 4. Proposal PDF Export & Page-Budget Check

- [ ] Format [`docs/PROPOSAL_SEMIFINAL.md`](./PROPOSAL_SEMIFINAL.md) onto **A4 paper** (`11-12 pt` readable font, `1.15` line spacing, `2.5 cm` margins, clean English prose).
- [ ] Render the Mermaid architecture diagram (`Section 4`) into a crisp vector/high-DPI PNG embedded cleanly without clipped labels.
- [ ] Embed verified application screenshots from `docs/evidence/screenshots/` with readable captions.
- [ ] Check page count: confirm main body content (**Sections 1 through 6**) is **10 pages or fewer** (`<= 10` A4 content pages; **Cover, Section 7 References/Declaration Disclosure, and Signed Declaration Appendix are excluded** per `docs/STACK_2026.md`).
- [ ] Merge/append the signed Declaration of Originality PDF as the final appendix and export the complete Proposal PDF (`SibukTA_LearnNexus_Semifinal_Proposal.pdf` or filename matching official submission instructions).

---

## 5. Semifinal Explanatory Video (`<= 2:00`, `>= 1080p`)

- [ ] Review raw automated captures created by the QA pipeline:
  - `recordings/take-a-single-user-core-crud-1080p.mp4` (Entry -> Academic Space -> 2D navigation -> Task/Overview/Resource persistence across reload)
  - `recordings/take-b-multi-user-splitscreen-1080p.mp4` (Split-screen Nadia + Bima live avatar sync, proximity ring, Studio Chat + speech bubble, and Team Whiteboard sync)
- [ ] Record a short **team introduction** (camera/audio introducing SibukTA, project name, and Case 1) and clean **English voiceover**.
- [ ] Edit into one cohesive video with readable **English subtitles** covering:
  1. Team & Case 1 problem context (`Donelan & Kear, 2024` fragmentation insight).
  2. Proposed Cozy Digital Campus solution & architecture highlight.
  3. Live walkthrough of `Take A` (durable student workflow) + `Take B` (multi-user realtime + whiteboard).
  4. Honest progress summary: what is **implemented & tested** vs what remains **planned** for Final Day / post-semifinal (`UI-08` Lecturer Studio, Multi-Zone Campus Portals `UI-10/11/12`, Deliverables `UI-09` + Storage).
- [ ] Check final video file compliance:
  - Duration strictly **`<= 2 minutes` (`<= 120 seconds`)**
  - Resolution **`>= 1080p` (`1920x1080`)**
  - Clear audio and readable English narration/subtitles
  - Published/submitted via the exact platform/link format required by GDGoC ITB (`Instagram Reel` / submission form instructions).

---

## 6. Security, Secrets & Demo Environment Hygiene

- [ ] Share `.env` values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) privately with all 4 teammates (Slack/WhatsApp DM/password manager), and **never** commit `.env` or paste keys into GitHub, PDFs, or slides.
- [ ] Confirm zero `service_role` keys exist in client code, `vercel.json`, Git history, or screenshots.
- [x] Confirm Vercel production deployment environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are set and live build passes cleanly.
- [ ] Re-run `supabase/seed.sql` before the judging window to guarantee clean starter rows (`Nadia`, `Bima`, `Rani`, 2 classes, 8 tasks, 6 resources, 2 starter whiteboard notes, 1 welcome chat message).

---

## 7. Final Smoke Test & Submission Receipt Archive

- [ ] Open [https://learnnexus-nine.vercel.app](https://learnnexus-nine.vercel.app) in a fresh incognito Chromium window for your own manual rehearsal and confirm:
  - Header reads `Supabase connected`
  - Demo login (`Nadia`) -> `IF-4031` -> 2D studio walks cleanly -> `[E]` opens drawer -> Task mutation persists across page reload -> Studio Chat & Whiteboard work -> `Rani` shows empty-state guard
- [ ] Confirm GitHub repository `https://github.com/edgiaxel/LearnNexus` is accessible and `main` CI badge is green.
- [ ] Submit Proposal PDF + Video link via the official STACK 2026 submission form well ahead of **30 November 2026, 23:59 WIB** (avoid uploading in the last 30 minutes).
- [ ] Save submission confirmation screenshots/receipts, exact submitted PDF, final rendered MP4, and the exact Git commit SHA in a shared team archive for evaluation and Final Day preparation.
