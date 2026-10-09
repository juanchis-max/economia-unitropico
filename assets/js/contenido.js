// =========================================================
// contenido.js — Aplica data/contenido.json a la página.
//
// Las páginas traen su contenido escrito en el HTML (sirve si
// el JSON no carga). Este archivo lo reemplaza con lo que se
// edite desde el panel (panel/index.html).
//
// Atributos que entiende:
//   data-c="ruta"          texto (admite **negrita**, [texto](enlace) y saltos de línea)
//   data-c-href="ruta"     enlace
//   data-c-src="ruta"      imagen        data-c-alt="ruta"  texto alternativo
//   data-c-boton="ruta"    { texto, enlace } — se oculta si falta alguno
//   data-c-correo="ruta"   correo (texto + mailto:)
//   data-c-fondo="ruta"    imagen de fondo opcional de una sección
//   data-c-menu            menú principal (general.menu), marca la página activa
//   data-c-lista="ruta"    repite su <template> por cada elemento de la lista;
//                          dentro de la plantilla se usa data-ci, data-ci-href,
//                          data-ci-boton, data-ci-icono y data-ci-src (rutas relativas)
//
// Vista previa: con ?borrador=1 en la dirección se usa el borrador que
// guarda el panel en este navegador y se actualiza en vivo.
// =========================================================

