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
SQL-filene ligg i supabase/migrations/. Dei er ikkje automatisk køyrde mot Supabase. Les gjennom og køyr dei i rett rekkjefølgje i Supabase SQL Editor før du testar funksjonane som krev dei:
1. 202611160001_save_workout_atomic.sql – atomisk lagring av økt, øvingar og sett.
2. 202611160002_coffee_bar.sql – kaffiprodukt, ordre, ordrelinjer, RLS og trygg bestillings-RPC.
3. 202611160003_exercise_favorites.sql – medlemsfavorittar for øvingar.
4. 202611160004_lock_class_capacity.sql – låsing av gruppetime ved kapasitetssjekk for å unngå overbooking ved samtidige påmeldingar.

Køyr aldri desse filene på produksjonsdatabasen utan å kontrollera prosjekt, ta backup og godkjenna migreringa først. Klientfunksjonar som nyttar ein ny tabell eller RPC vil ikkje fungera før den tilhøyrande migreringa er installert.

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
