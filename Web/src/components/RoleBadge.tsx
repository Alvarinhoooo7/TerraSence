// src/components/RoleBadge.tsx — rol del usuario en un equipo, en palabras.

import { Badge } from '../ui/Feedback';

export function RoleBadge({ role, authorized }: { role: string | null; authorized: boolean | null }) {
  if (authorized === false) return <Badge tone="amber">Pendiente</Badge>;
  if (role === 'admin') return <Badge tone="green">Admin</Badge>;
  return <Badge>Usuario</Badge>;
}
