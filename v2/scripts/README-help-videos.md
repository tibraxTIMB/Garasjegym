# Automatisk instruksjonsvideo med ekte appvising

Dei fem videoane i `Mi side → Hjelp og rettleiing → Videoar` blir tekne opp
automatisk frå **dei verkelege React-komponentane** i GarasjeGym. Opptaka
viser mobilvisinga (390 × 844) og korte forklaringar på nynorsk.

**Ingen medlemsdata eller innlogging:** `video-demo.html` blir berre bygd med
`vite.video-demo.config.js`. Alle Supabase-kall blir då erstatta med
`videoDemoSupabase.js`, som lagrar demodata i minnet. Nettlesaren får berre
tilgang til den lokale Vite-tenaren. Det blir aldri brukt e-post, passord,
verkelege namn, produksjonsdata eller eksterne tenester i opptaket.

## Kva skjer ved publisering?

1. GitHub Actions installerer gratis Playwright/Chromium og brukar FFmpeg.
2. Ei lokal demovisning viser ekte Heim, Mi side, Hjelp, Fri trening, WOD,
   treningsklokke, PT, gruppetime og vedlikehaldslista.
3. Playwright klikkar gjennom fem flytar. Nynorske tekstplakatar blir henta frå
   hjelpetekstane i `src/lib/helpContent.js`.
4. Kvar video blir lagra som MP4 og PNG-plakat under `public/help/videos/`,
   og blir med i Pages-publiseringa. Opptak vert ikkje skrivne tilbake til git.
5. Byggejobben kontrollerer at alle fem videoane er ekte opptak før publisering.

Dette kostar ikkje noko i programvarelisensar. Opptaka har ingen
forteljarstemme, og all instruksjonstekst finst også som vanleg, tilgjengeleg
tekst i hjelpesenteret. Admin-videoen blir berre vist for administratorar.

## Utvikling og vedlikehald

For å opna demovisninga lokalt:

```sh
cd v2
npm run help:demo
```

For å ta opp på nytt (krev Python 3, `pip install playwright`, installert
Chromium for Playwright og FFmpeg):

```sh
cd v2
npm run help:videos:live
npm run help:videos:live-check
```

`help:videos` og den gamle Pillow-generatoren blir berre tekne vare på som
offline-reserve for lokal utvikling. Dei blir **ikkje** brukte ved publisering.
Skiftar knappetekst eller brukarflate, må opptaksstega i
`scripts/record-real-help-videos.py` oppdaterast. Om eit steg ikkje finst,
stoppar publiseringa før feil video går ut.
