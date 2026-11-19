# GarasjeGym 2.0 – STURMKOPF
## SYSTEM_INTEGRITY.md – systemintegritet og revisjonslogg

**Sist oppdatert:** 19.11.2026  
**Revisjonsstatus:** Database-, tilgangs- og PT/WOD-integrasjon – nye WOD-synlegheits- og atomisk tildelingsrettingar implementerte; SQL-testar bestått  
**GitHub-repo:** tibraxTIMB/Garasjegym  
**Arbeidsbranch:** garasjegym-2.0-sturm­kopf  
**Kontrollert kodecommit før denne dokumentoppdateringa:** ea580975135d2b64b59d8bbe02588335f39ff3e8  
**Supabase testprosjekt:** garasjegym-2-test / izwzwvlexqxqewzijhhd

> Dette dokumentet skil mellom statisk kodegjennomgang, databasekontroll, SQL-rollesimulering, automatiske bygg og manuell ende-til-ende-testing. SQL-testar vart køyrde med mellombelse data i transaksjonar som vart rulla tilbake. Dei er ikkje det same som testing i autentisert nettlesar.

## 1. Tryggleiksrammer

- All vidare utvikling skal skje på STURMKOPF-branchen.
- main og produksjonsdatabasen skal ikkje endrast.
- Berre Supabase-testprosjektet med ID izwzwvlexqxqewzijhhd er brukt.
- Ingen betalte tenester eller kostnadsutløysande endringar er lagde til.
- TinyFish er ikkje brukt.
- Ingen eksisterande testdata er sletta eller nullstilt.
- Alle nye databaseendringar er lagde som SQL-migreringar i arbeidsbranchen og køyrde på testprosjektet.

## 2. Arkitektur og moduloversikt

Klient: React 18, Vite 6, JavaScript/JSX, Lucide React og @supabase/supabase-js 2.x. Appen nyttar Supabase Auth, Postgres/Data API, RPC, Realtime og Edge Functions.

| Område | Hovudkomponent(ar) | Viktige datakjelder |
|---|---|---|
| Appskal og autentisering | App.jsx, auth.js, supabase.js | profiles, member_preferences, daily_wod |
| Trening og timer | Training.jsx, deviceLayout.js | wods, exercises, workout_logs, workout_exercises, workout_sets, personal_records |
| WOD-studio og bibliotek | WodHub.jsx, WodBuilder.jsx, WodLibrary.jsx | wods, exercises, wod_favorites, daily_wod, pt_wod_assignments, training_sessions, training_session_wods |
| Timeplan og booking | ScheduleHub.jsx, Booking.jsx, CalendarAdmin.jsx | classes, class_bookings, class_live_sessions, class_session_wod_completions, calendar_events, pt_sessions, pt_bookings |
| PT | PT.jsx, PTStudio.jsx, PTManagement.jsx, MyTraining.jsx | PT-tabellane lista under |
| Medlem og historikk | MyPage.jsx, Overview.jsx | profiles, workout_logs, personal_records, class_bookings, wod_favorites |
| Varsel | Notifications.jsx | notifications og database-triggarar |
| Kaffibar | CoffeeBar.jsx | coffee_products, coffee_orders, coffee_order_items |
| Fellesskap | Community.jsx, Challenges.jsx | social_posts, social_comments, challenges, challenge_participants |
| Resultat frå gruppetime | GroupClassResults.jsx | class_live_sessions, wods, workout_logs, class_session_wod_completions |

Viktige koplingar:
- App.jsx koordinerer navigasjon, brukarprofil, WOD-start, PT-tildeling og gruppetimekontekst.
- Training.jsx er felles treningsmotor.
- WodHub.jsx samlar WOD-studio og bibliotek.
- PT- og gruppetimeflytane sender WOD-/øktkontekst vidare til same treningsmotor.
- save_workout_atomic lagrar treningslogg og øvingar; ny wrapper save_workout_with_pt_links koplar fullføring til PT-tildeling/programøkt i same transaksjon.

