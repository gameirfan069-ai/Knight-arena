# Architecture: chess clone, core-loop slice

Built from `recon.md` and `features.csv`. This is a plain-version architecture, not the output of a `replica-architect` skill (not installed in this session).

**Scope (M):** accounts, live rated games with server clocks, matchmaking pools, ratings, game archive + PGN, basic Game Review, report/block. Daily games, bots and puzzles are phase 2. Everything marked `could`/`skip` in `features.csv` is out.

Items marked **[decision]** are my design choices, not facts about the original. Items marked **[verify]** need a check before you commit.

---

## 1. Stack [decision]

| layer | choice | why |
|---|---|---|
| language | TypeScript everywhere | shared move/rules types between client and server |
| web client | React + Vite, own SVG/canvas board | you must not reuse the original's art anyway |
| realtime | WebSocket (one socket per client) | clocks, moves, matchmaking events |
| API | Node (Fastify) REST for non-realtime | accounts, archive, profiles |
| DB | Postgres | users, games, ratings, reports |
| ephemeral state | Redis | seek pools, presence, game-node routing, timers backup |
| jobs | BullMQ (Redis) | review analysis, rating refunds |
| rules engine | `chess.js` (BSD-2) on server and client | legal moves, result detection, PGN/SAN [verify license at install] |
| analysis engine | Stockfish as a separate server-side process | see licensing flag below |
| hosting | one region first; containers | add regions only after the core loop works |

**Licensing flag [verify]:** Stockfish is GPL-3. Running it on your server is not distribution, but shipping a WASM build to browsers is. Pick server-side only for the MVP, and get a lawyer's read before shipping it to clients.

---

## 2. Data model (Postgres)

From `recon.md` section 6, trimmed to the slice.

```sql
create table users (
  id            bigint generated always as identity primary key,
  username      citext unique not null,
  email         citext unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now(),
  country       text,
  tier          text not null default 'free',      -- free|gold|platinum|diamond (names are yours to choose)
  status        text not null default 'open'       -- open|closed_fair_play|closed_other
);

create table ratings (
  user_id     bigint references users,
  time_class  text not null,                        -- bullet|blitz|rapid
  value       real not null default 1500,
  deviation   real not null default 350,            -- Glicko-2 [decision]
  volatility  real not null default 0.06,
  games       int  not null default 0,
  primary key (user_id, time_class)
);

create table games (
  id            bigint generated always as identity primary key,
  white_id      bigint references users not null,
  black_id      bigint references users not null,
  base_ms       int not null,                       -- initial time
  inc_ms        int not null,                       -- increment
  time_class    text not null,
  rated         boolean not null,
  started_at    timestamptz not null,
  ended_at      timestamptz,
  result        text,                               -- 1-0|0-1|1/2-1/2
  termination   text,                               -- mate|resign|timeout|stalemate|agreement|abandon|abort|...
  pgn           text,                               -- full movetext incl. %clk
  white_rating_before real, black_rating_before real,
  white_rating_after  real, black_rating_after  real
);
create index on games (white_id, started_at desc);
create index on games (black_id, started_at desc);

create table moves (                                -- optional; PGN is the source of truth
  game_id bigint references games, ply int, san text, clock_after_ms int,
  primary key (game_id, ply)
);

create table reviews (
  game_id bigint primary key references games,
  tier text not null,                               -- summary|full
  engine text, depth int,
  accuracy_white real, accuracy_black real,
  est_rating_white int, est_rating_black int,
  classifications jsonb,                            -- per ply
  eval_series jsonb,                                -- per ply centipawns / mate
  created_at timestamptz default now()
);

create table friendships (a bigint, b bigint, status text, primary key (a,b));
create table blocks      (user_id bigint, blocked_id bigint, primary key (user_id, blocked_id));

create table reports (
  id bigint generated always as identity primary key,
  reporter_id bigint references users, target_id bigint references users,
  game_id bigint references games,
  reason text not null, body text, queue text not null,   -- abuse|fair_play
  status text not null default 'open', created_at timestamptz default now()
);

create table rating_refunds (
  id bigint generated always as identity primary key,
  victim_id bigint references users, game_id bigint references games,
  points real not null, cause_user_id bigint references users, created_at timestamptz default now()
);
```

Phase 2 tables (not built now): `seeks` (daily), `puzzles`, `puzzle_attempts`, `clubs`, `club_members`, `tournaments`, `tournament_entries`, `pairings`, `messages`, `bots`.

