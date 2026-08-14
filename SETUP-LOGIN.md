OPSÆTNING AF LOGIN + BOGMÆRKER
==============================

Login (Google) og bogmærker kræver et gratis Firebase-projekt. Det tager
ca. 10-15 min. og skal kun gøres én gang. Herefter virker det automatisk
på den udgave, der ligger på GitHub Pages.

Så længe du IKKE har udfyldt nøglerne, kører siden helt som før — bare
uden login og uden bogmærker (fx hvis man åbner mappen offline).


DEL A · Opret Firebase-projekt
------------------------------
1. Gå til https://console.firebase.google.com og log ind med Google.
2. "Add project" → giv det et navn (fx "meretes-erindringer") → opret.
   (Google Analytics kan du roligt slå fra.)


DEL B · Tilføj en web-app og hent nøglerne
-------------------------------------------
3. På projektets forside: klik web-ikonet  </>  ("Add app").
4. Giv app'en et kaldenavn → "Register app".
5. Du får nu vist et "firebaseConfig"-objekt med apiKey, authDomain,
   projectId, appId osv. Lad siden stå — vi bruger værdierne i DEL E.


DEL C · Slå Google-login til
----------------------------
6. Menu til venstre: Build → Authentication → "Get started".
7. Fanen "Sign-in method" → vælg "Google" → slå til (Enable) → Save.
8. Stadig i Authentication → Settings → "Authorized domains":
   tilføj dit GitHub Pages-domæne, fx:
        ditbrugernavn.github.io
   (localhost ligger der allerede, så du kan teste lokalt.)


DEL D · Opret database og indsæt reglerne
------------------------------------------
9.  Menu: Build → Firestore Database → "Create database".
    Vælg en placering i Europa (fx eur3) → start i "production mode".
10. Fanen "Rules" → slet indholdet og indsæt HELE indholdet fra filen
        firestore.rules
    (ligger i denne mappe) → "Publish".
    Reglerne håndhæver e-mail-listen på serveren, så kun de seks konti
    kan læse/skrive bogmærker.


DEL E · Sæt nøglerne ind i siden
--------------------------------
11. Åbn filen  assets/js/firebase-config.js  i en teksteditor.
12. Erstat placeholder-værdierne med dine egne fra DEL B:
        apiKey, authDomain, projectId, appId
13. ACCESS_LIST i samme fil indeholder allerede de seks e-mails.
    Vil du tilføje/fjerne nogen, så ret BEGGE steder:
        - assets/js/firebase-config.js  (styrer hvem UI'et lukker ind)
        - firestore.rules i Firebase     (styrer hvem serveren lukker ind)


DEL F · Læg det på GitHub
-------------------------
14. Commit og push hele mappen til dit GitHub-repo.
15. Repo → Settings → Pages → vælg branch (fx main) → Save.
16. Åbn din side på  https://ditbrugernavn.github.io/dit-repo/
    Nu møder man login-skærmen, og kun de seks konti kommer ind.


SÅDAN VIRKER BOGMÆRKET
----------------------
• Log ind → på en delside (Barndommen / Ungdommen) dukker knappen
  "Sæt markering her" op nederst til venstre.
• Den sætter en markering ved det afsnit, du er nået til, med dags dato.
• Der kan kun være ÉN markering pr. side (to i alt for Bog 1). En ny
  markering flytter bare den gamle. Krydset ✕ fjerner den.
• Markeringen hører til din konto og følger dig på tværs af enheder.


VIGTIGT OM PRIVATLIV (læs denne)
--------------------------------
GitHub Pages udstiller filerne offentligt. Login-skærmen skjuler
brugerfladen, men en teknisk person, der kender adressen, kan i princippet
hente selve tekst-filerne udenom login. BOGMÆRKERNE er derimod ægte
beskyttet af server-reglerne.

Skal selve teksten være helt utilgængelig for udenforstående, kan vi lægge
"Cloudflare Access" foran siden (gratis) — det spærrer ALLE filer på din
e-mail-liste, uden kodeændringer. Det kræver, at siden får et domæne via
Cloudflare. Sig til, hvis du vil have den ekstra sikring.