## 3. Databaseoversikt

Siste kontroll av testdatabasen:
- **43 tabellar** i public-skjemaet.
- **43 av 43 tabellar har RLS aktivert.**
- **85 framandnøklar**, alle validerte.
- **17 PT-relaterte tabellar**:
  pt_bookings, pt_checkins, pt_client_assignments, pt_client_goals, pt_client_notes, pt_coaches, pt_intakes, pt_messages, pt_program_sessions, pt_program_templates, pt_programs, pt_requests, pt_service_requests, pt_services, pt_session_exercises, pt_sessions, pt_wod_assignments.

WOD-/treningsområde omfattar mellom anna:
wods, exercises, wod_favorites, exercise_favorites, workout_logs, workout_exercises, workout_sets, personal_records, training_sessions, training_session_wods, samt gruppetime- og live-resultattabellane.

### Testdata – viktig avgrensing

| Datatype | Rader ved siste kontroll |
|---|---:|
| WOD-tildelingar | 2 |
| Treningsloggar | 14 |
| WOD-ar | 8 |
| PT-statussjekkar | 1 |
| PT-programmalar | 0 |
| PT-program | 0 |
| PT-programøkter | 0 |
| Registrerte PT-coachar | 0 |
| PT-tenestebestillingar | 0 |
| PT-bookingar | 0 |

Det finst éin aktiv admin og to aktive medlemsprofilar i testprosjektet. Det finst ikkje ein registrert coach eller reelle PT-program i testdata. Derfor er enkelte arbeidsflytar testa med mellombelse transaksjonsdata som vart rulla tilbake.

### Dataintegritet

- Alle 85 framandnøkkelconstraints er validerte.
- Ingen foreldrelause WOD-ID-ar vart funne i classes.wod_ids, class_live_sessions.wod_ids eller pt_sessions.wod_ids.
- Ingen duplikat vart funne i dei kontrollerte koplingane for WOD-favorittar, treningsøkt-WOD-ar eller PT-WOD-tildelingar.
- WOD-sletting er endra: før permanent sletting blir det no kontrollert for referansar i PT-tildelingar, treningsloggar, favorittar, live gruppetimar, gruppetime-WOD-lister, PT-time-WOD-lister, PT-programøkter, treningsøkter, gruppetimegjennomføringar og dagens WOD. Brukte WOD-ar blir arkiverte i staden for sletta.

### Migreringsspor – framleis eit avvik

- GitHub-branch inneheld **47 SQL-filer**.
- Supabase-testprosjektet rapporterer **58 installerte migreringar**.
- **15 installerte migreringsnamn manglar tilsvarande SQL-fil i repoet**. Éi er baseline frå produksjonsskjema utan data; 14 er funksjons-/skjemamigreringar.
- **4 SQL-filer i repoet finst ikkje som installerte migreringar** i Supabase sin migreringslogg.

Manglande migreringsnamn:
- baseline_from_production_schema_no_data
- test_first_signup_admin_bootstrap
- create_notification_center
- notify_admin_pt_requests
- notify_pt_client_session_and_request_status
- link_pt_request_notifications_to_request
- expand_exercise_library_metadata
- add_workout_log_score_fields
- align_workout_log_result_data
- wod_exercise_catalog_expansion
- link_personal_records_to_workout_logs
- multi_wod_class_live_sessions
- 202611190004_pt_coach_registry_and_service_requests
- 202611190005_pt_admin_policy_hardening
- 202611190006_pt_program_weekly_structure

SQL-filer som ikkje finst i migreringsloggen:
- daily_wod
- coffee_order_staff_comment
- member_approval_gate
- wod_dosage_schema_alignment

