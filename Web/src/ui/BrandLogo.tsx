// src/ui/BrandLogo.tsx
//
// El nombre «TerraSense» en dos colores, el mismo de la pantalla de carga de la app.
// `../assets/terrasense-wordmark.svg` lo genera `App/scripts/generate-brand-assets.mjs`
// dentro de Web para que el despliegue compile sin archivos externos al proyecto.
//
// «Terra» viene en la tinta de marca `#0f2e22`, que se sustituye por `currentColor`
// para que siga al tema; «Sense» conserva el verde de la marca, más claro en `inverse`
// como en la app sobre fondo oscuro.

import { useMemo } from 'react';
import wordmark from '../assets/terrasense-wordmark.svg?raw';

const BRAND_INK = '#0f2e22';
const SENSE = '#16A34A';
const SENSE_ON_DARK = '#22C55E';

export function BrandLogo({
  className = '',
  inverse = false,
  title = 'TerraSense',
}: {
  className?: string;
  /** «Terra» en blanco, para superficies de tinta fijas que no siguen al tema. */
  inverse?: boolean;
  /** Vacío lo marca como decorativo: úsalo cuando el nombre ya esté en texto. */
  title?: string;
}) {
  const svg = useMemo(() => {
    const out = wordmark.replaceAll(BRAND_INK, 'currentColor');
    return inverse ? out.replaceAll(SENSE, SENSE_ON_DARK) : out;
  }, [inverse]);

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
