# Codex task: Challenges PR 1 — backend foundation

Implement the backend foundation described in `docs/challenges-mvp-spec.md` in a new branch and draft pull request.

## Scope

Create one new migration after migration 012, SQL tests, and TypeScript domain types. Do not add the navigation tab or any React challenge UI in this PR.

## Migration requirements

Create the following without rewriting existing live tables:

- challenges
- challenge_participants
- challenge_events
- activity_events
- challenge_reports
- a safe public challenge catalog view or security-definer query RPC

Use text checks or enums consistently for category, visibility, join mode, format, metric, mode, challenge status, participant status and result.

Add indexes needed for:

- open public catalog by category and creation date;
- registration deadline;
- active challenges by participant;
- challenge-event idempotency;
- activity-event lookup by user, type and time.

## Lifecycle operations

Implement transactional operations for:

- create challenge;
- join an instant public/link-only challenge;
- request to join an approval challenge;
- approve/reject a request;
- accept/decline an invitation;
- cancel before start;
- read public catalog with filters, sorting and pagination;
- read the authenticated user's challenge inbox/active/history lists;
- report a challenge.

Do not implement scoring from client data in this PR.

## Security

- Enable RLS on all new tables.
- Revoke unsafe direct writes.
- Users may see safe public catalog data and rows required for challenges they participate in.
- Only protected RPCs may create memberships or change lifecycle state.
- Only service-role paths may write activity events, challenge events, progress, rank, results and winners.
- Do not reveal raw Telegram IDs or unrelated private user fields.
- Validate creator ownership and all state transitions.
- Lock rows when filling the final participant slot to prevent overbooking.
- Limit open challenges per creator and active challenges per user using constants in the RPC implementation.

## Compatibility

The current schema uses `public.users(id uuid)`, `goal_logs`, `user_programs`, and `program_day_completions`. Do not assume that non-running program completions are server verified yet. Do not attach score-generating triggers to client-writable tables in this PR.

Never modify or rerun migrations 007–012.

## Tests

Add SQL tests covering at minimum:

- public catalog visibility;
- private/link-only access;
- creator auto-membership;
- self-join rejection for duels;
- duplicate join rejection;
- full challenge rejection;
- approval flow;
- invitation acceptance/decline;
- invalid status transitions;
- cancellation rules;
- RLS denial for direct progress/winner changes;
- concurrent/serialized last-slot behavior where feasible;
- reporting privacy;
- catalog category, search, duration and sort parameters.

Run typecheck, changed-file lint, existing Node tests, and SQL tests where the environment supports them. Report any test that cannot be executed.

## Deliverable

Open a draft PR targeting `main`. Include migration instructions for Diana, but do not merge and do not apply the migration to the live Supabase project.
