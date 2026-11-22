# Masterprompt: enkel flyt og trygg handtering i GarasjeGym

**Føremål:** Gjer den faktiske brukaropplevinga enkel, rask og trygg for medlem, personleg trenar (PT), administrator og garasjeeigar. Gå gjennom ei heil oppgåve om gongen, ikkje berre isolerte skjermar. Skriv på naturleg nynorsk. Bruk berre løysingar utan løpande lisenskostnader.

## Prompten som skal køyrast

> Du er ein tverrfagleg gjennomgangsleiar med fire perspektiv: førstegongsmedlem, aktiv PT, driftsadministrator og garasjeeigar. Undersøk GarasjeGym-koden og brukarflatene med utgangspunkt i oppgåvene nedanfor. Tenk som ein som er usikker, har lite tid og brukar ein Android-telefon med éi hand. Bruk berre faktiske funksjonar og bevis frå kode, databasereglane og testar. Ikkje finn opp knappar som ikkje finst.
>
> Gå for kvar oppgåve frå startskjerm til avslutta handling og etterfølgjande status. Noter kvar brukaren må stoppa opp og tenkja «kva no?», kvar handlingar blir forveksla, kvar informasjon liknar knappar, og kvar ein kan gjera irreversible eller utilsikta handlingar.
>
> Handter desse fire rollene særskilt:
>
> 1. **Medlem:** Finn PT, forstå PT kontra gruppetime, sjå kven som er PT, send uforpliktande spørsmål, sjå at det er motteke, få svar, få tildelt trenar, avtal konkret time, sjå treningsplan, send melding og trekk ei ny førespurnad tilbake. Ingen betaling eller timebestilling må skje ved å senda eit spørsmål.
> 2. **PT:** Logg inn, sjå berre tildelte kundar, opna éin kunde, sjå status/innmelding, avtala PT-time eller senda melding, tildela/justera treningsplan og følgja opp mål. Klår skilnad mellom eigne kundar og administrativt register. Sjeldne verktøy skal liggja under «Fleire».
> 3. **Admin:** Sjå nye PT-førespurnader utan å mista dei, opna rett sak frå eit varsel, markera at saka er teken imot, velja riktig og ledig PT, stadfesta tildeling med eit medvite trykk, opna kunden og avtala time. Handter også medlemskap, tilbod og register utan lang horisontal menyliste. Handsama saker skal ikkje ta opp heile førstesida, men vera søkbare/tilgjengelege i historikk.
> 4. **Garasjeeigar:** Start i Drift, sjå dei daglege oppgåvene først (PT, medlemmer, kaffi). Ha direkte veg til rett handtering. Vedlikehald, kvittering og WOD-import er enkle underval. Kritiske varsel og PT-leads må ha ein synleg, handlingsretta inngang. Info som ikkje kan trykkast, er kompakt.
>
> Ta også med **PR-senteret**: Førstesida skal visa kategoriar, ikkje ei uendeleg alfabetisk liste. Det skal vera enkelt å finna deadlift/markløft, registrera ein rekord med rett eining og sjå historikk. Standardløft skal vera tilgjengelege utan å dominera skjermen.
>
> **Akseptkrav:** Hovudoppgåver skal kunna forklarast med éi setning. Høgt prioriterte handlingar er synlege utan unødig scrolling. Knappetekstar seier kva som skjer. Veljarar skal ikkje utløysa tildeling eller andre viktige endringar før brukaren stadfestar. Sletting og tildeling skal vera medvitne handlingar. Status og neste steg skal vera forståelege. Trykkeflater skal vera store nok på mobil. Nedtrekk og dialogar skal ha GarasjeGym-utforming. Skilnaden mellom PT-førespurnad, PT-tildeling, avtalt PT-time og gruppetime skal vera klår.
>
> **Kontroll:** For kvart av dei fire perspektiva, spor konkrete komponentar og kall. Kontroller feil, tomme lister, aktive saker, full PT-kapasitet, duplikat, avviste/tidlegare saker og navigasjon tilbake. Kontroller at databasen framleis vernar kundedata. Køyr bygg og relevante automatiske testar. Rapporter kva som er retta, kva som ikkje kan verifiserast utan innlogging med faktiske roller, og eventuelle restpunkt. Ikkje publiser før bygg og testar er grøne.

## Gjennomføringslogg – 23. november 2026

Dette masterpromptet er brukt som sjekkliste mot `PTInquiry`, `PTManagement`, `PTStudio`, `PT`, `Admin`, `ExercisePRCenter`, tilhøyrande stilark, PR-katalog og varslingsflyt.

| Rolle | Tidlegare friksjon | Utført grep | Kontroll |
| --- | --- | --- | --- |
| Medlem | Lang presentasjon av PT-ar og tilbod før kontaktskjema | Uforpliktande skjema først, enkel stegvis forklaring, PT-ar og tilbod i opne/lukke-felt; status under «Mine førespurnader» | `pt-role-journey.test.mjs` |
| PT | Mange sidelengs faner og mogleg full medlemsliste | Tre hovudval, øvrige PT-verktøy under «Fleire»; vanleg PT hentar berre aktive, tildelte kundar | `pt-role-journey.test.mjs`, database-RLS er framleis aktiv |
| Admin | Fem likestilte faner og val av PT utløyste straks tildeling | Tre hovudområde; saker først; PT-val og separat «Stadfest tildeling»; kapasitetstal, historikk og snarveg til time/dialog | `pt-role-journey.test.mjs`, `pt-notification-flow.test.mjs` |
| Garasjeeigar | Vedlikehald og import fylte Drift, PT-handtering låg ein annan stad | Drift viser no tydelege snarvegar til PT, medlemskap og kaffi; reinhald og import er underval | `pt-role-journey.test.mjs` |
| PR | 7 standardløft og opptil 36 øvingar før kategorival | Kategorikort, «Mine rekordar», søk, maks 10 øvingar i vanleg resultat; kategorival òg ved manuell PR | `pr-directory.test.mjs`, `pt-role-journey.test.mjs` |

**Viktig skilje som er bevart:** Ei `pt_service_requests`-førespurnad er ikkje ei `pt_requests`-timeførespurnad, og ingen av dei er ei stadfesta `pt_bookings`-booking. Tenesteførespurnaden tildeler først PT via `assign_pt_coach`; ein konkret PT-time blir avtalt i PT Studio. Gruppetime går via timeplanen.

**Verifiseringsgrense:** Automatiske kjeldekontrollar og lokalt bygg kan prova navigasjonskoplingar og grunnreglar, men dei kan ikkje aleine stadfesta kor raskt faktiske personar finn fram. Full ende-til-ende-kontroll av varsel, datatilgang og reelle bestillingar krev innlogging som medlem, vanleg PT og admin. Ingen testførespurnader eller faktiske kundedata er endra i denne gjennomgangen.

**Bibliotek:** Den aktive databasen inneheld `Deadlift`, `Romanian deadlift`, `Dumbbell Romanian Deadlift`, `Kettlebell Suitcase Deadlift`, `Markløft med manualar` og `Markløft med medisinball`. Dei to eldre, doble kettlebell-markløftnamna er medvite skjulte. Standard PR-løft omfattar `Deadlift`.

**Køyrt kontroll:** `npm --prefix v2 run build`, heile `npm --prefix v2 test` og dei åtte eigne rolleflyttestane gjekk utan feil. Ingen automatisk test erstattar manuell brukartesting med dei fire rollene på ein telefon.
