// Type Rally — multiplayer typing race server
// Players open "/", the host opens "/host" and enters HOST_KEY.
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const HOST_KEY = process.env.HOST_KEY || 'rally';   // CHANGE THIS when you deploy
const GRID = 30;
const COUNTDOWN_MS = 5000;
const MAX_RACE_MS = 150000;
const RESULTS_MS = 8000;
const TEXT_COUNT = 8; // must match TEXTS in public/index.html

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
const server = http.createServer(app);
const io = new Server(server);

const players = new Map(); // socket.id -> player
const hosts = new Set();
let race = null;           // {id, text, startAt, endAt}
let lastText = -1;

const clamp = (n, a, b) => { n = Number(n); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : a; };
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);

function snapshot() {
  return {
    now: Date.now(),
    race,
    hostOnline: hosts.size > 0,
    players: [...players.values()].map(p => ({
      id: p.id, name: p.name, color: p.color, inRace: p.inRace,
      p: p.p, w: p.w, a: p.a, f: p.f
    }))
  };
}
const broadcast = () => io.emit('state', snapshot());

io.on('connection', socket => {
  socket.emit('state', snapshot());

  socket.on('join', (data, ack) => {
    const name = cleanName(data && data.name);
    if (name.length < 2) return ack && ack({ ok: false, error: 'Enter a name with at least 2 characters.' });
    if (!players.has(socket.id) && players.size >= GRID)
      return ack && ack({ ok: false, error: 'This race is full (30 players). Try again after the next race.' });
    players.set(socket.id, {
      id: socket.id, name, color: clamp(data.color, 0, 9) | 0,
      inRace: false, p: 0, w: 0, a: 100, f: null
    });
    ack && ack({ ok: true, id: socket.id });
    broadcast();
  });

  socket.on('leave', () => { players.delete(socket.id); broadcast(); });

  socket.on('host', (data, ack) => {
    if (!data || String(data.key) !== HOST_KEY) return ack && ack({ ok: false, error: 'That host key is not correct.' });
    hosts.add(socket.id);
    ack && ack({ ok: true });
    broadcast();
  });

  socket.on('start', () => {
    if (!hosts.has(socket.id) || race) return;
    if (players.size === 0) return;
    let text = Math.floor(Math.random() * TEXT_COUNT);
    if (text === lastText) text = (text + 1) % TEXT_COUNT;
    lastText = text;
    const startAt = Date.now() + COUNTDOWN_MS;
    race = { id: Math.random().toString(36).slice(2, 10), text, startAt, endAt: startAt + MAX_RACE_MS };
    for (const p of players.values()) Object.assign(p, { inRace: true, p: 0, w: 0, a: 100, f: null });
    broadcast();
  });

  socket.on('end', () => {
    if (!hosts.has(socket.id) || !race) return;
    const now = Date.now();
    if (now >= race.startAt && now < race.endAt) { race.endAt = now; broadcast(); }
  });

  socket.on('progress', d => {
    const p = players.get(socket.id);
    if (!p || !p.inRace || !race || !d || d.raceId !== race.id) return;
    const now = Date.now();
    if (now < race.startAt || now > race.endAt) return;
    if (p.f != null) return; // already finished
    p.p = clamp(d.p, 0, 1);
    p.w = clamp(d.w, 0, 300) | 0;
    p.a = clamp(d.a, 0, 100) | 0;
    if (d.f != null && p.p >= 1) p.f = Math.min(now - race.startAt, clamp(d.f, 0, MAX_RACE_MS));
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    hosts.delete(socket.id);
    broadcast();
  });
});

// race lifecycle + regular state push
setInterval(() => {
  if (race) {
    const now = Date.now();
    const racers = [...players.values()].filter(p => p.inRace);
    if (now >= race.startAt && now < race.endAt) {
      if (racers.length === 0) race.endAt = now;
      else if (racers.every(p => p.f != null) && race.endAt > now + 2500) race.endAt = now + 2500;
    }
    if (now > race.endAt + RESULTS_MS) {
      race = null;
      for (const p of players.values()) Object.assign(p, { inRace: false, p: 0, w: 0, f: null });
    }
  }
  broadcast();
}, 250);

server.listen(PORT, () => {
  console.log(`Type Rally running on http://localhost:${PORT}`);
  console.log(`Host page: http://localhost:${PORT}/host  (key: ${HOST_KEY === 'rally' ? 'rally — set HOST_KEY to change it' : 'set via HOST_KEY'})`);
});
