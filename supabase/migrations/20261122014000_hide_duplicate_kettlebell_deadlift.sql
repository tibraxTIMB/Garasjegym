-- Keep old workout references intact while removing confusing duplicate entries
-- from the active exercise catalogue. Kettlebell Snatch stays active.
UPDATE public.exercises
SET is_active = false
WHERE name IN ('Kettlebell Deadlift / Markløft', 'Kettlebell markløft');
