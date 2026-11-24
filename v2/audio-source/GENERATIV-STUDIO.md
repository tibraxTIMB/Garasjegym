# GarasjeGym – generativ lydproduksjon (arbeidsløype)
Mål: originale, profesjonelt klingande musikkproduksjonar, ikkje MIDI eller tilfeldige pip. 
Tre originaltema: EISEN, DISKOPANZER og BALKAN BERSERK. Eigne victory-tema for PR.
Bruk ACE-Step 1.5 (MIT-kode; sjekk modell/output-vilkår og originalitet).
Offisiell modell: https://github.com/ace-step/ACE-Step-1.5
API: https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md
Demo: https://huggingface.co/spaces/ACE-Step/Ace-Step-v1.5

## Produksjon, ikkje runtime
1. Start godkjend lokal ACE-Step API på 127.0.0.1:8001 på eigna maskin.
2. Frå v2: node scripts/generate-studio-music.mjs personal (eller pt/group; utan argument alle).
   Lydmastere med to takes per tema/victory og metadata blir lagra under audio-source/studio-takes.
   Alternativ: lim inn caption/victory frå generative-studio.json i offisiell demo, last ned WAV.
3. Lytt. Vel éin samanhengande musikalsk identitet per profil. Klipp presise signal etter faktiske transients, ikkje eit blindt tidsrutenett.
4. Kopier cuts.example.json til takes-mappa som cuts.json. Fyll inn kjelde, SHA-256, start og lengd for kvar av dei 30 signala. Lytt til alle, kontroller originalitet og bruksløyve; merk godkjent.
5. node scripts/compile-studio-cues.mjs audio-source/studio-takes/.../cuts.json
   Gjev 30 lokale 48 kHz stereo WAV-filer med proveniens i review-pack. Krev ffmpeg.
6. Lytt til review-pack i reell timerflyt. Berre etter godkjenning og ny test/publiseringsordre kan dei erstatta eksisterande lydpakke. Ingen automatisk erstatning.
 
## Dramaturgi
Nedteljing: tre tydelege korte signal med stigande energi, maks 0,95s. Start: umiddelbar slagkraft og oppløftande drop. Runde: same musikalske identitet, kort ny impuls. Pause: rolegare kadens, ikkje same som finish. Stasjon: distinkt kort rytmisk markeringssignal. Finish: tydeleg musikalsk avslutning. Registrert: lite kvitteringssignal. PR: uavhengig triumferande fanfare 4–8s, eksisterande PR-reglar uendra.
EISEN kan ha naturlege gong-/klokkehalar inntil 6s for lengre signal. Timeren har framleis prioritet. Ikkje kutt inn i nedteljingsslaga, ikkje legg inn kontinuerleg bakgrunnsmusikk, ikkje endra eksisterande Spotify-integrasjon.
Ingen artistopptak, melodiavskrift, etterlikna vokal eller betalte API-kall. Bruk sjangerkjenneteikn, ikkje kopiar av verk. 
Status: generator og kandidat-kompilator; ingen faktiske ACE-Step-takes generert eller publisert i dette miljøet.
