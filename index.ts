import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Chess } from 'chess.js';

const app = Fastify({ logger: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET is required. Copy .env.example to .env and set a long random secret.');

await app.register(cors, { origin: process.env.CLIENT_ORIGIN?.split(',') ?? true });
await app.register(jwt, { secret: jwtSecret });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
await app.register(websocket);

app.get('/health', async () => ({ ok: true, service: 'KnightArena API' }));

const signupSchema = z.object({ username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/), email: z.string().email().max(254), password: z.string().min(10).max(128) });
app.post('/auth/signup', async (req, reply) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid signup details', details: parsed.error.flatten() });
  const { username, email, password } = parsed.data;
  const hash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query('INSERT INTO users (username,email,password_hash) VALUES ($1,$2,$3) RETURNING id, username, email, created_at', [username, email, hash]);
    const user = result.rows[0];
    await pool.query("INSERT INTO ratings (user_id,time_class) VALUES ($1,'bullet'),($1,'blitz'),($1,'rapid')", [user.id]);
    return reply.code(201).send({ user, token: app.jwt.sign({ sub: String(user.id), username: user.username }, { expiresIn: '7d' }) });
  } catch (e: any) {
    if (e?.code === '23505') return reply.code(409).send({ error: 'Username or email already exists' });
    req.log.error(e); return reply.code(500).send({ error: 'Could not create account' });
  }
});

app.post('/auth/login', async (req, reply) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Email and password are required' });
  const found = await pool.query('SELECT id,username,email,password_hash,status FROM users WHERE email=$1', [parsed.data.email]);
  const user = found.rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return reply.code(401).send({ error: 'Invalid email or password' });
  if (user.status !== 'open') return reply.code(403).send({ error: 'This account is not available' });
  return { user: { id: user.id, username: user.username, email: user.email }, token: app.jwt.sign({ sub: String(user.id), username: user.username }, { expiresIn: '7d' }) };
});

app.get('/me', { onRequest: [async (req, reply) => { try { await req.jwtVerify(); } catch { return reply.code(401).send({ error: 'Sign in required' }); } }] }, async req => {
  const claims = req.user as { sub: string };
  const result = await pool.query('SELECT id,username,email,country,tier,created_at FROM users WHERE id=$1', [claims.sub]);
  return result.rows[0] ?? null;
});

// WebSocket protocol scaffold. Production game actors must own clocks on the server and persist snapshots.
app.get('/ws', { websocket: true }, (socket, req) => {
  socket.send(JSON.stringify({ type: 'connected', message: 'KnightArena realtime endpoint ready; authenticated game sessions are not enabled in this starter.' }));
  socket.on('message', raw => {
    try {
      const msg = JSON.parse(raw.toString());
      if (!msg || typeof msg.type !== 'string') return socket.send(JSON.stringify({ type: 'error', message: 'Message must include a type.' }));
      socket.send(JSON.stringify({ type: 'error', message: 'Realtime game actions are not enabled until game actors and matchmaking are implemented.' }));
    } catch { socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON message.' })); }
  });
});

app.get('/games/:id/pgn', async (req, reply) => {
  const { id } = req.params as { id: string };
  if (!/^\d+$/.test(id)) return reply.code(400).send({ error: 'Invalid game id' });
  const result = await pool.query('SELECT pgn FROM games WHERE id=$1', [id]);
  if (!result.rowCount) return reply.code(404).send({ error: 'Game not found' });
  return reply.type('application/x-chess-pgn').send(result.rows[0].pgn ?? '');
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });

// Keep chess.js imported here as the rules engine used by the upcoming server-authoritative game actor.
void Chess;