PGN is the archive source of truth; `moves` is a convenience index. Drop it if it earns nothing.

---

## 3. Realtime and clocks (the hard part)

**Rule: the server owns time.** The client clock is a display only.

### Game actor
- One in-memory **game actor** per live game, living on exactly one node. Redis key `game:{id}:node` routes sockets to it.
- Actor state: position (FEN + move list), `white_ms`, `black_ms`, `side_to_move`, `turn_started_at` (monotonic server time), `last_move_ack`, draw-offer state.
- Snapshot to Redis after every move so a crashed node's games can be rebuilt on another node.

### Move handling
1. Client sends `{type:"move", gameId, san|uci, clientSeq}`.
2. Actor stamps receipt time `t_recv`.
3. Elapsed = `t_recv - turn_started_at`. Subtract **lag credit** `min(measured_rtt/2, 150ms)` [decision; tune with real data]. Deduct from mover's clock, add increment.
4. Validate legality with the rules engine. Reject illegal moves; never trust the client.
5. If the mover's clock hit 0 before `t_recv`, the game is already lost on time; ignore the move.
6. Broadcast `{move, white_ms, black_ms, serverTime}` to both players and spectators.

### Timeouts
- Actor sets one timer for the side to move: fires at `turn_started_at + remaining`. On move, cancel and reset.
- Backup: Redis sorted set `deadlines` scored by deadline epoch ms, swept every 250ms by a reaper. Covers actor crashes.

### Client display
- Client interpolates the running clock from `serverTime` plus local monotonic time. Resync on every server message.
- **Premoves** are queued client-side and sent immediately after the opponent's move arrives. Server treats them as normal moves, so they get no special privilege.

### Disconnects
- Clock keeps running. Reconnect within the game's remaining time restores state via snapshot.
- **Abandon rule [decision]:** if a player is disconnected and has made no move for 60s of their own clock time, offer the opponent a claim-win button. Original's exact rule is **[verify]**.

### Abort / draw / resign
- Abort allowed only before each side has moved once [decision, standard convention].
- Draw offers: one live offer per player at a time; auto-decline on next move.
- Draw by threefold repetition, fifty-move, insufficient material: let the rules engine detect; server decides the result, not the client.

---

## 4. Matchmaking

- A **seek** = `{userId, baseMs, incMs, rated, colorPref, ratingWindow}`.
- Pools keyed `pool:{time_class}:{baseMs}:{incMs}:{rated}` as Redis sorted sets scored by rating.
- On Start Game: look for a compatible seek within ±`window`; if found, atomically (Lua script) remove both and create a game. Else insert and wait.
- **Window expands** over wait time (e.g. ±50 at 0s, growing to ±300 by 20s) [decision, tune later].
- Never match a player with someone they blocked or with themselves; avoid immediate repeats of the same opponent [decision].
- Cancel on socket close or explicit cancel.
- **Sparse pools:** custom time controls may never match. Show a warning at selection (the original does). For launch, **seed thin pools with bots** and label them honestly.

---

## 5. Ratings

- **Glicko-2 [decision]**; the original's exact formula is not confirmed in the sources I read.
- Update both ratings inside the game-end transaction: write `games.*_rating_after`, `ratings`, and the game result together or not at all.
- Rating period handling: apply per game with the standard single-game update; fine for MVP.
- Provisional display while deviation is high.

---

## 6. Game Review pipeline

```
game ends -> job "review:summary" (fast, low depth) -> reviews(tier=summary)
user presses Game Review -> if allowed by tier -> job "review:full" (deeper) -> reviews(tier=full)
```

- Worker pool runs Stockfish processes, one position per UCI call, `go depth N` or `go movetime`.
- **Quota [decision]:** free tier gets the summary and a small number of full reviews per period; paid tiers unlimited. This mirrors the original's business model; numbers are yours to choose.
- **Move classification:** compute win-probability from eval (a logistic on centipawns) and classify by win-probability loss thresholds. Names and icons are yours; **do not copy their classification glyphs** (their API notice protects them).
- **Accuracy:** your own formula from average win-probability loss. Don't present it as comparable to any other site's number.
- **Estimated game rating:** map accuracy and average loss to a rating curve you calibrate from your own games. Needs real data, so ship without it first.
- Cache by `(fen, depth)` so repeated positions across games are free.

