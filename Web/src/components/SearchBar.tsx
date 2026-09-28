// src/components/SearchBar.tsx — campo de búsqueda con su botón.
//
// Lo usan Buscar y la pantalla del equipo (para saltar a otro). Buscar
// siempre lleva a `/buscar?q=`, así el resultado queda en la URL.

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '../ui/Button';

export function SearchBar({
  initial = '',
  size = 'md',
  autoFocus = false,
}: {
  initial?: string;
  size?: 'md' | 'lg';
  autoFocus?: boolean;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initial);

  useEffect(() => setValue(initial), [initial]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q.length < 3) return;
    navigate(`/buscar?q=${encodeURIComponent(q)}`);
  };

  const tall = size === 'lg';
  return (
    <form role="search" onSubmit={submit} className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <label htmlFor={`busqueda-${size}`} className="sr-only">
          ID del equipo o correo del usuario
        </label>
        <Search
          size={tall ? 18 : 16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint"
          aria-hidden="true"
        />
        <input
          id={`busqueda-${size}`}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={tall ? '48213-90574-16628 o correo@ejemplo.cl' : 'ID del equipo o correo'}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          className={`w-full rounded-md border border-line-strong bg-surface pr-3 text-ink placeholder:text-faint
            focus:border-primary focus:ring-3 focus:ring-primary/15 focus:outline-none focus-visible:outline-none
            ${tall ? 'h-12 pl-11 text-base' : 'h-9 pl-10 text-sm'}`}
        />
      </div>
      <Button type="submit" variant="primary" size={tall ? 'lg' : 'md'} disabled={value.trim().length < 3} className={tall ? 'h-12' : ''}>
        Buscar
      </Button>
    </form>
  );
}
