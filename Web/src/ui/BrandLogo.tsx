// src/ui/BrandLogo.tsx
//
// Copia del logotipo oficial de `Logo/Logo/terrasense.svg`, incluida en Web
// para que el despliegue pueda compilar sin archivos externos al proyecto.
//
// El archivo trae el wordmark «Terra» en la tinta de marca `#0f2e22`. Se
// sustituye por `currentColor` para que la palabra siga al tema, mientras
// «Sense», el isotipo y el subtítulo conservan sus verdes originales. Es
// preferible a cargar `terrasense-dark.svg`: esa variante sólo cambia esos
// mismos trazos por un blanco fijo, así que duplicaría 19 kB para resolver lo
// mismo peor en los temas intermedios.
//
// `viewBox` completo: 145 110 590 235. El isotipo ocupa el primer tercio.

import { useMemo } from 'react';
import logo from '../assets/terrasense.svg?raw';

const BRAND_INK = '#0f2e22';

/** Recorta el lockup al isotipo, para los sitios donde no cabe la palabra. */
const MARK_VIEWBOX = '145 110 205 235';

export function BrandLogo({
  variant = 'lockup',
  className = '',
  inverse = false,
  title = 'TerraSense',
}: {
  variant?: 'lockup' | 'mark';
  className?: string;
  /** Wordmark en blanco, para superficies de tinta fijas que no siguen al tema. */
  inverse?: boolean;
  /** Vacío lo marca como decorativo: úsalo cuando el nombre ya esté en texto. */
  title?: string;
}) {
  const svg = useMemo(() => {
    let out = logo.replaceAll(BRAND_INK, 'currentColor');
    if (variant === 'mark') {
      out = out.replace(/viewBox="[^"]*"/, `viewBox="${MARK_VIEWBOX}"`);
    }
    return out;
  }, [variant]);

  return (
    <span
      className={`inline-block ${inverse ? 'text-white' : 'text-ink'} ${className}`}
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
