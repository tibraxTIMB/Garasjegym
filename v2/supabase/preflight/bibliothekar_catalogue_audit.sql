-- Read-only release checks. Run against the actual deployed database, not by project name.
SELECT category,count(*) FILTER(WHERE is_active) AS active_count FROM public.exercises GROUP BY category ORDER BY category;
SELECT name FROM public.exercises WHERE is_active AND (nullif(trim(description),'') IS NULL OR nullif(trim(equipment),'') IS NULL OR nullif(trim(body_area),'') IS NULL);
SELECT regexp_replace(lower(name),'[^a-z0-9]','','g') AS key,array_agg(name ORDER BY name) AS names FROM public.exercises WHERE is_active GROUP BY 1 HAVING count(*)>1;
SELECT name,category,body_area FROM public.exercises WHERE is_active AND (body_area='Fullkropp' OR video_url IS NULL OR prescription_profiles='{}'::jsonb) ORDER BY category,name;
