# Opne og teste GarasjeGym 2.0 lokalt

Dette er ei mellombels testutgåve. Ho brukar eit eige Supabase-testprosjekt, aldri produksjonsdatabasen.

## Krav
- Windows-PC
- Node.js 20 eller nyare: https://nodejs.org/
- Internett for å installera npm-pakkar og kople til testdatabasen

## Supabase-testprosjekt
- Prosjekt: `garasjegym-2-test`
- Prosjekt-ID: `izwzwvlexqxqewzijhhd`
- URL: `https://izwzwvlexqxqewzijhhd.supabase.co`
- Bruk berre publishable key frå prosjektet. Ikkje bruk produksjonsnøklar.

Før registrering: opne Supabase Dashboard → Authentication → URL Configuration. Set Site URL til `http://localhost:5173/Garasjegym/` og legg til `http://localhost:5173/Garasjegym/**` under Redirect URLs. Dette er berre testprosjektet.

## Start
1. Last ned ZIP frå utviklingsgreina: https://github.com/tibraxTIMB/Garasjegym/archive/refs/heads/garasjegym-2.0-sturm%C2%ADkopf.zip
2. Pakk ut ZIP-fila.
3. Opne mappa `v2`.
4. Dobbeltklikk `START-GARASJEGYM-2.0.bat`.
5. Første gong blir `.env.local` oppretta og opna i Notisblokk. Fyll inn URL og publishable key frå det dedikerte testprosjektet i Supabase. Lagre.
6. Start BAT-fila på nytt. Appen opnar på http://localhost:5173/Garasjegym/.
7. Vel «Registrer deg» og opprett ein testkonto. Nye kontoar får medlemsrolle. Administratorrettar blir tildelte separat etter at testkontoen er oppretta.

## Test på Android og Pages

Ei tidlegare testutgåve er tilgjengeleg på https://tibraxtimb.github.io/Garasjegym/. Ho brukar testprosjektet `garasjegym-2-test`, men er ikkje oppdatert med alle endringane på siste STURMKOPF-grein. Siste kode må byggjast og publiserast særskilt; Pages-adressa er delt og blir ikkje oppdatert automatisk. Bruk berre testkontoar og testdata.

For at passordreset skal kunna returnera til appen, må testprosjektet ha denne adressa under Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:

`https://tibraxtimb.github.io/Garasjegym/`

Behald òg `http://localhost:5173/Garasjegym/**` for lokal testing. Ikkje endra innstillingar i produksjonsprosjektet. Passordreset i klienten brukar no Vite sin `BASE_URL`, slik at Pages-stien blir med i redirecten.

På Android: opne Pages-adressa i Chrome. Appen kan leggjast til på startskjermen via nettlesarmenyen dersom nettlesaren tilbyr «Installer app» eller «Legg til på startsida».

## Viktig
- Ikkje bruk URL eller nøkkel frå produksjonsprosjektet.
- Bruk berre testkontoar og testdata. Testprosjektet inneheld demoøvingar, ein demo-WOD, kaffiprodukt og ei testgruppeøkt.
- Ikkje legg `.env.local` i Git eller del innhaldet offentleg.
- Stopp serveren med Ctrl+C i terminalvindauget.
- Appen er ikkje produksjonsklar berre fordi ho kan opnast. Testplanen ligg i `QA-2.0.md`.
