// =========================================================
// charts.js — Indicadores, gráficos y tabla de datos.html
// Datos: data/indicadores.json (se edita desde el panel).
// Si config.js tiene enlaces de Google Sheets, esas pestañas
// tienen prioridad sobre el JSON.
// Requiere: contenido.js, Chart.js y PapaParse.
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  const contenedorKpis = document.getElementById('kpis-datos');
  const cuerpoTabla = document.getElementById('cuerpo-tabla-indicadores');
  if (!contenedorKpis && !cuerpoTabla) return; // no estamos en datos.html

  const esc = (s) => (window.CC ? CC.escapar(s == null ? '' : s) : String(s == null ? '' : s));

  async function obtenerDatos() {
    const keys = ['kpis','pibSerie','desempleo','sectores','tabla'];
    const results = await Promise.all(keys.map(key => EconData.read(key)));
    const sources = Object.fromEntries(keys.map((key,i) => [key,results[i]]));
    const pib = sources.pibSerie.rows, des = sources.desempleo.rows, sec = sources.sectores.rows;
    return {
      respaldo: {},
      sources,
      kpis: sources.kpis.rows,
      pib: {anios:pib.map(f=>f.anio),casanare:pib.map(f=>EconData.number(f.casanare)),nacional:pib.map(f=>EconData.number(f.nacional))},
      desempleo: {trimestres:des.map(f=>f.trimestre),valores:des.map(f=>EconData.number(f.valor))},
      sectores: sec.map(f=>({...f,valor:EconData.number(f.valor)})),
      tabla: sources.tabla.rows
    };
  }

  const iconosSvg = {
    grafico: 'M7 12l3-3 3 3 4-4M3 4h18v14a1 1 0 01-1 1H4a1 1 0 01-1-1V4z',
    personas: 'M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M9 20v-2a5 5 0 0110 0v2m-5-9a3 3 0 11-6 0 3 3 0 016 0z',
    etiqueta: 'M7 7h.01M3 11l7-7h6l5 5v6l-7 7-11-11z',
    hoja: 'M11 20A7 7 0 019.8 6.1C15.5 5 20 5 20 5s0 4.5-1.1 10.2A7 7 0 0111 20zM11 20v-9',
    moneda: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    mapa: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z'
  };
  const flecha = (t) => (t === 'subida' ? '▲' : t === 'bajada' ? '▼' : '■');
  const claseTendencia = (t) => (t === 'subida' ? 'subida' : t === 'bajada' ? 'bajada' : 'texto-tenue');

  let graficos = [];

  async function render() {
    if (window.CC) await CC.listo;
    const d = await obtenerDatos();
    Object.entries(d.sources).forEach(([key,result]) => {
      EconData.source(document.querySelector('[data-sheet-status="' + key + '"]'), result);
    });
    document.querySelectorAll('[data-ind]').forEach(el => {
      const key = el.dataset.ind;
      if (key === 'pib_serie.descripcion') el.textContent = d.pib.anios.length ? 'Tasas de crecimiento real anual (%): ' + d.pib.anios[0] + '–' + d.pib.anios[d.pib.anios.length-1] : 'Serie pendiente de cifras aprobadas.';
      if (key === 'desempleo_trimestral.descripcion') el.textContent = d.sources.desempleo.rows.length ? d.sources.desempleo.rows[0].territorio : 'Cobertura según la fuente oficial.';
      if (key === 'composicion_sectorial.descripcion') el.textContent = d.sources.sectores.rows.length ? d.sources.sectores.rows[0].territorio + ' · ' + d.sources.sectores.rows[0].periodo : 'Participaciones del VAB (%).';
    });

    // ---- Títulos de los gráficos (data-ind="ruta" en el HTML) ----
    document.querySelectorAll('[data-ind]').forEach((el) => {
      const v = el.dataset.ind.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d.respaldo);
      if (typeof v === 'string') el.textContent = v;
    });

    // ---- KPIs ----
    if (contenedorKpis) {
      contenedorKpis.innerHTML = d.kpis.map((kpi) => `
        <div class="tarjeta" style="padding:20px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
            <div style="width:34px;height:34px;border-radius:7px;background:var(--marron-claro);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="18" height="18" fill="none" stroke="var(--marron-oscuro)" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconosSvg[kpi.icono] || iconosSvg.grafico}"/></svg>
            </div>
            <div>
              <div style="font-size:0.68rem;color:var(--gris-medio);text-transform:uppercase;letter-spacing:0.03em;">${esc(kpi.titulo)}</div>
              <div style="font-size:0.72rem;color:var(--gris-medio);">${esc(kpi.subtitulo)}</div>
            </div>
          </div>
          <div style="font-family:var(--fuente-serif);font-weight:700;font-size:1.5rem;color:var(--marron-oscuro);">${esc(kpi.valor)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
            <span class="${claseTendencia(kpi.tendencia)}" style="font-size:0.82rem;">${flecha(kpi.tendencia)} ${esc(kpi.variacion)}</span>
          </div>
          <div class="texto-tenue" style="font-size:0.72rem;margin-top:6px;">${esc(kpi.periodo)}</div>
        </div>
      `).join('') || '<p class="texto-tenue">No hay indicadores para mostrar.</p>';
    }

    // ---- Explorador regional: filtra y exporta la misma tabla visible ----
    if (cuerpoTabla) {
      const buscar = document.getElementById('buscar-regional');
      const cobertura = document.getElementById('cobertura-regional');
      const estado = document.getElementById('estado-regional');
      const csv = document.getElementById('csv-regional');
      const normalizar = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      let visibles = [];
      if (cobertura) {
        const anterior = cobertura.value;
        cobertura.replaceChildren(new Option('Todas las coberturas', ''));
        [...new Set(d.tabla.map(f => f.cobertura).filter(Boolean))].sort().forEach(v => cobertura.add(new Option(v, v)));
        if ([...cobertura.options].some(o => o.value === anterior)) cobertura.value = anterior;
      }
      function filtrar() {
        const q = normalizar(buscar && buscar.value).trim();
        visibles = d.tabla.filter(f => (!cobertura || !cobertura.value || f.cobertura === cobertura.value) &&
          normalizar([f.indicador, f.cobertura, f.fuente, f.periodo].join(' ')).includes(q));
        cuerpoTabla.innerHTML = visibles.map(fila => `
          <tr>
            <td><strong>${esc(fila.indicador)}</strong><div class="texto-tenue">${esc(fila.cobertura)}</div></td>
            <td>${esc(fila.valor)}<div class="texto-tenue">${esc(fila.unidad)} · ${esc(fila.metodologia)}</div></td><td class="${claseTendencia(fila.tendencia)}">${esc(fila.variacion)}</td>
            <td class="texto-tenue"><a href="${esc(fila.enlace_fuente)}" target="_blank" rel="noopener noreferrer">${esc(fila.fuente)}</a><div>Revisión: ${esc(fila.fecha_revision)}</div></td><td class="texto-tenue">${esc(fila.periodo)}</td>
          </tr>`).join('') || '<tr><td colspan="5">No hay resultados. Prueba otra búsqueda o limpia los filtros.</td></tr>';
        if (estado) estado.textContent = visibles.length + ' de ' + d.tabla.length + ' indicadores';
        if (csv) csv.disabled = !visibles.length;
      }
      if (buscar) buscar.oninput = filtrar;
      if (cobertura) cobertura.onchange = filtrar;
      const limpiar = document.getElementById('limpiar-regional');
      if (limpiar) limpiar.onclick = () => {
        if (buscar) buscar.value = '';
        if (cobertura) cobertura.value = '';
        filtrar();
        if (buscar) buscar.focus();
      };
      if (csv) csv.onclick = () => {
        const columnas = ['indicador', 'cobertura', 'valor', 'variacion', 'fuente', 'periodo', 'unidad', 'metodologia', 'enlace_fuente', 'condicion_dato', 'fecha_revision'];
        // Neutraliza fórmulas al abrir contenido editable en hojas de cálculo.
        const celda = v => {
          let s = String(v == null ? '' : v);
          if (/^[=+@-]/.test(s.trimStart())) s = "'" + s;
          return '"' + s.replace(/"/g, '""') + '"';
        };
        const filas = [columnas, ...visibles.map(f => columnas.map(k => f[k]))];
        const url = URL.createObjectURL(new Blob(['\uFEFF' + filas.map(f => f.map(celda).join(';')).join('\r\n')], {type: 'text/csv;charset=utf-8'}));
        const a = document.createElement('a');
        a.href = url; a.download = 'indicadores-regionales.csv';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
      filtrar();
    }

    // ---- Gráficos (si Chart.js no cargó, el resto de la página igual funciona) ----
    graficos.forEach((g) => g.destroy());
    graficos = [];
    [['graficoPib', d.pib.anios], ['graficoDesempleo', d.desempleo.trimestres], ['graficoSectores', d.sectores]].forEach(([id,rows]) => {
      const canvas = document.getElementById(id);
      if (canvas) canvas.parentElement.hidden = !rows.length;
    });
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js no está disponible; se omiten los gráficos.');
      return;
    }
    const ctxPib = document.getElementById('graficoPib');
    const ctxDesempleo = document.getElementById('graficoDesempleo');
    const ctxSectores = document.getElementById('graficoSectores');

    if (ctxPib && d.pib.anios.length) {
      graficos.push(new Chart(ctxPib, {
        type: 'line',
        data: {
          labels: d.pib.anios,
          datasets: [
            { label: 'Casanare (%)', data: d.pib.casanare, borderColor: '#6B4E3D', backgroundColor: 'rgba(107,78,61,0.10)', fill: true, tension: 0.3, borderWidth: 2.5, pointBackgroundColor: '#C9A66B', pointRadius: 4 },
            { label: 'Promedio Nacional (%)', data: d.pib.nacional, borderColor: '#A9877B', borderDash: [5, 5], tension: 0.3, borderWidth: 2, pointRadius: 0 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Manrope', size: 11 } } } },
          scales: { y: { ticks: { callback: (v) => v + '%' } } }
        }
      }));
    }
    if (ctxDesempleo && d.desempleo.trimestres.length) {
      graficos.push(new Chart(ctxDesempleo, {
        type: 'bar',
        data: {
          labels: d.desempleo.trimestres,
          datasets: [{ label: 'Desocupación (%)', data: d.desempleo.valores, backgroundColor: '#A9877B', borderRadius: 4, maxBarThickness: 42 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { ticks: { callback: (v) => v + '%' } } }
        }
      }));
    }
    if (ctxSectores && d.sectores.length) {
      graficos.push(new Chart(ctxSectores, {
        type: 'doughnut',
        data: {
          labels: d.sectores.map((s) => s.nombre),
          datasets: [{ data: d.sectores.map((s) => s.valor), backgroundColor: ['#6B4E3D', '#A9877B', '#C9A66B', '#D4BFB4', '#8C6F5E', '#E3D5C8'], borderWidth: 2, borderColor: '#FFFFFF' }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '68%',
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, padding: 10 } } }
        }
      }));
    }
  }

  const actualizar = document.getElementById('actualizar-cifras');
  if (actualizar) actualizar.addEventListener('click', async () => {
    actualizar.disabled = true;
    actualizar.textContent = 'Consultando…';
    EconData.clear();
    try { await render(); }
    finally { actualizar.disabled = false; actualizar.textContent = 'Actualizar cifras'; }
  });
  render();
  // Vista previa del panel: volver a dibujar cuando cambie el borrador
  document.addEventListener('cc:actualizado', render);
});
