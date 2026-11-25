// Ordinal anatomical estimates, not percentages, measured force, recovery or hypertrophy.
// Review basis: exercise biomechanics and shared movement families; not independently clinically validated.
// References: https://pubmed.ncbi.nlm.nih.gov/31895283/ (leg press/squat);
// https://pubmed.ncbi.nlm.nih.gov/38665162/ (loaded carry);
// https://www.nsca.com/globalassets/about/position-statements/weighlifting-for-sports-performance.pdf (weightlifting);
// https://pubmed.ncbi.nlm.nih.gov/29354060/ (EMG interpretation limitations).
import {normalizeExerciseMuscleName,exerciseMuscleProfile,DETAILED_MUSCLE_LABELS} from './exerciseMuscleProfiles.js'
export const MUSCLE_GRADE_LABELS=['Ikkje markert','Liten','Moderat','Stor','Svært stor']
export const MUSCLE_GRADE_COLORS=['#62686e','#819dad','#ddc45c','#ed963a','#e25240']
export const MUSCLE_REGIONS={Bein:['quads','hamstrings','calves'],Hofte:['glutes','adductors','abductors','hipFlexors'],Kjerne:['abs','obliques'],Rygg:['lats','upperBack','lowerBack'],Skuldrer:['frontDelts','sideDelts','rearDelts','rotatorCuff'],Bryst:['chest'],Armar:['biceps','triceps','forearms']}
export const EXERCISE_MUSCLE_GRADES={
 "air squat": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abs": 2,
  "lowerBack": 2,
  "hamstrings": 1,
  "calves": 1
 },
 "back squat": {
  "quads": 4,
  "glutes": 4,
  "lowerBack": 3,
  "adductors": 3,
  "abs": 2,
  "hamstrings": 2,
  "calves": 1
 },
 "goblet squat": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abs": 2,
  "lowerBack": 2,
  "hamstrings": 1,
  "calves": 1
 },
 "front squat": {
  "quads": 4,
  "glutes": 3,
  "upperBack": 3,
  "abs": 3,
  "lowerBack": 2,
  "adductors": 2,
  "hamstrings": 1,
  "calves": 1
 },
 "dumbbell front squat": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abs": 2,
  "lowerBack": 2,
  "hamstrings": 1,
  "calves": 1
 },
 "kettlebell front rack squat": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abs": 2,
  "lowerBack": 2,
  "hamstrings": 1,
  "calves": 1
 },
 "medicine ball bear hug squat": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abs": 2,
  "lowerBack": 2,
  "hamstrings": 1,
  "calves": 1
 },
 "medicine ball squat": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abs": 2,
  "lowerBack": 2,
  "hamstrings": 1,
  "calves": 1
 },
 "trx assisted squat": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abs": 2,
  "lowerBack": 1
 },
 "sit to stand": {
  "quads": 4,
  "glutes": 4,
  "adductors": 2,
  "abs": 2
 },
 "leg press": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "hamstrings": 2,
  "calves": 2,
  "abs": 1
 },
 "bulgarian split squat": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abductors": 3,
  "hamstrings": 2,
  "abs": 2,
  "obliques": 2,
  "calves": 1
 },
 "walking lunge": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abductors": 3,
  "hamstrings": 2,
  "abs": 2,
  "obliques": 2,
  "calves": 1
 },
 "dumbbell reverse lunge": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abductors": 3,
  "hamstrings": 2,
  "abs": 2,
  "obliques": 2,
  "calves": 1
 },
 "kettlebell reverse lunge": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abductors": 3,
  "hamstrings": 2,
  "abs": 2,
  "obliques": 2,
  "calves": 1
 },
 "medicine ball reverse lunge": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abductors": 3,
  "hamstrings": 2,
  "abs": 2,
  "obliques": 2,
  "calves": 1
 },
 "trx reverse lunge": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abductors": 3,
  "hamstrings": 2,
  "abs": 2,
  "obliques": 2,
  "calves": 1
 },
 "box step up": {
  "quads": 4,
  "glutes": 4,
  "abductors": 3,
  "hamstrings": 2,
  "adductors": 2,
  "abs": 2,
  "calves": 1,
  "obliques": 1
 },
 "step up": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abductors": 3,
  "hamstrings": 2,
  "abs": 2,
  "obliques": 2,
  "calves": 1
 },
 "dumbbell step up": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abductors": 3,
  "hamstrings": 2,
  "abs": 2,
  "obliques": 2,
  "calves": 1
 },
 "dumbbell box step over": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abductors": 3,
  "hamstrings": 2,
  "abs": 2,
  "obliques": 2,
  "calves": 1
 },
 "trx assisted pistol squat": {
  "quads": 4,
  "glutes": 4,
  "adductors": 3,
  "abductors": 3,
  "hamstrings": 2,
  "abs": 2,
  "obliques": 2,
  "calves": 1
 },
 "overhead squat": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 3,
  "sideDelts": 3,
  "upperBack": 3,
  "abs": 3,
  "lowerBack": 3,
  "adductors": 2,
  "rotatorCuff": 2,
  "obliques": 2
 },
 "deadlift": {
  "glutes": 4,
  "lowerBack": 4,
  "quads": 3,
  "hamstrings": 3,
  "forearms": 3,
  "upperBack": 2,
  "lats": 2,
  "abs": 2,
  "adductors": 2,
  "obliques": 1
 },
 "kettlebell deadlift markløft": {
  "glutes": 4,
  "lowerBack": 4,
  "quads": 3,
  "hamstrings": 3,
  "forearms": 3,
  "upperBack": 2,
  "lats": 2,
  "abs": 2,
  "adductors": 2,
  "obliques": 1
 },
 "kettlebell markløft": {
  "glutes": 4,
  "lowerBack": 4,
  "quads": 3,
  "hamstrings": 3,
  "forearms": 3,
  "upperBack": 2,
  "lats": 2,
  "abs": 2,
  "adductors": 2,
  "obliques": 1
 },
 "markløft med manualar": {
  "glutes": 4,
  "lowerBack": 4,
  "quads": 3,
  "hamstrings": 3,
  "forearms": 3,
  "upperBack": 2,
  "lats": 2,
  "abs": 2,
  "adductors": 2,
  "obliques": 1
 },
 "markløft med medisinball": {
  "glutes": 4,
  "lowerBack": 4,
  "quads": 3,
  "hamstrings": 3,
  "forearms": 3,
  "upperBack": 2,
  "lats": 2,
  "abs": 2,
  "adductors": 2,
  "obliques": 1
 },
 "kettlebell deadlift": {
  "glutes": 4,
  "lowerBack": 4,
  "quads": 3,
  "hamstrings": 3,
  "forearms": 3,
  "upperBack": 2,
  "lats": 2,
  "abs": 2,
  "adductors": 2,
  "obliques": 1
 },
 "romanian deadlift": {
  "glutes": 4,
  "hamstrings": 4,
  "lowerBack": 3,
  "lats": 2,
  "forearms": 2,
  "abs": 2,
  "adductors": 1
 },
 "dumbbell romanian deadlift": {
  "glutes": 4,
  "hamstrings": 4,
  "lowerBack": 3,
  "lats": 2,
  "forearms": 2,
  "abs": 2,
  "adductors": 1
 },
 "good morning": {
  "hamstrings": 4,
  "glutes": 4,
  "lowerBack": 3,
  "abs": 2,
  "adductors": 2,
  "upperBack": 1
 },
 "kettlebell suitcase deadlift": {
  "glutes": 4,
  "quads": 4,
  "hamstrings": 3,
  "lowerBack": 3,
  "obliques": 3,
  "forearms": 3,
  "abs": 2,
  "adductors": 2
 },
 "glute bridge": {
  "glutes": 4,
  "hamstrings": 3,
  "adductors": 2,
  "abs": 2
 },
 "hip thrust": {
  "glutes": 4,
  "hamstrings": 3,
  "adductors": 2,
  "abs": 2
 },
 "trx hamstring curl": {
  "hamstrings": 4,
  "glutes": 3,
  "abs": 2
 },
 "calf raise": {
  "calves": 4
 },
 "bench press": {
  "chest": 4,
  "triceps": 3,
  "frontDelts": 3,
  "rotatorCuff": 2,
  "upperBack": 1
 },
 "bench press manualar flat": {
  "chest": 4,
  "triceps": 3,
  "frontDelts": 3,
  "rotatorCuff": 2,
  "upperBack": 1
 },
 "dumbbell floor press": {
  "chest": 4,
  "triceps": 4,
  "frontDelts": 3,
  "rotatorCuff": 2
 },
 "dips": {
  "chest": 4,
  "triceps": 4,
  "frontDelts": 3,
  "rotatorCuff": 2
 },
 "incline bench press manualar": {
  "chest": 4,
  "frontDelts": 4,
  "triceps": 3,
  "rotatorCuff": 2
 },
 "incline bench press stong": {
  "chest": 4,
  "frontDelts": 4,
  "triceps": 3,
  "rotatorCuff": 2
 },
 "incline dumbbell press": {
  "chest": 4,
  "frontDelts": 4,
  "triceps": 3,
  "rotatorCuff": 2
 },
 "push up": {
  "chest": 4,
  "triceps": 3,
  "frontDelts": 3,
  "abs": 2,
  "obliques": 2,
  "rotatorCuff": 2
 },
 "trx push up": {
  "chest": 4,
  "triceps": 4,
  "frontDelts": 3,
  "abs": 3,
  "obliques": 2,
  "rotatorCuff": 2
 },
 "trx chest press": {
  "chest": 4,
  "triceps": 3,
  "frontDelts": 3,
  "abs": 2,
  "obliques": 2,
  "rotatorCuff": 2
 },
 "strict press": {
  "frontDelts": 4,
  "triceps": 4,
  "sideDelts": 3,
  "upperBack": 2,
  "rotatorCuff": 2,
  "abs": 2,
  "obliques": 1
 },
 "dumbbell shoulder press": {
  "frontDelts": 4,
  "triceps": 4,
  "sideDelts": 3,
  "upperBack": 2,
  "rotatorCuff": 2,
  "abs": 2,
  "obliques": 1
 },
 "dumbbell arnold press": {
  "frontDelts": 4,
  "triceps": 4,
  "sideDelts": 3,
  "upperBack": 2,
  "rotatorCuff": 2,
  "abs": 2,
  "obliques": 1
 },
 "handstand push up": {
  "frontDelts": 4,
  "triceps": 4,
  "sideDelts": 3,
  "upperBack": 3,
  "abs": 2,
  "rotatorCuff": 2,
  "obliques": 1
 },
 "pike push up": {
  "frontDelts": 4,
  "triceps": 4,
  "sideDelts": 3,
  "upperBack": 2,
  "rotatorCuff": 2,
  "abs": 2,
  "obliques": 1
 },
 "dumbbell lateral raise": {
  "sideDelts": 4,
  "upperBack": 3,
  "rotatorCuff": 2
 },
 "cable lateral raise": {
  "sideDelts": 4,
  "upperBack": 3,
  "rotatorCuff": 2
 },
 "dumbbell front raise": {
  "frontDelts": 4,
  "rotatorCuff": 2
 },
 "dumbbell upright row": {
  "sideDelts": 4,
  "upperBack": 4,
  "biceps": 3,
  "rotatorCuff": 2
 },
 "dumbbell rear delt fly": {
  "rearDelts": 4,
  "upperBack": 3,
  "rotatorCuff": 2
 },
 "trx reverse fly": {
  "rearDelts": 4,
  "upperBack": 3,
  "rotatorCuff": 2
 },
 "band pull apart": {
  "rearDelts": 4,
  "upperBack": 3,
  "rotatorCuff": 2
 },
 "trx face pull": {
  "rearDelts": 4,
  "upperBack": 4,
  "rotatorCuff": 3,
  "abs": 2
 },
 "trx high row": {
  "upperBack": 4,
  "rearDelts": 4,
  "biceps": 3,
  "rotatorCuff": 2,
  "abs": 2
 },
 "trx y fly": {
  "upperBack": 4,
  "rearDelts": 3,
  "sideDelts": 3,
  "rotatorCuff": 2
 },
 "barbell row": {
  "lats": 4,
  "upperBack": 4,
  "biceps": 3,
  "lowerBack": 3,
  "rearDelts": 2,
  "forearms": 2,
  "abs": 2,
  "obliques": 1
 },
 "bent over row": {
  "lats": 4,
  "upperBack": 4,
  "biceps": 3,
  "lowerBack": 3,
  "rearDelts": 2,
  "forearms": 2,
  "abs": 2,
  "obliques": 1
 },
 "chest supported dumbbell row": {
  "lats": 4,
  "upperBack": 4,
  "biceps": 3,
  "rearDelts": 3,
  "forearms": 2
 },
 "dumbbell row": {
  "lats": 4,
  "upperBack": 4,
  "biceps": 3,
  "rearDelts": 3,
  "forearms": 2,
  "obliques": 2,
  "abs": 2
 },
 "one arm dumbbell row": {
  "lats": 4,
  "upperBack": 4,
  "biceps": 3,
  "rearDelts": 3,
  "forearms": 2,
  "obliques": 2,
  "abs": 2
 },
 "kettlebell single arm row": {
  "lats": 4,
  "upperBack": 4,
  "biceps": 3,
  "rearDelts": 3,
  "forearms": 2,
  "obliques": 2,
  "abs": 2
 },
 "ring row": {
  "lats": 4,
  "upperBack": 4,
  "biceps": 3,
  "rearDelts": 2,
  "forearms": 2,
  "abs": 2
 },
 "trx row": {
  "lats": 4,
  "upperBack": 4,
  "biceps": 3,
  "rearDelts": 2,
  "forearms": 2,
  "abs": 2
 },
 "pull up": {
  "lats": 4,
  "biceps": 4,
  "upperBack": 3,
  "forearms": 3,
  "rearDelts": 2,
  "abs": 2,
  "rotatorCuff": 2
 },
 "strict pull up": {
  "lats": 4,
  "biceps": 4,
  "upperBack": 3,
  "forearms": 3,
  "rearDelts": 2,
  "abs": 2,
  "rotatorCuff": 2
 },
 "chest to bar pull up": {
  "lats": 4,
  "biceps": 4,
  "upperBack": 3,
  "forearms": 3,
  "rearDelts": 2,
  "abs": 2,
  "rotatorCuff": 2
 },
 "lat pulldown": {
  "lats": 4,
  "biceps": 4,
  "upperBack": 3,
  "forearms": 3,
  "rearDelts": 2,
  "abs": 2,
  "rotatorCuff": 2
 },
 "chin up": {
  "lats": 4,
  "biceps": 4,
  "forearms": 3,
  "upperBack": 3,
  "abs": 2,
  "rotatorCuff": 2,
  "rearDelts": 1
 },
 "dumbbell pullover": {
  "lats": 4,
  "chest": 3,
  "triceps": 2,
  "abs": 2,
  "rotatorCuff": 2
 },
 "biceps curl": {
  "biceps": 4,
  "forearms": 3
 },
 "dumbbell biceps curl": {
  "biceps": 4,
  "forearms": 3
 },
 "ez bar biceps curl": {
  "biceps": 4,
  "forearms": 3
 },
 "barbell biceps curl": {
  "biceps": 4,
  "forearms": 3
 },
 "incline dumbbell biceps curl": {
  "biceps": 4,
  "forearms": 3
 },
 "alternating dumbbell biceps curl": {
  "biceps": 4,
  "forearms": 3
 },
 "preacher ez bar curl": {
  "biceps": 4,
  "forearms": 3
 },
 "trx biceps curl": {
  "biceps": 4,
  "forearms": 3
 },
 "hammer curl": {
  "biceps": 4,
  "forearms": 4
 },
 "dumbbell overhead triceps extension": {
  "triceps": 4
 },
 "triceps pushdown": {
  "triceps": 4
 },
 "ez bar skull crusher": {
  "triceps": 4
 },
 "dumbbell skull crusher": {
  "triceps": 4
 },
 "dumbbell triceps kickback": {
  "triceps": 4
 },
 "overhead cable triceps extension": {
  "triceps": 4
 },
 "trx triceps extension": {
  "triceps": 4
 },
 "power clean": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "forearms": 2,
  "lowerBack": 2,
  "abs": 2,
  "obliques": 1,
  "lats": 1
 },
 "hang power clean": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "forearms": 2,
  "lowerBack": 2,
  "abs": 2,
  "obliques": 1,
  "lats": 1
 },
 "high hang clean": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "forearms": 2,
  "lowerBack": 2,
  "abs": 2,
  "obliques": 1,
  "lats": 1
 },
 "kettlebell clean": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "forearms": 2,
  "lowerBack": 2,
  "abs": 2,
  "obliques": 1,
  "lats": 1
 },
 "dumbbell hang clean": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "forearms": 2,
  "lowerBack": 2,
  "abs": 2,
  "obliques": 1,
  "lats": 1
 },
 "medicine ball clean": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "forearms": 2,
  "lowerBack": 2,
  "abs": 2,
  "obliques": 1,
  "lats": 1
 },
 "squat clean": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "upperBack": 3,
  "adductors": 3,
  "calves": 3,
  "forearms": 2,
  "lowerBack": 2,
  "abs": 2,
  "obliques": 1
 },
 "hang squat clean": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "upperBack": 3,
  "adductors": 3,
  "calves": 3,
  "forearms": 2,
  "lowerBack": 2,
  "abs": 2,
  "obliques": 1
 },
 "double dumbbell hang squat clean": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "upperBack": 3,
  "adductors": 3,
  "calves": 3,
  "forearms": 2,
  "lowerBack": 2,
  "abs": 2,
  "obliques": 1
 },
 "clean pull": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "lowerBack": 3,
  "forearms": 2,
  "abs": 2,
  "lats": 2
 },
 "snatch pull": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "lowerBack": 3,
  "forearms": 2,
  "abs": 2,
  "lats": 2
 },
 "kettlebell high pull": {
  "glutes": 4,
  "hamstrings": 4,
  "upperBack": 3,
  "sideDelts": 3,
  "quads": 2,
  "biceps": 2,
  "forearms": 2,
  "abs": 2,
  "lowerBack": 2,
  "calves": 1
 },
 "clean high pull": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "lowerBack": 3,
  "forearms": 2,
  "abs": 2,
  "lats": 2
 },
 "banded clean deadlift": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "lowerBack": 3,
  "upperBack": 2,
  "forearms": 2,
  "abs": 2,
  "obliques": 1,
  "lats": 1
 },
 "power snatch": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "rotatorCuff": 2,
  "lowerBack": 2,
  "abs": 2,
  "forearms": 2,
  "obliques": 1
 },
 "snatch": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "rotatorCuff": 2,
  "lowerBack": 2,
  "abs": 2,
  "forearms": 2,
  "obliques": 1
 },
 "hang power snatch": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "rotatorCuff": 2,
  "lowerBack": 2,
  "abs": 2,
  "forearms": 2,
  "obliques": 1
 },
 "hang squat snatch": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "upperBack": 3,
  "hamstrings": 3,
  "calves": 3,
  "rotatorCuff": 2,
  "lowerBack": 2,
  "abs": 2,
  "forearms": 2,
  "obliques": 1
 },
 "high hang snatch": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "rotatorCuff": 2,
  "lowerBack": 2,
  "abs": 2,
  "forearms": 2,
  "obliques": 1
 },
 "kettlebell snatch": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "rotatorCuff": 2,
  "lowerBack": 2,
  "abs": 2,
  "forearms": 2,
  "obliques": 1
 },
 "dumbbell snatch": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "upperBack": 3,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "rotatorCuff": 2,
  "lowerBack": 2,
  "abs": 2,
  "forearms": 2,
  "obliques": 1
 },
 "push jerk": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "calves": 3,
  "upperBack": 3,
  "rotatorCuff": 2,
  "abs": 2,
  "lowerBack": 2,
  "obliques": 1
 },
 "split jerk": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "calves": 3,
  "upperBack": 3,
  "rotatorCuff": 2,
  "abs": 2,
  "lowerBack": 2,
  "obliques": 1
 },
 "power jerk": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "calves": 3,
  "upperBack": 3,
  "rotatorCuff": 2,
  "abs": 2,
  "lowerBack": 2,
  "obliques": 1
 },
 "squat jerk": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "upperBack": 3,
  "rotatorCuff": 2,
  "abs": 2,
  "lowerBack": 2,
  "calves": 2,
  "obliques": 1
 },
 "alternating dumbbell push jerk": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "upperBack": 3,
  "obliques": 3,
  "rotatorCuff": 2,
  "abs": 2,
  "calves": 2,
  "lowerBack": 2
 },
 "push press": {
  "frontDelts": 4,
  "triceps": 4,
  "quads": 4,
  "glutes": 3,
  "sideDelts": 3,
  "upperBack": 3,
  "calves": 2,
  "rotatorCuff": 2,
  "abs": 2,
  "lowerBack": 2,
  "obliques": 1
 },
 "dumbbell push press": {
  "frontDelts": 4,
  "triceps": 4,
  "quads": 4,
  "glutes": 3,
  "sideDelts": 3,
  "upperBack": 3,
  "calves": 2,
  "rotatorCuff": 2,
  "abs": 2,
  "lowerBack": 2,
  "obliques": 1
 },
 "kettlebell push press": {
  "frontDelts": 4,
  "triceps": 4,
  "quads": 4,
  "glutes": 3,
  "sideDelts": 3,
  "upperBack": 3,
  "calves": 2,
  "rotatorCuff": 2,
  "abs": 2,
  "lowerBack": 2,
  "obliques": 1
 },
 "clean and jerk": {
  "quads": 4,
  "glutes": 4,
  "hamstrings": 3,
  "calves": 3,
  "triceps": 3,
  "upperBack": 3,
  "frontDelts": 3,
  "sideDelts": 3,
  "forearms": 2,
  "lowerBack": 2,
  "abs": 2,
  "rotatorCuff": 2
 },
 "kettlebell clean and press": {
  "frontDelts": 4,
  "triceps": 4,
  "glutes": 4,
  "quads": 3,
  "hamstrings": 3,
  "upperBack": 3,
  "forearms": 2,
  "abs": 2,
  "rotatorCuff": 2,
  "lowerBack": 2,
  "calves": 1
 },
 "muscle clean": {
  "upperBack": 4,
  "frontDelts": 4,
  "biceps": 3,
  "quads": 3,
  "glutes": 3,
  "forearms": 2,
  "abs": 2,
  "lowerBack": 2
 },
 "tall clean": {
  "upperBack": 4,
  "quads": 3,
  "glutes": 3,
  "biceps": 3,
  "forearms": 2,
  "abs": 2,
  "lowerBack": 2
 },
 "muscle snatch": {
  "upperBack": 4,
  "frontDelts": 4,
  "triceps": 4,
  "sideDelts": 3,
  "quads": 3,
  "glutes": 3,
  "rotatorCuff": 2,
  "abs": 2,
  "forearms": 2
 },
 "tall snatch": {
  "upperBack": 4,
  "frontDelts": 4,
  "quads": 3,
  "glutes": 3,
  "triceps": 3,
  "rotatorCuff": 2,
  "abs": 2,
  "forearms": 2
 },
 "snatch balance": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 3,
  "sideDelts": 3,
  "triceps": 3,
  "upperBack": 3,
  "rotatorCuff": 2,
  "abs": 2,
  "lowerBack": 2,
  "obliques": 1
 },
 "kettlebell swing": {
  "glutes": 4,
  "hamstrings": 4,
  "lowerBack": 3,
  "quads": 2,
  "forearms": 2,
  "abs": 2
 },
 "kettlebell dead stop swing": {
  "glutes": 4,
  "hamstrings": 4,
  "lowerBack": 3,
  "quads": 2,
  "forearms": 2,
  "abs": 2
 },
 "kb swing": {
  "glutes": 4,
  "hamstrings": 4,
  "lowerBack": 3,
  "quads": 2,
  "forearms": 2,
  "abs": 2
 },
 "box jump": {
  "quads": 4,
  "glutes": 4,
  "calves": 3,
  "hamstrings": 2,
  "abs": 2,
  "abductors": 1,
  "obliques": 1
 },
 "box jump over": {
  "quads": 4,
  "glutes": 4,
  "calves": 3,
  "hamstrings": 2,
  "abs": 2,
  "abductors": 1,
  "obliques": 1
 },
 "broad jump": {
  "glutes": 4,
  "quads": 4,
  "hamstrings": 3,
  "calves": 3,
  "abs": 2,
  "abductors": 1,
  "obliques": 1
 },
 "max broad jump": {
  "glutes": 4,
  "quads": 4,
  "hamstrings": 3,
  "calves": 3,
  "abs": 2,
  "abductors": 1,
  "obliques": 1
 },
 "max broad jumps": {
  "glutes": 4,
  "quads": 4,
  "hamstrings": 3,
  "calves": 3,
  "abs": 2,
  "abductors": 1,
  "obliques": 1
 },
 "thruster": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 4,
  "triceps": 3,
  "calves": 2,
  "upperBack": 2,
  "abs": 2,
  "rotatorCuff": 2,
  "obliques": 1
 },
 "dumbbell thruster": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 4,
  "triceps": 3,
  "calves": 2,
  "upperBack": 2,
  "abs": 2,
  "rotatorCuff": 2,
  "obliques": 1
 },
 "kettlebell thruster": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 4,
  "triceps": 3,
  "calves": 2,
  "upperBack": 2,
  "abs": 2,
  "rotatorCuff": 2,
  "obliques": 1
 },
 "wall ball shot": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 3,
  "triceps": 3,
  "calves": 2,
  "abs": 2,
  "obliques": 1,
  "rotatorCuff": 1
 },
 "wall ball": {
  "quads": 4,
  "glutes": 4,
  "frontDelts": 3,
  "triceps": 3,
  "calves": 2,
  "abs": 2,
  "obliques": 1,
  "rotatorCuff": 1
 },
 "burpee": {
  "quads": 4,
  "chest": 4,
  "glutes": 3,
  "triceps": 3,
  "frontDelts": 2,
  "calves": 2,
  "abs": 2,
  "obliques": 1
 },
 "burpee box jump over": {
  "quads": 4,
  "chest": 4,
  "glutes": 3,
  "triceps": 3,
  "frontDelts": 2,
  "calves": 2,
  "abs": 2,
  "obliques": 1
 },
 "burpee over dumbbell": {
  "quads": 4,
  "chest": 4,
  "glutes": 3,
  "triceps": 3,
  "frontDelts": 2,
  "calves": 2,
  "abs": 2,
  "obliques": 1
 },
 "bar facing burpee over barbell": {
  "quads": 4,
  "chest": 4,
  "glutes": 3,
  "triceps": 3,
  "frontDelts": 2,
  "calves": 2,
  "abs": 2,
  "obliques": 1
 },
 "lateral burpee over barbell": {
  "quads": 4,
  "chest": 4,
  "glutes": 3,
  "triceps": 3,
  "frontDelts": 2,
  "calves": 2,
  "abs": 2,
  "obliques": 1
 },
 "burpee over barbell": {
  "quads": 4,
  "chest": 4,
  "glutes": 3,
  "triceps": 3,
  "frontDelts": 2,
  "calves": 2,
  "abs": 2,
  "obliques": 1
 },
 "burpee broad jump": {
  "quads": 4,
  "glutes": 4,
  "chest": 3,
  "triceps": 3,
  "hamstrings": 3,
  "calves": 3,
  "frontDelts": 2,
  "abs": 2,
  "obliques": 1
 },
 "burpee to target": {
  "quads": 4,
  "chest": 4,
  "glutes": 3,
  "triceps": 3,
  "frontDelts": 2,
  "calves": 2,
  "abs": 2,
  "obliques": 1
 },
 "burpee pull up": {
  "quads": 4,
  "chest": 4,
  "lats": 4,
  "glutes": 3,
  "triceps": 3,
  "biceps": 3,
  "calves": 2,
  "upperBack": 2,
  "frontDelts": 2,
  "forearms": 2,
  "abs": 2
 },
 "devil press": {
  "glutes": 4,
  "quads": 4,
  "frontDelts": 4,
  "chest": 3,
  "triceps": 3,
  "hamstrings": 3,
  "upperBack": 3,
  "abs": 2,
  "obliques": 2,
  "forearms": 2
 },
 "man maker": {
  "chest": 4,
  "quads": 4,
  "lats": 4,
  "triceps": 3,
  "glutes": 3,
  "upperBack": 3,
  "frontDelts": 3,
  "biceps": 3,
  "abs": 2,
  "obliques": 2,
  "forearms": 2
 },
 "medicine ball slam": {
  "lats": 4,
  "abs": 4,
  "triceps": 3,
  "frontDelts": 3,
  "glutes": 2,
  "quads": 2,
  "obliques": 2
 },
 "bike erg": {
  "quads": 4,
  "glutes": 3,
  "hamstrings": 2,
  "calves": 2,
  "abs": 1
 },
 "bikeerg": {
  "quads": 4,
  "glutes": 3,
  "hamstrings": 2,
  "calves": 2,
  "abs": 1
 },
 "cycling": {
  "quads": 4,
  "glutes": 3,
  "hamstrings": 2,
  "calves": 2,
  "abs": 1
 },
 "sykkel": {
  "quads": 4,
  "glutes": 3,
  "hamstrings": 2,
  "calves": 2,
  "abs": 1
 },
 "air bike": {
  "quads": 4,
  "glutes": 3,
  "chest": 3,
  "lats": 3,
  "triceps": 3,
  "biceps": 3,
  "hamstrings": 2,
  "calves": 2,
  "frontDelts": 2,
  "abs": 2,
  "forearms": 1
 },
 "assault bike": {
  "quads": 4,
  "glutes": 3,
  "chest": 3,
  "lats": 3,
  "triceps": 3,
  "biceps": 3,
  "hamstrings": 2,
  "calves": 2,
  "frontDelts": 2,
  "abs": 2,
  "forearms": 1
 },
 "row": {
  "quads": 4,
  "glutes": 4,
  "lats": 3,
  "upperBack": 3,
  "hamstrings": 3,
  "biceps": 2,
  "lowerBack": 2,
  "forearms": 2,
  "abs": 2
 },
 "row erg": {
  "quads": 4,
  "glutes": 4,
  "lats": 3,
  "upperBack": 3,
  "hamstrings": 3,
  "biceps": 2,
  "lowerBack": 2,
  "forearms": 2,
  "abs": 2
 },
 "rowerg": {
  "quads": 4,
  "glutes": 4,
  "lats": 3,
  "upperBack": 3,
  "hamstrings": 3,
  "biceps": 2,
  "lowerBack": 2,
  "forearms": 2,
  "abs": 2
 },
 "rowing": {
  "quads": 4,
  "glutes": 4,
  "lats": 3,
  "upperBack": 3,
  "hamstrings": 3,
  "biceps": 2,
  "lowerBack": 2,
  "forearms": 2,
  "abs": 2
 },
 "roing": {
  "quads": 4,
  "glutes": 4,
  "lats": 3,
  "upperBack": 3,
  "hamstrings": 3,
  "biceps": 2,
  "lowerBack": 2,
  "forearms": 2,
  "abs": 2
 },
 "romaskin": {
  "quads": 4,
  "glutes": 4,
  "lats": 3,
  "upperBack": 3,
  "hamstrings": 3,
  "biceps": 2,
  "lowerBack": 2,
  "forearms": 2,
  "abs": 2
 },
 "skierg": {
  "lats": 4,
  "triceps": 4,
  "abs": 3,
  "glutes": 2,
  "hamstrings": 2,
  "forearms": 2,
  "lowerBack": 2
 },
 "ski erg": {
  "lats": 4,
  "triceps": 4,
  "abs": 3,
  "glutes": 2,
  "hamstrings": 2,
  "forearms": 2,
  "lowerBack": 2
 },
 "jogging": {
  "calves": 4,
  "quads": 4,
  "glutes": 3,
  "hamstrings": 3,
  "hipFlexors": 2,
  "abductors": 2,
  "abs": 2
 },
 "run": {
  "calves": 4,
  "quads": 4,
  "glutes": 3,
  "hamstrings": 3,
  "hipFlexors": 2,
  "abductors": 2,
  "abs": 2
 },
 "running": {
  "calves": 4,
  "quads": 4,
  "glutes": 3,
  "hamstrings": 3,
  "hipFlexors": 2,
  "abductors": 2,
  "abs": 2
 },
 "løping": {
  "calves": 4,
  "quads": 4,
  "glutes": 3,
  "hamstrings": 3,
  "hipFlexors": 2,
  "abductors": 2,
  "abs": 2
 },
 "jump rope": {
  "calves": 4,
  "quads": 3,
  "forearms": 2,
  "abs": 1
 },
 "double under": {
  "calves": 4,
  "quads": 3,
  "forearms": 2,
  "abs": 1
 },
 "double unders": {
  "calves": 4,
  "quads": 3,
  "forearms": 2,
  "abs": 1
 },
 "single under": {
  "calves": 4,
  "quads": 3,
  "forearms": 2,
  "abs": 1
 },
 "single unders": {
  "calves": 4,
  "quads": 3,
  "forearms": 2,
  "abs": 1
 },
 "mountain climber": {
  "hipFlexors": 4,
  "abs": 4,
  "frontDelts": 3,
  "quads": 2,
  "triceps": 2,
  "obliques": 2
 },
 "trx mountain climber": {
  "hipFlexors": 4,
  "abs": 4,
  "frontDelts": 3,
  "quads": 2,
  "triceps": 2,
  "obliques": 2
 },
 "plank": {
  "abs": 4,
  "obliques": 3,
  "frontDelts": 2,
  "glutes": 2,
  "quads": 2
 },
 "trx plank": {
  "abs": 4,
  "obliques": 3,
  "frontDelts": 2,
  "glutes": 2,
  "quads": 2
 },
 "trx body saw": {
  "abs": 4,
  "obliques": 3,
  "frontDelts": 3,
  "glutes": 2,
  "quads": 2
 },
 "hollow hold": {
  "abs": 4,
  "hipFlexors": 3,
  "obliques": 2,
  "quads": 2
 },
 "pilates hundred": {
  "abs": 4,
  "hipFlexors": 3,
  "obliques": 2,
  "frontDelts": 1
 },
 "side plank": {
  "obliques": 4,
  "abductors": 3,
  "abs": 3,
  "frontDelts": 2,
  "rotatorCuff": 2
 },
 "pilates side plank": {
  "obliques": 4,
  "abductors": 3,
  "abs": 3,
  "frontDelts": 2,
  "rotatorCuff": 2
 },
 "ab wheel rollout": {
  "abs": 4,
  "lats": 3,
  "frontDelts": 2,
  "obliques": 2
 },
 "standing ab wheel rollout": {
  "abs": 4,
  "lats": 3,
  "frontDelts": 2,
  "obliques": 2
 },
 "barbell rollout": {
  "abs": 4,
  "lats": 3,
  "frontDelts": 2,
  "obliques": 2
 },
 "trx fallout": {
  "abs": 4,
  "lats": 3,
  "frontDelts": 2,
  "obliques": 2
 },
 "trx pike": {
  "abs": 4,
  "hipFlexors": 4,
  "frontDelts": 3,
  "obliques": 2
 },
 "trx atomic push up": {
  "chest": 4,
  "abs": 4,
  "triceps": 3,
  "hipFlexors": 3,
  "frontDelts": 3,
  "obliques": 2
 },
 "dead bug": {
  "abs": 4,
  "obliques": 3,
  "hipFlexors": 2
 },
 "pilates double leg stretch": {
  "abs": 4,
  "obliques": 3,
  "hipFlexors": 2
 },
 "pilates single leg stretch": {
  "abs": 4,
  "obliques": 3,
  "hipFlexors": 2
 },
 "pilates criss cross": {
  "obliques": 4,
  "abs": 4,
  "hipFlexors": 3
 },
 "sit up": {
  "abs": 4,
  "hipFlexors": 3,
  "obliques": 2
 },
 "pilates roll up": {
  "abs": 4,
  "hipFlexors": 3,
  "obliques": 2
 },
 "toes to bar": {
  "abs": 4,
  "hipFlexors": 4,
  "lats": 3,
  "forearms": 3,
  "upperBack": 2,
  "rotatorCuff": 2,
  "obliques": 2
 },
 "russian twist": {
  "obliques": 4,
  "abs": 3,
  "hipFlexors": 2
 },
 "bird dog": {
  "abs": 4,
  "obliques": 4,
  "lowerBack": 3,
  "glutes": 3,
  "upperBack": 2
 },
 "pilates swimming": {
  "lowerBack": 4,
  "glutes": 4,
  "upperBack": 3,
  "rearDelts": 3,
  "abs": 2
 },
 "dead hang": {
  "forearms": 4,
  "rotatorCuff": 2,
  "upperBack": 1
 },
 "active hang": {
  "forearms": 4,
  "lats": 4,
  "upperBack": 3,
  "rotatorCuff": 2
 },
 "flexed arm hang": {
  "lats": 4,
  "biceps": 4,
  "forearms": 4,
  "upperBack": 3,
  "abs": 2
 },
 "farmer carry": {
  "forearms": 4,
  "upperBack": 3,
  "abs": 3,
  "obliques": 3,
  "lowerBack": 3,
  "abductors": 2,
  "glutes": 2,
  "quads": 2
 },
 "farmers carry": {
  "forearms": 4,
  "upperBack": 3,
  "abs": 3,
  "obliques": 3,
  "lowerBack": 3,
  "abductors": 2,
  "glutes": 2,
  "quads": 2
 },
 "farmer s carry": {
  "forearms": 4,
  "upperBack": 3,
  "abs": 3,
  "obliques": 3,
  "lowerBack": 3,
  "abductors": 2,
  "glutes": 2,
  "quads": 2
 },
 "farmer s walk": {
  "forearms": 4,
  "upperBack": 3,
  "abs": 3,
  "obliques": 3,
  "lowerBack": 3,
  "abductors": 2,
  "glutes": 2,
  "quads": 2
 },
 "wall sit": {
  "quads": 4,
  "glutes": 3,
  "abs": 2
 },
 "quad set": {
  "quads": 4
 },
 "band external rotation": {
  "rotatorCuff": 4
 },
 "scapular retraction": {
  "upperBack": 4,
  "rotatorCuff": 2
 },
 "pilates clam": {
  "abductors": 4,
  "glutes": 3,
  "obliques": 2
 },
 "pilates side kick": {
  "abductors": 4,
  "glutes": 3,
  "obliques": 2,
  "hipFlexors": 2
 },
 "pilates shoulder bridge": {
  "glutes": 4,
  "hamstrings": 4,
  "abs": 3
 },
 "kettlebell windmill": {
  "obliques": 4,
  "glutes": 3,
  "frontDelts": 3,
  "rotatorCuff": 2,
  "abs": 2,
  "abductors": 2
 },
 "turkish get up": {
  "glutes": 4,
  "obliques": 4,
  "frontDelts": 3,
  "rotatorCuff": 3,
  "triceps": 3,
  "quads": 3,
  "abs": 2,
  "abductors": 2,
  "upperBack": 2,
  "forearms": 1
 },
 "pilates swan prep": {
  "lowerBack": 4,
  "upperBack": 3,
  "glutes": 3,
  "abs": 2
 },
 "ankle rocks": {},
 "calf stretch": {},
 "cat cow": {},
 "heel slide": {},
 "hip flexor stretch": {},
 "pilates cat stretch": {},
 "pilates mermaid": {},
 "pilates saw": {},
 "pilates spine stretch forward": {},
 "shoulder pass through": {},
 "thoracic rotation": {},
 "world greatest stretch": {}
}
export function exerciseGrades(name){const key=normalizeExerciseMuscleName(name);return Object.prototype.hasOwnProperty.call(EXERCISE_MUSCLE_GRADES,key)?EXERCISE_MUSCLE_GRADES[key]:null}
export function muscleGradeSummary(items=[]){
 const grades={},details={},unknown=[];let known=0,total=0,mobility=0
 for(const item of items){if(item?.is_rest)continue;const name=typeof item==='string'?item:item?.exercise_name||item?.name||'';if(!name||/^(pause|rest)$/i.test(name))continue
 const steps=item?.complex_steps?.length?item.complex_steps.map(s=>s.name||s.exercise_name||''):[name]
 for(const movement of steps){total++;const g=exerciseGrades(movement),p=exerciseMuscleProfile(movement);if(!g||!p){unknown.push(movement);continue}known++;if(p.mode==='mobility'){mobility++;continue}
 for(const [key,value] of Object.entries(g)){grades[key]=Math.max(grades[key]||0,value);const list=details[key]||=[];const role=p.stabilizers.includes(key)?'stabilisering':p.primary.includes(key)?'primær rørsle':p.secondary.includes(key)?'medverkande':'rørsleavhengig';if(!list.some(x=>x.name===movement))list.push({name:movement,grade:value,role})}
 }}
 return {grades,details,known,total,mobility,unknown:[...new Set(unknown)]}
}
export function muscleRegionFor(key){return Object.keys(MUSCLE_REGIONS).find(r=>MUSCLE_REGIONS[r].includes(key))||null}
export function rankedMuscles(summary,region){return (MUSCLE_REGIONS[region]||Object.keys(DETAILED_MUSCLE_LABELS)).map(key=>({key,label:DETAILED_MUSCLE_LABELS[key],grade:summary.grades[key]||0,details:[...(summary.details[key]||[])].sort((a,b)=>b.grade-a.grade)})).sort((a,b)=>b.grade-a.grade)}
