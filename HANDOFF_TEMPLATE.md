# Subagent Handoff Template

Every subagent or worktree task must produce a brief `HANDOFF.md` (or section in PR description) before integration into `main`:

```markdown
# Handoff — <Issue / Task Name>

- **Branch / Worktree:** `<branch-name>`
- **Owner:** `<role or agent>`
- **Linked Contract:** `UI_CONTRACT.md` (verified unchanged)

## Files Touched
- `path/to/file` — summary of change

## Exported Entry Points / Contracts
- List new or updated public components, functions, or types

## Database / Environment Changes
- Migrations added under `supabase/migrations/` (or `None`)
- Env vars referenced (must match `.env.example`, zero secrets committed)

## Zero-Mock & Verification Evidence
- Confirm real Supabase reads/writes (no silent mock fallbacks)
- Commands run and exact pass/fail output (`npm run typecheck`, `npm run build`, Playwright tests)

## Caveats & Next Steps
- Known limitations, edge cases, or follow-ups for integration
```