**Konsekvens:** Testdatabasen kan ikkje byggjast heilt reproducerbart frå migreringsfilene i noverande branch. Ikkje nullstill eller bygg databasen på nytt før historikken er rekonstruert og kontrollert. Nye migreringar er lagde til etter gjeldande databaseversjon, men dei reparerer ikkje den eldre historiske mangelen.

## 4. Brukarrettar og RLS

RLS er aktivert på alle 43 public-tabellane. Gjennomgangen har i tillegg kontrollert policies og faktiske tabellprivilegium – ikkje berre RLS-status.

### Implementerte sikringar

- Medlem kan ikkje endra coach-notat, WOD-ID, kunde, tildelar eller andre administrative felt på eiga pt_wod_assignments. Medlem kan berre oppdatera status og knyta tildelinga til eiga treningslogg.
- Medlem kan ikkje endra programstruktur, WOD-kopling, coach-notat, veke-/dagnummer eller øvingsmetadata i pt_program_sessions. Medlem kan berre oppdatera eigen status og eiga treningslogg.
- Medlem kan senda inn eigne svar på PT-statussjekk, men kan ikkje endra spørsmåla eller avsendarinformasjonen.
- Medlem kan berre avlysa eigne PT-bookingar/førespurnader. Medlem kan ikkje setja inn PT-booking direkte for å omgå kapasitetskontrollen.
- Direkte INSERT/DELETE på pt_bookings er avgrensa til staff. Medlemsbooking går gjennom book_pt_session RPC.
- pt_program_sessions og pt_checkins mangla UPDATE-tabellprivilegium for authenticated sjølv om RLS-policyane tillét oppdatering. Dette er retta med eksplisitt UPDATE-grant; RLS og triggerkontroll avgrensar framleis kva rader og felt som kan endrast.
- Triggerfunksjonar er ikkje lenger eksponerte som klient-RPC-ar.

### Rollemodell – avgrensing

Frontend sin isStaff() reknar aktive admin- og managerprofilar som staff. PT-registeret koplar PT-coach til eksisterande admin-/managerbrukar; det finst ikkje ein separat autentiseringsrolle coach i dagens frontend. Admin/manager har brei staff-tilgang, ikkje avgrensa tilgang berre til eigne PT-kundar. Dette er ein reell avgrensing dersom PT-coach skal ha eit separat, avgrensa kundeområde. Ikkje endra rollemodellen automatisk, sidan det krev ei eksplisitt avgjerd om korleis manager og PT-coach skal skiljast.

## 5. PT/WOD-rettingane som er implementerte

Nye migreringar på STURMKOPF:
- 202611191000_pt_member_update_guards.sql
- 202611191010_restrict_trigger_function_execute.sql
- 202611191020_harden_member_pt_mutations.sql
- 202611191030_atomic_pt_workflows.sql
- 202611191040_grant_pt_workflow_updates.sql
- 202611191050_allow_waitlist_trigger_updates.sql
- 202611191100_atomic_workout_pt_linkage.sql
- 202611191200_wod_member_assigned_visibility.sql
- 202611191210_wod_assignment_atomic_save.sql

Kodeendringar:
- PTManagement.jsx: PT-kundetildeling og godkjenning av tenestebestilling nyttar no atomisk assign_pt_coach RPC. Tidlegare aktiv tilknyting blir ikkje avslutta dersom ny tildeling feilar. Kapasiteten til PT blir kontrollert med transaksjonslås.
- PTStudio.jsx: oppretting av PT-program og alle programøkter skjer no gjennom create_pt_program_with_sessions i éi transaksjon.
- Training.jsx: treningslogg, PT-WOD-tildeling og PT-programøkt blir no lagra gjennom save_workout_with_pt_links i same transaksjon. Feil i PT-kopling rullar tilbake heile lagringa i staden for å etterlata ei treningslogg utan korrekt PT-status.
- WodLibrary.jsx: WOD blir arkivert dersom det finst referansar i dei kontrollerte PT-, trenings-, favoritt- og gruppetimekoplingane. Permanent sletting skjer berre når ingen slike referansar finst.
- WOD-lesepolicy: `wods_read_assigned` er retta slik at privat WOD blir synleg for rett medlem ved direkte PT-tildeling, PT-programøkt eller PT-time med WOD-ID i `wod_ids`. Andre medlemmer får ikkje tilgang.
- WodBuilder.jsx: ny WOD som blir bygd og tildelt frå PT Studio blir no lagra gjennom `save_wod_with_pt_assignment`. Oppretting/redigering og tildeling skjer i éi transaksjon; feil i tildeling rullar tilbake WOD-operasjonen.
- pt_bookings: direkte medlems-INSERT er blokkert. Medlemsbooking går gjennom kapasitetssjekka RPC. Avlysing triggar ventelisteopprykk; ein intern nested-triggeroppdatering er eksplisitt tillaten utan å opna for direkte medlemsendring av andre felt.

