// src/auth/PasswordChecklist.tsx — requisitos de contraseña marcándose al escribir.
//
// Las reglas son las de la app móvil (`App/src/utils/passwordRules.ts`), no
// una copia: una cuenta de soporte no debería poder tener una contraseña más
// débil que la de un agricultor. Supabase sólo exige seis caracteres; esto
// guía al usuario, no protege la API.

import { Check, Circle } from 'lucide-react';
import { evaluatePassword } from '../../../App/src/utils/passwordRules';

export { isPasswordAcceptable } from '../../../App/src/utils/passwordRules';

export function PasswordChecklist({ password }: { password: string }) {
  const rules = evaluatePassword(password);
  return (
    <ul aria-label="Requisitos de la contraseña" className="grid gap-1 text-xs sm:grid-cols-2">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={`flex items-center gap-1.5 ${
            rule.met ? 'text-verdict-green' : 'text-terra-muted'
          }`}
        >
          {rule.met ? (
            <Check size={13} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Circle size={11} aria-hidden="true" />
          )}
          <span>
            {rule.es}
            <span className="sr-only">{rule.met ? ': cumplido' : ': pendiente'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
