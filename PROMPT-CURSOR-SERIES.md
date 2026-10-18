# Prompt Cursor — Séries de jours (décision D9)

Les fichiers de code sont déjà dans le projet. Colle le prompt ci-dessous dans l'agent Cursor.

---

Implémente la règle de série D9 de `DECISIONS.md`. La règle est déjà codée et testée : ne change pas sa logique, branche-la.

## Ce qui est déjà en place (ne pas modifier la logique)

- `lib/progression/serie.ts` : `etatSerie(joursValides, aujourdHui)` et le type `SerieEtat`.
- `lib/progression/serie.test.ts` : 11 tests.
- `scripts/tests/serie-sql.ts` : compare `public.serie_depuis_jours` au TypeScript sur 300 séquences.

Ne touche ni à `lib/moteur` ni à `lib/progression/chaine.ts`. Ils gardent l'ancienne règle locale du moteur, que vérifient `progression.test.ts` et `lot3-spec.ts`.

## 1. Base de données (`supabase/schema/` est la seule source, puis `pnpm db:apply`)

**a) `02_moteur_xp.sql`** : remplace les deux fonctions `chaine_jours_of` et `chaine_affichage_of` par ce bloc, à leur place et dans cet ordre (les signatures ne changent pas) :

```sql
-- Séries de jours : règle pure (miroir exact de lib/progression/serie.ts)
create or replace function public.serie_depuis_jours(p_jours date[], p_jour date)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  jours date[] := array(
    select distinct j from unnest(coalesce(p_jours, '{}'::date[])) as j
    where j <= p_jour order by 1
  );
  d date := jours[1];
  serie integer := 0;
  boucliers integer := 0;
  compteur integer := 0;
  meilleure integer := 0;
  evt jsonb := null;
  serie_hier integer;
  valide_aujourdhui boolean;
  bouclier_gagne boolean := false;
  nouveau_record boolean := false;
  apres integer;
begin
  while d is not null and d < p_jour loop
    if d = any (jours) then
      serie := serie + 1;
      compteur := compteur + 1;
      if compteur >= 7 then
        boucliers := least(2, boucliers + 1);
        compteur := 0;
      end if;
      meilleure := greatest(meilleure, serie);
    else
      if serie > 0 then
        if boucliers > 0 then
          boucliers := boucliers - 1;
          evt := jsonb_build_object('type', 'bouclier', 'jour', d, 'serie', serie);
        else
          apres := serie / 2;
          evt := jsonb_build_object('type', 'moitie', 'jour', d, 'avant', serie, 'apres', apres);
          serie := apres;
        end if;
      end if;
      compteur := 0;
    end if;
    d := d + 1;
  end loop;

  serie_hier := serie;
  valide_aujourdhui := p_jour = any (jours);
  if valide_aujourdhui then
    serie := serie + 1;
    compteur := compteur + 1;
    if compteur >= 7 then
      bouclier_gagne := boucliers < 2;
      boucliers := least(2, boucliers + 1);
      compteur := 0;
    end if;
    nouveau_record := serie > meilleure;
    meilleure := greatest(meilleure, serie);
  end if;

  return jsonb_build_object(
    'serie', serie,
    'serieHier', serie_hier,
    'aujourdHuiValide', valide_aujourdhui,
    'boucliers', boucliers,
    'bouclierMax', 2,
    'joursVersBouclier', 7 - compteur,
    'bouclierGagneAujourdhui', bouclier_gagne,
    'record', meilleure,
    'nouveauRecord', nouveau_record,
    'dernierEvenement', evt,
    'evenementHier', coalesce((evt->>'jour')::date = p_jour - 1, false),
    'prochainPalier', (select min(p) from unnest(array[3, 7, 14, 30, 60, 100, 180, 365]) as p where p > serie),
    'bonusXpPct', least(30, 2 * serie_hier)
  );
end;
$$;

-- Série d'un joueur, depuis son journal d'XP (jour local du joueur)
create or replace function public.serie_etat(p_user_id uuid, p_tz text, p_jour date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.serie_depuis_jours(
    array(
      select distinct public.jour_local(l.created_at, p_tz)
      from public.xp_ledger l
      where l.user_id = p_user_id
    ),
    p_jour
  );
$$;

-- Série d'hier : sert au bonus XP du jour (signature inchangée)
create or replace function public.chaine_jours_of(p_user_id uuid, p_tz text, p_jour date)
returns integer
language sql
stable
set search_path = ''
as $$
  select (public.serie_etat(p_user_id, p_tz, p_jour)->>'serieHier')::integer;
$$;

-- Série affichée : celle d'hier, +1 si aujourd'hui est validé (signature inchangée)
create or replace function public.chaine_affichage_of(p_user_id uuid, p_tz text, p_jour date)
returns integer
language sql
stable
set search_path = ''
as $$
  select (public.serie_etat(p_user_id, p_tz, p_jour)->>'serie')::integer;
$$;
```

**b) `03_garde_fous.sql`** : ajoute ce bloc après les autres triggers :

