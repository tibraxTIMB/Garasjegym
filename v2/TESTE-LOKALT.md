# Opne og teste GarasjeGym 2.0 lokalt

Dette er ei mellombels testutgåve. Ho brukar eit eige Supabase-testprosjekt, aldri produksjonsdatabasen.

## Krav
- Windows-PC
- Node.js 20 eller nyare: https://nodejs.org/
- Internett for å installera npm-pakkar og kople til testdatabasen

## Start
1. Last ned ZIP frå utviklingsgreina: https://github.com/tibraxTIMB/Garasjegym/archive/refs/heads/garasjegym-2.0-sturm%C2%ADkopf.zip
2. Pakk ut ZIP-fila.
3. Opne mappa `v2`.
4. Dobbeltklikk `START-GARASJEGYM-2.0.bat`.
5. Første gong blir `.env.local` oppretta og opna i Notisblokk. Fyll inn URL og publishable key frå det dedikerte testprosjektet i Supabase. Lagre.
6. Start BAT-fila på nytt. Appen opnar på http://localhost:5173.

## Viktig
- Ikkje bruk URL eller nøkkel frå produksjonsprosjektet.
- Bruk berre testkontoar og testdata.
- Ikkje legg `.env.local` i Git eller del innhaldet offentleg.
- Stopp serveren med Ctrl+C i terminalvindauget.
- Appen er ikkje produksjonsklar berre fordi ho kan opnast. Testplanen ligg i `QA-2.0.md`.
