/* Les trois vues de « Fermer un échangeur » : Carte (géographie), Linéaire, Tableau.
   Commun aux trois pages : le sélecteur de vue (#vues), la mémoire de la DERNIÈRE VUE utilisée (fe-vue) et de la
   DERNIÈRE AUTOROUTE vue (fe-etat.route, partagée avec la vue linéaire), et l'autoroute de départ d'une page :
   ?r=… dans l'adresse, sinon la dernière vue, sinon celle donnée par la page. */
(() => {
  const VUES = [['carte', 'Carte'], ['lineaire', 'Linéaire'], ['tableau', 'Tableau']];
  const lireEtat = () => { try { return JSON.parse(localStorage.getItem('fe-etat') || '{}'); } catch (e) { return {}; } };
  let courante = null, route = null, ouvrage = null;
  // le point affiché (id d'un de ses segments) : ?p=… dans l'adresse et dans les liens vers les autres vues, pour qu'un
  // changement de vue garde le point et qu'on puisse partager l'adresse d'un échangeur précis (audit n° 31)
  let point = new URLSearchParams(location.search).get('p'), pointDepart = point;
  const adresse = () => ouvrage ? '?o=' + encodeURIComponent(ouvrage) : route ? '?r=' + encodeURIComponent(route) + (point ? '&p=' + encodeURIComponent(point) : '') : '';
  const ecrire = f => { const e = lireEtat(); f(e); try { localStorage.setItem('fe-etat', JSON.stringify(e)); } catch (x) {} };
  const css = document.createElement('style');
  css.textContent = `
  /* même place dans les trois vues : en haut à droite, centré dans une barre de 58 px (la barre lui laisse la place) ;
     la largeur d'une éventuelle barre de défilement est retranchée : même distance au bord de la fenêtre partout */
  .vues { position: fixed; top: 11px; right: calc(34px - (100vw - 100%)); z-index: 60; display: inline-flex; padding: 3px; gap: 2px; border: 1px solid var(--bord); border-radius: 10px; background: var(--surface-2, var(--surface)); }
  .barre { min-height: 58px; box-sizing: border-box; padding-right: 250px !important; }
  @media (max-width: 860px) { .vues { position: static; } .barre { padding-right: 10px !important; } }
  .vues a { padding: 5px 12px; border-radius: 7px; font-size: 13px; font-weight: 650; color: var(--doux); text-decoration: none; white-space: nowrap; }
  .vues a:hover { color: var(--texte); }
  .vues a.on { background: var(--surface); color: var(--texte); box-shadow: 0 1px 3px rgb(15 23 42 / .15); }
  `;
  document.head.appendChild(css);
  function liens() {
    const nav = document.getElementById('vues'); if (!nav) return;
    nav.innerHTML = VUES.map(([v, t]) => '<a data-v="' + v + '"' + (v === courante ? ' class="on" aria-current="page"' : '')
      + ' href="' + v + '.html' + adresse() + '">' + t + '</a>').join('');
  }
  window.FE_VUES = {
    // stockage SÛR : un navigateur qui refuse le stockage du site (navigation privée, cookies bloqués) lève une
    // exception à chaque accès ; les pages doivent s'afficher quand même, simplement sans mémoire (audit n° 14)
    lire(cle) { try { return localStorage.getItem(cle); } catch (e) { return null; } },
    ecrire(cle, v) { try { localStorage.setItem(cle, v); } catch (e) {} },
    // la page s'annonce : elle devient la dernière vue utilisée
    init(vue) { courante = vue; try { localStorage.setItem('fe-vue', vue); } catch (e) {} liens(); },
    // l'autoroute affichée a changé : on la retient et les liens vers les autres vues la gardent
    route(r) {
      if (route !== null && r !== route) point = null;      // autre autoroute : le point ne vaut plus
      route = r; ouvrage = null;
      if (r) ecrire(e => { e.route = r; e.sel = r; });
      const q = adresse();
      if (r && location.search !== q) history.replaceState(history.state, '', location.pathname + q);
      liens();
    },
    // le point affiché a changé (null : aucun)
    point(id) {
      point = id ? String(id) : null;
      if (!route) return;
      const q = adresse();
      if (location.search !== q) history.replaceState(history.state, '', location.pathname + q);
      liens();
    },
    // le point demandé par l'adresse à l'ouverture (une seule fois)
    // pictogramme de sortie du panonceau officiel M10b (tracé repris du fichier Wikimedia France_road_sign_M10b.svg) :
    // ligne de base y = 326, hauteur de capitale 53 (273 → 326), x de 215,7 à 284,6
    PICTO_SORTIE: 'M215.73 326.02l8.82-52.99h6.24v52.99zM234.49 326.02v-52.99h5l4.27 23.49c.35.6.73.97 1.24 0 2.56-6.8 7.73-10.37 13.86-13.45.85-.2.55-.91.19-1.16l-7.75-6.52c-.31-.51-1.68-1.94.63-2.36h28.68c2.78 0 2.24 2.14 1.66 3.56l-12.96 22.59c-.62 1.69-1.76 2.25-2.44.14l-2.78-9.02c-.75-1.15-1.42-.82-2.1-.67-5.59 1.91-10.46 11.78-12.84 23.6-.62 4.87-.56 8.6-.79 12.8z',
    // cartouche d'échangeur numéroté (M10b) en SVG autonome, pour une ligne de la vue linéaire ou du tableau :
    // panneau blanc liseré noir, cadre arrondi noir, pictogramme de sortie, numéro (noir sur blanc dans les deux thèmes)
    m10b(num) {
      const n = String(num), e = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const w = 37 + n.length * 8.8, h = 26, m = 3.2, ph = h - 2 * m, cap = 9.6, s = cap / 53, pw = 68.9 * s, px = m + ph / 2 - 1;
      return '<svg class="m10b" role="img" aria-label="Sortie ' + e(n) + '" width="' + w.toFixed(1) + '" height="' + h + '" viewBox="0 0 ' + w.toFixed(1) + ' ' + h + '">'
        + '<rect x=".5" y=".5" width="' + (w - 1).toFixed(1) + '" height="' + (h - 1) + '" rx="5" fill="#fff" stroke="#111"/>'
        + '<rect x="' + m + '" y="' + m + '" width="' + (w - 2 * m).toFixed(1) + '" height="' + ph.toFixed(1) + '" rx="' + (ph / 2).toFixed(1) + '" fill="none" stroke="#111" stroke-width="2.2"/>'
        + '<path fill="#111" transform="translate(' + px.toFixed(1) + ' ' + (h / 2 + cap / 2).toFixed(1) + ') scale(' + s.toFixed(4) + ') translate(-215.73 -326.02)" d="' + FE_VUES.PICTO_SORTIE + '"/>'
        + '<text x="' + ((px + pw + 2 + w - m - ph / 2 + 2) / 2).toFixed(1) + '" y="' + (h / 2 + 0.5) + '" text-anchor="middle" dominant-baseline="central" fill="#111" style="font: 800 13.5px ui-sans-serif, system-ui">' + e(n) + '</text></svg>';
    },
    pointDepart() { const p = pointDepart; pointDepart = null; return p; },
    // clé d'un point : l'id du premier segment de sa première action ; et « ce point porte-t-il ce segment ? »
    clePoint(p) { if (!p) return null; for (const k of ['sortie', 'entree', 'oblig', 'tout', 'deux']) if (p.f[k] && p.f[k].ids.length) return p.f[k].ids[0]; return null; },
    porte(p, id) { return !!p && Object.values(p.f).some(l => l && l.ids.some(i => String(i) === String(id))); },
    // un tunnel, un pont, un viaduc : retenu comme dernière sélection (« o:<id> »), transmis par ?o=…
    ouvrage(id) {
      ouvrage = id; route = null; point = null;
      ecrire(e => { e.sel = 'o:' + id; });
      const q = '?o=' + encodeURIComponent(id);
      if (location.search !== q) history.replaceState(history.state, '', location.pathname + q);
      liens();
    },
    // l'ouvrage par lequel la page doit commencer, s'il y en a un (?o=…, sinon la dernière sélection, sauf ?r=…)
    departOuvrage(ids) {
      const p = new URLSearchParams(location.search), u = p.get('o');
      if (u && ids.includes(u)) return u;
      if (p.get('r')) return null;
      const s = lireEtat().sel;
      return s && s.startsWith('o:') && ids.includes(s.slice(2)) ? s.slice(2) : null;
    },
    // l'autoroute par laquelle la page doit commencer (parmi celles qu'elle connaît)
    depart(connues, defaut) {
      const ok = r => r && (!connues || connues.includes(r));
      const u = new URLSearchParams(location.search).get('r'), m = lireEtat().route;  // la dernière AUTOROUTE, même après un ouvrage
      return ok(u) ? u : ok(m) ? m : defaut;
    },
  };
})();

