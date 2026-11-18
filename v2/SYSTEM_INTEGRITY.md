# GarasjeGym 2.0 – STURMKOPF
## SYSTEM_INTEGRITY.md – systemintegritet og revisjonslogg

**Sist oppdatert:** 19.11.2026  
**Revisjonsstatus:** Fase 1 kartlegging – første tekniske gjennomgang  
**GitHub-repo:** tibraxTIMB/Garasjegym  
**Arbeidsbranch:** `garasjegym-2.0-sturm­kopf`  
**Kontrollert kodecommit:** `a78f89c675a9354a846dc553e0dbb79236a57f42`  
**Revisjonsdokument commit:** `620212f3b872387cb20a91e2f83a24892b9a9960`  
**Supabase testprosjekt:** `garasjegym-2-test` / `izwzwvlexqxqewzijhhd`

> Dette dokumentet skil mellom statisk kodegjennomgang, databasekontroll, automatiske bygg og manuell ende-til-ende-testing. Ein grøn byggestatus er ikkje bevis på at alle funksjonar verkar i nettlesaren.

## 1. Tryggleiksrammer

- All vidare utvikling skal skje på STURMKOPF-branchen.
- `main` og produksjonsdatabasen skal ikkje endrast.
- Berre Supabase-testprosjektet med ID `izwzwvlexqxqewzijhhd` er kontrollert.
- Ingen betalte tenester eller kostnadsutløysande endringar er godkjende.
- TinyFish skal ikkje brukast.
- Ingen schemaendringar eller kodeendringar er utførte som del av denne første kartlegginga. Denne dokumentasjonsfila er einaste endring i denne revisjonscommiten.

## 2. Arkitektur og moduloversikt

Klient: React 18, Vite 6, JavaScript/JSX, Lucide React og `@supabase/supabase-js` 2.x. Appen nyttar Supabase Auth, Postgres/Data API, RPC, Realtime og to Edge Functions.

| Område | Hovudkomponent(ar) | Viktige datakjelder |
|---|---|---|
| Appskal, navigasjon og autentisering | `App.jsx`, `auth.js`, `supabase.js` | profiles, member_preferences, daily_wod |
| Trening og timer | `Training.jsx`, `deviceLayout.js` | wods, exercises, workout_logs, workout_exercises, workout_sets, personal_records |
| WOD-studio og bibliotek | `WodHub.jsx`, `WodBuilder.jsx`, `WodLibrary.jsx` | wods, exercises, wod_favorites, daily_wod, pt_wod_assignments, training_sessions, training_session_wods |
| Timeplan og booking | `ScheduleHub.jsx`, `Booking.jsx`, `CalendarAdmin.jsx` | classes, class_bookings, class_live_sessions, class_session_wod_completions, calendar_events, pt_sessions, profiles |
| PT og PT-studio | `PT.jsx`, `PTStudio.jsx`, `MyTraining.jsx` | pt_requests, pt_bookings, pt_sessions, pt_session_exercises, pt_messages, pt_client_notes, pt_intakes, pt_client_goals, pt_program_templates, pt_programs, pt_program_sessions, pt_checkins, pt_wod_assignments |
| Medlem og historikk | `MyPage.jsx`, `Overview.jsx` | profiles, workout_logs, personal_records, class_bookings, wod_favorites, pt_wod_assignments |
| Varsel | `Notifications.jsx` | notifications og database-triggarar |
| Kaffibar | `CoffeeBar.jsx` | coffee_products, coffee_orders, coffee_order_items |
| Fellesskap | `Community.jsx`, `Challenges.jsx` | social_posts, social_comments, challenges, challenge_participants |
| Administrasjon | `Admin.jsx` | profiles, exercises, workout_logs, wods og kaffibar-komponent |
| Musikk | `Music.jsx` | ekstern Spotify-/musikkflyt, ingen direkte databasekall i komponenten |
| Resultat frå gruppetime | `GroupClassResults.jsx` | class_live_sessions, wods, workout_logs, class_session_wod_completions |

### Frontend-koplingar som er identifiserte

- `App.jsx` er hovudkoordinator for navigasjon, brukarprofil, superenkel modus, start av WOD, PT-tildeling, gruppetime og djupelenker frå varsel.
- `Training.jsx` er felles treningsmotor og nyttar RPC-en `save_workout_atomic`.
- `ScheduleHub.jsx` samlar Booking, PT og CalendarAdmin.
- `WodHub.jsx` samlar WOD-studio og WOD-bibliotek.
- PT- og gruppetimeflytane sender WOD-ID og kontekst vidare til den same treningsmotoren.
- Varsel brukar interne href-verdiar for navigasjon tilbake til relevant modul.

## 3. Databaseoversikt

Kontrollert testdatabase har **39 tabellar i public-skjemaet**. Alle 39 er rapporterte med RLS aktivert.

