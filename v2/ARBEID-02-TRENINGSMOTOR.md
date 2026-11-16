# Arbeidsfelt 2 – Felles treningsmotor

## Mål
Éin felles treningsmotor skal handtera:
1. Fri trening
2. Planlagd WOD
3. Gruppetime
4. PT-økt

Desse er ulike inngangar og rammer rundt økta. Dei skal ikkje ha kvar sin separate logikk for øvingsregistrering, sett, resultat og historikk.

## Status ved første kodegjennomgang

Den første `Training.jsx`-gjennomgangen viste ein enkel WOD-visar:
- Hentar publiserte WOD-ar frå `wods`.
- Hentar aktive øvingar frå `exercises`.
- Let medlem velja ein WOD.
- Lagrar eit enkelt resultat i `workout_logs`.

Dette var startpunktet. Den seinare første klientversjonen har no øktbyggjar, fri trening, settregistrering og historikk, men krev framleis endeleg kontroll mot skjema og trygg lagring.

## Datamodell – eksisterande tabellar

| Tabell | Ansvar i motoren |
|---|---|
| `workout_logs` | Ei treningsøkt, eigar, dato, kjelde og overordna resultat |
| `workout_exercises` | Øvingane i økta, rekkjefølgje og namn ved utføring |
| `workout_sets` | Sett/resultat per øving: repetisjonar, belastning og tid |
| `exercises` | Felles øvingsbibliotek |
| `wods` | Førehandsdefinerte økter og WOD-oppsett |
| `personal_records` | Personlege rekordar; må kartleggjast før kopling |

## Felles øktflyt

1. Vel inngang: fri trening, WOD, gruppetime eller PT.
2. Opprett ei økt i klienttilstand med kjelde, dato og øvingsliste.
3. Legg til, fjern eller flytt øvingar.
4. Registrer sett med reps, kg og tid.
5. Køyr eventuell timer uavhengig av lagringslogikken.
6. Vis ei oppsummering før lagring.
7. Lagre økt, øvingar og sett samla gjennom éin server-side transaksjon/RPC.
8. Hent økta att frå treningsloggen og vis same resultat på andre einingar.

## Timerformat som skal støttast

- EMOM
- AMRAP
- For Time
- Tabata
- Intervall
- Stoppeklokke
- Nedteljing
- Tilpassa format

Timeren skal vera ein eigen komponent/teneste som kan brukast av alle inngangane. Timeren skal ikkje vera ansvarleg for å lagra treningsdata.

## Implementeringsrekkjefølgje

1. Kontrollera faktiske kolonnar, null-reglar, foreign keys, RLS og policies.
2. Definera felles øktmodell og validering i klienten.
3. Byggja øvingsredigering og settregistrering.
4. Byggja felles øktoppsummering.
5. Implementera samla lagring etter at trygg server-side strategi er bestemt.
6. Leggja på timerformata.
7. Kopla treningslogg og PR.
8. Kopla WOD, gruppetime og PT som inngangar til same motor.

## Tryggleiks- og datakrav

- Medlem skal berre kunna oppretta og lesa eigne treningsresultat, med mindre ei eksplisitt rollebasert funksjon krev meir.
- Ein brukar skal ikkje kunna endra eigarskap på ei økt.
- Serveren/databasen må kontrollera eigarskap; klientkontroll åleine er ikkje nok.
- Feil ved lagring skal ikkje etterlata ei halv økt med manglande sett.
- Dato og tid skal handterast konsekvent med lokal treningsdato og lagra tidsstempel.
- PR skal ikkje reknast ut frå ufullstendige eller ugyldige resultat.

## Implementert første klientversjon (16.11.2026)

- Ny treningsoversikt med inngang til fri trening og publiserte WOD-ar.
- Felles øktbyggjar med tittel, format, varigheit, øvingsliste og fleire sett per øving.
- Søk i øvingsbibliotek og moglegheit for å leggja inn ei eiga øving.
- Registrering av repetisjonar, kg og tekstleg tid per sett.
- Timerkontroll med start, pause og nullstilling. EMOM har enkel rundeteljing; dei ulike timerformata treng framleis eigne reglar og full testing.
- Registrering av rundar, ekstra repetisjonar, sluttid og notat.
- Lagring mot eksisterande `workout_logs`, `workout_exercises` og `workout_sets`.
- Treningshistorikk med øvingar og sett.

## Supabase-skjema- og RLS-kontroll (16.11.2026)