---

## 7. Safety and fair play (MVP)

- Report modal writes `reports` with `queue = abuse | fair_play`.
- Block: hides chat and prevents challenges and matchmaking pairs.
- Fair play MVP = **report + manual admin review**; statistical detection is phase 2.
- Admin action "close account (fair play)" sets `users.status` and enqueues a refund job.
- **Refund job:** for each game the cheater played (up to the last 100, within a window you choose), return the victim's lost points via `rating_refunds` and a ratings adjustment. Notify victim.
- Rate-limit reports per user; punish bad-faith report spam (the original does).

---

## 8. API surface

REST (JSON):
```
POST /auth/signup  POST /auth/login  POST /auth/logout
GET  /users/:username
GET  /users/:username/games?cursor=
GET  /games/:id            GET /games/:id/pgn
POST /games/:id/review     GET /games/:id/review
POST /reports              POST /blocks   DELETE /blocks/:id
GET  /me  PATCH /me/settings
```

WebSocket messages (client to server): `seek`, `cancel_seek`, `move`, `resign`, `offer_draw`, `accept_draw`, `decline_draw`, `abort`, `rematch`, `chat`, `claim_abandon`.
Server to client: `matched`, `game_state`, `move`, `clock`, `draw_offer`, `game_over`, `rating_update`, `chat`, `opponent_status`.

---

## 9. Frontend map (from recon screens)

| recon screen | page/route |
|---|---|
| S03 Home | `/` |
| S04 Play Online | `/play` (time-control picker, Start Game) |
| S06 Seeking | overlay on `/play` |
| S07 Live game | `/game/:id` |
| S08 Game over | modal on `/game/:id` |
| S12 Game Review | `/game/:id/review` |
| S20 Profile | `/u/:username` |
| S22 Archive | `/u/:username/games` |
| S30 Settings | `/settings` |
| S32 Report | modal |

**UX target:** from any page, Start Game must stay at **3 actions or fewer**, with a default time control pre-selected (the number to beat from recon).

---

## 10. Build order

| milestone | content | exit test |
|---|---|---|
| M0 | repo, CI, Postgres/Redis, auth, profile | sign up and log in |
| M1 | board UI, rules engine, local two-player move validation | play a full game on one screen |
| M2 | WebSocket game actor, server clocks, two browsers | two browsers finish a game with correct clocks |
| M3 | seeks, pools, matchmaking | two strangers pair from Start Game |
| M4 | Glicko-2, rating display, archive, PGN export | ratings change correctly after games |
| M5 | disconnect/abandon, draw/resign/abort, premoves | scripted edge-case suite passes |
| M6 | review: summary + full, classification, eval graph | review matches Stockfish output on fixture games |
| M7 | report/block, admin queue, refunds | cheater closure refunds victims in a test |
| M8 | load test, tune lag credit and windows | target concurrency holds (set your own target) |

---

## 11. Testing

- **Rules:** perft tests and fixture PGNs against the rules library.
- **Clocks:** deterministic simulator with injected latency, jitter and drops; assert no clock goes negative wrongly and timeouts fire within a tolerance (e.g. 100ms).
- **Matchmaking:** property tests: no self-pairs, no blocked pairs, each seek matched at most once.
- **Ratings:** compare your Glicko-2 implementation to the published worked example in the paper.
- **Reconnect:** kill a node mid-game, verify recovery from Redis snapshot.

---

## 12. Risks

1. **Clock fairness at bullet speeds.** Lag credit too generous is exploitable; too stingy feels unfair. Needs real telemetry.
2. **Cold start.** No players means no pool. Bots, scheduled events, and a narrow niche audience are product problems code won't fix.
3. **Cheating.** Engine-assisted play appears as soon as there are ratings. Budget for it early.
4. **Analysis cost.** Engine compute scales with games; the quota exists for a reason.
5. **IP.** Don't reuse the original's palettes, piece art, sounds or icons. Use your own, or openly licensed assets with the license checked.
6. **Terms.** The original's user agreement wasn't read during recon (see `recon.md`).

---

## 13. Open decisions for you

- Target audience (a niche changes the pool problem and the content).
- Time controls at launch (suggest 3|0, 5|0, 10|0, plus one bullet).
- Free vs paid line for review depth.
- Anonymous guest play or accounts only.
- Where to host and the concurrency you want to survive.
