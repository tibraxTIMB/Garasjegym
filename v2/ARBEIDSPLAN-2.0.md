# GarasjeGym 2.0 – STURMKOPF
## Arbeidsplan med fem nummererte arbeidsfelt

Dette dokumentet styrer vidare utvikling av 2.0. Arbeidet skjer parallelt med 1.8.16. Stabilversjonen og produksjonsdata skal ikkje endrast som del av vanleg 2.0-utvikling. Databaseendringar som påverkar eksisterande data eller tilgangar krev særskild gjennomgang før dei blir gjennomførte.

## Felles prinsipp

- **Design:** mørkt, industrielt STURMKOPF-uttrykk, responsivt for mobil, nettbrett og PC.
- **Arkitektur:** éin felles treningsmotor for fri trening, WOD, gruppetime og PT.
- **Data:** Supabase er felles datakjelde. Brukardata skal synkroniserast på tvers av einingar.
- **Tilgang:** autentisering og RLS i databasen er autoritativt; skjuling av menyval i klienten er ikkje tryggleik.
- **Bevaring:** funksjonar frå 1.8.16 skal kartleggjast og vidareførast eller få eit dokumentert betre alternativ.
- **Arbeidsflyt:** utvikling på eiga 2.0-grein, automatiske byggjekontrollar, funksjonstesting og godkjenning før eventuell produksjonssetting.

## 1. Plattform, kontoar og datagrunnmur

**Mål:** Ei trygg og stabil plattform som alle dei andre arbeidsfelta byggjer på.

Arbeid:
- Fullføra innlogging, registrering, e-poststadfesting, utlogging og gjenoppretting av passord.
- Stadfesta automatisk profiloppretting og korrekt medlemsrolle.
- Gjennomgå admin-, manager- og medlemsrettar for alle tabellar og RPC-funksjonar.
- Revidera RLS, SECURITY DEFINER-funksjonar, triggarar og visingar.
- Kartleggja skilnader mellom databasetabellane og det 1.8.16 faktisk brukar.
- Etablera migreringsskript, feillogging og trygg handtering av miljøvariablar.
- Sikra at alle relevante data kan hentast frå fleire einingar.

**Godkjenningskrav:** Ny brukar kan registrera seg, få medlemsprofil, logga inn på ei anna eining og berre sjå/endra data som rolla gir tilgang til. Tryggleikstestar må vera beståtte.

## 2. Felles treningsmotor og treningsdata

**Mål:** Éin motor for alle treningsformer – ikkje separate løysingar for WOD, fri trening, gruppetime og PT.

Arbeid:
- Definera felles datamodell for økt, deltakar, øving, sett, resultat og historikk.
- Øvingsbibliotek med søk, kategoriar, utstyr, instruksjonar og favorittar.
- Støtta fri økt, planlagd WOD, gruppetime og PT-økt gjennom same motor.
- Timer: EMOM, AMRAP, For Time, Tabata, intervall, stoppeklokke og nedteljing.
- Registrera repetisjonar, belastning, tid, rundar og kommentarar.
- Lagra øktresultat og sett på ein robust måte med transaksjon/atomisk lagring der det trengst.
- Treningslogg, personlege rekordar, progresjon og historikk.
- Garasjekadett, poeng/stjerner og andre progresjonsmekanismar frå eksisterande app.
- Fullskjerms Training Mode og tydeleg status under aktiv økt.

**Godkjenningskrav:** Same økt kan startast frå dei ulike inngangane, registrerast individuelt, lagrast korrekt og visast att i personleg historikk. Timer og resultat skal fungera på mobil.

## 3. Booking, gruppetimar og PT-studio

**Mål:** Samla planlegging og gjennomføring av timar og personleg trening.

Arbeid:
- Timeplan med oppretting, publisering, kapasitet og instruktør.
- Påmelding, avmelding, venteliste og varsling.
- Sikra kapasitet mot samtidige bookingar.
- Felles gruppetime med synkronisert start, pause, gjenopptaking og avslutting.
- Individuelle resultat frå kvar deltakar via treningsmotoren.
- PT-kalender, PT-booking, førespurnader og kapasitet.
- PT-dialog/meldingar, notat og øvingsopplegg.
- Medlemsvising av eigne bookingar og historikk.

