-- Store each member's six personal Spotify genre-to-playlist mappings.
alter table public.member_preferences
  add column if not exists spotify_genre_playlists jsonb not null default '{}'::jsonb;

alter table public.member_preferences
  drop constraint if exists member_preferences_spotify_genres_check;

alter table public.member_preferences
  add constraint member_preferences_spotify_genres_check
  check (jsonb_typeof(spotify_genre_playlists) = 'object');

comment on column public.member_preferences.spotify_genre_playlists is
  'Personal Spotify playlist URIs mapped to GarasjeGym quick genre buttons. No Spotify tokens or track catalog data are stored here.';
