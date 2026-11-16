# GarasjeGym 2.0 – testplan

Dette dokumentet er ein testplan, ikkje dokumentasjon på at testane er køyrde. Ingen test skal krevja betalte ressursar. Budsjettet er 0 kroner.

## 1. Før test

- Bruk berre utviklingsgreina i GitHub og eit uttrykkeleg godkjent, gratis testmiljø.
- Ikkje køyr migreringar 001–010 mot aktiv produksjonsdatabase som del av denne testen.
- Kontroller at VITE_SUPABASE_URL og VITE_SUPABASE_PUBLISHABLE_KEY peikar på rett prosjekt.
- Kontroller at ingen service_role- eller secret-nøklar ligg i klientkode eller Git.
- Registrer versjon, commit-SHA, nettlesar, eining og testbrukar for kvar test.

## 2. Innlogging og roller

| ID | Test | Forventa resultat |
|---|---|---|
| AUTH-01 | Registrer ny medlemskonto | Konto blir oppretta; profil får medlemsrolle |
| AUTH-02 | Logg inn og ut | Sesjon blir oppretta og avslutta korrekt |
| AUTH-03 | Gløymt passord | E-postflyt gir trygg tilbakestilling |
| AUTH-04 | Inaktiv profil | Brukaren får ikkje tilgang til medlemsmodulane |
| AUTH-05 | Medlem prøver admin-handling | RLS og rollelogikk avviser handlinga |
| AUTH-06 | Manager og admin | Berre tillatne administrasjonsfunksjonar er synlege og tilgjengelege |

## 3. Trening og PR

| ID | Test | Forventa resultat |
|---|---|---|
| TR-01 | Last WOD utan timer_settings | WOD-biblioteket lastar med fallback |
| TR-02 | Last WOD med timerinnstillingar | Timeren brukar lagra standardverdiar |
| TR-03 | Start fri økt og legg til øvingar/sett | Alle felt kan registrerast |
| TR-04 | Lagre økt | Økt, øvingar og sett blir lagra atomisk |
| TR-05 | Simuler feil i eitt sett | Ingen delvis økt blir ståande |
| TR-06 | Kontroller dato nær midnatt | Lokal treningsdato blir lagra korrekt |
| TR-07 | Registrer PR | PR blir lagra på innlogga medlem |
| TR-08 | Favoritt øving | Favoritt blir synkronisert etter migrering 003 |

## 4. Booking og gruppetimar

| ID | Test | Forventa resultat |
|---|---|---|
| BOOK-01 | Opprett gruppetime som staff | Timen blir synleg i timeplanen |
| BOOK-02 | Meld på medlem | Éi aktiv påmelding blir oppretta |
| BOOK-03 | Meld av | Påmeldinga får status cancelled |
| BOOK-04 | To brukarar tek siste plass samtidig | Kapasitetsvernet slepp gjennom høgst éi påmelding |
| BOOK-05 | Same medlem melder seg på frå to einingar | Unik indeks hindrar doble aktive påmeldingar |
| BOOK-06 | Live-økt utan timerutviding | Grunnleggjande live-status fungerer etter migrering 005 |
| BOOK-07 | Live-økt med WOD-timer | Alle deltakarar ser same serverbaserte klokke etter migrering 007 |
| BOOK-08 | Deltakar lagrar resultat frå live-økt | Resultatet blir knytt til rett live-økt etter migrering 008 |

## 5. PT-studio

| ID | Test | Forventa resultat |
|---|---|---|
| PT-01 | Medlem sender førespurnad | Førespurnaden blir berre synleg for medlemmet og staff |
| PT-02 | Staff opprettar PT-time frå førespurnad | Time og førespurnad blir oppdaterte; feil i steg to skal prøva å rulla tilbake time |
| PT-03 | Medlem bookar publisert PT-time | RPC avgjer booking/venteliste |
| PT-04 | Staff legg til øving i PT-program | Programmet blir synleg for rett klient |
| PT-05 | Medlem sender melding | Meldinga blir synleg for rett PT-dialog |
| PT-06 | Staff skriv privat notat | Medlem kan ikkje lesa notatet |

