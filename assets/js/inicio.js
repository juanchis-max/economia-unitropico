// =========================================================
// inicio.js — Gráfico de la portada (index.html)
// Usa la misma serie del PIB que datos.html:
// Google Sheets (si está configurado) → data/indicadores.json.
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  const lienzo = document.getElementById('heroChartPreview');
  if (!lienzo) return;
  let grafico = null;
  let desdeSheets = null;

  function leerSheets() {
    if (desdeSheets) return desdeSheets;
    const url = typeof SHEET_URLS !== 'undefined' ? SHEET_URLS.pibSerie : '';
    desdeSheets = !url || typeof Papa === 'undefined'
      ? Promise.resolve(null)
      : new Promise((resolve) => {
          Papa.parse(url, {
            download: true, header: true, skipEmptyLines: true,
            complete: (r) => resolve(r.data),
            error: () => resolve(null)
          });
        });
    return desdeSheets;
  }

  async function render() {
    // Datos de respaldo por si nada más carga
    let serie = { anios: ['2020', '2021', '2022', '2023', '2024'], casanare: [-14.2, 8.4, 4.1, 2.9, 3.8], nacional: [-7.0, 10.7, 7.3, 0.6, 1.8] };
    const ind = window.CC ? await CC.indicadores() : null;
    if (ind && ind.pib_serie && ind.pib_serie.anios) serie = ind.pib_serie;
    const filas = await leerSheets();
    if (filas && filas.length) {
      serie = { anios: filas.map((f) => f.anio), casanare: filas.map((f) => parseFloat(f.casanare)), nacional: filas.map((f) => parseFloat(f.nacional)) };
    }

    if (typeof Chart === 'undefined') return;
    if (grafico) grafico.destroy();
    grafico = new Chart(lienzo.getContext('2d'), {
      type: 'line',
      data: {
        labels: serie.anios,
        datasets: [
          { label: 'PIB Casanare (%)', data: serie.casanare, borderColor: '#6B4E3D', backgroundColor: 'rgba(107,78,61,0.1)', fill: true, tension: 0.3, borderWidth: 2.5, pointBackgroundColor: '#C9A66B', pointRadius: 4 },
          { label: 'Nacional (%)', data: serie.nacional, borderColor: '#A9877B', borderDash: [4, 4], tension: 0.3, borderWidth: 2, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { y: { ticks: { callback: (v) => v + '%' } } }
      }
    });
  }

  render();
  document.addEventListener('cc:actualizado', render);
});
