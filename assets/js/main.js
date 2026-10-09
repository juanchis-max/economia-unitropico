// =========================================================
// main.js — Lógica global compartida por todas las páginas
// Usa eventos delegados: funciona aunque contenido.js vuelva
// a dibujar listas (preguntas frecuentes, menú, etc.).
// =========================================================

document.addEventListener('DOMContentLoaded', () => {

  // ---- Menú móvil (hamburguesa) ----
  const btnMenu = document.getElementById('btn-menu-movil');
  const navMovil = document.getElementById('nav-movil');
  if (btnMenu && navMovil) {
    btnMenu.addEventListener('click', () => {
      navMovil.classList.toggle('abierto');
      const expandido = navMovil.classList.contains('abierto');
      btnMenu.setAttribute('aria-expanded', expandido ? 'true' : 'false');
      btnMenu.setAttribute('aria-label', expandido ? 'Cerrar menú' : 'Abrir menú');
    });
  }

  // ---- Acordeones (preguntas frecuentes, etc.) ----
  document.addEventListener('click', (e) => {
    const pregunta = e.target.closest('.acordeon-pregunta');
    if (!pregunta) return;
    const item = pregunta.closest('.acordeon-item');
    if (!item) return;
    const abierto = item.classList.contains('abierto');
    // Cierra los demás items del mismo grupo (comportamiento tipo FAQ)
    const grupo = item.closest('.acordeon');
    if (grupo) {
      grupo.querySelectorAll('.acordeon-item.abierto').forEach((otro) => {
        if (otro !== item) {
          otro.classList.remove('abierto');
          otro.querySelector('.acordeon-pregunta')?.setAttribute('aria-expanded', 'false');
        }
      });
    }
    item.classList.toggle('abierto', !abierto);
    pregunta.setAttribute('aria-expanded', !abierto ? 'true' : 'false');
  });

  // ---- Chips de filtro (resaltar el seleccionado) ----
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.chips .chip');
    if (!chip) return;
    const grupoChips = chip.closest('.chips');
    grupoChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('activo'));
    chip.classList.add('activo');
    // Dispara un evento personalizado que cada página puede escuchar
    grupoChips.dispatchEvent(new CustomEvent('filtro-cambiado', {
      detail: { valor: chip.dataset.valor || chip.textContent.trim() }
    }));
  });

});

// Formatea un número como moneda/es-CO simple, usado por varias páginas
function formatearNumero(valor) {
  return new Intl.NumberFormat('es-CO').format(valor);
}
