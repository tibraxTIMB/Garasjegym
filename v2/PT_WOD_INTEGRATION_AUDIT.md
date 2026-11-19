# PT / WOD – integrasjons- og funksjonsstatus

**Dato:** 19.11.2026  
**Branch:** garasjegym-2.0-sturm­kopf
**Kontrollert kodecommit:** 1e47ad6c43c09534cd75f4e11946d4bf724464d9  
**Testprosjekt:** garasjegym-2-test (izwzwvlexqxqewzijhhd)

## Statusnøkkel

- **FERDIG OG SQL-TESTA:** Databasefunksjon, rettar og transaksjonsflyt er testa med SQL-rollesimulering.
- **IMPLEMENTERT – IKKJE MANUELT TESTA:** Kode og database er implementerte, men UI-flyten er ikkje testa i autentisert nettlesar.
- **DELvis IMPLEMENTERT:** Ein del av flyten fungerer, men det står att ei avgrensing eller eit avhengig arbeid.
- **OPEN:** Ikkje ferdigstilt eller krev avklaring.

## 1. WOD-bibliotek og oppretting

| Funksjon | Status | Merknad |
|---|---|---|
| Oppretting/lagring av WOD | IMPLEMENTERT – IKKJE MANUELT TESTA | WodBuilder lagrar WOD og øvingsoppsett. |
| Publisering/avpublisering | IMPLEMENTERT – IKKJE MANUELT TESTA | WOD-biblioteket styrer synlegheit. |
| Favoritt per brukar | IMPLEMENTERT – IKKJE MANUELT TESTA | wod_favorites er knytt til user_id. |
| AMRAP, EMOM, For Time, Tabata og stasjonssirkel | IMPLEMENTERT – IKKJE MANUELT TESTA | Timer-/WOD-konfigurasjon ligg i timer_settings og movements. |
| Pause som øving | DELvis IMPLEMENTERT | Må stadfestast manuelt i builder og treningsmodus. |
| Plyo box målt i cm | DELvis IMPLEMENTERT | Datamodell og vising må kontrollerast mot øvingsbiblioteket i nettlesar. |
| Stasjonssirkel 2–8 stasjonar | IMPLEMENTERT – IKKJE MANUELT TESTA | Timerlogikk og stasjonsoppsett må testast med fleire deltakarar. |
| WOD-sletting/arkivering | IMPLEMENTERT – IKKJE MANUELT TESTA | Sletting kontrollerer no referansar i PT, trening, favorittar, live gruppetime, JSON-/array-koplingar og dagens WOD. Brukte WOD-ar blir arkiverte. |
| Privat WOD synleg ved direkte PT-tildeling | FERDIG OG SQL-TESTA | `wods_read_assigned` gir tilgang til rett medlem, men ikkje andre medlemmer. |
| Privat WOD synleg frå PT-program | FERDIG OG SQL-TESTA | Policyen kontrollerer `pt_program_sessions` og eigarskap gjennom `pt_programs`. |
| Privat WOD synleg frå PT-time (`wod_ids`) | FERDIG OG SQL-TESTA | Testa med `pt_sessions.wod_ids`; berre den tilknytte kunden fekk lese WOD-en. |
| Privat WOD synleg i gruppetime | FERDIG OG SQL-TESTA | Stadfesta deltakar kan lesa WOD i publisert gruppetime; annan medlem får ikkje tilgang. |
| Privat WOD synleg i live gruppetime | FERDIG OG SQL-TESTA | Stadfesta deltakar kan lesa WOD frå `class_live_sessions.wod_ids`. |
| WOD + PT-kundetildeling i éi transaksjon | FERDIG OG SQL-TESTA | `save_wod_with_pt_assignment` lagrar WOD og kundetildeling i same transaksjon. Feil rullar tilbake heile operasjonen. WodBuilder brukar RPC-en når WOD blir bygd frå PT Studio. |

## 2. WOD-utføring og treningshistorikk

