# GarasjeGym 2.0 – STURMKOPF

Dette er ei separat utviklingsutgåve. GarasjeGym 1.8.16 og produksjonsdata skal vera urørte fram til 2.0 er testa og uttrykkeleg godkjend.

## Teknologi
- React 18
- Vite 6
- Supabase JS
- Lucide-ikon

## Lokal utvikling
Krev Node.js 20 eller nyare.

```bash
cd v2
npm install
cp .env.example .env.local
npm run dev
```

Fyll inn VITE_SUPABASE_URL (Project URL) og VITE_SUPABASE_PUBLISHABLE_KEY (publishable key som byrjar med sb_publishable_).
Bruk aldri service_role eller ein secret key i nettlesarkode. Ikkje legg .env.local i Git.

## Funksjonar som er bygde i klienten
- E-post/passord-innlogging, registrering og passordlenkje.
- Medlemsprofil og rollebasert navigasjon.
- Oversikt med treningsaktivitet, Garasjekadett-rangering og styrkeprosentar.
- Felles treningsmotor for fri økt og WOD: øvingsliste, favorittar, sett, reps, kg, tid, notat og historikk.
- Timer for EMOM, AMRAP, For Time, Tabata, intervall, stoppeklokke og nedteljing.
- Registrering og vising av personlege rekordar.
- Gruppetimar med oppretting for staff og på-/avmelding for medlem.
- PT-studio med publiserte timar, booking via database-RPC og førespurnad.
- Garasjeprat med innlegg og kommentarar.
- Kaffibar med produkt, handlekorg, bestilling og ordrestatus for staff.
- Admin med medlemsroller/aktiv status, WOD-studio og øvingsbibliotek.

## Database-migreringar
SQL-filene ligg i supabase/migrations/. Dei er staged i GitHub og er ikkje automatisk køyrde mot Supabase. Supabase sin aktive migreringslogg må kontrollerast før kvar utrulling. Migreringane skal testast på ei isolert utviklingsgrein i denne rekkjefølgja:

1. 202611160001_save_workout_atomic.sql – atomisk lagring av økt, øvingar og sett.
2. 202611160002_coffee_bar.sql – kaffiprodukt, ordre, ordrelinjer, RLS og bestillings-RPC.
3. 202611160003_exercise_favorites.sql – medlemsfavorittar for øvingar.
4. 202611160004_lock_class_capacity.sql – låsing av gruppetime ved kapasitetssjekk.
5. 202611160005_class_live_sessions.sql – delt live-tilstand for gruppetimar.
6. 202611160006_wod_timer_settings.sql – timerinnstillingar på WOD.
7. 202611160007_group_session_wod_timer.sql – delt WOD- og timeroppsett for gruppetime.
8. 202611160008_class_workout_results.sql – kopling av personlege treningsresultat til live gruppetime og oppdatert atomisk lagrings-RPC.

Migrering 008 byggjer vidare på 001 og krev at 005 har oppretta `class_live_sessions`. Kontroller heile SQL-pakken og funksjonstryggleiken før installasjon. Ikkje køyr migreringane direkte mot produksjonsdatabasen utan backup, gjennomgang og uttrykkeleg godkjenning. Klientfunksjonar som nyttar nye tabellar, kolonnar eller RPC-ar vil ikkje fungera før tilhøyrande migrering er installert. Treningsklienten har fallback dersom `wods.timer_settings` enno ikkje finst, slik at WOD-biblioteket framleis kan lastast.

## Kjende avgrensingar / vidare arbeid
- Timerlogikken må testast på faktiske telefonar, særleg når skjermen går i dvale eller nettlesaren blir minimert.
- Gruppetimane manglar synkronisert live-økt mellom instruktør og deltakarar.
- PT-planar, meldingar og klientnotat må få eigne fullverdige skjermar.
- Favorittfunksjonen krev at favorittmigreringa er installert i databasen.
- Kaffibar-geofence, lyd/varsel og eventuelle betalingar er ikkje implementerte.
- Sosiale bilete, reaksjonar, utfordringar og varsling står att.
- Admin manglar full drift for booking, PT, kaffibar, varsling og innstillingar.
- Full ende-til-ende-testing med medlem, manager, admin og fleire einingar er ikkje utført.

## Tryggleik og lansering
- Supabase RLS er den endelege tilgangskontrollen.
- Rollene admin og manager blir lesne frå profiles; dei kan ikkje veljast i registreringsskjemaet.
- Nye Auth-brukarar skal få medlemsprofil gjennom handle_new_auth_user.
- Ingen produksjonssetting eller endring av 1.8.16 er godkjend.

### Nye staged migreringar (ikkje køyrde)

- `202611160005_class_live_sessions.sql` opprettar delt tilstand for aktive gruppetimar, med RLS for instruktørar og påmelde deltakarar. Migreringa er berre lagra i utviklingsgreina og er ikkje køyrd mot Supabase.

- Booking-klienten viser no delt live-status for gruppetimar og gir stab start/pause/gjenoppta/avslutt. Krev `202611160005_class_live_sessions.sql` før funksjonen kan brukast.