Kontrollert direkte mot Supabase-prosjektet Garasjegym, utan å endra databasen:

- `workout_logs`: `id`, `member_id`, `source_wod_id`, `title`, `workout_date`, `format`, `rounds`, `score_rounds`, `score_reps`, `note`, `created_at`, `updated_at`.
- `workout_exercises`: `id`, `workout_log_id`, `exercise_id`, `exercise_name`, `source_text`, `sort_order`, `created_at`.
- `workout_sets`: `id`, `workout_exercise_id`, `set_number`, `reps`, `load_kg`, `time_text`, `time_seconds`, `created_at`.
- Fremmednøklar koplar sett til øving og øving til økt. Sletting av ei økt cascader til øvingar og sett.
- `workout_sets` har unik kombinasjon av `workout_exercise_id` og `set_number`.
- RLS er aktivert på alle tre tabellane.
- `workout_logs` har eigne policies for SELECT, INSERT, UPDATE og DELETE. INSERT krev at `member_id = auth.uid()` for aktive medlemmar, med staff-unntak.
- `workout_exercises` og `workout_sets` har policies som kontrollerer eigarskap via foreldreøkta.
- Ingen `save_workout_atomic`-RPC er installert i den aktive Supabase-databasen.
- Klienten kallar allereie `supabase.rpc('save_workout_atomic', { p_workout: payload })`; ved manglande funksjon viser han ei forklaring og lagrar ikkje via delvise klientkall.
- GitHub-greina inneheld åtte staged SQL-migreringar under `v2/supabase/migrations/`, inkludert `202611160001_save_workout_atomic.sql`, `202611160005_class_live_sessions.sql`, `202611160006_wod_timer_settings.sql` og `202611160008_class_workout_results.sql`.
- Supabase sin aktive migreringslogg viser berre tre tryggleiksmigreringar frå 16.11.2026. Dei åtte funksjonsmigreringane er difor ikkje dokumenterte som installerte der.
- `wods.timer_settings` finst ikkje i det aktive skjemaet per kontrollen.

## Neste tekniske steg

Installasjon og verifikasjon av den allereie skisserte atomiske lagringsfunksjonen er neste leveranse. Migrering 008 erstattar/utvidar funksjonen frå migrering 001 med kopling til live gruppetime. Kontroller heile migreringsrekkjefølgja før installasjon. Funksjonen skal:
1. Hentar eigar frå `auth.uid()` – klienten får ikkje velja `member_id`.
2. Validerer tittel, dato, format, øvingsliste og sett.
3. Opprettar `workout_logs`, alle `workout_exercises` og alle `workout_sets` i same Postgres-transaksjon.
4. Brukar vanleg invoker-rettskontekst og dei eksisterande RLS-policyane; ikkje innfører `SECURITY DEFINER` for å omgå tilgangskontroll.
5. Returnerer ID-en til den lagra økta. Ved feil skal heile transaksjonen rullast tilbake.

Dei eksisterande SQL-filene skal først køyrast og testast på ei isolert utviklingsdatabase, i rett rekkjefølgje. Ikkje køyr DDL eller migreringar mot delt produksjonsdatabase som del av dette steget. Ikkje lag duplikate migreringsfiler når funksjonen allereie ligg i `v2/supabase/migrations/`.

## Viktige avgrensingar før feltet kan godkjennast

- Klienten er kopla til atomisk RPC, men lagring vil feila kontrollert fram til funksjonen er installert i den aktuelle databasen. RPC må tryggleikstestast i utviklingsmiljø før produksjonsbruk.
- Gruppetime og PT er ikkje kopla som inngangar til motoren enno.
- Full funksjonalitet for EMOM, AMRAP, For Time, Tabata, intervall, nedteljing og tilpassa timer er ikkje ferdig.
- PR-registrering, progresjonsvising, Garasjekadett og fullskjerms Training Mode er ikkje ferdig.
- Nettlesartesting med reelle medlem, fleire einingar og feiltilstandar er ikkje utført.
- Koden er ikkje produksjonssett; 1.8.16 og produksjonsdata er urørte.

## Avgrensing

Dette dokumentet er ei teknisk arbeidsplan, ikkje godkjenning for databaseskjemaendringar. Skjemakontrollen er no utført. Neste steg er å installera og testa dei eksisterande migreringane i eit isolert utviklingsmiljø. Klienten er allereie kopla til RPC-grensesnittet.
