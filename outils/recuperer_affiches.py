# Télécharge les affiches manquantes depuis Wikipédia (en anglais) dans posters/.
# Lancer depuis la racine du dépôt : python3 outils/recuperer_affiches.py (il faut requests et Pillow).
# Ensuite, mettre à jour la liste POSTERS dans index.html.
import json, time, requests, os, io, urllib.parse
from PIL import Image
cat = json.load(open("outils/catalogue.json")); en = open("outils/titres_anglais.txt").read().splitlines()
s = requests.Session(); s.headers["User-Agent"] = "CineMatch/1.0 (personal film-night app)"
urls = json.load(open("outils/liens_affiches.json")) if os.path.exists("outils/liens_affiches.json") else {}
def get(url, tries=5):
    for a in range(8):
        try:
            r = s.get(url, timeout=30)
            if r.status_code == 200: return r
            if r.status_code in (400, 403, 404): return None
            print("  http", r.status_code, url[:80], flush=True)
        except Exception as e: print("  err", e.__class__.__name__, flush=True)
        time.sleep(60 * (a + 1))
    return None
for f, t in zip(cat, en):
    out = f"posters/{f['id']}.jpg"
    if os.path.exists(out): continue
    if f["id"] not in urls:
        r = get("https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(t.replace(" ", "_"), safe=""))
        urls[f["id"]] = (r.json().get("originalimage") or r.json().get("thumbnail") or {}).get("source") if r else None
        json.dump(urls, open("outils/liens_affiches.json", "w"), indent=0)
        time.sleep(4)
    src = urls[f["id"]]
    if not src: print("NONE", f["t"], flush=True); continue
    # Vignette de 400 px de large quand c'est possible
    if "/wikipedia/" in src and "/thumb/" not in src and not src.lower().endswith(".svg"):
        base = src.split("?")[0]; parts = base.split("/")
        name = parts[-1]
        thumb = "/".join(parts[:-3] + ["thumb"] + parts[-3:] + [f"400px-{name}"])
    else: thumb = src
    r = get(src)
    if not r: print("DLFAIL", f["t"], flush=True); continue
    try:
        im = Image.open(io.BytesIO(r.content)).convert("RGB")
        w = 360; im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(out, "JPEG", quality=78, optimize=True, progressive=True)
        print("ok", f["t"], im.size, flush=True)
    except Exception as e: print("IMGFAIL", f["t"], e, flush=True)
    time.sleep(0.5)
print("FINI", flush=True)
