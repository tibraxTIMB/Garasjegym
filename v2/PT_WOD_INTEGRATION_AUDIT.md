# PT / WOD – integrasjons- og funksjonsstatus

**Dato:** 19.11.2026  
**Branch:** garasjegym-2.0-sturm­kopf  
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
| WOD + PT-kundetildeling i éi transaksjon | OPEN | WodBuilder lagrar først WOD og opprettar deretter tildeling. Feil blir vist, men WOD-en kan bli lagra utan tildeling. |

## 2. WOD-utføring og treningshistorikk

| Funksjon | Status | Merknad |
|---|---|---|
| WOD-kort → start trening | IMPLEMENTERT – IKKJE MANUELT TESTA | Appen sender WOD-kontekst til Training.jsx. |
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

## 7. Manuelle testar som står att

- Admin opprettar WOD, publiserer og redigerer.
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

**Viktig:** Ingen av desse nettlesar-/fysiske einingstestane er rapporterte som gjennomførte i denne revisjonsøkta.
