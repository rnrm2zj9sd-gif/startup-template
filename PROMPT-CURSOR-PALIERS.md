# Prompt Cursor — Paliers, couleur d'interface et montée de niveau

Les fichiers sont déjà dans le projet. Colle ce prompt dans l'agent Cursor (modèle conseillé : Claude Opus) :

```
J'ai ajouté de nouveaux fichiers pour les paliers visuels. Lis d'abord .cursor/rules/themilion-paliers.mdc et design/Paliers.html.

Fichiers ajoutés (ne pas les réécrire, seulement les brancher) :
- lib/tiers.ts : les 8 paliers (Bronze → Galaxie)
- lib/level-up-sound.ts : le son de montée de niveau
- components/level-up/level-up-overlay.tsx, tier-effects.tsx, level-up.css : l'animation
- components/level-up/level-up-provider.tsx : déclenche l'animation quand profile.level augmente
- components/level-up/tier-theme.tsx : colore l'interface selon le palier
- components/level-up/tier-gallery.tsx : la page « Progression visuelle »
- public/character/tiers/ : les 16 images (homme/femme × 8 paliers)

À faire :
1. Dans app/(dashboard)/layout.tsx (le ProfileProvider est déjà dans app/layout.tsx), ajoute <TierTheme /> et entoure le contenu avec <LevelUpProvider>.
2. Remplace le contenu de app/(dashboard)/dashboard/progression/page.tsx par <TierGallery /> avec un titre « Progression visuelle ».
3. Dans components/system (bloc système, personnage, barre XP, avatar) et components/dashboard (sidebar, élément actif, boutons, barres) : remplace les couleurs d'accent codées en dur (violet, bleu #00b4ff…) par la couleur du palier (classes primary ou var(--tier)). Le personnage affiché doit être tierImage(getTier(profile.level), profile.gender).
4. Dans Paramètres, ajoute un interrupteur « Sons » relié à isSoundEnabled() / setSoundEnabled().
5. Ajoute temporairement sur le dashboard un bouton « Tester +1 niveau » (visible seulement en développement) qui appelle useLevelUp().triggerLevelUp(niveau, niveau + 1).
6. Si l'import de "./level-up.css" dans level-up-overlay.tsx pose problème, importe ce fichier dans app/globals.css à la place.
7. Lance le projet, vérifie qu'il compile, et teste une montée de niveau et un changement de palier (par exemple 19 → 20).

Liste les fichiers modifiés.
```
