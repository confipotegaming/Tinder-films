// Serveur de Ciné Match (pour Render ou n'importe quel hébergeur Node). Aucune dépendance à installer.
// 1. Il sert la page (index.html) et les affiches (posters/).
// 2. Il gère les salons : réglages, joueurs, votes, et prévient tout le monde en direct
//    (Server-Sent Events : le navigateur garde une connexion ouverte et reçoit chaque changement).
// Les salons sont gardés en mémoire. Sur l'offre gratuite de Render, le serveur s'endort après
// 15 minutes sans visite et oublie tout : la page renvoie alors elle-même le salon et les votes
// au serveur quand quelqu'un revient (voir « ensureRoom » dans index.html).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { ".html": "text/html; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".ico": "image/x-icon" };

// ---------- Limites (pour que personne ne remplisse la mémoire du serveur) ----------
const MAX_ROOMS = 2000;
const MAX_MEMBERS = 12;
const MAX_VOTES = 500;
const MAX_BODY = 64 * 1024;
const ROOM_TTL = 3 * 24 * 3600 * 1000; // un salon sans activité pendant 3 jours est effacé

const PLATFORMS = ["netflix", "prime", "disney", "canal", "hbo", "apple"];
const GENRES = ["act", "ani", "com", "dra", "pol", "hor", "sf", "rom", "his", "wes", "mus", "doc"];
const DECADES = ["old", "1970", "1980", "1990", "2000", "2010", "2020"];
const CODE_RE = /^[A-Z]{4}$/;
const UID_RE = /^[a-z0-9]{8,32}$/;
const TITLE_RE = /^[fs][a-z0-9]{1,40}$/;

// ---------- Salons ----------
const rooms = new Map(); // code -> { settings, members: { uid: { name, votes } }, clients: Set<res>, at }

function cleanSettings(s = {}) {
  const pick = (arr, allowed) => (Array.isArray(arr) ? [...new Set(arr.filter((x) => allowed.includes(x)))] : []);
  const platforms = pick(s.platforms, PLATFORMS);
  return {
    type: ["f", "s", "both"].includes(s.type) ? s.type : "both",
    platforms: platforms.length ? platforms : PLATFORMS,
    genres: pick(s.genres, GENRES),
    decades: pick(s.decades, DECADES),
    director: typeof s.director === "string" ? s.director.slice(0, 80) : "",
    tier: [0, 1, 2].includes(s.tier) ? s.tier : 0,
  };
}

function cleanVotes(v = {}) {
  const out = {};
  if (v && typeof v === "object") {
    for (const [id, x] of Object.entries(v).slice(0, MAX_VOTES)) if (TITLE_RE.test(id) && (x === 0 || x === 1)) out[id] = x;
  }
  return out;
}

function newCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (;;) {
    const c = Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join("");
    if (!rooms.has(c)) return c;
  }
}

function state(room) {
  const members = {};
  for (const [uid, m] of Object.entries(room.members)) members[uid] = { name: m.name, votes: m.votes };
  return JSON.stringify({ members });
}

function broadcast(room) {
  const data = `data: ${state(room)}\n\n`;
  for (const res of room.clients) res.write(data);
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) if (!room.clients.size && now - room.at > ROOM_TTL) rooms.delete(code);
}, 3600 * 1000).unref();

// Garde les connexions en direct ouvertes (sinon un proxy peut les couper au bout d'un moment).
setInterval(() => {
  for (const room of rooms.values()) for (const res of room.clients) res.write(": ping\n\n");
}, 25 * 1000).unref();

// ---------- Outils HTTP ----------
function send(res, status, body, headers = {}) {
  const json = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(json);
}

function readJSON(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error("trop gros")); req.destroy(); } else chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch { reject(new Error("JSON invalide")); }
    });
    req.on("error", reject);
  });
}

// ---------- API des salons ----------
async function api(req, res, parts) {
  // parts : ["api", ...]
  if (parts[1] === "health") return send(res, 200, { ok: true });
  if (parts[1] !== "rooms") return send(res, 404, { error: "introuvable" });
  const code = parts[2];

  // Créer un salon (ou le recréer avec le même code après un redémarrage du serveur)
  if (req.method === "POST" && parts.length === 2) {
    const body = await readJSON(req);
    if (body.code !== undefined && !CODE_RE.test(body.code)) return send(res, 400, { error: "code invalide" });
    if (body.code && rooms.has(body.code)) return send(res, 200, { code: body.code });
    if (rooms.size >= MAX_ROOMS) return send(res, 503, { error: "trop de salons" });
    const c = body.code || newCode();
    rooms.set(c, { settings: cleanSettings(body.settings), members: {}, clients: new Set(), at: Date.now() });
    return send(res, 201, { code: c });
  }

  if (!CODE_RE.test(code || "")) return send(res, 400, { error: "code invalide" });
  const room = rooms.get(code);
  if (!room) return send(res, 404, { error: "salon inconnu" });
  room.at = Date.now();

  // Lire les réglages d'un salon
  if (req.method === "GET" && parts.length === 3) return send(res, 200, { settings: room.settings });

  // Enregistrer mon prénom et mes votes
  if (req.method === "PUT" && parts[3] === "members" && parts.length === 5) {
    const uid = parts[4];
    if (!UID_RE.test(uid)) return send(res, 400, { error: "joueur invalide" });
    if (!room.members[uid] && Object.keys(room.members).length >= MAX_MEMBERS) return send(res, 403, { error: "salon complet" });
    const body = await readJSON(req);
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 24) : "";
    room.members[uid] = { name, votes: cleanVotes(body.votes) };
    broadcast(room);
    return send(res, 200, { ok: true });
  }

  // Suivre le salon en direct
  if (req.method === "GET" && parts[3] === "events" && parts.length === 4) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(`retry: 3000\ndata: ${state(room)}\n\n`);
    room.clients.add(res);
    req.on("close", () => room.clients.delete(res));
    return;
  }

  return send(res, 404, { error: "introuvable" });
}

// ---------- Fichiers ----------
const gzCache = new Map();
async function file(req, res, path) {
  const name = path === "/" ? "index.html" : normalize(path).replace(/^([/\\]|\.\.)+/, "");
  // On ne sert que la page et le dossier des affiches, rien d'autre du dépôt.
  if (name !== "index.html" && !/^posters\/[a-z0-9]+\.jpg$/.test(name)) return send(res, 404, { error: "introuvable" });
  let body;
  try { body = await readFile(join(ROOT, name)); } catch { return send(res, 404, { error: "introuvable" }); }
  const headers = {
    "Content-Type": TYPES[extname(name)] || "application/octet-stream",
    // Les affiches ne changent jamais : le navigateur peut les garder une semaine.
    "Cache-Control": name.startsWith("posters/") ? "public, max-age=604800" : "no-cache",
  };
  if (name === "index.html" && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
    if (!gzCache.has(name)) gzCache.set(name, gzipSync(body));
    body = gzCache.get(name);
    headers["Content-Encoding"] = "gzip";
    headers.Vary = "Accept-Encoding";
  }
  res.writeHead(200, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}

createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const parts = path.split("/").filter(Boolean);
    if (parts[0] === "api") return await api(req, res, parts);
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "méthode non permise" });
    return await file(req, res, path);
  } catch (e) {
    if (!res.headersSent) send(res, 400, { error: e.message || "requête invalide" });
  }
}).listen(PORT, "0.0.0.0", () => console.log(`Ciné Match prêt sur le port ${PORT}`));
