/*!
 * DJ LK — Bandeau de consentement (cookies / stockage local / services tiers)
 * Fichier autonome : aucune dépendance, le CSS est injecté par le script.
 *
 * Catégories :
 *   - necessaire : toujours actif (mémoriser ce choix)
 *   - fonts      : polices Google Fonts (Syne, Inter) — chargées seulement si accepté
 *   - chat       : assistant IA (les messages partent vers Groq) — utilisable seulement si accepté
 *
 * API publique :
 *   DJLKConsent.has('chat')            → true / false
 *   DJLKConsent.set({ chat: true })    → enregistre un choix
 *   DJLKConsent.open()                 → ouvre le panneau de préférences
 *   document.addEventListener('djlk:consent', e => e.detail)  → { fonts, chat }
 */
(function () {
  'use strict';

  var KEY = 'djlk_consent';
  var VERSION = 1;                                  // incrémente pour redemander le consentement à tous
  var MAX_AGE = 365 * 24 * 60 * 60 * 1000;          // 12 mois
  var POLICY_URL = 'confidentialite.html';
  var FONTS_URL = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap';

  var state = null;          // choix enregistré (ou null si aucun)
  var banner, overlay, panel, lastFocus = null;

  /* ---------- stockage du choix ---------- */
  function read() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.v === VERSION && typeof d.ts === 'number' && Date.now() - d.ts < MAX_AGE) return d;
    } catch (e) {}
    return null;
  }
  function write(c) {
    var d = { v: VERSION, ts: Date.now(), fonts: !!c.fonts, chat: !!c.chat };
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    return d;
  }

  /* ---------- application des choix ---------- */
  function loadFonts() {
    if (document.getElementById('ck-fonts')) return;
    var l = document.createElement('link');
    l.id = 'ck-fonts';
    l.rel = 'stylesheet';
    l.href = FONTS_URL;
    document.head.appendChild(l);
  }
  function apply() {
    if (state && state.fonts) loadFonts();
    document.dispatchEvent(new CustomEvent('djlk:consent', { detail: { fonts: !!(state && state.fonts), chat: !!(state && state.chat) } }));
  }
  function commit(c) {
    var prev = state || { fonts: false, chat: false };
    var fontsWereLoaded = !!document.getElementById('ck-fonts');
    state = write(c);
    hideBanner();
    closePanel(true);
    // Retrait d'un accord pour les polices déjà chargées : on recharge pour repartir proprement.
    if (fontsWereLoaded && prev.fonts && !state.fonts) { location.reload(); return; }
    apply();
  }

  /* ---------- interface ---------- */
  var CSS = [
    '.ck-banner,.ck-overlay{font-family:var(--font-body,"Inter","Segoe UI",system-ui,sans-serif);color:#f4f2ff;line-height:1.5;-webkit-font-smoothing:antialiased}',
    '.ck-banner *,.ck-overlay *{box-sizing:border-box}',
    '.ck-banner[hidden],.ck-overlay[hidden]{display:none!important}',

    '.ck-banner{position:fixed;z-index:10000;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));max-width:760px;margin:0 auto;background:#0a0a0a;border:1px solid rgba(255,255,255,.22);border-radius:6px;padding:1.2rem 1.3rem;box-shadow:0 20px 60px rgba(0,0,0,.65)}',
    '.ck-title{font:700 1.05rem/1.3 var(--font-head,"Syne","Segoe UI",sans-serif);margin:0 0 .4rem}',
    '.ck-text{margin:0;color:#bbb8cc;font-size:.92rem;max-width:64ch}',
    '.ck-text a{color:#f4f2ff;text-decoration:underline;text-underline-offset:3px}',
    '.ck-actions{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;margin-top:1rem}',

    '.ck-btn{appearance:none;cursor:pointer;font-family:inherit;font-weight:600;font-size:.9rem;line-height:1;color:#f4f2ff;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.35);border-radius:6px;padding:.8rem 1.25rem;min-height:44px;transition:background .2s,border-color .2s}',
    '.ck-btn:hover{background:rgba(255,255,255,.14);border-color:#f4f2ff}',
    '.ck-btn.ck-primary{background:#f5f5f5;border-color:transparent;color:#0a0a0a}',
    '.ck-btn.ck-primary:hover{filter:brightness(1.1)}',
    '.ck-link{appearance:none;background:none;border:0;cursor:pointer;font-family:inherit;font-weight:500;font-size:.9rem;line-height:1;color:#bbb8cc;text-decoration:underline;text-underline-offset:3px;padding:.8rem .5rem;min-height:44px}',
    '.ck-link:hover{color:#f4f2ff}',
    '.ck-banner :focus-visible,.ck-overlay :focus-visible{outline:3px solid #fff;outline-offset:3px}',

    '.ck-overlay{position:fixed;inset:0;z-index:10001;background:rgba(7,6,12,.78);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px}',
    '.ck-panel{width:100%;max-width:620px;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow-y:auto;background:#0a0a0a;border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:1.5rem;box-shadow:0 20px 60px rgba(0,0,0,.65)}',
    '.ck-panel h2{font:800 1.3rem/1.2 var(--font-head,"Syne","Segoe UI",sans-serif);margin:0 0 .5rem}',
    '.ck-panel > p{margin:0 0 1.1rem;color:#bbb8cc;font-size:.92rem}',
    '.ck-panel > p a{color:#f4f2ff;text-decoration:underline;text-underline-offset:3px}',

    '.ck-cat{display:flex;gap:1rem;align-items:flex-start;justify-content:space-between;padding:1rem;margin:.6rem 0;border:1px solid rgba(255,255,255,.10);border-radius:6px;background:rgba(255,255,255,.045)}',
    '.ck-cat h3{font:700 .98rem/1.3 var(--font-head,"Syne","Segoe UI",sans-serif);margin:0 0 .3rem}',
    '.ck-cat p{margin:0;color:#bbb8cc;font-size:.86rem}',
    '.ck-always{flex-shrink:0;font-size:.8rem;color:#bbb8cc;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:.3rem .7rem;white-space:nowrap}',

    '.ck-switch{position:relative;flex-shrink:0;width:52px;height:30px;display:inline-block}',
    '.ck-switch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:1}',
    '.ck-slider{position:absolute;inset:0;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);transition:background .2s}',
    '.ck-slider::before{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#f4f2ff;transition:transform .2s}',
    '.ck-switch input:checked + .ck-slider{background:#f5f5f5;border-color:transparent}',
    '.ck-switch input:checked + .ck-slider::before{transform:translateX(22px);background:#0a0a0a}',
    '.ck-switch input:focus-visible + .ck-slider{outline:3px solid #fff;outline-offset:3px}',

    '.ck-panel .ck-actions{margin-top:1.3rem}',
    '@media(max-width:560px){.ck-banner{left:10px;right:10px}.ck-actions .ck-btn{flex:1 1 calc(50% - .3rem)}.ck-actions .ck-link{flex:1 1 100%;text-align:center}}',
    '@media(prefers-reduced-motion:reduce){.ck-slider,.ck-slider::before,.ck-btn{transition:none}}'
  ].join('\n');

  function build() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    banner = document.createElement('div');
    banner.className = 'ck-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Choix concernant les cookies');
    banner.hidden = true;
    banner.innerHTML =
      '<p class="ck-title">Votre vie privée</p>' +
      '<p class="ck-text">Ce site fonctionne sans cookie publicitaire ni outil de suivi. Avec votre accord, il peut aussi charger les polices Google (l’apparence du site) et activer l’assistant IA, qui envoie vos messages à un prestataire externe. ' +
      'Détails dans la <a href="' + POLICY_URL + '">politique de confidentialité</a>.</p>' +
      '<div class="ck-actions">' +
      '<button type="button" class="ck-btn" data-ck="reject">Tout refuser</button>' +
      '<button type="button" class="ck-btn" data-ck="accept">Tout accepter</button>' +
      '<button type="button" class="ck-link" data-ck="custom">Personnaliser</button>' +
      '</div>';
    document.body.appendChild(banner);

    overlay = document.createElement('div');
    overlay.className = 'ck-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="ck-panel" role="dialog" aria-modal="true" aria-labelledby="ck-h" tabindex="-1">' +
      '<h2 id="ck-h">Préférences de confidentialité</h2>' +
      '<p>Choisissez ce que ce site a le droit d’utiliser. Vous pouvez changer d’avis à tout moment via « Gérer les cookies » en bas de page. Voir la <a href="' + POLICY_URL + '">politique de confidentialité</a>.</p>' +

      '<div class="ck-cat"><div><h3>Nécessaire</h3><p>Fait fonctionner le site et mémorise vos choix ici (stockage local du navigateur, 12 mois). Le formulaire de réservation n’envoie rien tant que vous ne cliquez pas sur « Envoyer ».</p></div><span class="ck-always">Toujours actif</span></div>' +

      '<div class="ck-cat"><div><h3 id="ck-t-fonts">Polices Google</h3><p>Syne et Inter. Les charger depuis Google transmet votre adresse IP à Google (États-Unis). Refusé : le site utilise les polices de votre appareil.</p></div>' +
      '<label class="ck-switch"><input type="checkbox" role="switch" data-ck-cat="fonts" aria-labelledby="ck-t-fonts"><span class="ck-slider" aria-hidden="true"></span></label></div>' +

      '<div class="ck-cat"><div><h3 id="ck-t-chat">Assistant IA</h3><p>Vos messages sont envoyés à notre serveur puis à Groq (États-Unis) pour générer la réponse. N’y écrivez pas de données sensibles. Refusé : l’assistant reste désactivé.</p></div>' +
      '<label class="ck-switch"><input type="checkbox" role="switch" data-ck-cat="chat" aria-labelledby="ck-t-chat"><span class="ck-slider" aria-hidden="true"></span></label></div>' +

      '<div class="ck-actions">' +
      '<button type="button" class="ck-btn ck-primary" data-ck="save">Enregistrer mes choix</button>' +
      '<button type="button" class="ck-btn" data-ck="accept">Tout accepter</button>' +
      '<button type="button" class="ck-btn" data-ck="reject">Tout refuser</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    panel = overlay.firstChild;

    document.addEventListener('click', onClick);
    overlay.addEventListener('keydown', onPanelKey);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closePanel(); });
  }

  function onClick(e) {
    var t = e.target.closest ? e.target.closest('[data-ck],[data-cookie-settings]') : null;
    if (!t) return;
    if (t.hasAttribute('data-cookie-settings')) { e.preventDefault(); openPanel(); return; }
    var a = t.getAttribute('data-ck');
    if (a === 'accept') commit({ fonts: true, chat: true });
    else if (a === 'reject') commit({ fonts: false, chat: false });
    else if (a === 'custom') openPanel();
    else if (a === 'save') {
      var c = {};
      overlay.querySelectorAll('[data-ck-cat]').forEach(function (i) { c[i.getAttribute('data-ck-cat')] = i.checked; });
      commit(c);
    }
  }

  function showBanner() { banner.hidden = false; }
  function hideBanner() { if (banner) banner.hidden = true; }

  function openPanel() {
    lastFocus = document.activeElement;
    overlay.querySelectorAll('[data-ck-cat]').forEach(function (i) {
      i.checked = !!(state && state[i.getAttribute('data-ck-cat')]);
    });
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    panel.focus();
  }
  function closePanel(skipFocus) {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (!skipFocus && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onPanelKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closePanel(); return; }
    if (e.key !== 'Tab') return;
    var f = panel.querySelectorAll('a[href],button,input');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- API publique ---------- */
  window.DJLKConsent = {
    has: function (cat) { return !!(state && state[cat]); },
    get: function () { return state ? { fonts: !!state.fonts, chat: !!state.chat } : null; },
    set: function (partial) { commit(Object.assign({ fonts: false, chat: false }, state || {}, partial)); },
    open: openPanel
  };

  /* ---------- démarrage ---------- */
  function init() {
    build();
    state = read();
    if (state) apply(); else showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
