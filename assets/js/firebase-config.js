/* ============================================================
   Firebase-opsætning til login + bogmærker
   ------------------------------------------------------------
   Udfyld værdierne nedenfor med dit EGET Firebase-projekt.
   Så længe apiKey/projectId står som "DIN_..." / "DIT-..."
   kører siden i ren læsetilstand UDEN login (fx offline-zip).

   Trin-for-trin står i  SETUP-LOGIN.md
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey:            "DIN_API_KEY",
  authDomain:        "DIT-PROJEKT.firebaseapp.com",
  projectId:         "DIT-PROJEKT-ID",
  appId:             "DIT_APP_ID"
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
