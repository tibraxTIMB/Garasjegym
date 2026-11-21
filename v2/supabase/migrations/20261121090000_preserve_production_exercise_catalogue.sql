-- Additively preserve Production's existing seeded exercise identities and metadata.
-- Source: read-only snapshot of Production exercises (created_by IS NULL), 2026-11-21.
-- Rows already present by normalized name are left untouched. No existing exercise is deleted or updated.
WITH production_catalog(name, category, equipment, description, video_url, is_active, body_area, is_rehab) AS (
  VALUES
  ('Barbell Row', 'Styrke', 'Vektstong', 'Framoverbøygd roing med stabil overkropp.', NULL, true, NULL, false),
  ('Biceps Curl', 'Styrke', 'Manualar', 'Albuebøy med kontrollert tempo.', NULL, true, NULL, false),
  ('Box Step-up', 'CrossFit', 'Plyoboks', 'Steg kontrollert opp og ned frå boks.', NULL, true, NULL, false),
  ('Burpee Box Jump Over', 'CrossFit', 'Plyoboks', 'Burpee med passering over boks.', NULL, true, NULL, false),
  ('Chest-to-Bar Pull-up', 'CrossFit', 'Pull-up-stong', 'Pull-up med brystet til stonga.', NULL, true, NULL, false),
  ('Clean and Jerk', 'CrossFit', 'Vektstong', 'To-delt løft frå golv til over hovudet.', NULL, true, NULL, false),
  ('Double Under', 'CrossFit', 'Hoppetau', 'To taupasseringar per hopp.', NULL, true, NULL, false),
  ('Dumbbell Shoulder Press', 'Styrke', 'Manualar', 'Press manualar over hovudet.', NULL, true, NULL, false),
  ('Farmer Carry', 'CrossFit', 'Manualar / kettlebells', 'Gå med last i begge hender og stabil overkropp.', NULL, true, NULL, false),
  ('Handstand Push-up', 'CrossFit', 'Vegg / matte', 'Armheving opp ned med kontrollert hovudposisjon.', NULL, true, NULL, false),
  ('Kettlebell Swing', 'CrossFit', 'Kettlebell', 'Hofteekstensjon som svingar kula til vald høgd.', NULL, true, NULL, false),
  ('Lat Pulldown', 'Styrke', 'Kabelapparat', 'Trekk handtak ned mot øvre bryst.', NULL, true, NULL, false),
  ('Leg Press', 'Styrke', 'Beinpress', 'Press plattforma frå kontrollert kne- og hoftevinkel.', NULL, true, NULL, false),
  ('Overhead Squat', 'CrossFit', 'Vektstong', 'Knebøy med stabil stong over hovudet.', NULL, true, NULL, false),
  ('Pilates Cat Stretch', 'Pilates', 'Matte', 'Mobiliser ryggrada roleg på alle fire.', NULL, true, NULL, false),
  ('Pilates Clam', 'Pilates', 'Matte / miniband', 'Sideleie med hælar samla og kontrollert kneopning.', NULL, true, NULL, false),
  ('Pilates Criss Cross', 'Pilates', 'Matte', 'Rotasjon med motsett skulder mot kne.', NULL, true, NULL, false),
  ('Pilates Double Leg Stretch', 'Pilates', 'Matte', 'Strekk armar og bein ut og samle kontrollert.', NULL, true, NULL, false),
  ('Pilates Hundred', 'Pilates', 'Matte', 'Pusterytme og kjernestabilitet i hundre-pulsen.', NULL, true, NULL, false),
  ('Pilates Mermaid', 'Pilates', 'Matte', 'Sidebøy frå sitjande med lang rygg.', NULL, true, NULL, false),
  ('Pilates Roll Up', 'Pilates', 'Matte', 'Rull kontrollert frå liggjande til sitjande og tilbake.', NULL, true, NULL, false),
  ('Pilates Saw', 'Pilates', 'Matte', 'Rotasjon og framoverstrekk mot motsett fot.', NULL, true, NULL, false),
  ('Pilates Shoulder Bridge', 'Pilates', 'Matte', 'Rull bekken og rygg opp i skulderbru.', NULL, true, NULL, false),
  ('Pilates Side Kick', 'Pilates', 'Matte', 'Sideleie med kontrollert fram- og tilbakespark.', NULL, true, NULL, false),
  ('Pilates Side Plank', 'Pilates', 'Matte', 'Sideplanke med stabil skulder og hofte.', NULL, true, NULL, false),
  ('Pilates Single Leg Stretch', 'Pilates', 'Matte', 'Vekslande knedrag med stabil overkropp.', NULL, true, NULL, false),
  ('Pilates Spine Stretch Forward', 'Pilates', 'Matte', 'Sitjande segmentert framoverrulling av ryggen.', NULL, true, NULL, false),
  ('Pilates Swan Prep', 'Pilates', 'Matte', 'Skånsam ryggstrekk med kontrollert brystløft.', NULL, true, NULL, false),
  ('Pilates Swimming', 'Pilates', 'Matte', 'Diagonal arm- og beinløft i mageleie.', NULL, true, NULL, false),
  ('Power Clean', 'CrossFit', 'Vektstong', 'Eksplosivt løft frå golv til front rack utan full knebøy.', NULL, true, NULL, false),
  ('Power Snatch', 'CrossFit', 'Vektstong', 'Eksplosivt snatch med mottak over parallell.', NULL, true, NULL, false),
  ('Push Jerk', 'CrossFit', 'Vektstong', 'Dip, drive og mottak med nytt knebøy.', NULL, true, NULL, false),
  ('Push Press', 'CrossFit', 'Vektstong / manualar', 'Dip og drive for å presse last over hovudet.', NULL, true, NULL, false),
  ('Single Under', 'CrossFit', 'Hoppetau', 'Ei taupassering per hopp.', NULL, true, NULL, false),
  ('Snatch', 'CrossFit', 'Vektstong', 'Løft frå golv til over hovudet i eitt samanhengande drag.', NULL, true, NULL, false),
  ('Squat Clean', 'CrossFit', 'Vektstong', 'Clean med mottak i full knebøy.', NULL, true, NULL, false),
  ('Thruster', 'CrossFit', 'Vektstong / manualar', 'Front squat direkte over i press.', NULL, true, NULL, false),
  ('Toes-to-Bar', 'CrossFit', 'Pull-up-stong', 'Hengande løft av tærne til stonga.', NULL, true, NULL, false),
  ('Triceps Pushdown', 'Styrke', 'Kabel', 'Strekk albogen ned mot strake armar.', NULL, true, NULL, false),
  ('Wall Ball Shot', 'CrossFit', 'Medisinball / veggmål', 'Knebøy med kast av ball mot mål.', NULL, true, NULL, false)
)
INSERT INTO public.exercises
  (name, category, equipment, description, video_url, is_active, body_area, is_rehab, created_by)
SELECT c.name, c.category, c.equipment, c.description, c.video_url,
       c.is_active, c.body_area, c.is_rehab, NULL
FROM production_catalog c
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercises e
  WHERE lower(trim(e.name)) = lower(trim(c.name))
);