(function () {
  'use strict';

  var BORRADOR = /[?&]borrador=1\b/.test(location.search);
  var CLAVE_BORRADOR = 'cc-borrador';
  var CLAVE_ARCHIVOS = 'cc-archivos';
  var estado = { contenido: null, indicadores: null, archivos: {} };

  var ICONOS = {
    grafico: 'M7 12l3-3 3 3 4-4M3 4h18v14a1 1 0 01-1 1H4a1 1 0 01-1-1V4z',
    libro: 'M12 6.25v13m0-13C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5c1.75 0 3.33.48 4.5 1.25v13c-1.17-.77-2.75-1.25-4.5-1.25-1.75 0-3.33.48-4.5 1.25',
    personas: 'M17 20h5v-2a3 3 0 00-5.36-1.86M9 20H4v-2a3 3 0 015.36-1.86M9 20v-2a5 5 0 0110 0v2M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    imagen: 'M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    documento: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    calendario: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    mapa: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    hoja: 'M11 20A7 7 0 019.8 6.1C15.5 5 20 5 20 5s0 4.5-1.1 10.2A7 7 0 0111 20zM11 20v-9',
    birrete: 'M12 14l9-5-9-5-9 5 9 5zm0 0v6m-6.16-9.42A12.08 12.08 0 006 17.06 11.95 11.95 0 0012 20a11.95 11.95 0 006-2.94 12.08 12.08 0 00.16-6.48',
    megafono: 'M11 5.88V19.24a1.76 1.76 0 01-3.42.59l-2.15-6.15M18 13a3 3 0 100-6M5.44 13.68A4 4 0 017 6h1.83C12.93 6 16.46 4.77 18 3v14c-1.54-1.77-5.07-3-9.17-3H7a4 4 0 01-1.56-.32z'
  };

  // ---------- utilidades ----------
  function leerLS(clave) {
    try { return JSON.parse(localStorage.getItem(clave) || 'null'); } catch (e) { return null; }
  }
  function obtenerJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function obtener(obj, ruta) {
    if (!ruta) return obj;
    return ruta.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function escapar(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function urlSegura(u) {
    u = String(u || '').trim();
    var esquema = u.match(/^([a-z][a-z0-9+.-]*):/i);
    if (esquema && ['http', 'https', 'mailto', 'tel'].indexOf(esquema[1].toLowerCase()) === -1) return '#';
    return u;
  }
  function rutaArchivo(ruta) {
    // En la vista previa, las imágenes recién subidas aún no existen en el sitio
    return (BORRADOR && estado.archivos[ruta]) || ruta;
  }
  function plazo() {
    return obtener(estado.contenido, 'contacto.datos.tiempoRespuesta') || '';
  }
  function formatear(texto) {
    var h = escapar(texto).replace(/\{plazo\}/g, escapar(plazo()));
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
      return '<a href="' + urlSegura(u) + '">' + t + '</a>';
    });
    return h.replace(/\n/g, '<br>');
  }
  function paginaActual() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  // ---------- aplicar un valor a un elemento ----------
  function ponerTexto(el, v) {
    el.innerHTML = formatear(v == null ? '' : v);
    if (el.hasAttribute('data-c-ocultar-vacio') || el.hasAttribute('data-ci-ocultar-vacio')) el.hidden = !String(v || '').trim();
  }
  function ponerBoton(el, v) {
    var ok = v && String(v.texto || '').trim() && String(v.enlace || '').trim();
    el.hidden = !ok;
    if (!ok) return;
    el.textContent = v.texto;
    el.setAttribute('href', urlSegura(v.enlace));
    if (/\.(pdf|docx?|xlsx?|pptx?|zip|csv)$/i.test(v.enlace)) el.setAttribute('download', '');
    else el.removeAttribute('download');
  }
  function ponerIcono(svg, nombre) {
    var d = ICONOS[nombre] || ICONOS.grafico;
    svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="' + d + '"/>';
  }
  function ponerImagen(img, v) {
    if (!v) { img.hidden = true; return; }
    img.hidden = false;
    img.setAttribute('src', rutaArchivo(v));
  }

  function aplicarElementos(raiz, base, prefijo) {
    var p = prefijo; // 'c' para el documento, 'ci' dentro de listas
    function cada(attr, fn) {
      raiz.querySelectorAll('[data-' + p + attr + ']').forEach(function (el) {
        var ruta = el.getAttribute('data-' + p + attr);
        var v = obtener(base, ruta);
        if (v === undefined) return; // si falta el dato, se conserva el HTML original
        fn(el, v);
      });
    }
    cada('', ponerTexto);
    cada('-href', function (el, v) { el.setAttribute('href', urlSegura(v)); });
    cada('-boton', ponerBoton);
    cada('-src', ponerImagen);
    cada('-alt', function (el, v) { el.setAttribute('alt', v); });
    cada('-icono', ponerIcono);
    cada('-correo', function (el, v) { el.textContent = v; el.setAttribute('href', 'mailto:' + v); el.hidden = !v; });
  }

  function renderLista(cont, lista) {
    var tpl = cont.querySelector(':scope > template');
    if (!tpl || !Array.isArray(lista)) return;
    Array.prototype.slice.call(cont.children).forEach(function (h) { if (h !== tpl) h.remove(); });
    lista.forEach(function (item) {
      var frag = tpl.content.cloneNode(true);
      aplicarElementos(frag, item, 'ci');
      cont.appendChild(frag);
    });
    if (cont.hasAttribute('data-c-abrir-primero')) {
      var primero = cont.querySelector('.acordeon-item');
      if (primero) {
        primero.classList.add('abierto');
        var b = primero.querySelector('.acordeon-pregunta');
        if (b) b.setAttribute('aria-expanded', 'true');
      }
    }
  }

  function renderMenu(nav, menu) {
    if (!Array.isArray(menu)) return;
    var actual = paginaActual();
    nav.innerHTML = '';
    menu.forEach(function (item) {
      if (!item || !item.texto || !item.enlace) return;
      var a = document.createElement('a');
      a.textContent = item.texto;
      a.setAttribute('href', urlSegura(item.enlace));
      if (item.enlace.split('#')[0] === actual) { a.className = 'activo'; a.setAttribute('aria-current', 'page'); }
      nav.appendChild(a);
    });
  }

  function aplicar() {
    var c = estado.contenido;
    if (!c) return;
    document.querySelectorAll('[data-c-lista]').forEach(function (cont) {
      renderLista(cont, obtener(c, cont.getAttribute('data-c-lista')));
    });
    document.querySelectorAll('[data-c-menu]').forEach(function (nav) { renderMenu(nav, obtener(c, 'general.menu')); });
    aplicarElementos(document, c, 'c');
    document.querySelectorAll('[data-c-fondo]').forEach(function (sec) {
      var v = obtener(c, sec.getAttribute('data-c-fondo'));
      if (v) {
        sec.style.backgroundImage = 'linear-gradient(rgba(58,40,30,0.86), rgba(58,40,30,0.80)), url("' + rutaArchivo(v).replace(/"/g, '%22') + '")';
        sec.classList.add('con-fondo');
      } else {
        sec.style.backgroundImage = '';
        sec.classList.remove('con-fondo');
      }
    });
  }

  function quitarCargando() { document.documentElement.classList.remove('cc-cargando'); }

  // ---------- carga ----------
  function cargarBorrador() {
    var b = leerLS(CLAVE_BORRADOR);
    estado.archivos = leerLS(CLAVE_ARCHIVOS) || {};
    if (b && b.contenido) {
      estado.contenido = b.contenido;
      estado.indicadores = b.indicadores || estado.indicadores;
      return true;
    }
    return false;
  }

  function cargar() {
    if (BORRADOR && cargarBorrador()) return Promise.resolve();
    return Promise.all([
      obtenerJSON('data/contenido.json').catch(function (e) { console.warn('contenido.json no disponible; se muestra el contenido del HTML.', e); return null; }),
      obtenerJSON('data/indicadores.json').catch(function (e) { console.warn('indicadores.json no disponible.', e); return null; })
    ]).then(function (r) { estado.contenido = r[0]; estado.indicadores = r[1]; });
  }

  var domListo = new Promise(function (ok) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ok);
    else ok();
  });

  var listo = Promise.all([cargar(), domListo]).then(function () {
    aplicar();
  }).catch(function (e) {
    console.warn('No se pudo aplicar el contenido.', e);
  }).then(function () {
    quitarCargando();
  });

  setTimeout(quitarCargando, 1500); // nunca dejar la página oculta

  // ---------- vista previa en vivo ----------
  if (BORRADOR) {
    window.addEventListener('storage', function (e) {
      if (e.key !== CLAVE_BORRADOR && e.key !== CLAVE_ARCHIVOS) return;
      if (cargarBorrador()) {
        aplicar();
        document.dispatchEvent(new CustomEvent('cc:actualizado'));
      }
    });
    // Mantener el modo borrador al navegar entre páginas de la vista previa
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (/^[\w-]+\.html(#.*)?$/.test(href)) {
        e.preventDefault();
        var partes = href.split('#');
        location.href = partes[0] + '?borrador=1' + (partes[1] ? '#' + partes[1] : '');
      }
    });
    domListo.then(function () {
      var aviso = document.createElement('div');
      aviso.className = 'cc-aviso-borrador';
      aviso.textContent = 'Vista previa · cambios sin publicar';
      document.body.appendChild(aviso);
    });
  }

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  window.CC = {
    borrador: BORRADOR,
    listo: listo,
    contenido: function () { return listo.then(function () { return estado.contenido; }); },
    indicadores: function () { return listo.then(function () { return estado.indicadores; }); },
    escapar: escapar,
    formatear: formatear,
    urlSegura: urlSegura,
    // Dirección de una imagen o archivo (en la vista previa incluye los recién subidos)
    archivo: function (ruta) { return ruta ? rutaArchivo(ruta) : ''; },
    // "Coloquio de finanzas" → "coloquio-de-finanzas"
    slug: function (s) {
      return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    },
    // "2026-10-02" → "2 de octubre de 2026" (corto: "2 oct 2026")
    fecha: function (iso, corto) {
      var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
      if (!m) return String(iso || '');
      var mes = MESES[Number(m[2]) - 1] || '';
      return corto ? Number(m[3]) + ' ' + mes.slice(0, 3) + ' ' + m[1] : Number(m[3]) + ' de ' + mes + ' de ' + m[1];
    },
    // Enlace interno que conserva el modo vista previa del panel
    enlace: function (url) {
      if (!BORRADOR || /^(https?:|mailto:|tel:|#)/i.test(url)) return url;
      var partes = String(url).split('#');
      return partes[0] + (partes[0].indexOf('?') === -1 ? '?' : '&') + 'borrador=1' + (partes[1] ? '#' + partes[1] : '');
    }
  };
})();
