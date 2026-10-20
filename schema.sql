CREATE EXTENSION IF NOT EXISTS citext;
CREATE TABLE IF NOT EXISTS users (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 username CITEXT UNIQUE NOT NULL,
 email CITEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 country TEXT,
 tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','gold','platinum','diamond')),
 status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed_fair_play','closed_other'))
);
CREATE TABLE IF NOT EXISTS ratings (
 user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
 time_class TEXT NOT NULL CHECK (time_class IN ('bullet','blitz','rapid')),
 value REAL NOT NULL DEFAULT 1500,
 deviation REAL NOT NULL DEFAULT 350,
 volatility REAL NOT NULL DEFAULT 0.06,
 games INT NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,time_class)
);
CREATE TABLE IF NOT EXISTS games (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 white_id BIGINT REFERENCES users(id) NOT NULL,
 black_id BIGINT REFERENCES users(id) NOT NULL,
 base_ms INT NOT NULL,
 inc_ms INT NOT NULL,
 time_class TEXT NOT NULL,
 rated BOOLEAN NOT NULL DEFAULT true,
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 ended_at TIMESTAMPTZ,
 result TEXT CHECK (result IS NULL OR result IN ('1-0','0-1','1/2-1/2')),
 termination TEXT,
 pgn TEXT,
 white_rating_before REAL,
 black_rating_before REAL,
 white_rating_after REAL,
 black_rating_after REAL
);
CREATE INDEX IF NOT EXISTS games_white_started_idx ON games(white_id,started_at DESC);
CREATE INDEX IF NOT EXISTS games_black_started_idx ON games(black_id,started_at DESC);
CREATE TABLE IF NOT EXISTS reports (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 reporter_id BIGINT REFERENCES users(id),
 target_id BIGINT REFERENCES users(id),
 game_id BIGINT REFERENCES games(id),
 reason TEXT NOT NULL,
 body TEXT,
 queue TEXT NOT NULL CHECK (queue IN ('abuse','fair_play')),
 status TEXT NOT NULL DEFAULT 'open',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS blocks (user_id BIGINT REFERENCES users(id), blocked_id BIGINT REFERENCES users(id), PRIMARY KEY(user_id,blocked_id));
