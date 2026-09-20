import logo from '../../../Logo/Logo/terrasense.svg?raw';

/** SVG local, procedente exclusivamente del recurso oficial del repositorio. */
export function BrandLogo({ className = '' }: { className?: string }) {
  return <span role="img" aria-label="TerraSense · Soil Technologies" className={`inline-block text-terra-text ${className}`}
    dangerouslySetInnerHTML={{ __html: logo.replaceAll('#0f2e22', 'currentColor') }} />;
}
