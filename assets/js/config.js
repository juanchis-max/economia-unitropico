// =========================================================
// config.js — ÚNICO lugar donde debes pegar tus links de
// Google Sheets (publicados como CSV) para que el sitio
// muestre datos reales en vez de datos de demostración.
//
// CÓMO OBTENER CADA LINK:
// En tu Google Sheet: Archivo → Compartir → Publicar en la Web
// → elige la pestaña correspondiente → formato "CSV" → Copiar link.
// El link debe terminar en algo como: .../pub?output=csv
//
// Si dejas un link vacío (""), la web mostrará un aviso.
// No se sustituyen cifras oficiales por datos de demostración.
// Hoja: https://docs.google.com/spreadsheets/d/156GU97B6XdenU7sFN1ocx24j_8ddOBfJCFKnN2Msso8/edit
// Pestañas: KPIs (4101), PIB_Serie (4102), Desempleo (4103),
// Sectores (4104), Tabla (4105). Publica cada pestaña como CSV.
// =========================================================

const SHEET_URLS = {

  // Pestaña "KPIs" — las 4 tarjetas de indicadores clave
  kpis: "",

  // Pestaña "PIB_Serie" — gráfico de línea PIB Casanare vs Nacional
  pibSerie: "",

  // Pestaña "Desempleo" — gráfico de barras
  desempleo: "",

  // Pestaña "Sectores" — gráfico de dona (composición sectorial)
  sectores: "",

  // Pestaña "Tabla" — tabla de indicadores y microdatos
  tabla: ""

};

// =========================================================
// AJUSTES TÉCNICOS DE LA PÁGINA DE CONTACTO (contacto.html)
// Los datos visibles (teléfono, horario, redes, responsables,
// tiempo de respuesta…) ahora se editan desde el panel:
// panel/index.html → Contacto.
// =========================================================

const CONTACTO = {

  // Dirección a la que se envían los formularios.
  // Vacío (""): al enviar, se abre el programa de correo del visitante
  //   con el mensaje ya redactado para el correo del programa.
  // Con un servicio de formularios (Formspree, Getform, Basin…), pega aquí
  //   su enlace, p. ej. "https://formspree.io/f/abcdwxyz". Para recibir el PDF
  //   de las propuestas, el servicio debe aceptar archivos adjuntos.
  formEndpoint: ""

};
