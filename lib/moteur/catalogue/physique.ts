import type { Competence } from "../types";
import { A, D, R, ex } from "./outils";

// =============================================================
// PHYSIQUE — Musculation (choix par zone), Endurance, Mobilité
// Niveau 1 = débutant complet, sans matériel. Niveau 5 = avancé.
// =============================================================

export const musculation: Competence = {
  id: "musculation",
  nom: "Musculation",
  domaine: "Physique",
  focusParSeance: 2, // 2 zones par séance → avec 5 séances, chaque zone revient ~2 fois / semaine
  echauffement: "2 min : 30 s de jumping jacks, 10 rotations d'épaules, 10 squats lents, 30 s de montées de genoux.",
  focus: [
    { id: "abdos", nom: "Abdos", recuperationJours: 1 },
    { id: "epaules", nom: "Épaules", recuperationJours: 1 },
    { id: "bras", nom: "Bras", recuperationJours: 1 },
    { id: "dos", nom: "Dos", recuperationJours: 1 },
    { id: "pectoraux", nom: "Pectoraux", recuperationJours: 1 },
    { id: "jambes", nom: "Jambes", recuperationJours: 1 },
    { id: "fessiers", nom: "Fessiers", recuperationJours: 1 },
  ],
  exercices: [
    // ---------- ABDOS ----------
    ex("abdos", "crunch", "Crunch", 1, R(3, 10, 2), "Bas du dos collé au sol, monte les épaules en soufflant, sans tirer sur la nuque.", ["aucun"], "10 crunchs lents."),
    ex("abdos", "planche-genoux", "Gainage planche sur les genoux", 1, D(3, 20, 5), "Corps aligné des genoux à la tête, nombril rentré, respiration calme.", ["aucun"], "20 s de planche sur les genoux."),
    ex("abdos", "planche", "Gainage planche", 2, D(3, 25, 5), "Coudes sous les épaules, fesses ni hautes ni basses, serre les fessiers.", ["aucun"], "30 s de planche."),
    ex("abdos", "dead-bug", "Dead bug", 2, R(3, 8, 2), "Dos plaqué au sol, tends bras et jambe opposés lentement, puis change.", ["aucun"]),
    ex("abdos", "releves-jambes", "Relevés de jambes allongé", 3, R(3, 8, 2), "Mains sous les fesses, monte les jambes tendues sans cambrer le dos.", ["aucun"]),
    ex("abdos", "planche-laterale", "Planche latérale", 3, D(2, 25, 5), "Par côté. Hanches hautes, corps en ligne droite.", ["aucun"]),
    ex("abdos", "hollow-hold", "Hollow hold", 4, D(3, 20, 5), "Bas du dos collé au sol, bras et jambes tendus et décollés.", ["aucun"]),
    ex("abdos", "releves-suspendu", "Relevés de genoux suspendu", 4, R(3, 8, 2), "Suspendu à la barre, monte les genoux vers la poitrine sans balancer.", ["barre_traction"]),
    ex("abdos", "dragon-flag-negatif", "Dragon flag négatif", 5, R(3, 4, 1, 60), "Descends le corps gainé le plus lentement possible.", ["banc"]),

    // ---------- ÉPAULES ----------
    ex("epaules", "cercles-bras", "Cercles de bras", 1, D(3, 30, 10), "Bras tendus à l'horizontale, petits cercles avant puis arrière.", ["aucun"], "30 s de cercles de bras."),
    ex("epaules", "pompes-pike-genoux", "Pompes piquées sur les genoux", 2, R(3, 6, 2), "Fesses hautes, descends la tête entre les mains.", ["aucun"]),
    ex("epaules", "elevations-laterales", "Élévations latérales", 2, R(3, 10, 2), "Coudes légèrement fléchis, monte jusqu'à l'horizontale, descends lentement.", ["halteres"]),
    ex("epaules", "pompes-pike", "Pompes piquées (pike push-ups)", 3, R(3, 6, 2), "Corps en V inversé, coudes vers l'arrière, front vers le sol.", ["aucun"]),
    ex("epaules", "developpe-halteres", "Développé épaules haltères", 3, R(3, 8, 2, 60), "Assis ou debout, pousse au-dessus de la tête sans cambrer.", ["halteres"]),
    ex("epaules", "pike-pieds-sureleves", "Pompes piquées pieds surélevés", 4, R(3, 5, 1, 60), "Pieds sur une chaise, hanches au-dessus des épaules.", ["aucun"]),
    ex("epaules", "handstand-mur", "Équilibre poirier contre le mur", 5, D(3, 20, 5, 60), "Ventre face au mur, corps gainé, poussée active dans les épaules.", ["aucun"]),

    // ---------- BRAS ----------
    ex("bras", "dips-chaise-genoux", "Dips sur chaise, jambes pliées", 1, R(3, 6, 2), "Coudes vers l'arrière, descends à 90°, remonte en poussant.", ["aucun"], "5 dips sur une chaise."),
    ex("bras", "curl-elastique", "Curl biceps à l'élastique", 1, R(3, 12, 2), "Coudes collés au corps, monte en contrôlant, ne balance pas.", ["elastique"]),
    ex("bras", "pompes-diamant-genoux", "Pompes diamant sur les genoux", 2, R(3, 6, 2), "Mains en losange sous la poitrine, coudes le long du corps.", ["aucun"]),
    ex("bras", "curl-halteres", "Curl biceps haltères", 2, R(3, 10, 2), "Coudes fixes, monte en tournant la paume vers toi.", ["halteres"]),
    ex("bras", "dips-chaise", "Dips sur chaise, jambes tendues", 3, R(3, 8, 2), "Épaules basses, descends sans dépasser 90°.", ["aucun"]),
    ex("bras", "extension-triceps", "Extension triceps au-dessus de la tête", 3, R(3, 10, 2), "Coudes pointés vers le plafond, seuls les avant-bras bougent.", ["halteres"]),
    ex("bras", "pompes-diamant", "Pompes diamant", 4, R(3, 6, 2, 60), "Corps gainé, mains en losange, poitrine jusqu'aux mains.", ["aucun"]),
    ex("bras", "chin-ups", "Tractions supination", 5, R(3, 4, 1, 90), "Paumes vers toi, menton au-dessus de la barre, descente contrôlée.", ["barre_traction"]),

    // ---------- DOS ----------
    ex("dos", "superman", "Superman", 1, R(3, 10, 2), "Allongé sur le ventre, décolle bras et jambes 2 s, redescends.", ["aucun"], "10 supermans."),
    ex("dos", "y-t-w", "Y-T-W au sol", 1, R(2, 6, 2), "Sur le ventre, forme Y puis T puis W avec les bras en serrant les omoplates.", ["aucun"]),
    ex("dos", "tirage-elastique", "Tirage élastique", 2, R(3, 12, 2), "Tire vers le nombril en serrant les omoplates.", ["elastique"]),
    ex("dos", "rowing-table", "Rowing sous une table", 3, R(3, 6, 2, 60), "Allongé sous une table solide, tire la poitrine vers le bord.", ["aucun"]),
    ex("dos", "rowing-haltere", "Rowing haltère un bras", 3, R(3, 10, 2), "Dos plat, tire le coude vers la hanche.", ["halteres"]),
    ex("dos", "tractions-negatives", "Tractions négatives", 4, R(3, 4, 1, 60), "Saute en haut de la barre et descends en 5 secondes.", ["barre_traction"]),
    ex("dos", "tractions", "Tractions pronation", 5, R(3, 4, 1, 90), "Bras tendus au départ, menton au-dessus de la barre.", ["barre_traction"]),

    // ---------- PECTORAUX ----------
    ex("pectoraux", "pompes-mur", "Pompes contre le mur", 1, R(3, 10, 2), "Mains au mur à hauteur d'épaules, corps droit.", ["aucun"], "10 pompes contre le mur."),
    ex("pectoraux", "pompes-genoux", "Pompes sur les genoux", 2, R(3, 8, 2), "Ligne droite genoux-tête, poitrine près du sol.", ["aucun"], "5 pompes sur les genoux."),
    ex("pectoraux", "pompes", "Pompes classiques", 3, R(3, 8, 2, 60), "Mains un peu plus larges que les épaules, gainage total.", ["aucun"], "5 pompes."),
    ex("pectoraux", "developpe-sol", "Développé couché au sol", 3, R(3, 10, 2), "Allongé, pousse les haltères vers le plafond, coudes à 45°.", ["halteres"]),
    ex("pectoraux", "pompes-declinees", "Pompes déclinées", 4, R(3, 8, 2, 60), "Pieds sur une chaise, descente contrôlée.", ["aucun"]),
    ex("pectoraux", "pompes-archer", "Pompes archer", 5, R(3, 4, 1, 60), "Bras large, descends sur un côté, l'autre bras reste tendu.", ["aucun"]),

    // ---------- JAMBES ----------
    ex("jambes", "squat-chaise", "Squat sur chaise", 1, R(3, 10, 2), "Assieds-toi juste en touchant la chaise et relève-toi.", ["aucun"], "10 squats."),
    ex("jambes", "squat", "Squat", 2, R(3, 12, 2), "Pieds largeur d'épaules, genoux dans l'axe des pieds, dos droit.", ["aucun"], "10 squats."),
    ex("jambes", "fentes", "Fentes alternées", 3, R(3, 8, 2), "Grand pas, genou arrière proche du sol, buste droit. Par jambe.", ["aucun"]),
    ex("jambes", "chaise-murale", "Chaise contre le mur", 3, D(3, 30, 10), "Cuisses parallèles au sol, dos collé au mur.", ["aucun"]),
    ex("jambes", "squat-bulgare", "Squat bulgare", 4, R(3, 8, 2, 60), "Pied arrière sur une chaise, descends sur la jambe avant. Par jambe.", ["aucun"]),
    ex("jambes", "squat-saute", "Squats sautés", 4, R(3, 8, 2, 60), "Réception souple, genoux qui ne rentrent pas.", ["aucun"]),
    ex("jambes", "pistol-assiste", "Pistol squat assisté", 5, R(3, 4, 1, 60), "Sur une jambe en te tenant à un support, descends le plus bas possible.", ["aucun"]),

    // ---------- FESSIERS ----------
    ex("fessiers", "pont", "Pont fessier", 1, R(3, 12, 2), "Pousse dans les talons, serre les fessiers 1 s en haut.", ["aucun"], "10 ponts fessiers."),
    ex("fessiers", "donkey-kick", "Donkey kicks", 2, R(3, 10, 2), "À quatre pattes, pousse le talon vers le plafond. Par jambe.", ["aucun"]),
    ex("fessiers", "pont-une-jambe", "Pont fessier une jambe", 3, R(3, 8, 2), "Une jambe tendue en l'air, bassin bien horizontal. Par jambe.", ["aucun"]),
    ex("fessiers", "hip-thrust", "Hip thrust", 4, R(3, 10, 2, 60), "Dos sur un canapé ou banc, haltère sur les hanches, monte et serre.", ["halteres"]),
    ex("fessiers", "souleve-roumain", "Soulevé de terre roumain", 4, R(3, 10, 2, 60), "Jambes semi-tendues, recule les fesses, dos plat.", ["halteres"]),
  ],
};

