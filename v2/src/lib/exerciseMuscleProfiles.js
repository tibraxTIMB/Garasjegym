// Qualitative exercise-specific roles. Not measured muscle activation or training dose.
// References: ACSM 2026 resistance-training position stand; NSCA Clean Variations;
// ACE Clean and Jerk 2025; Vigotsky et al. 2022.
export const DETAILED_MUSCLE_LABELS={
  "chest": "Bryst",
  "frontDelts": "Framside skulder",
  "sideDelts": "Side skulder",
  "rearDelts": "Bakside skulder",
  "lats": "Breie ryggmuskel",
  "upperBack": "Øvre rygg",
  "lowerBack": "Ryggstrekkjarar",
  "biceps": "Biceps / albuebøy",
  "triceps": "Triceps",
  "forearms": "Underarm / grep",
  "abs": "Rette magemusklar",
  "obliques": "Skrå magemusklar",
  "glutes": "Sete",
  "abductors": "Hofteabduktorar",
  "adductors": "Innside lår",
  "quads": "Framside lår",
  "hamstrings": "Bakside lår",
  "calves": "Leggar",
  "hipFlexors": "Hoftebøyarar",
  "rotatorCuff": "Rotatormansjett"
}
export const EXERCISE_MUSCLE_PROFILES={
 "air squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "abs",
   "lowerBack"
  ]
 },
 "back squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "abs",
   "lowerBack"
  ]
 },
 "goblet squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "abs",
   "lowerBack"
  ]
 },
 "front squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "abs",
   "lowerBack"
  ]
 },
 "dumbbell front squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "abs",
   "lowerBack"
  ]
 },
 "kettlebell front rack squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "abs",
   "lowerBack"
  ]
 },
 "medicine ball bear hug squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "abs",
   "lowerBack"
  ]
 },
 "medicine ball squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "abs",
   "lowerBack"
  ]
 },
 "trx assisted squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "abs",
   "lowerBack"
  ]
 },
 "sit to stand": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "abs",
   "lowerBack"
  ]
 },
 "leg press": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "abs",
   "lowerBack"
  ]
 },
 "bulgarian split squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors",
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "walking lunge": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors",
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "dumbbell reverse lunge": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors",
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "kettlebell reverse lunge": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors",
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "medicine ball reverse lunge": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors",
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "trx reverse lunge": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors",
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "box step up": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors",
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "step up": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors",
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "dumbbell step up": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors",
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "dumbbell box step over": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors",
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "trx assisted pistol squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors",
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "overhead squat": {
  "mode": "strength",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "frontDelts",
   "sideDelts",
   "upperBack",
   "rotatorCuff",
   "abs",
   "obliques",
   "lowerBack"
  ]
 },
 "deadlift": {
  "mode": "strength",
  "primary": [
   "glutes",
   "quads",
   "hamstrings"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "lowerBack",
   "upperBack",
   "lats",
   "forearms",
   "abs",
   "obliques"
  ]
 },
 "kettlebell deadlift markløft": {
  "mode": "strength",
  "primary": [
   "glutes",
   "quads",
   "hamstrings"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "lowerBack",
   "upperBack",
   "lats",
   "forearms",
   "abs",
   "obliques"
  ]
 },
 "kettlebell markløft": {
  "mode": "strength",
  "primary": [
   "glutes",
   "quads",
   "hamstrings"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "lowerBack",
   "upperBack",
   "lats",
   "forearms",
   "abs",
   "obliques"
  ]
 },
 "markløft med manualar": {
  "mode": "strength",
  "primary": [
   "glutes",
   "quads",
   "hamstrings"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "lowerBack",
   "upperBack",
   "lats",
   "forearms",
   "abs",
   "obliques"
  ]
 },
 "markløft med medisinball": {
  "mode": "strength",
  "primary": [
   "glutes",
   "quads",
   "hamstrings"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "lowerBack",
   "upperBack",
   "lats",
   "forearms",
   "abs",
   "obliques"
  ]
 },
 "kettlebell deadlift": {
  "mode": "strength",
  "primary": [
   "glutes",
   "quads",
   "hamstrings"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "lowerBack",
   "upperBack",
   "lats",
   "forearms",
   "abs",
   "obliques"
  ]
 },
 "romanian deadlift": {
  "mode": "strength",
  "primary": [
   "glutes",
   "hamstrings"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "lowerBack",
   "lats",
   "forearms",
   "abs"
  ]
 },
 "dumbbell romanian deadlift": {
  "mode": "strength",
  "primary": [
   "glutes",
   "hamstrings"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "lowerBack",
   "lats",
   "forearms",
   "abs"
  ]
 },
 "good morning": {
  "mode": "strength",
  "primary": [
   "glutes",
   "hamstrings"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "lowerBack",
   "lats",
   "forearms",
   "abs"
  ]
 },
 "kettlebell suitcase deadlift": {
  "mode": "strength",
  "primary": [
   "glutes",
   "quads",
   "hamstrings"
  ],
  "secondary": [
   "adductors"
  ],
  "stabilizers": [
   "lowerBack",
   "obliques",
   "abs",
   "forearms"
  ]
 },
 "glute bridge": {
  "mode": "strength",
  "primary": [
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "adductors"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "hip thrust": {
  "mode": "strength",
  "primary": [
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "adductors"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "trx hamstring curl": {
  "mode": "strength",
  "primary": [
   "hamstrings"
  ],
  "secondary": [
   "glutes"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "calf raise": {
  "mode": "strength",
  "primary": [
   "calves"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "bench press": {
  "mode": "strength",
  "primary": [
   "chest",
   "triceps"
  ],
  "secondary": [
   "frontDelts"
  ],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "bench press manualar flat": {
  "mode": "strength",
  "primary": [
   "chest",
   "triceps"
  ],
  "secondary": [
   "frontDelts"
  ],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "dumbbell floor press": {
  "mode": "strength",
  "primary": [
   "chest",
   "triceps"
  ],
  "secondary": [
   "frontDelts"
  ],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "incline bench press manualar": {
  "mode": "strength",
  "primary": [
   "chest",
   "frontDelts",
   "triceps"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "incline bench press stong": {
  "mode": "strength",
  "primary": [
   "chest",
   "frontDelts",
   "triceps"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "incline dumbbell press": {
  "mode": "strength",
  "primary": [
   "chest",
   "frontDelts",
   "triceps"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "push up": {
  "mode": "strength",
  "primary": [
   "chest",
   "triceps"
  ],
  "secondary": [
   "frontDelts"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "rotatorCuff"
  ]
 },
 "trx push up": {
  "mode": "strength",
  "primary": [
   "chest",
   "triceps"
  ],
  "secondary": [
   "frontDelts"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "rotatorCuff"
  ]
 },
 "trx chest press": {
  "mode": "strength",
  "primary": [
   "chest",
   "triceps"
  ],
  "secondary": [
   "frontDelts"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "rotatorCuff"
  ]
 },
 "dips": {
  "mode": "strength",
  "primary": [
   "chest",
   "triceps"
  ],
  "secondary": [
   "frontDelts"
  ],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "strict press": {
  "mode": "strength",
  "primary": [
   "frontDelts",
   "sideDelts",
   "triceps"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques"
  ]
 },
 "dumbbell shoulder press": {
  "mode": "strength",
  "primary": [
   "frontDelts",
   "sideDelts",
   "triceps"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques"
  ]
 },
 "dumbbell arnold press": {
  "mode": "strength",
  "primary": [
   "frontDelts",
   "sideDelts",
   "triceps"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques"
  ]
 },
 "handstand push up": {
  "mode": "strength",
  "primary": [
   "frontDelts",
   "sideDelts",
   "triceps"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques"
  ]
 },
 "pike push up": {
  "mode": "strength",
  "primary": [
   "frontDelts",
   "sideDelts",
   "triceps"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques"
  ]
 },
 "dumbbell lateral raise": {
  "mode": "strength",
  "primary": [
   "sideDelts"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "cable lateral raise": {
  "mode": "strength",
  "primary": [
   "sideDelts"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "dumbbell front raise": {
  "mode": "strength",
  "primary": [
   "frontDelts"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "dumbbell upright row": {
  "mode": "strength",
  "primary": [
   "sideDelts",
   "upperBack"
  ],
  "secondary": [
   "biceps"
  ],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "dumbbell rear delt fly": {
  "mode": "strength",
  "primary": [
   "rearDelts",
   "upperBack"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "trx reverse fly": {
  "mode": "strength",
  "primary": [
   "rearDelts",
   "upperBack"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "band pull apart": {
  "mode": "strength",
  "primary": [
   "rearDelts",
   "upperBack"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "trx face pull": {
  "mode": "strength",
  "primary": [
   "upperBack",
   "rearDelts"
  ],
  "secondary": [
   "rotatorCuff"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "trx high row": {
  "mode": "strength",
  "primary": [
   "upperBack",
   "rearDelts"
  ],
  "secondary": [
   "rotatorCuff"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "trx y fly": {
  "mode": "strength",
  "primary": [
   "upperBack",
   "rearDelts"
  ],
  "secondary": [
   "sideDelts"
  ],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "barbell row": {
  "mode": "strength",
  "primary": [
   "lats",
   "upperBack",
   "biceps"
  ],
  "secondary": [
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques"
  ]
 },
 "bent over row": {
  "mode": "strength",
  "primary": [
   "lats",
   "upperBack",
   "biceps"
  ],
  "secondary": [
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques"
  ]
 },
 "chest supported dumbbell row": {
  "mode": "strength",
  "primary": [
   "lats",
   "upperBack",
   "biceps"
  ],
  "secondary": [
   "rearDelts"
  ],
  "stabilizers": [
   "forearms"
  ]
 },
 "dumbbell row": {
  "mode": "strength",
  "primary": [
   "lats",
   "upperBack",
   "biceps"
  ],
  "secondary": [
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "obliques",
   "abs"
  ]
 },
 "one arm dumbbell row": {
  "mode": "strength",
  "primary": [
   "lats",
   "upperBack",
   "biceps"
  ],
  "secondary": [
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "obliques",
   "abs"
  ]
 },
 "kettlebell single arm row": {
  "mode": "strength",
  "primary": [
   "lats",
   "upperBack",
   "biceps"
  ],
  "secondary": [
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "obliques",
   "abs"
  ]
 },
 "ring row": {
  "mode": "strength",
  "primary": [
   "lats",
   "upperBack",
   "biceps"
  ],
  "secondary": [
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "abs"
  ]
 },
 "trx row": {
  "mode": "strength",
  "primary": [
   "lats",
   "upperBack",
   "biceps"
  ],
  "secondary": [
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "abs"
  ]
 },
 "pull up": {
  "mode": "strength",
  "primary": [
   "lats",
   "biceps"
  ],
  "secondary": [
   "upperBack",
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "abs",
   "rotatorCuff"
  ]
 },
 "strict pull up": {
  "mode": "strength",
  "primary": [
   "lats",
   "biceps"
  ],
  "secondary": [
   "upperBack",
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "abs",
   "rotatorCuff"
  ]
 },
 "chest to bar pull up": {
  "mode": "strength",
  "primary": [
   "lats",
   "biceps"
  ],
  "secondary": [
   "upperBack",
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "abs",
   "rotatorCuff"
  ]
 },
 "lat pulldown": {
  "mode": "strength",
  "primary": [
   "lats",
   "biceps"
  ],
  "secondary": [
   "upperBack",
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "abs",
   "rotatorCuff"
  ]
 },
 "chin up": {
  "mode": "strength",
  "primary": [
   "lats",
   "biceps"
  ],
  "secondary": [
   "upperBack",
   "rearDelts"
  ],
  "stabilizers": [
   "forearms",
   "abs",
   "rotatorCuff"
  ]
 },
 "dumbbell pullover": {
  "mode": "strength",
  "primary": [
   "lats"
  ],
  "secondary": [
   "chest",
   "triceps"
  ],
  "stabilizers": [
   "abs",
   "rotatorCuff"
  ]
 },
 "biceps curl": {
  "mode": "strength",
  "primary": [
   "biceps"
  ],
  "secondary": [
   "forearms"
  ],
  "stabilizers": []
 },
 "dumbbell biceps curl": {
  "mode": "strength",
  "primary": [
   "biceps"
  ],
  "secondary": [
   "forearms"
  ],
  "stabilizers": []
 },
 "ez bar biceps curl": {
  "mode": "strength",
  "primary": [
   "biceps"
  ],
  "secondary": [
   "forearms"
  ],
  "stabilizers": []
 },
 "barbell biceps curl": {
  "mode": "strength",
  "primary": [
   "biceps"
  ],
  "secondary": [
   "forearms"
  ],
  "stabilizers": []
 },
 "incline dumbbell biceps curl": {
  "mode": "strength",
  "primary": [
   "biceps"
  ],
  "secondary": [
   "forearms"
  ],
  "stabilizers": []
 },
 "alternating dumbbell biceps curl": {
  "mode": "strength",
  "primary": [
   "biceps"
  ],
  "secondary": [
   "forearms"
  ],
  "stabilizers": []
 },
 "preacher ez bar curl": {
  "mode": "strength",
  "primary": [
   "biceps"
  ],
  "secondary": [
   "forearms"
  ],
  "stabilizers": []
 },
 "trx biceps curl": {
  "mode": "strength",
  "primary": [
   "biceps"
  ],
  "secondary": [
   "forearms"
  ],
  "stabilizers": []
 },
 "hammer curl": {
  "mode": "strength",
  "primary": [
   "biceps",
   "forearms"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "dumbbell overhead triceps extension": {
  "mode": "strength",
  "primary": [
   "triceps"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "triceps pushdown": {
  "mode": "strength",
  "primary": [
   "triceps"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "ez bar skull crusher": {
  "mode": "strength",
  "primary": [
   "triceps"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "dumbbell skull crusher": {
  "mode": "strength",
  "primary": [
   "triceps"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "dumbbell triceps kickback": {
  "mode": "strength",
  "primary": [
   "triceps"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "overhead cable triceps extension": {
  "mode": "strength",
  "primary": [
   "triceps"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "trx triceps extension": {
  "mode": "strength",
  "primary": [
   "triceps"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "power clean": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "upperBack"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques",
   "lats"
  ]
 },
 "hang power clean": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "upperBack"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques",
   "lats"
  ]
 },
 "high hang clean": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "upperBack"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques",
   "lats"
  ]
 },
 "kettlebell clean": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "upperBack"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques",
   "lats"
  ]
 },
 "dumbbell hang clean": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "upperBack"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques",
   "lats"
  ]
 },
 "medicine ball clean": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "upperBack"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques",
   "lats"
  ]
 },
 "squat clean": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "upperBack",
   "adductors"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques"
  ]
 },
 "hang squat clean": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "upperBack",
   "adductors"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques"
  ]
 },
 "double dumbbell hang squat clean": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "upperBack",
   "adductors"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques"
  ]
 },
 "clean pull": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "hamstrings",
   "calves"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "lats"
  ]
 },
 "snatch pull": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "hamstrings",
   "calves"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "lats"
  ]
 },
 "kettlebell high pull": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "hamstrings",
   "calves"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "lats"
  ]
 },
 "clean high pull": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "hamstrings",
   "calves"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "lats"
  ]
 },
 "banded clean deadlift": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "hamstrings"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "obliques",
   "lats"
  ]
 },
 "power snatch": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "frontDelts",
   "sideDelts",
   "upperBack",
   "triceps"
  ],
  "stabilizers": [
   "rotatorCuff",
   "lowerBack",
   "abs",
   "obliques",
   "forearms"
  ]
 },
 "snatch": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "frontDelts",
   "sideDelts",
   "upperBack",
   "triceps"
  ],
  "stabilizers": [
   "rotatorCuff",
   "lowerBack",
   "abs",
   "obliques",
   "forearms"
  ]
 },
 "hang power snatch": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "frontDelts",
   "sideDelts",
   "upperBack",
   "triceps"
  ],
  "stabilizers": [
   "rotatorCuff",
   "lowerBack",
   "abs",
   "obliques",
   "forearms"
  ]
 },
 "hang squat snatch": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "frontDelts",
   "sideDelts",
   "upperBack",
   "triceps"
  ],
  "stabilizers": [
   "rotatorCuff",
   "lowerBack",
   "abs",
   "obliques",
   "forearms"
  ]
 },
 "high hang snatch": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "frontDelts",
   "sideDelts",
   "upperBack",
   "triceps"
  ],
  "stabilizers": [
   "rotatorCuff",
   "lowerBack",
   "abs",
   "obliques",
   "forearms"
  ]
 },
 "kettlebell snatch": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "frontDelts",
   "sideDelts",
   "upperBack",
   "triceps"
  ],
  "stabilizers": [
   "rotatorCuff",
   "lowerBack",
   "abs",
   "obliques",
   "forearms"
  ]
 },
 "dumbbell snatch": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings",
   "frontDelts",
   "sideDelts",
   "upperBack",
   "triceps"
  ],
  "stabilizers": [
   "rotatorCuff",
   "lowerBack",
   "abs",
   "obliques",
   "forearms"
  ]
 },
 "push jerk": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves",
   "triceps",
   "frontDelts",
   "sideDelts"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques",
   "lowerBack"
  ]
 },
 "split jerk": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves",
   "triceps",
   "frontDelts",
   "sideDelts"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques",
   "lowerBack"
  ]
 },
 "power jerk": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves",
   "triceps",
   "frontDelts",
   "sideDelts"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques",
   "lowerBack"
  ]
 },
 "squat jerk": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves",
   "triceps",
   "frontDelts",
   "sideDelts"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques",
   "lowerBack"
  ]
 },
 "push press": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "frontDelts",
   "triceps"
  ],
  "secondary": [
   "calves",
   "sideDelts",
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques",
   "lowerBack"
  ]
 },
 "dumbbell push press": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "frontDelts",
   "triceps"
  ],
  "secondary": [
   "calves",
   "sideDelts",
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques",
   "lowerBack"
  ]
 },
 "kettlebell push press": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "frontDelts",
   "triceps"
  ],
  "secondary": [
   "calves",
   "sideDelts",
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques",
   "lowerBack"
  ]
 },
 "alternating dumbbell push jerk": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves",
   "triceps",
   "frontDelts",
   "sideDelts"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques",
   "lowerBack"
  ]
 },
 "clean and jerk": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves",
   "triceps"
  ],
  "secondary": [
   "hamstrings",
   "upperBack",
   "frontDelts",
   "sideDelts"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "rotatorCuff"
  ]
 },
 "kettlebell clean and press": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves",
   "triceps"
  ],
  "secondary": [
   "hamstrings",
   "upperBack",
   "frontDelts",
   "sideDelts"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs",
   "rotatorCuff"
  ]
 },
 "muscle clean": {
  "mode": "power",
  "primary": [
   "upperBack",
   "frontDelts"
  ],
  "secondary": [
   "biceps",
   "quads",
   "glutes"
  ],
  "stabilizers": [
   "forearms",
   "abs",
   "lowerBack"
  ]
 },
 "tall clean": {
  "mode": "technique",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "upperBack",
   "biceps"
  ],
  "stabilizers": [
   "forearms",
   "abs",
   "lowerBack"
  ]
 },
 "muscle snatch": {
  "mode": "power",
  "primary": [
   "upperBack",
   "frontDelts",
   "sideDelts",
   "triceps"
  ],
  "secondary": [
   "quads",
   "glutes"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "forearms"
  ]
 },
 "tall snatch": {
  "mode": "technique",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "upperBack",
   "frontDelts",
   "triceps"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "forearms"
  ]
 },
 "snatch balance": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "triceps",
   "frontDelts",
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "obliques",
   "lowerBack"
  ]
 },
 "kettlebell swing": {
  "mode": "power",
  "primary": [
   "glutes",
   "hamstrings"
  ],
  "secondary": [
   "quads"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs"
  ]
 },
 "kettlebell dead stop swing": {
  "mode": "power",
  "primary": [
   "glutes",
   "hamstrings"
  ],
  "secondary": [
   "quads"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs"
  ]
 },
 "kb swing": {
  "mode": "power",
  "primary": [
   "glutes",
   "hamstrings"
  ],
  "secondary": [
   "quads"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack",
   "abs"
  ]
 },
 "box jump": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "box jump over": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "broad jump": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "max broad jump": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "max broad jumps": {
  "mode": "power",
  "primary": [
   "quads",
   "glutes",
   "calves"
  ],
  "secondary": [
   "hamstrings"
  ],
  "stabilizers": [
   "abductors",
   "abs",
   "obliques"
  ]
 },
 "thruster": {
  "mode": "mixed",
  "primary": [
   "quads",
   "glutes",
   "frontDelts",
   "triceps"
  ],
  "secondary": [
   "calves",
   "upperBack"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "rotatorCuff"
  ]
 },
 "dumbbell thruster": {
  "mode": "mixed",
  "primary": [
   "quads",
   "glutes",
   "frontDelts",
   "triceps"
  ],
  "secondary": [
   "calves",
   "upperBack"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "rotatorCuff"
  ]
 },
 "kettlebell thruster": {
  "mode": "mixed",
  "primary": [
   "quads",
   "glutes",
   "frontDelts",
   "triceps"
  ],
  "secondary": [
   "calves",
   "upperBack"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "rotatorCuff"
  ]
 },
 "wall ball shot": {
  "mode": "mixed",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "frontDelts",
   "triceps",
   "calves"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "rotatorCuff"
  ]
 },
 "wall ball": {
  "mode": "mixed",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "frontDelts",
   "triceps",
   "calves"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "rotatorCuff"
  ]
 },
 "burpee": {
  "mode": "mixed",
  "primary": [
   "chest",
   "triceps",
   "quads",
   "glutes"
  ],
  "secondary": [
   "frontDelts",
   "calves"
  ],
  "stabilizers": [
   "abs",
   "obliques"
  ]
 },
 "burpee box jump over": {
  "mode": "mixed",
  "primary": [
   "chest",
   "triceps",
   "quads",
   "glutes"
  ],
  "secondary": [
   "frontDelts",
   "calves"
  ],
  "stabilizers": [
   "abs",
   "obliques"
  ]
 },
 "burpee over dumbbell": {
  "mode": "mixed",
  "primary": [
   "chest",
   "triceps",
   "quads",
   "glutes"
  ],
  "secondary": [
   "frontDelts",
   "calves"
  ],
  "stabilizers": [
   "abs",
   "obliques"
  ]
 },
 "bar facing burpee over barbell": {
  "mode": "mixed",
  "primary": [
   "chest",
   "triceps",
   "quads",
   "glutes"
  ],
  "secondary": [
   "frontDelts",
   "calves"
  ],
  "stabilizers": [
   "abs",
   "obliques"
  ]
 },
 "lateral burpee over barbell": {
  "mode": "mixed",
  "primary": [
   "chest",
   "triceps",
   "quads",
   "glutes"
  ],
  "secondary": [
   "frontDelts",
   "calves"
  ],
  "stabilizers": [
   "abs",
   "obliques"
  ]
 },
 "burpee over barbell": {
  "mode": "mixed",
  "primary": [
   "chest",
   "triceps",
   "quads",
   "glutes"
  ],
  "secondary": [
   "frontDelts",
   "calves"
  ],
  "stabilizers": [
   "abs",
   "obliques"
  ]
 },
 "burpee broad jump": {
  "mode": "mixed",
  "primary": [
   "chest",
   "triceps",
   "quads",
   "glutes"
  ],
  "secondary": [
   "frontDelts",
   "calves"
  ],
  "stabilizers": [
   "abs",
   "obliques"
  ]
 },
 "burpee to target": {
  "mode": "mixed",
  "primary": [
   "chest",
   "triceps",
   "quads",
   "glutes"
  ],
  "secondary": [
   "frontDelts",
   "calves"
  ],
  "stabilizers": [
   "abs",
   "obliques"
  ]
 },
 "burpee pull up": {
  "mode": "mixed",
  "primary": [
   "chest",
   "triceps",
   "quads",
   "glutes",
   "lats",
   "biceps"
  ],
  "secondary": [
   "calves",
   "upperBack",
   "frontDelts"
  ],
  "stabilizers": [
   "forearms",
   "abs"
  ]
 },
 "devil press": {
  "mode": "mixed",
  "primary": [
   "quads",
   "glutes",
   "frontDelts",
   "triceps",
   "chest"
  ],
  "secondary": [
   "upperBack",
   "hamstrings"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "forearms"
  ]
 },
 "man maker": {
  "mode": "mixed",
  "primary": [
   "chest",
   "triceps",
   "quads",
   "glutes",
   "lats",
   "upperBack",
   "frontDelts"
  ],
  "secondary": [
   "biceps"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "forearms"
  ]
 },
 "medicine ball slam": {
  "mode": "power",
  "primary": [
   "lats",
   "abs"
  ],
  "secondary": [
   "triceps",
   "frontDelts"
  ],
  "stabilizers": [
   "glutes",
   "quads",
   "obliques"
  ]
 },
 "bike erg": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "calves"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "bikeerg": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "calves"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "air bike": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "calves",
   "chest",
   "lats",
   "triceps",
   "biceps",
   "frontDelts"
  ],
  "stabilizers": [
   "abs",
   "forearms"
  ]
 },
 "assault bike": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "calves",
   "chest",
   "lats",
   "triceps",
   "biceps",
   "frontDelts"
  ],
  "stabilizers": [
   "abs",
   "forearms"
  ]
 },
 "cycling": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "calves"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "sykkel": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "calves"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "row": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes",
   "lats",
   "upperBack"
  ],
  "secondary": [
   "hamstrings",
   "biceps"
  ],
  "stabilizers": [
   "lowerBack",
   "forearms",
   "abs"
  ]
 },
 "row erg": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes",
   "lats",
   "upperBack"
  ],
  "secondary": [
   "hamstrings",
   "biceps"
  ],
  "stabilizers": [
   "lowerBack",
   "forearms",
   "abs"
  ]
 },
 "rowerg": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes",
   "lats",
   "upperBack"
  ],
  "secondary": [
   "hamstrings",
   "biceps"
  ],
  "stabilizers": [
   "lowerBack",
   "forearms",
   "abs"
  ]
 },
 "rowing": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes",
   "lats",
   "upperBack"
  ],
  "secondary": [
   "hamstrings",
   "biceps"
  ],
  "stabilizers": [
   "lowerBack",
   "forearms",
   "abs"
  ]
 },
 "roing": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes",
   "lats",
   "upperBack"
  ],
  "secondary": [
   "hamstrings",
   "biceps"
  ],
  "stabilizers": [
   "lowerBack",
   "forearms",
   "abs"
  ]
 },
 "romaskin": {
  "mode": "endurance",
  "primary": [
   "quads",
   "glutes",
   "lats",
   "upperBack"
  ],
  "secondary": [
   "hamstrings",
   "biceps"
  ],
  "stabilizers": [
   "lowerBack",
   "forearms",
   "abs"
  ]
 },
 "skierg": {
  "mode": "endurance",
  "primary": [
   "lats",
   "abs",
   "triceps"
  ],
  "secondary": [
   "glutes",
   "hamstrings"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack"
  ]
 },
 "ski erg": {
  "mode": "endurance",
  "primary": [
   "lats",
   "abs",
   "triceps"
  ],
  "secondary": [
   "glutes",
   "hamstrings"
  ],
  "stabilizers": [
   "forearms",
   "lowerBack"
  ]
 },
 "jogging": {
  "mode": "endurance",
  "primary": [
   "quads",
   "calves",
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "hipFlexors"
  ],
  "stabilizers": [
   "abductors",
   "abs"
  ]
 },
 "run": {
  "mode": "endurance",
  "primary": [
   "quads",
   "calves",
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "hipFlexors"
  ],
  "stabilizers": [
   "abductors",
   "abs"
  ]
 },
 "running": {
  "mode": "endurance",
  "primary": [
   "quads",
   "calves",
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "hipFlexors"
  ],
  "stabilizers": [
   "abductors",
   "abs"
  ]
 },
 "løping": {
  "mode": "endurance",
  "primary": [
   "quads",
   "calves",
   "glutes"
  ],
  "secondary": [
   "hamstrings",
   "hipFlexors"
  ],
  "stabilizers": [
   "abductors",
   "abs"
  ]
 },
 "jump rope": {
  "mode": "endurance",
  "primary": [
   "calves"
  ],
  "secondary": [
   "quads"
  ],
  "stabilizers": [
   "forearms",
   "abs"
  ]
 },
 "double under": {
  "mode": "endurance",
  "primary": [
   "calves"
  ],
  "secondary": [
   "quads"
  ],
  "stabilizers": [
   "forearms",
   "abs"
  ]
 },
 "double unders": {
  "mode": "endurance",
  "primary": [
   "calves"
  ],
  "secondary": [
   "quads"
  ],
  "stabilizers": [
   "forearms",
   "abs"
  ]
 },
 "single under": {
  "mode": "endurance",
  "primary": [
   "calves"
  ],
  "secondary": [
   "quads"
  ],
  "stabilizers": [
   "forearms",
   "abs"
  ]
 },
 "single unders": {
  "mode": "endurance",
  "primary": [
   "calves"
  ],
  "secondary": [
   "quads"
  ],
  "stabilizers": [
   "forearms",
   "abs"
  ]
 },
 "mountain climber": {
  "mode": "endurance",
  "primary": [
   "hipFlexors",
   "abs"
  ],
  "secondary": [
   "quads"
  ],
  "stabilizers": [
   "frontDelts",
   "triceps",
   "obliques"
  ]
 },
 "trx mountain climber": {
  "mode": "endurance",
  "primary": [
   "hipFlexors",
   "abs"
  ],
  "secondary": [
   "quads"
  ],
  "stabilizers": [
   "frontDelts",
   "triceps",
   "obliques"
  ]
 },
 "plank": {
  "mode": "stability",
  "primary": [
   "abs"
  ],
  "secondary": [
   "obliques"
  ],
  "stabilizers": [
   "frontDelts",
   "glutes",
   "quads"
  ]
 },
 "trx plank": {
  "mode": "stability",
  "primary": [
   "abs"
  ],
  "secondary": [
   "obliques"
  ],
  "stabilizers": [
   "frontDelts",
   "glutes",
   "quads"
  ]
 },
 "trx body saw": {
  "mode": "stability",
  "primary": [
   "abs"
  ],
  "secondary": [
   "obliques"
  ],
  "stabilizers": [
   "frontDelts",
   "glutes",
   "quads"
  ]
 },
 "hollow hold": {
  "mode": "stability",
  "primary": [
   "abs"
  ],
  "secondary": [
   "obliques"
  ],
  "stabilizers": [
   "frontDelts",
   "glutes",
   "quads"
  ]
 },
 "pilates hundred": {
  "mode": "stability",
  "primary": [
   "abs"
  ],
  "secondary": [
   "obliques"
  ],
  "stabilizers": [
   "frontDelts",
   "glutes",
   "quads"
  ]
 },
 "side plank": {
  "mode": "stability",
  "primary": [
   "obliques"
  ],
  "secondary": [
   "abductors",
   "abs"
  ],
  "stabilizers": [
   "frontDelts",
   "rotatorCuff"
  ]
 },
 "pilates side plank": {
  "mode": "stability",
  "primary": [
   "obliques"
  ],
  "secondary": [
   "abductors",
   "abs"
  ],
  "stabilizers": [
   "frontDelts",
   "rotatorCuff"
  ]
 },
 "ab wheel rollout": {
  "mode": "stability",
  "primary": [
   "abs"
  ],
  "secondary": [
   "lats"
  ],
  "stabilizers": [
   "frontDelts",
   "obliques"
  ]
 },
 "standing ab wheel rollout": {
  "mode": "stability",
  "primary": [
   "abs"
  ],
  "secondary": [
   "lats"
  ],
  "stabilizers": [
   "frontDelts",
   "obliques"
  ]
 },
 "barbell rollout": {
  "mode": "stability",
  "primary": [
   "abs"
  ],
  "secondary": [
   "lats"
  ],
  "stabilizers": [
   "frontDelts",
   "obliques"
  ]
 },
 "trx fallout": {
  "mode": "stability",
  "primary": [
   "abs"
  ],
  "secondary": [
   "lats"
  ],
  "stabilizers": [
   "frontDelts",
   "obliques"
  ]
 },
 "trx pike": {
  "mode": "stability",
  "primary": [
   "abs",
   "hipFlexors"
  ],
  "secondary": [
   "obliques"
  ],
  "stabilizers": [
   "frontDelts"
  ]
 },
 "trx atomic push up": {
  "mode": "mixed",
  "primary": [
   "chest",
   "triceps",
   "abs",
   "hipFlexors"
  ],
  "secondary": [
   "frontDelts"
  ],
  "stabilizers": [
   "obliques"
  ]
 },
 "dead bug": {
  "mode": "stability",
  "primary": [
   "abs",
   "obliques"
  ],
  "secondary": [
   "hipFlexors"
  ],
  "stabilizers": []
 },
 "pilates double leg stretch": {
  "mode": "stability",
  "primary": [
   "abs",
   "obliques"
  ],
  "secondary": [
   "hipFlexors"
  ],
  "stabilizers": []
 },
 "pilates single leg stretch": {
  "mode": "stability",
  "primary": [
   "abs",
   "obliques"
  ],
  "secondary": [
   "hipFlexors"
  ],
  "stabilizers": []
 },
 "pilates criss cross": {
  "mode": "stability",
  "primary": [
   "abs",
   "obliques"
  ],
  "secondary": [
   "hipFlexors"
  ],
  "stabilizers": []
 },
 "sit up": {
  "mode": "strength",
  "primary": [
   "abs",
   "hipFlexors"
  ],
  "secondary": [
   "obliques"
  ],
  "stabilizers": []
 },
 "pilates roll up": {
  "mode": "strength",
  "primary": [
   "abs",
   "hipFlexors"
  ],
  "secondary": [
   "obliques"
  ],
  "stabilizers": []
 },
 "toes to bar": {
  "mode": "mixed",
  "primary": [
   "abs",
   "hipFlexors"
  ],
  "secondary": [
   "lats"
  ],
  "stabilizers": [
   "forearms",
   "upperBack",
   "rotatorCuff",
   "obliques"
  ]
 },
 "russian twist": {
  "mode": "strength",
  "primary": [
   "obliques"
  ],
  "secondary": [
   "abs"
  ],
  "stabilizers": [
   "hipFlexors"
  ]
 },
 "bird dog": {
  "mode": "stability",
  "primary": [
   "lowerBack",
   "glutes"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "abs",
   "obliques"
  ]
 },
 "pilates swimming": {
  "mode": "stability",
  "primary": [
   "lowerBack",
   "glutes"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "abs",
   "obliques"
  ]
 },
 "dead hang": {
  "mode": "stability",
  "primary": [
   "forearms"
  ],
  "secondary": [],
  "stabilizers": [
   "upperBack",
   "rotatorCuff"
  ]
 },
 "active hang": {
  "mode": "stability",
  "primary": [
   "forearms",
   "lats"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "flexed arm hang": {
  "mode": "stability",
  "primary": [
   "lats",
   "biceps",
   "forearms"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "farmer carry": {
  "mode": "stability",
  "primary": [
   "forearms"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "lowerBack",
   "abductors"
  ]
 },
 "farmers carry": {
  "mode": "stability",
  "primary": [
   "forearms"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "lowerBack",
   "abductors"
  ]
 },
 "farmer s carry": {
  "mode": "stability",
  "primary": [
   "forearms"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "lowerBack",
   "abductors"
  ]
 },
 "farmer s walk": {
  "mode": "stability",
  "primary": [
   "forearms"
  ],
  "secondary": [
   "upperBack"
  ],
  "stabilizers": [
   "abs",
   "obliques",
   "lowerBack",
   "abductors"
  ]
 },
 "wall sit": {
  "mode": "stability",
  "primary": [
   "quads"
  ],
  "secondary": [
   "glutes"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "quad set": {
  "mode": "stability",
  "primary": [
   "quads"
  ],
  "secondary": [
   "glutes"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "band external rotation": {
  "mode": "stability",
  "primary": [
   "rotatorCuff"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "scapular retraction": {
  "mode": "stability",
  "primary": [
   "upperBack"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "pilates clam": {
  "mode": "stability",
  "primary": [
   "abductors"
  ],
  "secondary": [
   "glutes"
  ],
  "stabilizers": [
   "obliques"
  ]
 },
 "pilates side kick": {
  "mode": "stability",
  "primary": [
   "abductors"
  ],
  "secondary": [
   "glutes"
  ],
  "stabilizers": [
   "obliques"
  ]
 },
 "pilates shoulder bridge": {
  "mode": "stability",
  "primary": [
   "glutes",
   "hamstrings"
  ],
  "secondary": [],
  "stabilizers": [
   "abs"
  ]
 },
 "kettlebell windmill": {
  "mode": "stability",
  "primary": [
   "obliques",
   "glutes"
  ],
  "secondary": [
   "frontDelts"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "abductors"
  ]
 },
 "turkish get up": {
  "mode": "stability",
  "primary": [
   "obliques",
   "glutes"
  ],
  "secondary": [
   "frontDelts"
  ],
  "stabilizers": [
   "rotatorCuff",
   "abs",
   "abductors"
  ]
 },
 "pilates swan prep": {
  "mode": "stability",
  "primary": [
   "lowerBack"
  ],
  "secondary": [
   "glutes",
   "upperBack"
  ],
  "stabilizers": [
   "abs"
  ]
 },
 "ankle rocks": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "calf stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "cat cow": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "heel slide": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "hip flexor stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "pilates cat stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "pilates mermaid": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "pilates saw": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "pilates spine stretch forward": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "shoulder pass through": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "thoracic rotation": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "world greatest stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "i t y w": {
  "mode": "stability",
  "primary": [
   "upperBack",
   "rearDelts"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "wall slides": {
  "mode": "stability",
  "primary": [
   "upperBack"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "scapular push ups": {
  "mode": "stability",
  "primary": [
   "chest"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff",
   "abs"
  ]
 },
 "scapular pull ups": {
  "mode": "stability",
  "primary": [
   "lats",
   "upperBack"
  ],
  "secondary": [],
  "stabilizers": [
   "rotatorCuff",
   "forearms"
  ]
 },
 "open book": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "90 90 hip switches": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "hip cars": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "cossack squat": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "deep squat hold": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "jefferson curl": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "shoulder cars": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "wrist circles": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "wrist flexor stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "wrist extension stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "adductor rock back": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "half kneeling ankle dorsiflexion": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "child s pose": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "downward dog": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "low lunge": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "hamstring stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "pec doorway stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "lat stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "couch stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "pigeon stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "ityw rygghev": {
  "mode": "stability",
  "primary": [
   "upperBack",
   "lowerBack"
  ],
  "secondary": [
   "rearDelts"
  ],
  "stabilizers": [
   "rotatorCuff"
  ]
 },
 "thread the needle": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "world s greatest stretch": {
  "mode": "mobility",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "tibialis raise": {
  "mode": "strength",
  "primary": [],
  "secondary": [],
  "stabilizers": []
 },
 "banded lateral walk": {
  "mode": "stability",
  "primary": [
   "abductors",
   "glutes"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "single leg balance": {
  "mode": "stability",
  "primary": [
   "abductors"
  ],
  "secondary": [],
  "stabilizers": [
   "calves",
   "abs"
  ]
 },
 "single leg glute bridge": {
  "mode": "strength",
  "primary": [
   "glutes"
  ],
  "secondary": [
   "hamstrings"
  ],
  "stabilizers": [
   "abs",
   "obliques"
  ]
 },
 "pallof press": {
  "mode": "stability",
  "primary": [
   "obliques",
   "abs"
  ],
  "secondary": [],
  "stabilizers": []
 },
 "single leg rdl": {
  "mode": "strength",
  "primary": [
   "glutes",
   "hamstrings"
  ],
  "secondary": [],
  "stabilizers": [
   "abductors",
   "lowerBack",
   "abs"
  ]
 }
}
export function normalizeExerciseMuscleName(value){return String(value||'').replace(/^\s*\d+\.\s*/,'').replace(/^\s*\d+\s*[×x]\s*/i,'').toLowerCase().replace(/[^a-z0-9æøå]+/g,' ').trim()}
// Exact reviewed synonyms only; do not infer anatomical profiles from loose substrings.
const PROFILE_ALIASES=Object.freeze({benkpress:'bench press',rdl:'romanian deadlift',markløft:'deadlift',planke:'plank',roing:'row',romaskin:'row'})
export function exerciseMuscleProfile(name){const key=normalizeExerciseMuscleName(name);return EXERCISE_MUSCLE_PROFILES[key]||EXERCISE_MUSCLE_PROFILES[PROFILE_ALIASES[key]]||null}
