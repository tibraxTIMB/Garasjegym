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

## OPERASJON GESAMTWERK – godkjend 2026-11-27

Brukaren har godkjent vidare prosess, ferdigstilling og automatisk neste arbeidspakke. Denne ordren prioriterer samordning og akseptanse framfor nye funksjonar; alle eksisterande DOPPELADLER/SYNCHRON-krav og tryggleiksrammer står ved lag.

| Fase | Prioritet | Akseptanse før overgang |
|---|---|---|
| GW01 Stammordnung | P0 | Frys og samanlikn faktiske greinhovud og felles stamcommit; kartlegg begge endringssetta; samordne produksjonsrettingar inn i berre Gazelle, med trevegsvurdering, verna release-config og komplett regresjon; ingen blind merge eller force push. |
| GW02 Stacheldraht | P0 | Gjenopptaking, aktiv økt, nettutfall, rolle-/tilgangskontroll og idempotent resultat; skil test av kontrakt frå reell persistens. |
| GW03 Synchron | P0 | Same økt på PT og kunde, korrekt autoritativ klokke, invitasjon, roller og arbeid/byte; ekte transport og isolert persistens krev eiga godkjenning. |
| GW04 Leistungswerk | P1 | Individuell godkjenning, faktisk/estimert skilje, historikk, PT, PR/Ghost/anatomi utan feilklassifisering. |
| GW05 Meisterwerk | P1 | Samansett WOD, Samspel, øvingar, Lastmeister, tildeling og datert plan; produksjonsrettingar verna. |
| GW06 Werkstatt | P1 | Administrativ PC-flate, mobil/brett-test og eksisterande Garmin/eksport; same innlogging, rett rolle og ingen parallelle system. |
| GW07 Frontdienst | P2 | Reelle brukarvegar, lesbarheit, skjermflate, input og responsiv navigasjon; mobil og nettbrett. |
| GW08 TÜV | P2 | Native build, alle relevante CI/regresjonar, browser- og praktiske fleirbrukartestar, eksisterande data verna, opphavlege 17 forløp verifiserte. |
| GW09 Freigabe | Port | Dokumenter releasekandidat, backup/restore og rollback; stopp før merge til produksjon, migrasjon eller publisering utan uttrykkeleg godkjenning. |

### GW01 startgrunnlag – 2026-11-27
- Repository: tibraxTIMB/Garasjegym. Arbeidsgrein: gazelle-operational-anatomical, start f487494bde57b8250b1bec0db4575118070bbe4c.
- Produksjonsgrein (eksakt GitHub-namn med U+00AD): garasjegym-2.0-sturm­kopf, start 0a7a1c549255e8d3542828ff2655f854b44cc5ca. Felles stamcommit 6828ef86627f323ffcbb92fea4f9ce80842ad1f8.
- GitHub compare i begge retningar: 260 utviklingscommits, 58 produksjonscommits, 102 utviklingsfiler og 103 produksjonsfiler, 13 overlapp. Dette er filoverlapp, ikkje bevis for 13 mergekonfliktar.
- Overlapp: .github/workflows/gazelle-responsive-audit.yml; v2/package.json; v2/scripts/member-customer-journey.test.mjs; v2/scripts/pr-metrics.test.mjs; v2/scripts/pt-role-journey.test.mjs; v2/scripts/responsive-audit.py; v2/src/App.jsx; v2/src/components/GarageInventory.jsx; v2/src/components/PTStudio.jsx; v2/src/components/Training.jsx; v2/src/components/WodBuilder.jsx; v2/src/lib/performanceEvidence.js; v2/src/uiAuditMain.jsx.
- Særleg vern: produksjon sin Werkstatt/Exportwerk, service worker, release-manifest og publiseringsport. Ikkje kopier produksjonspubliseringskonfig ukritisk. Ingen endringar i produksjonsgrein, main, andre prosjekt eller database.
- Lokal git ls-remote feila med DNS; ikkje påstå lokal checkout, merge eller native test. GitHub connector kan lesa og skriva eksplisitt til Gazelle. For store eller binære endringar: krev trygg Git-arbeidsflate eller dokumentert tapsfri Git tree-metode; aldri kopier delvis eller gjett innhald. Hent base/dev/prod på eksakte SHA ved trevegsrevisjon. Verifiser gjeldande greinhead før skriving; bruk konfliktvern og atomiske commits når mogleg.