Kjerneområde:
- Medlem og tilgang: profiles, member_preferences
- Øving og WOD: exercises, exercise_favorites, wods, wod_favorites, daily_wod
- Trening: workout_logs, workout_exercises, workout_sets, personal_records, training_sessions, training_session_wods
- PT: pt_sessions, pt_requests, pt_bookings, pt_messages, pt_client_notes, pt_session_exercises, pt_wod_assignments, pt_intakes, pt_client_goals, pt_program_templates, pt_programs, pt_program_sessions, pt_checkins
- Gruppetime og kalender: classes, class_bookings, class_live_sessions, class_session_wod_completions, calendar_events
- Fellesskap: social_posts, social_comments, challenges, challenge_participants
- Kaffibar: coffee_products, coffee_orders, coffee_order_items
- Varsel: notifications

Databasekontrollen stadfestar at sentrale kolonnar og relasjonar for WOD, trening, PT, booking, kalender og varsel finst. Kodebasen sine direkte `.from(...)`-referansar vart kartlagde mot testdatabasen; dei identifiserte tabellnamna finst i testskjemaet.

### Migreringsspor – viktig avvik

- GitHub-branch inneheld 38 SQL-filer (inkludert to migreringar i rotmappa og 36 under v2).
- Supabase-testprosjektet rapporterer 46 installerte migreringar.
- 12 installerte migreringsnamn har ikkje ei tilsvarande SQL-fil i noverande repo. Éi er baseline frå produksjonsskjema utan data; 11 er funksjons-/skjemamigreringar.
- Manglande filer omfattar mellom anna bootstrap for første admin, etablering og utviding av varsel, PT-varsel, metadata for øvingsbibliotek, resultatfelt, resultatdata, utviding av øvingskatalog, kopling av PR til treningslogg og fleir-WOD-støtte for live gruppetime.

**Konsekvens:** Testdatabasen har funksjonalitet som ikkje fullt ut kan byggjast opp att frå migreringsfiler i noverande branch. Dette er eit høgt prioritert sporbarheits- og reproduksjonsproblem. Ikkje nullstill eller bygg testdatabasen på nytt før manglande migreringshistorikk er rekonstruert og kontrollert.

## 4. Supabase Security Advisor – funn 19.11.2026

### Høg prioritet

1. **Ni SECURITY DEFINER triggerfunksjonar har framleis EXECUTE til PUBLIC/anon.** Dei er knytte til database-triggarar og er ikkje meint som klient-RPC-ar. Likevel bør rettane avgrensast eksplisitt, slik at dei ikkje blir eksponerte som offentlege funksjonsinngangar. Eksisterande migrering 012 avgrensar to andre triggerfunksjonar, men ikkje desse ni.
2. **15 SECURITY DEFINER-funksjonar er tilgjengelege for authenticated.** Dette omfattar medvite eksponerte operasjonar som PT-booking, kaffibestilling, reaksjonar og rolleoppslag, i tillegg til triggerfunksjonar. Kvar funksjon må vurderast etter faktisk behov, eigarskap, validering og datatilgang; ikkje fjern EXECUTE blindt frå funksjonar som klienten treng.
3. **Leaked Password Protection er deaktivert** i Supabase Auth. Dette er ei innstilling i testprosjektet som bør vurderast før produksjonssetting.

### Middels prioritet

- `public.set_notification_read_at` manglar eksplisitt fast `search_path`.
- 7 tabellar har fleire permissive RLS-policyar for same rolle/handling. Dette er i hovudsak eit ytelses-/vedlikehaldspunkt, men policyane må også kontrollerast for utilsikta samla tilgang.
- RLS-policyane må testast med reelle admin-, manager- og medlemskontoar. At RLS er aktivert på tabellen er ikkje i seg sjølv prov på at policyane er korrekte.

### Supabase Performance Advisor

- 45 RLS initplan-varsel.
- 14 framandnøklar utan dekkjande indeks.
- 7 tilfelle med fleire permissive policyar.
- 31 indeksar er rapporterte som ubruka.

Ubrukte indeksar skal ikkje slettast automatisk: testdatabasen har låg datamengd og kort historikk. Manglande FK-indeksar og RLS-initplanar skal prioriterast etter spørringsmønster og måling.

Health Advisor rapporterte ingen funn i kontrollen.

## 5. Edge Functions og brukaradministrasjon

Testprosjektet har to aktive Edge Functions, begge med JWT-verifisering:
- `admin-delete-user`
- `admin-create-user`

Admin-grensesnittet har funksjon for sletting av medlem via `admin-delete-user`. Det vart ikkje funne nokon klientkall til `admin-create-user` i Admin-komponenten, og det vart ikkje funne ei synleg opprettingshandling i medlemsregisteret. **Edge Function `admin-create-user` er likevel framleis aktiv i testprosjektet.** Dette må avklarast mot kravet om å fjerna moglegheita for å oppretta brukarar. Ho er ikkje deaktivert eller endra i denne kartlegginga.

Sletting av brukar er destruktiv. Endeleg test må brukast med ein dedikert testkonto, aldri ein reell medlemskonto.

