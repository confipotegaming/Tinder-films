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
| `posters/` | Les affiches (`<id>.jpg`, 360 px de large) : 159 titres sur 274 pour l'instant |
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

Le mode à plusieurs (salons partagés, matchs en direct) fonctionne quand la page est
ouverte comme Artifact sur claude.ai, qui fournit la base de données partagée.
Ouverte directement dans un navigateur (ou sur GitHub Pages), la page passe en
**mode solo** : on trie seul et la liste « Matchs » montre ses coups de cœur.
Pour jouer à plusieurs en dehors de claude.ai, il faudrait ajouter un petit serveur.
