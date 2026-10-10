// =========================================================
// inicio.js — Gráfico de la portada (index.html)
// Usa la misma serie del PIB que datos.html:
// Google Sheets (si está configurado) → data/indicadores.json.
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  const lienzo = document.getElementById('heroChartPreview');
  if (!lienzo) return;
  let grafico = null;
  async function render() {
    if (window.CC) await CC.listo;
    const result = await EconData.read('pibSerie');
    EconData.source(document.getElementById('fuente-pib-inicio'), result);
    if (grafico) { grafico.destroy(); grafico = null; }
    const filas = result.rows;
    const periodo = document.querySelector('[data-c="inicio.hero.grafico.periodo"]');
    if (periodo) periodo.textContent = filas.length ? filas[0].anio + '–' + filas[filas.length-1].anio : 'Sin datos aprobados';
    lienzo.parentElement.hidden = !filas.length;
    if (!filas.length) return;
    const serie = {anios:filas.map(f=>f.anio),casanare:filas.map(f=>EconData.number(f.casanare)),nacional:filas.map(f=>EconData.number(f.nacional))};

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
