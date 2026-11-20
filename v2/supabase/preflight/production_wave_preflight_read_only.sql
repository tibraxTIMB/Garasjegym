-- READ-ONLY preflight for SturmKopf Feuer 1.1 production wave planning.
-- Safe to run against production: SELECT only. This does not apply migrations.
with required_objects(object_name, wave) as (
 values
 ('profiles','membership'),
 ('classes','class_booking'),
 ('class_bookings','class_booking'),
 ('pt_sessions','pt_studio_legacy'),
 ('pt_bookings','pt_studio_legacy'),
 ('pt_coaches','pt_studio'),
 ('pt_client_assignments','pt_studio'),
 ('pt_intakes','pt_studio'),
 ('pt_client_goals','pt_studio'),
 ('pt_program_templates','pt_studio'),
 ('pt_programs','pt_studio'),
 ('pt_program_sessions','pt_studio'),
 ('pt_checkins','pt_studio'),
 ('wods','wod_workout'),
 ('exercises','wod_workout'),
 ('workout_logs','wod_workout'),
 ('workout_exercises','wod_workout'),
 ('workout_sets','wod_workout'),
 ('personal_records','wod_workout'),
 ('notifications','notifications'),
 ('coffee_products','coffee'),
 ('coffee_orders','coffee'),
 ('coffee_order_items','coffee'),
 ('calendar_events','calendar'),
 ('wod_favorites','favorites'),
 ('social_posts','social')
),
object_state as (
 select r.wave,r.object_name,
   case when t.table_name is null then 'MISSING' else 'PRESENT' end as state
 from required_objects r
 left join information_schema.tables t
   on t.table_schema='public' and t.table_name=r.object_name
),
column_state as (
 select 'profiles.email' as object_name,
   case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='email') then 'PRESENT' else 'MISSING' end as state
 union all select 'profiles.membership_status',
   case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='membership_status') then 'PRESENT' else 'MISSING' end
 union all select 'classes.published',
   case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='classes' and column_name='published') then 'PRESENT' else 'MISSING' end
 union all select 'classes.instructor_id',
   case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='classes' and column_name='instructor_id') then 'PRESENT' else 'MISSING' end
 union all select 'class_bookings.attendance_status',
   case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='class_bookings' and column_name='attendance_status') then 'PRESENT' else 'MISSING' end
 union all select 'workout_logs.result_data',
   case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='workout_logs' and column_name='result_data') then 'PRESENT' else 'MISSING' end
),
rls_state as (
 select c.relname as table_name,
   case when c.relrowsecurity then 'RLS_ON' else 'RLS_OFF' end as state
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r'
)
select 'TABLE' as check_type, wave as area, object_name, state from object_state
union all
select 'COLUMN','schema_contract',object_name,state from column_state
union all
select 'RLS','rls',table_name,state from rls_state
order by check_type,area,object_name;
