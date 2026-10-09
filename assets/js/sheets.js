// Consulta las pestañas públicas; no publica ni modifica Google Sheets.
(function () {
  'use strict';
  const headers = {
    kpis: ['titulo','valor','periodo','fuente','enlace_fuente','fecha_revision','estado'],
    pibSerie: ['anio','casanare','nacional','fuente','enlace_fuente','condicion_dato','fecha_revision','estado'],
    desempleo: ['trimestre','valor','territorio','fuente','enlace_fuente','condicion_dato','fecha_revision','estado'],
    sectores: ['nombre','valor','periodo','territorio','fuente','enlace_fuente','fecha_revision','estado'],
    tabla: ['indicador','cobertura','valor','fuente','periodo','unidad','metodologia','enlace_fuente','condicion_dato','fecha_revision','estado']
  };
  const cache = {};
  const number = value => {
    const text = String(value == null ? '' : value).trim();
    return /^-?\d+(?:[.,]\d+)?$/.test(text) ? Number(text.replace(',', '.')) : NaN;
  };
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  function validate(key, parsed) {
    const fields = parsed.meta.fields || [];
    if (parsed.errors.length || headers[key].some(h => !fields.includes(h)))
      throw new Error('Encabezados o CSV inválidos. Revisa la pestaña y su enlace público.');
    const approved = parsed.data.filter(f => String(f.estado || '').trim().toLowerCase() === 'aprobado');
    const seen = new Set();
    const rows = [];
    let excluded = 0;
    for (const f of approved) {
      let valid = headers[key].every(h => String(f[h] == null ? '' : f[h]).trim());
      try { valid = valid && new URL(f.enlace_fuente).protocol === 'https:'; } catch (_) { valid = false; }
      valid = valid && date(f.fecha_revision);
      if (key === 'pibSerie') valid = valid && /^\d{4}$/.test(f.anio) &&
        Number.isFinite(number(f.casanare)) && Number.isFinite(number(f.nacional));
      if (key === 'desempleo' || key === 'sectores')
        valid = valid && Number.isFinite(number(f.valor)) && number(f.valor) >= 0 && number(f.valor) <= 100;
      if ('condicion_dato' in f)
        valid = valid && ['provisional','definitivo'].includes(String(f.condicion_dato).trim().toLowerCase());
      const identity = key === 'pibSerie' ? f.anio : key === 'desempleo' ? f.trimestre :
        key === 'sectores' ? f.nombre : key === 'tabla' ? [f.indicador,f.cobertura,f.periodo].join('|') : f.titulo;
      if (!valid || seen.has(identity)) { excluded++; continue; }
      seen.add(identity); rows.push(f);
    }
    if (key === 'pibSerie') rows.sort((a,b) => Number(a.anio) - Number(b.anio));
    if (key === 'desempleo' && new Set(rows.map(f => f.territorio)).size > 1)
      throw new Error('La serie de desempleo debe tener una sola cobertura.');
    if (key === 'sectores' && rows.length) {
      const sum = rows.reduce((n,f) => n + number(f.valor),0);
      if (new Set(rows.map(f => f.periodo + '|' + f.territorio)).size > 1 || Math.abs(sum - 100) > 0.5)
        throw new Error('Sectores: usa un solo periodo y territorio, con participaciones que sumen 100%.');
    }
    return {rows, excluded, error: '', checked: new Date().toISOString()};
  }
  async function request(key) {
    const url = SHEET_URLS[key];
    if (!url) return {rows:[],excluded:0,error:'Falta configurar el enlace CSV público.',checked:''};
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {cache:'no-store',signal:controller.signal});
      if (!response.ok) throw new Error('No se pudo leer la pestaña pública.');
      const text = await response.text();
      if (/^\s*</.test(text)) throw new Error('La hoja solicita acceso o el enlace no es CSV.');
      if (typeof Papa === 'undefined') throw new Error('No se pudo cargar el lector CSV.');
      return validate(key, Papa.parse(text, {header:true,skipEmptyLines:'greedy',transformHeader:h => h.trim().replace(/^\uFEFF/,'')}));
    } catch (e) {
      return {rows:[],excluded:0,error:e.name === 'AbortError' ? 'La consulta tardó demasiado. Intenta actualizar.' : e.message,checked:''};
    } finally { clearTimeout(timer); }
  }
  function read(key) {
    if (!cache[key]) cache[key] = request(key);
    return cache[key];
  }
  function source(container, result) {
    if (!container) return;
    container.replaceChildren();
    const status = document.createElement('span');
    status.textContent = result.error || (result.rows.length ?
      result.rows.length + ' registros aprobados. Consulta: ' + new Date(result.checked).toLocaleString('es-CO') :
      'Aún no hay cifras aprobadas para publicar.');
    if (result.excluded) status.textContent += ' Se omitieron ' + result.excluded + ' filas inválidas o duplicadas.';
    container.appendChild(status);
    const unique = new Set();
    result.rows.forEach(f => {
      const key = f.enlace_fuente + '|' + f.fecha_revision + '|' + (f.condicion_dato || '');
      if (unique.has(key)) return;
      unique.add(key);
      const item = document.createElement('div');
      const a = document.createElement('a');
      a.href = f.enlace_fuente; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = f.fuente;
      item.append(a, ' · Revisión: ' + f.fecha_revision +
        (f.condicion_dato ? ' · ' + f.condicion_dato : ''));
      container.appendChild(item);
    });
  }
  window.EconData = {read, number, source, validate, clear:() => Object.keys(cache).forEach(k => delete cache[k])};
})();
