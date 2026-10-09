// =========================================================
// esquema.js — Qué se puede editar desde el panel.
// Cada campo apunta a una ruta dentro de data/contenido.json
// (o data/indicadores.json en la sección de indicadores).
// Para agregar una página nueva al panel, agrega aquí su sección.
// =========================================================

const ICONOS_TARJETA = [
  { valor: 'grafico', texto: 'Gráfico' }, { valor: 'libro', texto: 'Libro' },
  { valor: 'personas', texto: 'Personas' }, { valor: 'imagen', texto: 'Imagen' },
  { valor: 'documento', texto: 'Documento' }, { valor: 'calendario', texto: 'Calendario' },
  { valor: 'mapa', texto: 'Mapa' }, { valor: 'hoja', texto: 'Hoja' },
  { valor: 'birrete', texto: 'Birrete' }, { valor: 'megafono', texto: 'Megáfono' }
];
const ICONOS_KPI = [
  { valor: 'grafico', texto: 'Gráfico' }, { valor: 'personas', texto: 'Personas' },
  { valor: 'etiqueta', texto: 'Etiqueta' }, { valor: 'hoja', texto: 'Hoja' },
  { valor: 'moneda', texto: 'Moneda' }, { valor: 'mapa', texto: 'Mapa' }
];
const TENDENCIAS = [
  { valor: 'subida', texto: '▲ Sube (verde)' },
  { valor: 'bajada', texto: '▼ Baja (rojo)' },
  { valor: 'estable', texto: '■ Estable (gris)' }
];
const AYUDA_FORMATO = 'Puedes usar **negrita**, [texto del enlace](pagina.html) y Enter para saltar de línea.';

