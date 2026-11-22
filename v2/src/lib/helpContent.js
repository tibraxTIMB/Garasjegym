// User-facing help is kept together so contextual hints and the full manual
// describe the same, currently implemented workflows.
export const HELP_CATEGORIES = [
  { id: 'start', title: 'Kom i gang', icon: 'home' },
  { id: 'training', title: 'Trening og klokke', icon: 'timer' },
  { id: 'wod', title: 'WOD og nivå', icon: 'dumbbell' },
  { id: 'results', title: 'Resultat og PR', icon: 'trophy' },
  { id: 'pt', title: 'PT og gruppetimar', icon: 'users' },
  { id: 'coffee', title: 'Kaffibaren', icon: 'coffee' },
  { id: 'other', title: 'Musikk og innstillingar', icon: 'settings' },
  { id: 'staff', title: 'For PT og administrasjonen', icon: 'shield' },
]

export const HELP_TOPICS = [
  { id:'navigation', category:'start', title:'Finn fram i GarasjeGym', summary:'Kva finn du på Heim, WOD, ØKT, Timeplan og Mi side?', time:'1 min', steps:[
    'Bruk botnmenyen til å gå mellom Heim, WOD, ØKT, Timeplan, Mi side og Meir.',
    'Heim viser snarvegar til trening, treningsplan, gruppetimar og PT-hjelp.',
    'ØKT er inngangen til å gjennomføra trening. WOD er biblioteket med ferdige økter.',
    'Mi side har eigen knapp i botnmenyen og samlar profil, logg, rekordar og denne hjelpa.',
  ], tip:'Du kan alltid bruka tilbakeknappen. Ei pågåande treningsøkt blir teken vare på når du går til ein annan fane.', action:'home', actionLabel:'Gå til Heim' },
  { id:'simple-mode', category:'start', title:'Enkel eller avansert visning', summary:'Vel kor mykje av appen du vil sjå.', time:'1 min', steps:[
    'Opna Mi side frå botnmenyen, og vel «Profil og konto».',
    'Der finn du «Visning av GarasjeGym».',
    'Vel avansert visning for fleire val, eller enkel visning for ein kortare veg til trening.',
    'Byt tilbake når du vil. Øktene, klokka og resultata er dei same i begge visningar.',
  ], tip:'Visningsvalet ligg berre på Mi side, ikkje på heimesida.', action:'profile', actionLabel:'Opna Mi side' },
  { id:'change-name', category:'start', title:'Endre namnet ditt', summary:'Byt visingsnamn utan å endra innlogginga.', time:'1 min', steps:[
    'Gå til Mi side og opna «Profil og konto».',
    'Trykk «Endre namn» ved namnet ditt.',
    'Skriv namnet du ønskjer å visa i GarasjeGym og vel «Lagre namn».',
  ], tip:'E-postadressa og kontoen er dei same. Du kan berre endra ditt eige visingsnamn.', action:'profile', actionLabel:'Opna profilen' },
  { id:'login-help', category:'start', title:'Innlogging, invitasjon og gløymt passord', summary:'Kom inn i GarasjeGym om du står fast på innloggingssida.', time:'2 min', steps:[
    'Nye medlemmar får ei personleg invitasjon frå administrator. Opna lenkja i e-posten og vel ditt eige passord.',
    'Logg inn med e-postadressa og passordet du har oppretta.',
    'Hugsar du ikkje passordet, vel «Gløymt passord?» på innloggingssida og skriv inn e-postadressa.',
    'Bruk lenkja du får tilsendt til å velja eit nytt passord. Kontroller søppelpost om du ikkje finn e-posten.',
    'Har du ikkje fått invitasjon eller tilgang, må administrator sjekka at medlemskontoen er godkjend.',
  ], tip:'Ein medlemskonto blir ikkje automatisk oppretta ved å skriva ei ny e-postadresse i innlogginga.', action:'home', actionLabel:'Til Heim' },
  { id:'free-workout', category:'training', title:'Start ei fri økt', summary:'Tren med berre klokka, eller legg til øvingar undervegs.', time:'1 min', steps:[
    'Trykk «Fri trening» på heimesida, eller opna ØKT og vel å starta di eiga økt.',
    'Klokka opnar seg i treningsvisninga. Trykk «Start» når du er klar.',
    'Du kan leggja til øvingar og WOD-ar medan økta går, men det er ikkje nødvendig.',
    'Trykk «Avslutt» etter treninga, gå gjennom oppsummeringa og vel «Lagre økt».',
  ], tip:'Ei fri økt kan lagrast med berre varigheit – heilt utan øvingar.', action:'free', actionLabel:'Start fri trening' },
  { id:'wod-start', category:'training', title:'Tren ei ferdig WOD', summary:'Finn ei økt, vel nivå og start treningsklokka.', time:'2 min', steps:[
    'Opna WOD og finn ei økt i biblioteket. Bruk søk eller filter om du treng det.',
    'Opna WOD-kortet og les øvingar, format, varigheit og eventuelle nivå.',
    'Vel RX, Scaled eller Foundation når økta har slike alternativ.',
    'Start økta. Klokka opnar seg, men tidtakinga går ikkje før du trykkjer «Start».',
    'Registrer resultatet når du er ferdig, og lagre i treningsloggen.',
  ], tip:'Du kan tilpassa nivået utan at det gjer økta mindre verdifull. Målet er god trening.', action:'wod', actionLabel:'Opna WOD-biblioteket' },
  { id:'assigned-training', category:'training', title:'Gjer ei økt som PT har tildelt', summary:'Finn økta i treningsplanen din.', time:'1 min', steps:[
    'Trykk «Min treningsplan» på heimesida.',
    'Opna den neste planlagde økta eller WOD-en du har fått tildelt.',
    'Les eventuelle instruksjonar frå PT og start den vanlege treningsklokka.',
    'Lagre resultatet etterpå. Økta blir då knytt til treningshistorikken og oppfølginga.',
  ], tip:'Ei tildelt WOD kan også gjerast på eiga hand utan at PT er til stades.', action:'plan', actionLabel:'Opna treningsplanen' },
  { id:'timer-basics', category:'training', title:'Bruk treningsklokka', summary:'Start, pause, fortset og avslutt på rett tidspunkt.', time:'2 min', steps:[
    'Opna ei fri økt eller ein WOD. Du kjem inn i den same treningsklokka.',
    'Trykk «Start» når du vil byrja. Ved tidsstyrte økter får du nedteljing og lydsignal der det høyrer til.',
    'Bruk «Pause» dersom du må stoppa mellombels, og fortset når du er klar.',
    'Følg med på medgått eller attverande tid, rundar og øvingsoversikta.',
    'Trykk «Avslutt» når økta er ferdig, og kontroller resultata før du lagrar.',
  ], tip:'Tidsvisinga varierer med WOD-formatet. Fullføring av økta og lagring av resultat er to ulike steg.', action:'workout', actionLabel:'Opna ØKT' },
  { id:'timer-rounds', category:'training', title:'Rundar, mellomtider og 3–2–1', summary:'Forstå R1, R2, rundetider og lydsignala.', time:'2 min', steps:[
    'R1, R2, R3 og vidare viser registrerte rundar i økta.',
    'Bruk «+ Runde» når du har fullført ein runde i ei økt der du registrerer rundar sjølv.',
    'Sveip sidevegs i rundefeltet for å sjå tidlegare rundar og samanlikna utviklinga undervegs.',
    'Ved nedteljing får du 3–2–1 og signal ved aktuelle startar, fasar og avslutningar.',
  ], tip:'I EMOM og Tabata styrer klokka intervalla. I ein AMRAP registrerer du vanlegvis fullførte rundar sjølv.', action:'workout', actionLabel:'Opna ØKT' },
  { id:'exercise-details', category:'training', title:'Sjå øvingsforklaringar medan du trenar', summary:'Nyttig når du ikkje hugsar Snatch Complex eller ei anna rørsle.', time:'1 min', steps:[
    'Opna øvingslista i treningsklokka.',
    'Trykk på den aktuelle øvinga for meir informasjon når ho har detaljar.',
    'Les rekkjefølgje, dosering og eventuelle merknader – særleg ved komplekse løft.',
    'Lukk detaljane og hald fram med økta.',
  ], tip:'Eit complex er fleire rørsler som blir gjorde etter kvarandre som éin samanhengande sekvens.', action:'workout', actionLabel:'Opna ØKT' },
  { id:'finish-review', category:'training', title:'Gjennomgang og lagring etter økta', summary:'Kva skal du endra før du trykkjer Lagre økt?', time:'2 min', steps:[
    'Når du avsluttar ei økt, får du ei gjennomgang av resultatet.',
    'Kontroller tal på repetisjonar, sett, vekt og andre målingar der dei er relevante.',
    'Rett tal som ikkje stemmer, eller legg til eit sett dersom du faktisk gjorde fleire.',
    'Vel «Lagre økt» for å ta resultatet inn i treningsloggen, eller forkast om økta ikkje skal registrerast.',
  ], tip:'Ei øving som roing måler til dømes meter, kaloriar eller tid – ikkje kilogram. I denne gjennomgangen er målet å registrera det du faktisk gjorde.', action:'history', actionLabel:'Sjå treningsloggen' },
  { id:'manual-log', category:'training', title:'Registrer ei økt du alt har gjort', summary:'Etterregistrer trening utan å starta klokka.', time:'1 min', steps:[
    'Vel «Etterregistrer» på heimesida, eller finn manuell registrering under ØKT.',
    'Legg inn øvingar, sett og resultat frå økta du har gjennomført.',
    'Kontroller dato og opplysningar før du lagrar.',
    'Økta blir synleg i den same historikken som økter med tidtaking.',
  ], tip:'Dette er noko anna enn fri trening, der du startar ei klokke før du trenar.', action:'manual', actionLabel:'Etterregistrer trening' },
  { id:'wod-formats', category:'wod', title:'Forstå AMRAP, EMOM, Tabata og For Time', summary:'Korleis blir dei ulike øktformata gjennomførte?', time:'3 min', steps:[
    'AMRAP: Gjer så mange rundar eller repetisjonar som mogleg innan ei bestemt tid.',
    'EMOM: Start ei oppgåve ved kvart tidsintervall. E2MOM betyr at intervallet varer to minutt.',
    'Tabata: Korte arbeids- og kvileperiodar. Eit vanleg oppsett er 20 sekund arbeid og 10 sekund kvile.',
    'For Time: Fullfør arbeidet så raskt du kan. Dersom økta har time cap, er dette tidsgrensa.',
    'Stasjonssirkel: Gå mellom stasjonar med arbeidstid og byttetid. Deltakarar kan byrja på ulike stasjonar.',
  ], tip:'Klokka viser dei opplysningane som er relevante for det valde formatet.', action:'wod', actionLabel:'Sjå WOD-format' },
  { id:'wod-levels', category:'wod', title:'RX, Scaled og Foundation', summary:'Tre nivå, same mål: ei god økt.', time:'2 min', steps:[
    'RX er standardforslaget til økta.',
    'Scaled er eit tilpassa alternativ der til dømes vekt, repetisjonar eller øvingar blir justerte.',
    'Foundation er ei grunnutgåve for deg som treng endå enklare rørsler eller mengd.',
    'Les doseringa for nivået du vel og tilpass til det du kan gjennomføra med god teknikk.',
  ], tip:'Ei kvinnevekt kan vera eit naturleg skaleringssteg, men riktig nivå avheng alltid av øvinga og personen.', action:'wod', actionLabel:'Vel WOD og nivå' },
  { id:'wod-favorites', category:'wod', title:'Finn att favoritt-WOD-ar', summary:'Stjernemerk favorittar og køyr dei på nytt.', time:'1 min', steps:[
    'Finn ein WOD du likar i WOD-biblioteket.',
    'Bruk favorittmarkeringa på WOD-kortet.',
    'Gå til Mi side og opna «Favoritt-WOD-ar» for å finna han att.',
    'Du kan starta same WOD på nytt utan å oppretta ein kopi.',
  ], tip:'Favorittlista er personleg. Andre medlemmar får ikkje endra favorittane dine.', action:'wod', actionLabel:'Opna WOD-biblioteket' },
  { id:'history', category:'results', title:'Finn ei tidlegare økt', summary:'Sjå gjennomførte økter, datoar og resultat.', time:'1 min', steps:[
    'Opna Mi side og vel «Treningslogg».',
    'Vel liste- eller kalendervisning.',
    'Trykk på ei økt for å sjå detaljar, øvingar og registrerte resultat.',
    'Bruk opplysningane til å samanlikna trening over tid.',
  ], tip:'Historikken viser det du faktisk har lagra, ikkje automatisk alle WOD-ane du har sett på.', action:'history', actionLabel:'Opna treningsloggen' },
  { id:'pr-center', category:'results', title:'Registrer og forstå PR', summary:'Personlege rekordar, måleeiningar og progresjon.', time:'2 min', steps:[
    'Opna Mi side og vel «PR-senter».',
    'Finn øvinga du vil sjå rekord for, eller registrer ein ny PR manuelt.',
    'Bruk rett eining: til dømes kg for styrke, cm for boks, meter for roing og sekund for statiske hald.',
    'Opna historikken til øvinga for å samanlikna rekordar over tid.',
    'Du kan sletta ein feilregistrert PR utan å sletta andre rekordar.',
  ], tip:'Ein PR kan koma automatisk frå ei lagra økt eller registrerast manuelt.', action:'pr', actionLabel:'Opna PR-senter' },
  { id:'pt-contact', category:'pt', title:'Ta kontakt med ein PT', summary:'Slik sender du ein uforpliktande førespurnad.', time:'1 min', steps:[
    'På Heim, trykk «Mi PT-oversikt».',
    'Les skilnaden mellom personleg trening og gruppetime.',
    'Sjå presentasjonane av PT-ane, eller vel at Garasjen skal hjelpa deg å finna rett person.',
    'Vel kva du ønskjer hjelp med. Du kan også skriva ei kort melding.',
    'Trykk «Send førespurnad». Du har ikkje bestilt eller betalt for ein time.',
  ], tip:'Du kan følgja førespurnaden under «Mine førespurnader» og trekkja han tilbake så lenge han ventar på behandling.', action:'pt', actionLabel:'Møt PT-ane våre' },
  { id:'pt-plan', category:'pt', title:'Kva skjer etter ein PT-førespurnad?', summary:'Frå spørsmål til avtale og treningsplan.', time:'2 min', steps:[
    'Førespurnaden blir synleg for Garasjen i PT-administrasjonen.',
    'Ein PT kan bli tildelt, og de kan avtala ein passande time vidare.',
    'Dersom du får ein treningsplan eller WOD-ar, finn du dei under «Min treningsplan».',
    'Du kan gjennomføra tildelte økter både med PT og som eigentrening.',
  ], tip:'PT-timar er individuelle avtalar. Ein førespurnad er ikkje det same som ein stadfesta time.', action:'pt', actionLabel:'Sjå PT-førespurnader' },
  { id:'group-booking', category:'pt', title:'Meld deg på ein gruppetime', summary:'Faste tidspunkt, kapasitet og venteliste.', time:'1 min', steps:[
    'Trykk «Gruppetimar» på heimesida, eller opna Timeplan og vel Gruppetimar.',
    'Finn ein oppsett time og les tidspunkt, innhald og kapasitet.',
    'Vel «Meld på». Om timen er full, kan du få tilbod om venteliste.',
    'Sjå dine påmeldingar i kalenderen, og meld deg av dersom du ikkje kan delta.',
  ], tip:'Gruppetimar er saman med andre til ei oppsett tid. PT er individuelt og blir avtalt særskilt.', action:'group', actionLabel:'Sjå gruppetimar' },
  { id:'group-results', category:'pt', title:'Registrer resultat etter gruppetime', summary:'Gruppetimen og din personlege logg heng saman.', time:'1 min', steps:[
    'Etter ein gruppetime kan ein tilknytt WOD vera tilgjengeleg for resultatregistrering.',
    'Opna timen eller den tildelte WOD-en frå oversikta.',
    'Registrer dine eigne resultat og lagre økta på profilen din.',
  ], tip:'Oppvarming treng ikkje same detaljregistrering som hovuddelen av økta.', action:'group', actionLabel:'Opna Timeplan' },
  { id:'coffee-order', category:'coffee', title:'Bestill kaffi', summary:'Vel drikk, tilval og send bestillinga.', time:'2 min', steps:[
    'Trykk «Bestill kaffi» på Heim, eller opna Kaffibar under Meir.',
    'Bla i menyen eller vel kategori som Espresso og Mjølkekaffi.',
    'Vel ei drikk, tilpass til dømes mjølk eller smak dersom drikka har slike val, og legg henne i handlekorga.',
    'Gjer det same med fleire drikkar. Kvar variant får eigne tilval.',
    'Kontroller handlekorga og trykk «Send bestilling».',
  ], tip:'Menyen kan visast sjølv om kaffibaren er stengd. Bestilling kan berre sendast når han er open.', action:'coffee', actionLabel:'Opna kaffimenyen' },
  { id:'coffee-status', category:'coffee', title:'Følg ei kaffibestilling', summary:'Motteken, stadfesta, tilbereding og henting.', time:'1 min', steps:[
    'Opna Kaffibaren og vel «Mine bestillingar».',
    'Sjå om bestillinga er motteken, stadfesta, under tilbereding, klar eller utlevert.',
    'Har du valt feil, kan du trykkja «Avbestill før tilbereding» så lenge ho er motteken eller stadfesta.',
    'Når status er «Klar til henting», kan du henta drikka.',
    'Etter utlevering kan du leggja att ei frivillig produktvurdering.',
  ], tip:'Du kan avbestilla medan bestillinga er motteken eller stadfesta. Når tilberedinga har starta, må du kontakta baristaen. Tilval kan ikkje endrast etter sending.', action:'coffee', actionLabel:'Sjå kaffibestillingar' },
  { id:'coffee-terms', category:'coffee', title:'Kva er espresso, cortado og flat white?', summary:'Kort forklaring av dei vanlegaste kaffidrikkane.', time:'2 min', steps:[
    'Espresso er ein liten, konsentrert kaffidrikk. Doppio er dobbel espresso.',
    'Long black er varmt vatn med espresso over. Americano er espresso som er tilsett varmt vatn.',
    'Cortado er espresso med ei mindre mengd varm mjølk.',
    'Cappuccino har espresso, varm mjølk og skum. Flat white har gjerne meir espressopreg og fint mikroskum.',
    'Caffè latte har meir mjølk. Mocha kombinerer kaffi, mjølk og sjokolade.',
  ], tip:'Storleik og oppskrift kan variera mellom baristaer. Sjå produktkortet for det aktuelle tilbodet.', action:'coffee', actionLabel:'Sjå kaffimenyen' },
  { id:'spotify', category:'other', title:'Bruk Spotify under trening', summary:'Musikkspelaren og innstillingane på Mi side.', time:'2 min', steps:[
    'Opna Mi side og vel «Musikk og Spotify», eller bruk musikkvalet ved treningsklokka.',
    'Kople til Spotify dersom du ønskjer det og tenesta er tilgjengeleg.',
    'Vel avspelingseining, søk eller bruk snarvegar til musikk og spelelister.',
    'Kontroller at Spotify speler av på rett eining dersom du ikkje høyrer lyd.',
  ], tip:'Spotify er frivillig og er ikkje nødvendig for å bruka treningsklokka.', action:'music', actionLabel:'Opna musikk' },
  { id:'heart-rate', category:'other', title:'Puls og pulsbelte', summary:'Kople til og bruk pulsdata når utstyret støttar det.', time:'2 min', steps:[
    'Opna Mi side og finn innstillingane for puls under Profil.',
    'Følg tilkoplingsvalet for pulsbeltet eller eininga du brukar.',
    'Gjev ikkje beltet signal, kontroller batteri, tilkopling og om nettlesaren støttar nødvendig Bluetooth-funksjon.',
    'Puls er eit valfritt tillegg. Du kan gjennomføra alle økter utan pulsbelte.',
  ], tip:'Bluetooth-tilgang varierer mellom nettlesarar og einingar.', action:'profile', actionLabel:'Opna pulsinnstillingar' },
  { id:'notifications', category:'other', title:'Forstå varsel', summary:'Nye WOD-ar, PT, timeplan og kaffistatus.', time:'1 min', steps:[
    'Opna varselbjella øvst i appen.',
    'Les kva som har skjedd, til dømes ei tildelt økt, PT-oppfølging eller gruppetime.',
    'Trykk på varselet for å opna aktuell funksjon når det har ei lenkje.',
    'Lesne og arkiverte varsel skal ikkje ta merksemda frå nye hendingar.',
  ], tip:'Du kan alltid finna treningsplanen, timeplanen og kaffibestillingane direkte frå menyen.', action:'home', actionLabel:'Til heimesida' },
  { id:'coach-studio', category:'staff', title:'Bruk PT Studio som trenar', summary:'Finn tildelte kundar, følg opp planar og svar på status.', audience:'coach', time:'3 min', steps:[
    'Opna PT Studio frå Meir. Som registrert PT får du ei arbeidsflate for kundane du er knytt til.',
    'Vel ein kunde før du arbeider med individuelle planar og oppfølging.',
    'Bruk «Kurs og plan» til å sjå treningsopplegg, og «Mål og fokus» til å følgja utvikling.',
    'Under «Statussjekk» kan du senda spørsmål og gjennomgå svar når det er relevant.',
    'I «PT-timar og dialog» finn du timeavtalar og kontaktpunkta for kunden.',
  ], tip:'Som PT ser du ikkje automatisk alle medlemmar. Tilgangen følgjer rolla og kundetildelinga di.', action:'pt', actionLabel:'Opna PT Studio' },
  { id:'staff-pt', category:'staff', title:'Registrer og presenter PT-ar', summary:'Lag offentlege PT-profilar og følg opp førespurnader.', audience:'staff', time:'3 min', steps:[
    'Opna PT Studio og vel «PT-administrasjon» øvst.',
    'Gå til «PT-register» for å registrera ein trenar frå medlemsregisteret.',
    'Fyll inn namnet som skal visast til medlemmane, kort presentasjon og kompetanseområde.',
    'Gå til «Bestillingar» for å sjå nye førespurnader. Tildel rett PT når du har avklart vidare oppfølging.',
    'Legg eventuelt inn PT-tenester i tenestekatalogen.',
  ], tip:'PT-registeret er ikkje automatisk oppretta frå alle medlemmar. Garasjen vel kven som blir presentert.', action:'pt-admin', actionLabel:'Opna PT-administrasjon' },
  { id:'staff-class', category:'staff', title:'Opprett og administrer gruppetimar', summary:'Publiser time, kapasitet og eventuell WOD.', audience:'staff', time:'3 min', steps:[
    'Opna PT Studio og vel «Gruppetimeadministrasjon».',
    'Opprett ein time med dato, tidspunkt, kapasitet og innhald.',
    'Knyt til ein eller fleire WOD-ar ved behov.',
    'Publiser timen slik at medlemmane kan melda seg på.',
    'Følg opp påmeldingar, venteliste og resultatregistrering.',
  ], tip:'Individuelle PT-avtalar skal ikkje leggjast ut som gruppetimar.', action:'group', actionLabel:'Opna Timeplan' },
  { id:'staff-wod', category:'staff', title:'Bygg og publiser ein WOD', summary:'Format, øvingar, dosering og gjennomgang.', audience:'staff', time:'4 min', steps:[
    'Gå til WOD Studio og opprett ei ny økt.',
    'Vel WOD-format, namn og relevante tidsinnstillingar.',
    'Finn og legg til øvingar. Den same øvinga kan leggjast til fleire gonger.',
    'Set dosering for RX, Scaled og Foundation og kontroller måleeiningane.',
    'Gå gjennom rekkjefølgje og oppsett før du lagrar, publiserer eller tildeler økta.',
  ], tip:'I ein stasjonssirkel skal brukaren kunna velja repetisjonar eller så mange som mogleg, og klokka viser alle stasjonane.', action:'wod', actionLabel:'Opna WOD Studio' },
  { id:'staff-coffee', category:'staff', title:'Administrer meny og kaffibestillingar', summary:'Produkt, opning, bestillingskø og tilbakemeldingar.', audience:'staff', time:'3 min', steps:[
    'Opna Kaffibar. Som administrator eller manager får du «Ordrekø», «Vurderingar», «Meny» og «Statistikk».',
    'Bruk Meny til å leggja til, redigera eller markera drikkar som utselde.',
    'I Ordrekø kan du stadfesta, starta tilbereding, markera klar og registrera utlevering.',
    'Bruk kommentarfeltet til å gje kunden ei kort melding ved behov.',
    'Steng kaffibaren for nye bestillingar når du ikkje kan ta imot fleire ordrar.',
  ], tip:'Endringar i produktregisteret skal ikkje omskriva historiske bestillingar.', action:'coffee', actionLabel:'Opna kaffiadministrasjon' },
  { id:'garage-maintenance', category:'staff', title:'Reinhald og vedlikehald av garasjen', summary:'Tre korte sjekklister, kvitteringar og varsling til admin.', audience:'admin', time:'2 min', steps:[
    'Opna Administrasjon og vel «Drift». Under «Reinhald og vedlikehald» ligg vekesjekk, månadskontroll og kvartalssjekk.',
    'Opna den runden du vil gjera. Kryss av punkta etter kvart som du kontrollerer eller reingjer utstyret.',
    'Har du funne ein skade eller noko som må rettast, merk «Noko er skadd eller må følgjast opp» og skriv ei kort merknad.',
    'Trykk «Kvitter og lagre». Dato, namn og alle avkryssingane blir lagra i kvitteringshistorikken.',
    'Når eit avvik er retta, skriv kva som vart gjort og vel «Kvitter som løyst».',
    'Eit varsel kjem i varslingssenteret til admin når ein sjekk er forfallen eller eit avvik står ope.',
  ], tip:'Det er ikkje krav om daglege kvitteringar. Tørk berre vekk synleg sveitte og set utstyr på plass etter bruk.', action:'maintenance', actionLabel:'Opna reinhald og vedlikehald' },
  { id:'staff-members', category:'staff', title:'Medlemmar, roller og tilgang', summary:'Invitasjonar og trygg tilgangsstyring.', audience:'admin', time:'3 min', steps:[
    'Bruk administrasjonen til å invitera nye medlemmar.',
    'Eit medlem må ha godkjend konto før vanlege medlemsfunksjonar er tilgjengelege.',
    'Bruk rolletildeling berre når nokon skal ha utvida tilgang som manager.',
    'Kontroller alltid kven du arbeider med før du tildeler ein plan eller WOD i PT Studio.',
  ], tip:'Medlemmar kan sjølve endra visingsnamn, men ikkje rolle, medlemsstatus eller andre sin profil.', action:'admin', actionLabel:'Opna administrasjon' },
]