### AUTO VIDARE
Hald éin aktiv Autobygg-prosess; opprett neste konkrete arbeidspakke i statusdokumentet når førre er verifisert, utan nytt brukarspørsmål for godkjende kodeendringar. Kvar køyring: les mandat/status, sjekk aktuelle refs og eventuell anna pågåande skriving; vel neste avgrensa, testbare steg i tidlegaste opne GW-fase; implementer, test, commit og verifiser, logg evidens og neste steg. Ingen status-only loop dersom trygg konkret framdrift er mogleg. Ved blokkering: gjer trygg, uavhengig deloppgåve innanfor mandatet, merk blokkerte portar, ikkje erklær bestått eller hopp over dei. Stopp før eksterne kostnader, databaseendring, reelle databaseskrivingar, produksjonsmerge eller publisering. Ingen nye autonomt oppretta overlappande automasjonar. Endeleg godkjenning krev dei faktiske 17 originale forløpa og praktisk test; ikkje dikt dei opp.


## Recovered acceptance checklist – 2026-11-27
Conversation history contains a previous assistant's summary of the 17 journeys in point 18 of the original order (2026-11-26 16:44 UTC). This is a recovered checklist, not a verified verbatim original. The user subsequently required the 17 journeys from the main order (2026-11-26 17:13 UTC). Do not mark practical acceptance from CI alone or substitute documentation for implementation.

| ID | Recovered journey | Practical acceptance evidence required |
|---|---|---|
| A01 | Today's assigned workout | Member opens dated assignment, trains, saves, sees assignment status. |
| A02 | Self-selected workout | Member finds and completes own choice without PT intervention. |
| A03 | PT customer planning, assignment, follow-up | PT plans for one authorized customer, assigns and reviews actual result. |
| A04 | Convert quality WOD to Quality & Row | Preserve movement and intended quality; verify both participants' timing and row output. |
| A05 | Samspel beyond AMRAP | Verify appropriate work, switch and pause for a supported non-AMRAP format. |
| A06 | Two participants with different strength tracks | Both individual doses/results remain separate, no incorrect PR. |
| A07 | Conflict-free equipment and plates | Concurrent equipment demand and actual plate distribution agree; invalid setup blocked. |
| A08 | Composite WOD | Multiple parts, transitions, pauses, partial completion and save. |
| A09 | Manual external workout | Enter actual exercises, sets and weights in ordinary log. |
| A10 | Correct erroneous result | Correct saved result; derived records reflect verified actual data. |
| A11 | History, PR and anatomy updates | Correct individual evidence; estimated/team results not promoted to personal PR. |
| A12 | Plan progression linkage | Dated plan, assignment and completed result stay linked; no duplicate progress. |
| A13 | Network outage without loss or duplicates | Disconnect/reload/rejoin, preserve local draft, reconcile authoritative result once. |
| A14 | Save workout and optional social activity | Save works with or without optional social posting. |
| A15 | Owner creates spontaneous gathering | Owner creates gathering, members see relevant invitation and status. |
| A16 | Existing data and functionality preserved | Verified private backup and restore, compare ordinary workflows before/after. |
| A17 | Mobile/tablet | Actual phone and tablet user journeys, readability, input, touch, portrait/landscape. |

These evidence descriptions are operational acceptance criteria derived from the recovered summary, not additional user-approved feature scope. Exact original full wording remains unverified. No row is marked accepted by this checklist alone.
