-- Bibliothekar candidate. Additive only. No existing catalogue row is overwritten.
WITH candidates(name,category,equipment,body_area,description) AS (VALUES
('Shoulder CARs','Mobilitet','Kroppsvekt','Skulder','Før armen gjennom ein langsam, kontrollert sirkel utan å rotere overkroppen. 3–5 per side.'),
('Wrist circles','Mobilitet','Kroppsvekt','Handledd / underarm','Roter handledda roleg begge vegar. 5–10 sirklar kvar veg.'),
('Wrist flexor stretch','Mobilitet','Kroppsvekt','Handledd / underarm','Strekk armen fram med handflata opp og trekk fingrane varsamt ned. 20 sekund per side.'),
('Wrist extension stretch','Mobilitet','Kroppsvekt','Handledd / underarm','Strekk armen fram med handflata ned og bøy handleddet varsamt. 20 sekund per side.'),
('Adductor rock back','Mobilitet','Matte','Bein / hofte / lyske','Stå på alle fire, strekk eitt bein til sida og før hofta roleg bakover. 6–8 per side.'),
('Couch stretch','Mobilitet','Vegg / matte','Bein / hofte','Stå i kneståande utfall med bakre legg mot veggen. Hald hofta nøytral og unngå å presse korsryggen. 20–30 sekund per side.'),
('Hamstring stretch','Mobilitet','Matte','Bein / bakside lår','Ligg på ryggen og løft eitt bein med lett bøygd kne. Hald eit komfortabelt strekk. 20–30 sekund per side.'),
('Pec doorway stretch','Mobilitet','Dørkarm','Bryst / skulder','Set underarmen mot dørkarmen og roter kroppen lett bort. 20–30 sekund per side.'),
('Lat stretch','Mobilitet','Benk','Rygg / skulder','Plasser hendene på benken og før hofta bakover med roleg pust. 20–30 sekund.'),
('Child''s pose','Yoga','Matte','Rygg / hofte','Frå kneståande, før hofta mot hælane og armane fram. Pust roleg i 20–40 sekund.'),
('Downward dog','Yoga','Matte','Skulder / bakside bein','Frå alle fire, løft hofta opp og bak. Bøy knea ved behov. Hald 20–30 sekund.'),
('Low lunge','Yoga','Matte','Bein / hofte','Stå i lågt utfall med bakre kne i matta. Hald overkroppen oppreist og pust roleg. 20–30 sekund per side.'),
('Pigeon stretch','Yoga','Matte','Bein / sete','Før eitt bøygd bein fram og strekk det andre bakover. Vel ryggliggjande figur fire dersom kneet protesterer. 20–30 sekund per side.'),
('Banded lateral walk','Styrke','Miniband','Bein / sete','Set strikken rundt knea eller anklane, bøy lett i knea og gå sidelengs med kontroll. 8–12 steg kvar veg.'),
('Single-leg balance','Kjerne','Kroppsvekt','Bein / balanse','Stå på eitt bein nær ei støtteflate. Hald bekkenet stabilt. 20–30 sekund per side.'),
('Single-leg glute bridge','Styrke','Matte','Bein / sete','Ligg på ryggen med eitt bein i golvet, løft hofta og hald bekkenet jamt. 8–12 per side.'),
('Pallof press','Kjerne','Strikk','Kjerne','Stå sidevend mot eit sikkert strikkfeste og press hendene fram utan å rotere. 8–12 per side.'),
('Single-leg RDL','Styrke','Manualar','Bein / sete / bakside lår','Stå på eitt bein og hengsle i hofta med nøytral rygg. Strekk det andre beinet bakover. 6–10 per side.'),
('Landmine press','Styrke','Landmine / vektstong','Skulder / triceps','Stå eller knel og press stonga skrått fram og opp. Hald ribbeina over bekkenet. 6–12 per side.'),
('Landmine row','Styrke','Landmine / vektstong','Rygg','Hengsle i hofta og trekk stonga mot overkroppen med stabil rygg. 6–12 per sett.'),
('Landmine squat','Styrke','Landmine / vektstong','Bein / sete','Hald enden av stonga framfor brystet og senk deg kontrollert i knebøy. 6–12 per sett.')
)
INSERT INTO public.exercises(name,category,equipment,body_area,description,is_active,is_rehab)
SELECT c.name,c.category,c.equipment,c.body_area,c.description,true,false FROM candidates c
WHERE NOT EXISTS (SELECT 1 FROM public.exercises e WHERE regexp_replace(lower(e.name),'[^a-z0-9]','','g')=regexp_replace(lower(c.name),'[^a-z0-9]','','g'))
ON CONFLICT (name) DO NOTHING;
