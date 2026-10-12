# Lot 1 — Audit et plan

Décisions de la partie 17 = priorités. Rien n’est implémenté dans ce lot.

## Ce qui existe déjà

| Zone | État |
|---|---|
| Next.js 15 App Router + TS + Tailwind v4 | OK, thème sombre forcé, tokens dans `app/globals.css` |
| Moteur | `lib/moteur/` (planning, rotation, dosage, progression, catalogue, personnalisation, `calculerXP`) |
| App missions | Dashboard client : séances du jour / semaine, ressenti, localStorage (`themilion:moteur`, `themilion:profile`) |
| Landing + liste d’attente | UI OK, envoi e-mail **non branché** |
| Inscription | Formulaire prénom / e-mail / personnage → localStorage, **pas d’auth réelle** |
| Login `/login` | Template Magic UI, anglais, **pas branché** |
| Design System | HUD, mannequins, rang, barre XP |

Le dossier `/Users/willys/Downloads/themilion-moteur` est une **copie plus ancienne** (pas de perso, pas de Cours, pas de `ressource`). **Aucun mode guidé / mixte / libre** n’y figure. On ne le réécrit pas : `lib/moteur/` reste le module métier, déplacé côté serveur au lot 3.

## Écarts (partie 17)

### Stack (17.4)

On **garde** Next.js. On **ajoute** ce qui manque :

- pas de Supabase (Auth / Postgres / RLS)
- pas de PWA
- pas de Stripe ni PostHog
- pas de middleware d’auth

### Données et XP (17.1, 17.5)

- XP, niveau et rang sont **stockés et mutés côté client** (`terminerSeance` écrit dans le profil).
- Pas de `xp_ledger`, pas de RPC de validation, pas de plafond **400 XP / jour**.
- Plafonds perso 30 min et 60 % du jour : **déjà dans le moteur** (`xpSeanceAvecPerso`).
- Une séance moteur = déjà une carte mission, mais **sans table `missions`** ni statuts proposée / acceptée / validée / reportée / abandonnée.

### Domaines (17.2)

Aujourd’hui : **4 attributs** (Finance, Physique, Mental, Social) et **9 domaines** sur la landing. Cible : **6 affichés** via `DOMAINE_AFFICHE` (Finance, Mind, Health, Fitness, Discipline, Life).

### Rang et discipline (17.3)

- Seuils actuels (`lib/system.ts`) : E → D(10) → C(20) → B(40) → A(60) → S(80) → **SS(100)**.
- Le rang est recopié dans le profil ; il ne baisse pas aujourd’hui (on n’enlève jamais d’XP), mais il n’est pas **dérivé** d’un ledger.
- Pas d’**Indice de Discipline** (14 jours, 60 / 25 / 15).
- **Power** : non spécifié dans la partie 17, non implémenté.

### Fuseau (17.6)

`aujourdHuiISO()` utilise le fuseau **du navigateur**, pas `profiles.timezone`.

### Gratuit / Premium, RGPD, analytics, IA, admin (17.7–17.12)

Absents, sauf landing liste d’attente (factice) et liens `/terms` `/privacy` **sans pages**. Pas d’âge minimum, pas d’export / suppression, pas de bandeau consentement, pas de `/admin`, pas de flag bêta, pas de bouton « Signaler ».

## Décisions d’intégration (à valider)

1. **Moteur** : `lib/moteur/` = source de vérité. Import serveur uniquement à partir du lot 3. Pas de réécriture des règles.
2. **Mapping** : 1 séance générée → 1 ligne `missions` + exercices en sous-étapes.
3. **XP** : `calculerXP` + plafonds perso déjà en place + **plafond journalier 400** au moment de l’écriture dans `xp_ledger`.
4. **Dérivés** : niveau, Power, rang lus depuis le ledger, jamais stockés comme source.
5. **Rang** : garder les seuils actuels (dont SS). Le rang ne baisse jamais même si le calcul ponctuel le dirait.
6. **Stack** : Next conservé ; Supabase + RLS au lot 2 ; Stripe / PostHog / PWA / légal au lot 7 ; admin + landing réelle au lot 8.
7. **Modes guidé / mixte / libre** : à ajouter au lot 6 (absents du moteur actuel).
8. **Health / Fitness** : uniquement ce que l’utilisateur saisit, aucun diagnostic.

## Découpage (inchangé)

| Lot | Contenu | Critère de fin |
|---|---|---|
| **1** | Audit + plan | Ce document + tests moteur verts |
| **2** | Supabase, Auth, schéma, RLS, `timezone`, test minuit Paris | Migrations + tests fuseau verts |
| **3** | Moteur serveur, missions, RPC validation, `xp_ledger`, System Log | Une mission validée = 1 ligne ledger, unique, ≤ 400 XP/jour |
| **4** | Onboarding, première victoire, Daily System | Parcours inscrit → 1re mission validée |
| **5** | Dashboard, 6 domaines, compétences, design | `DOMAINE_AFFICHE` + HUD rang + indice |
| **6** | Personnalisation, modes, exercices perso | CRUD perso + modes, plafond 3 compétences en gratuit |
| **7** | Stripe test, RGPD, PostHog, consentement | Prix en config, export / suppression, events |
| **8** | Admin catalogue, landing waitlist réelle, e2e | `verifierCatalogue()` avant save, flag bêta |

## Hors lot 1 (volontairement)

Aucun changement de code métier. Les tests existants du moteur restent la base (`npx tsx --test test.ts`).
