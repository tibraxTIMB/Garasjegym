-- Demo content for the isolated GarasjeGym 2.0 test project only.
insert into public.exercises (name, category, equipment, description)
values
 ('Air squat','Bein','Kroppsvekt','Knebøy med eigen kroppsvekt'),
 ('Goblet squat','Bein','Kettlebell/manual','Knebøy med vekta framfor brystet'),
 ('Push-up','Overkropp','Kroppsvekt','Armheving'),
 ('Strict pull-up','Overkropp','Pull-up-stong','Strikt kroppsheving'),
 ('Deadlift','Styrke','Stong','Markløft'),
 ('Burpee','Kondisjon','Kroppsvekt','Burpee med kontrollert tempo'),
 ('Row','Kondisjon','Romaskin','Roing på romaskin')
on conflict (name) do nothing;

insert into public.wods (name, format, duration_minutes, movements, notes, audience, is_published)
values
 ('Test-WOD: Garasjerunden','AMRAP',12,
  '8 Air squat\n6 Push-up\n4 Burpee',
  'Demoøkt for å testa registrering, rundar og resultat.','Alle medlemmar',true)
on conflict do nothing;

insert into public.coffee_products (name, description, price, is_active, sort_order)
values
 ('Espresso','Dobbel espresso',25,true,1),
 ('Americano','Espresso med varmt vatn',30,true,2),
 ('Cappuccino','Espresso med mjølk',35,true,3),
 ('Flat white','Dobbel espresso med mjølk',38,true,4)
on conflict do nothing;

insert into public.classes (title, type, capacity, starts_at, duration_minutes, description, workout_text)
values
 ('Testøkt – Garasjerunden','WOD',8,now()+interval '1 day',45,
  'Demo-time for å testa påmelding og synkronisering.',
  '12 min AMRAP: 8 Air squat, 6 Push-up, 4 Burpee')
on conflict do nothing;