| Funksjon | Status | Merknad |
|---|---|---|
| WOD-kort → start trening | IMPLEMENTERT – IKKJE MANUELT TESTA | Appen sender WOD-kontekst til Training.jsx. |
| Privat PT-WOD → medlemskort med WOD-data | FERDIG OG SQL-TESTA | SQL-rollesimulering stadfesta at rett medlem ser WOD-data, medan annan medlem ikkje ser den private WOD-en. |
| Lagre treningslogg og øvingar atomisk | FERDIG OG SQL-TESTA | save_workout_atomic. |
| Idempotent lagring | FERDIG OG SQL-TESTA | save_token hindrar dobbeltlagring ved gjenteken innsending. |
| Treningslogg → PT-WOD-tildeling | FERDIG OG SQL-TESTA | save_workout_with_pt_links koplar loggen og fullfører tildeling i same transaksjon. |
| Treningslogg → PT-programøkt | FERDIG OG SQL-TESTA | Same RPC koplar loggen og fullfører programøkta atomisk. |
| Treningshistorikk og PR | DELvis IMPLEMENTERT | Historikk blir lagra; PR-logikken må testast manuelt med ulike einingar og øvingstypar. |
| Resultat med kg, tid, distanse, kaloriar og høgde | DELvis IMPLEMENTERT | Datamodell har resultatfelt, men alle måleeiningar må gjennomgåast manuelt. |

## 3. PT-program og oppfølging

| Funksjon | Status | Merknad |
|---|---|---|
| Programmal | IMPLEMENTERT – IKKJE MANUELT TESTA | PTStudio les aktive malar. Testdatabasen har førebels ingen malrader. |
| Opprette program med fleire økter | FERDIG OG SQL-TESTA | create_pt_program_with_sessions opprettar program og økter atomisk. |
| Leggje WOD til programøkt | IMPLEMENTERT – IKKJE MANUELT TESTA | pt_program_sessions.wod_id og workout_snapshot blir oppdaterte av staff. |
| Flytte/endre rekkjefølgje | IMPLEMENTERT – IKKJE MANUELT TESTA | Staff-flyt; må testast i UI. |
| Medlem fullfører programøkt | FERDIG OG SQL-TESTA | Medlem kan oppdatera status og eiga treningslogg, ikkje programstruktur. |
| Mål og progresjon | IMPLEMENTERT – IKKJE MANUELT TESTA | pt_client_goals og programprogress er kopla i PTStudio. |
| Statussjekk | FERDIG OG SQL-TESTA | Medlem kan senda eigne svar; staff kan markera gjennomgått. |
| PT-notat og meldingar | DELvis IMPLEMENTERT | RLS og tabellar finst; coach-scope og full meldingsflyt må testast manuelt. |

## 4. PT-tildeling og booking

| Funksjon | Status | Merknad |
|---|---|---|
| Tildela PT til kunde | FERDIG OG SQL-TESTA | assign_pt_coach avsluttar tidlegare aktiv tilknyting og opprettar ny i same transaksjon. |
| Godkjenna PT-tenestebestilling med coach | FERDIG OG SQL-TESTA | Same RPC oppdaterer service request og kundetildeling atomisk. |
| Kapasitetskontroll for coach | FERDIG OG SQL-TESTA | Transaksjonslås hindrar samtidige tildelingar i å overskrida kapasitet. |
| Booka PT-time | FERDIG OG SQL-TESTA | book_pt_session kontrollerer aktiv brukar, tidspunkt, duplikat og kapasitet. |
| Venteliste | FERDIG OG SQL-TESTA | Testa med to medlemmer: første fekk booka plass, andre kom på venteliste. |
| Avlysing og ventelisteopprykk | FERDIG OG SQL-TESTA | Avlysing av første booking flytta neste medlem til booka. |
| Direkte medlems-INSERT i pt_bookings | FERDIG OG SQL-TESTA | RLS avviser direkte INSERT; booking må gå gjennom RPC. |
| PT-booking i autentisert UI | IMPLEMENTERT – IKKJE MANUELT TESTA | Krev manuell test med medlem og staff. |
| Medlem kan berre lesa eigne gruppetimepåmeldingar | FERDIG OG SQL-TESTA | RLS er avgrensa til eigne rader; aggregert deltakarantal kjem frå `get_class_attendance_counts`. Staff ser framleis full deltakaroversikt. |
| Gruppetimebooking og varseltrigger | FERDIG OG SQL-TESTA | Ny booking opprettar `group`-varsel utan at kategorikontrollen avviser transaksjonen. |
| Medlem ser berre publiserte gruppetimar | FERDIG OG SQL-TESTA | RLS skjuler upubliserte timar for medlemmer; admin/manager kan framleis sjå utkast. |

## 5. Tilgangsmodell – viktig avgrensing