Alle nye RPC-ar som utfører administrative handlingar er SECURITY INVOKER og brukar eksisterande RLS-policyar. Triggerfunksjonar har avgrensa EXECUTE-rettar.

## 6. SQL-baserte integrasjons- og tilgangstestar

Følgjande transaksjonstestar vart køyrde mot testdatabasen. Mellombelse rader vart rulla tilbake; ingen testdata vart ståande:

| Test | Resultat |
|---|---|
| Medlem kan endra status på eiga WOD-tildeling | BESTÅTT |
| Medlem kan ikkje endra coach-notat på WOD-tildeling | BESTÅTT |
| Medlem kan endra status på eiga PT-programøkt | BESTÅTT |
| Medlem kan ikkje endra veke-/programstruktur på PT-programøkt | BESTÅTT |
| PT-booking: første medlem får booka plass | BESTÅTT |
| PT-booking: neste medlem blir sett på venteliste | BESTÅTT |
| Avlysing av booka PT-time flyttar neste frå venteliste til booka | BESTÅTT |
| Medlem kan ikkje omgå booking-RPC med direkte INSERT | BESTÅTT |
| Medlem kan senda inn eigne svar på PT-statussjekk | BESTÅTT |
| Medlem kan ikkje endra spørsmåla i PT-statussjekken | BESTÅTT |
| Staff kan gjennomgå innsendt statussjekk | BESTÅTT |
| Atomisk oppretting av PT-program og økter | BESTÅTT |
| Atomisk tildeling av PT-coach og behandling av bestilling | BESTÅTT |
| Treningslogg + WOD-tildeling + PT-programøkt blir kopla atomisk | BESTÅTT |
| Privat WOD tildelt direkte er synleg for rett medlem, ikkje for annan medlem | BESTÅTT |
| Privat WOD knytt til eige PT-program er synleg for medlemmet | BESTÅTT |
| Ny privat WOD + PT-tildeling blir oppretta atomisk via RPC | BESTÅTT |
| Medlem kan ikkje endra coach_note på eiga WOD-tildeling | BESTÅTT |
| Medlem kan ikkje kalla admin-RPC for å oppretta/tildela WOD | BESTÅTT – avvist i SQL-rollesimulering |
| Testdata frå alle transaksjonstestane vart rulla tilbake | BESTÅTT |

Desse testane kontrollerer databasefunksjonar, RLS og tabellprivilegium. Dei dokumenterer ikkje at alle knappar, visingar eller navigasjonsflytar fungerer i nettlesaren.

## 7. Supabase Security og Performance Advisor

### Security Advisor – siste kontroll

- 0 offentleg/anon EXECUTE-funn for SECURITY DEFINER-funksjonar etter at ni triggerfunksjonar fekk avgrensa rettar.
- public.set_notification_read_at har no fast search_path = pg_catalog, public.
- 6 SECURITY DEFINER-funksjonar er framleis tilgjengelege for authenticated: book_pt_session, is_active_user, is_admin, is_admin_or_manager, place_coffee_order og toggle_social_reaction. Desse er vurderte som medvite eksponerte RPC-/rollefunksjonar; dei må framleis haldast under kontroll.
- Leaked Password Protection er framleis deaktivert i Supabase Auth-testprosjektet. Dette er ikkje endra.

