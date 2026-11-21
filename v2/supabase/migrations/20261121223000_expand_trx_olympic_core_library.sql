-- Additive GarasjeGym catalogue expansion: grip/endurance holds, TRX, Olympic
-- lifting variations and rollouts. No existing row is overwritten or removed.
-- Every movement is a distinct technique or equipment variant; duplicate
-- exercise names are skipped case-insensitively.
WITH catalogue(name,category,equipment,description,body_area) AS (VALUES
  ('Dead Hang','Styrke','Pull-up-stong','Passivt heng med strake armar. Registrer haldetid i sekund.','Grep / skulder'),
  ('Active Hang','Styrke','Pull-up-stong','Aktivt heng med skuldrene trekte ned og stabile. Registrer haldetid.','Skulder / grep'),
  ('Flexed-arm Hang','Styrke','Pull-up-stong','Hald topposisjonen i pull-up med haka over stonga. Registrer haldetid.','Rygg / armar'),
  ('Wall Sit','Kjerne','Vegg','Statisk sitjande stilling mot veggen med kontrollert knevinkel. Registrer sekund.','Bein / kjerne'),
  ('Ab Wheel Rollout','Kjerne','Ab wheel','Rull kontrollert ut frå kneståande og trekk tilbake med stabil korsrygg.','Mage / kjerne'),
  ('Standing Ab Wheel Rollout','Kjerne','Ab wheel','Avansert rollout frå ståande. Stopp før du mistar kontroll i rygg og hofte.','Mage / kjerne'),
  ('Barbell Rollout','Kjerne','Vektstong / skiver','Rollout med stong og skiver frå kneståande. Hald ribbeina nede.','Mage / kjerne'),
  ('TRX Fallout','Kjerne','TRX','Stå framoverlent i slyngene og før armane kontrollert fram utan å svaie i korsryggen.','Mage / skulder'),
  ('TRX Row','Styrke','TRX','Roing med kroppsvekt. Juster vanskegrad med fotstilling og kroppsvinkel.','Rygg / armar'),
  ('TRX High Row','Styrke','TRX','Roing med høge olbogar for øvre rygg og bakside skulder.','Øvre rygg / skulder'),
  ('TRX Face Pull','Styrke','TRX','Trekk handtaka mot panna med utrotasjon og kontrollert skulderblad.','Bakside skulder'),
  ('TRX Reverse Fly','Styrke','TRX','Flyes bakover med lett kroppsvinkel og stabile skuldre.','Øvre rygg / skulder'),
  ('TRX Y-Fly','Styrke','TRX','Løft armane til ein Y med lett kroppsvektmotstand og skulderkontroll.','Skulder / øvre rygg'),
  ('TRX Chest Press','Styrke','TRX','Brystpress framover med kroppen på skrå og rett linje frå hovud til hæl.','Bryst / triceps'),
  ('TRX Push-up','Styrke','TRX','Armheving med hendene i slyngene. Hald kjernen stabil.','Bryst / kjerne'),
  ('TRX Biceps Curl','Styrke','TRX','Bøy albogane og trekk kroppen inn med albogane høgt og stille.','Armar'),
  ('TRX Triceps Extension','Styrke','TRX','Strekk albogane framover frå skrå plankeposisjon.','Triceps / kjerne'),
  ('TRX Assisted Squat','Styrke','TRX','Knebøy med lett støtte frå slyngene for balanse og djupnekontroll.','Bein'),
  ('TRX Assisted Pistol Squat','Styrke','TRX','Eittbeins knebøy med slyngestøtte. Bruk hjelp etter behov.','Bein / balanse'),
  ('TRX Reverse Lunge','Styrke','TRX','Bakoverutfall med støtte i slyngene. Hald hofta stabil.','Bein / sete'),
  ('TRX Hamstring Curl','Styrke','TRX','Ligg på ryggen med hælane i slyngene og trekk dei mot setet.','Bakside lår'),
  ('TRX Pike','Kjerne','TRX','Føtene i slyngene, løft hofta kontrollert frå plankeposisjon.','Mage / skulder'),
  ('TRX Body Saw','Kjerne','TRX','Underarmsplanke med føtene i slyngene, skli kontrollert fram og tilbake.','Kjerne / skulder'),
  ('TRX Mountain Climber','Kjerne','TRX','Føtene i slyngene og vekselvis kneløft frå sterk plankeposisjon.','Mage / hofte'),
  ('TRX Atomic Push-up','Styrke','TRX','Push-up med føtene i slyngene kombinert med knetrekk.','Bryst / kjerne'),
  ('TRX Plank','Kjerne','TRX','Statisk planke med føtene i slyngene. Registrer haldetid.','Mage / kjerne'),
  ('Hang Power Clean','CrossFit','Vektstong','Clean frå hengposisjon med mottak over parallell.','Fullkropp'),
  ('Hang Squat Clean','CrossFit','Vektstong','Clean frå hengposisjon med mottak i full knebøy.','Fullkropp'),
  ('High Hang Clean','CrossFit','Vektstong','Clean frå høg hengposisjon med fokus på eksplosiv hofteekstensjon.','Fullkropp'),
  ('Clean Pull','CrossFit','Vektstong','Trekk frå golvet med clean-grep og kraftfull ekstensjon utan mottak.','Rygg / bein'),
  ('Clean High Pull','CrossFit','Vektstong','Clean-drag med høgt albogeopptrekk etter full hofteekstensjon.','Fullkropp'),
  ('Muscle Clean','CrossFit','Vektstong','Clean utan dropp under stonga, med rask overgang til rack.','Fullkropp'),
  ('Tall Clean','CrossFit','Vektstong','Teknikkøving frå ståande for raskt albogeinnslag og mottak.','Fullkropp'),
  ('Hang Power Snatch','CrossFit','Vektstong','Snatch frå heng med mottak over parallell.','Fullkropp'),
  ('Hang Squat Snatch','CrossFit','Vektstong','Snatch frå heng med mottak i full knebøy.','Fullkropp'),
  ('High Hang Snatch','CrossFit','Vektstong','Snatch frå høg hengposisjon med aggressiv ekstensjon.','Fullkropp'),
  ('Snatch Pull','CrossFit','Vektstong','Trekk frå golvet med breitt snatch-grep utan mottak.','Rygg / bein'),
  ('Muscle Snatch','CrossFit','Vektstong','Snatch med kontinuerleg drag og låsing over hovudet utan dropp.','Fullkropp'),
  ('Tall Snatch','CrossFit','Vektstong','Teknikkøving for rask vending og mottak under stonga.','Fullkropp'),
  ('Split Jerk','CrossFit','Vektstong','Jerk med mottak i splittstilling og kontrollert fotføring.','Fullkropp'),
  ('Power Jerk','CrossFit','Vektstong','Jerk med symmetrisk mottak over parallell.','Fullkropp'),
  ('Squat Jerk','CrossFit','Vektstong','Jerk med mottak i djup overhead squat.','Fullkropp'),
  ('Snatch Balance','CrossFit','Vektstong','Driv stonga opp frå nakke og dropp i overhead squat.','Skulder / bein')
)
INSERT INTO public.exercises(name,category,equipment,description,body_area,is_active,is_rehab,created_by)
SELECT c.name,c.category,c.equipment,c.description,c.body_area,true,false,NULL
FROM catalogue AS c
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercises AS existing
  WHERE lower(trim(existing.name))=lower(trim(c.name))
)
ON CONFLICT (name) DO NOTHING;
