# DOPPELADDER – operativt mandat (mellombels, 2026-11-27)

Dette er ei sporbar arbeidsordre basert på den eksplisitte instruksen frå brukaren og eksisterande DOPPELADDER_STATUS.md, ikkje ei attgiving av den fullstendige 21-punktsordren frå 26. november. Originalen og lista med 17 brukarforløp er ikkje gjenfunne i fulltekst. Ingen nye krav skal diktast opp eller merkast som godkjende. Når originalen blir tilgjengeleg, skal han lagrast her eller lenkjast frå denne fila, og avvik gjennomgåast.

## Bindande rammer
- Arbeid berre i tibraxTIMB/Garasjegym, gazelle-operational-anatomical. Ingen produksjonspublisering, merge til produksjon, databaseendringar eller reelle databaseskrivingar i testar. Vern eksisterande data. Nullbudsjett.
- Gjenbruk eksisterande kode, format, design og datakontraktar. Ikkje opprett parallelle system.
- Les denne fila, DOPPELADDER_STATUS.md, nyaste commit og relevante kjeldefiler/testar i kvar køyring. Kontroller faktisk greinstatus, ikkje stol på eldre rapportar.
- Vel éi avgrensa nødvendig pakke med klart akseptansekriterium frå dei dokumenterte krava. Implementer, integrer, test, rett og commit. Ved manglande originaltekst kan eintydige krav framleis implementerast; ikkje utvid omfanget basert på gissing.
- UX og realisme: sjekk faktisk brukarveg, skjermflate, lesbarheit, tydelege handlingar, relevante input og realistisk samtidig utstyrsbruk; skil kodekontroll, automatisert nettlesartest og praktisk brukartest.
- Før status med commit, testkommando/resultat, avgrensingar og neste oppgåve. Ingen påstand om arbeid mellom køyringar. Ingen påstand om bestått test utan resultat. Ikkje repeter identiske historieoppslag som einaste arbeid.
- Alle 17 originale brukarforløp må verifiserast før endeleg godkjenning; lista er førebels ein open akseptanseblokkering. Ingen automatisk godkjenning eller publisering.

## Arbeidspakkar frå eksplisitt brukarmandat
DA01 fundament; DA02 operativ flyt; DA03 WOD Builder; DA04 universelt Samspel inkludert Quality & Row utan AMRAP; DA05 Lastmeister samtidig utstyrsfordeling; DA06 felles timer; DA07 Etterøkta; DA08 PT og plan; DA09 anatomi/PR/Ghost; DA10 Kameradschaft; DA11 Mission Control; DA12 failsafe/personvern/regresjon.

## Neste prioritet, basert på statusdokumentet
DA04/DA06/DA07: utvid samansette WOD-ar med éin av dei fem Samspel-malane som berre finst frittståande, etter å ha kartlagt dei faktiske modulane. Engine Swap er første kandidat, ikkje eit nytt bindande krav. Gjenbruk eksisterande rotasjons- og timerlogikk, kontroller delstart, faktisk resultat, delvis/avbroten økt, reload og neste del. Ikkje lat uverifiserte deltakarspor bli personlege PR/anatomi/Ghost-data. Dersom kjelda viser at denne pakken alt er gjennomført, vel neste dokumenterte integrasjonsgap. Ved konkret teknisk blokkering, utfør ei mindre trygg, testbar deloppgåve dersom mogleg.

## Akseptanse
Ingen av dei tolv pakkane blir automatisk godkjende av denne fila. Bruk DOPPELADDER_STATUS.md som løpande evidenslogg. Full originaltekst, dei 17 forløpa og praktisk brukartesting står att som akseptansegrunnlag.

## Utvida arbeidsordre – SYNCHRON LEISTUNGSWERK (2026-11-27)
Brukaren godkjende bygging etter simulert teamrevisjon. SL01 Lobby/invitasjon; SL02 autoritativ felles klokke og roller; SL03 arbeidsbolkar, byte, kvile; SL04 blanda arbeidsmål per øving; SL05 individuelle observerte kalibreringar; SL06 belastningsavhengige estimat og avstemming mot faktisk lagresultat; SL07 Lastmeister og endra belastning per bolk; SL08 Etterøkta og individuell godkjenning; SL09 PT/gruppetime/anatomi/PR/Ghost; SL10 fleirbrukar-, nettutfalls- og personverntest. Første pakke er avgrensa til deterministisk domenelogikk for vekselvis arbeid, ikkje ny timer eller ny mal. Estimat er ikkje måling eller PR. Ingen databaseendringar eller produksjonspublisering under eksisterande mandat; servertransport, atomisk autorisasjon og eventuell datamodell krev eiga trygg avklaring. Dei opphavlege DA-akseptansekrava står framleis ved lag.
