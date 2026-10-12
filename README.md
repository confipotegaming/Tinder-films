# Ciné Match

Un « Tinder des films » pour choisir quoi regarder entre amis, pensé pour le téléphone.

1. Quelqu'un crée un **salon** et règle les filtres : films ou séries, plateformes
   (Netflix, Prime Video, Disney+, Canal+, HBO Max, Apple TV+), genres, époque,
   réalisateur ou créateur, niveau de note.
2. Les amis rejoignent le salon avec son **code de 4 lettres**.
3. Chacun glisse les affiches : à droite = oui, à gauche = non.
4. Dès que deux personnes ou plus aiment le même titre, **c'est un match**.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `index.html` | Toute l'application : catalogue, filtres, salons, swipe |
| `posters/` | Les affiches (`<id>.jpg`, 360 px de large) : 249 titres sur 274 (les 25 autres n'ont pas d'image sur Wikipédia) |
| `outils/` | Le script qui récupère les affiches sur Wikipédia, et la correspondance des titres en anglais |

## Le catalogue

274 titres (216 films, 58 séries), uniquement des titres très bien notés :

- films : moyenne **Letterboxd** d'au moins 3,7 sur 5 ;
- séries : note **IMDb** d'au moins 8 sur 10 (Letterboxd ne note pas les séries).

Les notes sont approximatives, et les plateformes en France sont **indicatives** :
les catalogues changent souvent. Pour ajouter un titre, il suffit d'ajouter une ligne
dans `FILMS` ou `SERIES` dans `index.html`.

Les affiches viennent des articles de Wikipédia en anglais. Ce sont des images
protégées par le droit d'auteur de leurs studios : elles servent ici à illustrer
un projet personnel, sans usage commercial. Les titres sans affiche gardent une
affiche dessinée ; pour les compléter, lancer `python3 outils/recuperer_affiches.py`
depuis la racine du dépôt, puis mettre à jour la liste `POSTERS` dans `index.html`.

## Jouer à plusieurs

La page fonctionne à trois endroits :

- **Sur Render** (https://tinder-films.onrender.com) : `server.js` gère les salons. Chacun
  donne son prénom ; on invite ses amis avec le lien du salon (il finit par `#CODE`) ou
  avec le code de 4 lettres. Les matchs arrivent en direct chez tout le monde.
- **Sur claude.ai** (Artifact) : les salons passent par la base de données de claude.ai.
- **Ailleurs** (fichier ouvert directement) : mode solo, votes gardés dans le navigateur.

Sur l'offre gratuite de Render, le serveur s'endort après 15 minutes sans visite : la
première ouverture prend alors environ une minute, et le serveur a oublié les salons.
Ce n'est pas grave : dès qu'un joueur revient, sa page renvoie le salon et ses votes.

## Mettre en ligne sur Render

Dans le service Render (**Settings**) :

| Réglage | Valeur |
| --- | --- |
| Language | Node |
| Branch | `main` |
| Root Directory | *(vide)* |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Puis **Manual Deploy > Deploy latest commit**. Le fichier `render.yaml` contient les
mêmes réglages, pour créer le service d'un coup avec **New > Blueprint**.

Sur ordinateur : `npm start`, puis ouvrir http://localhost:3000.

## Comment c'est construit

| Fichier | Rôle |
| --- | --- |
| `server.js` | Sert la page et les affiches ; API des salons (`/api/rooms`) avec mises à jour en direct |
| `package.json` | Commandes pour Render (`npm start`) ; aucune dépendance |
| `render.yaml` | Réglages Render prêts à l'emploi |
