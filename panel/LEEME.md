# Panel de contenido

Abre `panel/` desde el sitio publicado (por ejemplo `https://tu-sitio/panel/`, también enlazado como «Administrar contenido» en el pie de cada página) o desde un servidor local.
Con doble clic sobre el archivo no funciona, porque el navegador bloquea la lectura de los datos.

## Qué edita

| Sección del panel        | Archivo                 | Páginas                       |
|--------------------------|-------------------------|-------------------------------|
| General                  | `data/contenido.json`   | Menú, franja y pie de todas   |
| Inicio                   | `data/contenido.json`   | `index.html`                  |
| Datos económicos         | `data/contenido.json`   | `datos.html` (textos)         |
| Indicadores y gráficos   | `data/indicadores.json` | `datos.html` y gráfico de la portada |
| Contacto                 | `data/contenido.json`   | `contacto.html`               |
| Noticias                 | `data/contenido.json`   | `noticias.html` (cada noticia tiene su página: `noticias.html?n=…`) |
| Investigaciones          | `data/contenido.json`   | `investigaciones.html`        |
| Galería                  | `data/contenido.json`   | `galeria.html` (cada álbum: `galeria.html?album=…`) |

Las imágenes y documentos subidos van a `assets/subidas/`. Las imágenes se reducen y comprimen al subirlas.

## Cómo se guarda

- **Borrador:** cada cambio queda guardado en ese navegador y se ve al instante en la vista previa. No llega al sitio hasta publicar.
  Las imágenes y documentos subidos también quedan guardados en el navegador, así que puedes cerrar el panel y seguir otro día.
  Si después subes el .zip al hosting, al volver a abrir el panel esos archivos dejan de figurar como pendientes.
- **Enlaces rotos:** antes de publicar o descargar, el panel avisa si algún botón o imagen apunta a un archivo que no está ni en el sitio ni en el navegador.
- **Publicar en GitHub:** un solo commit con los archivos cambiados. Necesita un token *fine-grained* con permiso **Contents: Read and write** solo sobre el repositorio del sitio. El token se guarda únicamente en el navegador.
- **Descargar .zip:** trae `data/` y `assets/subidas/` para descomprimir sobre la carpeta del sitio y subirla al hosting.

## Seguridad

Cualquiera puede abrir `panel/`, pero sin el token no puede cambiar el sitio: el panel solo lee archivos públicos.
La página tiene `noindex` para que no aparezca en buscadores.

## Para agregar un campo o una página nueva

1. En el HTML de la página, marca el elemento:
   - `data-c="ruta"` para textos
   - `data-c-boton="ruta"` para botones `{ texto, enlace }`
   - `data-c-src="ruta"` para imágenes
   - `data-c-lista="ruta"` con un `<template>` para listas (dentro de la plantilla se usa `data-ci`)
2. Agrega el valor en `data/contenido.json`.
3. Agrega el campo en `panel/esquema.js`, en la sección que corresponda. El panel arma el formulario solo.

La lista completa de atributos está al inicio de `assets/js/contenido.js`.