// Fecha de hoy (o dentro de N días) como AAAA-MM-DD
const fechaISO = (dias = 0) => {
  const d = new Date(Date.now() + dias * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// Sugerencias: valores ya usados + una lista base
const usados = (lista, clave, base = []) => (b) => [...base, ...((b.contenido && lista(b.contenido)) || []).map((x) => x && x[clave])];
const CAMPOS_CABECERA = (sec) => [
  { ruta: `${sec}.hero.etiqueta`, tipo: 'texto', etiqueta: 'Etiqueta', max: 60 },
  { ruta: `${sec}.hero.titulo`, tipo: 'texto', etiqueta: 'Título', max: 60 },
  { ruta: `${sec}.hero.texto`, tipo: 'textoLargo', etiqueta: 'Texto', max: 240 },
  { ruta: `${sec}.hero.aviso`, tipo: 'textoLargo', etiqueta: 'Aviso de contenido de ejemplo', ayuda: 'Bórralo cuando reemplaces los ejemplos por contenido real: si queda vacío, no se muestra.' }
];

const ESQUEMA = [
  {
    id: 'general',
    titulo: 'General',
    descripcion: 'Logo, franja superior, menú y pie de página. Se ven en todas las páginas.',
    grupos: [
      {
        titulo: 'Identidad',
        campos: [
          { ruta: 'general.logo', tipo: 'imagen', etiqueta: 'Logo', maxLado: 512, ayuda: 'Aparece en el encabezado y en el pie, recortado en círculo. Ideal: imagen cuadrada de al menos 200 × 200 px.' },
          { ruta: 'general.logo_alt', tipo: 'texto', etiqueta: 'Descripción del logo', ayuda: 'La leen los lectores de pantalla.', max: 60 },
          { ruta: 'general.nombre', tipo: 'texto', etiqueta: 'Nombre del programa', max: 40 },
          { ruta: 'general.subnombre', tipo: 'texto', etiqueta: 'Texto bajo el nombre', max: 30 }
        ]
      },
      {
        titulo: 'Franja superior',
        campos: [
          { ruta: 'general.franja.marca', tipo: 'texto', etiqueta: 'Texto destacado (dorado)', max: 30 },
          { ruta: 'general.franja.texto', tipo: 'texto', etiqueta: 'Texto', max: 70 },
          { ruta: 'general.franja.sede', tipo: 'texto', etiqueta: 'Sede', max: 50 }
        ]
      },
      {
        titulo: 'Menú principal',
        campos: [
          { ruta: 'general.menu', tipo: 'lista', etiqueta: 'Botones del menú', item: 'boton', min: 1, max: 9, tituloItem: 'texto', nuevo: { texto: 'Nueva página', enlace: 'index.html' }, ayuda: 'Se marca solo el botón de la página en la que está el visitante.' }
        ]
      },
      {
        titulo: 'Pie de página',
        campos: [
          { ruta: 'general.pie.nombre', tipo: 'texto', etiqueta: 'Nombre junto al logo', max: 40 },
          { ruta: 'general.pie.descripcion', tipo: 'textoLargo', etiqueta: 'Descripción', formato: true },
          { ruta: 'general.pie.navegacion_titulo', tipo: 'texto', etiqueta: 'Título de la columna de enlaces' },
          { ruta: 'general.pie.navegacion', tipo: 'lista', etiqueta: 'Enlaces del pie', item: 'boton', min: 0, max: 8, tituloItem: 'texto', nuevo: { texto: 'Nuevo enlace', enlace: 'index.html' } },
          { ruta: 'general.pie.fuentes_titulo', tipo: 'texto', etiqueta: 'Título de la columna de fuentes' },
          { ruta: 'general.pie.fuentes', tipo: 'lista', etiqueta: 'Fuentes', item: 'texto', min: 0, max: 8, nuevo: 'Nueva fuente' },
          { ruta: 'general.pie.contacto_titulo', tipo: 'texto', etiqueta: 'Título de la columna de contacto' },
          { ruta: 'general.pie.contacto_texto', tipo: 'texto', etiqueta: 'Texto de contacto' },
          { ruta: 'general.pie.correo', tipo: 'correo', etiqueta: 'Correo' },
          { ruta: 'general.pie.boton', tipo: 'boton', etiqueta: 'Botón del pie' },
          { ruta: 'general.pie.copyright', tipo: 'texto', etiqueta: 'Derechos (©)' },
          { ruta: 'general.pie.nota', tipo: 'texto', etiqueta: 'Nota final' }
        ]
      }
    ]
  },

  {
    id: 'inicio',
    titulo: 'Inicio',
    pagina: 'index.html',
    descripcion: 'La portada del sitio.',
    grupos: [
      {
        titulo: 'Portada',
        campos: [
          { ruta: 'inicio.hero.etiqueta', tipo: 'texto', etiqueta: 'Etiqueta superior', max: 40 },
          { ruta: 'inicio.hero.titulo', tipo: 'textoLargo', etiqueta: 'Título principal', max: 90 },
          { ruta: 'inicio.hero.texto', tipo: 'textoLargo', etiqueta: 'Texto', max: 220 },
          { ruta: 'inicio.hero.imagen_fondo', tipo: 'imagen', etiqueta: 'Imagen de fondo (opcional)', opcional: true, maxLado: 1920, ayuda: 'Se muestra detrás de la portada con un velo café para que el texto siga leyéndose. Ideal: foto horizontal de al menos 1600 px de ancho.' },
          { ruta: 'inicio.hero.boton_principal', tipo: 'boton', etiqueta: 'Botón dorado' },
          { ruta: 'inicio.hero.boton_secundario', tipo: 'boton', etiqueta: 'Botón con borde' },
          { ruta: 'inicio.hero.cifras', tipo: 'lista', etiqueta: 'Cifras destacadas', min: 0, max: 4, tituloItem: 'etiqueta', nuevo: { valor: '0', etiqueta: 'Nueva cifra' },
            item: { campos: [
              { clave: 'valor', tipo: 'texto', etiqueta: 'Cifra', max: 8 },
              { clave: 'etiqueta', tipo: 'texto', etiqueta: 'Qué significa', max: 32 }
            ] } }
        ]
      },
      {
        titulo: 'Tarjeta del gráfico',
        ayuda: 'Los datos del gráfico se editan en «Indicadores y gráficos» → PIB.',
        campos: [
          { ruta: 'inicio.hero.grafico.etiqueta', tipo: 'texto', etiqueta: 'Etiqueta', max: 40 },
          { ruta: 'inicio.hero.grafico.titulo', tipo: 'texto', etiqueta: 'Título', max: 50 },
          { ruta: 'inicio.hero.grafico.periodo', tipo: 'texto', etiqueta: 'Periodo', max: 14 },
          { ruta: 'inicio.hero.grafico.nota', tipo: 'textoLargo', etiqueta: 'Nota bajo el título', max: 120 },
          { ruta: 'inicio.hero.grafico.fuente', tipo: 'texto', etiqueta: 'Fuente' },
          { ruta: 'inicio.hero.grafico.enlace', tipo: 'boton', etiqueta: 'Enlace al panel de datos' }
        ]
      },
      {
        titulo: 'Ejes del portal',
        campos: [
          { ruta: 'inicio.ejes.titulo', tipo: 'texto', etiqueta: 'Título', max: 50 },
          { ruta: 'inicio.ejes.subtitulo', tipo: 'textoLargo', etiqueta: 'Subtítulo', max: 180 },
          { ruta: 'inicio.ejes.tarjetas', tipo: 'lista', etiqueta: 'Tarjetas', min: 1, max: 4, tituloItem: 'titulo',
            nuevo: { icono: 'grafico', titulo: 'Nueva tarjeta', texto: '', enlace_texto: 'Ver más →', enlace: 'index.html' },
            item: { campos: [
              { clave: 'icono', tipo: 'selector', etiqueta: 'Ícono', opciones: ICONOS_TARJETA },
              { clave: 'titulo', tipo: 'texto', etiqueta: 'Título', max: 30 },
              { clave: 'texto', tipo: 'textoLargo', etiqueta: 'Texto', max: 120 },
              { clave: 'enlace_texto', tipo: 'texto', etiqueta: 'Texto del enlace', max: 30 },
              { clave: 'enlace', tipo: 'enlace', etiqueta: 'Lleva a' }
            ] } }
        ]
      },
      {
        titulo: 'Misión, visión y líneas',
        campos: [
          { ruta: 'inicio.identidad.etiqueta', tipo: 'texto', etiqueta: 'Etiqueta', max: 40 },
          { ruta: 'inicio.identidad.mision_titulo', tipo: 'texto', etiqueta: 'Título de la misión' },
          { ruta: 'inicio.identidad.mision', tipo: 'textoLargo', etiqueta: 'Misión', formato: true },
          { ruta: 'inicio.identidad.vision_titulo', tipo: 'texto', etiqueta: 'Título de la visión' },
          { ruta: 'inicio.identidad.vision', tipo: 'textoLargo', etiqueta: 'Visión', formato: true },
          { ruta: 'inicio.identidad.lineas_titulo', tipo: 'texto', etiqueta: 'Título de las líneas' },
          { ruta: 'inicio.identidad.lineas', tipo: 'lista', etiqueta: 'Líneas de investigación', min: 0, max: 6, tituloItem: 'titulo',
            nuevo: { titulo: 'Nueva línea', texto: '' },
            item: { campos: [
              { clave: 'titulo', tipo: 'texto', etiqueta: 'Nombre (en negrita)' },
              { clave: 'texto', tipo: 'texto', etiqueta: 'Temas' }
            ] } },
          { ruta: 'inicio.identidad.boton', tipo: 'boton', etiqueta: 'Botón' }
        ]
      }
    ]
  },

  {
    id: 'datos',
    titulo: 'Datos económicos',
    pagina: 'datos.html',
    descripcion: 'Textos de la página del Observatorio. Las cifras y los gráficos están en «Indicadores y gráficos».',
    grupos: [
      {
        titulo: 'Cabecera',
        campos: [
          { ruta: 'datos.hero.etiqueta', tipo: 'texto', etiqueta: 'Etiqueta', max: 70 },
          { ruta: 'datos.hero.titulo', tipo: 'texto', etiqueta: 'Título', max: 60 },
          { ruta: 'datos.hero.texto', tipo: 'textoLargo', etiqueta: 'Texto', max: 240 },
          { ruta: 'datos.hero.boton', tipo: 'boton', etiqueta: 'Botón del informe', subir: true, ayuda: 'Sube el PDF del informe o pega un enlace. Si el enlace queda vacío, el botón no se muestra.' }
        ]
      },
      {
        titulo: 'Notas y tabla',
        campos: [
          { ruta: 'datos.nota_pib', tipo: 'textoLargo', etiqueta: 'Nota bajo el gráfico del PIB' },
          { ruta: 'datos.tabla_titulo', tipo: 'texto', etiqueta: 'Título de la tabla' },
          { ruta: 'datos.tabla_descripcion', tipo: 'texto', etiqueta: 'Descripción de la tabla' },
          { ruta: 'datos.nota_fuentes', tipo: 'textoLargo', etiqueta: 'Nota de fuentes', formato: true }
        ]
      }
    ]
  },

  {
    id: 'indicadores',
    titulo: 'Indicadores y gráficos',
    archivo: 'indicadores',
    pagina: 'datos.html',
    descripcion: 'Cifras de las tarjetas, series de los gráficos y la tabla de la página de datos. El gráfico de la portada usa la misma serie del PIB.',
    grupos: [
      {
        titulo: 'Corte de los datos',
        campos: [
          { ruta: 'corte', tipo: 'texto', etiqueta: 'Fecha de corte', placeholder: 'Ej. Septiembre 2026' },
          { ruta: 'fuente_principal', tipo: 'texto', etiqueta: 'Fuente principal' }
        ]
      },
      {
        titulo: 'Tarjetas de indicadores',
        hoja: 'kpis',
        campos: [
          { ruta: 'kpis', tipo: 'lista', etiqueta: 'Tarjetas', min: 0, max: 4, tituloItem: 'titulo',
            nuevo: { titulo: 'Nuevo indicador', subtitulo: '', valor: '0', variacion: '0%', tendencia: 'estable', periodo: '', icono: 'grafico' },
            item: { campos: [
              { clave: 'titulo', tipo: 'texto', etiqueta: 'Título', max: 30 },
              { clave: 'subtitulo', tipo: 'texto', etiqueta: 'Subtítulo', max: 40 },
              { clave: 'valor', tipo: 'texto', etiqueta: 'Valor', max: 22, ayuda: 'Tal como debe verse: «11.4%», «$21.4 Billones COP».' },
              { clave: 'variacion', tipo: 'texto', etiqueta: 'Variación', max: 14 },
              { clave: 'tendencia', tipo: 'selector', etiqueta: 'Tendencia', opciones: TENDENCIAS },
              { clave: 'periodo', tipo: 'texto', etiqueta: 'Periodo y fuente', max: 40 },
              { clave: 'icono', tipo: 'selector', etiqueta: 'Ícono', opciones: ICONOS_KPI }
            ] } }
        ]
      },
      {
        titulo: 'Gráfico del PIB',
        hoja: 'pibSerie',
        campos: [
          { ruta: 'pib_serie.titulo', tipo: 'texto', etiqueta: 'Título' },
          { ruta: 'pib_serie.descripcion', tipo: 'texto', etiqueta: 'Descripción' },
          { ruta: 'pib_serie', tipo: 'serie', etiqueta: 'Datos (crecimiento real, % anual)',
            columnas: [
              { clave: 'anios', etiqueta: 'Año', tipo: 'texto' },
              { clave: 'casanare', etiqueta: 'Casanare (%)', tipo: 'numero' },
              { clave: 'nacional', etiqueta: 'Nacional (%)', tipo: 'numero' }
            ] }
        ]
      },
      {
        titulo: 'Gráfico de desocupación',
        hoja: 'desempleo',
        campos: [
          { ruta: 'desempleo_trimestral.titulo', tipo: 'texto', etiqueta: 'Título' },
          { ruta: 'desempleo_trimestral.descripcion', tipo: 'texto', etiqueta: 'Descripción' },
          { ruta: 'desempleo_trimestral', tipo: 'serie', etiqueta: 'Datos (%)',
            columnas: [
              { clave: 'trimestres', etiqueta: 'Trimestre', tipo: 'texto' },
              { clave: 'valores', etiqueta: 'Desocupación (%)', tipo: 'numero' }
            ] }
        ]
      },
      {
        titulo: 'Composición sectorial',
        hoja: 'sectores',
        campos: [
          { ruta: 'composicion_sectorial.titulo', tipo: 'texto', etiqueta: 'Título' },
          { ruta: 'composicion_sectorial.descripcion', tipo: 'texto', etiqueta: 'Descripción' },
          { ruta: 'composicion_sectorial.sectores', tipo: 'lista', etiqueta: 'Sectores', min: 1, max: 6, tituloItem: 'nombre', suma: { clave: 'valor', objetivo: 100, unidad: '%' },
            nuevo: { nombre: 'Nuevo sector', valor: 0 },
            item: { campos: [
              { clave: 'nombre', tipo: 'texto', etiqueta: 'Sector' },
              { clave: 'valor', tipo: 'numero', etiqueta: 'Participación (%)' }
            ] } }
        ]
      },
      {
        titulo: 'Tabla de indicadores',
        hoja: 'tabla',
        campos: [
          { ruta: 'tabla_indicadores', tipo: 'lista', etiqueta: 'Filas', min: 0, max: 30, tituloItem: 'indicador',
            nuevo: { indicador: 'Nuevo indicador', cobertura: '', valor: '', variacion: '', tendencia: 'estable', fuente: '', periodo: '' },
            item: { campos: [
              { clave: 'indicador', tipo: 'texto', etiqueta: 'Indicador' },
              { clave: 'cobertura', tipo: 'texto', etiqueta: 'Cobertura' },
              { clave: 'valor', tipo: 'texto', etiqueta: 'Valor actual' },
              { clave: 'variacion', tipo: 'texto', etiqueta: 'Variación' },
              { clave: 'tendencia', tipo: 'selector', etiqueta: 'Tendencia', opciones: TENDENCIAS },
              { clave: 'fuente', tipo: 'texto', etiqueta: 'Fuente oficial' },
              { clave: 'periodo', tipo: 'texto', etiqueta: 'Periodo' }
            ] } }
        ]
      }
    ]
  },

  {
    id: 'contacto',
    titulo: 'Contacto',
    pagina: 'contacto.html',
    descripcion: 'Textos y datos de la página de contacto.',
    grupos: [
      {
        titulo: 'Cabecera',
        campos: [
          { ruta: 'contacto.hero.etiqueta', tipo: 'texto', etiqueta: 'Etiqueta', max: 40 },
          { ruta: 'contacto.hero.titulo', tipo: 'texto', etiqueta: 'Título', max: 40 },
          { ruta: 'contacto.hero.texto', tipo: 'textoLargo', etiqueta: 'Texto', max: 200 }
        ]
      },
      {
        titulo: 'Datos de contacto',
        ayuda: 'Lo que dejes vacío no se muestra en la página. Escribe solo datos confirmados.',
        campos: [
          { ruta: 'contacto.datos.correo', tipo: 'correo', etiqueta: 'Correo del programa', ayuda: 'Aquí llegan los formularios cuando se envían por correo.' },
          { ruta: 'contacto.datos.direccion', tipo: 'texto', etiqueta: 'Dirección', ayuda: 'También mueve el mapa.' },
          { ruta: 'contacto.datos.telefono', tipo: 'telefono', etiqueta: 'Teléfono', placeholder: '608 000 0000', ayuda: 'Los fijos de Casanare se marcan 608 + 7 dígitos.' },
          { ruta: 'contacto.datos.whatsapp', tipo: 'telefono', etiqueta: 'WhatsApp', placeholder: '573000000000', ayuda: 'Solo números, con el 57 adelante.' },
          { ruta: 'contacto.datos.horario', tipo: 'texto', etiqueta: 'Horario de atención', placeholder: 'Lunes a viernes, 8:00 a. m. – 12:00 m. y 2:00 – 6:00 p. m.' },
          { ruta: 'contacto.datos.tiempoRespuesta', tipo: 'texto', etiqueta: 'Tiempo de respuesta', ayuda: 'Se muestra en las tarjetas, en la confirmación de los formularios y donde escribas {plazo}.' }
        ]
      },
      {
        titulo: 'Redes sociales',
        ayuda: 'Pega la dirección completa (https://…). Vacío = no se muestra.',
        campos: [
          { ruta: 'contacto.datos.redes.facebook', tipo: 'enlace', etiqueta: 'Facebook', externo: true },
          { ruta: 'contacto.datos.redes.instagram', tipo: 'enlace', etiqueta: 'Instagram', externo: true },
          { ruta: 'contacto.datos.redes.linkedin', tipo: 'enlace', etiqueta: 'LinkedIn', externo: true },
          { ruta: 'contacto.datos.redes.youtube', tipo: 'enlace', etiqueta: 'YouTube', externo: true },
          { ruta: 'contacto.datos.redes.x', tipo: 'enlace', etiqueta: 'X (Twitter)', externo: true }
        ]
      },
      {
        titulo: 'Responsables por área',
        ayuda: 'Opcional. Aparece como «A cargo: …» en cada tarjeta de área.',
        campos: [
          { ruta: 'contacto.datos.responsables.direccion', tipo: 'texto', etiqueta: 'Dirección del programa' },
          { ruta: 'contacto.datos.responsables.investigacion', tipo: 'texto', etiqueta: 'Investigación y semilleros' },
          { ruta: 'contacto.datos.responsables.practicas', tipo: 'texto', etiqueta: 'Prácticas y egresados' },
          { ruta: 'contacto.datos.responsables.secretaria', tipo: 'texto', etiqueta: 'Secretaría académica' }
        ]
      },
      {
        titulo: 'Preguntas frecuentes',
        campos: [
          { ruta: 'contacto.faq', tipo: 'lista', etiqueta: 'Preguntas', min: 0, max: 20, tituloItem: 'pregunta',
            ayuda: 'En las respuestas puedes usar **negrita**, [texto](enlace) y {plazo}. Para abrir un formulario usa (#general), (#propuesta) o (#buzon).',
            nuevo: { pregunta: '¿Nueva pregunta?', respuesta: '' },
            item: { campos: [
              { clave: 'pregunta', tipo: 'texto', etiqueta: 'Pregunta' },
              { clave: 'respuesta', tipo: 'textoLargo', etiqueta: 'Respuesta', formato: true }
            ] } }
        ]
      }
    ]
  },


  {
    id: 'noticias',
    titulo: 'Noticias',
    pagina: 'noticias.html',
    descripcion: 'Agrega, edita o quita noticias y convocatorias. En la página se ordenan solas por fecha, de la más reciente a la más antigua.',
    grupos: [
      { titulo: 'Cabecera', campos: CAMPOS_CABECERA('noticias') },
      {
        titulo: 'Noticias',
        campos: [
          { ruta: 'noticias.items', tipo: 'lista', etiqueta: 'Noticias', min: 0, max: 300, plegable: true, agregarArriba: true,
            tituloItem: 'titulo', subtituloItem: 'fecha', miniaturaItem: 'imagen', nombreItem: 'Noticia', textoAgregar: '+ Nueva noticia',
            ayuda: 'Haz clic en una noticia para abrirla. Cada noticia tiene su propia página para compartir.',
            nuevo: () => ({ titulo: 'Nueva noticia', fecha: fechaISO(), categoria: 'Académicas', destacada: false, imagen: '', pie: '', resumen: '', cuerpo: '', boton: { texto: '', enlace: '' } }),
            item: { campos: [
              { clave: 'titulo', tipo: 'texto', etiqueta: 'Título', max: 110 },
              { clave: 'fecha', tipo: 'fecha', etiqueta: 'Fecha' },
              { clave: 'categoria', tipo: 'texto', etiqueta: 'Categoría', ayuda: 'Elige una de la lista o escribe una nueva.',
                sugerencias: usados((c) => c.noticias && c.noticias.items, 'categoria', ['Académicas', 'Investigación', 'Eventos', 'Convocatorias', 'Egresados', 'Comunidad']) },
              { clave: 'destacada', tipo: 'casilla', etiqueta: 'Destacada', texto: 'Mostrarla en grande al inicio de la página (si marcas varias, sale la más reciente)' },
              { clave: 'imagen', tipo: 'imagen', etiqueta: 'Foto (opcional)', opcional: true, maxLado: 1600, ayuda: 'Horizontal, ideal 1600 × 900 px. Sin foto se muestra un fondo con ícono.' },
              { clave: 'pie', tipo: 'texto', etiqueta: 'Pie de foto', max: 140 },
              { clave: 'resumen', tipo: 'textoLargo', etiqueta: 'Resumen', max: 220, ayuda: 'Se ve en la tarjeta de la lista.' },
              { clave: 'cuerpo', tipo: 'textoLargo', etiqueta: 'Texto completo', ayuda: 'Deja una línea en blanco entre párrafos. ' + AYUDA_FORMATO },
              { clave: 'boton', tipo: 'boton', etiqueta: 'Botón al final (opcional)', subir: true, ayuda: 'Por ejemplo, para inscribirse o descargar un documento. Vacío = no se muestra.' }
            ] } }
        ]
      },
      {
        titulo: 'Convocatorias',
        ayuda: 'Aparecen al lado de las noticias. Las que ya cerraron se ocultan solas.',
        campos: [
          { ruta: 'noticias.convocatorias', tipo: 'lista', etiqueta: 'Convocatorias', min: 0, max: 20, tituloItem: 'titulo', subtituloItem: 'cierre', nombreItem: 'Convocatoria', textoAgregar: '+ Nueva convocatoria',
            nuevo: () => ({ titulo: 'Nueva convocatoria', cierre: fechaISO(30), enlace: 'contacto.html#general' }),
            item: { campos: [
              { clave: 'titulo', tipo: 'texto', etiqueta: 'Nombre', max: 80 },
              { clave: 'cierre', tipo: 'fecha', etiqueta: 'Fecha de cierre' },
              { clave: 'enlace', tipo: 'enlace', etiqueta: 'Lleva a', subir: true }
            ] } }
        ]
      }
    ]
  },

  {
    id: 'investigaciones',
    titulo: 'Investigaciones',
    pagina: 'investigaciones.html',
    descripcion: 'El repositorio de publicaciones: working papers, artículos, tesis y boletines, con su PDF.',
    grupos: [
      { titulo: 'Cabecera', campos: CAMPOS_CABECERA('investigaciones') },
      {
        titulo: 'Publicaciones',
        campos: [
          { ruta: 'investigaciones.publicaciones', tipo: 'lista', etiqueta: 'Publicaciones', min: 0, max: 500, plegable: true, agregarArriba: true,
            tituloItem: 'titulo', subtituloItem: 'anio', nombreItem: 'Publicación', textoAgregar: '+ Nueva publicación',
            ayuda: 'En la página se ordenan por año, de la más reciente a la más antigua, y se pueden buscar y filtrar.',
            nuevo: () => ({ titulo: 'Nueva publicación', tipo: 'Working paper', anio: String(new Date().getFullYear()), autores: '', linea: '', destacada: false, resumen: '', pdf: '', enlace: '' }),
            item: { campos: [
              { clave: 'titulo', tipo: 'texto', etiqueta: 'Título', max: 160 },
              { clave: 'tipo', tipo: 'texto', etiqueta: 'Tipo', ayuda: 'Elige uno de la lista o escribe uno nuevo.',
                sugerencias: usados((c) => c.investigaciones && c.investigaciones.publicaciones, 'tipo', ['Working paper', 'Artículo', 'Tesis de grado', 'Boletín', 'Libro o capítulo', 'Ponencia', 'Informe']) },
              { clave: 'anio', tipo: 'texto', etiqueta: 'Año', max: 4, placeholder: '2026' },
              { clave: 'autores', tipo: 'texto', etiqueta: 'Autores', ayuda: 'Sepáralos con punto y coma: Pérez, A.; Gómez, B.' },
              { clave: 'linea', tipo: 'texto', etiqueta: 'Línea de investigación',
                sugerencias: usados((c) => c.investigaciones && c.investigaciones.lineas, 'nombre') },
              { clave: 'destacada', tipo: 'casilla', etiqueta: 'Destacada', texto: 'Mostrarla en grande arriba de la lista' },
              { clave: 'resumen', tipo: 'textoLargo', etiqueta: 'Resumen', max: 600, formato: true },
              { clave: 'pdf', tipo: 'enlace', etiqueta: 'Documento PDF', subir: true, ayuda: 'Sube el PDF o pega su enlace. Vacío = no se muestra el botón de descarga.' },
              { clave: 'enlace', tipo: 'enlace', etiqueta: 'Enlace externo (DOI, revista…)', externo: true }
            ] } }
        ]
      },
      {
        titulo: 'Líneas de investigación',
        ayuda: 'Se muestran al lado, con cuántas publicaciones tiene cada una.',
        campos: [
          { ruta: 'investigaciones.lineas', tipo: 'lista', etiqueta: 'Líneas', min: 0, max: 12, tituloItem: 'nombre', nombreItem: 'Línea',
            nuevo: { nombre: 'Nueva línea', descripcion: '' },
            item: { campos: [
              { clave: 'nombre', tipo: 'texto', etiqueta: 'Nombre' },
              { clave: 'descripcion', tipo: 'texto', etiqueta: 'Temas' }
            ] } }
        ]
      }
    ]
  },

  {
    id: 'galeria',
    titulo: 'Galería',
    pagina: 'galeria.html',
    descripcion: 'Álbumes de fotos por evento. Puedes subir varias fotos a la vez: se reducen y comprimen solas.',
    grupos: [
      { titulo: 'Cabecera', campos: CAMPOS_CABECERA('galeria') },
      {
        titulo: 'Álbumes',
        campos: [
          { ruta: 'galeria.albumes', tipo: 'lista', etiqueta: 'Álbumes', min: 0, max: 200, plegable: true, agregarArriba: true,
            tituloItem: 'titulo', subtituloItem: 'fecha', nombreItem: 'Álbum', textoAgregar: '+ Nuevo álbum',
            miniaturaItem: (a) => a.portada || ((a.fotos || []).find((f) => f && f.imagen) || {}).imagen,
            ayuda: 'En la página se ordenan por fecha, del más reciente al más antiguo.',
            nuevo: () => ({ titulo: 'Nuevo álbum', fecha: fechaISO(), lugar: 'Yopal, Casanare', categoria: '', descripcion: '', portada: '', fotos: [] }),
            item: { campos: [
              { clave: 'titulo', tipo: 'texto', etiqueta: 'Nombre del evento', max: 90 },
              { clave: 'fecha', tipo: 'fecha', etiqueta: 'Fecha' },
              { clave: 'lugar', tipo: 'texto', etiqueta: 'Lugar' },
              { clave: 'categoria', tipo: 'texto', etiqueta: 'Categoría', ayuda: 'Elige una de la lista o escribe una nueva.',
                sugerencias: usados((c) => c.galeria && c.galeria.albumes, 'categoria', ['Coloquios y simposios', 'Salidas de campo', 'Semilleros', 'Vida universitaria', 'Grados']) },
              { clave: 'descripcion', tipo: 'textoLargo', etiqueta: 'Descripción', max: 400 },
              { clave: 'portada', tipo: 'imagen', etiqueta: 'Portada (opcional)', opcional: true, maxLado: 1600, ayuda: 'Si la dejas vacía se usa la primera foto.' },
              { clave: 'fotos', tipo: 'lista', etiqueta: 'Fotos', min: 0, max: 80, plegable: true, tituloItem: 'pie', miniaturaItem: 'imagen', nombreItem: 'Foto',
                ayuda: 'Haz clic en una foto para cambiarla o escribir su pie. Las flechas cambian el orden.',
                textoAgregar: '+ Una foto', subirVarias: { clave: 'imagen', maxLado: 1600, texto: 'Subir varias fotos' },
                textoVacio: 'Este álbum no tiene fotos. Usa «Subir varias fotos» para elegir muchas a la vez.',
                nuevo: { imagen: '', pie: '' },
                item: { campos: [
                  { clave: 'imagen', tipo: 'imagen', etiqueta: 'Foto', maxLado: 1600 },
                  { clave: 'pie', tipo: 'texto', etiqueta: 'Pie de foto', max: 140 }
                ] } }
            ] } }
        ]
      }
    ]
  },

  { id: 'archivos', titulo: 'Imágenes y archivos', especial: 'archivos', descripcion: 'Imágenes en uso, archivos subidos y su dirección para usarlos en botones o textos.' },
  { id: 'publicar', titulo: 'Publicar', especial: 'publicar', descripcion: 'Revisa los cambios y publícalos en el sitio.' }
];
