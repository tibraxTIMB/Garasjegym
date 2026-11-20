CREATE UNIQUE INDEX IF NOT EXISTS pt_wod_assignments_one_active_per_member_wod
ON public.pt_wod_assignments(member_id, wod_id)
WHERE status IN ('assigned', 'in_progress');

CREATE OR REPLACE FUNCTION public.save_wod_with_pt_assignment(
  p_wod jsonb,
  p_member_id uuid,
  p_wod_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'app_private'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_wod_id uuid;
  v_is_staff boolean;
  v_publish boolean;
BEGIN
  v_is_staff := public.is_admin_or_manager();

  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.';
  END IF;

  IF jsonb_typeof(p_wod) <> 'object'
     OR NULLIF(BTRIM(p_wod->>'name'), '') IS NULL
     OR p_member_id IS NULL THEN
    RAISE EXCEPTION 'WOD og kunde må vera gyldig valde.';
  END IF;

  IF NOT v_is_staff AND NOT app_private.is_pt_coach_for_member(p_member_id) THEN
    RAISE EXCEPTION 'Du kan berre tildela WOD til kundar som er tildelte deg.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_member_id
      AND p.active = true
      AND p.membership_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Kunden har ikkje ein aktiv og godkjend medlemskonto.';
  END IF;

  v_publish := CASE
    WHEN v_is_staff THEN COALESCE((p_wod->>'is_published')::boolean, false)
    ELSE false
  END;

  IF p_wod_id IS NULL THEN
    INSERT INTO public.wods (
      name, category, format, duration_minutes, movements,
      notes, is_published, created_by, timer_settings
    ) VALUES (
      BTRIM(p_wod->>'name'),
      COALESCE(NULLIF(p_wod->>'category', ''), 'main'),
      COALESCE(NULLIF(p_wod->>'format', ''), 'Eigen økt'),
      NULLIF(p_wod->>'duration_minutes', '')::integer,
      COALESCE(p_wod->>'movements', ''),
      COALESCE(p_wod->>'notes', ''),
      v_publish,
      v_user_id,
      CASE WHEN jsonb_typeof(p_wod->'timer_settings') = 'object'
        THEN p_wod->'timer_settings' ELSE '{}'::jsonb END
    )
    RETURNING id INTO v_wod_id;
  ELSE
    IF NOT v_is_staff AND NOT EXISTS (
      SELECT 1 FROM public.wods w
      WHERE w.id = p_wod_id AND w.created_by = v_user_id
    ) THEN
      RAISE EXCEPTION 'Du kan berre redigera WOD-ar du sjølv har oppretta.';
    END IF;

    UPDATE public.wods
    SET name = BTRIM(p_wod->>'name'),
        category = COALESCE(NULLIF(p_wod->>'category', ''), 'main'),
        format = COALESCE(NULLIF(p_wod->>'format', ''), 'Eigen økt'),
        duration_minutes = NULLIF(p_wod->>'duration_minutes', '')::integer,
        movements = COALESCE(p_wod->>'movements', ''),
        notes = COALESCE(p_wod->>'notes', ''),
        is_published = v_publish,
        timer_settings = CASE WHEN jsonb_typeof(p_wod->'timer_settings') = 'object'
          THEN p_wod->'timer_settings' ELSE '{}'::jsonb END,
        updated_at = pg_catalog.now()
    WHERE id = p_wod_id
    RETURNING id INTO v_wod_id;

    IF v_wod_id IS NULL THEN
      RAISE EXCEPTION 'WOD-en finst ikkje eller kan ikkje redigerast.';
    END IF;
  END IF;

  -- The partial unique index prevents parallel requests or tabs from creating
  -- more than one active assignment for the same client and WOD.
  INSERT INTO public.pt_wod_assignments (
    member_id, wod_id, assigned_by, location, coach_note, status
  ) VALUES (
    p_member_id, v_wod_id, v_user_id, 'Valfritt',
    'Tildelt frå PT Studio', 'assigned'
  )
  ON CONFLICT (member_id, wod_id)
    WHERE status IN ('assigned', 'in_progress')
    DO NOTHING;

  RETURN v_wod_id;
END;
$function$;