```sql
-- Journal : palier de série atteint et bouclier gagné, à la première XP du jour
create or replace function public._serie_journal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text;
  jour date;
  e jsonb;
  s integer;
begin
  select p.timezone into tz from public.profiles p where p.id = new.user_id;
  jour := public.jour_local(new.created_at, tz);

  if exists (
    select 1 from public.xp_ledger l
    where l.user_id = new.user_id
      and l.id <> new.id
      and public.jour_local(l.created_at, tz) = jour
  ) then
    return null;
  end if;

  e := public.serie_etat(new.user_id, tz, jour);
  s := (e->>'serie')::integer;

  if s = any (array[3, 7, 14, 30, 60, 100, 180, 365]) then
    insert into public.system_log (user_id, type, payload)
    values (new.user_id, 'serie_palier',
            jsonb_build_object('jours', s, 'nouveauRecord', (e->>'nouveauRecord')::boolean));
  end if;

  if (e->>'bouclierGagneAujourdhui')::boolean then
    insert into public.system_log (user_id, type, payload)
    values (new.user_id, 'bouclier_gagne', jsonb_build_object('boucliers', (e->>'boucliers')::integer));
  end if;

  return null;
end;
$$;

drop trigger if exists xp_ledger_serie on public.xp_ledger;
create trigger xp_ledger_serie
  after insert on public.xp_ledger
  for each row execute function public._serie_journal();
```

**c) `04_actions.sql`** : dans `progression_snapshot`, ajoute `'serie', public.serie_etat(uid, tz, jour),` juste avant `'chaineJours', ...`.

**d) `05_securite.sql`** :
- Avec les autres `revoke`, ferme les nouvelles fonctions comme les fonctions de chaîne :
  ```sql
  revoke all on function public.serie_depuis_jours(date[], date) from public, anon, authenticated;
  revoke all on function public.serie_etat(uuid, text, date) from public, anon, authenticated;
  revoke all on function public._serie_journal() from public, anon, authenticated;
  ```
- Dans le tableau de vérification final, ajoute ces trois lignes :
  ```sql
  ('fonction', 'serie_etat', exists (select 1 from pg_proc where proname = 'serie_etat')),
  ('trigger', 'xp_ledger_serie', exists (select 1 from pg_trigger where tgname = 'xp_ledger_serie')),
  ('droit', 'serie fermée', not has_function_privilege('authenticated', 'public.serie_etat(uuid, text, date)', 'EXECUTE')),
  ```

**e)** Lance `pnpm db:apply`. Les 6 fichiers doivent passer OK et toutes les lignes de vérification doivent être présentes.

## 2. Application

**a) `lib/progression/types.ts`** : ajoute `serie: SerieEtat;` à `ProgressionSnapshot` (`import type { SerieEtat } from "./serie";`).

**b) `lib/progression/snapshot.ts`** : remplace `chaineDepuisJours(joursLedger)` par `const serie = etatSerie(joursLedger, aujourdHui);`. Renvoie `chaineJours: serie.serie` (pour la compatibilité) et `serie`. Retire l'import de `chaineDepuisJours`.

**c) `lib/progression/journal.ts`** : ajoute deux libellés dans `texteJournal` :
- `serie_palier` → `Série de ${p.jours} jours` + ` · nouveau record` si `p.nouveauRecord` ;
- `bouclier_gagne` → `Bouclier gagné (${p.boucliers}/2)`.

**d) Interface :**
- Dans `components/dashboard/progression-stats.tsx`, ajoute un bloc SÉRIE dans le style des blocs voisins.
- Sur `/dashboard/progression`, remplace « Chaîne {etat.chaineJours} j », qui vient du moteur local, par `snap.serie.serie`.

Le bloc SÉRIE affiche :
- **Le nombre :** `serie` jours (« jour » au singulier).
- **L'état du jour :** si `aujourdHuiValide`, « Validée aujourd'hui ». Sinon, si `serie > 0`, « À valider avant minuit ». Sinon, « Valide une mission pour lancer ta série ».
- **Les boucliers :** `boucliers` sur `bouclierMax`, en icônes `Shield` de lucide-react avec `aria-label`. Dessous : « Prochain bouclier dans `joursVersBouclier` j », ou « Stock plein » si `boucliers === bouclierMax`.
- **Le message de la veille,** seulement si `evenementHier` :
  - type `bouclier` → « Bouclier utilisé hier : série protégée » ;
  - type `moitie` → « Jour manqué hier : série `avant` → `apres` ».
- **Une ligne discrète :** « Record `record` j · Bonus XP +`bonusXpPct` % · Prochain palier `prochainPalier` j ». Sans le palier s'il vaut `null`.

## 3. Tests

- Ajoute `lib/progression/serie.test.ts` et `scripts/tests/serie-sql.ts` au script `test` de `package.json`.
- Lance `pnpm test` et `npx tsc --noEmit`. Corrige seulement les erreurs que tu as introduites.

## 4. Journal des décisions

Dans `DECISIONS.md`, passe D9 à « Appliqué » avec la date du jour (tableau du haut + statut de D9) et coche « Séries : valider la règle D9 ».

## 5. Compte rendu

Donne-moi :
- la liste des fichiers modifiés ;
- la sortie de `pnpm db:apply` (OK ou erreur par fichier, et le tableau de vérification) ;
- le résultat de `pnpm test` et de `tsc`.