**Godkjenningskrav:** To eller fleire brukarar kan booka same time utan overbooking. Instruktør kan starta ei fellesøkt, medan kvar deltakar får sitt eige treningsresultat.

## 4. Fellesskap, Puls og kaffibar

**Mål:** Vidareføra dei sosiale og praktiske medlemsfunksjonane frå 1.8.16.

Arbeid:
- Puls/oversikt med personleg treningsstatus, aktivitet og relevante meldingar.
- Garasjeprat med innlegg, kommentarar og eventuell bilethandtering.
- Utfordringar, deltaking, poeng og resultat.
- Medlemsoversikt og synleg progresjon etter gjeldande personvernreglar.
- Kaffibar med meny, produkt, prisar, bestillingar og status.
- Administrasjon av meny og bestillingar.
- Varsling for booking, gruppetimar, PT, innlegg og andre relevante hendingar.
- Avklara kva som skal vera sanntid og kva som kan oppdaterast ved oppslag.

**Godkjenningskrav:** Innhald og bestillingar blir lagra sentralt, tilgang er rolle- og brukarstyrt, og oppdateringar blir synlege på andre einingar.

## 5. Administrasjon, design, kvalitetssikring og lansering

**Mål:** Ein komplett, driftssikker app som er klar til å erstatta 1.8.16 først etter godkjenning.

Arbeid:
- Administrasjon av medlemmar, roller, øvingar, WOD-ar, timar, PT, kaffibar og innstillingar.
- Ryddig adminoversikt med minst mogleg unødvendig scrolling, særleg på mobil.
- Konsistent navigasjon, responsivt design, tilgjengelegheit og tydelege feilmeldingar.
- Full funksjonskartlegging mot 1.8.16 og dokumentert avviks-/migreringsliste.
- Automatiske byggje- og statiske kontrollar.
- Test av RLS og tilgangar med medlem, manager og admin.
- Test med fleire brukarar, fleire einingar og samtidige bookingar.
- Kontroll av lagring, synkronisering, feiltilstandar og gjenoppretting.
- Brukaraksepttest før produksjonssetting.
- Versjonsnotat, driftsrutinar, tilbakerullingsplan og endeleg godkjenning.

**Godkjenningskrav:** Alle kritiske funksjonar frå 1.8.16 er vidareførte eller eksplisitt godkjende som endra. Ingen kritiske tryggleiksfeil. Testar er beståtte på mobil og PC. Produksjonssetting skjer først etter uttrykkeleg godkjenning.

## Prioritert rekkjefølgje

1. Arbeidsfelt 1: trygg plattform og datagrunnmur.
2. Arbeidsfelt 2: full felles treningsmotor.
3. Arbeidsfelt 3: booking, gruppetimar og PT.
4. Arbeidsfelt 4: fellesskap, Puls og kaffibar.
5. Arbeidsfelt 5: administrasjon, full kvalitetssikring og lansering.

Arbeidsfelt 5 er eit gjennomgåande kvalitetssikringsspor, ikkje berre siste fase. Design, tilgangskontroll, dokumentasjon og testing skal følgja alle dei andre felta.

## Status ved oppretting av planen

- Arbeidsfelt 1 er meldt fullført av brukar 16.11.2026. Dette er brukarstadfesta status, ikkje ei ny uavhengig tryggleiksrevisjon.

- React/Vite-grunnstruktur og mørkt design er etablert.
- Supabase-klient, innlogging/registrering og profiloppslag er implementert i kode, men ikkje fullstendig testa i nettlesar.
- Enkel WOD-vising, øvingsliste og registrering av eit grunnleggjande WOD-resultat er implementert.
- GitHub Actions-produksjonsbygg har bestått ein køyring.
- Full treningsmotor, booking, PT, fellesskap, kaffibar, varsling og full admin er ikkje ferdig.
- Databasetryggleik og samsvar mellom 1.8.16 og Supabase krev vidare gjennomgang.
- Ingen produksjonssetting av 2.0 er godkjend.

