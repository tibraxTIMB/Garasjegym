-- GarasjeGym 2.0: safe, atomic member reactions on social posts.
-- Stores reaction keys as arrays of authenticated user IDs in social_posts.reactions.
create or replace function public.toggle_social_reaction(
  p_post_id uuid,
  p_reaction text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id text := auth.uid()::text;
  v_reactions jsonb;
  v_current jsonb;
  v_next jsonb;
  v_has_reacted boolean;
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Aktiv medlemskonto krevst for å reagera.';
  end if;

  if p_reaction not in ('like', 'fire', 'muscle', 'heart') then
    raise exception 'Ugyldig reaksjon.';
  end if;

  select coalesce(reactions, '{}'::jsonb)
    into v_reactions
  from public.social_posts
  where id = p_post_id
  for update;

  if not found then
    raise exception 'Innlegget finst ikkje.';
  end if;

  v_current := coalesce(v_reactions -> p_reaction, '[]'::jsonb);
  if jsonb_typeof(v_current) <> 'array' then
    v_current := '[]'::jsonb;
  end if;

  select exists (
    select 1
    from jsonb_array_elements_text(v_current) as reaction(user_id)
    where reaction.user_id = v_user_id
  ) into v_has_reacted;

  if v_has_reacted then
    select coalesce(jsonb_agg(to_jsonb(reaction.user_id)), '[]'::jsonb)
      into v_next
    from jsonb_array_elements_text(v_current) as reaction(user_id)
    where reaction.user_id <> v_user_id;
  else
    v_next := v_current || jsonb_build_array(v_user_id);
  end if;

  if jsonb_array_length(v_next) = 0 then
    v_reactions := v_reactions - p_reaction;
  else
    v_reactions := jsonb_set(v_reactions, array[p_reaction], v_next, true);
  end if;

  update public.social_posts
  set reactions = v_reactions
  where id = p_post_id;

  return v_reactions;
end;
$$;

revoke all on function public.toggle_social_reaction(uuid, text) from public, anon;
grant execute on function public.toggle_social_reaction(uuid, text) to authenticated;
