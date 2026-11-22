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
4. Ei lokal, gratis Piper-stemme les den nynorske teksten. Den godkjende
   **uttalevarianten 2.1** brukar den vanlege norske setningsuttalen, men
   engelske treningsord (WOD, RX, Scaled, Foundation m.m.) får engelske
   fonem frå gratis eSpeak NG. Same norske stemme blir brukt heile tida,
   med jamnare tempo, kortare pausar og naturleg omskriving av uttrykk
   som «WOD-ar» og «PT-ane» berre i den opplesne teksten.
   Kvar video blir
   lagra med tale i både MP4 og WebM, pluss PNG-plakat under `public/help/videos/`,
   og blir med i Pages-publiseringa. Opptak vert ikkje skrivne tilbake til git.
5. Byggejobben kontrollerer at alle fem videoane er ekte opptak før publisering.
   Han prøver også «Spel videoen» i sjølve hjelpesenteret på mobilbreidd.

Dette kostar ikkje noko i programvarelisensar. Opptaka har syntetisk norsk
forteljarstemme som les nynorsk manus, og all instruksjonstekst finst også som
vanleg, tilgjengeleg tekst i hjelpesenteret. Stemmemodellen er trena på
norsk uttale, ikkje ein eigen nynorsk dialekt. Admin-videoen blir berre vist
for administratorar. Piper-modellen `no_NO-talesyntese-medium` kjem frå
Språkbanken-materiale med CC0-lisens; han blir køyrd lokalt i byggjejobben
og nyttar ingen ekstern taleservice eller medlemsdata.
Nettlesaren får ein tydeleg startknapp, automatisk formatval mellom MP4 og
WebM, og eigne direktelenkjer dersom den innebygde spelaren ikkje fungerer.
Appens offline-mellomlager tek ikkje lenger over byte-førespurnader for
MP4/video og lyd. Slik kan Chrome på Android spela av og spola i filene.

**Kvifor ikkje heile uttalebiblioteket?** Den forkasta pilot 3 prøvde å
overstyra alle nynorske ord med X-SAMPA-fonem frå Lingit-lista. Den vart
unaturleg. Me brukar difor ikkje slike overstyringar i videoane: Nynorsk
setningsmelodi kjem frå Piper som før, og berre ei eksplisitt liste med
engelske treningsuttrykk får eigen uttale. Lista ligg i
`scripts/help_video_pronunciation.py` og er med i automatisk testing.

## Utvikling og vedlikehald

For å opna demovisninga lokalt:

```sh
cd v2
npm run help:demo
```

For å ta opp på nytt (krev Python 3, `pip install playwright piper-tts`,
Chromium for Playwright, FFmpeg og den gratis norske Piper-modellen):

```sh
cd v2
python -m piper.download_voices --data-dir ./piper-voices no_NO-talesyntese-medium
export HELP_VIDEO_VOICE_MODEL=./piper-voices/no_NO-talesyntese-medium.onnx
npm run help:videos:live
npm run help:videos:live-check
```

`help:videos` og den gamle Pillow-generatoren blir berre tekne vare på som
offline-reserve for lokal utvikling. Dei blir **ikkje** brukte ved publisering.
Skiftar knappetekst eller brukarflate, må opptaksstega i
`scripts/record-real-help-videos.py` oppdaterast. Om eit steg ikkje finst,
stoppar publiseringa før feil video går ut.
