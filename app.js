import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===== Configuration Firebase ===== */
const firebaseConfig = {
  apiKey: "AIzaSyDzaU3uCrefnH80Z2ciCQR5bYGf-YG9Y3A",
  authDomain: "bellamarket-gestion.firebaseapp.com",
  projectId: "bellamarket-gestion",
  storageBucket: "bellamarket-gestion.firebasestorage.app",
  messagingSenderId: "1063061839287",
  appId: "1:1063061839287:web:7089b6056fb08f01f79c32"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===== Utilitaires ===== */
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fcfa = n => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)).replace(/[\u202f\u00a0]/g, ' ') + ' FCFA';
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());
const toMin = h => { const [a, b] = String(h || '0:0').split(':').map(Number); return (a || 0) * 60 + (b || 0); };
const toHM = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const dateLongue = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dateCourte = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const waLink = (tel, txt = '') => { let t = String(tel || '').replace(/\D/g, ''); if (t.length === 9) t = '237' + t; return `https://wa.me/${t}${txt ? '?text=' + encodeURIComponent(txt) : ''}`; };
const somme = (arr, f) => arr.reduce((s, x) => s + (+f(x) || 0), 0);
const fmtCourt = n => n >= 1000 ? (Math.round(n / 100) / 10) + 'k' : String(Math.round(n));
const STATUTS = { confirme: 'Confirmé', termine: 'Terminé', annule: 'Annulé' };
const MODES = ['Espèces', 'Orange Money', 'MTN MoMo', 'Autre'];
const DUREES = [30, 40, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360];
const CATEGORIES = ['Coiffure', 'Onglerie', 'Extensions cils', 'Autre'];
const fmtDuree = m => { m = +m || 0; if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`; };
const optsDuree = v => { v = +v || 60; const l = DUREES.includes(v) ? DUREES : [...DUREES, v].sort((a, b) => a - b); return l.map(d => `<option value="${d}" ${d === v ? 'selected' : ''}>${fmtDuree(d)}</option>`).join(''); };
// Prestations du flyer : prix ESTIMATIFS (FCFA) et durées, à ajuster dans « Services & tarifs »
const CATALOGUE = [
  ['Onglerie', 'Vernis gel & sur ongle', 5000, 60], ['Onglerie', 'Gainage', 8000, 90], ['Onglerie', 'Construction polygel', 15000, 120], ['Onglerie', 'Pédicure / Manucure', 10000, 90],
  ['Coiffure', 'Mini coupe sur cheveux', 3000, 30], ['Coiffure', 'Traitement cheveux nappy et défrisés', 10000, 90], ['Coiffure', 'Silk presse (lissage cheveux nappy)', 8000, 90],
  ['Coiffure', 'Box braids', 15000, 300], ['Coiffure', 'Brazilian wool', 12000, 240], ['Coiffure', 'French curls', 15000, 240], ['Coiffure', 'Marley', 12000, 240],
  ['Coiffure', 'Pose tissage', 10000, 120], ['Coiffure', 'Koroba', 5000, 90], ['Coiffure', 'Tresses & Twists', 8000, 180], ['Coiffure', 'Pomytail', 8000, 90],
  ['Coiffure', 'Soins coupes', 6000, 60], ['Coiffure', 'Chignon', 10000, 90], ['Coiffure', 'Twists', 10000, 180], ['Coiffure', 'Finger coils', 8000, 120],
  ['Coiffure', 'Vanilles', 8000, 120], ['Coiffure', 'Locs', 20000, 360], ['Coiffure', 'Nattes', 5000, 90], ['Coiffure', 'Tissage / greffage', 15000, 180],
  ['Coiffure', 'Coiffure mariées', 30000, 240], ['Coiffure', 'Brushing + lissage', 5000, 60],
  ['Extensions cils', 'Pose naturelle', 10000, 90], ['Extensions cils', 'Pose volumineuse', 15000, 120], ['Extensions cils', 'Retouche', 7000, 60]
];

/* ===== État ===== */
const DEFAUTS = { nomSalon: 'Bella Market', emailNotif: 'enkydesign@gmail.com', whatsapp: '659494908', ouverture: '08:00', fermeture: '19:00', rappelMin: 15 };
const S = {
  user: null, vue: 'accueil', agDate: today(), caDate: today(), statPeriode: '30',
  clients: [], services: [], rdv: [], paiements: [], demandes: [], reglages: { ...DEFAUTS }
};
let unsubs = [];
let publicsSync = false, creneauxSync = false;

/* ===== Icônes et navigation ===== */
const ICON = {
  accueil: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  clientes: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  services: '<path d="M6 3l12 12M18 3L6 15"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>',
  caisse: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  stats: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  demandes: '<path d="M4 4h16v12H8l-4 4z"/>',
  reglages: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  plus: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
};
const ico = n => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
const LIBELLES = { accueil: 'Accueil', agenda: 'Agenda', clientes: 'Clientes', services: 'Services & tarifs', caisse: 'Caisse', stats: 'Statistiques', demandes: 'Demandes', reglages: 'Réglages' };

function navigation() {
  const nouv = S.demandes.filter(d => d.statut === 'nouvelle').length;
  const item = (v, court) => `<button class="nav-i ${S.vue === v ? 'actif' : ''}" data-act="vue" data-vue="${v}" ${S.vue === v ? 'aria-current="page"' : ''}>${ico(v)}<span>${court || LIBELLES[v]}</span>${v === 'demandes' && nouv ? `<span class="badge">${nouv}</span>` : ''}</button>`;
  $('#navLat').innerHTML = Object.keys(LIBELLES).map(v => item(v)).join('');
  const plusActif = ['services', 'stats', 'demandes', 'reglages'].includes(S.vue);
  $('#navBas').innerHTML = ['accueil', 'agenda', 'clientes', 'caisse'].map(v => item(v)).join('') +
    `<button class="nav-i ${plusActif ? 'actif' : ''}" data-act="plus">${ico('plus')}<span>Plus</span>${nouv ? `<span class="badge">${nouv}</span>` : ''}</button>`;
}

/* ===== Messages, fenêtres ===== */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
function erreur(err) {
  console.error(err);
  const c = err && err.code ? err.code : '';
  if (c === 'permission-denied') toast('Accès refusé : vérifiez la connexion et les règles de sécurité.');
  else toast('Une erreur est survenue. Réessayez.');
}
function ouvrir(html) {
  const m = $('#modal');
  m.innerHTML = `<div class="fond" data-act="fermer"></div><div class="feuille" role="dialog" aria-modal="true">${html}</div>`;
  m.classList.add('on');
}
function fermer() { const m = $('#modal'); m.classList.remove('on'); m.innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#feuille')) fermerFeuille(); else fermer(); } });


/* ===== Sélecteurs personnalisés (aux couleurs du salon) ===== */
const PICK = {};
let feuilleRetour = null;
const itemsDuree = v => { v = +v || 60; return (DUREES.includes(v) ? DUREES : [...DUREES, v].sort((a, b) => a - b)).map(d => ({ v: d, t: fmtDuree(d) })); };
function ouvrirFeuille(titre, html) {
  fermerFeuille(true);
  const o = document.createElement('div'); o.id = 'feuille'; o.className = 'fe';
  o.innerHTML = `<div class="fe-fond" data-fermer></div><div class="fe-panneau" role="dialog" aria-modal="true" aria-label="${esc(titre)}"><div class="fe-tete"><h2>${esc(titre)}</h2><button type="button" class="fe-x" data-fermer aria-label="Fermer">×</button></div><div class="fe-corps">${html}</div></div>`;
  feuilleRetour = document.activeElement;
  document.body.appendChild(o);
  o.addEventListener('click', e => { if (e.target.closest('[data-fermer]')) fermerFeuille(); });
  const f = o.querySelector('.on, .fe-ligne, .heure-b, .cal-j:not([disabled])'); if (f) f.focus({ preventScroll: true });
  const on = o.querySelector('.on'); if (on) on.scrollIntoView({ block: 'center' });
  return o;
}
function fermerFeuille(sansRetour) {
  const o = $('#feuille'); if (!o) return;
  o.remove();
  if (!sansRetour && feuilleRetour && feuilleRetour.focus && document.contains(feuilleRetour)) feuilleRetour.focus({ preventScroll: true });
}
function setPick(id, v) {
  const inp = $('#' + id), btn = $('#' + id + 'Btn'), p = PICK[id]; if (!inp || !p) return;
  v = String(v ?? ''); inp.value = v;
  let txt, vide = !v;
  if (p.type === 'date') txt = v ? dateLongue(v) : 'Choisir une date';
  else if (p.type === 'heure') txt = v || 'Choisir une heure';
  else {
    let it = p.items.find(i => String(i.v) === v);
    if (!it && v && p.dyn) { it = { v, t: p.dyn(v) }; p.items.push(it); }
    txt = it ? it.t : p.vide; vide = !it;
  }
  if (btn) { btn.textContent = txt; btn.classList.toggle('vide', vide); }
}
function choisir(id, v) { setPick(id, v); $('#' + id).dispatchEvent(new Event('change', { bubbles: true })); }
function selecteur(id, items, valeur, o = {}) {
  PICK[id] = { type: 'select', titre: o.titre || 'Choisir', items, vide: o.vide || 'Choisir', dyn: o.dyn };
  const it = items.find(i => String(i.v) === String(valeur ?? ''));
  return `<input type="hidden" id="${id}" value="${esc(valeur ?? '')}"><button type="button" class="faux ${it ? '' : 'vide'}" id="${id}Btn" data-act="pick" data-id="${id}" aria-haspopup="dialog">${esc(it ? it.t : (o.vide || 'Choisir'))}</button>`;
}
function dateur(id, valeur, o = {}) {
  PICK[id] = { type: 'date', titre: o.titre || 'Choisir la date', marques: o.marques || '' };
  return `<input type="hidden" id="${id}" value="${esc(valeur || '')}" ${o.attrs || ''}><button type="button" class="faux ${valeur ? '' : 'vide'}" id="${id}Btn" data-act="pickDate" data-id="${id}" aria-haspopup="dialog">${esc(valeur ? dateLongue(valeur) : 'Choisir une date')}</button>`;
}
function heureur(id, valeur, o = {}) {
  PICK[id] = { type: 'heure', titre: o.titre || "Choisir l'heure", ctx: o.ctx || 'libre' };
  return `<input type="hidden" id="${id}" value="${esc(valeur || '')}"><button type="button" class="faux ${valeur ? '' : 'vide'}" id="${id}Btn" data-act="pickHeure" data-id="${id}" aria-haspopup="dialog">${esc(valeur || 'Choisir une heure')}</button>`;
}
function ouvrirListe(titre, items, courant, onPick) {
  let corps = items.length > 8 ? '<input type="search" class="fe-recherche" placeholder="Rechercher" aria-label="Rechercher">' : '', groupe = null;
  items.forEach((it, i) => {
    if (it.groupe && it.groupe !== groupe) { groupe = it.groupe; corps += `<h3 class="fe-groupe" data-g>${esc(groupe)}</h3>`; }
    corps += `<button type="button" class="fe-ligne ${String(it.v) === String(courant) ? 'on' : ''}" data-i="${i}" data-t="${esc((it.t + ' ' + (it.sous || '')).toLowerCase())}"><span>${esc(it.t)}</span>${it.sous ? `<small>${esc(it.sous)}</small>` : ''}</button>`;
  });
  const o = ouvrirFeuille(titre, corps);
  o.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; fermerFeuille(); onPick(items[+b.dataset.i]); });
  const r = o.querySelector('.fe-recherche');
  if (r) r.addEventListener('input', () => {
    const q = r.value.trim().toLowerCase();
    o.querySelectorAll('.fe-ligne').forEach(l => { l.style.display = !q || l.dataset.t.includes(q) ? '' : 'none'; });
    o.querySelectorAll('[data-g]').forEach(g => { let n = g.nextElementSibling, vis = false; while (n && !n.hasAttribute('data-g')) { if (n.classList.contains('fe-ligne') && n.style.display !== 'none') vis = true; n = n.nextElementSibling; } g.style.display = vis ? '' : 'none'; });
  });
  return o;
}
function ouvrirSelecteur(id) { const p = PICK[id]; ouvrirListe(p.titre, p.items, $('#' + id).value, it => choisir(id, it.v)); }
function ouvrirDate(id) {
  const p = PICK[id], courant = $('#' + id).value, base = courant ? new Date(courant + 'T12:00:00') : new Date();
  let an = base.getFullYear(), mo = base.getMonth();
  const ajd = today();
  const marques = p.marques === 'rdv' ? new Set(S.rdv.filter(r => r.statut !== 'annule').map(r => r.date)) : p.marques === 'paiements' ? new Set(S.paiements.map(x => x.date)) : new Set();
  const legende = p.marques === 'rdv' ? 'Les points indiquent les jours avec des rendez-vous.' : p.marques === 'paiements' ? 'Les points indiquent les jours avec des encaissements.' : '';
  ouvrirFeuille(p.titre, `<div id="cal"></div>${legende ? `<p class="note-fe">${legende}</p>` : ''}<button type="button" class="btn sec petit" data-auj>Aujourd'hui</button>`);
  const dessiner = () => {
    const premier = new Date(an, mo, 1), nb = new Date(an, mo + 1, 0).getDate(), decal = (premier.getDay() + 6) % 7;
    let h = `<div class="cal-tete"><button type="button" class="cal-nav" data-nav="-1" aria-label="Mois précédent">‹</button><b>${esc(premier.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))}</b><button type="button" class="cal-nav" data-nav="1" aria-label="Mois suivant">›</button></div><div class="cal-grille">`;
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(j => { h += `<span class="cal-jour-nom" aria-hidden="true">${j}</span>`; });
    for (let i = 0; i < decal; i++) h += '<span></span>';
    for (let j = 1; j <= nb; j++) {
      const d = `${an}-${String(mo + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
      h += `<button type="button" class="cal-j ${d === ajd ? 'auj' : ''} ${d === courant ? 'on' : ''} ${marques.has(d) ? 'a' : ''}" data-j="${d}" aria-label="${esc(dateLongue(d))}" ${d === courant ? 'aria-pressed="true"' : ''}>${j}</button>`;
    }
    $('#cal').innerHTML = h + '</div>';
  };
  dessiner();
  const feuille = $('#feuille');
  feuille.addEventListener('click', e => {
    const n = e.target.closest('[data-nav]'), j = e.target.closest('[data-j]');
    if (n) { mo += +n.dataset.nav; if (mo < 0) { mo = 11; an--; } if (mo > 11) { mo = 0; an++; } dessiner(); const b = $(`#cal [data-nav="${n.dataset.nav}"]`); if (b) b.focus(); }
    if (j) { fermerFeuille(); choisir(id, j.dataset.j); }
    if (e.target.closest('[data-auj]')) { fermerFeuille(); choisir(id, ajd); }
  });
}
function ouvrirHeureApp(id) {
  const p = PICK[id], choisie = $('#' + id).value;
  let occ = [], dur = 60;
  if (p.ctx === 'rdv') {
    const date = $('#rDate').value, bouton = $('#modal [data-act="sauverRdv"]'), editId = bouton ? bouton.dataset.id : '';
    dur = +$('#rDuree').value || 60;
    occ = S.rdv.filter(r => r.date === date && r.statut !== 'annule' && r.id !== editId).map(r => [toMin(r.heure), toMin(r.heure) + (+r.duree || 0)]);
  }
  const cand = new Set();
  for (let t = 300; t <= 1410; t += 30) cand.add(t);
  occ.forEach(([, f]) => { if (f < 1440) cand.add(f); });
  if (choisie) cand.add(toMin(choisie));
  const boutons = [...cand].sort((a, b) => a - b).map(t => {
    const pris = occ.some(([a, b]) => t < b && t + dur > a);
    return `<button type="button" class="heure-b ${choisie === toHM(t) ? 'on' : ''} ${pris ? 'pris' : ''}" data-h="${toHM(t)}">${toHM(t)}</button>`;
  }).join('');
  const o = ouvrirFeuille(p.titre, (p.ctx === 'rdv' ? '<p class="note-fe">Les heures barrées chevauchent un autre rendez-vous (vous pouvez les choisir quand même).</p>' : '') + `<div class="heures">${boutons}</div>`);
  o.querySelector('.heures').addEventListener('click', e => { const x = e.target.closest('[data-h]'); if (!x) return; fermerFeuille(); choisir(id, x.dataset.h); });
}

