/* ============================================================
   Login (Google via Firebase) + bogmærke-backend (Firestore)
   Eksponerer window.MemoirBackend som app.js bruger.
   Er projektet ikke konfigureret (placeholder-nøgler) eller er
   Firebase ikke indlæst (offline), kører siden i læsetilstand
   uden login og uden bogmærker.
   ============================================================ */
(function () {
  'use strict';
  var cfg  = window.FIREBASE_CONFIG || {};
  var LIST = (window.ACCESS_LIST || []).map(function (e) { return String(e).toLowerCase().trim(); });

  var configured = !!cfg.apiKey && cfg.apiKey.indexOf('DIN_') !== 0 &&
                   !!cfg.projectId && cfg.projectId.indexOf('DIT-') !== 0;

  var backend = { configured: configured, available: false, allowed: false, user: null, _subs: [] };
  window.MemoirBackend = backend;
  backend.subscribe = function (fn) { backend._subs.push(fn); try { fn(backend); } catch (e) {} };
  function emit() { backend._subs.forEach(function (fn) { try { fn(backend); } catch (e) {} }); }

  if (!configured) return;                 // læsetilstand: intet login
  if (typeof firebase === 'undefined') {   // konfigureret, men SDK kunne ikke hentes
    buildGate(); setGate('error'); return;
  }

  firebase.initializeApp(cfg);
  var auth = firebase.auth();
  var db   = firebase.firestore();
  backend.available = true;

  buildGate(); setGate('loading');
  try { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) {}

  auth.getRedirectResult().catch(function () {});
  auth.onAuthStateChanged(function (user) {
    if (!user) {
      backend.user = null; backend.allowed = false;
      document.body.classList.remove('is-authed'); removeChip(); setGate('signin'); emit(); return;
    }
    var email = (user.email || '').toLowerCase();
    if (LIST.indexOf(email) < 0) {
      backend.user = null; backend.allowed = false;
      document.body.classList.remove('is-authed'); removeChip();
      setGate('denied', email); auth.signOut(); emit(); return;
    }
    backend.user = { uid: user.uid, email: email, name: user.displayName || email, photo: user.photoURL || '' };
    backend.allowed = true;
    document.body.classList.add('is-authed'); renderChip(); hideGate(); emit();
  });

  /* ---- bogmærke-API (ét dokument pr. bruger+bog+side) ---- */
  function ref(ctx) { return db.collection('bookmarks').doc(backend.user.uid + '__' + ctx.book + '__' + ctx.page); }
  backend.load = function (ctx) {
    if (!backend.allowed) return Promise.resolve(null);
    return ref(ctx).get().then(function (d) { return d.exists ? d.data() : null; });
  };
  backend.save = function (ctx, data) {
    if (!backend.allowed) return Promise.reject(new Error('ikke logget ind'));
    var payload = Object.assign({
      uid: backend.user.uid, email: backend.user.email, book: ctx.book, page: ctx.page,
      at: firebase.firestore.FieldValue.serverTimestamp(), atClient: Date.now()
    }, data);
    return ref(ctx).set(payload);
  };
  backend.remove = function (ctx) {
    if (!backend.allowed) return Promise.reject(new Error('ikke logget ind'));
    return ref(ctx).delete();
  };
  backend.listAll = function () {
    if (!backend.allowed) return Promise.resolve([]);
    return db.collection('bookmarks').where('uid', '==', backend.user.uid).get()
      .then(function (qs) { var out = []; qs.forEach(function (d) { out.push(d.data()); }); return out; })
      .catch(function () { return []; });
  };

  function signIn() {
    var p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithPopup(p).catch(function (err) {
      if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request' || err.code === 'auth/operation-not-supported-in-this-environment')) {
        auth.signInWithRedirect(p);
      } else { setGate('signin', null, err && err.message); }
    });
  }
  backend.signOut = function () { auth.signOut(); };

  /* ---- login-skærm ---- */
  var gate;
  function buildGate() {
    if (gate) return;
    gate = document.createElement('div');
    gate.className = 'authgate'; gate.id = 'authgate';
    gate.innerHTML =
      '<div class="authgate__card">' +
        '<p class="authgate__eyebrow">Meretes Erindringer</p>' +
        '<h1 class="authgate__title">En privat udgivelse</h1>' +
        '<p class="authgate__lead" id="authgateLead">Log ind for at læse videre.</p>' +
        '<button class="gbtn" id="authgateBtn"><span class="gbtn__g">G</span> Log ind med Google</button>' +
        '<p class="authgate__note" id="authgateNote"></p>' +
      '</div>';
    document.body.appendChild(gate);
    gate.querySelector('#authgateBtn').addEventListener('click', signIn);
  }
  function setGate(mode, email, extra) {
    if (!gate) buildGate();
    var lead = gate.querySelector('#authgateLead');
    var btn  = gate.querySelector('#authgateBtn');
    var note = gate.querySelector('#authgateNote');
    gate.classList.add('open'); document.body.classList.add('gate-open');
    btn.style.display = 'inline-flex'; note.textContent = '';
    if (mode === 'loading') { lead.textContent = 'Et øjeblik …'; btn.style.display = 'none'; }
    else if (mode === 'signin') { lead.textContent = 'Log ind for at læse videre.'; if (extra) note.textContent = extra; }
    else if (mode === 'denied') { lead.textContent = 'Kontoen ' + (email || '') + ' har ikke adgang.'; btn.textContent = 'Prøv en anden konto'; }
    else if (mode === 'error') { lead.textContent = 'Kunne ikke indlæse login. Er du online?'; btn.style.display = 'none'; }
  }
  function hideGate() { if (gate) { gate.classList.remove('open'); document.body.classList.remove('gate-open'); } }

  /* ---- bruger-chip i topbaren ---- */
  function renderChip() {
    removeChip();
    var bar = document.querySelector('.topbar .bar'); if (!bar) return;
    var chip = document.createElement('div'); chip.className = 'authchip'; chip.id = 'authChip';
    var who = backend.user.name || backend.user.email;
    var initial = (who || '?').trim().charAt(0).toUpperCase();
    chip.innerHTML =
      (backend.user.photo ? '<img class="authchip__av" src="' + backend.user.photo + '" alt="">' :
                            '<span class="authchip__av authchip__av--txt">' + initial + '</span>') +
      '<span class="authchip__who">' + backend.user.email + '</span>' +
      '<button class="authchip__out" title="Log ud">Log ud</button>';
    chip.querySelector('.authchip__out').addEventListener('click', backend.signOut);
    bar.appendChild(chip);
  }
  function removeChip() { var c = document.getElementById('authChip'); if (c) c.remove(); }
})();