export const HELP_GLOSSARY = [
  ['AMRAP','As Many Rounds/Reps As Possible: flest mogleg rundar eller repetisjonar innan tidsgrensa.'],
  ['Assistanse','Hjelp til å gjennomføra ei rørsle, til dømes med strikk ved pull-ups.'],
  ['Benchmark','Ei standardisert økt som kan gjennomførast fleire gonger for å samanlikna utvikling.'],
  ['Cal','Kaloriar vist av treningsmaskina, til dømes romaskin. Ikkje det same som presist målt energiforbruk.'],
  ['Chipper','Ei lengre rekkje øvingar eller oppgåver som vanlegvis blir gjennomførte i oppsett rekkjefølgje.'],
  ['Complex','Fleire rørsler utførte etter kvarandre som éin samanhengande sekvens.'],
  ['Doppio','Dobbel espresso.'],
  ['EMOM','Every Minute on the Minute: ei oppgåve startar ved kvart intervall. E2MOM har to minutt per intervall.'],
  ['For Time','Fullfør eit bestemt arbeid på kortast mogleg tid.'],
  ['Foundation','Ei enklare grunnutgåve av ein WOD.'],
  ['Intervall','Veksling mellom periodar med arbeid og pause eller rolegare aktivitet.'],
  ['Kg','Kilogram, vanleg måleeining for belastning i styrketrening.'],
  ['M / km','Meter / kilometer, brukt ved til dømes roing eller sykling.'],
  ['Mobilitet','Trening av rørsleutslag, kontroll og rørslekvalitet.'],
  ['PR','Personleg rekord: ditt beste registrerte resultat på ei øving eller ein test.'],
  ['PT','Personleg trenar: ein trenar som gjev individuell rettleiing og oppfølging.'],
  ['Gruppetime','Ei organisert treningsøkt for fleire medlemmar på eit bestemt tidspunkt.'],
  ['Reps','Repetisjonar: kor mange gonger ei rørsle blir utført.'],
  ['RIR','Repetitions in Reserve: om lag kor mange fleire repetisjonar du trur du kunne klart.'],
  ['RPE','Opplevd anstrengingsgrad, vanlegvis på ein skala frå 1 til 10.'],
  ['RX','Standardutgåva av ein WOD, før individuell tilpassing.'],
  ['R1, R2, R3','Runde 1, 2 og 3. Rundetidene kan samanliknast under og etter økta.'],
  ['Scaled','Tilpassa utgåve av WOD med justert vekt, reps eller øvingar.'],
  ['Set','Ei samling repetisjonar før ein pause eller ein ny serie.'],
  ['Stasjonssirkel','Trening med fleire stasjonar der deltakarane roterer mellom arbeid og bytte/pause.'],
  ['Tabata','Intervallformat med korte arbeids- og kvileperiodar, ofte 20 sekund og 10 sekund.'],
  ['Time cap','Maksimal tid økta kan vare før klokka avsluttar tidsramma.'],
  ['WOD','Workout of the Day: ei ferdig planlagd treningsøkt.'],
  ['1RM','One-Rep Max: tyngste belastning du kan løfta éin gong med godkjend utføring.'],
  ['%1RM','Prosentdel av di estimerte eller målte maksimale belastning i ei øving.'],
  ['Venteliste','Du står i kø dersom ein gruppetime er full. Ein plass er ikkje stadfesta før du er teken inn.'],
]

