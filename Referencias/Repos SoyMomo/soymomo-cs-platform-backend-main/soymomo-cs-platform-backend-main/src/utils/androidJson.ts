/**
 * Helpers para leer los campos que el reloj sube a WatchStatus.
 *
 * El firmware no siempre manda JSON valido: a veces manda el toString() de una
 * estructura de Android (`clave=valor` sin comillas). Estos helpers toleran esas
 * variantes y degradan a un valor vacio en vez de lanzar.
 */

/** Parsea el toString() de un array de Android: [{clave=valor, ...}, ...] */
export function parseAndroidArray(str: string): any[] {
  let trimmed = str.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    trimmed = trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    trimmed = trimmed.slice(1, -1);
  }

  const objects = trimmed.split('},').map((o) => {
    let obj = o;
    if (!obj.endsWith('}')) obj += '}';
    obj = obj.replace(/([a-zA-Z0-9_]+)=/g, '"$1":');
    obj = obj.replace(/:([^,}]+)/g, (_, value) => {
      const trimmedValue = value.trim();
      if (/^(true|false|null|\d+)$/.test(trimmedValue))
        return `:${trimmedValue}`;
      return `:"${trimmedValue}"`;
    });
    return obj;
  });
  const json = `[${objects.join(',')}]`;
  return JSON.parse(json);
}

/**
 * Normaliza el campo `info`: puede venir ya como objeto, como string JSON, o
 * como una aproximacion con `=` y comillas simples. Devuelve {} si no se puede.
 */
export function parseLooseJson(value: unknown): any {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch (e) {
    try {
      let fixed = value
        .replace(/([a-zA-Z0-9_]+)=/g, '"$1":')
        .replace(/, ([a-zA-Z0-9_]+)=/g, ', "$1":')
        .replace(/'/g, '"');
      if (!fixed.trim().startsWith('[') && !fixed.trim().startsWith('{'))
        fixed = `[${fixed}]`;
      return JSON.parse(fixed);
    } catch (e2) {
      return {};
    }
  }
}

/** Normaliza la lista de apps instaladas, que puede venir anidada como string. */
export function parseInstalledApps(rawApps: unknown): any[] {
  let installedApps = rawApps;

  if (typeof installedApps === 'string') {
    const asString = installedApps;
    try {
      installedApps = JSON.parse(asString);
    } catch (e) {
      try {
        installedApps = parseAndroidArray(asString);
      } catch (e2) {
        installedApps = [];
      }
    }
  }

  return Array.isArray(installedApps) ? installedApps : [];
}
