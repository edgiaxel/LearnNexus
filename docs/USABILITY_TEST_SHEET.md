# LearnNexus: 5-Minute Peer Usability Test Sheet

> **Purpose:** Collect primary student validation with 5-10 university classmates before the STACK 2026 semifinal deadline (`30 November 2026, 23:59 WIB`) and report real measured results honestly in `docs/PROPOSAL_SEMIFINAL.md` Section 6.
> **Target Demo URL:** [https://learnnexus-nine.vercel.app](https://learnnexus-nine.vercel.app)

---

## 1. Facilitator Setup (Before Starting)

1. Open two desktop/laptop browser windows side-by-side (or test on the participant's laptop + facilitator's laptop) pointing to [https://learnnexus-nine.vercel.app](https://learnnexus-nine.vercel.app).
2. Ensure seeded data is clean (`supabase/seed.sql` applied if needed) and verify the header badge reads **Supabase connected**.
3. **Demo Accounts for Testing:**
   - **Participant Window (Main Flow):** `nadia.demo@learnnexus.edu` (`Nadia Pratama (Demo)`, Team Lead) via **Enter Campus as Demo** on `UI-01`.
   - **Paired Live Sync Window (Facilitator for T4):** `bima.demo@learnnexus.edu` (`Bima Santoso (Demo)`, Team Member) via **Enter Campus as Demo**.
   - **Boundary Check Account (Optional T5):** `rani.demo@learnnexus.edu` (`Rani Kusuma (Demo)`, Unassigned Guest Demo).
4. Keep a stopwatch/timer ready and record observations using participant IDs (`P1`, `P2`, ...) rather than full names or personal contact details.

---

## 2. Briefing & Verbal Consent Script (~30 Seconds)

Read aloud before starting Task 1:

> "Thank you for helping us test **LearnNexus**, a 2D virtual campus prototype for university group projects. This takes about 5 minutes. We are testing the interface and workflow, not testing you, so you cannot make a wrong move. Please think out loud about anything that feels confusing, slow, or unclear. With your verbal consent, I will record whether each task succeeds, how long it takes, and short anonymous notes (`P1`, `P2`, etc.) for our STACK 2026 semifinal report. Do you consent to participate?"

- Verbal consent confirmed? `[ ] Yes` `[ ] No` (Stop if No)

---

## 3. Structured 5-Minute Tasks (`T1`-`T5`)

Do not guide the participant unless they are completely stuck after ~45 seconds (mark **Fail** or **Pass with Assist** if help was required).

| ID | Task Prompt Given to Student | Expected Outcome & Observation Criteria |
|---|---|---|
| **T1** | "Start on the login screen, enter using **Nadia Pratama (Demo)**, and open the **IF-4031 Software Engineering Studio** workspace." | Selects Nadia Demo profile on `UI-01`, sees `IF-4031` and `IF-3210` on `UI-02`, clicks **Enter Studio**, and loads the 2D campus studio (`UI-03/04`). |
| **T2** | "Walk your character around the room using `WASD` or Arrow keys and open any workstation panel." | Navigates cleanly around furniture collisions, notices floating `[E] Open ...` prompt, presses `E` (or clicks prompt), and opens the contextual right drawer without resetting avatar position. |
| **T3** | "Open **Sprint Tasks**, create a new task or change a task status, then refresh the browser page and check if your change is still there." | Opens `UI-06`, mutates Postgres data, waits for saved confirmation, reloads page (`F5` / refresh), returns to `Sprint Tasks`, and confirms change persisted. |
| **T4** | "Look at the live collaboration bar while your teammate (Bima) moves in the room, send a studio chat message, and add a sticky note or sketch on the **Team Whiteboard**." | Sees Bima's live avatar/roster (`Live sync`), sends message in Studio Chat (`room_messages`), sees floating avatar speech bubble, opens `UI-08b` Team Whiteboard, adds a note or stroke, and sees live sync with facilitator window. |
| **T5** | "Open **Resource Library** to verify a safe external link, OR sign out and enter as **Rani Kusuma (Demo)** to see what an unassigned student sees." | Verifies safe HTTPS link handling in `UI-07` or observes honest empty state (`No academic spaces assigned yet`) and RLS boundary isolation for Rani. |

---

## 4. Quantitative Recording Table

Fill one block per participant (`P1` through `P10`).

| Participant ID | Device / Browser | Consent (`Y/N`) | T1 (`Pass/Fail` + sec) | T2 (`Pass/Fail` + sec) | T3 (`Pass/Fail` + sec) | T4 (`Pass/Fail` + sec) | T5 (`Pass/Fail` + sec) | Friction Notes / Observed Confusion |
|---|---|---|---|---|---|---|---|---|
| `P1` | | | | | | | | |
| `P2` | | | | | | | | |
| `P3` | | | | | | | | |
| `P4` | | | | | | | | |
| `P5` | | | | | | | | |
| `P6` | | | | | | | | |
| `P7` | | | | | | | | |
| `P8` | | | | | | | | |
| `P9` | | | | | | | | |
| `P10` | | | | | | | | |

---

## 5. Post-Test Questions (1 Minute)

### Quick 1-5 Likert Ratings (`1 = Strongly Disagree`, `5 = Strongly Agree`)

| Question | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Q1.** Entering my course and finding my team workspace felt clear and intuitive. | | | | | | | | | | | |
| **Q2.** Moving around the 2D studio and opening workstations (`[E]`) felt responsive and easy to discover. | | | | | | | | | | | |
| **Q3.** I trusted that my task/whiteboard changes were genuinely saved across reloads. | | | | | | | | | | | |
| **Q4.** Seeing live teammates, studio chat, and shared project tools together would help my real group projects. | | | | | | | | | | | |

### Open-Ended Feedback

1. **What felt most useful or memorable compared to your usual tools (WhatsApp/Discord + Google Drive + Trello)?**
   - `P1–P10 notes:`
2. **What single thing felt confusing, missing, or hardest to figure out?**
   - `P1–P10 notes:`

---

## 6. Ready-to-Paste Summary Template for `docs/PROPOSAL_SEMIFINAL.md` Section 6

After completing 5-10 tests, compute real counts/averages from Sections 4-5 above (never estimate or round up unverified numbers) and paste the filled block into `docs/PROPOSAL_SEMIFINAL.md` Section 6:

```markdown
### Primary Student Usability Validation Summary

- **Test Window & Sample:** Conducted `<DD Nov 2026>` with `N = <X>` active Indonesian university students (`P1`–`P<X>`) on desktop/laptop browsers against the live deployment (`[LIVE_VERCEL_URL]`) following the 5-minute protocol in `docs/USABILITY_TEST_SHEET.md`.
- **Task Completion & Timing:**
  - **T1 (Entry -> Academic Space):** `<pass>/<N>` passed; median `<sec>s`
  - **T2 (2D Navigation & `[E]` Workstation):** `<pass>/<N>` passed; median `<sec>s`
  - **T3 (Sprint Task CRUD & Reload Persistence):** `<pass>/<N>` passed; median `<sec>s`
  - **T4 (Live Multi-User Sync, Studio Chat & Whiteboard):** `<pass>/<N>` passed; median `<sec>s`
  - **T5 (Resource Link Safety / Rani Boundary Check):** `<pass>/<N>` passed; median `<sec>s`
- **Likert Ratings (1-5 Scale):**
  - Clarity of space-to-workspace entry (**Q1**): `<mean>/5.0`
  - Spatial navigation & workstation discoverability (**Q2**): `<mean>/5.0`
  - Trust in cross-reload data persistence (**Q3**): `<mean>/5.0`
  - Perceived usefulness for university group projects (**Q4**): `<mean>/5.0`
- **Qualitative Themes & Actionable Takeaways:**
  - Positive feedback: `<summarize 1-2 real verified themes without fabricating quotes>`
  - Friction observed: `<summarize 1-2 real friction points and whether fixed in M4/M5 or queued for Final Day>`
```
