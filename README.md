MERETES ERINDRINGER — interaktiv udgave
========================================

SÅDAN ÅBNER DU SIDEN
--------------------
Pak mappen ud, og dobbeltklik på "index.html".
Den åbner i din browser (Chrome, Edge, Safari, Firefox) — helt uden internet.
Alt (tekst, billeder og skrifter) ligger i mappen og virker offline.


HVAD KAN SIDEN
--------------
• Bogen er delt op i selvstændige sider — én pr. del. Bog 1 har to dele:
  "Barndommen" og "Ungdommen". Forsiden med forord er den første side.
• Nederst på hver side er der knapper til forrige/næste del, så du kan
  bladre fremad som i en bog.
• Indholdsfortegnelse i venstre side — klik på en del eller et kapitel for
  at hoppe direkte derhen (også selvom det ligger på en anden side).
  Den følger med, mens du læser (det aktive kapitel fremhæves).
• Klik på et billede for at se det stort. Brug piletasterne ← → til at
  bladre, og Esc for at lukke.
• A− / A+ justerer skriftstørrelsen. Valget huskes.
• Læselinjen øverst viser, hvor langt du er nået på siden.
• På telefon og tablet åbnes menuen med ☰. Der finder du både bogvalg,
  skriftstørrelse og indholdsfortegnelsen samlet ét sted.
• Vil du printe eller gemme som PDF? Brug browserens “Udskriv” —
  siden er sat op til at printe pænt.


LOGIN OG LÆSEMARKERING (kræver opsætning)
-----------------------------------------
Siden kan lukkes med Google-login, så kun en fast liste af konti får
adgang, og hver bruger kan sætte ÉN læsemarkering med dato pr. del
(to i alt for Bog 1). Markeringen hører til kontoen og følger den på
tværs af enheder.

Dette er slået fra som standard (så mappen kan åbnes offline). For at
tænde det skal du oprette et gratis Firebase-projekt og udfylde nøglerne
— den fulde trin-for-trin-guide ligger i  SETUP-LOGIN.md.

Bemærk: På GitHub Pages er selve tekst-filerne offentlige, så login-
skærmen er en "blød" spærre for teksten (markeringerne er derimod ægte
beskyttet). Vil du låse teksten helt, beskriver SETUP-LOGIN.md hvordan
Cloudflare Access kan sættes foran siden.


SÅDAN LÆGGER DU DEN PÅ NETTET (valgfrit)
----------------------------------------
Mappen er en helt almindelig statisk hjemmeside. Du kan uploade hele
mappen til f.eks. GitHub Pages, Netlify, eller et almindeligt webhotel.
Der skal ikke installeres noget.


BOG 2 ER NU MED · SÅDAN TILFØJES BOG 3 SENERE
---------------------------------------------
Bog 2 ("Meretes videre erindringer", 1973–1998) er nu aktiv. Den har tre
dele — 1970’erne, 1980’erne og 1990’erne — og alle bogens 272 fotos.
Fanen "Bog 3" står stadig og venter.

Bog 2's billeder ligger i deres egen mappe:  assets/images-bog2/
(Bog 1's ligger fortsat i assets/images/). De blandes altså ikke sammen.

Bemærk: Bog 2's fysiske forside var en collage af 13 portrætter. De
enkelte portrætter findes ikke som separate filer i PDF'en, så Bog 2
har ikke en portrætvæg på forsiden som Bog 1. Har du portrætterne som
løse billeder, kan de nemt lægges ind (der er en billedtekst-liste til
alle 13 i bogen).

Når Bog 3 er klar, gøres to ting (samme fremgangsmåde som Bog 2):

1) Læg datafilen  assets/data/book3.js  (samme opbygning:
   window.BOOKS['3'] = { ... }) og billederne i en ny mappe.

2) Tilføj én linje i index.html ved de andre <script>-linjer nederst:

       <script src="assets/data/book2.js"></script>
       <script src="assets/data/book3.js"></script>   <-- ny linje
       <script src="assets/js/app.js"></script>

   Så aktiverer fanen "Bog 3" sig selv.

Om "dele": hver del er simpelthen én sektion i datafilen (nøglen
"sections"). Siden laver automatisk én side pr. sektion.
  • Bog 3 → 3 dele: (1) frem til USA-turen med Anna-Lise og Tage i 2004,
    (2) derfra frem til "Sådan fejrer vi jul", (3) resten.
Bog 3 har desuden nogle ekstra billeder, der lægges ind samme sted.


MAPPENS INDHOLD
---------------
  index.html            selve siden
  assets/css/           udseende (farver, skrifter, opsætning)
  assets/js/            funktionalitet (søgning, billedvisning m.m.)
  assets/data/          bøgernes indhold (tekst + billedhenvisninger)
  assets/fonts/         skrifttyper (så siden ser ens ud alle steder)
  assets/images/        alle fotos fra bogen
  assets/cover/         portrætterne på forsiden


En lille note om billedtekster
-------------------------------
Billedteksterne er hentet automatisk fra den oprindelige PDF. De sidder
rigtigt de allerfleste steder, men ved enkelte opslag med flere fotos tæt
på hinanden kan en tekst være havnet ved det forkerte billede. Sig til,
så retter jeg de konkrete steder til.