Dagens frontend bruker aktive admin- og managerprofilar som staff. PT-coach blir registrert i pt_coaches, men må vera ein eksisterande admin-/managerbrukar. Det finst ikkje ein separat coach-autentiseringsrolle i auth.js.

Database- og frontendtilgang for admin/manager er brei staff-tilgang. Systemet avgrensar ikkje PT-coach til berre eigne kundar. Dersom dette er eit krav, må det etablerast ei eksplisitt rolle-/tilgangsavklaring før ny policy og UI-tilpassing. Ikkje gje ein medlemsprofil coach-rettar berre ved å leggja inn ein rad i pt_coaches.

## 6. SQL-baserte testar som er gjennomførte

Alle testane under vart køyrde på testprosjektet med mellombelse data og rulla tilbake:

1. Medlem kan endra status på eiga WOD-tildeling, men ikkje coach-notat.
2. Medlem kan endra status på eiga PT-programøkt, men ikkje veke-/programstruktur.
3. PT-booking kapasitet, venteliste, avlysing og automatisk opprykk.
4. Direkte INSERT i pt_bookings blir avvist for medlem.
5. Medlem kan senda inn svar på statussjekk, men ikkje endra spørsmåla.
6. Staff kan markera statussjekk som gjennomgått.
7. PT-program og alle programøkter blir oppretta atomisk.
8. PT-coach og service request blir kopla atomisk.
9. Treningslogg, PT-WOD-tildeling og PT-programøkt blir fullførte og kopla i same transaksjon.
10. Alle mellombelse testdata vart rulla tilbake.
11. Medlem ser privat WOD ved direkte PT-tildeling, men ikkje WOD tildelt til annan medlem.
12. Medlem ser privat WOD kopla til eige PT-program.
12a. Medlem ser privat WOD kopla til eiga PT-time via `pt_sessions.wod_ids`.
13. `save_wod_with_pt_assignment` opprettar WOD og PT-tildeling atomisk for staff; den private WOD-en blir deretter synleg for kunden.
14. Medlem blir avvist ved forsøk på å endra coach-notat på eiga WOD-tildeling.
15. Medlem blir avvist ved forsøk på å kalla `save_wod_with_pt_assignment`.
16. Privat WOD i publisert gruppetime er synleg for stadfesta deltakar, ikkje annan medlem.
17. Privat WOD i ferdig live gruppetime er synleg for stadfesta deltakar.
18. Gruppetimebooking opprettar varsel med kategorien `group`; den tidlegare constraint-feilen er retta.
19. Medlem kan berre lesa eiga `class_bookings`-rad, ikkje andre medlemmers påmeldingar.
20. `get_class_attendance_counts` returnerer berre aggregert tal for publiserte gruppetimar.
21. Admin kan framleis lesa full deltakaroversikt.
22. Medlem kan ikkje lesa upublisert gruppetime, medan staff kan.
23. Medlem kan lesa eiga bookingrad, men ikkje andre sine; aggregert kapasitetstal er korrekt.

## 7. Manuelle testar som står att

- Admin opprettar WOD, publiserer og redigerer.
- PT byggjer ny privat WOD og tildeler han frå PT Studio; stadfest at WOD og tildeling kjem fram samla.
- Medlem opnar privat WOD frå «Mi trening» og ser øvingar, dosering og timeroppsett.
- Medlem ser berre publiserte eller tildelte WOD-ar.
- Medlem startar WOD og fullfører AMRAP, EMOM, For Time, Tabata og stasjonssirkel.
- WOD-resultat, historikk og PR blir viste med korrekt eining.
- PT opprettar program frå mal og legg til fleire økter.
- PT tildeler WOD til kunde; medlem ser og utfører WOD.
- Gjennomføring oppdaterer PT-status og treningshistorikk.
- PT-booking, venteliste og avlysing i UI.
- Gruppetime med fleire WOD-ar og individuell registrering.
- Medlem kan ikkje sjå eller endra andre medlemmers data.
- Mobil og nettbrett i ståande og liggjande modus.

**Database:** 63 installerte migreringar; 52 SQL-filer i branch. Dei eldre manglande migreringsfilene er framleis eit reproduksjonsavvik.

**CI:** Checks og preview deploy for kodecommit 1e47ad6c er under kontroll; endeleg resultat skal stadfestast i GitHub Actions.

**Viktig:** Ingen av desse nettlesar-/fysiske einingstestane er rapporterte som gjennomførte i denne revisjonsøkta.
