// =========================================================
// noticias.js — Página de noticias (noticias.html)
// Lista con noticia destacada, filtro por categoría y
// convocatorias; cada noticia tiene su propia dirección:
// noticias.html?n=2026-10-02-titulo-de-la-noticia
// Contenido: data/contenido.json → noticias (se edita en el panel).
// =========================================================

(function () {
  'use strict';
  const app = document.getElementById('noticias-app');
  if (!app || !window.CC) return;

  const POR_PAGINA = 6;
  const estado = { categoria: 'Todas', visibles: POR_PAGINA };
  const ICONO = 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z';

  function el(tag, attrs = {}, ...hijos) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v; // solo con texto ya escapado por CC.formatear
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    hijos.flat().forEach((h) => { if (h !== null && h !== undefined && h !== false) n.append(h); });
    return n;
  }
  const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const idDe = (n) => CC.slug(`${n.fecha || ''}-${n.titulo}`);
  const urlDe = (n) => CC.enlace('noticias.html?n=' + idDe(n));

  function media(ruta, alt) {
    const caja = el('div', { class: 'media' + (ruta ? '' : ' media-vacia') });
    if (ruta) caja.append(el('img', { src: CC.archivo(ruta), alt: alt || '', loading: 'lazy' }));
    else caja.innerHTML = `<svg fill="none" stroke="#6B4E3D" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${ICONO}"/></svg>`;
    return caja;
  }
  const meta = (n) => el('div', { class: 'meta' },
    n.categoria ? el('span', { class: 'etiqueta-tipo', text: n.categoria }) : null,
    n.fecha ? el('time', { datetime: n.fecha, text: CC.fecha(n.fecha) }) : null);

  function tarjeta(n) {
    return el('a', { class: 'tarjeta tarjeta-hover noticia', href: urlDe(n) },
      media(n.imagen, ''),
      el('div', { class: 'noticia-cuerpo' },
        meta(n),
        el('h3', { text: n.titulo }),
        n.resumen ? el('p', { text: n.resumen }) : null,
        el('span', { class: 'leer-mas', 'aria-hidden': 'true', text: 'Leer noticia →' })));
  }

  // ---------- Lista ----------
  function renderLista(datos, items, aviso) {
    document.getElementById('cabecera').hidden = false;
    app.replaceChildren();
    if (aviso) app.append(el('p', { class: 'aviso', text: aviso }));
    if (!items.length) {
      app.append(el('div', { class: 'tarjeta vacio' }, el('p', { text: 'Todavía no hay noticias publicadas.' })));
      return;
    }

    const categorias = ['Todas', ...new Set(items.map((n) => n.categoria).filter(Boolean))];
    if (!categorias.includes(estado.categoria)) estado.categoria = 'Todas';
    const filtradas = estado.categoria === 'Todas' ? items : items.filter((n) => n.categoria === estado.categoria);
    const destacada = estado.categoria === 'Todas' ? (items.find((n) => n.destacada) || items[0]) : null;
    const resto = destacada ? filtradas.filter((n) => n !== destacada) : filtradas;

    if (destacada) {
      app.append(el('a', { class: 'tarjeta tarjeta-hover noticia-destacada', href: urlDe(destacada) },
        media(destacada.imagen, ''),
        el('div', { class: 'noticia-destacada-cuerpo' },
          meta(destacada),
          el('h2', { text: destacada.titulo }),
          destacada.resumen ? el('p', { text: destacada.resumen }) : null,
          el('span', { class: 'leer-mas', 'aria-hidden': 'true', text: 'Leer noticia →' }))));
    }

    if (categorias.length > 2) {
      const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por categoría', style: 'margin-bottom:22px;' },
        categorias.map((c) => el('button', { type: 'button', class: 'chip' + (c === estado.categoria ? ' activo' : ''), 'data-valor': c, 'aria-pressed': c === estado.categoria ? 'true' : 'false', text: c })));
      chips.addEventListener('filtro-cambiado', (e) => { estado.categoria = e.detail.valor; estado.visibles = POR_PAGINA; render(); });
      app.append(chips);
    }

    const columna = el('div');
    if (resto.length) {
      columna.append(el('div', { class: 'noticias-grid' }, resto.slice(0, estado.visibles).map(tarjeta)));
      if (resto.length > estado.visibles) {
        columna.append(el('div', { class: 'mas' }, el('button', {
          type: 'button', class: 'btn btn-secundario', text: 'Cargar más noticias',
          onclick: () => { estado.visibles += POR_PAGINA; render(); }
        })));
      }
    } else if (!destacada) {
      columna.append(el('div', { class: 'tarjeta vacio' }, el('p', { text: 'No hay noticias en esta categoría.' })));
    }

    // Convocatorias abiertas (las vencidas se ocultan solas)
    const abiertas = (datos.convocatorias || [])
      .filter((c) => c && c.titulo && (!c.cierre || c.cierre >= hoy()))
      .sort((a, b) => String(a.cierre || '9999').localeCompare(String(b.cierre || '9999')));
    const lateral = el('aside', { class: 'lateral', 'aria-label': 'Convocatorias' },
      el('section', { class: 'tarjeta lateral-tarjeta' },
        el('h2', { text: 'Convocatorias abiertas' }),
        abiertas.length
          ? el('ul', { class: 'convocatorias' }, abiertas.map((c) => el('li', {},
              c.enlace ? el('a', { href: CC.enlace(CC.urlSegura(c.enlace)), text: c.titulo }) : el('strong', { text: c.titulo }),
              c.cierre ? el('div', {}, el('span', { class: 'cierre', text: 'Cierra el ' + CC.fecha(c.cierre, true) })) : null)))
          : el('p', { class: 'texto-tenue', style: 'margin:0; font-size:0.88rem;', text: 'No hay convocatorias abiertas por ahora.' })),
      el('section', { class: 'tarjeta lateral-tarjeta lateral-oscura' },
        el('h2', { text: '¿Tienes una noticia?' }),
        el('p', { text: 'Cuéntanos logros, eventos o publicaciones del programa para compartirlos aquí.' }),
        el('a', { class: 'btn btn-dorado btn-sm', href: CC.enlace('contacto.html#general'), text: 'Escríbenos' })));

    app.append(el('div', { class: 'noticias-layout' }, columna, lateral));
  }

  // ---------- Artículo ----------
  function renderArticulo(n, items) {
    document.getElementById('cabecera').hidden = true;
    document.title = `${n.titulo} | Noticias — Programa de Economía`;
    const cuerpo = el('div', { class: 'articulo-cuerpo' });
    String(n.cuerpo || n.resumen || '').split(/\n{2,}/).filter((p) => p.trim()).forEach((p) => {
      cuerpo.append(el('p', { html: CC.formatear(p.trim()) }));
    });
    const boton = n.boton && n.boton.texto && n.boton.enlace
      ? el('p', {}, el('a', { class: 'btn btn-primario', href: CC.enlace(CC.urlSegura(n.boton.enlace)), text: n.boton.texto }))
      : null;
    const otras = items.filter((x) => x !== n).slice(0, 3);
    app.replaceChildren(el('article', { class: 'articulo' },
      el('a', { class: 'volver', href: CC.enlace('noticias.html'), text: '← Todas las noticias' }),
      meta(n),
      el('h1', { text: n.titulo }),
      n.imagen ? el('figure', {}, media(n.imagen, n.pie || ''), n.pie ? el('figcaption', { text: n.pie }) : null) : null,
      cuerpo,
      boton),
      otras.length ? el('section', { class: 'mas-noticias' }, el('h2', { text: 'Más noticias' }), el('div', { class: 'noticias-grid' }, otras.map(tarjeta))) : '');
    window.scrollTo(0, 0);
  }

  // ---------- Arranque ----------
  async function render() {
    const c = await CC.contenido();
    const datos = (c && c.noticias) || {};
    const items = (datos.items || []).filter((n) => n && n.titulo)
      .slice().sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    const id = new URLSearchParams(location.search).get('n');
    if (id) {
      const n = items.find((x) => idDe(x) === id);
      if (n) { renderArticulo(n, items); return; }
      renderLista(datos, items, 'No encontramos esa noticia. Puede que haya cambiado de título o que ya no esté publicada.');
      return;
    }
    renderLista(datos, items);
  }

  render();
  document.addEventListener('cc:actualizado', render);
})();
