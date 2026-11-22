# Hjelpevideoar i GarasjeGym

Fem korte, illustrerte videoar ligg under `Mi side → Hjelp og rettleiing`.
Dei bruker tekst direkte frå `src/lib/helpContent.js` og tema frå
`src/lib/helpVideos.js`.

- Generatoren brukar **Pillow og FFmpeg**, ikkje eit betalt AI- eller videotilbod.
- Kvar video blir lagra som MP4 med tilhøyrande PNG-plakat i `public/help/videos/`.
- Illustrasjonane etterliknar designretninga, men er **ikkje skjermopptak**.
- Det blir ikkje brukt ekte brukarnamn, e-post, innlogging eller medlemsdata.
- Videoane er utan forteljarstemme. All informasjon finst på nynorsk i videoen
  og som vanleg tekst i hjelpesenteret.
- Admin-rettleiinga for vedlikehald visast berre for admin, i samsvar med tilgangen
  til dei tilhøyrande hjelpetema.

## Regenerer etter ei endring

Med Python 3, `pip install pillow`, FFmpeg og Node tilgjengeleg:

```sh
cd v2
npm run help:videos
npm run help:videos:check
npm run test:help-videos
```

Alle videoar blir bygde frå hjelpetekstane i ei køyring. `--check` les
innhaldssignaturen og varslar om videoane må oppdaterast. GitHub Actions-
arbeidsflyten `Regenerer gratis hjelpevideoar` køyrer ved relevante
hjelpetekstendringar på STURMKOPF-greina, eller manuelt. Ved endringar
publiserer han oppdaterte videoar på eksisterande testadresse.

Ved større designendringar må menneske kontrollera at dei illustrerte stega
framleis samsvarar med appen. Denne generatoren kan ikkje automatisk forstå
ei endra brukarreise utan oppdatert rettleiing.
