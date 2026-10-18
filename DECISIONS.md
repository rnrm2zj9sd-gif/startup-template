# DECISIONS — THEMILION SYSTEM

Journal des décisions de conception : ce qui a été choisi, ce qui a été rejeté, et pourquoi.
Une décision = une entrée. On ne réécrit pas une entrée : on en ajoute une nouvelle qui la remplace.

État au 18/10/2026. Référence : doc « Courbe XP, niveaux & rangs E → S ».

| # | Sujet | Statut |
|---|---|---|
| D1 | Courbe XP en puissance 1,6 | Appliqué (base + app) |
| D2 | Constante K = 40 | Appliqué (base + app) |
| D3 | Rangs E → S aux niveaux 10, 25, 45, 70, 100 (sans SS) | Appliqué (base + app) |
| D4 | Rang automatique en V1, Épreuves de rang plus tard | Appliqué (V1) · Épreuves à valider |
| D5 | XP, niveau et rang ne baissent jamais | Appliqué |
| D6 | Recaler le système existant plutôt qu'en créer un second | Appliqué · nettoyage en attente |
| D7 | La base calcule, le TypeScript recopie la formule | Appliqué |
| D8 | Économie d'XP au temps d'effort, plafond 400 XP/jour | Conservé · plafond à revoir |
| D9 | Séries : boucliers + division par deux | Appliqué (18/10/2026) |

---

## D1 — Courbe XP : puissance 1,6

**Statut :** appliqué le 16/10/2026.

**Choisi :** XP totale pour atteindre le niveau L = round(K × (L − 1)^1,6).
Le coût d'un niveau est multiplié par 4 entre le niveau 10 et le niveau 100 (247 puis 1 012 XP).

**Rejeté :**

| Courbe | Résultat pour un joueur régulier | Raison du rejet |
|---|---|---|
| Exponentielle ×1,10 (RPG classique) | Niveau 100 en 340 ans | Inatteignable |
| Exponentielle ×1,05 | Niveau 100 en 8,3 ans, 94 jours par niveau vers le niveau 90 | Fin de parcours décourageante |
| Quadratique | Niveau 100 en 4,5 ans, 30 jours par niveau | Trop lente en fin de parcours |
| Linéaire | Premier niveau au bout de 6 jours | Tue l'onboarding |
| Coût fixe par rang (paliers) | Coût ×2,3 d'un coup au passage du rang D | Effet mur |

