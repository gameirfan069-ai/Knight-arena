# Recon map: Chess.com (web)

Date: 2026-10-20
Platform: web (iOS/Android noted only where they differ)
Slice (assumed, change it if wrong): **the core loop = play a live rated game against a human, then review it.** Everything else is mapped but marked by priority.
Audience: not stated. Treated as "a niche chess product".

> Method: clean-room. Public sources only (help center, public article pages, app store listings, public API docs). No account was used, no pages were scraped, no JS or network traffic was inspected.
> **`replica/screens/` is empty.** No screenshots were captured. Every screen below is reconstructed from help-center text, so "states" are marked *documented* (a source mentions it) or *to verify* (standard for this kind of screen, no source seen). Walk the real flows with your own account to fill the gaps.
> **Terms not yet checked.** The app store listing links the Chess.com user agreement (https://www.chess.com/legal/user-agreement). I did not read it. Read it before using your own account for recon.

---

## 1. Sources

| source | URL | what it gave |
|---|---|---|
| Help center: Getting Started (28 articles) | https://support.chess.com/en/collections/13178346-getting-started | full list of play settings and board features |
| Help: How do I start a game | https://support.chess.com/en/articles/8609779-how-do-i-start-a-game | Play menu, Start Game, Custom Challenge |
| Help: How do time controls work | https://support.chess.com/en/articles/8584509-how-do-time-controls-work-on-chess-com | `X \| Y` format, custom controls, Daily differs |
| Time controls glossary | https://www.chess.com/terms/chess-time-controls | bullet/blitz/rapid bands, pool matchmaking |
| Help: Analysis & Game Review (20 articles) | https://support.chess.com/en/collections/13175943-analysis-game-review | Game Review, Cloud Analysis, Explorer, tablebase, collections |
| Help: How does Game Review work | https://support.chess.com/en/articles/8584089-how-does-game-review-work | post-game flow, premium gating |
| Help: Clubs (18 articles) | https://support.chess.com/en/collections/13177286-clubs | roles, chat, forums, matches, leagues |
| Help: Create a tournament | https://support.chess.com/en/articles/8609296-how-can-i-create-a-live-blitz-bullet-rapid-tournament | Swiss, Arena, club vs shareable |
| Help: Multi-Club Arena | https://support.chess.com/en/articles/8724653-how-can-i-create-a-multi-club-arena | club-vs-club scoring |
| Help: Reporting | https://support.chess.com/en/articles/8562517-how-do-i-report-someone | report/block flow |
| Help: Fair play | https://support.chess.com/en/articles/8568369-what-do-i-need-to-know-about-fair-play-on-chess-com | detection, no-warning policy |
| Help: Cheating consequences | https://support.chess.com/en/articles/8588324-what-happens-when-someone-is-caught-cheating | closed accounts, rating refunds |
| Help: Premium plans | https://support.chess.com/en/articles/8562418-what-does-each-level-of-membership-get-me | Free / Gold / Platinum / Diamond, Friends & Family plan |
| Help: Sept 2022 plan changes | https://support.chess.com/en/articles/8609584-september-1st-plan-changes | which features are gated at which tier |
| Features guide | https://www.chess.com/article/view/chesscom-features | variants, odds chess, lessons, TV, news, player bios |
| Public API docs (PubAPI) | https://support.chess.com/en/articles/9650547-published-data-api | read-only JSON-LD, public data only, IP clause |
| App Store listing | https://apps.apple.com/app/chess-play-learn/id329218549 | pitch, feature categories, bots, puzzles |
| Android release notes (APKMirror) | https://www.apkmirror.com/apk/chess-com/chess-play-learn | release cadence, Game Review rating estimate |

Pricing figures differ between third-party pages and are dated (e.g. 2022 vs 2023 vs 2026 blogs). Not recorded here. Take them from https://www.chess.com/membership when you need them.

## 2. Core loop (their words, trimmed)

Open Play, press Start Game, get paired from a pool of players who picked the same time control, play a timed game, press Game Review, get an accuracy score, an estimated game rating and move classifications. Free users get a limited review; Premium unlocks unlimited review and deeper analysis. That gate is the business model.

Click count, happy path from any page: hover **Play** in the left menu, click **Play**, click **Start Game** = **3 actions** (the default time control is pre-selected). Number to beat.

## 3. Screen inventory

| ID | screen | how you get there | purpose | key components | states |
|---|---|---|---|---|---|
| S01 | Landing (logged out) | chess.com | pitch, sign-up | hero, CTA, feature blocks | documented: guests can sometimes play without an account (help article exists; rules to verify) |
| S02 | Sign up / log in | CTA, nav | auth | form, social login (to verify) | error, taken username (to verify) |
| S03 | Home (logged in) | root | hub | left nav, play card, daily games, puzzle card | empty (new user), active daily games |
| S04 | **Play Online** | Play > Play | pick time control, start | time-control picker, "More Time Controls", custom time input, Start Game, Custom Challenge | documented: default pre-selected; custom controls may find no match |
| S05 | Custom Challenge | S04 | rated/unrated, color, odds, opponent | game type, color picker, rated toggle, odds picker | documented: Daily has extra options |
| S06 | Seeking / matched | S04 Start | waiting for opponent | spinner, cancel | timeout, no match for rare custom control |
| S07 | **Live game** | after match | play | board, two clocks, move list, player cards, chat, resign/draw/abort, premove, drag/click moves, promotion picker, captured pieces + material | documented: premoves, auto-queen, legal-move dots, focus mode, timestamps, board size, arrows, smart board, voice moves. to verify: reconnect, abandoned, draw offer, takeback |
| S08 | Game over | S07 end | result, next actions | result modal, rating change, **Game Review** button, rematch, new game | win/loss/draw/timeout/resign/abandon |
| S09 | Daily (correspondence) game + list | Play > Daily | slow games | board, per-move clock (e.g. 1/3/7 days), "your move" list | documented: time is per move, not per game |
| S10 | Play vs Computer (bots) | Play > Computers | practice | bot list by strength/persona, color, settings | locked bots for free users (documented: Gold+ unlocks all bots) |
| S11 | Play a friend / challenge | profile, friends | private game | friend list, challenge dialog | declined, offline |
| S12 | **Game Review** | S08 button, archive | post-game coaching | eval graph, move classifications on board, accuracy, estimated game rating, skills, opening, suggested course, next-key-move | documented: free summary vs full premium review; fast summary vs deeper full review |
| S13 | Analysis board | Train > Analysis | free analysis | board, engine lines, depth, arrows, move feedback, save | documented: depth setting, Cloud Analysis, saved analysis, premium gating |
| S14 | Game Explorer | analysis | opening/position stats | move table, move-order handling | documented: move order question exists |
| S15 | Puzzles hub | Train > Puzzles | tactics | modes: standard, Rush, Battle, themes | documented: daily caps on free (see plan changes) |
| S16 | Puzzle | S15 | solve | board, hint, streak, rating | correct, wrong, solved, locked (cap) |
| S17 | Puzzle Rush | S15 | timed survival | timer, strikes, score | documented: free daily cap |
| S18 | Puzzle Battle | S15 | head-to-head puzzles | two scores, timer | to verify |
| S19 | Lessons | Learn | courses | course list, video, interactive lesson | documented: free = limited, "new to chess + 1 per week" |
| S20 | Profile (public) | username | identity | avatar, flair, ratings per time class, game history, club list, is-streamer flag | documented in PubAPI fields |
| S21 | Stats / insights | profile | performance | per-class rating chart, win/loss, insights | documented: Diamond "insights" |
| S22 | Game archive | profile | past games | filter, PGN download | documented: PGN export, comments/variations |
| S23 | Clubs discover | Social > Clubs | find a club | search, filters (location, language, purpose) | empty |
| S24 | Club page | S23 | community | members, roles, news, forum, chat, matches, tournaments, leaderboard | documented: roles, admin tools |
| S25 | Tournaments list | Play > Tournaments | find events | list, create | documented |
| S26 | Create tournament | S25 | host | club vs shareable, Swiss vs Arena, duration, rounds | documented: Arena needs ≥5 participants |
| S27 | Tournament page | S25 | play event | standings, pairings, join/leave | Swiss, Arena, Multi-Club Arena |
| S28 | Leagues / Club Match | club | team play | team boards, lineup | documented: Community League, Club Match |
| S29 | Friends + messages | nav | social | friend list, inbox, chat, block | blocked |
| S30 | Settings | avatar | prefs | board/pieces, live chess, notifications, privacy, sounds | documented: Live Chess settings, board size, piece animations |
| S31 | Membership | upsell links | pay | plan table, billing | documented: Free/Gold/Platinum/Diamond + Friends & Family |
| S32 | Report / Block modal | username `(!)` icon | safety | reason dropdown, text box, block checkbox | documented |
| S33 | News / articles | nav | content | article list, embedded PGN viewer | documented: multi-game PGN in articles |
| S34 | Watch / TV | nav | broadcasts | live events | out of scope |
| S35 | Variants hub | Play | alt rules | 4-player, bughouse, 3-check, Chess960, Duck, Fog of War | documented in features guide |

## 4. User flows

```
F01 Quick live game  (core loop)
    S03/any -> S04 Play Online -> S06 seeking -> S07 live game -> S08 game over
    clicks: 3 (hover Play, Play, Start Game)
    edge: no opponent for rare time control, opponent disconnects, flag fall, draw offer, abort in first moves

F02 Custom challenge
    S04 -> S05 -> S06 -> S07 -> S08
    edge: odds game rebalancing rating gap, unrated, choose color

F03 Daily game
    S04/S09 -> S07(daily) ... days later ... S07 -> S08
    edge: opponent timeout after days, vacation/pause (to verify)

F04 Challenge a friend
    S20 or S29 -> S11 -> S07 -> S08
    edge: declined, blocked, offline

F05 Review a finished game
    S08 Game Review button -> S12 -> S13 (deeper)
    edge: free tier limit reached -> S31 upsell

F06 Solve puzzles / Puzzle Rush
    S15 -> S16 or S17 -> result
    edge: daily cap on free -> S31

F07 Play a bot
    S10 -> S07(bot) -> S08
    edge: locked bot -> S31

F08 Join a tournament
    S25 -> S27 -> S07 (auto-paired) ... -> standings
    edge: Arena under 5 players never starts

F09 Host a tournament
    S25 -> S26 -> S27
    edge: club permissions

F10 Join a club, play a club match
    S23 -> S24 -> S28
    edge: club admin approval (to verify)

F11 Report or block
    S20/S07 -> S32 -> submitted
    edge: report abuse is itself punishable (documented)

F12 Upgrade
    any gated feature -> S31 -> checkout
    edge: legacy vs current plans (documented, Sept 2022 split)

F13 Sign up
    S01 -> S02 -> S03
    edge: guest play without account (documented as a question; rules to verify)
```

## 5. Components

| component | variants | states | used on |
|---|---|---|---|
| Chess board | sizes, themes, flip, coordinates | normal, check, last-move highlight, legal-move dots, premove, arrows, game over | S07 S09 S10 S12 S13 S16 S17 S22 S33 |
| Pieces | piece sets (themes) | idle, dragging, animating | same |
| Clock | live, daily (per move), low-time warning | running, paused, flagged | S07 S09 S10 |
| Move list | with timestamps, with classifications, variations | current, hover, comment | S07 S12 S13 S22 |
| Time-control picker | presets, "more", custom | selected, no-match warning | S04 S05 S26 |
| Eval bar + graph | engine lines, depth | loading, locked | S12 S13 |
| Move classification badge | brilliant/great/best/…/blunder | on-board, on-list | S12 S13 |
| Player card | avatar, flair, rating, flag, streamer badge | online, offline, fair-play-closed | S07 S20 |
| Chat box | game chat, club chat, DM | muted, blocked | S07 S24 S29 |
| Modal | game over, report, confirm resign | open, error | many |
| Nav (left sidebar) | collapsed, hover flyout | active | all |
| Toast / banner | rating refund notice, upsell | dismissed | many |
| Leaderboard / standings table | Swiss, Arena, club | live updating | S24 S27 |
| Paywall / upsell card | per feature | dismissed | S12 S13 S15 S17 S19 S10 |
| Settings toggles | board, sound, premove, auto-queen, focus mode | on/off | S30 |

**Do not copy:** board color palettes, piece designs, sound effects, move-classification glyphs (called out by their own API IP notice). Design your own.

## 6. Inferred data model

Confidence = how well public sources support it. Anything not supported is a guess.

```
User            id, username, joined_at, avatar, flair, country, is_streamer, membership_tier, status(open|closed_fair_play|closed_other)
                evidence: PubAPI player fields (url, player_id, joined, is_streamer); "Closed: Fair Play" icon in help   confidence: high
Rating          user_id, time_class(bullet|blitz|rapid|daily|960|...), value, games_played   (rating deviation likely)
                evidence: ratings per time class in help/glossary; formula not verified in these sources   confidence: medium
Game            id, white_id, black_id, time_control, time_class, rated, variant, start_pos, result, termination, started_at, pgn
                evidence: PGN export, custom position, thematic games, odds games, unrated   confidence: high
Move            game_id, ply, san, clock_after_ms, (timestamp)
                evidence: "Timestamps" setting, PGN   confidence: medium (could be stored as PGN only)
Seek/Challenge  user_id, time_control, rated, color_pref, odds, target(pool|friend|club)
                evidence: pool matchmaking, Custom Challenge, challenge a friend   confidence: high
Review          game_id, tier(summary|full), accuracy_w, accuracy_b, est_rating_w, est_rating_b, classifications, engine, depth
                evidence: Game Review help, release notes (game rating estimate)   confidence: high
Puzzle          id, fen, solution, themes, rating     evidence: 500k+ puzzles, themed practice   confidence: high
PuzzleAttempt   user_id, puzzle_id, result, time, mode(standard|rush|battle)   confidence: medium
Lesson          id, course_id, content, tier_required   confidence: medium
Club            id, name, desc, visibility, settings    ClubMember(club_id,user_id,role)
                evidence: club roles, admins, join/quit, harassment tools   confidence: high
Tournament      id, host(user|club), format(swiss|arena|multi_club_arena), time_control, rounds|duration, min_players, shareable
                TournamentEntry(user_id, score), Pairing(round, white, black, game_id)
                evidence: create-tournament and multi-club arena help   confidence: high
Match/League    club_match(team_a, team_b, boards), league(id, season)   evidence: club help titles   confidence: medium
Friendship      user_a, user_b, status     Block(user_id, blocked_id)   confidence: high
Message         thread_id, sender, body, sent_at (DM, club chat, game chat)   confidence: medium
Report          reporter_id, target_id, reason, text, queue(abuse|fair_play), status
                evidence: report help (sent to Abuse and Fair Play teams; abuse of reporting is punished)   confidence: high
RatingRefund    victim_id, game_id, points, cause_account_id
                evidence: automatic refund on cheater closure (up to 100 games)   confidence: high
Membership      user_id, tier, plan(legacy|current), period, billing_ref   evidence: plan docs   confidence: high
Bot             id, strength, persona, tier_required   evidence: "unlock all bots", 100+ bots   confidence: medium
```

## 7. Hard parts

1. **Server-authoritative live clocks** with latency compensation, reconnects, premoves, flag handling at bullet speeds. Hardest piece of the core loop.
2. **Matchmaking pools** per time control and rating band, plus odds-game rebalancing. Sparse pools (custom controls) can wait forever, they say so themselves.
3. **Fair play / anti-cheat**: statistical move analysis, human review queue, auto rating refunds. The service's trust depends on it. Can start as report + manual review.
4. **Engine analysis infrastructure**: Game Review and Cloud Analysis are server-side engine compute with quota gating. Stockfish is open source but check its license (GPL) against how you ship.
5. **Tournament engines**: Swiss pairing and Arena continuous pairing, multi-club scoring.
6. **Content**: puzzles, lessons, videos, bots with personas.

## 8. Cannot be cloned (skip rows)

- The user base and network effects (game pool depth is the product at bullet/blitz).
- Editorial content: lessons, videos, courses, news, titled-player coverage, broadcasts and streams.
- Licensed or owned assets: board palettes, piece sets, sounds, move-classification icons, brand, the "Chess.com" name. Their own IP notice names these.
- Their puzzle database, game archive and player data (the PubAPI exposes public data only, read-only, and has terms; don't use it to seed a competitor without legal review).
- Partner and event deals (e.g. proctored high-stakes events, esports events).
- Hardware: connected smart boards are partner-gated (the API notice says to apply).
- Their tuned fair-play models.

## 9. Size

| thing | count |
|---|---|
| screens | 35 (about 12 are core) |
| flows | 13 |
| entities | ~18 |

- **Core-loop slice (S03-S08, S12, accounts, ratings, basic Game Review with open-source engine): M** (a few weeks, one strong dev).
- **Everything above: XL. Rescope.** The social, tournaments, content and fair-play layers are each their own project.

No promise of a perfect clone. The functional loop is buildable; the pool, the content and the trust layer are not something code alone gives you.

## Open questions to verify with your own account
- Guest play rules (S01/F13), reconnect and abandon rules, takeback and draw rules, rating system details, exact free-tier caps today, empty and error states on every screen.
- Read the user agreement before using your own account for recon.
