# Challenges MVP specification

## Product structure

The new bottom-navigation section is `Соревнования` with three internal tabs:

- `Обзор` — public challenge catalog with categories, search, filters and sorting.
- `Мои` — invitations, joined challenges, active challenges and history.
- `Создать` — create public, link-only or private challenges.

The first production version supports verified 1v1 challenges. The database must be extensible to group and cooperative formats, but those formats are not exposed in the first UI.

## MVP challenge metrics

Only automatically verifiable metrics are allowed:

- `goals_completed`
- `program_days_completed`

Modes:

- `highest_score`
- `first_to_target`

Durations:

- 1 day
- 3 days
- 7 days

Categories:

- `fitness`
- `running`
- `sleep`
- `reading`
- `goals`
- `programs`

Visibility:

- `public`
- `link_only`
- `private`

Join modes:

- `instant`
- `approval`
- `invite_only`

## Public catalog

The catalog must expose safe public data only. It supports:

- category filtering;
- search by title and creator username;
- format and duration filters;
- available-place filter;
- sorting by newest, popular, starting soon and recommended;
- pagination;
- excluding expired, cancelled, completed and full challenges by default.

Raw Telegram IDs, phone numbers and private profile fields must never be returned by the catalog query.

## Backend tables

### challenges

- `id uuid primary key`
- `created_by uuid not null references users(id)`
- `title text not null`
- `description text`
- `category text not null`
- `visibility text not null`
- `join_mode text not null`
- `challenge_format text not null default 'duel'`
- `metric_type text not null`
- `mode text not null`
- `target_value integer`
- `duration_days integer not null`
- `max_participants integer not null default 2`
- `status text not null default 'open'`
- `starts_at timestamptz`
- `ends_at timestamptz`
- `registration_ends_at timestamptz`
- `winner_user_id uuid references users(id)`
- timestamps

### challenge_participants

- `challenge_id uuid references challenges(id)`
- `user_id uuid references users(id)`
- `role text`
- `status text`
- `progress integer not null default 0`
- `rank integer`
- `result text`
- timestamps
- unique `(challenge_id, user_id)`

### challenge_events

- `id uuid primary key`
- `challenge_id uuid references challenges(id)`
- `user_id uuid references users(id)`
- `event_type text not null`
- `source_id text not null`
- `value integer not null default 1`
- `created_at timestamptz not null default now()`
- unique `(challenge_id, user_id, event_type, source_id)`

### activity_events

Canonical verified activity ledger:

- `id uuid primary key`
- `user_id uuid references users(id)`
- `event_type text not null`
- `source_table text not null`
- `source_id text not null`
- `value integer not null default 1`
- `occurred_at timestamptz not null default now()`
- `idempotency_key text not null unique`
- metadata jsonb

### challenge_reports

- reporter, challenge, reason, status and timestamps;
- one open report per reporter and challenge;
- no public read access.

## Security requirements

- RLS enabled on every new table.
- Clients may read the safe catalog view and their own challenge memberships.
- Clients must not update progress, rank, winner, result, dates or reward fields.
- Challenge creation and joining go through validated RPC/API operations.
- Progress changes are service-role-only and idempotent.
- A user cannot join their own duel as opponent.
- Limit open challenges per creator and active challenges per user.
- Public profile data is returned through a restricted view.
- All state changes validate allowed status transitions.

## Required RPC/API operations

- create challenge
- join challenge
- approve or reject join request
- accept or decline direct invitation
- cancel an open challenge before it starts
- list public catalog with filters, sorting and cursor pagination
- list current user's invitations, active challenges and history
- apply verified activity to active challenges
- finalize expired challenges and calculate winner/draw
- report challenge

## Existing architecture constraint

Current goal completion and fitness/sleep/reading program completion still mutate Supabase directly from the client. They cannot be trusted as competition evidence yet.

Implementation must therefore be split:

1. Backend schema, RLS, safe catalog and lifecycle RPCs.
2. Move every scored goal/program completion to server-side atomic operations and write `activity_events` transactionally.
3. Challenge engine consumes only verified `activity_events`.
4. UI and Telegram notifications.

No challenge score may be calculated from client-provided progress values.

## PR sequence

### PR 1 — backend foundation

- tables, constraints and indexes;
- safe public catalog view;
- RLS and grants;
- create/join/invite/cancel lifecycle RPCs;
- catalog query RPC;
- SQL tests;
- TypeScript challenge domain types;
- no navigation or UI changes.

### PR 2 — verified activity and scoring

- atomic server-side goal completion;
- atomic completion for all four programs;
- canonical activity ledger;
- challenge progress engine;
- idempotency and concurrency tests;
- winner/draw finalization.

### PR 3 — UI

- replace bottom `Статистика` tab with `Соревнования`;
- move statistics into profile or dashboard;
- `Обзор`, `Мои`, `Создать`;
- categories, filters, sorting and search;
- challenge details and join/invite flows.

### PR 4 — Telegram notifications and moderation

- invitations and deep links;
- accepted/declined notifications;
- lead-change and ending reminders;
- result notifications;
- reports, blocking and rate limits.

## Acceptance criteria for PR 1

- clean-install migration passes;
- migration is safe against the current live schema assumptions;
- all new tables have tested RLS;
- public catalog reveals only approved public fields;
- duplicate joins and duplicate participants are impossible;
- invalid state transitions are rejected;
- concurrent last-slot joins cannot overfill a challenge;
- direct client progress updates are denied;
- SQL tests cover public, private, link-only and invite-only access;
- TypeScript typecheck and existing tests pass;
- no existing goals, programs, XP or fitness behavior changes.
