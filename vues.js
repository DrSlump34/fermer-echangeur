/* Les trois vues de « Fermer un échangeur » : Carte (géographie), Linéaire, Tableau.
   Commun aux trois pages : le sélecteur de vue (#vues), la mémoire de la DERNIÈRE VUE utilisée (fe-vue) et de la
   DERNIÈRE AUTOROUTE vue (fe-etat.route, partagée avec la vue linéaire), et l'autoroute de départ d'une page :
   ?r=… dans l'adresse, sinon la dernière vue, sinon celle donnée par la page. */
(() => {
  const VUES = [['carte', 'Carte'], ['lineaire', 'Linéaire'], ['tableau', 'Tableau']];
  const lireEtat = () => { try { return JSON.parse(localStorage.getItem('fe-etat') || '{}'); } catch (e) { return {}; } };
  let courante = null, route = null;
  const css = document.createElement('style');
  css.textContent = `
  .vues { display: inline-flex; padding: 3px; gap: 2px; border: 1px solid var(--bord); border-radius: 10px; background: var(--surface-2, var(--surface)); }
  .vues a { padding: 5px 12px; border-radius: 7px; font-size: 13px; font-weight: 650; color: var(--doux); text-decoration: none; white-space: nowrap; }
  .vues a:hover { color: var(--texte); }
  .vues a.on { background: var(--surface); color: var(--texte); box-shadow: 0 1px 3px rgb(15 23 42 / .15); }
  `;
  document.head.appendChild(css);
  function liens() {
    const nav = document.getElementById('vues'); if (!nav) return;
    nav.innerHTML = VUES.map(([v, t]) => '<a data-v="' + v + '"' + (v === courante ? ' class="on" aria-current="page"' : '')
      + ' href="' + v + '.html' + (route ? '?r=' + encodeURIComponent(route) : '') + '">' + t + '</a>').join('');
  }
  window.FE_VUES = {
    // la page s'annonce : elle devient la dernière vue utilisée
    init(vue) { courante = vue; try { localStorage.setItem('fe-vue', vue); } catch (e) {} liens(); },
    // l'autoroute affichée a changé : on la retient et les liens vers les autres vues la gardent
    route(r) {
      route = r;
      if (r) { const e = lireEtat(); e.route = r; try { localStorage.setItem('fe-etat', JSON.stringify(e)); } catch (x) {} }
      const q = r ? '?r=' + encodeURIComponent(r) : '';
      if (r && new URLSearchParams(location.search).get('r') !== r) history.replaceState(history.state, '', location.pathname + q);
      liens();
    },
    // l'autoroute par laquelle la page doit commencer (parmi celles qu'elle connaît)
    depart(connues, defaut) {
      const ok = r => r && (!connues || connues.includes(r));
      const u = new URLSearchParams(location.search).get('r'), m = lireEtat().route;
      return ok(u) ? u : ok(m) ? m : defaut;
    },
  };
})();