## 6. Garasjeprat og utfordringar

| ID | Test | Forventa resultat |
|---|---|---|
| SOCIAL-01 | Publiser innlegg og kommentar | Innhaldet blir synleg for aktive medlemmar |
| SOCIAL-02 | Last opp stort bilete | Biletet blir komprimert eller avvist med tydeleg melding |
| SOCIAL-03 | Slett eige innlegg/kommentar | Innhaldet blir sletta; kommentarar følgjer cascade |
| SOCIAL-04 | Slett andre sitt innhald som medlem | RLS avviser handlinga |
| SOCIAL-05 | Reager på innlegg | Reaksjon blir lagra atomisk via migrering 009 |
| CH-01 | Staff opprettar utfordring | Utfordringa blir publisert med gyldig dato og mål |
| CH-02 | Medlem melder seg på | Éi deltaking per medlem/utfordring |
| CH-03 | Medlem oppdaterer framgang | Berre eiga framgang kan endrast |
| CH-04 | Utfordring går ut på dato | Medlem kan ikkje endra framgang etter sluttdato |
| CH-05 | Arkivert utfordring | Skjult for vanlege medlemmar |

## 7. Kaffibar og administrasjon

| ID | Test | Forventa resultat |
|---|---|---|
| COF-01 | Staff legg til produkt | Produkt blir synleg i menyen |
| COF-02 | Staff skjuler produkt | Medlem kan ikkje bestilla det |
| COF-03 | Medlem legg varer i korga | Mengd og total blir rekna korrekt i klienten |
| COF-04 | Medlem sender ordre | RPC hentar pris frå databasen, ikkje klienten |
| COF-05 | Staff endrar ordrestatus | Medlem ser ny status ved oppfrisking |
| ADM-01 | Admin endrar medlemsrolle | Endringa blir lagra og navigasjonen oppdaterast ved ny profilhenting |
| ADM-02 | Manager prøver å endra adminrolle | RLS/policy avviser dersom berre admin har rett |
| ADM-03 | WOD-administrasjon utan timerkolonne | WOD kan opprettast/redigerast via fallback |

## 8. Synkronisering og ytelse

- Test med minst to separate medlemskontoar på kvar si eining.
- Kontroller at oppdateringar i booking, PT, kaffibar, Garasjeprat, utfordringar og treningslogg blir synlege ved oppfrisking.
- Kontroller at bookingklokka hentar serverstatus kvart femte sekund, medan lokal vising oppdaterer kvart sekund.
- Kontroller at polling blir stoppa når modulane blir avmonterte.
- Test mobil, nettbrett og PC; test timer ved skjermlås, bakgrunnsmodus og attkomst.

## 9. Tryggleik og produksjonsklarering

- Køyr Supabase Security Advisor og rett opp ERROR før lansering.
- Gå gjennom SECURITY DEFINER-funksjonar, search_path, EXECUTE-grants og tilgang frå anon.
- Kontroller at migrering 011 fjernar anon-tilgang utan å bryta legitime authenticated-kall.
- Kontroller RLS med medlem, manager, admin og anonym brukar.
- Kontroller at PT-notat, meldingar, treningslogg og bookingdata ikkje kan lesast på tvers av medlemmar.
- Gå gjennom framandnøklar, indeksar og RLS initplan-advarslane.
- Ta backup før godkjend migrering.
- Produksjonssetting krev uttrykkeleg godkjenning og ein tilbakerullingsplan.

## 10. Status

Ingen ende-til-ende-testar er stadfesta køyrde i denne arbeidsøkta. SQL-migreringane 001–011 er staged i GitHub, ikkje installerte i aktiv Supabase-database. Siste React/Vite-bygg er ikkje stadfesta etter dei nyaste endringane.