export const endurance: Competence = {
  id: "endurance",
  nom: "Endurance",
  domaine: "Physique",
  focusParSeance: 1,
  echauffement: "2 min de marche rapide ou de trottinement sur place.",
  focus: [
    { id: "cardio", nom: "Cardio continu", recuperationJours: 0 },
    { id: "intervalles", nom: "Fractionné", recuperationJours: 1 },
  ],
  exercices: [
    ex("cardio", "marche-rapide", "Marche rapide", 1, A(10, 2), "Allure où tu peux parler mais pas chanter.", ["aucun"], "5 min de marche."),
    ex("cardio", "marche-course", "Alternance 1 min course / 2 min marche", 2, A(10, 2), "Course très lente, l'important est de ne pas s'arrêter.", ["aucun"]),
    ex("cardio", "footing", "Footing lent", 3, A(12, 2), "Allure conversation, respiration par le nez si possible.", ["aucun"]),
    ex("cardio", "footing-long", "Footing", 4, A(15, 3), "Allure régulière du début à la fin.", ["aucun"]),
    ex("intervalles", "montees-genoux", "Montées de genoux 20 s / 40 s repos", 1, D(5, 20, 5, 40), "Genoux à hauteur de hanches, bras actifs.", ["aucun"], "1 min de montées de genoux."),
    ex("intervalles", "burpees-tabata", "Burpees 20 s / 10 s repos", 3, D(6, 20, 0, 10), "Version sans pompe si besoin, rythme constant.", ["aucun"]),
    ex("intervalles", "corde", "Corde à sauter 30 s / 30 s", 3, D(6, 30, 5, 30), "Petits sauts sur l'avant des pieds.", ["corde_a_sauter"]),
    ex("intervalles", "sprints", "Sprints 15 s / 45 s marche", 4, D(6, 15, 3, 45), "Effort à 90 %, retour au calme en marchant.", ["aucun"]),
  ],
};