**Pourquoi :** dans un jeu vidéo, l'XP gagnée par heure grimpe avec le niveau, donc une exponentielle reste jouable.
Dans la vraie vie, une journée reste une journée : on a calibré la courbe en jours d'effort réel, pas en XP.
La puissance 1,6 donne un départ rapide (premier niveau en moins d'une journée) et une attente qui plafonne vers 10 jours par niveau.

**Où :** `xp_seuil_niveau`, `xp_pour_niveau` (Supabase) · `lib/progression/niveau.ts`.

## D2 — Constante K = 40

**Statut :** appliqué le 16/10/2026. Remplace K = 100, proposé le même jour.

**Choisi :** K = 40, avec un arrondi à l'unité.

**Rejeté :** K = 100 avec un arrondi à 10 XP.
Cette valeur supposait un joueur à 250 XP par jour, avec des quêtes à 10 / 25 / 50 / 100 XP.

**Pourquoi :** l'économie déjà codée dans l'app donne environ 16 XP pour 10 minutes de mission moyenne, soit environ 100 XP par jour pour un joueur régulier.
Avec K = 100, ce joueur aurait mis environ 51 mois à atteindre S. K = 40 garde les durées visées :

| Rang | Niveau | XP totale | Régulier (100 XP/j) | Occasionnel (50 XP/j) | Intense (200 XP/j) |
|---|---|---|---|---|---|
| D | 10 | 1 345 | 2 semaines | 4 semaines | 1 semaine |
| C | 25 | 6 462 | 2,1 mois | 4,2 mois | 1,1 mois |
| B | 45 | 17 045 | 5,6 mois | 11,2 mois | 2,8 mois |
| A | 70 | 35 012 | 11,5 mois | 23 mois | 5,8 mois |
| S | 100 | 62 384 | 20,5 mois | 41 mois | 10,2 mois |

L'arrondi à l'unité est la fonction `round` telle quelle, identique en SQL et en TypeScript.
Avec un petit K, un arrondi à 10 déformerait aussi les premiers niveaux (40, 121, 232…).

**Ouvert :** K = 24 donne S en 12 mois, K = 56 en 29 mois.

## D3 — Rangs E → S aux niveaux 10, 25, 45, 70, 100

**Statut :** appliqué le 16/10/2026.

**Choisi :** E (1–9), D (10–24), C (25–44), B (45–69), A (70–99), S (100 et plus).
Chaque rang compte 5 niveaux de plus que le précédent : 15, 20, 25, 30.

**Rejeté :**
- L'ancienne échelle en base : D 5, C 10, B 20, A 35, S 50, SS 100. Elle allait avec l'ancienne courbe, round(120 × n^0,6).
- L'échelle de la landing : D 10, C 20, B 40, A 60, S 80, SS 100. Elle ne correspondait pas à la base.
- Le rang SS.

**Pourquoi :** une seule échelle, la même partout (base, tableau de bord, landing).
Avec des écarts croissants, chaque rang prend plus de temps que le précédent, et le prestige monte avec.
SS a été retiré : S demande déjà 20,5 mois à un joueur régulier. Pour prolonger le jeu, on préfère une étoile tous les 25 niveaux (S★ au niveau 125), en V2.

**Où :** `rang_depuis_niveau` (Supabase) · `RANG_SEUILS` dans `lib/progression/config.ts` · type `Rank` dans `types/player.ts`.

## D4 — Passage de rang : automatique en V1, Épreuves ensuite

**Statut :** V1 appliquée. Épreuves recommandées, pas encore construites.

**Choisi (V1) :** le rang se déduit du niveau.

**Recommandé (V2) :** atteindre le niveau seuil ouvre une Épreuve de régularité. Seule sa réussite fait monter de rang.

| Rang visé | Durée | Jours actifs exigés | Exigence spécifique |
|---|---|---|---|
| D | 7 jours | 5 sur 7 | Missions quotidiennes complètes ces 5 jours |
| C | 14 jours | 11 sur 14 | 1 quête difficile dans 3 domaines |
| B | 21 jours | 17 sur 21 | 1 objectif mesurable atteint |
| A | 30 jours | 25 sur 30 | XP dans au moins 5 domaines + 1 quête épique |
| S | 45 jours | 40 sur 45 | 3 objectifs mesurables atteints |

En cas d'échec, nouvel essai après 7 jours. L'XP continue de monter pendant l'Épreuve.

**Rejeté :**
- **Rang glissant**, recalculé chaque mois sur la forme récente : perdre son rang démotive, et le Performance Score mesure déjà la forme du moment.
- **Rang = niveau pour toujours :** le rang n'apporterait rien de plus que le niveau, et il se farme.

**Pourquoi :** le niveau mesure l'effort cumulé, le rang doit prouver la constance.

## D5 — XP, niveau et rang ne baissent jamais

**Statut :** appliqué. Le journal `xp_ledger` refuse toute modification.

**Rejeté :** retirer de l'XP ou des niveaux en pénalité.

**Pourquoi :** une perte d'XP pousse à mentir sur ses missions, ou à abandonner.
Un jour raté se paie sur la série (D9) et sur le Performance Score, pas sur le niveau.
Si la courbe change, un joueur ne doit jamais perdre de niveau.

## D6 — Recaler le système existant plutôt qu'en créer un second

**Statut :** appliqué le 16/10/2026. Nettoyage en attente.

**Choisi :** modifier les fonctions déjà utilisées par l'app (`xp_pour_niveau`, `rang_depuis_niveau`, ajout de `xp_seuil_niveau`).
Leurs signatures sont inchangées, donc `validate_mission` et `progression_snapshot` n'ont pas bougé.

**Rejeté :** le système parallèle créé le 16/10, avec les tables `xp_events` et `level_thresholds`.

**Pourquoi :** l'app avait déjà son journal d'XP (`xp_ledger`) et sa validation côté serveur (`validate_mission`).
Deux systèmes, c'est deux vérités qui finissent par diverger.

**En attente :** 5 tables vides et inutilisées restent en base : `players`, `stats`, `progress`, `xp_events`, `level_thresholds`.
Il faut les supprimer en base et dans `supabase/schema/01_tables.sql` en même temps. Sinon, le prochain `pnpm db:apply` les recrée.

## D7 — La base calcule, le TypeScript recopie la formule

**Statut :** appliqué et vérifié le 16/10/2026.

**Choisi :** la formule vit dans des fonctions SQL. `lib/progression/niveau.ts` en est le miroir exact.
Vérification sur les niveaux 1 à 200 : 0 écart, somme des seuils = 14 687 105.
Le test `scripts/tests/courbe-xp-sql.ts` compare les deux.

**Rejeté :**
- **Une table de 100 seuils (`level_thresholds`) :** c'est une copie de plus à tenir à jour, et elle s'arrête au niveau 100.
- **Un second fichier front (`lib/xp.ts`) :** il a été fusionné dans `lib/progression`, qui reste la seule source côté front.

**Pourquoi :** une formule ne peut pas diverger d'elle-même. La base reste la référence, car c'est elle qui attribue l'XP.

**Où :** migration `0012_courbe_xp_rangs.sql` (en base : `20261016110119`). `supabase/apply` a été aligné pour qu'un `db:apply` ne remette pas l'ancienne courbe.

## D8 — Économie d'XP au temps d'effort, plafond 400 XP/jour

**Statut :** conservé tel quel. Le plafond reste à trancher.

**Choisi (déjà en place) :**
- **Base de calcul :** minutes d'effort, entre 5 et 60 (30 au maximum pour une mission perso).
- **Multiplicateurs :** difficulté (×1,0 / ×1,3 / ×1,6), mission prévue (×1,25), série (jusqu'à ×1,3).
- **Plafond quotidien :** 400 XP.
- **Missions perso :** au plus 1,5 fois l'XP officielle du jour.

**Rejeté :** des montants fixes par difficulté (10 / 25 / 50 / 100 XP), proposés au départ.

**Pourquoi :** l'économie au temps récompense l'effort réel. Elle était déjà codée et testée, et la courbe s'adapte à elle par K (D2).

**Ouvert :** au plafond de 400 XP/jour, S est atteignable en 5 mois. Avec environ 220 XP/jour, il faudrait au moins 9 mois.

## D9 — Séries de jours : boucliers + division par deux

**Statut :** appliqué le 18/10/2026. En base (`serie_depuis_jours`, `serie_etat`, `chaine_jours_of`, `chaine_affichage_of`) et dans l'app (`snapshot`, tuile SÉRIE, journal).

**Règle actuelle (rejetée) :** un jour actif = au moins une mission qui rapporte de l'XP.
Un jour manqué est toujours pardonné. À partir de 2 jours manqués, la série est divisée par deux, puis +1.
Elle a deux défauts :
- **Trop permissive :** un jour sur deux compte comme une série complète.
- **Affichage faux :** le chiffre affiché ne baisse pas pendant une absence. Une série de 60 reste affichée à 60 après 10 jours sans rien faire.

**Proposé :**
- **Série :** nombre de jours validés consécutifs, au fuseau du joueur.
- **Boucliers :** 7 jours validés d'affilée donnent 1 bouclier, stock maximum 2.
- **Jour manqué :** il consomme un bouclier et la série est conservée. Sans bouclier, la série est divisée par 2 (arrondi inférieur). Chaque jour manqué de plus la divise encore.
- **Aujourd'hui :** il ne compte comme manqué qu'à minuit.
- **Bonus XP :** inchangé, +2 % par jour de série d'hier, au maximum +30 %.
- **Record et paliers :** on garde le record. Les paliers 3, 7, 14, 30, 60, 100, 180 et 365 jours sont annoncés dans le journal.

**Autre option rejetée :** remise à zéro stricte au premier jour manqué. La peur de tout perdre fait abandonner.

**Pourquoi :** le plancher de 3 missions quotidiennes garantit qu'il y a toujours quelque chose à faire, donc exiger des jours consécutifs est juste.
Les boucliers absorbent les accidents de la vie. La division par deux fait baisser la série sans tout effacer.

**Reste à faire :** rien. Branchée.

---

## D10 — Tests e2e sur un projet Supabase de test séparé

**Statut :** appliqué le 18/10/2026.

**Choisi :** un projet Supabase dédié, THEMILION-TEST (`wpiyjbdsrmgadjosbhvw`). Les tests e2e et `db:apply:test` ne lisent que `.env.test`. Un garde-fou refuse toute URL, base ou clé service qui ne vise pas ce projet. Le serveur Playwright tourne sur le port 3100, avec ces variables, et ne réutilise jamais le serveur du port 3000. L'inscription passe par l'interface : « Confirm email » est désactivé sur le projet de test, donc la session s'ouvre vraiment. La CI ne teste que le commit construit sur place, et un déploiement ne lance les tests que pour l'environnement Preview.

**Rejeté :** lancer les e2e sur la base de production. Rejeté aussi le repli admin à l'inscription (créer ou confirmer le compte par la clé service, puis se connecter).

**Pourquoi :** le quota d'e-mails de la production ne doit pas servir aux tests. Les données de production ne doivent être ni lues ni écrites. L'inscription doit être réellement testée, pas contournée par un compte créé côté admin.

---

## Décisions ouvertes

- [ ] Durée du rang S : 20,5 mois (K = 40), 12 mois (K = 24) ou 29 mois (K = 56) ?
- [ ] Plafond journalier : 400 XP, ou environ 220 XP ?
- [ ] Épreuves de rang dès la V1, ou en V2 ?
- [x] Séries : valider la règle D9.
- [ ] Supprimer les 5 tables héritées (base + `supabase/schema`).
- [ ] Titres et couleurs des rangs, à caler sur le design system bleu nuit.