/* ---------- Sélection de plusieurs fermetures, COMMUNE AUX TROIS VUES ----------
   Suggestion de MisterLogik (Discord Waze France Team Closures, 13/11/2026) ; d'abord écrite pour la seule vue linéaire,
   mise ici le 15/11/2026 à sa demande (« en mode Carte et Tableau, les boutons ne sont pas apparents »).
   Le bouton + à côté de chaque geste l'ajoute à une sélection, qui peut couvrir plusieurs échangeurs, les deux sens,
   plusieurs autoroutes, et qui SUIT d'une vue à l'autre (mémoire fe-panier : chaque élément porte ses segments, son
   centre et son zoom, il ne dépend plus de la page qui l'a ajouté). Deux sorties :
   - un CSV au format de WME Advanced Closures, que WCT (WME Closures Toolkit) lit aussi : UNE LIGNE PAR SEGMENT, avec son
     sens de fermeture (champ « s » des données, calculé par assembler.py : A, B ; a/b = segment à double sens fermé dans
     un seul ; 2 = inconnu). Une ligne d'un seul segment n'est jamais inversée par WCT (sa SPECIFICATIONS, § 12.1). À
     l'import, WCT charge la carte vue par vue : des échangeurs éloignés ne posent pas de problème ;
   - un seul permalien WME, seulement si tout tient dans une vue au zoom 14 ou plus (mesuré dans WME : rien n'est chargé
     sous 14, rien n'est sélectionné hors de la vue). */
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lien = l => 'https://www.waze.com/fr/editor?env=row&lat=' + l.c[1] + '&lon=' + l.c[0] + '&zoomLevel=' + l.z + '&segments=' + l.ids.join(',');

  // Repère visuel « entrée ↖ / sortie ↗ » (demande de MisterLogik, 15/11/2026) : la flèche suit le MOT dans le libellé
  // d'un échangeur ; pour une aire (« Sortie de l'aire fermée » est une ENTRÉE sur l'autoroute) et pour un libellé sans
  // le mot (« Bifurcation fermée »), elle vient du GESTE, à la fin. U+FE0E : glyphe texte, jamais l'emoji ↗️.
  const FL = { e: '<span class="fl" aria-hidden="true">↖︎</span>', s: '<span class="fl" aria-hidden="true">↗︎</span>' };
  FE_VUES.reperes = (html, k, kind) => {
    if (kind !== 'aire') {
      let n = 0;
      const r = html.replace(/(^|[\s(+])(entrée|sortie)(?=[\s)]|$)/gi, (m, a, w) => { n++; return a + w + ' ' + (/^e/i.test(w) ? FL.e : FL.s); });
      if (n) return r;
    }
    const par = { entree: FL.e, sortie: FL.s, oblig: FL.s, deux: FL.e + FL.s, tout: FL.s + FL.e }[k];
    return par ? html + ' ' + par : html;
  };

  const MEM = 'fe-panier';
  const GTXT = { entree: 'Entrée interdite', sortie: 'Sortie interdite', oblig: 'Sortie obligatoire', deux: 'Entrée interdite + sortie obligatoire', tout: 'Échangeur fermé' };
  const REG = new Map();          // clé ⇒ élément, rempli au rendu des boutons + de la page
  let S = { items: [], deb: '', fin: '' }, ouvert = false;
  const valide = x => x && typeof x.cle === 'string' && x.l && Array.isArray(x.l.ids) && Array.isArray(x.l.c) && GTXT[x.k];
  function charger() {
    try { const x = JSON.parse(FE_VUES.lire(MEM) || 'null'); if (x && Array.isArray(x.items)) S = { items: x.items.filter(valide), deb: x.deb || '', fin: x.fin || '' }; } catch (e) {}
  }
  const garder = () => FE_VUES.ecrire(MEM, JSON.stringify(S));
  charger();
  const cle = (route, vers, p, k) => [route, vers, p.km, p.nom, k].join('|');
  const dedans = c => S.items.some(x => x.cle === c);
  const pad2 = n => String(n).padStart(2, '0');
  const enLocal = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  const titreBouton = v => v ? 'Retirer de la sélection' : 'Ajouter à la sélection (fermer plusieurs échangeurs d’un coup)';

  let toastE = null;
  function toast(t) {
    if (!toastE) { toastE = document.createElement('div'); toastE.className = 'fe-toast'; toastE.setAttribute('role', 'status'); document.body.appendChild(toastE); }
    toastE.textContent = t; toastE.classList.add('vu'); clearTimeout(toast.h); toast.h = setTimeout(() => toastE.classList.remove('vu'), 1700);
  }

  // Ctrl+clic (Cmd+clic sur Mac) sur un geste : il entre dans la sélection (ou en sort) au lieu d'ouvrir WME, comme la
  // multisélection de WME (MisterLogik, 15/11/2026 : deux demi-échangeurs qui ne se font pas face, à fermer ensemble).
  const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const touche = MAC ? 'Cmd' : 'Ctrl';
  const selection = ev => ev.ctrlKey || ev.metaKey;
  // o = { route, titre, vers, p, k } ⇒ la clé du geste, enregistrée pour basculer()
  function inscrire(o) {
    const l = o.p && o.p.f && o.p.f[o.k]; if (!l) return null;
    const c = cle(o.route, o.vers, o.p, o.k);
    REG.set(c, { cle: c, route: o.route, titre: o.titre || o.route, num: o.p.num || '', nom: o.p.nom, vers: o.vers, k: o.k, l: { c: l.c, z: l.z, ids: l.ids, s: l.s || '' } });
    return c;
  }
  function basculerAvecAvis(c) {
    const avant = dedans(c); basculer(c);
    const n = S.items.length;
    toast((avant ? 'Retiré de la sélection' : 'Ajouté à la sélection') + ' · ' + n + (n > 1 ? ' fermetures' : ' fermeture'));
  }
  // geste de la carte ou de l'axe (pas de bouton + à côté) : vrai si le clic a été pris pour la sélection
  function basculerGeste(o) { const c = inscrire(o); if (!c) return false; basculerAvecAvis(c); return true; }

  // o = { route, titre, vers, p, k } ; mini : bouton compact (cellule du tableau)
  function bouton(o, mini) {
    const c = inscrire(o); if (!c) return '';
    const v = dedans(c);
    return '<button type="button" class="ajout' + (mini ? ' mini' : '') + '" data-cle="' + esc(c) + '" aria-pressed="' + v + '" title="' + titreBouton(v) + '" aria-label="' + (v ? 'Retirer de la sélection' : 'Ajouter à la sélection') + '">' + (v ? '✓' : '+') + '</button>';
  }
  const paire = (a, large, o) => '<div class="paire' + (large ? ' large' : '') + '" title="' + touche + '+clic sur le geste : l’ajouter à la sélection">' + a + bouton(o) + '</div>';

  function basculer(c) {
    const j = S.items.findIndex(x => x.cle === c);
    if (j >= 0) S.items.splice(j, 1);
    else {
      const x = REG.get(c); if (!x) return;
      // dates proposées : maintenant, et deux heures plus tard (choix de l'auteur), modifiables avant l'export
      if (!S.items.length) { const m = new Date(); m.setSeconds(0, 0); S.deb = enLocal(m); S.fin = enLocal(new Date(m.getTime() + 2 * 3600e3)); }
      S.items.push(x);
    }
    garder(); rendu();
    const m = marqueE; if (m) { m.classList.remove('bouge'); void m.offsetWidth; m.classList.add('bouge'); }
  }
  // zoom WME le plus fort qui montre toutes les fermetures (vue supposée de 1000 × 600 px) ; null sous le zoom 14
  function cadre() {
    const cs = S.items.map(x => x.l.c), lo = cs.map(c => c[0]), la = cs.map(c => c[1]);
    const c = [(Math.min(...lo) + Math.max(...lo)) / 2, (Math.min(...la) + Math.max(...la)) / 2], cos = Math.cos(c[1] * Math.PI / 180);
    const dx = (Math.max(...lo) - Math.min(...lo)) * 111320 * cos + 400, dy = (Math.max(...la) - Math.min(...la)) * 110540 + 400;
    let z = Math.min(...S.items.map(x => x.l.z));
    while (z >= 14 && (dx > 1000 * 156543.03 * cos / 2 ** z || dy > 600 * 156543.03 * cos / 2 ** z)) z--;
    return z < 14 ? null : { c: [+c[0].toFixed(5), +c[1].toFixed(5)], z };
  }
  const ids = () => [...new Set(S.items.flatMap(x => x.l.ids))];

  let panierE = null, marqueE = null;
  function rendu() {
    document.querySelectorAll('.ajout[data-cle]').forEach(b => {
      const v = dedans(b.dataset.cle);
      b.setAttribute('aria-pressed', v); b.textContent = v ? '✓' : '+'; b.title = titreBouton(v);
      b.setAttribute('aria-label', v ? 'Retirer de la sélection' : 'Ajouter à la sélection');
    });
    if (!panierE) return;
    const P = panierE, M = marqueE, n = S.items.length;
    if (!n) ouvert = false;
    M.classList.toggle('vu', n > 0 && !ouvert); M.setAttribute('aria-expanded', ouvert);
    M.innerHTML = '<b>' + n + '</b><small>' + (n > 1 ? 'fermetures' : 'fermeture') + '</small>';
    M.setAttribute('aria-label', n + (n > 1 ? ' fermetures sélectionnées' : ' fermeture sélectionnée') + ' : voir la sélection');
    P.classList.toggle('vu', n > 0 && ouvert); if (!n) { P.innerHTML = ''; return; }
    const cd = cadre(), sens = S.items.map(x => x.l.s || '').join('');
    const doubles = (sens.match(/[ab]/g) || []).length, inconnus = (sens.match(/2/g) || []).length;
    const pl = (k, a, b) => k > 1 ? b : a;
    P.innerHTML = '<div class="p-tete">' + n + pl(n, ' fermeture sélectionnée', ' fermetures sélectionnées') + ' · ' + ids().length + ' segments<button type="button" id="pVider">Tout retirer</button><button type="button" class="p-replier" id="pReplier" title="Replier la sélection en onglet" aria-label="Replier la sélection"><b>‹</b> Replier</button></div>'
      + '<ul>' + S.items.map((x, j) => '<li><span><b>' + esc(x.titre + (x.num ? ' · ' + x.num : '') + ' · ' + x.nom) + '</b><small>' + FE_VUES.reperes(esc(GTXT[x.k]), x.k) + esc(' · vers ' + x.vers) + '</small></span><button type="button" data-retire="' + j + '" aria-label="Retirer">×</button></li>').join('') + '</ul>'
      + '<div class="p-dates"><label>Début<input type="datetime-local" id="pDeb" value="' + esc(S.deb) + '"></label><label>Fin<input type="datetime-local" id="pFin" value="' + esc(S.fin) + '"></label></div>'
      + '<div class="p-boutons"><button type="button" class="p-plein" id="pCsv">Exporter le CSV (WCT, Advanced Closures)</button>'
      + '<button type="button" class="p-second" id="pPerma"' + (cd ? '' : ' disabled') + '>Copier le permalien WME</button></div>'
      + '<div class="aide"><p>Dans WCT, onglet Import : déposez le fichier. <b>« Ajouter à la file »</b> garde ces dates et le sens de chaque segment ; rien n’est posé avant « Appliquer ». <b>« Sélectionner les segments »</b> ne reprend que les segments : réglez dates et MTE, et choisissez <b>Double sens</b> (WCT ne ferme que le sens ouvert à la circulation).</p>'
      + '<p>La sélection vous suit d’une vue à l’autre (Carte, Linéaire, Tableau).</p>'
      + (doubles ? '<p class="p-alerte">' + doubles + pl(doubles, ' segment à double sens, à ne fermer que dans un sens', ' segments à double sens, à ne fermer que dans un sens') + ' : passez par « Ajouter à la file », « Double sens » ' + pl(doubles, 'le fermerait', 'les fermerait') + ' dans les deux.</p>' : '')
      + (inconnus ? '<p class="p-alerte">' + inconnus + pl(inconnus, ' segment de sens inconnu, exporté « deux sens » : vérifiez-le dans WME.', ' segments de sens inconnu, exportés « deux sens » : vérifiez-les dans WME.') + '</p>' : '')
      + (cd ? '' : '<p>Permalien indisponible : les fermetures sont trop éloignées pour une seule vue de WME. Le CSV n’a pas cette limite.</p>') + '</div>';
  }
  function csv() {
    const deb = (document.getElementById('pDeb').value || '').replace('T', ' '), fin = (document.getElementById('pFin').value || '').replace('T', ' ');
    const motif = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
    if (!motif.test(deb) || !motif.test(fin)) { toast('Indiquez le début et la fin'); return; }
    if (fin <= deb) { toast('La fin doit suivre le début'); return; }
    if (new Date(fin.replace(' ', 'T')) <= new Date()) { toast('La fin est déjà passée'); return; }
    const q = t => '"' + String(t).replace(/"/g, '""') + '"', DIR = { A: 'A to B', a: 'A to B', B: 'B to A', b: 'B to A', 2: 'TWO WAY' };
    const vu = new Map();   // un segment présent dans deux gestes (sortie obligatoire et « deux ») : une seule ligne
    for (const x of S.items) x.l.ids.forEach((id, j) => {
      const d = DIR[(x.l.s || '')[j]] || 'TWO WAY';
      if (vu.has(id)) { if (vu.get(id).d !== d) vu.get(id).d = 'TWO WAY'; return; }
      vu.set(id, { d, x });
    });
    // en-tête et colonnes : celles de WME Advanced Closures, reprises telles quelles par WCT (son export, même texte)
    const lignes = ['header,reason,start date (yyyy-mm-dd hh:mm),end date (yyyy-mm-dd hh:mm),direction (A to B|B to A|TWO WAY),ignore trafic (Yes|No),segment IDs (id1;id2;...),lon/lat (like in a permalink: lon=xxx&lat=yyy),zoom (14 to 22),MTE id (empty cell if not),comment (optional)'];
    // même motif sur toutes les lignes : WCT compte les réglages différents (dates, motif, sens, MTE) pour proposer son choix
    for (const [id, { d, x }] of vu) lignes.push(['add', q('Fermer un échangeur'), deb, fin, d, 'No', id, 'lon=' + x.l.c[0] + '&lat=' + x.l.c[1], Math.min(22, Math.max(14, x.l.z)), '', q(x.titre + (x.num ? ' ' + x.num : '') + ' ' + x.nom + ' : ' + GTXT[x.k] + ' vers ' + x.vers)].join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lignes.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' }));
    a.download = 'fermer-echangeur-' + deb.replace(/[-: ]/g, '').slice(0, 12) + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(vu.size + ' segments exportés');
  }

  const css = document.createElement('style');
  css.textContent = `
  .fl { font-size: 1.25em; line-height: 1; font-weight: 800; white-space: nowrap; }
  .paire { display: flex; gap: 6px; align-items: stretch; min-width: 0; }
  .paire.large { grid-column: 1 / -1; }
  /* avec un + à côté de chaque geste, deux colonnes ne laissent plus lire les libellés (carte : « Sortie obligatoi… ») */
  .actions:has(> .paire) { grid-template-columns: minmax(0, 1fr) !important; }
  .paire > :first-child { flex: 1; min-width: 0; }
  .ajout { flex: none; width: 44px; min-height: 44px; border: 1px solid var(--bord); border-radius: 12px; background: var(--surface); color: var(--doux); font-size: 22px; font-weight: 800; line-height: 1; cursor: pointer; }
  .ajout:hover { border-color: var(--accent); color: var(--accent); }
  .ajout[aria-pressed=true] { background: var(--accent); border-color: var(--accent); color: #fff; }
  .ajout.mini { width: 26px; min-height: 0; height: 34px; border-radius: 9px; font-size: 17px; vertical-align: middle; margin-left: 3px; }
  .fe-panier { position: fixed; left: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 62; display: none; width: min(400px, calc(100vw - 32px)); max-height: 70dvh; overflow: auto; padding: 12px; box-sizing: border-box; border: 1px solid var(--accent); border-radius: 16px; background: var(--surface); color: var(--texte); box-shadow: 0 24px 64px rgb(0 0 0 / .3); overscroll-behavior: contain; font-size: 14px; text-align: left; }
  .fe-panier.vu { display: block; }
  .fe-panier .p-tete { display: flex; align-items: center; gap: 8px; font-weight: 750; }
  .fe-panier .p-tete button { margin-left: auto; border: 0; background: none; color: var(--doux); text-decoration: underline; cursor: pointer; font-size: 13px; padding: 6px 0; }
  .fe-panier .p-tete .p-replier { margin-left: 0; display: inline-flex; align-items: center; gap: 4px; min-height: 40px; padding: 0 12px 0 8px; border: 2px solid var(--accent); border-radius: 10px; background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); text-decoration: none; font-size: 14px; font-weight: 800; }
  .fe-panier .p-tete .p-replier b { font-size: 22px; line-height: 1; }
  .fe-panier ul { list-style: none; margin: 8px 0; padding: 0; }
  .fe-panier li { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-top: 1px solid var(--bord); font-size: 13px; }
  .fe-panier li span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .fe-panier li small { display: block; color: var(--doux); }
  .fe-panier li button { flex: none; width: 32px; height: 32px; border: 0; border-radius: 8px; background: var(--surface-2); color: var(--texte); cursor: pointer; }
  .fe-panier .p-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; }
  .fe-panier .p-dates label { display: flex; flex-direction: column; gap: 3px; min-width: 0; font-size: 12px; color: var(--doux); }
  .fe-panier .p-dates input { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; padding: 7px 8px; border: 1px solid var(--bord); border-radius: 9px; background: var(--surface-2); color: var(--texte); font: inherit; }
  .fe-panier .p-boutons { display: grid; gap: 8px; }
  .fe-panier .p-plein, .fe-panier .p-second { min-height: 44px; padding: 8px 12px; border-radius: 12px; font: inherit; font-weight: 700; cursor: pointer; }
  .fe-panier .p-plein { border: 0; background: var(--accent); color: #fff; }
  .fe-panier .p-second { border: 1px solid var(--bord); background: var(--surface-2); color: var(--texte); }
  .fe-panier .p-second:disabled { opacity: .45; cursor: not-allowed; }
  .fe-panier .aide { margin-top: 8px; color: var(--doux); font-size: 13px; line-height: 1.45; }
  .fe-panier .p-alerte { color: var(--rouge); }
  .fe-marque { position: fixed; left: 0; top: 42%; z-index: 61; display: none; flex-direction: column; align-items: center; gap: 4px; width: 38px; padding: 10px 4px; border: 0; border-radius: 0 14px 14px 0; background: var(--accent); color: #fff; font: inherit; font-weight: 800; box-shadow: 4px 6px 20px rgb(0 0 0 / .3); cursor: pointer; }
  .fe-marque.vu { display: flex; }
  .fe-marque b { font-size: 20px; line-height: 1; }
  .fe-marque small { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; writing-mode: vertical-rl; transform: rotate(180deg); }
  .fe-marque.bouge { animation: fe-marque-bouge .6s cubic-bezier(.3,.7,.3,1); }
  @keyframes fe-marque-bouge { 0% { transform: translateX(0); } 25% { transform: translateX(14px); } 50% { transform: translateX(0); } 75% { transform: translateX(7px); } 100% { transform: translateX(0); } }
  @media (prefers-reduced-motion: reduce) { .fe-marque.bouge { animation: none; outline: 3px solid #fff; } }
  .fe-toast { position: fixed; left: 50%; bottom: calc(22px + env(safe-area-inset-bottom)); transform: translateX(-50%) translateY(12px); padding: 10px 16px; border-radius: 12px; background: #0b1220; color: #fff; font-size: 14px; opacity: 0; transition: opacity .2s, transform .2s; z-index: 65; pointer-events: none; }
  .fe-toast.vu { opacity: 1; transform: translateX(-50%); }
  @media (max-width: 860px) { .fe-panier { left: 8px; right: 8px; width: auto; bottom: calc(8px + env(safe-area-inset-bottom)); max-height: 80dvh; } .fe-panier .p-dates { grid-template-columns: minmax(0, 1fr); } }
  `;
  document.head.appendChild(css);

  function monter() {
    if (panierE) return;
    panierE = document.createElement('aside'); panierE.className = 'fe-panier'; panierE.id = 'panier'; panierE.setAttribute('aria-label', 'Fermetures sélectionnées');
    marqueE = document.createElement('button'); marqueE.type = 'button'; marqueE.className = 'fe-marque'; marqueE.id = 'marque';
    marqueE.setAttribute('aria-live', 'polite'); marqueE.setAttribute('aria-expanded', 'false'); marqueE.setAttribute('aria-controls', 'panier'); marqueE.title = 'Voir la sélection';
    document.body.append(panierE, marqueE);
    rendu();
  }
  if (document.body) monter(); else document.addEventListener('DOMContentLoaded', monter);

  document.addEventListener('click', ev => {
    const t = ev.target;
    const b = t.closest('.ajout[data-cle]');
    if (b) { ev.preventDefault(); ev.stopPropagation(); basculer(b.dataset.cle); return; }
    // Ctrl+clic sur le lien d'un geste qui a son bouton + : même effet que le +, WME ne s'ouvre pas
    if (selection(ev)) {
      // .paire (linéaire, carte, fiche du tableau) ou .b-paire (cellule du tableau) : le lien et son + sont frères
      const a = t.closest('a'), b2 = a && a.parentElement && a.parentElement.querySelector(':scope > .ajout[data-cle]');
      if (b2) { ev.preventDefault(); ev.stopPropagation(); basculerAvecAvis(b2.dataset.cle); return; }
    }
    if (!panierE) return;
    const rt = t.closest('.fe-panier [data-retire]'); if (rt) { S.items.splice(+rt.dataset.retire, 1); garder(); rendu(); return; }
    if (t.id === 'pVider') { S.items = []; garder(); rendu(); return; }
    if (t.closest('#marque')) { ouvert = true; rendu(); return; }
    if (t.closest('#pReplier')) { ouvert = false; rendu(); return; }
    if (t.id === 'pCsv') { csv(); return; }
    if (t.id === 'pPerma') {
      const c = cadre(); if (!c) return;
      navigator.clipboard.writeText(lien({ c: c.c, z: c.z, ids: ids() })).then(() => toast('Permalien copié (' + ids().length + ' segments)'), () => toast('Copie impossible'));
    }
  }, true);
  document.addEventListener('change', ev => { if (ev.target.id === 'pDeb') { S.deb = ev.target.value; garder(); } if (ev.target.id === 'pFin') { S.fin = ev.target.value; garder(); } });
  // une autre vue ouverte dans un autre onglet a changé la sélection : on la reprend
  window.addEventListener('storage', ev => { if (ev.key === MEM) { charger(); rendu(); } });

  window.FE_PANIER = { bouton, paire, rendu, basculerGeste, selection, touche };
})();
