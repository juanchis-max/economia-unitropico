// =========================================================
// galeria.js — Galería de eventos (galeria.html)
// Álbumes con filtro por categoría; cada álbum tiene su
// dirección (galeria.html?album=2026-09-12-nombre) y un visor
// de fotos con teclado (← → Esc) y deslizamiento en celular.
// Contenido: data/contenido.json → galeria (se edita en el panel).
// =========================================================

(function () {
  'use strict';
  const app = document.getElementById('galeria-app');
  if (!app || !window.CC) return;

  const estado = { categoria: 'Todas' };
  const ICONO = 'M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';

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
  const idDe = (a) => CC.slug(`${a.fecha || ''}-${a.titulo}`);
  const fotosDe = (a) => (a.fotos || []).filter((f) => f && f.imagen);
  const portadaDe = (a) => a.portada || (fotosDe(a)[0] || {}).imagen || '';

  function media(ruta) {
    const caja = el('div', { class: 'media' + (ruta ? '' : ' media-vacia') });
    if (ruta) caja.append(el('img', { src: CC.archivo(ruta), alt: '', loading: 'lazy' }));
    else caja.innerHTML = `<svg fill="none" stroke="#6B4E3D" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${ICONO}"/></svg>`;
    return caja;
  }
  const lugarFecha = (a) => [a.fecha ? CC.fecha(a.fecha) : '', a.lugar || ''].filter(Boolean).join(' · ');

  // ---------- Visor de fotos ----------
  const visor = el('div', { class: 'visor', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Visor de fotos', hidden: true });
  const vContador = el('span', { 'aria-live': 'polite' });
  const vTitulo = el('strong');
  const vImg = el('img', { alt: '' });
  const vPie = el('p', { style: 'margin:0;' });
  const vCerrar = el('button', { type: 'button', class: 'visor-btn', 'aria-label': 'Cerrar visor', text: '✕' });
  const vAnt = el('button', { type: 'button', class: 'visor-btn visor-ant', 'aria-label': 'Foto anterior', text: '‹' });
  const vSig = el('button', { type: 'button', class: 'visor-btn visor-sig', 'aria-label': 'Foto siguiente', text: '›' });
  visor.append(
    el('div', { class: 'visor-barra' }, el('div', {}, vTitulo, ' ', vContador), vCerrar),
    el('div', { class: 'visor-escena' }, vAnt, vImg, vSig),
    el('div', { class: 'visor-pie' }, vPie));
  document.body.append(visor);
  const v = { fotos: [], i: 0, titulo: '', origen: null };

  function mostrarFoto() {
    const f = v.fotos[v.i];
    vImg.src = CC.archivo(f.imagen);
    vImg.alt = f.pie || `Foto ${v.i + 1} de ${v.titulo}`;
    vPie.textContent = f.pie || '';
    vTitulo.textContent = v.titulo;
    vContador.textContent = `${v.i + 1} / ${v.fotos.length}`;
    vAnt.hidden = vSig.hidden = v.fotos.length < 2;
  }
  function abrir(fotos, i, titulo, origen) {
    Object.assign(v, { fotos, i, titulo, origen });
    mostrarFoto();
    visor.hidden = false;
    document.body.classList.add('con-visor');
    vCerrar.focus();
  }
  function cerrar() {
    visor.hidden = true;
    document.body.classList.remove('con-visor');
    if (v.origen && v.origen.isConnected) v.origen.focus();
  }
  const mover = (d) => { v.i = (v.i + d + v.fotos.length) % v.fotos.length; mostrarFoto(); };
  vCerrar.addEventListener('click', cerrar);
  vAnt.addEventListener('click', () => mover(-1));
  vSig.addEventListener('click', () => mover(1));
  visor.addEventListener('click', (e) => { if (e.target === visor || e.target.classList.contains('visor-escena')) cerrar(); });
  document.addEventListener('keydown', (e) => {
    if (visor.hidden) return;
    if (e.key === 'Escape') cerrar();
    else if (e.key === 'ArrowLeft') mover(-1);
    else if (e.key === 'ArrowRight') mover(1);
    else if (e.key === 'Tab') {
      const focos = [vCerrar, vAnt, vSig].filter((b) => !b.hidden);
      const i = focos.indexOf(document.activeElement);
      e.preventDefault();
      focos[(i + (e.shiftKey ? -1 : 1) + focos.length) % focos.length].focus();
    }
  });
  let inicioX = null;
  visor.addEventListener('pointerdown', (e) => { inicioX = e.clientX; });
  visor.addEventListener('pointerup', (e) => {
    if (inicioX === null) return;
    const dx = e.clientX - inicioX;
    inicioX = null;
    if (Math.abs(dx) > 50 && v.fotos.length > 1) mover(dx < 0 ? 1 : -1);
  });

  // ---------- Lista de álbumes ----------
  function renderLista(albumes, aviso) {
    document.getElementById('cabecera').hidden = false;
    app.replaceChildren();
    if (aviso) app.append(el('p', { class: 'aviso', text: aviso }));
    if (!albumes.length) {
      app.append(el('div', { class: 'tarjeta vacio' }, el('p', { text: 'Todavía no hay álbumes publicados.' })));
      return;
    }
    const categorias = ['Todas', ...new Set(albumes.map((a) => a.categoria).filter(Boolean))];
    if (!categorias.includes(estado.categoria)) estado.categoria = 'Todas';
    if (categorias.length > 2) {
      const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por categoría', style: 'margin-bottom:24px;' },
        categorias.map((c) => el('button', { type: 'button', class: 'chip' + (c === estado.categoria ? ' activo' : ''), 'data-valor': c, text: c })));
      chips.addEventListener('filtro-cambiado', (e) => { estado.categoria = e.detail.valor; render(); });
      app.append(chips);
    }
    const visibles = estado.categoria === 'Todas' ? albumes : albumes.filter((a) => a.categoria === estado.categoria);
    app.append(el('div', { class: 'albumes' }, visibles.map((a) => {
      const n = fotosDe(a).length;
      const m = media(portadaDe(a));
      m.append(el('span', { class: 'album-contador', text: n === 1 ? '1 foto' : `${n} fotos` }));
      return el('a', { class: 'tarjeta tarjeta-hover album', href: CC.enlace('galeria.html?album=' + idDe(a)) },
        m,
        el('div', { class: 'album-cuerpo' },
          a.categoria ? el('div', {}, el('span', { class: 'etiqueta-tipo', text: a.categoria })) : null,
          el('h3', { text: a.titulo }),
          lugarFecha(a) ? el('div', { class: 'meta', text: lugarFecha(a) }) : null));
    })));
  }

  // ---------- Un álbum ----------
  function renderAlbum(a) {
    document.getElementById('cabecera').hidden = true;
    document.title = `${a.titulo} | Galería — Programa de Economía`;
    const fotos = fotosDe(a);
    app.replaceChildren(
      el('a', { class: 'volver', href: CC.enlace('galeria.html'), text: '← Todos los álbumes' }),
      el('header', { class: 'album-cabecera' },
        a.categoria ? el('span', { class: 'etiqueta-tipo', text: a.categoria }) : null,
        el('h1', { text: a.titulo, style: 'margin:10px 0 6px; font-size:clamp(1.6rem,3vw,2.2rem);' }),
        lugarFecha(a) ? el('div', { class: 'meta', text: lugarFecha(a) + ` · ${fotos.length === 1 ? '1 foto' : fotos.length + ' fotos'}` }) : null,
        a.descripcion ? el('p', { html: CC.formatear(a.descripcion) }) : null),
      fotos.length
        ? el('div', { class: 'fotos' }, fotos.map((f, i) => el('button', {
            type: 'button', class: 'foto', 'aria-label': `Ver foto ${i + 1}${f.pie ? ': ' + f.pie : ''}`,
            onclick: (e) => abrir(fotos, i, a.titulo, e.currentTarget)
          }, el('img', { src: CC.archivo(f.imagen), alt: '', loading: 'lazy' }))))
        : el('div', { class: 'tarjeta vacio' }, el('p', { text: 'Este álbum todavía no tiene fotos.' })));
    window.scrollTo(0, 0);
  }

  async function render() {
    const c = await CC.contenido();
    const albumes = (((c && c.galeria) || {}).albumes || []).filter((a) => a && a.titulo)
      .slice().sort((x, y) => String(y.fecha || '').localeCompare(String(x.fecha || '')));
    const id = new URLSearchParams(location.search).get('album');
    if (id) {
      const a = albumes.find((x) => idDe(x) === id);
      if (a) { renderAlbum(a); return; }
      renderLista(albumes, 'No encontramos ese álbum. Puede que haya cambiado de nombre o que ya no esté publicado.');
      return;
    }
    renderLista(albumes);
  }

  render();
  document.addEventListener('cc:actualizado', render);
})();
