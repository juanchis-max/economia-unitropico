// =========================================================
// investigaciones.js — Repositorio de publicaciones
// (investigaciones.html): buscador, filtros por tipo, línea
// y año, publicación destacada, citar y descargar PDF.
// Contenido: data/contenido.json → investigaciones (se edita en el panel).
// =========================================================

(function () {
  'use strict';
  const app = document.getElementById('pub-app');
  if (!app || !window.CC) return;

  const POR_PAGINA = 10;
  const estado = { q: '', tipo: 'Todos', linea: '', anio: '', visibles: POR_PAGINA };
  let pubs = [];
  let lineas = [];

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
  const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hayFiltros = () => estado.q || estado.tipo !== 'Todos' || estado.linea || estado.anio;

  function cita(p) {
    const autores = String(p.autores || 'Programa de Economía, Unitrópico').replace(/\.$/, '');
    const titulo = String(p.titulo).replace(/\.$/, '');
    const url = p.enlace || (p.pdf ? new URL(p.pdf, location.href).href.split('?')[0] : '');
    return `${autores} (${p.anio || 's. f.'}). ${titulo}${p.tipo ? ` [${p.tipo}]` : ''}. Programa de Economía, Universidad Internacional del Trópico Americano.` + (url ? ' ' + url : '');
  }

  async function copiar(texto, boton) {
    try { await navigator.clipboard.writeText(texto); }
    catch (e) {
      const t = el('textarea'); t.value = texto; document.body.append(t); t.select();
      try { document.execCommand('copy'); } catch (err) { /* sin acción */ }
      t.remove();
    }
    const antes = boton.textContent;
    boton.textContent = '¡Cita copiada!';
    setTimeout(() => { boton.textContent = antes; }, 2200);
  }

  function acciones(p) {
    return el('div', { class: 'pub-acciones' },
      p.pdf ? el('a', { class: 'btn btn-primario btn-sm', href: CC.archivo(CC.urlSegura(p.pdf)), target: '_blank', rel: 'noopener', text: 'Descargar PDF' }) : null,
      p.enlace ? el('a', { class: 'btn btn-secundario btn-sm', href: CC.urlSegura(p.enlace), target: '_blank', rel: 'noopener', text: 'Ver en línea ↗' }) : null,
      el('button', { type: 'button', class: 'btn btn-secundario btn-sm', text: 'Citar', title: 'Copiar la referencia', onclick: (e) => copiar(cita(p), e.currentTarget) }));
  }
  const etiquetas = (p) => el('div', { class: 'meta' },
    p.tipo ? el('span', { class: 'etiqueta-tipo', text: p.tipo }) : null,
    p.anio ? el('span', { text: p.anio }) : null);

  function itemPub(p) {
    return el('article', { class: 'pub' },
      etiquetas(p),
      el('h3', { text: p.titulo }),
      p.autores ? el('p', { class: 'pub-autores', text: p.autores }) : null,
      p.linea ? el('p', { class: 'pub-linea', text: 'Línea: ' + p.linea }) : null,
      p.resumen ? el('p', { class: 'pub-resumen', html: CC.formatear(p.resumen) }) : null,
      acciones(p));
  }

  function filtrar() {
    const q = normalizar(estado.q);
    return pubs.filter((p) =>
      (estado.tipo === 'Todos' || p.tipo === estado.tipo) &&
      (!estado.linea || p.linea === estado.linea) &&
      (!estado.anio || String(p.anio) === estado.anio) &&
      (!q || normalizar([p.titulo, p.autores, p.resumen, p.linea, p.tipo].join(' ')).includes(q)));
  }

  // ---------- Resultados (se redibujan al filtrar, sin tocar los campos) ----------
  const zonaResultados = el('div');
  const zonaLineas = el('ul', { class: 'lineas-filtro' });

  function pintarResultados() {
    zonaResultados.replaceChildren();
    const destacada = !hayFiltros() ? pubs.find((p) => p.destacada) : null;
    if (destacada) {
      zonaResultados.append(el('section', { class: 'tarjeta pub-destacada', 'aria-label': 'Publicación destacada' },
        el('div', { class: 'meta' }, el('span', { class: 'etiqueta-tipo', text: 'Destacada' }), destacada.tipo ? el('span', { text: destacada.tipo }) : null, destacada.anio ? el('span', { text: destacada.anio }) : null),
        el('h2', { text: destacada.titulo }),
        destacada.autores ? el('p', { class: 'pub-autores', text: destacada.autores }) : null,
        destacada.resumen ? el('p', { class: 'pub-resumen', html: CC.formatear(destacada.resumen) }) : null,
        acciones(destacada)));
    }
    const lista = filtrar().filter((p) => p !== destacada);
    const total = filtrar().length;
    zonaResultados.append(el('p', { class: 'resultado-conteo', 'aria-live': 'polite', text: total === 1 ? '1 publicación' : `${total} publicaciones` }));
    if (!lista.length && !destacada) {
      zonaResultados.append(el('div', { class: 'tarjeta vacio' },
        el('p', { text: pubs.length ? 'No hay publicaciones con esos filtros.' : 'Todavía no hay publicaciones.' }),
        hayFiltros() ? el('button', { type: 'button', class: 'btn btn-secundario btn-sm', text: 'Quitar filtros', onclick: limpiar }) : null));
    } else if (lista.length) {
      zonaResultados.append(el('div', { class: 'tarjeta pub-lista' }, lista.slice(0, estado.visibles).map(itemPub)));
      if (lista.length > estado.visibles) {
        zonaResultados.append(el('div', { class: 'mas' }, el('button', {
          type: 'button', class: 'btn btn-secundario', text: 'Ver más publicaciones',
          onclick: () => { estado.visibles += POR_PAGINA; pintarResultados(); }
        })));
      }
    }
    // Líneas con su conteo
    zonaLineas.replaceChildren(...lineas.map((l) => el('li', {}, el('button', {
      type: 'button', 'aria-pressed': estado.linea === l.nombre ? 'true' : 'false',
      onclick: () => { estado.linea = estado.linea === l.nombre ? '' : l.nombre; const s = document.getElementById('pub-linea'); if (s) s.value = estado.linea; estado.visibles = POR_PAGINA; pintarResultados(); }
    }, el('span', { text: l.nombre }), el('span', { class: 'conteo', text: String(pubs.filter((p) => p.linea === l.nombre).length) })))));
  }

  function limpiar() {
    Object.assign(estado, { q: '', tipo: 'Todos', linea: '', anio: '', visibles: POR_PAGINA });
    render();
  }

  // ---------- Estructura ----------
  async function render() {
    const c = await CC.contenido();
    const datos = (c && c.investigaciones) || {};
    pubs = (datos.publicaciones || []).filter((p) => p && p.titulo)
      .slice().sort((a, b) => String(b.anio || '').localeCompare(String(a.anio || '')));
    lineas = (datos.lineas || []).filter((l) => l && l.nombre);
    pubs.forEach((p) => { if (p.linea && !lineas.some((l) => l.nombre === p.linea)) lineas.push({ nombre: p.linea }); });

    // Cifras de la cabecera
    const cifras = document.getElementById('pub-cifras');
    if (cifras) {
      const tesis = pubs.filter((p) => /tesis/i.test(p.tipo || '')).length;
      cifras.replaceChildren(...[[pubs.length, pubs.length === 1 ? 'publicación' : 'publicaciones'], [lineas.length, lineas.length === 1 ? 'línea de investigación' : 'líneas de investigación'], [tesis, tesis === 1 ? 'tesis de grado' : 'tesis de grado']]
        .map(([v, t]) => el('div', { class: 'mini-kpi' }, el('div', { class: 'valor', text: String(v) }), el('div', { class: 'etiqueta', text: t }))));
    }

    const tipos = ['Todos', ...new Set(pubs.map((p) => p.tipo).filter(Boolean))];
    const anios = [...new Set(pubs.map((p) => String(p.anio || '')).filter(Boolean))].sort().reverse();
    if (!tipos.includes(estado.tipo)) estado.tipo = 'Todos';

    const buscar = el('input', { type: 'search', id: 'pub-buscar', placeholder: 'Buscar por título, autor o palabra clave', 'aria-label': 'Buscar publicaciones', value: estado.q });
    let t = null;
    buscar.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { estado.q = buscar.value.trim(); estado.visibles = POR_PAGINA; pintarResultados(); }, 150); });
    const selLinea = el('select', { id: 'pub-linea', 'aria-label': 'Línea de investigación', onchange: (e) => { estado.linea = e.target.value; estado.visibles = POR_PAGINA; pintarResultados(); } },
      el('option', { value: '', text: 'Todas las líneas' }), lineas.map((l) => el('option', { value: l.nombre, text: l.nombre })));
    selLinea.value = estado.linea;
    const selAnio = el('select', { 'aria-label': 'Año', onchange: (e) => { estado.anio = e.target.value; estado.visibles = POR_PAGINA; pintarResultados(); } },
      el('option', { value: '', text: 'Todos los años' }), anios.map((a) => el('option', { value: a, text: a })));
    selAnio.value = estado.anio;
    const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Tipo de publicación' },
      tipos.map((tp) => el('button', { type: 'button', class: 'chip' + (tp === estado.tipo ? ' activo' : ''), 'data-valor': tp, text: tp })));
    chips.addEventListener('filtro-cambiado', (e) => { estado.tipo = e.detail.valor; estado.visibles = POR_PAGINA; pintarResultados(); });

    const lateral = el('aside', { class: 'lateral', 'aria-label': 'Líneas de investigación' },
      el('section', { class: 'tarjeta lateral-tarjeta' }, el('h2', { text: 'Líneas de investigación' }), zonaLineas),
      el('section', { class: 'tarjeta lateral-tarjeta lateral-oscura' },
        el('h2', { text: '¿Tienes una propuesta de investigación?' }),
        el('p', { text: 'Docentes, estudiantes y egresados pueden postular proyectos a las líneas activas del programa.' }),
        el('a', { class: 'btn btn-dorado btn-sm', href: CC.enlace('contacto.html#propuesta'), text: 'Postular propuesta' })));

    app.replaceChildren(
      el('div', { class: 'tarjeta filtros' }, el('div', { class: 'filtros-fila' }, buscar, selLinea, selAnio), tipos.length > 2 ? chips : null),
      el('div', { class: 'pub-layout' }, zonaResultados, lateral));
    pintarResultados();
  }

  render();
  document.addEventListener('cc:actualizado', render);
})();
