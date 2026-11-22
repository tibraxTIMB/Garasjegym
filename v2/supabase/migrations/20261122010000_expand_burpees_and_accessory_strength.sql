-- GarasjeGym: separate technique/equipment variants for PR and WOD dosing.
-- Keep historical foreign keys and exercise names intact. Only retire two
-- redundant browse entries; past WODs/results must still resolve their IDs.
WITH catalogue(name,category,equipment,description,body_area) AS (VALUES
  ('Bar-facing Burpee Over Barbell','CrossFit','Vektstong','Burpee vend mot vektstonga. Hopp med begge føter samla over stonga og vend deg att.','Fullkropp'),
  ('Lateral Burpee Over Barbell','CrossFit','Vektstong','Burpee parallelt med vektstonga, hopp sidelengs over stonga.','Fullkropp'),
  ('Burpee Over Dumbbell','CrossFit','Manual','Burpee og sidehopp over manualen. Skaler til steg over ved behov.','Fullkropp'),
  ('Burpee Broad Jump','CrossFit','Kroppsvekt','Burpee etterfølgt av eit lengdehopp framover.','Fullkropp'),
  ('Burpee Pull-up','CrossFit','Pull-up-stong','Burpee til golvet, hopp og utfør ein pull-up.','Fullkropp'),
  ('Burpee to Target','CrossFit','Kroppsvekt / mål','Burpee etterfølgt av kontrollert hopp til avtalt mål.','Fullkropp'),
  ('EZ Bar Skull Crusher','Styrke','EZ-stong / benk','Liggjande tricepsstrekk med EZ-stong. Hald overarmane rolege.','Triceps'),
  ('Dumbbell Skull Crusher','Styrke','Manualar / benk','Liggjande tricepsstrekk med to manualar og kontrollert albuebøy.','Triceps'),
  ('Dumbbell Biceps Curl','Styrke','Manualar','Bicepscurl med manualar, handflatene opp i løftefasen.','Biceps'),
  ('EZ Bar Biceps Curl','Styrke','EZ-stong','Bicepscurl med vinkla EZ-stong og rolege overarmar.','Biceps'),
  ('Barbell Biceps Curl','Styrke','Vektstong','Bicepscurl med rett vektstong og stabil overkropp.','Biceps'),
  ('Incline Dumbbell Biceps Curl','Styrke','Manualar / skråbenk','Bicepscurl på skråbenk med overarmane hengande bak kroppen.','Biceps'),
  ('Alternating Dumbbell Biceps Curl','Styrke','Manualar','Annakvar arm med kontrollert supinasjon og senkefase.','Biceps'),
  ('Preacher EZ Bar Curl','Styrke','EZ-stong / scottbenk','Bicepscurl med overarmane støtta mot scottbenk.','Biceps'),
  ('Dumbbell Arnold Press','Styrke','Manualar','Skulderpress med rotasjon frå handflatene inn til framover.','Skulder'),
  ('Dumbbell Front Raise','Styrke','Manualar','Hev manualane kontrollert framfor kroppen til skulderhøgd.','Skulder'),
  ('Cable Lateral Raise','Styrke','Kabel','Sidehev i kabel med jamn motstand og roleg senkefase.','Skulder'),
  ('Dumbbell Upright Row','Styrke','Manualar','Opprett roing med manualar til komfortabel skulderhøgd.','Skulder'),
  ('Dumbbell Triceps Kickback','Styrke','Manualar','Strekk albogane bakover frå framoverlent stilling.','Triceps'),
  ('Overhead Cable Triceps Extension','Styrke','Kabel','Tricepsstrekk over hovudet med kabel og stabil overarm.','Triceps')
)
INSERT INTO public.exercises(name,category,equipment,description,body_area,is_active,is_rehab,created_by)
SELECT c.name,c.category,c.equipment,c.description,c.body_area,true,false,NULL
FROM catalogue AS c
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercises AS existing
  WHERE lower(trim(existing.name))=lower(trim(c.name))
)
ON CONFLICT (name) DO NOTHING;

UPDATE public.exercises
SET is_active = false
WHERE created_by IS NULL
  AND lower(trim(name)) IN ('kettlebell deadlift / markløft','biceps curl');