/* ===== Son ===== */
let ctx = null;
const sonActif = () => localStorage.getItem('bm_son') !== '0';
function audio() {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) ctx = new A(); }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function bip(freq, t0, dur, vol = 0.25) {
  const c = audio(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
function sonner(type, force = false) {
  if (!sonActif() && !force) return;
  if (type === 'rdv') { for (let i = 0; i < 3; i++) { bip(880, i * 1.3, .35); bip(1175, i * 1.3 + .4, .35); bip(1480, i * 1.3 + .8, .45); } }
  else { bip(988, 0, .25); bip(1318, .3, .5); }
}
document.addEventListener('pointerdown', () => audio(), { once: true });

/* ===== Rappels de rendez-vous ===== */
let rappelsOK = false;
function demarrerRappels() {
  if (rappelsOK) return; rappelsOK = true;
  setInterval(verifierRappels, 20000);
  setTimeout(verifierRappels, 4000);
}
function verifierRappels() {
  if (!S.user) return;
  const n = new Date(), nowM = n.getHours() * 60 + n.getMinutes(), t = today();
  const avance = +S.reglages.rappelMin || 15;
  S.rdv.filter(r => r.date === t && r.statut === 'confirme').forEach(r => {
    const diff = toMin(r.heure) - nowM, cle = `bm_rappel_${r.id}_${r.date}_${r.heure}`;
    if (diff <= avance && diff >= -5 && !localStorage.getItem(cle)) {
      localStorage.setItem(cle, '1');
      sonner('rdv');
      const quand = diff > 0 ? `dans ${diff} min` : 'maintenant';
      $('#alerte').innerHTML = `<div class="alerte-box" role="alertdialog" aria-live="assertive"><div class="h">${esc(r.heure)}</div><h2>Rendez-vous ${quand}</h2><p>${esc(r.clientNom)}<br>${esc(r.prestation)}</p><button class="btn" data-act="alerteOk">J'ai vu</button></div>`;
      $('#alerte').classList.add('on');
    }
  });
}

/* ===== Calculs ===== */
function occupation(date) {
  const total = toMin(S.reglages.fermeture) - toMin(S.reglages.ouverture);
  if (total <= 0) return 0;
  const pris = somme(S.rdv.filter(r => r.date === date && r.statut !== 'annule'), r => r.duree);
  return Math.min(100, Math.round(pris / total * 100));
}
function barres(data) {
  const max = Math.max(...data.map(d => d.value), 1);
  return `<div class="barres" role="img" aria-label="Graphique des encaissements">${data.map(d => `<div class="barre"><span class="val">${d.value ? fmtCourt(d.value) : ''}</span><div class="piste"><i style="height:${Math.round(d.value / max * 100)}%"></i></div><b>${esc(d.label)}</b></div>`).join('')}</div>`;
}
const libelleJour = j => new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
const clientParId = id => S.clients.find(c => c.id === id);

/* ===== Accueil ===== */
function vueAccueil() {
  const t = today();
  const jour = S.rdv.filter(r => r.date === t && r.statut !== 'annule').sort((a, b) => a.heure.localeCompare(b.heure));
  const ca = somme(S.paiements.filter(p => p.date === t), p => p.montant);
  const nouv = S.demandes.filter(d => d.statut === 'nouvelle').length;
  const n = new Date(), nowM = n.getHours() * 60 + n.getMinutes();
  const prochain = jour.find(r => r.statut === 'confirme' && toMin(r.heure) >= nowM);
  const jours = [...Array(7)].map((_, i) => addDays(t, i - 6));
  const serie = jours.map(j => ({ label: libelleJour(j), value: somme(S.paiements.filter(p => p.date === j), p => p.montant) }));
  return `
  <header class="entete"><div><h1>Bonjour, ${esc(S.reglages.nomSalon)}</h1><p class="sous" style="margin-bottom:0">${esc(dateLongue(t))}</p></div>
    <button class="btn" data-act="nvRdv">Nouveau rendez-vous</button></header>
  <div class="chiffres">
    <div class="chiffre"><div class="n">${jour.length}</div><div class="l">Rendez-vous aujourd'hui</div></div>
    <div class="chiffre"><div class="n">${esc(fcfa(ca))}</div><div class="l">Encaissé aujourd'hui</div></div>
    <div class="chiffre"><div class="n">${occupation(t)} %</div><div class="l">Taux d'occupation</div></div>
  </div>
  ${prochain ? `<div class="prochain"><div class="h">${esc(prochain.heure)}</div><div><b>${esc(prochain.clientNom)}</b><small>${esc(prochain.prestation)}</small></div></div>` : ''}
  ${nouv ? `<div class="panneau" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><b>${nouv} demande${nouv > 1 ? 's' : ''} de rendez-vous à traiter</b><button class="btn petit" data-act="vue" data-vue="demandes">Voir les demandes</button></div>` : ''}
  <div class="deux">
    <section class="panneau"><h2>Programme du jour</h2>
      ${jour.length ? `<ul class="liste">${jour.map(r => `<li><span class="heure">${esc(r.heure)}</span><div class="corps"><b>${esc(r.clientNom)}</b><span>${esc(r.prestation)}</span></div><span class="chip ${r.statut}">${STATUTS[r.statut]}</span></li>`).join('')}</ul>` : '<p class="vide">Aucun rendez-vous aujourd\'hui.</p>'}
    </section>
    <section class="panneau"><h2 style="margin-bottom:14px">Encaissements des 7 derniers jours</h2>${barres(serie)}</section>
  </div>`;
}

/* ===== Agenda ===== */
function ligneRdv(r) {
  const fin = toHM(toMin(r.heure) + (+r.duree || 0));
  return `<li><span class="heure">${esc(r.heure)} – ${esc(fin)}</span>
    <div class="corps"><b>${esc(r.clientNom)}</b><span>${esc(r.prestation)} · ${esc(fcfa(r.prix))}${r.paye ? ' · encaissé' : ''}</span>${r.notes ? `<span> · ${esc(r.notes)}</span>` : ''}</div>
    <span class="chip ${r.statut}">${STATUTS[r.statut]}</span>
    <div class="actions">
      ${r.statut === 'confirme' ? `<button class="btn petit" data-act="statut" data-id="${esc(r.id)}" data-val="termine">Terminé</button><button class="btn sec petit" data-act="statut" data-id="${esc(r.id)}" data-val="annule">Annuler</button>` : ''}
      ${r.statut === 'termine' && !r.paye ? `<button class="btn petit" data-act="encaisser" data-id="${esc(r.id)}">Encaisser</button>` : ''}
      ${r.statut === 'annule' ? `<button class="btn sec petit" data-act="statut" data-id="${esc(r.id)}" data-val="confirme">Rétablir</button>` : ''}
      <button class="lien" data-act="edRdv" data-id="${esc(r.id)}">Modifier</button>
      <button class="lien danger" data-act="supRdv" data-id="${esc(r.id)}">Supprimer</button>
    </div></li>`;
}
function vueAgenda() {
  const d = S.agDate;
  const liste = S.rdv.filter(r => r.date === d).sort((a, b) => a.heure.localeCompare(b.heure));
  return `
  <header class="entete"><h1>Agenda</h1><button class="btn" data-act="nvRdv">Nouveau rendez-vous</button></header>
  <div class="barre-date">
    <button class="btn sec" data-act="agJour" data-d="-1" aria-label="Jour précédent">‹</button>
    ${dateur('agDate', d, { marques: 'rdv', attrs: 'data-change="agDate"', titre: 'Choisir la date' })}
    <button class="btn sec" data-act="agJour" data-d="1" aria-label="Jour suivant">›</button>
    <button class="btn sec" data-act="agJour" data-d="0">Aujourd'hui</button>
  </div>
  <p class="sous" style="margin-top:14px">${esc(dateLongue(d))}</p>
  <section class="panneau">${liste.length ? `<ul class="liste">${liste.map(ligneRdv).join('')}</ul>` : '<p class="vide">Aucun rendez-vous ce jour. Ajoutez-en un avec le bouton « Nouveau rendez-vous ».</p>'}</section>`;
}

/* ===== Créneaux publics (heures prises, sans aucun nom) ===== */
async function majCreneau(id, d) {
  if (!id) return;
  if (d.statut === 'annule') { await deleteDoc(doc(db, 'creneaux', id)); return; }
  await setDoc(doc(db, 'creneaux', id), { date: d.date, debut: d.heure, fin: toHM(toMin(d.heure) + (+d.duree || 0)) });
}

/* ===== Fenêtre rendez-vous ===== */
function modalRdv(r = {}, pre = {}) {
  const e = Object.assign({ date: S.agDate, heure: '09:00', duree: 60, prix: 0, prestation: '', statut: 'confirme', clientId: '', serviceId: '', notes: '' }, r, pre);
  const clients = [...S.clients].sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  const nouveau = !!pre.nouveauNom;
  ouvrir(`<h2>${r.id ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h2>
    <label class="champ"><span>Cliente</span>${selecteur('rClient', [...clients.map(c => ({ v: c.id, t: c.nom, sous: c.telephone || '' })), { v: 'new', t: '+ Nouvelle cliente' }], nouveau ? 'new' : e.clientId, { titre: 'Choisir la cliente', vide: 'Choisir une cliente' })}</label>
    <div id="rNew" style="display:${nouveau ? 'block' : 'none'}"><div class="deux-champs">
      <label class="champ"><span>Nom</span><input id="rNom" maxlength="80" value="${esc(pre.nouveauNom || '')}"></label>
      <label class="champ"><span>Téléphone</span><input id="rTel" type="tel" maxlength="20" value="${esc(pre.nouveauTel || '')}"></label></div></div>
    <label class="champ"><span>Service</span>${selecteur('rService', [{ v: '', t: 'Prestation libre' }, ...[...S.services].sort((a, b) => CATEGORIES.indexOf(a.categorie || 'Autre') - CATEGORIES.indexOf(b.categorie || 'Autre') || (a.nom || '').localeCompare(b.nom || '')).map(sv => ({ v: sv.id, t: sv.nom, groupe: sv.categorie || 'Autre', sous: sv.prix ? fcfa(sv.prix) : '' }))], e.serviceId || '', { titre: 'Choisir le service' })}</label>
    <label class="champ"><span>Prestation</span><input id="rPresta" maxlength="100" value="${esc(e.prestation)}"></label>
    <div class="deux-champs">
      <label class="champ"><span>Prix (FCFA)</span><input id="rPrix" type="number" min="0" step="100" value="${esc(e.prix)}"></label>
      <label class="champ"><span>Durée</span>${selecteur('rDuree', itemsDuree(e.duree), e.duree, { titre: 'Choisir la durée', dyn: v => fmtDuree(+v) })}</label>
      <label class="champ"><span>Date</span>${dateur('rDate', e.date, { marques: 'rdv' })}</label>
      <label class="champ"><span>Heure</span>${heureur('rHeure', e.heure, { ctx: 'rdv' })}</label></div>
    <label class="champ"><span>Statut</span>${selecteur('rStatut', Object.entries(STATUTS).map(([k, v]) => ({ v: k, t: v })), e.statut, { titre: 'Choisir le statut' })}</label>
    <label class="champ"><span>Notes</span><textarea id="rNotes" maxlength="300">${esc(e.notes)}</textarea></label>
    <div class="pied"><button class="btn sec" data-act="fermer">Annuler</button><button class="btn" data-act="sauverRdv" data-id="${esc(r.id || '')}" data-demande="${esc(pre.demandeId || '')}">Enregistrer</button></div>`);
}
async function sauverRdv(id, demandeId) {
  let clientId = $('#rClient').value, clientNom = '';
  const prestation = $('#rPresta').value.trim(), date = $('#rDate').value, heure = $('#rHeure').value;
  if (!clientId) return toast('Choisissez une cliente.');
  if (!prestation) return toast('Indiquez la prestation.');
  if (!date || !heure) return toast('Indiquez la date et l\'heure.');
  const duree = +$('#rDuree').value || 60, prix = +$('#rPrix').value || 0, statut = $('#rStatut').value;
  const autres = S.rdv.filter(x => x.date === date && x.statut !== 'annule' && x.id !== id);
  const debut = toMin(heure), fin = debut + duree;
  if (statut !== 'annule' && autres.some(x => debut < toMin(x.heure) + (+x.duree || 0) && fin > toMin(x.heure))) {
    if (!confirm('Ce créneau chevauche un autre rendez-vous. Enregistrer quand même ?')) return;
  }
  if (clientId === 'new') {
    const nom = $('#rNom').value.trim(), tel = $('#rTel').value.trim();
    if (nom.length < 2) return toast('Indiquez le nom de la cliente.');
    const ref = await addDoc(collection(db, 'clients'), { nom, telephone: tel, notes: '', createdAt: serverTimestamp() });
    clientId = ref.id; clientNom = nom;
  } else clientNom = (clientParId(clientId) || {}).nom || '';
  const ancien = S.rdv.find(x => x.id === id);
  const data = { clientId, clientNom, serviceId: $('#rService').value, prestation, prix, duree, date, heure, statut, notes: $('#rNotes').value.trim() };
  let rid = id;
  if (id) await updateDoc(doc(db, 'rdv', id), data);
  else rid = (await addDoc(collection(db, 'rdv'), { ...data, paye: false, createdAt: serverTimestamp() })).id;
  await majCreneau(rid, data);
  if (demandeId) await updateDoc(doc(db, 'demandes', demandeId), { statut: 'traitee' });
  if (ancien) localStorage.removeItem(`bm_rappel_${id}_${ancien.date}_${ancien.heure}`);
  S.agDate = date;
  fermer(); toast('Rendez-vous enregistré');
}

/* ===== Clientes ===== */
function listeClientes(q = '') {
  const t = q.trim().toLowerCase();
  const liste = [...S.clients].filter(c => !t || (c.nom || '').toLowerCase().includes(t) || (c.telephone || '').includes(t))
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  if (!liste.length) return '<p class="vide">Aucune cliente trouvée.</p>';
  return `<ul class="liste">${liste.map(c => {
    const visites = S.rdv.filter(r => r.clientId === c.id && r.statut === 'termine').length;
    const total = somme(S.paiements.filter(p => p.clientId === c.id), p => p.montant);
    return `<li><button class="ligne" data-act="edClient" data-id="${esc(c.id)}"><div class="corps"><b>${esc(c.nom)}</b><span>${esc(c.telephone || 'Pas de téléphone')}${c.notes ? ' · ' + esc(c.notes.slice(0, 50)) : ''}</span></div><span class="note">${visites} visite${visites > 1 ? 's' : ''}</span><span class="montant">${esc(fcfa(total))}</span></button></li>`;
  }).join('')}</ul>`;
}
function vueClientes() {
  return `<header class="entete"><h1>Clientes</h1><button class="btn" data-act="nvClient">Nouvelle cliente</button></header>
  <label class="champ"><span class="sr">Rechercher</span><input id="rechClient" type="search" placeholder="Rechercher par nom ou téléphone" data-input="rechClient"></label>
  <section class="panneau" id="listeClients">${listeClientes()}</section>`;
}
function modalClient(c = {}) {
  const hist = c.id ? S.rdv.filter(r => r.clientId === c.id).sort((a, b) => (b.date + b.heure).localeCompare(a.date + a.heure)).slice(0, 20) : [];
  const total = c.id ? somme(S.paiements.filter(p => p.clientId === c.id), p => p.montant) : 0;
  ouvrir(`<h2>${c.id ? esc(c.nom) : 'Nouvelle cliente'}</h2>
    <label class="champ"><span>Nom</span><input id="cNom" maxlength="80" value="${esc(c.nom || '')}"></label>
    <label class="champ"><span>Téléphone</span><input id="cTel" type="tel" maxlength="20" value="${esc(c.telephone || '')}"></label>
    <label class="champ"><span>Notes (allergies, préférences)</span><textarea id="cNotes" maxlength="500">${esc(c.notes || '')}</textarea></label>
    ${c.id ? `<h3 style="margin:8px 0">Historique · ${esc(fcfa(total))} encaissés</h3>
      ${hist.length ? `<ul class="simple-liste">${hist.map(r => `<li><span>${esc(dateCourte(r.date))} · ${esc(r.prestation)}</span><span class="chip ${r.statut}">${STATUTS[r.statut]}</span></li>`).join('')}</ul>` : '<p class="note">Aucune prestation pour le moment.</p>'}
      <div class="actions" style="margin-top:12px">
        <button class="btn sec petit" data-act="rdvClient" data-id="${esc(c.id)}">Nouveau rendez-vous</button>
        ${c.telephone ? `<a class="lien" href="tel:${esc(c.telephone)}">Appeler</a><a class="lien" href="${esc(waLink(c.telephone))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        <button class="lien danger" data-act="supClient" data-id="${esc(c.id)}">Supprimer</button></div>` : ''}
    <div class="pied"><button class="btn sec" data-act="fermer">Fermer</button><button class="btn" data-act="sauverClient" data-id="${esc(c.id || '')}">Enregistrer</button></div>`);
}
async function sauverClient(id) {
  const nom = $('#cNom').value.trim();
  if (nom.length < 2) return toast('Indiquez le nom de la cliente.');
  const data = { nom, telephone: $('#cTel').value.trim(), notes: $('#cNotes').value.trim() };
  if (id) {
    await updateDoc(doc(db, 'clients', id), data);
    const liés = S.rdv.filter(r => r.clientId === id && r.clientNom !== nom);
    await Promise.all(liés.map(r => updateDoc(doc(db, 'rdv', r.id), { clientNom: nom })));
  } else await addDoc(collection(db, 'clients'), { ...data, createdAt: serverTimestamp() });
  fermer(); toast('Cliente enregistrée');
}

/* ===== Services & tarifs ===== */
function vueServices() {
  const groupes = CATEGORIES.map(c => [c, S.services.filter(x => (x.categorie || 'Autre') === c).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))]).filter(([, l]) => l.length);
  return `<header class="entete"><h1>Services & tarifs</h1><button class="btn" data-act="nvService">Nouvelle prestation</button></header>
  ${S.services.length ? groupes.map(([c, l]) => `<section class="panneau"><h2 style="margin-bottom:6px">${esc(c)}</h2><ul class="liste">${l.map(x => `<li><button class="ligne" data-act="edService" data-id="${esc(x.id)}"><div class="corps"><b>${esc(x.nom)}</b><span>${esc(fmtDuree(x.duree))}</span></div><span class="montant">${esc(fcfa(x.prix))}</span></button></li>`).join('')}</ul></section>`).join('')
  : `<section class="panneau"><p class="vide" style="padding-top:0">Aucune prestation pour le moment.</p><button class="btn" data-act="seedServices">Ajouter les prestations du flyer</button><p class="note">Les prix et durées sont des estimations de départ : modifiez-les ensuite une par une.</p></section>`}
  <p class="note">Les clientes voient ces prestations dans le formulaire, avec le prix indiqué comme « dès ».</p>`;
}
function modalService(s = {}) {
  ouvrir(`<h2>${s.id ? 'Modifier la prestation' : 'Nouvelle prestation'}</h2>
    <label class="champ"><span>Nom</span><input id="sNomS" maxlength="100" value="${esc(s.nom || '')}"></label>
    <label class="champ"><span>Catégorie</span>${selecteur('sCat', CATEGORIES.map(c => ({ v: c, t: c })), s.categorie || 'Coiffure', { titre: 'Choisir la catégorie' })}</label>
    <div class="deux-champs">
      <label class="champ"><span>Prix estimé (FCFA)</span><input id="sPrix" type="number" min="0" step="500" value="${esc(s.prix ?? '')}"></label>
      <label class="champ"><span>Durée</span>${selecteur('sDuree', itemsDuree(s.duree ?? 60), s.duree ?? 60, { titre: 'Choisir la durée', dyn: v => fmtDuree(+v) })}</label></div>
    <div class="pied">${s.id ? `<button class="lien danger" data-act="supService" data-id="${esc(s.id)}">Supprimer</button>` : ''}<button class="btn sec" data-act="fermer">Annuler</button><button class="btn" data-act="sauverService" data-id="${esc(s.id || '')}">Enregistrer</button></div>`);
}
async function sauverService(id) {
  const nom = $('#sNomS').value.trim();
  if (!nom) return toast('Indiquez le nom de la prestation.');
  const data = { nom, categorie: $('#sCat').value, prix: +$('#sPrix').value || 0, duree: +$('#sDuree').value || 60 };
  if (id) await updateDoc(doc(db, 'services', id), data);
  else await addDoc(collection(db, 'services'), { ...data, createdAt: serverTimestamp() });
  fermer(); toast('Prestation enregistrée');
}

/* ===== Caisse ===== */
function vueCaisse() {
  const d = S.caDate;
  const pj = S.paiements.filter(p => p.date === d).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const total = somme(pj, p => p.montant);
  const aEncaisser = S.rdv.filter(r => r.date === d && r.statut === 'termine' && !r.paye);
  return `<header class="entete"><h1>Caisse</h1><button class="btn" data-act="nvPaiement">Nouvel encaissement</button></header>
  <div class="barre-date">
    <button class="btn sec" data-act="caJour" data-d="-1" aria-label="Jour précédent">‹</button>
    ${dateur('caDate', d, { marques: 'paiements', attrs: 'data-change="caDate"', titre: 'Choisir la date' })}
    <button class="btn sec" data-act="caJour" data-d="1" aria-label="Jour suivant">›</button>
    <button class="btn sec" data-act="caJour" data-d="0">Aujourd'hui</button></div>
  <div class="chiffres" style="margin-top:20px"><div class="chiffre"><div class="n">${esc(fcfa(total))}</div><div class="l">Total du ${esc(dateCourte(d))}</div></div>
    ${MODES.slice(0, 2).map(m => `<div class="chiffre"><div class="n" style="font-size:1.3rem">${esc(fcfa(somme(pj.filter(p => p.mode === m), p => p.montant)))}</div><div class="l">${esc(m)}</div></div>`).join('')}</div>
  ${aEncaisser.length ? `<section class="panneau"><h2 style="margin-bottom:8px">À encaisser</h2><ul class="liste">${aEncaisser.map(r => `<li><div class="corps"><b>${esc(r.clientNom)}</b><span>${esc(r.prestation)}</span></div><span class="montant">${esc(fcfa(r.prix))}</span><button class="btn petit" data-act="encaisser" data-id="${esc(r.id)}">Encaisser</button></li>`).join('')}</ul></section>` : ''}
  <section class="panneau"><h2 style="margin-bottom:8px">Encaissements du jour</h2>${pj.length ? `<ul class="liste">${pj.map(p => `<li><div class="corps"><b>${esc(p.clientNom || 'Cliente')}</b><span>${esc(p.prestation)} · ${esc(p.mode)}</span></div><span class="montant">${esc(fcfa(p.montant))}</span><button class="lien danger" data-act="supPaiement" data-id="${esc(p.id)}">Supprimer</button></li>`).join('')}</ul>` : '<p class="vide">Aucun encaissement ce jour.</p>'}</section>`;
}
function modalPaiement(pre = {}) {
  const e = Object.assign({ date: S.caDate, montant: '', mode: 'Espèces', prestation: '', clientNom: '', clientId: '', rdvId: '' }, pre);
  ouvrir(`<h2>Nouvel encaissement</h2>
    <label class="champ"><span>Cliente</span><div style="display:flex;gap:8px"><input id="pClient" maxlength="80" value="${esc(e.clientNom)}" placeholder="Nom de la cliente" style="flex:1"><button type="button" class="btn sec petit" data-act="listeClientes">Liste</button></div></label>
    <label class="champ"><span>Prestation</span><input id="pPresta" maxlength="100" value="${esc(e.prestation)}"></label>
    <div class="deux-champs">
      <label class="champ"><span>Montant (FCFA)</span><input id="pMontant" type="number" min="0" step="100" value="${esc(e.montant)}"></label>
      <label class="champ"><span>Mode de paiement</span>${selecteur('pMode', MODES.map(m => ({ v: m, t: m })), e.mode, { titre: 'Mode de paiement' })}</label></div>
    <label class="champ"><span>Date</span>${dateur('pDate', e.date, { marques: 'paiements' })}</label>
    <div class="pied"><button class="btn sec" data-act="fermer">Annuler</button><button class="btn" data-act="sauverPaiement" data-rdv="${esc(e.rdvId)}" data-client="${esc(e.clientId)}">Enregistrer</button></div>`);
}
async function sauverPaiement(rdvId, clientId) {
  const montant = +$('#pMontant').value, clientNom = $('#pClient').value.trim(), prestation = $('#pPresta').value.trim();
  if (!(montant > 0)) return toast('Indiquez un montant.');
  if (!prestation) return toast('Indiquez la prestation.');
  if (!clientId && clientNom) clientId = (S.clients.find(c => c.nom === clientNom) || {}).id || '';
  await addDoc(collection(db, 'paiements'), { date: $('#pDate').value || today(), montant, mode: $('#pMode').value, prestation, clientNom, clientId, rdvId, createdAt: serverTimestamp() });
  if (rdvId) await updateDoc(doc(db, 'rdv', rdvId), { paye: true });
  fermer(); toast('Encaissement enregistré');
}

/* ===== Statistiques ===== */
function plage() {
  const t = today(), p = S.statPeriode, d = new Date();
  if (p === '7') return { debut: addDays(t, -6), fin: t, mode: 'jour' };
  if (p === '30') return { debut: addDays(t, -29), fin: t, mode: 'jour' };
  if (p === 'mois') return { debut: iso(new Date(d.getFullYear(), d.getMonth(), 1)), fin: t, mode: 'jour' };
  return { debut: `${d.getFullYear()}-01-01`, fin: t, mode: 'mois' };
}
function classement(map, max) {
  const lignes = Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  if (!lignes.length) return '<p class="vide">Pas encore de données.</p>';
  return `<ol class="classement" style="padding-left:0">${lignes.map(([nom, v]) => `<li><div class="t"><b>${esc(nom)}</b><span>${esc(fcfa(v.total))} · ${v.n}×</span></div><div class="jauge"><i style="width:${Math.round(v.total / max * 100)}%"></i></div></li>`).join('')}</ol>`;
}
function vueStats() {
  const { debut, fin, mode } = plage();
  const pp = S.paiements.filter(p => p.date >= debut && p.date <= fin);
  const total = somme(pp, p => p.montant);
  let serie = [];
  if (mode === 'jour') {
    for (let j = debut; j <= fin; j = addDays(j, 1)) serie.push({ label: S.statPeriode === '7' ? libelleJour(j) : String(+j.slice(8)), value: somme(pp.filter(p => p.date === j), p => p.montant) });
  } else {
    const an = debut.slice(0, 4), mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    serie = mois.map((m, i) => ({ label: m, value: somme(pp.filter(p => p.date.startsWith(`${an}-${String(i + 1).padStart(2, '0')}`)), p => p.montant) }));
  }
  const grouper = cle => pp.reduce((acc, p) => { const k = cle(p) || 'Non précisé'; (acc[k] = acc[k] || { total: 0, n: 0 }); acc[k].total += +p.montant || 0; acc[k].n++; return acc; }, {});
  const parPresta = grouper(p => p.prestation), parClient = grouper(p => p.clientNom), parMode = grouper(p => p.mode);
  const max = o => Math.max(...Object.values(o).map(v => v.total), 1);
  const periodes = [['7', '7 jours'], ['30', '30 jours'], ['mois', 'Ce mois'], ['annee', 'Cette année']];
  return `<header class="entete"><h1>Statistiques</h1></header>
  <div class="onglets">${periodes.map(([k, l]) => `<button class="btn sec petit ${S.statPeriode === k ? 'actif' : ''}" data-act="statP" data-p="${k}">${l}</button>`).join('')}</div>
  <div class="chiffres"><div class="chiffre"><div class="n">${esc(fcfa(total))}</div><div class="l">Revenus de la période</div></div>
    <div class="chiffre"><div class="n">${pp.length}</div><div class="l">Encaissements</div></div>
    <div class="chiffre"><div class="n" style="font-size:1.5rem">${esc(fcfa(pp.length ? total / pp.length : 0))}</div><div class="l">Panier moyen</div></div></div>
  <section class="panneau"><h2 style="margin-bottom:14px">Revenus par ${mode === 'jour' ? 'jour' : 'mois'}</h2>${barres(serie)}</section>
  <div class="deux">
    <section class="panneau"><h2>Prestations les plus vendues</h2>${classement(parPresta, max(parPresta))}</section>
    <section class="panneau"><h2>Meilleures clientes</h2>${classement(parClient, max(parClient))}</section></div>
  <section class="panneau"><h2>Modes de paiement</h2>${classement(parMode, max(parMode))}</section>`;
}

/* ===== Demandes ===== */
function vueDemandes() {
  const liste = [...S.demandes].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return `<header class="entete"><h1>Demandes de rendez-vous</h1></header>
  <section class="panneau">${liste.length ? `<ul class="liste">${liste.map(d => `<li style="align-items:flex-start">
    <div class="corps"><b>${esc(d.nom)}</b><span>${esc(d.telephone)} · ${esc(d.prestation)}</span><span>Souhaité : ${esc(d.dateSouhaitee || 'non précisé')}</span>${d.message ? `<span>« ${esc(d.message)} »</span>` : ''}</div>
    <span class="chip ${d.statut === 'nouvelle' ? 'nouvelle' : 'traitee'}">${d.statut === 'nouvelle' ? 'Nouvelle' : 'Traitée'}</span>
    <div class="actions"><a class="lien" href="tel:${esc(d.telephone)}">Appeler</a><a class="lien" href="${esc(waLink(d.telephone, `Bonjour ${d.nom}, merci pour votre demande chez ${S.reglages.nomSalon}.`))}" target="_blank" rel="noopener">WhatsApp</a>
      <button class="btn petit" data-act="dmRdv" data-id="${esc(d.id)}">Créer le rendez-vous</button>
      ${d.statut === 'nouvelle' ? `<button class="btn sec petit" data-act="dmTraitee" data-id="${esc(d.id)}">Marquer traitée</button>` : ''}
      <button class="lien danger" data-act="dmSup" data-id="${esc(d.id)}">Supprimer</button></div></li>`).join('')}</ul>` : '<p class="vide">Aucune demande pour le moment. Partagez le lien du formulaire (dans Réglages) avec vos clientes.</p>'}</section>`;
}

/* ===== Réglages ===== */
function lienFormulaire() { return new URL('rendez-vous.html', location.href).href; }
function vueReglages() {
  const r = S.reglages;
  return `<header class="entete"><h1>Réglages</h1></header>
  <section class="panneau"><h2 style="margin-bottom:14px">Le salon</h2>
    <label class="champ"><span>Nom du salon</span><input id="sNom" maxlength="60" value="${esc(r.nomSalon)}"></label>
    <label class="champ"><span>E-mail de réception des demandes</span><input id="sEmail" type="email" maxlength="120" value="${esc(r.emailNotif)}"></label>
    <p class="note" style="margin-top:-6px">Cette adresse est utilisée par le formulaire public : choisissez une adresse que vous acceptez de rendre accessible.</p>
    <label class="champ"><span>Numéro WhatsApp du salon</span><input id="sWa" type="tel" maxlength="20" value="${esc(r.whatsapp)}"></label>
    <div class="deux-champs">
      <label class="champ"><span>Ouverture</span>${heureur('sOuv', r.ouverture, { titre: "Heure d'ouverture" })}</label>
      <label class="champ"><span>Fermeture</span>${heureur('sFer', r.fermeture, { titre: 'Heure de fermeture' })}</label></div>
    <label class="champ"><span>Sonnerie de rappel (minutes avant le rendez-vous)</span><input id="sRap" type="number" min="1" max="120" value="${esc(r.rappelMin)}"></label>
    <button class="btn" data-act="sauverReglages">Enregistrer les réglages</button></section>
  <section class="panneau"><h2 style="margin-bottom:14px">Son sur cet appareil</h2>
    <label class="interrupteur"><input type="checkbox" id="sSon" data-change="son" ${sonActif() ? 'checked' : ''}> Sonneries et alertes activées</label>
    <button class="btn sec petit" data-act="testSon" style="margin-top:8px">Tester la sonnerie</button>
    <p class="note">Le son fonctionne tant que l'application est ouverte sur cet appareil.</p></section>
  <section class="panneau"><h2 style="margin-bottom:14px">Lien du formulaire clientes</h2>
    <p style="word-break:break-all;margin-top:0">${esc(lienFormulaire())}</p>
    <button class="btn sec petit" data-act="copierLien">Copier le lien</button></section>
  <section class="panneau"><h2 style="margin-bottom:14px">Compte</h2><p class="note" style="margin-top:0">Connectée : ${esc(S.user ? S.user.email : '')}</p><button class="btn sec" data-act="deco">Se déconnecter</button></section>`;
}

/* ===== Affichage ===== */
const VUES = { accueil: vueAccueil, agenda: vueAgenda, clientes: vueClientes, services: vueServices, caisse: vueCaisse, stats: vueStats, demandes: vueDemandes, reglages: vueReglages };
function render() {
  if (!S.user) return;
  navigation();
  const vue = $('#vue');
  // On évite de réafficher la page de réglages ou de recherche pendant la saisie
  const actif = document.activeElement;
  if (actif && vue.contains(actif) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(actif.tagName) && actif.id !== 'agDate' && actif.id !== 'caDate') return;
  vue.innerHTML = VUES[S.vue]();
}
function aller(v) { S.vue = v; fermer(); const el = document.activeElement; if (el && el.blur) el.blur(); render(); window.scrollTo(0, 0); }

/* ===== Actions (clics) ===== */
const ACT = {
  vue: el => aller(el.dataset.vue),
  fermer: () => fermer(),
  alerteOk: () => { $('#alerte').classList.remove('on'); $('#alerte').innerHTML = ''; },
  plus: () => ouvrir(`<h2>Menu</h2><div style="display:grid;gap:6px">${['services', 'stats', 'demandes', 'reglages'].map(v => `<button class="nav-i" style="color:var(--noir)" data-act="vue" data-vue="${v}">${ico(v)}<span>${LIBELLES[v]}</span>${v === 'demandes' && S.demandes.some(d => d.statut === 'nouvelle') ? '<span class="badge">!</span>' : ''}</button>`).join('')}</div><div class="pied"><button class="btn sec" data-act="fermer">Fermer</button></div>`),
  deco: () => signOut(auth),
  /* Agenda */
  agJour: el => { const n = +el.dataset.d; S.agDate = n === 0 ? today() : addDays(S.agDate, n); render(); },
  nvRdv: () => modalRdv(),
  edRdv: el => modalRdv(S.rdv.find(r => r.id === el.dataset.id)),
  rdvClient: el => { const c = clientParId(el.dataset.id); modalRdv({}, { clientId: c.id }); },
  sauverRdv: el => sauverRdv(el.dataset.id, el.dataset.demande),
  statut: async el => {
    const r = S.rdv.find(x => x.id === el.dataset.id), val = el.dataset.val;
    await updateDoc(doc(db, 'rdv', r.id), { statut: val });
    await majCreneau(r.id, { ...r, statut: val });
    if (val === 'termine' && !r.paye && confirm('Rendez-vous terminé. Encaisser maintenant ?')) modalPaiement({ rdvId: r.id, clientId: r.clientId, clientNom: r.clientNom, prestation: r.prestation, montant: r.prix, date: today() });
  },
  encaisser: el => { const r = S.rdv.find(x => x.id === el.dataset.id); modalPaiement({ rdvId: r.id, clientId: r.clientId, clientNom: r.clientNom, prestation: r.prestation, montant: r.prix, date: today() }); },
  supRdv: async el => { if (confirm('Supprimer ce rendez-vous ?')) { await deleteDoc(doc(db, 'rdv', el.dataset.id)); await deleteDoc(doc(db, 'creneaux', el.dataset.id)); toast('Rendez-vous supprimé'); } },
  /* Clientes */
  nvClient: () => modalClient(),
  edClient: el => modalClient(clientParId(el.dataset.id)),
  sauverClient: el => sauverClient(el.dataset.id),
  supClient: async el => { if (confirm('Supprimer cette cliente ? Ses rendez-vous et encaissements restent enregistrés.')) { await deleteDoc(doc(db, 'clients', el.dataset.id)); fermer(); toast('Cliente supprimée'); } },
  /* Services */
  nvService: () => modalService(),
  edService: el => modalService(S.services.find(s => s.id === el.dataset.id)),
  sauverService: el => sauverService(el.dataset.id),
  supService: async el => { if (confirm('Supprimer cette prestation ?')) { await deleteDoc(doc(db, 'services', el.dataset.id)); fermer(); toast('Prestation supprimée'); } },
  seedServices: async () => {
    if (!confirm(`Ajouter ${CATALOGUE.length} prestations avec des prix estimatifs ?`)) return;
    await Promise.all(CATALOGUE.map(([categorie, nom, prix, duree]) => addDoc(collection(db, 'services'), { categorie, nom, prix, duree, createdAt: serverTimestamp() })));
    toast('Prestations ajoutées : ajustez les prix');
  },
  /* Caisse */
  caJour: el => { const n = +el.dataset.d; S.caDate = n === 0 ? today() : addDays(S.caDate, n); render(); },
  nvPaiement: () => modalPaiement(),
  sauverPaiement: el => sauverPaiement(el.dataset.rdv, el.dataset.client),
  supPaiement: async el => {
    if (!confirm('Supprimer cet encaissement ?')) return;
    const p = S.paiements.find(x => x.id === el.dataset.id);
    if (p && p.rdvId && S.rdv.some(r => r.id === p.rdvId)) await updateDoc(doc(db, 'rdv', p.rdvId), { paye: false });
    await deleteDoc(doc(db, 'paiements', el.dataset.id)); toast('Encaissement supprimé');
  },
  /* Stats */
  statP: el => { S.statPeriode = el.dataset.p; render(); },
  /* Demandes */
  dmRdv: el => { const d = S.demandes.find(x => x.id === el.dataset.id); const sv = S.services.find(s => s.nom === d.prestation);
    const existante = S.clients.find(c => c.telephone && c.telephone.replace(/\D/g, '') === d.telephone.replace(/\D/g, ''));
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(d.dateSouhaitee || ''), h = /(\d{2}:\d{2})/.exec(d.dateSouhaitee || '');
    modalRdv({}, Object.assign({ prestation: d.prestation, demandeId: d.id, notes: d.message || '' }, sv ? { serviceId: sv.id, prix: sv.prix, duree: sv.duree } : {}, m ? { date: m[1] } : {}, h ? { heure: h[1] } : {},
      existante ? { clientId: existante.id } : { nouveauNom: d.nom, nouveauTel: d.telephone })); },
  dmTraitee: el => updateDoc(doc(db, 'demandes', el.dataset.id), { statut: 'traitee' }),
  dmSup: async el => { if (confirm('Supprimer cette demande ?')) await deleteDoc(doc(db, 'demandes', el.dataset.id)); },
  pick: el => ouvrirSelecteur(el.dataset.id),
  pickDate: el => ouvrirDate(el.dataset.id),
  pickHeure: el => ouvrirHeureApp(el.dataset.id),
  listeClientes: () => {
    if (!S.clients.length) return toast('Aucune cliente enregistrée pour le moment.');
    ouvrirListe('Choisir la cliente', [...S.clients].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')).map(c => ({ v: c.id, t: c.nom, sous: c.telephone || '' })), '', it => { $('#pClient').value = it.t; });
  },
  /* Réglages */
  sauverReglages: async () => {
    const r = { nomSalon: $('#sNom').value.trim() || 'Bella Market', emailNotif: $('#sEmail').value.trim(), whatsapp: $('#sWa').value.trim(), ouverture: $('#sOuv').value || '08:00', fermeture: $('#sFer').value || '19:00', rappelMin: +$('#sRap').value || 15 };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.emailNotif)) return toast('Adresse e-mail invalide.');
    await setDoc(doc(db, 'reglages', 'salon'), r, { merge: true });
    await setDoc(doc(db, 'reglagesPublics', 'salon'), { emailNotif: r.emailNotif, whatsapp: r.whatsapp, nomSalon: r.nomSalon, ouverture: r.ouverture, fermeture: r.fermeture }, { merge: true });
    toast('Réglages enregistrés');
  },
  testSon: () => { audio(); sonner('rdv', true); },
  copierLien: async () => { try { await navigator.clipboard.writeText(lienFormulaire()); toast('Lien copié'); } catch { toast('Copie impossible : sélectionnez le lien à la main.'); } }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  Promise.resolve().then(() => fn(el, e)).catch(erreur);
});
document.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.change;
  if (k === 'agDate' && e.target.value) { S.agDate = e.target.value; e.target.blur(); render(); }
  if (k === 'caDate' && e.target.value) { S.caDate = e.target.value; e.target.blur(); render(); }
  if (k === 'son') { localStorage.setItem('bm_son', e.target.checked ? '1' : '0'); }
  if (e.target.id === 'rClient') $('#rNew').style.display = e.target.value === 'new' ? 'block' : 'none';
  if (e.target.id === 'rService') {
    const s = S.services.find(x => x.id === e.target.value);
    if (s) { $('#rPresta').value = s.nom; $('#rPrix').value = s.prix; setPick('rDuree', s.duree); }
  }
});
document.addEventListener('input', e => {
  if (e.target.dataset && e.target.dataset.input === 'rechClient') $('#listeClients').innerHTML = listeClientes(e.target.value);
});

/* ===== Données en direct ===== */
function ecouter() {
  unsubs.forEach(f => f()); unsubs = [];
  const col = (nom, cle) => onSnapshot(collection(db, nom), snap => {
    S[cle] = snap.docs.map(d => ({ id: d.id, ...d.data() })); render();
    if (cle === 'rdv' && !creneauxSync) { creneauxSync = true; S.rdv.filter(r => r.date >= today() && r.statut !== 'annule').forEach(r => majCreneau(r.id, r).catch(() => {})); }
  }, erreur);
  unsubs.push(col('clients', 'clients'), col('services', 'services'), col('rdv', 'rdv'), col('paiements', 'paiements'));
  let premier = true;
  unsubs.push(onSnapshot(collection(db, 'demandes'), snap => {
    S.demandes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!premier && snap.docChanges().some(c => c.type === 'added' && c.doc.data().statut === 'nouvelle')) { sonner('demande'); toast('Nouvelle demande reçue'); }
    premier = false; render();
  }, erreur));
  unsubs.push(onSnapshot(doc(db, 'reglages', 'salon'), s => {
    if (s.exists()) {
      S.reglages = { ...DEFAUTS, ...s.data() };
      if (!publicsSync) { publicsSync = true; const r = S.reglages; setDoc(doc(db, 'reglagesPublics', 'salon'), { emailNotif: r.emailNotif, whatsapp: r.whatsapp, nomSalon: r.nomSalon, ouverture: r.ouverture, fermeture: r.fermeture }, { merge: true }).catch(() => {}); }
    } else {
      setDoc(doc(db, 'reglages', 'salon'), DEFAUTS).catch(erreur);
      setDoc(doc(db, 'reglagesPublics', 'salon'), { emailNotif: DEFAUTS.emailNotif, whatsapp: DEFAUTS.whatsapp, nomSalon: DEFAUTS.nomSalon, ouverture: DEFAUTS.ouverture, fermeture: DEFAUTS.fermeture }).catch(erreur);
    }
    render();
  }, erreur));
}

/* ===== Connexion ===== */
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); audio();
  const btn = $('#lBtn'); btn.disabled = true; $('#loginErr').textContent = '';
  try { await signInWithEmailAndPassword(auth, $('#lEmail').value.trim(), $('#lMdp').value); }
  catch (err) {
    const c = err.code || '';
    $('#loginErr').textContent = (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found') ? 'E-mail ou mot de passe incorrect.' : (c === 'auth/too-many-requests' ? 'Trop de tentatives. Réessayez dans quelques minutes.' : 'Connexion impossible. Vérifiez votre connexion internet.');
  } finally { btn.disabled = false; }
});
$('#lOubli').addEventListener('click', async () => {
  const mail = $('#lEmail').value.trim();
  if (!mail) { $('#loginErr').textContent = 'Saisissez d\'abord votre adresse e-mail.'; return; }
  try { await sendPasswordResetEmail(auth, mail); $('#loginErr').textContent = 'Un e-mail de réinitialisation vient d\'être envoyé.'; }
  catch { $('#loginErr').textContent = 'Envoi impossible. Vérifiez l\'adresse saisie.'; }
});
onAuthStateChanged(auth, u => {
  S.user = u;
  if (u) { $('#login').style.display = 'none'; $('#app').classList.add('on'); ecouter(); render(); demarrerRappels(); }
  else { unsubs.forEach(f => f()); unsubs = []; $('#app').classList.remove('on'); $('#login').style.display = 'grid'; }
});
