// =========================================================
// panel.js — Panel de contenido del sitio
//
// Edita data/contenido.json y data/indicadores.json según
// esquema.js. Todo ocurre en el navegador:
//   · El borrador se guarda solo en este navegador (localStorage)
//     y la vista previa lo muestra en vivo (?borrador=1).
//   · "Descargar .zip" entrega los archivos para subirlos al hosting.
//   · "Publicar en GitHub" hace un commit con los cambios usando un
//     token personal que solo se guarda en este navegador.
// =========================================================

(() => {
  'use strict';

  const RAIZ = '../';
  const CLAVES = {
    borrador: 'cc-borrador',          // contenido completo para la vista previa
    parche: 'cc-borrador-parche',     // solo los campos cambiados (para recuperar el trabajo)
    archivos: 'cc-archivos',          // imágenes subidas aún sin publicar (para la vista previa)
    github: 'cc-github',
    token: 'cc-github-token'
  };
  const PAGINAS = ['index.html', 'datos.html', 'investigaciones.html', 'galeria.html', 'comunidad.html', 'noticias.html', 'contacto.html'];
  const ANCLAS = ['contacto.html#general', 'contacto.html#propuesta', 'contacto.html#buzon'];
  const EXT_IMAGEN = /\.(jpe?g|png|webp|gif|svg|avif)$/i;
  const MAX_ARCHIVO_MB = 20;

  const E = {
    base: null,            // lo publicado: { contenido, indicadores }
    borrador: null,        // lo que se está editando
    archivos: {},          // ruta → { dataURL, tipo, tamano, nombre, esImagen, soloMemoria }
    cacheVista: {},        // ruta → dataURL de archivos ya publicados en esta sesión
    seccion: 'general',
    pagina: 'index.html',
    dispositivo: 'escritorio',
    existe: {},            // página → true/false (si responde en el sitio)
    shas: {},              // archivo → sha en GitHub al conectar
    conectado: false
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clonar = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  let idCampo = 0;
  const nuevoId = () => 'c' + (++idCampo);

  function el(etiqueta, atributos = {}, ...hijos) {
    const n = document.createElement(etiqueta);
    Object.entries(atributos).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else n.setAttribute(k, v);
    });
    hijos.flat().forEach((h) => { if (h !== null && h !== undefined && h !== false) n.append(h); });
    return n;
  }

  function obtener(obj, ruta) {
    if (!ruta) return obj;
    return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function asignar(obj, ruta, valor) {
    const ks = ruta.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = valor;
  }
  function leerLS(clave, almacen = localStorage) {
    try { return JSON.parse(almacen.getItem(clave) || 'null'); } catch (e) { return null; }
  }
  function escribirLS(clave, valor, almacen = localStorage) {
    try { almacen.setItem(clave, JSON.stringify(valor)); return true; } catch (e) { return false; }
  }
  // ---------------------------------------------------------
  // Archivos subidos guardados en este navegador (IndexedDB)
  // Así no se pierden al recargar el panel ni al cerrar la pestaña.
  // ---------------------------------------------------------
  let bdPromesa = null;
  function abrirBD() {
    if (!bdPromesa) {
      bdPromesa = new Promise((ok, mal) => {
        if (!('indexedDB' in window)) { mal(new Error('Sin IndexedDB')); return; }
        const r = indexedDB.open('cc-panel', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('archivos');
        r.onsuccess = () => ok(r.result);
        r.onerror = () => mal(r.error);
      });
    }
    return bdPromesa;
  }
  async function bd(modo, fn) {
    const base = await abrirBD();
    return new Promise((ok, mal) => {
      const tx = base.transaction('archivos', modo);
      const almacen = tx.objectStore('archivos');
      const resultado = fn(almacen);
      tx.oncomplete = () => ok(resultado && 'result' in resultado ? resultado.result : undefined);
      tx.onerror = () => mal(tx.error);
    });
  }
  const guardarArchivoBD = (ruta, registro) => bd('readwrite', (s) => s.put(registro, ruta));
  const borrarArchivoBD = (ruta) => bd('readwrite', (s) => s.delete(ruta)).catch(() => {});
  async function leerArchivosBD() {
    const base = await abrirBD();
    return new Promise((ok, mal) => {
      const salida = {};
      const tx = base.transaction('archivos', 'readonly');
      const cursor = tx.objectStore('archivos').openCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) { salida[c.key] = c.value; c.continue(); }
      };
      tx.oncomplete = () => ok(salida);
      tx.onerror = () => mal(tx.error);
    });
  }
  function olvidarArchivosBD(rutas) { rutas.forEach((r) => borrarArchivoBD(r)); }

  const tamanoLegible = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
  const recortar = (s, n = 90) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  // ---------------------------------------------------------
  // Índice de campos del esquema
  // ---------------------------------------------------------
  const CAMPOS = [];
  ESQUEMA.forEach((sec) => (sec.grupos || []).forEach((g) => g.campos.forEach((def) => {
    CAMPOS.push({ seccion: sec, grupo: g, def, archivo: def.archivo || sec.archivo || 'contenido' });
  })));

  function valorCampo(def, archivo, fuente) {
    const v = obtener(fuente[archivo], def.ruta);
    if (def.tipo !== 'serie') return v;
    const o = {};
    def.columnas.forEach((c) => { o[c.clave] = (v || {})[c.clave] || []; });
    return o;
  }
  function fijarCampo(def, archivo, destino, valor) {
    if (def.tipo === 'serie') def.columnas.forEach((c) => asignar(destino[archivo], def.ruta + '.' + c.clave, clonar(valor[c.clave])));
    else asignar(destino[archivo], def.ruta, clonar(valor));
  }
  const difiere = (c) => !igual(valorCampo(c.def, c.archivo, E.base), valorCampo(c.def, c.archivo, E.borrador));
  const cambios = () => CAMPOS.filter(difiere);
  const archivosPendientes = () => Object.keys(E.archivos);

  // ---------------------------------------------------------
  // Guardado del borrador (en este navegador) y estado
  // ---------------------------------------------------------
  let temporizador = null;
  function guardar(inmediato = false) {
    clearTimeout(temporizador);
    const hacer = () => {
      const lista = cambios().map((c) => ({ archivo: c.archivo, ruta: c.def.ruta, serie: c.def.tipo === 'serie', valor: valorCampo(c.def, c.archivo, E.borrador) }));
      if (lista.length) escribirLS(CLAVES.parche, { fecha: new Date().toISOString(), items: lista });
      else localStorage.removeItem(CLAVES.parche);
      escribirLS(CLAVES.borrador, { contenido: E.borrador.contenido, indicadores: E.borrador.indicadores, fecha: Date.now() });
      const imagenes = {};
      Object.entries(E.archivos).forEach(([ruta, a]) => { if (a.esImagen) imagenes[ruta] = a.dataURL; });
      Object.entries(E.cacheVista).forEach(([ruta, d]) => { imagenes[ruta] = d; });
      if (!escribirLS(CLAVES.archivos, imagenes)) {
        aviso('Las imágenes nuevas son muy pesadas para la vista previa de este navegador. Se publicarán igual.', 'alerta');
      }
    };
    if (inmediato) hacer(); else temporizador = setTimeout(hacer, 300);
  }

  function actualizarEstado() {
    const n = cambios().length;
    const a = archivosPendientes().length;
    const estado = $('#estado');
    if (!n && !a) {
      estado.textContent = 'Todo publicado';
      estado.classList.remove('hay-cambios');
    } else {
      const partes = [];
      if (n) partes.push(n === 1 ? '1 cambio' : n + ' cambios');
      if (a) partes.push(a === 1 ? '1 archivo nuevo' : a + ' archivos nuevos');
      estado.textContent = partes.join(' · ') + ' sin publicar';
      estado.classList.add('hay-cambios');
    }
    $$('#lateral button[data-seccion]').forEach((b) => {
      const id = b.dataset.seccion;
      const hay = id === 'publicar' ? (n + a) > 0 : id === 'archivos' ? a > 0 : CAMPOS.some((c) => c.seccion.id === id && difiere(c));
      b.querySelector('.p-punto').hidden = !hay;
    });
    $$('.p-campo[data-campo]').forEach((nodo) => {
      const c = CAMPOS[Number(nodo.dataset.campo)];
      nodo.classList.toggle('modificado', difiere(c));
    });
  }

  function alCambiar() {
    actualizarEstado();
    guardar();
  }

  // ---------------------------------------------------------
  // Avisos y diálogos
  // ---------------------------------------------------------
  function aviso(texto, tipo = '', duracion = 5000) {
    const t = el('div', { class: 'p-toast ' + tipo });
    if (texto instanceof Node) t.append(texto); else t.textContent = texto;
    $('#avisos').append(t);
    setTimeout(() => t.remove(), duracion);
  }

  function confirmar({ titulo, texto, si = 'Aceptar', no = 'Cancelar', peligro = false }) {
    const d = $('#dialogo');
    $('#dialogo-titulo').textContent = titulo;
    const cont = $('#dialogo-texto');
    cont.replaceChildren();
    (Array.isArray(texto) ? texto : [texto]).forEach((t) => cont.append(t instanceof Node ? t : el('p', { text: t })));
    $('#dialogo-si').textContent = si;
    $('#dialogo-si').className = 'p-btn ' + (peligro ? 'p-btn-peligro lleno' : 'p-btn-oscuro');
    $('#dialogo-no').textContent = no;
    $('#dialogo-no').hidden = no === null;
    return new Promise((resolver) => {
      d.addEventListener('close', () => resolver(d.returnValue === 'si'), { once: true });
      d.returnValue = '';
      d.showModal();
      $('#dialogo-si').focus();
    });
  }

  // ---------------------------------------------------------
  // Enlaces: páginas conocidas y comprobación de existencia
  // ---------------------------------------------------------
  function actualizarDatalist() {
    const dl = $('#paginas-sitio');
    dl.replaceChildren();
    [...PAGINAS, ...ANCLAS, ...archivosPendientes().filter((r) => !EXT_IMAGEN.test(r)), 'mailto:' + (obtener(E.borrador.contenido, 'contacto.datos.correo') || '')]
      .forEach((v) => dl.append(el('option', { value: v })));
  }

  async function paginaExiste(pagina) {
    if (pagina in E.existe) return E.existe[pagina];
    if (location.protocol === 'file:') return (E.existe[pagina] = null);
    try {
      const r = await fetch(RAIZ + pagina, { method: 'HEAD', cache: 'no-store' });
      E.existe[pagina] = r.ok;
    } catch (e) { E.existe[pagina] = null; }
    return E.existe[pagina];
  }

  async function revisarEnlace(valor, nodoAviso) {
    nodoAviso.hidden = true;
    const v = String(valor || '').trim();
    if (!v) return;
    if (/^(https?:|mailto:|tel:|#)/i.test(v)) return;
    const ruta = v.split('#')[0].split('?')[0];
    if (E.archivos[ruta]) {
      nodoAviso.textContent = 'Archivo nuevo: estará disponible al publicar.';
      nodoAviso.hidden = false;
      return;
    }
    const ok = await paginaExiste(ruta);
    if (ok === false) {
      nodoAviso.textContent = /\.html$/i.test(ruta) ? '⚠ Esta página todavía no existe en el sitio.' : '⚠ No encuentro este archivo en el sitio.';
      nodoAviso.hidden = false;
    }
  }

  // ---------------------------------------------------------
  // Subida de archivos e imágenes
  // ---------------------------------------------------------
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'archivo';

  function elegirArchivo(aceptar) {
    return new Promise((resolver) => {
      const input = $('#selector-archivo');
      input.value = '';
      input.accept = aceptar;
      input.onchange = () => resolver(input.files[0] || null);
      input.click();
    });
  }
  const leerComoDataURL = (blob) => new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = mal;
    r.readAsDataURL(blob);
  });
  const cargarImagen = (src) => new Promise((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => mal(new Error('No se pudo leer la imagen.'));
    i.src = src;
  });

  async function optimizarImagen(archivo, maxLado) {
    if (archivo.type === 'image/svg+xml') return { blob: archivo, tipo: archivo.type, ext: 'svg' };
    const url = URL.createObjectURL(archivo);
    try {
      const img = await cargarImagen(url);
      const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * escala);
      const h = Math.round(img.naturalHeight * escala);
      const conTransparencia = archivo.type === 'image/png' || archivo.type === 'image/gif' || archivo.type === 'image/webp';
      const lienzo = document.createElement('canvas');
      lienzo.width = w; lienzo.height = h;
      const ctx = lienzo.getContext('2d');
      if (!conTransparencia) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, 0, 0, w, h);
      const tipo = conTransparencia ? 'image/png' : 'image/jpeg';
      const blob = await new Promise((ok) => lienzo.toBlob(ok, tipo, 0.85));
      // Si no hubo que reducirla y la original ya pesa menos, se conserva la original
      if (escala === 1 && /^image\/(jpeg|png)$/.test(archivo.type) && blob && blob.size >= archivo.size) {
        return { blob: archivo, tipo: archivo.type, ext: archivo.type === 'image/png' ? 'png' : 'jpg', w, h };
      }
      return { blob, tipo, ext: tipo === 'image/png' ? 'png' : 'jpg', w, h };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function subir({ imagen = false, maxLado = 1600 } = {}) {
    const archivo = await elegirArchivo(imagen ? 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.zip,image/*');
    if (!archivo) return null;
    if (archivo.size > MAX_ARCHIVO_MB * 1048576) {
      aviso(`El archivo pesa ${tamanoLegible(archivo.size)}. El máximo es ${MAX_ARCHIVO_MB} MB.`, 'alerta');
      return null;
    }
    const esImagen = /^image\//.test(archivo.type);
    if (imagen && !esImagen) { aviso('Ese archivo no es una imagen.', 'alerta'); return null; }
    let blob = archivo;
    let ext = (archivo.name.match(/\.([a-z0-9]+)$/i) || [, 'bin'])[1].toLowerCase();
    let tipo = archivo.type || 'application/octet-stream';
    if (esImagen) {
      try {
        const o = await optimizarImagen(archivo, maxLado);
        blob = o.blob; ext = o.ext; tipo = o.tipo;
        if (blob.size < archivo.size) aviso(`Imagen optimizada: ${tamanoLegible(archivo.size)} → ${tamanoLegible(blob.size)}.`, 'exito');
      } catch (e) {
        aviso('No pude procesar esa imagen. Prueba con un JPG o PNG.', 'alerta');
        return null;
      }
    }
    const ruta = `assets/subidas/${slug(archivo.name)}-${Date.now().toString(36)}.${ext}`;
    let soloMemoria = false;
    try {
      await guardarArchivoBD(ruta, { blob, tipo, tamano: blob.size, nombre: archivo.name, esImagen });
    } catch (e) {
      soloMemoria = true;
      aviso('Este navegador no deja guardar archivos: no cierres esta pestaña hasta publicar o descargar el .zip.', 'alerta', 9000);
    }
    E.archivos[ruta] = {
      dataURL: await leerComoDataURL(blob), tipo, tamano: blob.size, nombre: archivo.name,
      esImagen, soloMemoria
    };
    actualizarDatalist();
    alCambiar();
    return ruta;
  }

  const srcVista = (ruta) => (!ruta ? '' : /^(https?:|data:)/.test(ruta) ? ruta : (E.archivos[ruta] && E.archivos[ruta].dataURL) || E.cacheVista[ruta] || RAIZ + ruta);

  function imagenesConocidas() {
    const set = new Set(['assets/img/logo-unitropico.jpg']);
    const recorrer = (o) => {
      if (typeof o === 'string') { if (EXT_IMAGEN.test(o) && !/^https?:/.test(o)) set.add(o); }
      else if (o && typeof o === 'object') Object.values(o).forEach(recorrer);
    };
    recorrer(E.base); recorrer(E.borrador);
    Object.keys(E.archivos).forEach((r) => { if (E.archivos[r].esImagen) set.add(r); });
    return [...set];
  }

  function rutasEnUso() {
    const usadas = new Set();
    const texto = JSON.stringify(E.borrador);
    Object.keys(E.archivos).forEach((r) => { if (texto.includes(r)) usadas.add(r); });
    return usadas;
  }

  // ---------------------------------------------------------
  // Campos del editor
  // ---------------------------------------------------------
  // ctx: { archivo, indice (índice en CAMPOS si es un campo principal) }
  function crearCampo(def, ruta, ctx) {
    const id = nuevoId();
    const nodo = el('div', { class: 'p-campo' });
    if (ctx.indice !== undefined) nodo.dataset.campo = ctx.indice;
    const leer = () => obtener(E.borrador[ctx.archivo], ruta);
    const escribir = (v) => { asignar(E.borrador[ctx.archivo], ruta, v); alCambiar(); };

    const esCompuesto = ['boton', 'lista', 'serie', 'imagen'].includes(def.tipo);
    const cabecera = el('div', { class: 'p-campo-cabecera' },
      esCompuesto ? el('span', { class: 'p-etiqueta', id: id + '-et', text: def.etiqueta }) : el('label', { for: id, text: def.etiqueta }));
    if (ctx.indice !== undefined) {
      cabecera.append(el('span', { class: 'p-insignia', text: 'Modificado' }));
      cabecera.append(el('button', {
        type: 'button', class: 'p-deshacer', text: '↺ Deshacer',
        onclick: () => {
          const c = CAMPOS[ctx.indice];
          fijarCampo(c.def, c.archivo, E.borrador, valorCampo(c.def, c.archivo, E.base));
          alCambiar();
          renderEditor({ conservarScroll: true });
        }
      }));
    }
    nodo.append(cabecera);

    const ayuda = def.ayuda || (def.formato ? AYUDA_FORMATO : '');
    const pieAyuda = ayuda ? el('p', { class: 'p-ayuda', text: ayuda }) : null;

    switch (def.tipo) {
      case 'texto': case 'correo': case 'telefono': case 'textoLargo': {
        const largo = def.tipo === 'textoLargo';
        const control = largo
          ? el('textarea', { id, rows: Math.min(8, Math.max(2, Math.ceil(String(leer() || '').length / 70))) })
          : el('input', { id, type: def.tipo === 'correo' ? 'email' : def.tipo === 'telefono' ? 'tel' : 'text', placeholder: def.placeholder, inputmode: def.tipo === 'telefono' ? 'tel' : undefined });
        control.value = leer() == null ? '' : leer();
        if (pieAyuda) control.setAttribute('aria-describedby', id + '-ay');
        if (pieAyuda) pieAyuda.id = id + '-ay';
        let contador = null;
        if (def.max) {
          contador = el('span', { class: 'p-contador' });
          cabecera.append(contador);
        }
        const actualizarContador = () => {
          if (!contador) return;
          const n = control.value.length;
          contador.textContent = `${n} / ${def.max}`;
          contador.classList.toggle('excedido', n > def.max);
          contador.title = n > def.max ? 'Más largo de lo recomendado para este espacio' : '';
        };
        actualizarContador();
        control.addEventListener('input', () => { escribir(control.value); actualizarContador(); });
        nodo.append(control);
        break;
      }
      case 'numero': {
        const control = el('input', { id, type: 'text', inputmode: 'decimal' });
        const v = leer();
        control.value = v == null ? '' : String(v).replace('.', ',');
        const error = el('p', { class: 'p-error', hidden: true, text: 'Escribe un número, por ejemplo 12,5.' });
        control.addEventListener('input', () => {
          const n = Number(control.value.trim().replace(/\s/g, '').replace(',', '.'));
          const ok = control.value.trim() !== '' && Number.isFinite(n);
          control.classList.toggle('invalido', !ok);
          error.hidden = ok;
          if (ok) escribir(n);
        });
        nodo.append(control, error);
        break;
      }
      case 'selector': {
        const control = el('select', { id }, def.opciones.map((o) => el('option', { value: o.valor, text: o.texto })));
        control.value = leer() || def.opciones[0].valor;
        control.addEventListener('change', () => escribir(control.value));
        nodo.append(control);
        break;
      }
      case 'enlace': {
        nodo.append(crearControlEnlace(id, def, leer, escribir));
        break;
      }
      case 'boton': {
        const val = () => leer() || {};
        const idT = nuevoId(); const idE = nuevoId();
        const texto = el('input', { id: idT, type: 'text' });
        texto.value = val().texto || '';
        texto.addEventListener('input', () => { asignar(E.borrador[ctx.archivo], ruta + '.texto', texto.value); alCambiar(); });
        const enlace = crearControlEnlace(idE, def, () => val().enlace, (v) => { asignar(E.borrador[ctx.archivo], ruta + '.enlace', v); alCambiar(); });
        nodo.setAttribute('role', 'group');
        nodo.setAttribute('aria-labelledby', id + '-et');
        nodo.append(el('div', { class: 'p-fila' },
          el('div', {}, el('label', { class: 'p-fila-etiqueta', for: idT, text: 'Texto del botón' }), texto),
          el('div', {}, el('label', { class: 'p-fila-etiqueta', for: idE, text: 'Lleva a' }), enlace)));
        if (!def.ayuda) nodo.append(el('p', { class: 'p-ayuda', text: 'Si el texto o el enlace quedan vacíos, el botón no se muestra.' }));
        break;
      }
      case 'imagen': {
        nodo.append(crearControlImagen(def, leer, escribir, id));
        break;
      }
      case 'lista': {
        nodo.append(crearControlLista(def, ruta, ctx, leer, escribir, id));
        break;
      }
      case 'serie': {
        nodo.append(crearControlSerie(def, ruta, ctx));
        break;
      }
      default:
        nodo.append(el('p', { class: 'p-error', text: 'Tipo de campo desconocido: ' + def.tipo }));
    }
    if (pieAyuda && !['imagen'].includes(def.tipo)) nodo.append(pieAyuda);
    return nodo;
  }

  function crearControlEnlace(id, def, leer, escribir) {
    const caja = el('div');
    const input = el('input', { id, type: def.externo ? 'url' : 'text', list: def.externo ? undefined : 'paginas-sitio', placeholder: def.externo ? 'https://…' : 'pagina.html, https://… o un archivo' });
    input.value = leer() || '';
    const alerta = el('p', { class: 'p-alerta-enlace', hidden: true });
    let t = null;
    input.addEventListener('input', () => {
      escribir(input.value.trim());
      clearTimeout(t);
      t = setTimeout(() => revisarEnlace(input.value, alerta), 500);
    });
    revisarEnlace(input.value, alerta);
    if (def.subir) {
      const btn = el('button', {
        type: 'button', class: 'p-btn p-btn-borde p-btn-chico', text: 'Subir archivo',
        onclick: async () => {
          const ruta = await subir();
          if (!ruta) return;
          input.value = ruta;
          escribir(ruta);
          revisarEnlace(ruta, alerta);
        }
      });
      caja.append(el('div', { class: 'p-con-boton' }, input, btn));
    } else caja.append(input);
    caja.append(alerta);
    return caja;
  }

  function crearControlImagen(def, leer, escribir, id) {
    const caja = el('div', { class: 'p-imagen' });
    const pintar = () => {
      caja.replaceChildren();
      const ruta = leer() || '';
      const mini = el('div', { class: 'p-miniatura' });
      if (ruta) mini.append(el('img', { src: srcVista(ruta), alt: '' }));
      else mini.textContent = 'Sin imagen';
      const info = el('div', { style: 'flex:1; min-width:0;' });
      info.append(el('div', { class: 'p-ruta' }, ruta || '—', E.archivos[ruta] ? el('span', { class: 'p-pendiente', text: 'Sin publicar' }) : null));
      const existentes = imagenesConocidas().filter((r) => r !== ruta);
      const selector = existentes.length ? el('select', { 'aria-label': 'Usar una imagen existente' },
        el('option', { value: '', text: 'Usar una existente…' }),
        existentes.map((r) => el('option', { value: r, text: r.split('/').pop() }))) : null;
      if (selector) selector.addEventListener('change', () => { if (selector.value) { escribir(selector.value); pintar(); } });
      info.append(el('div', { class: 'p-botonera' },
        el('button', {
          type: 'button', class: 'p-btn p-btn-oscuro p-btn-chico', id, text: ruta ? 'Cambiar imagen' : 'Subir imagen',
          'aria-labelledby': id + '-et ' + id,
          onclick: async () => {
            const nueva = await subir({ imagen: true, maxLado: def.maxLado || 1600 });
            if (nueva) { escribir(nueva); pintar(); }
          }
        }),
        selector,
        def.opcional && ruta ? el('button', { type: 'button', class: 'p-btn p-btn-peligro p-btn-chico', text: 'Quitar', onclick: () => { escribir(''); pintar(); } }) : null
      ));
      if (def.ayuda) info.append(el('p', { class: 'p-ayuda', text: def.ayuda }));
      caja.append(mini, info);
    };
    pintar();
    return caja;
  }

  function tituloItem(def, item, i) {
    if (typeof item === 'string') return item || `Elemento ${i + 1}`;
    if (def.item === 'boton') return (item && item.texto) || `Botón ${i + 1}`;
    const v = item && def.tituloItem ? item[def.tituloItem] : '';
    return v ? String(v) : `Elemento ${i + 1}`;
  }

  function crearControlLista(def, ruta, ctx, leer, escribir, id) {
    const caja = el('div', { role: 'group', 'aria-labelledby': id ? id + '-et' : undefined });
    const lista = Array.isArray(leer()) ? leer() : [];
    const items = el('div', { class: 'p-lista-items' });
    const rehacer = (nueva) => { escribir(nueva); renderEditor({ conservarScroll: true }); };

    lista.forEach((item, i) => {
      const rutaItem = `${ruta}.${i}`;
      const acciones = el('div', { class: 'p-item-acciones' },
        el('button', { type: 'button', class: 'p-icono-btn', title: 'Subir', 'aria-label': `Subir ${tituloItem(def, item, i)}`, disabled: i === 0,
          onclick: () => { const n = clonar(lista); [n[i - 1], n[i]] = [n[i], n[i - 1]]; rehacer(n); } }, '↑'),
        el('button', { type: 'button', class: 'p-icono-btn', title: 'Bajar', 'aria-label': `Bajar ${tituloItem(def, item, i)}`, disabled: i === lista.length - 1,
          onclick: () => { const n = clonar(lista); [n[i + 1], n[i]] = [n[i], n[i + 1]]; rehacer(n); } }, '↓'),
        el('button', { type: 'button', class: 'p-icono-btn quitar', title: 'Quitar', 'aria-label': `Quitar ${tituloItem(def, item, i)}`, disabled: lista.length <= (def.min || 0),
          onclick: () => { const n = clonar(lista); n.splice(i, 1); rehacer(n); } }, '✕')
      );

      if (def.item === 'texto') {
        const input = el('input', { type: 'text', 'aria-label': `${def.etiqueta} ${i + 1}` });
        input.value = item || '';
        input.addEventListener('input', () => { asignar(E.borrador[ctx.archivo], rutaItem, input.value); alCambiar(); });
        items.append(el('div', { class: 'p-item p-item-simple' }, el('span', { class: 'p-item-numero', text: i + 1 }), input, acciones));
      } else if (def.item === 'boton') {
        const t = el('input', { type: 'text', 'aria-label': `Texto del botón ${i + 1}` });
        t.value = (item && item.texto) || '';
        t.addEventListener('input', () => { asignar(E.borrador[ctx.archivo], rutaItem + '.texto', t.value); alCambiar(); });
        const enlace = crearControlEnlace(nuevoId(), {}, () => item && item.enlace, (v) => { asignar(E.borrador[ctx.archivo], rutaItem + '.enlace', v); alCambiar(); });
        enlace.querySelector('input').setAttribute('aria-label', `Enlace del botón ${i + 1}`);
        items.append(el('div', { class: 'p-item p-item-simple' }, el('span', { class: 'p-item-numero', text: i + 1 }),
          el('div', { class: 'p-fila' }, t, enlace), acciones));
      } else {
        const cuerpo = el('div', { class: 'p-item-cuerpo' });
        def.item.campos.forEach((sub) => cuerpo.append(crearCampo(sub, `${rutaItem}.${sub.clave}`, { archivo: ctx.archivo })));
        items.append(el('div', { class: 'p-item' },
          el('div', { class: 'p-item-cabecera' }, el('span', { class: 'p-item-numero', text: '#' + (i + 1) }), el('span', { class: 'p-item-titulo', text: tituloItem(def, item, i) }), acciones),
          cuerpo));
      }
    });
    if (!lista.length) items.append(el('p', { class: 'p-vacio', text: 'No hay elementos. Esta parte no se mostrará en la página.' }));

    const pie = el('div', { class: 'p-lista-pie' });
    const lleno = def.max && lista.length >= def.max;
    pie.append(el('button', {
      type: 'button', class: 'p-btn p-btn-borde p-btn-chico', disabled: lleno,
      text: lleno ? `Máximo ${def.max}` : '+ Agregar',
      onclick: () => rehacer([...clonar(lista), clonar(def.nuevo)])
    }));
    if (def.suma) {
      const suma = lista.reduce((s, it) => s + (Number(it && it[def.suma.clave]) || 0), 0);
      const redondeada = Math.round(suma * 100) / 100;
      const ok = Math.abs(redondeada - def.suma.objetivo) < 0.05;
      const nodoSuma = el('span', { class: 'p-suma' + (ok ? '' : ' mal'), text: `Suma: ${String(redondeada).replace('.', ',')} ${def.suma.unidad}${ok ? ' ✓' : ` (debería ser ${def.suma.objetivo} ${def.suma.unidad})`}` });
      pie.append(nodoSuma);
      // La suma se recalcula al escribir sin redibujar todo
      items.addEventListener('input', () => {
        const actual = obtener(E.borrador[ctx.archivo], ruta) || [];
        const s = Math.round(actual.reduce((t, it) => t + (Number(it && it[def.suma.clave]) || 0), 0) * 100) / 100;
        const bien = Math.abs(s - def.suma.objetivo) < 0.05;
        nodoSuma.className = 'p-suma' + (bien ? '' : ' mal');
        nodoSuma.textContent = `Suma: ${String(s).replace('.', ',')} ${def.suma.unidad}${bien ? ' ✓' : ` (debería ser ${def.suma.objetivo} ${def.suma.unidad})`}`;
      });
    }
    caja.append(items, pie);
    return caja;
  }

  function crearControlSerie(def, ruta, ctx) {
    const obj = () => obtener(E.borrador[ctx.archivo], ruta) || {};
    const filas = Math.max(...def.columnas.map((c) => (obj()[c.clave] || []).length), 0);
    const tabla = el('table', { class: 'p-serie' });
    tabla.append(el('thead', {}, el('tr', {}, def.columnas.map((c) => el('th', { scope: 'col', text: c.etiqueta })), el('th', {}, el('span', { class: 'solo-lector', text: 'Quitar' })))));
    const cuerpo = el('tbody');
    for (let i = 0; i < filas; i++) {
      const tr = el('tr');
      def.columnas.forEach((c) => {
        const v = (obj()[c.clave] || [])[i];
        const input = el('input', { type: 'text', inputmode: c.tipo === 'numero' ? 'decimal' : undefined, 'aria-label': `${c.etiqueta}, fila ${i + 1}` });
        input.value = v == null ? '' : c.tipo === 'numero' ? String(v).replace('.', ',') : v;
        input.addEventListener('input', () => {
          let valor = input.value;
          if (c.tipo === 'numero') {
            const n = Number(valor.trim().replace(',', '.'));
            const ok = valor.trim() !== '' && Number.isFinite(n);
            input.classList.toggle('invalido', !ok);
            if (!ok) return;
            valor = n;
          }
          asignar(E.borrador[ctx.archivo], `${ruta}.${c.clave}.${i}`, valor);
          alCambiar();
        });
        tr.append(el('td', {}, input));
      });
      tr.append(el('td', {}, el('button', {
        type: 'button', class: 'p-icono-btn quitar', 'aria-label': `Quitar fila ${i + 1}`, title: 'Quitar fila',
        onclick: () => {
          def.columnas.forEach((c) => { const arr = clonar(obj()[c.clave] || []); arr.splice(i, 1); asignar(E.borrador[ctx.archivo], `${ruta}.${c.clave}`, arr); });
          alCambiar(); renderEditor({ conservarScroll: true });
        }
      }, '✕')));
      cuerpo.append(tr);
    }
    tabla.append(cuerpo);
    const agregar = el('button', {
      type: 'button', class: 'p-btn p-btn-borde p-btn-chico', text: '+ Agregar fila',
      onclick: () => {
        def.columnas.forEach((c) => { const arr = clonar(obj()[c.clave] || []); arr.push(c.tipo === 'numero' ? 0 : ''); asignar(E.borrador[ctx.archivo], `${ruta}.${c.clave}`, arr); });
        alCambiar(); renderEditor({ conservarScroll: true });
      }
    });
    return el('div', {}, tabla, el('div', { class: 'p-lista-pie' }, agregar));
  }

  // ---------------------------------------------------------
  // Secciones
  // ---------------------------------------------------------
  function renderLateral() {
    const nav = $('#lateral');
    nav.replaceChildren(el('div', { class: 'p-lateral-titulo', text: 'Contenido' }));
    ESQUEMA.forEach((sec) => {
      if (sec.especial === 'archivos') nav.append(el('div', { class: 'p-separador' }));
      nav.append(el('button', {
        type: 'button', 'data-seccion': sec.id, 'aria-current': sec.id === E.seccion ? 'true' : 'false',
        onclick: () => irA(sec.id)
      }, el('span', { text: sec.titulo }), el('span', { class: 'p-punto', hidden: true, title: 'Tiene cambios sin publicar' })));
    });
  }

  function irA(id) {
    E.seccion = id;
    try { sessionStorage.setItem('cc-seccion', id); } catch (e) { /* sin acción */ }
    $$('#lateral button[data-seccion]').forEach((b) => b.setAttribute('aria-current', b.dataset.seccion === id ? 'true' : 'false'));
    const sec = ESQUEMA.find((s) => s.id === id);
    if (sec.pagina && sec.pagina !== E.pagina) cambiarPagina(sec.pagina);
    renderEditor();
    $('#editor').scrollTop = 0;
    $('#editor').focus({ preventScroll: true });
    actualizarEstado();
  }

  function renderEditor({ conservarScroll = false } = {}) {
    const editor = $('#editor');
    const scroll = editor.scrollTop;
    const sec = ESQUEMA.find((s) => s.id === E.seccion);
    const interior = el('div', { class: 'p-editor-interior' });
    const cab = el('div', { class: 'p-seccion-cabecera' },
      el('div', {}, el('h1', { text: sec.titulo }), el('p', { text: sec.descripcion || '' })),
      sec.pagina ? el('a', { class: 'p-enlace-sutil', href: RAIZ + sec.pagina, target: '_blank', rel: 'noopener', text: 'Ver la página publicada ↗' }) : null);
    interior.append(cab);

    if (sec.especial === 'archivos') renderArchivos(interior);
    else if (sec.especial === 'publicar') renderPublicar(interior);
    else {
      sec.grupos.forEach((g) => {
        const fs = el('fieldset', { class: 'p-grupo' }, el('legend', { text: g.titulo }));
        if (g.ayuda) fs.append(el('p', { class: 'p-grupo-ayuda', text: g.ayuda }));
        if (g.hoja && typeof SHEET_URLS !== 'undefined' && SHEET_URLS[g.hoja]) {
          fs.append(el('div', { class: 'p-aviso alerta' }, el('p', { text: 'Estos datos se están leyendo desde Google Sheets (config.js). Mientras ese enlace exista, lo que cambies aquí no se verá en el sitio: edita la hoja de cálculo o borra el enlace.' })));
        }
        g.campos.forEach((def) => {
          const indice = CAMPOS.findIndex((c) => c.def === def);
          fs.append(crearCampo(def, def.ruta, { archivo: CAMPOS[indice].archivo, indice }));
        });
        interior.append(fs);
      });
    }
    editor.replaceChildren(interior);
    if (conservarScroll) editor.scrollTop = scroll;
    actualizarEstado();
  }

  // ---------- Imágenes y archivos ----------
  function renderArchivos(cont) {
    const enUso = rutasEnUso();
    const tarjetaNuevos = el('section', { class: 'p-tarjeta' },
      el('h2', { text: 'Archivos nuevos sin publicar' }),
      el('p', { text: 'Imágenes y documentos que subiste en este navegador. Se publican junto con los cambios.' }));
    const nuevos = archivosPendientes();
    if (!nuevos.length) tarjetaNuevos.append(el('p', { class: 'p-vacio', text: 'No hay archivos nuevos.' }));
    else {
      const rejilla = el('div', { class: 'p-rejilla-archivos' });
      nuevos.forEach((ruta) => {
        const a = E.archivos[ruta];
        const mini = el('div', { class: 'p-miniatura' });
        if (a.esImagen) mini.append(el('img', { src: a.dataURL, alt: '' })); else mini.textContent = (ruta.split('.').pop() || '').toUpperCase();
        rejilla.append(el('div', { class: 'p-archivo' }, mini, el('div', { class: 'p-archivo-info' },
          el('strong', { text: a.nombre }),
          el('span', { class: 'p-ruta', text: ruta }),
          el('span', { class: 'texto-tenue', text: tamanoLegible(a.tamano) + (enUso.has(ruta) ? ' · en uso' : ' · sin usar todavía') + (a.soloMemoria ? ' · se pierde si cierras esta pestaña' : ' · guardado en este navegador') }),
          el('div', { class: 'p-botonera' },
            el('button', { type: 'button', class: 'p-btn p-btn-borde p-btn-chico', text: 'Copiar dirección', onclick: () => copiar(ruta) }),
            el('button', {
              type: 'button', class: 'p-btn p-btn-peligro p-btn-chico', text: 'Quitar', disabled: enUso.has(ruta),
              title: enUso.has(ruta) ? 'Está en uso: cámbialo primero en el campo donde aparece' : '',
              onclick: () => { delete E.archivos[ruta]; borrarArchivoBD(ruta); actualizarDatalist(); alCambiar(); renderEditor({ conservarScroll: true }); }
            })))));
      });
      tarjetaNuevos.append(rejilla);
    }
    tarjetaNuevos.append(el('div', { class: 'p-acciones-fila', style: 'margin-top:14px;' },
      el('button', { type: 'button', class: 'p-btn p-btn-oscuro', text: 'Subir imagen', onclick: async () => { if (await subir({ imagen: true })) renderEditor({ conservarScroll: true }); } }),
      el('button', { type: 'button', class: 'p-btn p-btn-borde', text: 'Subir documento (PDF, Word, Excel…)', onclick: async () => { const r = await subir(); if (r) { renderEditor({ conservarScroll: true }); copiar(r); } } })));
    tarjetaNuevos.append(el('p', { class: 'p-ayuda', text: 'Para enlazar un documento desde un botón, copia su dirección y pégala en el campo «Lleva a».' }));
    cont.append(tarjetaNuevos);

    const usadas = el('section', { class: 'p-tarjeta' }, el('h2', { text: 'Imágenes del sitio' }),
      el('p', { text: 'Dónde se usa cada imagen. Haz clic en «Editar» para cambiarla.' }));
    const rejilla = el('div', { class: 'p-rejilla-archivos' });
    CAMPOS.filter((c) => c.def.tipo === 'imagen').forEach((c) => {
      const ruta = obtener(E.borrador[c.archivo], c.def.ruta) || '';
      const mini = el('div', { class: 'p-miniatura' });
      if (ruta) mini.append(el('img', { src: srcVista(ruta), alt: '' })); else mini.textContent = 'Sin imagen';
      rejilla.append(el('div', { class: 'p-archivo' }, mini, el('div', { class: 'p-archivo-info' },
        el('strong', { text: `${c.seccion.titulo} › ${c.def.etiqueta}` }),
        el('span', { class: 'p-ruta', text: ruta || '—' }),
        el('div', { class: 'p-botonera' }, el('button', { type: 'button', class: 'p-btn p-btn-borde p-btn-chico', text: 'Editar', onclick: () => irA(c.seccion.id) })))));
    });
    usadas.append(rejilla);
    cont.append(usadas);
  }

  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); aviso('Dirección copiada: ' + texto, 'exito', 3500); }
    catch (e) { aviso('Dirección: ' + texto, '', 8000); }
  }

  // ---------- Publicar ----------
  function describirValor(v) {
    if (v == null || v === '') return '(vacío)';
    if (typeof v === 'string' || typeof v === 'number') return recortar(v, 80);
    if (Array.isArray(v)) return v.length === 1 ? '1 elemento' : v.length + ' elementos';
    if (v.texto !== undefined) return `${recortar(v.texto || '(sin texto)', 40)} → ${v.enlace || '(sin enlace)'}`;
    return 'datos modificados';
  }

  function listaDeCambios() {
    const ul = el('ul', { class: 'p-cambios' });
    cambios().forEach((c) => {
      const antes = valorCampo(c.def, c.archivo, E.base);
      const despues = valorCampo(c.def, c.archivo, E.borrador);
      ul.append(el('li', {},
        el('span', { class: 'p-donde' }, `${c.def.etiqueta} `, el('span', { text: `· ${c.seccion.titulo} › ${c.grupo.titulo}` })),
        el('button', { type: 'button', class: 'p-enlace-sutil', style: 'background:none;border:none;padding:0;', text: 'Ver', onclick: () => irA(c.seccion.id) }),
        ['lista', 'serie'].includes(c.def.tipo)
          ? el('span', { class: 'p-antes-despues', text: c.def.tipo === 'serie' ? 'Datos del gráfico modificados'
            : (Array.isArray(antes) && Array.isArray(despues) && antes.length === despues.length) ? `Se editó el contenido (${describirValor(despues)})`
            : `${describirValor(antes)} → ${describirValor(despues)}` })
          : el('span', { class: 'p-antes-despues' }, el('del', { text: describirValor(antes) }), ' → ', el('ins', { text: describirValor(despues) }))));
    });
    archivosPendientes().forEach((r) => ul.append(el('li', {}, el('span', { class: 'p-donde' }, 'Archivo nuevo ', el('span', { text: '· ' + r })))));
    return ul;
  }

  function renderPublicar(cont) {
    const n = cambios().length + archivosPendientes().length;
    const resumen = el('section', { class: 'p-tarjeta' }, el('h2', { text: n ? `Cambios sin publicar (${n})` : 'No hay cambios sin publicar' }));
    if (n) {
      resumen.append(el('p', { text: 'Esto es lo que cambiará en el sitio. Tus cambios ya están guardados en este navegador.' }), listaDeCambios());
      resumen.append(el('div', { class: 'p-acciones-fila', style: 'margin-top:14px;' },
        el('button', { type: 'button', class: 'p-btn p-btn-peligro', text: 'Descartar todos los cambios', onclick: descartarTodo })));
    } else resumen.append(el('p', { text: 'Todo lo que ves en el panel es lo que está publicado.' }));
    cont.append(resumen);
    archivosFaltantes().then((faltan) => {
      if (!faltan.length || !resumen.isConnected) return;
      resumen.after(el('div', { class: 'p-aviso alerta' },
        el('p', {}, el('strong', { text: 'Enlaces rotos: ' }), 'estos archivos no están en el sitio ni en este navegador. Vuelve a subirlos o cambia el enlace antes de publicar.'),
        el('ul', {}, faltan.map((r) => el('li', {}, el('code', { text: r }))))));
    });

    // GitHub
    const gh = configGitHub();
    const tarjetaGH = el('section', { class: 'p-tarjeta' }, el('h2', { text: 'Publicar en GitHub' }),
      el('p', { text: 'Si el sitio está en GitHub (GitHub Pages o Netlify conectado al repositorio), el panel guarda los cambios directamente con un solo commit.' }));
    const campo = (id, etiqueta, valor, extra = {}) => el('div', { class: extra.ancho ? 'ancho' : '' },
      el('label', { for: id, text: etiqueta }), el('input', Object.assign({ id, type: 'text', value: valor || '' }, extra.attrs || {})));
    const form = el('div', { class: 'p-form-gh' },
      campo('gh-repo', 'Repositorio (usuario/nombre)', gh.repo, { attrs: { placeholder: 'mi-usuario/economia-unitropico', autocomplete: 'off', spellcheck: 'false' } }),
      campo('gh-rama', 'Rama', gh.rama || 'main', { attrs: { placeholder: 'main' } }),
      campo('gh-carpeta', 'Carpeta del sitio dentro del repositorio (si no está en la raíz)', gh.carpeta, { ancho: true, attrs: { placeholder: 'Déjalo vacío si index.html está en la raíz' } }),
      campo('gh-token', 'Token de acceso personal', tokenGitHub(), { ancho: true, attrs: { type: 'password', autocomplete: 'off', placeholder: 'github_pat_…' } }),
      el('label', { class: 'p-casilla ancho' }, el('input', { type: 'checkbox', id: 'gh-recordar', checked: !!localStorage.getItem(CLAVES.token) }), 'Recordar el token en este navegador (no lo marques en computadores compartidos)'));
    tarjetaGH.append(form);
    if (E.conectado) tarjetaGH.append(el('div', { class: 'p-aviso exito' }, el('p', { text: `Conectado a ${gh.repo} (${gh.rama || 'main'}).` })));
    tarjetaGH.append(el('div', { class: 'p-acciones-fila' },
      el('button', { type: 'button', class: 'p-btn p-btn-borde', text: E.conectado ? 'Volver a verificar' : 'Conectar y verificar', onclick: () => conectarGitHub(true) }),
      el('button', { type: 'button', class: 'p-btn p-btn-dorado', text: 'Publicar en GitHub', disabled: !n, onclick: publicarGitHub }),
      tokenGitHub() ? el('button', { type: 'button', class: 'p-btn p-btn-peligro p-btn-chico', text: 'Olvidar token', onclick: () => { localStorage.removeItem(CLAVES.token); sessionStorage.removeItem(CLAVES.token); E.conectado = false; renderEditor({ conservarScroll: true }); aviso('Token borrado de este navegador.'); } }) : null));
    tarjetaGH.append(el('details', { class: 'p-detalles' }, el('summary', { text: '¿Cómo creo el token?' }),
      el('ol', {},
        el('li', {}, 'Entra a GitHub → Settings → Developer settings → Personal access tokens → ', el('strong', { text: 'Fine-grained tokens' }), ' → Generate new token.'),
        el('li', {}, 'En «Repository access» elige ', el('strong', { text: 'Only select repositories' }), ' y marca solo el repositorio del sitio.'),
        el('li', {}, 'En «Permissions» → Repository permissions → ', el('strong', { text: 'Contents: Read and write' }), '. No hace falta nada más.'),
        el('li', {}, 'Ponle fecha de vencimiento, cópialo y pégalo aquí. Solo se guarda en este navegador; nunca se sube al sitio.'))));
    cont.append(tarjetaGH);

    // ZIP
    cont.append(el('section', { class: 'p-tarjeta' }, el('h2', { text: 'Descargar para subir a mano' }),
      el('p', { text: 'Para cualquier hosting (servidor de la universidad, cPanel, FTP, Netlify Drop…).' }),
      el('ol', { class: 'p-pasos' },
        el('li', {}, 'Descarga el paquete .zip.'),
        el('li', {}, 'Descomprímelo dentro de la carpeta del sitio y acepta reemplazar los archivos: actualiza ', el('code', { text: 'data/' }), ' y agrega las imágenes nuevas en ', el('code', { text: 'assets/subidas/' }), '.'),
        el('li', {}, 'Sube esa carpeta al hosting como lo haces normalmente.')),
      el('button', { type: 'button', class: 'p-btn p-btn-oscuro', text: 'Descargar .zip', onclick: descargarZip })));
  }

  async function descartarTodo() {
    const ok = await confirmar({ titulo: '¿Descartar todos los cambios?', texto: 'Se borran los cambios y los archivos nuevos de este navegador. Lo publicado no se toca.', si: 'Descartar', peligro: true });
    if (!ok) return;
    E.borrador = clonar(E.base);
    olvidarArchivosBD(Object.keys(E.archivos));
    E.archivos = {};
    localStorage.removeItem(CLAVES.parche);
    actualizarDatalist();
    guardar(true);
    renderEditor();
    aviso('Cambios descartados.');
  }

  // ---------------------------------------------------------
  // Exportar: .zip
  // ---------------------------------------------------------
  const utf8 = (s) => new TextEncoder().encode(s);
  const jsonBonito = (o) => JSON.stringify(o, null, 2) + '\n';
  const dataURLaBytes = (d) => Uint8Array.from(atob(d.split(',')[1]), (c) => c.charCodeAt(0));
  function bytesABase64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  function archivosParaPublicar({ todos = false } = {}) {
    const lista = [];
    const conCambios = new Set(cambios().map((c) => c.archivo));
    if (todos || conCambios.has('contenido')) lista.push({ ruta: 'data/contenido.json', datos: utf8(jsonBonito(E.borrador.contenido)) });
    if (todos || conCambios.has('indicadores')) lista.push({ ruta: 'data/indicadores.json', datos: utf8(jsonBonito(E.borrador.indicadores)) });
    archivosPendientes().forEach((r) => lista.push({ ruta: r, datos: dataURLaBytes(E.archivos[r].dataURL) }));
    return lista;
  }

  // Rutas a archivos subidos que no están ni en este navegador ni en el sitio
  async function archivosFaltantes() {
    const rutas = new Set();
    const recorrer = (o) => {
      if (typeof o === 'string') {
        const r = o.trim().split('#')[0].split('?')[0];
        if (/^assets\/(subidas|img)\//.test(r)) rutas.add(r);
      } else if (o && typeof o === 'object') Object.values(o).forEach(recorrer);
    };
    recorrer(E.borrador);
    const faltan = [];
    for (const r of rutas) {
      if (E.archivos[r]) continue;
      if ((await paginaExiste(r)) === false) faltan.push(r);
    }
    return faltan;
  }

  async function confirmarFaltantes(accion) {
    const faltan = await archivosFaltantes();
    if (!faltan.length) return true;
    return confirmar({
      titulo: 'Hay enlaces a archivos que no existen',
      texto: [
        el('p', { text: 'Estos archivos no están en el sitio ni guardados en este navegador. Los botones o imágenes que los usan quedarían rotos:' }),
        el('ul', {}, faltan.map((r) => el('li', {}, el('code', { text: r })))),
        el('p', { text: 'Vuelve a subirlos desde el campo donde se usan, o cambia ese enlace.' })
      ],
      si: accion + ' igual', no: 'Revisar primero', peligro: true
    });
  }

  async function descargarZip() {
    if (!(await confirmarFaltantes('Descargar'))) return;
    const archivos = archivosParaPublicar({ todos: true });
    const blob = crearZip(archivos);
    const a = el('a', { href: URL.createObjectURL(blob), download: `contenido-sitio-${new Date().toISOString().slice(0, 10)}.zip` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    confirmar({
      titulo: 'Paquete descargado',
      texto: [
        el('p', { text: `Contiene ${archivos.length} archivo${archivos.length === 1 ? '' : 's'}: los datos del sitio${archivosPendientes().length ? ' y las imágenes o documentos nuevos' : ''}.` }),
        el('ol', {}, el('li', { text: 'Descomprímelo dentro de la carpeta del sitio y acepta reemplazar.' }), el('li', { text: 'Sube la carpeta a tu hosting.' })),
        el('p', { text: 'El panel seguirá mostrando los cambios como «sin publicar» hasta que los subas y vuelvas a abrirlo.' })
      ],
      si: 'Entendido', no: null
    });
  }

  // ---------------------------------------------------------
  // Publicar: GitHub
  // ---------------------------------------------------------
  function configGitHub() { return Object.assign({ repo: '', rama: 'main', carpeta: '' }, leerLS(CLAVES.github) || {}); }
  function tokenGitHub() { return sessionStorage.getItem(CLAVES.token) || localStorage.getItem(CLAVES.token) || ''; }

  function leerFormularioGH() {
    if (!$('#gh-repo')) return configGitHub();
    const cfg = {
      repo: $('#gh-repo').value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, '').replace(/\/+$/, ''),
      rama: $('#gh-rama').value.trim() || 'main',
      carpeta: $('#gh-carpeta').value.trim().replace(/^\/+|\/+$/g, '')
    };
    escribirLS(CLAVES.github, cfg);
    const token = $('#gh-token').value.trim();
    sessionStorage.removeItem(CLAVES.token); localStorage.removeItem(CLAVES.token);
    if (token) ($('#gh-recordar').checked ? localStorage : sessionStorage).setItem(CLAVES.token, token);
    return cfg;
  }

  async function gh(cfg, ruta, opciones = {}) {
    const r = await fetch('https://api.github.com' + ruta, Object.assign({}, opciones, {
      headers: Object.assign({
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: 'Bearer ' + tokenGitHub()
      }, opciones.body ? { 'Content-Type': 'application/json' } : {})
    }));
    if (!r.ok) {
      let mensaje = '';
      try { mensaje = (await r.json()).message || ''; } catch (e) { /* sin cuerpo */ }
      const err = new Error(mensaje || 'HTTP ' + r.status);
      err.status = r.status;
      throw err;
    }
    return r.status === 204 ? null : r.json();
  }
  const rutaRepo = (cfg, p) => (cfg.carpeta ? cfg.carpeta + '/' + p : p);
  const codificarRuta = (p) => p.split('/').map(encodeURIComponent).join('/');

  function explicarError(e) {
    if (e.status === 401) return 'El token no es válido o ya venció.';
    if (e.status === 403) return 'El token no tiene permiso de escritura. Necesita «Contents: Read and write» sobre este repositorio.';
    if (e.status === 404) return 'No encuentro el repositorio, la rama o la carpeta. Revisa los datos y que el token tenga acceso a ese repositorio.';
    if (e.status === 409 || e.status === 422) return 'La rama cambió mientras publicabas. Inténtalo de nuevo.';
    if (e instanceof TypeError) return 'No hay conexión con GitHub. Revisa tu internet.';
    return 'GitHub respondió: ' + e.message;
  }

  async function leerRemoto(cfg, ruta) {
    try {
      const r = await gh(cfg, `/repos/${cfg.repo}/contents/${codificarRuta(rutaRepo(cfg, ruta))}?ref=${encodeURIComponent(cfg.rama)}`);
      const texto = new TextDecoder().decode(Uint8Array.from(atob(r.content.replace(/\n/g, '')), (c) => c.charCodeAt(0)));
      return { sha: r.sha, datos: JSON.parse(texto) };
    } catch (e) {
      if (e.status === 404) return { sha: null, datos: null };
      throw e;
    }
  }

  async function conectarGitHub(mostrar = false) {
    const cfg = leerFormularioGH();
    if (!/^[\w.-]+\/[\w.-]+$/.test(cfg.repo)) { aviso('Escribe el repositorio como usuario/nombre.', 'alerta'); return false; }
    if (!tokenGitHub()) { aviso('Pega el token de acceso.', 'alerta'); return false; }
    try {
      const repo = await gh(cfg, `/repos/${cfg.repo}`);
      if (repo.permissions && repo.permissions.push === false) throw Object.assign(new Error('sin permiso'), { status: 403 });
      const [rc, ri] = await Promise.all([leerRemoto(cfg, 'data/contenido.json'), leerRemoto(cfg, 'data/indicadores.json')]);
      if (!rc.sha) {
        aviso(`No encuentro data/contenido.json en ${cfg.repo}${cfg.carpeta ? '/' + cfg.carpeta : ''}. ¿La carpeta del sitio es correcta? Si es la primera vez, sube antes el sitio completo.`, 'alerta', 9000);
        return false;
      }
      E.shas = { contenido: rc.sha, indicadores: ri.sha };
      E.conectado = true;
      // ¿Lo que hay en GitHub es más nuevo que lo que vemos?
      const distinto = !igual(rc.datos, E.base.contenido) || (ri.datos && !igual(ri.datos, E.base.indicadores));
      if (distinto) {
        const hayCambios = cambios().length > 0;
        const usar = await confirmar({
          titulo: 'GitHub tiene una versión más reciente',
          texto: hayCambios
            ? ['El contenido en GitHub es distinto del que cargó el panel (puede ser que el sitio aún se esté actualizando o que alguien más publicó).', 'Si la usas como base, tus cambios se conservan y se aplican encima.']
            : ['El contenido en GitHub es distinto del que cargó el panel. ¿Quieres usar la versión de GitHub como punto de partida?'],
          si: 'Usar la versión de GitHub', no: 'Mantener la actual'
        });
        if (usar) {
          const parche = cambios().map((c) => ({ def: c.def, archivo: c.archivo, valor: valorCampo(c.def, c.archivo, E.borrador) }));
          E.base = { contenido: rc.datos, indicadores: ri.datos || E.base.indicadores };
          E.borrador = clonar(E.base);
          parche.forEach((p) => fijarCampo(p.def, p.archivo, E.borrador, p.valor));
          guardar(true);
        }
      }
      if (mostrar) aviso(`Conectado a ${cfg.repo}.`, 'exito');
      renderEditor({ conservarScroll: true });
      return true;
    } catch (e) {
      E.conectado = false;
      aviso(explicarError(e), 'alerta', 9000);
      return false;
    }
  }

  async function publicarGitHub() {
    const cfg = leerFormularioGH();
    if (!E.conectado && !(await conectarGitHub())) return;
    const archivos = archivosParaPublicar();
    if (!archivos.length) { aviso('No hay cambios para publicar.'); return; }
    if (!(await confirmarFaltantes('Publicar'))) return;

    const ok = await confirmar({
      titulo: '¿Publicar los cambios?',
      texto: [el('p', { text: `Se guardarán ${archivos.length} archivo${archivos.length === 1 ? '' : 's'} en ${cfg.repo} (${cfg.rama}):` }),
        el('ul', {}, archivos.map((a) => el('li', { text: a.ruta }))),
        el('p', { text: 'El sitio público se actualiza en 1 a 2 minutos.' })],
      si: 'Publicar'
    });
    if (!ok) return;

    const boton = $$('button').find((b) => b.textContent === 'Publicar en GitHub');
    if (boton) { boton.disabled = true; boton.textContent = 'Publicando…'; }
    try {
      // ¿Alguien publicó después de conectar?
      const [rc, ri] = await Promise.all([leerRemoto(cfg, 'data/contenido.json'), leerRemoto(cfg, 'data/indicadores.json')]);
      if (rc.sha !== E.shas.contenido || ri.sha !== E.shas.indicadores) {
        const seguir = await confirmar({
          titulo: 'Alguien publicó mientras editabas',
          texto: 'El contenido en GitHub cambió después de que conectaste el panel. Si continúas, reemplazarás esos cambios con los tuyos. Para combinarlos, cancela y usa «Volver a verificar».',
          si: 'Reemplazar y publicar', peligro: true
        });
        if (!seguir) return;
      }
      const ref = await gh(cfg, `/repos/${cfg.repo}/git/ref/heads/${codificarRuta(cfg.rama)}`);
      const padre = await gh(cfg, `/repos/${cfg.repo}/git/commits/${ref.object.sha}`);
      const arbol = [];
      for (const a of archivos) {
        const blob = await gh(cfg, `/repos/${cfg.repo}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: bytesABase64(a.datos), encoding: 'base64' }) });
        arbol.push({ path: rutaRepo(cfg, a.ruta), mode: '100644', type: 'blob', sha: blob.sha, ruta: a.ruta });
      }
      const tree = await gh(cfg, `/repos/${cfg.repo}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: padre.tree.sha, tree: arbol.map(({ ruta, ...t }) => t) }) });
      const fecha = new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
      const commit = await gh(cfg, `/repos/${cfg.repo}/git/commits`, { method: 'POST', body: JSON.stringify({ message: `Actualización de contenido desde el panel (${fecha})`, tree: tree.sha, parents: [ref.object.sha] }) });
      await gh(cfg, `/repos/${cfg.repo}/git/refs/heads/${codificarRuta(cfg.rama)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });

      // Lo publicado pasa a ser la nueva base
      arbol.forEach((t) => {
        if (t.ruta === 'data/contenido.json') E.shas.contenido = t.sha;
        if (t.ruta === 'data/indicadores.json') E.shas.indicadores = t.sha;
      });
      Object.entries(E.archivos).forEach(([r, a]) => { if (a.esImagen) E.cacheVista[r] = a.dataURL; E.existe[r] = true; });
      olvidarArchivosBD(Object.keys(E.archivos));
      E.archivos = {};
      E.base = clonar(E.borrador);
      localStorage.removeItem(CLAVES.parche);
      guardar(true);
      actualizarDatalist();
      renderEditor();
      const enlace = el('span', {}, '¡Publicado! El sitio se actualiza en 1–2 minutos. ', commit.html_url ? el('a', { href: commit.html_url, target: '_blank', rel: 'noopener', text: 'Ver el commit' }) : '');
      aviso(enlace, 'exito', 10000);
    } catch (e) {
      aviso(explicarError(e), 'alerta', 10000);
    } finally {
      if (boton && boton.isConnected) { boton.disabled = false; boton.textContent = 'Publicar en GitHub'; }
    }
  }

  // ---------------------------------------------------------
  // Vista previa
  // ---------------------------------------------------------
  function cambiarPagina(pagina) {
    E.pagina = pagina;
    $('#vista-pagina').value = pagina;
    const url = RAIZ + pagina + '?borrador=1';
    $('#iframe-vista').src = url;
    $('#vista-abrir').href = url;
  }

  function ajustarVista() {
    const marco = $('#marco');
    const iframe = $('#iframe-vista');
    const ancho = E.dispositivo === 'movil' ? 390 : 1280;
    const disponible = marco.clientWidth - (E.dispositivo === 'movil' ? 24 : 0);
    const escala = Math.min(1, disponible / ancho);
    marco.classList.toggle('movil', E.dispositivo === 'movil');
    iframe.style.width = ancho + 'px';
    if (E.dispositivo === 'movil') {
      const alto = Math.min(844, (marco.clientHeight - 24) / escala);
      iframe.style.height = alto + 'px';
      iframe.style.top = '12px';
      iframe.style.transform = `translateX(-50%) scale(${escala})`;
      iframe.style.transformOrigin = '50% 0';
    } else {
      iframe.style.height = marco.clientHeight / escala + 'px';
      iframe.style.top = '0';
      iframe.style.transform = `scale(${escala})`;
      iframe.style.transformOrigin = '0 0';
    }
  }

  function prepararVista() {
    $('#vista-pagina').addEventListener('change', (e) => cambiarPagina(e.target.value));
    $$('[data-dispositivo]').forEach((b) => b.addEventListener('click', () => {
      E.dispositivo = b.dataset.dispositivo;
      $$('[data-dispositivo]').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      ajustarVista();
    }));
    const alternar = (mostrar) => {
      const cuerpo = $('#cuerpo');
      cuerpo.classList.toggle('con-vista', mostrar);
      $('#btn-vista').setAttribute('aria-pressed', mostrar ? 'true' : 'false');
      try { localStorage.setItem('cc-vista', mostrar ? '1' : '0'); } catch (e) { /* sin acción */ }
      requestAnimationFrame(ajustarVista);
    };
    $('#btn-vista').addEventListener('click', () => alternar(!$('#cuerpo').classList.contains('con-vista')));
    $('#vista-cerrar').addEventListener('click', () => alternar(false));
    const preferencia = localStorage.getItem('cc-vista');
    alternar(preferencia === null ? window.innerWidth > 1180 : preferencia === '1');
    window.addEventListener('resize', ajustarVista);
    if ('ResizeObserver' in window) new ResizeObserver(ajustarVista).observe($('#marco'));
  }

  // ---------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------
  async function cargarJSON(ruta) {
    const r = await fetch(RAIZ + ruta, { cache: 'no-store' });
    if (!r.ok) throw new Error(ruta + ': HTTP ' + r.status);
    return r.json();
  }

  function pantallaSinDatos(error) {
    const editor = $('#editor');
    const leer = (input) => new Promise((ok, mal) => {
      const f = input.files[0];
      if (!f) return ok(null);
      f.text().then((t) => ok(JSON.parse(t))).catch(mal);
    });
    const inC = el('input', { type: 'file', accept: '.json,application/json', id: 'imp-contenido' });
    const inI = el('input', { type: 'file', accept: '.json,application/json', id: 'imp-indicadores' });
    editor.replaceChildren(el('div', { class: 'p-editor-interior' },
      el('div', { class: 'p-seccion-cabecera' }, el('div', {}, el('h1', { text: 'No pude leer el contenido del sitio' }),
        el('p', { text: 'El panel necesita abrir data/contenido.json y data/indicadores.json.' }))),
      el('div', { class: 'p-aviso alerta' }, el('p', { text: String(error && error.message || error) })),
      el('section', { class: 'p-tarjeta' }, el('h2', { text: 'Cómo solucionarlo' }),
        el('ol', { class: 'p-pasos' },
          el('li', {}, 'Abre el panel desde el sitio publicado: ', el('code', { text: 'https://tu-sitio/panel/' }), '.'),
          el('li', {}, 'O, en tu computador, abre la carpeta del sitio con un servidor local (por ejemplo la extensión «Live Server» de VS Code). Abrir el archivo con doble clic no funciona porque el navegador bloquea la lectura de archivos.'),
          el('li', {}, 'O carga los dos archivos a mano aquí abajo.'))),
      el('section', { class: 'p-tarjeta' }, el('h2', { text: 'Cargar los archivos a mano' }),
        el('div', { class: 'p-form-gh' },
          el('div', {}, el('label', { for: 'imp-contenido', text: 'data/contenido.json' }), inC),
          el('div', {}, el('label', { for: 'imp-indicadores', text: 'data/indicadores.json' }), inI)),
        el('button', {
          type: 'button', class: 'p-btn p-btn-oscuro', text: 'Abrir',
          onclick: async () => {
            try {
              const [c, i] = await Promise.all([leer(inC), leer(inI)]);
              if (!c || !i) { aviso('Elige los dos archivos.', 'alerta'); return; }
              iniciar({ contenido: c, indicadores: i });
            } catch (e) { aviso('Uno de los archivos no es un JSON válido.', 'alerta'); }
          }
        }))));
    $('#estado').textContent = 'Sin datos';
  }

  // Recupera los archivos subidos que siguen guardados en este navegador.
  // Si ya están en el sitio (se publicaron con el .zip), dejan de estar pendientes.
  async function restaurarArchivos() {
    let guardados = {};
    try { guardados = await leerArchivosBD(); } catch (e) { guardados = {}; }
    for (const [ruta, reg] of Object.entries(guardados)) {
      if (!reg || !reg.blob) continue;
      E.archivos[ruta] = {
        dataURL: await leerComoDataURL(reg.blob), tipo: reg.tipo, tamano: reg.tamano,
        nombre: reg.nombre, esImagen: reg.esImagen, soloMemoria: false
      };
    }
    const yaPublicados = [];
    for (const ruta of Object.keys(E.archivos)) {
      if ((await paginaExiste(ruta)) === true) yaPublicados.push(ruta);
    }
    yaPublicados.forEach((r) => { delete E.archivos[r]; });
    olvidarArchivosBD(yaPublicados);
    actualizarDatalist();
    guardar(true);
    renderEditor({ conservarScroll: true });
  }

  function iniciar(base) {
    E.base = base;
    E.borrador = clonar(base);

    // Recuperar trabajo sin publicar de una sesión anterior
    const parche = leerLS(CLAVES.parche);
    let recuperados = 0;
    if (parche && Array.isArray(parche.items)) {
      parche.items.forEach((p) => {
        const c = CAMPOS.find((x) => x.def.ruta === p.ruta && x.archivo === p.archivo);
        if (!c) return;
        fijarCampo(c.def, c.archivo, E.borrador, p.valor);
        recuperados++;
      });
    }
    // Respaldo antiguo: imágenes de la vista previa guardadas en localStorage
    const imagenes = leerLS(CLAVES.archivos) || {};
    Object.entries(imagenes).forEach(([ruta, dataURL]) => {
      if (!JSON.stringify(E.borrador).includes(ruta)) return; // solo las que siguen en uso
      const tipo = (dataURL.match(/^data:([^;]+)/) || [])[1] || 'image/jpeg';
      E.archivos[ruta] = { dataURL, tipo, tamano: Math.round(dataURL.length * 0.75), nombre: ruta.split('/').pop(), esImagen: true, soloMemoria: false };
    });

    renderLateral();
    actualizarDatalist();
    let inicial = 'general';
    try { inicial = sessionStorage.getItem('cc-seccion') || 'general'; } catch (e) { /* sin acción */ }
    if (!ESQUEMA.some((s) => s.id === inicial)) inicial = 'general';
    guardar(true);
    cambiarPagina((ESQUEMA.find((s) => s.id === inicial) || {}).pagina || 'index.html');
    irA(inicial);
    restaurarArchivos();
    if (recuperados) {
      const fecha = new Date(parche.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
      aviso(`Recuperé ${recuperados} cambio${recuperados === 1 ? '' : 's'} sin publicar (guardado${recuperados === 1 ? '' : 's'} el ${fecha}).`, '', 7000);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    prepararVista();
    $('#btn-zip').addEventListener('click', descargarZip);
    $('#btn-publicar').addEventListener('click', () => irA('publicar'));
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (E.borrador) { guardar(true); aviso('Guardado en este navegador. Para que se vea en el sitio, publica.', '', 3500); }
      }
    });
    window.addEventListener('beforeunload', (e) => {
      if (Object.values(E.archivos).some((a) => a.soloMemoria)) { e.preventDefault(); e.returnValue = ''; }
    });
    try {
      const [contenido, indicadores] = await Promise.all([cargarJSON('data/contenido.json'), cargarJSON('data/indicadores.json')]);
      iniciar({ contenido, indicadores });
    } catch (e) {
      pantallaSinDatos(e);
    }
  });
})();
