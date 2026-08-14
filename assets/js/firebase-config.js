/* ============================================================
   Firebase-opsætning til login + bogmærker
   ------------------------------------------------------------
   Udfyld værdierne nedenfor med dit EGET Firebase-projekt.
   Så længe apiKey/projectId står som "DIN_..." / "DIT-..."
   kører siden i ren læsetilstand UDEN login (fx offline-zip).

   Trin-for-trin står i  SETUP-LOGIN.md
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBNCN34zi99PNppcdQCUislZu7dEUJ4jOI",
  authDomain: "merete-erindringer.firebaseapp.com",
  projectId: "merete-erindringer",
  storageBucket: "merete-erindringer.firebasestorage.app",
  messagingSenderId: "542959564969",
  appId: "1:542959564969:web:5382796a298c48c73551b8"
  // storageBucket og messagingSenderId er valgfrie for login+Firestore
};

/* Kun disse konti får adgang. Tilføj/fjern frit — husk at rette
   den SAMME liste i firestore.rules, så serveren også håndhæver den. */
window.ACCESS_LIST = [
  "meretevagn@gmail.com",
  "larsmollerchristensen@gmail.com",
  "mettelemmingchristensen@gmail.com",
  "williamlemming07@gmail.com",
  "frederiklemming@gmail.com",
  "carllemming13@gmail.com"
];