export const mobilite: Competence = {
  id: "mobilite",
  nom: "Mobilité",
  domaine: "Physique",
  focusParSeance: 2,
  focus: [
    { id: "hanches", nom: "Hanches", recuperationJours: 0 },
    { id: "epaules-mob", nom: "Épaules", recuperationJours: 0 },
    { id: "dos-mob", nom: "Colonne", recuperationJours: 0 },
    { id: "ischios", nom: "Arrière des cuisses", recuperationJours: 0 },
  ],
  exercices: [
    ex("hanches", "fente-etirement", "Étirement fléchisseur de hanche", 1, D(2, 30, 10, 10), "En fente, genou arrière au sol, avance le bassin. Par côté.", ["aucun"], "30 s par côté."),
    ex("hanches", "90-90", "Rotation 90/90", 2, R(2, 8, 2, 15), "Assis, jambes en 90°, bascule les genoux d'un côté à l'autre.", ["aucun"]),
    ex("hanches", "squat-profond", "Tenue en squat profond", 3, D(2, 30, 15, 15), "Talons au sol, coudes poussent les genoux.", ["aucun"]),
    ex("epaules-mob", "ouverture-porte", "Étirement pectoraux dans l'encadrement", 1, D(2, 30, 10, 10), "Avant-bras contre le cadre, avance doucement.", ["aucun"], "30 s d'étirement."),
    ex("epaules-mob", "anges-mur", "Anges contre le mur", 2, R(2, 8, 2, 15), "Dos et bras collés au mur, monte et descends les bras.", ["aucun"]),
    ex("dos-mob", "chat-vache", "Chat-vache", 1, R(2, 10, 2, 10), "À quatre pattes, arrondis puis creuse le dos lentement.", ["aucun"], "10 chat-vache."),
    ex("dos-mob", "rotation-thoracique", "Rotation thoracique au sol", 2, R(2, 8, 2, 10), "Allongé sur le côté, ouvre le bras vers l'arrière. Par côté.", ["aucun"]),
    ex("ischios", "pince-debout", "Pince debout jambes fléchies", 1, D(2, 30, 10, 10), "Laisse pendre le buste, genoux souples.", ["aucun"], "30 s de pince."),
    ex("ischios", "etirement-ischio", "Étirement ischio allongé", 2, D(2, 30, 10, 10), "Jambe tendue vers le plafond, tire doucement. Par côté.", ["aucun"]),
  ],
};
