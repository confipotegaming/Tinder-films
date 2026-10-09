// Petit serveur pour Render (ou n'importe quel hébergeur Node) : il sert index.html et les affiches.
// Aucune dépendance à installer. Render donne le port à utiliser dans process.env.PORT.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { ".html": "text/html; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".ico": "image/x-icon" };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path === "/" ? "index.html" : normalize(path).replace(/^([/\\]|\.\.)+/, "");
  // On ne sert que la page et le dossier des affiches, rien d'autre du dépôt.
  if (file !== "index.html" && !file.startsWith("posters/")) {
    res.writeHead(404).end("Introuvable");
    return;
  }
  try {
    const body = await readFile(join(ROOT, file));
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file)] || "application/octet-stream",
      // Les affiches ne changent jamais : le navigateur peut les garder longtemps.
      "Cache-Control": file.startsWith("posters/") ? "public, max-age=604800" : "no-cache",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("Introuvable");
  }
}).listen(PORT, () => console.log(`Ciné Match sur http://localhost:${PORT}`));
