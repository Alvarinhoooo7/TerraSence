// src/utils/csv.ts
//
// Exportación de tablas a CSV desde el navegador, sin dependencias.
//
// El separador es `;` y no `,` a propósito: Excel en configuración regional
// española interpreta la coma como separador decimal, de modo que un CSV con
// comas termina volcando toda la fila en una sola celda. Se emite además el
// BOM de UTF-8 para que los acentos y los símbolos de grado no se rompan al
// abrirlo.

/** Escapa un valor para CSV: comillas dobladas y entrecomillado si hace falta. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Serializa filas a texto CSV con su cabecera. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(cell).join(';')).join('\r\n');
}

/**
 * Dispara la descarga de un CSV en el navegador.
 *
 * Devuelve `false` si el entorno no permite iniciar la descarga (por ejemplo,
 * dentro de un iframe con sandbox restrictivo), para que quien llama pueda
 * avisar en pantalla en lugar de fallar en silencio.
 */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): boolean {
  try {
    const blob = new Blob(['﻿' + toCsv(headers, rows)], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revocamos en el siguiente tick: Safari cancela la descarga si la URL
    // desaparece durante el mismo ciclo de eventos que el click.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}

/** Marca de tiempo compacta para nombres de archivo: 20260905-1432. */
export function fileStamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}
