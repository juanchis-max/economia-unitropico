// =========================================================
// contacto.js — Lógica de contacto.html
// Pestañas (#general, #propuesta, #buzon), validación,
// envío a un servicio de formularios o, si no hay uno
// configurado en config.js, apertura del correo del visitante.
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  // Ajustes técnicos (config.js) + datos editables desde el panel (data/contenido.json)
  const ajustes = typeof CONTACTO !== 'undefined' ? CONTACTO : {};
  const PREDETERMINADOS = {
    correo: 'economia@unitropico.edu.co', direccion: '', telefono: '', whatsapp: '', horario: '',
    tiempoRespuesta: '3 días hábiles', redes: {}, responsables: {}
  };
  let cfg = Object.assign({}, PREDETERMINADOS, ajustes);

  const TIPOS = ['general', 'propuesta', 'buzon'];
  const conServicio = Boolean(ajustes.formEndpoint && String(ajustes.formEndpoint).trim());
  cfg.formEndpoint = conServicio ? String(ajustes.formEndpoint).trim() : '';
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

  // ---------------------------------------------------------
  // 1. Datos de contacto (se vuelven a aplicar si cambian en la vista previa)
  // ---------------------------------------------------------
  const nombresRedes = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', x: 'X' };
  const fila = (nombre, valor) => { $(`[data-fila="${nombre}"]`).hidden = !valor; return valor; };

  function aplicarDatos() {
    $$('[data-correo]').forEach((a) => { a.href = 'mailto:' + cfg.correo; a.textContent = cfg.correo; });
    if (cfg.direccion) $$('[data-direccion]').forEach((el) => { el.textContent = cfg.direccion; });
    $$('[data-plazo]').forEach((el) => { el.textContent = 'Respuesta en ' + cfg.tiempoRespuesta; });
    $$('[data-plazo-corto]').forEach((el) => { el.textContent = cfg.tiempoRespuesta; });

    if (fila('telefono', cfg.telefono)) {
      const a = $('[data-telefono]');
      a.textContent = cfg.telefono;
      a.href = 'tel:+57' + cfg.telefono.replace(/\D/g, '');
    }
    if (fila('whatsapp', cfg.whatsapp)) {
      const numero = cfg.whatsapp.replace(/\D/g, '');
      const a = $('[data-whatsapp]');
      a.textContent = numero.replace(/^57/, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
      a.href = 'https://wa.me/' + numero + '?text=' + encodeURIComponent('Hola, quiero información sobre el Programa de Economía.');
    }
    if (fila('horario', cfg.horario)) $('[data-horario]').textContent = cfg.horario;

    const cajaRedes = $('[data-redes]');
    cajaRedes.replaceChildren();
    Object.entries(cfg.redes || {}).forEach(([red, url]) => {
      if (!url || !/^https?:\/\//i.test(url)) return;
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = nombresRedes[red] || red;
      cajaRedes.appendChild(a);
    });
    cajaRedes.hidden = cajaRedes.children.length === 0;

    $$('[data-responsable]').forEach((el) => {
      const nombre = (cfg.responsables || {})[el.dataset.responsable];
      el.textContent = nombre ? 'A cargo: ' + nombre : '';
      el.hidden = !nombre;
    });

    // Mapa: solo se recarga si cambió la dirección
    const mapa = $('.mapa iframe');
    if (mapa && cfg.direccion) {
      const consulta = encodeURIComponent('Unitrópico, ' + cfg.direccion);
      const src = `https://maps.google.com/maps?q=${consulta}&z=16&output=embed`;
      if (mapa.getAttribute('src') !== src) mapa.setAttribute('src', src);
      const llegar = $('[data-como-llegar]');
      if (llegar) llegar.href = `https://www.google.com/maps/search/?api=1&query=${consulta}`;
    }
  }

  async function actualizarDesdeContenido() {
    const contenido = window.CC ? await CC.contenido() : null;
    const datos = contenido && contenido.contacto && contenido.contacto.datos;
    cfg = Object.assign({}, PREDETERMINADOS, ajustes, datos || {}, { formEndpoint: cfg.formEndpoint });
    aplicarDatos();
  }
  actualizarDesdeContenido();
  document.addEventListener('cc:actualizado', actualizarDesdeContenido);

  // ---------------------------------------------------------
  // 2. Copiar correo
  // ---------------------------------------------------------
  $$('[data-copiar]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(cfg.correo);
      } catch (e) {
        const t = document.createElement('textarea');
        t.value = cfg.correo; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); } catch (err) { /* sin acción */ }
        t.remove();
      }
      const original = btn.textContent;
      btn.textContent = '¡Copiado!';
      setTimeout(() => { btn.textContent = original; }, 2000);
    });
  });

  // ---------------------------------------------------------
  // 3. Pestañas y enlaces con #general / #propuesta / #buzon
  // ---------------------------------------------------------
  const tarjetaForm = $('#formulario');
  const pestanas = $$('[role="tab"]');
  const panelExito = $('#panel-exito');
  let tipoActivo = 'general';

  function activar(tipo, { desplazar = false, enfocarPestana = false } = {}) {
    if (!TIPOS.includes(tipo)) return;
    tipoActivo = tipo;
    pestanas.forEach((p) => {
      const activa = p.dataset.tab === tipo;
      p.setAttribute('aria-selected', activa ? 'true' : 'false');
      p.tabIndex = activa ? 0 : -1;
      if (activa && enfocarPestana) p.focus();
    });
    TIPOS.forEach((t) => { $('#panel-' + t).hidden = t !== tipo; });
    panelExito.hidden = true;
    $$('[data-acceso]').forEach((a) => a.setAttribute('aria-current', a.dataset.acceso === tipo ? 'true' : 'false'));
    if (location.hash !== '#' + tipo) history.replaceState(null, '', '#' + tipo);
    if (desplazar) tarjetaForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  pestanas.forEach((p, i) => {
    p.addEventListener('click', () => activar(p.dataset.tab));
    p.addEventListener('keydown', (e) => {
      let destino = null;
      if (e.key === 'ArrowRight') destino = pestanas[(i + 1) % pestanas.length];
      if (e.key === 'ArrowLeft') destino = pestanas[(i - 1 + pestanas.length) % pestanas.length];
      if (e.key === 'Home') destino = pestanas[0];
      if (e.key === 'End') destino = pestanas[pestanas.length - 1];
      if (destino) { e.preventDefault(); activar(destino.dataset.tab, { enfocarPestana: true }); }
    });
  });

  // "Escribir sobre esto": abre Contacto general con el tema elegido
  function escribirSobre(tema) {
    activar('general', { desplazar: true });
    const select = $('#g-motivo');
    select.value = tema;
    limpiarError(select);
    setTimeout(() => $('#g-nombre').focus({ preventScroll: true }), 350);
  }

  document.addEventListener('click', (e) => {
    const escribir = e.target.closest('[data-escribir]');
    if (escribir) { e.preventDefault(); escribirSobre(escribir.dataset.escribir); return; }
    const enlace = e.target.closest('a[href^="#"]');
    if (enlace) {
      const tipo = enlace.getAttribute('href').slice(1);
      if (TIPOS.includes(tipo)) { e.preventDefault(); activar(tipo, { desplazar: true }); }
    }
  });

  window.addEventListener('hashchange', () => {
    const tipo = location.hash.slice(1);
    if (TIPOS.includes(tipo) && tipo !== tipoActivo) activar(tipo, { desplazar: true });
  });

  const tipoInicial = location.hash.slice(1);
  if (TIPOS.includes(tipoInicial)) {
    activar(tipoInicial);
    // Espera a que la página se pinte para bajar hasta el formulario
    requestAnimationFrame(() => setTimeout(() => tarjetaForm.scrollIntoView({ block: 'start' }), 50));
  } else {
    activar('general');
    history.replaceState(null, '', location.pathname + location.search);
  }

  // ---------------------------------------------------------
  // 4. Contadores de caracteres y palabras
  // ---------------------------------------------------------
  const contarPalabras = (texto) => (texto.trim().match(/\S+/g) || []).length;

  $$('textarea[data-contador]').forEach((area) => {
    const contador = $('#' + area.id + '-contador');
    const max = Number(area.dataset.max);
    const actualizar = () => {
      const esPalabras = area.dataset.contador === 'palabras';
      const n = esPalabras ? contarPalabras(area.value) : area.value.length;
      contador.textContent = `${n} / ${max}${esPalabras ? ' palabras' : ''}`;
      contador.classList.toggle('excedido', n > max);
    };
    area.addEventListener('input', actualizar);
    actualizar();
  });

  // ---------------------------------------------------------
  // 5. Archivo PDF de la propuesta
  // ---------------------------------------------------------
  const MAX_MB = 10;
  const inputArchivo = $('#p-archivo');
  const zona = $('.zona-archivo');
  const nombreArchivo = $('.zona-archivo-nombre');
  const ayudaArchivo = $('#p-archivo-ayuda');

  inputArchivo.required = conServicio;
  $('[data-archivo-req]').hidden = !conServicio;
  ayudaArchivo.textContent = conServicio
    ? `Formato PDF, máximo ${MAX_MB} MB.`
    : 'Opcional aquí: al enviar se abrirá tu correo y allí deberás adjuntar el PDF.';

  const mostrarArchivo = () => {
    const f = inputArchivo.files[0];
    const peso = f && (f.size < 1048576 ? `${Math.max(1, Math.round(f.size / 1024))} KB` : `${(f.size / 1048576).toFixed(1)} MB`);
    nombreArchivo.textContent = f ? `${f.name} · ${peso}` : '';
    if (f) validarCampo(inputArchivo);
  };
  inputArchivo.addEventListener('change', mostrarArchivo);
  ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('arrastrando'); }));
  ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove('arrastrando'); }));
  zona.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files.length) {
      inputArchivo.files = e.dataTransfer.files;
      mostrarArchivo();
    }
  });

  // ---------------------------------------------------------
  // 6. Buzón anónimo
  // ---------------------------------------------------------
  const anonimo = $('#b-anonimo');
  const identidad = $('[data-identidad]');
  const avisoAnonimo = $('#b-aviso-anonimo');
  const aplicarAnonimo = () => {
    const activo = anonimo.checked;
    identidad.hidden = activo;
    $$('input', identidad).forEach((i) => { i.disabled = activo; if (activo) limpiarError(i); });
    avisoAnonimo.hidden = !activo;
    avisoAnonimo.textContent = conServicio
      ? 'No te pediremos nombre ni correo, así que no podremos responderte directamente.'
      : 'Atención: el formulario todavía no está conectado a un servicio de envío, así que el mensaje saldrá desde tu propio correo y se verá tu dirección.';
  };
  anonimo.addEventListener('change', aplicarAnonimo);
  aplicarAnonimo();

  // ---------------------------------------------------------
  // 7. Validación
  // ---------------------------------------------------------
  function mensajeError(control) {
    if (control.type === 'checkbox') return control.required && !control.checked ? 'Debes aceptar para poder enviar.' : '';
    if (control.type === 'file') {
      const f = control.files[0];
      if (!f) return control.required ? 'Adjunta tu propuesta en PDF.' : '';
      if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return 'El archivo debe ser un PDF.';
      if (f.size > MAX_MB * 1048576) return `El archivo pesa más de ${MAX_MB} MB.`;
      return '';
    }
    const valor = control.value.trim();
    if (control.required && !valor) return control.tagName === 'SELECT' ? 'Selecciona una opción.' : 'Este campo es obligatorio.';
    if (control.type === 'email' && valor && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) return 'Escribe un correo válido, por ejemplo nombre@correo.com.';
    if (control.dataset.contador === 'palabras' && contarPalabras(control.value) > Number(control.dataset.max)) return `El resumen supera las ${control.dataset.max} palabras.`;
    return '';
  }

  function validarCampo(control) {
    if (control.disabled) return true;
    const texto = mensajeError(control);
    const campo = control.closest('.campo');
    const error = $('#' + control.id + '-error');
    if (!campo || !error) return !texto;
    campo.classList.toggle('invalido', Boolean(texto));
    error.textContent = texto;
    if (texto) {
      control.setAttribute('aria-invalid', 'true');
      const desc = (control.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (!desc.includes(error.id)) control.setAttribute('aria-describedby', [...desc, error.id].join(' '));
    } else {
      control.removeAttribute('aria-invalid');
    }
    return !texto;
  }

  function limpiarError(control) {
    const campo = control.closest('.campo');
    if (campo) campo.classList.remove('invalido');
    control.removeAttribute('aria-invalid');
  }

  // ---------------------------------------------------------
  // 8. Envío
  // ---------------------------------------------------------
  const ASUNTOS = {
    general: (d) => `[Contacto] ${d.get('tema')}: ${d.get('asunto')}`,
    propuesta: (d) => `[Propuesta de investigación] ${d.get('titulo')}`,
    buzon: (d) => `[Buzón] ${d.get('tipo_aporte')}: ${d.get('asunto')}`
  };
  const ROTULOS = {
    nombre: 'Nombre', correo: 'Correo', telefono: 'Teléfono', tema: 'Tema', asunto: 'Asunto',
    mensaje: 'Mensaje', rol: 'Rol', linea: 'Línea de investigación', titulo: 'Título tentativo',
    resumen: 'Resumen', tipo_aporte: 'Tipo', anonimo: 'Anónimo', autoriza_datos: 'Autoriza tratamiento de datos (Ley 1581 de 2012)'
  };

  $$('form[data-tipo]').forEach((form) => {
    // Campo trampa contra spam (los servicios de formularios lo reconocen)
    const trampa = document.createElement('input');
    Object.assign(trampa, { type: 'text', name: '_gotcha', tabIndex: -1, autocomplete: 'off' });
    trampa.setAttribute('aria-hidden', 'true');
    trampa.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
    form.appendChild(trampa);

    $$('input, select, textarea', form).forEach((c) => {
      const evento = c.type === 'checkbox' || c.tagName === 'SELECT' || c.type === 'file' ? 'change' : 'input';
      c.addEventListener(evento, () => { if (c.closest('.campo.invalido')) validarCampo(c); });
      c.addEventListener('blur', () => { if (c.value && c.type !== 'checkbox' && c.type !== 'file') validarCampo(c); });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const estado = $('.form-estado', form);
      estado.textContent = '';
      const controles = $$('input:not([name="_gotcha"]), select, textarea', form).filter((c) => !c.disabled);
      const invalidos = controles.filter((c) => !validarCampo(c));
      if (invalidos.length) {
        invalidos[0].type === 'file' ? zona.scrollIntoView({ block: 'center' }) : invalidos[0].focus();
        return;
      }

      const tipo = form.dataset.tipo;
      const datos = new FormData(form);
      datos.set('tipo_solicitud', { general: 'Contacto general', propuesta: 'Propuesta de investigación', buzon: 'Buzón de propuestas' }[tipo]);
      datos.set('_subject', ASUNTOS[tipo](datos));
      const correoRemitente = (datos.get('correo') || '').toString();

      if (conServicio) {
        const boton = $('button[type="submit"]', form);
        const textoBoton = boton.textContent;
        boton.disabled = true; boton.textContent = 'Enviando…';
        try {
          const r = await fetch(cfg.formEndpoint, { method: 'POST', body: datos, headers: { Accept: 'application/json' } });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          mostrarExito(tipo, 'enviado', correoRemitente, form);
        } catch (err) {
          estado.textContent = 'No pudimos enviar tu mensaje. Inténtalo de nuevo en unos minutos o escríbenos a ';
          const a = document.createElement('a');
          a.href = 'mailto:' + cfg.correo; a.textContent = cfg.correo;
          estado.append(a, '.');
        } finally {
          boton.disabled = false; boton.textContent = textoBoton;
        }
      } else {
        const lineas = [];
        for (const [clave, valor] of datos.entries()) {
          if (clave.startsWith('_') || clave === 'tipo_solicitud' || valor instanceof File || !String(valor).trim()) continue;
          lineas.push(`${ROTULOS[clave] || clave}: ${valor}`);
        }
        if (tipo === 'propuesta') lineas.push('', '(Adjunto: propuesta en PDF)');
        const url = `mailto:${cfg.correo}?subject=${encodeURIComponent(datos.get('_subject'))}&body=${encodeURIComponent(lineas.join('\n'))}`;
        window.location.href = url;
        mostrarExito(tipo, 'correo', correoRemitente, form);
      }
    });
  });

  // ---------------------------------------------------------
  // 9. Pantalla de confirmación
  // ---------------------------------------------------------
  let formularioEnviado = null;

  function parrafo(...partes) {
    const p = document.createElement('p');
    partes.forEach((parte) => {
      if (typeof parte === 'string') p.append(parte);
      else { const s = document.createElement('strong'); s.textContent = parte.negrita; p.append(s); }
    });
    return p;
  }

  function mostrarExito(tipo, modo, correo, form) {
    formularioEnviado = form;
    const titulo = $('#exito-titulo');
    const texto = $('#exito-texto');
    texto.replaceChildren();
    const plazo = cfg.tiempoRespuesta;
    const esAnonimo = tipo === 'buzon' && anonimo.checked;

    if (modo === 'correo') {
      titulo.textContent = 'Tu correo está listo para enviar';
      texto.append(parrafo('Abrimos tu programa de correo con el mensaje dirigido a ', { negrita: cfg.correo }, '. Revísalo y presiona Enviar.'));
      if (tipo === 'propuesta') texto.append(parrafo({ negrita: 'No olvides adjuntar tu propuesta en PDF' }, ' antes de enviarlo.'));
      const p = parrafo('¿No se abrió nada? Copia el correo y escríbenos desde tu cuenta.');
      texto.append(p);
    } else if (tipo === 'general') {
      titulo.textContent = '¡Mensaje enviado!';
      texto.append(parrafo('Te responderemos a ', { negrita: correo }, ` en máximo ${plazo}.`));
    } else if (tipo === 'propuesta') {
      titulo.textContent = '¡Recibimos tu propuesta!';
      texto.append(parrafo('El comité de investigación la revisará y te escribirá a ', { negrita: correo }, ` en máximo ${plazo}.`));
    } else {
      titulo.textContent = '¡Gracias por tu aporte!';
      texto.append(esAnonimo
        ? parrafo('Tu mensaje llegó de forma anónima, así que no podremos responderte directamente.')
        : parrafo('Lo revisaremos esta semana. Si hace falta, te escribiremos a ', { negrita: correo }, '.'));
    }

    TIPOS.forEach((t) => { $('#panel-' + t).hidden = true; });
    panelExito.hidden = false;
    tarjetaForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    panelExito.focus({ preventScroll: true });
  }

  $('#btn-otro').addEventListener('click', () => {
    if (formularioEnviado) {
      formularioEnviado.reset();
      $$('textarea[data-contador]', formularioEnviado).forEach((a) => a.dispatchEvent(new Event('input')));
      if (formularioEnviado.dataset.tipo === 'propuesta') nombreArchivo.textContent = '';
      if (formularioEnviado.dataset.tipo === 'buzon') aplicarAnonimo();
    }
    activar(tipoActivo);
    $('#panel-' + tipoActivo + ' input, #panel-' + tipoActivo + ' select')?.focus();
  });

  // ---------------------------------------------------------
  // 10. Buscador de preguntas frecuentes
  // ---------------------------------------------------------
  const normalizar = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const buscador = $('#faq-buscar');
  const vacio = $('#faq-vacio');
  buscador.addEventListener('input', () => {
    const q = normalizar(buscador.value.trim());
    let visibles = 0;
    // Se consultan en cada búsqueda porque la lista puede volver a dibujarse
    $$('#faq .acordeon-item').forEach((item) => {
      const coincide = !q || normalizar(item.textContent).includes(q);
      item.hidden = !coincide;
      if (coincide) visibles++;
    });
    vacio.hidden = visibles > 0;
  });
});
