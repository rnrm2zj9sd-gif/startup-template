# Schéma THEMILION

`schema/` est la seule source. Pour modifier la base, éditer le fichier du thème puis `pnpm db:apply`.

Jamais de collage dans l’éditeur SQL de Supabase.

Jamais de modification directe de la base par un autre outil.

`migrations/` est l’historique. `_archive/apply/` n’est plus exécuté.
