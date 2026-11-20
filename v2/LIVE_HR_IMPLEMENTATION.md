# GarasjeGym Live HR – teknisk retning

## Produktprinsipp

Live HR er ein valfri funksjon integrert i eksisterande GarasjeGym-flyt. Det skal ikkje finnast ein eigen Live HR-modul eller eit eige navigasjonspunkt.

- Sensorinnstillingar ligg under **Mi side**.
- Pulsvising ligg i eksisterande **Treningsmodus**.
- PT, gruppetime og partnarøkt brukar same øktbaserte pulsstraum.
- Ingen pulsfunksjon skal vere påkravd for å bruke appen.
- Måling, deling og lagring er tre separate samtykkeval.

## Målarkitektur

### Sensor på personleg eining

Kundens telefon koplar seg direkte til BLE-pulsbeltet gjennom Bluetooth Heart Rate Service (UUID `0x180D`, measurement characteristic `0x2A37`). Telefonen sender seinare målingane vidare til ei autorisert øktkanal.

PT sitt nettbrett skal ikkje trenge direkte Bluetooth-tilkopling til kunden sitt belte. Det abonnerer på same aktive økt og viser berre puls frå deltakarar som har samtykt.

### Live-transport

Supabase Realtime Broadcast er føreslått for låg forseinking. Kvar økt får ein privat kanal. RLS på `realtime.messages` skal avgrense både sending og mottak til den aktuelle kunden og autoriserte PT-/instruktørroller.

Pulsverdiane skal ikkje sendast gjennom offentlege kanalar eller lagrast i ei generell, offentleg lesbar tabell.

### Øktkopling

Live HR skal koplast til eksisterande øktidentitet:
- PT: aktiv `pt_sessions`-rad med kunde og ansvarleg PT.
- Gruppetime: aktiv `class_live_sessions`-rad og stadfesta booking.
- Partnarøkt: same aktive treningsøkt med eksplisitt deltakarpar.
- Individuell trening: lokal vising, utan krav om nettverk.

Ei øktinvitasjon (kort kode eller QR-lenkje) skal berre vere ein inngang til ei økt som brukaren allereie har rett til å delta i. Koden må vere kortliva, roterbar og aldri erstatte RLS-autorisasjon.

## Personvern

- `hr_enabled`: brukarens opt-in til pulsmåling.
- `hr_share_with_pt`: føretrekt standard, ikkje øktsamtykke.
- `hr_share_on_screen`: føretrekt standard, ikkje øktsamtykke.
- `hr_save_history`: føretrekt standard for lagring.
- Per-økt samtykke må registrerast før deling eller lagring.
- PT får berre sjå data i ei aktiv økt dei er autoriserte for.
- Storskjerm krev separat samtykke.
- Livekanalen blir lukka når økta blir avslutta.
- Historikk skal vere nedprøvd (til dømes eitt datapunkt kvart femte sekund), ikkje kvart hjarteslag.

## Nettlesarstøtte

Web Bluetooth er ein første MVP for HTTPS og kompatible Chromium-nettlesarar, særleg Chrome på Android. Safari på iOS støttar ikkje Web Bluetooth. Sensorgrensesnittet må difor vere isolert slik at ei framtidig native mobilapp eller ein Android-bridge kan levere dei same pulsverdiane utan å endre øktmotoren.

## Implementert i første inkrement

- BLE Heart Rate Service-tilkopling og fråkopling.
- Parsing av 8-bit og 16-bit Heart Rate Measurement.
- Lokal sensorstatus og aktuell BPM.
- Personlege HR-val i Mi side, lagra i `member_preferences`.
- Valfritt pulspanel i Treningsmodus når brukaren har aktivert puls og sensor er tilkopla.
- Parser-testar i STURMKOPF-verifikasjonen.

## Gjenstår før endeleg Live HR

1. Øktbasert deltaking og sikker PT-/kundeinvitasjon.
2. Private Realtime-kanalar med målretta RLS-policyar.
3. Kundetelefon → PT-nettbrett livevising.
4. Gruppetime- og partnarøktkopling.
5. Per-økt samtykke for PT, storskjerm og lagring.
6. Pulslogging og historikk.
7. Test av fleire samtidige belte på faktiske Android-einingar.
8. iPhone-støtte via native klient eller annan godkjend Bluetooth-bridge.

Ingen produksjonsdatabase eller produksjonsdeploy skal endrast utan eksplisitt GO LIVE.
