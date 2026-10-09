# Programa de Economía — Unitrópico

Sitio web estático del Programa de Economía (Yopal, Casanare): portada, observatorio de datos económicos y página de contacto, con un panel para editar el contenido sin tocar el código.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `datos.html`, `contacto.html` | Páginas del sitio |
| `data/contenido.json` | Textos, botones, cifras e imágenes de todas las páginas |
| `data/indicadores.json` | Tarjetas, series de los gráficos y tabla de datos económicos |
| `assets/` | Estilos, scripts e imágenes (`assets/subidas/` guarda lo que se sube desde el panel) |
| `panel/` | Panel de contenido. Instrucciones en `panel/LEEME.md` |

No hay que compilar nada: es HTML, CSS y JavaScript.

## Publicar en Vercel

1. En Vercel: **Add New… → Project** e importa este repositorio.
2. **Framework Preset:** Other. **Root Directory:** `./`. Sin Build Command ni Output Directory.
3. **Deploy.** Cada commit a `main` vuelve a publicar el sitio solo.

## Editar el contenido

Abre `https://tu-sitio/panel/`, edita y usa **Publicar → Publicar en GitHub** con un token *fine-grained* que tenga permiso **Contents: Read and write** solo sobre este repositorio. Vercel publica el cambio en cerca de un minuto.

Para probar en tu computador, abre la carpeta con un servidor local (por ejemplo, la extensión Live Server de VS Code). Con doble clic los datos no cargan.
