// =========================================================
// zip.js — Crea un archivo .zip en el navegador, sin librerías.
// Guarda los archivos sin comprimir (formato "store"), que es
// suficiente para JSON e imágenes ya optimizadas.
// Uso: crearZip([{ ruta: 'data/contenido.json', datos: Uint8Array }]) → Blob
// =========================================================

const crearZip = (() => {
  const TABLA = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    TABLA[n] = c >>> 0;
  }
  const crc32 = (bytes) => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = TABLA[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };

  return function crearZip(archivos) {
    const enc = new TextEncoder();
    const ahora = new Date();
    const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | Math.floor(ahora.getSeconds() / 2);
    const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();
    const partes = [];
    const central = [];
    let desplazamiento = 0;

    archivos.forEach(({ ruta, datos }) => {
      const nombre = enc.encode(ruta);
      const crc = crc32(datos);
      const tam = datos.length;

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // nombres en UTF-8
      local.setUint16(8, 0, true);      // sin compresión
      local.setUint16(10, hora, true);
      local.setUint16(12, fecha, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, tam, true);
      local.setUint32(22, tam, true);
      local.setUint16(26, nombre.length, true);
      local.setUint16(28, 0, true);
      partes.push(new Uint8Array(local.buffer), nombre, datos);

      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true);
      cen.setUint16(4, 20, true);
      cen.setUint16(6, 20, true);
      cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true);
      cen.setUint16(12, hora, true);
      cen.setUint16(14, fecha, true);
      cen.setUint32(16, crc, true);
      cen.setUint32(20, tam, true);
      cen.setUint32(24, tam, true);
      cen.setUint16(28, nombre.length, true);
      cen.setUint16(30, 0, true);
      cen.setUint16(32, 0, true);
      cen.setUint16(34, 0, true);
      cen.setUint16(36, 0, true);
      cen.setUint32(38, 0, true);
      cen.setUint32(42, desplazamiento, true);
      central.push(new Uint8Array(cen.buffer), nombre);

      desplazamiento += 30 + nombre.length + tam;
    });

    const tamCentral = central.reduce((s, p) => s + p.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true);
    fin.setUint16(8, archivos.length, true);
    fin.setUint16(10, archivos.length, true);
    fin.setUint32(12, tamCentral, true);
    fin.setUint32(16, desplazamiento, true);
    return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: 'application/zip' });
  };
})();