// Eitt fast område per omgrep. Det gjer ordlista lettare å bla i på mobil.
export const HELP_GLOSSARY_GROUPS = [
  {id:'wod',title:'WOD og øktformat',summary:'Økter, intervall og treningsklokke',terms:['AMRAP','Benchmark','Chipper','Complex','EMOM','For Time','Intervall','Stasjonssirkel','Tabata','Time cap','WOD']},
  {id:'level',title:'Nivå og dosering',summary:'Korleis treninga blir tilpassa',terms:['Foundation','Reps','RIR','RPE','RX','Scaled','Set','1RM','%1RM']},
  {id:'results',title:'Måling og resultat',summary:'Einingar, rundar og personlege rekordar',terms:['Cal','Kg','M / km','PR','R1, R2, R3']},
  {id:'pt',title:'PT og gruppetimar',summary:'Trenar, påmelding og venteliste',terms:['PT','Gruppetime','Venteliste']},
  {id:'movement',title:'Rørsle og teknikk',summary:'Kroppskontroll og hjelp til øvingar',terms:['Assistanse','Mobilitet']},
  {id:'coffee',title:'Kaffibaren',summary:'Ord frå kaffimenyen',terms:['Doppio']},
]

export const HELP_FAQS = [
  { question:'Må eg velja øvingar for å starta ei fri økt?', answer:'Nei. Du kan starta klokka direkte, trena som du vil og lagra berre varigheita.', topic:'free-workout' },
  { question:'Eg har gløymt passordet eller manglar invitasjon. Kva gjer eg?', answer:'Bruk «Gløymt passord?» på innloggingssida. Er du ny, treng du ei personleg invitasjon frå administrator.', topic:'login-help' },
  { question:'Kvifor startar ikkje klokka når eg opnar ein WOD?', answer:'Økta opnar i treningsvisninga, men startar først når du trykkjer Start. Det skal vera eit medvite val.', topic:'timer-basics' },
  { question:'Kva om eg ikkje klarer RX-vekta?', answer:'Vel Scaled eller Foundation og tilpass etter nivå. Poenget er ei trygg og nyttig økt.', topic:'wod-levels' },
  { question:'Skal eg endra vekt og reps etter økta?', answer:'Ja, dersom tala ikkje stemmer med det du gjorde. Gjennomgangen er nettopp ein kontroll før lagring.', topic:'finish-review' },
  { question:'Eg hugsar ikkje Snatch Complex. Kvar finn eg hjelp?', answer:'Trykk på øvinga i øvingslista i klokka for å opna tilgjengelege detaljar og instruksjonar.', topic:'exercise-details' },
  { question:'Er ein PT-førespurnad ei bestilling?', answer:'Nei. Han er uforpliktande, og ingen time eller betaling blir avtalt før du sjølv seier ja.', topic:'pt-contact' },
  { question:'Kva er skilnaden mellom PT og gruppetime?', answer:'PT er individuell hjelp som de avtalar vidare. Gruppetimar har faste tidspunkt og påmelding saman med andre.', topic:'group-booking' },
  { question:'Kan eg velja ulik mjølk på to kaffiar?', answer:'Ja. Tilvala blir lagra for kvar variant i handlekorga, så cappuccino med havre og latte med vanleg mjølk kan bestillast saman.', topic:'coffee-order' },
  { question:'Kvifor kan eg ikkje senda kaffibestilling?', answer:'Kontroller at kaffibaren er open og at du har lagt minst éi drikk i handlekorga. Utselde produkt kan ikkje bestillast.', topic:'coffee-order' },
  { question:'Kan eg bruka treningsklokka utan Spotify eller pulsbelte?', answer:'Ja. Begge er frivillige tillegg. Klokka og treningsloggen fungerer utan dei.', topic:'timer-basics' },
]

export function visibleHelpTopics(profile, isCoach = false) {
  const staff = ['admin','manager'].includes(profile?.role)
  return HELP_TOPICS.filter(topic => !topic.audience || (topic.audience === 'coach' && (isCoach || staff)) || (topic.audience === 'staff' && staff) || (topic.audience === 'admin' && profile?.role === 'admin'))
}

export function searchHelpTopics(topics, query) {
  const needle = String(query || '').trim().toLocaleLowerCase('nn-NO')
  if (!needle) return topics
  return topics.filter(topic => [topic.title,topic.summary,...topic.steps,topic.tip || ''].join(' ').toLocaleLowerCase('nn-NO').includes(needle))
}
