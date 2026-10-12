# THEMILION SYSTEM — Moteur de missions

Un seul moteur pour toutes les compétences. L'utilisateur choisit une compétence (Musculation, Éducation financière, Cours & révisions…), puis les zones qu'il veut travailler, le nombre de séances par semaine et le temps maximum. Le moteur génère ensuite les séances de la semaine.

```
Domaine > Compétence > Focus (zone) > Exercices
Physique > Musculation > Abdos > Gainage planche
Finance  > Éducation financière > Revoir ses finances > Consulter ses comptes
Études   > Cours & révisions > Maths > Relire le dernier cours
```

## Lancer la démo

À la racine de l'app :

```bash
npx tsx demo.ts
```

(Équivalent Node 22 : `node --experimental-strip-types`, si les imports portent l'extension `.ts`.)

La sortie montre la semaine 1, la progression après 3 semaines simulées, puis la semaine 4 adaptée.

## Fichiers

| Fichier | Rôle |
|---|---|
| `types.ts` | Le modèle de données (exercice, profil, état, séance, `catalogPerso`) |
| `moteur.ts` | La logique : planning, rotation, choix, dosage, progression, XP |
| `personnalisation.ts` | Fusion du catalogue perso, validation, CRUD |
| `catalogue/physique.ts` | Musculation (7 zones), Endurance, Mobilité |
| `catalogue/autres-domaines.ts` | Finance (dont suivi + culture), et une compétence de départ pour les autres domaines |
| `catalogue/cours.ts` | Cours & révisions : 13 matières, fabrique `exercicesMatiere()` |
| `catalogue/index.ts` | Le catalogue, le menu de choix pour l'app et un vérificateur |

## API

| Fonction | Usage dans l'app |
|---|---|
| `menuDeChoix(perso?)` | Écran « Choisis tes compétences et tes zones » (badge `perso`) |
| `planifierSemaine(profil, etat, CATALOGUE, date)` | Vue semaine |
| `seancesDuJour(profil, etat, CATALOGUE, date)` | Écran du matin |
| `enregistrerResultat(etat, seance, ressenti)` | Bouton de fin : trop facile / bien / trop dur / pas fait |
| `verifierCatalogue()` | À lancer en CI à chaque ajout d'exercices |

## Champ `ressource`

Optionnel sur `Exercice` et recopié sur `ExercicePrescrit` :

```ts
ressource?: {
  type: "video" | "podcast" | "article" | "livre" | "app" | "site";
  suggestions: string[]; // noms seulement, jamais d'URL
};
```

L'app affiche `📺 Idées : Finary (YouTube), Heu?reka (YouTube)`.

## Les règles

1. **Répartition** : 5 séances sur 7 jours donnent Lun, Mar, Jeu, Ven, Dim. Il n'y a jamais 3 jours de repos d'affilée.
2. **Rotation des zones** : chaque jour, on prend la zone la moins travaillée récemment. En musculation, une zone n'est pas retravaillée le lendemain (récupération de 48 h). Si l'utilisateur choisit trop peu de zones pour ses séances, la zone est faite en version **allégée** (une série de moins) au lieu d'être refusée.
3. **Choix des exercices** : seulement ceux que l'utilisateur peut faire avec son matériel, à son niveau ou en dessous. Le niveau actuel est privilégié (poids ×4, niveau −1 ×2, niveau −2 ×1). On évite de répéter les exercices des 2 dernières séances.
4. **« Pas beaucoup »** : la séance ne dépasse pas `minutesMax`, et la journée ne dépasse pas `budgetMinutesJour`, réparti entre les compétences. Les missions « action » se raccourcissent pour rentrer dans le temps.
5. **Progression** : « bien » ajoute 1 palier, « trop facile » en ajoute 2, « trop dur » en retire 1. Au bout de 4 paliers, on passe au niveau suivant et des exercices plus durs apparaissent. Au sein d'un niveau, le volume augmente (reps, secondes, minutes).
6. **Chaîne qui se fissure** : un jour manqué ne casse pas la chaîne. Au-delà, elle est divisée par deux.
7. **Mission plancher** : chaque séance propose une version de 2 minutes pour les mauvais jours.
8. **XP** : `minutes × difficulté × 1,25 (prévu) × bonus de chaîne`, la même formule que le système de discipline.

## Ajouter une compétence

Créer un objet `Competence` (zones + exercices) et l'ajouter dans `catalogue/index.ts`. Le moteur n'a pas besoin d'être modifié. Chaque zone doit avoir au moins un exercice de niveau 1 sans matériel, et le vérificateur le contrôle.

## Ajouter une matière (Cours)

Dans `catalogue/cours.ts` : un focus + la fabrique + 2 ou 3 exercices spécifiques.

```ts
f("espagnol", "Espagnol"),
...exercicesMatiere("espagnol", "espagnol", ["Les Bons Profs"]),
ex("espagnol", "espagnol-dix-mots", "Apprendre 10 mots", 1, A(10), "…", ["papier_stylo"], "Apprends 3 mots."),
```

Les ids restent en kebab-case, uniques dans tout le catalogue. Suggestions vidéo : noms de chaînes seulement, jamais d'URL. En cas de doute, `"une vidéo de cours sur YouTube sur ce chapitre"`.

> En production, le catalogue peut aller en base de données avec le même schéma. `etat` est stocké par utilisateur.

## Personnalisation

En plus du catalogue officiel, chaque utilisateur peut ajouter **ses** exercices, **ses** zones et **ses** compétences. La rotation, le dosage et la progression du moteur ne changent pas : on fusionne juste avant de planifier.

Trois niveaux, du plus simple au plus large :

1. **Exercice perso** — rattaché à une zone officielle ou perso (ex. « Ma routine abdos » dans Abdos).
2. **Zone perso** — ajoutée à une compétence officielle (ex. « Avant-bras » dans Musculation).
3. **Compétence perso** — un nouveau bloc, domaine `Perso` (ex. Guitare, avec Accords et Rythme).

**Épinglage** : un exercice (officiel ou perso) listé dans `epingles` est proposé en premier dès que sa zone est choisie le jour J, s'il rentre dans le temps. Il échappe à la règle « ne pas répéter les 2 dernières séances ».

**Masquage** : un exercice officiel listé dans `masques` n'est jamais proposé.

Les exercices perso restent éligibles même si leur niveau dépasse celui de l'utilisateur (c'est lui qui les a choisis). Le filtre matériel s'applique toujours. Un perso non épinglé a un poids ×3 au tirage.

### Règles d'XP (anti-triche)

- Un exercice perso compte au plus **30 minutes**.
- Sa difficulté est plafonnée à **×1,3** tant qu'il n'a pas été validé **5 fois** avec un ressenti autre que « trop facile ».
- Les exercices perso ne peuvent pas rapporter plus de **60 %** de l'XP de la journée.

### Stockage

`catalogPerso` est enregistré **en base par utilisateur**, à côté de son `etat`. Le catalogue officiel reste **partagé et en lecture seule**. L'app n'a rien à changer : `planifierSemaine` et `seancesDuJour` fusionnent tout seuls si `profil.catalogPerso` est présent.

API : `ajouterExercice`, `modifierExercice`, `supprimerExercice`, `ajouterFocus`, `ajouterCompetence`, `supprimerCompetence`, `epingler`, `desepingler`, `masquer`, `afficher`, `fusionnerCatalogue`, `validerExercicePerso`.

