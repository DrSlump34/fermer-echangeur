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