## 6. CI og bygg

Siste kontrollerte commit: `a78f89c675a9354a846dc553e0dbb79236a57f42`.

- GitHub Actions `GarasjeGym 2.0 checks`: bestått.
- Steg: checkout, Node-oppsett, installasjon, SQL-migreringsdelimiterkontroll og Vite production build.
- GitHub Actions `Deploy STURMKOPF preview`: bestått.
- Testvising: https://tibraxtimb.github.io/Garasjegym/

Tidlegare commit `74ec360a` hadde ein mislykka byggje-/deploykøyring. Feilen vart retta, og commit `a78f89c6` passerte begge kontrollane.

### Testdekning

`v2/package.json` har skripta `dev`, `build`, `preview` og `check:migrations`. Det finst ikkje eit eige unit-, komponent- eller ende-til-ende-testskript i pakken. CI kontrollerer derfor syntaks/bygg og migreringsdelimiterar, ikkje komplette brukararbeidsflytar.

Kodegjennomgang fann at treningsmotoren ikkje kontrollerte om oppdatering av `pt_wod_assignments` og `pt_program_sessions` faktisk råka ei rad. Supabase kan returnera null feil ved null oppdaterte rader. Dette er no retta i `Training.jsx`: oppdateringane returnerer ID-ar, og manglande oppdatering blir vist som delvis synkroniseringsvarsel medan sjølve treningsloggen blir bevart. Endringa er ikkje manuelt ende-til-ende-testa enno.\n\nIngen manuell Android-, nettbrett- eller desktop-ende-til-ende-test er stadfesta i denne revisjonsøkta.\n\nDokumentasjonscommit `620212f3` har òg bestått GitHub Actions `GarasjeGym 2.0 checks` og `Deploy STURMKOPF preview`.

## 7. Første prioriterte arbeidsliste

| ID | Prioritet | Arbeid | Status |
|---|---|---|---|
| AUD-01 | Kritisk | Rekonstruera manglande migreringsfiler og dokumentera faktisk databasebaseline | BLOKKERT – krev trygg rekonstruksjon |
| AUD-02 | Høg | Hardna EXECUTE-rettar på dei ni triggerfunksjonane og kontrollera default privileges | FEIL FUNNE – ikkje retta |
| AUD-03 | Høg | Gå gjennom alle SECURITY DEFINER-funksjonar og dokumentera kvifor dei må vera definer/invoker | IKKJE TESTA |
| AUD-04 | Høg | Testa RLS med admin, manager og medlem, inkludert forsøk på å lesa/endra andre sine data | IKKJE TESTA |
| AUD-05 | Middels | Setja fast search_path for set_notification_read_at etter kontroll av funksjonskroppen | FEIL FUNNE – ikkje retta |
| AUD-06 | Middels | Avklara om aktiv admin-create-user Edge Function skal fjernast/deaktiverast | BLOKKERT – krav må stadfestast |
| AUD-07 | Middels | Revidera 45 RLS initplan-varsel og 7 doble permissive policysett | IKKJE TESTA |
| AUD-08 | Middels | Vurdera 14 manglande FK-indeksar; ikkje sletta ubruka indeksar utan måling | IKKJE TESTA |
| AUD-09 | Høg | Byggja automatiserte arbeidsflyttestar for WOD → trening → historikk/PR og PT/gruppetime | IKKJE TESTA |
| AUD-10 | Høg | Manuell test på Android-telefon, nettbrett ståande/liggjande og desktop | IKKJE TESTA |\n| AUD-11 | Høg | Avgrensa UPDATE på eigne `pt_wod_assignments` til nødvendige fullføringsfelt | FEIL FUNNE – ikkje retta |\n| AUD-12 | Høg | Avgrensa medlems-UPDATE på `pt_program_sessions` slik at coach-styrte felt ikkje kan endrast av kunden | FEIL FUNNE – ikkje retta |\n| AUD-13 | Middels | Verifisera at PT-tildeling og PT-program faktisk vart oppdatert etter lagra trening | RETTA I KODE – bygg/test ventar |

## 8. Status og avgrensingar

- **GODKJENT:** STURMKOPF-branch identifisert; siste bygg og preview-deploy bestått; 39 public-tabellar har RLS aktivert; dei kartlagde frontend-tabellreferansane finst i testskjemaet.
- **RETTA:** Ikkje utført kode- eller databasefeilretting i denne første kartlegginga.
- **IKKJE TESTA:** Reelle brukarroller, alle booking- og treningsflytar, timerlyd/fullskjerm, mobilrotasjon, Realtime og endeleg dataintegritet etter handlingar.
- **BLOKKERT:** Full reproduksjon av testdatabasen frå GitHub fordi 11 funksjonsmigreringar manglar frå repoet; avklaring av aktiv admin-create-user Edge Function.

**Produksjon og main:** Ingen endringar er utførte i `main` eller produksjonsdatabasen.