### Performance Advisor – siste kontroll

- 20 framandnøklar utan dekkjande indeks.
- 43 RLS initplan-varsel.
- 32 indeksar rapporterte som ubruka.
- 8 tilfelle med fleire permissive policyar.

Ubrukte indeksar er ikkje sletta. Testdatabasen har låg datamengd og kort historikk; indekssletting utan måling kan svekkja framtidige spørringar. Health Advisor rapporterte ingen funn.

## 8. CI, bygg og publisering

- Siste applikasjonskodecommit: ea580975135d2b64b59d8bbe02588335f39ff3e8.
- GarasjeGym 2.0 checks, run 44509569917: BESTÅTT.
- Deploy STURMKOPF preview, run 44509569921: BESTÅTT.
- Preview er oppdatert med den siste WOD/PT-rettinga.
- Preview: https://tibraxtimb.github.io/Garasjegym/

CI kontrollerer installasjon, migreringsdelimiterar og Vite production build. Det finst ikkje eit eige unit-, komponent- eller ende-til-ende-testskript i pakken.

## 9. Gjenståande arbeid og risiko

| Prioritet | Arbeid | Status |
|---|---|---|
| Kritisk | Rekonstruera dei 15 manglande installerte migreringane og avklara dei 4 SQL-filene som ikkje er i migreringsloggen | OPEN – ikkje nullstill database |
| Høg | Avklara separat PT-coachrolle og tilgang berre til eigne tildelte kundar | OPEN – krev rolleavgjerd |
| Høg | Manuell nettlesartest av WOD-builder → publisering → tildeling → utføring → historikk/PR | IKKJE TESTA |
| Høg | Manuell nettlesartest av PT-program, PT-tildeling, booking, statusoppfølging og medlemsvising | IKKJE TESTA |
| Høg | Manuell rollebasert test med reelle admin-, manager- og medlemskontoar | DELVIS – SQL-simulering bestått, UI ikkje testa |
| Høg | Manuell Android-/nettbretttest, ståande og liggjande | IKKJE TESTA |
| Middels | Verifisera WOD-builder sin nye atomiske WOD-/tildelingsflyt i autentisert nettlesar | IKKJE MANUELT TESTA |
| Middels | Vurdera dei 20 manglande FK-indeksane og 43 RLS-initplan-varsla | OPEN |
| Middels | Vurdera 8 doble permissive policysett | OPEN |
| Middels | Avklara leaked password protection i Auth | OPEN |

## 10. Endeleg status

- **DATABASE:** 43/43 tabellar med RLS; 85 validerte framandnøklar.
- **PT/WOD-TILGANG:** Kritiske medlemsoppdateringar er avgrensa og SQL-rollesimuleringar bestått.
- **PT-FLYTAR:** Atomisk programoppretting, coach-tildeling og PT-booking er SQL-testa.
- **WOD/TRENING:** Atomisk kopling mellom treningslogg, PT-WOD-tildeling og programøkt er SQL-testa.
- **WOD-SLETTING:** Historiske koplingar blir kontrollerte før permanent sletting; brukte WOD-ar blir arkiverte.
- **SECURITY ADVISOR:** Dei ni offentleg tilgjengelege triggerfunksjonane er lukka for klientkall; seks tilsikta authenticated SECURITY DEFINER-funksjonar står att.
- **CI/PREVIEW:** BESTÅTT for commit ea580975135d2b64b59d8bbe02588335f39ff3e8 (checks og deploy).
- **MANUELL TEST:** Ikkje utført i autentisert nettlesar eller på fysisk Android-/nettbrett.

**Produksjon og main:** Ingen endringar er utførte i main eller produksjonsdatabasen.
